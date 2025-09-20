"""
TouriQuest Media Service Main Application
FastAPI application with media management, processing, and content features
"""
import os
import logging
from contextlib import asynccontextmanager
from typing import Dict, Any

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from .core.config import settings
from .core.database import engine, Base
from .api.routes import media_routes
from .tasks.media_processing import celery_app


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    
    # Startup
    logger.info("Starting TouriQuest Media Service...")
    
    # Create database tables
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Failed to create database tables: {e}")
        raise
    
    # Initialize NLTK data
    try:
        import nltk
        nltk.download('punkt', quiet=True)
        nltk.download('stopwords', quiet=True)
        logger.info("NLTK data initialized")
    except Exception as e:
        logger.warning(f"Failed to initialize NLTK data: {e}")
    
    # Verify AWS connection
    try:
        import boto3
        s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION
        )
        s3_client.head_bucket(Bucket=settings.S3_BUCKET_NAME)
        logger.info("AWS S3 connection verified")
    except Exception as e:
        logger.warning(f"AWS S3 connection failed: {e}")
    
    # Verify Redis connection for Celery
    try:
        import redis
        redis_client = redis.from_url(settings.CELERY_BROKER_URL)
        redis_client.ping()
        logger.info("Redis connection verified")
    except Exception as e:
        logger.warning(f"Redis connection failed: {e}")
    
    logger.info("Media Service startup completed")
    
    yield
    
    # Shutdown
    logger.info("Shutting down TouriQuest Media Service...")


# Create FastAPI application
app = FastAPI(
    title="TouriQuest Media Service",
    description="""
    Comprehensive media management service for TouriQuest platform.
    
    Features:
    - Media upload and storage (images, videos, audio, documents)
    - Automatic image optimization and video transcoding
    - Content moderation and AI analysis
    - Advanced search and duplicate detection
    - Multi-language content support
    - DMCA compliance tools
    - Background processing pipeline
    - Analytics and usage tracking
    """,
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_url="/openapi.json" if settings.DEBUG else None,
    lifespan=lifespan
)

# Add security middleware
if not settings.DEBUG:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=settings.ALLOWED_HOSTS
    )

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"]
)


# Exception handlers
@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    """Handle validation errors"""
    return JSONResponse(
        status_code=400,
        content={
            "error": "Validation Error",
            "detail": str(exc),
            "type": "value_error"
        }
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": "HTTP Error",
            "detail": exc.detail,
            "type": "http_error"
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions"""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    
    if settings.DEBUG:
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal Server Error",
                "detail": str(exc),
                "type": "internal_error"
            }
        )
    else:
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal Server Error",
                "detail": "An unexpected error occurred",
                "type": "internal_error"
            }
        )


# Health check endpoint
@app.get("/health")
async def health_check() -> Dict[str, Any]:
    """Health check endpoint"""
    
    health_status = {
        "status": "healthy",
        "service": "media-service",
        "version": "1.0.0",
        "timestamp": "2024-01-01T00:00:00Z",
        "checks": {}
    }
    
    # Database health check
    try:
        from .core.database import get_db
        db = next(get_db())
        db.execute("SELECT 1")
        health_status["checks"]["database"] = "healthy"
    except Exception as e:
        health_status["checks"]["database"] = f"unhealthy: {str(e)}"
        health_status["status"] = "unhealthy"
    
    # Redis health check
    try:
        import redis
        redis_client = redis.from_url(settings.CELERY_BROKER_URL)
        redis_client.ping()
        health_status["checks"]["redis"] = "healthy"
    except Exception as e:
        health_status["checks"]["redis"] = f"unhealthy: {str(e)}"
        health_status["status"] = "degraded"
    
    # S3 health check
    try:
        import boto3
        s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION
        )
        s3_client.head_bucket(Bucket=settings.S3_BUCKET_NAME)
        health_status["checks"]["s3"] = "healthy"
    except Exception as e:
        health_status["checks"]["s3"] = f"unhealthy: {str(e)}"
        health_status["status"] = "degraded"
    
    return health_status


# Metrics endpoint for Prometheus
@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint"""
    
    try:
        from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
        from fastapi.responses import Response
        
        return Response(
            generate_latest(),
            media_type=CONTENT_TYPE_LATEST
        )
    except ImportError:
        return {"error": "Prometheus client not available"}


# Include API routes
app.include_router(
    media_routes.router,
    prefix="/api/v1"
)


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with service information"""
    return {
        "service": "TouriQuest Media Service",
        "version": "1.0.0",
        "description": "Media management and content processing service",
        "docs": "/docs" if settings.DEBUG else "Documentation not available in production",
        "health": "/health",
        "metrics": "/metrics"
    }


def main():
    """Main entry point for running the service"""
    
    # Configuration for uvicorn
    config = {
        "app": "app.main:app",
        "host": settings.HOST,
        "port": settings.PORT,
        "reload": settings.DEBUG,
        "log_level": "info" if not settings.DEBUG else "debug",
        "access_log": True,
        "server_header": False,
        "date_header": False,
    }
    
    # Add SSL configuration if certificates are provided
    if settings.SSL_CERT_PATH and settings.SSL_KEY_PATH:
        config.update({
            "ssl_certfile": settings.SSL_CERT_PATH,
            "ssl_keyfile": settings.SSL_KEY_PATH,
        })
    
    logger.info(f"Starting Media Service on {settings.HOST}:{settings.PORT}")
    logger.info(f"Debug mode: {settings.DEBUG}")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    
    uvicorn.run(**config)


if __name__ == "__main__":
    main()