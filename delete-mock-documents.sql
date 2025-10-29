-- SQL Script to Delete Documents with Mock OCR Content
-- 
-- Instructions:
-- 1. Go to: https://supabase.com/dashboard/project/joqnpibrfzqflyogrkht/sql/new
-- 2. Paste this SQL and click "Run"
-- 3. Review the results before deleting
--
-- This script finds and optionally deletes documents that contain mock OCR content
-- (indicated by "Document Layout Analysis" text in chunks)

-- STEP 1: Find documents with mock content (review first)
SELECT DISTINCT 
    rd.id,
    rd.filename,
    rd.upload_date,
    COUNT(dc.id) as chunk_count
FROM rag_documents rd
INNER JOIN document_chunks dc ON rd.id = dc.document_id
WHERE dc.chunk_text LIKE '%Document Layout Analysis%'
   OR dc.chunk_text LIKE '%dots.ocr Processing%'
GROUP BY rd.id, rd.filename, rd.upload_date
ORDER BY rd.upload_date DESC;

-- STEP 2: Once you've reviewed, uncomment and run this to delete:
/*
-- Delete chunks first (required due to foreign key)
DELETE FROM document_chunks 
WHERE document_id IN (
    SELECT DISTINCT rd.id
    FROM rag_documents rd
    INNER JOIN document_chunks dc ON rd.id = dc.document_id
    WHERE dc.chunk_text LIKE '%Document Layout Analysis%'
       OR dc.chunk_text LIKE '%dots.ocr Processing%'
);

-- Delete document records
DELETE FROM rag_documents 
WHERE id IN (
    SELECT DISTINCT rd.id
    FROM rag_documents rd
    INNER JOIN document_chunks dc ON rd.id = dc.document_id
    WHERE dc.chunk_text LIKE '%Document Layout Analysis%'
       OR dc.chunk_text LIKE '%dots.ocr Processing%'
);
*/

-- STEP 3: To delete a specific document by ID, use:
/*
-- Replace 'YOUR-DOCUMENT-ID' with the actual UUID
DELETE FROM document_chunks WHERE document_id = 'YOUR-DOCUMENT-ID';
DELETE FROM rag_documents WHERE id = 'YOUR-DOCUMENT-ID';
*/
