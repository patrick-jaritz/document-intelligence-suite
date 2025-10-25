#!/usr/bin/env node

// Test filename mismatch issue
// Run with: node test-filename-mismatch.js

const SUPABASE_URL = 'https://joqnpibrfzqflyogrkht.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvcW5waWJyZnpxZmx5b2dya2h0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0Mjg5NTIsImV4cCI6MjA3NjAwNDk1Mn0.pIFvi2XRo1xmK3oZ-XBVpR6WvBye65a3ACE6wuFsxQk';

async function testFilenameMismatch() {
  try {
    console.log('🔍 Testing filename mismatch issue...');
    
    // Test different filename variations that might come from frontend
    const testFilenames = [
      'Tax filing in Austria in 2025.pdf',  // This works (from our test)
      'test-document.pdf',                   // This might be what frontend sends
      'document.pdf',                        // Generic name
      'my-file.pdf',                         // User uploaded file
      'unknown.pdf'                          // Random filename
    ];
    
    const testQuestion = 'What is this document about?';
    
    for (const filename of testFilenames) {
      console.log(`\n📁 Testing with filename: "${filename}"`);
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/rag-query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
          'X-Request-Id': `filename-test-${Date.now()}-${Math.random()}`
        },
        body: JSON.stringify({
          question: testQuestion,
          filename: filename,
          provider: 'openai',
          model: 'gpt-4o-mini',
          topK: 5
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        const hasSources = data.sources?.length > 0;
        const hasAnswer = data.answer && !data.answer.includes('No relevant information found');
        
        console.log(`  Sources: ${data.sources?.length || 0}`);
        console.log(`  Retrieved chunks: ${data.retrievedChunks || 0}`);
        console.log(`  Has valid answer: ${hasAnswer ? '✅' : '❌'}`);
        
        if (!hasSources && !hasAnswer) {
          console.log('  ❌ ISSUE: No sources found for this filename');
        } else {
          console.log('  ✅ SUCCESS: Found relevant information');
        }
      } else {
        console.log('  ❌ Error:', response.status);
      }
    }
    
    console.log('\n🎯 DIAGNOSIS:');
    console.log('If only "Tax filing in Austria in 2025.pdf" works, then the issue is:');
    console.log('1. Frontend is sending a different filename than what\'s stored in Pinecone');
    console.log('2. Need to either:');
    console.log('   a) Store documents with consistent filenames');
    console.log('   b) Make RAG query more flexible with filename matching');
    console.log('   c) Show user the exact filename being searched');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testFilenameMismatch();
