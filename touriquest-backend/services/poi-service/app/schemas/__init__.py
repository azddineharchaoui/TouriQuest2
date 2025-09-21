"""
Pydantic schemas for POI Service API
"""

from datetime import datetime, time
from typing import Optional, List, Dict, Any, Union
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field, validator, root_validator


class POICategoryEnum(str, Enum):
    MUSEUMS_CULTURE = "museums_culture"
    HISTORICAL_SITES = "historical_sites"
    NATURE_PARKS = "nature_parks"
    FOOD_DINING = "food_dining"
    ENTERTAINMENT = "entertainment"
    SHOPPING = "shopping"
    NIGHTLIFE = "nightlife"


class AccessibilityTypeEnum(str, Enum):
    WHEELCHAIR_ACCESSIBLE = "wheelchair_accessible"
    HEARING_IMPAIRED = "hearing_impaired"
    VISUALLY_IMPAIRED = "visually_impaired"
    MOBILITY_ASSISTANCE = "mobility_assistance"
    COGNITIVE_ASSISTANCE = "cognitive_assistance"


class InteractionTypeEnum(str, Enum):
    VIEW = "view"
    FAVORITE = "favorite"
    UNFAVORITE = "unfavorite"
    SHARE = "share"
    CHECKIN = "checkin"
    PHOTO_UPLOAD = "photo_upload"
    AUDIO_PLAY = "audio_play"
    AR_EXPERIENCE = "ar_experience"


class SortByEnum(str, Enum):
    RELEVANCE = "relevance"
    DISTANCE = "distance"
    RATING = "rating"
    POPULARITY = "popularity"
    PRICE_LOW_HIGH = "price_low_high"
    PRICE_HIGH_LOW = "price_high_low"
    NEWEST = "newest"
    MOST_REVIEWED = "most_reviewed"


# Base schemas
class LocationPoint(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)


class TimeRange(BaseModel):
    start_time: str = Field(..., regex=r'^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$')
    end_time: str = Field(..., regex=r'^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$')


class PricingInfo(BaseModel):
    adult: Optional[float] = None
    child: Optional[float] = None
    senior: Optional[float] = None
    student: Optional[float] = None
    currency: str = "USD"


# Schema for creating/updating POIs
class POIBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    category: POICategoryEnum
    subcategory: Optional[str] = None
    description: Optional[str] = None
    short_description: Optional[str] = Field(None, max_length=500)
    website: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    is_family_friendly: bool = False
    allows_photography: bool = True
    is_free: bool = False
    estimated_visit_duration: Optional[int] = None  # in minutes
    pricing: Optional[PricingInfo] = None


class POICreate(POIBase):
    location: LocationPoint


class POIUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    category: Optional[POICategoryEnum] = None
    subcategory: Optional[str] = None
    description: Optional[str] = None
    short_description: Optional[str] = Field(None, max_length=500)
    website: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    is_family_friendly: Optional[bool] = None
    allows_photography: Optional[bool] = None
    is_free: Optional[bool] = None
    estimated_visit_duration: Optional[int] = None
    pricing: Optional[PricingInfo] = None


# Opening hours schemas
class OpeningHoursBase(BaseModel):
    day_of_week: int = Field(..., ge=0, le=6)
    opens_at: Optional[str] = Field(None, regex=r'^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$')
    closes_at: Optional[str] = Field(None, regex=r'^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$')
    is_closed: bool = False
    is_24_hours: bool = False


class OpeningHoursCreate(OpeningHoursBase):
    pass


class OpeningHours(OpeningHoursBase):
    id: UUID
    poi_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Image schemas
class POIImageBase(BaseModel):
    url: str
    thumbnail_url: Optional[str] = None
    alt_text: Optional[str] = None
    caption: Optional[str] = None
    order_index: int = 0
    is_primary: bool = False


class POIImageCreate(POIImageBase):
    pass


class POIImage(POIImageBase):
    id: UUID
    poi_id: UUID
    width: Optional[int] = None
    height: Optional[int] = None
    file_size: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Review schemas
class ReviewBase(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    title: Optional[str] = Field(None, max_length=255)
    comment: Optional[str] = None
    visit_date: Optional[datetime] = None
    was_crowded: Optional[bool] = None
    wait_time_minutes: Optional[int] = None
    would_recommend: Optional[bool] = None


class ReviewCreate(ReviewBase):
    pass


class Review(ReviewBase):
    id: UUID
    poi_id: UUID
    user_id: UUID
    helpful_count: int = 0
    not_helpful_count: int = 0
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Audio guide schemas
class AudioGuideBase(BaseModel):
    language_code: str = Field(..., max_length=5)
    title: str = Field(..., max_length=255)
    description: Optional[str] = None
    audio_url: str
    transcript: Optional[str] = None
    duration_seconds: Optional[int] = None
    narrator_name: Optional[str] = None
    narrator_bio: Optional[str] = None


class AudioGuideCreate(AudioGuideBase):
    pass


class AudioGuide(AudioGuideBase):
    id: UUID
    poi_id: UUID
    download_count: int = 0
    play_count: int = 0
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# AR Experience schemas
class ARExperienceBase(BaseModel):
    name: str = Field(..., max_length=255)
    description: Optional[str] = None
    instructions: Optional[str] = None
    model_url: Optional[str] = None
    texture_url: Optional[str] = None
    animation_url: Optional[str] = None
    trigger_radius_meters: float = 50.0
    min_ios_version: Optional[str] = None
    min_android_version: Optional[str] = None
    requires_lidar: bool = False
    estimated_experience_duration: Optional[int] = None


class ARExperienceCreate(ARExperienceBase):
    trigger_location: Optional[LocationPoint] = None


class ARExperience(ARExperienceBase):
    id: UUID
    poi_id: UUID
    trigger_location: Optional[Dict[str, float]] = None
    file_size_mb: Optional[float] = None
    usage_count: int = 0
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Main POI schemas
class POI(POIBase):
    id: UUID
    slug: str
    location: Dict[str, float]  # {latitude: float, longitude: float}
    average_rating: float = 0.0
    review_count: int = 0
    popularity_score: float = 0.0
    view_count: int = 0
    has_audio_guide: bool = False
    has_ar_experience: bool = False
    is_active: bool = True
    is_verified: bool = False
    verification_date: Optional[datetime] = None
    last_updated: datetime
    created_at: datetime
    
    # Relationships
    opening_hours: List[OpeningHours] = []
    images: List[POIImage] = []
    audio_guides: List[AudioGuide] = []
    ar_experiences: List[ARExperience] = []

    class Config:
        from_attributes = True


class POISummary(BaseModel):
    """Lightweight POI representation for search results"""
    id: UUID
    name: str
    category: str
    location: Dict[str, float]
    average_rating: float
    review_count: int
    distance_km: Optional[float] = None
    primary_image_url: Optional[str] = None
    short_description: Optional[str] = None
    is_free: bool = False
    estimated_visit_duration: Optional[int] = None
    pricing: Optional[PricingInfo] = None

    class Config:
        from_attributes = True


# Search and filter schemas
class SearchFilters(BaseModel):
    category: Optional[List[POICategoryEnum]] = None
    is_free: Optional[bool] = None
    is_family_friendly: Optional[bool] = None
    allows_photography: Optional[bool] = None
    has_audio_guide: Optional[bool] = None
    has_ar_experience: Optional[bool] = None
    min_rating: Optional[float] = Field(None, ge=0, le=5)
    max_price: Optional[float] = None
    accessibility_features: Optional[List[AccessibilityTypeEnum]] = None
    open_now: Optional[bool] = None
    max_visit_duration: Optional[int] = None  # in minutes


class SearchRequest(BaseModel):
    query: Optional[str] = None
    location: LocationPoint
    radius_km: float = Field(10.0, gt=0, le=100)
    filters: Optional[SearchFilters] = None
    sort_by: SortByEnum = SortByEnum.RELEVANCE
    limit: int = Field(20, gt=0, le=100)
    offset: int = Field(0, ge=0)


class SearchResponse(BaseModel):
    results: List[POISummary]
    total_count: int
    has_more: bool
    search_time_ms: int
    filters_applied: Optional[SearchFilters] = None


# Recommendation schemas
class RecommendationRequest(BaseModel):
    user_id: Optional[UUID] = None
    location: Optional[LocationPoint] = None
    category_preferences: Optional[List[POICategoryEnum]] = None
    budget_range: Optional[str] = None  # budget, mid-range, luxury
    travel_style: Optional[List[str]] = None  # solo, family, group, etc.
    interests: Optional[List[str]] = None
    limit: int = Field(10, gt=0, le=50)


class RecommendationResponse(BaseModel):
    recommendations: List[POISummary]
    explanation: str
    confidence_score: float
    recommendation_type: str  # personalized, popular, trending, etc.


# Analytics schemas
class POIInteractionCreate(BaseModel):
    interaction_type: InteractionTypeEnum
    interaction_data: Optional[Dict[str, Any]] = None


class TrendingPOIResponse(BaseModel):
    poi: POISummary
    trend_score: float
    trend_direction: str  # rising, stable, falling
    change_percentage: float


# Crowd level schemas
class CrowdLevelUpdate(BaseModel):
    crowd_level: int = Field(..., ge=1, le=5)
    wait_time_minutes: Optional[int] = None
    source: str = "manual"


class CrowdLevelResponse(BaseModel):
    current_crowd_level: int
    current_wait_time: Optional[int] = None
    prediction_next_hour: Optional[int] = None
    best_visit_times: List[str] = []
    last_updated: datetime


# Error schemas
class ErrorResponse(BaseModel):
    error: str
    message: str
    details: Optional[Dict[str, Any]] = None


class ValidationErrorResponse(BaseModel):
    error: str = "validation_error"
    message: str
    validation_errors: List[Dict[str, Any]]


# Success response schemas
class SuccessResponse(BaseModel):
    success: bool = True
    message: str
    data: Optional[Any] = None


class BulkOperationResponse(BaseModel):
    success_count: int
    error_count: int
    errors: Optional[List[str]] = None
    data: Optional[List[Any]] = None