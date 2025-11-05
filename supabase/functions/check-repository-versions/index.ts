import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts'
import { getSecurityHeaders, mergeSecurityHeaders } from '../_shared/security-headers.ts'

interface VersionCheck {
  repository_url: string;
  current_version: string;
  previous_version: string | null;
  has_updates: boolean;
  changes: VersionChange[];
}

interface VersionChange {
  type: 'version' | 'description' | 'topics' | 'license' | 'size';
  field: string;
  old_value: string | null;
  new_value: string;
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!

// SECURITY: CORS headers are now generated dynamically with origin validation

serve(async (req) => {
  // SECURITY: Handle CORS preflight requests
  const preflightResponse = handleCorsPreflight(req);
  if (preflightResponse) {
    return preflightResponse;
  }

  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);
  const securityHeaders = getSecurityHeaders();
  const headers = mergeSecurityHeaders(corsHeaders, securityHeaders);

  // SECURITY: Limit request size
  const MAX_REQUEST_SIZE = 10 * 1024 * 1024; // 10MB
  let requestText = '';
  try {
    requestText = await req.text();
    if (requestText.length > MAX_REQUEST_SIZE) {
      return new Response(
        JSON.stringify({ error: 'Request too large' }),
        { 
          status: 413, 
          headers: { ...headers, 'Content-Type': 'application/json' } 
        }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to read request body' }),
      { 
        status: 400, 
        headers: { ...headers, 'Content-Type': 'application/json' } 
      }
    );
  }

  try {
    const requestBody = JSON.parse(requestText);
    const { repository_url } = requestBody;

    // SECURITY: Validate input
    if (!repository_url || typeof repository_url !== 'string' || repository_url.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid required field: repository_url' }),
        { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    }

    // SECURITY: Validate URL length
    if (repository_url.length > 2048) {
      return new Response(
        JSON.stringify({ error: 'Repository URL too long (max 2048 characters)' }),
        { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get latest analysis for this repository
    const { data: latestAnalysis, error: fetchError } = await supabase
      .from('github_analyses')
      .select('*')
      .eq('repository_url', repository_url)
      .order('created_at', { ascending: false })
      .limit(2)

    if (fetchError) throw fetchError

    if (!latestAnalysis || latestAnalysis.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'No analysis found for this repository',
          repository_url,
          has_updates: false,
          message: 'Please analyze this repository first'
        }),
        {
          headers: { ...headers, 'Content-Type': 'application/json' },
          status: 404
        }
      )
    }

    const current = latestAnalysis[0]
    const previous = latestAnalysis.length > 1 ? latestAnalysis[1] : null

    // Get current GitHub data
    const githubData = await fetchGitHubData(repository_url)
    
    // Compare versions and detect changes
    const changes = detectChanges(current.analysis_data, githubData, previous?.analysis_data)

    const response: VersionCheck = {
      repository_url,
      current_version: githubData.version || 'unknown',
      previous_version: previous?.analysis_data?.metadata?.updatedAt || null,
      has_updates: changes.length > 0 || !previous,
      changes
    }

    return new Response(
      JSON.stringify(response),
      {
          headers: { ...headers, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    // SECURITY: Don't expose stack traces in production
    const isProduction = Deno.env.get('ENVIRONMENT') === 'production';
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error',
        ...(isProduction ? {} : { 
          details: error instanceof Error ? error.stack : String(error)
        })
      }),
      {
        headers: { ...headers, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

async function fetchGitHubData(repositoryUrl: string): Promise<any> {
  const githubToken = Deno.env.get('GITHUB_TOKEN')
  
  // Extract owner and repo from URL
  const urlParts = repositoryUrl.replace('https://github.com/', '').split('/')
  const [owner, repo] = urlParts

  const headers: HeadersInit = {
    'Accept': 'application/vnd.github.v3+json',
  }
  
  if (githubToken) {
    headers['Authorization'] = `token ${githubToken}`
  }

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}`,
    { headers }
  )

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.statusText}`)
  }

  const data = await response.json()

  return {
    version: data.updated_at,
    description: data.description,
    topics: data.topics,
    license: data.license?.name,
    size: data.size,
    stars: data.stargazers_count,
    forks: data.forks_count,
    open_issues: data.open_issues_count,
    default_branch: data.default_branch,
    language: data.language
  }
}

function detectChanges(currentData: any, githubData: any, previousData: any): VersionChange[] {
  const changes: VersionChange[] = []

  if (!previousData) {
    return changes
  }

  const current = currentData.metadata || {}
  const previous = previousData.metadata || {}

  // Check for version updates (using updated_at as version indicator)
  if (githubData.version && previous.updatedAt && githubData.version !== previous.updatedAt) {
    changes.push({
      type: 'version',
      field: 'updatedAt',
      old_value: previous.updatedAt,
      new_value: githubData.version
    })
  }

  // Check description changes
  if (githubData.description !== previous.description) {
    changes.push({
      type: 'description',
      field: 'description',
      old_value: previous.description,
      new_value: githubData.description || ''
    })
  }

  // Check topics changes
  const currentTopics = (githubData.topics || []).sort().join(',')
  const previousTopics = (previous.topics || []).sort().join(',')
  
  if (currentTopics !== previousTopics) {
    changes.push({
      type: 'topics',
      field: 'topics',
      old_value: previous.topics?.join(', ') || '',
      new_value: (githubData.topics || []).join(', ')
    })
  }

  // Check license changes
  if (githubData.license !== previous.license) {
    changes.push({
      type: 'license',
      field: 'license',
      old_value: previous.license || 'null',
      new_value: githubData.license || 'null'
    })
  }

  // Check size changes (significant changes)
  if (githubData.size && previous.size) {
    const sizeDiff = Math.abs(githubData.size - previous.size)
    const percentChange = (sizeDiff / previous.size) * 100
    
    if (percentChange > 5) { // More than 5% change
      changes.push({
        type: 'size',
        field: 'size',
        old_value: `${previous.size} KB`,
        new_value: `${githubData.size} KB`
      })
    }
  }

  // Check star count significant changes
  if (githubData.stars && previous.stars) {
    const starDiff = githubData.stars - previous.stars
    const percentChange = (Math.abs(starDiff) / previous.stars) * 100
    
    if (percentChange > 10) { // More than 10% change in stars
      changes.push({
        type: 'version',
        field: 'stars',
        old_value: `${previous.stars} stars`,
        new_value: `${githubData.stars} stars (+${starDiff > 0 ? '+' : ''}${starDiff})`
      })
    }
  }

  return changes
}
