import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';
import { getSecurityHeaders, mergeSecurityHeaders } from '../_shared/security-headers.ts';

serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);
  const securityHeaders = getSecurityHeaders();
  const headers = mergeSecurityHeaders(corsHeaders, securityHeaders);

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    if (!code) {
      return new Response('Missing code', { status: 400, headers });
    }

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID') ?? '';
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '';
    const redirectUri = Deno.env.get('GOOGLE_OAUTH_REDIRECT_URL') ?? '';

    if (!clientId || !clientSecret || !redirectUri) {
      return new Response('Google OAuth not configured', { status: 500, headers });
    }

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      }).toString()
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      console.error('Token exchange failed', tokenRes.status, text);
      return new Response('Token exchange failed', { status: 500, headers });
    }

    const tokenData = await tokenRes.json();
    // tokenData: { access_token, expires_in, refresh_token, scope, token_type }

    // Parse state to extract user_id if present
    let userId = null;
    try {
      if (state) {
        const parsed = JSON.parse(decodeURIComponent(state));
        userId = parsed.user_id || null;
      }
    } catch (e) {
      // ignore
    }

    // Persist refresh token in DB
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (!userId) {
      // No user id provided; render a minimal success page
      const html = `<html><body><h3>Google account connected</h3></body></html>`;
      return new Response(html, { status: 200, headers: { ...headers, 'Content-Type': 'text/html' } });
    }

    const { refresh_token, access_token, scope, expires_in } = tokenData as any;

    const updates: any = {
      provider: 'google',
      provider_account_id: null,
      access_token: access_token || null,
      refresh_token: refresh_token || null,
      scope: scope || null,
      expires_at: expires_in ? new Date(Date.now() + expires_in * 1000).toISOString() : null,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('external_account_integrations')
      .upsert({ user_id: userId, provider: 'google', ...updates }, { onConflict: ['user_id', 'provider'] });

    if (error) {
      console.error('Failed to upsert integration', error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...headers, 'Content-Type': 'application/json' } });
    }

    const html = `<html><body><h3>Google Drive connected successfully</h3><p>You can close this window.</p></body></html>`;
    return new Response(html, { status: 200, headers: { ...headers, 'Content-Type': 'text/html' } });

  } catch (err) {
    console.error('google-oauth-callback error', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
