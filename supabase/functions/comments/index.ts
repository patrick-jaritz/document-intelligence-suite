import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';
import { getSecurityHeaders, mergeSecurityHeaders } from '../_shared/security-headers.ts';
import { requireAuth } from '../_shared/jwt-verification.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  const origin = req.headers.get('Origin');
  const headers = mergeSecurityHeaders(getCorsHeaders(origin), getSecurityHeaders());

  try {
    const user = await requireAuth(req);
    const url = new URL(req.url);
    const method = req.method.toUpperCase();

    if (method === 'GET') {
      const threadId = url.searchParams.get('thread_id');
      const repositoryUrl = url.searchParams.get('repository_url');
      const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10) || 50, 200);
      const offset = parseInt(url.searchParams.get('offset') ?? '0', 10) || 0;

      let resolvedThreadId = threadId;

      if (!resolvedThreadId && repositoryUrl) {
        const { data: thread, error: threadError } = await supabase
          .from('comment_threads')
          .select('id')
          .eq('repository_url', repositoryUrl)
          .maybeSingle();

        if (threadError) throw threadError;
        resolvedThreadId = thread?.id ?? null;
      }

      if (!resolvedThreadId) {
        return new Response(
          JSON.stringify({ success: true, data: [], count: 0 }),
          { status: 200, headers: { ...headers, 'Content-Type': 'application/json' } },
        );
      }

      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('thread_id', resolvedThreadId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, data: data ?? [] }),
        { status: 200, headers: { ...headers, 'Content-Type': 'application/json' } },
      );
    }

    if (method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const threadId = body.thread_id;
      const message = body.body;

      if (!threadId || typeof threadId !== 'string') {
        return new Response(JSON.stringify({ success: false, error: 'thread_id is required' }), {
          status: 400,
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return new Response(JSON.stringify({ success: false, error: 'body must be a non-empty string' }), {
          status: 400,
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }

      const mentions = Array.isArray(body.mentions)
        ? body.mentions.filter((id: unknown) => typeof id === 'string')
        : [];

      const { data, error } = await supabase
        .from('comments')
        .insert({
          thread_id: threadId,
          author_id: user.userId,
          body: message.trim(),
          mentions,
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, data }), {
        status: 201,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    if (method === 'PUT') {
      const body = await req.json().catch(() => ({}));
      const commentId = body.id;

      if (!commentId || typeof commentId !== 'string') {
        return new Response(JSON.stringify({ success: false, error: 'id is required' }), {
          status: 400,
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }

      const updates: Record<string, unknown> = {};

      if (body.body !== undefined) {
        if (typeof body.body !== 'string' || body.body.trim().length === 0) {
          return new Response(JSON.stringify({ success: false, error: 'body must be a non-empty string' }), {
            status: 400,
            headers: { ...headers, 'Content-Type': 'application/json' },
          });
        }
        updates.body = body.body.trim();
      }

      if (body.resolved === true) {
        updates.resolved_at = new Date().toISOString();
      } else if (body.resolved === false) {
        updates.resolved_at = null;
      }

      if (Object.keys(updates).length === 0) {
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }

      const { data, error } = await supabase
        .from('comments')
        .update(updates)
        .eq('id', commentId)
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    if (method === 'DELETE') {
      const body = await req.json().catch(() => ({}));
      const commentId = body.id;
      if (!commentId || typeof commentId !== 'string') {
        return new Response(JSON.stringify({ success: false, error: 'id is required' }), {
          status: 400,
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }

      const { data, error } = await supabase
        .from('comments')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', commentId)
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('comments function error', error);
    const status = error instanceof Error && error.message.includes('Authentication') ? 401 : 500;
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unexpected error',
      }),
      { status, headers: { ...headers, 'Content-Type': 'application/json' } },
    );
  }
});


