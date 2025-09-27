"""
TouriQuest Notification Service
FastAPI microservice for email, SMS, push notifications, and communication
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from shared.database import get_db_session, BaseRepository
from shared.monitoring import MonitoringSetup
from shared.security import SecurityHeaders, RateLimiter, get_current_user
from shared.messaging import MessageProducer
import logging
import uuid
from enum import Enum
import smtplib
from email.mime.text import MimeText
from email.mime.multipart import MimeMultipart

logger = logging.getLogger(__name__)

app = FastAPI(
    title="TouriQuest Notification Service",
    description="Email, SMS, push notifications, and communication microservice",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Monitoring setup
monitoring = MonitoringSetup("notification-service")
app = monitoring.instrument_fastapi(app)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

rate_limiter = RateLimiter()


# Enums
class NotificationTypeEnum(str, Enum):
    EMAIL = "email"
    SMS = "sms"
    PUSH = "push"
    IN_APP = "in_app"


class NotificationStatusEnum(str, Enum):
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    FAILED = "failed"
    READ = "read"


class NotificationPriorityEnum(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class NotificationCategoryEnum(str, Enum):
    BOOKING = "booking"
    MARKETING = "marketing"
    SYSTEM = "system"
    RECOMMENDATION = "recommendation"
    SECURITY = "security"


# Pydantic models
class EmailContent(BaseModel):
    subject: str
    html_body: str
    text_body: Optional[str] = None
    attachments: List[str] = []


class SMSContent(BaseModel):
    message: str


class PushContent(BaseModel):
    title: str
    body: str
    data: Optional[Dict[str, Any]] = None
    icon: Optional[str] = None
    badge: Optional[int] = None


class NotificationRecipient(BaseModel):
    user_id: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    push_token: Optional[str] = None


class NotificationRequest(BaseModel):
    type: NotificationTypeEnum
    category: NotificationCategoryEnum
    priority: NotificationPriorityEnum = NotificationPriorityEnum.NORMAL
    recipients: List[NotificationRecipient]
    content: Dict[str, Any]  # EmailContent, SMSContent, or PushContent
    scheduled_at: Optional[datetime] = None
    template_id: Optional[str] = None
    template_variables: Optional[Dict[str, Any]] = None


class NotificationResponse(BaseModel):
    id: str
    type: NotificationTypeEnum
    category: NotificationCategoryEnum
    priority: NotificationPriorityEnum
    status: NotificationStatusEnum
    recipients_count: int
    sent_count: int = 0
    delivered_count: int = 0
    failed_count: int = 0
    created_at: datetime
    sent_at: Optional[datetime] = None


# Email service
class EmailService:
    """Email service for sending emails."""
    
    def __init__(self, smtp_host: str, smtp_port: int, username: str, password: str):
        self.smtp_host = smtp_host
        self.smtp_port = smtp_port
        self.username = username
        self.password = password
    
    async def send_email(
        self, 
        recipient: str, 
        subject: str, 
        html_body: str, 
        text_body: Optional[str] = None
    ) -> bool:
        """Send email to recipient."""
        try:
            msg = MimeMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = self.username
            msg['To'] = recipient
            
            # Add text and HTML parts
            if text_body:
                text_part = MimeText(text_body, 'plain')
                msg.attach(text_part)
            
            html_part = MimeText(html_body, 'html')
            msg.attach(html_part)
            
            # Send email
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.username, self.password)
                server.send_message(msg)
            
            logger.info(f"Email sent to {recipient}")
            return True
        
        except Exception as e:
            logger.error(f"Email sending failed: {e}")
            return False


# SMS service
class SMSService:
    """SMS service for sending text messages."""
    
    def __init__(self, api_key: str, sender_id: str):
        self.api_key = api_key
        self.sender_id = sender_id
    
    async def send_sms(self, phone: str, message: str) -> bool:
        """Send SMS to phone number."""
        try:
            # Mock SMS sending - integrate with Twilio, AWS SNS, etc.
            logger.info(f"SMS sent to {phone}: {message[:50]}...")
            return True
        except Exception as e:
            logger.error(f"SMS sending failed: {e}")
            return False


# Push notification service
class PushNotificationService:
    """Push notification service."""
    
    def __init__(self, fcm_key: str):
        self.fcm_key = fcm_key
    
    async def send_push(
        self, 
        device_token: str, 
        title: str, 
        body: str, 
        data: Optional[Dict] = None
    ) -> bool:
        """Send push notification."""
        try:
            # Mock push notification - integrate with FCM, APNS, etc.
            logger.info(f"Push notification sent to {device_token[:20]}...")
            return True
        except Exception as e:
            logger.error(f"Push notification failed: {e}")
            return False


# Template service
class TemplateService:
    """Notification template service."""
    
    def __init__(self):
        # Mock templates - in production, store in database
        self.templates = {
            "booking_confirmation": {
                "email": {
                    "subject": "Booking Confirmation - {{booking_reference}}",
                    "html_body": """
                    <h2>Booking Confirmed!</h2>
                    <p>Dear {{guest_name}},</p>
                    <p>Your booking has been confirmed.</p>
                    <p><strong>Booking Reference:</strong> {{booking_reference}}</p>
                    <p><strong>Property:</strong> {{property_name}}</p>
                    <p><strong>Check-in:</strong> {{check_in}}</p>
                    <p><strong>Check-out:</strong> {{check_out}}</p>
                    <p>Thank you for choosing TouriQuest!</p>
                    """
                },
                "sms": {
                    "message": "Booking confirmed! Ref: {{booking_reference}}. Check-in: {{check_in}} at {{property_name}}. TouriQuest"
                }
            },
            "password_reset": {
                "email": {
                    "subject": "Password Reset Request",
                    "html_body": """
                    <h2>Password Reset</h2>
                    <p>Click the link below to reset your password:</p>
                    <a href="{{reset_link}}">Reset Password</a>
                    <p>This link expires in 24 hours.</p>
                    """
                }
            },
            "welcome": {
                "email": {
                    "subject": "Welcome to TouriQuest!",
                    "html_body": """
                    <h2>Welcome to TouriQuest!</h2>
                    <p>Dear {{first_name}},</p>
                    <p>Thank you for joining TouriQuest. We're excited to help you discover amazing experiences in Morocco!</p>
                    <p>Start exploring our recommendations and plan your perfect trip.</p>
                    """
                }
            }
        }
    
    def render_template(
        self, 
        template_id: str, 
        notification_type: str, 
        variables: Dict[str, Any]
    ) -> Optional[Dict[str, str]]:
        """Render template with variables."""
        template = self.templates.get(template_id, {}).get(notification_type)
        if not template:
            return None
        
        rendered = {}
        for key, value in template.items():
            # Simple template rendering
            rendered_value = value
            for var_key, var_value in variables.items():
                rendered_value = rendered_value.replace(f"{{{{{var_key}}}}}", str(var_value))
            rendered[key] = rendered_value
        
        return rendered


# Repository
class NotificationRepository(BaseRepository):
    """Notification repository for database operations."""
    
    async def save_notification(self, notification_data: Dict[str, Any]) -> Dict[str, Any]:
        """Save notification to database."""
        notification = {
            "id": str(uuid.uuid4()),
            "created_at": datetime.utcnow().isoformat(),
            "sent_at": None,
            "sent_count": 0,
            "delivered_count": 0,
            "failed_count": 0,
            **notification_data
        }
        
        logger.info(f"Saved notification: {notification['id']}")
        return notification
    
    async def get_notification_by_id(self, notification_id: str) -> Optional[Dict[str, Any]]:
        """Get notification by ID."""
        return None
    
    async def update_notification_status(
        self, 
        notification_id: str, 
        status: NotificationStatusEnum,
        sent_count: int = 0,
        delivered_count: int = 0,
        failed_count: int = 0
    ) -> bool:
        """Update notification status."""
        logger.info(f"Updated notification {notification_id} status to {status}")
        return True
    
    async def get_user_notifications(
        self, 
        user_id: str, 
        limit: int = 20, 
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Get notifications for user."""
        return []


# Dependencies
email_service = EmailService("smtp.gmail.com", 587, "email@touriquest.com", "password")
sms_service = SMSService("sms-api-key", "TouriQuest")
push_service = PushNotificationService("fcm-key")
template_service = TemplateService()
message_producer = MessageProducer()


def get_notification_repository() -> NotificationRepository:
    """Get notification repository dependency."""
    return NotificationRepository()


# API Routes
@app.post("/api/v1/notifications/send", response_model=NotificationResponse)
async def send_notification(
    notification_request: NotificationRequest,
    current_user: dict = Depends(get_current_user),
    notification_repo: NotificationRepository = Depends(get_notification_repository)
):
    """Send notification to recipients."""
    
    # Rate limiting
    rate_limit_key = f"notification_rate_limit:{current_user['id']}"
    if not await rate_limiter.is_allowed(rate_limit_key, 100, 3600):  # 100 per hour
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Notification sending rate limit exceeded"
        )
    
    # Save notification
    notification_data = {
        "type": notification_request.type,
        "category": notification_request.category,
        "priority": notification_request.priority,
        "status": NotificationStatusEnum.PENDING,
        "recipients_count": len(notification_request.recipients),
        "content": notification_request.content,
        "template_id": notification_request.template_id,
        "template_variables": notification_request.template_variables,
        "scheduled_at": notification_request.scheduled_at,
        "created_by": current_user["id"]
    }
    
    notification = await notification_repo.save_notification(notification_data)
    
    # Queue notification for processing
    await message_producer.publish(
        "notification.send",
        {
            "notification_id": notification["id"],
            "notification_request": notification_request.dict()
        }
    )
    
    return NotificationResponse(**notification)


@app.get("/api/v1/notifications/{notification_id}")
async def get_notification(
    notification_id: str,
    current_user: dict = Depends(get_current_user),
    notification_repo: NotificationRepository = Depends(get_notification_repository)
):
    """Get notification by ID."""
    notification = await notification_repo.get_notification_by_id(notification_id)
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    return notification


@app.get("/api/v1/notifications/user/me")
async def get_my_notifications(
    limit: int = 20,
    offset: int = 0,
    current_user: dict = Depends(get_current_user),
    notification_repo: NotificationRepository = Depends(get_notification_repository)
):
    """Get notifications for current user."""
    notifications = await notification_repo.get_user_notifications(
        current_user["id"], 
        limit, 
        offset
    )
    
    return {"notifications": notifications}


@app.post("/api/v1/notifications/bulk")
async def send_bulk_notification(
    notification_request: NotificationRequest,
    current_user: dict = Depends(get_current_user)
):
    """Send bulk notifications (admin only)."""
    
    # Check admin permissions in production
    # For now, allow any authenticated user
    
    if len(notification_request.recipients) > 1000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bulk notification limited to 1000 recipients"
        )
    
    # Queue for bulk processing
    await message_producer.publish(
        "notification.bulk_send",
        {
            "notification_request": notification_request.dict(),
            "created_by": current_user["id"]
        }
    )
    
    return {"message": f"Bulk notification queued for {len(notification_request.recipients)} recipients"}


@app.get("/api/v1/notifications/templates")
async def get_notification_templates():
    """Get available notification templates."""
    return {"templates": list(template_service.templates.keys())}


# Notification Settings Models
class NotificationSettingsResponse(BaseModel):
    """Response model for notification settings"""
    user_id: str
    email_enabled: bool = True
    push_enabled: bool = True
    sms_enabled: bool = False
    in_app_enabled: bool = True
    booking_notifications: bool = True
    promotion_notifications: bool = False
    security_notifications: bool = True
    system_notifications: bool = True
    recommendation_notifications: bool = True
    quiet_hours_enabled: bool = False
    quiet_hours_start: Optional[str] = None
    quiet_hours_end: Optional[str] = None
    timezone: str = "UTC"
    digest_enabled: bool = False
    digest_frequency: str = "weekly"
    digest_time: str = "09:00"
    smart_filtering: bool = True
    location_based: bool = True
    behavior_based: bool = True
    updated_at: datetime = datetime.utcnow()


class NotificationSettingsUpdateRequest(BaseModel):
    """Request model for updating notification settings"""
    email_enabled: Optional[bool] = None
    push_enabled: Optional[bool] = None
    sms_enabled: Optional[bool] = None
    in_app_enabled: Optional[bool] = None
    booking_notifications: Optional[bool] = None
    promotion_notifications: Optional[bool] = None
    security_notifications: Optional[bool] = None
    system_notifications: Optional[bool] = None
    recommendation_notifications: Optional[bool] = None
    quiet_hours_enabled: Optional[bool] = None
    quiet_hours_start: Optional[str] = None
    quiet_hours_end: Optional[str] = None
    timezone: Optional[str] = None
    digest_enabled: Optional[bool] = None
    digest_frequency: Optional[str] = None
    digest_time: Optional[str] = None
    smart_filtering: Optional[bool] = None
    location_based: Optional[bool] = None
    behavior_based: Optional[bool] = None


# Notification Settings Repository
class NotificationSettingsRepository(BaseRepository):
    """Repository for notification settings"""
    
    async def get_user_settings(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user notification settings"""
        # Mock implementation - replace with actual database query
        return {
            "user_id": user_id,
            "email_enabled": True,
            "push_enabled": True,
            "sms_enabled": False,
            "in_app_enabled": True,
            "booking_notifications": True,
            "promotion_notifications": False,
            "security_notifications": True,
            "system_notifications": True,
            "recommendation_notifications": True,
            "quiet_hours_enabled": False,
            "quiet_hours_start": None,
            "quiet_hours_end": None,
            "timezone": "UTC",
            "digest_enabled": False,
            "digest_frequency": "weekly",
            "digest_time": "09:00",
            "smart_filtering": True,
            "location_based": True,
            "behavior_based": True,
            "updated_at": datetime.utcnow()
        }
    
    async def update_user_settings(self, user_id: str, settings: Dict[str, Any]) -> Dict[str, Any]:
        """Update user notification settings"""
        # Mock implementation - replace with actual database update
        updated_settings = await self.get_user_settings(user_id)
        updated_settings.update(settings)
        updated_settings["updated_at"] = datetime.utcnow()
        return updated_settings


# Dependency for settings repository
async def get_notification_settings_repository() -> NotificationSettingsRepository:
    """Get notification settings repository dependency."""
    return NotificationSettingsRepository()


@app.get("/api/v1/notifications/settings", response_model=NotificationSettingsResponse)
async def get_notification_settings(
    current_user: dict = Depends(get_current_user),
    settings_repo: NotificationSettingsRepository = Depends(get_notification_settings_repository)
):
    """Get user notification settings"""
    try:
        settings = await settings_repo.get_user_settings(current_user["id"])
        return NotificationSettingsResponse(**settings)
    except Exception as e:
        logger.error(f"Error getting notification settings: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve notification settings"
        )


@app.put("/api/v1/notifications/settings", response_model=NotificationSettingsResponse)
async def update_notification_settings(
    settings_data: NotificationSettingsUpdateRequest,
    current_user: dict = Depends(get_current_user),
    settings_repo: NotificationSettingsRepository = Depends(get_notification_settings_repository)
):
    """Update user notification settings"""
    try:
        # Validate timezone if provided
        if settings_data.timezone:
            # Add timezone validation logic here
            pass
        
        # Update settings
        update_dict = settings_data.dict(exclude_unset=True)
        updated_settings = await settings_repo.update_user_settings(
            current_user["id"], update_dict
        )
        
        return NotificationSettingsResponse(**updated_settings)
        
    except Exception as e:
        logger.error(f"Error updating notification settings: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update notification settings"
        )


# Push Notification Subscription Models
class PushSubscriptionRequest(BaseModel):
    """Request model for push notification subscription"""
    endpoint: str
    keys: Dict[str, str]
    device_type: str
    device_name: Optional[str] = None
    user_agent: Optional[str] = None


@app.post("/api/v1/notifications/push/subscribe")
async def subscribe_to_push_notifications(
    subscription_data: PushSubscriptionRequest,
    current_user: dict = Depends(get_current_user)
):
    """Subscribe to push notifications"""
    try:
        # Validate and store push subscription
        subscription_id = str(uuid.uuid4())
        
        # Mock implementation - replace with actual storage
        subscription = {
            "id": subscription_id,
            "user_id": current_user["id"],
            "endpoint": subscription_data.endpoint,
            "keys": subscription_data.keys,
            "device_type": subscription_data.device_type,
            "device_name": subscription_data.device_name,
            "user_agent": subscription_data.user_agent,
            "created_at": datetime.utcnow(),
            "active": True
        }
        
        # Send welcome push notification
        await push_service.send_push(
            subscription_data.endpoint,
            "Welcome to TouriQuest!",
            "You're now subscribed to push notifications.",
            subscription_data.keys
        )
        
        return {
            "message": "Successfully subscribed to push notifications",
            "subscription_id": subscription_id
        }
        
    except Exception as e:
        logger.error(f"Error subscribing to push notifications: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to subscribe to push notifications"
        )


@app.delete("/api/v1/notifications/push/unsubscribe")
async def unsubscribe_from_push_notifications(
    device_endpoint: str,
    current_user: dict = Depends(get_current_user)
):
    """Unsubscribe from push notifications"""
    try:
        # Mock implementation - replace with actual deletion
        # Remove subscription from database
        
        return {"message": "Successfully unsubscribed from push notifications"}
        
    except Exception as e:
        logger.error(f"Error unsubscribing from push notifications: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to unsubscribe from push notifications"
        )


@app.get("/api/v1/notifications/unread-count")
async def get_unread_notification_count(
    current_user: dict = Depends(get_current_user),
    notification_repo: NotificationRepository = Depends(get_notification_repository)
):
    """Get unread notification count"""
    try:
        # Mock implementation - replace with actual query
        unread_count = await notification_repo.get_unread_count(current_user["id"])
        
        return {
            "total_unread": unread_count,
            "by_category": {
                "booking": 3,
                "system": 1,
                "recommendation": 2
            },
            "by_priority": {
                "high": 1,
                "normal": 4,
                "low": 1
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting unread count: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get unread notification count"
        )


@app.put("/api/v1/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user),
    notification_repo: NotificationRepository = Depends(get_notification_repository)
):
    """Mark notification as read"""
    try:
        # Mock implementation - replace with actual update
        success = await notification_repo.mark_as_read(notification_id, current_user["id"])
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found"
            )
        
        return {"message": "Notification marked as read"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking notification as read: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to mark notification as read"
        )


@app.put("/api/v1/notifications/read-all")
async def mark_all_notifications_read(
    category: Optional[NotificationCategoryEnum] = None,
    current_user: dict = Depends(get_current_user),
    notification_repo: NotificationRepository = Depends(get_notification_repository)
):
    """Mark all notifications as read"""
    try:
        # Mock implementation - replace with actual bulk update
        marked_count = await notification_repo.mark_all_as_read(current_user["id"], category)
        
        return {
            "message": "Notifications marked as read",
            "marked_count": marked_count
        }
        
    except Exception as e:
        logger.error(f"Error marking all notifications as read: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to mark all notifications as read"
        )


@app.post("/api/v1/notifications/test")
async def test_notification(
    notification_type: NotificationTypeEnum,
    recipient: str,
    current_user: dict = Depends(get_current_user)
):
    """Send test notification."""
    
    success = False
    
    if notification_type == NotificationTypeEnum.EMAIL:
        success = await email_service.send_email(
            recipient,
            "Test Email from TouriQuest",
            "<h2>Test Email</h2><p>This is a test email.</p>",
            "Test Email\n\nThis is a test email."
        )
    
    elif notification_type == NotificationTypeEnum.SMS:
        success = await sms_service.send_sms(
            recipient,
            "Test SMS from TouriQuest"
        )
    
    elif notification_type == NotificationTypeEnum.PUSH:
        success = await push_service.send_push(
            recipient,
            "Test Push",
            "This is a test push notification"
        )
    
    return {
        "success": success,
        "message": f"Test {notification_type} notification sent" if success else "Failed to send test notification"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "notification-service",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)