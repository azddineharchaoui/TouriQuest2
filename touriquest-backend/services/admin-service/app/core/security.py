"""Security utilities for authentication and authorization."""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status, Depends, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import structlog
from enum import Enum

from app.core.config import settings

logger = structlog.get_logger()

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT token scheme
security = HTTPBearer()


class AdminRole(str, Enum):
    """Admin role enumeration."""
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    MODERATOR = "moderator"
    SUPPORT = "support"
    ANALYST = "analyst"


class Permission(str, Enum):
    """Permission enumeration."""
    # User Management
    VIEW_USERS = "view_users"
    EDIT_USERS = "edit_users"
    BAN_USERS = "ban_users"
    DELETE_USERS = "delete_users"
    
    # Property Management
    VIEW_PROPERTIES = "view_properties"
    APPROVE_PROPERTIES = "approve_properties"
    REJECT_PROPERTIES = "reject_properties"
    DELETE_PROPERTIES = "delete_properties"
    
    # Content Moderation
    VIEW_CONTENT = "view_content"
    MODERATE_CONTENT = "moderate_content"
    DELETE_CONTENT = "delete_content"
    
    # Financial Management
    VIEW_FINANCIALS = "view_financials"
    MANAGE_PAYOUTS = "manage_payouts"
    PROCESS_REFUNDS = "process_refunds"
    VIEW_REPORTS = "view_reports"
    
    # System Management
    VIEW_SYSTEM_METRICS = "view_system_metrics"
    MANAGE_SYSTEM = "manage_system"
    VIEW_AUDIT_LOGS = "view_audit_logs"
    
    # Analytics
    VIEW_ANALYTICS = "view_analytics"
    EXPORT_DATA = "export_data"


# Role-based permissions mapping
ROLE_PERMISSIONS: Dict[AdminRole, List[Permission]] = {
    AdminRole.SUPER_ADMIN: [permission for permission in Permission],
    AdminRole.ADMIN: [
        Permission.VIEW_USERS,
        Permission.EDIT_USERS,
        Permission.BAN_USERS,
        Permission.VIEW_PROPERTIES,
        Permission.APPROVE_PROPERTIES,
        Permission.REJECT_PROPERTIES,
        Permission.VIEW_CONTENT,
        Permission.MODERATE_CONTENT,
        Permission.DELETE_CONTENT,
        Permission.VIEW_FINANCIALS,
        Permission.MANAGE_PAYOUTS,
        Permission.PROCESS_REFUNDS,
        Permission.VIEW_REPORTS,
        Permission.VIEW_SYSTEM_METRICS,
        Permission.VIEW_ANALYTICS,
        Permission.EXPORT_DATA,
    ],
    AdminRole.MODERATOR: [
        Permission.VIEW_USERS,
        Permission.EDIT_USERS,
        Permission.VIEW_PROPERTIES,
        Permission.APPROVE_PROPERTIES,
        Permission.REJECT_PROPERTIES,
        Permission.VIEW_CONTENT,
        Permission.MODERATE_CONTENT,
        Permission.DELETE_CONTENT,
        Permission.VIEW_ANALYTICS,
    ],
    AdminRole.SUPPORT: [
        Permission.VIEW_USERS,
        Permission.EDIT_USERS,
        Permission.VIEW_PROPERTIES,
        Permission.VIEW_CONTENT,
        Permission.VIEW_REPORTS,
    ],
    AdminRole.ANALYST: [
        Permission.VIEW_USERS,
        Permission.VIEW_PROPERTIES,
        Permission.VIEW_FINANCIALS,
        Permission.VIEW_REPORTS,
        Permission.VIEW_SYSTEM_METRICS,
        Permission.VIEW_ANALYTICS,
        Permission.EXPORT_DATA,
    ],
}


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password."""
    return pwd_context.hash(password)


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: Dict[str, Any]) -> str:
    """Create JWT refresh token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


async def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)) -> Dict[str, Any]:
    """Verify JWT token and return payload."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        
        # Check token expiration
        exp = payload.get("exp")
        if exp is None or datetime.utcnow() > datetime.fromtimestamp(exp):
            raise credentials_exception
            
        return payload
        
    except JWTError:
        raise credentials_exception


async def get_current_admin(token_payload: Dict[str, Any] = Depends(verify_token)) -> Dict[str, Any]:
    """Get current admin user from token."""
    admin_id = token_payload.get("sub")
    admin_role = token_payload.get("role")
    admin_email = token_payload.get("email")
    
    if admin_id is None or admin_role is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )
    
    return {
        "id": admin_id,
        "email": admin_email,
        "role": AdminRole(admin_role),
        "permissions": ROLE_PERMISSIONS.get(AdminRole(admin_role), [])
    }


def require_permission(permission: Permission):
    """Decorator to require specific permission."""
    def permission_checker(current_admin: Dict[str, Any] = Depends(get_current_admin)) -> Dict[str, Any]:
        if permission not in current_admin["permissions"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required: {permission.value}"
            )
        return current_admin
    
    return permission_checker


def require_role(required_role: AdminRole):
    """Decorator to require specific role."""
    def role_checker(current_admin: Dict[str, Any] = Depends(get_current_admin)) -> Dict[str, Any]:
        if current_admin["role"] != required_role and current_admin["role"] != AdminRole.SUPER_ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient role. Required: {required_role.value}"
            )
        return current_admin
    
    return role_checker


def has_permission(admin_role: AdminRole, permission: Permission) -> bool:
    """Check if role has specific permission."""
    return permission in ROLE_PERMISSIONS.get(admin_role, [])


def get_admin_permissions(admin_role: AdminRole) -> List[Permission]:
    """Get all permissions for a role."""
    return ROLE_PERMISSIONS.get(admin_role, [])