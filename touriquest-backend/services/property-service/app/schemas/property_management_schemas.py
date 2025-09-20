"""Pydantic schemas for property management operations"""

from datetime import datetime, date, time
from typing import Optional, Dict, List, Any, Union
from decimal import Decimal
from enum import Enum
from pydantic import BaseModel, Field, validator, root_validator
from uuid import UUID


class PropertyStatus(str, Enum):
    DRAFT = "draft"
    PENDING_REVIEW = "pending_review"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    ARCHIVED = "archived"


class VerificationStatus(str, Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    DOCUMENTS_PENDING = "documents_pending"
    PHOTOS_PENDING = "photos_pending"
    ADDRESS_PENDING = "address_pending"
    SAFETY_PENDING = "safety_pending"
    COMPLETED = "completed"
    REJECTED = "rejected"


class PricingStrategy(str, Enum):
    FIXED = "fixed"
    DYNAMIC = "dynamic"
    SEASONAL = "seasonal"
    DEMAND_BASED = "demand_based"
    COMPETITOR_BASED = "competitor_based"


class RoomType(str, Enum):
    ENTIRE_PLACE = "entire_place"
    PRIVATE_ROOM = "private_room"
    SHARED_ROOM = "shared_room"


class PropertyType(str, Enum):
    APARTMENT = "apartment"
    HOUSE = "house"
    CONDO = "condo"
    VILLA = "villa"
    HOTEL_ROOM = "hotel_room"
    UNIQUE_SPACE = "unique_space"


# Basic Property Schemas
class PropertyLocationRequest(BaseModel):
    address: str = Field(..., min_length=1, max_length=500)
    city: str = Field(..., min_length=1, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    country: str = Field(..., min_length=1, max_length=100)
    postal_code: Optional[str] = Field(None, max_length=20)
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)


class PropertyBasicInfo(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str = Field(..., min_length=10, max_length=5000)
    summary: Optional[str] = Field(None, max_length=1000)
    property_type: PropertyType
    room_type: RoomType
    accommodates: int = Field(..., ge=1, le=20)
    bedrooms: Optional[int] = Field(None, ge=0, le=10)
    beds: Optional[int] = Field(None, ge=0, le=20)
    bathrooms: Optional[float] = Field(None, ge=0.5, le=10)


class PropertyAmenityRequest(BaseModel):
    category: str = Field(..., min_length=1, max_length=50)
    amenity_type: str = Field(..., min_length=1, max_length=100)
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    is_available: bool = True
    additional_info: Optional[Dict[str, Any]] = None


class PropertyHouseRuleRequest(BaseModel):
    category: str = Field(..., min_length=1, max_length=50)
    rule_type: str = Field(..., min_length=1, max_length=100)
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    is_mandatory: bool = True
    order_index: int = Field(0, ge=0)


class PropertyPricingRequest(BaseModel):
    base_price: Decimal = Field(..., gt=0, decimal_places=2)
    currency: str = Field("USD", min_length=3, max_length=3)
    cleaning_fee: Optional[Decimal] = Field(None, ge=0, decimal_places=2)
    service_fee: Optional[Decimal] = Field(None, ge=0, decimal_places=2)
    security_deposit: Optional[Decimal] = Field(None, ge=0, decimal_places=2)
    pricing_strategy: PricingStrategy = PricingStrategy.FIXED


class PropertyBookingSettings(BaseModel):
    instant_book: bool = False
    minimum_stay: int = Field(1, ge=1, le=365)
    maximum_stay: int = Field(365, ge=1, le=365)
    advance_notice: int = Field(1, ge=0, le=30)
    preparation_time: int = Field(0, ge=0, le=7)
    check_in_time: Optional[time] = None
    check_out_time: Optional[time] = None
    smoking_allowed: bool = False
    pets_allowed: bool = False
    parties_allowed: bool = False
    children_allowed: bool = True
    additional_rules: Optional[str] = Field(None, max_length=2000)

    @validator('maximum_stay')
    def validate_maximum_stay(cls, v, values):
        if 'minimum_stay' in values and v < values['minimum_stay']:
            raise ValueError('Maximum stay must be greater than or equal to minimum stay')
        return v


class PropertySafetyFeatures(BaseModel):
    smoke_detector: bool = False
    carbon_monoxide_detector: bool = False
    fire_extinguisher: bool = False
    first_aid_kit: bool = False
    security_cameras: bool = False
    weapon_nearby: bool = False
    dangerous_animal: bool = False


class PropertyAccessibilityFeatures(BaseModel):
    wheelchair_accessible: bool = False
    step_free_access: bool = False
    wide_doorways: bool = False
    accessible_bathroom: bool = False
    accessible_parking: bool = False


# Property Creation Request
class PropertyCreateRequest(BaseModel):
    basic_info: PropertyBasicInfo
    location: PropertyLocationRequest
    pricing: PropertyPricingRequest
    booking_settings: PropertyBookingSettings
    amenities: List[PropertyAmenityRequest] = []
    house_rules: List[PropertyHouseRuleRequest] = []
    safety_features: PropertySafetyFeatures
    accessibility_features: PropertyAccessibilityFeatures
    space_description: Optional[str] = Field(None, max_length=2000)
    guest_access: Optional[str] = Field(None, max_length=1000)
    interaction_with_guests: Optional[str] = Field(None, max_length=1000)
    neighborhood_overview: Optional[str] = Field(None, max_length=1000)
    transit_info: Optional[str] = Field(None, max_length=1000)


# Property Update Request
class PropertyUpdateRequest(BaseModel):
    basic_info: Optional[PropertyBasicInfo] = None
    location: Optional[PropertyLocationRequest] = None
    pricing: Optional[PropertyPricingRequest] = None
    booking_settings: Optional[PropertyBookingSettings] = None
    amenities: Optional[List[PropertyAmenityRequest]] = None
    house_rules: Optional[List[PropertyHouseRuleRequest]] = None
    safety_features: Optional[PropertySafetyFeatures] = None
    accessibility_features: Optional[PropertyAccessibilityFeatures] = None
    space_description: Optional[str] = Field(None, max_length=2000)
    guest_access: Optional[str] = Field(None, max_length=1000)
    interaction_with_guests: Optional[str] = Field(None, max_length=1000)
    neighborhood_overview: Optional[str] = Field(None, max_length=1000)
    transit_info: Optional[str] = Field(None, max_length=1000)
    status: Optional[PropertyStatus] = None


# Image Management Schemas
class PropertyImageUploadRequest(BaseModel):
    image_type: str = Field("photo", regex="^(photo|360_tour|floor_plan)$")
    room_type: Optional[str] = Field(None, max_length=100)
    alt_text: Optional[str] = Field(None, max_length=255)
    caption: Optional[str] = Field(None, max_length=500)
    is_primary: bool = False
    order_index: int = Field(0, ge=0)
    tour_metadata: Optional[Dict[str, Any]] = None


class PropertyImageResponse(BaseModel):
    id: UUID
    url: str
    thumbnail_url: Optional[str]
    alt_text: Optional[str]
    caption: Optional[str]
    image_type: str
    room_type: Optional[str]
    order_index: int
    is_primary: bool
    is_360_tour: bool
    file_size: Optional[int]
    width: Optional[int]
    height: Optional[int]
    format: Optional[str]
    is_verified: bool
    verification_status: str
    created_at: datetime
    
    class Config:
        from_attributes = True


# Calendar Management Schemas
class AvailabilityUpdateRequest(BaseModel):
    start_date: date
    end_date: date
    is_available: bool
    blocked_reason: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = Field(None, max_length=500)
    minimum_stay_override: Optional[int] = Field(None, ge=1, le=365)

    @validator('end_date')
    def validate_end_date(cls, v, values):
        if 'start_date' in values and v < values['start_date']:
            raise ValueError('End date must be after start date')
        return v


class PricingUpdateRequest(BaseModel):
    start_date: date
    end_date: date
    base_price: Decimal = Field(..., gt=0, decimal_places=2)
    is_special_rate: bool = False
    special_rate_reason: Optional[str] = Field(None, max_length=100)
    minimum_stay_override: Optional[int] = Field(None, ge=1, le=365)

    @validator('end_date')
    def validate_end_date(cls, v, values):
        if 'start_date' in values and v < values['start_date']:
            raise ValueError('End date must be after start date')
        return v


class CalendarResponse(BaseModel):
    date: date
    is_available: bool
    availability_status: str
    base_price: Decimal
    final_price: Decimal
    minimum_stay: Optional[int]
    is_special_rate: bool
    booking_id: Optional[UUID]
    
    class Config:
        from_attributes = True


# Verification Schemas
class VerificationDocumentRequest(BaseModel):
    verification_type: str = Field(..., regex="^(documents|photos|address|safety)$")
    document_type: str = Field(..., min_length=1, max_length=100)
    document_url: str = Field(..., min_length=1, max_length=500)
    document_metadata: Optional[Dict[str, Any]] = None
    notes: Optional[str] = Field(None, max_length=1000)


class VerificationResponse(BaseModel):
    id: UUID
    verification_type: str
    document_type: Optional[str]
    status: str
    is_approved: Optional[bool]
    rejection_reason: Optional[str]
    notes: Optional[str]
    confidence_score: Optional[float]
    submitted_at: Optional[datetime]
    reviewed_at: Optional[datetime]
    
    class Config:
        from_attributes = True


# Analytics Schemas
class PropertyAnalyticsRequest(BaseModel):
    start_date: date
    end_date: date

    @validator('end_date')
    def validate_date_range(cls, v, values):
        if 'start_date' in values:
            if v < values['start_date']:
                raise ValueError('End date must be after start date')
            if (v - values['start_date']).days > 365:
                raise ValueError('Date range cannot exceed 365 days')
        return v


class PropertyAnalyticsResponse(BaseModel):
    property_id: UUID
    period_start: date
    period_end: date
    
    # Views and Engagement
    total_page_views: int
    unique_views: int
    total_inquiries: int
    booking_requests: int
    confirmed_bookings: int
    
    # Revenue Metrics
    total_revenue: Decimal
    average_daily_rate: Decimal
    occupancy_rate: float
    revenue_per_available_night: Decimal
    
    # Performance Metrics
    conversion_rate: float
    response_rate: float
    average_response_time_minutes: int
    
    # Rankings
    average_search_ranking: Optional[float]
    competitor_price_advantage: Optional[Decimal]
    
    class Config:
        from_attributes = True


# Quality Score Schema
class PropertyQualityScoreResponse(BaseModel):
    overall_score: float
    listing_quality_score: float
    photo_quality_score: float
    amenity_score: float
    location_score: float
    pricing_competitiveness: float
    
    # Detailed Metrics
    description_completeness: float
    photo_count: int
    amenity_count: int
    response_rate: float
    guest_satisfaction: float
    
    last_calculated: datetime
    recommendations: List[str] = []
    
    class Config:
        from_attributes = True


# Revenue Report Schema
class PropertyRevenueReportResponse(BaseModel):
    property_id: UUID
    report_period_start: date
    report_period_end: date
    
    # Revenue Breakdown
    gross_revenue: Decimal
    service_fees: Decimal
    cleaning_fees: Decimal
    net_revenue: Decimal
    
    # Booking Statistics
    total_nights_booked: int
    total_bookings: int
    average_booking_value: Decimal
    occupancy_rate: float
    
    # Performance Metrics
    revenue_per_available_night: Decimal
    year_over_year_growth: Optional[float]
    
    generated_at: datetime
    
    class Config:
        from_attributes = True


# Pricing Optimization Schemas
class PricingOptimizationRequest(BaseModel):
    property_id: UUID
    start_date: date
    end_date: date
    optimization_goals: List[str] = ["revenue", "occupancy"]  # revenue, occupancy, both
    
    @validator('end_date')
    def validate_date_range(cls, v, values):
        if 'start_date' in values:
            if v < values['start_date']:
                raise ValueError('End date must be after start date')
            if (v - values['start_date']).days > 90:
                raise ValueError('Optimization period cannot exceed 90 days')
        return v


class PricingRecommendation(BaseModel):
    date: date
    current_price: Decimal
    recommended_price: Decimal
    price_change_percentage: float
    confidence_score: float
    reasoning: str
    expected_impact: Dict[str, float]  # occupancy_change, revenue_change


class PricingOptimizationResponse(BaseModel):
    property_id: UUID
    optimization_period_start: date
    optimization_period_end: date
    recommendations: List[PricingRecommendation]
    summary: Dict[str, Any]
    generated_at: datetime


# Dynamic Pricing Rule Schemas
class PricingRuleRequest(BaseModel):
    rule_name: str = Field(..., min_length=1, max_length=255)
    rule_type: str = Field(..., regex="^(seasonal|demand|competitor|event)$")
    conditions: Dict[str, Any]
    adjustment_type: str = Field(..., regex="^(percentage|fixed_amount)$")
    adjustment_value: float
    minimum_price: Optional[Decimal] = Field(None, gt=0)
    maximum_price: Optional[Decimal] = Field(None, gt=0)
    priority: int = Field(0, ge=0, le=100)
    is_active: bool = True

    @validator('maximum_price')
    def validate_price_range(cls, v, values):
        if v and 'minimum_price' in values and values['minimum_price']:
            if v <= values['minimum_price']:
                raise ValueError('Maximum price must be greater than minimum price')
        return v


class PricingRuleResponse(BaseModel):
    id: UUID
    rule_name: str
    rule_type: str
    conditions: Dict[str, Any]
    adjustment_type: str
    adjustment_value: float
    minimum_price: Optional[Decimal]
    maximum_price: Optional[Decimal]
    priority: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# Property Response Schema
class PropertyDetailResponse(BaseModel):
    id: UUID
    host_id: UUID
    
    # Basic Information
    title: str
    description: str
    summary: Optional[str]
    property_type: str
    room_type: str
    accommodates: int
    bedrooms: Optional[int]
    beds: Optional[int]
    bathrooms: Optional[float]
    
    # Location
    address: str
    city: str
    state: Optional[str]
    country: str
    postal_code: Optional[str]
    coordinates: Optional[Dict[str, float]]
    
    # Status
    status: str
    verification_status: str
    quality_score: float
    
    # Pricing
    base_price: Decimal
    currency: str
    cleaning_fee: Optional[Decimal]
    service_fee: Optional[Decimal]
    security_deposit: Optional[Decimal]
    pricing_strategy: str
    
    # Settings
    instant_book: bool
    minimum_stay: int
    maximum_stay: int
    check_in_time: Optional[time]
    check_out_time: Optional[time]
    
    # Features
    safety_features: Dict[str, bool]
    accessibility_features: Dict[str, bool]
    
    # Relationships
    amenities: List[Dict[str, Any]]
    images: List[PropertyImageResponse]
    house_rules: List[Dict[str, Any]]
    
    # Performance
    total_bookings: int
    total_revenue: Decimal
    average_rating: float
    response_rate: float
    
    # Timestamps
    created_at: datetime
    updated_at: datetime
    published_at: Optional[datetime]
    
    class Config:
        from_attributes = True


# Property List Response
class PropertyListResponse(BaseModel):
    properties: List[PropertyDetailResponse]
    total: int
    page: int
    page_size: int
    has_next: bool
    has_previous: bool