"""Dashboard endpoints for admin overview and real-time metrics."""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import structlog

from app.core.security import get_current_admin, require_permission, Permission
from app.core.database import get_db
from app.schemas.dashboard import (
    DashboardOverview,
    SystemMetrics,
    UserMetrics,
    PropertyMetrics,
    BookingMetrics,
    RevenueMetrics,
    ContentModerationMetrics
)
from app.services.dashboard_service import DashboardService
from app.services.websocket_manager import WebSocketManager

logger = structlog.get_logger()
router = APIRouter()

# Initialize services
dashboard_service = DashboardService()
websocket_manager = WebSocketManager()


@router.get("/", response_model=DashboardOverview)
async def get_dashboard_overview(
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_ANALYTICS)),
    db=Depends(get_db)
):
    """
    Get comprehensive dashboard overview with key metrics.
    
    Returns real-time metrics including:
    - User statistics
    - Property metrics
    - Booking data
    - Revenue information
    - Content moderation status
    - System health
    """
    try:
        overview = await dashboard_service.get_overview(db)
        
        # Log dashboard access
        logger.info(
            "Dashboard overview accessed",
            admin_id=current_admin["id"],
            admin_email=current_admin["email"]
        )
        
        return overview
        
    except Exception as e:
        logger.error("Failed to get dashboard overview", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve dashboard data")


@router.get("/metrics/system", response_model=SystemMetrics)
async def get_system_metrics(
    hours: int = Query(default=24, description="Number of hours to include"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_SYSTEM_METRICS)),
    db=Depends(get_db)
):
    """
    Get system performance metrics.
    
    Includes:
    - CPU and memory usage
    - API response times
    - Database performance
    - Service health status
    """
    try:
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(hours=hours)
        
        metrics = await dashboard_service.get_system_metrics(db, start_time, end_time)
        return metrics
        
    except Exception as e:
        logger.error("Failed to get system metrics", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve system metrics")


@router.get("/metrics/users", response_model=UserMetrics)
async def get_user_metrics(
    days: int = Query(default=30, description="Number of days to include"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_USERS)),
    db=Depends(get_db)
):
    """
    Get user-related metrics.
    
    Includes:
    - New registrations
    - Active users
    - User verification status
    - Geographic distribution
    """
    try:
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(days=days)
        
        metrics = await dashboard_service.get_user_metrics(db, start_time, end_time)
        return metrics
        
    except Exception as e:
        logger.error("Failed to get user metrics", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve user metrics")


@router.get("/metrics/properties", response_model=PropertyMetrics)
async def get_property_metrics(
    days: int = Query(default=30, description="Number of days to include"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_PROPERTIES)),
    db=Depends(get_db)
):
    """
    Get property-related metrics.
    
    Includes:
    - New listings
    - Property approval status
    - Geographic distribution
    - Property types breakdown
    """
    try:
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(days=days)
        
        metrics = await dashboard_service.get_property_metrics(db, start_time, end_time)
        return metrics
        
    except Exception as e:
        logger.error("Failed to get property metrics", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve property metrics")


@router.get("/metrics/bookings", response_model=BookingMetrics)
async def get_booking_metrics(
    days: int = Query(default=30, description="Number of days to include"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_ANALYTICS)),
    db=Depends(get_db)
):
    """
    Get booking-related metrics.
    
    Includes:
    - Booking volume
    - Conversion rates
    - Average booking value
    - Cancellation rates
    """
    try:
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(days=days)
        
        metrics = await dashboard_service.get_booking_metrics(db, start_time, end_time)
        return metrics
        
    except Exception as e:
        logger.error("Failed to get booking metrics", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve booking metrics")


@router.get("/metrics/revenue", response_model=RevenueMetrics)
async def get_revenue_metrics(
    days: int = Query(default=30, description="Number of days to include"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_FINANCIALS)),
    db=Depends(get_db)
):
    """
    Get revenue and financial metrics.
    
    Includes:
    - Total revenue
    - Commission earnings
    - Payout amounts
    - Revenue trends
    """
    try:
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(days=days)
        
        metrics = await dashboard_service.get_revenue_metrics(db, start_time, end_time)
        return metrics
        
    except Exception as e:
        logger.error("Failed to get revenue metrics", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve revenue metrics")


@router.get("/metrics/moderation", response_model=ContentModerationMetrics)
async def get_moderation_metrics(
    days: int = Query(default=7, description="Number of days to include"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_CONTENT)),
    db=Depends(get_db)
):
    """
    Get content moderation metrics.
    
    Includes:
    - Pending reviews
    - Moderation actions taken
    - Content approval rates
    - Appeal statistics
    """
    try:
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(days=days)
        
        metrics = await dashboard_service.get_moderation_metrics(db, start_time, end_time)
        return metrics
        
    except Exception as e:
        logger.error("Failed to get moderation metrics", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve moderation metrics")


@router.get("/real-time-stats")
async def get_real_time_stats(
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_ANALYTICS)),
    db=Depends(get_db)
):
    """
    Get real-time statistics for live dashboard updates.
    
    Returns frequently updated metrics that change in real-time.
    """
    try:
        stats = await dashboard_service.get_real_time_stats(db)
        
        # Broadcast to all connected admins via WebSocket
        await websocket_manager.send_metrics_update(stats)
        
        return stats
        
    except Exception as e:
        logger.error("Failed to get real-time stats", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve real-time statistics")


@router.get("/alerts/summary")
async def get_alerts_summary(
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_SYSTEM_METRICS)),
    db=Depends(get_db)
):
    """
    Get summary of active alerts and system notifications.
    """
    try:
        alerts = await dashboard_service.get_active_alerts(db)
        return {
            "total_alerts": len(alerts),
            "critical_alerts": len([a for a in alerts if a.severity == "critical"]),
            "unacknowledged_alerts": len([a for a in alerts if not a.is_acknowledged]),
            "alerts": alerts[:10]  # Return top 10 most recent
        }
        
    except Exception as e:
        logger.error("Failed to get alerts summary", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve alerts")


@router.post("/refresh-cache")
async def refresh_dashboard_cache(
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_SYSTEM)),
    db=Depends(get_db)
):
    """
    Manually refresh dashboard cache for updated metrics.
    """
    try:
        await dashboard_service.refresh_cache(db)
        
        logger.info(
            "Dashboard cache refreshed",
            admin_id=current_admin["id"],
            admin_email=current_admin["email"]
        )
        
        return {"message": "Dashboard cache refreshed successfully"}
        
    except Exception as e:
        logger.error("Failed to refresh dashboard cache", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to refresh cache")