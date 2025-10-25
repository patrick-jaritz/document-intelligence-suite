#!/bin/bash
# Vercel Build Script
set -e

echo "🚀 Starting Vercel build process..."

# Navigate to frontend directory
cd frontend

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building project..."
npm run build

# Verify build
if [ ! -d "dist" ]; then
  echo "❌ Build failed - dist directory not found"
  exit 1
fi

if [ ! -f "dist/index.html" ]; then
  echo "❌ Build failed - index.html not found"
  exit 1
fi

echo "✅ Build completed successfully"
echo "📁 Build contents:"
ls -la dist/

echo "🎉 Vercel build process completed"
