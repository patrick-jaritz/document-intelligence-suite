-- ================================================================
-- RAG Integration: pgvector Extension and Tables
-- Phase 1: Without Docling (Lightweight)
-- ================================================================

-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- ================================================================
-- Document Embeddings Table
-- Stores text chunks and their vector embeddings for RAG
-- ================================================================

CREATE TABLE IF NOT EXISTS document_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Link to original document (if using PDF-Parser's documents table)
  document_id UUID, -- Can reference documents(id) if table exists
  
  -- Source information
  source_url TEXT, -- For URL-based documents
  filename TEXT NOT NULL,
  
  -- Chunk data
  chunk_text TEXT NOT NULL,
  chunk_index INT NOT NULL,
  
  -- Vector embedding (OpenAI ada-002 = 1536, Mistral = 1024)
  embedding VECTOR(1536),
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  provider VARCHAR(50) DEFAULT 'openai', -- openai, mistral, anthropic
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT check_chunk_index CHECK (chunk_index >= 0)
);

-- ================================================================
-- Indexes for Performance
-- ================================================================

-- Index for vector similarity search (IVFFlat algorithm)
-- lists = sqrt(row_count) is a good starting point
CREATE INDEX IF NOT EXISTS document_embeddings_embedding_idx 
ON document_embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Index for filtering by document_id
CREATE INDEX IF NOT EXISTS document_embeddings_document_id_idx 
ON document_embeddings(document_id) 
WHERE document_id IS NOT NULL;

-- Index for filtering by filename
CREATE INDEX IF NOT EXISTS document_embeddings_filename_idx 
ON document_embeddings(filename);

-- Index for filtering by provider
CREATE INDEX IF NOT EXISTS document_embeddings_provider_idx 
ON document_embeddings(provider);

-- ================================================================
-- RAG Chat Sessions Table
-- Stores Q&A history for each document
-- ================================================================

CREATE TABLE IF NOT EXISTS rag_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- User and document references
  user_id UUID, -- Can reference auth.users(id) if using Supabase Auth
  document_id UUID,
  filename TEXT,
  
  -- Question and answer
  question TEXT NOT NULL,
  answer TEXT,
  
  -- Retrieved sources
  sources JSONB, -- Array of {chunk_text, score, chunk_index}
  
  -- Model configuration
  model VARCHAR(100) DEFAULT 'gpt-4o-mini',
  provider VARCHAR(50) DEFAULT 'openai',
  
  -- Performance metrics
  response_time_ms INT,
  tokens_used INT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for querying session history
CREATE INDEX IF NOT EXISTS rag_sessions_user_id_idx 
ON rag_sessions(user_id) 
WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS rag_sessions_document_id_idx 
ON rag_sessions(document_id) 
WHERE document_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS rag_sessions_created_at_idx 
ON rag_sessions(created_at DESC);

-- ================================================================
-- Vector Similarity Search Function
-- Finds most similar chunks to a query embedding
-- ================================================================

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

-- ================================================================
-- Row Level Security (RLS) Policies
-- Uncomment if using Supabase Auth
-- ================================================================

-- Enable RLS
-- ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE rag_sessions ENABLE ROW LEVEL SECURITY;

-- Allow users to read all embeddings (for now - adjust as needed)
-- CREATE POLICY "Users can read all embeddings"
--   ON document_embeddings FOR SELECT
--   USING (true);

-- Allow authenticated users to insert embeddings
-- CREATE POLICY "Authenticated users can insert embeddings"
--   ON document_embeddings FOR INSERT
--   WITH CHECK (auth.role() = 'authenticated');

-- Allow users to read their own sessions
-- CREATE POLICY "Users can read own sessions"
--   ON rag_sessions FOR SELECT
--   USING (auth.uid() = user_id);

-- Allow authenticated users to insert sessions
-- CREATE POLICY "Authenticated users can insert sessions"
--   ON rag_sessions FOR INSERT
--   WITH CHECK (auth.role() = 'authenticated');

-- ================================================================
-- Helper Functions
-- ================================================================

-- Get document embedding stats
CREATE OR REPLACE FUNCTION get_document_stats(doc_id UUID)
RETURNS TABLE (
  document_id UUID,
  chunk_count BIGINT,
  avg_chunk_length FLOAT,
  total_characters BIGINT
)
LANGUAGE sql
AS $$
  SELECT
    document_id,
    COUNT(*) AS chunk_count,
    AVG(LENGTH(chunk_text)) AS avg_chunk_length,
    SUM(LENGTH(chunk_text)) AS total_characters
  FROM document_embeddings
  WHERE document_id = doc_id
  GROUP BY document_id;
$$;

-- ================================================================
-- Sample Data (for testing - remove in production)
-- ================================================================

-- Example: Insert a test embedding
-- INSERT INTO document_embeddings (filename, chunk_text, chunk_index, embedding, provider)
-- VALUES (
--   'test-document.pdf',
--   'This is a test chunk of text for RAG testing.',
--   0,
--   array_fill(0.1, ARRAY[1536])::VECTOR(1536),
--   'openai'
-- );

-- ================================================================
-- Comments and Documentation
-- ================================================================

COMMENT ON TABLE document_embeddings IS 'Stores document chunks and their vector embeddings for RAG';
COMMENT ON COLUMN document_embeddings.embedding IS 'Vector embedding (1536 dims for OpenAI, can adjust)';
COMMENT ON COLUMN document_embeddings.chunk_index IS 'Sequential index of chunk within document';
COMMENT ON COLUMN document_embeddings.metadata IS 'Additional metadata (page_number, offset, etc.)';

COMMENT ON TABLE rag_sessions IS 'Stores RAG Q&A sessions and chat history';
COMMENT ON COLUMN rag_sessions.sources IS 'JSON array of retrieved chunks with similarity scores';

COMMENT ON FUNCTION match_document_chunks IS 'Vector similarity search for RAG retrieval';

-- ================================================================
-- Migration Complete
-- ================================================================

-- Verify installation
DO $$
BEGIN
  RAISE NOTICE 'pgvector RAG migration completed successfully!';
  RAISE NOTICE 'Tables created: document_embeddings, rag_sessions';
  RAISE NOTICE 'Function created: match_document_chunks()';
  RAISE NOTICE 'Vector index created on embeddings';
END $$;

