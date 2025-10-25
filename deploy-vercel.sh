#!/bin/bash

# Deploy OCR Services to Vercel
# This script deploys the OCR services as Vercel serverless functions

set -e

echo "🚀 Deploying OCR Services to Vercel"
echo "===================================="
echo ""
echo "Your app: https://document-intelligence-suite.vercel.app/"
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI is not installed. Installing now..."
    npm install -g vercel
fi

# Check if user is logged in
if ! vercel whoami &> /dev/null; then
    echo "❌ Please login to Vercel first:"
    echo "   vercel login"
    exit 1
fi

echo "📦 Deploying to Vercel..."

# Deploy to Vercel
vercel --prod

echo ""
echo "🎉 OCR Services Deployed Successfully!"
echo ""
echo "Your OCR services are now available at:"
echo "  - PaddleOCR: https://document-intelligence-suite.vercel.app/api/paddleocr/ocr"
echo "  - dots.ocr: https://document-intelligence-suite.vercel.app/api/dots-ocr/ocr"
echo ""
echo "Next steps:"
echo "1. Deploy the updated Supabase Edge Function:"
echo "   npx supabase functions deploy process-pdf-ocr"
echo ""
echo "2. Test your app at:"
echo "   https://document-intelligence-suite.vercel.app/"
echo ""
echo "Health check URLs:"
echo "  - PaddleOCR: https://document-intelligence-suite.vercel.app/api/paddleocr/ocr"
echo "  - dots.ocr: https://document-intelligence-suite.vercel.app/api/dots-ocr/ocr"
echo ""
echo "✅ No additional environment variables needed!"
echo "   The Edge Function will automatically use your Vercel API endpoints."
