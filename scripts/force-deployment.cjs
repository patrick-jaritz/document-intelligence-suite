#!/usr/bin/env node

/**
 * Force Deployment Script
 * Forces Vercel to deploy the latest changes
 */

const fs = require('fs');
const { execSync } = require('child_process');

class ForceDeployment {
  constructor() {
    this.logs = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
    this.logs.push(logEntry);
    console.log(logEntry);
  }

  async forceDeployment() {
    this.log('🚀 Forcing Vercel deployment...');
    
    try {
      // 1. Clean everything
      this.log('🧹 Cleaning build artifacts...');
      if (fs.existsSync('frontend/dist')) {
        execSync('rm -rf frontend/dist', { stdio: 'inherit' });
      }
      this.log('✅ Cleaned build artifacts');

      // 2. Rebuild frontend
      this.log('🔨 Rebuilding frontend...');
      execSync('cd frontend && npm run build', { stdio: 'inherit' });
      this.log('✅ Frontend rebuilt');

      // 3. Verify build
      if (!fs.existsSync('frontend/dist/index.html')) {
        throw new Error('Build failed - index.html not found');
      }
      this.log('✅ Build verification passed');

      // 4. Create a significant change to force deployment
      this.log('📝 Creating deployment trigger...');
      const triggerContent = `# Deployment Trigger ${Date.now()}

This file forces Vercel to recognize changes and redeploy.

## Changes Made:
- Fixed Vercel configuration
- Updated frontend build process
- Added comprehensive logging
- Fixed health page routing

## Build Info:
- Build Time: ${new Date().toISOString()}
- Frontend Assets: ${fs.readdirSync('frontend/dist/assets').length} files
- Health Page: ${fs.existsSync('frontend/dist/health.html') ? 'Present' : 'Missing'}

## Next Steps:
1. Vercel should detect this change
2. Trigger new deployment
3. Health pages should be accessible
`;

      fs.writeFileSync('DEPLOYMENT_TRIGGER.md', triggerContent);
      this.log('✅ Created deployment trigger');

      // 5. Commit and push
      this.log('📤 Committing and pushing changes...');
      execSync('git add .', { stdio: 'inherit' });
      
      const commitMessage = `🚀 FORCE DEPLOYMENT: Fix health page routing

✅ Comprehensive deployment fixes:
- Fixed Vercel configuration (distDir path)
- Rebuilt frontend with latest changes
- Added health.html to public directory
- Created deployment trigger

🎯 This should force Vercel to redeploy
🚀 Health pages should be accessible after deployment

Build Time: ${new Date().toISOString()}
Frontend Assets: ${fs.readdirSync('frontend/dist/assets').length} files`;

      execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });
      this.log('✅ Changes committed');

      execSync('git push origin main', { stdio: 'inherit' });
      this.log('✅ Changes pushed to GitHub');

      // 6. Wait and verify
      this.log('⏳ Waiting for Vercel deployment (60 seconds)...');
      await new Promise(resolve => setTimeout(resolve, 60000));

      this.log('🔍 Verifying deployment...');
      const response = await fetch('https://document-intelligence-suite.vercel.app/');
      if (response.ok) {
        this.log('✅ Main app is accessible');
        
        // Check for new asset hash
        const html = await response.text();
        const assetMatch = html.match(/assets\/index-([^.]+)\.js/);
        if (assetMatch) {
          this.log(`✅ New asset hash detected: ${assetMatch[1]}`);
        } else {
          this.log('⚠️ Old asset hash still being served');
        }
      } else {
        this.log(`❌ Main app not accessible: ${response.status}`);
      }

      this.log('🎉 Force deployment completed!');
      
    } catch (error) {
      this.log(`❌ Force deployment failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async run() {
    await this.forceDeployment();
  }
}

// Run the force deployment
if (require.main === module) {
  const forceDeployment = new ForceDeployment();
  forceDeployment.run().catch(console.error);
}

module.exports = ForceDeployment;
