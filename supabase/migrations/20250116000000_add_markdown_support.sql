-- Migration: Add Markdown support to processing_jobs table
-- This migration adds columns to support Markdown conversion in the document processing pipeline

-- Add markdown_text column to store converted Markdown content
ALTER TABLE processing_jobs 
ADD COLUMN IF NOT EXISTS markdown_text TEXT;

-- Add markdown_metadata column to store conversion metadata
ALTER TABLE processing_jobs 
ADD COLUMN IF NOT EXISTS markdown_metadata JSONB;

-- Add markdown_enabled column to track if Markdown conversion was used
ALTER TABLE processing_jobs 
ADD COLUMN IF NOT EXISTS markdown_enabled BOOLEAN DEFAULT FALSE;

-- Add conversion_method column to track the conversion method used
ALTER TABLE processing_jobs 
ADD COLUMN IF NOT EXISTS conversion_method TEXT DEFAULT 'ocr-only';

-- Update rag_documents table for enhanced metadata
ALTER TABLE rag_documents 
ADD COLUMN IF NOT EXISTS markdown_enabled BOOLEAN DEFAULT FALSE;

ALTER TABLE rag_documents 
ADD COLUMN IF NOT EXISTS conversion_metadata JSONB;

ALTER TABLE rag_documents 
ADD COLUMN IF NOT EXISTS chunks_created INTEGER DEFAULT 0;

ALTER TABLE rag_documents 
ADD COLUMN IF NOT EXISTS embeddings_generated BOOLEAN DEFAULT FALSE;

-- Create index on markdown_enabled for better query performance
CREATE INDEX IF NOT EXISTS idx_processing_jobs_markdown_enabled 
ON processing_jobs(markdown_enabled);

CREATE INDEX IF NOT EXISTS idx_rag_documents_markdown_enabled 
ON rag_documents(markdown_enabled);

-- Create index on conversion_method for analytics
CREATE INDEX IF NOT EXISTS idx_processing_jobs_conversion_method 
ON processing_jobs(conversion_method);

-- Add comments for documentation
COMMENT ON COLUMN processing_jobs.markdown_text IS 'Converted Markdown text from OCR output';
COMMENT ON COLUMN processing_jobs.markdown_metadata IS 'Metadata about Markdown conversion process';
COMMENT ON COLUMN processing_jobs.markdown_enabled IS 'Whether Markdown conversion was enabled for this job';
COMMENT ON COLUMN processing_jobs.conversion_method IS 'Method used for text conversion (ocr-only, ocr-markdown, etc.)';

COMMENT ON COLUMN rag_documents.markdown_enabled IS 'Whether Markdown conversion was used for this document';
COMMENT ON COLUMN rag_documents.conversion_metadata IS 'Metadata about the conversion process';
COMMENT ON COLUMN rag_documents.chunks_created IS 'Number of text chunks created for embeddings';
COMMENT ON COLUMN rag_documents.embeddings_generated IS 'Whether embeddings were successfully generated';

-- Update existing records to have default values
UPDATE processing_jobs 
SET markdown_enabled = FALSE, 
    conversion_method = 'ocr-only' 
WHERE markdown_enabled IS NULL OR conversion_method IS NULL;

UPDATE rag_documents 
SET markdown_enabled = FALSE, 
    chunks_created = 0, 
    embeddings_generated = FALSE 
WHERE markdown_enabled IS NULL 
   OR chunks_created IS NULL 
   OR embeddings_generated IS NULL;
