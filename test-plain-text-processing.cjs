#!/usr/bin/env node

/**
 * Test script to verify that plain text files are now handled correctly
 */

const SUPABASE_URL = 'https://joqnpibrfzqflyogrkht.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvcW5waWJyZnpxZmx5b2dyS2h0Iiwicm9sZSI6ImFub24iLCJpYWQiOjE3NjE2NDc5NTIsImV4cCI6MjA3NzIyMzk1Mn0.pIFvi2XRo1xmK3oZ-XBVpR6WvBye65a3ACE6wuFsxQk';

async function testPlainTextProcessing() {
  console.log('🧪 Testing Plain Text File Processing...\n');

  try {
    // Create a test plain text document
    const testText = `This is a test document for plain text processing.

Key Features:
- Plain text files should be processed directly
- No OCR conversion needed
- Perfect confidence score (1.0)
- Fast processing time

Technical Details:
- Content Type: text/plain
- Processing: Direct text extraction
- Provider: dots-ocr (with text handling)
- Expected Result: Full text extraction

This document contains important information about plain text processing capabilities.`;

    // Convert text to base64 data URL
    const base64Text = btoa(testText);
    const dataUrl = `data:text/plain;base64,${base64Text}`;

    console.log('📋 Test Document:');
    console.log(`  Content Type: text/plain`);
    console.log(`  Text Length: ${testText.length} characters`);
    console.log(`  Base64 Length: ${base64Text.length} characters`);
    console.log('');

    // Test 1: Process with dots-ocr
    console.log('🔍 Test 1: Processing with dots-ocr');
    const response1 = await fetch(`${SUPABASE_URL}/functions/v1/process-pdf-ocr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        documentId: 'test-text-doc-' + Date.now(),
        jobId: 'test-text-job-' + Date.now(),
        fileDataUrl: dataUrl,
        ocrProvider: 'dots-ocr'
      }),
    });

    const result1 = await response1.json();
    console.log('✅ Response 1:', {
      status: response1.status,
      success: result1.success,
      textLength: result1.extractedText?.length || 0,
      confidence: result1.metadata?.confidence,
      provider: result1.metadata?.provider,
      textPreview: result1.extractedText?.substring(0, 100) + '...'
    });

    // Test 2: Process with PaddleOCR
    console.log('\n🔍 Test 2: Processing with PaddleOCR');
    const response2 = await fetch(`${SUPABASE_URL}/functions/v1/process-pdf-ocr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        documentId: 'test-text-doc-2-' + Date.now(),
        jobId: 'test-text-job-2-' + Date.now(),
        fileDataUrl: dataUrl,
        ocrProvider: 'paddleocr'
      }),
    });

    const result2 = await response2.json();
    console.log('✅ Response 2:', {
      status: response2.status,
      success: result2.success,
      textLength: result2.extractedText?.length || 0,
      confidence: result2.metadata?.confidence,
      provider: result2.metadata?.provider,
      textPreview: result2.extractedText?.substring(0, 100) + '...'
    });

    console.log('\n🎯 Expected Results:');
    console.log('  - Status: 200 (success)');
    console.log('  - Text Length: Should match original text length');
    console.log('  - Confidence: 1.0 (perfect for plain text)');
    console.log('  - Provider: Should match the requested provider');
    console.log('  - Text Content: Should match the original text exactly');
    console.log('');

    // Analysis
    const test1Passed = result1.success && result1.extractedText?.length === testText.length && result1.metadata?.confidence === 1.0;
    const test2Passed = result2.success && result2.extractedText?.length === testText.length && result2.metadata?.confidence === 1.0;

    console.log('📊 Test Results:');
    console.log(`  Test 1 (dots-ocr): ${test1Passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`  Test 2 (PaddleOCR): ${test2Passed ? '✅ PASSED' : '❌ FAILED'}`);
    
    if (test1Passed && test2Passed) {
      console.log('\n🎉 All tests passed! Plain text processing is working correctly.');
    } else {
      console.log('\n⚠️ Some tests failed. Check the responses above for details.');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testPlainTextProcessing().catch(console.error);
