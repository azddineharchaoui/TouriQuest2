/**
 * Circuit Breaker Pattern Implementation for TouriQuest API
 * 
 * Features:
 * - Automatic failure detection and recovery
 * - Configurable failure thresholds and timeouts
 * - Half-open state for gradual recovery
 * - Service-specific circuit breakers
 * - Real-time monitoring and metrics
 */

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
  volumeThreshold: number;
  errorThresholdPercentage: number;
  halfOpenMaxCalls: number;
}

export interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  successCount: number;
  totalCalls: number;
  lastFailureTime: number;
  nextAttemptTime: number;
  halfOpenCalls: number;
}

export interface CircuitBreakerMetrics {
  serviceName: string;
  state: string;
  failureRate: number;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  averageResponseTime: number;
  lastStateChange: number;
}

export class CircuitBreakerError extends Error {
  constructor(
    message: string,
    public serviceName: string,
    public state: string,
    public nextAttemptTime: number
  ) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

export class CircuitBreaker {
  private config: CircuitBreakerConfig;
  private state: CircuitBreakerState;
  private serviceName: string;
  private responseTimeBuffer: number[] = [];
  private stateChangeListeners: Array<(state: CircuitBreakerState) => void> = [];

  constructor(serviceName: string, config: Partial<CircuitBreakerConfig> = {}) {
    this.serviceName = serviceName;
    this.config = {
      failureThreshold: 5,
      resetTimeout: 60000, // 60 seconds
      monitoringPeriod: 300000, // 5 minutes
      volumeThreshold: 10,
      errorThresholdPercentage: 50,
      halfOpenMaxCalls: 3,
      ...config,
    };

    this.state = {
      state: 'CLOSED',
      failureCount: 0,
      successCount: 0,
      totalCalls: 0,
      lastFailureTime: 0,
      nextAttemptTime: 0,
      halfOpenCalls: 0,
    };

    this.startPeriodicReset();
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.canExecute()) {
      throw new CircuitBreakerError(
        `Circuit breaker is ${this.state.state} for service ${this.serviceName}`,
        this.serviceName,
        this.state.state,
        this.state.nextAttemptTime
      );
    }

    const startTime = Date.now();

    try {
      this.onCallAttempt();
      const result = await fn();
      const responseTime = Date.now() - startTime;
      
      this.onSuccess(responseTime);
      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.onFailure(responseTime);
      throw error;
    }
  }

  /**
   * Check if circuit breaker allows execution
   */
  private canExecute(): boolean {
    const now = Date.now();

    switch (this.state.state) {
      case 'CLOSED':
        return true;

      case 'OPEN':
        if (now >= this.state.nextAttemptTime) {
          this.transitionToHalfOpen();
          return true;
        }
        return false;

      case 'HALF_OPEN':
        return this.state.halfOpenCalls < this.config.halfOpenMaxCalls;

      default:
        return false;
    }
  }

  /**
   * Handle call attempt
   */
  private onCallAttempt(): void {
    this.state.totalCalls++;
    
    if (this.state.state === 'HALF_OPEN') {
      this.state.halfOpenCalls++;
    }
  }

  /**
   * Handle successful call
   */
  private onSuccess(responseTime: number): void {
    this.state.successCount++;
    this.recordResponseTime(responseTime);

    if (this.state.state === 'HALF_OPEN') {
      // Check if we should transition back to closed
      if (this.state.halfOpenCalls >= this.config.halfOpenMaxCalls) {
        this.transitionToClosed();
      }
    }

    // Reset failure count on success in any state
    this.state.failureCount = 0;
  }

  /**
   * Handle failed call
   */
  private onFailure(responseTime: number): void {
    this.state.failureCount++;
    this.state.lastFailureTime = Date.now();
    this.recordResponseTime(responseTime);

    if (this.state.state === 'HALF_OPEN') {
      // Any failure in half-open immediately goes back to open
      this.transitionToOpen();
    } else if (this.state.state === 'CLOSED') {
      // Check if we should transition to open
      if (this.shouldTransitionToOpen()) {
        this.transitionToOpen();
      }
    }
  }

  /**
   * Record response time for metrics
   */
  private recordResponseTime(responseTime: number): void {
    this.responseTimeBuffer.push(responseTime);
    
    // Keep only recent measurements (last 100)
    if (this.responseTimeBuffer.length > 100) {
      this.responseTimeBuffer.shift();
    }
  }

  /**
   * Check if circuit breaker should transition to open state
   */
  private shouldTransitionToOpen(): boolean {
    // Check failure threshold
    if (this.state.failureCount >= this.config.failureThreshold) {
      return true;
    }

    // Check failure percentage
    if (this.state.totalCalls >= this.config.volumeThreshold) {
      const failureRate = (this.state.failureCount / this.state.totalCalls) * 100;
      return failureRate >= this.config.errorThresholdPercentage;
    }

    return false;
  }

  /**
   * State transition methods
   */
  private transitionToOpen(): void {
    this.state.state = 'OPEN';
    this.state.nextAttemptTime = Date.now() + this.config.resetTimeout;
    this.state.halfOpenCalls = 0;
    
    this.notifyStateChange();
    this.logStateChange('OPEN', `Failure threshold exceeded (${this.state.failureCount} failures)`);
  }

  private transitionToHalfOpen(): void {
    this.state.state = 'HALF_OPEN';
    this.state.halfOpenCalls = 0;
    
    this.notifyStateChange();
    this.logStateChange('HALF_OPEN', 'Attempting recovery');
  }

  private transitionToClosed(): void {
    this.state.state = 'CLOSED';
    this.state.failureCount = 0;
    this.state.halfOpenCalls = 0;
    this.state.nextAttemptTime = 0;
    
    this.notifyStateChange();
    this.logStateChange('CLOSED', 'Service recovered successfully');
  }

  /**
   * Periodic reset of counters
   */
  private startPeriodicReset(): void {
    setInterval(() => {
      this.resetCounters();
    }, this.config.monitoringPeriod);
  }

  private resetCounters(): void {
    // Reset counters but preserve state
    this.state.totalCalls = 0;
    this.state.successCount = 0;
    
    // Only reset failure count if in closed state
    if (this.state.state === 'CLOSED') {
      this.state.failureCount = 0;
    }
    
    this.responseTimeBuffer = [];
  }

  /**
   * State change notifications
   */
  private notifyStateChange(): void {
    this.stateChangeListeners.forEach(listener => {
      try {
        listener({ ...this.state });
      } catch (error) {
        console.error('Error in circuit breaker state change listener:', error);
      }
    });
  }

  private logStateChange(newState: string, reason: string): void {
    console.warn(`Circuit breaker for ${this.serviceName} transitioned to ${newState}: ${reason}`);
    
    // Emit custom event for monitoring
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('circuitBreakerStateChange', {
        detail: {
          serviceName: this.serviceName,
          state: newState,
          reason,
          metrics: this.getMetrics(),
        },
      }));
    }
  }

  /**
   * Public API methods
   */

  /**
   * Get current metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    const failureRate = this.state.totalCalls > 0 
      ? (this.state.failureCount / this.state.totalCalls) * 100 
      : 0;

    const averageResponseTime = this.responseTimeBuffer.length > 0
      ? this.responseTimeBuffer.reduce((sum, time) => sum + time, 0) / this.responseTimeBuffer.length
      : 0;

    return {
      serviceName: this.serviceName,
      state: this.state.state,
      failureRate,
      totalCalls: this.state.totalCalls,
      successfulCalls: this.state.successCount,
      failedCalls: this.state.failureCount,
      averageResponseTime,
      lastStateChange: this.state.lastFailureTime,
    };
  }

  /**
   * Get current state
   */
  getState(): CircuitBreakerState {
    return { ...this.state };
  }

  /**
   * Check if circuit breaker is healthy
   */
  isHealthy(): boolean {
    return this.state.state === 'CLOSED';
  }

  /**
   * Force state change (for testing/manual intervention)
   */
  forceState(newState: 'CLOSED' | 'OPEN' | 'HALF_OPEN'): void {
    switch (newState) {
      case 'CLOSED':
        this.transitionToClosed();
        break;
      case 'OPEN':
        this.transitionToOpen();
        break;
      case 'HALF_OPEN':
        this.transitionToHalfOpen();
        break;
    }
  }

  /**
   * Add state change listener
   */
  onStateChange(listener: (state: CircuitBreakerState) => void): () => void {
    this.stateChangeListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.stateChangeListeners.indexOf(listener);
      if (index !== -1) {
        this.stateChangeListeners.splice(index, 1);
      }
    };
  }

  /**
   * Reset circuit breaker to initial state
   */
  reset(): void {
    this.state = {
      state: 'CLOSED',
      failureCount: 0,
      successCount: 0,
      totalCalls: 0,
      lastFailureTime: 0,
      nextAttemptTime: 0,
      halfOpenCalls: 0,
    };
    
    this.responseTimeBuffer = [];
    this.notifyStateChange();
  }

  /**
   * Get time until next attempt (for OPEN state)
   */
  getTimeUntilNextAttempt(): number {
    if (this.state.state !== 'OPEN') {
      return 0;
    }
    
    return Math.max(0, this.state.nextAttemptTime - Date.now());
  }

  /**
   * Get health status summary
   */
  getHealthSummary(): {
    healthy: boolean;
    state: string;
    uptime: number;
    errorRate: number;
    averageResponseTime: number;
  } {
    const metrics = this.getMetrics();
    
    return {
      healthy: this.isHealthy(),
      state: this.state.state,
      uptime: this.state.state === 'CLOSED' ? 100 : 0,
      errorRate: metrics.failureRate,
      averageResponseTime: metrics.averageResponseTime,
    };
  }
}

/**
 * Circuit Breaker Manager for multiple services
 */
export class CircuitBreakerManager {
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private defaultConfig: CircuitBreakerConfig;

  constructor(defaultConfig: Partial<CircuitBreakerConfig> = {}) {
    this.defaultConfig = {
      failureThreshold: 5,
      resetTimeout: 60000,
      monitoringPeriod: 300000,
      volumeThreshold: 10,
      errorThresholdPercentage: 50,
      halfOpenMaxCalls: 3,
      ...defaultConfig,
    };
  }

  /**
   * Get or create circuit breaker for service
   */
  getCircuitBreaker(serviceName: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.circuitBreakers.has(serviceName)) {
      const mergedConfig = { ...this.defaultConfig, ...config };
      this.circuitBreakers.set(serviceName, new CircuitBreaker(serviceName, mergedConfig));
    }
    
    return this.circuitBreakers.get(serviceName)!;
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(serviceName: string, fn: () => Promise<T>, config?: Partial<CircuitBreakerConfig>): Promise<T> {
    const circuitBreaker = this.getCircuitBreaker(serviceName, config);
    return circuitBreaker.execute(fn);
  }

  /**
   * Get all circuit breaker metrics
   */
  getAllMetrics(): CircuitBreakerMetrics[] {
    return Array.from(this.circuitBreakers.values()).map(cb => cb.getMetrics());
  }

  /**
   * Get health summary for all services
   */
  getHealthSummary(): Record<string, any> {
    const summary: Record<string, any> = {};
    
    for (const [serviceName, circuitBreaker] of this.circuitBreakers) {
      summary[serviceName] = circuitBreaker.getHealthSummary();
    }
    
    return summary;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    this.circuitBreakers.forEach(cb => cb.reset());
  }

  /**
   * Remove circuit breaker for service
   */
  removeCircuitBreaker(serviceName: string): boolean {
    return this.circuitBreakers.delete(serviceName);
  }

  /**
   * Get service names with unhealthy circuit breakers
   */
  getUnhealthyServices(): string[] {
    const unhealthy: string[] = [];
    
    for (const [serviceName, circuitBreaker] of this.circuitBreakers) {
      if (!circuitBreaker.isHealthy()) {
        unhealthy.push(serviceName);
      }
    }
    
    return unhealthy;
  }
}