// Main API client exports
import { ApiClient } from './client';
import { BaseService } from './base';
import {
  AuthService,
  PropertyService,
  POIService,
  ExperienceService,
} from './services';

/**
 * API Client Factory
 * Creates a complete API client with all services
 */
export class TouriQuestAPI {
  public auth: AuthService;
  public properties: PropertyService;
  public pois: POIService;
  public experiences: ExperienceService;

  private client: ApiClient;

  constructor(options?: {
    baseURL?: string;
    timeout?: number;
    enableLogging?: boolean;
  }) {
    // Initialize the HTTP client
    this.client = new ApiClient(options);

    // Initialize all services
    this.auth = new AuthService(this.client);
    this.properties = new PropertyService(this.client);
    this.pois = new POIService(this.client);
    this.experiences = new ExperienceService(this.client);
  }

  /**
   * Get the underlying HTTP client
   */
  getClient(): ApiClient {
    return this.client;
  }

  /**
   * Set authentication tokens
   */
  setAuthTokens(accessToken: string, refreshToken?: string): void {
    this.client.setAuthTokens(accessToken, refreshToken);
  }

  /**
   * Clear authentication tokens
   */
  clearAuthTokens(): void {
    this.client.clearAuthTokens();
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.client.isAuthenticated();
  }

  /**
   * Get current user from localStorage
   */
  getCurrentUser(): any | null {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  }

  /**
   * Clear all cached data (Note: clearCache is protected, so we'll implement differently)
   */
  clearAllCache(): void {
    // Clear browser cache for this domain
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
        });
      });
    }
    
    // Clear localStorage cache items
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('api_cache_')) {
        localStorage.removeItem(key);
      }
    });
  }
}

// Create and export a default instance
const defaultAPI = new TouriQuestAPI();

export default defaultAPI;

// Named exports
export { ApiClient, BaseService };
export {
  AuthService,
  PropertyService,
  POIService,
  ExperienceService,
} from './services';

// Re-export all types from type definitions
export type * from '../types/auth';
export type * from '../types/property';
export type * from '../types/poi';
export type * from '../types/experience';
export type * from '../types/common';