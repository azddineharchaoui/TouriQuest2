"""
TouriQuest POI Service - Main FastAPI Application
Points of Interest Discovery and Management System
"""

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
import time
from typing import Union

# Internal imports
from app.core.config import settings
from app.db.database import create_tables
from app.api import pois, reviews

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper()),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info("Starting TouriQuest POI Service...")
    
    try:
        # Initialize database
        await create_tables()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down TouriQuest POI Service...")


# Create FastAPI app
app = FastAPI(
    title="TouriQuest POI Service",
    description="Points of Interest Discovery and Management System",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan
)

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.add_middleware(GZipMiddleware, minimum_size=1000)


# Custom middleware for request timing and logging
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    # Process request
    response = await call_next(request)
    
    # Calculate processing time
    process_time = time.time() - start_time
    
    # Log request details
    logger.info(
        f"Request: {request.method} {request.url.path} "
        f"completed in {process_time:.3f}s with status {response.status_code}"
    )
    
    # Add timing header
    response.headers["X-Process-Time"] = str(process_time)
    
    return response


# Exception handlers
@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception in {request.url.path}: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "internal_server_error",
            "message": "An unexpected error occurred",
            "details": str(exc) if settings.debug else None
        }
    )


# Health check endpoints
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "poi-service",
        "version": "1.0.0",
        "timestamp": time.time()
    }


@app.get("/health/ready")
async def readiness_check():
    """Readiness check endpoint"""
    # TODO: Add actual database connectivity check
    return {
        "status": "ready",
        "service": "poi-service",
        "checks": {
            "database": "healthy",
            "redis": "healthy"
        }
    }


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with service information"""
    return {
        "service": "TouriQuest POI Service",
        "version": "1.0.0",
        "description": "Points of Interest Discovery and Management System",
        "endpoints": {
            "docs": "/docs",
            "redoc": "/redoc",
            "openapi": "/openapi.json",
            "health": "/health",
            "pois": "/api/v1/pois"
        }
    }


# Include API routers
app.include_router(
    pois.router,
    prefix=f"{settings.api_v1_prefix}/pois",
    tags=["POIs"],
    responses={
        404: {"description": "POI not found"},
        422: {"description": "Validation error"},
        500: {"description": "Internal server error"}
    }
)

app.include_router(
    reviews.router,
    prefix=f"{settings.api_v1_prefix}/pois",
    tags=["Reviews"],
    responses={
        404: {"description": "Review or POI not found"},
        422: {"description": "Validation error"},
        500: {"description": "Internal server error"}
    }
)


# Development endpoints (only in debug mode)
if settings.debug:
    @app.get("/debug/info")
    async def debug_info():
        """Debug information endpoint (development only)"""
        return {
            "environment": settings.environment,
            "debug": settings.debug,
            "database_url": settings.database_url.split("@")[-1],  # Hide credentials
            "redis_url": settings.redis_url,
            "max_search_radius_km": settings.max_search_radius_km,
            "default_search_results": settings.default_search_results
        }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
        log_level=settings.log_level.lower()
    )