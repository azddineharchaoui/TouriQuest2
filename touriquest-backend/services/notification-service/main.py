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