/**
 * Security headers for all Edge Functions
 * Implements best practices for security headers
 */

export interface SecurityHeaders {
  'Content-Security-Policy': string;
  'X-Frame-Options': string;
  'X-Content-Type-Options': string;
  'Strict-Transport-Security': string;
  'Referrer-Policy': string;
  'Permissions-Policy': string;
  'X-XSS-Protection': string;
}

/**
 * Get comprehensive security headers for API responses
 * @param includeCSP - Whether to include Content-Security-Policy (default: true)
 */
export function getSecurityHeaders(includeCSP: boolean = true): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-XSS-Protection': '1; mode=block',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), interest-cohort=()',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
  };

  // Add CSP if requested
  if (includeCSP) {
    headers['Content-Security-Policy'] = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://*.supabase.co https://*.openai.com https://*.anthropic.com https://*.mistral.ai https://api.openai.com https://api.anthropic.com https://api.mistral.ai https://api.pageindex.ai",
      "frame-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join('; ');
  }

  // HSTS should be set by Vercel/CDN for the main domain
  // Uncomment if managing directly:
  // headers['Strict-Transport-Security'] = 'max-age=63072000; includeSubDomains; preload';

  return headers;
}

/**
 * Merge security headers with CORS headers
 */
export function mergeSecurityHeaders(
  corsHeaders: Record<string, string>,
  securityHeaders: Record<string, string>
): Record<string, string> {
  return {
    ...corsHeaders,
    ...securityHeaders,
  };
}

