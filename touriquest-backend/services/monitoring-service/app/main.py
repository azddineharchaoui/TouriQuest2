"""
FastAPI endpoints for monitoring and observability API
"""

from typing import Dict, List, Optional, Any, Union
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException, Depends, Query, Path, Body, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import StreamingResponse, JSONResponse, Response
from pydantic import BaseModel, Field, validator
import asyncio
import json
import logging
from contextlib import asynccontextmanager

from app.core.config import settings
from app.services.health_service import health_service, HealthCheckResult
from app.services.metrics_service import metrics_service
from app.services.tracing_service import tracing_service
from app.services.alerting_service import alerting_service, Alert, AlertRule, AlertSeverity, AlertSource, AlertStatus
from app.services.logging_service import logging_service, LogQuery, LogLevel


logger = logging.getLogger(__name__)

# Security
security = HTTPBearer(auto_error=False)


# Request/Response Models
class HealthCheckResponse(BaseModel):
    """Health check response model"""
    status: str
    timestamp: datetime
    service: str
    version: str
    checks: Dict[str, Any]
    performance: Dict[str, Any]


class MetricsResponse(BaseModel):
    """Metrics response model"""
    timestamp: datetime
    service: str
    metrics: Dict[str, Any]


class MonitoringStatusResponse(BaseModel):
    """Monitoring status response model"""
    monitoring_enabled: bool
    services: Dict[str, Any]
    active_alerts: int
    last_updated: datetime


class AlertConfigRequest(BaseModel):
    """Alert configuration request model"""
    rule_id: str
    name: str
    description: str
    service: str
    metric_name: str
    condition: str = Field(..., regex="^(gt|lt|eq|ne|gte|lte)$")
    threshold: float
    severity: AlertSeverity
    evaluation_window: int = Field(default=300, ge=60, le=3600)
    cooldown: int = Field(default=3600, ge=300, le=86400)
    enabled: bool = True
    notification_channels: List[str] = []
    tags: Dict[str, str] = {}


class AlertResponse(BaseModel):
    """Alert response model"""
    id: str
    title: str
    description: str
    severity: AlertSeverity
    status: AlertStatus
    service: str
    created_at: datetime
    updated_at: datetime
    tags: Dict[str, str]


class LogSearchRequest(BaseModel):
    """Log search request model"""
    query: Optional[str] = None
    level: Optional[LogLevel] = None
    service: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    trace_id: Optional[str] = None
    user_id: Optional[str] = None
    tags: Dict[str, str] = {}
    limit: int = Field(default=100, ge=1, le=1000)
    offset: int = Field(default=0, ge=0)
    sort_field: str = Field(default="timestamp")
    sort_order: str = Field(default="desc", regex="^(asc|desc)$")


class LogSearchResponse(BaseModel):
    """Log search response model"""
    logs: List[Dict[str, Any]]
    total: int
    took: Optional[int] = None
    query: Dict[str, Any]


class TraceResponse(BaseModel):
    """Trace response model"""
    trace_id: str
    spans: List[Dict[str, Any]]
    duration_ms: Optional[float] = None
    service_count: int
    error_count: int


# Authentication
async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> bool:
    """Verify API token"""
    if not credentials:
        if settings.MONITORING_API_REQUIRE_AUTH:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing authentication token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return True
    
    # In a real implementation, you would verify the token against a database
    # or external service. For now, we'll use a simple comparison.
    if credentials.credentials != settings.MONITORING_API_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return True


# Rate limiting (simplified implementation)
from collections import defaultdict
import time

request_counts = defaultdict(list)
RATE_LIMIT = 100  # requests per minute
RATE_WINDOW = 60  # seconds


async def rate_limit_check(request_ip: str = None) -> bool:
    """Simple rate limiting check"""
    if not settings.MONITORING_API_RATE_LIMIT_ENABLED:
        return True
    
    current_time = time.time()
    ip = request_ip or "default"
    
    # Clean old requests
    request_counts[ip] = [
        req_time for req_time in request_counts[ip]
        if current_time - req_time < RATE_WINDOW
    ]
    
    # Check rate limit
    if len(request_counts[ip]) >= RATE_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded"
        )
    
    # Add current request
    request_counts[ip].append(current_time)
    return True


# Lifespan management
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    # Startup
    logger.info("Starting monitoring service...")
    
    # Initialize services
    await health_service.initialize()
    await metrics_service.initialize()
    await tracing_service.initialize()
    await alerting_service.initialize()
    await logging_service.initialize()
    
    # Instrument FastAPI with tracing
    tracing_service.instrument_fastapi(app)
    
    logger.info("Monitoring service started successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down monitoring service...")
    
    await health_service.shutdown()
    await metrics_service.shutdown()
    await tracing_service.shutdown()
    await alerting_service.shutdown()
    await logging_service.shutdown()
    
    logger.info("Monitoring service shutdown completed")


# Create FastAPI app
app = FastAPI(
    title="TouriQuest Monitoring Service",
    description="Comprehensive monitoring and observability service for TouriQuest platform",
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None
)

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_HOSTS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(GZipMiddleware, minimum_size=1000)


# Health Check Endpoints
@app.get("/health", response_model=HealthCheckResponse, tags=["Health"])
async def health_check(
    detailed: bool = Query(default=False, description="Include detailed health check results"),
    _auth: bool = Depends(verify_token),
    _rate_limit: bool = Depends(rate_limit_check)
):
    """
    Get service health status
    
    Returns overall health status and detailed checks for all dependencies
    """
    try:
        result = await health_service.check_health()
        
        response_data = {
            "status": result.status,
            "timestamp": result.timestamp,
            "service": settings.SERVICE_NAME,
            "version": settings.APP_VERSION,
            "checks": result.checks if detailed else {
                "database": result.checks.get("database", {}).get("status", "unknown"),
                "redis": result.checks.get("redis", {}).get("status", "unknown"),
                "external_services": "healthy" if all(
                    check.get("status") == "healthy" 
                    for check in result.checks.get("external_services", {}).values()
                ) else "unhealthy"
            },
            "performance": result.performance if detailed else {
                "response_time_ms": result.performance.get("total_check_time", 0) * 1000
            }
        }
        
        status_code = 200 if result.status == "healthy" else 503
        return JSONResponse(content=response_data, status_code=status_code)
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            content={
                "status": "unhealthy",
                "timestamp": datetime.utcnow(),
                "service": settings.SERVICE_NAME,
                "version": settings.APP_VERSION,
                "error": str(e)
            },
            status_code=503
        )


@app.get("/health/live", tags=["Health"])
async def liveness_check():
    """
    Kubernetes liveness probe endpoint
    
    Simple check to verify the service is running
    """
    return {"status": "alive", "timestamp": datetime.utcnow()}


@app.get("/health/ready", tags=["Health"])
async def readiness_check():
    """
    Kubernetes readiness probe endpoint
    
    Check if service is ready to accept traffic
    """
    try:
        # Quick health check without external dependencies
        result = await health_service.check_health(include_external=False)
        
        if result.status == "healthy":
            return {"status": "ready", "timestamp": datetime.utcnow()}
        else:
            return JSONResponse(
                content={"status": "not_ready", "timestamp": datetime.utcnow()},
                status_code=503
            )
    except Exception as e:
        return JSONResponse(
            content={"status": "not_ready", "error": str(e), "timestamp": datetime.utcnow()},
            status_code=503
        )


# Metrics Endpoints
@app.get("/metrics", tags=["Metrics"])
async def get_prometheus_metrics(
    _auth: bool = Depends(verify_token),
    _rate_limit: bool = Depends(rate_limit_check)
):
    """
    Get Prometheus metrics in exposition format
    
    Returns all metrics in Prometheus format for scraping
    """
    try:
        metrics_output = await metrics_service.get_metrics()
        return Response(
            content=metrics_output,
            media_type="text/plain; version=0.0.4; charset=utf-8"
        )
    except Exception as e:
        logger.error(f"Failed to get metrics: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve metrics")


@app.get("/metrics/json", response_model=MetricsResponse, tags=["Metrics"])
async def get_metrics_json(
    _auth: bool = Depends(verify_token),
    _rate_limit: bool = Depends(rate_limit_check)
):
    """
    Get metrics in JSON format
    
    Returns structured metrics data for API consumption
    """
    try:
        metrics_data = await metrics_service.get_metrics_dict()
        
        return MetricsResponse(
            timestamp=datetime.utcnow(),
            service=settings.SERVICE_NAME,
            metrics=metrics_data
        )
    except Exception as e:
        logger.error(f"Failed to get JSON metrics: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve metrics")


# Monitoring Status Endpoint
@app.get("/monitoring/status", response_model=MonitoringStatusResponse, tags=["Monitoring"])
async def get_monitoring_status(
    _auth: bool = Depends(verify_token),
    _rate_limit: bool = Depends(rate_limit_check)
):
    """
    Get overall monitoring system status
    
    Returns status of all monitoring components and services
    """
    try:
        # Get status from all services
        health_stats = health_service.get_health_stats()
        metrics_stats = metrics_service.get_metrics_stats()
        tracing_stats = tracing_service.get_tracing_stats()
        alerting_stats = alerting_service.get_alert_statistics()
        logging_stats = logging_service.get_logging_stats()
        
        services_status = {
            "health_service": {
                "enabled": True,
                "last_check": health_stats.get("last_check"),
                "cached_results": health_stats.get("cached_results", 0)
            },
            "metrics_service": {
                "enabled": True,
                "prometheus_enabled": metrics_stats.get("prometheus_enabled", False),
                "total_metrics": metrics_stats.get("total_metrics", 0)
            },
            "tracing_service": {
                "enabled": tracing_stats.get("enabled", False),
                "jaeger_endpoint": tracing_stats.get("jaeger_endpoint"),
                "active_spans": tracing_stats.get("active_spans", 0)
            },
            "alerting_service": {
                "enabled": True,
                "total_rules": alerting_stats.get("total_rules", 0),
                "enabled_rules": alerting_stats.get("enabled_rules", 0)
            },
            "logging_service": {
                "enabled": True,
                "elasticsearch_enabled": logging_stats.get("elasticsearch_enabled", False),
                "logstash_enabled": logging_stats.get("logstash_enabled", False)
            }
        }
        
        return MonitoringStatusResponse(
            monitoring_enabled=True,
            services=services_status,
            active_alerts=alerting_stats.get("total_active", 0),
            last_updated=datetime.utcnow()
        )
        
    except Exception as e:
        logger.error(f"Failed to get monitoring status: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve monitoring status")


# Alerting Endpoints
@app.post("/alerts/configure", tags=["Alerts"])
async def configure_alert_rule(
    rule_config: AlertConfigRequest,
    _auth: bool = Depends(verify_token),
    _rate_limit: bool = Depends(rate_limit_check)
):
    """
    Configure a new alert rule
    
    Creates or updates an alert rule with the specified configuration
    """
    try:
        # Create AlertRule object
        alert_rule = AlertRule(
            id=rule_config.rule_id,
            name=rule_config.name,
            description=rule_config.description,
            service=rule_config.service,
            metric_name=rule_config.metric_name,
            condition=rule_config.condition,
            threshold=rule_config.threshold,
            severity=rule_config.severity,
            evaluation_window=rule_config.evaluation_window,
            cooldown=rule_config.cooldown,
            enabled=rule_config.enabled,
            notification_channels=rule_config.notification_channels,
            tags=rule_config.tags
        )
        
        # Add rule to alerting service
        alerting_service.add_alert_rule(alert_rule)
        
        return {
            "message": "Alert rule configured successfully",
            "rule_id": rule_config.rule_id,
            "timestamp": datetime.utcnow()
        }
        
    except Exception as e:
        logger.error(f"Failed to configure alert rule: {e}")
        raise HTTPException(status_code=500, detail="Failed to configure alert rule")


@app.get("/alerts", response_model=List[AlertResponse], tags=["Alerts"])
async def get_alerts(
    service: Optional[str] = Query(None, description="Filter by service"),
    severity: Optional[AlertSeverity] = Query(None, description="Filter by severity"),
    status: Optional[AlertStatus] = Query(None, description="Filter by status"),
    limit: int = Query(default=100, ge=1, le=1000, description="Number of alerts to return"),
    _auth: bool = Depends(verify_token),
    _rate_limit: bool = Depends(rate_limit_check)
):
    """
    Get active alerts
    
    Returns list of alerts with optional filtering by service, severity, or status
    """
    try:
        alerts = alerting_service.get_active_alerts(service=service, severity=severity)
        
        # Filter by status if specified
        if status:
            alerts = [alert for alert in alerts if alert.status == status]
        
        # Limit results
        alerts = alerts[:limit]
        
        # Convert to response model
        alert_responses = []
        for alert in alerts:
            alert_responses.append(AlertResponse(
                id=alert.id,
                title=alert.title,
                description=alert.description,
                severity=alert.severity,
                status=alert.status,
                service=alert.service,
                created_at=alert.created_at,
                updated_at=alert.updated_at,
                tags=alert.tags
            ))
        
        return alert_responses
        
    except Exception as e:
        logger.error(f"Failed to get alerts: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve alerts")


@app.post("/alerts/{alert_id}/acknowledge", tags=["Alerts"])
async def acknowledge_alert(
    alert_id: str = Path(..., description="Alert ID"),
    _auth: bool = Depends(verify_token),
    _rate_limit: bool = Depends(rate_limit_check)
):
    """
    Acknowledge an alert
    
    Marks the specified alert as acknowledged
    """
    try:
        success = await alerting_service.acknowledge_alert(alert_id)
        
        if success:
            return {
                "message": "Alert acknowledged successfully",
                "alert_id": alert_id,
                "timestamp": datetime.utcnow()
            }
        else:
            raise HTTPException(status_code=404, detail="Alert not found")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to acknowledge alert: {e}")
        raise HTTPException(status_code=500, detail="Failed to acknowledge alert")


@app.post("/alerts/{alert_id}/resolve", tags=["Alerts"])
async def resolve_alert(
    alert_id: str = Path(..., description="Alert ID"),
    resolution_note: str = Body(default="", description="Resolution note"),
    _auth: bool = Depends(verify_token),
    _rate_limit: bool = Depends(rate_limit_check)
):
    """
    Resolve an alert
    
    Marks the specified alert as resolved with optional resolution note
    """
    try:
        success = await alerting_service.resolve_alert(alert_id, resolution_note)
        
        if success:
            return {
                "message": "Alert resolved successfully",
                "alert_id": alert_id,
                "timestamp": datetime.utcnow()
            }
        else:
            raise HTTPException(status_code=404, detail="Alert not found")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to resolve alert: {e}")
        raise HTTPException(status_code=500, detail="Failed to resolve alert")


# Tracing Endpoints
@app.get("/traces/{trace_id}", response_model=TraceResponse, tags=["Tracing"])
async def get_trace(
    trace_id: str = Path(..., description="Trace ID"),
    _auth: bool = Depends(verify_token),
    _rate_limit: bool = Depends(rate_limit_check)
):
    """
    Get trace details by ID
    
    Returns detailed trace information including all spans
    """
    try:
        # Get trace summary from tracing service
        trace_summary = tracing_service.get_trace_summary(trace_id)
        
        if not trace_summary:
            raise HTTPException(status_code=404, detail="Trace not found")
        
        # Get logs for this trace
        logs = await logging_service.get_logs_by_trace(trace_id)
        
        return TraceResponse(
            trace_id=trace_id,
            spans=[],  # Would be populated from Jaeger API in real implementation
            duration_ms=None,
            service_count=1,
            error_count=0,
            **trace_summary
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get trace: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve trace")


# Logging Endpoints
@app.post("/logs/search", response_model=LogSearchResponse, tags=["Logging"])
async def search_logs(
    search_request: LogSearchRequest,
    _auth: bool = Depends(verify_token),
    _rate_limit: bool = Depends(rate_limit_check)
):
    """
    Search logs with filtering and pagination
    
    Search through centralized logs with various filters and sorting options
    """
    try:
        # Convert request to LogQuery
        log_query = LogQuery(
            query=search_request.query,
            level=search_request.level,
            service=search_request.service,
            start_time=search_request.start_time,
            end_time=search_request.end_time,
            trace_id=search_request.trace_id,
            user_id=search_request.user_id,
            tags=search_request.tags,
            limit=search_request.limit,
            offset=search_request.offset,
            sort_field=search_request.sort_field,
            sort_order=search_request.sort_order
        )
        
        # Search logs
        result = await logging_service.search_logs(log_query)
        
        return LogSearchResponse(
            logs=result.get("logs", []),
            total=result.get("total", 0),
            took=result.get("took"),
            query=result.get("query", {})
        )
        
    except Exception as e:
        logger.error(f"Failed to search logs: {e}")
        raise HTTPException(status_code=500, detail="Failed to search logs")


@app.get("/logs/export", tags=["Logging"])
async def export_logs(
    query: Optional[str] = Query(None, description="Search query"),
    level: Optional[LogLevel] = Query(None, description="Log level filter"),
    service: Optional[str] = Query(None, description="Service filter"),
    start_time: Optional[datetime] = Query(None, description="Start time filter"),
    end_time: Optional[datetime] = Query(None, description="End time filter"),
    format: str = Query(default="json", regex="^(json|csv)$", description="Export format"),
    _auth: bool = Depends(verify_token),
    _rate_limit: bool = Depends(rate_limit_check)
):
    """
    Export logs in various formats
    
    Stream logs export in JSON or CSV format with optional filtering
    """
    try:
        # Build log query
        log_query = LogQuery(
            query=query,
            level=level,
            service=service,
            start_time=start_time,
            end_time=end_time,
            limit=10000  # Large limit for export
        )
        
        # Set appropriate media type
        media_type = "application/json" if format == "json" else "text/csv"
        filename = f"logs-{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.{format}"
        
        # Stream the export
        return StreamingResponse(
            logging_service.export_logs(log_query, format),
            media_type=media_type,
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except Exception as e:
        logger.error(f"Failed to export logs: {e}")
        raise HTTPException(status_code=500, detail="Failed to export logs")


@app.get("/logs/statistics", tags=["Logging"])
async def get_log_statistics(
    start_time: datetime = Query(..., description="Start time for statistics"),
    end_time: datetime = Query(..., description="End time for statistics"),
    _auth: bool = Depends(verify_token),
    _rate_limit: bool = Depends(rate_limit_check)
):
    """
    Get log statistics for a time period
    
    Returns aggregated statistics about logs including counts by level, service, etc.
    """
    try:
        stats = await logging_service.get_log_statistics(start_time, end_time)
        return stats
        
    except Exception as e:
        logger.error(f"Failed to get log statistics: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve log statistics")


# Error handlers
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": "An unexpected error occurred",
            "timestamp": datetime.utcnow().isoformat()
        }
    )


# Health check for the monitoring service itself
@app.get("/", tags=["General"])
async def root():
    """
    Root endpoint with service information
    """
    return {
        "service": "TouriQuest Monitoring Service",
        "version": settings.APP_VERSION,
        "status": "running",
        "timestamp": datetime.utcnow(),
        "endpoints": {
            "health": "/health",
            "metrics": "/metrics",
            "monitoring": "/monitoring/status",
            "alerts": "/alerts",
            "tracing": "/traces/{trace_id}",
            "logs": "/logs/search",
            "docs": "/docs" if settings.DEBUG else "disabled"
        }
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        log_level="info",
        reload=settings.DEBUG
    )