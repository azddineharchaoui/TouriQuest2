/**
 * Property Service API Client
 * Handles all property-related API calls
 */

import api from './api';
import type { 
  Property, 
  PropertySearchFilters, 
  PropertyAvailability,
  Review,
  ApiResponse,
  PaginationMeta
} from '../types/api-types';

// Enhanced interfaces for property service
export interface PropertySearchRequest extends PropertySearchFilters {
  page?: number;
  limit?: number;
  sortBy?: 'price' | 'rating' | 'distance' | 'popularity' | 'newest';
  sortOrder?: 'asc' | 'desc';
}

export interface PropertySearchResponse {
  properties: Property[];
  meta: PaginationMeta;
  filters: {
    appliedFilters: PropertySearchFilters;
    availableFilters: {
      propertyTypes: Array<{ id: string; name: string; count: number }>;
      amenities: Array<{ id: string; name: string; count: number }>;
      priceRange: { min: number; max: number };
      ratingRange: { min: number; max: number };
    };
  };
}

export interface PriceComparisonRequest {
  location: string;
  checkIn: string;
  checkOut: string;
  guests: number;
}

export interface PriceComparisonResponse {
  averagePrice: number;
  priceRange: [number, number];
  dealCount: number;
  priceChangePercentage: number;
  historicalData: Array<{
    date: string;
    averagePrice: number;
  }>;
  competitorData?: Array<{
    platform: string;
    averagePrice: number;
    propertyCount: number;
  }>;
}

export interface SavedSearch {
  id: string;
  name: string;
  filters: PropertySearchFilters;
  alertsEnabled: boolean;
  createdAt: string;
  lastNotified?: string;
  matchCount: number;
}

export interface PropertyAvailabilityRequest {
  propertyId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
}

export interface PropertyDetailsResponse extends Omit<Property, 'pricing'> {
  nearbyProperties: Property[];
  similarProperties: Property[];
  hostOtherProperties: Property[];
  availability: PropertyAvailability[];
  pricing: {
    totalPrice: number;
    breakdown: {
      basePrice: number;
      cleaningFee: number;
      serviceFee: number;
      taxes: number;
      discounts: number;
    };
  };
  originalPricing: Property['pricing']; // Keep original pricing structure
}

export interface FavoriteRequest {
  propertyId: string;
  action: 'add' | 'remove';
}

class PropertyService {
  /**
   * Search properties with filters and pagination
   */
  async searchProperties(filters: PropertySearchRequest): Promise<PropertySearchResponse> {
    const response = await api.get<PropertySearchResponse>('/properties/search', {
      params: filters,
    });
    return response.data;
  }

  /**
   * Get property details by ID
   */
  async getPropertyDetails(id: string): Promise<PropertyDetailsResponse> {
    const response = await api.get<PropertyDetailsResponse>(`/properties/${id}`);
    return response.data;
  }

  /**
   * Check property availability
   */
  async checkAvailability(request: PropertyAvailabilityRequest): Promise<PropertyAvailability[]> {
    const response = await api.get<PropertyAvailability[]>(`/properties/${request.propertyId}/availability`, {
      params: {
        checkIn: request.checkIn,
        checkOut: request.checkOut,
        guests: request.guests,
      },
    });
    return response.data;
  }

  /**
   * Get property reviews
   */
  async getPropertyReviews(
    propertyId: string, 
    page: number = 1, 
    limit: number = 20
  ): Promise<{ reviews: Review[]; meta: PaginationMeta }> {
    const response = await api.get<{ reviews: Review[]; meta: PaginationMeta }>(
      `/properties/${propertyId}/reviews`,
      {
        params: { page, limit },
      }
    );
    return response.data;
  }

  /**
   * Add property review
   */
  async addPropertyReview(
    propertyId: string,
    review: {
      rating: number;
      comment: string;
      photos?: File[];
    }
  ): Promise<Review> {
    const formData = new FormData();
    formData.append('rating', review.rating.toString());
    formData.append('comment', review.comment);
    
    if (review.photos) {
      review.photos.forEach((photo, index) => {
        formData.append(`photos[${index}]`, photo);
      });
    }

    const response = await api.post<Review>(`/properties/${propertyId}/reviews`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  /**
   * Get property amenities
   */
  async getPropertyAmenities(propertyId: string): Promise<any[]> {
    const response = await api.get<any[]>(`/properties/${propertyId}/amenities`);
    return response.data;
  }

  /**
   * Get property photos
   */
  async getPropertyPhotos(propertyId: string): Promise<any[]> {
    const response = await api.get<any[]>(`/properties/${propertyId}/photos`);
    return response.data;
  }

  /**
   * Get nearby properties
   */
  async getNearbyProperties(propertyId: string, radius: number = 5): Promise<Property[]> {
    const response = await api.get<Property[]>(`/properties/${propertyId}/nearby`, {
      params: { radius },
    });
    return response.data;
  }

  /**
   * Get property pricing details
   */
  async getPropertyPricing(
    propertyId: string,
    checkIn: string,
    checkOut: string,
    guests: number
  ): Promise<any> {
    const response = await api.get<any>(`/properties/${propertyId}/pricing`, {
      params: { checkIn, checkOut, guests },
    });
    return response.data;
  }

  /**
   * Add property to favorites
   */
  async addToFavorites(propertyId: string): Promise<void> {
    await api.post(`/properties/${propertyId}/favorite`);
  }

  /**
   * Remove property from favorites
   */
  async removeFromFavorites(propertyId: string): Promise<void> {
    await api.delete(`/properties/${propertyId}/favorite`);
  }

  /**
   * Get user's favorite properties
   */
  async getFavorites(page: number = 1, limit: number = 20): Promise<{ properties: Property[]; meta: PaginationMeta }> {
    const response = await api.get<{ properties: Property[]; meta: PaginationMeta }>('/properties/favorites', {
      params: { page, limit },
    });
    return response.data;
  }

  /**
   * Save a search query
   */
  async saveSearch(search: Omit<SavedSearch, 'id' | 'createdAt' | 'matchCount'>): Promise<SavedSearch> {
    const response = await api.post<SavedSearch>('/properties/saved-searches', search);
    return response.data;
  }

  /**
   * Get saved searches
   */
  async getSavedSearches(): Promise<SavedSearch[]> {
    const response = await api.get<SavedSearch[]>('/properties/saved-searches');
    return response.data;
  }

  /**
   * Delete saved search
   */
  async deleteSavedSearch(searchId: string): Promise<void> {
    await api.delete(`/properties/saved-searches/${searchId}`);
  }

  /**
   * Update saved search
   */
  async updateSavedSearch(searchId: string, updates: Partial<SavedSearch>): Promise<SavedSearch> {
    const response = await api.put<SavedSearch>(`/properties/saved-searches/${searchId}`, updates);
    return response.data;
  }

  /**
   * Get price comparison data
   */
  async getPriceComparison(request: PriceComparisonRequest): Promise<PriceComparisonResponse> {
    const response = await api.get<PriceComparisonResponse>('/properties/price-comparison', {
      params: request,
    });
    return response.data;
  }

  /**
   * Get popular properties
   */
  async getPopularProperties(location?: string, limit: number = 10): Promise<Property[]> {
    const response = await api.get<Property[]>('/properties/popular', {
      params: { location, limit },
    });
    return response.data;
  }

  /**
   * Get recommended properties for user
   */
  async getRecommendedProperties(limit: number = 10): Promise<Property[]> {
    const response = await api.get<Property[]>('/properties/recommended', {
      params: { limit },
    });
    return response.data;
  }

  /**
   * Book a property
   */
  async bookProperty(
    propertyId: string,
    booking: {
      checkIn: string;
      checkOut: string;
      guests: number;
      specialRequests?: string;
    }
  ): Promise<any> {
    const response = await api.post<any>(`/properties/${propertyId}/book`, booking);
    return response.data;
  }

  /**
   * Get property availability in bulk for multiple properties
   */
  async getBulkAvailability(
    propertyIds: string[],
    checkIn: string,
    checkOut: string,
    guests: number
  ): Promise<Record<string, PropertyAvailability[]>> {
    const response = await api.post<Record<string, PropertyAvailability[]>>('/properties/bulk-availability', {
      propertyIds,
      checkIn,
      checkOut,
      guests,
    });
    return response.data;
  }

  /**
   * Report property issue
   */
  async reportProperty(
    propertyId: string,
    report: {
      reason: string;
      description: string;
      evidence?: File[];
    }
  ): Promise<void> {
    const formData = new FormData();
    formData.append('reason', report.reason);
    formData.append('description', report.description);
    
    if (report.evidence) {
      report.evidence.forEach((file, index) => {
        formData.append(`evidence[${index}]`, file);
      });
    }

    await api.post(`/properties/${propertyId}/report`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  /**
   * Get property statistics (for admin/host)
   */
  async getPropertyStatistics(propertyId: string, period: string = '30d'): Promise<any> {
    const response = await api.get<any>(`/properties/${propertyId}/statistics`, {
      params: { period },
    });
    return response.data;
  }
}

// Export singleton instance
export const propertyService = new PropertyService();
export default propertyService;