#!/usr/bin/env node

/**
 * Fix Vercel Deployment Issues
 * Comprehensive solution for Vercel deployment problems
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class VercelFixer {
  constructor() {
    this.logs = [];
    this.fixes = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [VERCEL-FIX] [${type.toUpperCase()}] ${message}`;
    this.logs.push(logEntry);
    console.log(logEntry);
  }

  async checkCurrentState() {
    this.log('🔍 Checking current deployment state...');
    
    try {
      const response = await fetch('https://document-intelligence-suite.vercel.app/');
      if (response.ok) {
        const html = await response.text();
        const assetMatch = html.match(/assets\/index-([^.]+)\.js/);
        const currentHash = assetMatch ? assetMatch[1] : 'unknown';
        
        this.log(`🌐 Live deployment asset hash: ${currentHash}`);
        
        // Check local build
        const buildDir = 'frontend/dist/assets';
        if (fs.existsSync(buildDir)) {
          const files = fs.readdirSync(buildDir);
          const jsFiles = files.filter(f => f.endsWith('.js'));
          const localHashes = jsFiles.map(f => {
            const match = f.match(/index-([^.]+)\.js/);
            return match ? match[1] : null;
          }).filter(Boolean);
          
          this.log(`🔨 Local build hashes: ${localHashes.join(', ')}`);
          
          if (localHashes.length > 0 && !localHashes.includes(currentHash)) {
            this.log('⚠️ Vercel is not serving the latest build', 'warn');
            return { needsUpdate: true, currentHash, localHashes };
          } else {
            this.log('✅ Vercel is serving the latest build');
            return { needsUpdate: false, currentHash, localHashes };
          }
        }
      }
    } catch (error) {
      this.log(`❌ Error checking deployment: ${error.message}`, 'error');
    }
    
    return { needsUpdate: true, error: 'Could not check deployment' };
  }

  async forceVercelUpdate() {
    this.log('🚀 Forcing Vercel to update...');
    
    try {
      // Method 1: Update vercel.json with a timestamp
      this.log('📝 Updating vercel.json with timestamp...');
      const vercelJsonPath = 'vercel.json';
      const vercelConfig = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf8'));
      
      // Add a timestamp to force Vercel to recognize changes
      vercelConfig.timestamp = Date.now();
      vercelConfig.lastUpdate = new Date().toISOString();
      
      fs.writeFileSync(vercelJsonPath, JSON.stringify(vercelConfig, null, 2));
      this.fixes.push('Updated vercel.json with timestamp');
      
      // Method 2: Create a new build with different hash
      this.log('🔨 Creating new build with cache-busting...');
      
      // Clean and rebuild
      if (fs.existsSync('frontend/dist')) {
        execSync('rm -rf frontend/dist');
      }
      
      // Add cache-busting to package.json
      const packageJsonPath = 'frontend/package.json';
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      packageJson.version = `${packageJson.version}-${Date.now()}`;
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      
      // Build
      execSync('cd frontend && npm run build', { stdio: 'inherit' });
      
      // Method 3: Create a deployment marker file
      this.log('📄 Creating deployment marker...');
      const markerContent = `# VERCEL DEPLOYMENT MARKER

## Timestamp: ${new Date().toISOString()}
## Build Hash: ${Date.now()}
## Reason: Force Vercel deployment update

This file forces Vercel to recognize that a new deployment is needed.
The presence of this file should trigger a complete rebuild and redeployment.

## Local Build Status:
- Frontend built: ${fs.existsSync('frontend/dist') ? 'Yes' : 'No'}
- Asset files: ${fs.existsSync('frontend/dist/assets') ? fs.readdirSync('frontend/dist/assets').length : 0}
- Last commit: ${execSync('git log -1 --oneline', { encoding: 'utf8' }).trim()}

## Vercel Configuration:
- Timestamp: ${vercelConfig.timestamp}
- Last Update: ${vercelConfig.lastUpdate}

This marker should be removed after successful deployment.
`;

      fs.writeFileSync('VERCEL_DEPLOYMENT_MARKER.md', markerContent);
      
      // Method 4: Update index.html with cache-busting
      this.log('📄 Updating index.html with cache-busting...');
      const indexHtmlPath = 'frontend/dist/index.html';
      if (fs.existsSync(indexHtmlPath)) {
        let indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
        
        // Add cache-busting meta tags
        const cacheBustingMeta = `    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
    <meta http-equiv="Pragma" content="no-cache" />
    <meta http-equiv="Expires" content="0" />
    <meta name="build-timestamp" content="${Date.now()}" />`;
        
        indexHtml = indexHtml.replace('<head>', `<head>${cacheBustingMeta}`);
        fs.writeFileSync(indexHtmlPath, indexHtml);
      }
      
      this.fixes.push('Added cache-busting to index.html');
      this.fixes.push('Created deployment marker file');
      this.fixes.push('Updated package.json version');
      
      return { success: true };
    } catch (error) {
      this.log(`❌ Error forcing update: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  async commitAndPush() {
    this.log('📝 Committing and pushing changes...');
    
    try {
      // Add all changes
      execSync('git add .');
      
      // Create a commit with a unique message
      const commitMessage = `🚀 FORCE VERCEL UPDATE: ${new Date().toISOString()}

- Updated vercel.json with timestamp
- Added cache-busting to index.html
- Created deployment marker
- Updated package.json version
- Forced new build with different hash

This commit should force Vercel to deploy the latest changes.`;
      
      execSync(`git commit -m "${commitMessage}"`);
      
      // Push to GitHub
      execSync('git push origin main');
      
      this.log('✅ Changes committed and pushed');
      this.fixes.push('Committed and pushed changes to GitHub');
      
      return { success: true };
    } catch (error) {
      this.log(`❌ Error committing/pushing: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  async waitForDeployment(maxWaitTime = 120000) {
    this.log(`⏳ Waiting for Vercel deployment (max ${maxWaitTime/1000}s)...`);
    
    const startTime = Date.now();
    const checkInterval = 10000; // Check every 10 seconds
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const response = await fetch('https://document-intelligence-suite.vercel.app/');
        if (response.ok) {
          const html = await response.text();
          const assetMatch = html.match(/assets\/index-([^.]+)\.js/);
          const currentHash = assetMatch ? assetMatch[1] : 'unknown';
          
          this.log(`🔍 Current deployment hash: ${currentHash}`);
          
          // Check if we have a new hash
          const buildDir = 'frontend/dist/assets';
          if (fs.existsSync(buildDir)) {
            const files = fs.readdirSync(buildDir);
            const jsFiles = files.filter(f => f.endsWith('.js'));
            const localHashes = jsFiles.map(f => {
              const match = f.match(/index-([^.]+)\.js/);
              return match ? match[1] : null;
            }).filter(Boolean);
            
            if (localHashes.includes(currentHash)) {
              this.log('✅ Deployment updated successfully!');
              return { success: true, newHash: currentHash };
            }
          }
        }
      } catch (error) {
        this.log(`⚠️ Error checking deployment: ${error.message}`, 'warn');
      }
      
      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
    
    this.log('⏰ Deployment check timeout', 'warn');
    return { success: false, timeout: true };
  }

  async runFullFix() {
    this.log('🔧 Starting comprehensive Vercel deployment fix...');
    
    // Step 1: Check current state
    const state = await this.checkCurrentState();
    
    if (!state.needsUpdate) {
      this.log('✅ No update needed - deployment is current');
      return { success: true, message: 'Deployment is already up to date' };
    }
    
    // Step 2: Force Vercel update
    const updateResult = await this.forceVercelUpdate();
    if (!updateResult.success) {
      this.log('❌ Failed to force update', 'error');
      return { success: false, error: updateResult.error };
    }
    
    // Step 3: Commit and push
    const commitResult = await this.commitAndPush();
    if (!commitResult.success) {
      this.log('❌ Failed to commit/push', 'error');
      return { success: false, error: commitResult.error };
    }
    
    // Step 4: Wait for deployment
    const deploymentResult = await this.waitForDeployment();
    
    // Generate report
    this.generateReport(state, updateResult, commitResult, deploymentResult);
    
    return {
      success: deploymentResult.success,
      fixes: this.fixes,
      logs: this.logs
    };
  }

  generateReport(initialState, updateResult, commitResult, deploymentResult) {
    console.log('\n' + '='.repeat(60));
    console.log('🔧 VERCEL DEPLOYMENT FIX REPORT');
    console.log('='.repeat(60));
    console.log(`📊 Initial State: ${initialState.needsUpdate ? 'NEEDED UPDATE' : 'UP TO DATE'}`);
    console.log(`🔨 Update Result: ${updateResult.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`📝 Commit Result: ${commitResult.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`🚀 Deployment Result: ${deploymentResult.success ? 'SUCCESS' : 'FAILED'}`);
    
    if (this.fixes.length > 0) {
      console.log('\n✅ FIXES APPLIED:');
      this.fixes.forEach((fix, i) => {
        console.log(`  ${i + 1}. ${fix}`);
      });
    }
    
    if (deploymentResult.success) {
      console.log(`\n🎉 SUCCESS: New deployment hash: ${deploymentResult.newHash}`);
    } else {
      console.log('\n⚠️ DEPLOYMENT STATUS: Check Vercel dashboard for details');
    }
    
    console.log('='.repeat(60));
  }
}

// CLI interface
if (require.main === module) {
  const fixer = new VercelFixer();
  fixer.runFullFix().then(result => {
    process.exit(result.success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = VercelFixer;
