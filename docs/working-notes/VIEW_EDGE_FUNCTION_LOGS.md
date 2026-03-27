# 📊 View Supabase Edge Function Logs

## Option 1: Supabase Dashboard (Easiest)

1. Go to: https://supabase.com/dashboard/project/joqnpibrfzqflyogrkht/logs/edge-functions

2. Select the function:
   - `process-pdf-ocr`
   - `generate-embeddings`
   - `rag-query`

3. Look at the latest logs

---

## Option 2: CLI (Real-time streaming)

The CLI doesn't support `--limit`, but you can stream logs in real-time.

### Start log streaming:

```bash
cd /Users/patrickjaritz/CODE/document-intelligence-suite

# Stream all Edge Functions logs
supabase functions serve --no-verify-jwt
```

**Note**: This starts a local Functions server. For production logs, use the Dashboard (Option 1).

---

## Option 3: Direct API (Advanced)

You can query logs via the Supabase Management API, but the Dashboard is much easier.

---

## ✅ Since Database Content Is Good

If you see chunks in the database with actual text, the issue is likely:

### Possible Issue: Query Not Matching

The RAG search uses **semantic similarity**. If your question doesn't semantically match the document content, it won't find results.

### Debug Query:

Run this SQL to see what chunks exist and their content:

```sql
-- See all chunks from your latest upload
SELECT 
  filename,
  chunk_index,
  substring(chunk_text, 1, 500) as chunk_preview
FROM document_chunks
ORDER BY created_at DESC
LIMIT 5;
```

### Test Questions:

Based on what you see in `chunk_preview`, ask a question that directly relates to that content.

**For example**:
- If the preview shows "Company ABC reported revenue of..."
- Ask: "What was the company's revenue?"

---

## 🔍 Next Steps

**Please share**:

1. **The filename** you uploaded
2. **The question** you asked
3. **A sample of the chunk_text** from the SQL query above

This will help me understand why the semantic search isn't finding matches! 🎯

