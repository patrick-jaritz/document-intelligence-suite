-- Fix the match_document_chunks function to use the correct table
-- Execute this directly in the Supabase SQL editor

DROP FUNCTION IF EXISTS match_document_chunks(VECTOR, FLOAT, INT, UUID, TEXT);

CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5,
  filter_document_id UUID DEFAULT NULL,
  filter_filename TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  chunk_text TEXT,
  chunk_index INT,
  filename TEXT,
  document_id UUID,
  similarity FLOAT,
  metadata JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    document_chunks.id,
    document_chunks.chunk_text,
    document_chunks.chunk_index,
    document_chunks.filename,
    document_chunks.document_id,
    1 - (document_chunks.embedding <=> query_embedding) AS similarity,
    document_chunks.metadata
  FROM document_chunks
  WHERE 
    (filter_document_id IS NULL OR document_chunks.document_id = filter_document_id)
    AND (filter_filename IS NULL OR document_chunks.filename = filter_filename)
    AND 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY document_chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION match_document_chunks IS 'Vector similarity search for RAG retrieval using document_chunks table';
