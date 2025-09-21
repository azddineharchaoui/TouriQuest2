"""Content moderation endpoints for managing user-generated content."""

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import structlog

from app.core.security import get_current_admin, require_permission, Permission
from app.core.database import get_db
from app.schemas.content_moderation import (
    ContentModerationSummary,
    ContentModerationDetail,
    ContentModerationUpdate,
    ContentModerationFilters,
    BulkModerationAction,
    AppealSubmission,
    AppealResponse
)
from app.services.content_moderation_service import ContentModerationService
from app.services.audit_service import AuditService
from app.models import AuditAction, AuditSeverity

logger = structlog.get_logger()
router = APIRouter()

# Initialize services
moderation_service = ContentModerationService()
audit_service = AuditService()


@router.get("/", response_model=List[ContentModerationSummary])
async def get_content_moderations(
    page: int = Query(default=1, ge=1, description="Page number"),
    limit: int = Query(default=50, ge=1, le=200, description="Items per page"),
    status: Optional[str] = Query(default=None, description="Filter by moderation status"),
    content_type: Optional[str] = Query(default=None, description="Filter by content type"),
    priority: Optional[str] = Query(default="pending", description="Filter by priority"),
    date_from: Optional[datetime] = Query(default=None, description="Filter by date from"),
    date_to: Optional[datetime] = Query(default=None, description="Filter by date to"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_CONTENT)),
    db=Depends(get_db)
):
    """
    Get paginated list of content moderations with filtering.
    
    Returns content items that need review or have been reviewed.
    """
    try:
        filters = ContentModerationFilters(
            status=status,
            content_type=content_type,
            priority=priority,
            date_from=date_from,
            date_to=date_to
        )
        
        moderations = await moderation_service.get_moderations(
            db,
            page=page,
            limit=limit,
            filters=filters
        )
        
        # Log access to moderation list
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.CONTENT_FLAGGED,
            resource_type="content_moderation_list",
            description=f"Accessed content moderation list with filters: {filters.dict()}",
            severity=AuditSeverity.LOW
        )
        
        return moderations
        
    except Exception as e:
        logger.error("Failed to get content moderations", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve content moderations")


@router.get("/{moderation_id}", response_model=ContentModerationDetail)
async def get_moderation_detail(
    moderation_id: str,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_CONTENT)),
    db=Depends(get_db)
):
    """Get detailed information about a specific content moderation."""
    try:
        moderation = await moderation_service.get_moderation_detail(db, moderation_id)
        
        if not moderation:
            raise HTTPException(status_code=404, detail="Content moderation not found")
        
        # Log access to moderation detail
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.CONTENT_FLAGGED,
            resource_type="content_moderation",
            resource_id=moderation_id,
            description=f"Accessed content moderation detail for {moderation_id}",
            severity=AuditSeverity.LOW
        )
        
        return moderation
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get moderation detail", moderation_id=moderation_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve moderation details")


@router.post("/{moderation_id}/approve")
async def approve_content(
    moderation_id: str,
    approval_notes: Optional[str] = None,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MODERATE_CONTENT)),
    db=Depends(get_db)
):
    """Approve content after moderation review."""
    try:
        result = await moderation_service.approve_content(
            db,
            moderation_id=moderation_id,
            moderator_id=current_admin["id"],
            notes=approval_notes
        )
        
        # Log content approval
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.CONTENT_APPROVED,
            resource_type="content",
            resource_id=moderation_id,
            description=f"Approved content: {approval_notes or 'No notes provided'}",
            severity=AuditSeverity.MEDIUM,
            new_data={"status": "approved", "notes": approval_notes}
        )
        
        logger.info(
            "Content approved",
            moderation_id=moderation_id,
            admin_id=current_admin["id"]
        )
        
        return result
        
    except Exception as e:
        logger.error("Failed to approve content", moderation_id=moderation_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to approve content")


@router.post("/{moderation_id}/reject")
async def reject_content(
    moderation_id: str,
    rejection_reason: str,
    rejection_notes: Optional[str] = None,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MODERATE_CONTENT)),
    db=Depends(get_db)
):
    """Reject content after moderation review."""
    try:
        result = await moderation_service.reject_content(
            db,
            moderation_id=moderation_id,
            moderator_id=current_admin["id"],
            reason=rejection_reason,
            notes=rejection_notes
        )
        
        # Log content rejection
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.CONTENT_REJECTED,
            resource_type="content",
            resource_id=moderation_id,
            description=f"Rejected content: {rejection_reason}",
            severity=AuditSeverity.MEDIUM,
            new_data={
                "status": "rejected",
                "reason": rejection_reason,
                "notes": rejection_notes
            }
        )
        
        logger.info(
            "Content rejected",
            moderation_id=moderation_id,
            reason=rejection_reason,
            admin_id=current_admin["id"]
        )
        
        return result
        
    except Exception as e:
        logger.error("Failed to reject content", moderation_id=moderation_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to reject content")


@router.delete("/{moderation_id}")
async def delete_content(
    moderation_id: str,
    deletion_reason: str,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.DELETE_CONTENT)),
    db=Depends(get_db)
):
    """Delete content and remove from platform."""
    try:
        result = await moderation_service.delete_content(
            db,
            moderation_id=moderation_id,
            moderator_id=current_admin["id"],
            reason=deletion_reason
        )
        
        # Log content deletion
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.CONTENT_DELETED,
            resource_type="content",
            resource_id=moderation_id,
            description=f"Deleted content: {deletion_reason}",
            severity=AuditSeverity.HIGH,
            new_data={"reason": deletion_reason}
        )
        
        logger.warning(
            "Content deleted",
            moderation_id=moderation_id,
            reason=deletion_reason,
            admin_id=current_admin["id"]
        )
        
        return result
        
    except Exception as e:
        logger.error("Failed to delete content", moderation_id=moderation_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to delete content")


@router.post("/bulk-action")
async def bulk_moderation_action(
    bulk_action: BulkModerationAction,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MODERATE_CONTENT)),
    db=Depends(get_db)
):
    """Perform bulk moderation actions on multiple content items."""
    try:
        if len(bulk_action.moderation_ids) > 100:
            raise HTTPException(
                status_code=400,
                detail="Bulk action limited to 100 items at a time"
            )
        
        result = await moderation_service.bulk_moderation_action(
            db,
            moderation_ids=bulk_action.moderation_ids,
            action=bulk_action.action,
            reason=bulk_action.reason,
            moderator_id=current_admin["id"]
        )
        
        # Log bulk moderation action
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.CONTENT_APPROVED if bulk_action.action == "approve" else AuditAction.CONTENT_REJECTED,
            resource_type="content_bulk",
            description=f"Performed bulk action '{bulk_action.action}' on {len(bulk_action.moderation_ids)} items",
            severity=AuditSeverity.HIGH,
            new_data={
                "action": bulk_action.action,
                "item_count": len(bulk_action.moderation_ids),
                "reason": bulk_action.reason
            }
        )
        
        logger.info(
            "Bulk moderation action performed",
            action=bulk_action.action,
            item_count=len(bulk_action.moderation_ids),
            admin_id=current_admin["id"]
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to perform bulk moderation action", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to perform bulk action")


@router.post("/{moderation_id}/appeal")
async def submit_appeal(
    moderation_id: str,
    appeal: AppealSubmission,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MODERATE_CONTENT)),
    db=Depends(get_db)
):
    """Submit an appeal for a moderation decision (admin can submit on behalf of user)."""
    try:
        result = await moderation_service.submit_appeal(
            db,
            moderation_id=moderation_id,
            appeal_text=appeal.appeal_text,
            submitted_by_admin=True,
            admin_id=current_admin["id"]
        )
        
        return result
        
    except Exception as e:
        logger.error("Failed to submit appeal", moderation_id=moderation_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to submit appeal")


@router.post("/{moderation_id}/resolve-appeal")
async def resolve_appeal(
    moderation_id: str,
    appeal_response: AppealResponse,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MODERATE_CONTENT)),
    db=Depends(get_db)
):
    """Resolve an appeal for a moderation decision."""
    try:
        result = await moderation_service.resolve_appeal(
            db,
            moderation_id=moderation_id,
            resolution=appeal_response.resolution,
            response_text=appeal_response.response_text,
            admin_id=current_admin["id"]
        )
        
        # Log appeal resolution
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.CONTENT_APPROVED,  # Use appropriate action
            resource_type="content_appeal",
            resource_id=moderation_id,
            description=f"Resolved appeal: {appeal_response.resolution}",
            severity=AuditSeverity.MEDIUM,
            new_data={
                "resolution": appeal_response.resolution,
                "response": appeal_response.response_text
            }
        )
        
        return result
        
    except Exception as e:
        logger.error("Failed to resolve appeal", moderation_id=moderation_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to resolve appeal")


@router.get("/stats/summary")
async def get_moderation_stats(
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_ANALYTICS)),
    db=Depends(get_db)
):
    """Get moderation statistics for dashboard."""
    try:
        stats = await moderation_service.get_moderation_stats(db)
        return stats
        
    except Exception as e:
        logger.error("Failed to get moderation stats", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve moderation statistics")


@router.post("/auto-scan")
async def trigger_auto_scan(
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_SYSTEM)),
    db=Depends(get_db)
):
    """Trigger automated content scanning for all pending items."""
    try:
        result = await moderation_service.trigger_auto_scan(db)
        
        # Log auto-scan trigger
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.SYSTEM_SETTING_CHANGED,
            resource_type="content_auto_scan",
            description="Triggered automated content scanning",
            severity=AuditSeverity.MEDIUM
        )
        
        return result
        
    except Exception as e:
        logger.error("Failed to trigger auto-scan", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to trigger automated scanning")