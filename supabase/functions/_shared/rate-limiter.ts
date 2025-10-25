/**
 * Simple in-memory rate limiter for Edge Functions
 * In production, consider using Redis or database-backed rate limiting
 */

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (req: Request) => string; // Custom key generator
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
  check(req: Request): { allowed: boolean; remaining: number; resetTime: number } {
    const key = this.getKey(req);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Clean up expired entries
    this.cleanup(windowStart);

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
      // Rate limit exceeded
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
  // OCR processing: 10 requests per minute per IP
  ocr: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10
  }),

  // URL processing: 20 requests per minute per IP
  url: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20
  }),

  // GitHub analysis: 5 requests per minute per IP
  github: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5
  }),

  // General API: 100 requests per minute per IP
  general: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100
  }),

  // Health checks: 200 requests per minute per IP
  health: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 200
  })
};

/**
 * Rate limiting middleware for Edge Functions
 */
export function withRateLimit(
  limiter: RateLimiter,
  errorMessage: string = 'Rate limit exceeded. Please try again later.'
) {
  return (req: Request): Response | null => {
    const result = limiter.check(req);
    
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
