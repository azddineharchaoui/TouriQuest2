"""Alert management endpoints for system notifications."""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional, Dict, Any
from datetime import datetime
import structlog

from app.core.security import get_current_admin, require_permission, Permission
from app.core.database import get_db
from app.schemas.alerts import (
    AlertSummary,
    AlertDetail,
    AlertFilters,
    AlertCreate,
    AlertUpdate,
    AlertConfiguration
)
from app.services.alerts_service import AlertsService
from app.services.audit_service import AuditService
from app.models import AuditAction, AuditSeverity

logger = structlog.get_logger()
router = APIRouter()

# Initialize services
alerts_service = AlertsService()
audit_service = AuditService()


@router.get("/", response_model=List[AlertSummary])
async def get_alerts(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=200),
    severity: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default="active"),
    alert_type: Optional[str] = Query(default=None),
    date_from: Optional[datetime] = Query(default=None),
    date_to: Optional[datetime] = Query(default=None),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_ALERTS)),
    db=Depends(get_db)
):
    """Get paginated list of system alerts."""
    try:
        filters = AlertFilters(
            severity=severity,
            status=status,
            alert_type=alert_type,
            date_from=date_from,
            date_to=date_to
        )
        
        alerts = await alerts_service.get_alerts(
            db,
            page=page,
            limit=limit,
            filters=filters
        )
        
        return alerts
        
    except Exception as e:
        logger.error("Failed to get alerts", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve alerts")


@router.get("/{alert_id}", response_model=AlertDetail)
async def get_alert_detail(
    alert_id: str,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_ALERTS)),
    db=Depends(get_db)
):
    """Get detailed information about a specific alert."""
    try:
        alert = await alerts_service.get_alert_detail(db, alert_id)
        
        if not alert:
            raise HTTPException(status_code=404, detail="Alert not found")
        
        return alert
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get alert detail", alert_id=alert_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve alert details")


@router.post("/", response_model=AlertDetail)
async def create_alert(
    alert_create: AlertCreate,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_ALERTS)),
    db=Depends(get_db)
):
    """Create a new system alert."""
    try:
        alert = await alerts_service.create_alert(
            db,
            alert_data=alert_create,
            created_by=current_admin["id"]
        )
        
        # Log alert creation
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.ALERT_CREATED,
            resource_type="alert",
            resource_id=str(alert.id),
            description=f"Created alert: {alert_create.title}",
            severity=AuditSeverity.MEDIUM
        )
        
        return alert
        
    except Exception as e:
        logger.error("Failed to create alert", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to create alert")


@router.put("/{alert_id}", response_model=AlertDetail)
async def update_alert(
    alert_id: str,
    alert_update: AlertUpdate,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_ALERTS)),
    db=Depends(get_db)
):
    """Update an existing alert."""
    try:
        alert = await alerts_service.update_alert(
            db,
            alert_id=alert_id,
            alert_data=alert_update,
            updated_by=current_admin["id"]
        )
        
        if not alert:
            raise HTTPException(status_code=404, detail="Alert not found")
        
        # Log alert update
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.ALERT_UPDATED,
            resource_type="alert",
            resource_id=alert_id,
            description=f"Updated alert: {alert_id}",
            severity=AuditSeverity.LOW
        )
        
        return alert
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to update alert", alert_id=alert_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to update alert")


@router.post("/{alert_id}/acknowledge")
async def acknowledge_alert(
    alert_id: str,
    notes: Optional[str] = None,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_ALERTS)),
    db=Depends(get_db)
):
    """Acknowledge an alert."""
    try:
        result = await alerts_service.acknowledge_alert(
            db,
            alert_id=alert_id,
            acknowledged_by=current_admin["id"],
            notes=notes
        )
        
        # Log alert acknowledgment
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.ALERT_ACKNOWLEDGED,
            resource_type="alert",
            resource_id=alert_id,
            description=f"Acknowledged alert: {notes or 'No notes'}",
            severity=AuditSeverity.LOW
        )
        
        return result
        
    except Exception as e:
        logger.error("Failed to acknowledge alert", alert_id=alert_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to acknowledge alert")


@router.post("/{alert_id}/resolve")
async def resolve_alert(
    alert_id: str,
    resolution_notes: str,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_ALERTS)),
    db=Depends(get_db)
):
    """Resolve an alert."""
    try:
        result = await alerts_service.resolve_alert(
            db,
            alert_id=alert_id,
            resolved_by=current_admin["id"],
            resolution_notes=resolution_notes
        )
        
        # Log alert resolution
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.ALERT_RESOLVED,
            resource_type="alert",
            resource_id=alert_id,
            description=f"Resolved alert: {resolution_notes}",
            severity=AuditSeverity.MEDIUM
        )
        
        return result
        
    except Exception as e:
        logger.error("Failed to resolve alert", alert_id=alert_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to resolve alert")


@router.delete("/{alert_id}")
async def delete_alert(
    alert_id: str,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_ALERTS)),
    db=Depends(get_db)
):
    """Delete an alert."""
    try:
        result = await alerts_service.delete_alert(
            db,
            alert_id=alert_id,
            deleted_by=current_admin["id"]
        )
        
        # Log alert deletion
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.ALERT_DELETED,
            resource_type="alert",
            resource_id=alert_id,
            description=f"Deleted alert: {alert_id}",
            severity=AuditSeverity.MEDIUM
        )
        
        return result
        
    except Exception as e:
        logger.error("Failed to delete alert", alert_id=alert_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to delete alert")


@router.get("/config/rules", response_model=List[AlertConfiguration])
async def get_alert_configurations(
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_SYSTEM)),
    db=Depends(get_db)
):
    """Get alert configuration rules."""
    try:
        configurations = await alerts_service.get_alert_configurations(db)
        return configurations
        
    except Exception as e:
        logger.error("Failed to get alert configurations", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve alert configurations")


@router.post("/config/rules")
async def create_alert_configuration(
    config: AlertConfiguration,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_SYSTEM)),
    db=Depends(get_db)
):
    """Create new alert configuration rule."""
    try:
        result = await alerts_service.create_alert_configuration(
            db,
            config=config,
            created_by=current_admin["id"]
        )
        
        # Log configuration creation
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.SYSTEM_SETTING_CHANGED,
            resource_type="alert_config",
            resource_id=result["id"],
            description=f"Created alert configuration: {config.name}",
            severity=AuditSeverity.HIGH
        )
        
        return result
        
    except Exception as e:
        logger.error("Failed to create alert configuration", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to create alert configuration")


@router.get("/stats/summary")
async def get_alert_stats(
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_ANALYTICS)),
    db=Depends(get_db)
):
    """Get alert statistics for dashboard."""
    try:
        stats = await alerts_service.get_alert_stats(db)
        return stats
        
    except Exception as e:
        logger.error("Failed to get alert stats", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve alert statistics")