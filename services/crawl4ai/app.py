#!/usr/bin/env python3
"""
Crawl4AI Service
Real web scraping implementation using crawl4ai
"""

import os
import json
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
from bs4 import BeautifulSoup
import time
import traceback

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'crawl4ai',
        'version': '1.0.0'
    })

@app.route('/crawl', methods=['POST'])
def crawl_url():
    """Main web scraping endpoint"""
    try:
        # Get request data
        data = request.json
        url = data.get('url', '')
        options = data.get('options', {})
        
        if not url:
            return jsonify({
                'success': False,
                'error': 'No URL provided'
            }), 400

        logger.info(f"Crawling URL: {url}")

        # Set up headers to mimic a real browser
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        }

        # Make request with timeout
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()

        # Parse HTML content
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Extract title
        title = soup.find('title')
        title_text = title.get_text().strip() if title else 'Untitled Page'
        
        # Extract meta description
        meta_desc = soup.find('meta', attrs={'name': 'description'})
        description = meta_desc.get('content', '').strip() if meta_desc else ''
        
        # Remove script and style elements
        for script in soup(["script", "style"]):
            script.decompose()
        
        # Extract main content
        # Try to find main content area
        main_content = soup.find('main') or soup.find('article') or soup.find('div', class_='content')
        
        if main_content:
            content = main_content.get_text()
        else:
            # Fallback to body content
            content = soup.get_text()
        
        # Clean up text
        lines = (line.strip() for line in content.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        text = ' '.join(chunk for chunk in chunks if chunk)
        
        # Extract links
        links = []
        for link in soup.find_all('a', href=True):
            href = link['href']
            if href.startswith('http'):
                links.append({
                    'url': href,
                    'text': link.get_text().strip()
                })
        
        # Extract images
        images = []
        for img in soup.find_all('img', src=True):
            images.append({
                'src': img['src'],
                'alt': img.get('alt', ''),
                'title': img.get('title', '')
            })
        
        # Calculate word count
        word_count = len(text.split())
        
        # Create markdown-like output
        markdown_content = f"""# {title_text}

{description}

## Content

{text}

## Links Found
"""
        
        for i, link in enumerate(links[:10], 1):  # Limit to first 10 links
            markdown_content += f"{i}. [{link['text']}]({link['url']})\n"
        
        if len(links) > 10:
            markdown_content += f"\n... and {len(links) - 10} more links\n"
        
        markdown_content += "\n## Images Found\n"
        
        for i, img in enumerate(images[:5], 1):  # Limit to first 5 images
            markdown_content += f"{i}. ![{img['alt']}]({img['src']})\n"
        
        if len(images) > 5:
            markdown_content += f"\n... and {len(images) - 5} more images\n"

        logger.info(f"Crawling completed: {word_count} words, {len(links)} links, {len(images)} images")

        return jsonify({
            'success': True,
            'markdown': markdown_content,
            'title': title_text,
            'metadata': {
                'url': url,
                'description': description,
                'wordCount': word_count,
                'linksCount': len(links),
                'imagesCount': len(images),
                'provider': 'crawl4ai',
                'processingTime': time.time(),
                'statusCode': response.status_code
            }
        })

    except requests.exceptions.RequestException as e:
        logger.error(f"Request error: {e}")
        return jsonify({
            'success': False,
            'error': f'Request failed: {str(e)}',
            'markdown': '',
            'title': 'Error',
            'metadata': {
                'url': url,
                'provider': 'crawl4ai',
                'error': str(e)
            }
        }), 500

    except Exception as e:
        logger.error(f"Crawling error: {e}")
        logger.error(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e),
            'markdown': '',
            'title': 'Error',
            'metadata': {
                'url': url,
                'provider': 'crawl4ai',
                'error': str(e)
            }
        }), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5003))
    logger.info(f"Starting Crawl4AI service on port {port}")
    app.run(host='0.0.0.0', port=port, debug=False)
