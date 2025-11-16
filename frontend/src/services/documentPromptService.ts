/**
 * Service for creating prompts from uploaded documents
 */

import { supabase } from '../lib/supabase';
import { createPrompt } from './promptForgeService';
import { PromptFormData } from '../types/promptforge';

export interface DocumentContent {
  id: string;
  title: string;
  content: string;
  type?: string;
  metadata?: Record<string, any>;
}

/**
 * Suggest prompts based on document content
 */
export async function suggestPromptsFromDocument(
  document: DocumentContent
): Promise<Array<{ title: string; description: string; promptBody: string }>> {
  const suggestions: Array<{ title: string; description: string; promptBody: string }> = [];

  // Analyze document content and suggest prompts
  const contentPreview = document.content.substring(0, 1000);
  const words = contentPreview.toLowerCase().split(/\s+/);
  
  // Common prompt patterns based on content
  if (words.some(w => ['question', 'answer', 'q&a', 'faq'].includes(w))) {
    suggestions.push({
      title: `Q&A Generator from ${document.title}`,
      description: 'Generate questions and answers based on the document content',
      promptBody: `Role: You are an expert at extracting and generating questions and answers from documents.

Task: Based on the following document content, generate relevant questions and comprehensive answers.

Context:
${contentPreview}

Constraints:
- Questions should be clear and specific
- Answers should be accurate and based on the document
- Include 5-10 question-answer pairs

Examples:
Q: What is the main topic?
A: [Answer from document]

Generate questions and answers:`,
    });
  }

  if (words.some(w => ['summary', 'overview', 'abstract', 'introduction'].includes(w))) {
    suggestions.push({
      title: `Summarize ${document.title}`,
      description: 'Create summaries of the document content',
      promptBody: `Role: You are an expert at creating concise summaries.

Task: Summarize the following document content in a clear and structured way.

Context:
${contentPreview}

Constraints:
- Keep summaries concise but comprehensive
- Maintain key information
- Use clear structure

Examples:
Summary:
[Your summary here]

Summarize this document:`,
    });
  }

  // Generic extraction prompt
  suggestions.push({
    title: `Extract Information from ${document.title}`,
    description: 'Extract key information and insights from the document',
    promptBody: `Role: You are an expert at extracting and organizing information from documents.

Task: Extract key information, insights, and important points from the following document.

Context:
${contentPreview}

Constraints:
- Focus on the most important information
- Organize information logically
- Be accurate and factual

Examples:
Key Points:
1. [Point 1]
2. [Point 2]
...

Extract information: {{topic:text}}`,
  });

  // Analysis prompt
  suggestions.push({
    title: `Analyze ${document.title}`,
    description: 'Analyze the document and provide insights',
    promptBody: `Role: You are an expert analyst.

Task: Analyze the following document and provide insights, key findings, and recommendations.

Context:
${contentPreview}

Constraints:
- Provide actionable insights
- Support conclusions with evidence from the document
- Be objective and thorough

Examples:
Analysis:
[Your analysis here]

Analyze this document focusing on: {{focus_area:text}}`,
  });

  return suggestions;
}

/**
 * Create a prompt from document content
 */
export async function createPromptFromDocument(
  document: DocumentContent,
  promptData: {
    title: string;
    description: string;
    promptBody: string;
    tags?: string[];
    category?: string;
  }
): Promise<string | null> {
  try {
    // Enhance prompt body with document context
    const enhancedPromptBody = `${promptData.promptBody}

Document Reference:
Title: ${document.title}
Type: ${document.type || 'Document'}
Content Preview: ${document.content.substring(0, 500)}...`;

    const formData: PromptFormData = {
      title: promptData.title,
      description: promptData.description,
      prompt_body: enhancedPromptBody,
      tags: promptData.tags || ['document-based', document.type || 'general'],
      category: promptData.category || 'Document Processing',
      visibility: 'private',
    };

    const prompt = await createPrompt(formData);
    return prompt?.id || null;
  } catch (error) {
    console.error('Failed to create prompt from document:', error);
    return null;
  }
}

/**
 * Get documents that can be used for prompts
 */
export async function getAvailableDocuments(): Promise<DocumentContent[]> {
  try {
    // Query documents table (adjust table name as needed)
    const { data, error } = await supabase
      .from('documents')
      .select('id, title, content, type, metadata')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching documents:', error);
      return [];
    }

    return (data || []).map((doc: any) => ({
      id: doc.id,
      title: doc.title || doc.filename || 'Untitled Document',
      content: doc.content || doc.text || '',
      type: doc.type || doc.file_type || 'document',
      metadata: doc.metadata || {},
    }));
  } catch (error) {
    console.error('Failed to fetch documents:', error);
    return [];
  }
}
