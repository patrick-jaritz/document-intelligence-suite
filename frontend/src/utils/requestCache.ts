/**
 * Request caching utility
 * Prevents duplicate requests and caches responses
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class RequestCache {
  private cache = new Map<string, CacheEntry<any>>();
  private pendingRequests = new Map<string, Promise<any>>();

  /**
   * Get cached data or execute fetcher
   */
  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = 60000 // 1 minute default
  ): Promise<T> {
    // Check cache first
    const cached = this.cache.get(key);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }

    // Check if request is already pending (deduplication)
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!;
    }

    // Execute fetcher
    const promise = fetcher()
      .then((data) => {
        // Cache the result
        this.cache.set(key, {
          data,
          timestamp: Date.now(),
          expiresAt: Date.now() + ttl,
        });
        
        // Remove from pending
        this.pendingRequests.delete(key);
        
        return data;
      })
      .catch((error) => {
        // Remove from pending on error
        this.pendingRequests.delete(key);
        throw error;
      });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  /**
   * Invalidate cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.pendingRequests.clear();
  }

  /**
   * Remove expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now >= entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }
}

// Singleton instance
export const requestCache = new RequestCache();

// Auto-cleanup every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    requestCache.cleanup();
  }, 5 * 60 * 1000);
}

