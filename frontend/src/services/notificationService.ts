/**
 * Comprehensive Notification Service
 * Advanced notification management with real-time updates, push notifications, and analytics
 */

import { apiClient } from './api';
import { NOTIFICATION_ENDPOINTS } from '../types/api-endpoints';
import type {
  Notification,
  NotificationSettings,
  NotificationFilters,
  NotificationHistory,
  PushSubscription,
  NotificationAnalytics,
  NotificationTemplate,
  NotificationTest,
  NotificationPreview,
  NotificationListResponse,
  NotificationSettingsResponse,
  PushSubscriptionResponse,
  NotificationAnalyticsResponse,
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
  NotificationCategory,
  NotificationType
} from '../types/notification-types';

// ============================================================================
// NOTIFICATION SERVICE CLASS
// ============================================================================

class NotificationService {
  private eventListeners: Map<string, Function[]> = new Map();
  private webSocket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private unreadCount = 0;

  // ========================================================================
  // CORE NOTIFICATION METHODS
  // ========================================================================

  /**
   * Get user notifications with advanced filtering and pagination
   */
  async getNotifications(params: {
    page?: number;
    limit?: number;
    filters?: Partial<NotificationFilters>;
    includeRead?: boolean;
    groupBy?: string;
  } = {}): Promise<NotificationListResponse> {
    const { page = 1, limit = 20, filters = {}, includeRead = true, groupBy } = params;
    
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      include_read: includeRead.toString(),
      ...(groupBy && { group_by: groupBy }),
    });

    // Add filter parameters
    if (filters.status?.length) {
      queryParams.append('status', filters.status.join(','));
    }
    if (filters.priority?.length) {
      queryParams.append('priority', filters.priority.join(','));
    }
    if (filters.category?.length) {
      queryParams.append('category', filters.category.join(','));
    }
    if (filters.type?.length) {
      queryParams.append('type', filters.type.join(','));
    }
    if (filters.channel?.length) {
      queryParams.append('channel', filters.channel.join(','));
    }
    if (filters.search) {
      queryParams.append('search', filters.search);
    }
    if (filters.startDate) {
      queryParams.append('start_date', filters.startDate);
    }
    if (filters.endDate) {
      queryParams.append('end_date', filters.endDate);
    }
    if (filters.hasActions !== undefined) {
      queryParams.append('has_actions', filters.hasActions.toString());
    }
    if (filters.isRead !== undefined) {
      queryParams.append('is_read', filters.isRead.toString());
    }
    if (filters.groupId) {
      queryParams.append('group_id', filters.groupId);
    }
    if (filters.threadId) {
      queryParams.append('thread_id', filters.threadId);
    }
    if (filters.sortBy) {
      queryParams.append('sort_by', filters.sortBy);
    }
    if (filters.sortOrder) {
      queryParams.append('sort_order', filters.sortOrder);
    }

    const response = await apiClient.get<NotificationListResponse>(
      `${NOTIFICATION_ENDPOINTS.LIST}?${queryParams}`
    );
    
    this.unreadCount = response.data.unreadCount;
    this.emit('unreadCountUpdated', this.unreadCount);
    
    return response.data;
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<number> {
    const response = await apiClient.get<{ count: number }>(
      `${NOTIFICATION_ENDPOINTS.LIST}?unread_only=true&count_only=true`
    );
    
    this.unreadCount = response.data.count;
    this.emit('unreadCountUpdated', this.unreadCount);
    
    return response.data.count;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    await apiClient.put(NOTIFICATION_ENDPOINTS.MARK_READ(notificationId));
    
    this.unreadCount = Math.max(0, this.unreadCount - 1);
    this.emit('unreadCountUpdated', this.unreadCount);
    this.emit('notificationRead', notificationId);
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    await apiClient.put(NOTIFICATION_ENDPOINTS.READ_ALL);
    
    this.unreadCount = 0;
    this.emit('unreadCountUpdated', this.unreadCount);
    this.emit('allNotificationsRead');
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    await apiClient.delete(NOTIFICATION_ENDPOINTS.DELETE(notificationId));
    this.emit('notificationDeleted', notificationId);
  }

  /**
   * Delete multiple notifications
   */
  async deleteNotifications(notificationIds: string[]): Promise<void> {
    await apiClient.post(`${NOTIFICATION_ENDPOINTS.LIST}bulk-delete`, {
      notification_ids: notificationIds
    });
    this.emit('notificationsDeleted', notificationIds);
  }

  /**
   * Send notification (admin only)
   */
  async sendNotification(notification: {
    recipientIds: string[];
    type: NotificationType;
    category: NotificationCategory;
    priority: NotificationPriority;
    title: string;
    message: string;
    data?: Record<string, any>;
    channels: NotificationChannel[];
    scheduledFor?: string;
    templateId?: string;
  }): Promise<{ notificationId: string }> {
    const response = await apiClient.post<{ notificationId: string }>(
      NOTIFICATION_ENDPOINTS.SEND,
      notification
    );
    
    return response.data;
  }

  /**
   * Broadcast notification to all users (admin only)
   */
  async broadcastNotification(notification: {
    type: NotificationType;
    category: NotificationCategory;
    priority: NotificationPriority;
    title: string;
    message: string;
    data?: Record<string, any>;
    channels: NotificationChannel[];
    targetSegment?: string;
    scheduledFor?: string;
  }): Promise<{ broadcastId: string }> {
    const response = await apiClient.post<{ broadcastId: string }>(
      NOTIFICATION_ENDPOINTS.BROADCAST,
      notification
    );
    
    return response.data;
  }

  // ========================================================================
  // NOTIFICATION SETTINGS MANAGEMENT
  // ========================================================================

  /**
   * Get user notification settings
   */
  async getSettings(): Promise<NotificationSettingsResponse> {
    const response = await apiClient.get<NotificationSettingsResponse>(
      NOTIFICATION_ENDPOINTS.SETTINGS
    );
    
    return response.data;
  }

  /**
   * Update notification settings
   */
  async updateSettings(settings: Partial<NotificationSettings>): Promise<NotificationSettings> {
    const response = await apiClient.put<{ settings: NotificationSettings }>(
      NOTIFICATION_ENDPOINTS.SETTINGS,
      settings
    );
    
    this.emit('settingsUpdated', response.data.settings);
    return response.data.settings;
  }

  /**
   * Update category preferences
   */
  async updateCategoryPreferences(categoryPreferences: Record<string, any>): Promise<void> {
    await apiClient.put(`${NOTIFICATION_ENDPOINTS.SETTINGS}/categories`, {
      category_preferences: categoryPreferences
    });
    
    this.emit('categoryPreferencesUpdated', categoryPreferences);
  }

  /**
   * Update channel preferences
   */
  async updateChannelPreferences(channelPreferences: Record<string, any>): Promise<void> {
    await apiClient.put(`${NOTIFICATION_ENDPOINTS.SETTINGS}/channels`, {
      channel_preferences: channelPreferences
    });
    
    this.emit('channelPreferencesUpdated', channelPreferences);
  }

  /**
   * Set quiet hours
   */
  async setQuietHours(quietHours: {
    enabled: boolean;
    startTime: string;
    endTime: string;
    days: string[];
    urgentOverride: boolean;
  }): Promise<void> {
    await apiClient.put(`${NOTIFICATION_ENDPOINTS.SETTINGS}/quiet-hours`, {
      quiet_hours: quietHours
    });
    
    this.emit('quietHoursUpdated', quietHours);
  }

  // ========================================================================
  // PUSH NOTIFICATION MANAGEMENT
  // ========================================================================

  /**
   * Subscribe to push notifications
   */
  async subscribeToPushNotifications(subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
    platform: 'web' | 'ios' | 'android';
    userAgent?: string;
  }): Promise<PushSubscriptionResponse> {
    const response = await apiClient.post<PushSubscriptionResponse>(
      NOTIFICATION_ENDPOINTS.PUSH_SUBSCRIBE,
      subscription
    );
    
    this.emit('pushSubscribed', response.data);
    return response.data;
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribeFromPushNotifications(endpoint?: string): Promise<void> {
    await apiClient.post(NOTIFICATION_ENDPOINTS.PUSH_UNSUBSCRIBE, {
      endpoint
    });
    
    this.emit('pushUnsubscribed');
  }

  /**
   * Get push subscription status
   */
  async getPushSubscriptionStatus(): Promise<{
    subscribed: boolean;
    subscription?: PushSubscription;
    vapidPublicKey?: string;
  }> {
    const response = await apiClient.get<{
      subscribed: boolean;
      subscription?: PushSubscription;
      vapidPublicKey?: string;
    }>(`${NOTIFICATION_ENDPOINTS.PUSH_SUBSCRIBE}/status`);
    
    return response.data;
  }

  /**
   * Request push notification permission and subscribe
   */
  async requestPushPermission(): Promise<{
    granted: boolean;
    subscription?: PushSubscriptionResponse;
  }> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      throw new Error('Push messaging is not supported');
    }

    const permission = await Notification.requestPermission();
    
    if (permission !== 'granted') {
      return { granted: false };
    }

    try {
      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;
      
      // Get VAPID public key
      const statusResponse = await this.getPushSubscriptionStatus();
      
      if (!statusResponse.vapidPublicKey) {
        throw new Error('VAPID public key not available');
      }

      // Subscribe to push notifications
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlB64ToUint8Array(statusResponse.vapidPublicKey).buffer as ArrayBuffer
      });

      const subscription = await this.subscribeToPushNotifications({
        endpoint: pushSubscription.endpoint,
        keys: {
          p256dh: this.arrayBufferToBase64(pushSubscription.getKey('p256dh')!),
          auth: this.arrayBufferToBase64(pushSubscription.getKey('auth')!)
        },
        platform: 'web',
        userAgent: navigator.userAgent
      });

      return { granted: true, subscription };
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return { granted: false };
    }
  }

  // ========================================================================
  // EMAIL NOTIFICATION MANAGEMENT
  // ========================================================================

  /**
   * Subscribe to email notifications
   */
  async subscribeToEmailNotifications(preferences: {
    categories: NotificationCategory[];
    frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
    digest: boolean;
  }): Promise<void> {
    await apiClient.post(NOTIFICATION_ENDPOINTS.EMAIL_SUBSCRIBE, preferences);
    this.emit('emailSubscribed', preferences);
  }

  /**
   * Unsubscribe from email notifications
   */
  async unsubscribeFromEmailNotifications(categories?: NotificationCategory[]): Promise<void> {
    await apiClient.post(NOTIFICATION_ENDPOINTS.EMAIL_UNSUBSCRIBE, {
      categories
    });
    this.emit('emailUnsubscribed', categories);
  }

  /**
   * Verify email address for notifications
   */
  async verifyEmailAddress(token: string): Promise<{ verified: boolean }> {
    const response = await apiClient.post<{ verified: boolean }>(
      `${NOTIFICATION_ENDPOINTS.EMAIL_SUBSCRIBE}/verify`,
      { token }
    );
    
    return response.data;
  }

  // ========================================================================
  // NOTIFICATION HISTORY & ANALYTICS
  // ========================================================================

  /**
   * Get notification history
   */
  async getNotificationHistory(params: {
    page?: number;
    limit?: number;
    filters?: Partial<NotificationFilters>;
  } = {}): Promise<NotificationHistory> {
    const { page = 1, limit = 50, filters = {} } = params;
    
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    // Add filter parameters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          queryParams.append(key, value.join(','));
        } else {
          queryParams.append(key, value.toString());
        }
      }
    });

    const response = await apiClient.get<NotificationHistory>(
      `${NOTIFICATION_ENDPOINTS.HISTORY}?${queryParams}`
    );
    
    return response.data;
  }

  /**
   * Get notification analytics
   */
  async getAnalytics(params: {
    startDate?: string;
    endDate?: string;
    groupBy?: 'day' | 'week' | 'month';
    channels?: NotificationChannel[];
    categories?: NotificationCategory[];
  } = {}): Promise<NotificationAnalyticsResponse> {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          queryParams.append(key, value.join(','));
        } else {
          queryParams.append(key, value.toString());
        }
      }
    });

    const response = await apiClient.get<NotificationAnalyticsResponse>(
      `${NOTIFICATION_ENDPOINTS.LIST}analytics?${queryParams}`
    );
    
    return response.data;
  }

  /**
   * Track notification interaction
   */
  async trackInteraction(notificationId: string, interaction: {
    type: 'click' | 'dismiss' | 'action';
    actionId?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await apiClient.post(`${NOTIFICATION_ENDPOINTS.LIST}${notificationId}/track`, {
      interaction_type: interaction.type,
      action_id: interaction.actionId,
      metadata: interaction.metadata,
      timestamp: new Date().toISOString()
    });
  }

  // ========================================================================
  // NOTIFICATION TEMPLATES
  // ========================================================================

  /**
   * Get notification templates
   */
  async getTemplates(): Promise<NotificationTemplate[]> {
    const response = await apiClient.get<{ templates: NotificationTemplate[] }>(
      `${NOTIFICATION_ENDPOINTS.LIST}templates`
    );
    
    return response.data.templates;
  }

  /**
   * Create notification template
   */
  async createTemplate(template: Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>): Promise<NotificationTemplate> {
    const response = await apiClient.post<{ template: NotificationTemplate }>(
      `${NOTIFICATION_ENDPOINTS.LIST}templates`,
      template
    );
    
    return response.data.template;
  }

  /**
   * Update notification template
   */
  async updateTemplate(templateId: string, template: Partial<NotificationTemplate>): Promise<NotificationTemplate> {
    const response = await apiClient.put<{ template: NotificationTemplate }>(
      `${NOTIFICATION_ENDPOINTS.LIST}templates/${templateId}`,
      template
    );
    
    return response.data.template;
  }

  /**
   * Preview notification template
   */
  async previewTemplate(templateId: string, data: Record<string, any>, channel: NotificationChannel): Promise<NotificationPreview> {
    const response = await apiClient.post<NotificationPreview>(
      `${NOTIFICATION_ENDPOINTS.LIST}templates/${templateId}/preview`,
      { data, channel }
    );
    
    return response.data;
  }

  // ========================================================================
  // NOTIFICATION TESTING
  // ========================================================================

  /**
   * Send test notification
   */
  async sendTestNotification(test: {
    templateId?: string;
    recipients: { type: string; identifier: string }[];
    channels: NotificationChannel[];
    testData?: Record<string, any>;
  }): Promise<NotificationTest> {
    const response = await apiClient.post<NotificationTest>(
      `${NOTIFICATION_ENDPOINTS.LIST}test`,
      test
    );
    
    return response.data;
  }

  /**
   * Get test results
   */
  async getTestResults(testId: string): Promise<NotificationTest> {
    const response = await apiClient.get<NotificationTest>(
      `${NOTIFICATION_ENDPOINTS.LIST}test/${testId}`
    );
    
    return response.data;
  }

  // ========================================================================
  // REAL-TIME NOTIFICATIONS
  // ========================================================================

  /**
   * Connect to real-time notification updates
   */
  connectRealTime(): void {
    if (this.webSocket?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    const token = localStorage.getItem('accessToken');
    if (!token) {
      console.warn('No access token available for WebSocket connection');
      return;
    }

    const wsUrl = `${process.env.VITE_WS_BASE_URL || 'ws://localhost:8000'}/ws/notifications?token=${token}`;
    
    try {
      this.webSocket = new WebSocket(wsUrl);
      
      this.webSocket.onopen = () => {
        console.log('Notification WebSocket connected');
        this.reconnectAttempts = 0;
        this.emit('connected');
      };
      
      this.webSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleRealtimeNotification(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
      
      this.webSocket.onclose = () => {
        console.log('Notification WebSocket disconnected');
        this.emit('disconnected');
        this.attemptReconnect();
      };
      
      this.webSocket.onerror = (error) => {
        console.error('Notification WebSocket error:', error);
        this.emit('error', error);
      };
    } catch (error) {
      console.error('Failed to connect to notification WebSocket:', error);
    }
  }

  /**
   * Disconnect from real-time updates
   */
  disconnectRealTime(): void {
    if (this.webSocket) {
      this.webSocket.close();
      this.webSocket = null;
    }
  }

  /**
   * Handle real-time notification
   */
  private handleRealtimeNotification(data: any): void {
    const { type, payload } = data;
    
    switch (type) {
      case 'new_notification':
        this.unreadCount++;
        this.emit('newNotification', payload);
        this.emit('unreadCountUpdated', this.unreadCount);
        break;
        
      case 'notification_read':
        this.unreadCount = Math.max(0, this.unreadCount - 1);
        this.emit('notificationRead', payload.notificationId);
        this.emit('unreadCountUpdated', this.unreadCount);
        break;
        
      case 'notification_deleted':
        this.emit('notificationDeleted', payload.notificationId);
        break;
        
      case 'settings_updated':
        this.emit('settingsUpdated', payload.settings);
        break;
        
      case 'unread_count':
        this.unreadCount = payload.count;
        this.emit('unreadCountUpdated', this.unreadCount);
        break;
        
      default:
        console.log('Unknown notification event type:', type);
    }
  }

  /**
   * Attempt to reconnect WebSocket
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max WebSocket reconnection attempts reached');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    setTimeout(() => {
      console.log(`Attempting to reconnect WebSocket (attempt ${this.reconnectAttempts})`);
      this.connectRealTime();
    }, delay);
  }

  // ========================================================================
  // EVENT HANDLING
  // ========================================================================

  /**
   * Add event listener
   */
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /**
   * Remove event listener
   */
  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit event
   */
  private emit(event: string, ...args: any[]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Error in notification event listener for ${event}:`, error);
        }
      });
    }
  }

  // ========================================================================
  // UTILITY METHODS
  // ========================================================================

  /**
   * Convert URL-safe base64 to Uint8Array
   */
  private urlB64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Convert ArrayBuffer to base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  /**
   * Get current unread count
   */
  getUnreadCountSync(): number {
    return this.unreadCount;
  }

  /**
   * Check if real-time connection is active
   */
  isConnected(): boolean {
    return this.webSocket?.readyState === WebSocket.OPEN;
  }
}

// ============================================================================
// EXPORT NOTIFICATION SERVICE INSTANCE
// ============================================================================

export const notificationService = new NotificationService();
export default notificationService;