"""Monitoring utilities for metrics collection and health checks."""

import time
import psutil
import asyncio
from typing import Dict, Any, List
from prometheus_client import Counter, Histogram, Gauge, start_http_server
import structlog

logger = structlog.get_logger()

# Prometheus metrics
REQUEST_COUNT = Counter('admin_service_requests_total', 'Total requests', ['method', 'endpoint', 'status'])
REQUEST_DURATION = Histogram('admin_service_request_duration_seconds', 'Request duration')
ACTIVE_CONNECTIONS = Gauge('admin_service_websocket_connections', 'Active WebSocket connections')
SYSTEM_CPU = Gauge('admin_service_cpu_percent', 'CPU usage percentage')
SYSTEM_MEMORY = Gauge('admin_service_memory_percent', 'Memory usage percentage')
ACTIVE_USERS = Gauge('admin_service_active_users', 'Number of active users')
PENDING_MODERATIONS = Gauge('admin_service_pending_moderations', 'Pending content moderations')


def setup_monitoring():
    """Setup monitoring and metrics collection."""
    try:
        # Start Prometheus metrics server
        from app.core.config import settings
        start_http_server(settings.PROMETHEUS_PORT)
        logger.info("Prometheus metrics server started", port=settings.PROMETHEUS_PORT)
        
        # Start background metrics collection
        asyncio.create_task(collect_system_metrics())
        
    except Exception as e:
        logger.error("Failed to setup monitoring", error=str(e))


async def collect_system_metrics():
    """Collect system metrics periodically."""
    while True:
        try:
            # CPU and Memory usage
            cpu_percent = psutil.cpu_percent(interval=1)
            memory_percent = psutil.virtual_memory().percent
            
            SYSTEM_CPU.set(cpu_percent)
            SYSTEM_MEMORY.set(memory_percent)
            
            # Log critical resource usage
            if cpu_percent > 80:
                logger.warning("High CPU usage detected", cpu_percent=cpu_percent)
            if memory_percent > 80:
                logger.warning("High memory usage detected", memory_percent=memory_percent)
                
        except Exception as e:
            logger.error("Failed to collect system metrics", error=str(e))
        
        # Sleep for 30 seconds
        await asyncio.sleep(30)


def record_request(method: str, endpoint: str, status_code: int, duration: float):
    """Record request metrics."""
    REQUEST_COUNT.labels(method=method, endpoint=endpoint, status=str(status_code)).inc()
    REQUEST_DURATION.observe(duration)


def update_websocket_connections(count: int):
    """Update WebSocket connection count."""
    ACTIVE_CONNECTIONS.set(count)


def update_business_metrics(active_users: int, pending_moderations: int):
    """Update business metrics."""
    ACTIVE_USERS.set(active_users)
    PENDING_MODERATIONS.set(pending_moderations)


class HealthChecker:
    """Health check utilities for service monitoring."""
    
    def __init__(self):
        self.checks = {
            "database": self._check_database,
            "redis": self._check_redis,
            "external_services": self._check_external_services,
            "disk_space": self._check_disk_space,
            "memory": self._check_memory,
        }
    
    async def run_all_checks(self) -> Dict[str, Any]:
        """Run all health checks."""
        results = {}
        overall_healthy = True
        
        for check_name, check_func in self.checks.items():
            try:
                result = await check_func()
                results[check_name] = result
                if not result.get("healthy", False):
                    overall_healthy = False
            except Exception as e:
                results[check_name] = {
                    "healthy": False,
                    "error": str(e),
                    "timestamp": time.time()
                }
                overall_healthy = False
        
        return {
            "healthy": overall_healthy,
            "checks": results,
            "timestamp": time.time()
        }
    
    async def _check_database(self) -> Dict[str, Any]:
        """Check database connectivity."""
        try:
            from app.core.database import engine
            
            async with engine.begin() as conn:
                result = await conn.execute("SELECT 1")
                await result.fetchone()
            
            return {
                "healthy": True,
                "response_time_ms": 0,  # Could measure actual response time
                "timestamp": time.time()
            }
        except Exception as e:
            return {
                "healthy": False,
                "error": str(e),
                "timestamp": time.time()
            }
    
    async def _check_redis(self) -> Dict[str, Any]:
        """Check Redis connectivity."""
        try:
            import redis.asyncio as redis
            from app.core.config import settings
            
            r = redis.from_url(settings.REDIS_URL)
            await r.ping()
            await r.close()
            
            return {
                "healthy": True,
                "timestamp": time.time()
            }
        except Exception as e:
            return {
                "healthy": False,
                "error": str(e),
                "timestamp": time.time()
            }
    
    async def _check_external_services(self) -> Dict[str, Any]:
        """Check external service connectivity."""
        try:
            import httpx
            from app.core.config import settings
            
            services = [
                settings.USER_SERVICE_URL,
                settings.PROPERTY_SERVICE_URL,
                settings.BOOKING_SERVICE_URL,
            ]
            
            healthy_services = 0
            total_services = len(services)
            
            async with httpx.AsyncClient(timeout=5.0) as client:
                for service_url in services:
                    try:
                        response = await client.get(f"{service_url}/health")
                        if response.status_code == 200:
                            healthy_services += 1
                    except:
                        pass  # Service is down
            
            healthy = healthy_services == total_services
            
            return {
                "healthy": healthy,
                "healthy_services": healthy_services,
                "total_services": total_services,
                "timestamp": time.time()
            }
        except Exception as e:
            return {
                "healthy": False,
                "error": str(e),
                "timestamp": time.time()
            }
    
    async def _check_disk_space(self) -> Dict[str, Any]:
        """Check available disk space."""
        try:
            disk_usage = psutil.disk_usage('/')
            free_percent = (disk_usage.free / disk_usage.total) * 100
            
            return {
                "healthy": free_percent > 10,  # Alert if less than 10% free
                "free_percent": free_percent,
                "free_gb": disk_usage.free / (1024**3),
                "timestamp": time.time()
            }
        except Exception as e:
            return {
                "healthy": False,
                "error": str(e),
                "timestamp": time.time()
            }
    
    async def _check_memory(self) -> Dict[str, Any]:
        """Check memory usage."""
        try:
            memory = psutil.virtual_memory()
            
            return {
                "healthy": memory.percent < 90,  # Alert if more than 90% used
                "usage_percent": memory.percent,
                "available_gb": memory.available / (1024**3),
                "timestamp": time.time()
            }
        except Exception as e:
            return {
                "healthy": False,
                "error": str(e),
                "timestamp": time.time()
            }


# Global health checker instance
health_checker = HealthChecker()