"""
Multi-channel delivery handlers for notifications.
"""
import asyncio
import logging
from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any
from datetime import datetime
import aiohttp
import json

from app.models.schemas import (
    Notification, DeliveryChannel, DeliveryResult, NotificationStatus,
    NotificationContent
)

logger = logging.getLogger(__name__)


class DeliveryHandler(ABC):
    """Abstract base class for delivery handlers."""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.is_enabled = config.get('enabled', True)
    
    @abstractmethod
    async def send(self, notification: Notification) -> DeliveryResult:
        """Send notification through this channel."""
        pass
    
    @abstractmethod
    async def validate_config(self) -> bool:
        """Validate handler configuration."""
        pass


class EmailDeliveryHandler(DeliveryHandler):
    """Email delivery handler using external email service."""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.api_key = config.get('api_key')
        self.from_email = config.get('from_email', 'noreply@touriquest.com')
        self.api_url = config.get('api_url', 'https://api.sendgrid.v3/mail/send')
        self.templates = config.get('templates', {})
    
    async def send(self, notification: Notification) -> DeliveryResult:
        """Send email notification."""
        try:
            # Get user email (in real implementation, fetch from user service)
            user_email = await self._get_user_email(notification.user_id)
            if not user_email:
                return DeliveryResult(
                    notification_id=notification.id,
                    channel=DeliveryChannel.EMAIL,
                    status=NotificationStatus.FAILED,
                    error_message="User email not found"
                )
            
            # Prepare email content
            email_data = {
                "personalizations": [{
                    "to": [{"email": user_email}],
                    "subject": notification.content.subject
                }],
                "from": {"email": self.from_email, "name": "TouriQuest"},
                "content": [
                    {
                        "type": "text/plain",
                        "value": notification.content.body
                    }
                ]
            }
            
            # Add HTML content if available
            if notification.content.html_body:
                email_data["content"].append({
                    "type": "text/html",
                    "value": notification.content.html_body
                })
            
            # Add attachments if any
            if notification.content.attachments:
                email_data["attachments"] = []
                for attachment in notification.content.attachments:
                    email_data["attachments"].append({
                        "content": attachment.get("content"),
                        "type": attachment.get("type", "application/pdf"),
                        "filename": attachment.get("filename")
                    })
            
            # Send email via API
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.api_url,
                    headers=headers,
                    json=email_data
                ) as response:
                    if response.status == 202:  # SendGrid success status
                        response_data = await response.json() if response.content_type == 'application/json' else {}
                        return DeliveryResult(
                            notification_id=notification.id,
                            channel=DeliveryChannel.EMAIL,
                            status=NotificationStatus.SENT,
                            external_id=response_data.get('message_id'),
                            delivered_at=datetime.utcnow(),
                            tracking_info={"provider": "sendgrid", "status_code": response.status}
                        )
                    else:
                        error_text = await response.text()
                        return DeliveryResult(
                            notification_id=notification.id,
                            channel=DeliveryChannel.EMAIL,
                            status=NotificationStatus.FAILED,
                            error_message=f"Email service error: {response.status} - {error_text}"
                        )
        
        except Exception as e:
            logger.error(f"Email delivery failed for notification {notification.id}: {str(e)}")
            return DeliveryResult(
                notification_id=notification.id,
                channel=DeliveryChannel.EMAIL,
                status=NotificationStatus.FAILED,
                error_message=str(e)
            )
    
    async def _get_user_email(self, user_id) -> Optional[str]:
        """Get user email from user service."""
        # Mock implementation - in real app, call user service
        return f"user_{user_id}@example.com"
    
    async def validate_config(self) -> bool:
        """Validate email handler configuration."""
        required_fields = ['api_key', 'from_email']
        return all(field in self.config for field in required_fields)


class SMSDeliveryHandler(DeliveryHandler):
    """SMS delivery handler using Twilio."""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.account_sid = config.get('account_sid')
        self.auth_token = config.get('auth_token')
        self.from_number = config.get('from_number')
        self.api_url = f"https://api.twilio.com/2010-04-01/Accounts/{self.account_sid}/Messages.json"
    
    async def send(self, notification: Notification) -> DeliveryResult:
        """Send SMS notification."""
        try:
            # Get user phone number
            user_phone = await self._get_user_phone(notification.user_id)
            if not user_phone:
                return DeliveryResult(
                    notification_id=notification.id,
                    channel=DeliveryChannel.SMS,
                    status=NotificationStatus.FAILED,
                    error_message="User phone number not found"
                )
            
            # Prepare SMS content (truncate if too long)
            sms_body = notification.content.body
            if len(sms_body) > 1600:  # SMS limit
                sms_body = sms_body[:1597] + "..."
            
            # Prepare SMS data
            sms_data = {
                "From": self.from_number,
                "To": user_phone,
                "Body": sms_body
            }
            
            # Add media if available
            if notification.content.image_url:
                sms_data["MediaUrl"] = notification.content.image_url
            
            # Send SMS via Twilio API
            import base64
            auth_header = base64.b64encode(f"{self.account_sid}:{self.auth_token}".encode()).decode()
            headers = {
                "Authorization": f"Basic {auth_header}",
                "Content-Type": "application/x-www-form-urlencoded"
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.api_url,
                    headers=headers,
                    data=sms_data
                ) as response:
                    if response.status == 201:  # Twilio success status
                        response_data = await response.json()
                        return DeliveryResult(
                            notification_id=notification.id,
                            channel=DeliveryChannel.SMS,
                            status=NotificationStatus.SENT,
                            external_id=response_data.get('sid'),
                            delivered_at=datetime.utcnow(),
                            tracking_info={"provider": "twilio", "status": response_data.get('status')}
                        )
                    else:
                        error_text = await response.text()
                        return DeliveryResult(
                            notification_id=notification.id,
                            channel=DeliveryChannel.SMS,
                            status=NotificationStatus.FAILED,
                            error_message=f"SMS service error: {response.status} - {error_text}"
                        )
        
        except Exception as e:
            logger.error(f"SMS delivery failed for notification {notification.id}: {str(e)}")
            return DeliveryResult(
                notification_id=notification.id,
                channel=DeliveryChannel.SMS,
                status=NotificationStatus.FAILED,
                error_message=str(e)
            )
    
    async def _get_user_phone(self, user_id) -> Optional[str]:
        """Get user phone number from user service."""
        # Mock implementation - in real app, call user service
        return f"+1555{str(user_id)[-7:]}"  # Mock phone number
    
    async def validate_config(self) -> bool:
        """Validate SMS handler configuration."""
        required_fields = ['account_sid', 'auth_token', 'from_number']
        return all(field in self.config for field in required_fields)


class PushNotificationHandler(DeliveryHandler):
    """Push notification handler for mobile apps."""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.fcm_server_key = config.get('fcm_server_key')
        self.apns_key_file = config.get('apns_key_file')
        self.fcm_url = "https://fcm.googleapis.com/fcm/send"
    
    async def send(self, notification: Notification) -> DeliveryResult:
        """Send push notification."""
        try:
            # Get user device tokens
            device_tokens = await self._get_user_device_tokens(notification.user_id)
            if not device_tokens:
                return DeliveryResult(
                    notification_id=notification.id,
                    channel=DeliveryChannel.PUSH,
                    status=NotificationStatus.FAILED,
                    error_message="No device tokens found for user"
                )
            
            results = []
            
            # Send to each device
            for device_token in device_tokens:
                result = await self._send_to_device(notification, device_token)
                results.append(result)
            
            # Return combined result
            success_count = sum(1 for r in results if r.status == NotificationStatus.SENT)
            if success_count > 0:
                return DeliveryResult(
                    notification_id=notification.id,
                    channel=DeliveryChannel.PUSH,
                    status=NotificationStatus.SENT,
                    delivered_at=datetime.utcnow(),
                    tracking_info={
                        "devices_sent": success_count,
                        "total_devices": len(device_tokens)
                    }
                )
            else:
                return DeliveryResult(
                    notification_id=notification.id,
                    channel=DeliveryChannel.PUSH,
                    status=NotificationStatus.FAILED,
                    error_message="Failed to send to any device"
                )
        
        except Exception as e:
            logger.error(f"Push notification delivery failed for notification {notification.id}: {str(e)}")
            return DeliveryResult(
                notification_id=notification.id,
                channel=DeliveryChannel.PUSH,
                status=NotificationStatus.FAILED,
                error_message=str(e)
            )
    
    async def _send_to_device(self, notification: Notification, device_token: str) -> DeliveryResult:
        """Send push notification to a specific device."""
        try:
            # Prepare FCM payload
            fcm_payload = {
                "to": device_token,
                "notification": {
                    "title": notification.content.subject,
                    "body": notification.content.body[:100],  # Truncate for push
                    "click_action": notification.content.action_url
                },
                "data": {
                    "notification_id": str(notification.id),
                    "type": notification.notification_type.value,
                    "action_url": notification.content.action_url or "",
                    "metadata": json.dumps(notification.content.metadata)
                }
            }
            
            # Add image if available
            if notification.content.image_url:
                fcm_payload["notification"]["image"] = notification.content.image_url
            
            headers = {
                "Authorization": f"key={self.fcm_server_key}",
                "Content-Type": "application/json"
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.fcm_url,
                    headers=headers,
                    json=fcm_payload
                ) as response:
                    if response.status == 200:
                        response_data = await response.json()
                        if response_data.get('success', 0) > 0:
                            return DeliveryResult(
                                notification_id=notification.id,
                                channel=DeliveryChannel.PUSH,
                                status=NotificationStatus.SENT,
                                external_id=response_data.get('multicast_id'),
                                delivered_at=datetime.utcnow(),
                                tracking_info={"provider": "fcm", "device_token": device_token[:10] + "..."}
                            )
                        else:
                            return DeliveryResult(
                                notification_id=notification.id,
                                channel=DeliveryChannel.PUSH,
                                status=NotificationStatus.FAILED,
                                error_message=f"FCM error: {response_data.get('results', [{}])[0].get('error', 'Unknown')}"
                            )
                    else:
                        error_text = await response.text()
                        return DeliveryResult(
                            notification_id=notification.id,
                            channel=DeliveryChannel.PUSH,
                            status=NotificationStatus.FAILED,
                            error_message=f"FCM API error: {response.status} - {error_text}"
                        )
        
        except Exception as e:
            return DeliveryResult(
                notification_id=notification.id,
                channel=DeliveryChannel.PUSH,
                status=NotificationStatus.FAILED,
                error_message=str(e)
            )
    
    async def _get_user_device_tokens(self, user_id) -> List[str]:
        """Get user device tokens from user service."""
        # Mock implementation - in real app, call user service
        return [f"device_token_{user_id}_1", f"device_token_{user_id}_2"]
    
    async def validate_config(self) -> bool:
        """Validate push notification handler configuration."""
        return 'fcm_server_key' in self.config


class InAppNotificationHandler(DeliveryHandler):
    """In-app notification handler using WebSocket or database."""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.websocket_url = config.get('websocket_url')
        self.database_fallback = config.get('database_fallback', True)
    
    async def send(self, notification: Notification) -> DeliveryResult:
        """Send in-app notification."""
        try:
            # Try WebSocket delivery first
            ws_result = await self._send_via_websocket(notification)
            if ws_result and ws_result.status == NotificationStatus.SENT:
                return ws_result
            
            # Fallback to database storage
            if self.database_fallback:
                return await self._store_in_database(notification)
            else:
                return DeliveryResult(
                    notification_id=notification.id,
                    channel=DeliveryChannel.IN_APP,
                    status=NotificationStatus.FAILED,
                    error_message="WebSocket delivery failed and database fallback disabled"
                )
        
        except Exception as e:
            logger.error(f"In-app notification delivery failed for notification {notification.id}: {str(e)}")
            return DeliveryResult(
                notification_id=notification.id,
                channel=DeliveryChannel.IN_APP,
                status=NotificationStatus.FAILED,
                error_message=str(e)
            )
    
    async def _send_via_websocket(self, notification: Notification) -> Optional[DeliveryResult]:
        """Send notification via WebSocket."""
        try:
            if not self.websocket_url:
                return None
            
            # Check if user is connected
            user_connected = await self._check_user_connected(notification.user_id)
            if not user_connected:
                return None
            
            # Prepare WebSocket message
            ws_message = {
                "type": "notification",
                "data": {
                    "id": str(notification.id),
                    "type": notification.notification_type.value,
                    "subject": notification.content.subject,
                    "body": notification.content.body,
                    "action_url": notification.content.action_url,
                    "action_text": notification.content.action_text,
                    "image_url": notification.content.image_url,
                    "created_at": notification.created_at.isoformat(),
                    "metadata": notification.content.metadata
                }
            }
            
            # Send via WebSocket (mock implementation)
            # In real implementation, you'd send to WebSocket server
            await self._send_websocket_message(notification.user_id, ws_message)
            
            return DeliveryResult(
                notification_id=notification.id,
                channel=DeliveryChannel.IN_APP,
                status=NotificationStatus.DELIVERED,
                delivered_at=datetime.utcnow(),
                tracking_info={"delivery_method": "websocket"}
            )
        
        except Exception as e:
            logger.error(f"WebSocket delivery failed: {str(e)}")
            return None
    
    async def _store_in_database(self, notification: Notification) -> DeliveryResult:
        """Store notification in database for later retrieval."""
        try:
            # In real implementation, store in database
            # For now, just simulate success
            
            return DeliveryResult(
                notification_id=notification.id,
                channel=DeliveryChannel.IN_APP,
                status=NotificationStatus.SENT,
                delivered_at=datetime.utcnow(),
                tracking_info={"delivery_method": "database", "stored": True}
            )
        
        except Exception as e:
            return DeliveryResult(
                notification_id=notification.id,
                channel=DeliveryChannel.IN_APP,
                status=NotificationStatus.FAILED,
                error_message=f"Database storage failed: {str(e)}"
            )
    
    async def _check_user_connected(self, user_id) -> bool:
        """Check if user is connected via WebSocket."""
        # Mock implementation - in real app, check WebSocket connections
        return True  # Assume user is connected
    
    async def _send_websocket_message(self, user_id, message: Dict[str, Any]):
        """Send message to user via WebSocket."""
        # Mock implementation - in real app, send to WebSocket server
        logger.info(f"Sending WebSocket message to user {user_id}: {message}")
    
    async def validate_config(self) -> bool:
        """Validate in-app notification handler configuration."""
        return True  # Minimal config required


class BrowserNotificationHandler(DeliveryHandler):
    """Browser notification handler using Web Push API."""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.vapid_private_key = config.get('vapid_private_key')
        self.vapid_public_key = config.get('vapid_public_key')
        self.vapid_subject = config.get('vapid_subject', 'mailto:admin@touriquest.com')
    
    async def send(self, notification: Notification) -> DeliveryResult:
        """Send browser notification."""
        try:
            # Get user browser subscriptions
            subscriptions = await self._get_user_subscriptions(notification.user_id)
            if not subscriptions:
                return DeliveryResult(
                    notification_id=notification.id,
                    channel=DeliveryChannel.BROWSER,
                    status=NotificationStatus.FAILED,
                    error_message="No browser subscriptions found for user"
                )
            
            results = []
            
            # Send to each subscription
            for subscription in subscriptions:
                result = await self._send_to_subscription(notification, subscription)
                results.append(result)
            
            # Return combined result
            success_count = sum(1 for r in results if r.status == NotificationStatus.SENT)
            if success_count > 0:
                return DeliveryResult(
                    notification_id=notification.id,
                    channel=DeliveryChannel.BROWSER,
                    status=NotificationStatus.SENT,
                    delivered_at=datetime.utcnow(),
                    tracking_info={
                        "subscriptions_sent": success_count,
                        "total_subscriptions": len(subscriptions)
                    }
                )
            else:
                return DeliveryResult(
                    notification_id=notification.id,
                    channel=DeliveryChannel.BROWSER,
                    status=NotificationStatus.FAILED,
                    error_message="Failed to send to any subscription"
                )
        
        except Exception as e:
            logger.error(f"Browser notification delivery failed for notification {notification.id}: {str(e)}")
            return DeliveryResult(
                notification_id=notification.id,
                channel=DeliveryChannel.BROWSER,
                status=NotificationStatus.FAILED,
                error_message=str(e)
            )
    
    async def _send_to_subscription(self, notification: Notification, subscription: Dict[str, Any]) -> DeliveryResult:
        """Send browser notification to a specific subscription."""
        try:
            # Prepare Web Push payload
            web_push_payload = {
                "title": notification.content.subject,
                "body": notification.content.body[:100],  # Truncate for browser
                "icon": notification.content.image_url or "/icon-192x192.png",
                "badge": "/badge-72x72.png",
                "data": {
                    "notification_id": str(notification.id),
                    "action_url": notification.content.action_url,
                    "timestamp": datetime.utcnow().isoformat()
                }
            }
            
            # Add actions if available
            if notification.content.action_url and notification.content.action_text:
                web_push_payload["actions"] = [{
                    "action": "open",
                    "title": notification.content.action_text,
                    "icon": "/action-icon.png"
                }]
            
            # In real implementation, use py-webpush library to send
            # For now, simulate the API call
            
            # Mock success
            return DeliveryResult(
                notification_id=notification.id,
                channel=DeliveryChannel.BROWSER,
                status=NotificationStatus.SENT,
                delivered_at=datetime.utcnow(),
                tracking_info={"provider": "web_push", "endpoint": subscription.get("endpoint", "")[:50]}
            )
        
        except Exception as e:
            return DeliveryResult(
                notification_id=notification.id,
                channel=DeliveryChannel.BROWSER,
                status=NotificationStatus.FAILED,
                error_message=str(e)
            )
    
    async def _get_user_subscriptions(self, user_id) -> List[Dict[str, Any]]:
        """Get user browser push subscriptions."""
        # Mock implementation - in real app, get from database
        return [{
            "endpoint": f"https://fcm.googleapis.com/fcm/send/{user_id}",
            "keys": {
                "p256dh": "mock_p256dh_key",
                "auth": "mock_auth_key"
            }
        }]
    
    async def validate_config(self) -> bool:
        """Validate browser notification handler configuration."""
        required_fields = ['vapid_private_key', 'vapid_public_key']
        return all(field in self.config for field in required_fields)


class DeliveryManager:
    """Manages all delivery channels."""
    
    def __init__(self, config: Dict[str, Any]):
        self.handlers: Dict[DeliveryChannel, DeliveryHandler] = {}
        self._initialize_handlers(config)
    
    def _initialize_handlers(self, config: Dict[str, Any]):
        """Initialize delivery handlers based on configuration."""
        
        # Email handler
        if config.get('email', {}).get('enabled', True):
            self.handlers[DeliveryChannel.EMAIL] = EmailDeliveryHandler(config.get('email', {}))
        
        # SMS handler
        if config.get('sms', {}).get('enabled', True):
            self.handlers[DeliveryChannel.SMS] = SMSDeliveryHandler(config.get('sms', {}))
        
        # Push notification handler
        if config.get('push', {}).get('enabled', True):
            self.handlers[DeliveryChannel.PUSH] = PushNotificationHandler(config.get('push', {}))
        
        # In-app notification handler
        if config.get('in_app', {}).get('enabled', True):
            self.handlers[DeliveryChannel.IN_APP] = InAppNotificationHandler(config.get('in_app', {}))
        
        # Browser notification handler
        if config.get('browser', {}).get('enabled', True):
            self.handlers[DeliveryChannel.BROWSER] = BrowserNotificationHandler(config.get('browser', {}))
    
    async def deliver_notification(self, notification: Notification) -> List[DeliveryResult]:
        """Deliver notification through all specified channels."""
        results = []
        
        for channel in notification.channels:
            if channel in self.handlers:
                handler = self.handlers[channel]
                if handler.is_enabled:
                    try:
                        result = await handler.send(notification)
                        results.append(result)
                    except Exception as e:
                        logger.error(f"Delivery failed for channel {channel}: {str(e)}")
                        results.append(DeliveryResult(
                            notification_id=notification.id,
                            channel=channel,
                            status=NotificationStatus.FAILED,
                            error_message=str(e)
                        ))
                else:
                    logger.warning(f"Handler for channel {channel} is disabled")
            else:
                logger.warning(f"No handler available for channel {channel}")
                results.append(DeliveryResult(
                    notification_id=notification.id,
                    channel=channel,
                    status=NotificationStatus.FAILED,
                    error_message=f"No handler available for channel {channel}"
                ))
        
        return results
    
    async def validate_all_handlers(self) -> Dict[DeliveryChannel, bool]:
        """Validate all handler configurations."""
        validation_results = {}
        
        for channel, handler in self.handlers.items():
            try:
                validation_results[channel] = await handler.validate_config()
            except Exception as e:
                logger.error(f"Validation failed for channel {channel}: {str(e)}")
                validation_results[channel] = False
        
        return validation_results
    
    def get_available_channels(self) -> List[DeliveryChannel]:
        """Get list of available delivery channels."""
        return [channel for channel, handler in self.handlers.items() if handler.is_enabled]