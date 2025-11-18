/**
 * Supabase Edge Function: Generate Embeddings
 * 
 * Generates vector embeddings for document chunks and stores them in pgvector
 * Now with enhanced chunking strategies (semantic, section-aware, hybrid)
 * 
 * Input: { 
 *   text: string, 
 *   documentId?: string, 
 *   filename: string, 
 *   provider?: string,
 *   chunkingStrategy?: 'fixed' | 'semantic' | 'section' | 'hybrid',
 *   chunkSize?: number,
 *   chunkOverlap?: number
 * }
 * Output: { success: boolean, chunkCount: number, documentId: string, chunkingStats?: any }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';
import { getSecurityHeaders, mergeSecurityHeaders } from '../_shared/security-headers.ts';
import { chunkText, getChunkingStats } from '../_shared/enhanced-chunking.ts';

// =============================================================================
// Embedding Generation
// =============================================================================

async function generateOpenAIEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

async function generateMistralEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch('https://api.mistral.ai/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'mistral-embed',
      input: [text]
    })
  });

  if (!response.ok) {
    throw new Error(`Mistral API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

// Simple hash-based embedding for Anthropic (fallback)
function generateLocalEmbedding(text: string): number[] {
  const embedding = new Array(1536).fill(0);
  
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    const index = (charCode * i) % 1536;
    embedding[index] = (embedding[index] + charCode / 255) / 2;
  }
  
  // Normalize
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map(val => val / (magnitude || 1));
}

async function generateEmbedding(
  text: string,
  provider: string,
  apiKeys: Record<string, string>
): Promise<number[]> {
  switch (provider) {
    case 'openai':
      if (!apiKeys.OPENAI_API_KEY) {
        console.warn('OpenAI API key not found, using local fallback');
        return generateLocalEmbedding(text);
      }
      return await generateOpenAIEmbedding(text, apiKeys.OPENAI_API_KEY);
    
    case 'mistral':
      if (!apiKeys.MISTRAL_API_KEY) {
        console.warn('Mistral API key not found, using local fallback');
        return generateLocalEmbedding(text);
      }
      return await generateMistralEmbedding(text, apiKeys.MISTRAL_API_KEY);
    
    case 'anthropic':
    default:
      // Anthropic doesn't have embeddings API, use local fallback
      return generateLocalEmbedding(text);
  }
}

// =============================================================================
// Main Edge Function
// =============================================================================

serve(async (req) => {
  console.log('🚀 generate-embeddings function called');
  
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
    console.log('📋 Parsing request body...');
    const { 
      text, 
      documentId, 
      filename, 
      sourceUrl, 
      provider = 'openai',
      chunkingStrategy = 'hybrid',
      chunkSize = 1000,
      chunkOverlap = 200
    } = JSON.parse(requestText);
    console.log('📋 Request parsed:', { 
      documentId, 
      filename, 
      provider, 
      textLength: text?.length,
      chunkingStrategy,
      chunkSize,
      chunkOverlap
    });

    // SECURITY: Validate input
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid required field: text' }),
        { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    }

    if (!filename || typeof filename !== 'string' || filename.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid required field: filename' }),
        { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    }

    // SECURITY: Validate input length
    if (text.length > 10000000) { // 10MB limit for text
      return new Response(
        JSON.stringify({ error: 'Text too long (max 10MB)' }),
        { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    }

    // Get API keys from environment
    const apiKeys = {
      OPENAI_API_KEY: Deno.env.get('OPENAI_API_KEY') || '',
      MISTRAL_API_KEY: Deno.env.get('MISTRAL_API_KEY') || '',
      ANTHROPIC_API_KEY: Deno.env.get('ANTHROPIC_API_KEY') || ''
    };

    console.log(`🚀 Generating embeddings for ${filename} using ${provider}`);
    console.log(`📊 Text length: ${text.length} characters`);
    console.log(`🔪 Chunking strategy: ${chunkingStrategy}`);
    console.log(`API Keys available:`, {
      openai: apiKeys.OPENAI_API_KEY ? 'present' : 'missing',
      mistral: apiKeys.MISTRAL_API_KEY ? 'present' : 'missing',
      anthropic: apiKeys.ANTHROPIC_API_KEY ? 'present' : 'missing'
    });

    // Chunk the text using enhanced chunking strategies
    const chunks = chunkText(text, {
      strategy: chunkingStrategy as any,
      chunkSize,
      chunkOverlap,
      respectParagraphs: true,
      respectSections: true,
      preserveCodeBlocks: true,
      preserveTables: true
    });
    
    const stats = getChunkingStats(chunks);
    console.log(`✅ Created ${chunks.length} chunks using ${chunkingStrategy} strategy:`, stats);
    
    if (chunks.length === 0) {
      throw new Error('No chunks created from text');
    }

    // Generate embeddings for each chunk
    console.log('Starting embedding generation...');
    const embeddings = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`Generating embedding for chunk ${i + 1}/${chunks.length} (${chunk.text.length} chars)`);
      try {
        const embedding = await generateEmbedding(chunk.text, provider, apiKeys);
        embeddings.push(embedding);
        console.log(`✓ Generated embedding ${i + 1}/${chunks.length}`);
      } catch (error) {
        console.error(`❌ Failed to generate embedding for chunk ${i + 1}:`, error);
        throw error;
      }
    }
    console.log(`Generated ${embeddings.length} embeddings`);

    // Store in Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🔍 Starting UUID validation and rag_documents check...');
    
    // Validate UUID helper
    const isValidUuid = (value: string | undefined | null): boolean => {
      if (!value) return false;
      const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const genericUuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidV4Regex.test(value) || genericUuidRegex.test(value);
    };

    console.log(`🔍 Validating documentId: ${documentId}`);
    
    // Decide effective document id used for insertion
    let effectiveDocumentId: string | null = null;
    if (documentId && isValidUuid(documentId)) {
      effectiveDocumentId = documentId;
      console.log(`✅ documentId is valid UUID: ${effectiveDocumentId}`);
    } else if (documentId) {
      console.warn(`❌ Provided documentId is not a valid UUID, will insert chunks with null document_id: ${documentId}`);
    }

    console.log(`🔍 effectiveDocumentId: ${effectiveDocumentId}, will check/create rag_documents record`);
    
    // Ensure rag_documents has a record for the document when UUID is valid
    if (effectiveDocumentId) {
      console.log(`🔍 effectiveDocumentId is ${effectiveDocumentId}, checking rag_documents...`);
      try {
        const { data: existingDoc, error: docSelectError } = await supabase
          .from('rag_documents')
          .select('id')
          .eq('id', effectiveDocumentId)
          .single();

        if (docSelectError || !existingDoc) {
          console.log(`rag_documents missing for ${effectiveDocumentId}, creating a minimal record before chunk insert`);
          const { error: docInsertError } = await supabase
            .from('rag_documents')
            .insert({
              id: effectiveDocumentId,
              filename,
              upload_date: new Date().toISOString(),
              embedding_provider: provider,
              metadata: { sourceUrl: sourceUrl || null, createdBy: 'generate-embeddings' }
            });

          if (docInsertError) {
            console.warn('Failed to create rag_documents record, will fallback to null document_id for chunks', docInsertError);
            effectiveDocumentId = null;
          } else {
            console.log(`✅ Successfully created rag_documents record for ${effectiveDocumentId}`);
          }
        } else {
          console.log(`✅ rag_documents record already exists for ${effectiveDocumentId}`);
        }
      } catch (error) {
        console.error('❌ Error in rag_documents check/create:', error);
        effectiveDocumentId = null;
      }
    }

    // Prepare data for insertion
    const embeddingsData = chunks.map((chunk, i) => ({
      document_id: effectiveDocumentId,
      filename,
      chunk_text: chunk.text,
      chunk_index: chunk.index,
      chunk_offset: chunk.offset,
      embedding: JSON.stringify(embeddings[i]), // pgvector expects JSON string
      metadata: {
        offset: chunk.offset,
        length: chunk.text.length,
        provider: provider,
        chunkingStrategy: chunk.metadata?.strategy || chunkingStrategy,
        sectionTitle: chunk.metadata?.sectionTitle,
        semanticBoundary: chunk.metadata?.semanticBoundary,
        hasCodeBlock: chunk.metadata?.hasCodeBlock,
        hasTable: chunk.metadata?.hasTable,
        structureDepth: chunk.metadata?.structureDepth
      }
    }));

    console.log(`Inserting ${embeddingsData.length} chunks into document_chunks table...`);
    console.log('Sample chunk data:', {
      firstChunk: {
        document_id: embeddingsData[0]?.document_id,
        filename: embeddingsData[0]?.filename,
        chunk_text_length: embeddingsData[0]?.chunk_text?.length,
        embedding_length: embeddingsData[0]?.embedding ? JSON.parse(embeddingsData[0].embedding).length : 0
      }
    });

    // No additional adjustment needed here, effectiveDocumentId already accounts for validity and existence

    const { error: insertError } = await supabase
      .from('document_chunks')
      .insert(embeddingsData);

    if (insertError) {
      console.error('Database insert error:', insertError);
      console.error('Insert error details:', {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint
      });
      throw insertError;
    }

    console.log(`✓ Stored ${embeddingsData.length} chunks in database`);

    return new Response(
      JSON.stringify({
        success: true,
        chunkCount: chunks.length,
        documentId: documentId || 'no-id',
        filename,
        provider,
        chunkingStrategy,
        chunkingStats: stats
      }),
      {
        headers: { ...headers, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Error in generate-embeddings function:', error);
    
    // SECURITY: Don't expose stack traces in production
    const isProduction = Deno.env.get('ENVIRONMENT') === 'production';
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to generate embeddings',
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

