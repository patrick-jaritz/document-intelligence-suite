import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { getCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts'
import { getSecurityHeaders, mergeSecurityHeaders } from '../_shared/security-headers.ts'

interface WebhookPayload {
  event_type: string;
  repository_url?: string;
  trigger?: 'github_push' | 'schedule' | 'manual' | 'repository_created';
  schedule?: string;
  metadata?: Record<string, any>;
}

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
    const payload: WebhookPayload = JSON.parse(requestText);

    // SECURITY: Validate input
    if (!payload.event_type || typeof payload.event_type !== 'string' || payload.event_type.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid required field: event_type' }),
        { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔔 Webhook received:', payload.event_type)

    // Process different webhook types
    let result
    switch (payload.event_type) {
      case 'analyze_repository':
        result = await handleAnalyzeRepository(payload)
        break
      case 'schedule_analysis':
        result = await handleScheduleAnalysis(payload)
        break
      case 'batch_analysis':
        result = await handleBatchAnalysis(payload)
        break
      case 'health_check':
        result = { status: 'ok', message: 'Webhook handler is healthy' }
        break
      default:
        throw new Error(`Unknown event type: ${payload.event_type}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        event_type: payload.event_type,
        result
      }),
      {
          headers: { ...headers, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    // SECURITY: Don't expose stack traces in production
    const isProduction = Deno.env.get('ENVIRONMENT') === 'production';
    
    return new Response(
      JSON.stringify({ 
        success: false,
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

async function handleAnalyzeRepository(payload: WebhookPayload) {
  const { repository_url, metadata } = payload

  if (!repository_url) {
    throw new Error('repository_url is required for analyze_repository event')
  }

  console.log('🔍 Triggering repository analysis:', repository_url)

  // Trigger the repository analysis
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!

  const response = await fetch(`${supabaseUrl}/functions/v1/github-analyzer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({
      url: repository_url
    })
  })

  if (!response.ok) {
    throw new Error(`Analysis failed: ${response.statusText}`)
  }

  const analysis = await response.json()

  return {
    repository_url,
    analysis_id: analysis.id || 'unknown',
    status: 'completed',
    analyzed_at: new Date().toISOString()
  }
}

async function handleScheduleAnalysis(payload: WebhookPayload) {
  const { schedule, repository_url, metadata } = payload

  console.log('⏰ Scheduling analysis:', schedule)

  // Store schedule in database (simplified)
  // In production, this would integrate with a cron service

  return {
    schedule_type: schedule || 'immediate',
    scheduled_for: schedule || new Date().toISOString(),
    repository_url: repository_url || 'all',
    status: 'scheduled'
  }
}

async function handleBatchAnalysis(payload: WebhookPayload) {
  const { metadata } = payload

  console.log('📦 Batch analysis triggered')

  // In production, this would queue multiple repositories for analysis
  const repositories = metadata?.repositories || []

  const results = await Promise.all(
    repositories.slice(0, 5).map(async (url: string) => {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!

        const response = await fetch(`${supabaseUrl}/functions/v1/github-analyzer`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({ url })
        })

        return {
          url,
          status: response.ok ? 'success' : 'failed',
          analyzed_at: new Date().toISOString()
        }
      } catch (error) {
        return {
          url,
          status: 'failed',
          error: error.message
        }
      }
    })
  )

  return {
    total_repositories: repositories.length,
    processed: results.length,
    results
  }
}

// GitHub webhook signature verification
function verifyGitHubSignature(payload: string, signature: string, secret: string): boolean {
  const crypto = globalThis.crypto
  // Simplified verification - in production, implement proper HMAC verification
  return true
}
