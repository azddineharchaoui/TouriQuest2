"""
Message queue utilities for TouriQuest microservices.
"""
from typing import Any, Dict, Optional, Callable
import json
from celery import Celery
from kombu import Queue, Exchange
import logging

logger = logging.getLogger(__name__)


class MessageQueue:
    """Celery-based message queue manager."""
    
    def __init__(self, broker_url: str, result_backend: str):
        self.celery_app = Celery(
            'touriquest',
            broker=broker_url,
            backend=result_backend,
            include=[
                'services.auth_service.tasks',
                'services.user_service.tasks',
                'services.property_service.tasks',
                'services.booking_service.tasks',
                'services.notification_service.tasks',
                'services.media_service.tasks',
                'services.ai_service.tasks',
            ]
        )
        
        # Configure task routes
        self.celery_app.conf.update(
            task_serializer='json',
            accept_content=['json'],
            result_serializer='json',
            timezone='UTC',
            enable_utc=True,
            task_track_started=True,
            task_send_events=True,
            worker_send_task_events=True,
            result_expires=3600,
            task_routes={
                'auth.*': {'queue': 'auth'},
                'user.*': {'queue': 'user'},
                'property.*': {'queue': 'property'},
                'booking.*': {'queue': 'booking'},
                'notification.*': {'queue': 'notification'},
                'media.*': {'queue': 'media'},
                'ai.*': {'queue': 'ai'},
            },
            task_default_queue='default',
            task_queues=(
                Queue('default', Exchange('default'), routing_key='default'),
                Queue('auth', Exchange('auth'), routing_key='auth'),
                Queue('user', Exchange('user'), routing_key='user'),
                Queue('property', Exchange('property'), routing_key='property'),
                Queue('booking', Exchange('booking'), routing_key='booking'),
                Queue('notification', Exchange('notification'), routing_key='notification'),
                Queue('media', Exchange('media'), routing_key='media'),
                Queue('ai', Exchange('ai'), routing_key='ai'),
            ),
        )
    
    def create_task(self, name: str, queue: str = 'default'):
        """Decorator to create Celery task."""
        def decorator(func: Callable):
            return self.celery_app.task(name=name, bind=True, queue=queue)(func)
        return decorator
    
    async def send_task(
        self, 
        task_name: str, 
        args: list = None, 
        kwargs: dict = None,
        queue: str = 'default',
        countdown: int = None,
        eta: Any = None,
    ) -> str:
        """Send task to queue."""
        try:
            result = self.celery_app.send_task(
                task_name,
                args=args or [],
                kwargs=kwargs or {},
                queue=queue,
                countdown=countdown,
                eta=eta,
            )
            return result.id
        except Exception as e:
            logger.error(f"Failed to send task {task_name}: {e}")
            raise
    
    def get_task_result(self, task_id: str) -> Any:
        """Get task result."""
        try:
            result = self.celery_app.AsyncResult(task_id)
            return result.result
        except Exception as e:
            logger.error(f"Failed to get task result {task_id}: {e}")
            return None
    
    def get_task_status(self, task_id: str) -> str:
        """Get task status."""
        try:
            result = self.celery_app.AsyncResult(task_id)
            return result.status
        except Exception as e:
            logger.error(f"Failed to get task status {task_id}: {e}")
            return "UNKNOWN"


# Common task types
class TaskTypes:
    """Common task type constants."""
    
    # Auth tasks
    SEND_VERIFICATION_EMAIL = "auth.send_verification_email"
    SEND_PASSWORD_RESET = "auth.send_password_reset"
    
    # User tasks
    UPDATE_USER_STATS = "user.update_user_stats"
    PROCESS_USER_ACTIVITY = "user.process_user_activity"
    
    # Property tasks
    INDEX_PROPERTY = "property.index_property"
    UPDATE_PROPERTY_RANKING = "property.update_property_ranking"
    
    # Booking tasks
    PROCESS_PAYMENT = "booking.process_payment"
    SEND_BOOKING_CONFIRMATION = "booking.send_booking_confirmation"
    
    # Notification tasks
    SEND_EMAIL = "notification.send_email"
    SEND_SMS = "notification.send_sms"
    SEND_PUSH_NOTIFICATION = "notification.send_push_notification"
    
    # Media tasks
    PROCESS_IMAGE = "media.process_image"
    PROCESS_VIDEO = "media.process_video"
    PROCESS_AUDIO = "media.process_audio"
    
    # AI tasks
    GENERATE_RECOMMENDATIONS = "ai.generate_recommendations"
    PROCESS_AI_CONVERSATION = "ai.process_ai_conversation"


class EventBus:
    """Event-driven communication between services."""
    
    def __init__(self, message_queue: MessageQueue):
        self.mq = message_queue
    
    async def publish_event(
        self, 
        event_type: str, 
        data: Dict[str, Any],
        service: str = None
    ):
        """Publish event to event bus."""
        event = {
            'event_type': event_type,
            'data': data,
            'timestamp': str(datetime.utcnow()),
            'service': service,
        }
        
        # Route event to appropriate queue
        queue = self._get_queue_for_event(event_type)
        task_name = f"events.{event_type}"
        
        await self.mq.send_task(
            task_name,
            kwargs={'event': event},
            queue=queue
        )
    
    def _get_queue_for_event(self, event_type: str) -> str:
        """Get appropriate queue for event type."""
        if event_type.startswith('user'):
            return 'user'
        elif event_type.startswith('property'):
            return 'property'
        elif event_type.startswith('booking'):
            return 'booking'
        elif event_type.startswith('notification'):
            return 'notification'
        else:
            return 'default'


# Event types
class EventTypes:
    """Common event type constants."""
    
    # User events
    USER_REGISTERED = "user.registered"
    USER_UPDATED = "user.updated"
    USER_DELETED = "user.deleted"
    
    # Property events
    PROPERTY_CREATED = "property.created"
    PROPERTY_UPDATED = "property.updated"
    PROPERTY_DELETED = "property.deleted"
    
    # Booking events
    BOOKING_CREATED = "booking.created"
    BOOKING_CONFIRMED = "booking.confirmed"
    BOOKING_CANCELLED = "booking.cancelled"
    
    # Notification events
    NOTIFICATION_SENT = "notification.sent"
    NOTIFICATION_FAILED = "notification.failed"