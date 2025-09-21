"""
Configuration management for the integrations service
"""

import os
from typing import List, Optional, Dict, Any
from pydantic import Field, validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Comprehensive settings for the integrations service"""
    
    # Service configuration
    SERVICE_NAME: str = "integrations-service"
    ENVIRONMENT: str = Field(default="development", env="ENVIRONMENT")
    DEBUG: bool = Field(default=True, env="DEBUG")
    HOST: str = Field(default="0.0.0.0", env="HOST")
    PORT: int = Field(default=8005, env="PORT")
    BASE_URL: str = Field(default="http://localhost:8005", env="BASE_URL")
    
    # Security
    SECRET_KEY: str = Field(..., env="SECRET_KEY")
    JWT_SECRET_KEY: str = Field(..., env="JWT_SECRET_KEY")
    JWT_ALGORITHM: str = Field(default="HS256", env="JWT_ALGORITHM")
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30, env="JWT_ACCESS_TOKEN_EXPIRE_MINUTES")
    
    # Database
    DATABASE_URL: str = Field(..., env="DATABASE_URL")
    DATABASE_POOL_SIZE: int = Field(default=20, env="DATABASE_POOL_SIZE")
    DATABASE_MAX_OVERFLOW: int = Field(default=30, env="DATABASE_MAX_OVERFLOW")
    
    # Redis
    REDIS_URL: str = Field(..., env="REDIS_URL")
    REDIS_MAX_CONNECTIONS: int = Field(default=50, env="REDIS_MAX_CONNECTIONS")
    REDIS_RETRY_ON_TIMEOUT: bool = Field(default=True, env="REDIS_RETRY_ON_TIMEOUT")
    
    # CORS
    CORS_ORIGINS: List[str] = Field(default=["*"], env="CORS_ORIGINS")
    ALLOWED_HOSTS: List[str] = Field(default=["*"], env="ALLOWED_HOSTS")
    
    # Logging
    LOG_LEVEL: str = Field(default="INFO", env="LOG_LEVEL")
    
    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = Field(default=1000, env="RATE_LIMIT_REQUESTS")
    RATE_LIMIT_WINDOW: int = Field(default=3600, env="RATE_LIMIT_WINDOW")  # 1 hour
    
    # ===================
    # PAYMENT INTEGRATIONS
    # ===================
    
    # Stripe
    STRIPE_PUBLISHABLE_KEY: Optional[str] = Field(default=None, env="STRIPE_PUBLISHABLE_KEY")
    STRIPE_SECRET_KEY: Optional[str] = Field(default=None, env="STRIPE_SECRET_KEY")
    STRIPE_WEBHOOK_SECRET: Optional[str] = Field(default=None, env="STRIPE_WEBHOOK_SECRET")
    STRIPE_CONNECT_CLIENT_ID: Optional[str] = Field(default=None, env="STRIPE_CONNECT_CLIENT_ID")
    STRIPE_PLATFORM_FEE_PERCENT: float = Field(default=3.0, env="STRIPE_PLATFORM_FEE_PERCENT")
    
    # PayPal
    PAYPAL_CLIENT_ID: Optional[str] = Field(default=None, env="PAYPAL_CLIENT_ID")
    PAYPAL_CLIENT_SECRET: Optional[str] = Field(default=None, env="PAYPAL_CLIENT_SECRET")
    PAYPAL_WEBHOOK_ID: Optional[str] = Field(default=None, env="PAYPAL_WEBHOOK_ID")
    PAYPAL_MODE: str = Field(default="sandbox", env="PAYPAL_MODE")  # sandbox or live
    
    # Braintree (for PayPal, Apple Pay, Google Pay)
    BRAINTREE_MERCHANT_ID: Optional[str] = Field(default=None, env="BRAINTREE_MERCHANT_ID")
    BRAINTREE_PUBLIC_KEY: Optional[str] = Field(default=None, env="BRAINTREE_PUBLIC_KEY")
    BRAINTREE_PRIVATE_KEY: Optional[str] = Field(default=None, env="BRAINTREE_PRIVATE_KEY")
    BRAINTREE_ENVIRONMENT: str = Field(default="Sandbox", env="BRAINTREE_ENVIRONMENT")
    
    # ===================
    # MAPPING SERVICES
    # ===================
    
    # Google Maps
    GOOGLE_MAPS_API_KEY: Optional[str] = Field(default=None, env="GOOGLE_MAPS_API_KEY")
    GOOGLE_PLACES_API_KEY: Optional[str] = Field(default=None, env="GOOGLE_PLACES_API_KEY")
    GOOGLE_GEOCODING_API_KEY: Optional[str] = Field(default=None, env="GOOGLE_GEOCODING_API_KEY")
    GOOGLE_DIRECTIONS_API_KEY: Optional[str] = Field(default=None, env="GOOGLE_DIRECTIONS_API_KEY")
    
    # Mapbox
    MAPBOX_ACCESS_TOKEN: Optional[str] = Field(default=None, env="MAPBOX_ACCESS_TOKEN")
    MAPBOX_SECRET_TOKEN: Optional[str] = Field(default=None, env="MAPBOX_SECRET_TOKEN")
    
    # Location services
    LOCATION_CACHE_TTL: int = Field(default=3600, env="LOCATION_CACHE_TTL")  # 1 hour
    GEOCODING_RATE_LIMIT: int = Field(default=50, env="GEOCODING_RATE_LIMIT")  # per minute
    
    # ===================
    # COMMUNICATION SERVICES
    # ===================
    
    # SendGrid
    SENDGRID_API_KEY: Optional[str] = Field(default=None, env="SENDGRID_API_KEY")
    SENDGRID_FROM_EMAIL: str = Field(default="noreply@touriquest.com", env="SENDGRID_FROM_EMAIL")
    SENDGRID_FROM_NAME: str = Field(default="TouriQuest", env="SENDGRID_FROM_NAME")
    
    # Twilio
    TWILIO_ACCOUNT_SID: Optional[str] = Field(default=None, env="TWILIO_ACCOUNT_SID")
    TWILIO_AUTH_TOKEN: Optional[str] = Field(default=None, env="TWILIO_AUTH_TOKEN")
    TWILIO_PHONE_NUMBER: Optional[str] = Field(default=None, env="TWILIO_PHONE_NUMBER")
    TWILIO_WHATSAPP_NUMBER: Optional[str] = Field(default=None, env="TWILIO_WHATSAPP_NUMBER")
    
    # AWS SES
    AWS_ACCESS_KEY_ID: Optional[str] = Field(default=None, env="AWS_ACCESS_KEY_ID")
    AWS_SECRET_ACCESS_KEY: Optional[str] = Field(default=None, env="AWS_SECRET_ACCESS_KEY")
    AWS_REGION: str = Field(default="us-east-1", env="AWS_REGION")
    AWS_SES_SOURCE_EMAIL: str = Field(default="noreply@touriquest.com", env="AWS_SES_SOURCE_EMAIL")
    
    # Slack
    SLACK_BOT_TOKEN: Optional[str] = Field(default=None, env="SLACK_BOT_TOKEN")
    SLACK_WEBHOOK_URL: Optional[str] = Field(default=None, env="SLACK_WEBHOOK_URL")
    SLACK_ADMIN_CHANNEL: str = Field(default="#admin-alerts", env="SLACK_ADMIN_CHANNEL")
    
    # WhatsApp Business
    WHATSAPP_TOKEN: Optional[str] = Field(default=None, env="WHATSAPP_TOKEN")
    WHATSAPP_PHONE_ID: Optional[str] = Field(default=None, env="WHATSAPP_PHONE_ID")
    WHATSAPP_BUSINESS_ID: Optional[str] = Field(default=None, env="WHATSAPP_BUSINESS_ID")
    
    # ===================
    # EXTERNAL APIS
    # ===================
    
    # OpenAI
    OPENAI_API_KEY: Optional[str] = Field(default=None, env="OPENAI_API_KEY")
    OPENAI_MODEL: str = Field(default="gpt-4", env="OPENAI_MODEL")
    OPENAI_MAX_TOKENS: int = Field(default=1000, env="OPENAI_MAX_TOKENS")
    
    # Anthropic
    ANTHROPIC_API_KEY: Optional[str] = Field(default=None, env="ANTHROPIC_API_KEY")
    ANTHROPIC_MODEL: str = Field(default="claude-3-sonnet-20240229", env="ANTHROPIC_MODEL")
    
    # Google Translate
    GOOGLE_TRANSLATE_API_KEY: Optional[str] = Field(default=None, env="GOOGLE_TRANSLATE_API_KEY")
    GOOGLE_TRANSLATE_PROJECT_ID: Optional[str] = Field(default=None, env="GOOGLE_TRANSLATE_PROJECT_ID")
    
    # Weather services
    OPENWEATHER_API_KEY: Optional[str] = Field(default=None, env="OPENWEATHER_API_KEY")
    WEATHERAPI_KEY: Optional[str] = Field(default=None, env="WEATHERAPI_KEY")
    
    # Currency exchange
    EXCHANGERATE_API_KEY: Optional[str] = Field(default=None, env="EXCHANGERATE_API_KEY")
    FIXER_API_KEY: Optional[str] = Field(default=None, env="FIXER_API_KEY")
    
    # Social media
    TWITTER_API_KEY: Optional[str] = Field(default=None, env="TWITTER_API_KEY")
    TWITTER_API_SECRET: Optional[str] = Field(default=None, env="TWITTER_API_SECRET")
    TWITTER_ACCESS_TOKEN: Optional[str] = Field(default=None, env="TWITTER_ACCESS_TOKEN")
    TWITTER_ACCESS_SECRET: Optional[str] = Field(default=None, env="TWITTER_ACCESS_SECRET")
    
    FACEBOOK_APP_ID: Optional[str] = Field(default=None, env="FACEBOOK_APP_ID")
    FACEBOOK_APP_SECRET: Optional[str] = Field(default=None, env="FACEBOOK_APP_SECRET")
    
    INSTAGRAM_CLIENT_ID: Optional[str] = Field(default=None, env="INSTAGRAM_CLIENT_ID")
    INSTAGRAM_CLIENT_SECRET: Optional[str] = Field(default=None, env="INSTAGRAM_CLIENT_SECRET")
    
    # Flight and transportation
    AMADEUS_API_KEY: Optional[str] = Field(default=None, env="AMADEUS_API_KEY")
    AMADEUS_API_SECRET: Optional[str] = Field(default=None, env="AMADEUS_API_SECRET")
    SKYSCANNER_API_KEY: Optional[str] = Field(default=None, env="SKYSCANNER_API_KEY")
    
    # Calendar services
    GOOGLE_CALENDAR_CLIENT_ID: Optional[str] = Field(default=None, env="GOOGLE_CALENDAR_CLIENT_ID")
    GOOGLE_CALENDAR_CLIENT_SECRET: Optional[str] = Field(default=None, env="GOOGLE_CALENDAR_CLIENT_SECRET")
    
    # ===================
    # INTEGRATION SETTINGS
    # ===================
    
    # Webhook security
    WEBHOOK_SECRET: str = Field(..., env="WEBHOOK_SECRET")
    WEBHOOK_TIMEOUT: int = Field(default=30, env="WEBHOOK_TIMEOUT")
    WEBHOOK_RETRY_ATTEMPTS: int = Field(default=3, env="WEBHOOK_RETRY_ATTEMPTS")
    
    # Rate limiting for external APIs
    EXTERNAL_API_RATE_LIMIT: int = Field(default=100, env="EXTERNAL_API_RATE_LIMIT")  # per minute
    EXTERNAL_API_BURST_LIMIT: int = Field(default=20, env="EXTERNAL_API_BURST_LIMIT")  # per second
    
    # Caching
    CACHE_TTL_SHORT: int = Field(default=300, env="CACHE_TTL_SHORT")      # 5 minutes
    CACHE_TTL_MEDIUM: int = Field(default=1800, env="CACHE_TTL_MEDIUM")   # 30 minutes
    CACHE_TTL_LONG: int = Field(default=3600, env="CACHE_TTL_LONG")       # 1 hour
    CACHE_TTL_DAILY: int = Field(default=86400, env="CACHE_TTL_DAILY")    # 24 hours
    
    # Circuit breaker settings
    CIRCUIT_BREAKER_FAILURE_THRESHOLD: int = Field(default=5, env="CIRCUIT_BREAKER_FAILURE_THRESHOLD")
    CIRCUIT_BREAKER_RESET_TIMEOUT: int = Field(default=60, env="CIRCUIT_BREAKER_RESET_TIMEOUT")
    
    # Retry settings
    RETRY_MAX_ATTEMPTS: int = Field(default=3, env="RETRY_MAX_ATTEMPTS")
    RETRY_BACKOFF_FACTOR: float = Field(default=2.0, env="RETRY_BACKOFF_FACTOR")
    RETRY_MAX_WAIT_TIME: int = Field(default=300, env="RETRY_MAX_WAIT_TIME")  # 5 minutes
    
    # Cost optimization
    COST_TRACKING_ENABLED: bool = Field(default=True, env="COST_TRACKING_ENABLED")
    MONTHLY_API_BUDGET: float = Field(default=1000.0, env="MONTHLY_API_BUDGET")  # USD
    COST_ALERT_THRESHOLD: float = Field(default=0.8, env="COST_ALERT_THRESHOLD")  # 80%
    
    # Monitoring
    METRICS_ENABLED: bool = Field(default=True, env="METRICS_ENABLED")
    HEALTH_CHECK_INTERVAL: int = Field(default=30, env="HEALTH_CHECK_INTERVAL")  # seconds
    
    # Feature flags
    FEATURE_PAYMENT_STRIPE: bool = Field(default=True, env="FEATURE_PAYMENT_STRIPE")
    FEATURE_PAYMENT_PAYPAL: bool = Field(default=True, env="FEATURE_PAYMENT_PAYPAL")
    FEATURE_MAPS_GOOGLE: bool = Field(default=True, env="FEATURE_MAPS_GOOGLE")
    FEATURE_MAPS_MAPBOX: bool = Field(default=True, env="FEATURE_MAPS_MAPBOX")
    FEATURE_EMAIL_SENDGRID: bool = Field(default=True, env="FEATURE_EMAIL_SENDGRID")
    FEATURE_SMS_TWILIO: bool = Field(default=True, env="FEATURE_SMS_TWILIO")
    FEATURE_TRANSLATION: bool = Field(default=True, env="FEATURE_TRANSLATION")
    FEATURE_WEATHER: bool = Field(default=True, env="FEATURE_WEATHER")
    FEATURE_CURRENCY: bool = Field(default=True, env="FEATURE_CURRENCY")
    
    @validator("CORS_ORIGINS", pre=True)
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v
    
    @validator("ALLOWED_HOSTS", pre=True)
    def parse_allowed_hosts(cls, v):
        if isinstance(v, str):
            return [host.strip() for host in v.split(",")]
        return v
    
    @property
    def redis_url_complete(self) -> str:
        """Complete Redis URL with connection parameters"""
        return f"{self.REDIS_URL}?max_connections={self.REDIS_MAX_CONNECTIONS}&retry_on_timeout={self.REDIS_RETRY_ON_TIMEOUT}"
    
    @property
    def database_url_async(self) -> str:
        """Async database URL for SQLAlchemy"""
        if self.DATABASE_URL.startswith("postgresql://"):
            return self.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
        return self.DATABASE_URL
    
    def get_service_config(self, service_name: str) -> Dict[str, Any]:
        """Get configuration for a specific service"""
        configs = {
            "stripe": {
                "enabled": self.FEATURE_PAYMENT_STRIPE,
                "publishable_key": self.STRIPE_PUBLISHABLE_KEY,
                "secret_key": self.STRIPE_SECRET_KEY,
                "webhook_secret": self.STRIPE_WEBHOOK_SECRET,
                "platform_fee": self.STRIPE_PLATFORM_FEE_PERCENT
            },
            "paypal": {
                "enabled": self.FEATURE_PAYMENT_PAYPAL,
                "client_id": self.PAYPAL_CLIENT_ID,
                "client_secret": self.PAYPAL_CLIENT_SECRET,
                "mode": self.PAYPAL_MODE
            },
            "google_maps": {
                "enabled": self.FEATURE_MAPS_GOOGLE,
                "api_key": self.GOOGLE_MAPS_API_KEY,
                "places_key": self.GOOGLE_PLACES_API_KEY,
                "geocoding_key": self.GOOGLE_GEOCODING_API_KEY
            },
            "mapbox": {
                "enabled": self.FEATURE_MAPS_MAPBOX,
                "access_token": self.MAPBOX_ACCESS_TOKEN,
                "secret_token": self.MAPBOX_SECRET_TOKEN
            },
            "sendgrid": {
                "enabled": self.FEATURE_EMAIL_SENDGRID,
                "api_key": self.SENDGRID_API_KEY,
                "from_email": self.SENDGRID_FROM_EMAIL,
                "from_name": self.SENDGRID_FROM_NAME
            },
            "twilio": {
                "enabled": self.FEATURE_SMS_TWILIO,
                "account_sid": self.TWILIO_ACCOUNT_SID,
                "auth_token": self.TWILIO_AUTH_TOKEN,
                "phone_number": self.TWILIO_PHONE_NUMBER
            }
        }
        return configs.get(service_name, {})
    
    def is_service_enabled(self, service_name: str) -> bool:
        """Check if a service is enabled and properly configured"""
        config = self.get_service_config(service_name)
        return config.get("enabled", False) and self._has_required_keys(config)
    
    def _has_required_keys(self, config: Dict[str, Any]) -> bool:
        """Check if configuration has required non-None values"""
        required_keys = ["api_key", "secret_key", "access_token", "client_id"]
        return any(
            key in config and config[key] is not None 
            for key in required_keys
        )
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Global settings instance
settings = Settings()