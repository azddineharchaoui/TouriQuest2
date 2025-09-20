"""
POI (Points of Interest) related SQLAlchemy models
"""
from datetime import datetime, time
from typing import Optional, List
from enum import Enum as PyEnum

from sqlalchemy import (
    Column, String, DateTime, Boolean, Text, Integer, Float, Time,
    ForeignKey, Enum, UniqueConstraint, CheckConstraint, Index
)
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import relationship, mapped_column, Mapped
from sqlalchemy.ext.hybrid import hybrid_property

from .base import (
    BaseModel, TimestampMixin, SoftDeleteMixin, AuditMixin,
    MetadataMixin, GeolocationMixin, RatingMixin, SearchableMixin
)


class POICategoryEnum(PyEnum):
    """POI category enumeration."""
    MUSEUM = "museum"
    HISTORICAL_SITE = "historical_site"
    MONUMENT = "monument"
    PARK = "park"
    BEACH = "beach"
    RESTAURANT = "restaurant"
    CAFE = "cafe"
    SHOPPING = "shopping"
    MARKET = "market"
    ENTERTAINMENT = "entertainment"
    NIGHTLIFE = "nightlife"
    RELIGIOUS_SITE = "religious_site"
    VIEWPOINT = "viewpoint"
    NATURE_RESERVE = "nature_reserve"
    ADVENTURE_ACTIVITY = "adventure_activity"
    CULTURAL_CENTER = "cultural_center"
    ART_GALLERY = "art_gallery"
    THEATER = "theater"
    MUSIC_VENUE = "music_venue"
    SPORTS_FACILITY = "sports_facility"
    SPA_WELLNESS = "spa_wellness"
    TRANSPORTATION = "transportation"
    ACCOMMODATION = "accommodation"
    SERVICE = "service"
    OTHER = "other"


class POIStatusEnum(PyEnum):
    """POI status enumeration."""
    DRAFT = "draft"
    PENDING_REVIEW = "pending_review"
    ACTIVE = "active"
    INACTIVE = "inactive"
    TEMPORARILY_CLOSED = "temporarily_closed"
    PERMANENTLY_CLOSED = "permanently_closed"
    UNDER_RENOVATION = "under_renovation"


class AccessibilityLevelEnum(PyEnum):
    """Accessibility level enumeration."""
    FULL = "full"
    PARTIAL = "partial"
    LIMITED = "limited"
    NOT_ACCESSIBLE = "not_accessible"
    UNKNOWN = "unknown"


class POI(BaseModel, TimestampMixin, SoftDeleteMixin, AuditMixin,
          GeolocationMixin, RatingMixin, SearchableMixin, MetadataMixin):
    """Point of Interest model."""
    
    __tablename__ = 'pois'
    
    # Basic information
    name: str = mapped_column(
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
    
    category: POICategoryEnum = mapped_column(
        Enum(POICategoryEnum),
        nullable=False,
        index=True
    )
    
    subcategory: Optional[str] = mapped_column(
        String(100),
        nullable=True,
        index=True
    )
    
    # Status
    status: POIStatusEnum = mapped_column(
        Enum(POIStatusEnum),
        default=POIStatusEnum.ACTIVE,
        nullable=False,
        index=True
    )
    
    # Contact information
    phone_number: Optional[str] = mapped_column(
        String(20),
        nullable=True
    )
    
    email: Optional[str] = mapped_column(
        String(255),
        nullable=True
    )
    
    website_url: Optional[str] = mapped_column(
        String(500),
        nullable=True
    )
    
    # Physical details
    entrance_fee: Optional[float] = mapped_column(
        Float,
        nullable=True
    )
    
    entrance_fee_currency: Optional[str] = mapped_column(
        String(3),
        nullable=True
    )
    
    estimated_visit_duration: Optional[int] = mapped_column(
        Integer,
        nullable=True
    )  # Duration in minutes
    
    # Features and amenities
    has_wifi: bool = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )
    
    has_parking: bool = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )
    
    is_pet_friendly: bool = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )
    
    is_family_friendly: bool = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )
    
    allows_photography: bool = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )
    
    # Accessibility
    accessibility_level: AccessibilityLevelEnum = mapped_column(
        Enum(AccessibilityLevelEnum),
        default=AccessibilityLevelEnum.UNKNOWN,
        nullable=False
    )
    
    accessibility_features: Optional[List[str]] = mapped_column(
        ARRAY(String),
        nullable=True
    )
    
    # Crowd and popularity
    popularity_score: float = mapped_column(
        Float,
        default=0.0,
        nullable=False,
        index=True
    )
    
    visit_count: int = mapped_column(
        Integer,
        default=0,
        nullable=False
    )
    
    # Best visit times
    best_visit_months: Optional[List[str]] = mapped_column(
        ARRAY(String),
        nullable=True
    )
    
    best_visit_times: Optional[List[str]] = mapped_column(
        ARRAY(String),
        nullable=True
    )  # morning, afternoon, evening, night
    
    # Cultural information
    historical_significance: Optional[str] = mapped_column(
        Text,
        nullable=True
    )
    
    cultural_importance: Optional[str] = mapped_column(
        Text,
        nullable=True
    )
    
    # Safety and guidelines
    safety_guidelines: Optional[str] = mapped_column(
        Text,
        nullable=True
    )
    
    visitor_guidelines: Optional[str] = mapped_column(
        Text,
        nullable=True
    )
    
    # Administrative
    created_by_user_id: Optional[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey('users.id'),
        nullable=True,
        index=True
    )
    
    verified_by_admin: bool = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        index=True
    )
    
    verification_date: Optional[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    
    # Relationships
    categories: Mapped[List["POICategory"]] = relationship(
        "POICategory",
        secondary="poi_category_associations",
        back_populates="pois"
    )
    
    images: Mapped[List["POIImage"]] = relationship(
        "POIImage",
        back_populates="poi",
        cascade="all, delete-orphan",
        order_by="POIImage.order_index"
    )
    
    audio_guides: Mapped[List["POIAudioGuide"]] = relationship(
        "POIAudioGuide",
        back_populates="poi",
        cascade="all, delete-orphan"
    )
    
    ar_experiences: Mapped[List["POIARExperience"]] = relationship(
        "POIARExperience",
        back_populates="poi",
        cascade="all, delete-orphan"
    )
    
    translations: Mapped[List["POITranslation"]] = relationship(
        "POITranslation",
        back_populates="poi",
        cascade="all, delete-orphan"
    )
    
    opening_hours: Mapped[List["POIOpeningHours"]] = relationship(
        "POIOpeningHours",
        back_populates="poi",
        cascade="all, delete-orphan"
    )
    
    @hybrid_property
    def is_open_now(self) -> bool:
        """Check if POI is currently open."""
        # This would need to be implemented with current time logic
        return True  # Placeholder
    
    @hybrid_property
    def main_image_url(self) -> Optional[str]:
        """Get the main POI image URL."""
        if self.images:
            main_image = next((img for img in self.images if img.is_main), None)
            return main_image.image_url if main_image else self.images[0].image_url
        return None
    
    @hybrid_property
    def has_audio_guide(self) -> bool:
        """Check if POI has audio guides available."""
        return len(self.audio_guides) > 0
    
    @hybrid_property
    def has_ar_experience(self) -> bool:
        """Check if POI has AR experiences available."""
        return len(self.ar_experiences) > 0


class POICategory(BaseModel, TimestampMixin):
    """POI category management."""
    
    __tablename__ = 'poi_categories'
    
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
        ForeignKey('poi_categories.id'),
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
    parent_category: Mapped[Optional["POICategory"]] = relationship(
        "POICategory",
        remote_side=[id],
        back_populates="subcategories"
    )
    
    subcategories: Mapped[List["POICategory"]] = relationship(
        "POICategory",
        back_populates="parent_category"
    )
    
    pois: Mapped[List["POI"]] = relationship(
        "POI",
        secondary="poi_category_associations",
        back_populates="categories"
    )


class POIImage(BaseModel, TimestampMixin):
    """POI images and visual content."""
    
    __tablename__ = 'poi_images'
    
    poi_id: UUID = mapped_column(
        UUID(as_uuid=True),
        ForeignKey('pois.id', ondelete='CASCADE'),
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
    )  # exterior, interior, detail, aerial, etc.
    
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
    
    photo_date: Optional[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    
    # Usage rights
    copyright_info: Optional[str] = mapped_column(
        Text,
        nullable=True
    )
    
    usage_rights: Optional[str] = mapped_column(
        String(100),
        nullable=True
    )
    
    # Moderation
    is_approved: bool = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )
    
    # Relationships
    poi: Mapped["POI"] = relationship(
        "POI",
        back_populates="images"
    )


class POIAudioGuide(BaseModel, TimestampMixin, MetadataMixin):
    """POI audio guides and content."""
    
    __tablename__ = 'poi_audio_guides'
    
    poi_id: UUID = mapped_column(
        UUID(as_uuid=True),
        ForeignKey('pois.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    
    # Language and localization
    language_code: str = mapped_column(
        String(10),
        nullable=False,
        index=True
    )
    
    language_name: str = mapped_column(
        String(50),
        nullable=False
    )
    
    # Audio content
    title: str = mapped_column(
        String(255),
        nullable=False
    )
    
    description: Optional[str] = mapped_column(
        Text,
        nullable=True
    )
    
    audio_url: str = mapped_column(
        String(500),
        nullable=False
    )
    
    # Content details
    duration_seconds: int = mapped_column(
        Integer,
        nullable=False
    )
    
    file_size_bytes: Optional[int] = mapped_column(
        Integer,
        nullable=True
    )
    
    audio_format: str = mapped_column(
        String(10),
        default='mp3',
        nullable=False
    )
    
    # Transcript and accessibility
    transcript: Optional[str] = mapped_column(
        Text,
        nullable=True
    )
    
    has_transcript: bool = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )
    
    # Narrator information
    narrator_name: Optional[str] = mapped_column(
        String(255),
        nullable=True
    )
    
    narrator_bio: Optional[str] = mapped_column(
        Text,
        nullable=True
    )
    
    # Content structure
    chapter_count: int = mapped_column(
        Integer,
        default=1,
        nullable=False
    )
    
    chapters: Optional[dict] = mapped_column(
        JSONB,
        nullable=True
    )  # Chapter timestamps and titles
    
    # Usage and analytics
    play_count: int = mapped_column(
        Integer,
        default=0,
        nullable=False
    )
    
    download_count: int = mapped_column(
        Integer,
        default=0,
        nullable=False
    )
    
    # Version control
    version: str = mapped_column(
        String(10),
        default='1.0',
        nullable=False
    )
    
    is_latest_version: bool = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )
    
    # Quality and moderation
    is_approved: bool = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )
    
    quality_score: Optional[float] = mapped_column(
        Float,
        nullable=True
    )
    
    # Relationships
    poi: Mapped["POI"] = relationship(
        "POI",
        back_populates="audio_guides"
    )
    
    __table_args__ = (
        UniqueConstraint('poi_id', 'language_code', 'version', 
                        name='unique_poi_audio_guide'),
    )


class POIARExperience(BaseModel, TimestampMixin, MetadataMixin):
    """POI Augmented Reality experiences."""
    
    __tablename__ = 'poi_ar_experiences'
    
    poi_id: UUID = mapped_column(
        UUID(as_uuid=True),
        ForeignKey('pois.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    
    # AR Experience details
    title: str = mapped_column(
        String(255),
        nullable=False
    )
    
    description: str = mapped_column(
        Text,
        nullable=False
    )
    
    # AR content
    ar_model_url: Optional[str] = mapped_column(
        String(500),
        nullable=True
    )
    
    ar_scene_data: Optional[dict] = mapped_column(
        JSONB,
        nullable=True
    )
    
    # Trigger configuration
    trigger_type: str = mapped_column(
        String(50),
        nullable=False
    )  # location_based, marker_based, image_target
    
    trigger_data: dict = mapped_column(
        JSONB,
        nullable=False
    )
    
    # Technical specifications
    supported_platforms: List[str] = mapped_column(
        ARRAY(String),
        nullable=False
    )  # ios, android, web
    
    minimum_ar_version: Optional[str] = mapped_column(
        String(20),
        nullable=True
    )
    
    file_size_mb: Optional[float] = mapped_column(
        Float,
        nullable=True
    )
    
    # Performance requirements
    performance_tier: str = mapped_column(
        String(20),
        default='medium',
        nullable=False
    )  # low, medium, high
    
    requires_internet: bool = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )
    
    # Content metadata
    language_code: str = mapped_column(
        String(10),
        default='en',
        nullable=False
    )
    
    duration_seconds: Optional[int] = mapped_column(
        Integer,
        nullable=True
    )
    
    # Usage analytics
    view_count: int = mapped_column(
        Integer,
        default=0,
        nullable=False
    )
    
    completion_count: int = mapped_column(
        Integer,
        default=0,
        nullable=False
    )
    
    # Version and status
    version: str = mapped_column(
        String(10),
        default='1.0',
        nullable=False
    )
    
    is_active: bool = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )
    
    is_approved: bool = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )
    
    # Relationships
    poi: Mapped["POI"] = relationship(
        "POI",
        back_populates="ar_experiences"
    )


class POITranslation(BaseModel, TimestampMixin):
    """POI content translations."""
    
    __tablename__ = 'poi_translations'
    
    poi_id: UUID = mapped_column(
        UUID(as_uuid=True),
        ForeignKey('pois.id', ondelete='CASCADE'),
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
    name: str = mapped_column(
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
    
    historical_significance: Optional[str] = mapped_column(
        Text,
        nullable=True
    )
    
    cultural_importance: Optional[str] = mapped_column(
        Text,
        nullable=True
    )
    
    visitor_guidelines: Optional[str] = mapped_column(
        Text,
        nullable=True
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
    poi: Mapped["POI"] = relationship(
        "POI",
        back_populates="translations"
    )
    
    __table_args__ = (
        UniqueConstraint('poi_id', 'language_code', name='unique_poi_translation'),
    )


class POIOpeningHours(BaseModel, TimestampMixin):
    """POI opening hours and schedules."""
    
    __tablename__ = 'poi_opening_hours'
    
    poi_id: UUID = mapped_column(
        UUID(as_uuid=True),
        ForeignKey('pois.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    
    # Day of week (0 = Monday, 6 = Sunday)
    day_of_week: int = mapped_column(
        Integer,
        nullable=False,
        index=True
    )
    
    # Opening times
    opens_at: Optional[time] = mapped_column(
        Time,
        nullable=True
    )
    
    closes_at: Optional[time] = mapped_column(
        Time,
        nullable=True
    )
    
    # Special cases
    is_closed: bool = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )
    
    is_24_hours: bool = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )
    
    # Break times
    break_start: Optional[time] = mapped_column(
        Time,
        nullable=True
    )
    
    break_end: Optional[time] = mapped_column(
        Time,
        nullable=True
    )
    
    # Seasonal variations
    season: Optional[str] = mapped_column(
        String(20),
        nullable=True
    )  # summer, winter, holiday, etc.
    
    effective_from: Optional[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    
    effective_until: Optional[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    
    # Notes
    notes: Optional[str] = mapped_column(
        Text,
        nullable=True
    )
    
    # Relationships
    poi: Mapped["POI"] = relationship(
        "POI",
        back_populates="opening_hours"
    )
    
    __table_args__ = (
        UniqueConstraint('poi_id', 'day_of_week', 'season', 
                        name='unique_poi_opening_hours'),
        CheckConstraint('day_of_week >= 0 AND day_of_week <= 6', 
                       name='check_valid_day_of_week'),
    )


# Association table for POI categories (many-to-many)
poi_category_associations = Table(
    'poi_category_associations',
    BaseModel.metadata,
    Column('poi_id', UUID(as_uuid=True), ForeignKey('pois.id', ondelete='CASCADE'), 
           primary_key=True),
    Column('category_id', UUID(as_uuid=True), ForeignKey('poi_categories.id', ondelete='CASCADE'), 
           primary_key=True),
    Column('created_at', DateTime(timezone=True), default=func.now(), nullable=False),
)


# Database indexes for performance
poi_indexes = [
    Index('ix_pois_search', POI.status, POI.category, POI.popularity_score.desc()),
    Index('ix_pois_location_category', POI.country_code, POI.city, POI.category),
    Index('ix_pois_rating', POI.average_rating.desc(), POI.total_ratings.desc()),
    Index('ix_pois_coordinates', POI.latitude, POI.longitude),
    Index('ix_poi_audio_guides_language', POIAudioGuide.poi_id, POIAudioGuide.language_code),
    Index('ix_poi_ar_experiences_platform', POIARExperience.poi_id, 
          POIARExperience.supported_platforms),
    Index('ix_poi_opening_hours_day', POIOpeningHours.poi_id, POIOpeningHours.day_of_week),
]