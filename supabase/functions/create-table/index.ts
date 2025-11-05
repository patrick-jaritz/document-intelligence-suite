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

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create the table using raw SQL
    const { data, error } = await supabase.rpc('exec', {
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

        CREATE POLICY "Public can view github analyses" ON public.github_analyses FOR SELECT USING (true);
        CREATE POLICY "Public can insert github analyses" ON public.github_analyses FOR INSERT WITH CHECK (true);
        CREATE POLICY "Public can update github analyses" ON public.github_analyses FOR UPDATE USING (true);
        CREATE POLICY "Public can delete github analyses" ON public.github_analyses FOR DELETE USING (true);
      `
    });

    if (error) {
      console.error('Error creating table:', error);
      return new Response(
        JSON.stringify({ error: error.message, success: false }),
        { status: 500, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Table created successfully' }),
      { status: 200, headers: { ...headers, 'Content-Type': 'application/json' } }
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
      { status: 500, headers: { ...headers, 'Content-Type': 'application/json' } }
    );
  }
});
