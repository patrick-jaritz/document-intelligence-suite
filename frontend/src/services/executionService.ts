/**
 * Service for managing prompt executions
 */

import { supabase } from '../lib/supabase';
import { Execution, ExecutionRequest, UserFeedback, PaginatedResponse } from '../types/promptforge';

/**
 * Execute a prompt with given inputs
 */
export async function executePrompt(
  request: ExecutionRequest
): Promise<Execution | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const startTime = Date.now();

    // Get the prompt to extract the prompt body
    const { data: prompt } = await supabase
      .from('prompts')
      .select('prompt_body, current_version_id')
      .eq('id', request.prompt_id)
      .single();

    if (!prompt) {
      throw new Error('Prompt not found');
    }

    // Get the version to use
    const versionId = request.prompt_version_id || prompt.current_version_id;
    let promptBody = prompt.prompt_body;

    if (versionId) {
      const { data: version } = await supabase
        .from('prompt_versions')
        .select('prompt_body')
        .eq('id', versionId)
        .single();

      if (version) {
        promptBody = version.prompt_body;
      }
    }

    // Replace placeholders in prompt body
    let finalPrompt = promptBody;
    for (const [key, value] of Object.entries(request.inputs)) {
      const placeholder = `{{${key}}}`;
      finalPrompt = finalPrompt.replace(new RegExp(placeholder, 'g'), String(value));
    }

    // Call LLM API (this would integrate with your LLM provider)
    // For now, we'll create a placeholder execution record
    // TODO: Integrate with actual LLM API (OpenAI, Anthropic, etc.)
    const response = 'LLM response placeholder - integrate with actual API';
    const latency = Date.now() - startTime;

    // Create execution record
    const { data, error } = await supabase
      .from('executions')
      .insert({
        prompt_id: request.prompt_id,
        prompt_version_id: versionId,
        user_id: user.id,
        inputs: request.inputs,
        model: request.model || null,
        temperature: request.temperature || null,
        system_message: request.system_message || null,
        response: response,
        latency_ms: latency,
        tokens_in: null, // TODO: Calculate from actual API response
        tokens_out: null, // TODO: Calculate from actual API response
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating execution:', error);
      throw error;
    }

    return data as Execution;
  } catch (error) {
    console.error('Failed to execute prompt:', error);
    return null;
  }
}

/**
 * Get executions for a prompt
 */
export async function getPromptExecutions(
  promptId: string,
  page: number = 1,
  pageSize: number = 20
): Promise<PaginatedResponse<Execution>> {
  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await supabase
      .from('executions')
      .select('*', { count: 'exact' })
      .eq('prompt_id', promptId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching executions:', error);
      throw error;
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / pageSize);

    return {
      data: (data || []) as Execution[],
      total,
      page,
      page_size: pageSize,
      total_pages: totalPages,
    };
  } catch (error) {
    console.error('Failed to fetch executions:', error);
    return {
      data: [],
      total: 0,
      page: 1,
      page_size: pageSize,
      total_pages: 0,
    };
  }
}

/**
 * Get a single execution by ID
 */
export async function getExecution(executionId: string): Promise<Execution | null> {
  try {
    const { data, error } = await supabase
      .from('executions')
      .select('*')
      .eq('id', executionId)
      .single();

    if (error) {
      console.error('Error fetching execution:', error);
      throw error;
    }

    return data as Execution;
  } catch (error) {
    console.error('Failed to fetch execution:', error);
    return null;
  }
}

/**
 * Update execution feedback
 */
export async function updateExecutionFeedback(
  executionId: string,
  feedback: UserFeedback,
  rating?: number
): Promise<boolean> {
  try {
    const updateData: any = {
      user_feedback: feedback,
    };

    if (rating !== undefined) {
      updateData.user_rating = rating;
    }

    const { error } = await supabase
      .from('executions')
      .update(updateData)
      .eq('id', executionId);

    if (error) {
      console.error('Error updating execution feedback:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Failed to update execution feedback:', error);
    return false;
  }
}

/**
 * Get user's recent executions
 */
export async function getUserExecutions(
  limit: number = 10
): Promise<Execution[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return [];
    }

    const { data, error } = await supabase
      .from('executions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching user executions:', error);
      return [];
    }

    return (data || []) as Execution[];
  } catch (error) {
    console.error('Failed to fetch user executions:', error);
    return [];
  }
}
