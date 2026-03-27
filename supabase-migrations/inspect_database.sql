-- =====================================================
-- Inspect Database Contents
-- =====================================================

-- 1. Show ALL chunks with details
SELECT 
  id,
  filename,
  chunk_index,
  created_at,
  substring(chunk_text, 1, 200) as text_preview,
  length(chunk_text) as text_length
FROM document_chunks
ORDER BY created_at DESC;

-- 2. Group by unique text to see if there are duplicates
SELECT 
  COUNT(*) as count,
  filename,
  substring(chunk_text, 1, 100) as text_preview
FROM document_chunks
GROUP BY filename, chunk_text
ORDER BY count DESC;

-- 3. Check if there are any REAL document chunks (not test messages)
SELECT 
  filename,
  COUNT(*) as chunks,
  MAX(created_at) as last_created,
  SUM(length(chunk_text)) as total_text_length
FROM document_chunks
GROUP BY filename
ORDER BY last_created DESC;

