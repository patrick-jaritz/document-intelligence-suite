import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { repository_url, limit = 5 } = await req.json()

    if (!repository_url) {
      return new Response(
        JSON.stringify({ error: 'Missing repository_url parameter' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
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
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
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
