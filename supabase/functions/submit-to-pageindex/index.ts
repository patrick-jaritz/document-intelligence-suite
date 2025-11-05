/**
 * Supabase Edge Function: Submit Document to PageIndex
 * 
 * Submits a PDF document to PageIndex for Vision RAG indexing
 * 
 * Input: { documentId: string, fileUrl: string, filename?: string }
 * Output: { pageindexDocId: string, status: string, message: string }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';
import { getSecurityHeaders, mergeSecurityHeaders } from '../_shared/security-headers.ts';

interface SubmitRequest {
  documentId: string;
  fileUrl: string;
  filename?: string;
}

interface SubmitResponse {
  pageindexDocId: string;
  status: 'processing' | 'ready' | 'failed';
  message: string;
  error?: string;
}

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

  // SECURITY: Limit request size
  const MAX_REQUEST_SIZE = 10 * 1024 * 1024; // 10MB
  let requestText = '';
  try {
    requestText = await req.text();
    if (requestText.length > MAX_REQUEST_SIZE) {
      return new Response(
        JSON.stringify({ error: 'Request too large' }),
        { 
          status: 413, 
          headers: { ...headers, 'Content-Type': 'application/json' } 
        }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to read request body' }),
      { 
        status: 400, 
        headers: { ...headers, 'Content-Type': 'application/json' } 
      }
    );
  }

  try {
    // Parse request
    const request: SubmitRequest = JSON.parse(requestText);
    const { documentId, fileUrl, filename } = request;

    // SECURITY: Validate input
    if (!documentId || typeof documentId !== 'string' || documentId.trim().length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing or invalid required field: documentId' 
        }),
        { 
          status: 400, 
          headers: { ...headers, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!fileUrl || typeof fileUrl !== 'string' || fileUrl.trim().length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing or invalid required field: fileUrl' 
        }),
        { 
          status: 400, 
          headers: { ...headers, 'Content-Type': 'application/json' } 
        }
      );
    }

    // SECURITY: Validate URL length
    if (fileUrl.length > 2048) {
      return new Response(
        JSON.stringify({ error: 'File URL too long (max 2048 characters)' }),
        { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📤 Submitting document to PageIndex: ${documentId}`);

    // SECURITY: Get API keys - no hardcoded fallbacks
    const pageIndexKey = Deno.env.get('PAGEINDEX_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!pageIndexKey) {
      return new Response(
        JSON.stringify({ 
          error: 'PAGEINDEX_API_KEY not configured. Get your key from https://dash.pageindex.ai/api-keys' 
        }),
        { 
          status: 500, 
          headers: { ...headers, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Download file from Supabase Storage
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Extract file path from URL (assuming format: /storage/v1/object/public/bucket/file.pdf)
    const urlParts = fileUrl.split('/storage/v1/object/public/');
    if (urlParts.length !== 2) {
      throw new Error('Invalid file URL format');
    }
    
    const [bucket, filePath] = urlParts[1].split('/', 2);
    
    // Download file as blob
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(bucket)
      .download(filePath);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download file: ${downloadError?.message || 'Unknown error'}`);
    }

    // Convert blob to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    // Submit to PageIndex
    const submitResponse = await fetch('https://api.pageindex.ai/v1/documents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${pageIndexKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file: `data:application/pdf;base64,${base64}`,
        filename: filename || 'document.pdf',
        metadata: {
          documentId,
          uploadedAt: new Date().toISOString(),
        }
      })
    });

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      throw new Error(`PageIndex API error: ${submitResponse.status} - ${errorText}`);
    }

    const submitResult = await submitResponse.json();
    const pageindexDocId = submitResult.doc_id || submitResult.id;

    if (!pageindexDocId) {
      throw new Error('PageIndex did not return a document ID');
    }

    console.log(`✅ Document submitted to PageIndex: ${pageindexDocId}`);

    // Store mapping in database
    const { data: authData } = await supabase.auth.getUser(
      req.headers.get('Authorization')?.replace('Bearer ', '') || ''
    );
    const userId = authData?.user?.id;

    const { error: dbError } = await supabase
      .from('pageindex_documents')
      .insert({
        document_id: documentId,
        pageindex_doc_id: pageindexDocId,
        filename: filename || 'document.pdf',
        status: 'processing',
        user_id: userId,
      })
      .select()
      .single();

    if (dbError) {
      console.warn('⚠️ Failed to store mapping in database:', dbError);
      // Continue anyway - the submission was successful
    }

    const response: SubmitResponse = {
      pageindexDocId,
      status: 'processing',
      message: 'Document submitted to PageIndex. It will be ready for queries in a few moments.',
    };

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...headers, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Submit to PageIndex error:', error);
    
    // SECURITY: Don't expose stack traces in production
    const isProduction = Deno.env.get('ENVIRONMENT') === 'production';
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error',
        status: 'failed',
        ...(isProduction ? {} : { 
          details: error instanceof Error ? error.stack : String(error)
        })
      }),
      {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' }
      }
    );
  }
});

