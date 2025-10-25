#!/usr/bin/env node

/**
 * Deployment Fix Script
 * Automatically fixes common Vercel deployment issues
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class DeploymentFixer {
  constructor() {
    this.fixes = [];
    this.logs = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
    this.logs.push(logEntry);
    console.log(logEntry);
  }

  async fixVercelConfig() {
    this.log('🔧 Fixing Vercel configuration...');
    
    const vercelConfig = {
      "version": 2,
      "builds": [
        {
          "src": "frontend/package.json",
          "use": "@vercel/static-build",
          "config": {
            "distDir": "frontend/dist"
          }
        },
        {
          "src": "api/**/*.js",
          "use": "@vercel/node"
        }
      ],
      "routes": [
        {
          "src": "/api/(.*)",
          "dest": "/api/$1"
        },
        {
          "src": "/health",
          "dest": "/frontend/dist/index.html"
        },
        {
          "src": "/health.html",
          "dest": "/frontend/dist/health.html"
        },
        {
          "src": "/(.*)",
          "dest": "/frontend/dist/$1"
        }
      ],
      "functions": {
        "api/paddleocr.js": {
          "maxDuration": 30
        },
        "api/dots-ocr.js": {
          "maxDuration": 30
        },
        "api/crawl4ai.js": {
          "maxDuration": 30
        },
        "api/test.js": {
          "maxDuration": 10
        }
      }
    };

    fs.writeFileSync('vercel.json', JSON.stringify(vercelConfig, null, 2));
    this.fixes.push('Updated vercel.json with correct configuration');
    this.log('✅ Fixed Vercel configuration');
  }

  async fixFrontendBuild() {
    this.log('🔧 Fixing frontend build...');
    
    try {
      // Clean previous build
      if (fs.existsSync('frontend/dist')) {
        execSync('rm -rf frontend/dist', { stdio: 'inherit' });
        this.log('✅ Cleaned previous build');
      }

      // Install dependencies
      this.log('Installing frontend dependencies...');
      execSync('cd frontend && npm install', { stdio: 'inherit' });
      this.log('✅ Dependencies installed');

      // Build frontend
      this.log('Building frontend...');
      execSync('cd frontend && npm run build', { stdio: 'inherit' });
      this.log('✅ Frontend build completed');

      // Verify build output
      if (fs.existsSync('frontend/dist/index.html')) {
        this.log('✅ index.html created');
      } else {
        throw new Error('index.html not created');
      }

      this.fixes.push('Fixed frontend build process');
    } catch (error) {
      this.log(`❌ Frontend build failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async fixHealthPage() {
    this.log('🔧 Fixing health page...');
    
    // Ensure health.html is in the right place
    if (fs.existsSync('health-dashboard.html')) {
      fs.copyFileSync('health-dashboard.html', 'frontend/public/health.html');
      this.log('✅ Copied health dashboard to frontend/public/');
    }

    // Rebuild to include health.html
    if (fs.existsSync('frontend/public/health.html')) {
      execSync('cd frontend && npm run build', { stdio: 'inherit' });
      this.log('✅ Rebuilt with health.html');
    }

    this.fixes.push('Fixed health page routing');
  }

  async fixPackageJson() {
    this.log('🔧 Fixing package.json...');
    
    // Add build script to root package.json if it doesn't exist
    const rootPackageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    if (!rootPackageJson.scripts) {
      rootPackageJson.scripts = {};
    }

    if (!rootPackageJson.scripts.build) {
      rootPackageJson.scripts.build = 'cd frontend && npm run build';
      this.log('✅ Added build script to root package.json');
    }

    if (!rootPackageJson.scripts.start) {
      rootPackageJson.scripts.start = 'cd frontend && npm run preview';
      this.log('✅ Added start script to root package.json');
    }

    fs.writeFileSync('package.json', JSON.stringify(rootPackageJson, null, 2));
    this.fixes.push('Fixed package.json scripts');
  }

  async commitChanges() {
    this.log('🔧 Committing changes...');
    
    try {
      execSync('git add .', { stdio: 'inherit' });
      this.log('✅ Added changes to git');

      const commitMessage = `🔧 Fix deployment issues

✅ Fixed Vercel configuration:
- Corrected distDir path to frontend/dist
- Added proper routing for health pages
- Fixed API routing configuration

✅ Fixed frontend build:
- Cleaned and rebuilt frontend
- Added health.html to public directory
- Verified build output

✅ Fixed package.json:
- Added build and start scripts
- Ensured proper configuration

🎯 Deployment should now work correctly
🚀 Health page accessible at /health and /health.html`;

      execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });
      this.log('✅ Changes committed');

      execSync('git push origin main', { stdio: 'inherit' });
      this.log('✅ Changes pushed to GitHub');

      this.fixes.push('Committed and pushed all fixes');
    } catch (error) {
      this.log(`❌ Git operations failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async verifyDeployment() {
    this.log('🔍 Verifying deployment...');
    
    // Wait for deployment
    this.log('Waiting for Vercel deployment...');
    await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 1 minute

    try {
      const response = await fetch('https://document-intelligence-suite.vercel.app/');
      if (response.ok) {
        this.log('✅ Main app is accessible');
      } else {
        this.log(`⚠️ Main app returned ${response.status}`);
      }

      const healthResponse = await fetch('https://document-intelligence-suite.vercel.app/health');
      if (healthResponse.ok) {
        this.log('✅ Health page is accessible');
      } else {
        this.log(`⚠️ Health page returned ${healthResponse.status}`);
      }

      const healthHtmlResponse = await fetch('https://document-intelligence-suite.vercel.app/health.html');
      if (healthHtmlResponse.ok) {
        this.log('✅ health.html is accessible');
      } else {
        this.log(`⚠️ health.html returned ${healthHtmlResponse.status}`);
      }

    } catch (error) {
      this.log(`❌ Verification failed: ${error.message}`, 'error');
    }
  }

  async run() {
    this.log('🚀 Starting deployment fix process...');
    
    try {
      await this.fixVercelConfig();
      await this.fixFrontendBuild();
      await this.fixHealthPage();
      await this.fixPackageJson();
      await this.commitChanges();
      await this.verifyDeployment();
      
      this.log('\n🎉 Deployment fix completed!');
      this.log(`\n🔧 Applied ${this.fixes.length} fixes:`);
      this.fixes.forEach((fix, index) => {
        this.log(`${index + 1}. ${fix}`);
      });
      
    } catch (error) {
      this.log(`\n❌ Deployment fix failed: ${error.message}`, 'error');
      throw error;
    }
  }
}

// Run the fixer
if (require.main === module) {
  const fixer = new DeploymentFixer();
  fixer.run().catch(console.error);
}

module.exports = DeploymentFixer;
