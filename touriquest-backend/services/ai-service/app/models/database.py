"""
SQLAlchemy database models for the AI service.
"""
from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean, Column, DateTime, Float, Integer, JSON, String, Text, 
    ForeignKey, Index, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

Base = declarative_base()


class TimestampMixin:
    """Mixin for timestamp fields."""
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Conversation(Base, TimestampMixin):
    """Conversation database model."""
    __tablename__ = "conversations"
    
    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(PostgresUUID(as_uuid=True), nullable=False, index=True)
    title = Column(String(200))
    status = Column(String(20), default="active", nullable=False)
    language = Column(String(5), default="en", nullable=False)
    context = Column(JSON)
    message_count = Column(Integer, default=0, nullable=False)
    last_message_at = Column(DateTime(timezone=True))
    
    # Relationships
    messages = relationship("ChatMessage", back_populates="conversation", cascade="all, delete-orphan")
    analytics = relationship("ConversationAnalytics", back_populates="conversation", uselist=False)
    
    # Indexes
    __table_args__ = (
        Index("idx_conversations_user_status", "user_id", "status"),
        Index("idx_conversations_last_message", "last_message_at"),
    )


class ChatMessage(Base, TimestampMixin):
    """Chat message database model."""
    __tablename__ = "chat_messages"
    
    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)
    conversation_id = Column(PostgresUUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(PostgresUUID(as_uuid=True), nullable=False, index=True)
    content = Column(Text, nullable=False)
    message_type = Column(String(20), default="text", nullable=False)
    intent = Column(String(50))
    confidence = Column(Float)
    metadata = Column(JSON)
    is_from_ai = Column(Boolean, default=False, nullable=False)
    
    # Relationships
    conversation = relationship("Conversation", back_populates="messages")
    
    # Indexes
    __table_args__ = (
        Index("idx_chat_messages_conversation", "conversation_id", "created_at"),
        Index("idx_chat_messages_user", "user_id", "created_at"),
        Index("idx_chat_messages_intent", "intent"),
    )


class VoiceTranscription(Base, TimestampMixin):
    """Voice transcription database model."""
    __tablename__ = "voice_transcriptions"
    
    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(PostgresUUID(as_uuid=True), nullable=False, index=True)
    conversation_id = Column(PostgresUUID(as_uuid=True), ForeignKey("conversations.id", ondelete="SET NULL"))
    audio_file_url = Column(String(500), nullable=False)
    transcription = Column(Text, nullable=False)
    language = Column(String(5))
    confidence = Column(Float)
    duration = Column(Float)  # in seconds
    
    # Indexes
    __table_args__ = (
        Index("idx_voice_transcriptions_user", "user_id", "created_at"),
    )


class VoiceSynthesis(Base, TimestampMixin):
    """Voice synthesis database model."""
    __tablename__ = "voice_synthesis"
    
    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(PostgresUUID(as_uuid=True), nullable=False, index=True)
    conversation_id = Column(PostgresUUID(as_uuid=True), ForeignKey("conversations.id", ondelete="SET NULL"))
    text = Column(Text, nullable=False)
    language = Column(String(5), default="en", nullable=False)
    voice_gender = Column(String(10), default="female", nullable=False)
    speech_rate = Column(Float, default=1.0, nullable=False)
    audio_file_url = Column(String(500))
    
    # Indexes
    __table_args__ = (
        Index("idx_voice_synthesis_user", "user_id", "created_at"),
    )


class AIPreferences(Base, TimestampMixin):
    """AI preferences database model."""
    __tablename__ = "ai_preferences"
    
    user_id = Column(PostgresUUID(as_uuid=True), primary_key=True)
    language = Column(String(5), default="en", nullable=False)
    voice_gender = Column(String(10), default="female", nullable=False)
    speech_rate = Column(Float, default=1.0, nullable=False)
    response_style = Column(String(20), default="friendly", nullable=False)
    max_response_length = Column(Integer, default=500, nullable=False)
    include_suggestions = Column(Boolean, default=True, nullable=False)
    enable_voice = Column(Boolean, default=True, nullable=False)
    enable_notifications = Column(Boolean, default=True, nullable=False)
    travel_preferences = Column(JSON)


class UserContext(Base, TimestampMixin):
    """User context database model."""
    __tablename__ = "user_contexts"
    
    user_id = Column(PostgresUUID(as_uuid=True), primary_key=True)
    current_location = Column(JSON)
    travel_history = Column(JSON)
    preferences = Column(JSON)
    recent_searches = Column(JSON)
    current_bookings = Column(JSON)
    interests = Column(JSON)
    budget_range = Column(JSON)
    travel_companions = Column(Integer)
    session_id = Column(String(100))
    
    # Indexes
    __table_args__ = (
        Index("idx_user_contexts_session", "session_id"),
    )


class ConversationAnalytics(Base, TimestampMixin):
    """Conversation analytics database model."""
    __tablename__ = "conversation_analytics"
    
    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)
    conversation_id = Column(PostgresUUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), unique=True, nullable=False)
    user_id = Column(PostgresUUID(as_uuid=True), nullable=False, index=True)
    total_messages = Column(Integer, default=0, nullable=False)
    ai_messages = Column(Integer, default=0, nullable=False)
    user_messages = Column(Integer, default=0, nullable=False)
    average_response_time = Column(Float)  # in seconds
    sentiment_score = Column(Float)  # -1.0 to 1.0
    satisfaction_rating = Column(Integer)  # 1 to 5
    intent_distribution = Column(JSON)
    language_switches = Column(Integer, default=0, nullable=False)
    voice_messages = Column(Integer, default=0, nullable=False)
    action_executions = Column(Integer, default=0, nullable=False)
    
    # Relationships
    conversation = relationship("Conversation", back_populates="analytics")
    
    # Indexes
    __table_args__ = (
        Index("idx_conversation_analytics_user", "user_id", "created_at"),
    )


class FunctionCall(Base, TimestampMixin):
    """Function call database model."""
    __tablename__ = "function_calls"
    
    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)
    conversation_id = Column(PostgresUUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(PostgresUUID(as_uuid=True), nullable=False, index=True)
    function_name = Column(String(100), nullable=False)
    parameters = Column(JSON, nullable=False)
    result = Column(JSON)
    success = Column(Boolean, default=False, nullable=False)
    error_message = Column(Text)
    execution_time = Column(Float)  # in seconds
    
    # Indexes
    __table_args__ = (
        Index("idx_function_calls_conversation", "conversation_id", "created_at"),
        Index("idx_function_calls_function", "function_name", "success"),
    )


class AISuggestion(Base, TimestampMixin):
    """AI suggestion database model."""
    __tablename__ = "ai_suggestions"
    
    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(PostgresUUID(as_uuid=True), nullable=False, index=True)
    suggestion_type = Column(String(50), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    data = Column(JSON)
    priority = Column(Integer, default=1, nullable=False)
    expires_at = Column(DateTime(timezone=True))
    used = Column(Boolean, default=False, nullable=False)
    
    # Indexes
    __table_args__ = (
        Index("idx_ai_suggestions_user_type", "user_id", "suggestion_type"),
        Index("idx_ai_suggestions_expires", "expires_at"),
        Index("idx_ai_suggestions_priority", "priority", "used"),
    )


class ConversationEmbedding(Base, TimestampMixin):
    """Conversation embedding for semantic search."""
    __tablename__ = "conversation_embeddings"
    
    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid4)
    conversation_id = Column(PostgresUUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    message_id = Column(PostgresUUID(as_uuid=True), ForeignKey("chat_messages.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(PostgresUUID(as_uuid=True), nullable=False, index=True)
    embedding = Column(JSON, nullable=False)  # Store as JSON array
    text_chunk = Column(Text, nullable=False)
    chunk_index = Column(Integer, default=0, nullable=False)
    
    # Indexes
    __table_args__ = (
        Index("idx_conversation_embeddings_conversation", "conversation_id"),
        Index("idx_conversation_embeddings_user", "user_id"),
        UniqueConstraint("message_id", "chunk_index"),
    )