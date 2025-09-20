"""
Authentication Service configuration
"""
import os
from pydantic import BaseSettings
from typing import List


class AuthSettings(BaseSettings):
    """Authentication service configuration settings."""
    
    # Application settings
    app_name: str = "TouriQuest Auth Service"
    app_version: str = "1.0.0"
    debug: bool = False
    
    # Server settings
    host: str = "0.0.0.0"
    port: int = 8000
    
    # Database settings
    database_url: str = "postgresql+asyncpg://user:password@postgres:5432/touriquest_auth"
    redis_url: str = "redis://redis:6379/0"
    
    # JWT settings
    jwt_secret_key: str = "your-super-secret-jwt-key-change-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    
    # Password settings
    password_min_length: int = 8
    password_require_uppercase: bool = True
    password_require_lowercase: bool = True
    password_require_numbers: bool = True
    password_require_special: bool = True
    
    # Rate limiting
    login_rate_limit: int = 10  # per 5 minutes
    register_rate_limit: int = 5  # per 5 minutes
    password_reset_rate_limit: int = 3  # per hour
    
    # Email settings
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_use_tls: bool = True
    
    # OAuth settings
    google_client_id: str = ""
    google_client_secret: str = ""
    facebook_app_id: str = ""
    facebook_app_secret: str = ""
    
    # Security settings
    bcrypt_rounds: int = 12
    session_timeout_hours: int = 24
    max_login_attempts: int = 5
    account_lockout_duration_minutes: int = 30
    
    # Email verification
    email_verification_required: bool = True
    email_verification_token_expire_hours: int = 24
    
    # CORS settings
    cors_origins: List[str] = [
        "http://localhost:3000",
        "https://touriquest.com",
        "https://app.touriquest.com",
    ]
    
    class Config:
        env_file = ".env"
        env_prefix = "AUTH_"


settings = AuthSettings()