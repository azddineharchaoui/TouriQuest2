"""Core configuration module for Property Service"""

from functools import lru_cache
from typing import List, Optional
from pydantic import BaseSettings, Field
import os


class Settings(BaseSettings):
    """Application settings"""
    
    # App Configuration
    app_name: str = "TouriQuest Property Service"
    environment: str = Field(default="development", env="ENVIRONMENT")
    debug: bool = Field(default=True, env="DEBUG")
    port: int = Field(default=8001, env="PORT")
    
    # Database Configuration
    database_url: str = Field(
        default="postgresql+asyncpg://user:password@localhost:5432/touriquest_properties",
        env="DATABASE_URL"
    )
    database_pool_size: int = Field(default=20, env="DATABASE_POOL_SIZE")
    database_max_overflow: int = Field(default=0, env="DATABASE_MAX_OVERFLOW")
    
    # Redis Configuration
    redis_url: str = Field(default="redis://localhost:6379/0", env="REDIS_URL")
    redis_cache_ttl: int = Field(default=3600, env="REDIS_CACHE_TTL")  # 1 hour
    redis_search_cache_ttl: int = Field(default=300, env="REDIS_SEARCH_CACHE_TTL")  # 5 minutes
    
    # Elasticsearch Configuration
    elasticsearch_url: str = Field(default="http://localhost:9200", env="ELASTICSEARCH_URL")
    elasticsearch_username: Optional[str] = Field(default=None, env="ELASTICSEARCH_USERNAME")
    elasticsearch_password: Optional[str] = Field(default=None, env="ELASTICSEARCH_PASSWORD")
    elasticsearch_index_properties: str = Field(
        default="touriquest_properties", 
        env="ELASTICSEARCH_INDEX_PROPERTIES"
    )
    
    # Security Configuration
    secret_key: str = Field(default="your-secret-key-change-this", env="SECRET_KEY")
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # CORS Configuration
    allowed_origins: List[str] = Field(
        default=["http://localhost:3000", "http://localhost:5173"],
        env="ALLOWED_ORIGINS"
    )
    
    # Rate Limiting
    rate_limit_requests: int = Field(default=100, env="RATE_LIMIT_REQUESTS")
    rate_limit_window: int = Field(default=60, env="RATE_LIMIT_WINDOW")  # seconds
    
    # Search Configuration
    search_max_results: int = Field(default=100, env="SEARCH_MAX_RESULTS")
    search_default_radius: float = Field(default=50.0, env="SEARCH_DEFAULT_RADIUS")  # km
    search_max_radius: float = Field(default=500.0, env="SEARCH_MAX_RADIUS")  # km
    
    # Pagination
    default_page_size: int = Field(default=20, env="DEFAULT_PAGE_SIZE")
    max_page_size: int = Field(default=100, env="MAX_PAGE_SIZE")
    
    # External Services
    currency_api_key: Optional[str] = Field(default=None, env="CURRENCY_API_KEY")
    google_maps_api_key: Optional[str] = Field(default=None, env="GOOGLE_MAPS_API_KEY")
    
    # Monitoring and Logging
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    enable_metrics: bool = Field(default=True, env="ENABLE_METRICS")
    sentry_dsn: Optional[str] = Field(default=None, env="SENTRY_DSN")
    
    # Analytics
    enable_search_analytics: bool = Field(default=True, env="ENABLE_SEARCH_ANALYTICS")
    analytics_batch_size: int = Field(default=100, env="ANALYTICS_BATCH_SIZE")
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()