"""Authentication and authorization endpoints for admin users."""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from typing import Dict, Any
import structlog

from app.core.security import (
    authenticate_admin,
    create_admin_access_token,
    get_current_admin,
    require_permission,
    Permission,
    AdminRole
)
from app.core.database import get_db
from app.schemas.auth import (
    AdminLogin,
    AdminLoginResponse,
    AdminTokenRefresh,
    AdminProfile,
    AdminProfileUpdate,
    PasswordChange,
    AdminRegistration
)
from app.services.auth_service import AuthService
from app.services.audit_service import AuditService
from app.models import AuditAction, AuditSeverity

logger = structlog.get_logger()
router = APIRouter()
security = HTTPBearer()

# Initialize services
auth_service = AuthService()
audit_service = AuditService()


@router.post("/login", response_model=AdminLoginResponse)
async def admin_login(
    login_data: AdminLogin,
    db=Depends(get_db)
):
    """Authenticate admin user and return access token."""
    try:
        # Authenticate admin
        admin_user = await authenticate_admin(
            db,
            email=login_data.email,
            password=login_data.password
        )
        
        if not admin_user:
            # Log failed login attempt
            await audit_service.log_action(
                db=db,
                admin_id=None,
                admin_email=login_data.email,
                admin_role="unknown",
                action=AuditAction.LOGIN_FAILED,
                resource_type="admin_auth",
                description=f"Failed login attempt for {login_data.email}",
                severity=AuditSeverity.MEDIUM
            )
            
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Generate access token
        access_token = create_admin_access_token(
            data={"sub": admin_user.email, "admin_id": str(admin_user.id)}
        )
        
        # Log successful login
        await audit_service.log_action(
            db=db,
            admin_id=str(admin_user.id),
            admin_email=admin_user.email,
            admin_role=admin_user.role.value,
            action=AuditAction.LOGIN_SUCCESS,
            resource_type="admin_auth",
            description=f"Successful login for {admin_user.email}",
            severity=AuditSeverity.LOW
        )
        
        logger.info(
            "Admin login successful",
            admin_id=str(admin_user.id),
            email=admin_user.email,
            role=admin_user.role.value
        )
        
        return AdminLoginResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=3600,  # 1 hour
            admin_id=str(admin_user.id),
            email=admin_user.email,
            role=admin_user.role.value,
            permissions=admin_user.role.get_permissions()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Admin login failed", email=login_data.email, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed due to server error"
        )


@router.post("/logout")
async def admin_logout(
    current_admin: Dict[str, Any] = Depends(get_current_admin),
    db=Depends(get_db)
):
    """Logout admin user and invalidate token."""
    try:
        # Log logout
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.LOGOUT,
            resource_type="admin_auth",
            description=f"Admin logout: {current_admin['email']}",
            severity=AuditSeverity.LOW
        )
        
        # In a production system, you would invalidate the token in a token blacklist
        # For now, we just log the logout
        
        return {"message": "Logout successful"}
        
    except Exception as e:
        logger.error("Admin logout failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Logout failed"
        )


@router.get("/profile", response_model=AdminProfile)
async def get_admin_profile(
    current_admin: Dict[str, Any] = Depends(get_current_admin),
    db=Depends(get_db)
):
    """Get current admin user profile."""
    try:
        profile = await auth_service.get_admin_profile(db, current_admin["id"])
        
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Admin profile not found"
            )
        
        return profile
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get admin profile", admin_id=current_admin["id"], error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve profile"
        )


@router.put("/profile", response_model=AdminProfile)
async def update_admin_profile(
    profile_update: AdminProfileUpdate,
    current_admin: Dict[str, Any] = Depends(get_current_admin),
    db=Depends(get_db)
):
    """Update current admin user profile."""
    try:
        updated_profile = await auth_service.update_admin_profile(
            db,
            admin_id=current_admin["id"],
            profile_update=profile_update
        )
        
        # Log profile update
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.PROFILE_UPDATED,
            resource_type="admin_profile",
            resource_id=current_admin["id"],
            description="Updated admin profile",
            severity=AuditSeverity.LOW
        )
        
        return updated_profile
        
    except Exception as e:
        logger.error("Failed to update admin profile", admin_id=current_admin["id"], error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update profile"
        )


@router.post("/change-password")
async def change_admin_password(
    password_change: PasswordChange,
    current_admin: Dict[str, Any] = Depends(get_current_admin),
    db=Depends(get_db)
):
    """Change admin user password."""
    try:
        success = await auth_service.change_admin_password(
            db,
            admin_id=current_admin["id"],
            current_password=password_change.current_password,
            new_password=password_change.new_password
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )
        
        # Log password change
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.PASSWORD_CHANGED,
            resource_type="admin_auth",
            description="Changed admin password",
            severity=AuditSeverity.MEDIUM
        )
        
        return {"message": "Password changed successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to change admin password", admin_id=current_admin["id"], error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to change password"
        )


@router.post("/register", response_model=AdminProfile)
async def register_admin(
    registration: AdminRegistration,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_ADMINS)),
    db=Depends(get_db)
):
    """Register a new admin user (super admin only)."""
    try:
        # Check if email already exists
        existing_admin = await auth_service.get_admin_by_email(db, registration.email)
        if existing_admin:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Create new admin
        new_admin = await auth_service.create_admin(
            db,
            registration=registration,
            created_by=current_admin["id"]
        )
        
        # Log admin creation
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.ADMIN_CREATED,
            resource_type="admin_user",
            resource_id=str(new_admin.id),
            description=f"Created new admin: {registration.email}",
            severity=AuditSeverity.HIGH,
            new_data={
                "email": registration.email,
                "role": registration.role,
                "full_name": registration.full_name
            }
        )
        
        logger.info(
            "New admin created",
            new_admin_id=str(new_admin.id),
            email=registration.email,
            role=registration.role,
            created_by=current_admin["id"]
        )
        
        return AdminProfile(
            id=str(new_admin.id),
            email=new_admin.email,
            full_name=new_admin.full_name,
            role=new_admin.role.value,
            is_active=new_admin.is_active,
            created_at=new_admin.created_at,
            last_login=new_admin.last_login
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to register admin", email=registration.email, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to register admin"
        )


@router.post("/refresh-token")
async def refresh_admin_token(
    token_refresh: AdminTokenRefresh,
    db=Depends(get_db)
):
    """Refresh admin access token."""
    try:
        # Validate refresh token and generate new access token
        new_token = await auth_service.refresh_admin_token(
            db,
            refresh_token=token_refresh.refresh_token
        )
        
        if not new_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        return {
            "access_token": new_token,
            "token_type": "bearer",
            "expires_in": 3600
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to refresh token", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to refresh token"
        )