/**
 * Advanced AI Features Components
 * 
 * This module exports the final two comprehensive AI features:
 * 1. Personalized Content Recommendations
 * 2. AI-Powered Accessibility Features
 */

export { PersonalizedContentRecommendations } from './PersonalizedContentRecommendations';
export { AIAccessibilitySystem } from './AIAccessibilitySystem';
export { AdvancedAIFeatures } from './AdvancedAIFeatures';

export type {
  PersonalizedRecommendation,
  RecommendationRequest,
  RecommendationResponse,
  AccessibilityProfile,
  VoiceInteractionRequest,
  VoiceResponse,
  UICustomizations,
  AdaptiveUIRequest,
  AdaptiveUIResponse
} from '../../api/services';