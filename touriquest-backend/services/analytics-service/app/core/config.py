"""
Analytics Service Core Configuration
Handles all configuration settings for the TouriQuest Analytics Service
"""

import os
from typing import Optional, List
from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings with environment-specific configurations"""
    
    # Application
    app_name: str = Field(default="TouriQuest Analytics Service", env="APP_NAME")
    version: str = Field(default="1.0.0", env="APP_VERSION")
    debug: bool = Field(default=False, env="DEBUG")
    environment: str = Field(default="development", env="ENVIRONMENT")
    
    # Server
    host: str = Field(default="0.0.0.0", env="HOST")
    port: int = Field(default=8007, env="PORT")
    reload: bool = Field(default=True, env="RELOAD")
    
    # Database
    database_url: str = Field(
        default="postgresql+asyncpg://postgres:password@localhost:5432/touriquest_analytics",
        env="DATABASE_URL"
    )
    database_pool_size: int = Field(default=20, env="DATABASE_POOL_SIZE")
    database_max_overflow: int = Field(default=30, env="DATABASE_MAX_OVERFLOW")
    
    # Data Warehouse
    warehouse_url: str = Field(
        default="postgresql+asyncpg://postgres:password@localhost:5432/touriquest_warehouse",
        env="WAREHOUSE_URL"
    )
    
    # Redis
    redis_url: str = Field(default="redis://localhost:6379/7", env="REDIS_URL")
    redis_analytics_db: int = Field(default=7, env="REDIS_ANALYTICS_DB")
    redis_cache_ttl: int = Field(default=3600, env="REDIS_CACHE_TTL")  # 1 hour
    
    # Celery
    celery_broker_url: str = Field(default="redis://localhost:6379/8", env="CELERY_BROKER_URL")
    celery_result_backend: str = Field(default="redis://localhost:6379/9", env="CELERY_RESULT_BACKEND")
    
    # JWT Configuration
    secret_key: str = Field(default="your-secret-key-change-in-production", env="SECRET_KEY")
    algorithm: str = Field(default="HS256", env="ALGORITHM")
    access_token_expire_minutes: int = Field(default=30, env="ACCESS_TOKEN_EXPIRE_MINUTES")
    
    # External Services
    main_api_url: str = Field(default="http://localhost:8001", env="MAIN_API_URL")
    user_service_url: str = Field(default="http://localhost:8002", env="USER_SERVICE_URL")
    property_service_url: str = Field(default="http://localhost:8003", env="PROPERTY_SERVICE_URL")
    booking_service_url: str = Field(default="http://localhost:8004", env="BOOKING_SERVICE_URL")
    
    # Analytics Configuration
    batch_size: int = Field(default=1000, env="ANALYTICS_BATCH_SIZE")
    refresh_interval_minutes: int = Field(default=30, env="REFRESH_INTERVAL_MINUTES")
    retention_days: int = Field(default=365, env="DATA_RETENTION_DAYS")
    
    # Real-time Processing
    kafka_bootstrap_servers: List[str] = Field(
        default=["localhost:9092"], env="KAFKA_BOOTSTRAP_SERVERS"
    )
    kafka_topic_prefix: str = Field(default="touriquest_analytics", env="KAFKA_TOPIC_PREFIX")
    
    # Export Configuration
    export_max_rows: int = Field(default=100000, env="EXPORT_MAX_ROWS")
    export_timeout_seconds: int = Field(default=300, env="EXPORT_TIMEOUT_SECONDS")
    
    # Reporting
    report_storage_path: str = Field(default="./reports", env="REPORT_STORAGE_PATH")
    scheduled_reports_enabled: bool = Field(default=True, env="SCHEDULED_REPORTS_ENABLED")
    
    # Performance Metrics
    metrics_collection_interval: int = Field(default=60, env="METRICS_COLLECTION_INTERVAL")  # seconds
    performance_threshold_ms: int = Field(default=1000, env="PERFORMANCE_THRESHOLD_MS")
    
    # Security
    cors_origins: List[str] = Field(
        default=["http://localhost:3000", "http://localhost:5173"],
        env="CORS_ORIGINS"
    )
    allowed_hosts: List[str] = Field(default=["*"], env="ALLOWED_HOSTS")
    
    # Monitoring
    prometheus_metrics_enabled: bool = Field(default=True, env="PROMETHEUS_METRICS_ENABLED")
    prometheus_metrics_port: int = Field(default=9007, env="PROMETHEUS_METRICS_PORT")
    
    # Logging
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    log_format: str = Field(default="json", env="LOG_FORMAT")
    
    # Data Visualization
    chart_cache_ttl: int = Field(default=1800, env="CHART_CACHE_TTL")  # 30 minutes
    max_chart_data_points: int = Field(default=10000, env="MAX_CHART_DATA_POINTS")
    
    class Config:
        env_file = ".env"
        case_sensitive = False


class DevelopmentSettings(Settings):
    """Development environment settings"""
    debug: bool = True
    environment: str = "development"
    reload: bool = True
    log_level: str = "DEBUG"


class StagingSettings(Settings):
    """Staging environment settings"""
    debug: bool = False
    environment: str = "staging"
    reload: bool = False
    log_level: str = "INFO"


class ProductionSettings(Settings):
    """Production environment settings"""
    debug: bool = False
    environment: str = "production"
    reload: bool = False
    log_level: str = "WARNING"
    
    # Production security settings
    secret_key: str = Field(env="SECRET_KEY")  # Required in production
    cors_origins: List[str] = Field(env="CORS_ORIGINS")  # Must be explicitly set
    allowed_hosts: List[str] = Field(env="ALLOWED_HOSTS")  # Must be explicitly set


def get_settings() -> Settings:
    """Get settings based on environment"""
    environment = os.getenv("ENVIRONMENT", "development").lower()
    
    if environment == "production":
        return ProductionSettings()
    elif environment == "staging":
        return StagingSettings()
    else:
        return DevelopmentSettings()


settings = get_settings()