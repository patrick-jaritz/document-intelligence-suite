-- Let's bypass the RPC and test the vector search directly
-- This will show us if the issue is with the RPC function or the query itself

-- First, check what the similarity scores actually are for your question
WITH question_embedding AS (
  -- Get the embedding that the live query is using
  -- We'll simulate it by using a document embedding
  SELECT embedding FROM document_chunks 
  WHERE filename = 'Tax filing in Austria in 2025.pdf'
  LIMIT 1
)
SELECT 
  dc.chunk_index,
  dc.filename,
  1 - (dc.embedding <=> (SELECT embedding FROM question_embedding)) AS similarity,
  substring(dc.chunk_text, 1, 150) as preview
FROM document_chunks dc
WHERE dc.filename = 'Tax filing in Austria in 2025.pdf'
ORDER BY dc.embedding <=> (SELECT embedding FROM question_embedding)
LIMIT 10;

-- Now let's see what happens with different thresholds
SELECT 
  'threshold_0.1' as test,
  COUNT(*) as matching_chunks
FROM document_chunks dc
WHERE dc.filename = 'Tax filing in Austria in 2025.pdf'
  AND (1 - (dc.embedding <=> (
    SELECT embedding FROM document_chunks 
    WHERE filename = 'Tax filing in Austria in 2025.pdf' 
    LIMIT 1
  ))) >= 0.1

UNION ALL

SELECT 
  'threshold_0.3' as test,
  COUNT(*) as matching_chunks
FROM document_chunks dc
WHERE dc.filename = 'Tax filing in Austria in 2025.pdf'
  AND (1 - (dc.embedding <=> (
    SELECT embedding FROM document_chunks 
    WHERE filename = 'Tax filing in Austria in 2025.pdf' 
    LIMIT 1
  ))) >= 0.3

UNION ALL

SELECT 
  'threshold_0.5' as test,
  COUNT(*) as matching_chunks
FROM document_chunks dc
WHERE dc.filename = 'Tax filing in Austria in 2025.pdf'
  AND (1 - (dc.embedding <=> (
    SELECT embedding FROM document_chunks 
    WHERE filename = 'Tax filing in Austria in 2025.pdf' 
    LIMIT 1
  ))) >= 0.5

UNION ALL

SELECT 
  'threshold_0.7' as test,
  COUNT(*) as matching_chunks
FROM document_chunks dc
WHERE dc.filename = 'Tax filing in Austria in 2025.pdf'
  AND (1 - (dc.embedding <=> (
    SELECT embedding FROM document_chunks 
    WHERE filename = 'Tax filing in Austria in 2025.pdf' 
    LIMIT 1
  ))) >= 0.7;

