"""
Prometheus metrics collection service for comprehensive application and infrastructure monitoring
"""

from typing import Dict, List, Optional, Any, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
import time
import asyncio
import logging
from collections import defaultdict, Counter
import psutil

from prometheus_client import (
    Counter as PrometheusCounter,
    Histogram,
    Gauge,
    Summary,
    Info,
    Enum as PrometheusEnum,
    CollectorRegistry,
    generate_latest,
    CONTENT_TYPE_LATEST,
    push_to_gateway,
    multiprocess,
    values
)
from prometheus_client.openmetrics.exposition import CONTENT_TYPE_LATEST as OPENMETRICS_CONTENT_TYPE
from prometheus_fastapi_instrumentator import Instrumentator, metrics

from app.core.config import settings


logger = logging.getLogger(__name__)


class MetricType(str, Enum):
    """Metric type enumeration"""
    COUNTER = "counter"
    GAUGE = "gauge"
    HISTOGRAM = "histogram"
    SUMMARY = "summary"
    INFO = "info"
    ENUM = "enum"


@dataclass
class CustomMetric:
    """Custom metric definition"""
    name: str
    description: str
    metric_type: MetricType
    labels: List[str] = None
    buckets: List[float] = None  # For histograms
    
    def __post_init__(self):
        if self.labels is None:
            self.labels = []


class MetricsCollector:
    """Comprehensive metrics collection service"""
    
    def __init__(self):
        self.registry = CollectorRegistry()
        self.custom_metrics: Dict[str, Any] = {}
        self.instrumentator: Optional[Instrumentator] = None
        
        # Application metrics
        self.app_metrics = self._setup_application_metrics()
        
        # Business metrics
        self.business_metrics = self._setup_business_metrics()
        
        # Infrastructure metrics
        self.infrastructure_metrics = self._setup_infrastructure_metrics()
        
        # Custom metrics
        self.custom_metric_definitions: Dict[str, CustomMetric] = {}
        
        # Metric collection state
        self._last_collection_time = time.time()
        self._collection_errors = 0
        
    def _setup_application_metrics(self) -> Dict[str, Any]:
        """Setup application-level metrics"""
        return {
            # Request metrics
            "http_requests_total": PrometheusCounter(
                "touriquest_http_requests_total",
                "Total number of HTTP requests",
                ["method", "endpoint", "status", "service"],
                registry=self.registry
            ),
            "http_request_duration_seconds": Histogram(
                "touriquest_http_request_duration_seconds",
                "HTTP request duration in seconds",
                ["method", "endpoint", "service"],
                buckets=[0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0],
                registry=self.registry
            ),
            "http_request_size_bytes": Histogram(
                "touriquest_http_request_size_bytes",
                "HTTP request size in bytes",
                ["method", "endpoint", "service"],
                registry=self.registry
            ),
            "http_response_size_bytes": Histogram(
                "touriquest_http_response_size_bytes",
                "HTTP response size in bytes",
                ["method", "endpoint", "service"],
                registry=self.registry
            ),
            
            # Error metrics
            "application_errors_total": PrometheusCounter(
                "touriquest_application_errors_total",
                "Total number of application errors",
                ["error_type", "service", "severity"],
                registry=self.registry
            ),
            "database_errors_total": PrometheusCounter(
                "touriquest_database_errors_total",
                "Total number of database errors",
                ["error_type", "operation", "service"],
                registry=self.registry
            ),
            
            # Database metrics
            "database_connections": Gauge(
                "touriquest_database_connections",
                "Number of active database connections",
                ["service", "pool_name"],
                registry=self.registry
            ),
            "database_query_duration_seconds": Histogram(
                "touriquest_database_query_duration_seconds",
                "Database query duration in seconds",
                ["operation", "table", "service"],
                buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0],
                registry=self.registry
            ),
            
            # Cache metrics
            "cache_operations_total": PrometheusCounter(
                "touriquest_cache_operations_total",
                "Total number of cache operations",
                ["operation", "result", "service"],
                registry=self.registry
            ),
            "cache_hit_ratio": Gauge(
                "touriquest_cache_hit_ratio",
                "Cache hit ratio",
                ["cache_name", "service"],
                registry=self.registry
            ),
            
            # Background task metrics
            "background_tasks_total": PrometheusCounter(
                "touriquest_background_tasks_total",
                "Total number of background tasks",
                ["task_name", "status", "service"],
                registry=self.registry
            ),
            "background_task_duration_seconds": Histogram(
                "touriquest_background_task_duration_seconds",
                "Background task duration in seconds",
                ["task_name", "service"],
                registry=self.registry
            ),
            
            # API rate limiting
            "rate_limit_exceeded_total": PrometheusCounter(
                "touriquest_rate_limit_exceeded_total",
                "Total number of rate limit violations",
                ["endpoint", "user_type", "service"],
                registry=self.registry
            ),
        }
    
    def _setup_business_metrics(self) -> Dict[str, Any]:
        """Setup business-level metrics"""
        return {
            # User metrics
            "active_users": Gauge(
                "touriquest_active_users",
                "Number of active users",
                ["time_window", "user_type"],
                registry=self.registry
            ),
            "user_registrations_total": PrometheusCounter(
                "touriquest_user_registrations_total",
                "Total number of user registrations",
                ["registration_type", "source"],
                registry=self.registry
            ),
            "user_sessions_total": PrometheusCounter(
                "touriquest_user_sessions_total",
                "Total number of user sessions",
                ["session_type", "device_type"],
                registry=self.registry
            ),
            
            # Booking metrics
            "bookings_total": PrometheusCounter(
                "touriquest_bookings_total",
                "Total number of bookings",
                ["status", "property_type", "booking_source"],
                registry=self.registry
            ),
            "booking_value_total": PrometheusCounter(
                "touriquest_booking_value_total",
                "Total booking value",
                ["currency", "property_type"],
                registry=self.registry
            ),
            "booking_conversion_rate": Gauge(
                "touriquest_booking_conversion_rate",
                "Booking conversion rate",
                ["funnel_stage", "property_type"],
                registry=self.registry
            ),
            
            # Property metrics
            "properties_total": Gauge(
                "touriquest_properties_total",
                "Total number of properties",
                ["status", "property_type", "location"],
                registry=self.registry
            ),
            "property_views_total": PrometheusCounter(
                "touriquest_property_views_total",
                "Total number of property views",
                ["property_type", "view_source"],
                registry=self.registry
            ),
            
            # Search metrics
            "searches_total": PrometheusCounter(
                "touriquest_searches_total",
                "Total number of searches",
                ["search_type", "result_count_bucket"],
                registry=self.registry
            ),
            "search_response_time_seconds": Histogram(
                "touriquest_search_response_time_seconds",
                "Search response time in seconds",
                ["search_type", "complexity"],
                buckets=[0.1, 0.25, 0.5, 1.0, 2.0, 5.0],
                registry=self.registry
            ),
            
            # AI Assistant metrics
            "ai_interactions_total": PrometheusCounter(
                "touriquest_ai_interactions_total",
                "Total number of AI interactions",
                ["interaction_type", "model", "user_type"],
                registry=self.registry
            ),
            "ai_response_time_seconds": Histogram(
                "touriquest_ai_response_time_seconds",
                "AI response time in seconds",
                ["model", "interaction_type"],
                registry=self.registry
            ),
            
            # Payment metrics
            "payments_total": PrometheusCounter(
                "touriquest_payments_total",
                "Total number of payments",
                ["status", "payment_method", "currency"],
                registry=self.registry
            ),
            "payment_amount_total": PrometheusCounter(
                "touriquest_payment_amount_total",
                "Total payment amount",
                ["currency", "payment_method"],
                registry=self.registry
            ),
        }
    
    def _setup_infrastructure_metrics(self) -> Dict[str, Any]:
        """Setup infrastructure-level metrics"""
        return {
            # System metrics
            "cpu_usage_percent": Gauge(
                "touriquest_cpu_usage_percent",
                "CPU usage percentage",
                ["service", "core"],
                registry=self.registry
            ),
            "memory_usage_bytes": Gauge(
                "touriquest_memory_usage_bytes",
                "Memory usage in bytes",
                ["service", "type"],
                registry=self.registry
            ),
            "disk_usage_bytes": Gauge(
                "touriquest_disk_usage_bytes",
                "Disk usage in bytes",
                ["service", "mountpoint", "type"],
                registry=self.registry
            ),
            "network_io_bytes_total": PrometheusCounter(
                "touriquest_network_io_bytes_total",
                "Total network I/O in bytes",
                ["service", "direction", "interface"],
                registry=self.registry
            ),
            
            # Service health
            "service_health": PrometheusEnum(
                "touriquest_service_health",
                "Service health status",
                ["service"],
                states=["healthy", "degraded", "unhealthy", "unknown"],
                registry=self.registry
            ),
            "service_uptime_seconds": Gauge(
                "touriquest_service_uptime_seconds",
                "Service uptime in seconds",
                ["service"],
                registry=self.registry
            ),
            
            # Database metrics
            "database_pool_connections": Gauge(
                "touriquest_database_pool_connections",
                "Database pool connections",
                ["service", "pool_name", "state"],
                registry=self.registry
            ),
            "database_transactions_total": PrometheusCounter(
                "touriquest_database_transactions_total",
                "Total database transactions",
                ["service", "status"],
                registry=self.registry
            ),
            
            # Message queue metrics
            "queue_messages_total": Gauge(
                "touriquest_queue_messages_total",
                "Total messages in queue",
                ["queue_name", "service"],
                registry=self.registry
            ),
            "queue_processing_duration_seconds": Histogram(
                "touriquest_queue_processing_duration_seconds",
                "Queue message processing duration",
                ["queue_name", "service"],
                registry=self.registry
            ),
            
            # External service metrics
            "external_service_requests_total": PrometheusCounter(
                "touriquest_external_service_requests_total",
                "Total external service requests",
                ["service_name", "endpoint", "status"],
                registry=self.registry
            ),
            "external_service_response_time_seconds": Histogram(
                "touriquest_external_service_response_time_seconds",
                "External service response time",
                ["service_name", "endpoint"],
                registry=self.registry
            ),
        }
    
    def setup_fastapi_instrumentation(self, app) -> Instrumentator:
        """Setup FastAPI instrumentation"""
        self.instrumentator = Instrumentator(
            should_group_status_codes=True,
            should_ignore_untemplated=True,
            should_respect_env_var=True,
            should_instrument_requests_inprogress=True,
            excluded_handlers=["/metrics", "/health", "/docs", "/redoc", "/openapi.json"],
            env_var_name="ENABLE_METRICS",
            inprogress_name="touriquest_requests_inprogress",
            inprogress_labels=True,
        )
        
        # Add default metrics
        self.instrumentator.add(
            metrics.request_size(
                should_include_handler=True,
                should_include_method=True,
                should_include_status=True,
                metric_namespace="touriquest",
            )
        ).add(
            metrics.response_size(
                should_include_handler=True,
                should_include_method=True,
                should_include_status=True,
                metric_namespace="touriquest",
            )
        ).add(
            metrics.latency(
                should_include_handler=True,
                should_include_method=True,
                should_include_status=True,
                metric_namespace="touriquest",
            )
        ).add(
            metrics.requests(
                should_include_handler=True,
                should_include_method=True,
                should_include_status=True,
                metric_namespace="touriquest",
            )
        )
        
        # Custom metrics
        self.instrumentator.add(self._custom_error_metrics())
        self.instrumentator.add(self._custom_performance_metrics())
        
        # Instrument the app
        self.instrumentator.instrument(app)
        
        return self.instrumentator
    
    def _custom_error_metrics(self):
        """Custom error metrics instrumentor"""
        def instrumentor(info: metrics.Info) -> None:
            if info.response and info.response.status_code >= 400:
                error_type = "client_error" if info.response.status_code < 500 else "server_error"
                severity = "warning" if info.response.status_code < 500 else "error"
                
                self.app_metrics["application_errors_total"].labels(
                    error_type=error_type,
                    service="monitoring-service",
                    severity=severity
                ).inc()
        
        return instrumentor
    
    def _custom_performance_metrics(self):
        """Custom performance metrics instrumentor"""
        def instrumentor(info: metrics.Info) -> None:
            if info.response:
                # Track slow requests
                if hasattr(info, "modified_duration") and info.modified_duration > settings.PERFORMANCE_THRESHOLD_RESPONSE_TIME:
                    self.record_custom_metric(
                        "slow_requests_total",
                        1,
                        labels={
                            "endpoint": info.request.url.path,
                            "method": info.request.method,
                            "service": "monitoring-service"
                        }
                    )
        
        return instrumentor
    
    def create_custom_metric(self, metric_def: CustomMetric) -> bool:
        """Create a custom metric"""
        try:
            if metric_def.name in self.custom_metrics:
                logger.warning(f"Metric {metric_def.name} already exists")
                return False
            
            labels = metric_def.labels or []
            
            if metric_def.metric_type == MetricType.COUNTER:
                metric = PrometheusCounter(
                    metric_def.name,
                    metric_def.description,
                    labels,
                    registry=self.registry
                )
            elif metric_def.metric_type == MetricType.GAUGE:
                metric = Gauge(
                    metric_def.name,
                    metric_def.description,
                    labels,
                    registry=self.registry
                )
            elif metric_def.metric_type == MetricType.HISTOGRAM:
                buckets = metric_def.buckets or [0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
                metric = Histogram(
                    metric_def.name,
                    metric_def.description,
                    labels,
                    buckets=buckets,
                    registry=self.registry
                )
            elif metric_def.metric_type == MetricType.SUMMARY:
                metric = Summary(
                    metric_def.name,
                    metric_def.description,
                    labels,
                    registry=self.registry
                )
            elif metric_def.metric_type == MetricType.INFO:
                metric = Info(
                    metric_def.name,
                    metric_def.description,
                    registry=self.registry
                )
            else:
                logger.error(f"Unsupported metric type: {metric_def.metric_type}")
                return False
            
            self.custom_metrics[metric_def.name] = metric
            self.custom_metric_definitions[metric_def.name] = metric_def
            
            logger.info(f"Created custom metric: {metric_def.name}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to create custom metric {metric_def.name}: {e}")
            return False
    
    def record_custom_metric(self, metric_name: str, value: float, labels: Optional[Dict[str, str]] = None) -> bool:
        """Record a value for a custom metric"""
        try:
            if metric_name not in self.custom_metrics:
                logger.warning(f"Metric {metric_name} not found")
                return False
            
            metric = self.custom_metrics[metric_name]
            metric_def = self.custom_metric_definitions[metric_name]
            
            if labels:
                if metric_def.metric_type in [MetricType.COUNTER, MetricType.GAUGE]:
                    metric_instance = metric.labels(**labels)
                else:
                    metric_instance = metric.labels(**labels)
            else:
                metric_instance = metric
            
            if metric_def.metric_type == MetricType.COUNTER:
                metric_instance.inc(value)
            elif metric_def.metric_type == MetricType.GAUGE:
                metric_instance.set(value)
            elif metric_def.metric_type in [MetricType.HISTOGRAM, MetricType.SUMMARY]:
                metric_instance.observe(value)
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to record metric {metric_name}: {e}")
            return False
    
    def collect_system_metrics(self) -> None:
        """Collect system-level metrics"""
        try:
            # CPU metrics
            cpu_percent = psutil.cpu_percent(interval=None, percpu=True)
            for i, cpu_usage in enumerate(cpu_percent):
                self.infrastructure_metrics["cpu_usage_percent"].labels(
                    service="monitoring-service",
                    core=str(i)
                ).set(cpu_usage)
            
            # Memory metrics
            memory = psutil.virtual_memory()
            self.infrastructure_metrics["memory_usage_bytes"].labels(
                service="monitoring-service",
                type="used"
            ).set(memory.used)
            self.infrastructure_metrics["memory_usage_bytes"].labels(
                service="monitoring-service",
                type="available"
            ).set(memory.available)
            self.infrastructure_metrics["memory_usage_bytes"].labels(
                service="monitoring-service",
                type="total"
            ).set(memory.total)
            
            # Disk metrics
            disk_usage = psutil.disk_usage('/')
            self.infrastructure_metrics["disk_usage_bytes"].labels(
                service="monitoring-service",
                mountpoint="/",
                type="used"
            ).set(disk_usage.used)
            self.infrastructure_metrics["disk_usage_bytes"].labels(
                service="monitoring-service",
                mountpoint="/",
                type="free"
            ).set(disk_usage.free)
            self.infrastructure_metrics["disk_usage_bytes"].labels(
                service="monitoring-service",
                mountpoint="/",
                type="total"
            ).set(disk_usage.total)
            
            # Network metrics
            network_io = psutil.net_io_counters()
            self.infrastructure_metrics["network_io_bytes_total"].labels(
                service="monitoring-service",
                direction="sent",
                interface="total"
            )._value._value = network_io.bytes_sent
            self.infrastructure_metrics["network_io_bytes_total"].labels(
                service="monitoring-service",
                direction="recv",
                interface="total"
            )._value._value = network_io.bytes_recv
            
        except Exception as e:
            logger.error(f"Failed to collect system metrics: {e}")
            self._collection_errors += 1
    
    def record_request_metrics(self, method: str, endpoint: str, status_code: int, duration: float, service: str = "monitoring-service") -> None:
        """Record HTTP request metrics"""
        self.app_metrics["http_requests_total"].labels(
            method=method,
            endpoint=endpoint,
            status=str(status_code),
            service=service
        ).inc()
        
        self.app_metrics["http_request_duration_seconds"].labels(
            method=method,
            endpoint=endpoint,
            service=service
        ).observe(duration)
    
    def record_database_metrics(self, operation: str, table: str, duration: float, success: bool, service: str = "monitoring-service") -> None:
        """Record database operation metrics"""
        self.app_metrics["database_query_duration_seconds"].labels(
            operation=operation,
            table=table,
            service=service
        ).observe(duration)
        
        if not success:
            self.app_metrics["database_errors_total"].labels(
                error_type="query_error",
                operation=operation,
                service=service
            ).inc()
    
    def record_business_metrics(self, metric_type: str, value: float, labels: Dict[str, str]) -> None:
        """Record business metrics"""
        if metric_type in self.business_metrics:
            metric = self.business_metrics[metric_type]
            
            # Determine if it's a counter or gauge based on metric type
            if "total" in metric_type:
                metric.labels(**labels).inc(value)
            else:
                metric.labels(**labels).set(value)
    
    def update_service_health(self, service: str, status: str) -> None:
        """Update service health status"""
        self.infrastructure_metrics["service_health"].labels(service=service).state(status)
    
    def get_metrics_exposition(self, accept_header: Optional[str] = None) -> Tuple[str, str]:
        """Get metrics in Prometheus exposition format"""
        try:
            # Collect latest system metrics
            self.collect_system_metrics()
            
            # Generate metrics
            if accept_header and OPENMETRICS_CONTENT_TYPE in accept_header:
                content_type = OPENMETRICS_CONTENT_TYPE
            else:
                content_type = CONTENT_TYPE_LATEST
            
            metrics_output = generate_latest(self.registry)
            
            return metrics_output.decode('utf-8'), content_type
            
        except Exception as e:
            logger.error(f"Failed to generate metrics exposition: {e}")
            raise
    
    def push_to_gateway(self, gateway_url: str, job_name: str) -> bool:
        """Push metrics to Prometheus pushgateway"""
        try:
            if not gateway_url:
                return False
            
            # Collect latest metrics
            self.collect_system_metrics()
            
            # Push to gateway
            push_to_gateway(
                gateway_url,
                job=job_name,
                registry=self.registry,
                timeout=10
            )
            
            logger.info(f"Successfully pushed metrics to gateway: {gateway_url}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to push metrics to gateway: {e}")
            return False
    
    def get_metrics_summary(self) -> Dict[str, Any]:
        """Get a summary of collected metrics"""
        try:
            metric_families = list(self.registry.collect())
            
            summary = {
                "total_metrics": len(metric_families),
                "metric_types": defaultdict(int),
                "collection_errors": self._collection_errors,
                "last_collection": datetime.fromtimestamp(self._last_collection_time).isoformat(),
                "metrics": []
            }
            
            for family in metric_families:
                summary["metric_types"][family.type] += 1
                summary["metrics"].append({
                    "name": family.name,
                    "type": family.type,
                    "help": family.documentation,
                    "samples": len(family.samples) if hasattr(family, 'samples') else 0
                })
            
            return summary
            
        except Exception as e:
            logger.error(f"Failed to generate metrics summary: {e}")
            return {"error": str(e)}
    
    async def start_background_collection(self) -> None:
        """Start background metrics collection"""
        logger.info("Starting background metrics collection")
        
        while True:
            try:
                start_time = time.time()
                
                # Collect system metrics
                self.collect_system_metrics()
                
                # Update collection time
                self._last_collection_time = time.time()
                
                collection_duration = self._last_collection_time - start_time
                logger.debug(f"Metrics collection completed in {collection_duration:.3f}s")
                
                # Wait for next collection interval
                await asyncio.sleep(settings.METRICS_COLLECTION_INTERVAL)
                
            except Exception as e:
                logger.error(f"Error in background metrics collection: {e}")
                self._collection_errors += 1
                await asyncio.sleep(settings.METRICS_COLLECTION_INTERVAL)


# Global metrics collector instance
metrics_collector = MetricsCollector()