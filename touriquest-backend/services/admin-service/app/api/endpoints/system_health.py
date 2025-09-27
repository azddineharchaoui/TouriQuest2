"""System health monitoring endpoints for admin dashboard."""

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket
from typing import List, Optional, Dict, Any, Union
from datetime import datetime, timedelta
import asyncio
import psutil
import structlog
import json
from enum import Enum

from app.core.security import get_current_admin, require_permission, Permission
from app.core.database import get_db
from app.schemas.system_health import (
    SystemHealthOverview,
    ServiceStatus,
    DatabaseHealth,
    PerformanceMetrics,
    ResourceUsage,
    ErrorLog,
    SystemAlert,
    HealthCheckResult,
    MaintenanceSchedule,
    BackupStatus
)
from app.services.system_health_service import SystemHealthService
from app.services.websocket_manager import WebSocketManager
from app.services.audit_service import AuditService
from app.models import AuditAction, AuditSeverity

logger = structlog.get_logger()
router = APIRouter()

# Initialize services
health_service = SystemHealthService()
websocket_manager = WebSocketManager()
audit_service = AuditService()


class AlertSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@router.get("/", response_model=SystemHealthOverview)
async def get_system_health_overview(
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_SYSTEM)),
    db=Depends(get_db)
):
    """
    Get comprehensive system health overview.
    
    Returns real-time system metrics including:
    - Service status across all microservices
    - Database health and performance
    - Resource utilization
    - Active alerts and warnings
    - Performance metrics
    """
    try:
        overview = await health_service.get_health_overview(db)
        
        # Log system health access
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.SYSTEM_ACCESS,
            resource_type="system_health",
            description="Accessed system health overview",
            severity=AuditSeverity.LOW
        )
        
        return overview
        
    except Exception as e:
        logger.error("Failed to get system health overview", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve system health")


@router.get("/services", response_model=List[ServiceStatus])
async def get_service_status(
    include_inactive: bool = Query(default=False, description="Include inactive services"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_SYSTEM)),
    db=Depends(get_db)
):
    """Get status of all microservices."""
    try:
        services = await health_service.get_all_service_status(db, include_inactive)
        return services
        
    except Exception as e:
        logger.error("Failed to get service status", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve service status")


@router.get("/services/{service_name}", response_model=ServiceStatus)
async def get_service_detail(
    service_name: str,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_SYSTEM)),
    db=Depends(get_db)
):
    """Get detailed status for a specific service."""
    try:
        service = await health_service.get_service_status(db, service_name)
        
        if not service:
            raise HTTPException(status_code=404, detail="Service not found")
            
        return service
        
    except Exception as e:
        logger.error("Failed to get service detail", error=str(e), service=service_name)
        raise HTTPException(status_code=500, detail=f"Failed to retrieve {service_name} status")


@router.post("/services/{service_name}/restart")
async def restart_service(
    service_name: str,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_SYSTEM)),
    db=Depends(get_db)
):
    """Restart a specific service (requires elevated permissions)."""
    try:
        result = await health_service.restart_service(db, service_name)
        
        # Log critical system action
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.SYSTEM_RESTART,
            resource_type="service",
            resource_id=service_name,
            description=f"Restarted service: {service_name}",
            severity=AuditSeverity.HIGH
        )
        
        return result
        
    except Exception as e:
        logger.error("Failed to restart service", error=str(e), service=service_name)
        raise HTTPException(status_code=500, detail=f"Failed to restart {service_name}")


@router.get("/database", response_model=DatabaseHealth)
async def get_database_health(
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_SYSTEM)),
    db=Depends(get_db)
):
    """Get database health metrics and connection status."""
    try:
        db_health = await health_service.get_database_health(db)
        return db_health
        
    except Exception as e:
        logger.error("Failed to get database health", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve database health")


@router.get("/performance", response_model=PerformanceMetrics)
async def get_performance_metrics(
    hours: int = Query(default=24, ge=1, le=168, description="Hours of data to retrieve"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_SYSTEM)),
    db=Depends(get_db)
):
    """Get system performance metrics over time."""
    try:
        metrics = await health_service.get_performance_metrics(db, hours)
        return metrics
        
    except Exception as e:
        logger.error("Failed to get performance metrics", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve performance metrics")


@router.get("/resources", response_model=ResourceUsage)
async def get_resource_usage(
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_SYSTEM))
):
    """Get real-time system resource usage."""
    try:
        # Get current system resource usage
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        network = psutil.net_io_counters()
        
        resource_usage = ResourceUsage(
            cpu_percent=cpu_percent,
            memory_total=memory.total,
            memory_used=memory.used,
            memory_percent=memory.percent,
            disk_total=disk.total,
            disk_used=disk.used,
            disk_percent=(disk.used / disk.total) * 100,
            network_bytes_sent=network.bytes_sent,
            network_bytes_recv=network.bytes_recv,
            timestamp=datetime.utcnow()
        )
        
        return resource_usage
        
    except Exception as e:
        logger.error("Failed to get resource usage", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve resource usage")


@router.get("/logs", response_model=List[ErrorLog])
async def get_system_logs(
    level: Optional[str] = Query(default="ERROR", description="Log level filter"),
    service: Optional[str] = Query(default=None, description="Filter by service name"),
    hours: int = Query(default=24, ge=1, le=168, description="Hours of logs to retrieve"),
    page: int = Query(default=1, ge=1, description="Page number"),
    limit: int = Query(default=100, ge=1, le=1000, description="Items per page"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_SYSTEM)),
    db=Depends(get_db)
):
    """Get system error logs and application logs."""
    try:
        logs = await health_service.get_system_logs(
            db, level=level, service=service, hours=hours, page=page, limit=limit
        )
        return logs
        
    except Exception as e:
        logger.error("Failed to get system logs", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve system logs")


@router.get("/alerts", response_model=List[SystemAlert])
async def get_system_alerts(
    severity: Optional[AlertSeverity] = Query(default=None, description="Filter by alert severity"),
    active_only: bool = Query(default=True, description="Show only active alerts"),
    page: int = Query(default=1, ge=1, description="Page number"),
    limit: int = Query(default=50, ge=1, le=200, description="Items per page"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_SYSTEM)),
    db=Depends(get_db)
):
    """Get system alerts and warnings."""
    try:
        alerts = await health_service.get_system_alerts(
            db, severity=severity, active_only=active_only, page=page, limit=limit
        )
        return alerts
        
    except Exception as e:
        logger.error("Failed to get system alerts", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve system alerts")


@router.post("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(
    alert_id: str,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_SYSTEM)),
    db=Depends(get_db)
):
    """Acknowledge a system alert."""
    try:
        result = await health_service.acknowledge_alert(db, alert_id, current_admin["id"])
        
        # Log alert acknowledgment
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.ALERT_ACKNOWLEDGE,
            resource_type="alert",
            resource_id=alert_id,
            description=f"Acknowledged system alert: {alert_id}",
            severity=AuditSeverity.MEDIUM
        )
        
        return result
        
    except Exception as e:
        logger.error("Failed to acknowledge alert", error=str(e), alert_id=alert_id)
        raise HTTPException(status_code=500, detail="Failed to acknowledge alert")


@router.post("/maintenance/schedule")
async def schedule_maintenance(
    maintenance_data: MaintenanceSchedule,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_SYSTEM)),
    db=Depends(get_db)
):
    """Schedule system maintenance window."""
    try:
        result = await health_service.schedule_maintenance(db, maintenance_data, current_admin["id"])
        
        # Log maintenance scheduling
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.MAINTENANCE_SCHEDULED,
            resource_type="maintenance",
            description=f"Scheduled maintenance: {maintenance_data.title}",
            severity=AuditSeverity.HIGH
        )
        
        return result
        
    except Exception as e:
        logger.error("Failed to schedule maintenance", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to schedule maintenance")


@router.get("/maintenance", response_model=List[MaintenanceSchedule])
async def get_maintenance_schedule(
    upcoming_only: bool = Query(default=True, description="Show only upcoming maintenance"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_SYSTEM)),
    db=Depends(get_db)
):
    """Get scheduled maintenance windows."""
    try:
        maintenance = await health_service.get_maintenance_schedule(db, upcoming_only)
        return maintenance
        
    except Exception as e:
        logger.error("Failed to get maintenance schedule", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve maintenance schedule")


@router.post("/backup/create")
async def create_system_backup(
    backup_type: str = Query(..., regex="^(full|incremental|configuration)$"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_SYSTEM)),
    db=Depends(get_db)
):
    """Create system backup."""
    try:
        result = await health_service.create_backup(db, backup_type, current_admin["id"])
        
        # Log backup creation
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.BACKUP_CREATED,
            resource_type="backup",
            description=f"Created {backup_type} backup",
            severity=AuditSeverity.MEDIUM
        )
        
        return result
        
    except Exception as e:
        logger.error("Failed to create backup", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to create system backup")


@router.get("/backup/status", response_model=List[BackupStatus])
async def get_backup_status(
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_SYSTEM)),
    db=Depends(get_db)
):
    """Get backup status and history."""
    try:
        backups = await health_service.get_backup_status(db)
        return backups
        
    except Exception as e:
        logger.error("Failed to get backup status", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve backup status")


@router.websocket("/live-metrics")
async def live_metrics_websocket(
    websocket: WebSocket,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_SYSTEM))
):
    """WebSocket endpoint for real-time system metrics."""
    await websocket_manager.connect(websocket, f"system_metrics_{current_admin['id']}")
    
    try:
        while True:
            # Get real-time metrics
            metrics = await health_service.get_live_metrics()
            
            # Send metrics to connected websocket
            await websocket_manager.send_personal_message(
                json.dumps({
                    "type": "system_metrics",
                    "data": metrics,
                    "timestamp": datetime.utcnow().isoformat()
                }), 
                websocket
            )
            
            await asyncio.sleep(5)  # Update every 5 seconds
            
    except Exception as e:
        logger.error("WebSocket connection error", error=str(e))
    finally:
        await websocket_manager.disconnect(websocket)


@router.post("/health-check/run")
async def run_health_check(
    check_type: str = Query(..., regex="^(full|quick|service|database)$"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_SYSTEM)),
    db=Depends(get_db)
):
    """Run comprehensive health check."""
    try:
        result = await health_service.run_health_check(db, check_type)
        
        # Log health check execution
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.HEALTH_CHECK,
            resource_type="system",
            description=f"Executed {check_type} health check",
            severity=AuditSeverity.LOW
        )
        
        return result
        
    except Exception as e:
        logger.error("Failed to run health check", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to run health check")