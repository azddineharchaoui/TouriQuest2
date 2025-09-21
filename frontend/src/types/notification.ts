import { ApiResponse, PaginatedResponse, Notification } from './common';

// Notification Types
export interface NotificationSettings {
  email: {
    bookingConfirmations: boolean;
    bookingReminders: boolean;
    cancellations: boolean;
    promotions: boolean;
    newsletter: boolean;
    systemUpdates: boolean;
  };
  push: {
    bookingConfirmations: boolean;
    bookingReminders: boolean;
    recommendations: boolean;
    nearbyEvents: boolean;
    priceAlerts: boolean;
    systemNotifications: boolean;
  };
  sms: {
    bookingConfirmations: boolean;
    emergencyAlerts: boolean;
    securityAlerts: boolean;
  };
  preferences: {
    frequency: 'immediate' | 'daily' | 'weekly';
    quietHours: {
      enabled: boolean;
      start: string;
      end: string;
    };
    language: string;
    timezone: string;
  };
}

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userId: string;
  deviceInfo: {
    platform: string;
    browser: string;
    deviceId: string;
  };
  createdAt: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: Notification['type'];
  subject: string;
  body: string;
  variables: string[];
  channels: Array<'email' | 'push' | 'sms'>;
  isActive: boolean;
}

export interface BroadcastNotification {
  id: string;
  title: string;
  message: string;
  type: Notification['type'];
  targetAudience: {
    userIds?: string[];
    roles?: string[];
    locations?: string[];
    interests?: string[];
    allUsers?: boolean;
  };
  scheduling: {
    sendAt?: string;
    timezone: string;
  };
  channels: Array<'email' | 'push' | 'sms'>;
  status: 'draft' | 'scheduled' | 'sent' | 'cancelled';
  stats?: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
  };
  createdAt: string;
}

// API Response Types
export type NotificationsResponse = ApiResponse<PaginatedResponse<Notification>>;
export type NotificationSettingsResponse = ApiResponse<NotificationSettings>;
export type BroadcastNotificationResponse = ApiResponse<BroadcastNotification>;