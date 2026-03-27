#!/usr/bin/env python3
"""
PaddleOCR Service for Document Intelligence Suite
Provides high-accuracy OCR processing using PaddleOCR
"""

import base64
import json
import sys
import io
import logging
from typing import Dict, List, Any, Optional
from pathlib import Path

# PaddleOCR imports
try:
    from paddleocr import PaddleOCR
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

class PaddleOCRService:
    """PaddleOCR service for text extraction from documents"""
    
    def __init__(self):
        """Initialize PaddleOCR with optimized settings"""
        try:
            # Initialize PaddleOCR with English and auto-detection
            # Using GPU if available, otherwise CPU
            self.ocr = PaddleOCR(
                use_angle_cls=True,  # Enable text angle classification
                lang='en',           # English language
                show_log=False,      # Disable verbose logging
                use_gpu=False,       # Use CPU for compatibility
                rec_batch_num=6,     # Batch size for recognition
                det_db_thresh=0.3,   # Detection threshold
                det_db_box_thresh=0.6,  # Box threshold
                det_db_unclip_ratio=1.5,  # Unclip ratio
                max_text_length=25,  # Maximum text length
                rec_char_dict_path=None,  # Use default dictionary
                use_space_char=True  # Enable space character recognition
            )
            logger.info("PaddleOCR initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize PaddleOCR: {e}")
            raise
    
    def process_pdf(self, pdf_data: bytes) -> Dict[str, Any]:
        """
        Process PDF document and extract text using PaddleOCR
        
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
            total_boxes = 0
            page_results = []
            
            # Process each page
            for page_num, image in enumerate(images, 1):
                logger.info(f"Processing page {page_num}")
                
                page_result = self.process_image(image)
                page_text = page_result.get('text', '')
                
                if page_text.strip():
                    all_text.append(f"--- Page {page_num} ---\n{page_text}")
                    total_confidence += page_result.get('confidence', 0)
                    total_boxes += len(page_result.get('boxes', []))
                
                page_results.append({
                    'page': page_num,
                    'text': page_text,
                    'confidence': page_result.get('confidence', 0),
                    'boxes_count': len(page_result.get('boxes', []))
                })
            
            # Calculate average confidence
            avg_confidence = total_confidence / len(images) if images else 0
            
            result = {
                'text': '\n\n'.join(all_text),
                'metadata': {
                    'provider': 'paddleocr',
                    'confidence': round(avg_confidence, 2),
                    'pages': len(images),
                    'total_boxes': total_boxes,
                    'language': 'en',
                    'processing_method': 'paddleocr_real',
                    'dpi': 300,
                    'pages_processed': page_results
                }
            }
            
            logger.info(f"OCR completed: {len(result['text'])} characters, {avg_confidence:.2f}% confidence")
            return result
            
        except Exception as e:
            logger.error(f"PDF processing failed: {e}")
            raise
    
    def process_image(self, image: Image.Image) -> Dict[str, Any]:
        """
        Process single image and extract text using PaddleOCR
        
        Args:
            image: PIL Image object
            
        Returns:
            Dictionary containing extracted text and metadata
        """
        try:
            # Convert PIL image to numpy array
            img_array = np.array(image)
            
            # Run OCR
            ocr_results = self.ocr.ocr(img_array, cls=True)
            
            if not ocr_results or not ocr_results[0]:
                return {
                    'text': '',
                    'confidence': 0,
                    'boxes': []
                }
            
            # Extract text and confidence scores
            text_lines = []
            boxes = []
            confidences = []
            
            for line in ocr_results[0]:
                if line and len(line) >= 2:
                    box = line[0]  # Bounding box coordinates
                    text_info = line[1]  # (text, confidence)
                    
                    if len(text_info) >= 2:
                        text = text_info[0]
                        confidence = text_info[1]
                        
                        if text.strip() and confidence > 0.5:  # Filter low confidence text
                            text_lines.append(text.strip())
                            boxes.append(box)
                            confidences.append(confidence)
            
            # Combine all text
            combined_text = '\n'.join(text_lines)
            
            # Calculate average confidence
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0
            
            return {
                'text': combined_text,
                'confidence': round(avg_confidence * 100, 2),  # Convert to percentage
                'boxes': boxes,
                'text_lines': len(text_lines)
            }
            
        except Exception as e:
            logger.error(f"Image processing failed: {e}")
            return {
                'text': '',
                'confidence': 0,
                'boxes': []
            }
    
    def process_base64_image(self, base64_data: str) -> Dict[str, Any]:
        """
        Process base64 encoded image data
        
        Args:
            base64_data: Base64 encoded image data
            
        Returns:
            Dictionary containing extracted text and metadata
        """
        try:
            # Decode base64 data
            image_data = base64.b64decode(base64_data)
            
            # Create PIL image
            image = Image.open(io.BytesIO(image_data))
            
            # Process the image
            return self.process_image(image)
            
        except Exception as e:
            logger.error(f"Base64 image processing failed: {e}")
            raise

def main():
    """Main function for command-line usage"""
    if len(sys.argv) < 2:
        print("Usage: python ocr_service.py <base64_pdf_data>")
        sys.exit(1)
    
    try:
        # Get base64 data from command line
        base64_data = sys.argv[1]
        
        # Decode base64 data
        pdf_data = base64.b64decode(base64_data)
        
        # Initialize OCR service
        ocr_service = PaddleOCRService()
        
        # Process PDF
        result = ocr_service.process_pdf(pdf_data)
        
        # Output result as JSON
        print(json.dumps(result, indent=2))
        
    except Exception as e:
        logger.error(f"OCR processing failed: {e}")
        error_result = {
            'text': '',
            'metadata': {
                'provider': 'paddleocr',
                'confidence': 0,
                'pages': 0,
                'error': str(e),
                'processing_method': 'paddleocr_real'
            }
        }
        print(json.dumps(error_result, indent=2))
        sys.exit(1)

if __name__ == "__main__":
    main()
