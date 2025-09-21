"""Audit log model for tracking all admin actions."""

from sqlalchemy import Column, String, DateTime, Text, JSON, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from enum import Enum

from app.core.database import Base


class AuditAction(str, Enum):
    """Enumeration of audit actions."""
    # User Management
    USER_CREATED = "user_created"
    USER_UPDATED = "user_updated"
    USER_DELETED = "user_deleted"
    USER_BANNED = "user_banned"
    USER_UNBANNED = "user_unbanned"
    USER_VERIFIED = "user_verified"
    
    # Property Management
    PROPERTY_APPROVED = "property_approved"
    PROPERTY_REJECTED = "property_rejected"
    PROPERTY_DELETED = "property_deleted"
    PROPERTY_UPDATED = "property_updated"
    
    # Content Moderation
    CONTENT_APPROVED = "content_approved"
    CONTENT_REJECTED = "content_rejected"
    CONTENT_DELETED = "content_deleted"
    CONTENT_FLAGGED = "content_flagged"
    
    # Financial
    PAYOUT_PROCESSED = "payout_processed"
    REFUND_ISSUED = "refund_issued"
    COMMISSION_ADJUSTED = "commission_adjusted"
    
    # System
    SYSTEM_SETTING_CHANGED = "system_setting_changed"
    BACKUP_CREATED = "backup_created"
    MAINTENANCE_MODE_TOGGLED = "maintenance_mode_toggled"
    
    # Authentication
    ADMIN_LOGIN = "admin_login"
    ADMIN_LOGOUT = "admin_logout"
    ADMIN_PASSWORD_CHANGED = "admin_password_changed"
    
    # Reports
    REPORT_GENERATED = "report_generated"
    DATA_EXPORTED = "data_exported"


class AuditSeverity(str, Enum):
    """Audit log severity levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AuditLog(Base):
    """Audit log model for tracking admin actions."""
    
    __tablename__ = "audit_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Admin who performed the action
    admin_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    admin_email = Column(String(255), nullable=False)
    admin_role = Column(String(50), nullable=False)
    
    # Action details
    action = Column(SQLEnum(AuditAction), nullable=False, index=True)
    resource_type = Column(String(100), nullable=False)  # user, property, content, etc.
    resource_id = Column(String(255), nullable=True, index=True)
    
    # Action metadata
    description = Column(Text, nullable=False)
    severity = Column(SQLEnum(AuditSeverity), nullable=False, default=AuditSeverity.LOW)
    
    # Data changes
    old_data = Column(JSON, nullable=True)
    new_data = Column(JSON, nullable=True)
    metadata = Column(JSON, nullable=True)  # Additional context
    
    # Request information
    ip_address = Column(String(45), nullable=True)  # IPv6 support
    user_agent = Column(Text, nullable=True)
    request_id = Column(String(100), nullable=True)
    
    # Timing
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    
    def __repr__(self):
        return f"<AuditLog(id={self.id}, action={self.action}, admin={self.admin_email})>"
    
    @classmethod
    def create_log(
        cls,
        admin_id: str,
        admin_email: str,
        admin_role: str,
        action: AuditAction,
        resource_type: str,
        description: str,
        resource_id: str = None,
        severity: AuditSeverity = AuditSeverity.LOW,
        old_data: dict = None,
        new_data: dict = None,
        metadata: dict = None,
        ip_address: str = None,
        user_agent: str = None,
        request_id: str = None,
    ):
        """Create a new audit log entry."""
        return cls(
            admin_id=admin_id,
            admin_email=admin_email,
            admin_role=admin_role,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            description=description,
            severity=severity,
            old_data=old_data,
            new_data=new_data,
            metadata=metadata,
            ip_address=ip_address,
            user_agent=user_agent,
            request_id=request_id,
        )