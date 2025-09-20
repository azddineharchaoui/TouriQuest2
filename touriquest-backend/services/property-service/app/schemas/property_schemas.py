"""Property response schemas"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from decimal import Decimal
from uuid import UUID

from app.schemas.search_schemas import Coordinates, PaginationMeta, SearchMetadata, BaseResponse


# Property amenity response
class AmenityResponse(BaseModel):
    id: int = Field(..., description="Amenity ID")
    name: str = Field(..., description="Amenity name")
    category: str = Field(..., description="Amenity category")
    icon: Optional[str] = Field(None, description="Icon identifier")
    description: Optional[str] = Field(None, description="Amenity description")
    is_highlighted: bool = Field(..., description="Show in search filters")
    notes: Optional[str] = Field(None, description="Property-specific notes")


# Property image response
class PropertyImageResponse(BaseModel):
    id: UUID = Field(..., description="Image ID")
    url: str = Field(..., description="Image URL")
    alt_text: Optional[str] = Field(None, description="Image alt text")
    caption: Optional[str] = Field(None, description="Image caption")
    order_index: int = Field(..., description="Display order")
    is_primary: bool = Field(..., description="Primary image flag")
    width: Optional[int] = Field(None, description="Image width")
    height: Optional[int] = Field(None, description="Image height")


# Property review summary
class ReviewSummary(BaseModel):
    overall_rating: float = Field(..., description="Overall rating")
    review_count: int = Field(..., description="Total number of reviews")
    cleanliness_rating: Optional[float] = Field(None, description="Cleanliness rating")
    communication_rating: Optional[float] = Field(None, description="Communication rating")
    location_rating: Optional[float] = Field(None, description="Location rating")
    value_rating: Optional[float] = Field(None, description="Value rating")


# Host information
class HostInfo(BaseModel):
    host_id: UUID = Field(..., description="Host ID")
    is_verified: bool = Field(..., description="Host verification status")
    response_rate: float = Field(..., description="Response rate percentage")
    response_time_hours: int = Field(..., description="Average response time in hours")
    languages: List[str] = Field(..., description="Languages spoken by host")


# Pricing information
class PricingInfo(BaseModel):
    base_price: Decimal = Field(..., description="Base price per night")
    currency: str = Field(..., description="Currency code")
    cleaning_fee: Decimal = Field(..., description="Cleaning fee")
    service_fee_percentage: Decimal = Field(..., description="Service fee percentage")
    total_price: Optional[Decimal] = Field(None, description="Total price for stay")
    price_breakdown: Optional[Dict[str, Decimal]] = Field(None, description="Detailed price breakdown")


# Property search result (compact for listings)
class PropertySearchResult(BaseModel):
    id: UUID = Field(..., description="Property ID")
    title: str = Field(..., description="Property title")
    property_type: str = Field(..., description="Property type")
    
    # Location
    address: str = Field(..., description="Property address")
    city: str = Field(..., description="City")
    country: str = Field(..., description="Country")
    coordinates: Coordinates = Field(..., description="Property coordinates")
    distance_km: Optional[float] = Field(None, description="Distance from search center")
    
    # Capacity and specs
    max_guests: int = Field(..., description="Maximum guests")
    bedrooms: int = Field(..., description="Number of bedrooms")
    bathrooms: float = Field(..., description="Number of bathrooms")
    beds: int = Field(..., description="Number of beds")
    
    # Pricing
    pricing: PricingInfo = Field(..., description="Pricing information")
    
    # Images
    primary_image: Optional[PropertyImageResponse] = Field(None, description="Primary property image")
    image_count: int = Field(..., description="Total number of images")
    
    # Reviews and rating
    reviews: ReviewSummary = Field(..., description="Review summary")
    
    # Host
    host: HostInfo = Field(..., description="Host information")
    
    # Booking info
    booking_type: str = Field(..., description="Booking type (instant/request)")
    cancellation_policy: str = Field(..., description="Cancellation policy")
    minimum_stay: int = Field(..., description="Minimum stay nights")
    
    # Features
    key_amenities: List[str] = Field(..., description="Key amenities (up to 5)")
    is_eco_friendly: bool = Field(..., description="Eco-friendly property")
    pets_allowed: bool = Field(..., description="Pets allowed")
    smoking_allowed: bool = Field(..., description="Smoking allowed")
    
    # Availability
    is_available: bool = Field(..., description="Available for search dates")
    
    # Search relevance
    relevance_score: Optional[float] = Field(None, description="Search relevance score")
    popularity_score: Optional[float] = Field(None, description="Property popularity score")


# Detailed property response
class PropertyDetailResponse(PropertySearchResult):
    description: str = Field(..., description="Property description")
    
    # All amenities
    amenities: List[AmenityResponse] = Field(..., description="All property amenities")
    
    # All images
    images: List[PropertyImageResponse] = Field(..., description="All property images")
    
    # Check-in/out times
    check_in_time: str = Field(..., description="Check-in time")
    check_out_time: str = Field(..., description="Check-out time")
    
    # Advanced policies
    maximum_stay: int = Field(..., description="Maximum stay nights")
    advance_booking_days: int = Field(..., description="Advance booking days")
    
    # House rules
    children_welcome: bool = Field(..., description="Children welcome")
    events_allowed: bool = Field(..., description="Events allowed")
    
    # Accessibility
    accessibility_features: List[str] = Field(..., description="Accessibility features")
    
    # Performance metrics
    views_count: int = Field(..., description="Total views")
    last_booked_at: Optional[datetime] = Field(None, description="Last booking date")
    
    # Timestamps
    created_at: datetime = Field(..., description="Property creation date")
    updated_at: datetime = Field(..., description="Last update date")


# Search response with results
class PropertySearchResponse(BaseResponse):
    results: List[PropertySearchResult] = Field(..., description="Search results")
    pagination: PaginationMeta = Field(..., description="Pagination information")
    metadata: SearchMetadata = Field(..., description="Search execution metadata")
    
    # Aggregations and insights
    price_range: Optional[Dict[str, Decimal]] = Field(None, description="Price range in results")
    property_types_count: Optional[Dict[str, int]] = Field(None, description="Property types distribution")
    average_rating: Optional[float] = Field(None, description="Average rating of results")
    location_bounds: Optional[Dict[str, float]] = Field(None, description="Geographic bounds of results")


# Location suggestion response
class LocationSuggestion(BaseModel):
    location: str = Field(..., description="Location name")
    display_name: str = Field(..., description="Display name with hierarchy")
    country: str = Field(..., description="Country name")
    coordinates: Optional[Coordinates] = Field(None, description="Location coordinates")
    suggestion_type: str = Field(..., description="Type of suggestion (city, landmark, etc.)")
    popularity_score: float = Field(..., description="Location popularity score")


class LocationSuggestionsResponse(BaseResponse):
    suggestions: List[LocationSuggestion] = Field(..., description="Location suggestions")
    query: str = Field(..., description="Original query")


# Availability response
class AvailabilityResponse(BaseResponse):
    property_id: UUID = Field(..., description="Property ID")
    is_available: bool = Field(..., description="Availability status")
    available_dates: List[datetime] = Field(..., description="Available dates in range")
    unavailable_dates: List[datetime] = Field(..., description="Unavailable dates in range")
    pricing_calendar: Dict[str, Decimal] = Field(..., description="Daily pricing")
    minimum_stay_requirements: Dict[str, int] = Field(..., description="Minimum stay by date")
    total_nights: int = Field(..., description="Total nights requested")
    total_price: Optional[Decimal] = Field(None, description="Total price for stay")


# Saved search response
class SavedSearchResponse(BaseModel):
    id: UUID = Field(..., description="Saved search ID")
    name: str = Field(..., description="Search name")
    search_params: Dict[str, Any] = Field(..., description="Search parameters")
    is_active: bool = Field(..., description="Alert status")
    last_checked: Optional[datetime] = Field(None, description="Last check time")
    last_results_count: int = Field(..., description="Results from last check")
    created_at: datetime = Field(..., description="Creation date")
    updated_at: datetime = Field(..., description="Last update date")


class SavedSearchesResponse(BaseResponse):
    saved_searches: List[SavedSearchResponse] = Field(..., description="User's saved searches")
    total_count: int = Field(..., description="Total saved searches")


# Trending properties response
class TrendingProperty(BaseModel):
    property: PropertySearchResult = Field(..., description="Property details")
    trend_score: float = Field(..., description="Trending score")
    growth_rate: float = Field(..., description="Growth rate percentage")
    search_volume_change: float = Field(..., description="Search volume change")


class TrendingPropertiesResponse(BaseResponse):
    trending_properties: List[TrendingProperty] = Field(..., description="Trending properties")
    location: Optional[str] = Field(None, description="Location for trending search")
    time_period: str = Field(..., description="Time period analyzed")
    total_trending: int = Field(..., description="Total trending properties")


# Nearby properties response
class NearbyPropertiesResponse(BaseResponse):
    nearby_properties: List[PropertySearchResult] = Field(..., description="Nearby properties")
    center_coordinates: Coordinates = Field(..., description="Search center")
    radius_km: float = Field(..., description="Search radius")
    total_nearby: int = Field(..., description="Total nearby properties")


# Search analytics response
class SearchAnalytics(BaseModel):
    total_searches: int = Field(..., description="Total searches")
    avg_execution_time_ms: float = Field(..., description="Average execution time")
    click_through_rate: float = Field(..., description="Click-through rate")
    conversion_rate: float = Field(..., description="Booking conversion rate")
    popular_filters: Dict[str, int] = Field(..., description="Most used filters")
    popular_locations: Dict[str, int] = Field(..., description="Most searched locations")
    popular_property_types: Dict[str, int] = Field(..., description="Most searched property types")


class SearchAnalyticsResponse(BaseResponse):
    analytics: SearchAnalytics = Field(..., description="Search analytics data")
    period: str = Field(..., description="Analytics period")


# Error responses for specific scenarios
class SearchErrorResponse(BaseResponse):
    success: bool = Field(False, description="Request success status")
    error_code: str = Field(..., description="Specific error code")
    suggestions: Optional[List[str]] = Field(None, description="Search suggestions")
    alternative_locations: Optional[List[LocationSuggestion]] = Field(None, description="Alternative locations")


# Feedback submission response
class SearchFeedbackResponse(BaseResponse):
    feedback_id: UUID = Field(..., description="Feedback record ID")
    acknowledged: bool = Field(True, description="Feedback acknowledged")


# Health check response
class HealthCheckResponse(BaseModel):
    status: str = Field(..., description="Service health status")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Health check timestamp")
    version: str = Field(..., description="Service version")
    dependencies: Dict[str, str] = Field(..., description="Dependency status")
    uptime_seconds: int = Field(..., description="Service uptime in seconds")