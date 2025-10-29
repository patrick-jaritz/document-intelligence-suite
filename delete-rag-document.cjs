#!/usr/bin/env node

/**
 * Script to delete RAG documents and their chunks from the database
 * 
 * Usage:
 *   node delete-rag-document.cjs <documentId>
 *   node delete-rag-document.cjs --all-mock
 *   node delete-rag-document.cjs --list
 */

const SUPABASE_URL = 'https://joqnpibrfzqflyogrkht.supabase.co';

// You'll need to get your service role key from Supabase Dashboard
// Settings → API → service_role key (secret)
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function deleteDocument(documentId) {
  if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable not set');
    console.log('\n📋 To get your service role key:');
    console.log('   1. Go to: https://supabase.com/dashboard/project/joqnpibrfzqflyogrkht/settings/api');
    console.log('   2. Copy the "service_role" key (secret key)');
    console.log('   3. Run: export SUPABASE_SERVICE_ROLE_KEY="your-key-here"');
    console.log('   4. Then run this script again\n');
    process.exit(1);
  }

  try {
    console.log(`🗑️  Deleting document: ${documentId}\n`);

    // Step 1: Delete chunks first (foreign key constraint)
    console.log('📋 Step 1: Deleting document chunks...');
    const deleteChunksResponse = await fetch(`${SUPABASE_URL}/rest/v1/document_chunks?document_id=eq.${documentId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
        'Prefer': 'return=representation'
      },
    });

    if (!deleteChunksResponse.ok) {
      const errorText = await deleteChunksResponse.text();
      console.error('❌ Failed to delete chunks:', errorText);
      return;
    }

    const deletedChunks = await deleteChunksResponse.json();
    console.log(`✅ Deleted ${Array.isArray(deletedChunks) ? deletedChunks.length : '?'} chunks`);

    // Step 2: Delete the document record
    console.log('\n📋 Step 2: Deleting document record...');
    const deleteDocResponse = await fetch(`${SUPABASE_URL}/rest/v1/rag_documents?id=eq.${documentId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
        'Prefer': 'return=representation'
      },
    });

    if (!deleteDocResponse.ok) {
      const errorText = await deleteDocResponse.text();
      console.error('❌ Failed to delete document:', errorText);
      return;
    }

    const deletedDoc = await deleteDocResponse.json();
    console.log(`✅ Deleted document record`);

    console.log('\n🎉 Document deleted successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function listDocuments() {
  if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable not set');
    process.exit(1);
  }

  try {
    console.log('📋 Listing all RAG documents...\n');

    const response = await fetch(`${SUPABASE_URL}/rest/v1/rag_documents?select=id,filename,upload_date,embedding_provider&order=upload_date.desc&limit=20`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to list documents:', errorText);
      return;
    }

    const documents = await response.json();
    
    console.log(`Found ${documents.length} documents:\n`);
    documents.forEach((doc, index) => {
      console.log(`${index + 1}. ID: ${doc.id}`);
      console.log(`   Filename: ${doc.filename}`);
      console.log(`   Uploaded: ${doc.upload_date}`);
      console.log(`   Provider: ${doc.embedding_provider}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function deleteAllMockDocuments() {
  if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable not set');
    process.exit(1);
  }

  try {
    console.log('🗑️  Finding documents with mock content...\n');

    // First, find chunks with mock content patterns
    const chunksResponse = await fetch(`${SUPABASE_URL}/rest/v1/document_chunks?select=document_id&chunk_text=like.*Document%20Layout%20Analysis*&limit=100`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
      },
    });

    if (!chunksResponse.ok) {
      console.error('❌ Failed to search chunks. Using alternative method...');
      console.log('\n💡 Alternative: Use Supabase Dashboard SQL Editor');
      console.log('   Run this query to find mock documents:');
      console.log(`   SELECT DISTINCT document_id FROM document_chunks WHERE chunk_text LIKE '%Document Layout Analysis%';`);
      return;
    }

    const chunks = await chunksResponse.json();
    const documentIds = [...new Set(chunks.map(c => c.document_id).filter(Boolean))];
    
    console.log(`Found ${documentIds.length} documents with mock content:\n`);
    documentIds.forEach((id, index) => {
      console.log(`  ${index + 1}. ${id}`);
    });

    if (documentIds.length === 0) {
      console.log('✅ No documents with mock content found!');
      return;
    }

    console.log(`\n⚠️  About to delete ${documentIds.length} documents...`);
    console.log('   This will delete all chunks and document records for these documents.');
    console.log('   Type "yes" to confirm: ');
    
    // In a real script, you'd read from stdin, but for simplicity:
    console.log('\n📋 To delete these documents, run:');
    documentIds.forEach(id => {
      console.log(`   node delete-rag-document.cjs ${id}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log(`
📋 RAG Document Deletion Tool

Usage:
  node delete-rag-document.cjs <documentId>    Delete a specific document
  node delete-rag-document.cjs --list          List all documents
  node delete-rag-document.cjs --all-mock       Find documents with mock content

Examples:
  node delete-rag-document.cjs d57ab9b9-fa9c-40b7-b9de-7b2797afb3d9
  node delete-rag-document.cjs --list
  `);
  process.exit(0);
}

if (args[0] === '--list') {
  listDocuments().catch(console.error);
} else if (args[0] === '--all-mock') {
  deleteAllMockDocuments().catch(console.error);
} else {
  deleteDocument(args[0]).catch(console.error);
}
