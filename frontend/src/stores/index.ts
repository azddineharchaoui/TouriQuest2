/**
 * Complete State Management System Entry Point
 * Main index file that exports all state management functionality
 */

// Core state management
export * from './types';
export * from './middleware';

// Server state management
export * from './server/queryClient';

// Client state stores
export * from './auth/authStore';
export * from './ui/uiStore';

// Form state management
export * from './forms/formManager';

// Global state context
export * from './context/providers';

// Caching layer
export * from './cache/lruCache';

// Developer tools
export * from './devtools';

// Advanced features
export * from './advanced';

// Main store configuration
import React from 'react';
import { QueryClient } from '@tanstack/react-query';
import { StateSnapshot, StoreConfig } from './types';
import { initializeDevTools } from './devtools';
import { initializeAdvancedFeatures } from './advanced';
import { createQueryClient } from './server/queryClient';

// Store manager for coordinating all state
export class StoreManager {
  private static instance: StoreManager;
  private queryClient: QueryClient;
  private config: StoreConfig;
  private initialized: boolean = false;
  
  private constructor(config: StoreConfig) {
    this.config = config;
    this.queryClient = createQueryClient(config.queryClient);
  }
  
  public static getInstance(config?: StoreConfig): StoreManager {
    if (!StoreManager.instance && config) {
      StoreManager.instance = new StoreManager(config);
    }
    return StoreManager.instance;
  }
  
  public async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      // Initialize development tools
      if (this.config.devtools?.enabled) {
        initializeDevTools();
      }
      
      // Initialize advanced features
      if (this.config.advanced) {
        initializeAdvancedFeatures(this.config.advanced);
      }
      
      // Initialize stores with persistent state
      await this.restorePersistedState();
      
      this.initialized = true;
      
      if (this.config.onInitialized) {
        this.config.onInitialized();
      }
    } catch (error) {
      console.error('Failed to initialize store manager:', error);
      throw error;
    }
  }
  
  private async restorePersistedState(): Promise<void> {
    // Implementation for restoring persisted state
    // This would integrate with the persistence middleware
    try {
      const persistedState = localStorage.getItem('touriquest-persisted-state');
      if (persistedState) {
        const parsed = JSON.parse(persistedState);
        // Restore state to relevant stores
        console.log('Restored persisted state:', parsed);
      }
    } catch (error) {
      console.warn('Failed to restore persisted state:', error);
    }
  }
  
  public getQueryClient(): QueryClient {
    return this.queryClient;
  }
  
  public takeGlobalSnapshot(): StateSnapshot {
    const stores = (window as any).__TOURIQUEST_STORES__ || {};
    
    return {
      id: `global-${Date.now()}`,
      timestamp: Date.now(),
      state: {
        auth: stores.auth?.getState(),
        ui: stores.ui?.getState(),
        preferences: stores.preferences?.getState(),
        navigation: stores.navigation?.getState(),
        search: stores.search?.getState(),
        offline: stores.offline?.getState()
      },
      metrics: {
        stateSize: JSON.stringify(stores).length,
        storeCount: Object.keys(stores).length,
        updateCount: 0,
        lastUpdateDuration: 0,
        averageUpdateDuration: 0,
        memoryUsage: 0,
        subscriptionCount: 0
      }
    };
  }
  
  public reset(): void {
    // Reset all stores to initial state
    const stores = (window as any).__TOURIQUEST_STORES__ || {};
    
    Object.values(stores).forEach((store: any) => {
      if (store.reset) {
        store.reset();
      }
    });
    
    // Clear query cache
    this.queryClient.clear();
    
    // Clear persisted state
    localStorage.removeItem('touriquest-persisted-state');
  }
  
  public getConfig(): StoreConfig {
    return { ...this.config };
  }
  
  public isInitialized(): boolean {
    return this.initialized;
  }
}

// Default configuration
export const defaultStoreConfig: StoreConfig = {
  devtools: {
    enabled: process.env.NODE_ENV === 'development',
    trace: true,
    traceLimit: 25
  },
  queryClient: {
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        cacheTime: 10 * 60 * 1000, // 10 minutes
        retry: 3,
        refetchOnWindowFocus: false
      },
      mutations: {
        retry: 1
      }
    }
  },
  advanced: {
    offline: {
      storageKey: 'touriquest-sync-queue',
      maxRetries: 3,
      maxBackoffDelay: 30000,
      retentionPeriod: 7 * 24 * 60 * 60 * 1000 // 7 days
    },
    abTests: [
      {
        id: 'new-booking-flow',
        name: 'New Booking Flow Test',
        enabled: true,
        variants: [
          { id: 'control', weight: 50 },
          { id: 'variant-a', weight: 50 }
        ],
        conditions: {
          userAgent: /Chrome|Firefox/,
          feature: 'booking-v2'
        }
      }
    ]
  }
};

// Main initialization function
export const initializeStateManagement = async (config: Partial<StoreConfig> = {}) => {
  const finalConfig = { ...defaultStoreConfig, ...config };
  const storeManager = StoreManager.getInstance(finalConfig);
  
  await storeManager.initialize();
  
  return storeManager;
};

// React hook for accessing store manager
export const useStoreManager = () => {
  const [storeManager] = React.useState(() => StoreManager.getInstance());
  
  return storeManager;
};

// State provider component that wraps the entire app
interface StateProviderProps {
  children: React.ReactNode;
  config?: Partial<StoreConfig>;
}

export const StateProvider: React.FC<StateProviderProps> = ({ 
  children, 
  config = {} 
}) => {
  const [initialized, setInitialized] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  
  React.useEffect(() => {
    const initialize = async () => {
      try {
        await initializeStateManagement(config);
        setInitialized(true);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown initialization error'));
      }
    };
    
    initialize();
  }, []);
  
  if (error) {
    // Error boundary fallback
    return (
      <div style={{ 
        padding: '20px', 
        color: 'red', 
        border: '1px solid red', 
        borderRadius: '4px',
        margin: '20px'
      }}>
        <h3>State Management Initialization Error</h3>
        <p>{error.message}</p>
        <button onClick={() => window.location.reload()}>
          Reload Application
        </button>
      </div>
    );
  }
  
  if (!initialized) {
    // Loading state
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          border: '3px solid #f3f3f3',
          borderTop: '3px solid #3498db',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p>Initializing state management...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }
  
  return <>{children}</>;
};

// Export store manager instance
export const storeManager = StoreManager.getInstance(defaultStoreConfig);

// Export commonly used types for convenience
export type {
  StoreConfig,
  StateSnapshot,
  PerformanceMetrics,
  CacheEntry,
  OptimisticUpdate,
  OfflineAction,
  ABTestConfig
} from './types';