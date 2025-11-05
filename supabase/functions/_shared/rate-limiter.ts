/**
 * Enhanced rate limiter for Edge Functions with user tracking and security logging
 * In production, consider using Redis or database-backed rate limiting
 */

import { logSecurityEvent, getClientIP, getUserAgent } from './security-events.ts';
import { getOptionalAuth } from './jwt-verification.ts';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  maxRequestsPerUser?: number; // Maximum requests per authenticated user
  keyGenerator?: (req: Request) => string; // Custom key generator
  functionName?: string; // Function name for security logging
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store (resets on function restart)
const rateLimitStore = new Map<string, RateLimitEntry>();

export class RateLimiter {
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  /**
   * Check if request is within rate limit
   * @param req Request object
   * @returns { allowed: boolean, remaining: number, resetTime: number }
   */
  async check(req: Request): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = this.getKey(req);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Clean up expired entries
    this.cleanup(windowStart);

    // Get user ID if authenticated
    const userAuth = await getOptionalAuth(req);
    const userKey = userAuth ? `user:${userAuth.userId}` : null;

    // Check user-specific rate limit if configured
    if (userKey && this.config.maxRequestsPerUser) {
      const userEntry = rateLimitStore.get(userKey);
      if (userEntry && userEntry.count >= this.config.maxRequestsPerUser && userEntry.resetTime >= now) {
        // User rate limit exceeded - log security event
        if (this.config.functionName) {
          logSecurityEvent({
            event_type: 'rate_limit_exceeded',
            severity: 'medium',
            function_name: this.config.functionName,
            request_id: req.headers.get('X-Request-Id') || undefined,
            user_id: userAuth.userId,
            ip_address: getClientIP(req),
            user_agent: getUserAgent(req),
            details: {
              rate_limit_type: 'user',
              limit: this.config.maxRequestsPerUser,
              window: this.config.windowMs,
            },
          });
        }

        return {
          allowed: false,
          remaining: 0,
          resetTime: userEntry.resetTime
        };
      }

      // Update user rate limit
      if (!userEntry || userEntry.resetTime < now) {
        rateLimitStore.set(userKey, {
          count: 1,
          resetTime: now + this.config.windowMs
        });
      } else {
        userEntry.count++;
        rateLimitStore.set(userKey, userEntry);
      }
    }

    const entry = rateLimitStore.get(key);
    const resetTime = now + this.config.windowMs;

    if (!entry || entry.resetTime < now) {
      // New window or expired entry
      rateLimitStore.set(key, {
        count: 1,
        resetTime: resetTime
      });

      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime: resetTime
      };
    }

    if (entry.count >= this.config.maxRequests) {
      // Rate limit exceeded - log security event
      if (this.config.functionName) {
        logSecurityEvent({
          event_type: 'rate_limit_exceeded',
          severity: 'medium',
          function_name: this.config.functionName,
          request_id: req.headers.get('X-Request-Id') || undefined,
          user_id: userAuth?.userId,
          ip_address: getClientIP(req),
          user_agent: getUserAgent(req),
          details: {
            rate_limit_type: 'ip',
            limit: this.config.maxRequests,
            window: this.config.windowMs,
          },
        });
      }

      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime
      };
    }

    // Increment counter
    entry.count++;
    rateLimitStore.set(key, entry);

    return {
      allowed: true,
      remaining: this.config.maxRequests - entry.count,
      resetTime: entry.resetTime
    };
  }

  private getKey(req: Request): string {
    if (this.config.keyGenerator) {
      return this.config.keyGenerator(req);
    }

    // Default: IP address + User-Agent
    const ip = req.headers.get('x-forwarded-for') || 
               req.headers.get('x-real-ip') || 
               'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';
    
    return `${ip}:${userAgent}`;
  }

  private cleanup(before: number): void {
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetTime < before) {
        rateLimitStore.delete(key);
      }
    }
  }

  /**
   * Get rate limit headers for response
   */
  getHeaders(remaining: number, resetTime: number): Record<string, string> {
    return {
      'X-RateLimit-Limit': this.config.maxRequests.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString(),
      'X-RateLimit-Window': this.config.windowMs.toString()
    };
  }
}

// Pre-configured rate limiters for different endpoints
export const rateLimiters = {
  // OCR processing: 10 requests per minute per IP, 20 per user
  ocr: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    maxRequestsPerUser: 20,
    functionName: 'ocr-processing'
  }),

  // URL processing: 20 requests per minute per IP, 50 per user
  url: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20,
    maxRequestsPerUser: 50,
    functionName: 'url-processing'
  }),

  // GitHub analysis: 5 requests per minute per IP, 10 per user
  github: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5,
    maxRequestsPerUser: 10,
    functionName: 'github-analysis'
  }),

  // General API: 100 requests per minute per IP, 200 per user
  general: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    maxRequestsPerUser: 200,
    functionName: 'general-api'
  }),

  // Health checks: 200 requests per minute per IP
  health: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 200,
    functionName: 'health-check'
  })
};

/**
 * Rate limiting middleware for Edge Functions
 */
export function withRateLimit(
  limiter: RateLimiter,
  errorMessage: string = 'Rate limit exceeded. Please try again later.'
) {
  return async (req: Request): Promise<Response | null> => {
    const result = await limiter.check(req);
    
    if (!result.allowed) {
      const headers = limiter.getHeaders(result.remaining, result.resetTime);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: errorMessage,
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...headers
          }
        }
      );
    }

    return null; // No rate limit violation
  };
}
