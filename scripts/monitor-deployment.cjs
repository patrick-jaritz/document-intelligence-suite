#!/usr/bin/env node

/**
 * Deployment Monitoring Script
 * Continuously monitors deployment status and health
 */

const fs = require('fs');
const path = require('path');

class DeploymentMonitor {
  constructor() {
    this.metrics = {
      startTime: Date.now(),
      checks: 0,
      successes: 0,
      failures: 0,
      lastSuccess: null,
      lastFailure: null
    };
    this.logs = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
    this.logs.push(logEntry);
    console.log(logEntry);
  }

  async checkEndpoint(url, name) {
    try {
      const response = await fetch(url);
      const isSuccess = response.ok;
      
      this.metrics.checks++;
      if (isSuccess) {
        this.metrics.successes++;
        this.metrics.lastSuccess = Date.now();
        this.log(`✅ ${name}: ${response.status} (${response.statusText})`);
      } else {
        this.metrics.failures++;
        this.metrics.lastFailure = Date.now();
        this.log(`❌ ${name}: ${response.status} (${response.statusText})`, 'error');
      }
      
      return {
        name,
        url,
        status: response.status,
        success: isSuccess,
        timestamp: Date.now()
      };
    } catch (error) {
      this.metrics.checks++;
      this.metrics.failures++;
      this.metrics.lastFailure = Date.now();
      this.log(`❌ ${name}: ${error.message}`, 'error');
      
      return {
        name,
        url,
        status: 'ERROR',
        success: false,
        error: error.message,
        timestamp: Date.now()
      };
    }
  }

  async runHealthCheck() {
    this.log('🔍 Running comprehensive health check...');
    
    const endpoints = [
      { url: 'https://document-intelligence-suite.vercel.app/', name: 'Main App' },
      { url: 'https://document-intelligence-suite.vercel.app/health', name: 'Health Page' },
      { url: 'https://document-intelligence-suite.vercel.app/health.html', name: 'Health HTML' },
      { url: 'https://joqnpibrfzqflyogrkht.supabase.co/functions/v1/health', name: 'Supabase Health' }
    ];

    const results = [];
    for (const endpoint of endpoints) {
      const result = await this.checkEndpoint(endpoint.url, endpoint.name);
      results.push(result);
    }

    return results;
  }

  generateReport() {
    const uptime = Date.now() - this.metrics.startTime;
    const successRate = this.metrics.checks > 0 ? (this.metrics.successes / this.metrics.checks * 100).toFixed(2) : 0;
    
    const report = {
      timestamp: new Date().toISOString(),
      uptime: uptime,
      metrics: this.metrics,
      successRate: `${successRate}%`,
      status: successRate > 80 ? 'HEALTHY' : successRate > 50 ? 'DEGRADED' : 'UNHEALTHY'
    };

    this.log('\n📊 DEPLOYMENT MONITORING REPORT');
    this.log('='.repeat(50));
    this.log(`Status: ${report.status}`);
    this.log(`Uptime: ${Math.floor(uptime / 1000)}s`);
    this.log(`Total Checks: ${this.metrics.checks}`);
    this.log(`Successes: ${this.metrics.successes}`);
    this.log(`Failures: ${this.metrics.failures}`);
    this.log(`Success Rate: ${successRate}%`);
    
    if (this.metrics.lastSuccess) {
      this.log(`Last Success: ${new Date(this.metrics.lastSuccess).toISOString()}`);
    }
    if (this.metrics.lastFailure) {
      this.log(`Last Failure: ${new Date(this.metrics.lastFailure).toISOString()}`);
    }

    return report;
  }

  async saveReport(report) {
    const reportPath = `deployment-monitor-${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    this.log(`💾 Report saved to: ${reportPath}`);
  }

  async runContinuous(intervalMs = 30000) {
    this.log(`🚀 Starting continuous monitoring (interval: ${intervalMs}ms)...`);
    
    const runCheck = async () => {
      try {
        const results = await this.runHealthCheck();
        const report = this.generateReport();
        
        // Save report every 10 checks
        if (this.metrics.checks % 10 === 0) {
          await this.saveReport(report);
        }
        
        // Alert on failures
        if (this.metrics.failures > 0 && this.metrics.lastFailure > (this.metrics.lastSuccess || 0)) {
          this.log('🚨 ALERT: Recent failures detected!', 'error');
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
      const finalReport = this.generateReport();
      this.saveReport(finalReport);
      process.exit(0);
    });
  }

  async runOnce() {
    this.log('🔍 Running single health check...');
    const results = await this.runHealthCheck();
    const report = this.generateReport();
    await this.saveReport(report);
    return report;
  }
}

// CLI interface
if (require.main === module) {
  const monitor = new DeploymentMonitor();
  const args = process.argv.slice(2);
  
  if (args.includes('--continuous') || args.includes('-c')) {
    const interval = args.includes('--interval') ? parseInt(args[args.indexOf('--interval') + 1]) : 30000;
    monitor.runContinuous(interval);
  } else {
    monitor.runOnce().then(() => process.exit(0)).catch(console.error);
  }
}

module.exports = DeploymentMonitor;
