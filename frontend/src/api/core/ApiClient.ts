/**
 * Enterprise-Grade API Client for TouriQuest
 * 
 * Features:
 * - Smart API Gateway with service discovery
 * - Circuit breaker pattern for resilience
 * - Advanced authentication with JWT refresh
 * - Request deduplication and batching
 * - Intelligent error handling and recovery
 * - Performance optimization with caching
 * - Multi-tenant architecture support
 */

import axios, { 
  AxiosInstance, 
  AxiosRequestConfig, 
  AxiosResponse, 
  AxiosError,
  InternalAxiosRequestConfig 
} from 'axios';
import { AuthManager } from './AuthManager';
import { CircuitBreaker } from './CircuitBreaker';
import { RequestDeduplicator } from './RequestDeduplicator';
import { CacheManager } from './CacheManager';
import { ErrorHandler } from './ErrorHandler';
import { Logger } from '../utils/Logger';
import { Metrics } from '../utils/Metrics';
import { RetryManager } from './RetryManager';
import { RateLimiter } from './RateLimiter';
import { CompressionManager } from './CompressionManager';

export interface ApiClientConfig {
  baseURL: string;
  timeout: number;
  retryConfig: RetryConfig;
  circuitBreakerConfig: CircuitBreakerConfig;
  cacheConfig: CacheConfig;
  authConfig: AuthConfig;
  enableMetrics: boolean;
  enableLogging: boolean;
  tenantId?: string;
  apiVersion?: string;
  environment: 'development' | 'staging' | 'production';
  enableCompression: boolean;
  enableDeduplication: boolean;
  enableBatching: boolean;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableStatusCodes: number[];
  retryableErrors: string[];
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
  expectedFailureRate: number;
}

export interface CacheConfig {
  defaultTTL: number;
  maxSize: number;
  enableCompression: boolean;
  persistentStorage: boolean;
}

export interface AuthConfig {
  tokenRefreshThreshold: number; // seconds before expiry
  maxConcurrentRefreshes: number;
  enableBiometric: boolean;
  enableWebAuthn: boolean;
  sessionTimeoutWarning: number; // seconds
}

export interface RequestMetadata {
  requestId: string;
  timestamp: number;
  userAgent: string;
  ip?: string;
  userId?: string;
  tenantId?: string;
  sessionId?: string;
  requestSource: 'web' | 'mobile' | 'api';
  priority: 'low' | 'normal' | 'high' | 'critical';
  tags?: string[];
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  metadata: {
    requestId: string;
    duration: number;
    cached: boolean;
    retryCount: number;
    circuitBreakerState: 'closed' | 'open' | 'half-open';
    compressionRatio?: number;
    serverTimestamp: string;
  };
}

export class ApiClient {
  private instance: AxiosInstance;
  private authManager: AuthManager;
  private circuitBreaker: CircuitBreaker;
  private deduplicator: RequestDeduplicator;
  private cacheManager: CacheManager;
  private errorHandler: ErrorHandler;
  private logger: Logger;
  private metrics: Metrics;
  private retryManager: RetryManager;
  private rateLimiter: RateLimiter;
  private compressionManager: CompressionManager;
  private config: ApiClientConfig;
  private serviceDiscovery: Map<string, string> = new Map();
  private requestQueue: Map<string, Promise<any>> = new Map();

  constructor(config: ApiClientConfig) {
    this.config = config;
    this.initializeComponents();
    this.createAxiosInstance();
    this.setupInterceptors();
    this.initializeServiceDiscovery();
  }

  private initializeComponents(): void {
    this.authManager = new AuthManager(this.config.authConfig);
    this.circuitBreaker = new CircuitBreaker(this.config.circuitBreakerConfig);
    this.deduplicator = new RequestDeduplicator();
    this.cacheManager = new CacheManager(this.config.cacheConfig);
    this.errorHandler = new ErrorHandler();
    this.retryManager = new RetryManager(this.config.retryConfig);
    this.rateLimiter = new RateLimiter();
    this.compressionManager = new CompressionManager();
    
    if (this.config.enableLogging) {
      this.logger = new Logger({
        level: this.config.environment === 'production' ? 'warn' : 'debug',
        enableConsole: this.config.environment !== 'production',
        enableRemote: this.config.environment === 'production'
      });
    }
    
    if (this.config.enableMetrics) {
      this.metrics = new Metrics();
    }
  }

  private createAxiosInstance(): void {
    this.instance = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Client-Version': process.env.REACT_APP_VERSION || '1.0.0',
        'X-Client-Platform': this.detectPlatform(),
        'X-API-Version': this.config.apiVersion || 'v1',
        ...(this.config.tenantId && { 'X-Tenant-ID': this.config.tenantId }),
      },
      validateStatus: (status) => status < 500, // Don't throw for 4xx errors
      maxRedirects: 5,
      decompress: true,
    });
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.instance.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        const startTime = Date.now();
        const requestId = this.generateRequestId();
        
        // Add request metadata
        config.metadata = {
          requestId,
          timestamp: startTime,
          userAgent: navigator.userAgent,
          requestSource: this.detectRequestSource(),
          priority: this.determinePriority(config),
          userId: await this.authManager.getCurrentUserId(),
          tenantId: this.config.tenantId,
          sessionId: await this.authManager.getSessionId(),
        } as RequestMetadata;

        // Authentication
        const token = await this.authManager.getValidToken();
        if (token) {
          config.headers = config.headers || {};
          config.headers['Authorization'] = `Bearer ${token}`;
        }

        // Rate limiting
        await this.rateLimiter.checkLimit(config.url || '', config.metadata.userId);

        // Circuit breaker check
        await this.circuitBreaker.checkState(config.url || '');

        // Request deduplication
        if (this.config.enableDeduplication && this.isIdempotentRequest(config)) {
          const dedupKey = this.deduplicator.generateKey(config);
          const existingRequest = this.requestQueue.get(dedupKey);
          if (existingRequest) {
            this.logger?.debug('Request deduplicated', { requestId, dedupKey });
            return existingRequest;
          }
        }

        // Compression
        if (this.config.enableCompression && this.shouldCompress(config)) {
          config = await this.compressionManager.compressRequest(config);
        }

        // Service discovery
        config.baseURL = await this.resolveServiceUrl(config.url || '');

        // Logging
        this.logger?.debug('API Request', {
          requestId,
          method: config.method?.toUpperCase(),
          url: config.url,
          headers: this.sanitizeHeaders(config.headers),
          data: this.sanitizeData(config.data),
        });

        // Metrics
        this.metrics?.recordRequestStart(requestId, config.method || 'GET', config.url || '');

        return config;
      },
      (error: AxiosError) => {
        this.logger?.error('Request interceptor error', error);
        return Promise.reject(this.errorHandler.handleError(error));
      }
    );

    // Response interceptor
    this.instance.interceptors.response.use(
      async (response: AxiosResponse) => {
        const requestId = response.config.metadata?.requestId || 'unknown';
        const duration = Date.now() - (response.config.metadata?.timestamp || 0);

        // Cache successful responses
        if (this.shouldCache(response)) {
          await this.cacheManager.set(
            this.generateCacheKey(response.config),
            response.data,
            this.getCacheTTL(response.config)
          );
        }

        // Circuit breaker success
        this.circuitBreaker.recordSuccess(response.config.url || '');

        // Decompression
        if (this.isCompressed(response)) {
          response.data = await this.compressionManager.decompressResponse(response);
        }

        // Metrics
        this.metrics?.recordRequestSuccess(requestId, response.status, duration);

        // Logging
        this.logger?.debug('API Response', {
          requestId,
          status: response.status,
          duration,
          url: response.config.url,
          cached: false,
        });

        // Transform response
        return this.transformResponse(response, duration);
      },
      async (error: AxiosError) => {
        const requestId = error.config?.metadata?.requestId || 'unknown';
        const duration = Date.now() - (error.config?.metadata?.timestamp || 0);

        // Circuit breaker failure
        if (error.config?.url) {
          this.circuitBreaker.recordFailure(error.config.url);
        }

        // Retry logic
        if (this.shouldRetry(error)) {
          return this.retryManager.retry(
            () => this.instance.request(error.config!),
            error
          );
        }

        // Error handling
        const handledError = await this.errorHandler.handleError(error);

        // Metrics
        this.metrics?.recordRequestError(requestId, error.response?.status || 0, duration);

        // Logging
        this.logger?.error('API Error', {
          requestId,
          status: error.response?.status,
          duration,
          url: error.config?.url,
          error: handledError.message,
        });

        throw handledError;
      }
    );
  }

  private async initializeServiceDiscovery(): Promise<void> {
    // Initialize service endpoints mapping
    this.serviceDiscovery.set('/auth/', `${this.config.baseURL}/auth`);
    this.serviceDiscovery.set('/properties/', `${this.config.baseURL}/properties`);
    this.serviceDiscovery.set('/pois/', `${this.config.baseURL}/pois`);
    this.serviceDiscovery.set('/experiences/', `${this.config.baseURL}/experiences`);
    this.serviceDiscovery.set('/ai/', `${this.config.baseURL}/ai`);
    this.serviceDiscovery.set('/bookings/', `${this.config.baseURL}/bookings`);
    this.serviceDiscovery.set('/analytics/', `${this.config.baseURL}/analytics`);
    this.serviceDiscovery.set('/admin/', `${this.config.baseURL}/admin`);
    this.serviceDiscovery.set('/media/', `${this.config.baseURL}/media`);
    this.serviceDiscovery.set('/notifications/', `${this.config.baseURL}/notifications`);
    this.serviceDiscovery.set('/recommendations/', `${this.config.baseURL}/recommendations`);
    this.serviceDiscovery.set('/communication/', `${this.config.baseURL}/communication`);
    this.serviceDiscovery.set('/integrations/', `${this.config.baseURL}/integrations`);
    this.serviceDiscovery.set('/monitoring/', `${this.config.baseURL}/monitoring`);

    // Load balancing and health checks could be added here
    // await this.performHealthChecks();
  }

  /**
   * Core HTTP Methods with Enterprise Features
   */

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    // Check cache first
    const cacheKey = this.generateCacheKey({ ...config, url, method: 'GET' });
    const cachedData = await this.cacheManager.get<T>(cacheKey);
    
    if (cachedData) {
      this.logger?.debug('Cache hit', { url, cacheKey });
      return this.createCachedResponse(cachedData, url);
    }

    return this.request<T>({ ...config, method: 'GET', url });
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'POST', url, data });
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'PUT', url, data });
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'PATCH', url, data });
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'DELETE', url });
  }

  /**
   * Advanced Features
   */

  // Request batching for multiple simultaneous calls
  async batch<T>(requests: AxiosRequestConfig[]): Promise<ApiResponse<T>[]> {
    if (!this.config.enableBatching) {
      return Promise.all(requests.map(req => this.request<T>(req)));
    }

    // Group requests by service
    const batchedRequests = this.groupRequestsByService(requests);
    const results: ApiResponse<T>[] = [];

    for (const [service, serviceRequests] of batchedRequests) {
      if (serviceRequests.length === 1) {
        results.push(await this.request<T>(serviceRequests[0]));
      } else {
        // Create batch request
        const batchResponse = await this.request<T[]>({
          method: 'POST',
          url: `/${service}/batch`,
          data: { requests: serviceRequests },
        });
        
        // Extract individual responses
        if (batchResponse.data && Array.isArray(batchResponse.data)) {
          results.push(...batchResponse.data.map(data => ({
            ...batchResponse,
            data
          })));
        }
      }
    }

    return results;
  }

  // Streaming for large datasets
  async stream<T>(url: string, config?: AxiosRequestConfig): Promise<ReadableStream<T>> {
    const response = await this.instance.request({
      ...config,
      url,
      responseType: 'stream',
    });

    return new ReadableStream({
      start(controller) {
        response.data.on('data', (chunk: any) => {
          try {
            const parsedChunk = JSON.parse(chunk.toString());
            controller.enqueue(parsedChunk);
          } catch (error) {
            controller.error(error);
          }
        });

        response.data.on('end', () => {
          controller.close();
        });

        response.data.on('error', (error: any) => {
          controller.error(error);
        });
      }
    });
  }

  // Background synchronization
  async sync(): Promise<void> {
    const offlineRequests = await this.cacheManager.getOfflineQueue();
    
    for (const request of offlineRequests) {
      try {
        await this.request(request);
        await this.cacheManager.removeFromOfflineQueue(request.id);
      } catch (error) {
        this.logger?.error('Sync failed for request', { requestId: request.id, error });
      }
    }
  }

  // Multi-tenant support
  switchTenant(tenantId: string): void {
    this.config.tenantId = tenantId;
    this.instance.defaults.headers['X-Tenant-ID'] = tenantId;
  }

  // API versioning
  setApiVersion(version: string): void {
    this.config.apiVersion = version;
    this.instance.defaults.headers['X-API-Version'] = version;
  }

  /**
   * Private Helper Methods
   */

  private async request<T>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.instance.request<T>(config);
    return response as ApiResponse<T>;
  }

  private transformResponse<T>(response: AxiosResponse<T>, duration: number): ApiResponse<T> {
    return {
      data: response.data,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers as Record<string, string>,
      metadata: {
        requestId: response.config.metadata?.requestId || 'unknown',
        duration,
        cached: false,
        retryCount: response.config.metadata?.retryCount || 0,
        circuitBreakerState: this.circuitBreaker.getState(response.config.url || ''),
        serverTimestamp: response.headers['x-server-timestamp'] || new Date().toISOString(),
      },
    };
  }

  private createCachedResponse<T>(data: T, url: string): ApiResponse<T> {
    return {
      data,
      status: 200,
      statusText: 'OK',
      headers: {},
      metadata: {
        requestId: this.generateRequestId(),
        duration: 0,
        cached: true,
        retryCount: 0,
        circuitBreakerState: 'closed',
        serverTimestamp: new Date().toISOString(),
      },
    };
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCacheKey(config: AxiosRequestConfig): string {
    const { method, url, params, data } = config;
    const key = `${method}:${url}:${JSON.stringify(params)}:${JSON.stringify(data)}`;
    return btoa(key).replace(/[^a-zA-Z0-9]/g, '');
  }

  private detectPlatform(): string {
    if (typeof window === 'undefined') return 'server';
    
    const userAgent = navigator.userAgent.toLowerCase();
    if (/mobile|android|iphone|ipad|ipod|blackberry|windows phone/.test(userAgent)) {
      return 'mobile';
    }
    return 'desktop';
  }

  private detectRequestSource(): 'web' | 'mobile' | 'api' {
    // This could be enhanced with more sophisticated detection
    return 'web';
  }

  private determinePriority(config: AxiosRequestConfig): 'low' | 'normal' | 'high' | 'critical' {
    // Determine request priority based on URL patterns
    const url = config.url || '';
    
    if (url.includes('/auth/') || url.includes('/critical/')) return 'critical';
    if (url.includes('/real-time/') || url.includes('/notifications/')) return 'high';
    if (url.includes('/analytics/') || url.includes('/reports/')) return 'low';
    
    return 'normal';
  }

  private isIdempotentRequest(config: InternalAxiosRequestConfig): boolean {
    const method = config.method?.toUpperCase();
    return method === 'GET' || method === 'HEAD' || method === 'OPTIONS';
  }

  private shouldCompress(config: InternalAxiosRequestConfig): boolean {
    if (!config.data) return false;
    
    const dataSize = JSON.stringify(config.data).length;
    return dataSize > 1024; // Compress if data > 1KB
  }

  private shouldCache(response: AxiosResponse): boolean {
    const method = response.config.method?.toUpperCase();
    const url = response.config.url || '';
    
    // Cache GET requests for certain endpoints
    if (method !== 'GET') return false;
    if (response.status !== 200) return false;
    if (url.includes('/real-time/')) return false;
    
    return true;
  }

  private shouldRetry(error: AxiosError): boolean {
    if (!error.config) return false;
    
    const status = error.response?.status;
    const retryableStatusCodes = this.config.retryConfig.retryableStatusCodes;
    
    return retryableStatusCodes.includes(status || 0) || 
           error.code === 'NETWORK_ERROR' ||
           error.code === 'TIMEOUT';
  }

  private getCacheTTL(config: AxiosRequestConfig): number {
    const url = config.url || '';
    
    // Different TTL for different endpoints
    if (url.includes('/static/') || url.includes('/categories/')) return 3600000; // 1 hour
    if (url.includes('/search/')) return 300000; // 5 minutes
    if (url.includes('/properties/') || url.includes('/pois/')) return 600000; // 10 minutes
    
    return this.config.cacheConfig.defaultTTL;
  }

  private isCompressed(response: AxiosResponse): boolean {
    return response.headers['content-encoding'] === 'gzip' ||
           response.headers['content-encoding'] === 'br' ||
           response.headers['x-compressed'] === 'true';
  }

  private async resolveServiceUrl(url: string): Promise<string> {
    // Simple service discovery - could be enhanced with actual service registry
    for (const [pattern, serviceUrl] of this.serviceDiscovery) {
      if (url.startsWith(pattern)) {
        return serviceUrl;
      }
    }
    
    return this.config.baseURL;
  }

  private groupRequestsByService(requests: AxiosRequestConfig[]): Map<string, AxiosRequestConfig[]> {
    const grouped = new Map<string, AxiosRequestConfig[]>();
    
    requests.forEach(request => {
      const service = this.extractServiceFromUrl(request.url || '');
      const existing = grouped.get(service) || [];
      existing.push(request);
      grouped.set(service, existing);
    });
    
    return grouped;
  }

  private extractServiceFromUrl(url: string): string {
    const parts = url.split('/').filter(Boolean);
    return parts[0] || 'default';
  }

  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };
    if (sanitized.Authorization) {
      sanitized.Authorization = 'Bearer ***';
    }
    return sanitized;
  }

  private sanitizeData(data: any): any {
    if (!data) return data;
    
    const sanitized = { ...data };
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
    
    Object.keys(sanitized).forEach(key => {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        sanitized[key] = '***';
      }
    });
    
    return sanitized;
  }

  /**
   * Public API for configuration and management
   */

  getConfig(): ApiClientConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<ApiClientConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  getMetrics(): any {
    return this.metrics?.getMetrics() || {};
  }

  clearCache(): Promise<void> {
    return this.cacheManager.clear();
  }

  async healthCheck(): Promise<{ status: string; services: Record<string, boolean> }> {
    const services: Record<string, boolean> = {};
    
    for (const [service, url] of this.serviceDiscovery) {
      try {
        await this.get(`${service}health`);
        services[service] = true;
      } catch {
        services[service] = false;
      }
    }
    
    const allHealthy = Object.values(services).every(Boolean);
    
    return {
      status: allHealthy ? 'healthy' : 'degraded',
      services
    };
  }

  destroy(): void {
    // Cleanup resources
    this.authManager?.destroy();
    this.circuitBreaker?.destroy();
    this.cacheManager?.destroy();
    this.metrics?.destroy();
    this.logger?.destroy();
  }
}

// Export singleton instance factory
export const createApiClient = (config: ApiClientConfig): ApiClient => {
  return new ApiClient(config);
};

// Default configuration
export const defaultConfig: ApiClientConfig = {
  baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api/v1',
  timeout: 30000,
  retryConfig: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    retryableStatusCodes: [408, 429, 502, 503, 504],
    retryableErrors: ['NETWORK_ERROR', 'TIMEOUT', 'CONNECTION_REFUSED']
  },
  circuitBreakerConfig: {
    failureThreshold: 5,
    recoveryTimeout: 30000,
    monitoringPeriod: 10000,
    expectedFailureRate: 0.1
  },
  cacheConfig: {
    defaultTTL: 300000, // 5 minutes
    maxSize: 100,
    enableCompression: true,
    persistentStorage: true
  },
  authConfig: {
    tokenRefreshThreshold: 300, // 5 minutes
    maxConcurrentRefreshes: 1,
    enableBiometric: true,
    enableWebAuthn: true,
    sessionTimeoutWarning: 300 // 5 minutes
  },
  enableMetrics: true,
  enableLogging: true,
  environment: (process.env.NODE_ENV as any) || 'development',
  enableCompression: true,
  enableDeduplication: true,
  enableBatching: true,
  apiVersion: 'v1'
};