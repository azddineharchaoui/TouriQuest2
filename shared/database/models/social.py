"""
Social Features Models

This module contains SQLAlchemy models for social features including:
- Wishlists and saved items
- Follow/follower relationships  
- Social content sharing
- Travel groups and companions
- Activity feeds and social interactions
"""

from datetime import datetime
from typing import Optional, List, Any, Dict
from sqlalchemy import (
    String, Integer, DateTime, Boolean, Text, Enum, UUID, 
    ForeignKey, Table, UniqueConstraint, Index, CheckConstraint,
    ARRAY, JSON
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID, JSONB
import uuid
import enum

from .base import BaseModel, TimestampMixin, SoftDeleteMixin, MetadataMixin


class WishlistType(enum.Enum):
    """Types of wishlists"""
    PROPERTIES = "properties"
    EXPERIENCES = "experiences"
    POIS = "pois"
    TRAVEL_PLANS = "travel_plans"
    MIXED = "mixed"


class ShareType(enum.Enum):
    """Types of shared content"""
    PROPERTY = "property"
    EXPERIENCE = "experience"
    POI = "poi"
    REVIEW = "review"
    TRAVEL_PLAN = "travel_plan"
    PHOTO = "photo"
    STORY = "story"


class SocialActionType(enum.Enum):
    """Types of social actions for activity feed"""
    FOLLOW = "follow"
    UNFOLLOW = "unfollow"
    LIKE = "like"
    COMMENT = "comment"
    SHARE = "share"
    REVIEW = "review"
    BOOK = "book"
    VISIT = "visit"
    WISHLIST_ADD = "wishlist_add"
    ACHIEVEMENT = "achievement"
    LEVEL_UP = "level_up"


class PrivacyLevel(enum.Enum):
    """Privacy levels for social content"""
    PUBLIC = "public"
    FRIENDS = "friends"
    FOLLOWERS = "followers"
    PRIVATE = "private"


class GroupType(enum.Enum):
    """Types of travel groups"""
    FAMILY = "family"
    FRIENDS = "friends"
    COUPLES = "couples"
    BUSINESS = "business"
    SOLO_TRAVELERS = "solo_travelers"
    ADVENTURE = "adventure"
    CULTURAL = "cultural"
    RELAXATION = "relaxation"
    CUSTOM = "custom"


class NotificationType(enum.Enum):
    """Types of notifications"""
    BOOKING_CONFIRMATION = "booking_confirmation"
    BOOKING_REMINDER = "booking_reminder"
    BOOKING_CANCELLED = "booking_cancelled"
    PAYMENT_SUCCESS = "payment_success"
    PAYMENT_FAILED = "payment_failed"
    REVIEW_REQUEST = "review_request"
    NEW_FOLLOWER = "new_follower"
    NEW_LIKE = "new_like"
    NEW_COMMENT = "new_comment"
    FRIEND_REQUEST = "friend_request"
    RECOMMENDATION = "recommendation"
    PRICE_DROP = "price_drop"
    AVAILABILITY_ALERT = "availability_alert"
    WEATHER_UPDATE = "weather_update"
    TRAVEL_REMINDER = "travel_reminder"
    SYSTEM_UPDATE = "system_update"
    PROMOTIONAL = "promotional"


class Wishlist(BaseModel, TimestampMixin, SoftDeleteMixin, MetadataMixin):
    """User wishlists and saved items"""
    __tablename__ = "wishlists"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    wishlist_type: Mapped[WishlistType] = mapped_column(
        Enum(WishlistType), nullable=False, default=WishlistType.MIXED
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True), 
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    is_public: Mapped[bool] = mapped_column(Boolean, default=False)
    is_collaborative: Mapped[bool] = mapped_column(Boolean, default=False)
    collaborator_ids: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String))
    item_count: Mapped[int] = mapped_column(Integer, default=0)
    cover_image_url: Mapped[Optional[str]] = mapped_column(String(500))
    tags: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String))
    privacy_level: Mapped[PrivacyLevel] = mapped_column(
        Enum(PrivacyLevel), default=PrivacyLevel.PRIVATE
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="wishlists")
    items: Mapped[List["WishlistItem"]] = relationship(
        "WishlistItem", back_populates="wishlist", cascade="all, delete-orphan"
    )

    # Constraints and Indexes
    __table_args__ = (
        UniqueConstraint("user_id", "name", name="uq_wishlist_user_name"),
        Index("ix_wishlist_user_type", "user_id", "wishlist_type"),
        Index("ix_wishlist_public", "is_public"),
        CheckConstraint("char_length(name) >= 1", name="ck_wishlist_name_length"),
    )

    def add_item(self, item_type: str, item_id: uuid.UUID, notes: Optional[str] = None) -> "WishlistItem":
        """Add an item to the wishlist"""
        from .wishlist_item import WishlistItem
        
        item = WishlistItem(
            wishlist_id=self.id,
            item_type=item_type,
            item_id=item_id,
            notes=notes
        )
        self.items.append(item)
        self.item_count += 1
        return item

    def remove_item(self, item_id: uuid.UUID) -> bool:
        """Remove an item from the wishlist"""
        for item in self.items:
            if item.item_id == item_id:
                self.items.remove(item)
                self.item_count = max(0, self.item_count - 1)
                return True
        return False


class WishlistItem(BaseModel, TimestampMixin):
    """Individual items in a wishlist"""
    __tablename__ = "wishlist_items"

    wishlist_id: Mapped[uuid.UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("wishlists.id", ondelete="CASCADE"),
        nullable=False
    )
    item_type: Mapped[str] = mapped_column(String(50), nullable=False)  # property, experience, poi, etc.
    item_id: Mapped[uuid.UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    priority: Mapped[int] = mapped_column(Integer, default=1)  # 1-5 scale
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    date_added: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    added_by_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL")
    )

    # Relationships
    wishlist: Mapped["Wishlist"] = relationship("Wishlist", back_populates="items")
    added_by: Mapped[Optional["User"]] = relationship("User")

    # Constraints and Indexes
    __table_args__ = (
        UniqueConstraint("wishlist_id", "item_type", "item_id", name="uq_wishlist_item"),
        Index("ix_wishlist_item_type_id", "item_type", "item_id"),
        Index("ix_wishlist_item_sort", "wishlist_id", "sort_order"),
        CheckConstraint("priority >= 1 AND priority <= 5", name="ck_wishlist_priority"),
    )


class UserSocialProfile(BaseModel, TimestampMixin, SoftDeleteMixin, MetadataMixin):
    """Extended social profile for users"""
    __tablename__ = "user_social_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True
    )
    display_name: Mapped[Optional[str]] = mapped_column(String(100))
    bio: Mapped[Optional[str]] = mapped_column(Text)
    website_url: Mapped[Optional[str]] = mapped_column(String(500))
    social_links: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB)
    cover_image_url: Mapped[Optional[str]] = mapped_column(String(500))
    travel_style: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String))  # adventure, luxury, budget, etc.
    interests: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String))
    languages_spoken: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String))
    countries_visited: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String))
    countries_wishlist: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String))
    is_travel_blogger: Mapped[bool] = mapped_column(Boolean, default=False)
    is_local_guide: Mapped[bool] = mapped_column(Boolean, default=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    verification_badge: Mapped[Optional[str]] = mapped_column(String(50))
    follower_count: Mapped[int] = mapped_column(Integer, default=0)
    following_count: Mapped[int] = mapped_column(Integer, default=0)
    post_count: Mapped[int] = mapped_column(Integer, default=0)
    total_likes: Mapped[int] = mapped_column(Integer, default=0)
    privacy_settings: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="social_profile")
    posts: Mapped[List["SocialPost"]] = relationship(
        "SocialPost", back_populates="author", cascade="all, delete-orphan"
    )

    # Constraints and Indexes
    __table_args__ = (
        Index("ix_social_profile_verified", "is_verified"),
        Index("ix_social_profile_guide", "is_local_guide"),
        Index("ix_social_profile_blogger", "is_travel_blogger"),
        Index("ix_social_profile_followers", "follower_count"),
    )


class SocialPost(BaseModel, TimestampMixin, SoftDeleteMixin, MetadataMixin):
    """Social media posts by users"""
    __tablename__ = "social_posts"

    author_id: Mapped[uuid.UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    title: Mapped[Optional[str]] = mapped_column(String(200))
    content: Mapped[str] = mapped_column(Text, nullable=False)
    content_type: Mapped[str] = mapped_column(String(50), default="text")  # text, photo, video, story
    media_urls: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String))
    location_name: Mapped[Optional[str]] = mapped_column(String(200))
    location_coordinates: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB)
    related_entity_type: Mapped[Optional[str]] = mapped_column(String(50))  # property, experience, poi
    related_entity_id: Mapped[Optional[uuid.UUID]] = mapped_column(PostgreSQLUUID(as_uuid=True))
    tags: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String))
    privacy_level: Mapped[PrivacyLevel] = mapped_column(
        Enum(PrivacyLevel), default=PrivacyLevel.PUBLIC
    )
    like_count: Mapped[int] = mapped_column(Integer, default=0)
    comment_count: Mapped[int] = mapped_column(Integer, default=0)
    share_count: Mapped[int] = mapped_column(Integer, default=0)
    view_count: Mapped[int] = mapped_column(Integer, default=0)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)
    featured_until: Mapped[Optional[datetime]] = mapped_column(DateTime)

    # Relationships
    author: Mapped["UserSocialProfile"] = relationship("UserSocialProfile", back_populates="posts")
    likes: Mapped[List["PostLike"]] = relationship(
        "PostLike", back_populates="post", cascade="all, delete-orphan"
    )
    comments: Mapped[List["PostComment"]] = relationship(
        "PostComment", back_populates="post", cascade="all, delete-orphan"
    )

    # Constraints and Indexes
    __table_args__ = (
        Index("ix_social_post_author_created", "author_id", "created_at"),
        Index("ix_social_post_privacy", "privacy_level"),
        Index("ix_social_post_featured", "is_featured", "featured_until"),
        Index("ix_social_post_entity", "related_entity_type", "related_entity_id"),
        Index("ix_social_post_location", "location_name"),
        CheckConstraint("char_length(content) >= 1", name="ck_post_content_length"),
    )


class PostLike(BaseModel, TimestampMixin):
    """Likes on social posts"""
    __tablename__ = "post_likes"

    post_id: Mapped[uuid.UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("social_posts.id", ondelete="CASCADE"),
        nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )

    # Relationships
    post: Mapped["SocialPost"] = relationship("SocialPost", back_populates="likes")
    user: Mapped["User"] = relationship("User")

    # Constraints and Indexes
    __table_args__ = (
        UniqueConstraint("post_id", "user_id", name="uq_post_like"),
        Index("ix_post_like_user", "user_id"),
        Index("ix_post_like_created", "created_at"),
    )


class PostComment(BaseModel, TimestampMixin, SoftDeleteMixin):
    """Comments on social posts"""
    __tablename__ = "post_comments"

    post_id: Mapped[uuid.UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("social_posts.id", ondelete="CASCADE"),
        nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    parent_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("post_comments.id", ondelete="CASCADE")
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    like_count: Mapped[int] = mapped_column(Integer, default=0)
    reply_count: Mapped[int] = mapped_column(Integer, default=0)

    # Relationships
    post: Mapped["SocialPost"] = relationship("SocialPost", back_populates="comments")
    user: Mapped["User"] = relationship("User")
    parent: Mapped[Optional["PostComment"]] = relationship(
        "PostComment", remote_side="PostComment.id"
    )
    replies: Mapped[List["PostComment"]] = relationship(
        "PostComment", cascade="all, delete-orphan"
    )

    # Constraints and Indexes
    __table_args__ = (
        Index("ix_comment_post_created", "post_id", "created_at"),
        Index("ix_comment_user", "user_id"),
        Index("ix_comment_parent", "parent_id"),
        CheckConstraint("char_length(content) >= 1", name="ck_comment_content_length"),
    )


class UserFollow(BaseModel, TimestampMixin):
    """Follow relationships between users"""
    __tablename__ = "user_follows"

    follower_id: Mapped[uuid.UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    following_id: Mapped[uuid.UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    is_mutual: Mapped[bool] = mapped_column(Boolean, default=False)
    notification_enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    follower: Mapped["User"] = relationship(
        "User", foreign_keys=[follower_id], back_populates="following"
    )
    following: Mapped["User"] = relationship(
        "User", foreign_keys=[following_id], back_populates="followers"
    )

    # Constraints and Indexes
    __table_args__ = (
        UniqueConstraint("follower_id", "following_id", name="uq_user_follow"),
        Index("ix_follow_follower", "follower_id"),
        Index("ix_follow_following", "following_id"),
        Index("ix_follow_mutual", "is_mutual"),
        CheckConstraint("follower_id != following_id", name="ck_no_self_follow"),
    )


class TravelGroup(BaseModel, TimestampMixin, SoftDeleteMixin, MetadataMixin):
    """Travel groups and companions"""
    __tablename__ = "travel_groups"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    group_type: Mapped[GroupType] = mapped_column(
        Enum(GroupType), nullable=False, default=GroupType.FRIENDS
    )
    creator_id: Mapped[uuid.UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    member_count: Mapped[int] = mapped_column(Integer, default=1)
    max_members: Mapped[Optional[int]] = mapped_column(Integer)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False)
    join_code: Mapped[Optional[str]] = mapped_column(String(20), unique=True)
    cover_image_url: Mapped[Optional[str]] = mapped_column(String(500))
    tags: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String))
    preferred_destinations: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String))
    budget_range: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB)
    travel_dates: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB)

    # Relationships
    creator: Mapped["User"] = relationship("User", back_populates="created_groups")
    members: Mapped[List["TravelGroupMember"]] = relationship(
        "TravelGroupMember", back_populates="group", cascade="all, delete-orphan"
    )

    # Constraints and Indexes
    __table_args__ = (
        Index("ix_travel_group_creator", "creator_id"),
        Index("ix_travel_group_type", "group_type"),
        Index("ix_travel_group_public", "is_public"),
        CheckConstraint("member_count >= 1", name="ck_group_min_members"),
        CheckConstraint("max_members IS NULL OR max_members >= member_count", name="ck_group_max_members"),
    )


class TravelGroupMember(BaseModel, TimestampMixin):
    """Members of travel groups"""
    __tablename__ = "travel_group_members"

    group_id: Mapped[uuid.UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("travel_groups.id", ondelete="CASCADE"),
        nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    role: Mapped[str] = mapped_column(String(50), default="member")  # admin, moderator, member
    joined_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    invited_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL")
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    group: Mapped["TravelGroup"] = relationship("TravelGroup", back_populates="members")
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])
    invited_by: Mapped[Optional["User"]] = relationship(
        "User", foreign_keys=[invited_by_id]
    )

    # Constraints and Indexes
    __table_args__ = (
        UniqueConstraint("group_id", "user_id", name="uq_group_member"),
        Index("ix_group_member_user", "user_id"),
        Index("ix_group_member_role", "role"),
        Index("ix_group_member_active", "is_active"),
    )


class ActivityFeed(BaseModel, TimestampMixin):
    """User activity feed for social features"""
    __tablename__ = "activity_feed"

    user_id: Mapped[uuid.UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    action_type: Mapped[SocialActionType] = mapped_column(
        Enum(SocialActionType), nullable=False
    )
    target_type: Mapped[str] = mapped_column(String(50), nullable=False)  # user, property, experience, etc.
    target_id: Mapped[uuid.UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), nullable=False)
    target_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE")
    )
    content: Mapped[Optional[str]] = mapped_column(Text)
    metadata: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB)
    privacy_level: Mapped[PrivacyLevel] = mapped_column(
        Enum(PrivacyLevel), default=PrivacyLevel.PUBLIC
    )
    is_aggregated: Mapped[bool] = mapped_column(Boolean, default=False)
    aggregation_key: Mapped[Optional[str]] = mapped_column(String(100))

    # Relationships
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])
    target_user: Mapped[Optional["User"]] = relationship(
        "User", foreign_keys=[target_user_id]
    )

    # Constraints and Indexes
    __table_args__ = (
        Index("ix_activity_user_created", "user_id", "created_at"),
        Index("ix_activity_target", "target_type", "target_id"),
        Index("ix_activity_type", "action_type"),
        Index("ix_activity_privacy", "privacy_level"),
        Index("ix_activity_aggregation", "aggregation_key"),
    )


class Notification(BaseModel, TimestampMixin, SoftDeleteMixin):
    """User notifications"""
    __tablename__ = "notifications"

    user_id: Mapped[uuid.UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    notification_type: Mapped[NotificationType] = mapped_column(
        Enum(NotificationType), nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    related_entity_type: Mapped[Optional[str]] = mapped_column(String(50))
    related_entity_id: Mapped[Optional[uuid.UUID]] = mapped_column(PostgreSQLUUID(as_uuid=True))
    sender_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL")
    )
    data: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    action_url: Mapped[Optional[str]] = mapped_column(String(500))
    priority: Mapped[int] = mapped_column(Integer, default=1)  # 1-5 scale
    scheduled_for: Mapped[Optional[datetime]] = mapped_column(DateTime)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    delivery_method: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String))  # push, email, sms

    # Relationships
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])
    sender: Mapped[Optional["User"]] = relationship("User", foreign_keys=[sender_id])

    # Constraints and Indexes
    __table_args__ = (
        Index("ix_notification_user_read", "user_id", "is_read"),
        Index("ix_notification_type", "notification_type"),
        Index("ix_notification_priority", "priority"),
        Index("ix_notification_scheduled", "scheduled_for"),
        Index("ix_notification_entity", "related_entity_type", "related_entity_id"),
        CheckConstraint("priority >= 1 AND priority <= 5", name="ck_notification_priority"),
    )

    def mark_as_read(self) -> None:
        """Mark notification as read"""
        self.is_read = True
        self.read_at = datetime.utcnow()