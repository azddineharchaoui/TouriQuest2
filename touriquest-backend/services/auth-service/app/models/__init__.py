"""
Database Models for Authentication Service
All SQLAlchemy models for users, authentication, and related entities
"""
from datetime import datetime
from typing import Optional
from enum import Enum as PyEnum
import uuid

from sqlalchemy import (
    Boolean, Column, DateTime, Enum, ForeignKey, Index, Integer, 
    JSON, String, Text, func, UniqueConstraint, Float
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.ext.hybrid import hybrid_property

from shared.database import Base


class UserRole(PyEnum):
    """User role enumeration"""
    USER = "user"
    HOST = "host"
    ADMIN = "admin"
    MODERATOR = "moderator"


class UserStatus(PyEnum):
    """User account status"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    BANNED = "banned"
    PENDING_VERIFICATION = "pending_verification"


class TravelFrequency(PyEnum):
    """Travel frequency options"""
    RARELY = "rarely"
    OCCASIONALLY = "occasionally"  
    FREQUENTLY = "frequently"
    CONSTANTLY = "constantly"


class BudgetPreference(PyEnum):
    """Budget preference options"""
    BUDGET_FRIENDLY = "budget_friendly"
    MID_RANGE = "mid_range"
    LUXURY = "luxury"
    MIX = "mix"


class TravelStyle(PyEnum):
    """Travel style options"""
    SOLO = "solo"
    COUPLE = "couple"
    FAMILY = "family"
    GROUP = "group"
    BUSINESS = "business"


class OAuthProvider(PyEnum):
    """OAuth provider options"""
    GOOGLE = "google"
    FACEBOOK = "facebook"
    APPLE = "apple"
    TWITTER = "twitter"


class TokenType(PyEnum):
    """Authentication token types"""
    ACCESS = "access"
    REFRESH = "refresh"
    EMAIL_VERIFICATION = "email_verification"
    PASSWORD_RESET = "password_reset"


class SessionStatus(PyEnum):
    """Session status options"""
    ACTIVE = "active"
    EXPIRED = "expired"
    REVOKED = "revoked"


class PrivacyLevel(PyEnum):
    """Privacy level enumeration"""
    PUBLIC = "public"
    FOLLOWERS = "followers"
    PRIVATE = "private"


class VerificationStatus(PyEnum):
    """Verification status enumeration"""
    UNVERIFIED = "unverified"
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"


class AchievementType(PyEnum):
    """Achievement type enumeration"""
    WORLD_EXPLORER = "world_explorer"
    ECO_WARRIOR = "eco_warrior"
    CULTURE_SEEKER = "culture_seeker"
    ADVENTURE_MASTER = "adventure_master"
    SOCIAL_BUTTERFLY = "social_butterfly"
    PHOTO_ENTHUSIAST = "photo_enthusiast"
    FOODIE = "foodie"
    HISTORY_BUFF = "history_buff"


class ContentType(PyEnum):
    """Content type enumeration"""
    POST = "post"
    REVIEW = "review"
    PHOTO = "photo"
    VIDEO = "video"
    STORY = "story"


class ActivityType(PyEnum):
    """Activity type enumeration"""
    PROFILE_UPDATE = "profile_update"
    PHOTO_UPLOAD = "photo_upload"
    REVIEW_POST = "review_post"
    TRIP_CHECKIN = "trip_checkin"
    ACHIEVEMENT_EARNED = "achievement_earned"
    PLACE_VISITED = "place_visited"
    FRIEND_ADDED = "friend_added"
    CONTENT_SHARED = "content_shared"


class User(Base):
    """User model with authentication and profile information"""
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=True)  # Nullable for OAuth-only users
    
    # Basic Profile Information
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    phone_number = Column(String(20), nullable=True)
    date_of_birth = Column(DateTime, nullable=True)
    
    # Account Status
    role = Column(Enum(UserRole), default=UserRole.USER, nullable=False)
    status = Column(Enum(UserStatus), default=UserStatus.PENDING_VERIFICATION, nullable=False)
    is_email_verified = Column(Boolean, default=False, nullable=False)
    is_phone_verified = Column(Boolean, default=False, nullable=False)
    
    # Profile Information
    avatar_url = Column(String(500), nullable=True)
    cover_photo_url = Column(String(500), nullable=True)
    bio = Column(Text, nullable=True)
    location = Column(String(255), nullable=True)
    timezone = Column(String(50), nullable=True)
    language_preference = Column(String(10), default="en", nullable=False)
    
    # Onboarding Data
    travel_frequency = Column(Enum(TravelFrequency), nullable=True)
    budget_preference = Column(Enum(BudgetPreference), nullable=True)
    travel_style = Column(Enum(TravelStyle), nullable=True)
    travel_interests = Column(JSON, nullable=True)  # Array of interests
    onboarding_completed = Column(Boolean, default=False, nullable=False)
    onboarding_step = Column(Integer, default=0, nullable=False)
    
    # Security
    failed_login_attempts = Column(Integer, default=0, nullable=False)
    account_locked_until = Column(DateTime, nullable=True)
    last_login_at = Column(DateTime, nullable=True)
    last_login_ip = Column(String(45), nullable=True)  # IPv6 compatible
    last_password_change = Column(DateTime, nullable=True)
    
    # Privacy Settings
    profile_visibility = Column(String(20), default="public", nullable=False)  # public, friends, private
    location_sharing = Column(Boolean, default=True, nullable=False)
    activity_visibility = Column(Boolean, default=True, nullable=False)
    
    # GDPR Compliance
    data_processing_consent = Column(Boolean, default=False, nullable=False)
    marketing_consent = Column(Boolean, default=False, nullable=False)
    data_retention_consent = Column(Boolean, default=True, nullable=False)
    deletion_requested_at = Column(DateTime, nullable=True)
    
    # Travel Statistics
    countries_visited = Column(Integer, default=0, nullable=False)
    cities_explored = Column(Integer, default=0, nullable=False)
    total_miles_traveled = Column(Float, default=0.0, nullable=False)
    eco_score = Column(Float, default=0.0, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    last_activity_at = Column(DateTime, default=func.now(), nullable=False)
    
    # Relationships
    auth_tokens = relationship("AuthToken", back_populates="user", cascade="all, delete-orphan")
    user_sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    oauth_accounts = relationship("OAuthAccount", back_populates="user", cascade="all, delete-orphan")
    social_connections_as_follower = relationship(
        "SocialConnection", 
        foreign_keys="SocialConnection.follower_id",
        back_populates="follower",
        cascade="all, delete-orphan"
    )
    social_connections_as_following = relationship(
        "SocialConnection",
        foreign_keys="SocialConnection.following_id", 
        back_populates="following",
        cascade="all, delete-orphan"
    )
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")
    
    # New profile relationships
    profile = relationship("UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    travel_stats = relationship("TravelStatistics", back_populates="user", uselist=False, cascade="all, delete-orphan")
    achievements = relationship("UserAchievement", back_populates="user", cascade="all, delete-orphan")
    content = relationship("UserContent", back_populates="user", cascade="all, delete-orphan")
    activities = relationship("UserActivity", back_populates="user", cascade="all, delete-orphan")
    travel_timeline = relationship("TravelTimeline", back_populates="user", cascade="all, delete-orphan")
    privacy_settings = relationship("UserPrivacySettings", back_populates="user", uselist=False, cascade="all, delete-orphan")
    
    @hybrid_property
    def full_name(self) -> Optional[str]:
        """Get user's full name"""
        if self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}"
        return self.first_name or self.last_name
    
    @hybrid_property
    def is_account_locked(self) -> bool:
        """Check if account is currently locked"""
        if self.account_locked_until:
            return datetime.utcnow() < self.account_locked_until
        return False
    
    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, role={self.role})>"


class AuthToken(Base):
    """Authentication tokens (access, refresh, verification, etc.)"""
    __tablename__ = "auth_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    token_hash = Column(String(255), nullable=False, index=True)
    token_type = Column(Enum(TokenType), nullable=False)
    
    expires_at = Column(DateTime, nullable=False)
    revoked_at = Column(DateTime, nullable=True)
    is_revoked = Column(Boolean, default=False, nullable=False)
    
    # Token metadata
    device_info = Column(JSON, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=func.now(), nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="auth_tokens")
    
    def __repr__(self):
        return f"<AuthToken(id={self.id}, user_id={self.user_id}, type={self.token_type})>"


class UserSession(Base):
    """User sessions for multi-device tracking"""
    __tablename__ = "user_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    session_token = Column(String(255), unique=True, nullable=False, index=True)
    status = Column(Enum(SessionStatus), default=SessionStatus.ACTIVE, nullable=False)
    
    # Session metadata
    device_name = Column(String(255), nullable=True)
    device_type = Column(String(50), nullable=True)  # mobile, desktop, tablet
    browser = Column(String(100), nullable=True)
    os = Column(String(100), nullable=True)
    ip_address = Column(String(45), nullable=False)
    location = Column(JSON, nullable=True)  # GeoIP data
    user_agent = Column(Text, nullable=True)
    
    # Session timing
    created_at = Column(DateTime, default=func.now(), nullable=False)
    last_activity_at = Column(DateTime, default=func.now(), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    ended_at = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="user_sessions")
    
    def __repr__(self):
        return f"<UserSession(id={self.id}, user_id={self.user_id}, status={self.status})>"


class OAuthAccount(Base):
    """OAuth account connections"""
    __tablename__ = "oauth_accounts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    provider = Column(Enum(OAuthProvider), nullable=False)
    provider_user_id = Column(String(255), nullable=False)
    provider_email = Column(String(255), nullable=True)
    provider_username = Column(String(255), nullable=True)
    
    # OAuth tokens
    access_token = Column(Text, nullable=True)
    refresh_token = Column(Text, nullable=True)
    token_expires_at = Column(DateTime, nullable=True)
    
    # Profile data from provider
    profile_data = Column(JSON, nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="oauth_accounts")
    
    # Unique constraint for provider + provider_user_id
    __table_args__ = (
        UniqueConstraint('provider', 'provider_user_id', name='uq_oauth_provider_user'),
    )
    
    def __repr__(self):
        return f"<OAuthAccount(id={self.id}, user_id={self.user_id}, provider={self.provider})>"


class SocialConnection(Base):
    """Social connections between users (following/followers)"""
    __tablename__ = "social_connections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    follower_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    following_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Connection metadata
    created_at = Column(DateTime, default=func.now(), nullable=False)
    
    # Relationships
    follower = relationship("User", foreign_keys=[follower_id], back_populates="social_connections_as_follower")
    following = relationship("User", foreign_keys=[following_id], back_populates="social_connections_as_following")
    
    # Unique constraint to prevent duplicate connections
    __table_args__ = (
        UniqueConstraint('follower_id', 'following_id', name='uq_social_connection'),
        Index('ix_social_connections_follower_following', 'follower_id', 'following_id'),
    )
    
    def __repr__(self):
        return f"<SocialConnection(follower_id={self.follower_id}, following_id={self.following_id})>"


class AuditLog(Base):
    """Security audit log for tracking user actions"""
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    
    # Action details
    action = Column(String(100), nullable=False, index=True)
    resource_type = Column(String(50), nullable=True)
    resource_id = Column(String(255), nullable=True)
    
    # Request details
    ip_address = Column(String(45), nullable=False)
    user_agent = Column(Text, nullable=True)
    request_method = Column(String(10), nullable=True)
    request_path = Column(String(500), nullable=True)
    
    # Additional data
    details = Column(JSON, nullable=True)
    success = Column(Boolean, nullable=False)
    error_message = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=func.now(), nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="audit_logs")
    
    # Indexes for efficient querying
    __table_args__ = (
        Index('ix_audit_logs_user_action', 'user_id', 'action'),
        Index('ix_audit_logs_created_at', 'created_at'),
        Index('ix_audit_logs_ip_address', 'ip_address'),
    )
    
    def __repr__(self):
        return f"<AuditLog(id={self.id}, user_id={self.user_id}, action={self.action})>"


class BlacklistedToken(Base):
    """Blacklisted tokens (for logout, revocation)"""
    __tablename__ = "blacklisted_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    token_jti = Column(String(255), unique=True, nullable=False, index=True)  # JWT ID
    token_type = Column(Enum(TokenType), nullable=False)
    
    blacklisted_at = Column(DateTime, default=func.now(), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    
    # Optional user reference
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    
    def __repr__(self):
        return f"<BlacklistedToken(jti={self.token_jti}, type={self.token_type})>"


class RateLimitRecord(Base):
    """Rate limiting records"""
    __tablename__ = "rate_limit_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    identifier = Column(String(255), nullable=False, index=True)  # IP or user ID
    endpoint = Column(String(255), nullable=False)
    
    request_count = Column(Integer, default=1, nullable=False)
    window_start = Column(DateTime, default=func.now(), nullable=False)
    
    # Indexes for efficient cleanup and querying
    __table_args__ = (
        Index('ix_rate_limit_identifier_endpoint', 'identifier', 'endpoint'),
        Index('ix_rate_limit_window_start', 'window_start'),
    )
    
    def __repr__(self):
        return f"<RateLimitRecord(identifier={self.identifier}, endpoint={self.endpoint})>"


class DeviceFingerprint(Base):
    """Device fingerprinting for security"""
    __tablename__ = "device_fingerprints"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    fingerprint_hash = Column(String(255), nullable=False, index=True)
    device_info = Column(JSON, nullable=False)  # Browser, OS, screen, timezone, etc.
    
    is_trusted = Column(Boolean, default=False, nullable=False)
    first_seen_at = Column(DateTime, default=func.now(), nullable=False)
    last_seen_at = Column(DateTime, default=func.now(), nullable=False)
    
    # Relationships
    user = relationship("User")
    
    def __repr__(self):
        return f"<DeviceFingerprint(id={self.id}, user_id={self.user_id}, trusted={self.is_trusted})>"


class UserProfile(Base):
    """Extended user profile information"""
    __tablename__ = "user_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True, index=True)
    
    # Extended Profile Information
    cover_photo_url = Column(String(500), nullable=True)
    bio = Column(Text, nullable=True)
    website_url = Column(String(500), nullable=True)
    social_media_links = Column(JSON, nullable=True)  # Instagram, Twitter, etc.
    
    # Verification Status
    identity_verified = Column(Enum(VerificationStatus), default=VerificationStatus.UNVERIFIED, nullable=False)
    phone_verified = Column(Enum(VerificationStatus), default=VerificationStatus.UNVERIFIED, nullable=False)
    email_verified = Column(Enum(VerificationStatus), default=VerificationStatus.UNVERIFIED, nullable=False)
    
    # Travel Profile
    travel_motto = Column(String(255), nullable=True)
    favorite_destinations = Column(JSON, nullable=True)  # Array of destination objects
    travel_bucket_list = Column(JSON, nullable=True)  # Array of bucket list items
    languages_spoken = Column(JSON, nullable=True)  # Array of language codes
    
    # Privacy Settings
    profile_privacy = Column(Enum(PrivacyLevel), default=PrivacyLevel.PUBLIC, nullable=False)
    travel_stats_privacy = Column(Enum(PrivacyLevel), default=PrivacyLevel.PUBLIC, nullable=False)
    connections_privacy = Column(Enum(PrivacyLevel), default=PrivacyLevel.PUBLIC, nullable=False)
    activity_privacy = Column(Enum(PrivacyLevel), default=PrivacyLevel.FOLLOWERS, nullable=False)
    
    # Display Preferences
    show_travel_stats = Column(Boolean, default=True, nullable=False)
    show_achievements = Column(Boolean, default=True, nullable=False)
    show_recent_activity = Column(Boolean, default=True, nullable=False)
    show_travel_timeline = Column(Boolean, default=True, nullable=False)
    
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    user = relationship("User", backref="profile")
    
    def __repr__(self):
        return f"<UserProfile(user_id={self.user_id})>"


class TravelStatistics(Base):
    """Detailed travel statistics for users"""
    __tablename__ = "travel_statistics"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True, index=True)
    
    # Country and City Statistics
    countries_visited = Column(Integer, default=0, nullable=False)
    cities_explored = Column(Integer, default=0, nullable=False)
    unique_places_visited = Column(Integer, default=0, nullable=False)
    
    # Distance and Travel Metrics
    total_miles_traveled = Column(Float, default=0.0, nullable=False)
    total_kilometers_traveled = Column(Float, default=0.0, nullable=False)
    flights_taken = Column(Integer, default=0, nullable=False)
    
    # Experience Metrics
    experiences_booked = Column(Integer, default=0, nullable=False)
    reviews_written = Column(Integer, default=0, nullable=False)
    photos_shared = Column(Integer, default=0, nullable=False)
    
    # Environmental Impact
    eco_score = Column(Float, default=0.0, nullable=False)
    carbon_footprint = Column(Float, default=0.0, nullable=False)  # kg CO2
    sustainable_choices = Column(Integer, default=0, nullable=False)
    
    # Social Metrics
    followers_count = Column(Integer, default=0, nullable=False)
    following_count = Column(Integer, default=0, nullable=False)
    travel_buddies_met = Column(Integer, default=0, nullable=False)
    
    # Activity Metrics
    total_bookings = Column(Integer, default=0, nullable=False)
    total_spent = Column(Float, default=0.0, nullable=False)
    average_trip_duration = Column(Float, default=0.0, nullable=False)  # days
    
    # Time-based Statistics
    first_trip_date = Column(DateTime, nullable=True)
    last_trip_date = Column(DateTime, nullable=True)
    most_active_month = Column(Integer, nullable=True)  # 1-12
    most_active_year = Column(Integer, nullable=True)
    
    # Detailed Travel Data (JSON arrays)
    countries_data = Column(JSON, nullable=True)  # [{country, visits, first_visit, last_visit}]
    cities_data = Column(JSON, nullable=True)  # [{city, country, visits, first_visit, last_visit}]
    yearly_summary = Column(JSON, nullable=True)  # [{year, trips, countries, cities, miles}]
    
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    user = relationship("User", backref="travel_stats")
    
    def __repr__(self):
        return f"<TravelStatistics(user_id={self.user_id}, countries={self.countries_visited})>"


class UserAchievement(Base):
    """User achievements and badges"""
    __tablename__ = "user_achievements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    achievement_type = Column(Enum(AchievementType), nullable=False)
    level = Column(Integer, default=1, nullable=False)  # Bronze=1, Silver=2, Gold=3, Platinum=4
    progress = Column(Float, default=0.0, nullable=False)  # Progress towards next level (0-100)
    
    # Achievement Details
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    icon_url = Column(String(500), nullable=True)
    badge_color = Column(String(20), nullable=True)
    
    # Achievement Data
    criteria_met = Column(JSON, nullable=True)  # Specific criteria that were met
    unlock_date = Column(DateTime, default=func.now(), nullable=False)
    notification_sent = Column(Boolean, default=False, nullable=False)
    
    # Display Settings
    is_visible = Column(Boolean, default=True, nullable=False)
    is_featured = Column(Boolean, default=False, nullable=False)
    display_order = Column(Integer, default=0, nullable=False)
    
    created_at = Column(DateTime, default=func.now(), nullable=False)
    
    # Relationships
    user = relationship("User", backref="achievements")
    
    # Unique constraint to prevent duplicate achievements
    __table_args__ = (
        UniqueConstraint('user_id', 'achievement_type', 'level', name='uq_user_achievement'),
        Index('ix_user_achievements_user_type', 'user_id', 'achievement_type'),
    )
    
    def __repr__(self):
        return f"<UserAchievement(user_id={self.user_id}, type={self.achievement_type}, level={self.level})>"


class UserContent(Base):
    """User-generated content (posts, reviews, photos, etc.)"""
    __tablename__ = "user_content"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    content_type = Column(Enum(ContentType), nullable=False)
    title = Column(String(255), nullable=True)
    content = Column(Text, nullable=True)
    
    # Media Content
    media_urls = Column(JSON, nullable=True)  # Array of image/video URLs
    thumbnail_url = Column(String(500), nullable=True)
    
    # Location Data
    location_name = Column(String(255), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    country = Column(String(100), nullable=True)
    city = Column(String(100), nullable=True)
    
    # Content Metadata
    tags = Column(JSON, nullable=True)  # Array of tags
    mentions = Column(JSON, nullable=True)  # Array of mentioned user IDs
    privacy_level = Column(Enum(PrivacyLevel), default=PrivacyLevel.PUBLIC, nullable=False)
    
    # Engagement Metrics
    likes_count = Column(Integer, default=0, nullable=False)
    comments_count = Column(Integer, default=0, nullable=False)
    shares_count = Column(Integer, default=0, nullable=False)
    views_count = Column(Integer, default=0, nullable=False)
    
    # Content Status
    is_published = Column(Boolean, default=True, nullable=False)
    is_featured = Column(Boolean, default=False, nullable=False)
    is_deleted = Column(Boolean, default=False, nullable=False)
    
    # Moderation
    is_flagged = Column(Boolean, default=False, nullable=False)
    moderation_status = Column(String(20), default="approved", nullable=False)
    moderation_notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    published_at = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", backref="content")
    
    # Indexes for efficient querying
    __table_args__ = (
        Index('ix_user_content_user_type', 'user_id', 'content_type'),
        Index('ix_user_content_location', 'latitude', 'longitude'),
        Index('ix_user_content_published', 'is_published', 'published_at'),
    )
    
    def __repr__(self):
        return f"<UserContent(id={self.id}, user_id={self.user_id}, type={self.content_type})>"


class UserActivity(Base):
    """User activity feed tracking"""
    __tablename__ = "user_activities"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    activity_type = Column(Enum(ActivityType), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Activity Data
    metadata = Column(JSON, nullable=True)  # Flexible activity-specific data
    entity_type = Column(String(50), nullable=True)  # Type of entity (place, user, etc.)
    entity_id = Column(String(255), nullable=True)  # ID of related entity
    
    # Location Data (if applicable)
    location_name = Column(String(255), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    
    # Visibility and Privacy
    privacy_level = Column(Enum(PrivacyLevel), default=PrivacyLevel.FOLLOWERS, nullable=False)
    is_visible = Column(Boolean, default=True, nullable=False)
    
    # Timestamps
    activity_date = Column(DateTime, default=func.now(), nullable=False)  # When the activity happened
    created_at = Column(DateTime, default=func.now(), nullable=False)  # When it was recorded
    
    # Relationships
    user = relationship("User", backref="activities")
    
    # Indexes for efficient feed generation
    __table_args__ = (
        Index('ix_user_activities_user_date', 'user_id', 'activity_date'),
        Index('ix_user_activities_type_date', 'activity_type', 'activity_date'),
        Index('ix_user_activities_privacy_date', 'privacy_level', 'activity_date'),
    )
    
    def __repr__(self):
        return f"<UserActivity(id={self.id}, user_id={self.user_id}, type={self.activity_type})>"


class TravelTimeline(Base):
    """User travel timeline entries"""
    __tablename__ = "travel_timeline"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    # Trip Information
    trip_title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Location Data
    destination = Column(String(255), nullable=False)
    country = Column(String(100), nullable=False)
    city = Column(String(100), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    
    # Trip Dates
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=True)
    duration_days = Column(Integer, nullable=True)
    
    # Trip Details
    trip_type = Column(String(50), nullable=True)  # business, leisure, adventure, etc.
    travel_style = Column(Enum(TravelStyle), nullable=True)
    budget_category = Column(Enum(BudgetPreference), nullable=True)
    
    # Media and Memories
    photos = Column(JSON, nullable=True)  # Array of photo URLs
    highlights = Column(JSON, nullable=True)  # Array of trip highlights
    companions = Column(JSON, nullable=True)  # Array of companion user IDs
    
    # Statistics
    miles_traveled = Column(Float, nullable=True)
    places_visited = Column(Integer, default=0, nullable=False)
    experiences_count = Column(Integer, default=0, nullable=False)
    
    # Sharing and Privacy
    privacy_level = Column(Enum(PrivacyLevel), default=PrivacyLevel.FOLLOWERS, nullable=False)
    is_featured = Column(Boolean, default=False, nullable=False)
    
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    user = relationship("User", backref="travel_timeline")
    
    # Indexes for efficient querying
    __table_args__ = (
        Index('ix_travel_timeline_user_date', 'user_id', 'start_date'),
        Index('ix_travel_timeline_destination', 'country', 'city'),
        Index('ix_travel_timeline_privacy', 'privacy_level', 'start_date'),
    )
    
    def __repr__(self):
        return f"<TravelTimeline(id={self.id}, user_id={self.user_id}, destination={self.destination})>"


class UserPrivacySettings(Base):
    """Comprehensive user privacy settings"""
    __tablename__ = "user_privacy_settings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True, index=True)
    
    # Profile Privacy
    profile_visibility = Column(Enum(PrivacyLevel), default=PrivacyLevel.PUBLIC, nullable=False)
    email_visibility = Column(Enum(PrivacyLevel), default=PrivacyLevel.PRIVATE, nullable=False)
    phone_visibility = Column(Enum(PrivacyLevel), default=PrivacyLevel.PRIVATE, nullable=False)
    location_visibility = Column(Enum(PrivacyLevel), default=PrivacyLevel.FOLLOWERS, nullable=False)
    
    # Activity Privacy
    activity_feed_visibility = Column(Enum(PrivacyLevel), default=PrivacyLevel.FOLLOWERS, nullable=False)
    travel_timeline_visibility = Column(Enum(PrivacyLevel), default=PrivacyLevel.FOLLOWERS, nullable=False)
    statistics_visibility = Column(Enum(PrivacyLevel), default=PrivacyLevel.PUBLIC, nullable=False)
    achievements_visibility = Column(Enum(PrivacyLevel), default=PrivacyLevel.PUBLIC, nullable=False)
    
    # Social Privacy
    connections_visibility = Column(Enum(PrivacyLevel), default=PrivacyLevel.PUBLIC, nullable=False)
    follower_list_visibility = Column(Enum(PrivacyLevel), default=PrivacyLevel.PUBLIC, nullable=False)
    following_list_visibility = Column(Enum(PrivacyLevel), default=PrivacyLevel.PUBLIC, nullable=False)
    
    # Content Privacy
    content_default_privacy = Column(Enum(PrivacyLevel), default=PrivacyLevel.FOLLOWERS, nullable=False)
    allow_content_indexing = Column(Boolean, default=True, nullable=False)
    allow_content_sharing = Column(Boolean, default=True, nullable=False)
    
    # Communication Privacy
    allow_messages_from = Column(Enum(PrivacyLevel), default=PrivacyLevel.FOLLOWERS, nullable=False)
    allow_follow_requests = Column(Boolean, default=True, nullable=False)
    allow_travel_buddy_requests = Column(Boolean, default=True, nullable=False)
    
    # Data Privacy
    allow_data_analytics = Column(Boolean, default=True, nullable=False)
    allow_personalized_ads = Column(Boolean, default=True, nullable=False)
    allow_marketing_emails = Column(Boolean, default=False, nullable=False)
    
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    user = relationship("User", backref="privacy_settings")
    
    def __repr__(self):
        return f"<UserPrivacySettings(user_id={self.user_id})>"