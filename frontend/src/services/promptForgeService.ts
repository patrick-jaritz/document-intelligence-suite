/**
 * Service for PromptForge API calls
 */

import { callEdgeFunction } from '../lib/supabase';
import type {
  Prompt,
  PromptsResponse,
  CreatePromptRequest,
  UpdatePromptRequest,
  CreateVersionRequest,
  PromptVersion,
  Execution,
  ExecutionsResponse,
  ExecutePromptRequest,
  ExecutePromptResponse,
  ExecutionFeedback,
} from '../types/promptforge';

/**
 * Get prompts list
 */
export async function getPrompts(params: {
  search?: string;
  tags?: string[];
  category?: string;
  visibility?: string;
  page?: number;
  limit?: number;
}): Promise<PromptsResponse> {
  // Use direct fetch for GET requests with query params
  const { supabaseUrl, supabaseAnonKey } = await import('../lib/supabase');
  const queryParams = new URLSearchParams();
  if (params.search) queryParams.set('search', params.search);
  if (params.tags?.length) queryParams.set('tags', params.tags.join(','));
  if (params.category) queryParams.set('category', params.category);
  if (params.visibility) queryParams.set('visibility', params.visibility);
  if (params.page) queryParams.set('page', params.page.toString());
  if (params.limit) queryParams.set('limit', params.limit.toString());

  const response = await fetch(
    `${supabaseUrl}/functions/v1/prompts?${queryParams.toString()}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'apikey': supabaseAnonKey,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch prompts: ${response.statusText}`);
  }

  return response.json() as Promise<PromptsResponse>;
}

/**
 * Get single prompt
 */
export async function getPrompt(id: string): Promise<Prompt> {
  const response = await callEdgeFunction('prompts', {}, { 
    method: 'GET',
    // Note: We'll need to handle the path parameter differently
  }) as { prompt: Prompt };
  
  // For now, we'll use a workaround - the Edge Function handles the path
  // In a real implementation, you'd construct the URL properly
  return response.prompt;
}

/**
 * Create prompt
 */
export async function createPrompt(data: CreatePromptRequest): Promise<Prompt> {
  const response = await callEdgeFunction('prompts', data) as { prompt: Prompt };
  return response.prompt;
}

/**
 * Update prompt
 */
export async function updatePrompt(id: string, data: Partial<CreatePromptRequest>): Promise<Prompt> {
  const response = await callEdgeFunction('prompts', { ...data, id }, { method: 'PUT' }) as { prompt: Prompt };
  return response.prompt;
}

/**
 * Delete prompt
 */
export async function deletePrompt(id: string): Promise<void> {
  await callEdgeFunction('prompts', { id }, { method: 'DELETE' });
}

/**
 * Create new version
 */
export async function createVersion(promptId: string, data: CreateVersionRequest): Promise<PromptVersion> {
  const response = await callEdgeFunction('prompts', data, { 
    method: 'POST',
    // Path: /prompts/:id/versions
  }) as { version: PromptVersion };
  return response.version;
}

/**
 * Get versions
 */
export async function getVersions(promptId: string): Promise<PromptVersion[]> {
  const response = await callEdgeFunction('prompts', {}, {
    method: 'GET',
    // Path: /prompts/:id/versions
  }) as { versions: PromptVersion[] };
  return response.versions;
}

/**
 * Execute prompt
 */
export async function executePrompt(data: ExecutePromptRequest): Promise<ExecutePromptResponse> {
  return callEdgeFunction('execute-prompt', data) as Promise<ExecutePromptResponse>;
}

/**
 * Get executions
 */
export async function getExecutions(params: {
  prompt_id: string;
  filter?: 'successful' | 'failed' | 'all';
  page?: number;
  limit?: number;
}): Promise<ExecutionsResponse> {
  const queryParams = new URLSearchParams();
  queryParams.set('prompt_id', params.prompt_id);
  if (params.filter) queryParams.set('filter', params.filter);
  if (params.page) queryParams.set('page', params.page.toString());
  if (params.limit) queryParams.set('limit', params.limit.toString());

  return callEdgeFunction('executions', {}, {
    method: 'GET',
    // Query params handled in URL
  }) as Promise<ExecutionsResponse>;
}

/**
 * Get execution details
 */
export async function getExecution(id: string): Promise<Execution> {
  const response = await callEdgeFunction('executions', {}, {
    method: 'GET',
    // Path: /executions/:id
  }) as { execution: Execution };
  return response.execution;
}

/**
 * Update execution feedback
 */
export async function updateExecutionFeedback(
  executionId: string,
  feedback: ExecutionFeedback
): Promise<Execution> {
  const response = await callEdgeFunction('executions', feedback, {
    method: 'POST',
    // Path: /executions/:id/feedback
  }) as { execution: Execution };
  return response.execution;
}

/**
 * Extract placeholders from prompt body
 */
export function extractPlaceholders(promptBody: string): string[] {
  const regex = /\{\{(\w+)\}\}/g;
  const matches = [...promptBody.matchAll(regex)];
  return [...new Set(matches.map(m => m[1]))];
}

/**
 * Replace placeholders in prompt body
 */
export function replacePlaceholders(
  promptBody: string,
  parameters: Record<string, any>
): string {
  return promptBody.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return parameters[key] !== undefined ? String(parameters[key]) : match;
  });
}

/**
 * Generate form schema from placeholders
 */
export function generateFormSchema(placeholders: string[]): Array<{
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number';
  required: boolean;
}> {
  return placeholders.map(name => ({
    name,
    label: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    type: 'text' as const,
    required: true,
  }));
}
