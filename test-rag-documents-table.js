// Test rag_documents table access
const testRagDocumentsTable = async () => {
  console.log('🧪 Testing rag_documents table access...');
  
  try {
    const testDocumentId = crypto.randomUUID();
    const testFilename = `test-document-${Date.now()}.md`;
    
    // Test inserting a document record
    const response = await fetch('https://joqnpibrfzqflyogrkht.supabase.co/rest/v1/rag_documents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvcW5waWJyZnpxZmx5b2dya2h0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0Mjg5NTIsImV4cCI6MjA3NjAwNDk1Mn0.pIFvi2XRo1xmK3oZ-XBVpR6WvBye65a3ACE6wuFsxQk',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvcW5waWJyZnpxZmx5b2dya2h0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0Mjg5NTIsImV4cCI6MjA3NjAwNDk1Mn0.pIFvi2XRo1xmK3oZ-XBVpR6WvBye65a3ACE6wuFsxQk'
      },
      body: JSON.stringify({
        id: testDocumentId,
        filename: testFilename,
        upload_date: new Date().toISOString(),
        embedding_provider: 'openai',
        metadata: {
          test: true,
          timestamp: Date.now()
        }
      })
    });

    console.log('📊 Insert response status:', response.status);
    
    if (response.ok) {
      console.log('✅ Document record created successfully (status 201)');
      
      // Clean up - delete the test record
      const deleteResponse = await fetch(`https://joqnpibrfzqflyogrkht.supabase.co/rest/v1/rag_documents?id=eq.${testDocumentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvcW5waWJyZnpxZmx5b2dya2h0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0Mjg5NTIsImV4cCI6MjA3NjAwNDk1Mn0.pIFvi2XRo1xmK3oZ-XBVpR6WvBye65a3ACE6wuFsxQk',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvcW5waWJyZnpxZmx5b2dya2h0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0Mjg5NTIsImV4cCI6MjA3NjAwNDk1Mn0.pIFvi2XRo1xmK3oZ-XBVpR6WvBye65a3ACE6wuFsxQk'
        }
      });
      
      if (deleteResponse.ok) {
        console.log('✅ Test record cleaned up successfully');
      } else {
        console.log('⚠️ Failed to clean up test record');
      }
    } else {
      const errorText = await response.text();
      console.error('❌ Failed to create document record:', response.status, errorText);
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Run the test
testRagDocumentsTable();
