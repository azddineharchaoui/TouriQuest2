"""
Search service for POI discovery with advanced filtering and ranking
"""

import math
from typing import List, Optional, Tuple, Dict, Any
from datetime import datetime, time
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, text, desc, asc
from geoalchemy2.functions import ST_Distance, ST_GeogFromText

from app.models import POI, OpeningHours
from app.schemas import SearchRequest, POISummary, LocationPoint, PricingInfo
from app.repositories.poi_repository import POIRepository


class SearchService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.poi_repo = POIRepository(db)

    async def search_pois(self, search_request: SearchRequest) -> Tuple[List[POI], int]:
        """
        Execute advanced POI search with all filters and ranking
        """
        # Use repository for basic search
        pois, total_count = await self.poi_repo.search_pois(search_request)
        
        # Apply additional filters not handled in repository
        if search_request.filters:
            if search_request.filters.open_now:
                pois = await self._filter_by_opening_hours(pois)
        
        return pois, total_count

    async def convert_to_summary(self, poi: POI, user_location: Optional[LocationPoint] = None) -> POISummary:
        """
        Convert POI model to summary format with calculated fields
        """
        # Extract location coordinates from geography
        location_dict = await self._extract_location_coordinates(poi)
        
        # Calculate distance if user location provided
        distance_km = None
        if user_location and location_dict:
            distance_km = self._calculate_distance(
                user_location.latitude, user_location.longitude,
                location_dict['latitude'], location_dict['longitude']
            )
        
        # Get primary image
        primary_image_url = None
        if poi.images:
            primary_images = [img for img in poi.images if img.is_primary]
            if primary_images:
                primary_image_url = primary_images[0].url
            elif poi.images:
                primary_image_url = poi.images[0].url
        
        # Build pricing info
        pricing = None
        if poi.entry_fee_adult or poi.entry_fee_child or poi.entry_fee_senior or poi.entry_fee_student:
            pricing = PricingInfo(
                adult=poi.entry_fee_adult,
                child=poi.entry_fee_child,
                senior=poi.entry_fee_senior,
                student=poi.entry_fee_student,
                currency=poi.currency
            )
        
        return POISummary(
            id=poi.id,
            name=poi.name,
            category=poi.category,
            location=location_dict,
            average_rating=poi.average_rating,
            review_count=poi.review_count,
            distance_km=distance_km,
            primary_image_url=primary_image_url,
            short_description=poi.short_description,
            is_free=poi.is_free,
            estimated_visit_duration=poi.estimated_visit_duration,
            pricing=pricing
        )

    async def get_search_suggestions(self, query: str, limit: int = 10) -> List[str]:
        """
        Get search suggestions based on partial query
        """
        if not query or len(query) < 2:
            return []
        
        # Search in POI names and descriptions
        search_query = f"%{query.lower()}%"
        
        poi_suggestions = await self.db.execute(
            select(POI.name)
            .where(
                and_(
                    POI.is_active == True,
                    or_(
                        POI.name.ilike(search_query),
                        POI.short_description.ilike(search_query)
                    )
                )
            )
            .distinct()
            .limit(limit)
        )
        
        suggestions = [row[0] for row in poi_suggestions]
        return suggestions

    async def get_popular_searches(self) -> List[str]:
        """
        Get popular search terms based on interaction data
        """
        # This would typically come from search analytics
        # For now, return common search terms
        return [
            "museums", "restaurants", "parks", "historical sites",
            "shopping", "entertainment", "cultural sites", "nature",
            "family activities", "free attractions"
        ]

    async def _filter_by_opening_hours(self, pois: List[POI]) -> List[POI]:
        """
        Filter POIs by current opening hours
        """
        current_time = datetime.utcnow()
        current_day = current_time.weekday()  # 0=Monday, 6=Sunday
        current_hour_minute = current_time.time()
        
        filtered_pois = []
        
        for poi in pois:
            is_open = await self._is_poi_open_now(poi.id, current_day, current_hour_minute)
            if is_open:
                filtered_pois.append(poi)
        
        return filtered_pois

    async def _is_poi_open_now(self, poi_id, day_of_week: int, current_time: time) -> bool:
        """
        Check if POI is currently open
        """
        opening_hours = await self.db.execute(
            select(OpeningHours)
            .where(
                and_(
                    OpeningHours.poi_id == poi_id,
                    OpeningHours.day_of_week == day_of_week
                )
            )
        )
        
        hours = opening_hours.scalar_one_or_none()
        if not hours:
            return False  # No hours defined, assume closed
        
        if hours.is_closed:
            return False
        
        if hours.is_24_hours:
            return True
        
        if not hours.opens_at or not hours.closes_at:
            return False
        
        # Parse time strings
        try:
            opens_time = datetime.strptime(hours.opens_at, "%H:%M").time()
            closes_time = datetime.strptime(hours.closes_at, "%H:%M").time()
            
            # Handle overnight hours (e.g., 22:00 - 02:00)
            if closes_time < opens_time:
                # Open overnight
                return current_time >= opens_time or current_time <= closes_time
            else:
                # Regular hours
                return opens_time <= current_time <= closes_time
                
        except ValueError:
            return False  # Invalid time format

    async def _extract_location_coordinates(self, poi: POI) -> Optional[Dict[str, float]]:
        """
        Extract latitude and longitude from PostGIS geography field
        """
        if not poi.location:
            return None
        
        try:
            # Query to extract coordinates from geography
            result = await self.db.execute(
                text(
                    "SELECT ST_Y(ST_GeogPoint(pois.location)) as latitude, "
                    "ST_X(ST_GeogPoint(pois.location)) as longitude "
                    "FROM pois WHERE id = :poi_id"
                ),
                {"poi_id": poi.id}
            )
            
            row = result.fetchone()
            if row:
                return {
                    "latitude": float(row.latitude),
                    "longitude": float(row.longitude)
                }
        except Exception:
            pass
        
        return None

    def _calculate_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Calculate distance between two points using Haversine formula
        Returns distance in kilometers
        """
        # Convert latitude and longitude from degrees to radians
        lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
        
        # Haversine formula
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        
        # Radius of earth in kilometers
        r = 6371
        
        return round(c * r, 2)

    async def get_search_analytics(self, poi_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Get search analytics data
        """
        analytics = {
            "total_searches": 0,
            "popular_terms": [],
            "category_distribution": {},
            "location_hotspots": []
        }
        
        # This would typically query search logs
        # For now, return mock data
        return analytics