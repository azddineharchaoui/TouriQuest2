"""
Configuration settings for the communication service
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseSettings, Field, validator
import os


class Settings(BaseSettings):
    """Application settings with environment variable support"""
    
    # Service Configuration
    SERVICE_NAME: str = "communication-service"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = Field(default=False, env="DEBUG")
    ENVIRONMENT: str = Field(default="development", env="ENVIRONMENT")
    
    # Server Configuration
    HOST: str = Field(default="0.0.0.0", env="HOST")
    PORT: int = Field(default=8006, env="PORT")
    RELOAD: bool = Field(default=False, env="RELOAD")
    
    # Database Configuration
    DATABASE_URL: str = Field(..., env="DATABASE_URL")
    DATABASE_POOL_SIZE: int = Field(default=20, env="DATABASE_POOL_SIZE")
    DATABASE_MAX_OVERFLOW: int = Field(default=30, env="DATABASE_MAX_OVERFLOW")
    DATABASE_ECHO: bool = Field(default=False, env="DATABASE_ECHO")
    
    # Redis Configuration
    REDIS_URL: str = Field(..., env="REDIS_URL")
    REDIS_PASSWORD: Optional[str] = Field(default=None, env="REDIS_PASSWORD")
    REDIS_DB: int = Field(default=0, env="REDIS_DB")
    REDIS_MAX_CONNECTIONS: int = Field(default=100, env="REDIS_MAX_CONNECTIONS")
    
    # Message Queue Configuration
    CELERY_BROKER_URL: str = Field(..., env="CELERY_BROKER_URL")
    CELERY_RESULT_BACKEND: str = Field(..., env="CELERY_RESULT_BACKEND")
    CELERY_TASK_SERIALIZER: str = Field(default="json", env="CELERY_TASK_SERIALIZER")
    CELERY_RESULT_SERIALIZER: str = Field(default="json", env="CELERY_RESULT_SERIALIZER")
    
    # JWT Configuration
    JWT_SECRET_KEY: str = Field(..., env="JWT_SECRET_KEY")
    JWT_ALGORITHM: str = Field(default="HS256", env="JWT_ALGORITHM")
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30, env="JWT_ACCESS_TOKEN_EXPIRE_MINUTES")
    
    # WebSocket Configuration
    WS_MAX_CONNECTIONS_PER_USER: int = Field(default=5, env="WS_MAX_CONNECTIONS_PER_USER")
    WS_HEARTBEAT_INTERVAL: int = Field(default=30, env="WS_HEARTBEAT_INTERVAL")
    WS_TIMEOUT: int = Field(default=60, env="WS_TIMEOUT")
    WS_MAX_MESSAGE_SIZE: int = Field(default=65536, env="WS_MAX_MESSAGE_SIZE")
    
    # Chat Configuration
    MAX_MESSAGE_LENGTH: int = Field(default=4000, env="MAX_MESSAGE_LENGTH")
    MAX_FILE_SIZE_MB: int = Field(default=50, env="MAX_FILE_SIZE_MB")
    MAX_GROUP_MEMBERS: int = Field(default=100, env="MAX_GROUP_MEMBERS")
    MESSAGE_RETENTION_DAYS: int = Field(default=365, env="MESSAGE_RETENTION_DAYS")
    TYPING_INDICATOR_TIMEOUT: int = Field(default=10, env="TYPING_INDICATOR_TIMEOUT")
    
    # Encryption Configuration
    ENCRYPTION_KEY: str = Field(..., env="ENCRYPTION_KEY")
    ENCRYPTION_ALGORITHM: str = Field(default="AES-256-GCM", env="ENCRYPTION_ALGORITHM")
    MESSAGE_ENCRYPTION_ENABLED: bool = Field(default=True, env="MESSAGE_ENCRYPTION_ENABLED")
    
    # File Storage Configuration
    AWS_ACCESS_KEY_ID: Optional[str] = Field(default=None, env="AWS_ACCESS_KEY_ID")
    AWS_SECRET_ACCESS_KEY: Optional[str] = Field(default=None, env="AWS_SECRET_ACCESS_KEY")
    AWS_REGION: str = Field(default="us-east-1", env="AWS_REGION")
    AWS_S3_BUCKET: str = Field(..., env="AWS_S3_BUCKET")
    AWS_S3_CHAT_PREFIX: str = Field(default="chat-files/", env="AWS_S3_CHAT_PREFIX")
    CDN_BASE_URL: Optional[str] = Field(default=None, env="CDN_BASE_URL")
    
    # Translation Configuration
    GOOGLE_TRANSLATE_API_KEY: Optional[str] = Field(default=None, env="GOOGLE_TRANSLATE_API_KEY")
    TRANSLATION_ENABLED: bool = Field(default=True, env="TRANSLATION_ENABLED")
    AUTO_TRANSLATE_THRESHOLD: float = Field(default=0.8, env="AUTO_TRANSLATE_THRESHOLD")
    
    # Push Notification Configuration
    FCM_CREDENTIALS_PATH: Optional[str] = Field(default=None, env="FCM_CREDENTIALS_PATH")
    PUSHER_APP_ID: Optional[str] = Field(default=None, env="PUSHER_APP_ID")
    PUSHER_KEY: Optional[str] = Field(default=None, env="PUSHER_KEY")
    PUSHER_SECRET: Optional[str] = Field(default=None, env="PUSHER_SECRET")
    PUSHER_CLUSTER: str = Field(default="us2", env="PUSHER_CLUSTER")
    
    # Communication Platform Integration
    TWILIO_ACCOUNT_SID: Optional[str] = Field(default=None, env="TWILIO_ACCOUNT_SID")
    TWILIO_AUTH_TOKEN: Optional[str] = Field(default=None, env="TWILIO_AUTH_TOKEN")
    TWILIO_PHONE_NUMBER: Optional[str] = Field(default=None, env="TWILIO_PHONE_NUMBER")
    
    TELEGRAM_BOT_TOKEN: Optional[str] = Field(default=None, env="TELEGRAM_BOT_TOKEN")
    SLACK_BOT_TOKEN: Optional[str] = Field(default=None, env="SLACK_BOT_TOKEN")
    DISCORD_BOT_TOKEN: Optional[str] = Field(default=None, env="DISCORD_BOT_TOKEN")
    
    # Video Calling Configuration
    AGORA_APP_ID: Optional[str] = Field(default=None, env="AGORA_APP_ID")
    AGORA_APP_CERTIFICATE: Optional[str] = Field(default=None, env="AGORA_APP_CERTIFICATE")
    JITSI_APP_ID: Optional[str] = Field(default=None, env="JITSI_APP_ID")
    JITSI_PRIVATE_KEY: Optional[str] = Field(default=None, env="JITSI_PRIVATE_KEY")
    ZOOM_API_KEY: Optional[str] = Field(default=None, env="ZOOM_API_KEY")
    ZOOM_API_SECRET: Optional[str] = Field(default=None, env="ZOOM_API_SECRET")
    
    # AI Configuration
    OPENAI_API_KEY: Optional[str] = Field(default=None, env="OPENAI_API_KEY")
    ANTHROPIC_API_KEY: Optional[str] = Field(default=None, env="ANTHROPIC_API_KEY")
    AI_MODERATION_ENABLED: bool = Field(default=True, env="AI_MODERATION_ENABLED")
    AI_TRANSLATION_ENABLED: bool = Field(default=True, env="AI_TRANSLATION_ENABLED")
    AI_ASSISTANT_MODEL: str = Field(default="gpt-4", env="AI_ASSISTANT_MODEL")
    
    # Moderation Configuration
    PROFANITY_CHECK_ENABLED: bool = Field(default=True, env="PROFANITY_CHECK_ENABLED")
    AUTO_MODERATE_ENABLED: bool = Field(default=True, env="AUTO_MODERATE_ENABLED")
    HARASSMENT_DETECTION_ENABLED: bool = Field(default=True, env="HARASSMENT_DETECTION_ENABLED")
    SPAM_DETECTION_ENABLED: bool = Field(default=True, env="SPAM_DETECTION_ENABLED")
    TOXIC_LANGUAGE_THRESHOLD: float = Field(default=0.7, env="TOXIC_LANGUAGE_THRESHOLD")
    
    # Rate Limiting Configuration
    RATE_LIMIT_ENABLED: bool = Field(default=True, env="RATE_LIMIT_ENABLED")
    MESSAGES_PER_MINUTE: int = Field(default=60, env="MESSAGES_PER_MINUTE")
    FILES_PER_HOUR: int = Field(default=20, env="FILES_PER_HOUR")
    GROUPS_PER_DAY: int = Field(default=10, env="GROUPS_PER_DAY")
    
    # Security Configuration
    ALLOWED_HOSTS: List[str] = Field(default=["*"], env="ALLOWED_HOSTS")
    CORS_ORIGINS: List[str] = Field(default=["*"], env="CORS_ORIGINS")
    TRUSTED_PROXIES: List[str] = Field(default=[], env="TRUSTED_PROXIES")
    
    # Emergency Features
    EMERGENCY_CONTACT_ENABLED: bool = Field(default=True, env="EMERGENCY_CONTACT_ENABLED")
    EMERGENCY_PHONE_NUMBERS: List[str] = Field(default=[], env="EMERGENCY_PHONE_NUMBERS")
    PANIC_BUTTON_ENABLED: bool = Field(default=True, env="PANIC_BUTTON_ENABLED")
    
    # Monitoring Configuration
    PROMETHEUS_ENABLED: bool = Field(default=True, env="PROMETHEUS_ENABLED")
    METRICS_PORT: int = Field(default=9090, env="METRICS_PORT")
    LOG_LEVEL: str = Field(default="INFO", env="LOG_LEVEL")
    STRUCTURED_LOGGING: bool = Field(default=True, env="STRUCTURED_LOGGING")
    
    # External Service URLs
    USER_SERVICE_URL: str = Field(..., env="USER_SERVICE_URL")
    NOTIFICATION_SERVICE_URL: str = Field(..., env="NOTIFICATION_SERVICE_URL")
    BOOKING_SERVICE_URL: str = Field(..., env="BOOKING_SERVICE_URL")
    PROPERTY_SERVICE_URL: str = Field(..., env="PROPERTY_SERVICE_URL")
    
    # Voice Message Configuration
    VOICE_MESSAGE_MAX_DURATION: int = Field(default=300, env="VOICE_MESSAGE_MAX_DURATION")  # 5 minutes
    VOICE_MESSAGE_FORMATS: List[str] = Field(default=["mp3", "wav", "ogg"], env="VOICE_MESSAGE_FORMATS")
    VOICE_TRANSCRIPTION_ENABLED: bool = Field(default=True, env="VOICE_TRANSCRIPTION_ENABLED")
    
    # Screen Sharing Configuration
    SCREEN_SHARE_ENABLED: bool = Field(default=True, env="SCREEN_SHARE_ENABLED")
    SCREEN_SHARE_MAX_DURATION: int = Field(default=3600, env="SCREEN_SHARE_MAX_DURATION")  # 1 hour
    SCREEN_SHARE_QUALITY: str = Field(default="720p", env="SCREEN_SHARE_QUALITY")
    
    # Message Template Configuration
    TEMPLATE_SYSTEM_ENABLED: bool = Field(default=True, env="TEMPLATE_SYSTEM_ENABLED")
    MAX_TEMPLATES_PER_USER: int = Field(default=50, env="MAX_TEMPLATES_PER_USER")
    TEMPLATE_MAX_LENGTH: int = Field(default=1000, env="TEMPLATE_MAX_LENGTH")
    
    # Message Scheduling Configuration
    MESSAGE_SCHEDULING_ENABLED: bool = Field(default=True, env="MESSAGE_SCHEDULING_ENABLED")
    MAX_SCHEDULED_MESSAGES: int = Field(default=100, env="MAX_SCHEDULED_MESSAGES")
    SCHEDULE_ADVANCE_LIMIT_DAYS: int = Field(default=30, env="SCHEDULE_ADVANCE_LIMIT_DAYS")
    
    @validator("ALLOWED_HOSTS", pre=True)
    def parse_allowed_hosts(cls, v):
        if isinstance(v, str):
            return [host.strip() for host in v.split(",")]
        return v
    
    @validator("CORS_ORIGINS", pre=True)
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v
    
    @validator("EMERGENCY_PHONE_NUMBERS", pre=True)
    def parse_emergency_numbers(cls, v):
        if isinstance(v, str):
            return [number.strip() for number in v.split(",")]
        return v
    
    @validator("VOICE_MESSAGE_FORMATS", pre=True)
    def parse_voice_formats(cls, v):
        if isinstance(v, str):
            return [format.strip() for format in v.split(",")]
        return v
    
    @property
    def database_url_sync(self) -> str:
        """Get synchronous database URL for Alembic"""
        return self.DATABASE_URL.replace("asyncpg", "postgresql")
    
    @property
    def redis_url_complete(self) -> str:
        """Get complete Redis URL with password and db"""
        url = self.REDIS_URL
        if self.REDIS_PASSWORD:
            # Insert password into URL if not already present
            if "@" not in url and "redis://" in url:
                url = url.replace("redis://", f"redis://:{self.REDIS_PASSWORD}@")
        if not url.endswith(f"/{self.REDIS_DB}"):
            url = f"{url}/{self.REDIS_DB}"
        return url
    
    @property
    def max_file_size_bytes(self) -> int:
        """Get max file size in bytes"""
        return self.MAX_FILE_SIZE_MB * 1024 * 1024
    
    def get_external_service_url(self, service_name: str) -> str:
        """Get external service URL by name"""
        service_urls = {
            "user": self.USER_SERVICE_URL,
            "notification": self.NOTIFICATION_SERVICE_URL,
            "booking": self.BOOKING_SERVICE_URL,
            "property": self.PROPERTY_SERVICE_URL,
        }
        return service_urls.get(service_name, "")
    
    def is_production(self) -> bool:
        """Check if running in production environment"""
        return self.ENVIRONMENT.lower() == "production"
    
    def is_development(self) -> bool:
        """Check if running in development environment"""
        return self.ENVIRONMENT.lower() == "development"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


# Global settings instance
settings = Settings()