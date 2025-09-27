/**
 * TouriQuest API Client - Main Entry Point
 * 
 * Enterprise-grade API client with smart gateway, authentication,
 * error handling, performance optimization, and developer experience
 */

// Core API Client
export { 
  ApiClient, 
  createApiClient, 
  defaultConfig
} from './core/ApiClient';

// Service Factory
export { 
  ServiceFactory,
  createServiceFactory, 
  getServiceFactory,
  destroyServiceFactory,
  developmentConfig,
  productionConfig
} from './ServiceFactory';

// All Services
export * from './services';

// Core Components
export { AuthManager } from './core/AuthManager';
export { CircuitBreaker } from './core/CircuitBreaker';
export { RequestDeduplicator } from './core/RequestDeduplicator';
export { CacheManager } from './core/CacheManager';
export { ErrorHandler } from './core/ErrorHandler';
export { RetryManager } from './core/RetryManager';
export { RateLimiter } from './core/RateLimiter';
export { CompressionManager } from './core/CompressionManager';

// Utilities
export { Logger } from './utils/Logger';
export { Metrics } from './utils/Metrics';

// Quick start factory function
export const createTouriQuestAPI = (config?: any) => {
  return createServiceFactory(config);
};

// Default export for convenience
export default ServiceFactory;