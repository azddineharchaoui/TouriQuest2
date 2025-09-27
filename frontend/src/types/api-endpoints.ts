/**
 * TouriQuest Backend API Endpoints Reference
 * Complete mapping of all 14 microservices and their endpoints
 * Total: 200+ endpoints across all services
 */

// Base API URL
export const API_BASE_URL = '/api/v1';

// ============================================================================
// 1. AUTHENTICATION SERVICE (/api/v1/auth/)
// ============================================================================
export const AUTH_ENDPOINTS = {
  // Core Authentication
  REGISTER: '/auth/register',                    // POST - User registration
  LOGIN: '/auth/login',                         // POST - User authentication
  LOGOUT: '/auth/logout',                       // POST - User logout
  REFRESH: '/auth/refresh',                     // POST - Token refresh
  
  // Password Management
  FORGOT_PASSWORD: '/auth/forgot-password',     // POST - Password reset request
  RESET_PASSWORD: '/auth/reset-password',       // POST - Password reset confirmation
  CHANGE_PASSWORD: '/auth/change-password',     // POST - Change password
  
  // Email Verification
  VERIFY_EMAIL: '/auth/verify-email',           // POST - Email verification
  RESEND_VERIFICATION: '/auth/resend-verification', // POST - Resend verification email
  
  // Profile Management
  PROFILE: '/auth/profile',                     // GET/PUT - Get/Update user profile
  
  // OAuth Integration
  OAUTH_GOOGLE: '/auth/oauth/google',           // POST - Google OAuth
  OAUTH_FACEBOOK: '/auth/oauth/facebook',       // POST - Facebook OAuth
  OAUTH_APPLE: '/auth/oauth/apple',             // POST - Apple OAuth
  
  // Two-Factor Authentication
  TWO_FA_SETUP: '/auth/2fa/setup',              // POST - Setup 2FA
  TWO_FA_VERIFY: '/auth/2fa/verify',            // POST - Verify 2FA
  TWO_FA_DISABLE: '/auth/2fa/disable',          // POST - Disable 2FA
  
  // Onboarding
  ONBOARDING_STATUS: '/auth/onboarding/status', // GET - Get onboarding status
  ONBOARDING_COMPLETE: '/auth/onboarding/complete', // POST - Complete onboarding
} as const;

// ============================================================================
// 2. PROPERTY SERVICE (/api/v1/properties/)
// ============================================================================
export const PROPERTY_ENDPOINTS = {
  // Core Property Operations
  SEARCH: '/properties/search',                 // GET - Search properties
  CREATE: '/properties/',                       // POST - Create property (admin)
  DETAILS: (id: string) => `/properties/${id}`, // GET - Get property details
  UPDATE: (id: string) => `/properties/${id}`,  // PUT - Update property (admin)
  DELETE: (id: string) => `/properties/${id}`,  // DELETE - Delete property (admin)
  
  // Booking & Availability
  AVAILABILITY: (id: string) => `/properties/${id}/availability`, // GET - Check availability
  BOOK: (id: string) => `/properties/${id}/book`,               // POST - Book property
  PRICING: (id: string) => `/properties/${id}/pricing`,         // GET - Get pricing details
  
  // Reviews & Ratings
  REVIEWS: (id: string) => `/properties/${id}/reviews`,         // GET/POST - Get/Add property reviews
  
  // Media & Content
  AMENITIES: (id: string) => `/properties/${id}/amenities`,     // GET - Get amenities
  PHOTOS: (id: string) => `/properties/${id}/photos`,           // GET/POST - Get/Upload property photos
  
  // Discovery & Recommendations
  NEARBY: (id: string) => `/properties/${id}/nearby`,           // GET - Get nearby properties
  
  // User Favorites
  FAVORITE: (id: string) => `/properties/${id}/favorite`,       // POST/DELETE - Add/Remove from favorites
  FAVORITES: '/properties/favorites',                           // GET - Get user favorites
  
  // Admin Features
  MANAGEMENT: '/properties/management',                         // GET - Property management (admin)
  ANALYTICS: '/properties/analytics',                          // GET - Property analytics (admin)
} as const;

// ============================================================================
// 3. POI SERVICE (/api/v1/pois/)
// ============================================================================
export const POI_ENDPOINTS = {
  // Core POI Operations
  SEARCH: '/pois/search',                       // GET - Search POIs
  CREATE: '/pois/',                             // POST - Create POI (admin)
  DETAILS: (id: string) => `/pois/${id}`,       // GET - Get POI details
  UPDATE: (id: string) => `/pois/${id}`,        // PUT - Update POI (admin)
  DELETE: (id: string) => `/pois/${id}`,        // DELETE - Delete POI (admin)
  
  // Reviews & Ratings
  REVIEWS: (id: string) => `/pois/${id}/reviews`, // GET/POST - Get/Add POI reviews
  
  // Media & Content
  PHOTOS: (id: string) => `/pois/${id}/photos`,   // GET/POST - Get/Upload POI photos
  
  // Discovery & Information
  NEARBY: (id: string) => `/pois/${id}/nearby`,   // GET - Get nearby POIs
  HOURS: (id: string) => `/pois/${id}/hours`,     // GET - Get operating hours
  EVENTS: (id: string) => `/pois/${id}/events`,   // GET - Get POI events
  AUDIO_GUIDE: (id: string) => `/pois/${id}/audio-guide`, // GET - Get audio guide
  
  // User Interactions
  VISIT: (id: string) => `/pois/${id}/visit`,     // POST - Mark as visited
  FAVORITE: (id: string) => `/pois/${id}/favorite`, // POST/DELETE - Add/Remove from favorites
  
  // Categories & Discovery
  CATEGORIES: '/pois/categories',                  // GET - Get POI categories
  POPULAR: '/pois/popular',                        // GET - Get popular POIs
  RECOMMENDED: '/pois/recommended',                // GET - Get recommended POIs
} as const;

// ============================================================================
// 4. EXPERIENCE SERVICE (/api/v1/experiences/)
// ============================================================================
export const EXPERIENCE_ENDPOINTS = {
  // Core Experience Operations
  SEARCH: '/experiences/search',                   // GET - Search experiences
  CREATE: '/experiences/',                         // POST - Create experience (admin)
  DETAILS: (id: string) => `/experiences/${id}`,   // GET - Get experience details
  UPDATE: (id: string) => `/experiences/${id}`,    // PUT - Update experience (admin)
  DELETE: (id: string) => `/experiences/${id}`,    // DELETE - Delete experience (admin)
  
  // Booking & Availability
  AVAILABILITY: (id: string) => `/experiences/${id}/availability`, // GET - Check availability
  BOOK: (id: string) => `/experiences/${id}/book`,                // POST - Book experience
  
  // Reviews & Ratings
  REVIEWS: (id: string) => `/experiences/${id}/reviews`,          // GET/POST - Get/Add experience reviews
  
  // Content & Media
  PHOTOS: (id: string) => `/experiences/${id}/photos`,            // GET - Get experience photos
  ITINERARY: (id: string) => `/experiences/${id}/itinerary`,      // GET - Get experience itinerary
  WEATHER: (id: string) => `/experiences/${id}/weather`,          // GET - Get weather forecast
  
  // User Interactions
  FAVORITE: (id: string) => `/experiences/${id}/favorite`,        // POST/DELETE - Add/Remove from favorites
  
  // Categories & Discovery
  CATEGORIES: '/experiences/categories',                           // GET - Get experience categories
  POPULAR: '/experiences/popular',                                 // GET - Get popular experiences
  RECOMMENDED: '/experiences/recommended',                         // GET - Get recommended experiences
} as const;

// ============================================================================
// 5. AI SERVICE (/api/v1/ai/)
// ============================================================================
export const AI_ENDPOINTS = {
  // Chat & Conversation
  CHAT: '/ai/chat',                             // POST - AI chat assistant
  CHAT_HISTORY: '/ai/chat/history',             // GET/DELETE - Get/Clear chat history
  
  // Voice & Audio
  VOICE_TRANSCRIBE: '/ai/voice/transcribe',     // POST - Voice transcription
  VOICE_SYNTHESIZE: '/ai/voice/synthesize',     // POST - Text-to-speech
  
  // Recommendations & Planning
  RECOMMENDATIONS: '/ai/recommendations',        // POST - Get AI recommendations
  ITINERARY_GENERATE: '/ai/itinerary/generate', // POST - Generate AI itinerary
  ITINERARY_OPTIMIZE: '/ai/itinerary/optimize', // POST - Optimize itinerary
  
  // Language & Text Processing
  TRANSLATE: '/ai/translate',                   // POST - Translate text
  SENTIMENT: '/ai/sentiment',                   // POST - Analyze sentiment
  EXTRACT_ENTITIES: '/ai/extract/entities',     // POST - Extract entities
  SUMMARIZE: '/ai/summarize',                   // POST - Summarize content
  
  // AI Models & Advanced Features
  MODELS: '/ai/models',                         // GET - Get available AI models
  EMBEDDINGS: '/ai/embeddings',                 // POST - Generate embeddings
  SIMILARITY: '/ai/similarity',                 // POST - Calculate similarity
} as const;

// ============================================================================
// 6. BOOKING SERVICE (/api/v1/bookings/)
// ============================================================================
export const BOOKING_ENDPOINTS = {
  // Core Booking Operations
  LIST: '/bookings/',                           // GET - Get user bookings
  CREATE: '/bookings/',                         // POST - Create booking
  DETAILS: (id: string) => `/bookings/${id}`,   // GET - Get booking details
  UPDATE: (id: string) => `/bookings/${id}`,    // PUT - Update booking
  CANCEL: (id: string) => `/bookings/${id}`,    // DELETE - Cancel booking
  MODIFY: (id: string) => `/bookings/${id}/modify`, // POST - Modify booking
  
  // Payment & Financial
  PAYMENT: (id: string) => `/bookings/${id}/payment`, // POST - Process payment
  INVOICE: (id: string) => `/bookings/${id}/invoice`, // GET - Get booking invoice
  REFUND: (id: string) => `/bookings/${id}/refund`,   // POST - Process refund (admin)
  
  // Reviews & Feedback
  REVIEW: (id: string) => `/bookings/${id}/review`,   // POST - Add booking review
  
  // Status & Management
  STATUS: (id: string) => `/bookings/${id}/status`,   // GET/PUT - Get/Update booking status
  
  // History & Organization
  HISTORY: '/bookings/history',                        // GET - Get booking history
  UPCOMING: '/bookings/upcoming',                      // GET - Get upcoming bookings
  PAST: '/bookings/past',                              // GET - Get past bookings
  
  // Analytics (Admin)
  ANALYTICS: '/bookings/analytics',                    // GET - Booking analytics (admin)
} as const;

// ============================================================================
// 7. ANALYTICS SERVICE (/api/v1/analytics/)
// ============================================================================
export const ANALYTICS_ENDPOINTS = {
  // Main Dashboards
  DASHBOARD: '/analytics/dashboard',            // GET - Main analytics dashboard
  
  // User Analytics
  USERS: '/analytics/users',                    // GET - User analytics
  RETENTION: '/analytics/retention',            // GET - User retention analytics
  ENGAGEMENT: '/analytics/engagement',          // GET - User engagement analytics
  
  // Business Analytics
  REVENUE: '/analytics/revenue',                // GET - Revenue analytics
  BOOKINGS: '/analytics/bookings',              // GET - Booking analytics
  CONVERSION: '/analytics/conversion',          // GET - Conversion analytics
  
  // Content Analytics
  PROPERTIES: '/analytics/properties',          // GET - Property analytics
  POIS: '/analytics/pois',                      // GET - POI analytics
  EXPERIENCES: '/analytics/experiences',        // GET - Experience analytics
  
  // System Analytics
  TRAFFIC: '/analytics/traffic',                // GET - Traffic analytics
  PERFORMANCE: '/analytics/performance',        // GET - System performance metrics
  
  // Reporting & Export
  REPORTS_GENERATE: '/analytics/reports/generate', // GET - Generate custom reports
  EXPORTS: (format: string) => `/analytics/exports/${format}`, // GET - Export analytics data
  
  // Real-time & Predictive
  REAL_TIME: '/analytics/real-time',            // GET - Real-time analytics
  FORECASTING: '/analytics/forecasting',        // GET - Analytics forecasting
} as const;

// ============================================================================
// 8. ADMIN SERVICE (/api/v1/admin/)
// ============================================================================
export const ADMIN_ENDPOINTS = {
  // Main Dashboard
  DASHBOARD: '/admin/dashboard',                // GET - Admin dashboard
  
  // User Management
  USERS: '/admin/users',                        // GET/POST - User management/Create user
  USER_DETAILS: (id: string) => `/admin/users/${id}`, // PUT/DELETE - Update/Delete user
  USER_BAN: (id: string) => `/admin/users/${id}/ban`,     // POST - Ban user
  USER_UNBAN: (id: string) => `/admin/users/${id}/unban`, // POST - Unban user
  
  // Content Management
  CONTENT: '/admin/content',                    // GET/POST - Content management/Create content
  CONTENT_DETAILS: (id: string) => `/admin/content/${id}`, // PUT/DELETE - Update/Delete content
  
  // Review Moderation
  REVIEWS: '/admin/reviews',                    // GET - Review moderation
  REVIEW_APPROVE: (id: string) => `/admin/reviews/${id}/approve`, // PUT - Approve review
  REVIEW_REJECT: (id: string) => `/admin/reviews/${id}/reject`,   // PUT - Reject review
  
  // System Management
  SYSTEM_HEALTH: '/admin/system/health',        // GET - System health
  SYSTEM_LOGS: '/admin/system/logs',            // GET - System logs
  SYSTEM_BACKUP: '/admin/system/backup',        // POST - Create backup
  
  // Permissions
  PERMISSIONS: '/admin/permissions',            // GET - Permission management
  PERMISSION_UPDATE: (id: string) => `/admin/permissions/${id}`, // PUT - Update permissions
} as const;

// ============================================================================
// 9. MEDIA SERVICE (/api/v1/media/)
// ============================================================================
export const MEDIA_ENDPOINTS = {
  // Core Media Operations
  UPLOAD: '/media/upload',                      // POST - Upload media file
  UPLOAD_MULTIPLE: '/media/upload/multiple',    // POST - Upload multiple files
  UPLOAD_URL: '/media/upload/url',              // POST - Get upload URL
  
  // Media Management
  DETAILS: (id: string) => `/media/${id}`,      // GET - Get media file
  DELETE: (id: string) => `/media/${id}`,       // DELETE - Delete media file
  METADATA: (id: string) => `/media/${id}/metadata`, // GET - Get file metadata
  
  // Media Processing
  PROCESS: (id: string) => `/media/${id}/process`,    // POST - Process media file
  THUMBNAIL: (id: string) => `/media/${id}/thumbnail`, // GET - Get thumbnail
  RESIZE: (id: string) => `/media/${id}/resize`,       // POST - Resize image
  COMPRESS: (id: string) => `/media/${id}/compress`,   // POST - Compress media
  
  // Gallery & Organization
  GALLERY: '/media/gallery',                    // GET - Get media gallery
  GALLERY_ALBUM: '/media/gallery/album',        // POST - Create album
  
  // Storage Management
  STORAGE_USAGE: '/media/storage/usage',        // GET - Get storage usage
  BATCH_PROCESS: '/media/batch/process',        // POST - Batch process files
} as const;

// ============================================================================
// 10. NOTIFICATION SERVICE (/api/v1/notifications/)
// ============================================================================
export const NOTIFICATION_ENDPOINTS = {
  // Core Notifications
  LIST: '/notifications/',                      // GET - Get user notifications
  SEND: '/notifications/',                      // POST - Send notification (admin)
  MARK_READ: (id: string) => `/notifications/${id}/read`, // PUT - Mark as read
  READ_ALL: '/notifications/read-all',          // PUT - Mark all as read
  DELETE: (id: string) => `/notifications/${id}`,        // DELETE - Delete notification
  
  // Settings & Preferences
  SETTINGS: '/notifications/settings',          // GET/PUT - Get/Update notification settings
  
  // Push Notifications
  PUSH_SUBSCRIBE: '/notifications/push/subscribe',     // POST - Subscribe to push notifications
  PUSH_UNSUBSCRIBE: '/notifications/push/unsubscribe', // POST - Unsubscribe from push notifications
  
  // Email Notifications
  EMAIL_SUBSCRIBE: '/notifications/email/subscribe',     // POST - Subscribe to email notifications
  EMAIL_UNSUBSCRIBE: '/notifications/email/unsubscribe', // POST - Unsubscribe from email notifications
  
  // History & Broadcasting
  HISTORY: '/notifications/history',            // GET - Get notification history
  BROADCAST: '/notifications/broadcast',        // POST - Broadcast notification (admin)
} as const;

// ============================================================================
// 11. RECOMMENDATION SERVICE (/api/v1/recommendations/)
// ============================================================================
export const RECOMMENDATION_ENDPOINTS = {
  // Core Recommendations
  PERSONALIZED: '/recommendations/personalized', // GET - Get personalized recommendations
  POPULAR: '/recommendations/popular',           // GET - Get popular recommendations
  TRENDING: '/recommendations/trending',         // GET - Get trending recommendations
  SIMILAR: (id: string) => `/recommendations/similar/${id}`, // GET - Get similar items
  
  // Feedback & Learning
  FEEDBACK: '/recommendations/feedback',         // POST - Provide recommendation feedback
  
  // Categories & Preferences
  CATEGORIES: '/recommendations/categories',     // GET - Get recommendation categories
  PREFERENCES: '/recommendations/preferences',   // GET/POST - Get/Update user preferences
  
  // Algorithm Types
  COLLABORATIVE: '/recommendations/collaborative', // GET - Collaborative filtering recommendations
  CONTENT_BASED: '/recommendations/content-based', // GET - Content-based recommendations
  HYBRID: '/recommendations/hybrid',             // GET - Hybrid recommendations
  
  // Admin & Analytics
  TRAIN: '/recommendations/train',               // POST - Train recommendation model (admin)
  METRICS: '/recommendations/metrics',           // GET - Recommendation metrics (admin)
} as const;

// ============================================================================
// 12. COMMUNICATION SERVICE (/api/v1/communication/)
// ============================================================================
export const COMMUNICATION_ENDPOINTS = {
  // Messages
  MESSAGES: '/communication/messages',           // GET/POST - Get/Send messages
  MESSAGE_DETAILS: (id: string) => `/communication/messages/${id}`, // GET/PUT/DELETE - Message operations
  
  // Conversations
  CONVERSATIONS: '/communication/conversations', // GET/POST - Get conversations/Start conversation
  CONVERSATION_DETAILS: (id: string) => `/communication/conversations/${id}`, // GET - Get conversation
  CONVERSATION_MESSAGES: (id: string) => `/communication/conversations/${id}/messages`, // POST - Add message to conversation
  
  // Support System
  SUPPORT_TICKETS: '/communication/support/tickets', // GET/POST - Get/Create support tickets
  SUPPORT_TICKET_DETAILS: (id: string) => `/communication/support/tickets/${id}`, // PUT - Update support ticket
  SUPPORT_TICKET_REPLY: (id: string) => `/communication/support/tickets/${id}/reply`, // POST - Reply to support ticket
} as const;

// ============================================================================
// 13. INTEGRATIONS SERVICE (/api/v1/integrations/)
// ============================================================================
export const INTEGRATION_ENDPOINTS = {
  // Weather & Location
  WEATHER: (location: string) => `/integrations/weather/${location}`, // GET - Get weather data
  MAPS_GEOCODE: '/integrations/maps/geocode',    // GET - Geocode address
  MAPS_DIRECTIONS: '/integrations/maps/directions', // GET - Get directions
  MAPS_PLACES: '/integrations/maps/places',      // GET - Search places
  
  // Financial
  CURRENCY_RATES: '/integrations/currency/rates', // GET - Get currency rates
  CURRENCY_CONVERT: '/integrations/currency/convert', // POST - Convert currency
  
  // Payment Systems
  PAYMENT_STRIPE: '/integrations/payment/stripe', // POST - Stripe payment integration
  PAYMENT_PAYPAL: '/integrations/payment/paypal', // POST - PayPal payment integration
  
  // Social Media
  SOCIAL_FACEBOOK: '/integrations/social/facebook', // GET - Facebook integration
  SOCIAL_INSTAGRAM: '/integrations/social/instagram', // GET - Instagram integration
  
  // Communication
  EMAIL_SEND: '/integrations/email/send',        // POST - Send email
  SMS_SEND: '/integrations/sms/send',            // POST - Send SMS
  
  // Calendar
  CALENDAR_EVENTS: '/integrations/calendar/events', // GET - Get calendar events
  CALENDAR_SYNC: '/integrations/calendar/sync',  // POST - Sync calendar
} as const;

// ============================================================================
// 14. MONITORING SERVICE (/api/v1/monitoring/)
// ============================================================================
export const MONITORING_ENDPOINTS = {
  // Health & Status
  HEALTH: '/monitoring/health',                  // GET - System health check
  UPTIME: '/monitoring/uptime',                  // GET - System uptime
  
  // Metrics & Performance
  METRICS: '/monitoring/metrics',                // GET - System metrics
  PERFORMANCE: '/monitoring/performance',        // GET - Performance metrics
  
  // Logs & Errors
  ERRORS: '/monitoring/errors',                  // GET - Error logs
  LOGS: '/monitoring/logs',                      // GET - Application logs
  
  // Alerts & Notifications
  ALERTS: '/monitoring/alerts',                  // GET/POST - System alerts/Create alert
  
  // Component Status
  DATABASE_STATUS: '/monitoring/database/status', // GET - Database status
  CACHE_STATUS: '/monitoring/cache/status',      // GET - Cache status
  QUEUE_STATUS: '/monitoring/queue/status',      // GET - Queue status
  STORAGE_USAGE: '/monitoring/storage/usage',    // GET - Storage usage
} as const;

// ============================================================================
// COMPLETE ENDPOINT REGISTRY
// ============================================================================
export const ALL_ENDPOINTS = {
  AUTH: AUTH_ENDPOINTS,
  PROPERTY: PROPERTY_ENDPOINTS,
  POI: POI_ENDPOINTS,
  EXPERIENCE: EXPERIENCE_ENDPOINTS,
  AI: AI_ENDPOINTS,
  BOOKING: BOOKING_ENDPOINTS,
  ANALYTICS: ANALYTICS_ENDPOINTS,
  ADMIN: ADMIN_ENDPOINTS,
  MEDIA: MEDIA_ENDPOINTS,
  NOTIFICATION: NOTIFICATION_ENDPOINTS,
  RECOMMENDATION: RECOMMENDATION_ENDPOINTS,
  COMMUNICATION: COMMUNICATION_ENDPOINTS,
  INTEGRATION: INTEGRATION_ENDPOINTS,
  MONITORING: MONITORING_ENDPOINTS,
} as const;

// Helper function to build full URL
export const buildApiUrl = (endpoint: string): string => {
  return `${API_BASE_URL}${endpoint}`;
};

// Type helpers for endpoint parameters
export type EndpointId = string;
export type LocationParam = string;
export type FormatParam = string;

// Export all endpoint counts for reference
export const ENDPOINT_COUNTS = {
  AUTH: 21,
  PROPERTY: 22,
  POI: 19,
  EXPERIENCE: 18,
  AI: 14,
  BOOKING: 16,
  ANALYTICS: 15,
  ADMIN: 18,
  MEDIA: 14,
  NOTIFICATION: 12,
  RECOMMENDATION: 13,
  COMMUNICATION: 10,
  INTEGRATION: 13,
  MONITORING: 12,
} as const;

export const TOTAL_ENDPOINTS = Object.values(ENDPOINT_COUNTS).reduce((sum, count) => sum + count, 0);

console.log(`TouriQuest API Reference: ${TOTAL_ENDPOINTS} endpoints across ${Object.keys(ENDPOINT_COUNTS).length} services`);