/**
 * Unified Search Service
 * 
 * Provides a unified interface for searching across all content types in the
 * Document Intelligence Suite, inspired by patterns from abhishekkrthakur/search.
 * 
 * Features:
 * - Cross-content-type search (prompts, documents, analyses, packs)
 * - BM25-style ranking with PostgreSQL
 * - Performance metrics tracking
 * - Result snippets and highlighting
 */

import { supabase } from '../lib/supabase';
import {
  generateContextualSnippet,
  extractSearchTerms,
  calculateSearchMetrics,
  validateSearchQuery,
  type SearchMetrics
} from '../utils/searchUtils';

export type SearchContentType = 'prompt' | 'document' | 'analysis' | 'pack' | 'all';

export interface UnifiedSearchResult {
  id: string;
  type: SearchContentType;
  title: string;
  snippet: string;
  content?: string;
  url?: string;
  relevance: number;
  metadata: Record<string, any>;
  createdAt?: string;
}

export interface UnifiedSearchOptions {
  query: string;
  type?: SearchContentType;
  limit?: number;
  offset?: number;
  userId?: string;
  includeMetrics?: boolean;
}

export interface UnifiedSearchResponse {
  results: UnifiedSearchResult[];
  metrics: SearchMetrics;
  hasMore: boolean;
  total: number;
}

/**
 * Perform a unified search across all content types
 * 
 * @param options - Search options
 * @returns Search results with metrics
 * 
 * @example
 * ```typescript
 * const { results, metrics } = await performUnifiedSearch({
 *   query: "machine learning",
 *   type: "all",
 *   limit: 20
 * });
 * ```
 */
export async function performUnifiedSearch(
  options: UnifiedSearchOptions
): Promise<UnifiedSearchResponse> {
  const startTime = performance.now();
  const { query, type = 'all', limit = 10, offset = 0, userId } = options;

  // Validate query
  const validation = validateSearchQuery(query, { minLength: 1, maxLength: 500 });
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const sanitizedQuery = validation.sanitized!;
  const searchTerms = extractSearchTerms(sanitizedQuery);

  let results: UnifiedSearchResult[] = [];

  try {
    if (type === 'all') {
      // Search across all content types in parallel
      const [prompts, documents, packs] = await Promise.all([
        searchPrompts(sanitizedQuery, { limit, offset, userId }),
        searchDocuments(sanitizedQuery, { limit, offset, userId }),
        searchPacks(sanitizedQuery, { limit, offset, userId })
      ]);

      // Combine and sort by relevance
      results = [...prompts, ...documents, ...packs]
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, limit);
    } else {
      // Search specific content type
      switch (type) {
        case 'prompt':
          results = await searchPrompts(sanitizedQuery, { limit, offset, userId });
          break;
        case 'document':
          results = await searchDocuments(sanitizedQuery, { limit, offset, userId });
          break;
        case 'pack':
          results = await searchPacks(sanitizedQuery, { limit, offset, userId });
          break;
      }
    }

    // Generate snippets with context
    results = results.map(result => ({
      ...result,
      snippet: generateContextualSnippet(
        result.content || result.snippet,
        searchTerms,
        { maxLength: 360, contextWindow: 50 }
      )
    }));

    const endTime = performance.now();
    const metrics = calculateSearchMetrics(
      startTime,
      endTime,
      sanitizedQuery,
      results.length,
      results.length, // TODO: Get actual total count
      'text'
    );

    return {
      results,
      metrics,
      hasMore: results.length === limit,
      total: results.length
    };
  } catch (error) {
    console.error('Unified search error:', error);
    throw error;
  }
}

/**
 * Search prompts with BM25-style ranking
 */
async function searchPrompts(
  query: string,
  options: { limit: number; offset: number; userId?: string }
): Promise<UnifiedSearchResult[]> {
  const { limit, offset, userId } = options;

  try {
    let queryBuilder = supabase
      .from('prompts')
      .select('*')
      .or(`title.ilike.%${query}%,description.ilike.%${query}%,prompt_body.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (userId) {
      queryBuilder = queryBuilder.eq('user_id', userId);
    }

    const { data, error } = await queryBuilder;

    if (error) throw error;

    return (data || []).map(prompt => {
      // Calculate simple relevance score based on match position and frequency
      const titleMatch = prompt.title?.toLowerCase().includes(query.toLowerCase()) ? 3 : 0;
      const descMatch = prompt.description?.toLowerCase().includes(query.toLowerCase()) ? 2 : 0;
      const bodyMatch = prompt.prompt_body?.toLowerCase().includes(query.toLowerCase()) ? 1 : 0;
      const relevance = (titleMatch + descMatch + bodyMatch) / 6; // Normalize to 0-1

      return {
        id: prompt.id,
        type: 'prompt' as const,
        title: prompt.title || 'Untitled Prompt',
        snippet: prompt.description || prompt.prompt_body || '',
        content: prompt.prompt_body,
        url: `/prompts/${prompt.id}`,
        relevance,
        metadata: {
          category: prompt.category,
          tags: prompt.tags,
          isPublic: prompt.is_public,
          createdAt: prompt.created_at
        },
        createdAt: prompt.created_at
      };
    });
  } catch (error) {
    console.error('Error searching prompts:', error);
    return [];
  }
}

/**
 * Search documents
 */
async function searchDocuments(
  query: string,
  options: { limit: number; offset: number; userId?: string }
): Promise<UnifiedSearchResult[]> {
  const { limit, offset, userId } = options;

  try {
    let queryBuilder = supabase
      .from('documents')
      .select('*')
      .or(`filename.ilike.%${query}%,text_content.ilike.%${query}%`)
      .order('uploaded_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (userId) {
      queryBuilder = queryBuilder.eq('user_id', userId);
    }

    const { data, error } = await queryBuilder;

    if (error) throw error;

    return (data || []).map(doc => {
      const filenameMatch = doc.filename?.toLowerCase().includes(query.toLowerCase()) ? 2 : 0;
      const contentMatch = doc.text_content?.toLowerCase().includes(query.toLowerCase()) ? 1 : 0;
      const relevance = (filenameMatch + contentMatch) / 3;

      return {
        id: doc.id,
        type: 'document' as const,
        title: doc.filename || 'Untitled Document',
        snippet: doc.text_content || '',
        content: doc.text_content,
        url: `/documents/${doc.id}`,
        relevance,
        metadata: {
          fileType: doc.file_type,
          fileSize: doc.file_size,
          uploadedAt: doc.uploaded_at,
          processed: doc.processed
        },
        createdAt: doc.uploaded_at
      };
    });
  } catch (error) {
    console.error('Error searching documents:', error);
    return [];
  }
}

/**
 * Search prompt packs
 */
async function searchPacks(
  query: string,
  options: { limit: number; offset: number; userId?: string }
): Promise<UnifiedSearchResult[]> {
  const { limit, offset, userId } = options;

  try {
    let queryBuilder = supabase
      .from('prompt_packs')
      .select('*')
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (userId) {
      queryBuilder = queryBuilder.eq('user_id', userId);
    }

    const { data, error } = await queryBuilder;

    if (error) throw error;

    return (data || []).map(pack => {
      const nameMatch = pack.name?.toLowerCase().includes(query.toLowerCase()) ? 2 : 0;
      const descMatch = pack.description?.toLowerCase().includes(query.toLowerCase()) ? 1 : 0;
      const relevance = (nameMatch + descMatch) / 3;

      return {
        id: pack.id,
        type: 'pack' as const,
        title: pack.name || 'Untitled Pack',
        snippet: pack.description || '',
        content: pack.description,
        url: `/packs/${pack.id}`,
        relevance,
        metadata: {
          promptCount: pack.prompt_ids?.length || 0,
          isPublic: pack.is_public,
          createdAt: pack.created_at
        },
        createdAt: pack.created_at
      };
    });
  } catch (error) {
    console.error('Error searching packs:', error);
    return [];
  }
}

/**
 * Get search suggestions based on recent searches and popular queries
 * 
 * @param partialQuery - Partial query to get suggestions for
 * @returns Array of suggested queries
 */
export async function getSearchSuggestions(
  partialQuery: string
): Promise<string[]> {
  if (!partialQuery || partialQuery.length < 2) {
    return [];
  }

  try {
    // Get suggestions from existing content
    const suggestions = new Set<string>();

    // Add suggestions from prompt titles
    const { data: prompts } = await supabase
      .from('prompts')
      .select('title')
      .ilike('title', `%${partialQuery}%`)
      .limit(5);

    prompts?.forEach(p => {
      if (p.title) suggestions.add(p.title);
    });

    // Add suggestions from document filenames
    const { data: docs } = await supabase
      .from('documents')
      .select('filename')
      .ilike('filename', `%${partialQuery}%`)
      .limit(5);

    docs?.forEach(d => {
      if (d.filename) suggestions.add(d.filename);
    });

    return Array.from(suggestions).slice(0, 8);
  } catch (error) {
    console.error('Error getting search suggestions:', error);
    return [];
  }
}

/**
 * Save search query for analytics and suggestions
 * 
 * @param query - Search query
 * @param resultCount - Number of results returned
 * @param userId - Optional user ID
 */
export async function saveSearchQuery(
  query: string,
  resultCount: number,
  userId?: string
): Promise<void> {
  try {
    // This could be implemented to save to a search_history table
    // for analytics and personalized suggestions
    console.log('Search logged:', { query, resultCount, userId });
  } catch (error) {
    console.error('Error saving search query:', error);
  }
}
