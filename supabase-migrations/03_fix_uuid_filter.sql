-- =====================================================
-- Fix UUID Filter Issue in match_document_chunks
-- =====================================================
-- 
-- Problem: Function fails when documentId is not a valid UUID (e.g., "file-doc")
-- Solution: Make the function handle invalid UUIDs gracefully
-- 
-- Safe to run multiple times
-- =====================================================

-- Drop and recreate with improved UUID handling
DROP FUNCTION IF EXISTS match_document_chunks(TEXT, FLOAT, INT, UUID, TEXT);
DROP FUNCTION IF EXISTS match_document_chunks;

CREATE FUNCTION match_document_chunks(
  query_embedding TEXT,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5,
  filter_document_id TEXT DEFAULT NULL,  -- Changed from UUID to TEXT to accept any string
  filter_filename TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  filename TEXT,
  chunk_text TEXT,
  chunk_index INTEGER,
  chunk_offset INTEGER,
  similarity FLOAT,
  metadata JSONB
)
LANGUAGE plpgsql
AS $$
DECLARE
  query_vector vector(1536);
  doc_id_uuid UUID;
BEGIN
  -- Parse JSON string to vector
  query_vector := query_embedding::vector(1536);
  
  -- Try to parse document ID as UUID, set to NULL if invalid
  BEGIN
    IF filter_document_id IS NOT NULL THEN
      doc_id_uuid := filter_document_id::UUID;
    ELSE
      doc_id_uuid := NULL;
    END IF;
  EXCEPTION
    WHEN invalid_text_representation THEN
      -- If not a valid UUID, set to NULL (will filter by filename only)
      doc_id_uuid := NULL;
  END;

  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.filename,
    dc.chunk_text,
    dc.chunk_index,
    dc.chunk_offset,
    1 - (dc.embedding <=> query_vector) AS similarity,
    dc.metadata
  FROM document_chunks dc
  WHERE
    -- Apply UUID filter only if it was valid
    (doc_id_uuid IS NULL OR dc.document_id = doc_id_uuid)
    -- Always apply filename filter if provided
    AND (filter_filename IS NULL OR dc.filename = filter_filename)
    -- Apply similarity threshold
    AND (1 - (dc.embedding <=> query_vector)) > match_threshold
  ORDER BY dc.embedding <=> query_vector
  LIMIT match_count;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION match_document_chunks TO anon, authenticated, service_role;

-- =====================================================
-- Test Query
-- =====================================================
-- This should now work without errors:
-- 
-- SELECT * FROM match_document_chunks(
--   query_embedding := '[0.1, 0.2]',
--   filter_document_id := 'file-doc',  -- Not a valid UUID, but won't error
--   filter_filename := 'test.pdf',
--   match_count := 5
-- );
-- =====================================================

