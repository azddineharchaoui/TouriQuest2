// Service exports
export { AuthService } from './auth';
export { PropertyService } from './property';
export { POIService } from './poi';
export { ExperienceService } from './experience';
export { AIService } from './ai';
export { BookingService } from './booking';
export { RecommendationService } from './recommendation';
export { AccessibilityService } from './accessibility';

// Export AI service types
export type {
  ChatResponse,
  TranscriptionResponse,
  AudioResponse,
  ItineraryRequest,
  ItineraryResponse
} from './ai';

// Export Booking service types
export type {
  Booking,
  BookingRequest,
  BookingFilters,
  BookingAnalytics
} from './booking';

// Export Recommendation service types
export type {
  PersonalizedRecommendation,
  RecommendationRequest,
  RecommendationResponse,
  UserPreferences as RecommendationUserPreferences,
  RecommendationFeedback,
  TrendingRecommendation,
  PopularRecommendation
} from './recommendation';

// Export Accessibility service types
export type {
  AccessibilityProfile,
  VoiceInteractionRequest,
  VoiceResponse,
  ScreenReaderContent,
  AccessibilityAudit,
  AccessibilityCompliance,
  UICustomizations,
  AdaptiveUIRequest,
  AdaptiveUIResponse
} from './accessibility';