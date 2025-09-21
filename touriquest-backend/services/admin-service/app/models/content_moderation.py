"""Content moderation model for managing user-generated content."""

from sqlalchemy import Column, String, DateTime, Text, Float, Boolean, Integer, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, JSON
from sqlalchemy.sql import func
import uuid
from enum import Enum
from datetime import datetime

from app.core.database import Base


class ContentType(str, Enum):
    """Type of content being moderated."""
    PROPERTY_LISTING = "property_listing"
    PROPERTY_PHOTO = "property_photo"
    PROPERTY_DESCRIPTION = "property_description"
    USER_PROFILE = "user_profile"
    USER_PHOTO = "user_photo"
    REVIEW = "review"
    COMMENT = "comment"
    MESSAGE = "message"
    POI_CONTENT = "poi_content"
    EXPERIENCE_LISTING = "experience_listing"


class ModerationStatus(str, Enum):
    """Content moderation status."""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    FLAGGED = "flagged"
    UNDER_REVIEW = "under_review"
    APPEALED = "appealed"


class ModerationReason(str, Enum):
    """Reasons for content moderation actions."""
    INAPPROPRIATE_LANGUAGE = "inappropriate_language"
    SEXUAL_CONTENT = "sexual_content"
    VIOLENCE = "violence"
    HATE_SPEECH = "hate_speech"
    SPAM = "spam"
    SCAM = "scam"
    FALSE_INFORMATION = "false_information"
    COPYRIGHT_VIOLATION = "copyright_violation"
    PRIVACY_VIOLATION = "privacy_violation"
    MISLEADING = "misleading"
    OFF_TOPIC = "off_topic"
    DUPLICATE = "duplicate"
    LOW_QUALITY = "low_quality"


class ContentModeration(Base):
    """Content moderation model for managing user-generated content."""
    
    __tablename__ = "content_moderations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Content identification
    content_type = Column(SQLEnum(ContentType), nullable=False)
    content_id = Column(String(255), nullable=False, index=True)
    content_url = Column(Text, nullable=True)
    
    # Content owner
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    user_email = Column(String(255), nullable=False)
    
    # Moderation details
    status = Column(SQLEnum(ModerationStatus), nullable=False, default=ModerationStatus.PENDING)
    reason = Column(SQLEnum(ModerationReason), nullable=True)
    custom_reason = Column(Text, nullable=True)
    
    # Content analysis
    content_text = Column(Text, nullable=True)  # Extracted text for analysis
    ai_confidence_score = Column(Float, nullable=True)  # AI moderation confidence
    ai_flags = Column(JSON, nullable=True)  # AI detected issues
    
    # Manual review
    moderator_id = Column(UUID(as_uuid=True), nullable=True)
    moderator_email = Column(String(255), nullable=True)
    moderator_notes = Column(Text, nullable=True)
    manual_review_required = Column(Boolean, default=False, nullable=False)
    
    # Community reporting
    report_count = Column(Integer, default=0, nullable=False)
    reported_by = Column(JSON, nullable=True)  # Array of user IDs who reported
    report_reasons = Column(JSON, nullable=True)  # Array of report reasons
    
    # Actions taken
    action_taken = Column(String(100), nullable=True)  # removed, warning, etc.
    visibility_restricted = Column(Boolean, default=False, nullable=False)
    search_excluded = Column(Boolean, default=False, nullable=False)
    
    # Appeal process
    appeal_submitted = Column(Boolean, default=False, nullable=False)
    appeal_text = Column(Text, nullable=True)
    appeal_date = Column(DateTime(timezone=True), nullable=True)
    appeal_resolved = Column(Boolean, default=False, nullable=False)
    appeal_resolution = Column(Text, nullable=True)
    appeal_resolved_by = Column(UUID(as_uuid=True), nullable=True)
    appeal_resolved_at = Column(DateTime(timezone=True), nullable=True)
    
    # Version tracking
    content_version = Column(Integer, default=1, nullable=False)
    original_content_hash = Column(String(64), nullable=True)  # SHA-256 hash
    
    # Timing
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    def __repr__(self):
        return f"<ContentModeration(id={self.id}, content_type={self.content_type}, status={self.status})>"
    
    def is_pending_review(self) -> bool:
        """Check if content is pending review."""
        return self.status in [ModerationStatus.PENDING, ModerationStatus.UNDER_REVIEW]
    
    def is_approved(self) -> bool:
        """Check if content is approved."""
        return self.status == ModerationStatus.APPROVED
    
    def is_rejected(self) -> bool:
        """Check if content is rejected."""
        return self.status == ModerationStatus.REJECTED
    
    def can_appeal(self) -> bool:
        """Check if content can be appealed."""
        return (
            self.is_rejected() and
            not self.appeal_submitted and
            not self.appeal_resolved
        )
    
    def needs_manual_review(self) -> bool:
        """Check if content needs manual review."""
        return (
            self.manual_review_required or
            self.report_count > 0 or
            (self.ai_confidence_score and self.ai_confidence_score < 0.8)
        )
    
    def add_report(self, reporter_id: str, reason: str):
        """Add a report to this content."""
        if not self.reported_by:
            self.reported_by = []
        if not self.report_reasons:
            self.report_reasons = []
            
        if reporter_id not in self.reported_by:
            self.reported_by.append(reporter_id)
            self.report_reasons.append(reason)
            self.report_count += 1