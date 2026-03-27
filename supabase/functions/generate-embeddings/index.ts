/**
 * Supabase Edge Function: Generate Embeddings
 * 
 * Generates vector embeddings for document chunks and stores them in pgvector
 * 
 * Input: { text: string, documentId?: string, filename: string, provider?: string }
 * Output: { success: boolean, chunkCount: number, documentId: string }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// =============================================================================
// Text Chunking Utility
// =============================================================================

interface Chunk {
  text: string;
  index: number;
  offset: number;
}

function chunkText(
  text: string,
  chunkSize: number = 1000,
  chunkOverlap: number = 200
): Chunk[] {
  const chunks: Chunk[] = [];
  let index = 0;
  let offset = 0;

  while (offset < text.length) {
    const end = Math.min(offset + chunkSize, text.length);
    const chunkText = text.slice(offset, end);
    
    chunks.push({
      text: chunkText,
      index,
      offset
    });
    
    index++;
    offset += chunkSize - chunkOverlap;
  }

  return chunks;
}

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
    const { text, documentId, filename, sourceUrl, provider = 'openai' } = await req.json();

    if (!text || !filename) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: text, filename' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get API keys from environment
    const apiKeys = {
      OPENAI_API_KEY: Deno.env.get('OPENAI_API_KEY') || '',
      MISTRAL_API_KEY: Deno.env.get('MISTRAL_API_KEY') || '',
      ANTHROPIC_API_KEY: Deno.env.get('ANTHROPIC_API_KEY') || ''
    };

    console.log(`Generating embeddings for ${filename} using ${provider}`);

    // Chunk the text
    const chunks = chunkText(text, 1000, 200);
    console.log(`Created ${chunks.length} chunks`);

    // Generate embeddings for each chunk
    const embeddings = await Promise.all(
      chunks.map(chunk => generateEmbedding(chunk.text, provider, apiKeys))
    );
    console.log(`Generated ${embeddings.length} embeddings`);

    // Store in Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Prepare data for insertion
    const embeddingsData = chunks.map((chunk, i) => ({
      document_id: documentId || null,
      filename,
      chunk_text: chunk.text,
      chunk_index: chunk.index,
      chunk_offset: chunk.offset,
      embedding: JSON.stringify(embeddings[i]), // pgvector expects JSON string
      metadata: {
        offset: chunk.offset,
        length: chunk.text.length,
        provider: provider
      }
    }));

    console.log(`Inserting ${embeddingsData.length} chunks into document_chunks table...`);

    // Insert into database (correct table name)
    const { error: insertError } = await supabase
      .from('document_chunks')
      .insert(embeddingsData);

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw insertError;
    }

    console.log(`✓ Stored ${embeddingsData.length} chunks in database`);

    return new Response(
      JSON.stringify({
        success: true,
        chunkCount: chunks.length,
        documentId: documentId || 'no-id',
        filename,
        provider
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );

  } catch (error: any) {
    console.error('Error in generate-embeddings function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to generate embeddings',
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

