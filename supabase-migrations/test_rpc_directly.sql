-- Test the RPC function EXACTLY as the Edge Function calls it
-- This will tell us if the RPC function itself has a bug

-- First, get an embedding to use as a test query
WITH test_embedding AS (
  SELECT embedding::text as emb_text
  FROM document_chunks 
  WHERE filename = 'Tax filing in Austria in 2025.pdf'
  LIMIT 1
)
-- Now call the RPC function exactly as the Edge Function does
SELECT 
  chunk_index,
  similarity,
  substring(chunk_text, 1, 200) as preview
FROM match_document_chunks(
  query_embedding := (SELECT emb_text FROM test_embedding),
  match_threshold := 0.5,
  match_count := 5,
  filter_document_id := NULL::TEXT,  -- Explicitly cast to TEXT
  filter_filename := 'Tax filing in Austria in 2025.pdf'
);

-- Also test with even lower threshold
SELECT 
  chunk_index,
  similarity
FROM match_document_chunks(
  query_embedding := (SELECT embedding::text FROM document_chunks WHERE filename = 'Tax filing in Austria in 2025.pdf' LIMIT 1),
  match_threshold := 0.1,  -- Very low
  match_count := 10,
  filter_document_id := NULL::TEXT,
  filter_filename := 'Tax filing in Austria in 2025.pdf'
);

