# 📊 How to View Edge Function Logs

**Date**: 2025-01-15

---

## 🎯 Purpose

The `rag-query` function now has **enhanced logging** to help debug the 500 error.

---

## 🔍 View Logs in Dashboard

### Option 1: Real-Time Logs (Recommended)

1. **Go to Supabase Dashboard**:
   - https://supabase.com/dashboard/project/joqnpibrfzqflyogrkht

2. **Navigate to Edge Functions**:
   - Click **"Edge Functions"** in the left sidebar
   - Click **"rag-query"**

3. **Open Logs Tab**:
   - Click the **"Logs"** tab

4. **Test RAG Q&A**:
   - In another tab, go to your app
   - Upload a PDF and ask a question
   - Watch the logs in real-time

5. **Look for These Logs**:
   ```
   RAG query: "your question" (openai/gpt-4o-mini)
   Filters: { documentId: ..., filename: ..., topK: 5 }
   Generating question embedding...
   ✓ Generated question embedding, length: 1536
   Creating Supabase client: { hasUrl: true, hasKey: true, urlPrefix: ... }
   Calling match_document_chunks RPC...
   
   → If successful:
   ✓ Vector search completed, found chunks: 0
   
   → If error:
   Vector search error details: { message: ..., details: ..., hint: ..., code: ... }
   ```

### Option 2: CLI Logs

In your terminal:

```bash
cd /Users/patrickjaritz/CODE/document-intelligence-suite
supabase functions logs rag-query --project-ref joqnpibrfzqflyogrkht --tail
```

This will stream logs in real-time.

---

## 🐛 Common Errors You Might See

### Error 1: "function match_document_chunks does not exist"

**Logs show**:
```
Vector search error details: { 
  message: "function match_document_chunks does not exist",
  code: "42883"
}
```

**Fix**: Run `02_minimal_rag_fix.sql` in SQL Editor

---

### Error 2: "permission denied for function match_document_chunks"

**Logs show**:
```
Vector search error details: { 
  message: "permission denied for function match_document_chunks",
  code: "42501"
}
```

**Fix**: Grant permissions:
```sql
GRANT EXECUTE ON FUNCTION match_document_chunks TO service_role;
```

---

### Error 3: "invalid input syntax for type vector"

**Logs show**:
```
Vector search error details: { 
  message: "invalid input syntax for type vector",
  details: "..."
}
```

**Fix**: This means the embedding format is wrong. Check the logs for:
```
✓ Generated question embedding, length: 1536
```

If the length is not 1536, there's an issue with the embedding generation.

---

### Error 4: "Failed to create the Supabase client"

**Logs show**:
```
Creating Supabase client: { hasUrl: false, hasKey: false }
```

**Fix**: Environment variables are missing. Set them:
```bash
supabase secrets set SUPABASE_URL=https://joqnpibrfzqflyogrkht.supabase.co --project-ref joqnpibrfzqflyogrkht
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key --project-ref joqnpibrfzqflyogrkht
```

---

### Error 5: No chunks found

**Logs show**:
```
✓ Vector search completed, found chunks: 0
```

**This is NOT an error** - it means:
- The database is working
- But no documents have been processed yet
- Or the document processing failed

**Fix**: Make sure the document upload completed successfully. Check the `generate-embeddings` function logs.

---

## 🧪 Test Flow

### Complete RAG Flow Logs

When everything works, you should see:

**1. Upload Document** (check `process-pdf-ocr` logs):
```
Processing PDF with google-vision
✓ OCR completed: 1234 characters extracted
```

**2. Generate Embeddings** (check `generate-embeddings` logs):
```
Generating embeddings for: document.pdf
Chunking text: 1234 characters → 5 chunks
✓ Generated embeddings using openai
✓ Stored 5 chunks in database
```

**3. Ask Question** (check `rag-query` logs):
```
RAG query: "What is this about?" (openai/gpt-4o-mini)
✓ Generated question embedding, length: 1536
✓ Vector search completed, found chunks: 3
✓ Generated answer
```

---

## 📋 Debug Checklist

When viewing logs, check:

- [ ] Is `hasUrl: true` and `hasKey: true`?
- [ ] Is embedding length 1536?
- [ ] Does the RPC call succeed?
- [ ] How many chunks were found?
- [ ] If 0 chunks, did embeddings get generated?

---

## 🎯 Next Steps

**After viewing the logs**:

1. If you see a specific error → follow the fix above
2. If you see 0 chunks found → check `generate-embeddings` logs
3. If everything succeeds but still 500 → share the full logs with me

---

## 💡 Pro Tip

You can also view all function logs at once:

```bash
supabase functions logs --project-ref joqnpibrfzqflyogrkht --tail
```

This shows logs from ALL functions, useful for tracking the full flow.

---

**Ready to debug!** 🔍

Try uploading a document and asking a question while watching the logs. The enhanced logging will show exactly where it's failing.

---

**Created by**: AI Assistant  
**For**: Patrick Jaritz  
**Project**: BRAITER Document Intelligence Suite  
**Date**: 2025-01-15

