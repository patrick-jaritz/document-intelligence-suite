#!/bin/bash

# Deploy OCR Services Script
# This script builds and deploys PaddleOCR and dots.ocr services

set -e

echo "🚀 Starting OCR Services Deployment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose is not installed. Please install docker-compose and try again."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
# OCR Services Configuration
DOTS_OCR_API_URL=
DOTS_OCR_API_KEY=

# Optional: Override default ports
PADDLEOCR_PORT=5001
DOTS_OCR_PORT=5002
NGINX_PORT=8080
EOF
    echo "✅ Created .env file. You can edit it to add API keys if needed."
fi

# Build and start services
echo "🔨 Building OCR services..."
docker-compose -f docker-compose.ocr.yml build

echo "🚀 Starting OCR services..."
docker-compose -f docker-compose.ocr.yml up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check service health
echo "🔍 Checking service health..."

# Check PaddleOCR
if curl -f http://localhost:5001/health > /dev/null 2>&1; then
    echo "✅ PaddleOCR service is healthy"
else
    echo "❌ PaddleOCR service is not responding"
fi

# Check dots.ocr
if curl -f http://localhost:5002/health > /dev/null 2>&1; then
    echo "✅ dots.ocr service is healthy"
else
    echo "❌ dots.ocr service is not responding"
fi

# Check nginx proxy
if curl -f http://localhost:8080/health > /dev/null 2>&1; then
    echo "✅ Nginx proxy is healthy"
else
    echo "❌ Nginx proxy is not responding"
fi

echo ""
echo "🎉 OCR Services Deployment Complete!"
echo ""
echo "Services available at:"
echo "  - PaddleOCR: http://localhost:5001"
echo "  - dots.ocr: http://localhost:5002"
echo "  - Nginx Proxy: http://localhost:8080"
echo ""
echo "Health checks:"
echo "  - PaddleOCR: http://localhost:5001/health"
echo "  - dots.ocr: http://localhost:5002/health"
echo "  - All services: http://localhost:8080/health"
echo ""
echo "To stop services:"
echo "  docker-compose -f docker-compose.ocr.yml down"
echo ""
echo "To view logs:"
echo "  docker-compose -f docker-compose.ocr.yml logs -f"
