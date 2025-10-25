-- Test vector matching to debug RAG "No results" issue
-- Run this in Supabase SQL Editor

-- STEP 1: Check what chunks exist
SELECT 
  filename,
  COUNT(*) as chunk_count,
  MIN(created_at) as first_chunk,
  MAX(created_at) as last_chunk
FROM document_chunks
GROUP BY filename
ORDER BY last_chunk DESC;

-- STEP 2: Check if embeddings exist and are valid
SELECT 
  filename,
  chunk_index,
  LENGTH(chunk_text) as text_length,
  LENGTH(embedding::text) as embedding_length,
  (embedding IS NOT NULL) as has_embedding,
  substring(chunk_text, 1, 200) as preview
FROM document_chunks
ORDER BY created_at DESC
LIMIT 5;

-- STEP 3: Test the match function with relaxed threshold
-- Replace 'YOUR_FILENAME.pdf' with your actual filename
SELECT 
  chunk_text,
  chunk_index,
  similarity,
  filename
FROM match_document_chunks(
  query_embedding := (
    -- Use the embedding from the first chunk as a test query
    -- (in real use, this comes from the question)
    SELECT embedding::text 
    FROM document_chunks 
    ORDER BY created_at DESC 
    LIMIT 1
  ),
  match_threshold := 0.1,  -- Very low threshold for testing
  match_count := 10,
  filter_document_id := NULL,
  filter_filename := 'YOUR_FILENAME.pdf'  -- Replace with your actual filename
);

-- STEP 4: Check if filename filter is the issue
-- Test WITHOUT filename filter
SELECT 
  chunk_text,
  chunk_index,
  similarity,
  filename
FROM match_document_chunks(
  query_embedding := (
    SELECT embedding::text 
    FROM document_chunks 
    ORDER BY created_at DESC 
    LIMIT 1
  ),
  match_threshold := 0.1,
  match_count := 10,
  filter_document_id := NULL,
  filter_filename := NULL  -- No filter
);

-- STEP 5: Check exact filename match
-- This helps identify filename case sensitivity or extra characters
SELECT DISTINCT 
  filename,
  LENGTH(filename) as name_length,
  encode(filename::bytea, 'hex') as hex_bytes
FROM document_chunks
ORDER BY created_at DESC
LIMIT 5;

