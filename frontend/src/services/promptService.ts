/**
 * Service for managing prompt templates
 */

import { supabase } from '../lib/supabase';
import { StructuredPrompt, PromptTemplate } from '../types/prompt';
import { generatePreview } from '../utils/promptFormatters';

/**
 * Save a prompt template to the database
 */
export async function savePromptTemplate(
  prompt: StructuredPrompt,
  metadata: {
    name: string;
    description?: string;
    mode?: 'template' | 'rag' | 'custom';
    associated_template_id?: string;
    is_public?: boolean;
  }
): Promise<PromptTemplate | null> {
  try {
    // Generate previews
    const jsonPreview = generatePreview(prompt, 'json');
    const markdownPreview = generatePreview(prompt, 'markdown');
    const plainTextPreview = generatePreview(prompt, 'plain');

    const { data, error } = await supabase
      .from('prompt_templates')
      .insert({
        name: metadata.name,
        description: metadata.description || null,
        title: prompt.title,
        role: prompt.role,
        task: prompt.task,
        context: prompt.context,
        constraints: prompt.constraints || [],
        examples: prompt.examples || [],
        mode: metadata.mode || 'custom',
        associated_template_id: metadata.associated_template_id || null,
        is_public: metadata.is_public || false,
        json_preview: jsonPreview,
        markdown_preview: markdownPreview,
        plain_text_preview: plainTextPreview,
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving prompt template:', error);
      throw error;
    }

    return data as PromptTemplate;
  } catch (error) {
    console.error('Failed to save prompt template:', error);
    return null;
  }
}

/**
 * Get prompt templates for current user
 */
export async function getPromptTemplates(
  mode?: 'template' | 'rag' | 'custom',
  includePublic: boolean = true
): Promise<PromptTemplate[]> {
  try {
    let query = supabase.from('prompt_templates').select('*');

    if (mode) {
      query = query.eq('mode', mode);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching prompt templates:', error);
      throw error;
    }

    return (data || []) as PromptTemplate[];
  } catch (error) {
    console.error('Failed to fetch prompt templates:', error);
    return [];
  }
}

/**
 * Get a single prompt template by ID
 */
export async function getPromptTemplate(
  id: string
): Promise<PromptTemplate | null> {
  try {
    const { data, error } = await supabase
      .from('prompt_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching prompt template:', error);
      throw error;
    }

    return data as PromptTemplate;
  } catch (error) {
    console.error('Failed to fetch prompt template:', error);
    return null;
  }
}

/**
 * Update a prompt template
 */
export async function updatePromptTemplate(
  id: string,
  prompt: StructuredPrompt,
  metadata?: {
    name?: string;
    description?: string;
    is_public?: boolean;
  }
): Promise<PromptTemplate | null> {
  try {
    // Generate previews
    const jsonPreview = generatePreview(prompt, 'json');
    const markdownPreview = generatePreview(prompt, 'markdown');
    const plainTextPreview = generatePreview(prompt, 'plain');

    const updateData: any = {
      title: prompt.title,
      role: prompt.role,
      task: prompt.task,
      context: prompt.context,
      constraints: prompt.constraints || [],
      examples: prompt.examples || [],
      json_preview: jsonPreview,
      markdown_preview: markdownPreview,
      plain_text_preview: plainTextPreview,
    };

    if (metadata?.name) updateData.name = metadata.name;
    if (metadata?.description !== undefined)
      updateData.description = metadata.description;
    if (metadata?.is_public !== undefined)
      updateData.is_public = metadata.is_public;

    const { data, error } = await supabase
      .from('prompt_templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating prompt template:', error);
      throw error;
    }

    return data as PromptTemplate;
  } catch (error) {
    console.error('Failed to update prompt template:', error);
    return null;
  }
}

/**
 * Delete a prompt template
 */
export async function deletePromptTemplate(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('prompt_templates')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting prompt template:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Failed to delete prompt template:', error);
    return false;
  }
}

/**
 * Convert prompt template to StructuredPrompt
 */
export function templateToPrompt(template: PromptTemplate): StructuredPrompt {
  return {
    title: template.prompt.title || '',
    role: template.prompt.role || '',
    task: template.prompt.task || '',
    context: template.prompt.context || '',
    constraints: template.prompt.constraints || [],
    examples: template.prompt.examples || [],
  };
}

