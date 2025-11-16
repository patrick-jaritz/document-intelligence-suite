/**
 * Service for managing prompt versions
 */

import { supabase } from '../lib/supabase';
import { PromptVersion, VersionFormData } from '../types/promptforge';

/**
 * Get all versions for a prompt
 */
export async function getPromptVersions(promptId: string): Promise<PromptVersion[]> {
  try {
    const { data, error } = await supabase
      .from('prompt_versions')
      .select('*')
      .eq('prompt_id', promptId)
      .order('version_number', { ascending: false });

    if (error) {
      console.error('Error fetching prompt versions:', error);
      throw error;
    }

    return (data || []) as PromptVersion[];
  } catch (error) {
    console.error('Failed to fetch prompt versions:', error);
    return [];
  }
}

/**
 * Get a specific version by ID
 */
export async function getPromptVersion(versionId: string): Promise<PromptVersion | null> {
  try {
    const { data, error } = await supabase
      .from('prompt_versions')
      .select('*')
      .eq('id', versionId)
      .single();

    if (error) {
      console.error('Error fetching prompt version:', error);
      throw error;
    }

    return data as PromptVersion;
  } catch (error) {
    console.error('Failed to fetch prompt version:', error);
    return null;
  }
}

/**
 * Create a new version of a prompt
 */
export async function createPromptVersion(
  promptId: string,
  versionData: VersionFormData
): Promise<PromptVersion | null> {
  try {
    // Get current max version number
    const { data: currentVersions } = await supabase
      .from('prompt_versions')
      .select('version_number')
      .eq('prompt_id', promptId)
      .order('version_number', { ascending: false })
      .limit(1);

    const nextVersionNumber = currentVersions && currentVersions.length > 0
      ? currentVersions[0].version_number + 1
      : 1;

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Create new version
    const { data, error } = await supabase
      .from('prompt_versions')
      .insert({
        prompt_id: promptId,
        version_number: nextVersionNumber,
        prompt_body: versionData.prompt_body,
        changelog: versionData.changelog || null,
        created_by: user.id,
        is_current: true, // New version becomes current
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating prompt version:', error);
      throw error;
    }

    // Update prompt's current_version_id
    await supabase
      .from('prompts')
      .update({ current_version_id: data.id, updated_at: new Date().toISOString() })
      .eq('id', promptId);

    return data as PromptVersion;
  } catch (error) {
    console.error('Failed to create prompt version:', error);
    return null;
  }
}

/**
 * Promote a version to be the current version
 */
export async function promoteVersion(
  promptId: string,
  versionId: string
): Promise<boolean> {
  try {
    // Set all versions to not current
    await supabase
      .from('prompt_versions')
      .update({ is_current: false })
      .eq('prompt_id', promptId);

    // Set this version as current
    const { error: updateError } = await supabase
      .from('prompt_versions')
      .update({ is_current: true })
      .eq('id', versionId);

    if (updateError) {
      throw updateError;
    }

    // Update prompt's current_version_id
    await supabase
      .from('prompts')
      .update({ current_version_id: versionId, updated_at: new Date().toISOString() })
      .eq('id', promptId);

    return true;
  } catch (error) {
    console.error('Failed to promote version:', error);
    return false;
  }
}

/**
 * Get the current version of a prompt
 */
export async function getCurrentVersion(promptId: string): Promise<PromptVersion | null> {
  try {
    const { data, error } = await supabase
      .from('prompt_versions')
      .select('*')
      .eq('prompt_id', promptId)
      .eq('is_current', true)
      .single();

    if (error) {
      console.error('Error fetching current version:', error);
      return null;
    }

    return data as PromptVersion;
  } catch (error) {
    console.error('Failed to fetch current version:', error);
    return null;
  }
}
