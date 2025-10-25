import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

interface CrawlRequest {
  url: string;
  mode?: 'basic' | 'llm-enhanced' | 'screenshots';
}

serve(async (req) => {
  try {
    const { url, mode = 'basic' }: CrawlRequest = await req.json()

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get crawl4ai service URL from environment variables
    const crawlServiceUrl = Deno.env.get('CRAWL4AI_SERVICE_URL') || 'http://localhost:8000'

    // Try multiple crawling methods with fallbacks
    let data = null
    let error = null
    
    // Method 1: Try crawl4ai service
    try {
      const response = await fetch(`${crawlServiceUrl}/crawl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, mode }),
      })
      
      if (response.ok) {
        data = await response.json()
      } else {
        throw new Error(`Crawl4AI failed: ${response.status}`)
      }
    } catch (crawl4aiError) {
      console.log('Crawl4AI failed, trying fallbacks...')
      
      // Method 2: Try Readability API (free)
      try {
        const readabilityResponse = await fetch(
          `https://readability-api.com/v1/parse?url=${encodeURIComponent(url)}`
        )
        if (readabilityResponse.ok) {
          const readabilityData = await readabilityResponse.json()
          data = {
            content: readabilityData.text || readabilityData.content || '',
            title: readabilityData.title || new URL(url).hostname,
            links: [],
            images: [],
          }
        }
      } catch (readabilityError) {
        // Try Method 3: Simple fetch and HTML parsing
        try {
          const htmlResponse = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; DocumentIntelligence/1.0)',
            },
          })
          
          if (htmlResponse.ok) {
            const html = await htmlResponse.text()
            // Extract title
            const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
            const title = titleMatch ? titleMatch[1] : new URL(url).hostname
            
            // Extract text content (remove scripts, styles, etc.)
            const textContent = html
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .substring(0, 5000) // Limit to 5000 chars
            
            // Extract links
            const linkMatches = html.match(/href=["']([^"']+)["']/gi) || []
            const links = linkMatches
              .map(m => m.replace(/href=["']|["']/g, ''))
              .filter(l => l.startsWith('http'))
              .slice(0, 10)
            
            data = {
              content: textContent || '[Could not extract content]',
              title,
              links,
              images: [],
            }
          }
        } catch (fetchError) {
          error = fetchError
        }
      }
    }

    if (data) {
      // Return standardized response
      return new Response(
        JSON.stringify({
          url,
          content: data.content || data.text || data.markdown || 'No content extracted',
          title: data.title || new URL(url).hostname,
          links: data.links || [],
          images: data.images || [],
          metadata: {
            crawledAt: new Date().toISOString(),
            mode,
            provider: 'multi-fallback',
            ...data.metadata,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    // If all methods failed, return error
    throw error || new Error('All crawling methods failed')
    } catch (crawlError) {
      console.error('Crawl error:', crawlError)
      
      // Return simulation/fallback response
      return new Response(
        JSON.stringify({
          url,
          content: `[Crawl4AI Service Simulation]

This is a simulated response from the Crawl4AI service.

**URL:** ${url}
**Mode:** ${mode}

In a full implementation with the Crawl4AI Docker service running:
- The service would fetch the page content
- Parse HTML and extract text
- Use AI models if enhanced mode is selected
- Return structured content with links and metadata

**Configuration:**
- Set CRAWL4AI_SERVICE_URL environment variable
- Deploy the crawl4ai-service Docker container
- Ensure network connectivity between Edge Function and service

**Error:** ${crawlError.message}`,
          title: new URL(url).hostname,
          links: [],
          images: [],
          metadata: {
            crawledAt: new Date().toISOString(),
            mode,
            simulation: true,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
