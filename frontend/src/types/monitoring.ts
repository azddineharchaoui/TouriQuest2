import { ApiResponse } from './common';

// Monitoring Types
export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical';
  uptime: number; // in seconds
  version: string;
  environment: string;
  timestamp: string;
  services: ServiceStatus[];
  dependencies: DependencyStatus[];
}

export interface ServiceStatus {
  name: string;
  status: 'up' | 'down' | 'degraded';
  responseTime: number; // in milliseconds
  lastCheck: string;
  errorRate: number;
  version?: string;
  metadata?: Record<string, any>;
}

export interface DependencyStatus {
  name: string;
  type: 'database' | 'cache' | 'external_api' | 'queue' | 'storage';
  status: 'connected' | 'disconnected' | 'degraded';
  responseTime: number;
  lastCheck: string;
  connectionPool?: {
    active: number;
    idle: number;
    max: number;
  };
  metadata?: Record<string, any>;
}

export interface SystemMetrics {
  cpu: {
    usage: number; // percentage
    cores: number;
    loadAverage: number[];
  };
  memory: {
    used: number; // in bytes
    total: number;
    percentage: number;
    available: number;
  };
  disk: {
    used: number; // in bytes
    total: number;
    percentage: number;
    available: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
  };
  requests: {
    total: number;
    rps: number; // requests per second
    averageResponseTime: number;
    errorRate: number;
  };
  database: {
    connections: number;
    queries: number;
    qps: number; // queries per second
    averageQueryTime: number;
    slowQueries: number;
  };
}

export interface PerformanceMetrics {
  responseTime: {
    average: number;
    p50: number;
    p95: number;
    p99: number;
  };
  throughput: {
    requestsPerSecond: number;
    requestsPerMinute: number;
    peakRps: number;
  };
  errorRates: {
    total: number;
    http4xx: number;
    http5xx: number;
    timeout: number;
    connection: number;
  };
  availability: {
    uptime: number; // percentage
    downtime: number; // in seconds
    incidents: number;
    mttr: number; // mean time to recovery
  };
}

export interface SystemUptime {
  current: number; // in seconds
  percentage: number;
  incidents: Array<{
    id: string;
    startTime: string;
    endTime?: string;
    duration: number;
    type: 'planned' | 'unplanned';
    severity: 'minor' | 'major' | 'critical';
    description: string;
    affectedServices: string[];
  }>;
  history: Array<{
    date: string;
    uptime: number;
    availability: number;
  }>;
}

export interface ErrorLog {
  id: string;
  timestamp: string;
  level: 'error' | 'warning' | 'info' | 'debug';
  service: string;
  message: string;
  stack?: string;
  context: Record<string, any>;
  userId?: string;
  requestId?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  count?: number; // if aggregated
}

export interface SystemAlert {
  id: string;
  rule: string;
  severity: 'info' | 'warning' | 'critical';
  status: 'firing' | 'resolved';
  message: string;
  description?: string;
  service?: string;
  metric?: string;
  threshold?: number;
  currentValue?: number;
  startsAt: string;
  endsAt?: string;
  labels: Record<string, string>;
  annotations: Record<string, string>;
}

export interface ApplicationLog {
  id: string;
  timestamp: string;
  level: 'error' | 'warning' | 'info' | 'debug';
  service: string;
  component: string;
  message: string;
  metadata: Record<string, any>;
  requestId?: string;
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface DatabaseStatus {
  status: 'healthy' | 'degraded' | 'critical';
  connections: {
    active: number;
    idle: number;
    max: number;
    used: number;
  };
  performance: {
    queryTime: number;
    slowQueries: number;
    queriesPerSecond: number;
  };
  replication: {
    status: 'synced' | 'lagging' | 'error';
    lag?: number; // in milliseconds
    lastSync?: string;
  };
  storage: {
    used: number;
    total: number;
    percentage: number;
  };
}

export interface CacheStatus {
  status: 'healthy' | 'degraded' | 'critical';
  hitRate: number;
  missRate: number;
  memory: {
    used: number;
    max: number;
    percentage: number;
  };
  connections: {
    active: number;
    max: number;
  };
  operations: {
    gets: number;
    sets: number;
    deletes: number;
    evictions: number;
  };
}

export interface QueueStatus {
  status: 'healthy' | 'degraded' | 'critical';
  queues: Array<{
    name: string;
    size: number;
    processing: number;
    failed: number;
    waiting: number;
    rate: number; // jobs per second
  }>;
  workers: {
    active: number;
    total: number;
    failed: number;
  };
  performance: {
    averageProcessingTime: number;
    successRate: number;
    retryRate: number;
  };
}

export interface StorageUsage {
  total: number;
  used: number;
  available: number;
  percentage: number;
  breakdown: {
    media: number;
    backups: number;
    logs: number;
    cache: number;
    other: number;
  };
  growth: {
    daily: number;
    weekly: number;
    monthly: number;
  };
}

// API Response Types
export type SystemHealthResponse = ApiResponse<SystemHealth>;
export type SystemMetricsResponse = ApiResponse<SystemMetrics>;
export type PerformanceMetricsResponse = ApiResponse<PerformanceMetrics>;
export type SystemUptimeResponse = ApiResponse<SystemUptime>;
export type ErrorLogsResponse = ApiResponse<ErrorLog[]>;
export type SystemAlertsResponse = ApiResponse<SystemAlert[]>;
export type ApplicationLogsResponse = ApiResponse<ApplicationLog[]>;
export type DatabaseStatusResponse = ApiResponse<DatabaseStatus>;
export type CacheStatusResponse = ApiResponse<CacheStatus>;
export type QueueStatusResponse = ApiResponse<QueueStatus>;
export type StorageUsageResponse = ApiResponse<StorageUsage>;