"""
Recommendation service for personalized POI suggestions
"""

import random
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc

from app.models import POI, POIInteraction, user_poi_favorites
from app.schemas import (
    RecommendationRequest, RecommendationResponse, POISummary, LocationPoint,
    POICategoryEnum
)
from app.services.search_service import SearchService
from app.repositories.poi_repository import POIRepository


class RecommendationService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.poi_repo = POIRepository(db)
        self.search_service = SearchService(db)

    async def get_recommendations(self, request: RecommendationRequest) -> RecommendationResponse:
        """
        Generate personalized POI recommendations
        """
        recommendations = []
        explanation = ""
        confidence_score = 0.0
        recommendation_type = "general"

        if request.user_id:
            # Try personalized recommendations first
            recommendations = await self._get_personalized_recommendations(request)
            if recommendations:
                explanation = "Personalized recommendations based on your preferences and activity"
                confidence_score = 0.8
                recommendation_type = "personalized"

        if not recommendations and request.location:
            # Fall back to location-based recommendations
            recommendations = await self._get_location_based_recommendations(request)
            explanation = "Popular attractions near your location"
            confidence_score = 0.6
            recommendation_type = "location-based"

        if not recommendations:
            # Fall back to general popular recommendations
            recommendations = await self._get_popular_recommendations(request)
            explanation = "Popular attractions that other travelers love"
            confidence_score = 0.4
            recommendation_type = "popular"

        # Convert to summary format
        poi_summaries = []
        for poi in recommendations[:request.limit]:
            summary = await self.search_service.convert_to_summary(poi, request.location)
            poi_summaries.append(summary)

        return RecommendationResponse(
            recommendations=poi_summaries,
            explanation=explanation,
            confidence_score=confidence_score,
            recommendation_type=recommendation_type
        )

    async def _get_personalized_recommendations(self, request: RecommendationRequest) -> List[POI]:
        """
        Generate recommendations based on user's history and preferences
        """
        if not request.user_id:
            return []

        # Get user's favorite categories
        user_categories = await self._get_user_preferred_categories(request.user_id)
        
        # Get user's interaction history
        visited_poi_ids = await self._get_user_visited_pois(request.user_id)
        
        # Build base query
        query = select(POI).where(POI.is_active == True)
        
        # Exclude already visited POIs
        if visited_poi_ids:
            query = query.where(~POI.id.in_(visited_poi_ids))
        
        # Prefer user's favorite categories
        if user_categories:
            query = query.where(POI.category.in_(user_categories))
        elif request.category_preferences:
            categories = [cat.value for cat in request.category_preferences]
            query = query.where(POI.category.in_(categories))
        
        # Apply budget filter
        if request.budget_range:
            query = self._apply_budget_filter(query, request.budget_range)
        
        # Apply travel style filters
        if request.travel_style:
            query = self._apply_travel_style_filter(query, request.travel_style)
        
        # Apply interest filters
        if request.interests:
            query = self._apply_interest_filter(query, request.interests)
        
        # Location-based sorting if available
        if request.location:
            from geoalchemy2.functions import ST_Distance, ST_GeogFromText
            location_wkt = f"POINT({request.location.longitude} {request.location.latitude})"
            query = query.order_by(
                ST_Distance(POI.location, ST_GeogFromText(location_wkt))
            )
        else:
            # Order by popularity and rating
            query = query.order_by(desc(POI.popularity_score), desc(POI.average_rating))
        
        query = query.limit(request.limit * 2)  # Get more than needed for filtering
        
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def _get_location_based_recommendations(self, request: RecommendationRequest) -> List[POI]:
        """
        Generate recommendations based on location and general preferences
        """
        if not request.location:
            return []
        
        # Get nearby POIs with high ratings
        nearby_pois = await self.poi_repo.get_nearby_pois(
            request.location.latitude,
            request.location.longitude,
            radius_km=20.0,  # Wider radius for recommendations
            limit=request.limit * 2
        )
        
        # Filter by preferences
        filtered_pois = []
        for poi in nearby_pois:
            if self._matches_preferences(poi, request):
                filtered_pois.append(poi)
        
        # Sort by rating and popularity
        filtered_pois.sort(key=lambda p: (p.average_rating, p.popularity_score), reverse=True)
        
        return filtered_pois[:request.limit]

    async def _get_popular_recommendations(self, request: RecommendationRequest) -> List[POI]:
        """
        Generate recommendations based on general popularity
        """
        query = select(POI).where(POI.is_active == True)
        
        # Apply category filter if specified
        if request.category_preferences:
            categories = [cat.value for cat in request.category_preferences]
            query = query.where(POI.category.in_(categories))
        
        # Apply budget filter
        if request.budget_range:
            query = self._apply_budget_filter(query, request.budget_range)
        
        # Order by popularity and rating
        query = query.order_by(
            desc(POI.popularity_score),
            desc(POI.average_rating),
            desc(POI.review_count)
        ).limit(request.limit)
        
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def _get_user_preferred_categories(self, user_id: UUID) -> List[str]:
        """
        Analyze user's interaction history to determine preferred categories
        """
        # Get categories from user's favorites
        favorite_categories = await self.db.execute(
            select(POI.category, func.count(POI.category).label('count'))
            .join(user_poi_favorites, POI.id == user_poi_favorites.c.poi_id)
            .where(user_poi_favorites.c.user_id == user_id)
            .group_by(POI.category)
            .order_by(desc('count'))
            .limit(3)
        )
        
        categories = [row.category for row in favorite_categories]
        
        # If no favorites, check interaction history
        if not categories:
            interaction_categories = await self.db.execute(
                select(POI.category, func.count(POI.category).label('count'))
                .join(POIInteraction, POI.id == POIInteraction.poi_id)
                .where(
                    and_(
                        POIInteraction.user_id == user_id,
                        POIInteraction.interaction_type.in_(['view', 'favorite', 'checkin'])
                    )
                )
                .group_by(POI.category)
                .order_by(desc('count'))
                .limit(3)
            )
            
            categories = [row.category for row in interaction_categories]
        
        return categories

    async def _get_user_visited_pois(self, user_id: UUID) -> List[UUID]:
        """
        Get list of POIs the user has already visited/interacted with
        """
        # Get from favorites
        favorites = await self.db.execute(
            select(user_poi_favorites.c.poi_id)
            .where(user_poi_favorites.c.user_id == user_id)
        )
        
        favorite_ids = [row.poi_id for row in favorites]
        
        # Get from recent interactions
        recent_interactions = await self.db.execute(
            select(POIInteraction.poi_id)
            .where(
                and_(
                    POIInteraction.user_id == user_id,
                    POIInteraction.created_at >= datetime.utcnow() - timedelta(days=30)
                )
            )
            .distinct()
        )
        
        interaction_ids = [row.poi_id for row in recent_interactions]
        
        return list(set(favorite_ids + interaction_ids))

    def _apply_budget_filter(self, query, budget_range: str):
        """
        Apply budget range filter to query
        """
        if budget_range == "budget":
            query = query.where(
                or_(
                    POI.is_free == True,
                    POI.entry_fee_adult <= 20.0
                )
            )
        elif budget_range == "mid-range":
            query = query.where(
                and_(
                    POI.entry_fee_adult > 20.0,
                    POI.entry_fee_adult <= 50.0
                )
            )
        elif budget_range == "luxury":
            query = query.where(POI.entry_fee_adult > 50.0)
        
        return query

    def _apply_travel_style_filter(self, query, travel_styles: List[str]):
        """
        Apply travel style filters to query
        """
        if "family" in travel_styles:
            query = query.where(POI.is_family_friendly == True)
        
        if "photography" in travel_styles:
            query = query.where(POI.allows_photography == True)
        
        if "culture" in travel_styles:
            query = query.where(
                POI.category.in_(["museums_culture", "historical_sites"])
            )
        
        if "nature" in travel_styles:
            query = query.where(POI.category == "nature_parks")
        
        if "food" in travel_styles:
            query = query.where(POI.category == "food_dining")
        
        return query

    def _apply_interest_filter(self, query, interests: List[str]):
        """
        Apply interest-based filters to query
        """
        # Map interests to categories and features
        interest_mapping = {
            "history": ["museums_culture", "historical_sites"],
            "art": ["museums_culture"],
            "nature": ["nature_parks"],
            "food": ["food_dining"],
            "shopping": ["shopping"],
            "entertainment": ["entertainment", "nightlife"],
            "audio_tours": {"has_audio_guide": True},
            "ar_experiences": {"has_ar_experience": True},
            "free_activities": {"is_free": True}
        }
        
        category_filters = []
        feature_filters = []
        
        for interest in interests:
            if interest in interest_mapping:
                mapping = interest_mapping[interest]
                if isinstance(mapping, list):
                    category_filters.extend(mapping)
                elif isinstance(mapping, dict):
                    feature_filters.append(mapping)
        
        if category_filters:
            query = query.where(POI.category.in_(category_filters))
        
        for feature_filter in feature_filters:
            for field, value in feature_filter.items():
                query = query.where(getattr(POI, field) == value)
        
        return query

    def _matches_preferences(self, poi: POI, request: RecommendationRequest) -> bool:
        """
        Check if POI matches user preferences
        """
        # Check category preferences
        if request.category_preferences:
            if poi.category not in [cat.value for cat in request.category_preferences]:
                return False
        
        # Check budget range
        if request.budget_range:
            if request.budget_range == "budget":
                if not poi.is_free and poi.entry_fee_adult and poi.entry_fee_adult > 20:
                    return False
            elif request.budget_range == "luxury":
                if poi.is_free or (poi.entry_fee_adult and poi.entry_fee_adult < 50):
                    return False
        
        # Check travel style
        if request.travel_style:
            if "family" in request.travel_style and not poi.is_family_friendly:
                return False
        
        return True

    async def get_similar_pois(self, poi_id: UUID, limit: int = 10) -> List[POI]:
        """
        Get POIs similar to a given POI
        """
        # Get the reference POI
        reference_poi = await self.poi_repo.get_poi_by_id(poi_id, include_relations=False)
        if not reference_poi:
            return []
        
        # Find POIs with same category
        query = select(POI).where(
            and_(
                POI.category == reference_poi.category,
                POI.id != poi_id,
                POI.is_active == True
            )
        )
        
        # Prefer POIs with similar ratings
        rating_diff = 1.0
        query = query.where(
            and_(
                POI.average_rating >= reference_poi.average_rating - rating_diff,
                POI.average_rating <= reference_poi.average_rating + rating_diff
            )
        )
        
        # Order by similarity factors
        query = query.order_by(
            desc(POI.popularity_score),
            desc(POI.average_rating)
        ).limit(limit)
        
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_trending_recommendations(self, limit: int = 10) -> List[POI]:
        """
        Get trending POIs as recommendations
        """
        return await self.poi_repo.get_trending_pois(limit, hours=24)