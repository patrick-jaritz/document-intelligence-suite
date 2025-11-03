/**
 * Utilities for formatting structured prompts
 */

import { StructuredPrompt, PromptFormat } from '../types/prompt';

/**
 * Generate preview of prompt in specified format
 */
export function generatePreview(
  prompt: StructuredPrompt,
  format: PromptFormat = 'markdown'
): string {
  switch (format) {
    case 'json':
      return generateJSONPreview(prompt);
    case 'markdown':
      return generateMarkdownPreview(prompt);
    case 'plain':
      return generatePlainPreview(prompt);
    default:
      return generateMarkdownPreview(prompt);
  }
}

/**
 * Generate JSON format preview
 */
function generateJSONPreview(prompt: StructuredPrompt): string {
  return JSON.stringify(prompt, null, 2);
}

/**
 * Generate Markdown format preview
 */
function generateMarkdownPreview(prompt: StructuredPrompt): string {
  const parts: string[] = [];

  if (prompt.title) {
    parts.push(`# ${prompt.title}\n`);
  }

  if (prompt.role) {
    parts.push(`## Role\n${prompt.role}\n`);
  }

  if (prompt.task) {
    parts.push(`## Task\n${prompt.task}\n`);
  }

  if (prompt.context) {
    parts.push(`## Context\n${prompt.context}\n`);
  }

  if (prompt.constraints && prompt.constraints.length > 0) {
    parts.push(`## Constraints\n`);
    prompt.constraints.forEach((constraint, index) => {
      parts.push(`${index + 1}. ${constraint}\n`);
    });
    parts.push('\n');
  }

  if (prompt.examples && prompt.examples.length > 0) {
    parts.push(`## Examples\n`);
    prompt.examples.forEach((example, index) => {
      parts.push(`### Example ${index + 1}\n`);
      parts.push(`**Input:**\n${example.input}\n\n`);
      parts.push(`**Output:**\n${example.output}\n\n`);
    });
  }

  return parts.join('');
}

/**
 * Generate plain text format preview
 */
function generatePlainPreview(prompt: StructuredPrompt): string {
  const parts: string[] = [];

  if (prompt.title) {
    parts.push(`${prompt.title}\n${'='.repeat(prompt.title.length)}\n`);
  }

  if (prompt.role) {
    parts.push(`ROLE:\n${prompt.role}\n\n`);
  }

  if (prompt.task) {
    parts.push(`TASK:\n${prompt.task}\n\n`);
  }

  if (prompt.context) {
    parts.push(`CONTEXT:\n${prompt.context}\n\n`);
  }

  if (prompt.constraints && prompt.constraints.length > 0) {
    parts.push(`CONSTRAINTS:\n`);
    prompt.constraints.forEach((constraint, index) => {
      parts.push(`${index + 1}. ${constraint}\n`);
    });
    parts.push('\n');
  }

  if (prompt.examples && prompt.examples.length > 0) {
    parts.push(`EXAMPLES:\n`);
    prompt.examples.forEach((example, index) => {
      parts.push(`Example ${index + 1}:\n`);
      parts.push(`Input: ${example.input}\n`);
      parts.push(`Output: ${example.output}\n\n`);
    });
  }

  return parts.join('');
}

/**
 * Convert structured prompt to template extraction prompt
 */
export function convertToTemplatePrompt(
  prompt: StructuredPrompt,
  schema?: any
): string {
  const schemaDescription = schema ? JSON.stringify(schema, null, 2) : '';

  let templatePrompt = '';

  if (prompt.role) {
    templatePrompt += `You are ${prompt.role}.\n\n`;
  }

  if (prompt.task) {
    templatePrompt += `${prompt.task}\n\n`;
  }

  if (prompt.context) {
    templatePrompt += `Context: ${prompt.context}\n\n`;
  }

  if (schemaDescription) {
    templatePrompt += `Extract information according to this JSON schema:\n${schemaDescription}\n\n`;
  }

  if (prompt.constraints && prompt.constraints.length > 0) {
    templatePrompt += 'Constraints:\n';
    prompt.constraints.forEach((constraint, index) => {
      templatePrompt += `${index + 1}. ${constraint}\n`;
    });
    templatePrompt += '\n';
  }

  if (prompt.examples && prompt.examples.length > 0) {
    templatePrompt += 'Examples:\n';
    prompt.examples.forEach((example) => {
      templatePrompt += `Input: ${example.input}\nOutput: ${example.output}\n\n`;
    });
  }

  templatePrompt += 'Return the extracted information as a valid JSON object matching the schema above.';

  return templatePrompt;
}

/**
 * Convert structured prompt to RAG query prompt
 */
export function convertToRAGPrompt(
  prompt: StructuredPrompt,
  question: string,
  context: string
): string {
  let ragPrompt = '';

  if (prompt.role) {
    ragPrompt += `You are ${prompt.role}.\n\n`;
  }

  if (prompt.context) {
    ragPrompt += `Context: ${prompt.context}\n\n`;
  }

  ragPrompt += `Document Context:\n${context}\n\n`;

  if (prompt.constraints && prompt.constraints.length > 0) {
    ragPrompt += 'Answer Guidelines:\n';
    prompt.constraints.forEach((constraint, index) => {
      ragPrompt += `${index + 1}. ${constraint}\n`;
    });
    ragPrompt += '\n';
  }

  if (prompt.examples && prompt.examples.length > 0) {
    ragPrompt += 'Example Q&A:\n';
    prompt.examples.forEach((example) => {
      ragPrompt += `Q: ${example.input}\nA: ${example.output}\n\n`;
    });
  }

  ragPrompt += `Question: ${question}\n\n`;
  ragPrompt += 'Provide a clear, accurate answer based on the document context.';

  return ragPrompt;
}

/**
 * Estimate token count (rough approximation)
 */
export function estimateTokens(text: string): number {
  // Rough approximation: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}

