import { useMemo } from 'react';
import { FileText, TrendingUp, Network, BarChart3, Grid3x3 } from 'lucide-react';

interface Source {
  text: string;
  metadata?: any;
  similarity?: number;
  score?: number;
  filename?: string;
  chunkIndex?: number;
}

interface RAGVisualizationProps {
  sources: Source[];
  query?: string;
  viewMode?: 'heatmap' | 'graph' | 'comparison';
}

export function RAGVisualization({ sources, query, viewMode = 'heatmap' }: RAGVisualizationProps) {
  // Normalize and sort sources
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
      .sort((a, b) => b.similarity - a.similarity);
  }, [sources]);

  // Get color based on similarity score
  const getSimilarityColor = (similarity: number): string => {
    if (similarity >= 0.8) return 'bg-green-500';
    if (similarity >= 0.6) return 'bg-blue-500';
    if (similarity >= 0.4) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  // Get hex color for SVG
  const getSimilarityHexColor = (similarity: number): string => {
    if (similarity >= 0.8) return '#10b981';
    if (similarity >= 0.6) return '#3b82f6';
    if (similarity >= 0.4) return '#eab308';
    return '#f97316';
  };

  const getSimilarityBorderColor = (similarity: number): string => {
    if (similarity >= 0.8) return 'border-green-600';
    if (similarity >= 0.6) return 'border-blue-600';
    if (similarity >= 0.4) return 'border-yellow-600';
    return 'border-orange-600';
  };

  const getSimilarityTextColor = (similarity: number): string => {
    if (similarity >= 0.8) return 'text-green-700';
    if (similarity >= 0.6) return 'text-blue-700';
    if (similarity >= 0.4) return 'text-yellow-700';
    return 'text-orange-700';
  };

  if (!normalizedSources || normalizedSources.length === 0) {
    return null;
  }

  // Heatmap View
  if (viewMode === 'heatmap') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Grid3x3 className="w-4 h-4" />
            Similarity Heatmap
          </h3>
          <span className="text-xs text-gray-500">
            {normalizedSources.length} sources
          </span>
        </div>

        {/* Heatmap Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {normalizedSources.map((source, index) => {
            const similarity = source.similarity;
            const similarityPercent = Math.round(similarity * 100);
            
            return (
              <div
                key={source.originalIndex}
                className={`relative p-4 rounded-lg border-2 ${getSimilarityBorderColor(similarity)} ${getSimilarityColor(similarity)} bg-opacity-20 hover:bg-opacity-30 transition-all duration-200 cursor-pointer group`}
                title={`${source.filename}\nSimilarity: ${similarityPercent}%`}
              >
                {/* Rank Badge */}
                <div className="absolute top-2 right-2">
                  <span className="bg-white bg-opacity-90 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold text-gray-800">
                    #{index + 1}
                  </span>
                </div>

                {/* Similarity Score */}
                <div className="text-center">
                  <div className={`text-2xl font-bold ${getSimilarityTextColor(similarity)} mb-1`}>
                    {similarityPercent}%
                  </div>
                  <div className="text-xs text-gray-600 truncate">
                    {source.filename}
                  </div>
                </div>

                {/* Tooltip on hover */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                  <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                    <div className="font-semibold">{source.filename}</div>
                    <div className="text-gray-300">Score: {similarity.toFixed(3)}</div>
                    {source.metadata?.page_number && (
                      <div className="text-gray-300">Page: {source.metadata.page_number}</div>
                    )}
                  </div>
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Color Legend */}
        <div className="flex items-center gap-4 text-xs text-gray-600 pt-2 border-t border-gray-200">
          <span className="font-medium">Legend:</span>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span>High (≥80%)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span>Good (≥60%)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span>Moderate (≥40%)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-orange-500 rounded"></div>
            <span>Low (&lt;40%)</span>
          </div>
        </div>
      </div>
    );
  }

  // Graph View - Query-Chunk Relationship
  if (viewMode === 'graph') {
    const maxSimilarity = Math.max(...normalizedSources.map(s => s.similarity));
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Network className="w-4 h-4" />
            Query-Chunk Relationship
          </h3>
          <span className="text-xs text-gray-500">
            {normalizedSources.length} chunks retrieved
          </span>
        </div>

        {/* Graph Visualization */}
        <div className="relative bg-gray-50 rounded-lg p-6 border border-gray-200">
          {/* Query Node (Center) */}
          {query && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
              <div className="bg-blue-600 text-white rounded-full px-4 py-2 shadow-lg">
                <div className="text-xs font-semibold text-center max-w-[120px] truncate">
                  {query.length > 30 ? `${query.substring(0, 30)}...` : query}
                </div>
              </div>
            </div>
          )}

          {/* Chunk Nodes (Circular layout) */}
          <svg className="w-full h-64" viewBox="0 0 400 400">
            {normalizedSources.map((source, index) => {
              const similarity = source.similarity;
              const angle = (index * 2 * Math.PI) / normalizedSources.length - Math.PI / 2;
              const radius = 140;
              const centerX = 200;
              const centerY = 200;
              const x = centerX + radius * Math.cos(angle);
              const y = centerY + radius * Math.sin(angle);
              
              // Line thickness based on similarity
              const lineWidth = 1 + (similarity / maxSimilarity) * 2;
              const lineOpacity = 0.3 + (similarity / maxSimilarity) * 0.4;
              
              return (
                <g key={source.originalIndex}>
                  {/* Connection Line */}
                  {query && (
                    <line
                      x1={centerX}
                      y1={centerY}
                      x2={x}
                      y2={y}
                      stroke={getSimilarityColor(similarity).replace('bg-', '#') || '#3b82f6'}
                      strokeWidth={lineWidth}
                      opacity={lineOpacity}
                      strokeDasharray={similarity < 0.5 ? '5,5' : '0'}
                    />
                  )}
                  
                  {/* Chunk Node */}
                  <circle
                    cx={x}
                    cy={y}
                    r={12 + similarity * 8}
                    fill={getSimilarityHexColor(similarity)}
                    opacity={0.7}
                    className="cursor-pointer hover:opacity-100 transition-opacity"
                  />
                  
                  {/* Chunk Label */}
                  <text
                    x={x}
                    y={y + 35}
                    textAnchor="middle"
                    className="text-xs fill-gray-700 font-medium"
                  >
                    #{index + 1}
                  </text>
                  
                  {/* Similarity Score */}
                  <text
                    x={x}
                    y={y + 50}
                    textAnchor="middle"
                    className="text-xs fill-gray-500"
                  >
                    {Math.round(similarity * 100)}%
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Source Details */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {normalizedSources.slice(0, 6).map((source, index) => (
              <div
                key={source.originalIndex}
                className="p-3 bg-white rounded-lg border border-gray-200 text-xs"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-3 h-3 rounded-full ${getSimilarityColor(source.similarity)}`}></span>
                  <span className="font-semibold">#{index + 1}</span>
                  <span className={`font-medium ${getSimilarityTextColor(source.similarity)}`}>
                    {Math.round(source.similarity * 100)}%
                  </span>
                </div>
                <div className="text-gray-600 truncate">{source.filename}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Comparison View - Similarity Distribution
  if (viewMode === 'comparison') {
    const highRelevance = normalizedSources.filter(s => s.similarity >= 0.8).length;
    const goodRelevance = normalizedSources.filter(s => s.similarity >= 0.6 && s.similarity < 0.8).length;
    const moderateRelevance = normalizedSources.filter(s => s.similarity >= 0.4 && s.similarity < 0.6).length;
    const lowRelevance = normalizedSources.filter(s => s.similarity < 0.4).length;
    
    const maxCount = Math.max(highRelevance, goodRelevance, moderateRelevance, lowRelevance);
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Similarity Distribution
          </h3>
          <span className="text-xs text-gray-500">
            {normalizedSources.length} sources analyzed
          </span>
        </div>

        {/* Bar Chart */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-24 text-xs font-medium text-gray-700">High (≥80%)</div>
            <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
              <div
                className="bg-green-500 h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                style={{ width: maxCount > 0 ? `${(highRelevance / maxCount) * 100}%` : '0%' }}
              >
                {highRelevance > 0 && (
                  <span className="text-xs font-semibold text-white">{highRelevance}</span>
                )}
              </div>
            </div>
            <div className="w-12 text-xs text-gray-600 text-right">{highRelevance}</div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-24 text-xs font-medium text-gray-700">Good (≥60%)</div>
            <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
              <div
                className="bg-blue-500 h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                style={{ width: maxCount > 0 ? `${(goodRelevance / maxCount) * 100}%` : '0%' }}
              >
                {goodRelevance > 0 && (
                  <span className="text-xs font-semibold text-white">{goodRelevance}</span>
                )}
              </div>
            </div>
            <div className="w-12 text-xs text-gray-600 text-right">{goodRelevance}</div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-24 text-xs font-medium text-gray-700">Moderate (≥40%)</div>
            <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
              <div
                className="bg-yellow-500 h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                style={{ width: maxCount > 0 ? `${(moderateRelevance / maxCount) * 100}%` : '0%' }}
              >
                {moderateRelevance > 0 && (
                  <span className="text-xs font-semibold text-white">{moderateRelevance}</span>
                )}
              </div>
            </div>
            <div className="w-12 text-xs text-gray-600 text-right">{moderateRelevance}</div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-24 text-xs font-medium text-gray-700">Low (&lt;40%)</div>
            <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
              <div
                className="bg-orange-500 h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                style={{ width: maxCount > 0 ? `${(lowRelevance / maxCount) * 100}%` : '0%' }}
              >
                {lowRelevance > 0 && (
                  <span className="text-xs font-semibold text-white">{lowRelevance}</span>
                )}
              </div>
            </div>
            <div className="w-12 text-xs text-gray-600 text-right">{lowRelevance}</div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-700">{highRelevance}</div>
            <div className="text-xs text-gray-600">High Relevance</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-700">{goodRelevance}</div>
            <div className="text-xs text-gray-600">Good Relevance</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-700">{moderateRelevance}</div>
            <div className="text-xs text-gray-600">Moderate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-700">{lowRelevance}</div>
            <div className="text-xs text-gray-600">Low Relevance</div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

