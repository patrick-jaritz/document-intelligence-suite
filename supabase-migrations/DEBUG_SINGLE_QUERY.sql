-- Single query version - all results in one table
WITH 
test1 AS (
  SELECT 
    'TEST 1: Chunk Count' as test_name,
    COUNT(*)::text as result,
    'total_chunks' as metric
  FROM document_chunks
  WHERE filename = 'Tax filing in Austria in 2025.pdf'
  
  UNION ALL
  
  SELECT 
    'TEST 1: Chunk Count',
    COUNT(DISTINCT chunk_index)::text,
    'unique_indices'
  FROM document_chunks
  WHERE filename = 'Tax filing in Austria in 2025.pdf'
),
test2 AS (
  SELECT 
    'TEST 2: Duplicates' as test_name,
    chunk_index::text as result,
    COUNT(*)::text as metric
  FROM document_chunks
  WHERE filename = 'Tax filing in Austria in 2025.pdf'
  GROUP BY chunk_index
  HAVING COUNT(*) > 1
  LIMIT 5
),
test3 AS (
  SELECT 
    'TEST 3: Vector Similarity' as test_name,
    chunk_index::text as result,
    ROUND((1 - (embedding <=> (
      SELECT embedding FROM document_chunks 
      WHERE filename = 'Tax filing in Austria in 2025.pdf' 
      LIMIT 1
    )))::numeric, 4)::text as metric
  FROM document_chunks
  WHERE filename = 'Tax filing in Austria in 2025.pdf'
  ORDER BY (1 - (embedding <=> (
    SELECT embedding FROM document_chunks 
    WHERE filename = 'Tax filing in Austria in 2025.pdf' 
    LIMIT 1
  ))) DESC
  LIMIT 5
),
test4 AS (
  SELECT 
    'TEST 4: RPC Function' as test_name,
    chunk_index::text as result,
    ROUND(similarity::numeric, 4)::text as metric
  FROM match_document_chunks(
    (SELECT embedding::text FROM document_chunks WHERE filename = 'Tax filing in Austria in 2025.pdf' LIMIT 1),
    0.3,
    5,
    NULL,
    'Tax filing in Austria in 2025.pdf'
  )
  LIMIT 5
)
SELECT * FROM test1
UNION ALL SELECT * FROM test2
UNION ALL SELECT * FROM test3
UNION ALL SELECT * FROM test4
ORDER BY test_name, result;

