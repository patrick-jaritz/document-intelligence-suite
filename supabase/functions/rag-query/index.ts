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
// Supabase pgvector Integration
// =============================================================================

async function querySupabase(
  embedding: number[],
  filename?: string,
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
    // First try with filename filter if provided
    let query = supabase
      .from('document_chunks')
      .select('*')
      .limit(topK);

    if (filename) {
      query = query.eq('filename', filename);
    }

    // Use the match_document_chunks RPC function for vector similarity
    // Note: The function expects query_embedding as a TEXT (JSON string)
    const { data: matches, error } = await supabase.rpc('match_document_chunks', {
      query_embedding: JSON.stringify(embedding),
      match_threshold: 0.1, // Very low threshold for better semantic matching
      match_count: topK,
      filter_document_id: null,
      filter_filename: filename || null
    });

    if (error) {
      console.error('❌ RPC function error:', error);
      throw new Error(`Supabase RPC error: ${error.message}`);
    }

    console.log('✅ Supabase query successful:', {
      matches: matches?.length || 0,
      withFilenameFilter: !!filename,
      firstMatch: matches?.[0] ? {
        filename: matches[0].filename,
        similarity: matches[0].similarity,
        textPreview: matches[0].chunk_text?.substring(0, 100) + '...'
      } : null
    });

    // If no results with filename filter, try without filter (search all documents)
    if ((!matches || matches.length === 0) && filename) {
      console.log('🔄 No results with filename filter, trying without filter...');
      
      const { data: allMatches, error: allError } = await supabase.rpc('match_document_chunks', {
        query_embedding: JSON.stringify(embedding),
        match_threshold: 0.1, // Very low threshold for better semantic matching
        match_count: topK,
        filter_document_id: null,
        filter_filename: null // No filter - search all documents
      });

      if (allError) {
        console.error('❌ RPC function error (no filter):', allError);
        throw new Error(`Supabase RPC error (no filter): ${allError.message}`);
      }

      if (allMatches && allMatches.length > 0) {
        console.log('✅ Found results without filename filter:', {
          matches: allMatches.length,
          foundFilenames: [...new Set(allMatches.map((m: any) => m.filename))],
          requestedFilename: filename
        });
        
        // Add a warning to the response that we're using a different document
        const foundFilenames = [...new Set(allMatches.map((m: any) => m.filename))];
        if (foundFilenames.length > 0 && !foundFilenames.includes(filename)) {
          console.log('⚠️ WARNING: Using content from different document:', foundFilenames[0]);
          // We'll add this warning to the final response
          allMatches.warning = `Note: The requested document "${filename}" was not found. Showing results from "${foundFilenames[0]}" instead.`;
        }
        
        return allMatches;
      }
    }

    return matches || [];

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
  try {
    // CORS headers
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
        },
      });
    }

    // Parse request
    const {
      question,
      documentId,
      filename,
      model = 'gpt-4o-mini',
      provider = 'openai',
      topK = 5
    } = await req.json();

    if (!question) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: question' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get API keys from environment
    const apiKeys = {
      OPENAI_API_KEY: Deno.env.get('OPENAI_API_KEY') || '',
      MISTRAL_API_KEY: Deno.env.get('MISTRAL_API_KEY') || '',
      ANTHROPIC_API_KEY: Deno.env.get('ANTHROPIC_API_KEY') || ''
    };

    console.log(`🔍 RAG query: "${question}" (${provider}/${model})`);
    console.log('📋 Filters:', { filename, topK });
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
    const matches = await querySupabase(questionEmbedding, filename, topK);
    
    console.log('✅ Supabase search completed, found chunks:', matches.length);
    
    if (matches.length > 0) {
      console.log('📊 Top similarities:', matches.map(m => m.similarity).slice(0, 3));
    } else {
      console.log('⚠️ No chunks found - check filename filter:', filename);
    }

    if (matches.length === 0) {
      return new Response(
        JSON.stringify({
          answer: 'No relevant information found in the document to answer this question. Try asking a different question or check if the document was processed correctly.',
          sources: [],
          model,
          provider,
          debug: {
            filename,
            supabaseMatches: 0
          }
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    // Step 3: Prepare context from retrieved chunks
    const context = matches
      .map((match: any) => match.chunk_text || '')
      .filter(text => text.length > 0)
      .join('\n\n---\n\n');

    console.log(`✅ Prepared context from ${matches.length} chunks (${context.length} chars)`);

    // Step 4: Generate answer with LLM
    const answer = await generateAnswer(question, context, provider, model, apiKeys);
    console.log('✅ Generated answer');

    // Step 5: Prepare sources
    const sources = matches.map((match: any) => ({
      text: match.chunk_text || '',
      score: match.similarity,
      chunkIndex: match.chunk_index,
      filename: match.filename
    }));

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
    
    return new Response(
      JSON.stringify({
        answer: warning ? `${warning}\n\n${answer}` : answer,
        sources,
        model,
        provider,
        retrievedChunks: matches.length,
        warning: warning || undefined
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );

  } catch (error: any) {
    console.error('❌ Error in rag-query function:', error);
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to process RAG query',
        details: error.toString()
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
});