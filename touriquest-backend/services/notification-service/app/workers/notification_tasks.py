"""
Background tasks for notification processing and delivery.
"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from celery import Task
from celery.exceptions import Retry, MaxRetriesExceededError

from app.workers.celery_config import celery_app
from app.models.schemas import (
    NotificationRequest, NotificationType, DeliveryChannel,
    NotificationStatus, DeliveryResult, UserBehaviorData
)
from app.services.notification_service import NotificationService
from app.services.delivery import DeliveryManager
from app.ml.smart_features import smart_timing_optimizer
from app.services.template_manager import template_manager

logger = logging.getLogger(__name__)

# Initialize services
notification_service = NotificationService()
delivery_manager = DeliveryManager()


class NotificationTask(Task):
    """Base task class with retry logic and error handling."""
    
    autoretry_for = (Exception,)
    retry_kwargs = {"max_retries": 3, "countdown": 60}
    retry_backoff = True
    retry_jitter = False


@celery_app.task(bind=True, base=NotificationTask)
def send_notification(
    self,
    notification_data: Dict[str, Any],
    user_id: str,
    priority: str = "normal"
) -> Dict[str, Any]:
    """
    Send a notification through the intelligent notification system.
    
    Args:
        notification_data: Notification content and configuration
        user_id: Target user ID
        priority: Priority level (urgent, high, normal, low)
    
    Returns:
        Dictionary with delivery results and status
    """
    try:
        logger.info(f"Processing notification for user {user_id} with priority {priority}")
        
        # Parse notification request
        notification_request = NotificationRequest(**notification_data)
        
        # Route to urgent queue if needed
        if priority == "urgent":
            return send_urgent_notification.apply_async(
                args=[notification_data, user_id],
                queue="urgent",
                priority=10
            ).get()
        
        # Process through normal flow
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            # Get user behavior data (would come from user service in real implementation)
            user_behavior = _get_user_behavior_data(user_id)
            
            # Process notification through intelligent system
            result = loop.run_until_complete(
                notification_service.send_notification(notification_request, user_behavior)
            )
            
            # Track the task completion
            logger.info(f"Notification sent successfully for user {user_id}")
            
            return {
                "status": "success",
                "notification_id": result.notification_id,
                "delivery_results": [r.dict() for r in result.delivery_results],
                "scheduled_time": result.scheduled_time.isoformat() if result.scheduled_time else None,
                "processed_at": datetime.utcnow().isoformat()
            }
            
        finally:
            loop.close()
            
    except Exception as exc:
        logger.error(f"Error sending notification for user {user_id}: {exc}")
        
        # Determine if we should retry
        if self.request.retries < self.max_retries:
            logger.info(f"Retrying notification task (attempt {self.request.retries + 1})")
            raise self.retry(countdown=60 * (2 ** self.request.retries))
        else:
            logger.error(f"Max retries exceeded for notification to user {user_id}")
            return {
                "status": "failed",
                "error": str(exc),
                "retries": self.request.retries,
                "failed_at": datetime.utcnow().isoformat()
            }


@celery_app.task(bind=True, base=NotificationTask)
def send_urgent_notification(
    self,
    notification_data: Dict[str, Any],
    user_id: str
) -> Dict[str, Any]:
    """Send urgent notification with immediate delivery."""
    
    try:
        logger.warning(f"Processing URGENT notification for user {user_id}")
        
        notification_request = NotificationRequest(**notification_data)
        
        # Override timing for urgent notifications
        notification_request.send_immediately = True
        notification_request.bypass_frequency_limits = True
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            user_behavior = _get_user_behavior_data(user_id)
            
            result = loop.run_until_complete(
                notification_service.send_notification(notification_request, user_behavior)
            )
            
            logger.warning(f"URGENT notification delivered for user {user_id}")
            
            return {
                "status": "success",
                "notification_id": result.notification_id,
                "delivery_results": [r.dict() for r in result.delivery_results],
                "priority": "urgent",
                "processed_at": datetime.utcnow().isoformat()
            }
            
        finally:
            loop.close()
            
    except Exception as exc:
        logger.error(f"Error sending urgent notification for user {user_id}: {exc}")
        
        if self.request.retries < 1:  # Only retry once for urgent
            raise self.retry(countdown=30)
        else:
            return {
                "status": "failed",
                "error": str(exc),
                "priority": "urgent",
                "failed_at": datetime.utcnow().isoformat()
            }


@celery_app.task(bind=True)
def send_batch_notifications(
    self,
    notifications: List[Dict[str, Any]],
    batch_id: str = None
) -> Dict[str, Any]:
    """Send multiple notifications in a batch."""
    
    try:
        logger.info(f"Processing batch of {len(notifications)} notifications (batch_id: {batch_id})")
        
        results = []
        failed_count = 0
        
        for i, notification in enumerate(notifications):
            try:
                # Send each notification asynchronously
                task_result = send_notification.apply_async(
                    args=[notification["data"], notification["user_id"]],
                    kwargs={"priority": notification.get("priority", "normal")}
                )
                
                results.append({
                    "user_id": notification["user_id"],
                    "task_id": task_result.id,
                    "status": "queued"
                })
                
            except Exception as e:
                logger.error(f"Error queueing notification {i} in batch {batch_id}: {e}")
                failed_count += 1
                
                results.append({
                    "user_id": notification.get("user_id", "unknown"),
                    "status": "failed",
                    "error": str(e)
                })
        
        return {
            "batch_id": batch_id,
            "total_notifications": len(notifications),
            "queued_successfully": len(notifications) - failed_count,
            "failed_to_queue": failed_count,
            "results": results,
            "processed_at": datetime.utcnow().isoformat()
        }
        
    except Exception as exc:
        logger.error(f"Error processing notification batch {batch_id}: {exc}")
        raise


@celery_app.task
def process_scheduled_notifications():
    """Process notifications that are scheduled to be sent now."""
    
    try:
        logger.info("Processing scheduled notifications")
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            # Get scheduled notifications from database
            scheduled_notifications = loop.run_until_complete(
                _get_scheduled_notifications()
            )
            
            processed_count = 0
            
            for notification in scheduled_notifications:
                try:
                    # Send the notification
                    send_notification.apply_async(
                        args=[notification["data"], notification["user_id"]],
                        kwargs={"priority": notification.get("priority", "normal")}
                    )
                    
                    # Mark as processed in database
                    loop.run_until_complete(
                        _mark_notification_processed(notification["id"])
                    )
                    
                    processed_count += 1
                    
                except Exception as e:
                    logger.error(f"Error processing scheduled notification {notification['id']}: {e}")
            
            logger.info(f"Processed {processed_count} scheduled notifications")
            
            return {
                "processed_count": processed_count,
                "total_found": len(scheduled_notifications),
                "processed_at": datetime.utcnow().isoformat()
            }
            
        finally:
            loop.close()
            
    except Exception as exc:
        logger.error(f"Error in scheduled notification processing: {exc}")
        raise


@celery_app.task
def optimize_user_timing():
    """Optimize notification timing for all users based on engagement data."""
    
    try:
        logger.info("Starting user timing optimization")
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            # Get users who need timing optimization
            users_to_optimize = loop.run_until_complete(
                _get_users_for_timing_optimization()
            )
            
            optimized_count = 0
            
            for user_data in users_to_optimize:
                try:
                    # Get user's engagement analytics
                    analytics = loop.run_until_complete(
                        _get_user_engagement_analytics(user_data["user_id"])
                    )
                    
                    # Update user timing model
                    loop.run_until_complete(
                        smart_timing_optimizer.update_user_model(
                            user_data["user_id"],
                            analytics
                        )
                    )
                    
                    optimized_count += 1
                    
                except Exception as e:
                    logger.error(f"Error optimizing timing for user {user_data['user_id']}: {e}")
            
            logger.info(f"Optimized timing for {optimized_count} users")
            
            return {
                "optimized_count": optimized_count,
                "total_users": len(users_to_optimize),
                "processed_at": datetime.utcnow().isoformat()
            }
            
        finally:
            loop.close()
            
    except Exception as exc:
        logger.error(f"Error in timing optimization: {exc}")
        raise


@celery_app.task(bind=True)
def retry_failed_notification(
    self,
    notification_id: str,
    retry_channels: List[str] = None
) -> Dict[str, Any]:
    """Retry a failed notification, optionally with different channels."""
    
    try:
        logger.info(f"Retrying failed notification {notification_id}")
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            # Get original notification data
            notification_data = loop.run_until_complete(
                _get_notification_data(notification_id)
            )
            
            if not notification_data:
                return {
                    "status": "failed",
                    "error": f"Notification {notification_id} not found",
                    "retried_at": datetime.utcnow().isoformat()
                }
            
            # Override channels if specified
            if retry_channels:
                notification_data["data"]["channels"] = retry_channels
            
            # Mark as retry attempt
            notification_data["data"]["is_retry"] = True
            notification_data["data"]["original_notification_id"] = notification_id
            
            # Send the retry
            result = send_notification.apply_async(
                args=[notification_data["data"], notification_data["user_id"]],
                kwargs={"priority": "high"}  # Higher priority for retries
            ).get()
            
            return {
                "status": "retried",
                "original_notification_id": notification_id,
                "new_result": result,
                "retry_channels": retry_channels,
                "retried_at": datetime.utcnow().isoformat()
            }
            
        finally:
            loop.close()
            
    except Exception as exc:
        logger.error(f"Error retrying notification {notification_id}: {exc}")
        return {
            "status": "retry_failed",
            "error": str(exc),
            "notification_id": notification_id,
            "failed_at": datetime.utcnow().isoformat()
        }


# Helper functions (these would integrate with actual database/services)
def _get_user_behavior_data(user_id: str) -> UserBehaviorData:
    """Get user behavior data from user service."""
    # Placeholder - would fetch from user service
    return UserBehaviorData(
        user_id=user_id,
        timezone="UTC",
        preferred_channels=[DeliveryChannel.EMAIL, DeliveryChannel.PUSH],
        active_hours=[9, 10, 11, 14, 15, 16, 18, 19, 20],
        engagement_rates={
            DeliveryChannel.EMAIL.value: 0.75,
            DeliveryChannel.PUSH.value: 0.65,
            DeliveryChannel.SMS.value: 0.85
        },
        response_times={
            DeliveryChannel.EMAIL.value: 120.0,  # 2 hours
            DeliveryChannel.PUSH.value: 15.0,    # 15 minutes
            DeliveryChannel.SMS.value: 5.0       # 5 minutes
        },
        last_active=datetime.utcnow() - timedelta(hours=2)
    )


async def _get_scheduled_notifications() -> List[Dict[str, Any]]:
    """Get notifications scheduled to be sent now."""
    # Placeholder - would query database
    return []


async def _mark_notification_processed(notification_id: str):
    """Mark a scheduled notification as processed."""
    # Placeholder - would update database
    pass


async def _get_users_for_timing_optimization() -> List[Dict[str, Any]]:
    """Get users who need timing optimization."""
    # Placeholder - would query database for users with sufficient engagement data
    return []


async def _get_user_engagement_analytics(user_id: str) -> List[Any]:
    """Get user's engagement analytics."""
    # Placeholder - would fetch from analytics service
    return []


async def _get_notification_data(notification_id: str) -> Optional[Dict[str, Any]]:
    """Get notification data by ID."""
    # Placeholder - would fetch from database
    return None