#!/usr/bin/env node

// Debug RAG query issue
// Run with: node test-rag-debug.js

const SUPABASE_URL = 'https://joqnpibrfzqflyogrkht.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvcW5waWJyZnpxZmx5b2dya2h0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0Mjg5NTIsImV4cCI6MjA3NjAwNDk1Mn0.pIFvi2XRo1xmK3oZ-XBVpR6WvBye65a3ACE6wuFsxQk';

async function debugRAGQuery() {
  try {
    console.log('🔍 Debugging RAG Query Issue...');
    
    // Test the exact same query that's failing in the frontend
    const testQuestions = [
      'What is the main topic of this document?',
      'What are the key requirements for tax filing?',
      'What are the deadlines?'
    ];
    
    for (const question of testQuestions) {
      console.log(`\n📝 Testing question: "${question}"`);
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/rag-query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
          'X-Request-Id': `debug-${Date.now()}-${Math.random()}`
        },
        body: JSON.stringify({
          question: question,
          filename: 'Tax filing in Austria in 2025.pdf',
          provider: 'openai',
          model: 'gpt-4o-mini',
          topK: 5
        })
      });

      console.log('📡 Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Response data:');
        console.log('  Answer:', data.answer?.substring(0, 100) + '...');
        console.log('  Sources:', data.sources?.length || 0);
        console.log('  Retrieved chunks:', data.retrievedChunks);
        console.log('  Debug info:', data.debug);
        
        if (data.answer && data.answer.includes('No relevant information found')) {
          console.log('❌ ISSUE: No relevant information found');
        } else {
          console.log('✅ SUCCESS: Found relevant information');
        }
      } else {
        const errorText = await response.text();
        console.log('❌ Error response:', errorText);
      }
    }
    
    // Test with different filename variations
    console.log('\n🔍 Testing different filename variations...');
    const filenameVariations = [
      'Tax filing in Austria in 2025.pdf',
      'tax filing in austria in 2025.pdf',
      'Tax filing in Austria',
      'austria tax filing'
    ];
    
    for (const filename of filenameVariations) {
      console.log(`\n📁 Testing filename: "${filename}"`);
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/rag-query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
          'X-Request-Id': `debug-filename-${Date.now()}`
        },
        body: JSON.stringify({
          question: 'What is this document about?',
          filename: filename,
          provider: 'openai',
          model: 'gpt-4o-mini',
          topK: 5
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`  Sources found: ${data.sources?.length || 0}`);
        if (data.sources?.length > 0) {
          console.log('✅ Found sources with this filename!');
          break;
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Debug test failed:', error.message);
  }
}

debugRAGQuery();
