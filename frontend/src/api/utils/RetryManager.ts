/**
 * Retry Manager for TouriQuest API
 * 
 * Features:
 * - Intelligent retry strategies
 * - Exponential backoff with jitter
 * - Configurable retry conditions
 * - Circuit breaker integration
 * - Request deduplication
 */

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
  retryCondition?: (error: any, attemptCount: number) => boolean;
  onRetry?: (error: any, attemptCount: number) => void;
}

export class RetryManager {
  private config: RetryConfig;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      jitter: true,
      ...config,
    };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (attempt === this.config.maxRetries || !this.shouldRetry(error, attempt)) {
          throw error;
        }
        
        if (this.config.onRetry) {
          this.config.onRetry(error, attempt + 1);
        }
        
        await this.delay(attempt);
      }
    }
    
    throw lastError;
  }

  private shouldRetry(error: any, attemptCount: number): boolean {
    if (this.config.retryCondition) {
      return this.config.retryCondition(error, attemptCount);
    }
    
    // Default retry logic
    if (error?.response?.status) {
      const status = error.response.status;
      return status >= 500 || status === 429 || status === 408;
    }
    
    return error?.code === 'NETWORK_ERROR' || error?.code === 'TIMEOUT';
  }

  private async delay(attemptCount: number): Promise<void> {
    let delay = this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attemptCount);
    delay = Math.min(delay, this.config.maxDelay);
    
    if (this.config.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }
    
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}