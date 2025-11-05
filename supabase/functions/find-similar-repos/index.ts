import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0"
import { getCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';
import { getSecurityHeaders, mergeSecurityHeaders } from '../_shared/security-headers.ts';

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
    const { repository_url, limit = 5 } = requestBody;

    // SECURITY: Validate input
    if (!repository_url || typeof repository_url !== 'string' || repository_url.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid required field: repository_url' }),
        { 
          status: 400, 
          headers: { ...headers, 'Content-Type': 'application/json' } 
        }
      )
    }

    // SECURITY: Validate URL length
    if (repository_url.length > 2048) {
      return new Response(
        JSON.stringify({ error: 'Repository URL too long (max 2048 characters)' }),
        { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    }

    // SECURITY: Validate limit
    const limitNum = typeof limit === 'number' ? limit : parseInt(limit);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return new Response(
        JSON.stringify({ error: 'Limit must be between 1 and 100' }),
        { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the target repository
    const { data: targetRepo, error: targetError } = await supabaseClient
      .from('github_analyses')
      .select('*')
      .eq('repository_url', repository_url)
      .single()

    if (targetError || !targetRepo) {
      return new Response(
        JSON.stringify({ error: 'Repository not found in archive' }),
        { 
          status: 404, 
          headers: { ...headers, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get all other repositories
    const { data: allRepos, error: allReposError } = await supabaseClient
      .from('github_analyses')
      .select('*')
      .neq('repository_url', repository_url)

    if (allReposError) {
      throw allReposError
    }

    // Calculate similarity scores
    const similarities = allRepos.map(repo => {
      let score = 0
      const target = targetRepo.analysis_data
      const candidate = repo.analysis_data

      // Language match (40 points)
      if (target.metadata?.language && candidate.metadata?.language) {
        if (target.metadata.language === candidate.metadata.language) {
          score += 40
        }
      }

      // Topics similarity (30 points)
      if (target.metadata?.topics && candidate.metadata?.topics) {
        const targetTopics = new Set(target.metadata.topics)
        const candidateTopics = new Set(candidate.metadata.topics)
        const intersection = [...targetTopics].filter(t => candidateTopics.has(t))
        const union = new Set([...targetTopics, ...candidateTopics])
        const jaccard = union.size > 0 ? intersection.length / union.size : 0
        score += jaccard * 30
      }

      // Tech stack similarity (20 points)
      if (target.technicalAnalysis?.techStack && candidate.technicalAnalysis?.techStack) {
        const targetTech = new Set(target.technicalAnalysis.techStack)
        const candidateTech = new Set(candidate.technicalAnalysis.techStack)
        const intersection = [...targetTech].filter(t => candidateTech.has(t))
        const union = new Set([...targetTech, ...candidateTech])
        const jaccard = union.size > 0 ? intersection.length / union.size : 0
        score += jaccard * 20
      }

      // Similar star count (10 points)
      if (target.metadata?.stars && candidate.metadata?.stars) {
        const ratio = Math.min(target.metadata.stars, candidate.metadata.stars) / Math.max(target.metadata.stars, candidate.metadata.stars)
        score += ratio * 10
      }

      return {
        ...repo,
        similarity_score: score
      }
    })

    // Sort by similarity score and return top N
    const similar = similarities
      .sort((a, b) => b.similarity_score - a.similarity_score)
      .slice(0, limit)

    return new Response(
      JSON.stringify({ 
        success: true, 
        target: {
          name: targetRepo.repository_name,
          url: targetRepo.repository_url,
        },
        similar_repositories: similar.map(r => ({
          name: r.repository_name,
          url: r.repository_url,
          similarity_score: r.similarity_score,
          language: r.analysis_data?.metadata?.language,
          stars: r.analysis_data?.metadata?.stars,
          topics: r.analysis_data?.metadata?.topics,
        }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
