"""
Rate Limiting Module
Implements rate limiting for API endpoints to prevent abuse
"""
import time
from datetime import datetime, timedelta
from typing import Dict, Optional
import asyncio
from collections import defaultdict, deque

from fastapi import HTTPException, status


class RateLimitExceeded(HTTPException):
    """Rate limit exceeded exception"""
    
    def __init__(self, retry_after: int = None):
        detail = "Rate limit exceeded"
        if retry_after:
            detail += f". Try again in {retry_after} seconds"
        
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=detail,
            headers={"Retry-After": str(retry_after)} if retry_after else None
        )


class RateLimiter:
    """In-memory rate limiter using sliding window algorithm"""
    
    def __init__(self, max_requests: int = 100, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: Dict[str, deque] = defaultdict(deque)
        self._lock = asyncio.Lock()
    
    async def check_rate_limit(self, key: str, identifier: str = None) -> bool:
        """
        Check if request is within rate limits
        
        Args:
            key: Rate limit key (e.g., "login:192.168.1.1:user@example.com")
            identifier: Human-readable identifier for logging
            
        Raises:
            RateLimitExceeded: If rate limit is exceeded
            
        Returns:
            bool: True if request is allowed
        """
        async with self._lock:
            now = time.time()
            window_start = now - self.window_seconds
            
            # Get request queue for this key
            request_queue = self.requests[key]
            
            # Remove old requests outside the window
            while request_queue and request_queue[0] < window_start:
                request_queue.popleft()
            
            # Check if we're within limits
            if len(request_queue) >= self.max_requests:
                # Calculate retry after time
                oldest_request = request_queue[0]
                retry_after = int(oldest_request + self.window_seconds - now) + 1
                
                raise RateLimitExceeded(retry_after=retry_after)
            
            # Add current request
            request_queue.append(now)
            
            return True
    
    async def get_remaining_requests(self, key: str) -> int:
        """Get number of remaining requests for a key"""
        async with self._lock:
            now = time.time()
            window_start = now - self.window_seconds
            
            request_queue = self.requests[key]
            
            # Remove old requests
            while request_queue and request_queue[0] < window_start:
                request_queue.popleft()
            
            return max(0, self.max_requests - len(request_queue))
    
    async def reset_key(self, key: str):
        """Reset rate limit for a specific key"""
        async with self._lock:
            if key in self.requests:
                del self.requests[key]
    
    async def cleanup_old_keys(self):
        """Cleanup old keys that haven't been used recently"""
        async with self._lock:
            now = time.time()
            window_start = now - self.window_seconds * 2  # Keep data for 2 windows
            
            keys_to_remove = []
            for key, request_queue in self.requests.items():
                # Remove old requests
                while request_queue and request_queue[0] < window_start:
                    request_queue.popleft()
                
                # If queue is empty, mark key for removal
                if not request_queue:
                    keys_to_remove.append(key)
            
            # Remove empty keys
            for key in keys_to_remove:
                del self.requests[key]


class RedisRateLimiter:
    """Redis-based rate limiter for distributed systems"""
    
    def __init__(self, redis_client, max_requests: int = 100, window_seconds: int = 60):
        self.redis = redis_client
        self.max_requests = max_requests
        self.window_seconds = window_seconds
    
    async def check_rate_limit(self, key: str, identifier: str = None) -> bool:
        """Check rate limit using Redis sliding window"""
        
        if not self.redis:
            # Fallback to in-memory limiter
            fallback = RateLimiter(self.max_requests, self.window_seconds)
            return await fallback.check_rate_limit(key, identifier)
        
        now = time.time()
        pipeline = self.redis.pipeline()
        
        # Redis key for this rate limit
        redis_key = f"rate_limit:{key}"
        
        # Use sliding window with sorted sets
        pipeline.zremrangebyscore(redis_key, 0, now - self.window_seconds)
        pipeline.zcard(redis_key)
        pipeline.zadd(redis_key, {str(now): now})
        pipeline.expire(redis_key, self.window_seconds + 1)
        
        results = await pipeline.execute()
        current_requests = results[1]
        
        if current_requests >= self.max_requests:
            # Get oldest request time for retry-after calculation
            oldest_requests = await self.redis.zrange(redis_key, 0, 0, withscores=True)
            if oldest_requests:
                oldest_time = oldest_requests[0][1]
                retry_after = int(oldest_time + self.window_seconds - now) + 1
                raise RateLimitExceeded(retry_after=retry_after)
        
        return True
    
    async def get_remaining_requests(self, key: str) -> int:
        """Get remaining requests for a key"""
        if not self.redis:
            return self.max_requests
        
        redis_key = f"rate_limit:{key}"
        now = time.time()
        
        # Clean old requests and count current
        await self.redis.zremrangebyscore(redis_key, 0, now - self.window_seconds)
        current_requests = await self.redis.zcard(redis_key)
        
        return max(0, self.max_requests - current_requests)
    
    async def reset_key(self, key: str):
        """Reset rate limit for a key"""
        if self.redis:
            redis_key = f"rate_limit:{key}"
            await self.redis.delete(redis_key)


# Global rate limiters for different endpoints
# These would typically be configured via environment variables
AUTH_RATE_LIMITERS = {
    "login": RateLimiter(max_requests=5, window_seconds=300),  # 5 per 5 minutes
    "register": RateLimiter(max_requests=3, window_seconds=300),  # 3 per 5 minutes  
    "password_reset": RateLimiter(max_requests=3, window_seconds=3600),  # 3 per hour
    "email_verification": RateLimiter(max_requests=5, window_seconds=3600),  # 5 per hour
    "oauth": RateLimiter(max_requests=10, window_seconds=300),  # 10 per 5 minutes
}


async def get_rate_limiter(limiter_type: str = "default") -> RateLimiter:
    """Get rate limiter by type"""
    return AUTH_RATE_LIMITERS.get(limiter_type, RateLimiter())


async def rate_limit_key_generator(
    endpoint: str,
    ip_address: str,
    user_id: str = None,
    additional: str = None
) -> str:
    """Generate consistent rate limit keys"""
    
    parts = [endpoint, ip_address]
    
    if user_id:
        parts.append(user_id)
    
    if additional:
        parts.append(additional)
    
    return ":".join(parts)