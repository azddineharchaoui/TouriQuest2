"""Audit logging and tracking endpoints for administrative oversight."""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import structlog

from app.core.security import get_current_admin, require_permission, Permission
from app.core.database import get_db
from app.schemas.audit_logging import (
    AuditLogEntry,
    AuditLogSummary,
    AuditLogFilters,
    AuditStatistics,
    AuditReport,
    AuditAlert,
    ComplianceReport,
    UserActivitySummary,
    SystemActivitySummary
)
from app.services.audit_service import AuditService
from app.services.compliance_service import ComplianceService
from app.models import AuditAction, AuditSeverity

logger = structlog.get_logger()
router = APIRouter()

# Initialize services
audit_service = AuditService()
compliance_service = ComplianceService()


@router.get("/", response_model=List[AuditLogEntry])
async def get_audit_logs(
    page: int = Query(default=1, ge=1, description="Page number"),
    limit: int = Query(default=100, ge=1, le=1000, description="Items per page"),
    user_id: Optional[str] = Query(default=None, description="Filter by user ID"),
    admin_id: Optional[str] = Query(default=None, description="Filter by admin ID"),
    action: Optional[str] = Query(default=None, description="Filter by action type"),
    severity: Optional[str] = Query(default=None, description="Filter by severity level"),
    resource_type: Optional[str] = Query(default=None, description="Filter by resource type"),
    resource_id: Optional[str] = Query(default=None, description="Filter by resource ID"),
    date_from: Optional[datetime] = Query(default=None, description="Filter from date"),
    date_to: Optional[datetime] = Query(default=None, description="Filter to date"),
    search: Optional[str] = Query(default=None, description="Search in descriptions"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_AUDIT)),
    db=Depends(get_db)
):
    """
    Get audit log entries with comprehensive filtering options.
    
    Supports filtering by:
    - User and admin IDs
    - Action types and severity levels
    - Resource types and specific resources
    - Date ranges
    - Text search in descriptions
    """
    try:
        filters = AuditLogFilters(
            user_id=user_id,
            admin_id=admin_id,
            action=action,
            severity=severity,
            resource_type=resource_type,
            resource_id=resource_id,
            date_from=date_from,
            date_to=date_to,
            search=search
        )
        
        audit_logs = await audit_service.get_audit_logs(
            db, filters=filters, page=page, limit=limit
        )
        
        # Log audit access (meta-audit)
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.AUDIT_ACCESSED,
            resource_type="audit_log",
            description=f"Accessed audit logs with filters: {filters.dict()}",
            severity=AuditSeverity.LOW
        )
        
        return audit_logs
        
    except Exception as e:
        logger.error("Failed to get audit logs", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve audit logs")


@router.get("/summary", response_model=AuditLogSummary)
async def get_audit_summary(
    days: int = Query(default=30, ge=1, le=365, description="Days to summarize"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_AUDIT)),
    db=Depends(get_db)
):
    """Get summary statistics of audit log activity."""
    try:
        summary = await audit_service.get_audit_summary(db, days)
        return summary
        
    except Exception as e:
        logger.error("Failed to get audit summary", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve audit summary")


@router.get("/statistics", response_model=AuditStatistics)
async def get_audit_statistics(
    period: str = Query(default="weekly", regex="^(daily|weekly|monthly)$"),
    group_by: str = Query(default="action", regex="^(action|severity|user|resource_type)$"),
    days: int = Query(default=30, ge=1, le=365, description="Days of data to analyze"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_AUDIT)),
    db=Depends(get_db)
):
    """Get detailed audit statistics and trends."""
    try:
        statistics = await audit_service.get_audit_statistics(
            db, period=period, group_by=group_by, days=days
        )
        return statistics
        
    except Exception as e:
        logger.error("Failed to get audit statistics", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve audit statistics")


@router.get("/user-activity/{user_id}", response_model=UserActivitySummary)
async def get_user_activity_summary(
    user_id: str,
    days: int = Query(default=30, ge=1, le=365, description="Days of activity to analyze"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_AUDIT)),
    db=Depends(get_db)
):
    """Get detailed activity summary for a specific user."""
    try:
        activity_summary = await audit_service.get_user_activity_summary(db, user_id, days)
        
        if not activity_summary:
            raise HTTPException(status_code=404, detail="User activity not found")
            
        return activity_summary
        
    except Exception as e:
        logger.error("Failed to get user activity summary", error=str(e), user_id=user_id)
        raise HTTPException(status_code=500, detail="Failed to retrieve user activity summary")


@router.get("/system-activity", response_model=SystemActivitySummary)
async def get_system_activity_summary(
    days: int = Query(default=30, ge=1, le=365, description="Days of activity to analyze"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_AUDIT)),
    db=Depends(get_db)
):
    """Get comprehensive system activity summary."""
    try:
        activity_summary = await audit_service.get_system_activity_summary(db, days)
        return activity_summary
        
    except Exception as e:
        logger.error("Failed to get system activity summary", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve system activity summary")


@router.get("/alerts", response_model=List[AuditAlert])
async def get_audit_alerts(
    severity: Optional[str] = Query(default=None, description="Filter by alert severity"),
    active_only: bool = Query(default=True, description="Show only active alerts"),
    page: int = Query(default=1, ge=1, description="Page number"),
    limit: int = Query(default=50, ge=1, le=200, description="Items per page"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_AUDIT)),
    db=Depends(get_db)
):
    """Get audit-based security and compliance alerts."""
    try:
        alerts = await audit_service.get_audit_alerts(
            db, severity=severity, active_only=active_only, page=page, limit=limit
        )
        return alerts
        
    except Exception as e:
        logger.error("Failed to get audit alerts", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve audit alerts")


@router.post("/alerts/{alert_id}/acknowledge")
async def acknowledge_audit_alert(
    alert_id: str,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_AUDIT)),
    db=Depends(get_db)
):
    """Acknowledge an audit alert."""
    try:
        result = await audit_service.acknowledge_audit_alert(db, alert_id, current_admin["id"])
        
        if not result:
            raise HTTPException(status_code=404, detail="Audit alert not found")
        
        # Log alert acknowledgment
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.ALERT_ACKNOWLEDGE,
            resource_type="audit_alert",
            resource_id=alert_id,
            description=f"Acknowledged audit alert: {alert_id}",
            severity=AuditSeverity.MEDIUM
        )
        
        return {"message": "Audit alert acknowledged successfully"}
        
    except Exception as e:
        logger.error("Failed to acknowledge audit alert", error=str(e), alert_id=alert_id)
        raise HTTPException(status_code=500, detail="Failed to acknowledge audit alert")


@router.post("/reports/generate", response_model=AuditReport)
async def generate_audit_report(
    report_type: str = Query(..., regex="^(compliance|security|activity|summary)$"),
    format: str = Query(default="pdf", regex="^(pdf|excel|csv|json)$"),
    date_from: datetime = Query(..., description="Report start date"),
    date_to: datetime = Query(..., description="Report end date"),
    include_details: bool = Query(default=False, description="Include detailed entries"),
    filters: Optional[str] = Query(default=None, description="JSON filters for report"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.GENERATE_REPORTS)),
    db=Depends(get_db)
):
    """Generate comprehensive audit reports."""
    try:
        report = await audit_service.generate_audit_report(
            db, 
            report_type=report_type,
            format=format,
            date_from=date_from,
            date_to=date_to,
            include_details=include_details,
            filters=filters,
            admin_id=current_admin["id"]
        )
        
        # Log report generation
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.REPORT_GENERATED,
            resource_type="audit_report",
            resource_id=report.id,
            description=f"Generated {report_type} audit report in {format} format",
            severity=AuditSeverity.MEDIUM
        )
        
        return report
        
    except Exception as e:
        logger.error("Failed to generate audit report", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to generate audit report")


@router.get("/reports", response_model=List[AuditReport])
async def get_audit_reports(
    report_type: Optional[str] = Query(default=None, description="Filter by report type"),
    status: Optional[str] = Query(default=None, description="Filter by status"),
    page: int = Query(default=1, ge=1, description="Page number"),
    limit: int = Query(default=50, ge=1, le=200, description="Items per page"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_REPORTS)),
    db=Depends(get_db)
):
    """Get list of generated audit reports."""
    try:
        reports = await audit_service.get_audit_reports(
            db, report_type=report_type, status=status, page=page, limit=limit
        )
        return reports
        
    except Exception as e:
        logger.error("Failed to get audit reports", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve audit reports")


@router.get("/reports/{report_id}/download")
async def download_audit_report(
    report_id: str,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_REPORTS)),
    db=Depends(get_db)
):
    """Download a generated audit report."""
    try:
        report_file = await audit_service.get_audit_report_file(db, report_id)
        
        if not report_file:
            raise HTTPException(status_code=404, detail="Audit report not found")
        
        # Log report download
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.REPORT_DOWNLOADED,
            resource_type="audit_report",
            resource_id=report_id,
            description=f"Downloaded audit report: {report_id}",
            severity=AuditSeverity.MEDIUM
        )
        
        return StreamingResponse(
            report_file["stream"],
            media_type=report_file["media_type"],
            headers={"Content-Disposition": f"attachment; filename={report_file['filename']}"}
        )
        
    except Exception as e:
        logger.error("Failed to download audit report", error=str(e), report_id=report_id)
        raise HTTPException(status_code=500, detail="Failed to download audit report")


@router.get("/compliance", response_model=ComplianceReport)
async def get_compliance_report(
    framework: str = Query(default="gdpr", regex="^(gdpr|sox|pci|hipaa)$"),
    period: str = Query(default="monthly", regex="^(weekly|monthly|quarterly|yearly)$"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_COMPLIANCE)),
    db=Depends(get_db)
):
    """Get compliance report for specific regulatory framework."""
    try:
        compliance_report = await compliance_service.get_compliance_report(
            db, framework=framework, period=period
        )
        return compliance_report
        
    except Exception as e:
        logger.error("Failed to get compliance report", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve compliance report")


@router.get("/retention/policy")
async def get_audit_retention_policy(
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_AUDIT)),
    db=Depends(get_db)
):
    """Get audit log retention policy and current storage usage."""
    try:
        policy = await audit_service.get_retention_policy(db)
        return policy
        
    except Exception as e:
        logger.error("Failed to get retention policy", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve retention policy")


@router.post("/retention/cleanup")
async def cleanup_old_audit_logs(
    days_to_keep: int = Query(..., ge=90, le=2555, description="Days of logs to keep (90-2555)"),
    dry_run: bool = Query(default=True, description="Preview cleanup without executing"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_AUDIT)),
    db=Depends(get_db)
):
    """Clean up old audit logs according to retention policy."""
    try:
        result = await audit_service.cleanup_old_logs(
            db, days_to_keep=days_to_keep, dry_run=dry_run, admin_id=current_admin["id"]
        )
        
        if not dry_run:
            # Log cleanup operation
            await audit_service.log_action(
                db=db,
                admin_id=current_admin["id"],
                admin_email=current_admin["email"],
                admin_role=current_admin["role"].value,
                action=AuditAction.LOGS_CLEANED,
                resource_type="audit_log",
                description=f"Cleaned up audit logs older than {days_to_keep} days",
                severity=AuditSeverity.HIGH
            )
        
        return result
        
    except Exception as e:
        logger.error("Failed to cleanup audit logs", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to cleanup audit logs")


@router.post("/export")
async def export_audit_logs(
    format: str = Query(default="csv", regex="^(csv|json|excel)$"),
    date_from: datetime = Query(..., description="Export start date"),
    date_to: datetime = Query(..., description="Export end date"),
    filters: Optional[str] = Query(default=None, description="JSON filters for export"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.EXPORT_AUDIT)),
    db=Depends(get_db)
):
    """Export audit logs in specified format."""
    try:
        export_file = await audit_service.export_audit_logs(
            db, 
            format=format,
            date_from=date_from,
            date_to=date_to,
            filters=filters,
            admin_id=current_admin["id"]
        )
        
        # Log export operation
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.AUDIT_EXPORTED,
            resource_type="audit_log",
            description=f"Exported audit logs in {format} format from {date_from} to {date_to}",
            severity=AuditSeverity.HIGH
        )
        
        return StreamingResponse(
            export_file["stream"],
            media_type=export_file["media_type"],
            headers={"Content-Disposition": f"attachment; filename={export_file['filename']}"}
        )
        
    except Exception as e:
        logger.error("Failed to export audit logs", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to export audit logs")


@router.get("/search")
async def search_audit_logs(
    query: str = Query(..., description="Search query"),
    search_fields: List[str] = Query(default=["description", "admin_email"], description="Fields to search"),
    date_from: Optional[datetime] = Query(default=None, description="Search from date"),
    date_to: Optional[datetime] = Query(default=None, description="Search to date"),
    page: int = Query(default=1, ge=1, description="Page number"),
    limit: int = Query(default=100, ge=1, le=1000, description="Items per page"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_AUDIT)),
    db=Depends(get_db)
):
    """Advanced search in audit logs with full-text search capabilities."""
    try:
        search_results = await audit_service.search_audit_logs(
            db, 
            query=query,
            search_fields=search_fields,
            date_from=date_from,
            date_to=date_to,
            page=page,
            limit=limit
        )
        
        # Log search operation
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.AUDIT_SEARCHED,
            resource_type="audit_log",
            description=f"Searched audit logs with query: {query}",
            severity=AuditSeverity.LOW
        )
        
        return search_results
        
    except Exception as e:
        logger.error("Failed to search audit logs", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to search audit logs")