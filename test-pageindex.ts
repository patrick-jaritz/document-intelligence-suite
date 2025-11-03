#!/usr/bin/env deno run --allow-net --allow-read --allow-env

/**
 * PageIndex Vision RAG Test Script
 * 
 * This script tests PageIndex integration with sample documents
 * Run with: deno run --allow-net --allow-read --allow-env test-pageindex.ts
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// =============================================================================
// Configuration
// =============================================================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://joqnpibrfzqflyogrkht.supabase.co';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
const PAGEINDEX_API_KEY = Deno.env.get('PAGEINDEX_API_KEY') || '7535a44ab7c34d6c978009fd571c0bac';
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || '';

// =============================================================================
// PageIndex Client (Simplified)
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

class PageIndexClient {
  private apiKey: string;
  private baseUrl: string = 'https://api.pageindex.ai/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async submitDocument(pdfPath: string): Promise<{ doc_id: string }> {
    console.log(`📄 Submitting document: ${pdfPath}`);
    
    try {
      const fileContent = await Deno.readFile(pdfPath);
      const formData = new FormData();
      formData.append('file', new Blob([fileContent]), pdfPath.split('/').pop());

      const response = await fetch(`${this.baseUrl}/documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`PageIndex API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log(`✅ Document submitted. Doc ID: ${result.doc_id}`);
      return result;
    } catch (error) {
      console.error(`❌ Failed to submit document:`, error);
      throw error;
    }
  }

  async getTree(docId: string): Promise<{ result: PageIndexNode[] }> {
    console.log(`🌳 Fetching tree for doc: ${docId}`);
    
    const response = await fetch(`${this.baseUrl}/documents/${docId}/tree`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get tree: ${response.statusText}`);
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

  async waitForReady(docId: string, maxWait: number = 60000): Promise<boolean> {
    const startTime = Date.now();
    const checkInterval = 3000; // Check every 3 seconds

    console.log(`⏳ Waiting for document processing...`);

    while (Date.now() - startTime < maxWait) {
      if (await this.isRetrievalReady(docId)) {
        console.log(`✅ Document ready for retrieval!`);
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      process.stdout.write('.');
    }

    console.log(`\n⚠️ Timeout waiting for document to be ready`);
    return false;
  }
}

// =============================================================================
// VLM Integration for Retrieval
// =============================================================================

async function callVLM(
  prompt: string,
  images: string[] = [],
  model: string = 'gpt-4o'
): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const content: any[] = [{ type: 'text', text: prompt }];

  // Add images if provided
  for (const imageBase64 of images) {
    content.push({
      type: 'image_url',
      image_url: {
        url: `data:image/jpeg;base64,${imageBase64}`
      }
    });
  }

  console.log(`🤖 Calling VLM (${model})...`);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: model,
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
  vlmModel: string = 'gpt-4o'
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

  const response = await callVLM(searchPrompt, [], vlmModel);
  
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
  
  // Remove text field if it exists
  delete cleaned.text;
  
  if (nodes) {
    cleaned.nodes = nodes.map(n => removeTextFields(n));
  }
  
  return cleaned;
}

// =============================================================================
// PDF Page Extraction (Placeholder)
// =============================================================================

/**
 * Extract PDF pages as base64 images
 * In production, this would use PyMuPDF or similar
 */
async function extractPdfPages(pdfPath: string): Promise<Map<number, string>> {
  console.log(`📸 Extracting PDF pages from: ${pdfPath}`);
  console.log(`⚠️  Note: Full PDF extraction requires PyMuPDF or pdf2pic service`);
  console.log(`   For now, returning placeholder mapping`);
  
  // Placeholder - in production, implement actual extraction
  const pageImages = new Map<number, string>();
  
  // You would implement:
  // 1. Use PyMuPDF (fitz) via Python subprocess
  // 2. Convert each page to JPEG
  // 3. Encode as base64
  // 4. Return mapping: pageNumber -> base64Image
  
  return pageImages;
}

// =============================================================================
// Test Functions
// =============================================================================

async function testPageIndexSubmission(pdfPath: string) {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 1: PageIndex Document Submission');
  console.log('='.repeat(60));

  if (!PAGEINDEX_API_KEY) {
    console.error('❌ PAGEINDEX_API_KEY not configured');
    console.log('   Get your API key from: https://dash.pageindex.ai/api-keys');
    return null;
  }

  const client = new PageIndexClient(PAGEINDEX_API_KEY);

  try {
    // Check if file exists
    try {
      await Deno.stat(pdfPath);
    } catch {
      console.error(`❌ PDF file not found: ${pdfPath}`);
      console.log('   Please provide a valid PDF file path');
      return null;
    }

    const result = await client.submitDocument(pdfPath);
    return result.doc_id;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return null;
  }
}

async function testTreeRetrieval(docId: string) {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 2: Tree Structure Retrieval');
  console.log('='.repeat(60));

  if (!PAGEINDEX_API_KEY) {
    console.error('❌ PAGEINDEX_API_KEY not configured');
    return null;
  }

  const client = new PageIndexClient(PAGEINDEX_API_KEY);

  try {
    // Wait for document to be ready
    const isReady = await client.waitForReady(docId, 60000);
    if (!isReady) {
      console.error('❌ Document not ready within timeout');
      return null;
    }

    const treeResult = await client.getTree(docId);
    const tree = treeResult.result;

    console.log('\n📊 Tree Structure:');
    printTreeStructure(tree, 0);

    return tree;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return null;
  }
}

function printTreeStructure(nodes: PageIndexNode[], indent: number = 0) {
  const indentStr = '  '.repeat(indent);
  
  for (const node of nodes) {
    console.log(`${indentStr}├─ ${node.node_id}: ${node.title} (page ${node.page_index})`);
    if (node.summary) {
      const summaryPreview = node.summary.substring(0, 60) + '...';
      console.log(`${indentStr}│  Summary: ${summaryPreview}`);
    }
    if (node.nodes && node.nodes.length > 0) {
      printTreeStructure(node.nodes, indent + 1);
    }
  }
}

async function testReasoningRetrieval(
  question: string,
  tree: PageIndexNode[]
) {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 3: Reasoning-Based Retrieval');
  console.log('='.repeat(60));

  if (!OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not configured');
    console.log('   Required for VLM-based retrieval');
    return null;
  }

  try {
    console.log(`\n❓ Question: ${question}`);
    
    const result = await retrieveNodesWithVLM(question, tree, 'gpt-4o');
    
    console.log('\n🧠 Reasoning Process:');
    console.log(result.thinking);
    
    console.log('\n📍 Retrieved Nodes:');
    for (const nodeId of result.node_list) {
      const node = findNodeById(tree, nodeId);
      if (node) {
        console.log(`  - ${nodeId}: ${node.title} (page ${node.page_index})`);
      } else {
        console.log(`  - ${nodeId}: (not found in tree)`);
      }
    }

    return result;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return null;
  }
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
// Main Test Function
// =============================================================================

async function main() {
  console.log('\n🚀 PageIndex Vision RAG Test Suite');
  console.log('='.repeat(60));

  // Get command line arguments
  const args = Deno.args;
  const pdfPath = args[0] || './sample-document.pdf';
  const question = args[1] || 'What is the main topic of this document?';

  // Check configuration
  console.log('\n📋 Configuration Check:');
  console.log(`  PAGEINDEX_API_KEY: ${PAGEINDEX_API_KEY ? '✅ Configured' : '❌ Missing'}`);
  console.log(`  OPENAI_API_KEY: ${OPENAI_API_KEY ? '✅ Configured' : '❌ Missing'}`);
  console.log(`  PDF Path: ${pdfPath}`);
  console.log(`  Test Question: ${question}`);

  if (!PAGEINDEX_API_KEY) {
    console.error('\n❌ PAGEINDEX_API_KEY is required');
    console.log('\n   Get your API key from: https://dash.pageindex.ai/api-keys');
    console.log('   Then set it: export PAGEINDEX_API_KEY="your-key-here"');
    Deno.exit(1);
  }

  // Run tests
  const docId = await testPageIndexSubmission(pdfPath);
  if (!docId) {
    console.error('\n❌ Document submission failed. Exiting.');
    Deno.exit(1);
  }

  const tree = await testTreeRetrieval(docId);
  if (!tree) {
    console.error('\n❌ Tree retrieval failed. Exiting.');
    Deno.exit(1);
  }

  const retrievalResult = await testReasoningRetrieval(question, tree);
  if (!retrievalResult) {
    console.error('\n❌ Reasoning retrieval failed.');
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Test Suite Complete');
  console.log('='.repeat(60));
  console.log('\n📝 Next Steps:');
  console.log('  1. Implement PDF page image extraction');
  console.log('  2. Test full Vision RAG pipeline');
  console.log('  3. Compare results with current vector RAG');
  console.log('  4. Integrate as optional retrieval mode\n');
}

// Run if executed directly
if (import.meta.main) {
  main().catch(error => {
    console.error('Fatal error:', error);
    Deno.exit(1);
  });
}

