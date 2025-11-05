import React, { useState, useEffect } from 'react';
import { 
  Archive, 
  Github, 
  Calendar, 
  Star, 
  GitFork, 
  Eye,
  ExternalLink,
  Search,
  Filter,
  Download,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { supabaseUrl, supabaseAnonKey } from '../lib/supabase';

interface RepositoryAnalysis {
  id: string;
  repository_url: string;
  repository_name: string;
  analysis_data: {
    metadata: {
      stars?: number;
      forks?: number;
      watchers?: number;
      openIssues?: number;
      size?: number;
      language?: string;
      license?: string;
      topics?: string[];
    };
    summary: {
      tldr: string;
      technicalSummary: string;
      businessSummary: string;
      executiveSummary: string;
    };
    technicalAnalysis: {
      techStack: string[];
      architecture: string;
      codeQuality: string;
      testing: string;
      security: string;
      documentation: string;
    };
    useCases: {
      primary: string[];
      secondary: string[];
      integrations: string[];
      industries: string[];
      targetAudience: string[];
      businessModels?: string[];
      marketOpportunities?: string[];
      competitiveAdvantages?: string[];
      scalingPotential?: string;
      monetizationStrategies?: string[];
      partnershipOpportunities?: string[];
      investmentPotential?: string;
      exitStrategies?: string[];
    };
    recommendations: {
      strengths: string[];
      improvements: string[];
      risks: string[];
      adoptionPotential: string;
    };
  };
  created_at: string;
}

const RepositoryArchive: React.FC = () => {
  const [analyses, setAnalyses] = useState<RepositoryAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLanguage, setFilterLanguage] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'stars' | 'name'>('date');
  const [selectedAnalysis, setSelectedAnalysis] = useState<RepositoryAnalysis | null>(null);

  // Fetch repository analyses from API with demo data fallback
  useEffect(() => {
    const fetchAnalyses = async () => {
      try {
        setLoading(true);
        
        // SECURITY: Use environment variables instead of hardcoded keys
        if (!supabaseUrl || !supabaseAnonKey) {
          console.error('Security: Missing Supabase configuration');
          setLoading(false);
          return;
        }
        
        const response = await fetch(`${supabaseUrl}/functions/v1/get-repository-archive`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'apikey': supabaseAnonKey
          }
        });

        if (response.ok) {
          const result = await response.json();
          if (result.data && result.data.length > 0) {
            setAnalyses(result.data);
          } else {
            // Use demo data if no real data is available
            setAnalyses(getDemoData());
          }
        } else {
          console.error('Failed to fetch analyses:', response.statusText);
          // Use demo data as fallback
          setAnalyses(getDemoData());
        }
      } catch (error) {
        console.error('Error fetching analyses:', error);
        // Use demo data as fallback
        setAnalyses(getDemoData());
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyses();
  }, []);

  // Demo data for showcasing the archive functionality
  const getDemoData = (): RepositoryAnalysis[] => [
    {
      id: '1',
      repository_url: 'https://github.com/amaiya/onprem',
      repository_name: 'amaiya/onprem',
      analysis_data: {
        metadata: {
          stars: 8500,
          forks: 450,
          watchers: 1200,
          openIssues: 23,
          size: 125000,
          language: 'Python',
          license: 'Apache-2.0',
          topics: ['ai', 'on-premise', 'llm', 'deployment']
        },
        summary: {
          tldr: 'OnPrem is a powerful open-source platform for deploying and managing LLMs on-premises with enterprise-grade security and scalability.',
          technicalSummary: 'Modern Python-based architecture with Docker containerization, RESTful APIs, and comprehensive monitoring.',
          businessSummary: 'High commercial potential targeting enterprise customers needing secure, private AI deployments.',
          executiveSummary: 'Strong investment opportunity with clear market demand for private AI infrastructure.'
        },
        technicalAnalysis: {
          techStack: ['Python', 'Docker', 'FastAPI', 'PostgreSQL', 'Redis'],
          architecture: 'Microservices-based with container orchestration',
          codeQuality: 'High - well-structured, documented, and tested',
          testing: 'Comprehensive test coverage with CI/CD pipeline',
          security: 'Enterprise-grade with encryption and access controls',
          documentation: 'Excellent documentation and examples'
        },
        useCases: {
          primary: ['Enterprise AI Deployment', 'Private LLM Hosting', 'Secure AI Infrastructure'],
          secondary: ['Research Platforms', 'Government AI Systems', 'Healthcare AI'],
          integrations: ['Kubernetes', 'AWS/GCP/Azure', 'Enterprise SSO'],
          industries: ['Enterprise Software', 'Government', 'Healthcare', 'Finance'],
          targetAudience: ['Enterprise IT Teams', 'AI Researchers', 'Security-Conscious Organizations'],
          businessModels: ['Open Source with Enterprise Support', 'SaaS Platform', 'Consulting Services'],
          marketOpportunities: ['Growing demand for private AI', 'Enterprise security requirements', 'Regulatory compliance needs'],
          competitiveAdvantages: ['Open source transparency', 'Enterprise features', 'Active community'],
          scalingPotential: 'High - cloud-native architecture supports massive scale',
          monetizationStrategies: ['Enterprise licensing', 'Professional support', 'Managed services'],
          partnershipOpportunities: ['Cloud providers', 'Enterprise software vendors', 'Security companies'],
          investmentPotential: 'Strong - clear market demand and scalable technology',
          exitStrategies: ['Strategic acquisition by major cloud provider', 'IPO after enterprise market penetration']
        },
        recommendations: {
          strengths: ['Strong technical foundation', 'Clear market need', 'Active development'],
          improvements: ['Enhanced UI/UX', 'More integrations', 'Better documentation'],
          risks: ['Competition from cloud providers', 'Market saturation', 'Technology changes'],
          adoptionPotential: 'High - addresses real enterprise needs'
        }
      },
      created_at: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: '2',
      repository_url: 'https://github.com/microsoft/vscode',
      repository_name: 'microsoft/vscode',
      analysis_data: {
        metadata: {
          stars: 150000,
          forks: 26000,
          watchers: 8500,
          openIssues: 8500,
          size: 2500000,
          language: 'TypeScript',
          license: 'MIT',
          topics: ['editor', 'typescript', 'electron', 'development']
        },
        summary: {
          tldr: 'Visual Studio Code is a lightweight, powerful source code editor with extensive extension ecosystem and cross-platform support.',
          technicalSummary: 'Electron-based desktop application with TypeScript/JavaScript core, plugin architecture, and comprehensive API.',
          businessSummary: 'Dominant position in developer tools market with strong monetization through extensions and enterprise features.',
          executiveSummary: 'Market leader with sustainable competitive advantage and strong revenue potential.'
        },
        technicalAnalysis: {
          techStack: ['TypeScript', 'Electron', 'Node.js', 'CSS', 'HTML'],
          architecture: 'Modular architecture with extension system',
          codeQuality: 'Excellent - Microsoft-grade development practices',
          testing: 'Comprehensive automated testing',
          security: 'Regular security updates and vulnerability management',
          documentation: 'Extensive documentation and community resources'
        },
        useCases: {
          primary: ['Code Development', 'Web Development', 'Scripting', 'Documentation'],
          secondary: ['Data Analysis', 'DevOps', 'Learning', 'Prototyping'],
          integrations: ['Git', 'Docker', 'Azure', 'GitHub', 'Extensions'],
          industries: ['Software Development', 'Web Development', 'Education', 'Enterprise'],
          targetAudience: ['Developers', 'Students', 'IT Professionals', 'Designers'],
          businessModels: ['Open-source with paid extensions', 'Support and services', 'Enterprise licensing'],
          marketOpportunities: ['Growing developer population', 'Remote work trends', 'AI-assisted development'],
          competitiveAdvantages: ['Market leadership', 'Extensive ecosystem', 'Cross-platform support'],
          scalingPotential: 'Massive - already serving millions of developers globally',
          monetizationStrategies: ['Extension marketplace', 'Enterprise features', 'Cloud services'],
          partnershipOpportunities: ['Extension developers', 'Cloud providers', 'Enterprise customers'],
          investmentPotential: 'Exceptional - market leader with strong moats',
          exitStrategies: ['Already owned by Microsoft - strategic asset']
        },
        recommendations: {
          strengths: ['Market leadership', 'Strong ecosystem', 'Microsoft backing'],
          improvements: ['Performance optimization', 'AI integration', 'Mobile support'],
          risks: ['Competition from web-based editors', 'Platform dependencies', 'Market saturation'],
          adoptionPotential: 'Universal - industry standard tool'
        }
      },
      created_at: new Date(Date.now() - 172800000).toISOString()
    },
    {
      id: '3',
      repository_url: 'https://github.com/openai/openai-python',
      repository_name: 'openai/openai-python',
      analysis_data: {
        metadata: {
          stars: 25000,
          forks: 4200,
          watchers: 1800,
          openIssues: 150,
          size: 85000,
          language: 'Python',
          license: 'MIT',
          topics: ['openai', 'python', 'ai', 'api', 'machine-learning']
        },
        summary: {
          tldr: 'Official Python library for OpenAI API, providing easy access to GPT models, embeddings, and other AI services.',
          technicalSummary: 'Well-maintained Python SDK with comprehensive API coverage, async support, and type hints.',
          businessSummary: 'Critical infrastructure for AI application development with strong adoption in the developer community.',
          executiveSummary: 'Essential tool for AI development with significant market influence and revenue potential.'
        },
        technicalAnalysis: {
          techStack: ['Python', 'httpx', 'pydantic', 'typing', 'asyncio'],
          architecture: 'Clean SDK architecture with modular design',
          codeQuality: 'Excellent - professional Python development practices',
          testing: 'Comprehensive test suite with high coverage',
          security: 'Secure API handling with proper authentication',
          documentation: 'Extensive documentation and examples'
        },
        useCases: {
          primary: ['AI Application Development', 'Chatbot Development', 'Content Generation'],
          secondary: ['Research Projects', 'Educational Tools', 'Prototyping'],
          integrations: ['FastAPI', 'Django', 'Flask', 'Streamlit', 'Jupyter'],
          industries: ['AI/ML', 'Education', 'Healthcare', 'Finance', 'Entertainment'],
          targetAudience: ['AI Developers', 'Data Scientists', 'Researchers', 'Students'],
          businessModels: ['Open source with premium API access', 'Developer ecosystem support', 'Enterprise partnerships'],
          marketOpportunities: ['AI development boom', 'Enterprise AI adoption', 'Educational AI tools'],
          competitiveAdvantages: ['Official OpenAI support', 'Comprehensive API coverage', 'Active community'],
          scalingPotential: 'Very high - supports millions of developers',
          monetizationStrategies: ['API usage fees', 'Enterprise support', 'Premium features'],
          partnershipOpportunities: ['Framework integrations', 'Cloud providers', 'Enterprise software'],
          investmentPotential: 'Exceptional - core infrastructure for AI revolution',
          exitStrategies: ['Strategic acquisition unlikely (already owned by OpenAI)', 'Continued growth and expansion']
        },
        recommendations: {
          strengths: ['Official support', 'Comprehensive features', 'Active development'],
          improvements: ['Better error handling', 'More examples', 'Performance optimization'],
          risks: ['API dependency', 'Competition from alternatives', 'Rate limiting'],
          adoptionPotential: 'Very high - essential for OpenAI development'
        }
      },
      created_at: new Date(Date.now() - 259200000).toISOString()
    }
  ];

  const filteredAnalyses = analyses.filter(analysis => {
    const matchesSearch = analysis.repository_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         analysis.analysis_data.metadata.language?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         analysis.analysis_data.summary.tldr.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLanguage = !filterLanguage || analysis.analysis_data.metadata.language === filterLanguage;
    
    return matchesSearch && matchesLanguage;
  });

  const sortedAnalyses = [...filteredAnalyses].sort((a, b) => {
    switch (sortBy) {
      case 'stars':
        return (b.analysis_data.metadata.stars || 0) - (a.analysis_data.metadata.stars || 0);
      case 'name':
        return a.repository_name.localeCompare(b.repository_name);
      case 'date':
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  const languages = Array.from(new Set(analyses.map(a => a.analysis_data.metadata.language).filter(Boolean)));

  const exportAnalysis = (analysis: RepositoryAnalysis) => {
    const dataStr = JSON.stringify(analysis, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${analysis.repository_name.replace('/', '-')}-analysis.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Loading repository archive...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Archive className="w-8 h-8 text-purple-600" />
          <h1 className="text-3xl font-bold text-gray-900">Repository Archive</h1>
        </div>
        <p className="text-gray-600">
          Browse and analyze previously analyzed GitHub repositories with comprehensive business insights.
        </p>
        
        {/* Demo Notice */}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-blue-900">Demo Mode</span>
          </div>
          <p className="text-sm text-blue-800 mt-1">
            Currently showing sample repository analyses. Real analyses will appear here once the database is fully configured.
          </p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search repositories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          
          <div>
            <select
              value={filterLanguage}
              onChange={(e) => setFilterLanguage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All Languages</option>
              {languages.map(lang => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="date">Sort by Date</option>
              <option value="stars">Sort by Stars</option>
              <option value="name">Sort by Name</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Filter className="w-4 h-4" />
            <span>{sortedAnalyses.length} repositories</span>
          </div>
        </div>
      </div>

      {/* Repository Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {sortedAnalyses.map((analysis) => (
          <div
            key={analysis.id}
            className="bg-white rounded-lg border border-gray-200 hover:border-purple-300 transition-colors cursor-pointer"
            onClick={() => setSelectedAnalysis(analysis)}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Github className="w-6 h-6 text-gray-600" />
                  <div>
                    <h3 className="font-semibold text-gray-900 truncate">
                      {analysis.repository_name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {formatDate(analysis.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      exportAnalysis(analysis);
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600"
                    title="Export Analysis"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span>{analysis.analysis_data.metadata.stars?.toLocaleString() || '0'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <GitFork className="w-4 h-4 text-blue-500" />
                  <span>{analysis.analysis_data.metadata.forks?.toLocaleString() || '0'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Eye className="w-4 h-4 text-green-500" />
                  <span>{analysis.analysis_data.metadata.watchers?.toLocaleString() || '0'}</span>
                </div>
                <div className="text-sm text-gray-600">
                  {analysis.analysis_data.metadata.language || 'Unknown'}
                </div>
              </div>

              {/* Summary */}
              <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                {analysis.analysis_data.summary.tldr}
              </p>

              {/* Business Models */}
              <div className="mb-4">
                <h4 className="text-xs font-medium text-gray-700 mb-2">Business Models</h4>
                <div className="flex flex-wrap gap-1">
                  {analysis.analysis_data.useCases.businessModels?.slice(0, 2).map((model, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full"
                    >
                      {model}
                    </span>
                  )) || (
                    <span className="text-xs text-gray-500">No business models analyzed</span>
                  )}
                </div>
              </div>

              {/* Investment Potential */}
              <div className="mb-4">
                <h4 className="text-xs font-medium text-gray-700 mb-1">Investment Potential</h4>
                <p className="text-xs text-gray-600 line-clamp-2">
                  {analysis.analysis_data.useCases.investmentPotential || 'Not analyzed'}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-gray-100">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(analysis.repository_url, '_blank');
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Repo
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedAnalysis(analysis);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg transition-colors"
                >
                  View Analysis
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {sortedAnalyses.length === 0 && (
        <div className="text-center py-12">
          <Archive className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No repositories found</h3>
          <p className="text-gray-600">
            {searchTerm || filterLanguage 
              ? 'Try adjusting your search criteria' 
              : 'No repositories have been analyzed yet'
            }
          </p>
        </div>
      )}

      {/* Analysis Detail Modal */}
      {selectedAnalysis && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Github className="w-6 h-6 text-gray-600" />
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {selectedAnalysis.repository_name}
                    </h2>
                    <p className="text-sm text-gray-500">
                      Analyzed on {formatDate(selectedAnalysis.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => exportAnalysis(selectedAnalysis)}
                    className="p-2 text-gray-400 hover:text-gray-600"
                    title="Export Analysis"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setSelectedAnalysis(null)}
                    className="p-2 text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Summary */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">TL;DR</h4>
                    <p className="text-sm text-blue-800">{selectedAnalysis.analysis_data.summary.tldr}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-medium text-green-900 mb-2">Business Summary</h4>
                    <p className="text-sm text-green-800">{selectedAnalysis.analysis_data.summary.businessSummary}</p>
                  </div>
                </div>
              </div>

              {/* Business Analysis */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Business Analysis</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h4 className="font-medium text-purple-900 mb-2">Investment Potential</h4>
                    <p className="text-sm text-purple-800">
                      {selectedAnalysis.analysis_data.useCases.investmentPotential}
                    </p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <h4 className="font-medium text-orange-900 mb-2">Scaling Potential</h4>
                    <p className="text-sm text-orange-800">
                      {selectedAnalysis.analysis_data.useCases.scalingPotential}
                    </p>
                  </div>
                </div>
              </div>

              {/* Business Models */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Business Models</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedAnalysis.analysis_data.useCases.businessModels?.map((model, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full"
                    >
                      {model}
                    </span>
                  )) || (
                    <span className="text-gray-500">No business models analyzed</span>
                  )}
                </div>
              </div>

              {/* Market Opportunities */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Market Opportunities</h3>
                <ul className="space-y-2">
                  {selectedAnalysis.analysis_data.useCases.marketOpportunities?.map((opportunity, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></span>
                      {opportunity}
                    </li>
                  )) || (
                    <span className="text-gray-500">No market opportunities analyzed</span>
                  )}
                </ul>
              </div>

              {/* Technical Analysis */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Technical Analysis</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Tech Stack</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedAnalysis.analysis_data.technicalAnalysis.techStack.map((tech, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Architecture</h4>
                    <p className="text-sm text-gray-600">
                      {selectedAnalysis.analysis_data.technicalAnalysis.architecture}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RepositoryArchive;
