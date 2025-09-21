"""
Configuration settings for Experience Service
"""

import os
from typing import Optional, List
from pydantic import BaseSettings, validator, Field
from functools import lru_cache


class Settings(BaseSettings):
    # App settings
    app_name: str = "Experience Service"
    app_version: str = "1.0.0"
    debug: bool = False
    environment: str = "development"
    
    # API settings
    api_v1_prefix: str = "/api/v1"
    
    # Database settings
    database_url: str = "postgresql+asyncpg://user:password@localhost/touriquest_experience"
    redis_url: str = "redis://localhost:6379/3"
    elasticsearch_url: str = "http://localhost:9200"
    
    # External services
    weather_api_key: Optional[str] = None
    google_maps_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    stripe_secret_key: Optional[str] = None
    stripe_publishable_key: Optional[str] = None
    sendgrid_api_key: Optional[str] = None
    twilio_account_sid: Optional[str] = None
    twilio_auth_token: Optional[str] = None
    
    # AWS settings
    aws_access_key_id: Optional[str] = None
    aws_secret_access_key: Optional[str] = None
    aws_region: str = "us-east-1"
    s3_bucket: str = "touriquest-experiences"
    
    # Security
    secret_key: str = "your-secret-key-here"
    access_token_expire_minutes: int = 30
    algorithm: str = "HS256"
    
    # Rate limiting
    rate_limit_requests_per_minute: int = 100
    
    # Monitoring
    prometheus_port: int = 8002
    log_level: str = "INFO"
    
    # Experience specific settings
    max_search_radius_km: float = 100.0
    default_search_radius_km: float = 25.0
    max_search_results: int = 100
    default_search_results: int = 20
    max_group_size: int = 50
    default_booking_hours_advance: int = 24
    
    # Payment settings
    platform_commission_rate: float = 0.15  # 15% commission
    payment_hold_hours: int = 24
    refund_processing_days: int = 5
    
    # Provider settings
    min_provider_rating: float = 3.0
    provider_verification_required: bool = True
    insurance_verification_required: bool = True
    
    # Weather integration
    weather_update_interval_minutes: int = 30
    weather_forecast_days: int = 7
    
    # Scheduling
    max_advance_booking_days: int = 365
    min_cancellation_hours: int = 24
    
    # Quality scoring
    min_reviews_for_quality_score: int = 5
    quality_score_weight_recent: float = 0.7
    quality_score_decay_days: int = 90
    
    # Cache settings
    cache_ttl_seconds: int = 3600
    search_cache_ttl_seconds: int = 300
    weather_cache_ttl_seconds: int = 1800
    
    # CORS settings
    allowed_origins: List[str] = ["*"]
    
    # Media and Storage
    media_upload_path: str = "./uploads"
    media_base_url: str = "http://localhost:8002/media"
    max_upload_size_mb: int = 25
    
    # Content Management
    supported_image_formats: List[str] = ["jpeg", "jpg", "png", "webp"]
    supported_video_formats: List[str] = ["mp4", "webm", "mov"]
    supported_document_formats: List[str] = ["pdf", "doc", "docx"]
    
    # Multi-language
    default_language: str = "en"
    supported_languages: List[str] = [
        "en", "fr", "ar", "es", "de", "it", "pt", "zh", "ja", "ko"
    ]
    
    # Notifications
    email_from: str = "noreply@touriquest.com"
    sms_from: str = "+1234567890"
    
    @validator("database_url", pre=True)
    def assemble_db_connection(cls, v: Optional[str]) -> str:
        if isinstance(v, str):
            return v
        return "postgresql+asyncpg://user:password@localhost/touriquest_experience"
    
    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()