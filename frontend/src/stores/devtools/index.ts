/**
 * Developer Experience Tools
 * Redux DevTools, testing utilities, hot reloading, and debugging capabilities
 */

import React from 'react';
import { StateSnapshot, TestUtilities, DevToolsConfig } from '../types';

// Redux DevTools integration
declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION__?: any;
    __REDUX_DEVTOOLS_EXTENSION_COMPOSE__?: any;
    __TOURIQUEST_DEV__?: any;
    __TOURIQUEST_STORES__?: any;
    __TOURIQUEST_SNAPSHOTS__?: StateSnapshot[];
  }
}

// DevTools manager
export class DevToolsManager {
  private static instance: DevToolsManager;
  private devtools: any = null;
  private snapshots: StateSnapshot[] = [];
  private isEnabled: boolean = false;
  
  private constructor() {
    this.isEnabled = process.env.NODE_ENV === 'development' && 
                     typeof window !== 'undefined' && 
                     !!window.__REDUX_DEVTOOLS_EXTENSION__;
    
    if (this.isEnabled) {
      this.initialize();
    }
  }
  
  public static getInstance(): DevToolsManager {
    if (!DevToolsManager.instance) {
      DevToolsManager.instance = new DevToolsManager();
    }
    return DevToolsManager.instance;
  }
  
  private initialize() {
    if (!window.__REDUX_DEVTOOLS_EXTENSION__) return;
    
    this.devtools = window.__REDUX_DEVTOOLS_EXTENSION__.connect({
      name: 'TouriQuest State Manager',
      trace: true,
      traceLimit: 25,
      actionSanitizer: this.sanitizeAction,
      stateSanitizer: this.sanitizeState,
      serialize: {
        options: {
          undefined: true,
          function: true,
          symbol: true
        }
      }
    });
    
    // Listen for time-travel debugging
    this.devtools.subscribe((message: any) => {
      if (message.type === 'DISPATCH') {
        this.handleTimeTravel(message);
      }
    });
    
    // Expose debugging utilities
    window.__TOURIQUEST_DEV__ = this.getDebugUtilities();
  }
  
  public sendAction(action: any, state: any, storeName: string) {
    if (!this.devtools) return;
    
    this.devtools.send({
      type: `${storeName}/${action.type}`,
      payload: action.payload,
      meta: {
        storeName,
        timestamp: Date.now(),
        ...action.meta
      }
    }, state);
  }
  
  public sendState(state: any, storeName: string) {
    if (!this.devtools) return;
    
    this.devtools.send({
      type: `${storeName}/STATE_UPDATE`,
      meta: {
        storeName,
        timestamp: Date.now()
      }
    }, state);
  }
  
  public takeSnapshot(storeId: string, state: any, action?: any): StateSnapshot {
    const snapshot: StateSnapshot = {
      id: `${storeId}-${Date.now()}`,
      timestamp: Date.now(),
      state: this.deepClone(state),
      action,
      metrics: this.calculateMetrics(state)
    };
    
    this.snapshots.push(snapshot);
    
    // Keep only last 100 snapshots
    if (this.snapshots.length > 100) {
      this.snapshots = this.snapshots.slice(-100);
    }
    
    if (typeof window !== 'undefined') {
      window.__TOURIQUEST_SNAPSHOTS__ = this.snapshots;
    }
    
    return snapshot;
  }
  
  public getSnapshots(): StateSnapshot[] {
    return [...this.snapshots];
  }
  
  public clearSnapshots(): void {
    this.snapshots = [];
    if (typeof window !== 'undefined') {
      window.__TOURIQUEST_SNAPSHOTS__ = [];
    }
  }
  
  private handleTimeTravel(message: any) {
    // Handle time-travel debugging
    switch (message.payload?.type) {
      case 'JUMP_TO_ACTION':
      case 'JUMP_TO_STATE':
        this.restoreSnapshot(message.payload.actionId);
        break;
      case 'RESET':
        this.resetAllStores();
        break;
    }
  }
  
  private restoreSnapshot(actionId: number) {
    // Implementation for restoring state from snapshot
    console.log('Restoring snapshot:', actionId);
  }
  
  private resetAllStores() {
    // Implementation for resetting all stores
    console.log('Resetting all stores');
  }
  
  private sanitizeAction = (action: any) => {
    // Remove sensitive data from actions
    const sanitized = { ...action };
    
    if (sanitized.payload?.password) {
      sanitized.payload.password = '[REDACTED]';
    }
    
    if (sanitized.payload?.token) {
      sanitized.payload.token = '[REDACTED]';
    }
    
    return sanitized;
  };
  
  private sanitizeState = (state: any) => {
    // Remove sensitive data from state
    if (!state) return state;
    
    const sanitized = this.deepClone(state);
    
    // Remove sensitive auth data
    if (sanitized.auth) {
      if (sanitized.auth.accessToken) {
        sanitized.auth.accessToken = '[REDACTED]';
      }
      if (sanitized.auth.refreshToken) {
        sanitized.auth.refreshToken = '[REDACTED]';
      }
    }
    
    return sanitized;
  };
  
  private calculateMetrics(state: any): any {
    return {
      stateSize: JSON.stringify(state).length,
      updateCount: 1,
      lastUpdateDuration: 0,
      averageUpdateDuration: 0,
      memoryUsage: 0,
      subscriptionCount: 0
    };
  }
  
  private deepClone(obj: any): any {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => this.deepClone(item));
    if (obj instanceof Object) {
      const cloned: any = {};
      Object.keys(obj).forEach(key => {
        cloned[key] = this.deepClone(obj[key]);
      });
      return cloned;
    }
  }
  
  private getDebugUtilities() {
    return {
      getSnapshots: () => this.getSnapshots(),
      clearSnapshots: () => this.clearSnapshots(),
      takeSnapshot: (storeId: string, state: any) => this.takeSnapshot(storeId, state),
      exportState: () => this.exportState(),
      importState: (data: any) => this.importState(data),
      analyzePerformance: () => this.analyzePerformance()
    };
  }
  
  private exportState() {
    const stores = window.__TOURIQUEST_STORES__ || {};
    const snapshots = this.snapshots;
    
    return {
      stores,
      snapshots,
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    };
  }
  
  private importState(data: any) {
    // Implementation for importing state
    console.log('Importing state:', data);
  }
  
  private analyzePerformance() {
    const performanceData = window.__TOURIQUEST_PERF__ || {};
    
    return {
      stores: performanceData,
      recommendations: this.generatePerformanceRecommendations(performanceData)
    };
  }
  
  private generatePerformanceRecommendations(data: any): string[] {
    const recommendations: string[] = [];
    
    Object.entries(data).forEach(([storeName, metrics]: [string, any]) => {
      if (metrics.averageUpdateDuration > 50) {
        recommendations.push(`${storeName}: Consider optimizing update performance (avg: ${metrics.averageUpdateDuration}ms)`);
      }
      
      if (metrics.stateSize > 100000) {
        recommendations.push(`${storeName}: Consider state normalization (size: ${metrics.stateSize} bytes)`);
      }
      
      if (metrics.subscriptionCount > 20) {
        recommendations.push(`${storeName}: High subscription count may impact performance (${metrics.subscriptionCount} subscribers)`);
      }
    });
    
    return recommendations;
  }
}

// Hot reloading support
export class HotReloadManager {
  private static instance: HotReloadManager;
  private stores: Map<string, any> = new Map();
  private preservedState: Map<string, any> = new Map();
  
  private constructor() {
    if (process.env.NODE_ENV === 'development' && module.hot) {
      this.setupHotReloading();
    }
  }
  
  public static getInstance(): HotReloadManager {
    if (!HotReloadManager.instance) {
      HotReloadManager.instance = new HotReloadManager();
    }
    return HotReloadManager.instance;
  }
  
  public registerStore(id: string, store: any) {
    this.stores.set(id, store);
    
    // Restore preserved state if available
    const preserved = this.preservedState.get(id);
    if (preserved) {
      store.setState(preserved);
      this.preservedState.delete(id);
    }
  }
  
  public unregisterStore(id: string) {
    this.stores.delete(id);
  }
  
  private setupHotReloading() {
    if (!module.hot) return;
    
    module.hot.accept(() => {
      console.log('Hot reloading stores...');
    });
    
    module.hot.dispose((data: any) => {
      // Preserve state before hot reload
      this.stores.forEach((store, id) => {
        data[id] = store.getState();
      });
    });
    
    if (module.hot.data) {
      // Restore state after hot reload
      Object.entries(module.hot.data).forEach(([id, state]) => {
        this.preservedState.set(id, state);
      });
    }
  }
}

// Testing utilities
export const createTestUtilities = (): TestUtilities => {
  return {
    mockStore: <T>(initialState: T) => {
      return {
        getState: () => initialState,
        setState: (newState: T) => {
          Object.assign(initialState, newState);
        },
        subscribe: (listener: () => void) => {
          // Mock subscription
          return () => {};
        }
      };
    },
    
    createMockProvider: (stores: Record<string, any>) => {
      return ({ children }: { children: React.ReactNode }) => {
        // Mock provider implementation
        return <div data-testid="mock-provider">{children}</div>;
      };
    },
    
    waitForStateChange: async (store: any, predicate: (state: any) => boolean) => {
      return new Promise<void>((resolve) => {
        const unsubscribe = store.subscribe(() => {
          if (predicate(store.getState())) {
            unsubscribe();
            resolve();
          }
        });
      });
    },
    
    getStateSnapshot: (store: any): StateSnapshot => {
      return DevToolsManager.getInstance().takeSnapshot('test', store.getState());
    },
    
    resetAllStores: () => {
      // Reset implementation
      console.log('Resetting all stores for testing');
    }
  };
};

// Performance monitor
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, any> = new Map();
  private observers: PerformanceObserver[] = [];
  
  private constructor() {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      this.setupPerformanceObservers();
    }
  }
  
  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }
  
  public startMeasure(name: string) {
    performance.mark(`${name}-start`);
  }
  
  public endMeasure(name: string): number {
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
    
    const measure = performance.getEntriesByName(name, 'measure')[0];
    return measure ? measure.duration : 0;
  }
  
  public recordMetric(name: string, value: number, tags?: Record<string, string>) {
    const metric = {
      name,
      value,
      timestamp: Date.now(),
      tags: tags || {}
    };
    
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    this.metrics.get(name).push(metric);
    
    // Keep only last 1000 entries per metric
    const entries = this.metrics.get(name);
    if (entries.length > 1000) {
      entries.splice(0, entries.length - 1000);
    }
  }
  
  public getMetrics(name?: string) {
    if (name) {
      return this.metrics.get(name) || [];
    }
    
    const allMetrics: any = {};
    this.metrics.forEach((value, key) => {
      allMetrics[key] = value;
    });
    
    return allMetrics;
  }
  
  public getAverageMetric(name: string, timeWindow?: number): number | null {
    const metrics = this.metrics.get(name);
    if (!metrics || metrics.length === 0) return null;
    
    let relevantMetrics = metrics;
    
    if (timeWindow) {
      const cutoff = Date.now() - timeWindow;
      relevantMetrics = metrics.filter((m: any) => m.timestamp >= cutoff);
    }
    
    if (relevantMetrics.length === 0) return null;
    
    const sum = relevantMetrics.reduce((acc: number, m: any) => acc + m.value, 0);
    return sum / relevantMetrics.length;
  }
  
  private setupPerformanceObservers() {
    // Observe long tasks
    if ('PerformanceObserver' in window) {
      const longTaskObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          this.recordMetric('long-task', entry.duration, {
            type: 'long-task',
            name: entry.name
          });
        });
      });
      
      try {
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.push(longTaskObserver);
      } catch (e) {
        // Long task API not supported
      }
      
      // Observe navigation timing
      const navObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry: any) => {
          this.recordMetric('navigation', entry.duration, {
            type: 'navigation',
            name: entry.name
          });
        });
      });
      
      try {
        navObserver.observe({ entryTypes: ['navigation'] });
        this.observers.push(navObserver);
      } catch (e) {
        // Navigation timing API not supported
      }
    }
  }
  
  public disconnect() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// State debugger component
interface StateDebuggerProps {
  enabled?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export const StateDebugger: React.FC<StateDebuggerProps> = ({ 
  enabled = process.env.NODE_ENV === 'development',
  position = 'bottom-right'
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [snapshots, setSnapshots] = React.useState<StateSnapshot[]>([]);
  
  React.useEffect(() => {
    if (enabled) {
      const devTools = DevToolsManager.getInstance();
      setSnapshots(devTools.getSnapshots());
      
      // Update snapshots periodically
      const interval = setInterval(() => {
        setSnapshots(devTools.getSnapshots());
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [enabled]);
  
  if (!enabled) return null;
  
  const positionStyles = {
    'top-left': { top: 20, left: 20 },
    'top-right': { top: 20, right: 20 },
    'bottom-left': { bottom: 20, left: 20 },
    'bottom-right': { bottom: 20, right: 20 }
  };
  
  return (
    <div
      style={{
        position: 'fixed',
        ...positionStyles[position],
        zIndex: 10000,
        backgroundColor: '#1a1a1a',
        color: 'white',
        padding: '10px',
        borderRadius: '8px',
        border: '1px solid #333',
        fontFamily: 'monospace',
        fontSize: '12px',
        maxWidth: '300px',
        maxHeight: '400px',
        overflow: 'auto'
      }}
    >
      <div
        style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: '10px' }}
        onClick={() => setIsOpen(!isOpen)}
      >
        🔧 State Debugger ({snapshots.length})
      </div>
      
      {isOpen && (
        <div>
          <div style={{ marginBottom: '10px' }}>
            <button
              onClick={() => DevToolsManager.getInstance().clearSnapshots()}
              style={{
                background: '#dc2626',
                color: 'white',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px'
              }}
            >
              Clear Snapshots
            </button>
          </div>
          
          <div style={{ maxHeight: '300px', overflow: 'auto' }}>
            {snapshots.slice(-10).map((snapshot) => (
              <div
                key={snapshot.id}
                style={{
                  borderBottom: '1px solid #444',
                  padding: '5px 0',
                  fontSize: '10px'
                }}
              >
                <div>{new Date(snapshot.timestamp).toLocaleTimeString()}</div>
                <div>Size: {snapshot.metrics.stateSize} bytes</div>
                {snapshot.action && (
                  <div>Action: {snapshot.action.type}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Initialize dev tools
export const initializeDevTools = () => {
  if (process.env.NODE_ENV === 'development') {
    DevToolsManager.getInstance();
    HotReloadManager.getInstance();
    PerformanceMonitor.getInstance();
  }
};

// Export dev tools instances
export const devTools = DevToolsManager.getInstance();
export const hotReload = HotReloadManager.getInstance();
export const performanceMonitor = PerformanceMonitor.getInstance();
export const testUtils = createTestUtilities();