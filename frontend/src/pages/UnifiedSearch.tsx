import { useState, useCallback, useEffect } from 'react';
import { Search, Clock, FileText, Package, Sparkles, ArrowLeft, Loader2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { performUnifiedSearch, getSearchSuggestions } from '../services/unifiedSearchService';
import { formatLatency } from '../utils/searchUtils';
import type { UnifiedSearchResult } from '../services/unifiedSearchService';

export function UnifiedSearch() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<UnifiedSearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [latency, setLatency] = useState<number>(0);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Perform search on mount if query exists
  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery);
    }
  }, [initialQuery]);

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const { results: searchResults, metrics } = await performUnifiedSearch({
        query: searchQuery,
        type: 'all',
        limit: 20
      });

      setResults(searchResults);
      setLatency(metrics.latencyMs);
      
      // Update URL with search query
      setSearchParams({ q: searchQuery });
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await performSearch(query);
    setShowSuggestions(false);
  };

  const handleInputChange = useCallback(async (value: string) => {
    setQuery(value);
    
    // Get suggestions as user types
    if (value.length >= 2) {
      try {
        const newSuggestions = await getSearchSuggestions(value);
        setSuggestions(newSuggestions);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Failed to get suggestions:', error);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, []);

  const selectSuggestion = (suggestion: string) => {
    setQuery(suggestion);
    setSuggestions([]);
    setShowSuggestions(false);
    performSearch(suggestion);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'prompt':
        return <Sparkles className="w-3 h-3" />;
      case 'document':
        return <FileText className="w-3 h-3" />;
      case 'pack':
        return <Package className="w-3 h-3" />;
      default:
        return <FileText className="w-3 h-3" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'prompt':
        return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'document':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'pack':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-12">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-white rounded-lg transition-colors"
              aria-label="Go back to home"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Search</h1>
              <p className="text-gray-600 text-lg mt-1">
                Find prompts, documents, and packs across your workspace
              </p>
            </div>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="relative">
            <div className="relative">
              <input
                type="search"
                value={query}
                onChange={(e) => handleInputChange(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="Search across all content..."
                className="w-full px-6 py-5 pl-14 text-lg rounded-2xl border-2 border-gray-300 
                         focus:border-blue-500 focus:outline-none focus:ring-4 
                         focus:ring-blue-100 transition-all shadow-sm bg-white"
                autoFocus
              />
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 w-6 h-6" />
              
              {/* Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border 
                              border-gray-200 rounded-xl shadow-lg overflow-hidden z-10">
                  {suggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selectSuggestion(suggestion);
                      }}
                      className="w-full px-6 py-3 text-left hover:bg-gray-50 
                               transition-colors border-b border-gray-100 last:border-0 flex items-center gap-3"
                    >
                      <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="truncate">{suggestion}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Search Button */}
            <div className="flex justify-center mt-6">
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="px-8 py-3 bg-blue-600 text-white rounded-xl font-medium
                         hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed
                         transition-colors shadow-sm flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    Search
                  </>
                )}
              </button>
            </div>
          </form>
        </header>

        {/* Metrics */}
        {!loading && results.length > 0 && (
          <div className="flex items-center gap-6 text-sm text-gray-600 mb-6 pb-4 border-b border-gray-200">
            <span>
              <strong className="text-gray-900">{results.length}</strong> results
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {formatLatency(latency)}
            </span>
          </div>
        )}

        {/* Results */}
        <div className="space-y-6">
          {results.map((result) => (
            <article
              key={`${result.type}-${result.id}`}
              className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Type Badge and Relevance */}
              <div className="flex items-center gap-3 mb-3">
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full 
                               text-xs font-medium border ${getTypeColor(result.type)}`}>
                  {getTypeIcon(result.type)}
                  {result.type}
                </span>
                <span className="text-xs text-gray-500">
                  relevance: {result.relevance.toFixed(3)}
                </span>
              </div>

              {/* Title */}
              <h3 className="text-xl mb-3">
                <a
                  href={result.url}
                  className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                >
                  {result.title}
                </a>
              </h3>

              {/* Snippet */}
              <p className="text-gray-700 leading-relaxed mb-3">
                {result.snippet}
              </p>

              {/* Metadata */}
              {result.metadata && (
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  {result.createdAt && (
                    <span>
                      Created: {new Date(result.createdAt).toLocaleDateString()}
                    </span>
                  )}
                  {result.metadata.category && (
                    <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                      {result.metadata.category}
                    </span>
                  )}
                  {result.metadata.tags && Array.isArray(result.metadata.tags) && result.metadata.tags.length > 0 && (
                    <div className="flex gap-1">
                      {result.metadata.tags.slice(0, 3).map((tag: string, idx: number) => (
                        <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-16">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Searching...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && query && results.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200 shadow-sm">
            <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-700 text-lg mb-2 font-medium">No results found</p>
            <p className="text-gray-500">
              Try different keywords or check your spelling
            </p>
          </div>
        )}

        {/* Initial State */}
        {!query && !loading && (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200 shadow-sm">
            <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">Start typing to search across all your content</p>
            <div className="mt-6 flex gap-3 justify-center flex-wrap">
              <button
                onClick={() => {
                  setQuery('machine learning');
                  performSearch('machine learning');
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 transition-colors"
              >
                Try "machine learning"
              </button>
              <button
                onClick={() => {
                  setQuery('python');
                  performSearch('python');
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 transition-colors"
              >
                Try "python"
              </button>
              <button
                onClick={() => {
                  setQuery('document');
                  performSearch('document');
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 transition-colors"
              >
                Try "document"
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default UnifiedSearch;
