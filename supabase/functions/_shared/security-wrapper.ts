/**
 * Security wrapper for Edge Functions
 * Provides comprehensive security validation and logging
 */

import { getCorsHeaders, handleCorsPreflight } from './cors.ts';
import { getSecurityHeaders, mergeSecurityHeaders } from './security-headers.ts';
import { validateRequestId, validateRequestHeaders, detectSuspiciousPattern } from './request-validation.ts';
import { logSecurityEvent, getClientIP, getUserAgent } from './security-events.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

export interface SecurityContext {
  requestId: string;
  headers: Record<string, string>;
  supabase?: ReturnType<typeof createClient>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Initialize security context for an Edge Function
 * @param req - Request object
 * @param functionName - Name of the Edge Function
 * @returns Security context with validated headers and request ID
 */
export async function initSecurityContext(
  req: Request,
  functionName: string
): Promise<SecurityContext> {
  // Handle CORS preflight
  const preflightResponse = handleCorsPreflight(req);
  if (preflightResponse) {
    throw new Error('CORS_PREFLIGHT'); // Special error to handle preflight
  }

  // Get CORS and security headers
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);
  const securityHeaders = getSecurityHeaders();
  const headers = mergeSecurityHeaders(corsHeaders, securityHeaders);

  // Validate and generate request ID
  const requestId = validateRequestId(req, functionName);

  // Validate request headers
  const headerValidation = validateRequestHeaders(req, functionName);
  if (!headerValidation.valid && headerValidation.issues.length > 0) {
    // Log but don't block - just monitor
    logSecurityEvent({
      event_type: 'suspicious_activity',
      severity: 'low',
      function_name: functionName,
      request_id: requestId,
      ip_address: getClientIP(req),
      user_agent: getUserAgent(req),
      details: {
        issues: headerValidation.issues,
      },
    });
  }

  // Create Supabase client for security logging
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const supabase = supabaseUrl && supabaseKey 
    ? createClient(supabaseUrl, supabaseKey)
    : undefined;

  return {
    requestId,
    headers,
    supabase,
    ipAddress: getClientIP(req),
    userAgent: getUserAgent(req),
  };
}

/**
 * Validate input for suspicious patterns
 * @param input - Input string to validate
 * @param functionName - Name of the Edge Function
 * @param context - Security context
 * @returns true if input is safe
 */
export function validateInput(
  input: string,
  functionName: string,
  context: SecurityContext
): { valid: boolean; error?: string } {
  const suspicious = detectSuspiciousPattern(input);
  
  if (suspicious.suspicious) {
    logSecurityEvent({
      event_type: 'suspicious_activity',
      severity: suspicious.patterns.includes('sql_injection') || suspicious.patterns.includes('command_injection') 
        ? 'high' 
        : 'medium',
      function_name: functionName,
      request_id: context.requestId,
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
      details: {
        patterns: suspicious.patterns,
        input_preview: input.substring(0, 200),
      },
    }, context.supabase);

    return {
      valid: false,
      error: `Suspicious patterns detected in input: ${suspicious.patterns.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Handle security error response
 * @param error - Error object
 * @param context - Security context
 * @param functionName - Name of the Edge Function
 * @returns Error response
 */
export function handleSecurityError(
  error: Error | unknown,
  context: SecurityContext,
  functionName: string
): Response {
  const isProduction = Deno.env.get('ENVIRONMENT') === 'production';
  const errorMessage = error instanceof Error ? error.message : String(error);

  // Log security error
  if (errorMessage !== 'CORS_PREFLIGHT') {
    logSecurityEvent({
      event_type: 'error_exposed',
      severity: 'low',
      function_name: functionName,
      request_id: context.requestId,
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
      details: {
        error: errorMessage,
        ...(isProduction ? {} : { stack: error instanceof Error ? error.stack : undefined }),
      },
    }, context.supabase);
  }

  // Handle CORS preflight
  if (errorMessage === 'CORS_PREFLIGHT') {
    const preflightHeaders = getCorsHeaders(null);
    return new Response(null, {
      status: 204,
      headers: preflightHeaders,
    });
  }

  return new Response(
    JSON.stringify({
      error: isProduction ? 'Internal server error' : errorMessage,
      ...(isProduction ? {} : { 
        details: error instanceof Error ? error.stack : String(error)
      })
    }),
    {
      status: 500,
      headers: {
        ...context.headers,
        'Content-Type': 'application/json',
      },
    }
  );
}

