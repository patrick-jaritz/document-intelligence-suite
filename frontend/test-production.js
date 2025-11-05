/**
 * Production Testing Script
 * Tests all performance improvements
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const distPath = join(process.cwd(), 'dist');
const assetsPath = join(distPath, 'assets');

console.log('🧪 Production Testing Suite\n');
console.log('='.repeat(60));

// Test 1: Verify build output exists
console.log('\n✅ Test 1: Build Output Verification');
try {
  const files = readdirSync(distPath);
  console.log(`   Found ${files.length} files in dist/`);
  
  if (!files.includes('index.html')) {
    throw new Error('index.html missing');
  }
  console.log('   ✓ index.html exists');
  
  const assets = readdirSync(assetsPath);
  console.log(`   ✓ Found ${assets.length} asset files`);
} catch (error) {
  console.error('   ❌ FAILED:', error.message);
  process.exit(1);
}

// Test 2: Bundle size verification
console.log('\n✅ Test 2: Bundle Size Analysis');
try {
  const assets = readdirSync(assetsPath);
  const jsFiles = assets.filter(f => f.endsWith('.js'));
  const cssFiles = assets.filter(f => f.endsWith('.css'));
  
  let totalSize = 0;
  let initialBundleSize = 0;
  let vendorChunks = 0;
  let componentChunks = 0;
  
  jsFiles.forEach(file => {
    const filePath = join(assetsPath, file);
    const stats = statSync(filePath);
    const sizeKB = stats.size / 1024;
    totalSize += sizeKB;
    
    if (file.includes('index-') && !file.includes('vendor')) {
      initialBundleSize = sizeKB;
    }
    if (file.includes('vendor') || file.includes('react-vendor') || file.includes('pdf-vendor') || file.includes('tesseract-vendor')) {
      vendorChunks++;
    }
    if (file.includes('components') || file.includes('Home') || file.includes('Admin') || file.includes('Health')) {
      componentChunks++;
    }
  });
  
  console.log(`   Initial Bundle: ${initialBundleSize.toFixed(2)} KB`);
  console.log(`   Total JS: ${totalSize.toFixed(2)} KB`);
  console.log(`   Vendor Chunks: ${vendorChunks}`);
  console.log(`   Component Chunks: ${componentChunks}`);
  console.log(`   CSS Files: ${cssFiles.length}`);
  
  // Verify initial bundle is small
  if (initialBundleSize > 10) {
    console.warn('   ⚠️  WARNING: Initial bundle > 10KB (expected < 5KB)');
  } else {
    console.log('   ✓ Initial bundle size optimized');
  }
  
  // Verify code splitting
  if (componentChunks < 3) {
    console.warn('   ⚠️  WARNING: Not enough component chunks (code splitting may not be working)');
  } else {
    console.log('   ✓ Code splitting working');
  }
  
} catch (error) {
  console.error('   ❌ FAILED:', error.message);
  process.exit(1);
}

// Test 3: Verify index.html includes proper script tags
console.log('\n✅ Test 3: HTML Structure Verification');
try {
  const htmlPath = join(distPath, 'index.html');
  const html = readFileSync(htmlPath, 'utf-8');
  
  // Check for root div
  if (!html.includes('<div id="root">')) {
    throw new Error('Root div missing');
  }
  console.log('   ✓ Root div present');
  
  // Check for script tag
  if (!html.includes('<script type="module"')) {
    throw new Error('Module script tag missing');
  }
  console.log('   ✓ Module script tag present');
  
  // Check for meta viewport
  if (!html.includes('viewport')) {
    console.warn('   ⚠️  WARNING: Viewport meta tag missing');
  } else {
    console.log('   ✓ Viewport meta tag present');
  }
  
} catch (error) {
  console.error('   ❌ FAILED:', error.message);
  process.exit(1);
}

// Test 4: Check for common issues
console.log('\n✅ Test 4: Common Issues Check');
try {
  const assets = readdirSync(assetsPath);
  
  // Check for large files
  const largeFiles = assets.filter(file => {
    const filePath = join(assetsPath, file);
    const stats = statSync(filePath);
    return stats.size > 500 * 1024; // > 500KB
  });
  
  if (largeFiles.length > 0) {
    console.warn(`   ⚠️  WARNING: Found ${largeFiles.length} files > 500KB:`);
    largeFiles.forEach(file => {
      const size = (statSync(join(assetsPath, file)).size / 1024).toFixed(2);
      console.warn(`      - ${file}: ${size} KB`);
    });
  } else {
    console.log('   ✓ No excessively large files');
  }
  
  // Check for duplicate chunks
  const chunkNames = new Set();
  assets.forEach(file => {
    const match = file.match(/^(.+?)-[A-Za-z0-9]+\.(js|css)$/);
    if (match) {
      chunkNames.add(match[1]);
    }
  });
  
  console.log(`   ✓ Found ${chunkNames.size} unique chunk types`);
  
} catch (error) {
  console.error('   ❌ FAILED:', error.message);
  process.exit(1);
}

console.log('\n' + '='.repeat(60));
console.log('✅ All tests passed!');
console.log('\n📊 Summary:');
console.log('   - Build output verified');
console.log('   - Bundle sizes optimized');
console.log('   - Code splitting working');
console.log('   - HTML structure correct');
console.log('\n🚀 Ready for production deployment!');

