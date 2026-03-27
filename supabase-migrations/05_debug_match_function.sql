-- Add debug logging to the match_document_chunks function
-- This will help us see what's actually happening inside the function

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
  total_chunks_before_filter INTEGER;
  chunks_after_filename_filter INTEGER;
  chunks_after_similarity_filter INTEGER;
BEGIN
  -- Parse JSON string to vector
  RAISE NOTICE 'Parsing embedding string of length: %', LENGTH(query_embedding);
  query_vector := query_embedding::vector(1536);
  RAISE NOTICE 'Successfully parsed to vector';
  
  -- Try to parse document ID as UUID, set to NULL if invalid
  BEGIN
    IF filter_document_id IS NOT NULL THEN
      doc_id_uuid := filter_document_id::UUID;
      RAISE NOTICE 'Using document_id filter: %', doc_id_uuid;
    ELSE
      doc_id_uuid := NULL;
      RAISE NOTICE 'No document_id filter (NULL)';
    END IF;
  EXCEPTION
    WHEN invalid_text_representation THEN
      doc_id_uuid := NULL;
      RAISE NOTICE 'Invalid document_id, using NULL';
  END;

  -- Count total chunks
  SELECT COUNT(*) INTO total_chunks_before_filter FROM document_chunks;
  RAISE NOTICE 'Total chunks in database: %', total_chunks_before_filter;

  -- Count chunks after filename filter
  IF filter_filename IS NOT NULL THEN
    SELECT COUNT(*) INTO chunks_after_filename_filter 
    FROM document_chunks dc
    WHERE dc.filename = filter_filename;
    RAISE NOTICE 'Chunks matching filename "%": %', filter_filename, chunks_after_filename_filter;
  END IF;

  -- Count chunks after all filters
  SELECT COUNT(*) INTO chunks_after_similarity_filter
  FROM document_chunks dc
  WHERE
    (doc_id_uuid IS NULL OR dc.document_id = doc_id_uuid)
    AND (filter_filename IS NULL OR dc.filename = filter_filename)
    AND (1 - (dc.embedding <=> query_vector)) >= match_threshold;
  
  RAISE NOTICE 'Chunks matching all filters (including similarity >= %): %', match_threshold, chunks_after_similarity_filter;

  -- Return the actual query
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
    (doc_id_uuid IS NULL OR dc.document_id = doc_id_uuid)
    AND (filter_filename IS NULL OR dc.filename = filter_filename)
    AND (1 - (dc.embedding <=> query_vector)) >= match_threshold
  ORDER BY dc.embedding <=> query_vector
  LIMIT match_count;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION match_document_chunks TO anon, authenticated, service_role;

