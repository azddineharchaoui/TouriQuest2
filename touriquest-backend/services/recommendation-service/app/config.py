"""
Configuration management for recommendation service.
"""
import os
from typing import Dict, Any, Optional
from pydantic import BaseSettings, Field
from enum import Enum


class Environment(str, Enum):
    """Environment types."""
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"


class DatabaseConfig(BaseSettings):
    """Database configuration."""
    host: str = Field(default="localhost", env="DB_HOST")
    port: int = Field(default=5432, env="DB_PORT")
    name: str = Field(default="touriquest", env="DB_NAME")
    user: str = Field(default="postgres", env="DB_USER")
    password: str = Field(default="", env="DB_PASSWORD")
    pool_size: int = Field(default=10, env="DB_POOL_SIZE")
    max_connections: int = Field(default=20, env="DB_MAX_CONNECTIONS")
    
    @property
    def url(self) -> str:
        """Get database URL."""
        return f"postgresql://{self.user}:{self.password}@{self.host}:{self.port}/{self.name}"


class RedisConfig(BaseSettings):
    """Redis configuration."""
    host: str = Field(default="localhost", env="REDIS_HOST")
    port: int = Field(default=6379, env="REDIS_PORT")
    password: Optional[str] = Field(default=None, env="REDIS_PASSWORD")
    db: int = Field(default=0, env="REDIS_DB")
    max_connections: int = Field(default=10, env="REDIS_MAX_CONNECTIONS")
    
    @property
    def url(self) -> str:
        """Get Redis URL."""
        auth = f":{self.password}@" if self.password else ""
        return f"redis://{auth}{self.host}:{self.port}/{self.db}"


class MLConfig(BaseSettings):
    """Machine Learning configuration."""
    model_cache_size: int = Field(default=5, env="ML_MODEL_CACHE_SIZE")
    feature_cache_ttl: int = Field(default=3600, env="ML_FEATURE_CACHE_TTL")  # seconds
    recommendation_cache_ttl: int = Field(default=1800, env="ML_RECOMMENDATION_CACHE_TTL")  # seconds
    batch_size: int = Field(default=32, env="ML_BATCH_SIZE")
    max_recommendations: int = Field(default=100, env="ML_MAX_RECOMMENDATIONS")
    min_confidence_threshold: float = Field(default=0.1, env="ML_MIN_CONFIDENCE")
    
    # Algorithm weights
    collaborative_weight: float = Field(default=0.35, env="ML_COLLABORATIVE_WEIGHT")
    content_weight: float = Field(default=0.30, env="ML_CONTENT_WEIGHT")
    matrix_factorization_weight: float = Field(default=0.25, env="ML_MATRIX_FACTORIZATION_WEIGHT")
    popularity_weight: float = Field(default=0.10, env="ML_POPULARITY_WEIGHT")
    
    # Training parameters
    matrix_factors: int = Field(default=50, env="ML_MATRIX_FACTORS")
    learning_rate: float = Field(default=0.01, env="ML_LEARNING_RATE")
    regularization: float = Field(default=0.02, env="ML_REGULARIZATION")
    iterations: int = Field(default=100, env="ML_ITERATIONS")


class APIConfig(BaseSettings):
    """API configuration."""
    host: str = Field(default="0.0.0.0", env="API_HOST")
    port: int = Field(default=8000, env="API_PORT")
    workers: int = Field(default=1, env="API_WORKERS")
    reload: bool = Field(default=False, env="API_RELOAD")
    debug: bool = Field(default=False, env="API_DEBUG")
    
    # CORS settings
    cors_origins: list = Field(default=["*"], env="API_CORS_ORIGINS")
    cors_methods: list = Field(default=["*"], env="API_CORS_METHODS")
    cors_headers: list = Field(default=["*"], env="API_CORS_HEADERS")
    
    # Rate limiting
    rate_limit_requests: int = Field(default=1000, env="API_RATE_LIMIT_REQUESTS")
    rate_limit_window: int = Field(default=3600, env="API_RATE_LIMIT_WINDOW")  # seconds
    
    # Authentication
    jwt_secret_key: str = Field(default="dev-secret-key", env="JWT_SECRET_KEY")
    jwt_algorithm: str = Field(default="HS256", env="JWT_ALGORITHM")
    jwt_expiration: int = Field(default=86400, env="JWT_EXPIRATION")  # seconds


class MonitoringConfig(BaseSettings):
    """Monitoring and observability configuration."""
    enable_metrics: bool = Field(default=True, env="MONITORING_ENABLE_METRICS")
    enable_tracing: bool = Field(default=True, env="MONITORING_ENABLE_TRACING")
    enable_logging: bool = Field(default=True, env="MONITORING_ENABLE_LOGGING")
    
    # Prometheus
    prometheus_host: str = Field(default="localhost", env="PROMETHEUS_HOST")
    prometheus_port: int = Field(default=9090, env="PROMETHEUS_PORT")
    
    # Logging
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    log_format: str = Field(default="json", env="LOG_FORMAT")
    
    # Alerting
    alert_webhook_url: Optional[str] = Field(default=None, env="ALERT_WEBHOOK_URL")
    slack_webhook_url: Optional[str] = Field(default=None, env="SLACK_WEBHOOK_URL")
    
    # Health checks
    health_check_interval: int = Field(default=30, env="HEALTH_CHECK_INTERVAL")  # seconds


class ABTestingConfig(BaseSettings):
    """A/B Testing configuration."""
    enable_ab_testing: bool = Field(default=True, env="AB_TESTING_ENABLE")
    default_traffic_allocation: float = Field(default=0.1, env="AB_TESTING_DEFAULT_TRAFFIC")
    minimum_sample_size: int = Field(default=1000, env="AB_TESTING_MIN_SAMPLE_SIZE")
    significance_level: float = Field(default=0.05, env="AB_TESTING_SIGNIFICANCE_LEVEL")
    power: float = Field(default=0.8, env="AB_TESTING_POWER")
    
    # Experiment duration limits
    min_experiment_days: int = Field(default=7, env="AB_TESTING_MIN_DAYS")
    max_experiment_days: int = Field(default=90, env="AB_TESTING_MAX_DAYS")


class Settings(BaseSettings):
    """Main application settings."""
    
    # Environment
    environment: Environment = Field(default=Environment.DEVELOPMENT, env="ENVIRONMENT")
    debug: bool = Field(default=False, env="DEBUG")
    testing: bool = Field(default=False, env="TESTING")
    
    # Service info
    service_name: str = Field(default="recommendation-service", env="SERVICE_NAME")
    service_version: str = Field(default="1.0.0", env="SERVICE_VERSION")
    
    # Subsystem configurations
    database: DatabaseConfig = DatabaseConfig()
    redis: RedisConfig = RedisConfig()
    ml: MLConfig = MLConfig()
    api: APIConfig = APIConfig()
    monitoring: MonitoringConfig = MonitoringConfig()
    ab_testing: ABTestingConfig = ABTestingConfig()
    
    class Config:
        env_file = ".env"
        case_sensitive = False
    
    @property
    def is_development(self) -> bool:
        """Check if running in development mode."""
        return self.environment == Environment.DEVELOPMENT
    
    @property
    def is_production(self) -> bool:
        """Check if running in production mode."""
        return self.environment == Environment.PRODUCTION
    
    def get_algorithm_weights(self) -> Dict[str, float]:
        """Get algorithm weights as dictionary."""
        return {
            "collaborative_filtering": self.ml.collaborative_weight,
            "content_based": self.ml.content_weight,
            "matrix_factorization": self.ml.matrix_factorization_weight,
            "popularity": self.ml.popularity_weight
        }
    
    def validate_weights(self) -> bool:
        """Validate that algorithm weights sum to 1.0."""
        weights = self.get_algorithm_weights()
        total_weight = sum(weights.values())
        return abs(total_weight - 1.0) < 0.01  # Allow small floating point errors


# Global settings instance
settings = Settings()


# Environment-specific overrides
if settings.environment == Environment.PRODUCTION:
    # Production overrides
    settings.api.debug = False
    settings.api.reload = False
    settings.monitoring.log_level = "WARNING"
elif settings.environment == Environment.DEVELOPMENT:
    # Development overrides
    settings.api.debug = True
    settings.api.reload = True
    settings.monitoring.log_level = "DEBUG"


def get_settings() -> Settings:
    """Get application settings."""
    return settings


def update_settings(**kwargs) -> None:
    """Update settings (for testing purposes)."""
    global settings
    for key, value in kwargs.items():
        if hasattr(settings, key):
            setattr(settings, key, value)


# Validate configuration on import
if not settings.validate_weights():
    raise ValueError(
        f"Algorithm weights do not sum to 1.0: {settings.get_algorithm_weights()}"
    )