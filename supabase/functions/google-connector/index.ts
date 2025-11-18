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
    const body = await req.json();
    const { userId, query, pageSize = 10 } = body;

    if (!userId || !query) {
      return new Response(JSON.stringify({ error: 'Missing userId or query' }), { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: integration, error: intErr } = await supabase
      .from('external_account_integrations')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', 'google')
      .single();

    if (intErr || !integration) {
      return new Response(JSON.stringify({ error: 'No google integration found for user' }), { status: 404, headers: { ...headers, 'Content-Type': 'application/json' } });
    }

    // Exchange refresh token for access token if needed
    let accessToken = integration.access_token;
    if (!accessToken && integration.refresh_token) {
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
          client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
          refresh_token: integration.refresh_token,
          grant_type: 'refresh_token'
        }).toString()
      });

      if (tokenRes.ok) {
        const tokenData = await tokenRes.json();
        accessToken = tokenData.access_token;
        // Persist short-lived access token
        await supabase
          .from('external_account_integrations')
          .update({ access_token: accessToken, expires_at: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : null })
          .eq('id', integration.id);
      }
    }

    if (!accessToken) {
      return new Response(JSON.stringify({ error: 'Unable to obtain access token' }), { status: 500, headers: { ...headers, 'Content-Type': 'application/json' } });
    }

    // Use Google Drive API to search files (simple approach)
    // Note: Drive search supports `fullText contains 'text'` for content search
    const q = `fullText contains '${query.replace(/'/g, "\\'")}' and trashed = false`;
    const driveRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&pageSize=${pageSize}&fields=files(id,name,mimeType,modifiedTime,webViewLink,owners)`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!driveRes.ok) {
      const text = await driveRes.text();
      console.error('Drive search failed', driveRes.status, text);
      return new Response(JSON.stringify({ error: 'Drive search failed' }), { status: 502, headers: { ...headers, 'Content-Type': 'application/json' } });
    }

    const driveData = await driveRes.json();

    const normalized = (driveData.files || []).map((f: any) => ({
      id: f.id,
      title: f.name,
      mimeType: f.mimeType,
      modifiedTime: f.modifiedTime,
      webViewLink: f.webViewLink,
      owner: f.owners?.[0]?.displayName || null
    }));

    return new Response(JSON.stringify({ results: normalized }), { status: 200, headers: { ...headers, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('google-connector error', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
