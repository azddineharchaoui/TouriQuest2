"""
Comprehensive health check service for monitoring system health, dependencies, and performance
"""

from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
import asyncio
import time
import psutil
import aiohttp
import redis.asyncio as redis
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import logging

from app.core.config import settings


logger = logging.getLogger(__name__)


class HealthStatus(str, Enum):
    """Health status enumeration"""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    UNKNOWN = "unknown"


@dataclass
class HealthCheckResult:
    """Health check result data structure"""
    service: str
    status: HealthStatus
    response_time: float
    message: str
    details: Optional[Dict[str, Any]] = None
    timestamp: datetime = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.utcnow()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        result = asdict(self)
        result["timestamp"] = self.timestamp.isoformat()
        return result


@dataclass
class SystemMetrics:
    """System performance metrics"""
    cpu_usage: float
    memory_usage: float
    disk_usage: float
    network_io: Dict[str, int]
    process_count: int
    uptime: float
    load_average: Optional[List[float]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return asdict(self)


class HealthCheckService:
    """Comprehensive health check service"""
    
    def __init__(self):
        self.session: Optional[aiohttp.ClientSession] = None
        self.redis_client: Optional[redis.Redis] = None
        self._health_cache: Dict[str, HealthCheckResult] = {}
        self._cache_ttl = 60  # Cache health checks for 60 seconds
    
    async def initialize(self):
        """Initialize health check service"""
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=settings.HEALTH_CHECK_TIMEOUT)
        )
        
        # Initialize Redis client for health checks
        try:
            self.redis_client = redis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5,
                retry_on_timeout=True,
                health_check_interval=30
            )
        except Exception as e:
            logger.error(f"Failed to initialize Redis client: {e}")
    
    async def close(self):
        """Close health check service"""
        if self.session:
            await self.session.close()
        if self.redis_client:
            await self.redis_client.close()
    
    async def get_overall_health(self) -> Dict[str, Any]:
        """Get overall system health status"""
        start_time = time.time()
        
        # Run all health checks concurrently
        health_checks = await asyncio.gather(
            self.check_database_health(),
            self.check_redis_health(),
            self.check_external_services_health(),
            self.check_system_resources(),
            return_exceptions=True
        )
        
        database_health, redis_health, services_health, system_health = health_checks
        
        # Determine overall status
        all_statuses = []
        
        if isinstance(database_health, HealthCheckResult):
            all_statuses.append(database_health.status)
        if isinstance(redis_health, HealthCheckResult):
            all_statuses.append(redis_health.status)
        if isinstance(services_health, dict):
            all_statuses.extend([check.status for check in services_health.values() if isinstance(check, HealthCheckResult)])
        
        # Overall status logic
        if all(status == HealthStatus.HEALTHY for status in all_statuses):
            overall_status = HealthStatus.HEALTHY
        elif any(status == HealthStatus.UNHEALTHY for status in all_statuses):
            overall_status = HealthStatus.UNHEALTHY
        elif any(status == HealthStatus.DEGRADED for status in all_statuses):
            overall_status = HealthStatus.DEGRADED
        else:
            overall_status = HealthStatus.UNKNOWN
        
        total_time = time.time() - start_time
        
        return {
            "status": overall_status,
            "timestamp": datetime.utcnow().isoformat(),
            "response_time": round(total_time, 3),
            "checks": {
                "database": database_health.to_dict() if isinstance(database_health, HealthCheckResult) else {"error": str(database_health)},
                "redis": redis_health.to_dict() if isinstance(redis_health, HealthCheckResult) else {"error": str(redis_health)},
                "external_services": {
                    name: check.to_dict() if isinstance(check, HealthCheckResult) else {"error": str(check)}
                    for name, check in services_health.items()
                } if isinstance(services_health, dict) else {"error": str(services_health)},
                "system": system_health.to_dict() if isinstance(system_health, SystemMetrics) else {"error": str(system_health)}
            },
            "summary": {
                "total_checks": len(all_statuses),
                "healthy_checks": sum(1 for status in all_statuses if status == HealthStatus.HEALTHY),
                "degraded_checks": sum(1 for status in all_statuses if status == HealthStatus.DEGRADED),
                "unhealthy_checks": sum(1 for status in all_statuses if status == HealthStatus.UNHEALTHY),
            }
        }
    
    async def check_database_health(self, db: Optional[AsyncSession] = None) -> HealthCheckResult:
        """Check database connectivity and performance"""
        start_time = time.time()
        
        try:
            # Import here to avoid circular dependency
            from app.core.database import get_db_session
            
            if db is None:
                async for session in get_db_session():
                    db = session
                    break
            
            if db is None:
                return HealthCheckResult(
                    service="database",
                    status=HealthStatus.UNHEALTHY,
                    response_time=0.0,
                    message="Failed to get database session"
                )
            
            # Test basic connectivity
            result = await db.execute(text("SELECT 1"))
            connection_test = result.scalar()
            
            if connection_test != 1:
                raise Exception("Database connection test failed")
            
            # Test database performance with a simple query
            await db.execute(text("SELECT COUNT(*) FROM information_schema.tables"))
            
            response_time = time.time() - start_time
            
            # Check if response time is within acceptable limits
            if response_time > settings.PERFORMANCE_THRESHOLD_RESPONSE_TIME:
                status = HealthStatus.DEGRADED
                message = f"Database responding slowly ({response_time:.3f}s)"
            else:
                status = HealthStatus.HEALTHY
                message = "Database is healthy"
            
            return HealthCheckResult(
                service="database",
                status=status,
                response_time=round(response_time, 3),
                message=message,
                details={
                    "connection_test": "passed",
                    "performance_test": "passed",
                    "threshold": settings.PERFORMANCE_THRESHOLD_RESPONSE_TIME
                }
            )
            
        except Exception as e:
            response_time = time.time() - start_time
            logger.error(f"Database health check failed: {e}")
            
            return HealthCheckResult(
                service="database",
                status=HealthStatus.UNHEALTHY,
                response_time=round(response_time, 3),
                message=f"Database health check failed: {str(e)}",
                details={
                    "error": str(e),
                    "error_type": type(e).__name__
                }
            )
    
    async def check_redis_health(self) -> HealthCheckResult:
        """Check Redis connectivity and performance"""
        start_time = time.time()
        
        try:
            if not self.redis_client:
                await self.initialize()
            
            if not self.redis_client:
                raise Exception("Redis client not initialized")
            
            # Test basic connectivity
            pong = await self.redis_client.ping()
            if not pong:
                raise Exception("Redis ping failed")
            
            # Test read/write operations
            test_key = "health_check_test"
            test_value = str(int(time.time()))
            
            await self.redis_client.set(test_key, test_value, ex=60)
            retrieved_value = await self.redis_client.get(test_key)
            
            if retrieved_value != test_value:
                raise Exception("Redis read/write test failed")
            
            # Clean up test key
            await self.redis_client.delete(test_key)
            
            response_time = time.time() - start_time
            
            # Get Redis info
            redis_info = await self.redis_client.info()
            connected_clients = redis_info.get("connected_clients", 0)
            used_memory = redis_info.get("used_memory_human", "unknown")
            
            # Check performance
            if response_time > settings.PERFORMANCE_THRESHOLD_RESPONSE_TIME:
                status = HealthStatus.DEGRADED
                message = f"Redis responding slowly ({response_time:.3f}s)"
            else:
                status = HealthStatus.HEALTHY
                message = "Redis is healthy"
            
            return HealthCheckResult(
                service="redis",
                status=status,
                response_time=round(response_time, 3),
                message=message,
                details={
                    "connected_clients": connected_clients,
                    "used_memory": used_memory,
                    "ping_test": "passed",
                    "read_write_test": "passed"
                }
            )
            
        except Exception as e:
            response_time = time.time() - start_time
            logger.error(f"Redis health check failed: {e}")
            
            return HealthCheckResult(
                service="redis",
                status=HealthStatus.UNHEALTHY,
                response_time=round(response_time, 3),
                message=f"Redis health check failed: {str(e)}",
                details={
                    "error": str(e),
                    "error_type": type(e).__name__
                }
            )
    
    async def check_external_services_health(self) -> Dict[str, HealthCheckResult]:
        """Check health of external services"""
        if not self.session:
            await self.initialize()
        
        results = {}
        
        # Create tasks for concurrent health checks
        tasks = []
        service_names = []
        
        for service_name, health_url in settings.EXTERNAL_SERVICES.items():
            tasks.append(self._check_single_service_health(service_name, health_url))
            service_names.append(service_name)
        
        # Execute all health checks concurrently
        check_results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for service_name, result in zip(service_names, check_results):
            if isinstance(result, HealthCheckResult):
                results[service_name] = result
            else:
                results[service_name] = HealthCheckResult(
                    service=service_name,
                    status=HealthStatus.UNHEALTHY,
                    response_time=0.0,
                    message=f"Health check failed: {str(result)}",
                    details={"error": str(result)}
                )
        
        return results
    
    async def _check_single_service_health(self, service_name: str, health_url: str) -> HealthCheckResult:
        """Check health of a single external service"""
        start_time = time.time()
        
        # Check cache first
        cache_key = f"health_{service_name}"
        if cache_key in self._health_cache:
            cached_result = self._health_cache[cache_key]
            if (datetime.utcnow() - cached_result.timestamp).seconds < self._cache_ttl:
                return cached_result
        
        try:
            async with self.session.get(health_url) as response:
                response_time = time.time() - start_time
                
                if response.status == 200:
                    # Try to parse response for additional health info
                    try:
                        health_data = await response.json()
                        service_status = health_data.get("status", "unknown")
                        
                        if service_status.lower() in ["healthy", "ok"]:
                            status = HealthStatus.HEALTHY
                            message = "Service is healthy"
                        elif service_status.lower() in ["degraded", "warning"]:
                            status = HealthStatus.DEGRADED
                            message = "Service is degraded"
                        else:
                            status = HealthStatus.UNHEALTHY
                            message = f"Service reports status: {service_status}"
                        
                        details = health_data
                    except Exception:
                        # If we can't parse JSON, assume healthy if status is 200
                        status = HealthStatus.HEALTHY
                        message = "Service is responding (no JSON health data)"
                        details = {"response_status": response.status}
                
                else:
                    status = HealthStatus.UNHEALTHY
                    message = f"Service returned status {response.status}"
                    details = {"response_status": response.status}
                
                # Check response time
                if response_time > settings.PERFORMANCE_THRESHOLD_RESPONSE_TIME and status == HealthStatus.HEALTHY:
                    status = HealthStatus.DEGRADED
                    message += f" (slow response: {response_time:.3f}s)"
                
                result = HealthCheckResult(
                    service=service_name,
                    status=status,
                    response_time=round(response_time, 3),
                    message=message,
                    details=details
                )
                
                # Cache the result
                self._health_cache[cache_key] = result
                
                return result
                
        except asyncio.TimeoutError:
            response_time = time.time() - start_time
            return HealthCheckResult(
                service=service_name,
                status=HealthStatus.UNHEALTHY,
                response_time=round(response_time, 3),
                message="Service health check timed out",
                details={"error": "timeout", "url": health_url}
            )
        except Exception as e:
            response_time = time.time() - start_time
            return HealthCheckResult(
                service=service_name,
                status=HealthStatus.UNHEALTHY,
                response_time=round(response_time, 3),
                message=f"Service health check failed: {str(e)}",
                details={"error": str(e), "url": health_url}
            )
    
    async def check_system_resources(self) -> SystemMetrics:
        """Check system resource usage"""
        try:
            # CPU usage
            cpu_usage = psutil.cpu_percent(interval=1)
            
            # Memory usage
            memory = psutil.virtual_memory()
            memory_usage = memory.percent
            
            # Disk usage
            disk = psutil.disk_usage('/')
            disk_usage = (disk.used / disk.total) * 100
            
            # Network I/O
            network_io = psutil.net_io_counters()
            network_stats = {
                "bytes_sent": network_io.bytes_sent,
                "bytes_recv": network_io.bytes_recv,
                "packets_sent": network_io.packets_sent,
                "packets_recv": network_io.packets_recv
            }
            
            # Process count
            process_count = len(psutil.pids())
            
            # System uptime
            boot_time = psutil.boot_time()
            uptime = time.time() - boot_time
            
            # Load average (Unix-like systems only)
            load_average = None
            try:
                load_average = list(psutil.getloadavg())
            except AttributeError:
                # Windows doesn't have load average
                pass
            
            return SystemMetrics(
                cpu_usage=round(cpu_usage, 2),
                memory_usage=round(memory_usage, 2),
                disk_usage=round(disk_usage, 2),
                network_io=network_stats,
                process_count=process_count,
                uptime=round(uptime, 2),
                load_average=load_average
            )
            
        except Exception as e:
            logger.error(f"Failed to collect system metrics: {e}")
            raise
    
    async def check_performance_thresholds(self) -> Dict[str, Any]:
        """Check if system performance is within acceptable thresholds"""
        try:
            system_metrics = await self.check_system_resources()
            
            threshold_checks = {
                "cpu_usage": {
                    "value": system_metrics.cpu_usage,
                    "threshold": settings.PERFORMANCE_THRESHOLD_CPU_USAGE,
                    "status": "ok" if system_metrics.cpu_usage < settings.PERFORMANCE_THRESHOLD_CPU_USAGE else "warning",
                    "message": f"CPU usage: {system_metrics.cpu_usage}%"
                },
                "memory_usage": {
                    "value": system_metrics.memory_usage,
                    "threshold": settings.PERFORMANCE_THRESHOLD_MEMORY_USAGE,
                    "status": "ok" if system_metrics.memory_usage < settings.PERFORMANCE_THRESHOLD_MEMORY_USAGE else "warning",
                    "message": f"Memory usage: {system_metrics.memory_usage}%"
                },
                "disk_usage": {
                    "value": system_metrics.disk_usage,
                    "threshold": 90.0,  # 90% disk usage threshold
                    "status": "ok" if system_metrics.disk_usage < 90.0 else "critical",
                    "message": f"Disk usage: {system_metrics.disk_usage}%"
                }
            }
            
            # Overall performance status
            critical_issues = sum(1 for check in threshold_checks.values() if check["status"] == "critical")
            warning_issues = sum(1 for check in threshold_checks.values() if check["status"] == "warning")
            
            if critical_issues > 0:
                overall_status = "critical"
            elif warning_issues > 0:
                overall_status = "warning"
            else:
                overall_status = "ok"
            
            return {
                "status": overall_status,
                "checks": threshold_checks,
                "summary": {
                    "critical_issues": critical_issues,
                    "warning_issues": warning_issues,
                    "total_checks": len(threshold_checks)
                },
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Performance threshold check failed: {e}")
            return {
                "status": "error",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    async def get_service_status(self, service_name: str) -> Optional[HealthCheckResult]:
        """Get health status of a specific service"""
        if service_name == "database":
            return await self.check_database_health()
        elif service_name == "redis":
            return await self.check_redis_health()
        elif service_name in settings.EXTERNAL_SERVICES:
            health_url = settings.EXTERNAL_SERVICES[service_name]
            return await self._check_single_service_health(service_name, health_url)
        else:
            return None
    
    async def run_health_check_cycle(self) -> Dict[str, Any]:
        """Run a complete health check cycle"""
        start_time = time.time()
        
        logger.info("Starting health check cycle")
        
        try:
            health_status = await self.get_overall_health()
            
            cycle_time = time.time() - start_time
            health_status["cycle_time"] = round(cycle_time, 3)
            
            logger.info(f"Health check cycle completed in {cycle_time:.3f}s - Status: {health_status['status']}")
            
            return health_status
            
        except Exception as e:
            cycle_time = time.time() - start_time
            logger.error(f"Health check cycle failed after {cycle_time:.3f}s: {e}")
            
            return {
                "status": HealthStatus.UNHEALTHY,
                "error": str(e),
                "cycle_time": round(cycle_time, 3),
                "timestamp": datetime.utcnow().isoformat()
            }


# Global health check service instance
health_service = HealthCheckService()