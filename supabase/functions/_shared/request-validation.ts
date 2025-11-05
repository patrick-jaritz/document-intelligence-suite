/**
 * Request validation utilities
 * Validates request IDs, headers, and other request metadata
 */

import { generateRequestId } from './logger.ts';
import { logSecurityEvent, getClientIP, getUserAgent, detectSuspiciousPattern } from './security-events.ts';

/**
 * Validate and generate request ID
 * @param req - Request object
 * @param functionName - Name of the Edge Function
 * @returns Valid request ID
 */
export function validateRequestId(
  req: Request,
  functionName: string
): string {
  const providedId = req.headers.get('X-Request-Id');
  
  // Validate request ID format (UUID or alphanumeric with dashes/underscores)
  if (providedId) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const customIdRegex = /^[a-zA-Z0-9_-]+$/;
    
    // Check for suspicious patterns in request ID
    const suspicious = detectSuspiciousPattern(providedId);
    if (suspicious.suspicious) {
      logSecurityEvent({
        event_type: 'suspicious_activity',
        severity: 'medium',
        function_name: functionName,
        request_id: providedId,
        ip_address: getClientIP(req),
        user_agent: getUserAgent(req),
        details: {
          reason: 'Suspicious patterns in request ID',
          patterns: suspicious.patterns,
        },
      });
    }
    
    // Validate format
    if (uuidRegex.test(providedId) || customIdRegex.test(providedId)) {
      // Validate length (prevent DoS)
      if (providedId.length <= 128) {
        return providedId;
      }
    }
  }
  
  // Generate new request ID if invalid or missing
  return generateRequestId();
}

/**
 * Validate request headers
 * @param req - Request object
 * @param functionName - Name of the Edge Function
 * @returns Validation result
 */
export function validateRequestHeaders(
  req: Request,
  functionName: string
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Check for suspicious headers
  const suspiciousHeaders = [
    'X-Forwarded-Host',
    'X-Originating-IP',
    'X-Remote-IP',
    'X-Remote-Addr',
  ];
  
  for (const header of suspiciousHeaders) {
    if (req.headers.get(header)) {
      issues.push(`Suspicious header detected: ${header}`);
    }
  }
  
  // Check User-Agent for suspicious patterns
  const userAgent = getUserAgent(req);
  if (userAgent) {
    const suspicious = detectSuspiciousPattern(userAgent);
    if (suspicious.suspicious) {
      issues.push(`Suspicious User-Agent patterns: ${suspicious.patterns.join(', ')}`);
    }
  }
  
  // Log if issues found
  if (issues.length > 0) {
    logSecurityEvent({
      event_type: 'suspicious_activity',
      severity: 'low',
      function_name: functionName,
      request_id: req.headers.get('X-Request-Id') || undefined,
      ip_address: getClientIP(req),
      user_agent: getUserAgent(req),
      details: {
        issues,
      },
    });
  }
  
  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Validate request origin
 * @param req - Request object
 * @param allowedOrigins - List of allowed origins
 * @returns Validation result
 */
export function validateOrigin(
  req: Request,
  allowedOrigins: string[]
): { valid: boolean; origin?: string } {
  const origin = req.headers.get('Origin');
  
  if (!origin) {
    // Same-origin requests don't have Origin header
    return { valid: true };
  }
  
  const isValid = allowedOrigins.includes(origin);
  
  if (!isValid) {
    logSecurityEvent({
      event_type: 'cors_violation',
      severity: 'medium',
      function_name: 'unknown', // Will be set by caller
      ip_address: getClientIP(req),
      user_agent: getUserAgent(req),
      details: {
        origin,
        allowedOrigins,
      },
    });
  }
  
  return {
    valid: isValid,
    origin,
  };
}

