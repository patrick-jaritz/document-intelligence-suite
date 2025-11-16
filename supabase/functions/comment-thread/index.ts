import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';
import { getSecurityHeaders, mergeSecurityHeaders } from '../_shared/security-headers.ts';
import { requireAuth } from '../_shared/jwt-verification.ts';

type Membership = {
  team_id: string;
  role: string;
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function getMemberships(userId: string): Promise<Membership[]> {
  const { data, error } = await supabase
    .from('team_members')
    .select('team_id, role')
    .eq('user_id', userId);

  if (error) {
    throw error;
  }

  return data ?? [];
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  const origin = req.headers.get('Origin');
  const headers = mergeSecurityHeaders(getCorsHeaders(origin), getSecurityHeaders());

  try {
    const user = await requireAuth(req);
    const memberships = await getMemberships(user.userId);
    const teamIds = memberships.map((m) => m.team_id);

    const url = new URL(req.url);
    const method = req.method.toUpperCase();

    if (method === 'GET') {
      const repositoryUrl = url.searchParams.get('repository_url');
      if (!repositoryUrl) {
        return new Response(JSON.stringify({ success: false, error: 'Missing repository_url' }), {
          status: 400,
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }

      const filters: string[] = [`owner_id.eq.${user.userId}`];
      if (teamIds.length > 0) {
        filters.push(`team_id.in.(${teamIds.join(',')})`);
      }

      const { data: existing, error } = await supabase
        .from('comment_threads')
        .select('*')
        .eq('repository_url', repositoryUrl)
        .or(filters.join(','))
        .maybeSingle();

      if (error) throw error;

      let thread = existing;

      if (!thread) {
        const { data: created, error: createError } = await supabase
          .from('comment_threads')
          .insert({
            repository_url: repositoryUrl,
            owner_id: user.userId,
          })
          .select()
          .single();

        if (createError) throw createError;
        thread = created;
      }

      const { count, error: countError } = await supabase
        .from('comments')
        .select('id', { count: 'exact', head: true })
        .eq('thread_id', thread.id);

      if (countError) throw countError;

      return new Response(
        JSON.stringify({
          success: true,
          data: thread,
          comment_count: count ?? 0,
        }),
        { status: 200, headers: { ...headers, 'Content-Type': 'application/json' } },
      );
    }

    if (method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const repositoryUrl = body.repository_url;
      if (!repositoryUrl || typeof repositoryUrl !== 'string') {
        return new Response(JSON.stringify({ success: false, error: 'repository_url is required' }), {
          status: 400,
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }

      const teamId = typeof body.team_id === 'string' ? body.team_id : null;
      if (teamId && !teamIds.includes(teamId)) {
        return new Response(JSON.stringify({ success: false, error: 'Not a member of this team' }), {
          status: 403,
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }

      const insertPayload = {
        repository_url: repositoryUrl,
        owner_id: teamId ? null : user.userId,
        team_id: teamId,
      };

      const { data, error } = await supabase
        .from('comment_threads')
        .insert(insertPayload)
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, data }), {
        status: 201,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('comment-thread error', error);
    const status = error instanceof Error && 'message' in error && String(error.message).includes('Authentication')
      ? 401
      : 500;
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unexpected error',
      }),
      { status, headers: { ...headers, 'Content-Type': 'application/json' } },
    );
  }
});


