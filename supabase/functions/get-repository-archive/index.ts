import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';
import { getSecurityHeaders, mergeSecurityHeaders } from '../_shared/security-headers.ts';

interface RepositoryAnalysis {
  id: string;
  repository_url: string;
  repository_name: string;
  analysis_data: any;
  created_at: string;
}

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
    // Create Supabase client with service role key to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('🔍 Using Supabase client with:', {
      url: supabaseUrl ? '✓ Set' : '✗ Missing',
      keyType: supabaseServiceKey === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ? 'Service Role' : 'Anon Key',
    });

    // Get query parameters
    const url = new URL(req.url);
    const search = url.searchParams.get('search') || '';
    const language = url.searchParams.get('language') || '';
    const sortBy = url.searchParams.get('sortBy') || 'created_at';
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    console.log('📊 Fetching repository archive with params:', {
      search,
      language,
      sortBy,
      limit,
      offset
    });

    // Build query - select all columns from github_analyses
    console.log('📊 Building query for github_analyses table...');
    let query = supabase
      .from('github_analyses')
      .select('*');
    
    // First, let's check if the table exists and has data
    const { count, error: countError } = await supabase
      .from('github_analyses')
      .select('*', { count: 'exact', head: true });
    
    console.log('📊 Table count check:', {
      count: count ?? 0,
      error: countError?.message || null,
    });

    // Apply filters
    if (search) {
      query = query.or(`repository_name.ilike.%${search}%,analysis_data->summary->tldr.ilike.%${search}%`);
    }

    if (language) {
      query = query.eq('analysis_data->metadata->language', language);
    }

    // Apply sorting
    switch (sortBy) {
      case 'stars':
        query = query.order('analysis_data->metadata->stars', { ascending: false });
        break;
      case 'name':
        query = query.order('repository_name', { ascending: true });
        break;
      case 'created_at':
      default:
        query = query.order('created_at', { ascending: false });
        break;
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: analyses, error } = await query;

    if (error) {
      console.error('❌ Database error:', error);
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Failed to fetch repository archive',
          details: error.message,
          code: error.code,
        }),
        { 
          status: 500, 
          headers: { ...headers, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`✅ Successfully fetched ${analyses?.length || 0} repository analyses`);
    if (analyses && analyses.length > 0) {
      console.log('📋 Sample analysis:', {
        id: analyses[0].id,
        repository_name: analyses[0].repository_name,
        has_analysis_data: !!analyses[0].analysis_data,
      });
    }

    // Return the analyses
    return new Response(
      JSON.stringify({
        success: true,
        data: analyses || [],
        total: analyses?.length || 0,
        pagination: {
          limit,
          offset,
          hasMore: analyses?.length === limit
        }
      }),
      {
        headers: { ...headers, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Function error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...headers, 'Content-Type': 'application/json' } 
      }
    );
  }
});
