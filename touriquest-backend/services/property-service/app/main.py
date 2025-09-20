"""
Property Service - TouriQuest Platform
Advanced property search and management microservice
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from contextlib import asynccontextmanager
import structlog
from prometheus_client import make_asgi_app

from app.core.config import get_settings
from app.core.database import engine, init_db
from app.core.elasticsearch import elasticsearch_client, init_elasticsearch
from app.core.redis import redis_client, init_redis
from app.api.v1.router import api_router
from app.core.middleware import (
    LoggingMiddleware,
    MetricsMiddleware,
    RateLimitMiddleware,
)

logger = structlog.get_logger()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    settings = get_settings()
    
    # Initialize services
    logger.info("Initializing Property Service...")
    
    # Initialize database
    await init_db()
    logger.info("Database initialized")
    
    # Initialize Redis
    await init_redis()
    logger.info("Redis initialized")
    
    # Initialize Elasticsearch
    await init_elasticsearch()
    logger.info("Elasticsearch initialized")
    
    logger.info("Property Service startup complete")
    
    yield
    
    # Cleanup
    logger.info("Shutting down Property Service...")
    
    # Close connections
    if redis_client:
        await redis_client.close()
    
    if elasticsearch_client:
        await elasticsearch_client.close()
    
    logger.info("Property Service shutdown complete")

def create_app() -> FastAPI:
    """Create FastAPI application instance"""
    settings = get_settings()
    
    app = FastAPI(
        title="TouriQuest Property Service",
        description="Advanced property search and management microservice",
        version="1.0.0",
        docs_url="/docs" if settings.environment != "production" else None,
        redoc_url="/redoc" if settings.environment != "production" else None,
        lifespan=lifespan,
    )
    
    # Add middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    app.add_middleware(GZipMiddleware, minimum_size=1000)
    app.add_middleware(LoggingMiddleware)
    app.add_middleware(MetricsMiddleware)
    app.add_middleware(RateLimitMiddleware)
    
    # Include API routes
    app.include_router(api_router, prefix="/api/v1")
    
    # Add Prometheus metrics endpoint
    metrics_app = make_asgi_app()
    app.mount("/metrics", metrics_app)
    
    # Health check endpoint
    @app.get("/health")
    async def health_check():
        return {
            "status": "healthy",
            "service": "property-service",
            "version": "1.0.0"
        }
    
    return app

# Create app instance
app = create_app()

if __name__ == "__main__":
    import uvicorn
    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=settings.environment == "development",
        log_level="info"
    )