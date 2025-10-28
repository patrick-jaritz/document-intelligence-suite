#!/usr/bin/env node

/**
 * Test the process-rag-markdown function directly
 */

const SUPABASE_URL = 'https://joqnpibrfzqflyogrkht.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvcW5waWJyZnpxZmx5b2dya2h0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0Mjg5NTIsImV4cCI6MjA3NjAwNDk1Mn0.pIFvi2XRo1xmK3oZ-XBVpR6WvBye65a3ACE6wuFsxQk';

async function testProcessRAGMarkdown() {
  console.log('🧪 Testing process-rag-markdown function...\n');

  const testDocumentId = 'test-doc-' + Date.now();
  const testText = "This is a test document for RAG processing. It contains sample text that should be chunked and embedded into the vector database for retrieval augmented generation. This document outlines the capabilities and results of the crawl4ai web crawler, highlighting its advanced content extraction features.";

  try {
    console.log('📋 Test data:', {
      documentId: testDocumentId,
      textLength: testText.length,
      text: testText.substring(0, 100) + '...'
    });

    const response = await fetch(`${SUPABASE_URL}/functions/v1/process-rag-markdown`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        documentId: testDocumentId,
        jobId: 'test-job-' + Date.now(),
        dataType: 'text',
        ocrProvider: 'dots-ocr',
        fileData: btoa(testText), // Base64 encode the text
        llmModel: 'gpt-4o-mini',
        enableMarkdownConversion: true,
        convertTables: true,
        preserveFormatting: true,
        generateEmbeddings: true,
        embeddingProvider: 'openai',
        chunkSize: 1000,
        chunkOverlap: 200
      }),
    });

    console.log(`📡 Response Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error Response:', errorText);
      return;
    }

    const result = await response.json();
    console.log('✅ Success! Result:', {
      success: result.success,
      processingTime: result.processingTime,
      extractedTextLength: result.extractedTextLength,
      markdownTextLength: result.markdownTextLength,
      chunksCreated: result.chunksCreated,
      embeddingsGenerated: result.embeddingsGenerated,
      error: result.error
    });

    if (result.markdown) {
      console.log('📄 Markdown preview:', result.markdown.substring(0, 200) + '...');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

async function main() {
  console.log('🚀 Process RAG Markdown Debug Test\n');
  console.log('=' .repeat(60));

  await testProcessRAGMarkdown();

  console.log('\n' + '='.repeat(60));
  console.log('🏁 Debug test completed');
}

main().catch(console.error);
