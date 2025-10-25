export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Client-Info, Apikey, apikey, X-Request-Id');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    res.status(200).json({
      status: 'healthy',
      service: 'crawl4ai',
      version: '1.0.0',
      platform: 'vercel'
    });
    return;
  }

  if (req.method === 'POST') {
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
      const response = await fetch(url, { 
        headers, 
        signal: AbortSignal.timeout(30000)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      
      // Simple HTML parsing
      const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : 'Untitled Page';
      
      const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
      const description = descMatch ? descMatch[1].trim() : '';
      
      // Remove script and style tags
      const cleanHtml = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Extract links
      const linkMatches = html.match(/<a[^>]*href=["']([^"']*)["'][^>]*>([^<]*)<\/a>/gi) || [];
      const links = linkMatches.slice(0, 10).map(link => {
        const hrefMatch = link.match(/href=["']([^"']*)["']/i);
        const textMatch = link.match(/>([^<]*)</i);
        return {
          url: hrefMatch ? hrefMatch[1] : '',
          text: textMatch ? textMatch[1].trim() : ''
        };
      }).filter(link => link.url.startsWith('http'));
      
      // Extract images
      const imgMatches = html.match(/<img[^>]*src=["']([^"']*)["'][^>]*>/gi) || [];
      const images = imgMatches.slice(0, 5).map(img => {
        const srcMatch = img.match(/src=["']([^"']*)["']/i);
        const altMatch = img.match(/alt=["']([^"']*)["']/i);
        return {
          src: srcMatch ? srcMatch[1] : '',
          alt: altMatch ? altMatch[1] : ''
        };
      }).filter(img => img.src);
      
      // Calculate word count
      const wordCount = cleanHtml.split(/\s+/).filter(word => word.length > 0).length;
      
      // Create markdown-like output
      let markdownContent = `# ${title}\n\n`;
      
      if (description) {
        markdownContent += `${description}\n\n`;
      }
      
      markdownContent += `## Content\n\n${cleanHtml}\n\n`;
      
      if (links.length > 0) {
        markdownContent += `## Links Found\n`;
        links.forEach((link, i) => {
          markdownContent += `${i + 1}. [${link.text}](${link.url})\n`;
        });
      }
      
      if (images.length > 0) {
        markdownContent += `\n## Images Found\n`;
        images.forEach((img, i) => {
          markdownContent += `${i + 1}. ![${img.alt}](${img.src})\n`;
        });
      }

      console.log(`Crawling completed: ${wordCount} words, ${links.length} links, ${images.length} images`);

      res.status(200).json({
        success: true,
        markdown: markdownContent,
        text: cleanHtml,
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
    return;
  }

  res.status(404).json({ error: 'Not found' });
}
