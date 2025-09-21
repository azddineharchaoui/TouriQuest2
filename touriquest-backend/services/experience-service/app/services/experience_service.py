"""
Core experience service for business logic
"""

from typing import List, Optional, Dict, Any, Tuple
from uuid import UUID
from datetime import date, datetime, timedelta
from decimal import Decimal
import math
import asyncio
from collections import defaultdict

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc, asc, text, update, delete
from sqlalchemy.orm import selectinload

from app.models import (
    Experience, ExperienceSchedule, Provider, ExperienceReview,
    ExperienceBooking, UserInteraction, ExperienceImage,
    ExperienceCategory, SkillLevel, WeatherDependency
)
from app.schemas import (
    SearchFilters, PaginationParams, LocationPoint,
    SearchAggregations, ExperienceCreate, ExperienceUpdate
)
from app.core.config import settings


class ExperienceService:
    """Service class for experience-related operations"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def search_experiences(
        self,
        filters: SearchFilters,
        pagination: PaginationParams,
        sort_by: str = "relevance",
        sort_order: str = "asc"
    ) -> Tuple[List[Tuple], int, SearchAggregations]:
        """
        Search experiences with advanced filtering
        
        Returns:
            - List of tuples: (experience, distance, next_date, lowest_price, weather_risk)
            - Total count
            - Search aggregations
        """
        # Base query
        query = select(Experience).where(
            and_(
                Experience.is_active == True,
                Experience.is_published == True
            )
        )
        
        # Apply filters
        query = await self._apply_search_filters(query, filters)
        
        # Get total count for pagination
        count_query = select(func.count()).select_from(query.subquery())
        total_count = (await self.db.execute(count_query)).scalar()
        
        # Apply sorting
        query = self._apply_sorting(query, sort_by, sort_order)
        
        # Apply pagination
        offset = (pagination.page - 1) * pagination.size
        query = query.offset(offset).limit(pagination.size)
        
        # Execute query with relationships
        query = query.options(
            selectinload(Experience.provider),
            selectinload(Experience.images),
            selectinload(Experience.schedules)
        )
        
        result = await self.db.execute(query)
        experiences = result.scalars().all()
        
        # Enhance results with computed fields
        enhanced_results = []
        for exp in experiences:
            # Calculate distance if location provided
            distance = None
            if filters.location and exp.meeting_point_latitude and exp.meeting_point_longitude:
                distance = self._calculate_distance(
                    filters.location.latitude, filters.location.longitude,
                    exp.meeting_point_latitude, exp.meeting_point_longitude
                )
            
            # Get next available date
            next_date = await self._get_next_available_date(exp.id, filters.date_from)
            
            # Get lowest price in date range
            lowest_price = await self._get_lowest_price(exp.id, filters.date_from, filters.date_to)
            
            # Calculate weather risk for outdoor experiences
            weather_risk = await self._calculate_weather_risk(exp)
            
            enhanced_results.append((exp, distance, next_date, lowest_price, weather_risk))
        
        # Calculate aggregations
        aggregations = await self._calculate_search_aggregations(filters)
        
        return enhanced_results, total_count, aggregations
    
    async def _apply_search_filters(self, query, filters: SearchFilters):
        """Apply search filters to query"""
        
        # Text search
        if filters.query:
            search_terms = filters.query.lower().split()
            text_conditions = []
            for term in search_terms:
                text_conditions.append(
                    or_(
                        func.lower(Experience.title).contains(term),
                        func.lower(Experience.description).contains(term),
                        func.lower(Experience.short_description).contains(term),
                        func.lower(Experience.subcategory).contains(term)
                    )
                )
            query = query.where(and_(*text_conditions))
        
        # Category filter
        if filters.category:
            query = query.where(Experience.category == filters.category)
        
        # Location filter
        if filters.location and filters.location.latitude and filters.location.longitude:
            # Simple bounding box calculation - in production use PostGIS
            lat_range = filters.radius_km / 111  # Rough conversion
            lng_range = filters.radius_km / (111 * math.cos(math.radians(filters.location.latitude)))
            
            query = query.where(
                and_(
                    Experience.meeting_point_latitude.between(
                        filters.location.latitude - lat_range,
                        filters.location.latitude + lat_range
                    ),
                    Experience.meeting_point_longitude.between(
                        filters.location.longitude - lng_range,
                        filters.location.longitude + lng_range
                    )
                )
            )
        
        # Date filters
        if filters.date_from or filters.date_to:
            # Subquery for experiences with available schedules in date range
            schedule_subquery = select(ExperienceSchedule.experience_id).where(
                ExperienceSchedule.is_available == True
            )
            
            if filters.date_from:
                schedule_subquery = schedule_subquery.where(
                    ExperienceSchedule.date >= filters.date_from
                )
            
            if filters.date_to:
                schedule_subquery = schedule_subquery.where(
                    ExperienceSchedule.date <= filters.date_to
                )
            
            query = query.where(Experience.id.in_(schedule_subquery))
        
        # Price filters
        if filters.min_price is not None:
            query = query.where(Experience.base_price >= filters.min_price)
        
        if filters.max_price is not None:
            query = query.where(Experience.base_price <= filters.max_price)
        
        # Skill level filter
        if filters.skill_level:
            query = query.where(
                or_(
                    Experience.skill_level == filters.skill_level,
                    Experience.skill_level == SkillLevel.ALL_LEVELS
                )
            )
        
        # Rating filter
        if filters.min_rating is not None:
            query = query.where(Experience.average_rating >= filters.min_rating)
        
        # Group size filter
        if filters.group_size:
            query = query.where(Experience.max_group_size >= filters.group_size)
        
        # Language filter
        if filters.languages:
            language_conditions = []
            for lang in filters.languages:
                language_conditions.append(
                    Experience.languages_offered.contains([lang])
                )
            query = query.where(or_(*language_conditions))
        
        # Feature filters
        if filters.instant_book is True:
            query = query.where(Experience.instant_book == True)
        
        if filters.weather_independent is True:
            query = query.where(Experience.weather_dependency == WeatherDependency.NONE)
        
        if filters.accessibility_required is True:
            query = query.where(Experience.accessibility_features.isnot(None))
        
        return query
    
    def _apply_sorting(self, query, sort_by: str, sort_order: str):
        """Apply sorting to query"""
        order_func = desc if sort_order == "desc" else asc
        
        if sort_by == "price":
            query = query.order_by(order_func(Experience.base_price))
        elif sort_by == "rating":
            query = query.order_by(order_func(Experience.average_rating))
        elif sort_by == "popularity":
            # Sort by popularity score (combination of bookings and ratings)
            query = query.order_by(order_func(Experience.popularity_score))
        elif sort_by == "date_created":
            query = query.order_by(order_func(Experience.created_at))
        else:  # relevance or default
            # Sort by popularity score by default
            query = query.order_by(desc(Experience.popularity_score))
        
        return query
    
    async def _get_next_available_date(self, experience_id: UUID, from_date: Optional[date] = None) -> Optional[date]:
        """Get next available date for experience"""
        if not from_date:
            from_date = date.today()
        
        query = select(ExperienceSchedule.date).where(
            and_(
                ExperienceSchedule.experience_id == experience_id,
                ExperienceSchedule.date >= from_date,
                ExperienceSchedule.is_available == True,
                ExperienceSchedule.available_spots > 0
            )
        ).order_by(ExperienceSchedule.date).limit(1)
        
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def _get_lowest_price(
        self, 
        experience_id: UUID, 
        from_date: Optional[date] = None, 
        to_date: Optional[date] = None
    ) -> Optional[float]:
        """Get lowest price for experience in date range"""
        # Get base price first
        exp_query = select(Experience.base_price).where(Experience.id == experience_id)
        base_price = (await self.db.execute(exp_query)).scalar_one_or_none()
        
        if not base_price:
            return None
        
        # Check for schedule price overrides
        schedule_query = select(func.min(ExperienceSchedule.price_override)).where(
            and_(
                ExperienceSchedule.experience_id == experience_id,
                ExperienceSchedule.price_override.isnot(None),
                ExperienceSchedule.is_available == True
            )
        )
        
        if from_date:
            schedule_query = schedule_query.where(ExperienceSchedule.date >= from_date)
        
        if to_date:
            schedule_query = schedule_query.where(ExperienceSchedule.date <= to_date)
        
        min_override = (await self.db.execute(schedule_query)).scalar_one_or_none()
        
        if min_override and min_override < base_price:
            return float(min_override)
        
        return float(base_price)
    
    async def _calculate_weather_risk(self, experience: Experience) -> Optional[str]:
        """Calculate weather risk for outdoor experiences"""
        if experience.weather_dependency == WeatherDependency.NONE:
            return None
        
        # This would integrate with weather service for actual risk calculation
        # For now, return based on dependency level
        if experience.weather_dependency == WeatherDependency.HIGH:
            return "high"
        elif experience.weather_dependency == WeatherDependency.MODERATE:
            return "moderate"
        else:
            return "low"
    
    def _calculate_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate distance between two points using Haversine formula"""
        # Convert to radians
        lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
        
        # Haversine formula
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        
        # Earth radius in kilometers
        r = 6371
        
        return c * r
    
    async def _calculate_search_aggregations(self, filters: SearchFilters) -> SearchAggregations:
        """Calculate search result aggregations"""
        # Price range aggregation
        price_query = await self.db.execute(
            select(
                func.min(Experience.base_price).label('min_price'),
                func.max(Experience.base_price).label('max_price'),
                func.avg(Experience.base_price).label('avg_price')
            ).where(
                and_(
                    Experience.is_active == True,
                    Experience.is_published == True
                )
            )
        )
        price_stats = price_query.first()
        
        # Category distribution
        category_query = await self.db.execute(
            select(
                Experience.category,
                func.count(Experience.id).label('count')
            ).where(
                and_(
                    Experience.is_active == True,
                    Experience.is_published == True
                )
            ).group_by(Experience.category)
        )
        categories = category_query.all()
        
        # Rating distribution
        rating_query = await self.db.execute(
            select(
                func.count(Experience.id).label('total'),
                func.sum(func.case((Experience.average_rating >= 4.5, 1), else_=0)).label('excellent'),
                func.sum(func.case((Experience.average_rating >= 4.0, 1), else_=0)).label('very_good'),
                func.sum(func.case((Experience.average_rating >= 3.0, 1), else_=0)).label('good')
            ).where(
                and_(
                    Experience.is_active == True,
                    Experience.is_published == True
                )
            )
        )
        rating_stats = rating_query.first()
        
        return SearchAggregations(
            price_range={
                "min": float(price_stats.min_price) if price_stats.min_price else 0,
                "max": float(price_stats.max_price) if price_stats.max_price else 0,
                "avg": float(price_stats.avg_price) if price_stats.avg_price else 0
            },
            category_counts={cat.category.value: cat.count for cat in categories},
            rating_distribution={
                "excellent": rating_stats.excellent or 0,
                "very_good": rating_stats.very_good or 0,
                "good": rating_stats.good or 0,
                "total": rating_stats.total or 0
            }
        )
    
    async def get_trending_experiences(
        self,
        category: Optional[ExperienceCategory] = None,
        location: Optional[LocationPoint] = None,
        radius_km: float = 50.0,
        limit: int = 20,
        days_back: int = 7
    ) -> List[Experience]:
        """Get trending experiences based on recent booking activity"""
        cutoff_date = datetime.utcnow() - timedelta(days=days_back)
        
        # Subquery for recent booking counts
        booking_subquery = (
            select(
                ExperienceBooking.experience_id,
                func.count(ExperienceBooking.id).label('recent_bookings')
            )
            .where(ExperienceBooking.created_at >= cutoff_date)
            .group_by(ExperienceBooking.experience_id)
            .subquery()
        )
        
        # Main query
        query = (
            select(Experience)
            .join(booking_subquery, Experience.id == booking_subquery.c.experience_id)
            .where(
                and_(
                    Experience.is_active == True,
                    Experience.is_published == True
                )
            )
            .order_by(desc(booking_subquery.c.recent_bookings))
            .limit(limit)
        )
        
        # Apply filters
        if category:
            query = query.where(Experience.category == category)
        
        if location and location.latitude and location.longitude:
            lat_range = radius_km / 111
            lng_range = radius_km / (111 * math.cos(math.radians(location.latitude)))
            
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
        
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def track_experience_view(self, experience_id: UUID, user_id: Optional[UUID] = None):
        """Track experience view for analytics"""
        # Update view count
        await self.db.execute(
            update(Experience)
            .where(Experience.id == experience_id)
            .values(total_views=Experience.total_views + 1)
        )
        
        # Track user interaction if user_id provided
        if user_id:
            await self.track_user_interaction(
                experience_id=experience_id,
                user_id=user_id,
                interaction_type="view"
            )
    
    async def track_user_interaction(
        self,
        experience_id: UUID,
        user_id: Optional[UUID],
        interaction_type: str,
        interaction_data: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Track user interaction with experience"""
        try:
            # Verify experience exists
            exp_query = await self.db.execute(
                select(Experience.id).where(Experience.id == experience_id)
            )
            if not exp_query.scalar_one_or_none():
                return False
            
            # Create interaction record
            interaction = UserInteraction(
                user_id=user_id,
                experience_id=experience_id,
                interaction_type=interaction_type,
                interaction_data=interaction_data or {},
                created_at=datetime.utcnow()
            )
            
            self.db.add(interaction)
            await self.db.commit()
            
            return True
        except Exception:
            await self.db.rollback()
            return False