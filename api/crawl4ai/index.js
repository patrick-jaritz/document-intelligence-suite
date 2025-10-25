const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Client-Info, Apikey, apikey, X-Request-Id');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

app.use(express.json({ limit: '50mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'crawl4ai',
    version: '1.0.0',
    platform: 'vercel'
  });
});

// Web scraping endpoint
app.post('/crawl', async (req, res) => {
  try {
    const { url, options = {} } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'No URL provided'
      });
    }

    console.log(`Crawling URL: ${url}`);

    // Set up headers to mimic a real browser
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    };

    // Make request with timeout
    const response = await axios.get(url, { 
      headers, 
      timeout: 30000,
      maxRedirects: 5
    });

    // Parse HTML content
    const $ = cheerio.load(response.data);
    
    // Extract title
    const title = $('title').text().trim() || 'Untitled Page';
    
    // Extract meta description
    const description = $('meta[name="description"]').attr('content') || '';
    
    // Remove script and style elements
    $('script, style').remove();
    
    // Extract main content
    let mainContent = $('main').text() || $('article').text() || $('div.content').text() || $('body').text();
    
    // Clean up text
    const lines = mainContent.split('\n').map(line => line.trim()).filter(line => line);
    const text = lines.join(' ');
    
    // Extract links
    const links = [];
    $('a[href]').each((i, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      if (href && href.startsWith('http')) {
        links.push({ url: href, text });
      }
    });
    
    // Extract images
    const images = [];
    $('img[src]').each((i, el) => {
      const src = $(el).attr('src');
      const alt = $(el).attr('alt') || '';
      const title = $(el).attr('title') || '';
      if (src) {
        images.push({ src, alt, title });
      }
    });
    
    // Calculate word count
    const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
    
    // Create markdown-like output
    let markdownContent = `# ${title}\n\n`;
    
    if (description) {
      markdownContent += `${description}\n\n`;
    }
    
    markdownContent += `## Content\n\n${text}\n\n`;
    
    if (links.length > 0) {
      markdownContent += `## Links Found\n`;
      links.slice(0, 10).forEach((link, i) => {
        markdownContent += `${i + 1}. [${link.text}](${link.url})\n`;
      });
      if (links.length > 10) {
        markdownContent += `\n... and ${links.length - 10} more links\n`;
      }
    }
    
    if (images.length > 0) {
      markdownContent += `\n## Images Found\n`;
      images.slice(0, 5).forEach((img, i) => {
        markdownContent += `${i + 1}. ![${img.alt}](${img.src})\n`;
      });
      if (images.length > 5) {
        markdownContent += `\n... and ${images.length - 5} more images\n`;
      }
    }

    console.log(`Crawling completed: ${wordCount} words, ${links.length} links, ${images.length} images`);

    res.json({
      success: true,
      markdown: markdownContent,
      text: text,
      title: title,
      metadata: {
        url: url,
        description: description,
        wordCount: wordCount,
        linksCount: links.length,
        imagesCount: images.length,
        provider: 'crawl4ai',
        processingTime: Date.now(),
        statusCode: response.status
      }
    });

  } catch (error) {
    console.error('Crawling error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      markdown: '',
      text: '',
      title: 'Error',
      metadata: {
        url: req.body.url || '',
        provider: 'crawl4ai',
        error: error.message
      }
    });
  }
});

module.exports = app;
