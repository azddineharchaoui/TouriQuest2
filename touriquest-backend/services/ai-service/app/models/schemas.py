"""
AI service models and schemas.
"""
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Union
from uuid import UUID, uuid4

from pydantic import BaseModel, Field, ConfigDict


class MessageType(str, Enum):
    """Message types for conversation."""
    TEXT = "text"
    VOICE = "voice"
    IMAGE = "image"
    ACTION = "action"
    SYSTEM = "system"


class ConversationStatus(str, Enum):
    """Conversation status types."""
    ACTIVE = "active"
    ARCHIVED = "archived"
    DELETED = "deleted"


class IntentType(str, Enum):
    """Intent types for message classification."""
    PROPERTY_SEARCH = "property_search"
    BOOKING_INQUIRY = "booking_inquiry"
    POI_DISCOVERY = "poi_discovery"
    EXPERIENCE_BOOKING = "experience_booking"
    WEATHER_INQUIRY = "weather_inquiry"
    TRAVEL_ADVICE = "travel_advice"
    PRICE_COMPARISON = "price_comparison"
    ITINERARY_PLANNING = "itinerary_planning"
    GENERAL_CHAT = "general_chat"
    COMPLAINT = "complaint"
    SUPPORT = "support"


class VoiceGender(str, Enum):
    """Voice gender options for TTS."""
    MALE = "male"
    FEMALE = "female"
    NEUTRAL = "neutral"


class Language(str, Enum):
    """Supported languages."""
    ENGLISH = "en"
    SPANISH = "es"
    FRENCH = "fr"
    GERMAN = "de"
    ITALIAN = "it"
    PORTUGUESE = "pt"
    ARABIC = "ar"
    CHINESE = "zh"
    JAPANESE = "ja"
    KOREAN = "ko"


# Base Models
class BaseSchema(BaseModel):
    """Base schema with common configuration."""
    model_config = ConfigDict(
        from_attributes=True,
        validate_assignment=True,
        arbitrary_types_allowed=True,
        str_strip_whitespace=True
    )


# Chat Models
class ChatMessage(BaseSchema):
    """Chat message model."""
    id: UUID = Field(default_factory=uuid4)
    conversation_id: UUID
    user_id: UUID
    content: str = Field(..., min_length=1, max_length=4000)
    message_type: MessageType = MessageType.TEXT
    intent: Optional[IntentType] = None
    confidence: Optional[float] = Field(None, ge=0.0, le=1.0)
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None


class ChatMessageCreate(BaseSchema):
    """Schema for creating a chat message."""
    content: str = Field(..., min_length=1, max_length=4000)
    message_type: MessageType = MessageType.TEXT
    metadata: Optional[Dict[str, Any]] = None


class ChatMessageResponse(BaseSchema):
    """AI response to a chat message."""
    id: UUID = Field(default_factory=uuid4)
    conversation_id: UUID
    content: str
    message_type: MessageType = MessageType.TEXT
    intent: Optional[IntentType] = None
    confidence: Optional[float] = None
    suggestions: Optional[List[str]] = None
    actions: Optional[List[Dict[str, Any]]] = None
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Conversation(BaseSchema):
    """Conversation model."""
    id: UUID = Field(default_factory=uuid4)
    user_id: UUID
    title: Optional[str] = None
    status: ConversationStatus = ConversationStatus.ACTIVE
    language: Language = Language.ENGLISH
    context: Optional[Dict[str, Any]] = None
    message_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    last_message_at: Optional[datetime] = None


class ConversationCreate(BaseSchema):
    """Schema for creating a conversation."""
    title: Optional[str] = Field(None, max_length=200)
    language: Language = Language.ENGLISH
    context: Optional[Dict[str, Any]] = None


class ConversationWithMessages(Conversation):
    """Conversation with its messages."""
    messages: List[Union[ChatMessage, ChatMessageResponse]] = []


# Voice Models
class VoiceTranscription(BaseSchema):
    """Voice transcription model."""
    id: UUID = Field(default_factory=uuid4)
    user_id: UUID
    audio_file_url: str
    transcription: str
    language: Optional[Language] = None
    confidence: Optional[float] = Field(None, ge=0.0, le=1.0)
    duration: Optional[float] = None  # in seconds
    created_at: datetime = Field(default_factory=datetime.utcnow)


class VoiceTranscriptionRequest(BaseSchema):
    """Request for voice transcription."""
    language: Optional[Language] = None
    enhance_audio: bool = False


class VoiceSynthesis(BaseSchema):
    """Voice synthesis model."""
    id: UUID = Field(default_factory=uuid4)
    user_id: UUID
    text: str = Field(..., min_length=1, max_length=2000)
    language: Language = Language.ENGLISH
    voice_gender: VoiceGender = VoiceGender.FEMALE
    speech_rate: float = Field(default=1.0, ge=0.5, le=2.0)
    audio_file_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class VoiceSynthesisRequest(BaseSchema):
    """Request for voice synthesis."""
    text: str = Field(..., min_length=1, max_length=2000)
    language: Language = Language.ENGLISH
    voice_gender: VoiceGender = VoiceGender.FEMALE
    speech_rate: float = Field(default=1.0, ge=0.5, le=2.0)
    slow: bool = False


# AI Preferences
class AIPreferences(BaseSchema):
    """User AI preferences."""
    user_id: UUID
    language: Language = Language.ENGLISH
    voice_gender: VoiceGender = VoiceGender.FEMALE
    speech_rate: float = Field(default=1.0, ge=0.5, le=2.0)
    response_style: str = Field(default="friendly", regex="^(formal|friendly|casual|professional)$")
    max_response_length: int = Field(default=500, ge=50, le=2000)
    include_suggestions: bool = True
    enable_voice: bool = True
    enable_notifications: bool = True
    travel_preferences: Optional[Dict[str, Any]] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class AIPreferencesUpdate(BaseSchema):
    """Schema for updating AI preferences."""
    language: Optional[Language] = None
    voice_gender: Optional[VoiceGender] = None
    speech_rate: Optional[float] = Field(None, ge=0.5, le=2.0)
    response_style: Optional[str] = Field(None, regex="^(formal|friendly|casual|professional)$")
    max_response_length: Optional[int] = Field(None, ge=50, le=2000)
    include_suggestions: Optional[bool] = None
    enable_voice: Optional[bool] = None
    enable_notifications: Optional[bool] = None
    travel_preferences: Optional[Dict[str, Any]] = None


# Context and Analytics
class UserContext(BaseSchema):
    """User context for personalized responses."""
    user_id: UUID
    current_location: Optional[Dict[str, Any]] = None
    travel_history: Optional[List[Dict[str, Any]]] = None
    preferences: Optional[Dict[str, Any]] = None
    recent_searches: Optional[List[Dict[str, Any]]] = None
    current_bookings: Optional[List[Dict[str, Any]]] = None
    interests: Optional[List[str]] = None
    budget_range: Optional[Dict[str, Union[int, float]]] = None
    travel_companions: Optional[int] = None
    session_id: Optional[str] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ConversationAnalytics(BaseSchema):
    """Conversation analytics model."""
    conversation_id: UUID
    user_id: UUID
    total_messages: int
    ai_messages: int
    user_messages: int
    average_response_time: Optional[float] = None  # in seconds
    sentiment_score: Optional[float] = Field(None, ge=-1.0, le=1.0)
    satisfaction_rating: Optional[int] = Field(None, ge=1, le=5)
    intent_distribution: Optional[Dict[str, int]] = None
    language_switches: int = 0
    voice_messages: int = 0
    action_executions: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)


# Function Calling
class FunctionCall(BaseSchema):
    """Function call model for AI actions."""
    id: UUID = Field(default_factory=uuid4)
    conversation_id: UUID
    function_name: str
    parameters: Dict[str, Any]
    result: Optional[Dict[str, Any]] = None
    success: bool = False
    error_message: Optional[str] = None
    execution_time: Optional[float] = None  # in seconds
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ActionExecution(BaseSchema):
    """Action execution request."""
    action_type: str = Field(..., regex="^(search_properties|book_experience|get_weather|plan_itinerary|compare_prices)$")
    parameters: Dict[str, Any]
    user_context: Optional[Dict[str, Any]] = None


class ActionResult(BaseSchema):
    """Action execution result."""
    action_type: str
    success: bool
    result: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    suggestions: Optional[List[str]] = None
    execution_time: float


# Suggestion Models
class AISuggestion(BaseSchema):
    """AI suggestion model."""
    id: UUID = Field(default_factory=uuid4)
    user_id: UUID
    suggestion_type: str
    title: str = Field(..., max_length=200)
    description: str = Field(..., max_length=1000)
    data: Optional[Dict[str, Any]] = None
    priority: int = Field(default=1, ge=1, le=5)
    expires_at: Optional[datetime] = None
    used: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)


class SuggestionRequest(BaseSchema):
    """Request for AI suggestions."""
    suggestion_types: Optional[List[str]] = None
    limit: int = Field(default=5, ge=1, le=20)
    include_expired: bool = False


# WebSocket Models
class WebSocketMessage(BaseSchema):
    """WebSocket message model."""
    type: str = Field(..., regex="^(chat|typing|join|leave|error|notification)$")
    data: Dict[str, Any]
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class TypingIndicator(BaseSchema):
    """Typing indicator for real-time chat."""
    user_id: UUID
    conversation_id: UUID
    is_typing: bool
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# Response Models
class StandardResponse(BaseSchema):
    """Standard API response model."""
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ErrorResponse(BaseSchema):
    """Error response model."""
    success: bool = False
    error_code: str
    error_message: str
    details: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)