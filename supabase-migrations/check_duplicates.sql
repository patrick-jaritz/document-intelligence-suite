-- Check for duplicate chunks
SELECT 
  filename,
  chunk_index,
  COUNT(*) as duplicate_count,
  array_agg(id) as chunk_ids,
  array_agg(created_at) as created_dates
FROM document_chunks
WHERE filename = 'Tax filing in Austria in 2025.pdf'
GROUP BY filename, chunk_index
HAVING COUNT(*) > 1
ORDER BY chunk_index;

-- Also check total count
SELECT 
  COUNT(*) as total_chunks,
  COUNT(DISTINCT chunk_index) as unique_chunk_indices
FROM document_chunks
WHERE filename = 'Tax filing in Austria in 2025.pdf';

