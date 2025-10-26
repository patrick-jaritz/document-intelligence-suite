# DeepSeek OCR Service Integration

## 🎯 **Overview**

This service integrates the DeepSeek-OCR model (via rdumasia303's implementation) into the Document Intelligence Suite.

## 📦 **What's Included**

- **FastAPI Backend** with DeepSeek-OCR model
- **Docker Compose** setup with GPU support
- **NVIDIA CUDA** acceleration
- **4 OCR Modes**:
  - `plain_ocr` - Raw text extraction
  - `describe` - Image descriptions  
  - `find_ref` - Locate terms with bounding boxes
  - `freeform` - Custom prompts

## 🚀 **Quick Start**

### 1. Start the Service

```bash
cd services/deepseek-ocr-service
./setup.sh
```

Or manually:
```bash
docker compose up --build -d
```

### 2. Verify It's Running

```bash
# Check logs
docker compose logs -f

# Test health endpoint
curl http://localhost:5003/health
```

### 3. Access API Docs

- **API Docs**: http://localhost:5003/docs
- **Health Check**: http://localhost:5003/health

## 🔧 **Configuration**

Edit `docker-compose.yml` or environment variables:

```yaml
environment:
  - MODEL_NAME=deepseek-ai/DeepSeek-OCR
  - HF_HOME=/models
  - API_PORT=8000
```

## 📡 **API Usage**

### Endpoint: `POST /api/ocr`

**Required Parameters:**
- `image` (file) - Image file to process
- `mode` (string) - OCR mode: `plain_ocr`, `describe`, `find_ref`, `freeform`

**Optional Parameters:**
- `prompt` (string) - Custom prompt for freeform mode
- `grounding` (bool) - Enable bounding boxes
- `find_term` (string) - Term to locate
- `base_size` (int) - Base processing size (default: 1024)
- `image_size` (int) - Tile size (default: 640)
- `crop_mode` (bool) - Enable cropping (default: true)

**Response:**
```json
{
  "success": true,
  "text": "Extracted text...",
  "boxes": [{"label": "key", "box": [x1, y1, x2, y2]}],
  "image_dims": {"w": 1920, "h": 1080},
  "metadata": {...}
}
```

## 🔌 **Integration with Document Intelligence Suite**

### Option A: Direct Integration (Recommended)

Call the FastAPI service from your Supabase Edge Functions:

```typescript
// In your Edge Function
const response = await fetch('http://deepseek-ocr:8000/api/ocr', {
  method: 'POST',
  headers: { 'Content-Type': 'multipart/form-data' },
  body: formData
});

const result = await response.json();
// Returns: { text, boxes, image_dims, metadata }
```

### Option B: Via Supabase Edge Function

Create a new Edge Function that proxies requests:

```typescript
// supabase/functions/deepseek-ocr/index.ts
const DEEPSEEK_URL = Deno.env.get('DEEPSEEK_OCR_URL') || 'http://localhost:5003';

Deno.serve(async (req: Request) => {
  const formData = await req.formData();
  
  const response = await fetch(`${DEEPSEEK_URL}/api/ocr`, {
    method: 'POST',
    body: formData
  });
  
  return response;
});
```

## 🧪 **Testing**

```bash
# Health check
curl http://localhost:5003/health

# Test OCR
curl -X POST http://localhost:5003/api/ocr \
  -F "image=@test-image.png" \
  -F "mode=plain_ocr"
```

## 📊 **Requirements**

- **NVIDIA GPU** with CUDA support (recommended)
- **Docker** and **Docker Compose**
- **~15GB disk space** (for model weights)
- **8GB+ VRAM** for model loading

## 🛠️ **Troubleshooting**

### GPU Not Detected

```bash
nvidia-smi
docker run --rm --gpus all nvidia/cuda:11.8.0-base-ubuntu22.04 nvidia-smi
```

### Model Download Fails

```bash
# Manual download
export HF_HOME=/path/to/models
python -c "from transformers import AutoModel; AutoModel.from_pretrained('deepseek-ai/DeepSeek-OCR')"
```

### Port Conflicts

```bash
# Check port usage
sudo lsof -i :5003

# Change port in docker-compose.yml
ports:
  - "5004:8000"  # Use 5004 instead
```

## 🎯 **Next Steps**

1. ✅ Service setup complete
2. ⏳ Update Supabase Edge Functions to call this service
3. ⏳ Add DeepSeek OCR as a provider option in frontend
4. ⏳ Test with real documents
5. ⏳ Monitor performance and costs

## 📝 **Notes**

- First startup downloads ~5-10GB model (one-time)
- Model loads in GPU memory (~8GB VRAM needed)
- Processing time: 1-5 seconds depending on image size
- Supports images up to 100MB (configurable)
- Coordinate system: Model outputs 0-999 normalized coords, backend scales to pixels
