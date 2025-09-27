/**
 * TouriQuest API Response Types and Interfaces
 * TypeScript interfaces for all backend service responses
 */

// ============================================================================
// COMMON TYPES
// ============================================================================
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
  meta?: {
    pagination?: PaginationMeta;
    timestamp?: string;
    version?: string;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
}

export interface MediaFile {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  metadata?: Record<string, any>;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
  helpful?: number;
  photos?: MediaFile[];
}

// ============================================================================
// 1. AUTHENTICATION SERVICE TYPES
// ============================================================================
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  phone?: string;
  dateOfBirth?: string;
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
  isVerified: boolean;
  role: 'user' | 'admin' | 'moderator';
  onboardingCompleted: boolean;
  twoFactorEnabled: boolean;
}

export interface UserPreferences {
  language: string;
  currency: string;
  notifications: NotificationPreferences;
  privacy: PrivacySettings;
  accessibility?: AccessibilitySettings;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  marketing: boolean;
  bookingUpdates: boolean;
  recommendations: boolean;
}

export interface PrivacySettings {
  profileVisible: boolean;
  locationSharing: boolean;
  activityVisible: boolean;
}

export interface AccessibilitySettings {
  fontSize: 'small' | 'medium' | 'large';
  highContrast: boolean;
  screenReader: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: string;
}

export interface OAuthRequest {
  provider: 'google' | 'facebook' | 'apple';
  token: string;
  redirectUri?: string;
}

export interface TwoFactorSetupResponse {
  qrCode: string;
  secret: string;
  backupCodes: string[];
}

// ============================================================================
// 2. PROPERTY SERVICE TYPES
// ============================================================================
export interface Property {
  id: string;
  title: string;
  description: string;
  type: PropertyType;
  location: Location;
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  amenities: Amenity[];
  photos: MediaFile[];
  pricing: PropertyPricing;
  availability: PropertyAvailability[];
  rating: number;
  reviewCount: number;
  reviews: Review[];
  host: PropertyHost;
  rules: PropertyRules;
  policies: PropertyPolicies;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  isFeatured: boolean;
}

export interface PropertyType {
  id: string;
  name: string;
  category: 'hotel' | 'apartment' | 'house' | 'villa' | 'resort' | 'hostel' | 'other';
  icon?: string;
}

export interface Amenity {
  id: string;
  name: string;
  category: string;
  icon?: string;
  description?: string;
}

export interface PropertyPricing {
  basePrice: number;
  currency: string;
  cleaningFee?: number;
  serviceFee?: number;
  taxes?: number;
  seasonalRates?: SeasonalRate[];
  discounts?: PropertyDiscount[];
}

export interface SeasonalRate {
  startDate: string;
  endDate: string;
  priceMultiplier: number;
  description: string;
}

export interface PropertyDiscount {
  type: 'weekly' | 'monthly' | 'early_bird' | 'last_minute';
  percentage: number;
  description: string;
  conditions?: string[];
}

export interface PropertyAvailability {
  date: string;
  available: boolean;
  price: number;
  minimumStay?: number;
}

export interface PropertyHost {
  id: string;
  name: string;
  avatar?: string;
  bio?: string;
  joinedAt: string;
  responseRate?: number;
  responseTime?: string;
  languages: string[];
  verifications: string[];
}

export interface PropertyRules {
  checkIn: string;
  checkOut: string;
  maxGuests: number;
  minAge?: number;
  smoking: boolean;
  pets: boolean;
  parties: boolean;
  additionalRules?: string[];
}

export interface PropertyPolicies {
  cancellation: CancellationPolicy;
  payment: PaymentPolicy;
  houseRules: string[];
}

export interface CancellationPolicy {
  type: 'flexible' | 'moderate' | 'strict' | 'super_strict';
  description: string;
  refundPercentages: RefundSchedule[];
}

export interface RefundSchedule {
  daysBeforeCheckIn: number;
  refundPercentage: number;
}

export interface PaymentPolicy {
  upfrontPayment: number;
  remainingPayment: number;
  paymentMethods: string[];
}

export interface PropertySearchFilters {
  location?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  minPrice?: number;
  maxPrice?: number;
  propertyTypes?: string[];
  amenities?: string[];
  rating?: number;
  instantBook?: boolean;
  coordinates?: {
    latitude: number;
    longitude: number;
    radius: number;
  };
}

export interface SavedSearch {
  id: string;
  name: string;
  filters: PropertySearchFilters;
  alertsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastAlertSent?: string;
  userId: string;
}

// ============================================================================
// 3. POI SERVICE TYPES
// ============================================================================
export interface POI {
  id: string;
  name: string;
  description: string;
  category: POICategory;
  subcategory?: string;
  location: Location;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  photos: MediaFile[];
  rating: number;
  reviewCount: number;
  reviews: Review[];
  operatingHours: OperatingHours[];
  website?: string;
  phone?: string;
  email?: string;
  priceRange?: PriceRange;
  accessibility: AccessibilityInfo;
  features: POIFeature[];
  events: POIEvent[];
  audioGuide?: AudioGuide;
  visitDuration: VisitDuration;
  bestTimeToVisit?: string[];
  entryFee?: EntryFee;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  verificationStatus: 'verified' | 'pending' | 'unverified';
}

export interface POICategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  subcategories?: string[];
}

export interface OperatingHours {
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  openTime?: string;
  closeTime?: string;
  isClosed: boolean;
  notes?: string;
}

export interface PriceRange {
  min: number;
  max: number;
  currency: string;
  description?: string;
}

export interface AccessibilityInfo {
  wheelchairAccessible: boolean;
  hasElevator: boolean;
  hasRestrooms: boolean;
  hasParking: boolean;
  hasPublicTransport: boolean;
  notes?: string;
}

export interface POIFeature {
  id: string;
  name: string;
  category: string;
  icon?: string;
  description?: string;
}

export interface POIEvent {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  category: string;
  price?: number;
  isRecurring: boolean;
  website?: string;
}

export interface AudioGuide {
  id: string;
  title: string;
  description: string;
  duration: number; // minutes
  languages: string[];
  audioUrl: string;
  transcriptUrl?: string;
  price?: number;
}

export interface VisitDuration {
  min: number; // minutes
  max: number; // minutes
  recommended: number; // minutes
}

export interface EntryFee {
  adult: number;
  child?: number;
  senior?: number;
  student?: number;
  currency: string;
  description?: string;
}

// ============================================================================
// 4. EXPERIENCE SERVICE TYPES
// ============================================================================
export interface Experience {
  id: string;
  title: string;
  description: string;
  category: ExperienceCategory;
  type: ExperienceType;
  location: Location;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  duration: ExperienceDuration;
  difficulty: DifficultyLevel;
  groupSize: GroupSize;
  pricing: ExperiencePricing;
  inclusions: string[];
  exclusions: string[];
  requirements: string[];
  photos: MediaFile[];
  itinerary: ItineraryItem[];
  availability: ExperienceAvailability[];
  guide: ExperienceGuide;
  rating: number;
  reviewCount: number;
  reviews: Review[];
  cancellationPolicy: CancellationPolicy;
  languages: string[];
  equipment: EquipmentInfo[];
  weatherDependency: boolean;
  ageRestrictions: AgeRestrictions;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  isFeatured: boolean;
}

export interface ExperienceCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export interface ExperienceType {
  id: string;
  name: string;
  category: 'group' | 'private' | 'self_guided' | 'virtual';
}

export interface ExperienceDuration {
  hours: number;
  minutes: number;
  days?: number;
  description?: string;
}

export interface DifficultyLevel {
  level: 1 | 2 | 3 | 4 | 5;
  name: 'Easy' | 'Moderate' | 'Challenging' | 'Difficult' | 'Expert';
  description: string;
}

export interface GroupSize {
  min: number;
  max: number;
  optimal?: number;
}

export interface ExperiencePricing {
  pricePerPerson: number;
  currency: string;
  groupDiscounts?: GroupDiscount[];
  seasonalPricing?: SeasonalRate[];
  additionalFees?: AdditionalFee[];
}

export interface GroupDiscount {
  minGroupSize: number;
  discountPercentage: number;
}

export interface AdditionalFee {
  name: string;
  amount: number;
  isOptional: boolean;
  description?: string;
}

export interface ItineraryItem {
  order: number;
  title: string;
  description: string;
  duration?: number; // minutes
  location?: Location;
  activities: string[];
  highlights: string[];
  photos?: MediaFile[];
}

export interface ExperienceAvailability {
  date: string;
  timeSlots: TimeSlot[];
  isAvailable: boolean;
  specialPricing?: number;
  notes?: string;
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  availableSpots: number;
  totalSpots: number;
  price: number;
}

export interface ExperienceGuide {
  id: string;
  name: string;
  avatar?: string;
  bio: string;
  languages: string[];
  experience: string;
  specialties: string[];
  rating: number;
  reviewCount: number;
  certifications: string[];
}

export interface EquipmentInfo {
  name: string;
  isProvided: boolean;
  isRequired: boolean;
  description?: string;
  rentalPrice?: number;
}

export interface AgeRestrictions {
  minAge?: number;
  maxAge?: number;
  requiresAdult: boolean;
  description?: string;
}

// ============================================================================
// 5. AI SERVICE TYPES
// ============================================================================
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  context?: ChatContext;
  attachments?: MediaFile[];
}

export interface ChatContext {
  location?: Location;
  currentActivity?: string;
  userPreferences?: Partial<UserPreferences>;
  sessionId: string;
  conversationId: string;
}

export interface ChatHistory {
  conversations: ChatConversation[];
  totalMessages: number;
  dateRange: {
    start: string;
    end: string;
  };
}

export interface ChatConversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  startedAt: string;
  lastMessageAt: string;
  isActive: boolean;
}

export interface VoiceTranscription {
  text: string;
  confidence: number;
  language: string;
  duration: number;
  alternatives?: TranscriptionAlternative[];
}

export interface TranscriptionAlternative {
  text: string;
  confidence: number;
}

export interface VoiceSynthesis {
  audioUrl: string;
  duration: number;
  format: string;
  voice: VoiceSettings;
}

export interface VoiceSettings {
  voice: string;
  language: string;
  speed: number;
  pitch: number;
}

export interface AIRecommendation {
  id: string;
  type: 'property' | 'poi' | 'experience' | 'restaurant' | 'event';
  itemId: string;
  title: string;
  description: string;
  reason: string;
  confidence: number;
  relevanceScore: number;
  category: string;
  location?: Location;
  price?: number;
  rating?: number;
  imageUrl?: string;
}

export interface AIItinerary {
  id: string;
  title: string;
  description: string;
  duration: number; // days
  totalCost: number;
  currency: string;
  days: ItineraryDay[];
  recommendations: AIRecommendation[];
  optimizationMetrics: OptimizationMetrics;
  createdAt: string;
  lastOptimized: string;
}

export interface ItineraryDay {
  day: number;
  date: string;
  theme?: string;
  activities: ItineraryActivity[];
  estimatedCost: number;
  travelTime: number; // minutes
}

export interface ItineraryActivity {
  id: string;
  type: 'property' | 'poi' | 'experience' | 'meal' | 'transport';
  itemId?: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  duration: number; // minutes
  location: Location;
  cost: number;
  notes?: string;
  bookingRequired: boolean;
  bookingUrl?: string;
}

export interface OptimizationMetrics {
  timeEfficiency: number;
  costEfficiency: number;
  userPreferenceMatch: number;
  travelOptimization: number;
  overallScore: number;
}

export interface TranslationResult {
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  confidence: number;
}

export interface SentimentAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  scores: {
    positive: number;
    negative: number;
    neutral: number;
  };
  emotions?: EmotionScores;
}

export interface EmotionScores {
  joy: number;
  sadness: number;
  anger: number;
  fear: number;
  surprise: number;
  disgust: number;
}

export interface EntityExtraction {
  entities: ExtractedEntity[];
  categories: string[];
  confidence: number;
}

export interface ExtractedEntity {
  text: string;
  type: string;
  confidence: number;
  startIndex: number;
  endIndex: number;
  metadata?: Record<string, any>;
}

export interface ContentSummary {
  originalLength: number;
  summaryLength: number;
  summary: string;
  keyPoints: string[];
  compressionRatio: number;
  method: string;
}

export interface AIModel {
  id: string;
  name: string;
  description: string;
  version: string;
  capabilities: string[];
  isActive: boolean;
  usage: ModelUsage;
}

export interface ModelUsage {
  requestsToday: number;
  requestsThisMonth: number;
  averageResponseTime: number;
  successRate: number;
}

// ============================================================================
// 6. BOOKING SERVICE TYPES
// ============================================================================
export interface Booking {
  id: string;
  type: 'property' | 'experience';
  itemId: string;
  itemTitle: string;
  itemImages: MediaFile[];
  userId: string;
  status: BookingStatus;
  bookingDate: string;
  checkIn?: string; // for properties
  checkOut?: string; // for properties
  experienceDate?: string; // for experiences
  experienceTime?: string; // for experiences
  guests: BookingGuests;
  pricing: BookingPricing;
  payment: BookingPayment;
  cancellation?: BookingCancellation;
  modifications: BookingModification[];
  specialRequests?: string;
  contactInfo: ContactInfo;
  confirmation: BookingConfirmation;
  review?: Review;
  createdAt: string;
  updatedAt: string;
}

export interface BookingStatus {
  current: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show' | 'refunded';
  history: StatusChange[];
}

export interface StatusChange {
  status: string;
  timestamp: string;
  reason?: string;
  changedBy: string;
}

export interface BookingGuests {
  adults: number;
  children: number;
  infants?: number;
  totalGuests: number;
  guestDetails?: GuestDetail[];
}

export interface GuestDetail {
  name: string;
  age?: number;
  specialRequirements?: string[];
}

export interface BookingPricing {
  basePrice: number;
  taxes: number;
  fees: BookingFee[];
  discounts: BookingDiscount[];
  totalPrice: number;
  currency: string;
  breakdown: PriceBreakdown[];
}

export interface BookingFee {
  name: string;
  amount: number;
  type: 'fixed' | 'percentage';
  description?: string;
}

export interface BookingDiscount {
  name: string;
  amount: number;
  type: 'fixed' | 'percentage';
  code?: string;
  description?: string;
}

export interface PriceBreakdown {
  category: string;
  amount: number;
  description: string;
}

export interface BookingPayment {
  method: PaymentMethod;
  status: PaymentStatus;
  transactions: PaymentTransaction[];
  refunds: PaymentRefund[];
}

export interface PaymentMethod {
  type: 'credit_card' | 'debit_card' | 'paypal' | 'bank_transfer' | 'crypto';
  provider: string;
  last4?: string;
  cardType?: string;
  expiryDate?: string;
}

export interface PaymentStatus {
  current: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'partially_refunded';
  history: PaymentStatusChange[];
}

export interface PaymentStatusChange {
  status: string;
  timestamp: string;
  amount: number;
  transactionId: string;
}

export interface PaymentTransaction {
  id: string;
  type: 'charge' | 'refund' | 'adjustment';
  amount: number;
  currency: string;
  status: string;
  method: PaymentMethod;
  timestamp: string;
  description?: string;
}

export interface PaymentRefund {
  id: string;
  amount: number;
  currency: string;
  reason: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requestedAt: string;
  processedAt?: string;
  transactionId: string;
}

export interface BookingCancellation {
  reason: string;
  cancelledAt: string;
  cancelledBy: string;
  refundAmount: number;
  refundStatus: 'pending' | 'processing' | 'completed' | 'denied';
  policy: CancellationPolicy;
}

export interface BookingModification {
  id: string;
  type: 'date_change' | 'guest_change' | 'upgrade' | 'downgrade' | 'special_request';
  originalValue: any;
  newValue: any;
  priceDifference: number;
  requestedAt: string;
  processedAt?: string;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
}

export interface ContactInfo {
  name: string;
  email: string;
  phone: string;
  address?: string;
  emergencyContact?: EmergencyContact;
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export interface BookingConfirmation {
  confirmationNumber: string;
  qrCode?: string;
  instructions: string[];
  importantNotes: string[];
  contactDetails: ContactInfo;
  checkInInstructions?: string;
  meetingPoint?: Location;
}

// ============================================================================
// 7. ANALYTICS SERVICE TYPES
// ============================================================================
export interface AnalyticsDashboard {
  overview: AnalyticsOverview;
  metrics: DashboardMetric[];
  charts: AnalyticsChart[];
  trends: TrendAnalysis[];
  alerts: AnalyticsAlert[];
  lastUpdated: string;
}

export interface AnalyticsOverview {
  totalUsers: number;
  activeUsers: number;
  totalBookings: number;
  totalRevenue: number;
  averageBookingValue: number;
  conversionRate: number;
  customerSatisfaction: number;
  systemUptime: number;
}

export interface DashboardMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  change: MetricChange;
  category: string;
  target?: number;
  status: 'good' | 'warning' | 'critical';
}

export interface MetricChange {
  value: number;
  percentage: number;
  period: string;
  direction: 'up' | 'down' | 'stable';
}

export interface AnalyticsChart {
  id: string;
  title: string;
  type: 'line' | 'bar' | 'pie' | 'area' | 'scatter';
  data: ChartDataPoint[];
  config: ChartConfig;
  timeRange: TimeRange;
}

export interface ChartDataPoint {
  x: string | number;
  y: number;
  label?: string;
  category?: string;
  metadata?: Record<string, any>;
}

export interface ChartConfig {
  xAxis: AxisConfig;
  yAxis: AxisConfig;
  colors: string[];
  showLegend: boolean;
  showGrid: boolean;
}

export interface AxisConfig {
  label: string;
  unit?: string;
  format?: string;
  min?: number;
  max?: number;
}

export interface TimeRange {
  start: string;
  end: string;
  granularity: 'hour' | 'day' | 'week' | 'month' | 'year';
}

export interface TrendAnalysis {
  metric: string;
  trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  confidence: number;
  prediction: TrendPrediction;
  factors: TrendFactor[];
}

export interface TrendPrediction {
  nextPeriod: number;
  confidence: number;
  range: {
    min: number;
    max: number;
  };
}

export interface TrendFactor {
  name: string;
  impact: number;
  description: string;
}

export interface AnalyticsAlert {
  id: string;
  type: 'threshold' | 'anomaly' | 'trend' | 'system';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  metric: string;
  value: number;
  threshold?: number;
  timestamp: string;
  acknowledged: boolean;
}

// ============================================================================
// NOTE: All types are already exported via their interface declarations above
// ============================================================================