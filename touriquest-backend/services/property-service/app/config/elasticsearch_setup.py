"""Elasticsearch configuration and setup utilities"""

import asyncio
import json
from typing import Dict, List, Any, Optional
from datetime import datetime
import structlog
from elasticsearch import AsyncElasticsearch
from elasticsearch.exceptions import ConnectionError, NotFoundError

from app.core.config import get_settings

logger = structlog.get_logger()


class ElasticsearchSetup:
    """Elasticsearch index setup and configuration management"""
    
    def __init__(self):
        self.settings = get_settings()
        self.client: Optional[AsyncElasticsearch] = None
    
    async def initialize(self):
        """Initialize Elasticsearch client"""
        try:
            self.client = AsyncElasticsearch(
                hosts=[self.settings.elasticsearch_url],
                timeout=30,
                retry_on_timeout=True,
                max_retries=3
            )
            
            # Test connection
            await self.client.ping()
            logger.info("Elasticsearch client initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize Elasticsearch: {str(e)}")
            raise
    
    async def setup_indices(self):
        """Set up all required Elasticsearch indices"""
        try:
            await self.setup_properties_index()
            await self.setup_locations_index()
            await self.setup_search_suggestions_index()
            await self.setup_analytics_index()
            
            logger.info("All Elasticsearch indices set up successfully")
            
        except Exception as e:
            logger.error(f"Error setting up Elasticsearch indices: {str(e)}")
            raise
    
    async def setup_properties_index(self):
        """Set up properties search index with optimized mapping"""
        index_name = self.settings.elasticsearch_properties_index
        
        try:
            # Check if index exists
            if await self.client.indices.exists(index=index_name):
                logger.info(f"Properties index {index_name} already exists")
                return
            
            # Properties index mapping
            mapping = {
                "settings": {
                    "number_of_shards": 2,
                    "number_of_replicas": 1,
                    "analysis": {
                        "analyzer": {
                            "property_analyzer": {
                                "type": "custom",
                                "tokenizer": "standard",
                                "filter": [
                                    "lowercase",
                                    "stop",
                                    "stemmer",
                                    "synonym_filter"
                                ]
                            },
                            "location_analyzer": {
                                "type": "custom",
                                "tokenizer": "keyword",
                                "filter": ["lowercase", "trim"]
                            },
                            "autocomplete_analyzer": {
                                "type": "custom",
                                "tokenizer": "edge_ngram_tokenizer",
                                "filter": ["lowercase"]
                            }
                        },
                        "tokenizer": {
                            "edge_ngram_tokenizer": {
                                "type": "edge_ngram",
                                "min_gram": 2,
                                "max_gram": 20,
                                "token_chars": ["letter", "digit"]
                            }
                        },
                        "filter": {
                            "synonym_filter": {
                                "type": "synonym",
                                "synonyms": [
                                    "apartment,flat,condo",
                                    "house,home,villa",
                                    "hotel,accommodation,lodging",
                                    "beach,seaside,coastal",
                                    "mountain,hill,alpine"
                                ]
                            }
                        }
                    }
                },
                "mappings": {
                    "properties": {
                        "property_id": {
                            "type": "keyword"
                        },
                        "title": {
                            "type": "text",
                            "analyzer": "property_analyzer",
                            "fields": {
                                "autocomplete": {
                                    "type": "text",
                                    "analyzer": "autocomplete_analyzer"
                                },
                                "raw": {
                                    "type": "keyword"
                                }
                            }
                        },
                        "description": {
                            "type": "text",
                            "analyzer": "property_analyzer"
                        },
                        "property_type": {
                            "type": "keyword"
                        },
                        "location": {
                            "properties": {
                                "coordinates": {
                                    "type": "geo_point"
                                },
                                "address": {
                                    "type": "text",
                                    "analyzer": "location_analyzer",
                                    "fields": {
                                        "autocomplete": {
                                            "type": "text",
                                            "analyzer": "autocomplete_analyzer"
                                        }
                                    }
                                },
                                "city": {
                                    "type": "keyword",
                                    "fields": {
                                        "text": {
                                            "type": "text",
                                            "analyzer": "location_analyzer"
                                        }
                                    }
                                },
                                "region": {
                                    "type": "keyword"
                                },
                                "country": {
                                    "type": "keyword"
                                },
                                "postal_code": {
                                    "type": "keyword"
                                }
                            }
                        },
                        "pricing": {
                            "properties": {
                                "base_price": {
                                    "type": "double"
                                },
                                "currency": {
                                    "type": "keyword"
                                },
                                "price_per_night": {
                                    "type": "double"
                                },
                                "cleaning_fee": {
                                    "type": "double"
                                },
                                "service_fee": {
                                    "type": "double"
                                }
                            }
                        },
                        "capacity": {
                            "properties": {
                                "max_guests": {
                                    "type": "integer"
                                },
                                "bedrooms": {
                                    "type": "integer"
                                },
                                "beds": {
                                    "type": "integer"
                                },
                                "bathrooms": {
                                    "type": "double"
                                }
                            }
                        },
                        "amenities": {
                            "type": "keyword"
                        },
                        "features": {
                            "properties": {
                                "instant_book": {
                                    "type": "boolean"
                                },
                                "eco_friendly": {
                                    "type": "boolean"
                                },
                                "pet_friendly": {
                                    "type": "boolean"
                                },
                                "family_friendly": {
                                    "type": "boolean"
                                },
                                "business_ready": {
                                    "type": "boolean"
                                }
                            }
                        },
                        "host": {
                            "properties": {
                                "host_id": {
                                    "type": "keyword"
                                },
                                "verified": {
                                    "type": "boolean"
                                },
                                "superhost": {
                                    "type": "boolean"
                                },
                                "response_rate": {
                                    "type": "double"
                                },
                                "response_time": {
                                    "type": "keyword"
                                }
                            }
                        },
                        "reviews": {
                            "properties": {
                                "rating": {
                                    "type": "double"
                                },
                                "review_count": {
                                    "type": "integer"
                                },
                                "ratings_breakdown": {
                                    "properties": {
                                        "cleanliness": {"type": "double"},
                                        "accuracy": {"type": "double"},
                                        "check_in": {"type": "double"},
                                        "communication": {"type": "double"},
                                        "location": {"type": "double"},
                                        "value": {"type": "double"}
                                    }
                                }
                            }
                        },
                        "availability": {
                            "properties": {
                                "available_dates": {
                                    "type": "date_range"
                                },
                                "minimum_stay": {
                                    "type": "integer"
                                },
                                "maximum_stay": {
                                    "type": "integer"
                                }
                            }
                        },
                        "popularity_metrics": {
                            "properties": {
                                "view_count": {
                                    "type": "long"
                                },
                                "booking_count": {
                                    "type": "long"
                                },
                                "popularity_score": {
                                    "type": "double"
                                },
                                "trending_score": {
                                    "type": "double"
                                }
                            }
                        },
                        "created_at": {
                            "type": "date"
                        },
                        "updated_at": {
                            "type": "date"
                        },
                        "indexed_at": {
                            "type": "date"
                        }
                    }
                }
            }
            
            # Create index
            await self.client.indices.create(index=index_name, body=mapping)
            logger.info(f"Properties index {index_name} created successfully")
            
        except Exception as e:
            logger.error(f"Error creating properties index: {str(e)}")
            raise
    
    async def setup_locations_index(self):
        """Set up locations autocomplete index"""
        index_name = f"{self.settings.elasticsearch_properties_index}_locations"
        
        try:
            if await self.client.indices.exists(index=index_name):
                logger.info(f"Locations index {index_name} already exists")
                return
            
            mapping = {
                "settings": {
                    "number_of_shards": 1,
                    "number_of_replicas": 1,
                    "analysis": {
                        "analyzer": {
                            "location_autocomplete": {
                                "type": "custom",
                                "tokenizer": "edge_ngram_tokenizer",
                                "filter": ["lowercase", "trim"]
                            }
                        },
                        "tokenizer": {
                            "edge_ngram_tokenizer": {
                                "type": "edge_ngram",
                                "min_gram": 1,
                                "max_gram": 20,
                                "token_chars": ["letter", "digit", "whitespace"]
                            }
                        }
                    }
                },
                "mappings": {
                    "properties": {
                        "location_id": {
                            "type": "keyword"
                        },
                        "name": {
                            "type": "text",
                            "analyzer": "location_autocomplete",
                            "fields": {
                                "raw": {
                                    "type": "keyword"
                                }
                            }
                        },
                        "type": {
                            "type": "keyword"  # city, region, country, landmark, etc.
                        },
                        "coordinates": {
                            "type": "geo_point"
                        },
                        "hierarchy": {
                            "properties": {
                                "city": {"type": "keyword"},
                                "region": {"type": "keyword"},
                                "country": {"type": "keyword"}
                            }
                        },
                        "popularity": {
                            "type": "double"
                        },
                        "property_count": {
                            "type": "integer"
                        }
                    }
                }
            }
            
            await self.client.indices.create(index=index_name, body=mapping)
            logger.info(f"Locations index {index_name} created successfully")
            
        except Exception as e:
            logger.error(f"Error creating locations index: {str(e)}")
            raise
    
    async def setup_search_suggestions_index(self):
        """Set up search suggestions index"""
        index_name = f"{self.settings.elasticsearch_properties_index}_suggestions"
        
        try:
            if await self.client.indices.exists(index=index_name):
                logger.info(f"Suggestions index {index_name} already exists")
                return
            
            mapping = {
                "settings": {
                    "number_of_shards": 1,
                    "number_of_replicas": 1,
                    "analysis": {
                        "analyzer": {
                            "suggestion_analyzer": {
                                "type": "custom",
                                "tokenizer": "standard",
                                "filter": ["lowercase", "stop", "shingle"]
                            }
                        },
                        "filter": {
                            "shingle": {
                                "type": "shingle",
                                "min_shingle_size": 2,
                                "max_shingle_size": 3
                            }
                        }
                    }
                },
                "mappings": {
                    "properties": {
                        "suggestion_id": {
                            "type": "keyword"
                        },
                        "query": {
                            "type": "text",
                            "analyzer": "suggestion_analyzer"
                        },
                        "category": {
                            "type": "keyword"  # location, property_type, amenity, etc.
                        },
                        "search_count": {
                            "type": "long"
                        },
                        "result_count": {
                            "type": "long"
                        },
                        "click_through_rate": {
                            "type": "double"
                        },
                        "last_searched": {
                            "type": "date"
                        }
                    }
                }
            }
            
            await self.client.indices.create(index=index_name, body=mapping)
            logger.info(f"Suggestions index {index_name} created successfully")
            
        except Exception as e:
            logger.error(f"Error creating suggestions index: {str(e)}")
            raise
    
    async def setup_analytics_index(self):
        """Set up analytics events index"""
        index_name = f"{self.settings.elasticsearch_properties_index}_analytics"
        
        try:
            if await self.client.indices.exists(index=index_name):
                logger.info(f"Analytics index {index_name} already exists")
                return
            
            mapping = {
                "settings": {
                    "number_of_shards": 2,
                    "number_of_replicas": 1
                },
                "mappings": {
                    "properties": {
                        "event_id": {
                            "type": "keyword"
                        },
                        "event_type": {
                            "type": "keyword"
                        },
                        "user_id": {
                            "type": "keyword"
                        },
                        "session_id": {
                            "type": "keyword"
                        },
                        "property_id": {
                            "type": "keyword"
                        },
                        "query": {
                            "type": "text"
                        },
                        "filters": {
                            "type": "object"
                        },
                        "results_count": {
                            "type": "integer"
                        },
                        "response_time_ms": {
                            "type": "double"
                        },
                        "clicked_position": {
                            "type": "integer"
                        },
                        "timestamp": {
                            "type": "date"
                        },
                        "user_agent": {
                            "type": "keyword"
                        },
                        "ip_address": {
                            "type": "ip"
                        },
                        "location": {
                            "type": "geo_point"
                        }
                    }
                }
            }
            
            await self.client.indices.create(index=index_name, body=mapping)
            logger.info(f"Analytics index {index_name} created successfully")
            
        except Exception as e:
            logger.error(f"Error creating analytics index: {str(e)}")
            raise
    
    async def setup_index_templates(self):
        """Set up index templates for time-based indices"""
        try:
            # Analytics template for daily indices
            analytics_template = {
                "index_patterns": [f"{self.settings.elasticsearch_properties_index}_analytics_*"],
                "template": {
                    "settings": {
                        "number_of_shards": 1,
                        "number_of_replicas": 1,
                        "lifecycle": {
                            "name": "analytics_policy"
                        }
                    },
                    "mappings": {
                        "properties": {
                            "timestamp": {"type": "date"},
                            "event_type": {"type": "keyword"},
                            "user_id": {"type": "keyword"},
                            "session_id": {"type": "keyword"},
                            "response_time_ms": {"type": "double"}
                        }
                    }
                }
            }
            
            await self.client.indices.put_index_template(
                name="analytics_template",
                body=analytics_template
            )
            
            logger.info("Index templates created successfully")
            
        except Exception as e:
            logger.error(f"Error creating index templates: {str(e)}")
    
    async def setup_index_lifecycle_policies(self):
        """Set up ILM policies for index management"""
        try:
            # Analytics data lifecycle policy
            analytics_policy = {
                "policy": {
                    "phases": {
                        "hot": {
                            "actions": {
                                "rollover": {
                                    "max_size": "50GB",
                                    "max_age": "7d"
                                }
                            }
                        },
                        "warm": {
                            "min_age": "7d",
                            "actions": {
                                "shrink": {
                                    "number_of_shards": 1
                                }
                            }
                        },
                        "cold": {
                            "min_age": "30d",
                            "actions": {
                                "freeze": {}
                            }
                        },
                        "delete": {
                            "min_age": "90d",
                            "actions": {
                                "delete": {}
                            }
                        }
                    }
                }
            }
            
            await self.client.ilm.put_lifecycle(
                name="analytics_policy",
                body=analytics_policy
            )
            
            logger.info("ILM policies created successfully")
            
        except Exception as e:
            logger.error(f"Error creating ILM policies: {str(e)}")
    
    async def create_index_aliases(self):
        """Create index aliases for easier management"""
        try:
            aliases = {
                "actions": [
                    {
                        "add": {
                            "index": self.settings.elasticsearch_properties_index,
                            "alias": "properties"
                        }
                    },
                    {
                        "add": {
                            "index": f"{self.settings.elasticsearch_properties_index}_locations",
                            "alias": "locations"
                        }
                    },
                    {
                        "add": {
                            "index": f"{self.settings.elasticsearch_properties_index}_suggestions",
                            "alias": "suggestions"
                        }
                    }
                ]
            }
            
            await self.client.indices.update_aliases(body=aliases)
            logger.info("Index aliases created successfully")
            
        except Exception as e:
            logger.error(f"Error creating index aliases: {str(e)}")
    
    async def optimize_indices(self):
        """Optimize indices for better performance"""
        try:
            indices = [
                self.settings.elasticsearch_properties_index,
                f"{self.settings.elasticsearch_properties_index}_locations",
                f"{self.settings.elasticsearch_properties_index}_suggestions"
            ]
            
            for index in indices:
                if await self.client.indices.exists(index=index):
                    # Force merge to optimize segments
                    await self.client.indices.forcemerge(
                        index=index,
                        max_num_segments=1
                    )
                    
                    # Refresh index
                    await self.client.indices.refresh(index=index)
            
            logger.info("Indices optimized successfully")
            
        except Exception as e:
            logger.error(f"Error optimizing indices: {str(e)}")
    
    async def health_check(self) -> Dict[str, Any]:
        """Check Elasticsearch cluster health"""
        try:
            cluster_health = await self.client.cluster.health()
            indices_stats = await self.client.indices.stats()
            
            health_info = {
                "cluster_status": cluster_health["status"],
                "active_shards": cluster_health["active_shards"],
                "number_of_nodes": cluster_health["number_of_nodes"],
                "indices_count": len(indices_stats["indices"]),
                "total_docs": sum(
                    index_stats["total"]["docs"]["count"]
                    for index_stats in indices_stats["indices"].values()
                ),
                "total_size": sum(
                    index_stats["total"]["store"]["size_in_bytes"]
                    for index_stats in indices_stats["indices"].values()
                )
            }
            
            return health_info
            
        except Exception as e:
            logger.error(f"Error checking Elasticsearch health: {str(e)}")
            return {"error": str(e)}
    
    async def close(self):
        """Close Elasticsearch client"""
        if self.client:
            await self.client.close()
            logger.info("Elasticsearch client closed")


# Configuration utilities
async def initialize_elasticsearch():
    """Initialize Elasticsearch with all indices and configurations"""
    setup = ElasticsearchSetup()
    
    try:
        await setup.initialize()
        await setup.setup_indices()
        await setup.setup_index_templates()
        await setup.setup_index_lifecycle_policies()
        await setup.create_index_aliases()
        
        logger.info("Elasticsearch initialization completed successfully")
        return setup
        
    except Exception as e:
        logger.error(f"Elasticsearch initialization failed: {str(e)}")
        await setup.close()
        raise


async def reset_elasticsearch_indices():
    """Reset all Elasticsearch indices (use with caution)"""
    setup = ElasticsearchSetup()
    
    try:
        await setup.initialize()
        
        # Delete existing indices
        indices_to_delete = [
            setup.settings.elasticsearch_properties_index,
            f"{setup.settings.elasticsearch_properties_index}_locations",
            f"{setup.settings.elasticsearch_properties_index}_suggestions",
            f"{setup.settings.elasticsearch_properties_index}_analytics"
        ]
        
        for index in indices_to_delete:
            if await setup.client.indices.exists(index=index):
                await setup.client.indices.delete(index=index)
                logger.info(f"Deleted index: {index}")
        
        # Recreate indices
        await setup.setup_indices()
        logger.info("Elasticsearch indices reset successfully")
        
    except Exception as e:
        logger.error(f"Error resetting Elasticsearch indices: {str(e)}")
        raise
    finally:
        await setup.close()