# EasyOCR for RAG - Usage Guide

## ✅ Yes, EasyOCR is Already Integrated for RAG!

EasyOCR is fully integrated into the RAG (Retrieval-Augmented Generation) pipeline and ready to use.

## How It Works

The RAG pipeline (`process-rag-markdown`) automatically supports all OCR providers, including EasyOCR:

1. **Document Upload** → OCR Processing (using your selected provider)
2. **Text Extraction** → Markdown Conversion (optional)
3. **Chunking** → Generate Embeddings
4. **Storage** → Store in vector database for RAG queries

## Using EasyOCR for RAG

### Step 1: Deploy EasyOCR Service

```bash
cd supabase/functions/easyocr-service
docker-compose up -d
```

This starts the EasyOCR service on port 8765.

### Step 2: Set Environment Variable (Optional)

If your EasyOCR service is running on a different URL, set:

```bash
export EASYOCR_SERVICE_URL=http://your-easyocr-url:8765
```

### Step 3: Use in Frontend

1. Upload a document in the Enhanced RAG interface
2. Select **"EasyOCR (Requires service)"** from the OCR Provider dropdown
3. Upload your PDF/image
4. The system will:
   - Use EasyOCR to extract text
   - Convert to markdown (if enabled)
   - Generate embeddings
   - Store chunks for RAG queries

## EasyOCR Features for RAG

### ✅ What Makes EasyOCR Great for RAG:

1. **High Accuracy**: CNN + RNN architecture provides excellent text recognition
2. **Multi-language**: Supports 80+ languages automatically
3. **PDF Support**: Converts PDFs to images and processes page-by-page
4. **Fast Processing**: Optimized for speed
5. **GPU Support**: Can use GPU for faster processing (when available)
6. **Layout Preserving**: Maintains document structure for better chunking

### Benefits for RAG:

- **Better Context**: High-quality OCR means more accurate embeddings
- **Document Structure**: Preserves layout for better chunking strategies
- **Language Support**: Works with multilingual documents
- **Confidence Scores**: Can filter low-confidence detections

## Example Workflow

```
Document Upload
     ↓
EasyOCR Text Extraction
     ↓
Markdown Conversion (optional)
     ↓
Text Chunking (1000 chars, 200 overlap)
     ↓
Embedding Generation (OpenAI/Mistral/Anthropic)
     ↓
Store in Vector Database
     ↓
Ready for RAG Queries!
```

## Troubleshooting

### Service Not Available Error

If you see "EasyOCR service unavailable", ensure:

1. Docker service is running: `docker ps | grep easyocr`
2. Service is accessible at the configured URL
3. Port 8765 is not blocked by firewall

### Performance Tips

1. **For GPU acceleration**: Modify `easyocr_service.py` to set `gpu=True`
2. **For large documents**: Consider processing in batches
3. **For real-time**: Use EasyOCR with smaller chunk sizes

## Comparison with Other OCR Providers

| Feature | EasyOCR | Google Vision | OpenAI Vision | PaddleOCR |
|---------|---------|---------------|---------------|-----------|
| Accuracy | High | Very High | Very High | High |
| Multi-language | ✅ 80+ | ✅ 150+ | ❌ Images only | ✅ 40+ |
| PDF Support | ✅ | ✅ | ❌ | ✅ |
| Self-hosted | ✅ | ❌ | ❌ | ✅ |
| GPU Support | ✅ | N/A | N/A | ✅ |
| Cost | Free | Paid | Paid | Free |
| Speed | Fast | Very Fast | Fast | Medium |

## Next Steps

1. Deploy EasyOCR service
2. Test with sample documents
3. Compare results with other OCR providers
4. Adjust chunk size and overlap for your use case
5. Monitor embedding quality and RAG query results

## Documentation

- [EasyOCR GitHub](https://github.com/JaidedAI/EasyOCR)
- [EasyOCR Model Cards](https://www.jaided.ai/easyocr/modelhub/)
- [Architecture Details](https://github.com/JaidedAI/EasyOCR#technical-details)

