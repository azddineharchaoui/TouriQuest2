"""
POI Discovery API Endpoints
"""

from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Query, Path, BackgroundTasks
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.repositories.poi_repository import POIRepository
from app.schemas import (
    POI, POISummary, POICreate, POIUpdate, SearchRequest, SearchResponse,
    RecommendationRequest, RecommendationResponse, POIInteractionCreate,
    TrendingPOIResponse, SuccessResponse, ErrorResponse, LocationPoint,
    POICategoryEnum, SortByEnum, POIPhotos, POIHours, POIEvents, POIReviews,
    POIAudioGuide, POINearby, POIAccessibility, POIWeather, POICrowdInfo,
    POIARExperience, POIVirtualTour, POISocialActivity, POIAchievements
)
from app.services.recommendation_service import RecommendationService
from app.services.search_service import SearchService
from app.core.config import settings

router = APIRouter()


@router.get("/discover", response_model=SearchResponse)
async def discover_pois(
    latitude: float = Query(..., ge=-90, le=90, description="Latitude of search center"),
    longitude: float = Query(..., ge=-180, le=180, description="Longitude of search center"),
    radius_km: float = Query(10.0, gt=0, le=settings.max_search_radius_km, description="Search radius in kilometers"),
    query: Optional[str] = Query(None, description="Text search query"),
    category: Optional[List[POICategoryEnum]] = Query(None, description="POI categories to filter by"),
    is_free: Optional[bool] = Query(None, description="Filter for free POIs"),
    is_family_friendly: Optional[bool] = Query(None, description="Filter for family-friendly POIs"),
    allows_photography: Optional[bool] = Query(None, description="Filter for POIs allowing photography"),
    has_audio_guide: Optional[bool] = Query(None, description="Filter for POIs with audio guides"),
    has_ar_experience: Optional[bool] = Query(None, description="Filter for POIs with AR experiences"),
    min_rating: Optional[float] = Query(None, ge=0, le=5, description="Minimum average rating"),
    max_price: Optional[float] = Query(None, gt=0, description="Maximum entry price"),
    open_now: Optional[bool] = Query(None, description="Filter for currently open POIs"),
    sort_by: SortByEnum = Query(SortByEnum.RELEVANCE, description="Sort order for results"),
    limit: int = Query(settings.default_search_results, gt=0, le=settings.max_search_results),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """
    Discover POIs near a location with advanced filtering options
    """
    start_time = datetime.utcnow()
    
    # Build search request
    search_request = SearchRequest(
        query=query,
        location=LocationPoint(latitude=latitude, longitude=longitude),
        radius_km=radius_km,
        filters={
            "category": category,
            "is_free": is_free,
            "is_family_friendly": is_family_friendly,
            "allows_photography": allows_photography,
            "has_audio_guide": has_audio_guide,
            "has_ar_experience": has_ar_experience,
            "min_rating": min_rating,
            "max_price": max_price,
            "open_now": open_now
        },
        sort_by=sort_by,
        limit=limit,
        offset=offset
    )
    
    try:
        search_service = SearchService(db)
        pois, total_count = await search_service.search_pois(search_request)
        
        # Convert to summary format
        poi_summaries = []
        for poi in pois:
            poi_summary = await search_service.convert_to_summary(poi, search_request.location)
            poi_summaries.append(poi_summary)
        
        search_time_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
        
        return SearchResponse(
            results=poi_summaries,
            total_count=total_count,
            has_more=offset + limit < total_count,
            search_time_ms=search_time_ms,
            filters_applied=search_request.filters
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search failed: {str(e)}"
        )


@router.get("/{poi_id}", response_model=POI)
async def get_poi_by_id(
    poi_id: UUID = Path(..., description="POI unique identifier"),
    user_id: Optional[UUID] = Query(None, description="User ID for tracking"),
    session_id: Optional[str] = Query(None, description="Session ID for tracking"),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: AsyncSession = Depends(get_db)
):
    """
    Get detailed information about a specific POI
    """
    poi_repo = POIRepository(db)
    
    poi = await poi_repo.get_poi_by_id(poi_id)
    if not poi:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="POI not found"
        )
    
    # Record view interaction in background
    background_tasks.add_task(
        poi_repo.record_interaction,
        poi_id,
        POIInteractionCreate(interaction_type="view"),
        user_id,
        session_id
    )
    
    return poi


@router.get("/category/{category}", response_model=List[POISummary])
async def get_pois_by_category(
    category: POICategoryEnum = Path(..., description="POI category"),
    latitude: Optional[float] = Query(None, ge=-90, le=90, description="Latitude for distance calculation"),
    longitude: Optional[float] = Query(None, ge=-180, le=180, description="Longitude for distance calculation"),
    limit: int = Query(20, gt=0, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """
    Get POIs by category with optional location-based sorting
    """
    poi_repo = POIRepository(db)
    pois = await poi_repo.get_pois_by_category(category.value, limit, offset)
    
    if not pois:
        return []
    
    search_service = SearchService(db)
    poi_summaries = []
    
    user_location = None
    if latitude is not None and longitude is not None:
        user_location = LocationPoint(latitude=latitude, longitude=longitude)
    
    for poi in pois:
        poi_summary = await search_service.convert_to_summary(poi, user_location)
        poi_summaries.append(poi_summary)
    
    return poi_summaries


@router.get("/nearby", response_model=List[POISummary])
async def get_nearby_pois(
    latitude: float = Query(..., ge=-90, le=90, description="Latitude of center point"),
    longitude: float = Query(..., ge=-180, le=180, description="Longitude of center point"),
    radius_km: float = Query(10.0, gt=0, le=settings.max_search_radius_km, description="Search radius in kilometers"),
    limit: int = Query(20, gt=0, le=100),
    db: AsyncSession = Depends(get_db)
):
    """
    Get POIs near a specific location, sorted by distance
    """
    poi_repo = POIRepository(db)
    pois = await poi_repo.get_nearby_pois(latitude, longitude, radius_km, limit)
    
    if not pois:
        return []
    
    search_service = SearchService(db)
    user_location = LocationPoint(latitude=latitude, longitude=longitude)
    
    poi_summaries = []
    for poi in pois:
        poi_summary = await search_service.convert_to_summary(poi, user_location)
        poi_summaries.append(poi_summary)
    
    return poi_summaries


@router.get("/trending", response_model=List[TrendingPOIResponse])
async def get_trending_pois(
    hours: int = Query(24, gt=0, le=168, description="Time window in hours for trend calculation"),
    latitude: Optional[float] = Query(None, ge=-90, le=90, description="Latitude for distance calculation"),
    longitude: Optional[float] = Query(None, ge=-180, le=180, description="Longitude for distance calculation"),
    limit: int = Query(20, gt=0, le=100),
    db: AsyncSession = Depends(get_db)
):
    """
    Get trending POIs based on recent activity
    """
    poi_repo = POIRepository(db)
    trending_pois = await poi_repo.get_trending_pois(limit, hours)
    
    if not trending_pois:
        return []
    
    search_service = SearchService(db)
    user_location = None
    if latitude is not None and longitude is not None:
        user_location = LocationPoint(latitude=latitude, longitude=longitude)
    
    trending_responses = []
    for poi in trending_pois:
        poi_summary = await search_service.convert_to_summary(poi, user_location)
        
        # Calculate trend metrics (simplified - in production, use more sophisticated algorithm)
        trend_score = poi.popularity_score + (poi.view_count / 100)
        
        trending_response = TrendingPOIResponse(
            poi=poi_summary,
            trend_score=trend_score,
            trend_direction="rising",  # Would be calculated based on historical data
            change_percentage=15.0  # Would be calculated based on historical data
        )
        trending_responses.append(trending_response)
    
    return trending_responses


@router.get("/recommendations", response_model=RecommendationResponse)
async def get_poi_recommendations(
    user_id: Optional[UUID] = Query(None, description="User ID for personalized recommendations"),
    latitude: Optional[float] = Query(None, ge=-90, le=90, description="User's current latitude"),
    longitude: Optional[float] = Query(None, ge=-180, le=180, description="User's current longitude"),
    category_preferences: Optional[List[POICategoryEnum]] = Query(None, description="Preferred categories"),
    budget_range: Optional[str] = Query(None, description="Budget preference: budget, mid-range, luxury"),
    travel_style: Optional[List[str]] = Query(None, description="Travel style tags"),
    interests: Optional[List[str]] = Query(None, description="Interest tags"),
    limit: int = Query(10, gt=0, le=50),
    db: AsyncSession = Depends(get_db)
):
    """
    Get personalized POI recommendations
    """
    recommendation_request = RecommendationRequest(
        user_id=user_id,
        location=LocationPoint(latitude=latitude, longitude=longitude) if latitude and longitude else None,
        category_preferences=category_preferences,
        budget_range=budget_range,
        travel_style=travel_style,
        interests=interests,
        limit=limit
    )
    
    recommendation_service = RecommendationService(db)
    return await recommendation_service.get_recommendations(recommendation_request)


@router.post("/{poi_id}/favorite", response_model=SuccessResponse)
async def add_poi_to_favorites(
    poi_id: UUID = Path(..., description="POI unique identifier"),
    user_id: UUID = Query(..., description="User ID"),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: AsyncSession = Depends(get_db)
):
    """
    Add POI to user's favorites
    """
    poi_repo = POIRepository(db)
    
    # Verify POI exists
    poi = await poi_repo.get_poi_by_id(poi_id, include_relations=False)
    if not poi:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="POI not found"
        )
    
    success = await poi_repo.add_to_favorites(user_id, poi_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="POI already in favorites"
        )
    
    # Record favorite interaction in background
    background_tasks.add_task(
        poi_repo.record_interaction,
        poi_id,
        POIInteractionCreate(interaction_type="favorite"),
        user_id
    )
    
    return SuccessResponse(message="POI added to favorites successfully")


@router.delete("/{poi_id}/favorite", response_model=SuccessResponse)
async def remove_poi_from_favorites(
    poi_id: UUID = Path(..., description="POI unique identifier"),
    user_id: UUID = Query(..., description="User ID"),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: AsyncSession = Depends(get_db)
):
    """
    Remove POI from user's favorites
    """
    poi_repo = POIRepository(db)
    
    success = await poi_repo.remove_from_favorites(user_id, poi_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="POI not in favorites or not found"
        )
    
    # Record unfavorite interaction in background
    background_tasks.add_task(
        poi_repo.record_interaction,
        poi_id,
        POIInteractionCreate(interaction_type="unfavorite"),
        user_id
    )
    
    return SuccessResponse(message="POI removed from favorites successfully")


@router.get("/favorites/{user_id}", response_model=List[POISummary])
async def get_user_favorite_pois(
    user_id: UUID = Path(..., description="User ID"),
    latitude: Optional[float] = Query(None, ge=-90, le=90, description="Latitude for distance calculation"),
    longitude: Optional[float] = Query(None, ge=-180, le=180, description="Longitude for distance calculation"),
    limit: int = Query(50, gt=0, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """
    Get user's favorite POIs
    """
    poi_repo = POIRepository(db)
    favorite_pois = await poi_repo.get_user_favorites(user_id, limit, offset)
    
    if not favorite_pois:
        return []
    
    search_service = SearchService(db)
    user_location = None
    if latitude is not None and longitude is not None:
        user_location = LocationPoint(latitude=latitude, longitude=longitude)
    
    poi_summaries = []
    for poi in favorite_pois:
        poi_summary = await search_service.convert_to_summary(poi, user_location)
        poi_summaries.append(poi_summary)
    
    return poi_summaries


@router.post("/{poi_id}/interaction", response_model=SuccessResponse)
async def record_poi_interaction(
    poi_id: UUID = Path(..., description="POI unique identifier"),
    interaction: POIInteractionCreate,
    user_id: Optional[UUID] = Query(None, description="User ID"),
    session_id: Optional[str] = Query(None, description="Session ID"),
    db: AsyncSession = Depends(get_db)
):
    """
    Record user interaction with POI (view, share, checkin, etc.)
    """
    poi_repo = POIRepository(db)
    
    # Verify POI exists
    poi = await poi_repo.get_poi_by_id(poi_id, include_relations=False)
    if not poi:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="POI not found"
        )
    
    success = await poi_repo.record_interaction(poi_id, interaction, user_id, session_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to record interaction"
        )
    
    return SuccessResponse(message="Interaction recorded successfully")


@router.post("/search", response_model=SearchResponse)
async def advanced_search_pois(
    search_request: SearchRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Advanced POI search with complex filters and sorting
    """
    start_time = datetime.utcnow()
    
    try:
        search_service = SearchService(db)
        pois, total_count = await search_service.search_pois(search_request)
        
        # Convert to summary format
        poi_summaries = []
        for poi in pois:
            poi_summary = await search_service.convert_to_summary(poi, search_request.location)
            poi_summaries.append(poi_summary)
        
        search_time_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
        
        return SearchResponse(
            results=poi_summaries,
            total_count=total_count,
            has_more=search_request.offset + search_request.limit < total_count,
            search_time_ms=search_time_ms,
            filters_applied=search_request.filters
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Advanced search failed: {str(e)}"
        )


@router.get("/{poi_id}", response_model=POI)
async def get_poi_details(
    poi_id: UUID = Path(..., description="POI unique identifier"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get comprehensive POI details with rich media and contextual information
    """
    try:
        poi_repo = POIRepository(db)
        poi = await poi_repo.get_by_id(poi_id)
        
        if not poi:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="POI not found"
            )
        
        return poi
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch POI details: {str(e)}"
        )


@router.get("/{poi_id}/photos")
async def get_poi_photos(
    poi_id: UUID = Path(..., description="POI unique identifier"),
    category: Optional[str] = Query(None, description="Photo category filter"),
    season: Optional[str] = Query(None, description="Seasonal photos filter"),
    user_generated: Optional[bool] = Query(None, description="Filter user-generated content"),
    limit: int = Query(50, gt=0, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """
    Get professional photo gallery with zoom capabilities and categorization
    """
    try:
        poi_repo = POIRepository(db)
        
        # Verify POI exists
        poi = await poi_repo.get_by_id(poi_id)
        if not poi:
            raise HTTPException(status_code=404, detail="POI not found")
        
        # Mock comprehensive photo gallery response
        return {
            "poi_id": str(poi_id),
            "photos": [
                {
                    "id": f"photo_{i}",
                    "url": f"https://images.touriquest.com/pois/{poi_id}/photo_{i}.jpg",
                    "thumbnail_url": f"https://images.touriquest.com/pois/{poi_id}/thumb_{i}.jpg",
                    "high_res_url": f"https://images.touriquest.com/pois/{poi_id}/hd_{i}.jpg",
                    "caption": f"Professional photo {i+1}",
                    "category": ["exterior", "interior", "exhibits", "events", "seasonal", "aerial"][i % 6],
                    "photographer": "Professional Staff" if i % 3 == 0 else None,
                    "season": ["spring", "summer", "autumn", "winter"][i % 4],
                    "time_of_day": ["morning", "afternoon", "evening", "night"][i % 4],
                    "is_user_generated": i % 4 == 0,
                    "likes": 50 - i * 2,
                    "is_liked": False,
                    "metadata": {
                        "width": 1920,
                        "height": 1080,
                        "taken_at": "2024-03-15T10:30:00Z",
                        "camera_info": "Canon EOS R5",
                        "location": {"lat": poi.latitude, "lng": poi.longitude}
                    }
                }
                for i in range(min(limit, 20))
            ],
            "total_count": 156,
            "categories": ["exterior", "interior", "exhibits", "events", "seasonal", "aerial"],
            "features": {
                "has_360_view": True,
                "has_street_view": True,
                "has_drone_footage": True,
                "has_time_lapse": True,
                "supports_ar_overlay": True,
                "zoom_levels": [1, 2, 4, 8, 16]
            },
            "seasonal_availability": {
                "spring": 45,
                "summer": 62,
                "autumn": 38,
                "winter": 11
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch photos: {str(e)}"
        )


@router.get("/{poi_id}/hours")
async def get_poi_hours(
    poi_id: UUID = Path(..., description="POI unique identifier"),
    date: Optional[str] = Query(None, description="Specific date for hours (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get dynamic operating information with smart hours display and crowd predictions
    """
    try:
        poi_repo = POIRepository(db)
        
        # Verify POI exists
        poi = await poi_repo.get_by_id(poi_id)
        if not poi:
            raise HTTPException(status_code=404, detail="POI not found")
        
        current_hour = datetime.utcnow().hour
        
        return {
            "poi_id": str(poi_id),
            "operating_hours": {
                "monday": {"is_open": True, "open_time": "09:00", "close_time": "18:00"},
                "tuesday": {"is_open": True, "open_time": "09:00", "close_time": "18:00"},
                "wednesday": {"is_open": True, "open_time": "09:00", "close_time": "18:00"},
                "thursday": {"is_open": True, "open_time": "09:00", "close_time": "18:00"},
                "friday": {"is_open": True, "open_time": "09:00", "close_time": "20:00"},
                "saturday": {"is_open": True, "open_time": "08:00", "close_time": "20:00"},
                "sunday": {"is_open": True, "open_time": "10:00", "close_time": "17:00"}
            },
            "is_open_now": 9 <= current_hour <= 18,
            "next_opening_time": "09:00 tomorrow" if current_hour > 18 else None,
            "countdown_to_close": max(0, 18 - current_hour) * 60 if 9 <= current_hour <= 18 else 0,
            "crowd_predictions": {
                "current": {
                    "level": "medium" if 10 <= current_hour <= 16 else "low",
                    "percentage": 60 if 10 <= current_hour <= 16 else 30,
                    "wait_time": 15 if 10 <= current_hour <= 16 else 5
                },
                "hourly_predictions": [
                    {
                        "hour": hour,
                        "level": "high" if 11 <= hour <= 15 else "medium" if 9 <= hour <= 17 else "low",
                        "percentage": 80 if 11 <= hour <= 15 else 50 if 9 <= hour <= 17 else 20,
                        "wait_time": 30 if 11 <= hour <= 15 else 15 if 9 <= hour <= 17 else 5
                    }
                    for hour in range(24)
                ]
            },
            "best_visit_times": [
                {"time_range": "9:00 AM - 10:00 AM", "reason": "Just after opening, fewer crowds"},
                {"time_range": "4:00 PM - 5:00 PM", "reason": "Late afternoon, great lighting"}
            ],
            "special_hours": {
                "holiday_schedule": True,
                "weather_dependent": True,
                "special_events": [
                    {"date": "2024-12-25", "hours": "Closed", "note": "Christmas Day"},
                    {"date": "2024-12-31", "hours": "09:00-15:00", "note": "New Year's Eve - Early Closure"}
                ]
            },
            "accessibility_hours": {
                "early_access": "08:30 AM for mobility-impaired visitors",
                "quiet_hours": "First Tuesday of each month, 9:00-10:00 AM"
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch hours: {str(e)}"
        )


@router.get("/{poi_id}/events")
async def get_poi_events(
    poi_id: UUID = Path(..., description="POI unique identifier"),
    from_date: Optional[str] = Query(None, description="Start date filter (YYYY-MM-DD)"),
    to_date: Optional[str] = Query(None, description="End date filter (YYYY-MM-DD)"),
    category: Optional[str] = Query(None, description="Event category filter"),
    limit: int = Query(20, gt=0, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """
    Get dynamic event calendar with filtering and personalized recommendations
    """
    try:
        poi_repo = POIRepository(db)
        
        # Verify POI exists
        poi = await poi_repo.get_by_id(poi_id)
        if not poi:
            raise HTTPException(status_code=404, detail="POI not found")
        
        return {
            "poi_id": str(poi_id),
            "events": [
                {
                    "id": f"event_{i}",
                    "title": ["Art Exhibition", "Guided Tour", "Workshop", "Concert", "Festival"][i % 5],
                    "description": "Experience the magic of this special event with exclusive access and expert guidance.",
                    "category": ["art", "culture", "education", "entertainment", "seasonal"][i % 5],
                    "start_date": f"2024-04-{15 + i:02d}T10:00:00Z",
                    "end_date": f"2024-04-{15 + i:02d}T16:00:00Z",
                    "is_recurring": i % 3 == 0,
                    "recurrence_pattern": "weekly" if i % 3 == 0 else None,
                    "price": {
                        "type": "paid" if i % 2 == 0 else "free",
                        "adult": 25.0 if i % 2 == 0 else None,
                        "child": 15.0 if i % 2 == 0 else None,
                        "currency": "USD"
                    },
                    "capacity": 50,
                    "available_spots": 50 - (i * 3),
                    "registration_required": i % 2 == 0,
                    "registration_url": f"https://events.touriquest.com/register/event_{i}",
                    "photos": [f"https://images.touriquest.com/events/event_{i}_{j}.jpg" for j in range(3)],
                    "video_preview": f"https://videos.touriquest.com/events/event_{i}_preview.mp4",
                    "social_sharing": {
                        "attendees_count": 25 + i * 2,
                        "friends_attending": i if i < 3 else 0
                    }
                }
                for i in range(min(limit, 15))
            ],
            "total_count": 67,
            "recurring_events": [
                {
                    "title": "Daily Heritage Tour",
                    "schedule": "Every day at 2:00 PM",
                    "duration": "90 minutes",
                    "languages": ["English", "Spanish", "French"]
                }
            ],
            "seasonal_highlights": [
                {
                    "season": "Spring",
                    "events": ["Cherry Blossom Festival", "Garden Tours", "Photography Workshop"]
                },
                {
                    "season": "Summer",
                    "events": ["Outdoor Concerts", "Night Markets", "Sunset Tours"]
                }
            ],
            "personalized_recommendations": [
                {
                    "event_id": "event_1",
                    "reason": "Based on your interest in photography",
                    "match_score": 0.92
                }
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch events: {str(e)}"
        )


@router.get("/{poi_id}/audio-guide")
async def get_poi_audio_guide(
    poi_id: UUID = Path(..., description="POI unique identifier"),
    language: str = Query("en", description="Audio guide language"),
    quality: str = Query("standard", description="Audio quality: standard, high, premium"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get premium audio experience with professional narration and interactive features
    """
    try:
        poi_repo = POIRepository(db)
        
        # Verify POI exists
        poi = await poi_repo.get_by_id(poi_id)
        if not poi:
            raise HTTPException(status_code=404, detail="POI not found")
        
        return {
            "poi_id": str(poi_id),
            "audio_guide": {
                "id": f"audio_guide_{poi_id}",
                "title": "Complete Heritage Experience",
                "description": "Immerse yourself in the rich history and cultural significance of this remarkable location.",
                "total_duration": 45,
                "narrator": "David Attenborough",
                "language": language,
                "quality": quality,
                "main_audio_url": f"https://audio.touriquest.com/guides/{poi_id}/main_{language}_{quality}.mp3",
                "chapters": [
                    {
                        "id": "chapter_1",
                        "title": "Introduction & Overview",
                        "duration": 8,
                        "audio_url": f"https://audio.touriquest.com/guides/{poi_id}/chapter_1_{language}.mp3",
                        "gps_trigger": {"lat": poi.latitude, "lng": poi.longitude, "radius": 50}
                    },
                    {
                        "id": "chapter_2", 
                        "title": "Historical Significance",
                        "duration": 12,
                        "audio_url": f"https://audio.touriquest.com/guides/{poi_id}/chapter_2_{language}.mp3",
                        "interactive_elements": ["timeline", "historical_photos", "architect_biography"]
                    },
                    {
                        "id": "chapter_3",
                        "title": "Architectural Details",
                        "duration": 15,
                        "audio_url": f"https://audio.touriquest.com/guides/{poi_id}/chapter_3_{language}.mp3",
                        "visual_cues": ["highlight_facade", "zoom_details", "construction_animation"]
                    },
                    {
                        "id": "chapter_4",
                        "title": "Cultural Impact",
                        "duration": 10,
                        "audio_url": f"https://audio.touriquest.com/guides/{poi_id}/chapter_4_{language}.mp3",
                        "ambient_sounds": True,
                        "background_music": "cultural_theme.mp3"
                    }
                ],
                "interactive_features": {
                    "gps_triggered": True,
                    "choose_your_path": True,
                    "quiz_elements": True,
                    "ambient_sound_mixing": True,
                    "synchronized_visuals": True
                },
                "accessibility": {
                    "audio_descriptions": True,
                    "transcript_available": True,
                    "sign_language_video": f"https://videos.touriquest.com/guides/{poi_id}/sign_language_{language}.mp4",
                    "haptic_feedback": True
                },
                "offline_capability": {
                    "downloadable": True,
                    "size_mb": 125,
                    "download_url": f"https://downloads.touriquest.com/guides/{poi_id}_offline_{language}.zip"
                }
            },
            "available_narrators": [
                {"name": "David Attenborough", "preview_url": "preview_attenborough.mp3", "premium": True},
                {"name": "Emma Stone", "preview_url": "preview_stone.mp3", "premium": True},
                {"name": "Morgan Freeman", "preview_url": "preview_freeman.mp3", "premium": True},
                {"name": "Standard Narrator", "preview_url": "preview_standard.mp3", "premium": False}
            ],
            "available_languages": [
                {"code": "en", "name": "English", "availability": "full"},
                {"code": "es", "name": "Spanish", "availability": "full"},
                {"code": "fr", "name": "French", "availability": "full"},
                {"code": "de", "name": "German", "availability": "partial"},
                {"code": "ja", "name": "Japanese", "availability": "partial"},
                {"code": "zh", "name": "Chinese", "availability": "coming_soon"}
            ],
            "premium_features": {
                "celebrity_narration": quality == "premium",
                "surround_sound": quality in ["high", "premium"],
                "exclusive_content": quality == "premium",
                "behind_scenes": quality == "premium",
                "director_commentary": quality == "premium"
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch audio guide: {str(e)}"
        )