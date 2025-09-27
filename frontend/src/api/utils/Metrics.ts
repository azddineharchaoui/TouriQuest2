/**
 * Advanced Metrics Collection for TouriQuest API
 * 
 * Features:
 * - Real-time performance metrics
 * - API usage analytics
 * - Custom business metrics
 * - Memory and resource monitoring
 * - User behavior tracking
 * - Error rate monitoring
 */

export interface MetricPoint {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
  metadata?: Record<string, any>;
}

export interface PerformanceMetric {
  name: string;
  duration: number;
  startTime: number;
  endTime: number;
  memory?: {
    used: number;
    total: number;
  };
  network?: {
    responseSize: number;
    requestSize: number;
  };
  cache?: {
    hit: boolean;
    key?: string;
  };
}

export interface ApiMetric {
  endpoint: string;
  method: string;
  statusCode: number;
  duration: number;
  requestSize: number;
  responseSize: number;
  timestamp: number;
  userId?: string;
  sessionId?: string;
  cached: boolean;
  retryCount: number;
}

export interface UserMetric {
  action: string;
  component: string;
  timestamp: number;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

export interface SystemMetric {
  name: string;
  value: number;
  timestamp: number;
  type: 'gauge' | 'counter' | 'histogram' | 'timer';
}

export interface MetricsConfig {
  enabled: boolean;
  enablePerformance: boolean;
  enableApi: boolean;
  enableUser: boolean;
  enableSystem: boolean;
  batchSize: number;
  flushInterval: number;
  remoteEndpoint?: string;
  enableLocalStorage: boolean;
  maxStorageSize: number;
  enableRealTime: boolean;
  samplingRate: number; // 0-1, percentage of metrics to collect
}

export class Metrics {
  private config: MetricsConfig;
  private metricBuffer: MetricPoint[] = [];
  private performanceBuffer: PerformanceMetric[] = [];
  private apiBuffer: ApiMetric[] = [];
  private userBuffer: UserMetric[] = [];
  private systemBuffer: SystemMetric[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private perfObserver: PerformanceObserver | null = null;
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();

  constructor(config: Partial<MetricsConfig> = {}) {
    this.config = {
      enabled: true,
      enablePerformance: true,
      enableApi: true,
      enableUser: true,
      enableSystem: true,
      batchSize: 100,
      flushInterval: 30000, // 30 seconds
      enableLocalStorage: true,
      maxStorageSize: 10000,
      enableRealTime: false,
      samplingRate: 1.0, // Collect 100% by default
      ...config,
    };

    if (this.config.enabled) {
      this.initialize();
    }
  }

  /**
   * Initialize metrics collection
   */
  private initialize(): void {
    this.startFlushTimer();
    this.initializePerformanceObserver();
    this.initializeSystemMetrics();
  }

  /**
   * Performance Metrics
   */
  startTimer(name: string, tags?: Record<string, string>): () => void {
    if (!this.config.enablePerformance || !this.shouldSample()) {
      return () => {};
    }

    const startTime = performance.now();
    const startMemory = this.getMemoryUsage();

    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      const endMemory = this.getMemoryUsage();

      const metric: PerformanceMetric = {
        name,
        duration,
        startTime,
        endTime,
        memory: {
          used: endMemory,
          total: this.getTotalMemory(),
        },
      };

      this.performanceBuffer.push(metric);
      this.recordMetric('performance.timer', duration, { name, ...tags });
    };
  }

  recordApiCall(
    endpoint: string,
    method: string,
    statusCode: number,
    duration: number,
    requestSize: number = 0,
    responseSize: number = 0,
    options: {
      userId?: string;
      sessionId?: string;
      cached?: boolean;
      retryCount?: number;
    } = {}
  ): void {
    if (!this.config.enableApi || !this.shouldSample()) {
      return;
    }

    const metric: ApiMetric = {
      endpoint,
      method,
      statusCode,
      duration,
      requestSize,
      responseSize,
      timestamp: Date.now(),
      userId: options.userId,
      sessionId: options.sessionId,
      cached: options.cached || false,
      retryCount: options.retryCount || 0,
    };

    this.apiBuffer.push(metric);

    // Record aggregate metrics
    this.increment('api.requests.total', { endpoint, method, status: statusCode.toString() });
    this.recordMetric('api.duration', duration, { endpoint, method });
    this.recordMetric('api.request.size', requestSize, { endpoint, method });
    this.recordMetric('api.response.size', responseSize, { endpoint, method });

    if (statusCode >= 400) {
      this.increment('api.errors.total', { endpoint, method, status: statusCode.toString() });
    }

    if (options.cached) {
      this.increment('api.cache.hits', { endpoint, method });
    }
  }

  recordUserAction(
    action: string,
    component: string,
    metadata?: Record<string, any>,
    userId?: string,
    sessionId?: string
  ): void {
    if (!this.config.enableUser || !this.shouldSample()) {
      return;
    }

    const metric: UserMetric = {
      action,
      component,
      timestamp: Date.now(),
      userId,
      sessionId,
      metadata,
    };

    this.userBuffer.push(metric);
    this.increment('user.actions.total', { action, component });
  }

  /**
   * Core metric recording methods
   */
  recordMetric(
    name: string,
    value: number,
    tags?: Record<string, string>,
    metadata?: Record<string, any>
  ): void {
    if (!this.config.enabled || !this.shouldSample()) {
      return;
    }

    const metric: MetricPoint = {
      name,
      value,
      timestamp: Date.now(),
      tags,
      metadata,
    };

    this.metricBuffer.push(metric);

    // Emit real-time event if enabled
    if (this.config.enableRealTime) {
      this.emitRealTimeMetric(metric);
    }
  }

  increment(name: string, tags?: Record<string, string>, delta: number = 1): void {
    const key = this.createMetricKey(name, tags);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + delta);
    this.recordMetric(name, current + delta, tags);
  }

  gauge(name: string, value: number, tags?: Record<string, string>): void {
    const key = this.createMetricKey(name, tags);
    this.gauges.set(key, value);
    this.recordMetric(name, value, tags);
  }

  histogram(name: string, value: number, tags?: Record<string, string>): void {
    const key = this.createMetricKey(name, tags);
    const values = this.histograms.get(key) || [];
    values.push(value);
    
    // Keep only last 1000 values
    if (values.length > 1000) {
      values.shift();
    }
    
    this.histograms.set(key, values);
    this.recordMetric(name, value, tags);
  }

  /**
   * System metrics
   */
  private initializeSystemMetrics(): void {
    if (!this.config.enableSystem) {
      return;
    }

    // Collect system metrics every 10 seconds
    setInterval(() => {
      this.collectSystemMetrics();
    }, 10000);
  }

  private collectSystemMetrics(): void {
    // Memory metrics
    const memoryUsage = this.getMemoryUsage();
    this.gauge('system.memory.used', memoryUsage);
    
    const totalMemory = this.getTotalMemory();
    this.gauge('system.memory.total', totalMemory);
    
    if (totalMemory > 0) {
      this.gauge('system.memory.usage_percent', (memoryUsage / totalMemory) * 100);
    }

    // Connection metrics
    this.gauge('system.connection.online', navigator.onLine ? 1 : 0);
    
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        this.gauge('system.connection.effective_type', this.connectionTypeToNumber(connection.effectiveType));
        this.gauge('system.connection.downlink', connection.downlink || 0);
        this.gauge('system.connection.rtt', connection.rtt || 0);
      }
    }

    // Performance timing
    if (performance.timing) {
      const timing = performance.timing;
      this.gauge('system.page.load_time', timing.loadEventEnd - timing.navigationStart);
      this.gauge('system.page.dom_ready', timing.domContentLoadedEventEnd - timing.navigationStart);
    }
  }

  /**
   * Performance Observer
   */
  private initializePerformanceObserver(): void {
    if (!this.config.enablePerformance || !('PerformanceObserver' in window)) {
      return;
    }

    try {
      this.perfObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        
        for (const entry of entries) {
          this.processPerformanceEntry(entry);
        }
      });

      // Observe different types of performance entries
      this.perfObserver.observe({ entryTypes: ['navigation', 'resource', 'measure', 'paint'] });
    } catch (error) {
      console.warn('Failed to initialize PerformanceObserver:', error);
    }
  }

  private processPerformanceEntry(entry: PerformanceEntry): void {
    switch (entry.entryType) {
      case 'navigation':
        this.processNavigationEntry(entry as PerformanceNavigationTiming);
        break;
      case 'resource':
        this.processResourceEntry(entry as PerformanceResourceTiming);
        break;
      case 'measure':
        this.processMeasureEntry(entry);
        break;
      case 'paint':
        this.processPaintEntry(entry);
        break;
    }
  }

  private processNavigationEntry(entry: PerformanceNavigationTiming): void {
    this.recordMetric('performance.navigation.dns_lookup', entry.domainLookupEnd - entry.domainLookupStart);
    this.recordMetric('performance.navigation.tcp_connect', entry.connectEnd - entry.connectStart);
    this.recordMetric('performance.navigation.request', entry.responseStart - entry.requestStart);
    this.recordMetric('performance.navigation.response', entry.responseEnd - entry.responseStart);
    this.recordMetric('performance.navigation.dom_processing', entry.domContentLoadedEventStart - entry.responseEnd);
    this.recordMetric('performance.navigation.total', entry.loadEventEnd - entry.fetchStart);
  }

  private processResourceEntry(entry: PerformanceResourceTiming): void {
    const resourceType = this.getResourceType(entry.name);
    const tags = { type: resourceType };
    
    this.recordMetric('performance.resource.duration', entry.duration, tags);
    this.recordMetric('performance.resource.size', entry.transferSize || 0, tags);
    this.increment('performance.resource.count', tags);
  }

  private processMeasureEntry(entry: PerformanceEntry): void {
    this.recordMetric('performance.measure', entry.duration, { name: entry.name });
  }

  private processPaintEntry(entry: PerformanceEntry): void {
    this.recordMetric('performance.paint', entry.startTime, { type: entry.name });
  }

  /**
   * Data flushing
   */
  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  private async flush(): Promise<void> {
    if (this.metricBuffer.length === 0 && 
        this.performanceBuffer.length === 0 && 
        this.apiBuffer.length === 0 && 
        this.userBuffer.length === 0) {
      return;
    }

    const payload = {
      metrics: [...this.metricBuffer],
      performance: [...this.performanceBuffer],
      api: [...this.apiBuffer],
      user: [...this.userBuffer],
      system: [...this.systemBuffer],
      timestamp: Date.now(),
      metadata: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        samplingRate: this.config.samplingRate,
      },
    };

    // Clear buffers
    this.metricBuffer = [];
    this.performanceBuffer = [];
    this.apiBuffer = [];
    this.userBuffer = [];
    this.systemBuffer = [];

    // Send to remote endpoint
    if (this.config.remoteEndpoint) {
      try {
        await this.sendToRemote(payload);
      } catch (error) {
        console.error('Failed to send metrics to remote endpoint:', error);
      }
    }

    // Store locally
    if (this.config.enableLocalStorage) {
      this.storeLocally(payload);
    }
  }

  private async sendToRemote(payload: any): Promise<void> {
    if (!this.config.remoteEndpoint) {
      return;
    }

    const response = await fetch(this.config.remoteEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Metrics upload failed: ${response.status}`);
    }
  }

  private storeLocally(payload: any): void {
    try {
      const key = 'touriquest_metrics';
      const existing = localStorage.getItem(key);
      const stored = existing ? JSON.parse(existing) : [];
      
      stored.push(payload);
      
      // Trim to max size
      if (stored.length > this.config.maxStorageSize) {
        stored.splice(0, stored.length - this.config.maxStorageSize);
      }
      
      localStorage.setItem(key, JSON.stringify(stored));
    } catch (error) {
      console.error('Failed to store metrics locally:', error);
    }
  }

  /**
   * Real-time metrics
   */
  private emitRealTimeMetric(metric: MetricPoint): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('metrics:realtime', {
        detail: metric,
      }));
    }
  }

  /**
   * Utility methods
   */
  private shouldSample(): boolean {
    return Math.random() < this.config.samplingRate;
  }

  private createMetricKey(name: string, tags?: Record<string, string>): string {
    const tagString = tags ? Object.entries(tags).map(([k, v]) => `${k}=${v}`).join(',') : '';
    return `${name}:${tagString}`;
  }

  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  private getTotalMemory(): number {
    if ('memory' in performance) {
      return (performance as any).memory.totalJSHeapSize;
    }
    return 0;
  }

  private connectionTypeToNumber(type: string): number {
    const types: Record<string, number> = {
      'slow-2g': 1,
      '2g': 2,
      '3g': 3,
      '4g': 4,
      '5g': 5,
    };
    return types[type] || 0;
  }

  private getResourceType(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase();
    
    const typeMap: Record<string, string> = {
      'js': 'script',
      'css': 'stylesheet',
      'png': 'image',
      'jpg': 'image',
      'jpeg': 'image',
      'gif': 'image',
      'svg': 'image',
      'woff': 'font',
      'woff2': 'font',
      'ttf': 'font',
      'json': 'xhr',
    };
    
    return typeMap[extension || ''] || 'other';
  }

  /**
   * Public API methods
   */

  /**
   * Get current metrics summary
   */
  getSummary(): {
    counters: Record<string, number>;
    gauges: Record<string, number>;
    histogramStats: Record<string, { count: number; min: number; max: number; avg: number }>;
    bufferSizes: {
      metrics: number;
      performance: number;
      api: number;
      user: number;
      system: number;
    };
  } {
    const counters: Record<string, number> = {};
    this.counters.forEach((value, key) => {
      counters[key] = value;
    });

    const gauges: Record<string, number> = {};
    this.gauges.forEach((value, key) => {
      gauges[key] = value;
    });

    const histogramStats: Record<string, any> = {};
    this.histograms.forEach((values, key) => {
      if (values.length > 0) {
        const sorted = [...values].sort((a, b) => a - b);
        histogramStats[key] = {
          count: values.length,
          min: sorted[0],
          max: sorted[sorted.length - 1],
          avg: values.reduce((sum, val) => sum + val, 0) / values.length,
        };
      }
    });

    return {
      counters,
      gauges,
      histogramStats,
      bufferSizes: {
        metrics: this.metricBuffer.length,
        performance: this.performanceBuffer.length,
        api: this.apiBuffer.length,
        user: this.userBuffer.length,
        system: this.systemBuffer.length,
      },
    };
  }

  /**
   * Force flush metrics
   */
  async forceFlush(): Promise<void> {
    await this.flush();
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metricBuffer = [];
    this.performanceBuffer = [];
    this.apiBuffer = [];
    this.userBuffer = [];
    this.systemBuffer = [];
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<MetricsConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (config.flushInterval) {
      this.startFlushTimer();
    }
  }

  /**
   * Get configuration
   */
  getConfig(): MetricsConfig {
    return { ...this.config };
  }

  /**
   * Destroy metrics collector
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.perfObserver) {
      this.perfObserver.disconnect();
      this.perfObserver = null;
    }

    // Final flush
    this.flush();
  }
}