# PageIndex Vision RAG Test Instructions

This guide walks you through testing PageIndex Vision RAG integration with your Document Intelligence Suite.

---

## 📋 Prerequisites

### 1. Get PageIndex API Key
- Sign up at: https://dash.pageindex.ai/
- Get your API key from: https://dash.pageindex.ai/api-keys
- Note: PageIndex has a free tier for testing

### 2. Required Environment Variables

```bash
# PageIndex API Key (required)
export PAGEINDEX_API_KEY="your-pageindex-api-key-here"

# OpenAI API Key (required for VLM)
export OPENAI_API_KEY="your-openai-api-key-here"

# Supabase credentials (for Edge Function)
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_ANON_KEY="your-anon-key"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

---

## 🧪 Step 1: Test PageIndex Integration

### Run the Test Script

```bash
# Make the script executable
chmod +x test-pageindex.ts

# Run with a sample PDF
deno run --allow-net --allow-read --allow-env test-pageindex.ts \
  ./sample-document.pdf \
  "What is the main topic of this document?"
```

### Expected Output

```
🚀 PageIndex Vision RAG Test Suite
============================================================

📋 Configuration Check:
  PAGEINDEX_API_KEY: ✅ Configured
  OPENAI_API_KEY: ✅ Configured
  PDF Path: ./sample-document.pdf
  Test Question: What is the main topic of this document?

============================================================
TEST 1: PageIndex Document Submission
============================================================
📄 Submitting document: ./sample-document.pdf
✅ Document submitted. Doc ID: doc_abc123...

============================================================
TEST 2: Tree Structure Retrieval
============================================================
⏳ Waiting for document processing...
✅ Document ready for retrieval!

📊 Tree Structure:
├─ 0000: Document Title (page 1)
│  Summary: This document discusses...
├─ 0001: Section 1 (page 2)
│  └─ 0002: Subsection 1.1 (page 2)
...

============================================================
TEST 3: Reasoning-Based Retrieval
============================================================
❓ Question: What is the main topic of this document?

🧠 Reasoning Process:
The question asks about the main topic...
...

📍 Retrieved Nodes:
  - 0000: Document Title (page 1)
  - 0001: Section 1 (page 2)

✅ Test Suite Complete
```

---

## 🚀 Step 2: Deploy Vision RAG Edge Function

### Deploy to Supabase

```bash
# From project root
cd supabase/functions/vision-rag-query

# Deploy using Supabase CLI
supabase functions deploy vision-rag-query
```

### Set Environment Secrets

```bash
# Set PageIndex API key
supabase secrets set PAGEINDEX_API_KEY=your-pageindex-api-key

# OpenAI key should already be set (used by other functions)
# Verify with:
supabase secrets list
```

---

## 📝 Step 3: Test Edge Function

### Test via cURL

```bash
curl -X POST https://your-project.supabase.co/functions/v1/vision-rag-query \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is the main topic?",
    "documentId": "doc_abc123",
    "vlmModel": "gpt-4o"
  }'
```

### Test via Test Script

Create `test-vision-rag-edge-function.ts`:

```typescript
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';

const response = await fetch(`${SUPABASE_URL}/functions/v1/vision-rag-query`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    question: 'What is the main topic?',
    documentId: 'doc_abc123', // PageIndex doc_id
    vlmModel: 'gpt-4o'
  })
});

const result = await response.json();
console.log(result);
```

---

## 🔧 Step 4: Integrate with Frontend

### Update RAG Component

Add Vision RAG as an optional retrieval mode in your RAG UI:

```typescript
// frontend/src/components/RAGView.tsx

const [retrievalMode, setRetrievalMode] = useState<'vector' | 'vision'>('vector');

// Add UI toggle
<select value={retrievalMode} onChange={(e) => setRetrievalMode(e.target.value)}>
  <option value="vector">Vector Search (Fast)</option>
  <option value="vision">Vision RAG (Advanced)</option>
</select>

// Update query function
const queryRAG = async (question: string) => {
  if (retrievalMode === 'vision') {
    return await callEdgeFunction('vision-rag-query', {
      question,
      documentId,
      vlmModel: 'gpt-4o'
    });
  } else {
    // Use existing vector RAG
    return await callEdgeFunction('rag-query', {
      question,
      documentId,
      filename
    });
  }
};
```

---

## 📊 Step 5: Compare Results

### Test Same Query with Both Methods

```typescript
// Test Vector RAG
const vectorResult = await callEdgeFunction('rag-query', {
  question: 'What is the main topic?',
  documentId,
  filename
});

// Test Vision RAG
const visionResult = await callEdgeFunction('vision-rag-query', {
  question: 'What is the main topic?',
  documentId: pageIndexDocId, // Different doc_id from PageIndex
  vlmModel: 'gpt-4o'
});

// Compare
console.log('Vector RAG:', vectorResult.answer);
console.log('Vision RAG:', visionResult.answer);
console.log('Reasoning:', visionResult.reasoning);
```

### Evaluation Criteria

Compare:
- **Accuracy**: Which answer is more accurate?
- **Speed**: Response time difference
- **Cost**: API costs per query
- **Use Case Fit**: Which works better for your documents?

---

## 🐛 Troubleshooting

### Issue: "PAGEINDEX_API_KEY not configured"

**Solution**: 
```bash
# For local testing
export PAGEINDEX_API_KEY="your-key"

# For Edge Function
supabase secrets set PAGEINDEX_API_KEY="your-key"
```

### Issue: "Document tree not ready yet"

**Solution**: 
- Wait 10-30 seconds after submitting document
- PageIndex needs time to process the document
- Check status with `piClient.isRetrievalReady(docId)`

### Issue: "OpenAI API error"

**Solution**:
- Verify OpenAI API key is set
- Check you have credits/quota available
- Try a different model: `gpt-4o` instead of `gpt-4.1`

### Issue: "PDF page extraction not yet implemented"

**Solution**: 
- This is expected - page extraction is a placeholder
- Current implementation uses tree summaries as fallback
- To implement full vision RAG, add PDF page extraction:
  1. Use PyMuPDF via Python service
  2. Or extract pages client-side with PDF.js
  3. Or use a PDF-to-image service

---

## 📚 Next Steps

### 1. Implement PDF Page Extraction

```typescript
// Option A: Use external service
async function extractPdfPages(pdfBuffer: ArrayBuffer): Promise<Map<number, string>> {
  // Call PDF-to-image service
  // Return base64 encoded images
}

// Option B: Use PyMuPDF via subprocess
// Requires Python service with PyMuPDF installed
```

### 2. Add Document Mapping

Store mapping between your document IDs and PageIndex doc_ids:

```sql
CREATE TABLE pageindex_documents (
  document_id UUID PRIMARY KEY,
  pageindex_doc_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 3. Optimize Performance

- Cache PageIndex trees
- Batch VLM calls when possible
- Use cheaper models for tree search

### 4. Add UI Features

- Show tree structure visualization
- Display retrieved page images
- Show reasoning process
- Compare Vector vs Vision RAG side-by-side

---

## 🎯 Evaluation Checklist

After testing, evaluate:

- [ ] Does Vision RAG provide better accuracy for complex documents?
- [ ] Is the cost increase acceptable?
- [ ] Is response time acceptable?
- [ ] Which document types benefit most?
- [ ] Should this be default or optional?

---

## 📖 Resources

- **PageIndex Docs**: https://docs.pageindex.ai/quickstart
- **Vision RAG Blog**: https://pageindex.ai/blog/do-we-need-ocr
- **API Reference**: https://docs.pageindex.ai/api-reference
- **GitHub Repo**: https://github.com/VectifyAI/PageIndex

---

## ✅ Success Criteria

You've successfully integrated PageIndex if:

1. ✅ Test script runs without errors
2. ✅ Edge Function deploys successfully
3. ✅ Can query documents via Vision RAG
4. ✅ Get reasonable answers with reasoning
5. ✅ Can compare results with Vector RAG

---

**Happy Testing!** 🚀

If you encounter issues, check the troubleshooting section or review the analysis document: `PAGEINDEX_VISION_RAG_ANALYSIS.md`

