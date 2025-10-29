#!/usr/bin/env node

/**
 * Debug script to check the current state of documents and help troubleshoot
 * the plain text processing issue
 */

const SUPABASE_URL = 'https://joqnpibrfzqflyogrkht.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvcW5waWJyZnpxZmx5b2dyS2h0Iiwicm9sZSI6ImFub24iLCJpYWQiOjE3NjE2NDc5NTIsImV4cCI6MjA3NzIyMzk1Mn0.pIFvi2XRo1xmK3oZ-XBVpR6WvBye65a3ACE6wuFsxQk';

async function debugDocumentProcessing() {
  console.log('🔍 Debugging Document Processing Issue...\n');

  try {
    // Test 1: Check if plain text processing is working
    console.log('📋 Test 1: Testing plain text processing directly');
    const testText = `This is a test document to verify plain text processing is working.

Key Information:
- This document contains important test data
- It should be processed correctly with the new fix
- The text should be extracted without OCR conversion
- Confidence should be 1.0 (perfect)

Technical Details:
- Content Type: text/plain
- Processing Method: Direct text extraction
- Expected Result: Full text preservation`;

    const base64Text = btoa(testText);
    const dataUrl = `data:text/plain;base64,${base64Text}`;

    const response = await fetch(`${SUPABASE_URL}/functions/v1/process-pdf-ocr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        documentId: 'debug-test-' + Date.now(),
        jobId: 'debug-job-' + Date.now(),
        fileDataUrl: dataUrl,
        ocrProvider: 'dots-ocr'
      }),
    });

    const result = await response.json();
    console.log('✅ Direct OCR Test:', {
      status: response.status,
      success: result.success,
      textLength: result.extractedText?.length || 0,
      confidence: result.metadata?.confidence,
      provider: result.metadata?.provider,
      textPreview: result.extractedText?.substring(0, 150) + '...'
    });

    // Test 2: Test the RAG processing pipeline
    console.log('\n📋 Test 2: Testing RAG processing pipeline');
    const ragResponse = await fetch(`${SUPABASE_URL}/functions/v1/process-rag-markdown`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        documentId: 'debug-rag-' + Date.now(),
        jobId: 'debug-rag-job-' + Date.now(),
        fileDataUrl: dataUrl,
        ocrProvider: 'dots-ocr',
        enableMarkdownConversion: true,
        generateEmbeddings: true,
        embeddingProvider: 'openai'
      }),
    });

    const ragResult = await ragResponse.json();
    console.log('✅ RAG Pipeline Test:', {
      status: ragResponse.status,
      success: ragResult.success,
      extractedTextLength: ragResult.extractedText?.length || 0,
      markdownTextLength: ragResult.markdownText?.length || 0,
      chunksCreated: ragResult.chunksCreated,
      embeddingsGenerated: ragResult.embeddingsGenerated,
      processingTime: ragResult.processingTime
    });

    // Test 3: Test RAG query with the processed document
    if (ragResult.success && ragResult.chunksCreated > 0) {
      console.log('\n📋 Test 3: Testing RAG query with processed document');
      
      // Wait a moment for embeddings to be ready
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const queryResponse = await fetch(`${SUPABASE_URL}/functions/v1/rag-query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          question: 'What is this document about?',
          documentId: 'debug-rag-' + Date.now(),
          filename: null,
          provider: 'openai',
          topK: 3
        }),
      });

      const queryResult = await queryResponse.json();
      console.log('✅ RAG Query Test:', {
        status: queryResponse.status,
        hasAnswer: !!queryResult.answer,
        answerLength: queryResult.answer?.length || 0,
        sourcesCount: queryResult.sources?.length || 0,
        sources: queryResult.sources?.map(s => ({
          score: s.score,
          textPreview: s.text?.substring(0, 100) + '...'
        })) || []
      });
    }

    console.log('\n🎯 Analysis:');
    console.log('If Test 1 shows textLength > 0 and confidence = 1.0:');
    console.log('  ✅ Plain text processing is working');
    console.log('If Test 2 shows chunksCreated > 0 and embeddingsGenerated = true:');
    console.log('  ✅ RAG pipeline is working');
    console.log('If Test 3 shows relevant sources:');
    console.log('  ✅ RAG query is working');
    console.log('');
    console.log('If any test fails, the issue is in that specific component.');

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

// Run the debug
debugDocumentProcessing().catch(console.error);
