-- =====================================================
-- RAG Schema and Vector Search Setup
-- =====================================================
-- 
-- This migration sets up the complete RAG infrastructure:
-- 1. pgvector extension for vector similarity search
-- 2. Core tables for documents, chunks, and embeddings
-- 3. RPC function for vector similarity search
-- 4. Indexes for performance
-- 
-- Run this in your Supabase SQL Editor
-- =====================================================

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create documents table (for RAG document tracking)
CREATE TABLE IF NOT EXISTS rag_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  source_url TEXT,
  upload_date TIMESTAMPTZ DEFAULT now(),
  chunk_count INTEGER DEFAULT 0,
  embedding_provider TEXT DEFAULT 'openai',
  metadata JSONB DEFAULT '{}'::jsonb
);

-- 3. Create document_chunks table (stores text chunks with embeddings)
CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES rag_documents(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  chunk_text TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  chunk_offset INTEGER DEFAULT 0,
  embedding vector(1536),  -- OpenAI text-embedding-3-small = 1536 dimensions
  created_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- 4. Create rag_sessions table (stores Q&A history)
CREATE TABLE IF NOT EXISTS rag_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  document_id UUID REFERENCES rag_documents(id) ON DELETE SET NULL,
  filename TEXT,
  sources JSONB,
  model TEXT DEFAULT 'gpt-4o-mini',
  provider TEXT DEFAULT 'openai',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id 
  ON document_chunks(document_id);

CREATE INDEX IF NOT EXISTS idx_document_chunks_filename 
  ON document_chunks(filename);

CREATE INDEX IF NOT EXISTS idx_rag_sessions_document_id 
  ON rag_sessions(document_id);

-- 6. Create vector similarity search index (HNSW for fast ANN search)
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding 
  ON document_chunks 
  USING hnsw (embedding vector_cosine_ops);

-- 7. Drop existing function if it exists (to avoid conflicts)
DROP FUNCTION IF EXISTS match_document_chunks;

-- 8. Create RPC function for vector similarity search
CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding TEXT,  -- JSON stringified array of numbers
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
    -- Apply filters if provided
    (filter_document_id IS NULL OR dc.document_id = filter_document_id)
    AND (filter_filename IS NULL OR dc.filename = filter_filename)
    -- Apply similarity threshold
    AND (1 - (dc.embedding <=> query_vector)) > match_threshold
  ORDER BY dc.embedding <=> query_vector
  LIMIT match_count;
END;
$$;

-- 9. Enable Row Level Security (RLS)
ALTER TABLE rag_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_sessions ENABLE ROW LEVEL SECURITY;

-- 10. Create RLS policies (allow all for now - adjust based on your auth setup)
CREATE POLICY "Allow all on rag_documents" ON rag_documents
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all on document_chunks" ON document_chunks
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all on rag_sessions" ON rag_sessions
  FOR ALL USING (true) WITH CHECK (true);

-- 11. Grant execute permission on RPC function
GRANT EXECUTE ON FUNCTION match_document_chunks TO anon, authenticated, service_role;

-- =====================================================
-- Migration Complete!
-- =====================================================
-- 
-- You can now:
-- 1. Upload documents and generate embeddings
-- 2. Perform vector similarity search
-- 3. Ask questions about your documents
-- 
-- Next steps:
-- - Use the generate-embeddings Edge Function to populate document_chunks
-- - Use the rag-query Edge Function to ask questions
-- =====================================================

