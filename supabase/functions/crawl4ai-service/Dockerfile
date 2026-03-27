# Use Python 3.12 slim image
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    unzip \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Install crawl4ai setup
RUN crawl4ai-setup

# Copy application code
COPY . .

# Create non-root user for security
RUN useradd -m -u 1000 crawl4ai && chown -R crawl4ai:crawl4ai /app
USER crawl4ai

# Expose port
EXPOSE 8004

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8004/health || exit 1

# Run the service
CMD ["python3", "crawl4ai_service.py"]
