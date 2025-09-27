/**
 * Advanced Features
 * Offline-first architecture, A/B testing, state snapshots, performance monitoring
 */

import React from 'react';
import { 
  OfflineConfig, 
  ABTestConfig, 
  StateSnapshot, 
  PerformanceMetrics,
  OfflineAction,
  SyncQueue
} from '../types';

// Offline-first architecture
export class OfflineManager {
  private static instance: OfflineManager;
  private syncQueue: SyncQueue[] = [];
  private isOnline: boolean = navigator.onLine;
  private listeners: Set<() => void> = new Set();
  private config: OfflineConfig;
  
  private constructor(config: OfflineConfig) {
    this.config = config;
    this.setupEventListeners();
    this.loadQueueFromStorage();
  }
  
  public static getInstance(config?: OfflineConfig): OfflineManager {
    if (!OfflineManager.instance && config) {
      OfflineManager.instance = new OfflineManager(config);
    }
    return OfflineManager.instance;
  }
  
  private setupEventListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyListeners();
      this.processSyncQueue();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyListeners();
    });
    
    // Process queue on visibility change
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isOnline) {
        this.processSyncQueue();
      }
    });
  }
  
  public addToQueue(action: OfflineAction): void {
    const queueItem: SyncQueue = {
      id: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      action,
      timestamp: Date.now(),
      retries: 0,
      status: 'pending'
    };
    
    this.syncQueue.push(queueItem);
    this.saveQueueToStorage();
    
    // Try to sync immediately if online
    if (this.isOnline) {
      this.processSyncQueue();
    }
  }
  
  public async processSyncQueue(): Promise<void> {
    if (!this.isOnline || this.syncQueue.length === 0) return;
    
    const pendingItems = this.syncQueue.filter(item => 
      item.status === 'pending' && item.retries < this.config.maxRetries
    );
    
    for (const item of pendingItems) {
      try {
        item.status = 'syncing';
        await this.syncItem(item);
        item.status = 'synced';
        item.syncedAt = Date.now();
      } catch (error) {
        item.status = 'failed';
        item.retries++;
        item.lastError = error instanceof Error ? error.message : 'Unknown error';
        
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, item.retries), this.config.maxBackoffDelay);
        setTimeout(() => {
          if (item.retries < this.config.maxRetries) {
            item.status = 'pending';
          }
        }, delay);
      }
    }
    
    // Clean up synced items
    this.syncQueue = this.syncQueue.filter(item => 
      item.status !== 'synced' || 
      (Date.now() - (item.syncedAt || 0)) < this.config.retentionPeriod
    );
    
    this.saveQueueToStorage();
  }
  
  private async syncItem(item: SyncQueue): Promise<void> {
    const { action } = item;
    
    switch (action.type) {
      case 'CREATE':
        await this.syncCreate(action);
        break;
      case 'UPDATE':
        await this.syncUpdate(action);
        break;
      case 'DELETE':
        await this.syncDelete(action);
        break;
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }
  
  private async syncCreate(action: OfflineAction): Promise<void> {
    const response = await fetch(action.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...action.headers
      },
      body: JSON.stringify(action.data)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  }
  
  private async syncUpdate(action: OfflineAction): Promise<void> {
    const response = await fetch(action.endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...action.headers
      },
      body: JSON.stringify(action.data)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  }
  
  private async syncDelete(action: OfflineAction): Promise<void> {
    const response = await fetch(action.endpoint, {
      method: 'DELETE',
      headers: action.headers
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }
  
  private saveQueueToStorage(): void {
    try {
      localStorage.setItem(this.config.storageKey, JSON.stringify(this.syncQueue));
    } catch (error) {
      console.warn('Failed to save sync queue to storage:', error);
    }
  }
  
  private loadQueueFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (stored) {
        this.syncQueue = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load sync queue from storage:', error);
      this.syncQueue = [];
    }
  }
  
  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }
  
  public getStatus() {
    return {
      isOnline: this.isOnline,
      queueLength: this.syncQueue.length,
      pendingItems: this.syncQueue.filter(item => item.status === 'pending').length,
      failedItems: this.syncQueue.filter(item => item.status === 'failed').length
    };
  }
  
  public clearQueue(): void {
    this.syncQueue = [];
    this.saveQueueToStorage();
  }
}

// A/B Testing framework
export class ABTestManager {
  private static instance: ABTestManager;
  private tests: Map<string, ABTestConfig> = new Map();
  private userAssignments: Map<string, string> = new Map();
  private analytics: Array<{ test: string; variant: string; event: string; timestamp: number }> = [];
  
  private constructor() {
    this.loadAssignments();
  }
  
  public static getInstance(): ABTestManager {
    if (!ABTestManager.instance) {
      ABTestManager.instance = new ABTestManager();
    }
    return ABTestManager.instance;
  }
  
  public registerTest(config: ABTestConfig): void {
    this.tests.set(config.id, config);
    
    // Auto-assign user if not already assigned
    if (!this.userAssignments.has(config.id)) {
      this.assignUserToVariant(config.id);
    }
  }
  
  public getVariant(testId: string): string {
    const assignment = this.userAssignments.get(testId);
    if (assignment) {
      return assignment;
    }
    
    // Auto-assign if test exists
    const test = this.tests.get(testId);
    if (test) {
      return this.assignUserToVariant(testId);
    }
    
    return 'control';
  }
  
  private assignUserToVariant(testId: string): string {
    const test = this.tests.get(testId);
    if (!test || !test.enabled) {
      return 'control';
    }
    
    // Use deterministic assignment based on user ID and test ID
    const userId = this.getUserId();
    const hash = this.hashString(`${userId}-${testId}`);
    const bucket = hash % 100;
    
    let cumulativeWeight = 0;
    for (const variant of test.variants) {
      cumulativeWeight += variant.weight;
      if (bucket < cumulativeWeight) {
        this.userAssignments.set(testId, variant.id);
        this.saveAssignments();
        return variant.id;
      }
    }
    
    // Fallback to control
    this.userAssignments.set(testId, 'control');
    this.saveAssignments();
    return 'control';
  }
  
  private getUserId(): string {
    // Get or create persistent user ID
    let userId = localStorage.getItem('ab-test-user-id');
    if (!userId) {
      userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('ab-test-user-id', userId);
    }
    return userId;
  }
  
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
  
  public trackEvent(testId: string, event: string, properties?: Record<string, any>): void {
    const variant = this.getVariant(testId);
    
    this.analytics.push({
      test: testId,
      variant,
      event,
      timestamp: Date.now()
    });
    
    // Send to analytics service
    this.sendAnalytics(testId, variant, event, properties);
  }
  
  private async sendAnalytics(
    testId: string, 
    variant: string, 
    event: string, 
    properties?: Record<string, any>
  ): Promise<void> {
    try {
      // Replace with your analytics endpoint
      await fetch('/api/analytics/ab-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          testId,
          variant,
          event,
          properties,
          userId: this.getUserId(),
          timestamp: Date.now()
        })
      });
    } catch (error) {
      console.warn('Failed to send A/B test analytics:', error);
    }
  }
  
  private saveAssignments(): void {
    try {
      const assignments = Object.fromEntries(this.userAssignments);
      localStorage.setItem('ab-test-assignments', JSON.stringify(assignments));
    } catch (error) {
      console.warn('Failed to save A/B test assignments:', error);
    }
  }
  
  private loadAssignments(): void {
    try {
      const stored = localStorage.getItem('ab-test-assignments');
      if (stored) {
        const assignments = JSON.parse(stored);
        this.userAssignments = new Map(Object.entries(assignments));
      }
    } catch (error) {
      console.warn('Failed to load A/B test assignments:', error);
    }
  }
  
  public getTestResults(testId: string) {
    const testAnalytics = this.analytics.filter(a => a.test === testId);
    const variants = [...new Set(testAnalytics.map(a => a.variant))];
    
    const results: Record<string, any> = {};
    
    variants.forEach(variant => {
      const variantEvents = testAnalytics.filter(a => a.variant === variant);
      results[variant] = {
        totalEvents: variantEvents.length,
        eventsByType: variantEvents.reduce((acc, event) => {
          acc[event.event] = (acc[event.event] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      };
    });
    
    return results;
  }
}

// State snapshot system
export class SnapshotManager {
  private static instance: SnapshotManager;
  private snapshots: Map<string, StateSnapshot[]> = new Map();
  private maxSnapshots: number = 50;
  
  private constructor() {}
  
  public static getInstance(): SnapshotManager {
    if (!SnapshotManager.instance) {
      SnapshotManager.instance = new SnapshotManager();
    }
    return SnapshotManager.instance;
  }
  
  public takeSnapshot(storeId: string, state: any, meta?: any): StateSnapshot {
    const snapshot: StateSnapshot = {
      id: `${storeId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      state: this.deepClone(state),
      metrics: this.calculateMetrics(state),
      meta
    };
    
    if (!this.snapshots.has(storeId)) {
      this.snapshots.set(storeId, []);
    }
    
    const storeSnapshots = this.snapshots.get(storeId)!;
    storeSnapshots.push(snapshot);
    
    // Keep only the most recent snapshots
    if (storeSnapshots.length > this.maxSnapshots) {
      storeSnapshots.splice(0, storeSnapshots.length - this.maxSnapshots);
    }
    
    return snapshot;
  }
  
  public getSnapshots(storeId: string): StateSnapshot[] {
    return this.snapshots.get(storeId) || [];
  }
  
  public getSnapshot(storeId: string, snapshotId: string): StateSnapshot | null {
    const storeSnapshots = this.snapshots.get(storeId);
    return storeSnapshots?.find(s => s.id === snapshotId) || null;
  }
  
  public compareSnapshots(snapshot1: StateSnapshot, snapshot2: StateSnapshot): any {
    return {
      timeDiff: snapshot2.timestamp - snapshot1.timestamp,
      sizeDiff: snapshot2.metrics.stateSize - snapshot1.metrics.stateSize,
      changes: this.calculateStateDiff(snapshot1.state, snapshot2.state)
    };
  }
  
  private calculateStateDiff(state1: any, state2: any): any {
    // Simple diff implementation - could be enhanced with a proper diff library
    const changes: any = {};
    
    const allKeys = new Set([...Object.keys(state1), ...Object.keys(state2)]);
    
    allKeys.forEach(key => {
      if (!(key in state1)) {
        changes[key] = { type: 'added', value: state2[key] };
      } else if (!(key in state2)) {
        changes[key] = { type: 'removed', value: state1[key] };
      } else if (JSON.stringify(state1[key]) !== JSON.stringify(state2[key])) {
        changes[key] = { 
          type: 'changed', 
          oldValue: state1[key], 
          newValue: state2[key] 
        };
      }
    });
    
    return changes;
  }
  
  private calculateMetrics(state: any): any {
    const stateString = JSON.stringify(state);
    return {
      stateSize: stateString.length,
      keyCount: Object.keys(state).length,
      depth: this.calculateDepth(state),
      complexity: this.calculateComplexity(state)
    };
  }
  
  private calculateDepth(obj: any, currentDepth = 0): number {
    if (obj === null || typeof obj !== 'object') {
      return currentDepth;
    }
    
    let maxDepth = currentDepth;
    Object.values(obj).forEach(value => {
      const depth = this.calculateDepth(value, currentDepth + 1);
      maxDepth = Math.max(maxDepth, depth);
    });
    
    return maxDepth;
  }
  
  private calculateComplexity(obj: any): number {
    if (obj === null || typeof obj !== 'object') {
      return 1;
    }
    
    let complexity = 1;
    Object.values(obj).forEach(value => {
      complexity += this.calculateComplexity(value);
    });
    
    return complexity;
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
  
  public exportSnapshots(storeId?: string): any {
    if (storeId) {
      return {
        storeId,
        snapshots: this.snapshots.get(storeId) || [],
        exportedAt: new Date().toISOString()
      };
    }
    
    const allSnapshots: any = {};
    this.snapshots.forEach((snapshots, storeId) => {
      allSnapshots[storeId] = snapshots;
    });
    
    return {
      snapshots: allSnapshots,
      exportedAt: new Date().toISOString()
    };
  }
  
  public clearSnapshots(storeId?: string): void {
    if (storeId) {
      this.snapshots.delete(storeId);
    } else {
      this.snapshots.clear();
    }
  }
}

// React hooks for advanced features
export const useOfflineStatus = () => {
  const [status, setStatus] = React.useState(() => 
    OfflineManager.getInstance().getStatus()
  );
  
  React.useEffect(() => {
    const offlineManager = OfflineManager.getInstance();
    const unsubscribe = offlineManager.subscribe(() => {
      setStatus(offlineManager.getStatus());
    });
    
    return unsubscribe;
  }, []);
  
  return status;
};

export const useABTest = (testId: string) => {
  const [variant, setVariant] = React.useState(() => 
    ABTestManager.getInstance().getVariant(testId)
  );
  
  const trackEvent = React.useCallback((event: string, properties?: Record<string, any>) => {
    ABTestManager.getInstance().trackEvent(testId, event, properties);
  }, [testId]);
  
  return { variant, trackEvent };
};

export const useStateSnapshot = (storeId: string) => {
  const snapshotManager = SnapshotManager.getInstance();
  
  const takeSnapshot = React.useCallback((state: any, meta?: any) => {
    return snapshotManager.takeSnapshot(storeId, state, meta);
  }, [storeId, snapshotManager]);
  
  const getSnapshots = React.useCallback(() => {
    return snapshotManager.getSnapshots(storeId);
  }, [storeId, snapshotManager]);
  
  return { takeSnapshot, getSnapshots };
};

// Initialize advanced features
export const initializeAdvancedFeatures = (config: {
  offline?: OfflineConfig;
  abTests?: ABTestConfig[];
}) => {
  // Initialize offline manager
  if (config.offline) {
    OfflineManager.getInstance(config.offline);
  }
  
  // Register A/B tests
  if (config.abTests) {
    const abTestManager = ABTestManager.getInstance();
    config.abTests.forEach(test => {
      abTestManager.registerTest(test);
    });
  }
  
  // Initialize snapshot manager
  SnapshotManager.getInstance();
};

// Export manager instances
export const offlineManager = OfflineManager.getInstance({
  storageKey: 'touriquest-sync-queue',
  maxRetries: 3,
  maxBackoffDelay: 30000,
  retentionPeriod: 7 * 24 * 60 * 60 * 1000 // 7 days
});

export const abTestManager = ABTestManager.getInstance();
export const snapshotManager = SnapshotManager.getInstance();