"""Reports endpoints for generating and managing reports."""

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from fastapi.responses import FileResponse
from typing import List, Optional, Dict, Any
from datetime import datetime
import structlog

from app.core.security import get_current_admin, require_permission, Permission
from app.core.database import get_db
from app.schemas.reports import (
    ReportSummary,
    ReportDetail,
    ReportRequest,
    ReportFilters,
    ScheduledReport,
    ReportTemplate
)
from app.services.reports_service import ReportsService
from app.services.audit_service import AuditService
from app.models import AuditAction, AuditSeverity

logger = structlog.get_logger()
router = APIRouter()

# Initialize services
reports_service = ReportsService()
audit_service = AuditService()


@router.get("/", response_model=List[ReportSummary])
async def get_reports(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=200),
    report_type: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_REPORTS)),
    db=Depends(get_db)
):
    """Get list of generated reports."""
    try:
        filters = ReportFilters(
            report_type=report_type,
            status=status
        )
        
        reports = await reports_service.get_reports(
            db,
            page=page,
            limit=limit,
            filters=filters
        )
        
        return reports
        
    except Exception as e:
        logger.error("Failed to get reports", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve reports")


@router.get("/{report_id}", response_model=ReportDetail)
async def get_report_detail(
    report_id: str,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_REPORTS)),
    db=Depends(get_db)
):
    """Get detailed information about a specific report."""
    try:
        report = await reports_service.get_report_detail(db, report_id)
        
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        
        return report
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get report detail", report_id=report_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve report details")


@router.post("/generate")
async def generate_report(
    background_tasks: BackgroundTasks,
    report_request: ReportRequest,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.GENERATE_REPORTS)),
    db=Depends(get_db)
):
    """Generate a new report."""
    try:
        report_id = await reports_service.queue_report_generation(
            db,
            request=report_request,
            requested_by=current_admin["id"]
        )
        
        # Log report generation
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.REPORT_GENERATED,
            resource_type="report",
            resource_id=report_id,
            description=f"Generated report: {report_request.name}",
            severity=AuditSeverity.MEDIUM
        )
        
        return {
            "report_id": report_id,
            "message": "Report generation queued successfully",
            "estimated_completion": "5-15 minutes"
        }
        
    except Exception as e:
        logger.error("Failed to generate report", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to generate report")


@router.get("/{report_id}/download")
async def download_report(
    report_id: str,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_REPORTS)),
    db=Depends(get_db)
):
    """Download a generated report file."""
    try:
        file_path = await reports_service.get_report_file_path(db, report_id)
        
        if not file_path:
            raise HTTPException(status_code=404, detail="Report file not found")
        
        # Log report download
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.DATA_EXPORTED,
            resource_type="report",
            resource_id=report_id,
            description=f"Downloaded report: {report_id}",
            severity=AuditSeverity.LOW
        )
        
        return FileResponse(
            path=file_path,
            filename=f"report_{report_id}.xlsx",
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to download report", report_id=report_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to download report")


@router.get("/templates/", response_model=List[ReportTemplate])
async def get_report_templates(
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_REPORTS)),
    db=Depends(get_db)
):
    """Get available report templates."""
    try:
        templates = await reports_service.get_report_templates(db)
        return templates
        
    except Exception as e:
        logger.error("Failed to get report templates", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve report templates")


@router.get("/scheduled/", response_model=List[ScheduledReport])
async def get_scheduled_reports(
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_REPORTS)),
    db=Depends(get_db)
):
    """Get list of scheduled reports."""
    try:
        scheduled_reports = await reports_service.get_scheduled_reports(db)
        return scheduled_reports
        
    except Exception as e:
        logger.error("Failed to get scheduled reports", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve scheduled reports")


@router.post("/scheduled/")
async def create_scheduled_report(
    scheduled_report: ScheduledReport,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_REPORTS)),
    db=Depends(get_db)
):
    """Create a new scheduled report."""
    try:
        result = await reports_service.create_scheduled_report(
            db,
            scheduled_report=scheduled_report,
            created_by=current_admin["id"]
        )
        
        # Log scheduled report creation
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.SYSTEM_SETTING_CHANGED,
            resource_type="scheduled_report",
            resource_id=result["id"],
            description=f"Created scheduled report: {scheduled_report.name}",
            severity=AuditSeverity.MEDIUM
        )
        
        return result
        
    except Exception as e:
        logger.error("Failed to create scheduled report", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to create scheduled report")


@router.delete("/{report_id}")
async def delete_report(
    report_id: str,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_REPORTS)),
    db=Depends(get_db)
):
    """Delete a report and its associated files."""
    try:
        result = await reports_service.delete_report(
            db,
            report_id=report_id,
            deleted_by=current_admin["id"]
        )
        
        # Log report deletion
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.DATA_DELETED,
            resource_type="report",
            resource_id=report_id,
            description=f"Deleted report: {report_id}",
            severity=AuditSeverity.MEDIUM
        )
        
        return result
        
    except Exception as e:
        logger.error("Failed to delete report", report_id=report_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to delete report")