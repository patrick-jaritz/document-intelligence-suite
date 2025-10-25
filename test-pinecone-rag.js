#!/usr/bin/env node

// Test Pinecone RAG functionality
// Run with: node test-pinecone-rag.js

const SUPABASE_URL = 'https://joqnpibrfzqflyogrkht.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvcW5waWJyZnpxZmx5b2dya2h0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0Mjg5NTIsImV4cCI6MjA3NjAwNDk1Mn0.pIFvi2XRo1xmK3oZ-XBVpR6WvBye65a3ACE6wuFsxQk';

async function testRAG() {
  try {
    console.log('🧪 Testing Pinecone RAG...');
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/rag-query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        question: 'What are the key requirements for tax filing in Austria?',
        filename: 'Tax filing in Austria in 2025.pdf',
        provider: 'openai',
        model: 'gpt-4o-mini',
        topK: 5
      })
    });

    console.log('📡 Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error response:', errorText);
      return;
    }

    const data = await response.json();
    
    console.log('✅ RAG Response:');
    console.log('📝 Answer:', data.answer);
    console.log('📊 Sources found:', data.sources?.length || 0);
    console.log('🔢 Retrieved chunks:', data.retrievedChunks);
    console.log('🤖 Model:', data.model);
    console.log('🔧 Provider:', data.provider);
    
    if (data.sources && data.sources.length > 0) {
      console.log('\n📚 Top source scores:');
      data.sources.slice(0, 3).forEach((source, i) => {
        console.log(`  ${i + 1}. Score: ${source.score?.toFixed(3)} - "${source.text?.substring(0, 100)}..."`);
      });
    }

    console.log('\n🎉 Pinecone RAG test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testRAG();
