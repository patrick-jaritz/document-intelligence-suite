-- =====================================================
-- Minimal RAG Fix - Safe to Run Multiple Times
-- =====================================================
-- This is a simplified version that focuses ONLY on what's needed
-- Safe to run even if tables/functions already exist
-- =====================================================

-- 1. Enable pgvector (safe if already enabled)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create tables (safe if already exist)
CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID,
  filename TEXT NOT NULL,
  chunk_text TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  chunk_offset INTEGER DEFAULT 0,
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS rag_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  document_id UUID,
  filename TEXT,
  sources JSONB,
  model TEXT DEFAULT 'gpt-4o-mini',
  provider TEXT DEFAULT 'openai',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create indexes (safe if already exist)
CREATE INDEX IF NOT EXISTS idx_document_chunks_filename 
  ON document_chunks(filename);

CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding 
  ON document_chunks 
  USING hnsw (embedding vector_cosine_ops);

-- 4. Drop and recreate the RPC function (ensures correct signature)
DROP FUNCTION IF EXISTS match_document_chunks(TEXT, FLOAT, INT, UUID, TEXT);
DROP FUNCTION IF EXISTS match_document_chunks;

CREATE FUNCTION match_document_chunks(
  query_embedding TEXT,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5,
  filter_document_id UUID DEFAULT NULL,
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
BEGIN
  -- Parse JSON string to vector
  query_vector := query_embedding::vector(1536);

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
    (filter_document_id IS NULL OR dc.document_id = filter_document_id)
    AND (filter_filename IS NULL OR dc.filename = filter_filename)
    AND (1 - (dc.embedding <=> query_vector)) > match_threshold
  ORDER BY dc.embedding <=> query_vector
  LIMIT match_count;
END;
$$;

-- 5. Enable RLS and create permissive policies
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on document_chunks" ON document_chunks;
DROP POLICY IF EXISTS "Allow all on rag_sessions" ON rag_sessions;

CREATE POLICY "Allow all on document_chunks" ON document_chunks
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all on rag_sessions" ON rag_sessions
  FOR ALL USING (true) WITH CHECK (true);

-- 6. Grant permissions
GRANT ALL ON document_chunks TO anon, authenticated, service_role;
GRANT ALL ON rag_sessions TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION match_document_chunks TO anon, authenticated, service_role;

-- =====================================================
-- Verification Query
-- =====================================================
-- Run this after to verify everything works:
-- 
-- SELECT 
--   (SELECT COUNT(*) FROM document_chunks) as chunks,
--   (SELECT COUNT(*) FROM rag_sessions) as sessions,
--   (SELECT COUNT(*) FROM pg_proc WHERE proname = 'match_document_chunks') as function_exists;
--
-- Expected result:
-- chunks: 0 (or more if you've uploaded documents)
-- sessions: 0 (or more if you've asked questions)  
-- function_exists: 1
-- =====================================================

