import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { withRateLimit, rateLimiters } from "../_shared/rate-limiter.ts";
import { getCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { getSecurityHeaders, mergeSecurityHeaders } from "../_shared/security-headers.ts";

/**
 * HeadlessX Proxy Edge Function
 * Proxies requests to a HeadlessX instance for web scraping
 */

interface ProxyRequest {
  method: 'render' | 'html' | 'content' | 'screenshot' | 'pdf' | 'health' | 'profiles';
  url?: string;
  options?: Record<string, any>;
}

Deno.serve(async (req: Request) => {
  // Initialize headers early for error responses
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);
  const securityHeaders = getSecurityHeaders();
  const headers = mergeSecurityHeaders(corsHeaders, securityHeaders);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: headers,
    });
  }

  const startTime = Date.now();

  try {
    // Apply rate limiting
    const rateLimitResponse = await withRateLimit(
      rateLimiters.web,
      'HeadlessX rate limit exceeded. Please try again in a minute.'
    )(req);
    
    if (rateLimitResponse) {
      const rateLimitHeaders = new Headers(rateLimitResponse.headers);
      Object.entries(headers).forEach(([key, value]) => {
        rateLimitHeaders.set(key, value);
      });
      const rateLimitBody = rateLimitResponse.body 
        ? (typeof rateLimitResponse.body === 'string' ? rateLimitResponse.body : JSON.stringify({ error: 'Rate limit exceeded' }))
        : JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again in a minute.' });
      return new Response(rateLimitBody, {
        status: rateLimitResponse.status,
        headers: { ...rateLimitHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get HeadlessX configuration from environment
    const headlessxUrl = Deno.env.get('HEADLESSX_URL');
    const headlessxToken = Deno.env.get('HEADLESSX_TOKEN');

    if (!headlessxUrl) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'HeadlessX service not configured' 
        }),
        { 
          status: 503, 
          headers: { ...headers, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request body
    const requestText = await req.text();
    const requestBody: ProxyRequest = requestText ? JSON.parse(requestText) : {};

    const { method = 'render', url, options = {} } = requestBody;

    // Validate method
    const validMethods = ['render', 'html', 'content', 'screenshot', 'pdf', 'health', 'profiles'];
    if (!validMethods.includes(method)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Invalid method. Must be one of: ${validMethods.join(', ')}` 
        }),
        { 
          status: 400, 
          headers: { ...headers, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Health and profiles don't require URL
    if (method !== 'health' && method !== 'profiles') {
      if (!url || typeof url !== 'string' || url.trim().length === 0) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Missing required field: url' 
          }),
          { 
            status: 400, 
            headers: { ...headers, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Validate URL
      if (url.trim().length > 2048) {
        return new Response(
          JSON.stringify({ error: 'URL too long (max 2048 characters)' }),
          { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } }
        );
      }

      const dangerousProtocols = ['javascript:', 'file:', 'data:', 'vbscript:', 'about:'];
      const lowerUrl = url.toLowerCase();
      for (const protocol of dangerousProtocols) {
        if (lowerUrl.startsWith(protocol)) {
          return new Response(
            JSON.stringify({ error: 'Invalid URL protocol' }),
            { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } }
          );
        }
      }

      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return new Response(
          JSON.stringify({ error: 'URL must start with http:// or https://' }),
          { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Build HeadlessX API URL
    let headlessxApiUrl: string;
    let headlessxMethod = 'POST';
    let headlessxBody: any = null;

    switch (method) {
      case 'health':
        headlessxApiUrl = `${headlessxUrl}/api/health`;
        headlessxMethod = 'GET';
        break;
      
      case 'profiles':
        headlessxApiUrl = `${headlessxUrl}/api/profiles`;
        headlessxMethod = 'GET';
        if (headlessxToken) {
          headlessxApiUrl += `?token=${headlessxToken}`;
        }
        break;
      
      case 'screenshot':
        headlessxApiUrl = `${headlessxUrl}/api/screenshot?url=${encodeURIComponent(url!)}`;
        if (headlessxToken) {
          headlessxApiUrl += `&token=${headlessxToken}`;
        }
        if (options.fullPage !== undefined) {
          headlessxApiUrl += `&fullPage=${options.fullPage}`;
        }
        if (options.profile) {
          headlessxApiUrl += `&profile=${options.profile}`;
        }
        headlessxMethod = 'GET';
        break;
      
      default:
        headlessxApiUrl = `${headlessxUrl}/api/${method}`;
        if (headlessxToken) {
          headlessxApiUrl += `?token=${headlessxToken}`;
        }
        headlessxBody = JSON.stringify({ url, ...options });
        break;
    }

    console.log(`🌐 Proxying ${method} request to HeadlessX: ${url || 'N/A'}`);

    // Make request to HeadlessX
    const headlessxRequestInit: RequestInit = {
      method: headlessxMethod,
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(60000), // 60 second timeout
    };

    if (headlessxBody) {
      headlessxRequestInit.body = headlessxBody;
    }

    const headlessxResponse = await fetch(headlessxApiUrl, headlessxRequestInit);

    // Handle binary responses (screenshots, PDFs)
    if (method === 'screenshot' || method === 'pdf') {
      if (!headlessxResponse.ok) {
        const errorText = await headlessxResponse.text();
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `HeadlessX ${method} failed: ${headlessxResponse.status} - ${errorText}` 
          }),
          { 
            status: headlessxResponse.status, 
            headers: { ...headers, 'Content-Type': 'application/json' } 
          }
        );
      }

      const blob = await headlessxResponse.blob();
      const responseHeaders = new Headers(headers);
      responseHeaders.set('Content-Type', headlessxResponse.headers.get('Content-Type') || 'application/octet-stream');
      
      return new Response(blob, {
        status: 200,
        headers: responseHeaders
      });
    }

    // Handle JSON responses
    if (!headlessxResponse.ok) {
      const errorText = await headlessxResponse.text();
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `HeadlessX request failed: ${headlessxResponse.status} - ${errorText}` 
        }),
        { 
          status: headlessxResponse.status, 
          headers: { ...headers, 'Content-Type': 'application/json' } 
        }
      );
    }

    const result = await headlessxResponse.json();
    const responseTime = Date.now() - startTime;

    console.log(`✅ HeadlessX request completed in ${responseTime}ms`);

    // Log metrics
    console.log('API_METRICS:', {
      endpoint: '/api/headlessx-proxy',
      method: method,
      responseTime,
      success: true,
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({
        success: true,
        ...result,
        metadata: {
          ...result.metadata,
          responseTime,
          provider: 'headlessx'
        }
      }),
      { 
        headers: { ...headers, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    const errorMessage = error.message || 'HeadlessX proxy failed';
    const responseTime = Date.now() - startTime;
    
    console.error('❌ HeadlessX proxy error:', error);
    
    // Log error metrics
    console.log('API_METRICS:', {
      endpoint: '/api/headlessx-proxy',
      method: 'POST',
      responseTime,
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString()
    });
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' }
      }
    );
  }
});
