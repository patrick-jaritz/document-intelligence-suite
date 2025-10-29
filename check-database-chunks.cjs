#!/usr/bin/env node

/**
 * Simple test to check if chunks are actually in the database
 */

const SUPABASE_URL = 'https://joqnpibrfzqflyogrkht.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvcW5waWJyZnpxZmx5b2dyS2h0Iiwicm9sZSI6ImFub24iLCJpYWQiOjE3NjE2NDc5NTIsImV4cCI6MjA3NzIyMzk1Mn0.pIFvi2XRo1xmK3oZ-XBVpR6WvBye65a3ACE6wuFsxQk';

async function checkDatabaseChunks() {
  console.log('🔍 Checking Database Chunks...\n');

  try {
    // Test 1: Check if we can query the database at all
    console.log('📋 Test 1: Basic database query');
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/document_chunks?select=count`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Prefer': 'count=exact'
      },
    });

    console.log('✅ Database response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });

    const countText = await response.text();
    console.log('✅ Count result:', countText);

    // Test 2: Try to get actual chunks
    console.log('\n📋 Test 2: Getting actual chunks');
    
    const chunksResponse = await fetch(`${SUPABASE_URL}/rest/v1/document_chunks?select=id,filename,document_id,chunk_index,chunk_text&limit=5`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
    });

    console.log('✅ Chunks response:', {
      status: chunksResponse.status,
      statusText: chunksResponse.statusText
    });

    const chunksText = await chunksResponse.text();
    console.log('✅ Chunks result:', chunksText);

    // Test 3: Check rag_documents table
    console.log('\n📋 Test 3: Checking rag_documents table');
    
    const docsResponse = await fetch(`${SUPABASE_URL}/rest/v1/rag_documents?select=id,filename,created_at&limit=5`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
    });

    console.log('✅ Documents response:', {
      status: docsResponse.status,
      statusText: docsResponse.statusText
    });

    const docsText = await docsResponse.text();
    console.log('✅ Documents result:', docsText);

    console.log('\n🎯 Analysis:');
    console.log('1. If status 401: Authentication issue');
    console.log('2. If status 200 with empty results: No data in database');
    console.log('3. If status 200 with data: Database has chunks');
    console.log('4. If status 404: Table doesn\'t exist');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
checkDatabaseChunks().catch(console.error);