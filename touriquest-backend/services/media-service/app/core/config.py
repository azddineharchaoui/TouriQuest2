"""
Configuration settings for the Media Service
Environment variables and service configuration
"""
import os
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Application settings
    APP_NAME: str = "TouriQuest Media Service"
    VERSION: str = "1.0.0"
    DEBUG: bool = Field(default=False, description="Enable debug mode")
    ENVIRONMENT: str = Field(default="development", description="Environment name")
    
    # Server settings
    HOST: str = Field(default="0.0.0.0", description="Server host")
    PORT: int = Field(default=8003, description="Server port")
    
    # Security settings
    SECRET_KEY: str = Field(..., description="Secret key for JWT tokens")
    ALGORITHM: str = Field(default="HS256", description="JWT algorithm")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30, description="Token expiration time")
    
    # SSL settings
    SSL_CERT_PATH: Optional[str] = Field(default=None, description="SSL certificate path")
    SSL_KEY_PATH: Optional[str] = Field(default=None, description="SSL private key path")
    
    # CORS settings
    CORS_ORIGINS: List[str] = Field(
        default=[
            "http://localhost:3000",
            "http://localhost:3001",
            "http://localhost:8000",
            "https://touriquest.com",
            "https://www.touriquest.com",
            "https://admin.touriquest.com"
        ],
        description="Allowed CORS origins"
    )
    
    # Trusted hosts
    ALLOWED_HOSTS: List[str] = Field(
        default=[
            "localhost",
            "127.0.0.1",
            "media-service",
            "touriquest.com",
            "*.touriquest.com"
        ],
        description="Allowed hosts"
    )
    
    # Database settings
    DATABASE_URL: str = Field(
        default="postgresql://user:password@localhost:5432/touriquest_media",
        description="Database connection URL"
    )
    DATABASE_POOL_SIZE: int = Field(default=20, description="Database connection pool size")
    DATABASE_MAX_OVERFLOW: int = Field(default=30, description="Database max overflow connections")
    
    # AWS settings
    AWS_ACCESS_KEY_ID: str = Field(..., description="AWS access key ID")
    AWS_SECRET_ACCESS_KEY: str = Field(..., description="AWS secret access key")
    AWS_REGION: str = Field(default="us-east-1", description="AWS region")
    
    # S3 settings
    S3_BUCKET_NAME: str = Field(..., description="S3 bucket name for media storage")
    S3_MEDIA_PREFIX: str = Field(default="media", description="S3 prefix for media files")
    CLOUDFRONT_DOMAIN: Optional[str] = Field(default=None, description="CloudFront domain for CDN")
    
    # File upload settings
    MAX_FILE_SIZE_MB: int = Field(default=500, description="Maximum file size in MB")
    MAX_STORAGE_PER_USER_MB: int = Field(default=10240, description="Maximum storage per user in MB")
    ALLOWED_MEDIA_TYPES: List[str] = Field(
        default=[
            "image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp", "image/tiff",
            "video/mp4", "video/avi", "video/mov", "video/wmv", "video/flv", "video/webm",
            "audio/mp3", "audio/wav", "audio/aac", "audio/ogg", "audio/flac",
            "application/pdf", "text/plain", "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "model/gltf-binary", "model/gltf+json"  # AR content
        ],
        description="Allowed MIME types for uploads"
    )
    
    # Image processing settings
    IMAGE_QUALITY_HIGH: int = Field(default=95, description="High quality image compression")
    IMAGE_QUALITY_MEDIUM: int = Field(default=85, description="Medium quality image compression")
    IMAGE_QUALITY_LOW: int = Field(default=70, description="Low quality image compression")
    
    # Video processing settings
    VIDEO_BITRATE_4K: str = Field(default="8000k", description="4K video bitrate")
    VIDEO_BITRATE_1080P: str = Field(default="5000k", description="1080p video bitrate")
    VIDEO_BITRATE_720P: str = Field(default="2500k", description="720p video bitrate")
    VIDEO_BITRATE_480P: str = Field(default="1200k", description="480p video bitrate")
    
    # Audio processing settings
    AUDIO_BITRATE_HIGH: str = Field(default="320k", description="High quality audio bitrate")
    AUDIO_BITRATE_MEDIUM: str = Field(default="192k", description="Medium quality audio bitrate")
    AUDIO_BITRATE_LOW: str = Field(default="128k", description="Low quality audio bitrate")
    
    # Celery settings
    CELERY_BROKER_URL: str = Field(
        default="redis://localhost:6379/0",
        description="Celery broker URL"
    )
    CELERY_RESULT_BACKEND: str = Field(
        default="redis://localhost:6379/0",
        description="Celery result backend URL"
    )
    
    # Redis settings
    REDIS_URL: str = Field(
        default="redis://localhost:6379/1",
        description="Redis URL for caching"
    )
    REDIS_CACHE_TTL: int = Field(default=3600, description="Redis cache TTL in seconds")
    
    # Content moderation settings
    ENABLE_CONTENT_MODERATION: bool = Field(default=True, description="Enable content moderation")
    MODERATION_CONFIDENCE_THRESHOLD: float = Field(
        default=0.8, 
        description="Confidence threshold for auto-moderation"
    )
    
    # Virus scanning settings
    ENABLE_VIRUS_SCANNING: bool = Field(default=True, description="Enable virus scanning")
    CLAMAV_HOST: str = Field(default="localhost", description="ClamAV host")
    CLAMAV_PORT: int = Field(default=3310, description="ClamAV port")
    
    # Content analysis settings
    ENABLE_AUTO_TAGGING: bool = Field(default=True, description="Enable automatic content tagging")
    ENABLE_DUPLICATE_DETECTION: bool = Field(default=True, description="Enable duplicate detection")
    SIMILARITY_THRESHOLD: float = Field(default=0.85, description="Similarity threshold for duplicates")
    
    # Rate limiting settings
    RATE_LIMIT_UPLOADS_PER_MINUTE: int = Field(default=10, description="Upload rate limit per minute")
    RATE_LIMIT_REQUESTS_PER_MINUTE: int = Field(default=100, description="General rate limit per minute")
    
    # Monitoring settings
    ENABLE_PROMETHEUS_METRICS: bool = Field(default=True, description="Enable Prometheus metrics")
    METRICS_PORT: int = Field(default=9090, description="Metrics server port")
    
    # Logging settings
    LOG_LEVEL: str = Field(default="INFO", description="Logging level")
    LOG_FORMAT: str = Field(
        default="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        description="Log format"
    )
    ENABLE_STRUCTURED_LOGGING: bool = Field(default=True, description="Enable structured logging")
    
    # Feature flags
    ENABLE_VIDEO_TRANSCODING: bool = Field(default=True, description="Enable video transcoding")
    ENABLE_AUDIO_PROCESSING: bool = Field(default=True, description="Enable audio processing")
    ENABLE_AR_CONTENT: bool = Field(default=True, description="Enable AR content support")
    ENABLE_MULTILINGUAL_CONTENT: bool = Field(default=True, description="Enable multilingual content")
    
    # API versioning
    API_V1_PREFIX: str = Field(default="/api/v1", description="API v1 prefix")
    
    # External service URLs
    USER_SERVICE_URL: str = Field(
        default="http://localhost:8001",
        description="User service URL"
    )
    AUTH_SERVICE_URL: str = Field(
        default="http://localhost:8002",
        description="Auth service URL"
    )
    
    # Content delivery settings
    CDN_CACHE_CONTROL: str = Field(
        default="public, max-age=31536000",
        description="CDN cache control header"
    )
    ENABLE_CDN_PURGE: bool = Field(default=True, description="Enable CDN cache purging")
    
    # Background job settings
    MAX_RETRY_ATTEMPTS: int = Field(default=3, description="Maximum job retry attempts")
    RETRY_DELAY_SECONDS: int = Field(default=60, description="Retry delay in seconds")
    JOB_TIMEOUT_SECONDS: int = Field(default=300, description="Job timeout in seconds")
    
    # Content classification settings
    NSFW_DETECTION_THRESHOLD: float = Field(default=0.8, description="NSFW detection threshold")
    VIOLENCE_DETECTION_THRESHOLD: float = Field(default=0.9, description="Violence detection threshold")
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


# Create settings instance
settings = Settings()


# Environment-specific overrides
if settings.ENVIRONMENT == "production":
    # Production settings
    settings.DEBUG = False
    settings.LOG_LEVEL = "INFO"
    
elif settings.ENVIRONMENT == "staging":
    # Staging settings
    settings.DEBUG = False
    settings.LOG_LEVEL = "INFO"
    
elif settings.ENVIRONMENT == "development":
    # Development settings
    settings.DEBUG = True
    settings.LOG_LEVEL = "DEBUG"
    
elif settings.ENVIRONMENT == "testing":
    # Testing settings
    settings.DEBUG = True
    settings.LOG_LEVEL = "DEBUG"
    settings.ENABLE_VIRUS_SCANNING = False
    settings.ENABLE_CONTENT_MODERATION = False


def get_database_url() -> str:
    """Get the database URL for the current environment"""
    return settings.DATABASE_URL


def get_redis_url() -> str:
    """Get the Redis URL for the current environment"""
    return settings.REDIS_URL


def get_s3_config() -> dict:
    """Get S3 configuration"""
    return {
        "aws_access_key_id": settings.AWS_ACCESS_KEY_ID,
        "aws_secret_access_key": settings.AWS_SECRET_ACCESS_KEY,
        "region_name": settings.AWS_REGION,
        "bucket_name": settings.S3_BUCKET_NAME,
        "media_prefix": settings.S3_MEDIA_PREFIX,
        "cloudfront_domain": settings.CLOUDFRONT_DOMAIN,
    }


def get_processing_config() -> dict:
    """Get media processing configuration"""
    return {
        "image_quality": {
            "high": settings.IMAGE_QUALITY_HIGH,
            "medium": settings.IMAGE_QUALITY_MEDIUM,
            "low": settings.IMAGE_QUALITY_LOW,
        },
        "video_bitrates": {
            "4k": settings.VIDEO_BITRATE_4K,
            "1080p": settings.VIDEO_BITRATE_1080P,
            "720p": settings.VIDEO_BITRATE_720P,
            "480p": settings.VIDEO_BITRATE_480P,
        },
        "audio_bitrates": {
            "high": settings.AUDIO_BITRATE_HIGH,
            "medium": settings.AUDIO_BITRATE_MEDIUM,
            "low": settings.AUDIO_BITRATE_LOW,
        },
    }