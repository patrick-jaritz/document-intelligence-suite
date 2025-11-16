/**
 * Analytics Dashboard Page
 * Shows performance metrics and usage statistics
 */

import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Zap, Star, FileText, Activity } from 'lucide-react';
import { WorkspaceAnalytics, PromptAnalytics } from '../types/promptforge';
import { getWorkspaceAnalytics, getPromptAnalytics } from '../services/analyticsService';
import { getPrompts } from '../services/promptForgeService';

export function Analytics() {
  const [workspaceStats, setWorkspaceStats] = useState<WorkspaceAnalytics | null>(null);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [promptStats, setPromptStats] = useState<PromptAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  useEffect(() => {
    if (selectedPromptId) {
      loadPromptAnalytics();
    }
  }, [selectedPromptId]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const stats = await getWorkspaceAnalytics();
      setWorkspaceStats(stats);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPromptAnalytics = async () => {
    if (!selectedPromptId) return;
    try {
      const stats = await getPromptAnalytics(selectedPromptId);
      setPromptStats(stats);
    } catch (error) {
      console.error('Failed to load prompt analytics:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!workspaceStats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
            <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Data Yet</h3>
            <p className="text-gray-600">
              Start creating and executing prompts to see analytics
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <BarChart3 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="text-gray-600 mt-1">Performance metrics and usage statistics</p>
            </div>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Total Prompts</span>
              <FileText className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{workspaceStats.total_prompts}</div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Total Executions</span>
              <Zap className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{workspaceStats.total_executions}</div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Success Rate</span>
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {(workspaceStats.success_rate * 100).toFixed(1)}%
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Avg Rating</span>
              <Star className="w-5 h-5 text-yellow-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {workspaceStats.average_rating
                ? workspaceStats.average_rating.toFixed(1)
                : 'N/A'}
            </div>
          </div>
        </div>

        {/* Top Prompts */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Top Performing Prompts</h2>
          {workspaceStats.top_prompts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No executions yet</p>
          ) : (
            <div className="space-y-3">
              {workspaceStats.top_prompts.map((prompt, index) => (
                <div
                  key={prompt.prompt_id}
                  onClick={() => setSelectedPromptId(prompt.prompt_id)}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    selectedPromptId === prompt.prompt_id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-gray-500">#{index + 1}</span>
                      <span className="font-semibold text-gray-900">{prompt.title}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-600">{prompt.runs} runs</span>
                      <span className="text-green-600 font-semibold">
                        {(prompt.success_rate * 100).toFixed(0)}% success
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Prompt Details */}
        {selectedPromptId && promptStats && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Prompt Details</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div>
                <div className="text-sm text-gray-600">Total Runs</div>
                <div className="text-2xl font-bold">{promptStats.total_runs}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Success Rate</div>
                <div className="text-2xl font-bold text-green-600">
                  {(promptStats.success_rate * 100).toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Avg Rating</div>
                <div className="text-2xl font-bold">
                  {promptStats.average_rating?.toFixed(1) || 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Avg Latency</div>
                <div className="text-2xl font-bold">
                  {promptStats.average_latency_ms
                    ? `${Math.round(promptStats.average_latency_ms)}ms`
                    : 'N/A'}
                </div>
              </div>
            </div>

            {/* Model Usage */}
            {promptStats.model_usage.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Model Usage</h3>
                <div className="space-y-2">
                  {promptStats.model_usage.map((usage) => (
                    <div key={usage.model} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{usage.model}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-indigo-600 h-2 rounded-full"
                            style={{
                              width: `${(usage.count / promptStats.total_runs) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-semibold w-12 text-right">
                          {usage.count}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Runs Over Time */}
            {promptStats.runs_by_date.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Runs Over Time</h3>
                <div className="space-y-1">
                  {promptStats.runs_by_date.slice(-7).map((day) => (
                    <div key={day.date} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">
                        {new Date(day.date).toLocaleDateString()}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{
                              width: `${(day.count / Math.max(...promptStats.runs_by_date.map((d) => d.count))) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="w-16 text-right">
                          {day.count} ({day.success_count} ✓)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Runs Over Time Chart */}
        {workspaceStats.runs_over_time.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Usage Over Time</h2>
            <div className="space-y-2">
              {workspaceStats.runs_over_time.slice(-14).map((day) => (
                <div key={day.date} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 w-32">
                    {new Date(day.date).toLocaleDateString()}
                  </span>
                  <div className="flex-1 mx-4">
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-indigo-600 h-3 rounded-full"
                        style={{
                          width: `${
                            (day.count /
                              Math.max(...workspaceStats.runs_over_time.map((d) => d.count))) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-semibold w-12 text-right">{day.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
