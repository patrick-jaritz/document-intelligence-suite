# PaddleOCR Service Dockerfile
FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libavcodec-dev \
    libavformat-dev \
    libswscale-dev \
    libv4l-dev \
    libxvidcore-dev \
    libx264-dev \
    libjpeg-dev \
    libpng-dev \
    libtiff-dev \
    libatlas-base-dev \
    python3-dev \
    python3-pip \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy OCR service files
COPY ocr_service.py .
COPY run_ocr.py .

# Make scripts executable
RUN chmod +x run_ocr.py

# Create a non-root user
RUN useradd -m -u 1000 ocruser && chown -R ocruser:ocruser /app
USER ocruser

# Expose port for HTTP service (if needed)
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python3 -c "from paddleocr import PaddleOCR; print('OK')" || exit 1

# Default command
CMD ["python3", "run_ocr.py"]
