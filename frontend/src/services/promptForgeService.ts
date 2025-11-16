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
 * Helper to get auth token
 */
async function getAuthToken(): Promise<string> {
  const { supabase } = await import('../lib/supabase');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }
  return session.access_token;
}

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
  const { supabaseUrl } = await import('../lib/supabase');
  const token = await getAuthToken();
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
        'Authorization': `Bearer ${token}`,
        'apikey': token,
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
  const { supabaseUrl } = await import('../lib/supabase');
  const token = await getAuthToken();
  
  const response = await fetch(
    `${supabaseUrl}/functions/v1/prompts/${id}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': token,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch prompt: ${response.statusText}`);
  }

  const data = await response.json() as { prompt: Prompt };
  return data.prompt;
}

/**
 * Create prompt
 */
export async function createPrompt(data: CreatePromptRequest): Promise<Prompt> {
  const { supabaseUrl } = await import('../lib/supabase');
  const token = await getAuthToken();
  
  const response = await fetch(
    `${supabaseUrl}/functions/v1/prompts`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to create prompt: ${response.statusText}`);
  }

  const result = await response.json() as { prompt: Prompt };
  return result.prompt;
}

/**
 * Update prompt
 */
export async function updatePrompt(id: string, data: Partial<CreatePromptRequest>): Promise<Prompt> {
  const { supabaseUrl } = await import('../lib/supabase');
  const token = await getAuthToken();
  
  const response = await fetch(
    `${supabaseUrl}/functions/v1/prompts/${id}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to update prompt: ${response.statusText}`);
  }

  const result = await response.json() as { prompt: Prompt };
  return result.prompt;
}

/**
 * Delete prompt
 */
export async function deletePrompt(id: string): Promise<void> {
  const { supabaseUrl } = await import('../lib/supabase');
  const token = await getAuthToken();
  
  const response = await fetch(
    `${supabaseUrl}/functions/v1/prompts/${id}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': token,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to delete prompt: ${response.statusText}`);
  }
}

/**
 * Create new version
 */
export async function createVersion(promptId: string, data: CreateVersionRequest): Promise<PromptVersion> {
  const { supabaseUrl } = await import('../lib/supabase');
  const token = await getAuthToken();
  
  const response = await fetch(
    `${supabaseUrl}/functions/v1/prompts/${promptId}/versions`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to create version: ${response.statusText}`);
  }

  const result = await response.json() as { version: PromptVersion };
  return result.version;
}

/**
 * Get versions
 */
export async function getVersions(promptId: string): Promise<PromptVersion[]> {
  const { supabaseUrl } = await import('../lib/supabase');
  const token = await getAuthToken();
  
  const response = await fetch(
    `${supabaseUrl}/functions/v1/prompts/${promptId}/versions`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': token,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch versions: ${response.statusText}`);
  }

  const result = await response.json() as { versions: PromptVersion[] };
  return result.versions;
}

/**
 * Execute prompt
 */
export async function executePrompt(data: ExecutePromptRequest): Promise<ExecutePromptResponse> {
  const { supabaseUrl } = await import('../lib/supabase');
  const token = await getAuthToken();
  
  const response = await fetch(
    `${supabaseUrl}/functions/v1/execute-prompt`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to execute prompt: ${errorText}`);
  }

  return response.json() as Promise<ExecutePromptResponse>;
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
  const { supabaseUrl } = await import('../lib/supabase');
  const token = await getAuthToken();
  const queryParams = new URLSearchParams();
  queryParams.set('prompt_id', params.prompt_id);
  if (params.filter) queryParams.set('filter', params.filter);
  if (params.page) queryParams.set('page', params.page.toString());
  if (params.limit) queryParams.set('limit', params.limit.toString());

  const response = await fetch(
    `${supabaseUrl}/functions/v1/executions?${queryParams.toString()}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': token,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch executions: ${response.statusText}`);
  }

  return response.json() as Promise<ExecutionsResponse>;
}

/**
 * Get execution details
 */
export async function getExecution(id: string): Promise<Execution> {
  const { supabaseUrl } = await import('../lib/supabase');
  const token = await getAuthToken();
  
  const response = await fetch(
    `${supabaseUrl}/functions/v1/executions/${id}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': token,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch execution: ${response.statusText}`);
  }

  const result = await response.json() as { execution: Execution };
  return result.execution;
}

/**
 * Update execution feedback
 */
export async function updateExecutionFeedback(
  executionId: string,
  feedback: ExecutionFeedback
): Promise<Execution> {
  const { supabaseUrl } = await import('../lib/supabase');
  const token = await getAuthToken();
  
  const response = await fetch(
    `${supabaseUrl}/functions/v1/executions/${executionId}/feedback`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(feedback),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to update feedback: ${response.statusText}`);
  }

  const result = await response.json() as { execution: Execution };
  return result.execution;
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
