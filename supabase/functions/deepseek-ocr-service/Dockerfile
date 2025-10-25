# DeepSeek-OCR Service Dockerfile
# Based on CUDA 11.8 for PyTorch 2.6.0 support
FROM nvidia/cuda:11.8.0-devel-ubuntu22.04

# Install Python 3.12
RUN apt-get update && apt-get install -y \
    python3.12 \
    python3.12-venv \
    python3-pip \
    git \
    wget \
    poppler-utils \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .

# Install PyTorch with CUDA support
RUN pip3 install --no-cache-dir torch==2.6.0 torchvision==0.21.0 torchaudio==2.6.0 --index-url https://download.pytorch.org/whl/cu118

# Install other dependencies
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy service files
COPY deepseek_ocr_service.py .
COPY run_service.py .
COPY setup.sh .

# Make scripts executable
RUN chmod +x run_service.py setup.sh

# Create directories
RUN mkdir -p /app/models /app/output

# Expose port
EXPOSE 5003

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV TRANSFORMERS_CACHE=/app/models
ENV HF_HOME=/app/models

# Health check
HEALTHCHECK --interval=60s --timeout=30s --start-period=120s --retries=3 \
    CMD curl -f http://localhost:5003/health || exit 1

# Default command
CMD ["python3", "run_service.py"]
