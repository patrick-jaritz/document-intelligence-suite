import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { EdgeLogger, generateRequestId } from "../_shared/logger.ts";
import { withRateLimit, rateLimiters } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, apikey, X-Request-Id",
};

// DeepSeek OCR Service URL (configure in Supabase environment)
const DEEPSEEK_OCR_URL = Deno.env.get("DEEPSEEK_OCR_SERVICE_URL") || "http://localhost:5003";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const inboundReqId = req.headers.get('X-Request-Id') || undefined;
  const requestId = inboundReqId || generateRequestId();

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    const logger = new EdgeLogger(supabaseClient, requestId);

    const rateLimitResponse = withRateLimit(
      rateLimiters.ocr,
      'OCR processing rate limit exceeded. Please try again in a minute.'
    )(req);

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    logger.info('deepseek-ocr-proxy', 'Starting DeepSeek OCR request', { url: DEEPSEEK_OCR_URL });

    // For POST requests, proxy to DeepSeek OCR service
    if (req.method === "POST") {
      const formData = await req.formData();
      
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId }
      });
    }

    // For GET requests, return service info
    return new Response(JSON.stringify({
      service: 'deepseek-ocr-proxy',
      url: DEEPSEEK_OCR_URL,
      status: 'ready'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId }
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
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId }
    });
  }
});
