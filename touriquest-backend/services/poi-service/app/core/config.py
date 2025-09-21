"""
Configuration settings for POI Service
"""

import os
from typing import Optional, List
from pydantic import BaseSettings, validator
from functools import lru_cache


class Settings(BaseSettings):
    # App settings
    app_name: str = "POI Service"
    app_version: str = "1.0.0"
    debug: bool = False
    environment: str = "development"
    
    # API settings
    api_v1_prefix: str = "/api/v1"
    
    # Database settings
    database_url: str = "postgresql+asyncpg://user:password@localhost/touriquest_poi"
    redis_url: str = "redis://localhost:6379/2"
    elasticsearch_url: str = "http://localhost:9200"
    
    # External services
    google_maps_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    aws_access_key_id: Optional[str] = None
    aws_secret_access_key: Optional[str] = None
    aws_region: str = "us-east-1"
    s3_bucket: str = "touriquest-media"
    
    # Security
    secret_key: str = "your-secret-key-here"
    access_token_expire_minutes: int = 30
    algorithm: str = "HS256"
    
    # Rate limiting
    rate_limit_requests_per_minute: int = 100
    
    # Monitoring
    prometheus_port: int = 8001
    log_level: str = "INFO"
    
    # POI specific settings
    max_search_radius_km: float = 100.0
    default_search_radius_km: float = 10.0
    max_search_results: int = 100
    default_search_results: int = 20
    
    # Media and Storage
    media_upload_path: str = "./uploads"
    media_base_url: str = "http://localhost:8000/media"
    max_upload_size_mb: int = 100
    
    # Content Management
    supported_image_formats: List[str] = ["jpeg", "jpg", "png", "webp"]
    supported_audio_formats: List[str] = ["mp3", "wav", "ogg", "m4a", "aac", "flac"]
    supported_video_formats: List[str] = ["mp4", "webm", "mov"]
    supported_model_formats: List[str] = ["gltf", "glb", "obj", "fbx"]
    supported_document_formats: List[str] = ["pdf", "txt", "docx"]
    
    # Audio Guide Settings
    audio_bitrate_kbps: int = 128
    audio_sample_rate: int = 44100
    audio_channels: int = 2
    audio_max_duration_minutes: int = 60
    audio_segment_duration_seconds: int = 30
    
    # AR Experience Settings
    ar_model_max_size_mb: int = 50
    ar_texture_max_resolution: int = 2048
    ar_model_optimization_level: str = "medium"  # low, medium, high
    ar_supported_formats: List[str] = ["gltf", "glb"]
    ar_max_polygon_count: int = 100000
    
    # Content Processing
    image_optimization_quality: int = 85
    image_thumbnail_sizes: List[int] = [150, 300, 600, 1200]
    video_compression_preset: str = "medium"
    audio_normalization_target_db: float = -16.0
    
    # CDN and Delivery
    cdn_base_url: Optional[str] = None
    enable_progressive_download: bool = True
    chunk_size_bytes: int = 8192
    streaming_buffer_size: int = 1024 * 1024  # 1MB
    
    # Content Versioning
    enable_content_versioning: bool = True
    max_content_versions: int = 5
    version_cleanup_days: int = 30
    
    # Offline Content
    enable_offline_downloads: bool = True
    offline_content_expiry_days: int = 7
    offline_cache_size_mb: int = 500
    
    # Performance and Analytics
    enable_content_analytics: bool = True
    analytics_batch_size: int = 100
    analytics_flush_interval_seconds: int = 60
    
    # Background Processing
    celery_broker_url: str = "redis://localhost:6379/3"
    celery_result_backend: str = "redis://localhost:6379/4"
    celery_max_retries: int = 3
    celery_retry_delay_seconds: int = 60
    
    # Device Optimization
    enable_device_optimization: bool = True
    mobile_audio_bitrate_kbps: int = 96
    mobile_image_quality: int = 75
    mobile_model_polygon_limit: int = 50000
    
    # Multi-language
    default_language: str = "en"
    supported_languages: List[str] = [
        "en", "fr", "ar", "es", "de", "it", "pt", "zh", "ja", "ko"
    ]
    trending_calculation_hours: int = 24
    
    # Cache settings
    cache_ttl_seconds: int = 3600
    search_cache_ttl_seconds: int = 300
    
    # CORS settings
    allowed_origins: List[str] = ["*"]
    
    @validator("database_url", pre=True)
    def assemble_db_connection(cls, v: Optional[str]) -> str:
        if isinstance(v, str):
            return v
        return "postgresql+asyncpg://user:password@localhost/touriquest_poi"
    
    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()