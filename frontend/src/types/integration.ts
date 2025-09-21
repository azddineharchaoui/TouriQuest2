import { ApiResponse, WeatherInfo, Currency } from './common';

// Integration Types
export interface WeatherData extends WeatherInfo {
  location: {
    name: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  alerts?: Array<{
    title: string;
    description: string;
    severity: 'minor' | 'moderate' | 'severe' | 'extreme';
    start: string;
    end: string;
  }>;
  uvIndex: number;
  visibility: number;
  airQuality?: {
    index: number;
    level: string;
    pollutants: Record<string, number>;
  };
}

export interface CurrencyRates {
  base: string;
  date: string;
  rates: Record<string, number>;
  lastUpdated: string;
}

export interface CurrencyConversion {
  from: string;
  to: string;
  amount: number;
  convertedAmount: number;
  rate: number;
  date: string;
}

export interface GeocodingResult {
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  components: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  confidence: number;
  type: 'exact' | 'approximate' | 'range';
}

export interface DirectionsResult {
  routes: Array<{
    summary: string;
    distance: number; // in meters
    duration: number; // in seconds
    steps: Array<{
      instruction: string;
      distance: number;
      duration: number;
      startLocation: { latitude: number; longitude: number };
      endLocation: { latitude: number; longitude: number };
    }>;
    geometry: string; // encoded polyline
  }>;
  alternatives: boolean;
  travelMode: 'driving' | 'walking' | 'transit' | 'cycling';
}

export interface PlaceSearchResult {
  places: Array<{
    id: string;
    name: string;
    address: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
    rating?: number;
    priceLevel?: number;
    types: string[];
    photos?: Array<{
      url: string;
      width: number;
      height: number;
    }>;
    openingHours?: {
      isOpen: boolean;
      periods: Array<{
        open: { day: number; time: string };
        close: { day: number; time: string };
      }>;
    };
  }>;
  nextPageToken?: string;
}

export interface PaymentIntentResult {
  id: string;
  clientSecret: string;
  status: 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'succeeded' | 'canceled';
  amount: number;
  currency: string;
  metadata: Record<string, string>;
}

export interface SocialMediaPost {
  platform: 'facebook' | 'instagram' | 'twitter';
  postId: string;
  content: string;
  mediaUrls: string[];
  metrics: {
    likes: number;
    shares: number;
    comments: number;
    views?: number;
  };
  createdAt: string;
}

export interface EmailRequest {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  content: string;
  template?: string;
  templateData?: Record<string, any>;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType: string;
  }>;
}

export interface SMSRequest {
  to: string;
  message: string;
  template?: string;
  templateData?: Record<string, any>;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  attendees: Array<{
    email: string;
    name?: string;
    status: 'accepted' | 'declined' | 'tentative' | 'pending';
  }>;
  reminders: Array<{
    method: 'email' | 'popup' | 'sms';
    minutes: number;
  }>;
  isAllDay: boolean;
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    until?: string;
    count?: number;
  };
}

export interface CalendarSyncResult {
  syncedEvents: number;
  errors: Array<{
    eventId: string;
    error: string;
  }>;
  lastSync: string;
  nextSync: string;
}

// API Response Types
export type WeatherDataResponse = ApiResponse<WeatherData>;
export type CurrencyRatesResponse = ApiResponse<CurrencyRates>;
export type CurrencyConversionResponse = ApiResponse<CurrencyConversion>;
export type GeocodingResponse = ApiResponse<GeocodingResult[]>;
export type DirectionsResponse = ApiResponse<DirectionsResult>;
export type PlaceSearchResponse = ApiResponse<PlaceSearchResult>;
export type PaymentIntentResponse = ApiResponse<PaymentIntentResult>;
export type SocialMediaResponse = ApiResponse<SocialMediaPost>;
export type EmailResponse = ApiResponse<{ messageId: string; status: string }>;
export type SMSResponse = ApiResponse<{ messageId: string; status: string }>;
export type CalendarEventsResponse = ApiResponse<CalendarEvent[]>;
export type CalendarSyncResponse = ApiResponse<CalendarSyncResult>;