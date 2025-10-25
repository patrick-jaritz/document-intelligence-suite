#!/bin/bash

echo "🚀 Starting Document Intelligence Suite Real Services"
echo "=================================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker is running"
echo "✅ Docker Compose is available"

# Build and start services
echo ""
echo "🔨 Building and starting services..."
docker-compose up --build -d

# Wait for services to be ready
echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service health
echo ""
echo "🏥 Checking service health..."

# Check PaddleOCR
echo -n "PaddleOCR: "
if curl -s http://localhost:5001/health > /dev/null; then
    echo "✅ Healthy"
else
    echo "❌ Unhealthy"
fi

# Check dots.ocr
echo -n "dots.ocr: "
if curl -s http://localhost:5002/health > /dev/null; then
    echo "✅ Healthy"
else
    echo "❌ Unhealthy"
fi

# Check Crawl4AI
echo -n "Crawl4AI: "
if curl -s http://localhost:5003/health > /dev/null; then
    echo "✅ Healthy"
else
    echo "❌ Unhealthy"
fi

# Check Nginx
echo -n "Nginx: "
if curl -s http://localhost/health > /dev/null; then
    echo "✅ Healthy"
else
    echo "❌ Unhealthy"
fi

echo ""
echo "🎉 Services started successfully!"
echo ""
echo "📋 Service URLs:"
echo "  - PaddleOCR: http://localhost:5001"
echo "  - dots.ocr: http://localhost:5002"
echo "  - Crawl4AI: http://localhost:5003"
echo "  - Nginx (Load Balancer): http://localhost"
echo ""
echo "🔧 To stop services: docker-compose down"
echo "📊 To view logs: docker-compose logs -f"
echo "🔄 To restart: docker-compose restart"
