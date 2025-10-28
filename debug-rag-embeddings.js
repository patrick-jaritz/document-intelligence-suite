#!/usr/bin/env node

/**
 * Test script to debug RAG embedding generation
 */

const SUPABASE_URL = 'https://joqnpibrfzqflyogrkht.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvcW5waWJyZnpxZmx5b2dya2h0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0Mjg5NTIsImV4cCI6MjA3NjAwNDk1Mn0.pIFvi2XRo1xmK3oZ-XBVpR6WvBye65a3ACE6wuFsxQk';

async function testEmbeddingGeneration() {
  console.log('🧪 Testing embedding generation...\n');

  const testText = "This is a test document for RAG processing. It contains sample text that should be chunked and embedded into the vector database for retrieval augmented generation.";

  try {
    console.log('📋 Test data:', {
      textLength: testText.length,
      text: testText.substring(0, 100) + '...'
    });

    const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        text: testText,
        documentId: 'test-doc-123',
        filename: 'test-document.txt',
        provider: 'openai'
      }),
    });

    console.log(`📡 Response Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error Response:', errorText);
      return;
    }

    const result = await response.json();
    console.log('✅ Success! Result:', result);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

async function testRAGQuery() {
  console.log('\n🔍 Testing RAG query...\n');

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/rag-query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        question: 'What is this document about?',
        filename: 'test-document.txt',
        provider: 'openai',
        topK: 3
      }),
    });

    console.log(`📡 Response Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error Response:', errorText);
      return;
    }

    const result = await response.json();
    console.log('✅ RAG Query Result:', {
      hasAnswer: !!result.answer,
      answerLength: result.answer?.length || 0,
      sourcesCount: result.sources?.length || 0,
      sources: result.sources?.map(s => ({
        filename: s.filename,
        score: s.score,
        textPreview: s.text?.substring(0, 50) + '...'
      }))
    });

  } catch (error) {
    console.error('❌ RAG query failed:', error.message);
  }
}

async function checkDatabaseChunks() {
  console.log('\n🗄️ Checking database chunks...\n');

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/document_chunks?select=filename,chunk_text,created_at&order=created_at.desc&limit=10`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
    });

    console.log(`📡 Response Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error Response:', errorText);
      return;
    }

    const chunks = await response.json();
    console.log(`✅ Found ${chunks.length} chunks in database:`);
    
    chunks.forEach((chunk, i) => {
      console.log(`  ${i + 1}. ${chunk.filename} (${chunk.created_at})`);
      console.log(`     Text: ${chunk.chunk_text?.substring(0, 100)}...`);
    });

  } catch (error) {
    console.error('❌ Database check failed:', error.message);
  }
}

async function main() {
  console.log('🚀 RAG Embedding Debug Test\n');
  console.log('=' .repeat(60));

  await testEmbeddingGeneration();
  await testRAGQuery();
  await checkDatabaseChunks();

  console.log('\n' + '='.repeat(60));
  console.log('🏁 Debug test completed');
}

main().catch(console.error);
