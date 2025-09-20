"""
Database Models Package

This package contains all SQLAlchemy models for the TouriQuest application.
All models are imported here for easy access throughout the application.
"""

# Base models and mixins
from .base import (
    BaseModel,
    TimestampMixin,
    SoftDeleteMixin,
    AuditMixin,
    MetadataMixin,
    GeolocationMixin,
    RatingMixin,
    SearchableMixin,
    CommonIndexes
)

# User and authentication models
from .user import (
    User,
    UserProfile,
    UserAuth,
    UserSession,
    UserSocialConnection,
    UserPreferences,
    UserOnboarding,
    TravelHistory,
    TravelStats,
    UserAchievement,
    UserBadge
)

# Property and accommodation models
from .property import (
    Property,
    PropertyAmenity,
    PropertyImage,
    PropertyPricing,
    PropertyAvailability,
    PropertyCalendar,
    PropertyRule
)

# Point of Interest models
from .poi import (
    POI,
    POICategory,
    POIImage,
    POIAudioGuide,
    POIARExperience,
    POITranslation,
    POIOpeningHours
)

# Experience and activity models
from .experience import (
    Experience,
    ExperienceCategory,
    ExperienceSchedule,
    ExperienceRequirement,
    ExperienceImage,
    ExperienceTranslation
)

# Booking and reservation models
from .booking import (
    Booking,
    BookingPayment,
    BookingModification,
    BookingCancellation,
    ExperienceBooking,
    PaymentTransaction
)

# Review and rating models
from .review import (
    Review,
    ReviewImage,
    ReviewHelpful,
    ReviewTranslation
)

# Social features models
from .social import (
    Wishlist,
    WishlistItem,
    UserSocialProfile,
    SocialPost,
    PostLike,
    PostComment,
    UserFollow,
    TravelGroup,
    TravelGroupMember,
    ActivityFeed,
    Notification
)

# Content management and media models
from .content import (
    MediaFile,
    ContentTemplate,
    ContentVersion,
    ContentModeration,
    Translation,
    ContentAnalytics,
    SearchIndex,
    ContentRecommendation
)

# AI features and admin models
from .ai_admin import (
    AIConversation,
    AIMessage,
    UserPreferenceLearning,
    SmartRecommendation,
    SystemSetting,
    AdminAuditLog,
    UserBehaviorAnalytics,
    FeatureUsage,
    SystemHealth
)

__all__ = [
    # Base models
    "BaseModel",
    "TimestampMixin",
    "SoftDeleteMixin",
    "AuditMixin",
    "MetadataMixin",
    "GeolocationMixin",
    "RatingMixin",
    "SearchableMixin",
    "CommonIndexes",
    
    # User models
    "User",
    "UserProfile",
    "UserAuth",
    "UserSession",
    "UserSocialConnection",
    "UserPreferences",
    "UserOnboarding",
    "TravelHistory",
    "TravelStats",
    "UserAchievement",
    "UserBadge",
    
    # Property models
    "Property",
    "PropertyAmenity",
    "PropertyImage",
    "PropertyPricing",
    "PropertyAvailability",
    "PropertyCalendar",
    "PropertyRule",
    
    # POI models
    "POI",
    "POICategory",
    "POIImage",
    "POIAudioGuide",
    "POIARExperience",
    "POITranslation",
    "POIOpeningHours",
    
    # Experience models
    "Experience",
    "ExperienceCategory",
    "ExperienceSchedule",
    "ExperienceRequirement",
    "ExperienceImage",
    "ExperienceTranslation",
    
    # Booking models
    "Booking",
    "BookingPayment",
    "BookingModification",
    "BookingCancellation",
    "ExperienceBooking",
    "PaymentTransaction",
    
    # Review models
    "Review",
    "ReviewImage",
    "ReviewHelpful",
    "ReviewTranslation",
    
    # Social models
    "Wishlist",
    "WishlistItem",
    "UserSocialProfile",
    "SocialPost",
    "PostLike",
    "PostComment",
    "UserFollow",
    "TravelGroup",
    "TravelGroupMember",
    "ActivityFeed",
    "Notification",
    
    # Content models
    "MediaFile",
    "ContentTemplate",
    "ContentVersion",
    "ContentModeration",
    "Translation",
    "ContentAnalytics",
    "SearchIndex",
    "ContentRecommendation",
    
    # AI and Admin models
    "AIConversation",
    "AIMessage",
    "UserPreferenceLearning",
    "SmartRecommendation",
    "SystemSetting",
    "AdminAuditLog",
    "UserBehaviorAnalytics",
    "FeatureUsage",
    "SystemHealth",
]