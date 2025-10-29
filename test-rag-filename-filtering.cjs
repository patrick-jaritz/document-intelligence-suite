#!/usr/bin/env node

/**
 * Test script to verify RAG query filename filtering is working correctly
 */

const SUPABASE_URL = 'https://joqnpibrfzqflyogrkht.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvcW5waWJyZnpxZmx5b2dyS2h0Iiwicm9sZSI6ImFub24iLCJpYWQiOjE3NjE2NDc5NTIsImV4cCI6MjA3NzIyMzk1Mn0.pIFvi2XRo1xmK3oZ-XBVpR6WvBye65a3ACE6wuFsxQk';

async function testRAGFilenameFiltering() {
  console.log('🔍 Testing RAG Filename Filtering...\n');

  try {
    // Test 1: Query with exact filename
    console.log('📋 Test 1: Query with filename "test-plain-text.txt"');
    const response1 = await fetch(`${SUPABASE_URL}/functions/v1/rag-query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        question: 'What is this document about?',
        filename: 'test-plain-text.txt',
        documentId: null,
        provider: 'openai',
        topK: 3
      }),
    });

    const result1 = await response1.json();
    console.log('✅ Result 1:', {
      status: response1.status,
      hasAnswer: !!result1.answer,
      sourcesCount: result1.sources?.length || 0,
      warning: result1.warning,
      answerPreview: result1.answer?.substring(0, 200) + '...',
      sources: result1.sources?.map(s => ({
        score: s.score,
        textPreview: s.text?.substring(0, 100) + '...'
      })) || []
    });

    // Test 2: Query without filename filter
    console.log('\n📋 Test 2: Query without filename filter');
    const response2 = await fetch(`${SUPABASE_URL}/functions/v1/rag-query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        question: 'What is this document about?',
        filename: null,
        documentId: null,
        provider: 'openai',
        topK: 3
      }),
    });

    const result2 = await response2.json();
    console.log('✅ Result 2:', {
      status: response2.status,
      hasAnswer: !!result2.answer,
      sourcesCount: result2.sources?.length || 0,
      warning: result2.warning,
      answerPreview: result2.answer?.substring(0, 200) + '...',
      sources: result2.sources?.map(s => ({
        score: s.score,
        textPreview: s.text?.substring(0, 100) + '...'
      })) || []
    });

    // Test 3: Query with a different filename that might exist
    console.log('\n📋 Test 3: Query with filename "BRAITER_INSIGHT.pdf"');
    const response3 = await fetch(`${SUPABASE_URL}/functions/v1/rag-query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        question: 'What is this document about?',
        filename: 'BRAITER_INSIGHT.pdf',
        documentId: null,
        provider: 'openai',
        topK: 3
      }),
    });

    const result3 = await response3.json();
    console.log('✅ Result 3:', {
      status: response3.status,
      hasAnswer: !!result3.answer,
      sourcesCount: result3.sources?.length || 0,
      warning: result3.warning,
      answerPreview: result3.answer?.substring(0, 200) + '...',
      sources: result3.sources?.map(s => ({
        score: s.score,
        textPreview: s.text?.substring(0, 100) + '...'
      })) || []
    });

    console.log('\n🎯 Analysis:');
    console.log('1. If Test 1 shows warning about "test-plain-text.txt" not found:');
    console.log('   → The document was not processed or has a different filename');
    console.log('2. If Test 2 shows results without warning:');
    console.log('   → There are documents in the database, but filename filtering is working');
    console.log('3. If Test 3 shows warning about "BRAITER_INSIGHT.pdf" not found:');
    console.log('   → This confirms the filename filtering is working correctly');
    console.log('');
    console.log('Next steps:');
    console.log('- Upload a new .txt file and check what filename it gets');
    console.log('- Use documentId filtering instead of filename filtering');
    console.log('- Check the Supabase logs for more details');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testRAGFilenameFiltering().catch(console.error);
