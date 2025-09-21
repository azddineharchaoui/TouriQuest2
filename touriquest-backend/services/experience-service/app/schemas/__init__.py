"""
Pydantic schemas for Experience Service API
"""

from datetime import datetime, date, time
from typing import Optional, List, Dict, Any, Union
from uuid import UUID
from decimal import Decimal
from enum import Enum

from pydantic import BaseModel, Field, validator, ConfigDict
from pydantic.types import EmailStr, HttpUrl


# Enums
class ExperienceCategory(str, Enum):
    CULTURAL_WORKSHOPS = "cultural_workshops"
    FOOD_CULINARY = "food_culinary"
    ADVENTURE_OUTDOOR = "adventure_outdoor"
    PHOTOGRAPHY = "photography"
    WELLNESS_SPA = "wellness_spa"
    PRIVATE_GUIDES = "private_guides"


class SkillLevel(str, Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"
    ALL_LEVELS = "all_levels"


class BookingStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    COMPLETED = "completed"
    NO_SHOW = "no_show"
    REFUNDED = "refunded"


class WeatherDependency(str, Enum):
    NONE = "none"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ProviderStatus(str, Enum):
    PENDING = "pending"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    REJECTED = "rejected"
    UNDER_REVIEW = "under_review"


# Base schemas
class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class LocationPoint(BaseSchema):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)


class PaginationParams(BaseSchema):
    page: int = Field(1, ge=1)
    size: int = Field(20, ge=1, le=100)


class SearchFilters(BaseSchema):
    query: Optional[str] = None
    category: Optional[ExperienceCategory] = None
    location: Optional[LocationPoint] = None
    radius_km: Optional[float] = Field(None, ge=0, le=100)
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    min_price: Optional[float] = Field(None, ge=0)
    max_price: Optional[float] = Field(None, ge=0)
    skill_level: Optional[SkillLevel] = None
    min_rating: Optional[float] = Field(None, ge=0, le=5)
    group_size: Optional[int] = Field(None, ge=1)
    languages: Optional[List[str]] = None
    instant_book: Optional[bool] = None
    weather_independent: Optional[bool] = None
    accessibility_required: Optional[bool] = None


# Provider schemas
class ProviderBase(BaseSchema):
    business_name: str = Field(..., min_length=2, max_length=200)
    business_description: Optional[str] = None
    business_type: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: EmailStr
    website: Optional[HttpUrl] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    languages: List[str] = ["en"]


class ProviderCreate(ProviderBase):
    user_id: UUID
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)


class ProviderUpdate(BaseSchema):
    business_name: Optional[str] = Field(None, min_length=2, max_length=200)
    business_description: Optional[str] = None
    business_type: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[HttpUrl] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    languages: Optional[List[str]] = None
    auto_accept_bookings: Optional[bool] = None
    instant_book_enabled: Optional[bool] = None
    advance_notice_hours: Optional[int] = Field(None, ge=0)


class ProviderCertification(BaseSchema):
    certification_name: str
    certification_type: Optional[str] = None
    issuing_organization: Optional[str] = None
    certification_number: Optional[str] = None
    issue_date: Optional[date] = None
    expiry_date: Optional[date] = None
    document_url: Optional[str] = None


class Provider(ProviderBase):
    id: UUID
    user_id: UUID
    status: ProviderStatus
    is_verified: bool = False
    insurance_verified: bool = False
    total_experiences: int = 0
    total_bookings: int = 0
    total_revenue: Decimal = Decimal('0.00')
    average_rating: float = 0.0
    response_rate: float = 0.0
    response_time_minutes: int = 0
    quality_score: float = 0.0
    reliability_score: float = 0.0
    safety_score: float = 0.0
    profile_completion_percentage: float = 0.0
    onboarding_completed: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_active_at: Optional[datetime] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    certifications: List[ProviderCertification] = []


# Experience schemas
class ExperienceImage(BaseSchema):
    id: UUID
    url: str
    thumbnail_url: Optional[str] = None
    alt_text: Optional[str] = None
    caption: Optional[str] = None
    image_type: Optional[str] = None
    order_index: int = 0
    is_primary: bool = False


class ExperienceImageCreate(BaseSchema):
    url: str
    thumbnail_url: Optional[str] = None
    alt_text: Optional[str] = None
    caption: Optional[str] = None
    image_type: Optional[str] = None
    order_index: int = 0
    is_primary: bool = False


class ExperienceInclusion(BaseSchema):
    category: str
    item: str
    description: Optional[str] = None
    is_optional: bool = False
    additional_cost: Optional[Decimal] = None


class ExperienceRequirement(BaseSchema):
    requirement_type: str
    requirement: str
    description: Optional[str] = None
    is_mandatory: bool = True


class ExperienceBase(BaseSchema):
    title: str = Field(..., min_length=5, max_length=300)
    description: str = Field(..., min_length=50)
    short_description: Optional[str] = Field(None, max_length=500)
    category: ExperienceCategory
    subcategory: Optional[str] = None
    duration_minutes: int = Field(..., gt=0)
    skill_level: SkillLevel = SkillLevel.ALL_LEVELS
    min_age: int = Field(0, ge=0)
    max_age: Optional[int] = Field(None, ge=0)
    physical_difficulty: int = Field(1, ge=1, le=5)
    min_participants: int = Field(1, ge=1)
    max_participants: int = Field(..., gt=0)
    private_group_available: bool = False
    meeting_point: str = Field(..., min_length=10)
    base_price: Decimal = Field(..., gt=0)
    currency: str = Field("USD", min_length=3, max_length=3)
    languages_offered: List[str] = ["en"]
    weather_dependency: WeatherDependency = WeatherDependency.NONE
    instant_book: bool = False
    advance_booking_hours: int = Field(24, ge=0)
    max_advance_booking_days: int = Field(365, ge=1)

    @validator('max_participants')
    def validate_max_participants(cls, v, values):
        if 'min_participants' in values and v < values['min_participants']:
            raise ValueError('max_participants must be >= min_participants')
        return v

    @validator('max_age')
    def validate_max_age(cls, v, values):
        if v is not None and 'min_age' in values and v < values['min_age']:
            raise ValueError('max_age must be >= min_age')
        return v


class ExperienceCreate(ExperienceBase):
    provider_id: UUID
    meeting_point_latitude: Optional[float] = Field(None, ge=-90, le=90)
    meeting_point_longitude: Optional[float] = Field(None, ge=-180, le=180)
    end_point: Optional[str] = None
    end_point_latitude: Optional[float] = Field(None, ge=-90, le=90)
    end_point_longitude: Optional[float] = Field(None, ge=-180, le=180)
    price_includes: List[str] = []
    price_excludes: List[str] = []
    equipment_provided: List[str] = []
    equipment_required: List[str] = []
    what_to_bring: List[str] = []
    dress_code: Optional[str] = None
    accessibility_info: Optional[str] = None
    dietary_accommodations: List[str] = []
    special_requirements: Optional[str] = None
    cancellation_policy: Optional[str] = None
    refund_policy: Optional[str] = None
    weather_conditions: Optional[str] = None
    seasonal_availability: Optional[Dict[str, Any]] = None
    indoor_alternative: bool = False
    indoor_alternative_description: Optional[str] = None
    tags: List[str] = []
    inclusions: List[ExperienceInclusion] = []
    requirements: List[ExperienceRequirement] = []
    images: List[ExperienceImageCreate] = []


class ExperienceUpdate(BaseSchema):
    title: Optional[str] = Field(None, min_length=5, max_length=300)
    description: Optional[str] = Field(None, min_length=50)
    short_description: Optional[str] = Field(None, max_length=500)
    category: Optional[ExperienceCategory] = None
    subcategory: Optional[str] = None
    duration_minutes: Optional[int] = Field(None, gt=0)
    skill_level: Optional[SkillLevel] = None
    min_age: Optional[int] = Field(None, ge=0)
    max_age: Optional[int] = Field(None, ge=0)
    physical_difficulty: Optional[int] = Field(None, ge=1, le=5)
    min_participants: Optional[int] = Field(None, ge=1)
    max_participants: Optional[int] = Field(None, gt=0)
    private_group_available: Optional[bool] = None
    meeting_point: Optional[str] = Field(None, min_length=10)
    base_price: Optional[Decimal] = Field(None, gt=0)
    currency: Optional[str] = Field(None, min_length=3, max_length=3)
    languages_offered: Optional[List[str]] = None
    weather_dependency: Optional[WeatherDependency] = None
    instant_book: Optional[bool] = None
    advance_booking_hours: Optional[int] = Field(None, ge=0)
    max_advance_booking_days: Optional[int] = Field(None, ge=1)
    is_active: Optional[bool] = None
    is_published: Optional[bool] = None


class Experience(ExperienceBase):
    id: UUID
    provider_id: UUID
    meeting_point_latitude: Optional[float] = None
    meeting_point_longitude: Optional[float] = None
    end_point: Optional[str] = None
    end_point_latitude: Optional[float] = None
    end_point_longitude: Optional[float] = None
    price_includes: List[str] = []
    price_excludes: List[str] = []
    equipment_provided: List[str] = []
    equipment_required: List[str] = []
    what_to_bring: List[str] = []
    dress_code: Optional[str] = None
    accessibility_info: Optional[str] = None
    dietary_accommodations: List[str] = []
    special_requirements: Optional[str] = None
    cancellation_policy: Optional[str] = None
    refund_policy: Optional[str] = None
    weather_conditions: Optional[str] = None
    seasonal_availability: Optional[Dict[str, Any]] = None
    indoor_alternative: bool = False
    indoor_alternative_description: Optional[str] = None
    is_active: bool = True
    is_featured: bool = False
    is_published: bool = False
    approval_status: str = "pending"
    total_bookings: int = 0
    total_reviews: int = 0
    average_rating: float = 0.0
    popularity_score: float = 0.0
    quality_score: float = 0.0
    tags: List[str] = []
    created_at: datetime
    updated_at: Optional[datetime] = None
    first_available_date: Optional[date] = None
    last_available_date: Optional[date] = None
    provider: Optional[Provider] = None
    images: List[ExperienceImage] = []
    inclusions: List[ExperienceInclusion] = []
    requirements: List[ExperienceRequirement] = []


# Schedule schemas
class ExperienceScheduleBase(BaseSchema):
    date: date
    start_time: time
    end_time: time
    timezone: str = "UTC"
    max_participants: int = Field(..., gt=0)
    price_override: Optional[Decimal] = Field(None, gt=0)
    special_pricing_reason: Optional[str] = None
    is_private: bool = False
    guide_notes: Optional[str] = None
    public_notes: Optional[str] = None

    @validator('end_time')
    def validate_end_time(cls, v, values):
        if 'start_time' in values and v <= values['start_time']:
            raise ValueError('end_time must be after start_time')
        return v


class ExperienceScheduleCreate(ExperienceScheduleBase):
    experience_id: UUID


class ExperienceScheduleUpdate(BaseSchema):
    date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    timezone: Optional[str] = None
    max_participants: Optional[int] = Field(None, gt=0)
    available_spots: Optional[int] = Field(None, ge=0)
    price_override: Optional[Decimal] = Field(None, gt=0)
    special_pricing_reason: Optional[str] = None
    is_available: Optional[bool] = None
    is_private: Optional[bool] = None
    guide_notes: Optional[str] = None
    public_notes: Optional[str] = None


class ExperienceSchedule(ExperienceScheduleBase):
    id: UUID
    experience_id: UUID
    available_spots: int
    booked_spots: int = 0
    is_available: bool = True
    weather_status: Optional[str] = None
    last_weather_check: Optional[datetime] = None
    internal_notes: Optional[str] = None
    booking_deadline: Optional[datetime] = None
    cancellation_deadline: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


# Booking schemas
class ParticipantInfo(BaseSchema):
    name: str = Field(..., min_length=2, max_length=100)
    age: Optional[int] = Field(None, ge=0, le=120)
    emergency_contact: Optional[str] = None
    special_requirements: Optional[str] = None


class ExperienceBookingBase(BaseSchema):
    participants_count: int = Field(..., ge=1)
    is_private_booking: bool = False
    lead_participant_name: str = Field(..., min_length=2, max_length=200)
    lead_participant_email: EmailStr
    lead_participant_phone: Optional[str] = None
    dietary_restrictions: List[str] = []
    accessibility_needs: Optional[str] = None
    special_requests: Optional[str] = None
    booking_message: Optional[str] = None


class ExperienceBookingCreate(ExperienceBookingBase):
    experience_id: UUID
    schedule_id: UUID
    user_id: UUID
    participant_details: List[ParticipantInfo] = []
    equipment_sizes: Optional[Dict[str, str]] = None
    emergency_contact: Optional[Dict[str, str]] = None
    age_verification_completed: bool = False
    guardian_consent: bool = False

    @validator('participant_details')
    def validate_participant_details(cls, v, values):
        if 'participants_count' in values and len(v) != values['participants_count']:
            raise ValueError('participant_details must match participants_count')
        return v


class ExperienceBookingUpdate(BaseSchema):
    participants_count: Optional[int] = Field(None, ge=1)
    lead_participant_name: Optional[str] = Field(None, min_length=2, max_length=200)
    lead_participant_email: Optional[EmailStr] = None
    lead_participant_phone: Optional[str] = None
    dietary_restrictions: Optional[List[str]] = None
    accessibility_needs: Optional[str] = None
    special_requests: Optional[str] = None
    participant_details: Optional[List[ParticipantInfo]] = None
    equipment_sizes: Optional[Dict[str, str]] = None
    status: Optional[BookingStatus] = None
    provider_response: Optional[str] = None
    cancellation_reason: Optional[str] = None


class ExperienceBooking(ExperienceBookingBase):
    id: UUID
    experience_id: UUID
    schedule_id: UUID
    user_id: UUID
    booking_reference: str
    participant_details: List[ParticipantInfo] = []
    equipment_sizes: Optional[Dict[str, str]] = None
    emergency_contact: Optional[Dict[str, str]] = None
    age_verification_required: bool = False
    age_verification_completed: bool = False
    minors_in_group: bool = False
    guardian_consent: bool = False
    base_price: Decimal
    total_price: Decimal
    discount_amount: Decimal = Decimal('0.00')
    tax_amount: Decimal = Decimal('0.00')
    platform_fee: Decimal = Decimal('0.00')
    currency: str = "USD"
    status: BookingStatus = BookingStatus.PENDING
    confirmation_code: Optional[str] = None
    provider_response_deadline: Optional[datetime] = None
    auto_confirm_at: Optional[datetime] = None
    provider_response: Optional[str] = None
    cancellation_reason: Optional[str] = None
    internal_notes: Optional[str] = None
    checked_in_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    no_show: bool = False
    customer_reviewed: bool = False
    provider_reviewed: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    experience: Optional[Experience] = None
    schedule: Optional[ExperienceSchedule] = None


# Review schemas
class ExperienceReviewBase(BaseSchema):
    overall_rating: int = Field(..., ge=1, le=5)
    guide_rating: Optional[int] = Field(None, ge=1, le=5)
    value_rating: Optional[int] = Field(None, ge=1, le=5)
    organization_rating: Optional[int] = Field(None, ge=1, le=5)
    communication_rating: Optional[int] = Field(None, ge=1, le=5)
    title: Optional[str] = Field(None, max_length=200)
    comment: Optional[str] = None
    pros: List[str] = []
    cons: List[str] = []
    travel_type: Optional[str] = None


class ExperienceReviewCreate(ExperienceReviewBase):
    experience_id: UUID
    booking_id: Optional[UUID] = None
    user_id: UUID
    experience_date: Optional[date] = None
    group_size: Optional[int] = Field(None, ge=1)


class ExperienceReviewUpdate(BaseSchema):
    title: Optional[str] = Field(None, max_length=200)
    comment: Optional[str] = None
    pros: Optional[List[str]] = None
    cons: Optional[List[str]] = None
    provider_response: Optional[str] = None


class ExperienceReview(ExperienceReviewBase):
    id: UUID
    experience_id: UUID
    booking_id: Optional[UUID] = None
    user_id: UUID
    experience_date: Optional[date] = None
    group_size: Optional[int] = None
    helpful_votes: int = 0
    total_votes: int = 0
    is_verified: bool = False
    is_featured: bool = False
    moderation_status: str = "pending"
    provider_response: Optional[str] = None
    provider_response_date: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


# Search and recommendation schemas
class ExperienceSearchResult(BaseSchema):
    experience: Experience
    distance_km: Optional[float] = None
    relevance_score: float = 0.0
    next_available_date: Optional[date] = None
    lowest_price: Optional[Decimal] = None
    weather_risk: Optional[str] = None


class ExperienceSearchResponse(BaseSchema):
    results: List[ExperienceSearchResult]
    total_count: int
    page: int
    size: int
    filters_applied: SearchFilters
    aggregations: Optional[Dict[str, Any]] = None


class RecommendationParams(BaseSchema):
    user_id: Optional[UUID] = None
    experience_id: Optional[UUID] = None
    location: Optional[LocationPoint] = None
    limit: int = Field(10, ge=1, le=50)
    recommendation_type: str = "general"  # general, similar, popular, personalized


class RecommendationResult(BaseSchema):
    experience: Experience
    recommendation_score: float
    recommendation_reason: str
    similarity_factors: List[str] = []


# Weather schemas
class WeatherInfo(BaseSchema):
    date: date
    temperature_min: Optional[float] = None
    temperature_max: Optional[float] = None
    humidity: Optional[float] = None
    wind_speed: Optional[float] = None
    precipitation_probability: Optional[float] = None
    weather_condition: Optional[str] = None
    weather_description: Optional[str] = None
    is_suitable_for_outdoor: Optional[bool] = None
    risk_level: Optional[str] = None
    recommendations: List[str] = []


# Analytics schemas
class ExperienceAnalytics(BaseSchema):
    experience_id: UUID
    period_start: date
    period_end: date
    total_views: int = 0
    total_bookings: int = 0
    total_revenue: Decimal = Decimal('0.00')
    conversion_rate: float = 0.0
    average_group_size: float = 0.0
    cancellation_rate: float = 0.0
    no_show_rate: float = 0.0
    average_rating: float = 0.0
    total_reviews: int = 0


class ProviderAnalytics(BaseSchema):
    provider_id: UUID
    period_start: date
    period_end: date
    total_experiences: int = 0
    active_experiences: int = 0
    total_bookings: int = 0
    total_revenue: Decimal = Decimal('0.00')
    average_booking_value: Decimal = Decimal('0.00')
    response_rate: float = 0.0
    average_response_time_hours: float = 0.0
    customer_satisfaction: float = 0.0
    repeat_customer_rate: float = 0.0


# Utility response schemas
class SuccessResponse(BaseSchema):
    success: bool = True
    message: str
    data: Optional[Dict[str, Any]] = None


class ErrorResponse(BaseSchema):
    success: bool = False
    error: str
    details: Optional[Dict[str, Any]] = None


class HealthCheck(BaseSchema):
    status: str = "healthy"
    timestamp: datetime
    version: str
    database: bool = True
    redis: bool = True
    external_services: Dict[str, bool] = {}


# Category information
class CategoryInfo(BaseSchema):
    category: ExperienceCategory
    name: str
    description: str
    icon: Optional[str] = None
    experience_count: int = 0
    average_price: Optional[Decimal] = None
    popular_subcategories: List[str] = []