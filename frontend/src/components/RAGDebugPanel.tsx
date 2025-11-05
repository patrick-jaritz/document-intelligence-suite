import { useMemo } from 'react';
import { 
  Bug, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  BarChart3,
  Zap,
  Clock,
  Target,
  FileText,
  Layers,
  Activity
} from 'lucide-react';

interface Source {
  text: string;
  metadata?: any;
  similarity?: number;
  score?: number;
  filename?: string;
  chunkIndex?: number;
}

interface RAGDebugPanelProps {
  sources: Source[];
  query?: string;
  queryTime?: number;
  retrievedChunks?: number;
  totalChunks?: number;
  model?: string;
  provider?: string;
}

export function RAGDebugPanel({
  sources,
  query,
  queryTime,
  retrievedChunks,
  totalChunks,
  model,
  provider
}: RAGDebugPanelProps) {
  // Normalize sources
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

  // Calculate metrics
  const metrics = useMemo(() => {
    if (normalizedSources.length === 0) {
      return {
        avgSimilarity: 0,
        minSimilarity: 0,
        maxSimilarity: 0,
        highRelevanceCount: 0,
        goodRelevanceCount: 0,
        moderateRelevanceCount: 0,
        lowRelevanceCount: 0,
        avgChunkLength: 0,
        totalChars: 0,
        diversityScore: 0,
      };
    }

    const similarities = normalizedSources.map(s => s.similarity);
    const chunkLengths = normalizedSources.map(s => s.text?.length || 0);
    const filenames = new Set(normalizedSources.map(s => s.filename));
    
    return {
      avgSimilarity: similarities.reduce((a, b) => a + b, 0) / similarities.length,
      minSimilarity: Math.min(...similarities),
      maxSimilarity: Math.max(...similarities),
      highRelevanceCount: similarities.filter(s => s >= 0.8).length,
      goodRelevanceCount: similarities.filter(s => s >= 0.6 && s < 0.8).length,
      moderateRelevanceCount: similarities.filter(s => s >= 0.4 && s < 0.6).length,
      lowRelevanceCount: similarities.filter(s => s < 0.4).length,
      avgChunkLength: chunkLengths.reduce((a, b) => a + b, 0) / chunkLengths.length,
      totalChars: chunkLengths.reduce((a, b) => a + b, 0),
      diversityScore: filenames.size / normalizedSources.length, // 0-1, higher = more diverse
    };
  }, [normalizedSources]);

  // Generate optimization suggestions
  const suggestions = useMemo(() => {
    const suggestions: Array<{ type: 'warning' | 'info' | 'success'; message: string }> = [];

    // Similarity-based suggestions
    if (metrics.avgSimilarity < 0.5) {
      suggestions.push({
        type: 'warning',
        message: 'Low average similarity - consider refining query or expanding document coverage'
      });
    }

    if (metrics.lowRelevanceCount > normalizedSources.length * 0.5) {
      suggestions.push({
        type: 'warning',
        message: 'More than 50% of retrieved chunks have low relevance - consider adjusting topK or improving chunking strategy'
      });
    }

    // Diversity suggestions
    if (metrics.diversityScore < 0.3 && normalizedSources.length > 1) {
      suggestions.push({
        type: 'info',
        message: 'Low source diversity - all chunks from same document. Consider cross-document queries.'
      });
    }

    // Performance suggestions
    if (queryTime && queryTime > 5000) {
      suggestions.push({
        type: 'warning',
        message: `Query took ${(queryTime / 1000).toFixed(1)}s - consider optimizing embedding or reducing topK`
      });
    }

    // Chunk quality suggestions
    if (metrics.avgChunkLength < 100) {
      suggestions.push({
        type: 'info',
        message: 'Average chunk length is very short - consider increasing chunk size for better context'
      });
    }

    if (metrics.avgChunkLength > 2000) {
      suggestions.push({
        type: 'info',
        message: 'Average chunk length is very long - consider reducing chunk size for more focused retrieval'
      });
    }

    // Positive feedback
    if (metrics.avgSimilarity >= 0.7 && metrics.highRelevanceCount >= 2) {
      suggestions.push({
        type: 'success',
        message: 'Excellent retrieval quality - high relevance scores across multiple chunks'
      });
    }

    return suggestions;
  }, [metrics, normalizedSources.length, queryTime]);

  // Calculate retrieval efficiency
  const retrievalEfficiency = useMemo(() => {
    if (!retrievedChunks || !totalChunks || totalChunks === 0) return null;
    return (retrievedChunks / totalChunks) * 100;
  }, [retrievedChunks, totalChunks]);

  return (
    <div className="space-y-4 bg-gray-50 rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Bug className="w-4 h-4" />
          RAG Debug Panel
        </h3>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {provider && <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">{provider}</span>}
          {model && <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">{model}</span>}
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-xs text-gray-600">Query Time</span>
          </div>
          <div className="text-lg font-bold text-gray-900">
            {queryTime ? `${(queryTime / 1000).toFixed(2)}s` : 'N/A'}
          </div>
        </div>

        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-gray-500" />
            <span className="text-xs text-gray-600">Retrieved</span>
          </div>
          <div className="text-lg font-bold text-gray-900">
            {retrievedChunks || normalizedSources.length}
            {totalChunks && (
              <span className="text-xs text-gray-500 ml-1">/ {totalChunks}</span>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-gray-500" />
            <span className="text-xs text-gray-600">Avg Similarity</span>
          </div>
          <div className="text-lg font-bold text-gray-900">
            {(metrics.avgSimilarity * 100).toFixed(1)}%
          </div>
        </div>

        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-4 h-4 text-gray-500" />
            <span className="text-xs text-gray-600">Diversity</span>
          </div>
          <div className="text-lg font-bold text-gray-900">
            {(metrics.diversityScore * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Similarity Range */}
      <div className="bg-white rounded-lg p-3 border border-gray-200">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-900">Similarity Range</span>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">Min</span>
            <span className="font-medium text-gray-900">{(metrics.minSimilarity * 100).toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-2 rounded-full"
              style={{
                background: `linear-gradient(to right, 
                  red 0%, 
                  red ${(metrics.minSimilarity * 100)}%, 
                  yellow ${(metrics.minSimilarity * 100)}%, 
                  yellow ${(metrics.maxSimilarity * 100)}%, 
                  green ${(metrics.maxSimilarity * 100)}%, 
                  green 100%)`
              }}
            />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">Max</span>
            <span className="font-medium text-gray-900">{(metrics.maxSimilarity * 100).toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Chunk Quality Metrics */}
      <div className="bg-white rounded-lg p-3 border border-gray-200">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-900">Chunk Quality</span>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-gray-600">Avg Length</span>
            <div className="font-semibold text-gray-900">{Math.round(metrics.avgChunkLength)} chars</div>
          </div>
          <div>
            <span className="text-gray-600">Total Content</span>
            <div className="font-semibold text-gray-900">{metrics.totalChars.toLocaleString()} chars</div>
          </div>
        </div>
      </div>

      {/* Relevance Distribution */}
      <div className="bg-white rounded-lg p-3 border border-gray-200">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-900">Relevance Distribution</span>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span className="text-gray-600">High (≥80%)</span>
            </div>
            <span className="font-semibold text-gray-900">{metrics.highRelevanceCount}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span className="text-gray-600">Good (≥60%)</span>
            </div>
            <span className="font-semibold text-gray-900">{metrics.goodRelevanceCount}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded"></div>
              <span className="text-gray-600">Moderate (≥40%)</span>
            </div>
            <span className="font-semibold text-gray-900">{metrics.moderateRelevanceCount}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded"></div>
              <span className="text-gray-600">Low (&lt;40%)</span>
            </div>
            <span className="font-semibold text-gray-900">{metrics.lowRelevanceCount}</span>
          </div>
        </div>
      </div>

      {/* Optimization Suggestions */}
      {suggestions.length > 0 && (
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-semibold text-gray-900">Optimization Suggestions</span>
          </div>
          <div className="space-y-2">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className={`flex items-start gap-2 p-2 rounded text-xs ${
                  suggestion.type === 'warning'
                    ? 'bg-yellow-50 border border-yellow-200'
                    : suggestion.type === 'success'
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-blue-50 border border-blue-200'
                }`}
              >
                {suggestion.type === 'warning' && (
                  <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                )}
                {suggestion.type === 'success' && (
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                )}
                {suggestion.type === 'info' && (
                  <Activity className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                )}
                <span
                  className={
                    suggestion.type === 'warning'
                      ? 'text-yellow-800'
                      : suggestion.type === 'success'
                      ? 'text-green-800'
                      : 'text-blue-800'
                  }
                >
                  {suggestion.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Retrieval Efficiency */}
      {retrievalEfficiency !== null && (
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-semibold text-gray-900">Retrieval Efficiency</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  retrievalEfficiency > 80 ? 'bg-green-500' :
                  retrievalEfficiency > 50 ? 'bg-blue-500' :
                  retrievalEfficiency > 25 ? 'bg-yellow-500' :
                  'bg-orange-500'
                }`}
                style={{ width: `${retrievalEfficiency}%` }}
              />
            </div>
            <span className="text-xs font-medium text-gray-700">
              {retrievalEfficiency.toFixed(1)}%
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {retrievedChunks} of {totalChunks} total chunks retrieved
          </p>
        </div>
      )}
    </div>
  );
}

