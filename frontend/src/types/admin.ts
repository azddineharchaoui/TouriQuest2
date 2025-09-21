import { ApiResponse, PaginatedResponse } from './common';
import { User } from './auth';

// Admin Types
export interface AdminDashboard {
  stats: {
    totalUsers: number;
    totalProperties: number;
    totalBookings: number;
    pendingReviews: number;
  };
  recentActivity: AdminActivity[];
  systemHealth: SystemHealth;
  alerts: SystemAlert[];
}

export interface AdminActivity {
  id: string;
  type: 'user_registration' | 'booking_created' | 'review_submitted' | 'system_event';
  description: string;
  userId?: string;
  metadata: Record<string, any>;
  timestamp: string;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical';
  services: Array<{
    name: string;
    status: 'up' | 'down' | 'degraded';
    responseTime: number;
    lastCheck: string;
  }>;
  database: {
    status: 'connected' | 'disconnected';
    connections: number;
    maxConnections: number;
  };
  cache: {
    status: 'connected' | 'disconnected';
    hitRate: number;
    memoryUsage: number;
  };
}

export interface SystemAlert {
  id: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  source: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface ContentItem {
  id: string;
  type: 'property' | 'poi' | 'experience' | 'article' | 'page';
  title: string;
  status: 'draft' | 'published' | 'archived';
  authorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
  isActive: boolean;
}

export interface UserRole {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  userCount: number;
}

// API Response Types
export type AdminDashboardResponse = ApiResponse<AdminDashboard>;
export type AdminUsersResponse = ApiResponse<PaginatedResponse<User>>;
export type AdminContentResponse = ApiResponse<PaginatedResponse<ContentItem>>;
export type SystemHealthResponse = ApiResponse<SystemHealth>;