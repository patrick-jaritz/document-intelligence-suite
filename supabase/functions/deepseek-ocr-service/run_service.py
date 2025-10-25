#!/usr/bin/env python3
"""
DeepSeek-OCR Service Runner
Starts the Flask app with Gunicorn for production use
"""

import multiprocessing
import os

# Calculate workers (2 x CPU cores)
workers = multiprocessing.cpu_count() * 2 + 1

# Gunicorn configuration
bind = "0.0.0.0:5003"
worker_class = "sync"
workers = min(workers, 4)  # Limit to 4 for GPU memory
worker_timeout = 300  # 5 minutes for model inference
keepalive = 120
max_requests = 1000
max_requests_jitter = 100

# Logging
accesslog = "-"
errorlog = "-"
loglevel = "info"

# Preload app for faster response
preload_app = True

# Worker lifecycle
def on_starting(server):
    """Called just before the master process is initialized"""
    print("🚀 Starting DeepSeek-OCR service...")
    print(f"📊 Workers: {workers}")
    print(f"🔧 Worker timeout: {worker_timeout}s")

def when_ready(server):
    """Called just after the server is started"""
    print("✅ DeepSeek-OCR service is ready!")
    print(f"🌐 Server running at http://{bind}")

def on_exit(server):
    """Called just before exiting"""
    print("👋 Shutting down DeepSeek-OCR service")
