/**
 * Service for managing prompt packs
 */

import { supabase } from '../lib/supabase';
import { Pack, PackWithPrompts, PackFormData, PackExport } from '../types/promptforge';
import { getPrompt } from './promptForgeService';

/**
 * Get all packs
 */
export async function getPacks(includePublic: boolean = true): Promise<Pack[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return [];
    }

    let query = supabase.from('packs').select('*');

    if (includePublic) {
      query = query.or(`owner_id.eq.${user.id},visibility.eq.public`);
    } else {
      query = query.eq('owner_id', user.id);
    }

    const { data, error } = await query.order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching packs:', error);
      throw error;
    }

    return (data || []) as Pack[];
  } catch (error) {
    console.error('Failed to fetch packs:', error);
    return [];
  }
}

/**
 * Get a single pack with prompts
 */
export async function getPack(packId: string): Promise<PackWithPrompts | null> {
  try {
    const { data: pack, error: packError } = await supabase
      .from('packs')
      .select('*')
      .eq('id', packId)
      .single();

    if (packError || !pack) {
      console.error('Error fetching pack:', packError);
      return null;
    }

    // Get pack prompts with order
    const { data: packPrompts, error: promptsError } = await supabase
      .from('pack_prompts')
      .select('prompt_id, order_index')
      .eq('pack_id', packId)
      .order('order_index', { ascending: true });

    if (promptsError) {
      console.error('Error fetching pack prompts:', promptsError);
      return { ...pack, prompts: [] } as PackWithPrompts;
    }

    // Fetch actual prompt data
    const prompts = await Promise.all(
      (packPrompts || []).map(async (pp) => {
        const prompt = await getPrompt(pp.prompt_id);
        return prompt
          ? { ...prompt, order_index: pp.order_index }
          : null;
      })
    );

    return {
      ...pack,
      prompts: prompts.filter((p): p is any => p !== null),
    } as PackWithPrompts;
  } catch (error) {
    console.error('Failed to fetch pack:', error);
    return null;
  }
}

/**
 * Create a new pack
 */
export async function createPack(formData: PackFormData): Promise<Pack | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Create pack
    const { data: pack, error: packError } = await supabase
      .from('packs')
      .insert({
        title: formData.title,
        description: formData.description || null,
        tags: formData.tags || [],
        category: formData.category || null,
        owner_id: user.id,
        workspace_id: formData.workspace_id || null,
        visibility: formData.visibility || 'private',
      })
      .select()
      .single();

    if (packError || !pack) {
      console.error('Error creating pack:', packError);
      throw packError;
    }

    // Add prompts to pack
    if (formData.prompt_ids && formData.prompt_ids.length > 0) {
      const packPrompts = formData.prompt_ids.map((promptId, index) => ({
        pack_id: pack.id,
        prompt_id: promptId,
        order_index: index,
      }));

      const { error: promptsError } = await supabase
        .from('pack_prompts')
        .insert(packPrompts);

      if (promptsError) {
        console.error('Error adding prompts to pack:', promptsError);
        // Pack created but prompts failed - still return pack
      }
    }

    return pack as Pack;
  } catch (error) {
    console.error('Failed to create pack:', error);
    return null;
  }
}

/**
 * Update a pack
 */
export async function updatePack(
  packId: string,
  formData: Partial<PackFormData>
): Promise<Pack | null> {
  try {
    const updateData: any = {};

    if (formData.title !== undefined) updateData.title = formData.title;
    if (formData.description !== undefined) updateData.description = formData.description;
    if (formData.tags !== undefined) updateData.tags = formData.tags;
    if (formData.category !== undefined) updateData.category = formData.category;
    if (formData.visibility !== undefined) updateData.visibility = formData.visibility;

    const { data, error } = await supabase
      .from('packs')
      .update(updateData)
      .eq('id', packId)
      .select()
      .single();

    if (error) {
      console.error('Error updating pack:', error);
      throw error;
    }

    // Update prompts if provided
    if (formData.prompt_ids !== undefined) {
      // Delete existing
      await supabase.from('pack_prompts').delete().eq('pack_id', packId);

      // Insert new
      if (formData.prompt_ids.length > 0) {
        const packPrompts = formData.prompt_ids.map((promptId, index) => ({
          pack_id: packId,
          prompt_id: promptId,
          order_index: index,
        }));

        await supabase.from('pack_prompts').insert(packPrompts);
      }
    }

    return data as Pack;
  } catch (error) {
    console.error('Failed to update pack:', error);
    return null;
  }
}

/**
 * Delete a pack
 */
export async function deletePack(packId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('packs').delete().eq('id', packId);

    if (error) {
      console.error('Error deleting pack:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Failed to delete pack:', error);
    return false;
  }
}

/**
 * Export pack as JSON
 */
export async function exportPack(packId: string): Promise<PackExport | null> {
  try {
    const pack = await getPack(packId);
    if (!pack) {
      return null;
    }

    return {
      version: '1.0',
      pack: {
        title: pack.title,
        description: pack.description || null,
        tags: pack.tags || [],
        category: pack.category || null,
      },
      prompts: pack.prompts.map((prompt) => ({
        title: prompt.title,
        description: prompt.description || null,
        prompt_body: prompt.current_version?.prompt_body || prompt.prompt_body,
        tags: prompt.tags || [],
        category: prompt.category || null,
        order_index: prompt.order_index,
      })),
    };
  } catch (error) {
    console.error('Failed to export pack:', error);
    return null;
  }
}

/**
 * Import pack from JSON
 */
export async function importPack(packExport: PackExport): Promise<Pack | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Create prompts first
    const promptIds: string[] = [];
    for (const promptData of packExport.prompts) {
      const { data: prompt } = await supabase
        .from('prompts')
        .insert({
          title: promptData.title,
          description: promptData.description,
          prompt_body: promptData.prompt_body,
          tags: promptData.tags || [],
          category: promptData.category || null,
          owner_id: user.id,
          visibility: 'private',
        })
        .select()
        .single();

      if (prompt) {
        promptIds.push(prompt.id);
      }
    }

    // Create pack
    const formData: PackFormData = {
      title: packExport.pack.title,
      description: packExport.pack.description || '',
      tags: packExport.pack.tags || [],
      category: packExport.pack.category || '',
      visibility: 'private',
      prompt_ids: promptIds,
    };

    return await createPack(formData);
  } catch (error) {
    console.error('Failed to import pack:', error);
    return null;
  }
}
