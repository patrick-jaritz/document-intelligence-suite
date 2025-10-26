#!/usr/bin/env node

/**
 * Test script for the Markdown Converter Edge Function
 * Tests various document types and conversion scenarios
 */

const SUPABASE_URL = 'https://joqnpibrfzqflyogrkht.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvcW5waWJyZnpxZmx5b2dya2h0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0Mjg5NTIsImV4cCI6MjA3NjAwNDk1Mn0.pIFvi2XRo1xmK3oZ-XBVpR6WvBye65a3ACE6wuFsxQk';

async function testMarkdownConverter() {
  console.log('🧪 Testing Markdown Converter Edge Function\n');

  const testCases = [
    {
      name: 'PDF Document Test',
      payload: {
        fileData: 'JVBERi0xLjQKJcfsj6IKNSAwIG9iago8PAovVHlwZSAvUGFnZQovUGFyZW50IDMgMCBSCi9NZWRpYUJveCBbMCAwIDU5NSA4NDJdCi9SZXNvdXJjZXMgPDwKL0ZvbnQgPDwKL0YxIDIgMCBSCj4+Cj4+Ci9Db250ZW50cyA0IDAgUgo+PgplbmRvYmoKNCAwIG9iago8PAovTGVuZ3RoIDQ0Cj4+CnN0cmVhbQpCVAovRjEgMTIgVGYKNzIgNzIwIFRkCihIZWxsbyBXb3JsZCkgVGoKRVQKZW5kc3RyZWFtCmVuZG9iago2IDAgb2JqCjw8Ci9UeXBlIC9Gb250Ci9TdWJ0eXBlIC9UeXBlMQovQmFzZUZvbnQgL0hlbHZldGljYQo+PgplbmRvYmoKMiAwIG9iago8PAovVHlwZSAvRm9udAovU3VidHlwZSAvVHlwZTEKL0Jhc2VGb250IC9IZWx2ZXRpY2EKL0VuY29kaW5nIC9XaW5BbnNpRW5jb2RpbmcKPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFs0IDAgUl0KL0NvdW50IDEKL01lZGlhQm94IFswIDAgNTk1IDg0Ml0KPj4KZW5kb2JqCjEgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKL01lZGlhQm94IFswIDAgNTk1IDg0Ml0KPj4KZW5kb2JqCnhyZWYKMCA3CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAwOSAwMDAwMCBuIAowMDAwMDAwMDU4IDAwMDAwIG4gCjAwMDAwMDAxMTUgMDAwMDAgbiAKMDAwMDAwMDI2NSAwMDAwMCBuIAowMDAwMDAwMzQ0IDAwMDAwIG4gCjAwMDAwMDA0OTAgMDAwMDAgbiAKdHJhaWxlcgo8PAovU2l6ZSA3Ci9Sb290IDEgMCBSCj4+CnN0YXJ0eHJlZgo2MDAKJSVFT0Y=',
        contentType: 'application/pdf',
        fileName: 'test-document.pdf',
        fileSize: 1024,
        convertTables: true,
        preserveFormatting: true
      }
    },
    {
      name: 'HTML Document Test',
      payload: {
        fileData: btoa(`
<!DOCTYPE html>
<html>
<head>
    <title>Test HTML Document</title>
</head>
<body>
    <h1>Welcome to Our Website</h1>
    <p>This is a test HTML document with various elements.</p>
    
    <h2>Features</h2>
    <ul>
        <li>Clean HTML structure</li>
        <li>Proper semantic markup</li>
        <li>Accessible content</li>
    </ul>
    
    <table>
        <tr>
            <th>Name</th>
            <th>Value</th>
        </tr>
        <tr>
            <td>Feature 1</td>
            <td>100%</td>
        </tr>
        <tr>
            <td>Feature 2</td>
            <td>95%</td>
        </tr>
    </table>
    
    <p>For more information, visit <a href="https://example.com">our website</a>.</p>
</body>
</html>
        `),
        contentType: 'text/html',
        fileName: 'test-document.html',
        fileSize: 2048,
        convertTables: true,
        preserveFormatting: true
      }
    },
    {
      name: 'Plain Text Document Test',
      payload: {
        fileData: btoa(`
# Plain Text Document

This is a simple plain text document that should be converted to Markdown format.

## Key Points

- Point 1: This is important
- Point 2: This is also important
- Point 3: This is crucial

## Summary

The document contains structured information that should be preserved during conversion.

Contact: info@example.com
Website: https://example.com
        `),
        contentType: 'text/plain',
        fileName: 'test-document.txt',
        fileSize: 512,
        convertTables: false,
        preserveFormatting: true
      }
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n📄 Testing: ${testCase.name}`);
    console.log('─'.repeat(50));

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/markdown-converter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(testCase.payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ HTTP ${response.status}: ${response.statusText}`);
        console.error('Error details:', errorText);
        continue;
      }

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Conversion successful!');
        console.log(`📊 Metadata:`);
        console.log(`   - Original Format: ${result.metadata.originalFormat}`);
        console.log(`   - Processing Time: ${result.metadata.processingTime}ms`);
        console.log(`   - Word Count: ${result.metadata.wordCount}`);
        console.log(`   - Character Count: ${result.metadata.characterCount}`);
        console.log(`   - Tables Detected: ${result.metadata.tablesDetected}`);
        console.log(`   - Images Detected: ${result.metadata.imagesDetected}`);
        console.log(`   - Links Detected: ${result.metadata.linksDetected}`);
        console.log(`   - Conversion Method: ${result.metadata.conversionMethod}`);
        
        console.log(`\n📝 Markdown Preview (first 200 chars):`);
        console.log(result.markdown.substring(0, 200) + '...');
        
      } else {
        console.error('❌ Conversion failed:', result.error);
      }

    } catch (error) {
      console.error('❌ Test failed:', error.message);
    }
  }

  console.log('\n🎉 Markdown Converter testing completed!');
}

// Run the test
testMarkdownConverter().catch(console.error);
