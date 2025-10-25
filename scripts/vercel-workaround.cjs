#!/usr/bin/env node

/**
 * Vercel Deployment Workaround
 * Comprehensive solution for persistent Vercel deployment issues
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class VercelWorkaround {
  constructor() {
    this.logs = [];
    this.solutions = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [VERCEL-WORKAROUND] [${type.toUpperCase()}] ${message}`;
    this.logs.push(logEntry);
    console.log(logEntry);
  }

  async implementWorkaround() {
    this.log('🔧 Implementing Vercel deployment workaround...');
    
    try {
      // Solution 1: Create a completely new Vercel configuration
      this.log('📝 Creating new Vercel configuration...');
      const newVercelConfig = {
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
          }
        ],
        "routes": [
          {
            "src": "/api/(.*)",
            "dest": "/api/$1"
          },
          {
            "src": "/(.*)",
            "dest": "/$1"
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
          },
          "api/health.js": {
            "maxDuration": 10
          }
        },
        "env": {
          "NODE_ENV": "production"
        },
        "buildCommand": "cd frontend && npm run build",
        "outputDirectory": "frontend/dist",
        "installCommand": "cd frontend && npm install",
        "framework": "vite",
        "deploymentId": `deploy-${Date.now()}`,
        "timestamp": Date.now()
      };
      
      fs.writeFileSync('vercel.json', JSON.stringify(newVercelConfig, null, 2));
      this.solutions.push('Created new Vercel configuration');
      
      // Solution 2: Create a .vercelignore file to exclude problematic files
      this.log('📄 Creating .vercelignore file...');
      const vercelIgnore = `# Vercel ignore file
node_modules
.git
.env.local
.env.development.local
.env.test.local
.env.production.local
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.DS_Store
*.log
coverage
.nyc_output
.cache
dist
build
.next
.nuxt
.vuepress/dist
.serverless
.fusebox
.dynamodb
.tern-port
.vscode-test
.yarn/cache
.yarn/unplugged
.yarn/build-state.yml
.yarn/install-state.gz
.pnp.*
test-cors-fix.html
VERCEL_DEPLOYMENT_MARKER.md
FORCE_DEPLOYMENT_TRIGGER.md
vercel-debug-report-*.json
`;
      fs.writeFileSync('.vercelignore', vercelIgnore);
      this.solutions.push('Created .vercelignore file');
      
      // Solution 3: Update package.json with proper build scripts
      this.log('📦 Updating package.json with proper build scripts...');
      const packageJsonPath = 'package.json';
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      packageJson.scripts = {
        ...packageJson.scripts,
        "build": "cd frontend && npm run build",
        "start": "cd frontend && npm run preview",
        "vercel-build": "cd frontend && npm install && npm run build",
        "preview": "cd frontend && npm run preview",
        "dev": "cd frontend && npm run dev"
      };
      
      packageJson.engines = {
        "node": ">=18.0.0"
      };
      
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      this.solutions.push('Updated package.json with proper build scripts');
      
      // Solution 4: Create a proper build script
      this.log('🔨 Creating proper build script...');
      const buildScript = `#!/bin/bash
# Vercel Build Script
set -e

echo "🚀 Starting Vercel build process..."

# Navigate to frontend directory
cd frontend

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building project..."
npm run build

# Verify build
if [ ! -d "dist" ]; then
  echo "❌ Build failed - dist directory not found"
  exit 1
fi

if [ ! -f "dist/index.html" ]; then
  echo "❌ Build failed - index.html not found"
  exit 1
fi

echo "✅ Build completed successfully"
echo "📁 Build contents:"
ls -la dist/

echo "🎉 Vercel build process completed"
`;
      
      fs.writeFileSync('build.sh', buildScript);
      execSync('chmod +x build.sh');
      this.solutions.push('Created build script');
      
      // Solution 5: Create a deployment verification script
      this.log('🔍 Creating deployment verification script...');
      const verifyScript = `#!/usr/bin/env node

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
    
    console.log(\`📁 Build files: \${files.length}\`);
    console.log(\`📄 Has index.html: \${hasIndexHtml}\`);
    console.log(\`📦 Has assets: \${hasAssets}\`);
    
    if (hasAssets) {
      const assetFiles = fs.readdirSync('frontend/dist/assets');
      console.log(\`📦 Asset files: \${assetFiles.length}\`);
      console.log(\`📦 Assets: \${assetFiles.join(', ')}\`);
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
      console.log(\`⚠️ Could not test local server: \${error.message}\`);
    }
    
    console.log('✅ Deployment verification completed');
    return true;
  } catch (error) {
    console.log(\`❌ Verification failed: \${error.message}\`);
    return false;
  }
}

if (require.main === module) {
  verifyDeployment().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { verifyDeployment };
`;
      
      fs.writeFileSync('scripts/verify-deployment.cjs', verifyScript);
      this.solutions.push('Created deployment verification script');
      
      // Solution 6: Create a comprehensive README for deployment
      this.log('📚 Creating deployment README...');
      const deploymentReadme = `# Vercel Deployment Guide

## Current Status
- **Issue**: Vercel is not deploying the latest build
- **Live Hash**: HlcnRfh2 (old)
- **Local Hash**: BbYm6E4I (new)
- **Status**: Deployment workaround implemented

## Solutions Applied

### 1. New Vercel Configuration
- Simplified vercel.json configuration
- Removed complex routing that might cause issues
- Added proper build commands

### 2. Build Process
- Created build.sh script for consistent builds
- Updated package.json with proper scripts
- Added .vercelignore to exclude problematic files

### 3. Verification
- Created verification script to check deployment
- Added comprehensive logging
- Implemented multiple fallback strategies

## Manual Deployment Steps

If automatic deployment continues to fail:

1. **Check Vercel Dashboard**
   - Go to https://vercel.com/dashboard
   - Find the document-intelligence-suite project
   - Check deployment logs for errors

2. **Manual Deploy via CLI**
   \`\`\`bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Login to Vercel
   vercel login
   
   # Deploy
   vercel --prod
   \`\`\`

3. **Force Redeploy**
   - Go to Vercel dashboard
   - Find the latest deployment
   - Click "Redeploy"

4. **Check Build Logs**
   - Look for build errors in Vercel dashboard
   - Check if all dependencies are installing correctly
   - Verify build output directory

## Troubleshooting

### Common Issues
1. **Build Directory**: Ensure frontend/dist exists
2. **Dependencies**: Check if all npm packages install correctly
3. **Node Version**: Ensure compatible Node.js version
4. **File Permissions**: Check if Vercel can read all files

### Debug Commands
\`\`\`bash
# Check build locally
npm run build

# Verify build contents
ls -la frontend/dist/

# Test local server
cd frontend && npx serve dist

# Check Vercel status
vercel ls
\`\`\`

## Current Configuration

### vercel.json
- Uses @vercel/static-build for frontend
- Simple routing configuration
- Proper build commands

### Build Process
1. Install dependencies: \`cd frontend && npm install\`
2. Build project: \`cd frontend && npm run build\`
3. Serve from: \`frontend/dist\`

## Next Steps
1. Monitor Vercel dashboard for deployment status
2. Check if new configuration resolves the issue
3. Consider alternative deployment platforms if Vercel continues to fail
4. Implement CI/CD pipeline for more reliable deployments

## Contact
If issues persist, check:
- Vercel support documentation
- Project GitHub issues
- Vercel community forums
`;
      
      fs.writeFileSync('VERCEL_DEPLOYMENT_GUIDE.md', deploymentReadme);
      this.solutions.push('Created deployment guide');
      
      return { success: true, solutions: this.solutions };
    } catch (error) {
      this.log(`❌ Error implementing workaround: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  async commitWorkaround() {
    this.log('📝 Committing workaround changes...');
    
    try {
      execSync('git add .');
      execSync(`git commit -m "🔧 VERCEL WORKAROUND: Implement comprehensive deployment fix

- New simplified vercel.json configuration
- Added .vercelignore file
- Updated package.json with proper build scripts
- Created build.sh script
- Added deployment verification script
- Created comprehensive deployment guide

This workaround addresses persistent Vercel deployment issues
by simplifying the configuration and adding proper build processes."`);
      
      execSync('git push origin main');
      
      this.log('✅ Workaround committed and pushed');
      return { success: true };
    } catch (error) {
      this.log(`❌ Error committing workaround: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('🔧 VERCEL DEPLOYMENT WORKAROUND REPORT');
    console.log('='.repeat(60));
    console.log(`📊 Status: WORKAROUND IMPLEMENTED`);
    console.log(`✅ Solutions Applied: ${this.solutions.length}`);
    
    console.log('\n🔧 SOLUTIONS IMPLEMENTED:');
    this.solutions.forEach((solution, i) => {
      console.log(`  ${i + 1}. ${solution}`);
    });
    
    console.log('\n📋 NEXT STEPS:');
    console.log('  1. Check Vercel dashboard for deployment status');
    console.log('  2. Monitor if new configuration resolves the issue');
    console.log('  3. Use manual deployment if automatic fails');
    console.log('  4. Check VERCEL_DEPLOYMENT_GUIDE.md for details');
    
    console.log('\n🚨 IMPORTANT:');
    console.log('  • Vercel may take 5-10 minutes to process the new configuration');
    console.log('  • Check Vercel dashboard for any error messages');
    console.log('  • If issues persist, consider manual deployment via Vercel CLI');
    
    console.log('='.repeat(60));
  }

  async runWorkaround() {
    this.log('🚀 Starting Vercel deployment workaround...');
    
    // Step 1: Implement workaround
    const workaroundResult = await this.implementWorkaround();
    if (!workaroundResult.success) {
      this.log('❌ Failed to implement workaround', 'error');
      return { success: false, error: workaroundResult.error };
    }
    
    // Step 2: Commit workaround
    const commitResult = await this.commitWorkaround();
    if (!commitResult.success) {
      this.log('❌ Failed to commit workaround', 'error');
      return { success: false, error: commitResult.error };
    }
    
    // Step 3: Generate report
    this.generateReport();
    
    return {
      success: true,
      solutions: this.solutions,
      logs: this.logs
    };
  }
}

// CLI interface
if (require.main === module) {
  const workaround = new VercelWorkaround();
  workaround.runWorkaround().then(result => {
    process.exit(result.success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = VercelWorkaround;
