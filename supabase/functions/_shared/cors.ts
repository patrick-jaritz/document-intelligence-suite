/**
 * CORS configuration with origin whitelist
 * SECURITY: Restricts CORS to specific origins instead of wildcard
 */

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://document-intelligence-suite.vercel.app',
  'https://document-intelligence-suite-standalone.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
];

/**
 * Get CORS headers with origin validation
 */
export function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  const origin = requestOrigin || '';
  const isAllowed = ALLOWED_ORIGINS.includes(origin);
  
  // Use the provided origin if allowed, otherwise use the first allowed origin
  const allowedOrigin = isAllowed ? origin : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin',
  };
}

/**
 * Legacy CORS headers (for backward compatibility)
 * SECURITY WARNING: This uses wildcard origin - use getCorsHeaders() instead
 * @deprecated Use getCorsHeaders() with origin validation
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

/**
 * Handle CORS preflight requests
 */
export function handleCorsPreflight(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    const origin = req.headers.get('Origin');
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(origin),
    });
  }
  return null;
}
