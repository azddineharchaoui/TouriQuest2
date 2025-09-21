import { ApiResponse, PaginatedResponse, SearchFilters, Address, Review, Media, Price, WeatherInfo } from './common';

// Experience Types
export interface Experience {
  id: string;
  name: string;
  description: string;
  category: ExperienceCategory;
  subcategory?: string;
  type: 'tour' | 'activity' | 'workshop' | 'adventure' | 'cultural' | 'food' | 'nature' | 'entertainment';
  duration: {
    value: number;
    unit: 'hours' | 'days' | 'weeks';
  };
  difficulty: 'easy' | 'moderate' | 'challenging' | 'extreme';
  groupSize: {
    min: number;
    max: number;
  };
  ageRestriction: {
    min?: number;
    max?: number;
  };
  location: Address;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  pricing: ExperiencePricing;
  availability: ExperienceAvailability[];
  inclusions: string[];
  exclusions: string[];
  requirements: string[];
  whatToBring: string[];
  cancellationPolicy: string;
  photos: Media[];
  videos?: Media[];
  itinerary: ItineraryItem[];
  guide: Guide;
  languages: string[];
  accessibility: string[];
  rating: number;
  reviewCount: number;
  bookingCount: number;
  isActive: boolean;
  isFeatured: boolean;
  isInstantBooking: boolean;
  tags: string[];
  seasonality: string[];
  weatherDependency: boolean;
  providerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExperienceCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  subcategories: string[];
}

export interface ExperiencePricing {
  type: 'per_person' | 'per_group' | 'per_booking';
  currency: string;
  basePrice: number;
  discounts: Array<{
    type: 'early_bird' | 'group' | 'senior' | 'student' | 'child';
    description: string;
    amount: number;
    percentage?: number;
    conditions?: string;
  }>;
  seasonalPricing?: Array<{
    season: string;
    startDate: string;
    endDate: string;
    priceMultiplier: number;
  }>;
  surcharges?: Array<{
    name: string;
    amount: number;
    description: string;
    isOptional: boolean;
  }>;
}

export interface ExperienceAvailability {
  date: string;
  timeSlots: Array<{
    startTime: string;
    endTime: string;
    available: boolean;
    spotsLeft: number;
    price: Price;
  }>;
  isAvailable: boolean;
  blackoutReason?: string;
}

export interface ItineraryItem {
  id: string;
  order: number;
  title: string;
  description: string;
  duration: number; // in minutes
  location?: {
    name: string;
    coordinates?: { latitude: number; longitude: number };
  };
  activities: string[];
  photos?: string[];
  tips?: string[];
}

export interface Guide {
  id: string;
  name: string;
  bio: string;
  photo?: string;
  languages: string[];
  specialties: string[];
  experience: number; // years
  rating: number;
  reviewCount: number;
  certifications: string[];
  contact?: {
    email?: string;
    phone?: string;
  };
}

export interface ExperienceSearchFilters extends SearchFilters {
  categories?: string[];
  types?: string[];
  duration?: {
    min?: number;
    max?: number;
    unit: 'hours' | 'days';
  };
  difficulty?: string[];
  groupSize?: number;
  date?: string;
  time?: string;
  hasAvailability?: boolean;
  languages?: string[];
  accessibility?: string[];
  features?: string[];
}

export interface ExperienceBookingRequest {
  experienceId: string;
  date: string;
  timeSlot: string;
  participants: {
    adults: number;
    children: number;
    seniors: number;
  };
  specialRequests?: string;
  dietaryRestrictions?: string[];
  accessibilityNeeds?: string[];
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  participantDetails: Array<{
    name: string;
    age: number;
    email?: string;
    phone?: string;
  }>;
  paymentMethod: string;
  promoCode?: string;
}

export interface ExperienceBookingPricing {
  basePrice: Price;
  discounts: Price;
  taxes: Price;
  fees: Price;
  total: Price;
  breakdown: Array<{
    name: string;
    amount: Price;
    type: 'base' | 'discount' | 'tax' | 'fee';
  }>;
  cancellationTerms: string;
}

// Experience Management (Admin)
export interface CreateExperienceRequest {
  name: string;
  description: string;
  category: string;
  subcategory?: string;
  type: Experience['type'];
  duration: Experience['duration'];
  difficulty: Experience['difficulty'];
  groupSize: Experience['groupSize'];
  ageRestriction: Experience['ageRestriction'];
  location: Address;
  pricing: ExperiencePricing;
  inclusions: string[];
  exclusions: string[];
  requirements: string[];
  whatToBring: string[];
  cancellationPolicy: string;
  itinerary: Omit<ItineraryItem, 'id'>[];
  guide: Omit<Guide, 'id' | 'rating' | 'reviewCount'>;
  languages: string[];
  accessibility: string[];
  tags: string[];
  seasonality: string[];
  weatherDependency: boolean;
  photos?: File[];
  videos?: File[];
}

export interface UpdateExperienceRequest extends Partial<CreateExperienceRequest> {
  isActive?: boolean;
  isFeatured?: boolean;
  isInstantBooking?: boolean;
}

export interface ExperienceAnalytics {
  overview: {
    totalBookings: number;
    totalRevenue: Price;
    averageRating: number;
    completionRate: number;
  };
  trends: {
    bookings: Array<{ date: string; count: number; revenue: number }>;
    ratings: Array<{ date: string; rating: number }>;
    cancellations: Array<{ date: string; count: number; reason: string }>;
  };
  demographics: {
    countries: Array<{ country: string; percentage: number }>;
    ageGroups: Array<{ group: string; percentage: number }>;
    groupSizes: Array<{ size: number; percentage: number }>;
  };
  seasonal: Array<{ month: string; bookings: number; revenue: number }>;
  performance: {
    topPerforming: Experience[];
    mostCancelled: Experience[];
    seasonalTrends: Array<{ season: string; performance: number }>;
  };
}

// API Response Types
export type ExperienceSearchResponse = ApiResponse<PaginatedResponse<Experience>>;
export type ExperienceDetailsResponse = ApiResponse<Experience>;
export type ExperienceAvailabilityResponse = ApiResponse<ExperienceAvailability[]>;
export type ExperienceBookingResponse = ApiResponse<{ bookingId: string; confirmationCode: string }>;
export type ExperienceReviewsResponse = ApiResponse<PaginatedResponse<Review>>;
export type ExperiencePhotosResponse = ApiResponse<Media[]>;
export type ExperienceItineraryResponse = ApiResponse<ItineraryItem[]>;
export type ExperienceWeatherResponse = ApiResponse<WeatherInfo>;
export type ExperienceCategoriesResponse = ApiResponse<ExperienceCategory[]>;
export type PopularExperiencesResponse = ApiResponse<Experience[]>;
export type RecommendedExperiencesResponse = ApiResponse<Experience[]>;
export type ExperienceBookingPricingResponse = ApiResponse<ExperienceBookingPricing>;
export type CreateExperienceResponse = ApiResponse<Experience>;
export type UpdateExperienceResponse = ApiResponse<Experience>;
export type ExperienceAnalyticsResponse = ApiResponse<ExperienceAnalytics>;