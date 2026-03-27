-- ============================================================================
-- COMPREHENSIVE RAG DEBUGGING - RUN THIS AND SHARE ALL RESULTS
-- ============================================================================

-- TEST 1: Verify chunks exist
SELECT '=== TEST 1: Chunk Count ===' as test;
SELECT 
  COUNT(*) as total_chunks,
  COUNT(DISTINCT chunk_index) as unique_indices,
  STRING_AGG(DISTINCT filename, ', ') as filenames
FROM document_chunks
WHERE filename LIKE '%Tax%';

-- TEST 2: Check for duplicates (explains why we see multiple chunk_index 0)
SELECT '=== TEST 2: Duplicate Chunks ===' as test;
SELECT 
  chunk_index,
  COUNT(*) as duplicate_count,
  STRING_AGG(id::text, ', ') as chunk_ids
FROM document_chunks
WHERE filename = 'Tax filing in Austria in 2025.pdf'
GROUP BY chunk_index
HAVING COUNT(*) > 1;

-- TEST 3: Direct vector search (baseline - should work)
SELECT '=== TEST 3: Direct Vector Search ===' as test;
SELECT 
  chunk_index,
  ROUND((1 - (embedding <=> (
    SELECT embedding FROM document_chunks 
    WHERE filename = 'Tax filing in Austria in 2025.pdf' 
    LIMIT 1
  )))::numeric, 4) AS similarity
FROM document_chunks
WHERE filename = 'Tax filing in Austria in 2025.pdf'
ORDER BY similarity DESC
LIMIT 5;

-- TEST 4: RPC function call (this is what the Edge Function uses)
SELECT '=== TEST 4: RPC Function Call ===' as test;
SELECT 
  chunk_index,
  ROUND(similarity::numeric, 4) as similarity,
  substring(chunk_text, 1, 100) as preview
FROM match_document_chunks(
  (SELECT embedding::text FROM document_chunks WHERE filename = 'Tax filing in Austria in 2025.pdf' LIMIT 1),
  0.3,
  5,
  NULL,
  'Tax filing in Austria in 2025.pdf'
);

-- TEST 5: Check function signature
SELECT '=== TEST 5: Function Signature ===' as test;
SELECT 
  specific_name,
  STRING_AGG(parameter_name || ' ' || data_type, ', ' ORDER BY ordinal_position) as parameters
FROM information_schema.parameters
WHERE specific_schema = 'public'
  AND specific_name LIKE '%match_document_chunks%'
GROUP BY specific_name;

-- TEST 6: Test with different thresholds
SELECT '=== TEST 6: Threshold Tests ===' as test;
SELECT 
  'threshold_0.1' as test_name,
  COUNT(*) as matching_chunks
FROM match_document_chunks(
  (SELECT embedding::text FROM document_chunks WHERE filename = 'Tax filing in Austria in 2025.pdf' LIMIT 1),
  0.1, 5, NULL, 'Tax filing in Austria in 2025.pdf'
)
UNION ALL
SELECT 
  'threshold_0.3',
  COUNT(*)
FROM match_document_chunks(
  (SELECT embedding::text FROM document_chunks WHERE filename = 'Tax filing in Austria in 2025.pdf' LIMIT 1),
  0.3, 5, NULL, 'Tax filing in Austria in 2025.pdf'
)
UNION ALL
SELECT 
  'threshold_0.5',
  COUNT(*)
FROM match_document_chunks(
  (SELECT embedding::text FROM document_chunks WHERE filename = 'Tax filing in Austria in 2025.pdf' LIMIT 1),
  0.5, 5, NULL, 'Tax filing in Austria in 2025.pdf'
);

-- TEST 7: Check embedding format
SELECT '=== TEST 7: Embedding Format ===' as test;
SELECT 
  LENGTH(embedding::text) as embedding_text_length,
  substring(embedding::text, 1, 100) as embedding_preview,
  array_length(embedding::real[], 1) as embedding_dimension
FROM document_chunks
WHERE filename = 'Tax filing in Austria in 2025.pdf'
LIMIT 1;

SELECT '=== ALL TESTS COMPLETE ===' as test;

