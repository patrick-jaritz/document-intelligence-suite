-- Verify the function was updated correctly
-- Check the function definition
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_name = 'match_document_chunks'
AND routine_schema = 'public';

-- Test the function with a known working embedding
SELECT 
  chunk_index,
  similarity,
  substring(chunk_text, 1, 100) as preview
FROM match_document_chunks(
  (SELECT embedding::text FROM document_chunks WHERE filename = 'Tax filing in Austria in 2025.pdf' LIMIT 1),
  0.5,
  5,
  NULL,
  'Tax filing in Austria in 2025.pdf'
);

-- Also test with an even lower threshold to see if ANY chunks match
SELECT 
  chunk_index,
  similarity
FROM match_document_chunks(
  (SELECT embedding::text FROM document_chunks WHERE filename = 'Tax filing in Austria in 2025.pdf' LIMIT 1),
  0.1,  -- Very low
  10,
  NULL,
  'Tax filing in Austria in 2025.pdf'
)
ORDER BY similarity DESC;

