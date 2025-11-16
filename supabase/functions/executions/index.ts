/**
 * Supabase Edge Function: Executions API
 * 
 * GET /functions/v1/executions?prompt_id=xxx - List executions
 * GET /functions/v1/executions/:id - Get execution details
 * POST /functions/v1/executions/:id/feedback - Update feedback
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';
import { getSecurityHeaders, mergeSecurityHeaders } from '../_shared/security-headers.ts';

serve(async (req) => {
  const preflightResponse = handleCorsPreflight(req);
  if (preflightResponse) {
    return preflightResponse;
  }

  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);
  const securityHeaders = getSecurityHeaders();
  const headers = mergeSecurityHeaders(corsHeaders, securityHeaders);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '') || '';
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...headers, 'Content-Type': 'application/json' } 
        }
      );
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const executionId = pathParts.length > 1 ? pathParts[pathParts.length - 1] : null;
    const action = pathParts.length > 2 ? pathParts[pathParts.length - 1] : null;

    // GET /?prompt_id=xxx - List executions
    if (req.method === 'GET' && !executionId) {
      const promptId = url.searchParams.get('prompt_id');
      const filter = url.searchParams.get('filter'); // 'successful', 'failed', 'all'
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
      const offset = (page - 1) * limit;

      if (!promptId) {
        return new Response(
          JSON.stringify({ error: 'prompt_id is required' }),
          { 
            status: 400, 
            headers: { ...headers, 'Content-Type': 'application/json' } 
          }
        );
      }

      let query = supabase
        .from('executions')
        .select('*', { count: 'exact' })
        .eq('prompt_id', promptId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (filter === 'successful') {
        query = query.eq('marked_successful', true);
      } else if (filter === 'failed') {
        query = query.eq('marked_successful', false);
      }

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      // Fetch full response text for executions that have it stored separately
      const executionsWithData = await Promise.all(
        (data || []).map(async (exec: any) => {
          if (exec.response_stored) {
            const { data: execData } = await supabase
              .from('executions_data')
              .select('response_text')
              .eq('execution_id', exec.id)
              .single();
            
            if (execData) {
              exec.response_text = execData.response_text;
            }
          }
          return exec;
        })
      );

      return new Response(
        JSON.stringify({ 
          executions: executionsWithData,
          pagination: {
            page,
            limit,
            total: count || 0,
            totalPages: Math.ceil((count || 0) / limit)
          }
        }),
        {
          headers: { ...headers, 'Content-Type': 'application/json' }
        }
      );
    }

    // GET /:id - Get execution details
    if (req.method === 'GET' && executionId && action !== 'feedback') {
      const { data: execution, error } = await supabase
        .from('executions')
        .select('*')
        .eq('id', executionId)
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return new Response(
            JSON.stringify({ error: 'Execution not found' }),
            { 
              status: 404, 
              headers: { ...headers, 'Content-Type': 'application/json' } 
            }
          );
        }
        throw error;
      }

      // Fetch full response if stored separately
      if (execution.response_stored) {
        const { data: execData } = await supabase
          .from('executions_data')
          .select('response_text')
          .eq('execution_id', execution.id)
          .single();
        
        if (execData) {
          execution.response_text = execData.response_text;
        }
      }

      return new Response(
        JSON.stringify({ execution }),
        {
          headers: { ...headers, 'Content-Type': 'application/json' }
        }
      );
    }

    // POST /:id/feedback - Update feedback
    if (req.method === 'POST' && executionId && action === 'feedback') {
      const body = await req.json();
      const { rating, feedback, marked_successful } = body;

      // Verify ownership
      const { data: existing, error: checkError } = await supabase
        .from('executions')
        .select('user_id')
        .eq('id', executionId)
        .single();

      if (checkError || existing.user_id !== user.id) {
        return new Response(
          JSON.stringify({ error: 'Not authorized to update this execution' }),
          { 
            status: 403, 
            headers: { ...headers, 'Content-Type': 'application/json' } 
          }
        );
      }

      const updateData: any = {};
      if (rating !== undefined) updateData.user_rating = rating;
      if (feedback !== undefined) updateData.user_feedback = feedback;
      if (marked_successful !== undefined) updateData.marked_successful = marked_successful;

      const { data, error } = await supabase
        .from('executions')
        .update(updateData)
        .eq('id', executionId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return new Response(
        JSON.stringify({ execution: data }),
        {
          headers: { ...headers, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...headers, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Executions API error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error',
        details: error instanceof Error ? error.stack : String(error)
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
