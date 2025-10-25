-- Test if match_document_chunks function works with your exact file
-- Run this in Supabase SQL Editor

-- Test 1: Use one of the file's own embeddings as a query (should have perfect match)
SELECT 
  chunk_index,
  similarity,
  substring(chunk_text, 1, 200) as preview
FROM match_document_chunks(
  query_embedding := (
    -- Get the embedding from chunk 0 as our test query
    SELECT embedding::text 
    FROM document_chunks 
    WHERE filename = 'Tax filing in Austria in 2025.pdf'
    AND chunk_index = 0
    LIMIT 1
  ),
  match_threshold := 0.1,  -- Very low threshold
  match_count := 5,
  filter_document_id := NULL,
  filter_filename := 'Tax filing in Austria in 2025.pdf'  -- Filter by filename
)
ORDER BY similarity DESC;

-- Test 2: Same test but WITHOUT filename filter
SELECT 
  filename,
  chunk_index,
  similarity,
  substring(chunk_text, 1, 200) as preview
FROM match_document_chunks(
  query_embedding := (
    SELECT embedding::text 
    FROM document_chunks 
    WHERE filename = 'Tax filing in Austria in 2025.pdf'
    AND chunk_index = 0
    LIMIT 1
  ),
  match_threshold := 0.1,
  match_count := 5,
  filter_document_id := NULL,
  filter_filename := NULL  -- No filter
)
ORDER BY similarity DESC;

-- Test 3: Check if the embedding is actually stored as text or vector
SELECT 
  pg_typeof(embedding) as type,
  pg_typeof(embedding::text) as text_type,
  LENGTH(embedding::text) as embedding_text_length,
  substring(embedding::text, 1, 100) as embedding_preview
FROM document_chunks 
WHERE filename = 'Tax filing in Austria in 2025.pdf'
LIMIT 1;

