# 🔧 RAG 500 Error Troubleshooting Guide

**Date**: 2025-01-15  
**Status**: 🔍 Debugging in Progress

---

## 🐛 Current Issue

**500 Internal Server Error** on RAG query - the function is failing internally.

Possible causes:
1. ❌ Database tables don't exist
2. ❌ RPC function doesn't exist or has wrong signature
3. ❌ Missing `SUPABASE_SERVICE_ROLE_KEY` in Edge Function
4. ❌ Type mismatch in function parameters
5. ❌ pgvector extension not enabled

---

## 🔍 Step-by-Step Diagnosis

### Step 1: Run Verification Test

**File**: `supabase-migrations/test_rag_setup.sql`

1. Go to: https://supabase.com/dashboard/project/joqnpibrfzqflyogrkht
2. SQL Editor → New Query
3. Copy & paste [`test_rag_setup.sql`](/Users/patrickjaritz/CODE/document-intelligence-suite/supabase-migrations/test_rag_setup.sql)
4. Run it

**Expected Output**:
```
Test 1: pgvector extension          ✅ PASS
Test 2: rag_documents table          ✅ PASS
Test 2: document_chunks table        ✅ PASS
Test 2: rag_sessions table           ✅ PASS
Test 3: match_document_chunks function ✅ PASS
Test 4: Vector similarity index      ✅ PASS
Test 5: Existing documents           0 documents
Test 5: Existing chunks              0 chunks
Test 5: Existing sessions            0 Q&A sessions
```

**If any show ❌ FAIL**: Go to Step 2

**If all show ✅ PASS**: Go to Step 3

---

### Step 2: Run Minimal Fix Migration

**File**: `supabase-migrations/02_minimal_rag_fix.sql`

This is a **safe, simplified version** that:
- ✅ Can be run multiple times without errors
- ✅ Only creates what's absolutely needed
- ✅ Drops and recreates the function to fix signature issues

1. Go to: https://supabase.com/dashboard/project/joqnpibrfzqflyogrkht
2. SQL Editor → New Query
3. Copy & paste [`02_minimal_rag_fix.sql`](/Users/patrickjaritz/CODE/document-intelligence-suite/supabase-migrations/02_minimal_rag_fix.sql)
4. Run it
5. Verify with this query:
```sql
SELECT 
  (SELECT COUNT(*) FROM document_chunks) as chunks,
  (SELECT COUNT(*) FROM rag_sessions) as sessions,
  (SELECT COUNT(*) FROM pg_proc WHERE proname = 'match_document_chunks') as function_exists;
```

**Expected**: `chunks: 0`, `sessions: 0`, `function_exists: 1`

**After running**: Re-run the test from Step 1. All should be ✅ PASS now.

---

### Step 3: Check Edge Function Environment Variables

The `rag-query` function needs `SUPABASE_SERVICE_ROLE_KEY` to access the database.

**Verify**:
1. Go to: https://supabase.com/dashboard/project/joqnpibrfzqflyogrkht
2. **Settings** → **API**
3. Copy the **service_role** key (under "Project API keys")

**Set Secret**:
```bash
cd /Users/patrickjaritz/CODE/document-intelligence-suite
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<paste-service-role-key-here> --project-ref joqnpibrfzqflyogrkht
```

**Also verify these secrets exist**:
```bash
supabase secrets list --project-ref joqnpibrfzqflyogrkht
```

**Expected to see**:
- `OPENAI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

---

### Step 4: Check Edge Function Logs

**View real-time logs**:
1. Go to: https://supabase.com/dashboard/project/joqnpibrfzqflyogrkht
2. **Edge Functions** → **rag-query**
3. Click **"Logs"** tab
4. Try the RAG Q&A again
5. Watch for error messages

**Common errors and solutions**:

| Error | Solution |
|-------|----------|
| `function match_document_chunks does not exist` | Run `02_minimal_rag_fix.sql` |
| `relation "document_chunks" does not exist` | Run `02_minimal_rag_fix.sql` |
| `permission denied for function` | Grant permissions: `GRANT EXECUTE ON FUNCTION match_document_chunks TO service_role;` |
| `invalid input syntax for type vector` | Type mismatch - check query_embedding format |
| `Failed to create the Supabase client` | Missing `SUPABASE_SERVICE_ROLE_KEY` - see Step 3 |

---

### Step 5: Test with Manual SQL

**Run this in SQL Editor**:
```sql
-- Insert a test chunk
INSERT INTO document_chunks (filename, chunk_text, chunk_index, embedding)
VALUES (
  'test.pdf',
  'This is a test chunk about artificial intelligence.',
  0,
  (SELECT array_agg(random())::vector(1536) FROM generate_series(1, 1536))
);

-- Test the function
SELECT chunk_text, similarity 
FROM match_document_chunks(
  query_embedding := (SELECT embedding::text FROM document_chunks LIMIT 1),
  match_threshold := 0.0,
  match_count := 5
);

-- Clean up
DELETE FROM document_chunks WHERE filename = 'test.pdf';
```

**Expected**: Should return the test chunk with a similarity score

**If this works**: Database is fine, issue is in the Edge Function  
**If this fails**: Database setup is incomplete

---

## 🛠️ Common Fixes

### Fix 1: Completely Reset RAG Database

If all else fails, start fresh:

```sql
-- Drop everything
DROP FUNCTION IF EXISTS match_document_chunks;
DROP TABLE IF EXISTS rag_sessions CASCADE;
DROP TABLE IF EXISTS document_chunks CASCADE;
DROP TABLE IF EXISTS rag_documents CASCADE;

-- Then run 02_minimal_rag_fix.sql
```

### Fix 2: Check Supabase Service Role Key

The Edge Function needs this to access pgvector:

1. Get the service role key from Dashboard → Settings → API
2. Set it:
```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhb... --project-ref joqnpibrfzqflyogrkht
```
3. Redeploy the function:
```bash
supabase functions deploy rag-query --project-ref joqnpibrfzqflyogrkht
```

### Fix 3: Verify Edge Function Can Connect

Add debug logging to `rag-query` Edge Function:

```typescript
// At the start of the serve block
console.log('Environment check:', {
  hasSupabaseUrl: !!Deno.env.get('SUPABASE_URL'),
  hasServiceRole: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
  hasOpenAI: !!Deno.env.get('OPENAI_API_KEY'),
});
```

Check logs to see if keys are present.

---

## 📊 Decision Tree

```
500 Error on rag-query
    │
    ├─→ Run test_rag_setup.sql
    │   │
    │   ├─→ All ✅ PASS
    │   │   └─→ Check Edge Function logs (Step 4)
    │   │       ├─→ "function does not exist"
    │   │       │   └─→ Run 02_minimal_rag_fix.sql
    │   │       ├─→ "Supabase client failed"
    │   │       │   └─→ Set SUPABASE_SERVICE_ROLE_KEY (Step 3)
    │   │       └─→ Other error
    │   │           └─→ Check specific error message
    │   │
    │   └─→ Any ❌ FAIL
    │       └─→ Run 02_minimal_rag_fix.sql → Repeat test
    │
    └─→ Still failing?
        └─→ Complete reset (Fix 1) → Run 02_minimal_rag_fix.sql
```

---

## 🎯 Most Likely Solution

**Based on your error**, the most likely issue is:

1. **Database tables/function don't exist** (80% probability)
   - **Solution**: Run `02_minimal_rag_fix.sql`

2. **Missing SUPABASE_SERVICE_ROLE_KEY** (15% probability)
   - **Solution**: Set the secret (Step 3)

3. **Function signature mismatch** (5% probability)
   - **Solution**: Run `02_minimal_rag_fix.sql` (includes DROP + CREATE)

---

## ✅ Quick Fix Checklist

Try these in order:

- [ ] Run `test_rag_setup.sql` to diagnose
- [ ] Run `02_minimal_rag_fix.sql` to fix database
- [ ] Verify `SUPABASE_SERVICE_ROLE_KEY` is set
- [ ] Check Edge Function logs for specific error
- [ ] Test with manual SQL (Step 5)
- [ ] If still failing, complete reset (Fix 1)

---

## 📝 Next Steps

**After you run the verification test** (`test_rag_setup.sql`), let me know what the results are and I can provide the exact fix needed.

**Most likely**: You just need to run `02_minimal_rag_fix.sql` and it will work!

---

**Created by**: AI Assistant  
**For**: Patrick Jaritz  
**Project**: BRAITER Document Intelligence Suite  
**Date**: 2025-01-15

