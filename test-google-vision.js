#!/usr/bin/env node

// Test Google Vision integration
// Run with: node test-google-vision.js

const SUPABASE_URL = 'https://joqnpibrfzqflyogrkht.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvcW5waWJyZnpxZmx5b2dya2h0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0Mjg5NTIsImV4cCI6MjA3NjAwNDk1Mn0.pIFvi2XRo1xmK3oZ-XBVpR6WvBye65a3ACE6wuFsxQk';

async function testGoogleVisionOCR() {
  try {
    console.log('🔍 Testing Google Vision OCR integration...');
    
    // Create a simple test image (1x1 pixel PNG in base64)
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const testDataUrl = `data:image/png;base64,${testImageBase64}`;
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/process-pdf-ocr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'X-Request-Id': `test-${Date.now()}`
      },
      body: JSON.stringify({
        documentId: crypto.randomUUID(),
        jobId: crypto.randomUUID(),
        fileUrl: 'test-url',
        ocrProvider: 'google-vision',
        fileDataUrl: testDataUrl
      })
    });

    console.log('📡 Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error response:', errorText);
      return;
    }

    const data = await response.json();
    
    console.log('✅ Google Vision OCR Response:');
    console.log('📝 Extracted Text:', data.extractedText);
    console.log('📊 Metadata:', data.metadata);
    console.log('⏱️ Processing Time:', data.processingTime);
    console.log('🆔 Request ID:', data.requestId);
    
    if (data.extractedText && !data.extractedText.includes('demo mode')) {
      console.log('\n🎉 Google Vision is working correctly!');
      console.log('✅ API key is properly configured');
      console.log('✅ OCR processing is functional');
    } else {
      console.log('\n⚠️ Google Vision might still be in demo mode');
      console.log('🔧 Check if the API key is properly set in Supabase secrets');
    }

    console.log('\n🧪 Test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testGoogleVisionOCR();
