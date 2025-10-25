#!/usr/bin/env python3
"""
PaddleOCR Runner Script
Simple wrapper for running PaddleOCR from Edge Functions
"""

import sys
import json
import base64
from ocr_service import PaddleOCRService

def main():
    """Main function for running PaddleOCR"""
    try:
        # Read input from stdin
        input_data = sys.stdin.read().strip()
        
        if not input_data:
            raise ValueError("No input data provided")
        
        # Parse JSON input
        try:
            data = json.loads(input_data)
        except json.JSONDecodeError:
            # If not JSON, treat as base64 data directly
            base64_data = input_data
        else:
            base64_data = data.get('data', data.get('base64', ''))
        
        if not base64_data:
            raise ValueError("No base64 data found in input")
        
        # Initialize OCR service
        ocr_service = PaddleOCRService()
        
        # Decode and process PDF
        pdf_data = base64.b64decode(base64_data)
        result = ocr_service.process_pdf(pdf_data)
        
        # Output result as JSON
        print(json.dumps(result))
        
    except Exception as e:
        # Return error result
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
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == "__main__":
    main()
