"""Pydantic schemas for content moderation endpoints."""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class ModerationStatusEnum(str, Enum):
    """Content moderation status options."""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    REMOVED = "removed"
    UNDER_REVIEW = "under_review"


class ContentTypeEnum(str, Enum):
    """Content type options."""
    PROPERTY = "property"
    REVIEW = "review"
    COMMENT = "comment"
    PHOTO = "photo"
    EXPERIENCE = "experience"
    USER_PROFILE = "user_profile"


class ModerationPriorityEnum(str, Enum):
    """Moderation priority levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class AppealStatusEnum(str, Enum):
    """Appeal status options."""
    NONE = "none"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    UPHELD = "upheld"
    OVERTURNED = "overturned"


# Request/Response Models
class ContentModerationSummary(BaseModel):
    """Summary view of content moderation for list display."""
    id: str
    content_type: str
    content_id: str
    status: str
    priority: str
    reported_by: Optional[str] = None
    auto_flagged: bool
    flag_reason: str
    created_at: datetime
    reviewed_at: Optional[datetime] = None
    reviewer_notes: Optional[str] = None
    
    class Config:
        from_attributes = True


class ContentModerationDetail(BaseModel):
    """Detailed view of content moderation."""
    id: str
    content_type: str
    content_id: str
    content_title: Optional[str] = None
    content_excerpt: Optional[str] = None
    content_metadata: Dict[str, Any] = Field(default_factory=dict)
    status: str
    priority: str
    reported_by: Optional[str] = None
    auto_flagged: bool
    flag_reason: str
    flag_details: Dict[str, Any] = Field(default_factory=dict)
    reviewer_id: Optional[str] = None
    reviewer_notes: Optional[str] = None
    resolution: Optional[str] = None
    appeal_status: Optional[str] = None
    appeal_text: Optional[str] = None
    appeal_response: Optional[str] = None
    created_at: datetime
    reviewed_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    history: List[Dict[str, Any]] = Field(default_factory=list)
    
    class Config:
        from_attributes = True


class ContentModerationFilters(BaseModel):
    """Filters for content moderation queries."""
    status: Optional[str] = None
    content_type: Optional[str] = None
    priority: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class ContentModerationUpdate(BaseModel):
    """Update data for content moderation."""
    status: Optional[ModerationStatusEnum] = None
    priority: Optional[ModerationPriorityEnum] = None
    reviewer_notes: Optional[str] = None
    resolution: Optional[str] = None


class BulkModerationAction(BaseModel):
    """Bulk action request for multiple content items."""
    moderation_ids: List[str] = Field(..., min_items=1, max_items=100)
    action: str = Field(..., description="Action to perform: approve, reject, delete")
    reason: str = Field(..., min_length=1, max_length=500)
    
    class Config:
        schema_extra = {
            "example": {
                "moderation_ids": ["mod-123", "mod-456"],
                "action": "approve",
                "reason": "Content meets community guidelines"
            }
        }


class AppealSubmission(BaseModel):
    """Appeal submission for moderation decision."""
    appeal_text: str = Field(..., min_length=10, max_length=2000)
    
    class Config:
        schema_extra = {
            "example": {
                "appeal_text": "I believe this content was incorrectly flagged because..."
            }
        }


class AppealResponse(BaseModel):
    """Response to an appeal."""
    resolution: str = Field(..., description="Appeal resolution: upheld or overturned")
    response_text: str = Field(..., min_length=10, max_length=2000)
    
    class Config:
        schema_extra = {
            "example": {
                "resolution": "overturned",
                "response_text": "Upon review, the original decision was incorrect..."
            }
        }


class ContentModerationStats(BaseModel):
    """Statistics for content moderation dashboard."""
    total_pending: int
    total_approved: int
    total_rejected: int
    total_removed: int
    high_priority_pending: int
    recent_activity: int  # Last 7 days
    by_content_type: Dict[str, int] = Field(default_factory=dict)
    by_status: Dict[str, int] = Field(default_factory=dict)
    
    class Config:
        schema_extra = {
            "example": {
                "total_pending": 45,
                "total_approved": 1250,
                "total_rejected": 89,
                "total_removed": 23,
                "high_priority_pending": 5,
                "recent_activity": 67,
                "by_content_type": {
                    "property": 30,
                    "review": 15,
                    "photo": 25
                },
                "by_status": {
                    "pending": 45,
                    "approved": 1250,
                    "rejected": 89
                }
            }
        }


class AutoScanConfig(BaseModel):
    """Configuration for automated content scanning."""
    enabled: bool = True
    scan_interval_hours: int = Field(default=1, ge=1, le=24)
    auto_approve_threshold: float = Field(default=0.95, ge=0.0, le=1.0)
    auto_flag_threshold: float = Field(default=0.7, ge=0.0, le=1.0)
    content_types: List[ContentTypeEnum] = Field(
        default_factory=lambda: list(ContentTypeEnum)
    )
    
    class Config:
        schema_extra = {
            "example": {
                "enabled": True,
                "scan_interval_hours": 2,
                "auto_approve_threshold": 0.95,
                "auto_flag_threshold": 0.7,
                "content_types": ["property", "review", "photo"]
            }
        }


class ModerationAction(BaseModel):
    """Individual moderation action record."""
    action_id: str
    moderation_id: str
    admin_id: str
    admin_email: str
    action_type: str
    reason: Optional[str] = None
    notes: Optional[str] = None
    timestamp: datetime
    
    class Config:
        from_attributes = True


class ModerationReport(BaseModel):
    """Moderation activity report."""
    report_id: str
    period_start: datetime
    period_end: datetime
    total_items_reviewed: int
    approved_count: int
    rejected_count: int
    removed_count: int
    appeal_count: int
    avg_response_time_hours: float
    top_moderators: List[Dict[str, Any]] = Field(default_factory=list)
    common_issues: List[Dict[str, Any]] = Field(default_factory=list)
    
    class Config:
        schema_extra = {
            "example": {
                "report_id": "rep-2024-01",
                "period_start": "2024-01-01T00:00:00Z",
                "period_end": "2024-01-31T23:59:59Z",
                "total_items_reviewed": 450,
                "approved_count": 380,
                "rejected_count": 55,
                "removed_count": 15,
                "appeal_count": 12,
                "avg_response_time_hours": 2.5,
                "top_moderators": [
                    {"admin_id": "admin-123", "name": "John Doe", "reviews": 150}
                ],
                "common_issues": [
                    {"reason": "inappropriate_content", "count": 25}
                ]
            }
        }


class ContentFlagRequest(BaseModel):
    """Request to flag content for moderation."""
    content_type: ContentTypeEnum
    content_id: str
    flag_reason: str = Field(..., min_length=1, max_length=200)
    flag_details: Optional[Dict[str, Any]] = Field(default_factory=dict)
    priority: ModerationPriorityEnum = ModerationPriorityEnum.MEDIUM
    auto_flagged: bool = False
    reported_by: Optional[str] = None
    
    class Config:
        schema_extra = {
            "example": {
                "content_type": "property",
                "content_id": "prop-123",
                "flag_reason": "Inappropriate images",
                "flag_details": {"confidence": 0.85, "categories": ["adult_content"]},
                "priority": "high",
                "auto_flagged": True
            }
        }