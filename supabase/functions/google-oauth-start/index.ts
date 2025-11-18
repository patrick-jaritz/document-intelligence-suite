import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';
import { getSecurityHeaders, mergeSecurityHeaders } from '../_shared/security-headers.ts';

serve((req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);
  const securityHeaders = getSecurityHeaders();
  const headers = mergeSecurityHeaders(corsHeaders, securityHeaders);

  try {
    const url = new URL(req.url);
    const params = url.searchParams;
    const userId = params.get('user_id') || '';
    const state = encodeURIComponent(JSON.stringify({ user_id: userId }));

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID') ?? '';
    const redirectUri = Deno.env.get('GOOGLE_OAUTH_REDIRECT_URL') ?? '';

    if (!clientId || !redirectUri) {
      return new Response(JSON.stringify({ error: 'Google OAuth not configured' }), { status: 500, headers: { ...headers, 'Content-Type': 'application/json' } });
    }

    const scope = encodeURIComponent([
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive.metadata.readonly'
    ].join(' '));

    const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&state=${state}`;

    return Response.redirect(oauthUrl, 302);
  } catch (err) {
    console.error('google-oauth-start error', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers: { ...headers, 'Content-Type': 'application/json' } });
  }
});
