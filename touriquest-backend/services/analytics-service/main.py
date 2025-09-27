"""
Analytics Service Main Application

TouriQuest Analytics Service - Comprehensive analytics and business intelligence
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
from datetime import datetime

from app.core.config import settings
from app.core.database import init_db, close_db

# Import routers
from app.api.endpoints import (
    dashboard, revenue, users, properties, trends, 
    pois, experiences, traffic, conversion, retention,
    engagement, performance, reports, realtime, forecasting
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    logger.info("Starting Analytics Service...")
    
    # Initialize database connections
    await init_db()
    logger.info("Database connections initialized")
    
    yield
    
    # Cleanup
    logger.info("Shutting down Analytics Service...")
    await close_db()
    logger.info("Database connections closed")


# Create FastAPI application
app = FastAPI(
    title="TouriQuest Analytics Service",
    description="Comprehensive analytics and business intelligence service for TouriQuest platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler for unhandled errors"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Internal server error",
            "message": str(exc) if settings.DEBUG else "An unexpected error occurred",
            "timestamp": datetime.utcnow().isoformat()
        }
    )


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "TouriQuest Analytics Service",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with service information"""
    return {
        "service": "TouriQuest Analytics Service",
        "version": "1.0.0",
        "description": "Comprehensive analytics and business intelligence service",
        "docs_url": "/docs",
        "health_url": "/health",
        "endpoints": {
            "dashboard": "/analytics/dashboard",
            "revenue": "/analytics/revenue",
            "users": "/analytics/users",
            "properties": "/analytics/properties",
            "trends": "/analytics/trends",
            "pois": "/analytics/pois",
            "experiences": "/analytics/experiences",
            "traffic": "/analytics/traffic",
            "conversion": "/analytics/conversion",
            "retention": "/analytics/retention",
            "engagement": "/analytics/engagement",
            "performance": "/analytics/performance",
            "reports": "/analytics/reports",
            "realtime": "/analytics/realtime",
            "forecasting": "/analytics/forecasting"
        },
        "timestamp": datetime.utcnow().isoformat()
    }


# Include API routers
app.include_router(dashboard.router)
app.include_router(revenue.router)
app.include_router(users.router)
app.include_router(properties.router)
app.include_router(trends.router)
app.include_router(pois.router)
app.include_router(experiences.router)
app.include_router(traffic.router)
app.include_router(conversion.router)
app.include_router(retention.router)
app.include_router(engagement.router)
app.include_router(performance.router)
app.include_router(reports.router)
app.include_router(realtime.router)
app.include_router(forecasting.router)


# Additional middleware for request logging
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests"""
    start_time = datetime.utcnow()
    
    # Process request
    response = await call_next(request)
    
    # Log request details
    process_time = (datetime.utcnow() - start_time).total_seconds()
    logger.info(
        f"{request.method} {request.url.path} - "
        f"Status: {response.status_code} - "
        f"Time: {process_time:.3f}s"
    )
    
    return response


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )