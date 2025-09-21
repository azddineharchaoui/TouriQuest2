"""
Configuration settings for monitoring service
"""

from typing import List, Optional, Dict, Any
from pydantic import Field, validator
from pydantic_settings import BaseSettings
import os


class Settings(BaseSettings):
    """Application settings"""
    
    # Application settings
    APP_NAME: str = "TouriQuest Monitoring Service"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = Field(default=False, env="DEBUG")
    API_V1_STR: str = "/api/v1"
    
    # Server settings
    HOST: str = Field(default="0.0.0.0", env="HOST")
    PORT: int = Field(default=8000, env="PORT")
    RELOAD: bool = Field(default=False, env="RELOAD")
    
    # Database settings
    DATABASE_URL: str = Field(..., env="DATABASE_URL")
    DATABASE_POOL_SIZE: int = Field(default=20, env="DATABASE_POOL_SIZE")
    DATABASE_MAX_OVERFLOW: int = Field(default=30, env="DATABASE_MAX_OVERFLOW")
    
    # Redis settings
    REDIS_URL: str = Field(..., env="REDIS_URL")
    REDIS_PASSWORD: Optional[str] = Field(default=None, env="REDIS_PASSWORD")
    REDIS_DB: int = Field(default=0, env="REDIS_DB")
    REDIS_POOL_SIZE: int = Field(default=20, env="REDIS_POOL_SIZE")
    
    # Prometheus settings
    PROMETHEUS_METRICS_PATH: str = Field(default="/metrics", env="PROMETHEUS_METRICS_PATH")
    PROMETHEUS_PUSHGATEWAY_URL: Optional[str] = Field(default=None, env="PROMETHEUS_PUSHGATEWAY_URL")
    PROMETHEUS_JOB_NAME: str = Field(default="monitoring-service", env="PROMETHEUS_JOB_NAME")
    
    # Jaeger tracing settings
    JAEGER_AGENT_HOST: str = Field(default="localhost", env="JAEGER_AGENT_HOST")
    JAEGER_AGENT_PORT: int = Field(default=6831, env="JAEGER_AGENT_PORT")
    JAEGER_SERVICE_NAME: str = Field(default="monitoring-service", env="JAEGER_SERVICE_NAME")
    JAEGER_ENABLED: bool = Field(default=True, env="JAEGER_ENABLED")
    
    # Elasticsearch settings
    ELASTICSEARCH_URL: str = Field(..., env="ELASTICSEARCH_URL")
    ELASTICSEARCH_USERNAME: Optional[str] = Field(default=None, env="ELASTICSEARCH_USERNAME")
    ELASTICSEARCH_PASSWORD: Optional[str] = Field(default=None, env="ELASTICSEARCH_PASSWORD")
    ELASTICSEARCH_INDEX_PREFIX: str = Field(default="touriquest", env="ELASTICSEARCH_INDEX_PREFIX")
    ELASTICSEARCH_LOG_INDEX: str = Field(default="logs", env="ELASTICSEARCH_LOG_INDEX")
    ELASTICSEARCH_METRICS_INDEX: str = Field(default="metrics", env="ELASTICSEARCH_METRICS_INDEX")
    
    # Sentry settings
    SENTRY_DSN: Optional[str] = Field(default=None, env="SENTRY_DSN")
    SENTRY_ENVIRONMENT: str = Field(default="production", env="SENTRY_ENVIRONMENT")
    SENTRY_SAMPLE_RATE: float = Field(default=1.0, env="SENTRY_SAMPLE_RATE")
    
    # PagerDuty settings
    PAGERDUTY_API_KEY: Optional[str] = Field(default=None, env="PAGERDUTY_API_KEY")
    PAGERDUTY_SERVICE_ID: Optional[str] = Field(default=None, env="PAGERDUTY_SERVICE_ID")
    PAGERDUTY_ESCALATION_POLICY_ID: Optional[str] = Field(default=None, env="PAGERDUTY_ESCALATION_POLICY_ID")
    
    # Slack settings
    SLACK_BOT_TOKEN: Optional[str] = Field(default=None, env="SLACK_BOT_TOKEN")
    SLACK_CHANNEL_ALERTS: str = Field(default="#alerts", env="SLACK_CHANNEL_ALERTS")
    SLACK_CHANNEL_METRICS: str = Field(default="#metrics", env="SLACK_CHANNEL_METRICS")
    
    # Health check settings
    HEALTH_CHECK_INTERVAL: int = Field(default=60, env="HEALTH_CHECK_INTERVAL")  # seconds
    HEALTH_CHECK_TIMEOUT: int = Field(default=30, env="HEALTH_CHECK_TIMEOUT")  # seconds
    HEALTH_CHECK_RETRIES: int = Field(default=3, env="HEALTH_CHECK_RETRIES")
    
    # Performance monitoring settings
    PERFORMANCE_THRESHOLD_RESPONSE_TIME: float = Field(default=1.0, env="PERFORMANCE_THRESHOLD_RESPONSE_TIME")  # seconds
    PERFORMANCE_THRESHOLD_ERROR_RATE: float = Field(default=0.05, env="PERFORMANCE_THRESHOLD_ERROR_RATE")  # 5%
    PERFORMANCE_THRESHOLD_CPU_USAGE: float = Field(default=80.0, env="PERFORMANCE_THRESHOLD_CPU_USAGE")  # percentage
    PERFORMANCE_THRESHOLD_MEMORY_USAGE: float = Field(default=85.0, env="PERFORMANCE_THRESHOLD_MEMORY_USAGE")  # percentage
    
    # Alert settings
    ALERT_COOLDOWN_PERIOD: int = Field(default=300, env="ALERT_COOLDOWN_PERIOD")  # seconds
    ALERT_MAX_FREQUENCY: int = Field(default=10, env="ALERT_MAX_FREQUENCY")  # per hour
    ALERT_ESCALATION_TIMEOUT: int = Field(default=1800, env="ALERT_ESCALATION_TIMEOUT")  # seconds
    
    # Service dependencies
    EXTERNAL_SERVICES: Dict[str, str] = Field(
        default={
            "user-service": "http://user-service:8000/health",
            "property-service": "http://property-service:8000/health",
            "booking-service": "http://booking-service:8000/health",
            "analytics-service": "http://analytics-service:8000/health",
            "ai-service": "http://ai-service:8000/health",
            "experience-service": "http://experience-service:8000/health",
            "media-service": "http://media-service:8000/health",
            "notification-service": "http://notification-service:8000/health",
            "auth-service": "http://auth-service:8000/health",
            "admin-service": "http://admin-service:8000/health",
            "poi-service": "http://poi-service:8000/health",
            "recommendation-service": "http://recommendation-service:8000/health",
            "api-gateway": "http://api-gateway:8000/health"
        },
        env="EXTERNAL_SERVICES"
    )
    
    # CORS settings
    ALLOWED_ORIGINS: List[str] = Field(
        default=["http://localhost:3000", "http://localhost:8080"],
        env="ALLOWED_ORIGINS"
    )
    ALLOWED_METHODS: List[str] = Field(
        default=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        env="ALLOWED_METHODS"
    )
    ALLOWED_HEADERS: List[str] = Field(
        default=["*"],
        env="ALLOWED_HEADERS"
    )
    
    # Logging settings
    LOG_LEVEL: str = Field(default="INFO", env="LOG_LEVEL")
    LOG_FORMAT: str = Field(default="json", env="LOG_FORMAT")  # json or text
    LOG_RETENTION_DAYS: int = Field(default=30, env="LOG_RETENTION_DAYS")
    
    # Metrics collection settings
    METRICS_COLLECTION_INTERVAL: int = Field(default=15, env="METRICS_COLLECTION_INTERVAL")  # seconds
    METRICS_RETENTION_DAYS: int = Field(default=90, env="METRICS_RETENTION_DAYS")
    CUSTOM_METRICS_ENABLED: bool = Field(default=True, env="CUSTOM_METRICS_ENABLED")
    
    # Tracing settings
    TRACING_SAMPLE_RATE: float = Field(default=0.1, env="TRACING_SAMPLE_RATE")  # 10%
    TRACING_MAX_TAG_LENGTH: int = Field(default=1024, env="TRACING_MAX_TAG_LENGTH")
    
    # Security settings
    SECRET_KEY: str = Field(..., env="SECRET_KEY")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30, env="ACCESS_TOKEN_EXPIRE_MINUTES")
    API_KEY_HEADER: str = Field(default="X-API-Key", env="API_KEY_HEADER")
    
    # Rate limiting
    RATE_LIMIT_ENABLED: bool = Field(default=True, env="RATE_LIMIT_ENABLED")
    RATE_LIMIT_REQUESTS: int = Field(default=100, env="RATE_LIMIT_REQUESTS")
    RATE_LIMIT_PERIOD: int = Field(default=60, env="RATE_LIMIT_PERIOD")  # seconds
    
    @validator("EXTERNAL_SERVICES", pre=True)
    def parse_external_services(cls, v):
        """Parse external services from environment variable"""
        if isinstance(v, str):
            try:
                import json
                return json.loads(v)
            except json.JSONDecodeError:
                return {}
        return v
    
    @validator("ALLOWED_ORIGINS", pre=True)
    def parse_allowed_origins(cls, v):
        """Parse allowed origins from environment variable"""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v
    
    @validator("ALLOWED_METHODS", pre=True)
    def parse_allowed_methods(cls, v):
        """Parse allowed methods from environment variable"""
        if isinstance(v, str):
            return [method.strip() for method in v.split(",")]
        return v
    
    @validator("ALLOWED_HEADERS", pre=True)
    def parse_allowed_headers(cls, v):
        """Parse allowed headers from environment variable"""
        if isinstance(v, str):
            return [header.strip() for header in v.split(",")]
        return v
    
    @property
    def elasticsearch_auth(self) -> Optional[tuple]:
        """Get Elasticsearch authentication tuple"""
        if self.ELASTICSEARCH_USERNAME and self.ELASTICSEARCH_PASSWORD:
            return (self.ELASTICSEARCH_USERNAME, self.ELASTICSEARCH_PASSWORD)
        return None
    
    @property
    def is_production(self) -> bool:
        """Check if running in production environment"""
        return not self.DEBUG
    
    @property
    def jaeger_config(self) -> Dict[str, Any]:
        """Get Jaeger configuration"""
        return {
            "service_name": self.JAEGER_SERVICE_NAME,
            "agent_host_name": self.JAEGER_AGENT_HOST,
            "agent_port": self.JAEGER_AGENT_PORT,
            "enabled": self.JAEGER_ENABLED,
            "sampler": {
                "type": "probabilistic",
                "param": self.TRACING_SAMPLE_RATE,
            },
        }
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


# Global settings instance
settings = Settings()


# Environment-specific configurations
def get_cors_settings() -> Dict[str, Any]:
    """Get CORS configuration based on environment"""
    return {
        "allow_origins": settings.ALLOWED_ORIGINS,
        "allow_credentials": True,
        "allow_methods": settings.ALLOWED_METHODS,
        "allow_headers": settings.ALLOWED_HEADERS,
    }


def get_logging_config() -> Dict[str, Any]:
    """Get logging configuration"""
    return {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "default": {
                "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            },
            "json": {
                "format": "%(asctime)s %(name)s %(levelname)s %(message)s",
                "class": "pythonjsonlogger.jsonlogger.JsonFormatter",
            },
        },
        "handlers": {
            "default": {
                "formatter": "json" if settings.LOG_FORMAT == "json" else "default",
                "class": "logging.StreamHandler",
                "stream": "ext://sys.stdout",
            },
        },
        "root": {
            "level": settings.LOG_LEVEL,
            "handlers": ["default"],
        },
        "loggers": {
            "uvicorn": {"level": "INFO"},
            "uvicorn.error": {"level": "INFO"},
            "uvicorn.access": {"level": "INFO"},
            "sqlalchemy.engine": {"level": "WARNING"},
        },
    }


def get_sentry_config() -> Dict[str, Any]:
    """Get Sentry configuration"""
    return {
        "dsn": settings.SENTRY_DSN,
        "environment": settings.SENTRY_ENVIRONMENT,
        "sample_rate": settings.SENTRY_SAMPLE_RATE,
        "traces_sample_rate": settings.TRACING_SAMPLE_RATE,
        "integrations": [],
        "before_send": lambda event, hint: event if settings.SENTRY_DSN else None,
    }


def get_database_url() -> str:
    """Get database URL with pool settings"""
    return settings.DATABASE_URL


def get_redis_url() -> str:
    """Get Redis URL"""
    if settings.REDIS_PASSWORD:
        # Parse URL and add password
        from urllib.parse import urlparse, urlunparse
        parsed = urlparse(settings.REDIS_URL)
        netloc = f":{settings.REDIS_PASSWORD}@{parsed.hostname}:{parsed.port or 6379}"
        return urlunparse(parsed._replace(netloc=netloc))
    return settings.REDIS_URL