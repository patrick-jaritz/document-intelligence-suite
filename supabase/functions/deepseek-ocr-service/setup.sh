#!/bin/bash
echo "🔧 Setting up DeepSeek-OCR service..."

# Check for GPU
if command -v nvidia-smi &> /dev/null; then
    echo "✅ NVIDIA GPU detected"
    nvidia-smi --query-gpu=name,memory.total --format=csv,noheader
else
    echo "⚠️  No NVIDIA GPU detected. Running on CPU will be very slow."
fi

# Create virtual environment
echo "📦 Creating Python virtual environment..."
python3 -m venv venv

# Activate virtual environment
echo "🔌 Activating virtual environment..."
source venv/bin/activate

# Install PyTorch with CUDA support
echo "📥 Installing PyTorch with CUDA 11.8 support..."
pip install torch==2.6.0 torchvision==0.21.0 torchaudio==2.6.0 --index-url https://download.pytorch.org/whl/cu118

# Install other dependencies
echo "📥 Installing other dependencies..."
pip install -r requirements.txt

echo "✅ DeepSeek-OCR environment setup complete!"
echo ""
echo "To start the service:"
echo "  1. Activate: source venv/bin/activate"
echo "  2. Run: gunicorn -c run_service.py deepseek_ocr_service:app"
echo ""
echo "Or use Docker:"
echo "  docker-compose up"
