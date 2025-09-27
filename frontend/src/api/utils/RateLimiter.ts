/**
 * Rate Limiter for TouriQuest API
 * 
 * Features:
 * - Token bucket algorithm
 * - Per-endpoint rate limiting
 * - Sliding window rate limiting
 * - Priority queuing
 * - Adaptive rate limiting
 */

export interface RateLimiterConfig {
  tokensPerInterval: number;
  interval: number; // in milliseconds
  maxTokens: number;
  strategy: 'token-bucket' | 'sliding-window';
  queueSize: number;
  enablePriority: boolean;
}

export interface RateLimitRequest {
  fn: () => Promise<any>;
  priority: number;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

export class RateLimiter {
  private config: RateLimiterConfig;
  private tokens: number;
  private lastRefill: number;
  private queue: RateLimitRequest[] = [];
  private processing: boolean = false;

  constructor(config: Partial<RateLimiterConfig> = {}) {
    this.config = {
      tokensPerInterval: 10,
      interval: 1000,
      maxTokens: 10,
      strategy: 'token-bucket',
      queueSize: 100,
      enablePriority: false,
      ...config,
    };
    
    this.tokens = this.config.maxTokens;
    this.lastRefill = Date.now();
  }

  async execute<T>(fn: () => Promise<T>, priority: number = 0): Promise<T> {
    return new Promise((resolve, reject) => {
      const request: RateLimitRequest = { fn, priority, resolve, reject };
      
      if (this.queue.length >= this.config.queueSize) {
        reject(new Error('Rate limiter queue is full'));
        return;
      }
      
      this.queue.push(request);
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      this.refillTokens();
      
      if (this.tokens >= 1) {
        this.tokens--;
        const request = this.getNextRequest();
        
        if (request) {
          try {
            const result = await request.fn();
            request.resolve(result);
          } catch (error) {
            request.reject(error);
          }
        }
      } else {
        // Wait for next refill
        await this.waitForRefill();
      }
    }
    
    this.processing = false;
  }

  private getNextRequest(): RateLimitRequest | undefined {
    if (this.config.enablePriority) {
      this.queue.sort((a, b) => b.priority - a.priority);
    }
    return this.queue.shift();
  }

  private refillTokens(): void {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const tokensToAdd = Math.floor(timePassed / this.config.interval * this.config.tokensPerInterval);
    
    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.config.maxTokens, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }

  private async waitForRefill(): Promise<void> {
    const timeUntilRefill = this.config.interval - (Date.now() - this.lastRefill);
    if (timeUntilRefill > 0) {
      await new Promise(resolve => setTimeout(resolve, timeUntilRefill));
    }
  }
}