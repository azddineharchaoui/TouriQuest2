"""System configuration management endpoints for administrative settings."""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional, Dict, Any, Union
from datetime import datetime
import structlog
import json

from app.core.security import get_current_admin, require_permission, Permission
from app.core.database import get_db
from app.schemas.system_configuration import (
    SystemConfiguration,
    ConfigurationSection,
    ConfigurationUpdate,
    ConfigurationTemplate,
    ConfigurationHistory,
    ConfigurationValidation,
    FeatureFlag,
    SystemSettings,
    MaintenanceMode,
    CacheConfiguration,
    DatabaseConfiguration
)
from app.services.system_configuration_service import SystemConfigurationService
from app.services.audit_service import AuditService
from app.models import AuditAction, AuditSeverity

logger = structlog.get_logger()
router = APIRouter()

# Initialize services
config_service = SystemConfigurationService()
audit_service = AuditService()


@router.get("/", response_model=SystemConfiguration)
async def get_system_configuration(
    section: Optional[str] = Query(default=None, description="Get specific configuration section"),
    include_sensitive: bool = Query(default=False, description="Include sensitive configuration data"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_CONFIG)),
    db=Depends(get_db)
):
    """
    Get system configuration settings.
    
    Supports:
    - Full system configuration or specific sections
    - Sensitive data filtering for security
    - Real-time configuration values
    """
    try:
        config = await config_service.get_system_configuration(
            db, section=section, include_sensitive=include_sensitive
        )
        
        # Log configuration access
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.CONFIG_ACCESSED,
            resource_type="system_config",
            resource_id=section or "all",
            description=f"Accessed system configuration: {section or 'all sections'}",
            severity=AuditSeverity.LOW
        )
        
        return config
        
    except Exception as e:
        logger.error("Failed to get system configuration", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve system configuration")


@router.get("/sections", response_model=List[ConfigurationSection])
async def get_configuration_sections(
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_CONFIG)),
    db=Depends(get_db)
):
    """Get list of all configuration sections with metadata."""
    try:
        sections = await config_service.get_configuration_sections(db)
        return sections
        
    except Exception as e:
        logger.error("Failed to get configuration sections", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve configuration sections")


@router.put("/", response_model=SystemConfiguration)
async def update_system_configuration(
    config_update: ConfigurationUpdate,
    validate_only: bool = Query(default=False, description="Only validate, don't apply changes"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_CONFIG)),
    db=Depends(get_db)
):
    """Update system configuration settings with validation."""
    try:
        # Validate configuration first
        validation = await config_service.validate_configuration(db, config_update)
        
        if not validation.is_valid:
            return {
                "validation": validation,
                "message": "Configuration validation failed"
            }
        
        if validate_only:
            return {
                "validation": validation,
                "message": "Configuration validation successful"
            }
        
        # Apply configuration changes
        updated_config = await config_service.update_system_configuration(
            db, config_update, current_admin["id"]
        )
        
        # Log configuration update
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.CONFIG_UPDATED,
            resource_type="system_config",
            description=f"Updated system configuration: {len(config_update.sections)} sections",
            severity=AuditSeverity.HIGH
        )
        
        return updated_config
        
    except Exception as e:
        logger.error("Failed to update system configuration", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to update system configuration")


@router.post("/validate")
async def validate_configuration_changes(
    config_update: ConfigurationUpdate,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_CONFIG)),
    db=Depends(get_db)
):
    """Validate configuration changes without applying them."""
    try:
        validation = await config_service.validate_configuration(db, config_update)
        return validation
        
    except Exception as e:
        logger.error("Failed to validate configuration", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to validate configuration")


@router.get("/history", response_model=List[ConfigurationHistory])
async def get_configuration_history(
    section: Optional[str] = Query(default=None, description="Filter by configuration section"),
    days: int = Query(default=30, ge=1, le=365, description="Days of history to retrieve"),
    admin_id: Optional[str] = Query(default=None, description="Filter by admin who made changes"),
    page: int = Query(default=1, ge=1, description="Page number"),
    limit: int = Query(default=50, ge=1, le=200, description="Items per page"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_CONFIG)),
    db=Depends(get_db)
):
    """Get configuration change history."""
    try:
        history = await config_service.get_configuration_history(
            db, section=section, days=days, admin_id=admin_id, page=page, limit=limit
        )
        return history
        
    except Exception as e:
        logger.error("Failed to get configuration history", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve configuration history")


@router.post("/rollback/{history_id}")
async def rollback_configuration(
    history_id: str,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_CONFIG)),
    db=Depends(get_db)
):
    """Rollback to a previous configuration state."""
    try:
        result = await config_service.rollback_configuration(db, history_id, current_admin["id"])
        
        if not result:
            raise HTTPException(status_code=404, detail="Configuration history entry not found")
        
        # Log configuration rollback
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.CONFIG_ROLLBACK,
            resource_type="system_config",
            resource_id=history_id,
            description=f"Rolled back configuration to history entry: {history_id}",
            severity=AuditSeverity.HIGH
        )
        
        return result
        
    except Exception as e:
        logger.error("Failed to rollback configuration", error=str(e), history_id=history_id)
        raise HTTPException(status_code=500, detail="Failed to rollback configuration")


@router.get("/templates", response_model=List[ConfigurationTemplate])
async def get_configuration_templates(
    template_type: Optional[str] = Query(default=None, description="Filter by template type"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_CONFIG)),
    db=Depends(get_db)
):
    """Get predefined configuration templates."""
    try:
        templates = await config_service.get_configuration_templates(db, template_type)
        return templates
        
    except Exception as e:
        logger.error("Failed to get configuration templates", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve configuration templates")


@router.post("/templates/{template_id}/apply")
async def apply_configuration_template(
    template_id: str,
    override_values: Optional[Dict[str, Any]] = None,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_CONFIG)),
    db=Depends(get_db)
):
    """Apply a configuration template with optional value overrides."""
    try:
        result = await config_service.apply_configuration_template(
            db, template_id, override_values, current_admin["id"]
        )
        
        # Log template application
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.CONFIG_TEMPLATE_APPLIED,
            resource_type="config_template",
            resource_id=template_id,
            description=f"Applied configuration template: {template_id}",
            severity=AuditSeverity.HIGH
        )
        
        return result
        
    except Exception as e:
        logger.error("Failed to apply configuration template", error=str(e), template_id=template_id)
        raise HTTPException(status_code=500, detail="Failed to apply configuration template")


@router.get("/feature-flags", response_model=List[FeatureFlag])
async def get_feature_flags(
    enabled_only: bool = Query(default=False, description="Show only enabled flags"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_CONFIG)),
    db=Depends(get_db)
):
    """Get feature flags and their current states."""
    try:
        feature_flags = await config_service.get_feature_flags(db, enabled_only)
        return feature_flags
        
    except Exception as e:
        logger.error("Failed to get feature flags", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve feature flags")


@router.put("/feature-flags/{flag_name}")
async def update_feature_flag(
    flag_name: str,
    enabled: bool = Query(..., description="Enable or disable the feature flag"),
    rollout_percentage: Optional[int] = Query(default=None, ge=0, le=100, description="Gradual rollout percentage"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_CONFIG)),
    db=Depends(get_db)
):
    """Update a feature flag state."""
    try:
        result = await config_service.update_feature_flag(
            db, flag_name, enabled, rollout_percentage, current_admin["id"]
        )
        
        if not result:
            raise HTTPException(status_code=404, detail="Feature flag not found")
        
        # Log feature flag update
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.FEATURE_FLAG_UPDATED,
            resource_type="feature_flag",
            resource_id=flag_name,
            description=f"Updated feature flag {flag_name}: enabled={enabled}, rollout={rollout_percentage}%",
            severity=AuditSeverity.MEDIUM
        )
        
        return result
        
    except Exception as e:
        logger.error("Failed to update feature flag", error=str(e), flag_name=flag_name)
        raise HTTPException(status_code=500, detail="Failed to update feature flag")


@router.get("/settings", response_model=SystemSettings)
async def get_system_settings(
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_CONFIG)),
    db=Depends(get_db)
):
    """Get general system settings and preferences."""
    try:
        settings = await config_service.get_system_settings(db)
        return settings
        
    except Exception as e:
        logger.error("Failed to get system settings", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve system settings")


@router.put("/settings")
async def update_system_settings(
    settings: SystemSettings,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_CONFIG)),
    db=Depends(get_db)
):
    """Update general system settings."""
    try:
        updated_settings = await config_service.update_system_settings(
            db, settings, current_admin["id"]
        )
        
        # Log settings update
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.SETTINGS_UPDATED,
            resource_type="system_settings",
            description="Updated system settings",
            severity=AuditSeverity.MEDIUM
        )
        
        return updated_settings
        
    except Exception as e:
        logger.error("Failed to update system settings", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to update system settings")


@router.get("/maintenance-mode", response_model=MaintenanceMode)
async def get_maintenance_mode_status(
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_CONFIG)),
    db=Depends(get_db)
):
    """Get current maintenance mode status."""
    try:
        maintenance_mode = await config_service.get_maintenance_mode_status(db)
        return maintenance_mode
        
    except Exception as e:
        logger.error("Failed to get maintenance mode status", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve maintenance mode status")


@router.post("/maintenance-mode/enable")
async def enable_maintenance_mode(
    message: str = Query(..., description="Maintenance message to display"),
    estimated_duration: Optional[int] = Query(default=None, description="Estimated duration in minutes"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_SYSTEM)),
    db=Depends(get_db)
):
    """Enable system maintenance mode."""
    try:
        result = await config_service.enable_maintenance_mode(
            db, message, estimated_duration, current_admin["id"]
        )
        
        # Log maintenance mode activation
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.MAINTENANCE_ENABLED,
            resource_type="maintenance_mode",
            description=f"Enabled maintenance mode: {message}",
            severity=AuditSeverity.CRITICAL
        )
        
        return result
        
    except Exception as e:
        logger.error("Failed to enable maintenance mode", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to enable maintenance mode")


@router.post("/maintenance-mode/disable")
async def disable_maintenance_mode(
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_SYSTEM)),
    db=Depends(get_db)
):
    """Disable system maintenance mode."""
    try:
        result = await config_service.disable_maintenance_mode(db, current_admin["id"])
        
        # Log maintenance mode deactivation
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.MAINTENANCE_DISABLED,
            resource_type="maintenance_mode",
            description="Disabled maintenance mode",
            severity=AuditSeverity.HIGH
        )
        
        return result
        
    except Exception as e:
        logger.error("Failed to disable maintenance mode", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to disable maintenance mode")


@router.get("/cache", response_model=CacheConfiguration)
async def get_cache_configuration(
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_CONFIG)),
    db=Depends(get_db)
):
    """Get cache configuration and statistics."""
    try:
        cache_config = await config_service.get_cache_configuration(db)
        return cache_config
        
    except Exception as e:
        logger.error("Failed to get cache configuration", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve cache configuration")


@router.post("/cache/clear")
async def clear_system_cache(
    cache_type: str = Query(..., regex="^(all|redis|memory|database|api)$"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_SYSTEM)),
    db=Depends(get_db)
):
    """Clear system caches."""
    try:
        result = await config_service.clear_system_cache(db, cache_type, current_admin["id"])
        
        # Log cache clearing
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.CACHE_CLEARED,
            resource_type="cache",
            resource_id=cache_type,
            description=f"Cleared {cache_type} cache",
            severity=AuditSeverity.MEDIUM
        )
        
        return result
        
    except Exception as e:
        logger.error("Failed to clear system cache", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to clear system cache")


@router.get("/database", response_model=DatabaseConfiguration)
async def get_database_configuration(
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_CONFIG)),
    db=Depends(get_db)
):
    """Get database configuration and connection settings."""
    try:
        db_config = await config_service.get_database_configuration(db)
        return db_config
        
    except Exception as e:
        logger.error("Failed to get database configuration", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve database configuration")


@router.post("/reset/defaults")
async def reset_to_defaults(
    section: Optional[str] = Query(default=None, description="Reset specific section or all"),
    confirm: bool = Query(default=False, description="Confirmation required"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_CONFIG)),
    db=Depends(get_db)
):
    """Reset configuration to default values (DANGEROUS - requires confirmation)."""
    try:
        if not confirm:
            raise HTTPException(
                status_code=400, 
                detail="This action requires confirmation. Set confirm=true to proceed."
            )
        
        result = await config_service.reset_to_defaults(db, section, current_admin["id"])
        
        # Log configuration reset
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.CONFIG_RESET,
            resource_type="system_config",
            resource_id=section or "all",
            description=f"Reset configuration to defaults: {section or 'all sections'}",
            severity=AuditSeverity.CRITICAL
        )
        
        return result
        
    except Exception as e:
        logger.error("Failed to reset configuration", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to reset configuration")


@router.post("/reload")
async def reload_configuration(
    force: bool = Query(default=False, description="Force reload even if no changes detected"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_SYSTEM)),
    db=Depends(get_db)
):
    """Reload system configuration from files and database."""
    try:
        result = await config_service.reload_configuration(db, force, current_admin["id"])
        
        # Log configuration reload
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.CONFIG_RELOADED,
            resource_type="system_config",
            description=f"Reloaded system configuration (force={force})",
            severity=AuditSeverity.MEDIUM
        )
        
        return result
        
    except Exception as e:
        logger.error("Failed to reload configuration", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to reload configuration")