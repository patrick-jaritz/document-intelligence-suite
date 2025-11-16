/**
 * Execution History Component
 * Shows past executions for a prompt
 */

import { useState, useEffect } from 'react';
import { Clock, ThumbsUp, ThumbsDown, Star } from 'lucide-react';
import { Execution } from '../../types/promptforge';
import { getPromptExecutions } from '../../services/executionService';

interface ExecutionHistoryProps {
  promptId: string;
  onExecutionSelect?: (execution: Execution) => void;
}

export function ExecutionHistory({ promptId, onExecutionSelect }: ExecutionHistoryProps) {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    loadExecutions();
  }, [promptId, page]);

  const loadExecutions = async () => {
    setLoading(true);
    try {
      const result = await getPromptExecutions(promptId, page, 10);
      setExecutions(result.data);
      setTotalPages(result.total_pages);
    } catch (error) {
      console.error('Failed to load executions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFeedbackIcon = (feedback: string | null) => {
    switch (feedback) {
      case 'success':
        return <ThumbsUp className="w-4 h-4 text-green-600" />;
      case 'fail':
        return <ThumbsDown className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 text-gray-600 mb-4">
          <Clock className="w-5 h-5" />
          <span className="font-semibold">Execution History</span>
        </div>
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-4 border-t border-gray-200">
      <div className="flex items-center gap-2 text-gray-900 mb-4">
        <Clock className="w-5 h-5" />
        <span className="font-semibold">Execution History</span>
        <span className="text-sm text-gray-500">({executions.length})</span>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {executions.length === 0 ? (
          <div className="text-sm text-gray-500 py-4 text-center">
            No executions yet
          </div>
        ) : (
          executions.map((execution) => (
            <div
              key={execution.id}
              onClick={() => onExecutionSelect && onExecutionSelect(execution)}
              className="p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getFeedbackIcon(execution.user_feedback)}
                  <span className="text-sm font-medium">
                    {execution.model || 'Unknown Model'}
                  </span>
                </div>
                {execution.user_rating && (
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    <span className="text-xs">{execution.user_rating}</span>
                  </div>
                )}
              </div>

              {execution.response && (
                <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                  {execution.response.substring(0, 100)}...
                </p>
              )}

              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>
                  {new Date(execution.created_at).toLocaleDateString()}
                </span>
                {execution.latency_ms && (
                  <span>{execution.latency_ms}ms</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 text-xs border border-gray-300 rounded disabled:opacity-50"
          >
            Prev
          </button>
          <span className="text-xs text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 text-xs border border-gray-300 rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
