import { ApiResponse, Price } from './common';

// Analytics Types
export interface AnalyticsDashboard {
  overview: {
    totalUsers: number;
    totalBookings: number;
    totalRevenue: Price;
    conversionRate: number;
  };
  trends: {
    users: Array<{ date: string; count: number }>;
    bookings: Array<{ date: string; count: number; revenue: number }>;
    traffic: Array<{ date: string; sessions: number; pageViews: number }>;
  };
  topPerformers: {
    properties: Array<{ id: string; name: string; bookings: number; revenue: Price }>;
    experiences: Array<{ id: string; name: string; bookings: number; revenue: Price }>;
    pois: Array<{ id: string; name: string; visits: number; rating: number }>;
  };
  alerts: Array<{
    type: 'warning' | 'error' | 'info';
    message: string;
    value: number;
    threshold: number;
  }>;
}

export interface UserAnalytics {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  retentionRate: number;
  demographics: {
    countries: Array<{ country: string; percentage: number }>;
    ageGroups: Array<{ group: string; percentage: number }>;
    devices: Array<{ device: string; percentage: number }>;
  };
  behavior: {
    averageSessionDuration: number;
    pagesPerSession: number;
    bounceRate: number;
  };
}

export interface RevenueAnalytics {
  totalRevenue: Price;
  monthlyRecurringRevenue: Price;
  averageOrderValue: Price;
  revenueGrowth: number;
  breakdown: {
    properties: Price;
    experiences: Price;
    fees: Price;
  };
  trends: Array<{ date: string; revenue: number; orders: number }>;
  forecasting: Array<{ date: string; predicted: number; confidence: number }>;
}

// Additional analytics interfaces...
export interface PerformanceMetrics {
  responseTime: number;
  errorRate: number;
  uptime: number;
  throughput: number;
  memoryUsage: number;
  cpuUsage: number;
}

// API Response Types
export type AnalyticsDashboardResponse = ApiResponse<AnalyticsDashboard>;
export type UserAnalyticsResponse = ApiResponse<UserAnalytics>;
export type RevenueAnalyticsResponse = ApiResponse<RevenueAnalytics>;