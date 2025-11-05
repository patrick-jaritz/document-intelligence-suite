# RAG "No Matches Found" Troubleshooting Guide

## 🔍 Issue

RAG query returns: **"No relevant information found in the document to answer this question."**

This happens when `matches.length === 0` after the similarity search.

---

## 🎯 Common Causes

### 1. **Document Not Processed Yet** ❌
- **Symptom**: Document uploaded but embeddings not generated
- **Check**: Look for `generate-embeddings` logs in Supabase
- **Fix**: Re-process the document or wait for embedding generation to complete

### 2. **Wrong Document Selected** ❌
- **Symptom**: Querying "All Documents" or wrong document ID
- **Check**: Console logs show `documentId: undefined` or wrong ID
- **Fix**: Select a specific document before querying

### 3. **Document ID Mismatch** ❌
- **Symptom**: Document exists but chunks have different document_id
- **Check**: Supabase logs show "documentId mismatch" warnings
- **Fix**: Check database consistency or re-process document

### 4. **No Embeddings Generated** ❌
- **Symptom**: Chunks exist but `embedding` column is NULL
- **Check**: Run SQL: `SELECT COUNT(*) FROM document_chunks WHERE embedding IS NULL`
- **Fix**: Re-run embedding generation

### 5. **Query Too Short/Generic** ⚠️
- **Symptom**: Question like "Summarize" may not match document content
- **Check**: Try a more specific question about document content
- **Fix**: Ask specific questions about document content

### 6. **Similarity Too Low** ⚠️
- **Symptom**: Chunks found but all similarities < 0.3
- **Check**: Logs show similarity scores
- **Fix**: Try rephrasing question or check if document content matches query intent

---

## 🔧 Debugging Steps

### Step 1: Check Browser Console

Look for these logs:
```javascript
✅ Supabase search completed: {
  matchesFound: 0,  // ← This tells you if chunks were found
  documentId: "...",
  filename: "..."
}
```

**If `matchesFound: 0`**: Document may not exist or not processed

### Step 2: Check Supabase Edge Function Logs

```bash
supabase functions logs rag-query --limit 50
```

Look for:
- ✅ `🔍 Applying documentId filter:` - Shows which document is being queried
- ✅ `✅ Supabase query successful:` - Shows if chunks were found
- ❌ `⚠️ No chunks found with filters:` - Document doesn't exist
- ❌ `❌ No matches found after similarity calculation:` - Chunks found but no matches

### Step 3: Check Database Directly

Run in Supabase SQL Editor:

```sql
-- Check if document exists
SELECT 
  id,
  filename,
  upload_date,
  embedding_provider
FROM rag_documents
WHERE id = 'YOUR_DOCUMENT_ID'
ORDER BY upload_date DESC
LIMIT 1;

-- Check if chunks exist for this document
SELECT 
  COUNT(*) as chunk_count,
  COUNT(embedding) as chunks_with_embeddings,
  MIN(chunk_index) as first_chunk,
  MAX(chunk_index) as last_chunk
FROM document_chunks
WHERE document_id = 'YOUR_DOCUMENT_ID';

-- Check chunk content
SELECT 
  chunk_index,
  LENGTH(chunk_text) as text_length,
  substring(chunk_text, 1, 200) as preview,
  embedding IS NOT NULL as has_embedding
FROM document_chunks
WHERE document_id = 'YOUR_DOCUMENT_ID'
ORDER BY chunk_index
LIMIT 5;
```

**Expected Results**:
- ✅ Document exists in `rag_documents`
- ✅ Chunks exist in `document_chunks` with `document_id` matching
- ✅ `chunks_with_embeddings` > 0 (embeddings generated)
- ✅ `text_length` > 0 (chunks have content)

### Step 4: Test with Simple Query

Try a very specific question about your document:
- ❌ **Bad**: "Summarize" (too generic)
- ✅ **Good**: "What is the main topic discussed in section 2?"
- ✅ **Good**: "List the key findings mentioned in the document"

---

## ✅ Quick Fixes

### Fix 1: Re-process Document

1. Delete the document from the UI
2. Re-upload the document
3. Wait for processing to complete (check status)
4. Try querying again

### Fix 2: Select Specific Document

1. **Don't** use "All Documents"
2. Select a specific document from the dropdown
3. Ensure the document shows "Ready" status
4. Try querying again

### Fix 3: Check Document Status

1. Check if document status is "ready" (not "processing" or "failed")
2. If "processing", wait for it to complete
3. If "failed", check logs and re-process

### Fix 4: Verify Embeddings

Run SQL to check embeddings:
```sql
SELECT 
  filename,
  COUNT(*) as total_chunks,
  COUNT(embedding) as chunks_with_embeddings,
  COUNT(*) FILTER (WHERE embedding IS NULL) as chunks_without_embeddings
FROM document_chunks
WHERE document_id = 'YOUR_DOCUMENT_ID'
GROUP BY filename;
```

**If `chunks_without_embeddings` > 0**: Embeddings not generated - re-run embedding generation

---

## 📊 Enhanced Error Messages

The updated error message now includes:
- `documentId`: Which document was queried
- `filename`: Which filename was used
- `supabaseMatches`: How many chunks were found (0 = document not found)
- `questionLength`: Length of your question
- `embeddingGenerated`: Whether embedding was created
- `suggestion`: Actionable advice based on the situation

---

## 🎯 Next Steps

1. **Check the browser console** for detailed error logs
2. **Check Supabase Edge Function logs** for backend diagnostics
3. **Run the SQL queries** above to verify database state
4. **Try a more specific question** about your document
5. **Select a specific document** instead of "All Documents"

---

## 📝 Common Scenarios

### Scenario 1: Document Just Uploaded
- **Wait**: Processing takes 30-60 seconds
- **Check**: Document status should be "ready"
- **Verify**: Embeddings should be generated

### Scenario 2: Querying "All Documents"
- **Problem**: May search wrong document
- **Fix**: Select specific document
- **Note**: You'll see a warning dialog now

### Scenario 3: Wrong Document Selected
- **Problem**: Selected document doesn't match what you're asking about
- **Fix**: Select the correct document
- **Verify**: Check document name in dropdown

### Scenario 4: Document Not Processed
- **Problem**: Document uploaded but embeddings not generated
- **Check**: Look for errors in `generate-embeddings` logs
- **Fix**: Re-process document or check API keys

---

**Last Updated**: 2025-02-01  
**Status**: Enhanced error handling and debugging deployed

