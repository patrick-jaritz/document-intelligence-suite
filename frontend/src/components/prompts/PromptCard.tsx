/**
 * Prompt Card Component
 * Displays a prompt in grid or list view
 */

import { type Prompt } from '../../types/promptforge';
import { Calendar, Tag, Eye, Star, TrendingUp } from 'lucide-react';

interface PromptCardProps {
  prompt: Prompt;
  viewMode: 'grid' | 'list';
  onClick: () => void;
}

export function PromptCard({ prompt, viewMode, onClick }: PromptCardProps) {
  const metrics = prompt.prompt_metrics;
  const successRate = metrics && metrics.total_executions > 0
    ? Math.round((metrics.successful_executions / metrics.total_executions) * 100)
    : null;

  if (viewMode === 'list') {
    return (
      <div
        onClick={onClick}
        className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{prompt.title}</h3>
            {prompt.description && (
              <p className="text-gray-600 text-sm mb-3 line-clamp-2">{prompt.description}</p>
            )}
            <div className="flex items-center gap-4 text-sm text-gray-500">
              {prompt.category && (
                <span className="flex items-center gap-1">
                  <Tag className="w-4 h-4" />
                  {prompt.category}
                </span>
              )}
              {metrics && (
                <>
                  <span className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {metrics.view_count}
                  </span>
                  {successRate !== null && (
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" />
                      {successRate}% success
                    </span>
                  )}
                </>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(prompt.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
          {prompt.tags && prompt.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 ml-4">
              {prompt.tags.slice(0, 3).map(tag => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer h-full flex flex-col"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-xl font-semibold text-gray-900 flex-1">{prompt.title}</h3>
        {prompt.visibility === 'public' && (
          <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
            Public
          </span>
        )}
      </div>

      {prompt.description && (
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{prompt.description}</p>
      )}

      {prompt.tags && prompt.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {prompt.tags.slice(0, 4).map(tag => (
            <span
              key={tag}
              className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-4">
            {prompt.category && (
              <span className="flex items-center gap-1">
                <Tag className="w-4 h-4" />
                {prompt.category}
              </span>
            )}
            {metrics && (
              <span className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                {metrics.view_count}
              </span>
            )}
          </div>
          {successRate !== null && (
            <span className="flex items-center gap-1 text-green-600 font-medium">
              <TrendingUp className="w-4 h-4" />
              {successRate}%
            </span>
          )}
        </div>
        <div className="mt-2 text-xs text-gray-400">
          {new Date(prompt.created_at).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}
