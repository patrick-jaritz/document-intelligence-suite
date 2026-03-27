#!/bin/bash

# crawl4ai Service Setup Script
echo "🚀 Setting up crawl4ai Service..."

# Create virtual environment
echo "📦 Creating Python virtual environment..."
python3 -m venv venv

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "⬆️ Upgrading pip..."
pip install --upgrade pip

# Install crawl4ai and dependencies
echo "🕸️ Installing crawl4ai and dependencies..."
pip install -r requirements.txt

# Run crawl4ai setup
echo "🔧 Running crawl4ai setup..."
crawl4ai-setup

# Verify installation
echo "🔍 Verifying crawl4ai installation..."
crawl4ai-doctor

echo "✅ crawl4ai service setup complete!"
echo ""
echo "To test the service:"
echo "  source venv/bin/activate"
echo "  python3 crawl4ai_service.py https://example.com"
echo ""
echo "To run crawl4ai service:"
echo "  source venv/bin/activate"
echo "  python3 crawl4ai_service.py"
echo ""
echo "Note: crawl4ai will automatically handle browser installation and setup"
echo "For production deployment, consider using Docker for better isolation."
