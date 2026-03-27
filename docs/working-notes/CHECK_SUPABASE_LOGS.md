# 🔍 Check Supabase Edge Function Logs

## ✅ **Good News**

The payload is correct:
```json
{
  "documentId": null,  ✅
  "filename": "Tax filing in Austria in 2025.pdf"  ✅
}
```

But still getting 0 results. Let's check the server-side logs.

---

## 📊 **View Logs**

1. **Go to Supabase Dashboard**:
   https://supabase.com/dashboard/project/joqnpibrfzqflyogrkht/logs/edge-functions

2. **Select**: `rag-query` function

3. **Look for the latest request** and check these logs:

### Expected Logs:

```
✓ RPC call parameters: {
  threshold: 0.5,
  topK: 5,
  documentId: "NULL",  ← Should be NULL
  filename: "Tax filing in Austria in 2025.pdf"
}

✓ Vector search completed, found chunks: X
```

### Key Questions:

1. **Does it show `documentId: "NULL"`?** (or actual UUID?)
2. **How many chunks were found?** (should be > 0)
3. **Are there any errors?**

---

## 🔍 **If Logs Show 0 Chunks**

Run this SQL to manually test the match function:

```sql
-- Test with filename filter, no documentId filter
SELECT 
  chunk_index,
  similarity,
  substring(chunk_text, 1, 200) as preview
FROM match_document_chunks(
  query_embedding := (
    SELECT embedding::text 
    FROM document_chunks 
    WHERE filename = 'Tax filing in Austria in 2025.pdf'
    LIMIT 1
  ),
  match_threshold := 0.5,
  match_count := 5,
  filter_document_id := NULL,
  filter_filename := 'Tax filing in Austria in 2025.pdf'
)
ORDER BY similarity DESC;
```

**Expected**: Should return 5 rows with similarity > 0.5

---

## 📋 **Please Share**

1. **Screenshot or copy** of the Supabase `rag-query` logs
2. **Result** of the SQL query above

This will show us exactly what's failing! 🎯

