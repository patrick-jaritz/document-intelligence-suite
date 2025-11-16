/**
 * TypeScript types for PromptForge system
 */

// Prompt types
export interface Prompt {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  category?: string;
  prompt_body: string;
  system_message?: string;
  role?: string;
  task?: string;
  context?: string;
  constraints?: string[];
  examples?: PromptExample[];
  tags?: string[];
  visibility: 'private' | 'team' | 'public';
  current_version_id?: string;
  parent_prompt_id?: string;
  created_at: string;
  updated_at: string;
  archived_at?: string;
  mode?: 'template' | 'rag' | 'custom';
  prompt_metrics?: PromptMetrics;
  prompt_versions?: PromptVersion[];
}

export interface PromptExample {
  input: string;
  output: string;
}

export interface PromptVersion {
  id: string;
  prompt_id: string;
  version_number: number;
  prompt_body: string;
  system_message?: string;
  role?: string;
  task?: string;
  context?: string;
  constraints?: string[];
  examples?: PromptExample[];
  changelog?: string;
  created_by?: string;
  created_at: string;
  is_current: boolean;
}

export interface PromptMetrics {
  prompt_id: string;
  view_count: number;
  like_count: number;
  favorite_count: number;
  share_count: number;
  total_executions: number;
  successful_executions: number;
  avg_rating?: number;
  comment_count: number;
  fork_count: number;
  popularity_score: number;
  effectiveness_score: number;
  last_viewed_at?: string;
  updated_at: string;
}

// Execution types
export interface Execution {
  id: string;
  prompt_id: string;
  prompt_version_id?: string;
  user_id: string;
  input_parameters: Record<string, any>;
  model_provider: string;
  model_name: string;
  temperature?: number;
  max_tokens?: number;
  system_message?: string;
  response_text: string;
  response_stored: boolean;
  tokens_input?: number;
  tokens_output?: number;
  tokens_total?: number;
  latency_ms?: number;
  cost_usd?: number;
  user_rating?: number;
  user_feedback?: string;
  marked_successful?: boolean;
  created_at: string;
  execution_context?: Record<string, any>;
}

export interface ExecutionFeedback {
  rating?: number;
  feedback?: string;
  marked_successful?: boolean;
}

// Prompt Pack types
export interface PromptPack {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  category?: string;
  tags?: string[];
  visibility: 'private' | 'team' | 'public';
  created_at: string;
  updated_at: string;
  pack_prompts?: PackPrompt[];
}

export interface PackPrompt {
  pack_id: string;
  prompt_id: string;
  display_order: number;
  prompt?: Prompt;
}

// API Response types
export interface PromptsResponse {
  prompts: Prompt[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ExecutionsResponse {
  executions: Execution[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ExecutePromptRequest {
  prompt_id: string;
  prompt_version_id?: string;
  parameters: Record<string, any>;
  model_provider: 'openai' | 'anthropic' | 'openrouter';
  model_name: string;
  temperature?: number;
  max_tokens?: number;
  system_message?: string;
  openrouter_api_key?: string;
  openai_api_key?: string;
  anthropic_api_key?: string;
}

export interface ExecutePromptResponse {
  execution_id: string;
  response: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  cost?: number;
  latency_ms: number;
  model: string;
  provider: string;
}

// Placeholder extraction
export interface Placeholder {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'textarea';
  required?: boolean;
  defaultValue?: any;
  options?: string[]; // For select type
}

// Create/Update Prompt types
export interface CreatePromptRequest {
  title: string;
  description?: string;
  prompt_body: string;
  system_message?: string;
  category?: string;
  tags?: string[];
  visibility?: 'private' | 'team' | 'public';
  role?: string;
  task?: string;
  context?: string;
  constraints?: string[];
  examples?: PromptExample[];
}

export interface UpdatePromptRequest extends Partial<CreatePromptRequest> {
  id: string;
}

export interface CreateVersionRequest {
  prompt_body?: string;
  system_message?: string;
  role?: string;
  task?: string;
  context?: string;
  constraints?: string[];
  examples?: PromptExample[];
  changelog?: string;
}
