# Deploy EasyOCR to Railway (Step by Step)

Railway is a cloud platform that makes deployment super easy - no ports, no Docker setup needed!

## Prerequisites

1. A [Railway account](https://railway.app) (Free tier available)
2. Node.js installed (for the CLI)

## Deployment Steps

### Step 1: Install Railway CLI

```bash
npm i -g @railway/cli
```

### Step 2: Login to Railway

```bash
railway login
```

This will open your browser to authenticate.

### Step 3: Navigate to EasyOCR Service

```bash
cd supabase/functions/easyocr-service
```

### Step 4: Initialize Railway Project

```bash
railway init
```

This creates a `.railway` config file.

### Step 5: Deploy!

```bash
railway up
```

Railway will:
- Build your Docker image
- Deploy to the cloud
- Assign you a public URL (like `https://easyocr-production.up.railway.app`)
- Provide HTTPS automatically

### Step 6: Get Your URL

```bash
railway domain
```

This shows your public URL.

### Step 7: Configure Your App

In your Supabase project settings, add the environment variable:

```bash
EASYOCR_SERVICE_URL=https://easyocr-production.up.railway.app
```

Or set it via Railway CLI:
```bash
railway variables set EASYOCR_SERVICE_URL=https://easyocr-production.up.railway.app
```

## That's It!

Your EasyOCR service is now:
- ✅ Running in the cloud
- ✅ Publicly accessible
- ✅ No local ports needed
- ✅ HTTPS enabled
- ✅ Auto-updates on git push (optional)

## Optional: Connect to GitHub

If you want auto-deployments:

1. Connect your GitHub repo in Railway dashboard
2. Railway will deploy whenever you push to `main`

## Cost

Railway free tier includes:
- $5 credit per month
- Perfect for testing and small deployments

Paid tier starts at $20/month for production use.

## Verify Deployment

Test your deployed service:

```bash
curl https://your-railway-url.up.railway.app/health
```

Should return a health check response.

## Update Service

To update your service:

```bash
cd supabase/functions/easyocr-service
railway up
```

## Logs

View logs:
```bash
railway logs
```

## Stop Service

To stop the service:
```bash
railway down
```

## Alternatives

If you don't want to use Railway, you can also deploy to:
- **Render**: https://render.com
- **Fly.io**: https://fly.io  
- **Heroku**: https://www.heroku.com

But Railway is the easiest! 🚀

