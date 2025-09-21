"""
Monitoring utilities for TouriQuest microservices

This module provides monitoring, logging, and observability setup for all microservices.
"""

import logging
import time
import uuid
from typing import Optional, Dict, Any
from datetime import datetime
import asyncio


class MonitoringSetup:
    """Setup monitoring and observability for microservices"""
    
    def __init__(self, service_name: str, version: str = "1.0.0"):
        self.service_name = service_name
        self.version = version
        self.logger = logging.getLogger(service_name)
        self._setup_logging()
    
    def _setup_logging(self):
        """Configure logging for the service"""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.StreamHandler(),
            ]
        )
        
        # Set specific log levels for common libraries
        logging.getLogger("uvicorn").setLevel(logging.INFO)
        logging.getLogger("httpx").setLevel(logging.WARNING)
        logging.getLogger("sqlalchemy").setLevel(logging.WARNING)
    
    def get_middleware(self):
        """Get monitoring middleware for FastAPI"""
        return RequestLoggingMiddleware(self.service_name)
    
    def instrument_fastapi(self, app):
        """Add monitoring instrumentation to FastAPI app"""
        try:
            # Add request logging middleware
            from fastapi.middleware.base import BaseHTTPMiddleware
            
            class FastAPILoggingMiddleware(BaseHTTPMiddleware):
                def __init__(self, app, service_name: str):
                    super().__init__(app)
                    self.service_name = service_name
                    self.logger = logging.getLogger(f"{service_name}.requests")
                
                async def dispatch(self, request, call_next):
                    start_time = time.time()
                    request_id = str(uuid.uuid4())
                    
                    # Log request
                    self.logger.info(
                        f"Request started: {request.method} {request.url.path} "
                        f"[ID: {request_id}]"
                    )
                    
                    try:
                        response = await call_next(request)
                        
                        # Calculate processing time
                        process_time = time.time() - start_time
                        
                        # Log response
                        self.logger.info(
                            f"Request completed: {request.method} {request.url.path} "
                            f"[ID: {request_id}] [Status: {response.status_code}] "
                            f"[Time: {process_time:.3f}s]"
                        )
                        
                        # Add headers
                        response.headers["X-Request-ID"] = request_id
                        response.headers["X-Process-Time"] = str(process_time)
                        
                        return response
                        
                    except Exception as e:
                        # Log error
                        process_time = time.time() - start_time
                        self.logger.error(
                            f"Request failed: {request.method} {request.url.path} "
                            f"[ID: {request_id}] [Error: {str(e)}] "
                            f"[Time: {process_time:.3f}s]"
                        )
                        raise
            
            app.add_middleware(FastAPILoggingMiddleware, service_name=self.service_name)
            
            # Add health check endpoint
            @app.get("/health")
            async def health_check():
                return self.health_check()
            
            @app.get("/metrics")
            async def get_metrics():
                return metrics.get_metrics()
                
            return app
            
        except ImportError:
            # FastAPI not available, return app unchanged
            self.logger.warning("FastAPI not available, skipping instrumentation")
            return app
    
    def health_check(self) -> Dict[str, Any]:
        """Provide health check information"""
        return {
            "status": "healthy",
            "service": self.service_name,
            "version": self.version,
            "timestamp": datetime.utcnow().isoformat(),
            "uptime": time.time()
        }


class RequestLoggingMiddleware:
    """Middleware to log requests and responses"""
    
    def __init__(self, service_name: str):
        self.service_name = service_name
        self.logger = logging.getLogger(f"{service_name}.requests")
    
    async def __call__(self, request, call_next):
        """Process request and log details - FastAPI middleware compatible"""
        try:
            # Lazy import of FastAPI types
            from fastapi import Request
        except ImportError:
            # Fallback if FastAPI not available
            pass
            
        start_time = time.time()
        request_id = str(uuid.uuid4())
        
        # Log request
        method = getattr(request, 'method', 'UNKNOWN')
        url_path = getattr(request, 'url', {})
        path = getattr(url_path, 'path', 'unknown') if hasattr(url_path, 'path') else str(url_path)
        
        self.logger.info(
            f"Request started: {method} {path} "
            f"[ID: {request_id}]"
        )
        
        try:
            response = await call_next(request)
            
            # Calculate processing time
            process_time = time.time() - start_time
            
            # Log response
            status_code = getattr(response, 'status_code', 'unknown')
            self.logger.info(
                f"Request completed: {method} {path} "
                f"[ID: {request_id}] [Status: {status_code}] "
                f"[Time: {process_time:.3f}s]"
            )
            
            # Add headers if possible
            if hasattr(response, 'headers'):
                response.headers["X-Request-ID"] = request_id
                response.headers["X-Process-Time"] = str(process_time)
            
            return response
            
        except Exception as e:
            # Log error
            process_time = time.time() - start_time
            self.logger.error(
                f"Request failed: {method} {path} "
                f"[ID: {request_id}] [Error: {str(e)}] "
                f"[Time: {process_time:.3f}s]"
            )
            raise


class MetricsCollector:
    """Collect and store metrics for monitoring"""
    
    def __init__(self):
        self.metrics = {}
        self.counters = {}
        self.timers = {}
    
    def increment(self, name: str, value: int = 1, tags: Optional[Dict[str, str]] = None):
        """Increment a counter metric"""
        key = f"{name}:{tags}" if tags else name
        self.counters[key] = self.counters.get(key, 0) + value
    
    def record_time(self, name: str, duration: float, tags: Optional[Dict[str, str]] = None):
        """Record a timing metric"""
        key = f"{name}:{tags}" if tags else name
        if key not in self.timers:
            self.timers[key] = []
        self.timers[key].append(duration)
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get all collected metrics"""
        return {
            "counters": self.counters,
            "timers": {
                name: {
                    "count": len(times),
                    "avg": sum(times) / len(times) if times else 0,
                    "min": min(times) if times else 0,
                    "max": max(times) if times else 0
                }
                for name, times in self.timers.items()
            }
        }


# Global metrics collector instance
metrics = MetricsCollector()


class HealthChecker:
    """Health check utilities"""
    
    @staticmethod
    async def check_database(db_session) -> bool:
        """Check database connectivity"""
        try:
            await db_session.execute("SELECT 1")
            return True
        except Exception:
            return False
    
    @staticmethod
    async def check_external_service(url: str, timeout: float = 5.0) -> bool:
        """Check external service connectivity"""
        try:
            # Lazy import to avoid dependency issues
            import httpx
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.get(url)
                return response.status_code < 500
        except Exception:
            return False


# Export classes and instances
__all__ = [
    'MonitoringSetup',
    'RequestLoggingMiddleware',
    'MetricsCollector',
    'HealthChecker',
    'metrics'
]