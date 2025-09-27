/**
 * Advanced Logger for TouriQuest API
 * 
 * Features:
 * - Multiple log levels with filtering
 * - Structured logging with context
 * - Remote log shipping and batching
 * - Performance monitoring integration
 * - Client-side log aggregation
 * - Privacy-aware logging with sanitization
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  context?: LogContext;
  tags?: string[];
  userId?: string;
  sessionId?: string;
  requestId?: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  performance?: {
    duration?: number;
    memory?: number;
    network?: boolean;
  };
}

export interface LogContext {
  component?: string;
  method?: string;
  url?: string;
  action?: string;
  metadata?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  performance?: {
    duration?: number;
    memory?: number;
    network?: boolean;
  };
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
  enableStorage: boolean;
  remoteEndpoint?: string;
  batchSize: number;
  batchTimeout: number;
  maxStorageSize: number;
  enableSanitization: boolean;
  sensitiveFields: string[];
  enablePerformanceTracking: boolean;
  enableContextualLogging: boolean;
}

export class Logger {
  private config: LoggerConfig;
  private logBuffer: LogEntry[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private storageKey = 'touriquest_logs';
  private contextStack: LogContext[] = [];

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      enableConsole: true,
      enableRemote: false,
      enableStorage: true,
      batchSize: 50,
      batchTimeout: 10000, // 10 seconds
      maxStorageSize: 1000, // Maximum stored log entries
      enableSanitization: true,
      sensitiveFields: ['password', 'token', 'authorization', 'cookie', 'ssn', 'credit'],
      enablePerformanceTracking: true,
      enableContextualLogging: true,
      ...config,
    };

    this.startBatchTimer();
    this.loadStoredLogs();
  }

  /**
   * Logging methods
   */
  error(message: string, error?: Error, context?: LogContext): void {
    this.log(LogLevel.ERROR, message, {
      ...context,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : undefined,
    });
  }

  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  trace(message: string, context?: LogContext): void {
    this.log(LogLevel.TRACE, message, context);
  }

  /**
   * Performance logging
   */
  performance(
    name: string,
    duration: number,
    context?: LogContext,
    additionalMetrics?: {
      memory?: number;
      network?: boolean;
      cacheHit?: boolean;
    }
  ): void {
    if (!this.config.enablePerformanceTracking) return;

    this.log(LogLevel.INFO, `Performance: ${name}`, {
      ...context,
      performance: {
        duration,
        memory: additionalMetrics?.memory || this.getMemoryUsage(),
        network: additionalMetrics?.network || false,
      },
    }, ['performance']);
  }

  /**
   * API request/response logging
   */
  apiRequest(
    method: string,
    url: string,
    requestId: string,
    context?: LogContext
  ): void {
    this.log(LogLevel.DEBUG, `API Request: ${method} ${url}`, {
      ...context,
      method,
      url,
      action: 'api_request',
    }, ['api', 'request'], { requestId });
  }

  apiResponse(
    method: string,
    url: string,
    status: number,
    duration: number,
    requestId: string,
    context?: LogContext
  ): void {
    const level = status >= 400 ? LogLevel.ERROR : LogLevel.DEBUG;
    
    this.log(level, `API Response: ${method} ${url} - ${status}`, {
      ...context,
      method,
      url,
      action: 'api_response',
      metadata: { status },
      performance: { duration },
    }, ['api', 'response'], { requestId });
  }

  /**
   * User action logging
   */
  userAction(
    action: string,
    userId: string,
    sessionId: string,
    context?: LogContext
  ): void {
    this.log(LogLevel.INFO, `User Action: ${action}`, {
      ...context,
      action: 'user_action',
      metadata: { action },
    }, ['user', 'action'], { userId, sessionId });
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    message: string,
    context?: LogContext,
    tags?: string[],
    identifiers?: {
      userId?: string;
      sessionId?: string;
      requestId?: string;
    }
  ): void {
    // Check if log level is enabled
    if (level > this.config.level) {
      return;
    }

    // Merge context with context stack
    const mergedContext = this.mergeContext(context);

    // Sanitize sensitive data
    const sanitizedContext = this.config.enableSanitization
      ? this.sanitizeData(mergedContext)
      : mergedContext;

    const logEntry: LogEntry = {
      level,
      message,
      timestamp: Date.now(),
      context: sanitizedContext,
      tags,
      userId: identifiers?.userId || this.getCurrentUserId(),
      sessionId: identifiers?.sessionId || this.getCurrentSessionId(),
      requestId: identifiers?.requestId,
    };

    // Console logging
    if (this.config.enableConsole) {
      this.logToConsole(logEntry);
    }

    // Add to buffer for remote/storage logging
    if (this.config.enableRemote || this.config.enableStorage) {
      this.addToBuffer(logEntry);
    }
  }

  /**
   * Context management
   */
  pushContext(context: LogContext): void {
    if (this.config.enableContextualLogging) {
      this.contextStack.push(context);
    }
  }

  popContext(): LogContext | undefined {
    if (this.config.enableContextualLogging) {
      return this.contextStack.pop();
    }
    return undefined;
  }

  withContext<T>(context: LogContext, fn: () => T): T {
    this.pushContext(context);
    try {
      return fn();
    } finally {
      this.popContext();
    }
  }

  private mergeContext(context?: LogContext): LogContext | undefined {
    if (!this.config.enableContextualLogging) {
      return context;
    }

    const stackContext = this.contextStack.reduce((merged, ctx) => ({
      ...merged,
      ...ctx,
      metadata: { ...merged.metadata, ...ctx.metadata },
    }), {} as LogContext);

    if (!context && Object.keys(stackContext).length === 0) {
      return undefined;
    }

    return {
      ...stackContext,
      ...context,
      metadata: { ...stackContext.metadata, ...context?.metadata },
    };
  }

  /**
   * Data sanitization
   */
  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }

    const sanitized: any = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (this.isSensitiveField(key)) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeData(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private isSensitiveField(fieldName: string): boolean {
    const lowerFieldName = fieldName.toLowerCase();
    return this.config.sensitiveFields.some(field => 
      lowerFieldName.includes(field.toLowerCase())
    );
  }

  /**
   * Console logging
   */
  private logToConsole(logEntry: LogEntry): void {
    const { level, message, timestamp, context, tags, error } = logEntry;
    const time = new Date(timestamp).toISOString();
    const tagString = tags ? `[${tags.join(', ')}]` : '';
    const logMessage = `${time} ${tagString} ${message}`;

    switch (level) {
      case LogLevel.ERROR:
        console.error(logMessage, context, error);
        break;
      case LogLevel.WARN:
        console.warn(logMessage, context);
        break;
      case LogLevel.INFO:
        console.info(logMessage, context);
        break;
      case LogLevel.DEBUG:
        console.debug(logMessage, context);
        break;
      case LogLevel.TRACE:
        console.trace(logMessage, context);
        break;
    }
  }

  /**
   * Buffer management
   */
  private addToBuffer(logEntry: LogEntry): void {
    this.logBuffer.push(logEntry);

    // Trigger immediate flush for errors
    if (logEntry.level === LogLevel.ERROR) {
      this.flush();
    }
    // Trigger flush if buffer is full
    else if (this.logBuffer.length >= this.config.batchSize) {
      this.flush();
    }
  }

  private startBatchTimer(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }

    this.batchTimer = setInterval(() => {
      if (this.logBuffer.length > 0) {
        this.flush();
      }
    }, this.config.batchTimeout);
  }

  /**
   * Flush logs to remote and storage
   */
  private async flush(): Promise<void> {
    if (this.logBuffer.length === 0) {
      return;
    }

    const logsToFlush = [...this.logBuffer];
    this.logBuffer = [];

    // Send to remote endpoint
    if (this.config.enableRemote && this.config.remoteEndpoint) {
      try {
        await this.sendToRemote(logsToFlush);
      } catch (error) {
        console.error('Failed to send logs to remote endpoint:', error);
        // Put logs back in buffer on failure
        this.logBuffer.unshift(...logsToFlush);
      }
    }

    // Store locally
    if (this.config.enableStorage) {
      this.storeLocally(logsToFlush);
    }
  }

  private async sendToRemote(logs: LogEntry[]): Promise<void> {
    if (!this.config.remoteEndpoint) {
      return;
    }

    const response = await fetch(this.config.remoteEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        logs,
        metadata: {
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: Date.now(),
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Remote logging failed: ${response.status}`);
    }
  }

  private storeLocally(logs: LogEntry[]): void {
    try {
      const existingLogs = this.getStoredLogs();
      const allLogs = [...existingLogs, ...logs];
      
      // Trim to max size
      const trimmedLogs = allLogs.slice(-this.config.maxStorageSize);
      
      localStorage.setItem(this.storageKey, JSON.stringify(trimmedLogs));
    } catch (error) {
      console.error('Failed to store logs locally:', error);
    }
  }

  private getStoredLogs(): LogEntry[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load stored logs:', error);
      return [];
    }
  }

  private loadStoredLogs(): void {
    // Load stored logs into buffer for potential remote sending
    if (this.config.enableRemote && this.config.remoteEndpoint) {
      const storedLogs = this.getStoredLogs();
      if (storedLogs.length > 0) {
        // Send stored logs in background
        setTimeout(() => {
          this.sendToRemote(storedLogs).then(() => {
            // Clear stored logs after successful send
            localStorage.removeItem(this.storageKey);
          }).catch(() => {
            // Keep logs if send fails
          });
        }, 5000); // Wait 5 seconds before sending
      }
    }
  }

  /**
   * Utility methods
   */
  private getCurrentUserId(): string | undefined {
    // This would typically come from your auth system
    return undefined;
  }

  private getCurrentSessionId(): string | undefined {
    // This would typically come from your session management
    return undefined;
  }

  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  /**
   * Public API methods
   */

  /**
   * Set log level
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * Get current configuration
   */
  getConfig(): LoggerConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (config.batchTimeout) {
      this.startBatchTimer();
    }
  }

  /**
   * Get log statistics
   */
  getStats(): {
    bufferSize: number;
    storedLogCount: number;
    level: string;
    enabledOutputs: string[];
  } {
    const enabledOutputs: string[] = [];
    if (this.config.enableConsole) enabledOutputs.push('console');
    if (this.config.enableRemote) enabledOutputs.push('remote');
    if (this.config.enableStorage) enabledOutputs.push('storage');

    return {
      bufferSize: this.logBuffer.length,
      storedLogCount: this.getStoredLogs().length,
      level: LogLevel[this.config.level],
      enabledOutputs,
    };
  }

  /**
   * Get recent logs
   */
  getRecentLogs(limit: number = 100): LogEntry[] {
    const storedLogs = this.getStoredLogs();
    const allLogs = [...storedLogs, ...this.logBuffer];
    
    return allLogs
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logBuffer = [];
    localStorage.removeItem(this.storageKey);
  }

  /**
   * Force flush
   */
  async forceFlush(): Promise<void> {
    await this.flush();
  }

  /**
   * Destroy logger
   */
  destroy(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }
    
    // Flush remaining logs
    this.flush();
  }
}

/**
 * Logger factory for different components
 */
export class LoggerFactory {
  private static loggers: Map<string, Logger> = new Map();
  private static defaultConfig: LoggerConfig = {
    level: LogLevel.INFO,
    enableConsole: true,
    enableRemote: false,
    enableStorage: true,
    batchSize: 50,
    batchTimeout: 10000,
    maxStorageSize: 1000,
    enableSanitization: true,
    sensitiveFields: ['password', 'token', 'authorization', 'cookie', 'ssn', 'credit'],
    enablePerformanceTracking: true,
    enableContextualLogging: true,
  };

  /**
   * Get logger for component
   */
  static getLogger(component: string, config?: Partial<LoggerConfig>): Logger {
    const key = `${component}_${JSON.stringify(config || {})}`;
    
    if (!this.loggers.has(key)) {
      const logger = new Logger({
        ...this.defaultConfig,
        ...config,
      });
      
      // Add component to default context
      logger.pushContext({ component });
      
      this.loggers.set(key, logger);
    }
    
    return this.loggers.get(key)!;
  }

  /**
   * Set default configuration
   */
  static setDefaultConfig(config: Partial<LoggerConfig>): void {
    this.defaultConfig = { ...this.defaultConfig, ...config };
  }

  /**
   * Clear all loggers
   */
  static clearLoggers(): void {
    for (const logger of this.loggers.values()) {
      logger.destroy();
    }
    this.loggers.clear();
  }
}