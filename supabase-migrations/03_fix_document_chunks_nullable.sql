-- Fix document_chunks table to allow nullable document_id
-- This allows embedding generation without requiring a document record

ALTER TABLE document_chunks 
ALTER COLUMN document_id DROP NOT NULL;

-- Update the foreign key constraint to allow NULL values
ALTER TABLE document_chunks 
DROP CONSTRAINT IF EXISTS document_chunks_document_id_fkey;

ALTER TABLE document_chunks 
ADD CONSTRAINT document_chunks_document_id_fkey 
FOREIGN KEY (document_id) REFERENCES rag_documents(id) ON DELETE CASCADE;
