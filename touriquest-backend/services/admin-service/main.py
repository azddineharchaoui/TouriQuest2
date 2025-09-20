"""
TouriQuest Admin Service
FastAPI microservice for admin dashboard, content management, and system administration
"""
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from shared.database import get_db_session, BaseRepository
from shared.monitoring import MonitoringSetup
from shared.security import SecurityHeaders, RateLimiter, get_current_user
import logging
import uuid
from enum import Enum

logger = logging.getLogger(__name__)

app = FastAPI(
    title="TouriQuest Admin Service",
    description="Admin dashboard, content management, and system administration microservice",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Monitoring setup
monitoring = MonitoringSetup("admin-service")
app = monitoring.instrument_fastapi(app)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

rate_limiter = RateLimiter()


# Enums
class UserRoleEnum(str, Enum):
    USER = "user"
    PROPERTY_OWNER = "property_owner"
    MODERATOR = "moderator"
    ADMIN = "admin"
    SUPER_ADMIN = "super_admin"


class ContentStatusEnum(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    FLAGGED = "flagged"


class SystemStatusEnum(str, Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    DOWN = "down"
    MAINTENANCE = "maintenance"


# Pydantic models
class AdminUserModel(BaseModel):
    id: str
    email: str
    first_name: str
    last_name: str
    role: UserRoleEnum
    is_active: bool
    is_verified: bool
    created_at: datetime
    last_login: Optional[datetime]
    total_bookings: int = 0
    total_spent: float = 0.0


class ContentModerationItem(BaseModel):
    id: str
    content_type: str  # property, review, user_profile, etc.
    content_id: str
    title: str
    description: str
    status: ContentStatusEnum
    flagged_reason: Optional[str] = None
    submitted_by: str
    submitted_at: datetime
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None


class SystemHealthCheck(BaseModel):
    service_name: str
    status: SystemStatusEnum
    response_time_ms: Optional[float] = None
    last_check: datetime
    error_message: Optional[str] = None


class AdminStats(BaseModel):
    total_users: int
    total_properties: int
    total_bookings: int
    total_revenue: float
    pending_moderations: int
    active_sessions: int
    system_health_score: float


class ModerationAction(BaseModel):
    action: str  # approve, reject, flag
    reason: Optional[str] = None
    notes: Optional[str] = None


class SystemConfiguration(BaseModel):
    feature_flags: Dict[str, bool]
    maintenance_mode: bool
    api_rate_limits: Dict[str, int]
    email_templates: Dict[str, str]
    payment_settings: Dict[str, Any]


# Repository
class AdminRepository(BaseRepository):
    """Admin repository for database operations."""
    
    async def get_admin_stats(self) -> AdminStats:
        """Get admin dashboard statistics."""
        # Mock data - in production, aggregate from various services
        return AdminStats(
            total_users=1250,
            total_properties=85,
            total_bookings=520,
            total_revenue=125000.00,
            pending_moderations=12,
            active_sessions=45,
            system_health_score=0.98
        )
    
    async def get_all_users(
        self, 
        limit: int = 50, 
        offset: int = 0,
        role_filter: Optional[UserRoleEnum] = None
    ) -> List[AdminUserModel]:
        """Get all users for admin management."""
        # Mock data
        return [
            AdminUserModel(
                id="user_1",
                email="user1@example.com",
                first_name="John",
                last_name="Doe",
                role=UserRoleEnum.USER,
                is_active=True,
                is_verified=True,
                created_at=datetime.utcnow(),
                last_login=datetime.utcnow(),
                total_bookings=3,
                total_spent=850.00
            )
        ]
    
    async def update_user_role(self, user_id: str, new_role: UserRoleEnum) -> bool:
        """Update user role."""
        logger.info(f"Updated user {user_id} role to {new_role}")
        return True
    
    async def suspend_user(self, user_id: str, reason: str) -> bool:
        """Suspend user account."""
        logger.info(f"Suspended user {user_id}: {reason}")
        return True
    
    async def get_content_moderation_queue(
        self, 
        content_type: Optional[str] = None,
        status: Optional[ContentStatusEnum] = None
    ) -> List[ContentModerationItem]:
        """Get content moderation queue."""
        # Mock data
        return [
            ContentModerationItem(
                id="mod_1",
                content_type="property",
                content_id="prop_123",
                title="Beautiful Riad in Marrakech",
                description="Traditional riad with modern amenities...",
                status=ContentStatusEnum.PENDING,
                submitted_by="owner_123",
                submitted_at=datetime.utcnow()
            )
        ]
    
    async def moderate_content(
        self, 
        moderation_id: str, 
        action: ModerationAction,
        moderator_id: str
    ) -> bool:
        """Moderate content item."""
        logger.info(f"Moderated content {moderation_id}: {action.action}")
        return True
    
    async def get_system_health(self) -> List[SystemHealthCheck]:
        """Get system health status."""
        return [
            SystemHealthCheck(
                service_name="auth-service",
                status=SystemStatusEnum.HEALTHY,
                response_time_ms=25.5,
                last_check=datetime.utcnow()
            ),
            SystemHealthCheck(
                service_name="property-service",
                status=SystemStatusEnum.HEALTHY,
                response_time_ms=45.2,
                last_check=datetime.utcnow()
            ),
            SystemHealthCheck(
                service_name="booking-service",
                status=SystemStatusEnum.DEGRADED,
                response_time_ms=150.8,
                last_check=datetime.utcnow(),
                error_message="High response times detected"
            )
        ]
    
    async def get_system_configuration(self) -> SystemConfiguration:
        """Get system configuration."""
        return SystemConfiguration(
            feature_flags={
                "ai_recommendations": True,
                "advanced_search": True,
                "real_time_chat": False,
                "mobile_app_v2": True
            },
            maintenance_mode=False,
            api_rate_limits={
                "default": 1000,
                "premium": 5000,
                "admin": 10000
            },
            email_templates={
                "welcome": "template_welcome_v2",
                "booking_confirmation": "template_booking_v1"
            },
            payment_settings={
                "stripe_enabled": True,
                "paypal_enabled": True,
                "currency": "USD",
                "processing_fee": 0.029
            }
        )
    
    async def update_system_configuration(self, config: SystemConfiguration) -> bool:
        """Update system configuration."""
        logger.info("Updated system configuration")
        return True


# Admin permissions check
def check_admin_permissions(current_user: dict, required_role: UserRoleEnum = UserRoleEnum.ADMIN):
    """Check if user has required admin permissions."""
    user_role = current_user.get("role", UserRoleEnum.USER)
    
    role_hierarchy = {
        UserRoleEnum.USER: 0,
        UserRoleEnum.PROPERTY_OWNER: 1,
        UserRoleEnum.MODERATOR: 2,
        UserRoleEnum.ADMIN: 3,
        UserRoleEnum.SUPER_ADMIN: 4
    }
    
    if role_hierarchy.get(user_role, 0) < role_hierarchy.get(required_role, 3):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )


# Dependencies
def get_admin_repository() -> AdminRepository:
    """Get admin repository dependency."""
    return AdminRepository()


# API Routes
@app.get("/api/v1/admin/dashboard", response_model=AdminStats)
async def get_admin_dashboard(
    current_user: dict = Depends(get_current_user),
    admin_repo: AdminRepository = Depends(get_admin_repository)
):
    """Get admin dashboard statistics."""
    check_admin_permissions(current_user)
    
    stats = await admin_repo.get_admin_stats()
    return stats


@app.get("/api/v1/admin/users", response_model=List[AdminUserModel])
async def get_all_users(
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    role: Optional[UserRoleEnum] = None,
    current_user: dict = Depends(get_current_user),
    admin_repo: AdminRepository = Depends(get_admin_repository)
):
    """Get all users for admin management."""
    check_admin_permissions(current_user)
    
    users = await admin_repo.get_all_users(limit, offset, role)
    return users


@app.put("/api/v1/admin/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    new_role: UserRoleEnum,
    current_user: dict = Depends(get_current_user),
    admin_repo: AdminRepository = Depends(get_admin_repository)
):
    """Update user role."""
    check_admin_permissions(current_user, UserRoleEnum.SUPER_ADMIN)
    
    success = await admin_repo.update_user_role(user_id, new_role)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user role"
        )
    
    return {"message": f"User role updated to {new_role}"}


@app.post("/api/v1/admin/users/{user_id}/suspend")
async def suspend_user(
    user_id: str,
    reason: str,
    current_user: dict = Depends(get_current_user),
    admin_repo: AdminRepository = Depends(get_admin_repository)
):
    """Suspend user account."""
    check_admin_permissions(current_user)
    
    success = await admin_repo.suspend_user(user_id, reason)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to suspend user"
        )
    
    return {"message": "User suspended successfully"}


@app.get("/api/v1/admin/moderation", response_model=List[ContentModerationItem])
async def get_moderation_queue(
    content_type: Optional[str] = None,
    status: Optional[ContentStatusEnum] = None,
    current_user: dict = Depends(get_current_user),
    admin_repo: AdminRepository = Depends(get_admin_repository)
):
    """Get content moderation queue."""
    check_admin_permissions(current_user, UserRoleEnum.MODERATOR)
    
    queue = await admin_repo.get_content_moderation_queue(content_type, status)
    return queue


@app.post("/api/v1/admin/moderation/{moderation_id}/action")
async def moderate_content(
    moderation_id: str,
    action: ModerationAction,
    current_user: dict = Depends(get_current_user),
    admin_repo: AdminRepository = Depends(get_admin_repository)
):
    """Take moderation action on content."""
    check_admin_permissions(current_user, UserRoleEnum.MODERATOR)
    
    success = await admin_repo.moderate_content(
        moderation_id, 
        action, 
        current_user["id"]
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to moderate content"
        )
    
    return {"message": f"Content {action.action} successfully"}


@app.get("/api/v1/admin/system/health", response_model=List[SystemHealthCheck])
async def get_system_health(
    current_user: dict = Depends(get_current_user),
    admin_repo: AdminRepository = Depends(get_admin_repository)
):
    """Get system health status."""
    check_admin_permissions(current_user)
    
    health_checks = await admin_repo.get_system_health()
    return health_checks


@app.get("/api/v1/admin/system/config", response_model=SystemConfiguration)
async def get_system_configuration(
    current_user: dict = Depends(get_current_user),
    admin_repo: AdminRepository = Depends(get_admin_repository)
):
    """Get system configuration."""
    check_admin_permissions(current_user, UserRoleEnum.SUPER_ADMIN)
    
    config = await admin_repo.get_system_configuration()
    return config


@app.put("/api/v1/admin/system/config")
async def update_system_configuration(
    config: SystemConfiguration,
    current_user: dict = Depends(get_current_user),
    admin_repo: AdminRepository = Depends(get_admin_repository)
):
    """Update system configuration."""
    check_admin_permissions(current_user, UserRoleEnum.SUPER_ADMIN)
    
    success = await admin_repo.update_system_configuration(config)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update system configuration"
        )
    
    return {"message": "System configuration updated successfully"}


@app.post("/api/v1/admin/system/maintenance")
async def toggle_maintenance_mode(
    enabled: bool,
    current_user: dict = Depends(get_current_user),
    admin_repo: AdminRepository = Depends(get_admin_repository)
):
    """Toggle maintenance mode."""
    check_admin_permissions(current_user, UserRoleEnum.SUPER_ADMIN)
    
    # Update maintenance mode in configuration
    config = await admin_repo.get_system_configuration()
    config.maintenance_mode = enabled
    
    success = await admin_repo.update_system_configuration(config)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to toggle maintenance mode"
        )
    
    status_text = "enabled" if enabled else "disabled"
    return {"message": f"Maintenance mode {status_text}"}


@app.get("/api/v1/admin/audit-logs")
async def get_audit_logs(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    user_id: Optional[str] = None,
    action_type: Optional[str] = None,
    limit: int = Query(100, le=1000),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user)
):
    """Get audit logs."""
    check_admin_permissions(current_user)
    
    # Mock audit logs
    audit_logs = [
        {
            "id": "audit_1",
            "timestamp": datetime.utcnow().isoformat(),
            "user_id": "admin_123",
            "action": "user_role_update",
            "target_id": "user_456",
            "details": {"old_role": "user", "new_role": "property_owner"},
            "ip_address": "192.168.1.1"
        }
    ]
    
    return {
        "audit_logs": audit_logs,
        "total": len(audit_logs),
        "limit": limit,
        "offset": offset
    }


@app.post("/api/v1/admin/notifications/broadcast")
async def broadcast_notification(
    title: str,
    message: str,
    target_roles: List[UserRoleEnum] = [UserRoleEnum.USER],
    current_user: dict = Depends(get_current_user)
):
    """Broadcast notification to users."""
    check_admin_permissions(current_user)
    
    # Queue broadcast notification
    notification_id = str(uuid.uuid4())
    
    logger.info(f"Broadcasting notification to roles {target_roles}: {title}")
    
    return {
        "notification_id": notification_id,
        "message": "Broadcast notification queued",
        "target_roles": target_roles
    }


@app.get("/api/v1/admin/reports/export")
async def export_report(
    report_type: str = Query(..., regex="^(users|bookings|revenue|properties)$"),
    format: str = Query("csv", regex="^(csv|excel|pdf)$"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: dict = Depends(get_current_user)
):
    """Export admin report."""
    check_admin_permissions(current_user)
    
    # Queue report generation
    report_id = str(uuid.uuid4())
    
    logger.info(f"Generating {report_type} report in {format} format")
    
    return {
        "report_id": report_id,
        "status": "queued",
        "estimated_completion": (datetime.utcnow()).isoformat(),
        "download_url": f"/api/v1/admin/reports/{report_id}/download"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "admin-service",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)