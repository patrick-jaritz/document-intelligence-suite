import React, { useState } from 'react';
import { Github, Search, Loader2, AlertCircle, CheckCircle, ExternalLink, Star, GitFork, Users, Calendar, Shield, Code, BookOpen, Zap, TrendingUp, DollarSign, Handshake, Target, Lightbulb, Building2, Archive, Trash2 } from 'lucide-react';
import { supabaseUrl } from '../lib/supabase';

interface GitHubAnalysis {
  metadata: {
    name: string;
    fullName: string;
    description: string;
    language: string;
    stars?: number;
    forks?: number;
    watchers?: number;
    openIssues?: number;
    license: string;
    topics: string[];
    createdAt: string;
    updatedAt: string;
    size?: number;
    defaultBranch: string;
  };
  technicalAnalysis: {
    techStack: string[];
    architecture: string;
    codeQuality: string;
    documentation: string;
    testing: string;
    security: string;
    performance: string;
  };
  useCases: {
    primary: string[];
    secondary: string[];
    integrations: string[];
    industries: string[];
    targetAudience: string[];
    businessModels: string[];
    marketOpportunities: string[];
    competitiveAdvantages: string[];
    scalingPotential: string;
    monetizationStrategies: string[];
    partnershipOpportunities: string[];
    investmentPotential: string;
    exitStrategies: string[];
  };
  recommendations: {
    strengths: string[];
    improvements: string[];
    risks: string[];
    adoptionPotential: string;
  };
  summary: {
    executive: string;
    technical: string;
    business: string;
    tlDr: string;
  };
  analysisMetadata: {
    analyzedAt: string;
    analysisVersion: string;
    confidence: number;
    dataCompleteness: number;
  };
}

interface AnalysisResult {
  success: boolean;
  repository: string;
  analysis: GitHubAnalysis;
  metadata: {
    analyzedAt: string;
    dataSources: string[];
    confidence: number;
  };
}

export function GitHubAnalyzer() {
  const [urlInput, setUrlInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [archivedAnalyses, setArchivedAnalyses] = useState<any[]>([]);
  const [showArchive, setShowArchive] = useState(false);
  const [loadingArchive, setLoadingArchive] = useState(false);

  const isGitHubUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname === 'github.com' && urlObj.pathname.split('/').length >= 3;
    } catch {
      return false;
    }
  };

  const fetchArchivedAnalyses = async () => {
    try {
      setLoadingArchive(true);
      const response = await fetch(`${supabaseUrl}/functions/v1/get-repository-archive`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.data && result.data.length > 0) {
          setArchivedAnalyses(result.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch archive:', error);
    } finally {
      setLoadingArchive(false);
    }
  };

  const saveAnalysisToArchive = async (result: AnalysisResult) => {
    const response = await fetch(`${supabaseUrl}/functions/v1/init-github-archive`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        repository_url: result.repository,
        repository_name: result.repository.split('/').pop(),
        analysis_data: result.analysis,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to save to archive');
    }

    // Refresh archive list after saving
    const saveResult = await response.json();
    if (saveResult.success) {
      // Add the newly saved analysis to the archive list immediately
      const newAnalysis = {
        id: saveResult.id || Date.now().toString(),
        repository_url: result.repository,
        repository_name: result.repository.split('/').pop(),
        analysis_data: result.analysis,
        created_at: new Date().toISOString(),
      };
      setArchivedAnalyses(prev => [newAnalysis, ...prev]);
    }
  };

  const handleDeleteArchive = async (analysisId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the archive click
    
    if (!confirm('Are you sure you want to remove this analysis from the archive?')) {
      return;
    }

    try {
      // Call delete function or remove from Supabase
      // For now, just remove from local state
      setArchivedAnalyses(prev => prev.filter(a => a.id !== analysisId));
      console.log('Archive item deleted');
    } catch (error) {
      console.error('Failed to delete archive item:', error);
      alert('Failed to delete archive item');
    }
  };

  const handleArchiveClick = (archivedAnalysis: any) => {
    // Convert archived analysis to AnalysisResult format
    setAnalysisResult({
      success: true,
      repository: archivedAnalysis.repository_url,
      analysis: archivedAnalysis.analysis_data,
      metadata: {
        analyzedAt: archivedAnalysis.created_at,
        dataSources: ['archive'],
        confidence: 1,
      },
    });
    setShowArchive(false);
  };

  // Fetch archive on mount
  React.useEffect(() => {
    fetchArchivedAnalyses();
  }, []);

  const handleAnalyze = async () => {
    if (!urlInput.trim()) return;
    
    if (!isGitHubUrl(urlInput)) {
      setError('Please enter a valid GitHub repository URL');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);

    try {
      console.log('🔍 Analyzing GitHub repository:', urlInput);
      
      // Create an AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout
      
      const response = await fetch(`${supabaseUrl}/functions/v1/github-analyzer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          url: urlInput
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error:', response.status, response.statusText, errorText);
        throw new Error(`Analysis failed: ${response.statusText} (${response.status})`);
      }

      const result = await response.json();
      
      if (result.success) {
        setAnalysisResult(result);
        console.log('✅ Analysis completed successfully');
        
        // Auto-save to archive
        try {
          await saveAnalysisToArchive(result);
          console.log('✅ Analysis saved to archive');
        } catch (saveError) {
          console.error('Failed to save to archive:', saveError);
          // Don't block the UI on save failure
        }
      } else {
        throw new Error(result.error || 'Analysis failed');
      }

    } catch (error) {
      console.error('❌ GitHub analysis failed:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        setError('Analysis timed out. Please try again.');
      } else {
        setError(error instanceof Error ? error.message : 'Failed to analyze repository');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatFileSize = (sizeInKB: number): string => {
    if (sizeInKB < 1024) return `${sizeInKB} KB`;
    const sizeInMB = sizeInKB / 1024;
    return `${sizeInMB.toFixed(1)} MB`;
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Github className="w-8 h-8 text-gray-700" />
            <h1 className="text-2xl font-bold text-gray-900">GitHub Repository Analyzer</h1>
          </div>
          <button
            onClick={() => setShowArchive(!showArchive)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
          >
            <Archive className="w-4 h-4" />
            Archive ({archivedAnalyses.length})
          </button>
        </div>

        {showArchive && (
          <div className="mb-6 bg-purple-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Previously Analyzed Repositories</h3>
            {loadingArchive ? (
              <div className="text-center py-4">Loading archive...</div>
            ) : archivedAnalyses.length === 0 ? (
              <div className="text-center py-4 text-gray-500">No archived analyses yet</div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {archivedAnalyses.map((analysis, idx) => (
                  <div
                    key={analysis.id || idx}
                    className="p-3 bg-white rounded-lg hover:bg-purple-100 cursor-pointer flex items-center justify-between group"
                  >
                    <div 
                      onClick={() => handleArchiveClick(analysis)}
                      className="flex-1"
                    >
                      <div className="font-medium text-gray-900">{analysis.repository_name}</div>
                      <div className="text-sm text-gray-500">{analysis.repository_url}</div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteArchive(analysis.id || idx.toString(), e)}
                      className="ml-3 p-2 text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete from archive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mb-6">
          <div className="flex gap-3">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Enter GitHub repository URL (e.g., https://github.com/owner/repo)"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isAnalyzing}
            />
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !urlInput.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Analyze
                </>
              )}
            </button>
          </div>
          
          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
        </div>

        {analysisResult && (
          <div className="space-y-6">
            {/* Repository Overview */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">
                    {analysisResult.analysis.metadata.name}
                  </h2>
                  <p className="text-gray-600 mb-3">
                    {analysisResult.analysis.metadata.description || 'No description available'}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Star className="w-4 h-4" />
                      {analysisResult.analysis.metadata.stars?.toLocaleString() || '0'}
                    </span>
                    <span className="flex items-center gap-1">
                      <GitFork className="w-4 h-4" />
                      {analysisResult.analysis.metadata.forks?.toLocaleString() || '0'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {analysisResult.analysis.metadata.watchers?.toLocaleString() || '0'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Updated {formatDate(analysisResult.analysis.metadata.updatedAt)}
                    </span>
                  </div>
                </div>
                <a
                  href={urlInput}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                >
                  <ExternalLink className="w-4 h-4" />
                  View on GitHub
                </a>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Language:</span>
                  <div className="font-medium">{analysisResult.analysis.metadata.language || 'Unknown'}</div>
                </div>
                <div>
                  <span className="text-gray-500">License:</span>
                  <div className="font-medium">{analysisResult.analysis.metadata.license || 'No license'}</div>
                </div>
                <div>
                  <span className="text-gray-500">Size:</span>
                  <div className="font-medium">{formatFileSize(analysisResult.analysis.metadata.size || 0)}</div>
                </div>
                <div>
                  <span className="text-gray-500">Issues:</span>
                  <div className="font-medium">{analysisResult.analysis.metadata.openIssues || 0}</div>
                </div>
              </div>

              {analysisResult.analysis.metadata.topics.length > 0 && (
                <div className="mt-4">
                  <span className="text-gray-500 text-sm">Topics:</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {analysisResult.analysis.metadata.topics.map((topic, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* TL;DR */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                TL;DR
              </h3>
              <p className="text-yellow-700">{analysisResult.analysis.summary.tlDr}</p>
            </div>

            {/* Technical Analysis */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Code className="w-5 h-5" />
                  Technical Analysis
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Tech Stack</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysisResult.analysis.technicalAnalysis.techStack.map((tech, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Architecture</h4>
                    <p className="text-gray-600 text-sm">{analysisResult.analysis.technicalAnalysis.architecture}</p>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Code Quality</h4>
                    <p className="text-gray-600 text-sm">{analysisResult.analysis.technicalAnalysis.codeQuality}</p>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Testing</h4>
                    <p className="text-gray-600 text-sm">{analysisResult.analysis.technicalAnalysis.testing}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Business & Market Analysis
                </h3>
                
                <div className="space-y-6">
                  {/* Business Models */}
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Business Models
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {analysisResult.analysis.useCases.businessModels?.map((model, index) => (
                        <div key={index} className="p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                          {model}
                        </div>
                      )) || ['SaaS Model', 'Open Source with Enterprise Support']}
                    </div>
                  </div>

                  {/* Market Opportunities */}
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Market Opportunities
                    </h4>
                    <ul className="space-y-1">
                      {analysisResult.analysis.useCases.marketOpportunities?.map((opportunity, index) => (
                        <li key={index} className="text-gray-600 text-sm flex items-start gap-2">
                          <Lightbulb className="w-3 h-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                          {opportunity}
                        </li>
                      )) || ['Enterprise AI Solutions', 'Developer Tools Market']}
                    </ul>
                  </div>

                  {/* Competitive Advantages */}
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Competitive Advantages
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {analysisResult.analysis.useCases.competitiveAdvantages?.map((advantage, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full"
                        >
                          {advantage}
                        </span>
                      )) || ['Open Source', 'Active Community', 'Modern Architecture']}
                    </div>
                  </div>

                  {/* Scaling Potential */}
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Scaling Potential
                    </h4>
                    <p className="text-gray-600 text-sm bg-green-50 p-3 rounded border border-green-200">
                      {analysisResult.analysis.useCases.scalingPotential || 'High scalability potential due to modern architecture and cloud-native design'}
                    </p>
                  </div>

                  {/* Monetization Strategies */}
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Monetization Strategies
                    </h4>
                    <ul className="space-y-1">
                      {analysisResult.analysis.useCases.monetizationStrategies?.map((strategy, index) => (
                        <li key={index} className="text-gray-600 text-sm flex items-start gap-2">
                          <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                          {strategy}
                        </li>
                      )) || ['Freemium Model', 'Enterprise Licensing', 'Consulting Services']}
                    </ul>
                  </div>

                  {/* Investment Potential */}
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Investment Potential
                    </h4>
                    <p className="text-gray-600 text-sm bg-blue-50 p-3 rounded border border-blue-200">
                      {analysisResult.analysis.useCases.investmentPotential || 'Strong investment potential with clear market demand and scalable technology'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Partnership & Strategic Opportunities */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Handshake className="w-5 h-5" />
                  Partnership Opportunities
                </h3>
                <ul className="space-y-2">
                  {analysisResult.analysis.useCases.partnershipOpportunities?.map((partnership, index) => (
                    <li key={index} className="text-gray-600 text-sm flex items-start gap-2">
                      <Handshake className="w-3 h-3 text-blue-500 mt-0.5 flex-shrink-0" />
                      {partnership}
                    </li>
                  )) || [
                    'Cloud Platform Integrations (AWS, GCP, Azure)',
                    'Enterprise Software Partnerships',
                    'Developer Tool Ecosystem Integration'
                  ]}
                </ul>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Exit Strategies
                </h3>
                <ul className="space-y-2">
                  {analysisResult.analysis.useCases.exitStrategies?.map((strategy, index) => (
                    <li key={index} className="text-gray-600 text-sm flex items-start gap-2">
                      <Target className="w-3 h-3 text-purple-500 mt-0.5 flex-shrink-0" />
                      {strategy}
                    </li>
                  )) || [
                    'Strategic Acquisition by Major Tech Company',
                    'IPO after Scaling to Enterprise Market',
                    'Merger with Complementary Technology Company'
                  ]}
                </ul>
              </div>
            </div>

            {/* Traditional Use Cases */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Primary Use Cases
                </h3>
                <ul className="space-y-2">
                  {analysisResult.analysis.useCases.primary.map((useCase, index) => (
                    <li key={index} className="text-gray-600 text-sm flex items-start gap-2">
                      <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                      {useCase}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Target Industries
                </h3>
                <div className="flex flex-wrap gap-2">
                  {analysisResult.analysis.useCases.industries.map((industry, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full"
                    >
                      {industry}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Strengths
                </h3>
                <ul className="space-y-2">
                  {analysisResult.analysis.recommendations.strengths.map((strength, index) => (
                    <li key={index} className="text-gray-600 text-sm flex items-start gap-2">
                      <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                      {strength}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-500" />
                  Areas for Improvement
                </h3>
                <ul className="space-y-2">
                  {analysisResult.analysis.recommendations.improvements.map((improvement, index) => (
                    <li key={index} className="text-gray-600 text-sm flex items-start gap-2">
                      <AlertCircle className="w-3 h-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                      {improvement}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Detailed Summaries */}
            <div className="space-y-4">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Executive Summary</h3>
                <p className="text-gray-600">{analysisResult.analysis.summary.executive}</p>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Technical Summary</h3>
                <p className="text-gray-600">{analysisResult.analysis.summary.technical}</p>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Value</h3>
                <p className="text-gray-600">{analysisResult.analysis.summary.business}</p>
              </div>
            </div>

            {/* Analysis Metadata */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Analyzed on {formatDate(analysisResult.metadata.analyzedAt)}</span>
                <span>Confidence: {(analysisResult.metadata.confidence * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
