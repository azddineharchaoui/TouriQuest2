import { ApiResponse, PaginatedResponse, SearchFilters, Address, Review, Media, Price } from './common';

// POI (Points of Interest) Types
export interface POI {
  id: string;
  name: string;
  description: string;
  category: POICategory;
  subcategory?: string;
  address: Address;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  rating: number;
  reviewCount: number;
  photos: Media[];
  operatingHours: OperatingHours;
  contact: {
    phone?: string;
    email?: string;
    website?: string;
    socialMedia?: {
      facebook?: string;
      instagram?: string;
      twitter?: string;
    };
  };
  pricing: POIPricing;
  features: string[];
  accessibility: string[];
  languages: string[];
  tags: string[];
  popularity: number;
  isActive: boolean;
  isFeatured: boolean;
  audioGuide?: AudioGuide;
  events: POIEvent[];
  nearbyPOIs?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface POICategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  subcategories: string[];
}

export interface OperatingHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
  holidays?: DayHours;
  specialDates?: Array<{
    date: string;
    hours: DayHours;
    note?: string;
  }>;
}

export interface DayHours {
  isOpen: boolean;
  openTime?: string;
  closeTime?: string;
  breaks?: Array<{
    start: string;
    end: string;
    reason?: string;
  }>;
  note?: string;
}

export interface POIPricing {
  type: 'free' | 'paid' | 'donation' | 'varies';
  currency?: string;
  adult?: number;
  child?: number;
  senior?: number;
  student?: number;
  family?: number;
  group?: number;
  note?: string;
  discounts?: Array<{
    type: string;
    description: string;
    amount: number | string;
  }>;
}

export interface AudioGuide {
  id: string;
  title: string;
  description: string;
  duration: number; // in minutes
  languages: string[];
  narrator: string;
  audioUrl: string;
  transcript?: string;
  waypoints?: Array<{
    id: string;
    title: string;
    description: string;
    coordinates: { latitude: number; longitude: number };
    audioUrl: string;
    duration: number;
  }>;
  price?: Price;
}

export interface POIEvent {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  isRecurring: boolean;
  recurrence?: {
    pattern: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    endDate?: string;
  };
  category: string;
  price?: Price;
  capacity?: number;
  registrationRequired: boolean;
  registrationUrl?: string;
  contact?: {
    name: string;
    email?: string;
    phone?: string;
  };
}

export interface POISearchFilters extends SearchFilters {
  categories?: string[];
  subcategories?: string[];
  features?: string[];
  priceRange?: 'free' | 'low' | 'medium' | 'high';
  isOpen?: boolean;
  hasAudioGuide?: boolean;
  hasEvents?: boolean;
  accessibility?: string[];
  languages?: string[];
}

export interface VisitRecord {
  id: string;
  poiId: string;
  userId: string;
  visitDate: string;
  duration?: number; // in minutes
  rating?: number;
  notes?: string;
  photos?: string[];
  checkedIn: boolean;
  checkedOut: boolean;
}

export interface NearbyPOI {
  poi: POI;
  distance: number;
  travelTime?: {
    walking: number;
    driving: number;
    transit: number;
  };
  relatedCategories?: string[];
}

// POI Management (Admin)
export interface CreatePOIRequest {
  name: string;
  description: string;
  category: string;
  subcategory?: string;
  address: Address;
  contact: POI['contact'];
  operatingHours: OperatingHours;
  pricing: POIPricing;
  features: string[];
  accessibility: string[];
  languages: string[];
  tags: string[];
  photos?: File[];
}

export interface UpdatePOIRequest extends Partial<CreatePOIRequest> {
  isActive?: boolean;
  isFeatured?: boolean;
}

export interface POIAnalytics {
  overview: {
    totalVisits: number;
    uniqueVisitors: number;
    averageRating: number;
    averageDuration: number;
  };
  trends: {
    visits: Array<{ date: string; count: number }>;
    ratings: Array<{ date: string; rating: number }>;
    duration: Array<{ date: string; duration: number }>;
  };
  demographics: {
    countries: Array<{ country: string; percentage: number }>;
    ageGroups: Array<{ group: string; percentage: number }>;
    interests: Array<{ interest: string; percentage: number }>;
  };
  seasonal: Array<{ month: string; visits: number; rating: number }>;
}

// API Response Types
export type POISearchResponse = ApiResponse<PaginatedResponse<POI>>;
export type POIDetailsResponse = ApiResponse<POI>;
export type POIReviewsResponse = ApiResponse<PaginatedResponse<Review>>;
export type POIPhotosResponse = ApiResponse<Media[]>;
export type POIHoursResponse = ApiResponse<OperatingHours>;
export type POIEventsResponse = ApiResponse<POIEvent[]>;
export type POIAudioGuideResponse = ApiResponse<AudioGuide>;
export type POICategoriesResponse = ApiResponse<POICategory[]>;
export type PopularPOIsResponse = ApiResponse<POI[]>;
export type RecommendedPOIsResponse = ApiResponse<POI[]>;
export type NearbyPOIsResponse = ApiResponse<NearbyPOI[]>;
export type VisitRecordResponse = ApiResponse<VisitRecord>;
export type CreatePOIResponse = ApiResponse<POI>;
export type UpdatePOIResponse = ApiResponse<POI>;
export type POIAnalyticsResponse = ApiResponse<POIAnalytics>;