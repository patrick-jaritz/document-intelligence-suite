#!/usr/bin/env node

/**
 * Debug script to check what documents and chunks are in the database
 * This will help us understand the filename mismatch issue
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://joqnpibrfzqflyogrkht.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvcW5waWJyZnpxZmx5b2dyS2h0Iiwicm9sZSI6ImFub24iLCJpYWQiOjE3NjE2NDc5NTIsImV4cCI6MjA3NzIyMzk1Mn0.pIFvi2XRo1xmK3oZ-XBVpR6WvBye65a3ACE6wuFsxQk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function debugDatabase() {
  console.log('🔍 Debugging RAG Database Contents...\n');

  try {
    // Check rag_documents table
    console.log('📋 Checking rag_documents table:');
    const { data: documents, error: docError } = await supabase
      .from('rag_documents')
      .select('*')
      .order('upload_date', { ascending: false })
      .limit(10);

    if (docError) {
      console.error('❌ Error fetching documents:', docError.message);
    } else {
      console.log(`✅ Found ${documents.length} documents:`);
      documents.forEach((doc, index) => {
        console.log(`  ${index + 1}. ID: ${doc.id}`);
        console.log(`     Filename: ${doc.filename}`);
        console.log(`     Upload Date: ${doc.upload_date}`);
        console.log(`     Provider: ${doc.embedding_provider}`);
        console.log('');
      });
    }

    // Check document_chunks table
    console.log('📋 Checking document_chunks table:');
    const { data: chunks, error: chunkError } = await supabase
      .from('document_chunks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (chunkError) {
      console.error('❌ Error fetching chunks:', chunkError.message);
    } else {
      console.log(`✅ Found ${chunks.length} chunks:`);
      
      // Group by filename
      const chunksByFilename = {};
      chunks.forEach(chunk => {
        const filename = chunk.filename || 'unknown';
        if (!chunksByFilename[filename]) {
          chunksByFilename[filename] = [];
        }
        chunksByFilename[filename].push(chunk);
      });

      Object.keys(chunksByFilename).forEach(filename => {
        const fileChunks = chunksByFilename[filename];
        console.log(`  📄 ${filename}:`);
        console.log(`     Chunks: ${fileChunks.length}`);
        console.log(`     Document IDs: ${[...new Set(fileChunks.map(c => c.document_id))].join(', ')}`);
        console.log(`     Latest chunk preview: ${fileChunks[0].chunk_text?.substring(0, 100)}...`);
        console.log('');
      });
    }

    // Check what the frontend should be sending
    console.log('🔍 Analysis:');
    console.log('The frontend is likely sending:');
    console.log('  - filename: undefined (when selectedDocument === "all")');
    console.log('  - filename: selectedDocument (when a specific document is selected)');
    console.log('');
    console.log('But the actual filenames in the database are:');
    if (documents && documents.length > 0) {
      documents.forEach(doc => {
        console.log(`  - ${doc.filename}`);
      });
    }
    console.log('');
    console.log('This explains why the RAG query falls back to searching ALL documents!');

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

// Run the debug
debugDatabase().catch(console.error);
