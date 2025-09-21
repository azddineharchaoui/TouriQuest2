"""
Main FastAPI application for recommendation service.
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import logging
from contextlib import asynccontextmanager

from app.api.recommendations import router as recommendations_router
from app.core.recommendation_engine import recommendation_engine
from app.utils.ab_testing import experiment_manager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    logger.info("Starting recommendation service...")
    
    # Initialize recommendation engine
    await recommendation_engine.initialize()
    
    # Initialize A/B testing framework
    await experiment_manager.initialize()
    
    logger.info("Recommendation service started successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down recommendation service...")
    
    # Cleanup resources
    await recommendation_engine.cleanup()
    await experiment_manager.cleanup()
    
    logger.info("Recommendation service shut down successfully")


# Create FastAPI app
app = FastAPI(
    title="TouriQuest Recommendation Service",
    description="Advanced recommendation system for travel experiences",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(GZipMiddleware, minimum_size=1000)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all requests."""
    start_time = time.time()
    
    response = await call_next(request)
    
    process_time = time.time() - start_time
    logger.info(
        f"{request.method} {request.url.path} - "
        f"Status: {response.status_code} - "
        f"Time: {process_time:.3f}s"
    )
    
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler."""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": "An unexpected error occurred"
        }
    )


# Health check endpoints
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "recommendation-service",
        "version": "1.0.0"
    }


@app.get("/health/ready")
async def readiness_check():
    """Readiness check endpoint."""
    # Check if recommendation engine is ready
    is_ready = recommendation_engine.model_manager.is_initialized()
    
    if not is_ready:
        return JSONResponse(
            status_code=503,
            content={
                "status": "not ready",
                "message": "Recommendation engine not initialized"
            }
        )
    
    return {
        "status": "ready",
        "models_loaded": len(recommendation_engine.model_manager.get_model_info())
    }


@app.get("/health/live")
async def liveness_check():
    """Liveness check endpoint."""
    return {
        "status": "alive",
        "timestamp": str(datetime.utcnow())
    }


# Include routers
app.include_router(
    recommendations_router,
    prefix="/api/v1",
    tags=["recommendations"]
)


# A/B testing endpoints
@app.get("/api/v1/experiments")
async def list_experiments():
    """List all active experiments."""
    try:
        experiments = await experiment_manager.ab_framework.list_experiments()
        return {"experiments": experiments}
    except Exception as e:
        logger.error(f"Error listing experiments: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/api/v1/experiments")
async def create_experiment(experiment_config: dict):
    """Create a new A/B testing experiment."""
    try:
        experiment_id = await experiment_manager.ab_framework.create_experiment(
            name=experiment_config['name'],
            description=experiment_config.get('description', ''),
            variants=experiment_config['variants'],
            traffic_allocation=experiment_config.get('traffic_allocation', {}),
            success_metrics=experiment_config.get('success_metrics', []),
            minimum_sample_size=experiment_config.get('minimum_sample_size', 1000)
        )
        
        return {
            "experiment_id": experiment_id,
            "status": "created",
            "message": "Experiment created successfully"
        }
    except Exception as e:
        logger.error(f"Error creating experiment: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/api/v1/experiments/{experiment_id}/results")
async def get_experiment_results(experiment_id: str):
    """Get experiment results and statistical analysis."""
    try:
        results = await experiment_manager.ab_framework.get_experiment_results(experiment_id)
        return {"experiment_id": experiment_id, "results": results}
    except Exception as e:
        logger.error(f"Error getting experiment results: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


if __name__ == "__main__":
    import time
    from datetime import datetime
    from fastapi import HTTPException
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )