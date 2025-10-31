# EasyOCR Deployment Instructions

## Prerequisites

1. **Docker Desktop** must be installed and running on your system
2. **Python 3.10+** (for local testing)

## Quick Start - Docker Deployment

### 1. Start Docker Desktop

Make sure Docker Desktop is running on your machine:
- **macOS**: Open Docker Desktop from Applications
- **Windows**: Open Docker Desktop
- **Linux**: Start Docker service: `sudo systemctl start docker`

### 2. Deploy EasyOCR Service

```bash
cd supabase/functions/easyocr-service
docker-compose up -d
```

This will:
- Build the EasyOCR Docker image
- Start the service on port 8765
- Automatically restart the service if it crashes

### 3. Verify Service is Running

```bash
# Check if container is running
docker ps | grep easyocr

# Check service logs
docker-compose logs -f easyocr

# Test the service
curl http://localhost:8765/health
```

## Manual Deployment (Alternative)

If you prefer to run without Docker:

### 1. Install Dependencies

```bash
cd supabase/functions/easyocr-service
pip install -r requirements.txt
```

### 2. Run the Service

```bash
python easyocr_service.py
```

The service will start on port 8765.

## Configuration

### Environment Variables

You can customize the EasyOCR service by setting environment variables:

```bash
# In docker-compose.yml or as environment variables
export EASYOCR_SERVICE_URL=http://localhost:8765
export EASYOCR_GPU_ENABLED=false  # Set to true for GPU support
```

### GPU Support

For faster processing with GPU:

1. Install NVIDIA Docker runtime
2. Modify `easyocr_service.py` line 30:
   ```python
   self.reader = easyocr.Reader(['en'], gpu=True, verbose=False)
   ```
3. Rebuild Docker image:
   ```bash
   docker-compose down
   docker-compose build --no-cache
   docker-compose up -d
   ```

## Testing the Service

### Test with Sample Image

```bash
# Convert image to base64
BASE64_DATA=$(cat sample.jpg | base64 -w 0)

# Send to service
curl -X POST http://localhost:8765/ocr \
  -H "Content-Type: application/json" \
  -d "{
    \"fileDataUrl\": \"data:image/jpeg;base64,$BASE64_DATA\",
    \"fileType\": \"image/jpeg\"
  }"
```

### Test with PDF

```bash
# Convert PDF to base64
BASE64_DATA=$(cat sample.pdf | base64 -w 0)

# Send to service
curl -X POST http://localhost:8765/ocr \
  -H "Content-Type: application/json" \
  -d "{
    \"fileDataUrl\": \"data:application/pdf;base64,$BASE64_DATA\",
    \"fileType\": \"application/pdf\"
  }"
```

## Using in Your Application

Once the service is running:

1. **In Frontend**: Select "EasyOCR (Requires service)" from OCR Provider dropdown
2. **In Backend**: The service will automatically be called at `http://localhost:8765`

## Monitoring and Logs

### View Logs

```bash
# Real-time logs
docker-compose logs -f easyocr

# Last 100 lines
docker-compose logs --tail=100 easyocr
```

### Stop the Service

```bash
docker-compose down
```

### Restart the Service

```bash
docker-compose restart easyocr
```

## Troubleshooting

### Port Already in Use

If port 8765 is already in use, modify `docker-compose.yml`:

```yaml
ports:
  - "8766:8765"  # Change 8766 to any available port
```

Then update `EASYOCR_SERVICE_URL` environment variable accordingly.

### Service Won't Start

1. Check Docker logs: `docker-compose logs easyocr`
2. Verify all dependencies are installed
3. Check if port is available: `lsof -i :8765`
4. Rebuild the image: `docker-compose build --no-cache`

### Out of Memory Errors

EasyOCR can be memory-intensive. Increase Docker memory limit:
- Docker Desktop → Settings → Resources → Memory → Set to 4GB+

### Slow Processing

- Enable GPU support (if available)
- Process smaller documents
- Use batch processing for multiple documents
- Consider using a cloud GPU instance

## Production Deployment

For production deployment, consider:

1. **Cloud Deployment**: Deploy to cloud service (AWS ECS, Google Cloud Run, Azure Container Instances)
2. **Load Balancing**: Use multiple instances behind a load balancer
3. **Caching**: Cache model loading to reduce startup time
4. **Monitoring**: Set up monitoring and alerting
5. **Scaling**: Use auto-scaling based on request volume

## Example Cloud Deployment (Railway)

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize
railway init

# Add EasyOCR service
railway add

# Set environment variables
railway variables set EASYOCR_SERVICE_URL=https://your-app.railway.app

# Deploy
railway up
```

## Next Steps

1. ✅ Start Docker Desktop
2. ✅ Run `docker-compose up -d`
3. ✅ Verify service is running
4. ✅ Test with sample document
5. ✅ Use EasyOCR in your RAG pipeline!

## Support

For issues or questions:
- EasyOCR GitHub: https://github.com/JaidedAI/EasyOCR
- Docker Documentation: https://docs.docker.com/
- Project Issues: Create an issue in this repository

