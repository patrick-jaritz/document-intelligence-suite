#!/usr/bin/env node

/**
 * Debug script to test the RAG query with documentId filtering
 */

const SUPABASE_URL = 'https://joqnpibrfzqflyogrkht.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvcW5waWJyZnpxZmx5b2dyS2h0Iiwicm9sZSI6ImFub24iLCJpYWQiOjE3NjE2NDc5NTIsImV4cCI6MjA3NzIyMzk1Mn0.pIFvi2XRo1xmK3oZ-XBVpR6WvBye65a3ACE6wuFsxQk';

async function testDocumentIdQuery() {
  console.log('🔍 Testing DocumentId Query...\n');

  try {
    // Test with a known documentId
    const documentId = 'debug-test-1761678510837';
    
    console.log(`📋 Testing RAG query with documentId: "${documentId}"`);
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/rag-query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        question: 'What is this document about?',
        filename: null,
        documentId: documentId,
        provider: 'openai',
        topK: 3
      }),
    });

    const result = await response.json();
    console.log('✅ Result:', {
      status: response.status,
      success: result.success,
      error: result.error,
      hasAnswer: !!result.answer,
      answerLength: result.answer?.length || 0,
      sourcesCount: result.sources?.length || 0,
      warning: result.warning,
      answerPreview: result.answer?.substring(0, 200) + '...',
      sources: result.sources?.map(s => ({
        score: s.score,
        textPreview: s.text?.substring(0, 100) + '...'
      })) || []
    });

    if (response.status === 500) {
      console.log('\n❌ 500 Error Details:');
      console.log('Error:', result.error);
      console.log('This suggests there\'s an issue with the RAG query function');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testDocumentIdQuery().catch(console.error);
