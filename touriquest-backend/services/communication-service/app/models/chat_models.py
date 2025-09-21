"""
Database models for the communication service
"""

from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Boolean, ForeignKey, 
    JSON, LargeBinary, Enum, Float, Index, UniqueConstraint, CheckConstraint
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, Session
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.sql import func
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import uuid
import enum


Base = declarative_base()


class MessageType(str, enum.Enum):
    """Message types"""
    TEXT = "text"
    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"
    VOICE = "voice"
    FILE = "file"
    LOCATION = "location"
    SYSTEM = "system"
    TEMPLATE = "template"
    REACTION = "reaction"
    REPLY = "reply"
    FORWARD = "forward"


class ConversationType(str, enum.Enum):
    """Conversation types"""
    DIRECT = "direct"
    GROUP = "group"
    BROADCAST = "broadcast"
    SUPPORT = "support"
    AI_ASSISTANT = "ai_assistant"


class MessageStatus(str, enum.Enum):
    """Message delivery status"""
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"
    FAILED = "failed"
    DELETED = "deleted"


class UserStatus(str, enum.Enum):
    """User online status"""
    ONLINE = "online"
    OFFLINE = "offline"
    AWAY = "away"
    BUSY = "busy"
    INVISIBLE = "invisible"


class ReportReason(str, enum.Enum):
    """Report reasons"""
    SPAM = "spam"
    HARASSMENT = "harassment"
    INAPPROPRIATE_CONTENT = "inappropriate_content"
    FAKE_PROFILE = "fake_profile"
    SCAM = "scam"
    VIOLENCE = "violence"
    HATE_SPEECH = "hate_speech"
    OTHER = "other"


class ModerationAction(str, enum.Enum):
    """Moderation actions"""
    NO_ACTION = "no_action"
    WARNING = "warning"
    CONTENT_REMOVED = "content_removed"
    USER_MUTED = "user_muted"
    USER_BANNED = "user_banned"
    ESCALATED = "escalated"


class NotificationType(str, enum.Enum):
    """Notification types"""
    NEW_MESSAGE = "new_message"
    MENTION = "mention"
    GROUP_INVITE = "group_invite"
    BOOKING_UPDATE = "booking_update"
    PRICE_CHANGE = "price_change"
    SYSTEM_ALERT = "system_alert"
    FRIEND_REQUEST = "friend_request"
    EMERGENCY = "emergency"


# Association table for conversation participants
conversation_participants = Column(
    'conversation_participants',
    Base.metadata,
    Column('conversation_id', UUID(as_uuid=True), ForeignKey('conversations.id'), primary_key=True),
    Column('user_id', UUID(as_uuid=True), primary_key=True),
    Column('joined_at', DateTime(timezone=True), server_default=func.now()),
    Column('left_at', DateTime(timezone=True), nullable=True),
    Column('role', String(50), default='member'),  # member, admin, moderator
    Column('permissions', JSON, default={}),
    Column('is_active', Boolean, default=True),
    Index('idx_conversation_participants_user', 'user_id'),
    Index('idx_conversation_participants_active', 'is_active')
)


class Conversation(Base):
    """Conversation model for chat rooms, groups, and direct messages"""
    __tablename__ = "conversations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    type = Column(Enum(ConversationType), nullable=False, default=ConversationType.DIRECT)
    name = Column(String(255), nullable=True)  # Group name or auto-generated for direct
    description = Column(Text, nullable=True)
    avatar_url = Column(String(500), nullable=True)
    
    # Creator and admin info
    created_by = Column(UUID(as_uuid=True), nullable=False)
    admin_ids = Column(ARRAY(UUID(as_uuid=True)), default=[])
    
    # Group settings
    is_public = Column(Boolean, default=False)
    max_members = Column(Integer, default=100)
    allow_member_invites = Column(Boolean, default=True)
    require_approval = Column(Boolean, default=False)
    
    # Metadata
    settings = Column(JSON, default={})
    metadata = Column(JSON, default={})
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_activity_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Archive and deletion
    is_archived = Column(Boolean, default=False)
    archived_at = Column(DateTime(timezone=True), nullable=True)
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")
    participants = relationship("User", secondary=conversation_participants, back_populates="conversations")
    
    # Indexes
    __table_args__ = (
        Index('idx_conversation_type', 'type'),
        Index('idx_conversation_created_by', 'created_by'),
        Index('idx_conversation_last_activity', 'last_activity_at'),
        Index('idx_conversation_active', 'is_deleted', 'is_archived'),
    )


class Message(Base):
    """Message model for all types of chat messages"""
    __tablename__ = "messages"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey('conversations.id'), nullable=False)
    sender_id = Column(UUID(as_uuid=True), nullable=False)
    
    # Message content
    type = Column(Enum(MessageType), nullable=False, default=MessageType.TEXT)
    content = Column(Text, nullable=True)  # Text content or JSON for structured messages
    encrypted_content = Column(LargeBinary, nullable=True)  # Encrypted message content
    
    # Rich content
    attachments = Column(JSON, default=[])  # List of file attachments
    mentions = Column(ARRAY(UUID(as_uuid=True)), default=[])  # Mentioned user IDs
    reactions = Column(JSON, default={})  # Emoji reactions {emoji: [user_ids]}
    
    # Reply and threading
    reply_to_id = Column(UUID(as_uuid=True), ForeignKey('messages.id'), nullable=True)
    thread_id = Column(UUID(as_uuid=True), nullable=True)  # For message threading
    forward_from_id = Column(UUID(as_uuid=True), ForeignKey('messages.id'), nullable=True)
    
    # Message metadata
    metadata = Column(JSON, default={})  # Additional message data
    language = Column(String(10), nullable=True)  # Detected language
    translated_content = Column(JSON, default={})  # Translations {lang: content}
    
    # Delivery tracking
    status = Column(Enum(MessageStatus), default=MessageStatus.PENDING)
    delivery_attempts = Column(Integer, default=0)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    scheduled_at = Column(DateTime(timezone=True), nullable=True)  # For scheduled messages
    expires_at = Column(DateTime(timezone=True), nullable=True)  # For disappearing messages
    
    # Moderation
    is_flagged = Column(Boolean, default=False)
    is_moderated = Column(Boolean, default=False)
    moderation_score = Column(Float, nullable=True)  # AI moderation confidence
    
    # Deletion and editing
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    deleted_by = Column(UUID(as_uuid=True), nullable=True)
    edit_history = Column(JSON, default=[])  # History of edits
    
    # Relationships
    conversation = relationship("Conversation", back_populates="messages")
    reply_to = relationship("Message", remote_side=[id], backref="replies")
    forward_from = relationship("Message", remote_side=[id], backref="forwards")
    
    # Indexes
    __table_args__ = (
        Index('idx_message_conversation', 'conversation_id'),
        Index('idx_message_sender', 'sender_id'),
        Index('idx_message_created_at', 'created_at'),
        Index('idx_message_type', 'type'),
        Index('idx_message_status', 'status'),
        Index('idx_message_thread', 'thread_id'),
        Index('idx_message_scheduled', 'scheduled_at'),
        Index('idx_message_flagged', 'is_flagged'),
        Index('idx_message_search', 'conversation_id', 'created_at', 'is_deleted'),
    )


class MessageRead(Base):
    """Message read receipts"""
    __tablename__ = "message_reads"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_id = Column(UUID(as_uuid=True), ForeignKey('messages.id'), nullable=False)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey('conversations.id'), nullable=False)
    
    read_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Unique constraint to prevent duplicate reads
    __table_args__ = (
        UniqueConstraint('message_id', 'user_id', name='uq_message_read_user'),
        Index('idx_message_read_conversation', 'conversation_id'),
        Index('idx_message_read_user', 'user_id'),
    )


class TypingIndicator(Base):
    """Typing indicators for real-time chat"""
    __tablename__ = "typing_indicators"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey('conversations.id'), nullable=False)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)
    
    # Unique constraint for one typing indicator per user per conversation
    __table_args__ = (
        UniqueConstraint('conversation_id', 'user_id', name='uq_typing_user_conversation'),
        Index('idx_typing_expires', 'expires_at'),
    )


class UserConnection(Base):
    """WebSocket connections for users"""
    __tablename__ = "user_connections"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    connection_id = Column(String(255), nullable=False, unique=True)
    
    # Connection details
    device_id = Column(String(255), nullable=True)
    device_type = Column(String(50), nullable=True)  # mobile, desktop, tablet
    platform = Column(String(50), nullable=True)  # ios, android, web
    app_version = Column(String(50), nullable=True)
    
    # Network info
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    
    # Status
    status = Column(Enum(UserStatus), default=UserStatus.ONLINE)
    last_seen_at = Column(DateTime(timezone=True), server_default=func.now())
    last_activity_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Connection lifecycle
    connected_at = Column(DateTime(timezone=True), server_default=func.now())
    disconnected_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)
    
    # Indexes
    __table_args__ = (
        Index('idx_user_connection_user', 'user_id'),
        Index('idx_user_connection_active', 'is_active'),
        Index('idx_user_connection_status', 'status'),
    )


class MessageTemplate(Base):
    """Predefined message templates"""
    __tablename__ = "message_templates"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    
    name = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    category = Column(String(100), nullable=True)
    language = Column(String(10), default='en')
    
    # Usage tracking
    usage_count = Column(Integer, default=0)
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Indexes
    __table_args__ = (
        Index('idx_template_user', 'user_id'),
        Index('idx_template_category', 'category'),
    )


class ScheduledMessage(Base):
    """Messages scheduled for future delivery"""
    __tablename__ = "scheduled_messages"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey('conversations.id'), nullable=False)
    sender_id = Column(UUID(as_uuid=True), nullable=False)
    
    # Message content (similar to Message model)
    type = Column(Enum(MessageType), nullable=False, default=MessageType.TEXT)
    content = Column(Text, nullable=True)
    attachments = Column(JSON, default=[])
    metadata = Column(JSON, default={})
    
    # Scheduling
    scheduled_for = Column(DateTime(timezone=True), nullable=False)
    timezone = Column(String(50), nullable=True)
    
    # Status
    is_sent = Column(Boolean, default=False)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    is_cancelled = Column(Boolean, default=False)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)
    
    # Error handling
    failure_reason = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Indexes
    __table_args__ = (
        Index('idx_scheduled_message_conversation', 'conversation_id'),
        Index('idx_scheduled_message_sender', 'sender_id'),
        Index('idx_scheduled_message_delivery', 'scheduled_for', 'is_sent', 'is_cancelled'),
    )


class BlockedUser(Base):
    """User blocking relationships"""
    __tablename__ = "blocked_users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    blocker_id = Column(UUID(as_uuid=True), nullable=False)
    blocked_id = Column(UUID(as_uuid=True), nullable=False)
    
    reason = Column(String(500), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('blocker_id', 'blocked_id', name='uq_block_relationship'),
        Index('idx_blocked_user_blocker', 'blocker_id'),
        Index('idx_blocked_user_blocked', 'blocked_id'),
        CheckConstraint('blocker_id != blocked_id', name='ck_no_self_block'),
    )


class MessageReport(Base):
    """Message and user reports"""
    __tablename__ = "message_reports"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reporter_id = Column(UUID(as_uuid=True), nullable=False)
    reported_user_id = Column(UUID(as_uuid=True), nullable=True)
    message_id = Column(UUID(as_uuid=True), ForeignKey('messages.id'), nullable=True)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey('conversations.id'), nullable=True)
    
    reason = Column(Enum(ReportReason), nullable=False)
    description = Column(Text, nullable=True)
    evidence = Column(JSON, default={})  # Screenshots, additional context
    
    # Moderation
    status = Column(String(50), default='pending')  # pending, reviewing, resolved, dismissed
    reviewed_by = Column(UUID(as_uuid=True), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    action_taken = Column(Enum(ModerationAction), nullable=True)
    moderator_notes = Column(Text, nullable=True)
    
    # Resolution
    is_resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolution_notes = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Indexes
    __table_args__ = (
        Index('idx_report_reporter', 'reporter_id'),
        Index('idx_report_reported_user', 'reported_user_id'),
        Index('idx_report_message', 'message_id'),
        Index('idx_report_status', 'status'),
        Index('idx_report_created', 'created_at'),
    )


class Notification(Base):
    """Real-time notifications"""
    __tablename__ = "notifications"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    
    type = Column(Enum(NotificationType), nullable=False)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=True)
    
    # Related entities
    related_id = Column(UUID(as_uuid=True), nullable=True)  # Message, conversation, booking, etc.
    related_type = Column(String(50), nullable=True)  # message, conversation, booking, etc.
    
    # Notification data
    data = Column(JSON, default={})  # Additional notification payload
    
    # Delivery
    is_read = Column(Boolean, default=False)
    read_at = Column(DateTime(timezone=True), nullable=True)
    is_delivered = Column(Boolean, default=False)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    
    # Push notification
    push_sent = Column(Boolean, default=False)
    push_sent_at = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)
    
    # Indexes
    __table_args__ = (
        Index('idx_notification_user', 'user_id'),
        Index('idx_notification_type', 'type'),
        Index('idx_notification_read', 'is_read'),
        Index('idx_notification_created', 'created_at'),
        Index('idx_notification_expires', 'expires_at'),
    )


class EmergencyContact(Base):
    """Emergency contacts for users"""
    __tablename__ = "emergency_contacts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    
    name = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=False)
    email = Column(String(255), nullable=True)
    relationship = Column(String(100), nullable=True)
    
    # Priority and activation
    priority = Column(Integer, default=1)  # 1 = highest priority
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Indexes
    __table_args__ = (
        Index('idx_emergency_contact_user', 'user_id'),
        Index('idx_emergency_contact_priority', 'priority'),
    )


class EmergencyAlert(Base):
    """Emergency alerts triggered by users"""
    __tablename__ = "emergency_alerts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    
    # Alert details
    alert_type = Column(String(50), nullable=False)  # panic, medical, safety, etc.
    message = Column(Text, nullable=True)
    location = Column(JSON, nullable=True)  # GPS coordinates, address
    
    # Status
    status = Column(String(50), default='active')  # active, resolved, false_alarm
    is_resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolved_by = Column(UUID(as_uuid=True), nullable=True)
    
    # Response tracking
    contacts_notified = Column(JSON, default=[])  # List of notified contacts
    authorities_notified = Column(Boolean, default=False)
    response_notes = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Indexes
    __table_args__ = (
        Index('idx_emergency_alert_user', 'user_id'),
        Index('idx_emergency_alert_status', 'status'),
        Index('idx_emergency_alert_created', 'created_at'),
    )


class ChatAnalytics(Base):
    """Analytics data for chat usage"""
    __tablename__ = "chat_analytics"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=True)  # Nullable for aggregate stats
    conversation_id = Column(UUID(as_uuid=True), nullable=True)
    
    # Metrics
    metric_name = Column(String(100), nullable=False)
    metric_value = Column(Float, nullable=False)
    metric_data = Column(JSON, default={})  # Additional metric details
    
    # Time dimensions
    date = Column(DateTime(timezone=True), nullable=False)
    hour = Column(Integer, nullable=True)
    day_of_week = Column(Integer, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Indexes
    __table_args__ = (
        Index('idx_analytics_user', 'user_id'),
        Index('idx_analytics_conversation', 'conversation_id'),
        Index('idx_analytics_metric', 'metric_name'),
        Index('idx_analytics_date', 'date'),
    )


# User model placeholder (should be imported from user service or shared models)
class User(Base):
    """User model placeholder for relationships"""
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), nullable=False, unique=True)
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    
    # Communication preferences
    allow_direct_messages = Column(Boolean, default=True)
    allow_group_invites = Column(Boolean, default=True)
    notification_preferences = Column(JSON, default={})
    
    # Status
    is_active = Column(Boolean, default=True)
    last_seen_at = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    conversations = relationship("Conversation", secondary=conversation_participants, back_populates="participants")


# Add any additional utility functions for the models
def get_conversation_participants_count(conversation_id: str, session: Session) -> int:
    """Get the number of active participants in a conversation"""
    return session.query(conversation_participants).filter(
        conversation_participants.c.conversation_id == conversation_id,
        conversation_participants.c.is_active == True
    ).count()


def get_unread_message_count(user_id: str, conversation_id: str, session: Session) -> int:
    """Get the number of unread messages for a user in a conversation"""
    # Get the last read message for this user in this conversation
    last_read = session.query(MessageRead).filter(
        MessageRead.user_id == user_id,
        MessageRead.conversation_id == conversation_id
    ).order_by(MessageRead.read_at.desc()).first()
    
    if not last_read:
        # If user has never read any message, count all messages
        return session.query(Message).filter(
            Message.conversation_id == conversation_id,
            Message.sender_id != user_id,
            Message.is_deleted == False
        ).count()
    
    # Count messages sent after the last read message
    return session.query(Message).filter(
        Message.conversation_id == conversation_id,
        Message.sender_id != user_id,
        Message.created_at > last_read.read_at,
        Message.is_deleted == False
    ).count()


def is_user_blocked(blocker_id: str, blocked_id: str, session: Session) -> bool:
    """Check if a user is blocked by another user"""
    return session.query(BlockedUser).filter(
        BlockedUser.blocker_id == blocker_id,
        BlockedUser.blocked_id == blocked_id
    ).first() is not None