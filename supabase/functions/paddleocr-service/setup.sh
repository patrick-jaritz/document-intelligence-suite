#!/bin/bash

# PaddleOCR Service Setup Script
echo "🚀 Setting up PaddleOCR Service..."

# Create virtual environment
echo "📦 Creating Python virtual environment..."
python3 -m venv venv

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "⬆️ Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo "📚 Installing PaddleOCR dependencies..."
pip install -r requirements.txt

# Download PaddleOCR models (this happens automatically on first run)
echo "🧠 Preparing PaddleOCR models..."
python3 -c "from paddleocr import PaddleOCR; PaddleOCR(use_angle_cls=True, lang='en')"

echo "✅ PaddleOCR service setup complete!"
echo ""
echo "To test the service:"
echo "  source venv/bin/activate"
echo "  echo 'base64_data_here' | python3 run_ocr.py"
echo ""
echo "To run OCR service:"
echo "  source venv/bin/activate"
echo "  python3 ocr_service.py"
