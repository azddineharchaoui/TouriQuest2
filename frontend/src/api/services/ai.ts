/**
 * AI Service for TouriQuest API
 * 
 * Features:
 * - Natural language chat and conversation
 * - Voice transcription and synthesis
 * - Intelligent recommendations
 * - Trip itinerary generation
 * - Translation and localization
 * - Sentiment analysis and entity extraction
 * - Travel insights and predictions
 */

import { ApiClient } from '../core/ApiClient';

export interface ChatResponse {
  message: string;
  suggestions?: string[];
  confidence: number;
}

export interface TranscriptionResponse {
  text: string;
  confidence: number;
  language: string;
  duration: number;
}

export interface AudioResponse {
  audioUrl: string;
  duration: number;
  format: string;
  language: string;
  voice: string;
}

export interface UserPreferences {
  interests: string[];
  budget: number;
  travelStyle: string;
  accessibility?: string[];
  preferences: Record<string, any>;
  duration?: number;
}

export interface RecommendationResponse {
  recommendations: AIRecommendation[];
  totalCount: number;
  filters: Record<string, any>;
  reasoning: string;
}

export interface AIRecommendation {
  id: string;
  type: 'property' | 'poi' | 'experience' | 'restaurant';
  title: string;
  description: string;
  score: number;
  reasoning: string;
  metadata: Record<string, any>;
}

export interface ItineraryRequest {
  destination: string;
  duration: number;
  budget?: number;
  interests: string[];
  travelStyle: string;
  groupSize: number;
  accessibility?: string[];
}

export interface ItineraryResponse {
  itinerary: GeneratedItinerary;
  alternatives: ItineraryAlternative[];
  estimatedCost: number;
}

export interface GeneratedItinerary {
  id: string;
  title: string;
  description: string;
  duration: number;
  totalCost: number;
  days: ItineraryDay[];
}

export interface ItineraryDay {
  day: number;
  date: string;
  activities: ItineraryActivity[];
  meals: ItineraryMeal[];
  accommodation?: string;
  transportation: ItineraryTransport[];
  budget: number;
}

export interface ItineraryActivity {
  id: string;
  name: string;
  type: string;
  startTime: string;
  endTime: string;
  location: string;
  cost: number;
  description: string;
  bookingUrl?: string;
}

export interface ItineraryMeal {
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  restaurant: string;
  cuisine: string;
  cost: number;
  location: string;
  reservationRequired: boolean;
}

export interface ItineraryTransport {
  type: 'walk' | 'taxi' | 'public' | 'rental' | 'flight';
  from: string;
  to: string;
  duration: number;
  cost: number;
  instructions: string;
}

export interface ItineraryAlternative {
  type: 'budget' | 'luxury' | 'adventure' | 'relaxed';
  title: string;
  description: string;
  modifications: string[];
}

export interface TranslationResponse {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  confidence: number;
  alternatives?: string[];
}

export interface SentimentResponse {
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number;
  confidence: number;
  emotions: Record<string, number>;
  keywords: string[];
}

export interface EntityResponse {
  entities: Entity[];
  locations: LocationEntity[];
  dates: DateEntity[];
  prices: PriceEntity[];
}

export interface Entity {
  text: string;
  type: string;
  confidence: number;
  startIndex: number;
  endIndex: number;
}

export interface LocationEntity {
  name: string;
  type: 'city' | 'country' | 'landmark' | 'address';
  coordinates?: [number, number];
  confidence: number;
}

export interface DateEntity {
  text: string;
  parsedDate: string;
  type: 'absolute' | 'relative';
  confidence: number;
}

export interface PriceEntity {
  amount: number;
  currency: string;
  text: string;
  confidence: number;
}

export interface InsightsResponse {
  destination: string;
  insights: TravelInsight[];
  trends: TravelTrend[];
  recommendations: string[];
}

export interface TravelInsight {
  category: string;
  title: string;
  description: string;
  importance: 'low' | 'medium' | 'high';
  source: string;
}

export interface TravelTrend {
  metric: string;
  value: number;
  change: number;
  period: string;
  description: string;
}

export interface WeatherResponse {
  location: string;
  date: string;
  forecast: WeatherForecast;
  recommendations: string[];
}

export interface WeatherForecast {
  temperature: {
    min: number;
    max: number;
    unit: string;
  };
  conditions: string;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  uvIndex: number;
}

export interface PricePredictionResponse {
  propertyId: string;
  predictions: PricePrediction[];
  confidence: number;
  factors: PriceFactor[];
}

export interface PricePrediction {
  date: string;
  price: number;
  change: number;
  confidence: number;
}

export interface PriceFactor {
  factor: string;
  impact: number;
  description: string;
}

export interface RouteOptimizationRequest {
  destinations: RouteDestination[];
  startLocation: string;
  endLocation?: string;
  travelMode: 'walking' | 'driving' | 'transit' | 'mixed';
  preferences: {
    minimizeTime: boolean;
    minimizeDistance: boolean;
    avoidTolls: boolean;
    scenic: boolean;
  };
}

export interface RouteDestination {
  id: string;
  name: string;
  location: [number, number];
  duration?: number;
  priority?: number;
}

export interface RouteResponse {
  optimizedRoute: OptimizedRoute;
  alternatives: OptimizedRoute[];
  savings: {
    time: number;
    distance: number;
    cost: number;
  };
}

export interface OptimizedRoute {
  destinations: RouteDestination[];
  totalDistance: number;
  totalTime: number;
  totalCost: number;
  directions: RouteDirection[];
}

export interface RouteDirection {
  from: string;
  to: string;
  distance: number;
  duration: number;
  instructions: string[];
  waypoints: [number, number][];
}

export interface ActivityPreferences {
  types: string[];
  duration: string;
  difficulty: string;
  indoor: boolean;
  outdoor: boolean;
  budget: number;
  groupSize: number;
}

export interface ActivityResponse {
  activities: PersonalizedActivity[];
  totalCount: number;
  recommendations: string[];
}

export interface PersonalizedActivity {
  id: string;
  name: string;
  type: string;
  description: string;
  location: string;
  duration: number;
  cost: number;
  difficulty: string;
  rating: number;
  tags: string[];
  bookingInfo?: {
    required: boolean;
    url?: string;
    phone?: string;
  };
}

export interface DocumentResponse {
  documentId: string;
  type: string;
  content: string;
  downloadUrl: string;
  format: 'pdf' | 'docx' | 'html' | 'txt';
}

export interface PhotoAnalysisResponse {
  landmarks: DetectedLandmark[];
  objects: DetectedObject[];
  text: string[];
  location?: {
    name: string;
    coordinates: [number, number];
    confidence: number;
  };
  metadata: {
    quality: number;
    timestamp?: string;
    camera?: string;
  };
}

export interface DetectedLandmark {
  name: string;
  confidence: number;
  description: string;
  coordinates?: [number, number];
}

export interface DetectedObject {
  name: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ModelStatusResponse {
  models: AIModelStatus[];
  systemHealth: 'healthy' | 'degraded' | 'down';
  lastUpdated: string;
}

export interface AIModelStatus {
  name: string;
  status: 'active' | 'inactive' | 'training' | 'error';
  version: string;
  accuracy?: number;
  lastTrained?: string;
}

export interface TrainingResponse {
  jobId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: number;
  estimatedCompletion?: string;
}

export class AIService {
  constructor(private apiClient: ApiClient) {}

  /**
   * Chat with AI assistant
   */
  async chat(message: string, conversationId?: string): Promise<ChatResponse> {
    const response = await this.apiClient.post<ChatResponse>('/ai/chat', {
      message,
      conversationId,
    });
    return response.data;
  }

  /**
   * Transcribe audio to text
   */
  async transcribeAudio(audioFile: File, language?: string): Promise<TranscriptionResponse> {
    const formData = new FormData();
    formData.append('audio', audioFile);
    if (language) formData.append('language', language);

    const response = await this.apiClient.post<TranscriptionResponse>('/ai/transcribe', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  /**
   * Synthesize text to speech
   */
  async synthesizeSpeech(text: string, voice?: string): Promise<AudioResponse> {
    const response = await this.apiClient.post<AudioResponse>('/ai/synthesize', {
      text,
      voice,
    });
    return response.data;
  }

  /**
   * Get personalized recommendations
   */
  async getRecommendations(
    preferences: UserPreferences,
    location?: string
  ): Promise<RecommendationResponse> {
    const response = await this.apiClient.post<RecommendationResponse>('/ai/recommendations', {
      preferences,
      location,
    });
    return response.data;
  }

  /**
   * Generate trip itinerary
   */
  async generateItinerary(request: ItineraryRequest): Promise<ItineraryResponse> {
    const response = await this.apiClient.post<ItineraryResponse>('/ai/itinerary/generate', request);
    return response.data;
  }

  /**
   * Optimize existing itinerary
   */
  async optimizeItinerary(itinerary: GeneratedItinerary): Promise<ItineraryResponse> {
    const response = await this.apiClient.post<ItineraryResponse>('/ai/itinerary/optimize', {
      itinerary
    });
    return response.data;
  }

  /**
   * Translate text
   */
  async translateText(
    text: string,
    targetLanguage: string,
    sourceLanguage?: string
  ): Promise<TranslationResponse> {
    const response = await this.apiClient.post<TranslationResponse>('/ai/translate', {
      text,
      targetLanguage,
      sourceLanguage,
    });
    return response.data;
  }

  /**
   * Analyze sentiment of review or feedback
   */
  async analyzeSentiment(text: string): Promise<SentimentResponse> {
    const response = await this.apiClient.post<SentimentResponse>('/ai/sentiment', {
      text,
    });
    return response.data;
  }

  /**
   * Extract entities from text
   */
  async extractEntities(text: string): Promise<EntityResponse> {
    const response = await this.apiClient.post<EntityResponse>('/ai/extract/entities', {
      text,
    });
    return response.data;
  }

  /**
   * Summarize content intelligently
   */
  async summarizeContent(content: string, maxLength?: number): Promise<{ summary: string; keyPoints: string[]; confidence: number }> {
    const response = await this.apiClient.post<{ summary: string; keyPoints: string[]; confidence: number }>('/ai/summarize', {
      content,
      maxLength
    });
    return response.data;
  }

  /**
   * Get travel insights
   */
  async getTravelInsights(
    destination: string,
    dateRange?: { start: string; end: string }
  ): Promise<InsightsResponse> {
    const response = await this.apiClient.get<InsightsResponse>('/ai/insights', {
      params: {
        destination,
        startDate: dateRange?.start,
        endDate: dateRange?.end,
      },
    });
    return response.data;
  }

  /**
   * Get weather predictions
   */
  async getWeatherPrediction(
    location: string,
    date: string
  ): Promise<WeatherResponse> {
    const response = await this.apiClient.get<WeatherResponse>('/ai/weather', {
      params: {
        location,
        date,
      },
    });
    return response.data;
  }

  /**
   * Get price predictions
   */
  async getPricePrediction(
    propertyId: string,
    checkIn: string,
    checkOut: string
  ): Promise<PricePredictionResponse> {
    const response = await this.apiClient.get<PricePredictionResponse>('/ai/price-prediction', {
      params: {
        propertyId,
        checkIn,
        checkOut,
      },
    });
    return response.data;
  }

  /**
   * Optimize travel route
   */
  async optimizeRoute(request: RouteOptimizationRequest): Promise<RouteResponse> {
    const response = await this.apiClient.post<RouteResponse>('/ai/optimize-route', request);
    return response.data;
  }

  /**
   * Get personalized activities
   */
  async getPersonalizedActivities(
    location: string,
    preferences: ActivityPreferences
  ): Promise<ActivityResponse> {
    const response = await this.apiClient.post<ActivityResponse>('/ai/activities', {
      location,
      preferences,
    });
    return response.data;
  }

  /**
   * Generate travel documents
   */
  async generateTravelDocument(
    type: 'itinerary' | 'packing_list' | 'expense_report',
    data: any
  ): Promise<DocumentResponse> {
    const response = await this.apiClient.post<DocumentResponse>('/ai/generate-document', {
      type,
      data,
    });
    return response.data;
  }

  /**
   * Analyze travel photos
   */
  async analyzePhoto(photoFile: File): Promise<PhotoAnalysisResponse> {
    const formData = new FormData();
    formData.append('photo', photoFile);

    const response = await this.apiClient.post<PhotoAnalysisResponse>('/ai/analyze-photo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  /**
   * Get AI model status
   */
  async getModelStatus(): Promise<ModelStatusResponse> {
    const response = await this.apiClient.get<ModelStatusResponse>('/ai/status');
    return response.data;
  }

  /**
   * Train personalization model
   */
  async trainPersonalizationModel(userId: string): Promise<TrainingResponse> {
    const response = await this.apiClient.post<TrainingResponse>('/ai/train', {
      userId,
    });
    return response.data;
  }
}