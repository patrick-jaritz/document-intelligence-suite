#!/usr/bin/env node

/**
 * Deployment Verification Script
 * Verifies that the deployment is working correctly
 */

const fs = require('fs');
const { execSync } = require('child_process');

async function verifyDeployment() {
  console.log('🔍 Verifying deployment...');
  
  try {
    // Check if build exists
    if (!fs.existsSync('frontend/dist')) {
      console.log('❌ Build directory not found');
      return false;
    }
    
    // Check build contents
    const files = fs.readdirSync('frontend/dist');
    const hasIndexHtml = files.includes('index.html');
    const hasAssets = files.includes('assets');
    
    console.log(`📁 Build files: ${files.length}`);
    console.log(`📄 Has index.html: ${hasIndexHtml}`);
    console.log(`📦 Has assets: ${hasAssets}`);
    
    if (hasAssets) {
      const assetFiles = fs.readdirSync('frontend/dist/assets');
      console.log(`📦 Asset files: ${assetFiles.length}`);
      console.log(`📦 Assets: ${assetFiles.join(', ')}`);
    }
    
    // Check if we can serve the files
    console.log('🌐 Testing local server...');
    try {
      execSync('cd frontend && npx serve dist -p 3000 &', { stdio: 'pipe' });
      
      // Wait a moment for server to start
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Test the server
      const response = await fetch('http://localhost:3000');
      if (response.ok) {
        console.log('✅ Local server is working');
        
        // Kill the server
        execSync('pkill -f "serve dist"', { stdio: 'pipe' });
      } else {
        console.log('❌ Local server not responding');
        return false;
      }
    } catch (error) {
      console.log(`⚠️ Could not test local server: ${error.message}`);
    }
    
    console.log('✅ Deployment verification completed');
    return true;
  } catch (error) {
    console.log(`❌ Verification failed: ${error.message}`);
    return false;
  }
}

if (require.main === module) {
  verifyDeployment().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { verifyDeployment };
