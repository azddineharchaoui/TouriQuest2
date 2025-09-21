"""Admin user model for authentication and role management."""

from sqlalchemy import Column, String, Boolean, DateTime, Text, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from datetime import datetime

from app.core.database import Base
from app.core.security import AdminRole


class AdminUser(Base):
    """Admin user model for authentication and authorization."""
    
    __tablename__ = "admin_users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    role = Column(SQLEnum(AdminRole), nullable=False, default=AdminRole.SUPPORT)
    
    # Status fields
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    is_locked = Column(Boolean, default=False, nullable=False)
    
    # Profile information
    phone = Column(String(20), nullable=True)
    avatar_url = Column(Text, nullable=True)
    bio = Column(Text, nullable=True)
    
    # Security fields
    last_login = Column(DateTime(timezone=True), nullable=True)
    failed_login_attempts = Column(String(10), default="0", nullable=False)
    locked_until = Column(DateTime(timezone=True), nullable=True)
    password_changed_at = Column(DateTime(timezone=True), default=func.now())
    
    # Audit fields
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by = Column(UUID(as_uuid=True), nullable=True)
    
    def __repr__(self):
        return f"<AdminUser(id={self.id}, email={self.email}, role={self.role})>"
    
    @property
    def full_name(self) -> str:
        """Get full name."""
        return f"{self.first_name} {self.last_name}"
    
    def is_locked_out(self) -> bool:
        """Check if account is locked out."""
        if not self.is_locked:
            return False
        
        if self.locked_until is None:
            return True
            
        return datetime.utcnow() < self.locked_until
    
    def can_perform_action(self, permission: str) -> bool:
        """Check if admin can perform specific action."""
        from app.core.security import ROLE_PERMISSIONS, Permission
        
        role_permissions = ROLE_PERMISSIONS.get(self.role, [])
        return Permission(permission) in role_permissions