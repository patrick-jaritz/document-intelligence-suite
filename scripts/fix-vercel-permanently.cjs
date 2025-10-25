#!/usr/bin/env node

/**
 * Permanent Vercel Fix Script
 * Fixes Vercel deployment issues permanently for development
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class VercelPermanentFix {
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

  async checkVercelCLI() {
    this.log('🔍 Checking Vercel CLI...');
    
    try {
      const version = execSync('vercel --version', { encoding: 'utf8' }).trim();
      this.log(`✅ Vercel CLI available: ${version}`);
      return true;
    } catch (error) {
      this.log('❌ Vercel CLI not found. Installing...', 'error');
      try {
        execSync('npm install -g vercel', { stdio: 'inherit' });
        this.log('✅ Vercel CLI installed');
        return true;
      } catch (installError) {
        this.log(`❌ Failed to install Vercel CLI: ${installError.message}`, 'error');
        return false;
      }
    }
  }

  async fixVercelConfig() {
    this.log('🔧 Creating optimal Vercel configuration...');
    
    // Create a proper vercel.json for development
    const vercelConfig = {
      "version": 2,
      "name": "document-intelligence-suite",
      "builds": [
        {
          "src": "frontend/package.json",
          "use": "@vercel/static-build",
          "config": {
            "distDir": "frontend/dist",
            "installCommand": "cd frontend && npm install",
            "buildCommand": "cd frontend && npm run build"
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
      },
      "env": {
        "NODE_ENV": "production"
      }
    };

    fs.writeFileSync('vercel.json', JSON.stringify(vercelConfig, null, 2));
    this.log('✅ Vercel configuration updated');
  }

  async createBuildScript() {
    this.log('🔧 Creating build script...');
    
    const buildScript = `#!/bin/bash
# Build script for Vercel deployment

set -e

echo "🚀 Starting build process..."

# Clean previous build
if [ -d "frontend/dist" ]; then
    echo "🧹 Cleaning previous build..."
    rm -rf frontend/dist
fi

# Install dependencies
echo "📦 Installing dependencies..."
cd frontend
npm install
cd ..

# Build frontend
echo "🔨 Building frontend..."
cd frontend
npm run build
cd ..

# Verify build
if [ ! -f "frontend/dist/index.html" ]; then
    echo "❌ Build failed - index.html not found"
    exit 1
fi

echo "✅ Build completed successfully"
echo "📁 Build output:"
ls -la frontend/dist/

echo "🎉 Build process completed!"
`;

    fs.writeFileSync('build.sh', buildScript);
    execSync('chmod +x build.sh');
    this.log('✅ Build script created');
  }

  async createDevWorkflow() {
    this.log('🔧 Creating development workflow...');
    
    const devWorkflow = `#!/bin/bash
# Development workflow script

set -e

echo "🚀 Starting development workflow..."

# Function to deploy
deploy() {
    echo "📤 Deploying to Vercel..."
    
    # Build frontend
    echo "🔨 Building frontend..."
    cd frontend
    npm run build
    cd ..
    
    # Commit changes
    echo "📝 Committing changes..."
    git add .
    git commit -m "🚀 Deploy: $(date)" || true
    
    # Push to GitHub
    echo "📤 Pushing to GitHub..."
    git push origin main
    
    # Deploy to Vercel
    echo "🚀 Deploying to Vercel..."
    vercel --prod --yes
    
    echo "✅ Deployment completed!"
}

# Function to monitor
monitor() {
    echo "🔍 Monitoring deployment..."
    while true; do
        echo "Checking deployment status..."
        if curl -s -f https://document-intelligence-suite.vercel.app/ > /dev/null; then
            echo "✅ App is accessible"
        else
            echo "❌ App is not accessible"
        fi
        sleep 30
    done
}

# Function to debug
debug() {
    echo "🔍 Running debug checks..."
    
    echo "1. Checking Git status..."
    git status --porcelain
    
    echo "2. Checking build output..."
    if [ -f "frontend/dist/index.html" ]; then
        echo "✅ index.html exists"
    else
        echo "❌ index.html missing"
    fi
    
    echo "3. Checking Vercel config..."
    if [ -f "vercel.json" ]; then
        echo "✅ vercel.json exists"
    else
        echo "❌ vercel.json missing"
    fi
    
    echo "4. Testing local build..."
    cd frontend
    npm run build
    cd ..
    
    echo "✅ Debug completed"
}

# Main script
case "$1" in
    "deploy")
        deploy
        ;;
    "monitor")
        monitor
        ;;
    "debug")
        debug
        ;;
    *)
        echo "Usage: $0 {deploy|monitor|debug}"
        echo ""
        echo "Commands:"
        echo "  deploy  - Build and deploy to Vercel"
        echo "  monitor - Monitor deployment status"
        echo "  debug   - Run debug checks"
        exit 1
        ;;
esac
`;

    fs.writeFileSync('dev-workflow.sh', devWorkflow);
    execSync('chmod +x dev-workflow.sh');
    this.log('✅ Development workflow created');
  }

  async createPackageJsonScripts() {
    this.log('🔧 Adding deployment scripts to package.json...');
    
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    if (!packageJson.scripts) {
      packageJson.scripts = {};
    }

    packageJson.scripts = {
      ...packageJson.scripts,
      "dev": "cd frontend && npm run dev",
      "build": "cd frontend && npm run build",
      "deploy": "node scripts/fix-vercel-permanently.cjs && ./dev-workflow.sh deploy",
      "deploy:force": "vercel --prod --force",
      "monitor": "./dev-workflow.sh monitor",
      "debug": "./dev-workflow.sh debug",
      "vercel:link": "vercel link",
      "vercel:deploy": "vercel --prod",
      "vercel:logs": "vercel logs",
      "health": "curl -s https://document-intelligence-suite.vercel.app/ | grep -o 'assets/index-[^\"]*\.js'"
    };

    fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
    this.log('✅ Package.json scripts updated');
  }

  async linkVercelProject() {
    this.log('🔗 Linking Vercel project...');
    
    try {
      // Check if already linked
      if (fs.existsSync('.vercel/project.json')) {
        this.log('✅ Vercel project already linked');
        return true;
      }

      // Link the project
      execSync('vercel link --yes', { stdio: 'inherit' });
      this.log('✅ Vercel project linked');
      return true;
    } catch (error) {
      this.log(`❌ Failed to link Vercel project: ${error.message}`, 'error');
      return false;
    }
  }

  async forceRedeploy() {
    this.log('🚀 Forcing complete redeploy...');
    
    try {
      // Clean everything
      this.log('🧹 Cleaning build artifacts...');
      if (fs.existsSync('frontend/dist')) {
        execSync('rm -rf frontend/dist');
      }

      // Build fresh
      this.log('🔨 Building fresh frontend...');
      execSync('cd frontend && npm run build', { stdio: 'inherit' });

      // Create a unique trigger
      const triggerContent = `# Deployment Trigger ${Date.now()}

## Build Info:
- Build Time: ${new Date().toISOString()}
- Node Version: ${process.version}
- Frontend Assets: ${fs.readdirSync('frontend/dist/assets').length} files
- Health Page: ${fs.existsSync('frontend/dist/health.html') ? 'Present' : 'Missing'}

## Vercel Configuration:
- Project ID: ${this.projectId}
- Build Command: cd frontend && npm run build
- Output Directory: frontend/dist

This should trigger a fresh deployment.
`;

      fs.writeFileSync('DEPLOYMENT_TRIGGER.md', triggerContent);

      // Commit and push
      this.log('📝 Committing changes...');
      execSync('git add .', { stdio: 'inherit' });
      execSync(`git commit -m "🚀 FORCE REDEPLOY: ${Date.now()}"`, { stdio: 'inherit' });
      execSync('git push origin main', { stdio: 'inherit' });

      // Deploy with Vercel CLI
      this.log('🚀 Deploying with Vercel CLI...');
      execSync('vercel --prod --force', { stdio: 'inherit' });

      this.log('✅ Force redeploy completed');
      return true;
    } catch (error) {
      this.log(`❌ Force redeploy failed: ${error.message}`, 'error');
      return false;
    }
  }

  async verifyDeployment() {
    this.log('🔍 Verifying deployment...');
    
    // Wait for deployment
    this.log('⏳ Waiting for deployment to complete (30 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 30000));

    try {
      const response = await fetch('https://document-intelligence-suite.vercel.app/');
      if (response.ok) {
        this.log('✅ Main app is accessible');
        
        const html = await response.text();
        const assetMatch = html.match(/assets\/index-([^.]+)\.js/);
        if (assetMatch) {
          this.log(`✅ Asset hash: ${assetMatch[1]}`);
        }

        // Check health page
        const healthResponse = await fetch('https://document-intelligence-suite.vercel.app/health');
        if (healthResponse.ok) {
          this.log('✅ Health page is accessible');
        } else {
          this.log(`⚠️ Health page: ${healthResponse.status}`);
        }

        return true;
      } else {
        this.log(`❌ Main app not accessible: ${response.status}`, 'error');
        return false;
      }
    } catch (error) {
      this.log(`❌ Verification failed: ${error.message}`, 'error');
      return false;
    }
  }

  async run() {
    this.log('🚀 Starting permanent Vercel fix...');
    
    try {
      // Check Vercel CLI
      const cliAvailable = await this.checkVercelCLI();
      if (!cliAvailable) {
        throw new Error('Vercel CLI not available');
      }

      // Fix configuration
      await this.fixVercelConfig();
      await this.createBuildScript();
      await this.createDevWorkflow();
      await this.createPackageJsonScripts();

      // Link project
      await this.linkVercelProject();

      // Force redeploy
      const deploySuccess = await this.forceRedeploy();
      if (!deploySuccess) {
        throw new Error('Force redeploy failed');
      }

      // Verify deployment
      const verifySuccess = await this.verifyDeployment();
      if (!verifySuccess) {
        this.log('⚠️ Deployment verification failed, but scripts are ready', 'warn');
      }

      this.log('\n🎉 Permanent Vercel fix completed!');
      this.log('\n📋 Available commands:');
      this.log('  npm run deploy     - Deploy to Vercel');
      this.log('  npm run monitor    - Monitor deployment');
      this.log('  npm run debug      - Debug issues');
      this.log('  ./dev-workflow.sh deploy  - Full deployment workflow');
      this.log('  ./dev-workflow.sh monitor - Continuous monitoring');
      this.log('  ./dev-workflow.sh debug   - Debug checks');

    } catch (error) {
      this.log(`❌ Permanent fix failed: ${error.message}`, 'error');
      throw error;
    }
  }
}

// Run the fix
if (require.main === module) {
  const fixer = new VercelPermanentFix();
  fixer.run().catch(console.error);
}

module.exports = VercelPermanentFix;
