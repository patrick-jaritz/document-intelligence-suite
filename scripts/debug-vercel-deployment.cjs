#!/usr/bin/env node

/**
 * Comprehensive Vercel Deployment Debugger
 * Identifies and fixes Vercel deployment issues
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class VercelDebugger {
  constructor() {
    this.logs = [];
    this.issues = [];
    this.fixes = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [VERCEL-DEBUG] [${type.toUpperCase()}] ${message}`;
    this.logs.push(logEntry);
    console.log(logEntry);
  }

  async checkGitStatus() {
    this.log('🔍 Checking Git status...');
    try {
      const status = execSync('git status --porcelain', { encoding: 'utf8' });
      const hasChanges = status.trim().length > 0;
      
      this.log(`📝 Git status: ${hasChanges ? 'Has uncommitted changes' : 'Clean'}`);
      if (hasChanges) {
        this.log(`📋 Uncommitted changes:\n${status}`);
        this.issues.push('Uncommitted changes detected');
      }
      
      return { hasChanges, changes: status.trim().split('\n').filter(line => line.length > 0) };
    } catch (error) {
      this.log(`❌ Git status error: ${error.message}`, 'error');
      this.issues.push(`Git error: ${error.message}`);
      return { hasChanges: false, error: error.message };
    }
  }

  async checkBuildArtifacts() {
    this.log('🔍 Checking build artifacts...');
    const buildDir = 'frontend/dist';
    
    if (!fs.existsSync(buildDir)) {
      this.log('❌ Build directory does not exist', 'error');
      this.issues.push('Build directory missing');
      return { exists: false };
    }

    const files = fs.readdirSync(buildDir);
    const indexHtml = files.find(f => f === 'index.html');
    const jsFiles = files.filter(f => f.endsWith('.js'));
    const cssFiles = files.filter(f => f.endsWith('.css'));

    this.log(`📁 Build directory contents: ${files.length} files`);
    this.log(`📄 HTML files: ${indexHtml ? '✅ index.html' : '❌ Missing'}`);
    this.log(`📦 JS files: ${jsFiles.length} (${jsFiles.join(', ')})`);
    this.log(`🎨 CSS files: ${cssFiles.length} (${cssFiles.join(', ')})`);

    // Check for asset hashes
    const assetHashes = jsFiles.map(f => {
      const match = f.match(/index-([^.]+)\.js/);
      return match ? match[1] : null;
    }).filter(Boolean);

    this.log(`🔢 Asset hashes found: ${assetHashes.join(', ')}`);

    return {
      exists: true,
      files,
      indexHtml: !!indexHtml,
      jsFiles,
      cssFiles,
      assetHashes
    };
  }

  async checkVercelConfig() {
    this.log('🔍 Checking Vercel configuration...');
    const vercelJsonPath = 'vercel.json';
    
    if (!fs.existsSync(vercelJsonPath)) {
      this.log('❌ vercel.json not found', 'error');
      this.issues.push('Missing vercel.json');
      return { exists: false };
    }

    try {
      const config = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf8'));
      this.log('✅ vercel.json found and valid');
      
      // Check build configuration
      if (config.builds) {
        this.log(`📦 Builds configured: ${config.builds.length}`);
        config.builds.forEach((build, i) => {
          this.log(`  Build ${i + 1}: ${build.src} -> ${build.use}`);
          if (build.config && build.config.distDir) {
            this.log(`    Dist dir: ${build.config.distDir}`);
          }
        });
      }

      // Check routes/rewrites
      if (config.routes) {
        this.log(`🛣️ Routes configured: ${config.routes.length}`);
      } else if (config.rewrites) {
        this.log(`🛣️ Rewrites configured: ${config.rewrites.length}`);
      }

      return { exists: true, config };
    } catch (error) {
      this.log(`❌ Invalid vercel.json: ${error.message}`, 'error');
      this.issues.push(`Invalid vercel.json: ${error.message}`);
      return { exists: false, error: error.message };
    }
  }

  async checkDeploymentHistory() {
    this.log('🔍 Checking deployment history...');
    try {
      // Check recent commits
      const recentCommits = execSync('git log --oneline -10', { encoding: 'utf8' });
      this.log('📚 Recent commits:');
      recentCommits.split('\n').forEach((commit, i) => {
        if (commit.trim()) {
          this.log(`  ${i + 1}. ${commit}`);
        }
      });

      // Check if we're on main branch
      const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
      this.log(`🌿 Current branch: ${currentBranch}`);
      
      if (currentBranch !== 'main') {
        this.log('⚠️ Not on main branch - Vercel might not deploy', 'warn');
        this.issues.push('Not on main branch');
      }

      return { currentBranch, recentCommits: recentCommits.split('\n').filter(c => c.trim()) };
    } catch (error) {
      this.log(`❌ Git history error: ${error.message}`, 'error');
      this.issues.push(`Git history error: ${error.message}`);
      return { error: error.message };
    }
  }

  async checkVercelDeployment() {
    this.log('🔍 Checking Vercel deployment status...');
    try {
      // Check if Vercel CLI is available
      try {
        const vercelVersion = execSync('vercel --version', { encoding: 'utf8' }).trim();
        this.log(`✅ Vercel CLI available: ${vercelVersion}`);
      } catch {
        this.log('⚠️ Vercel CLI not available', 'warn');
        this.issues.push('Vercel CLI not available');
      }

      // Check current deployment
      const response = await fetch('https://document-intelligence-suite.vercel.app/');
      if (response.ok) {
        const html = await response.text();
        const assetMatch = html.match(/assets\/index-([^.]+)\.js/);
        const currentHash = assetMatch ? assetMatch[1] : 'unknown';
        
        this.log(`🌐 Live deployment asset hash: ${currentHash}`);
        
        // Check build directory for comparison
        const buildDir = 'frontend/dist';
        if (fs.existsSync(buildDir)) {
          const files = fs.readdirSync(buildDir);
          const jsFiles = files.filter(f => f.endsWith('.js'));
          const buildHashes = jsFiles.map(f => {
            const match = f.match(/index-([^.]+)\.js/);
            return match ? match[1] : null;
          }).filter(Boolean);
          
          this.log(`🔨 Local build hashes: ${buildHashes.join(', ')}`);
          
          if (buildHashes.length > 0 && !buildHashes.includes(currentHash)) {
            this.log('⚠️ Live deployment is not using latest build', 'warn');
            this.issues.push('Deployment not using latest build');
          }
        }
        
        return { status: 'live', assetHash: currentHash, html: html.substring(0, 500) };
      } else {
        this.log(`❌ Deployment not accessible: ${response.status}`, 'error');
        this.issues.push(`Deployment error: ${response.status}`);
        return { status: 'error', code: response.status };
      }
    } catch (error) {
      this.log(`❌ Deployment check error: ${error.message}`, 'error');
      this.issues.push(`Deployment check error: ${error.message}`);
      return { error: error.message };
    }
  }

  async forceCleanBuild() {
    this.log('🧹 Forcing clean build...');
    try {
      // Clean build directory
      if (fs.existsSync('frontend/dist')) {
        execSync('rm -rf frontend/dist');
        this.log('✅ Cleaned build directory');
      }

      // Clean node_modules and reinstall
      if (fs.existsSync('frontend/node_modules')) {
        execSync('rm -rf frontend/node_modules');
        this.log('✅ Cleaned node_modules');
      }

      // Reinstall dependencies
      this.log('📦 Reinstalling dependencies...');
      execSync('cd frontend && npm install', { stdio: 'inherit' });

      // Build
      this.log('🔨 Building frontend...');
      execSync('cd frontend && npm run build', { stdio: 'inherit' });

      // Verify build
      const buildDir = 'frontend/dist';
      if (fs.existsSync(buildDir)) {
        const files = fs.readdirSync(buildDir);
        const jsFiles = files.filter(f => f.endsWith('.js'));
        this.log(`✅ Clean build completed: ${jsFiles.length} JS files`);
        
        const assetHashes = jsFiles.map(f => {
          const match = f.match(/index-([^.]+)\.js/);
          return match ? match[1] : null;
        }).filter(Boolean);
        
        this.log(`🔢 New asset hashes: ${assetHashes.join(', ')}`);
        return { success: true, assetHashes };
      } else {
        this.log('❌ Build failed - no dist directory', 'error');
        return { success: false };
      }
    } catch (error) {
      this.log(`❌ Clean build failed: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  async forceDeployment() {
    this.log('🚀 Forcing deployment...');
    try {
      // Create a deployment trigger file
      const triggerContent = `# FORCE DEPLOYMENT TRIGGER

## Timestamp: ${new Date().toISOString()}
## Reason: Force deployment due to caching issues
## Action: This file should trigger a new Vercel deployment

## Build Information:
- Frontend built: ${fs.existsSync('frontend/dist') ? 'Yes' : 'No'}
- Asset files: ${fs.existsSync('frontend/dist') ? fs.readdirSync('frontend/dist').filter(f => f.endsWith('.js')).length : 0}
- Last commit: ${execSync('git log -1 --oneline', { encoding: 'utf8' }).trim()}

This is a force deployment trigger to resolve Vercel caching issues.
`;

      fs.writeFileSync('FORCE_DEPLOYMENT_TRIGGER.md', triggerContent);
      this.log('✅ Created deployment trigger file');

      // Commit and push
      this.log('📝 Committing changes...');
      execSync('git add .');
      execSync('git commit -m "🚀 FORCE DEPLOY: Resolve Vercel caching issues"');
      
      this.log('📤 Pushing to GitHub...');
      execSync('git push origin main');
      
      this.log('✅ Force deployment triggered');
      return { success: true };
    } catch (error) {
      this.log(`❌ Force deployment failed: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  async generateReport() {
    this.log('📊 Generating comprehensive report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      issues: this.issues,
      fixes: this.fixes,
      logs: this.logs,
      summary: {
        totalIssues: this.issues.length,
        totalFixes: this.fixes.length,
        status: this.issues.length === 0 ? 'HEALTHY' : 'NEEDS_ATTENTION'
      }
    };

    const reportFile = `vercel-debug-report-${Date.now()}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    this.log(`📄 Report saved to: ${reportFile}`);
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('🔍 VERCEL DEPLOYMENT DEBUG REPORT');
    console.log('='.repeat(60));
    console.log(`📊 Status: ${report.summary.status}`);
    console.log(`❌ Issues Found: ${report.summary.totalIssues}`);
    console.log(`✅ Fixes Applied: ${report.summary.totalFixes}`);
    
    if (this.issues.length > 0) {
      console.log('\n🚨 ISSUES:');
      this.issues.forEach((issue, i) => {
        console.log(`  ${i + 1}. ${issue}`);
      });
    }
    
    if (this.fixes.length > 0) {
      console.log('\n🔧 FIXES:');
      this.fixes.forEach((fix, i) => {
        console.log(`  ${i + 1}. ${fix}`);
      });
    }
    
    console.log('\n📋 RECOMMENDATIONS:');
    if (this.issues.includes('Deployment not using latest build')) {
      console.log('  • Force a new deployment to clear Vercel cache');
      console.log('  • Check Vercel dashboard for deployment status');
      console.log('  • Consider adding cache-busting to build process');
    }
    if (this.issues.includes('Not on main branch')) {
      console.log('  • Switch to main branch before deploying');
    }
    if (this.issues.includes('Uncommitted changes detected')) {
      console.log('  • Commit all changes before deploying');
    }
    
    console.log('='.repeat(60));
    
    return report;
  }

  async runFullDiagnosis() {
    this.log('🔍 Starting comprehensive Vercel deployment diagnosis...');
    
    // Step 1: Check Git status
    await this.checkGitStatus();
    
    // Step 2: Check build artifacts
    await this.checkBuildArtifacts();
    
    // Step 3: Check Vercel configuration
    await this.checkVercelConfig();
    
    // Step 4: Check deployment history
    await this.checkDeploymentHistory();
    
    // Step 5: Check current deployment
    await this.checkVercelDeployment();
    
    // Step 6: Generate report
    const report = await this.generateReport();
    
    return report;
  }
}

// CLI interface
if (require.main === module) {
  const vercelDebugger = new VercelDebugger();
  const command = process.argv[2] || 'diagnose';
  
  switch (command) {
    case 'diagnose':
      vercelDebugger.runFullDiagnosis().then(report => {
        process.exit(report.summary.status === 'HEALTHY' ? 0 : 1);
      });
      break;
    case 'clean-build':
      vercelDebugger.forceCleanBuild().then(result => {
        process.exit(result.success ? 0 : 1);
      });
      break;
    case 'force-deploy':
      vercelDebugger.forceDeployment().then(result => {
        process.exit(result.success ? 0 : 1);
      });
      break;
    default:
      console.log('Usage: node debug-vercel-deployment.cjs [diagnose|clean-build|force-deploy]');
      process.exit(1);
  }
}

module.exports = VercelDebugger;
