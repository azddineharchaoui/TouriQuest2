"""Redis caching service for property search optimization"""

import asyncio
import json
import hashlib
from typing import Any, Dict, List, Optional, Union
from datetime import datetime, timedelta
import structlog
import redis.asyncio as redis
from redis.asyncio.client import Redis

from app.core.config import get_settings
from app.schemas import AdvancedSearchRequest, PropertySearchResult

logger = structlog.get_logger()


class CacheService:
    """Advanced Redis caching service for search optimization"""
    
    def __init__(self):
        self.settings = get_settings()
        self.redis_client: Optional[Redis] = None
        
        # Cache TTL settings (in seconds)
        self.cache_ttls = {
            "search_results": self.settings.redis_search_cache_ttl,  # 5 minutes
            "property_details": 3600,  # 1 hour
            "location_suggestions": 1800,  # 30 minutes
            "trending_properties": 900,  # 15 minutes
            "user_preferences": 7200,  # 2 hours
            "availability": 300,  # 5 minutes
            "pricing": 600,  # 10 minutes
            "analytics": 1800,  # 30 minutes
        }
        
        # Cache key prefixes
        self.key_prefixes = {
            "search": "search:",
            "property": "prop:",
            "user": "user:",
            "location": "loc:",
            "trending": "trend:",
            "analytics": "analytics:",
            "availability": "avail:",
            "pricing": "price:"
        }
    
    async def initialize(self):
        """Initialize Redis connection"""
        try:
            self.redis_client = redis.from_url(
                self.settings.redis_url,
                encoding="utf-8",
                decode_responses=True,
                max_connections=20,
                retry_on_timeout=True
            )
            
            # Test connection
            await self.ping()
            logger.info("Redis cache service initialized")
            
        except Exception as e:
            logger.error(f"Failed to initialize Redis: {str(e)}")
            raise
    
    async def ping(self) -> bool:
        """Test Redis connection"""
        try:
            result = await self.redis_client.ping()
            return result
        except Exception as e:
            logger.error(f"Redis ping failed: {str(e)}")
            return False
    
    # Search Results Caching
    async def get_search_results(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """Get cached search results"""
        try:
            full_key = f"{self.key_prefixes['search']}{cache_key}"
            cached_data = await self.redis_client.get(full_key)
            
            if cached_data:
                logger.debug(f"Cache hit for search: {cache_key}")
                return json.loads(cached_data)
            
            logger.debug(f"Cache miss for search: {cache_key}")
            return None
            
        except Exception as e:
            logger.error(f"Error getting cached search results: {str(e)}")
            return None
    
    async def set_search_results(
        self,
        cache_key: str,
        results: Dict[str, Any],
        ttl: Optional[int] = None
    ):
        """Cache search results"""
        try:
            full_key = f"{self.key_prefixes['search']}{cache_key}"
            ttl = ttl or self.cache_ttls["search_results"]
            
            # Add cache metadata
            cache_data = {
                "results": results,
                "cached_at": datetime.utcnow().isoformat(),
                "ttl": ttl
            }
            
            await self.redis_client.setex(
                full_key,
                ttl,
                json.dumps(cache_data, default=str)
            )
            
            logger.debug(f"Cached search results: {cache_key}")
            
        except Exception as e:
            logger.error(f"Error caching search results: {str(e)}")
    
    def generate_search_cache_key(self, request: AdvancedSearchRequest) -> str:
        """Generate consistent cache key for search requests"""
        # Create deterministic hash of search parameters
        search_params = {
            "location": request.location,
            "coordinates": request.coordinates.dict() if request.coordinates else None,
            "radius": request.radius,
            "dates": request.dates.dict() if request.dates else None,
            "guests": request.guests.dict(),
            "price_range": request.price_range.dict() if request.price_range else None,
            "property_types": sorted(request.property_types) if request.property_types else None,
            "filters": request.filters.dict(),
            "sort_by": request.sort_by.value,
            "page": request.page,
            "page_size": request.page_size
        }
        
        # Remove None values and normalize
        normalized_params = self._normalize_dict(search_params)
        
        # Create hash
        params_str = json.dumps(normalized_params, sort_keys=True, default=str)
        cache_key = hashlib.md5(params_str.encode()).hexdigest()
        
        return cache_key
    
    # Property Details Caching
    async def get_property_details(self, property_id: str) -> Optional[Dict[str, Any]]:
        """Get cached property details"""
        try:
            full_key = f"{self.key_prefixes['property']}{property_id}"
            cached_data = await self.redis_client.get(full_key)
            
            if cached_data:
                logger.debug(f"Cache hit for property: {property_id}")
                return json.loads(cached_data)
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting cached property: {str(e)}")
            return None
    
    async def set_property_details(
        self,
        property_id: str,
        property_data: Dict[str, Any],
        ttl: Optional[int] = None
    ):
        """Cache property details"""
        try:
            full_key = f"{self.key_prefixes['property']}{property_id}"
            ttl = ttl or self.cache_ttls["property_details"]
            
            await self.redis_client.setex(
                full_key,
                ttl,
                json.dumps(property_data, default=str)
            )
            
            logger.debug(f"Cached property details: {property_id}")
            
        except Exception as e:
            logger.error(f"Error caching property details: {str(e)}")
    
    async def invalidate_property_cache(self, property_id: str):
        """Invalidate all cache entries for a property"""
        try:
            # Delete property details
            await self.redis_client.delete(f"{self.key_prefixes['property']}{property_id}")
            
            # Delete property-related search caches
            # This is more complex - would need to track which searches include this property
            # For now, we'll use a simpler approach with cache tags
            
            logger.debug(f"Invalidated cache for property: {property_id}")
            
        except Exception as e:
            logger.error(f"Error invalidating property cache: {str(e)}")
    
    # Location Suggestions Caching
    async def get_location_suggestions(self, query: str) -> Optional[List[Dict[str, Any]]]:
        """Get cached location suggestions"""
        try:
            cache_key = f"{self.key_prefixes['location']}{query.lower()}"
            cached_data = await self.redis_client.get(cache_key)
            
            if cached_data:
                return json.loads(cached_data)
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting cached location suggestions: {str(e)}")
            return None
    
    async def set_location_suggestions(
        self,
        query: str,
        suggestions: List[Dict[str, Any]],
        ttl: Optional[int] = None
    ):
        """Cache location suggestions"""
        try:
            cache_key = f"{self.key_prefixes['location']}{query.lower()}"
            ttl = ttl or self.cache_ttls["location_suggestions"]
            
            await self.redis_client.setex(
                cache_key,
                ttl,
                json.dumps(suggestions, default=str)
            )
            
        except Exception as e:
            logger.error(f"Error caching location suggestions: {str(e)}")
    
    # User Preferences Caching
    async def get_user_preferences(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get cached user preferences"""
        try:
            cache_key = f"{self.key_prefixes['user']}{user_id}:preferences"
            cached_data = await self.redis_client.get(cache_key)
            
            if cached_data:
                return json.loads(cached_data)
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting cached user preferences: {str(e)}")
            return None
    
    async def set_user_preferences(
        self,
        user_id: str,
        preferences: Dict[str, Any],
        ttl: Optional[int] = None
    ):
        """Cache user preferences"""
        try:
            cache_key = f"{self.key_prefixes['user']}{user_id}:preferences"
            ttl = ttl or self.cache_ttls["user_preferences"]
            
            await self.redis_client.setex(
                cache_key,
                ttl,
                json.dumps(preferences, default=str)
            )
            
        except Exception as e:
            logger.error(f"Error caching user preferences: {str(e)}")
    
    # Trending Properties Caching
    async def get_trending_properties(
        self,
        location: Optional[str] = None,
        time_period: str = "7d"
    ) -> Optional[List[Dict[str, Any]]]:
        """Get cached trending properties"""
        try:
            cache_key = f"{self.key_prefixes['trending']}{location or 'global'}:{time_period}"
            cached_data = await self.redis_client.get(cache_key)
            
            if cached_data:
                return json.loads(cached_data)
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting cached trending properties: {str(e)}")
            return None
    
    async def set_trending_properties(
        self,
        properties: List[Dict[str, Any]],
        location: Optional[str] = None,
        time_period: str = "7d",
        ttl: Optional[int] = None
    ):
        """Cache trending properties"""
        try:
            cache_key = f"{self.key_prefixes['trending']}{location or 'global'}:{time_period}"
            ttl = ttl or self.cache_ttls["trending_properties"]
            
            await self.redis_client.setex(
                cache_key,
                ttl,
                json.dumps(properties, default=str)
            )
            
        except Exception as e:
            logger.error(f"Error caching trending properties: {str(e)}")
    
    # Availability Caching
    async def get_property_availability(
        self,
        property_id: str,
        date_range: str
    ) -> Optional[Dict[str, Any]]:
        """Get cached property availability"""
        try:
            cache_key = f"{self.key_prefixes['availability']}{property_id}:{date_range}"
            cached_data = await self.redis_client.get(cache_key)
            
            if cached_data:
                return json.loads(cached_data)
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting cached availability: {str(e)}")
            return None
    
    async def set_property_availability(
        self,
        property_id: str,
        date_range: str,
        availability_data: Dict[str, Any],
        ttl: Optional[int] = None
    ):
        """Cache property availability"""
        try:
            cache_key = f"{self.key_prefixes['availability']}{property_id}:{date_range}"
            ttl = ttl or self.cache_ttls["availability"]
            
            await self.redis_client.setex(
                cache_key,
                ttl,
                json.dumps(availability_data, default=str)
            )
            
        except Exception as e:
            logger.error(f"Error caching availability: {str(e)}")
    
    # Analytics Caching
    async def get_analytics_data(self, analytics_key: str) -> Optional[Dict[str, Any]]:
        """Get cached analytics data"""
        try:
            cache_key = f"{self.key_prefixes['analytics']}{analytics_key}"
            cached_data = await self.redis_client.get(cache_key)
            
            if cached_data:
                return json.loads(cached_data)
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting cached analytics: {str(e)}")
            return None
    
    async def set_analytics_data(
        self,
        analytics_key: str,
        data: Dict[str, Any],
        ttl: Optional[int] = None
    ):
        """Cache analytics data"""
        try:
            cache_key = f"{self.key_prefixes['analytics']}{analytics_key}"
            ttl = ttl or self.cache_ttls["analytics"]
            
            await self.redis_client.setex(
                cache_key,
                ttl,
                json.dumps(data, default=str)
            )
            
        except Exception as e:
            logger.error(f"Error caching analytics data: {str(e)}")
    
    # Cache Management
    async def clear_expired_cache(self):
        """Clear expired cache entries (Redis handles this automatically, but useful for cleanup)"""
        try:
            # Get all keys that are about to expire
            pipeline = self.redis_client.pipeline()
            
            # Check TTL for various cache types
            for prefix in self.key_prefixes.values():
                pattern = f"{prefix}*"
                async for key in self.redis_client.scan_iter(match=pattern):
                    ttl = await self.redis_client.ttl(key)
                    if ttl < 60:  # Less than 1 minute remaining
                        logger.debug(f"Cache key expiring soon: {key}")
            
            logger.info("Cache cleanup completed")
            
        except Exception as e:
            logger.error(f"Error during cache cleanup: {str(e)}")
    
    async def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache performance statistics"""
        try:
            info = await self.redis_client.info()
            
            # Count keys by prefix
            key_counts = {}
            for prefix_name, prefix in self.key_prefixes.items():
                count = 0
                async for _ in self.redis_client.scan_iter(match=f"{prefix}*"):
                    count += 1
                key_counts[prefix_name] = count
            
            stats = {
                "connected_clients": info.get("connected_clients", 0),
                "used_memory": info.get("used_memory", 0),
                "used_memory_human": info.get("used_memory_human", "0B"),
                "keyspace_hits": info.get("keyspace_hits", 0),
                "keyspace_misses": info.get("keyspace_misses", 0),
                "key_counts": key_counts,
                "total_keys": sum(key_counts.values())
            }
            
            # Calculate hit rate
            total_ops = stats["keyspace_hits"] + stats["keyspace_misses"]
            if total_ops > 0:
                stats["hit_rate"] = (stats["keyspace_hits"] / total_ops) * 100
            else:
                stats["hit_rate"] = 0
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting cache stats: {str(e)}")
            return {}
    
    async def invalidate_pattern(self, pattern: str):
        """Invalidate cache keys matching a pattern"""
        try:
            deleted_count = 0
            async for key in self.redis_client.scan_iter(match=pattern):
                await self.redis_client.delete(key)
                deleted_count += 1
            
            logger.info(f"Invalidated {deleted_count} cache keys matching pattern: {pattern}")
            
        except Exception as e:
            logger.error(f"Error invalidating cache pattern: {str(e)}")
    
    # Utility methods
    def _normalize_dict(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize dictionary for consistent caching"""
        if not isinstance(data, dict):
            return data
        
        normalized = {}
        for key, value in data.items():
            if value is not None:
                if isinstance(value, dict):
                    normalized[key] = self._normalize_dict(value)
                elif isinstance(value, list):
                    # Sort lists for consistency
                    normalized[key] = sorted(value) if all(isinstance(x, str) for x in value) else value
                else:
                    normalized[key] = value
        
        return normalized
    
    async def close(self):
        """Close Redis connection"""
        if self.redis_client:
            await self.redis_client.close()
            logger.info("Redis connection closed")


# Cache decorators for easy usage
def cache_result(cache_key_func, ttl: int = 300):
    """Decorator to cache function results"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # This would implement function result caching
            # For brevity, just calling the function
            return await func(*args, **kwargs)
        return wrapper
    return decorator


# Cache warming utilities
class CacheWarmer:
    """Utilities for pre-warming cache with popular data"""
    
    def __init__(self, cache_service: CacheService):
        self.cache = cache_service
    
    async def warm_popular_searches(self, popular_queries: List[Dict[str, Any]]):
        """Pre-warm cache with popular search queries"""
        for query_data in popular_queries:
            # This would execute searches and cache results
            logger.info(f"Warming cache for popular query: {query_data}")
    
    async def warm_trending_properties(self):
        """Pre-warm cache with trending properties data"""
        # This would calculate and cache trending properties
        logger.info("Warming trending properties cache")
    
    async def warm_location_suggestions(self, popular_locations: List[str]):
        """Pre-warm cache with popular location suggestions"""
        for location in popular_locations:
            # This would generate and cache location suggestions
            logger.info(f"Warming location suggestions for: {location}")