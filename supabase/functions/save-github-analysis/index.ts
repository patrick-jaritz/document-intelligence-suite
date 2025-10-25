import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { repository_url, repository_name, analysis_data } = body;

    if (!repository_url || !repository_name || !analysis_data) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
          return new Response(JSON.stringify({ error: 'Failed to update' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify({ success: true, id: updateData?.id }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: true, id: data?.id }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
