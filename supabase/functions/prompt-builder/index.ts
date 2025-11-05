/**
 * Supabase Edge Function: Prompt Builder API
 * 
 * CRUD operations for prompt templates
 * 
 * GET    / - List prompts (filtered by mode, user)
 * POST   / - Create prompt
 * GET    /:id - Get single prompt
 * PUT    /:id - Update prompt
 * DELETE /:id - Delete prompt
 */

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
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '') || '';
    
    // Verify user
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
    const promptId = pathParts.length > 0 ? pathParts[pathParts.length - 1] : null;
    const isListOrCreate = pathParts.length === 0 || pathParts[pathParts.length - 1] === 'prompt-builder';

    // GET / - List prompts
    if (req.method === 'GET' && isListOrCreate) {
      const mode = url.searchParams.get('mode'); // 'template', 'rag', 'custom'
      const includePublic = url.searchParams.get('include_public') !== 'false';

      let query = supabase
        .from('prompt_templates')
        .select('*')
        .or(`user_id.eq.${user.id}${includePublic ? ',is_public.eq.true' : ''}`)
        .order('created_at', { ascending: false });

      if (mode) {
        query = query.eq('mode', mode);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return new Response(
        JSON.stringify({ prompts: data || [] }),
        {
          headers: { ...headers, 'Content-Type': 'application/json' }
        }
      );
    }

    // GET /:id - Get single prompt
    if (req.method === 'GET' && promptId) {
      const { data, error } = await supabase
        .from('prompt_templates')
        .select('*')
        .eq('id', promptId)
        .or(`user_id.eq.${user.id},is_public.eq.true`)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return new Response(
            JSON.stringify({ error: 'Prompt not found' }),
            { 
              status: 404, 
              headers: { ...headers, 'Content-Type': 'application/json' } 
            }
          );
        }
        throw error;
      }

      return new Response(
        JSON.stringify({ prompt: data }),
        {
          headers: { ...headers, 'Content-Type': 'application/json' }
        }
      );
    }

    // POST / - Create prompt
    if (req.method === 'POST' && isListOrCreate) {
      const body = await req.json();
      const {
        name,
        description,
        title,
        role,
        task,
        context,
        constraints = [],
        examples = [],
        mode = 'custom',
        associated_template_id,
        is_public = false,
      } = body;

      if (!name) {
        return new Response(
          JSON.stringify({ error: 'Name is required' }),
          { 
            status: 400, 
            headers: { ...headers, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Build structured prompt
      const prompt = {
        title: title || '',
        role: role || '',
        task: task || '',
        context: context || '',
        constraints: Array.isArray(constraints) ? constraints : [],
        examples: Array.isArray(examples) ? examples : [],
      };

      // Generate previews
      const jsonPreview = JSON.stringify(prompt, null, 2);
      const markdownPreview = generateMarkdownPreview(prompt);
      const plainTextPreview = generatePlainPreview(prompt);

      const { data, error } = await supabase
        .from('prompt_templates')
        .insert({
          user_id: user.id,
          name,
          description: description || null,
          title: prompt.title,
          role: prompt.role,
          task: prompt.task,
          context: prompt.context,
          constraints: prompt.constraints,
          examples: prompt.examples,
          mode,
          associated_template_id: associated_template_id || null,
          is_public,
          json_preview: jsonPreview,
          markdown_preview: markdownPreview,
          plain_text_preview: plainTextPreview,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return new Response(
        JSON.stringify({ prompt: data }),
        {
          status: 201,
          headers: { ...headers, 'Content-Type': 'application/json' }
        }
      );
    }

    // PUT /:id - Update prompt
    if (req.method === 'PUT' && promptId) {
      const body = await req.json();

      // Check ownership
      const { data: existing, error: checkError } = await supabase
        .from('prompt_templates')
        .select('user_id')
        .eq('id', promptId)
        .single();

      if (checkError || existing.user_id !== user.id) {
        return new Response(
          JSON.stringify({ error: 'Not authorized to update this prompt' }),
          { 
            status: 403, 
            headers: { ...headers, 'Content-Type': 'application/json' } 
          }
        );
      }

      const {
        name,
        description,
        title,
        role,
        task,
        context,
        constraints,
        examples,
        is_public,
      } = body;

      // Build updated prompt
      const prompt = {
        title: (title ?? existing.title) || '',
        role: (role ?? existing.role) || '',
        task: (task ?? existing.task) || '',
        context: (context ?? existing.context) || '',
        constraints: (constraints ?? existing.constraints) || [],
        examples: (examples ?? existing.examples) || [],
      };

      // Regenerate previews
      const jsonPreview = JSON.stringify(prompt, null, 2);
      const markdownPreview = generateMarkdownPreview(prompt);
      const plainTextPreview = generatePlainPreview(prompt);

      const updateData: any = {
        title: prompt.title,
        role: prompt.role,
        task: prompt.task,
        context: prompt.context,
        constraints: prompt.constraints,
        examples: prompt.examples,
        json_preview: jsonPreview,
        markdown_preview: markdownPreview,
        plain_text_preview: plainTextPreview,
      };

      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (is_public !== undefined) updateData.is_public = is_public;

      const { data, error } = await supabase
        .from('prompt_templates')
        .update(updateData)
        .eq('id', promptId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return new Response(
        JSON.stringify({ prompt: data }),
        {
          headers: { ...headers, 'Content-Type': 'application/json' }
        }
      );
    }

    // DELETE /:id - Delete prompt
    if (req.method === 'DELETE' && promptId) {
      // Check ownership
      const { data: existing, error: checkError } = await supabase
        .from('prompt_templates')
        .select('user_id')
        .eq('id', promptId)
        .single();

      if (checkError || existing.user_id !== user.id) {
        return new Response(
          JSON.stringify({ error: 'Not authorized to delete this prompt' }),
          { 
            status: 403, 
            headers: { ...headers, 'Content-Type': 'application/json' } 
          }
        );
      }

      const { error } = await supabase
        .from('prompt_templates')
        .delete()
        .eq('id', promptId);

      if (error) {
        throw error;
      }

      return new Response(
        JSON.stringify({ success: true }),
        {
          headers: { ...headers, 'Content-Type': 'application/json' }
        }
      );
    }

    // Method not allowed
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Prompt builder error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.stack 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Helper functions for preview generation
function generateMarkdownPreview(prompt: any): string {
  const parts: string[] = [];

  if (prompt.title) {
    parts.push(`# ${prompt.title}\n`);
  }

  if (prompt.role) {
    parts.push(`## Role\n${prompt.role}\n`);
  }

  if (prompt.task) {
    parts.push(`## Task\n${prompt.task}\n`);
  }

  if (prompt.context) {
    parts.push(`## Context\n${prompt.context}\n`);
  }

  if (prompt.constraints && prompt.constraints.length > 0) {
    parts.push(`## Constraints\n`);
    prompt.constraints.forEach((constraint: string, index: number) => {
      parts.push(`${index + 1}. ${constraint}\n`);
    });
    parts.push('\n');
  }

  if (prompt.examples && prompt.examples.length > 0) {
    parts.push(`## Examples\n`);
    prompt.examples.forEach((example: any, index: number) => {
      parts.push(`### Example ${index + 1}\n`);
      parts.push(`**Input:**\n${example.input}\n\n`);
      parts.push(`**Output:**\n${example.output}\n\n`);
    });
  }

  return parts.join('');
}

function generatePlainPreview(prompt: any): string {
  const parts: string[] = [];

  if (prompt.title) {
    parts.push(`${prompt.title}\n${'='.repeat(prompt.title.length)}\n`);
  }

  if (prompt.role) {
    parts.push(`ROLE:\n${prompt.role}\n\n`);
  }

  if (prompt.task) {
    parts.push(`TASK:\n${prompt.task}\n\n`);
  }

  if (prompt.context) {
    parts.push(`CONTEXT:\n${prompt.context}\n\n`);
  }

  if (prompt.constraints && prompt.constraints.length > 0) {
    parts.push(`CONSTRAINTS:\n`);
    prompt.constraints.forEach((constraint: string, index: number) => {
      parts.push(`${index + 1}. ${constraint}\n`);
    });
    parts.push('\n');
  }

  if (prompt.examples && prompt.examples.length > 0) {
    parts.push(`EXAMPLES:\n`);
    prompt.examples.forEach((example: any, index: number) => {
      parts.push(`Example ${index + 1}:\n`);
      parts.push(`Input: ${example.input}\n`);
      parts.push(`Output: ${example.output}\n\n`);
    });
  }

  return parts.join('');
}

