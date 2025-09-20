"""
AI Features and Admin Models

This module contains SQLAlchemy models for AI features and administrative functionality including:
- AI conversation history and chat assistants
- Smart recommendations and personalization
- System configuration and feature flags
- Admin audit logs and system monitoring
- User behavior analytics
"""

from datetime import datetime
from typing import Optional, List, Any, Dict
from sqlalchemy import (
    String, Integer, DateTime, Boolean, Text, Enum, UUID, 
    ForeignKey, Table, UniqueConstraint, Index, CheckConstraint,
    ARRAY, JSON, BigInteger, Float
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID, JSONB
import uuid
import enum

from .base import BaseModel, TimestampMixin, SoftDeleteMixin, MetadataMixin, AuditMixin


class ConversationRole(enum.Enum):
    """AI conversation participant roles"""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"
    FUNCTION = "function"


class ConversationType(enum.Enum):
    """Types of AI conversations"""
    CHAT = "chat"
    RECOMMENDATION = "recommendation"
    PLANNING = "planning"
    SUPPORT = "support"
    BOOKING_ASSISTANCE = "booking_assistance"
    LOCAL_GUIDE = "local_guide"


class RecommendationCategory(enum.Enum):
    """Categories for AI recommendations"""
    PROPERTIES = "properties"
    EXPERIENCES = "experiences"
    RESTAURANTS = "restaurants"
    ATTRACTIONS = "attractions"
    ITINERARY = "itinerary"
    TRAVEL_TIPS = "travel_tips"
    WEATHER = "weather"
    BUDGET = "budget"


class SystemSettingType(enum.Enum):
    """Types of system settings"""
    FEATURE_FLAG = "feature_flag"
    CONFIGURATION = "configuration"
    LIMITS = "limits"
    PRICING = "pricing"
    INTEGRATION = "integration"
    SECURITY = "security"
    MAINTENANCE = "maintenance"


class AdminActionType(enum.Enum):
    """Types of admin actions"""
    USER_MANAGEMENT = "user_management"
    CONTENT_MODERATION = "content_moderation"
    SYSTEM_CONFIG = "system_config"
    DATA_EXPORT = "data_export"
    SECURITY_ACTION = "security_action"
    MAINTENANCE = "maintenance"
    BILLING = "billing"
    ANALYTICS = "analytics"


class UserBehaviorType(enum.Enum):
    """Types of user behaviors to track"""
    PAGE_VIEW = "page_view"
    SEARCH = "search"
    CLICK = "click"
    BOOKING_START = "booking_start"
    BOOKING_COMPLETE = "booking_complete"
    WISHLIST_ADD = "wishlist_add"
    REVIEW_SUBMIT = "review_submit"
    SHARE = "share"
    FILTER_APPLY = "filter_apply"
    SORT_CHANGE = "sort_change"
    SESSION_START = "session_start"
    SESSION_END = "session_end"


class AIConversation(BaseModel, TimestampMixin, SoftDeleteMixin):
    """AI conversation sessions"""
    __tablename__ = "ai_conversations"

    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE")
    )
    session_id: Mapped[str] = mapped_column(String(100), nullable=False)
    conversation_type: Mapped[ConversationType] = mapped_column(
        Enum(ConversationType), default=ConversationType.CHAT
    )
    title: Mapped[Optional[str]] = mapped_column(String(200))
    language: Mapped[str] = mapped_column(String(10), default="en")
    context: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB)  # User context, preferences
    total_messages: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_activity: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    user_satisfaction: Mapped[Optional[int]] = mapped_column(Integer)  # 1-5 rating
    feedback: Mapped[Optional[str]] = mapped_column(Text)
    ai_model_version: Mapped[str] = mapped_column(String(50), default="1.0")
    cost_cents: Mapped[int] = mapped_column(Integer, default=0)  # API cost tracking

    # Relationships
    user: Mapped[Optional["User"]] = relationship("User")
    messages: Mapped[List["AIMessage"]] = relationship(
        "AIMessage", back_populates="conversation", cascade="all, delete-orphan"
    )

    # Constraints and Indexes
    __table_args__ = (
        Index("ix_conversation_user", "user_id"),
        Index("ix_conversation_session", "session_id"),
        Index("ix_conversation_type", "conversation_type"),
        Index("ix_conversation_active", "is_active"),
        Index("ix_conversation_activity", "last_activity"),
        CheckConstraint("user_satisfaction IS NULL OR (user_satisfaction >= 1 AND user_satisfaction <= 5)",
                       name="ck_conversation_satisfaction"),
    )


class AIMessage(BaseModel, TimestampMixin):
    """Individual messages in AI conversations"""
    __tablename__ = "ai_messages"

    conversation_id: Mapped[uuid.UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("ai_conversations.id", ondelete="CASCADE"),
        nullable=False
    )
    role: Mapped[ConversationRole] = mapped_column(Enum(ConversationRole), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    message_order: Mapped[int] = mapped_column(Integer, nullable=False)
    function_name: Mapped[Optional[str]] = mapped_column(String(100))
    function_args: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB)
    function_result: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB)
    metadata: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB)  # AI model metadata
    tokens_used: Mapped[Optional[int]] = mapped_column(Integer)
    processing_time_ms: Mapped[Optional[int]] = mapped_column(Integer)
    is_helpful: Mapped[Optional[bool]] = mapped_column(Boolean)
    user_feedback: Mapped[Optional[str]] = mapped_column(Text)

    # Relationships
    conversation: Mapped["AIConversation"] = relationship("AIConversation", back_populates="messages")

    # Constraints and Indexes
    __table_args__ = (
        Index("ix_message_conversation_order", "conversation_id", "message_order"),
        Index("ix_message_role", "role"),
        Index("ix_message_created", "created_at"),
        UniqueConstraint("conversation_id", "message_order", name="uq_message_order"),
    )


class UserPreferenceLearning(BaseModel, TimestampMixin):
    """Machine learning model for user preferences"""
    __tablename__ = "user_preference_learning"

    user_id: Mapped[uuid.UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    preference_type: Mapped[str] = mapped_column(String(50), nullable=False)  # accommodation, activity, cuisine
    feature_name: Mapped[str] = mapped_column(String(100), nullable=False)  # price_range, location_type, etc.
    preference_value: Mapped[str] = mapped_column(String(200), nullable=False)
    confidence_score: Mapped[float] = mapped_column(Float, nullable=False)  # 0-1 scale
    evidence_count: Mapped[int] = mapped_column(Integer, default=1)
    last_evidence: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    model_version: Mapped[str] = mapped_column(String(50), default="1.0")
    is_explicit: Mapped[bool] = mapped_column(Boolean, default=False)  # User explicitly stated vs inferred

    # Relationships
    user: Mapped["User"] = relationship("User")

    # Constraints and Indexes
    __table_args__ = (
        UniqueConstraint("user_id", "preference_type", "feature_name", name="uq_user_preference"),
        Index("ix_preference_user", "user_id"),
        Index("ix_preference_type", "preference_type"),
        Index("ix_preference_confidence", "confidence_score"),
        Index("ix_preference_explicit", "is_explicit"),
        CheckConstraint("confidence_score >= 0 AND confidence_score <= 1", name="ck_preference_confidence"),
    )


class SmartRecommendation(BaseModel, TimestampMixin):
    """AI-generated smart recommendations"""
    __tablename__ = "smart_recommendations"

    user_id: Mapped[uuid.UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    category: Mapped[RecommendationCategory] = mapped_column(
        Enum(RecommendationCategory), nullable=False
    )
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[uuid.UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    reasoning: Mapped[str] = mapped_column(Text, nullable=False)  # Why this was recommended
    confidence_score: Mapped[float] = mapped_column(Float, nullable=False)
    personalization_factors: Mapped[Dict[str, Any]] = mapped_column(JSONB, nullable=False)
    algorithm_version: Mapped[str] = mapped_column(String(50), nullable=False)
    context_data: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB)
    priority_score: Mapped[float] = mapped_column(Float, default=0.5)
    is_viewed: Mapped[bool] = mapped_column(Boolean, default=False)
    viewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    is_clicked: Mapped[bool] = mapped_column(Boolean, default=False)
    clicked_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    is_dismissed: Mapped[bool] = mapped_column(Boolean, default=False)
    dismissed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    # Relationships
    user: Mapped["User"] = relationship("User")

    # Constraints and Indexes
    __table_args__ = (
        Index("ix_recommendation_user_category", "user_id", "category"),
        Index("ix_recommendation_entity", "entity_type", "entity_id"),
        Index("ix_recommendation_priority", "priority_score"),
        Index("ix_recommendation_expires", "expires_at"),
        Index("ix_recommendation_clicked", "is_clicked"),
        CheckConstraint("confidence_score >= 0 AND confidence_score <= 1", name="ck_recommendation_confidence"),
        CheckConstraint("priority_score >= 0 AND priority_score <= 1", name="ck_recommendation_priority"),
    )


class SystemSetting(BaseModel, TimestampMixin, AuditMixin):
    """System configuration and feature flags"""
    __tablename__ = "system_settings"

    key: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    value: Mapped[str] = mapped_column(Text, nullable=False)
    setting_type: Mapped[SystemSettingType] = mapped_column(
        Enum(SystemSettingType), nullable=False
    )
    description: Mapped[Optional[str]] = mapped_column(Text)
    environment: Mapped[str] = mapped_column(String(20), default="production")  # dev, staging, production
    is_encrypted: Mapped[bool] = mapped_column(Boolean, default=False)
    is_sensitive: Mapped[bool] = mapped_column(Boolean, default=False)
    validation_rules: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB)
    last_modified_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL")
    )
    version: Mapped[int] = mapped_column(Integer, default=1)

    # Relationships
    last_modified_by: Mapped[Optional["User"]] = relationship("User")

    # Constraints and Indexes
    __table_args__ = (
        Index("ix_setting_type", "setting_type"),
        Index("ix_setting_environment", "environment"),
        Index("ix_setting_sensitive", "is_sensitive"),
    )

    def get_value_as_dict(self) -> Dict[str, Any]:
        """Parse value as JSON dictionary"""
        import json
        try:
            return json.loads(self.value)
        except (json.JSONDecodeError, TypeError):
            return {}

    def get_value_as_bool(self) -> bool:
        """Parse value as boolean"""
        return self.value.lower() in ('true', '1', 'yes', 'on', 'enabled')


class AdminAuditLog(BaseModel, TimestampMixin):
    """Admin action audit trail"""
    __tablename__ = "admin_audit_logs"

    admin_user_id: Mapped[uuid.UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    action_type: Mapped[AdminActionType] = mapped_column(Enum(AdminActionType), nullable=False)
    target_type: Mapped[Optional[str]] = mapped_column(String(50))  # user, property, booking, etc.
    target_id: Mapped[Optional[uuid.UUID]] = mapped_column(PostgreSQLUUID(as_uuid=True))
    action_description: Mapped[str] = mapped_column(String(500), nullable=False)
    changes_made: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45))
    user_agent: Mapped[Optional[str]] = mapped_column(String(500))
    request_id: Mapped[Optional[str]] = mapped_column(String(100))
    severity: Mapped[str] = mapped_column(String(20), default="info")  # info, warning, error, critical
    success: Mapped[bool] = mapped_column(Boolean, default=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text)

    # Relationships
    admin_user: Mapped["User"] = relationship("User")

    # Constraints and Indexes
    __table_args__ = (
        Index("ix_audit_admin_created", "admin_user_id", "created_at"),
        Index("ix_audit_action_type", "action_type"),
        Index("ix_audit_target", "target_type", "target_id"),
        Index("ix_audit_severity", "severity"),
        Index("ix_audit_success", "success"),
    )


class UserBehaviorAnalytics(BaseModel, TimestampMixin):
    """User behavior tracking for analytics"""
    __tablename__ = "user_behavior_analytics"

    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL")
    )
    session_id: Mapped[str] = mapped_column(String(100), nullable=False)
    behavior_type: Mapped[UserBehaviorType] = mapped_column(
        Enum(UserBehaviorType), nullable=False
    )
    page_url: Mapped[Optional[str]] = mapped_column(String(500))
    entity_type: Mapped[Optional[str]] = mapped_column(String(50))
    entity_id: Mapped[Optional[uuid.UUID]] = mapped_column(PostgreSQLUUID(as_uuid=True))
    event_data: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    duration_ms: Mapped[Optional[int]] = mapped_column(Integer)  # Time spent on page/action
    device_type: Mapped[Optional[str]] = mapped_column(String(50))
    browser: Mapped[Optional[str]] = mapped_column(String(50))
    operating_system: Mapped[Optional[str]] = mapped_column(String(50))
    screen_resolution: Mapped[Optional[str]] = mapped_column(String(20))
    country_code: Mapped[Optional[str]] = mapped_column(String(3))
    city: Mapped[Optional[str]] = mapped_column(String(100))
    referrer: Mapped[Optional[str]] = mapped_column(String(500))
    utm_source: Mapped[Optional[str]] = mapped_column(String(100))
    utm_medium: Mapped[Optional[str]] = mapped_column(String(100))
    utm_campaign: Mapped[Optional[str]] = mapped_column(String(100))

    # Relationships
    user: Mapped[Optional["User"]] = relationship("User")

    # Constraints and Indexes
    __table_args__ = (
        Index("ix_behavior_user_timestamp", "user_id", "timestamp"),
        Index("ix_behavior_session", "session_id"),
        Index("ix_behavior_type", "behavior_type"),
        Index("ix_behavior_entity", "entity_type", "entity_id"),
        Index("ix_behavior_timestamp", "timestamp"),
        Index("ix_behavior_country", "country_code"),
        Index("ix_behavior_utm", "utm_source", "utm_medium", "utm_campaign"),
    )


class FeatureUsage(BaseModel, TimestampMixin):
    """Feature usage tracking and analytics"""
    __tablename__ = "feature_usage"

    feature_name: Mapped[str] = mapped_column(String(100), nullable=False)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL")
    )
    session_id: Mapped[Optional[str]] = mapped_column(String(100))
    usage_count: Mapped[int] = mapped_column(Integer, default=1)
    usage_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    feature_version: Mapped[Optional[str]] = mapped_column(String(20))
    context_data: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB)
    success: Mapped[bool] = mapped_column(Boolean, default=True)
    error_details: Mapped[Optional[str]] = mapped_column(Text)
    performance_metrics: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB)

    # Relationships
    user: Mapped[Optional["User"]] = relationship("User")

    # Constraints and Indexes
    __table_args__ = (
        Index("ix_feature_usage_feature_date", "feature_name", "usage_date"),
        Index("ix_feature_usage_user", "user_id"),
        Index("ix_feature_usage_session", "session_id"),
        Index("ix_feature_usage_success", "success"),
    )


class SystemHealth(BaseModel, TimestampMixin):
    """System health monitoring"""
    __tablename__ = "system_health"

    service_name: Mapped[str] = mapped_column(String(100), nullable=False)
    metric_name: Mapped[str] = mapped_column(String(100), nullable=False)
    metric_value: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[Optional[str]] = mapped_column(String(20))  # ms, mb, percent, count
    status: Mapped[str] = mapped_column(String(20), default="healthy")  # healthy, warning, critical
    threshold_warning: Mapped[Optional[float]] = mapped_column(Float)
    threshold_critical: Mapped[Optional[float]] = mapped_column(Float)
    environment: Mapped[str] = mapped_column(String(20), default="production")
    region: Mapped[Optional[str]] = mapped_column(String(50))
    additional_data: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB)

    # Constraints and Indexes
    __table_args__ = (
        Index("ix_health_service_created", "service_name", "created_at"),
        Index("ix_health_metric", "metric_name"),
        Index("ix_health_status", "status"),
        Index("ix_health_environment", "environment"),
    )