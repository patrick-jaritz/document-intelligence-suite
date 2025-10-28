-- Make document_id nullable in document_chunks table
-- This allows inserting chunks even when rag_documents record doesn't exist
ALTER TABLE document_chunks ALTER COLUMN document_id DROP NOT NULL;