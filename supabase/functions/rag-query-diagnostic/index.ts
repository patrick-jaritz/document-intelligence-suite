/**
 * RAG Query Diagnostic Tool
 * 
 * This Edge Function helps diagnose RAG query issues by:
 * - Checking if documents exist
 * - Checking if chunks exist
 * - Checking if embeddings are generated
 * - Testing a sample query
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';
import { getSecurityHeaders, mergeSecurityHeaders } from '../_shared/security-headers.ts';

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

    const { documentId, filename } = JSON.parse(requestText || '{}');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Supabase configuration not found' }),
        { status: 500, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      documentId: documentId || null,
      filename: filename || null,
    };

    // 1. Check if document exists in rag_documents
    if (documentId) {
      const { data: doc, error: docError } = await supabase
        .from('rag_documents')
        .select('*')
        .eq('id', documentId)
        .single();

      diagnostics.document = {
        exists: !!doc && !docError,
        error: docError?.message,
        data: doc ? {
          id: doc.id,
          filename: doc.filename,
          upload_date: doc.upload_date,
          embedding_provider: doc.embedding_provider,
          status: doc.status || 'unknown'
        } : null
      };
    }

    // 2. Check chunks in document_chunks
    let chunkQuery = supabase
      .from('document_chunks')
      .select('id, chunk_index, filename, document_id, chunk_text, embedding, metadata')
      .limit(100);

    if (documentId) {
      chunkQuery = chunkQuery.eq('document_id', documentId);
    } else if (filename) {
      chunkQuery = chunkQuery.eq('filename', filename);
    }

    const { data: chunks, error: chunksError } = await chunkQuery;

    diagnostics.chunks = {
      total: chunks?.length || 0,
      error: chunksError?.message,
      withEmbeddings: chunks?.filter((c: any) => c.embedding !== null && c.embedding !== undefined).length || 0,
      withoutEmbeddings: chunks?.filter((c: any) => c.embedding === null || c.embedding === undefined).length || 0,
      sample: chunks?.slice(0, 3).map((c: any) => ({
        id: c.id,
        chunk_index: c.chunk_index,
        filename: c.filename,
        document_id: c.document_id,
        text_length: c.chunk_text?.length || 0,
        text_preview: c.chunk_text?.substring(0, 100) || 'empty',
        has_embedding: !!c.embedding,
        embedding_type: typeof c.embedding,
        embedding_length: Array.isArray(c.embedding) ? c.embedding.length : (typeof c.embedding === 'string' ? c.embedding.length : 0)
      })) || []
    };

    // 3. Check all documents in rag_documents
    const { data: allDocs, error: allDocsError } = await supabase
      .from('rag_documents')
      .select('id, filename, upload_date, embedding_provider')
      .order('upload_date', { ascending: false })
      .limit(20);

    diagnostics.allDocuments = {
      count: allDocs?.length || 0,
      error: allDocsError?.message,
      documents: allDocs?.map((d: any) => ({
        id: d.id,
        filename: d.filename,
        upload_date: d.upload_date,
        embedding_provider: d.embedding_provider
      })) || []
    };

    // 4. Check chunk statistics
    const { data: chunkStats, error: statsError } = await supabase
      .from('document_chunks')
      .select('document_id, filename')
      .limit(1000);

    if (chunkStats) {
      const byDocument = chunkStats.reduce((acc: any, chunk: any) => {
        const key = chunk.document_id || 'unknown';
        if (!acc[key]) {
          acc[key] = {
            document_id: chunk.document_id,
            filename: chunk.filename,
            chunk_count: 0
          };
        }
        acc[key].chunk_count++;
        return acc;
      }, {});

      diagnostics.statistics = {
        totalChunks: chunkStats.length,
        documentsWithChunks: Object.keys(byDocument).length,
        byDocument: Object.values(byDocument).slice(0, 10)
      };
    }

    // 5. Recommendations
    const recommendations: string[] = [];
    
    if (!documentId && !filename) {
      recommendations.push('⚠️ No documentId or filename provided - specify one to get targeted diagnostics');
    }
    
    if (diagnostics.document && !diagnostics.document.exists) {
      recommendations.push('❌ Document not found in rag_documents table - document may not have been uploaded');
    }
    
    if (diagnostics.chunks.total === 0) {
      recommendations.push('❌ No chunks found - document may not have been processed or chunks not generated');
    }
    
    if (diagnostics.chunks.withoutEmbeddings > 0) {
      recommendations.push(`⚠️ ${diagnostics.chunks.withoutEmbeddings} chunks without embeddings - embeddings may not have been generated`);
    }
    
    if (diagnostics.chunks.total > 0 && diagnostics.chunks.withEmbeddings === 0) {
      recommendations.push('❌ No chunks have embeddings - embedding generation may have failed');
    }
    
    if (diagnostics.chunks.total > 0 && diagnostics.chunks.withEmbeddings > 0) {
      recommendations.push('✅ Chunks and embeddings exist - issue may be with query similarity or question phrasing');
    }

    diagnostics.recommendations = recommendations;

    return new Response(
      JSON.stringify({
        success: true,
        diagnostics
      }),
      {
        headers: { ...headers, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Diagnostic error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : String(error)
      }),
      {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' }
      }
    );
  }
});

