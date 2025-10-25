import React, { useState } from 'react';
import { Github, Search, Loader2, AlertCircle, CheckCircle, ExternalLink, Star, GitFork, Users, Calendar, Shield, Code, BookOpen, Zap, TrendingUp, DollarSign, Handshake, Target, Lightbulb, Building2, Archive, Trash2, Download, Heart, GitCompare, TrendingDown, BarChart3 } from 'lucide-react';
import { supabaseUrl } from '../lib/supabase';
import { RepoComparison } from './RepoComparison';

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
  const [archiveSearchTerm, setArchiveSearchTerm] = useState('');
  const [starredRepos, setStarredRepos] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'all' | 'starred'>('all');
  const [filterLanguage, setFilterLanguage] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'stars' | 'name'>('date');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<Set<string>>(new Set());
  const [showComparison, setShowComparison] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedForBulk, setSelectedForBulk] = useState<Set<string>>(new Set());
  const [showDashboard, setShowDashboard] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [searchFilters, setSearchFilters] = useState({
    minStars: '',
    maxStars: '',
    hasLicense: '',
    minTopics: '',
    createdAfter: '',
    createdBefore: '',
  });
  const [similarRepos, setSimilarRepos] = useState<any[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [versionData, setVersionData] = useState<any>(null);
  const [loadingVersion, setLoadingVersion] = useState(false);

  const isGitHubUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(part => part);
      
      // Must be github.com with at least owner/repo
      return urlObj.hostname === 'github.com' && 
             pathParts.length >= 2 && 
             pathParts[0].length > 0 && 
             pathParts[1].length > 0;
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

  const saveAnalysisToArchive = async (result: AnalysisResult, showNotification = false) => {
    console.log('💾 Saving analysis to archive...', result.repository);
    
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/save-github-analysis`, {
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
        const errorText = await response.text();
        console.error('❌ Failed to save to archive:', errorText);
        throw new Error(`Failed to save: ${errorText}`);
      }

      // Refresh archive list after saving
      const saveResult = await response.json();
      console.log('✅ Save result:', saveResult);
      
      if (saveResult.success) {
        // Update or add the analysis to the archive list
        const newAnalysis = {
          id: saveResult.id || Date.now().toString(),
          repository_url: result.repository,
          repository_name: result.repository.split('/').pop(),
          analysis_data: result.analysis,
          created_at: new Date().toISOString(),
        };
        
        // Check if it already exists (update scenario)
        const isUpdate = archivedAnalyses.some(
          a => a.repository_url.toLowerCase() === result.repository.toLowerCase()
        );
        
        setArchivedAnalyses(prev => {
          // Remove old entry if updating
          const filtered = prev.filter(
            a => a.repository_url.toLowerCase() !== result.repository.toLowerCase()
          );
          // Add new entry at the beginning
          return [newAnalysis, ...filtered];
        });
        
        console.log(`✅ Analysis ${isUpdate ? 'updated in' : 'added to'} archive list`);
        
        if (showNotification) {
          alert(`✅ Analysis ${isUpdate ? 'updated in' : 'saved to'} archive!`);
        }
        return true;
      } else {
        throw new Error('Save unsuccessful');
      }
    } catch (error) {
      console.error('❌ Save error:', error);
      if (showNotification) {
        alert(`Failed to save to archive: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      throw error;
    }
  };

  const handleDeleteArchive = async (analysis: any, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the archive click
    
    if (!confirm('Are you sure you want to remove this analysis from the archive?')) {
      return;
    }

    try {
      console.log('🗑️ Deleting analysis:', analysis.repository_url);
      
      // Call the delete Edge Function
      const response = await fetch(`${supabaseUrl}/functions/v1/delete-github-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          repository_url: analysis.repository_url,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete');
      }

      // Remove from local state
      setArchivedAnalyses(prev => prev.filter(a => a.id !== analysis.id));
      console.log('✅ Archive item deleted successfully');
    } catch (error) {
      console.error('Failed to delete archive item:', error);
      alert(`Failed to delete archive item: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleArchiveClick = async (archivedAnalysis: any) => {
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
    
    // Fetch similar repositories
    await fetchSimilarRepos(archivedAnalysis.repository_url);
    
    // Check for version updates
    await checkRepositoryVersion(archivedAnalysis.repository_url);
  };

  const fetchSimilarRepos = async (repoUrl: string) => {
    try {
      setLoadingSimilar(true);
      const response = await fetch(`${supabaseUrl}/functions/v1/find-similar-repos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repository_url: repoUrl, limit: 5 }),
      });

      if (response.ok) {
        const result = await response.json();
        setSimilarRepos(result.similar_repositories || []);
      }
    } catch (err) {
      console.error('Failed to fetch similar repos:', err);
      setSimilarRepos([]);
    } finally {
      setLoadingSimilar(false);
    }
  };

  const checkRepositoryVersion = async (repoUrl: string) => {
    try {
      setLoadingVersion(true);
      const response = await fetch(`${supabaseUrl}/functions/v1/check-repository-versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repository_url: repoUrl }),
      });

      if (response.ok) {
        const result = await response.json();
        setVersionData(result);
      } else {
        setVersionData(null);
      }
    } catch (err) {
      console.error('Failed to check version:', err);
      setVersionData(null);
    } finally {
      setLoadingVersion(false);
    }
  };

  // Fetch archive on mount
  React.useEffect(() => {
    fetchArchivedAnalyses();
  }, []);

  // Update starred repos when archivedAnalyses changes
  React.useEffect(() => {
    const starredUrls = new Set<string>();
    archivedAnalyses.forEach(analysis => {
      if (analysis.starred) {
        starredUrls.add(analysis.repository_url);
      }
    });
    setStarredRepos(starredUrls);
  }, [archivedAnalyses]);

  const handleAnalyze = async () => {
    if (!urlInput.trim()) return;
    
    if (!isGitHubUrl(urlInput)) {
      setError('Please enter a valid GitHub repository URL in the format: https://github.com/owner/repository');
      return;
    }

    // Check if repository already exists in archive
    const existingAnalysis = archivedAnalyses.find(
      analysis => analysis.repository_url.toLowerCase() === urlInput.toLowerCase()
    );

    if (existingAnalysis) {
      const confirmed = confirm(
        'This repository has already been analyzed and is in your archive. Would you like to analyze it again and update the archive?'
      );
      if (!confirmed) {
        // Just show the existing analysis
        setAnalysisResult({
          success: true,
          repository: existingAnalysis.repository_url,
          analysis: existingAnalysis.analysis_data,
          metadata: {
            analyzedAt: existingAnalysis.created_at,
            dataSources: ['archive'],
            confidence: 1,
          },
        });
        setShowArchive(false);
        return;
      }
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

  const handleStarToggle = async (repoUrl: string) => {
    const currentlyStarred = starredRepos.has(repoUrl);
    
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/toggle-star`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          repository_url: repoUrl, 
          starred: !currentlyStarred 
        }),
      });

      if (!response.ok) throw new Error('Failed to update star status');

      // Update local state
      setStarredRepos(prev => {
        const newSet = new Set(prev);
        if (newSet.has(repoUrl)) {
          newSet.delete(repoUrl);
        } else {
          newSet.add(repoUrl);
        }
        return newSet;
      });

      // Update archivedAnalyses to reflect the change
      setArchivedAnalyses(prev =>
        prev.map(analysis =>
          analysis.repository_url === repoUrl
            ? { ...analysis, starred: !currentlyStarred }
            : analysis
        )
      );
    } catch (err) {
      console.error('Failed to toggle star:', err);
      alert('Failed to update star status');
    }
  };

  const handleExportArchive = (format: 'json' | 'csv') => {
    const dataToExport = archivedAnalyses.map(analysis => ({
      repository_url: analysis.repository_url,
      repository_name: analysis.repository_name,
      language: analysis.analysis_data?.metadata?.language || '',
      stars: analysis.analysis_data?.metadata?.stars || 0,
      description: analysis.analysis_data?.metadata?.description || '',
      topics: (analysis.analysis_data?.metadata?.topics || []).join(', '),
      analyzed_at: new Date(analysis.created_at).toISOString(),
    }));

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `github-archive-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      // CSV export
      const headers = ['Repository Name', 'Repository URL', 'Language', 'Stars', 'Description', 'Topics', 'Analyzed At'];
      const csvContent = [
        headers.join(','),
        ...dataToExport.map(row => [
          `"${row.repository_name}"`,
          `"${row.repository_url}"`,
          `"${row.language}"`,
          row.stars,
          `"${row.description.replace(/"/g, '""')}"`,
          `"${row.topics}"`,
          `"${row.analyzed_at}"`,
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `github-archive-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleToggleCompare = (url: string) => {
    setSelectedForCompare(prev => {
      const newSet = new Set(prev);
      if (newSet.has(url)) {
        newSet.delete(url);
      } else if (newSet.size < 2) {
        newSet.add(url);
      }
      return newSet;
    });
  };

  const handleCompare = () => {
    if (selectedForCompare.size === 2) {
      setShowComparison(true);
      setCompareMode(false);
    }
  };

  const getReposForComparison = () => {
    const urls = Array.from(selectedForCompare);
    return urls.map(url => {
      const analysis = archivedAnalyses.find(a => a.repository_url === url);
      return analysis ? { repository: url, analysis: analysis.analysis_data } : null;
    }).filter(Boolean);
  };

  const handleToggleBulk = (url: string) => {
    setSelectedForBulk(prev => {
      const newSet = new Set(prev);
      if (newSet.has(url)) {
        newSet.delete(url);
      } else {
        newSet.add(url);
      }
      return newSet;
    });
  };

  const handleSelectAllBulk = () => {
    const { data } = getPaginatedAnalyses();
    if (selectedForBulk.size === data.length) {
      setSelectedForBulk(new Set());
    } else {
      setSelectedForBulk(new Set(data.map(a => a.repository_url)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedForBulk.size === 0) return;
    
    if (!window.confirm(`Delete ${selectedForBulk.size} repository(ies) from archive?`)) return;

    try {
      const deletePromises = Array.from(selectedForBulk).map(url =>
        fetch(`${supabaseUrl}/functions/v1/delete-github-analysis`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repository_url: url }),
        })
      );

      await Promise.all(deletePromises);
      setArchivedAnalyses(prev => prev.filter(a => !selectedForBulk.has(a.repository_url)));
      setSelectedForBulk(new Set());
      setBulkMode(false);
    } catch (err) {
      console.error('Bulk delete error:', err);
      alert('Failed to delete repositories');
    }
  };

  const handleBulkStar = async (starred: boolean) => {
    if (selectedForBulk.size === 0) return;

    try {
      const promises = Array.from(selectedForBulk).map(url =>
        fetch(`${supabaseUrl}/functions/v1/toggle-star`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repository_url: url, starred }),
        })
      );

      await Promise.all(promises);
      
      // Update local state
      setArchivedAnalyses(prev =>
        prev.map(analysis =>
          selectedForBulk.has(analysis.repository_url)
            ? { ...analysis, starred }
            : analysis
        )
      );

      setSelectedForBulk(new Set());
      setBulkMode(false);
      
      alert(`${starred ? 'Starred' : 'Unstarred'} ${selectedForBulk.size} repository(ies)`);
    } catch (err) {
      console.error('Bulk star error:', err);
      alert('Failed to update star status');
    }
  };

  const handleBulkExport = () => {
    if (selectedForBulk.size === 0) return;

    const selected = archivedAnalyses.filter(a => selectedForBulk.has(a.repository_url));
    const dataToExport = selected.map(analysis => ({
      repository_url: analysis.repository_url,
      repository_name: analysis.repository_name,
      language: analysis.analysis_data?.metadata?.language || '',
      stars: analysis.analysis_data?.metadata?.stars || 0,
      description: analysis.analysis_data?.metadata?.description || '',
      topics: (analysis.analysis_data?.metadata?.topics || []).join(', '),
      analyzed_at: new Date(analysis.created_at).toISOString(),
    }));

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `github-selected-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getFilteredAndSortedAnalyses = () => {
    let filtered = archivedAnalyses.filter(analysis => {
      const searchLower = archiveSearchTerm.toLowerCase();
      const topics = (analysis.analysis_data?.metadata?.topics || []).join(' ').toLowerCase();
      const description = (analysis.analysis_data?.metadata?.description || '').toLowerCase();
      const language = (analysis.analysis_data?.metadata?.language || '').toLowerCase();
      
      const matchesSearch = !archiveSearchTerm || 
        analysis.repository_name.toLowerCase().includes(searchLower) ||
        language.includes(searchLower) ||
        topics.includes(searchLower) ||
        description.includes(searchLower);

      const matchesLanguage = !filterLanguage || 
        analysis.analysis_data?.metadata?.language === filterLanguage;

      // Advanced search filters
      const matchesMinStars = !searchFilters.minStars || 
        (analysis.analysis_data?.metadata?.stars || 0) >= parseInt(searchFilters.minStars);
      
      const matchesMaxStars = !searchFilters.maxStars || 
        (analysis.analysis_data?.metadata?.stars || 0) <= parseInt(searchFilters.maxStars);
      
      const matchesLicense = !searchFilters.hasLicense || 
        (searchFilters.hasLicense === 'yes' ? !!analysis.analysis_data?.metadata?.license : !analysis.analysis_data?.metadata?.license);
      
      const matchesMinTopics = !searchFilters.minTopics || 
        (analysis.analysis_data?.metadata?.topics?.length || 0) >= parseInt(searchFilters.minTopics);
      
      const matchesCreatedAfter = !searchFilters.createdAfter || 
        new Date(analysis.created_at) >= new Date(searchFilters.createdAfter);
      
      const matchesCreatedBefore = !searchFilters.createdBefore || 
        new Date(analysis.created_at) <= new Date(searchFilters.createdBefore);

      return matchesSearch && matchesLanguage && matchesMinStars && matchesMaxStars && 
             matchesLicense && matchesMinTopics && matchesCreatedAfter && matchesCreatedBefore;
    });

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'stars':
          return (b.analysis_data?.metadata?.stars || 0) - (a.analysis_data?.metadata?.stars || 0);
        case 'name':
          return a.repository_name.localeCompare(b.repository_name);
        case 'date':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return filtered;
  };

  const getPaginatedAnalyses = () => {
    const filtered = getFilteredAndSortedAnalyses();
    const startIndex = (currentPage - 1) * itemsPerPage;
    return {
      data: filtered.slice(startIndex, startIndex + itemsPerPage),
      totalPages: Math.ceil(filtered.length / itemsPerPage),
      total: filtered.length,
    };
  };



  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [archiveSearchTerm, filterLanguage, sortBy, searchFilters]);

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

  // Calculate statistics
  const getStatistics = () => {
    const totalRepos = archivedAnalyses.length;
    const starredRepos = archivedAnalyses.filter(a => a.starred).length;
    const totalStars = archivedAnalyses.reduce((sum, a) => sum + (a.analysis_data?.metadata?.stars || 0), 0);
    const avgStars = totalRepos > 0 ? Math.round(totalStars / totalRepos) : 0;
    
    // Language distribution
    const languages = archivedAnalyses.reduce((acc, a) => {
      const lang = a.analysis_data?.metadata?.language || 'Unknown';
      acc[lang] = (acc[lang] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topLanguages = Object.entries(languages)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    // Most popular repos
    const mostPopular = [...archivedAnalyses]
      .sort((a, b) => (b.analysis_data?.metadata?.stars || 0) - (a.analysis_data?.metadata?.stars || 0))
      .slice(0, 5);
    
    // Recent additions
    const recent = [...archivedAnalyses]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
    
    // Topic distribution
    const topics = archivedAnalyses.reduce((acc, a) => {
      const repoTopics = a.analysis_data?.metadata?.topics || [];
      repoTopics.forEach((topic: string) => {
        acc[topic] = (acc[topic] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);
    const topTopics = Object.entries(topics)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    return {
      totalRepos,
      starredRepos,
      totalStars,
      avgStars,
      topLanguages,
      mostPopular,
      recent,
      topTopics,
    };
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Github className="w-8 h-8 text-gray-700" />
            <h1 className="text-2xl font-bold text-gray-900">GitHub Repository Analyzer</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowDashboard(!showDashboard)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              Dashboard
            </button>
            <button
              onClick={() => setShowArchive(!showArchive)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
            >
              <Archive className="w-4 h-4" />
              Archive ({archivedAnalyses.length})
            </button>
          </div>
        </div>

        {/* Statistics Dashboard */}
        {showDashboard && archivedAnalyses.length > 0 && (
          <div className="mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-6 h-6" />
                Archive Statistics
              </h3>
              <button
                onClick={() => setShowDashboard(false)}
                className="text-gray-600 hover:text-gray-900"
              >
                ✕
              </button>
            </div>
            
            {(() => {
              const stats = getStatistics();
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Total Repositories */}
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Total Repos</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.totalRepos}</p>
                      </div>
                      <Archive className="w-8 h-8 text-purple-600" />
                    </div>
                  </div>
                  
                  {/* Starred */}
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Starred</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.starredRepos}</p>
                      </div>
                      <Star className="w-8 h-8 text-yellow-600" />
                    </div>
                  </div>
                  
                  {/* Total Stars */}
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Total Stars</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.totalStars.toLocaleString()}</p>
                      </div>
                      <Zap className="w-8 h-8 text-blue-600" />
                    </div>
                  </div>
                  
                  {/* Avg Stars */}
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Avg Stars</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.avgStars}</p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-green-600" />
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Top Languages and Topics */}
            {(() => {
              const stats = getStatistics();
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  {/* Top Languages */}
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Code className="w-4 h-4" />
                      Top Languages
                    </h4>
                    <div className="space-y-2">
                      {stats.topLanguages.map(([lang, count]) => (
                        <div key={lang} className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">{lang}</span>
                          <span className="text-sm font-semibold text-gray-900">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Top Topics */}
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Top Topics
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {stats.topTopics.map(([topic, count]) => (
                        <span key={topic} className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                          {topic} ({count})
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Most Popular & Recent */}
            {(() => {
              const stats = getStatistics();
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  {/* Most Popular */}
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Most Popular
                    </h4>
                    <div className="space-y-2">
                      {stats.mostPopular.map((repo) => (
                        <div key={repo.repository_url} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm text-gray-700 truncate flex-1">{repo.repository_name}</span>
                          <Star className="w-4 h-4 text-yellow-600 ml-2" />
                          <span className="text-sm font-semibold text-gray-900 ml-2">
                            {repo.analysis_data?.metadata?.stars?.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Recent */}
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Recently Added
                    </h4>
                    <div className="space-y-2">
                      {stats.recent.map((repo) => (
                        <div key={repo.repository_url} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm text-gray-700 truncate flex-1">{repo.repository_name}</span>
                          <span className="text-xs text-gray-500">
                            {formatDate(repo.created_at)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {showArchive && (
          <div className="mb-6 bg-purple-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Previously Analyzed Repositories ({archivedAnalyses.length})</h3>
              <div className="flex gap-2">
                {compareMode && selectedForCompare.size === 2 && (
                  <button
                    onClick={handleCompare}
                    className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 text-sm"
                  >
                    <GitCompare className="w-4 h-4" />
                    Compare ({selectedForCompare.size}/2)
                  </button>
                )}
                {bulkMode && selectedForBulk.size > 0 && (
                  <>
                    <button
                      onClick={() => handleBulkStar(true)}
                      className="px-3 py-1.5 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 flex items-center gap-2 text-sm"
                    >
                      <Star className="w-4 h-4" />
                      Star ({selectedForBulk.size})
                    </button>
                    <button
                      onClick={() => handleBulkStar(false)}
                      className="px-3 py-1.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2 text-sm"
                    >
                      <Star className="w-4 h-4" />
                      Unstar ({selectedForBulk.size})
                    </button>
                    <button
                      onClick={handleBulkExport}
                      className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm"
                    >
                      <Download className="w-4 h-4" />
                      Export ({selectedForBulk.size})
                    </button>
                    <button
                      onClick={handleBulkDelete}
                      className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete ({selectedForBulk.size})
                    </button>
                  </>
                )}
                <button
                  onClick={() => { 
                    setCompareMode(!compareMode); 
                    setSelectedForCompare(new Set());
                    if (compareMode) setBulkMode(false);
                  }}
                  disabled={bulkMode}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm ${compareMode ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-yellow-600 text-white hover:bg-yellow-700'} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <GitCompare className="w-4 h-4" />
                  {compareMode ? 'Cancel Compare' : 'Compare Mode'}
                </button>
                <button
                  onClick={() => { 
                    setBulkMode(!bulkMode); 
                    setSelectedForBulk(new Set());
                    if (bulkMode) setCompareMode(false);
                  }}
                  disabled={compareMode}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm ${bulkMode ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-orange-600 text-white hover:bg-orange-700'} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <Trash2 className="w-4 h-4" />
                  {bulkMode ? 'Cancel Bulk' : 'Bulk Mode'}
                </button>
                <button
                  onClick={() => handleExportArchive('csv')}
                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
                <button
                  onClick={() => handleExportArchive('json')}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm"
                >
                  <Download className="w-4 h-4" />
                  Export JSON
                </button>
              </div>
            </div>
            
            {/* Filters and Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <input
                type="text"
                value={archiveSearchTerm}
                onChange={(e) => { setArchiveSearchTerm(e.target.value); setCurrentPage(1); }}
                placeholder="Search repositories..."
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <select
                value={filterLanguage}
                onChange={(e) => { setFilterLanguage(e.target.value); setCurrentPage(1); }}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All Languages</option>
                {Array.from(new Set(archivedAnalyses.map(a => a.analysis_data?.metadata?.language).filter(Boolean))).map((lang: string) => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'stars' | 'name')}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="date">Sort by Date</option>
                <option value="stars">Sort by Stars</option>
                <option value="name">Sort by Name</option>
              </select>
            </div>

            {/* Advanced Search */}
            <div className="mb-3">
              <button
                onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                className="text-sm text-purple-600 hover:text-purple-800 font-medium flex items-center gap-2"
              >
                {showAdvancedSearch ? '▼' : '▶'} Advanced Search
              </button>
              {showAdvancedSearch && (
                <div className="mt-3 bg-white rounded-lg p-4 border border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Min Stars</label>
                      <input
                        type="number"
                        value={searchFilters.minStars}
                        onChange={(e) => { setSearchFilters({...searchFilters, minStars: e.target.value}); setCurrentPage(1); }}
                        placeholder="Min stars"
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Max Stars</label>
                      <input
                        type="number"
                        value={searchFilters.maxStars}
                        onChange={(e) => { setSearchFilters({...searchFilters, maxStars: e.target.value}); setCurrentPage(1); }}
                        placeholder="Max stars"
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Has License</label>
                      <select
                        value={searchFilters.hasLicense}
                        onChange={(e) => { setSearchFilters({...searchFilters, hasLicense: e.target.value}); setCurrentPage(1); }}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                      >
                        <option value="">Any</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Min Topics</label>
                      <input
                        type="number"
                        value={searchFilters.minTopics}
                        onChange={(e) => { setSearchFilters({...searchFilters, minTopics: e.target.value}); setCurrentPage(1); }}
                        placeholder="Min topics"
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Created After</label>
                      <input
                        type="date"
                        value={searchFilters.createdAfter}
                        onChange={(e) => { setSearchFilters({...searchFilters, createdAfter: e.target.value}); setCurrentPage(1); }}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Created Before</label>
                      <input
                        type="date"
                        value={searchFilters.createdBefore}
                        onChange={(e) => { setSearchFilters({...searchFilters, createdBefore: e.target.value}); setCurrentPage(1); }}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSearchFilters({
                        minStars: '',
                        maxStars: '',
                        hasLicense: '',
                        minTopics: '',
                        createdAfter: '',
                        createdBefore: '',
                      });
                      setCurrentPage(1);
                    }}
                    className="mt-3 px-3 py-1.5 text-sm text-red-600 hover:text-red-800"
                  >
                    Clear Filters
                  </button>
                </div>
              )}
            </div>
            {loadingArchive ? (
              <div className="text-center py-4">Loading archive...</div>
            ) : archivedAnalyses.length === 0 ? (
              <div className="text-center py-4 text-gray-500">No archived analyses yet</div>
            ) : (() => {
              const { data, totalPages, total } = getPaginatedAnalyses();
              
              return total === 0 ? (
                <div className="text-center py-4 text-gray-500">No repositories match your filters</div>
              ) : (
                <>
                  {bulkMode && (
                    <div className="mb-3 flex items-center justify-between">
                      <button
                        onClick={handleSelectAllBulk}
                        className="text-sm text-purple-600 hover:text-purple-800 font-medium"
                      >
                        {selectedForBulk.size === data.length ? 'Deselect All' : 'Select All'}
                      </button>
                      <span className="text-sm text-gray-600">
                        {selectedForBulk.size} selected
                      </span>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {data.map((analysis, idx) => (
                    <div
                      key={analysis.id || idx}
                      className={`p-3 bg-white rounded-lg hover:bg-purple-100 cursor-pointer border flex items-start gap-3 group ${(compareMode || bulkMode) ? 'border-2' : 'border-purple-200'} ${selectedForCompare.has(analysis.repository_url) ? 'border-purple-600 bg-purple-50' : ''} ${selectedForBulk.has(analysis.repository_url) ? 'border-orange-600 bg-orange-50' : ''}`}
                    >
                      {(compareMode || bulkMode) && (
                        <input
                          type="checkbox"
                          checked={
                            compareMode 
                              ? selectedForCompare.has(analysis.repository_url)
                              : selectedForBulk.has(analysis.repository_url)
                          }
                          onChange={() => 
                            compareMode 
                              ? handleToggleCompare(analysis.repository_url)
                              : handleToggleBulk(analysis.repository_url)
                          }
                          className="mt-1 w-4 h-4 text-purple-600 rounded"
                        />
                      )}
                      <div 
                        onClick={() => !compareMode && !bulkMode && handleArchiveClick(analysis)}
                        className="flex-1 min-w-0"
                      >
                        <div className="font-medium text-gray-900 truncate">{analysis.repository_name}</div>
                        <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {analysis.analysis_data?.metadata?.description ||
                           analysis.analysis_data?.summary?.tlDr || 
                           'No description available'}
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-xs">
                          <span className="text-gray-500">{analysis.analysis_data?.metadata?.language || 'N/A'}</span>
                          {analysis.analysis_data?.metadata?.stars && (
                            <span className="flex items-center gap-1 text-gray-500">
                              <Star className="w-3 h-3" />
                              {analysis.analysis_data.metadata.stars.toLocaleString()}
                            </span>
                          )}
                          {analysis.analysis_data?.metadata?.topics && analysis.analysis_data.metadata.topics.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {analysis.analysis_data.metadata.topics.slice(0, 3).map((topic: string, i: number) => (
                                <span key={i} className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                                  {topic}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDeleteArchive(analysis, e)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        title="Delete from archive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-purple-200">
                    <div className="text-sm text-gray-600">
                      Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, total)} of {total} repositories
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <div className="flex gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`px-3 py-1.5 text-sm rounded-lg ${
                                currentPage === pageNum
                                  ? 'bg-purple-600 text-white'
                                  : 'border border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
                </>
              );
            })()}
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

            {/* Version Updates */}
            {versionData && (
              <div className={`rounded-lg p-6 border-2 ${
                versionData.has_updates 
                  ? 'bg-orange-50 border-orange-200' 
                  : 'bg-green-50 border-green-200'
              }`}>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <AlertCircle className={`w-5 h-5 ${
                    versionData.has_updates ? 'text-orange-600' : 'text-green-600'
                  }`} />
                  🔄 {versionData.has_updates ? 'Updates Available' : 'Up to Date'}
                </h3>
                {versionData.has_updates && versionData.changes && versionData.changes.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 mb-3">
                      Changes detected since last analysis:
                    </p>
                    {versionData.changes.map((change: any, idx: number) => (
                      <div key={idx} className="bg-white rounded p-3 border border-gray-200">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            change.type === 'version' ? 'bg-purple-100 text-purple-700' :
                            change.type === 'description' ? 'bg-blue-100 text-blue-700' :
                            change.type === 'topics' ? 'bg-indigo-100 text-indigo-700' :
                            change.type === 'license' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {change.type}
                          </span>
                          <span className="text-xs text-gray-500">{change.field}</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          <div>From: <span className="font-medium">{change.old_value || 'N/A'}</span></div>
                          <div>To: <span className="font-medium text-green-700">{change.new_value}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">
                    No significant changes detected since the last analysis.
                  </p>
                )}
              </div>
            )}

            {/* Similar Repositories */}
            {similarRepos.length > 0 && (
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-6 border-2 border-indigo-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-indigo-600" />
                  🤖 AI Recommendations: Similar Repositories
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Based on language, topics, tech stack, and popularity
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {similarRepos.map((repo, idx) => (
                    <div
                      key={idx}
                      className="bg-white rounded-lg p-4 border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer"
                      onClick={() => {
                        const found = archivedAnalyses.find(a => a.repository_url === repo.url);
                        if (found) handleArchiveClick(found);
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">{repo.name}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                            <span>{repo.language || 'N/A'}</span>
                            {repo.stars && (
                              <span className="flex items-center gap-1">
                                <Star className="w-3 h-3 text-yellow-500" />
                                {repo.stars.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">
                          {Math.round(repo.similarity_score)}% match
                        </div>
                      </div>
                      {repo.topics && repo.topics.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {repo.topics.slice(0, 3).map((topic: string, i: number) => (
                            <span key={i} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs">
                              {topic}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

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

      {/* Comparison Modal */}
      {showComparison && (
        <RepoComparison
          repo1={getReposForComparison()[0]}
          repo2={getReposForComparison()[1]}
          onClose={() => {
            setShowComparison(false);
            setSelectedForCompare(new Set());
          }}
        />
      )}
    </div>
  );
}
