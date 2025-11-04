/**
 * Supabase Edge Function: Vision RAG Query with PageIndex
 * 
 * Performs vision-based RAG query using PageIndex tree structure and VLM
 * This is a prototype implementation for testing PageIndex integration
 * 
 * Input: { question: string, documentId: string, vlmModel?: string, filename?: string }
 * Output: { answer: string, reasoning?: string, retrievedNodes: Array, sources: Array, model: string }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// =============================================================================
// Types & Interfaces
// =============================================================================

interface PageIndexNode {
  node_id: string;
  title: string;
  page_index: number;
  summary?: string;
  prefix_summary?: string;
  nodes?: PageIndexNode[];
  start_index?: number;
  end_index?: number;
}

interface VisionRAGRequest {
  question: string;
  documentId: string;
  filename?: string;
  vlmModel?: string; // 'gpt-4o', 'gpt-4.1', 'claude-3.5-sonnet'
}

interface VisionRAGResponse {
  answer: string;
  reasoning?: string;
  retrievedNodes: Array<{
    nodeId: string;
    title: string;
    pageRange: string;
  }>;
  sources: Array<{
    nodeId: string;
    title: string;
    pageRange: string;
    summary?: string;
  }>;
  model: string;
  processingTime: number;
}

// =============================================================================
// PageIndex Client
// =============================================================================

class PageIndexClient {
  private apiKey: string;
  private baseUrl: string = 'https://api.pageindex.ai/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getTree(docId: string): Promise<{ result: PageIndexNode[] }> {
    const response = await fetch(`${this.baseUrl}/documents/${docId}/tree`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`PageIndex API error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  }

  async isRetrievalReady(docId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/documents/${docId}/status`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        }
      });

      if (!response.ok) return false;
      const data = await response.json();
      return data.status === 'ready' || data.status === 'completed';
    } catch {
      return false;
    }
  }
}

// =============================================================================
// VLM Integration
// =============================================================================

async function callVLM(
  prompt: string,
  images: string[] = [],
  model: string = 'gpt-4o',
  apiKey: string
): Promise<string> {
  const content: any[] = [{ type: 'text', text: prompt }];

  // Add images as base64 data URLs
  for (const imageBase64 of images) {
    content.push({
      type: 'image_url',
      image_url: {
        url: `data:image/jpeg;base64,${imageBase64}`
      }
    });
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model === 'gpt-4.1' ? 'gpt-4o' : model, // Use available model
      messages: [{
        role: 'user',
        content
      }],
      temperature: 0
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

async function retrieveNodesWithVLM(
  question: string,
  tree: PageIndexNode[],
  vlmModel: string,
  apiKey: string
): Promise<{ node_list: string[]; thinking: string }> {
  // Create simplified tree without text fields
  const treeWithoutText = tree.map(node => removeTextFields(node));

  const searchPrompt = `
You are given a question and a tree structure of a document.
Each node contains a node id, node title, and a corresponding summary.
Your task is to find all tree nodes that are likely to contain the answer to the question.

Question: ${question}

Document tree structure:
${JSON.stringify(treeWithoutText, null, 2)}

Please reply in the following JSON format:
{
    "thinking": "<Your thinking process on which nodes are relevant to the question>",
    "node_list": ["node_id_1", "node_id_2", ..., "node_id_n"]
}
Directly return the final JSON structure. Do not output anything else.
  `;

  const response = await callVLM(searchPrompt, [], vlmModel, apiKey);
  
  try {
    // Extract JSON from response (might have markdown code blocks)
    let jsonStr = response;
    if (jsonStr.includes('```json')) {
      jsonStr = jsonStr.split('```json')[1].split('```')[0].trim();
    } else if (jsonStr.includes('```')) {
      jsonStr = jsonStr.split('```')[1].split('```')[0].trim();
    }
    
    const result = JSON.parse(jsonStr);
    return {
      node_list: result.node_list || [],
      thinking: result.thinking || ''
    };
  } catch (error) {
    console.error('Failed to parse VLM response:', response);
    throw new Error(`Failed to parse retrieval result: ${error.message}`);
  }
}

function removeTextFields(node: PageIndexNode): Partial<PageIndexNode> {
  const { nodes, ...rest } = node;
  const cleaned: any = { ...rest };
  delete cleaned.text;
  
  if (nodes) {
    cleaned.nodes = nodes.map(n => removeTextFields(n));
  }
  
  return cleaned;
}

// =============================================================================
// Node Mapping & Page Extraction
// =============================================================================

function createNodeMapping(
  tree: PageIndexNode[]
): Map<string, { start_index: number; end_index: number; node: PageIndexNode }> {
  const nodeMap = new Map();

  function traverse(nodes: PageIndexNode[], startPage: number = 1) {
    for (const node of nodes) {
      const endPage = node.end_index || node.page_index || startPage;
      const startIdx = node.start_index || node.page_index || startPage;
      
      nodeMap.set(node.node_id, {
        start_index: startIdx,
        end_index: endPage,
        node
      });

      if (node.nodes && node.nodes.length > 0) {
        traverse(node.nodes, startIdx);
      }
    }
  }

  traverse(tree, 1);
  return nodeMap;
}

function findNodeById(nodes: PageIndexNode[], nodeId: string): PageIndexNode | null {
  for (const node of nodes) {
    if (node.node_id === nodeId) return node;
    if (node.nodes) {
      const found = findNodeById(node.nodes, nodeId);
      if (found) return found;
    }
  }
  return null;
}

// =============================================================================
// PDF Page Image Extraction (Placeholder - requires external service)
// =============================================================================

async function extractPdfPageImages(
  supabase: any,
  documentId: string,
  pageNumbers: number[]
): Promise<Map<number, string>> {
  // TODO: Implement actual PDF page extraction
  // Options:
  // 1. Use PyMuPDF via external service
  // 2. Use pdf2pic service
  // 3. Extract pages client-side and pass as base64
  
  console.log(`⚠️  PDF page extraction not yet implemented`);
  console.log(`   Pages needed: ${pageNumbers.join(', ')}`);
  
  // Placeholder - return empty map
  // In production, implement actual extraction
  return new Map();
}

// =============================================================================
// Main Edge Function
// =============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Parse request
    const request: VisionRAGRequest = await req.json();
    const { question, documentId, filename, vlmModel = 'gpt-4o' } = request;

    if (!question || !documentId) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: question, documentId' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`🔍 Vision RAG query: ${question.substring(0, 50)}...`);

    // Get API keys
    // Fallback to default key if not set (for testing)
    const pageIndexKey = Deno.env.get('PAGEINDEX_API_KEY') || '7535a44ab7c34d6c978009fd571c0bac';
    const openaiKey = Deno.env.get('OPENAI_API_KEY');

    if (!pageIndexKey) {
      return new Response(
        JSON.stringify({ 
          error: 'PAGEINDEX_API_KEY not configured. Get your key from https://dash.pageindex.ai/api-keys' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!openaiKey) {
      return new Response(
        JSON.stringify({ 
          error: 'OPENAI_API_KEY not configured' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get PageIndex document ID from mapping table
    const { data: mapping, error: mappingError } = await supabase
      .from('pageindex_documents')
      .select('pageindex_doc_id, status')
      .eq('document_id', documentId)
      .single();

    if (mappingError || !mapping) {
      return new Response(
        JSON.stringify({ 
          error: 'Document not found in PageIndex. Please submit the document to PageIndex first.',
          suggestion: 'The document needs to be indexed by PageIndex before Vision RAG queries can be performed.'
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (mapping.status !== 'ready') {
      return new Response(
        JSON.stringify({ 
          error: 'Document is still being processed by PageIndex',
          status: mapping.status,
          suggestion: 'Please wait for the document to finish indexing. This usually takes 10-30 seconds.'
        }),
        { 
          status: 503, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize PageIndex client
    const piClient = new PageIndexClient(pageIndexKey);
    const docId = mapping.pageindex_doc_id;
    
    const isReady = await piClient.isRetrievalReady(docId);
    if (!isReady) {
      return new Response(
        JSON.stringify({ 
          error: 'Document tree not ready yet. Please wait a moment and try again.',
          suggestion: 'The document may still be processing in PageIndex. Wait 10-30 seconds and retry.'
        }),
        { 
          status: 503, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get tree structure
    console.log(`🌳 Fetching PageIndex tree for doc: ${docId}`);
    const treeResult = await piClient.getTree(docId);
    const tree = treeResult.result;

    // Perform reasoning-based retrieval
    console.log(`🧠 Performing reasoning-based retrieval...`);
    const retrievalResult = await retrieveNodesWithVLM(
      question,
      tree,
      vlmModel,
      openaiKey
    );

    // Create node mapping
    const nodeMap = createNodeMapping(tree);

    // Get page numbers for retrieved nodes
    const pageNumbers: number[] = [];
    const retrievedNodes = retrievalResult.node_list.map(nodeId => {
      const nodeInfo = nodeMap.get(nodeId);
      if (!nodeInfo) {
        const node = findNodeById(tree, nodeId);
        return {
          nodeId,
          title: node?.title || 'Unknown',
          pageRange: 'Unknown',
          summary: node?.summary
        };
      }

      const pageRange = nodeInfo.start_index === nodeInfo.end_index
        ? `${nodeInfo.start_index}`
        : `${nodeInfo.start_index}-${nodeInfo.end_index}`;

      // Collect page numbers
      for (let p = nodeInfo.start_index; p <= nodeInfo.end_index; p++) {
        if (!pageNumbers.includes(p)) {
          pageNumbers.push(p);
        }
      }

      return {
        nodeId,
        title: nodeInfo.node.title,
        pageRange,
        summary: nodeInfo.node.summary
      };
    });

    // Extract PDF page images
    // TODO: Implement actual extraction
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const pageImages = await extractPdfPageImages(supabase, documentId, pageNumbers);

    // Generate answer using VLM
    // For now, use tree summaries if page images not available
    let answer: string;
    if (pageImages.size > 0) {
      const imageBase64s = Array.from(pageImages.values());
      const answerPrompt = `
Answer the question based on the images of the document pages as context.

Question: ${question}

Provide a clear, concise answer based only on the context provided in the images.
      `;
      answer = await callVLM(answerPrompt, imageBase64s, vlmModel, openaiKey);
    } else {
      // Fallback: Use tree summaries as context
      const summaries = retrievedNodes
        .map(n => {
          const node = findNodeById(tree, n.nodeId);
          return node?.summary || node?.prefix_summary || '';
        })
        .filter(s => s.length > 0)
        .join('\n\n');

      const answerPrompt = `
Answer the question based on the following document summaries:

Question: ${question}

Document Summaries:
${summaries}

Provide a clear, concise answer based only on the provided context.
      `;
      answer = await callVLM(answerPrompt, [], vlmModel, openaiKey);
    }

    const processingTime = Date.now() - startTime;

    const response: VisionRAGResponse = {
      answer,
      reasoning: retrievalResult.thinking,
      retrievedNodes,
      sources: retrievedNodes,
      model: vlmModel,
      processingTime
    };

    console.log(`✅ Vision RAG query completed in ${processingTime}ms`);

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Vision RAG error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.stack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

