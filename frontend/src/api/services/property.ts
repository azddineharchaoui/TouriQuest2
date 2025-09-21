import { BaseService } from '../base';
import { ApiClient } from '../client';
import {
  Property,
  PropertySearchFilters,
  PropertyAvailability,
  PropertyBookingRequest,
  PropertyPricing,
  NearbyProperty,
  CreatePropertyRequest,
  UpdatePropertyRequest,
  PropertyManagement,
  PropertyAnalytics,
  PropertySearchResponse,
  PropertyDetailsResponse,
  PropertyAvailabilityResponse,
  PropertyPricingResponse,
  PropertyReviewsResponse,
  PropertyAmenitiesResponse,
  PropertyPhotosResponse,
  NearbyPropertiesResponse,
  PropertyBookingResponse,
  PropertyFavoritesResponse,
  PropertyManagementResponse,
  PropertyAnalyticsResponse,
  CreatePropertyResponse,
  UpdatePropertyResponse,
  Amenity,
} from '../../types/property';
import { Review, Media } from '../../types/common';

/**
 * Property Service
 * Handles all property-related API calls
 */
export class PropertyService extends BaseService {
  constructor(client: ApiClient) {
    super(client, '/properties');
  }

  /**
   * Search properties
   * GET /api/v1/properties/search
   */
  async searchProperties(filters: PropertySearchFilters = {}): Promise<PropertySearchResponse> {
    try {
      const cacheKey = this.getCacheKey('GET', 'search', filters);
      const cached = await this.getFromCache<PropertySearchResponse>(cacheKey);
      
      if (cached) {
        return cached;
      }

      const response = await this.search<Property>(filters);
      
      // Cache search results for 2 minutes
      await this.setCache(cacheKey, response, 120000);
      
      return response;
    } catch (error) {
      this.handleError(error, 'searchProperties');
    }
  }

  /**
   * Get property details
   * GET /api/v1/properties/{id}
   */
  async getProperty(id: string): Promise<PropertyDetailsResponse> {
    try {
      this.validateRequired({ id }, ['id']);
      
      const cacheKey = this.getCacheKey('GET', id);
      const cached = await this.getFromCache<PropertyDetailsResponse>(cacheKey);
      
      if (cached) {
        return cached;
      }

      const response = await this.getById<Property>(id);
      
      // Cache property details for 5 minutes
      await this.setCache(cacheKey, response, 300000);
      
      return response;
    } catch (error) {
      this.handleError(error, 'getProperty');
    }
  }

  /**
   * Create property (admin)
   * POST /api/v1/properties/
   */
  async createProperty(data: CreatePropertyRequest): Promise<CreatePropertyResponse> {
    try {
      this.validateRequired(data, ['name', 'description', 'type', 'address']);
      
      let propertyData = { ...data };
      let uploadedPhotos: string[] = [];

      // Handle photo uploads separately
      if (data.photos && data.photos.length > 0) {
        // First create the property without photos
        delete propertyData.photos;
        
        const propertyResponse = await this.create<Property>(this.transformRequest(propertyData));
        
        if (propertyResponse.success && propertyResponse.data) {
          // Then upload photos
          const photoResponse = await this.uploadPhotos(propertyResponse.data.id, data.photos);
          if (photoResponse.success && photoResponse.data) {
            uploadedPhotos = photoResponse.data.map(media => media.url);
          }
        }
        
        // Clear cache
        this.clearCache();
        
        return propertyResponse;
      }

      const response = await this.create<Property>(this.transformRequest(propertyData));
      
      // Clear cache
      this.clearCache();
      
      return response;
    } catch (error) {
      this.handleError(error, 'createProperty');
    }
  }

  /**
   * Update property (admin)
   * PUT /api/v1/properties/{id}
   */
  async updateProperty(id: string, data: UpdatePropertyRequest): Promise<UpdatePropertyResponse> {
    try {
      this.validateRequired({ id }, ['id']);
      
      const response = await this.update<Property>(id, this.transformRequest(data));
      
      // Clear relevant cache
      this.clearCache(id);
      this.clearCache('search');
      
      return response;
    } catch (error) {
      this.handleError(error, 'updateProperty');
    }
  }

  /**
   * Delete property (admin)
   * DELETE /api/v1/properties/{id}
   */
  async deleteProperty(id: string): Promise<void> {
    try {
      this.validateRequired({ id }, ['id']);
      
      await this.delete(id);
      
      // Clear relevant cache
      this.clearCache(id);
      this.clearCache('search');
    } catch (error) {
      this.handleError(error, 'deleteProperty');
    }
  }

  /**
   * Check property availability
   * GET /api/v1/properties/{id}/availability
   */
  async getAvailability(
    id: string,
    startDate?: string,
    endDate?: string,
    guests?: number
  ): Promise<PropertyAvailabilityResponse> {
    try {
      this.validateRequired({ id }, ['id']);
      
      const params = {
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
        ...(guests && { guests }),
      };

      const queryString = this.buildQueryString(params);
      const url = this.buildUrl(`${id}/availability${queryString}`);
      
      return await this.client.get<PropertyAvailability[]>(url);
    } catch (error) {
      this.handleError(error, 'getAvailability');
    }
  }

  /**
   * Book property
   * POST /api/v1/properties/{id}/book
   */
  async bookProperty(id: string, data: PropertyBookingRequest): Promise<PropertyBookingResponse> {
    try {
      this.validateRequired({ id }, ['id']);
      this.validateRequired(data, [
        'checkIn',
        'checkOut',
        'guests',
        'guestInfo',
        'paymentMethod'
      ]);
      
      const url = this.buildUrl(`${id}/book`);
      const response = await this.client.post<{ bookingId: string; confirmationCode: string }>(
        url,
        this.transformRequest(data)
      );
      
      // Clear availability cache for this property
      this.clearCache(`${id}/availability`);
      
      return response;
    } catch (error) {
      this.handleError(error, 'bookProperty');
    }
  }

  /**
   * Get property reviews
   * GET /api/v1/properties/{id}/reviews
   */
  async getReviews(
    id: string,
    page: number = 1,
    limit: number = 10,
    sortBy: string = 'newest'
  ): Promise<PropertyReviewsResponse> {
    try {
      this.validateRequired({ id }, ['id']);
      
      const params = { page, limit, sortBy };
      const queryString = this.buildQueryString(params);
      const url = this.buildUrl(`${id}/reviews${queryString}`);
      
      return await this.client.get<any>(url);
    } catch (error) {
      this.handleError(error, 'getReviews');
    }
  }

  /**
   * Add property review
   * POST /api/v1/properties/{id}/reviews
   */
  async addReview(
    id: string,
    review: {
      rating: number;
      title?: string;
      comment: string;
      pros?: string[];
      cons?: string[];
      photos?: File[];
    }
  ): Promise<PropertyReviewsResponse> {
    try {
      this.validateRequired({ id }, ['id']);
      this.validateRequired(review, ['rating', 'comment']);
      
      let reviewData = { ...review };
      
      // Handle photo uploads separately if present
      if (review.photos && review.photos.length > 0) {
        // Upload photos first
        const photoUrls = await this.uploadReviewPhotos(id, review.photos);
        delete reviewData.photos;
        (reviewData as any).photoUrls = photoUrls;
      }
      
      const url = this.buildUrl(`${id}/reviews`);
      const response = await this.client.post<Review>(url, reviewData);
      
      // Clear reviews cache
      this.clearCache(`${id}/reviews`);
      
      // Transform single review response to paginated response
      return {
        ...response,
        data: {
          items: response.data ? [response.data] : [],
          total: 1,
          page: 1,
          limit: 1,
          totalPages: 1,
          hasNext: false,
          hasPrevious: false
        }
      };
    } catch (error) {
      this.handleError(error, 'addReview');
    }
  }

  /**
   * Get property amenities
   * GET /api/v1/properties/{id}/amenities
   */
  async getAmenities(id: string): Promise<PropertyAmenitiesResponse> {
    try {
      this.validateRequired({ id }, ['id']);
      
      const cacheKey = this.getCacheKey('GET', `${id}/amenities`);
      const cached = await this.getFromCache<PropertyAmenitiesResponse>(cacheKey);
      
      if (cached) {
        return cached;
      }

      const response = await this.getById<Amenity[]>(id, 'amenities');
      
      // Cache amenities for 10 minutes
      await this.setCache(cacheKey, response, 600000);
      
      return response;
    } catch (error) {
      this.handleError(error, 'getAmenities');
    }
  }

  /**
   * Get property photos
   * GET /api/v1/properties/{id}/photos
   */
  async getPhotos(id: string): Promise<PropertyPhotosResponse> {
    try {
      this.validateRequired({ id }, ['id']);
      
      const cacheKey = this.getCacheKey('GET', `${id}/photos`);
      const cached = await this.getFromCache<PropertyPhotosResponse>(cacheKey);
      
      if (cached) {
        return cached;
      }

      const response = await this.getById<Media[]>(id, 'photos');
      
      // Cache photos for 15 minutes
      await this.setCache(cacheKey, response, 900000);
      
      return response;
    } catch (error) {
      this.handleError(error, 'getPhotos');
    }
  }

  /**
   * Upload property photos (admin)
   * POST /api/v1/properties/{id}/photos
   */
  async uploadPhotos(id: string, photos: File[]): Promise<PropertyPhotosResponse> {
    try {
      this.validateRequired({ id }, ['id']);
      
      if (!photos || photos.length === 0) {
        throw new Error('No photos provided');
      }

      const response = await this.upload<Media[]>(id, photos, 'photos');
      
      // Clear photos cache
      this.clearCache(`${id}/photos`);
      
      return response;
    } catch (error) {
      this.handleError(error, 'uploadPhotos');
    }
  }

  /**
   * Get nearby properties
   * GET /api/v1/properties/{id}/nearby
   */
  async getNearbyProperties(
    id: string,
    radius: number = 5,
    limit: number = 10
  ): Promise<NearbyPropertiesResponse> {
    try {
      this.validateRequired({ id }, ['id']);
      
      const params = { radius, limit };
      const queryString = this.buildQueryString(params);
      const url = this.buildUrl(`${id}/nearby${queryString}`);
      
      return await this.client.get<NearbyProperty[]>(url);
    } catch (error) {
      this.handleError(error, 'getNearbyProperties');
    }
  }

  /**
   * Get pricing details
   * GET /api/v1/properties/{id}/pricing
   */
  async getPricing(
    id: string,
    checkIn?: string,
    checkOut?: string,
    guests?: number
  ): Promise<PropertyPricingResponse> {
    try {
      this.validateRequired({ id }, ['id']);
      
      const params = {
        ...(checkIn && { checkIn }),
        ...(checkOut && { checkOut }),
        ...(guests && { guests }),
      };

      const queryString = this.buildQueryString(params);
      const url = this.buildUrl(`${id}/pricing${queryString}`);
      
      return await this.client.get<PropertyPricing>(url);
    } catch (error) {
      this.handleError(error, 'getPricing');
    }
  }

  /**
   * Add to favorites
   * POST /api/v1/properties/{id}/favorite
   */
  async addToFavorites(id: string): Promise<void> {
    try {
      this.validateRequired({ id }, ['id']);
      
      await this.client.post(this.buildUrl(`${id}/favorite`));
      
      // Clear favorites cache
      this.clearCache('favorites');
    } catch (error) {
      this.handleError(error, 'addToFavorites');
    }
  }

  /**
   * Remove from favorites
   * DELETE /api/v1/properties/{id}/favorite
   */
  async removeFromFavorites(id: string): Promise<void> {
    try {
      this.validateRequired({ id }, ['id']);
      
      await this.client.delete(this.buildUrl(`${id}/favorite`));
      
      // Clear favorites cache
      this.clearCache('favorites');
    } catch (error) {
      this.handleError(error, 'removeFromFavorites');
    }
  }

  /**
   * Get user favorites
   * GET /api/v1/properties/favorites
   */
  async getFavorites(): Promise<PropertyFavoritesResponse> {
    try {
      const cacheKey = this.getCacheKey('GET', 'favorites');
      const cached = await this.getFromCache<PropertyFavoritesResponse>(cacheKey);
      
      if (cached) {
        return cached;
      }

      const response = await this.client.get<Property[]>(this.buildUrl('favorites'));
      
      // Cache favorites for 5 minutes
      await this.setCache(cacheKey, response, 300000);
      
      return response;
    } catch (error) {
      this.handleError(error, 'getFavorites');
    }
  }

  /**
   * Property management (admin)
   * GET /api/v1/properties/management
   */
  async getPropertyManagement(): Promise<PropertyManagementResponse> {
    try {
      return await this.client.get<PropertyManagement>(this.buildUrl('management'));
    } catch (error) {
      this.handleError(error, 'getPropertyManagement');
    }
  }

  /**
   * Property analytics (admin)
   * GET /api/v1/properties/analytics
   */
  async getPropertyAnalytics(
    startDate?: string,
    endDate?: string,
    propertyIds?: string[]
  ): Promise<PropertyAnalyticsResponse> {
    try {
      const params = {
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
        ...(propertyIds && { propertyIds: propertyIds.join(',') }),
      };

      const queryString = this.buildQueryString(params);
      const url = this.buildUrl(`analytics${queryString}`);
      
      return await this.client.get<PropertyAnalytics>(url);
    } catch (error) {
      this.handleError(error, 'getPropertyAnalytics');
    }
  }

  /**
   * Helper method to upload review photos
   */
  private async uploadReviewPhotos(propertyId: string, photos: File[]): Promise<string[]> {
    try {
      const formData = new FormData();
      photos.forEach((photo, index) => {
        formData.append(`photos[${index}]`, photo);
      });

      const response = await this.client.post<string[]>(
        this.buildUrl(`${propertyId}/reviews/photos`),
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      return response.data || [];
    } catch (error) {
      console.warn('Failed to upload review photos:', error);
      return [];
    }
  }

  /**
   * Transform property data before sending
   */
  protected transformRequest<T>(data: T): T {
    if (typeof data === 'object' && data !== null) {
      const transformed = { ...data } as any;
      
      // Format dates
      if (transformed.checkIn) {
        transformed.checkIn = new Date(transformed.checkIn).toISOString().split('T')[0];
      }
      if (transformed.checkOut) {
        transformed.checkOut = new Date(transformed.checkOut).toISOString().split('T')[0];
      }
      
      // Ensure coordinates are numbers
      if (transformed.coordinates) {
        transformed.coordinates.latitude = parseFloat(transformed.coordinates.latitude);
        transformed.coordinates.longitude = parseFloat(transformed.coordinates.longitude);
      }
      
      return transformed;
    }
    
    return data;
  }
}