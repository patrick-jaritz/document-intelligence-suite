/**
 * Tests for Search Utilities
 */

import { describe, it, expect } from 'vitest';
import {
  generateSnippet,
  generateContextualSnippet,
  highlightSearchTerms,
  formatRelevance,
  formatLatency,
  extractSearchTerms,
  calculateSearchMetrics,
  validateSearchQuery,
  parseSearchQuery
} from '../searchUtils';

describe('generateSnippet', () => {
  it('should return text as-is if shorter than maxLength', () => {
    const text = 'Short text';
    const result = generateSnippet(text, { maxLength: 100 });
    expect(result).toBe(text);
  });

  it('should truncate long text with placeholder', () => {
    const text = 'This is a very long text that needs to be truncated because it exceeds the maximum length';
    const result = generateSnippet(text, { maxLength: 30, placeholder: '...' });
    expect(result.length).toBeLessThanOrEqual(30);
    expect(result.endsWith('...')).toBe(true);
  });

  it('should preserve word boundaries when truncating', () => {
    const text = 'The quick brown fox jumps over the lazy dog';
    const result = generateSnippet(text, { maxLength: 20, preserveWordBoundaries: true });
    // Result should end with a complete word followed by placeholder
    expect(result.endsWith('…')).toBe(true);
    // The part before placeholder should end with a complete word (no mid-word cut)
    const beforePlaceholder = result.slice(0, -1).trimEnd();
    expect(beforePlaceholder).toBe('The quick brown');
  });

  it('should normalize whitespace', () => {
    const text = 'Text  with   multiple    spaces';
    const result = generateSnippet(text);
    expect(result).toBe('Text with multiple spaces');
  });

  it('should handle empty text', () => {
    const result = generateSnippet('');
    expect(result).toBe('');
  });
});

describe('generateContextualSnippet', () => {
  it('should show context around search term', () => {
    const text = 'The quick brown fox jumps over the lazy dog and runs away';
    const result = generateContextualSnippet(text, ['fox'], { contextWindow: 15 });
    expect(result).toContain('fox');
  });

  it('should add ellipsis when cutting content', () => {
    const text = 'A very long text at the beginning. The search term is here. More text at the end.';
    const result = generateContextualSnippet(text, ['search term'], { contextWindow: 10 });
    expect(result).toContain('…');
  });

  it('should fall back to standard snippet if no match found', () => {
    const text = 'The quick brown fox jumps over the lazy dog';
    const result = generateContextualSnippet(text, ['elephant'], { maxLength: 20 });
    expect(result.length).toBeLessThanOrEqual(23); // 20 + placeholder
  });

  it('should handle multiple search terms', () => {
    const text = 'The quick brown fox jumps over the lazy dog';
    const result = generateContextualSnippet(text, ['quick', 'fox']);
    expect(result).toContain('quick');
  });
});

describe('highlightSearchTerms', () => {
  it('should wrap search terms in mark tags', () => {
    const text = 'The quick brown fox';
    const result = highlightSearchTerms(text, ['quick', 'fox']);
    expect(result).toBe('The <mark>quick</mark> brown <mark>fox</mark>');
  });

  it('should be case insensitive by default', () => {
    const text = 'The Quick Brown Fox';
    const result = highlightSearchTerms(text, ['quick', 'fox']);
    expect(result).toContain('<mark>Quick</mark>');
    expect(result).toContain('<mark>Fox</mark>');
  });

  it('should handle case sensitive matching', () => {
    const text = 'The Quick Brown Fox';
    const result = highlightSearchTerms(text, ['Quick'], true);
    expect(result).toBe('The <mark>Quick</mark> Brown Fox');
  });

  it('should escape regex special characters', () => {
    const text = 'The price is $100.00';
    const result = highlightSearchTerms(text, ['$100']);
    expect(result).toContain('<mark>$100</mark>');
  });

  it('should handle empty arrays', () => {
    const text = 'The quick brown fox';
    const result = highlightSearchTerms(text, []);
    expect(result).toBe(text);
  });
});

describe('formatRelevance', () => {
  it('should format to 3 decimal places by default', () => {
    expect(formatRelevance(0.847392)).toBe('0.847');
  });

  it('should format to custom precision', () => {
    expect(formatRelevance(0.847392, 2)).toBe('0.85');
    expect(formatRelevance(0.847392, 4)).toBe('0.8474');
  });

  it('should handle whole numbers', () => {
    expect(formatRelevance(1.0)).toBe('1.000');
  });
});

describe('formatLatency', () => {
  it('should format milliseconds', () => {
    expect(formatLatency(45.678)).toBe('45.7ms');
  });

  it('should format seconds for large values', () => {
    expect(formatLatency(1234.5)).toBe('1.23s');
  });

  it('should handle very small values', () => {
    expect(formatLatency(0.5)).toBe('0.5ms');
  });
});

describe('extractSearchTerms', () => {
  it('should split query into words', () => {
    const result = extractSearchTerms('quick brown fox');
    expect(result).toEqual(['quick', 'brown', 'fox']);
  });

  it('should extract quoted phrases', () => {
    const result = extractSearchTerms('"quick brown" fox');
    expect(result).toEqual(['quick brown', 'fox']);
  });

  it('should handle multiple quoted phrases', () => {
    const result = extractSearchTerms('"machine learning" "artificial intelligence" AI');
    expect(result).toEqual(['machine learning', 'artificial intelligence', 'AI']);
  });

  it('should handle empty query', () => {
    const result = extractSearchTerms('');
    expect(result).toEqual([]);
  });

  it('should filter out empty strings', () => {
    const result = extractSearchTerms('  word1   word2  ');
    expect(result).toEqual(['word1', 'word2']);
  });
});

describe('calculateSearchMetrics', () => {
  it('should calculate correct latency', () => {
    const metrics = calculateSearchMetrics(100, 250, 'test', 10, 100);
    expect(metrics.latencyMs).toBe(150);
  });

  it('should include all required fields', () => {
    const metrics = calculateSearchMetrics(100, 200, 'query', 5, 50, 'vector');
    expect(metrics).toMatchObject({
      query: 'query',
      returnedResults: 5,
      totalResults: 50,
      latencyMs: 100,
      searchMethod: 'vector'
    });
    expect(metrics.timestamp).toBeInstanceOf(Date);
  });
});

describe('validateSearchQuery', () => {
  it('should validate correct queries', () => {
    const result = validateSearchQuery('valid query');
    expect(result.valid).toBe(true);
    expect(result.sanitized).toBe('valid query');
  });

  it('should reject empty queries by default', () => {
    const result = validateSearchQuery('   ');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('empty');
  });

  it('should allow empty queries if configured', () => {
    const result = validateSearchQuery('', { allowEmpty: true });
    expect(result.valid).toBe(true);
  });

  it('should reject queries below minimum length', () => {
    const result = validateSearchQuery('ab', { minLength: 3 });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('at least 3');
  });

  it('should reject queries above maximum length', () => {
    const result = validateSearchQuery('a'.repeat(101), { maxLength: 100 });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('not exceed 100');
  });

  it('should reject queries with forbidden characters', () => {
    const result = validateSearchQuery('query<script>', { forbiddenChars: /<|>/ });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('invalid characters');
  });

  it('should trim whitespace', () => {
    const result = validateSearchQuery('  query  ');
    expect(result.sanitized).toBe('query');
  });
});

describe('parseSearchQuery', () => {
  it('should extract simple terms', () => {
    const result = parseSearchQuery('machine learning AI');
    expect(result.terms).toEqual(['machine', 'learning', 'AI']);
    expect(result.filters).toEqual({});
  });

  it('should extract filters', () => {
    const result = parseSearchQuery('type:document status:active python');
    expect(result.terms).toEqual(['python']);
    expect(result.filters).toEqual({ type: 'document', status: 'active' });
  });

  it('should handle mixed filters and terms', () => {
    const result = parseSearchQuery('category:ml language:python machine learning');
    expect(result.terms).toEqual(['machine', 'learning']);
    expect(result.filters).toMatchObject({
      category: 'ml',
      language: 'python'
    });
  });

  it('should handle empty query', () => {
    const result = parseSearchQuery('');
    expect(result.terms).toEqual([]);
    expect(result.filters).toEqual({});
    expect(result.rawQuery).toBe('');
  });

  it('should preserve raw query', () => {
    const query = 'type:doc machine learning';
    const result = parseSearchQuery(query);
    expect(result.rawQuery).toBe(query);
  });
});
