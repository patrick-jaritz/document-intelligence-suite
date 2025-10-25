#!/bin/bash

# Deploy OCR Services to Railway for Vercel Integration
# This script deploys PaddleOCR and dots.ocr services to Railway

set -e

echo "🚀 Deploying OCR Services to Railway for Vercel Integration..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI is not installed. Please install it first:"
    echo "   npm install -g @railway/cli"
    echo "   railway login"
    exit 1
fi

# Check if user is logged in
if ! railway whoami &> /dev/null; then
    echo "❌ Please login to Railway first:"
    echo "   railway login"
    exit 1
fi

echo "📦 Creating Railway projects..."

# Create PaddleOCR service
echo "🔨 Deploying PaddleOCR service..."
cd services/paddleocr
railway login
railway init --name paddleocr-service
railway add --service paddleocr-service
railway up --detach
PADDLEOCR_URL=$(railway domain)
echo "✅ PaddleOCR deployed at: $PADDLEOCR_URL"

# Create dots.ocr service
echo "🔨 Deploying dots.ocr service..."
cd ../dots-ocr
railway init --name dots-ocr-service
railway add --service dots-ocr-service
railway up --detach
DOTS_OCR_URL=$(railway domain)
echo "✅ dots.ocr deployed at: $DOTS_OCR_URL"

cd ../..

echo ""
echo "🎉 OCR Services Deployed Successfully!"
echo ""
echo "Service URLs:"
echo "  - PaddleOCR: $PADDLEOCR_URL"
echo "  - dots.ocr: $DOTS_OCR_URL"
echo ""
echo "Next steps:"
echo "1. Update your Supabase Edge Function environment variables:"
echo "   PADDLEOCR_SERVICE_URL=$PADDLEOCR_URL"
echo "   DOTS_OCR_SERVICE_URL=$DOTS_OCR_URL"
echo ""
echo "2. Deploy the updated Edge Function:"
echo "   npx supabase functions deploy process-pdf-ocr"
echo ""
echo "3. Test with your Vercel app at:"
echo "   https://document-intelligence-suite.vercel.app/"
echo ""
echo "Health check URLs:"
echo "  - PaddleOCR: $PADDLEOCR_URL/health"
echo "  - dots.ocr: $DOTS_OCR_URL/health"
