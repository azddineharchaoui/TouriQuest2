"""Elasticsearch service for property search optimization"""

import asyncio
import json
from typing import Dict, Any, List, Optional
from datetime import datetime
import structlog
from elasticsearch import AsyncElasticsearch
from elasticsearch.helpers import async_bulk

from app.core.config import get_settings

logger = structlog.get_logger()


class ElasticsearchService:
    """Service for managing Elasticsearch operations"""
    
    def __init__(self):
        self.settings = get_settings()
        self.client: Optional[AsyncElasticsearch] = None
        
    async def initialize(self):
        """Initialize Elasticsearch client and indexes"""
        try:
            # Initialize client
            if self.settings.elasticsearch_username and self.settings.elasticsearch_password:
                self.client = AsyncElasticsearch(
                    [self.settings.elasticsearch_url],
                    http_auth=(self.settings.elasticsearch_username, self.settings.elasticsearch_password),
                    verify_certs=False,
                    ssl_show_warn=False
                )
            else:
                self.client = AsyncElasticsearch([self.settings.elasticsearch_url])
            
            # Test connection
            await self.client.ping()
            logger.info("Elasticsearch connection established")
            
            # Create indexes if they don't exist
            await self._create_property_index()
            await self._create_search_analytics_index()
            
        except Exception as e:
            logger.error(f"Failed to initialize Elasticsearch: {str(e)}")
            raise
    
    async def _create_property_index(self):
        """Create the main property search index with optimized mappings"""
        index_name = self.settings.elasticsearch_index_properties
        
        # Check if index exists
        exists = await self.client.indices.exists(index=index_name)
        if exists:
            logger.info(f"Property index '{index_name}' already exists")
            return
        
        # Define property index mapping
        mapping = {
            "settings": {
                "number_of_shards": 3,
                "number_of_replicas": 1,
                "analysis": {
                    "analyzer": {
                        "location_analyzer": {
                            "type": "custom",
                            "tokenizer": "standard",
                            "filter": ["lowercase", "ascii_folding", "stop"]
                        },
                        "property_text_analyzer": {
                            "type": "custom", 
                            "tokenizer": "standard",
                            "filter": ["lowercase", "ascii_folding", "stop", "snowball"]
                        }
                    }
                }
            },
            "mappings": {
                "properties": {
                    # Identity
                    "property_id": {"type": "keyword"},
                    "host_id": {"type": "keyword"},
                    
                    # Text fields for search
                    "title": {
                        "type": "text",
                        "analyzer": "property_text_analyzer",
                        "fields": {
                            "keyword": {"type": "keyword"},
                            "suggest": {"type": "completion"}
                        }
                    },
                    "description": {
                        "type": "text",
                        "analyzer": "property_text_analyzer"
                    },
                    
                    # Location fields
                    "address": {
                        "type": "text",
                        "analyzer": "location_analyzer"
                    },
                    "city": {
                        "type": "text",
                        "analyzer": "location_analyzer",
                        "fields": {
                            "keyword": {"type": "keyword"},
                            "suggest": {"type": "completion"}
                        }
                    },
                    "state_province": {
                        "type": "text",
                        "analyzer": "location_analyzer",
                        "fields": {"keyword": {"type": "keyword"}}
                    },
                    "country": {
                        "type": "keyword",
                        "fields": {
                            "suggest": {"type": "completion"}
                        }
                    },
                    "neighborhood": {
                        "type": "text",
                        "analyzer": "location_analyzer",
                        "fields": {"keyword": {"type": "keyword"}}
                    },
                    "location": {"type": "geo_point"},
                    
                    # Property characteristics
                    "property_type": {"type": "keyword"},
                    "max_guests": {"type": "integer"},
                    "bedrooms": {"type": "integer"},
                    "bathrooms": {"type": "float"},
                    "beds": {"type": "integer"},
                    
                    # Pricing
                    "base_price": {"type": "float"},
                    "currency": {"type": "keyword"},
                    "cleaning_fee": {"type": "float"},
                    "total_price": {"type": "float"},  # Calculated for specific searches
                    
                    # Quality metrics
                    "overall_rating": {"type": "float"},
                    "review_count": {"type": "integer"},
                    "cleanliness_rating": {"type": "float"},
                    "communication_rating": {"type": "float"},
                    "location_rating": {"type": "float"},
                    "value_rating": {"type": "float"},
                    
                    # Host information
                    "host_verified": {"type": "boolean"},
                    "host_response_rate": {"type": "float"},
                    "host_response_time_hours": {"type": "integer"},
                    "host_languages": {"type": "keyword"},
                    
                    # Booking settings
                    "booking_type": {"type": "keyword"},
                    "cancellation_policy": {"type": "keyword"},
                    "minimum_stay": {"type": "integer"},
                    "maximum_stay": {"type": "integer"},
                    
                    # Features and amenities
                    "amenity_ids": {"type": "integer"},
                    "amenity_names": {
                        "type": "text",
                        "analyzer": "standard",
                        "fields": {"keyword": {"type": "keyword"}}
                    },
                    "amenity_categories": {"type": "keyword"},
                    
                    # Property features
                    "eco_friendly": {"type": "boolean"},
                    "pets_allowed": {"type": "boolean"},
                    "smoking_allowed": {"type": "boolean"},
                    "children_welcome": {"type": "boolean"},
                    "accessible": {"type": "boolean"},
                    "accessibility_features": {"type": "keyword"},
                    
                    # Dates and availability
                    "created_at": {"type": "date"},
                    "updated_at": {"type": "date"},
                    "last_booked_at": {"type": "date"},
                    
                    # Performance metrics
                    "popularity_score": {"type": "float"},
                    "views_count": {"type": "integer"},
                    "booking_count": {"type": "integer"},
                    "click_through_rate": {"type": "float"},
                    
                    # Search optimization
                    "search_vector": {"type": "text"},
                    "boost_score": {"type": "float"},
                    
                    # Images
                    "primary_image_url": {"type": "keyword"},
                    "image_count": {"type": "integer"},
                    
                    # Dynamic fields for seasonal data
                    "seasonal_pricing": {
                        "type": "nested",
                        "properties": {
                            "season": {"type": "keyword"},
                            "price_multiplier": {"type": "float"},
                            "start_date": {"type": "date"},
                            "end_date": {"type": "date"}
                        }
                    }
                }
            }
        }
        
        await self.client.indices.create(index=index_name, body=mapping)
        logger.info(f"Created property index '{index_name}' with optimized mappings")
    
    async def _create_search_analytics_index(self):
        """Create index for search analytics and A/B testing"""
        index_name = f"{self.settings.elasticsearch_index_properties}_analytics"
        
        exists = await self.client.indices.exists(index=index_name)
        if exists:
            return
        
        mapping = {
            "settings": {
                "number_of_shards": 2,
                "number_of_replicas": 1
            },
            "mappings": {
                "properties": {
                    "query_id": {"type": "keyword"},
                    "user_id": {"type": "keyword"},
                    "session_token": {"type": "keyword"},
                    "search_text": {"type": "text"},
                    "location_searched": {"type": "geo_point"},
                    "filters_applied": {"type": "object"},
                    "results_count": {"type": "integer"},
                    "execution_time_ms": {"type": "integer"},
                    "clicked_properties": {"type": "keyword"},
                    "booked_property": {"type": "keyword"},
                    "timestamp": {"type": "date"},
                    "experiment_variant": {"type": "keyword"}
                }
            }
        }
        
        await self.client.indices.create(index=index_name, body=mapping)
        logger.info(f"Created analytics index '{index_name}'")
    
    async def index_property(self, property_data: Dict[str, Any]):
        """Index a single property"""
        try:
            await self.client.index(
                index=self.settings.elasticsearch_index_properties,
                id=property_data["property_id"],
                body=property_data
            )
            logger.debug(f"Indexed property {property_data['property_id']}")
        except Exception as e:
            logger.error(f"Failed to index property {property_data.get('property_id')}: {str(e)}")
            raise
    
    async def bulk_index_properties(self, properties: List[Dict[str, Any]]):
        """Bulk index multiple properties"""
        try:
            actions = []
            for prop in properties:
                actions.append({
                    "_index": self.settings.elasticsearch_index_properties,
                    "_id": prop["property_id"],
                    "_source": prop
                })
            
            success_count, failed_items = await async_bulk(
                self.client,
                actions,
                chunk_size=100,
                max_chunk_bytes=10485760  # 10MB
            )
            
            logger.info(f"Bulk indexed {success_count} properties")
            if failed_items:
                logger.warning(f"Failed to index {len(failed_items)} properties")
                
        except Exception as e:
            logger.error(f"Bulk indexing failed: {str(e)}")
            raise
    
    async def search(self, index: str, body: Dict[str, Any], **kwargs) -> Dict[str, Any]:
        """Execute search query"""
        try:
            response = await self.client.search(index=index, body=body, **kwargs)
            return response
        except Exception as e:
            logger.error(f"Search failed: {str(e)}")
            raise
    
    async def suggest_locations(self, query: str, size: int = 10) -> List[Dict[str, Any]]:
        """Get location suggestions using completion suggester"""
        try:
            suggest_body = {
                "location_suggest": {
                    "prefix": query,
                    "completion": {
                        "field": "city.suggest",
                        "size": size,
                        "contexts": {
                            "country": ["US", "CA", "MX", "GB", "FR", "DE", "ES", "IT"]  # Popular countries
                        }
                    }
                }
            }
            
            response = await self.client.search(
                index=self.settings.elasticsearch_index_properties,
                body={"suggest": suggest_body}
            )
            
            suggestions = []
            for suggestion in response["suggest"]["location_suggest"][0]["options"]:
                suggestions.append({
                    "text": suggestion["text"],
                    "score": suggestion["_score"],
                    "source": suggestion.get("_source", {})
                })
            
            return suggestions
            
        except Exception as e:
            logger.error(f"Location suggestion failed: {str(e)}")
            return []
    
    async def update_property(self, property_id: str, updates: Dict[str, Any]):
        """Update specific fields of a property"""
        try:
            await self.client.update(
                index=self.settings.elasticsearch_index_properties,
                id=property_id,
                body={"doc": updates}
            )
            logger.debug(f"Updated property {property_id}")
        except Exception as e:
            logger.error(f"Failed to update property {property_id}: {str(e)}")
            raise
    
    async def delete_property(self, property_id: str):
        """Delete a property from the index"""
        try:
            await self.client.delete(
                index=self.settings.elasticsearch_index_properties,
                id=property_id
            )
            logger.debug(f"Deleted property {property_id}")
        except Exception as e:
            logger.error(f"Failed to delete property {property_id}: {str(e)}")
            raise
    
    async def reindex_all_properties(self, properties: List[Dict[str, Any]]):
        """Completely reindex all properties (for schema changes)"""
        try:
            # Delete and recreate index
            index_name = self.settings.elasticsearch_index_properties
            
            if await self.client.indices.exists(index=index_name):
                await self.client.indices.delete(index=index_name)
            
            await self._create_property_index()
            
            # Bulk index all properties
            await self.bulk_index_properties(properties)
            
            logger.info(f"Reindexed {len(properties)} properties")
            
        except Exception as e:
            logger.error(f"Reindexing failed: {str(e)}")
            raise
    
    async def get_index_stats(self) -> Dict[str, Any]:
        """Get statistics about the search index"""
        try:
            stats = await self.client.indices.stats(
                index=self.settings.elasticsearch_index_properties
            )
            return {
                "document_count": stats["_all"]["total"]["docs"]["count"],
                "index_size_bytes": stats["_all"]["total"]["store"]["size_in_bytes"],
                "index_size_mb": round(stats["_all"]["total"]["store"]["size_in_bytes"] / 1024 / 1024, 2)
            }
        except Exception as e:
            logger.error(f"Failed to get index stats: {str(e)}")
            return {}
    
    async def analyze_search_performance(self, days: int = 7) -> Dict[str, Any]:
        """Analyze search performance metrics"""
        try:
            analytics_index = f"{self.settings.elasticsearch_index_properties}_analytics"
            
            query = {
                "query": {
                    "range": {
                        "timestamp": {
                            "gte": f"now-{days}d"
                        }
                    }
                },
                "aggs": {
                    "avg_execution_time": {"avg": {"field": "execution_time_ms"}},
                    "avg_results_count": {"avg": {"field": "results_count"}},
                    "searches_by_day": {
                        "date_histogram": {
                            "field": "timestamp",
                            "calendar_interval": "day"
                        }
                    },
                    "popular_locations": {
                        "terms": {"field": "location_searched", "size": 10}
                    }
                }
            }
            
            response = await self.client.search(index=analytics_index, body=query)
            
            return {
                "total_searches": response["hits"]["total"]["value"],
                "avg_execution_time_ms": response["aggregations"]["avg_execution_time"]["value"],
                "avg_results_count": response["aggregations"]["avg_results_count"]["value"],
                "searches_by_day": response["aggregations"]["searches_by_day"]["buckets"],
                "popular_locations": response["aggregations"]["popular_locations"]["buckets"]
            }
            
        except Exception as e:
            logger.error(f"Performance analysis failed: {str(e)}")
            return {}
    
    async def close(self):
        """Close Elasticsearch client connection"""
        if self.client:
            await self.client.close()
            logger.info("Elasticsearch connection closed")