#!/usr/bin/env node

/**
 * Development Monitor
 * Continuous monitoring for development workflow
 */

const fs = require('fs');
const { execSync } = require('child_process');

class DevMonitor {
  constructor() {
    this.logs = [];
    this.metrics = {
      startTime: Date.now(),
      deployments: 0,
      successes: 0,
      failures: 0,
      lastDeployment: null
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
    this.logs.push(logEntry);
    console.log(logEntry);
  }

  async checkDeploymentStatus() {
    try {
      const response = await fetch('https://document-intelligence-suite.vercel.app/');
      if (response.ok) {
        const html = await response.text();
        const assetMatch = html.match(/assets\/index-([^.]+)\.js/);
        return {
          status: 'healthy',
          assetHash: assetMatch ? assetMatch[1] : 'unknown',
          timestamp: Date.now()
        };
      } else {
        return {
          status: 'unhealthy',
          error: `HTTP ${response.status}`,
          timestamp: Date.now()
        };
      }
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        timestamp: Date.now()
      };
    }
  }

  async checkHealthPage() {
    try {
      const response = await fetch('https://document-intelligence-suite.vercel.app/health');
      return {
        status: response.ok ? 'accessible' : 'inaccessible',
        httpStatus: response.status,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        timestamp: Date.now()
      };
    }
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
      return {
        error: error.message
      };
    }
  }

  async checkBuildStatus() {
    try {
      const distExists = fs.existsSync('frontend/dist/index.html');
      const healthExists = fs.existsSync('frontend/dist/health.html');
      
      if (distExists) {
        const stats = fs.statSync('frontend/dist/index.html');
        return {
          status: 'built',
          lastBuild: stats.mtime,
          healthPage: healthExists,
          files: fs.readdirSync('frontend/dist').length
        };
      } else {
        return {
          status: 'not_built',
          healthPage: false
        };
      }
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  async runHealthCheck() {
    this.log('🔍 Running comprehensive health check...');
    
    const [deployment, health, git, build] = await Promise.all([
      this.checkDeploymentStatus(),
      this.checkHealthPage(),
      this.checkGitStatus(),
      this.checkBuildStatus()
    ]);

    const report = {
      timestamp: new Date().toISOString(),
      deployment,
      health,
      git,
      build,
      metrics: this.metrics
    };

    // Log results
    this.log(`📊 Deployment: ${deployment.status} ${deployment.assetHash ? `(${deployment.assetHash})` : ''}`);
    this.log(`🏥 Health Page: ${health.status} ${health.httpStatus ? `(${health.httpStatus})` : ''}`);
    this.log(`📝 Git: ${git.branch} ${git.hasChanges ? '(has changes)' : '(clean)'}`);
    this.log(`🔨 Build: ${build.status} ${build.lastBuild ? `(${new Date(build.lastBuild).toLocaleString()})` : ''}`);

    return report;
  }

  async autoDeploy() {
    this.log('🚀 Starting auto-deploy...');
    
    try {
      // Check if there are changes
      const gitStatus = await this.checkGitStatus();
      if (!gitStatus.hasChanges) {
        this.log('ℹ️ No changes to deploy');
        return false;
      }

      this.log('📝 Changes detected, deploying...');
      
      // Build frontend
      this.log('🔨 Building frontend...');
      execSync('cd frontend && npm run build', { stdio: 'inherit' });
      
      // Commit changes
      this.log('📝 Committing changes...');
      execSync('git add .', { stdio: 'inherit' });
      execSync(`git commit -m "🚀 Auto-deploy: ${new Date().toISOString()}"`, { stdio: 'inherit' });
      
      // Push to GitHub
      this.log('📤 Pushing to GitHub...');
      execSync('git push origin main', { stdio: 'inherit' });
      
      // Deploy to Vercel
      this.log('🚀 Deploying to Vercel...');
      execSync('vercel --prod --yes', { stdio: 'inherit' });
      
      this.metrics.deployments++;
      this.metrics.lastDeployment = Date.now();
      this.metrics.successes++;
      
      this.log('✅ Auto-deploy completed successfully');
      return true;
      
    } catch (error) {
      this.metrics.failures++;
      this.log(`❌ Auto-deploy failed: ${error.message}`, 'error');
      return false;
    }
  }

  async runContinuous(intervalMs = 60000) {
    this.log(`🚀 Starting continuous monitoring (interval: ${intervalMs}ms)...`);
    this.log('Press Ctrl+C to stop');
    
    const runCheck = async () => {
      try {
        const report = await this.runHealthCheck();
        
        // Save report
        const reportPath = `dev-monitor-${Date.now()}.json`;
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        // Auto-deploy if needed
        if (process.argv.includes('--auto-deploy')) {
          await this.autoDeploy();
        }
        
        // Alert on issues
        if (report.deployment.status !== 'healthy') {
          this.log('🚨 ALERT: Deployment is not healthy!', 'error');
        }
        
        if (report.health.status !== 'accessible') {
          this.log('🚨 ALERT: Health page is not accessible!', 'error');
        }
        
      } catch (error) {
        this.log(`❌ Health check failed: ${error.message}`, 'error');
      }
    };

    // Run initial check
    await runCheck();
    
    // Set up interval
    const interval = setInterval(runCheck, intervalMs);
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      this.log('\n🛑 Stopping monitoring...');
      clearInterval(interval);
      
      const finalReport = {
        timestamp: new Date().toISOString(),
        metrics: this.metrics,
        totalChecks: this.logs.length
      };
      
      fs.writeFileSync('dev-monitor-final.json', JSON.stringify(finalReport, null, 2));
      this.log('💾 Final report saved to dev-monitor-final.json');
      process.exit(0);
    });
  }

  async runOnce() {
    this.log('🔍 Running single health check...');
    const report = await this.runHealthCheck();
    
    const reportPath = `dev-monitor-${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    this.log(`💾 Report saved to: ${reportPath}`);
    
    return report;
  }
}

// CLI interface
if (require.main === module) {
  const monitor = new DevMonitor();
  const args = process.argv.slice(2);
  
  if (args.includes('--continuous') || args.includes('-c')) {
    const interval = args.includes('--interval') ? parseInt(args[args.indexOf('--interval') + 1]) : 60000;
    const autoDeploy = args.includes('--auto-deploy');
    if (autoDeploy) {
      console.log('🤖 Auto-deploy mode enabled');
    }
    monitor.runContinuous(interval);
  } else {
    monitor.runOnce().then(() => process.exit(0)).catch(console.error);
  }
}

module.exports = DevMonitor;
