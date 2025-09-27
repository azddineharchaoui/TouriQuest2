/**
 * Request Deduplicator for TouriQuest API
 * 
 * Features:
 * - Prevent duplicate requests with identical parameters
 * - Configurable cache TTL and key generation
 * - Request cancellation and cleanup
 * - Memory-efficient LRU cache implementation
 * - Support for different deduplication strategies
 */

export interface DeduplicationConfig {
  enabled: boolean;
  ttl: number; // Time to live in milliseconds
  maxCacheSize: number;
  keyGenerator?: (url: string, method: string, data?: any, headers?: Record<string, string>) => string;
  ignoreHeaders?: string[];
  strategy: 'full' | 'url-only' | 'custom';
}

export interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
  abortController: AbortController;
  refCount: number;
}

export class RequestDeduplicator {
  private config: DeduplicationConfig;
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<DeduplicationConfig> = {}) {
    this.config = {
      enabled: true,
      ttl: 5000, // 5 seconds
      maxCacheSize: 1000,
      strategy: 'full',
      ignoreHeaders: ['authorization', 'x-request-id', 'x-correlation-id'],
      ...config,
    };

    this.startPeriodicCleanup();
  }

  /**
   * Execute request with deduplication
   */
  async execute<T>(
    url: string,
    method: string,
    requestFn: (abortSignal: AbortSignal) => Promise<T>,
    data?: any,
    headers?: Record<string, string>
  ): Promise<T> {
    if (!this.config.enabled) {
      const abortController = new AbortController();
      return requestFn(abortController.signal);
    }

    const key = this.generateKey(url, method, data, headers);
    
    // Check if request is already pending
    const existingRequest = this.pendingRequests.get(key);
    if (existingRequest) {
      existingRequest.refCount++;
      try {
        return await existingRequest.promise;
      } finally {
        existingRequest.refCount--;
        if (existingRequest.refCount <= 0) {
          this.pendingRequests.delete(key);
        }
      }
    }

    // Create new request
    const abortController = new AbortController();
    const promise = this.createDedupedRequest(requestFn, abortController.signal);
    
    const pendingRequest: PendingRequest = {
      promise,
      timestamp: Date.now(),
      abortController,
      refCount: 1,
    };

    this.pendingRequests.set(key, pendingRequest);

    try {
      const result = await promise;
      return result;
    } catch (error) {
      throw error;
    } finally {
      pendingRequest.refCount--;
      if (pendingRequest.refCount <= 0) {
        this.pendingRequests.delete(key);
      }
    }
  }

  /**
   * Create deduped request with proper cleanup
   */
  private async createDedupedRequest<T>(
    requestFn: (abortSignal: AbortSignal) => Promise<T>,
    abortSignal: AbortSignal
  ): Promise<T> {
    try {
      return await requestFn(abortSignal);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Generate cache key for request
   */
  private generateKey(
    url: string,
    method: string,
    data?: any,
    headers?: Record<string, string>
  ): string {
    if (this.config.keyGenerator) {
      return this.config.keyGenerator(url, method, data, headers);
    }

    switch (this.config.strategy) {
      case 'url-only':
        return this.generateUrlOnlyKey(url, method);
      
      case 'full':
        return this.generateFullKey(url, method, data, headers);
      
      case 'custom':
        return this.generateCustomKey(url, method, data, headers);
      
      default:
        return this.generateFullKey(url, method, data, headers);
    }
  }

  /**
   * Generate key based on URL and method only
   */
  private generateUrlOnlyKey(url: string, method: string): string {
    return `${method.toUpperCase()}:${url}`;
  }

  /**
   * Generate key based on all request parameters
   */
  private generateFullKey(
    url: string,
    method: string,
    data?: any,
    headers?: Record<string, string>
  ): string {
    const parts = [method.toUpperCase(), url];
    
    // Add data hash if present
    if (data !== undefined && data !== null) {
      parts.push(this.hashObject(data));
    }
    
    // Add relevant headers
    if (headers) {
      const relevantHeaders = this.getRelevantHeaders(headers);
      if (Object.keys(relevantHeaders).length > 0) {
        parts.push(this.hashObject(relevantHeaders));
      }
    }
    
    return parts.join(':');
  }

  /**
   * Generate custom key (can be overridden by subclasses)
   */
  private generateCustomKey(
    url: string,
    method: string,
    data?: any,
    headers?: Record<string, string>
  ): string {
    // Default to full key strategy
    return this.generateFullKey(url, method, data, headers);
  }

  /**
   * Filter headers to include only relevant ones
   */
  private getRelevantHeaders(headers: Record<string, string>): Record<string, string> {
    const relevant: Record<string, string> = {};
    const ignoreList = this.config.ignoreHeaders || [];
    
    for (const [key, value] of Object.entries(headers)) {
      const lowerKey = key.toLowerCase();
      if (!ignoreList.includes(lowerKey)) {
        relevant[lowerKey] = value;
      }
    }
    
    return relevant;
  }

  /**
   * Generate hash for objects
   */
  private hashObject(obj: any): string {
    const str = JSON.stringify(obj, Object.keys(obj).sort());
    return this.simpleHash(str);
  }

  /**
   * Simple hash function for strings
   */
  private simpleHash(str: string): string {
    let hash = 0;
    if (str.length === 0) return hash.toString();
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }

  /**
   * Cancel all pending requests
   */
  cancelAll(): void {
    for (const [key, pendingRequest] of this.pendingRequests) {
      try {
        pendingRequest.abortController.abort();
      } catch (error) {
        console.warn(`Failed to cancel request ${key}:`, error);
      }
    }
    
    this.pendingRequests.clear();
  }

  /**
   * Cancel specific request by key
   */
  cancel(url: string, method: string, data?: any, headers?: Record<string, string>): boolean {
    const key = this.generateKey(url, method, data, headers);
    const pendingRequest = this.pendingRequests.get(key);
    
    if (pendingRequest) {
      try {
        pendingRequest.abortController.abort();
        this.pendingRequests.delete(key);
        return true;
      } catch (error) {
        console.warn(`Failed to cancel request ${key}:`, error);
      }
    }
    
    return false;
  }

  /**
   * Check if request is currently pending
   */
  isPending(url: string, method: string, data?: any, headers?: Record<string, string>): boolean {
    const key = this.generateKey(url, method, data, headers);
    return this.pendingRequests.has(key);
  }

  /**
   * Get pending request count
   */
  getPendingCount(): number {
    return this.pendingRequests.size;
  }

  /**
   * Get all pending request keys
   */
  getPendingKeys(): string[] {
    return Array.from(this.pendingRequests.keys());
  }

  /**
   * Get pending request details
   */
  getPendingRequestDetails(): Array<{
    key: string;
    timestamp: number;
    age: number;
    refCount: number;
  }> {
    const now = Date.now();
    return Array.from(this.pendingRequests.entries()).map(([key, request]) => ({
      key,
      timestamp: request.timestamp,
      age: now - request.timestamp,
      refCount: request.refCount,
    }));
  }

  /**
   * Periodic cleanup of expired requests
   */
  private startPeriodicCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.ttl);
  }

  /**
   * Clean up expired requests
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    for (const [key, pendingRequest] of this.pendingRequests) {
      if (now - pendingRequest.timestamp > this.config.ttl) {
        expiredKeys.push(key);
      }
    }
    
    // Cancel and remove expired requests
    for (const key of expiredKeys) {
      const pendingRequest = this.pendingRequests.get(key);
      if (pendingRequest) {
        try {
          pendingRequest.abortController.abort();
        } catch (error) {
          console.warn(`Failed to abort expired request ${key}:`, error);
        }
        this.pendingRequests.delete(key);
      }
    }
    
    // Enforce max cache size (LRU eviction)
    if (this.pendingRequests.size > this.config.maxCacheSize) {
      this.evictOldest(this.pendingRequests.size - this.config.maxCacheSize);
    }
  }

  /**
   * Evict oldest requests to maintain cache size
   */
  private evictOldest(count: number): void {
    const entries = Array.from(this.pendingRequests.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp)
      .slice(0, count);
    
    for (const [key, pendingRequest] of entries) {
      try {
        pendingRequest.abortController.abort();
      } catch (error) {
        console.warn(`Failed to abort evicted request ${key}:`, error);
      }
      this.pendingRequests.delete(key);
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<DeduplicationConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Restart cleanup timer if TTL changed
    if (config.ttl !== undefined && this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.startPeriodicCleanup();
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): DeduplicationConfig {
    return { ...this.config };
  }

  /**
   * Get statistics
   */
  getStats(): {
    enabled: boolean;
    pendingCount: number;
    maxCacheSize: number;
    ttl: number;
    oldestRequestAge: number;
    averageRefCount: number;
  } {
    const now = Date.now();
    const requests = Array.from(this.pendingRequests.values());
    
    const oldestRequestAge = requests.length > 0
      ? Math.max(...requests.map(r => now - r.timestamp))
      : 0;
    
    const averageRefCount = requests.length > 0
      ? requests.reduce((sum, r) => sum + r.refCount, 0) / requests.length
      : 0;
    
    return {
      enabled: this.config.enabled,
      pendingCount: this.pendingRequests.size,
      maxCacheSize: this.config.maxCacheSize,
      ttl: this.config.ttl,
      oldestRequestAge,
      averageRefCount,
    };
  }

  /**
   * Enable or disable deduplication
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    
    if (!enabled) {
      this.cancelAll();
    }
  }

  /**
   * Clear all pending requests
   */
  clear(): void {
    this.cancelAll();
  }

  /**
   * Destroy the deduplicator
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    this.cancelAll();
  }
}

/**
 * Factory for creating configured request deduplicators
 */
export class RequestDeduplicatorFactory {
  private static defaultConfig: DeduplicationConfig = {
    enabled: true,
    ttl: 5000,
    maxCacheSize: 1000,
    strategy: 'full',
    ignoreHeaders: ['authorization', 'x-request-id', 'x-correlation-id'],
  };

  /**
   * Create deduplicator for API requests
   */
  static createForAPI(config?: Partial<DeduplicationConfig>): RequestDeduplicator {
    return new RequestDeduplicator({
      ...this.defaultConfig,
      ttl: 3000, // Shorter TTL for API requests
      strategy: 'full',
      ...config,
    });
  }

  /**
   * Create deduplicator for search requests
   */
  static createForSearch(config?: Partial<DeduplicationConfig>): RequestDeduplicator {
    return new RequestDeduplicator({
      ...this.defaultConfig,
      ttl: 10000, // Longer TTL for search
      strategy: 'url-only', // Search results change less frequently
      ...config,
    });
  }

  /**
   * Create deduplicator for static content
   */
  static createForStatic(config?: Partial<DeduplicationConfig>): RequestDeduplicator {
    return new RequestDeduplicator({
      ...this.defaultConfig,
      ttl: 30000, // Much longer TTL for static content
      strategy: 'url-only',
      ...config,
    });
  }

  /**
   * Update default configuration
   */
  static setDefaultConfig(config: Partial<DeduplicationConfig>): void {
    this.defaultConfig = { ...this.defaultConfig, ...config };
  }
}