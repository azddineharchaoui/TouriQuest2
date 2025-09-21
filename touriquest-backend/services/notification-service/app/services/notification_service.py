"""
Core notification service with smart features and logic.
"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from uuid import UUID, uuid4
import json
from collections import defaultdict, deque

from app.models.schemas import (
    NotificationRequest, Notification, NotificationPreferences, NotificationStatus,
    DeliveryChannel, NotificationType, TimingStrategy, NotificationPriority,
    FrequencyType, UserBehaviorData, NotificationGroup, PersonalizationContext
)

logger = logging.getLogger(__name__)


class FrequencyManager:
    """Manages frequency capping for notifications."""
    
    def __init__(self):
        self.user_counts = defaultdict(lambda: defaultdict(int))  # user_id -> frequency_type -> count
        self.last_reset = defaultdict(dict)  # user_id -> frequency_type -> last_reset_time
    
    async def check_frequency_limit(
        self, 
        user_id: UUID, 
        preferences: NotificationPreferences
    ) -> bool:
        """Check if user has exceeded frequency limits."""
        now = datetime.utcnow()
        user_id_str = str(user_id)
        
        for freq_type, limit in preferences.frequency_caps.items():
            # Reset counters if period has passed
            if user_id_str in self.last_reset and freq_type in self.last_reset[user_id_str]:
                last_reset = self.last_reset[user_id_str][freq_type]
                
                if freq_type == FrequencyType.DAILY and (now - last_reset).days >= 1:
                    self.user_counts[user_id_str][freq_type] = 0
                    self.last_reset[user_id_str][freq_type] = now
                elif freq_type == FrequencyType.WEEKLY and (now - last_reset).days >= 7:
                    self.user_counts[user_id_str][freq_type] = 0
                    self.last_reset[user_id_str][freq_type] = now
                elif freq_type == FrequencyType.MONTHLY and (now - last_reset).days >= 30:
                    self.user_counts[user_id_str][freq_type] = 0
                    self.last_reset[user_id_str][freq_type] = now
            else:
                # Initialize reset time
                if user_id_str not in self.last_reset:
                    self.last_reset[user_id_str] = {}
                self.last_reset[user_id_str][freq_type] = now
            
            # Check limit
            current_count = self.user_counts[user_id_str][freq_type]
            if current_count >= limit:
                logger.warning(f"Frequency limit exceeded for user {user_id}: {freq_type} = {current_count}/{limit}")
                return False
        
        return True
    
    async def increment_count(self, user_id: UUID, frequency_types: List[FrequencyType]):
        """Increment frequency counters for user."""
        user_id_str = str(user_id)
        for freq_type in frequency_types:
            self.user_counts[user_id_str][freq_type] += 1


class TimingOptimizer:
    """Optimizes notification timing based on user behavior."""
    
    def __init__(self):
        self.user_behavior_data = {}  # user_id -> UserBehaviorData
        self.optimal_times_cache = {}  # user_id -> channel -> optimal_hours
    
    async def get_optimal_send_time(
        self,
        user_id: UUID,
        channel: DeliveryChannel,
        timing_strategy: TimingStrategy,
        user_timezone: str = "UTC",
        scheduled_at: Optional[datetime] = None
    ) -> datetime:
        """Calculate optimal send time for notification."""
        
        if timing_strategy == TimingStrategy.IMMEDIATE:
            return datetime.utcnow()
        
        if timing_strategy == TimingStrategy.SCHEDULED and scheduled_at:
            return scheduled_at
        
        user_id_str = str(user_id)
        now = datetime.utcnow()
        
        # Get user behavior data
        behavior_data = self.user_behavior_data.get(user_id_str)
        
        if timing_strategy == TimingStrategy.OPTIMAL and behavior_data:
            # Use ML-predicted optimal time
            optimal_hours = behavior_data.engagement_rates.get(channel.value, [])
            if optimal_hours:
                # Find next optimal hour
                current_hour = now.hour
                next_optimal_hour = min([h for h in optimal_hours if h > current_hour], default=optimal_hours[0])
                
                # Calculate next optimal time
                if next_optimal_hour > current_hour:
                    optimal_time = now.replace(hour=next_optimal_hour, minute=0, second=0, microsecond=0)
                else:
                    # Next day
                    optimal_time = (now + timedelta(days=1)).replace(
                        hour=next_optimal_hour, minute=0, second=0, microsecond=0
                    )
                
                return optimal_time
        
        # Fallback strategies
        if timing_strategy == TimingStrategy.BUSINESS_HOURS:
            # Send during business hours (9 AM - 5 PM)
            if now.hour < 9:
                return now.replace(hour=9, minute=0, second=0, microsecond=0)
            elif now.hour >= 17:
                return (now + timedelta(days=1)).replace(hour=9, minute=0, second=0, microsecond=0)
            else:
                return now
        
        if timing_strategy == TimingStrategy.USER_ACTIVE_HOURS and behavior_data:
            # Send during user's typical active hours
            active_hours = behavior_data.active_hours or [9, 10, 11, 12, 13, 14, 15, 16, 17]
            current_hour = now.hour
            
            if current_hour in active_hours:
                return now
            else:
                # Find next active hour
                next_active_hour = min([h for h in active_hours if h > current_hour], default=active_hours[0])
                if next_active_hour > current_hour:
                    return now.replace(hour=next_active_hour, minute=0, second=0, microsecond=0)
                else:
                    return (now + timedelta(days=1)).replace(
                        hour=next_active_hour, minute=0, second=0, microsecond=0
                    )
        
        # Default: send immediately
        return now
    
    async def update_user_behavior(self, user_id: UUID, behavior_data: UserBehaviorData):
        """Update user behavior data for optimization."""
        self.user_behavior_data[str(user_id)] = behavior_data
    
    async def learn_from_engagement(
        self,
        user_id: UUID,
        channel: DeliveryChannel,
        sent_at: datetime,
        engaged: bool,
        response_time: Optional[float] = None
    ):
        """Learn from user engagement to improve timing."""
        user_id_str = str(user_id)
        
        if user_id_str not in self.user_behavior_data:
            self.user_behavior_data[user_id_str] = UserBehaviorData(user_id=user_id)
        
        behavior = self.user_behavior_data[user_id_str]
        
        # Update active hours based on engagement
        hour = sent_at.hour
        if engaged and hour not in behavior.active_hours:
            behavior.active_hours.append(hour)
            behavior.active_hours.sort()
        
        # Update engagement rates
        channel_key = channel.value
        current_rate = behavior.engagement_rates.get(channel_key, 0.5)
        
        # Simple exponential moving average
        alpha = 0.1
        new_rate = alpha * (1.0 if engaged else 0.0) + (1 - alpha) * current_rate
        behavior.engagement_rates[channel_key] = new_rate
        
        # Update response times
        if response_time is not None:
            current_response_time = behavior.response_times.get(channel_key, 0.0)
            new_response_time = alpha * response_time + (1 - alpha) * current_response_time
            behavior.response_times[channel_key] = new_response_time
        
        behavior.updated_at = datetime.utcnow()


class NotificationGrouper:
    """Groups related notifications for bundling."""
    
    def __init__(self):
        self.pending_groups = defaultdict(list)  # user_id -> List[Notification]
        self.group_rules = {
            "daily_digest": {
                "types": [
                    NotificationType.PERSONALIZED_RECOMMENDATION,
                    NotificationType.PRICE_DROP_ALERT
                ],
                "max_age_hours": 24,
                "min_count": 3,
                "max_count": 10
            },
            "trip_updates": {
                "types": [
                    NotificationType.BOOKING_UPDATE,
                    NotificationType.ITINERARY_UPDATE,
                    NotificationType.TRAVEL_REMINDER
                ],
                "max_age_hours": 6,
                "min_count": 2,
                "max_count": 5
            }
        }
    
    async def should_group_notification(self, notification: Notification) -> bool:
        """Determine if notification should be grouped."""
        # Only group non-urgent notifications
        if notification.priority in [NotificationPriority.HIGH, NotificationPriority.URGENT]:
            return False
        
        # Check if notification type is groupable
        for group_type, rules in self.group_rules.items():
            if notification.notification_type in rules["types"]:
                return True
        
        return False
    
    async def add_to_group(self, notification: Notification):
        """Add notification to appropriate group."""
        user_id_str = str(notification.user_id)
        self.pending_groups[user_id_str].append(notification)
    
    async def get_ready_groups(self) -> List[NotificationGroup]:
        """Get groups that are ready to be sent."""
        ready_groups = []
        now = datetime.utcnow()
        
        for user_id_str, notifications in self.pending_groups.items():
            if not notifications:
                continue
            
            # Group notifications by type
            type_groups = defaultdict(list)
            for notif in notifications:
                for group_type, rules in self.group_rules.items():
                    if notif.notification_type in rules["types"]:
                        type_groups[group_type].append(notif)
                        break
            
            for group_type, group_notifications in type_groups.items():
                rules = self.group_rules[group_type]
                
                # Check if group is ready
                if len(group_notifications) >= rules["min_count"]:
                    # Check age of oldest notification
                    oldest = min(group_notifications, key=lambda n: n.created_at)
                    age_hours = (now - oldest.created_at).total_seconds() / 3600
                    
                    if age_hours >= rules["max_age_hours"] or len(group_notifications) >= rules["max_count"]:
                        # Create group
                        group = NotificationGroup(
                            id=uuid4(),
                            user_id=UUID(user_id_str),
                            group_type=group_type,
                            notifications=[n.id for n in group_notifications[:rules["max_count"]]],
                            bundled_content=await self._create_bundled_content(group_notifications[:rules["max_count"]]),
                            delivery_channel=DeliveryChannel.EMAIL,  # Default for groups
                            scheduled_at=now
                        )
                        ready_groups.append(group)
                        
                        # Remove grouped notifications
                        for notif in group_notifications[:rules["max_count"]]:
                            self.pending_groups[user_id_str].remove(notif)
        
        return ready_groups
    
    async def _create_bundled_content(self, notifications: List[Notification]):
        """Create bundled content from multiple notifications."""
        from app.models.schemas import NotificationContent
        
        if not notifications:
            return NotificationContent(subject="", body="")
        
        # Group by type for better organization
        type_groups = defaultdict(list)
        for notif in notifications:
            type_groups[notif.notification_type].append(notif)
        
        # Create subject
        subject_parts = []
        if len(type_groups) == 1:
            notif_type = list(type_groups.keys())[0]
            count = len(notifications)
            subject_parts.append(f"{count} {notif_type.replace('_', ' ').title()}")
        else:
            subject_parts.append(f"{len(notifications)} Updates from TouriQuest")
        
        subject = " | ".join(subject_parts)
        
        # Create body
        body_parts = ["Here's your summary of recent updates:\n"]
        
        for notif_type, notifs in type_groups.items():
            body_parts.append(f"\n**{notif_type.replace('_', ' ').title()}:**")
            for notif in notifs:
                body_parts.append(f"• {notif.content.subject}")
        
        body_parts.append("\nVisit TouriQuest to see more details.")
        
        return NotificationContent(
            subject=subject,
            body="\n".join(body_parts),
            metadata={"grouped_count": len(notifications)}
        )


class PersonalizationEngine:
    """Personalizes notification content."""
    
    def __init__(self):
        self.user_profiles = {}  # user_id -> profile data
    
    async def personalize_content(
        self,
        notification: Notification,
        user_preferences: NotificationPreferences
    ) -> Notification:
        """Personalize notification content based on user data."""
        
        # Get user context
        context = notification.context
        
        # Personalize subject
        personalized_subject = await self._personalize_text(
            notification.content.subject,
            context,
            user_preferences
        )
        
        # Personalize body
        personalized_body = await self._personalize_text(
            notification.content.body,
            context,
            user_preferences
        )
        
        # Update notification content
        notification.content.subject = personalized_subject
        notification.content.body = personalized_body
        
        # Add personalization metadata
        notification.content.metadata["personalized"] = True
        notification.content.metadata["user_language"] = context.user_language
        
        return notification
    
    async def _personalize_text(
        self,
        text: str,
        context: PersonalizationContext,
        preferences: NotificationPreferences
    ) -> str:
        """Personalize text content."""
        
        # Simple personalization rules
        personalized = text
        
        # Add user's preferred language context
        if context.user_language != "en":
            # In a real implementation, you'd translate the text
            personalized = f"[{context.user_language.upper()}] {personalized}"
        
        # Add location context
        if context.location:
            # Add location-relevant information
            pass
        
        # Add time-based greetings
        now = datetime.utcnow()
        hour = now.hour
        
        if "greeting" in text.lower():
            if 5 <= hour < 12:
                greeting = "Good morning"
            elif 12 <= hour < 17:
                greeting = "Good afternoon"
            else:
                greeting = "Good evening"
            
            personalized = personalized.replace("greeting", greeting)
        
        return personalized
    
    async def update_user_profile(self, user_id: UUID, profile_data: Dict[str, Any]):
        """Update user profile for personalization."""
        self.user_profiles[str(user_id)] = profile_data


class NotificationService:
    """Main notification service with smart features."""
    
    def __init__(self):
        self.frequency_manager = FrequencyManager()
        self.timing_optimizer = TimingOptimizer()
        self.grouper = NotificationGrouper()
        self.personalizer = PersonalizationEngine()
        self.pending_notifications = deque()
        self.preferences_cache = {}  # user_id -> NotificationPreferences
        
    async def create_notification(self, request: NotificationRequest) -> Notification:
        """Create a notification from a request."""
        
        # Get user preferences
        preferences = await self.get_user_preferences(request.user_id)
        
        # Check if notification type is disabled
        if request.notification_type in preferences.disabled_types:
            raise ValueError(f"Notification type {request.notification_type} is disabled for user")
        
        # Check frequency limits
        if not await self.frequency_manager.check_frequency_limit(request.user_id, preferences):
            raise ValueError("Frequency limit exceeded for user")
        
        # Filter channels based on preferences
        allowed_channels = [ch for ch in request.channels if ch in preferences.enabled_channels]
        if not allowed_channels:
            # Use default channels if none specified
            allowed_channels = preferences.enabled_channels[:1]  # Use first preferred channel
        
        # Create notification
        notification = Notification(
            id=uuid4(),
            user_id=request.user_id,
            notification_type=request.notification_type,
            content=request.content,
            channels=allowed_channels,
            priority=request.priority,
            timing_strategy=request.timing_strategy,
            scheduled_at=request.scheduled_at,
            expires_at=request.expires_at,
            context=request.context,
            campaign_id=request.campaign_id,
            template_id=request.template_id,
            template_variables=request.template_variables,
            tracking_data=request.tracking_data
        )
        
        # Personalize content
        notification = await self.personalizer.personalize_content(notification, preferences)
        
        # Optimize timing
        if not notification.scheduled_at:
            optimal_time = await self.timing_optimizer.get_optimal_send_time(
                request.user_id,
                allowed_channels[0],  # Use first channel for timing optimization
                request.timing_strategy,
                request.context.user_timezone or "UTC"
            )
            notification.scheduled_at = optimal_time
        
        # Check if should be grouped
        if await self.grouper.should_group_notification(notification):
            await self.grouper.add_to_group(notification)
            notification.status = NotificationStatus.QUEUED
        else:
            # Add to pending queue
            self.pending_notifications.append(notification)
        
        # Update frequency counters
        await self.frequency_manager.increment_count(
            request.user_id,
            [FrequencyType.DAILY, FrequencyType.WEEKLY, FrequencyType.MONTHLY]
        )
        
        return notification
    
    async def get_user_preferences(self, user_id: UUID) -> NotificationPreferences:
        """Get user notification preferences."""
        user_id_str = str(user_id)
        
        if user_id_str not in self.preferences_cache:
            # In a real implementation, load from database
            # For now, return default preferences
            self.preferences_cache[user_id_str] = NotificationPreferences(user_id=user_id)
        
        return self.preferences_cache[user_id_str]
    
    async def update_user_preferences(
        self,
        user_id: UUID,
        preferences: NotificationPreferences
    ):
        """Update user notification preferences."""
        self.preferences_cache[str(user_id)] = preferences
    
    async def get_pending_notifications(self, limit: int = 100) -> List[Notification]:
        """Get pending notifications ready for delivery."""
        now = datetime.utcnow()
        ready_notifications = []
        
        # Get individual notifications
        temp_queue = deque()
        while self.pending_notifications and len(ready_notifications) < limit:
            notification = self.pending_notifications.popleft()
            
            # Check if ready to send
            if notification.scheduled_at <= now:
                if notification.expires_at is None or notification.expires_at > now:
                    ready_notifications.append(notification)
                else:
                    # Expired notification
                    notification.status = NotificationStatus.CANCELLED
            else:
                # Put back in queue
                temp_queue.append(notification)
        
        # Put remaining notifications back
        while temp_queue:
            self.pending_notifications.appendleft(temp_queue.pop())
        
        # Get ready groups
        ready_groups = await self.grouper.get_ready_groups()
        # Convert groups to notifications (simplified)
        for group in ready_groups:
            group_notification = Notification(
                id=group.id,
                user_id=group.user_id,
                notification_type=NotificationType.SYSTEM_ANNOUNCEMENT,  # Groups are announcements
                content=group.bundled_content,
                channels=[group.delivery_channel],
                priority=NotificationPriority.NORMAL,
                timing_strategy=TimingStrategy.IMMEDIATE,
                scheduled_at=group.scheduled_at,
                context=PersonalizationContext()
            )
            ready_notifications.append(group_notification)
        
        return ready_notifications
    
    async def mark_notification_status(
        self,
        notification_id: UUID,
        status: NotificationStatus,
        channel: Optional[DeliveryChannel] = None,
        error_message: Optional[str] = None
    ):
        """Mark notification with delivery status."""
        # In a real implementation, update database
        # For now, just log
        logger.info(f"Notification {notification_id} marked as {status} for channel {channel}")
        
        if error_message:
            logger.error(f"Notification {notification_id} failed: {error_message}")
    
    async def track_engagement(
        self,
        notification_id: UUID,
        user_id: UUID,
        action: str,  # "opened", "clicked", "unsubscribed"
        channel: DeliveryChannel,
        timestamp: datetime
    ):
        """Track user engagement with notification."""
        
        # Learn from engagement for timing optimization
        if action == "opened":
            await self.timing_optimizer.learn_from_engagement(
                user_id, channel, timestamp, True
            )
        
        # Update user behavior data
        # In a real implementation, update database and ML models
        logger.info(f"User {user_id} {action} notification {notification_id} via {channel}")


# Global service instance
notification_service = NotificationService()