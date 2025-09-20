"""
Redis utilities and caching for TouriQuest microservices.
"""
from typing import Optional, Any, Dict
import json
import redis.asyncio as redis
from functools import lru_cache
import logging

logger = logging.getLogger(__name__)


class RedisManager:
    """Redis connection and operations manager."""
    
    def __init__(self, redis_url: str):
        self.redis_url = redis_url
        self.redis_client: Optional[redis.Redis] = None
    
    async def connect(self):
        """Connect to Redis."""
        self.redis_client = redis.from_url(
            self.redis_url,
            encoding="utf-8",
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=5,
            retry_on_timeout=True,
            health_check_interval=30,
        )
    
    async def disconnect(self):
        """Disconnect from Redis."""
        if self.redis_client:
            await self.redis_client.close()
    
    async def set(
        self, 
        key: str, 
        value: Any, 
        expire: Optional[int] = None,
        serialize: bool = True
    ) -> bool:
        """Set value in Redis."""
        try:
            if serialize and not isinstance(value, str):
                value = json.dumps(value)
            
            if expire:
                await self.redis_client.setex(key, expire, value)
            else:
                await self.redis_client.set(key, value)
            return True
        except Exception as e:
            logger.error(f"Redis set error for key {key}: {e}")
            return False
    
    async def get(self, key: str, deserialize: bool = True) -> Optional[Any]:
        """Get value from Redis."""
        try:
            value = await self.redis_client.get(key)
            if value is None:
                return None
            
            if deserialize:
                try:
                    return json.loads(value)
                except (json.JSONDecodeError, TypeError):
                    return value
            return value
        except Exception as e:
            logger.error(f"Redis get error for key {key}: {e}")
            return None
    
    async def delete(self, key: str) -> bool:
        """Delete key from Redis."""
        try:
            result = await self.redis_client.delete(key)
            return result > 0
        except Exception as e:
            logger.error(f"Redis delete error for key {key}: {e}")
            return False
    
    async def exists(self, key: str) -> bool:
        """Check if key exists in Redis."""
        try:
            return await self.redis_client.exists(key) > 0
        except Exception as e:
            logger.error(f"Redis exists error for key {key}: {e}")
            return False
    
    async def expire(self, key: str, seconds: int) -> bool:
        """Set expiration for key."""
        try:
            return await self.redis_client.expire(key, seconds)
        except Exception as e:
            logger.error(f"Redis expire error for key {key}: {e}")
            return False
    
    async def hset(self, name: str, key: str, value: Any) -> bool:
        """Set hash field."""
        try:
            if not isinstance(value, str):
                value = json.dumps(value)
            await self.redis_client.hset(name, key, value)
            return True
        except Exception as e:
            logger.error(f"Redis hset error for {name}:{key}: {e}")
            return False
    
    async def hget(self, name: str, key: str) -> Optional[Any]:
        """Get hash field."""
        try:
            value = await self.redis_client.hget(name, key)
            if value is None:
                return None
            try:
                return json.loads(value)
            except (json.JSONDecodeError, TypeError):
                return value
        except Exception as e:
            logger.error(f"Redis hget error for {name}:{key}: {e}")
            return None
    
    async def hdel(self, name: str, *keys: str) -> int:
        """Delete hash fields."""
        try:
            return await self.redis_client.hdel(name, *keys)
        except Exception as e:
            logger.error(f"Redis hdel error for {name}: {e}")
            return 0
    
    async def health_check(self) -> bool:
        """Check Redis health."""
        try:
            await self.redis_client.ping()
            return True
        except Exception as e:
            logger.error(f"Redis health check failed: {e}")
            return False


@lru_cache()
def get_redis_manager(redis_url: str) -> RedisManager:
    """Get cached Redis manager instance."""
    return RedisManager(redis_url)


class CacheService:
    """High-level caching service."""
    
    def __init__(self, redis_manager: RedisManager, default_ttl: int = 3600):
        self.redis = redis_manager
        self.default_ttl = default_ttl
    
    async def cache_user_data(self, user_id: int, data: Dict[str, Any], ttl: Optional[int] = None) -> bool:
        """Cache user data."""
        key = f"user:{user_id}"
        return await self.redis.set(key, data, expire=ttl or self.default_ttl)
    
    async def get_user_data(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Get cached user data."""
        key = f"user:{user_id}"
        return await self.redis.get(key)
    
    async def cache_search_results(
        self, 
        search_hash: str, 
        results: list, 
        ttl: int = 300
    ) -> bool:
        """Cache search results."""
        key = f"search:{search_hash}"
        return await self.redis.set(key, results, expire=ttl)
    
    async def get_search_results(self, search_hash: str) -> Optional[list]:
        """Get cached search results."""
        key = f"search:{search_hash}"
        return await self.redis.get(key)
    
    async def invalidate_user_cache(self, user_id: int) -> bool:
        """Invalidate user cache."""
        key = f"user:{user_id}"
        return await self.redis.delete(key)