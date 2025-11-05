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
    const { repository_url, repository_name, analysis_data } = body;

    // SECURITY: Validate input
    if (!repository_url || typeof repository_url !== 'string' || repository_url.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid required field: repository_url' }),
        { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    }

    if (!repository_name || typeof repository_name !== 'string' || repository_name.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid required field: repository_name' }),
        { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    }

    if (!analysis_data || typeof analysis_data !== 'object') {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid required field: analysis_data' }),
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

    // Try to create table if it doesn't exist
    const { error: createError } = await supabase.rpc('exec_sql', {
      query: `
        CREATE TABLE IF NOT EXISTS public.github_analyses (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          repository_url TEXT NOT NULL UNIQUE,
          repository_name TEXT NOT NULL,
          analysis_data JSONB NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_github_analyses_repository_url ON public.github_analyses(repository_url);
        
        ALTER TABLE public.github_analyses ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Public can view github analyses" ON public.github_analyses;
        DROP POLICY IF EXISTS "Public can insert github analyses" ON public.github_analyses;
        DROP POLICY IF EXISTS "Public can update github analyses" ON public.github_analyses;
        DROP POLICY IF EXISTS "Public can delete github analyses" ON public.github_analyses;
        
        CREATE POLICY IF NOT EXISTS "Public can view github analyses" ON public.github_analyses FOR SELECT USING (true);
        CREATE POLICY IF NOT EXISTS "Public can insert github analyses" ON public.github_analyses FOR INSERT WITH CHECK (true);
        CREATE POLICY IF NOT EXISTS "Public can update github analyses" ON public.github_analyses FOR UPDATE USING (true);
        CREATE POLICY IF NOT EXISTS "Public can delete github analyses" ON public.github_analyses FOR DELETE USING (true);
      `
    });

    // Continue even if table creation fails (it might already exist)
    if (createError) {
      console.log('Table creation note:', createError.message);
    }

    const { data, error } = await supabase
      .from('github_analyses')
      .insert({ repository_url, repository_name, analysis_data, created_at: new Date().toISOString() })
      .select()
      .single();

    if (error) {
      if (error.code === '23505' || error.message.includes('duplicate')) {
        const { data: updateData, error: updateError } = await supabase
          .from('github_analyses')
          .update({ analysis_data, created_at: new Date().toISOString() })
          .eq('repository_url', repository_url)
          .select()
          .single();

        if (updateError) {
          return new Response(JSON.stringify({ error: 'Failed to update' }), { status: 500, headers: { ...headers, 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify({ success: true, id: updateData?.id }), { status: 200, headers: { ...headers, 'Content-Type': 'application/json' } });
      }
      // SECURITY: Don't expose stack traces in production
      const isProduction = Deno.env.get('ENVIRONMENT') === 'production';
      
      return new Response(JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to save analysis',
        ...(isProduction ? {} : { 
          details: error instanceof Error ? error.stack : String(error)
        })
      }), { status: 500, headers: { ...headers, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: true, id: data?.id }), { status: 200, headers: { ...headers, 'Content-Type': 'application/json' } });
  } catch (error) {
    // SECURITY: Don't expose stack traces in production
    const isProduction = Deno.env.get('ENVIRONMENT') === 'production';
    
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Failed to save analysis',
      ...(isProduction ? {} : { 
        details: error instanceof Error ? error.stack : String(error)
      })
    }), { status: 500, headers: { ...headers, 'Content-Type': 'application/json' } });
  }
});
