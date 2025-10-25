#!/usr/bin/env node

/**
 * Comprehensive Deployment Debugging Script
 * Diagnoses and fixes Vercel deployment issues
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class DeploymentDebugger {
  constructor() {
    this.issues = [];
    this.fixes = [];
    this.logs = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
    this.logs.push(logEntry);
    console.log(logEntry);
  }

  async checkProjectStructure() {
    this.log('🔍 Checking project structure...');
    
    const requiredFiles = [
      'package.json',
      'vercel.json',
      'frontend/package.json',
      'frontend/vite.config.ts',
      'frontend/src/main.tsx'
    ];

    for (const file of requiredFiles) {
      if (fs.existsSync(file)) {
        this.log(`✅ Found: ${file}`);
      } else {
        this.issues.push(`❌ Missing: ${file}`);
        this.log(`❌ Missing: ${file}`, 'error');
      }
    }
  }

  async checkVercelConfig() {
    this.log('🔍 Checking Vercel configuration...');
    
    try {
      const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
      
      // Check builds configuration
      if (!vercelConfig.builds || vercelConfig.builds.length === 0) {
        this.issues.push('❌ No builds configured in vercel.json');
      } else {
        this.log('✅ Builds configuration found');
        
        // Check frontend build config
        const frontendBuild = vercelConfig.builds.find(b => b.src === 'frontend/package.json');
        if (frontendBuild) {
          this.log(`✅ Frontend build config: ${JSON.stringify(frontendBuild.config)}`);
          
          if (frontendBuild.config?.distDir !== 'frontend/dist') {
            this.issues.push('❌ Frontend distDir should be "frontend/dist"');
            this.fixes.push('Update frontend build distDir to "frontend/dist"');
          }
        }
      }

      // Check routes configuration
      if (!vercelConfig.routes || vercelConfig.routes.length === 0) {
        this.issues.push('❌ No routes configured in vercel.json');
      } else {
        this.log(`✅ Routes configuration found: ${vercelConfig.routes.length} routes`);
      }

    } catch (error) {
      this.issues.push(`❌ Invalid vercel.json: ${error.message}`);
      this.log(`❌ Invalid vercel.json: ${error.message}`, 'error');
    }
  }

  async checkFrontendBuild() {
    this.log('🔍 Checking frontend build...');
    
    try {
      // Check if dist directory exists
      if (!fs.existsSync('frontend/dist')) {
        this.issues.push('❌ Frontend dist directory not found');
        this.log('Building frontend...');
        
        try {
          execSync('cd frontend && npm run build', { stdio: 'inherit' });
          this.log('✅ Frontend build completed');
        } catch (error) {
          this.issues.push(`❌ Frontend build failed: ${error.message}`);
          this.log(`❌ Frontend build failed: ${error.message}`, 'error');
        }
      } else {
        this.log('✅ Frontend dist directory exists');
        
        // Check for index.html
        if (fs.existsSync('frontend/dist/index.html')) {
          this.log('✅ index.html found in dist');
        } else {
          this.issues.push('❌ index.html not found in frontend/dist');
        }

        // Check for health.html
        if (fs.existsSync('frontend/dist/health.html')) {
          this.log('✅ health.html found in dist');
        } else {
          this.log('⚠️ health.html not found in dist (optional)');
        }
      }
    } catch (error) {
      this.issues.push(`❌ Frontend build check failed: ${error.message}`);
      this.log(`❌ Frontend build check failed: ${error.message}`, 'error');
    }
  }

  async checkGitStatus() {
    this.log('🔍 Checking Git status...');
    
    try {
      const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
      if (gitStatus.trim()) {
        this.log('⚠️ Uncommitted changes detected:');
        console.log(gitStatus);
        this.issues.push('❌ Uncommitted changes detected');
      } else {
        this.log('✅ No uncommitted changes');
      }

      const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
      this.log(`✅ Current branch: ${currentBranch}`);

      const lastCommit = execSync('git log -1 --oneline', { encoding: 'utf8' }).trim();
      this.log(`✅ Last commit: ${lastCommit}`);

    } catch (error) {
      this.issues.push(`❌ Git check failed: ${error.message}`);
      this.log(`❌ Git check failed: ${error.message}`, 'error');
    }
  }

  async checkDeploymentStatus() {
    this.log('🔍 Checking deployment status...');
    
    try {
      // Check if Vercel CLI is available
      try {
        const vercelVersion = execSync('vercel --version', { encoding: 'utf8' }).trim();
        this.log(`✅ Vercel CLI available: ${vercelVersion}`);
      } catch (error) {
        this.log('⚠️ Vercel CLI not available', 'warn');
      }

      // Check current deployment
      const response = await fetch('https://document-intelligence-suite.vercel.app/');
      if (response.ok) {
        this.log('✅ Main app is accessible');
        
        // Check for health page
        const healthResponse = await fetch('https://document-intelligence-suite.vercel.app/health');
        if (healthResponse.ok) {
          this.log('✅ Health page is accessible');
        } else {
          this.log(`⚠️ Health page returns ${healthResponse.status}`);
        }

        // Check for health.html
        const healthHtmlResponse = await fetch('https://document-intelligence-suite.vercel.app/health.html');
        if (healthHtmlResponse.ok) {
          this.log('✅ health.html is accessible');
        } else {
          this.log(`⚠️ health.html returns ${healthHtmlResponse.status}`);
        }
      } else {
        this.issues.push(`❌ Main app not accessible: ${response.status}`);
        this.log(`❌ Main app not accessible: ${response.status}`, 'error');
      }

    } catch (error) {
      this.issues.push(`❌ Deployment status check failed: ${error.message}`);
      this.log(`❌ Deployment status check failed: ${error.message}`, 'error');
    }
  }

  async generateReport() {
    this.log('\n📊 DEPLOYMENT DEBUG REPORT');
    this.log('='.repeat(50));
    
    this.log(`\n🔍 Issues Found: ${this.issues.length}`);
    this.issues.forEach((issue, index) => {
      this.log(`${index + 1}. ${issue}`);
    });

    this.log(`\n🔧 Suggested Fixes: ${this.fixes.length}`);
    this.fixes.forEach((fix, index) => {
      this.log(`${index + 1}. ${fix}`);
    });

    this.log(`\n📝 Total Log Entries: ${this.logs.length}`);
    
    // Save report to file
    const reportPath = 'deployment-debug-report.txt';
    fs.writeFileSync(reportPath, this.logs.join('\n'));
    this.log(`\n💾 Report saved to: ${reportPath}`);

    return {
      issues: this.issues,
      fixes: this.fixes,
      logs: this.logs
    };
  }

  async run() {
    this.log('🚀 Starting comprehensive deployment debugging...');
    
    await this.checkProjectStructure();
    await this.checkVercelConfig();
    await this.checkFrontendBuild();
    await this.checkGitStatus();
    await this.checkDeploymentStatus();
    
    const report = await this.generateReport();
    
    if (this.issues.length === 0) {
      this.log('\n🎉 No issues found! Deployment should be working correctly.');
    } else {
      this.log(`\n⚠️ Found ${this.issues.length} issues that need attention.`);
    }
    
    return report;
  }
}

// Run the debugger
if (require.main === module) {
  const debuggerInstance = new DeploymentDebugger();
  debuggerInstance.run().catch(console.error);
}

module.exports = DeploymentDebugger;
