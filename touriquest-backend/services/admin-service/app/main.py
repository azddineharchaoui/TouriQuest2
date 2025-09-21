"""Main FastAPI application for TouriQuest Admin Service."""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
import structlog
import time
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import init_db
from app.api.endpoints import (
    dashboard,
    users,
    content_moderation,
    financial,
    properties,
    analytics,
    reports,
    auth,
    alerts
)
from app.services.websocket_manager import websocket_manager
from app.utils.monitoring import setup_monitoring

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management."""
    # Startup
    logger.info("Starting TouriQuest Admin Service")
    
    # Initialize database
    await init_db()
    
    # Setup monitoring
    setup_monitoring()
    
    logger.info("Admin Service startup complete")
    
    yield
    
    # Shutdown
    logger.info("Shutting down TouriQuest Admin Service")


# Create FastAPI application
app = FastAPI(
    title="TouriQuest Admin Service",
    description="Comprehensive admin panel for TouriQuest platform management",
    version="1.0.0",
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT != "production" else None,
    openapi_url="/openapi.json" if settings.ENVIRONMENT != "production" else None,
    lifespan=lifespan
)


# Security Middleware
if settings.ENVIRONMENT == "production":
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=settings.ALLOWED_HOSTS
    )


# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["*"],
)


# Request/Response Middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all requests and responses."""
    start_time = time.time()
    
    # Log request
    logger.info(
        "Request received",
        method=request.method,
        url=str(request.url),
        client_ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    
    try:
        response = await call_next(request)
        
        # Calculate request duration
        duration = time.time() - start_time
        
        # Log response
        logger.info(
            "Request completed",
            method=request.method,
            url=str(request.url),
            status_code=response.status_code,
            duration=f"{duration:.3f}s"
        )
        
        return response
        
    except Exception as e:
        duration = time.time() - start_time
        
        # Log error
        logger.error(
            "Request failed",
            method=request.method,
            url=str(request.url),
            duration=f"{duration:.3f}s",
            error=str(e)
        )
        
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"}
        )


# Exception Handlers
@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    """Handle 404 Not Found errors."""
    return JSONResponse(
        status_code=404,
        content={
            "detail": "Resource not found",
            "path": str(request.url.path)
        }
    )


@app.exception_handler(500)
async def internal_error_handler(request: Request, exc):
    """Handle 500 Internal Server errors."""
    logger.error(
        "Internal server error",
        url=str(request.url),
        error=str(exc)
    )
    
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "error_id": "Please contact support with this error ID"
        }
    )


# API Routes
app.include_router(
    auth.router,
    prefix="/api/v1/auth",
    tags=["Authentication"]
)

app.include_router(
    dashboard.router,
    prefix="/api/v1/dashboard",
    tags=["Dashboard"]
)

app.include_router(
    users.router,
    prefix="/api/v1/users",
    tags=["User Management"]
)

app.include_router(
    content_moderation.router,
    prefix="/api/v1/content-moderation",
    tags=["Content Moderation"]
)

app.include_router(
    financial.router,
    prefix="/api/v1/financial",
    tags=["Financial Management"]
)

app.include_router(
    properties.router,
    prefix="/api/v1/properties",
    tags=["Property Management"]
)

app.include_router(
    analytics.router,
    prefix="/api/v1/analytics",
    tags=["Analytics"]
)

app.include_router(
    reports.router,
    prefix="/api/v1/reports",
    tags=["Reports"]
)

app.include_router(
    alerts.router,
    prefix="/api/v1/alerts",
    tags=["Alerts"]
)


# WebSocket endpoint
app.add_websocket_route("/ws/{admin_id}", websocket_manager.websocket_endpoint)


# Health Check Endpoints
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "touriquest-admin-service",
        "version": "1.0.0",
        "timestamp": time.time()
    }


@app.get("/health/ready")
async def readiness_check():
    """Readiness check endpoint."""
    # In a production environment, you would check:
    # - Database connectivity
    # - External service availability
    # - Required environment variables
    
    return {
        "status": "ready",
        "checks": {
            "database": "ok",
            "redis": "ok",
            "external_services": "ok"
        }
    }


@app.get("/")
async def root():
    """Root endpoint with service information."""
    return {
        "service": "TouriQuest Admin Service",
        "version": "1.0.0",
        "description": "Comprehensive admin panel for TouriQuest platform management",
        "docs_url": "/docs" if settings.ENVIRONMENT != "production" else None,
        "status": "operational"
    }


# Admin Service Information
@app.get("/api/v1/info")
async def service_info():
    """Get service information and capabilities."""
    return {
        "service": "TouriQuest Admin Service",
        "version": "1.0.0",
        "features": [
            "User management and moderation",
            "Property approval workflow",
            "Content moderation tools",
            "Booking dispute resolution",
            "Payment and financial oversight",
            "System monitoring and health",
            "Analytics dashboard with real-time metrics",
            "Role-based access control",
            "Audit logging for all admin actions",
            "Real-time dashboard updates",
            "Export functionality for reports",
            "Alert system for critical issues"
        ],
        "endpoints": {
            "auth": "/api/v1/auth",
            "dashboard": "/api/v1/dashboard",
            "users": "/api/v1/users",
            "content_moderation": "/api/v1/content-moderation",
            "financial": "/api/v1/financial",
            "properties": "/api/v1/properties",
            "analytics": "/api/v1/analytics",
            "reports": "/api/v1/reports",
            "alerts": "/api/v1/alerts"
        },
        "websocket": "/ws/{admin_id}",
        "documentation": "/docs" if settings.ENVIRONMENT != "production" else None
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8001,
        reload=settings.ENVIRONMENT == "development",
        log_level="info"
    )