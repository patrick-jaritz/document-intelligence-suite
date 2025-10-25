-- Check what was actually stored from the latest upload
-- Run this in your Supabase SQL Editor

-- 1. Check all document chunks (most recent first)
SELECT 
  id,
  filename,
  created_at,
  chunk_index,
  LENGTH(chunk_text) as text_length,
  substring(chunk_text, 1, 200) as preview,
  LENGTH(embedding::text) as embedding_size
FROM document_chunks
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check if embeddings are NULL
SELECT 
  COUNT(*) as total_chunks,
  COUNT(embedding) as chunks_with_embeddings,
  COUNT(*) - COUNT(embedding) as chunks_missing_embeddings
FROM document_chunks;

-- 3. Check the exact filename you just uploaded
SELECT 
  filename,
  COUNT(*) as chunk_count,
  SUM(LENGTH(chunk_text)) as total_text_length
FROM document_chunks
WHERE created_at > NOW() - INTERVAL '10 minutes'
GROUP BY filename;

-- 4. Sample the actual text content
SELECT 
  filename,
  chunk_index,
  substring(chunk_text, 1, 500) as text_sample
FROM document_chunks
WHERE created_at > NOW() - INTERVAL '10 minutes'
ORDER BY chunk_index
LIMIT 3;

