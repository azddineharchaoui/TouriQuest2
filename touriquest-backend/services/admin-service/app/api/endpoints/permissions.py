"""Permissions management endpoints for role-based access control."""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional, Dict, Any
from datetime import datetime
import structlog

from app.core.security import get_current_admin, require_permission, Permission
from app.core.database import get_db
from app.schemas.permissions import (
    PermissionDetail,
    RoleDetail,
    RoleCreate,
    RoleUpdate,
    UserRoleAssignment,
    PermissionAssignment,
    RolePermissionMatrix,
    AccessControlList
)
from app.services.permissions_service import PermissionsService
from app.services.audit_service import AuditService
from app.models import AuditAction, AuditSeverity

logger = structlog.get_logger()
router = APIRouter()

# Initialize services
permissions_service = PermissionsService()
audit_service = AuditService()


@router.get("/", response_model=List[PermissionDetail])
async def get_all_permissions(
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_PERMISSIONS)),
    db=Depends(get_db)
):
    """Get all available permissions in the system."""
    try:
        permissions = await permissions_service.get_all_permissions(db)
        return permissions
        
    except Exception as e:
        logger.error("Failed to get permissions", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve permissions")


@router.get("/roles", response_model=List[RoleDetail])
async def get_all_roles(
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_PERMISSIONS)),
    db=Depends(get_db)
):
    """Get all roles with their permissions."""
    try:
        roles = await permissions_service.get_all_roles(db)
        return roles
        
    except Exception as e:
        logger.error("Failed to get roles", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve roles")


@router.get("/roles/{role_id}", response_model=RoleDetail)
async def get_role_detail(
    role_id: str,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_PERMISSIONS)),
    db=Depends(get_db)
):
    """Get detailed information about a specific role."""
    try:
        role = await permissions_service.get_role_detail(db, role_id)
        
        if not role:
            raise HTTPException(status_code=404, detail="Role not found")
            
        return role
        
    except Exception as e:
        logger.error("Failed to get role detail", error=str(e), role_id=role_id)
        raise HTTPException(status_code=500, detail="Failed to retrieve role details")


@router.post("/roles", response_model=RoleDetail)
async def create_role(
    role_data: RoleCreate,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_PERMISSIONS)),
    db=Depends(get_db)
):
    """Create a new role with specified permissions."""
    try:
        role = await permissions_service.create_role(db, role_data, current_admin["id"])
        
        # Log role creation
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.ROLE_CREATED,
            resource_type="role",
            resource_id=role.id,
            description=f"Created role: {role.name}",
            severity=AuditSeverity.MEDIUM
        )
        
        return role
        
    except Exception as e:
        logger.error("Failed to create role", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to create role")


@router.put("/roles/{role_id}", response_model=RoleDetail)
async def update_role(
    role_id: str,
    role_data: RoleUpdate,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_PERMISSIONS)),
    db=Depends(get_db)
):
    """Update an existing role."""
    try:
        role = await permissions_service.update_role(db, role_id, role_data, current_admin["id"])
        
        if not role:
            raise HTTPException(status_code=404, detail="Role not found")
        
        # Log role update
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.ROLE_UPDATED,
            resource_type="role",
            resource_id=role_id,
            description=f"Updated role: {role.name}",
            severity=AuditSeverity.MEDIUM
        )
        
        return role
        
    except Exception as e:
        logger.error("Failed to update role", error=str(e), role_id=role_id)
        raise HTTPException(status_code=500, detail="Failed to update role")


@router.delete("/roles/{role_id}")
async def delete_role(
    role_id: str,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_PERMISSIONS)),
    db=Depends(get_db)
):
    """Delete a role (must not be assigned to any users)."""
    try:
        result = await permissions_service.delete_role(db, role_id, current_admin["id"])
        
        if not result:
            raise HTTPException(status_code=404, detail="Role not found")
        
        # Log role deletion
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.ROLE_DELETED,
            resource_type="role",
            resource_id=role_id,
            description=f"Deleted role: {role_id}",
            severity=AuditSeverity.HIGH
        )
        
        return {"message": "Role deleted successfully"}
        
    except Exception as e:
        logger.error("Failed to delete role", error=str(e), role_id=role_id)
        raise HTTPException(status_code=500, detail="Failed to delete role")


@router.post("/roles/{role_id}/permissions")
async def assign_permissions_to_role(
    role_id: str,
    permission_assignment: PermissionAssignment,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_PERMISSIONS)),
    db=Depends(get_db)
):
    """Assign permissions to a role."""
    try:
        result = await permissions_service.assign_permissions_to_role(
            db, role_id, permission_assignment.permission_ids, current_admin["id"]
        )
        
        # Log permission assignment
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.PERMISSIONS_ASSIGNED,
            resource_type="role",
            resource_id=role_id,
            description=f"Assigned {len(permission_assignment.permission_ids)} permissions to role",
            severity=AuditSeverity.MEDIUM
        )
        
        return result
        
    except Exception as e:
        logger.error("Failed to assign permissions", error=str(e), role_id=role_id)
        raise HTTPException(status_code=500, detail="Failed to assign permissions to role")


@router.delete("/roles/{role_id}/permissions/{permission_id}")
async def revoke_permission_from_role(
    role_id: str,
    permission_id: str,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_PERMISSIONS)),
    db=Depends(get_db)
):
    """Revoke a specific permission from a role."""
    try:
        result = await permissions_service.revoke_permission_from_role(
            db, role_id, permission_id, current_admin["id"]
        )
        
        # Log permission revocation
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.PERMISSION_REVOKED,
            resource_type="role",
            resource_id=role_id,
            description=f"Revoked permission {permission_id} from role",
            severity=AuditSeverity.MEDIUM
        )
        
        return result
        
    except Exception as e:
        logger.error("Failed to revoke permission", error=str(e), role_id=role_id, permission_id=permission_id)
        raise HTTPException(status_code=500, detail="Failed to revoke permission from role")


@router.post("/users/{user_id}/roles")
async def assign_role_to_user(
    user_id: str,
    role_assignment: UserRoleAssignment,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_PERMISSIONS)),
    db=Depends(get_db)
):
    """Assign a role to a user."""
    try:
        result = await permissions_service.assign_role_to_user(
            db, user_id, role_assignment.role_id, current_admin["id"]
        )
        
        # Log role assignment
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.ROLE_ASSIGNED,
            resource_type="user",
            resource_id=user_id,
            description=f"Assigned role {role_assignment.role_id} to user",
            severity=AuditSeverity.MEDIUM
        )
        
        return result
        
    except Exception as e:
        logger.error("Failed to assign role to user", error=str(e), user_id=user_id)
        raise HTTPException(status_code=500, detail="Failed to assign role to user")


@router.delete("/users/{user_id}/roles/{role_id}")
async def revoke_role_from_user(
    user_id: str,
    role_id: str,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_PERMISSIONS)),
    db=Depends(get_db)
):
    """Revoke a role from a user."""
    try:
        result = await permissions_service.revoke_role_from_user(
            db, user_id, role_id, current_admin["id"]
        )
        
        # Log role revocation
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.ROLE_REVOKED,
            resource_type="user",
            resource_id=user_id,
            description=f"Revoked role {role_id} from user",
            severity=AuditSeverity.MEDIUM
        )
        
        return result
        
    except Exception as e:
        logger.error("Failed to revoke role from user", error=str(e), user_id=user_id, role_id=role_id)
        raise HTTPException(status_code=500, detail="Failed to revoke role from user")


@router.get("/users/{user_id}/permissions", response_model=List[PermissionDetail])
async def get_user_permissions(
    user_id: str,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_PERMISSIONS)),
    db=Depends(get_db)
):
    """Get all permissions for a specific user (aggregated from roles)."""
    try:
        permissions = await permissions_service.get_user_permissions(db, user_id)
        return permissions
        
    except Exception as e:
        logger.error("Failed to get user permissions", error=str(e), user_id=user_id)
        raise HTTPException(status_code=500, detail="Failed to retrieve user permissions")


@router.get("/matrix", response_model=RolePermissionMatrix)
async def get_role_permission_matrix(
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_PERMISSIONS)),
    db=Depends(get_db)
):
    """Get role-permission matrix for admin dashboard."""
    try:
        matrix = await permissions_service.get_role_permission_matrix(db)
        return matrix
        
    except Exception as e:
        logger.error("Failed to get role permission matrix", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve role permission matrix")


@router.get("/access-control", response_model=AccessControlList)
async def get_access_control_list(
    resource_type: Optional[str] = Query(default=None, description="Filter by resource type"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_PERMISSIONS)),
    db=Depends(get_db)
):
    """Get access control list showing who has access to what resources."""
    try:
        acl = await permissions_service.get_access_control_list(db, resource_type)
        return acl
        
    except Exception as e:
        logger.error("Failed to get access control list", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve access control list")


@router.post("/validate")
async def validate_user_permission(
    user_id: str = Query(..., description="User ID to validate"),
    permission: str = Query(..., description="Permission to check"),
    resource_id: Optional[str] = Query(default=None, description="Specific resource ID"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_PERMISSIONS)),
    db=Depends(get_db)
):
    """Validate if a user has a specific permission."""
    try:
        has_permission = await permissions_service.validate_user_permission(
            db, user_id, permission, resource_id
        )
        
        return {
            "user_id": user_id,
            "permission": permission,
            "resource_id": resource_id,
            "has_permission": has_permission,
            "checked_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error("Failed to validate user permission", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to validate user permission")


@router.get("/audit/permissions")
async def get_permission_audit_log(
    user_id: Optional[str] = Query(default=None, description="Filter by user ID"),
    role_id: Optional[str] = Query(default=None, description="Filter by role ID"),
    days: int = Query(default=30, ge=1, le=365, description="Days of audit history"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_AUDIT)),
    db=Depends(get_db)
):
    """Get audit log for permission changes."""
    try:
        audit_log = await permissions_service.get_permission_audit_log(
            db, user_id=user_id, role_id=role_id, days=days
        )
        return audit_log
        
    except Exception as e:
        logger.error("Failed to get permission audit log", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve permission audit log")