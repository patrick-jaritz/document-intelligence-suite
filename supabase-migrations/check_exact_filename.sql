-- =====================================================
-- Check Exact Filename Match
-- =====================================================

-- 1. Show EXACT filenames in database
SELECT 
  filename,
  COUNT(*) as chunks,
  MAX(created_at) as last_created
FROM document_chunks
GROUP BY filename
ORDER BY last_created DESC;

-- 2. Check if there are chunks for BRAITER_INSIGHT.pdf
SELECT COUNT(*) as chunks_found
FROM document_chunks
WHERE filename = 'BRAITER_INSIGHT.pdf';

-- 3. Check with case-insensitive search
SELECT COUNT(*) as chunks_found_case_insensitive
FROM document_chunks
WHERE LOWER(filename) = LOWER('BRAITER_INSIGHT.pdf');

-- 4. Show all distinct filenames to see exact format
SELECT DISTINCT 
  filename,
  length(filename) as name_length,
  '"' || filename || '"' as quoted_name  -- Shows exact string with quotes
FROM document_chunks;

-- 5. Check if chunks exist but with different filename
SELECT 
  filename,
  COUNT(*) as chunks,
  substring(MAX(chunk_text), 1, 100) as sample_text
FROM document_chunks
GROUP BY filename;

