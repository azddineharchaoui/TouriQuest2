"""Enhanced property management models for comprehensive property management system"""

import uuid
from datetime import datetime, date, time
from typing import Optional, Dict, List, Any
from decimal import Decimal
from enum import Enum
from sqlalchemy import (
    Column, String, Text, Integer, Float, Boolean, DateTime, Date, Time,
    ForeignKey, JSON, Numeric, ARRAY, Index
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from geoalchemy2 import Geometry

from app.models.property_models import Property  # Base property model

Base = declarative_base()


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


class PropertyListing(Base):
    """Enhanced property listing with comprehensive management features"""
    __tablename__ = "property_listings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    host_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    
    # Basic Information
    title = Column(String(255), nullable=False)
    description = Column(Text)
    summary = Column(Text)
    space_description = Column(Text)
    guest_access = Column(Text)
    interaction_with_guests = Column(Text)
    neighborhood_overview = Column(Text)
    transit_info = Column(Text)
    
    # Property Details
    property_type = Column(String(50), nullable=False)
    room_type = Column(String(50), nullable=False)  # entire_place, private_room, shared_room
    accommodates = Column(Integer, nullable=False)
    bedrooms = Column(Integer)
    beds = Column(Integer)
    bathrooms = Column(Float)
    
    # Location
    address = Column(Text)
    city = Column(String(100))
    state = Column(String(100))
    country = Column(String(100))
    postal_code = Column(String(20))
    coordinates = Column(Geometry('POINT'))
    
    # Status and Verification
    status = Column(String(20), default=PropertyStatus.DRAFT.value)
    verification_status = Column(String(20), default=VerificationStatus.NOT_STARTED.value)
    quality_score = Column(Float, default=0.0)
    listing_score = Column(Float, default=0.0)
    
    # Pricing
    base_price = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default='USD')
    cleaning_fee = Column(Numeric(10, 2), default=0)
    service_fee = Column(Numeric(10, 2), default=0)
    security_deposit = Column(Numeric(10, 2), default=0)
    pricing_strategy = Column(String(20), default=PricingStrategy.FIXED.value)
    
    # Booking Settings
    instant_book = Column(Boolean, default=False)
    minimum_stay = Column(Integer, default=1)
    maximum_stay = Column(Integer, default=365)
    advance_notice = Column(Integer, default=1)  # days
    preparation_time = Column(Integer, default=0)  # days
    
    # House Rules
    check_in_time = Column(Time)
    check_out_time = Column(Time)
    smoking_allowed = Column(Boolean, default=False)
    pets_allowed = Column(Boolean, default=False)
    parties_allowed = Column(Boolean, default=False)
    children_allowed = Column(Boolean, default=True)
    additional_rules = Column(Text)
    
    # Safety and Accessibility
    safety_features = Column(JSON)  # smoke_detector, carbon_monoxide_detector, etc.
    accessibility_features = Column(JSON)  # wheelchair_accessible, etc.
    
    # Performance Metrics
    total_bookings = Column(Integer, default=0)
    total_revenue = Column(Numeric(12, 2), default=0)
    average_rating = Column(Float, default=0.0)
    response_rate = Column(Float, default=0.0)
    response_time = Column(Integer)  # minutes
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    published_at = Column(DateTime)
    last_modified_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    
    # Relationships
    amenities = relationship("PropertyAmenityDetail", back_populates="property", cascade="all, delete-orphan")
    images = relationship("PropertyImageDetail", back_populates="property", cascade="all, delete-orphan")
    pricing_calendar = relationship("PricingCalendar", back_populates="property", cascade="all, delete-orphan")
    availability_calendar = relationship("AvailabilityCalendar", back_populates="property", cascade="all, delete-orphan")
    house_rules = relationship("PropertyHouseRule", back_populates="property", cascade="all, delete-orphan")
    verification_documents = relationship("PropertyVerification", back_populates="property", cascade="all, delete-orphan")
    analytics = relationship("PropertyAnalytics", back_populates="property", cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        Index('idx_property_status', 'status'),
        Index('idx_property_host', 'host_id'),
        Index('idx_property_location', 'city', 'country'),
        Index('idx_property_coordinates', 'coordinates'),
        Index('idx_property_price', 'base_price'),
    )


class PropertyAmenityDetail(Base):
    """Enhanced amenity management with categories and descriptions"""
    __tablename__ = "property_amenities_detail"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(UUID(as_uuid=True), ForeignKey('property_listings.id'), nullable=False)
    
    category = Column(String(50), nullable=False)  # essentials, features, safety, etc.
    amenity_type = Column(String(100), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    is_available = Column(Boolean, default=True)
    additional_info = Column(JSON)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    property = relationship("PropertyListing", back_populates="amenities")


class PropertyImageDetail(Base):
    """Enhanced image management with 360° tours and metadata"""
    __tablename__ = "property_images_detail"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(UUID(as_uuid=True), ForeignKey('property_listings.id'), nullable=False)
    
    url = Column(String(500), nullable=False)
    thumbnail_url = Column(String(500))
    alt_text = Column(String(255))
    caption = Column(Text)
    
    image_type = Column(String(50), default='photo')  # photo, 360_tour, floor_plan
    room_type = Column(String(100))  # living_room, bedroom, kitchen, etc.
    order_index = Column(Integer, default=0)
    is_primary = Column(Boolean, default=False)
    
    # Image Metadata
    file_size = Column(Integer)
    width = Column(Integer)
    height = Column(Integer)
    format = Column(String(10))
    
    # 360° Tour Specific
    is_360_tour = Column(Boolean, default=False)
    tour_metadata = Column(JSON)  # hotspots, navigation points, etc.
    
    # Verification
    is_verified = Column(Boolean, default=False)
    verification_status = Column(String(20), default='pending')
    verification_notes = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    property = relationship("PropertyListing", back_populates="images")


class PricingCalendar(Base):
    """Pricing calendar with seasonal rates and dynamic pricing"""
    __tablename__ = "pricing_calendar"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(UUID(as_uuid=True), ForeignKey('property_listings.id'), nullable=False)
    
    date = Column(Date, nullable=False)
    base_price = Column(Numeric(10, 2), nullable=False)
    discounted_price = Column(Numeric(10, 2))
    final_price = Column(Numeric(10, 2), nullable=False)
    
    # Pricing Factors
    seasonal_multiplier = Column(Float, default=1.0)
    demand_multiplier = Column(Float, default=1.0)
    competitor_factor = Column(Float, default=1.0)
    
    # Special Pricing
    is_special_rate = Column(Boolean, default=False)
    special_rate_reason = Column(String(100))
    
    # Minimum Stay for this date
    minimum_stay_override = Column(Integer)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    property = relationship("PropertyListing", back_populates="pricing_calendar")
    
    # Indexes
    __table_args__ = (
        Index('idx_pricing_calendar_property_date', 'property_id', 'date'),
    )


class AvailabilityCalendar(Base):
    """Availability calendar with booking management"""
    __tablename__ = "availability_calendar"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(UUID(as_uuid=True), ForeignKey('property_listings.id'), nullable=False)
    
    date = Column(Date, nullable=False)
    is_available = Column(Boolean, default=True)
    availability_status = Column(String(20), default='available')  # available, booked, blocked, maintenance
    
    # Booking Information
    booking_id = Column(UUID(as_uuid=True), ForeignKey('bookings.id'))
    blocked_reason = Column(String(100))
    notes = Column(Text)
    
    # Minimum Stay for this date
    minimum_stay_override = Column(Integer)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    property = relationship("PropertyListing", back_populates="availability_calendar")
    
    # Indexes
    __table_args__ = (
        Index('idx_availability_calendar_property_date', 'property_id', 'date'),
        Index('idx_availability_status', 'availability_status'),
    )


class PropertyHouseRule(Base):
    """Detailed house rules management"""
    __tablename__ = "property_house_rules"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(UUID(as_uuid=True), ForeignKey('property_listings.id'), nullable=False)
    
    category = Column(String(50), nullable=False)  # check_in, safety, general, etc.
    rule_type = Column(String(100), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    is_mandatory = Column(Boolean, default=True)
    order_index = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    property = relationship("PropertyListing", back_populates="house_rules")


class PropertyVerification(Base):
    """Property verification tracking and documentation"""
    __tablename__ = "property_verification"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(UUID(as_uuid=True), ForeignKey('property_listings.id'), nullable=False)
    
    verification_type = Column(String(50), nullable=False)  # documents, photos, address, safety
    status = Column(String(20), default='pending')
    
    # Document Information
    document_type = Column(String(100))
    document_url = Column(String(500))
    document_metadata = Column(JSON)
    
    # Verification Details
    submitted_at = Column(DateTime)
    reviewed_at = Column(DateTime)
    verified_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    
    # Results
    is_approved = Column(Boolean)
    rejection_reason = Column(Text)
    notes = Column(Text)
    confidence_score = Column(Float)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    property = relationship("PropertyListing", back_populates="verification_documents")


class PropertyAnalytics(Base):
    """Property performance analytics and metrics"""
    __tablename__ = "property_analytics"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(UUID(as_uuid=True), ForeignKey('property_listings.id'), nullable=False)
    
    date = Column(Date, nullable=False)
    
    # Views and Engagement
    page_views = Column(Integer, default=0)
    unique_views = Column(Integer, default=0)
    inquiries = Column(Integer, default=0)
    booking_requests = Column(Integer, default=0)
    confirmed_bookings = Column(Integer, default=0)
    
    # Revenue Metrics
    revenue_earned = Column(Numeric(10, 2), default=0)
    average_daily_rate = Column(Numeric(10, 2), default=0)
    occupancy_rate = Column(Float, default=0.0)
    
    # Performance Metrics
    conversion_rate = Column(Float, default=0.0)  # bookings/views
    response_rate = Column(Float, default=0.0)
    response_time_minutes = Column(Integer, default=0)
    
    # Ranking and Positioning
    search_ranking_position = Column(Float)
    competitor_price_difference = Column(Numeric(10, 2))
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    property = relationship("PropertyListing", back_populates="analytics")
    
    # Indexes
    __table_args__ = (
        Index('idx_property_analytics_date', 'property_id', 'date'),
    )


class PricingRule(Base):
    """Dynamic pricing rules and strategies"""
    __tablename__ = "pricing_rules"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(UUID(as_uuid=True), ForeignKey('property_listings.id'), nullable=False)
    
    rule_name = Column(String(255), nullable=False)
    rule_type = Column(String(50), nullable=False)  # seasonal, demand, competitor, event
    
    # Rule Conditions
    conditions = Column(JSON)  # date ranges, occupancy thresholds, etc.
    
    # Price Adjustments
    adjustment_type = Column(String(20), nullable=False)  # percentage, fixed_amount
    adjustment_value = Column(Float, nullable=False)
    minimum_price = Column(Numeric(10, 2))
    maximum_price = Column(Numeric(10, 2))
    
    # Rule Settings
    is_active = Column(Boolean, default=True)
    priority = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class PropertyQualityScore(Base):
    """Property quality scoring system"""
    __tablename__ = "property_quality_scores"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(UUID(as_uuid=True), ForeignKey('property_listings.id'), nullable=False)
    
    # Quality Scores (0-100)
    overall_score = Column(Float, default=0.0)
    listing_quality_score = Column(Float, default=0.0)
    photo_quality_score = Column(Float, default=0.0)
    amenity_score = Column(Float, default=0.0)
    location_score = Column(Float, default=0.0)
    pricing_competitiveness = Column(Float, default=0.0)
    
    # Individual Metrics
    description_completeness = Column(Float, default=0.0)
    photo_count = Column(Integer, default=0)
    amenity_count = Column(Integer, default=0)
    response_rate = Column(Float, default=0.0)
    guest_satisfaction = Column(Float, default=0.0)
    
    # Scoring Metadata
    last_calculated = Column(DateTime, default=datetime.utcnow)
    calculation_version = Column(String(10), default='1.0')
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class PropertyRevenueReport(Base):
    """Property revenue tracking and reporting"""
    __tablename__ = "property_revenue_reports"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(UUID(as_uuid=True), ForeignKey('property_listings.id'), nullable=False)
    
    report_period_start = Column(Date, nullable=False)
    report_period_end = Column(Date, nullable=False)
    
    # Revenue Breakdown
    gross_revenue = Column(Numeric(12, 2), default=0)
    service_fees = Column(Numeric(12, 2), default=0)
    cleaning_fees = Column(Numeric(12, 2), default=0)
    net_revenue = Column(Numeric(12, 2), default=0)
    
    # Booking Statistics
    total_nights_booked = Column(Integer, default=0)
    total_bookings = Column(Integer, default=0)
    average_booking_value = Column(Numeric(10, 2), default=0)
    occupancy_rate = Column(Float, default=0.0)
    
    # Performance Metrics
    revenue_per_available_night = Column(Numeric(10, 2), default=0)
    year_over_year_growth = Column(Float, default=0.0)
    
    generated_at = Column(DateTime, default=datetime.utcnow)


class PropertyCompetitorAnalysis(Base):
    """Competitor analysis for pricing optimization"""
    __tablename__ = "property_competitor_analysis"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(UUID(as_uuid=True), ForeignKey('property_listings.id'), nullable=False)
    
    competitor_property_id = Column(String(255))  # External ID
    competitor_platform = Column(String(50))
    
    # Competitor Details
    competitor_price = Column(Numeric(10, 2))
    competitor_rating = Column(Float)
    competitor_review_count = Column(Integer)
    distance_km = Column(Float)
    
    # Comparison Metrics
    price_difference = Column(Numeric(10, 2))
    price_difference_percentage = Column(Float)
    
    analysis_date = Column(DateTime, default=datetime.utcnow)
    
    # Indexes
    __table_args__ = (
        Index('idx_competitor_analysis_property', 'property_id'),
        Index('idx_competitor_analysis_date', 'analysis_date'),
    )