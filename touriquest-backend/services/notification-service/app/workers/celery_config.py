"""
Celery configuration for notification service background tasks.
"""
from celery import Celery
from kombu import Queue
import os
from datetime import timedelta

# Redis connection configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
BROKER_URL = os.getenv("CELERY_BROKER_URL", REDIS_URL)
RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", REDIS_URL)

# Create Celery app
celery_app = Celery(
    "notification_service",
    broker=BROKER_URL,
    backend=RESULT_BACKEND,
    include=[
        "app.workers.notification_tasks",
        "app.workers.delivery_tasks",
        "app.workers.analytics_tasks",
        "app.workers.cleanup_tasks"
    ]
)

# Celery configuration
celery_app.conf.update(
    # Task serialization
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    
    # Task routing
    task_routes={
        "app.workers.notification_tasks.send_notification": {"queue": "notifications"},
        "app.workers.delivery_tasks.deliver_email": {"queue": "email"},
        "app.workers.delivery_tasks.deliver_sms": {"queue": "sms"},
        "app.workers.delivery_tasks.deliver_push": {"queue": "push"},
        "app.workers.analytics_tasks.track_engagement": {"queue": "analytics"},
        "app.workers.cleanup_tasks.cleanup_old_notifications": {"queue": "cleanup"},
    },
    
    # Define queues with different priorities
    task_queues=(
        Queue("urgent", routing_key="urgent", priority=10),
        Queue("notifications", routing_key="notifications", priority=5),
        Queue("email", routing_key="email", priority=3),
        Queue("sms", routing_key="sms", priority=4),
        Queue("push", routing_key="push", priority=4),
        Queue("analytics", routing_key="analytics", priority=1),
        Queue("cleanup", routing_key="cleanup", priority=1),
    ),
    
    # Worker configuration
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    
    # Retry configuration
    task_default_retry_delay=60,  # 1 minute
    task_max_retries=3,
    
    # Rate limiting
    task_annotations={
        "app.workers.delivery_tasks.deliver_email": {"rate_limit": "100/m"},
        "app.workers.delivery_tasks.deliver_sms": {"rate_limit": "10/m"},
        "app.workers.delivery_tasks.deliver_push": {"rate_limit": "1000/m"},
    },
    
    # Result expiration
    result_expires=3600,  # 1 hour
    
    # Beat schedule for periodic tasks
    beat_schedule={
        "cleanup-old-notifications": {
            "task": "app.workers.cleanup_tasks.cleanup_old_notifications",
            "schedule": timedelta(hours=24),  # Run daily
        },
        "process-scheduled-notifications": {
            "task": "app.workers.notification_tasks.process_scheduled_notifications",
            "schedule": timedelta(minutes=5),  # Every 5 minutes
        },
        "update-engagement-analytics": {
            "task": "app.workers.analytics_tasks.update_engagement_analytics",
            "schedule": timedelta(hours=1),  # Hourly
        },
        "optimize-user-timing": {
            "task": "app.workers.notification_tasks.optimize_user_timing",
            "schedule": timedelta(hours=6),  # Every 6 hours
        },
    },
)

# Error handling
celery_app.conf.task_soft_time_limit = 300  # 5 minutes
celery_app.conf.task_time_limit = 600  # 10 minutes