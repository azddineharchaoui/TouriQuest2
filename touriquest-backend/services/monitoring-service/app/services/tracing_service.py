"""
Distributed tracing service with Jaeger integration for request correlation and performance analysis
"""

from typing import Dict, List, Optional, Any, Callable, Union
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from contextlib import asynccontextmanager
import time
import asyncio
import json
import logging
import functools
import inspect
from urllib.parse import urlencode

from opentelemetry import trace, baggage, propagate
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter
from opentelemetry.exporter.jaeger.thrift import JaegerExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.instrumentation.redis import RedisInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry.instrumentation.aiohttp_client import AioHttpClientInstrumentor
from opentelemetry.sdk.resources import Resource
from opentelemetry.semconv.resource import ResourceAttributes
from opentelemetry.semconv.trace import SpanAttributes
from opentelemetry.trace import Status, StatusCode

from app.core.config import settings


logger = logging.getLogger(__name__)


@dataclass
class TraceInfo:
    """Trace information structure"""
    trace_id: str
    span_id: str
    parent_span_id: Optional[str] = None
    operation_name: str = ""
    service_name: str = ""
    start_time: datetime = field(default_factory=datetime.utcnow)
    end_time: Optional[datetime] = None
    duration_ms: Optional[float] = None
    status: str = "unknown"
    tags: Dict[str, Any] = field(default_factory=dict)
    logs: List[Dict[str, Any]] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        result = {
            "trace_id": self.trace_id,
            "span_id": self.span_id,
            "parent_span_id": self.parent_span_id,
            "operation_name": self.operation_name,
            "service_name": self.service_name,
            "start_time": self.start_time.isoformat(),
            "status": self.status,
            "tags": self.tags,
            "logs": self.logs
        }
        
        if self.end_time:
            result["end_time"] = self.end_time.isoformat()
        if self.duration_ms:
            result["duration_ms"] = self.duration_ms
            
        return result


@dataclass
class SpanContext:
    """Span context for correlation"""
    trace_id: str
    span_id: str
    parent_span_id: Optional[str] = None
    baggage: Dict[str, str] = field(default_factory=dict)
    
    def to_headers(self) -> Dict[str, str]:
        """Convert to HTTP headers for propagation"""
        headers = {
            "traceparent": f"00-{self.trace_id}-{self.span_id}-01",
        }
        
        if self.baggage:
            baggage_header = ",".join([f"{k}={v}" for k, v in self.baggage.items()])
            headers["baggage"] = baggage_header
            
        return headers


class TracingService:
    """Comprehensive distributed tracing service"""
    
    def __init__(self):
        self.tracer_provider: Optional[TracerProvider] = None
        self.tracer: Optional[trace.Tracer] = None
        self.jaeger_exporter: Optional[JaegerExporter] = None
        self.span_processor: Optional[BatchSpanProcessor] = None
        self._active_spans: Dict[str, Any] = {}
        self._trace_context: Dict[str, SpanContext] = {}
        
    def initialize(self) -> bool:
        """Initialize tracing service"""
        try:
            if not settings.JAEGER_ENABLED:
                logger.info("Jaeger tracing is disabled")
                return False
            
            # Create resource
            resource = Resource.create({
                ResourceAttributes.SERVICE_NAME: settings.JAEGER_SERVICE_NAME,
                ResourceAttributes.SERVICE_VERSION: settings.APP_VERSION,
                ResourceAttributes.SERVICE_NAMESPACE: "touriquest",
                ResourceAttributes.DEPLOYMENT_ENVIRONMENT: settings.SENTRY_ENVIRONMENT,
            })
            
            # Set up tracer provider
            self.tracer_provider = TracerProvider(resource=resource)
            trace.set_tracer_provider(self.tracer_provider)
            
            # Configure Jaeger exporter
            self.jaeger_exporter = JaegerExporter(
                agent_host_name=settings.JAEGER_AGENT_HOST,
                agent_port=settings.JAEGER_AGENT_PORT,
            )
            
            # Set up span processor
            self.span_processor = BatchSpanProcessor(
                self.jaeger_exporter,
                max_queue_size=2048,
                schedule_delay_millis=1000,
                max_export_batch_size=512,
                export_timeout_millis=30000,
            )
            
            self.tracer_provider.add_span_processor(self.span_processor)
            
            # Add console exporter for debugging in development
            if settings.DEBUG:
                console_exporter = ConsoleSpanExporter()
                console_processor = BatchSpanProcessor(console_exporter)
                self.tracer_provider.add_span_processor(console_processor)
            
            # Get tracer
            self.tracer = trace.get_tracer(
                instrumenting_module_name=__name__,
                instrumenting_library_version=settings.APP_VERSION,
            )
            
            logger.info(f"Tracing initialized with Jaeger at {settings.JAEGER_AGENT_HOST}:{settings.JAEGER_AGENT_PORT}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize tracing: {e}")
            return False
    
    def instrument_fastapi(self, app) -> None:
        """Instrument FastAPI application"""
        try:
            if not self.tracer:
                logger.warning("Tracer not initialized, skipping FastAPI instrumentation")
                return
            
            FastAPIInstrumentor.instrument_app(
                app,
                tracer_provider=self.tracer_provider,
                excluded_urls="/health,/metrics,/docs,/redoc,/openapi.json",
                http_capture_headers_server_request=["user-agent", "authorization"],
                http_capture_headers_server_response=["content-type", "content-length"],
            )
            
            logger.info("FastAPI instrumentation enabled")
            
        except Exception as e:
            logger.error(f"Failed to instrument FastAPI: {e}")
    
    def instrument_sqlalchemy(self, engine) -> None:
        """Instrument SQLAlchemy for database tracing"""
        try:
            if not self.tracer:
                return
            
            SQLAlchemyInstrumentor().instrument(
                engine=engine,
                tracer_provider=self.tracer_provider,
                enable_commenter=True,
                commenter_options={
                    "db_driver": True,
                    "db_framework": True,
                    "opentelemetry_values": True,
                }
            )
            
            logger.info("SQLAlchemy instrumentation enabled")
            
        except Exception as e:
            logger.error(f"Failed to instrument SQLAlchemy: {e}")
    
    def instrument_redis(self) -> None:
        """Instrument Redis for cache tracing"""
        try:
            if not self.tracer:
                return
            
            RedisInstrumentor().instrument(tracer_provider=self.tracer_provider)
            logger.info("Redis instrumentation enabled")
            
        except Exception as e:
            logger.error(f"Failed to instrument Redis: {e}")
    
    def instrument_http_clients(self) -> None:
        """Instrument HTTP clients for external service tracing"""
        try:
            if not self.tracer:
                return
            
            # Instrument requests library
            RequestsInstrumentor().instrument(tracer_provider=self.tracer_provider)
            
            # Instrument aiohttp client
            AioHttpClientInstrumentor().instrument(tracer_provider=self.tracer_provider)
            
            logger.info("HTTP client instrumentation enabled")
            
        except Exception as e:
            logger.error(f"Failed to instrument HTTP clients: {e}")
    
    @asynccontextmanager
    async def start_span(
        self,
        name: str,
        kind: trace.SpanKind = trace.SpanKind.INTERNAL,
        attributes: Optional[Dict[str, Any]] = None,
        parent: Optional[trace.Span] = None
    ):
        """Start a new span with context management"""
        if not self.tracer:
            # If tracing is not enabled, yield a no-op context
            yield None
            return
        
        span = self.tracer.start_span(
            name=name,
            kind=kind,
            attributes=attributes or {},
            parent=parent,
        )
        
        token = trace.set_span_in_context(span)
        
        try:
            yield span
        except Exception as e:
            span.record_exception(e)
            span.set_status(Status(StatusCode.ERROR, str(e)))
            raise
        finally:
            span.end()
            # Reset context
            trace._SPAN_KEY.set(trace.INVALID_SPAN)
    
    def start_manual_span(
        self,
        name: str,
        kind: trace.SpanKind = trace.SpanKind.INTERNAL,
        attributes: Optional[Dict[str, Any]] = None,
        parent: Optional[trace.Span] = None
    ) -> Optional[trace.Span]:
        """Start a manual span (must be ended manually)"""
        if not self.tracer:
            return None
        
        span = self.tracer.start_span(
            name=name,
            kind=kind,
            attributes=attributes or {},
            parent=parent,
        )
        
        # Store span for tracking
        span_id = format(span.get_span_context().span_id, '016x')
        self._active_spans[span_id] = span
        
        return span
    
    def end_manual_span(self, span: trace.Span, status: Optional[Status] = None) -> None:
        """End a manual span"""
        if not span:
            return
        
        if status:
            span.set_status(status)
        
        span.end()
        
        # Remove from active spans
        span_id = format(span.get_span_context().span_id, '016x')
        self._active_spans.pop(span_id, None)
    
    def add_span_attributes(self, span: trace.Span, attributes: Dict[str, Any]) -> None:
        """Add attributes to a span"""
        if not span:
            return
        
        for key, value in attributes.items():
            span.set_attribute(key, value)
    
    def add_span_event(self, span: trace.Span, name: str, attributes: Optional[Dict[str, Any]] = None) -> None:
        """Add an event to a span"""
        if not span:
            return
        
        span.add_event(name, attributes or {})
    
    def record_exception(self, span: trace.Span, exception: Exception) -> None:
        """Record an exception in a span"""
        if not span:
            return
        
        span.record_exception(exception)
        span.set_status(Status(StatusCode.ERROR, str(exception)))
    
    def get_current_span(self) -> Optional[trace.Span]:
        """Get the current active span"""
        return trace.get_current_span()
    
    def get_trace_id(self, span: Optional[trace.Span] = None) -> Optional[str]:
        """Get trace ID from span or current span"""
        if not span:
            span = self.get_current_span()
        
        if span and span.is_recording():
            return format(span.get_span_context().trace_id, '032x')
        
        return None
    
    def get_span_id(self, span: Optional[trace.Span] = None) -> Optional[str]:
        """Get span ID from span or current span"""
        if not span:
            span = self.get_current_span()
        
        if span and span.is_recording():
            return format(span.get_span_context().span_id, '016x')
        
        return None
    
    def create_span_context(self, span: Optional[trace.Span] = None) -> Optional[SpanContext]:
        """Create span context for propagation"""
        if not span:
            span = self.get_current_span()
        
        if not span or not span.is_recording():
            return None
        
        span_context = span.get_span_context()
        
        # Get baggage
        current_baggage = baggage.get_all()
        
        return SpanContext(
            trace_id=format(span_context.trace_id, '032x'),
            span_id=format(span_context.span_id, '016x'),
            parent_span_id=None,  # Would need parent span to get this
            baggage=current_baggage or {}
        )
    
    def inject_headers(self, headers: Dict[str, str], span: Optional[trace.Span] = None) -> Dict[str, str]:
        """Inject tracing headers for downstream services"""
        if not self.tracer:
            return headers
        
        # Create a copy to avoid modifying original
        injected_headers = headers.copy()
        
        # Inject tracing context
        propagate.inject(injected_headers)
        
        return injected_headers
    
    def extract_context(self, headers: Dict[str, str]) -> None:
        """Extract tracing context from headers"""
        if not self.tracer:
            return
        
        # Extract context from headers
        context = propagate.extract(headers)
        
        # Set as current context
        if context:
            token = context.attach()
    
    def trace_function(
        self,
        name: Optional[str] = None,
        kind: trace.SpanKind = trace.SpanKind.INTERNAL,
        attributes: Optional[Dict[str, Any]] = None
    ):
        """Decorator to trace function calls"""
        def decorator(func: Callable) -> Callable:
            span_name = name or f"{func.__module__}.{func.__qualname__}"
            
            if inspect.iscoroutinefunction(func):
                @functools.wraps(func)
                async def async_wrapper(*args, **kwargs):
                    async with self.start_span(span_name, kind, attributes):
                        return await func(*args, **kwargs)
                return async_wrapper
            else:
                @functools.wraps(func)
                def sync_wrapper(*args, **kwargs):
                    with self.tracer.start_as_current_span(span_name, kind=kind, attributes=attributes or {}):
                        return func(*args, **kwargs)
                return sync_wrapper
        
        return decorator
    
    def trace_database_operation(
        self,
        operation: str,
        table: str,
        query: Optional[str] = None
    ):
        """Decorator specifically for database operations"""
        def decorator(func: Callable) -> Callable:
            span_name = f"db.{operation}.{table}"
            
            attributes = {
                SpanAttributes.DB_OPERATION: operation,
                SpanAttributes.DB_SQL_TABLE: table,
                SpanAttributes.DB_SYSTEM: "postgresql",  # Assuming PostgreSQL
            }
            
            if query:
                attributes[SpanAttributes.DB_STATEMENT] = query
            
            return self.trace_function(span_name, trace.SpanKind.CLIENT, attributes)(func)
        
        return decorator
    
    def trace_external_request(
        self,
        service_name: str,
        endpoint: str,
        method: str = "GET"
    ):
        """Decorator for external service requests"""
        def decorator(func: Callable) -> Callable:
            span_name = f"http.{method.lower()}.{service_name}"
            
            attributes = {
                SpanAttributes.HTTP_METHOD: method,
                SpanAttributes.HTTP_URL: endpoint,
                "service.name": service_name,
            }
            
            return self.trace_function(span_name, trace.SpanKind.CLIENT, attributes)(func)
        
        return decorator
    
    def get_trace_summary(self, trace_id: str) -> Optional[Dict[str, Any]]:
        """Get trace summary (Note: This would typically query Jaeger API)"""
        # This is a placeholder - in a real implementation, you would query Jaeger's API
        # to get trace information
        return {
            "trace_id": trace_id,
            "note": "Trace summary would be retrieved from Jaeger API",
            "jaeger_url": f"http://{settings.JAEGER_AGENT_HOST}:16686/trace/{trace_id}"
        }
    
    def get_active_spans_info(self) -> List[Dict[str, Any]]:
        """Get information about currently active spans"""
        spans_info = []
        
        for span_id, span in self._active_spans.items():
            if span.is_recording():
                spans_info.append({
                    "span_id": span_id,
                    "trace_id": format(span.get_span_context().trace_id, '032x'),
                    "name": span.name,
                    "start_time": span.start_time,
                    "attributes": dict(span.attributes) if hasattr(span, 'attributes') else {}
                })
        
        return spans_info
    
    def set_baggage(self, key: str, value: str) -> None:
        """Set baggage for cross-cutting concerns"""
        baggage.set_baggage(key, value)
    
    def get_baggage(self, key: str) -> Optional[str]:
        """Get baggage value"""
        return baggage.get_baggage(key)
    
    def clear_baggage(self) -> None:
        """Clear all baggage"""
        baggage.clear()
    
    async def shutdown(self) -> None:
        """Shutdown tracing service"""
        try:
            if self.span_processor:
                # Force flush pending spans
                self.span_processor.force_flush(timeout_millis=5000)
                
            if self.tracer_provider:
                self.tracer_provider.shutdown()
            
            logger.info("Tracing service shutdown completed")
            
        except Exception as e:
            logger.error(f"Error during tracing shutdown: {e}")
    
    def create_child_span(
        self,
        parent_span: trace.Span,
        name: str,
        kind: trace.SpanKind = trace.SpanKind.INTERNAL,
        attributes: Optional[Dict[str, Any]] = None
    ) -> Optional[trace.Span]:
        """Create a child span from a parent span"""
        if not self.tracer or not parent_span:
            return None
        
        with trace.use_span(parent_span):
            return self.start_manual_span(name, kind, attributes, parent_span)
    
    def get_tracing_stats(self) -> Dict[str, Any]:
        """Get tracing service statistics"""
        return {
            "enabled": settings.JAEGER_ENABLED,
            "service_name": settings.JAEGER_SERVICE_NAME,
            "jaeger_endpoint": f"{settings.JAEGER_AGENT_HOST}:{settings.JAEGER_AGENT_PORT}",
            "active_spans": len(self._active_spans),
            "sample_rate": settings.TRACING_SAMPLE_RATE,
            "spans_info": self.get_active_spans_info()
        }


# Global tracing service instance
tracing_service = TracingService()


# Convenience decorators
trace_async = tracing_service.trace_function
trace_sync = tracing_service.trace_function
trace_db = tracing_service.trace_database_operation
trace_http = tracing_service.trace_external_request