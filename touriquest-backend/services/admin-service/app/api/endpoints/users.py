"""User management endpoints for admin operations."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import structlog

from app.core.security import get_current_admin, require_permission, Permission
from app.core.database import get_db
from app.schemas.user_management import (
    UserSummary,
    UserDetail,
    UserModerationCreate,
    UserModerationUpdate,
    UserStatusUpdate,
    UserSearchFilters,
    BulkUserAction
)
from app.services.user_management_service import UserManagementService
from app.services.audit_service import AuditService
from app.models import AuditAction, AuditSeverity

logger = structlog.get_logger()
router = APIRouter()

# Initialize services
user_service = UserManagementService()
audit_service = AuditService()


@router.get("/", response_model=List[UserSummary])
async def get_users(
    page: int = Query(default=1, ge=1, description="Page number"),
    limit: int = Query(default=50, ge=1, le=200, description="Items per page"),
    search: Optional[str] = Query(default=None, description="Search by name or email"),
    status: Optional[str] = Query(default=None, description="Filter by user status"),
    verified_only: bool = Query(default=False, description="Show only verified users"),
    banned_only: bool = Query(default=False, description="Show only banned users"),
    created_from: Optional[datetime] = Query(default=None, description="Filter by creation date from"),
    created_to: Optional[datetime] = Query(default=None, description="Filter by creation date to"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_USERS)),
    db=Depends(get_db)
):
    """
    Get paginated list of users with filtering options.
    
    Supports filtering by:
    - Search term (name, email)
    - User status
    - Verification status
    - Ban status
    - Creation date range
    """
    try:
        filters = UserSearchFilters(
            search=search,
            status=status,
            verified_only=verified_only,
            banned_only=banned_only,
            created_from=created_from,
            created_to=created_to
        )
        
        users = await user_service.get_users(
            db, 
            page=page, 
            limit=limit, 
            filters=filters
        )
        
        # Log user list access
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.USER_CREATED,  # Using closest available action
            resource_type="user_list",
            description=f"Accessed user list with filters: {filters.dict()}",
            severity=AuditSeverity.LOW
        )
        
        return users
        
    except Exception as e:
        logger.error("Failed to get users", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve users")


@router.get("/{user_id}", response_model=UserDetail)
async def get_user_detail(
    user_id: str,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_USERS)),
    db=Depends(get_db)
):
    """Get detailed information about a specific user."""
    try:
        user = await user_service.get_user_detail(db, user_id)
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Log user detail access
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.USER_CREATED,  # Using closest available action
            resource_type="user",
            resource_id=user_id,
            description=f"Accessed user detail for user {user_id}",
            severity=AuditSeverity.LOW
        )
        
        return user
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get user detail", user_id=user_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve user details")


@router.put("/{user_id}/status", response_model=Dict[str, str])
async def update_user_status(
    user_id: str,
    status_update: UserStatusUpdate,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.EDIT_USERS)),
    db=Depends(get_db)
):
    """Update user account status (active, suspended, banned, etc.)."""
    try:
        # Get current user state for audit trail
        current_user = await user_service.get_user_detail(db, user_id)
        if not current_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Update user status
        result = await user_service.update_user_status(
            db, 
            user_id, 
            status_update,
            admin_id=current_admin["id"]
        )
        
        # Log the status change
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.USER_UPDATED,
            resource_type="user",
            resource_id=user_id,
            description=f"Updated user status from {current_user.status} to {status_update.new_status}",
            severity=AuditSeverity.MEDIUM,
            old_data={"status": current_user.status},
            new_data={"status": status_update.new_status, "reason": status_update.reason}
        )
        
        logger.info(
            "User status updated",
            user_id=user_id,
            old_status=current_user.status,
            new_status=status_update.new_status,
            admin_id=current_admin["id"]
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to update user status", user_id=user_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to update user status")


@router.post("/{user_id}/ban")
async def ban_user(
    user_id: str,
    ban_reason: str,
    ban_duration_days: Optional[int] = None,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.BAN_USERS)),
    db=Depends(get_db)
):
    """Ban a user account with optional duration."""
    try:
        result = await user_service.ban_user(
            db,
            user_id=user_id,
            reason=ban_reason,
            duration_days=ban_duration_days,
            admin_id=current_admin["id"]
        )
        
        # Log the ban action
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.USER_BANNED,
            resource_type="user",
            resource_id=user_id,
            description=f"Banned user: {ban_reason}",
            severity=AuditSeverity.HIGH,
            new_data={
                "reason": ban_reason,
                "duration_days": ban_duration_days,
                "banned_until": result.get("banned_until")
            }
        )
        
        logger.warning(
            "User banned",
            user_id=user_id,
            reason=ban_reason,
            duration_days=ban_duration_days,
            admin_id=current_admin["id"]
        )
        
        return result
        
    except Exception as e:
        logger.error("Failed to ban user", user_id=user_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to ban user")


@router.post("/{user_id}/unban")
async def unban_user(
    user_id: str,
    unban_reason: str,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.BAN_USERS)),
    db=Depends(get_db)
):
    """Remove ban from a user account."""
    try:
        result = await user_service.unban_user(
            db,
            user_id=user_id,
            reason=unban_reason,
            admin_id=current_admin["id"]
        )
        
        # Log the unban action
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.USER_UNBANNED,
            resource_type="user",
            resource_id=user_id,
            description=f"Unbanned user: {unban_reason}",
            severity=AuditSeverity.MEDIUM,
            new_data={"reason": unban_reason}
        )
        
        logger.info(
            "User unbanned",
            user_id=user_id,
            reason=unban_reason,
            admin_id=current_admin["id"]
        )
        
        return result
        
    except Exception as e:
        logger.error("Failed to unban user", user_id=user_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to unban user")


@router.post("/{user_id}/verify")
async def verify_user(
    user_id: str,
    verification_notes: Optional[str] = None,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.EDIT_USERS)),
    db=Depends(get_db)
):
    """Manually verify a user account."""
    try:
        result = await user_service.verify_user(
            db,
            user_id=user_id,
            notes=verification_notes,
            admin_id=current_admin["id"]
        )
        
        # Log the verification action
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.USER_VERIFIED,
            resource_type="user",
            resource_id=user_id,
            description=f"Manually verified user account",
            severity=AuditSeverity.MEDIUM,
            new_data={"notes": verification_notes}
        )
        
        return result
        
    except Exception as e:
        logger.error("Failed to verify user", user_id=user_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to verify user")


@router.get("/{user_id}/moderation-history")
async def get_user_moderation_history(
    user_id: str,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_USERS)),
    db=Depends(get_db)
):
    """Get moderation history for a specific user."""
    try:
        history = await user_service.get_moderation_history(db, user_id)
        return {"user_id": user_id, "moderation_history": history}
        
    except Exception as e:
        logger.error("Failed to get moderation history", user_id=user_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve moderation history")


@router.get("/{user_id}/activity-log")
async def get_user_activity_log(
    user_id: str,
    limit: int = Query(default=50, ge=1, le=200),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_USERS)),
    db=Depends(get_db)
):
    """Get recent activity log for a user."""
    try:
        activity = await user_service.get_user_activity(db, user_id, limit)
        return {"user_id": user_id, "activity_log": activity}
        
    except Exception as e:
        logger.error("Failed to get user activity", user_id=user_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve user activity")


@router.post("/bulk-action")
async def bulk_user_action(
    bulk_action: BulkUserAction,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.EDIT_USERS)),
    db=Depends(get_db)
):
    """Perform bulk actions on multiple users."""
    try:
        if len(bulk_action.user_ids) > 100:
            raise HTTPException(
                status_code=400, 
                detail="Bulk action limited to 100 users at a time"
            )
        
        result = await user_service.bulk_action(
            db,
            user_ids=bulk_action.user_ids,
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
            action=AuditAction.USER_UPDATED,
            resource_type="user_bulk",
            description=f"Performed bulk action '{bulk_action.action}' on {len(bulk_action.user_ids)} users",
            severity=AuditSeverity.HIGH,
            new_data={
                "action": bulk_action.action,
                "user_count": len(bulk_action.user_ids),
                "reason": bulk_action.reason
            }
        )
        
        logger.info(
            "Bulk user action performed",
            action=bulk_action.action,
            user_count=len(bulk_action.user_ids),
            admin_id=current_admin["id"]
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to perform bulk action", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to perform bulk action")


@router.get("/stats/summary")
async def get_user_stats_summary(
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_ANALYTICS)),
    db=Depends(get_db)
):
    """Get summary statistics about users."""
    try:
        stats = await user_service.get_user_stats(db)
        return stats
        
    except Exception as e:
        logger.error("Failed to get user stats", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve user statistics")