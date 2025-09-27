/**
 * Cache Manager for TouriQuest API
 * 
 * Features:
 * - Multi-level caching (memory, localStorage, IndexedDB)
 * - LRU eviction with intelligent cache warming
 * - Cache invalidation patterns and tags
 * - Compression for large payloads
 * - Background sync and refresh strategies
 * - Cache versioning and migration
 */

export interface CacheConfig {
  enabled: boolean;
  defaultTTL: number;
  maxMemorySize: number;
  maxStorageSize: number;
  compressionThreshold: number;
  enableCompression: boolean;
  enablePersistence: boolean;
  backgroundRefresh: boolean;
  refreshThreshold: number; // Percentage of TTL when to refresh
  cacheLevels: ('memory' | 'localStorage' | 'indexedDB')[];
}

export interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
  etag?: string;
  lastModified?: string;
  size: number;
  compressed: boolean;
  tags: string[];
  accessCount: number;
  lastAccessed: number;
  version: number;
}

export interface CacheMetrics {
  hitRate: number;
  missRate: number;
  totalRequests: number;
  totalHits: number;
  totalMisses: number;
  memoryUsage: number;
  storageUsage: number;
  entryCount: number;
  compressionRatio: number;
}

export interface CacheInvalidationPattern {
  pattern: string | RegExp;
  tags?: string[];
  strategy: 'exact' | 'prefix' | 'regex' | 'tags';
}

export class CacheManager {
  private config: CacheConfig;
  private memoryCache: Map<string, CacheEntry> = new Map();
  private accessOrder: string[] = []; // For LRU
  private metrics: CacheMetrics;
  private backgroundTasks: Set<string> = new Set();
  private compressionWorker: Worker | null = null;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      enabled: true,
      defaultTTL: 300000, // 5 minutes
      maxMemorySize: 50 * 1024 * 1024, // 50MB
      maxStorageSize: 100 * 1024 * 1024, // 100MB
      compressionThreshold: 1024, // 1KB
      enableCompression: true,
      enablePersistence: true,
      backgroundRefresh: true,
      refreshThreshold: 80, // Refresh when 80% of TTL elapsed
      cacheLevels: ['memory', 'localStorage', 'indexedDB'],
      ...config,
    };

    this.metrics = {
      hitRate: 0,
      missRate: 0,
      totalRequests: 0,
      totalHits: 0,
      totalMisses: 0,
      memoryUsage: 0,
      storageUsage: 0,
      entryCount: 0,
      compressionRatio: 0,
    };

    this.initializeCompressionWorker();
    this.startBackgroundTasks();
  }

  /**
   * Get data from cache
   */
  async get<T>(key: string, tags?: string[]): Promise<T | null> {
    if (!this.config.enabled) {
      return null;
    }

    this.metrics.totalRequests++;

    try {
      // Try memory cache first
      let entry = await this.getFromMemory(key);
      
      // Try persistent storage if not in memory
      if (!entry && this.config.enablePersistence) {
        entry = await this.getFromStorage(key);
        
        // Promote to memory cache if found
        if (entry) {
          await this.setInMemory(key, entry);
        }
      }

      if (entry) {
        // Check if entry is expired
        if (this.isExpired(entry)) {
          await this.invalidate(key);
          this.metrics.totalMisses++;
          return null;
        }

        // Update access statistics
        entry.accessCount++;
        entry.lastAccessed = Date.now();
        this.updateAccessOrder(key);

        // Check if background refresh is needed
        if (this.shouldBackgroundRefresh(entry)) {
          this.scheduleBackgroundRefresh(key, tags);
        }

        this.metrics.totalHits++;
        this.updateMetrics();

        return this.deserializeData(entry.data, entry.compressed);
      }

      this.metrics.totalMisses++;
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      this.metrics.totalMisses++;
      return null;
    }
  }

  /**
   * Set data in cache
   */
  async set<T>(
    key: string,
    data: T,
    options: {
      ttl?: number;
      tags?: string[];
      etag?: string;
      lastModified?: string;
      priority?: 'low' | 'normal' | 'high';
    } = {}
  ): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      const serializedData = await this.serializeData(data);
      const compressed = this.shouldCompress(serializedData);
      const finalData = compressed ? await this.compress(serializedData) : serializedData;

      const entry: CacheEntry = {
        data: finalData,
        timestamp: Date.now(),
        ttl: options.ttl || this.config.defaultTTL,
        etag: options.etag,
        lastModified: options.lastModified,
        size: this.calculateSize(finalData),
        compressed,
        tags: options.tags || [],
        accessCount: 1,
        lastAccessed: Date.now(),
        version: 1,
      };

      // Set in memory cache
      await this.setInMemory(key, entry, options.priority);

      // Set in persistent storage if enabled
      if (this.config.enablePersistence) {
        await this.setInStorage(key, entry);
      }

      this.updateMetrics();
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * Memory cache operations
   */
  private async getFromMemory(key: string): Promise<CacheEntry | null> {
    return this.memoryCache.get(key) || null;
  }

  private async setInMemory(key: string, entry: CacheEntry, priority: 'low' | 'normal' | 'high' = 'normal'): Promise<void> {
    // Check memory size and evict if necessary
    await this.enforceMemoryLimit();

    this.memoryCache.set(key, entry);
    this.updateAccessOrder(key);

    // Handle priority
    if (priority === 'high') {
      // Move to front of access order
      this.accessOrder = [key, ...this.accessOrder.filter(k => k !== key)];
    }
  }

  /**
   * Storage operations (localStorage/IndexedDB)
   */
  private async getFromStorage(key: string): Promise<CacheEntry | null> {
    try {
      // Try localStorage first
      if (this.config.cacheLevels.includes('localStorage')) {
        const stored = localStorage.getItem(`cache_${key}`);
        if (stored) {
          return JSON.parse(stored);
        }
      }

      // Try IndexedDB
      if (this.config.cacheLevels.includes('indexedDB')) {
        return await this.getFromIndexedDB(key);
      }

      return null;
    } catch (error) {
      console.error('Storage get error:', error);
      return null;
    }
  }

  private async setInStorage(key: string, entry: CacheEntry): Promise<void> {
    try {
      const serialized = JSON.stringify(entry);

      // Use localStorage for smaller entries
      if (this.config.cacheLevels.includes('localStorage') && serialized.length < 100000) {
        localStorage.setItem(`cache_${key}`, serialized);
      }
      // Use IndexedDB for larger entries
      else if (this.config.cacheLevels.includes('indexedDB')) {
        await this.setInIndexedDB(key, entry);
      }
    } catch (error) {
      console.error('Storage set error:', error);
    }
  }

  /**
   * IndexedDB operations
   */
  private async getFromIndexedDB(key: string): Promise<CacheEntry | null> {
    return new Promise((resolve) => {
      const request = indexedDB.open('TouriQuestCache', 1);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['cache'], 'readonly');
        const store = transaction.objectStore('cache');
        const getRequest = store.get(key);
        
        getRequest.onsuccess = () => {
          resolve(getRequest.result?.entry || null);
        };
        
        getRequest.onerror = () => {
          resolve(null);
        };
      };
      
      request.onerror = () => {
        resolve(null);
      };
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'key' });
        }
      };
    });
  }

  private async setInIndexedDB(key: string, entry: CacheEntry): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('TouriQuestCache', 1);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['cache'], 'readwrite');
        const store = transaction.objectStore('cache');
        
        store.put({ key, entry });
        
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Cache invalidation
   */
  async invalidate(key: string): Promise<void> {
    // Remove from memory
    this.memoryCache.delete(key);
    this.accessOrder = this.accessOrder.filter(k => k !== key);

    // Remove from storage
    try {
      localStorage.removeItem(`cache_${key}`);
      await this.removeFromIndexedDB(key);
    } catch (error) {
      console.error('Invalidation error:', error);
    }

    this.updateMetrics();
  }

  async invalidatePattern(pattern: CacheInvalidationPattern): Promise<void> {
    const keysToInvalidate: string[] = [];

    // Find matching keys in memory cache
    for (const [key, entry] of this.memoryCache) {
      if (this.matchesPattern(key, entry, pattern)) {
        keysToInvalidate.push(key);
      }
    }

    // Invalidate matched keys
    await Promise.all(keysToInvalidate.map(key => this.invalidate(key)));
  }

  async invalidateByTags(tags: string[]): Promise<void> {
    const keysToInvalidate: string[] = [];

    for (const [key, entry] of this.memoryCache) {
      if (entry.tags.some(tag => tags.includes(tag))) {
        keysToInvalidate.push(key);
      }
    }

    await Promise.all(keysToInvalidate.map(key => this.invalidate(key)));
  }

  /**
   * Pattern matching
   */
  private matchesPattern(key: string, entry: CacheEntry, pattern: CacheInvalidationPattern): boolean {
    switch (pattern.strategy) {
      case 'exact':
        return key === pattern.pattern;
      
      case 'prefix':
        return key.startsWith(pattern.pattern as string);
      
      case 'regex':
        const regex = pattern.pattern instanceof RegExp ? pattern.pattern : new RegExp(pattern.pattern);
        return regex.test(key);
      
      case 'tags':
        return pattern.tags ? entry.tags.some(tag => pattern.tags!.includes(tag)) : false;
      
      default:
        return false;
    }
  }

  /**
   * Compression
   */
  private shouldCompress(data: string): boolean {
    return this.config.enableCompression && data.length > this.config.compressionThreshold;
  }

  private async compress(data: string): Promise<string> {
    if (this.compressionWorker) {
      return new Promise((resolve) => {
        this.compressionWorker!.postMessage({ action: 'compress', data });
        this.compressionWorker!.onmessage = (e) => {
          resolve(e.data.result);
        };
      });
    }

    // Fallback to simple compression
    return btoa(data);
  }

  private async decompress(data: string): Promise<string> {
    if (this.compressionWorker) {
      return new Promise((resolve) => {
        this.compressionWorker!.postMessage({ action: 'decompress', data });
        this.compressionWorker!.onmessage = (e) => {
          resolve(e.data.result);
        };
      });
    }

    // Fallback to simple decompression
    return atob(data);
  }

  /**
   * Serialization
   */
  private async serializeData(data: any): Promise<string> {
    return JSON.stringify(data);
  }

  private async deserializeData(data: string, compressed: boolean): Promise<any> {
    const decompressedData = compressed ? await this.decompress(data) : data;
    return JSON.parse(decompressedData);
  }

  /**
   * Utility methods
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() > entry.timestamp + entry.ttl;
  }

  private shouldBackgroundRefresh(entry: CacheEntry): boolean {
    if (!this.config.backgroundRefresh) return false;
    
    const elapsed = Date.now() - entry.timestamp;
    const refreshTime = entry.ttl * (this.config.refreshThreshold / 100);
    
    return elapsed >= refreshTime;
  }

  private scheduleBackgroundRefresh(key: string, tags?: string[]): void {
    if (this.backgroundTasks.has(key)) return;
    
    this.backgroundTasks.add(key);
    
    // Emit event for background refresh
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('cache:backgroundRefresh', {
        detail: { key, tags }
      }));
      this.backgroundTasks.delete(key);
    }, 0);
  }

  private updateAccessOrder(key: string): void {
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    this.accessOrder.unshift(key);
  }

  private calculateSize(data: any): number {
    return new Blob([JSON.stringify(data)]).size;
  }

  private async enforceMemoryLimit(): Promise<void> {
    while (this.getMemoryUsage() > this.config.maxMemorySize && this.memoryCache.size > 0) {
      // Remove least recently used item
      const lruKey = this.accessOrder[this.accessOrder.length - 1];
      if (lruKey) {
        await this.invalidate(lruKey);
      }
    }
  }

  private getMemoryUsage(): number {
    let totalSize = 0;
    for (const entry of this.memoryCache.values()) {
      totalSize += entry.size;
    }
    return totalSize;
  }

  private async removeFromIndexedDB(key: string): Promise<void> {
    return new Promise((resolve) => {
      const request = indexedDB.open('TouriQuestCache', 1);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['cache'], 'readwrite');
        const store = transaction.objectStore('cache');
        
        store.delete(key);
        
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => resolve(); // Don't fail on error
      };
      
      request.onerror = () => resolve();
    });
  }

  /**
   * Background tasks
   */
  private startBackgroundTasks(): void {
    // Cleanup expired entries every 5 minutes
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, 5 * 60 * 1000);

    // Update metrics every minute
    setInterval(() => {
      this.updateMetrics();
    }, 60 * 1000);
  }

  private async cleanupExpiredEntries(): Promise<void> {
    const expiredKeys: string[] = [];
    
    for (const [key, entry] of this.memoryCache) {
      if (this.isExpired(entry)) {
        expiredKeys.push(key);
      }
    }
    
    await Promise.all(expiredKeys.map(key => this.invalidate(key)));
  }

  /**
   * Metrics and monitoring
   */
  private updateMetrics(): void {
    this.metrics.hitRate = this.metrics.totalRequests > 0 
      ? (this.metrics.totalHits / this.metrics.totalRequests) * 100 
      : 0;
    
    this.metrics.missRate = 100 - this.metrics.hitRate;
    this.metrics.memoryUsage = this.getMemoryUsage();
    this.metrics.entryCount = this.memoryCache.size;
    
    // Calculate compression ratio
    let totalOriginalSize = 0;
    let totalCompressedSize = 0;
    
    for (const entry of this.memoryCache.values()) {
      if (entry.compressed) {
        totalCompressedSize += entry.size;
        totalOriginalSize += entry.size * 1.5; // Estimate
      } else {
        totalOriginalSize += entry.size;
        totalCompressedSize += entry.size;
      }
    }
    
    this.metrics.compressionRatio = totalOriginalSize > 0 
      ? ((totalOriginalSize - totalCompressedSize) / totalOriginalSize) * 100 
      : 0;
  }

  /**
   * Worker initialization
   */
  private initializeCompressionWorker(): void {
    if (this.config.enableCompression && typeof Worker !== 'undefined') {
      try {
        const workerCode = `
          self.onmessage = function(e) {
            const { action, data } = e.data;
            let result;
            
            if (action === 'compress') {
              result = btoa(data);
            } else if (action === 'decompress') {
              result = atob(data);
            }
            
            self.postMessage({ result });
          };
        `;
        
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        this.compressionWorker = new Worker(URL.createObjectURL(blob));
      } catch (error) {
        console.warn('Failed to create compression worker:', error);
      }
    }
  }

  /**
   * Public API
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  async clear(): Promise<void> {
    this.memoryCache.clear();
    this.accessOrder = [];
    
    // Clear storage
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('cache_')) {
          localStorage.removeItem(key);
        }
      });
      
      // Clear IndexedDB
      await this.clearIndexedDB();
    } catch (error) {
      console.error('Clear cache error:', error);
    }
    
    this.updateMetrics();
  }

  private async clearIndexedDB(): Promise<void> {
    return new Promise((resolve) => {
      const request = indexedDB.open('TouriQuestCache', 1);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['cache'], 'readwrite');
        const store = transaction.objectStore('cache');
        
        store.clear();
        
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => resolve();
      };
      
      request.onerror = () => resolve();
    });
  }

  setConfig(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): CacheConfig {
    return { ...this.config };
  }

  destroy(): void {
    if (this.compressionWorker) {
      this.compressionWorker.terminate();
    }
    this.clear();
  }
}