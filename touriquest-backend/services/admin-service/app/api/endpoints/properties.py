"""Property management endpoints for admin operations."""

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from typing import List, Optional, Dict, Any
from datetime import datetime
import structlog

from app.core.security import get_current_admin, require_permission, Permission
from app.core.database import get_db
from app.schemas.property import (
    PropertySummary,
    PropertyDetail,
    PropertyApproval,
    PropertyFilters,
    PropertyStats,
    PropertyBulkAction
)
from app.services.property_service import PropertyService
from app.services.audit_service import AuditService
from app.models import AuditAction, AuditSeverity

logger = structlog.get_logger()
router = APIRouter()

# Initialize services
property_service = PropertyService()
audit_service = AuditService()


@router.get("/", response_model=List[PropertySummary])
async def get_properties(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=200),
    status: Optional[str] = Query(default=None),
    type: Optional[str] = Query(default=None),
    location: Optional[str] = Query(default=None),
    date_from: Optional[datetime] = Query(default=None),
    date_to: Optional[datetime] = Query(default=None),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_PROPERTIES)),
    db=Depends(get_db)
):
    """Get paginated list of properties with filtering."""
    try:
        filters = PropertyFilters(
            status=status,
            type=type,
            location=location,
            date_from=date_from,
            date_to=date_to
        )
        
        properties = await property_service.get_properties(
            db,
            page=page,
            limit=limit,
            filters=filters
        )
        
        return properties
        
    except Exception as e:
        logger.error("Failed to get properties", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve properties")


@router.get("/{property_id}", response_model=PropertyDetail)
async def get_property_detail(
    property_id: str,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_PROPERTIES)),
    db=Depends(get_db)
):
    """Get detailed information about a specific property."""
    try:
        property_detail = await property_service.get_property_detail(db, property_id)
        
        if not property_detail:
            raise HTTPException(status_code=404, detail="Property not found")
        
        return property_detail
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get property detail", property_id=property_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve property details")


@router.post("/{property_id}/approve")
async def approve_property(
    property_id: str,
    approval: PropertyApproval,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_PROPERTIES)),
    db=Depends(get_db)
):
    """Approve a property listing."""
    try:
        result = await property_service.approve_property(
            db,
            property_id=property_id,
            approved_by=current_admin["id"],
            notes=approval.notes
        )
        
        # Log property approval
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.PROPERTY_APPROVED,
            resource_type="property",
            resource_id=property_id,
            description=f"Approved property: {approval.notes or 'No notes'}",
            severity=AuditSeverity.MEDIUM
        )
        
        return result
        
    except Exception as e:
        logger.error("Failed to approve property", property_id=property_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to approve property")


@router.post("/{property_id}/reject")
async def reject_property(
    property_id: str,
    rejection_reason: str,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_PROPERTIES)),
    db=Depends(get_db)
):
    """Reject a property listing."""
    try:
        result = await property_service.reject_property(
            db,
            property_id=property_id,
            rejected_by=current_admin["id"],
            reason=rejection_reason
        )
        
        # Log property rejection
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.PROPERTY_REJECTED,
            resource_type="property",
            resource_id=property_id,
            description=f"Rejected property: {rejection_reason}",
            severity=AuditSeverity.MEDIUM
        )
        
        return result
        
    except Exception as e:
        logger.error("Failed to reject property", property_id=property_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to reject property")


@router.post("/bulk-action")
async def bulk_property_action(
    bulk_action: PropertyBulkAction,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_PROPERTIES)),
    db=Depends(get_db)
):
    """Perform bulk actions on multiple properties."""
    try:
        result = await property_service.bulk_property_action(
            db,
            property_ids=bulk_action.property_ids,
            action=bulk_action.action,
            reason=bulk_action.reason,
            admin_id=current_admin["id"]
        )
        
        # Log bulk action
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.PROPERTY_APPROVED,  # Use appropriate action
            resource_type="property_bulk",
            description=f"Performed bulk action '{bulk_action.action}' on {len(bulk_action.property_ids)} properties",
            severity=AuditSeverity.HIGH
        )
        
        return result
        
    except Exception as e:
        logger.error("Failed to perform bulk property action", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to perform bulk action")


@router.get("/stats/summary", response_model=PropertyStats)
async def get_property_stats(
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_ANALYTICS)),
    db=Depends(get_db)
):
    """Get property statistics for dashboard."""
    try:
        stats = await property_service.get_property_stats(db)
        return stats
        
    except Exception as e:
        logger.error("Failed to get property stats", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve property statistics")