"""User moderation model for managing user accounts and violations."""

from sqlalchemy import Column, String, DateTime, Text, Integer, Boolean, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from enum import Enum
from datetime import datetime

from app.core.database import Base


class UserStatus(str, Enum):
    """User account status enumeration."""
    ACTIVE = "active"
    SUSPENDED = "suspended"
    BANNED = "banned"
    PENDING_VERIFICATION = "pending_verification"
    DEACTIVATED = "deactivated"


class ViolationType(str, Enum):
    """Type of user violations."""
    SPAM = "spam"
    HARASSMENT = "harassment"
    FAKE_PROFILE = "fake_profile"
    INAPPROPRIATE_CONTENT = "inappropriate_content"
    FRAUD = "fraud"
    TERMS_VIOLATION = "terms_violation"
    MULTIPLE_ACCOUNTS = "multiple_accounts"
    PAYMENT_DISPUTE = "payment_dispute"
    PROPERTY_MISREPRESENTATION = "property_misrepresentation"
    REVIEW_MANIPULATION = "review_manipulation"


class ModerationAction(str, Enum):
    """Actions taken during moderation."""
    WARNING_ISSUED = "warning_issued"
    CONTENT_REMOVED = "content_removed"
    ACCOUNT_SUSPENDED = "account_suspended"
    ACCOUNT_BANNED = "account_banned"
    ACCOUNT_REINSTATED = "account_reinstated"
    PROFILE_RESTRICTED = "profile_restricted"
    BOOKING_RESTRICTED = "booking_restricted"
    HOSTING_RESTRICTED = "hosting_restricted"


class UserModeration(Base):
    """User moderation model for tracking user account status and violations."""
    
    __tablename__ = "user_moderations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # User information
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    user_email = Column(String(255), nullable=False)
    
    # Moderation details
    status = Column(SQLEnum(UserStatus), nullable=False, default=UserStatus.ACTIVE)
    violation_type = Column(SQLEnum(ViolationType), nullable=True)
    action_taken = Column(SQLEnum(ModerationAction), nullable=False)
    
    # Action details
    reason = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    evidence_urls = Column(Text, nullable=True)  # JSON array of evidence links
    
    # Admin who took action
    moderator_id = Column(UUID(as_uuid=True), nullable=False)
    moderator_email = Column(String(255), nullable=False)
    
    # Duration and severity
    severity_score = Column(Integer, default=1, nullable=False)  # 1-10 scale
    suspension_duration_hours = Column(Integer, nullable=True)
    ban_until = Column(DateTime(timezone=True), nullable=True)
    
    # Status tracking
    is_active = Column(Boolean, default=True, nullable=False)
    is_appealable = Column(Boolean, default=True, nullable=False)
    has_been_appealed = Column(Boolean, default=False, nullable=False)
    
    # Appeal information
    appeal_text = Column(Text, nullable=True)
    appeal_date = Column(DateTime(timezone=True), nullable=True)
    appeal_response = Column(Text, nullable=True)
    appeal_resolved_by = Column(UUID(as_uuid=True), nullable=True)
    appeal_resolved_at = Column(DateTime(timezone=True), nullable=True)
    
    # Timing
    effective_from = Column(DateTime(timezone=True), nullable=False, default=func.now())
    effective_until = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    def __repr__(self):
        return f"<UserModeration(id={self.id}, user_id={self.user_id}, action={self.action_taken})>"
    
    def is_currently_active(self) -> bool:
        """Check if this moderation action is currently active."""
        if not self.is_active:
            return False
            
        now = datetime.utcnow()
        
        # Check if action has started
        if self.effective_from and now < self.effective_from:
            return False
            
        # Check if action has ended
        if self.effective_until and now > self.effective_until:
            return False
            
        return True
    
    def can_appeal(self) -> bool:
        """Check if user can appeal this moderation action."""
        return (
            self.is_appealable and
            not self.has_been_appealed and
            self.is_currently_active()
        )
    
    def get_remaining_time(self) -> int:
        """Get remaining time in seconds for timed restrictions."""
        if not self.effective_until:
            return -1  # Permanent
            
        now = datetime.utcnow()
        if now >= self.effective_until:
            return 0
            
        return int((self.effective_until - now).total_seconds())