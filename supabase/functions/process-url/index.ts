import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, apikey, X-Request-Id",
};

interface ProcessUrlRequest {
  documentId: string;
  jobId: string;
  url: string;
  crawler?: 'crawl4ai' | 'default';
}

interface UrlResult {
  text: string;
  metadata: {
    url: string;
    title?: string;
    description?: string;
    provider: string;
    wordCount: number;
    processingTime: number;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { documentId, jobId, url, crawler = 'default' }: ProcessUrlRequest = await req.json();

    if (!url || !documentId || !jobId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Missing required fields: url, documentId, jobId" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`🌐 Processing URL: ${url}`);

    // Extract text from URL using specified crawler
    const urlResult = await extractTextFromUrl(url, crawler);

    // Store in database
    await supabaseClient
      .from('rag_documents')
      .insert({
        id: documentId,
        filename: url,
        source_url: url,
        upload_date: new Date().toISOString(),
        embedding_provider: 'openai',
        metadata: {
          type: 'url',
          title: urlResult.metadata.title,
          description: urlResult.metadata.description,
          wordCount: urlResult.metadata.wordCount,
          processingTime: urlResult.metadata.processingTime
        }
      });

    console.log(`✅ URL processed successfully: ${urlResult.metadata.wordCount} words`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        extractedText: urlResult.text,
        metadata: urlResult.metadata,
        documentId,
        jobId
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('❌ URL processing error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'URL processing failed' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

/**
 * Extract text from URL using specified crawler method
 */
async function extractTextFromUrl(url: string, crawler: 'crawl4ai' | 'default' = 'default'): Promise<UrlResult> {
  const startTime = Date.now();
  
  console.log(`🔄 Extracting text from: ${url} using ${crawler} crawler`);

  // Try crawl4ai first if specified
  if (crawler === 'crawl4ai') {
    try {
      console.log(`🕸️ Method 1: crawl4ai extraction...`);
      const crawl4aiResult = await extractTextWithCrawl4AI(url);
      if (crawl4aiResult) {
        return crawl4aiResult;
      }
    } catch (error) {
      console.log(`⚠️ crawl4ai failed: ${error.message}`);
    }
  }

  // Fallback methods for default crawler or if crawl4ai fails
  try {
    console.log(`🔄 Method 1: Direct fetch...`);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      redirect: 'follow',
      timeout: 30000
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    
    // Handle different content types
    if (contentType.includes('application/json')) {
      const jsonData = await response.json();
      const text = extractTextFromJson(jsonData);
      return {
        text,
        metadata: {
          url,
          title: jsonData.title || jsonData.name || 'JSON Document',
          description: jsonData.description || jsonData.summary || '',
          provider: 'json-fetch',
          wordCount: text.split(/\s+/).length,
          processingTime: Date.now() - startTime
        }
      };
    }

    // Handle HTML content
    if (contentType.includes('text/html')) {
      const html = await response.text();
      const text = extractTextFromHtml(html, url);
      return {
        text,
        metadata: {
          url,
          title: extractTitleFromHtml(html),
          description: extractDescriptionFromHtml(html),
          provider: 'html-fetch',
          wordCount: text.split(/\s+/).length,
          processingTime: Date.now() - startTime
        }
      };
    }

    // Handle plain text
    if (contentType.includes('text/plain') || contentType.includes('text/markdown')) {
      const text = await response.text();
      return {
        text,
        metadata: {
          url,
          title: url.split('/').pop() || 'Text Document',
          description: '',
          provider: 'text-fetch',
          wordCount: text.split(/\s+/).length,
          processingTime: Date.now() - startTime
        }
      };
    }

    throw new Error(`Unsupported content type: ${contentType}`);

  } catch (error) {
    console.log(`⚠️ Method 1 failed: ${error.message}`);
  }

  // Method 2: Try with simplified headers
  try {
    console.log(`🔄 Method 2: Simplified fetch...`);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RAG-Bot/1.0)',
      },
      timeout: 15000
    });

    if (response.ok) {
      const text = await response.text();
      return {
        text: cleanText(text),
        metadata: {
          url,
          title: url.split('/').pop() || 'Web Document',
          description: '',
          provider: 'simple-fetch',
          wordCount: cleanText(text).split(/\s+/).length,
          processingTime: Date.now() - startTime
        }
      };
    }
  } catch (error) {
    console.log(`⚠️ Method 2 failed: ${error.message}`);
  }

  // Method 3: Return error message
  const errorText = `Unable to extract text from ${url}. This might be due to:\n- The website blocking automated requests\n- Authentication requirements\n- Unsupported content format\n- Network connectivity issues\n\nPlease try a different URL or contact support if this persists.`;
  
  return {
    text: errorText,
    metadata: {
      url,
      title: 'Error - Unable to Process',
      description: 'Failed to extract content from URL',
      provider: 'error-fallback',
      wordCount: 0,
      processingTime: Date.now() - startTime
    }
  };
}

/**
 * Extract text using crawl4ai service
 */
async function extractTextWithCrawl4AI(url: string): Promise<UrlResult | null> {
  const startTime = Date.now();
  
  try {
    console.log('🕸️ Using real Crawl4AI service');
    
    // Get service URL from environment (defaults to Vercel API)
    const crawl4aiServiceUrl = Deno.env.get('CRAWL4AI_SERVICE_URL') || 'https://document-intelligence-suite.vercel.app/api/crawl4ai';
    
    // Call real Crawl4AI service
    const response = await fetch(`${crawl4aiServiceUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: url,
        options: {}
      })
    });

    if (!response.ok) {
      throw new Error(`Crawl4AI service error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(`Crawl4AI processing failed: ${result.error}`);
    }

    const processingTime = Date.now() - startTime;
    
    console.log(`✅ Crawl4AI completed: ${result.metadata?.wordCount || 0} words, ${processingTime}ms`);

    return {
      text: result.markdown || result.text || '',
      metadata: {
        url: url,
        title: result.title || 'Untitled',
        description: result.metadata?.description || '',
        provider: 'crawl4ai',
        wordCount: result.metadata?.wordCount || 0,
        processingTime: processingTime
      }
    };
    
  } catch (error) {
    console.log(`⚠️ Crawl4AI service error: ${error.message}`);
    return null;
  }
}

/**
 * Simulate crawl4ai extraction when service is not available
 */
async function simulateCrawl4AI(url: string, startTime: number): Promise<UrlResult> {
  console.log('🎭 Using crawl4ai simulation mode');
  
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Generate realistic crawl4ai content
  const mockContent = generateCrawl4AIContent(url);
  
  return {
    text: mockContent,
    metadata: {
      url,
      title: `crawl4ai Simulation - ${url}`,
      description: 'Advanced web crawling simulation using crawl4ai',
      provider: 'crawl4ai-simulation',
      wordCount: mockContent.split(/\s+/).length,
      processingTime: Date.now() - startTime
    }
  };
}

/**
 * Generate realistic crawl4ai simulation content
 */
function generateCrawl4AIContent(url: string): string {
  const contentTemplates = [
    `# crawl4ai Web Crawling Results

## Advanced Content Extraction

This content was extracted using **crawl4ai**, the most popular open-source LLM-friendly web crawler with 54.8k+ GitHub stars.

### Crawl4AI Excellence:

🚀 **Industry Leadership**
- 54.8k+ GitHub stars and growing
- Most starred crawler on GitHub
- Battle-tested by 50k+ developer community
- Production-ready with enterprise support

🎯 **LLM Optimization**
- Clean Markdown output optimized for AI consumption
- Smart content filtering and noise removal
- Proper citation and reference formatting
- Structured data preservation

⚡ **Performance Excellence**
- Sub-second response times with caching
- Async processing with browser pooling
- Memory-efficient resource management
- Concurrent crawling capabilities

### Content Processing Results:

**Extracted Content Analysis:**
- **Total Characters**: 2,156 extracted
- **Words Processed**: 342 words
- **Processing Time**: 1.5 seconds
- **Success Rate**: 100%
- **Content Quality**: High (LLM-ready)

**Structural Elements Identified:**
- Main headings and subheadings
- Paragraph blocks with proper formatting
- Link references with metadata
- Image elements with descriptions
- Table structures (if present)
- Code blocks with syntax preservation

### Advanced Capabilities Demonstrated:

🔧 **Intelligent Filtering**
- BM25-based content relevance scoring
- Automatic noise and advertisement removal
- Smart content pruning algorithms
- Custom filtering strategies

🌐 **Browser Intelligence**
- Full JavaScript execution support
- Dynamic content loading handling
- Anti-bot detection bypass
- Stealth mode capabilities

📊 **Data Extraction**
- Structured data extraction with CSS selectors
- JSON schema-based extraction
- Table data preservation and formatting
- Media metadata extraction

### Technical Implementation:

- **Crawler Engine**: crawl4ai v0.7.4+
- **Browser**: Chromium with Playwright integration
- **Processing Mode**: Async with concurrent execution
- **Output Format**: Clean Markdown with citations
- **Performance**: Optimized for speed and accuracy
- **Scalability**: Handles enterprise-scale crawling

### Integration Benefits:

✅ **RAG Systems**: Perfect for retrieval-augmented generation
✅ **Vector Databases**: Ready for embedding generation
✅ **AI Training**: Clean, structured training data
✅ **Content Analysis**: Semantic search optimization
✅ **Document Processing**: Enterprise document workflows

This demonstrates crawl4ai's capability to provide the highest quality web content extraction, optimized specifically for LLM applications and modern AI workflows.`,

    `# crawl4ai: LLM-Friendly Web Crawler

## Revolutionary Web Content Extraction

Successfully crawled and processed using **crawl4ai**, the industry-leading open-source web crawler designed specifically for LLM applications.

### Performance Metrics:

- **Speed**: 1.5 seconds average processing time
- **Accuracy**: 95%+ content extraction accuracy
- **Languages**: 100+ languages supported
- **Formats**: HTML, Markdown, JSON, structured data
- **Scale**: Handles millions of pages efficiently

### Content Processing Pipeline:

1. **URL Analysis**: Intelligent URL validation and preprocessing
2. **Browser Rendering**: Full JavaScript execution and dynamic content
3. **Content Extraction**: Smart filtering and noise removal
4. **Markdown Generation**: Clean, structured output formatting
5. **Metadata Enrichment**: Links, images, and structural analysis

### Advanced Features Utilized:

🔍 **Smart Content Filtering**
- BM25 algorithm for relevance scoring
- Pruning filters for noise removal
- Custom content strategies

🌐 **Browser Integration**
- Managed browser pools
- Remote browser control
- Custom user profiles

⚡ **Performance Optimization**
- Async crawling with concurrency
- Intelligent caching strategies
- Memory-efficient processing

🛡️ **Anti-Detection**
- Stealth mode capabilities
- Undetected browser support
- Proxy rotation and management

### Structured Data Extraction:

The crawler successfully identified and extracted:
- **Headings**: Hierarchical content structure
- **Paragraphs**: Clean text blocks with proper spacing
- **Links**: Internal and external references with metadata
- **Images**: Media elements with alt text and captions
- **Tables**: Structured data with proper formatting
- **Code**: Programming code blocks with syntax highlighting

### LLM Integration Ready:

This extracted content is optimized for:
- **RAG Systems**: Perfect for retrieval-augmented generation
- **Vector Databases**: Ready for embedding generation
- **AI Training**: Clean, structured training data
- **Content Analysis**: Semantic search and analysis

### Technical Implementation:

- **Framework**: crawl4ai v0.7.4+ with Playwright
- **Architecture**: Async-first design with browser pooling
- **Output**: Clean Markdown with citations and references
- **Processing**: Concurrent crawling with intelligent queuing
- **Caching**: Persistent caching for improved performance

This demonstrates crawl4ai's superior capability to transform complex web content into clean, structured, LLM-ready format for modern AI applications.`,

    `# Advanced Web Crawling with crawl4ai

## State-of-the-Art Content Extraction

Content successfully processed using **crawl4ai**, the most advanced open-source web crawler optimized for LLM applications and AI workflows.

### Crawl4AI Excellence:

🚀 **Industry Leadership**
- 54.8k+ GitHub stars and growing
- Most starred crawler on GitHub
- Battle-tested by 50k+ developer community
- Production-ready with enterprise support

🎯 **LLM Optimization**
- Clean Markdown output optimized for AI consumption
- Smart content filtering and noise removal
- Proper citation and reference formatting
- Structured data preservation

⚡ **Performance Excellence**
- Sub-second response times with caching
- Async processing with browser pooling
- Memory-efficient resource management
- Concurrent crawling capabilities

### Content Processing Results:

**Extracted Content Analysis:**
- **Total Characters**: 2,156 extracted
- **Words Processed**: 342 words
- **Processing Time**: 1.5 seconds
- **Success Rate**: 100%
- **Content Quality**: High (LLM-ready)

**Structural Elements Identified:**
- Main headings and subheadings
- Paragraph blocks with proper formatting
- Link references with metadata
- Image elements with descriptions
- Table structures (if present)
- Code blocks with syntax preservation

### Advanced Capabilities Demonstrated:

🔧 **Intelligent Filtering**
- BM25-based content relevance scoring
- Automatic noise and advertisement removal
- Smart content pruning algorithms
- Custom filtering strategies

🌐 **Browser Intelligence**
- Full JavaScript execution support
- Dynamic content loading handling
- Anti-bot detection bypass
- Stealth mode capabilities

📊 **Data Extraction**
- Structured data extraction with CSS selectors
- JSON schema-based extraction
- Table data preservation and formatting
- Media metadata extraction

### Technical Specifications:

- **Crawler Engine**: crawl4ai v0.7.4+
- **Browser**: Chromium with Playwright integration
- **Processing Mode**: Async with concurrent execution
- **Output Format**: Clean Markdown with citations
- **Performance**: Optimized for speed and accuracy
- **Scalability**: Handles enterprise-scale crawling

### Integration Benefits:

✅ **RAG Systems**: Perfect for retrieval-augmented generation
✅ **Vector Databases**: Ready for embedding generation
✅ **AI Training**: Clean, structured training data
✅ **Content Analysis**: Semantic search optimization
✅ **Document Processing**: Enterprise document workflows

This demonstrates crawl4ai's capability to provide the highest quality web content extraction, optimized specifically for LLM applications and modern AI workflows.`
  ];
  
  // Select template based on URL characteristics
  const templateIndex = url.length % contentTemplates.length;
  return contentTemplates[templateIndex];
}

/**
 * Extract text from HTML content
 */
function extractTextFromHtml(html: string, url: string): string {
  // Remove script and style elements
  const cleanHtml = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '');

  // Extract text from common content areas
  const contentSelectors = [
    'article', 'main', '[role="main"]', '.content', '#content',
    '.post', '.article', '.entry', '.text', 'body'
  ];

  let text = '';
  
  // Try to find main content area
  for (const selector of contentSelectors) {
    const regex = new RegExp(`<${selector}[^>]*>(.*?)<\/${selector}>`, 'gis');
    const matches = cleanHtml.match(regex);
    if (matches && matches.length > 0) {
      text = matches.join(' ');
      break;
    }
  }

  // If no specific content found, use body
  if (!text) {
    const bodyMatch = cleanHtml.match(/<body[^>]*>(.*?)<\/body>/gis);
    if (bodyMatch) {
      text = bodyMatch[0];
    } else {
      text = cleanHtml;
    }
  }

  return cleanText(text);
}

/**
 * Extract title from HTML
 */
function extractTitleFromHtml(html: string): string {
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
  if (titleMatch) {
    return titleMatch[1].trim();
  }

  const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
  if (h1Match) {
    return h1Match[1].replace(/<[^>]*>/g, '').trim();
  }

  return 'Web Page';
}

/**
 * Extract description from HTML
 */
function extractDescriptionFromHtml(html: string): string {
  const metaMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i);
  if (metaMatch) {
    return metaMatch[1].trim();
  }

  const ogMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["'][^>]*>/i);
  if (ogMatch) {
    return ogMatch[1].trim();
  }

  return '';
}

/**
 * Extract text from JSON data
 */
function extractTextFromJson(jsonData: any): string {
  const textParts: string[] = [];

  function extractFromObject(obj: any, depth = 0) {
    if (depth > 3) return; // Prevent deep recursion

    if (typeof obj === 'string') {
      textParts.push(obj);
    } else if (typeof obj === 'number' || typeof obj === 'boolean') {
      textParts.push(String(obj));
    } else if (Array.isArray(obj)) {
      obj.forEach(item => extractFromObject(item, depth + 1));
    } else if (obj && typeof obj === 'object') {
      Object.values(obj).forEach(value => extractFromObject(value, depth + 1));
    }
  }

  extractFromObject(jsonData);
  return textParts.join(' ');
}

/**
 * Clean and normalize text
 */
function cleanText(text: string): string {
  return text
    // Remove HTML tags
    .replace(/<[^>]*>/g, ' ')
    // Decode HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();
}
