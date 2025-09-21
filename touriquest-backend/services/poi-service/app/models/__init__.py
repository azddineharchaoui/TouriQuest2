"""
Database models for POI Service
"""

from datetime import datetime, time
from typing import Optional, List, Dict, Any
from enum import Enum
from uuid import uuid4, UUID

from sqlalchemy import (
    Column, String, Integer, Float, DateTime, Boolean, Text, JSON,
    ForeignKey, Table, Index, CheckConstraint, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, ARRAY
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from geoalchemy2 import Geography
from sqlalchemy.sql import func

Base = declarative_base()


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


class OpeningHoursStatusEnum(str, Enum):
    OPEN = "open"
    CLOSED = "closed"
    TEMPORARILY_CLOSED = "temporarily_closed"
    PERMANENTLY_CLOSED = "permanently_closed"


class ReviewStatusEnum(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    FLAGGED = "flagged"


# Association tables for many-to-many relationships
poi_amenities = Table(
    'poi_amenities',
    Base.metadata,
    Column('poi_id', PG_UUID(as_uuid=True), ForeignKey('pois.id')),
    Column('amenity_id', PG_UUID(as_uuid=True), ForeignKey('amenities.id'))
)

poi_accessibility_features = Table(
    'poi_accessibility_features',
    Base.metadata,
    Column('poi_id', PG_UUID(as_uuid=True), ForeignKey('pois.id')),
    Column('accessibility_feature_id', PG_UUID(as_uuid=True), ForeignKey('accessibility_features.id'))
)

user_poi_favorites = Table(
    'user_poi_favorites',
    Base.metadata,
    Column('user_id', PG_UUID(as_uuid=True), index=True),
    Column('poi_id', PG_UUID(as_uuid=True), ForeignKey('pois.id')),
    Column('created_at', DateTime, default=datetime.utcnow)
)


class POI(Base):
    __tablename__ = "pois"
    
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    name = Column(String(255), nullable=False, index=True)
    slug = Column(String(300), unique=True, index=True)
    category = Column(String(50), nullable=False, index=True)
    subcategory = Column(String(100), index=True)
    
    # Location data
    location = Column(Geography('POINT', srid=4326), nullable=False, index=True)
    address = Column(Text)
    city = Column(String(100), index=True)
    country = Column(String(100), index=True)
    postal_code = Column(String(20))
    
    # Basic information
    description = Column(Text)
    short_description = Column(String(500))
    website = Column(String(500))
    phone = Column(String(50))
    email = Column(String(255))
    
    # Ratings and popularity
    average_rating = Column(Float, default=0.0, index=True)
    review_count = Column(Integer, default=0)
    popularity_score = Column(Float, default=0.0, index=True)
    view_count = Column(Integer, default=0)
    
    # Features and attributes
    is_family_friendly = Column(Boolean, default=False, index=True)
    allows_photography = Column(Boolean, default=True)
    has_audio_guide = Column(Boolean, default=False, index=True)
    has_ar_experience = Column(Boolean, default=False, index=True)
    is_free = Column(Boolean, default=False, index=True)
    
    # Pricing information
    entry_fee_adult = Column(Float)
    entry_fee_child = Column(Float)
    entry_fee_senior = Column(Float)
    entry_fee_student = Column(Float)
    currency = Column(String(3), default="USD")
    
    # Seasonal and temporal data
    is_seasonal = Column(Boolean, default=False)
    seasonal_start_date = Column(DateTime)
    seasonal_end_date = Column(DateTime)
    estimated_visit_duration = Column(Integer)  # in minutes
    
    # Status and metadata
    is_active = Column(Boolean, default=True, index=True)
    is_verified = Column(Boolean, default=False, index=True)
    verification_date = Column(DateTime)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(PG_UUID(as_uuid=True))
    
    # Relationships
    opening_hours = relationship("OpeningHours", back_populates="poi", cascade="all, delete-orphan")
    images = relationship("POIImage", back_populates="poi", cascade="all, delete-orphan")
    reviews = relationship("POIReview", back_populates="poi", cascade="all, delete-orphan")
    audio_guides = relationship("AudioGuide", back_populates="poi", cascade="all, delete-orphan")
    ar_experiences = relationship("ARExperience", back_populates="poi", cascade="all, delete-orphan")
    translations = relationship("POITranslation", back_populates="poi", cascade="all, delete-orphan")
    nearby_amenities = relationship("NearbyAmenity", back_populates="poi", cascade="all, delete-orphan")
    
    # Many-to-many relationships
    amenities = relationship("Amenity", secondary=poi_amenities, back_populates="pois")
    accessibility_features = relationship("AccessibilityFeature", secondary=poi_accessibility_features, back_populates="pois")
    
    __table_args__ = (
        Index('idx_poi_location_gist', 'location', postgresql_using='gist'),
        Index('idx_poi_category_rating', 'category', 'average_rating'),
        Index('idx_poi_popularity', 'popularity_score'),
    )


class POITranslation(Base):
    __tablename__ = "poi_translations"
    
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    poi_id = Column(PG_UUID(as_uuid=True), ForeignKey('pois.id'), nullable=False)
    language_code = Column(String(5), nullable=False, index=True)
    
    name = Column(String(255))
    description = Column(Text)
    short_description = Column(String(500))
    visitor_tips = Column(Text)
    historical_info = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    poi = relationship("POI", back_populates="translations")
    
    __table_args__ = (
        UniqueConstraint('poi_id', 'language_code'),
        Index('idx_poi_translation_lang', 'language_code'),
    )


class OpeningHours(Base):
    __tablename__ = "opening_hours"
    
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    poi_id = Column(PG_UUID(as_uuid=True), ForeignKey('pois.id'), nullable=False)
    
    day_of_week = Column(Integer, nullable=False)  # 0=Monday, 6=Sunday
    opens_at = Column(String(5))  # HH:MM format
    closes_at = Column(String(5))  # HH:MM format
    is_closed = Column(Boolean, default=False)
    is_24_hours = Column(Boolean, default=False)
    
    # Special hours (holidays, events)
    special_date = Column(DateTime)
    special_opens_at = Column(String(5))
    special_closes_at = Column(String(5))
    special_is_closed = Column(Boolean, default=False)
    special_note = Column(String(255))
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    poi = relationship("POI", back_populates="opening_hours")
    
    __table_args__ = (
        Index('idx_opening_hours_poi_day', 'poi_id', 'day_of_week'),
        CheckConstraint('day_of_week >= 0 AND day_of_week <= 6'),
    )


class POIImage(Base):
    __tablename__ = "poi_images"
    
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    poi_id = Column(PG_UUID(as_uuid=True), ForeignKey('pois.id'), nullable=False)
    
    url = Column(String(500), nullable=False)
    thumbnail_url = Column(String(500))
    alt_text = Column(String(255))
    caption = Column(Text)
    
    order_index = Column(Integer, default=0)
    is_primary = Column(Boolean, default=False)
    width = Column(Integer)
    height = Column(Integer)
    file_size = Column(Integer)
    
    uploaded_by = Column(PG_UUID(as_uuid=True))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    poi = relationship("POI", back_populates="images")
    
    __table_args__ = (
        Index('idx_poi_image_order', 'poi_id', 'order_index'),
    )


class POIReview(Base):
    __tablename__ = "poi_reviews"
    
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    poi_id = Column(PG_UUID(as_uuid=True), ForeignKey('pois.id'), nullable=False)
    user_id = Column(PG_UUID(as_uuid=True), nullable=False, index=True)
    
    rating = Column(Integer, nullable=False)  # 1-5 stars
    title = Column(String(255))
    comment = Column(Text)
    
    # Review details
    visit_date = Column(DateTime)
    was_crowded = Column(Boolean)
    wait_time_minutes = Column(Integer)
    would_recommend = Column(Boolean)
    
    # Helpful votes
    helpful_count = Column(Integer, default=0)
    not_helpful_count = Column(Integer, default=0)
    
    # Moderation
    status = Column(String(20), default=ReviewStatusEnum.PENDING.value)
    moderated_by = Column(PG_UUID(as_uuid=True))
    moderation_notes = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    poi = relationship("POI", back_populates="reviews")
    
    __table_args__ = (
        Index('idx_poi_review_rating', 'poi_id', 'rating'),
        Index('idx_poi_review_user', 'user_id'),
        Index('idx_poi_review_status', 'status'),
        CheckConstraint('rating >= 1 AND rating <= 5'),
        UniqueConstraint('poi_id', 'user_id'),  # One review per user per POI
    )


class AudioGuide(Base):
    __tablename__ = "audio_guides"
    
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    poi_id = Column(PG_UUID(as_uuid=True), ForeignKey('pois.id'), nullable=False)
    
    language_code = Column(String(5), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    
    # Audio files and processing
    original_audio_url = Column(String(500))
    processed_audio_url = Column(String(500), nullable=False)
    transcript = Column(Text)
    duration_seconds = Column(Integer)
    file_size_bytes = Column(Integer)
    
    # Audio technical details
    bitrate_kbps = Column(Integer, default=128)
    sample_rate_hz = Column(Integer, default=44100)
    channels = Column(Integer, default=2)
    format = Column(String(10), default="mp3")
    
    # Content segmentation for progressive download
    segment_count = Column(Integer, default=1)
    segment_duration_seconds = Column(Integer, default=30)
    segments_metadata = Column(JSON)  # Array of segment info
    
    # Narrator information
    narrator_name = Column(String(100))
    narrator_bio = Column(Text)
    narrator_photo_url = Column(String(500))
    
    # Content versioning
    version = Column(String(20), default="1.0")
    previous_version_id = Column(PG_UUID(as_uuid=True), ForeignKey('audio_guides.id'))
    
    # Analytics and engagement
    download_count = Column(Integer, default=0)
    play_count = Column(Integer, default=0)
    completion_rate = Column(Float, default=0.0)
    average_listening_duration = Column(Integer, default=0)
    
    # Accessibility features
    has_audio_description = Column(Boolean, default=False)
    has_sign_language = Column(Boolean, default=False)
    accessibility_transcript = Column(Text)
    
    # Status and moderation
    is_active = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)
    moderation_status = Column(String(20), default="pending")
    moderation_notes = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    published_at = Column(DateTime)
    
    # Relationships
    poi = relationship("POI", back_populates="audio_guides")
    previous_version = relationship("AudioGuide", remote_side=[id])
    download_sessions = relationship("AudioDownloadSession", back_populates="audio_guide")
    playback_analytics = relationship("AudioPlaybackAnalytics", back_populates="audio_guide")
    
    __table_args__ = (
        Index('idx_audio_guide_poi_lang', 'poi_id', 'language_code'),
        Index('idx_audio_guide_moderation', 'moderation_status'),
        Index('idx_audio_guide_version', 'version'),
    )


class ARExperience(Base):
    __tablename__ = "ar_experiences"
    
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    poi_id = Column(PG_UUID(as_uuid=True), ForeignKey('pois.id'), nullable=False)
    
    name = Column(String(255), nullable=False)
    description = Column(Text)
    instructions = Column(Text)
    user_guide_url = Column(String(500))
    
    # AR content URLs and assets
    model_url = Column(String(500))
    texture_urls = Column(JSON)  # Array of texture file URLs
    animation_urls = Column(JSON)  # Array of animation file URLs
    sound_effect_urls = Column(JSON)  # Array of sound effect URLs
    
    # Model technical details
    model_format = Column(String(10), default="gltf")
    polygon_count = Column(Integer)
    texture_resolution = Column(Integer)
    animation_count = Column(Integer, default=0)
    
    # File sizes and optimization
    total_file_size_mb = Column(Float)
    compressed_size_mb = Column(Float)
    optimization_level = Column(String(10), default="medium")
    
    # Trigger and positioning
    trigger_location = Column(Geography('POINT', srid=4326))
    trigger_radius_meters = Column(Float, default=50.0)
    trigger_type = Column(String(20), default="location")  # location, marker, face
    marker_image_url = Column(String(500))
    
    # Device compatibility
    min_ios_version = Column(String(10))
    min_android_version = Column(String(10))
    requires_lidar = Column(Boolean, default=False)
    requires_depth_camera = Column(Boolean, default=False)
    min_ram_mb = Column(Integer, default=2048)
    supports_occlusion = Column(Boolean, default=False)
    
    # Experience details
    estimated_duration_seconds = Column(Integer)
    interaction_types = Column(JSON)  # Array of interaction types
    learning_objectives = Column(JSON)  # Array of educational goals
    
    # Content versioning
    version = Column(String(20), default="1.0")
    previous_version_id = Column(PG_UUID(as_uuid=True), ForeignKey('ar_experiences.id'))
    
    # Analytics and performance
    usage_count = Column(Integer, default=0)
    average_session_duration = Column(Integer, default=0)
    completion_rate = Column(Float, default=0.0)
    performance_rating = Column(Float, default=0.0)
    
    # Status and quality
    is_active = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)
    quality_score = Column(Float, default=0.0)
    moderation_status = Column(String(20), default="pending")
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    published_at = Column(DateTime)
    
    # Relationships
    poi = relationship("POI", back_populates="ar_experiences")
    previous_version = relationship("ARExperience", remote_side=[id])
    compatibility_reports = relationship("ARCompatibilityReport", back_populates="ar_experience")
    usage_analytics = relationship("ARUsageAnalytics", back_populates="ar_experience")
    
    __table_args__ = (
        Index('idx_ar_experience_poi', 'poi_id'),
        Index('idx_ar_experience_format', 'model_format'),
        Index('idx_ar_experience_compatibility', 'min_ios_version', 'min_android_version'),
        Index('idx_ar_experience_moderation', 'moderation_status'),
    )


# New tables for enhanced multimedia features

class MediaFile(Base):
    __tablename__ = "media_files"
    
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    
    # File identification
    original_filename = Column(String(255), nullable=False)
    stored_filename = Column(String(255), nullable=False, unique=True)
    content_type = Column(String(100), nullable=False)
    file_extension = Column(String(10), nullable=False)
    
    # Storage details
    storage_path = Column(String(500), nullable=False)
    cdn_url = Column(String(500))
    s3_bucket = Column(String(100))
    s3_key = Column(String(500))
    
    # File metadata
    file_size_bytes = Column(Integer, nullable=False)
    checksum = Column(String(64))  # SHA-256 hash
    
    # Media-specific metadata
    media_type = Column(String(20))  # audio, image, model, texture, animation
    duration_seconds = Column(Integer)  # for audio/video
    dimensions = Column(JSON)  # {"width": 1920, "height": 1080}
    
    # Processing status
    processing_status = Column(String(20), default="pending")  # pending, processing, completed, failed
    processed_variants = Column(JSON)  # Array of processed file URLs
    processing_error = Column(Text)
    
    # Upload and processing metadata
    uploaded_by = Column(PG_UUID(as_uuid=True))
    upload_session_id = Column(String(100))
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime)
    
    __table_args__ = (
        Index('idx_media_file_type', 'media_type'),
        Index('idx_media_file_status', 'processing_status'),
        Index('idx_media_file_uploader', 'uploaded_by'),
    )


class AudioDownloadSession(Base):
    __tablename__ = "audio_download_sessions"
    
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    audio_guide_id = Column(PG_UUID(as_uuid=True), ForeignKey('audio_guides.id'), nullable=False)
    user_id = Column(PG_UUID(as_uuid=True), index=True)
    
    # Session details
    session_id = Column(String(100), unique=True, nullable=False)
    device_type = Column(String(50))
    device_os = Column(String(50))
    app_version = Column(String(20))
    
    # Download progress
    total_size_bytes = Column(Integer)
    downloaded_bytes = Column(Integer, default=0)
    progress_percentage = Column(Float, default=0.0)
    download_speed_kbps = Column(Float)
    
    # Status and completion
    status = Column(String(20), default="pending")  # pending, downloading, completed, failed, cancelled
    error_message = Column(Text)
    
    # Network and performance
    connection_type = Column(String(20))  # wifi, cellular, ethernet
    bandwidth_kbps = Column(Integer)
    
    # Timestamps
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    
    # Relationships
    audio_guide = relationship("AudioGuide", back_populates="download_sessions")
    
    __table_args__ = (
        Index('idx_audio_download_user', 'user_id'),
        Index('idx_audio_download_status', 'status'),
        Index('idx_audio_download_session', 'session_id'),
    )


class AudioPlaybackAnalytics(Base):
    __tablename__ = "audio_playback_analytics"
    
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    audio_guide_id = Column(PG_UUID(as_uuid=True), ForeignKey('audio_guides.id'), nullable=False)
    user_id = Column(PG_UUID(as_uuid=True), index=True)
    
    # Session information
    session_id = Column(String(100), nullable=False)
    device_type = Column(String(50))
    playback_quality = Column(String(20))  # high, medium, low
    
    # Playback metrics
    total_duration_seconds = Column(Integer)
    played_duration_seconds = Column(Integer)
    completion_percentage = Column(Float)
    
    # User interactions
    pause_count = Column(Integer, default=0)
    skip_count = Column(Integer, default=0)
    replay_count = Column(Integer, default=0)
    speed_changes = Column(JSON)  # Array of speed change events
    
    # Engagement metrics
    average_session_duration = Column(Integer)
    drop_off_points = Column(JSON)  # Array of timestamps where users stopped
    
    # Location context
    playback_location = Column(Geography('POINT', srid=4326))
    distance_from_poi_meters = Column(Float)
    
    # Timestamps
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime)
    
    # Relationships
    audio_guide = relationship("AudioGuide", back_populates="playback_analytics")
    
    __table_args__ = (
        Index('idx_audio_playback_user', 'user_id'),
        Index('idx_audio_playback_session', 'session_id'),
        Index('idx_audio_playback_completion', 'completion_percentage'),
    )


class ARCompatibilityReport(Base):
    __tablename__ = "ar_compatibility_reports"
    
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    ar_experience_id = Column(PG_UUID(as_uuid=True), ForeignKey('ar_experiences.id'), nullable=False)
    user_id = Column(PG_UUID(as_uuid=True), index=True)
    
    # Device information
    device_model = Column(String(100))
    device_os = Column(String(50))
    os_version = Column(String(20))
    app_version = Column(String(20))
    
    # Hardware capabilities
    has_lidar = Column(Boolean)
    has_depth_camera = Column(Boolean)
    ram_mb = Column(Integer)
    storage_available_mb = Column(Integer)
    
    # AR framework support
    arcore_version = Column(String(20))
    arkit_version = Column(String(20))
    
    # Compatibility results
    is_compatible = Column(Boolean, nullable=False)
    compatibility_score = Column(Float)  # 0.0 to 1.0
    performance_rating = Column(Float)  # 0.0 to 5.0
    
    # Issues and limitations
    compatibility_issues = Column(JSON)  # Array of issue descriptions
    performance_issues = Column(JSON)  # Array of performance problems
    
    # Timestamps
    tested_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    ar_experience = relationship("ARExperience", back_populates="compatibility_reports")
    
    __table_args__ = (
        Index('idx_ar_compatibility_device', 'device_model', 'os_version'),
        Index('idx_ar_compatibility_score', 'compatibility_score'),
        Index('idx_ar_compatibility_user', 'user_id'),
    )


class ARUsageAnalytics(Base):
    __tablename__ = "ar_usage_analytics"
    
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    ar_experience_id = Column(PG_UUID(as_uuid=True), ForeignKey('ar_experiences.id'), nullable=False)
    user_id = Column(PG_UUID(as_uuid=True), index=True)
    
    # Session details
    session_id = Column(String(100), nullable=False)
    device_type = Column(String(50))
    
    # Usage metrics
    session_duration_seconds = Column(Integer)
    interactions_count = Column(Integer, default=0)
    successful_placements = Column(Integer, default=0)
    failed_placements = Column(Integer, default=0)
    
    # Performance metrics
    average_fps = Column(Float)
    loading_time_seconds = Column(Float)
    tracking_quality = Column(Float)  # 0.0 to 1.0
    
    # User engagement
    completion_percentage = Column(Float)
    user_rating = Column(Integer)  # 1 to 5 stars
    shared_experience = Column(Boolean, default=False)
    
    # Environmental context
    lighting_conditions = Column(String(20))  # bright, normal, dim, dark
    surface_quality = Column(String(20))  # excellent, good, fair, poor
    
    # Location context
    usage_location = Column(Geography('POINT', srid=4326))
    distance_from_trigger_meters = Column(Float)
    
    # Timestamps
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime)
    
    # Relationships
    ar_experience = relationship("ARExperience", back_populates="usage_analytics")
    
    __table_args__ = (
        Index('idx_ar_usage_user', 'user_id'),
        Index('idx_ar_usage_session', 'session_id'),
        Index('idx_ar_usage_completion', 'completion_percentage'),
        Index('idx_ar_usage_rating', 'user_rating'),
    )


class ContentVersion(Base):
    __tablename__ = "content_versions"
    
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    
    # Content identification
    content_type = Column(String(20), nullable=False)  # audio_guide, ar_experience
    content_id = Column(PG_UUID(as_uuid=True), nullable=False)
    
    # Version information
    version_number = Column(String(20), nullable=False)
    version_name = Column(String(100))
    changelog = Column(Text)
    
    # Version metadata
    file_urls = Column(JSON)  # Array of file URLs for this version
    file_sizes = Column(JSON)  # Corresponding file sizes
    total_size_mb = Column(Float)
    
    # Release information
    is_current = Column(Boolean, default=False)
    is_beta = Column(Boolean, default=False)
    release_notes = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    released_at = Column(DateTime)
    deprecated_at = Column(DateTime)
    
    __table_args__ = (
        Index('idx_content_version_type_id', 'content_type', 'content_id'),
        Index('idx_content_version_current', 'is_current'),
        UniqueConstraint('content_type', 'content_id', 'version_number', name='uq_content_version'),
    )


class Amenity(Base):
    __tablename__ = "amenities"
    
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    name = Column(String(100), nullable=False, unique=True)
    category = Column(String(50), nullable=False, index=True)
    icon = Column(String(100))
    description = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    pois = relationship("POI", secondary=poi_amenities, back_populates="amenities")


class AccessibilityFeature(Base):
    __tablename__ = "accessibility_features"
    
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    name = Column(String(100), nullable=False, unique=True)
    type = Column(String(50), nullable=False, index=True)
    description = Column(Text)
    icon = Column(String(100))
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    pois = relationship("POI", secondary=poi_accessibility_features, back_populates="accessibility_features")


class NearbyAmenity(Base):
    __tablename__ = "nearby_amenities"
    
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    poi_id = Column(PG_UUID(as_uuid=True), ForeignKey('pois.id'), nullable=False)
    
    name = Column(String(255), nullable=False)
    type = Column(String(50), nullable=False)  # parking, restaurant, restroom, etc.
    distance_meters = Column(Float)
    location = Column(Geography('POINT', srid=4326))
    description = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    poi = relationship("POI", back_populates="nearby_amenities")
    
    __table_args__ = (
        Index('idx_nearby_amenity_type', 'type'),
    )


class POIInteraction(Base):
    __tablename__ = "poi_interactions"
    
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    poi_id = Column(PG_UUID(as_uuid=True), ForeignKey('pois.id'), nullable=False)
    user_id = Column(PG_UUID(as_uuid=True), index=True)
    session_id = Column(String(100), index=True)
    
    interaction_type = Column(String(50), nullable=False, index=True)  # view, favorite, share, etc.
    interaction_data = Column(JSON)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        Index('idx_poi_interaction_type_date', 'interaction_type', 'created_at'),
        Index('idx_poi_interaction_poi_date', 'poi_id', 'created_at'),
    )


class CrowdLevel(Base):
    __tablename__ = "crowd_levels"
    
    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    poi_id = Column(PG_UUID(as_uuid=True), ForeignKey('pois.id'), nullable=False)
    
    date = Column(DateTime, nullable=False)
    hour = Column(Integer, nullable=False)  # 0-23
    crowd_level = Column(Integer, nullable=False)  # 1-5 scale
    wait_time_minutes = Column(Integer)
    
    source = Column(String(50))  # manual, estimated, real-time
    confidence = Column(Float, default=1.0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        Index('idx_crowd_level_poi_date', 'poi_id', 'date'),
        CheckConstraint('hour >= 0 AND hour <= 23'),
        CheckConstraint('crowd_level >= 1 AND crowd_level <= 5'),
    )