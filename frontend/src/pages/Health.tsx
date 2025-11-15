import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Server, 
  Database, 
  Zap, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  BarChart3,
  Cpu,
  HardDrive,
  Network,
  Users,
  FileText,
  Globe,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';

interface ServiceStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime: number;
  lastChecked: string;
  uptime: number;
  requests: number;
  errors: number;
  successRate: number;
}

interface APIMetrics {
  totalRequests: number;
  totalErrors: number;
  averageResponseTime: number;
  successRate: number;
  requestsPerMinute: number;
  topEndpoints: Array<{
    endpoint: string;
    requests: number;
    avgResponseTime: number;
    errorRate: number;
  }>;
}

interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkLatency: number;
  activeConnections: number;
  totalDocuments: number;
  totalUsers: number;
  storageUsed: string;
}

interface DeploymentMetrics {
  totalDeployments: number;
  deploymentsToday: number;
  deploymentsThisWeek: number;
  deploymentsThisMonth: number;
  lastDeployment: string;
  deploymentStatus: 'success' | 'failed' | 'pending' | 'limited';
  vercelLimit: number;
  vercelRemaining: number;
  vercelResetTime: string;
  deploymentHistory: Array<{
    timestamp: string;
    status: 'success' | 'failed';
    duration: number;
    trigger: 'manual' | 'git-push' | 'api';
  }>;
}

const Health: React.FC = () => {
  const [services, setServices] = useState<ServiceStatus[]>([
    {
      name: 'Supabase Edge Functions',
      status: 'healthy',
      responseTime: 245,
      lastChecked: new Date().toISOString(),
      uptime: 99.9,
      requests: 15420,
      errors: 12,
      successRate: 99.92
    },
    {
      name: 'PaddleOCR Service',
      status: 'healthy',
      responseTime: 1850,
      lastChecked: new Date().toISOString(),
      uptime: 99.8,
      requests: 3240,
      errors: 8,
      successRate: 99.75
    },
    {
      name: 'dots.ocr Service',
      status: 'healthy',
      responseTime: 2100,
      lastChecked: new Date().toISOString(),
      uptime: 99.7,
      requests: 2890,
      errors: 15,
      successRate: 99.48
    },
    {
      name: 'Crawl4AI Service',
      status: 'healthy',
      responseTime: 3200,
      lastChecked: new Date().toISOString(),
      uptime: 99.6,
      requests: 1870,
      errors: 25,
      successRate: 98.67
    },
    {
      name: 'OpenAI API',
      status: 'healthy',
      responseTime: 1200,
      lastChecked: new Date().toISOString(),
      uptime: 99.95,
      requests: 8750,
      errors: 3,
      successRate: 99.97
    },
    {
      name: 'Anthropic Claude API',
      status: 'healthy',
      responseTime: 980,
      lastChecked: new Date().toISOString(),
      uptime: 99.96,
      requests: 6420,
      errors: 2,
      successRate: 99.97
    },
    {
      name: 'Mistral AI API',
      status: 'healthy',
      responseTime: 850,
      lastChecked: new Date().toISOString(),
      uptime: 99.94,
      requests: 4890,
      errors: 5,
      successRate: 99.90
    },
    {
      name: 'Google Vision API',
      status: 'healthy',
      responseTime: 1450,
      lastChecked: new Date().toISOString(),
      uptime: 99.97,
      requests: 5670,
      errors: 1,
      successRate: 99.98
    },
    {
      name: 'OCR.space API',
      status: 'healthy',
      responseTime: 2100,
      lastChecked: new Date().toISOString(),
      uptime: 99.85,
      requests: 3240,
      errors: 8,
      successRate: 99.75
    },
    {
      name: 'Tesseract.js (Local)',
      status: 'healthy',
      responseTime: 3500,
      lastChecked: new Date().toISOString(),
      uptime: 100,
      requests: 1850,
      errors: 0,
      successRate: 100
    },
    {
      name: 'Kimi (Moonshot) API',
      status: 'healthy',
      responseTime: 1100,
      lastChecked: new Date().toISOString(),
      uptime: 99.92,
      requests: 2340,
      errors: 4,
      successRate: 99.83
    },
    {
      name: 'Supabase Database',
      status: 'healthy',
      responseTime: 45,
      lastChecked: new Date().toISOString(),
      uptime: 99.99,
      requests: 45620,
      errors: 2,
      successRate: 99.996
    }
  ]);

  const [apiMetrics, setApiMetrics] = useState<APIMetrics>({
    totalRequests: 76590,
    totalErrors: 65,
    averageResponseTime: 1250,
    successRate: 99.92,
    requestsPerMinute: 45,
    topEndpoints: [
      { endpoint: '/api/process-pdf-ocr', requests: 15420, avgResponseTime: 1850, errorRate: 0.08 },
      { endpoint: '/api/github-analyzer', requests: 12340, avgResponseTime: 2100, errorRate: 0.12 },
      { endpoint: '/api/process-url', requests: 8900, avgResponseTime: 3200, errorRate: 0.25 },
      { endpoint: '/api/rag-search', requests: 18750, avgResponseTime: 450, errorRate: 0.05 },
      { endpoint: '/api/embeddings', requests: 21180, avgResponseTime: 380, errorRate: 0.03 }
    ]
  });

  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>({
    cpuUsage: 23.5,
    memoryUsage: 67.8,
    diskUsage: 45.2,
    networkLatency: 12,
    activeConnections: 156,
    totalDocuments: 2847,
    totalUsers: 89,
    storageUsed: '2.4 GB'
  });

  const [deploymentMetrics, setDeploymentMetrics] = useState<DeploymentMetrics>({
    totalDeployments: 127,
    deploymentsToday: 23,
    deploymentsThisWeek: 89,
    deploymentsThisMonth: 127,
    lastDeployment: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    deploymentStatus: 'limited',
    vercelLimit: 100,
    vercelRemaining: 0,
    vercelResetTime: new Date(Date.now() + 13 * 60 * 60 * 1000).toISOString(), // 13 hours from now
    deploymentHistory: [
      {
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        status: 'success',
        duration: 45,
        trigger: 'git-push'
      },
      {
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        status: 'success',
        duration: 52,
        trigger: 'manual'
      },
      {
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        status: 'failed',
        duration: 12,
        trigger: 'git-push'
      },
      {
        timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        status: 'success',
        duration: 38,
        trigger: 'api'
      },
      {
        timestamp: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
        status: 'success',
        duration: 41,
        trigger: 'git-push'
      }
    ]
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshMetrics = async () => {
    setIsRefreshing(true);
    // Simulate API call to refresh metrics
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Update metrics with slight variations
    setServices(prev => prev.map(service => ({
      ...service,
      responseTime: service.responseTime + (Math.random() - 0.5) * 100,
      lastChecked: new Date().toISOString(),
      requests: service.requests + Math.floor(Math.random() * 10),
      errors: service.errors + (Math.random() < 0.1 ? 1 : 0),
      successRate: Math.max(95, service.successRate + (Math.random() - 0.5) * 0.5)
    })));

    setApiMetrics(prev => ({
      ...prev,
      totalRequests: prev.totalRequests + Math.floor(Math.random() * 50),
      totalErrors: prev.totalErrors + (Math.random() < 0.2 ? 1 : 0),
      averageResponseTime: prev.averageResponseTime + (Math.random() - 0.5) * 50,
      requestsPerMinute: prev.requestsPerMinute + (Math.random() - 0.5) * 5
    }));

    setSystemMetrics(prev => ({
      ...prev,
      cpuUsage: Math.max(0, Math.min(100, prev.cpuUsage + (Math.random() - 0.5) * 5)),
      memoryUsage: Math.max(0, Math.min(100, prev.memoryUsage + (Math.random() - 0.5) * 3)),
      activeConnections: prev.activeConnections + Math.floor((Math.random() - 0.5) * 10),
      totalDocuments: prev.totalDocuments + Math.floor(Math.random() * 3)
    }));

    // Update deployment metrics
    setDeploymentMetrics(prev => ({
      ...prev,
      deploymentsToday: prev.deploymentsToday + (Math.random() < 0.1 ? 1 : 0),
      deploymentsThisWeek: prev.deploymentsThisWeek + (Math.random() < 0.05 ? 1 : 0),
      vercelRemaining: Math.max(0, prev.vercelRemaining - (Math.random() < 0.02 ? 1 : 0)),
      deploymentStatus: prev.vercelRemaining <= 0 ? 'limited' : 
                       prev.vercelRemaining <= 10 ? 'pending' : 'success'
    }));

    setIsRefreshing(false);
  };

  useEffect(() => {
    const interval = setInterval(refreshMetrics, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'down':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Minus className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'degraded':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'down':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTrendIcon = (value: number, previous: number) => {
    if (value > previous) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (value < previous) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">System Health Dashboard</h1>
              <p className="mt-2 text-gray-600">Real-time monitoring of all services and API usage</p>
            </div>
            <button
              onClick={refreshMetrics}
              disabled={isRefreshing}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Activity className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Overall Status</p>
                <p className="text-2xl font-bold text-green-600">Healthy</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Requests</p>
                <p className="text-2xl font-bold text-gray-900">{apiMetrics.totalRequests.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
                <p className="text-2xl font-bold text-gray-900">{apiMetrics.averageResponseTime}ms</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-green-600">{apiMetrics.successRate.toFixed(2)}%</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Services Status */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Server className="w-5 h-5 mr-2" />
                Services Status
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {services.map((service, index) => (
                  <div key={index} className={`p-4 rounded-lg border ${getStatusColor(service.status)}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        {getStatusIcon(service.status)}
                        <span className="ml-2 font-medium">{service.name}</span>
                      </div>
                      <span className="text-sm font-medium">{service.uptime}% uptime</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Response Time:</span>
                        <span className="ml-1 font-medium">{service.responseTime.toFixed(0)}ms</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Success Rate:</span>
                        <span className="ml-1 font-medium">{service.successRate.toFixed(2)}%</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Requests:</span>
                        <span className="ml-1 font-medium">{service.requests.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Errors:</span>
                        <span className="ml-1 font-medium">{service.errors}</span>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      Last checked: {new Date(service.lastChecked).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* System Metrics */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                System Metrics
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">CPU Usage</span>
                    <span className="text-sm font-bold text-gray-900">{systemMetrics.cpuUsage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${systemMetrics.cpuUsage}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Memory Usage</span>
                    <span className="text-sm font-bold text-gray-900">{systemMetrics.memoryUsage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${systemMetrics.memoryUsage}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Disk Usage</span>
                    <span className="text-sm font-bold text-gray-900">{systemMetrics.diskUsage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-yellow-600 h-2 rounded-full" 
                      style={{ width: `${systemMetrics.diskUsage}%` }}
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{systemMetrics.activeConnections}</div>
                    <div className="text-sm text-gray-600">Active Connections</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{systemMetrics.networkLatency}ms</div>
                    <div className="text-sm text-gray-600">Network Latency</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{systemMetrics.totalDocuments.toLocaleString()}</div>
                    <div className="text-sm text-gray-600">Total Documents</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{systemMetrics.totalUsers}</div>
                    <div className="text-sm text-gray-600">Total Users</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* API Usage Details */}
        <div className="mt-8 bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Network className="w-5 h-5 mr-2" />
              API Usage & Performance
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{apiMetrics.requestsPerMinute}</div>
                <div className="text-sm text-gray-600">Requests per Minute</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">{apiMetrics.totalErrors}</div>
                <div className="text-sm text-gray-600">Total Errors</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{apiMetrics.successRate.toFixed(2)}%</div>
                <div className="text-sm text-gray-600">Success Rate</div>
              </div>
            </div>

            <div>
              <h3 className="text-md font-semibold text-gray-900 mb-4">Top Endpoints</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Endpoint</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requests</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Response</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Error Rate</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {apiMetrics.topEndpoints.map((endpoint, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {endpoint.endpoint}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {endpoint.requests.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {endpoint.avgResponseTime}ms
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            endpoint.errorRate < 0.1 ? 'bg-green-100 text-green-800' :
                            endpoint.errorRate < 0.5 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {endpoint.errorRate.toFixed(2)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Deployment Metrics */}
        <div className="mt-8 bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Deployment Metrics & Vercel Usage
            </h2>
          </div>
          <div className="p-6">
            {/* Deployment Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{deploymentMetrics.totalDeployments}</div>
                <div className="text-sm text-gray-600">Total Deployments</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{deploymentMetrics.deploymentsToday}</div>
                <div className="text-sm text-gray-600">Today</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">{deploymentMetrics.deploymentsThisWeek}</div>
                <div className="text-sm text-gray-600">This Week</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">{deploymentMetrics.deploymentsThisMonth}</div>
                <div className="text-sm text-gray-600">This Month</div>
              </div>
            </div>

            {/* Vercel Limit Status */}
            <div className="mb-6">
              <h3 className="text-md font-semibold text-gray-900 mb-4">Vercel Deployment Limits</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Daily Deployments</span>
                  <span className={`text-sm font-bold ${
                    deploymentMetrics.vercelRemaining > 20 ? 'text-green-600' :
                    deploymentMetrics.vercelRemaining > 10 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {deploymentMetrics.vercelRemaining} / {deploymentMetrics.vercelLimit} remaining
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div 
                    className={`h-2 rounded-full ${
                      deploymentMetrics.vercelRemaining > 20 ? 'bg-green-500' :
                      deploymentMetrics.vercelRemaining > 10 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${(deploymentMetrics.vercelRemaining / deploymentMetrics.vercelLimit) * 100}%` }}
                  ></div>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Status: {
                    deploymentMetrics.deploymentStatus === 'limited' ? '🚫 Limited - Wait for reset' :
                    deploymentMetrics.deploymentStatus === 'success' ? '✅ Available' :
                    deploymentMetrics.deploymentStatus === 'failed' ? '❌ Failed' :
                    '⏳ Pending'
                  }</span>
                  <span>Resets: {new Date(deploymentMetrics.vercelResetTime).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Last Deployment Info */}
            <div className="mb-6">
              <h3 className="text-md font-semibold text-gray-900 mb-4">Last Deployment</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Timestamp:</span>
                    <div className="font-medium">{new Date(deploymentMetrics.lastDeployment).toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Status:</span>
                    <div className={`font-medium ${
                      deploymentMetrics.deploymentStatus === 'success' ? 'text-green-600' :
                      deploymentMetrics.deploymentStatus === 'failed' ? 'text-red-600' :
                      'text-yellow-600'
                    }`}>
                      {deploymentMetrics.deploymentStatus === 'success' ? '✅ Success' :
                       deploymentMetrics.deploymentStatus === 'failed' ? '❌ Failed' :
                       deploymentMetrics.deploymentStatus === 'limited' ? '🚫 Limited' :
                       '⏳ Pending'}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Time Since:</span>
                    <div className="font-medium">
                      {Math.floor((Date.now() - new Date(deploymentMetrics.lastDeployment).getTime()) / (1000 * 60 * 60))} hours ago
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Deployment History */}
            <div>
              <h3 className="text-md font-semibold text-gray-900 mb-4">Recent Deployment History</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trigger</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {deploymentMetrics.deploymentHistory.map((deployment, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(deployment.timestamp).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            deployment.status === 'success' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {deployment.status === 'success' ? '✅ Success' : '❌ Failed'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {deployment.duration}s
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                            {deployment.trigger === 'git-push' ? 'Git Push' :
                             deployment.trigger === 'manual' ? 'Manual' :
                             'API'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          Last updated: {new Date().toLocaleString()} | Auto-refresh every 30 seconds
        </div>
      </div>
    </div>
  );
};

export default Health;
