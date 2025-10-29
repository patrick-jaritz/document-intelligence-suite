#!/usr/bin/env node

/**
 * Test script to verify embeddings are being generated and stored correctly
 */

const SUPABASE_URL = 'https://joqnpibrfzqflyogrkht.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvcW5waWJyZnpxZmx5b2dyS2h0Iiwicm9sZSI6ImFub24iLCJpYWQiOjE3NjE2NDc5NTIsImV4cCI6MjA3NzIyMzk1Mn0.pIFvi2XRo1xmK3oZ-XBVpR6WvBye65a3ACE6wuFsxQk';

async function testEmbeddingGeneration() {
  console.log('🔍 Testing Embedding Generation and Storage...\n');

  try {
    // Step 1: Process a simple document
    console.log('📋 Step 1: Processing simple document');
    
    const testText = `This is a simple test document about cats and dogs.

Cats are independent animals that like to sleep and hunt.
Dogs are loyal companions that love to play and fetch.
Both animals make great pets for families.

The document contains basic information about pets.`;

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
        jobId: 'embedding-test-' + Date.now(),
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

    if (!result.success) {
      console.log('\n❌ Processing failed - check the error above');
      return;
    }

    // Step 2: Wait for embeddings to be ready
    console.log('\n⏳ Waiting for embeddings to be ready...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Step 3: Test RAG query with very simple questions
    console.log('\n📋 Step 2: Testing RAG queries with simple questions');
    
    const simpleQuestions = [
      'cats',
      'dogs',
      'pets',
      'animals',
      'What are cats?',
      'What are dogs?'
    ];

    for (const question of simpleQuestions) {
      console.log(`\n🔍 Testing question: "${question}"`);
      
      const queryResponse = await fetch(`${SUPABASE_URL}/functions/v1/rag-query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          question: question,
          filename: result.filename,
          documentId: null,
          provider: 'openai',
          topK: 5
        }),
      });

      const queryResult = await queryResponse.json();
      console.log('✅ Query Result:', {
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

      // If we get sources, break early
      if (queryResult.sources && queryResult.sources.length > 0) {
        console.log('\n🎉 SUCCESS! Found sources for question:', question);
        break;
      }
    }

    // Step 4: Test with documentId filtering
    console.log(`\n📋 Step 3: Testing with documentId filtering`);
    console.log(`🔍 Querying with documentId: "${result.documentId}"`);
    
    const queryResponse2 = await fetch(`${SUPABASE_URL}/functions/v1/rag-query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        question: 'cats',
        filename: null,
        documentId: result.documentId,
        provider: 'openai',
        topK: 5
      }),
    });

    const queryResult2 = await queryResponse2.json();
    console.log('✅ DocumentId Query Result:', {
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
    console.log('1. If chunksCreated > 0: Chunks are being created');
    console.log('2. If embeddingsGenerated = true: Embeddings are being generated');
    console.log('3. If sourcesCount > 0: Similarity calculation is working');
    console.log('4. If sourcesCount = 0: There\'s still an issue with similarity calculation');
    console.log('5. If documentId filtering works: Document filtering is working');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testEmbeddingGeneration().catch(console.error);
