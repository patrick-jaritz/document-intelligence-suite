# PageIndex API Key Setup ✅

Your PageIndex API key has been configured:

```
PAGEINDEX_API_KEY=7535a44ab7c34d6c978009fd571c0bac
```

---

## ✅ What's Been Done

1. **API Key Added to Test Script**: `test-pageindex.ts` now uses your key by default
2. **Edge Function Updated**: `vision-rag-query` has fallback to your key
3. **Quick Test Script Created**: `test-pageindex-api.ts` for API verification

---

## 🧪 Quick Test Options

### Option 1: Test API Key (if you have Deno installed)

```bash
deno run --allow-net --allow-env test-pageindex-api.ts
```

### Option 2: Test API Key with cURL

```bash
curl -H "Authorization: Bearer 7535a44ab7c34d6c978009fd571c0bac" \
     https://api.pageindex.ai/v1/documents
```

Expected response: Should return your documents list or a valid API response.

### Option 3: Test with a PDF Document

```bash
# Make sure you have OpenAI API key set
export OPENAI_API_KEY="your-openai-key"

# Run test with a PDF
deno run --allow-net --allow-read --allow-env test-pageindex.ts \
  ./your-document.pdf \
  "What is this document about?"
```

---

## 🚀 Deploy to Supabase

### Set the Secret

```bash
cd supabase/functions/vision-rag-query

# Set PageIndex API key
supabase secrets set PAGEINDEX_API_KEY=7535a44ab7c34d6c978009fd571c0bac

# Deploy the function
supabase functions deploy vision-rag-query
```

### Test the Deployed Function

```bash
curl -X POST https://joqnpibrfzqflyogrkht.supabase.co/functions/v1/vision-rag-query \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is the main topic?",
    "documentId": "your-pageindex-doc-id",
    "vlmModel": "gpt-4o"
  }'
```

---

## 📝 Next Steps

1. **Verify API Key Works**
   - Use curl test above, or
   - Sign in to https://dash.pageindex.ai/ and verify

2. **Test with a Document**
   - Upload a PDF to PageIndex
   - Get the doc_id
   - Test Vision RAG query

3. **Integrate with Frontend**
   - Add retrieval mode selector
   - Connect to Edge Function
   - Test end-to-end

---

## 🔒 Security Note

The API key is currently hardcoded in the test scripts for convenience. For production:

1. **Remove hardcoded keys** from code
2. **Use environment variables** or Supabase secrets
3. **Never commit API keys** to git

---

## 📚 Resources

- **PageIndex Dashboard**: https://dash.pageindex.ai/
- **API Documentation**: https://docs.pageindex.ai/quickstart
- **Test Instructions**: `PAGEINDEX_TEST_INSTRUCTIONS.md`

---

**Ready to test!** 🎉

Your API key is configured. You can now:
- Test the API connection
- Submit documents to PageIndex
- Query documents with Vision RAG

