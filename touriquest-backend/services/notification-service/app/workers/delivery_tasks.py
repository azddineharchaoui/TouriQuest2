"""
Background tasks for message delivery across different channels.
"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from celery import Task

from app.workers.celery_config import celery_app
from app.models.schemas import (
    DeliveryChannel, DeliveryResult, DeliveryStatus,
    NotificationAnalytics
)
from app.services.delivery import DeliveryManager

logger = logging.getLogger(__name__)

# Initialize delivery manager
delivery_manager = DeliveryManager()


class DeliveryTask(Task):
    """Base delivery task with channel-specific retry logic."""
    
    autoretry_for = (Exception,)
    retry_kwargs = {"max_retries": 5, "countdown": 120}  # 2 minute base delay
    retry_backoff = True


@celery_app.task(bind=True, base=DeliveryTask)
def deliver_email(
    self,
    recipient: str,
    subject: str,
    body: str,
    template_data: Dict[str, Any] = None,
    notification_id: str = None,
    user_id: str = None
) -> Dict[str, Any]:
    """Deliver email notification."""
    
    try:
        logger.info(f"Delivering email to {recipient} (notification_id: {notification_id})")
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            # Prepare email data
            email_data = {
                "recipient": recipient,
                "subject": subject,
                "body": body,
                "notification_id": notification_id,
                "user_id": user_id
            }
            
            if template_data:
                email_data.update(template_data)
            
            # Send email
            result = loop.run_until_complete(
                delivery_manager.email_handler.send(email_data)
            )
            
            # Track delivery
            if result.status == DeliveryStatus.DELIVERED:
                track_delivery.apply_async(
                    args=[notification_id, DeliveryChannel.EMAIL.value, result.dict()],
                    queue="analytics"
                )
            
            logger.info(f"Email delivered successfully to {recipient}")
            
            return {
                "status": "success",
                "delivery_result": result.dict(),
                "delivered_at": datetime.utcnow().isoformat()
            }
            
        finally:
            loop.close()
            
    except Exception as exc:
        logger.error(f"Error delivering email to {recipient}: {exc}")
        
        # Exponential backoff for retries
        if self.request.retries < self.max_retries:
            countdown = 120 * (2 ** self.request.retries)  # 2, 4, 8, 16, 32 minutes
            logger.info(f"Retrying email delivery (attempt {self.request.retries + 1}) in {countdown}s")
            raise self.retry(countdown=countdown)
        else:
            # Mark as failed after max retries
            track_delivery.apply_async(
                args=[
                    notification_id,
                    DeliveryChannel.EMAIL.value,
                    {
                        "status": DeliveryStatus.FAILED.value,
                        "error": str(exc),
                        "attempts": self.request.retries + 1
                    }
                ],
                queue="analytics"
            )
            
            return {
                "status": "failed",
                "error": str(exc),
                "attempts": self.request.retries + 1,
                "failed_at": datetime.utcnow().isoformat()
            }


@celery_app.task(bind=True, base=DeliveryTask)
def deliver_sms(
    self,
    phone_number: str,
    message: str,
    notification_id: str = None,
    user_id: str = None
) -> Dict[str, Any]:
    """Deliver SMS notification."""
    
    try:
        logger.info(f"Delivering SMS to {phone_number} (notification_id: {notification_id})")
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            # Prepare SMS data
            sms_data = {
                "phone_number": phone_number,
                "message": message,
                "notification_id": notification_id,
                "user_id": user_id
            }
            
            # Send SMS
            result = loop.run_until_complete(
                delivery_manager.sms_handler.send(sms_data)
            )
            
            # Track delivery
            if result.status == DeliveryStatus.DELIVERED:
                track_delivery.apply_async(
                    args=[notification_id, DeliveryChannel.SMS.value, result.dict()],
                    queue="analytics"
                )
            
            logger.info(f"SMS delivered successfully to {phone_number}")
            
            return {
                "status": "success",
                "delivery_result": result.dict(),
                "delivered_at": datetime.utcnow().isoformat()
            }
            
        finally:
            loop.close()
            
    except Exception as exc:
        logger.error(f"Error delivering SMS to {phone_number}: {exc}")
        
        # SMS has stricter retry limits due to cost
        if self.request.retries < 2:  # Only 2 retries for SMS
            countdown = 300 * (self.request.retries + 1)  # 5, 10 minutes
            logger.info(f"Retrying SMS delivery (attempt {self.request.retries + 1}) in {countdown}s")
            raise self.retry(countdown=countdown)
        else:
            track_delivery.apply_async(
                args=[
                    notification_id,
                    DeliveryChannel.SMS.value,
                    {
                        "status": DeliveryStatus.FAILED.value,
                        "error": str(exc),
                        "attempts": self.request.retries + 1
                    }
                ],
                queue="analytics"
            )
            
            return {
                "status": "failed",
                "error": str(exc),
                "attempts": self.request.retries + 1,
                "failed_at": datetime.utcnow().isoformat()
            }


@celery_app.task(bind=True, base=DeliveryTask)
def deliver_push(
    self,
    device_token: str,
    title: str,
    body: str,
    data: Dict[str, Any] = None,
    notification_id: str = None,
    user_id: str = None
) -> Dict[str, Any]:
    """Deliver push notification."""
    
    try:
        logger.info(f"Delivering push notification to device {device_token[:10]}... (notification_id: {notification_id})")
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            # Prepare push data
            push_data = {
                "device_token": device_token,
                "title": title,
                "body": body,
                "data": data or {},
                "notification_id": notification_id,
                "user_id": user_id
            }
            
            # Send push notification
            result = loop.run_until_complete(
                delivery_manager.push_handler.send(push_data)
            )
            
            # Track delivery
            track_delivery.apply_async(
                args=[notification_id, DeliveryChannel.PUSH.value, result.dict()],
                queue="analytics"
            )
            
            logger.info(f"Push notification delivered successfully")
            
            return {
                "status": "success",
                "delivery_result": result.dict(),
                "delivered_at": datetime.utcnow().isoformat()
            }
            
        finally:
            loop.close()
            
    except Exception as exc:
        logger.error(f"Error delivering push notification: {exc}")
        
        # Push notifications retry quickly due to real-time nature
        if self.request.retries < 3:
            countdown = 30 * (self.request.retries + 1)  # 30, 60, 90 seconds
            logger.info(f"Retrying push delivery (attempt {self.request.retries + 1}) in {countdown}s")
            raise self.retry(countdown=countdown)
        else:
            track_delivery.apply_async(
                args=[
                    notification_id,
                    DeliveryChannel.PUSH.value,
                    {
                        "status": DeliveryStatus.FAILED.value,
                        "error": str(exc),
                        "attempts": self.request.retries + 1
                    }
                ],
                queue="analytics"
            )
            
            return {
                "status": "failed",
                "error": str(exc),
                "attempts": self.request.retries + 1,
                "failed_at": datetime.utcnow().isoformat()
            }


@celery_app.task(bind=True, base=DeliveryTask)
def deliver_in_app(
    self,
    user_id: str,
    title: str,
    body: str,
    action_url: str = None,
    notification_id: str = None
) -> Dict[str, Any]:
    """Deliver in-app notification."""
    
    try:
        logger.info(f"Delivering in-app notification to user {user_id} (notification_id: {notification_id})")
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            # Prepare in-app data
            in_app_data = {
                "user_id": user_id,
                "title": title,
                "body": body,
                "action_url": action_url,
                "notification_id": notification_id
            }
            
            # Send in-app notification
            result = loop.run_until_complete(
                delivery_manager.in_app_handler.send(in_app_data)
            )
            
            # Track delivery
            track_delivery.apply_async(
                args=[notification_id, DeliveryChannel.IN_APP.value, result.dict()],
                queue="analytics"
            )
            
            logger.info(f"In-app notification delivered successfully to user {user_id}")
            
            return {
                "status": "success",
                "delivery_result": result.dict(),
                "delivered_at": datetime.utcnow().isoformat()
            }
            
        finally:
            loop.close()
            
    except Exception as exc:
        logger.error(f"Error delivering in-app notification to user {user_id}: {exc}")
        
        # In-app notifications are stored, so retries are less critical
        if self.request.retries < 2:
            countdown = 60 * (self.request.retries + 1)  # 1, 2 minutes
            raise self.retry(countdown=countdown)
        else:
            return {
                "status": "failed",
                "error": str(exc),
                "attempts": self.request.retries + 1,
                "failed_at": datetime.utcnow().isoformat()
            }


@celery_app.task(bind=True)
def deliver_multi_channel(
    self,
    delivery_requests: List[Dict[str, Any]],
    notification_id: str,
    user_id: str
) -> Dict[str, Any]:
    """Deliver notification across multiple channels simultaneously."""
    
    try:
        logger.info(f"Starting multi-channel delivery for notification {notification_id}")
        
        delivery_tasks = []
        
        # Queue delivery tasks for each channel
        for request in delivery_requests:
            channel = request["channel"]
            
            if channel == DeliveryChannel.EMAIL.value:
                task = deliver_email.apply_async(
                    args=[
                        request["recipient"],
                        request["subject"],
                        request["body"],
                        request.get("template_data"),
                        notification_id,
                        user_id
                    ],
                    queue="email"
                )
                
            elif channel == DeliveryChannel.SMS.value:
                task = deliver_sms.apply_async(
                    args=[
                        request["phone_number"],
                        request["message"],
                        notification_id,
                        user_id
                    ],
                    queue="sms"
                )
                
            elif channel == DeliveryChannel.PUSH.value:
                task = deliver_push.apply_async(
                    args=[
                        request["device_token"],
                        request["title"],
                        request["body"],
                        request.get("data"),
                        notification_id,
                        user_id
                    ],
                    queue="push"
                )
                
            elif channel == DeliveryChannel.IN_APP.value:
                task = deliver_in_app.apply_async(
                    args=[
                        user_id,
                        request["title"],
                        request["body"],
                        request.get("action_url"),
                        notification_id
                    ],
                    queue="notifications"
                )
            
            else:
                logger.warning(f"Unknown delivery channel: {channel}")
                continue
            
            delivery_tasks.append({
                "channel": channel,
                "task_id": task.id,
                "status": "queued"
            })
        
        logger.info(f"Queued {len(delivery_tasks)} delivery tasks for notification {notification_id}")
        
        return {
            "notification_id": notification_id,
            "delivery_tasks": delivery_tasks,
            "total_channels": len(delivery_tasks),
            "queued_at": datetime.utcnow().isoformat()
        }
        
    except Exception as exc:
        logger.error(f"Error in multi-channel delivery for notification {notification_id}: {exc}")
        return {
            "status": "failed",
            "error": str(exc),
            "notification_id": notification_id,
            "failed_at": datetime.utcnow().isoformat()
        }


@celery_app.task
def track_delivery(
    notification_id: str,
    channel: str,
    delivery_result: Dict[str, Any]
):
    """Track delivery result for analytics."""
    
    try:
        logger.debug(f"Tracking delivery for notification {notification_id} on channel {channel}")
        
        # This would integrate with analytics service
        # For now, just log the tracking data
        tracking_data = {
            "notification_id": notification_id,
            "channel": channel,
            "delivery_result": delivery_result,
            "tracked_at": datetime.utcnow().isoformat()
        }
        
        logger.info(f"Delivery tracked: {tracking_data}")
        
        # In a real implementation, this would:
        # 1. Store in analytics database
        # 2. Update delivery metrics
        # 3. Trigger follow-up actions if needed
        
    except Exception as exc:
        logger.error(f"Error tracking delivery for notification {notification_id}: {exc}")


@celery_app.task
def handle_delivery_callback(
    notification_id: str,
    channel: str,
    callback_data: Dict[str, Any]
):
    """Handle delivery status callbacks from external services."""
    
    try:
        logger.info(f"Processing delivery callback for notification {notification_id} on {channel}")
        
        # Process callback based on channel
        if channel == DeliveryChannel.EMAIL.value:
            # Handle email delivery status (opened, clicked, bounced, etc.)
            _handle_email_callback(notification_id, callback_data)
            
        elif channel == DeliveryChannel.SMS.value:
            # Handle SMS delivery status
            _handle_sms_callback(notification_id, callback_data)
            
        elif channel == DeliveryChannel.PUSH.value:
            # Handle push notification status
            _handle_push_callback(notification_id, callback_data)
        
        logger.info(f"Callback processed successfully for notification {notification_id}")
        
    except Exception as exc:
        logger.error(f"Error processing callback for notification {notification_id}: {exc}")


def _handle_email_callback(notification_id: str, data: Dict[str, Any]):
    """Handle email delivery callback."""
    # Update analytics with email engagement data
    pass


def _handle_sms_callback(notification_id: str, data: Dict[str, Any]):
    """Handle SMS delivery callback."""
    # Update analytics with SMS delivery status
    pass


def _handle_push_callback(notification_id: str, data: Dict[str, Any]):
    """Handle push notification callback."""
    # Update analytics with push engagement data
    pass