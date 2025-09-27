"""
Notifications API endpoints for comprehensive notification system
Handles user notifications, settings, and push notification management
"""

from typing import List, Optional, Dict, Any, Union
from datetime import datetime, timedelta
import logging
from uuid import UUID
from enum import Enum

from fastapi import APIRouter, Depends, HTTPException, Query, Body, status
from fastapi.security import HTTPBearer
from pydantic import BaseModel, Field, validator
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.notification_models import Notification, NotificationType, NotificationStatus, NotificationPriority, NotificationChannel
from app.services.notification_service import notification_service
from app.services.push_service import push_service
from app.core.auth import get_current_user
from app.core.permissions import require_permissions

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/notifications", tags=["notifications"])
security = HTTPBearer()


# Pydantic models
class NotificationResponse(BaseModel):
    """Response model for notification data"""
    id: str
    user_id: str
    title: str
    message: str
    notification_type: NotificationType
    priority: NotificationPriority
    status: NotificationStatus
    channel: NotificationChannel
    
    # Content and media
    data: Dict[str, Any]
    icon_url: Optional[str]
    image_url: Optional[str]
    action_url: Optional[str]
    action_text: Optional[str]
    
    # Interaction tracking
    read_at: Optional[datetime]
    clicked_at: Optional[datetime]
    dismissed_at: Optional[datetime]
    
    # Scheduling and expiry
    scheduled_for: Optional[datetime]
    expires_at: Optional[datetime]
    
    # Timestamps
    created_at: datetime
    updated_at: datetime
    sent_at: Optional[datetime]
    
    # Delivery tracking
    delivery_status: str
    delivery_attempts: int
    last_delivery_attempt: Optional[datetime]
    
    # Grouping and categorization
    group_key: Optional[str]
    category: Optional[str]
    tags: List[str]

    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    """Response model for notifications list"""
    notifications: List[NotificationResponse]
    total_count: int
    unread_count: int
    has_more: bool
    next_cursor: Optional[str]


class NotificationCreateRequest(BaseModel):
    """Request model for creating notifications (admin only)"""
    user_ids: List[str] = Field(..., description="Target user IDs")
    title: str = Field(..., min_length=1, max_length=200)
    message: str = Field(..., min_length=1, max_length=1000)
    notification_type: NotificationType
    priority: NotificationPriority = NotificationPriority.NORMAL
    channels: List[NotificationChannel] = Field(default_factory=list)
    
    # Content and media
    data: Dict[str, Any] = Field(default_factory=dict)
    icon_url: Optional[str] = None
    image_url: Optional[str] = None
    action_url: Optional[str] = None
    action_text: Optional[str] = None
    
    # Scheduling
    scheduled_for: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    
    # Grouping
    group_key: Optional[str] = None
    category: Optional[str] = None
    tags: List[str] = Field(default_factory=list)


class NotificationSettingsResponse(BaseModel):
    """Response model for notification settings"""
    user_id: str
    
    # Channel preferences
    email_enabled: bool
    push_enabled: bool
    sms_enabled: bool
    in_app_enabled: bool
    
    # Type-specific settings
    booking_notifications: bool
    promotion_notifications: bool
    security_notifications: bool
    system_notifications: bool
    recommendation_notifications: bool
    
    # Timing preferences
    quiet_hours_enabled: bool
    quiet_hours_start: Optional[str]  # HH:MM format
    quiet_hours_end: Optional[str]    # HH:MM format
    timezone: str
    
    # Frequency settings
    digest_enabled: bool
    digest_frequency: str  # daily, weekly, monthly
    digest_time: str       # HH:MM format
    
    # Advanced settings
    smart_filtering: bool  # AI-powered relevance filtering
    location_based: bool   # Location-based notifications
    behavior_based: bool   # Behavior-based timing
    
    updated_at: datetime

    class Config:
        from_attributes = True


class NotificationSettingsUpdateRequest(BaseModel):
    """Request model for updating notification settings"""
    # Channel preferences
    email_enabled: Optional[bool] = None
    push_enabled: Optional[bool] = None
    sms_enabled: Optional[bool] = None
    in_app_enabled: Optional[bool] = None
    
    # Type-specific settings
    booking_notifications: Optional[bool] = None
    promotion_notifications: Optional[bool] = None
    security_notifications: Optional[bool] = None
    system_notifications: Optional[bool] = None
    recommendation_notifications: Optional[bool] = None
    
    # Timing preferences
    quiet_hours_enabled: Optional[bool] = None
    quiet_hours_start: Optional[str] = Field(None, regex=r"^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$")
    quiet_hours_end: Optional[str] = Field(None, regex=r"^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$")
    timezone: Optional[str] = None
    
    # Frequency settings
    digest_enabled: Optional[bool] = None
    digest_frequency: Optional[str] = Field(None, regex=r"^(daily|weekly|monthly)$")
    digest_time: Optional[str] = Field(None, regex=r"^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$")
    
    # Advanced settings
    smart_filtering: Optional[bool] = None
    location_based: Optional[bool] = None
    behavior_based: Optional[bool] = None


class PushSubscriptionRequest(BaseModel):
    """Request model for push notification subscription"""
    endpoint: str
    keys: Dict[str, str]  # p256dh and auth keys
    device_type: str = Field(..., regex=r"^(web|ios|android)$")
    device_name: Optional[str] = None
    user_agent: Optional[str] = None


class BulkNotificationRequest(BaseModel):
    """Request model for bulk notifications"""
    filter_criteria: Dict[str, Any]  # User filtering criteria
    notification: NotificationCreateRequest


class NotificationStatsResponse(BaseModel):
    """Response model for notification statistics"""
    total_sent: int
    total_delivered: int
    total_read: int
    total_clicked: int
    
    delivery_rate: float
    read_rate: float
    click_rate: float
    
    by_channel: Dict[str, Dict[str, int]]
    by_type: Dict[str, Dict[str, int]]
    by_priority: Dict[str, Dict[str, int]]
    
    engagement_trends: List[Dict[str, Any]]
    optimal_send_times: Dict[str, List[str]]


@router.get("/", response_model=NotificationListResponse)
async def get_notifications(
    cursor: Optional[str] = Query(None, description="Pagination cursor"),
    limit: int = Query(20, ge=1, le=100, description="Number of notifications to return"),
    status: Optional[NotificationStatus] = Query(None, description="Filter by status"),
    notification_type: Optional[NotificationType] = Query(None, description="Filter by type"),
    priority: Optional[NotificationPriority] = Query(None, description="Filter by priority"),
    unread_only: bool = Query(False, description="Show only unread notifications"),
    category: Optional[str] = Query(None, description="Filter by category"),
    days: int = Query(30, ge=1, le=365, description="Number of days to look back"),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get user notifications with comprehensive filtering
    
    Features:
    - Multi-criteria filtering (status, type, priority, category)
    - Cursor-based pagination for performance
    - Unread count tracking
    - Real-time updates via WebSocket
    - Smart grouping of related notifications
    - Rich content support (images, actions)
    """
    try:
        filters = {
            "user_id": current_user.id,
            "cursor": cursor,
            "limit": limit,
            "status": status,
            "notification_type": notification_type,
            "priority": priority,
            "unread_only": unread_only,
            "category": category,
            "days": days
        }
        
        result = await notification_service.get_user_notifications(db, **filters)
        
        return NotificationListResponse(
            notifications=[NotificationResponse.from_orm(notif) for notif in result["notifications"]],
            total_count=result["total_count"],
            unread_count=result["unread_count"],
            has_more=result["has_more"],
            next_cursor=result["next_cursor"]
        )
        
    except Exception as e:
        logger.error(f"Error getting notifications: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve notifications"
        )


@router.post("/", response_model=NotificationResponse)
@require_permissions(["admin", "support_agent"])
async def create_notification(
    notification_data: NotificationCreateRequest,
    send_immediately: bool = Query(True, description="Send notification immediately"),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Create and send notification (admin only)
    
    Features:
    - Multi-user targeting with advanced filtering
    - Multi-channel delivery (email, push, SMS, in-app)
    - Rich content support with images and actions
    - Scheduled delivery with timezone awareness
    - Template system for consistent branding
    - A/B testing for notification optimization
    """
    try:
        # Validate user IDs
        valid_users = await notification_service.validate_user_ids(
            db, notification_data.user_ids
        )
        
        if len(valid_users) != len(notification_data.user_ids):
            invalid_users = set(notification_data.user_ids) - set(valid_users)
            logger.warning(f"Invalid user IDs: {invalid_users}")
        
        # Create notification for each user
        notifications = []
        for user_id in valid_users:
            notif_dict = notification_data.dict()
            notif_dict["user_id"] = user_id
            notif_dict["created_by"] = current_user.id
            
            notification = await notification_service.create_notification(db, notif_dict)
            notifications.append(notification)
        
        # Send immediately if requested
        if send_immediately:
            await notification_service.send_notifications(notifications)
        
        return NotificationResponse.from_orm(notifications[0]) if notifications else None
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating notification: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create notification"
        )


@router.put("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Mark notification as read
    
    Features:
    - Timestamp tracking for analytics
    - Real-time unread count updates
    - Cross-device synchronization
    - Engagement tracking
    """
    try:
        result = await notification_service.mark_as_read(
            db, notification_id, current_user.id
        )
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found"
            )
        
        # Update real-time unread count
        await notification_service.broadcast_unread_count_update(current_user.id)
        
        return {"message": "Notification marked as read"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking notification {notification_id} as read: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to mark notification as read"
        )


@router.put("/read-all")
async def mark_all_notifications_read(
    category: Optional[str] = Query(None, description="Mark all in category as read"),
    notification_type: Optional[NotificationType] = Query(None, description="Mark all of type as read"),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Mark all notifications as read
    
    Features:
    - Bulk read marking with filtering
    - Category and type-specific bulk actions
    - Efficient batch processing
    - Real-time updates
    """
    try:
        filters = {
            "user_id": current_user.id,
            "category": category,
            "notification_type": notification_type
        }
        
        marked_count = await notification_service.mark_all_as_read(db, **filters)
        
        # Update real-time unread count
        await notification_service.broadcast_unread_count_update(current_user.id)
        
        return {
            "message": "Notifications marked as read",
            "marked_count": marked_count
        }
        
    except Exception as e:
        logger.error(f"Error marking all notifications as read: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to mark all notifications as read"
        )


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Delete notification
    
    Features:
    - Soft delete with recovery option
    - User-specific deletion (doesn't affect other users)
    - Cleanup of related data
    """
    try:
        result = await notification_service.delete_notification(
            db, notification_id, current_user.id
        )
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found"
            )
        
        return {"message": "Notification deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting notification {notification_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete notification"
        )


@router.get("/settings", response_model=NotificationSettingsResponse)
async def get_notification_settings(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get user notification settings
    
    Features:
    - Comprehensive preference management
    - Channel-specific settings
    - Timing and frequency preferences
    - Smart filtering options
    - Timezone-aware configurations
    """
    try:
        settings = await notification_service.get_user_settings(db, current_user.id)
        
        if not settings:
            # Create default settings for new user
            settings = await notification_service.create_default_settings(db, current_user.id)
        
        return NotificationSettingsResponse.from_orm(settings)
        
    except Exception as e:
        logger.error(f"Error getting notification settings: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve notification settings"
        )


@router.put("/settings", response_model=NotificationSettingsResponse)
async def update_notification_settings(
    settings_data: NotificationSettingsUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Update user notification settings
    
    Features:
    - Granular preference control
    - Validation of time formats and timezones
    - Real-time preference synchronization
    - Smart defaults for new settings
    """
    try:
        # Validate timezone if provided
        if settings_data.timezone:
            valid_timezone = await notification_service.validate_timezone(settings_data.timezone)
            if not valid_timezone:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid timezone"
                )
        
        # Update settings
        updated_settings = await notification_service.update_user_settings(
            db, current_user.id, settings_data.dict(exclude_unset=True)
        )
        
        # Broadcast settings change for real-time updates
        await notification_service.broadcast_settings_update(current_user.id, updated_settings)
        
        return NotificationSettingsResponse.from_orm(updated_settings)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating notification settings: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update notification settings"
        )


@router.post("/push/subscribe")
async def subscribe_to_push_notifications(
    subscription_data: PushSubscriptionRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Subscribe to push notifications
    
    Features:
    - Multi-device subscription management
    - Secure key exchange and validation
    - Device fingerprinting for security
    - Subscription renewal handling
    """
    try:
        # Validate subscription data
        is_valid = await push_service.validate_subscription(subscription_data.dict())
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid push subscription data"
            )
        
        # Create or update subscription
        subscription = await push_service.create_subscription(
            db, current_user.id, subscription_data.dict()
        )
        
        # Send welcome push notification
        await push_service.send_welcome_notification(subscription)
        
        return {
            "message": "Successfully subscribed to push notifications",
            "subscription_id": subscription.id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error subscribing to push notifications: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to subscribe to push notifications"
        )


@router.delete("/push/unsubscribe")
async def unsubscribe_from_push_notifications(
    device_endpoint: str = Query(..., description="Push subscription endpoint"),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Unsubscribe from push notifications
    
    Features:
    - Device-specific unsubscription
    - Graceful cleanup of subscription data
    - Confirmation notification
    """
    try:
        result = await push_service.remove_subscription(
            db, current_user.id, device_endpoint
        )
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Push subscription not found"
            )
        
        return {"message": "Successfully unsubscribed from push notifications"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error unsubscribing from push notifications: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to unsubscribe from push notifications"
        )


@router.get("/unread-count", response_model=Dict[str, int])
async def get_unread_count(
    by_category: bool = Query(False, description="Get count by category"),
    by_type: bool = Query(False, description="Get count by notification type"),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get unread notification count
    
    Features:
    - Total unread count
    - Category and type breakdown
    - Real-time updates via WebSocket
    - Priority-based counting
    """
    try:
        counts = await notification_service.get_unread_counts(
            db, current_user.id, by_category, by_type
        )
        
        return counts
        
    except Exception as e:
        logger.error(f"Error getting unread count: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get unread count"
        )


@router.post("/test")
@require_permissions(["admin"])
async def send_test_notification(
    test_type: str = Query(..., regex=r"^(email|push|sms|in_app)$"),
    target_user_id: Optional[str] = Query(None, description="User to send test to"),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Send test notification (admin only)
    
    Features:
    - Multi-channel testing
    - Template validation
    - Delivery confirmation
    - Performance metrics
    """
    try:
        user_id = target_user_id or current_user.id
        
        # Create test notification
        test_notification = await notification_service.create_test_notification(
            db, user_id, test_type, current_user.id
        )
        
        # Send test
        result = await notification_service.send_test_notification(
            test_notification, test_type
        )
        
        return {
            "message": f"Test {test_type} notification sent",
            "delivery_id": result.get("delivery_id"),
            "status": result.get("status")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending test notification: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send test notification"
        )


@router.post("/bulk")
@require_permissions(["admin"])
async def send_bulk_notification(
    bulk_request: BulkNotificationRequest,
    preview_only: bool = Query(False, description="Preview targeting without sending"),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Send bulk notifications with advanced targeting
    
    Features:
    - Advanced user filtering and segmentation
    - A/B testing with control groups
    - Delivery scheduling and throttling
    - Performance monitoring and analytics
    """
    try:
        # Get target users based on criteria
        target_users = await notification_service.get_users_by_criteria(
            db, bulk_request.filter_criteria
        )
        
        if preview_only:
            return {
                "message": "Bulk notification preview",
                "target_count": len(target_users),
                "estimated_delivery_time": await notification_service.estimate_delivery_time(
                    len(target_users)
                )
            }
        
        # Create and send bulk notification
        bulk_job = await notification_service.create_bulk_notification(
            db, target_users, bulk_request.notification, current_user.id
        )
        
        return {
            "message": "Bulk notification job created",
            "job_id": bulk_job.id,
            "target_count": len(target_users),
            "estimated_completion": bulk_job.estimated_completion
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending bulk notification: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send bulk notification"
        )


@router.get("/analytics", response_model=NotificationStatsResponse)
@require_permissions(["admin", "support_agent"])
async def get_notification_analytics(
    days: int = Query(30, ge=1, le=365),
    user_id: Optional[str] = Query(None, description="Filter by user"),
    notification_type: Optional[NotificationType] = Query(None, description="Filter by type"),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get notification analytics and performance metrics
    
    Features:
    - Delivery and engagement statistics
    - Channel performance comparison
    - User engagement trends
    - Optimal timing analysis
    - A/B testing results
    """
    try:
        analytics = await notification_service.get_analytics(
            db, days, user_id, notification_type
        )
        
        return NotificationStatsResponse(**analytics)
        
    except Exception as e:
        logger.error(f"Error getting notification analytics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve notification analytics"
        )