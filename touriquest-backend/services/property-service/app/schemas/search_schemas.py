"""Property search request and response schemas"""

from pydantic import BaseModel, Field, validator, root_validator
from typing import List, Optional, Dict, Any, Union
from datetime import datetime, date
from decimal import Decimal
from enum import Enum
import uuid


# Enums for search filters
class PropertyTypeFilter(str, Enum):
    APARTMENT = "apartment"
    HOUSE = "house"
    VILLA = "villa"
    CONDO = "condo"
    TOWNHOUSE = "townhouse"
    STUDIO = "studio"
    LOFT = "loft"
    PENTHOUSE = "penthouse"
    CABIN = "cabin"
    COTTAGE = "cottage"
    CASTLE = "castle"
    BOAT = "boat"
    RV = "rv"
    TENT = "tent"
    TREEHOUSE = "treehouse"
    IGLOO = "igloo"


class SortOption(str, Enum):
    RELEVANCE = "relevance"
    PRICE_ASC = "price_asc"
    PRICE_DESC = "price_desc"
    RATING_DESC = "rating_desc"
    DISTANCE_ASC = "distance_asc"
    NEWEST = "newest"
    MOST_REVIEWED = "most_reviewed"
    POPULAR = "popular"


class Currency(str, Enum):
    USD = "USD"
    EUR = "EUR"
    GBP = "GBP"
    CAD = "CAD"
    AUD = "AUD"
    JPY = "JPY"


# Base coordinate schema
class Coordinates(BaseModel):
    latitude: float = Field(..., ge=-90, le=90, description="Latitude coordinate")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude coordinate")


# Date range for searches
class DateRange(BaseModel):
    check_in: date = Field(..., description="Check-in date")
    check_out: date = Field(..., description="Check-out date")
    
    @validator('check_out')
    def check_out_after_check_in(cls, v, values):
        if 'check_in' in values and v <= values['check_in']:
            raise ValueError('Check-out date must be after check-in date')
        return v
    
    @property
    def nights(self) -> int:
        return (self.check_out - self.check_in).days


# Guest capacity
class GuestCapacity(BaseModel):
    adults: int = Field(1, ge=1, le=16, description="Number of adults")
    children: int = Field(0, ge=0, le=8, description="Number of children")
    infants: int = Field(0, ge=0, le=5, description="Number of infants")
    pets: int = Field(0, ge=0, le=5, description="Number of pets")
    
    @property
    def total_guests(self) -> int:
        return self.adults + self.children


# Price range filter
class PriceRange(BaseModel):
    min_price: Optional[Decimal] = Field(None, ge=0, description="Minimum price per night")
    max_price: Optional[Decimal] = Field(None, ge=0, description="Maximum price per night")
    currency: Currency = Field(Currency.USD, description="Currency for price range")
    
    @validator('max_price')
    def max_price_greater_than_min(cls, v, values):
        if v is not None and 'min_price' in values and values['min_price'] is not None:
            if v <= values['min_price']:
                raise ValueError('Maximum price must be greater than minimum price')
        return v


# Basic search request
class BasicSearchRequest(BaseModel):
    # Location search
    location: Optional[str] = Field(None, max_length=200, description="Search location (city, address, landmark)")
    coordinates: Optional[Coordinates] = Field(None, description="Exact coordinates for search")
    radius: Optional[float] = Field(50.0, ge=1, le=500, description="Search radius in kilometers")
    
    # Date and guest filters
    dates: Optional[DateRange] = Field(None, description="Check-in and check-out dates")
    guests: GuestCapacity = Field(default_factory=GuestCapacity, description="Guest capacity requirements")
    
    # Basic filters
    price_range: Optional[PriceRange] = Field(None, description="Price range filter")
    property_types: Optional[List[PropertyTypeFilter]] = Field(None, description="Property types to include")
    
    # Pagination and sorting
    page: int = Field(1, ge=1, description="Page number")
    page_size: int = Field(20, ge=1, le=100, description="Results per page")
    sort_by: SortOption = Field(SortOption.RELEVANCE, description="Sort order")
    
    # Query context
    user_id: Optional[uuid.UUID] = Field(None, description="User ID for personalization")
    session_token: Optional[str] = Field(None, description="Session token for anonymous users")


# Advanced search filters
class AdvancedFilters(BaseModel):
    # Accommodation specifications
    min_bedrooms: Optional[int] = Field(None, ge=0, le=20, description="Minimum number of bedrooms")
    min_bathrooms: Optional[float] = Field(None, ge=0, le=20, description="Minimum number of bathrooms")
    min_beds: Optional[int] = Field(None, ge=0, le=50, description="Minimum number of beds")
    
    # Amenity filters
    required_amenities: Optional[List[int]] = Field(None, description="Required amenity IDs")
    preferred_amenities: Optional[List[int]] = Field(None, description="Preferred amenity IDs")
    
    # Booking preferences
    instant_book_only: bool = Field(False, description="Only show instant book properties")
    host_verified_only: bool = Field(False, description="Only show verified host properties")
    
    # Accessibility and special needs
    accessible_only: bool = Field(False, description="Only wheelchair accessible properties")
    pets_allowed: Optional[bool] = Field(None, description="Pet-friendly properties")
    smoking_allowed: Optional[bool] = Field(None, description="Smoking allowed properties")
    children_welcome: Optional[bool] = Field(None, description="Child-friendly properties")
    
    # Quality filters
    min_rating: Optional[float] = Field(None, ge=0, le=5, description="Minimum overall rating")
    min_reviews: Optional[int] = Field(None, ge=0, description="Minimum number of reviews")
    
    # Host preferences
    max_response_time_hours: Optional[int] = Field(None, ge=1, le=168, description="Maximum host response time")
    min_response_rate: Optional[float] = Field(None, ge=0, le=100, description="Minimum host response rate")
    
    # Stay requirements
    min_stay: Optional[int] = Field(None, ge=1, le=365, description="Minimum stay in nights")
    max_stay: Optional[int] = Field(None, ge=1, le=365, description="Maximum stay in nights")
    
    # Sustainability
    eco_friendly_only: bool = Field(False, description="Only eco-friendly properties")
    
    # Language preferences
    host_languages: Optional[List[str]] = Field(None, description="Preferred host languages")
    
    # Cancellation policy
    flexible_cancellation: bool = Field(False, description="Flexible cancellation policy required")


# Advanced search request
class AdvancedSearchRequest(BasicSearchRequest):
    filters: AdvancedFilters = Field(default_factory=AdvancedFilters, description="Advanced search filters")
    
    # Personalization
    enable_personalization: bool = Field(True, description="Enable personalized results")
    boost_previous_bookings: bool = Field(True, description="Boost previously booked property types")
    
    # A/B testing
    experiment_variant: Optional[str] = Field(None, description="A/B test variant")


# Location autocomplete request
class LocationSuggestionsRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=100, description="Partial location query")
    limit: int = Field(10, ge=1, le=50, description="Maximum number of suggestions")
    include_coordinates: bool = Field(True, description="Include coordinates in suggestions")
    country_bias: Optional[str] = Field(None, description="Country code to bias results (ISO 2-letter)")
    user_location: Optional[Coordinates] = Field(None, description="User location for proximity bias")


# Property availability check
class AvailabilityRequest(BaseModel):
    property_id: uuid.UUID = Field(..., description="Property ID")
    dates: DateRange = Field(..., description="Date range to check")
    guests: GuestCapacity = Field(default_factory=GuestCapacity, description="Guest capacity")


# Saved search request
class SavedSearchRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Search name")
    search_params: AdvancedSearchRequest = Field(..., description="Search parameters to save")
    
    # Notification preferences
    email_alerts: bool = Field(True, description="Enable email alerts")
    push_alerts: bool = Field(True, description="Enable push notifications")
    price_drop_alerts: bool = Field(True, description="Alert on price drops")
    new_listings_alerts: bool = Field(True, description="Alert on new listings")
    
    # Alert thresholds
    max_price_alert: Optional[Decimal] = Field(None, description="Maximum price for alerts")
    min_rating_alert: Optional[float] = Field(None, description="Minimum rating for alerts")


# Trending and nearby requests
class TrendingPropertiesRequest(BaseModel):
    location: Optional[str] = Field(None, description="Location to find trending properties")
    coordinates: Optional[Coordinates] = Field(None, description="Coordinates for trending search")
    radius: float = Field(50.0, ge=1, le=500, description="Search radius in kilometers")
    time_period: str = Field("7d", regex="^(1d|3d|7d|30d)$", description="Trending time period")
    limit: int = Field(20, ge=1, le=100, description="Number of trending properties")


class NearbyPropertiesRequest(BaseModel):
    coordinates: Coordinates = Field(..., description="Center coordinates")
    radius: float = Field(10.0, ge=0.5, le=100, description="Search radius in kilometers")
    dates: Optional[DateRange] = Field(None, description="Date availability filter")
    guests: Optional[GuestCapacity] = Field(None, description="Guest capacity filter")
    limit: int = Field(20, ge=1, le=100, description="Number of nearby properties")


# Search analytics and feedback
class SearchFeedbackRequest(BaseModel):
    query_id: uuid.UUID = Field(..., description="Search query ID")
    feedback_type: str = Field(..., regex="^(thumbs_up|thumbs_down|report)$", description="Feedback type")
    rating: Optional[int] = Field(None, ge=1, le=5, description="Results quality rating")
    comment: Optional[str] = Field(None, max_length=1000, description="Additional feedback")
    
    # Specific issues
    irrelevant_results: bool = Field(False, description="Results not relevant")
    incorrect_pricing: bool = Field(False, description="Pricing information incorrect")
    outdated_availability: bool = Field(False, description="Availability information outdated")
    poor_image_quality: bool = Field(False, description="Poor quality images")
    misleading_description: bool = Field(False, description="Misleading property descriptions")
    
    suggestions: Optional[str] = Field(None, max_length=500, description="Improvement suggestions")


# Pagination metadata
class PaginationMeta(BaseModel):
    current_page: int = Field(..., description="Current page number")
    page_size: int = Field(..., description="Results per page")
    total_results: int = Field(..., description="Total number of results")
    total_pages: int = Field(..., description="Total number of pages")
    has_next: bool = Field(..., description="Has next page")
    has_previous: bool = Field(..., description="Has previous page")


# Search execution metadata
class SearchMetadata(BaseModel):
    query_id: uuid.UUID = Field(..., description="Unique query identifier")
    execution_time_ms: int = Field(..., description="Query execution time in milliseconds")
    total_results: int = Field(..., description="Total number of matching properties")
    search_radius_used: float = Field(..., description="Actual search radius used")
    location_resolved: Optional[str] = Field(None, description="Resolved location name")
    coordinates_used: Optional[Coordinates] = Field(None, description="Coordinates used for search")
    filters_applied: Dict[str, Any] = Field(..., description="Filters that were applied")
    sort_applied: str = Field(..., description="Sort order applied")
    personalization_enabled: bool = Field(..., description="Whether personalization was used")
    experiment_variant: Optional[str] = Field(None, description="A/B test variant used")


class BaseResponse(BaseModel):
    """Base response model with common fields"""
    success: bool = Field(True, description="Request success status")
    message: Optional[str] = Field(None, description="Response message")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Response timestamp")


class ErrorResponse(BaseResponse):
    """Error response model"""
    success: bool = Field(False, description="Request success status")
    error_code: str = Field(..., description="Error code")
    error_details: Optional[Dict[str, Any]] = Field(None, description="Additional error details")


# Validation helpers
def validate_search_dates(dates: Optional[DateRange]) -> Optional[DateRange]:
    """Validate search dates are not in the past"""
    if dates and dates.check_in < date.today():
        raise ValueError("Check-in date cannot be in the past")
    return dates


def validate_coordinates(coords: Optional[Coordinates]) -> Optional[Coordinates]:
    """Validate coordinate bounds"""
    if coords:
        if not (-90 <= coords.latitude <= 90):
            raise ValueError("Latitude must be between -90 and 90")
        if not (-180 <= coords.longitude <= 180):
            raise ValueError("Longitude must be between -180 and 180")
    return coords