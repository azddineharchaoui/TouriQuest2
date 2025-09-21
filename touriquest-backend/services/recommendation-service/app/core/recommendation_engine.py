"""
Real-time recommendation engine with caching and fallback strategies.
"""
import asyncio
import json
import pickle
import redis
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
from concurrent.futures import ThreadPoolExecutor
import logging

from app.algorithms.ml_algorithms import (
    CollaborativeFilteringAlgorithm,
    ContentBasedAlgorithm,
    MatrixFactorizationAlgorithm,
    HybridRecommendationAlgorithm,
    PopularityBasedAlgorithm
)
from app.features.feature_engineering import FeatureEngineer
from app.models.schemas import (
    RecommendationRequest,
    RecommendationResponse,
    PropertyRecommendation,
    POIRecommendation,
    ExperienceRecommendation,
    RecommendationType,
    UserContext
)

logger = logging.getLogger(__name__)


class RecommendationCache:
    """Redis-based caching for recommendations."""
    
    def __init__(self, redis_url: str = "redis://localhost:6379/0"):
        self.redis_client = redis.from_url(redis_url, decode_responses=True)
        self.default_ttl = 3600  # 1 hour
        
    async def get_recommendations(self, cache_key: str) -> Optional[List[Dict]]:
        """Get cached recommendations."""
        try:
            cached_data = self.redis_client.get(cache_key)
            if cached_data:
                return json.loads(cached_data)
        except Exception as e:
            logger.warning(f"Cache retrieval error: {str(e)}")
        return None
    
    async def set_recommendations(self, cache_key: str, recommendations: List[Dict], ttl: int = None) -> None:
        """Cache recommendations."""
        try:
            ttl = ttl or self.default_ttl
            serialized_data = json.dumps(recommendations, default=str)
            self.redis_client.setex(cache_key, ttl, serialized_data)
        except Exception as e:
            logger.warning(f"Cache storage error: {str(e)}")
    
    async def invalidate_user_cache(self, user_id: str) -> None:
        """Invalidate all cache entries for a user."""
        try:
            pattern = f"rec:*:{user_id}:*"
            keys = self.redis_client.keys(pattern)
            if keys:
                self.redis_client.delete(*keys)
        except Exception as e:
            logger.warning(f"Cache invalidation error: {str(e)}")
    
    def get_cache_key(self, user_id: str, recommendation_type: str, filters: Dict[str, Any]) -> str:
        """Generate cache key for recommendations."""
        filter_hash = hash(json.dumps(filters, sort_keys=True))
        return f"rec:{recommendation_type}:{user_id}:{filter_hash}"


class ModelManager:
    """Manages trained ML models and their lifecycle."""
    
    def __init__(self):
        self.models = {}
        self.model_metadata = {}
        self.feature_engineer = FeatureEngineer()
        self.executor = ThreadPoolExecutor(max_workers=4)
        
    async def load_model(self, model_type: str, model_path: str) -> bool:
        """Load a trained model from disk."""
        try:
            with open(model_path, 'rb') as f:
                model = pickle.load(f)
            
            self.models[model_type] = model
            self.model_metadata[model_type] = {
                'loaded_at': datetime.now(),
                'model_path': model_path,
                'is_ready': True
            }
            
            logger.info(f"Loaded model: {model_type}")
            return True
            
        except Exception as e:
            logger.error(f"Error loading model {model_type}: {str(e)}")
            return False
    
    async def predict_batch(self, model_type: str, user_ids: List[str], item_ids: List[str]) -> Dict[str, Dict[str, float]]:
        """Batch prediction for multiple users and items."""
        if model_type not in self.models:
            logger.warning(f"Model {model_type} not available")
            return {}
        
        model = self.models[model_type]
        predictions = {}
        
        try:
            # Run prediction in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            
            for user_id in user_ids:
                user_predictions = await loop.run_in_executor(
                    self.executor,
                    model.predict,
                    user_id,
                    item_ids
                )
                predictions[user_id] = user_predictions
                
        except Exception as e:
            logger.error(f"Batch prediction error: {str(e)}")
        
        return predictions
    
    def get_model_info(self) -> Dict[str, Dict[str, Any]]:
        """Get information about loaded models."""
        return self.model_metadata


class FallbackRecommendationEngine:
    """Fallback recommendations when main algorithms fail."""
    
    def __init__(self):
        self.popularity_model = PopularityBasedAlgorithm()
        self.trending_items = {}
        self.category_defaults = {}
        
    async def get_popular_items(self, item_type: RecommendationType, n_items: int = 10) -> List[Tuple[str, float]]:
        """Get popular items as fallback."""
        cache_key = f"popular_{item_type}_{n_items}"
        
        if cache_key in self.trending_items:
            cached_time, items = self.trending_items[cache_key]
            if datetime.now() - cached_time < timedelta(hours=1):
                return items
        
        # Generate popular items (in production, this would query the database)
        popular_items = self._generate_popular_items(item_type, n_items)
        self.trending_items[cache_key] = (datetime.now(), popular_items)
        
        return popular_items
    
    async def get_category_defaults(self, item_type: RecommendationType, category: str, n_items: int = 10) -> List[Tuple[str, float]]:
        """Get category-specific default recommendations."""
        cache_key = f"category_{item_type}_{category}_{n_items}"
        
        if cache_key in self.category_defaults:
            cached_time, items = self.category_defaults[cache_key]
            if datetime.now() - cached_time < timedelta(hours=2):
                return items
        
        # Generate category defaults
        category_items = self._generate_category_defaults(item_type, category, n_items)
        self.category_defaults[cache_key] = (datetime.now(), category_items)
        
        return category_items
    
    def _generate_popular_items(self, item_type: RecommendationType, n_items: int) -> List[Tuple[str, float]]:
        """Generate popular items (mock implementation)."""
        # In production, this would query actual popular items from the database
        items = []
        for i in range(n_items):
            item_id = f"{item_type}_popular_{i+1}"
            score = 0.9 - (i * 0.05)  # Decreasing popularity scores
            items.append((item_id, score))
        return items
    
    def _generate_category_defaults(self, item_type: RecommendationType, category: str, n_items: int) -> List[Tuple[str, float]]:
        """Generate category default items (mock implementation)."""
        items = []
        for i in range(n_items):
            item_id = f"{item_type}_{category}_{i+1}"
            score = 0.8 - (i * 0.04)
            items.append((item_id, score))
        return items


class RealtimeRecommendationEngine:
    """Main real-time recommendation engine."""
    
    def __init__(self, redis_url: str = "redis://localhost:6379/0"):
        self.cache = RecommendationCache(redis_url)
        self.model_manager = ModelManager()
        self.fallback_engine = FallbackRecommendationEngine()
        self.feature_engineer = FeatureEngineer()
        self.algorithm_weights = {
            'collaborative_filtering': 0.4,
            'content_based': 0.3,
            'matrix_factorization': 0.2,
            'popularity': 0.1
        }
        self.min_confidence_threshold = 0.3
        
    async def initialize(self):
        """Initialize the recommendation engine."""
        logger.info("Initializing recommendation engine...")
        
        # Load pre-trained models (in production, load from model storage)
        model_paths = {
            'collaborative_filtering': 'models/cf_model.pkl',
            'content_based': 'models/cb_model.pkl',
            'matrix_factorization': 'models/mf_model.pkl'
        }
        
        for model_type, path in model_paths.items():
            try:
                await self.model_manager.load_model(model_type, path)
            except:
                logger.warning(f"Could not load {model_type} model, will use fallbacks")
        
        logger.info("Recommendation engine initialized")
    
    async def get_recommendations(self, request: RecommendationRequest, context: UserContext = None) -> RecommendationResponse:
        """Get personalized recommendations for a user."""
        start_time = datetime.now()
        
        try:
            # Generate cache key
            cache_key = self.cache.get_cache_key(
                str(request.user_id),
                request.recommendation_type,
                request.filters
            )
            
            # Check cache first
            cached_recommendations = await self.cache.get_recommendations(cache_key)
            if cached_recommendations:
                logger.info(f"Returning cached recommendations for user {request.user_id}")
                return self._format_response(cached_recommendations, cached=True, start_time=start_time)
            
            # Generate fresh recommendations
            recommendations = await self._generate_recommendations(request, context)
            
            # Cache the results
            await self.cache.set_recommendations(cache_key, recommendations)
            
            response_time = (datetime.now() - start_time).total_seconds() * 1000
            logger.info(f"Generated recommendations for user {request.user_id} in {response_time:.2f}ms")
            
            return self._format_response(recommendations, cached=False, start_time=start_time)
            
        except Exception as e:
            logger.error(f"Error generating recommendations: {str(e)}")
            
            # Use fallback recommendations
            fallback_recommendations = await self._get_fallback_recommendations(request)
            return self._format_response(fallback_recommendations, cached=False, start_time=start_time, algorithm="fallback")
    
    async def _generate_recommendations(self, request: RecommendationRequest, context: UserContext = None) -> List[Dict[str, Any]]:
        """Generate recommendations using multiple algorithms."""
        user_id = str(request.user_id)
        
        # Extract contextual features if context is provided
        context_features = {}
        if context:
            context_features = self.feature_engineer.extract_context_features(
                user_id,
                context.dict() if hasattr(context, 'dict') else context
            )
        
        # Get candidate items based on request type and filters
        candidate_items = await self._get_candidate_items(request)
        
        if not candidate_items:
            return await self._get_fallback_recommendations(request)
        
        # Collect predictions from different algorithms
        algorithm_predictions = {}
        
        for algorithm_name, weight in self.algorithm_weights.items():
            if weight > 0 and algorithm_name in self.model_manager.models:
                try:
                    predictions = await self.model_manager.predict_batch(
                        algorithm_name,
                        [user_id],
                        candidate_items
                    )
                    
                    if user_id in predictions:
                        algorithm_predictions[algorithm_name] = predictions[user_id]
                        
                except Exception as e:
                    logger.warning(f"Algorithm {algorithm_name} failed: {str(e)}")
        
        # Combine predictions using weighted average
        combined_scores = self._combine_algorithm_predictions(algorithm_predictions)
        
        # Apply contextual boosting
        if context_features:
            combined_scores = self._apply_contextual_boosting(combined_scores, context_features)
        
        # Apply diversity and novelty factors
        combined_scores = self._apply_diversity_boost(combined_scores, user_id)
        
        # Filter by confidence threshold
        filtered_scores = {
            item_id: score for item_id, score in combined_scores.items()
            if score >= self.min_confidence_threshold
        }
        
        # Sort and limit results
        sorted_recommendations = sorted(filtered_scores.items(), key=lambda x: x[1], reverse=True)
        top_recommendations = sorted_recommendations[:request.limit]
        
        # Format recommendations with explanations
        formatted_recommendations = await self._format_recommendations(
            top_recommendations,
            request.recommendation_type,
            algorithm_predictions
        )
        
        return formatted_recommendations
    
    async def _get_candidate_items(self, request: RecommendationRequest) -> List[str]:
        """Get candidate items based on request filters."""
        # In production, this would query the database with filters
        # For now, return mock candidate items
        
        item_type = request.recommendation_type
        filters = request.filters
        
        # Generate mock candidate items based on type
        candidates = []
        base_count = 1000  # Base number of candidates
        
        for i in range(base_count):
            item_id = f"{item_type}_item_{i+1}"
            candidates.append(item_id)
        
        # Apply basic filtering (mock implementation)
        if 'location' in filters:
            # Filter by location proximity
            candidates = candidates[:int(len(candidates) * 0.7)]
        
        if 'budget_max' in filters:
            # Filter by budget
            candidates = candidates[:int(len(candidates) * 0.8)]
        
        return candidates[:500]  # Limit candidates for performance
    
    def _combine_algorithm_predictions(self, algorithm_predictions: Dict[str, Dict[str, float]]) -> Dict[str, float]:
        """Combine predictions from multiple algorithms."""
        combined_scores = {}
        
        # Get all unique items
        all_items = set()
        for predictions in algorithm_predictions.values():
            all_items.update(predictions.keys())
        
        # Calculate weighted average for each item
        for item_id in all_items:
            weighted_score = 0.0
            total_weight = 0.0
            
            for algorithm_name, predictions in algorithm_predictions.items():
                if item_id in predictions:
                    weight = self.algorithm_weights.get(algorithm_name, 0)
                    weighted_score += weight * predictions[item_id]
                    total_weight += weight
            
            if total_weight > 0:
                combined_scores[item_id] = weighted_score / total_weight
            else:
                combined_scores[item_id] = 0.0
        
        return combined_scores
    
    def _apply_contextual_boosting(self, scores: Dict[str, float], context_features: Dict[str, float]) -> Dict[str, float]:
        """Apply contextual boosting to scores."""
        boosted_scores = scores.copy()
        
        # Time-based boosting
        if 'is_weekend' in context_features and context_features['is_weekend']:
            # Boost entertainment and leisure items on weekends
            for item_id in boosted_scores:
                if 'entertainment' in item_id or 'leisure' in item_id:
                    boosted_scores[item_id] *= 1.1
        
        # Weather-based boosting
        if 'is_sunny' in context_features and context_features['is_sunny']:
            # Boost outdoor activities in sunny weather
            for item_id in boosted_scores:
                if 'outdoor' in item_id or 'nature' in item_id:
                    boosted_scores[item_id] *= 1.15
        
        # Budget-based boosting
        if 'budget_preference' in context_features:
            budget_pref = context_features['budget_preference']
            for item_id in boosted_scores:
                # Mock budget alignment check
                if 'luxury' in item_id and budget_pref > 0.7:
                    boosted_scores[item_id] *= 1.2
                elif 'budget' in item_id and budget_pref < 0.4:
                    boosted_scores[item_id] *= 1.2
        
        return boosted_scores
    
    def _apply_diversity_boost(self, scores: Dict[str, float], user_id: str) -> Dict[str, float]:
        """Apply diversity boosting to avoid filter bubbles."""
        # Simple diversity implementation - boost items from different categories
        diverse_scores = scores.copy()
        
        # Group items by category (mock implementation)
        categories = {}
        for item_id in scores:
            # Extract category from item_id (mock)
            category = item_id.split('_')[0] if '_' in item_id else 'unknown'
            if category not in categories:
                categories[category] = []
            categories[category].append(item_id)
        
        # Apply diversity boost
        diversity_factor = 0.1
        for category, items in categories.items():
            if len(items) > 1:
                # Boost the second-best item in each category
                sorted_items = sorted(items, key=lambda x: scores[x], reverse=True)
                if len(sorted_items) > 1:
                    diverse_scores[sorted_items[1]] *= (1 + diversity_factor)
        
        return diverse_scores
    
    async def _format_recommendations(self, recommendations: List[Tuple[str, float]], 
                                    rec_type: RecommendationType,
                                    algorithm_predictions: Dict[str, Dict[str, float]]) -> List[Dict[str, Any]]:
        """Format recommendations with metadata and explanations."""
        formatted_recs = []
        
        for item_id, score in recommendations:
            # Generate explanation
            explanation = self._generate_explanation(item_id, score, algorithm_predictions)
            
            # Create recommendation object based on type
            rec_data = {
                'item_id': item_id,
                'score': float(score),
                'confidence': min(1.0, score),
                'explanation': explanation,
                'algorithm_contributions': self._get_algorithm_contributions(item_id, algorithm_predictions)
            }
            
            # Add type-specific metadata (mock data)
            if rec_type == RecommendationType.PROPERTY:
                rec_data.update({
                    'property_type': 'hotel',
                    'location': 'Mock City',
                    'price_per_night': 150.0,
                    'amenities': ['wifi', 'parking', 'pool']
                })
            elif rec_type == RecommendationType.POI:
                rec_data.update({
                    'category': 'museum',
                    'location': 'Mock City',
                    'opening_hours': '9:00-17:00',
                    'entry_fee': 15.0
                })
            elif rec_type == RecommendationType.EXPERIENCE:
                rec_data.update({
                    'category': 'cultural',
                    'duration_hours': 3,
                    'price': 75.0,
                    'difficulty_level': 'easy'
                })
            
            formatted_recs.append(rec_data)
        
        return formatted_recs
    
    def _generate_explanation(self, item_id: str, score: float, algorithm_predictions: Dict[str, Dict[str, float]]) -> str:
        """Generate explanation for recommendation."""
        explanations = []
        
        # Check which algorithms contributed
        contributing_algorithms = []
        for algo_name, predictions in algorithm_predictions.items():
            if item_id in predictions and predictions[item_id] > 0:
                contributing_algorithms.append(algo_name)
        
        if 'collaborative_filtering' in contributing_algorithms:
            explanations.append("similar users also liked this")
        
        if 'content_based' in contributing_algorithms:
            explanations.append("matches your preferences")
        
        if 'matrix_factorization' in contributing_algorithms:
            explanations.append("discovered through preference patterns")
        
        if score > 0.8:
            explanations.append("highly recommended")
        elif score > 0.6:
            explanations.append("good match")
        
        if not explanations:
            explanations = ["popular choice"]
        
        return "Recommended because " + " and ".join(explanations)
    
    def _get_algorithm_contributions(self, item_id: str, algorithm_predictions: Dict[str, Dict[str, float]]) -> Dict[str, float]:
        """Get contribution scores from each algorithm."""
        contributions = {}
        
        for algo_name, predictions in algorithm_predictions.items():
            if item_id in predictions:
                contributions[algo_name] = float(predictions[item_id])
            else:
                contributions[algo_name] = 0.0
        
        return contributions
    
    async def _get_fallback_recommendations(self, request: RecommendationRequest) -> List[Dict[str, Any]]:
        """Get fallback recommendations when main algorithms fail."""
        logger.info(f"Using fallback recommendations for user {request.user_id}")
        
        # Get popular items as fallback
        popular_items = await self.fallback_engine.get_popular_items(
            request.recommendation_type,
            request.limit
        )
        
        fallback_recs = []
        for item_id, score in popular_items:
            rec_data = {
                'item_id': item_id,
                'score': float(score),
                'confidence': 0.5,  # Lower confidence for fallback
                'explanation': 'Popular recommendation',
                'is_fallback': True
            }
            fallback_recs.append(rec_data)
        
        return fallback_recs
    
    def _format_response(self, recommendations: List[Dict[str, Any]], cached: bool, start_time: datetime, algorithm: str = "hybrid") -> RecommendationResponse:
        """Format the final recommendation response."""
        response_time_ms = int((datetime.now() - start_time).total_seconds() * 1000)
        
        return RecommendationResponse(
            recommendations=recommendations,
            total_count=len(recommendations),
            page=1,
            per_page=len(recommendations),
            algorithm_used=algorithm,
            cached=cached,
            response_time_ms=response_time_ms
        )
    
    async def update_user_feedback(self, user_id: str, item_id: str, feedback_type: str, context: Dict[str, Any] = None):
        """Update models with user feedback for real-time learning."""
        try:
            # Invalidate user cache to reflect new preferences
            await self.cache.invalidate_user_cache(str(user_id))
            
            # Store feedback for model retraining (in production, store in database)
            feedback_data = {
                'user_id': str(user_id),
                'item_id': item_id,
                'feedback_type': feedback_type,
                'timestamp': datetime.now().isoformat(),
                'context': context or {}
            }
            
            # In production, this would be stored in a feedback collection system
            logger.info(f"Received feedback: {feedback_data}")
            
        except Exception as e:
            logger.error(f"Error updating user feedback: {str(e)}")


# Global instance
recommendation_engine = RealtimeRecommendationEngine()