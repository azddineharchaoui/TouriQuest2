"""Property search API endpoints"""

from fastapi import APIRouter, Depends, Query, HTTPException, status, Background
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict, Any
import uuid
import structlog
from datetime import datetime

from app.core.database import get_db
from app.schemas import (
    BasicSearchRequest, AdvancedSearchRequest, PropertySearchResponse,
    LocationSuggestionsRequest, LocationSuggestionsResponse,
    AvailabilityRequest, AvailabilityResponse,
    SavedSearchRequest, SavedSearchResponse, SavedSearchesResponse,
    TrendingPropertiesRequest, TrendingPropertiesResponse,
    NearbyPropertiesRequest, NearbyPropertiesResponse,
    SearchFeedbackRequest, SearchFeedbackResponse,
    PropertyDetailResponse, HealthCheckResponse,
    SearchErrorResponse
)
from app.services.property_search_service import PropertySearchService
from app.services.location_service import LocationService
from app.services.availability_service import AvailabilityService
from app.services.saved_search_service import SavedSearchService
from app.services.analytics_service import AnalyticsService
from app.core.deps import get_current_user, get_search_services
from app.core.rate_limiter import rate_limit
from app.core.exceptions import SearchException, LocationNotFoundException

logger = structlog.get_logger()
router = APIRouter()


@router.get("/search", response_model=PropertySearchResponse)
@rate_limit(requests=50, window=60)  # 50 requests per minute
async def search_properties(
    # Location parameters
    location: Optional[str] = Query(None, description="Search location"),
    latitude: Optional[float] = Query(None, ge=-90, le=90, description="Latitude"),
    longitude: Optional[float] = Query(None, ge=-180, le=180, description="Longitude"),
    radius: Optional[float] = Query(50.0, ge=1, le=500, description="Search radius in km"),
    
    # Date parameters
    check_in: Optional[str] = Query(None, description="Check-in date (YYYY-MM-DD)"),
    check_out: Optional[str] = Query(None, description="Check-out date (YYYY-MM-DD)"),
    
    # Guest parameters
    adults: int = Query(1, ge=1, le=16, description="Number of adults"),
    children: int = Query(0, ge=0, le=8, description="Number of children"),
    infants: int = Query(0, ge=0, le=5, description="Number of infants"),
    pets: int = Query(0, ge=0, le=5, description="Number of pets"),
    
    # Filtering parameters
    min_price: Optional[float] = Query(None, ge=0, description="Minimum price per night"),
    max_price: Optional[float] = Query(None, ge=0, description="Maximum price per night"),
    property_types: Optional[List[str]] = Query(None, description="Property types"),
    min_rating: Optional[float] = Query(None, ge=0, le=5, description="Minimum rating"),
    min_reviews: Optional[int] = Query(None, ge=0, description="Minimum review count"),
    
    # Booking preferences
    instant_book: bool = Query(False, description="Instant book only"),
    host_verified: bool = Query(False, description="Verified hosts only"),
    eco_friendly: bool = Query(False, description="Eco-friendly properties only"),
    pets_allowed: Optional[bool] = Query(None, description="Pet-friendly properties"),
    smoking_allowed: Optional[bool] = Query(None, description="Smoking allowed"),
    
    # Pagination and sorting
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Results per page"),
    sort_by: str = Query("relevance", description="Sort order"),
    
    # Services and dependencies
    db: AsyncSession = Depends(get_db),
    search_service: PropertySearchService = Depends(get_search_services),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user),
    background_tasks: Background
):
    """
    Search properties with basic filters
    
    This endpoint provides a simplified interface for property search
    with the most commonly used filters. For advanced filtering,
    use the POST /search/advanced endpoint.
    """
    try:
        # Build search request from query parameters
        search_request = await _build_basic_search_request(
            location=location, latitude=latitude, longitude=longitude, radius=radius,
            check_in=check_in, check_out=check_out,
            adults=adults, children=children, infants=infants, pets=pets,
            min_price=min_price, max_price=max_price, property_types=property_types,
            min_rating=min_rating, min_reviews=min_reviews,
            instant_book=instant_book, host_verified=host_verified,
            eco_friendly=eco_friendly, pets_allowed=pets_allowed,
            smoking_allowed=smoking_allowed,
            page=page, page_size=page_size, sort_by=sort_by
        )
        
        # Get user context for personalization
        user_context = await _get_user_context(current_user, db) if current_user else None
        
        # Execute search
        results = await search_service.search_properties(
            search_request, db, user_context
        )
        
        # Track search analytics in background
        background_tasks.add_task(
            _track_search_analytics,
            search_request,
            results,
            current_user
        )
        
        logger.info(
            "Property search completed",
            query_id=str(results.metadata.query_id),
            results_count=len(results.results),
            user_id=current_user.get("user_id") if current_user else None
        )
        
        return results
        
    except LocationNotFoundException as e:
        logger.warning(f"Location not found: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Location '{location}' not found. Please try a different search term."
        )
    
    except SearchException as e:
        logger.error(f"Search error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    
    except Exception as e:
        logger.error(f"Unexpected search error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while searching properties. Please try again."
        )


@router.post("/search/advanced", response_model=PropertySearchResponse)
@rate_limit(requests=30, window=60)  # 30 requests per minute for advanced search
async def advanced_search_properties(
    request: AdvancedSearchRequest,
    db: AsyncSession = Depends(get_db),
    search_service: PropertySearchService = Depends(get_search_services),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user),
    background_tasks: Background
):
    """
    Advanced property search with comprehensive filtering
    
    This endpoint provides access to all available search filters and options,
    including amenity filtering, accessibility requirements, host preferences,
    and personalization settings.
    """
    try:
        # Set user context in request
        if current_user:
            request.user_id = current_user.get("user_id")
        
        # Get user context for personalization
        user_context = await _get_user_context(current_user, db) if current_user else None
        
        # Execute advanced search
        results = await search_service.search_properties(
            request, db, user_context
        )
        
        # Track advanced search analytics
        background_tasks.add_task(
            _track_advanced_search_analytics,
            request,
            results,
            current_user
        )
        
        logger.info(
            "Advanced property search completed",
            query_id=str(results.metadata.query_id),
            results_count=len(results.results),
            filters_applied=len([f for f in request.filters.__dict__.values() if f]),
            user_id=current_user.get("user_id") if current_user else None
        )
        
        return results
        
    except Exception as e:
        logger.error(f"Advanced search error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during advanced search. Please try again."
        )


@router.get("/suggestions", response_model=LocationSuggestionsResponse)
@rate_limit(requests=100, window=60)  # High rate limit for autocomplete
async def get_location_suggestions(
    q: str = Query(..., min_length=2, max_length=100, description="Search query"),
    limit: int = Query(10, ge=1, le=50, description="Maximum suggestions"),
    country: Optional[str] = Query(None, description="Country code bias"),
    user_lat: Optional[float] = Query(None, description="User latitude for proximity"),
    user_lon: Optional[float] = Query(None, description="User longitude for proximity"),
    location_service: LocationService = Depends(get_search_services),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user)
):
    """
    Get location suggestions for autocomplete
    
    Returns suggested locations based on partial input, with support for
    country biasing and proximity-based ranking.
    """
    try:
        suggestions_request = LocationSuggestionsRequest(
            query=q,
            limit=limit,
            country_bias=country,
            user_location={"latitude": user_lat, "longitude": user_lon} if user_lat and user_lon else None
        )
        
        suggestions = await location_service.get_location_suggestions(suggestions_request)
        
        logger.info(
            "Location suggestions retrieved",
            query=q,
            suggestions_count=len(suggestions.suggestions)
        )
        
        return suggestions
        
    except Exception as e:
        logger.error(f"Location suggestions error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get location suggestions"
        )


@router.get("/{property_id}/availability", response_model=AvailabilityResponse)
@rate_limit(requests=100, window=60)
async def check_property_availability(
    property_id: uuid.UUID,
    check_in: str = Query(..., description="Check-in date (YYYY-MM-DD)"),
    check_out: str = Query(..., description="Check-out date (YYYY-MM-DD)"),
    adults: int = Query(1, ge=1, le=16, description="Number of adults"),
    children: int = Query(0, ge=0, le=8, description="Number of children"),
    infants: int = Query(0, ge=0, le=5, description="Number of infants"),
    pets: int = Query(0, ge=0, le=5, description="Number of pets"),
    db: AsyncSession = Depends(get_db),
    availability_service: AvailabilityService = Depends(get_search_services),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user)
):
    """
    Check availability and pricing for specific property and dates
    
    Returns detailed availability information including pricing calendar,
    minimum stay requirements, and total cost calculation.
    """
    try:
        availability_request = AvailabilityRequest(
            property_id=property_id,
            dates={
                "check_in": check_in,
                "check_out": check_out
            },
            guests={
                "adults": adults,
                "children": children,
                "infants": infants,
                "pets": pets
            }
        )
        
        availability = await availability_service.check_availability(
            availability_request, db
        )
        
        logger.info(
            "Availability checked",
            property_id=str(property_id),
            is_available=availability.is_available,
            total_nights=availability.total_nights
        )
        
        return availability
        
    except Exception as e:
        logger.error(f"Availability check error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to check property availability"
        )


@router.post("/search/save", response_model=SavedSearchResponse)
@rate_limit(requests=20, window=60)
async def save_search(
    request: SavedSearchRequest,
    db: AsyncSession = Depends(get_db),
    saved_search_service: SavedSearchService = Depends(get_search_services),
    current_user: Dict[str, Any] = Depends(get_current_user)  # Required for saved searches
):
    """
    Save a search for future alerts and re-execution
    
    Allows users to save complex search criteria and receive notifications
    when new properties match their criteria or prices change.
    """
    try:
        saved_search = await saved_search_service.save_search(
            current_user["user_id"], request, db
        )
        
        logger.info(
            "Search saved",
            saved_search_id=str(saved_search.id),
            user_id=current_user["user_id"],
            search_name=request.name
        )
        
        return saved_search
        
    except Exception as e:
        logger.error(f"Save search error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save search"
        )


@router.get("/users/{user_id}/saved-searches", response_model=SavedSearchesResponse)
@rate_limit(requests=50, window=60)
async def get_saved_searches(
    user_id: uuid.UUID,
    active_only: bool = Query(True, description="Return only active searches"),
    db: AsyncSession = Depends(get_db),
    saved_search_service: SavedSearchService = Depends(get_search_services),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get user's saved searches
    
    Returns all saved searches for the authenticated user with their
    current status and last execution results.
    """
    try:
        # Verify user can access these saved searches
        if current_user["user_id"] != str(user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot access another user's saved searches"
            )
        
        saved_searches = await saved_search_service.get_user_saved_searches(
            user_id, active_only, db
        )
        
        logger.info(
            "Saved searches retrieved",
            user_id=str(user_id),
            count=saved_searches.total_count
        )
        
        return saved_searches
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get saved searches error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve saved searches"
        )


@router.get("/trending", response_model=TrendingPropertiesResponse)
@rate_limit(requests=100, window=60)
async def get_trending_properties(
    location: Optional[str] = Query(None, description="Location filter"),
    latitude: Optional[float] = Query(None, description="Latitude"),
    longitude: Optional[float] = Query(None, description="Longitude"),
    radius: float = Query(50.0, ge=1, le=500, description="Search radius"),
    time_period: str = Query("7d", regex="^(1d|3d|7d|30d)$", description="Trending period"),
    limit: int = Query(20, ge=1, le=100, description="Number of results"),
    db: AsyncSession = Depends(get_db),
    search_service: PropertySearchService = Depends(get_search_services),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user)
):
    """
    Get trending properties in a location
    
    Returns properties that are experiencing increased search volume,
    bookings, or user engagement in the specified time period.
    """
    try:
        trending_request = TrendingPropertiesRequest(
            location=location,
            coordinates={"latitude": latitude, "longitude": longitude} if latitude and longitude else None,
            radius=radius,
            time_period=time_period,
            limit=limit
        )
        
        trending = await search_service.get_trending_properties(
            trending_request, db
        )
        
        logger.info(
            "Trending properties retrieved",
            location=location,
            time_period=time_period,
            count=len(trending.trending_properties)
        )
        
        return trending
        
    except Exception as e:
        logger.error(f"Trending properties error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get trending properties"
        )


@router.get("/nearby", response_model=NearbyPropertiesResponse)
@rate_limit(requests=100, window=60)
async def get_nearby_properties(
    latitude: float = Query(..., ge=-90, le=90, description="Latitude"),
    longitude: float = Query(..., ge=-180, le=180, description="Longitude"),
    radius: float = Query(10.0, ge=0.5, le=100, description="Search radius"),
    check_in: Optional[str] = Query(None, description="Check-in date filter"),
    check_out: Optional[str] = Query(None, description="Check-out date filter"),
    adults: int = Query(1, ge=1, le=16, description="Number of adults"),
    children: int = Query(0, ge=0, le=8, description="Number of children"),
    limit: int = Query(20, ge=1, le=100, description="Number of results"),
    db: AsyncSession = Depends(get_db),
    search_service: PropertySearchService = Depends(get_search_services),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user)
):
    """
    Get properties near specific coordinates
    
    Returns properties within the specified radius of the given coordinates,
    useful for map-based searches and location-specific browsing.
    """
    try:
        nearby_request = NearbyPropertiesRequest(
            coordinates={"latitude": latitude, "longitude": longitude},
            radius=radius,
            dates={
                "check_in": check_in,
                "check_out": check_out
            } if check_in and check_out else None,
            guests={
                "adults": adults,
                "children": children
            },
            limit=limit
        )
        
        nearby = await search_service.get_nearby_properties(
            nearby_request, db
        )
        
        logger.info(
            "Nearby properties retrieved",
            latitude=latitude,
            longitude=longitude,
            radius=radius,
            count=len(nearby.nearby_properties)
        )
        
        return nearby
        
    except Exception as e:
        logger.error(f"Nearby properties error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get nearby properties"
        )


@router.post("/search/feedback", response_model=SearchFeedbackResponse)
@rate_limit(requests=50, window=60)
async def submit_search_feedback(
    request: SearchFeedbackRequest,
    db: AsyncSession = Depends(get_db),
    analytics_service: AnalyticsService = Depends(get_search_services),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user)
):
    """
    Submit feedback on search results quality
    
    Allows users to provide feedback on search results to help improve
    the search algorithm and ranking quality.
    """
    try:
        feedback = await analytics_service.record_search_feedback(
            request, current_user, db
        )
        
        logger.info(
            "Search feedback submitted",
            feedback_id=str(feedback.feedback_id),
            query_id=str(request.query_id),
            feedback_type=request.feedback_type,
            rating=request.rating
        )
        
        return feedback
        
    except Exception as e:
        logger.error(f"Search feedback error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit feedback"
        )


@router.get("/{property_id}", response_model=PropertyDetailResponse)
@rate_limit(requests=200, window=60)
async def get_property_details(
    property_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    search_service: PropertySearchService = Depends(get_search_services),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user),
    background_tasks: Background
):
    """
    Get detailed information about a specific property
    
    Returns comprehensive property information including all amenities,
    images, reviews, pricing, and availability calendar.
    """
    try:
        property_details = await search_service.get_property_details(
            property_id, db
        )
        
        if not property_details:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Property {property_id} not found"
            )
        
        # Track property view
        background_tasks.add_task(
            _track_property_view,
            property_id,
            current_user
        )
        
        logger.info(
            "Property details retrieved",
            property_id=str(property_id),
            user_id=current_user.get("user_id") if current_user else None
        )
        
        return property_details
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Property details error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get property details"
        )


# Health check endpoint
@router.get("/health", response_model=HealthCheckResponse)
async def health_check(
    db: AsyncSession = Depends(get_db),
    search_service: PropertySearchService = Depends(get_search_services)
):
    """
    Service health check
    
    Returns the current health status of the property search service
    and its dependencies.
    """
    try:
        # Check database connection
        await db.execute("SELECT 1")
        
        # Check Elasticsearch connection
        es_status = await search_service.es.client.ping() if search_service.es.client else False
        
        # Check Redis connection
        redis_status = await search_service.cache.ping() if search_service.cache else False
        
        dependencies = {
            "database": "healthy",
            "elasticsearch": "healthy" if es_status else "unhealthy",
            "redis": "healthy" if redis_status else "unhealthy"
        }
        
        overall_status = "healthy" if all(
            status == "healthy" for status in dependencies.values()
        ) else "degraded"
        
        return HealthCheckResponse(
            status=overall_status,
            version="1.0.0",
            dependencies=dependencies,
            uptime_seconds=int((datetime.utcnow() - datetime(2024, 1, 1)).total_seconds())
        )
        
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return HealthCheckResponse(
            status="unhealthy",
            version="1.0.0",
            dependencies={"error": str(e)},
            uptime_seconds=0
        )


# Helper functions
async def _build_basic_search_request(**kwargs) -> AdvancedSearchRequest:
    """Build AdvancedSearchRequest from query parameters"""
    # Implementation would convert query params to request object
    pass

async def _get_user_context(current_user: Dict[str, Any], db: AsyncSession) -> Dict[str, Any]:
    """Get user context for personalization"""
    # Implementation would fetch user preferences, history, etc.
    pass

async def _track_search_analytics(request, results, user):
    """Track search analytics in background"""
    # Implementation would record search metrics
    pass

async def _track_advanced_search_analytics(request, results, user):
    """Track advanced search analytics"""
    # Implementation would record advanced search metrics
    pass

async def _track_property_view(property_id: uuid.UUID, user):
    """Track property view for analytics"""
    # Implementation would record property view
    pass