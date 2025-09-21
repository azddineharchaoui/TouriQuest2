"""Main API router for admin endpoints."""

from fastapi import APIRouter
from app.api.endpoints import (
    dashboard,
    users,
    properties, 
    content_moderation,
    financial,
    analytics,
    reports,
    auth,
    alerts
)

# Create main admin router
admin_router = APIRouter()

# Include all endpoint routers
admin_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
admin_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
admin_router.include_router(users.router, prefix="/users", tags=["user-management"])
admin_router.include_router(properties.router, prefix="/properties", tags=["property-management"])
admin_router.include_router(content_moderation.router, prefix="/moderate", tags=["content-moderation"])
admin_router.include_router(financial.router, prefix="/financial", tags=["financial-management"])
admin_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
admin_router.include_router(reports.router, prefix="/reports", tags=["reports"])
admin_router.include_router(alerts.router, prefix="/alerts", tags=["alerts"])

__all__ = ["admin_router"]