#!/usr/bin/env node

// Test all OCR providers to see which one works best for your document
// Run with: node test-all-ocr-providers.js

const SUPABASE_URL = 'https://joqnpibrfzqflyogrkht.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvcW5waWJyZnpxZmx5b2dya2h0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0Mjg5NTIsImV4cCI6MjA3NjAwNDk1Mn0.pIFvi2XRo1xmK3oZ-XBVpR6WvBye65a3ACE6wuFsxQk';

async function testAllOCRProviders() {
  try {
    console.log('🔍 Testing all OCR providers...');
    console.log('📄 Using a test document to see which providers work\n');
    
    // Create a simple test document (small base64)
    const testDocument = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    
    const providers = [
      { name: 'OpenAI Vision', value: 'openai-vision', description: 'Best for large PDFs' },
      { name: 'Google Vision', value: 'google-vision', description: 'Good for images' },
      { name: 'Tesseract', value: 'tesseract', description: 'Browser-based, no limits' },
      { name: 'Mistral Vision', value: 'mistral', description: 'Alternative option' },
      { name: 'OCR.space', value: 'ocr-space', description: 'Free tier limited' }
    ];
    
    const results = [];
    
    for (const provider of providers) {
      console.log(`\n🧪 Testing ${provider.name}...`);
      
      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/process-pdf-ocr`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'apikey': SUPABASE_ANON_KEY,
            'X-Request-Id': `test-${provider.value}-${Date.now()}`
          },
          body: JSON.stringify({
            documentId: `test-${provider.value}`,
            jobId: `test-job-${provider.value}`,
            fileUrl: 'test-url',
            ocrProvider: provider.value,
            fileDataUrl: testDocument
          })
        });

        const data = await response.json();
        
        const result = {
          provider: provider.name,
          status: response.status,
          success: response.ok,
          hasText: data.extractedText && data.extractedText.length > 0,
          textLength: data.extractedText?.length || 0,
          description: provider.description
        };
        
        results.push(result);
        
        if (response.ok) {
          console.log(`  ✅ Status: ${response.status}`);
          console.log(`  📝 Text length: ${result.textLength} chars`);
          console.log(`  🔧 Provider: ${data.metadata?.provider || 'unknown'}`);
          
          if (result.hasText) {
            console.log(`  ✅ SUCCESS: Text extracted successfully`);
          } else {
            console.log(`  ⚠️  No text extracted (but API call succeeded)`);
          }
        } else {
          console.log(`  ❌ Status: ${response.status}`);
          console.log(`  ❌ Error: ${data.error || 'Unknown error'}`);
        }
        
      } catch (error) {
        console.log(`  ❌ Failed: ${error.message}`);
        results.push({
          provider: provider.name,
          status: 'ERROR',
          success: false,
          hasText: false,
          textLength: 0,
          description: provider.description,
          error: error.message
        });
      }
    }
    
    // Summary
    console.log('\n📊 OCR Provider Test Summary:');
    console.log('═'.repeat(60));
    
    results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      const textStatus = result.hasText ? '📝' : '📄';
      console.log(`${status} ${result.provider.padEnd(15)} | ${result.status.toString().padEnd(6)} | ${textStatus} ${result.textLength} chars | ${result.description}`);
    });
    
    console.log('\n🎯 Recommendations:');
    const workingProviders = results.filter(r => r.success && r.hasText);
    
    if (workingProviders.length > 0) {
      console.log('✅ Working providers for your document:');
      workingProviders.forEach(provider => {
        console.log(`  • ${provider.provider}: ${provider.description}`);
      });
    } else {
      console.log('❌ No providers successfully extracted text from the test document');
      console.log('💡 Try uploading your actual document to test with real content');
    }
    
    console.log('\n🚀 Next Steps:');
    console.log('1. Go to your frontend');
    console.log('2. Select "Extract Data" mode');
    console.log('3. Choose the best working provider from the dropdown');
    console.log('4. Upload your document and test');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAllOCRProviders();
