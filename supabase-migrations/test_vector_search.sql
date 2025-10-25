-- =====================================================
-- Test Vector Search Manually
-- =====================================================

-- Step 1: Check the chunks with their embeddings
SELECT 
  filename,
  chunk_index,
  substring(chunk_text, 1, 100) as preview,
  length(embedding::text) as embedding_size,
  embedding IS NOT NULL as has_embedding
FROM document_chunks
ORDER BY created_at DESC
LIMIT 5;

-- Step 2: Test the match function with a sample embedding
-- This uses an actual embedding from the database to search
WITH sample AS (
  SELECT embedding, filename
  FROM document_chunks
  ORDER BY created_at DESC
  LIMIT 1
)
SELECT 
  chunk_text,
  similarity,
  chunk_index
FROM match_document_chunks(
  query_embedding := (SELECT embedding::text FROM sample),
  match_threshold := 0.0,  -- Very low threshold
  match_count := 5,
  filter_filename := (SELECT filename FROM sample)
);

-- Step 3: Check if there's a data type issue with embeddings
SELECT 
  pg_typeof(embedding) as embedding_type,
  COUNT(*) as count
FROM document_chunks
GROUP BY pg_typeof(embedding);

