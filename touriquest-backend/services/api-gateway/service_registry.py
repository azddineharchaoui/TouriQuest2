"""
Service registry for managing microservice endpoints and health checks
"""
import asyncio
import aiohttp
import logging
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime, timedelta
import random

logger = logging.getLogger(__name__)


@dataclass
class ServiceInstance:
    """Service instance configuration."""
    name: str
    url: str
    health_endpoint: str
    timeout: float
    weight: int = 1
    last_health_check: Optional[datetime] = None
    is_healthy: bool = True
    consecutive_failures: int = 0
    circuit_breaker_open: bool = False
    circuit_breaker_open_until: Optional[datetime] = None


@dataclass
class ServiceConfig:
    """Service configuration with multiple instances."""
    name: str
    instances: List[ServiceInstance] = field(default_factory=list)
    load_balancing_strategy: str = "round_robin"
    current_index: int = 0


class ServiceRegistry:
    """Service registry with health checking and load balancing."""
    
    def __init__(self, circuit_breaker_threshold: int = 5, circuit_breaker_timeout: int = 60):
        self.services: Dict[str, ServiceConfig] = {}
        self.circuit_breaker_threshold = circuit_breaker_threshold
        self.circuit_breaker_timeout = circuit_breaker_timeout
        self._health_check_task: Optional[asyncio.Task] = None
        
        # Initialize default services
        self._initialize_default_services()
    
    def _initialize_default_services(self):
        """Initialize default microservice configurations."""
        default_services = {
            "auth": ServiceConfig(
                name="auth",
                instances=[
                    ServiceInstance(
                        name="auth-primary",
                        url="http://auth-service:8000",
                        health_endpoint="/health",
                        timeout=30.0,
                    )
                ]
            ),
            "user": ServiceConfig(
                name="user",
                instances=[
                    ServiceInstance(
                        name="user-primary",
                        url="http://user-service:8000",
                        health_endpoint="/health",
                        timeout=30.0,
                    )
                ]
            ),
            "property": ServiceConfig(
                name="property",
                instances=[
                    ServiceInstance(
                        name="property-primary",
                        url="http://property-service:8000",
                        health_endpoint="/health",
                        timeout=30.0,
                    )
                ]
            ),
            "booking": ServiceConfig(
                name="booking",
                instances=[
                    ServiceInstance(
                        name="booking-primary",
                        url="http://booking-service:8000",
                        health_endpoint="/health",
                        timeout=30.0,
                    )
                ]
            ),
            "poi": ServiceConfig(
                name="poi",
                instances=[
                    ServiceInstance(
                        name="poi-primary",
                        url="http://poi-service:8000",
                        health_endpoint="/health",
                        timeout=30.0,
                    )
                ]
            ),
            "experience": ServiceConfig(
                name="experience",
                instances=[
                    ServiceInstance(
                        name="experience-primary",
                        url="http://experience-service:8000",
                        health_endpoint="/health",
                        timeout=30.0,
                    )
                ]
            ),
            "ai": ServiceConfig(
                name="ai",
                instances=[
                    ServiceInstance(
                        name="ai-primary",
                        url="http://ai-service:8000",
                        health_endpoint="/health",
                        timeout=60.0,
                    )
                ]
            ),
            "media": ServiceConfig(
                name="media",
                instances=[
                    ServiceInstance(
                        name="media-primary",
                        url="http://media-service:8000",
                        health_endpoint="/health",
                        timeout=45.0,
                    )
                ]
            ),
            "notification": ServiceConfig(
                name="notification",
                instances=[
                    ServiceInstance(
                        name="notification-primary",
                        url="http://notification-service:8000",
                        health_endpoint="/health",
                        timeout=30.0,
                    )
                ]
            ),
            "analytics": ServiceConfig(
                name="analytics",
                instances=[
                    ServiceInstance(
                        name="analytics-primary",
                        url="http://analytics-service:8000",
                        health_endpoint="/health",
                        timeout=30.0,
                    )
                ]
            ),
            "admin": ServiceConfig(
                name="admin",
                instances=[
                    ServiceInstance(
                        name="admin-primary",
                        url="http://admin-service:8000",
                        health_endpoint="/health",
                        timeout=30.0,
                    )
                ]
            ),
        }
        
        self.services.update(default_services)
    
    def register_service(self, service_config: ServiceConfig):
        """Register a new service configuration."""
        self.services[service_config.name] = service_config
        logger.info(f"Registered service: {service_config.name}")
    
    def add_service_instance(self, service_name: str, instance: ServiceInstance):
        """Add an instance to an existing service."""
        if service_name not in self.services:
            self.services[service_name] = ServiceConfig(name=service_name)
        
        self.services[service_name].instances.append(instance)
        logger.info(f"Added instance {instance.name} to service {service_name}")
    
    def get_healthy_instance(self, service_name: str) -> Optional[ServiceInstance]:
        """Get a healthy instance using load balancing."""
        service_config = self.services.get(service_name)
        if not service_config or not service_config.instances:
            return None
        
        healthy_instances = [
            instance for instance in service_config.instances
            if instance.is_healthy and not instance.circuit_breaker_open
        ]
        
        if not healthy_instances:
            # If no healthy instances, try instances with expired circuit breaker
            now = datetime.utcnow()
            expired_cb_instances = [
                instance for instance in service_config.instances
                if (instance.circuit_breaker_open and 
                    instance.circuit_breaker_open_until and
                    now > instance.circuit_breaker_open_until)
            ]
            
            if expired_cb_instances:
                # Reset circuit breaker for expired instances
                for instance in expired_cb_instances:
                    instance.circuit_breaker_open = False
                    instance.circuit_breaker_open_until = None
                    instance.consecutive_failures = 0
                    logger.info(f"Circuit breaker reset for {instance.name}")
                
                healthy_instances = expired_cb_instances
            else:
                return None
        
        # Apply load balancing strategy
        return self._select_instance(service_config, healthy_instances)
    
    def _select_instance(
        self, 
        service_config: ServiceConfig, 
        healthy_instances: List[ServiceInstance]
    ) -> ServiceInstance:
        """Select an instance based on load balancing strategy."""
        if service_config.load_balancing_strategy == "round_robin":
            service_config.current_index = (service_config.current_index + 1) % len(healthy_instances)
            return healthy_instances[service_config.current_index]
        
        elif service_config.load_balancing_strategy == "weighted":
            weights = [instance.weight for instance in healthy_instances]
            return random.choices(healthy_instances, weights=weights)[0]
        
        elif service_config.load_balancing_strategy == "random":
            return random.choice(healthy_instances)
        
        else:  # Default to round_robin
            service_config.current_index = (service_config.current_index + 1) % len(healthy_instances)
            return healthy_instances[service_config.current_index]
    
    def mark_instance_failure(self, service_name: str, instance_url: str):
        """Mark an instance as failed and potentially open circuit breaker."""
        service_config = self.services.get(service_name)
        if not service_config:
            return
        
        for instance in service_config.instances:
            if instance.url == instance_url:
                instance.consecutive_failures += 1
                
                if instance.consecutive_failures >= self.circuit_breaker_threshold:
                    instance.circuit_breaker_open = True
                    instance.circuit_breaker_open_until = (
                        datetime.utcnow() + timedelta(seconds=self.circuit_breaker_timeout)
                    )
                    logger.warning(
                        f"Circuit breaker opened for {instance.name} "
                        f"after {instance.consecutive_failures} failures"
                    )
                break
    
    def mark_instance_success(self, service_name: str, instance_url: str):
        """Mark an instance as successful."""
        service_config = self.services.get(service_name)
        if not service_config:
            return
        
        for instance in service_config.instances:
            if instance.url == instance_url:
                instance.consecutive_failures = 0
                instance.is_healthy = True
                break
    
    async def start_health_checks(self, interval: int = 30):
        """Start periodic health checks for all services."""
        if self._health_check_task:
            return
        
        self._health_check_task = asyncio.create_task(
            self._health_check_loop(interval)
        )
        logger.info("Started health check task")
    
    async def stop_health_checks(self):
        """Stop health check task."""
        if self._health_check_task:
            self._health_check_task.cancel()
            try:
                await self._health_check_task
            except asyncio.CancelledError:
                pass
            self._health_check_task = None
            logger.info("Stopped health check task")
    
    async def _health_check_loop(self, interval: int):
        """Health check loop."""
        while True:
            try:
                await self._perform_health_checks()
                await asyncio.sleep(interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in health check loop: {e}")
                await asyncio.sleep(interval)
    
    async def _perform_health_checks(self):
        """Perform health checks for all service instances."""
        async with aiohttp.ClientSession() as session:
            tasks = []
            
            for service_config in self.services.values():
                for instance in service_config.instances:
                    task = asyncio.create_task(
                        self._check_instance_health(session, instance)
                    )
                    tasks.append(task)
            
            if tasks:
                await asyncio.gather(*tasks, return_exceptions=True)
    
    async def _check_instance_health(
        self, 
        session: aiohttp.ClientSession, 
        instance: ServiceInstance
    ):
        """Check health of a single service instance."""
        health_url = f"{instance.url}{instance.health_endpoint}"
        
        try:
            async with session.get(
                health_url, 
                timeout=aiohttp.ClientTimeout(total=5.0)
            ) as response:
                if response.status == 200:
                    instance.is_healthy = True
                    instance.consecutive_failures = 0
                    instance.last_health_check = datetime.utcnow()
                    
                    # Close circuit breaker if it was open
                    if instance.circuit_breaker_open:
                        instance.circuit_breaker_open = False
                        instance.circuit_breaker_open_until = None
                        logger.info(f"Circuit breaker closed for {instance.name}")
                else:
                    instance.is_healthy = False
                    instance.consecutive_failures += 1
        
        except Exception as e:
            instance.is_healthy = False
            instance.consecutive_failures += 1
            logger.warning(f"Health check failed for {instance.name}: {e}")
        
        instance.last_health_check = datetime.utcnow()
    
    def get_service_status(self) -> Dict[str, Dict]:
        """Get status of all services and instances."""
        status = {}
        
        for service_name, service_config in self.services.items():
            service_status = {
                "instances": [],
                "healthy_count": 0,
                "total_count": len(service_config.instances),
            }
            
            for instance in service_config.instances:
                instance_status = {
                    "name": instance.name,
                    "url": instance.url,
                    "healthy": instance.is_healthy,
                    "circuit_breaker_open": instance.circuit_breaker_open,
                    "consecutive_failures": instance.consecutive_failures,
                    "last_health_check": instance.last_health_check.isoformat() if instance.last_health_check else None,
                }
                
                service_status["instances"].append(instance_status)
                
                if instance.is_healthy and not instance.circuit_breaker_open:
                    service_status["healthy_count"] += 1
            
            service_status["health_percentage"] = (
                (service_status["healthy_count"] / service_status["total_count"] * 100)
                if service_status["total_count"] > 0 else 0
            )
            
            status[service_name] = service_status
        
        return status