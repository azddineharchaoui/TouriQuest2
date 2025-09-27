"""API endpoints package initialization."""

from app.api.endpoints import (
    dashboard,
    users,
    content_moderation,
    financial,
    properties,
    analytics,
    reports,
    auth,
    alerts,
    system_health,
    permissions,
    backup_restore,
    audit_logging,
    security_monitoring,
    system_configuration,
    automated_reporting
)

__all__ = [
    "dashboard",
    "users", 
    "content_moderation",
    "financial",
    "properties",
    "analytics",
    "reports",
    "auth",
    "alerts",
    "system_health",
    "permissions",
    "backup_restore",
    "audit_logging",
    "security_monitoring",
    "system_configuration",
    "automated_reporting"
]