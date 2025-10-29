#!/usr/bin/env node

/**
 * Test script to check if the RAG query is working without causing errors
 */

const SUPABASE_URL = 'https://joqnpibrfzqflyogrkht.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvcW5waWJyZnpxZmx5b2dyS2h0Iiwicm9sZSI6ImFub24iLCJpYWQiOjE3NjE2NDc5NTIsImV4cCI6MjA3NzIyMzk1Mn0.pIFvi2XRo1xmK3oZ-XBVpR6WvBye65a3ACE6wuFsxQk';

async function testRAGQuery() {
  console.log('🔍 Testing RAG Query to identify blank page issue...\n');

  try {
    // Test 1: Simple query without any filters
    console.log('📋 Test 1: Simple query without filters');
    const response1 = await fetch(`${SUPABASE_URL}/functions/v1/rag-query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        question: 'What is this document about?',
        documentId: null,
        filename: null,
        provider: 'openai',
        topK: 3
      }),
    });

    const result1 = await response1.json();
    console.log('✅ Test 1 Result:', {
      status: response1.status,
      hasAnswer: !!result1.answer,
      hasError: !!result1.error,
      errorMessage: result1.error,
      answerLength: result1.answer?.length || 0,
      sourcesCount: result1.sources?.length || 0
    });

    // Test 2: Query with invalid UUID (should not crash)
    console.log('\n📋 Test 2: Query with invalid UUID');
    const response2 = await fetch(`${SUPABASE_URL}/functions/v1/rag-query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        question: 'What is this document about?',
        documentId: 'invalid-uuid-test',
        filename: null,
        provider: 'openai',
        topK: 3
      }),
    });

    const result2 = await response2.json();
    console.log('✅ Test 2 Result:', {
      status: response2.status,
      hasAnswer: !!result2.answer,
      hasError: !!result2.error,
      errorMessage: result2.error,
      answerLength: result2.answer?.length || 0,
      sourcesCount: result2.sources?.length || 0
    });

    // Test 3: Query with valid UUID format but non-existent document
    console.log('\n📋 Test 3: Query with valid UUID format');
    const response3 = await fetch(`${SUPABASE_URL}/functions/v1/rag-query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        question: 'What is this document about?',
        documentId: '00000000-0000-0000-0000-000000000000',
        filename: null,
        provider: 'openai',
        topK: 3
      }),
    });

    const result3 = await response3.json();
    console.log('✅ Test 3 Result:', {
      status: response3.status,
      hasAnswer: !!result3.answer,
      hasError: !!result3.error,
      errorMessage: result3.error,
      answerLength: result3.answer?.length || 0,
      sourcesCount: result3.sources?.length || 0
    });

    console.log('\n🎯 Analysis:');
    console.log('1. If Test 1 works: Basic RAG query is functional');
    console.log('2. If Test 2 shows proper error: UUID validation is working');
    console.log('3. If Test 3 works: Valid UUID handling is working');
    console.log('4. If any test crashes: There\'s a backend issue');
    console.log('5. If all tests work: The issue is likely in the frontend');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testRAGQuery().catch(console.error);
