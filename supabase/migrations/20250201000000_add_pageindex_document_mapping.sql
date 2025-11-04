-- Migration: Add PageIndex document mapping table
-- Created: 2025-02-01
-- Purpose: Store mapping between internal document IDs and PageIndex doc_ids

-- Create pageindex_documents table
CREATE TABLE IF NOT EXISTS pageindex_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Document mapping
  document_id UUID NOT NULL, -- Internal document ID (from rag_documents)
  pageindex_doc_id TEXT NOT NULL, -- PageIndex document ID
  
  -- Metadata
  filename TEXT,
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'failed')),
  error_message TEXT,
  
  -- Timestamps
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  ready_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one-to-one mapping
  UNIQUE(document_id),
  UNIQUE(pageindex_doc_id)
);

-- Add index for user lookups
CREATE INDEX IF NOT EXISTS idx_pageindex_documents_user_id 
  ON pageindex_documents(user_id);

-- Add index for document_id lookups
CREATE INDEX IF NOT EXISTS idx_pageindex_documents_document_id 
  ON pageindex_documents(document_id);

-- Add index for status filtering
CREATE INDEX IF NOT EXISTS idx_pageindex_documents_status 
  ON pageindex_documents(status);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_pageindex_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_pageindex_documents_updated_at
  BEFORE UPDATE ON pageindex_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_pageindex_documents_updated_at();

-- Enable Row Level Security
ALTER TABLE pageindex_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can read their own mappings
CREATE POLICY "Users can read own pageindex mappings"
  ON pageindex_documents
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own mappings
CREATE POLICY "Users can insert own pageindex mappings"
  ON pageindex_documents
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own mappings
CREATE POLICY "Users can update own pageindex mappings"
  ON pageindex_documents
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own mappings
CREATE POLICY "Users can delete own pageindex mappings"
  ON pageindex_documents
  FOR DELETE
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON pageindex_documents TO authenticated;
GRANT SELECT ON pageindex_documents TO anon;

