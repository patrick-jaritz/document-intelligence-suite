import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
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
    const body = JSON.parse(requestText);
    const { repository_url } = body;

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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🗑️ Deleting GitHub analysis:', repository_url);

    // Delete the analysis from the database
    const { error } = await supabase
      .from('github_analyses')
      .delete()
      .eq('repository_url', repository_url);

    if (error) {
      console.error('❌ Error deleting analysis:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Successfully deleted analysis');
    return new Response(
      JSON.stringify({ success: true, message: 'Analysis deleted successfully' }),
      { status: 200, headers: { ...headers, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Function error:', error);
    
    // SECURITY: Don't expose stack traces in production
    const isProduction = Deno.env.get('ENVIRONMENT') === 'production';
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to delete analysis',
        ...(isProduction ? {} : { 
          details: error instanceof Error ? error.stack : String(error)
        })
      }),
      { status: 500, headers: { ...headers, 'Content-Type': 'application/json' } }
    );
  }
});
