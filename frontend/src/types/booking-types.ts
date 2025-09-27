/**
 * Comprehensive Booking Types for TouriQuest
 * Enhanced booking management with all required interfaces
 */

// ============================================================================
// CORE BOOKING INTERFACES
// ============================================================================

export interface Booking {
  id: string;
  userId: string;
  type: 'property' | 'experience' | 'poi';
  itemId: string;
  itemName: string;
  itemDescription?: string;
  itemImages: string[];
  status: BookingStatusType;
  confirmationCode: string;
  
  // Dates
  bookingDate: string;
  checkInDate: string;
  checkOutDate: string;
  createdAt: string;
  updatedAt: string;
  
  // Guest Information
  guests: GuestInfo;
  guestDetails: ContactInfo;
  
  // Pricing
  baseAmount: number;
  taxes: number;
  serviceFee: number;
  cleaningFee?: number;
  totalAmount: number;
  currency: string;
  
  // Payment
  paymentStatus: PaymentStatusType;
  paymentMethod: string;
  paymentId?: string;
  
  // Additional Information
  specialRequests?: string;
  cancellationPolicy: string;
  hostInfo?: HostInfo;
  propertyInfo?: PropertyBookingInfo;
  experienceInfo?: ExperienceBookingInfo;
  
  // Reviews
  canReview: boolean;
  reviewSubmitted: boolean;
  review?: BookingReview;
  
  // Notifications
  reminders: NotificationPreferences;
  
  // Sharing
  shareUrl?: string;
  isShareable: boolean;
}

export type BookingStatusType = 
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'in-progress'
  | 'no-show'
  | 'refunded'
  | 'expired';

export type PaymentStatusType = 
  | 'pending'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'partial-refund'
  | 'processing';

export interface GuestInfo {
  adults: number;
  children: number;
  infants?: number;
  pets?: number;
}

export interface ContactInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country?: string;
  dateOfBirth?: string;
  specialNeeds?: string[];
}

export interface HostInfo {
  id: string;
  name: string;
  avatar?: string;
  email?: string;
  phone?: string;
  responseTime?: string;
  responseRate?: number;
  isSuperhost?: boolean;
}

export interface PropertyBookingInfo {
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  checkInInstructions?: string;
  checkInTime: string;
  checkOutTime: string;
  amenities: string[];
  houseRules: string[];
  wifiPassword?: string;
  parkingInfo?: string;
}

export interface ExperienceBookingInfo {
  meetingPoint: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  duration: number;
  language: string;
  includesList: string[];
  requirementsList: string[];
  weatherPolicy?: string;
  groupSize: {
    minimum: number;
    maximum: number;
  };
}

// ============================================================================
// REQUEST/RESPONSE INTERFACES
// ============================================================================

export interface BookingRequest {
  type: 'property' | 'experience' | 'poi';
  itemId: string;
  checkInDate: string;
  checkOutDate: string;
  guests: GuestInfo;
  guestDetails: ContactInfo;
  specialRequests?: string;
  paymentMethodId?: string;
  promoCode?: string;
  agreedToCancellationPolicy: boolean;
  agreedToTerms: boolean;
}

export interface BookingModification {
  newCheckInDate?: string;
  newCheckOutDate?: string;
  newGuests?: GuestInfo;
  newSpecialRequests?: string;
  reason: string;
  additionalFees?: number;
}

export interface BookingFilter {
  status?: BookingStatusType[];
  type?: ('property' | 'experience' | 'poi')[];
  dateRange?: {
    start: string;
    end: string;
  };
  amountRange?: {
    min: number;
    max: number;
  };
  paymentStatus?: PaymentStatusType[];
  sortBy?: 'date' | 'amount' | 'status' | 'type';
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// REVIEW INTERFACES
// ============================================================================

export interface BookingReview {
  id?: string;
  bookingId: string;
  rating: number; // 1-5
  title: string;
  content: string;
  categories: ReviewCategory[];
  photos?: string[];
  wouldRecommend: boolean;
  createdAt?: string;
  response?: HostResponse;
}

export interface ReviewCategory {
  name: string;
  rating: number;
  comment?: string;
}

export interface HostResponse {
  content: string;
  createdAt: string;
  hostName: string;
}

// ============================================================================
// PAYMENT & INVOICE INTERFACES
// ============================================================================

export interface BookingInvoice {
  id: string;
  bookingId: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate?: string;
  items: InvoiceItem[];
  subtotal: number;
  taxes: number;
  total: number;
  currency: string;
  paymentStatus: PaymentStatusType;
  url?: string;
  filename?: string;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal' | 'bank' | 'apple_pay' | 'google_pay';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
}

// ============================================================================
// NOTIFICATION INTERFACES
// ============================================================================

export interface NotificationPreferences {
  bookingConfirmation: boolean;
  checkInReminder: boolean;
  checkInReminderTime: number; // hours before
  checkOutReminder: boolean;
  checkOutReminderTime: number; // hours before
  reviewReminder: boolean;
  reviewReminderTime: number; // days after checkout
  specialOffers: boolean;
  priceDropAlerts: boolean;
  channels: {
    email: boolean;
    sms: boolean;
    push: boolean;
    inApp: boolean;
  };
}

export interface BookingNotification {
  id: string;
  bookingId: string;
  type: NotificationType;
  title: string;
  message: string;
  scheduledFor: string;
  sentAt?: string;
  channel: 'email' | 'sms' | 'push' | 'inApp';
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
}

export type NotificationType =
  | 'booking_confirmed'
  | 'check_in_reminder'
  | 'check_out_reminder'
  | 'review_reminder'
  | 'cancellation_confirmed'
  | 'modification_confirmed'
  | 'payment_reminder'
  | 'special_offer';

// ============================================================================
// STATUS & ANALYTICS INTERFACES
// ============================================================================

export interface BookingStatus {
  status: BookingStatusType;
  lastUpdated: string;
  timeline: BookingStatusUpdate[];
  canCancel: boolean;
  canModify: boolean;
  canReview: boolean;
  refundEligible: boolean;
  cancellationDeadline?: string;
  modificationDeadline?: string;
}

export interface BookingStatusUpdate {
  status: BookingStatusType;
  timestamp: string;
  description: string;
  updatedBy: 'system' | 'user' | 'host' | 'admin';
}

export interface BookingAnalytics {
  totalBookings: number;
  totalSpent: number;
  averageBookingValue: number;
  favoriteDestinations: string[];
  bookingFrequency: 'frequent' | 'occasional' | 'rare';
  preferredBookingType: 'property' | 'experience' | 'mixed';
  seasonalTrends: SeasonalTrend[];
  loyaltyTier: 'bronze' | 'silver' | 'gold' | 'platinum';
  savings: {
    totalSaved: number;
    lastYearComparison: number;
  };
  upcomingTrips: number;
  completedTrips: number;
}

export interface SeasonalTrend {
  season: 'spring' | 'summer' | 'fall' | 'winter';
  bookings: number;
  averageSpend: number;
  preferredType: string;
}

// ============================================================================
// SHARING INTERFACES
// ============================================================================

export interface BookingShare {
  bookingId: string;
  shareType: 'public' | 'private' | 'limited';
  shareUrl: string;
  expiresAt?: string;
  viewCount: number;
  sharedWith: SharedContact[];
  permissions: SharePermissions;
}

export interface SharedContact {
  email?: string;
  phone?: string;
  name?: string;
  sharedAt: string;
  viewed: boolean;
  viewedAt?: string;
}

export interface SharePermissions {
  viewDetails: boolean;
  viewPayment: boolean;
  viewContact: boolean;
  allowComments: boolean;
  allowDownload: boolean;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface BookingSearchParams {
  query?: string;
  filters?: BookingFilter;
  page?: number;
  limit?: number;
}

export interface BookingQuickAction {
  id: string;
  label: string;
  icon: string;
  action: 'view' | 'modify' | 'cancel' | 'review' | 'share' | 'download';
  available: boolean;
  disabled?: boolean;
  disabledReason?: string;
}

export interface BookingCard {
  booking: Booking;
  quickActions: BookingQuickAction[];
  highlight?: 'upcoming' | 'recent' | 'popular';
  urgentAction?: {
    type: 'review' | 'check_in' | 'payment';
    deadline: string;
    message: string;
  };
}

// ============================================================================
// ERROR INTERFACES
// ============================================================================

export interface BookingError {
  code: string;
  message: string;
  field?: string;
  suggestedAction?: string;
}

export interface BookingValidationError extends BookingError {
  field: string;
  value?: any;
  constraint?: string;
}

// ============================================================================
// EXPORT DEFAULT TYPES
// ============================================================================

export type {
  Booking as BookingType,
  BookingRequest as BookingRequestType,
  BookingModification as BookingModificationType,
  BookingReview as BookingReviewType,
  BookingInvoice as BookingInvoiceType,
  BookingStatus as BookingStatusInfo,
  BookingAnalytics as BookingAnalyticsType,
  NotificationPreferences as NotificationPreferencesType
};