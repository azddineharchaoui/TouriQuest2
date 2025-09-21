import { ApiResponse } from './common';

// Recommendation Types
export interface RecommendationPreferences {
  interests: string[];
  budgetRange: {
    min: number;
    max: number;
    currency: string;
  };
  travelStyle: string[];
  accommodationTypes: string[];
  experienceTypes: string[];
  dietaryRestrictions: string[];
  accessibility: string[];
  languages: string[];
  seasonPreferences: string[];
  groupTypes: string[];
  notifications: {
    newRecommendations: boolean;
    priceDrops: boolean;
    lastMinuteDeals: boolean;
  };
}

export interface RecommendationItem {
  id: string;
  type: 'property' | 'poi' | 'experience';
  itemId: string;
  title: string;
  description: string;
  imageUrl?: string;
  price?: { amount: number; currency: string };
  rating: number;
  reviewCount: number;
  location: {
    name: string;
    distance?: number;
  };
  tags: string[];
  score: number;
  reasoning: string;
  algorithm: 'collaborative' | 'content-based' | 'hybrid' | 'trending' | 'popular';
  metadata?: Record<string, any>;
}

export interface RecommendationFeedback {
  itemId: string;
  itemType: 'property' | 'poi' | 'experience';
  feedback: 'like' | 'dislike' | 'not_interested' | 'booked' | 'visited';
  reason?: string;
  rating?: number;
  comment?: string;
}

export interface RecommendationCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  items: RecommendationItem[];
  algorithm: string;
  refreshRate: string; // e.g., "hourly", "daily", "weekly"
}

export interface RecommendationMetrics {
  totalRecommendations: number;
  clickThroughRate: number;
  conversionRate: number;
  userEngagement: number;
  algorithmPerformance: Array<{
    algorithm: string;
    accuracy: number;
    precision: number;
    recall: number;
    diversity: number;
  }>;
  userFeedback: Array<{
    feedback: string;
    count: number;
    percentage: number;
  }>;
}

// API Response Types
export type PersonalizedRecommendationsResponse = ApiResponse<RecommendationItem[]>;
export type PopularRecommendationsResponse = ApiResponse<RecommendationItem[]>;
export type TrendingRecommendationsResponse = ApiResponse<RecommendationItem[]>;
export type SimilarItemsResponse = ApiResponse<RecommendationItem[]>;
export type RecommendationCategoriesResponse = ApiResponse<RecommendationCategory[]>;
export type RecommendationPreferencesResponse = ApiResponse<RecommendationPreferences>;
export type RecommendationMetricsResponse = ApiResponse<RecommendationMetrics>;