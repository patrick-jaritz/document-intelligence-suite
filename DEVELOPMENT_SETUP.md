# 🚀 Development Setup Guide

This guide helps you set up the Document Intelligence Suite for local development.

## 📋 Prerequisites

### Required
- **Node.js** 18+ (for frontend development)
- **Git** (for version control)
- **Vercel CLI** (for deployment)

### Optional (for full local development)
- **Docker Desktop** (for local Supabase and AI services)
- **Supabase CLI** (for database management)

## 🏗️ Quick Start (Production Mode)

### 1. Clone and Install
```bash
git clone <repository-url>
cd document-intelligence-suite-standalone
cd frontend
npm install
```

### 2. Build and Deploy
```bash
# Build frontend
npm run build

# Deploy to Vercel (if you have Vercel CLI)
vercel --prod

# Or push to GitHub for automatic deployment
git push origin main
```

### 3. Access Application
- **Production**: https://document-intelligence-suite.vercel.app/
- **Health Dashboard**: https://document-intelligence-suite.vercel.app/health

## 🔧 Full Local Development Setup

### 1. Install Dependencies
```bash
# Frontend dependencies
cd frontend
npm install

# Supabase CLI (optional)
npm install -g supabase
```

### 2. Environment Setup
Create `.env.local` in the frontend directory:
```env
VITE_SUPABASE_URL=https://joqnpibrfzqflyogrkht.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvcW5waWJyZnpxZmx5b2dya2h0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0Mjg5NTIsImV4cCI6MjA3NjAwNDk1Mn0.pIFvi2XRo1xmK3oZ-XBVpR6WvBye65a3ACE6wuFsxQk
VITE_DISABLE_CLIENT_LOGS=true
```

### 3. Start Development Server
```bash
cd frontend
npm run dev
```

### 4. Access Local Development
- **Frontend**: http://localhost:5173
- **Health Dashboard**: http://localhost:5173/health

## 🐳 Docker Services (Optional)

### Prerequisites
- Docker Desktop installed and running
- Docker Compose available

### Start AI Services Locally
```bash
# Start all AI services
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

### Available Services
- **PaddleOCR**: http://localhost:5001
- **dots.ocr**: http://localhost:5002
- **Crawl4AI**: http://localhost:5003
- **Nginx Proxy**: http://localhost:8080

### Stop Services
```bash
docker-compose down
```

## 🗄️ Database Management (Optional)

### Using Supabase CLI
```bash
# Link to your project
supabase link --project-ref joqnpibrfzqflyogrkht

# Deploy Edge Functions
supabase functions deploy

# View logs
supabase functions logs

# Reset database (careful!)
supabase db reset
```

### Using Supabase Dashboard
- **URL**: https://supabase.com/dashboard/project/joqnpibrfzqflyogrkht
- **Features**: Database management, Edge Functions, Storage, Logs

## 🧪 Testing

### Frontend Testing
```bash
cd frontend
npm run typecheck  # TypeScript checking
npm run lint       # ESLint checking
npm run build      # Production build test
```

### API Testing
```bash
# Test OCR processing
curl -X POST https://joqnpibrfzqflyogrkht.supabase.co/functions/v1/process-pdf-ocr \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"documentId":"test","jobId":"test","fileUrl":"test","ocrProvider":"google-vision"}'

# Test URL processing
curl -X POST https://joqnpibrfzqflyogrkht.supabase.co/functions/v1/process-url \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"documentId":"test","jobId":"test","url":"https://example.com"}'
```

## 🚀 Deployment

### Automatic Deployment
- **GitHub Integration**: Push to `main` branch triggers Vercel deployment
- **Frontend**: Automatically deployed to Vercel
- **Backend**: Edge Functions deployed to Supabase

### Manual Deployment
```bash
# Deploy Edge Functions
supabase functions deploy

# Deploy Frontend
cd frontend
vercel --prod
```

## 🔍 Monitoring

### Health Dashboard
- **Production**: https://document-intelligence-suite.vercel.app/health
- **Local**: http://localhost:5173/health

### Logs
- **Supabase Logs**: https://supabase.com/dashboard/project/joqnpibrfzqflyogrkht/logs
- **Vercel Logs**: Available in Vercel Dashboard

## 🛠️ Troubleshooting

### Common Issues

#### 1. Docker Not Running
```bash
# Start Docker Desktop
# Or skip Docker services and use production APIs
```

#### 2. Supabase Connection Issues
```bash
# Check environment variables
# Verify Supabase project is active
# Check network connectivity
```

#### 3. Build Failures
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check Node.js version (18+ required)
node --version
```

#### 4. Rate Limiting
- OCR: 10 requests/minute
- URL: 20 requests/minute
- GitHub: 5 requests/minute
- Wait for rate limit reset or use different IP

## 📚 Development Tips

### 1. Use Production APIs
- No need for local Docker services
- All AI processing happens in Supabase Edge Functions
- Real-time monitoring available

### 2. Environment Variables
- Frontend variables are embedded at build time
- Backend uses Supabase environment variables
- No local .env files needed for basic development

### 3. Hot Reload
- Frontend changes reload automatically
- Edge Function changes require deployment
- Use `supabase functions deploy` for backend changes

### 4. Debugging
- Use browser dev tools for frontend
- Check Supabase logs for backend issues
- Use health dashboard for system monitoring

## 🎯 Production vs Development

### Production (Recommended)
- ✅ **No Docker required**
- ✅ **Real AI services**
- ✅ **Full monitoring**
- ✅ **Automatic scaling**
- ✅ **Global CDN**

### Local Development
- 🔧 **Docker for AI services**
- 🔧 **Local Supabase (optional)**
- 🔧 **Manual deployment**
- 🔧 **Limited monitoring**

## 📞 Support

- **Documentation**: Check this file and code comments
- **Issues**: Create GitHub issues
- **Health Dashboard**: Monitor system status
- **Logs**: Check Supabase and Vercel logs

---

**Happy Coding! 🚀**
