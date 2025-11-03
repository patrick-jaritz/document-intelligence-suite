/**
 * PageIndex Vision RAG Implementation Example
 * 
 * This is a proof-of-concept implementation showing how to integrate
 * PageIndex Vision RAG into the existing Document Intelligence Suite.
 * 
 * Key Components:
 * 1. PageIndex tree generation
 * 2. Reasoning-based retrieval
 * 3. PDF page image extraction
 * 4. VLM answer generation
 */

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
  vlmModel?: string; // 'gpt-4.1', 'gpt-4o', 'claude-3.5-sonnet'
  maxPages?: number;
}

interface VisionRAGResponse {
  answer: string;
  reasoning?: string;
  retrievedNodes: Array<{
    nodeId: string;
    title: string;
    pageRange: string;
  }>;
  pageImages: number[]; // Page numbers retrieved
  model: string;
  processingTime: number;
}

// =============================================================================
// PageIndex Client Setup
// =============================================================================

class PageIndexClient {
  private apiKey: string;
  private baseUrl: string = 'https://api.pageindex.ai';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async submitDocument(pdfPath: string): Promise<{ doc_id: string }> {
    // Submit PDF to PageIndex for tree generation
    const formData = new FormData();
    const file = await Deno.readFile(pdfPath);
    formData.append('file', new Blob([file]), 'document.pdf');

    const response = await fetch(`${this.baseUrl}/documents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`PageIndex API error: ${response.statusText}`);
    }

    return await response.json();
  }

  async getTree(docId: string): Promise<{ result: PageIndexNode }> {
    const response = await fetch(`${this.baseUrl}/documents/${docId}/tree`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get tree: ${response.statusText}`);
    }

    return await response.json();
  }

  async isRetrievalReady(docId: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/documents/${docId}/status`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    const data = await response.json();
    return data.status === 'ready';
  }
}

// =============================================================================
// PDF Page Image Extraction
// =============================================================================

/**
 * Extract PDF pages as images using PyMuPDF (fitz)
 * This would typically be done via an external service or library
 */
async function extractPdfPageImages(
  pdfBuffer: ArrayBuffer,
  pageNumbers: number[],
  outputDir?: string
): Promise<Map<number, string>> {
  // In a real implementation, you would:
  // 1. Use PyMuPDF (fitz) via Python service or Deno binding
  // 2. Convert PDF pages to JPEG images
  // 3. Store images temporarily or return as base64
  
  // Example: Using external service or Deno subprocess
  const pageImages = new Map<number, string>();
  
  // For now, this is a placeholder that would call an external service
  // In production, you'd use something like:
  // - PyMuPDF via Python service
  // - pdf2pic via Node.js service
  // - Client-side extraction with PDF.js
  
  return pageImages;
}

/**
 * Get page images for retrieved tree nodes
 */
function getPageImagesForNodes(
  nodeList: string[],
  nodeMap: Map<string, { start_index: number; end_index: number }>,
  pageImages: Map<number, string>
): string[] {
  const imagePaths: string[] = [];
  const seenPages = new Set<number>();

  for (const nodeId of nodeList) {
    const nodeInfo = nodeMap.get(nodeId);
    if (!nodeInfo) continue;

    for (let pageNum = nodeInfo.start_index; pageNum <= nodeInfo.end_index; pageNum++) {
      if (!seenPages.has(pageNum)) {
        const imagePath = pageImages.get(pageNum);
        if (imagePath) {
          imagePaths.push(imagePath);
          seenPages.add(pageNum);
        }
      }
    }
  }

  return imagePaths;
}

// =============================================================================
// Reasoning-Based Retrieval
// =============================================================================

/**
 * Use VLM to perform reasoning-based retrieval over tree structure
 */
async function retrieveNodesWithVLM(
  question: string,
  tree: PageIndexNode,
  vlmModel: string = 'gpt-4.1'
): Promise<{ node_list: string[]; thinking: string }> {
  // Create tree without full text (only summaries)
  const treeWithoutText = removeTextFields(tree);

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

  const response = await callVLM(searchPrompt, [], vlmModel);
  const result = JSON.parse(response);

  return {
    node_list: result.node_list || [],
    thinking: result.thinking || ''
  };
}

function removeTextFields(node: PageIndexNode): Partial<PageIndexNode> {
  const { nodes, ...rest } = node;
  const cleaned: Partial<PageIndexNode> = {
    ...rest,
    text: undefined // Remove text field
  };

  if (nodes) {
    cleaned.nodes = nodes.map(n => removeTextFields(n) as PageIndexNode);
  }

  return cleaned;
}

/**
 * Create node mapping with page ranges
 */
function createNodeMapping(
  tree: PageIndexNode,
  maxPage: number
): Map<string, { start_index: number; end_index: number; node: PageIndexNode }> {
  const nodeMap = new Map();

  function traverse(node: PageIndexNode, startPage: number = 1) {
    const endPage = node.end_index || node.page_index || startPage;
    
    nodeMap.set(node.node_id, {
      start_index: startPage,
      end_index: endPage,
      node
    });

    if (node.nodes) {
      let currentStart = startPage;
      for (const child of node.nodes) {
        traverse(child, currentStart);
        currentStart = (child.end_index || child.page_index || currentStart) + 1;
      }
    }
  }

  traverse(tree, 1);
  return nodeMap;
}

// =============================================================================
// VLM Integration
// =============================================================================

/**
 * Call Vision-Language Model with text and images
 */
async function callVLM(
  prompt: string,
  imagePaths: string[],
  model: string = 'gpt-4.1'
): Promise<string> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const content: any[] = [{ type: 'text', text: prompt }];

  // Add images as base64 data URLs
  for (const imagePath of imagePaths) {
    // Read image file and convert to base64
    const imageData = await Deno.readFile(imagePath);
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageData)));
    
    content.push({
      type: 'image_url',
      image_url: {
        url: `data:image/jpeg;base64,${base64Image}`
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
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

/**
 * Generate answer using VLM with retrieved page images
 */
async function generateAnswerWithVLM(
  question: string,
  pageImages: string[],
  vlmModel: string = 'gpt-4.1'
): Promise<string> {
  const answerPrompt = `
Answer the question based on the images of the document pages as context.

Question: ${question}

Provide a clear, concise answer based only on the context provided in the images.
  `;

  return await callVLM(answerPrompt, pageImages, vlmModel);
}

// =============================================================================
// Main Vision RAG Function
// =============================================================================

/**
 * Supabase Edge Function: Vision RAG Query
 * 
 * This would be the main entry point for the Edge Function
 */
export async function visionRAGQuery(
  request: VisionRAGRequest
): Promise<VisionRAGResponse> {
  const startTime = Date.now();

  try {
    // 1. Initialize PageIndex client
    const pageIndexKey = Deno.env.get('PAGEINDEX_API_KEY');
    if (!pageIndexKey) {
      throw new Error('PAGEINDEX_API_KEY not configured');
    }

    const piClient = new PageIndexClient(pageIndexKey);

    // 2. Get or create PageIndex tree for document
    // In production, you'd store doc_id mapping in database
    let docId = request.documentId; // Assuming documentId maps to PageIndex doc_id

    // Check if retrieval is ready
    if (!(await piClient.isRetrievalReady(docId))) {
      throw new Error('Document tree not ready yet. Please try again in a moment.');
    }

    // 3. Get tree structure
    const treeResult = await piClient.getTree(docId);
    const tree = treeResult.result;

    // 4. Perform reasoning-based retrieval
    const retrievalResult = await retrieveNodesWithVLM(
      request.question,
      tree,
      request.vlmModel
    );

    // 5. Create node mapping for page ranges
    const nodeMap = createNodeMapping(tree, 100); // maxPage estimate

    // 6. Extract PDF page images for retrieved nodes
    // In production, you'd get PDF from storage
    const pdfBuffer = await getPdfFromStorage(request.documentId);
    const allPageImages = await extractPdfPageImages(
      pdfBuffer,
      Array.from({ length: 100 }, (_, i) => i + 1)
    );

    // 7. Get page images for retrieved nodes
    const retrievedPageImages = getPageImagesForNodes(
      retrievalResult.node_list,
      nodeMap,
      allPageImages
    );

    // 8. Generate answer using VLM
    const answer = await generateAnswerWithVLM(
      request.question,
      retrievedPageImages,
      request.vlmModel
    );

    // 9. Format response
    const retrievedNodes = retrievalResult.node_list.map(nodeId => {
      const nodeInfo = nodeMap.get(nodeId);
      if (!nodeInfo) return null;
      
      const pageRange = nodeInfo.start_index === nodeInfo.end_index
        ? `${nodeInfo.start_index}`
        : `${nodeInfo.start_index}-${nodeInfo.end_index}`;
      
      return {
        nodeId,
        title: nodeInfo.node.title,
        pageRange
      };
    }).filter(Boolean) as Array<{ nodeId: string; title: string; pageRange: string }>;

    const processingTime = Date.now() - startTime;

    return {
      answer,
      reasoning: retrievalResult.thinking,
      retrievedNodes,
      pageImages: retrievedNodes.map(n => parseInt(n.pageRange.split('-')[0])),
      model: request.vlmModel || 'gpt-4.1',
      processingTime
    };

  } catch (error) {
    console.error('Vision RAG error:', error);
    throw error;
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

async function getPdfFromStorage(documentId: string): Promise<ArrayBuffer> {
  // Get PDF from Supabase Storage
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Assuming documents are stored in storage bucket
  // This is a placeholder - implement based on your storage structure
  const { data, error } = await supabase.storage
    .from('documents')
    .download(`${documentId}.pdf`);

  if (error) throw error;
  return await data.arrayBuffer();
}

// =============================================================================
// Example Usage in Supabase Edge Function
// =============================================================================

/*
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const request: VisionRAGRequest = await req.json();
    const result = await visionRAGQuery(request);

    return new Response(JSON.stringify(result), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
*/

