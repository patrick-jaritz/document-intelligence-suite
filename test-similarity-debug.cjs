#!/usr/bin/env node

/**
 * Test script to debug the similarity calculation issue
 */

const SUPABASE_URL = 'https://joqnpibrfzqflyogrkht.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvcW5waWJyZnpxZmx5b2dyS2h0Iiwicm9sZSI6ImFub24iLCJpYWQiOjE3NjE2NDc5NTIsImV4cCI6MjA3NzIyMzk1Mn0.pIFvi2XRo1xmK3oZ-XBVpR6WvBye65a3ACE6wuFsxQk';

async function testSimilarityCalculation() {
  console.log('🔍 Testing Similarity Calculation Issue...\n');

  try {
    // Test 1: Check if we can get chunks from the database
    console.log('📋 Test 1: Checking database chunks');
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/document_chunks?select=*&limit=5`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
    });

    const chunks = await response.json();
    console.log('✅ Database chunks:', {
      status: response.status,
      chunksCount: Array.isArray(chunks) ? chunks.length : 0,
      chunks: Array.isArray(chunks) ? chunks.map(chunk => ({
        id: chunk.id,
        filename: chunk.filename,
        document_id: chunk.document_id,
        chunk_index: chunk.chunk_index,
        hasEmbedding: !!chunk.embedding,
        embeddingLength: chunk.embedding?.length,
        textPreview: chunk.chunk_text?.substring(0, 100) + '...'
      })) : chunks
    });

    if (!Array.isArray(chunks) || chunks.length === 0) {
      console.log('\n❌ No chunks found in database - this explains the "no results" issue');
      return;
    }

    // Test 2: Test RAG query with debug mode
    console.log('\n📋 Test 2: Testing RAG query with debug');
    
    const queryResponse = await fetch(`${SUPABASE_URL}/functions/v1/rag-query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        question: 'artificial intelligence',
        filename: null,
        documentId: null,
        provider: 'openai',
        topK: 5,
        debug: true
      }),
    });

    const queryResult = await queryResponse.json();
    console.log('✅ RAG Query Result:', {
      status: queryResponse.status,
      hasAnswer: !!queryResult.answer,
      answerLength: queryResult.answer?.length || 0,
      sourcesCount: queryResult.sources?.length || 0,
      warning: queryResult.warning,
      debug: queryResult.debug,
      answerPreview: queryResult.answer?.substring(0, 200) + '...'
    });

    // Test 3: Test with a very simple question
    console.log('\n📋 Test 3: Testing with simple question');
    
    const simpleResponse = await fetch(`${SUPABASE_URL}/functions/v1/rag-query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        question: 'test',
        filename: null,
        documentId: null,
        provider: 'openai',
        topK: 5
      }),
    });

    const simpleResult = await simpleResponse.json();
    console.log('✅ Simple Query Result:', {
      status: simpleResponse.status,
      hasAnswer: !!simpleResult.answer,
      answerLength: simpleResult.answer?.length || 0,
      sourcesCount: simpleResult.sources?.length || 0,
      warning: simpleResult.warning,
      answerPreview: simpleResult.answer?.substring(0, 200) + '...'
    });

    console.log('\n🎯 Analysis:');
    console.log('1. If chunksCount = 0: No documents have been processed');
    console.log('2. If chunksCount > 0 but sourcesCount = 0: Similarity calculation issue');
    console.log('3. If debug info shows similarity values: Check if they are too low');
    console.log('4. If simple query works: The issue might be with specific questions');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testSimilarityCalculation().catch(console.error);
