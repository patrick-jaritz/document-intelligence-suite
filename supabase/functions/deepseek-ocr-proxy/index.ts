import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { EdgeLogger, generateRequestId } from "../_shared/logger.ts";
import { withRateLimit, rateLimiters } from "../_shared/rate-limiter.ts";
import { getCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { getSecurityHeaders, mergeSecurityHeaders } from "../_shared/security-headers.ts";
import { validateFile } from "../_shared/file-validation.ts";

// SECURITY: CORS headers are now generated dynamically with origin validation

// DeepSeek OCR Service URL (configure in Supabase environment)
// SECURITY: No hardcoded fallback - must be set via environment variable
const DEEPSEEK_OCR_URL = Deno.env.get("DEEPSEEK_OCR_SERVICE_URL");

Deno.serve(async (req: Request) => {
  // SECURITY: Handle CORS preflight requests
  const preflightResponse = handleCorsPreflight(req);
  if (preflightResponse) {
    return preflightResponse;
  }

  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);
  const securityHeaders = getSecurityHeaders();
  const headers = mergeSecurityHeaders(corsHeaders, securityHeaders);

  const inboundReqId = req.headers.get('X-Request-Id') || undefined;
  const requestId = inboundReqId || generateRequestId();

  // SECURITY: Validate DEEPSEEK_OCR_URL is set
  if (!DEEPSEEK_OCR_URL) {
    return new Response(
      JSON.stringify({ error: 'DEEPSEEK_OCR_SERVICE_URL environment variable is not set' }),
      { 
        status: 500, 
        headers: { ...headers, 'Content-Type': 'application/json' } 
      }
    );
  }

  // SECURITY: Validate URL format
  try {
    new URL(DEEPSEEK_OCR_URL);
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid DEEPSEEK_OCR_SERVICE_URL format' }),
      { 
        status: 500, 
        headers: { ...headers, 'Content-Type': 'application/json' } 
      }
    );
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    const logger = new EdgeLogger(supabaseClient, requestId);

    const rateLimitResponse = await withRateLimit(
      rateLimiters.ocr,
      'OCR processing rate limit exceeded. Please try again in a minute.'
    )(req);

    if (rateLimitResponse) {
      // Update rate limit response with security headers
      const rateLimitHeaders = new Headers(rateLimitResponse.headers);
      Object.entries(securityHeaders).forEach(([key, value]) => {
        rateLimitHeaders.set(key, value);
      });
      return new Response(rateLimitResponse.body, {
        status: rateLimitResponse.status,
        headers: rateLimitHeaders
      });
    }

    logger.info('deepseek-ocr-proxy', 'Starting DeepSeek OCR request', { url: DEEPSEEK_OCR_URL });

    // SECURITY: Limit request size for file uploads
    const MAX_REQUEST_SIZE = 50 * 1024 * 1024; // 50MB for file uploads
    const contentLength = req.headers.get('Content-Length');
    if (contentLength && parseInt(contentLength) > MAX_REQUEST_SIZE) {
      return new Response(
        JSON.stringify({ error: 'Request too large (max 50MB)' }),
        { 
          status: 413, 
          headers: { ...headers, 'Content-Type': 'application/json' } 
        }
      );
    }

    // For POST requests, proxy to DeepSeek OCR service
    if (req.method === "POST") {
      const formData = await req.formData();
      const file = formData.get('image') as File | null;
      
      // SECURITY: Validate uploaded file
      if (file) {
        const fileArrayBuffer = await file.arrayBuffer();
        const validation = validateFile(
          fileArrayBuffer,
          file.name,
          file.type,
          50 * 1024 * 1024 // 50MB max
        );

        if (!validation.valid) {
          logger.error('security', 'File validation failed', new Error(validation.error || 'Unknown validation error'), {
            filename: file.name,
            detectedType: validation.detectedType
          });
          return new Response(
            JSON.stringify({ error: `File validation failed: ${validation.error || 'Unknown error'}` }),
            { 
              status: 400, 
              headers: { ...headers, 'Content-Type': 'application/json' } 
            }
          );
        }

        logger.info('security', 'File validated successfully', {
          filename: file.name,
          detectedType: validation.detectedType,
          size: file.size
        });
      }
      
      // SECURITY: Validate and proxy to internal service only
      // Call DeepSeek OCR service
      const ocrResponse = await fetch(`${DEEPSEEK_OCR_URL}/api/ocr`, {
        method: 'POST',
        body: formData
      });

      if (!ocrResponse.ok) {
        const errorText = await ocrResponse.text();
        logger.error('deepseek-ocr-proxy', 'DeepSeek OCR service failed', new Error(errorText), {
          status: ocrResponse.status,
          url: DEEPSEEK_OCR_URL
        });
        throw new Error(`DeepSeek OCR service error: ${ocrResponse.statusText}`);
      }

      const result = await ocrResponse.json();
      
      logger.info('deepseek-ocr-proxy', 'DeepSeek OCR completed', {
        textLength: result.text?.length || 0,
        boxesCount: result.boxes?.length || 0
      });

      return new Response(JSON.stringify(result), {
        status: 200,
          headers: { ...headers, 'Content-Type': 'application/json', 'X-Request-Id': requestId }
      });
    }

    // For GET requests, return service info
    return new Response(JSON.stringify({
      service: 'deepseek-ocr-proxy',
      url: DEEPSEEK_OCR_URL,
      status: 'ready'
    }), {
          headers: { ...headers, 'Content-Type': 'application/json', 'X-Request-Id': requestId }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[CRITICAL] DeepSeek OCR proxy error:', errorMessage, error);
    
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
      service: 'deepseek-ocr-proxy',
      url: DEEPSEEK_OCR_URL
    }), {
      status: 500,
          headers: { ...headers, 'Content-Type': 'application/json', 'X-Request-Id': requestId }
    });
  }
});
