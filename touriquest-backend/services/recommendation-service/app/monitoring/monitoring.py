"""
Monitoring and observability system for recommendation service.
"""
import asyncio
import logging
import time
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from collections import defaultdict, deque
import json
from enum import Enum

logger = logging.getLogger(__name__)


class AlertSeverity(Enum):
    """Alert severity levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class MetricType(Enum):
    """Types of metrics to monitor."""
    COUNTER = "counter"
    GAUGE = "gauge"
    HISTOGRAM = "histogram"
    SUMMARY = "summary"


@dataclass
class Alert:
    """Alert definition."""
    alert_id: str
    name: str
    description: str
    severity: AlertSeverity
    condition: str
    threshold: float
    duration: int  # seconds
    is_active: bool = False
    triggered_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Metric:
    """Metric data point."""
    name: str
    value: float
    timestamp: datetime
    labels: Dict[str, str] = field(default_factory=dict)
    metric_type: MetricType = MetricType.GAUGE


class MonitoringSystem:
    """Comprehensive monitoring system for recommendation service."""
    
    def __init__(self):
        self.metrics: Dict[str, deque] = defaultdict(lambda: deque(maxlen=1000))
        self.alerts: Dict[str, Alert] = {}
        self.alert_history: deque = deque(maxlen=10000)
        self.thresholds: Dict[str, Dict[str, float]] = {
            'response_time': {
                'warning': 500,    # ms
                'critical': 2000   # ms
            },
            'error_rate': {
                'warning': 0.05,   # 5%
                'critical': 0.15   # 15%
            },
            'cache_hit_rate': {
                'warning': 0.7,    # 70%
                'critical': 0.5    # 50%
            },
            'memory_usage': {
                'warning': 0.8,    # 80%
                'critical': 0.95   # 95%
            }
        }
        self.alert_cooldown: Dict[str, datetime] = {}
        self.system_status = "healthy"
        
        # Initialize default alerts
        self._initialize_default_alerts()
    
    def _initialize_default_alerts(self):
        """Initialize default monitoring alerts."""
        default_alerts = [
            Alert(
                alert_id="high_response_time",
                name="High Response Time",
                description="Average response time is above threshold",
                severity=AlertSeverity.MEDIUM,
                condition="avg_response_time > 500",
                threshold=500.0,
                duration=300  # 5 minutes
            ),
            Alert(
                alert_id="critical_response_time",
                name="Critical Response Time",
                description="Average response time is critically high",
                severity=AlertSeverity.CRITICAL,
                condition="avg_response_time > 2000",
                threshold=2000.0,
                duration=60  # 1 minute
            ),
            Alert(
                alert_id="high_error_rate",
                name="High Error Rate",
                description="Error rate is above acceptable threshold",
                severity=AlertSeverity.HIGH,
                condition="error_rate > 0.05",
                threshold=0.05,
                duration=300  # 5 minutes
            ),
            Alert(
                alert_id="low_cache_hit_rate",
                name="Low Cache Hit Rate",
                description="Cache hit rate is below optimal threshold",
                severity=AlertSeverity.MEDIUM,
                condition="cache_hit_rate < 0.7",
                threshold=0.7,
                duration=600  # 10 minutes
            ),
            Alert(
                alert_id="model_prediction_errors",
                name="Model Prediction Errors",
                description="High rate of model prediction failures",
                severity=AlertSeverity.HIGH,
                condition="model_error_rate > 0.1",
                threshold=0.1,
                duration=180  # 3 minutes
            )
        ]
        
        for alert in default_alerts:
            self.alerts[alert.alert_id] = alert
    
    async def record_metric(
        self,
        name: str,
        value: float,
        labels: Optional[Dict[str, str]] = None,
        metric_type: MetricType = MetricType.GAUGE
    ):
        """Record a metric value."""
        try:
            metric = Metric(
                name=name,
                value=value,
                timestamp=datetime.utcnow(),
                labels=labels or {},
                metric_type=metric_type
            )
            
            self.metrics[name].append(metric)
            
            # Check for alert conditions
            await self._check_alert_conditions(name, value)
            
        except Exception as e:
            logger.error(f"Error recording metric {name}: {str(e)}")
    
    async def _check_alert_conditions(self, metric_name: str, value: float):
        """Check if any alert conditions are triggered."""
        try:
            for alert in self.alerts.values():
                # Simple condition checking (in production, use proper expression parser)
                should_trigger = False
                
                if metric_name in alert.condition:
                    if ">" in alert.condition:
                        should_trigger = value > alert.threshold
                    elif "<" in alert.condition:
                        should_trigger = value < alert.threshold
                
                if should_trigger and not alert.is_active:
                    # Check cooldown
                    cooldown_key = f"{alert.alert_id}_{metric_name}"
                    if cooldown_key in self.alert_cooldown:
                        if datetime.utcnow() - self.alert_cooldown[cooldown_key] < timedelta(minutes=5):
                            continue
                    
                    await self._trigger_alert(alert, value)
                elif not should_trigger and alert.is_active:
                    await self._resolve_alert(alert)
                    
        except Exception as e:
            logger.error(f"Error checking alert conditions: {str(e)}")
    
    async def _trigger_alert(self, alert: Alert, current_value: float):
        """Trigger an alert."""
        try:
            alert.is_active = True
            alert.triggered_at = datetime.utcnow()
            alert.metadata['trigger_value'] = current_value
            
            # Add to alert history
            alert_event = {
                'alert_id': alert.alert_id,
                'name': alert.name,
                'severity': alert.severity.value,
                'action': 'triggered',
                'timestamp': alert.triggered_at.isoformat(),
                'value': current_value,
                'threshold': alert.threshold
            }
            self.alert_history.append(alert_event)
            
            # Log alert
            logger.warning(f"ALERT TRIGGERED: {alert.name} - Value: {current_value}, Threshold: {alert.threshold}")
            
            # Update system status
            await self._update_system_status()
            
            # Set cooldown
            self.alert_cooldown[f"{alert.alert_id}_trigger"] = datetime.utcnow()
            
            # In production, send to alerting system (PagerDuty, Slack, etc.)
            await self._send_alert_notification(alert, 'triggered', current_value)
            
        except Exception as e:
            logger.error(f"Error triggering alert {alert.alert_id}: {str(e)}")
    
    async def _resolve_alert(self, alert: Alert):
        """Resolve an active alert."""
        try:
            alert.is_active = False
            alert.resolved_at = datetime.utcnow()
            
            # Add to alert history
            alert_event = {
                'alert_id': alert.alert_id,
                'name': alert.name,
                'severity': alert.severity.value,
                'action': 'resolved',
                'timestamp': alert.resolved_at.isoformat(),
                'duration_minutes': (alert.resolved_at - alert.triggered_at).total_seconds() / 60
            }
            self.alert_history.append(alert_event)
            
            # Log resolution
            logger.info(f"ALERT RESOLVED: {alert.name}")
            
            # Update system status
            await self._update_system_status()
            
            # In production, send to alerting system
            await self._send_alert_notification(alert, 'resolved')
            
        except Exception as e:
            logger.error(f"Error resolving alert {alert.alert_id}: {str(e)}")
    
    async def _send_alert_notification(self, alert: Alert, action: str, value: Optional[float] = None):
        """Send alert notification (mock implementation)."""
        # In production, integrate with actual alerting systems
        notification = {
            'alert_id': alert.alert_id,
            'name': alert.name,
            'description': alert.description,
            'severity': alert.severity.value,
            'action': action,
            'timestamp': datetime.utcnow().isoformat(),
            'service': 'recommendation-service'
        }
        
        if value is not None:
            notification['current_value'] = value
            notification['threshold'] = alert.threshold
        
        logger.info(f"Alert notification: {json.dumps(notification)}")
    
    async def _update_system_status(self):
        """Update overall system status based on active alerts."""
        active_alerts = [alert for alert in self.alerts.values() if alert.is_active]
        
        if not active_alerts:
            self.system_status = "healthy"
        elif any(alert.severity == AlertSeverity.CRITICAL for alert in active_alerts):
            self.system_status = "critical"
        elif any(alert.severity == AlertSeverity.HIGH for alert in active_alerts):
            self.system_status = "degraded"
        else:
            self.system_status = "warning"
    
    def get_metric_summary(self, metric_name: str, duration_minutes: int = 60) -> Dict[str, Any]:
        """Get summary statistics for a metric over the specified duration."""
        try:
            cutoff_time = datetime.utcnow() - timedelta(minutes=duration_minutes)
            
            if metric_name not in self.metrics:
                return {'error': f'Metric {metric_name} not found'}
            
            # Filter metrics by time
            recent_metrics = [
                m for m in self.metrics[metric_name]
                if m.timestamp > cutoff_time
            ]
            
            if not recent_metrics:
                return {'error': f'No recent data for {metric_name}'}
            
            values = [m.value for m in recent_metrics]
            
            return {
                'metric_name': metric_name,
                'duration_minutes': duration_minutes,
                'count': len(values),
                'min': min(values),
                'max': max(values),
                'avg': sum(values) / len(values),
                'latest': values[-1] if values else None,
                'trend': self._calculate_trend(values)
            }
            
        except Exception as e:
            logger.error(f"Error getting metric summary for {metric_name}: {str(e)}")
            return {'error': str(e)}
    
    def _calculate_trend(self, values: List[float]) -> str:
        """Calculate trend direction from values."""
        if len(values) < 2:
            return 'stable'
        
        # Simple trend calculation using first and last values
        first_half = values[:len(values)//2]
        second_half = values[len(values)//2:]
        
        first_avg = sum(first_half) / len(first_half)
        second_avg = sum(second_half) / len(second_half)
        
        diff_percent = (second_avg - first_avg) / first_avg * 100 if first_avg != 0 else 0
        
        if diff_percent > 10:
            return 'increasing'
        elif diff_percent < -10:
            return 'decreasing'
        else:
            return 'stable'
    
    def get_active_alerts(self) -> List[Dict[str, Any]]:
        """Get all currently active alerts."""
        active_alerts = []
        
        for alert in self.alerts.values():
            if alert.is_active:
                alert_data = {
                    'alert_id': alert.alert_id,
                    'name': alert.name,
                    'description': alert.description,
                    'severity': alert.severity.value,
                    'triggered_at': alert.triggered_at.isoformat() if alert.triggered_at else None,
                    'duration_minutes': (datetime.utcnow() - alert.triggered_at).total_seconds() / 60 if alert.triggered_at else 0,
                    'threshold': alert.threshold,
                    'current_value': alert.metadata.get('trigger_value'),
                    'condition': alert.condition
                }
                active_alerts.append(alert_data)
        
        return sorted(active_alerts, key=lambda x: x['severity'], reverse=True)
    
    def get_alert_history(self, hours: int = 24) -> List[Dict[str, Any]]:
        """Get alert history for the specified time period."""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        
        recent_alerts = []
        for alert_event in self.alert_history:
            alert_time = datetime.fromisoformat(alert_event['timestamp'])
            if alert_time > cutoff_time:
                recent_alerts.append(alert_event)
        
        return sorted(recent_alerts, key=lambda x: x['timestamp'], reverse=True)
    
    def get_system_health(self) -> Dict[str, Any]:
        """Get comprehensive system health status."""
        # Calculate health metrics
        response_time_summary = self.get_metric_summary('response_time', 15)
        error_rate_summary = self.get_metric_summary('error_rate', 15)
        cache_hit_summary = self.get_metric_summary('cache_hit_rate', 30)
        
        # Service availability (mock calculation)
        uptime_percentage = 99.9  # In production, calculate from actual downtime
        
        return {
            'overall_status': self.system_status,
            'uptime_percentage': uptime_percentage,
            'active_alerts_count': len([a for a in self.alerts.values() if a.is_active]),
            'metrics': {
                'response_time': response_time_summary,
                'error_rate': error_rate_summary,
                'cache_hit_rate': cache_hit_summary
            },
            'last_updated': datetime.utcnow().isoformat(),
            'recommendations_per_minute': self._calculate_requests_per_minute(),
            'model_health': self._get_model_health_status()
        }
    
    def _calculate_requests_per_minute(self) -> float:
        """Calculate requests per minute from recent metrics."""
        request_metrics = self.get_metric_summary('requests_total', 5)
        if 'count' in request_metrics and request_metrics['count'] > 0:
            return request_metrics['count'] / 5.0  # Convert to per minute
        return 0.0
    
    def _get_model_health_status(self) -> Dict[str, str]:
        """Get health status of ML models."""
        # Mock model health - in production, check actual model status
        return {
            'collaborative_filtering': 'healthy',
            'content_based': 'healthy',
            'matrix_factorization': 'healthy',
            'hybrid_model': 'healthy'
        }
    
    def get_performance_dashboard(self) -> Dict[str, Any]:
        """Get comprehensive performance dashboard data."""
        return {
            'system_health': self.get_system_health(),
            'active_alerts': self.get_active_alerts(),
            'recent_alert_history': self.get_alert_history(24),
            'key_metrics': {
                'response_time_15min': self.get_metric_summary('response_time', 15),
                'error_rate_1hour': self.get_metric_summary('error_rate', 60),
                'cache_performance': self.get_metric_summary('cache_hit_rate', 30),
                'throughput': self.get_metric_summary('requests_per_second', 10)
            },
            'trends': {
                'response_time_trend': self._get_metric_trend('response_time', 60),
                'error_rate_trend': self._get_metric_trend('error_rate', 60),
                'traffic_trend': self._get_metric_trend('requests_per_second', 60)
            }
        }
    
    def _get_metric_trend(self, metric_name: str, duration_minutes: int) -> Dict[str, Any]:
        """Get trend data for a metric over time."""
        cutoff_time = datetime.utcnow() - timedelta(minutes=duration_minutes)
        
        if metric_name not in self.metrics:
            return {'error': f'Metric {metric_name} not found'}
        
        # Get time series data
        recent_metrics = [
            m for m in self.metrics[metric_name]
            if m.timestamp > cutoff_time
        ]
        
        if not recent_metrics:
            return {'error': f'No recent data for {metric_name}'}
        
        # Group by time intervals (5-minute buckets)
        time_buckets = defaultdict(list)
        for metric in recent_metrics:
            bucket_key = metric.timestamp.replace(minute=metric.timestamp.minute // 5 * 5, second=0, microsecond=0)
            time_buckets[bucket_key].append(metric.value)
        
        # Calculate averages for each bucket
        trend_data = []
        for timestamp, values in sorted(time_buckets.items()):
            trend_data.append({
                'timestamp': timestamp.isoformat(),
                'value': sum(values) / len(values)
            })
        
        return {
            'metric_name': metric_name,
            'duration_minutes': duration_minutes,
            'data_points': trend_data,
            'trend_direction': self._calculate_trend([point['value'] for point in trend_data])
        }
    
    async def create_custom_alert(
        self,
        name: str,
        description: str,
        condition: str,
        threshold: float,
        severity: AlertSeverity,
        duration: int = 300
    ) -> str:
        """Create a custom alert."""
        alert_id = f"custom_{name.lower().replace(' ', '_')}_{int(time.time())}"
        
        alert = Alert(
            alert_id=alert_id,
            name=name,
            description=description,
            severity=severity,
            condition=condition,
            threshold=threshold,
            duration=duration
        )
        
        self.alerts[alert_id] = alert
        logger.info(f"Created custom alert: {name} (ID: {alert_id})")
        
        return alert_id
    
    async def delete_alert(self, alert_id: str) -> bool:
        """Delete an alert."""
        if alert_id in self.alerts:
            # Resolve if active
            if self.alerts[alert_id].is_active:
                await self._resolve_alert(self.alerts[alert_id])
            
            del self.alerts[alert_id]
            logger.info(f"Deleted alert: {alert_id}")
            return True
        
        return False


# Global monitoring instance
monitoring_system = MonitoringSystem()