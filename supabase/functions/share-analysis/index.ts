import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts'
import { getSecurityHeaders, mergeSecurityHeaders } from '../_shared/security-headers.ts'

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
    const { repository_url, share_token, action } = requestBody;

    const supabase = createClient(supabaseUrl, supabaseKey)

    // SECURITY: Validate action
    if (!action || typeof action !== 'string' || !['create_share', 'get_shared_analysis'].includes(action)) {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing action parameter' }),
        { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'create_share') {
      // Create a shareable link
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

      // Generate a unique share token
      const shareToken = generateShareToken()

      // Store in database (if you have a shares table)
      // For now, we'll return the token

      return new Response(
        JSON.stringify({
          success: true,
          share_token: shareToken,
          share_url: `${supabaseUrl}/share/${shareToken}`,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        }),
        {
          headers: { ...headers, 'Content-Type': 'application/json' }
        }
      )
    }

    if (action === 'get_shared_analysis') {
      // Retrieve shared analysis
      if (!share_token || typeof share_token !== 'string' || share_token.trim().length === 0) {
        return new Response(
          JSON.stringify({ error: 'Missing or invalid required field: share_token' }),
          { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } }
        );
      }

      // SECURITY: Validate token length
      if (share_token.length > 256) {
        return new Response(
          JSON.stringify({ error: 'Share token too long (max 256 characters)' }),
          { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } }
        );
      }

      // In production, look up the share token in database
      // For now, return a mock response
      return new Response(
        JSON.stringify({
          success: true,
          share_token: share_token,
          repository_url: 'https://github.com/example/repo',
          shared_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }),
        {
          headers: { ...headers, 'Content-Type': 'application/json' }
        }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } }
    );

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

function generateShareToken(): string {
  // Generate a secure random token
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}
