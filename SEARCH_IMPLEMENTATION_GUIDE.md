# Search Implementation Guide
## Quick Start for Implementing Enhanced Search Features

**Created**: November 18, 2025  
**Based on**: abhishekkrthakur/search evaluation  
**Status**: ✅ Ready for Implementation

---

## 📋 Overview

This guide provides step-by-step instructions for implementing the enhanced search features evaluated from the abhishekkrthakur/search repository.

### What's Been Implemented

✅ **Search Utilities** (`frontend/src/utils/searchUtils.ts`)
- Snippet generation with context
- Search term highlighting
- Query parsing and validation
- Performance metrics calculation

✅ **Unified Search Service** (`frontend/src/services/unifiedSearchService.ts`)
- Cross-content-type search
- BM25-style ranking
- Search suggestions
- Metrics tracking

✅ **Comprehensive Tests** (`frontend/src/utils/__tests__/searchUtils.test.ts`)
- 39 passing tests
- Full coverage of utilities

### What's Ready to Build

The following components can be built using the existing utilities:

1. **Unified Search Page** - Single search interface for all content
2. **Enhanced Search Results** - Better result display with snippets
3. **Search Analytics** - Performance tracking and insights
4. **Search Suggestions** - Auto-complete and recommendations

---

## 🚀 Quick Implementation Examples

### 1. Using Search Utilities

#### Generate Smart Snippets

```typescript
import { generateContextualSnippet, extractSearchTerms } from '@/utils/searchUtils';

// Extract search terms from user query
const searchTerms = extractSearchTerms('machine learning AI');
// Result: ['machine', 'learning', 'AI']

// Generate snippet showing context around matches
const snippet = generateContextualSnippet(
  fullDocumentText,
  searchTerms,
  { maxLength: 360, contextWindow: 50 }
);
```

#### Highlight Search Terms

```typescript
import { highlightSearchTerms } from '@/utils/searchUtils';

const highlighted = highlightSearchTerms(
  "The quick brown fox jumps over the lazy dog",
  ["quick", "fox"]
);
// Returns: "The <mark>quick</mark> brown <mark>fox</mark> jumps..."
```

#### Validate and Parse Queries

```typescript
import { validateSearchQuery, parseSearchQuery } from '@/utils/searchUtils';

// Validate query
const validation = validateSearchQuery(userInput, {
  minLength: 2,
  maxLength: 500,
  forbiddenChars: /<script>/i
});

if (!validation.valid) {
  console.error(validation.error);
  return;
}

// Parse query to extract filters
const parsed = parseSearchQuery('type:document status:active python');
console.log(parsed);
// {
//   terms: ['python'],
//   filters: { type: 'document', status: 'active' },
//   rawQuery: 'type:document status:active python'
// }
```

### 2. Using Unified Search Service

#### Basic Search

```typescript
import { performUnifiedSearch } from '@/services/unifiedSearchService';

async function searchAll(query: string) {
  const { results, metrics } = await performUnifiedSearch({
    query,
    type: 'all',
    limit: 20
  });

  console.log(`Found ${results.length} results in ${metrics.latencyMs}ms`);
  return results;
}
```

#### Search Specific Content Type

```typescript
// Search only prompts
const { results } = await performUnifiedSearch({
  query: 'machine learning',
  type: 'prompt',
  limit: 10,
  userId: currentUser.id
});

// Search only documents
const { results } = await performUnifiedSearch({
  query: 'report',
  type: 'document',
  limit: 20
});
```

#### Get Search Suggestions

```typescript
import { getSearchSuggestions } from '@/services/unifiedSearchService';

// As user types, show suggestions
const suggestions = await getSearchSuggestions('mach');
// Returns: ['machine learning', 'machine vision', 'machine translation']
```

---

## 🎨 Building a Unified Search Page

Here's a complete example of a search page component:

```typescript
// frontend/src/pages/UnifiedSearch.tsx
import { useState, useCallback } from 'react';
import { Search, Clock, FileText } from 'lucide-react';
import { performUnifiedSearch, getSearchSuggestions } from '@/services/unifiedSearchService';
import { formatLatency } from '@/utils/searchUtils';
import type { UnifiedSearchResult } from '@/services/unifiedSearchService';

export default function UnifiedSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UnifiedSearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [latency, setLatency] = useState<number>(0);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const { results: searchResults, metrics } = await performUnifiedSearch({
        query,
        type: 'all',
        limit: 20
      });

      setResults(searchResults);
      setLatency(metrics.latencyMs);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = useCallback(async (value: string) => {
    setQuery(value);
    
    // Get suggestions as user types
    if (value.length >= 2) {
      const suggestions = await getSearchSuggestions(value);
      setSuggestions(suggestions);
    } else {
      setSuggestions([]);
    }
  }, []);

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Header */}
      <header className="text-center mb-12">
        <h1 className="text-4xl font-semibold mb-3">Search</h1>
        <p className="text-gray-600 text-lg">
          Find prompts, documents, and packs across your workspace
        </p>
      </header>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="mb-8">
        <div className="relative">
          <input
            type="search"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Search across all content..."
            className="w-full px-8 py-5 text-lg rounded-full border-2 border-gray-300 
                     focus:border-blue-500 focus:outline-none focus:ring-4 
                     focus:ring-blue-100 transition-all shadow-sm"
            autoFocus
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          
          {/* Suggestions Dropdown */}
          {suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border 
                          border-gray-200 rounded-xl shadow-lg overflow-hidden z-10">
              {suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setQuery(suggestion);
                    setSuggestions([]);
                  }}
                  className="w-full px-6 py-3 text-left hover:bg-gray-50 
                           transition-colors border-b border-gray-100 last:border-0"
                >
                  <Search className="inline w-4 h-4 mr-2 text-gray-400" />
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Search Button */}
        <div className="flex justify-center mt-4">
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-8 py-3 bg-blue-600 text-white rounded-xl font-medium
                     hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed
                     transition-colors shadow-sm"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      {/* Metrics */}
      {results.length > 0 && (
        <div className="flex items-center gap-6 text-sm text-gray-600 mb-6 pb-4 border-b">
          <span>
            <strong className="text-gray-900">{results.length}</strong> results
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {formatLatency(latency)}
          </span>
        </div>
      )}

      {/* Results */}
      <div className="space-y-6">
        {results.map((result) => (
          <article
            key={`${result.type}-${result.id}`}
            className="pb-6 border-b border-gray-200 last:border-0"
          >
            {/* Type Badge */}
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full 
                             text-xs font-medium bg-gray-100 text-gray-700">
                <FileText className="w-3 h-3 mr-1" />
                {result.type}
              </span>
              <span className="text-xs text-gray-500">
                relevance: {result.relevance.toFixed(3)}
              </span>
            </div>

            {/* Title */}
            <h3 className="text-xl mb-2">
              <a
                href={result.url}
                className="text-blue-600 hover:text-blue-800 hover:underline"
              >
                {result.title}
              </a>
            </h3>

            {/* Snippet */}
            <p className="text-gray-700 leading-relaxed">
              {result.snippet}
            </p>

            {/* Metadata */}
            {result.metadata && (
              <div className="mt-2 text-sm text-gray-500">
                {result.createdAt && (
                  <span>
                    Created: {new Date(result.createdAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            )}
          </article>
        ))}
      </div>

      {/* Empty State */}
      {!loading && query && results.length === 0 && (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg mb-2">No results found</p>
          <p className="text-gray-400">
            Try different keywords or check your spelling
          </p>
        </div>
      )}

      {/* Initial State */}
      {!query && (
        <div className="text-center py-16 text-gray-400">
          <Search className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p>Start typing to search across all your content</p>
        </div>
      )}
    </div>
  );
}
```

### Adding the Route

```typescript
// frontend/src/App.tsx
import UnifiedSearch from './pages/UnifiedSearch';

// In your routes:
<Route path="/search" element={<UnifiedSearch />} />
```

---

## 🔧 Advanced Implementations

### 1. Add BM25-Style Ranking to Database

Create a Supabase migration:

```sql
-- supabase/migrations/add_search_ranking.sql

-- Add text search vector column to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS search_vector tsvector 
GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce(filename, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(text_content, '')), 'B')
) STORED;

-- Create GIN index for fast search
CREATE INDEX IF NOT EXISTS idx_documents_search_vector 
ON documents USING GIN (search_vector);

-- Add search function with ranking
CREATE OR REPLACE FUNCTION search_documents_ranked(
  query_text TEXT,
  result_limit INT DEFAULT 10,
  result_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  filename TEXT,
  text_content TEXT,
  rank REAL,
  snippet TEXT,
  uploaded_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.filename,
    d.text_content,
    ts_rank_cd(d.search_vector, query) AS rank,
    ts_headline(
      'english', 
      d.text_content, 
      query,
      'MaxWords=50, MinWords=25, ShortWord=3'
    ) AS snippet,
    d.uploaded_at
  FROM documents d,
       plainto_tsquery('english', query_text) query
  WHERE d.search_vector @@ query
  ORDER BY rank DESC
  LIMIT result_limit
  OFFSET result_offset;
END;
$$ LANGUAGE plpgsql;
```

Apply the migration:

```bash
supabase db push
```

### 2. Use the Ranking Function

```typescript
// In unifiedSearchService.ts
async function searchDocuments(
  query: string,
  options: { limit: number; offset: number; userId?: string }
): Promise<UnifiedSearchResult[]> {
  const { limit, offset, userId } = options;

  // Use the new ranked search function
  const { data, error } = await supabase.rpc('search_documents_ranked', {
    query_text: query,
    result_limit: limit,
    result_offset: offset
  });

  if (error) throw error;

  return (data || []).map(doc => ({
    id: doc.id,
    type: 'document' as const,
    title: doc.filename || 'Untitled Document',
    snippet: doc.snippet, // Already generated by ts_headline
    content: doc.text_content,
    url: `/documents/${doc.id}`,
    relevance: doc.rank,
    metadata: {
      uploadedAt: doc.uploaded_at
    },
    createdAt: doc.uploaded_at
  }));
}
```

### 3. Add Search Analytics

```typescript
// Create a search history table
CREATE TABLE search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  query TEXT NOT NULL,
  result_count INT NOT NULL,
  latency_ms INT NOT NULL,
  search_method TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_search_history_user_id ON search_history(user_id);
CREATE INDEX idx_search_history_created_at ON search_history(created_at);
```

```typescript
// Track searches
import { supabase } from '@/lib/supabase';

async function saveSearchToHistory(
  query: string,
  resultCount: number,
  latencyMs: number,
  method: 'text' | 'vector' | 'hybrid'
) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    await supabase.from('search_history').insert({
      user_id: user.id,
      query,
      result_count: resultCount,
      latency_ms: latencyMs,
      search_method: method
    });
  }
}
```

---

## 📊 Performance Optimization

### 1. Debounce Search Suggestions

```typescript
import { debounce } from '@/utils/debounce';

const debouncedGetSuggestions = useCallback(
  debounce(async (query: string) => {
    if (query.length >= 2) {
      const suggestions = await getSearchSuggestions(query);
      setSuggestions(suggestions);
    }
  }, 300),
  []
);
```

### 2. Cache Search Results

```typescript
import { useRequestCache } from '@/utils/requestCache';

const { getCached, setCached } = useRequestCache();

async function searchWithCache(query: string) {
  const cacheKey = `search:${query}`;
  
  // Try cache first
  const cached = getCached<UnifiedSearchResult[]>(cacheKey);
  if (cached) return cached;
  
  // Perform search
  const { results } = await performUnifiedSearch({ query });
  
  // Cache for 5 minutes
  setCached(cacheKey, results, 5 * 60 * 1000);
  
  return results;
}
```

---

## 🧪 Testing

### Running Tests

```bash
cd frontend
npm test -- searchUtils.test.ts
```

### Writing New Tests

```typescript
import { describe, it, expect } from 'vitest';
import { performUnifiedSearch } from '@/services/unifiedSearchService';

describe('Unified Search', () => {
  it('should search across all content types', async () => {
    const { results } = await performUnifiedSearch({
      query: 'test',
      type: 'all',
      limit: 10
    });
    
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
  });
});
```

---

## 📝 Next Steps

1. **Add the unified search page** to your routes
2. **Apply database migrations** for BM25 ranking
3. **Implement search analytics** for insights
4. **Add search to navigation** menu
5. **Test with real data** and iterate

---

## 🎯 Expected Results

After implementation, you should see:

- ✅ **Faster search** - Optimized queries and ranking
- ✅ **Better relevance** - BM25 algorithm improves results
- ✅ **Improved UX** - Clean interface with snippets and highlighting
- ✅ **Cross-content search** - Find anything from one place
- ✅ **Performance metrics** - Visibility into search speed
- ✅ **Search suggestions** - Faster query entry

---

**Questions?** Review the evaluation document: `SEARCH_IMPLEMENTATION_EVALUATION.md`

**Need help?** Check the comprehensive tests in `frontend/src/utils/__tests__/searchUtils.test.ts`
