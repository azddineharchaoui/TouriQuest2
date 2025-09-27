/**
 * Advanced Server State Management with TanStack Query
 * Enterprise-grade server state synchronization with intelligent caching
 */

import { QueryClient, QueryClientProvider, useQuery, useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import React from 'react';
import { QueryConfig, OptimisticUpdate, RealtimeConfig, RealtimeMessage } from '../types';

// Enhanced Query Client Configuration
export const createQueryClient = (): QueryClient => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        cacheTime: 10 * 60 * 1000, // 10 minutes
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        retry: (failureCount: number, error: any) => {
          // Don't retry for 4xx errors except 408 (timeout)
          if (error?.status >= 400 && error?.status < 500 && error?.status !== 408) {
            return false;
          }
          // Retry up to 3 times with exponential backoff
          return failureCount < 3;
        },
        retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
        // Intelligent background refetching
        refetchInterval: (data, query) => {
          // Refetch more frequently for critical data
          if (query.queryKey.includes('notifications') || query.queryKey.includes('bookings')) {
            return 30 * 1000; // 30 seconds
          }
          // Standard interval for regular data
          return 5 * 60 * 1000; // 5 minutes
        }
      },
      mutations: {
        retry: (failureCount: number, error: any) => {
          // Only retry for network errors and 5xx errors
          return (error?.status >= 500 || !error?.status) && failureCount < 2;
        },
        retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000)
      }
    }
  });
};

// Global query client instance
export const queryClient = createQueryClient();

// Advanced Query Hooks with Intelligent Caching
export interface UseAdvancedQueryOptions<T> extends QueryConfig {
  queryKey: (string | number)[];
  queryFn: () => Promise<T>;
  enabled?: boolean;
  placeholderData?: T;
  optimisticUpdates?: boolean;
  prefetchRelated?: string[];
  invalidateOn?: string[];
}

export function useAdvancedQuery<T>(options: UseAdvancedQueryOptions<T>) {
  const queryClient = useQueryClient();
  
  // Prefetch related queries
  React.useEffect(() => {
    if (options.prefetchRelated) {
      options.prefetchRelated.forEach(relatedKey => {
        queryClient.prefetchQuery([relatedKey]);
      });
    }
  }, [options.prefetchRelated, queryClient]);
  
  return useQuery({
    queryKey: options.queryKey,
    queryFn: options.queryFn,
    enabled: options.enabled,
    staleTime: options.staleTime,
    cacheTime: options.cacheTime,
    refetchOnWindowFocus: options.refetchOnWindowFocus,
    refetchOnReconnect: options.refetchOnReconnect,
    retry: options.retry,
    retryDelay: options.retryDelay,
    placeholderData: options.placeholderData,
    onSuccess: (data) => {
      // Auto-invalidate related queries
      if (options.invalidateOn) {
        options.invalidateOn.forEach(key => {
          queryClient.invalidateQueries([key]);
        });
      }
    }
  });
}

// Optimistic Mutation Hook
export interface UseOptimisticMutationOptions<TData, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onOptimisticUpdate?: (variables: TVariables) => void;
  onMutate?: (variables: TVariables) => Promise<any>;
  onError?: (error: any, variables: TVariables, context?: any) => void;
  onSuccess?: (data: TData, variables: TVariables, context?: any) => void;
  invalidateQueries?: string[][];
  updateQueries?: Array<{
    queryKey: string[];
    updater: (oldData: any, newData: TData, variables: TVariables) => any;
  }>;
}

export function useOptimisticMutation<TData, TVariables>(
  options: UseOptimisticMutationOptions<TData, TVariables>
) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: options.mutationFn,
    onMutate: async (variables: TVariables) => {
      // Cancel outgoing refetches
      if (options.updateQueries) {
        await Promise.all(
          options.updateQueries.map(({ queryKey }) =>
            queryClient.cancelQueries(queryKey)
          )
        );
      }
      
      // Snapshot current state for rollback
      const previousData: any = {};
      if (options.updateQueries) {
        options.updateQueries.forEach(({ queryKey }) => {
          previousData[queryKey.join('-')] = queryClient.getQueryData(queryKey);
        });
      }
      
      // Apply optimistic updates
      if (options.updateQueries) {
        options.updateQueries.forEach(({ queryKey, updater }) => {
          queryClient.setQueryData(queryKey, (oldData: any) => 
            updater(oldData, null as any, variables)
          );
        });
      }
      
      options.onOptimisticUpdate?.(variables);
      
      const context = await options.onMutate?.(variables);
      return { previousData, context };
    },
    onError: (error, variables, context) => {
      // Rollback optimistic updates
      if (context?.previousData && options.updateQueries) {
        options.updateQueries.forEach(({ queryKey }) => {
          queryClient.setQueryData(queryKey, context.previousData[queryKey.join('-')]);
        });
      }
      
      options.onError?.(error, variables, context);
    },
    onSuccess: (data, variables, context) => {
      // Update with actual data
      if (options.updateQueries) {
        options.updateQueries.forEach(({ queryKey, updater }) => {
          queryClient.setQueryData(queryKey, (oldData: any) => 
            updater(oldData, data, variables)
          );
        });
      }
      
      options.onSuccess?.(data, variables, context);
    },
    onSettled: () => {
      // Invalidate and refetch related queries
      if (options.invalidateQueries) {
        options.invalidateQueries.forEach(queryKey => {
          queryClient.invalidateQueries(queryKey);
        });
      }
    }
  });
}

// Infinite Query with Intelligent Prefetching
export interface UseInfiniteQueryOptions<T> {
  queryKey: (string | number)[];
  queryFn: ({ pageParam }: { pageParam?: any }) => Promise<T>;
  getNextPageParam: (lastPage: T, allPages: T[]) => any;
  getPreviousPageParam?: (firstPage: T, allPages: T[]) => any;
  enabled?: boolean;
  prefetchPages?: number;
}

export function useAdvancedInfiniteQuery<T>(options: UseInfiniteQueryOptions<T>) {
  const query = useInfiniteQuery({
    queryKey: options.queryKey,
    queryFn: options.queryFn,
    getNextPageParam: options.getNextPageParam,
    getPreviousPageParam: options.getPreviousPageParam,
    enabled: options.enabled
  });
  
  // Intelligent prefetching
  React.useEffect(() => {
    if (options.prefetchPages && query.data?.pages.length) {
      const currentPageCount = query.data.pages.length;
      const shouldPrefetch = currentPageCount < options.prefetchPages;
      
      if (shouldPrefetch && query.hasNextPage && !query.isFetchingNextPage) {
        query.fetchNextPage();
      }
    }
  }, [query.data?.pages.length, options.prefetchPages, query.hasNextPage, query.isFetchingNextPage]);
  
  return query;
}

// Real-time Synchronization Hook
export function useRealtimeSync(config: RealtimeConfig) {
  const queryClient = useQueryClient();
  const [socket, setSocket] = React.useState<WebSocket | null>(null);
  const [connectionState, setConnectionState] = React.useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  
  React.useEffect(() => {
    if (!config.enabled) return;
    
    let reconnectAttempts = 0;
    let reconnectTimer: NodeJS.Timeout;
    let heartbeatTimer: NodeJS.Timeout;
    
    const connect = () => {
      setConnectionState('connecting');
      const ws = new WebSocket(config.url);
      
      ws.onopen = () => {
        setConnectionState('connected');
        setSocket(ws);
        reconnectAttempts = 0;
        
        // Subscribe to channels
        config.channels.forEach(channel => {
          ws.send(JSON.stringify({
            type: 'subscribe',
            channel
          }));
        });
        
        // Start heartbeat
        heartbeatTimer = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, config.heartbeatInterval);
      };
      
      ws.onmessage = (event) => {
        try {
          const message: RealtimeMessage = JSON.parse(event.data);
          
          switch (message.type) {
            case 'data_update':
              // Invalidate related queries
              queryClient.invalidateQueries([message.channel]);
              break;
            case 'optimistic_update':
              // Apply optimistic update
              queryClient.setQueryData([message.channel], message.data);
              break;
            case 'cache_invalidate':
              // Invalidate specific cache entries
              queryClient.invalidateQueries([message.channel]);
              break;
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
      
      ws.onclose = () => {
        setConnectionState('disconnected');
        setSocket(null);
        clearInterval(heartbeatTimer);
        
        // Attempt reconnection
        if (reconnectAttempts < config.reconnectAttempts) {
          reconnectAttempts++;
          reconnectTimer = setTimeout(connect, config.reconnectInterval * reconnectAttempts);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    };
    
    connect();
    
    return () => {
      clearTimeout(reconnectTimer);
      clearInterval(heartbeatTimer);
      if (socket) {
        socket.close();
      }
    };
  }, [config, queryClient]);
  
  return {
    socket,
    connectionState,
    send: (message: any) => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
      }
    }
  };
}

// Query Dependency Manager
export class QueryDependencyManager {
  private dependencies = new Map<string, Set<string>>();
  
  addDependency(queryKey: string, dependsOn: string[]) {
    if (!this.dependencies.has(queryKey)) {
      this.dependencies.set(queryKey, new Set());
    }
    dependsOn.forEach(dep => this.dependencies.get(queryKey)!.add(dep));
  }
  
  getDependents(queryKey: string): string[] {
    const dependents: string[] = [];
    this.dependencies.forEach((deps, key) => {
      if (deps.has(queryKey)) {
        dependents.push(key);
      }
    });
    return dependents;
  }
  
  invalidateWithDependencies(queryClient: QueryClient, queryKey: string) {
    // Invalidate the query itself
    queryClient.invalidateQueries([queryKey]);
    
    // Invalidate all dependent queries
    const dependents = this.getDependents(queryKey);
    dependents.forEach(dependent => {
      queryClient.invalidateQueries([dependent]);
    });
  }
}

export const queryDependencyManager = new QueryDependencyManager();

// Memory Management for Large Datasets
export function useQueryMemoryManagement() {
  const queryClient = useQueryClient();
  
  React.useEffect(() => {
    const interval = setInterval(() => {
      const cache = queryClient.getQueryCache();
      const queries = cache.getAll();
      
      // Remove old unused queries
      queries.forEach(query => {
        const lastUpdated = query.state.dataUpdatedAt;
        const isStale = Date.now() - lastUpdated > 30 * 60 * 1000; // 30 minutes
        const hasObservers = query.getObserversCount() === 0;
        
        if (isStale && hasObservers) {
          cache.remove(query);
        }
      });
    }, 5 * 60 * 1000); // Check every 5 minutes
    
    return () => clearInterval(interval);
  }, [queryClient]);
}

// Query Client Provider with Configuration
interface QueryClientProviderProps {
  children: React.ReactNode;
  client?: QueryClient;
}

export function TouriquestQueryClientProvider({ children, client = queryClient }: QueryClientProviderProps) {
  return (
    <QueryClientProvider client={client}>
      {children}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}

// Export hooks and utilities
export {
  useQuery,
  useMutation,
  useInfiniteQuery,
  useQueryClient
} from '@tanstack/react-query';