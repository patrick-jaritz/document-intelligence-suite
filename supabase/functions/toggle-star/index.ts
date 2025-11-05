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
    const { repository_url, starred } = requestBody;

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

    if (typeof starred !== 'boolean') {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid required field: starred (must be boolean)' }),
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

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { data, error } = await supabaseClient
      .from('github_analyses')
      .update({ starred })
      .eq('repository_url', repository_url)
      .select()
      .single()

    if (error) {
      throw error
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
          headers: { ...headers, 'Content-Type': 'application/json' }
      }
    )
  }
})
