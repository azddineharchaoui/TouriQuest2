"""
TouriQuest Database Models Package
Comprehensive SQLAlchemy models for the tourism platform
"""

from .base import BaseModel, TimestampMixin, SoftDeleteMixin
from .user import (
    User, UserProfile, UserAuth, UserSession, UserSocialConnection,
    UserPreferences, UserOnboarding, TravelHistory, TravelStats,
    UserAchievement, UserBadge
)
from .property import (
    Property, PropertyAmenity, PropertyImage, PropertyPricing,
    PropertyAvailability, PropertyCalendar, PropertyRule
)
from .poi import (
    POI, POICategory, POIImage, POIAudioGuide, POIARExperience,
    POITranslation, POIOpeningHours
)
from .experience import (
    Experience, ExperienceCategory, ExperienceSchedule,
    ExperienceRequirement, ExperienceImage, ExperienceTranslation
)
from .booking import (
    Booking, BookingPayment, BookingModification, BookingCancellation,
    ExperienceBooking, PaymentTransaction
)
from .review import (
    Review, ReviewImage, ReviewHelpful, ReviewTranslation
)
from .ai import (
    AIConversation, AIMessage, AIRecommendation, UserInteraction,
    PersonalizationData
)
from .media import (
    MediaFile, MediaMetadata, MediaTranscription, MediaTag
)
from .notification import (
    Notification, NotificationTemplate, NotificationPreference,
    NotificationDelivery
)
from .social import (
    Wishlist, WishlistItem, UserFollowing, SocialPost,
    SocialComment, SocialLike
)
from .content import (
    ContentTranslation, ContentModeration, ContentFlag,
    ContentTag, ContentCategory
)
from .admin import (
    AdminAction, SystemLog, ModerationQueue, SystemMetric,
    AuditLog, SystemConfiguration
)
from .search import (
    SearchIndex, SearchQuery, SearchResult, SearchAnalytics
)

__all__ = [
    # Base models
    'BaseModel', 'TimestampMixin', 'SoftDeleteMixin',
    
    # User models
    'User', 'UserProfile', 'UserAuth', 'UserSession', 'UserSocialConnection',
    'UserPreferences', 'UserOnboarding', 'TravelHistory', 'TravelStats',
    'UserAchievement', 'UserBadge',
    
    # Property models
    'Property', 'PropertyAmenity', 'PropertyImage', 'PropertyPricing',
    'PropertyAvailability', 'PropertyCalendar', 'PropertyRule',
    
    # POI models
    'POI', 'POICategory', 'POIImage', 'POIAudioGuide', 'POIARExperience',
    'POITranslation', 'POIOpeningHours',
    
    # Experience models
    'Experience', 'ExperienceCategory', 'ExperienceSchedule',
    'ExperienceRequirement', 'ExperienceImage', 'ExperienceTranslation',
    
    # Booking models
    'Booking', 'BookingPayment', 'BookingModification', 'BookingCancellation',
    'ExperienceBooking', 'PaymentTransaction',
    
    # Review models
    'Review', 'ReviewImage', 'ReviewHelpful', 'ReviewTranslation',
    
    # AI models
    'AIConversation', 'AIMessage', 'AIRecommendation', 'UserInteraction',
    'PersonalizationData',
    
    # Media models
    'MediaFile', 'MediaMetadata', 'MediaTranscription', 'MediaTag',
    
    # Notification models
    'Notification', 'NotificationTemplate', 'NotificationPreference',
    'NotificationDelivery',
    
    # Social models
    'Wishlist', 'WishlistItem', 'UserFollowing', 'SocialPost',
    'SocialComment', 'SocialLike',
    
    # Content models
    'ContentTranslation', 'ContentModeration', 'ContentFlag',
    'ContentTag', 'ContentCategory',
    
    # Admin models
    'AdminAction', 'SystemLog', 'ModerationQueue', 'SystemMetric',
    'AuditLog', 'SystemConfiguration',
    
    # Search models
    'SearchIndex', 'SearchQuery', 'SearchResult', 'SearchAnalytics'
]