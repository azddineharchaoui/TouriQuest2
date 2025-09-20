"""Advanced ranking service for property search results"""

import asyncio
import math
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
from decimal import Decimal
import structlog
import numpy as np
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from geopy.distance import geodesic

from app.models import Property, PropertyReview, SearchQuery, ABTestExperiment, RankingFeature
from app.schemas import AdvancedSearchRequest, Coordinates
from app.core.config import get_settings

logger = structlog.get_logger()


class RankingService:
    """Advanced ranking service with ML-based personalization and A/B testing"""
    
    def __init__(self):
        self.settings = get_settings()
        self.ranking_weights = {
            # Base ranking weights (can be overridden by experiments)
            "relevance": 0.25,
            "distance": 0.20,
            "price": 0.15,
            "rating": 0.15,
            "popularity": 0.10,
            "availability": 0.05,
            "host_quality": 0.05,
            "personalization": 0.05
        }
        
    async def rank_results(
        self,
        results: List[Dict[str, Any]],
        request: AdvancedSearchRequest,
        user_context: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Rank search results using advanced multi-factor algorithm
        """
        if not results:
            return results
        
        try:
            # Get A/B test configuration if applicable
            experiment_config = await self._get_experiment_config(request.experiment_variant)
            if experiment_config:
                self.ranking_weights.update(experiment_config.get("ranking_weights", {}))
            
            # Calculate individual ranking scores for each result
            scored_results = []
            for result in results:
                scores = await self._calculate_ranking_scores(result, request, user_context)
                final_score = await self._combine_scores(scores, self.ranking_weights)
                
                result["ranking_scores"] = scores
                result["final_ranking_score"] = final_score
                scored_results.append(result)
            
            # Sort by final ranking score (highest first)
            ranked_results = sorted(
                scored_results,
                key=lambda x: x["final_ranking_score"],
                reverse=True
            )
            
            # Add ranking positions
            for i, result in enumerate(ranked_results):
                result["search_rank"] = i + 1
            
            logger.info(f"Ranked {len(ranked_results)} results")
            return ranked_results
            
        except Exception as e:
            logger.error(f"Ranking failed: {str(e)}")
            # Fallback to original order
            return results
    
    async def _calculate_ranking_scores(
        self,
        result: Dict[str, Any],
        request: AdvancedSearchRequest,
        user_context: Optional[Dict[str, Any]]
    ) -> Dict[str, float]:
        """Calculate individual ranking factor scores"""
        
        scores = {}
        property_obj = result.get("db_property")
        
        # 1. Relevance Score (from Elasticsearch)
        scores["relevance"] = self._normalize_score(
            result.get("_score", 0), 0, 100
        )
        
        # 2. Distance Score (closer is better)
        scores["distance"] = await self._calculate_distance_score(result, request)
        
        # 3. Price Score (value-based, not just cheap)
        scores["price"] = await self._calculate_price_score(result, request)
        
        # 4. Rating Score
        scores["rating"] = await self._calculate_rating_score(result)
        
        # 5. Popularity Score
        scores["popularity"] = await self._calculate_popularity_score(result)
        
        # 6. Availability Score
        scores["availability"] = await self._calculate_availability_score(result, request)
        
        # 7. Host Quality Score
        scores["host_quality"] = await self._calculate_host_quality_score(result)
        
        # 8. Personalization Score
        scores["personalization"] = await self._calculate_personalization_score(
            result, user_context
        ) if user_context and request.enable_personalization else 0.0
        
        return scores
    
    async def _calculate_distance_score(
        self,
        result: Dict[str, Any],
        request: AdvancedSearchRequest
    ) -> float:
        """Calculate distance-based ranking score"""
        if not request.coordinates:
            return 0.5  # Neutral score if no location specified
        
        # Get property coordinates
        property_obj = result.get("db_property")
        if not property_obj or not hasattr(property_obj, 'location'):
            return 0.0
        
        try:
            # Calculate distance using geopy
            property_coords = (property_obj.location.y, property_obj.location.x)  # lat, lon
            search_coords = (request.coordinates.latitude, request.coordinates.longitude)
            
            distance_km = geodesic(search_coords, property_coords).kilometers
            
            # Score based on distance relative to search radius
            max_distance = request.radius or self.settings.search_default_radius
            
            if distance_km >= max_distance:
                return 0.0
            
            # Linear decay: closer = higher score
            score = 1.0 - (distance_km / max_distance)
            return max(0.0, min(1.0, score))
            
        except Exception as e:
            logger.warning(f"Distance calculation failed: {str(e)}")
            return 0.5
    
    async def _calculate_price_score(
        self,
        result: Dict[str, Any],
        request: AdvancedSearchRequest
    ) -> float:
        """Calculate price-value score (not just cheapest)"""
        property_obj = result.get("db_property")
        if not property_obj:
            return 0.0
        
        base_price = float(property_obj.base_price_per_night)
        
        # If user specified price range, score based on position in range
        if request.price_range and request.price_range.min_price and request.price_range.max_price:
            min_price = float(request.price_range.min_price)
            max_price = float(request.price_range.max_price)
            
            if base_price < min_price or base_price > max_price:
                return 0.0  # Outside user's price range
            
            # Score based on value perception (middle of range = highest score)
            price_range = max_price - min_price
            if price_range > 0:
                # Bell curve: properties in middle of price range get highest score
                normalized_position = (base_price - min_price) / price_range
                score = 4 * normalized_position * (1 - normalized_position)  # Bell curve
                return max(0.0, min(1.0, score))
        
        # If no price range specified, use property's price competitiveness
        # This would typically be calculated based on comparable properties
        # For now, using a simplified approach based on rating-to-price ratio
        
        rating = float(property_obj.overall_rating) if property_obj.overall_rating else 2.5
        
        # Calculate value score (higher rating, lower price = better value)
        if base_price > 0:
            value_ratio = rating / (base_price / 100)  # Normalize price
            return self._normalize_score(value_ratio, 0, 5)
        
        return 0.5
    
    async def _calculate_rating_score(self, result: Dict[str, Any]) -> float:
        """Calculate rating-based score with review count weighting"""
        property_obj = result.get("db_property")
        if not property_obj:
            return 0.0
        
        rating = float(property_obj.overall_rating) if property_obj.overall_rating else 0.0
        review_count = int(property_obj.review_count) if property_obj.review_count else 0
        
        # Base rating score (0-5 scale normalized to 0-1)
        rating_score = rating / 5.0
        
        # Apply confidence factor based on review count
        # More reviews = more confidence in the rating
        confidence_factor = min(1.0, review_count / 50.0)  # Max confidence at 50+ reviews
        
        # Weighted score considering confidence
        weighted_score = rating_score * (0.5 + 0.5 * confidence_factor)
        
        return max(0.0, min(1.0, weighted_score))
    
    async def _calculate_popularity_score(self, result: Dict[str, Any]) -> float:
        """Calculate popularity score based on views, bookings, and clicks"""
        property_obj = result.get("db_property")
        if not property_obj:
            return 0.0
        
        # Combine multiple popularity signals
        views_score = self._normalize_score(
            property_obj.views_count or 0, 0, 10000
        )
        
        # Recent booking activity (higher weight for recent bookings)
        booking_recency_score = 0.0
        if property_obj.last_booked_at:
            days_since_booking = (datetime.utcnow() - property_obj.last_booked_at).days
            booking_recency_score = max(0.0, 1.0 - (days_since_booking / 365.0))
        
        # Combine popularity signals
        popularity_score = (
            0.4 * views_score +
            0.6 * booking_recency_score
        )
        
        return max(0.0, min(1.0, popularity_score))
    
    async def _calculate_availability_score(
        self,
        result: Dict[str, Any],
        request: AdvancedSearchRequest
    ) -> float:
        """Calculate availability score based on calendar openness"""
        # If property is available for requested dates, give full score
        if result.get("is_available", False):
            return 1.0
        
        # If dates not specified, give neutral score
        if not request.dates:
            return 0.5
        
        # If not available for requested dates, check nearby date flexibility
        # This would require additional database queries
        # For now, returning 0 for unavailable properties
        return 0.0
    
    async def _calculate_host_quality_score(self, result: Dict[str, Any]) -> float:
        """Calculate host quality score"""
        property_obj = result.get("db_property")
        if not property_obj:
            return 0.0
        
        # Host verification bonus
        verification_score = 1.0 if property_obj.host_verified else 0.5
        
        # Response rate score
        response_rate = float(property_obj.host_response_rate) if property_obj.host_response_rate else 0.0
        response_rate_score = response_rate / 100.0
        
        # Response time score (faster = better)
        response_time_hours = property_obj.host_response_time_hours or 24
        response_time_score = max(0.0, 1.0 - (response_time_hours / 48.0))  # 48h = 0 score
        
        # Combine host quality factors
        host_score = (
            0.4 * verification_score +
            0.4 * response_rate_score +
            0.2 * response_time_score
        )
        
        return max(0.0, min(1.0, host_score))
    
    async def _calculate_personalization_score(
        self,
        result: Dict[str, Any],
        user_context: Optional[Dict[str, Any]]
    ) -> float:
        """Calculate personalization score based on user preferences and history"""
        if not user_context:
            return 0.0
        
        property_obj = result.get("db_property")
        if not property_obj:
            return 0.0
        
        personalization_score = 0.0
        
        # Property type preference
        user_preferred_types = user_context.get("preferred_property_types", [])
        if property_obj.property_type.value in user_preferred_types:
            personalization_score += 0.3
        
        # Price range preference
        user_budget_range = user_context.get("typical_budget_range", {})
        if user_budget_range:
            property_price = float(property_obj.base_price_per_night)
            min_budget = user_budget_range.get("min", 0)
            max_budget = user_budget_range.get("max", 999999)
            
            if min_budget <= property_price <= max_budget:
                personalization_score += 0.2
        
        # Location preference (based on past bookings)
        user_preferred_locations = user_context.get("preferred_locations", [])
        property_city = property_obj.city.lower()
        if any(loc.lower() in property_city for loc in user_preferred_locations):
            personalization_score += 0.3
        
        # Amenity preferences
        user_preferred_amenities = user_context.get("preferred_amenities", [])
        # This would require querying property amenities
        # For now, giving a base score
        personalization_score += 0.2
        
        return max(0.0, min(1.0, personalization_score))
    
    async def _combine_scores(
        self,
        scores: Dict[str, float],
        weights: Dict[str, float]
    ) -> float:
        """Combine individual scores using weighted average"""
        total_score = 0.0
        total_weight = 0.0
        
        for factor, score in scores.items():
            weight = weights.get(factor, 0.0)
            total_score += score * weight
            total_weight += weight
        
        if total_weight > 0:
            return total_score / total_weight
        
        return 0.0
    
    def _normalize_score(self, value: float, min_val: float, max_val: float) -> float:
        """Normalize value to 0-1 range"""
        if max_val <= min_val:
            return 0.0
        
        normalized = (value - min_val) / (max_val - min_val)
        return max(0.0, min(1.0, normalized))
    
    async def _get_experiment_config(
        self,
        experiment_variant: Optional[str]
    ) -> Optional[Dict[str, Any]]:
        """Get A/B test experiment configuration"""
        if not experiment_variant:
            return None
        
        # This would query the database for active experiments
        # For now, returning a sample configuration
        experiment_configs = {
            "ranking_v2": {
                "ranking_weights": {
                    "relevance": 0.20,
                    "distance": 0.15,
                    "price": 0.20,
                    "rating": 0.20,
                    "popularity": 0.15,
                    "availability": 0.05,
                    "host_quality": 0.05,
                    "personalization": 0.00
                }
            },
            "personalization_boost": {
                "ranking_weights": {
                    "relevance": 0.20,
                    "distance": 0.15,
                    "price": 0.15,
                    "rating": 0.15,
                    "popularity": 0.05,
                    "availability": 0.05,
                    "host_quality": 0.05,
                    "personalization": 0.20
                }
            }
        }
        
        return experiment_configs.get(experiment_variant)
    
    async def calculate_boost_factors(
        self,
        property_obj: Property,
        search_context: Dict[str, Any]
    ) -> Dict[str, float]:
        """Calculate dynamic boost factors for specific properties"""
        boosts = {}
        
        # Seasonal boost
        current_month = datetime.now().month
        if property_obj.property_type.value in ["cabin", "cottage"] and current_month in [6, 7, 8]:
            boosts["seasonal"] = 1.2  # Summer boost for cabins
        
        # New listing boost
        if property_obj.created_at and (datetime.utcnow() - property_obj.created_at).days < 30:
            boosts["new_listing"] = 1.1
        
        # High-performance boost
        if (property_obj.overall_rating or 0) >= 4.8 and (property_obj.review_count or 0) >= 20:
            boosts["high_performance"] = 1.15
        
        # Instant book boost
        if property_obj.booking_type.value == "instant_book":
            boosts["instant_book"] = 1.05
        
        return boosts
    
    async def get_ranking_explanation(
        self,
        result: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate explanation for why a property was ranked as it was"""
        scores = result.get("ranking_scores", {})
        
        explanation = {
            "final_score": result.get("final_ranking_score", 0),
            "rank": result.get("search_rank", 0),
            "factors": []
        }
        
        # Identify top contributing factors
        sorted_scores = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        
        for factor, score in sorted_scores[:3]:  # Top 3 factors
            factor_weight = self.ranking_weights.get(factor, 0)
            contribution = score * factor_weight
            
            explanation["factors"].append({
                "factor": factor,
                "score": score,
                "weight": factor_weight,
                "contribution": contribution,
                "description": self._get_factor_description(factor, score)
            })
        
        return explanation
    
    def _get_factor_description(self, factor: str, score: float) -> str:
        """Get human-readable description of ranking factor"""
        descriptions = {
            "relevance": f"Matches your search with {score:.0%} relevance",
            "distance": f"Located {score:.0%} within your preferred area",
            "price": f"Offers {score:.0%} good value for money",
            "rating": f"Has {score:.0%} excellent guest reviews",
            "popularity": f"Is {score:.0%} popular with other travelers",
            "availability": f"Has {score:.0%} good availability",
            "host_quality": f"Host provides {score:.0%} quality service",
            "personalization": f"Matches {score:.0%} of your preferences"
        }
        
        return descriptions.get(factor, f"{factor}: {score:.0%}")


# Additional ranking utilities
class RankingOptimizer:
    """Utilities for optimizing ranking algorithms"""
    
    @staticmethod
    async def analyze_ranking_performance(
        search_queries: List[SearchQuery],
        click_data: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Analyze how well the ranking algorithm performs"""
        
        # Calculate metrics like MRR (Mean Reciprocal Rank), NDCG, etc.
        # This would be used to optimize ranking weights
        
        return {
            "mean_reciprocal_rank": 0.0,
            "ndcg_at_5": 0.0,
            "click_through_rate_by_position": {},
            "conversion_rate_by_position": {}
        }
    
    @staticmethod
    async def optimize_ranking_weights(
        training_data: List[Dict[str, Any]]
    ) -> Dict[str, float]:
        """Use machine learning to optimize ranking weights"""
        
        # This would implement learning-to-rank algorithms
        # For now, returning default weights
        
        return {
            "relevance": 0.25,
            "distance": 0.20,
            "price": 0.15,
            "rating": 0.15,
            "popularity": 0.10,
            "availability": 0.05,
            "host_quality": 0.05,
            "personalization": 0.05
        }