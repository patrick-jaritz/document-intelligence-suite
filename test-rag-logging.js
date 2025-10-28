// Test RAG processing with detailed logging
const testRAGProcessing = async () => {
  console.log('🧪 Testing RAG processing with detailed logging...');
  
  try {
    // Create a simple test document
    const testText = "This is a test document for RAG processing. It contains sample text that should be chunked and embedded for retrieval.";
    
    const response = await fetch('https://joqnpibrfzqflyogrkht.supabase.co/functions/v1/process-rag-markdown', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvcW5waWJyZnpxZmx5b2dya2h0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0Mjg5NTIsImV4cCI6MjA3NjAwNDk1Mn0.pIFvi2XRo1xmK3oZ-XBVpR6WvBye65a3ACE6wuFsxQk',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvcW5waWJyZnpxZmx5b2dya2h0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0Mjg5NTIsImV4cCI6MjA3NjAwNDk1Mn0.pIFvi2XRo1xmK3oZ-XBVpR6WvBye65a3ACE6wuFsxQk'
      },
      body: JSON.stringify({
        documentId: 'test-doc-' + Date.now(),
        jobId: 'test-job-' + Date.now(),
        inputType: 'text',
        ocrProvider: 'dots-ocr',
        fileData: testText,
        llmModel: 'gpt-4o-mini',
        enableMarkdownConversion: true,
        convertTables: true,
        preserveFormatting: true,
        generateEmbeddings: true,
        embeddingProvider: 'openai',
        chunkSize: 1000,
        chunkOverlap: 200
      })
    });

    console.log('📊 Response status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ RAG processing result:', {
        success: result.success,
        embeddingsGenerated: result.embeddingsGenerated,
        chunksCreated: result.chunksCreated,
        processingTime: result.processingTime,
        extractedTextLength: result.extractedText?.length,
        markdownTextLength: result.markdownText?.length
      });
    } else {
      const errorText = await response.text();
      console.error('❌ RAG processing failed:', response.status, errorText);
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Run the test
testRAGProcessing();
