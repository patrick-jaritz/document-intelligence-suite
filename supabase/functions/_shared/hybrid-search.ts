/**
 * Hybrid Search Implementation
 * Inspired by RAGFlow's hybrid retrieval (vector + keyword + fusion re-ranking)
 * 
 * Combines multiple search methods for better retrieval accuracy:
 * - Vector similarity search (existing)
 * - Keyword/BM25-style search (new)
 * - Fusion re-ranking (combines both)
 */

export interface SearchResult {
  id: string;
  chunk_text: string;
  chunk_index: number;
  filename: string;
  document_id: string;
  similarity?: number;
  bm25Score?: number;
  fusionScore?: number;
  metadata?: any;
}

export interface HybridSearchOptions {
  query: string;
  vectorEmbedding?: number[];
  useVectorSearch?: boolean;
  useKeywordSearch?: boolean;
  fusionAlpha?: number; // Weight for vector vs keyword (0.0 = all keyword, 1.0 = all vector)
  topK?: number;
  minSimilarity?: number;
}

// =============================================================================
// BM25 Keyword Search Implementation
// =============================================================================

/**
 * Tokenize text into words
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .split(/\s+/)
    .filter(token => token.length > 2); // Filter short words
}

/**
 * Calculate BM25 score for a document given a query
 * BM25 is a ranking function used for information retrieval
 */
function calculateBM25(
  queryTokens: string[],
  documentTokens: string[],
  avgDocLength: number,
  totalDocs: number,
  docFrequencies: Map<string, number>,
  k1: number = 1.5,
  b: number = 0.75
): number {
  const docLength = documentTokens.length;
  const tokenCounts = new Map<string, number>();
  
  // Count token occurrences in document
  for (const token of documentTokens) {
    tokenCounts.set(token, (tokenCounts.get(token) || 0) + 1);
  }
  
  let score = 0;
  
  for (const queryToken of queryTokens) {
    const tf = tokenCounts.get(queryToken) || 0; // Term frequency
    const df = docFrequencies.get(queryToken) || 0; // Document frequency
    
    if (tf === 0) continue;
    
    // IDF (Inverse Document Frequency)
    const idf = Math.log((totalDocs - df + 0.5) / (df + 0.5) + 1);
    
    // BM25 formula
    const numerator = tf * (k1 + 1);
    const denominator = tf + k1 * (1 - b + b * (docLength / avgDocLength));
    
    score += idf * (numerator / denominator);
  }
  
  return score;
}

/**
 * Perform keyword search on chunks using BM25
 */
export function performKeywordSearch(
  query: string,
  chunks: any[],
  topK: number = 10
): SearchResult[] {
  console.log('🔍 Performing keyword search with BM25:', {
    query,
    chunkCount: chunks.length,
    topK
  });
  
  const queryTokens = tokenize(query);
  
  if (queryTokens.length === 0) {
    console.warn('⚠️ No query tokens after tokenization');
    return [];
  }
  
  console.log('📝 Query tokens:', queryTokens);
  
  // Tokenize all documents and calculate statistics
  const documentTokens = chunks.map(chunk => tokenize(chunk.chunk_text || ''));
  const avgDocLength = documentTokens.reduce((sum, tokens) => sum + tokens.length, 0) / documentTokens.length;
  const totalDocs = chunks.length;
  
  // Calculate document frequencies
  const docFrequencies = new Map<string, number>();
  for (const tokens of documentTokens) {
    const uniqueTokens = new Set(tokens);
    for (const token of uniqueTokens) {
      docFrequencies.set(token, (docFrequencies.get(token) || 0) + 1);
    }
  }
  
  // Calculate BM25 scores for all chunks
  const scoredChunks = chunks.map((chunk, i) => {
    const bm25Score = calculateBM25(
      queryTokens,
      documentTokens[i],
      avgDocLength,
      totalDocs,
      docFrequencies
    );
    
    return {
      id: chunk.id,
      chunk_text: chunk.chunk_text,
      chunk_index: chunk.chunk_index,
      filename: chunk.filename,
      document_id: chunk.document_id,
      bm25Score,
      metadata: chunk.metadata
    };
  });
  
  // Sort by BM25 score and take top K
  scoredChunks.sort((a, b) => b.bm25Score! - a.bm25Score!);
  const topResults = scoredChunks.slice(0, topK);
  
  console.log('✅ Keyword search complete:', {
    resultsCount: topResults.length,
    topScores: topResults.slice(0, 3).map(r => r.bm25Score),
    avgScore: topResults.reduce((sum, r) => sum + r.bm25Score!, 0) / topResults.length
  });
  
  return topResults;
}

// =============================================================================
// Vector Similarity Search (Existing Approach)
// =============================================================================

/**
 * Calculate cosine similarity between two vectors
 */
export function calculateCosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    console.warn('⚠️ Vector length mismatch:', { aLength: a.length, bLength: b.length });
    return 0;
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);
  
  if (normA === 0 || normB === 0) {
    return 0;
  }
  
  return dotProduct / (normA * normB);
}

/**
 * Perform vector similarity search on chunks
 */
export function performVectorSearch(
  queryEmbedding: number[],
  chunks: any[],
  topK: number = 10,
  minSimilarity: number = 0.0
): SearchResult[] {
  console.log('🔍 Performing vector similarity search:', {
    chunkCount: chunks.length,
    topK,
    minSimilarity,
    embeddingLength: queryEmbedding.length
  });
  
  const scoredChunks = chunks.map(chunk => {
    // Parse embedding if it's a string
    let chunkEmbedding = chunk.embedding;
    if (typeof chunkEmbedding === 'string') {
      try {
        chunkEmbedding = JSON.parse(chunkEmbedding);
      } catch (e) {
        console.warn('⚠️ Failed to parse chunk embedding:', chunk.id);
        return null;
      }
    }
    
    if (!Array.isArray(chunkEmbedding)) {
      console.warn('⚠️ Invalid chunk embedding:', chunk.id);
      return null;
    }
    
    const similarity = calculateCosineSimilarity(queryEmbedding, chunkEmbedding);
    
    return {
      id: chunk.id,
      chunk_text: chunk.chunk_text,
      chunk_index: chunk.chunk_index,
      filename: chunk.filename,
      document_id: chunk.document_id,
      similarity,
      metadata: chunk.metadata
    };
  }).filter(Boolean) as SearchResult[];
  
  // Sort by similarity and filter by threshold
  scoredChunks.sort((a, b) => b.similarity! - a.similarity!);
  const filteredChunks = scoredChunks.filter(chunk => chunk.similarity! >= minSimilarity);
  const topResults = filteredChunks.slice(0, topK);
  
  console.log('✅ Vector search complete:', {
    resultsCount: topResults.length,
    topSimilarities: topResults.slice(0, 3).map(r => r.similarity),
    avgSimilarity: topResults.reduce((sum, r) => sum + r.similarity!, 0) / topResults.length
  });
  
  return topResults;
}

// =============================================================================
// Reciprocal Rank Fusion (RRF)
// Combines rankings from multiple search methods
// =============================================================================

/**
 * Reciprocal Rank Fusion (RRF) for combining multiple rankings
 * RRF(d) = Σ 1 / (k + rank(d))
 * 
 * This is a simple but effective method for combining rankings from different sources
 */
function calculateRRF(rank: number, k: number = 60): number {
  return 1 / (k + rank);
}

/**
 * Combine vector and keyword search results using Reciprocal Rank Fusion
 */
export function fusionRerank(
  vectorResults: SearchResult[],
  keywordResults: SearchResult[],
  alpha: number = 0.5 // Weight: 0.0 = all keyword, 1.0 = all vector
): SearchResult[] {
  console.log('🔀 Fusion re-ranking:', {
    vectorCount: vectorResults.length,
    keywordCount: keywordResults.length,
    alpha
  });
  
  // Create a map of all unique documents
  const allDocs = new Map<string, SearchResult>();
  
  // Add vector results
  vectorResults.forEach((result, rank) => {
    const rrfScore = calculateRRF(rank);
    allDocs.set(result.id, {
      ...result,
      fusionScore: alpha * rrfScore
    });
  });
  
  // Add keyword results (merge with existing if present)
  keywordResults.forEach((result, rank) => {
    const rrfScore = calculateRRF(rank);
    const existing = allDocs.get(result.id);
    
    if (existing) {
      // Document appears in both - combine scores
      existing.fusionScore = (existing.fusionScore || 0) + (1 - alpha) * rrfScore;
      existing.bm25Score = result.bm25Score;
    } else {
      // Document only in keyword results
      allDocs.set(result.id, {
        ...result,
        fusionScore: (1 - alpha) * rrfScore
      });
    }
  });
  
  // Convert to array and sort by fusion score
  const fusedResults = Array.from(allDocs.values());
  fusedResults.sort((a, b) => b.fusionScore! - a.fusionScore!);
  
  console.log('✅ Fusion re-ranking complete:', {
    totalUniqueResults: fusedResults.length,
    topFusionScores: fusedResults.slice(0, 3).map(r => r.fusionScore),
    inBoth: fusedResults.filter(r => r.similarity !== undefined && r.bm25Score !== undefined).length
  });
  
  return fusedResults;
}

// =============================================================================
// Hybrid Search (Main Entry Point)
// =============================================================================

/**
 * Perform hybrid search combining vector and keyword search with fusion re-ranking
 */
export function performHybridSearch(
  chunks: any[],
  options: HybridSearchOptions
): SearchResult[] {
  const {
    query,
    vectorEmbedding,
    useVectorSearch = true,
    useKeywordSearch = true,
    fusionAlpha = 0.5,
    topK = 10,
    minSimilarity = 0.0
  } = options;
  
  console.log('🚀 Starting hybrid search:', {
    query,
    chunkCount: chunks.length,
    useVectorSearch,
    useKeywordSearch,
    fusionAlpha,
    topK
  });
  
  // Validate inputs
  if (!useVectorSearch && !useKeywordSearch) {
    console.warn('⚠️ Both search methods disabled, defaulting to vector search');
    return performVectorSearch(vectorEmbedding || [], chunks, topK, minSimilarity);
  }
  
  // Perform vector search if enabled
  let vectorResults: SearchResult[] = [];
  if (useVectorSearch && vectorEmbedding && vectorEmbedding.length > 0) {
    vectorResults = performVectorSearch(vectorEmbedding, chunks, topK * 2, minSimilarity);
  }
  
  // Perform keyword search if enabled
  let keywordResults: SearchResult[] = [];
  if (useKeywordSearch && query) {
    keywordResults = performKeywordSearch(query, chunks, topK * 2);
  }
  
  // If only one method is used, return those results
  if (!useVectorSearch) {
    return keywordResults.slice(0, topK);
  }
  if (!useKeywordSearch) {
    return vectorResults.slice(0, topK);
  }
  
  // Combine results using fusion re-ranking
  const fusedResults = fusionRerank(vectorResults, keywordResults, fusionAlpha);
  
  console.log('✅ Hybrid search complete:', {
    finalResultCount: Math.min(fusedResults.length, topK),
    vectorOnlyCount: vectorResults.length - keywordResults.filter(kr => 
      vectorResults.some(vr => vr.id === kr.id)
    ).length,
    keywordOnlyCount: keywordResults.length - vectorResults.filter(vr => 
      keywordResults.some(kr => kr.id === vr.id)
    ).length,
    bothCount: vectorResults.filter(vr => 
      keywordResults.some(kr => kr.id === vr.id)
    ).length
  });
  
  return fusedResults.slice(0, topK);
}

// =============================================================================
// Search Strategy Selection
// =============================================================================

export type SearchStrategy = 'vector' | 'keyword' | 'hybrid';

/**
 * Automatically select best search strategy based on query
 */
export function selectSearchStrategy(query: string): SearchStrategy {
  // If query is very short or has few words, prefer keyword search
  const wordCount = query.split(/\s+/).length;
  if (wordCount <= 2) {
    return 'keyword';
  }
  
  // If query contains special characters or exact phrases, prefer keyword
  if (query.includes('"') || query.includes("'")) {
    return 'keyword';
  }
  
  // For longer, semantic queries, prefer hybrid
  if (wordCount > 5) {
    return 'hybrid';
  }
  
  // Default to hybrid for balanced results
  return 'hybrid';
}

/**
 * Get search statistics for analysis
 */
export function getSearchStats(results: SearchResult[]): {
  count: number;
  avgSimilarity?: number;
  avgBM25Score?: number;
  avgFusionScore?: number;
  hasVector: number;
  hasKeyword: number;
  hasBoth: number;
} {
  if (results.length === 0) {
    return {
      count: 0,
      hasVector: 0,
      hasKeyword: 0,
      hasBoth: 0
    };
  }
  
  const hasVector = results.filter(r => r.similarity !== undefined).length;
  const hasKeyword = results.filter(r => r.bm25Score !== undefined).length;
  const hasBoth = results.filter(r => r.similarity !== undefined && r.bm25Score !== undefined).length;
  
  const avgSimilarity = hasVector > 0
    ? results.reduce((sum, r) => sum + (r.similarity || 0), 0) / hasVector
    : undefined;
  
  const avgBM25Score = hasKeyword > 0
    ? results.reduce((sum, r) => sum + (r.bm25Score || 0), 0) / hasKeyword
    : undefined;
  
  const avgFusionScore = results.some(r => r.fusionScore !== undefined)
    ? results.reduce((sum, r) => sum + (r.fusionScore || 0), 0) / results.length
    : undefined;
  
  return {
    count: results.length,
    avgSimilarity,
    avgBM25Score,
    avgFusionScore,
    hasVector,
    hasKeyword,
    hasBoth
  };
}
