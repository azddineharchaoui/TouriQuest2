import { ApiClient } from './client';
import { ApiResponse, PaginatedResponse, SearchFilters } from '../types/common';

/**
 * Base service class that provides common functionality for all API services
 */
export abstract class BaseService {
  protected client: ApiClient;
  protected baseEndpoint: string;

  constructor(client: ApiClient, baseEndpoint: string) {
    this.client = client;
    this.baseEndpoint = baseEndpoint;
  }

  /**
   * Build URL with base endpoint
   */
  protected buildUrl(path: string = ''): string {
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    const cleanEndpoint = this.baseEndpoint.endsWith('/') 
      ? this.baseEndpoint.slice(0, -1) 
      : this.baseEndpoint;
    
    return cleanPath ? `${cleanEndpoint}/${cleanPath}` : cleanEndpoint;
  }

  /**
   * Build query string from parameters
   */
  protected buildQueryString(params: Record<string, any>): string {
    const filteredParams = Object.entries(params)
      .filter(([_, value]) => value !== null && value !== undefined && value !== '')
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return value.map(v => `${encodeURIComponent(key)}=${encodeURIComponent(v)}`).join('&');
        }
        return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
      });

    return filteredParams.length > 0 ? `?${filteredParams.join('&')}` : '';
  }

  /**
   * Build search URL with filters
   */
  protected buildSearchUrl(filters: SearchFilters): string {
    const queryString = this.buildQueryString(filters);
    return this.buildUrl(`search${queryString}`);
  }

  /**
   * Generic search method
   */
  protected async search<T>(
    filters: SearchFilters,
    endpoint: string = 'search'
  ): Promise<ApiResponse<PaginatedResponse<T>>> {
    const queryString = this.buildQueryString(filters);
    return this.client.get<PaginatedResponse<T>>(this.buildUrl(`${endpoint}${queryString}`));
  }

  /**
   * Generic get by ID method
   */
  protected async getById<T>(id: string, path?: string): Promise<ApiResponse<T>> {
    const url = path ? this.buildUrl(`${id}/${path}`) : this.buildUrl(id);
    return this.client.get<T>(url);
  }

  /**
   * Generic create method
   */
  protected async create<T, U = any>(data: U, path?: string): Promise<ApiResponse<T>> {
    const url = path ? this.buildUrl(path) : this.buildUrl();
    return this.client.post<T>(url, data);
  }

  /**
   * Generic update method
   */
  protected async update<T, U = any>(id: string, data: U, path?: string): Promise<ApiResponse<T>> {
    const url = path ? this.buildUrl(`${id}/${path}`) : this.buildUrl(id);
    return this.client.put<T>(url, data);
  }

  /**
   * Generic delete method
   */
  protected async delete<T = any>(id: string, path?: string): Promise<ApiResponse<T>> {
    const url = path ? this.buildUrl(`${id}/${path}`) : this.buildUrl(id);
    return this.client.delete<T>(url);
  }

  /**
   * Generic list method
   */
  protected async list<T>(
    params: Record<string, any> = {},
    path?: string
  ): Promise<ApiResponse<PaginatedResponse<T>>> {
    const queryString = this.buildQueryString(params);
    const url = path ? this.buildUrl(`${path}${queryString}`) : this.buildUrl(queryString);
    return this.client.get<PaginatedResponse<T>>(url);
  }

  /**
   * Generic toggle favorite method
   */
  protected async toggleFavorite<T = any>(id: string, isFavorite: boolean): Promise<ApiResponse<T>> {
    const method = isFavorite ? 'delete' : 'post';
    const url = this.buildUrl(`${id}/favorite`);
    return this.client[method]<T>(url);
  }

  /**
   * Generic upload method
   */
  protected async upload<T = any>(
    id: string,
    file: File | File[],
    path: string = 'photos'
  ): Promise<ApiResponse<T>> {
    const url = this.buildUrl(`${id}/${path}`);
    
    if (Array.isArray(file)) {
      return this.client.uploadMultiple<T>(url, file);
    } else {
      return this.client.upload<T>(url, file);
    }
  }

  /**
   * Generic download method
   */
  protected async download(id: string, path: string): Promise<Blob> {
    const url = this.buildUrl(`${id}/${path}`);
    return this.client.download(url);
  }

  /**
   * Handle API errors with service context
   */
  protected handleError(error: any, context?: string): never {
    const apiError = this.client.handleError(error);
    
    // Add service context to error
    if (context) {
      apiError.details = {
        ...apiError.details,
        service: this.baseEndpoint,
        context,
      };
    }

    throw apiError;
  }

  /**
   * Validate required parameters
   */
  protected validateRequired(params: Record<string, any>, requiredFields: string[]): void {
    const missingFields = requiredFields.filter(field => 
      params[field] === null || params[field] === undefined || params[field] === ''
    );

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
  }

  /**
   * Transform data before sending to API
   */
  protected transformRequest<T>(data: T): T {
    // Override in subclasses for specific transformations
    return data;
  }

  /**
   * Transform data received from API
   */
  protected transformResponse<T>(data: T): T {
    // Override in subclasses for specific transformations
    return data;
  }

  /**
   * Check if user has permission for action
   */
  protected checkPermission(requiredPermission: string): boolean {
    // TODO: Implement permission checking logic
    // This would typically check user roles/permissions from auth state
    return true;
  }

  /**
   * Rate limiting helper
   */
  protected async rateLimit(key: string, limit: number, window: number): Promise<boolean> {
    // TODO: Implement client-side rate limiting
    // This would track request counts per endpoint/user
    return true;
  }

  /**
   * Cache helper methods
   */
  protected getCacheKey(method: string, url: string, params?: any): string {
    const paramString = params ? JSON.stringify(params) : '';
    return `${this.baseEndpoint}:${method}:${url}:${paramString}`;
  }

  protected async getFromCache<T>(key: string): Promise<T | null> {
    try {
      const cached = localStorage.getItem(key);
      if (cached) {
        const { data, timestamp, ttl } = JSON.parse(cached);
        if (Date.now() - timestamp < ttl) {
          return data;
        }
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.warn('Cache read error:', error);
    }
    return null;
  }

  protected async setCache<T>(key: string, data: T, ttl: number = 300000): Promise<void> {
    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
        ttl,
      };
      localStorage.setItem(key, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Cache write error:', error);
    }
  }

  protected clearCache(pattern?: string): void {
    try {
      if (pattern) {
        const keys = Object.keys(localStorage).filter(key => key.includes(pattern));
        keys.forEach(key => localStorage.removeItem(key));
      } else {
        // Clear all cache for this service
        const keys = Object.keys(localStorage).filter(key => key.startsWith(this.baseEndpoint));
        keys.forEach(key => localStorage.removeItem(key));
      }
    } catch (error) {
      console.warn('Cache clear error:', error);
    }
  }
}