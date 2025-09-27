/**
 * Custom Intelligent Caching Layer
 * Advanced caching with LRU eviction, encryption, and performance optimization
 */

import { CacheEntry, CacheConfig } from '../types';

// LRU Cache Implementation
export class LRUCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number;
  private maxAge: number;
  private persistent: boolean;
  private compression: boolean;
  private encryption: boolean;
  private storageKey: string;
  
  // Performance metrics
  private hits = 0;
  private misses = 0;
  private evictions = 0;
  
  constructor(config: CacheConfig & { storageKey?: string }) {
    this.maxSize = config.maxSize;
    this.maxAge = config.maxAge;
    this.persistent = config.persistent;
    this.compression = config.compression;
    this.encryption = config.encryption;
    this.storageKey = config.storageKey || 'touriquest-cache';
    
    // Load from persistent storage
    if (this.persistent) {
      this.loadFromStorage();
    }
    
    // Set up cleanup interval
    setInterval(() => this.cleanup(), 60000); // Clean every minute
  }
  
  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.misses++;
      return null;
    }
    
    // Check if expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }
    
    // Update access info
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    
    this.hits++;
    return this.deserialize(entry.value);
  }
  
  set(key: string, value: T, ttl?: number): void {
    const serializedValue = this.serialize(value);
    const size = this.calculateSize(serializedValue);
    const now = Date.now();
    
    const entry: CacheEntry<T> = {
      key,
      value: serializedValue,
      timestamp: now,
      ttl: ttl || this.maxAge,
      accessCount: 1,
      lastAccessed: now,
      size,
      metadata: {}
    };
    
    // Remove existing entry if it exists
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    
    // Check if we need to evict
    while (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }
    
    this.cache.set(key, entry);
    
    // Persist if enabled
    if (this.persistent) {
      this.saveToStorage();
    }
  }
  
  has(key: string): boolean {
    const entry = this.cache.get(key);
    return entry !== undefined && !this.isExpired(entry);
  }
  
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted && this.persistent) {
      this.saveToStorage();
    }
    return deleted;
  }
  
  clear(): void {
    this.cache.clear();
    if (this.persistent) {
      this.clearStorage();
    }
  }
  
  size(): number {
    return this.cache.size;
  }
  
  // Get cache statistics
  getStats() {
    const totalSize = Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.size, 0);
    const hitRate = this.hits / (this.hits + this.misses) || 0;
    
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      totalSize,
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      hitRate: Math.round(hitRate * 100) / 100
    };
  }
  
  // Get all keys
  keys(): string[] {
    return Array.from(this.cache.keys());
  }
  
  // Get entries sorted by access pattern
  getEntriesByAccess(): Array<CacheEntry<T>> {
    return Array.from(this.cache.values())
      .sort((a, b) => b.accessCount - a.accessCount);
  }
  
  // Cleanup expired entries
  private cleanup(): void {
    const toDelete: string[] = [];
    
    this.cache.forEach((entry, key) => {
      if (this.isExpired(entry)) {
        toDelete.push(key);
      }
    });
    
    toDelete.forEach(key => this.cache.delete(key));
    
    if (toDelete.length > 0 && this.persistent) {
      this.saveToStorage();
    }
  }
  
  // Check if entry is expired
  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }
  
  // Evict least recently used entry
  private evictLRU(): void {
    const firstKey = this.cache.keys().next().value;
    if (firstKey) {
      this.cache.delete(firstKey);
      this.evictions++;
    }
  }
  
  // Serialize value with optional compression
  private serialize(value: T): any {
    let serialized = value;
    
    if (this.compression && typeof value === 'object') {
      // Simple compression simulation - in production use a real compression library
      serialized = this.compress(JSON.stringify(value)) as any;
    }
    
    if (this.encryption) {
      serialized = this.encrypt(serialized);
    }
    
    return serialized;
  }
  
  // Deserialize value with optional decompression
  private deserialize(value: any): T {
    let deserialized = value;
    
    if (this.encryption) {
      deserialized = this.decrypt(deserialized);
    }
    
    if (this.compression && typeof deserialized === 'string') {
      deserialized = JSON.parse(this.decompress(deserialized));
    }
    
    return deserialized;
  }
  
  // Calculate entry size
  private calculateSize(value: any): number {
    return JSON.stringify(value).length * 2; // Rough estimate in bytes
  }
  
  // Simple compression (in production, use a real compression library)
  private compress(data: string): string {
    return btoa(data);
  }
  
  private decompress(data: string): string {
    return atob(data);
  }
  
  // Simple encryption (in production, use proper encryption)
  private encrypt(data: any): string {
    return btoa(JSON.stringify(data));
  }
  
  private decrypt(data: string): any {
    return JSON.parse(atob(data));
  }
  
  // Persistent storage methods
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        data.forEach((entry: CacheEntry<T>) => {
          if (!this.isExpired(entry)) {
            this.cache.set(entry.key, entry);
          }
        });
      }
    } catch (error) {
      console.error('Failed to load cache from storage:', error);
    }
  }
  
  private saveToStorage(): void {
    try {
      const data = Array.from(this.cache.values());
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save cache to storage:', error);
    }
  }
  
  private clearStorage(): void {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.error('Failed to clear cache storage:', error);
    }
  }
}

// Multi-level cache with different strategies
export class MultiLevelCache {
  private l1Cache: LRUCache; // Fast in-memory cache
  private l2Cache: LRUCache; // Larger persistent cache
  
  constructor(
    l1Config: CacheConfig & { storageKey?: string },
    l2Config: CacheConfig & { storageKey?: string }
  ) {
    this.l1Cache = new LRUCache({ ...l1Config, persistent: false });
    this.l2Cache = new LRUCache({ ...l2Config, persistent: true });
  }
  
  get<T>(key: string): T | null {
    // Try L1 cache first
    let value = this.l1Cache.get<T>(key);
    if (value !== null) {
      return value;
    }
    
    // Try L2 cache
    value = this.l2Cache.get<T>(key);
    if (value !== null) {
      // Promote to L1 cache
      this.l1Cache.set(key, value);
      return value;
    }
    
    return null;
  }
  
  set<T>(key: string, value: T, ttl?: number): void {
    // Set in both caches
    this.l1Cache.set(key, value, ttl);
    this.l2Cache.set(key, value, ttl);
  }
  
  has(key: string): boolean {
    return this.l1Cache.has(key) || this.l2Cache.has(key);
  }
  
  delete(key: string): boolean {
    const deleted1 = this.l1Cache.delete(key);
    const deleted2 = this.l2Cache.delete(key);
    return deleted1 || deleted2;
  }
  
  clear(): void {
    this.l1Cache.clear();
    this.l2Cache.clear();
  }
  
  getStats() {
    return {
      l1: this.l1Cache.getStats(),
      l2: this.l2Cache.getStats()
    };
  }
}

// Cache namespace manager
export class CacheNamespaceManager {
  private caches = new Map<string, LRUCache>();
  
  getCache(namespace: string, config?: CacheConfig): LRUCache {
    if (!this.caches.has(namespace)) {
      const defaultConfig: CacheConfig = {
        maxSize: 1000,
        maxAge: 30 * 60 * 1000, // 30 minutes
        evictionPolicy: 'lru',
        persistent: false,
        compression: false,
        encryption: false
      };
      
      this.caches.set(namespace, new LRUCache({
        ...defaultConfig,
        ...config,
        storageKey: `touriquest-cache-${namespace}`
      }));
    }
    
    return this.caches.get(namespace)!;
  }
  
  clearNamespace(namespace: string): void {
    const cache = this.caches.get(namespace);
    if (cache) {
      cache.clear();
    }
  }
  
  clearAll(): void {
    this.caches.forEach(cache => cache.clear());
  }
  
  getNamespaces(): string[] {
    return Array.from(this.caches.keys());
  }
  
  getStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    this.caches.forEach((cache, namespace) => {
      stats[namespace] = cache.getStats();
    });
    return stats;
  }
}

// Global cache instance
export const cacheManager = new CacheNamespaceManager();

// Cache decorators for easy integration
export function cached(namespace: string, ttl?: number) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const cache = cacheManager.getCache(namespace);
      const cacheKey = `${propertyKey}-${JSON.stringify(args)}`;
      
      // Try to get from cache
      const cached = cache.get(cacheKey);
      if (cached !== null) {
        return cached;
      }
      
      // Execute original method
      const result = await originalMethod.apply(this, args);
      
      // Cache the result
      cache.set(cacheKey, result, ttl);
      
      return result;
    };
    
    return descriptor;
  };
}

// Cache utilities
export const cacheUtils = {
  // Normalize cache key
  normalizeKey: (key: string): string => {
    return key.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
  },
  
  // Generate cache key from object
  generateKey: (prefix: string, params: Record<string, any>): string => {
    const sorted = Object.keys(params).sort().map(key => `${key}:${params[key]}`).join('-');
    return `${prefix}-${sorted}`;
  },
  
  // Invalidate pattern-based keys
  invalidatePattern: (cache: LRUCache, pattern: RegExp): void => {
    cache.keys().forEach(key => {
      if (pattern.test(key)) {
        cache.delete(key);
      }
    });
  },
  
  // Warm up cache with common queries
  warmUp: async (cache: LRUCache, queries: Array<{ key: string; fetcher: () => Promise<any> }>): Promise<void> => {
    const promises = queries.map(async ({ key, fetcher }) => {
      if (!cache.has(key)) {
        try {
          const data = await fetcher();
          cache.set(key, data);
        } catch (error) {
          console.error(`Failed to warm up cache for key ${key}:`, error);
        }
      }
    });
    
    await Promise.all(promises);
  }
};

// Export default cache instances
export const defaultCache = new LRUCache({
  maxSize: 1000,
  maxAge: 30 * 60 * 1000, // 30 minutes
  evictionPolicy: 'lru',
  persistent: true,
  compression: false,
  encryption: false,
  storageKey: 'touriquest-default-cache'
});

export const memoryCache = new LRUCache({
  maxSize: 500,
  maxAge: 5 * 60 * 1000, // 5 minutes
  evictionPolicy: 'lru',
  persistent: false,
  compression: false,
  encryption: false
});

export const persistentCache = new LRUCache({
  maxSize: 2000,
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  evictionPolicy: 'lru',
  persistent: true,
  compression: true,
  encryption: true,
  storageKey: 'touriquest-persistent-cache'
});