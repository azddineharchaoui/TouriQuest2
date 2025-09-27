/**
 * Type extensions for TouriQuest API Client
 */

import 'axios';

declare module 'axios' {
  export interface InternalAxiosRequestConfig {
    metadata?: {
      requestId: string;
      startTime: number;
      priority: 'low' | 'normal' | 'high';
      retryCount: number;
      cached: boolean;
      compression: boolean;
      timeout: number;
      circuitBreaker?: string;
      tags?: string[];
      [key: string]: any;
    };
  }
}

export {};