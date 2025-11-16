/**
 * Enhanced Prompt Service for PromptForge
 * Works with the new prompts table structure
 */

import { supabase } from '../lib/supabase';
import { Prompt, PromptWithVersion, PromptFilters, PromptSortOption, PromptFormData, PaginatedResponse } from '../types/promptforge';
import { StructuredPrompt } from '../types/prompt';
import { getCurrentVersion } from './promptVersionService';

/**
 * Get all prompts with filters and pagination
 */
export async function getPrompts(
  filters?: PromptFilters,
  sort?: PromptSortOption,
  page: number = 1,
  pageSize: number = 20
): Promise<PaginatedResponse<PromptWithVersion>> {
  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('prompts')
      .select('*', { count: 'exact' });

    // Apply filters
    if (filters) {
      if (filters.archived === false) {
        query = query.is('archived_at', null);
      } else if (filters.archived === true) {
        query = query.not('archived_at', 'is', null);
      }

      if (filters.category) {
        query = query.eq('category', filters.category);
      }

      if (filters.visibility && filters.visibility.length > 0) {
        query = query.in('visibility', filters.visibility);
      }

      if (filters.owner_id) {
        query = query.eq('owner_id', filters.owner_id);
      }

      if (filters.workspace_id) {
        query = query.eq('workspace_id', filters.workspace_id);
      }

      if (filters.tags && filters.tags.length > 0) {
        query = query.contains('tags', filters.tags);
      }

      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,prompt_body.ilike.%${filters.search}%`);
      }
    }

    // Apply sorting
    const sortField = sort?.field || 'updated_at';
    const sortDirection = sort?.direction || 'desc';
    query = query.order(sortField, { ascending: sortDirection === 'asc' });

    // Apply pagination
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching prompts:', error);
      throw error;
    }

    // Fetch current versions for each prompt
    const promptsWithVersions = await Promise.all(
      (data || []).map(async (prompt) => {
        const currentVersion = prompt.current_version_id
          ? await getCurrentVersion(prompt.id)
          : null;
        return {
          ...prompt,
          current_version: currentVersion,
        } as PromptWithVersion;
      })
    );

    const total = count || 0;
    const totalPages = Math.ceil(total / pageSize);

    return {
      data: promptsWithVersions,
      total,
      page,
      page_size: pageSize,
      total_pages: totalPages,
    };
  } catch (error) {
    console.error('Failed to fetch prompts:', error);
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
 * Get a single prompt by ID
 */
export async function getPrompt(promptId: string): Promise<PromptWithVersion | null> {
  try {
    const { data, error } = await supabase
      .from('prompts')
      .select('*')
      .eq('id', promptId)
      .single();

    if (error) {
      console.error('Error fetching prompt:', error);
      throw error;
    }

    const currentVersion = data.current_version_id
      ? await getCurrentVersion(promptId)
      : null;

    return {
      ...data,
      current_version: currentVersion,
    } as PromptWithVersion;
  } catch (error) {
    console.error('Failed to fetch prompt:', error);
    return null;
  }
}

/**
 * Create a new prompt
 */
export async function createPrompt(
  formData: PromptFormData
): Promise<Prompt | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('prompts')
      .insert({
        title: formData.title,
        description: formData.description || null,
        prompt_body: formData.prompt_body,
        tags: formData.tags || [],
        category: formData.category || null,
        owner_id: user.id,
        workspace_id: formData.workspace_id || null,
        visibility: formData.visibility || 'private',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating prompt:', error);
      throw error;
    }

    return data as Prompt;
  } catch (error) {
    console.error('Failed to create prompt:', error);
    return null;
  }
}

/**
 * Update a prompt
 */
export async function updatePrompt(
  promptId: string,
  formData: Partial<PromptFormData>
): Promise<Prompt | null> {
  try {
    const updateData: any = {};

    if (formData.title !== undefined) updateData.title = formData.title;
    if (formData.description !== undefined) updateData.description = formData.description;
    if (formData.prompt_body !== undefined) updateData.prompt_body = formData.prompt_body;
    if (formData.tags !== undefined) updateData.tags = formData.tags;
    if (formData.category !== undefined) updateData.category = formData.category;
    if (formData.visibility !== undefined) updateData.visibility = formData.visibility;
    if (formData.workspace_id !== undefined) updateData.workspace_id = formData.workspace_id;

    const { data, error } = await supabase
      .from('prompts')
      .update(updateData)
      .eq('id', promptId)
      .select()
      .single();

    if (error) {
      console.error('Error updating prompt:', error);
      throw error;
    }

    return data as Prompt;
  } catch (error) {
    console.error('Failed to update prompt:', error);
    return null;
  }
}

/**
 * Delete a prompt (soft delete by archiving)
 */
export async function archivePrompt(promptId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('prompts')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', promptId);

    if (error) {
      console.error('Error archiving prompt:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Failed to archive prompt:', error);
    return false;
  }
}

/**
 * Permanently delete a prompt
 */
export async function deletePrompt(promptId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('prompts')
      .delete()
      .eq('id', promptId);

    if (error) {
      console.error('Error deleting prompt:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Failed to delete prompt:', error);
    return false;
  }
}

/**
 * Duplicate a prompt
 */
export async function duplicatePrompt(promptId: string): Promise<Prompt | null> {
  try {
    const prompt = await getPrompt(promptId);
    if (!prompt) {
      throw new Error('Prompt not found');
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('prompts')
      .insert({
        title: `${prompt.title} (Copy)`,
        description: prompt.description,
        prompt_body: prompt.current_version?.prompt_body || prompt.prompt_body,
        tags: prompt.tags,
        category: prompt.category,
        owner_id: user.id,
        workspace_id: prompt.workspace_id,
        visibility: 'private', // Duplicates are always private
      })
      .select()
      .single();

    if (error) {
      console.error('Error duplicating prompt:', error);
      throw error;
    }

    return data as Prompt;
  } catch (error) {
    console.error('Failed to duplicate prompt:', error);
    return null;
  }
}

/**
 * Get all categories used in prompts
 */
export async function getCategories(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('prompts')
      .select('category')
      .not('category', 'is', null)
      .not('archived_at', 'is', null);

    if (error) {
      console.error('Error fetching categories:', error);
      return [];
    }

    const categories = new Set(
      (data || [])
        .map((p) => p.category)
        .filter((c): c is string => c !== null)
    );

    return Array.from(categories).sort();
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    return [];
  }
}

/**
 * Get all tags used in prompts
 */
export async function getAllTags(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('prompts')
      .select('tags')
      .is('archived_at', null);

    if (error) {
      console.error('Error fetching tags:', error);
      return [];
    }

    const tagSet = new Set<string>();
    (data || []).forEach((prompt) => {
      if (prompt.tags && Array.isArray(prompt.tags)) {
        prompt.tags.forEach((tag) => tagSet.add(tag));
      }
    });

    return Array.from(tagSet).sort();
  } catch (error) {
    console.error('Failed to fetch tags:', error);
    return [];
  }
}

/**
 * Convert StructuredPrompt to PromptFormData
 */
export function structuredPromptToFormData(
  prompt: StructuredPrompt,
  metadata?: {
    title?: string;
    description?: string;
    tags?: string[];
    category?: string;
  }
): PromptFormData {
  // Combine all parts into prompt_body
  const parts: string[] = [];
  if (prompt.role) parts.push(`Role: ${prompt.role}`);
  if (prompt.task) parts.push(`Task: ${prompt.task}`);
  if (prompt.context) parts.push(`Context: ${prompt.context}`);
  if (prompt.constraints && prompt.constraints.length > 0) {
    parts.push(`Constraints:\n${prompt.constraints.join('\n')}`);
  }
  if (prompt.examples && prompt.examples.length > 0) {
    parts.push(`Examples:\n${prompt.examples.join('\n\n')}`);
  }

  return {
    title: metadata?.title || prompt.title || 'Untitled Prompt',
    description: metadata?.description || '',
    prompt_body: parts.join('\n\n'),
    tags: metadata?.tags || [],
    category: metadata?.category || '',
    visibility: 'private',
  };
}
