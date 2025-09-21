"""Configuration settings for the admin service."""

from pydantic import Field
from pydantic_settings import BaseSettings
from typing import List, Optional


class Settings(BaseSettings):
    """Application settings."""
    
    # Application
    APP_NAME: str = "TouriQuest Admin Service"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = Field(default="development", env="ENVIRONMENT")
    DEBUG: bool = Field(default=True, env="DEBUG")
    
    # Security
    SECRET_KEY: str = Field(..., env="SECRET_KEY")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30, env="ACCESS_TOKEN_EXPIRE_MINUTES")
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=7, env="REFRESH_TOKEN_EXPIRE_DAYS")
    ALGORITHM: str = "HS256"
    
    # Database
    DATABASE_URL: str = Field(..., env="DATABASE_URL")
    DATABASE_ECHO: bool = Field(default=False, env="DATABASE_ECHO")
    
    # Redis
    REDIS_URL: str = Field(default="redis://localhost:6379/0", env="REDIS_URL")
    
    # CORS
    ALLOWED_HOSTS: List[str] = Field(
        default=["http://localhost:3000", "http://localhost:5173"],
        env="ALLOWED_HOSTS"
    )
    
    # External Services
    NOTIFICATION_SERVICE_URL: str = Field(
        default="http://notification-service:8000",
        env="NOTIFICATION_SERVICE_URL"
    )
    USER_SERVICE_URL: str = Field(
        default="http://user-service:8000",
        env="USER_SERVICE_URL"
    )
    PROPERTY_SERVICE_URL: str = Field(
        default="http://property-service:8000",
        env="PROPERTY_SERVICE_URL"
    )
    BOOKING_SERVICE_URL: str = Field(
        default="http://booking-service:8000",
        env="BOOKING_SERVICE_URL"
    )
    PAYMENT_SERVICE_URL: str = Field(
        default="http://payment-service:8000",
        env="PAYMENT_SERVICE_URL"
    )
    
    # Monitoring
    SENTRY_DSN: Optional[str] = Field(default=None, env="SENTRY_DSN")
    PROMETHEUS_PORT: int = Field(default=8001, env="PROMETHEUS_PORT")
    
    # File Storage
    UPLOAD_DIR: str = Field(default="./uploads", env="UPLOAD_DIR")
    MAX_UPLOAD_SIZE: int = Field(default=10485760, env="MAX_UPLOAD_SIZE")  # 10MB
    
    # Email Configuration
    SMTP_SERVER: str = Field(default="smtp.gmail.com", env="SMTP_SERVER")
    SMTP_PORT: int = Field(default=587, env="SMTP_PORT")
    SMTP_USERNAME: str = Field(default="", env="SMTP_USERNAME")
    SMTP_PASSWORD: str = Field(default="", env="SMTP_PASSWORD")
    EMAIL_FROM: str = Field(default="admin@touriquest.com", env="EMAIL_FROM")
    
    # Analytics
    ANALYTICS_RETENTION_DAYS: int = Field(default=730, env="ANALYTICS_RETENTION_DAYS")  # 2 years
    REAL_TIME_UPDATE_INTERVAL: int = Field(default=30, env="REAL_TIME_UPDATE_INTERVAL")  # seconds
    
    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = Field(default=100, env="RATE_LIMIT_REQUESTS")
    RATE_LIMIT_WINDOW: int = Field(default=3600, env="RATE_LIMIT_WINDOW")  # 1 hour
    
    # Content Moderation
    AUTO_MODERATION_ENABLED: bool = Field(default=True, env="AUTO_MODERATION_ENABLED")
    MODERATION_CONFIDENCE_THRESHOLD: float = Field(default=0.8, env="MODERATION_CONFIDENCE_THRESHOLD")
    
    # Financial
    COMMISSION_RATE: float = Field(default=0.15, env="COMMISSION_RATE")  # 15%
    TAX_RATE: float = Field(default=0.08, env="TAX_RATE")  # 8%
    PAYOUT_SCHEDULE_DAYS: int = Field(default=7, env="PAYOUT_SCHEDULE_DAYS")
    
    # Admin Roles
    SUPER_ADMIN_EMAILS: List[str] = Field(
        default=["super.admin@touriquest.com"],
        env="SUPER_ADMIN_EMAILS"
    )
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Global settings instance
settings = Settings()