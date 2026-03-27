# 🔍 Debug Steps for "No Relevant Information"

**Date**: 2025-01-15

---

## 🎯 Goal

Figure out why you're still getting "No relevant information found" even after the fixes.

---

## 📊 Step 1: Check if Chunks Were Inserted

**Run this in Supabase SQL Editor**:

Copy and paste [`check_chunks.sql`](/Users/patrickjaritz/CODE/document-intelligence-suite/supabase-migrations/check_chunks.sql) into the SQL Editor.

**Possible Results**:

### Result A: `total_chunks: 0`
**Means**: Embeddings are NOT being generated/stored

**Next Steps**: 
1. Check if `generate-embeddings` function is being called
2. Check `generate-embeddings` logs for errors
3. Go to Step 2

### Result B: `total_chunks: > 0`
**Means**: Embeddings ARE being stored!

**Next Steps**:
1. The issue is in the query/search
2. Go to Step 3

---

## 📋 Step 2: Check if generate-embeddings is Being Called

### View Logs in Dashboard

1. Go to: https://supabase.com/dashboard/project/joqnpibrfzqflyogrkht
2. Edge Functions → `generate-embeddings` → Logs tab
3. Upload a NEW document in your app
4. Watch the logs in real-time

**What to look for**:

#### Scenario A: NO LOGS APPEAR
**Means**: The function is not being called at all

**Possible causes**:
- Frontend is not calling the function
- CORS error blocking the call
- Network error

**Check**:
- Open browser console (F12)
- Upload a document
- Look for errors or failed requests to `generate-embeddings`

#### Scenario B: LOGS SHOW ERROR
**Example**:
```
Database insert error: { message: "...", code: "..." }
```

**Share the error** and I'll provide the fix

#### Scenario C: LOGS SHOW SUCCESS
**Example**:
```
Generating embeddings for document.pdf using openai
Created 10 chunks
Generated 10 embeddings
Inserting 10 chunks into document_chunks table...
✓ Stored 10 chunks in database
```

**But SQL shows 0 chunks**: There's a table/permission issue

---

## 🔎 Step 3: If Chunks Exist, Check the Query

If chunks ARE in the database but you still get "no relevant information":

### Check the Filters

Run this in SQL Editor:
```sql
-- See what's in the database
SELECT filename, COUNT(*) as chunks
FROM document_chunks
GROUP BY filename;
```

**Note the exact filename** (e.g., `"document.pdf"`)

### Then check if the query is using the right filename

**In browser console**, when you ask a question, look for:
```
Calling rag-query with: { question: "...", filename: "..." }
```

**Compare**: Does the filename match exactly?
- ❌ Database: `"My Document.pdf"` vs Query: `"my-document.pdf"` → Won't match
- ✅ Database: `"document.pdf"` vs Query: `"document.pdf"` → Will match

---

## 🛠️ Step 4: Manual Test

Test the vector search directly in SQL:

```sql
-- Get a sample embedding from the database
WITH sample_embedding AS (
  SELECT embedding 
  FROM document_chunks 
  LIMIT 1
)
-- Try to search with it
SELECT 
  filename,
  chunk_text,
  similarity
FROM match_document_chunks(
  query_embedding := (SELECT embedding::text FROM sample_embedding),
  match_threshold := 0.0,  -- Very low threshold to find anything
  match_count := 5
);
```

**Expected**: Should return at least 1 result (the same chunk)

**If it returns 0 results**: The `match_document_chunks` function has an issue

**If it returns results**: The function works, issue is in how the frontend calls it

---

## 📝 Quick Checklist

Run these in order and tell me the results:

- [ ] **Step 1**: Run `check_chunks.sql` → How many chunks?
- [ ] **Step 2A**: Upload doc → Any logs in `generate-embeddings`?
- [ ] **Step 2B**: If yes, do logs show success or error?
- [ ] **Step 3**: If chunks exist, check filename match
- [ ] **Step 4**: Manual test with sample embedding

---

## 🎯 Most Likely Issues

Based on "no relevant information" after fixes:

1. **Embeddings not being generated** (70% probability)
   - `generate-embeddings` not being called
   - Or failing silently
   - **Check**: Step 2

2. **Filename mismatch** (20% probability)
   - Chunks stored with one filename
   - Query searching for different filename
   - **Check**: Step 3

3. **Embedding format issue** (10% probability)
   - Embeddings stored but in wrong format
   - **Check**: Step 4

---

## 💬 What to Share

After running the debug steps, share:

1. **Result from `check_chunks.sql`**:
   - How many total chunks?
   - What filenames?

2. **Logs from `generate-embeddings`**:
   - Did it get called?
   - Any errors?
   - What did it log?

3. **Browser console**:
   - Any errors when uploading?
   - Any failed network requests?

---

**Let's debug this together!** 🔍

---

**Created by**: AI Assistant  
**For**: Patrick Jaritz  
**Project**: BRAITER Document Intelligence Suite  
**Date**: 2025-01-15

