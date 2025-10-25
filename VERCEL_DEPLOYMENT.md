# Deploy OCR Services for Vercel Integration

This guide shows how to deploy the OCR services to work with your Vercel app at [https://document-intelligence-suite.vercel.app/](https://document-intelligence-suite.vercel.app/).

## 🚀 Quick Deploy Options

### Option 1: Railway (Recommended)

1. **Install Railway CLI**:
   ```bash
   npm install -g @railway/cli
   railway login
   ```

2. **Deploy Services**:
   ```bash
   ./deploy-to-railway.sh
   ```

3. **Get Service URLs** and update Supabase environment variables.

### Option 2: Render

1. **Connect GitHub** to Render
2. **Create Web Services** using the `render.yaml` configuration
3. **Deploy** both services
4. **Get URLs** and update Supabase

### Option 3: Google Cloud Run

1. **Build and push** Docker images to Google Container Registry
2. **Deploy** as Cloud Run services
3. **Get URLs** and update Supabase

## 🔧 Manual Deployment Steps

### Step 1: Deploy PaddleOCR Service

1. **Create new project** on your chosen platform
2. **Connect repository** or upload code
3. **Set build command**: `pip install -r requirements.txt`
4. **Set start command**: `gunicorn --bind 0.0.0.0:$PORT --workers 1 --timeout 120 app:app`
5. **Set health check**: `/health`
6. **Deploy** and get URL (e.g., `https://paddleocr-service.railway.app`)

### Step 2: Deploy dots.ocr Service

1. **Repeat Step 1** for dots.ocr service
2. **Get URL** (e.g., `https://dots-ocr-service.railway.app`)

### Step 3: Update Supabase Environment Variables

In your Supabase project dashboard:

1. Go to **Settings** > **Edge Functions** > **Environment Variables**
2. Add these variables:

```bash
PADDLEOCR_SERVICE_URL=https://your-paddleocr-service.railway.app
DOTS_OCR_SERVICE_URL=https://your-dots-ocr-service.railway.app
```

### Step 4: Deploy Updated Edge Function

```bash
npx supabase functions deploy process-pdf-ocr
```

### Step 5: Test with Vercel App

Visit [https://document-intelligence-suite.vercel.app/](https://document-intelligence-suite.vercel.app/) and test OCR functionality.

## 📊 Service Requirements

### PaddleOCR Service
- **Memory**: 1-2GB
- **CPU**: 1-2 cores
- **Timeout**: 120 seconds
- **Port**: Dynamic (uses $PORT)

### dots.ocr Service
- **Memory**: 512MB-1GB
- **CPU**: 1 core
- **Timeout**: 120 seconds
- **Port**: Dynamic (uses $PORT)

## 🔍 Health Check Endpoints

After deployment, test these URLs:

- **PaddleOCR**: `https://your-paddleocr-service.railway.app/health`
- **dots.ocr**: `https://your-dots-ocr-service.railway.app/health`

Expected response:
```json
{
  "status": "healthy",
  "service": "paddleocr",
  "version": "1.0.0"
}
```

## 🧪 Testing OCR Endpoints

Test OCR processing:

```bash
curl -X POST https://your-paddleocr-service.railway.app/ocr \
  -H "Content-Type: application/json" \
  -d '{
    "base64_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "content_type": "image/png"
  }'
```

## 🚨 Troubleshooting

### Common Issues

1. **Services not responding**
   - Check health endpoints
   - Verify environment variables
   - Check service logs

2. **Timeout errors**
   - Increase timeout in platform settings
   - Check service resource limits

3. **Memory errors**
   - Increase memory allocation
   - Check for memory leaks

4. **CORS errors**
   - Services include CORS headers
   - Check if platform blocks CORS

### Debug Commands

```bash
# Check service status
curl https://your-service-url.railway.app/health

# Test OCR endpoint
curl -X POST https://your-service-url.railway.app/ocr \
  -H "Content-Type: application/json" \
  -d '{"base64_data": "test", "content_type": "image/png"}'

# Check Supabase Edge Function logs
npx supabase functions logs process-pdf-ocr
```

## 📈 Monitoring

### Service Health
- Monitor health endpoints
- Set up alerts for downtime
- Track response times

### Performance
- Monitor memory usage
- Track OCR processing times
- Monitor error rates

### Costs
- Track service usage
- Monitor resource consumption
- Optimize based on usage patterns

## 🎯 Next Steps

1. **Deploy services** using your preferred platform
2. **Update Supabase** environment variables
3. **Deploy Edge Function** with new URLs
4. **Test integration** with Vercel app
5. **Monitor performance** and optimize

## 📞 Support

If you encounter issues:
1. Check service health endpoints
2. Verify environment variables
3. Check platform logs
4. Test OCR endpoints directly
5. Review Supabase Edge Function logs

Your OCR services will be accessible from your Vercel app at [https://document-intelligence-suite.vercel.app/](https://document-intelligence-suite.vercel.app/) once deployed!
