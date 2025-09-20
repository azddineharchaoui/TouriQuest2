"""
User-related SQLAlchemy models
"""
from datetime import datetime, date
from typing import Optional, List
from enum import Enum as PyEnum

from sqlalchemy import (
    Column, String, DateTime, Boolean, Text, Integer, Float, Date,
    ForeignKey, Enum, UniqueConstraint, CheckConstraint, Index
)
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import relationship, mapped_column, Mapped
from sqlalchemy.ext.hybrid import hybrid_property

from .base import (
    BaseModel, TimestampMixin, SoftDeleteMixin, AuditMixin,
    MetadataMixin, GeolocationMixin
)


class UserRoleEnum(PyEnum):
    """User role enumeration."""
    USER = "user"
    HOST = "host"
    MODERATOR = "moderator"
    ADMIN = "admin"
    SUPER_ADMIN = "super_admin"


class GenderEnum(PyEnum):
    """Gender enumeration."""
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"
    PREFER_NOT_TO_SAY = "prefer_not_to_say"


class TravelStyleEnum(PyEnum):
    """Travel style enumeration."""
    SOLO = "solo"
    COUPLE = "couple"
    FAMILY = "family"
    GROUP = "group"
    BUSINESS = "business"


class BudgetPreferenceEnum(PyEnum):
    """Budget preference enumeration."""
    BUDGET = "budget"
    MID_RANGE = "mid_range"
    LUXURY = "luxury"
    ULTRA_LUXURY = "ultra_luxury"


class User(BaseModel, TimestampMixin, SoftDeleteMixin, AuditMixin):
    """User model for authentication and basic information."""
    
    __tablename__ = 'users'
    
    # Authentication fields
    email: str = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True
    )
    
    password_hash: Optional[str] = mapped_column(
        String(255),
        nullable=True  # Nullable for OAuth users
    )
    
    # Basic information
    first_name: str = mapped_column(
        String(100),
        nullable=False
    )
    
    last_name: str = mapped_column(
        String(100),
        nullable=False
    )
    
    # Account status
    is_verified: bool = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        index=True
    )
    
    is_active: bool = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        index=True
    )
    
    role: UserRoleEnum = mapped_column(
        Enum(UserRoleEnum),
        default=UserRoleEnum.USER,
        nullable=False,
        index=True
    )
    
    # Verification
    email_verified_at: Optional[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    
    phone_verified_at: Optional[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    
    # Last activity
    last_login_at: Optional[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True
    )
    
    last_activity_at: Optional[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True
    )
    
    # OAuth integration
    oauth_providers: Optional[List[str]] = mapped_column(
        ARRAY(String),
        nullable=True
    )
    
    # Relationships
    profile: Mapped["UserProfile"] = relationship(
        "UserProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan"
    )
    
    auth_tokens: Mapped[List["UserAuth"]] = relationship(
        "UserAuth",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    
    sessions: Mapped[List["UserSession"]] = relationship(
        "UserSession",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    
    preferences: Mapped["UserPreferences"] = relationship(
        "UserPreferences",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan"
    )
    
    onboarding: Mapped["UserOnboarding"] = relationship(
        "UserOnboarding",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan"
    )
    
    # Social relationships
    following: Mapped[List["UserSocialConnection"]] = relationship(
        "UserSocialConnection",
        foreign_keys="UserSocialConnection.follower_id",
        back_populates="follower",
        cascade="all, delete-orphan"
    )
    
    followers: Mapped[List["UserSocialConnection"]] = relationship(
        "UserSocialConnection",
        foreign_keys="UserSocialConnection.following_id",
        back_populates="following_user",
        cascade="all, delete-orphan"
    )
    
    @hybrid_property
    def full_name(self) -> str:
        """Get user's full name."""
        return f"{self.first_name} {self.last_name}"
    
    @hybrid_property
    def is_host(self) -> bool:
        """Check if user is a host."""
        return self.role in [UserRoleEnum.HOST, UserRoleEnum.ADMIN, UserRoleEnum.SUPER_ADMIN]
    
    def can_moderate(self) -> bool:
        """Check if user can perform moderation actions."""
        return self.role in [UserRoleEnum.MODERATOR, UserRoleEnum.ADMIN, UserRoleEnum.SUPER_ADMIN]


class UserProfile(BaseModel, TimestampMixin, GeolocationMixin, MetadataMixin):
    """Extended user profile information."""
    
    __tablename__ = 'user_profiles'
    
    user_id: UUID = mapped_column(
        UUID(as_uuid=True),
        ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        unique=True,
        index=True
    )
    
    # Profile information
    bio: Optional[str] = mapped_column(
        Text,
        nullable=True
    )
    
    avatar_url: Optional[str] = mapped_column(
        String(500),
        nullable=True
    )
    
    cover_photo_url: Optional[str] = mapped_column(
        String(500),
        nullable=True
    )
    
    birth_date: Optional[date] = mapped_column(
        Date,
        nullable=True
    )
    
    gender: Optional[GenderEnum] = mapped_column(
        Enum(GenderEnum),
        nullable=True
    )
    
    phone_number: Optional[str] = mapped_column(
        String(20),
        nullable=True
    )
    
    # Social media
    website_url: Optional[str] = mapped_column(
        String(500),
        nullable=True
    )
    
    instagram_handle: Optional[str] = mapped_column(
        String(100),
        nullable=True
    )
    
    twitter_handle: Optional[str] = mapped_column(
        String(100),
        nullable=True
    )
    
    # Languages spoken
    languages: Optional[List[str]] = mapped_column(
        ARRAY(String),
        nullable=True
    )
    
    # Profile completeness
    profile_completion_score: float = mapped_column(
        Float,
        default=0.0,
        nullable=False
    )
    
    # Verification badges
    is_identity_verified: bool = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )
    
    is_phone_verified: bool = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )
    
    is_email_verified: bool = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )
    
    # Privacy settings
    is_profile_public: bool = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )
    
    show_last_seen: bool = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )
    
    # Relationships
    user: Mapped["User"] = relationship(
        "User",
        back_populates="profile"
    )
    
    @hybrid_property
    def age(self) -> Optional[int]:
        """Calculate user's age from birth date."""
        if self.birth_date:
            today = date.today()
            return today.year - self.birth_date.year - (
                (today.month, today.day) < (self.birth_date.month, self.birth_date.day)
            )
        return None


class UserAuth(BaseModel, TimestampMixin):
    """User authentication tokens and OAuth data."""
    
    __tablename__ = 'user_auth'
    
    user_id: UUID = mapped_column(
        UUID(as_uuid=True),
        ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    
    # Token information
    token_type: str = mapped_column(
        String(50),
        nullable=False
    )  # refresh_token, verification_token, reset_token, oauth_token
    
    token_hash: str = mapped_column(
        String(255),
        nullable=False,
        index=True
    )
    
    expires_at: Optional[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True
    )
    
    # OAuth specific
    oauth_provider: Optional[str] = mapped_column(
        String(50),
        nullable=True
    )
    
    oauth_id: Optional[str] = mapped_column(
        String(255),
        nullable=True
    )
    
    access_token: Optional[str] = mapped_column(
        Text,
        nullable=True
    )
    
    refresh_token: Optional[str] = mapped_column(
        Text,
        nullable=True
    )
    
    # Token status
    is_revoked: bool = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        index=True
    )
    
    used_at: Optional[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    
    # Relationships
    user: Mapped["User"] = relationship(
        "User",
        back_populates="auth_tokens"
    )


class UserSession(BaseModel, TimestampMixin):
    """User session tracking."""
    
    __tablename__ = 'user_sessions'
    
    user_id: UUID = mapped_column(
        UUID(as_uuid=True),
        ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    
    # Session information
    session_token: str = mapped_column(
        String(255),
        nullable=False,
        unique=True,
        index=True
    )
    
    ip_address: Optional[str] = mapped_column(
        String(45),
        nullable=True,
        index=True
    )
    
    user_agent: Optional[str] = mapped_column(
        Text,
        nullable=True
    )
    
    # Device information
    device_type: Optional[str] = mapped_column(
        String(50),
        nullable=True
    )
    
    device_id: Optional[str] = mapped_column(
        String(255),
        nullable=True
    )
    
    browser: Optional[str] = mapped_column(
        String(100),
        nullable=True
    )
    
    operating_system: Optional[str] = mapped_column(
        String(100),
        nullable=True
    )
    
    # Session status
    is_active: bool = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        index=True
    )
    
    expires_at: datetime = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True
    )
    
    last_activity_at: datetime = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True
    )
    
    logout_at: Optional[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    
    # Relationships
    user: Mapped["User"] = relationship(
        "User",
        back_populates="sessions"
    )


class UserSocialConnection(BaseModel, TimestampMixin):
    """User social connections (following/followers)."""
    
    __tablename__ = 'user_social_connections'
    
    follower_id: UUID = mapped_column(
        UUID(as_uuid=True),
        ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    
    following_id: UUID = mapped_column(
        UUID(as_uuid=True),
        ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    
    # Connection status
    is_active: bool = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )
    
    # Notification preferences
    notify_on_activity: bool = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )
    
    # Relationships
    follower: Mapped["User"] = relationship(
        "User",
        foreign_keys=[follower_id],
        back_populates="following"
    )
    
    following_user: Mapped["User"] = relationship(
        "User",
        foreign_keys=[following_id],
        back_populates="followers"
    )
    
    __table_args__ = (
        UniqueConstraint('follower_id', 'following_id', name='unique_user_connection'),
        CheckConstraint('follower_id != following_id', name='check_no_self_follow'),
    )


class UserPreferences(BaseModel, TimestampMixin, MetadataMixin):
    """User travel preferences and settings."""
    
    __tablename__ = 'user_preferences'
    
    user_id: UUID = mapped_column(
        UUID(as_uuid=True),
        ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        unique=True,
        index=True
    )
    
    # Travel preferences
    preferred_language: str = mapped_column(
        String(10),
        default='en',
        nullable=False
    )
    
    preferred_currency: str = mapped_column(
        String(3),
        default='USD',
        nullable=False
    )
    
    travel_style: Optional[TravelStyleEnum] = mapped_column(
        Enum(TravelStyleEnum),
        nullable=True
    )
    
    budget_preference: Optional[BudgetPreferenceEnum] = mapped_column(
        Enum(BudgetPreferenceEnum),
        nullable=True
    )
    
    # Travel interests (JSON array)
    interests: Optional[List[str]] = mapped_column(
        ARRAY(String),
        nullable=True
    )
    
    preferred_destinations: Optional[List[str]] = mapped_column(
        ARRAY(String),
        nullable=True
    )
    
    # Accessibility needs
    accessibility_needs: Optional[List[str]] = mapped_column(
        ARRAY(String),
        nullable=True
    )
    
    # Dietary restrictions
    dietary_restrictions: Optional[List[str]] = mapped_column(
        ARRAY(String),
        nullable=True
    )
    
    # Notification preferences
    email_notifications: bool = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )
    
    push_notifications: bool = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )
    
    sms_notifications: bool = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )
    
    marketing_emails: bool = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )
    
    # Privacy preferences
    show_travel_stats: bool = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )
    
    show_review_history: bool = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )
    
    allow_friend_requests: bool = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )
    
    # Relationships
    user: Mapped["User"] = relationship(
        "User",
        back_populates="preferences"
    )


class UserOnboarding(BaseModel, TimestampMixin):
    """User onboarding progress and data."""
    
    __tablename__ = 'user_onboarding'
    
    user_id: UUID = mapped_column(
        UUID(as_uuid=True),
        ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        unique=True,
        index=True
    )
    
    # Onboarding steps completion
    step_1_personal_info: bool = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )
    
    step_2_travel_interests: bool = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )
    
    step_3_budget_preferences: bool = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )
    
    step_4_travel_style: bool = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )
    
    # Completion status
    is_completed: bool = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        index=True
    )
    
    completed_at: Optional[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    
    # Onboarding data (stored as JSON for flexibility)
    onboarding_data: Optional[dict] = mapped_column(
        JSONB,
        nullable=True
    )
    
    # Relationships
    user: Mapped["User"] = relationship(
        "User",
        back_populates="onboarding"
    )
    
    @hybrid_property
    def completion_percentage(self) -> float:
        """Calculate onboarding completion percentage."""
        completed_steps = sum([
            self.step_1_personal_info,
            self.step_2_travel_interests,
            self.step_3_budget_preferences,
            self.step_4_travel_style
        ])
        return (completed_steps / 4) * 100


class TravelHistory(BaseModel, TimestampMixin, GeolocationMixin):
    """User travel history tracking."""
    
    __tablename__ = 'travel_history'
    
    user_id: UUID = mapped_column(
        UUID(as_uuid=True),
        ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    
    # Trip information
    destination_name: str = mapped_column(
        String(255),
        nullable=False
    )
    
    trip_type: Optional[str] = mapped_column(
        String(50),
        nullable=True
    )  # vacation, business, family_visit, etc.
    
    visit_date: date = mapped_column(
        Date,
        nullable=False,
        index=True
    )
    
    duration_days: Optional[int] = mapped_column(
        Integer,
        nullable=True
    )
    
    # Trip details
    accommodation_type: Optional[str] = mapped_column(
        String(100),
        nullable=True
    )
    
    transportation_mode: Optional[str] = mapped_column(
        String(100),
        nullable=True
    )
    
    total_spent: Optional[float] = mapped_column(
        Float,
        nullable=True
    )
    
    currency: Optional[str] = mapped_column(
        String(3),
        nullable=True
    )
    
    # Experience rating
    overall_rating: Optional[int] = mapped_column(
        Integer,
        nullable=True
    )
    
    notes: Optional[str] = mapped_column(
        Text,
        nullable=True
    )
    
    # Source of data
    data_source: str = mapped_column(
        String(50),
        default='manual',
        nullable=False
    )  # manual, booking, import
    
    # Related booking
    booking_id: Optional[UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
        index=True
    )


class TravelStats(BaseModel, TimestampMixin):
    """User travel statistics and achievements."""
    
    __tablename__ = 'travel_stats'
    
    user_id: UUID = mapped_column(
        UUID(as_uuid=True),
        ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        unique=True,
        index=True
    )
    
    # Basic statistics
    countries_visited: int = mapped_column(
        Integer,
        default=0,
        nullable=False
    )
    
    cities_visited: int = mapped_column(
        Integer,
        default=0,
        nullable=False
    )
    
    total_trips: int = mapped_column(
        Integer,
        default=0,
        nullable=False
    )
    
    total_nights: int = mapped_column(
        Integer,
        default=0,
        nullable=False
    )
    
    # Distance and environmental
    total_miles_traveled: float = mapped_column(
        Float,
        default=0.0,
        nullable=False
    )
    
    carbon_footprint_kg: float = mapped_column(
        Float,
        default=0.0,
        nullable=False
    )
    
    eco_score: float = mapped_column(
        Float,
        default=0.0,
        nullable=False
    )
    
    # Financial statistics
    total_spent: float = mapped_column(
        Float,
        default=0.0,
        nullable=False
    )
    
    average_trip_cost: float = mapped_column(
        Float,
        default=0.0,
        nullable=False
    )
    
    # Activity statistics
    properties_stayed: int = mapped_column(
        Integer,
        default=0,
        nullable=False
    )
    
    experiences_booked: int = mapped_column(
        Integer,
        default=0,
        nullable=False
    )
    
    pois_visited: int = mapped_column(
        Integer,
        default=0,
        nullable=False
    )
    
    reviews_written: int = mapped_column(
        Integer,
        default=0,
        nullable=False
    )
    
    # Social statistics
    friends_made: int = mapped_column(
        Integer,
        default=0,
        nullable=False
    )
    
    content_shared: int = mapped_column(
        Integer,
        default=0,
        nullable=False
    )
    
    # Last update
    last_calculated_at: datetime = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow
    )
    
    # Detailed statistics (JSON)
    detailed_stats: Optional[dict] = mapped_column(
        JSONB,
        nullable=True
    )


class UserAchievement(BaseModel, TimestampMixin):
    """User achievements and badges."""
    
    __tablename__ = 'user_achievements'
    
    user_id: UUID = mapped_column(
        UUID(as_uuid=True),
        ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    
    achievement_type: str = mapped_column(
        String(100),
        nullable=False,
        index=True
    )
    
    achievement_name: str = mapped_column(
        String(255),
        nullable=False
    )
    
    achievement_description: str = mapped_column(
        Text,
        nullable=False
    )
    
    # Achievement details
    level: int = mapped_column(
        Integer,
        default=1,
        nullable=False
    )
    
    progress: float = mapped_column(
        Float,
        default=0.0,
        nullable=False
    )
    
    target_value: Optional[float] = mapped_column(
        Float,
        nullable=True
    )
    
    current_value: float = mapped_column(
        Float,
        default=0.0,
        nullable=False
    )
    
    # Status
    is_earned: bool = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        index=True
    )
    
    earned_at: Optional[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    
    # Display
    icon_url: Optional[str] = mapped_column(
        String(500),
        nullable=True
    )
    
    badge_color: Optional[str] = mapped_column(
        String(7),
        nullable=True
    )
    
    # Additional data
    achievement_data: Optional[dict] = mapped_column(
        JSONB,
        nullable=True
    )
    
    __table_args__ = (
        UniqueConstraint('user_id', 'achievement_type', 'level', 
                        name='unique_user_achievement'),
    )


class UserBadge(BaseModel, TimestampMixin):
    """User display badges and verification status."""
    
    __tablename__ = 'user_badges'
    
    user_id: UUID = mapped_column(
        UUID(as_uuid=True),
        ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    
    badge_type: str = mapped_column(
        String(100),
        nullable=False,
        index=True
    )
    
    badge_name: str = mapped_column(
        String(255),
        nullable=False
    )
    
    badge_description: Optional[str] = mapped_column(
        Text,
        nullable=True
    )
    
    # Badge appearance
    icon_url: str = mapped_column(
        String(500),
        nullable=False
    )
    
    color: str = mapped_column(
        String(7),
        nullable=False
    )
    
    # Status
    is_active: bool = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )
    
    is_verified: bool = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )
    
    verified_at: Optional[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    
    verified_by: Optional[UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=True
    )
    
    # Display order
    display_order: int = mapped_column(
        Integer,
        default=0,
        nullable=False
    )
    
    expires_at: Optional[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )


# Database indexes for performance
user_indexes = [
    Index('ix_users_email_verified', User.email, User.is_verified),
    Index('ix_users_role_active', User.role, User.is_active),
    Index('ix_users_last_activity', User.last_activity_at.desc()),
    Index('ix_user_profiles_location', UserProfile.country_code, UserProfile.city),
    Index('ix_user_auth_token_type', UserAuth.token_type, UserAuth.expires_at),
    Index('ix_user_sessions_active', UserSession.is_active, UserSession.last_activity_at),
    Index('ix_travel_history_user_date', TravelHistory.user_id, TravelHistory.visit_date.desc()),
    Index('ix_user_achievements_earned', UserAchievement.user_id, UserAchievement.is_earned),
]