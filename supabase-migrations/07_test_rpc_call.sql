-- Test calling the match_document_chunks RPC exactly as the Edge Function would
-- This will tell us if the RPC works when called from SQL

-- Get an embedding string (JSON format)
WITH embedding_string AS (
  SELECT embedding::text as emb_str
  FROM document_chunks 
  WHERE filename = 'Tax filing in Austria in 2025.pdf'
  LIMIT 1
)
-- Call the RPC function
SELECT 
  chunk_index,
  similarity,
  substring(chunk_text, 1, 150) as preview
FROM match_document_chunks(
  (SELECT emb_str FROM embedding_string),
  0.3,
  5,
  NULL,
  'Tax filing in Austria in 2025.pdf'
);

