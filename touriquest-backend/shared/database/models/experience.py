"""
Experience-related SQLAlchemy models
"""
from datetime import datetime, date, time
from typing import Optional, List
from enum import Enum as PyEnum
from decimal import Decimal

from sqlalchemy import (
    Column, String, DateTime, Boolean, Text, Integer, Float, Date, Time,
    ForeignKey, Enum, Numeric, UniqueConstraint, CheckConstraint, Index, Table
)
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import relationship, mapped_column, Mapped
from sqlalchemy.ext.hybrid import hybrid_property

from .base import (
    BaseModel, TimestampMixin, SoftDeleteMixin, AuditMixin,
    MetadataMixin, GeolocationMixin, RatingMixin, SearchableMixin
)


class ExperienceTypeEnum(PyEnum):
    """Experience type enumeration."""
    CULTURAL_TOUR = "cultural_tour"
    FOOD_TOUR = "food_tour"
    ADVENTURE_ACTIVITY = "adventure_activity"
    WORKSHOP = "workshop"
    PHOTOGRAPHY_TOUR = "photography_tour"
    HISTORICAL_TOUR = "historical_tour"
    NATURE_WALK = "nature_walk"
    COOKING_CLASS = "cooking_class"
    ART_CLASS = "art_class"
    WELLNESS_ACTIVITY = "wellness_activity"
    MUSIC_PERFORMANCE = "music_performance"
    FESTIVAL_EVENT = "festival_event"
    SPORTS_ACTIVITY = "sports_activity"
    TRANSPORTATION = "transportation"
    ACCOMMODATION_EXPERIENCE = "accommodation_experience"
    PRIVATE_GUIDE = "private_guide"
    GROUP_TOUR = "group_tour"
    VIRTUAL_EXPERIENCE = "virtual_experience"
    OTHER = "other"


class ExperienceStatusEnum(PyEnum):
    """Experience status enumeration."""
    DRAFT = "draft"
    PENDING_REVIEW = "pending_review"
    ACTIVE = "active"
    PAUSED = "paused"
    SUSPENDED = "suspended"
    CANCELLED = "cancelled"
    COMPLETED = "completed"


class DifficultyLevelEnum(PyEnum):
    """Difficulty level enumeration."""
    EASY = "easy"
    MODERATE = "moderate"
    CHALLENGING = "challenging"
    EXPERT = "expert"


class Experience(BaseModel, TimestampMixin, SoftDeleteMixin, AuditMixin,
                 GeolocationMixin, RatingMixin, SearchableMixin, MetadataMixin):
    """Experience and activity model."""
    
    __tablename__ = 'experiences'
    
    # Provider information
    provider_id: UUID = mapped_column(
        UUID(as_uuid=True),
        ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    
    # Basic information
    title: str = mapped_column(
        String(255),
        nullable=False,
        index=True
    )
    
    description: str = mapped_column(
        Text,
        nullable=False
    )
    
    short_description: Optional[str] = mapped_column(
        String(500),
        nullable=True
    )
    
    experience_type: ExperienceTypeEnum = mapped_column(
        Enum(ExperienceTypeEnum),
        nullable=False,
        index=True
    )
    
    # Status
    status: ExperienceStatusEnum = mapped_column(
        Enum(ExperienceStatusEnum),
        default=ExperienceStatusEnum.DRAFT,
        nullable=False,
        index=True
    )
    
    # Duration and scheduling
    duration_minutes: int = mapped_column(
        Integer,
        nullable=False
    )
    
    # Capacity
    min_participants: int = mapped_column(
        Integer,
        default=1,
        nullable=False
    )
    
    max_participants: int = mapped_column(
        Integer,
        nullable=False
    )
    
    # Age and fitness requirements
    minimum_age: Optional[int] = mapped_column(
        Integer,
        nullable=True
    )
    
    maximum_age: Optional[int] = mapped_column(
        Integer,
        nullable=True
    )
    
    difficulty_level: Optional[DifficultyLevelEnum] = mapped_column(
        Enum(DifficultyLevelEnum),
        nullable=True
    )
    
    fitness_level_required: Optional[str] = mapped_column(
        String(50),
        nullable=True
    )
    
    # Pricing
    base_price: Decimal = mapped_column(
        Numeric(10, 2),
        nullable=False,
        index=True
    )
    
    currency: str = mapped_column(
        String(3),
        default='USD',
        nullable=False
    )
    
    price_per_person: bool = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )
    
    # Included and excluded items
    included_items: Optional[List[str]] = mapped_column(
        ARRAY(String),
        nullable=True
    )
    
    excluded_items: Optional[List[str]] = mapped_column(
        ARRAY(String),
        nullable=True
    )
    
    # Equipment and requirements
    provided_equipment: Optional[List[str]] = mapped_column(
        ARRAY(String),
        nullable=True
    )
    
    required_equipment: Optional[List[str]] = mapped_column(
        ARRAY(String),
        nullable=True
    )
    
    # Meeting point
    meeting_point_description: str = mapped_column(
        Text,
        nullable=False
    )
    
    meeting_point_latitude: Optional[float] = mapped_column(
        Float,
        nullable=True
    )
    
    meeting_point_longitude: Optional[float] = mapped_column(
        Float,
        nullable=True
    )
    
    # Special requirements
    special_requirements: Optional[str] = mapped_column(
        Text,
        nullable=True
    )
    
    health_restrictions: Optional[List[str]] = mapped_column(
        ARRAY(String),
        nullable=True
    )
    
    # Cancellation policy
    cancellation_policy: str = mapped_column(
        Text,
        nullable=False
    )
    
    cancellation_hours_before: int = mapped_column(
        Integer,
        default=24,
        nullable=False
    )
    
    # Language support
    languages_offered: List[str] = mapped_column(
        ARRAY(String),
        nullable=False
    )
    
    # Accessibility
    is_wheelchair_accessible: bool = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )
    
    accessibility_features: Optional[List[str]] = mapped_column(
        ARRAY(String),
        nullable=True
    )
    
    # Weather dependency
    is_weather_dependent: bool = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )
    
    weather_conditions: Optional[str] = mapped_column(
        Text,
        nullable=True
    )
    
    # Performance metrics
    booking_count: int = mapped_column(
        Integer,
        default=0,
        nullable=False
    )
    
    completion_count: int = mapped_column(
        Integer,
        default=0,
        nullable=False
    )
    
    cancellation_count: int = mapped_column(
        Integer,
        default=0,
        nullable=False
    )
    
    # Verification
    is_verified: bool = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        index=True
    )
    
    verified_at: Optional[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    
    # Relationships
    provider: Mapped["User"] = relationship(
        "User",
        foreign_keys=[provider_id]
    )
    
    categories: Mapped[List["ExperienceCategory"]] = relationship(
        "ExperienceCategory",
        secondary="experience_category_associations",
        back_populates="experiences"
    )
    
    schedules: Mapped[List["ExperienceSchedule"]] = relationship(
        "ExperienceSchedule",
        back_populates="experience",
        cascade="all, delete-orphan"
    )
    
    requirements: Mapped[List["ExperienceRequirement"]] = relationship(
        "ExperienceRequirement",
        back_populates="experience",
        cascade="all, delete-orphan"
    )
    
    images: Mapped[List["ExperienceImage"]] = relationship(
        "ExperienceImage",
        back_populates="experience",
        cascade="all, delete-orphan",
        order_by="ExperienceImage.order_index"
    )
    
    translations: Mapped[List["ExperienceTranslation"]] = relationship(
        "ExperienceTranslation",
        back_populates="experience",
        cascade="all, delete-orphan"
    )
    
    @hybrid_property
    def is_available_for_booking(self) -> bool:
        """Check if experience is available for booking."""
        return (
            self.status == ExperienceStatusEnum.ACTIVE and 
            self.is_verified and 
            not self.is_deleted
        )
    
    @hybrid_property
    def completion_rate(self) -> float:
        """Calculate completion rate percentage."""
        if self.booking_count == 0:
            return 0.0
        return (self.completion_count / self.booking_count) * 100


class ExperienceCategory(BaseModel, TimestampMixin):
    """Experience category management."""
    
    __tablename__ = 'experience_categories'
    
    name: str = mapped_column(
        String(100),
        nullable=False,
        unique=True,
        index=True
    )
    
    display_name: str = mapped_column(
        String(100),
        nullable=False
    )
    
    description: Optional[str] = mapped_column(
        Text,
        nullable=True
    )
    
    icon_name: Optional[str] = mapped_column(
        String(50),
        nullable=True
    )
    
    color_code: Optional[str] = mapped_column(
        String(7),
        nullable=True
    )
    
    parent_category_id: Optional[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey('experience_categories.id'),
        nullable=True,
        index=True
    )
    
    # Display settings
    is_active: bool = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )
    
    display_order: int = mapped_column(
        Integer,
        default=0,
        nullable=False
    )
    
    # Relationships
    parent_category: Mapped[Optional["ExperienceCategory"]] = relationship(
        "ExperienceCategory",
        remote_side=[id],
        back_populates="subcategories"
    )
    
    subcategories: Mapped[List["ExperienceCategory"]] = relationship(
        "ExperienceCategory",
        back_populates="parent_category"
    )
    
    experiences: Mapped[List["Experience"]] = relationship(
        "Experience",
        secondary="experience_category_associations",
        back_populates="categories"
    )


class ExperienceSchedule(BaseModel, TimestampMixin):
    """Experience scheduling and availability."""
    
    __tablename__ = 'experience_schedules'
    
    experience_id: UUID = mapped_column(
        UUID(as_uuid=True),
        ForeignKey('experiences.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    
    # Schedule timing
    date: date = mapped_column(
        Date,
        nullable=False,
        index=True
    )
    
    start_time: time = mapped_column(
        Time,
        nullable=False
    )
    
    end_time: time = mapped_column(
        Time,
        nullable=False
    )
    
    # Capacity
    available_spots: int = mapped_column(
        Integer,
        nullable=False
    )
    
    booked_spots: int = mapped_column(
        Integer,
        default=0,
        nullable=False
    )
    
    # Pricing override
    price_override: Optional[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=True
    )
    
    # Status
    is_available: bool = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        index=True
    )
    
    is_cancelled: bool = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )
    
    cancellation_reason: Optional[str] = mapped_column(
        Text,
        nullable=True
    )
    
    # Guide assignment
    assigned_guide_id: Optional[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey('users.id'),
        nullable=True,
        index=True
    )
    
    # Special notes
    notes: Optional[str] = mapped_column(
        Text,
        nullable=True
    )
    
    # Relationships
    experience: Mapped["Experience"] = relationship(
        "Experience",
        back_populates="schedules"
    )
    
    assigned_guide: Mapped[Optional["User"]] = relationship(
        "User",
        foreign_keys=[assigned_guide_id]
    )
    
    @hybrid_property
    def remaining_spots(self) -> int:
        """Calculate remaining available spots."""
        return max(0, self.available_spots - self.booked_spots)
    
    @hybrid_property
    def is_fully_booked(self) -> bool:
        """Check if schedule is fully booked."""
        return self.booked_spots >= self.available_spots
    
    __table_args__ = (
        UniqueConstraint('experience_id', 'date', 'start_time', 
                        name='unique_experience_schedule'),
        CheckConstraint('end_time > start_time', name='check_valid_time_range'),
        CheckConstraint('available_spots > 0', name='check_positive_capacity'),
        CheckConstraint('booked_spots >= 0', name='check_non_negative_bookings'),
    )


class ExperienceRequirement(BaseModel, TimestampMixin):
    """Experience requirements and prerequisites."""
    
    __tablename__ = 'experience_requirements'
    
    experience_id: UUID = mapped_column(
        UUID(as_uuid=True),
        ForeignKey('experiences.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    
    # Requirement details
    requirement_type: str = mapped_column(
        String(50),
        nullable=False,
        index=True
    )  # age, fitness, equipment, skill, health, documents
    
    title: str = mapped_column(
        String(255),
        nullable=False
    )
    
    description: str = mapped_column(
        Text,
        nullable=False
    )
    
    # Requirement properties
    is_mandatory: bool = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )
    
    severity_level: str = mapped_column(
        String(20),
        default='medium',
        nullable=False
    )  # low, medium, high, critical
    
    # Display order
    display_order: int = mapped_column(
        Integer,
        default=0,
        nullable=False
    )
    
    # Icon for display
    icon_name: Optional[str] = mapped_column(
        String(50),
        nullable=True
    )
    
    # Additional requirement data
    requirement_data: Optional[dict] = mapped_column(
        JSONB,
        nullable=True
    )
    
    # Relationships
    experience: Mapped["Experience"] = relationship(
        "Experience",
        back_populates="requirements"
    )


class ExperienceImage(BaseModel, TimestampMixin):
    """Experience images and visual content."""
    
    __tablename__ = 'experience_images'
    
    experience_id: UUID = mapped_column(
        UUID(as_uuid=True),
        ForeignKey('experiences.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    
    # Image information
    image_url: str = mapped_column(
        String(500),
        nullable=False
    )
    
    thumbnail_url: Optional[str] = mapped_column(
        String(500),
        nullable=True
    )
    
    alt_text: Optional[str] = mapped_column(
        String(255),
        nullable=True
    )
    
    caption: Optional[str] = mapped_column(
        Text,
        nullable=True
    )
    
    # Image properties
    order_index: int = mapped_column(
        Integer,
        default=0,
        nullable=False
    )
    
    is_main: bool = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        index=True
    )
    
    image_type: Optional[str] = mapped_column(
        String(50),
        nullable=True
    )  # activity, location, equipment, result, etc.
    
    # Image metadata
    width: Optional[int] = mapped_column(
        Integer,
        nullable=True
    )
    
    height: Optional[int] = mapped_column(
        Integer,
        nullable=True
    )
    
    photographer: Optional[str] = mapped_column(
        String(255),
        nullable=True
    )
    
    # Usage rights
    copyright_info: Optional[str] = mapped_column(
        Text,
        nullable=True
    )
    
    # Moderation
    is_approved: bool = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )
    
    # Relationships
    experience: Mapped["Experience"] = relationship(
        "Experience",
        back_populates="images"
    )


class ExperienceTranslation(BaseModel, TimestampMixin):
    """Experience content translations."""
    
    __tablename__ = 'experience_translations'
    
    experience_id: UUID = mapped_column(
        UUID(as_uuid=True),
        ForeignKey('experiences.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    
    language_code: str = mapped_column(
        String(10),
        nullable=False,
        index=True
    )
    
    language_name: str = mapped_column(
        String(50),
        nullable=False
    )
    
    # Translated content
    title: str = mapped_column(
        String(255),
        nullable=False
    )
    
    description: str = mapped_column(
        Text,
        nullable=False
    )
    
    short_description: Optional[str] = mapped_column(
        String(500),
        nullable=True
    )
    
    meeting_point_description: str = mapped_column(
        Text,
        nullable=False
    )
    
    special_requirements: Optional[str] = mapped_column(
        Text,
        nullable=True
    )
    
    cancellation_policy: str = mapped_column(
        Text,
        nullable=False
    )
    
    # Translation metadata
    translator_name: Optional[str] = mapped_column(
        String(255),
        nullable=True
    )
    
    translation_quality: Optional[float] = mapped_column(
        Float,
        nullable=True
    )
    
    is_machine_translated: bool = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )
    
    is_reviewed: bool = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )
    
    reviewed_by: Optional[UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=True
    )
    
    # Relationships
    experience: Mapped["Experience"] = relationship(
        "Experience",
        back_populates="translations"
    )
    
    __table_args__ = (
        UniqueConstraint('experience_id', 'language_code', 
                        name='unique_experience_translation'),
    )


# Association table for experience categories (many-to-many)
experience_category_associations = Table(
    'experience_category_associations',
    BaseModel.metadata,
    Column('experience_id', UUID(as_uuid=True), 
           ForeignKey('experiences.id', ondelete='CASCADE'), primary_key=True),
    Column('category_id', UUID(as_uuid=True), 
           ForeignKey('experience_categories.id', ondelete='CASCADE'), primary_key=True),
    Column('created_at', DateTime(timezone=True), nullable=False),
)


# Database indexes for performance
experience_indexes = [
    Index('ix_experiences_search', Experience.status, Experience.experience_type, 
          Experience.is_verified),
    Index('ix_experiences_location_type', Experience.country_code, Experience.city, 
          Experience.experience_type),
    Index('ix_experiences_pricing', Experience.base_price, Experience.currency),
    Index('ix_experiences_rating', Experience.average_rating.desc(), 
          Experience.total_ratings.desc()),
    Index('ix_experience_schedules_availability', ExperienceSchedule.experience_id,
          ExperienceSchedule.date, ExperienceSchedule.is_available),
    Index('ix_experience_schedules_date_time', ExperienceSchedule.date,
          ExperienceSchedule.start_time),
]