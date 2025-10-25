#!/usr/bin/env node

// Debug why new document isn't being found
// Run with: node debug-new-document.js

const SUPABASE_URL = 'https://joqnpibrfzqflyogrkht.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvcW5waWJyZnpxZmx5b2dya2h0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0Mjg5NTIsImV4cCI6MjA3NjAwNDk1Mn0.pIFvi2XRo1xmK3oZ-XBVpR6WvBye65a3ACE6wuFsxQk';

async function debugNewDocument() {
  try {
    console.log('🔍 Debugging new document issue...');
    
    // Test 1: Check if the new document exists in Pinecone
    console.log('\n1️⃣ Testing if new document exists in Pinecone...');
    const response1 = await fetch(`${SUPABASE_URL}/functions/v1/rag-query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'X-Request-Id': `debug-new-doc-${Date.now()}`
      },
      body: JSON.stringify({
        question: 'What is this document about?',
        filename: 'Intelligence-and-Security-Committee-of-Parliament-Iran.pdf',
        provider: 'openai',
        model: 'gpt-4o-mini',
        topK: 5
      })
    });
    
    if (response1.ok) {
      const data1 = await response1.json();
      console.log('📊 Results for new document:');
      console.log('  Sources found:', data1.sources?.length || 0);
      console.log('  Retrieved chunks:', data1.retrievedChunks || 0);
      console.log('  Answer preview:', data1.answer?.substring(0, 150) + '...');
      
      if (data1.sources?.length > 0) {
        console.log('  ✅ New document found in Pinecone!');
        console.log('  📝 First source preview:', data1.sources[0]?.text?.substring(0, 100) + '...');
      } else {
        console.log('  ❌ New document NOT found in Pinecone');
      }
    }
    
    // Test 2: Check what documents are actually in Pinecone
    console.log('\n2️⃣ Checking what documents exist in Pinecone...');
    const response2 = await fetch(`${SUPABASE_URL}/functions/v1/rag-query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'X-Request-Id': `debug-all-docs-${Date.now()}`
      },
      body: JSON.stringify({
        question: 'What documents are available?',
        filename: 'nonexistent-filename.pdf', // This will trigger the fallback search
        provider: 'openai',
        model: 'gpt-4o-mini',
        topK: 10
      })
    });
    
    if (response2.ok) {
      const data2 = await response2.json();
      console.log('📊 All documents in Pinecone:');
      console.log('  Total sources found:', data2.sources?.length || 0);
      
      if (data2.sources?.length > 0) {
        console.log('  📁 Document filenames found:');
        const filenames = [...new Set(data2.sources.map(s => s.filename))];
        filenames.forEach(filename => {
          console.log(`    - ${filename}`);
        });
        
        // Check if our new document is in the list
        const hasNewDoc = filenames.some(f => f.includes('Intelligence-and-Security-Committee') || f.includes('Iran'));
        if (hasNewDoc) {
          console.log('  ✅ New document IS in Pinecone!');
        } else {
          console.log('  ❌ New document NOT in Pinecone - need to reprocess it');
        }
      }
    }
    
    // Test 3: Test with a very specific question about Iran/Intelligence
    console.log('\n3️⃣ Testing with Iran-specific question...');
    const response3 = await fetch(`${SUPABASE_URL}/functions/v1/rag-query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'X-Request-Id': `debug-iran-question-${Date.now()}`
      },
      body: JSON.stringify({
        question: 'What does the Intelligence and Security Committee say about Iran?',
        filename: 'Intelligence-and-Security-Committee-of-Parliament-Iran.pdf',
        provider: 'openai',
        model: 'gpt-4o-mini',
        topK: 5
      })
    });
    
    if (response3.ok) {
      const data3 = await response3.json();
      console.log('📊 Iran-specific question results:');
      console.log('  Sources found:', data3.sources?.length || 0);
      console.log('  Answer preview:', data3.answer?.substring(0, 150) + '...');
      
      if (data3.answer && data3.answer.includes('Austria') && !data3.answer.includes('Iran')) {
        console.log('  ❌ Still getting Austrian tax info instead of Iran document');
        console.log('  🎯 DIAGNOSIS: New document not properly stored in Pinecone');
      } else if (data3.answer && data3.answer.includes('Iran')) {
        console.log('  ✅ Found Iran-related content!');
      }
    }
    
    console.log('\n🎯 NEXT STEPS:');
    console.log('If the new document is NOT in Pinecone, you need to:');
    console.log('1. Re-upload the document via the frontend');
    console.log('2. Make sure it gets processed and stored in Pinecone');
    console.log('3. Check the OCR and embedding generation worked correctly');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugNewDocument();
