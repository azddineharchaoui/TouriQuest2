"""
Core configuration settings for the AI service.
"""
from functools import lru_cache
from typing import Any, Dict, Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings with environment variable support."""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True
    )
    
    # Service Configuration
    app_name: str = "TouriQuest AI Service"
    app_version: str = "1.0.0"
    debug: bool = Field(default=False, env="DEBUG")
    host: str = Field(default="0.0.0.0", env="AI_SERVICE_HOST")
    port: int = Field(default=8003, env="AI_SERVICE_PORT")
    
    # Security
    secret_key: str = Field(..., env="SECRET_KEY")
    access_token_expire_minutes: int = Field(default=30, env="ACCESS_TOKEN_EXPIRE_MINUTES")
    
    # Database Configuration
    database_url: str = Field(..., env="DATABASE_URL")
    redis_url: str = Field(default="redis://localhost:6379/0", env="REDIS_URL")
    
    # AI Configuration
    google_gemini_api_key: str = Field(..., env="GOOGLE_GEMINI_API_KEY")
    gemini_model: str = Field(default="gemma-27b-it", env="GEMINI_MODEL")
    openai_api_key: Optional[str] = Field(default=None, env="OPENAI_API_KEY")
    
    # Voice Processing
    voice_model_path: str = Field(default="./models/whisper-base", env="VOICE_MODEL_PATH")
    tts_language: str = Field(default="en", env="TTS_LANGUAGE")
    tts_slow: bool = Field(default=False, env="TTS_SLOW")
    
    # Conversation Settings
    max_conversation_history: int = Field(default=50, env="MAX_CONVERSATION_HISTORY")
    context_window_size: int = Field(default=4000, env="CONTEXT_WINDOW_SIZE")
    
    # Performance Settings
    max_file_size: int = Field(default=25 * 1024 * 1024, env="MAX_FILE_SIZE")  # 25MB
    embedding_dimension: int = Field(default=384, env="EMBEDDING_DIMENSION")
    
    # External Services
    weather_api_key: Optional[str] = Field(default=None, env="WEATHER_API_KEY")
    maps_api_key: Optional[str] = Field(default=None, env="MAPS_API_KEY")
    
    # Redis TTL Settings (in seconds)
    conversation_cache_ttl: int = Field(default=3600, env="CONVERSATION_CACHE_TTL")  # 1 hour
    context_cache_ttl: int = Field(default=1800, env="CONTEXT_CACHE_TTL")  # 30 minutes
    
    # Logging
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    
    # Rate Limiting
    rate_limit_requests: int = Field(default=100, env="RATE_LIMIT_REQUESTS")
    rate_limit_window: int = Field(default=60, env="RATE_LIMIT_WINDOW")  # seconds
    
    @property
    def redis_config(self) -> Dict[str, Any]:
        """Redis connection configuration."""
        return {
            "url": self.redis_url,
            "encoding": "utf-8",
            "decode_responses": True,
            "health_check_interval": 30,
        }
    
    @property
    def cors_origins(self) -> list[str]:
        """CORS allowed origins."""
        if self.debug:
            return ["*"]
        return [
            "https://touriquest.com",
            "https://www.touriquest.com",
            "https://app.touriquest.com",
            "http://localhost:3000",
            "http://localhost:5173",
        ]


@lru_cache()
def get_settings() -> Settings:
    """Get cached application settings."""
    return Settings()


# Global settings instance
settings = get_settings()