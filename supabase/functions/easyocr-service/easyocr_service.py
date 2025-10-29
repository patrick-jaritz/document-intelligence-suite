#!/usr/bin/env python3
"""
EasyOCR Service for Document Intelligence Suite
Provides OCR processing using EasyOCR library
"""

import base64
import json
import sys
import io
import logging
from typing import Dict, List, Any, Optional
from pathlib import Path

# EasyOCR imports
try:
    import easyocr
    from pdf2image import convert_from_bytes
    from PIL import Image
    import numpy as np
    import cv2
except ImportError as e:
    print(f"Import error: {e}")
    print("Please install required packages: pip install -r requirements.txt")
    sys.exit(1)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EasyOCRService:
    """EasyOCR service for text extraction from documents"""
    
    def __init__(self):
        """Initialize EasyOCR with optimized settings"""
        try:
            # Initialize EasyOCR reader with English and auto-detection
            # Using GPU if available, otherwise CPU
            self.reader = easyocr.Reader(
                ['en'],  # English language
                gpu=False,  # Use CPU for compatibility (set to True if GPU available)
                verbose=False  # Disable verbose logging
            )
            logger.info("EasyOCR initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize EasyOCR: {e}")
            raise
    
    def process_pdf(self, pdf_data: bytes) -> Dict[str, Any]:
        """
        Process PDF document and extract text using EasyOCR
        
        Args:
            pdf_data: PDF file as bytes
            
        Returns:
            Dictionary containing extracted text and metadata
        """
        try:
            logger.info(f"Processing PDF with {len(pdf_data)} bytes")
            
            # Convert PDF to images
            images = convert_from_bytes(
                pdf_data,
                dpi=300,  # High DPI for better OCR accuracy
                first_page=1,
                last_page=None,  # Process all pages
                fmt='RGB'
            )
            
            logger.info(f"PDF converted to {len(images)} images")
            
            all_text = []
            total_confidence = 0
            total_detections = 0
            page_results = []
            
            # Process each page
            for page_num, image in enumerate(images, 1):
                logger.info(f"Processing page {page_num}")
                
                page_result = self.process_image(image)
                page_text = page_result.get('text', '')
                
                if page_text.strip():
                    all_text.append(f"--- Page {page_num} ---\n{page_text}")
                    total_confidence += page_result.get('confidence', 0)
                    total_detections += len(page_result.get('detections', []))
                
                page_results.append({
                    'page': page_num,
                    'text': page_text,
                    'confidence': page_result.get('confidence', 0),
                    'detections_count': len(page_result.get('detections', []))
                })
            
            # Calculate average confidence
            avg_confidence = total_confidence / len(images) if images else 0
            
            result = {
                'text': '\n\n'.join(all_text),
                'metadata': {
                    'provider': 'easyocr',
                    'confidence': avg_confidence,
                    'pages': len(images),
                    'language': 'en',
                    'total_detections': total_detections,
                    'processing_time': sum(r.get('processing_time', 0) for r in page_results),
                    'page_results': page_results,
                    'model': 'EasyOCR',
                    'architecture': 'CNN + RNN'
                }
            }
            
            logger.info(f"PDF processing completed: {len(all_text)} pages, {len(result['text'])} characters")
            return result
            
        except Exception as e:
            logger.error(f"Error processing PDF: {e}")
            raise
    
    def process_image(self, image: Image.Image) -> Dict[str, Any]:
        """
        Process a single image and extract text using EasyOCR
        
        Args:
            image: PIL Image object
            
        Returns:
            Dictionary containing extracted text and metadata
        """
        try:
            import time
            start_time = time.time()
            
            # Convert PIL image to numpy array
            img_array = np.array(image)
            
            # Perform OCR
            results = self.reader.readtext(img_array)
            
            processing_time = (time.time() - start_time) * 1000  # Convert to milliseconds
            
            # Extract text and calculate confidence
            detections = []
            text_parts = []
            confidence_sum = 0
            
            for (bbox, text, conf) in results:
                detections.append({
                    'bbox': bbox,
                    'text': text,
                    'confidence': conf
                })
                text_parts.append(text)
                confidence_sum += conf
            
            # Calculate average confidence
            avg_confidence = (confidence_sum / len(results)) * 100 if results else 0
            
            result = {
                'text': ' '.join(text_parts),
                'confidence': avg_confidence,
                'detections': detections,
                'detection_count': len(results),
                'processing_time': processing_time
            }
            
            logger.info(f"Image processing completed: {len(results)} detections, {result['confidence']:.2f}% confidence")
            return result
            
        except Exception as e:
            logger.error(f"Error processing image: {e}")
            return {
                'text': '',
                'confidence': 0,
                'detections': [],
                'detection_count': 0,
                'processing_time': 0
            }

def main():
    """Main entry point for EasyOCR service"""
    try:
        service = EasyOCRService()
        
        # Read input from stdin
        input_data = json.loads(sys.stdin.read())
        file_data_url = input_data.get('fileDataUrl', '')
        file_type = input_data.get('fileType', 'application/pdf')
        
        if not file_data_url:
            print(json.dumps({
                'success': False,
                'error': 'No file data provided'
            }))
            sys.exit(1)
        
        # Extract base64 data
        if ',' in file_data_url:
            base64_data = file_data_url.split(',')[1]
        else:
            base64_data = file_data_url
        
        # Decode base64
        file_bytes = base64.b64decode(base64_data)
        
        # Process based on file type
        if 'pdf' in file_type.lower():
            result = service.process_pdf(file_bytes)
        else:
            # Assume image file
            image = Image.open(io.BytesIO(file_bytes)).convert('RGB')
            result = service.process_image(image)
            result = {
                'text': result['text'],
                'metadata': {
                    'provider': 'easyocr',
                    'confidence': result['confidence'],
                    'pages': 1,
                    'language': 'en',
                    'total_detections': result['detection_count'],
                    'processing_time': result['processing_time'],
                    'detections': result['detections'],
                    'model': 'EasyOCR',
                    'architecture': 'CNN + RNN'
                }
            }
        
        # Output result
        print(json.dumps({
            'success': True,
            'text': result['text'],
            'metadata': result['metadata']
        }))
        
    except Exception as e:
        logger.error(f"Service error: {e}")
        print(json.dumps({
            'success': False,
            'error': str(e)
        }))
        sys.exit(1)

if __name__ == '__main__':
    main()

