/**
 * Advanced Error Handler for TouriQuest API
 * 
 * Features:
 * - Contextual error recovery strategies
 * - Intelligent retry logic with exponential backoff
 * - Error categorization and user-friendly messages
 * - Error tracking and analytics
 * - Network-aware error handling
 * - Graceful degradation patterns
 */

import { AxiosError, AxiosResponse } from 'axios';

export interface ErrorContext {
  url: string;
  method: string;
  requestId: string;
  timestamp: number;
  userAgent: string;
  userId?: string;
  sessionId?: string;
  tenantId?: string;
  apiVersion: string;
  retryCount: number;
  stackTrace?: string;
  customData?: Record<string, any>;
}

export interface ErrorRecoveryStrategy {
  type: 'retry' | 'fallback' | 'cache' | 'offline' | 'redirect' | 'ignore';
  config?: {
    maxRetries?: number;
    backoffMultiplier?: number;
    fallbackUrl?: string;
    cacheKey?: string;
    redirectUrl?: string;
    delay?: number;
  };
}

export interface ErrorHandlerConfig {
  enableTracking: boolean;
  enableRecovery: boolean;
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  trackingEndpoint?: string;
  userFriendlyMessages: boolean;
  enableOfflineMode: boolean;
  enableErrorBoundary: boolean;
}

export interface ProcessedError {
  code: string;
  message: string;
  userMessage: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  recoverable: boolean;
  retryable: boolean;
  context: ErrorContext;
  recoveryStrategy?: ErrorRecoveryStrategy;
  originalError: Error;
}

export enum ErrorCategory {
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  SERVER = 'server',
  CLIENT = 'client',
  TIMEOUT = 'timeout',
  RATE_LIMIT = 'rate_limit',
  MAINTENANCE = 'maintenance',
  UNKNOWN = 'unknown'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export class ErrorHandler {
  private config: ErrorHandlerConfig;
  private errorCounts: Map<string, number> = new Map();
  private errorHistory: ProcessedError[] = [];
  private recoveryStrategies: Map<string, ErrorRecoveryStrategy> = new Map();
  private userMessages: Map<string, string> = new Map();

  constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = {
      enableTracking: true,
      enableRecovery: true,
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      userFriendlyMessages: true,
      enableOfflineMode: true,
      enableErrorBoundary: true,
      ...config,
    };

    this.initializeUserMessages();
    this.initializeRecoveryStrategies();
  }

  /**
   * Process and handle errors
   */
  async handleError(error: Error | AxiosError, context: Partial<ErrorContext>): Promise<ProcessedError> {
    const processedError = this.processError(error, context);
    
    // Track error if enabled
    if (this.config.enableTracking) {
      this.trackError(processedError);
    }

    // Apply recovery strategy if enabled
    if (this.config.enableRecovery && processedError.recoverable) {
      processedError.recoveryStrategy = this.determineRecoveryStrategy(processedError);
    }

    // Store in history
    this.addToHistory(processedError);

    return processedError;
  }

  /**
   * Process raw error into structured format
   */
  private processError(error: Error | AxiosError, context: Partial<ErrorContext>): ProcessedError {
    const fullContext = this.buildContext(error, context);
    const category = this.categorizeError(error);
    const severity = this.determineSeverity(error, category);
    const code = this.extractErrorCode(error);
    const message = this.extractErrorMessage(error);
    const userMessage = this.getUserFriendlyMessage(code, category);

    return {
      code,
      message,
      userMessage,
      category,
      severity,
      recoverable: this.isRecoverable(error, category),
      retryable: this.isRetryable(error, category),
      context: fullContext,
      originalError: error,
    };
  }

  /**
   * Build comprehensive error context
   */
  private buildContext(error: Error | AxiosError, context: Partial<ErrorContext>): ErrorContext {
    const isAxiosError = this.isAxiosError(error);
    const url = isAxiosError ? error.config?.url || '' : context.url || '';
    const method = isAxiosError ? error.config?.method?.toUpperCase() || 'GET' : context.method || 'GET';

    return {
      url,
      method,
      requestId: context.requestId || this.generateRequestId(),
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      userId: context.userId,
      sessionId: context.sessionId,
      tenantId: context.tenantId,
      apiVersion: context.apiVersion || 'v1',
      retryCount: context.retryCount || 0,
      stackTrace: error.stack,
      customData: context.customData,
    };
  }

  /**
   * Categorize error based on type and response
   */
  private categorizeError(error: Error | AxiosError): ErrorCategory {
    if (this.isAxiosError(error)) {
      const status = error.response?.status;
      
      if (!status) {
        return ErrorCategory.NETWORK;
      }

      switch (true) {
        case status === 401:
          return ErrorCategory.AUTHENTICATION;
        case status === 403:
          return ErrorCategory.AUTHORIZATION;
        case status >= 400 && status < 500:
          return ErrorCategory.CLIENT;
        case status >= 500:
          return ErrorCategory.SERVER;
        case status === 429:
          return ErrorCategory.RATE_LIMIT;
        case status === 503:
          return ErrorCategory.MAINTENANCE;
        default:
          return ErrorCategory.UNKNOWN;
      }
    }

    if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
      return ErrorCategory.TIMEOUT;
    }

    if (error.message.includes('validation') || error.message.includes('invalid')) {
      return ErrorCategory.VALIDATION;
    }

    return ErrorCategory.UNKNOWN;
  }

  /**
   * Determine error severity
   */
  private determineSeverity(error: Error | AxiosError, category: ErrorCategory): ErrorSeverity {
    if (this.isAxiosError(error)) {
      const status = error.response?.status;
      
      switch (category) {
        case ErrorCategory.SERVER:
          return status === 500 ? ErrorSeverity.CRITICAL : ErrorSeverity.HIGH;
        case ErrorCategory.AUTHENTICATION:
        case ErrorCategory.AUTHORIZATION:
          return ErrorSeverity.HIGH;
        case ErrorCategory.RATE_LIMIT:
        case ErrorCategory.TIMEOUT:
          return ErrorSeverity.MEDIUM;
        case ErrorCategory.VALIDATION:
        case ErrorCategory.CLIENT:
          return ErrorSeverity.LOW;
        default:
          return ErrorSeverity.MEDIUM;
      }
    }

    return ErrorSeverity.MEDIUM;
  }

  /**
   * Extract error code
   */
  private extractErrorCode(error: Error | AxiosError): string {
    if (this.isAxiosError(error)) {
      const responseData = error.response?.data;
      
      if ((responseData as any)?.code) {
        return (responseData as any).code;
      }
      
      if ((responseData as any)?.error?.code) {
        return (responseData as any).error.code;
      }
      
      return `HTTP_${error.response?.status || 'UNKNOWN'}`;
    }

    return error.name || 'UNKNOWN_ERROR';
  }

  /**
   * Extract error message
   */
  private extractErrorMessage(error: Error | AxiosError): string {
    if (this.isAxiosError(error)) {
      const responseData = error.response?.data;
      
      if ((responseData as any)?.message) {
        return (responseData as any).message;
      }
      
      if ((responseData as any)?.error?.message) {
        return (responseData as any).error.message;
      }
      
      return error.message;
    }

    return error.message;
  }

  /**
   * Get user-friendly error message
   */
  private getUserFriendlyMessage(code: string, category: ErrorCategory): string {
    if (!this.config.userFriendlyMessages) {
      return code;
    }

    const customMessage = this.userMessages.get(code);
    if (customMessage) {
      return customMessage;
    }

    // Default messages by category
    switch (category) {
      case ErrorCategory.NETWORK:
        return 'Unable to connect to the server. Please check your internet connection.';
      case ErrorCategory.AUTHENTICATION:
        return 'Your session has expired. Please sign in again.';
      case ErrorCategory.AUTHORIZATION:
        return 'You do not have permission to perform this action.';
      case ErrorCategory.VALIDATION:
        return 'Please check your input and try again.';
      case ErrorCategory.SERVER:
        return 'We are experiencing technical difficulties. Please try again later.';
      case ErrorCategory.TIMEOUT:
        return 'The request is taking longer than expected. Please try again.';
      case ErrorCategory.RATE_LIMIT:
        return 'Too many requests. Please wait a moment before trying again.';
      case ErrorCategory.MAINTENANCE:
        return 'The service is temporarily unavailable for maintenance.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  /**
   * Determine if error is recoverable
   */
  private isRecoverable(error: Error | AxiosError, category: ErrorCategory): boolean {
    switch (category) {
      case ErrorCategory.NETWORK:
      case ErrorCategory.TIMEOUT:
      case ErrorCategory.RATE_LIMIT:
      case ErrorCategory.SERVER:
        return true;
      case ErrorCategory.AUTHENTICATION:
        return true; // Can try to refresh token
      case ErrorCategory.AUTHORIZATION:
      case ErrorCategory.VALIDATION:
      case ErrorCategory.CLIENT:
        return false;
      default:
        return false;
    }
  }

  /**
   * Determine if error is retryable
   */
  private isRetryable(error: Error | AxiosError, category: ErrorCategory): boolean {
    if (this.isAxiosError(error)) {
      const method = error.config?.method?.toUpperCase();
      
      // Only retry safe methods
      if (!['GET', 'HEAD', 'OPTIONS'].includes(method || '')) {
        return false;
      }
    }

    switch (category) {
      case ErrorCategory.NETWORK:
      case ErrorCategory.TIMEOUT:
      case ErrorCategory.SERVER:
        return true;
      case ErrorCategory.RATE_LIMIT:
        return true; // With delay
      default:
        return false;
    }
  }

  /**
   * Determine recovery strategy
   */
  private determineRecoveryStrategy(error: ProcessedError): ErrorRecoveryStrategy {
    const strategyKey = `${error.category}_${error.code}`;
    const customStrategy = this.recoveryStrategies.get(strategyKey);
    
    if (customStrategy) {
      return customStrategy;
    }

    // Default strategies by category
    switch (error.category) {
      case ErrorCategory.NETWORK:
      case ErrorCategory.TIMEOUT:
        return {
          type: 'retry',
          config: {
            maxRetries: this.config.maxRetries,
            backoffMultiplier: this.config.backoffMultiplier,
          },
        };
      
      case ErrorCategory.RATE_LIMIT:
        return {
          type: 'retry',
          config: {
            maxRetries: 2,
            delay: this.extractRetryAfter(error.originalError),
          },
        };
      
      case ErrorCategory.AUTHENTICATION:
        return {
          type: 'redirect',
          config: {
            redirectUrl: '/login',
          },
        };
      
      case ErrorCategory.SERVER:
        if (error.context.retryCount < this.config.maxRetries) {
          return {
            type: 'retry',
            config: {
              maxRetries: this.config.maxRetries,
              backoffMultiplier: this.config.backoffMultiplier,
            },
          };
        }
        return {
          type: 'fallback',
          config: {
            fallbackUrl: '/api/v1/fallback' + error.context.url,
          },
        };
      
      default:
        return { type: 'ignore' };
    }
  }

  /**
   * Extract retry-after header value
   */
  private extractRetryAfter(error: Error | AxiosError): number {
    if (this.isAxiosError(error)) {
      const retryAfter = error.response?.headers['retry-after'];
      if (retryAfter) {
        const seconds = parseInt(retryAfter, 10);
        return !isNaN(seconds) ? seconds * 1000 : this.config.baseDelay;
      }
    }
    return this.config.baseDelay;
  }

  /**
   * Track error for analytics
   */
  private trackError(error: ProcessedError): void {
    // Increment error count
    const key = `${error.category}_${error.code}`;
    const count = this.errorCounts.get(key) || 0;
    this.errorCounts.set(key, count + 1);

    // Send to tracking endpoint if configured
    if (this.config.trackingEndpoint) {
      this.sendErrorTracking(error);
    }

    // Emit event for local tracking
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('error:tracked', {
        detail: {
          error: {
            ...error,
            originalError: undefined, // Don't include original error in event
          },
        },
      }));
    }
  }

  /**
   * Send error to tracking endpoint
   */
  private async sendErrorTracking(error: ProcessedError): Promise<void> {
    try {
      await fetch(this.config.trackingEndpoint!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: {
            ...error,
            originalError: undefined,
            stackTrace: error.context.stackTrace,
          },
          timestamp: Date.now(),
        }),
      });
    } catch (trackingError) {
      console.warn('Failed to send error tracking:', trackingError);
    }
  }

  /**
   * Add error to history
   */
  private addToHistory(error: ProcessedError): void {
    this.errorHistory.unshift(error);
    
    // Keep only last 100 errors
    if (this.errorHistory.length > 100) {
      this.errorHistory = this.errorHistory.slice(0, 100);
    }
  }

  /**
   * Initialize user-friendly messages
   */
  private initializeUserMessages(): void {
    this.userMessages.set('HTTP_400', 'Invalid request. Please check your input.');
    this.userMessages.set('HTTP_401', 'Please sign in to continue.');
    this.userMessages.set('HTTP_403', 'Access denied. You do not have permission.');
    this.userMessages.set('HTTP_404', 'The requested resource was not found.');
    this.userMessages.set('HTTP_429', 'Too many requests. Please wait and try again.');
    this.userMessages.set('HTTP_500', 'Server error. Please try again later.');
    this.userMessages.set('HTTP_502', 'Service temporarily unavailable.');
    this.userMessages.set('HTTP_503', 'Service under maintenance.');
    this.userMessages.set('HTTP_504', 'Request timeout. Please try again.');
  }

  /**
   * Initialize recovery strategies
   */
  private initializeRecoveryStrategies(): void {
    // Custom strategies can be added here
    this.recoveryStrategies.set('network_CONNECTION_REFUSED', {
      type: 'retry',
      config: { maxRetries: 5, backoffMultiplier: 1.5 },
    });
  }

  /**
   * Utility methods
   */
  private isAxiosError(error: any): error is AxiosError {
    return error?.isAxiosError === true;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Public API methods
   */

  /**
   * Add custom user message
   */
  addUserMessage(code: string, message: string): void {
    this.userMessages.set(code, message);
  }

  /**
   * Add custom recovery strategy
   */
  addRecoveryStrategy(key: string, strategy: ErrorRecoveryStrategy): void {
    this.recoveryStrategies.set(key, strategy);
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    totalErrors: number;
    errorsByCategory: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    topErrors: Array<{ key: string; count: number }>;
  } {
    const errorsByCategory: Record<string, number> = {};
    const errorsBySeverity: Record<string, number> = {};

    for (const error of this.errorHistory) {
      errorsByCategory[error.category] = (errorsByCategory[error.category] || 0) + 1;
      errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1;
    }

    const topErrors = Array.from(this.errorCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([key, count]) => ({ key, count }));

    return {
      totalErrors: this.errorHistory.length,
      errorsByCategory,
      errorsBySeverity,
      topErrors,
    };
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit: number = 10): ProcessedError[] {
    return this.errorHistory.slice(0, limit);
  }

  /**
   * Clear error history
   */
  clearHistory(): void {
    this.errorHistory = [];
    this.errorCounts.clear();
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ErrorHandlerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get configuration
   */
  getConfig(): ErrorHandlerConfig {
    return { ...this.config };
  }
}