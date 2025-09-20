"""
Media Service Database Models
Comprehensive models for content management, processing, and storage
"""
import uuid
import enum
from datetime import datetime
from typing import Optional, Dict, Any, List
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Text, JSON,
    ForeignKey, Enum, Index, CheckConstraint, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY, JSONB
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

Base = declarative_base()


class MediaType(enum.Enum):
    """Media file types"""
    IMAGE = "image"
    VIDEO = "video" 
    AUDIO = "audio"
    DOCUMENT = "document"
    AR_MODEL = "ar_model"
    TEXTURE = "texture"
    ARCHIVE = "archive"


class ProcessingStatus(enum.Enum):
    """Media processing status"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    QUARANTINED = "quarantined"


class ModerationStatus(enum.Enum):
    """Content moderation status"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    FLAGGED = "flagged"
    UNDER_REVIEW = "under_review"


class ContentCategory(enum.Enum):
    """Content categorization"""
    PROPERTY_PHOTO = "property_photo"
    PROFILE_AVATAR = "profile_avatar"
    COVER_PHOTO = "cover_photo"
    POI_IMAGE = "poi_image"
    EXPERIENCE_MEDIA = "experience_media"
    USER_CONTENT = "user_content"
    AUDIO_GUIDE = "audio_guide"
    AR_EXPERIENCE = "ar_experience"
    DOCUMENT = "document"
    MARKETING = "marketing"


class PrivacyLevel(enum.Enum):
    """Content privacy levels"""
    PUBLIC = "public"
    FOLLOWERS = "followers"
    PRIVATE = "private"


class MediaFile(Base):
    """Main media file storage and metadata"""
    __tablename__ = "media_files"
    
    # Primary identification
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_size = Column(Integer, nullable=False)
    mime_type = Column(String(100), nullable=False)
    media_type = Column(Enum(MediaType), nullable=False)
    
    # Storage information
    storage_path = Column(String(500), nullable=False)
    cdn_url = Column(String(500))
    bucket_name = Column(String(100))
    storage_region = Column(String(50))
    
    # Content categorization
    category = Column(Enum(ContentCategory), nullable=False)
    tags = Column(ARRAY(String(50)))
    content_hash = Column(String(64), unique=True)  # For duplicate detection
    
    # Processing and status
    processing_status = Column(Enum(ProcessingStatus), default=ProcessingStatus.PENDING)
    moderation_status = Column(Enum(ModerationStatus), default=ModerationStatus.PENDING)
    privacy_level = Column(Enum(PrivacyLevel), default=PrivacyLevel.PUBLIC)
    
    # Ownership and relationships
    uploaded_by = Column(UUID(as_uuid=True), nullable=False)
    related_entity_type = Column(String(50))  # property, poi, experience, etc.
    related_entity_id = Column(UUID(as_uuid=True))
    
    # Metadata and technical details
    metadata = Column(JSONB)  # EXIF, video info, audio details, etc.
    dimensions = Column(JSONB)  # width, height for images/videos
    duration = Column(Float)  # for audio/video files
    encoding_settings = Column(JSONB)
    
    # Virus and security scanning
    virus_scan_status = Column(String(20), default="pending")
    virus_scan_result = Column(JSONB)
    copyright_scan_status = Column(String(20), default="pending")
    copyright_scan_result = Column(JSONB)
    
    # Usage and analytics
    download_count = Column(Integer, default=0)
    view_count = Column(Integer, default=0)
    last_accessed = Column(DateTime)
    
    # Versioning and lifecycle
    version = Column(Integer, default=1)
    parent_file_id = Column(UUID(as_uuid=True), ForeignKey('media_files.id'))
    is_archived = Column(Boolean, default=False)
    archive_date = Column(DateTime)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    expires_at = Column(DateTime)  # For temporary files
    
    # Relationships
    parent_file = relationship("MediaFile", remote_side=[id])
    versions = relationship("MediaFile", back_populates="parent_file")
    processed_variants = relationship("MediaProcessedVariant", back_populates="source_file")
    moderation_records = relationship("ContentModerationRecord", back_populates="media_file")
    
    # Indexes
    __table_args__ = (
        Index('idx_media_files_uploaded_by', 'uploaded_by'),
        Index('idx_media_files_category', 'category'),
        Index('idx_media_files_media_type', 'media_type'),
        Index('idx_media_files_processing_status', 'processing_status'),
        Index('idx_media_files_moderation_status', 'moderation_status'),
        Index('idx_media_files_content_hash', 'content_hash'),
        Index('idx_media_files_related_entity', 'related_entity_type', 'related_entity_id'),
        Index('idx_media_files_created_at', 'created_at'),
        Index('idx_media_files_tags', 'tags', postgresql_using='gin'),
        CheckConstraint('file_size > 0', name='positive_file_size'),
        CheckConstraint('version > 0', name='positive_version'),
    )


class MediaProcessedVariant(Base):
    """Processed variants of media files (thumbnails, different resolutions, etc.)"""
    __tablename__ = "media_processed_variants"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_file_id = Column(UUID(as_uuid=True), ForeignKey('media_files.id', ondelete='CASCADE'), nullable=False)
    
    # Variant details
    variant_type = Column(String(50), nullable=False)  # thumbnail, small, medium, large, hd, etc.
    filename = Column(String(255), nullable=False)
    file_size = Column(Integer, nullable=False)
    mime_type = Column(String(100), nullable=False)
    
    # Storage
    storage_path = Column(String(500), nullable=False)
    cdn_url = Column(String(500))
    
    # Technical specifications
    dimensions = Column(JSONB)  # width, height, bitrate, etc.
    quality_settings = Column(JSONB)
    processing_parameters = Column(JSONB)
    
    # Status and metadata
    processing_status = Column(Enum(ProcessingStatus), default=ProcessingStatus.PENDING)
    processing_time = Column(Float)  # seconds
    file_quality_score = Column(Float)  # 0-100
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    source_file = relationship("MediaFile", back_populates="processed_variants")
    
    # Indexes
    __table_args__ = (
        Index('idx_media_variants_source_file', 'source_file_id'),
        Index('idx_media_variants_type', 'variant_type'),
        Index('idx_media_variants_status', 'processing_status'),
        UniqueConstraint('source_file_id', 'variant_type', name='unique_variant_per_file'),
        CheckConstraint('file_size > 0', name='positive_variant_file_size'),
    )


class ContentModerationRecord(Base):
    """Content moderation workflow and decisions"""
    __tablename__ = "content_moderation_records"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    media_file_id = Column(UUID(as_uuid=True), ForeignKey('media_files.id', ondelete='CASCADE'), nullable=False)
    
    # Moderation details
    moderation_type = Column(String(50), nullable=False)  # automated, manual, appeal
    moderator_id = Column(UUID(as_uuid=True))  # null for automated
    moderation_status = Column(Enum(ModerationStatus), nullable=False)
    
    # Decision and reasoning
    decision_reason = Column(Text)
    confidence_score = Column(Float)  # 0-1 for automated decisions
    policy_violations = Column(ARRAY(String(100)))
    
    # Automated analysis results
    ai_analysis_result = Column(JSONB)
    nsfw_score = Column(Float)
    violence_score = Column(Float)
    adult_content_score = Column(Float)
    text_detection_result = Column(JSONB)
    
    # Action taken
    action_taken = Column(String(50))  # approved, rejected, flagged, content_warning
    appeal_deadline = Column(DateTime)
    appeal_count = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    decision_at = Column(DateTime)
    appeal_at = Column(DateTime)
    
    # Relationships
    media_file = relationship("MediaFile", back_populates="moderation_records")
    
    # Indexes
    __table_args__ = (
        Index('idx_moderation_media_file', 'media_file_id'),
        Index('idx_moderation_status', 'moderation_status'),
        Index('idx_moderation_moderator', 'moderator_id'),
        Index('idx_moderation_created_at', 'created_at'),
        CheckConstraint('confidence_score >= 0 AND confidence_score <= 1', name='valid_confidence_score'),
        CheckConstraint('appeal_count >= 0', name='non_negative_appeals'),
    )


class ContentTag(Base):
    """Content tagging system for organization and discovery"""
    __tablename__ = "content_tags"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tag_name = Column(String(100), nullable=False, unique=True)
    tag_category = Column(String(50))  # location, activity, mood, style, etc.
    description = Column(Text)
    
    # Usage statistics
    usage_count = Column(Integer, default=0)
    created_by = Column(UUID(as_uuid=True))
    is_verified = Column(Boolean, default=False)
    
    # Multi-language support
    translations = Column(JSONB)  # {language_code: translated_name}
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Indexes
    __table_args__ = (
        Index('idx_content_tags_name', 'tag_name'),
        Index('idx_content_tags_category', 'tag_category'),
        Index('idx_content_tags_usage', 'usage_count'),
    )


class MediaTagAssociation(Base):
    """Many-to-many relationship between media files and tags"""
    __tablename__ = "media_tag_associations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    media_file_id = Column(UUID(as_uuid=True), ForeignKey('media_files.id', ondelete='CASCADE'), nullable=False)
    tag_id = Column(UUID(as_uuid=True), ForeignKey('content_tags.id', ondelete='CASCADE'), nullable=False)
    
    # Tagging metadata
    confidence_score = Column(Float)  # for AI-generated tags
    tagged_by = Column(UUID(as_uuid=True))  # user who added the tag
    is_ai_generated = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    
    # Indexes
    __table_args__ = (
        Index('idx_media_tags_media_file', 'media_file_id'),
        Index('idx_media_tags_tag', 'tag_id'),
        UniqueConstraint('media_file_id', 'tag_id', name='unique_media_tag'),
        CheckConstraint('confidence_score >= 0 AND confidence_score <= 1', name='valid_tag_confidence'),
    )


class ContentLanguage(Base):
    """Multi-language content support"""
    __tablename__ = "content_languages"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    media_file_id = Column(UUID(as_uuid=True), ForeignKey('media_files.id', ondelete='CASCADE'), nullable=False)
    
    # Language information
    language_code = Column(String(10), nullable=False)  # ISO 639-1
    content_type = Column(String(50), nullable=False)  # title, description, transcript, etc.
    content_text = Column(Text, nullable=False)
    
    # Translation metadata
    is_original = Column(Boolean, default=False)
    translated_from = Column(String(10))
    translation_confidence = Column(Float)
    translator_id = Column(UUID(as_uuid=True))  # human translator
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Indexes
    __table_args__ = (
        Index('idx_content_lang_media_file', 'media_file_id'),
        Index('idx_content_lang_code', 'language_code'),
        Index('idx_content_lang_type', 'content_type'),
        UniqueConstraint('media_file_id', 'language_code', 'content_type', name='unique_content_language'),
        CheckConstraint('translation_confidence >= 0 AND translation_confidence <= 1', name='valid_translation_confidence'),
    )


class MediaUsageTracking(Base):
    """Track media file usage and analytics"""
    __tablename__ = "media_usage_tracking"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    media_file_id = Column(UUID(as_uuid=True), ForeignKey('media_files.id', ondelete='CASCADE'), nullable=False)
    
    # Usage context
    user_id = Column(UUID(as_uuid=True))
    session_id = Column(String(100))
    user_agent = Column(String(500))
    ip_address = Column(String(45))
    referer = Column(String(500))
    
    # Access details
    access_type = Column(String(50), nullable=False)  # view, download, share, embed
    variant_type = Column(String(50))  # which variant was accessed
    bytes_transferred = Column(Integer)
    
    # Geographic and device information
    country_code = Column(String(2))
    city = Column(String(100))
    device_type = Column(String(50))  # mobile, desktop, tablet
    
    # Timestamps
    accessed_at = Column(DateTime, default=func.now())
    
    # Indexes
    __table_args__ = (
        Index('idx_usage_media_file', 'media_file_id'),
        Index('idx_usage_user', 'user_id'),
        Index('idx_usage_accessed_at', 'accessed_at'),
        Index('idx_usage_access_type', 'access_type'),
        Index('idx_usage_country', 'country_code'),
    )


class MediaStorageStats(Base):
    """Storage statistics and cost optimization"""
    __tablename__ = "media_storage_stats"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Time period
    date = Column(DateTime, nullable=False)
    
    # Storage metrics
    total_files = Column(Integer, default=0)
    total_size_bytes = Column(Integer, default=0)
    storage_cost = Column(Float, default=0.0)
    bandwidth_cost = Column(Float, default=0.0)
    
    # Usage metrics by type
    image_files = Column(Integer, default=0)
    video_files = Column(Integer, default=0)
    audio_files = Column(Integer, default=0)
    document_files = Column(Integer, default=0)
    
    # Performance metrics
    avg_upload_time = Column(Float)
    avg_processing_time = Column(Float)
    cdn_hit_rate = Column(Float)
    
    # Regional distribution
    storage_by_region = Column(JSONB)
    access_by_region = Column(JSONB)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    
    # Indexes
    __table_args__ = (
        Index('idx_storage_stats_date', 'date'),
        UniqueConstraint('date', name='unique_daily_stats'),
    )


class DMCACompliance(Base):
    """DMCA takedown notices and copyright compliance"""
    __tablename__ = "dmca_compliance"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    media_file_id = Column(UUID(as_uuid=True), ForeignKey('media_files.id', ondelete='CASCADE'), nullable=False)
    
    # DMCA notice details
    notice_type = Column(String(50), nullable=False)  # takedown, counter_notice
    claimant_name = Column(String(255), nullable=False)
    claimant_email = Column(String(255), nullable=False)
    claimant_address = Column(Text)
    
    # Claim details
    copyrighted_work_description = Column(Text, nullable=False)
    infringing_content_description = Column(Text, nullable=False)
    good_faith_statement = Column(Boolean, default=False)
    accuracy_statement = Column(Boolean, default=False)
    
    # Response and status
    status = Column(String(50), default="received")  # received, processing, resolved, disputed
    response_action = Column(String(50))  # content_removed, fair_use, counter_notice
    response_date = Column(DateTime)
    response_notes = Column(Text)
    
    # Legal information
    legal_signature = Column(String(255))
    signature_date = Column(DateTime)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Indexes
    __table_args__ = (
        Index('idx_dmca_media_file', 'media_file_id'),
        Index('idx_dmca_status', 'status'),
        Index('idx_dmca_created_at', 'created_at'),
    )