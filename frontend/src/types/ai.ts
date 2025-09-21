import { ApiResponse } from './common';

// AI Service Types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    intent?: string;
    entities?: Entity[];
    sentiment?: SentimentAnalysis;
    language?: string;
    suggestions?: string[];
  };
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  messages: ChatMessage[];
  context: ChatContext;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface ChatContext {
  location?: {
    name: string;
    coordinates: { latitude: number; longitude: number };
  };
  preferences?: {
    budget?: { min: number; max: number; currency: string };
    interests?: string[];
    travelStyle?: string[];
    accessibility?: string[];
  };
  currentBookings?: string[];
  travelDates?: {
    start: string;
    end: string;
  };
  language: string;
  timezone: string;
}

export interface ChatRequest {
  message: string;
  sessionId?: string;
  context?: Partial<ChatContext>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface VoiceTranscriptionRequest {
  audioFile: File;
  language?: string;
  model?: string;
}

export interface VoiceTranscriptionResponse {
  text: string;
  confidence: number;
  language: string;
  duration: number;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
    confidence: number;
  }>;
}

export interface VoiceSynthesisRequest {
  text: string;
  voice?: string;
  language?: string;
  speed?: number;
  pitch?: number;
  format?: 'mp3' | 'wav' | 'ogg';
}

export interface VoiceSynthesisResponse {
  audioUrl: string;
  duration: number;
  format: string;
  size: number;
}

export interface AIRecommendationRequest {
  type: 'properties' | 'pois' | 'experiences' | 'itinerary' | 'mixed';
  context: {
    location?: { latitude: number; longitude: number };
    budget?: { min: number; max: number; currency: string };
    dates?: { start: string; end: string };
    groupSize?: number;
    interests?: string[];
    previousBookings?: string[];
    travelStyle?: string[];
  };
  filters?: {
    categories?: string[];
    rating?: number;
    distance?: number;
    priceRange?: string;
  };
  limit?: number;
  model?: string;
}

export interface AIRecommendation {
  id: string;
  type: 'property' | 'poi' | 'experience';
  itemId: string;
  title: string;
  description: string;
  imageUrl?: string;
  rating: number;
  price?: { amount: number; currency: string };
  confidence: number;
  reasoning: string;
  tags: string[];
  distance?: number;
  availability?: boolean;
}

export interface ItineraryGenerationRequest {
  destination: string;
  startDate: string;
  endDate: string;
  budget: { amount: number; currency: string };
  groupSize: number;
  interests: string[];
  travelStyle: string[];
  accommodationType?: string[];
  transportPreferences?: string[];
  dietaryRestrictions?: string[];
  accessibilityNeeds?: string[];
  musthaveActivities?: string[];
  avoidActivities?: string[];
  pacePreference: 'relaxed' | 'moderate' | 'packed';
}

export interface GeneratedItinerary {
  id: string;
  title: string;
  description: string;
  totalDays: number;
  estimatedBudget: { amount: number; currency: string; breakdown: Record<string, number> };
  days: ItineraryDay[];
  transportation: TransportationPlan;
  accommodation: AccommodationPlan;
  tips: string[];
  alternatives: string[];
  seasonalNotes?: string[];
  createdAt: string;
}

export interface ItineraryDay {
  day: number;
  date: string;
  theme?: string;
  activities: ItineraryActivity[];
  meals: ItineraryMeal[];
  accommodation?: {
    name: string;
    address: string;
    checkIn?: string;
    checkOut?: string;
  };
  transportation?: {
    type: string;
    details: string;
    cost?: { amount: number; currency: string };
  };
  estimatedBudget: { amount: number; currency: string };
  notes?: string[];
}

export interface ItineraryActivity {
  id: string;
  name: string;
  type: 'poi' | 'experience' | 'free_time' | 'travel';
  startTime: string;
  duration: number; // minutes
  location: {
    name: string;
    address: string;
    coordinates?: { latitude: number; longitude: number };
  };
  description: string;
  cost?: { amount: number; currency: string };
  bookingRequired: boolean;
  tips?: string[];
  alternatives?: string[];
}

export interface ItineraryMeal {
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  time: string;
  venue?: {
    name: string;
    type: string;
    address: string;
    cuisine: string;
  };
  estimatedCost: { amount: number; currency: string };
  dietaryOptions: string[];
  recommendation: string;
}

export interface TransportationPlan {
  arrival: {
    method: string;
    details: string;
    cost?: { amount: number; currency: string };
  };
  departure: {
    method: string;
    details: string;
    cost?: { amount: number; currency: string };
  };
  local: Array<{
    day: number;
    method: string;
    details: string;
    cost?: { amount: number; currency: string };
  }>;
}

export interface AccommodationPlan {
  properties: Array<{
    name: string;
    type: string;
    address: string;
    checkIn: string;
    checkOut: string;
    nights: number;
    estimatedCost: { amount: number; currency: string };
    amenities: string[];
    reasoning: string;
  }>;
  alternatives: Array<{
    name: string;
    type: string;
    priceLevel: string;
    pros: string[];
    cons: string[];
  }>;
}

export interface ItineraryOptimizationRequest {
  itineraryId: string;
  constraints?: {
    budget?: { amount: number; currency: string };
    timeConstraints?: Array<{ activity: string; maxTime: number }>;
    priorities?: string[];
    avoid?: string[];
  };
  preferences?: {
    paceChange?: 'more_relaxed' | 'more_packed';
    focusAreas?: string[];
    budgetReallocation?: Record<string, number>;
  };
}

export interface TranslationRequest {
  text: string;
  sourceLanguage?: string;
  targetLanguage: string;
  context?: string;
  formality?: 'formal' | 'informal' | 'auto';
}

export interface TranslationResponse {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  confidence: number;
  alternatives?: string[];
}

export interface SentimentAnalysis {
  score: number; // -1 to 1
  label: 'positive' | 'negative' | 'neutral';
  confidence: number;
  emotions?: Array<{
    emotion: string;
    score: number;
  }>;
}

export interface Entity {
  text: string;
  type: 'location' | 'date' | 'time' | 'person' | 'organization' | 'price' | 'activity' | 'accommodation';
  confidence: number;
  startIndex: number;
  endIndex: number;
  metadata?: Record<string, any>;
}

export interface ContentSummaryRequest {
  content: string;
  type: 'property' | 'poi' | 'experience' | 'review' | 'general';
  maxLength?: number;
  style?: 'brief' | 'detailed' | 'bullet_points';
  language?: string;
}

export interface ContentSummaryResponse {
  summary: string;
  keyPoints: string[];
  sentiment?: SentimentAnalysis;
  entities?: Entity[];
  wordCount: {
    original: number;
    summary: number;
  };
}

export interface AIModel {
  id: string;
  name: string;
  type: 'chat' | 'voice' | 'translation' | 'analysis';
  description: string;
  capabilities: string[];
  languages: string[];
  isAvailable: boolean;
  pricing?: {
    inputTokens: number;
    outputTokens: number;
    currency: string;
  };
}

export interface EmbeddingRequest {
  text: string | string[];
  model?: string;
}

export interface EmbeddingResponse {
  embeddings: number[][];
  model: string;
  usage: {
    totalTokens: number;
  };
}

export interface SimilarityRequest {
  query: string;
  candidates: string[];
  model?: string;
}

export interface SimilarityResponse {
  scores: Array<{
    text: string;
    score: number;
    index: number;
  }>;
  model: string;
}

// API Response Types
export type ChatResponse = ApiResponse<{ message: ChatMessage; session: ChatSession }>;
export type ChatHistoryResponse = ApiResponse<ChatSession[]>;
export type VoiceTranscriptionResponseType = ApiResponse<VoiceTranscriptionResponse>;
export type VoiceSynthesisResponseType = ApiResponse<VoiceSynthesisResponse>;
export type AIRecommendationsResponse = ApiResponse<AIRecommendation[]>;
export type ItineraryGenerationResponse = ApiResponse<GeneratedItinerary>;
export type ItineraryOptimizationResponse = ApiResponse<GeneratedItinerary>;
export type TranslationResponseType = ApiResponse<TranslationResponse>;
export type SentimentAnalysisResponse = ApiResponse<SentimentAnalysis>;
export type EntityExtractionResponse = ApiResponse<Entity[]>;
export type ContentSummaryResponseType = ApiResponse<ContentSummaryResponse>;
export type AIModelsResponse = ApiResponse<AIModel[]>;
export type EmbeddingResponseType = ApiResponse<EmbeddingResponse>;
export type SimilarityResponseType = ApiResponse<SimilarityResponse>;