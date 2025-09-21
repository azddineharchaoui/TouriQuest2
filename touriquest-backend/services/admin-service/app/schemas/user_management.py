"""User management related Pydantic schemas."""

from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class UserStatus(str, Enum):
    """User account status."""
    ACTIVE = "active"
    SUSPENDED = "suspended"
    BANNED = "banned"
    PENDING_VERIFICATION = "pending_verification"
    DEACTIVATED = "deactivated"


class BulkActionType(str, Enum):
    """Bulk action types for users."""
    VERIFY = "verify"
    SUSPEND = "suspend"
    UNSUSPEND = "unsuspend"
    BAN = "ban"
    UNBAN = "unban"
    DELETE = "delete"


class UserSummary(BaseModel):
    """User summary for list views."""
    id: str = Field(..., description="User ID")
    email: EmailStr = Field(..., description="User email")
    first_name: str = Field(..., description="User first name")
    last_name: str = Field(..., description="User last name")
    status: UserStatus = Field(..., description="User account status")
    is_verified: bool = Field(..., description="Whether user is verified")
    is_host: bool = Field(..., description="Whether user is a host")
    created_at: datetime = Field(..., description="Account creation date")
    last_login: Optional[datetime] = Field(None, description="Last login date")
    total_bookings: int = Field(..., description="Total number of bookings")
    total_listings: int = Field(..., description="Total number of property listings")
    total_spent: float = Field(..., description="Total amount spent")
    total_earned: float = Field(..., description="Total amount earned as host")


class UserDetail(BaseModel):
    """Detailed user information."""
    id: str = Field(..., description="User ID")
    email: EmailStr = Field(..., description="User email")
    first_name: str = Field(..., description="User first name")
    last_name: str = Field(..., description="User last name")
    phone: Optional[str] = Field(None, description="User phone number")
    date_of_birth: Optional[datetime] = Field(None, description="Date of birth")
    avatar_url: Optional[str] = Field(None, description="Profile picture URL")
    bio: Optional[str] = Field(None, description="User bio")
    
    # Status information
    status: UserStatus = Field(..., description="User account status")
    is_verified: bool = Field(..., description="Whether user is verified")
    is_host: bool = Field(..., description="Whether user is a host")
    verification_level: str = Field(..., description="Verification level")
    
    # Location and preferences
    location: Optional[str] = Field(None, description="User location")
    preferred_language: str = Field(..., description="Preferred language")
    preferred_currency: str = Field(..., description="Preferred currency")
    travel_preferences: Dict[str, Any] = Field(default_factory=dict, description="Travel preferences")
    
    # Account metrics
    created_at: datetime = Field(..., description="Account creation date")
    updated_at: datetime = Field(..., description="Last profile update")
    last_login: Optional[datetime] = Field(None, description="Last login date")
    login_count: int = Field(..., description="Total login count")
    
    # Activity metrics
    total_bookings: int = Field(..., description="Total number of bookings")
    total_listings: int = Field(..., description="Total number of property listings")
    total_reviews_written: int = Field(..., description="Total reviews written")
    total_reviews_received: int = Field(..., description="Total reviews received")
    average_rating_as_guest: Optional[float] = Field(None, description="Average rating as guest")
    average_rating_as_host: Optional[float] = Field(None, description="Average rating as host")
    
    # Financial metrics
    total_spent: float = Field(..., description="Total amount spent")
    total_earned: float = Field(..., description="Total amount earned as host")
    total_refunds: float = Field(..., description="Total refunds received")
    
    # Security information
    failed_login_attempts: int = Field(..., description="Recent failed login attempts")
    is_locked: bool = Field(..., description="Whether account is locked")
    locked_until: Optional[datetime] = Field(None, description="Account locked until")
    
    # Moderation information
    warning_count: int = Field(..., description="Number of warnings received")
    suspension_count: int = Field(..., description="Number of times suspended")
    last_moderation_action: Optional[datetime] = Field(None, description="Last moderation action date")
    
    # Social information
    follower_count: int = Field(..., description="Number of followers")
    following_count: int = Field(..., description="Number of users following")


class UserModerationCreate(BaseModel):
    """Schema for creating user moderation record."""
    user_id: str = Field(..., description="User ID")
    violation_type: str = Field(..., description="Type of violation")
    action_taken: str = Field(..., description="Moderation action taken")
    reason: str = Field(..., description="Reason for moderation action")
    description: Optional[str] = Field(None, description="Detailed description")
    evidence_urls: Optional[List[str]] = Field(None, description="Evidence URLs")
    severity_score: int = Field(default=1, ge=1, le=10, description="Severity score (1-10)")
    suspension_duration_hours: Optional[int] = Field(None, description="Suspension duration in hours")
    is_appealable: bool = Field(default=True, description="Whether action can be appealed")


class UserModerationUpdate(BaseModel):
    """Schema for updating user moderation record."""
    reason: Optional[str] = Field(None, description="Updated reason")
    description: Optional[str] = Field(None, description="Updated description")
    severity_score: Optional[int] = Field(None, ge=1, le=10, description="Updated severity score")
    is_active: Optional[bool] = Field(None, description="Whether moderation is active")
    appeal_response: Optional[str] = Field(None, description="Response to appeal")


class UserStatusUpdate(BaseModel):
    """Schema for updating user status."""
    new_status: UserStatus = Field(..., description="New user status")
    reason: str = Field(..., description="Reason for status change")
    duration_days: Optional[int] = Field(None, description="Duration for temporary status changes")
    notes: Optional[str] = Field(None, description="Additional notes")


class UserSearchFilters(BaseModel):
    """Search filters for user queries."""
    search: Optional[str] = Field(None, description="Search term for name/email")
    status: Optional[UserStatus] = Field(None, description="Filter by status")
    verified_only: bool = Field(default=False, description="Show only verified users")
    banned_only: bool = Field(default=False, description="Show only banned users")
    host_only: bool = Field(default=False, description="Show only hosts")
    created_from: Optional[datetime] = Field(None, description="Filter by creation date from")
    created_to: Optional[datetime] = Field(None, description="Filter by creation date to")
    country: Optional[str] = Field(None, description="Filter by country")
    min_bookings: Optional[int] = Field(None, description="Minimum number of bookings")
    max_bookings: Optional[int] = Field(None, description="Maximum number of bookings")


class BulkUserAction(BaseModel):
    """Schema for bulk user actions."""
    user_ids: List[str] = Field(..., description="List of user IDs")
    action: BulkActionType = Field(..., description="Action to perform")
    reason: str = Field(..., description="Reason for bulk action")
    duration_days: Optional[int] = Field(None, description="Duration for temporary actions")
    notes: Optional[str] = Field(None, description="Additional notes")


class UserModerationHistory(BaseModel):
    """User moderation history entry."""
    id: str = Field(..., description="Moderation record ID")
    action_taken: str = Field(..., description="Action taken")
    reason: str = Field(..., description="Reason for action")
    severity_score: int = Field(..., description="Severity score")
    moderator_email: str = Field(..., description="Moderator who took action")
    created_at: datetime = Field(..., description="When action was taken")
    is_active: bool = Field(..., description="Whether action is currently active")
    has_been_appealed: bool = Field(..., description="Whether action was appealed")


class UserActivityLog(BaseModel):
    """User activity log entry."""
    id: str = Field(..., description="Activity ID")
    activity_type: str = Field(..., description="Type of activity")
    description: str = Field(..., description="Activity description")
    ip_address: Optional[str] = Field(None, description="IP address")
    user_agent: Optional[str] = Field(None, description="User agent")
    created_at: datetime = Field(..., description="Activity timestamp")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")


class UserStats(BaseModel):
    """User statistics summary."""
    total_users: int = Field(..., description="Total number of users")
    active_users: int = Field(..., description="Active users")
    verified_users: int = Field(..., description="Verified users")
    banned_users: int = Field(..., description="Banned users")
    suspended_users: int = Field(..., description="Suspended users")
    new_users_today: int = Field(..., description="New users registered today")
    new_users_this_week: int = Field(..., description="New users this week")
    new_users_this_month: int = Field(..., description="New users this month")
    host_users: int = Field(..., description="Users who are hosts")
    guest_only_users: int = Field(..., description="Users who are guests only")
    user_growth_rate: float = Field(..., description="User growth rate percentage")
    average_age: Optional[float] = Field(None, description="Average user age")
    top_countries: List[Dict[str, Any]] = Field(..., description="Top countries by user count")
    verification_rate: float = Field(..., description="User verification rate percentage")