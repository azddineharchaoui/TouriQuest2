"""
User Profile Schemas
Pydantic schemas for user profile management, social features, and travel statistics
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID
from enum import Enum

from pydantic import BaseModel, Field, EmailStr, validator, root_validator


# Enums (reusing from models)
class PrivacyLevel(str, Enum):
    PUBLIC = "public"
    FOLLOWERS = "followers"
    PRIVATE = "private"


class VerificationStatus(str, Enum):
    UNVERIFIED = "unverified"
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"


class AchievementType(str, Enum):
    WORLD_EXPLORER = "world_explorer"
    ECO_WARRIOR = "eco_warrior"
    CULTURE_SEEKER = "culture_seeker"
    ADVENTURE_MASTER = "adventure_master"
    SOCIAL_BUTTERFLY = "social_butterfly"
    PHOTO_ENTHUSIAST = "photo_enthusiast"
    FOODIE = "foodie"
    HISTORY_BUFF = "history_buff"


class ContentType(str, Enum):
    POST = "post"
    REVIEW = "review"
    PHOTO = "photo"
    VIDEO = "video"
    STORY = "story"


class ActivityType(str, Enum):
    PROFILE_UPDATE = "profile_update"
    PHOTO_UPLOAD = "photo_upload"
    REVIEW_POST = "review_post"
    TRIP_CHECKIN = "trip_checkin"
    ACHIEVEMENT_EARNED = "achievement_earned"
    PLACE_VISITED = "place_visited"
    FRIEND_ADDED = "friend_added"
    CONTENT_SHARED = "content_shared"


# Base schemas
class UserProfileBase(BaseModel):
    """Base user profile schema"""
    cover_photo_url: Optional[str] = None
    bio: Optional[str] = Field(None, max_length=500)
    website_url: Optional[str] = None
    social_media_links: Optional[Dict[str, str]] = None
    travel_motto: Optional[str] = Field(None, max_length=255)
    favorite_destinations: Optional[List[Dict[str, Any]]] = None
    travel_bucket_list: Optional[List[str]] = None
    languages_spoken: Optional[List[str]] = None


class UserProfileCreate(UserProfileBase):
    """Schema for creating user profile"""
    pass


class UserProfileUpdate(UserProfileBase):
    """Schema for updating user profile"""
    pass


class UserProfileResponse(UserProfileBase):
    """Schema for user profile response"""
    id: UUID
    user_id: UUID
    identity_verified: VerificationStatus
    phone_verified: VerificationStatus
    email_verified: VerificationStatus
    profile_privacy: PrivacyLevel
    show_travel_stats: bool
    show_achievements: bool
    show_recent_activity: bool
    show_travel_timeline: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Travel Statistics Schemas
class CountryVisit(BaseModel):
    """Schema for country visit data"""
    country: str
    country_code: str
    visits: int
    first_visit: datetime
    last_visit: datetime


class CityVisit(BaseModel):
    """Schema for city visit data"""
    city: str
    country: str
    country_code: str
    visits: int
    first_visit: datetime
    last_visit: datetime


class YearlySummary(BaseModel):
    """Schema for yearly travel summary"""
    year: int
    trips: int
    countries: int
    cities: int
    miles: float
    experiences: int
    total_spent: float


class TravelStatisticsResponse(BaseModel):
    """Schema for travel statistics response"""
    id: UUID
    user_id: UUID
    countries_visited: int
    cities_explored: int
    unique_places_visited: int
    total_miles_traveled: float
    total_kilometers_traveled: float
    flights_taken: int
    experiences_booked: int
    reviews_written: int
    photos_shared: int
    eco_score: float
    carbon_footprint: float
    sustainable_choices: int
    followers_count: int
    following_count: int
    travel_buddies_met: int
    total_bookings: int
    total_spent: float
    average_trip_duration: float
    first_trip_date: Optional[datetime]
    last_trip_date: Optional[datetime]
    most_active_month: Optional[int]
    most_active_year: Optional[int]
    countries_data: Optional[List[CountryVisit]] = None
    cities_data: Optional[List[CityVisit]] = None
    yearly_summary: Optional[List[YearlySummary]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TravelStatisticsUpdate(BaseModel):
    """Schema for updating travel statistics"""
    miles_to_add: Optional[float] = None
    new_country: Optional[str] = None
    new_city: Optional[str] = None
    eco_points_to_add: Optional[float] = None
    carbon_footprint_to_add: Optional[float] = None


# Achievement Schemas
class AchievementCriteria(BaseModel):
    """Schema for achievement criteria"""
    metric: str
    target_value: int
    current_value: int
    completed: bool


class UserAchievementResponse(BaseModel):
    """Schema for user achievement response"""
    id: UUID
    user_id: UUID
    achievement_type: AchievementType
    level: int
    progress: float
    title: str
    description: Optional[str]
    icon_url: Optional[str]
    badge_color: Optional[str]
    criteria_met: Optional[Dict[str, Any]]
    unlock_date: datetime
    is_visible: bool
    is_featured: bool
    display_order: int

    class Config:
        from_attributes = True


class AchievementProgress(BaseModel):
    """Schema for achievement progress"""
    achievement_type: AchievementType
    current_level: int
    current_progress: float
    next_level_requirements: Optional[Dict[str, Any]] = None
    estimated_completion: Optional[datetime] = None


# Social Features Schemas
class FollowRequest(BaseModel):
    """Schema for follow/unfollow requests"""
    user_id: UUID


class SocialConnectionResponse(BaseModel):
    """Schema for social connection response"""
    id: UUID
    follower_id: UUID
    following_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


class UserSocialProfile(BaseModel):
    """Schema for user social profile"""
    id: UUID
    first_name: Optional[str]
    last_name: Optional[str]
    avatar_url: Optional[str]
    bio: Optional[str]
    travel_motto: Optional[str]
    countries_visited: int
    followers_count: int
    following_count: int
    is_verified: bool
    is_following: Optional[bool] = None  # Whether current user follows this user
    is_follower: Optional[bool] = None   # Whether this user follows current user

    class Config:
        from_attributes = True


class SocialFeedResponse(BaseModel):
    """Schema for social feed response"""
    followers: List[UserSocialProfile]
    following: List[UserSocialProfile]
    suggestions: List[UserSocialProfile]
    total_followers: int
    total_following: int

    class Config:
        from_attributes = True


# Content Schemas
class UserContentCreate(BaseModel):
    """Schema for creating user content"""
    content_type: ContentType
    title: Optional[str] = Field(None, max_length=255)
    content: Optional[str] = None
    media_urls: Optional[List[str]] = None
    location_name: Optional[str] = None
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    country: Optional[str] = None
    city: Optional[str] = None
    tags: Optional[List[str]] = None
    mentions: Optional[List[UUID]] = None
    privacy_level: PrivacyLevel = PrivacyLevel.PUBLIC


class UserContentUpdate(BaseModel):
    """Schema for updating user content"""
    title: Optional[str] = Field(None, max_length=255)
    content: Optional[str] = None
    tags: Optional[List[str]] = None
    privacy_level: Optional[PrivacyLevel] = None


class UserContentResponse(BaseModel):
    """Schema for user content response"""
    id: UUID
    user_id: UUID
    content_type: ContentType
    title: Optional[str]
    content: Optional[str]
    media_urls: Optional[List[str]]
    thumbnail_url: Optional[str]
    location_name: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    country: Optional[str]
    city: Optional[str]
    tags: Optional[List[str]]
    mentions: Optional[List[UUID]]
    privacy_level: PrivacyLevel
    likes_count: int
    comments_count: int
    shares_count: int
    views_count: int
    is_published: bool
    is_featured: bool
    created_at: datetime
    updated_at: datetime
    published_at: Optional[datetime]

    class Config:
        from_attributes = True


# Activity Feed Schemas
class UserActivityResponse(BaseModel):
    """Schema for user activity response"""
    id: UUID
    user_id: UUID
    activity_type: ActivityType
    title: str
    description: Optional[str]
    metadata: Optional[Dict[str, Any]]
    entity_type: Optional[str]
    entity_id: Optional[str]
    location_name: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    privacy_level: PrivacyLevel
    activity_date: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class ActivityFeedResponse(BaseModel):
    """Schema for activity feed response"""
    activities: List[UserActivityResponse]
    total_count: int
    has_more: bool
    next_cursor: Optional[str] = None


# Travel Timeline Schemas
class TravelTimelineCreate(BaseModel):
    """Schema for creating travel timeline entry"""
    trip_title: str = Field(..., max_length=255)
    description: Optional[str] = None
    destination: str = Field(..., max_length=255)
    country: str = Field(..., max_length=100)
    city: Optional[str] = Field(None, max_length=100)
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    start_date: datetime
    end_date: Optional[datetime] = None
    trip_type: Optional[str] = None
    photos: Optional[List[str]] = None
    highlights: Optional[List[str]] = None
    companions: Optional[List[UUID]] = None
    miles_traveled: Optional[float] = None
    places_visited: int = 0
    experiences_count: int = 0
    privacy_level: PrivacyLevel = PrivacyLevel.FOLLOWERS

    @validator('end_date')
    def validate_end_date(cls, v, values):
        if v and 'start_date' in values and v < values['start_date']:
            raise ValueError('End date must be after start date')
        return v


class TravelTimelineUpdate(BaseModel):
    """Schema for updating travel timeline entry"""
    trip_title: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    end_date: Optional[datetime] = None
    photos: Optional[List[str]] = None
    highlights: Optional[List[str]] = None
    companions: Optional[List[UUID]] = None
    miles_traveled: Optional[float] = None
    places_visited: Optional[int] = None
    experiences_count: Optional[int] = None
    privacy_level: Optional[PrivacyLevel] = None


class TravelTimelineResponse(BaseModel):
    """Schema for travel timeline response"""
    id: UUID
    user_id: UUID
    trip_title: str
    description: Optional[str]
    destination: str
    country: str
    city: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    start_date: datetime
    end_date: Optional[datetime]
    duration_days: Optional[int]
    trip_type: Optional[str]
    photos: Optional[List[str]]
    highlights: Optional[List[str]]
    companions: Optional[List[UUID]]
    miles_traveled: Optional[float]
    places_visited: int
    experiences_count: int
    privacy_level: PrivacyLevel
    is_featured: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Privacy Settings Schemas
class UserPrivacySettingsUpdate(BaseModel):
    """Schema for updating user privacy settings"""
    profile_visibility: Optional[PrivacyLevel] = None
    email_visibility: Optional[PrivacyLevel] = None
    phone_visibility: Optional[PrivacyLevel] = None
    location_visibility: Optional[PrivacyLevel] = None
    activity_feed_visibility: Optional[PrivacyLevel] = None
    travel_timeline_visibility: Optional[PrivacyLevel] = None
    statistics_visibility: Optional[PrivacyLevel] = None
    achievements_visibility: Optional[PrivacyLevel] = None
    connections_visibility: Optional[PrivacyLevel] = None
    follower_list_visibility: Optional[PrivacyLevel] = None
    following_list_visibility: Optional[PrivacyLevel] = None
    content_default_privacy: Optional[PrivacyLevel] = None
    allow_content_indexing: Optional[bool] = None
    allow_content_sharing: Optional[bool] = None
    allow_messages_from: Optional[PrivacyLevel] = None
    allow_follow_requests: Optional[bool] = None
    allow_travel_buddy_requests: Optional[bool] = None
    allow_data_analytics: Optional[bool] = None
    allow_personalized_ads: Optional[bool] = None
    allow_marketing_emails: Optional[bool] = None


class UserPrivacySettingsResponse(BaseModel):
    """Schema for user privacy settings response"""
    id: UUID
    user_id: UUID
    profile_visibility: PrivacyLevel
    email_visibility: PrivacyLevel
    phone_visibility: PrivacyLevel
    location_visibility: PrivacyLevel
    activity_feed_visibility: PrivacyLevel
    travel_timeline_visibility: PrivacyLevel
    statistics_visibility: PrivacyLevel
    achievements_visibility: PrivacyLevel
    connections_visibility: PrivacyLevel
    follower_list_visibility: PrivacyLevel
    following_list_visibility: PrivacyLevel
    content_default_privacy: PrivacyLevel
    allow_content_indexing: bool
    allow_content_sharing: bool
    allow_messages_from: PrivacyLevel
    allow_follow_requests: bool
    allow_travel_buddy_requests: bool
    allow_data_analytics: bool
    allow_personalized_ads: bool
    allow_marketing_emails: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Enhanced User Response Schema
class EnhancedUserResponse(BaseModel):
    """Enhanced user response with profile data"""
    id: UUID
    email: str
    first_name: Optional[str]
    last_name: Optional[str]
    full_name: Optional[str]
    avatar_url: Optional[str]
    role: str
    status: str
    is_email_verified: bool
    onboarding_completed: bool
    created_at: datetime
    last_login_at: Optional[datetime]
    
    # Profile data
    profile: Optional[UserProfileResponse] = None
    travel_stats: Optional[TravelStatisticsResponse] = None
    achievements: List[UserAchievementResponse] = []
    recent_activities: List[UserActivityResponse] = []
    privacy_settings: Optional[UserPrivacySettingsResponse] = None
    
    # Social data
    followers_count: int = 0
    following_count: int = 0
    is_following: Optional[bool] = None
    is_follower: Optional[bool] = None

    class Config:
        from_attributes = True


# Search and Discovery Schemas
class UserSearchRequest(BaseModel):
    """Schema for user search request"""
    query: Optional[str] = None
    location: Optional[str] = None
    travel_interests: Optional[List[str]] = None
    countries_visited: Optional[List[str]] = None
    min_countries: Optional[int] = None
    max_countries: Optional[int] = None
    verified_only: bool = False
    limit: int = Field(20, ge=1, le=100)
    offset: int = Field(0, ge=0)


class UserSearchResponse(BaseModel):
    """Schema for user search response"""
    users: List[UserSocialProfile]
    total_count: int
    has_more: bool


# Travel Buddy Matching Schemas
class TravelBuddyRequest(BaseModel):
    """Schema for travel buddy matching request"""
    destination: str
    travel_dates: Dict[str, datetime]  # start_date, end_date
    travel_style: Optional[str] = None
    budget_preference: Optional[str] = None
    interests: Optional[List[str]] = None
    group_size: int = Field(1, ge=1, le=10)
    message: Optional[str] = None


class TravelBuddyMatch(BaseModel):
    """Schema for travel buddy match"""
    user: UserSocialProfile
    compatibility_score: float
    shared_interests: List[str]
    travel_overlap: Dict[str, Any]
    mutual_connections: int

    class Config:
        from_attributes = True