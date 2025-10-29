#!/usr/bin/env node

/**
 * Debug script to check why RAG query returns "No relevant information found"
 */

const SUPABASE_URL = 'https://joqnpibrfzqflyogrkht.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvcW5waWJyZnpxZmx5b2dyS2h0Iiwicm9sZSI6ImFub24iLCJpYWQiOjE3NjE2NDc5NTIsImV4cCI6MjA3NzIyMzk1Mn0.pIFvi2XRo1xmK3oZ-XBVpR6WvBye65a3ACE6wuFsxQk';

async function debugNoResults() {
  console.log('🔍 Debugging RAG Query - No Results Issue...\n');

  try {
    // Step 1: Process a test document to get fresh data
    console.log('📋 Step 1: Processing test document');
    
    const testText = `This is a test document about artificial intelligence and machine learning.

Key Topics:
- Machine learning algorithms
- Deep learning neural networks
- Natural language processing
- Computer vision applications
- AI ethics and safety

Technical Details:
- Uses Python programming language
- Implements TensorFlow and PyTorch frameworks
- Processes large datasets for training
- Achieves high accuracy in classification tasks

Applications:
- Image recognition systems
- Language translation services
- Recommendation engines
- Autonomous vehicles
- Medical diagnosis tools

This document contains comprehensive information about AI technologies and their practical applications in various industries.`;

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
      // Step 2: Wait for embeddings to be ready
      console.log('\n⏳ Waiting for embeddings to be ready...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Step 3: Test RAG query with different questions
      console.log('\n📋 Step 2: Testing RAG queries with different questions');
      
      const testQuestions = [
        'What is this document about?',
        'What are the key topics?',
        'What programming languages are mentioned?',
        'What are the applications?',
        'artificial intelligence',
        'machine learning'
      ];

      for (const question of testQuestions) {
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
          answerPreview: queryResult.answer?.substring(0, 150) + '...',
          sources: queryResult.sources?.map(s => ({
            score: s.score,
            textPreview: s.text?.substring(0, 100) + '...'
          })) || []
        });
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
          question: 'What is this document about?',
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
        answerPreview: queryResult2.answer?.substring(0, 150) + '...',
        sources: queryResult2.sources?.map(s => ({
          score: s.score,
          textPreview: s.text?.substring(0, 100) + '...'
        })) || []
      });

      console.log('\n🎯 Analysis:');
      console.log('1. If processing shows chunksCreated > 0: Embeddings are being generated');
      console.log('2. If queries return sourcesCount > 0: Similarity calculation is working');
      console.log('3. If queries return sourcesCount = 0: Similarity threshold might be too high');
      console.log('4. If documentId filtering works: Document filtering is working');
      console.log('5. If all queries fail: There might be an issue with the similarity calculation');

    } else {
      console.log('\n❌ Processing failed - check the error message above');
      console.log('This explains why the RAG query can\'t find any information');
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

// Run the debug
debugNoResults().catch(console.error);
