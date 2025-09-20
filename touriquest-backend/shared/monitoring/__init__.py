"""
Monitoring and observability utilities for TouriQuest microservices.
"""
import time
import logging
import structlog
from typing import Dict, Any, Optional
from prometheus_client import Counter, Histogram, Gauge, CollectorRegistry, generate_latest
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.exporter.prometheus import PrometheusMetricReader
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from contextvars import ContextVar

# Context variables for tracing
request_id_var: ContextVar[Optional[str]] = ContextVar('request_id', default=None)
user_id_var: ContextVar[Optional[int]] = ContextVar('user_id', default=None)


class MetricsCollector:
    """Prometheus metrics collector for services."""
    
    def __init__(self, service_name: str):
        self.service_name = service_name
        self.registry = CollectorRegistry()
        
        # Common metrics
        self.request_count = Counter(
            'http_requests_total',
            'Total HTTP requests',
            ['service', 'method', 'endpoint', 'status'],
            registry=self.registry
        )
        
        self.request_duration = Histogram(
            'http_request_duration_seconds',
            'HTTP request duration',
            ['service', 'method', 'endpoint'],
            registry=self.registry
        )
        
        self.active_connections = Gauge(
            'active_connections',
            'Active connections',
            ['service'],
            registry=self.registry
        )
        
        self.database_connections = Gauge(
            'database_connections_active',
            'Active database connections',
            ['service'],
            registry=self.registry
        )
        
        self.cache_operations = Counter(
            'cache_operations_total',
            'Cache operations',
            ['service', 'operation', 'result'],
            registry=self.registry
        )
        
        # Business metrics
        self.user_registrations = Counter(
            'user_registrations_total',
            'User registrations',
            ['service'],
            registry=self.registry
        )
        
        self.bookings_created = Counter(
            'bookings_created_total',
            'Bookings created',
            ['service'],
            registry=self.registry
        )
        
        self.searches_performed = Counter(
            'searches_performed_total',
            'Searches performed',
            ['service', 'search_type'],
            registry=self.registry
        )
    
    def record_request(self, method: str, endpoint: str, status: int, duration: float):
        """Record HTTP request metrics."""
        self.request_count.labels(
            service=self.service_name,
            method=method,
            endpoint=endpoint,
            status=status
        ).inc()
        
        self.request_duration.labels(
            service=self.service_name,
            method=method,
            endpoint=endpoint
        ).observe(duration)
    
    def set_active_connections(self, count: int):
        """Set active connections count."""
        self.active_connections.labels(service=self.service_name).set(count)
    
    def set_database_connections(self, count: int):
        """Set database connections count."""
        self.database_connections.labels(service=self.service_name).set(count)
    
    def record_cache_operation(self, operation: str, result: str):
        """Record cache operation."""
        self.cache_operations.labels(
            service=self.service_name,
            operation=operation,
            result=result
        ).inc()
    
    def record_user_registration(self):
        """Record user registration."""
        self.user_registrations.labels(service=self.service_name).inc()
    
    def record_booking_created(self):
        """Record booking creation."""
        self.bookings_created.labels(service=self.service_name).inc()
    
    def record_search(self, search_type: str):
        """Record search operation."""
        self.searches_performed.labels(
            service=self.service_name,
            search_type=search_type
        ).inc()
    
    def get_metrics(self) -> str:
        """Get Prometheus metrics."""
        return generate_latest(self.registry)


class Logger:
    """Structured logging with context."""
    
    def __init__(self, service_name: str, log_level: str = "INFO"):
        self.service_name = service_name
        
        # Configure structlog
        structlog.configure(
            processors=[
                structlog.stdlib.filter_by_level,
                structlog.stdlib.add_logger_name,
                structlog.stdlib.add_log_level,
                structlog.stdlib.PositionalArgumentsFormatter(),
                structlog.processors.StackInfoRenderer(),
                structlog.processors.format_exc_info,
                structlog.processors.UnicodeDecoder(),
                self._add_context,
                structlog.processors.JSONRenderer()
            ],
            context_class=dict,
            logger_factory=structlog.stdlib.LoggerFactory(),
            wrapper_class=structlog.stdlib.BoundLogger,
            cache_logger_on_first_use=True,
        )
        
        # Configure standard logging
        logging.basicConfig(
            format="%(message)s",
            level=getattr(logging, log_level.upper()),
        )
        
        self.logger = structlog.get_logger(service_name)
    
    def _add_context(self, logger, method_name, event_dict):
        """Add context to log records."""
        event_dict['service'] = self.service_name
        event_dict['request_id'] = request_id_var.get()
        event_dict['user_id'] = user_id_var.get()
        event_dict['timestamp'] = time.time()
        return event_dict
    
    def info(self, message: str, **kwargs):
        """Log info message."""
        self.logger.info(message, **kwargs)
    
    def warning(self, message: str, **kwargs):
        """Log warning message."""
        self.logger.warning(message, **kwargs)
    
    def error(self, message: str, **kwargs):
        """Log error message."""
        self.logger.error(message, **kwargs)
    
    def debug(self, message: str, **kwargs):
        """Log debug message."""
        self.logger.debug(message, **kwargs)


class Tracer:
    """Distributed tracing with OpenTelemetry."""
    
    def __init__(self, service_name: str):
        self.service_name = service_name
        
        # Configure tracer
        trace.set_tracer_provider(TracerProvider())
        self.tracer = trace.get_tracer(__name__)
    
    def start_span(self, name: str, attributes: Dict[str, Any] = None):
        """Start a new span."""
        span = self.tracer.start_span(name)
        
        # Add service name
        span.set_attribute("service.name", self.service_name)
        
        # Add custom attributes
        if attributes:
            for key, value in attributes.items():
                span.set_attribute(key, value)
        
        # Add context
        span.set_attribute("request_id", request_id_var.get() or "")
        span.set_attribute("user_id", str(user_id_var.get() or ""))
        
        return span
    
    def trace_function(self, name: str = None):
        """Decorator to trace function execution."""
        def decorator(func):
            def wrapper(*args, **kwargs):
                span_name = name or f"{func.__module__}.{func.__name__}"
                with self.start_span(span_name) as span:
                    try:
                        result = func(*args, **kwargs)
                        span.set_status(trace.Status(trace.StatusCode.OK))
                        return result
                    except Exception as e:
                        span.set_status(trace.Status(
                            trace.StatusCode.ERROR,
                            str(e)
                        ))
                        span.record_exception(e)
                        raise
            return wrapper
        return decorator


class MonitoringSetup:
    """Setup monitoring for FastAPI services."""
    
    def __init__(
        self, 
        service_name: str,
        sentry_dsn: Optional[str] = None,
        log_level: str = "INFO"
    ):
        self.service_name = service_name
        self.metrics = MetricsCollector(service_name)
        self.logger = Logger(service_name, log_level)
        self.tracer = Tracer(service_name)
        
        # Setup Sentry
        if sentry_dsn:
            sentry_sdk.init(
                dsn=sentry_dsn,
                integrations=[
                    FastApiIntegration(auto_enable=True),
                    SqlalchemyIntegration(),
                ],
                traces_sample_rate=0.1,
                profiles_sample_rate=0.1,
                environment=service_name,
            )
    
    def instrument_fastapi(self, app):
        """Instrument FastAPI app with monitoring."""
        # OpenTelemetry instrumentation
        FastAPIInstrumentor.instrument_app(app)
        
        # Add metrics middleware
        @app.middleware("http")
        async def metrics_middleware(request, call_next):
            start_time = time.time()
            
            # Set request context
            request_id = request.headers.get("X-Request-ID", str(time.time()))
            request_id_var.set(request_id)
            
            # Process request
            response = await call_next(request)
            
            # Record metrics
            duration = time.time() - start_time
            self.metrics.record_request(
                method=request.method,
                endpoint=request.url.path,
                status=response.status_code,
                duration=duration
            )
            
            return response
        
        # Add health check endpoint
        @app.get("/health")
        async def health_check():
            return {"status": "healthy", "service": self.service_name}
        
        # Add metrics endpoint
        @app.get("/metrics")
        async def get_metrics():
            return self.metrics.get_metrics()
        
        return app