/**
 * Service for managing prompt-document relationships
 */

import { supabase } from '../lib/supabase';

export type DocumentRelationshipType = 'context' | 'example' | 'reference' | 'target';

export interface PromptDocument {
  prompt_id: string;
  document_id: string;
  relationship_type: DocumentRelationshipType;
  created_at: string;
}

export interface PromptDocumentExcerpt {
  id: string;
  prompt_id: string;
  document_id: string;
  excerpt_text: string;
  page_number: number | null;
  start_char: number | null;
  end_char: number | null;
  used_in_version_id: string | null;
  created_at: string;
}

/**
 * Link a document to a prompt
 */
export async function linkDocumentToPrompt(
  promptId: string,
  documentId: string,
  relationshipType: DocumentRelationshipType = 'context'
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('prompt_documents')
      .insert({
        prompt_id: promptId,
        document_id: documentId,
        relationship_type: relationshipType,
      });

    if (error) {
      console.error('Error linking document:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Failed to link document:', error);
    return false;
  }
}

/**
 * Unlink a document from a prompt
 */
export async function unlinkDocumentFromPrompt(
  promptId: string,
  documentId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('prompt_documents')
      .delete()
      .eq('prompt_id', promptId)
      .eq('document_id', documentId);

    if (error) {
      console.error('Error unlinking document:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Failed to unlink document:', error);
    return false;
  }
}

/**
 * Get all documents linked to a prompt
 */
export async function getPromptDocuments(promptId: string): Promise<PromptDocument[]> {
  try {
    const { data, error } = await supabase
      .from('prompt_documents')
      .select('*')
      .eq('prompt_id', promptId);

    if (error) {
      console.error('Error fetching prompt documents:', error);
      throw error;
    }

    return (data || []) as PromptDocument[];
  } catch (error) {
    console.error('Failed to fetch prompt documents:', error);
    return [];
  }
}

/**
 * Get all prompts linked to a document
 */
export async function getDocumentPrompts(documentId: string): Promise<PromptDocument[]> {
  try {
    const { data, error } = await supabase
      .from('prompt_documents')
      .select('*')
      .eq('document_id', documentId);

    if (error) {
      console.error('Error fetching document prompts:', error);
      throw error;
    }

    return (data || []) as PromptDocument[];
  } catch (error) {
    console.error('Failed to fetch document prompts:', error);
    return [];
  }
}

/**
 * Add a document excerpt to a prompt
 */
export async function addDocumentExcerpt(
  promptId: string,
  documentId: string,
  excerptText: string,
  pageNumber?: number,
  startChar?: number,
  endChar?: number,
  versionId?: string
): Promise<PromptDocumentExcerpt | null> {
  try {
    const { data, error } = await supabase
      .from('prompt_document_excerpts')
      .insert({
        prompt_id: promptId,
        document_id: documentId,
        excerpt_text: excerptText,
        page_number: pageNumber || null,
        start_char: startChar || null,
        end_char: endChar || null,
        used_in_version_id: versionId || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding excerpt:', error);
      throw error;
    }

    return data as PromptDocumentExcerpt;
  } catch (error) {
    console.error('Failed to add excerpt:', error);
    return null;
  }
}

/**
 * Get excerpts for a prompt
 */
export async function getPromptExcerpts(promptId: string): Promise<PromptDocumentExcerpt[]> {
  try {
    const { data, error } = await supabase
      .from('prompt_document_excerpts')
      .select('*')
      .eq('prompt_id', promptId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching excerpts:', error);
      throw error;
    }

    return (data || []) as PromptDocumentExcerpt[];
  } catch (error) {
    console.error('Failed to fetch excerpts:', error);
    return [];
  }
}

/**
 * Delete an excerpt
 */
export async function deleteExcerpt(excerptId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('prompt_document_excerpts')
      .delete()
      .eq('id', excerptId);

    if (error) {
      console.error('Error deleting excerpt:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Failed to delete excerpt:', error);
    return false;
  }
}
