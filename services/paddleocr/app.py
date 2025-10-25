#!/usr/bin/env python3
"""
PaddleOCR Service for Document Intelligence Suite
Production-ready OCR service using PaddleOCR
"""

import os
import base64
import json
import logging
from io import BytesIO
from typing import Dict, Any, List
from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
from paddleocr import PaddleOCR
from pdf2image import convert_from_bytes
import tempfile
import traceback

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Initialize PaddleOCR with optimized settings
ocr_engine = PaddleOCR(
    use_angle_cls=True,
    lang='en',
    use_gpu=False,  # Set to True if GPU is available
    show_log=False
)

def process_pdf_to_images(pdf_data: bytes) -> List[np.ndarray]:
    """Convert PDF to images for OCR processing"""
    try:
        # Convert PDF to images
        images = convert_from_bytes(pdf_data, dpi=200)
        
        # Convert PIL images to OpenCV format
        cv_images = []
        for img in images:
            # Convert PIL to numpy array
            img_array = np.array(img)
            # Convert RGB to BGR for OpenCV
            if len(img_array.shape) == 3:
                img_array = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
            cv_images.append(img_array)
        
        return cv_images
    except Exception as e:
        logger.error(f"Error converting PDF to images: {e}")
        raise

def process_image_with_paddleocr(image: np.ndarray) -> Dict[str, Any]:
    """Process a single image with PaddleOCR"""
    try:
        # Run OCR on the image
        result = ocr_engine.ocr(image, cls=True)
        
        if not result or not result[0]:
            return {
                'text': '',
                'boxes': [],
                'confidence': 0.0
            }
        
        # Extract text and metadata
        text_lines = []
        boxes = []
        confidences = []
        
        for line in result[0]:
            if line:
                # Extract text and confidence
                text = line[1][0]
                confidence = line[1][1]
                
                text_lines.append(text)
                confidences.append(confidence)
                
                # Extract bounding box
                box = line[0]
                boxes.append(box)
        
        # Combine all text
        full_text = '\n'.join(text_lines)
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
        
        return {
            'text': full_text,
            'boxes': boxes,
            'confidence': avg_confidence,
            'line_count': len(text_lines)
        }
        
    except Exception as e:
        logger.error(f"Error processing image with PaddleOCR: {e}")
        raise

def process_ocr_request(data: Dict[str, Any]) -> Dict[str, Any]:
    """Process OCR request and return results"""
    try:
        # Extract base64 data
        base64_data = data.get('base64_data', '')
        content_type = data.get('content_type', 'application/pdf')
        
        if not base64_data:
            raise ValueError("No base64 data provided")
        
        # Decode base64 data
        file_data = base64.b64decode(base64_data)
        
        # Process based on content type
        if content_type == 'application/pdf':
            # Convert PDF to images
            images = process_pdf_to_images(file_data)
            
            # Process each image
            all_text = []
            all_boxes = []
            all_confidences = []
            total_lines = 0
            
            for i, image in enumerate(images):
                logger.info(f"Processing page {i + 1} of {len(images)}")
                result = process_image_with_paddleocr(image)
                
                if result['text']:
                    all_text.append(f"--- Page {i + 1} ---\n{result['text']}")
                    all_boxes.extend(result['boxes'])
                    all_confidences.extend([result['confidence']] * result['line_count'])
                    total_lines += result['line_count']
            
            # Combine results
            combined_text = '\n\n'.join(all_text)
            avg_confidence = sum(all_confidences) / len(all_confidences) if all_confidences else 0.0
            
            return {
                'success': True,
                'text': combined_text,
                'metadata': {
                    'provider': 'paddleocr',
                    'confidence': round(avg_confidence * 100, 2),
                    'pages': len(images),
                    'language': 'en',
                    'processing_method': 'paddleocr_real',
                    'total_boxes': len(all_boxes),
                    'total_lines': total_lines,
                    'dpi': 200
                }
            }
            
        else:
            # Process as image
            # Convert base64 to image
            image_data = base64.b64decode(base64_data)
            nparr = np.frombuffer(image_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                raise ValueError("Could not decode image data")
            
            # Process with PaddleOCR
            result = process_image_with_paddleocr(image)
            
            return {
                'success': True,
                'text': result['text'],
                'metadata': {
                    'provider': 'paddleocr',
                    'confidence': round(result['confidence'] * 100, 2),
                    'pages': 1,
                    'language': 'en',
                    'processing_method': 'paddleocr_real',
                    'total_boxes': len(result['boxes']),
                    'total_lines': result['line_count'],
                    'dpi': 200
                }
            }
            
    except Exception as e:
        logger.error(f"Error processing OCR request: {e}")
        logger.error(traceback.format_exc())
        return {
            'success': False,
            'error': str(e),
            'text': '',
            'metadata': {
                'provider': 'paddleocr',
                'confidence': 0,
                'pages': 0,
                'language': 'en',
                'processing_method': 'error'
            }
        }

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'paddleocr',
        'version': '1.0.0'
    })

@app.route('/ocr', methods=['POST'])
def ocr_endpoint():
    """Main OCR endpoint"""
    try:
        # Get request data
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No JSON data provided'
            }), 400
        
        # Process OCR request
        result = process_ocr_request(data)
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 500
            
    except Exception as e:
        logger.error(f"Error in OCR endpoint: {e}")
        logger.error(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    debug = os.environ.get('DEBUG', 'false').lower() == 'true'
    
    logger.info(f"Starting PaddleOCR service on port {port}")
    app.run(host='0.0.0.0', port=port, debug=debug)
