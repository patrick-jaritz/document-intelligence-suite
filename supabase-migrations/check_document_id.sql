-- Check what document_id values are actually stored
-- Run this in Supabase SQL Editor

SELECT DISTINCT 
  document_id,
  filename,
  COUNT(*) as chunk_count,
  MAX(created_at) as uploaded_at
FROM document_chunks
WHERE filename = 'Tax filing in Austria in 2025.pdf'
GROUP BY document_id, filename;

