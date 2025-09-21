"""
Experience discovery and search API endpoints
"""

from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import date, datetime, timedelta
from decimal import Decimal
import math

from fastapi import APIRouter, Depends, HTTPException, status, Query, Path
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc, asc, text
from sqlalchemy.orm import selectinload

from app.db.database import get_db
from app.models import (
    Experience, ExperienceSchedule, Provider, ExperienceReview,
    ExperienceCategory, SkillLevel, WeatherDependency
)
from app.schemas import (
    ExperienceSearchResponse, ExperienceSearchResult, SearchFilters,
    PaginationParams, LocationPoint, CategoryInfo, Experience as ExperienceSchema,
    RecommendationParams, RecommendationResult, SuccessResponse
)
from app.services.experience_service import ExperienceService
from app.services.recommendation_service import RecommendationService
from app.services.weather_service import WeatherService
from app.core.config import settings

router = APIRouter()


# Experience search and discovery
@router.get("/search", response_model=ExperienceSearchResponse)
async def search_experiences(
    # Search parameters
    query: Optional[str] = Query(None, description="Search query for experiences"),
    category: Optional[ExperienceCategory] = Query(None, description="Experience category"),
    
    # Location parameters
    latitude: Optional[float] = Query(None, ge=-90, le=90, description="Search center latitude"),
    longitude: Optional[float] = Query(None, ge=-180, le=180, description="Search center longitude"),
    radius_km: Optional[float] = Query(25.0, ge=1, le=100, description="Search radius in kilometers"),
    
    # Date and time parameters
    date_from: Optional[date] = Query(None, description="Earliest experience date"),
    date_to: Optional[date] = Query(None, description="Latest experience date"),
    
    # Pricing parameters
    min_price: Optional[float] = Query(None, ge=0, description="Minimum price filter"),
    max_price: Optional[float] = Query(None, ge=0, description="Maximum price filter"),
    currency: str = Query("USD", description="Currency for price filtering"),
    
    # Experience parameters
    skill_level: Optional[SkillLevel] = Query(None, description="Required skill level"),
    min_rating: Optional[float] = Query(None, ge=0, le=5, description="Minimum average rating"),
    group_size: Optional[int] = Query(None, ge=1, description="Required group size"),
    
    # Feature filters
    languages: Optional[str] = Query(None, description="Comma-separated list of languages"),
    instant_book: Optional[bool] = Query(None, description="Instant booking available"),
    weather_independent: Optional[bool] = Query(None, description="Weather independent experiences"),
    accessibility_required: Optional[bool] = Query(None, description="Accessibility features required"),
    private_group_available: Optional[bool] = Query(None, description="Private group booking available"),
    
    # Sorting and pagination
    sort_by: str = Query("relevance", description="Sort by: relevance, price, rating, distance, date"),
    sort_order: str = Query("asc", description="Sort order: asc, desc"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    
    # Dependencies
    db: AsyncSession = Depends(get_db),
):
    """
    Search experiences with advanced filtering and sorting
    """
    # Parse languages
    language_list = []
    if languages:
        language_list = [lang.strip() for lang in languages.split(",")]
    
    # Create location point
    location = None
    if latitude is not None and longitude is not None:
        location = LocationPoint(latitude=latitude, longitude=longitude)
    
    # Create search filters
    filters = SearchFilters(
        query=query,
        category=category,
        location=location,
        radius_km=radius_km,
        date_from=date_from,
        date_to=date_to,
        min_price=min_price,
        max_price=max_price,
        skill_level=skill_level,
        min_rating=min_rating,
        group_size=group_size,
        languages=language_list,
        instant_book=instant_book,
        weather_independent=weather_independent,
        accessibility_required=accessibility_required
    )
    
    # Create pagination params
    pagination = PaginationParams(page=page, size=size)
    
    # Use experience service for search
    experience_service = ExperienceService(db)
    
    results, total_count, aggregations = await experience_service.search_experiences(
        filters=filters,
        pagination=pagination,
        sort_by=sort_by,
        sort_order=sort_order
    )
    
    # Convert to search results
    search_results = []
    for exp, distance, next_date, lowest_price, weather_risk in results:
        search_results.append(ExperienceSearchResult(
            experience=exp,
            distance_km=distance,
            relevance_score=exp.popularity_score,
            next_available_date=next_date,
            lowest_price=lowest_price,
            weather_risk=weather_risk
        ))
    
    return ExperienceSearchResponse(
        results=search_results,
        total_count=total_count,
        page=page,
        size=size,
        filters_applied=filters,
        aggregations=aggregations
    )


@router.get("/categories", response_model=List[CategoryInfo])
async def get_experience_categories(
    include_counts: bool = Query(True, description="Include experience counts"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all experience categories with metadata
    """
    categories = []
    
    for category in ExperienceCategory:
        category_info = {
            "category": category,
            "name": category.value.replace("_", " ").title(),
            "description": _get_category_description(category),
            "icon": _get_category_icon(category),
            "experience_count": 0,
            "average_price": None,
            "popular_subcategories": []
        }
        
        if include_counts:
            # Get experience count
            count_query = await db.execute(
                select(func.count(Experience.id))
                .where(
                    and_(
                        Experience.category == category,
                        Experience.is_active == True,
                        Experience.is_published == True
                    )
                )
            )
            category_info["experience_count"] = count_query.scalar() or 0
            
            # Get average price
            price_query = await db.execute(
                select(func.avg(Experience.base_price))
                .where(
                    and_(
                        Experience.category == category,
                        Experience.is_active == True,
                        Experience.is_published == True
                    )
                )
            )
            avg_price = price_query.scalar()
            if avg_price:
                category_info["average_price"] = float(avg_price)
            
            # Get popular subcategories
            subcat_query = await db.execute(
                select(Experience.subcategory, func.count(Experience.id).label('count'))
                .where(
                    and_(
                        Experience.category == category,
                        Experience.subcategory.isnot(None),
                        Experience.is_active == True,
                        Experience.is_published == True
                    )
                )
                .group_by(Experience.subcategory)
                .order_by(desc('count'))
                .limit(5)
            )
            subcategories = subcat_query.all()
            category_info["popular_subcategories"] = [subcat[0] for subcat in subcategories]
        
        categories.append(CategoryInfo(**category_info))
    
    return categories


@router.get("/{experience_id}", response_model=ExperienceSchema)
async def get_experience_details(
    experience_id: UUID = Path(..., description="Experience unique identifier"),
    include_schedules: bool = Query(False, description="Include available schedules"),
    include_reviews: bool = Query(False, description="Include reviews"),
    user_id: Optional[UUID] = Query(None, description="User ID for personalization"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get detailed experience information
    """
    # Build query with optional includes
    query = select(Experience).where(Experience.id == experience_id)
    
    # Always include provider and images
    query = query.options(
        selectinload(Experience.provider),
        selectinload(Experience.images),
        selectinload(Experience.inclusions),
        selectinload(Experience.requirements)
    )
    
    if include_schedules:
        query = query.options(selectinload(Experience.schedules))
    
    if include_reviews:
        query = query.options(selectinload(Experience.reviews))
    
    result = await db.execute(query)
    experience = result.scalar_one_or_none()
    
    if not experience:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Experience not found"
        )
    
    # Check if experience is accessible
    if not experience.is_published and not experience.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Experience not available"
        )
    
    # Track view for analytics (if user_id provided)
    if user_id:
        experience_service = ExperienceService(db)
        await experience_service.track_experience_view(experience_id, user_id)
    
    return experience


@router.get("/{experience_id}/similar", response_model=List[ExperienceSchema])
async def get_similar_experiences(
    experience_id: UUID = Path(..., description="Experience unique identifier"),
    limit: int = Query(10, ge=1, le=50, description="Number of similar experiences"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get experiences similar to the specified experience
    """
    recommendation_service = RecommendationService(db)
    
    similar_experiences = await recommendation_service.get_similar_experiences(
        experience_id=experience_id,
        limit=limit
    )
    
    return similar_experiences


@router.get("/{experience_id}/availability")
async def get_experience_availability(
    experience_id: UUID = Path(..., description="Experience unique identifier"),
    date_from: Optional[date] = Query(None, description="Start date for availability check"),
    date_to: Optional[date] = Query(None, description="End date for availability check"),
    group_size: int = Query(1, ge=1, description="Required group size"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get experience availability for specified date range
    """
    # Default date range to next 30 days
    if not date_from:
        date_from = date.today()
    if not date_to:
        date_to = date_from + timedelta(days=30)
    
    # Validate date range
    if date_to < date_from:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End date must be after start date"
        )
    
    if (date_to - date_from).days > 365:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Date range cannot exceed 365 days"
        )
    
    # Get available schedules
    schedules_query = await db.execute(
        select(ExperienceSchedule)
        .where(
            and_(
                ExperienceSchedule.experience_id == experience_id,
                ExperienceSchedule.date >= date_from,
                ExperienceSchedule.date <= date_to,
                ExperienceSchedule.is_available == True,
                ExperienceSchedule.available_spots >= group_size
            )
        )
        .order_by(ExperienceSchedule.date, ExperienceSchedule.start_time)
    )
    schedules = schedules_query.scalars().all()
    
    # Get weather information for outdoor experiences
    experience_query = await db.execute(
        select(Experience).where(Experience.id == experience_id)
    )
    experience = experience_query.scalar_one_or_none()
    
    if not experience:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Experience not found"
        )
    
    # Add weather information for outdoor experiences
    weather_service = WeatherService()
    availability_data = []
    
    for schedule in schedules:
        schedule_data = {
            "schedule_id": schedule.id,
            "date": schedule.date,
            "start_time": schedule.start_time,
            "end_time": schedule.end_time,
            "available_spots": schedule.available_spots,
            "price": float(schedule.price_override or experience.base_price),
            "currency": experience.currency,
            "is_private": schedule.is_private,
            "public_notes": schedule.public_notes,
            "weather_status": schedule.weather_status
        }
        
        # Add weather forecast for outdoor experiences
        if (experience.weather_dependency != WeatherDependency.NONE and 
            experience.meeting_point_latitude and experience.meeting_point_longitude):
            
            weather_info = await weather_service.get_weather_forecast(
                latitude=experience.meeting_point_latitude,
                longitude=experience.meeting_point_longitude,
                date=schedule.date
            )
            
            if weather_info:
                schedule_data["weather"] = weather_info
        
        availability_data.append(schedule_data)
    
    return {
        "experience_id": experience_id,
        "date_from": date_from,
        "date_to": date_to,
        "group_size": group_size,
        "total_available_slots": len(availability_data),
        "availability": availability_data
    }


@router.get("/recommendations/personalized", response_model=List[RecommendationResult])
async def get_personalized_recommendations(
    user_id: UUID = Query(..., description="User ID for personalization"),
    latitude: Optional[float] = Query(None, ge=-90, le=90, description="User's current latitude"),
    longitude: Optional[float] = Query(None, ge=-180, le=180, description="User's current longitude"),
    category: Optional[ExperienceCategory] = Query(None, description="Preferred category"),
    limit: int = Query(10, ge=1, le=50, description="Number of recommendations"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get personalized experience recommendations for a user
    """
    location = None
    if latitude is not None and longitude is not None:
        location = LocationPoint(latitude=latitude, longitude=longitude)
    
    params = RecommendationParams(
        user_id=user_id,
        location=location,
        limit=limit,
        recommendation_type="personalized"
    )
    
    recommendation_service = RecommendationService(db)
    recommendations = await recommendation_service.get_personalized_recommendations(params)
    
    return recommendations


@router.get("/recommendations/trending", response_model=List[ExperienceSchema])
async def get_trending_experiences(
    category: Optional[ExperienceCategory] = Query(None, description="Filter by category"),
    location: Optional[LocationPoint] = Query(None, description="Filter by location"),
    radius_km: float = Query(50.0, ge=1, le=100, description="Search radius in kilometers"),
    limit: int = Query(20, ge=1, le=100, description="Number of trending experiences"),
    days_back: int = Query(7, ge=1, le=30, description="Days to look back for trending calculation"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get currently trending experiences
    """
    experience_service = ExperienceService(db)
    
    trending_experiences = await experience_service.get_trending_experiences(
        category=category,
        location=location,
        radius_km=radius_km,
        limit=limit,
        days_back=days_back
    )
    
    return trending_experiences


@router.get("/recommendations/popular", response_model=List[ExperienceSchema])
async def get_popular_experiences(
    category: Optional[ExperienceCategory] = Query(None, description="Filter by category"),
    time_period: str = Query("month", description="Time period: week, month, quarter, year"),
    location: Optional[LocationPoint] = Query(None, description="Filter by location"),
    radius_km: float = Query(50.0, ge=1, le=100, description="Search radius in kilometers"),
    limit: int = Query(20, ge=1, le=100, description="Number of popular experiences"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get most popular experiences by booking volume and ratings
    """
    # Calculate time period
    period_days = {
        "week": 7,
        "month": 30,
        "quarter": 90,
        "year": 365
    }.get(time_period, 30)
    
    cutoff_date = datetime.utcnow() - timedelta(days=period_days)
    
    # Build query for popular experiences
    query = select(Experience).where(
        and_(
            Experience.is_active == True,
            Experience.is_published == True,
            Experience.total_bookings > 0
        )
    )
    
    if category:
        query = query.where(Experience.category == category)
    
    # Add location filter if provided
    if location and location.latitude and location.longitude:
        # Simplified distance calculation - in production use PostGIS
        lat_range = radius_km / 111  # Rough conversion
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
    
    # Order by popularity (combination of bookings, ratings, and reviews)
    query = query.order_by(
        desc(Experience.average_rating * Experience.total_reviews + Experience.total_bookings),
        desc(Experience.average_rating),
        desc(Experience.total_bookings)
    ).limit(limit)
    
    result = await db.execute(query)
    experiences = result.scalars().all()
    
    return experiences


@router.post("/{experience_id}/track-interaction")
async def track_experience_interaction(
    experience_id: UUID = Path(..., description="Experience unique identifier"),
    user_id: Optional[UUID] = Query(None, description="User ID"),
    interaction_type: str = Query(..., description="Interaction type: view, favorite, share, etc."),
    interaction_data: Optional[Dict[str, Any]] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Track user interaction with an experience for analytics and recommendations
    """
    experience_service = ExperienceService(db)
    
    success = await experience_service.track_user_interaction(
        experience_id=experience_id,
        user_id=user_id,
        interaction_type=interaction_type,
        interaction_data=interaction_data or {}
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Experience not found"
        )
    
    return SuccessResponse(
        success=True,
        message="Interaction tracked successfully"
    )


# Helper functions
def _get_category_description(category: ExperienceCategory) -> str:
    """Get description for experience category"""
    descriptions = {
        ExperienceCategory.CULTURAL_WORKSHOPS: "Immersive cultural experiences and traditional workshops",
        ExperienceCategory.FOOD_CULINARY: "Culinary tours, cooking classes, and food experiences",
        ExperienceCategory.ADVENTURE_OUTDOOR: "Outdoor adventures and adrenaline-filled activities",
        ExperienceCategory.PHOTOGRAPHY: "Photography tours and workshops for all skill levels",
        ExperienceCategory.WELLNESS_SPA: "Wellness retreats, spa experiences, and mindfulness activities",
        ExperienceCategory.PRIVATE_GUIDES: "Personal guided tours and customized experiences"
    }
    return descriptions.get(category, "")


def _get_category_icon(category: ExperienceCategory) -> str:
    """Get icon name for experience category"""
    icons = {
        ExperienceCategory.CULTURAL_WORKSHOPS: "cultural",
        ExperienceCategory.FOOD_CULINARY: "restaurant",
        ExperienceCategory.ADVENTURE_OUTDOOR: "hiking",
        ExperienceCategory.PHOTOGRAPHY: "camera",
        ExperienceCategory.WELLNESS_SPA: "spa",
        ExperienceCategory.PRIVATE_GUIDES: "guide"
    }
    return icons.get(category, "experience")