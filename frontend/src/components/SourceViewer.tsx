import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, FileText, ExternalLink, TrendingUp, MapPin, Grid3x3, Network, BarChart3, List } from 'lucide-react';
import { RAGVisualization } from './RAGVisualization';

interface Source {
  text: string;
  metadata?: any;
  similarity?: number;
  score?: number; // Alternative to similarity
  filename?: string;
  chunkIndex?: number;
}

interface SourceViewerProps {
  sources: Source[];
  query?: string;
  enableVisualizations?: boolean;
}

export function SourceViewer({ sources, query, enableVisualizations = true }: SourceViewerProps) {
  const [expandedSources, setExpandedSources] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<'list' | 'heatmap' | 'graph' | 'comparison'>('list');

  // Normalize sources and sort by similarity/score (highest first)
  const normalizedSources = useMemo(() => {
    return sources
      .map((source, index) => ({
        ...source,
        similarity: source.similarity ?? source.score ?? 0,
        metadata: source.metadata || {},
        filename: source.filename || source.metadata?.filename || 'Unknown',
        chunkIndex: source.chunkIndex ?? source.metadata?.chunk_index ?? index,
        originalIndex: index,
      }))
      .sort((a, b) => b.similarity - a.similarity); // Sort by similarity (highest first)
  }, [sources]);

  const toggleSource = (index: number) => {
    const newExpanded = new Set(expandedSources);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSources(newExpanded);
  };

  // Get color based on similarity score
  const getSimilarityColor = (similarity: number): string => {
    if (similarity >= 0.8) return 'bg-green-500';
    if (similarity >= 0.6) return 'bg-blue-500';
    if (similarity >= 0.4) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  // Get text color for similarity
  const getSimilarityTextColor = (similarity: number): string => {
    if (similarity >= 0.8) return 'text-green-700';
    if (similarity >= 0.6) return 'text-blue-700';
    if (similarity >= 0.4) return 'text-yellow-700';
    return 'text-orange-700';
  };

  // Get background color for similarity badge
  const getSimilarityBgColor = (similarity: number): string => {
    if (similarity >= 0.8) return 'bg-green-100';
    if (similarity >= 0.6) return 'bg-blue-100';
    if (similarity >= 0.4) return 'bg-yellow-100';
    return 'bg-orange-100';
  };

  if (!normalizedSources || normalizedSources.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Retrieved Sources ({normalizedSources.length})
        </h3>
        <div className="flex items-center gap-2">
          {enableVisualizations && (
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('heatmap')}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'heatmap'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Heatmap View"
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('graph')}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'graph'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Graph View"
              >
                <Network className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('comparison')}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'comparison'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Comparison View"
              >
                <BarChart3 className="w-4 h-4" />
              </button>
            </div>
          )}
          <span className="text-xs text-gray-500">
            Sorted by relevance
          </span>
        </div>
      </div>

      {/* Visualization Views */}
      {enableVisualizations && viewMode !== 'list' && (
        <div className="mb-4">
          <RAGVisualization
            sources={normalizedSources}
            query={query}
            viewMode={viewMode}
          />
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="space-y-3">

      {normalizedSources.map((source, index) => {
        const similarity = source.similarity;
        const similarityPercent = Math.round(similarity * 100);
        const isExpanded = expandedSources.has(index);

        return (
          <div
            key={source.originalIndex}
            className="border border-gray-200 rounded-lg bg-white shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
          >
            {/* Header with similarity indicator */}
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* Source number and rank badge */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                      #{index + 1}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getSimilarityBgColor(similarity)} ${getSimilarityTextColor(similarity)}`}>
                      {similarityPercent}% match
                    </span>
                    {index === 0 && similarity > 0.7 && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        Top match
                      </span>
                    )}
                  </div>

                  {/* Visual similarity bar */}
                  <div className="mb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${getSimilarityColor(similarity)}`}
                          style={{ width: `${similarityPercent}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-600 min-w-[3rem] text-right">
                        {similarityPercent}%
                      </span>
                    </div>
                  </div>

                  {/* Filename and metadata */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-gray-700 truncate">
                      {source.filename}
                    </span>
                    {source.metadata?.page_number && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded">
                        <MapPin className="w-3 h-3" />
                        Page {source.metadata.page_number}
                      </span>
                    )}
                    {source.chunkIndex !== undefined && (
                      <span className="text-xs text-gray-500">
                        Chunk #{source.chunkIndex + 1}
                      </span>
                    )}
                  </div>
                </div>

                {/* Expand/Collapse button */}
                <button
                  onClick={() => toggleSource(index)}
                  className="flex-shrink-0 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label={isExpanded ? 'Collapse source' : 'Expand source'}
                >
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                </button>
              </div>
            </div>

            {/* Expanded content with animation */}
            {isExpanded && (
              <div className="border-t border-gray-100 bg-gray-50">
                <div className="p-4 transition-all duration-200 ease-in-out">
                  {/* Source text */}
                  <div className="mb-4">
                    <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                      Source Content
                    </h4>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-white p-3 rounded border border-gray-200">
                      {source.text}
                    </p>
                  </div>

                  {/* Enhanced Citation Information (Phase 3: Grounded Citations) */}
                  {source.metadata && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="text-xs font-semibold text-blue-900 mb-3 uppercase tracking-wide flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Citation Details
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        {/* Retrieval Rank */}
                        <div>
                          <span className="text-blue-700 font-medium">Retrieval Rank:</span>
                          <span className="ml-1 text-blue-900">#{source.metadata.retrievalRank || (index + 1)}</span>
                        </div>
                        
                        {/* Document Position */}
                        {source.metadata.chunkOffset !== undefined && (
                          <div>
                            <span className="text-blue-700 font-medium">Document Position:</span>
                            <span className="ml-1 text-blue-900">
                              {source.metadata.chunkOffset.toLocaleString()} - {(source.metadata.chunkEndOffset || source.metadata.chunkOffset + source.text.length).toLocaleString()}
                            </span>
                          </div>
                        )}
                        
                        {/* Chunk Length */}
                        {source.metadata.chunkLength && (
                          <div>
                            <span className="text-blue-700 font-medium">Chunk Size:</span>
                            <span className="ml-1 text-blue-900">{source.metadata.chunkLength.toLocaleString()} chars</span>
                          </div>
                        )}
                        
                        {/* Chunking Strategy */}
                        {source.metadata.retrievalMethod && (
                          <div>
                            <span className="text-blue-700 font-medium">Chunking:</span>
                            <span className="ml-1 text-blue-900 capitalize">{source.metadata.retrievalMethod}</span>
                          </div>
                        )}
                        
                        {/* Section Title */}
                        {source.metadata.sectionTitle && (
                          <div className="col-span-2">
                            <span className="text-blue-700 font-medium">Section:</span>
                            <span className="ml-1 text-blue-900">{source.metadata.sectionTitle}</span>
                          </div>
                        )}
                        
                        {/* Semantic Boundary */}
                        {source.metadata.semanticBoundary && (
                          <div>
                            <span className="text-blue-700 font-medium">Boundary Type:</span>
                            <span className="ml-1 text-blue-900 capitalize">{source.metadata.semanticBoundary}</span>
                          </div>
                        )}
                        
                        {/* Special Content Flags */}
                        {(source.metadata.hasCodeBlock || source.metadata.hasTable) && (
                          <div>
                            <span className="text-blue-700 font-medium">Contains:</span>
                            <span className="ml-1 text-blue-900">
                              {source.metadata.hasCodeBlock && 'Code'}
                              {source.metadata.hasCodeBlock && source.metadata.hasTable && ', '}
                              {source.metadata.hasTable && 'Table'}
                            </span>
                          </div>
                        )}
                        
                        {/* Citation ID */}
                        {source.metadata.citationId && (
                          <div className="col-span-2">
                            <span className="text-blue-700 font-medium">Citation ID:</span>
                            <span className="ml-1 text-blue-900 font-mono text-[10px]">{source.metadata.citationId}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Citation Verification Badge */}
                      {source.metadata.citationId && (
                        <div className="mt-3 pt-3 border-t border-blue-300">
                          <div className="flex items-center gap-2 text-xs text-blue-800">
                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="font-medium">Citation Verified</span>
                            <span className="text-blue-600">• Retrieved from source document</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Metadata tags */}
                  {(source.metadata?.page_number || source.metadata?.source_url || source.metadata?.chunk_index !== undefined) && (
                    <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-200">
                      {source.metadata?.page_number && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 text-xs rounded-md font-medium">
                          <MapPin className="w-3 h-3" />
                          Page {source.metadata.page_number}
                        </span>
                      )}
                      {source.metadata?.chunk_index !== undefined && (
                        <span className="px-2.5 py-1 bg-purple-100 text-purple-700 text-xs rounded-md font-medium">
                          Chunk Index: {source.metadata.chunk_index}
                        </span>
                      )}
                      {source.filename && (
                        <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs rounded-md font-medium">
                          {source.filename}
                        </span>
                      )}
                      {source.metadata?.source_url && (
                        <a
                          href={source.metadata.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-100 text-purple-700 text-xs rounded-md font-medium hover:bg-purple-200 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          View Source
                        </a>
                      )}
                    </div>
                  )}

                  {/* Similarity details */}
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">Relevance Score</span>
                      <span className={`font-semibold ${getSimilarityTextColor(similarity)}`}>
                        {similarity.toFixed(3)} ({similarityPercent}%)
                      </span>
                    </div>
                    {similarity < 0.5 && (
                      <p className="text-xs text-orange-600 mt-1">
                        ⚠️ Low relevance - this source may not fully answer your question
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
        </div>
      )}
    </div>
  );
}
