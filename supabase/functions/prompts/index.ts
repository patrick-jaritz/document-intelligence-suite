/**
 * Supabase Edge Function: Prompts API
 * 
 * Enhanced CRUD operations for prompts with versioning support
 * 
 * GET    / - List prompts (filtered by search, tags, category, visibility)
 * POST   / - Create prompt
 * GET    /:id - Get single prompt
 * PUT    /:id - Update prompt
 * DELETE /:id - Delete prompt
 * POST   /:id/versions - Create new version
 * GET    /:id/versions - List versions
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
    // Supabase Edge Functions: pathname is like "/prompts" or "/prompts/:id" or "/prompts/:id/versions"
    // The /functions/v1/ prefix is stripped by Supabase
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    // pathParts will be: [] for /prompts, ['prompts', 'id'] for /prompts/:id, etc.
    // But since we're already in the prompts function, pathParts[0] might be 'prompts' or might be the ID
    // Let's check: if pathParts[0] === 'prompts', then pathParts[1] is the ID
    // Otherwise, pathParts[0] is the ID (Supabase might strip the function name)
    
    let promptId: string | null = null;
    let action: string | null = null;
    
    if (pathParts.length > 0) {
      if (pathParts[0] === 'prompts') {
        // Path is /prompts/:id
        promptId = pathParts.length > 1 ? pathParts[1] : null;
        action = pathParts.length > 2 ? pathParts[2] : null;
      } else {
        // Path is /:id (function name already stripped)
        promptId = pathParts[0];
        action = pathParts.length > 1 ? pathParts[1] : null;
      }
    }
    
    const isListOrCreate = !promptId;

    // GET / - List prompts
    if (req.method === 'GET' && isListOrCreate) {
      const search = url.searchParams.get('search');
      const tags = url.searchParams.get('tags')?.split(',').filter(Boolean);
      const category = url.searchParams.get('category');
      const visibility = url.searchParams.get('visibility');
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
      const offset = (page - 1) * limit;

      let query = supabase
        .from('prompts')
        .select('*, prompt_metrics(*)', { count: 'exact' })
        .or(`user_id.eq.${user.id},visibility.eq.public`)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (search) {
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,prompt_body.ilike.%${search}%`);
      }

      if (tags && tags.length > 0) {
        query = query.contains('tags', tags);
      }

      if (category) {
        query = query.eq('category', category);
      }

      if (visibility) {
        query = query.eq('visibility', visibility);
      }

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }
      
      // Ensure metrics exist for all prompts (create if missing)
      if (data && data.length > 0) {
        const promptIds = data.map((p: any) => p.id);
        await supabase
          .from('prompt_metrics')
          .upsert(
            promptIds.map((id: string) => ({ prompt_id: id })),
            { onConflict: 'prompt_id', ignoreDuplicates: true }
          );
      }

      return new Response(
        JSON.stringify({ 
          prompts: data || [], 
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

    // GET /:id - Get single prompt
    if (req.method === 'GET' && promptId && action !== 'versions') {
      const { data, error } = await supabase
        .from('prompts')
        .select('*, prompt_metrics(*), prompt_versions(*)')
        .eq('id', promptId)
        .or(`user_id.eq.${user.id},visibility.eq.public`)
        .single();
      
      // Ensure metrics exist
      if (data && !data.prompt_metrics) {
        await supabase
          .from('prompt_metrics')
          .upsert({ prompt_id: promptId }, { onConflict: 'prompt_id', ignoreDuplicates: true });
        
        // Refetch with metrics
        const { data: refetched } = await supabase
          .from('prompts')
          .select('*, prompt_metrics(*), prompt_versions(*)')
          .eq('id', promptId)
          .single();
        
        if (refetched) {
          return new Response(
            JSON.stringify({ prompt: refetched }),
            {
              headers: { ...headers, 'Content-Type': 'application/json' }
            }
          );
        }
      }

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

    // GET /:id/versions - List versions
    if (req.method === 'GET' && promptId && action === 'versions') {
      const { data, error } = await supabase
        .from('prompt_versions')
        .select('*')
        .eq('prompt_id', promptId)
        .order('version_number', { ascending: false });

      if (error) {
        throw error;
      }

      return new Response(
        JSON.stringify({ versions: data || [] }),
        {
          headers: { ...headers, 'Content-Type': 'application/json' }
        }
      );
    }

    // POST / - Create prompt
    if (req.method === 'POST' && isListOrCreate) {
      const body = await req.json();
      const {
        title,
        description,
        prompt_body,
        system_message,
        category,
        tags = [],
        visibility = 'private',
        role,
        task,
        context,
        constraints = [],
        examples = [],
      } = body;

      if (!title || !prompt_body) {
        return new Response(
          JSON.stringify({ error: 'Title and prompt_body are required' }),
          { 
            status: 400, 
            headers: { ...headers, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Generate previews
      const jsonPreview = JSON.stringify({ role, task, context, constraints, examples }, null, 2);
      const markdownPreview = generateMarkdownPreview({ role, task, context, constraints, examples });
      const plainTextPreview = prompt_body;

      const { data: prompt, error } = await supabase
        .from('prompts')
        .insert({
          user_id: user.id,
          title,
          description: description || null,
          prompt_body,
          system_message: system_message || null,
          category: category || null,
          tags: Array.isArray(tags) ? tags : [],
          visibility,
          role: role || null,
          task: task || null,
          context: context || null,
          constraints: Array.isArray(constraints) ? constraints : [],
          examples: Array.isArray(examples) ? examples : [],
          json_preview: jsonPreview,
          markdown_preview: markdownPreview,
          plain_text_preview: plainTextPreview,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Create initial version
      const { data: version, error: versionError } = await supabase
        .from('prompt_versions')
        .insert({
          prompt_id: prompt.id,
          version_number: 1,
          prompt_body,
          system_message: system_message || null,
          role: role || null,
          task: task || null,
          context: context || null,
          constraints: Array.isArray(constraints) ? constraints : [],
          examples: Array.isArray(examples) ? examples : [],
          is_current: true,
          created_by: user.id,
        })
        .select()
        .single();

      if (versionError) {
        console.error('Error creating initial version:', versionError);
      } else {
        // Update prompt with current_version_id
        await supabase
          .from('prompts')
          .update({ current_version_id: version.id })
          .eq('id', prompt.id);
      }

      // Initialize metrics
      await supabase
        .from('prompt_metrics')
        .insert({ prompt_id: prompt.id })
        .onConflict('prompt_id')
        .ignore();

      return new Response(
        JSON.stringify({ prompt }),
        {
          status: 201,
          headers: { ...headers, 'Content-Type': 'application/json' }
        }
      );
    }

    // PUT /:id - Update prompt
    if (req.method === 'PUT' && promptId && action !== 'versions') {
      const body = await req.json();

      // Check ownership
      const { data: existing, error: checkError } = await supabase
        .from('prompts')
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

      const updateData: any = {};
      if (body.title !== undefined) updateData.title = body.title;
      if (body.description !== undefined) updateData.description = body.description;
      if (body.prompt_body !== undefined) updateData.prompt_body = body.prompt_body;
      if (body.system_message !== undefined) updateData.system_message = body.system_message;
      if (body.category !== undefined) updateData.category = body.category;
      if (body.tags !== undefined) updateData.tags = Array.isArray(body.tags) ? body.tags : [];
      if (body.visibility !== undefined) updateData.visibility = body.visibility;
      if (body.role !== undefined) updateData.role = body.role;
      if (body.task !== undefined) updateData.task = body.task;
      if (body.context !== undefined) updateData.context = body.context;
      if (body.constraints !== undefined) updateData.constraints = Array.isArray(body.constraints) ? body.constraints : [];
      if (body.examples !== undefined) updateData.examples = Array.isArray(body.examples) ? body.examples : [];

      // Regenerate previews if prompt_body changed
      if (body.prompt_body !== undefined) {
        updateData.json_preview = JSON.stringify({
          role: updateData.role ?? existing.role,
          task: updateData.task ?? existing.task,
          context: updateData.context ?? existing.context,
          constraints: updateData.constraints ?? existing.constraints,
          examples: updateData.examples ?? existing.examples,
        }, null, 2);
        updateData.markdown_preview = generateMarkdownPreview({
          role: updateData.role ?? existing.role,
          task: updateData.task ?? existing.task,
          context: updateData.context ?? existing.context,
          constraints: updateData.constraints ?? existing.constraints,
          examples: updateData.examples ?? existing.examples,
        });
        updateData.plain_text_preview = body.prompt_body;
      }

      const { data, error } = await supabase
        .from('prompts')
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

    // POST /:id/versions - Create new version
    if (req.method === 'POST' && promptId && action === 'versions') {
      const body = await req.json();

      // Check ownership
      const { data: existing, error: checkError } = await supabase
        .from('prompts')
        .select('user_id, current_version_id')
        .eq('id', promptId)
        .single();

      if (checkError || existing.user_id !== user.id) {
        return new Response(
          JSON.stringify({ error: 'Not authorized to create version for this prompt' }),
          { 
            status: 403, 
            headers: { ...headers, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Get current max version number
      const { data: maxVersion } = await supabase
        .from('prompt_versions')
        .select('version_number')
        .eq('prompt_id', promptId)
        .order('version_number', { ascending: false })
        .limit(1)
        .single();

      const nextVersionNumber = (maxVersion?.version_number || 0) + 1;

      // Mark all previous versions as not current
      await supabase
        .from('prompt_versions')
        .update({ is_current: false })
        .eq('prompt_id', promptId);

      // Create new version
      const versionData = {
        prompt_id: promptId,
        version_number: nextVersionNumber,
        prompt_body: body.prompt_body || existing.prompt_body,
        system_message: body.system_message || existing.system_message,
        role: body.role ?? existing.role,
        task: body.task ?? existing.task,
        context: body.context ?? existing.context,
        constraints: body.constraints ?? existing.constraints,
        examples: body.examples ?? existing.examples,
        changelog: body.changelog || null,
        is_current: true,
        created_by: user.id,
      };

      const { data: version, error: versionError } = await supabase
        .from('prompt_versions')
        .insert(versionData)
        .select()
        .single();

      if (versionError) {
        throw versionError;
      }

      // Update prompt with new current_version_id
      await supabase
        .from('prompts')
        .update({ current_version_id: version.id })
        .eq('id', promptId);

      return new Response(
        JSON.stringify({ version }),
        {
          status: 201,
          headers: { ...headers, 'Content-Type': 'application/json' }
        }
      );
    }

    // DELETE /:id - Delete prompt
    if (req.method === 'DELETE' && promptId && action !== 'versions') {
      const { data: existing, error: checkError } = await supabase
        .from('prompts')
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
        .from('prompts')
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

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...headers, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Prompts API error:', error);
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

function generateMarkdownPreview(prompt: any): string {
  const parts: string[] = [];

  if (prompt.role) {
    parts.push(`## Role\n${prompt.role}\n`);
  }

  if (prompt.task) {
    parts.push(`## Task\n${prompt.task}\n`);
  }

  if (prompt.context) {
    parts.push(`## Context\n${prompt.context}\n`);
  }

  if (prompt.constraints && Array.isArray(prompt.constraints) && prompt.constraints.length > 0) {
    parts.push(`## Constraints\n`);
    prompt.constraints.forEach((constraint: string, index: number) => {
      parts.push(`${index + 1}. ${constraint}\n`);
    });
    parts.push('\n');
  }

  if (prompt.examples && Array.isArray(prompt.examples) && prompt.examples.length > 0) {
    parts.push(`## Examples\n`);
    prompt.examples.forEach((example: any, index: number) => {
      parts.push(`### Example ${index + 1}\n`);
      if (example.input) parts.push(`**Input:**\n${example.input}\n\n`);
      if (example.output) parts.push(`**Output:**\n${example.output}\n\n`);
    });
  }

  return parts.join('');
}
