#!/usr/bin/env node

/**
 * Debug script to check why RAG query is falling back to old documents
 * instead of finding the newly processed "test-plain-text.txt"
 */

const SUPABASE_URL = 'https://joqnpibrfzqflyogrkht.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvcW5waWJyZnpxZmx5b2dyS2h0Iiwicm9sZSI6ImFub24iLCJpYWQiOjE3NjE2NDc5NTIsImV4cCI6MjA3NzIyMzk1Mn0.pIFvi2XRo1xmK3oZ-XBVpR6WvBye65a3ACE6wuFsxQk';

async function debugRAGFilenameIssue() {
  console.log('🔍 Debugging RAG Filename Issue...\n');

  try {
    // Step 1: Check what documents exist in the database
    console.log('📋 Step 1: Checking existing documents in database');
    
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    const { data: documents, error: docError } = await supabase
      .from('rag_documents')
      .select('id, filename, upload_date, metadata')
      .order('upload_date', { ascending: false })
      .limit(10);
    
    if (docError) {
      console.error('❌ Error fetching documents:', docError.message);
      return;
    }
    
    console.log('✅ Documents in database:');
    documents.forEach((doc, index) => {
      console.log(`  ${index + 1}. ID: ${doc.id}`);
      console.log(`     Filename: "${doc.filename}"`);
      console.log(`     Upload Date: ${doc.upload_date}`);
      console.log(`     Metadata: ${JSON.stringify(doc.metadata)}`);
      console.log('');
    });

    // Step 2: Check document chunks for the test file
    console.log('📋 Step 2: Checking document chunks');
    
    const { data: chunks, error: chunkError } = await supabase
      .from('document_chunks')
      .select('id, document_id, chunk_text, metadata')
      .limit(20);
    
    if (chunkError) {
      console.error('❌ Error fetching chunks:', chunkError.message);
      return;
    }
    
    console.log('✅ Recent chunks:');
    chunks.forEach((chunk, index) => {
      const textPreview = chunk.chunk_text?.substring(0, 100) + '...';
      console.log(`  ${index + 1}. Document ID: ${chunk.document_id}`);
      console.log(`     Text Preview: "${textPreview}"`);
      console.log(`     Metadata: ${JSON.stringify(chunk.metadata)}`);
      console.log('');
    });

    // Step 3: Test RAG query with different parameters
    console.log('📋 Step 3: Testing RAG query with different parameters');
    
    // Test 1: Query with filename filter
    console.log('🔍 Test 1: Query with filename "test-plain-text.txt"');
    const query1 = await fetch(`${SUPABASE_URL}/functions/v1/rag-query`, {
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
    
    const result1 = await query1.json();
    console.log('✅ Query with filename filter:', {
      status: query1.status,
      hasAnswer: !!result1.answer,
      sourcesCount: result1.sources?.length || 0,
      warning: result1.warning,
      sources: result1.sources?.map(s => ({
        score: s.score,
        textPreview: s.text?.substring(0, 100) + '...'
      })) || []
    });

    // Test 2: Query with documentId filter (if we have a recent document)
    if (documents.length > 0) {
      const recentDoc = documents[0];
      console.log(`\n🔍 Test 2: Query with documentId "${recentDoc.id}"`);
      
      const query2 = await fetch(`${SUPABASE_URL}/functions/v1/rag-query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          question: 'What is this document about?',
          filename: null,
          documentId: recentDoc.id,
          provider: 'openai',
          topK: 3
        }),
      });
      
      const result2 = await query2.json();
      console.log('✅ Query with documentId filter:', {
        status: query2.status,
        hasAnswer: !!result2.answer,
        sourcesCount: result2.sources?.length || 0,
        warning: result2.warning,
        sources: result2.sources?.map(s => ({
          score: s.score,
          textPreview: s.text?.substring(0, 100) + '...'
        })) || []
      });
    }

    // Test 3: Query without any filters (should return all documents)
    console.log('\n🔍 Test 3: Query without filters (all documents)');
    const query3 = await fetch(`${SUPABASE_URL}/functions/v1/rag-query`, {
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
    
    const result3 = await query3.json();
    console.log('✅ Query without filters:', {
      status: query3.status,
      hasAnswer: !!result3.answer,
      sourcesCount: result3.sources?.length || 0,
      warning: result3.warning,
      sources: result3.sources?.map(s => ({
        score: s.score,
        textPreview: s.text?.substring(0, 100) + '...'
      })) || []
    });

    console.log('\n🎯 Analysis:');
    console.log('1. Check if "test-plain-text.txt" appears in the documents list');
    console.log('2. Check if the document has associated chunks');
    console.log('3. Compare the results of different query approaches');
    console.log('4. If filename filter fails but documentId works, the issue is in filename matching');
    console.log('5. If both fail, the document might not be processed yet');

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

// Run the debug
debugRAGFilenameIssue().catch(console.error);
