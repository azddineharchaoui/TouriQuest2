"""
Alerting service with PagerDuty and Slack integration for incident management
"""

from typing import Dict, List, Optional, Any, Union, Callable
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from enum import Enum
import asyncio
import json
import logging
import aiohttp
from urllib.parse import urljoin
import hashlib
import hmac
import time

from slack_sdk.web.async_client import AsyncWebClient
from slack_sdk.errors import SlackApiError
import pdpyras

from app.core.config import settings


logger = logging.getLogger(__name__)


class AlertSeverity(str, Enum):
    """Alert severity levels"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class AlertStatus(str, Enum):
    """Alert status"""
    OPEN = "open"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"
    SUPPRESSED = "suppressed"


class AlertSource(str, Enum):
    """Alert sources"""
    HEALTH_CHECK = "health_check"
    METRICS = "metrics"
    LOGS = "logs"
    TRACES = "traces"
    EXTERNAL = "external"
    MANUAL = "manual"


@dataclass
class Alert:
    """Alert data structure"""
    id: str
    title: str
    description: str
    severity: AlertSeverity
    source: AlertSource
    service: str
    metric_name: Optional[str] = None
    metric_value: Optional[float] = None
    threshold: Optional[float] = None
    tags: Dict[str, str] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    status: AlertStatus = AlertStatus.OPEN
    assigned_to: Optional[str] = None
    escalation_level: int = 0
    last_notification: Optional[datetime] = None
    notification_count: int = 0
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        result = asdict(self)
        result["created_at"] = self.created_at.isoformat()
        result["updated_at"] = self.updated_at.isoformat()
        if self.last_notification:
            result["last_notification"] = self.last_notification.isoformat()
        return result
    
    def get_unique_key(self) -> str:
        """Get unique key for deduplication"""
        return f"{self.service}:{self.source}:{self.metric_name or self.title}"


@dataclass
class AlertRule:
    """Alert rule configuration"""
    id: str
    name: str
    description: str
    service: str
    metric_name: str
    condition: str  # e.g., "gt", "lt", "eq", "ne"
    threshold: float
    severity: AlertSeverity
    evaluation_window: int = 300  # seconds
    cooldown: int = 3600  # seconds
    enabled: bool = True
    notification_channels: List[str] = field(default_factory=list)
    escalation_policy: Optional[str] = None
    tags: Dict[str, str] = field(default_factory=dict)
    
    def evaluate(self, value: float) -> bool:
        """Evaluate if alert condition is met"""
        if self.condition == "gt":
            return value > self.threshold
        elif self.condition == "lt":
            return value < self.threshold
        elif self.condition == "eq":
            return value == self.threshold
        elif self.condition == "ne":
            return value != self.threshold
        elif self.condition == "gte":
            return value >= self.threshold
        elif self.condition == "lte":
            return value <= self.threshold
        else:
            logger.warning(f"Unknown condition: {self.condition}")
            return False


@dataclass
class NotificationChannel:
    """Notification channel configuration"""
    id: str
    name: str
    type: str  # slack, pagerduty, email, webhook
    config: Dict[str, Any]
    enabled: bool = True
    severity_filter: List[AlertSeverity] = field(default_factory=list)
    service_filter: List[str] = field(default_factory=list)


@dataclass
class EscalationPolicy:
    """Escalation policy configuration"""
    id: str
    name: str
    levels: List[Dict[str, Any]]  # Each level has delay and channels
    repeat_count: int = 3
    repeat_delay: int = 1800  # seconds


class PagerDutyService:
    """PagerDuty integration service"""
    
    def __init__(self):
        self.api_key = settings.PAGERDUTY_API_KEY
        self.session: Optional[pdpyras.APISession] = None
        self.service_id = settings.PAGERDUTY_SERVICE_ID
        self.escalation_policy_id = settings.PAGERDUTY_ESCALATION_POLICY_ID
        
    def initialize(self) -> bool:
        """Initialize PagerDuty session"""
        try:
            if not self.api_key:
                logger.warning("PagerDuty API key not configured")
                return False
            
            self.session = pdpyras.APISession(self.api_key)
            
            # Test connection
            user = self.session.rget("/users/me")
            logger.info(f"PagerDuty connected as: {user.get('name', 'Unknown')}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize PagerDuty: {e}")
            return False
    
    async def create_incident(self, alert: Alert) -> Optional[Dict[str, Any]]:
        """Create PagerDuty incident"""
        try:
            if not self.session:
                logger.warning("PagerDuty not initialized")
                return None
            
            incident_data = {
                "incident": {
                    "type": "incident",
                    "title": alert.title,
                    "service": {
                        "id": self.service_id,
                        "type": "service_reference"
                    },
                    "urgency": "high" if alert.severity in [AlertSeverity.CRITICAL, AlertSeverity.HIGH] else "low",
                    "body": {
                        "type": "incident_body",
                        "details": alert.description
                    },
                    "escalation_policy": {
                        "id": self.escalation_policy_id,
                        "type": "escalation_policy_reference"
                    }
                }
            }
            
            # Run in thread pool since pdpyras is synchronous
            loop = asyncio.get_event_loop()
            incident = await loop.run_in_executor(
                None,
                lambda: self.session.rpost("/incidents", json=incident_data)
            )
            
            logger.info(f"Created PagerDuty incident: {incident.get('id')}")
            return incident
            
        except Exception as e:
            logger.error(f"Failed to create PagerDuty incident: {e}")
            return None
    
    async def resolve_incident(self, incident_id: str, resolution_note: str = "") -> bool:
        """Resolve PagerDuty incident"""
        try:
            if not self.session:
                return False
            
            incident_data = {
                "incident": {
                    "type": "incident",
                    "status": "resolved"
                }
            }
            
            if resolution_note:
                incident_data["incident"]["resolution"] = resolution_note
            
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                None,
                lambda: self.session.rput(f"/incidents/{incident_id}", json=incident_data)
            )
            
            logger.info(f"Resolved PagerDuty incident: {incident_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to resolve PagerDuty incident: {e}")
            return False
    
    async def acknowledge_incident(self, incident_id: str) -> bool:
        """Acknowledge PagerDuty incident"""
        try:
            if not self.session:
                return False
            
            incident_data = {
                "incident": {
                    "type": "incident",
                    "status": "acknowledged"
                }
            }
            
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                None,
                lambda: self.session.rput(f"/incidents/{incident_id}", json=incident_data)
            )
            
            logger.info(f"Acknowledged PagerDuty incident: {incident_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to acknowledge PagerDuty incident: {e}")
            return False


class SlackService:
    """Slack integration service"""
    
    def __init__(self):
        self.bot_token = settings.SLACK_BOT_TOKEN
        self.client: Optional[AsyncWebClient] = None
        self.default_channel = settings.SLACK_DEFAULT_CHANNEL
        self.severity_channels = {
            AlertSeverity.CRITICAL: settings.SLACK_CRITICAL_CHANNEL,
            AlertSeverity.HIGH: settings.SLACK_HIGH_CHANNEL,
            AlertSeverity.MEDIUM: settings.SLACK_MEDIUM_CHANNEL,
            AlertSeverity.LOW: settings.SLACK_LOW_CHANNEL,
        }
        
    def initialize(self) -> bool:
        """Initialize Slack client"""
        try:
            if not self.bot_token:
                logger.warning("Slack bot token not configured")
                return False
            
            self.client = AsyncWebClient(token=self.bot_token)
            logger.info("Slack client initialized")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize Slack client: {e}")
            return False
    
    def _get_alert_color(self, severity: AlertSeverity) -> str:
        """Get Slack message color based on severity"""
        color_map = {
            AlertSeverity.CRITICAL: "#FF0000",  # Red
            AlertSeverity.HIGH: "#FF8800",      # Orange
            AlertSeverity.MEDIUM: "#FFCC00",    # Yellow
            AlertSeverity.LOW: "#00AA00",       # Green
            AlertSeverity.INFO: "#0099CC"       # Blue
        }
        return color_map.get(severity, "#808080")
    
    def _build_alert_attachment(self, alert: Alert) -> Dict[str, Any]:
        """Build Slack attachment for alert"""
        fields = [
            {
                "title": "Service",
                "value": alert.service,
                "short": True
            },
            {
                "title": "Severity",
                "value": alert.severity.value.upper(),
                "short": True
            },
            {
                "title": "Source",
                "value": alert.source.value,
                "short": True
            },
            {
                "title": "Created",
                "value": alert.created_at.strftime("%Y-%m-%d %H:%M:%S UTC"),
                "short": True
            }
        ]
        
        if alert.metric_name:
            fields.append({
                "title": "Metric",
                "value": alert.metric_name,
                "short": True
            })
        
        if alert.metric_value is not None:
            fields.append({
                "title": "Value",
                "value": str(alert.metric_value),
                "short": True
            })
        
        if alert.threshold is not None:
            fields.append({
                "title": "Threshold",
                "value": str(alert.threshold),
                "short": True
            })
        
        return {
            "color": self._get_alert_color(alert.severity),
            "title": alert.title,
            "text": alert.description,
            "fields": fields,
            "footer": "TouriQuest Monitoring",
            "ts": int(alert.created_at.timestamp())
        }
    
    async def send_alert(self, alert: Alert, channel: Optional[str] = None) -> Optional[str]:
        """Send alert to Slack"""
        try:
            if not self.client:
                logger.warning("Slack client not initialized")
                return None
            
            # Determine channel
            if not channel:
                channel = self.severity_channels.get(alert.severity, self.default_channel)
            
            if not channel:
                logger.warning("No Slack channel configured for alert")
                return None
            
            # Build message
            attachment = self._build_alert_attachment(alert)
            
            emoji_map = {
                AlertSeverity.CRITICAL: ":rotating_light:",
                AlertSeverity.HIGH: ":warning:",
                AlertSeverity.MEDIUM: ":large_orange_diamond:",
                AlertSeverity.LOW: ":information_source:",
                AlertSeverity.INFO: ":blue_circle:"
            }
            
            emoji = emoji_map.get(alert.severity, ":exclamation:")
            
            response = await self.client.chat_postMessage(
                channel=channel,
                text=f"{emoji} {alert.severity.value.upper()} Alert: {alert.title}",
                attachments=[attachment],
                unfurl_links=False,
                unfurl_media=False
            )
            
            if response["ok"]:
                logger.info(f"Sent Slack alert to {channel}: {alert.id}")
                return response["ts"]
            else:
                logger.error(f"Failed to send Slack alert: {response.get('error')}")
                return None
                
        except SlackApiError as e:
            logger.error(f"Slack API error: {e.response['error']}")
            return None
        except Exception as e:
            logger.error(f"Failed to send Slack alert: {e}")
            return None
    
    async def update_alert_message(self, channel: str, timestamp: str, alert: Alert) -> bool:
        """Update existing Slack alert message"""
        try:
            if not self.client:
                return False
            
            attachment = self._build_alert_attachment(alert)
            
            # Add status to attachment
            attachment["fields"].append({
                "title": "Status",
                "value": alert.status.value.upper(),
                "short": True
            })
            
            emoji_map = {
                AlertStatus.OPEN: ":red_circle:",
                AlertStatus.ACKNOWLEDGED: ":yellow_circle:",
                AlertStatus.RESOLVED: ":green_circle:",
                AlertStatus.SUPPRESSED: ":white_circle:"
            }
            
            status_emoji = emoji_map.get(alert.status, ":question:")
            
            response = await self.client.chat_update(
                channel=channel,
                ts=timestamp,
                text=f"{status_emoji} {alert.severity.value.upper()} Alert: {alert.title}",
                attachments=[attachment]
            )
            
            return response["ok"]
            
        except Exception as e:
            logger.error(f"Failed to update Slack message: {e}")
            return False
    
    async def send_resolution_message(self, alert: Alert, channel: Optional[str] = None) -> bool:
        """Send alert resolution message"""
        try:
            if not self.client:
                return False
            
            if not channel:
                channel = self.severity_channels.get(alert.severity, self.default_channel)
            
            if not channel:
                return False
            
            response = await self.client.chat_postMessage(
                channel=channel,
                text=f":white_check_mark: Resolved: {alert.title}",
                attachments=[{
                    "color": "#36a64f",  # Green
                    "fields": [
                        {
                            "title": "Service",
                            "value": alert.service,
                            "short": True
                        },
                        {
                            "title": "Duration",
                            "value": str(alert.updated_at - alert.created_at),
                            "short": True
                        }
                    ]
                }]
            )
            
            return response["ok"]
            
        except Exception as e:
            logger.error(f"Failed to send resolution message: {e}")
            return False


class AlertingService:
    """Main alerting service"""
    
    def __init__(self):
        self.pagerduty = PagerDutyService()
        self.slack = SlackService()
        self.alert_rules: Dict[str, AlertRule] = {}
        self.notification_channels: Dict[str, NotificationChannel] = {}
        self.escalation_policies: Dict[str, EscalationPolicy] = {}
        self.active_alerts: Dict[str, Alert] = {}
        self.alert_history: List[Alert] = []
        self.suppression_rules: Dict[str, Dict[str, Any]] = {}
        self._background_tasks: List[asyncio.Task] = []
        
    async def initialize(self) -> bool:
        """Initialize alerting service"""
        try:
            # Initialize integrations
            pagerduty_ok = self.pagerduty.initialize()
            slack_ok = self.slack.initialize()
            
            if not pagerduty_ok and not slack_ok:
                logger.warning("No alerting integrations available")
            
            # Load default alert rules
            await self._load_default_rules()
            
            # Start background tasks
            self._start_background_tasks()
            
            logger.info("Alerting service initialized")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize alerting service: {e}")
            return False
    
    async def _load_default_rules(self) -> None:
        """Load default alert rules"""
        default_rules = [
            AlertRule(
                id="high_cpu_usage",
                name="High CPU Usage",
                description="CPU usage is above 80%",
                service="system",
                metric_name="cpu_usage_percent",
                condition="gt",
                threshold=80.0,
                severity=AlertSeverity.HIGH,
                evaluation_window=300,
                cooldown=1800
            ),
            AlertRule(
                id="high_memory_usage",
                name="High Memory Usage",
                description="Memory usage is above 85%",
                service="system",
                metric_name="memory_usage_percent",
                condition="gt",
                threshold=85.0,
                severity=AlertSeverity.HIGH,
                evaluation_window=300,
                cooldown=1800
            ),
            AlertRule(
                id="high_error_rate",
                name="High Error Rate",
                description="HTTP error rate is above 5%",
                service="api",
                metric_name="http_error_rate",
                condition="gt",
                threshold=5.0,
                severity=AlertSeverity.CRITICAL,
                evaluation_window=180,
                cooldown=900
            ),
            AlertRule(
                id="slow_response_time",
                name="Slow Response Time",
                description="Average response time is above 2000ms",
                service="api",
                metric_name="http_request_duration_avg",
                condition="gt",
                threshold=2000.0,
                severity=AlertSeverity.MEDIUM,
                evaluation_window=300,
                cooldown=1800
            ),
            AlertRule(
                id="database_connection_failure",
                name="Database Connection Failure",
                description="Cannot connect to database",
                service="database",
                metric_name="database_connection_status",
                condition="eq",
                threshold=0.0,
                severity=AlertSeverity.CRITICAL,
                evaluation_window=60,
                cooldown=300
            )
        ]
        
        for rule in default_rules:
            self.alert_rules[rule.id] = rule
        
        logger.info(f"Loaded {len(default_rules)} default alert rules")
    
    def _start_background_tasks(self) -> None:
        """Start background tasks"""
        # Alert cleanup task
        cleanup_task = asyncio.create_task(self._cleanup_resolved_alerts())
        self._background_tasks.append(cleanup_task)
        
        # Escalation task
        escalation_task = asyncio.create_task(self._handle_escalations())
        self._background_tasks.append(escalation_task)
    
    async def _cleanup_resolved_alerts(self) -> None:
        """Clean up resolved alerts periodically"""
        while True:
            try:
                await asyncio.sleep(3600)  # Run every hour
                
                cutoff_time = datetime.utcnow() - timedelta(hours=24)
                
                # Move old resolved alerts to history
                resolved_alerts = {
                    k: v for k, v in self.active_alerts.items()
                    if v.status == AlertStatus.RESOLVED and v.updated_at < cutoff_time
                }
                
                for alert_id in resolved_alerts:
                    alert = self.active_alerts.pop(alert_id)
                    self.alert_history.append(alert)
                
                if resolved_alerts:
                    logger.info(f"Cleaned up {len(resolved_alerts)} resolved alerts")
                
            except Exception as e:
                logger.error(f"Error in alert cleanup: {e}")
                await asyncio.sleep(60)
    
    async def _handle_escalations(self) -> None:
        """Handle alert escalations"""
        while True:
            try:
                await asyncio.sleep(60)  # Check every minute
                
                now = datetime.utcnow()
                
                for alert in self.active_alerts.values():
                    if alert.status != AlertStatus.OPEN:
                        continue
                    
                    # Check if alert needs escalation
                    time_since_creation = (now - alert.created_at).total_seconds()
                    escalation_intervals = [300, 900, 1800, 3600]  # 5min, 15min, 30min, 1hour
                    
                    for i, interval in enumerate(escalation_intervals):
                        if (time_since_creation >= interval and 
                            alert.escalation_level <= i):
                            
                            alert.escalation_level = i + 1
                            await self._escalate_alert(alert)
                            break
                
            except Exception as e:
                logger.error(f"Error in escalation handling: {e}")
                await asyncio.sleep(60)
    
    async def _escalate_alert(self, alert: Alert) -> None:
        """Escalate alert to higher severity channels"""
        try:
            # Increase severity for escalation
            if alert.escalation_level >= 3:
                new_severity = AlertSeverity.CRITICAL
            elif alert.escalation_level >= 2:
                new_severity = AlertSeverity.HIGH
            else:
                new_severity = alert.severity
            
            escalated_alert = Alert(
                id=f"{alert.id}_escalated_{alert.escalation_level}",
                title=f"ESCALATED: {alert.title}",
                description=f"Alert has been escalated (Level {alert.escalation_level}). Original alert: {alert.description}",
                severity=new_severity,
                source=alert.source,
                service=alert.service,
                metric_name=alert.metric_name,
                metric_value=alert.metric_value,
                threshold=alert.threshold,
                tags=alert.tags,
                metadata={**alert.metadata, "original_alert_id": alert.id, "escalation_level": alert.escalation_level}
            )
            
            # Send escalated notification
            await self.send_notification(escalated_alert)
            
            logger.warning(f"Escalated alert {alert.id} to level {alert.escalation_level}")
            
        except Exception as e:
            logger.error(f"Failed to escalate alert {alert.id}: {e}")
    
    async def create_alert(
        self,
        title: str,
        description: str,
        severity: AlertSeverity,
        source: AlertSource,
        service: str,
        metric_name: Optional[str] = None,
        metric_value: Optional[float] = None,
        threshold: Optional[float] = None,
        tags: Optional[Dict[str, str]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Alert:
        """Create a new alert"""
        alert = Alert(
            id=f"{service}_{source}_{int(time.time())}",
            title=title,
            description=description,
            severity=severity,
            source=source,
            service=service,
            metric_name=metric_name,
            metric_value=metric_value,
            threshold=threshold,
            tags=tags or {},
            metadata=metadata or {}
        )
        
        # Check for deduplication
        unique_key = alert.get_unique_key()
        existing_alert = None
        
        for existing in self.active_alerts.values():
            if existing.get_unique_key() == unique_key and existing.status == AlertStatus.OPEN:
                existing_alert = existing
                break
        
        if existing_alert:
            # Update existing alert instead of creating new one
            existing_alert.description = description
            existing_alert.metric_value = metric_value
            existing_alert.updated_at = datetime.utcnow()
            existing_alert.notification_count += 1
            logger.info(f"Updated existing alert: {existing_alert.id}")
            return existing_alert
        
        # Add new alert
        self.active_alerts[alert.id] = alert
        
        # Send notification
        await self.send_notification(alert)
        
        logger.info(f"Created new alert: {alert.id}")
        return alert
    
    async def send_notification(self, alert: Alert) -> bool:
        """Send alert notification to configured channels"""
        try:
            success = False
            
            # Send to Slack
            if self.slack.client:
                slack_result = await self.slack.send_alert(alert)
                if slack_result:
                    success = True
                    # Store Slack message info for updates
                    if "slack_messages" not in alert.metadata:
                        alert.metadata["slack_messages"] = []
                    alert.metadata["slack_messages"].append({
                        "channel": self.slack.severity_channels.get(alert.severity, self.slack.default_channel),
                        "timestamp": slack_result
                    })
            
            # Send to PagerDuty for critical/high alerts
            if (alert.severity in [AlertSeverity.CRITICAL, AlertSeverity.HIGH] and 
                self.pagerduty.session):
                pd_result = await self.pagerduty.create_incident(alert)
                if pd_result:
                    success = True
                    alert.metadata["pagerduty_incident_id"] = pd_result.get("id")
            
            alert.last_notification = datetime.utcnow()
            alert.notification_count += 1
            
            return success
            
        except Exception as e:
            logger.error(f"Failed to send notification for alert {alert.id}: {e}")
            return False
    
    async def resolve_alert(self, alert_id: str, resolution_note: str = "") -> bool:
        """Resolve an alert"""
        try:
            alert = self.active_alerts.get(alert_id)
            if not alert:
                logger.warning(f"Alert not found: {alert_id}")
                return False
            
            alert.status = AlertStatus.RESOLVED
            alert.updated_at = datetime.utcnow()
            
            # Resolve PagerDuty incident if exists
            if "pagerduty_incident_id" in alert.metadata:
                await self.pagerduty.resolve_incident(
                    alert.metadata["pagerduty_incident_id"],
                    resolution_note
                )
            
            # Send Slack resolution message
            if self.slack.client:
                await self.slack.send_resolution_message(alert)
            
            logger.info(f"Resolved alert: {alert_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to resolve alert {alert_id}: {e}")
            return False
    
    async def acknowledge_alert(self, alert_id: str) -> bool:
        """Acknowledge an alert"""
        try:
            alert = self.active_alerts.get(alert_id)
            if not alert:
                return False
            
            alert.status = AlertStatus.ACKNOWLEDGED
            alert.updated_at = datetime.utcnow()
            
            # Acknowledge PagerDuty incident if exists
            if "pagerduty_incident_id" in alert.metadata:
                await self.pagerduty.acknowledge_incident(
                    alert.metadata["pagerduty_incident_id"]
                )
            
            logger.info(f"Acknowledged alert: {alert_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to acknowledge alert {alert_id}: {e}")
            return False
    
    def add_alert_rule(self, rule: AlertRule) -> None:
        """Add alert rule"""
        self.alert_rules[rule.id] = rule
        logger.info(f"Added alert rule: {rule.id}")
    
    def remove_alert_rule(self, rule_id: str) -> bool:
        """Remove alert rule"""
        if rule_id in self.alert_rules:
            del self.alert_rules[rule_id]
            logger.info(f"Removed alert rule: {rule_id}")
            return True
        return False
    
    async def evaluate_metric(self, service: str, metric_name: str, value: float) -> List[Alert]:
        """Evaluate metric against alert rules"""
        triggered_alerts = []
        
        for rule in self.alert_rules.values():
            if (rule.enabled and 
                rule.service == service and 
                rule.metric_name == metric_name and
                rule.evaluate(value)):
                
                # Check cooldown
                unique_key = f"{service}:{AlertSource.METRICS}:{metric_name}"
                existing_alert = None
                
                for alert in self.active_alerts.values():
                    if alert.get_unique_key() == unique_key:
                        existing_alert = alert
                        break
                
                if existing_alert:
                    # Check if still in cooldown
                    if existing_alert.last_notification:
                        time_since_last = (datetime.utcnow() - existing_alert.last_notification).total_seconds()
                        if time_since_last < rule.cooldown:
                            continue
                
                # Create alert
                alert = await self.create_alert(
                    title=rule.name,
                    description=rule.description,
                    severity=rule.severity,
                    source=AlertSource.METRICS,
                    service=service,
                    metric_name=metric_name,
                    metric_value=value,
                    threshold=rule.threshold,
                    tags=rule.tags.copy(),
                    metadata={"rule_id": rule.id}
                )
                
                triggered_alerts.append(alert)
        
        return triggered_alerts
    
    def get_active_alerts(self, service: Optional[str] = None, severity: Optional[AlertSeverity] = None) -> List[Alert]:
        """Get active alerts with optional filtering"""
        alerts = list(self.active_alerts.values())
        
        if service:
            alerts = [a for a in alerts if a.service == service]
        
        if severity:
            alerts = [a for a in alerts if a.severity == severity]
        
        return sorted(alerts, key=lambda x: x.created_at, reverse=True)
    
    def get_alert_statistics(self) -> Dict[str, Any]:
        """Get alert statistics"""
        active_alerts = list(self.active_alerts.values())
        
        stats = {
            "total_active": len(active_alerts),
            "by_severity": {
                severity.value: len([a for a in active_alerts if a.severity == severity])
                for severity in AlertSeverity
            },
            "by_status": {
                status.value: len([a for a in active_alerts if a.status == status])
                for status in AlertStatus
            },
            "by_service": {},
            "total_rules": len(self.alert_rules),
            "enabled_rules": len([r for r in self.alert_rules.values() if r.enabled])
        }
        
        # Count by service
        for alert in active_alerts:
            service = alert.service
            if service not in stats["by_service"]:
                stats["by_service"][service] = 0
            stats["by_service"][service] += 1
        
        return stats
    
    async def shutdown(self) -> None:
        """Shutdown alerting service"""
        try:
            # Cancel background tasks
            for task in self._background_tasks:
                task.cancel()
            
            # Wait for tasks to complete
            if self._background_tasks:
                await asyncio.gather(*self._background_tasks, return_exceptions=True)
            
            logger.info("Alerting service shutdown completed")
            
        except Exception as e:
            logger.error(f"Error during alerting shutdown: {e}")


# Global alerting service instance
alerting_service = AlertingService()