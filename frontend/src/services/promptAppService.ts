/**
 * Service for managing prompt apps (public shareable prompts)
 */

import { supabase } from '../lib/supabase';
import { PromptApp, AppExecution, AppAnalytics, AppFormData } from '../types/promptforge';

/**
 * Create a public app from a prompt
 */
export async function createPromptApp(
  promptId: string,
  formData: AppFormData
): Promise<PromptApp | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Generate slug
    const slugResponse = await supabase.rpc('generate_app_slug', {
      prompt_title: formData.title,
    });

    if (slugResponse.error) {
      console.error('Error generating slug:', slugResponse.error);
      // Fallback: use prompt ID + random string
      const fallbackSlug = `app-${promptId.slice(0, 8)}-${Math.random().toString(36).substring(2, 10)}`;
      
      const { data, error } = await supabase
        .from('prompt_apps')
        .insert({
          prompt_id: promptId,
          slug: fallbackSlug,
          title: formData.title,
          description: formData.description || null,
          allow_anonymous: formData.allow_anonymous,
          require_auth: formData.require_auth,
          max_executions_per_day: formData.max_executions_per_day,
          max_executions_total: formData.max_executions_total,
          expires_at: formData.expires_at || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating app:', error);
        throw error;
      }

      return data as PromptApp;
    }

    const slug = slugResponse.data;

    const { data, error } = await supabase
      .from('prompt_apps')
      .insert({
        prompt_id: promptId,
        slug: slug,
        title: formData.title,
        description: formData.description || null,
        allow_anonymous: formData.allow_anonymous,
        require_auth: formData.require_auth,
        max_executions_per_day: formData.max_executions_per_day,
        max_executions_total: formData.max_executions_total,
        expires_at: formData.expires_at || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating app:', error);
      throw error;
    }

    return data as PromptApp;
  } catch (error) {
    console.error('Failed to create prompt app:', error);
    return null;
  }
}

/**
 * Get app by slug (public)
 */
export async function getAppBySlug(slug: string): Promise<PromptApp | null> {
  try {
    const { data, error } = await supabase
      .from('prompt_apps')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error fetching app:', error);
      return null;
    }

    return data as PromptApp;
  } catch (error) {
    console.error('Failed to fetch app:', error);
    return null;
  }
}

/**
 * Get all apps for a prompt
 */
export async function getPromptApps(promptId: string): Promise<PromptApp[]> {
  try {
    const { data, error } = await supabase
      .from('prompt_apps')
      .select('*')
      .eq('prompt_id', promptId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching apps:', error);
      throw error;
    }

    return (data || []) as PromptApp[];
  } catch (error) {
    console.error('Failed to fetch apps:', error);
    return [];
  }
}

/**
 * Update an app
 */
export async function updateApp(
  appId: string,
  updates: Partial<AppFormData>
): Promise<PromptApp | null> {
  try {
    const updateData: any = {};
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.allow_anonymous !== undefined) updateData.allow_anonymous = updates.allow_anonymous;
    if (updates.require_auth !== undefined) updateData.require_auth = updates.require_auth;
    if (updates.max_executions_per_day !== undefined) updateData.max_executions_per_day = updates.max_executions_per_day;
    if (updates.max_executions_total !== undefined) updateData.max_executions_total = updates.max_executions_total;
    if (updates.expires_at !== undefined) updateData.expires_at = updates.expires_at;

    const { data, error } = await supabase
      .from('prompt_apps')
      .update(updateData)
      .eq('id', appId)
      .select()
      .single();

    if (error) {
      console.error('Error updating app:', error);
      throw error;
    }

    return data as PromptApp;
  } catch (error) {
    console.error('Failed to update app:', error);
    return null;
  }
}

/**
 * Deactivate/activate an app
 */
export async function toggleAppActive(appId: string, isActive: boolean): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('prompt_apps')
      .update({ is_active: isActive })
      .eq('id', appId);

    if (error) {
      console.error('Error toggling app:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Failed to toggle app:', error);
    return false;
  }
}

/**
 * Delete an app
 */
export async function deleteApp(appId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('prompt_apps')
      .delete()
      .eq('id', appId);

    if (error) {
      console.error('Error deleting app:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Failed to delete app:', error);
    return false;
  }
}

/**
 * Execute a prompt via public app
 */
export async function executeApp(
  appId: string,
  inputs: Record<string, any>,
  promptBody: string,
  promptId: string,
  model: string = 'gpt-4o-mini',
  temperature: number = 0.7
): Promise<AppExecution | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

    // Replace placeholders in prompt body
    let finalPrompt = promptBody;
    Object.entries(inputs).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      finalPrompt = finalPrompt.replace(new RegExp(placeholder, 'g'), String(value));
    });

    // Call LLM
    const startTime = Date.now();
    const llmResponse = await fetch(`${supabaseUrl}/functions/v1/execute-prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token || ''}`,
      },
      body: JSON.stringify({
        prompt: finalPrompt,
        model,
        temperature,
      }),
    });

    if (!llmResponse.ok) {
      throw new Error('Failed to execute prompt');
    }

    const llmData = await llmResponse.json();
    const latency = Date.now() - startTime;
    const output = llmData.response || llmData.text || '';

    // Get IP and user agent (if available)
    const ipAddress = null; // Would need to pass from server
    const userAgent = navigator.userAgent;

    // Save execution (non-blocking - don't fail if save fails)
    try {
      const { error } = await supabase
        .from('app_executions')
        .insert({
          app_id: appId,
          prompt_id: promptId,
          user_id: session?.user?.id || null,
          inputs,
          output,
          model,
          tokens_in: llmData.tokens_in || null,
          tokens_out: llmData.tokens_out || null,
          latency_ms: latency,
          ip_address: ipAddress,
          user_agent: userAgent,
        });

      if (error) {
        console.error('Error saving execution:', error);
        // Continue anyway - execution succeeded even if save failed
      }
    } catch (saveError) {
      console.error('Failed to save execution:', saveError);
      // Continue anyway
    }

    // Return execution data
    return {
      id: '', // Will be set by database if save succeeded
      app_id: appId,
      prompt_id: promptId,
      user_id: session?.user?.id || null,
      inputs,
      output,
      model,
      tokens_in: llmData.tokens_in || null,
      tokens_out: llmData.tokens_out || null,
      latency_ms: latency,
      ip_address: ipAddress,
      user_agent: userAgent,
      created_at: new Date().toISOString(),
    } as AppExecution;
  } catch (error) {
    console.error('Failed to execute app:', error);
    return null;
  }
}

/**
 * Get app analytics
 */
export async function getAppAnalytics(appId: string, days: number = 30): Promise<AppAnalytics[]> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('app_analytics')
      .select('*')
      .eq('app_id', appId)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching analytics:', error);
      throw error;
    }

    return (data || []) as AppAnalytics[];
  } catch (error) {
    console.error('Failed to fetch analytics:', error);
    return [];
  }
}

/**
 * Get app executions
 */
export async function getAppExecutions(
  appId: string,
  limit: number = 50
): Promise<AppExecution[]> {
  try {
    const { data, error } = await supabase
      .from('app_executions')
      .select('*')
      .eq('app_id', appId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching executions:', error);
      throw error;
    }

    return (data || []) as AppExecution[];
  } catch (error) {
    console.error('Failed to fetch executions:', error);
    return [];
  }
}
