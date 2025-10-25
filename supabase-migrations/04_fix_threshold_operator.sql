-- Fix the match_document_chunks function to use >= instead of >
-- This ensures chunks with similarity exactly equal to the threshold are included

DROP FUNCTION IF EXISTS match_document_chunks(TEXT, FLOAT, INTEGER, TEXT, TEXT);

CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding TEXT,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INTEGER DEFAULT 5,
  filter_document_id TEXT DEFAULT NULL,
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
    -- Apply similarity threshold (>= instead of > to include exact matches)
    AND (1 - (dc.embedding <=> query_vector)) >= match_threshold
  ORDER BY dc.embedding <=> query_vector
  LIMIT match_count;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION match_document_chunks TO anon, authenticated, service_role;

-- Test it
SELECT 
  chunk_index,
  similarity
FROM match_document_chunks(
  (SELECT embedding::text FROM document_chunks WHERE filename = 'Tax filing in Austria in 2025.pdf' LIMIT 1),
  0.5,
  5,
  NULL,
  'Tax filing in Austria in 2025.pdf'
);

