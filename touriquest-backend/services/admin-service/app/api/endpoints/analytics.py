"""Analytics endpoints for admin dashboard."""

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import structlog

from app.core.security import get_current_admin, require_permission, Permission
from app.core.database import get_db
from app.schemas.analytics import (
    AnalyticsSummary,
    UserAnalytics,
    BookingAnalytics,
    RevenueAnalytics,
    PropertyAnalytics,
    CustomReport,
    AnalyticsFilters
)
from app.services.analytics_service import AnalyticsService
from app.services.audit_service import AuditService
from app.models import AuditAction, AuditSeverity

logger = structlog.get_logger()
router = APIRouter()

# Initialize services
analytics_service = AnalyticsService()
audit_service = AuditService()


@router.get("/summary", response_model=AnalyticsSummary)
async def get_analytics_summary(
    period: str = Query(default="30d", description="Time period: 7d, 30d, 90d, 1y"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_ANALYTICS)),
    db=Depends(get_db)
):
    """Get comprehensive analytics summary for dashboard."""
    try:
        summary = await analytics_service.get_analytics_summary(db, period)
        return summary
        
    except Exception as e:
        logger.error("Failed to get analytics summary", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve analytics summary")


@router.get("/users", response_model=UserAnalytics)
async def get_user_analytics(
    period: str = Query(default="30d"),
    breakdown: str = Query(default="day", description="Breakdown by: day, week, month"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_ANALYTICS)),
    db=Depends(get_db)
):
    """Get user registration and engagement analytics."""
    try:
        analytics = await analytics_service.get_user_analytics(db, period, breakdown)
        return analytics
        
    except Exception as e:
        logger.error("Failed to get user analytics", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve user analytics")


@router.get("/bookings", response_model=BookingAnalytics)
async def get_booking_analytics(
    period: str = Query(default="30d"),
    breakdown: str = Query(default="day"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_ANALYTICS)),
    db=Depends(get_db)
):
    """Get booking volume and conversion analytics."""
    try:
        analytics = await analytics_service.get_booking_analytics(db, period, breakdown)
        return analytics
        
    except Exception as e:
        logger.error("Failed to get booking analytics", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve booking analytics")


@router.get("/revenue", response_model=RevenueAnalytics)
async def get_revenue_analytics(
    period: str = Query(default="30d"),
    breakdown: str = Query(default="day"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_FINANCES)),
    db=Depends(get_db)
):
    """Get revenue and financial analytics."""
    try:
        analytics = await analytics_service.get_revenue_analytics(db, period, breakdown)
        return analytics
        
    except Exception as e:
        logger.error("Failed to get revenue analytics", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve revenue analytics")


@router.get("/properties", response_model=PropertyAnalytics)
async def get_property_analytics(
    period: str = Query(default="30d"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_ANALYTICS)),
    db=Depends(get_db)
):
    """Get property listing and performance analytics."""
    try:
        analytics = await analytics_service.get_property_analytics(db, period)
        return analytics
        
    except Exception as e:
        logger.error("Failed to get property analytics", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve property analytics")


@router.post("/custom-report")
async def generate_custom_report(
    background_tasks: BackgroundTasks,
    report_config: CustomReport,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.GENERATE_REPORTS)),
    db=Depends(get_db)
):
    """Generate custom analytics report."""
    try:
        report_id = await analytics_service.queue_custom_report(
            db,
            config=report_config,
            requested_by=current_admin["id"]
        )
        
        # Log report generation
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.REPORT_GENERATED,
            resource_type="custom_report",
            resource_id=report_id,
            description=f"Generated custom report: {report_config.name}",
            severity=AuditSeverity.MEDIUM
        )
        
        return {
            "report_id": report_id,
            "message": "Custom report queued successfully",
            "estimated_completion": "10-15 minutes"
        }
        
    except Exception as e:
        logger.error("Failed to generate custom report", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to generate custom report")