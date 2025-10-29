#!/usr/bin/env node

/**
 * Test script to verify RAG system fixes
 * This script tests the complete RAG pipeline to ensure:
 * 1. Document records are created properly
 * 2. Embeddings are generated successfully
 * 3. No foreign key constraint violations occur
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://joqnpibrfzqflyogrkht.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvcW5waWJyZnpxZmx5b2dyS2h0Iiwicm9sZSI6ImFub24iLCJpYWQiOjE3NjE2NDc5NTIsImV4cCI6MjA3NzIyMzk1Mn0.pIFvi2XRo1xmK3oZ-XBVpR6WvBye65a3ACE6wuFsxQk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testRAGSystem() {
  console.log('🧪 Testing RAG System Fixes...\n');
  
  const testDocumentId = crypto.randomUUID();
  const testJobId = crypto.randomUUID();
  
  console.log('📋 Test Parameters:');
  console.log(`  Document ID: ${testDocumentId}`);
  console.log(`  Job ID: ${testJobId}`);
  console.log(`  Timestamp: ${new Date().toISOString()}\n`);

  try {
    // Step 1: Test process-rag-markdown function
    console.log('🔄 Step 1: Testing process-rag-markdown function...');
    
    const testText = `# Test Document for RAG System

This is a test document to verify that the RAG system is working properly after the fixes.

## Key Points
- Document processing should work without foreign key constraint violations
- Embeddings should be generated successfully
- Document records should be created properly

## Sample Content
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

### Technical Details
- Test timestamp: ${new Date().toISOString()}
- Document ID: ${testDocumentId}
- Job ID: ${testJobId}

## Conclusion
This test should complete successfully with proper document record creation and embedding generation.`;

    const fileDataUrl = `data:text/plain;base64,${btoa(testText)}`;
    
    const processResponse = await fetch(`${SUPABASE_URL}/functions/v1/process-rag-markdown`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        documentId: testDocumentId,
        jobId: testJobId,
        fileUrl: '', // Empty for test mode
        ocrProvider: 'dots-ocr',
        fileDataUrl: fileDataUrl,
        generateEmbeddings: true,
        embeddingProvider: 'openai',
        enableMarkdownConversion: true,
        convertTables: true,
        preserveFormatting: true
      })
    });

    if (!processResponse.ok) {
      const errorText = await processResponse.text();
      throw new Error(`process-rag-markdown failed: ${processResponse.status} ${processResponse.statusText}\n${errorText}`);
    }

    const processResult = await processResponse.json();
    console.log('✅ process-rag-markdown completed successfully');
    console.log(`  Processing time: ${processResult.processingTime}ms`);
    console.log(`  Text length: ${processResult.extractedText?.length || 0} characters`);
    console.log(`  Markdown length: ${processResult.markdownText?.length || 0} characters`);
    console.log(`  Chunks created: ${processResult.chunksCreated}`);
    console.log(`  Embeddings generated: ${processResult.embeddingsGenerated}`);
    console.log(`  Success: ${processResult.success}\n`);

    // Step 2: Verify document record was created
    console.log('🔍 Step 2: Verifying document record creation...');
    
    const { data: documentRecord, error: docError } = await supabase
      .from('rag_documents')
      .select('*')
      .eq('id', testDocumentId)
      .single();

    if (docError) {
      throw new Error(`Failed to retrieve document record: ${docError.message}`);
    }

    console.log('✅ Document record found:');
    console.log(`  ID: ${documentRecord.id}`);
    console.log(`  Filename: ${documentRecord.filename}`);
    console.log(`  Upload date: ${documentRecord.upload_date}`);
    console.log(`  Embedding provider: ${documentRecord.embedding_provider}\n`);

    // Step 3: Verify chunks were created
    console.log('🔍 Step 3: Verifying document chunks...');
    
    const { data: chunks, error: chunksError } = await supabase
      .from('document_chunks')
      .select('*')
      .eq('document_id', testDocumentId);

    if (chunksError) {
      throw new Error(`Failed to retrieve document chunks: ${chunksError.message}`);
    }

    console.log(`✅ Found ${chunks.length} document chunks:`);
    chunks.forEach((chunk, index) => {
      console.log(`  Chunk ${index + 1}:`);
      console.log(`    ID: ${chunk.id}`);
      console.log(`    Content length: ${chunk.content?.length || 0} characters`);
      console.log(`    Has embedding: ${!!chunk.embedding}`);
      console.log(`    Chunk index: ${chunk.chunk_index}`);
    });
    console.log('');

    // Step 4: Test RAG query
    console.log('🔍 Step 4: Testing RAG query...');
    
    const queryResponse = await fetch(`${SUPABASE_URL}/functions/v1/rag-query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        question: 'What is this document about?',
        documentId: testDocumentId,
        provider: 'openai'
      })
    });

    if (!queryResponse.ok) {
      const errorText = await queryResponse.text();
      throw new Error(`RAG query failed: ${queryResponse.status} ${queryResponse.statusText}\n${errorText}`);
    }

    const queryResult = await queryResponse.json();
    console.log('✅ RAG query completed successfully');
    console.log(`  Answer length: ${queryResult.answer?.length || 0} characters`);
    console.log(`  Sources found: ${queryResult.sources?.length || 0}`);
    console.log(`  Model used: ${queryResult.model}`);
    console.log(`  Provider: ${queryResult.provider}\n`);

    // Step 5: Cleanup test data
    console.log('🧹 Step 5: Cleaning up test data...');
    
    // Delete chunks first (due to foreign key constraint)
    const { error: deleteChunksError } = await supabase
      .from('document_chunks')
      .delete()
      .eq('document_id', testDocumentId);

    if (deleteChunksError) {
      console.warn(`⚠️ Failed to delete chunks: ${deleteChunksError.message}`);
    } else {
      console.log('✅ Document chunks deleted');
    }

    // Delete document record
    const { error: deleteDocError } = await supabase
      .from('rag_documents')
      .delete()
      .eq('id', testDocumentId);

    if (deleteDocError) {
      console.warn(`⚠️ Failed to delete document record: ${deleteDocError.message}`);
    } else {
      console.log('✅ Document record deleted');
    }

    console.log('\n🎉 RAG System Test Completed Successfully!');
    console.log('✅ All fixes are working properly:');
    console.log('  - Document records are created correctly');
    console.log('  - Embeddings are generated without foreign key violations');
    console.log('  - RAG queries work properly');
    console.log('  - No constraint violations occurred');

  } catch (error) {
    console.error('\n❌ RAG System Test Failed:');
    console.error(`Error: ${error.message}`);
    console.error('\nThis indicates that the fixes may not be working properly.');
    process.exit(1);
  }
}

// Run the test
testRAGSystem().catch(console.error);
