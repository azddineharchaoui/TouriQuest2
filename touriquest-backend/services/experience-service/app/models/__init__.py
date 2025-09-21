"""
Database models for Experience Service
"""

from datetime import datetime, date, time
from uuid import UUID
from decimal import Decimal
from typing import Optional, List, Dict, Any
from enum import Enum

from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Date, Time, Text, JSON, ForeignKey, Numeric, Index
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID, ARRAY
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.sql import func

from app.db.database import Base


class ExperienceCategory(str, Enum):
    """Experience category enumeration"""
    CULTURAL_WORKSHOPS = "cultural_workshops"
    FOOD_CULINARY = "food_culinary"
    ADVENTURE_OUTDOOR = "adventure_outdoor"
    PHOTOGRAPHY = "photography"
    WELLNESS_SPA = "wellness_spa"
    PRIVATE_GUIDES = "private_guides"


class SkillLevel(str, Enum):
    """Skill level enumeration"""
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    ALL_LEVELS = "all_levels"


class WeatherDependency(str, Enum):
    """Weather dependency level"""
    NONE = "none"
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"


class BookingStatus(str, Enum):
    """Booking status enumeration"""
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    COMPLETED = "completed"
    NO_SHOW = "no_show"
    REFUNDED = "refunded"


class PaymentStatus(str, Enum):
    """Payment status enumeration"""
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"
    PARTIALLY_REFUNDED = "partially_refunded"


class ProviderStatus(str, Enum):
    """Provider status enumeration"""
    PENDING = "pending"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    DEACTIVATED = "deactivated"


class VerificationStatus(str, Enum):
    """Verification status enumeration"""
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"
    EXPIRED = "expired"


# Add User model stub for foreign key relationships
class User(Base):
    """User model stub - will be managed by auth service"""
    __tablename__ = "users"
    
    id: Mapped[UUID] = mapped_column(PostgresUUID(as_uuid=True), primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


# Add UserInteraction model for tracking
class UserInteraction(Base):
    """User interaction tracking model"""
    __tablename__ = "user_interactions"
    
    id: Mapped[UUID] = mapped_column(PostgresUUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    user_id: Mapped[Optional[UUID]] = mapped_column(PostgresUUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    experience_id: Mapped[UUID] = mapped_column(PostgresUUID(as_uuid=True), ForeignKey("experiences.id"), nullable=False)
    interaction_type: Mapped[str] = mapped_column(String(50), nullable=False)
    interaction_data: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    experience: Mapped["Experience"] = relationship("Experience", back_populates="interactions")
    
    # Indexes
    __table_args__ = (
        Index("idx_user_interactions_user_id", "user_id"),
        Index("idx_user_interactions_experience_id", "experience_id"),
        Index("idx_user_interactions_type", "interaction_type"),
        Index("idx_user_interactions_created", "created_at"),
    )
from typing import Optional, Dict, Any, List
from uuid import UUID, uuid4
from enum import Enum
from decimal import Decimal

from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Date, Time, Text,
    ForeignKey, JSON, Numeric, Enum as SQLEnum, Index, CheckConstraint,
    UniqueConstraint, text
)
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID, ARRAY
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, backref
from sqlalchemy.sql import func

Base = declarative_base()


class ExperienceCategory(str, Enum):
    """Experience categories"""
    CULTURAL_WORKSHOPS = "cultural_workshops"
    FOOD_CULINARY = "food_culinary"
    ADVENTURE_OUTDOOR = "adventure_outdoor"
    PHOTOGRAPHY = "photography"
    WELLNESS_SPA = "wellness_spa"
    PRIVATE_GUIDES = "private_guides"


class SkillLevel(str, Enum):
    """Experience skill levels"""
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"
    ALL_LEVELS = "all_levels"


class BookingStatus(str, Enum):
    """Booking status options"""
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    COMPLETED = "completed"
    NO_SHOW = "no_show"
    REFUNDED = "refunded"


class PaymentStatus(str, Enum):
    """Payment status options"""
    PENDING = "pending"
    AUTHORIZED = "authorized"
    CAPTURED = "captured"
    FAILED = "failed"
    REFUNDED = "refunded"
    PARTIALLY_REFUNDED = "partially_refunded"


class WeatherDependency(str, Enum):
    """Weather dependency levels"""
    NONE = "none"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ProviderStatus(str, Enum):
    """Provider status options"""
    PENDING = "pending"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    REJECTED = "rejected"
    UNDER_REVIEW = "under_review"


# Provider Models
class Provider(Base):
    """Experience providers/hosts"""
    __tablename__ = "providers"
    
    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(PostgresUUID(as_uuid=True), nullable=False, unique=True)
    business_name = Column(String(200), nullable=False)
    business_description = Column(Text)
    business_type = Column(String(100))  # individual, company, organization
    
    # Contact information
    contact_person = Column(String(150))
    phone = Column(String(20))
    email = Column(String(255), nullable=False)
    website = Column(String(255))
    
    # Address and location
    address = Column(Text)
    city = Column(String(100))
    country = Column(String(100))
    postal_code = Column(String(20))
    latitude = Column(Float)
    longitude = Column(Float)
    
    # Verification and compliance
    status = Column(SQLEnum(ProviderStatus), default=ProviderStatus.PENDING)
    is_verified = Column(Boolean, default=False)
    verification_documents = Column(JSON)  # Store document URLs and metadata
    insurance_verified = Column(Boolean, default=False)
    insurance_documents = Column(JSON)
    certification_documents = Column(JSON)
    
    # Business metrics
    total_experiences = Column(Integer, default=0)
    total_bookings = Column(Integer, default=0)
    total_revenue = Column(Numeric(10, 2), default=0)
    average_rating = Column(Float, default=0.0)
    response_rate = Column(Float, default=0.0)
    response_time_minutes = Column(Integer, default=0)
    
    # Quality scores
    quality_score = Column(Float, default=0.0)
    reliability_score = Column(Float, default=0.0)
    safety_score = Column(Float, default=0.0)
    
    # Platform settings
    commission_rate = Column(Float, default=0.15)  # Platform commission
    auto_accept_bookings = Column(Boolean, default=False)
    instant_book_enabled = Column(Boolean, default=False)
    advance_notice_hours = Column(Integer, default=24)
    
    # Languages spoken
    languages = Column(ARRAY(String), default=["en"])
    
    # Profile completion
    profile_completion_percentage = Column(Float, default=0.0)
    onboarding_completed = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_active_at = Column(DateTime(timezone=True))
    
    # Relationships
    experiences = relationship("Experience", back_populates="provider")
    certifications = relationship("ProviderCertification", back_populates="provider")
    earnings = relationship("ProviderEarning", back_populates="provider")
    
    __table_args__ = (
        Index('ix_providers_location', 'latitude', 'longitude'),
        Index('ix_providers_status', 'status'),
        Index('ix_providers_quality_score', 'quality_score'),
        CheckConstraint('average_rating >= 0 AND average_rating <= 5'),
        CheckConstraint('quality_score >= 0 AND quality_score <= 100'),
    )


class ProviderCertification(Base):
    """Provider certifications and qualifications"""
    __tablename__ = "provider_certifications"
    
    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)
    provider_id = Column(PostgresUUID(as_uuid=True), ForeignKey("providers.id"), nullable=False)
    
    certification_name = Column(String(200), nullable=False)
    certification_type = Column(String(100))  # safety, professional, language, etc.
    issuing_organization = Column(String(200))
    certification_number = Column(String(100))
    
    issue_date = Column(Date)
    expiry_date = Column(Date)
    is_verified = Column(Boolean, default=False)
    verification_date = Column(DateTime(timezone=True))
    
    document_url = Column(String(500))
    document_metadata = Column(JSON)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    provider = relationship("Provider", back_populates="certifications")


# Experience Models
class Experience(Base):
    """Main experience/activity entity"""
    __tablename__ = "experiences"
    
    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)
    provider_id = Column(PostgresUUID(as_uuid=True), ForeignKey("providers.id"), nullable=False)
    
    # Basic information
    title = Column(String(300), nullable=False)
    description = Column(Text, nullable=False)
    short_description = Column(String(500))
    category = Column(SQLEnum(ExperienceCategory), nullable=False)
    subcategory = Column(String(100))
    
    # Experience details
    duration_minutes = Column(Integer, nullable=False)
    skill_level = Column(SQLEnum(SkillLevel), default=SkillLevel.ALL_LEVELS)
    min_age = Column(Integer, default=0)
    max_age = Column(Integer)
    physical_difficulty = Column(Integer, default=1)  # 1-5 scale
    
    # Group and capacity
    min_participants = Column(Integer, default=1)
    max_participants = Column(Integer, nullable=False)
    private_group_available = Column(Boolean, default=False)
    group_discount_threshold = Column(Integer)
    group_discount_percentage = Column(Float)
    
    # Location
    meeting_point = Column(Text, nullable=False)
    meeting_point_latitude = Column(Float)
    meeting_point_longitude = Column(Float)
    end_point = Column(Text)
    end_point_latitude = Column(Float)
    end_point_longitude = Column(Float)
    
    # Pricing
    base_price = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default="USD")
    price_includes = Column(ARRAY(String))
    price_excludes = Column(ARRAY(String))
    
    # Equipment and requirements
    equipment_provided = Column(ARRAY(String))
    equipment_required = Column(ARRAY(String))
    what_to_bring = Column(ARRAY(String))
    dress_code = Column(Text)
    
    # Logistics
    languages_offered = Column(ARRAY(String), default=["en"])
    accessibility_info = Column(Text)
    dietary_accommodations = Column(ARRAY(String))
    special_requirements = Column(Text)
    
    # Policies
    cancellation_policy = Column(Text)
    refund_policy = Column(Text)
    reschedule_policy = Column(Text)
    no_show_policy = Column(Text)
    
    # Weather and conditions
    weather_dependency = Column(SQLEnum(WeatherDependency), default=WeatherDependency.NONE)
    weather_conditions = Column(Text)  # Description of weather requirements
    seasonal_availability = Column(JSON)  # Months when available
    indoor_alternative = Column(Boolean, default=False)
    indoor_alternative_description = Column(Text)
    
    # Booking settings
    instant_book = Column(Boolean, default=False)
    advance_booking_hours = Column(Integer, default=24)
    max_advance_booking_days = Column(Integer, default=365)
    auto_confirm = Column(Boolean, default=False)
    
    # Status and visibility
    is_active = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)
    is_published = Column(Boolean, default=False)
    approval_status = Column(String(50), default="pending")  # pending, approved, rejected
    
    # Metrics and ratings
    total_bookings = Column(Integer, default=0)
    total_reviews = Column(Integer, default=0)
    average_rating = Column(Float, default=0.0)
    popularity_score = Column(Float, default=0.0)
    quality_score = Column(Float, default=0.0)
    
    # SEO and marketing
    seo_title = Column(String(200))
    seo_description = Column(Text)
    tags = Column(ARRAY(String))
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    first_available_date = Column(Date)
    last_available_date = Column(Date)
    
    # Relationships
    provider = relationship("Provider", back_populates="experiences")
    schedules = relationship("ExperienceSchedule", back_populates="experience")
    bookings = relationship("ExperienceBooking", back_populates="experience")
    reviews = relationship("ExperienceReview", back_populates="experience")
    images = relationship("ExperienceImage", back_populates="experience")
    inclusions = relationship("ExperienceInclusion", back_populates="experience")
    requirements = relationship("ExperienceRequirement", back_populates="experience")
    interactions = relationship("UserInteraction", back_populates="experience")
    
    __table_args__ = (
        Index('ix_experiences_category', 'category'),
        Index('ix_experiences_location', 'meeting_point_latitude', 'meeting_point_longitude'),
        Index('ix_experiences_price', 'base_price'),
        Index('ix_experiences_rating', 'average_rating'),
        Index('ix_experiences_status', 'is_active', 'is_published'),
        CheckConstraint('min_participants <= max_participants'),
        CheckConstraint('average_rating >= 0 AND average_rating <= 5'),
        CheckConstraint('physical_difficulty >= 1 AND physical_difficulty <= 5'),
    )


class ExperienceImage(Base):
    """Experience images and media"""
    __tablename__ = "experience_images"
    
    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)
    experience_id = Column(PostgresUUID(as_uuid=True), ForeignKey("experiences.id"), nullable=False)
    
    url = Column(String(500), nullable=False)
    thumbnail_url = Column(String(500))
    alt_text = Column(String(200))
    caption = Column(String(300))
    
    image_type = Column(String(50))  # hero, gallery, equipment, etc.
    order_index = Column(Integer, default=0)
    is_primary = Column(Boolean, default=False)
    
    uploaded_by = Column(PostgresUUID(as_uuid=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    experience = relationship("Experience", back_populates="images")
    
    __table_args__ = (
        Index('ix_experience_images_order', 'experience_id', 'order_index'),
    )


class ExperienceSchedule(Base):
    """Experience scheduling and availability"""
    __tablename__ = "experience_schedules"
    
    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)
    experience_id = Column(PostgresUUID(as_uuid=True), ForeignKey("experiences.id"), nullable=False)
    
    # Schedule details
    date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    timezone = Column(String(50), default="UTC")
    
    # Availability
    max_participants = Column(Integer, nullable=False)
    available_spots = Column(Integer, nullable=False)
    booked_spots = Column(Integer, default=0)
    
    # Pricing overrides
    price_override = Column(Numeric(10, 2))
    special_pricing_reason = Column(String(200))
    
    # Status and conditions
    is_available = Column(Boolean, default=True)
    is_private = Column(Boolean, default=False)
    weather_status = Column(String(50))  # good, risky, cancelled
    last_weather_check = Column(DateTime(timezone=True))
    
    # Special notes
    guide_notes = Column(Text)
    public_notes = Column(Text)
    internal_notes = Column(Text)
    
    # Booking settings
    booking_deadline = Column(DateTime(timezone=True))
    cancellation_deadline = Column(DateTime(timezone=True))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    experience = relationship("Experience", back_populates="schedules")
    bookings = relationship("ExperienceBooking", back_populates="schedule")
    
    __table_args__ = (
        Index('ix_experience_schedules_date', 'experience_id', 'date'),
        Index('ix_experience_schedules_availability', 'date', 'is_available'),
        UniqueConstraint('experience_id', 'date', 'start_time', name='unique_experience_schedule'),
        CheckConstraint('available_spots >= 0'),
        CheckConstraint('booked_spots >= 0'),
        CheckConstraint('booked_spots <= available_spots'),
    )


# Booking Models
class ExperienceBooking(Base):
    """Experience bookings"""
    __tablename__ = "experience_bookings"
    
    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)
    experience_id = Column(PostgresUUID(as_uuid=True), ForeignKey("experiences.id"), nullable=False)
    schedule_id = Column(PostgresUUID(as_uuid=True), ForeignKey("experience_schedules.id"), nullable=False)
    user_id = Column(PostgresUUID(as_uuid=True), nullable=False)
    
    # Booking details
    booking_reference = Column(String(20), unique=True, nullable=False)
    participants_count = Column(Integer, nullable=False)
    is_private_booking = Column(Boolean, default=False)
    
    # Participant information
    lead_participant_name = Column(String(200), nullable=False)
    lead_participant_email = Column(String(255), nullable=False)
    lead_participant_phone = Column(String(20))
    participant_details = Column(JSON)  # Array of participant info
    
    # Special requirements
    dietary_restrictions = Column(ARRAY(String))
    accessibility_needs = Column(Text)
    equipment_sizes = Column(JSON)  # Size preferences for provided equipment
    special_requests = Column(Text)
    emergency_contact = Column(JSON)
    
    # Age verification
    age_verification_required = Column(Boolean, default=False)
    age_verification_completed = Column(Boolean, default=False)
    minors_in_group = Column(Boolean, default=False)
    guardian_consent = Column(Boolean, default=False)
    
    # Pricing
    base_price = Column(Numeric(10, 2), nullable=False)
    total_price = Column(Numeric(10, 2), nullable=False)
    discount_amount = Column(Numeric(10, 2), default=0)
    tax_amount = Column(Numeric(10, 2), default=0)
    platform_fee = Column(Numeric(10, 2), default=0)
    currency = Column(String(3), default="USD")
    
    # Status and workflow
    status = Column(SQLEnum(BookingStatus), default=BookingStatus.PENDING)
    confirmation_code = Column(String(50))
    provider_response_deadline = Column(DateTime(timezone=True))
    auto_confirm_at = Column(DateTime(timezone=True))
    
    # Communication
    booking_message = Column(Text)  # Customer message to provider
    provider_response = Column(Text)  # Provider response to customer
    cancellation_reason = Column(Text)
    internal_notes = Column(Text)
    
    # Check-in and completion
    checked_in_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    no_show = Column(Boolean, default=False)
    
    # Review and feedback
    customer_reviewed = Column(Boolean, default=False)
    provider_reviewed = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    cancelled_at = Column(DateTime(timezone=True))
    
    # Relationships
    experience = relationship("Experience", back_populates="bookings")
    schedule = relationship("ExperienceSchedule", back_populates="bookings")
    payments = relationship("BookingPayment", back_populates="booking")
    modifications = relationship("BookingModification", back_populates="booking")
    
    __table_args__ = (
        Index('ix_experience_bookings_user', 'user_id'),
        Index('ix_experience_bookings_status', 'status'),
        Index('ix_experience_bookings_date', 'created_at'),
        Index('ix_experience_bookings_reference', 'booking_reference'),
        CheckConstraint('participants_count > 0'),
        CheckConstraint('total_price >= 0'),
    )


class BookingPayment(Base):
    """Payment information for bookings"""
    __tablename__ = "booking_payments"
    
    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)
    booking_id = Column(PostgresUUID(as_uuid=True), ForeignKey("experience_bookings.id"), nullable=False)
    
    # Payment details
    payment_intent_id = Column(String(100))  # Stripe payment intent ID
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default="USD")
    payment_method = Column(String(50))  # card, bank_transfer, etc.
    
    # Status
    status = Column(SQLEnum(PaymentStatus), default=PaymentStatus.PENDING)
    
    # Provider payout
    provider_amount = Column(Numeric(10, 2))
    platform_fee = Column(Numeric(10, 2))
    processing_fee = Column(Numeric(10, 2))
    payout_date = Column(DateTime(timezone=True))
    
    # Refund information
    refund_amount = Column(Numeric(10, 2), default=0)
    refund_reason = Column(Text)
    refunded_at = Column(DateTime(timezone=True))
    
    # Metadata
    payment_metadata = Column(JSON)
    gateway_response = Column(JSON)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    booking = relationship("ExperienceBooking", back_populates="payments")


class BookingModification(Base):
    """Booking modification history"""
    __tablename__ = "booking_modifications"
    
    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)
    booking_id = Column(PostgresUUID(as_uuid=True), ForeignKey("experience_bookings.id"), nullable=False)
    
    modification_type = Column(String(50), nullable=False)  # reschedule, participant_change, etc.
    old_values = Column(JSON)
    new_values = Column(JSON)
    reason = Column(Text)
    
    initiated_by = Column(String(50))  # customer, provider, admin
    approved_by = Column(PostgresUUID(as_uuid=True))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    booking = relationship("ExperienceBooking", back_populates="modifications")


# Review and Rating Models
class ExperienceReview(Base):
    """Experience reviews and ratings"""
    __tablename__ = "experience_reviews"
    
    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)
    experience_id = Column(PostgresUUID(as_uuid=True), ForeignKey("experiences.id"), nullable=False)
    booking_id = Column(PostgresUUID(as_uuid=True), ForeignKey("experience_bookings.id"))
    user_id = Column(PostgresUUID(as_uuid=True), nullable=False)
    
    # Ratings (1-5 scale)
    overall_rating = Column(Integer, nullable=False)
    guide_rating = Column(Integer)
    value_rating = Column(Integer)
    organization_rating = Column(Integer)
    communication_rating = Column(Integer)
    
    # Review content
    title = Column(String(200))
    comment = Column(Text)
    pros = Column(ARRAY(String))
    cons = Column(ARRAY(String))
    
    # Experience details
    experience_date = Column(Date)
    group_size = Column(Integer)
    travel_type = Column(String(50))  # solo, couple, family, friends
    
    # Helpfulness and moderation
    helpful_votes = Column(Integer, default=0)
    total_votes = Column(Integer, default=0)
    is_verified = Column(Boolean, default=False)
    is_featured = Column(Boolean, default=False)
    moderation_status = Column(String(50), default="pending")
    
    # Provider response
    provider_response = Column(Text)
    provider_response_date = Column(DateTime(timezone=True))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    experience = relationship("Experience", back_populates="reviews")
    votes = relationship("ReviewVote", back_populates="review")
    
    __table_args__ = (
        Index('ix_experience_reviews_rating', 'experience_id', 'overall_rating'),
        Index('ix_experience_reviews_date', 'created_at'),
        CheckConstraint('overall_rating >= 1 AND overall_rating <= 5'),
        CheckConstraint('helpful_votes >= 0'),
        CheckConstraint('total_votes >= helpful_votes'),
    )


class ReviewVote(Base):
    """Review helpfulness votes"""
    __tablename__ = "review_votes"
    
    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)
    review_id = Column(PostgresUUID(as_uuid=True), ForeignKey("experience_reviews.id"), nullable=False)
    user_id = Column(PostgresUUID(as_uuid=True), nullable=False)
    
    is_helpful = Column(Boolean, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    review = relationship("ExperienceReview", back_populates="votes")
    
    __table_args__ = (
        UniqueConstraint('review_id', 'user_id', name='unique_review_vote'),
    )


# Additional Experience Detail Models
class ExperienceInclusion(Base):
    """What's included in the experience"""
    __tablename__ = "experience_inclusions"
    
    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)
    experience_id = Column(PostgresUUID(as_uuid=True), ForeignKey("experiences.id"), nullable=False)
    
    category = Column(String(100), nullable=False)  # equipment, food, transport, etc.
    item = Column(String(200), nullable=False)
    description = Column(Text)
    is_optional = Column(Boolean, default=False)
    additional_cost = Column(Numeric(10, 2))
    
    order_index = Column(Integer, default=0)
    
    # Relationships
    experience = relationship("Experience", back_populates="inclusions")


class ExperienceRequirement(Base):
    """Experience requirements and restrictions"""
    __tablename__ = "experience_requirements"
    
    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)
    experience_id = Column(PostgresUUID(as_uuid=True), ForeignKey("experiences.id"), nullable=False)
    
    requirement_type = Column(String(100), nullable=False)  # fitness, age, skill, etc.
    requirement = Column(String(300), nullable=False)
    description = Column(Text)
    is_mandatory = Column(Boolean, default=True)
    
    order_index = Column(Integer, default=0)
    
    # Relationships
    experience = relationship("Experience", back_populates="requirements")


# Provider Earnings and Analytics
class ProviderEarning(Base):
    """Provider earnings tracking"""
    __tablename__ = "provider_earnings"
    
    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)
    provider_id = Column(PostgresUUID(as_uuid=True), ForeignKey("providers.id"), nullable=False)
    booking_id = Column(PostgresUUID(as_uuid=True), ForeignKey("experience_bookings.id"))
    
    # Earning details
    gross_amount = Column(Numeric(10, 2), nullable=False)
    platform_fee = Column(Numeric(10, 2), nullable=False)
    processing_fee = Column(Numeric(10, 2), default=0)
    net_amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default="USD")
    
    # Payout information
    payout_status = Column(String(50), default="pending")  # pending, processed, failed
    payout_date = Column(DateTime(timezone=True))
    payout_reference = Column(String(100))
    
    # Tax information
    tax_amount = Column(Numeric(10, 2), default=0)
    tax_year = Column(Integer)
    
    # Metadata
    earning_date = Column(Date, nullable=False)
    earning_type = Column(String(50), default="booking")  # booking, bonus, adjustment
    description = Column(Text)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    provider = relationship("Provider", back_populates="earnings")
    
    __table_args__ = (
        Index('ix_provider_earnings_date', 'provider_id', 'earning_date'),
        Index('ix_provider_earnings_payout', 'payout_status', 'payout_date'),
    )


# Weather and External Data
class WeatherData(Base):
    """Weather data for experience locations"""
    __tablename__ = "weather_data"
    
    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)
    
    # Location
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    location_name = Column(String(200))
    
    # Weather data
    date = Column(Date, nullable=False)
    temperature_min = Column(Float)
    temperature_max = Column(Float)
    humidity = Column(Float)
    wind_speed = Column(Float)
    precipitation_probability = Column(Float)
    weather_condition = Column(String(100))
    weather_description = Column(String(200))
    
    # Derived insights
    is_suitable_for_outdoor = Column(Boolean)
    risk_level = Column(String(50))  # low, medium, high
    recommendations = Column(ARRAY(String))
    
    # Data source
    data_source = Column(String(100))
    raw_data = Column(JSON)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    __table_args__ = (
        Index('ix_weather_data_location_date', 'latitude', 'longitude', 'date'),
        UniqueConstraint('latitude', 'longitude', 'date', name='unique_weather_location_date'),
    )