/**
 * Execution History Component
 * Lists executions for a prompt
 */

import { useState, useEffect } from 'react';
import { Calendar, CheckCircle, XCircle, Star } from 'lucide-react';
import { getExecutions } from '../../services/promptForgeService';
import type { Execution } from '../../types/promptforge';

interface ExecutionHistoryProps {
  promptId: string;
}

export function ExecutionHistory({ promptId }: ExecutionHistoryProps) {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'successful' | 'failed'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadExecutions();
  }, [promptId, filter, page]);

  const loadExecutions = async () => {
    setLoading(true);
    try {
      const response = await getExecutions({
        prompt_id: promptId,
        filter: filter === 'all' ? undefined : filter,
        page,
        limit: 20,
      });
      setExecutions(response.executions);
      setTotalPages(response.pagination.totalPages);
    } catch (error) {
      console.error('Error loading executions:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Execution History</h3>
        <select
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value as any);
            setPage(1);
          }}
          className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
        >
          <option value="all">All</option>
          <option value="successful">Successful</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : executions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No executions yet</div>
      ) : (
        <>
          <div className="space-y-4">
            {executions.map(execution => (
              <div
                key={execution.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {execution.marked_successful ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : execution.marked_successful === false ? (
                        <XCircle className="w-5 h-5 text-red-600" />
                      ) : null}
                      <span className="text-sm font-medium text-gray-900">
                        {execution.model_name} ({execution.model_provider})
                      </span>
                      {execution.user_rating && (
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          <span className="text-sm">{execution.user_rating}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(execution.created_at).toLocaleString()}
                      </span>
                      {execution.tokens_total && (
                        <span>{execution.tokens_total} tokens</span>
                      )}
                      {execution.latency_ms && (
                        <span>{execution.latency_ms}ms</span>
                      )}
                    </div>
                    {execution.response_text && (
                      <p className="text-sm text-gray-700 line-clamp-2 mt-2">
                        {execution.response_text.substring(0, 200)}...
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-4 py-2">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
