#!/bin/bash

# Quick Deploy Script for Vercel Integration
# This script provides multiple deployment options

set -e

echo "🚀 Quick Deploy for Vercel Integration"
echo "======================================"
echo ""
echo "Your Vercel app: https://document-intelligence-suite.vercel.app/"
echo ""
echo "Choose deployment option:"
echo "1. Railway (Recommended - Easy setup)"
echo "2. Render (Good alternative)"
echo "3. Manual instructions"
echo "4. Test current setup"
echo ""

read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        echo "🚀 Deploying to Railway..."
        if ! command -v railway &> /dev/null; then
            echo "Installing Railway CLI..."
            npm install -g @railway/cli
        fi
        ./deploy-to-railway.sh
        ;;
    2)
        echo "📋 Render Deployment Instructions:"
        echo ""
        echo "1. Go to https://render.com"
        echo "2. Connect your GitHub repository"
        echo "3. Create two new Web Services:"
        echo "   - Service 1: Use ./services/paddleocr/Dockerfile"
        echo "   - Service 2: Use ./services/dots-ocr/Dockerfile"
        echo "4. Set start command: gunicorn --bind 0.0.0.0:\$PORT --workers 1 --timeout 120 app:app"
        echo "5. Set health check path: /health"
        echo "6. Deploy both services"
        echo "7. Get URLs and update Supabase environment variables"
        echo ""
        echo "See VERCEL_DEPLOYMENT.md for detailed instructions."
        ;;
    3)
        echo "📖 Manual Deployment Instructions:"
        echo ""
        echo "1. Choose a cloud platform (Railway, Render, Google Cloud Run, AWS, etc.)"
        echo "2. Deploy PaddleOCR service using ./services/paddleocr/"
        echo "3. Deploy dots.ocr service using ./services/dots-ocr/"
        echo "4. Get service URLs"
        echo "5. Update Supabase environment variables:"
        echo "   PADDLEOCR_SERVICE_URL=https://your-paddleocr-url"
        echo "   DOTS_OCR_SERVICE_URL=https://your-dots-ocr-url"
        echo "6. Deploy Edge Function: npx supabase functions deploy process-pdf-ocr"
        echo "7. Test at https://document-intelligence-suite.vercel.app/"
        echo ""
        echo "See VERCEL_DEPLOYMENT.md for detailed instructions."
        ;;
    4)
        echo "🧪 Testing current setup..."
        node -e "
        const SUPABASE_URL = 'https://joqnpibrfzqflyogrkht.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvcW5waWJyZnpxZmx5b2dya2h0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0Mjg5NTIsImV4cCI6MjA3NjAwNDk1Mn0.pIFvi2XRo1xmK3oZ-XBVpR6WvBye65a3ACE6wuFsxQk';
        
        async function test() {
          try {
            const response = await fetch(\`\${SUPABASE_URL}/functions/v1/process-pdf-ocr\`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': \`Bearer \${SUPABASE_ANON_KEY}\`,
                'apikey': SUPABASE_ANON_KEY,
              },
              body: JSON.stringify({
                documentId: 'test-' + Date.now(),
                jobId: 'job-' + Date.now(),
                fileUrl: 'data-url',
                fileDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
                ocrProvider: 'dots-ocr'
              }),
            });
            
            const result = await response.json();
            console.log('✅ Test successful!');
            console.log('Status:', response.status);
            console.log('Provider:', result.metadata?.provider);
            console.log('Method:', result.metadata?.processing_method);
            console.log('Text length:', result.extractedText?.length || 0);
          } catch (error) {
            console.log('❌ Test failed:', error.message);
          }
        }
        
        test();
        "
        ;;
    *)
        echo "❌ Invalid choice. Please run the script again and choose 1-4."
        exit 1
        ;;
esac

echo ""
echo "🎉 Setup complete! Your OCR services will work with:"
echo "   https://document-intelligence-suite.vercel.app/"
