"""Core property search service with Elasticsearch integration"""

from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, date, timedelta
from decimal import Decimal
import asyncio
import json
import uuid
import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, text
from sqlalchemy.orm import selectinload
from elasticsearch import AsyncElasticsearch
from geopy.distance import geodesic

from app.models import Property, PropertyAmenity, Amenity, PropertyAvailability, SearchQuery, SearchSession
from app.schemas import (
    BasicSearchRequest, AdvancedSearchRequest, PropertySearchResult, 
    PropertySearchResponse, Coordinates, PaginationMeta, SearchMetadata
)
from app.core.config import get_settings
from app.services.elasticsearch_service import ElasticsearchService
from app.services.ranking_service import RankingService
from app.services.cache_service import CacheService
from app.services.analytics_service import AnalyticsService

logger = structlog.get_logger()


class PropertySearchService:
    """Advanced property search service with Elasticsearch and intelligent ranking"""
    
    def __init__(
        self,
        elasticsearch_service: ElasticsearchService,
        ranking_service: RankingService,
        cache_service: CacheService,
        analytics_service: AnalyticsService
    ):
        self.es = elasticsearch_service
        self.ranking = ranking_service
        self.cache = cache_service
        self.analytics = analytics_service
        self.settings = get_settings()
        
    async def search_properties(
        self,
        request: AdvancedSearchRequest,
        db: AsyncSession,
        user_context: Optional[Dict[str, Any]] = None
    ) -> PropertySearchResponse:
        """
        Execute advanced property search with multiple search strategies
        """
        search_start = datetime.utcnow()
        
        try:
            # Generate unique query ID for tracking
            query_id = uuid.uuid4()
            
            # Create search session and query tracking
            search_session = await self._create_search_session(db, request, user_context)
            search_query = await self._create_search_query(db, search_session.id, request, query_id)
            
            # Check cache first for similar searches
            cache_key = self._generate_cache_key(request)
            cached_results = await self.cache.get_search_results(cache_key)
            
            if cached_results and not request.enable_personalization:
                logger.info("Returning cached search results", query_id=str(query_id))
                return await self._build_response_from_cache(cached_results, request, search_query)
            
            # Execute multi-stage search
            search_results = await self._execute_multi_stage_search(request, db, user_context)
            
            # Apply ranking and personalization
            ranked_results = await self.ranking.rank_results(
                search_results, request, user_context
            )
            
            # Apply pagination
            paginated_results = self._apply_pagination(ranked_results, request)
            
            # Convert to response format
            property_results = await self._convert_to_search_results(
                paginated_results, request, db
            )
            
            # Build search metadata
            execution_time = (datetime.utcnow() - search_start).total_seconds() * 1000
            metadata = await self._build_search_metadata(
                query_id, execution_time, len(search_results), request, user_context
            )
            
            # Build pagination metadata
            pagination = self._build_pagination_metadata(
                len(search_results), request.page, request.page_size
            )
            
            # Cache results for future use
            await self.cache.set_search_results(
                cache_key, {
                    "results": [r.dict() for r in property_results],
                    "total_count": len(search_results),
                    "metadata": metadata.dict()
                }
            )
            
            # Track analytics
            await self.analytics.track_search_execution(
                search_query, len(search_results), execution_time, property_results
            )
            
            # Update search query with results
            await self._update_search_query_results(db, search_query.id, len(search_results), execution_time)
            
            response = PropertySearchResponse(
                results=property_results,
                pagination=pagination,
                metadata=metadata,
                price_range=await self._calculate_price_range(search_results),
                property_types_count=await self._calculate_property_types_distribution(search_results),
                average_rating=await self._calculate_average_rating(search_results)
            )
            
            logger.info(
                "Search completed successfully",
                query_id=str(query_id),
                results_count=len(property_results),
                execution_time_ms=execution_time
            )
            
            return response
            
        except Exception as e:
            logger.error("Search execution failed", error=str(e), query_id=str(query_id))
            raise
    
    async def _execute_multi_stage_search(
        self,
        request: AdvancedSearchRequest,
        db: AsyncSession,
        user_context: Optional[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Execute multi-stage search combining Elasticsearch and database queries
        """
        # Stage 1: Elasticsearch for text and location search
        es_results = await self._elasticsearch_search(request)
        
        # Stage 2: Database filters for complex relationships
        db_filtered_results = await self._database_filter_search(request, db, es_results)
        
        # Stage 3: Availability checking
        availability_filtered = await self._filter_by_availability(request, db_filtered_results, db)
        
        # Stage 4: Apply advanced filters
        final_results = await self._apply_advanced_filters(request, availability_filtered, db)
        
        return final_results
    
    async def _elasticsearch_search(self, request: AdvancedSearchRequest) -> List[Dict[str, Any]]:
        """
        Execute Elasticsearch search for text and geospatial queries
        """
        query_body = await self._build_elasticsearch_query(request)
        
        try:
            response = await self.es.search(
                index=self.settings.elasticsearch_index_properties,
                body=query_body,
                size=self.settings.search_max_results,
                _source_includes=[
                    "property_id", "title", "description", "location", "property_type",
                    "max_guests", "base_price", "overall_rating", "amenity_ids"
                ]
            )
            
            results = []
            for hit in response["hits"]["hits"]:
                result = hit["_source"]
                result["_score"] = hit["_score"]
                result["_es_rank"] = len(results) + 1
                results.append(result)
            
            logger.info(f"Elasticsearch returned {len(results)} results")
            return results
            
        except Exception as e:
            logger.error(f"Elasticsearch search failed: {str(e)}")
            # Fallback to database-only search
            return await self._fallback_database_search(request)
    
    async def _build_elasticsearch_query(self, request: AdvancedSearchRequest) -> Dict[str, Any]:
        """
        Build comprehensive Elasticsearch query with all filters
        """
        query = {
            "query": {
                "bool": {
                    "must": [],
                    "filter": [],
                    "should": [],
                    "must_not": []
                }
            },
            "sort": [],
            "aggs": {
                "price_stats": {"stats": {"field": "base_price"}},
                "property_types": {"terms": {"field": "property_type", "size": 20}},
                "rating_avg": {"avg": {"field": "overall_rating"}}
            }
        }
        
        # Text search
        if request.location:
            query["query"]["bool"]["must"].append({
                "multi_match": {
                    "query": request.location,
                    "fields": ["title^2", "description", "address", "city^3", "neighborhood"],
                    "type": "best_fields",
                    "fuzziness": "AUTO"
                }
            })
        
        # Geospatial search
        if request.coordinates:
            query["query"]["bool"]["filter"].append({
                "geo_distance": {
                    "distance": f"{request.radius}km",
                    "location": {
                        "lat": request.coordinates.latitude,
                        "lon": request.coordinates.longitude
                    }
                }
            })
            
            # Add distance sorting for geo queries
            query["sort"].append({
                "_geo_distance": {
                    "location": {
                        "lat": request.coordinates.latitude,
                        "lon": request.coordinates.longitude
                    },
                    "order": "asc",
                    "unit": "km"
                }
            })
        
        # Guest capacity filter
        query["query"]["bool"]["filter"].append({
            "range": {"max_guests": {"gte": request.guests.total_guests}}
        })
        
        # Price range filter
        if request.price_range:
            price_filter = {"range": {"base_price": {}}}
            if request.price_range.min_price:
                price_filter["range"]["base_price"]["gte"] = float(request.price_range.min_price)
            if request.price_range.max_price:
                price_filter["range"]["base_price"]["lte"] = float(request.price_range.max_price)
            query["query"]["bool"]["filter"].append(price_filter)
        
        # Property type filter
        if request.property_types:
            query["query"]["bool"]["filter"].append({
                "terms": {"property_type": [pt.value for pt in request.property_types]}
            })
        
        # Advanced filters
        if request.filters:
            await self._add_advanced_filters_to_query(query, request.filters)
        
        # Sorting
        self._add_sorting_to_query(query, request.sort_by)
        
        return query
    
    async def _add_advanced_filters_to_query(self, query: Dict[str, Any], filters: Any):
        """Add advanced filters to Elasticsearch query"""
        
        # Rating filter
        if filters.min_rating:
            query["query"]["bool"]["filter"].append({
                "range": {"overall_rating": {"gte": filters.min_rating}}
            })
        
        # Review count filter
        if filters.min_reviews:
            query["query"]["bool"]["filter"].append({
                "range": {"review_count": {"gte": filters.min_reviews}}
            })
        
        # Instant book filter
        if filters.instant_book_only:
            query["query"]["bool"]["filter"].append({
                "term": {"booking_type": "instant_book"}
            })
        
        # Host verified filter
        if filters.host_verified_only:
            query["query"]["bool"]["filter"].append({
                "term": {"host_verified": True}
            })
        
        # Eco-friendly filter
        if filters.eco_friendly_only:
            query["query"]["bool"]["filter"].append({
                "term": {"eco_friendly": True}
            })
        
        # Pet policy filter
        if filters.pets_allowed is not None:
            query["query"]["bool"]["filter"].append({
                "term": {"pets_allowed": filters.pets_allowed}
            })
        
        # Smoking policy filter
        if filters.smoking_allowed is not None:
            query["query"]["bool"]["filter"].append({
                "term": {"smoking_allowed": filters.smoking_allowed}
            })
        
        # Accessibility filter
        if filters.accessible_only:
            query["query"]["bool"]["filter"].append({
                "exists": {"field": "accessibility_features"}
            })
        
        # Bedroom filter
        if filters.min_bedrooms:
            query["query"]["bool"]["filter"].append({
                "range": {"bedrooms": {"gte": filters.min_bedrooms}}
            })
        
        # Bathroom filter
        if filters.min_bathrooms:
            query["query"]["bool"]["filter"].append({
                "range": {"bathrooms": {"gte": filters.min_bathrooms}}
            })
        
        # Amenity filters
        if filters.required_amenities:
            for amenity_id in filters.required_amenities:
                query["query"]["bool"]["filter"].append({
                    "term": {"amenity_ids": amenity_id}
                })
    
    def _add_sorting_to_query(self, query: Dict[str, Any], sort_by: str):
        """Add sorting to Elasticsearch query"""
        
        if sort_by == "price_asc":
            query["sort"].append({"base_price": {"order": "asc"}})
        elif sort_by == "price_desc":
            query["sort"].append({"base_price": {"order": "desc"}})
        elif sort_by == "rating_desc":
            query["sort"].append({"overall_rating": {"order": "desc"}})
        elif sort_by == "newest":
            query["sort"].append({"created_at": {"order": "desc"}})
        elif sort_by == "most_reviewed":
            query["sort"].append({"review_count": {"order": "desc"}})
        elif sort_by == "popular":
            query["sort"].append({"popularity_score": {"order": "desc"}})
        else:  # relevance (default)
            query["sort"].append({"_score": {"order": "desc"}})
        
        # Always add a secondary sort for consistency
        query["sort"].append({"_id": {"order": "asc"}})
    
    async def _database_filter_search(
        self,
        request: AdvancedSearchRequest,
        db: AsyncSession,
        es_results: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Apply database-specific filters that can't be done in Elasticsearch
        """
        if not es_results:
            return []
        
        # Extract property IDs from Elasticsearch results
        property_ids = [result["property_id"] for result in es_results]
        
        # Build database query with complex filters
        query = select(Property).where(Property.id.in_(property_ids))
        
        # Add complex filters that require database queries
        if request.filters:
            query = await self._add_database_filters(query, request.filters, db)
        
        # Execute query
        result = await db.execute(query)
        properties = result.scalars().all()
        
        # Merge with Elasticsearch results
        property_dict = {str(p.id): p for p in properties}
        filtered_results = []
        
        for es_result in es_results:
            property_id = es_result["property_id"]
            if property_id in property_dict:
                # Merge ES data with DB data
                property_obj = property_dict[property_id]
                es_result.update({
                    "db_property": property_obj,
                    "meets_database_filters": True
                })
                filtered_results.append(es_result)
        
        return filtered_results
    
    async def _add_database_filters(self, query, filters, db: AsyncSession):
        """Add filters that require database joins and complex queries"""
        
        # Host response time filter
        if filters.max_response_time_hours:
            query = query.where(Property.host_response_time_hours <= filters.max_response_time_hours)
        
        # Host response rate filter
        if filters.min_response_rate:
            query = query.where(Property.host_response_rate >= filters.min_response_rate)
        
        # Stay requirements
        if filters.min_stay:
            query = query.where(Property.minimum_stay <= filters.min_stay)
        
        if filters.max_stay:
            query = query.where(Property.maximum_stay >= filters.max_stay)
        
        # Language preferences
        if filters.host_languages:
            for language in filters.host_languages:
                query = query.where(Property.languages_spoken.contains([language]))
        
        # Cancellation policy filter
        if filters.flexible_cancellation:
            query = query.where(Property.cancellation_policy == "flexible")
        
        return query
    
    async def _filter_by_availability(
        self,
        request: AdvancedSearchRequest,
        results: List[Dict[str, Any]],
        db: AsyncSession
    ) -> List[Dict[str, Any]]:
        """
        Filter properties by availability for requested dates
        """
        if not request.dates or not results:
            return results
        
        property_ids = [r["property_id"] for r in results]
        
        # Query availability for all properties in date range
        availability_query = select(PropertyAvailability).where(
            and_(
                PropertyAvailability.property_id.in_(property_ids),
                PropertyAvailability.date >= request.dates.check_in,
                PropertyAvailability.date < request.dates.check_out,
                PropertyAvailability.is_available == False
            )
        )
        
        unavailable_result = await db.execute(availability_query)
        unavailable_dates = unavailable_result.scalars().all()
        
        # Group unavailable dates by property
        unavailable_by_property = {}
        for unavailable in unavailable_dates:
            prop_id = str(unavailable.property_id)
            if prop_id not in unavailable_by_property:
                unavailable_by_property[prop_id] = []
            unavailable_by_property[prop_id].append(unavailable.date.date())
        
        # Filter out properties with any unavailable dates in range
        available_results = []
        for result in results:
            property_id = result["property_id"]
            
            if property_id not in unavailable_by_property:
                result["is_available"] = True
                result["unavailable_dates"] = []
                available_results.append(result)
            else:
                # Check if there are enough consecutive available days
                unavailable_dates_set = set(unavailable_by_property[property_id])
                requested_dates = []
                current_date = request.dates.check_in
                
                while current_date < request.dates.check_out:
                    requested_dates.append(current_date)
                    current_date += timedelta(days=1)
                
                # If any requested date is unavailable, exclude property
                if not any(d in unavailable_dates_set for d in requested_dates):
                    result["is_available"] = True
                    result["unavailable_dates"] = list(unavailable_dates_set)
                    available_results.append(result)
                else:
                    result["is_available"] = False
                    result["unavailable_dates"] = list(unavailable_dates_set)
        
        logger.info(f"Availability filter: {len(available_results)}/{len(results)} properties available")
        return available_results
    
    async def _apply_advanced_filters(
        self,
        request: AdvancedSearchRequest,
        results: List[Dict[str, Any]],
        db: AsyncSession
    ) -> List[Dict[str, Any]]:
        """
        Apply final advanced filters that require property-specific logic
        """
        if not request.filters or not results:
            return results
        
        filtered_results = []
        
        for result in results:
            property_obj = result.get("db_property")
            if not property_obj:
                continue
            
            # Apply remaining filters
            passes_filters = True
            
            # Children welcome filter
            if request.filters.children_welcome is not None:
                if property_obj.children_welcome != request.filters.children_welcome:
                    passes_filters = False
            
            # Check amenity requirements more thoroughly
            if request.filters.required_amenities:
                # Query property amenities
                amenity_query = select(PropertyAmenity.amenity_id).where(
                    PropertyAmenity.property_id == property_obj.id
                )
                amenity_result = await db.execute(amenity_query)
                property_amenity_ids = [row[0] for row in amenity_result.fetchall()]
                
                # Check if all required amenities are present
                for required_amenity in request.filters.required_amenities:
                    if required_amenity not in property_amenity_ids:
                        passes_filters = False
                        break
            
            if passes_filters:
                filtered_results.append(result)
        
        logger.info(f"Advanced filters: {len(filtered_results)}/{len(results)} properties passed")
        return filtered_results
    
    async def _fallback_database_search(self, request: AdvancedSearchRequest) -> List[Dict[str, Any]]:
        """
        Fallback search using only database when Elasticsearch is unavailable
        """
        logger.warning("Using database fallback search")
        
        # This would implement a basic database-only search
        # For brevity, returning empty list - in real implementation,
        # this would use PostGIS for geospatial queries
        return []
    
    def _apply_pagination(self, results: List[Dict[str, Any]], request: AdvancedSearchRequest) -> List[Dict[str, Any]]:
        """Apply pagination to search results"""
        start_idx = (request.page - 1) * request.page_size
        end_idx = start_idx + request.page_size
        return results[start_idx:end_idx]
    
    async def _convert_to_search_results(
        self,
        results: List[Dict[str, Any]],
        request: AdvancedSearchRequest,
        db: AsyncSession
    ) -> List[PropertySearchResult]:
        """Convert internal results to PropertySearchResult objects"""
        property_results = []
        
        for result in results:
            property_obj = result.get("db_property")
            if not property_obj:
                continue
            
            # Build PropertySearchResult
            # This would include all the mapping logic
            # For brevity, creating a minimal example
            search_result = PropertySearchResult(
                id=property_obj.id,
                title=property_obj.title,
                property_type=property_obj.property_type.value,
                # ... other fields would be mapped here
            )
            
            property_results.append(search_result)
        
        return property_results
    
    # Additional helper methods for building responses, cache management, etc.
    # ... (many more methods would be implemented here)
    
    async def _create_search_session(self, db: AsyncSession, request: AdvancedSearchRequest, user_context: Optional[Dict[str, Any]]) -> SearchSession:
        """Create a search session for analytics tracking"""
        # Implementation would create and return SearchSession
        pass
    
    async def _create_search_query(self, db: AsyncSession, session_id: uuid.UUID, request: AdvancedSearchRequest, query_id: uuid.UUID) -> SearchQuery:
        """Create a search query record for analytics"""
        # Implementation would create and return SearchQuery
        pass