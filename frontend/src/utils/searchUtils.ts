/**
 * Search Utilities
 * 
 * Utilities for search result processing, inspired by best practices from
 * abhishekkrthakur/search implementation.
 * 
 * Features:
 * - Smart snippet generation with context preservation
 * - Text truncation with word boundaries
 * - Search term highlighting
 * - Relevance score formatting
 */

export interface SnippetOptions {
  maxLength?: number;
  placeholder?: string;
  contextWindow?: number;
  preserveWordBoundaries?: boolean;
}

export interface SearchMetrics {
  query: string;
  totalResults: number;
  returnedResults: number;
  latencyMs: number;
  searchMethod: 'text' | 'vector' | 'hybrid';
  timestamp?: Date;
}

/**
 * Generate a snippet from text, intelligently truncating while preserving context
 * 
 * @param text - Full text to create snippet from
 * @param options - Snippet generation options
 * @returns Truncated snippet with placeholder if needed
 * 
 * @example
 * ```typescript
 * const snippet = generateSnippet(
 *   "This is a very long document with lots of content...",
 *   { maxLength: 150, placeholder: "…" }
 * );
 * ```
 */
export function generateSnippet(
  text: string,
  options: SnippetOptions = {}
): string {
  const {
    maxLength = 360,
    placeholder = "…",
    preserveWordBoundaries = true
  } = options;

  if (!text) return '';

  // Normalize whitespace
  const normalized = text.replace(/\s+/g, ' ').trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  if (!preserveWordBoundaries) {
    return normalized.substring(0, maxLength - placeholder.length) + placeholder;
  }

  // Truncate at word boundary
  let truncated = normalized.substring(0, maxLength - placeholder.length);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > maxLength * 0.7) {
    // Only use word boundary if we're not losing too much content
    truncated = truncated.substring(0, lastSpace);
  }

  return truncated + placeholder;
}

/**
 * Generate a context-aware snippet that shows text around search matches
 * 
 * @param text - Full text to create snippet from
 * @param searchTerms - Terms to find and show context around
 * @param options - Snippet generation options
 * @returns Snippet with context around matched terms
 * 
 * @example
 * ```typescript
 * const snippet = generateContextualSnippet(
 *   "The quick brown fox jumps over the lazy dog",
 *   ["fox"],
 *   { contextWindow: 20 }
 * );
 * // Returns: "...brown fox jumps over..."
 * ```
 */
export function generateContextualSnippet(
  text: string,
  searchTerms: string[],
  options: SnippetOptions = {}
): string {
  const {
    maxLength = 360,
    placeholder = "…",
    contextWindow = 50,
    preserveWordBoundaries = true
  } = options;

  if (!text || !searchTerms.length) {
    return generateSnippet(text, { maxLength, placeholder, preserveWordBoundaries });
  }

  const normalized = text.replace(/\s+/g, ' ').trim();
  const lowerText = normalized.toLowerCase();

  // Find first occurrence of any search term
  let firstMatchIndex = -1;
  for (const term of searchTerms) {
    const index = lowerText.indexOf(term.toLowerCase());
    if (index !== -1 && (firstMatchIndex === -1 || index < firstMatchIndex)) {
      firstMatchIndex = index;
    }
  }

  if (firstMatchIndex === -1) {
    // No match found, return standard snippet
    return generateSnippet(text, { maxLength, placeholder, preserveWordBoundaries });
  }

  // Calculate snippet bounds around match
  const start = Math.max(0, firstMatchIndex - contextWindow);
  const end = Math.min(normalized.length, firstMatchIndex + contextWindow + 50);

  let snippet = normalized.substring(start, end);

  // Add ellipsis if we cut content
  if (start > 0) snippet = placeholder + snippet;
  if (end < normalized.length) snippet = snippet + placeholder;

  // Ensure final snippet isn't too long
  if (snippet.length > maxLength) {
    snippet = generateSnippet(snippet, { maxLength, placeholder, preserveWordBoundaries });
  }

  return snippet;
}

/**
 * Highlight search terms in text by wrapping them in <mark> tags
 * 
 * @param text - Text to highlight terms in
 * @param searchTerms - Terms to highlight
 * @param caseSensitive - Whether to use case-sensitive matching
 * @returns HTML string with highlighted terms
 * 
 * @example
 * ```typescript
 * const highlighted = highlightSearchTerms(
 *   "The quick brown fox",
 *   ["quick", "fox"]
 * );
 * // Returns: "The <mark>quick</mark> brown <mark>fox</mark>"
 * ```
 */
export function highlightSearchTerms(
  text: string,
  searchTerms: string[],
  caseSensitive = false
): string {
  if (!text || !searchTerms.length) return text;

  let result = text;
  const flags = caseSensitive ? 'g' : 'gi';

  for (const term of searchTerms) {
    if (!term.trim()) continue;

    // Escape special regex characters
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedTerm})`, flags);

    result = result.replace(regex, '<mark>$1</mark>');
  }

  return result;
}

/**
 * Format relevance score for display
 * 
 * @param score - Raw relevance score
 * @param precision - Number of decimal places
 * @returns Formatted score string
 * 
 * @example
 * ```typescript
 * formatRelevance(0.847392) // "0.847"
 * formatRelevance(0.847392, 2) // "0.85"
 * ```
 */
export function formatRelevance(score: number, precision = 3): string {
  return score.toFixed(precision);
}

/**
 * Format search latency for display
 * 
 * @param latencyMs - Latency in milliseconds
 * @returns Formatted latency string
 * 
 * @example
 * ```typescript
 * formatLatency(45.678) // "45.7ms"
 * formatLatency(1234.5) // "1.23s"
 * ```
 */
export function formatLatency(latencyMs: number): string {
  if (latencyMs < 1000) {
    return `${latencyMs.toFixed(1)}ms`;
  }
  return `${(latencyMs / 1000).toFixed(2)}s`;
}

/**
 * Extract search terms from a query string
 * 
 * @param query - Search query
 * @returns Array of individual search terms
 * 
 * @example
 * ```typescript
 * extractSearchTerms("quick brown fox") // ["quick", "brown", "fox"]
 * extractSearchTerms('"exact phrase" word') // ["exact phrase", "word"]
 * ```
 */
export function extractSearchTerms(query: string): string[] {
  if (!query) return [];

  const terms: string[] = [];
  const quoteRegex = /"([^"]+)"/g;
  let match;

  // Extract quoted phrases
  while ((match = quoteRegex.exec(query)) !== null) {
    terms.push(match[1]);
  }

  // Remove quoted phrases and extract individual words
  const remainingQuery = query.replace(quoteRegex, '').trim();
  if (remainingQuery) {
    const words = remainingQuery.split(/\s+/).filter(w => w.length > 0);
    terms.push(...words);
  }

  return terms;
}

/**
 * Calculate search metrics from timing data
 * 
 * @param startTime - Search start timestamp (from performance.now())
 * @param endTime - Search end timestamp (from performance.now())
 * @param query - Search query
 * @param resultCount - Number of results returned
 * @param totalCount - Total number of matching results
 * @param method - Search method used
 * @returns Search metrics object
 */
export function calculateSearchMetrics(
  startTime: number,
  endTime: number,
  query: string,
  resultCount: number,
  totalCount: number,
  method: 'text' | 'vector' | 'hybrid' = 'text'
): SearchMetrics {
  return {
    query,
    totalResults: totalCount,
    returnedResults: resultCount,
    latencyMs: Math.round(endTime - startTime),
    searchMethod: method,
    timestamp: new Date()
  };
}

/**
 * Validate search query
 * 
 * @param query - Query to validate
 * @param options - Validation options
 * @returns Validation result
 */
export interface QueryValidationOptions {
  minLength?: number;
  maxLength?: number;
  allowEmpty?: boolean;
  forbiddenChars?: RegExp;
}

export interface QueryValidationResult {
  valid: boolean;
  error?: string;
  sanitized?: string;
}

export function validateSearchQuery(
  query: string,
  options: QueryValidationOptions = {}
): QueryValidationResult {
  const {
    minLength = 1,
    maxLength = 500,
    allowEmpty = false,
    forbiddenChars
  } = options;

  const trimmed = query.trim();

  if (!trimmed && !allowEmpty) {
    return { valid: false, error: 'Query cannot be empty' };
  }

  // If empty is allowed and query is empty, return valid
  if (!trimmed && allowEmpty) {
    return { valid: true, sanitized: trimmed };
  }

  if (trimmed.length < minLength) {
    return { valid: false, error: `Query must be at least ${minLength} characters` };
  }

  if (trimmed.length > maxLength) {
    return { valid: false, error: `Query must not exceed ${maxLength} characters` };
  }

  if (forbiddenChars && forbiddenChars.test(trimmed)) {
    return { valid: false, error: 'Query contains invalid characters' };
  }

  return { valid: true, sanitized: trimmed };
}

/**
 * Parse search query to extract filters and terms
 * 
 * @param query - Raw search query
 * @returns Parsed query components
 * 
 * @example
 * ```typescript
 * parseSearchQuery("type:document status:active python machine learning")
 * // Returns: {
 * //   terms: ["python", "machine", "learning"],
 * //   filters: { type: "document", status: "active" }
 * // }
 * ```
 */
export interface ParsedQuery {
  terms: string[];
  filters: Record<string, string>;
  rawQuery: string;
}

export function parseSearchQuery(query: string): ParsedQuery {
  if (!query) {
    return { terms: [], filters: {}, rawQuery: '' };
  }

  const filters: Record<string, string> = {};
  const terms: string[] = [];

  // Match filter patterns like "key:value"
  const filterRegex = /(\w+):(\S+)/g;
  let match;
  let processedQuery = query;

  while ((match = filterRegex.exec(query)) !== null) {
    const [fullMatch, key, value] = match;
    filters[key] = value;
    processedQuery = processedQuery.replace(fullMatch, '');
  }

  // Extract remaining terms
  const remainingTerms = processedQuery.trim().split(/\s+/).filter(t => t.length > 0);
  terms.push(...remainingTerms);

  return {
    terms,
    filters,
    rawQuery: query
  };
}
