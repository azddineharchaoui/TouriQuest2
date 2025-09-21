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
    POICategoryEnum, SortByEnum
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