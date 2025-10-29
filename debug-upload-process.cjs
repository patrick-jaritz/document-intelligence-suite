#!/usr/bin/env node

/**
 * Debug script to check what documents were actually created during upload
 * and help identify why the filename filtering isn't working
 */

const SUPABASE_URL = 'https://joqnpibrfzqflyogrkht.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvcW5waWJyZnpxZmx5b2dyS2h0Iiwicm9sZSI6ImFub24iLCJpYWQiOjE3NjE2NDc5NTIsImV4cCI6MjA3NzIyMzk1Mn0.pIFvi2XRo1xmK3oZ-XBVpR6WvBye65a3ACE6wuFsxQk';

async function debugUploadProcess() {
  console.log('🔍 Debugging Upload Process...\n');

  try {
    // Step 1: Process a test file to see what happens
    console.log('📋 Step 1: Processing test-plain-text.txt file');
    
    const testText = `This is a test document to verify plain text processing is working correctly.

Key Information:
- This document contains important test data
- It should be processed correctly with the new fix
- The text should be extracted without OCR conversion
- Confidence should be 1.0 (perfect)

Technical Details:
- Content Type: text/plain
- Processing Method: Direct text extraction
- Expected Result: Full text preservation

Questions to test:
1. What is this document about?
2. What are the key information points?
3. What technical details are mentioned?

This document should now process correctly and provide relevant answers to RAG queries.`;

    const base64Text = btoa(testText);
    const dataUrl = `data:text/plain;base64,${base64Text}`;
    const documentId = crypto.randomUUID();

    console.log('🔄 Processing file with RAG pipeline...');
    const response = await fetch(`${SUPABASE_URL}/functions/v1/process-rag-markdown`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        documentId: documentId,
        jobId: 'debug-job-' + Date.now(),
        fileDataUrl: dataUrl,
        ocrProvider: 'dots-ocr',
        enableMarkdownConversion: true,
        generateEmbeddings: true,
        embeddingProvider: 'openai'
      }),
    });

    const result = await response.json();
    console.log('✅ Processing Result:', {
      status: response.status,
      success: result.success,
      documentId: result.documentId,
      filename: result.filename,
      extractedTextLength: result.extractedText?.length || 0,
      markdownTextLength: result.markdownText?.length || 0,
      chunksCreated: result.chunksCreated,
      embeddingsGenerated: result.embeddingsGenerated,
      processingTime: result.processingTime,
      error: result.error
    });

    if (result.success && result.chunksCreated > 0) {
      // Step 2: Wait a moment for embeddings to be ready
      console.log('\n⏳ Waiting for embeddings to be ready...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Step 3: Test RAG query with the actual filename from processing
      console.log('\n📋 Step 2: Testing RAG query with processed document');
      console.log(`🔍 Querying with filename: "${result.filename}"`);
      
      const queryResponse = await fetch(`${SUPABASE_URL}/functions/v1/rag-query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          question: 'What is this document about?',
          filename: result.filename,
          documentId: null,
          provider: 'openai',
          topK: 3
        }),
      });

      const queryResult = await queryResponse.json();
      console.log('✅ RAG Query Result:', {
        status: queryResponse.status,
        hasAnswer: !!queryResult.answer,
        answerLength: queryResult.answer?.length || 0,
        sourcesCount: queryResult.sources?.length || 0,
        warning: queryResult.warning,
        answerPreview: queryResult.answer?.substring(0, 200) + '...',
        sources: queryResult.sources?.map(s => ({
          score: s.score,
          textPreview: s.text?.substring(0, 100) + '...'
        })) || []
      });

      // Step 4: Test with documentId instead of filename
      console.log('\n📋 Step 3: Testing RAG query with documentId');
      console.log(`🔍 Querying with documentId: "${result.documentId}"`);
      
      const queryResponse2 = await fetch(`${SUPABASE_URL}/functions/v1/rag-query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          question: 'What is this document about?',
          filename: null,
          documentId: result.documentId,
          provider: 'openai',
          topK: 3
        }),
      });

      const queryResult2 = await queryResponse2.json();
      console.log('✅ RAG Query Result (documentId):', {
        status: queryResponse2.status,
        hasAnswer: !!queryResult2.answer,
        answerLength: queryResult2.answer?.length || 0,
        sourcesCount: queryResult2.sources?.length || 0,
        warning: queryResult2.warning,
        answerPreview: queryResult2.answer?.substring(0, 200) + '...',
        sources: queryResult2.sources?.map(s => ({
          score: s.score,
          textPreview: s.text?.substring(0, 100) + '...'
        })) || []
      });

      console.log('\n🎯 Analysis:');
      console.log('1. Check if processing was successful (chunksCreated > 0)');
      console.log('2. Check what filename was actually stored in the database');
      console.log('3. Compare filename vs documentId filtering results');
      console.log('4. If documentId works but filename doesn\'t, there\'s a filename mismatch');
      console.log('5. If both work, the system is functioning correctly');

    } else {
      console.log('\n❌ Processing failed - check the error message above');
      console.log('This explains why the RAG query can\'t find the document');
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

// Run the debug
debugUploadProcess().catch(console.error);
