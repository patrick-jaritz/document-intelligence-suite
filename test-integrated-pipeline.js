#!/usr/bin/env node

/**
 * Comprehensive test script for the integrated Markdown conversion pipeline
 * Tests both Data Extract and RAG pipelines with Markdown conversion
 */

const SUPABASE_URL = 'https://joqnpibrfzqflyogrkht.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvcW5waWJyZnpxZmx5b2dya2h0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0Mjg5NTIsImV4cCI6MjA3NjAwNDk1Mn0.pIFvi2XRo1xmK3oZ-XBVpR6WvBye65a3ACE6wuFsxQk';

async function testIntegratedPipeline() {
  console.log('🧪 Testing Integrated Markdown Conversion Pipeline\n');

  const testCases = [
    {
      name: 'Data Extract Pipeline with Markdown',
      testFunction: testDataExtractPipeline,
      description: 'Tests OCR + Markdown conversion for structured data extraction'
    },
    {
      name: 'RAG Pipeline with Markdown',
      testFunction: testRAGPipeline,
      description: 'Tests OCR + Markdown + Embeddings for RAG processing'
    },
    {
      name: 'Standalone Markdown Converter',
      testFunction: testStandaloneConverter,
      description: 'Tests the standalone Markdown converter function'
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n📄 Testing: ${testCase.name}`);
    console.log(`📝 Description: ${testCase.description}`);
    console.log('─'.repeat(60));

    try {
      await testCase.testFunction();
      console.log(`✅ ${testCase.name} - PASSED`);
    } catch (error) {
      console.error(`❌ ${testCase.name} - FAILED:`, error.message);
    }
  }

  console.log('\n🎉 Integrated pipeline testing completed!');
}

async function testDataExtractPipeline() {
  console.log('Testing Data Extract Pipeline with Markdown conversion...');

  const testPayload = {
    documentId: `test-doc-${Date.now()}`,
    jobId: `test-job-${Date.now()}`,
    fileUrl: 'data-url',
    ocrProvider: 'google-vision',
    fileDataUrl: 'data:application/pdf;base64,JVBERi0xLjQKJcfsj6IKNSAwIG9iago8PAovVHlwZSAvUGFnZQovUGFyZW50IDMgMCBSCi9NZWRpYUJveCBbMCAwIDU5NSA4NDJdCi9SZXNvdXJjZXMgPDwKL0ZvbnQgPDwKL0YxIDIgMCBSCj4+Cj4+Ci9Db250ZW50cyA0IDAgUgo+PgplbmRvYmoKNCAwIG9iago8PAovTGVuZ3RoIDQ0Cj4+CnN0cmVhbQpCVAovRjEgMTIgVGYKNzIgNzIwIFRkCihIZWxsbyBXb3JsZCkgVGoKRVQKZW5kc3RyZWFtCmVuZG9iago2IDAgb2JqCjw8Ci9UeXBlIC9Gb250Ci9TdWJ0eXBlIC9UeXBlMQovQmFzZUZvbnQgL0hlbHZldGljYQo+PgplbmRvYmoKMiAwIG9iago8PAovVHlwZSAvRm9udAovU3VidHlwZSAvVHlwZTEKL0Jhc2VGb250IC9IZWx2ZXRpY2EKL0VuY29kaW5nIC9XaW5BbnNpRW5jb2RpbmcKPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFs0IDAgUl0KL0NvdW50IDEKL01lZGlhQm94IFswIDAgNTk1IDg0Ml0KPj4KZW5kb2JqCjEgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKL01lZGlhQm94IFswIDAgNTk1IDg0Ml0KPj4KZW5kb2JqCnhyZWYKMCA3CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAwOSAwMDAwMCBuIAowMDAwMDAwMDU4IDAwMDAwIG4gCjAwMDAwMDAxMTUgMDAwMDAgbiAKMDAwMDAwMDI2NSAwMDAwMCBuIAowMDAwMDAwMzQ0IDAwMDAwIG4gCjAwMDAwMDA0OTAgMDAwMDAgbiAKdHJhaWxlcgo8PAovU2l6ZSA3Ci9Sb290IDEgMCBSCj4+CnN0YXJ0eHJlZgo2MDAKJSVFT0Y=',
    enableMarkdownConversion: true,
    convertTables: true,
    preserveFormatting: true
  };

  const response = await fetch(`${SUPABASE_URL}/functions/v1/process-pdf-ocr-markdown`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(testPayload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Data Extract pipeline failed');
  }

  console.log('✅ Data Extract Pipeline Results:');
  console.log(`   - Processing Time: ${result.processingTime}ms`);
  console.log(`   - OCR Text Length: ${result.extractedText?.length || 0} characters`);
  console.log(`   - Markdown Text Length: ${result.markdownText?.length || 0} characters`);
  console.log(`   - Markdown Conversion Enabled: ${result.metadata?.markdownConversion?.enabled || false}`);
  console.log(`   - Tables Detected: ${result.metadata?.markdownConversion?.tablesDetected || 0}`);
  console.log(`   - Conversion Method: ${result.metadata?.markdownConversion?.conversionMethod || 'N/A'}`);
  
  // Verify that Markdown text is different from OCR text (indicating conversion occurred)
  if (result.markdownText && result.extractedText && result.markdownText !== result.extractedText) {
    console.log('✅ Markdown conversion successful - text was processed');
  } else {
    console.log('⚠️ Markdown conversion may not have occurred - text appears unchanged');
  }
}

async function testRAGPipeline() {
  console.log('Testing RAG Pipeline with Markdown conversion...');

  const testPayload = {
    documentId: `test-rag-${Date.now()}`,
    jobId: `test-rag-job-${Date.now()}`,
    fileUrl: 'data-url',
    ocrProvider: 'google-vision',
    fileDataUrl: 'data:application/pdf;base64,JVBERi0xLjQKJcfsj6IKNSAwIG9iago8PAovVHlwZSAvUGFnZQovUGFyZW50IDMgMCBSCi9NZWRpYUJveCBbMCAwIDU5NSA4NDJdCi9SZXNvdXJjZXMgPDwKL0ZvbnQgPDwKL0YxIDIgMCBSCj4+Cj4+Ci9Db250ZW50cyA0IDAgUgo+PgplbmRvYmoKNCAwIG9iago8PAovTGVuZ3RoIDQ0Cj4+CnN0cmVhbQpCVAovRjEgMTIgVGYKNzIgNzIwIFRkCihIZWxsbyBXb3JsZCkgVGoKRVQKZW5kc3RyZWFtCmVuZG9iago2IDAgb2JqCjw8Ci9UeXBlIC9Gb250Ci9TdWJ0eXBlIC9UeXBlMQovQmFzZUZvbnQgL0hlbHZldGljYQo+PgplbmRvYmoKMiAwIG9iago8PAovVHlwZSAvRm9udAovU3VidHlwZSAvVHlwZTEKL0Jhc2VGb250IC9IZWx2ZXRpY2EKL0VuY29kaW5nIC9XaW5BbnNpRW5jb2RpbmcKPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFs0IDAgUl0KL0NvdW50IDEKL01lZGlhQm94IFswIDAgNTk1IDg0Ml0KPj4KZW5kb2JqCjEgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKL01lZGlhQm94IFswIDAgNTk1IDg0Ml0KPj4KZW5kb2JqCnhyZWYKMCA3CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAwOSAwMDAwMCBuIAowMDAwMDAwMDU4IDAwMDAwIG4gCjAwMDAwMDAxMTUgMDAwMDAgbiAKMDAwMDAwMDI2NSAwMDAwMCBuIAowMDAwMDAwMzQ0IDAwMDAwIG4gCjAwMDAwMDA0OTAgMDAwMDAgbiAKdHJhaWxlcgo8PAovU2l6ZSA3Ci9Sb290IDEgMCBSCj4+CnN0YXJ0eHJlZgo2MDAKJSVFT0Y=',
    enableMarkdownConversion: true,
    convertTables: true,
    preserveFormatting: true,
    generateEmbeddings: true,
    embeddingProvider: 'openai',
    chunkSize: 1000,
    chunkOverlap: 200
  };

  const response = await fetch(`${SUPABASE_URL}/functions/v1/process-rag-markdown`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(testPayload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'RAG pipeline failed');
  }

  console.log('✅ RAG Pipeline Results:');
  console.log(`   - Processing Time: ${result.processingTime}ms`);
  console.log(`   - OCR Text Length: ${result.extractedText?.length || 0} characters`);
  console.log(`   - Markdown Text Length: ${result.markdownText?.length || 0} characters`);
  console.log(`   - Chunks Created: ${result.chunksCreated || 0}`);
  console.log(`   - Embeddings Generated: ${result.embeddingsGenerated ? 'Yes' : 'No'}`);
  console.log(`   - Markdown Conversion Enabled: ${result.metadata?.markdownConversion?.enabled || false}`);
  console.log(`   - RAG Processing: ${result.metadata?.ragProcessing?.chunksCreated || 0} chunks, ${result.metadata?.ragProcessing?.embeddingsGenerated || 0} embeddings`);
  
  // Verify RAG processing components
  if (result.chunksCreated > 0) {
    console.log('✅ Text chunking successful');
  } else {
    console.log('⚠️ No chunks created - check embedding generation');
  }
  
  if (result.embeddingsGenerated) {
    console.log('✅ Embedding generation successful');
  } else {
    console.log('⚠️ Embeddings not generated - check configuration');
  }
}

async function testStandaloneConverter() {
  console.log('Testing Standalone Markdown Converter...');

  const testPayload = {
    fileData: btoa('This is a test document with some content. It should be converted to Markdown format.'),
    contentType: 'text/plain',
    fileName: 'test-document.txt',
    fileSize: 100,
    convertTables: true,
    preserveFormatting: true
  };

  const response = await fetch(`${SUPABASE_URL}/functions/v1/markdown-converter`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(testPayload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Markdown conversion failed');
  }

  console.log('✅ Standalone Converter Results:');
  console.log(`   - Processing Time: ${result.metadata?.processingTime || 0}ms`);
  console.log(`   - Word Count: ${result.metadata?.wordCount || 0}`);
  console.log(`   - Character Count: ${result.metadata?.characterCount || 0}`);
  console.log(`   - Tables Detected: ${result.metadata?.tablesDetected || 0}`);
  console.log(`   - Images Detected: ${result.metadata?.imagesDetected || 0}`);
  console.log(`   - Links Detected: ${result.metadata?.linksDetected || 0}`);
  console.log(`   - Conversion Method: ${result.metadata?.conversionMethod || 'N/A'}`);
  
  if (result.markdown && result.markdown.length > 0) {
    console.log('✅ Markdown conversion successful');
    console.log(`   - Markdown Preview: ${result.markdown.substring(0, 100)}...`);
  } else {
    console.log('⚠️ No Markdown output generated');
  }
}

// Run the comprehensive test
testIntegratedPipeline().catch(console.error);
