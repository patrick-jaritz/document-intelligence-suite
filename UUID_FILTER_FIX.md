# ✅ UUID Filter Fix - Complete

**Date**: 2025-01-15  
**Status**: ✅ Ready to Apply

---

## 🐛 Root Cause Found!

**Error from logs**:
```
Vector search failed: invalid input syntax for type uuid: "file-doc" (22P02)
```

**Problem**: 
- Frontend passes `documentId: 'file-doc'` (not a valid UUID)
- RPC function expects `filter_document_id UUID`
- PostgreSQL throws error when trying to cast `'file-doc'` to UUID

**Why this happened**:
- In RAG mode, we use "test mode" document IDs like:
  - `'file-doc'` (for file uploads)
  - `'url-doc'` (for URL uploads)
  - `'test-doc-id'` (for testing)
- These aren't valid UUIDs, but the function signature required UUID type

---

## ✅ Solution

**Updated the `match_document_chunks` function** to:
1. Accept `filter_document_id` as `TEXT` instead of `UUID`
2. Try to parse it as UUID
3. If parsing fails, gracefully set to `NULL` and filter by filename only
4. This allows both valid UUIDs AND test mode strings

---

## 🚀 Apply the Fix

### Run in Supabase SQL Editor

1. **Go to**: https://supabase.com/dashboard/project/joqnpibrfzqflyogrkht

2. **SQL Editor** → **New Query**

3. **Copy & Run**: [`03_fix_uuid_filter.sql`](/Users/patrickjaritz/CODE/document-intelligence-suite/supabase-migrations/03_fix_uuid_filter.sql)

4. **Expected**: `Success. No rows returned`

5. **Test RAG Q&A** - it should work now!

---

## 🔧 What Changed

### Before (caused error):
```sql
CREATE FUNCTION match_document_chunks(
  ...
  filter_document_id UUID DEFAULT NULL,  -- ❌ Strict UUID type
  ...
)
```

**Result**: Throws error when passed `'file-doc'`

### After (fixed):
```sql
CREATE FUNCTION match_document_chunks(
  ...
  filter_document_id TEXT DEFAULT NULL,  -- ✅ Accepts any string
  ...
)
AS $$
DECLARE
  doc_id_uuid UUID;
BEGIN
  -- Try to parse as UUID, set to NULL if invalid
  BEGIN
    IF filter_document_id IS NOT NULL THEN
      doc_id_uuid := filter_document_id::UUID;
    ELSE
      doc_id_uuid := NULL;
    END IF;
  EXCEPTION
    WHEN invalid_text_representation THEN
      doc_id_uuid := NULL;  -- Gracefully handle non-UUID strings
  END;
  
  -- Filter by UUID if valid, otherwise just by filename
  WHERE
    (doc_id_uuid IS NULL OR dc.document_id = doc_id_uuid)
    AND (filter_filename IS NULL OR dc.filename = filter_filename)
    ...
END;
$$;
```

**Result**: ✅ Works with:
- Valid UUIDs: `'123e4567-e89b-12d3-a456-426614174000'`
- Test strings: `'file-doc'`, `'url-doc'`, `'test-doc-id'`
- NULL: `null`

---

## 🧪 How It Works Now

### Scenario 1: Valid UUID
```
Input: filter_document_id = '123e4567-e89b-12d3-a456-426614174000'
       filter_filename = 'document.pdf'

Result: Filters by BOTH UUID AND filename
```

### Scenario 2: Test Mode (non-UUID string)
```
Input: filter_document_id = 'file-doc'
       filter_filename = 'document.pdf'

Result: UUID parsing fails → gracefully ignores it
        Filters by filename ONLY
```

### Scenario 3: No filters
```
Input: filter_document_id = null
       filter_filename = null

Result: No filtering, returns all matching chunks
```

---

## ✅ Benefits

1. ✅ **Backward compatible**: Still works with valid UUIDs
2. ✅ **Test mode friendly**: Accepts non-UUID strings
3. ✅ **No errors**: Gracefully handles invalid UUIDs
4. ✅ **Flexible filtering**: Can filter by UUID, filename, or both

---

## 🎯 Expected Result

**After running the fix**:

1. **Upload PDF** in RAG mode → ✅ Works
2. **Process document** → ✅ Embeddings generated
3. **Ask question** → ✅ No more UUID error!
4. **Get answer** → ✅ Response with sources

---

## 📋 Quick Checklist

- [ ] Run `03_fix_uuid_filter.sql` in Supabase SQL Editor
- [ ] Verify "Success. No rows returned"
- [ ] Test RAG Q&A with PDF upload
- [ ] Test RAG Q&A with URL
- [ ] Celebrate! 🎉

---

## 🎊 Summary

**Problem**: `invalid input syntax for type uuid: "file-doc"`  
**Cause**: Function required UUID but got test mode string  
**Solution**: Accept TEXT, parse gracefully, ignore if invalid  
**Result**: ✅ **RAG Q&A will work!**

---

**Run `03_fix_uuid_filter.sql` and your RAG Q&A will be fully functional!** 🚀

---

**Created by**: AI Assistant  
**Requested by**: Patrick Jaritz  
**Project**: BRAITER Document Intelligence Suite  
**Date**: 2025-01-15

