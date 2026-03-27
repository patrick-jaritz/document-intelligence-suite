-- Test if "Summarize" question can find matches
-- This simulates what the RAG query is doing

-- First, let's see what chunks exist
SELECT 
  chunk_index,
  substring(chunk_text, 1, 300) as preview
FROM document_chunks
WHERE filename = 'Tax filing in Austria in 2025.pdf'
ORDER BY chunk_index
LIMIT 5;

-- Now test the actual match function with a real embedding
-- (We'll use one of the document's own embeddings as a baseline)
SELECT 
  chunk_index,
  similarity,
  substring(chunk_text, 1, 200) as preview
FROM match_document_chunks(
  query_embedding := (
    SELECT embedding::text 
    FROM document_chunks 
    WHERE filename = 'Tax filing in Austria in 2025.pdf'
    AND chunk_index = 0
    LIMIT 1
  ),
  match_threshold := 0.5,
  match_count := 5,
  filter_document_id := NULL,
  filter_filename := 'Tax filing in Austria in 2025.pdf'
)
ORDER BY similarity DESC;

