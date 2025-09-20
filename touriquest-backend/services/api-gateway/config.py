"""
API Gateway configuration
"""
import os
from pydantic import BaseSettings
from typing import List, Dict, Any


class GatewaySettings(BaseSettings):
    """API Gateway configuration settings."""
    
    # Application settings
    app_name: str = "TouriQuest API Gateway"
    app_version: str = "1.0.0"
    debug: bool = False
    
    # Server settings
    host: str = "0.0.0.0"
    port: int = 8000
    workers: int = 1
    
    # CORS settings
    cors_origins: List[str] = [
        "http://localhost:3000",
        "https://touriquest.com",
        "https://app.touriquest.com",
    ]
    
    # Rate limiting
    rate_limit_requests: int = 1000
    rate_limit_window: int = 60  # seconds
    
    # Service discovery
    service_discovery_enabled: bool = True
    consul_host: str = "localhost"
    consul_port: int = 8500
    
    # Load balancing
    load_balancing_strategy: str = "round_robin"  # round_robin, least_connections, weighted
    
    # Circuit breaker
    circuit_breaker_enabled: bool = True
    circuit_breaker_failure_threshold: int = 5
    circuit_breaker_timeout: int = 60
    
    # Timeouts
    default_timeout: float = 30.0
    ai_service_timeout: float = 60.0
    media_service_timeout: float = 45.0
    
    # Authentication
    jwt_secret_key: str = "your-secret-key-change-in-production"
    jwt_algorithm: str = "HS256"
    
    # Monitoring
    metrics_enabled: bool = True
    jaeger_host: str = "localhost"
    jaeger_port: int = 14268
    
    # Security
    trusted_hosts: List[str] = ["localhost", "*.touriquest.com"]
    
    class Config:
        env_file = ".env"
        env_prefix = "GATEWAY_"


settings = GatewaySettings()