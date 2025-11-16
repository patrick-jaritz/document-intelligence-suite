/**
 * Caching Utilities
 * 
 * Provides in-memory, localStorage, and sessionStorage caching
 * with TTL support, automatic expiration, and cache invalidation.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  key: string;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds (default: 5 minutes)
  storage?: 'memory' | 'localStorage' | 'sessionStorage';
  prefix?: string;
}

// In-memory cache
const memoryCache = new Map<string, CacheEntry<any>>();

/**
 * Cache manager class
 */
export class CacheManager {
  private prefix: string;
  private defaultTTL: number;

  constructor(prefix: string = 'app_cache', defaultTTL: number = 5 * 60 * 1000) {
    this.prefix = prefix;
    this.defaultTTL = defaultTTL;
  }

  /**
   * Get full cache key with prefix
   */
  private getKey(key: string): string {
    return `${this.prefix}_${key}`;
  }

  /**
   * Set cache entry
   */
  set<T>(
    key: string,
    data: T,
    options: CacheOptions = {}
  ): void {
    const {
      ttl = this.defaultTTL,
      storage = 'memory',
    } = options;

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      key: this.getKey(key),
    };

    switch (storage) {
      case 'localStorage':
        this.setLocalStorage(entry);
        break;
      case 'sessionStorage':
        this.setSessionStorage(entry);
        break;
      case 'memory':
      default:
        memoryCache.set(this.getKey(key), entry);
        break;
    }
  }

  /**
   * Get cache entry
   */
  get<T>(
    key: string,
    options: Pick<CacheOptions, 'storage'> = {}
  ): T | null {
    const { storage = 'memory' } = options;

    let entry: CacheEntry<T> | null = null;

    switch (storage) {
      case 'localStorage':
        entry = this.getLocalStorage<T>(key);
        break;
      case 'sessionStorage':
        entry = this.getSessionStorage<T>(key);
        break;
      case 'memory':
      default:
        entry = memoryCache.get(this.getKey(key)) || null;
        break;
    }

    if (!entry) return null;

    // Check if expired
    if (this.isExpired(entry)) {
      this.delete(key, { storage });
      return null;
    }

    return entry.data;
  }

  /**
   * Check if cache entry exists and is valid
   */
  has(key: string, options: Pick<CacheOptions, 'storage'> = {}): boolean {
    return this.get(key, options) !== null;
  }

  /**
   * Delete cache entry
   */
  delete(key: string, options: Pick<CacheOptions, 'storage'> = {}): void {
    const { storage = 'memory' } = options;
    const fullKey = this.getKey(key);

    switch (storage) {
      case 'localStorage':
        localStorage.removeItem(fullKey);
        break;
      case 'sessionStorage':
        sessionStorage.removeItem(fullKey);
        break;
      case 'memory':
      default:
        memoryCache.delete(fullKey);
        break;
    }
  }

  /**
   * Clear all cache entries with this prefix
   */
  clear(options: Pick<CacheOptions, 'storage'> = {}): void {
    const { storage = 'memory' } = options;

    switch (storage) {
      case 'localStorage':
        this.clearStorage(localStorage);
        break;
      case 'sessionStorage':
        this.clearStorage(sessionStorage);
        break;
      case 'memory':
      default:
        // Clear only entries with this prefix
        const keysToDelete: string[] = [];
        memoryCache.forEach((_, key) => {
          if (key.startsWith(this.prefix)) {
            keysToDelete.push(key);
          }
        });
        keysToDelete.forEach(key => memoryCache.delete(key));
        break;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(options: Pick<CacheOptions, 'storage'> = {}): {
    totalEntries: number;
    expiredEntries: number;
    totalSize: number;
  } {
    const { storage = 'memory' } = options;
    let entries: CacheEntry<any>[] = [];

    switch (storage) {
      case 'localStorage':
        entries = this.getAllStorageEntries(localStorage);
        break;
      case 'sessionStorage':
        entries = this.getAllStorageEntries(sessionStorage);
        break;
      case 'memory':
      default:
        entries = Array.from(memoryCache.values()).filter(entry =>
          entry.key.startsWith(this.prefix)
        );
        break;
    }

    const totalEntries = entries.length;
    const expiredEntries = entries.filter(entry => this.isExpired(entry)).length;
    const totalSize = JSON.stringify(entries).length;

    return { totalEntries, expiredEntries, totalSize };
  }

  /**
   * Prune expired entries
   */
  prune(options: Pick<CacheOptions, 'storage'> = {}): number {
    const { storage = 'memory' } = options;
    let prunedCount = 0;

    switch (storage) {
      case 'localStorage':
        prunedCount = this.pruneStorage(localStorage);
        break;
      case 'sessionStorage':
        prunedCount = this.pruneStorage(sessionStorage);
        break;
      case 'memory':
      default:
        const keysToDelete: string[] = [];
        memoryCache.forEach((entry, key) => {
          if (key.startsWith(this.prefix) && this.isExpired(entry)) {
            keysToDelete.push(key);
          }
        });
        keysToDelete.forEach(key => memoryCache.delete(key));
        prunedCount = keysToDelete.length;
        break;
    }

    return prunedCount;
  }

  // Private helper methods

  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private setLocalStorage<T>(entry: CacheEntry<T>): void {
    try {
      localStorage.setItem(entry.key, JSON.stringify(entry));
    } catch (error) {
      console.warn('Failed to set localStorage cache:', error);
    }
  }

  private setSessionStorage<T>(entry: CacheEntry<T>): void {
    try {
      sessionStorage.setItem(entry.key, JSON.stringify(entry));
    } catch (error) {
      console.warn('Failed to set sessionStorage cache:', error);
    }
  }

  private getLocalStorage<T>(key: string): CacheEntry<T> | null {
    try {
      const item = localStorage.getItem(this.getKey(key));
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.warn('Failed to get localStorage cache:', error);
      return null;
    }
  }

  private getSessionStorage<T>(key: string): CacheEntry<T> | null {
    try {
      const item = sessionStorage.getItem(this.getKey(key));
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.warn('Failed to get sessionStorage cache:', error);
      return null;
    }
  }

  private clearStorage(storage: Storage): void {
    const keysToDelete: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key?.startsWith(this.prefix)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => storage.removeItem(key));
  }

  private getAllStorageEntries(storage: Storage): CacheEntry<any>[] {
    const entries: CacheEntry<any>[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key?.startsWith(this.prefix)) {
        try {
          const item = storage.getItem(key);
          if (item) {
            entries.push(JSON.parse(item));
          }
        } catch (error) {
          // Skip invalid entries
        }
      }
    }
    return entries;
  }

  private pruneStorage(storage: Storage): number {
    let prunedCount = 0;
    const keysToDelete: string[] = [];

    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key?.startsWith(this.prefix)) {
        try {
          const item = storage.getItem(key);
          if (item) {
            const entry = JSON.parse(item);
            if (this.isExpired(entry)) {
              keysToDelete.push(key);
            }
          }
        } catch (error) {
          // Remove invalid entries
          if (key) keysToDelete.push(key);
        }
      }
    }

    keysToDelete.forEach(key => storage.removeItem(key));
    prunedCount = keysToDelete.length;

    return prunedCount;
  }
}

/**
 * Default cache instance
 */
export const cache = new CacheManager();

/**
 * Cached fetch wrapper
 */
export async function cachedFetch<T>(
  url: string,
  options: RequestInit & CacheOptions = {}
): Promise<T> {
  const { ttl, storage, prefix, ...fetchOptions } = options;

  // Generate cache key from URL and options
  const cacheKey = `fetch_${url}_${JSON.stringify(fetchOptions)}`;
  const cacheManager = prefix ? new CacheManager(prefix) : cache;

  // Check cache first
  const cached = cacheManager.get<T>(cacheKey, { storage });
  if (cached !== null) {
    return cached;
  }

  // Fetch fresh data
  const response = await fetch(url, fetchOptions);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();

  // Store in cache
  cacheManager.set(cacheKey, data, { ttl, storage });

  return data;
}

/**
 * Cache decorator for functions
 */
export function cacheable<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: CacheOptions & { keyGenerator?: (...args: Parameters<T>) => string } = {}
): T {
  const { ttl, storage, prefix, keyGenerator } = options;
  const cacheManager = prefix ? new CacheManager(prefix) : cache;

  return (async (...args: Parameters<T>) => {
    // Generate cache key
    const cacheKey = keyGenerator
      ? keyGenerator(...args)
      : `fn_${fn.name}_${JSON.stringify(args)}`;

    // Check cache
    const cached = cacheManager.get<Awaited<ReturnType<T>>>(cacheKey, { storage });
    if (cached !== null) {
      return cached;
    }

    // Call function
    const result = await fn(...args);

    // Store in cache
    cacheManager.set(cacheKey, result, { ttl, storage });

    return result;
  }) as T;
}

/**
 * Auto-prune expired entries on interval
 */
let pruneInterval: NodeJS.Timeout | null = null;

export function startAutoPrune(intervalMs: number = 60000): void {
  if (pruneInterval) return;

  pruneInterval = setInterval(() => {
    cache.prune({ storage: 'memory' });
    cache.prune({ storage: 'localStorage' });
    cache.prune({ storage: 'sessionStorage' });
  }, intervalMs);
}

export function stopAutoPrune(): void {
  if (pruneInterval) {
    clearInterval(pruneInterval);
    pruneInterval = null;
  }
}

// Start auto-prune on load (every minute)
if (typeof window !== 'undefined') {
  startAutoPrune(60000);
}

/**
 * Cache debugging utilities
 */
export const cacheDebug = {
  /**
   * Log cache statistics
   */
  logStats() {
    console.log('📊 Cache Statistics:');
    console.log('Memory:', cache.getStats({ storage: 'memory' }));
    console.log('LocalStorage:', cache.getStats({ storage: 'localStorage' }));
    console.log('SessionStorage:', cache.getStats({ storage: 'sessionStorage' }));
  },

  /**
   * Clear all caches
   */
  clearAll() {
    cache.clear({ storage: 'memory' });
    cache.clear({ storage: 'localStorage' });
    cache.clear({ storage: 'sessionStorage' });
    console.log('✅ All caches cleared');
  },

  /**
   * Prune all caches
   */
  pruneAll() {
    const memoryCount = cache.prune({ storage: 'memory' });
    const localCount = cache.prune({ storage: 'localStorage' });
    const sessionCount = cache.prune({ storage: 'sessionStorage' });
    console.log(`✅ Pruned ${memoryCount + localCount + sessionCount} expired entries`);
  },
};

// Expose cache debug in development
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as any).cacheDebug = cacheDebug;
}
