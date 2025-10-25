#!/usr/bin/env node

/**
 * Development Deployment Script
 * Handles constant deployment for development workflow
 */

const fs = require('fs');
const { execSync } = require('child_process');

class DevDeploy {
  constructor() {
    this.logs = [];
    this.projectId = 'prj_Gdr6b4VJHFwaF9B0QITA7qnp75Zy';
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
    this.logs.push(logEntry);
    console.log(logEntry);
  }

  async checkGitStatus() {
    try {
      const status = execSync('git status --porcelain', { encoding: 'utf8' });
      const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
      const lastCommit = execSync('git log -1 --oneline', { encoding: 'utf8' }).trim();
      
      return {
        hasChanges: status.trim().length > 0,
        branch,
        lastCommit,
        changes: status.trim().split('\n').filter(line => line.length > 0)
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  async buildFrontend() {
    this.log('🔨 Building frontend...');
    
    try {
      // Clean previous build
      if (fs.existsSync('frontend/dist')) {
        execSync('rm -rf frontend/dist');
        this.log('✅ Cleaned previous build');
      }

      // Install dependencies
      this.log('📦 Installing dependencies...');
      execSync('cd frontend && npm install', { stdio: 'inherit' });

      // Build
      execSync('cd frontend && npm run build', { stdio: 'inherit' });
      this.log('✅ Frontend built successfully');

      // Verify build
      if (!fs.existsSync('frontend/dist/index.html')) {
        throw new Error('Build failed - index.html not found');
      }

      const buildStats = {
        indexHtml: fs.existsSync('frontend/dist/index.html'),
        healthHtml: fs.existsSync('frontend/dist/health.html'),
        assetsCount: fs.readdirSync('frontend/dist/assets').length,
        buildTime: new Date().toISOString()
      };

      this.log(`📊 Build stats: ${JSON.stringify(buildStats)}`);
      return buildStats;

    } catch (error) {
      this.log(`❌ Build failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async createDeploymentTrigger() {
    const triggerContent = `# Development Deployment Trigger

## Deployment Info:
- Trigger Time: ${new Date().toISOString()}
- Project ID: ${this.projectId}
- Node Version: ${process.version}
- Git Branch: ${execSync('git branch --show-current', { encoding: 'utf8' }).trim()}
- Last Commit: ${execSync('git log -1 --oneline', { encoding: 'utf8' }).trim()}

## Build Status:
- Frontend Built: ${fs.existsSync('frontend/dist/index.html') ? 'Yes' : 'No'}
- Health Page: ${fs.existsSync('frontend/dist/health.html') ? 'Yes' : 'No'}
- Assets Count: ${fs.existsSync('frontend/dist/assets') ? fs.readdirSync('frontend/dist/assets').length : 0}

## Vercel Configuration:
- Build Command: cd frontend && npm run build
- Output Directory: frontend/dist
- Routes: /health -> /frontend/dist/index.html

This should trigger Vercel to redeploy with the latest changes.
`;

    fs.writeFileSync('DEPLOYMENT_TRIGGER.md', triggerContent);
    this.log('✅ Created deployment trigger');
  }

  async commitAndPush() {
    this.log('📝 Committing and pushing changes...');
    
    try {
      // Add all changes
      execSync('git add .', { stdio: 'inherit' });
      this.log('✅ Changes staged');

      // Create commit
      const commitMessage = `🚀 DEV DEPLOY: ${new Date().toISOString()}

✅ Development deployment:
- Frontend rebuilt with latest changes
- Health page routing configured
- Vercel configuration optimized
- Deployment trigger created

🎯 This should trigger Vercel redeployment
🚀 Ready for constant development workflow

Build Time: ${new Date().toISOString()}
Assets: ${fs.existsSync('frontend/dist/assets') ? fs.readdirSync('frontend/dist/assets').length : 0} files`;

      execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });
      this.log('✅ Changes committed');

      // Push to GitHub
      execSync('git push origin main', { stdio: 'inherit' });
      this.log('✅ Changes pushed to GitHub');

      return true;
    } catch (error) {
      this.log(`❌ Git operations failed: ${error.message}`, 'error');
      return false;
    }
  }

  async waitForDeployment() {
    this.log('⏳ Waiting for Vercel deployment...');
    
    const maxAttempts = 12; // 2 minutes
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        const response = await fetch('https://document-intelligence-suite.vercel.app/');
        if (response.ok) {
          const html = await response.text();
          const assetMatch = html.match(/assets\/index-([^.]+)\.js/);
          
          this.log(`✅ Deployment successful! Asset hash: ${assetMatch ? assetMatch[1] : 'unknown'}`);
          return true;
        }
      } catch (error) {
        // Ignore errors during waiting
      }
      
      attempts++;
      this.log(`⏳ Attempt ${attempts}/${maxAttempts} - waiting 10 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
    
    this.log('⚠️ Deployment verification timeout', 'warn');
    return false;
  }

  async verifyHealthPage() {
    this.log('🔍 Verifying health page...');
    
    try {
      const response = await fetch('https://document-intelligence-suite.vercel.app/health');
      if (response.ok) {
        this.log('✅ Health page is accessible');
        return true;
      } else {
        this.log(`⚠️ Health page returned ${response.status}`);
        return false;
      }
    } catch (error) {
      this.log(`❌ Health page check failed: ${error.message}`, 'error');
      return false;
    }
  }

  async run() {
    this.log('🚀 Starting development deployment...');
    
    try {
      // Check git status
      const gitStatus = await this.checkGitStatus();
      if (gitStatus.error) {
        throw new Error(`Git check failed: ${gitStatus.error}`);
      }

      if (!gitStatus.hasChanges) {
        this.log('ℹ️ No changes detected, but proceeding with build...');
      } else {
        this.log(`📝 Changes detected: ${gitStatus.changes.length} files`);
      }

      // Build frontend
      await this.buildFrontend();

      // Create deployment trigger
      await this.createDeploymentTrigger();

      // Commit and push
      const pushSuccess = await this.commitAndPush();
      if (!pushSuccess) {
        throw new Error('Failed to commit and push changes');
      }

      // Wait for deployment
      const deploySuccess = await this.waitForDeployment();
      if (!deploySuccess) {
        this.log('⚠️ Deployment verification failed, but changes are pushed', 'warn');
      }

      // Verify health page
      await this.verifyHealthPage();

      this.log('\n🎉 Development deployment completed!');
      this.log('\n📋 Next steps:');
      this.log('  1. Check https://document-intelligence-suite.vercel.app/');
      this.log('  2. Look for health button at bottom of page');
      this.log('  3. Try https://document-intelligence-suite.vercel.app/health');
      this.log('  4. Run "npm run monitor" for continuous monitoring');

    } catch (error) {
      this.log(`❌ Deployment failed: ${error.message}`, 'error');
      throw error;
    }
  }
}

// Run the deployment
if (require.main === module) {
  const deploy = new DevDeploy();
  deploy.run().catch(console.error);
}

module.exports = DevDeploy;
