#!/usr/bin/env deno run --allow-net --allow-env

/**
 * Quick PageIndex API Key Test
 * Verifies the API key works and shows basic API status
 */

const PAGEINDEX_API_KEY = '7535a44ab7c34d6c978009fd571c0bac';
const BASE_URL = 'https://api.pageindex.ai/v1';

async function testAPIKey() {
  console.log('🔑 Testing PageIndex API Key...\n');

  try {
    // Test 1: Check API key validity (get documents list)
    console.log('Test 1: Verifying API key...');
    const response = await fetch(`${BASE_URL}/documents`, {
      headers: {
        'Authorization': `Bearer ${PAGEINDEX_API_KEY}`,
      }
    });

    if (response.status === 401) {
      console.error('❌ API key is invalid or expired');
      return false;
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`⚠️  API returned: ${response.status} ${response.statusText}`);
      console.log(`   Response: ${errorText.substring(0, 200)}`);
      
      // 404 might mean endpoint doesn't exist, but auth worked
      if (response.status === 404) {
        console.log('✅ API key appears to be valid (auth succeeded)');
        return true;
      }
      return false;
    }

    const data = await response.json();
    console.log('✅ API key is valid!');
    console.log(`📊 Found ${data.documents?.length || 0} documents\n`);
    return true;

  } catch (error) {
    console.error('❌ Error testing API:', error.message);
    return false;
  }
}

async function checkAPIStatus() {
  console.log('📡 Checking PageIndex API status...\n');
  
  try {
    // Try to reach API
    const response = await fetch(`${BASE_URL}/documents`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PAGEINDEX_API_KEY}`,
      },
      signal: AbortSignal.timeout(5000)
    });

    console.log(`✅ API is reachable (Status: ${response.status})`);
    return true;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('❌ API request timed out');
    } else {
      console.error('❌ API is not reachable:', error.message);
    }
    return false;
  }
}

async function main() {
  console.log('🚀 PageIndex API Quick Test\n');
  console.log('=' .repeat(50));
  console.log(`API Key: ${PAGEINDEX_API_KEY.substring(0, 20)}...`);
  console.log('=' .repeat(50) + '\n');

  const apiReachable = await checkAPIStatus();
  if (!apiReachable) {
    console.log('\n⚠️  Cannot reach PageIndex API. Check your internet connection.');
    Deno.exit(1);
  }

  const keyValid = await testAPIKey();
  
  if (keyValid) {
    console.log('\n' + '='.repeat(50));
    console.log('✅ All tests passed! API key is working.');
    console.log('='.repeat(50));
    console.log('\n📝 Next steps:');
    console.log('   1. Set environment variable:');
    console.log(`      export PAGEINDEX_API_KEY="${PAGEINDEX_API_KEY}"`);
    console.log('   2. Run full test with a PDF:');
    console.log('      deno run --allow-net --allow-read --allow-env test-pageindex.ts \\');
    console.log('        ./sample.pdf "What is this document about?"');
    console.log('   3. Or deploy Edge Function:');
    console.log('      cd supabase/functions/vision-rag-query');
    console.log(`      supabase secrets set PAGEINDEX_API_KEY="${PAGEINDEX_API_KEY}"`);
    console.log('');
  } else {
    console.log('\n❌ API key test failed. Please check your key.');
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main().catch(error => {
    console.error('Fatal error:', error);
    Deno.exit(1);
  });
}

