"""
Analytics system for notification performance tracking and reporting.
"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from collections import defaultdict, Counter
import json
from dataclasses import asdict
from enum import Enum

from app.models.schemas import (
    NotificationAnalytics, NotificationStatus, DeliveryChannel,
    NotificationType, EngagementMetrics, PerformanceReport
)

logger = logging.getLogger(__name__)


class MetricType(Enum):
    """Types of metrics to track."""
    DELIVERY_RATE = "delivery_rate"
    OPEN_RATE = "open_rate"
    CLICK_RATE = "click_rate"
    CONVERSION_RATE = "conversion_rate"
    BOUNCE_RATE = "bounce_rate"
    UNSUBSCRIBE_RATE = "unsubscribe_rate"
    RESPONSE_TIME = "response_time"
    ENGAGEMENT_SCORE = "engagement_score"


class TimeWindow(Enum):
    """Time windows for analytics aggregation."""
    HOURLY = "hourly"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


class AnalyticsCollector:
    """Collects and processes notification analytics data."""
    
    def __init__(self):
        self.metrics_cache = defaultdict(list)
        self.aggregated_metrics = defaultdict(dict)
        self.real_time_stats = defaultdict(int)
    
    async def track_notification_sent(
        self,
        notification_id: str,
        user_id: str,
        notification_type: NotificationType,
        channels: List[DeliveryChannel],
        sent_at: datetime
    ):
        """Track when a notification is sent."""
        
        analytics = NotificationAnalytics(
            notification_id=notification_id,
            user_id=user_id,
            notification_type=notification_type,
            channel=channels[0] if channels else DeliveryChannel.EMAIL,  # Primary channel
            sent_at=sent_at,
            status=NotificationStatus.SENT
        )
        
        # Store analytics record
        await self._store_analytics_record(analytics)
        
        # Update real-time counters
        self.real_time_stats["notifications_sent"] += 1
        self.real_time_stats[f"sent_{notification_type.value}"] += 1
        
        for channel in channels:
            self.real_time_stats[f"sent_{channel.value}"] += 1
        
        logger.debug(f"Tracked notification sent: {notification_id}")
    
    async def track_notification_delivered(
        self,
        notification_id: str,
        channel: DeliveryChannel,
        delivered_at: datetime,
        delivery_details: Dict[str, Any] = None
    ):
        """Track when a notification is successfully delivered."""
        
        # Update analytics record
        await self._update_analytics_record(
            notification_id,
            {
                "status": NotificationStatus.DELIVERED,
                "delivered_at": delivered_at,
                "delivery_details": delivery_details or {}
            }
        )
        
        # Update real-time counters
        self.real_time_stats["notifications_delivered"] += 1
        self.real_time_stats[f"delivered_{channel.value}"] += 1
        
        logger.debug(f"Tracked notification delivered: {notification_id} via {channel.value}")
    
    async def track_notification_opened(
        self,
        notification_id: str,
        user_id: str,
        opened_at: datetime,
        user_agent: str = None,
        ip_address: str = None
    ):
        """Track when a user opens/views a notification."""
        
        # Update analytics record
        await self._update_analytics_record(
            notification_id,
            {
                "opened_at": opened_at,
                "user_agent": user_agent,
                "ip_address": ip_address
            }
        )
        
        # Update real-time counters
        self.real_time_stats["notifications_opened"] += 1
        
        # Calculate response time
        analytics = await self._get_analytics_record(notification_id)
        if analytics and analytics.sent_at:
            response_time = (opened_at - analytics.sent_at).total_seconds() / 60  # minutes
            await self._track_response_time(notification_id, response_time)
        
        logger.debug(f"Tracked notification opened: {notification_id}")
    
    async def track_notification_clicked(
        self,
        notification_id: str,
        user_id: str,
        clicked_at: datetime,
        action_taken: str = None,
        click_url: str = None
    ):
        """Track when a user clicks on a notification action."""
        
        # Update analytics record
        await self._update_analytics_record(
            notification_id,
            {
                "clicked_at": clicked_at,
                "action_taken": action_taken,
                "click_url": click_url
            }
        )
        
        # Update real-time counters
        self.real_time_stats["notifications_clicked"] += 1
        
        if action_taken:
            self.real_time_stats[f"action_{action_taken}"] += 1
        
        logger.debug(f"Tracked notification clicked: {notification_id}")
    
    async def track_notification_converted(
        self,
        notification_id: str,
        user_id: str,
        converted_at: datetime,
        conversion_value: float = None,
        conversion_type: str = None
    ):
        """Track when a notification leads to a conversion."""
        
        # Update analytics record
        await self._update_analytics_record(
            notification_id,
            {
                "converted_at": converted_at,
                "conversion_value": conversion_value,
                "conversion_type": conversion_type
            }
        )
        
        # Update real-time counters
        self.real_time_stats["notifications_converted"] += 1
        
        if conversion_value:
            self.real_time_stats["total_conversion_value"] += conversion_value
        
        logger.debug(f"Tracked notification conversion: {notification_id}")
    
    async def track_notification_failed(
        self,
        notification_id: str,
        channel: DeliveryChannel,
        failed_at: datetime,
        error_reason: str,
        error_details: Dict[str, Any] = None
    ):
        """Track when a notification delivery fails."""
        
        # Update analytics record
        await self._update_analytics_record(
            notification_id,
            {
                "status": NotificationStatus.FAILED,
                "failed_at": failed_at,
                "error_reason": error_reason,
                "error_details": error_details or {}
            }
        )
        
        # Update real-time counters
        self.real_time_stats["notifications_failed"] += 1
        self.real_time_stats[f"failed_{channel.value}"] += 1
        self.real_time_stats[f"error_{error_reason}"] += 1
        
        logger.debug(f"Tracked notification failure: {notification_id}")
    
    async def track_unsubscribe(
        self,
        user_id: str,
        notification_id: str,
        unsubscribed_at: datetime,
        unsubscribe_reason: str = None
    ):
        """Track when a user unsubscribes."""
        
        # Update analytics record
        await self._update_analytics_record(
            notification_id,
            {
                "unsubscribed_at": unsubscribed_at,
                "unsubscribe_reason": unsubscribe_reason
            }
        )
        
        # Update real-time counters
        self.real_time_stats["unsubscribes"] += 1
        
        if unsubscribe_reason:
            self.real_time_stats[f"unsubscribe_{unsubscribe_reason}"] += 1
        
        logger.info(f"Tracked unsubscribe for user {user_id}")
    
    async def _track_response_time(self, notification_id: str, response_time_minutes: float):
        """Track response time for a notification."""
        
        # Store response time for analysis
        self.metrics_cache["response_times"].append({
            "notification_id": notification_id,
            "response_time": response_time_minutes,
            "timestamp": datetime.utcnow()
        })
        
        # Update running average
        if "avg_response_time" not in self.real_time_stats:
            self.real_time_stats["avg_response_time"] = response_time_minutes
        else:
            # Simple moving average
            current_avg = self.real_time_stats["avg_response_time"]
            count = self.real_time_stats.get("response_time_count", 1)
            new_avg = (current_avg * count + response_time_minutes) / (count + 1)
            self.real_time_stats["avg_response_time"] = new_avg
            self.real_time_stats["response_time_count"] = count + 1
    
    async def _store_analytics_record(self, analytics: NotificationAnalytics):
        """Store analytics record in database."""
        # Placeholder - would store in database
        pass
    
    async def _update_analytics_record(
        self,
        notification_id: str,
        updates: Dict[str, Any]
    ):
        """Update analytics record with new data."""
        # Placeholder - would update database record
        pass
    
    async def _get_analytics_record(self, notification_id: str) -> Optional[NotificationAnalytics]:
        """Get analytics record by notification ID."""
        # Placeholder - would fetch from database
        return None


class MetricsCalculator:
    """Calculates various engagement and performance metrics."""
    
    def __init__(self, analytics_collector: AnalyticsCollector):
        self.analytics_collector = analytics_collector
    
    async def calculate_delivery_rate(
        self,
        time_window: TimeWindow = TimeWindow.DAILY,
        start_date: datetime = None,
        end_date: datetime = None,
        channel: DeliveryChannel = None,
        notification_type: NotificationType = None
    ) -> float:
        """Calculate delivery rate (delivered / sent)."""
        
        filters = self._build_filters(time_window, start_date, end_date, channel, notification_type)
        
        sent_count = await self._count_notifications("sent", filters)
        delivered_count = await self._count_notifications("delivered", filters)
        
        if sent_count == 0:
            return 0.0
        
        return delivered_count / sent_count
    
    async def calculate_open_rate(
        self,
        time_window: TimeWindow = TimeWindow.DAILY,
        start_date: datetime = None,
        end_date: datetime = None,
        channel: DeliveryChannel = None,
        notification_type: NotificationType = None
    ) -> float:
        """Calculate open rate (opened / delivered)."""
        
        filters = self._build_filters(time_window, start_date, end_date, channel, notification_type)
        
        delivered_count = await self._count_notifications("delivered", filters)
        opened_count = await self._count_notifications("opened", filters)
        
        if delivered_count == 0:
            return 0.0
        
        return opened_count / delivered_count
    
    async def calculate_click_rate(
        self,
        time_window: TimeWindow = TimeWindow.DAILY,
        start_date: datetime = None,
        end_date: datetime = None,
        channel: DeliveryChannel = None,
        notification_type: NotificationType = None
    ) -> float:
        """Calculate click-through rate (clicked / opened)."""
        
        filters = self._build_filters(time_window, start_date, end_date, channel, notification_type)
        
        opened_count = await self._count_notifications("opened", filters)
        clicked_count = await self._count_notifications("clicked", filters)
        
        if opened_count == 0:
            return 0.0
        
        return clicked_count / opened_count
    
    async def calculate_conversion_rate(
        self,
        time_window: TimeWindow = TimeWindow.DAILY,
        start_date: datetime = None,
        end_date: datetime = None,
        channel: DeliveryChannel = None,
        notification_type: NotificationType = None
    ) -> float:
        """Calculate conversion rate (converted / delivered)."""
        
        filters = self._build_filters(time_window, start_date, end_date, channel, notification_type)
        
        delivered_count = await self._count_notifications("delivered", filters)
        converted_count = await self._count_notifications("converted", filters)
        
        if delivered_count == 0:
            return 0.0
        
        return converted_count / delivered_count
    
    async def calculate_engagement_score(
        self,
        user_id: str = None,
        channel: DeliveryChannel = None,
        notification_type: NotificationType = None,
        days_back: int = 30
    ) -> float:
        """Calculate overall engagement score (0-100)."""
        
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days_back)
        
        # Get various rates
        delivery_rate = await self.calculate_delivery_rate(
            TimeWindow.DAILY, start_date, end_date, channel, notification_type
        )
        open_rate = await self.calculate_open_rate(
            TimeWindow.DAILY, start_date, end_date, channel, notification_type
        )
        click_rate = await self.calculate_click_rate(
            TimeWindow.DAILY, start_date, end_date, channel, notification_type
        )
        conversion_rate = await self.calculate_conversion_rate(
            TimeWindow.DAILY, start_date, end_date, channel, notification_type
        )
        
        # Calculate weighted engagement score
        score = (
            delivery_rate * 0.2 +    # 20% weight on delivery
            open_rate * 0.3 +        # 30% weight on opens
            click_rate * 0.3 +       # 30% weight on clicks
            conversion_rate * 0.2    # 20% weight on conversions
        ) * 100
        
        return min(score, 100.0)  # Cap at 100
    
    async def calculate_average_response_time(
        self,
        time_window: TimeWindow = TimeWindow.DAILY,
        start_date: datetime = None,
        end_date: datetime = None,
        channel: DeliveryChannel = None,
        notification_type: NotificationType = None
    ) -> float:
        """Calculate average response time in minutes."""
        
        filters = self._build_filters(time_window, start_date, end_date, channel, notification_type)
        
        response_times = await self._get_response_times(filters)
        
        if not response_times:
            return 0.0
        
        return sum(response_times) / len(response_times)
    
    def _build_filters(
        self,
        time_window: TimeWindow,
        start_date: datetime,
        end_date: datetime,
        channel: DeliveryChannel,
        notification_type: NotificationType
    ) -> Dict[str, Any]:
        """Build filters for metric calculations."""
        
        filters = {}
        
        if start_date:
            filters["start_date"] = start_date
        if end_date:
            filters["end_date"] = end_date
        if channel:
            filters["channel"] = channel
        if notification_type:
            filters["notification_type"] = notification_type
        
        filters["time_window"] = time_window
        
        return filters
    
    async def _count_notifications(self, status: str, filters: Dict[str, Any]) -> int:
        """Count notifications matching filters and status."""
        # Placeholder - would query database
        return 0
    
    async def _get_response_times(self, filters: Dict[str, Any]) -> List[float]:
        """Get response times matching filters."""
        # Placeholder - would query database
        return []


class ReportGenerator:
    """Generates comprehensive analytics reports."""
    
    def __init__(self, metrics_calculator: MetricsCalculator):
        self.metrics_calculator = metrics_calculator
    
    async def generate_performance_report(
        self,
        start_date: datetime,
        end_date: datetime,
        group_by: str = "day",  # day, week, month, channel, type
        include_details: bool = True
    ) -> PerformanceReport:
        """Generate comprehensive performance report."""
        
        logger.info(f"Generating performance report from {start_date} to {end_date}")
        
        # Calculate overall metrics
        overall_metrics = await self._calculate_overall_metrics(start_date, end_date)
        
        # Calculate metrics by group
        grouped_metrics = await self._calculate_grouped_metrics(
            start_date, end_date, group_by
        )
        
        # Calculate channel performance
        channel_metrics = await self._calculate_channel_metrics(start_date, end_date)
        
        # Calculate notification type performance
        type_metrics = await self._calculate_type_metrics(start_date, end_date)
        
        # Generate insights and recommendations
        insights = await self._generate_insights(
            overall_metrics, channel_metrics, type_metrics
        )
        
        # Create report
        report = PerformanceReport(
            report_id=f"perf_report_{int(datetime.utcnow().timestamp())}",
            start_date=start_date,
            end_date=end_date,
            overall_metrics=overall_metrics,
            channel_metrics=channel_metrics,
            type_metrics=type_metrics,
            insights=insights,
            generated_at=datetime.utcnow()
        )
        
        if include_details:
            report.grouped_metrics = grouped_metrics
            report.detailed_analytics = await self._get_detailed_analytics(start_date, end_date)
        
        logger.info(f"Performance report generated: {report.report_id}")
        
        return report
    
    async def generate_user_engagement_report(
        self,
        user_id: str,
        days_back: int = 30
    ) -> Dict[str, Any]:
        """Generate user-specific engagement report."""
        
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days_back)
        
        # Calculate user metrics
        user_metrics = await self._calculate_user_metrics(user_id, start_date, end_date)
        
        # Get user preferences and behavior
        user_behavior = await self._get_user_behavior(user_id)
        
        # Generate personalized insights
        insights = await self._generate_user_insights(user_id, user_metrics, user_behavior)
        
        return {
            "user_id": user_id,
            "period": {"start": start_date, "end": end_date},
            "metrics": user_metrics,
            "behavior": user_behavior,
            "insights": insights,
            "generated_at": datetime.utcnow()
        }
    
    async def _calculate_overall_metrics(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> EngagementMetrics:
        """Calculate overall metrics for the period."""
        
        delivery_rate = await self.metrics_calculator.calculate_delivery_rate(
            TimeWindow.DAILY, start_date, end_date
        )
        open_rate = await self.metrics_calculator.calculate_open_rate(
            TimeWindow.DAILY, start_date, end_date
        )
        click_rate = await self.metrics_calculator.calculate_click_rate(
            TimeWindow.DAILY, start_date, end_date
        )
        conversion_rate = await self.metrics_calculator.calculate_conversion_rate(
            TimeWindow.DAILY, start_date, end_date
        )
        engagement_score = await self.metrics_calculator.calculate_engagement_score(
            days_back=(end_date - start_date).days
        )
        
        return EngagementMetrics(
            delivery_rate=delivery_rate,
            open_rate=open_rate,
            click_through_rate=click_rate,
            conversion_rate=conversion_rate,
            engagement_score=engagement_score,
            total_sent=await self._count_sent_notifications(start_date, end_date),
            total_delivered=await self._count_delivered_notifications(start_date, end_date),
            total_opened=await self._count_opened_notifications(start_date, end_date),
            total_clicked=await self._count_clicked_notifications(start_date, end_date),
            calculated_at=datetime.utcnow()
        )
    
    async def _calculate_grouped_metrics(
        self,
        start_date: datetime,
        end_date: datetime,
        group_by: str
    ) -> Dict[str, EngagementMetrics]:
        """Calculate metrics grouped by specified dimension."""
        # Placeholder - would calculate grouped metrics
        return {}
    
    async def _calculate_channel_metrics(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, EngagementMetrics]:
        """Calculate metrics by channel."""
        
        channel_metrics = {}
        
        for channel in DeliveryChannel:
            metrics = await self._calculate_overall_metrics_for_channel(
                start_date, end_date, channel
            )
            channel_metrics[channel.value] = metrics
        
        return channel_metrics
    
    async def _calculate_type_metrics(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, EngagementMetrics]:
        """Calculate metrics by notification type."""
        
        type_metrics = {}
        
        for notification_type in NotificationType:
            metrics = await self._calculate_overall_metrics_for_type(
                start_date, end_date, notification_type
            )
            type_metrics[notification_type.value] = metrics
        
        return type_metrics
    
    async def _generate_insights(
        self,
        overall_metrics: EngagementMetrics,
        channel_metrics: Dict[str, EngagementMetrics],
        type_metrics: Dict[str, EngagementMetrics]
    ) -> List[str]:
        """Generate insights and recommendations."""
        
        insights = []
        
        # Delivery rate insights
        if overall_metrics.delivery_rate < 0.95:
            insights.append(f"Delivery rate ({overall_metrics.delivery_rate:.1%}) is below optimal. Check for email deliverability issues.")
        
        # Open rate insights
        if overall_metrics.open_rate < 0.20:
            insights.append(f"Open rate ({overall_metrics.open_rate:.1%}) is low. Consider improving subject lines and send timing.")
        
        # Channel performance insights
        best_channel = max(channel_metrics.items(), key=lambda x: x[1].engagement_score)
        worst_channel = min(channel_metrics.items(), key=lambda x: x[1].engagement_score)
        
        insights.append(f"Best performing channel: {best_channel[0]} ({best_channel[1].engagement_score:.1f} engagement score)")
        insights.append(f"Consider reducing usage of {worst_channel[0]} ({worst_channel[1].engagement_score:.1f} engagement score)")
        
        # Type performance insights
        best_type = max(type_metrics.items(), key=lambda x: x[1].conversion_rate)
        insights.append(f"Highest converting notification type: {best_type[0]} ({best_type[1].conversion_rate:.1%})")
        
        return insights
    
    # Placeholder helper methods
    async def _calculate_overall_metrics_for_channel(
        self, start_date: datetime, end_date: datetime, channel: DeliveryChannel
    ) -> EngagementMetrics:
        """Calculate metrics for specific channel."""
        # Placeholder implementation
        return EngagementMetrics()
    
    async def _calculate_overall_metrics_for_type(
        self, start_date: datetime, end_date: datetime, notification_type: NotificationType
    ) -> EngagementMetrics:
        """Calculate metrics for specific notification type."""
        # Placeholder implementation
        return EngagementMetrics()
    
    async def _calculate_user_metrics(
        self, user_id: str, start_date: datetime, end_date: datetime
    ) -> Dict[str, Any]:
        """Calculate metrics for specific user."""
        # Placeholder implementation
        return {}
    
    async def _get_user_behavior(self, user_id: str) -> Dict[str, Any]:
        """Get user behavior data."""
        # Placeholder implementation
        return {}
    
    async def _generate_user_insights(
        self, user_id: str, metrics: Dict[str, Any], behavior: Dict[str, Any]
    ) -> List[str]:
        """Generate user-specific insights."""
        # Placeholder implementation
        return []
    
    async def _get_detailed_analytics(
        self, start_date: datetime, end_date: datetime
    ) -> List[Dict[str, Any]]:
        """Get detailed analytics data."""
        # Placeholder implementation
        return []
    
    async def _count_sent_notifications(self, start_date: datetime, end_date: datetime) -> int:
        """Count sent notifications in period."""
        # Placeholder implementation
        return 0
    
    async def _count_delivered_notifications(self, start_date: datetime, end_date: datetime) -> int:
        """Count delivered notifications in period."""
        # Placeholder implementation
        return 0
    
    async def _count_opened_notifications(self, start_date: datetime, end_date: datetime) -> int:
        """Count opened notifications in period."""
        # Placeholder implementation
        return 0
    
    async def _count_clicked_notifications(self, start_date: datetime, end_date: datetime) -> int:
        """Count clicked notifications in period."""
        # Placeholder implementation
        return 0


# Global analytics instances
analytics_collector = AnalyticsCollector()
metrics_calculator = MetricsCalculator(analytics_collector)
report_generator = ReportGenerator(metrics_calculator)