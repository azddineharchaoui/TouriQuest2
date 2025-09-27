/**
 * Core State Management Types
 * Enterprise-grade TypeScript definitions for state management
 */

// Base state store interface
export interface BaseStore {
  _meta: {
    id: string;
    version: number;
    createdAt: Date;
    updatedAt: Date;
    persistEnabled: boolean;
    debugEnabled: boolean;
  };
}

// State persistence configuration
export interface PersistConfig {
  name: string;
  enabled: boolean;
  version: number;
  encrypted: boolean;
  storage: 'localStorage' | 'sessionStorage' | 'indexedDB';
  whitelist?: string[];
  blacklist?: string[];
  transform?: {
    in?: (state: any) => any;
    out?: (state: any) => any;
  };
}

// State subscription configuration
export interface SubscriptionConfig {
  selector?: (state: any) => any;
  equalityFn?: (a: any, b: any) => boolean;
  fireImmediately?: boolean;
}

// State middleware configuration
export interface MiddlewareConfig {
  logger?: {
    enabled: boolean;
    collapsed: boolean;
    filter?: (action: any, state: any) => boolean;
  };
  devtools?: {
    enabled: boolean;
    name: string;
    trace: boolean;
  };
  persist?: PersistConfig;
  performance?: {
    enabled: boolean;
    threshold: number;
  };
}

// Store action types
export interface StoreAction {
  type: string;
  payload?: any;
  meta?: {
    timestamp: number;
    source: string;
    optimistic?: boolean;
  };
}

// Error handling types
export interface StoreError {
  code: string;
  message: string;
  stack?: string;
  timestamp: number;
  context?: Record<string, any>;
}

// State synchronization types
export interface SyncConfig {
  enabled: boolean;
  channel: string;
  conflictResolution: 'client' | 'server' | 'merge' | 'ask';
  retryAttempts: number;
  retryDelay: number;
}

// A/B Testing types
export interface ABTestConfig {
  enabled: boolean;
  testId: string;
  variant: string;
  segment: string;
  startDate: Date;
  endDate: Date;
}

// Performance monitoring types
export interface PerformanceMetrics {
  stateSize: number;
  updateCount: number;
  lastUpdateDuration: number;
  averageUpdateDuration: number;
  memoryUsage: number;
  subscriptionCount: number;
}

// State snapshot for debugging
export interface StateSnapshot {
  id: string;
  timestamp: number;
  state: any;
  action?: StoreAction;
  error?: StoreError;
  metrics: PerformanceMetrics;
}

// Collaborative features types
export interface CollaborativeState {
  sessionId: string;
  users: Array<{
    id: string;
    name: string;
    avatar?: string;
    cursor?: { x: number; y: number };
    selection?: any;
  }>;
  operations: Array<{
    id: string;
    userId: string;
    timestamp: number;
    type: string;
    data: any;
  }>;
}

// Offline sync types
export interface OfflineOperation {
  id: string;
  type: string;
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

// State machine types
export interface StateMachineConfig {
  id: string;
  initial: string;
  states: Record<string, {
    on?: Record<string, string>;
    entry?: string[];
    exit?: string[];
  }>;
  context?: any;
}

// Cache types
export interface CacheEntry<T = any> {
  key: string;
  value: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
  metadata?: Record<string, any>;
}

export interface CacheConfig {
  maxSize: number;
  maxAge: number;
  evictionPolicy: 'lru' | 'lfu' | 'fifo' | 'ttl';
  persistent: boolean;
  compression: boolean;
  encryption: boolean;
}

// Real-time synchronization types
export interface RealtimeConfig {
  enabled: boolean;
  url: string;
  channels: string[];
  reconnectAttempts: number;
  reconnectInterval: number;
  heartbeatInterval: number;
}

export interface RealtimeMessage {
  id: string;
  type: string;
  channel: string;
  data: any;
  timestamp: number;
  userId?: string;
}

// Query types for server state
export interface QueryConfig {
  staleTime: number;
  cacheTime: number;
  refetchOnWindowFocus: boolean;
  refetchOnReconnect: boolean;
  retry: number | boolean | ((failureCount: number, error: Error) => boolean);
  retryDelay: number | ((retryAttempt: number) => number);
}

// Optimistic update types
export interface OptimisticUpdate<T = any> {
  id: string;
  type: 'add' | 'update' | 'delete';
  data: T;
  rollback: () => void;
  confirm: () => void;
  timestamp: number;
}

// Form state types
export interface FormState<T = any> {
  values: T;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isValid: boolean;
  isDirty: boolean;
  submitCount: number;
}

// Computed value types
export interface ComputedValue<T = any> {
  get: () => T;
  dependencies: string[];
  memoized: boolean;
  lastComputed: number;
  computeCount: number;
}

// Store composition types
export interface StoreComposition {
  stores: Record<string, any>;
  selectors: Record<string, (state: any) => any>;
  actions: Record<string, (...args: any[]) => any>;
  effects: Record<string, (action: StoreAction) => void>;
}

// Development tools types
export interface DevToolsConfig {
  enabled: boolean;
  name: string;
  trace: boolean;
  traceLimit: number;
  actionSanitizer?: (action: any) => any;
  stateSanitizer?: (state: any) => any;
  serialize?: {
    options?: any;
    replacer?: (key: string, value: any) => any;
  };
}

// Testing utilities types
export interface TestUtilities {
  mockStore: <T>(initialState: T) => any;
  createMockProvider: (stores: Record<string, any>) => React.ComponentType;
  waitForStateChange: (store: any, predicate: (state: any) => boolean) => Promise<void>;
  getStateSnapshot: (store: any) => StateSnapshot;
  resetAllStores: () => void;
}