"""
Pydantic Schemas for Authentication Service
Request/response models for all authentication endpoints
"""
from datetime import datetime
from typing import List, Optional, Dict, Any
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, validator, root_validator

from ..models import (
    UserRole, UserStatus, TravelFrequency, BudgetPreference, 
    TravelStyle, OAuthProvider, SessionStatus
)

# Import profile schemas for comprehensive user management
try:
    from .user_profile_schemas import (
        PrivacyLevel, VerificationStatus, AchievementType, ContentType, ActivityType,
        UserProfileCreate, UserProfileUpdate, UserProfileResponse,
        TravelStatisticsResponse, TravelStatisticsUpdate,
        UserAchievementResponse, AchievementProgress,
        FollowRequest, SocialConnectionResponse, UserSocialProfile, SocialFeedResponse,
        UserContentCreate, UserContentUpdate, UserContentResponse,
        UserActivityResponse, ActivityFeedResponse,
        TravelTimelineCreate, TravelTimelineUpdate, TravelTimelineResponse,
        UserPrivacySettingsUpdate, UserPrivacySettingsResponse,
        EnhancedUserResponse, UserSearchRequest, UserSearchResponse,
        TravelBuddyRequest, TravelBuddyMatch
    )
except ImportError:
    # Profile schemas will be available after dependencies are installed
    pass


# Base schemas
class BaseSchema(BaseModel):
    """Base schema with common configuration"""
    
    class Config:
        from_attributes = True
        use_enum_values = True


# User Registration and Authentication Schemas
class UserRegistrationRequest(BaseSchema):
    """User registration request schema"""
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=8, max_length=128, description="User password")
    confirm_password: str = Field(..., description="Password confirmation")
    first_name: str = Field(..., min_length=1, max_length=100, description="First name")
    last_name: str = Field(..., min_length=1, max_length=100, description="Last name")
    
    # Optional onboarding data
    location: Optional[str] = Field(None, max_length=255, description="User location")
    travel_frequency: Optional[TravelFrequency] = Field(None, description="Travel frequency")
    
    # Privacy consents (required for GDPR)
    data_processing_consent: bool = Field(..., description="Data processing consent")
    marketing_consent: bool = Field(False, description="Marketing communications consent")
    
    @validator('confirm_password')
    def passwords_match(cls, v, values, **kwargs):
        if 'password' in values and v != values['password']:
            raise ValueError('Passwords do not match')
        return v
    
    @validator('password')
    def validate_password_strength(cls, v):
        errors = []
        
        if len(v) < 8:
            errors.append("Password must be at least 8 characters long")
        
        if not any(c.isupper() for c in v):
            errors.append("Password must contain at least one uppercase letter")
        
        if not any(c.islower() for c in v):
            errors.append("Password must contain at least one lowercase letter")
        
        if not any(c.isdigit() for c in v):
            errors.append("Password must contain at least one digit")
        
        if not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in v):
            errors.append("Password must contain at least one special character")
        
        if errors:
            raise ValueError(f"Password requirements not met: {', '.join(errors)}")
        return v


class UserLoginRequest(BaseSchema):
    """User login request schema"""
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., description="User password")
    remember_me: bool = Field(False, description="Remember user session")
    device_name: Optional[str] = Field(None, max_length=255, description="Device name for tracking")


class RefreshTokenRequest(BaseSchema):
    """Refresh token request schema"""
    refresh_token: str = Field(..., description="Refresh token")


class PasswordResetRequest(BaseSchema):
    """Password reset request schema"""
    email: EmailStr = Field(..., description="User email address")


class PasswordResetConfirm(BaseSchema):
    """Password reset confirmation schema"""
    token: str = Field(..., description="Password reset token")
    new_password: str = Field(..., min_length=8, max_length=128, description="New password")
    confirm_password: str = Field(..., description="Password confirmation")
    
    @validator('confirm_password')
    def passwords_match(cls, v, values, **kwargs):
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('Passwords do not match')
        return v


class EmailVerificationRequest(BaseSchema):
    """Email verification request schema"""
    email: EmailStr = Field(..., description="User email address")


class EmailVerificationConfirm(BaseSchema):
    """Email verification confirmation schema"""
    token: str = Field(..., description="Email verification token")


# Onboarding Schemas
class OnboardingStep1(BaseSchema):
    """Onboarding step 1: Personal information"""
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    location: str = Field(..., min_length=1, max_length=255)
    travel_frequency: TravelFrequency


class OnboardingStep2(BaseSchema):
    """Onboarding step 2: Travel interests"""
    travel_interests: List[str] = Field(
        ..., 
        min_items=1, 
        description="List of travel interests (adventure, culture, food, nature, etc.)"
    )
    
    @validator('travel_interests')
    def validate_interests(cls, v):
        valid_interests = [
            "adventure", "culture", "food", "nature", "history", "art", 
            "nightlife", "shopping", "wellness", "photography", "wildlife",
            "architecture", "museums", "beaches", "mountains", "cities",
            "festivals", "sports", "volunteering", "luxury", "budget"
        ]
        for interest in v:
            if interest.lower() not in valid_interests:
                raise ValueError(f"Invalid interest: {interest}")
        return [interest.lower() for interest in v]


class OnboardingStep3(BaseSchema):
    """Onboarding step 3: Budget preferences"""
    budget_preference: BudgetPreference


class OnboardingStep4(BaseSchema):
    """Onboarding step 4: Travel style"""
    travel_style: TravelStyle


class OnboardingComplete(BaseSchema):
    """Complete onboarding data"""
    step1: OnboardingStep1
    step2: OnboardingStep2
    step3: OnboardingStep3
    step4: OnboardingStep4


# OAuth Schemas
class OAuthLoginRequest(BaseSchema):
    """OAuth login/registration request"""
    provider: OAuthProvider = Field(..., description="OAuth provider")
    code: str = Field(..., description="OAuth authorization code")
    state: Optional[str] = Field(None, description="OAuth state parameter")
    redirect_uri: str = Field(..., description="OAuth redirect URI")


class OAuthLinkRequest(BaseSchema):
    """Link OAuth account to existing user"""
    provider: OAuthProvider = Field(..., description="OAuth provider")
    code: str = Field(..., description="OAuth authorization code")
    redirect_uri: str = Field(..., description="OAuth redirect URI")


# Profile Management Schemas
class UserProfileUpdate(BaseSchema):
    """User profile update schema"""
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    bio: Optional[str] = Field(None, max_length=1000)
    location: Optional[str] = Field(None, max_length=255)
    timezone: Optional[str] = Field(None, max_length=50)
    language_preference: Optional[str] = Field(None, min_length=2, max_length=10)
    
    # Travel preferences
    travel_frequency: Optional[TravelFrequency] = None
    budget_preference: Optional[BudgetPreference] = None
    travel_style: Optional[TravelStyle] = None
    travel_interests: Optional[List[str]] = None
    
    # Privacy settings
    profile_visibility: Optional[str] = Field(None, regex="^(public|friends|private)$")
    location_sharing: Optional[bool] = None
    activity_visibility: Optional[bool] = None


class PasswordChangeRequest(BaseSchema):
    """Password change request schema"""
    current_password: str = Field(..., description="Current password")
    new_password: str = Field(..., min_length=8, max_length=128, description="New password")
    confirm_password: str = Field(..., description="Password confirmation")
    
    @validator('confirm_password')
    def passwords_match(cls, v, values, **kwargs):
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('Passwords do not match')
        return v


# Response Schemas
class TokenResponse(BaseSchema):
    """Token response schema"""
    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="JWT refresh token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(..., description="Token expiration time in seconds")


class UserResponse(BaseSchema):
    """User response schema"""
    id: UUID
    email: str
    first_name: Optional[str]
    last_name: Optional[str]
    full_name: Optional[str]
    avatar_url: Optional[str]
    role: UserRole
    status: UserStatus
    is_email_verified: bool
    onboarding_completed: bool
    created_at: datetime
    last_login_at: Optional[datetime]


class UserProfileResponse(BaseSchema):
    """Detailed user profile response"""
    id: UUID
    email: str
    first_name: Optional[str]
    last_name: Optional[str]
    full_name: Optional[str]
    phone_number: Optional[str]
    avatar_url: Optional[str]
    cover_photo_url: Optional[str]
    bio: Optional[str]
    location: Optional[str]
    timezone: Optional[str]
    language_preference: str
    
    # Status and verification
    role: UserRole
    status: UserStatus
    is_email_verified: bool
    is_phone_verified: bool
    
    # Travel preferences
    travel_frequency: Optional[TravelFrequency]
    budget_preference: Optional[BudgetPreference]
    travel_style: Optional[TravelStyle]
    travel_interests: Optional[List[str]]
    
    # Privacy settings
    profile_visibility: str
    location_sharing: bool
    activity_visibility: bool
    
    # Onboarding
    onboarding_completed: bool
    onboarding_step: int
    
    # Travel statistics
    countries_visited: int
    cities_explored: int
    total_miles_traveled: float
    eco_score: float
    
    # Timestamps
    created_at: datetime
    updated_at: datetime
    last_activity_at: datetime
    last_login_at: Optional[datetime]


class UserSessionResponse(BaseSchema):
    """User session response schema"""
    id: UUID
    device_name: Optional[str]
    device_type: Optional[str]
    browser: Optional[str]
    os: Optional[str]
    ip_address: str
    location: Optional[Dict[str, Any]]
    status: SessionStatus
    created_at: datetime
    last_activity_at: datetime
    is_current: bool = Field(default=False, description="Whether this is the current session")


class OAuthAccountResponse(BaseSchema):
    """OAuth account response schema"""
    id: UUID
    provider: OAuthProvider
    provider_username: Optional[str]
    provider_email: Optional[str]
    is_active: bool
    created_at: datetime


class AuthenticationResponse(BaseSchema):
    """Complete authentication response"""
    user: UserResponse
    tokens: TokenResponse
    session: UserSessionResponse
    requires_onboarding: bool = Field(default=False, description="Whether user needs to complete onboarding")
    is_new_user: bool = Field(default=False, description="Whether this is a newly registered user")


# Account Management Schemas
class AccountDeletionRequest(BaseSchema):
    """Account deletion request schema"""
    password: str = Field(..., description="Current password for verification")
    reason: Optional[str] = Field(None, max_length=500, description="Reason for deletion")
    data_download_requested: bool = Field(False, description="Whether to request data download")


class DataExportRequest(BaseSchema):
    """Data export request schema"""
    include_personal_data: bool = Field(True)
    include_activity_data: bool = Field(True)
    include_content_data: bool = Field(True)
    format: str = Field("json", regex="^(json|csv)$")


# Admin Schemas
class AdminUserUpdate(BaseSchema):
    """Admin user update schema"""
    role: Optional[UserRole] = None
    status: Optional[UserStatus] = None
    is_email_verified: Optional[bool] = None
    notes: Optional[str] = Field(None, max_length=1000)


class UserSearchRequest(BaseSchema):
    """User search request schema"""
    query: Optional[str] = Field(None, min_length=1, max_length=255)
    role: Optional[UserRole] = None
    status: Optional[UserStatus] = None
    email_verified: Optional[bool] = None
    onboarding_completed: Optional[bool] = None
    created_after: Optional[datetime] = None
    created_before: Optional[datetime] = None
    limit: int = Field(20, ge=1, le=100)
    offset: int = Field(0, ge=0)


# Error Schemas
class ErrorDetail(BaseSchema):
    """Error detail schema"""
    field: Optional[str] = None
    message: str
    code: Optional[str] = None


class ErrorResponse(BaseSchema):
    """Error response schema"""
    error: str
    message: str
    details: Optional[List[ErrorDetail]] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# Success Response Schemas
class SuccessResponse(BaseSchema):
    """Generic success response"""
    success: bool = True
    message: str
    data: Optional[Dict[str, Any]] = None


class MessageResponse(BaseSchema):
    """Simple message response"""
    message: str


# Security Schemas
class DeviceFingerprintRequest(BaseSchema):
    """Device fingerprint for security"""
    browser_info: Dict[str, Any] = Field(..., description="Browser fingerprint data")
    screen_info: Dict[str, Any] = Field(..., description="Screen information")
    timezone: str = Field(..., description="User timezone")
    language: str = Field(..., description="Browser language")


class SuspiciousActivityAlert(BaseSchema):
    """Suspicious activity alert"""
    activity_type: str
    risk_score: float
    details: Dict[str, Any]
    recommended_action: str