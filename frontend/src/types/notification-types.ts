/**
 * Comprehensive Notification System Types
 * Advanced notification management for TouriQuest platform
 */

// ============================================================================
// CORE NOTIFICATION INTERFACES
// ============================================================================

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  category: NotificationCategory;
  priority: NotificationPriority;
  status: NotificationStatus;
  
  // Content
  title: string;
  message: string;
  data?: Record<string, any>;
  metadata?: NotificationMetadata;
  
  // Channels
  channels: NotificationChannel[];
  deliveryStatus: Record<NotificationChannel, DeliveryStatus>;
  
  // Scheduling
  scheduledFor?: string;
  expiresAt?: string;
  
  // Interaction
  actionable: boolean;
  actions?: NotificationAction[];
  readAt?: string;
  clickedAt?: string;
  dismissedAt?: string;
  
  // Grouping
  groupId?: string;
  threadId?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  deliveredAt?: string;
}

export interface NotificationMetadata {
  // Source tracking
  source: string;
  campaign?: string;
  experiment?: string;
  
  // Rich content
  imageUrl?: string;
  iconUrl?: string;
  badgeUrl?: string;
  sound?: string;
  
  // Deep linking
  deepLink?: string;
  webUrl?: string;
  
  // Tracking
  trackingId?: string;
  analyticsData?: Record<string, any>;
  
  // Localization
  locale?: string;
  timezone?: string;
  
  // Personalization
  personalizationScore?: number;
  relevanceScore?: number;
}

export interface NotificationAction {
  id: string;
  label: string;
  type: 'primary' | 'secondary' | 'destructive';
  action: string;
  payload?: Record<string, any>;
  style?: {
    icon?: string;
    color?: string;
  };
}

// ============================================================================
// NOTIFICATION ENUMS
// ============================================================================

export type NotificationType = 
  // Booking related
  | 'booking_confirmation'
  | 'booking_reminder' 
  | 'booking_cancellation'
  | 'booking_modification'
  | 'payment_success'
  | 'payment_failure'
  | 'refund_processed'
  
  // Property related
  | 'property_available'
  | 'property_price_drop'
  | 'property_review_received'
  | 'property_wishlist_update'
  
  // Experience related
  | 'experience_reminder'
  | 'experience_weather_alert'
  | 'experience_cancellation'
  | 'experience_recommendation'
  
  // User engagement
  | 'welcome'
  | 'recommendation'
  | 'achievement'
  | 'social_activity'
  | 'referral_reward'
  
  // System notifications
  | 'system_maintenance'
  | 'security_alert'
  | 'feature_announcement'
  | 'app_update'
  
  // Marketing
  | 'promotional_offer'
  | 'seasonal_campaign'
  | 'loyalty_program'
  | 'newsletter';

export type NotificationCategory = 
  | 'transactional'
  | 'promotional' 
  | 'system'
  | 'social'
  | 'security'
  | 'reminder'
  | 'update';

export type NotificationPriority = 
  | 'urgent'      // Red - Immediate attention required
  | 'high'        // Orange - Important but not urgent
  | 'medium'      // Blue - Standard notifications
  | 'low';        // Gray - Informational only

export type NotificationStatus = 
  | 'pending'     // Scheduled but not sent
  | 'sent'        // Successfully sent
  | 'delivered'   // Delivered to device/channel
  | 'read'        // User has read the notification
  | 'clicked'     // User has clicked/interacted
  | 'dismissed'   // User dismissed without reading
  | 'failed'      // Delivery failed
  | 'expired';    // Expired before delivery

export type NotificationChannel = 
  | 'in_app'      // In-app notification center
  | 'push'        // Mobile/desktop push notifications
  | 'email'       // Email notifications
  | 'sms'         // SMS notifications
  | 'webhook'     // Webhook for integrations
  | 'slack'       // Slack integration
  | 'discord';    // Discord integration

export type DeliveryStatus = 
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'bounced'
  | 'unsubscribed';

// ============================================================================
// NOTIFICATION SETTINGS & PREFERENCES
// ============================================================================

export interface NotificationSettings {
  userId: string;
  
  // Global settings
  enabled: boolean;
  quietHours: QuietHours;
  timezone: string;
  
  // Channel preferences
  channels: NotificationChannelSettings;
  
  // Category preferences
  categories: Record<NotificationCategory, CategoryPreferences>;
  
  // Advanced settings
  grouping: GroupingPreferences;
  smartFiltering: SmartFilteringSettings;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface QuietHours {
  enabled: boolean;
  startTime: string; // HH:MM format
  endTime: string;   // HH:MM format
  days: string[];    // ['monday', 'tuesday', etc.]
  urgentOverride: boolean; // Allow urgent notifications during quiet hours
}

export interface NotificationChannelSettings {
  in_app: ChannelSettings;
  push: PushChannelSettings;
  email: EmailChannelSettings;
  sms: SMSChannelSettings;
}

export interface ChannelSettings {
  enabled: boolean;
  priority: NotificationPriority[];
  categories: NotificationCategory[];
}

export interface PushChannelSettings extends ChannelSettings {
  deviceTokens: PushDeviceToken[];
  sound: boolean;
  vibration: boolean;
  badge: boolean;
  lockScreen: boolean;
}

export interface EmailChannelSettings extends ChannelSettings {
  address: string;
  verified: boolean;
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  digest: boolean;
  unsubscribeAll: boolean;
}

export interface SMSChannelSettings extends ChannelSettings {
  phoneNumber: string;
  verified: boolean;
  carrier?: string;
}

export interface PushDeviceToken {
  token: string;
  platform: 'web' | 'ios' | 'android';
  deviceId: string;
  userAgent?: string;
  registeredAt: string;
  lastUsed: string;
}

export interface CategoryPreferences {
  enabled: boolean;
  channels: NotificationChannel[];
  priority: NotificationPriority;
  frequency: 'immediate' | 'batched' | 'digest';
  smartFiltering: boolean;
}

export interface GroupingPreferences {
  enabled: boolean;
  timeWindow: number; // Minutes
  maxGroupSize: number;
  groupByType: boolean;
  groupBySource: boolean;
}

export interface SmartFilteringSettings {
  enabled: boolean;
  duplicateDetection: boolean;
  relevanceThreshold: number; // 0-1 score
  spamFiltering: boolean;
  mlPersonalization: boolean;
}

// ============================================================================
// PUSH NOTIFICATION INTEGRATION
// ============================================================================

export interface PushSubscription {
  id?: string;
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  platform: 'web' | 'ios' | 'android';
  userAgent?: string;
  createdAt: string;
  lastUsed: string;
  active: boolean;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  data?: Record<string, any>;
  actions?: PushNotificationAction[];
  silent?: boolean;
  requireInteraction?: boolean;
  renotify?: boolean;
  timestamp?: number;
}

export interface PushNotificationAction {
  action: string;
  title: string;
  icon?: string;
}

// ============================================================================
// NOTIFICATION ANALYTICS & TRACKING
// ============================================================================

export interface NotificationAnalytics {
  notificationId: string;
  
  // Delivery metrics
  sentAt: string;
  deliveredAt?: string;
  readAt?: string;
  clickedAt?: string;
  dismissedAt?: string;
  
  // Channel tracking
  channel: NotificationChannel;
  deliveryLatency?: number; // milliseconds
  
  // User interaction
  timeToRead?: number;      // seconds
  timeToClick?: number;     // seconds
  clickThroughRate?: number;
  
  // Device/context
  deviceType?: string;
  platform?: string;
  location?: string;
  
  // A/B testing
  variant?: string;
  experiment?: string;
}

export interface NotificationMetrics {
  // Aggregate metrics
  totalSent: number;
  totalDelivered: number;
  totalRead: number;
  totalClicked: number;
  totalDismissed: number;
  
  // Rates
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  dismissalRate: number;
  
  // Performance
  averageDeliveryTime: number;
  averageTimeToRead: number;
  averageTimeToClick: number;
  
  // Channel breakdown
  channelMetrics: Record<NotificationChannel, ChannelMetrics>;
  
  // Time series data
  timeRange: string;
  dataPoints: MetricDataPoint[];
}

export interface ChannelMetrics {
  sent: number;
  delivered: number;
  failed: number;
  deliveryRate: number;
  averageLatency: number;
}

export interface MetricDataPoint {
  timestamp: string;
  sent: number;
  delivered: number;
  read: number;
  clicked: number;
}

// ============================================================================
// NOTIFICATION TEMPLATES & CUSTOMIZATION
// ============================================================================

export interface NotificationTemplate {
  id: string;
  name: string;
  type: NotificationType;
  category: NotificationCategory;
  
  // Template content
  title: string;
  message: string;
  
  // Localization
  localizations: Record<string, TemplateLocalization>;
  
  // Variables
  variables: TemplateVariable[];
  
  // Styling
  style: TemplateStyle;
  
  // Behavior
  behavior: TemplateBehavior;
  
  // Metadata
  version: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  active: boolean;
}

export interface TemplateLocalization {
  locale: string;
  title: string;
  message: string;
  variables?: Record<string, string>;
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'date' | 'currency' | 'image' | 'url';
  required: boolean;
  defaultValue?: any;
  description?: string;
}

export interface TemplateStyle {
  // Colors
  primaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  
  // Icons & Images
  iconUrl?: string;
  imageUrl?: string;
  badgeUrl?: string;
  
  // Layout
  layout: 'compact' | 'expanded' | 'card';
  
  // Branding
  brandLogo?: string;
  brandColors?: {
    primary: string;
    secondary: string;
  };
}

export interface TemplateBehavior {
  // Timing
  ttl?: number; // Time to live in seconds
  delay?: number; // Delay before sending in seconds
  
  // Actions
  actions: NotificationAction[];
  
  // Deep linking
  clickAction?: string;
  deepLink?: string;
  
  // Grouping
  groupKey?: string;
  collapseKey?: string;
  
  // Channels
  preferredChannels: NotificationChannel[];
  fallbackChannels: NotificationChannel[];
}

// ============================================================================
// NOTIFICATION TESTING & PREVIEW
// ============================================================================

export interface NotificationTest {
  id: string;
  name: string;
  templateId?: string;
  
  // Test configuration
  recipients: TestRecipient[];
  channels: NotificationChannel[];
  
  // Test data
  testData: Record<string, any>;
  
  // Results
  status: 'pending' | 'running' | 'completed' | 'failed';
  results?: TestResult[];
  
  // Metadata
  createdAt: string;
  completedAt?: string;
  createdBy: string;
}

export interface TestRecipient {
  type: 'user' | 'email' | 'phone' | 'device';
  identifier: string;
  metadata?: Record<string, any>;
}

export interface TestResult {
  recipient: TestRecipient;
  channel: NotificationChannel;
  status: 'success' | 'failed';
  deliveredAt?: string;
  error?: string;
  latency?: number;
}

export interface NotificationPreview {
  template: NotificationTemplate;
  channel: NotificationChannel;
  data: Record<string, any>;
  
  // Rendered content
  renderedTitle: string;
  renderedMessage: string;
  renderedStyle: TemplateStyle;
  
  // Preview metadata
  previewId: string;
  generatedAt: string;
  locale: string;
}

// ============================================================================
// NOTIFICATION HISTORY & SEARCH
// ============================================================================

export interface NotificationHistory {
  notifications: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: NotificationFilters;
}

export interface NotificationFilters {
  // Time range
  startDate?: string;
  endDate?: string;
  
  // Status filters
  status?: NotificationStatus[];
  priority?: NotificationPriority[];
  category?: NotificationCategory[];
  type?: NotificationType[];
  channel?: NotificationChannel[];
  
  // Content filters
  search?: string;
  hasActions?: boolean;
  isRead?: boolean;
  
  // Grouping
  groupId?: string;
  threadId?: string;
  
  // Sorting
  sortBy: 'created' | 'updated' | 'priority' | 'status';
  sortOrder: 'asc' | 'desc';
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface NotificationListResponse {
  notifications: Notification[];
  unreadCount: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  groupedNotifications?: GroupedNotifications;
}

export interface GroupedNotifications {
  [groupId: string]: {
    id: string;
    type: string;
    count: number;
    latestNotification: Notification;
    notifications: Notification[];
    createdAt: string;
  };
}

export interface NotificationSettingsResponse {
  settings: NotificationSettings;
  availableChannels: NotificationChannel[];
  availableCategories: NotificationCategory[];
  quotaLimits: {
    daily: number;
    monthly: number;
    current: number;
  };
}

export interface PushSubscriptionResponse {
  subscription: PushSubscription;
  vapidPublicKey: string;
}

export interface NotificationAnalyticsResponse {
  metrics: NotificationMetrics;
  trends: {
    deliveryRate: number;
    openRate: number;
    clickRate: number;
    periodComparison: number;
  };
  recommendations: string[];
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface NotificationError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export type NotificationErrorCode = 
  | 'INVALID_RECIPIENT'
  | 'QUOTA_EXCEEDED'
  | 'CHANNEL_UNAVAILABLE'
  | 'TEMPLATE_NOT_FOUND'
  | 'SUBSCRIPTION_EXPIRED'
  | 'DELIVERY_FAILED'
  | 'PERMISSION_DENIED';

// ============================================================================
// EXPORT TYPES
// ============================================================================

export type {
  // Core types
  Notification as NotificationInterface,
  NotificationSettings as NotificationSettingsType,
  NotificationAnalytics as NotificationAnalyticsType,
  
  // Template types
  NotificationTemplate as NotificationTemplateType,
  NotificationPreview as NotificationPreviewType,
  
  // Response types
  NotificationListResponse as NotificationListResponseType,
  NotificationSettingsResponse as NotificationSettingsResponseType,
};