"""
Recommendation service for personalized experience suggestions
"""

from typing import List, Optional, Dict, Any, Tuple
from uuid import UUID
from datetime import datetime, timedelta
from decimal import Decimal
import asyncio
import json

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc, asc, text
from sqlalchemy.orm import selectinload

from app.models import (
    Experience, ExperienceBooking, ExperienceReview, UserInteraction,
    ExperienceCategory, User
)
from app.schemas import (
    RecommendationParams, RecommendationResult, LocationPoint
)


class RecommendationService:
    """Service for generating personalized experience recommendations"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_personalized_recommendations(
        self,
        params: RecommendationParams
    ) -> List[RecommendationResult]:
        """
        Generate personalized recommendations for a user
        """
        # Get user's interaction history
        user_history = await self._get_user_history(params.user_id)
        
        # Get user's preferences from past bookings
        preferences = await self._analyze_user_preferences(params.user_id)
        
        # Get collaborative filtering recommendations
        collaborative_recs = await self._get_collaborative_recommendations(
            params.user_id, preferences
        )
        
        # Get content-based recommendations
        content_recs = await self._get_content_based_recommendations(
            preferences, params.location
        )
        
        # Combine and score recommendations
        combined_recs = await self._combine_recommendations(
            collaborative_recs, content_recs, preferences, params
        )
        
        # Filter out experiences user has already booked
        filtered_recs = await self._filter_booked_experiences(
            combined_recs, params.user_id
        )
        
        return filtered_recs[:params.limit]
    
    async def get_similar_experiences(
        self,
        experience_id: UUID,
        limit: int = 10
    ) -> List[Experience]:
        """
        Get experiences similar to the specified experience
        """
        # Get the base experience
        base_exp_query = await self.db.execute(
            select(Experience).where(Experience.id == experience_id)
        )
        base_experience = base_exp_query.scalar_one_or_none()
        
        if not base_experience:
            return []
        
        # Find similar experiences based on multiple criteria
        query = select(Experience).where(
            and_(
                Experience.id != experience_id,
                Experience.is_active == True,
                Experience.is_published == True
            )
        )
        
        # Similarity scoring conditions
        similarity_conditions = []
        
        # Same category (high weight)
        similarity_conditions.append(
            func.case((Experience.category == base_experience.category, 3), else_=0)
        )
        
        # Similar price range (medium weight)
        price_diff = func.abs(Experience.base_price - base_experience.base_price)
        price_threshold = base_experience.base_price * 0.3  # 30% price difference
        similarity_conditions.append(
            func.case((price_diff <= price_threshold, 2), else_=0)
        )
        
        # Similar duration (medium weight)
        if base_experience.duration_hours:
            duration_diff = func.abs(Experience.duration_hours - base_experience.duration_hours)
            similarity_conditions.append(
                func.case((duration_diff <= 2, 1), else_=0)  # Within 2 hours
            )
        
        # Similar rating (low weight)
        if base_experience.average_rating:
            rating_diff = func.abs(Experience.average_rating - base_experience.average_rating)
            similarity_conditions.append(
                func.case((rating_diff <= 0.5, 1), else_=0)  # Within 0.5 rating
            )
        
        # Same skill level (low weight)
        similarity_conditions.append(
            func.case((Experience.skill_level == base_experience.skill_level, 1), else_=0)
        )
        
        # Calculate total similarity score
        similarity_score = sum(similarity_conditions)
        
        # Order by similarity score and limit results
        query = query.order_by(desc(similarity_score), desc(Experience.average_rating))
        query = query.limit(limit)
        
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def _get_user_history(self, user_id: UUID) -> Dict[str, Any]:
        """Get user's interaction and booking history"""
        # Get recent interactions
        interactions_query = await self.db.execute(
            select(UserInteraction)
            .where(UserInteraction.user_id == user_id)
            .order_by(desc(UserInteraction.created_at))
            .limit(100)
        )
        interactions = interactions_query.scalars().all()
        
        # Get booking history
        bookings_query = await self.db.execute(
            select(ExperienceBooking)
            .where(ExperienceBooking.user_id == user_id)
            .options(selectinload(ExperienceBooking.experience))
            .order_by(desc(ExperienceBooking.created_at))
        )
        bookings = bookings_query.scalars().all()
        
        # Get review history
        reviews_query = await self.db.execute(
            select(ExperienceReview)
            .where(ExperienceReview.user_id == user_id)
            .options(selectinload(ExperienceReview.experience))
            .order_by(desc(ExperienceReview.created_at))
        )
        reviews = reviews_query.scalars().all()
        
        return {
            "interactions": interactions,
            "bookings": bookings,
            "reviews": reviews
        }
    
    async def _analyze_user_preferences(self, user_id: UUID) -> Dict[str, Any]:
        """Analyze user preferences from their history"""
        # Get user's booking and review history
        bookings_query = await self.db.execute(
            select(ExperienceBooking)
            .join(Experience)
            .where(ExperienceBooking.user_id == user_id)
            .options(selectinload(ExperienceBooking.experience))
        )
        bookings = bookings_query.scalars().all()
        
        reviews_query = await self.db.execute(
            select(ExperienceReview)
            .join(Experience)
            .where(ExperienceReview.user_id == user_id)
            .options(selectinload(ExperienceReview.experience))
        )
        reviews = reviews_query.scalars().all()
        
        # Analyze preferences
        preferences = {
            "preferred_categories": {},
            "price_range": {"min": None, "max": None, "avg": None},
            "preferred_duration": None,
            "preferred_skill_level": None,
            "preferred_group_size": None,
            "location_preferences": [],
            "high_rated_categories": {},
            "booking_frequency": 0
        }
        
        if not bookings and not reviews:
            return preferences
        
        # Analyze category preferences
        category_counts = {}
        category_ratings = {}
        prices = []
        durations = []
        
        # Process bookings
        for booking in bookings:
            exp = booking.experience
            category = exp.category.value
            
            category_counts[category] = category_counts.get(category, 0) + 1
            prices.append(float(exp.base_price))
            
            if exp.duration_hours:
                durations.append(exp.duration_hours)
        
        # Process reviews (weight by rating)
        for review in reviews:
            exp = review.experience
            category = exp.category.value
            rating = review.rating
            
            if category not in category_ratings:
                category_ratings[category] = []
            category_ratings[category].append(rating)
            
            # Weight category preference by rating
            weight = max(0, rating - 3)  # Only positive ratings count
            category_counts[category] = category_counts.get(category, 0) + weight
        
        # Calculate preferences
        if category_counts:
            # Sort categories by preference (count + rating weight)
            sorted_categories = sorted(
                category_counts.items(), 
                key=lambda x: x[1], 
                reverse=True
            )
            preferences["preferred_categories"] = dict(sorted_categories[:3])
            
            # High-rated categories
            for category, ratings in category_ratings.items():
                if ratings:
                    avg_rating = sum(ratings) / len(ratings)
                    if avg_rating >= 4.0:
                        preferences["high_rated_categories"][category] = avg_rating
        
        if prices:
            preferences["price_range"] = {
                "min": min(prices),
                "max": max(prices),
                "avg": sum(prices) / len(prices)
            }
        
        if durations:
            preferences["preferred_duration"] = sum(durations) / len(durations)
        
        preferences["booking_frequency"] = len(bookings)
        
        return preferences
    
    async def _get_collaborative_recommendations(
        self,
        user_id: UUID,
        preferences: Dict[str, Any]
    ) -> List[Tuple[Experience, float]]:
        """
        Get recommendations based on similar users' preferences
        """
        # Find users with similar booking patterns
        similar_users = await self._find_similar_users(user_id, preferences)
        
        if not similar_users:
            return []
        
        # Get experiences booked by similar users that the current user hasn't booked
        similar_user_ids = [user_data["user_id"] for user_data in similar_users[:10]]
        
        # Get experiences booked by similar users
        recs_query = await self.db.execute(
            select(
                Experience,
                func.count(ExperienceBooking.id).label('booking_count'),
                func.avg(ExperienceReview.rating).label('avg_rating_by_similar')
            )
            .join(ExperienceBooking)
            .outerjoin(ExperienceReview, 
                and_(
                    ExperienceReview.experience_id == Experience.id,
                    ExperienceReview.user_id.in_(similar_user_ids)
                )
            )
            .where(
                and_(
                    ExperienceBooking.user_id.in_(similar_user_ids),
                    Experience.is_active == True,
                    Experience.is_published == True,
                    # Exclude experiences already booked by current user
                    ~Experience.id.in_(
                        select(ExperienceBooking.experience_id)
                        .where(ExperienceBooking.user_id == user_id)
                    )
                )
            )
            .group_by(Experience.id)
            .order_by(desc('booking_count'), desc('avg_rating_by_similar'))
            .limit(50)
        )
        
        recs_result = recs_query.all()
        
        # Calculate collaborative filtering scores
        recommendations = []
        for exp, booking_count, avg_rating in recs_result:
            # Score based on booking frequency and ratings by similar users
            score = (booking_count * 0.6) + ((avg_rating or 0) * 0.4)
            recommendations.append((exp, score))
        
        return sorted(recommendations, key=lambda x: x[1], reverse=True)
    
    async def _get_content_based_recommendations(
        self,
        preferences: Dict[str, Any],
        location: Optional[LocationPoint] = None
    ) -> List[Tuple[Experience, float]]:
        """
        Get recommendations based on user's content preferences
        """
        query = select(Experience).where(
            and_(
                Experience.is_active == True,
                Experience.is_published == True
            )
        )
        
        # Apply content-based filters
        preferred_categories = list(preferences.get("preferred_categories", {}).keys())
        if preferred_categories:
            # Convert string category names back to enum values
            category_enums = []
            for cat_str in preferred_categories:
                try:
                    category_enums.append(ExperienceCategory(cat_str))
                except ValueError:
                    continue
            
            if category_enums:
                query = query.where(Experience.category.in_(category_enums))
        
        # Price range filter
        price_range = preferences.get("price_range", {})
        if price_range.get("avg"):
            # Look for experiences within 50% of user's average price
            avg_price = price_range["avg"]
            min_price = avg_price * 0.5
            max_price = avg_price * 1.5
            query = query.where(
                Experience.base_price.between(min_price, max_price)
            )
        
        # Location-based filtering
        if location and location.latitude and location.longitude:
            # Simple distance calculation - prefer closer experiences
            lat_range = 50 / 111  # 50km radius
            lng_range = 50 / (111 * math.cos(math.radians(location.latitude)))
            
            query = query.where(
                and_(
                    Experience.meeting_point_latitude.between(
                        location.latitude - lat_range,
                        location.latitude + lat_range
                    ),
                    Experience.meeting_point_longitude.between(
                        location.longitude - lng_range,
                        location.longitude + lng_range
                    )
                )
            )
        
        # Order by rating and popularity
        query = query.order_by(
            desc(Experience.average_rating),
            desc(Experience.total_bookings)
        ).limit(50)
        
        result = await self.db.execute(query)
        experiences = result.scalars().all()
        
        # Calculate content-based scores
        recommendations = []
        for exp in experiences:
            score = self._calculate_content_score(exp, preferences, location)
            recommendations.append((exp, score))
        
        return sorted(recommendations, key=lambda x: x[1], reverse=True)
    
    def _calculate_content_score(
        self,
        experience: Experience,
        preferences: Dict[str, Any],
        location: Optional[LocationPoint] = None
    ) -> float:
        """Calculate content-based similarity score"""
        score = 0.0
        
        # Category preference score
        preferred_categories = preferences.get("preferred_categories", {})
        if experience.category.value in preferred_categories:
            score += 3.0
        
        # High-rated category bonus
        high_rated_categories = preferences.get("high_rated_categories", {})
        if experience.category.value in high_rated_categories:
            score += 2.0
        
        # Price preference score
        price_range = preferences.get("price_range", {})
        if price_range.get("avg"):
            price_diff = abs(float(experience.base_price) - price_range["avg"])
            max_acceptable_diff = price_range["avg"] * 0.5
            if price_diff <= max_acceptable_diff:
                score += 1.0 - (price_diff / max_acceptable_diff)
        
        # Rating and popularity score
        score += (experience.average_rating or 0) * 0.5
        score += min(experience.total_bookings / 100, 1.0)  # Normalize booking count
        
        # Location proximity score
        if (location and location.latitude and location.longitude and
            experience.meeting_point_latitude and experience.meeting_point_longitude):
            # Simple distance calculation
            import math
            distance = math.sqrt(
                (location.latitude - experience.meeting_point_latitude) ** 2 +
                (location.longitude - experience.meeting_point_longitude) ** 2
            )
            # Closer experiences get higher scores
            score += max(0, 1.0 - distance * 10)  # Arbitrary scaling
        
        return score
    
    async def _find_similar_users(
        self,
        user_id: UUID,
        preferences: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Find users with similar preferences"""
        # Get all users who have made bookings
        users_query = await self.db.execute(
            select(ExperienceBooking.user_id, func.count(ExperienceBooking.id).label('booking_count'))
            .where(ExperienceBooking.user_id != user_id)
            .group_by(ExperienceBooking.user_id)
            .having(func.count(ExperienceBooking.id) >= 2)  # At least 2 bookings
        )
        users = users_query.all()
        
        # Calculate similarity scores for each user
        similar_users = []
        for other_user_id, booking_count in users:
            similarity_score = await self._calculate_user_similarity(
                user_id, other_user_id, preferences
            )
            if similarity_score > 0.3:  # Minimum similarity threshold
                similar_users.append({
                    "user_id": other_user_id,
                    "similarity_score": similarity_score,
                    "booking_count": booking_count
                })
        
        # Sort by similarity score
        return sorted(similar_users, key=lambda x: x["similarity_score"], reverse=True)
    
    async def _calculate_user_similarity(
        self,
        user1_id: UUID,
        user2_id: UUID,
        user1_preferences: Dict[str, Any]
    ) -> float:
        """Calculate similarity between two users"""
        # Get user2's preferences
        user2_preferences = await self._analyze_user_preferences(user2_id)
        
        similarity = 0.0
        
        # Category similarity
        user1_categories = set(user1_preferences.get("preferred_categories", {}).keys())
        user2_categories = set(user2_preferences.get("preferred_categories", {}).keys())
        
        if user1_categories and user2_categories:
            category_overlap = len(user1_categories & user2_categories)
            category_union = len(user1_categories | user2_categories)
            similarity += (category_overlap / category_union) * 0.6
        
        # Price range similarity
        user1_price = user1_preferences.get("price_range", {}).get("avg")
        user2_price = user2_preferences.get("price_range", {}).get("avg")
        
        if user1_price and user2_price:
            price_diff = abs(user1_price - user2_price)
            max_price = max(user1_price, user2_price)
            price_similarity = max(0, 1 - (price_diff / max_price))
            similarity += price_similarity * 0.4
        
        return similarity
    
    async def _combine_recommendations(
        self,
        collaborative_recs: List[Tuple[Experience, float]],
        content_recs: List[Tuple[Experience, float]],
        preferences: Dict[str, Any],
        params: RecommendationParams
    ) -> List[RecommendationResult]:
        """Combine and re-score recommendations from different methods"""
        # Create a dictionary to combine scores
        combined_scores = {}
        
        # Add collaborative filtering recommendations
        for exp, score in collaborative_recs:
            combined_scores[exp.id] = {
                "experience": exp,
                "collaborative_score": score,
                "content_score": 0.0
            }
        
        # Add content-based recommendations
        for exp, score in content_recs:
            if exp.id in combined_scores:
                combined_scores[exp.id]["content_score"] = score
            else:
                combined_scores[exp.id] = {
                    "experience": exp,
                    "collaborative_score": 0.0,
                    "content_score": score
                }
        
        # Calculate final scores and create recommendation results
        recommendations = []
        for exp_id, scores in combined_scores.items():
            exp = scores["experience"]
            
            # Weighted combination of scores
            final_score = (
                scores["collaborative_score"] * 0.6 +
                scores["content_score"] * 0.4
            )
            
            # Calculate confidence based on data availability
            confidence = self._calculate_confidence(
                scores["collaborative_score"],
                scores["content_score"],
                preferences
            )
            
            recommendations.append(RecommendationResult(
                experience=exp,
                recommendation_score=final_score,
                confidence_score=confidence,
                recommendation_reason=self._generate_recommendation_reason(exp, preferences)
            ))
        
        # Sort by final score
        return sorted(recommendations, key=lambda x: x.recommendation_score, reverse=True)
    
    def _calculate_confidence(
        self,
        collaborative_score: float,
        content_score: float,
        preferences: Dict[str, Any]
    ) -> float:
        """Calculate confidence score for recommendation"""
        confidence = 0.5  # Base confidence
        
        # Higher confidence if both methods agree
        if collaborative_score > 0 and content_score > 0:
            confidence += 0.3
        
        # Higher confidence if user has strong preferences
        if preferences.get("booking_frequency", 0) > 3:
            confidence += 0.2
        
        return min(confidence, 1.0)
    
    def _generate_recommendation_reason(
        self,
        experience: Experience,
        preferences: Dict[str, Any]
    ) -> str:
        """Generate human-readable recommendation reason"""
        reasons = []
        
        preferred_categories = preferences.get("preferred_categories", {})
        if experience.category.value in preferred_categories:
            reasons.append(f"matches your interest in {experience.category.value.replace('_', ' ')}")
        
        if experience.average_rating and experience.average_rating >= 4.5:
            reasons.append("highly rated by other travelers")
        
        price_range = preferences.get("price_range", {})
        if price_range.get("avg"):
            exp_price = float(experience.base_price)
            avg_price = price_range["avg"]
            if abs(exp_price - avg_price) / avg_price <= 0.3:
                reasons.append("within your preferred price range")
        
        if not reasons:
            reasons.append("popular among similar travelers")
        
        return f"Recommended because it {' and '.join(reasons)}"
    
    async def _filter_booked_experiences(
        self,
        recommendations: List[RecommendationResult],
        user_id: UUID
    ) -> List[RecommendationResult]:
        """Filter out experiences the user has already booked"""
        # Get user's booked experience IDs
        booked_query = await self.db.execute(
            select(ExperienceBooking.experience_id)
            .where(ExperienceBooking.user_id == user_id)
        )
        booked_ids = set(booked_query.scalars().all())
        
        # Filter recommendations
        return [
            rec for rec in recommendations
            if rec.experience.id not in booked_ids
        ]