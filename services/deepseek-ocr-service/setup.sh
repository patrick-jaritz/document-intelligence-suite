#!/bin/bash

# DeepSeek OCR Service Setup
# This script sets up the DeepSeek OCR service for document intelligence

set -e

echo "🚀 Setting up DeepSeek OCR Service..."

# Check for Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check for NVIDIA support (optional but recommended)
if command -v nvidia-smi &> /dev/null; then
    echo "✅ NVIDIA GPU detected"
else
    echo "⚠️  No NVIDIA GPU detected. DeepSeek OCR works best with GPU acceleration."
fi

# Navigate to service directory
cd "$(dirname "$0")"

# Build and start the service
echo "📦 Building Docker image..."
docker compose up --build -d

echo ""
echo "✅ DeepSeek OCR service is starting..."
echo "📝 Note: First run will download the model (~5-10GB), this may take some time."
echo ""
echo "🔍 Check status: docker compose logs -f"
echo "🌐 Service will be available at: http://localhost:5003"
echo "📚 API docs: http://localhost:5003/docs"
echo ""
echo "To stop: docker compose down"
