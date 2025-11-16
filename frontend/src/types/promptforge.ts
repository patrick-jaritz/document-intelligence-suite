/**
 * Type definitions for PromptForge system
 * Comprehensive types for prompts, versions, executions, packs, and workspaces
 */

import { StructuredPrompt } from './prompt';

// ============================================================================
// WORKSPACE TYPES
// ============================================================================

export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  joined_at: string;
}

// ============================================================================
// PROMPT TYPES
// ============================================================================

export type PromptVisibility = 'private' | 'team' | 'public';

export interface Prompt {
  id: string;
  title: string;
  description: string | null;
  prompt_body: string;
  tags: string[];
  category: string | null;
  owner_id: string;
  workspace_id: string | null;
  visibility: PromptVisibility;
  current_version_id: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface PromptVersion {
  id: string;
  prompt_id: string;
  version_number: number;
  prompt_body: string;
  changelog: string | null;
  created_by: string | null;
  created_at: string;
  is_current: boolean;
}

export interface PromptWithVersion extends Prompt {
  current_version: PromptVersion | null;
  versions?: PromptVersion[];
}

// ============================================================================
// EXECUTION TYPES
// ============================================================================

export type UserFeedback = 'success' | 'fail' | 'neutral';

export interface Execution {
  id: string;
  prompt_id: string;
  prompt_version_id: string | null;
  user_id: string;
  inputs: Record<string, any>;
  model: string | null;
  temperature: number | null;
  system_message: string | null;
  response: string | null;
  tokens_in: number | null;
  tokens_out: number | null;
  latency_ms: number | null;
  user_feedback: UserFeedback | null;
  user_rating: number | null;
  created_at: string;
}

export interface ExecutionInput {
  [key: string]: string | number | boolean;
}

export interface ExecutionRequest {
  prompt_id: string;
  prompt_version_id?: string;
  inputs: ExecutionInput;
  model?: string;
  temperature?: number;
  system_message?: string;
}

// ============================================================================
// PACK TYPES
// ============================================================================

export interface Pack {
  id: string;
  title: string;
  description: string | null;
  tags: string[];
  category: string | null;
  owner_id: string;
  workspace_id: string | null;
  visibility: PromptVisibility;
  created_at: string;
  updated_at: string;
}

export interface PackPrompt {
  pack_id: string;
  prompt_id: string;
  order_index: number;
}

export interface PackWithPrompts extends Pack {
  prompts: (Prompt & { order_index: number })[];
}

export interface PackExport {
  version: string;
  pack: {
    title: string;
    description: string | null;
    tags: string[];
    category: string | null;
  };
  prompts: Array<{
    title: string;
    description: string | null;
    prompt_body: string;
    tags: string[];
    category: string | null;
    order_index: number;
  }>;
}

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

export interface PromptAnalytics {
  prompt_id: string;
  total_runs: number;
  success_count: number;
  fail_count: number;
  neutral_count: number;
  success_rate: number;
  average_rating: number | null;
  total_tokens_in: number;
  total_tokens_out: number;
  average_latency_ms: number | null;
  runs_by_date: Array<{
    date: string;
    count: number;
    success_count: number;
  }>;
  model_usage: Array<{
    model: string;
    count: number;
  }>;
}

export interface WorkspaceAnalytics {
  total_prompts: number;
  total_executions: number;
  total_packs: number;
  success_rate: number;
  average_rating: number | null;
  top_prompts: Array<{
    prompt_id: string;
    title: string;
    runs: number;
    success_rate: number;
  }>;
  runs_over_time: Array<{
    date: string;
    count: number;
  }>;
}

// ============================================================================
// FILTER & SEARCH TYPES
// ============================================================================

export interface PromptFilters {
  tags?: string[];
  category?: string;
  visibility?: PromptVisibility[];
  owner_id?: string;
  workspace_id?: string;
  archived?: boolean;
  search?: string;
}

export interface PromptSortOption {
  field: 'created_at' | 'updated_at' | 'title' | 'usage_count' | 'success_rate';
  direction: 'asc' | 'desc';
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

// ============================================================================
// FORM TYPES
// ============================================================================

export interface PromptFormData {
  title: string;
  description: string;
  prompt_body: string;
  tags: string[];
  category: string;
  visibility: PromptVisibility;
  workspace_id?: string;
}

export interface VersionFormData {
  prompt_body: string;
  changelog: string;
}

export interface PackFormData {
  title: string;
  description: string;
  tags: string[];
  category: string;
  visibility: PromptVisibility;
  workspace_id?: string;
  prompt_ids: string[];
}

// ============================================================================
// PROMPT APP TYPES
// ============================================================================

export interface PromptApp {
  id: string;
  prompt_id: string;
  slug: string;
  title: string;
  description: string | null;
  is_active: boolean;
  allow_anonymous: boolean;
  require_auth: boolean;
  max_executions_per_day: number;
  max_executions_total: number | null;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
}

export interface AppExecution {
  id: string;
  app_id: string;
  prompt_id: string;
  user_id: string | null;
  inputs: Record<string, any>;
  output: string | null;
  model: string | null;
  tokens_in: number | null;
  tokens_out: number | null;
  latency_ms: number | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AppAnalytics {
  app_id: string;
  date: string;
  views: number;
  executions: number;
  unique_users: number;
}

export interface AppFormData {
  title: string;
  description: string;
  allow_anonymous: boolean;
  require_auth: boolean;
  max_executions_per_day: number;
  max_executions_total: number | null;
  expires_at: string | null;
}

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'email' | 'url' | 'select' | 'checkbox';
  placeholder?: string;
  required: boolean;
  options?: string[]; // For select type
  default?: any;
  description?: string;
}
