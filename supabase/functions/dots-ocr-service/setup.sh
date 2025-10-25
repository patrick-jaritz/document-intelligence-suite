#!/bin/bash

# dots.ocr Service Setup Script
echo "🚀 Setting up dots.ocr Service..."

# Create virtual environment
echo "📦 Creating Python virtual environment..."
python3 -m venv venv

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "⬆️ Upgrading pip..."
pip install --upgrade pip

# Install PyTorch first (with CUDA support)
echo "🔥 Installing PyTorch with CUDA support..."
pip install torch==2.7.0 torchvision==0.22.0 torchaudio==2.7.0 --index-url https://download.pytorch.org/whl/cu128

# Install other dependencies
echo "📚 Installing dots.ocr dependencies..."
pip install -r requirements.txt

# Create weights directory
echo "📁 Creating model weights directory..."
mkdir -p weights/DotsOCR

echo "✅ dots.ocr service setup complete!"
echo ""
echo "To download the model weights:"
echo "  source venv/bin/activate"
echo "  python3 tools/download_model.py"
echo ""
echo "To test the service:"
echo "  source venv/bin/activate"
echo "  echo 'base64_data_here' | python3 dots_ocr_service.py"
echo ""
echo "To run dots.ocr service:"
echo "  source venv/bin/activate"
echo "  python3 dots_ocr_service.py"
echo ""
echo "Note: The model weights will be downloaded automatically on first use"
echo "or you can download them manually using the download script."
