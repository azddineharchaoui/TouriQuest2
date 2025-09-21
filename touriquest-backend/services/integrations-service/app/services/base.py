"""
Base integration service with common functionality
"""

import asyncio
import logging
import time
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from abc import ABC, abstractmethod

import redis.asyncio as redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.integration_models import (
    Integration, IntegrationStatus, ApiRequest, ApiRequestStatus,
    IntegrationMetrics, IntegrationAlert, IntegrationCost
)

logger = logging.getLogger(__name__)


class CircuitBreaker:
    """Circuit breaker for external service calls"""
    
    def __init__(
        self,
        failure_threshold: int = 5,
        reset_timeout: int = 60,
        expected_exception: Exception = Exception
    ):
        self.failure_threshold = failure_threshold
        self.reset_timeout = reset_timeout
        self.expected_exception = expected_exception
        self.failure_count = 0
        self.last_failure_time = None
        self.state = "CLOSED"  # CLOSED, OPEN, HALF_OPEN
    
    async def __aenter__(self):
        if self.state == "OPEN":
            if self._should_attempt_reset():
                self.state = "HALF_OPEN"
            else:
                raise Exception("Circuit breaker is OPEN")
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if exc_type is None:
            self._on_success()
        elif issubclass(exc_type, self.expected_exception):
            self._on_failure()
        return False
    
    def _should_attempt_reset(self) -> bool:
        """Check if enough time has passed to attempt reset"""
        if self.last_failure_time is None:
            return True
        return time.time() - self.last_failure_time >= self.reset_timeout
    
    def _on_success(self):
        """Reset circuit breaker on success"""
        self.failure_count = 0
        self.state = "CLOSED"
    
    def _on_failure(self):
        """Handle failure in circuit breaker"""
        self.failure_count += 1
        self.last_failure_time = time.time()
        
        if self.failure_count >= self.failure_threshold:
            self.state = "OPEN"


class RateLimiter:
    """Rate limiter for API calls"""
    
    def __init__(self, redis_client: redis.Redis, key_prefix: str):
        self.redis_client = redis_client
        self.key_prefix = key_prefix
    
    async def is_allowed(
        self,
        identifier: str,
        limit: int,
        window: int
    ) -> bool:
        """Check if request is allowed within rate limit"""
        try:
            key = f"{self.key_prefix}:{identifier}"
            current = await self.redis_client.get(key)
            
            if current is None:
                # First request in window
                await self.redis_client.setex(key, window, 1)
                return True
            
            current_count = int(current)
            if current_count < limit:
                await self.redis_client.incr(key)
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Rate limiter error: {e}")
            return True  # Allow on error to avoid blocking


class BaseIntegrationService(ABC):
    """Base class for all integration services"""
    
    def __init__(self, service_name: str):
        self.service_name = service_name
        self.redis_client: Optional[redis.Redis] = None
        self.circuit_breaker = CircuitBreaker(
            failure_threshold=settings.CIRCUIT_BREAKER_FAILURE_THRESHOLD,
            reset_timeout=settings.CIRCUIT_BREAKER_RESET_TIMEOUT
        )
        self.rate_limiter: Optional[RateLimiter] = None
        self.request_count = 0
        self.error_count = 0
    
    async def initialize(self):
        """Initialize the service"""
        self.redis_client = redis.from_url(settings.redis_url_complete)
        self.rate_limiter = RateLimiter(self.redis_client, f"rate_limit:{self.service_name}")
        await self._register_integration()
    
    async def make_api_request(
        self,
        endpoint: str,
        method: str = "GET",
        data: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
        timeout: int = 30
    ) -> Dict[str, Any]:
        """Make an API request with monitoring and error handling"""
        start_time = time.time()
        request_id = f"{self.service_name}_{int(start_time * 1000)}"
        
        try:
            # Check rate limit
            if not await self.rate_limiter.is_allowed(
                self.service_name,
                settings.EXTERNAL_API_RATE_LIMIT,
                60  # 1 minute window
            ):
                raise Exception("Rate limit exceeded")
            
            # Use circuit breaker
            async with self.circuit_breaker:
                response_data = await self._execute_request(
                    endpoint, method, data, headers, timeout
                )
            
            # Calculate response time
            response_time = int((time.time() - start_time) * 1000)
            
            # Record successful request
            await self._record_api_request(
                endpoint=endpoint,
                method=method,
                request_data=data,
                response_data=response_data,
                response_time_ms=response_time,
                status=ApiRequestStatus.SUCCESS
            )
            
            self.request_count += 1
            return response_data
            
        except Exception as e:
            # Calculate response time even for errors
            response_time = int((time.time() - start_time) * 1000)
            
            # Record failed request
            await self._record_api_request(
                endpoint=endpoint,
                method=method,
                request_data=data,
                response_time_ms=response_time,
                status=ApiRequestStatus.ERROR,
                error_message=str(e)
            )
            
            self.error_count += 1
            logger.error(f"API request failed for {self.service_name}: {e}")
            raise
    
    @abstractmethod
    async def _execute_request(
        self,
        endpoint: str,
        method: str,
        data: Optional[Dict[str, Any]],
        headers: Optional[Dict[str, str]],
        timeout: int
    ) -> Dict[str, Any]:
        """Execute the actual API request - must be implemented by subclasses"""
        pass
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform health check for the integration"""
        try:
            # This would be implemented by each service
            health_data = await self._perform_health_check()
            
            await self._update_integration_status(
                status=IntegrationStatus.ACTIVE,
                health_data=health_data
            )
            
            return {
                "service": self.service_name,
                "status": "healthy",
                "timestamp": datetime.utcnow().isoformat(),
                **health_data
            }
            
        except Exception as e:
            await self._update_integration_status(
                status=IntegrationStatus.ERROR,
                error_message=str(e)
            )
            
            return {
                "service": self.service_name,
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    async def _perform_health_check(self) -> Dict[str, Any]:
        """Perform service-specific health check"""
        # Default implementation - can be overridden
        return {"basic_check": "passed"}
    
    async def get_metrics(self) -> Dict[str, Any]:
        """Get service metrics"""
        try:
            # Get recent API requests
            async with AsyncSessionLocal() as session:
                from sqlalchemy import select, func
                
                # Get request count and error rate for last hour
                one_hour_ago = datetime.utcnow() - timedelta(hours=1)
                
                request_stats = await session.execute(
                    select(
                        func.count(ApiRequest.id).label("total_requests"),
                        func.avg(ApiRequest.response_time_ms).label("avg_response_time"),
                        func.count(ApiRequest.id).filter(
                            ApiRequest.status == ApiRequestStatus.ERROR
                        ).label("error_count")
                    )
                    .where(
                        ApiRequest.service == self.service_name,
                        ApiRequest.created_at >= one_hour_ago
                    )
                )
                
                stats = request_stats.first()
                
                return {
                    "service": self.service_name,
                    "total_requests": stats.total_requests or 0,
                    "error_count": stats.error_count or 0,
                    "error_rate": (stats.error_count or 0) / max(stats.total_requests or 1, 1),
                    "avg_response_time_ms": float(stats.avg_response_time or 0),
                    "circuit_breaker_state": self.circuit_breaker.state,
                    "timestamp": datetime.utcnow().isoformat()
                }
                
        except Exception as e:
            logger.error(f"Error getting metrics for {self.service_name}: {e}")
            return {
                "service": self.service_name,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    async def record_cost(
        self,
        cost_type: str,
        amount: float,
        currency: str = "USD",
        quantity: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Record cost for API usage"""
        try:
            async with AsyncSessionLocal() as session:
                cost_record = IntegrationCost(
                    integration_name=self.service_name,
                    service_name=self.service_name,
                    cost_type=cost_type,
                    cost_amount=amount,
                    currency=currency,
                    quantity=quantity,
                    billing_period="daily",
                    period_start=datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0),
                    period_end=datetime.utcnow().replace(hour=23, minute=59, second=59, microsecond=999999)
                )
                
                session.add(cost_record)
                await session.commit()
                
        except Exception as e:
            logger.error(f"Error recording cost for {self.service_name}: {e}")
    
    async def create_alert(
        self,
        alert_type: str,
        severity: str,
        title: str,
        message: str,
        alert_data: Optional[Dict[str, Any]] = None
    ):
        """Create an alert for the integration"""
        try:
            async with AsyncSessionLocal() as session:
                alert = IntegrationAlert(
                    integration_name=self.service_name,
                    alert_type=alert_type,
                    severity=severity,
                    title=title,
                    message=message,
                    alert_data=alert_data or {}
                )
                
                session.add(alert)
                await session.commit()
                
        except Exception as e:
            logger.error(f"Error creating alert for {self.service_name}: {e}")
    
    async def _register_integration(self):
        """Register or update integration in database"""
        try:
            async with AsyncSessionLocal() as session:
                from sqlalchemy import select
                
                # Check if integration exists
                stmt = select(Integration).where(Integration.name == self.service_name)
                result = await session.execute(stmt)
                integration = result.scalar_one_or_none()
                
                if not integration:
                    # Create new integration
                    integration = Integration(
                        name=self.service_name,
                        type=self._get_integration_type(),
                        status=IntegrationStatus.ACTIVE,
                        is_enabled=True
                    )
                    session.add(integration)
                else:
                    # Update existing integration
                    integration.status = IntegrationStatus.ACTIVE
                    integration.last_health_check = datetime.utcnow()
                    integration.health_status = "healthy"
                
                await session.commit()
                
        except Exception as e:
            logger.error(f"Error registering integration {self.service_name}: {e}")
    
    async def _update_integration_status(
        self,
        status: IntegrationStatus,
        health_data: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None
    ):
        """Update integration status in database"""
        try:
            async with AsyncSessionLocal() as session:
                from sqlalchemy import update
                
                update_data = {
                    "status": status,
                    "last_health_check": datetime.utcnow(),
                    "health_status": "healthy" if status == IntegrationStatus.ACTIVE else "unhealthy"
                }
                
                if status == IntegrationStatus.ACTIVE:
                    update_data["success_count"] = Integration.success_count + 1
                else:
                    update_data["error_count"] = Integration.error_count + 1
                
                stmt = update(Integration).where(
                    Integration.name == self.service_name
                ).values(**update_data)
                
                await session.execute(stmt)
                await session.commit()
                
        except Exception as e:
            logger.error(f"Error updating integration status for {self.service_name}: {e}")
    
    async def _record_api_request(
        self,
        endpoint: str,
        method: str,
        request_data: Optional[Dict[str, Any]] = None,
        response_data: Optional[Dict[str, Any]] = None,
        response_time_ms: Optional[int] = None,
        status: ApiRequestStatus = ApiRequestStatus.SUCCESS,
        error_message: Optional[str] = None,
        cost_cents: Optional[int] = None
    ):
        """Record API request in database"""
        try:
            async with AsyncSessionLocal() as session:
                api_request = ApiRequest(
                    service=self.service_name,
                    endpoint=endpoint,
                    method=method,
                    request_data=request_data,
                    response_data=response_data,
                    response_time_ms=response_time_ms,
                    status=status,
                    error_message=error_message,
                    cost_cents=cost_cents
                )
                
                session.add(api_request)
                await session.commit()
                
        except Exception as e:
            logger.error(f"Error recording API request for {self.service_name}: {e}")
    
    def _get_integration_type(self) -> str:
        """Get integration type based on service name"""
        type_mapping = {
            "stripe": "payment",
            "paypal": "payment",
            "braintree": "payment",
            "google_maps": "mapping",
            "mapbox": "mapping",
            "sendgrid": "communication",
            "twilio": "communication",
            "aws_ses": "communication",
            "slack": "communication",
            "openai": "ai",
            "anthropic": "ai",
            "google_translate": "translation",
            "openweather": "weather",
            "weatherapi": "weather",
            "exchangerate": "currency",
            "fixer": "currency"
        }
        return type_mapping.get(self.service_name, "other")