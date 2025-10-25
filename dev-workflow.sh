#!/bin/bash
# Development workflow script

set -e

echo "🚀 Starting development workflow..."

# Function to deploy
deploy() {
    echo "📤 Deploying to Vercel..."
    
    # Build frontend
    echo "🔨 Building frontend..."
    cd frontend
    npm run build
    cd ..
    
    # Commit changes
    echo "📝 Committing changes..."
    git add .
    git commit -m "🚀 Deploy: $(date)" || true
    
    # Push to GitHub
    echo "📤 Pushing to GitHub..."
    git push origin main
    
    # Deploy to Vercel
    echo "🚀 Deploying to Vercel..."
    vercel --prod --yes
    
    echo "✅ Deployment completed!"
}

# Function to monitor
monitor() {
    echo "🔍 Monitoring deployment..."
    while true; do
        echo "Checking deployment status..."
        if curl -s -f https://document-intelligence-suite.vercel.app/ > /dev/null; then
            echo "✅ App is accessible"
        else
            echo "❌ App is not accessible"
        fi
        sleep 30
    done
}

# Function to debug
debug() {
    echo "🔍 Running debug checks..."
    
    echo "1. Checking Git status..."
    git status --porcelain
    
    echo "2. Checking build output..."
    if [ -f "frontend/dist/index.html" ]; then
        echo "✅ index.html exists"
    else
        echo "❌ index.html missing"
    fi
    
    echo "3. Checking Vercel config..."
    if [ -f "vercel.json" ]; then
        echo "✅ vercel.json exists"
    else
        echo "❌ vercel.json missing"
    fi
    
    echo "4. Testing local build..."
    cd frontend
    npm run build
    cd ..
    
    echo "✅ Debug completed"
}

# Main script
case "$1" in
    "deploy")
        deploy
        ;;
    "monitor")
        monitor
        ;;
    "debug")
        debug
        ;;
    *)
        echo "Usage: $0 {deploy|monitor|debug}"
        echo ""
        echo "Commands:"
        echo "  deploy  - Build and deploy to Vercel"
        echo "  monitor - Monitor deployment status"
        echo "  debug   - Run debug checks"
        exit 1
        ;;
esac
