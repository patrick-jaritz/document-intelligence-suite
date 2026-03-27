-- Check if "Tax filing in Austria in 2025.pdf" exists in database
-- Run this in Supabase SQL Editor

-- 1. Check exact filename match
SELECT 
  filename,
  COUNT(*) as chunk_count,
  MAX(created_at) as last_upload,
  SUM(LENGTH(chunk_text)) as total_text_length
FROM document_chunks
WHERE filename = 'Tax filing in Austria in 2025.pdf'
GROUP BY filename;

-- 2. Check all filenames (to see if there's a slight difference)
SELECT DISTINCT 
  filename,
  COUNT(*) as chunks,
  MAX(created_at) as uploaded_at
FROM document_chunks
GROUP BY filename
ORDER BY uploaded_at DESC
LIMIT 10;

-- 3. Check if embeddings exist for this file
SELECT 
  chunk_index,
  LENGTH(chunk_text) as text_len,
  (embedding IS NOT NULL) as has_embedding,
  substring(chunk_text, 1, 200) as preview
FROM document_chunks
WHERE filename = 'Tax filing in Austria in 2025.pdf'
ORDER BY chunk_index
LIMIT 5;

-- 4. Test match function with this exact filename
SELECT 
  chunk_index,
  similarity,
  substring(chunk_text, 1, 200) as preview
FROM match_document_chunks(
  query_embedding := (
    SELECT embedding::text 
    FROM document_chunks 
    WHERE filename = 'Tax filing in Austria in 2025.pdf'
    LIMIT 1
  ),
  match_threshold := 0.1,  -- Very low for testing
  match_count := 5,
  filter_document_id := NULL,
  filter_filename := 'Tax filing in Austria in 2025.pdf'
)
ORDER BY similarity DESC;

-- 5. Test WITHOUT filename filter (baseline)
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
    LIMIT 1
  ),
  match_threshold := 0.1,
  match_count := 5,
  filter_document_id := NULL,
  filter_filename := NULL  -- No filter
)
ORDER BY similarity DESC;

