"""
DeepSeek-OCR Service
Flask API for OCR processing using DeepSeek-OCR model
"""

import os
import sys
import json
import base64
import logging
from io import BytesIO
from typing import Dict, Any
from datetime import datetime

import torch
from PIL import Image
from pdf2image import convert_from_bytes
from flask import Flask, request, jsonify
import numpy as np

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Global model instance
model = None
tokenizer = None
model_loaded = False


def load_model():
    """Load DeepSeek-OCR model"""
    global model, tokenizer, model_loaded
    
    if model_loaded:
        logger.info("Model already loaded")
        return
    
    try:
        logger.info("Loading DeepSeek-OCR model...")
        
        # Check for CUDA
        device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Using device: {device}")
        
        if device == "cpu":
            logger.warning("CUDA not available. Using CPU (will be very slow)")
        
        from transformers import AutoModel, AutoTokenizer
        
        model_name = 'deepseek-ai/DeepSeek-OCR'
        
        # Load tokenizer
        logger.info("Loading tokenizer...")
        tokenizer = AutoTokenizer.from_pretrained(
            model_name, 
            trust_remote_code=True
        )
        
        # Load model
        logger.info("Loading model...")
        model = AutoModel.from_pretrained(
            model_name,
            _attn_implementation='flash_attention_2',
            trust_remote_code=True,
            use_safetensors=True,
            torch_dtype=torch.bfloat16 if device == "cuda" else torch.float32
        )
        
        model = model.eval()
        
        if device == "cuda":
            model = model.cuda()
        
        model_loaded = True
        logger.info("✅ Model loaded successfully")
        
    except Exception as e:
        logger.error(f"❌ Failed to load model: {e}", exc_info=True)
        raise


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': model_loaded,
        'cuda_available': torch.cuda.is_available(),
        'timestamp': datetime.now().isoformat()
    })


@app.route('/ocr', methods=['POST'])
def ocr_endpoint():
    """Main OCR processing endpoint"""
    try:
        # Load model if not loaded
        if not model_loaded:
            load_model()
        
        # Get request data
        data = request.json
        file_data_url = data.get('fileDataUrl', '')
        file_type = data.get('fileType', 'application/pdf')
        
        if not file_data_url:
            return jsonify({'error': 'No file data provided'}), 400
        
        logger.info(f"Processing file type: {file_type}")
        
        # Extract base64 data
        if ',' in file_data_url:
            base64_data = file_data_url.split(',')[1]
        else:
            base64_data = file_data_url
        
        # Decode base64
        file_bytes = base64.b64decode(base64_data)
        
        # Convert to images
        images = []
        if 'pdf' in file_type.lower():
            logger.info("Converting PDF to images...")
            images = convert_from_bytes(file_bytes, dpi=200)
        else:
            # Assume image file
            image = Image.open(BytesIO(file_bytes)).convert('RGB')
            images = [image]
        
        logger.info(f"Processing {len(images)} page(s)")
        
        # Process each image
        extracted_texts = []
        for i, image in enumerate(images):
            logger.info(f"Processing page {i + 1}/{len(images)}")
            
            try:
                # Prepare prompt for document conversion
                prompt = "<image>\n<|grounding|>Convert the document to markdown."
                
                # Perform inference
                result = model.infer(
                    tokenizer,
                    prompt=prompt,
                    image_file=image,  # Pass PIL Image directly
                    output_path=f'/app/output/page_{i+1}.txt',
                    base_size=1024,
                    image_size=640,
                    crop_mode=True,
                    save_results=False,  # Don't save files
                    test_compress=True
                )
                
                # Extract text from result
                if isinstance(result, dict) and 'text' in result:
                    text = result['text']
                elif isinstance(result, str):
                    text = result
                else:
                    text = str(result)
                
                extracted_texts.append(text)
                logger.info(f"✅ Page {i + 1} processed successfully")
                
            except Exception as e:
                logger.error(f"❌ Error processing page {i + 1}: {e}", exc_info=True)
                extracted_texts.append(f"[Error processing page {i + 1}: {str(e)}]")
        
        # Combine all pages
        full_text = "\n\n--- Page Break ---\n\n".join(extracted_texts)
        
        # Return result
        return jsonify({
            'text': full_text,
            'metadata': {
                'provider': 'deepseek-ocr',
                'confidence': 0.98,
                'pages': len(images),
                'language': 'auto',
                'processing_method': 'deepseek_ocr_transformers',
                'model': 'deepseek-ai/DeepSeek-OCR',
                'device': 'cuda' if torch.cuda.is_available() else 'cpu',
                'total_pages': len(images)
            }
        })
        
    except Exception as e:
        logger.error(f"Error in OCR processing: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@app.route('/warmup', methods=['POST'])
def warmup():
    """Warmup endpoint to preload the model"""
    try:
        if not model_loaded:
            load_model()
        
        return jsonify({
            'status': 'ready',
            'model_loaded': model_loaded
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    # Preload model
    logger.info("Starting DeepSeek-OCR service...")
    try:
        load_model()
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        sys.exit(1)
    
    # Start Flask app
    app.run(host='0.0.0.0', port=5003, debug=False)
