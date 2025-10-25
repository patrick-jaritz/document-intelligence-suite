-- =====================================================
-- Check if chunks are being inserted
-- =====================================================

-- Check total chunks
SELECT COUNT(*) as total_chunks FROM document_chunks;

-- Check chunks by filename
SELECT filename, COUNT(*) as chunks, MAX(created_at) as last_inserted
FROM document_chunks
GROUP BY filename
ORDER BY last_inserted DESC;

-- Check if there are any chunks at all with sample data
SELECT 
  id,
  filename,
  chunk_index,
  LENGTH(chunk_text) as text_length,
  LENGTH(embedding::text) as embedding_length,
  created_at
FROM document_chunks
ORDER BY created_at DESC
LIMIT 5;

-- Check if embeddings are NULL
SELECT 
  COUNT(*) as chunks_with_null_embeddings
FROM document_chunks
WHERE embedding IS NULL;

