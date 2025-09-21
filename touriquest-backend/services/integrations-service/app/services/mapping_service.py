"""
Mapping service integrations (Google Maps and Mapbox)
"""

import asyncio
import logging
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime

import aiohttp
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.integration_models import GeocodeCache
from app.services.base import BaseIntegrationService

logger = logging.getLogger(__name__)


class GoogleMapsService(BaseIntegrationService):
    """Google Maps API integration"""
    
    def __init__(self):
        super().__init__("google_maps")
        self.api_key = settings.GOOGLE_MAPS_API_KEY
        self.base_url = "https://maps.googleapis.com/maps/api"
    
    async def _execute_request(
        self,
        endpoint: str,
        method: str,
        data: Optional[Dict[str, Any]],
        headers: Optional[Dict[str, str]],
        timeout: int
    ) -> Dict[str, Any]:
        """Execute Google Maps API request"""
        url = f"{self.base_url}/{endpoint}"
        
        # Add API key to params
        params = data or {}
        params["key"] = self.api_key
        
        async with aiohttp.ClientSession() as session:
            async with session.request(
                method,
                url,
                params=params if method == "GET" else None,
                json=data if method == "POST" else None,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=timeout)
            ) as response:
                response_data = await response.json()
                
                if response.status != 200:
                    raise Exception(f"API request failed: {response_data}")
                
                return response_data
    
    async def geocode(self, address: str) -> Dict[str, Any]:
        """Geocode an address to coordinates"""
        try:
            # Check cache first
            cached_result = await self._get_cached_geocode(address)
            if cached_result:
                return cached_result
            
            response_data = await self.make_api_request(
                endpoint="geocode/json",
                data={"address": address}
            )
            
            if response_data.get("status") != "OK":
                raise Exception(f"Geocoding failed: {response_data.get('status')}")
            
            results = response_data.get("results", [])
            if not results:
                raise Exception("No results found")
            
            result = results[0]
            location = result["geometry"]["location"]
            
            geocode_result = {
                "latitude": location["lat"],
                "longitude": location["lng"],
                "formatted_address": result["formatted_address"],
                "place_id": result.get("place_id"),
                "types": result.get("types", []),
                "address_components": result.get("address_components", [])
            }
            
            # Cache the result
            await self._cache_geocode(address, geocode_result)
            
            # Record cost
            await self.record_cost(
                cost_type="geocoding",
                amount=0.005,  # $0.005 per request
                quantity=1
            )
            
            return geocode_result
            
        except Exception as e:
            logger.error(f"Geocoding error: {e}")
            raise
    
    async def reverse_geocode(self, latitude: float, longitude: float) -> Dict[str, Any]:
        """Reverse geocode coordinates to address"""
        try:
            response_data = await self.make_api_request(
                endpoint="geocode/json",
                data={"latlng": f"{latitude},{longitude}"}
            )
            
            if response_data.get("status") != "OK":
                raise Exception(f"Reverse geocoding failed: {response_data.get('status')}")
            
            results = response_data.get("results", [])
            if not results:
                raise Exception("No results found")
            
            result = results[0]
            
            # Record cost
            await self.record_cost(
                cost_type="reverse_geocoding",
                amount=0.005,  # $0.005 per request
                quantity=1
            )
            
            return {
                "formatted_address": result["formatted_address"],
                "place_id": result.get("place_id"),
                "types": result.get("types", []),
                "address_components": result.get("address_components", [])
            }
            
        except Exception as e:
            logger.error(f"Reverse geocoding error: {e}")
            raise
    
    async def get_directions(
        self,
        origin: str,
        destination: str,
        mode: str = "driving",
        alternatives: bool = False
    ) -> Dict[str, Any]:
        """Get directions between two locations"""
        try:
            response_data = await self.make_api_request(
                endpoint="directions/json",
                data={
                    "origin": origin,
                    "destination": destination,
                    "mode": mode,
                    "alternatives": alternatives
                }
            )
            
            if response_data.get("status") != "OK":
                raise Exception(f"Directions failed: {response_data.get('status')}")
            
            routes = response_data.get("routes", [])
            if not routes:
                raise Exception("No routes found")
            
            # Record cost
            await self.record_cost(
                cost_type="directions",
                amount=0.005,  # $0.005 per request
                quantity=1
            )
            
            return {
                "routes": routes,
                "available_travel_modes": response_data.get("available_travel_modes", []),
                "status": response_data.get("status")
            }
            
        except Exception as e:
            logger.error(f"Directions error: {e}")
            raise
    
    async def get_distance_matrix(
        self,
        origins: List[str],
        destinations: List[str],
        mode: str = "driving"
    ) -> Dict[str, Any]:
        """Get distance and time between multiple origins and destinations"""
        try:
            response_data = await self.make_api_request(
                endpoint="distancematrix/json",
                data={
                    "origins": "|".join(origins),
                    "destinations": "|".join(destinations),
                    "mode": mode
                }
            )
            
            if response_data.get("status") != "OK":
                raise Exception(f"Distance matrix failed: {response_data.get('status')}")
            
            # Record cost based on matrix size
            element_count = len(origins) * len(destinations)
            await self.record_cost(
                cost_type="distance_matrix",
                amount=0.01 * element_count,  # $0.01 per element
                quantity=element_count
            )
            
            return response_data
            
        except Exception as e:
            logger.error(f"Distance matrix error: {e}")
            raise
    
    async def get_places_nearby(
        self,
        latitude: float,
        longitude: float,
        radius: int = 1000,
        place_type: Optional[str] = None,
        keyword: Optional[str] = None
    ) -> Dict[str, Any]:
        """Search for nearby places"""
        try:
            params = {
                "location": f"{latitude},{longitude}",
                "radius": radius
            }
            
            if place_type:
                params["type"] = place_type
            if keyword:
                params["keyword"] = keyword
            
            response_data = await self.make_api_request(
                endpoint="place/nearbysearch/json",
                data=params
            )
            
            if response_data.get("status") not in ["OK", "ZERO_RESULTS"]:
                raise Exception(f"Nearby search failed: {response_data.get('status')}")
            
            # Record cost
            await self.record_cost(
                cost_type="places_nearby",
                amount=0.032,  # $0.032 per request
                quantity=1
            )
            
            return response_data
            
        except Exception as e:
            logger.error(f"Nearby search error: {e}")
            raise
    
    async def get_place_details(self, place_id: str, fields: Optional[List[str]] = None) -> Dict[str, Any]:
        """Get detailed information about a place"""
        try:
            params = {"place_id": place_id}
            if fields:
                params["fields"] = ",".join(fields)
            
            response_data = await self.make_api_request(
                endpoint="place/details/json",
                data=params
            )
            
            if response_data.get("status") != "OK":
                raise Exception(f"Place details failed: {response_data.get('status')}")
            
            # Record cost based on fields requested
            field_count = len(fields) if fields else 10  # Default field count
            await self.record_cost(
                cost_type="place_details",
                amount=0.017 * max(1, field_count / 10),  # $0.017 per request, adjusted for fields
                quantity=1
            )
            
            return response_data
            
        except Exception as e:
            logger.error(f"Place details error: {e}")
            raise
    
    async def _get_cached_geocode(self, address: str) -> Optional[Dict[str, Any]]:
        """Get cached geocoding result"""
        try:
            async with AsyncSessionLocal() as session:
                stmt = select(GeocodeCache).where(
                    GeocodeCache.address == address,
                    GeocodeCache.provider == "google_maps"
                )
                result = await session.execute(stmt)
                cache_entry = result.scalar_one_or_none()
                
                if cache_entry:
                    return {
                        "latitude": cache_entry.latitude,
                        "longitude": cache_entry.longitude,
                        "formatted_address": cache_entry.formatted_address,
                        "cached": True
                    }
                
                return None
                
        except Exception as e:
            logger.error(f"Error getting cached geocode: {e}")
            return None
    
    async def _cache_geocode(self, address: str, result: Dict[str, Any]):
        """Cache geocoding result"""
        try:
            async with AsyncSessionLocal() as session:
                cache_entry = GeocodeCache(
                    address=address,
                    latitude=result["latitude"],
                    longitude=result["longitude"],
                    formatted_address=result["formatted_address"],
                    provider="google_maps"
                )
                
                session.add(cache_entry)
                await session.commit()
                
        except Exception as e:
            logger.error(f"Error caching geocode: {e}")
    
    async def _perform_health_check(self) -> Dict[str, Any]:
        """Perform Google Maps health check"""
        try:
            # Test with a simple geocoding request
            result = await self.geocode("1600 Amphitheatre Parkway, Mountain View, CA")
            return {
                "geocoding": "available",
                "api_key_valid": True,
                "test_result": result.get("formatted_address")
            }
        except Exception as e:
            return {
                "geocoding": "unavailable",
                "api_key_valid": False,
                "error": str(e)
            }


class MapboxService(BaseIntegrationService):
    """Mapbox API integration"""
    
    def __init__(self):
        super().__init__("mapbox")
        self.access_token = settings.MAPBOX_ACCESS_TOKEN
        self.base_url = "https://api.mapbox.com"
    
    async def _execute_request(
        self,
        endpoint: str,
        method: str,
        data: Optional[Dict[str, Any]],
        headers: Optional[Dict[str, str]],
        timeout: int
    ) -> Dict[str, Any]:
        """Execute Mapbox API request"""
        url = f"{self.base_url}/{endpoint}"
        
        # Add access token to params
        params = data or {}
        params["access_token"] = self.access_token
        
        async with aiohttp.ClientSession() as session:
            async with session.request(
                method,
                url,
                params=params if method == "GET" else None,
                json=data if method == "POST" else None,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=timeout)
            ) as response:
                response_data = await response.json()
                
                if response.status != 200:
                    raise Exception(f"API request failed: {response_data}")
                
                return response_data
    
    async def geocode(self, query: str, country: Optional[str] = None) -> Dict[str, Any]:
        """Geocode using Mapbox"""
        try:
            # Check cache first
            cached_result = await self._get_cached_geocode(query)
            if cached_result:
                return cached_result
            
            params = {}
            if country:
                params["country"] = country
            
            response_data = await self.make_api_request(
                endpoint=f"geocoding/v5/mapbox.places/{query}.json",
                data=params
            )
            
            features = response_data.get("features", [])
            if not features:
                raise Exception("No results found")
            
            feature = features[0]
            coordinates = feature["geometry"]["coordinates"]
            
            geocode_result = {
                "latitude": coordinates[1],
                "longitude": coordinates[0],
                "formatted_address": feature["place_name"],
                "place_type": feature.get("place_type", []),
                "properties": feature.get("properties", {}),
                "context": feature.get("context", [])
            }
            
            # Cache the result
            await self._cache_geocode(query, geocode_result)
            
            # Record cost
            await self.record_cost(
                cost_type="geocoding",
                amount=0.0075,  # $0.0075 per request
                quantity=1
            )
            
            return geocode_result
            
        except Exception as e:
            logger.error(f"Mapbox geocoding error: {e}")
            raise
    
    async def reverse_geocode(self, longitude: float, latitude: float) -> Dict[str, Any]:
        """Reverse geocode using Mapbox"""
        try:
            response_data = await self.make_api_request(
                endpoint=f"geocoding/v5/mapbox.places/{longitude},{latitude}.json"
            )
            
            features = response_data.get("features", [])
            if not features:
                raise Exception("No results found")
            
            feature = features[0]
            
            # Record cost
            await self.record_cost(
                cost_type="reverse_geocoding",
                amount=0.0075,  # $0.0075 per request
                quantity=1
            )
            
            return {
                "formatted_address": feature["place_name"],
                "place_type": feature.get("place_type", []),
                "properties": feature.get("properties", {}),
                "context": feature.get("context", [])
            }
            
        except Exception as e:
            logger.error(f"Mapbox reverse geocoding error: {e}")
            raise
    
    async def get_directions(
        self,
        coordinates: List[Tuple[float, float]],
        profile: str = "driving",
        alternatives: bool = False,
        geometries: str = "geojson"
    ) -> Dict[str, Any]:
        """Get directions using Mapbox"""
        try:
            # Format coordinates
            coords_str = ";".join([f"{lon},{lat}" for lon, lat in coordinates])
            
            params = {
                "alternatives": str(alternatives).lower(),
                "geometries": geometries,
                "overview": "full",
                "steps": "true"
            }
            
            response_data = await self.make_api_request(
                endpoint=f"directions/v5/mapbox/{profile}/{coords_str}",
                data=params
            )
            
            # Record cost
            await self.record_cost(
                cost_type="directions",
                amount=0.005,  # $0.005 per request
                quantity=1
            )
            
            return response_data
            
        except Exception as e:
            logger.error(f"Mapbox directions error: {e}")
            raise
    
    async def get_matrix(
        self,
        coordinates: List[Tuple[float, float]],
        profile: str = "driving",
        sources: Optional[List[int]] = None,
        destinations: Optional[List[int]] = None
    ) -> Dict[str, Any]:
        """Get distance/duration matrix using Mapbox"""
        try:
            # Format coordinates
            coords_str = ";".join([f"{lon},{lat}" for lon, lat in coordinates])
            
            params = {}
            if sources:
                params["sources"] = ";".join(map(str, sources))
            if destinations:
                params["destinations"] = ";".join(map(str, destinations))
            
            response_data = await self.make_api_request(
                endpoint=f"directions-matrix/v1/mapbox/{profile}/{coords_str}",
                data=params
            )
            
            # Record cost based on matrix size
            source_count = len(sources) if sources else len(coordinates)
            dest_count = len(destinations) if destinations else len(coordinates)
            element_count = source_count * dest_count
            
            await self.record_cost(
                cost_type="matrix",
                amount=0.005 * element_count,  # $0.005 per element
                quantity=element_count
            )
            
            return response_data
            
        except Exception as e:
            logger.error(f"Mapbox matrix error: {e}")
            raise
    
    async def optimize_route(
        self,
        coordinates: List[Tuple[float, float]],
        profile: str = "driving",
        roundtrip: bool = True
    ) -> Dict[str, Any]:
        """Optimize route using Mapbox Optimization API"""
        try:
            # Format coordinates
            coords_str = ";".join([f"{lon},{lat}" for lon, lat in coordinates])
            
            params = {
                "roundtrip": str(roundtrip).lower(),
                "source": "first",
                "destination": "last",
                "geometries": "geojson",
                "overview": "full"
            }
            
            response_data = await self.make_api_request(
                endpoint=f"optimized-trips/v1/mapbox/{profile}/{coords_str}",
                data=params
            )
            
            # Record cost based on waypoint count
            waypoint_count = len(coordinates)
            await self.record_cost(
                cost_type="optimization",
                amount=0.05 * waypoint_count,  # $0.05 per waypoint
                quantity=waypoint_count
            )
            
            return response_data
            
        except Exception as e:
            logger.error(f"Mapbox optimization error: {e}")
            raise
    
    async def _get_cached_geocode(self, query: str) -> Optional[Dict[str, Any]]:
        """Get cached geocoding result"""
        try:
            async with AsyncSessionLocal() as session:
                stmt = select(GeocodeCache).where(
                    GeocodeCache.address == query,
                    GeocodeCache.provider == "mapbox"
                )
                result = await session.execute(stmt)
                cache_entry = result.scalar_one_or_none()
                
                if cache_entry:
                    return {
                        "latitude": cache_entry.latitude,
                        "longitude": cache_entry.longitude,
                        "formatted_address": cache_entry.formatted_address,
                        "cached": True
                    }
                
                return None
                
        except Exception as e:
            logger.error(f"Error getting cached geocode: {e}")
            return None
    
    async def _cache_geocode(self, query: str, result: Dict[str, Any]):
        """Cache geocoding result"""
        try:
            async with AsyncSessionLocal() as session:
                cache_entry = GeocodeCache(
                    address=query,
                    latitude=result["latitude"],
                    longitude=result["longitude"],
                    formatted_address=result["formatted_address"],
                    provider="mapbox"
                )
                
                session.add(cache_entry)
                await session.commit()
                
        except Exception as e:
            logger.error(f"Error caching geocode: {e}")
    
    async def _perform_health_check(self) -> Dict[str, Any]:
        """Perform Mapbox health check"""
        try:
            # Test with a simple geocoding request
            result = await self.geocode("San Francisco")
            return {
                "geocoding": "available",
                "access_token_valid": True,
                "test_result": result.get("formatted_address")
            }
        except Exception as e:
            return {
                "geocoding": "unavailable",
                "access_token_valid": False,
                "error": str(e)
            }


class MappingService:
    """Unified mapping service using both Google Maps and Mapbox"""
    
    def __init__(self):
        self.google_maps = GoogleMapsService()
        self.mapbox = MapboxService()
        self.preferred_provider = "google_maps"  # Can be configured
    
    async def initialize(self):
        """Initialize mapping services"""
        await self.google_maps.initialize()
        await self.mapbox.initialize()
    
    async def geocode(self, address: str, provider: Optional[str] = None) -> Dict[str, Any]:
        """Geocode using preferred or specified provider"""
        provider = provider or self.preferred_provider
        
        try:
            if provider == "google_maps":
                return await self.google_maps.geocode(address)
            elif provider == "mapbox":
                return await self.mapbox.geocode(address)
            else:
                raise ValueError(f"Unknown provider: {provider}")
                
        except Exception as e:
            # Fallback to other provider
            logger.warning(f"Primary provider {provider} failed, trying fallback")
            
            if provider == "google_maps":
                return await self.mapbox.geocode(address)
            else:
                return await self.google_maps.geocode(address)
    
    async def get_directions(
        self,
        origin: str,
        destination: str,
        provider: Optional[str] = None,
        mode: str = "driving"
    ) -> Dict[str, Any]:
        """Get directions using preferred or specified provider"""
        provider = provider or self.preferred_provider
        
        try:
            if provider == "google_maps":
                return await self.google_maps.get_directions(origin, destination, mode)
            elif provider == "mapbox":
                # Convert addresses to coordinates for Mapbox
                origin_coords = await self.mapbox.geocode(origin)
                dest_coords = await self.mapbox.geocode(destination)
                
                coordinates = [
                    (origin_coords["longitude"], origin_coords["latitude"]),
                    (dest_coords["longitude"], dest_coords["latitude"])
                ]
                
                return await self.mapbox.get_directions(coordinates, mode)
            else:
                raise ValueError(f"Unknown provider: {provider}")
                
        except Exception as e:
            logger.error(f"Directions error with {provider}: {e}")
            raise
    
    async def health_check(self) -> Dict[str, Any]:
        """Check health of all mapping services"""
        google_health = await self.google_maps.health_check()
        mapbox_health = await self.mapbox.health_check()
        
        return {
            "google_maps": google_health,
            "mapbox": mapbox_health,
            "overall_status": "healthy" if (
                google_health.get("status") == "healthy" or 
                mapbox_health.get("status") == "healthy"
            ) else "unhealthy"
        }