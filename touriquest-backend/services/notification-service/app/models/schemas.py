"""
Comprehensive data models for the notification service.
"""
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
from enum import Enum
from uuid import UUID
from pydantic import BaseModel, Field, EmailStr, validator
import json


class NotificationType(str, Enum):
    """Types of notifications supported by the system."""
    BOOKING_CONFIRMATION = "booking_confirmation"
    BOOKING_UPDATE = "booking_update"
    BOOKING_REMINDER = "booking_reminder"
    PRICE_DROP_ALERT = "price_drop_alert"
    TRAVEL_REMINDER = "travel_reminder"
    CHECK_IN_REMINDER = "check_in_reminder"
    SOCIAL_ACTIVITY = "social_activity"
    PERSONALIZED_RECOMMENDATION = "personalized_recommendation"
    SAFETY_ALERT = "safety_alert"
    WEATHER_ALERT = "weather_alert"
    ITINERARY_UPDATE = "itinerary_update"
    REVIEW_REQUEST = "review_request"
    PAYMENT_CONFIRMATION = "payment_confirmation"
    SYSTEM_ANNOUNCEMENT = "system_announcement"
    PROMOTIONAL = "promotional"


class DeliveryChannel(str, Enum):
    """Available delivery channels for notifications."""
    EMAIL = "email"
    PUSH = "push"
    SMS = "sms"
    IN_APP = "in_app"
    BROWSER = "browser"
    WEBHOOK = "webhook"


class NotificationPriority(str, Enum):
    """Priority levels for notifications."""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class NotificationStatus(str, Enum):
    """Status of notification delivery."""
    PENDING = "pending"
    QUEUED = "queued"
    SENT = "sent"
    DELIVERED = "delivered"
    FAILED = "failed"
    CANCELLED = "cancelled"
    READ = "read"
    CLICKED = "clicked"
    UNSUBSCRIBED = "unsubscribed"


class TimingStrategy(str, Enum):
    """Timing optimization strategies."""
    IMMEDIATE = "immediate"
    OPTIMAL = "optimal"
    BUSINESS_HOURS = "business_hours"
    USER_ACTIVE_HOURS = "user_active_hours"
    SCHEDULED = "scheduled"


class FrequencyType(str, Enum):
    """Frequency capping types."""
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    PER_CAMPAIGN = "per_campaign"
    GLOBAL = "global"


class PersonalizationContext(BaseModel):
    """Context for personalizing notifications."""
    user_timezone: Optional[str] = None
    user_language: str = "en"
    user_preferences: Dict[str, Any] = Field(default_factory=dict)
    travel_history: List[Dict[str, Any]] = Field(default_factory=list)
    booking_history: List[Dict[str, Any]] = Field(default_factory=list)
    device_info: Dict[str, str] = Field(default_factory=dict)
    location: Optional[Dict[str, float]] = None
    user_behavior: Dict[str, Any] = Field(default_factory=dict)


class NotificationPreferences(BaseModel):
    """User notification preferences."""
    user_id: UUID
    enabled_channels: List[DeliveryChannel] = Field(default_factory=lambda: [
        DeliveryChannel.EMAIL, DeliveryChannel.IN_APP
    ])
    disabled_types: List[NotificationType] = Field(default_factory=list)
    quiet_hours_start: Optional[str] = "22:00"  # Format: "HH:MM"
    quiet_hours_end: Optional[str] = "08:00"
    timezone: str = "UTC"
    frequency_caps: Dict[FrequencyType, int] = Field(default_factory=lambda: {
        FrequencyType.DAILY: 10,
        FrequencyType.WEEKLY: 50,
        FrequencyType.MONTHLY: 200
    })
    email_preferences: Dict[str, bool] = Field(default_factory=lambda: {
        "marketing": True,
        "transactional": True,
        "reminders": True,
        "social": False
    })
    push_preferences: Dict[str, bool] = Field(default_factory=lambda: {
        "booking_updates": True,
        "travel_reminders": True,
        "price_alerts": True,
        "social": False
    })
    language: str = "en"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class NotificationTemplate(BaseModel):
    """Template for notifications."""
    id: Optional[UUID] = None
    name: str
    notification_type: NotificationType
    channel: DeliveryChannel
    language: str = "en"
    subject_template: str
    body_template: str
    html_template: Optional[str] = None
    variables: List[str] = Field(default_factory=list)  # Required template variables
    metadata: Dict[str, Any] = Field(default_factory=dict)
    is_active: bool = True
    version: int = 1
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    @validator('variables')
    def validate_variables(cls, v, values):
        """Validate that required variables are present in templates."""
        subject = values.get('subject_template', '')
        body = values.get('body_template', '')
        html = values.get('html_template', '')
        
        # Extract variables from templates (simple {variable} format)
        import re
        all_text = f"{subject} {body} {html}"
        template_vars = set(re.findall(r'\{(\w+)\}', all_text))
        
        # Check if all declared variables are used
        declared_vars = set(v)
        if not declared_vars.issubset(template_vars):
            unused = declared_vars - template_vars
            raise ValueError(f"Declared variables not used in template: {unused}")
        
        return list(template_vars)

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class NotificationContent(BaseModel):
    """Content for a notification."""
    subject: str
    body: str
    html_body: Optional[str] = None
    action_url: Optional[str] = None
    action_text: Optional[str] = None
    image_url: Optional[str] = None
    attachments: List[Dict[str, str]] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class NotificationRequest(BaseModel):
    """Request to send a notification."""
    user_id: UUID
    notification_type: NotificationType
    content: NotificationContent
    channels: List[DeliveryChannel] = Field(default_factory=list)
    priority: NotificationPriority = NotificationPriority.NORMAL
    timing_strategy: TimingStrategy = TimingStrategy.OPTIMAL
    scheduled_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    context: PersonalizationContext = Field(default_factory=PersonalizationContext)
    campaign_id: Optional[str] = None
    template_id: Optional[UUID] = None
    template_variables: Dict[str, Any] = Field(default_factory=dict)
    tracking_data: Dict[str, Any] = Field(default_factory=dict)

    @validator('scheduled_at')
    def validate_scheduled_time(cls, v):
        """Validate scheduled time is in the future."""
        if v and v <= datetime.utcnow():
            raise ValueError("Scheduled time must be in the future")
        return v

    @validator('expires_at')
    def validate_expiry_time(cls, v, values):
        """Validate expiry time is after scheduled time."""
        scheduled = values.get('scheduled_at')
        if v and scheduled and v <= scheduled:
            raise ValueError("Expiry time must be after scheduled time")
        return v

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class Notification(BaseModel):
    """Notification entity."""
    id: Optional[UUID] = None
    user_id: UUID
    notification_type: NotificationType
    content: NotificationContent
    channels: List[DeliveryChannel]
    priority: NotificationPriority
    status: NotificationStatus = NotificationStatus.PENDING
    timing_strategy: TimingStrategy
    scheduled_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    read_at: Optional[datetime] = None
    clicked_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    context: PersonalizationContext
    campaign_id: Optional[str] = None
    template_id: Optional[UUID] = None
    template_variables: Dict[str, Any] = Field(default_factory=dict)
    tracking_data: Dict[str, Any] = Field(default_factory=dict)
    delivery_attempts: int = 0
    last_error: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class DeliveryResult(BaseModel):
    """Result of notification delivery attempt."""
    notification_id: UUID
    channel: DeliveryChannel
    status: NotificationStatus
    external_id: Optional[str] = None  # ID from external service (e.g., email provider)
    error_message: Optional[str] = None
    delivered_at: Optional[datetime] = None
    tracking_info: Dict[str, Any] = Field(default_factory=dict)

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class NotificationGroup(BaseModel):
    """Group of related notifications for bundling."""
    id: Optional[UUID] = None
    user_id: UUID
    group_type: str  # e.g., "daily_digest", "trip_updates"
    notifications: List[UUID]
    bundled_content: NotificationContent
    delivery_channel: DeliveryChannel
    scheduled_at: datetime
    sent_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class NotificationAnalytics(BaseModel):
    """Analytics data for notifications."""
    notification_id: UUID
    user_id: UUID
    notification_type: NotificationType
    channel: DeliveryChannel
    status: NotificationStatus
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    opened_at: Optional[datetime] = None
    clicked_at: Optional[datetime] = None
    unsubscribed_at: Optional[datetime] = None
    device_info: Dict[str, str] = Field(default_factory=dict)
    location_info: Dict[str, Any] = Field(default_factory=dict)
    campaign_id: Optional[str] = None
    ab_test_variant: Optional[str] = None

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class UserBehaviorData(BaseModel):
    """User behavior data for ML optimization."""
    user_id: UUID
    active_hours: List[int] = Field(default_factory=list)  # Hours when user is active (0-23)
    timezone: str = "UTC"
    preferred_channels: List[DeliveryChannel] = Field(default_factory=list)
    engagement_rates: Dict[str, float] = Field(default_factory=dict)  # Channel -> engagement rate
    response_times: Dict[str, float] = Field(default_factory=dict)  # Channel -> avg response time
    last_active: Optional[datetime] = None
    device_preferences: Dict[str, str] = Field(default_factory=dict)
    interaction_patterns: Dict[str, Any] = Field(default_factory=dict)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class UnsubscribeRequest(BaseModel):
    """Request to unsubscribe from notifications."""
    user_id: UUID
    notification_types: List[NotificationType] = Field(default_factory=list)
    channels: List[DeliveryChannel] = Field(default_factory=list)
    reason: Optional[str] = None
    feedback: Optional[str] = None
    global_unsubscribe: bool = False

    @validator('notification_types', 'channels')
    def validate_not_empty_if_not_global(cls, v, values):
        """Ensure specific types/channels are provided if not global unsubscribe."""
        if not values.get('global_unsubscribe', False) and not v:
            raise ValueError("Must specify notification types or channels if not global unsubscribe")
        return v


class ConsentRecord(BaseModel):
    """GDPR consent record."""
    user_id: UUID
    consent_type: str  # e.g., "marketing", "transactional", "analytics"
    granted: bool
    granted_at: datetime
    withdrawn_at: Optional[datetime] = None
    legal_basis: str  # e.g., "consent", "legitimate_interest", "contract"
    purpose: str  # Description of processing purpose
    data_retention_period: Optional[int] = None  # Days
    source: str = "user_action"  # How consent was obtained
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class DataExportRequest(BaseModel):
    """Request for user data export (GDPR compliance)."""
    user_id: UUID
    request_type: str = "full_export"  # "full_export", "notifications_only"
    format: str = "json"  # "json", "csv", "xml"
    include_deleted: bool = False
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    requested_at: datetime = Field(default_factory=datetime.utcnow)
    processed_at: Optional[datetime] = None
    download_url: Optional[str] = None
    expires_at: Optional[datetime] = None

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class NotificationCampaign(BaseModel):
    """Marketing or informational campaign."""
    id: Optional[UUID] = None
    name: str
    description: Optional[str] = None
    notification_type: NotificationType
    template_id: UUID
    target_criteria: Dict[str, Any] = Field(default_factory=dict)  # User targeting criteria
    scheduled_at: datetime
    expires_at: Optional[datetime] = None
    max_recipients: Optional[int] = None
    frequency_cap: Dict[FrequencyType, int] = Field(default_factory=dict)
    ab_test_config: Optional[Dict[str, Any]] = None
    status: str = "draft"  # "draft", "scheduled", "running", "paused", "completed", "cancelled"
    created_by: UUID
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class TimingOptimizationModel(BaseModel):
    """ML model data for timing optimization."""
    user_id: UUID
    optimal_send_times: Dict[str, List[int]] = Field(default_factory=dict)  # Channel -> hours
    engagement_predictions: Dict[str, float] = Field(default_factory=dict)  # Channel -> probability
    response_time_predictions: Dict[str, float] = Field(default_factory=dict)  # Channel -> minutes
    last_updated: datetime = Field(default_factory=datetime.utcnow)
    model_version: str = "1.0"
    confidence_scores: Dict[str, float] = Field(default_factory=dict)

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class NotificationQueue(BaseModel):
    """Queue item for processing notifications."""
    id: Optional[UUID] = None
    notification_id: UUID
    user_id: UUID
    priority: NotificationPriority
    scheduled_at: datetime
    attempts: int = 0
    max_attempts: int = 3
    last_attempted_at: Optional[datetime] = None
    next_attempt_at: Optional[datetime] = None
    error_message: Optional[str] = None
    status: str = "pending"  # "pending", "processing", "completed", "failed", "cancelled"
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }