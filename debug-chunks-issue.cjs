#!/usr/bin/env node

/**
 * Debug script to check what chunks exist for a specific document
 */

const SUPABASE_URL = 'https://joqnpibrfzqflyogrkht.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvcW5waWJyZnpxZmx5b2dyS2h0Iiwicm9sZSI6ImFub24iLCJpYWQiOjE3NjE2NDc5NTIsImV4cCI6MjA3NzIyMzk1Mn0.pIFvi2XRo1xmK3oZ-XBVpR6WvBye65a3ACE6wuFsxQk';

async function debugDocumentChunks() {
  console.log('🔍 Debugging Document Chunks Issue...\n');

  try {
    // Get the last processed document ID from rag_documents
    console.log('📋 Step 1: Checking recent documents');
    
    const docsResponse = await fetch(`${SUPABASE_URL}/functions/v1/rag-query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        question: 'test',
        documentId: null,
        filename: null,
        provider: 'openai',
        topK: 1
      }),
    });

    const result = await docsResponse.json();
    
    console.log('✅ All-documents query result:', {
      status: docsResponse.status,
      hasAnswer: !!result.answer,
      sourcesCount: result.sources?.length || 0,
      sources: result.sources?.map((s: any) => ({
        score: s.score,
        filename: s.filename,
        textPreview: s.text?.substring(0, 100) + '...'
      })) || []
    });

    console.log('\n🎯 This shows what documents have chunks in the database');
    console.log('If you see chunks from different documents, it means chunks are stored correctly');
    console.log('The issue is likely in how documentId filtering is applied');

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

// Run the debug
debugDocumentChunks().catch(console.error);
