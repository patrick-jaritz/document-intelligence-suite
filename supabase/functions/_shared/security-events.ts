/**
 * Security event logging and monitoring
 * Tracks security-related events for audit and analysis
 */

import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

export type SecurityEventType = 
  | 'authentication_failure'
  | 'authentication_success'
  | 'authorization_failure'
  | 'rate_limit_exceeded'
  | 'invalid_input'
  | 'file_validation_failed'
  | 'cors_violation'
  | 'suspicious_activity'
  | 'request_size_exceeded'
  | 'ssrf_attempt'
  | 'xss_attempt'
  | 'sql_injection_attempt'
  | 'api_key_exposed'
  | 'unusual_pattern'
  | 'security_scan'
  | 'error_exposed';

export interface SecurityEvent {
  event_type: SecurityEventType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  function_name: string;
  request_id?: string;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  details: Record<string, any>;
  timestamp: string;
}

/**
 * Log a security event
 * @param event - Security event details
 * @param supabase - Supabase client (optional, will create if not provided)
 */
export async function logSecurityEvent(
  event: Omit<SecurityEvent, 'timestamp'>,
  supabase?: ReturnType<typeof createClient>
): Promise<void> {
  try {
    const timestamp = new Date().toISOString();
    const fullEvent: SecurityEvent = {
      ...event,
      timestamp,
    };

    // Log to console in development
    if (Deno.env.get('ENVIRONMENT') !== 'production') {
      console.warn(`[SECURITY EVENT] ${event.severity.toUpperCase()}: ${event.event_type}`, {
        function: event.function_name,
        requestId: event.request_id,
        details: event.details,
      });
    }

    // Optionally store in database if supabase client is provided
    if (supabase) {
      try {
        await supabase.from('security_events').insert({
          event_type: fullEvent.event_type,
          severity: fullEvent.severity,
          function_name: fullEvent.function_name,
          request_id: fullEvent.request_id,
          user_id: fullEvent.user_id,
          ip_address: fullEvent.ip_address,
          user_agent: fullEvent.user_agent,
          details: fullEvent.details,
          timestamp: fullEvent.timestamp,
        });
      } catch (dbError) {
        // Don't fail if database logging fails, but log the error
        console.error('Failed to log security event to database:', dbError);
      }
    }
  } catch (error) {
    // Don't throw - security logging should never break the application
    console.error('Error logging security event:', error);
  }
}

/**
 * Extract IP address from request
 */
export function getClientIP(req: Request): string | undefined {
  // Check various headers for IP address
  const forwarded = req.headers.get('X-Forwarded-For');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = req.headers.get('X-Real-IP');
  if (realIP) {
    return realIP;
  }

  return undefined;
}

/**
 * Extract user agent from request
 */
export function getUserAgent(req: Request): string | undefined {
  return req.headers.get('User-Agent') || undefined;
}

/**
 * Check for suspicious patterns in input
 */
export function detectSuspiciousPattern(input: string): {
  suspicious: boolean;
  patterns: string[];
} {
  const patterns: string[] = [];
  let suspicious = false;

  // SQL injection patterns
  const sqlPatterns = [
    /(\bUNION\b.*\bSELECT\b)/i,
    /(\bSELECT\b.*\bFROM\b)/i,
    /(\bINSERT\b.*\bINTO\b)/i,
    /(\bDELETE\b.*\bFROM\b)/i,
    /(\bUPDATE\b.*\bSET\b)/i,
    /(\bDROP\b.*\bTABLE\b)/i,
    /('.*OR.*'.*=.*')/i,
    /(--|#|\/\*|\*\/)/,
  ];

  // XSS patterns
  const xssPatterns = [
    /<script[^>]*>/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe[^>]*>/i,
    /<object[^>]*>/i,
    /<embed[^>]*>/i,
  ];

  // Command injection patterns
  const commandPatterns = [
    /[;&|`$(){}[\]]/,
    /\b(cat|ls|rm|mv|cp|chmod|chown|sudo|su|id|whoami|pwd|cd|grep|find|awk|sed|perl|python|ruby|php|node)\b/i,
  ];

  // Check SQL injection
  for (const pattern of sqlPatterns) {
    if (pattern.test(input)) {
      patterns.push('sql_injection');
      suspicious = true;
      break;
    }
  }

  // Check XSS
  for (const pattern of xssPatterns) {
    if (pattern.test(input)) {
      patterns.push('xss');
      suspicious = true;
      break;
    }
  }

  // Check command injection
  for (const pattern of commandPatterns) {
    if (pattern.test(input)) {
      patterns.push('command_injection');
      suspicious = true;
      break;
    }
  }

  return { suspicious, patterns };
}

