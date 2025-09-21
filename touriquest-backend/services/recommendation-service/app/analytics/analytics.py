"""
Analytics and monitoring system for recommendation service.
"""
import asyncio
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass
import json
from collections import defaultdict, deque
import time

from app.models.schemas import RecommendationType, FeedbackType

logger = logging.getLogger(__name__)


@dataclass
class RecommendationMetrics:
    """Metrics for recommendation performance."""
    total_requests: int = 0
    successful_responses: int = 0
    failed_responses: int = 0
    avg_response_time: float = 0.0
    cache_hit_rate: float = 0.0
    click_through_rate: float = 0.0
    conversion_rate: float = 0.0
    algorithm_usage: Dict[str, int] = None
    
    def __post_init__(self):
        if self.algorithm_usage is None:
            self.algorithm_usage = {}


@dataclass
class UserEngagementMetrics:
    """User engagement metrics."""
    user_id: str
    total_recommendations: int = 0
    clicks: int = 0
    bookings: int = 0
    feedback_count: int = 0
    last_activity: Optional[datetime] = None
    preferred_types: List[str] = None
    avg_session_length: float = 0.0
    
    def __post_init__(self):
        if self.preferred_types is None:
            self.preferred_types = []


class RecommendationAnalytics:
    """Analytics system for recommendation performance."""
    
    def __init__(self):
        self.metrics = RecommendationMetrics()
        self.user_metrics: Dict[str, UserEngagementMetrics] = {}
        self.algorithm_performance: Dict[str, Dict[str, float]] = defaultdict(lambda: {
            'accuracy': 0.0,
            'precision': 0.0,
            'recall': 0.0,
            'f1_score': 0.0,
            'coverage': 0.0,
            'diversity': 0.0,
            'novelty': 0.0,
            'serendipity': 0.0
        })
        self.response_times: deque = deque(maxlen=1000)  # Keep last 1000 response times
        self.recent_activities: deque = deque(maxlen=10000)  # Keep last 10000 activities
        self.hourly_stats: Dict[str, Dict] = defaultdict(lambda: {
            'requests': 0,
            'clicks': 0,
            'bookings': 0,
            'unique_users': set()
        })
        
    async def track_recommendation_request(
        self,
        user_id: str,
        recommendation_type: RecommendationType,
        algorithm_used: str,
        response_time: float,
        success: bool,
        cache_hit: bool = False
    ):
        """Track a recommendation request."""
        try:
            # Update global metrics
            self.metrics.total_requests += 1
            if success:
                self.metrics.successful_responses += 1
            else:
                self.metrics.failed_responses += 1
            
            # Update response time
            self.response_times.append(response_time)
            self.metrics.avg_response_time = sum(self.response_times) / len(self.response_times)
            
            # Update cache hit rate
            if cache_hit:
                # Simple approximation - in production, use proper cache metrics
                self.metrics.cache_hit_rate = (self.metrics.cache_hit_rate * 0.9) + (1.0 * 0.1)
            else:
                self.metrics.cache_hit_rate = (self.metrics.cache_hit_rate * 0.9) + (0.0 * 0.1)
            
            # Update algorithm usage
            if algorithm_used not in self.metrics.algorithm_usage:
                self.metrics.algorithm_usage[algorithm_used] = 0
            self.metrics.algorithm_usage[algorithm_used] += 1
            
            # Update user metrics
            if user_id not in self.user_metrics:
                self.user_metrics[user_id] = UserEngagementMetrics(user_id=user_id)
            
            user_metric = self.user_metrics[user_id]
            user_metric.total_recommendations += 1
            user_metric.last_activity = datetime.utcnow()
            
            if recommendation_type.value not in user_metric.preferred_types:
                user_metric.preferred_types.append(recommendation_type.value)
            
            # Update hourly stats
            hour_key = datetime.utcnow().strftime('%Y-%m-%d-%H')
            self.hourly_stats[hour_key]['requests'] += 1
            self.hourly_stats[hour_key]['unique_users'].add(user_id)
            
            # Track activity
            activity = {
                'timestamp': datetime.utcnow().isoformat(),
                'user_id': user_id,
                'type': 'recommendation_request',
                'recommendation_type': recommendation_type.value,
                'algorithm': algorithm_used,
                'response_time': response_time,
                'success': success
            }
            self.recent_activities.append(activity)
            
        except Exception as e:
            logger.error(f"Error tracking recommendation request: {str(e)}")
    
    async def track_user_feedback(
        self,
        user_id: str,
        recommendation_id: str,
        feedback_type: FeedbackType,
        recommendation_type: RecommendationType
    ):
        """Track user feedback."""
        try:
            # Update user metrics
            if user_id not in self.user_metrics:
                self.user_metrics[user_id] = UserEngagementMetrics(user_id=user_id)
            
            user_metric = self.user_metrics[user_id]
            user_metric.feedback_count += 1
            user_metric.last_activity = datetime.utcnow()
            
            if feedback_type == FeedbackType.CLICK:
                user_metric.clicks += 1
                # Update global CTR
                total_recs = self.metrics.total_requests
                total_clicks = sum(um.clicks for um in self.user_metrics.values())
                self.metrics.click_through_rate = total_clicks / max(total_recs, 1)
                
                # Update hourly stats
                hour_key = datetime.utcnow().strftime('%Y-%m-%d-%H')
                self.hourly_stats[hour_key]['clicks'] += 1
                
            elif feedback_type == FeedbackType.BOOK:
                user_metric.bookings += 1
                # Update global conversion rate
                total_recs = self.metrics.total_requests
                total_bookings = sum(um.bookings for um in self.user_metrics.values())
                self.metrics.conversion_rate = total_bookings / max(total_recs, 1)
                
                # Update hourly stats
                hour_key = datetime.utcnow().strftime('%Y-%m-%d-%H')
                self.hourly_stats[hour_key]['bookings'] += 1
            
            # Track activity
            activity = {
                'timestamp': datetime.utcnow().isoformat(),
                'user_id': user_id,
                'type': 'user_feedback',
                'recommendation_id': recommendation_id,
                'feedback_type': feedback_type.value,
                'recommendation_type': recommendation_type.value
            }
            self.recent_activities.append(activity)
            
        except Exception as e:
            logger.error(f"Error tracking user feedback: {str(e)}")
    
    async def update_algorithm_performance(
        self,
        algorithm_name: str,
        metrics: Dict[str, float]
    ):
        """Update algorithm performance metrics."""
        try:
            self.algorithm_performance[algorithm_name].update(metrics)
        except Exception as e:
            logger.error(f"Error updating algorithm performance: {str(e)}")
    
    def get_overall_metrics(self) -> Dict[str, Any]:
        """Get overall system metrics."""
        return {
            'total_requests': self.metrics.total_requests,
            'success_rate': self.metrics.successful_responses / max(self.metrics.total_requests, 1),
            'failure_rate': self.metrics.failed_responses / max(self.metrics.total_requests, 1),
            'avg_response_time_ms': self.metrics.avg_response_time * 1000,
            'cache_hit_rate': self.metrics.cache_hit_rate,
            'click_through_rate': self.metrics.click_through_rate,
            'conversion_rate': self.metrics.conversion_rate,
            'algorithm_usage': self.metrics.algorithm_usage,
            'total_users': len(self.user_metrics),
            'active_users_24h': self._get_active_users_count(hours=24)
        }
    
    def get_user_analytics(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get analytics for a specific user."""
        if user_id not in self.user_metrics:
            return None
        
        user_metric = self.user_metrics[user_id]
        
        return {
            'user_id': user_id,
            'total_recommendations': user_metric.total_recommendations,
            'clicks': user_metric.clicks,
            'bookings': user_metric.bookings,
            'click_through_rate': user_metric.clicks / max(user_metric.total_recommendations, 1),
            'conversion_rate': user_metric.bookings / max(user_metric.total_recommendations, 1),
            'feedback_count': user_metric.feedback_count,
            'last_activity': user_metric.last_activity.isoformat() if user_metric.last_activity else None,
            'preferred_types': user_metric.preferred_types,
            'engagement_score': self._calculate_engagement_score(user_metric)
        }
    
    def get_algorithm_performance(self) -> Dict[str, Any]:
        """Get algorithm performance metrics."""
        return dict(self.algorithm_performance)
    
    def get_trending_analytics(self, hours: int = 24) -> Dict[str, Any]:
        """Get trending analytics for the specified time period."""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        
        # Filter recent activities
        recent_activities = [
            activity for activity in self.recent_activities
            if datetime.fromisoformat(activity['timestamp'].replace('Z', '+00:00')) > cutoff_time
        ]
        
        # Analyze trends
        recommendation_types = defaultdict(int)
        algorithms_used = defaultdict(int)
        hourly_trends = defaultdict(int)
        
        for activity in recent_activities:
            if activity['type'] == 'recommendation_request':
                recommendation_types[activity['recommendation_type']] += 1
                algorithms_used[activity['algorithm']] += 1
                hour = datetime.fromisoformat(activity['timestamp'].replace('Z', '+00:00')).hour
                hourly_trends[hour] += 1
        
        return {
            'time_period_hours': hours,
            'total_activities': len(recent_activities),
            'recommendation_types': dict(recommendation_types),
            'algorithms_used': dict(algorithms_used),
            'hourly_distribution': dict(hourly_trends),
            'peak_hour': max(hourly_trends.items(), key=lambda x: x[1])[0] if hourly_trends else None
        }
    
    def get_performance_dashboard(self) -> Dict[str, Any]:
        """Get comprehensive performance dashboard data."""
        return {
            'overview': self.get_overall_metrics(),
            'algorithm_performance': self.get_algorithm_performance(),
            'trending': self.get_trending_analytics(),
            'top_users': self._get_top_users(limit=10),
            'system_health': self._get_system_health(),
            'recommendations_by_hour': self._get_hourly_recommendations(),
            'user_segments': self._get_user_segments()
        }
    
    def _get_active_users_count(self, hours: int) -> int:
        """Get count of active users in the last N hours."""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        
        active_users = set()
        for activity in self.recent_activities:
            activity_time = datetime.fromisoformat(activity['timestamp'].replace('Z', '+00:00'))
            if activity_time > cutoff_time:
                active_users.add(activity['user_id'])
        
        return len(active_users)
    
    def _calculate_engagement_score(self, user_metric: UserEngagementMetrics) -> float:
        """Calculate user engagement score (0-100)."""
        if user_metric.total_recommendations == 0:
            return 0.0
        
        # Weighted engagement score
        ctr_weight = 0.3
        conversion_weight = 0.4
        feedback_weight = 0.2
        recency_weight = 0.1
        
        ctr = user_metric.clicks / user_metric.total_recommendations
        conversion = user_metric.bookings / user_metric.total_recommendations
        feedback_ratio = user_metric.feedback_count / user_metric.total_recommendations
        
        # Recency score (higher if more recent activity)
        recency_score = 1.0
        if user_metric.last_activity:
            hours_since = (datetime.utcnow() - user_metric.last_activity).total_seconds() / 3600
            recency_score = max(0.1, 1.0 - (hours_since / (24 * 7)))  # Decay over a week
        
        engagement = (
            ctr * ctr_weight +
            conversion * conversion_weight +
            min(feedback_ratio, 1.0) * feedback_weight +
            recency_score * recency_weight
        ) * 100
        
        return min(100.0, engagement)
    
    def _get_top_users(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get top users by engagement score."""
        user_scores = []
        
        for user_id, metric in self.user_metrics.items():
            engagement_score = self._calculate_engagement_score(metric)
            user_scores.append({
                'user_id': user_id,
                'engagement_score': engagement_score,
                'total_recommendations': metric.total_recommendations,
                'clicks': metric.clicks,
                'bookings': metric.bookings
            })
        
        return sorted(user_scores, key=lambda x: x['engagement_score'], reverse=True)[:limit]
    
    def _get_system_health(self) -> Dict[str, Any]:
        """Get system health indicators."""
        if not self.response_times:
            return {'status': 'no_data'}
        
        response_times_ms = [rt * 1000 for rt in self.response_times]
        
        # Calculate percentiles
        sorted_times = sorted(response_times_ms)
        n = len(sorted_times)
        
        p50 = sorted_times[int(n * 0.5)]
        p95 = sorted_times[int(n * 0.95)]
        p99 = sorted_times[int(n * 0.99)]
        
        # Health status based on response times
        status = 'healthy'
        if p95 > 1000:  # 1 second
            status = 'degraded'
        if p95 > 5000:  # 5 seconds
            status = 'unhealthy'
        
        return {
            'status': status,
            'response_time_p50': p50,
            'response_time_p95': p95,
            'response_time_p99': p99,
            'error_rate': self.metrics.failed_responses / max(self.metrics.total_requests, 1),
            'cache_hit_rate': self.metrics.cache_hit_rate
        }
    
    def _get_hourly_recommendations(self) -> Dict[str, Any]:
        """Get hourly recommendation statistics."""
        hourly_data = {}
        
        for hour_key, stats in self.hourly_stats.items():
            hourly_data[hour_key] = {
                'requests': stats['requests'],
                'clicks': stats['clicks'],
                'bookings': stats['bookings'],
                'unique_users': len(stats['unique_users'])
            }
        
        return hourly_data
    
    def _get_user_segments(self) -> Dict[str, Any]:
        """Get user segmentation analysis."""
        segments = {
            'high_engagement': 0,    # >70 engagement score
            'medium_engagement': 0,  # 30-70 engagement score
            'low_engagement': 0,     # <30 engagement score
            'new_users': 0,          # <5 total recommendations
            'power_users': 0         # >100 total recommendations
        }
        
        for user_metric in self.user_metrics.values():
            engagement = self._calculate_engagement_score(user_metric)
            
            if engagement > 70:
                segments['high_engagement'] += 1
            elif engagement > 30:
                segments['medium_engagement'] += 1
            else:
                segments['low_engagement'] += 1
            
            if user_metric.total_recommendations < 5:
                segments['new_users'] += 1
            elif user_metric.total_recommendations > 100:
                segments['power_users'] += 1
        
        return segments


# Global analytics instance
recommendation_analytics = RecommendationAnalytics()