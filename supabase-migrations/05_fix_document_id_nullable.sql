-- Migration to make document_id nullable in document_chunks table
-- This allows inserting chunks even when rag_documents record doesn't exist

-- First, let's check if the column is already nullable
DO $$
BEGIN
    -- Check if document_id column exists and is NOT NULL
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'document_chunks' 
        AND column_name = 'document_id' 
        AND is_nullable = 'NO'
    ) THEN
        -- Make the column nullable
        ALTER TABLE document_chunks ALTER COLUMN document_id DROP NOT NULL;
        RAISE NOTICE 'Made document_id column nullable in document_chunks table';
    ELSE
        RAISE NOTICE 'document_id column is already nullable or does not exist';
    END IF;
END $$;
