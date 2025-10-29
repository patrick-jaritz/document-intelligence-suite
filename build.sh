#!/bin/bash
# Build script for Vercel deployment

set -e

echo "🚀 Starting build process..."

# Clean previous build
if [ -d "frontend/dist" ]; then
    echo "🧹 Cleaning previous build..."
    rm -rf frontend/dist
fi

# Install dependencies
echo "📦 Installing dependencies..."
cd frontend
npm install
cd ..

# Build frontend
echo "🔨 Building frontend..."
cd frontend
npm run build
cd ..

# Verify build
if [ ! -f "frontend/dist/index.html" ]; then
    echo "❌ Build failed - index.html not found"
    exit 1
fi

echo "✅ Build completed successfully"
echo "📁 Build output:"
ls -la frontend/dist/

echo "🎉 Build process completed!"
