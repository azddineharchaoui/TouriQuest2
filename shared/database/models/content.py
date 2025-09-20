"""
Content Management and Media Models

This module contains SQLAlchemy models for content management including:
- Media file management (images, videos, audio)
- Content moderation and approval workflows
- Multi-language content and translations
- Rich text content with versioning
- Content analytics and engagement tracking
"""

from datetime import datetime
from typing import Optional, List, Any, Dict
from sqlalchemy import (
    String, Integer, DateTime, Boolean, Text, Enum, UUID, 
    ForeignKey, Table, UniqueConstraint, Index, CheckConstraint,
    ARRAY, JSON, BigInteger, Float
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID, JSONB
import uuid
import enum

from .base import BaseModel, TimestampMixin, SoftDeleteMixin, MetadataMixin, AuditMixin


class MediaType(enum.Enum):
    """Types of media content"""
    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"
    DOCUMENT = "document"
    AVATAR = "avatar"
    COVER = "cover"
    GALLERY = "gallery"
    THUMBNAIL = "thumbnail"


class MediaStatus(enum.Enum):
    """Status of media processing"""
    UPLOADING = "uploading"
    PROCESSING = "processing"
    PROCESSED = "processed"
    FAILED = "failed"
    DELETED = "deleted"


class ContentStatus(enum.Enum):
    """Status of content moderation"""
    DRAFT = "draft"
    PENDING_REVIEW = "pending_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    PUBLISHED = "published"
    ARCHIVED = "archived"
    FLAGGED = "flagged"


class ModerationAction(enum.Enum):
    """Content moderation actions"""
    APPROVE = "approve"
    REJECT = "reject"
    FLAG = "flag"
    HIDE = "hide"
    DELETE = "delete"
    WARN = "warn"
    BAN_USER = "ban_user"
    ESCALATE = "escalate"


class LanguageCode(enum.Enum):
    """Supported language codes"""
    EN = "en"  # English
    FR = "fr"  # French
    ES = "es"  # Spanish
    AR = "ar"  # Arabic
    DE = "de"  # German
    IT = "it"  # Italian
    PT = "pt"  # Portuguese
    RU = "ru"  # Russian
    ZH = "zh"  # Chinese
    JA = "ja"  # Japanese
    KO = "ko"  # Korean


class MediaFile(BaseModel, TimestampMixin, SoftDeleteMixin, MetadataMixin, AuditMixin):
    """Media file management"""
    __tablename__ = "media_files"

    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_url: Mapped[Optional[str]] = mapped_column(String(500))
    cdn_url: Mapped[Optional[str]] = mapped_column(String(500))
    media_type: Mapped[MediaType] = mapped_column(Enum(MediaType), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_size: Mapped[int] = mapped_column(BigInteger, nullable=False)  # bytes
    width: Mapped[Optional[int]] = mapped_column(Integer)
    height: Mapped[Optional[int]] = mapped_column(Integer)
    duration: Mapped[Optional[float]] = mapped_column(Float)  # seconds for video/audio
    status: Mapped[MediaStatus] = mapped_column(
        Enum(MediaStatus), default=MediaStatus.UPLOADING
    )
    upload_user_id: Mapped[uuid.UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    entity_type: Mapped[Optional[str]] = mapped_column(String(50))  # property, experience, user, etc.
    entity_id: Mapped[Optional[uuid.UUID]] = mapped_column(PostgreSQLUUID(as_uuid=True))
    alt_text: Mapped[Optional[str]] = mapped_column(String(500))
    caption: Mapped[Optional[str]] = mapped_column(Text)
    tags: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String))
    processing_data: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB)
    thumbnails: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB)  # Different size variants
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    download_count: Mapped[int] = mapped_column(Integer, default=0)
    view_count: Mapped[int] = mapped_column(Integer, default=0)
    is_public: Mapped[bool] = mapped_column(Boolean, default=True)
    copyright_info: Mapped[Optional[str]] = mapped_column(String(500))
    exif_data: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB)
    analysis_data: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB)  # AI analysis results

    # Relationships
    upload_user: Mapped["User"] = relationship("User")

    # Constraints and Indexes
    __table_args__ = (
        Index("ix_media_user_type", "upload_user_id", "media_type"),
        Index("ix_media_entity", "entity_type", "entity_id"),
        Index("ix_media_status", "status"),
        Index("ix_media_public", "is_public"),
        Index("ix_media_primary", "is_primary"),
        Index("ix_media_created", "created_at"),
        CheckConstraint("file_size > 0", name="ck_media_file_size"),
        CheckConstraint("width IS NULL OR width > 0", name="ck_media_width"),
        CheckConstraint("height IS NULL OR height > 0", name="ck_media_height"),
        CheckConstraint("duration IS NULL OR duration > 0", name="ck_media_duration"),
    )

    def get_thumbnail_url(self, size: str = "medium") -> Optional[str]:
        """Get thumbnail URL for specific size"""
        if self.thumbnails and size in self.thumbnails:
            return self.thumbnails[size].get("url")
        return None

    def is_image(self) -> bool:
        """Check if file is an image"""
        return self.media_type == MediaType.IMAGE

    def is_video(self) -> bool:
        """Check if file is a video"""
        return self.media_type == MediaType.VIDEO


class ContentTemplate(BaseModel, TimestampMixin, SoftDeleteMixin):
    """Reusable content templates"""
    __tablename__ = "content_templates"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    template_type: Mapped[str] = mapped_column(String(50), nullable=False)  # email, notification, description
    content: Mapped[str] = mapped_column(Text, nullable=False)
    variables: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB)  # Available template variables
    language: Mapped[LanguageCode] = mapped_column(
        Enum(LanguageCode), default=LanguageCode.EN
    )
    is_system: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL")
    )
    usage_count: Mapped[int] = mapped_column(Integer, default=0)

    # Relationships
    created_by: Mapped[Optional["User"]] = relationship("User")

    # Constraints and Indexes
    __table_args__ = (
        Index("ix_template_type", "template_type"),
        Index("ix_template_language", "language"),
        Index("ix_template_system", "is_system"),
        UniqueConstraint("name", "template_type", "language", name="uq_template_name_type_lang"),
    )


class ContentVersion(BaseModel, TimestampMixin):
    """Version control for content"""
    __tablename__ = "content_versions"

    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[uuid.UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), nullable=False)
    field_name: Mapped[str] = mapped_column(String(100), nullable=False)
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    language: Mapped[Optional[LanguageCode]] = mapped_column(Enum(LanguageCode))
    created_by_id: Mapped[uuid.UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    change_summary: Mapped[Optional[str]] = mapped_column(String(500))
    is_current: Mapped[bool] = mapped_column(Boolean, default=True)
    approved_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL")
    )
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime)

    # Relationships
    created_by: Mapped["User"] = relationship("User", foreign_keys=[created_by_id])
    approved_by: Mapped[Optional["User"]] = relationship(
        "User", foreign_keys=[approved_by_id]
    )

    # Constraints and Indexes
    __table_args__ = (
        Index("ix_content_version_entity", "entity_type", "entity_id"),
        Index("ix_content_version_current", "is_current"),
        Index("ix_content_version_field", "field_name"),
        UniqueConstraint(
            "entity_type", "entity_id", "field_name", "version_number",
            name="uq_content_version"
        ),
    )


class ContentModeration(BaseModel, TimestampMixin, AuditMixin):
    """Content moderation queue and history"""
    __tablename__ = "content_moderation"

    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[uuid.UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), nullable=False)
    content_type: Mapped[str] = mapped_column(String(50), nullable=False)  # text, image, video, review
    status: Mapped[ContentStatus] = mapped_column(
        Enum(ContentStatus), default=ContentStatus.PENDING_REVIEW
    )
    submitted_by_id: Mapped[uuid.UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    moderator_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL")
    )
    moderated_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    action_taken: Mapped[Optional[ModerationAction]] = mapped_column(Enum(ModerationAction))
    reason: Mapped[Optional[str]] = mapped_column(Text)
    moderator_notes: Mapped[Optional[str]] = mapped_column(Text)
    auto_flagged: Mapped[bool] = mapped_column(Boolean, default=False)
    flag_reasons: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String))
    confidence_score: Mapped[Optional[float]] = mapped_column(Float)  # AI confidence 0-1
    priority: Mapped[int] = mapped_column(Integer, default=1)  # 1-5 scale
    appeals_count: Mapped[int] = mapped_column(Integer, default=0)
    content_snapshot: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB)

    # Relationships
    submitted_by: Mapped["User"] = relationship("User", foreign_keys=[submitted_by_id])
    moderator: Mapped[Optional["User"]] = relationship("User", foreign_keys=[moderator_id])

    # Constraints and Indexes
    __table_args__ = (
        Index("ix_moderation_entity", "entity_type", "entity_id"),
        Index("ix_moderation_status", "status"),
        Index("ix_moderation_priority", "priority"),
        Index("ix_moderation_moderator", "moderator_id"),
        Index("ix_moderation_auto_flagged", "auto_flagged"),
        Index("ix_moderation_created", "created_at"),
        CheckConstraint("priority >= 1 AND priority <= 5", name="ck_moderation_priority"),
        CheckConstraint("confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)", 
                       name="ck_moderation_confidence"),
    )


class Translation(BaseModel, TimestampMixin, SoftDeleteMixin, AuditMixin):
    """Multi-language translations"""
    __tablename__ = "translations"

    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[uuid.UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), nullable=False)
    field_name: Mapped[str] = mapped_column(String(100), nullable=False)
    language: Mapped[LanguageCode] = mapped_column(Enum(LanguageCode), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    is_machine_translated: Mapped[bool] = mapped_column(Boolean, default=False)
    translator_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL")
    )
    quality_score: Mapped[Optional[float]] = mapped_column(Float)  # 0-1 scale
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    verified_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL")
    )
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    source_language: Mapped[Optional[LanguageCode]] = mapped_column(Enum(LanguageCode))
    translation_service: Mapped[Optional[str]] = mapped_column(String(50))  # google, deepl, human

    # Relationships
    translator: Mapped[Optional["User"]] = relationship("User", foreign_keys=[translator_id])
    verified_by: Mapped[Optional["User"]] = relationship("User", foreign_keys=[verified_by_id])

    # Constraints and Indexes
    __table_args__ = (
        UniqueConstraint(
            "entity_type", "entity_id", "field_name", "language",
            name="uq_translation"
        ),
        Index("ix_translation_entity", "entity_type", "entity_id"),
        Index("ix_translation_language", "language"),
        Index("ix_translation_verified", "is_verified"),
        Index("ix_translation_machine", "is_machine_translated"),
        CheckConstraint("quality_score IS NULL OR (quality_score >= 0 AND quality_score <= 1)",
                       name="ck_translation_quality"),
    )


class ContentAnalytics(BaseModel, TimestampMixin):
    """Content engagement and analytics"""
    __tablename__ = "content_analytics"

    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[uuid.UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), nullable=False)
    metric_name: Mapped[str] = mapped_column(String(100), nullable=False)  # views, likes, shares, downloads
    metric_value: Mapped[int] = mapped_column(Integer, default=0)
    date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL")
    )
    session_id: Mapped[Optional[str]] = mapped_column(String(100))
    user_agent: Mapped[Optional[str]] = mapped_column(String(500))
    ip_address: Mapped[Optional[str]] = mapped_column(String(45))  # IPv6 compatible
    referrer: Mapped[Optional[str]] = mapped_column(String(500))
    device_type: Mapped[Optional[str]] = mapped_column(String(50))
    country_code: Mapped[Optional[str]] = mapped_column(String(3))
    metadata: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB)

    # Relationships
    user: Mapped[Optional["User"]] = relationship("User")

    # Constraints and Indexes
    __table_args__ = (
        Index("ix_analytics_entity_date", "entity_type", "entity_id", "date"),
        Index("ix_analytics_metric_date", "metric_name", "date"),
        Index("ix_analytics_user_date", "user_id", "date"),
        Index("ix_analytics_country", "country_code"),
        Index("ix_analytics_device", "device_type"),
    )

    @classmethod
    def increment_metric(cls, entity_type: str, entity_id: uuid.UUID, 
                        metric_name: str, user_id: Optional[uuid.UUID] = None,
                        **kwargs) -> "ContentAnalytics":
        """Increment a metric for an entity"""
        return cls(
            entity_type=entity_type,
            entity_id=entity_id,
            metric_name=metric_name,
            metric_value=1,
            date=datetime.utcnow(),
            user_id=user_id,
            **kwargs
        )


class SearchIndex(BaseModel, TimestampMixin):
    """Full-text search index"""
    __tablename__ = "search_index"

    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[uuid.UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), nullable=False)
    language: Mapped[LanguageCode] = mapped_column(Enum(LanguageCode), nullable=False)
    title: Mapped[Optional[str]] = mapped_column(String(500))
    content: Mapped[str] = mapped_column(Text, nullable=False)
    keywords: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String))
    categories: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String))
    tags: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String))
    location_data: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB)
    search_vector: Mapped[Optional[str]] = mapped_column(Text)  # Full-text search vector
    boost_score: Mapped[float] = mapped_column(Float, default=1.0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_indexed: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Constraints and Indexes
    __table_args__ = (
        UniqueConstraint("entity_type", "entity_id", "language", name="uq_search_index"),
        Index("ix_search_entity", "entity_type", "entity_id"),
        Index("ix_search_language", "language"),
        Index("ix_search_active", "is_active"),
        Index("ix_search_boost", "boost_score"),
        # Full-text search index would be added in migration
        # Index("ix_search_vector", "search_vector", postgresql_using="gin"),
    )


class ContentRecommendation(BaseModel, TimestampMixin):
    """AI-powered content recommendations"""
    __tablename__ = "content_recommendations"

    user_id: Mapped[uuid.UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[uuid.UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), nullable=False)
    recommendation_type: Mapped[str] = mapped_column(String(50), nullable=False)  # similar, trending, personalized
    score: Mapped[float] = mapped_column(Float, nullable=False)  # 0-1 confidence score
    reasoning: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB)
    algorithm_version: Mapped[str] = mapped_column(String(50), nullable=False)
    source_entities: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String))  # What influenced this recommendation
    is_clicked: Mapped[bool] = mapped_column(Boolean, default=False)
    clicked_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    is_dismissed: Mapped[bool] = mapped_column(Boolean, default=False)
    dismissed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime)

    # Relationships
    user: Mapped["User"] = relationship("User")

    # Constraints and Indexes
    __table_args__ = (
        Index("ix_recommendation_user_type", "user_id", "recommendation_type"),
        Index("ix_recommendation_entity", "entity_type", "entity_id"),
        Index("ix_recommendation_score", "score"),
        Index("ix_recommendation_created", "created_at"),
        Index("ix_recommendation_expires", "expires_at"),
        CheckConstraint("score >= 0 AND score <= 1", name="ck_recommendation_score"),
    )