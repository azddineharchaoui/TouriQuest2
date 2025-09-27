/**
 * Recommendation Service for TouriQuest API
 * 
 * Features:
 * - Personalized content recommendations
 * - Collaborative filtering algorithms
 * - Content-based recommendations
 * - Real-time behavior analysis
 * - Preference learning and adaptation
 * - A/B testing for recommendation algorithms
 */

import { ApiClient } from '../core/ApiClient';

export interface PersonalizedRecommendation {
  id: string;
  type: 'property' | 'poi' | 'experience' | 'restaurant' | 'activity';
  title: string;
  description: string;
  score: number;
  confidence: number;
  reasoning: string;
  imageUrl?: string;
  rating?: number;
  priceRange?: string;
  location: string;
  distance?: number;
  tags: string[];
  metadata: Record<string, any>;
  personalizedFactors: PersonalizationFactor[];
}

export interface PersonalizationFactor {
  factor: string;
  weight: number;
  explanation: string;
  category: 'behavioral' | 'contextual' | 'social' | 'demographic';
}

export interface RecommendationRequest {
  userId?: string;
  location?: string;
  context: RecommendationContext;
  preferences: UserPreferences;
  filters?: RecommendationFilters;
  algorithm?: 'collaborative' | 'content_based' | 'hybrid' | 'deep_learning';
  limit?: number;
  diversityLevel?: number;
  realTimeFactors?: RealTimeFactors;
}

export interface RecommendationContext {
  currentLocation?: [number, number];
  travelDates?: {
    startDate: string;
    endDate: string;
  };
  groupSize: number;
  tripPurpose?: string;
  timeOfDay?: string;
  weather?: string;
  seasonality?: string;
  budget?: {
    min: number;
    max: number;
    currency: string;
  };
  previousSearches?: string[];
  sessionDuration?: number;
}

export interface UserPreferences {
  interests: string[];
  travelStyle: string;
  accommodationType?: string[];
  cuisinePreferences?: string[];
  activityLevel: 'low' | 'moderate' | 'high';
  accessibility: AccessibilityPreferences;
  socialPreferences: SocialPreferences;
  sustainabilityImportance?: number;
  priceConsciousness: number;
  adventureSeekingLevel: number;
  culturalInterest: number;
  relaxationPreference: number;
}

export interface AccessibilityPreferences {
  wheelchairAccessible: boolean;
  visualImpairments: string[];
  hearingImpairments: string[];
  motorImpairments: string[];
  cognitiveSupport: string[];
  preferredLanguages: string[];
  voiceControlEnabled: boolean;
  screenReaderCompatible: boolean;
  largeText: boolean;
  highContrast: boolean;
}

export interface SocialPreferences {
  shareRecommendations: boolean;
  friendInfluence: number;
  crowdedPlacesTolerance: number;
  socialActivityPreference: number;
  familyFriendlyRequired: boolean;
  petFriendlyRequired: boolean;
}

export interface RecommendationFilters {
  categories?: string[];
  priceRange?: {
    min: number;
    max: number;
  };
  rating?: {
    min: number;
  };
  distance?: {
    max: number;
    unit: 'km' | 'miles';
  };
  availability?: {
    required: boolean;
    dates?: string[];
  };
  accessibility?: string[];
  amenities?: string[];
}

export interface RealTimeFactors {
  currentWeather?: string;
  crowdLevels?: Record<string, number>;
  priceFluctuations?: Record<string, number>;
  availabilityChanges?: Record<string, boolean>;
  eventNearby?: string[];
  trafficConditions?: string;
  userMood?: string;
  deviceType?: string;
}

export interface RecommendationResponse {
  recommendations: PersonalizedRecommendation[];
  totalCount: number;
  algorithm: string;
  diversityScore: number;
  personalizedScore: number;
  explanations: RecommendationExplanation[];
  alternativeAlgorithms?: AlgorithmComparison[];
  nextBatch?: {
    offset: number;
    available: boolean;
  };
  metadata: ResponseMetadata;
}

export interface RecommendationExplanation {
  type: 'why_recommended' | 'why_not_recommended' | 'similar_users' | 'trending';
  title: string;
  description: string;
  factors: string[];
  confidence: number;
}

export interface AlgorithmComparison {
  algorithm: string;
  score: number;
  description: string;
  sampleRecommendations: string[];
}

export interface ResponseMetadata {
  processingTime: number;
  cacheStatus: 'hit' | 'miss' | 'partial';
  dataFreshness: number;
  abTestVariant?: string;
  recommendationVersion: string;
  userSegment?: string;
}

export interface CollaborativeFilteringRequest {
  userId: string;
  itemTypes: string[];
  neighborhoodSize?: number;
  similarityThreshold?: number;
  includeExplanations: boolean;
}

export interface ContentBasedRequest {
  userId: string;
  itemTypes: string[];
  featureWeights?: Record<string, number>;
  semanticSimilarity?: boolean;
  includeExplanations: boolean;
}

export interface HybridRequest {
  userId: string;
  itemTypes: string[];
  algorithmWeights?: {
    collaborative: number;
    contentBased: number;
    popularity: number;
    demographic: number;
  };
  ensembleMethod?: 'weighted' | 'stacking' | 'voting';
}

export interface RecommendationFeedback {
  recommendationId: string;
  userId: string;
  feedback: 'like' | 'dislike' | 'not_interested' | 'clicked' | 'booked' | 'shared';
  rating?: number;
  reason?: string;
  timestamp: string;
  context?: Record<string, any>;
}

export interface UserBehaviorData {
  userId: string;
  sessionId: string;
  actions: BehaviorAction[];
  preferences: UserPreferences;
  contextualFactors: Record<string, any>;
}

export interface BehaviorAction {
  actionType: 'view' | 'click' | 'search' | 'filter' | 'favorite' | 'book' | 'share' | 'review';
  itemId: string;
  itemType: string;
  timestamp: string;
  duration?: number;
  context: Record<string, any>;
}

export interface TrendingResponse {
  trending: TrendingRecommendation[];
  timeframe: string;
  location?: string;
  category?: string;
  metadata: {
    lastUpdated: string;
    dataPoints: number;
    confidence: number;
  };
}

export interface TrendingRecommendation {
  id: string;
  type: string;
  title: string;
  description: string;
  trendScore: number;
  growthRate: number;
  popularity: number;
  imageUrl?: string;
  location: string;
  reasons: string[];
}

export interface PopularRecommendation {
  id: string;
  type: string;
  title: string;
  description: string;
  popularityScore: number;
  bookingRate: number;
  reviewCount: number;
  averageRating: number;
  imageUrl?: string;
  location: string;
}

export interface PreferenceUpdate {
  userId: string;
  preferences: Partial<UserPreferences>;
  source: 'explicit' | 'implicit' | 'inferred';
  confidence: number;
  timestamp: string;
}

export interface RecommendationMetrics {
  algorithm: string;
  period: string;
  metrics: {
    accuracy: number;
    precision: number;
    recall: number;
    diversity: number;
    coverage: number;
    novelty: number;
    clickThroughRate: number;
    conversionRate: number;
    userSatisfaction: number;
  };
  comparisons: AlgorithmComparison[];
}

export interface ABTestResult {
  experimentId: string;
  userId: string;
  variant: string;
  algorithm: string;
  performance: {
    clickRate: number;
    conversionRate: number;
    userEngagement: number;
    satisfaction: number;
  };
  duration: number;
}

export class RecommendationService {
  constructor(private apiClient: ApiClient) {}

  /**
   * Get personalized recommendations for user
   */
  async getPersonalizedRecommendations(
    request: RecommendationRequest
  ): Promise<RecommendationResponse> {
    const response = await this.apiClient.post<RecommendationResponse>(
      '/recommendations/personalized',
      request
    );
    return response.data;
  }

  /**
   * Get collaborative filtering recommendations
   */
  async getCollaborativeRecommendations(
    request: CollaborativeFilteringRequest
  ): Promise<RecommendationResponse> {
    const response = await this.apiClient.post<RecommendationResponse>(
      '/recommendations/collaborative',
      request
    );
    return response.data;
  }

  /**
   * Get content-based recommendations
   */
  async getContentBasedRecommendations(
    request: ContentBasedRequest
  ): Promise<RecommendationResponse> {
    const response = await this.apiClient.post<RecommendationResponse>(
      '/recommendations/content-based',
      request
    );
    return response.data;
  }

  /**
   * Get hybrid recommendations
   */
  async getHybridRecommendations(
    request: HybridRequest
  ): Promise<RecommendationResponse> {
    const response = await this.apiClient.post<RecommendationResponse>(
      '/recommendations/hybrid',
      request
    );
    return response.data;
  }

  /**
   * Get popular recommendations
   */
  async getPopularRecommendations(
    location?: string,
    category?: string,
    timeframe?: string,
    limit?: number
  ): Promise<PopularRecommendation[]> {
    const response = await this.apiClient.get<PopularRecommendation[]>(
      '/recommendations/popular',
      {
        params: {
          location,
          category,
          timeframe,
          limit
        }
      }
    );
    return response.data;
  }

  /**
   * Get trending recommendations
   */
  async getTrendingRecommendations(
    location?: string,
    category?: string,
    timeframe?: string
  ): Promise<TrendingResponse> {
    const response = await this.apiClient.get<TrendingResponse>(
      '/recommendations/trending',
      {
        params: {
          location,
          category,
          timeframe
        }
      }
    );
    return response.data;
  }

  /**
   * Get similar items
   */
  async getSimilarItems(
    itemId: string,
    itemType: string,
    userId?: string,
    limit?: number
  ): Promise<PersonalizedRecommendation[]> {
    const response = await this.apiClient.get<PersonalizedRecommendation[]>(
      `/recommendations/similar/${itemId}`,
      {
        params: {
          itemType,
          userId,
          limit
        }
      }
    );
    return response.data;
  }

  /**
   * Provide feedback on recommendation
   */
  async provideFeedback(feedback: RecommendationFeedback): Promise<void> {
    await this.apiClient.post('/recommendations/feedback', feedback);
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(update: PreferenceUpdate): Promise<void> {
    await this.apiClient.post('/recommendations/preferences', update);
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(userId: string): Promise<UserPreferences> {
    const response = await this.apiClient.get<UserPreferences>(
      `/recommendations/preferences/${userId}`
    );
    return response.data;
  }

  /**
   * Track user behavior
   */
  async trackBehavior(behaviorData: UserBehaviorData): Promise<void> {
    await this.apiClient.post('/recommendations/behavior', behaviorData);
  }

  /**
   * Get recommendation metrics
   */
  async getRecommendationMetrics(
    algorithm?: string,
    period?: string
  ): Promise<RecommendationMetrics> {
    const response = await this.apiClient.get<RecommendationMetrics>(
      '/recommendations/metrics',
      {
        params: {
          algorithm,
          period
        }
      }
    );
    return response.data;
  }

  /**
   * Train recommendation model for user
   */
  async trainUserModel(userId: string): Promise<{ jobId: string; status: string }> {
    const response = await this.apiClient.post<{ jobId: string; status: string }>(
      '/recommendations/train',
      { userId }
    );
    return response.data;
  }

  /**
   * Get A/B test results
   */
  async getABTestResults(
    experimentId: string,
    userId?: string
  ): Promise<ABTestResult[]> {
    const response = await this.apiClient.get<ABTestResult[]>(
      `/recommendations/ab-test/${experimentId}`,
      {
        params: {
          userId
        }
      }
    );
    return response.data;
  }

  /**
   * Get recommendation categories
   */
  async getRecommendationCategories(): Promise<string[]> {
    const response = await this.apiClient.get<string[]>('/recommendations/categories');
    return response.data;
  }

  /**
   * Clear user recommendations cache
   */
  async clearRecommendationsCache(userId: string): Promise<void> {
    await this.apiClient.delete(`/recommendations/cache/${userId}`);
  }

  /**
   * Get real-time recommendations based on current context
   */
  async getRealTimeRecommendations(
    userId: string,
    context: RecommendationContext,
    realTimeFactors: RealTimeFactors
  ): Promise<PersonalizedRecommendation[]> {
    const response = await this.apiClient.post<PersonalizedRecommendation[]>(
      '/recommendations/real-time',
      {
        userId,
        context,
        realTimeFactors
      }
    );
    return response.data;
  }
}