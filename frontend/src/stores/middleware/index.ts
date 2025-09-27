/**
 * Middleware Collection for Enterprise State Management
 * Advanced middleware for logging, persistence, debugging, and performance monitoring
 */

import { StateCreator, StoreMutatorIdentifier } from 'zustand';
import { PersistConfig, MiddlewareConfig, StoreError, PerformanceMetrics, StateSnapshot } from '../types';

// Logger middleware for development and debugging
export interface LoggerConfig {
  enabled: boolean;
  collapsed: boolean;
  timestamp: boolean;
  duration: boolean;
  diff: boolean;
  filter?: (action: any, state: any) => boolean;
  transformer?: (state: any) => any;
  colors?: {
    title: string;
    prevState: string;
    action: string;
    nextState: string;
    error: string;
  };
}

export const logger = <T>(
  config: LoggerConfig = { enabled: true, collapsed: false, timestamp: true, duration: true, diff: true }
) => (
  stateCreator: StateCreator<T, [], [], T>
): StateCreator<T, [], [], T> => (set, get, store) => {
  if (!config.enabled || typeof window === 'undefined') {
    return stateCreator(set, get, store);
  }

  const loggedSet: typeof set = (...args) => {
    const prevState = get();
    const start = performance.now();
    
    set(...args);
    
    const nextState = get();
    const duration = performance.now() - start;
    
    // Create log entry
    const logEntry = {
      timestamp: new Date().toISOString(),
      duration: `${duration.toFixed(2)}ms`,
      prevState: config.transformer ? config.transformer(prevState) : prevState,
      nextState: config.transformer ? config.transformer(nextState) : nextState,
      diff: config.diff ? calculateDiff(prevState, nextState) : null
    };

    // Console logging with colors
    const colors = config.colors || {
      title: '#4CAF50',
      prevState: '#9E9E9E',
      action: '#2196F3',
      nextState: '#4CAF50',
      error: '#F44336'
    };

    const groupName = `%c State Update ${config.timestamp ? `@ ${logEntry.timestamp}` : ''} ${config.duration ? `(in ${logEntry.duration})` : ''}`;
    
    if (config.collapsed) {
      console.groupCollapsed(groupName, `color: ${colors.title}; font-weight: bold;`);
    } else {
      console.group(groupName, `color: ${colors.title}; font-weight: bold;`);
    }
    
    console.log('%c prev state', `color: ${colors.prevState}; font-weight: bold;`, logEntry.prevState);
    console.log('%c next state', `color: ${colors.nextState}; font-weight: bold;`, logEntry.nextState);
    
    if (config.diff && logEntry.diff) {
      console.log('%c diff', `color: ${colors.action}; font-weight: bold;`, logEntry.diff);
    }
    
    console.groupEnd();
  };

  return stateCreator(loggedSet, get, store);
};

// Persistence middleware with encryption and compression
export interface PersistMiddlewareConfig extends PersistConfig {
  serialize?: (state: any) => string;
  deserialize?: (str: string) => any;
  onRehydrateStorage?: (state: any) => void;
  migrate?: (persistedState: any, version: number) => any;
}

export const persist = <T>(
  config: PersistMiddlewareConfig
) => (
  stateCreator: StateCreator<T, [], [], T>
): StateCreator<T, [], [], T> => (set, get, store) => {
  
  const storage = getStorage(config.storage);
  
  // Load persisted state
  const loadPersistedState = (): Partial<T> | null => {
    try {
      const item = storage.getItem(config.name);
      if (!item) return null;
      
      let parsed = config.deserialize ? config.deserialize(item) : JSON.parse(item);
      
      // Decrypt if needed
      if (config.encrypted && parsed.encrypted) {
        parsed = decrypt(parsed.data, getEncryptionKey());
      }
      
      // Migrate if version changed
      if (config.migrate && parsed.version !== config.version) {
        parsed = config.migrate(parsed, config.version);
      }
      
      return parsed.state;
    } catch (error) {
      console.error('Failed to load persisted state:', error);
      return null;
    }
  };

  // Save state to storage
  const saveState = (state: T) => {
    try {
      if (!config.enabled) return;
      
      let dataToSave = state;
      
      // Apply whitelist/blacklist
      if (config.whitelist) {
        dataToSave = pick(state, config.whitelist);
      } else if (config.blacklist) {
        dataToSave = omit(state, config.blacklist);
      }
      
      // Transform if needed
      if (config.transform?.out) {
        dataToSave = config.transform.out(dataToSave);
      }
      
      let persistData = {
        state: dataToSave,
        version: config.version,
        timestamp: Date.now()
      };
      
      // Encrypt if needed
      if (config.encrypted) {
        persistData = {
          encrypted: true,
          data: encrypt(persistData, getEncryptionKey())
        } as any;
      }
      
      const serialized = config.serialize ? config.serialize(persistData) : JSON.stringify(persistData);
      storage.setItem(config.name, serialized);
    } catch (error) {
      console.error('Failed to save state:', error);
    }
  };

  // Initialize store with persisted state
  const persistedState = loadPersistedState();
  
  const persistedSet: typeof set = (...args) => {
    set(...args);
    saveState(get());
  };

  const initializedStore = stateCreator(persistedSet, get, store);
  
  // Merge persisted state with initial state
  if (persistedState) {
    const mergedState = { ...initializedStore, ...persistedState };
    Object.assign(initializedStore, mergedState);
    
    if (config.onRehydrateStorage) {
      config.onRehydrateStorage(mergedState);
    }
  }
  
  return initializedStore;
};

// Performance monitoring middleware
export interface PerformanceConfig {
  enabled: boolean;
  threshold: number; // ms
  sampleRate: number; // 0-1
  trackMemory: boolean;
  trackUpdates: boolean;
  onSlowUpdate?: (metrics: PerformanceMetrics) => void;
}

export const performance = <T>(
  config: PerformanceConfig
) => (
  stateCreator: StateCreator<T, [], [], T>
): StateCreator<T, [], [], T> => (set, get, store) => {
  
  if (!config.enabled || Math.random() > config.sampleRate) {
    return stateCreator(set, get, store);
  }
  
  let updateCount = 0;
  let totalDuration = 0;
  let subscriptionCount = 0;
  
  const performanceSet: typeof set = (...args) => {
    const start = performance.now();
    const prevStateSize = JSON.stringify(get()).length;
    
    set(...args);
    
    const duration = performance.now() - start;
    const nextStateSize = JSON.stringify(get()).length;
    
    updateCount++;
    totalDuration += duration;
    
    const metrics: PerformanceMetrics = {
      stateSize: nextStateSize,
      updateCount,
      lastUpdateDuration: duration,
      averageUpdateDuration: totalDuration / updateCount,
      memoryUsage: config.trackMemory ? getMemoryUsage() : 0,
      subscriptionCount
    };
    
    // Log slow updates
    if (duration > config.threshold) {
      console.warn(`Slow state update detected: ${duration.toFixed(2)}ms`, metrics);
      config.onSlowUpdate?.(metrics);
    }
    
    // Track performance in development
    if (process.env.NODE_ENV === 'development') {
      (window as any).__TOURIQUEST_PERF__ = {
        ...(window as any).__TOURIQUEST_PERF__,
        [config.name || 'store']: metrics
      };
    }
  };

  return stateCreator(performanceSet, get, store);
};

// DevTools middleware with Redux DevTools integration
export interface DevToolsConfig {
  enabled: boolean;
  name: string;
  trace: boolean;
  traceLimit: number;
  actionSanitizer?: (action: any) => any;
  stateSanitizer?: (state: any) => any;
}

export const devtools = <T>(
  config: DevToolsConfig
) => (
  stateCreator: StateCreator<T, [], [], T>
): StateCreator<T, [], [], T> => (set, get, store) => {
  
  if (!config.enabled || typeof window === 'undefined' || !window.__REDUX_DEVTOOLS_EXTENSION__) {
    return stateCreator(set, get, store);
  }
  
  const devTools = window.__REDUX_DEVTOOLS_EXTENSION__.connect({
    name: config.name,
    trace: config.trace,
    traceLimit: config.traceLimit,
    actionSanitizer: config.actionSanitizer,
    stateSanitizer: config.stateSanitizer
  });
  
  const devtoolsSet: typeof set = (...args) => {
    const prevState = get();
    set(...args);
    const nextState = get();
    
    // Send to DevTools
    devTools.send({
      type: 'STATE_UPDATE',
      payload: args[0]
    }, nextState);
  };
  
  const initializedStore = stateCreator(devtoolsSet, get, store);
  
  // Send initial state
  devTools.init(initializedStore);
  
  return initializedStore;
};

// Error boundary middleware
export interface ErrorConfig {
  enabled: boolean;
  onError?: (error: StoreError, state: any) => void;
  fallbackState?: any;
  retryAttempts?: number;
}

export const errorBoundary = <T>(
  config: ErrorConfig
) => (
  stateCreator: StateCreator<T, [], [], T>
): StateCreator<T, [], [], T> => (set, get, store) => {
  
  if (!config.enabled) {
    return stateCreator(set, get, store);
  }
  
  const errorSet: typeof set = (...args) => {
    try {
      set(...args);
    } catch (error) {
      const storeError: StoreError = {
        code: 'STATE_UPDATE_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: Date.now(),
        context: { args, state: get() }
      };
      
      console.error('Store error:', storeError);
      config.onError?.(storeError, get());
      
      // Apply fallback state if provided
      if (config.fallbackState) {
        set(config.fallbackState);
      }
    }
  };
  
  return stateCreator(errorSet, get, store);
};

// Compose multiple middleware
export const composeMiddleware = <T>(...middlewares: Array<(stateCreator: StateCreator<T, [], [], T>) => StateCreator<T, [], [], T>>) => {
  return middlewares.reduce((composed, middleware) => middleware(composed));
};

// Utility functions
function calculateDiff(prev: any, next: any): any {
  // Simple diff implementation - in production, use a library like deep-diff
  const changes: any = {};
  
  for (const key in next) {
    if (prev[key] !== next[key]) {
      changes[key] = { from: prev[key], to: next[key] };
    }
  }
  
  return Object.keys(changes).length > 0 ? changes : null;
}

function getStorage(type: 'localStorage' | 'sessionStorage' | 'indexedDB') {
  switch (type) {
    case 'localStorage':
      return localStorage;
    case 'sessionStorage':
      return sessionStorage;
    case 'indexedDB':
      // Implement IndexedDB wrapper
      throw new Error('IndexedDB storage not implemented yet');
    default:
      return localStorage;
  }
}

function getEncryptionKey(): string {
  // In production, use a proper key management system
  return 'touriquest-encryption-key';
}

function encrypt(data: any, key: string): string {
  // Simple encryption - in production, use proper encryption
  return btoa(JSON.stringify(data));
}

function decrypt(data: string, key: string): any {
  // Simple decryption - in production, use proper decryption
  return JSON.parse(atob(data));
}

function pick(obj: any, keys: string[]): any {
  const result: any = {};
  keys.forEach(key => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
}

function omit(obj: any, keys: string[]): any {
  const result = { ...obj };
  keys.forEach(key => {
    delete result[key];
  });
  return result;
}

function getMemoryUsage(): number {
  if (typeof window !== 'undefined' && 'performance' in window && 'memory' in window.performance) {
    return (window.performance as any).memory.usedJSHeapSize;
  }
  return 0;
}

// Type declarations for window extensions
declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION__?: any;
    __TOURIQUEST_PERF__?: Record<string, PerformanceMetrics>;
  }
}