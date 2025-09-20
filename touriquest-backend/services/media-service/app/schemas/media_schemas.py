"""
Media Service Pydantic Schemas
Request/response schemas for content management and media processing
"""
from datetime import datetime
from typing import Optional, List, Dict, Any, Union
from uuid import UUID
from enum import Enum

from pydantic import BaseModel, Field, validator, HttpUrl
from pydantic.types import PositiveInt, PositiveFloat


class MediaTypeEnum(str, Enum):
    """Media file types"""
    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"
    DOCUMENT = "document"
    AR_MODEL = "ar_model"
    TEXTURE = "texture"
    ARCHIVE = "archive"


class ProcessingStatusEnum(str, Enum):
    """Media processing status"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    QUARANTINED = "quarantined"


class ModerationStatusEnum(str, Enum):
    """Content moderation status"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    FLAGGED = "flagged"
    UNDER_REVIEW = "under_review"


class ContentCategoryEnum(str, Enum):
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


class PrivacyLevelEnum(str, Enum):
    """Content privacy levels"""
    PUBLIC = "public"
    FOLLOWERS = "followers"
    PRIVATE = "private"


# Upload and Creation Schemas
class MediaUploadRequest(BaseModel):
    """Request schema for media upload"""
    category: ContentCategoryEnum
    privacy_level: PrivacyLevelEnum = PrivacyLevelEnum.PUBLIC
    tags: Optional[List[str]] = Field(None, max_items=20)
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[UUID] = None
    description: Optional[str] = Field(None, max_length=1000)
    language_code: str = Field("en", min_length=2, max_length=10)
    
    @validator('tags')
    def validate_tags(cls, v):
        if v:
            return [tag.strip().lower() for tag in v if tag.strip()]
        return v


class MediaUploadResponse(BaseModel):
    """Response schema for successful upload"""
    id: UUID
    filename: str
    file_size: int
    mime_type: str
    media_type: MediaTypeEnum
    category: ContentCategoryEnum
    upload_url: Optional[HttpUrl]  # Pre-signed URL for direct upload
    processing_status: ProcessingStatusEnum
    cdn_url: Optional[HttpUrl]
    expires_at: Optional[datetime]
    created_at: datetime
    
    class Config:
        from_attributes = True


class MediaFileMetadata(BaseModel):
    """Media file metadata schema"""
    width: Optional[int] = None
    height: Optional[int] = None
    duration: Optional[float] = None
    bitrate: Optional[int] = None
    frame_rate: Optional[float] = None
    color_space: Optional[str] = None
    format_info: Optional[Dict[str, Any]] = None
    exif_data: Optional[Dict[str, Any]] = None
    audio_channels: Optional[int] = None
    sample_rate: Optional[int] = None
    camera_make: Optional[str] = None
    camera_model: Optional[str] = None
    location: Optional[Dict[str, float]] = None  # lat, lng
    keywords: Optional[List[str]] = None


class ProcessedVariantInfo(BaseModel):
    """Processed variant information"""
    variant_type: str
    filename: str
    file_size: int
    mime_type: str
    cdn_url: Optional[HttpUrl]
    dimensions: Optional[Dict[str, Any]]
    quality_settings: Optional[Dict[str, Any]]
    processing_status: ProcessingStatusEnum
    created_at: datetime
    
    class Config:
        from_attributes = True


class MediaFileResponse(BaseModel):
    """Complete media file response"""
    id: UUID
    filename: str
    original_filename: str
    file_size: int
    mime_type: str
    media_type: MediaTypeEnum
    category: ContentCategoryEnum
    tags: Optional[List[str]]
    content_hash: Optional[str]
    
    # Status and processing
    processing_status: ProcessingStatusEnum
    moderation_status: ModerationStatusEnum
    privacy_level: PrivacyLevelEnum
    
    # Storage and delivery
    cdn_url: Optional[HttpUrl]
    storage_region: Optional[str]
    
    # Metadata
    metadata: Optional[MediaFileMetadata]
    dimensions: Optional[Dict[str, Any]]
    duration: Optional[float]
    
    # Security and compliance
    virus_scan_status: str
    copyright_scan_status: str
    
    # Usage statistics
    download_count: int = 0
    view_count: int = 0
    last_accessed: Optional[datetime]
    
    # Versioning
    version: int = 1
    parent_file_id: Optional[UUID]
    
    # Processed variants
    variants: Optional[List[ProcessedVariantInfo]] = None
    
    # Timestamps
    created_at: datetime
    updated_at: datetime
    expires_at: Optional[datetime]
    
    class Config:
        from_attributes = True


# Content Management Schemas
class ContentCreateRequest(BaseModel):
    """Request to create content with media"""
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=5000)
    media_file_ids: List[UUID] = Field(..., min_items=1, max_items=50)
    category: ContentCategoryEnum
    privacy_level: PrivacyLevelEnum = PrivacyLevelEnum.PUBLIC
    tags: Optional[List[str]] = Field(None, max_items=30)
    language_code: str = Field("en", min_length=2, max_length=10)
    location: Optional[Dict[str, float]] = None  # lat, lng
    
    @validator('tags')
    def validate_tags(cls, v):
        if v:
            return [tag.strip().lower() for tag in v if tag.strip()]
        return v


class ContentUpdateRequest(BaseModel):
    """Request to update existing content"""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=5000)
    tags: Optional[List[str]] = Field(None, max_items=30)
    privacy_level: Optional[PrivacyLevelEnum] = None
    
    @validator('tags')
    def validate_tags(cls, v):
        if v:
            return [tag.strip().lower() for tag in v if tag.strip()]
        return v


class ContentResponse(BaseModel):
    """Content response with media files"""
    id: UUID
    title: str
    description: Optional[str]
    category: ContentCategoryEnum
    privacy_level: PrivacyLevelEnum
    tags: Optional[List[str]]
    language_code: str
    location: Optional[Dict[str, float]]
    
    # Media files
    media_files: List[MediaFileResponse]
    
    # Ownership and relationships
    created_by: UUID
    related_entity_type: Optional[str]
    related_entity_id: Optional[UUID]
    
    # Status
    moderation_status: ModerationStatusEnum
    is_featured: bool = False
    
    # Engagement
    view_count: int = 0
    like_count: int = 0
    share_count: int = 0
    
    # Timestamps
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# Search and Discovery Schemas
class MediaSearchRequest(BaseModel):
    """Media search request"""
    query: Optional[str] = Field(None, max_length=500)
    media_types: Optional[List[MediaTypeEnum]] = None
    categories: Optional[List[ContentCategoryEnum]] = None
    tags: Optional[List[str]] = None
    uploaded_by: Optional[UUID] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    file_size_min: Optional[PositiveInt] = None
    file_size_max: Optional[PositiveInt] = None
    moderation_status: Optional[List[ModerationStatusEnum]] = None
    processing_status: Optional[List[ProcessingStatusEnum]] = None
    has_variants: Optional[bool] = None
    
    # Pagination
    limit: int = Field(20, ge=1, le=100)
    offset: int = Field(0, ge=0)
    
    # Sorting
    sort_by: str = Field("created_at", regex="^(created_at|updated_at|file_size|view_count|download_count)$")
    sort_order: str = Field("desc", regex="^(asc|desc)$")


class MediaSearchResponse(BaseModel):
    """Media search response"""
    results: List[MediaFileResponse]
    total_count: int
    page_size: int
    offset: int
    has_more: bool
    search_time_ms: int
    
    # Search suggestions
    suggested_tags: Optional[List[str]] = None
    related_searches: Optional[List[str]] = None


# Moderation Schemas
class ModerationRequest(BaseModel):
    """Content moderation request"""
    action: str = Field(..., regex="^(approve|reject|flag|review)$")
    reason: Optional[str] = Field(None, max_length=1000)
    policy_violations: Optional[List[str]] = None
    content_warning: Optional[str] = None
    expires_at: Optional[datetime] = None


class ModerationResponse(BaseModel):
    """Content moderation response"""
    id: UUID
    media_file_id: UUID
    moderation_status: ModerationStatusEnum
    action_taken: str
    reason: Optional[str]
    moderator_id: Optional[UUID]
    decision_at: datetime
    
    # AI analysis results
    ai_analysis: Optional[Dict[str, Any]] = None
    confidence_score: Optional[float] = None
    
    class Config:
        from_attributes = True


# Processing and Variants Schemas
class ProcessingJobRequest(BaseModel):
    """Background processing job request"""
    media_file_id: UUID
    processing_type: str = Field(..., regex="^(optimize|thumbnail|transcode|analyze)$")
    parameters: Optional[Dict[str, Any]] = None
    priority: int = Field(5, ge=1, le=10)


class ProcessingJobResponse(BaseModel):
    """Processing job response"""
    job_id: UUID
    media_file_id: UUID
    processing_type: str
    status: ProcessingStatusEnum
    progress_percentage: int = Field(0, ge=0, le=100)
    estimated_completion: Optional[datetime]
    error_message: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


class VariantGenerationRequest(BaseModel):
    """Request to generate specific variants"""
    media_file_id: UUID
    variant_types: List[str] = Field(..., min_items=1)
    quality_settings: Optional[Dict[str, Any]] = None
    force_regenerate: bool = False


# Analytics and Statistics Schemas
class MediaAnalyticsRequest(BaseModel):
    """Media analytics request"""
    date_from: datetime
    date_to: datetime
    media_file_ids: Optional[List[UUID]] = None
    group_by: str = Field("day", regex="^(hour|day|week|month)$")
    metrics: List[str] = Field(["views", "downloads"], min_items=1)


class MediaAnalyticsResponse(BaseModel):
    """Media analytics response"""
    timeframe: Dict[str, datetime]
    total_files: int
    total_storage_bytes: int
    total_bandwidth_bytes: int
    
    # Usage metrics
    metrics_data: Dict[str, List[Dict[str, Any]]]
    
    # Top performing content
    top_viewed: List[Dict[str, Any]]
    top_downloaded: List[Dict[str, Any]]
    
    # Geographic distribution
    geographic_stats: Dict[str, Any]
    
    # Cost metrics
    storage_cost: float
    bandwidth_cost: float


# DMCA and Compliance Schemas
class DMCANoticeRequest(BaseModel):
    """DMCA takedown notice request"""
    media_file_id: UUID
    claimant_name: str = Field(..., min_length=1, max_length=255)
    claimant_email: str = Field(..., regex="^[^@]+@[^@]+\.[^@]+$")
    claimant_address: str = Field(..., min_length=10)
    copyrighted_work_description: str = Field(..., min_length=10)
    infringing_content_description: str = Field(..., min_length=10)
    good_faith_statement: bool = True
    accuracy_statement: bool = True
    legal_signature: str = Field(..., min_length=1)


class DMCANoticeResponse(BaseModel):
    """DMCA notice response"""
    id: UUID
    media_file_id: UUID
    notice_type: str
    status: str
    claimant_name: str
    response_action: Optional[str]
    created_at: datetime
    response_date: Optional[datetime]
    
    class Config:
        from_attributes = True


# Multi-language Content Schemas
class ContentTranslationRequest(BaseModel):
    """Content translation request"""
    media_file_id: UUID
    target_language: str = Field(..., min_length=2, max_length=10)
    content_type: str = Field(..., regex="^(title|description|transcript|tags)$")
    content_text: str = Field(..., min_length=1)
    translator_id: Optional[UUID] = None


class ContentTranslationResponse(BaseModel):
    """Content translation response"""
    id: UUID
    media_file_id: UUID
    language_code: str
    content_type: str
    content_text: str
    is_original: bool
    translated_from: Optional[str]
    translation_confidence: Optional[float]
    created_at: datetime
    
    class Config:
        from_attributes = True


# Batch Operations Schemas
class BatchOperationRequest(BaseModel):
    """Batch operation request"""
    media_file_ids: List[UUID] = Field(..., min_items=1, max_items=1000)
    operation: str = Field(..., regex="^(delete|archive|moderate|tag|process)$")
    parameters: Optional[Dict[str, Any]] = None


class BatchOperationResponse(BaseModel):
    """Batch operation response"""
    operation_id: UUID
    total_items: int
    successful: int
    failed: int
    status: str
    results: List[Dict[str, Any]]
    created_at: datetime
    completed_at: Optional[datetime]
    
    class Config:
        from_attributes = True


# Storage and CDN Schemas
class StorageStatsResponse(BaseModel):
    """Storage statistics response"""
    total_files: int
    total_size_bytes: int
    storage_cost: float
    bandwidth_cost: float
    
    # Breakdown by type
    files_by_type: Dict[str, int]
    size_by_type: Dict[str, int]
    
    # Performance metrics
    avg_upload_time: float
    avg_processing_time: float
    cdn_hit_rate: float
    
    # Regional distribution
    storage_by_region: Dict[str, Any]
    access_by_region: Dict[str, Any]


class CDNPurgeRequest(BaseModel):
    """CDN cache purge request"""
    media_file_ids: Optional[List[UUID]] = None
    url_patterns: Optional[List[str]] = None
    purge_type: str = Field("selective", regex="^(selective|all)$")


class CDNPurgeResponse(BaseModel):
    """CDN cache purge response"""
    purge_id: str
    status: str
    purged_urls: List[str]
    estimated_completion: datetime