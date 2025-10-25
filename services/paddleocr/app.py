#!/usr/bin/env python3
"""
PaddleOCR Service
Real PaddleOCR implementation for document text extraction
"""

import os
import base64
import json
import logging
from io import BytesIO
from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
from paddleocr import PaddleOCR
from pdf2image import convert_from_bytes
from PIL import Image
import traceback

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Initialize PaddleOCR
logger.info("Initializing PaddleOCR...")
try:
    # Initialize with English and Chinese support
    ocr = PaddleOCR(use_angle_cls=True, lang='en', show_log=False)
    logger.info("✅ PaddleOCR initialized successfully")
except Exception as e:
    logger.error(f"❌ Failed to initialize PaddleOCR: {e}")
    ocr = None

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'paddleocr',
        'version': '1.0.0',
        'ocr_loaded': ocr is not None
    })

@app.route('/ocr', methods=['POST'])
def process_ocr():
    """Main OCR processing endpoint"""
    try:
        if not ocr:
            return jsonify({
                'success': False,
                'error': 'PaddleOCR not initialized'
            }), 500

        # Get request data
        data = request.json
        base64_data = data.get('base64_data', '')
        content_type = data.get('content_type', 'application/pdf')
        
        if not base64_data:
            return jsonify({
                'success': False,
                'error': 'No base64 data provided'
            }), 400

        logger.info(f"Processing {content_type} file, size: {len(base64_data)} chars")

        # Decode base64 data
        if ',' in base64_data:
            base64_data = base64_data.split(',')[1]
        
        file_bytes = base64.b64decode(base64_data)
        
        # Convert to images
        images = []
        if 'pdf' in content_type.lower():
            logger.info("Converting PDF to images...")
            images = convert_from_bytes(file_bytes, dpi=200)
        else:
            # Assume image file
            image = Image.open(BytesIO(file_bytes)).convert('RGB')
            images = [image]

        logger.info(f"Processing {len(images)} page(s)")

        # Process each image with PaddleOCR
        all_text = []
        all_boxes = []
        total_confidence = 0
        total_boxes = 0

        for i, image in enumerate(images):
            logger.info(f"Processing page {i + 1}/{len(images)}")
            
            try:
                # Convert PIL image to numpy array
                img_array = np.array(image)
                
                # Perform OCR
                result = ocr.ocr(img_array, cls=True)
                
                if result and result[0]:
                    page_text = []
                    page_boxes = []
                    
                    for line in result[0]:
                        if line:
                            # Extract text and confidence
                            text = line[1][0]
                            confidence = line[1][1]
                            
                            page_text.append(text)
                            page_boxes.append({
                                'text': text,
                                'confidence': confidence,
                                'bbox': line[0]
                            })
                            
                            total_confidence += confidence
                            total_boxes += 1
                    
                    all_text.extend(page_text)
                    all_boxes.extend(page_boxes)
                    
                    logger.info(f"✅ Page {i + 1} processed: {len(page_text)} text blocks")
                else:
                    logger.warning(f"⚠️ No text found on page {i + 1}")
                    
            except Exception as e:
                logger.error(f"❌ Error processing page {i + 1}: {e}")
                continue

        # Combine all text
        full_text = '\n'.join(all_text)
        avg_confidence = total_confidence / total_boxes if total_boxes > 0 else 0

        logger.info(f"OCR completed: {len(all_text)} text blocks, avg confidence: {avg_confidence:.2f}")

        return jsonify({
            'success': True,
            'text': full_text,
            'metadata': {
                'provider': 'paddleocr',
                'confidence': round(avg_confidence, 3),
                'pages': len(images),
                'language': 'en',
                'total_boxes': total_boxes,
                'processing_method': 'paddleocr_real',
                'dpi': 200
            }
        })

    except Exception as e:
        logger.error(f"OCR processing error: {e}")
        logger.error(traceback.format_exc())
        return jsonify({
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
        }), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    logger.info(f"Starting PaddleOCR service on port {port}")
    app.run(host='0.0.0.0', port=port, debug=False)