"""
Circuit breaker implementation for API Gateway
"""
import asyncio
import time
from typing import Dict, Optional, Callable, Any
from dataclasses import dataclass
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class CircuitBreakerState(Enum):
    """Circuit breaker states."""
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


@dataclass
class CircuitBreakerConfig:
    """Circuit breaker configuration."""
    failure_threshold: int = 5
    timeout_seconds: int = 60
    success_threshold: int = 3  # For half-open state
    request_volume_threshold: int = 10  # Minimum requests before opening


class CircuitBreakerStats:
    """Circuit breaker statistics."""
    
    def __init__(self):
        self.total_requests = 0
        self.failed_requests = 0
        self.successful_requests = 0
        self.last_failure_time: Optional[float] = None
        self.consecutive_failures = 0
        self.consecutive_successes = 0


class CircuitBreaker:
    """Circuit breaker for protecting against cascading failures."""
    
    def __init__(self, name: str, config: CircuitBreakerConfig):
        self.name = name
        self.config = config
        self.state = CircuitBreakerState.CLOSED
        self.stats = CircuitBreakerStats()
        self._state_change_time = time.time()
        self._lock = asyncio.Lock()
    
    async def call(self, func: Callable, *args, **kwargs) -> Any:
        """Execute function with circuit breaker protection."""
        async with self._lock:
            # Check if we should transition states
            await self._check_state_transition()
            
            # If circuit is open, fail fast
            if self.state == CircuitBreakerState.OPEN:
                raise CircuitBreakerOpenException(
                    f"Circuit breaker {self.name} is open"
                )
            
            # Record request
            self.stats.total_requests += 1
        
        try:
            # Execute the function
            result = await func(*args, **kwargs) if asyncio.iscoroutinefunction(func) else func(*args, **kwargs)
            
            # Record success
            async with self._lock:
                await self._record_success()
            
            return result
        
        except Exception as e:
            # Record failure
            async with self._lock:
                await self._record_failure()
            raise e
    
    async def _check_state_transition(self):
        """Check if circuit breaker should transition states."""
        current_time = time.time()
        
        if self.state == CircuitBreakerState.OPEN:
            # Check if timeout has passed
            if current_time - self._state_change_time >= self.config.timeout_seconds:
                await self._transition_to_half_open()
        
        elif self.state == CircuitBreakerState.CLOSED:
            # Check if we should open the circuit
            if (self.stats.consecutive_failures >= self.config.failure_threshold and
                self.stats.total_requests >= self.config.request_volume_threshold):
                await self._transition_to_open()
        
        elif self.state == CircuitBreakerState.HALF_OPEN:
            # Check if we should close or open the circuit
            if self.stats.consecutive_successes >= self.config.success_threshold:
                await self._transition_to_closed()
            elif self.stats.consecutive_failures > 0:
                await self._transition_to_open()
    
    async def _record_success(self):
        """Record a successful request."""
        self.stats.successful_requests += 1
        self.stats.consecutive_successes += 1
        self.stats.consecutive_failures = 0
        
        logger.debug(f"Circuit breaker {self.name}: Success recorded")
    
    async def _record_failure(self):
        """Record a failed request."""
        self.stats.failed_requests += 1
        self.stats.consecutive_failures += 1
        self.stats.consecutive_successes = 0
        self.stats.last_failure_time = time.time()
        
        logger.debug(f"Circuit breaker {self.name}: Failure recorded")
    
    async def _transition_to_open(self):
        """Transition to open state."""
        self.state = CircuitBreakerState.OPEN
        self._state_change_time = time.time()
        
        logger.warning(
            f"Circuit breaker {self.name} opened after "
            f"{self.stats.consecutive_failures} consecutive failures"
        )
    
    async def _transition_to_half_open(self):
        """Transition to half-open state."""
        self.state = CircuitBreakerState.HALF_OPEN
        self._state_change_time = time.time()
        self.stats.consecutive_successes = 0
        self.stats.consecutive_failures = 0
        
        logger.info(f"Circuit breaker {self.name} transitioned to half-open")
    
    async def _transition_to_closed(self):
        """Transition to closed state."""
        self.state = CircuitBreakerState.CLOSED
        self._state_change_time = time.time()
        
        logger.info(f"Circuit breaker {self.name} closed")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get circuit breaker statistics."""
        current_time = time.time()
        failure_rate = (
            self.stats.failed_requests / self.stats.total_requests * 100
            if self.stats.total_requests > 0 else 0
        )
        
        return {
            "name": self.name,
            "state": self.state.value,
            "total_requests": self.stats.total_requests,
            "successful_requests": self.stats.successful_requests,
            "failed_requests": self.stats.failed_requests,
            "failure_rate_percent": round(failure_rate, 2),
            "consecutive_failures": self.stats.consecutive_failures,
            "consecutive_successes": self.stats.consecutive_successes,
            "last_failure_time": self.stats.last_failure_time,
            "state_change_time": self._state_change_time,
            "time_in_current_state": round(current_time - self._state_change_time, 2),
        }
    
    def reset(self):
        """Reset circuit breaker to initial state."""
        self.state = CircuitBreakerState.CLOSED
        self.stats = CircuitBreakerStats()
        self._state_change_time = time.time()
        
        logger.info(f"Circuit breaker {self.name} reset")


class CircuitBreakerManager:
    """Manager for multiple circuit breakers."""
    
    def __init__(self, default_config: Optional[CircuitBreakerConfig] = None):
        self.circuit_breakers: Dict[str, CircuitBreaker] = {}
        self.default_config = default_config or CircuitBreakerConfig()
    
    def get_circuit_breaker(
        self, 
        name: str, 
        config: Optional[CircuitBreakerConfig] = None
    ) -> CircuitBreaker:
        """Get or create a circuit breaker."""
        if name not in self.circuit_breakers:
            breaker_config = config or self.default_config
            self.circuit_breakers[name] = CircuitBreaker(name, breaker_config)
        
        return self.circuit_breakers[name]
    
    def get_all_stats(self) -> Dict[str, Dict[str, Any]]:
        """Get statistics for all circuit breakers."""
        return {
            name: breaker.get_stats()
            for name, breaker in self.circuit_breakers.items()
        }
    
    def reset_all(self):
        """Reset all circuit breakers."""
        for breaker in self.circuit_breakers.values():
            breaker.reset()
        
        logger.info("All circuit breakers reset")


class CircuitBreakerOpenException(Exception):
    """Exception raised when circuit breaker is open."""
    pass


# Global circuit breaker manager
circuit_breaker_manager = CircuitBreakerManager()