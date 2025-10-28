// Test generate-embeddings function directly
const testGenerateEmbeddings = async () => {
  console.log('🧪 Testing generate-embeddings function directly...');
  
  try {
    const testText = "This is a test document for RAG processing. It contains sample text that should be chunked and embedded for retrieval.";
    
    const response = await fetch('https://joqnpibrfzqflyogrkht.supabase.co/functions/v1/generate-embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvcW5waWJyZnpxZmx5b2dya2h0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0Mjg5NTIsImV4cCI6MjA3NjAwNDk1Mn0.pIFvi2XRo1xmK3oZ-XBVpR6WvBye65a3ACE6wuFsxQk',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvcW5waWJyZnpxZmx5b2dya2h0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0Mjg5NTIsImV4cCI6MjA3NjAwNDk1Mn0.pIFvi2XRo1xmK3oZ-XBVpR6WvBye65a3ACE6wuFsxQk'
      },
      body: JSON.stringify({
        text: testText,
        documentId: crypto.randomUUID(),
        filename: 'test-document.txt',
        provider: 'openai'
      })
    });

    console.log('📊 Generate embeddings response status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Generate embeddings result:', {
        success: result.success,
        chunkCount: result.chunkCount,
        chunksCreated: result.chunksCreated,
        documentId: result.documentId,
        error: result.error
      });
    } else {
      const errorText = await response.text();
      console.error('❌ Generate embeddings failed:', response.status, errorText);
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Run the test
testGenerateEmbeddings();
