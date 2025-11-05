/**
 * Supabase Edge Function: RAG Query with pgvector
 * 
 * Performs RAG query: generates question embedding, retrieves similar chunks from Supabase pgvector, generates answer
 * 
 * Input: { question: string, documentId?: string, filename?: string, model?: string, provider?: string }
 * Output: { answer: string, sources: Array<{text, score}>, model: string }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';
import { getSecurityHeaders, mergeSecurityHeaders } from '../_shared/security-headers.ts';
import { validateRequestId, validateRequestHeaders, detectSuspiciousPattern } from '../_shared/request-validation.ts';
import { logSecurityEvent, getClientIP, getUserAgent } from '../_shared/security-events.ts';

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

function generateLocalEmbedding(text: string): number[]  {
  const embedding = new Array(1536).fill(0);
  
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    const index = (charCode * i) % 1536;
    embedding[index] = (embedding[index] + charCode / 255) / 2;
  }
  
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map(val => val / (magnitude || 1));
}

async function generateQueryEmbedding(
  text: string,
  provider: string,
  apiKeys: Record<string, string>
): Promise<number[]> {
  switch (provider) {
    case 'openai':
      if (!apiKeys.OPENAI_API_KEY) {
        return generateLocalEmbedding(text);
      }
      return await generateOpenAIEmbedding(text, apiKeys.OPENAI_API_KEY);
    
    case 'mistral':
      if (!apiKeys.MISTRAL_API_KEY) {
        return generateLocalEmbedding(text);
      }
      return await generateMistralEmbedding(text, apiKeys.MISTRAL_API_KEY);
    
    default:
      return generateLocalEmbedding(text);
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

function calculateCosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);
  
  if (normA === 0 || normB === 0) {
    return 0;
  }
  
  return dotProduct / (normA * normB);
}

// =============================================================================
// Supabase pgvector Integration
// =============================================================================

async function querySupabase(
  embedding: number[],
  filename?: string,
  documentId?: string,
  topK: number = 5
): Promise<any[]> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase configuration not found');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

    console.log('🗄️ Querying Supabase pgvector:', {
      topK,
      filename: filename || 'all',
      embeddingLength: embedding.length,
      embeddingPreview: JSON.stringify(embedding).substring(0, 100) + '...'
    });

  try {
    // Query document_chunks table directly instead of using the RPC function
    let query = supabase
      .from('document_chunks')
      .select('id, chunk_text, chunk_index, filename, document_id, embedding, metadata')
      .limit(topK * 2); // Get more chunks to ensure we have enough for similarity calculation

    // Apply filters - prioritize documentId over filename
    // If documentId is provided, use only documentId (filename might not match stored filename)
    if (documentId && documentId !== 'null' && documentId !== 'undefined' && documentId.trim() !== '') {
      // Verify documentId is a valid UUID format
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidPattern.test(documentId)) {
        console.error('❌ INVALID documentId format:', documentId);
        throw new Error(`Invalid documentId format: ${documentId}`);
      }
      
      console.log('🔍 Applying documentId filter:', {
        documentId: documentId,
        documentIdType: typeof documentId,
        documentIdLength: documentId?.length,
        isUuidLike: uuidPattern.test(documentId)
      });
      
      // Apply filter - ensure document_id matches exactly
      query = query.eq('document_id', documentId);
    } else if (filename && filename !== 'all' && filename.trim() !== '') {
      // Fallback to filename filter if documentId is not provided
      console.log('🔍 Applying filename filter:', filename);
      query = query.eq('filename', filename);
    } else {
      // No filter - searching across ALL documents
      console.warn('⚠️ WARNING: No documentId or filename filter applied. Searching across ALL documents in database.');
      console.log('📊 This may return results from any document. Consider specifying documentId or filename for more targeted results.');
    }

    const { data: chunks, error } = await query;

    console.log('🔍 Database query result:', {
      hasError: !!error,
      error: error,
      chunksCount: chunks?.length || 0,
      filters: { filename, documentId },
      queryLimit: topK * 2,
      allChunkDocumentIds: chunks?.map((c: any) => c.document_id) || [],
      uniqueDocumentIds: [...new Set(chunks?.map((c: any) => c.document_id) || [])],
      firstChunkDocumentId: chunks?.[0]?.document_id,
      firstChunkFilename: chunks?.[0]?.filename,
      documentIdMatch: chunks?.[0]?.document_id === documentId ? '✅ MATCH' : '❌ MISMATCH'
    });
    
    // CRITICAL CHECK: If documentId was provided but chunks have different IDs, this is a serious error
    if (documentId && chunks && chunks.length > 0) {
      const nonMatchingChunks = chunks.filter((c: any) => c.document_id !== documentId);
      if (nonMatchingChunks.length > 0) {
        console.error('🚨 DATABASE QUERY ERROR: Query returned chunks with wrong document_id!', {
          requestedDocumentId: documentId,
          returnedDocumentIds: [...new Set(chunks.map((c: any) => c.document_id))],
          nonMatchingCount: nonMatchingChunks.length,
          totalReturned: chunks.length,
          message: 'This indicates the Supabase query filter is not working correctly'
        });
        // Don't return these chunks - they're wrong
        return [];
      }
    }

    if (error) {
      console.error('❌ Query error:', error);
      throw new Error(`Supabase query error: ${error.message}`);
    }

    if (!chunks || chunks.length === 0) {
      console.log('⚠️ No chunks found with filters:', {
        documentId,
        filename,
        filtersApplied: !!(documentId || filename)
      });
      
      // Only fall back to all documents if NO filters were provided
      // If documentId or filename were provided, return empty (document not found)
      if (!documentId && !filename) {
        console.log('🔄 No filters provided, querying all documents...');
        
        // Try without filters
        const { data: allChunks, error: allError } = await supabase
          .from('document_chunks')
          .select('id, chunk_text, chunk_index, filename, document_id, embedding, metadata')
          .limit(topK * 2);

        if (allError) {
          console.error('❌ Query error (no filter):', allError);
          throw new Error(`Supabase query error (no filter): ${allError.message}`);
        }

        if (allChunks && allChunks.length > 0) {
          console.log('✅ Found results without filters:', {
            matches: allChunks.length,
            foundFilenames: [...new Set(allChunks.map((c: any) => c.filename))]
          });
          
          return allChunks;
        }
      } else {
        // DocumentId or filename was provided but not found
        console.log('⚠️ Document not found with provided filters:', {
          documentId,
          filename,
          message: 'Returning empty results - document may not exist or may not have been processed yet'
        });
      }
      
      return [];
    }

    // Log document ID verification for all chunks
    console.log('🔍 Verifying chunks match requested documentId:', {
      requestedDocumentId: documentId,
      chunksReceived: chunks.length,
      chunkDocumentIds: chunks.map((c: any) => c.document_id),
      chunkFilenames: chunks.map((c: any) => c.filename)
    });

    // Additional safety filter: remove any chunks that don't match documentId if provided
    let filteredChunks = chunks;
    if (documentId) {
      const beforeFilter = filteredChunks.length;
      filteredChunks = filteredChunks.filter((c: any) => {
        const matches = c.document_id === documentId;
        if (!matches) {
          console.warn('🚫 Rejecting chunk - documentId mismatch:', {
            chunkId: c.id,
            chunkDocumentId: c.document_id,
            requestedDocumentId: documentId,
            chunkFilename: c.filename,
            match: matches
          });
        }
        return matches;
      });
      const afterFilter = filteredChunks.length;
      
      if (beforeFilter !== afterFilter) {
        console.error('❌ CRITICAL: Database returned chunks from wrong document!', {
          beforeFilter,
          afterFilter,
          removed: beforeFilter - afterFilter,
          requestedDocumentId: documentId,
          receivedDocumentIds: [...new Set(chunks.map((c: any) => c.document_id))]
        });
      }
      
      // If documentId was provided but no matching chunks found, return empty
      if (filteredChunks.length === 0 && beforeFilter > 0) {
        console.error('❌ No chunks matched the requested documentId:', {
          requestedDocumentId: documentId,
          receivedChunks: beforeFilter,
          receivedDocumentIds: [...new Set(chunks.map((c: any) => c.document_id))],
          receivedFilenames: [...new Set(chunks.map((c: any) => c.filename))]
        });
        return [];
      }
    }

    // Calculate similarities for the filtered results
    console.log('🔍 Calculating similarities:', {
      filteredChunksCount: filteredChunks.length,
      embeddingLength: embedding.length,
      topK
    });
    
    const matches = filteredChunks.map((chunk: any) => {
      const chunkEmbedding = chunk.embedding;
      
      console.log('🔍 Chunk embedding analysis:', {
        chunkId: chunk.id,
        chunkDocumentId: chunk.document_id,
        requestedDocumentId: documentId,
        matchesDocument: documentId ? chunk.document_id === documentId : 'N/A',
        hasEmbedding: !!chunkEmbedding,
        embeddingType: typeof chunkEmbedding,
        isArray: Array.isArray(chunkEmbedding),
        embeddingLength: chunkEmbedding?.length,
        embeddingPreview: JSON.stringify(chunkEmbedding).substring(0, 200) + '...',
        chunkTextPreview: chunk.chunk_text?.substring(0, 100) + '...'
      });
      
      if (!chunkEmbedding) {
        console.log('⚠️ Chunk has no embedding');
        return null;
      }
      
      // Try to parse embedding if it's a string
      let parsedEmbedding = chunkEmbedding;
      if (typeof chunkEmbedding === 'string') {
        try {
          parsedEmbedding = JSON.parse(chunkEmbedding);
          console.log('✅ Successfully parsed string embedding');
        } catch (e) {
          console.log('❌ Failed to parse string embedding:', e.message);
          return null;
        }
      }
      
      if (!Array.isArray(parsedEmbedding)) {
        console.log('⚠️ Chunk embedding is not an array after parsing');
        return null;
      }
      
      // Calculate cosine similarity
      let similarity = calculateCosineSimilarity(embedding, parsedEmbedding);
      
      // Ensure similarity is a valid number (not NaN or undefined)
      if (typeof similarity !== 'number' || isNaN(similarity)) {
        console.warn('⚠️ Invalid similarity value, defaulting to 0:', similarity);
        similarity = 0;
      }
      
      console.log('🔍 Similarity calculation:', {
        chunkId: chunk.id,
        similarity: similarity,
        queryEmbeddingLength: embedding.length,
        chunkEmbeddingLength: parsedEmbedding.length,
        chunkTextPreview: chunk.chunk_text?.substring(0, 100) + '...'
      });
      
      return {
        id: chunk.id,
        chunk_text: chunk.chunk_text,
        chunk_index: chunk.chunk_index,
        filename: chunk.filename,
        document_id: chunk.document_id,
        similarity: similarity,
        metadata: chunk.metadata
      };
    }).filter(Boolean).sort((a: any, b: any) => b.similarity - a.similarity).slice(0, topK);

    // Apply no similarity threshold to see all results
    const filteredMatches = matches;
    
    console.log('🔍 Similarity filtering:', {
      totalMatches: matches.length,
      filteredMatches: filteredMatches.length,
      similarities: matches.map((m: any) => m.similarity),
      threshold: 'none'
    });

    console.log('✅ Supabase query successful:', {
      matches: matches?.length || 0,
      filteredMatches: filteredMatches?.length || 0,
      withFilenameFilter: !!filename,
      withDocumentIdFilter: !!documentId,
      filters: { filename, documentId },
      firstMatch: filteredMatches?.[0] ? {
        filename: filteredMatches[0].filename,
        document_id: filteredMatches[0].document_id,
        similarity: filteredMatches[0].similarity,
        textPreview: filteredMatches[0].chunk_text?.substring(0, 100) + '...'
      } : null
    });

    return filteredMatches || [];

  } catch (error) {
    console.error('❌ Supabase query error:', error);
    throw error;
  }
}

// =============================================================================
// LLM Answer Generation
// =============================================================================

async function generateOpenAIAnswer(
  question: string,
  context: string,
  model: string,
  apiKey: string
): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that answers questions based on the provided document context. Be concise and accurate.'
        },
        {
          role: 'user',
          content: `Context from document:\n\n${context}\n\nQuestion: ${question}\n\nPlease answer the question based only on the provided context. If the answer is not in the context, say so.`
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function generateAnthropicAnswer(
  question: string,
  context: string,
  model: string,
  apiKey: string
): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: model || 'claude-3-5-haiku-20241022',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `Context from document:\n\n${context}\n\nQuestion: ${question}\n\nPlease answer the question based only on the provided context. If the answer is not in the context, say so.`
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

async function generateMistralAnswer(
  question: string,
  context: string,
  model: string,
  apiKey: string
): Promise<string> {
  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model || 'mistral-small-latest',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that answers questions based on the provided document context.'
        },
        {
          role: 'user',
          content: `Context:\n\n${context}\n\nQuestion: ${question}`
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    })
  });

  if (!response.ok) {
    throw new Error(`Mistral API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

function generateFallbackAnswer(question: string, context: string): string {
  return `Based on the document, here's what I found related to your question "${question}":\n\n${context.substring(0, 300)}...\n\n(Note: This is a simplified response. For better answers, please add an API key.)`;
}

async function generateAnswer(
  question: string,
  context: string,
  provider: string,
  model: string,
  apiKeys: Record<string, string>
): Promise<string> {
  try {
    switch (provider) {
      case 'openai':
        if (apiKeys.OPENAI_API_KEY) {
          return await generateOpenAIAnswer(question, context, model, apiKeys.OPENAI_API_KEY);
        }
        break;
      
      case 'anthropic':
        if (apiKeys.ANTHROPIC_API_KEY) {
          return await generateAnthropicAnswer(question, context, model, apiKeys.ANTHROPIC_API_KEY);
        }
        break;
      
      case 'mistral':
        if (apiKeys.MISTRAL_API_KEY) {
          return await generateMistralAnswer(question, context, model, apiKeys.MISTRAL_API_KEY);
        }
        break;
    }
    
    // Fallback
    return generateFallbackAnswer(question, context);
  } catch (error) {
    console.error('Error generating answer:', error);
    return generateFallbackAnswer(question, context);
  }
}

// =============================================================================
// Main Edge Function
// =============================================================================

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
    const {
      question,
      documentId,
      filename,
      model = 'gpt-4o-mini',
      provider = 'openai',
      topK = 5
    } = JSON.parse(requestText);

    // SECURITY: Validate input
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid required field: question' }),
        { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    }

    // SECURITY: Validate input length
    if (question.length > 10000) {
      return new Response(
        JSON.stringify({ error: 'Question too long (max 10000 characters)' }),
        { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    }


    // Get API keys from environment
    const apiKeys = {
      OPENAI_API_KEY: Deno.env.get('OPENAI_API_KEY') || '',
      MISTRAL_API_KEY: Deno.env.get('MISTRAL_API_KEY') || '',
      ANTHROPIC_API_KEY: Deno.env.get('ANTHROPIC_API_KEY') || ''
    };

    console.log(`🔍 RAG query: "${question}" (${provider}/${model})`);
    console.log('📋 Filters:', { filename, documentId, topK });
    console.log('🔑 API Keys status:', {
      openai: apiKeys.OPENAI_API_KEY ? 'present' : 'missing',
      mistral: apiKeys.MISTRAL_API_KEY ? 'present' : 'missing',
      anthropic: apiKeys.ANTHROPIC_API_KEY ? 'present' : 'missing'
    });

    // Step 1: Generate question embedding
    console.log('🧠 Generating question embedding...');
    const questionEmbedding = await generateQueryEmbedding(question, provider, apiKeys);
    console.log('✅ Generated question embedding, length:', questionEmbedding.length);

    // Step 2: Query Supabase for similar chunks
    console.log('🗄️ Querying Supabase pgvector...');
    let matches = await querySupabase(questionEmbedding, filename, documentId, topK);
    
    console.log('✅ Supabase search completed, found chunks:', matches.length);
    
    // Final verification: ensure all matches belong to the requested document
    if (documentId && matches.length > 0) {
      const mismatchedMatches = matches.filter((m: any) => m.document_id !== documentId);
      if (mismatchedMatches.length > 0) {
        console.error('❌ CRITICAL ERROR: Found matches from wrong document!', {
          requestedDocumentId: documentId,
          totalMatches: matches.length,
          mismatchedCount: mismatchedMatches.length,
          mismatchedDocumentIds: [...new Set(mismatchedMatches.map((m: any) => m.document_id))],
          allDocumentIds: [...new Set(matches.map((m: any) => m.document_id))]
        });
        
        // Filter out mismatched chunks
        const correctMatches = matches.filter((m: any) => m.document_id === documentId);
        if (correctMatches.length === 0) {
          console.error('❌ No correct matches found after filtering - returning empty');
          return new Response(
            JSON.stringify({
              answer: 'No relevant information found in the document to answer this question. The requested document was not found in the database.',
              sources: [],
              model,
              provider,
              warning: `Document ID ${documentId} was requested but chunks from other documents were found.`
            }),
            {
              headers: { ...headers, 'Content-Type': 'application/json' }
            }
          );
        }
        
        console.warn('⚠️ Using only correctly matched chunks:', {
          originalCount: matches.length,
          correctCount: correctMatches.length,
          removed: mismatchedMatches.length
        });
        matches = correctMatches;
      } else {
        console.log('✅ All matches verified - belong to requested document:', documentId);
      }
    }
    
    if (matches.length > 0) {
      console.log('📊 Top similarities:', matches.map((m: any) => m.similarity).slice(0, 3));
      console.log('📋 Match document IDs:', [...new Set(matches.map((m: any) => m.document_id))]);
    } else {
      console.log('⚠️ No chunks found - check filename filter:', filename);
    }

    if (matches.length === 0) {
      console.error('❌ No matches found after similarity calculation:', {
        questionLength: question.length,
        questionPreview: question.substring(0, 100),
        embeddingGenerated: !!questionEmbedding,
        embeddingLength: questionEmbedding?.length || 0,
        matchesFound: matches.length,
        documentId,
        filename,
        filtersApplied: !!(documentId || filename),
        topK,
        suggestion: documentId 
          ? 'Document may not exist or may not have been processed. Check if embeddings were generated successfully.'
          : 'Try selecting a specific document instead of "All Documents".'
      });
      
      return new Response(
        JSON.stringify({
          answer: 'No relevant information found in the document to answer this question. Try asking a different question or check if the document was processed correctly.',
          sources: [],
          model,
          provider,
          debug: {
            filename,
            documentId,
            supabaseMatches: 0,
            questionLength: question.length,
            embeddingGenerated: !!questionEmbedding,
            embeddingLength: questionEmbedding?.length || 0,
            suggestion: documentId 
              ? 'Document may not exist or may not have been processed. Check if embeddings were generated successfully.'
              : 'Try selecting a specific document instead of "All Documents".'
          }
        }),
        {
          headers: { ...headers, 'Content-Type': 'application/json' }
        }
      );
    }

    // Helper function to decode base64 if needed
    const decodeIfBase64 = (text: string): string => {
      if (!text || text.length === 0) return text;
      
      // Check if text looks like base64 (long string with base64 characters, no spaces)
      if (text.length > 50 && !text.includes(' ') && !text.includes('\n')) {
        try {
          // Try to decode
          const decoded = atob(text);
          // If decoded result is shorter and contains readable characters, use it
          if (decoded.length > 0 && decoded.length < text.length && /[\x20-\x7E]/.test(decoded)) {
            return decoded;
          }
        } catch (e) {
          // Not valid base64, return original
        }
      }
      return text;
    };

    // Step 3: Prepare context from retrieved chunks
    const context = matches
      .map((match: any) => decodeIfBase64(match.chunk_text || ''))
      .filter(text => text.length > 0)
      .join('\n\n---\n\n');

    console.log(`✅ Prepared context from ${matches.length} chunks (${context.length} chars)`);

    // Step 4: Generate answer with LLM
    const answer = await generateAnswer(question, context, provider, model, apiKeys);
    console.log('✅ Generated answer');

    // Step 5: Prepare sources
    const sources = matches.map((match: any) => {
      const chunkText = match.chunk_text || '';
      const decodedText = decodeIfBase64(chunkText);
      
      return {
        text: decodedText,
        score: typeof match.similarity === 'number' && !isNaN(match.similarity) ? match.similarity : 0,
        chunkIndex: match.chunk_index,
        filename: match.filename
      };
    });

    // Step 6: Store session in Supabase (optional)
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (supabaseUrl && serviceRoleKey) {
      const supabase = createClient(supabaseUrl, serviceRoleKey);
      await supabase.from('rag_sessions').insert({
        question,
        answer,
        document_id: documentId || null,
        filename: filename || null,
        sources: JSON.stringify(sources),
        model,
        provider
      });
    }

    // Check if we have a warning about using different document
    const warning = matches.warning || null;
    
    // Collect diagnostic information
    const debugInfo = {
      requestedDocumentId: documentId,
      requestedFilename: filename,
      retrievedChunks: matches.length,
      actualDocumentIds: [...new Set(matches.map((m: any) => m.document_id))],
      actualFilenames: [...new Set(matches.map((m: any) => m.filename))],
      documentIdMatch: documentId && matches.length > 0 
        ? matches.every((m: any) => m.document_id === documentId)
        : 'N/A (no documentId or no chunks)'
    };
    
    // Log diagnostic info
    console.log('📊 FINAL DIAGNOSTIC:', debugInfo);
    
    // If documentId was requested but chunks are from different documents, add warning
    let diagnosticWarning = null;
    if (documentId && matches.length > 0) {
      const mismatched = matches.filter((m: any) => m.document_id !== documentId);
      if (mismatched.length > 0) {
        diagnosticWarning = `⚠️ WARNING: Requested document ${documentId} but ${mismatched.length} chunks are from other documents (IDs: ${[...new Set(mismatched.map((m: any) => m.document_id))].join(', ')})`;
        console.error('🚨 DIAGNOSTIC WARNING:', diagnosticWarning);
      }
    }
    
    // SECURITY: Don't expose debug info in production
    const isProduction = Deno.env.get('ENVIRONMENT') === 'production';
    
    return new Response(
      JSON.stringify({
        answer: warning ? `${warning}\n\n${answer}` : answer,
        sources,
        model,
        provider,
        retrievedChunks: matches.length,
        warning: warning || diagnosticWarning || undefined,
        ...(isProduction ? {} : { debug: debugInfo })
      }),
      {
        headers: { ...headers, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('❌ Error in rag-query function:', error);
    
    // SECURITY: Don't expose stack traces in production
    const isProduction = Deno.env.get('ENVIRONMENT') === 'production';
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to process RAG query',
        ...(isProduction ? {} : { details: error.toString() })
      }),
      {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' }
      }
    );
  }
});