-- Quick debug: Check what's in the database right now
-- Run this in Supabase SQL Editor

-- 1. What filenames exist?
SELECT DISTINCT 
  filename,
  COUNT(*) as chunk_count,
  MAX(created_at) as last_uploaded
FROM document_chunks
GROUP BY filename
ORDER BY last_uploaded DESC;

-- 2. What are the exact chunk details?
SELECT 
  filename,
  chunk_index,
  LENGTH(chunk_text) as text_length,
  LENGTH(embedding::text) as embedding_length,
  (embedding IS NOT NULL) as has_valid_embedding,
  substring(chunk_text, 1, 300) as text_preview,
  created_at
FROM document_chunks
ORDER BY created_at DESC
LIMIT 5;

-- 3. Test the match function with NO filters
SELECT 
  filename,
  chunk_index,
  similarity,
  substring(chunk_text, 1, 200) as preview
FROM match_document_chunks(
  query_embedding := (
    SELECT embedding::text 
    FROM document_chunks 
    ORDER BY created_at DESC 
    LIMIT 1
  ),
  match_threshold := 0.1,  -- Very low for testing
  match_count := 5,
  filter_document_id := NULL,
  filter_filename := NULL  -- No filter to test if function works at all
)
ORDER BY similarity DESC;

-- 4. Check if embeddings are actually vectors or just NULL
SELECT 
  COUNT(*) as total_chunks,
  COUNT(embedding) as chunks_with_embeddings,
  COUNT(*) FILTER (WHERE embedding IS NOT NULL) as non_null_embeddings,
  COUNT(*) FILTER (WHERE array_length(embedding::real[], 1) > 0) as valid_vector_embeddings
FROM document_chunks;

