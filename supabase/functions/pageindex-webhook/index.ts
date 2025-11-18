/**
 * Supabase Edge Function: PageIndex Webhook Handler
 *
 * Receives webhook events from PageIndex API when document processing status changes.
 * Updates the mapping table (pageindex_documents) with new status and doc_id.
 *
 * POST /pageindex-webhook
 * Body: { event: string, document_id: string, pageindex_doc_id: string, status: string }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';
import { getSecurityHeaders, mergeSecurityHeaders } from '../_shared/security-headers.ts';

serve(async (req) => {
  // Handle CORS preflight
  const preflightResponse = handleCorsPreflight(req);
  if (preflightResponse) return preflightResponse;

  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);
  const securityHeaders = getSecurityHeaders();
  const headers = mergeSecurityHeaders(corsHeaders, securityHeaders);

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400, headers });
  }

  const { event, document_id, pageindex_doc_id, status } = body;
  if (!document_id || !pageindex_doc_id || !status) {
    return new Response('Missing required fields', { status: 400, headers });
  }

  // Update mapping table
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { error } = await supabase
    .from('pageindex_documents')
    .update({ status, pageindex_doc_id })
    .eq('document_id', document_id);

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...headers, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { ...headers, 'Content-Type': 'application/json' } }
  );
});
