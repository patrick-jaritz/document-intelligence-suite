/**
 * Service for prompt analytics and performance metrics
 */

import { supabase } from '../lib/supabase';
import { PromptAnalytics, WorkspaceAnalytics } from '../types/promptforge';

/**
 * Get analytics for a specific prompt
 */
export async function getPromptAnalytics(promptId: string): Promise<PromptAnalytics | null> {
  try {
    // Get execution statistics
    const { data: executions, error } = await supabase
      .from('executions')
      .select('*')
      .eq('prompt_id', promptId);

    if (error) {
      console.error('Error fetching executions:', error);
      throw error;
    }

    if (!executions || executions.length === 0) {
      return {
        prompt_id: promptId,
        total_runs: 0,
        success_count: 0,
        fail_count: 0,
        neutral_count: 0,
        success_rate: 0,
        average_rating: null,
        total_tokens_in: 0,
        total_tokens_out: 0,
        average_latency_ms: null,
        runs_by_date: [],
        model_usage: [],
      };
    }

    const totalRuns = executions.length;
    const successCount = executions.filter((e) => e.user_feedback === 'success').length;
    const failCount = executions.filter((e) => e.user_feedback === 'fail').length;
    const neutralCount = executions.filter((e) => e.user_feedback === 'neutral').length;
    const successRate = totalRuns > 0 ? successCount / totalRuns : 0;

    const ratings = executions
      .map((e) => e.user_rating)
      .filter((r): r is number => r !== null && r !== undefined);
    const averageRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
      : null;

    const totalTokensIn = executions.reduce((sum, e) => sum + (e.tokens_in || 0), 0);
    const totalTokensOut = executions.reduce((sum, e) => sum + (e.tokens_out || 0), 0);

    const latencies = executions
      .map((e) => e.latency_ms)
      .filter((l): l is number => l !== null && l !== undefined);
    const averageLatency = latencies.length > 0
      ? latencies.reduce((sum, l) => sum + l, 0) / latencies.length
      : null;

    // Group by date
    const runsByDateMap = new Map<string, { count: number; success_count: number }>();
    executions.forEach((execution) => {
      const date = new Date(execution.created_at).toISOString().split('T')[0];
      const current = runsByDateMap.get(date) || { count: 0, success_count: 0 };
      current.count++;
      if (execution.user_feedback === 'success') {
        current.success_count++;
      }
      runsByDateMap.set(date, current);
    });

    const runsByDate = Array.from(runsByDateMap.entries())
      .map(([date, data]) => ({
        date,
        count: data.count,
        success_count: data.success_count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Model usage
    const modelUsageMap = new Map<string, number>();
    executions.forEach((execution) => {
      const model = execution.model || 'unknown';
      modelUsageMap.set(model, (modelUsageMap.get(model) || 0) + 1);
    });

    const modelUsage = Array.from(modelUsageMap.entries())
      .map(([model, count]) => ({ model, count }))
      .sort((a, b) => b.count - a.count);

    return {
      prompt_id: promptId,
      total_runs: totalRuns,
      success_count: successCount,
      fail_count: failCount,
      neutral_count: neutralCount,
      success_rate: successRate,
      average_rating: averageRating,
      total_tokens_in: totalTokensIn,
      total_tokens_out: totalTokensOut,
      average_latency_ms: averageLatency,
      runs_by_date: runsByDate,
      model_usage: modelUsage,
    };
  } catch (error) {
    console.error('Failed to get prompt analytics:', error);
    return null;
  }
}

/**
 * Get workspace-level analytics
 */
export async function getWorkspaceAnalytics(): Promise<WorkspaceAnalytics | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return null;
    }

    // Get user's prompts
    const { data: prompts } = await supabase
      .from('prompts')
      .select('id')
      .eq('owner_id', user.id)
      .is('archived_at', null);

    const promptIds = (prompts || []).map((p) => p.id);

    if (promptIds.length === 0) {
      return {
        total_prompts: 0,
        total_executions: 0,
        total_packs: 0,
        success_rate: 0,
        average_rating: null,
        top_prompts: [],
        runs_over_time: [],
      };
    }

    // Get all executions for user's prompts
    const { data: executions } = await supabase
      .from('executions')
      .select('*')
      .in('prompt_id', promptIds);

    const totalExecutions = executions?.length || 0;

    // Get packs
    const { data: packs } = await supabase
      .from('packs')
      .select('id')
      .eq('owner_id', user.id);

    const totalPacks = packs?.length || 0;

    // Calculate success rate
    const successCount = executions?.filter((e) => e.user_feedback === 'success').length || 0;
    const successRate = totalExecutions > 0 ? successCount / totalExecutions : 0;

    // Average rating
    const ratings = executions
      ?.map((e) => e.user_rating)
      .filter((r): r is number => r !== null && r !== undefined) || [];
    const averageRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
      : null;

    // Top prompts by runs
    const promptRunCounts = new Map<string, { title: string; runs: number; success_count: number }>();
    executions?.forEach((execution) => {
      const current = promptRunCounts.get(execution.prompt_id) || {
        title: 'Unknown',
        runs: 0,
        success_count: 0,
      };
      current.runs++;
      if (execution.user_feedback === 'success') {
        current.success_count++;
      }
      promptRunCounts.set(execution.prompt_id, current);
    });

    // Get prompt titles
    const promptTitles = new Map<string, string>();
    (prompts || []).forEach((p) => {
      promptTitles.set(p.id, 'Loading...');
    });

    // Fetch titles
    const { data: promptData } = await supabase
      .from('prompts')
      .select('id, title')
      .in('id', Array.from(promptRunCounts.keys()));

    promptData?.forEach((p) => {
      promptTitles.set(p.id, p.title);
    });

    const topPrompts = Array.from(promptRunCounts.entries())
      .map(([promptId, data]) => ({
        prompt_id: promptId,
        title: promptTitles.get(promptId) || 'Unknown',
        runs: data.runs,
        success_rate: data.runs > 0 ? data.success_count / data.runs : 0,
      }))
      .sort((a, b) => b.runs - a.runs)
      .slice(0, 10);

    // Runs over time
    const runsOverTimeMap = new Map<string, number>();
    executions?.forEach((execution) => {
      const date = new Date(execution.created_at).toISOString().split('T')[0];
      runsOverTimeMap.set(date, (runsOverTimeMap.get(date) || 0) + 1);
    });

    const runsOverTime = Array.from(runsOverTimeMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      total_prompts: promptIds.length,
      total_executions: totalExecutions,
      total_packs: totalPacks,
      success_rate: successRate,
      average_rating: averageRating,
      top_prompts: topPrompts,
      runs_over_time: runsOverTime,
    };
  } catch (error) {
    console.error('Failed to get workspace analytics:', error);
    return null;
  }
}
