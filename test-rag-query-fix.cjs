#!/usr/bin/env node

/**
 * Test script to verify RAG query is working with documentId filtering
 * This will help us confirm that the fix is working
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://joqnpibrfzqflyogrkht.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvcW5waWJyZnpxZmx5b2dyS2h0Iiwicm9sZSI6ImFub24iLCJpYWQiOjE3NjE2NDc5NTIsImV4cCI6MjA3NzIyMzk1Mn0.pIFvi2XRo1xmK3oZ-XBVpR6WvBye65a3ACE6wuFsxQk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testRAGQuery() {
  console.log('🧪 Testing RAG Query with DocumentId Filtering...\n');

  try {
    // Test 1: Query without any filters (should search all documents)
    console.log('📋 Test 1: Query without filters (search all documents)');
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
    console.log('✅ Response 1:', {
      status: response1.status,
      hasAnswer: !!result1.answer,
      sourcesCount: result1.sources?.length || 0,
      sources: result1.sources?.map(s => ({
        filename: s.filename,
        score: s.score,
        textPreview: s.text?.substring(0, 100) + '...'
      })) || []
    });

    // Test 2: Query with a specific documentId (if we have one)
    console.log('\n📋 Test 2: Query with specific documentId');
    
    // First, let's try to get a recent documentId from the logs
    // Based on the logs, we know there are documents with IDs like "0a94eb6d-2983-4aaa-991a-9a3f06016240"
    const testDocumentId = '0a94eb6d-2983-4aaa-991a-9a3f06016240'; // From recent logs
    
    const response2 = await fetch(`${SUPABASE_URL}/functions/v1/rag-query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        question: 'What is this document about?',
        documentId: testDocumentId,
        filename: null,
        provider: 'openai',
        topK: 3
      }),
    });

    const result2 = await response2.json();
    console.log('✅ Response 2:', {
      status: response2.status,
      hasAnswer: !!result2.answer,
      sourcesCount: result2.sources?.length || 0,
      sources: result2.sources?.map(s => ({
        filename: s.filename,
        document_id: s.document_id,
        score: s.score,
        textPreview: s.text?.substring(0, 100) + '...'
      })) || [],
      debug: result2.debug
    });

    // Test 3: Query with filename filter
    console.log('\n📋 Test 3: Query with filename filter');
    const testFilename = 'rag-document-0a94eb6d-2983-4aaa-991a-9a3f06016240.md';
    
    const response3 = await fetch(`${SUPABASE_URL}/functions/v1/rag-query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        question: 'What is this document about?',
        documentId: null,
        filename: testFilename,
        provider: 'openai',
        topK: 3
      }),
    });

    const result3 = await response3.json();
    console.log('✅ Response 3:', {
      status: response3.status,
      hasAnswer: !!result3.answer,
      sourcesCount: result3.sources?.length || 0,
      sources: result3.sources?.map(s => ({
        filename: s.filename,
        document_id: s.document_id,
        score: s.score,
        textPreview: s.text?.substring(0, 100) + '...'
      })) || [],
      debug: result3.debug
    });

    console.log('\n🎯 Analysis:');
    console.log('- Test 1 (no filters): Should return results from any document');
    console.log('- Test 2 (documentId filter): Should return results only from the specific document');
    console.log('- Test 3 (filename filter): Should return results only from the specific filename');
    console.log('');
    console.log('If Test 2 returns different/specific results than Test 1, the documentId filtering is working!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testRAGQuery().catch(console.error);
