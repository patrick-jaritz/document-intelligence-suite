/**
 * Type definitions for Structured Prompt Builder
 */

export interface StructuredPrompt {
  title: string;
  role: string;
  task: string;
  context: string;
  constraints: string[];
  examples: PromptExample[];
}

export interface PromptExample {
  input: string;
  output: string;
}

export type PromptFormat = 'json' | 'markdown' | 'plain';

export interface PromptTemplate {
  id?: string;
  name: string;
  description?: string;
  prompt: StructuredPrompt;
  mode: 'template' | 'rag' | 'custom';
  associated_template_id?: string;
  created_at?: string;
  updated_at?: string;
  usage_count?: number;
  is_public?: boolean;
}

export interface PromptBuilderProps {
  onPromptExport?: (prompt: StructuredPrompt) => void;
  initialPrompt?: StructuredPrompt;
  mode?: 'template' | 'rag' | 'custom';
  showTestPanel?: boolean;
}

