# Production Setup Guide for OCR Services

This guide will help you set up PaddleOCR and dots.ocr services for production use.

## 🚀 Quick Start

### 1. Deploy OCR Services

```bash
# Make the deployment script executable
chmod +x deploy-ocr-services.sh

# Deploy all OCR services
./deploy-ocr-services.sh
```

### 2. Update Environment Variables

Add these environment variables to your Supabase project:

```bash
# In your Supabase project settings > Edge Functions > Environment Variables
PADDLEOCR_SERVICE_URL=https://your-domain.com/paddleocr
DOTS_OCR_SERVICE_URL=https://your-domain.com/dots-ocr
```

### 3. Deploy Updated Edge Function

```bash
# Deploy the updated Edge Function
npx supabase functions deploy process-pdf-ocr
```

## 📋 Prerequisites

- Docker and Docker Compose installed
- Supabase CLI installed
- Access to your Supabase project

## 🔧 Service Details

### PaddleOCR Service
- **Port**: 5001
- **Health Check**: `http://localhost:5001/health`
- **OCR Endpoint**: `http://localhost:5001/ocr`
- **Features**: 
  - High accuracy OCR
  - Multi-language support
  - PDF and image processing
  - Layout analysis

### dots.ocr Service
- **Port**: 5002
- **Health Check**: `http://localhost:5002/health`
- **OCR Endpoint**: `http://localhost:5002/ocr`
- **Features**:
  - State-of-the-art accuracy
  - Layout structure preservation
  - Reading order detection
  - Multi-language auto-detection

### Nginx Proxy
- **Port**: 8080
- **Features**:
  - Load balancing
  - Health checks
  - Request routing

## 🌐 Production Deployment Options

### Option 1: Local Development
```bash
# Run services locally
docker-compose -f docker-compose.ocr.yml up -d
```

### Option 2: Cloud Deployment (Recommended)

#### Using Railway
1. Connect your GitHub repository to Railway
2. Add environment variables in Railway dashboard
3. Deploy each service separately

#### Using Render
1. Create web services for each OCR service
2. Use the provided Dockerfiles
3. Set environment variables

#### Using AWS ECS/Fargate
1. Build and push Docker images to ECR
2. Create ECS task definitions
3. Deploy as Fargate services

#### Using Google Cloud Run
1. Build and push images to Google Container Registry
2. Deploy as Cloud Run services
3. Set environment variables

## 🔐 Environment Variables

### Required for Edge Function
```bash
PADDLEOCR_SERVICE_URL=https://your-paddleocr-service.com
DOTS_OCR_SERVICE_URL=https://your-dots-ocr-service.com
```

### Optional for dots.ocr Service
```bash
DOTS_OCR_API_URL=https://api.dots.ocr.com/v1/process
DOTS_OCR_API_KEY=your_api_key_here
```

## 📊 Monitoring and Health Checks

### Health Check Endpoints
- **All Services**: `http://localhost:8080/health`
- **PaddleOCR**: `http://localhost:5001/health`
- **dots.ocr**: `http://localhost:5002/health`

### Logs
```bash
# View all logs
docker-compose -f docker-compose.ocr.yml logs -f

# View specific service logs
docker-compose -f docker-compose.ocr.yml logs -f paddleocr
docker-compose -f docker-compose.ocr.yml logs -f dots-ocr
```

## 🚨 Troubleshooting

### Common Issues

1. **Services not starting**
   ```bash
   # Check Docker logs
   docker-compose -f docker-compose.ocr.yml logs
   
   # Restart services
   docker-compose -f docker-compose.ocr.yml restart
   ```

2. **Memory issues**
   ```bash
   # Check memory usage
   docker stats
   
   # Increase memory limits in docker-compose.ocr.yml
   ```

3. **Connection refused errors**
   - Check if services are running: `docker-compose -f docker-compose.ocr.yml ps`
   - Verify port mappings
   - Check firewall settings

### Performance Optimization

1. **GPU Support** (for PaddleOCR)
   ```dockerfile
   # In PaddleOCR Dockerfile, change:
   use_gpu=True
   ```

2. **Resource Limits**
   ```yaml
   # In docker-compose.ocr.yml
   deploy:
     resources:
       limits:
         memory: 4G
         cpus: '2.0'
   ```

3. **Scaling**
   ```bash
   # Scale services
   docker-compose -f docker-compose.ocr.yml up -d --scale paddleocr=2
   ```

## 🔄 Updates and Maintenance

### Updating Services
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart services
docker-compose -f docker-compose.ocr.yml down
docker-compose -f docker-compose.ocr.yml build --no-cache
docker-compose -f docker-compose.ocr.yml up -d
```

### Backup and Recovery
```bash
# Backup service configurations
tar -czf ocr-services-backup.tar.gz services/ docker-compose.ocr.yml nginx.conf

# Restore from backup
tar -xzf ocr-services-backup.tar.gz
```

## 📈 Performance Metrics

### Expected Performance
- **PaddleOCR**: 2-5 seconds per page
- **dots.ocr**: 1-3 seconds per page
- **Memory Usage**: 1-2GB per service
- **Accuracy**: 95-98% for most documents

### Monitoring
- Use the health check endpoints for uptime monitoring
- Monitor memory and CPU usage
- Track OCR processing times
- Monitor error rates

## 🎯 Next Steps

1. **Deploy services** using the deployment script
2. **Update environment variables** in Supabase
3. **Deploy the updated Edge Function**
4. **Test OCR functionality** with real documents
5. **Monitor performance** and adjust resources as needed
6. **Set up monitoring** and alerting for production

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review service logs
3. Verify environment variables
4. Test health check endpoints
5. Check resource usage and limits

For additional help, refer to the service-specific documentation or create an issue in the repository.
