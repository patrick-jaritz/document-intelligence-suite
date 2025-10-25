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

    try {
      // Call crawl4ai service
      const response = await fetch(`${crawlServiceUrl}/crawl`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          mode,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Crawl service error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()

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
            ...data.metadata,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
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
