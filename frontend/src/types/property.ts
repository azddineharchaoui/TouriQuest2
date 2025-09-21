import { ApiResponse, PaginatedResponse, SearchFilters, Address, Review, Media, Price, WeatherInfo } from './common';

// Property Types
export interface Property {
  id: string;
  name: string;
  description: string;
  type: 'hotel' | 'apartment' | 'villa' | 'guesthouse' | 'resort' | 'hostel' | 'other';
  category: string;
  address: Address;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  rating: number;
  reviewCount: number;
  priceRange: {
    min: number;
    max: number;
    currency: string;
  };
  amenities: Amenity[];
  photos: Media[];
  policies: {
    checkIn: string;
    checkOut: string;
    cancellation: string;
    pets: boolean;
    smoking: boolean;
    minAge: number;
  };
  contact: {
    phone?: string;
    email?: string;
    website?: string;
  };
  features: string[];
  isActive: boolean;
  isFeatured: boolean;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Amenity {
  id: string;
  name: string;
  icon: string;
  category: string;
  description?: string;
  isIncluded: boolean;
  additionalCost?: Price;
}

export interface PropertyAvailability {
  date: string;
  available: boolean;
  price: Price;
  minimumStay: number;
  restrictions?: string[];
}

export interface PropertySearchFilters extends SearchFilters {
  type?: string[];
  amenities?: string[];
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  rooms?: number;
  priceType?: 'per_night' | 'per_person' | 'total';
}

export interface PropertyBookingRequest {
  propertyId: string;
  checkIn: string;
  checkOut: string;
  guests: {
    adults: number;
    children: number;
    infants: number;
  };
  rooms: number;
  specialRequests?: string;
  guestInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  paymentMethod: string;
}

export interface PropertyPricing {
  basePrice: Price;
  taxes: Price;
  fees: Price;
  total: Price;
  breakdown: Array<{
    name: string;
    amount: Price;
    type: 'base' | 'tax' | 'fee' | 'discount';
  }>;
  cancellationPolicy: string;
}

export interface NearbyProperty {
  property: Property;
  distance: number;
  travelTime?: {
    walking: number;
    driving: number;
    transit: number;
  };
}

// Property Management (Admin)
export interface CreatePropertyRequest {
  name: string;
  description: string;
  type: string;
  category: string;
  address: Address;
  amenities: string[];
  policies: Property['policies'];
  contact: Property['contact'];
  features: string[];
  photos?: File[];
}

export interface UpdatePropertyRequest extends Partial<CreatePropertyRequest> {
  isActive?: boolean;
  isFeatured?: boolean;
}

export interface PropertyManagement {
  properties: Property[];
  totalRevenue: Price;
  occupancyRate: number;
  averageRating: number;
  pendingBookings: number;
  recentActivity: PropertyActivity[];
}

export interface PropertyActivity {
  id: string;
  type: 'booking' | 'review' | 'inquiry' | 'update';
  title: string;
  description: string;
  propertyId: string;
  propertyName: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface PropertyAnalytics {
  overview: {
    totalBookings: number;
    totalRevenue: Price;
    averageRating: number;
    occupancyRate: number;
  };
  trends: {
    bookings: Array<{ date: string; count: number; revenue: number }>;
    ratings: Array<{ date: string; rating: number }>;
    occupancy: Array<{ date: string; rate: number }>;
  };
  demographics: {
    countries: Array<{ country: string; percentage: number }>;
    ageGroups: Array<{ group: string; percentage: number }>;
    bookingChannels: Array<{ channel: string; percentage: number }>;
  };
  performance: {
    topPerforming: Property[];
    lowPerforming: Property[];
    seasonal: Array<{ month: string; performance: number }>;
  };
}

// API Response Types
export type PropertySearchResponse = ApiResponse<PaginatedResponse<Property>>;
export type PropertyDetailsResponse = ApiResponse<Property>;
export type PropertyAvailabilityResponse = ApiResponse<PropertyAvailability[]>;
export type PropertyPricingResponse = ApiResponse<PropertyPricing>;
export type PropertyReviewsResponse = ApiResponse<PaginatedResponse<Review>>;
export type PropertyAmenitiesResponse = ApiResponse<Amenity[]>;
export type PropertyPhotosResponse = ApiResponse<Media[]>;
export type NearbyPropertiesResponse = ApiResponse<NearbyProperty[]>;
export type PropertyBookingResponse = ApiResponse<{ bookingId: string; confirmationCode: string }>;
export type PropertyFavoritesResponse = ApiResponse<Property[]>;
export type PropertyManagementResponse = ApiResponse<PropertyManagement>;
export type PropertyAnalyticsResponse = ApiResponse<PropertyAnalytics>;
export type CreatePropertyResponse = ApiResponse<Property>;
export type UpdatePropertyResponse = ApiResponse<Property>;