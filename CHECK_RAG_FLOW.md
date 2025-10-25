# 🔍 RAG Flow Debugging Guide

## Issue: "No relevant information found"

The RAG query returned 200 OK, but found no relevant chunks. Let's debug step by step.

---

## Step 1: Check Database Content

Run this SQL in your Supabase SQL Editor:

```sql
-- Check what was actually stored from the latest upload
SELECT 
  id,
  filename,
  created_at,
  chunk_index,
  LENGTH(chunk_text) as text_length,
  substring(chunk_text, 1, 200) as preview,
  LENGTH(embedding::text) as embedding_size
FROM document_chunks
ORDER BY created_at DESC
LIMIT 10;
```

### Expected Results:

✅ **Good**: You see rows with:
- `text_length` > 100
- `preview` shows actual document text
- `embedding_size` > 0

❌ **Bad**: 
- No rows found → OCR didn't process or embeddings failed
- `text_length` = 0 → OCR extracted empty text
- `embedding_size` = 0 or NULL → Embeddings not generated

---

## Step 2: Check Supabase Edge Function Logs

### A. Check `process-pdf-ocr` logs:

```bash
cd /Users/patrickjaritz/CODE/document-intelligence-suite
supabase functions logs process-pdf-ocr --limit 20
```

**Look for**:
- ✅ `[OCR] Extracted text length: XXX` (should be > 100)
- ❌ `OCR.space error` or `maximum page limit`
- ❌ Empty buffer or test mode messages

### B. Check `generate-embeddings` logs:

```bash
supabase functions logs generate-embeddings --limit 20
```

**Look for**:
- ✅ `Successfully stored X chunks`
- ❌ `Failed to insert` or `No chunks generated`

### C. Check `rag-query` logs:

```bash
supabase functions logs rag-query --limit 20
```

**Look for**:
- ✅ `Retrieved X chunks with similarity > 0.7`
- ❌ `No chunks found` or `similarity too low`

---

## Step 3: Enable Debug Mode in Browser

In your browser console:

```javascript
localStorage.setItem('debug', 'true');
// Then reload the page and try again
```

This will show detailed request/response logs in the console.

---

## Step 4: Test with Known Good Text

Try uploading a simple 1-page PDF with clear text like:
- A simple document you created in Word/Google Docs
- A receipt or invoice
- A text-heavy document

Avoid:
- Image-only PDFs (scanned documents without text layer)
- Complex layouts
- Very long PDFs (>3 pages for OCR.space)

---

## Step 5: Common Issues & Fixes

### Issue A: OCR.space Page Limit
**Symptom**: Error "maximum page limit of 3"
**Fix**: Use a PDF with ≤3 pages or switch to Tesseract

### Issue B: Empty Text Extraction
**Symptom**: `text_length = 0` in database
**Fix**: PDF might be image-only. Try OCR.space or Tesseract in Extract mode first to verify

### Issue C: Filename Mismatch
**Symptom**: Chunks stored but search returns nothing
**Fix**: The filename filter in `rag-query` must match exactly. Check with:

```sql
SELECT DISTINCT filename FROM document_chunks ORDER BY created_at DESC;
```

Then compare with what you're searching for.

### Issue D: Low Similarity Scores
**Symptom**: Chunks exist but similarity too low
**Fix**: Try a more specific question or check if embeddings are correct:

```sql
-- Test vector search manually
SELECT 
  chunk_text,
  1 - (embedding <=> (SELECT embedding FROM document_chunks LIMIT 1)) as similarity
FROM document_chunks
ORDER BY similarity DESC
LIMIT 5;
```

---

## Next Steps

1. **Run the SQL query** from Step 1
2. **Share the results** - let me know what you see
3. **Check the logs** using Step 2 commands
4. **Share any errors** you find

This will help us pinpoint exactly where the flow is breaking! 🔍

