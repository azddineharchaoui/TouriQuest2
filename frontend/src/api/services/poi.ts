import { BaseService } from '../base';
import { ApiClient } from '../client';
import {
  POI,
  POISearchFilters,
  POISearchResponse,
  POIDetailsResponse,
  POIReviewsResponse,
  POIPhotosResponse,
  POIHoursResponse,
  POIEventsResponse,
  VisitRecordResponse,
  POIAudioGuideResponse,
  POICategoriesResponse,
  PopularPOIsResponse,
  NearbyPOIsResponse,
  VisitRecord,
  POIEvent,
  AudioGuide,
  POICategory,
  CreatePOIRequest,
  UpdatePOIRequest,
  CreatePOIResponse,
  UpdatePOIResponse,
  PhotoGalleryResponse,
  SmartHoursResponse,
  EventsResponse,
  AudioGuideResponse,
  NearbyPOI,
  WeatherInfo,
} from '../../types/poi';
import { Review, Media } from '../../types/common';

/**
 * POI (Points of Interest) Service
 * Handles all POI-related API calls
 */
export class POIService extends BaseService {
  constructor(client: ApiClient) {
    super(client, '/pois');
  }

  /**
   * Search POIs
   * GET /api/v1/pois/search
   */
  async searchPOIs(filters: POISearchFilters = {}): Promise<POISearchResponse> {
    try {
      const cacheKey = this.getCacheKey('GET', 'search', filters);
      const cached = await this.getFromCache<POISearchResponse>(cacheKey);
      
      if (cached) {
        return cached;
      }

      const response = await this.search<POI>(filters);
      
      // Cache search results for 5 minutes
      await this.setCache(cacheKey, response, 300000);
      
      return response;
    } catch (error) {
      this.handleError(error, 'searchPOIs');
    }
  }

  /**
   * Get POI details
   * GET /api/v1/pois/{id}
   */
  async getPOI(id: string): Promise<POIDetailsResponse> {
    try {
      this.validateRequired({ id }, ['id']);
      
      const cacheKey = this.getCacheKey('GET', id);
      const cached = await this.getFromCache<POIDetailsResponse>(cacheKey);
      
      if (cached) {
        return cached;
      }

      const response = await this.getById<POI>(id);
      
      // Cache POI details for 10 minutes
      await this.setCache(cacheKey, response, 600000);
      
      return response;
    } catch (error) {
      this.handleError(error, 'getPOI');
    }
  }

  /**
   * Create POI (admin)
   * POST /api/v1/pois/
   */
  async createPOI(data: CreatePOIRequest): Promise<CreatePOIResponse> {
    try {
      this.validateRequired(data, ['name', 'description', 'type', 'coordinates']);
      
      const response = await this.create<POI>(this.transformRequest(data));
      
      // Clear cache
      this.clearCache();
      
      return response;
    } catch (error) {
      this.handleError(error, 'createPOI');
    }
  }

  /**
   * Update POI (admin)
   * PUT /api/v1/pois/{id}
   */
  async updatePOI(id: string, data: UpdatePOIRequest): Promise<UpdatePOIResponse> {
    try {
      this.validateRequired({ id }, ['id']);
      
      const response = await this.update<POI>(id, this.transformRequest(data));
      
      // Clear relevant cache
      this.clearCache(id);
      this.clearCache('search');
      
      return response;
    } catch (error) {
      this.handleError(error, 'updatePOI');
    }
  }

  /**
   * Delete POI (admin)
   * DELETE /api/v1/pois/{id}
   */
  async deletePOI(id: string): Promise<void> {
    try {
      this.validateRequired({ id }, ['id']);
      
      await this.delete(id);
      
      // Clear relevant cache
      this.clearCache(id);
      this.clearCache('search');
    } catch (error) {
      this.handleError(error, 'deletePOI');
    }
  }

  /**
   * Get POI reviews
   * GET /api/v1/pois/{id}/reviews
   */
  async getReviews(
    id: string,
    page: number = 1,
    limit: number = 10,
    sortBy: string = 'newest'
  ): Promise<POIReviewsResponse> {
    try {
      this.validateRequired({ id }, ['id']);
      
      const params = { page, limit, sortBy };
      const queryString = this.buildQueryString(params);
      const cacheKey = this.getCacheKey('GET', `${id}/reviews`, params);
      
      const cached = await this.getFromCache<POIReviewsResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      const url = this.buildUrl(`${id}/reviews${queryString}`);
      const response = await this.client.get<any>(url);
      
      // Cache reviews for 5 minutes
      await this.setCache(cacheKey, response, 300000);
      
      return response;
    } catch (error) {
      this.handleError(error, 'getReviews');
    }
  }

  /**
   * Add POI review
   * POST /api/v1/pois/{id}/reviews
   */
  async addReview(
    id: string,
    review: {
      rating: number;
      title?: string;
      comment: string;
      photos?: File[];
      visitDate?: string;
    }
  ): Promise<POIReviewsResponse> {
    try {
      this.validateRequired({ id }, ['id']);
      this.validateRequired(review, ['rating', 'comment']);
      
      let reviewData = { ...review };
      
      // Handle photo uploads separately if present
      if (review.photos && review.photos.length > 0) {
        const photoUrls = await this.uploadReviewPhotos(id, review.photos);
        delete reviewData.photos;
        (reviewData as any).photoUrls = photoUrls;
      }
      
      const url = this.buildUrl(`${id}/reviews`);
      const response = await this.client.post<Review>(url, reviewData);
      
      // Clear reviews cache
      this.clearCache(`${id}/reviews`);
      
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
   * Get POI photos
   * GET /api/v1/pois/{id}/photos
   */
  async getPhotos(id: string): Promise<POIPhotosResponse> {
    try {
      this.validateRequired({ id }, ['id']);
      
      const cacheKey = this.getCacheKey('GET', `${id}/photos`);
      const cached = await this.getFromCache<POIPhotosResponse>(cacheKey);
      
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
   * Upload POI photos (admin)
   * POST /api/v1/pois/{id}/photos
   */
  async uploadPhotos(id: string, photos: File[]): Promise<POIPhotosResponse> {
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
   * Get POI operating hours
   * GET /api/v1/pois/{id}/hours
   */
  async getOperatingHours(id: string): Promise<POIHoursResponse> {
    try {
      this.validateRequired({ id }, ['id']);
      
      const cacheKey = this.getCacheKey('GET', `${id}/hours`);
      const cached = await this.getFromCache<POIHoursResponse>(cacheKey);
      
      if (cached) {
        return cached;
      }

      const url = this.buildUrl(`${id}/hours`);
      const response = await this.client.get<any>(url);
      
      // Cache operating hours for 30 minutes
      await this.setCache(cacheKey, response, 1800000);
      
      return response;
    } catch (error) {
      this.handleError(error, 'getOperatingHours');
    }
  }

  /**
   * Get POI events
   * GET /api/v1/pois/{id}/events
   */
  async getEvents(
    id: string,
    startDate?: string,
    endDate?: string
  ): Promise<POIEventsResponse> {
    try {
      this.validateRequired({ id }, ['id']);
      
      const params = {
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      };

      const queryString = this.buildQueryString(params);
      const url = this.buildUrl(`${id}/events${queryString}`);
      
      return await this.client.get<POIEvent[]>(url);
    } catch (error) {
      this.handleError(error, 'getEvents');
    }
  }

  /**
   * Track POI visit
   * POST /api/v1/pois/{id}/visit
   */
  async trackVisit(id: string, visitData?: Partial<VisitRecord>): Promise<VisitRecordResponse> {
    try {
      this.validateRequired({ id }, ['id']);
      
      const url = this.buildUrl(`${id}/visit`);
      return await this.client.post<any>(url, visitData || {});
    } catch (error) {
      this.handleError(error, 'trackVisit');
    }
  }

  /**
   * Get POI audio guide
   * GET /api/v1/pois/{id}/audio-guide
   */
  async getAudioGuide(id: string, language: string = 'en'): Promise<POIAudioGuideResponse> {
    try {
      this.validateRequired({ id }, ['id']);
      
      const params = { language };
      const queryString = this.buildQueryString(params);
      const cacheKey = this.getCacheKey('GET', `${id}/audio-guide`, params);
      
      const cached = await this.getFromCache<POIAudioGuideResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      const url = this.buildUrl(`${id}/audio-guide${queryString}`);
      const response = await this.client.get<AudioGuide>(url);
      
      // Cache audio guide for 1 hour
      await this.setCache(cacheKey, response, 3600000);
      
      return response;
    } catch (error) {
      this.handleError(error, 'getAudioGuide');
    }
  }

  /**
   * Get POI categories
   * GET /api/v1/pois/categories
   */
  async getCategories(): Promise<POICategoriesResponse> {
    try {
      const cacheKey = this.getCacheKey('GET', 'categories');
      const cached = await this.getFromCache<POICategoriesResponse>(cacheKey);
      
      if (cached) {
        return cached;
      }

      const response = await this.client.get<POICategory[]>(this.buildUrl('categories'));
      
      // Cache categories for 1 hour
      await this.setCache(cacheKey, response, 3600000);
      
      return response;
    } catch (error) {
      this.handleError(error, 'getCategories');
    }
  }

  /**
   * Get nearby POIs
   * GET /api/v1/pois/nearby
   */
  async getNearbyPOIs(
    lat: number,
    lng: number,
    radius: number = 5,
    limit: number = 10,
    category?: string
  ): Promise<POISearchResponse> {
    try {
      this.validateRequired({ lat, lng }, ['lat', 'lng']);
      
      const params = {
        lat,
        lng,
        radius,
        limit,
        ...(category && { category }),
      };

      const queryString = this.buildQueryString(params);
      const url = this.buildUrl(`nearby${queryString}`);
      
      return await this.client.get<any>(url);
    } catch (error) {
      this.handleError(error, 'getNearbyPOIs');
    }
  }

  /**
   * Get popular POIs
   * GET /api/v1/pois/popular
   */
  async getPopularPOIs(limit: number = 10, timeframe: string = 'week'): Promise<PopularPOIsResponse> {
    try {
      const params = { limit, timeframe };
      const queryString = this.buildQueryString(params);
      const cacheKey = this.getCacheKey('GET', 'popular', params);
      
      const cached = await this.getFromCache<PopularPOIsResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      const url = this.buildUrl(`popular${queryString}`);
      const response = await this.client.get<any>(url);
      
      // Cache popular POIs for 10 minutes
      await this.setCache(cacheKey, response, 600000);
      
      return response;
    } catch (error) {
      this.handleError(error, 'getPopularPOIs');
    }
  }

  /**
   * Get POI map markers
   * GET /api/v1/pois/map-markers
   */
  async getMapMarkers(
    northEast: { lat: number; lng: number },
    southWest: { lat: number; lng: number },
    zoom: number,
    category?: string
  ): Promise<NearbyPOIsResponse> {
    try {
      this.validateRequired({ northEast, southWest, zoom }, ['northEast', 'southWest', 'zoom']);
      
      const params = {
        neLat: northEast.lat,
        neLng: northEast.lng,
        swLat: southWest.lat,
        swLng: southWest.lng,
        zoom,
        ...(category && { category }),
      };

      const queryString = this.buildQueryString(params);
      const url = this.buildUrl(`map-markers${queryString}`);
      
      return await this.client.get<any>(url);
    } catch (error) {
      this.handleError(error, 'getMapMarkers');
    }
  }

  /**
   * Add to favorites
   * POST /api/v1/pois/{id}/favorite
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
   * DELETE /api/v1/pois/{id}/favorite
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
   * GET /api/v1/pois/favorites
   */
  async getFavorites(): Promise<POISearchResponse> {
    try {
      const cacheKey = this.getCacheKey('GET', 'favorites');
      const cached = await this.getFromCache<POISearchResponse>(cacheKey);
      
      if (cached) {
        return cached;
      }

      const response = await this.client.get<any>(this.buildUrl('favorites'));
      
      // Cache favorites for 5 minutes
      await this.setCache(cacheKey, response, 300000);
      
      return response;
    } catch (error) {
      this.handleError(error, 'getFavorites');
    }
  }

  /**
   * Get recommended POIs
   * GET /api/v1/pois/recommended
   */
  async getRecommendedPOIs(limit: number = 10): Promise<PopularPOIsResponse> {
    try {
      const params = { limit };
      const queryString = this.buildQueryString(params);
      const cacheKey = this.getCacheKey('GET', 'recommended', params);
      
      const cached = await this.getFromCache<PopularPOIsResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      const url = this.buildUrl(`recommended${queryString}`);
      const response = await this.client.get<any>(url);
      
      // Cache recommended POIs for 15 minutes
      await this.setCache(cacheKey, response, 900000);
      
      return response;
    } catch (error) {
      this.handleError(error, 'getRecommendedPOIs');
    }
  }

  /**
   * Helper method to upload review photos
   */
  private async uploadReviewPhotos(poiId: string, photos: File[]): Promise<string[]> {
    try {
      const formData = new FormData();
      photos.forEach((photo, index) => {
        formData.append(`photos[${index}]`, photo);
      });

      const response = await this.client.post<string[]>(
        this.buildUrl(`${poiId}/reviews/photos`),
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
   * Get POI photos with enhanced gallery features
   * GET /api/v1/pois/{id}/photos
   */
  async getPOIPhotos(
    id: string, 
    filters?: {
      category?: string;
      season?: string;
      userGenerated?: boolean;
      limit?: number;
      offset?: number;
    }
  ): Promise<POIPhotosResponse> {
    try {
      this.validateRequired({ id }, ['id']);
      
      const params = new URLSearchParams();
      if (filters?.category) params.append('category', filters.category);
      if (filters?.season) params.append('season', filters.season);
      if (filters?.userGenerated !== undefined) params.append('user_generated', filters.userGenerated.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.offset) params.append('offset', filters.offset.toString());
      
      const cacheKey = this.getCacheKey('GET', `${id}/photos`, filters || {});
      const cached = await this.getFromCache<POIPhotosResponse>(cacheKey);
      
      if (cached) {
        return cached;
      }

      const url = this.buildUrl(`${id}/photos?${params.toString()}`);
      const response = await this.client.get<PhotoGalleryResponse>(url);
      
      // Cache photos for 30 minutes
      await this.setCache(cacheKey, response, 1800000);
      
      return response;
    } catch (error) {
      this.handleError(error, 'getPOIPhotos');
    }
  }

  /**
   * Get smart operating hours with crowd predictions
   * GET /api/v1/pois/{id}/hours
   */
  async getSmartHours(id: string, date?: string): Promise<POIHoursResponse> {
    try {
      this.validateRequired({ id }, ['id']);
      
      const params = new URLSearchParams();
      if (date) params.append('date', date);
      
      const cacheKey = this.getCacheKey('GET', `${id}/hours`, { date });
      const cached = await this.getFromCache<POIHoursResponse>(cacheKey);
      
      if (cached) {
        return cached;
      }

      const url = this.buildUrl(`${id}/hours?${params.toString()}`);
      const response = await this.client.get<SmartHoursResponse>(url);
      
      // Cache hours for 15 minutes (more dynamic data)
      await this.setCache(cacheKey, response, 900000);
      
      return response;
    } catch (error) {
      this.handleError(error, 'getSmartHours');
    }
  }

  /**
   * Get enhanced events with social features
   * GET /api/v1/pois/{id}/events
   */
  async getEnhancedEvents(
    id: string,
    filters?: {
      fromDate?: string;
      toDate?: string;
      category?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<POIEventsResponse> {
    try {
      this.validateRequired({ id }, ['id']);
      
      const params = new URLSearchParams();
      if (filters?.fromDate) params.append('from_date', filters.fromDate);
      if (filters?.toDate) params.append('to_date', filters.toDate);
      if (filters?.category) params.append('category', filters.category);
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.offset) params.append('offset', filters.offset.toString());
      
      const cacheKey = this.getCacheKey('GET', `${id}/events`, filters || {});
      const cached = await this.getFromCache<POIEventsResponse>(cacheKey);
      
      if (cached) {
        return cached;
      }

      const url = this.buildUrl(`${id}/events?${params.toString()}`);
      const response = await this.client.get<EventsResponse>(url);
      
      // Cache events for 10 minutes
      await this.setCache(cacheKey, response, 600000);
      
      return response;
    } catch (error) {
      this.handleError(error, 'getEnhancedEvents');
    }
  }

  /**
   * Get premium audio guide experience
   * GET /api/v1/pois/{id}/audio-guide
   */
  async getPremiumAudioGuide(
    id: string,
    language: string = 'en',
    quality: string = 'standard'
  ): Promise<POIAudioGuideResponse> {
    try {
      this.validateRequired({ id }, ['id']);
      
      const params = new URLSearchParams();
      params.append('language', language);
      params.append('quality', quality);
      
      const cacheKey = this.getCacheKey('GET', `${id}/audio-guide`, { language, quality });
      const cached = await this.getFromCache<POIAudioGuideResponse>(cacheKey);
      
      if (cached) {
        return cached;
      }

      const url = this.buildUrl(`${id}/audio-guide?${params.toString()}`);
      const response = await this.client.get<AudioGuideResponse>(url);
      
      // Cache audio guide for 1 hour
      await this.setCache(cacheKey, response, 3600000);
      
      return response;
    } catch (error) {
      this.handleError(error, 'getPremiumAudioGuide');
    }
  }

  /**
   * Get nearby POIs with intelligent recommendations
   * GET /api/v1/pois/{id}/nearby
   */
  async getIntelligentNearby(
    id: string,
    radiusKm: number = 2.0,
    categories?: string[],
    context?: string,
    limit: number = 10
  ): Promise<NearbyPOIsResponse> {
    try {
      this.validateRequired({ id }, ['id']);
      
      const params = new URLSearchParams();
      params.append('radius_km', radiusKm.toString());
      if (categories) categories.forEach(cat => params.append('categories', cat));
      if (context) params.append('context', context);
      params.append('limit', limit.toString());
      
      const cacheKey = this.getCacheKey('GET', `${id}/nearby`, { radiusKm, categories, context, limit });
      const cached = await this.getFromCache<NearbyPOIsResponse>(cacheKey);
      
      if (cached) {
        return cached;
      }

      const url = this.buildUrl(`${id}/nearby?${params.toString()}`);
      const response = await this.client.get<NearbyPOI[]>(url);
      
      // Cache nearby POIs for 20 minutes
      await this.setCache(cacheKey, response, 1200000);
      
      return response;
    } catch (error) {
      this.handleError(error, 'getIntelligentNearby');
    }
  }

  /**
   * Check in to POI with social features
   * POST /api/v1/pois/{id}/checkin
   */
  async checkIn(
    id: string,
    data?: {
      photo?: File;
      caption?: string;
      mood?: string;
      companions?: number;
      shareToSocial?: boolean;
    }
  ): Promise<VisitRecordResponse> {
    try {
      this.validateRequired({ id }, ['id']);
      
      const formData = new FormData();
      if (data?.photo) formData.append('photo', data.photo);
      if (data?.caption) formData.append('caption', data.caption);
      if (data?.mood) formData.append('mood', data.mood);
      if (data?.companions) formData.append('companions', data.companions.toString());
      if (data?.shareToSocial) formData.append('share_to_social', data.shareToSocial.toString());
      
      const response = await this.client.post<VisitRecord>(
        this.buildUrl(`${id}/checkin`),
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      // Clear relevant cache
      this.clearCache(`${id}/social`);
      
      return response;
    } catch (error) {
      this.handleError(error, 'checkIn');
    }
  }

  /**
   * Get weather information for POI location
   * GET /api/v1/pois/{id}/weather
   */
  async getWeatherInfo(id: string): Promise<{ data: WeatherInfo }> {
    try {
      this.validateRequired({ id }, ['id']);
      
      const cacheKey = this.getCacheKey('GET', `${id}/weather`);
      const cached = await this.getFromCache<{ data: WeatherInfo }>(cacheKey);
      
      if (cached) {
        return cached;
      }

      const url = this.buildUrl(`${id}/weather`);
      const response = await this.client.get<WeatherInfo>(url);
      
      // Cache weather for 10 minutes
      await this.setCache(cacheKey, response, 600000);
      
      return response;
    } catch (error) {
      this.handleError(error, 'getWeatherInfo');
    }
  }

  /**
   * Transform POI data before sending
   */
  protected transformRequest<T>(data: T): T {
    if (typeof data === 'object' && data !== null) {
      const transformed = { ...data } as any;
      
      // Ensure coordinates are numbers
      if (transformed.coordinates) {
        transformed.coordinates.latitude = parseFloat(transformed.coordinates.latitude);
        transformed.coordinates.longitude = parseFloat(transformed.coordinates.longitude);
      }
      
      // Format dates
      if (transformed.visitDate) {
        transformed.visitDate = new Date(transformed.visitDate).toISOString().split('T')[0];
      }
      
      return transformed;
    }
    
    return data;
  }
}