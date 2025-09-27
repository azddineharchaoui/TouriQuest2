"""Backup and restore functionality for system data and configuration."""

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from typing import List, Optional, Dict, Any
from datetime import datetime
import asyncio
import structlog
import json
import zipfile
import io
import tempfile
import os

from app.core.security import get_current_admin, require_permission, Permission
from app.core.database import get_db
from app.schemas.backup_restore import (
    BackupJob,
    BackupDetail,
    RestoreJob,
    RestoreDetail,
    BackupSchedule,
    BackupConfiguration,
    BackupVerification,
    BackupStorageInfo
)
from app.services.backup_restore_service import BackupRestoreService
from app.services.audit_service import AuditService
from app.models import AuditAction, AuditSeverity

logger = structlog.get_logger()
router = APIRouter()

# Initialize services
backup_service = BackupRestoreService()
audit_service = AuditService()


@router.post("/backup/create", response_model=BackupJob)
async def create_backup(
    backup_type: str = Query(..., regex="^(full|incremental|database|configuration|media)$"),
    description: Optional[str] = Query(default=None, description="Backup description"),
    encrypt: bool = Query(default=True, description="Encrypt backup"),
    compression: bool = Query(default=True, description="Compress backup"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_BACKUPS)),
    db=Depends(get_db)
):
    """
    Create a new system backup.
    
    Backup types:
    - full: Complete system backup including database and files
    - incremental: Changes since last backup
    - database: Database only backup
    - configuration: System configuration backup
    - media: Media files backup
    """
    try:
        backup_job = await backup_service.create_backup(
            db, 
            backup_type=backup_type,
            description=description,
            encrypt=encrypt,
            compression=compression,
            admin_id=current_admin["id"]
        )
        
        # Log backup creation
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.BACKUP_CREATED,
            resource_type="backup",
            resource_id=backup_job.id,
            description=f"Created {backup_type} backup: {description or backup_job.id}",
            severity=AuditSeverity.MEDIUM
        )
        
        return backup_job
        
    except Exception as e:
        logger.error("Failed to create backup", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to create backup")


@router.get("/backup", response_model=List[BackupDetail])
async def get_backups(
    backup_type: Optional[str] = Query(default=None, description="Filter by backup type"),
    status: Optional[str] = Query(default=None, description="Filter by status"),
    days: int = Query(default=30, ge=1, le=365, description="Days of backup history"),
    page: int = Query(default=1, ge=1, description="Page number"),
    limit: int = Query(default=50, ge=1, le=200, description="Items per page"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_BACKUPS)),
    db=Depends(get_db)
):
    """Get list of system backups with filtering options."""
    try:
        backups = await backup_service.get_backups(
            db, 
            backup_type=backup_type,
            status=status,
            days=days,
            page=page,
            limit=limit
        )
        return backups
        
    except Exception as e:
        logger.error("Failed to get backups", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve backups")


@router.get("/backup/{backup_id}", response_model=BackupDetail)
async def get_backup_detail(
    backup_id: str,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_BACKUPS)),
    db=Depends(get_db)
):
    """Get detailed information about a specific backup."""
    try:
        backup = await backup_service.get_backup_detail(db, backup_id)
        
        if not backup:
            raise HTTPException(status_code=404, detail="Backup not found")
            
        return backup
        
    except Exception as e:
        logger.error("Failed to get backup detail", error=str(e), backup_id=backup_id)
        raise HTTPException(status_code=500, detail="Failed to retrieve backup details")


@router.delete("/backup/{backup_id}")
async def delete_backup(
    backup_id: str,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_BACKUPS)),
    db=Depends(get_db)
):
    """Delete a backup (removes backup files from storage)."""
    try:
        result = await backup_service.delete_backup(db, backup_id, current_admin["id"])
        
        if not result:
            raise HTTPException(status_code=404, detail="Backup not found")
        
        # Log backup deletion
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.BACKUP_DELETED,
            resource_type="backup",
            resource_id=backup_id,
            description=f"Deleted backup: {backup_id}",
            severity=AuditSeverity.HIGH
        )
        
        return {"message": "Backup deleted successfully"}
        
    except Exception as e:
        logger.error("Failed to delete backup", error=str(e), backup_id=backup_id)
        raise HTTPException(status_code=500, detail="Failed to delete backup")


@router.get("/backup/{backup_id}/download")
async def download_backup(
    backup_id: str,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.DOWNLOAD_BACKUPS)),
    db=Depends(get_db)
):
    """Download a backup file."""
    try:
        backup_file = await backup_service.get_backup_file(db, backup_id)
        
        if not backup_file:
            raise HTTPException(status_code=404, detail="Backup file not found")
        
        # Log backup download
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.BACKUP_DOWNLOADED,
            resource_type="backup",
            resource_id=backup_id,
            description=f"Downloaded backup: {backup_id}",
            severity=AuditSeverity.MEDIUM
        )
        
        return StreamingResponse(
            backup_file["stream"],
            media_type="application/octet-stream",
            headers={"Content-Disposition": f"attachment; filename={backup_file['filename']}"}
        )
        
    except Exception as e:
        logger.error("Failed to download backup", error=str(e), backup_id=backup_id)
        raise HTTPException(status_code=500, detail="Failed to download backup")


@router.post("/backup/{backup_id}/verify", response_model=BackupVerification)
async def verify_backup(
    backup_id: str,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_BACKUPS)),
    db=Depends(get_db)
):
    """Verify backup integrity and completeness."""
    try:
        verification = await backup_service.verify_backup(db, backup_id, current_admin["id"])
        
        # Log backup verification
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.BACKUP_VERIFIED,
            resource_type="backup",
            resource_id=backup_id,
            description=f"Verified backup: {backup_id}, Status: {verification.status}",
            severity=AuditSeverity.MEDIUM
        )
        
        return verification
        
    except Exception as e:
        logger.error("Failed to verify backup", error=str(e), backup_id=backup_id)
        raise HTTPException(status_code=500, detail="Failed to verify backup")


@router.post("/restore/upload", response_model=RestoreJob)
async def upload_restore_file(
    file: UploadFile = File(...),
    restore_type: str = Query(..., regex="^(full|database|configuration|media)$"),
    validate_only: bool = Query(default=False, description="Only validate, don't restore"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_RESTORE)),
    db=Depends(get_db)
):
    """Upload a backup file for restoration."""
    try:
        # Create temporary file for upload
        with tempfile.NamedTemporaryFile(delete=False) as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_file_path = tmp_file.name
        
        restore_job = await backup_service.upload_restore_file(
            db,
            file_path=tmp_file_path,
            original_filename=file.filename,
            restore_type=restore_type,
            validate_only=validate_only,
            admin_id=current_admin["id"]
        )
        
        # Clean up temporary file
        os.unlink(tmp_file_path)
        
        # Log restore upload
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.RESTORE_UPLOADED,
            resource_type="restore",
            resource_id=restore_job.id,
            description=f"Uploaded {restore_type} restore file: {file.filename}",
            severity=AuditSeverity.HIGH
        )
        
        return restore_job
        
    except Exception as e:
        logger.error("Failed to upload restore file", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to upload restore file")


@router.post("/restore/{restore_id}/execute", response_model=RestoreJob)
async def execute_restore(
    restore_id: str,
    force: bool = Query(default=False, description="Force restore even with warnings"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.EXECUTE_RESTORE)),
    db=Depends(get_db)
):
    """Execute a restore operation (DANGEROUS - requires confirmation)."""
    try:
        restore_job = await backup_service.execute_restore(
            db, restore_id, force=force, admin_id=current_admin["id"]
        )
        
        # Log restore execution
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.RESTORE_EXECUTED,
            resource_type="restore",
            resource_id=restore_id,
            description=f"Executed restore: {restore_id}, Force: {force}",
            severity=AuditSeverity.CRITICAL
        )
        
        return restore_job
        
    except Exception as e:
        logger.error("Failed to execute restore", error=str(e), restore_id=restore_id)
        raise HTTPException(status_code=500, detail="Failed to execute restore")


@router.get("/restore", response_model=List[RestoreDetail])
async def get_restore_jobs(
    status: Optional[str] = Query(default=None, description="Filter by status"),
    days: int = Query(default=30, ge=1, le=365, description="Days of restore history"),
    page: int = Query(default=1, ge=1, description="Page number"),
    limit: int = Query(default=50, ge=1, le=200, description="Items per page"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_RESTORE)),
    db=Depends(get_db)
):
    """Get list of restore jobs."""
    try:
        restores = await backup_service.get_restore_jobs(
            db, status=status, days=days, page=page, limit=limit
        )
        return restores
        
    except Exception as e:
        logger.error("Failed to get restore jobs", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve restore jobs")


@router.get("/restore/{restore_id}", response_model=RestoreDetail)
async def get_restore_detail(
    restore_id: str,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_RESTORE)),
    db=Depends(get_db)
):
    """Get detailed information about a restore job."""
    try:
        restore = await backup_service.get_restore_detail(db, restore_id)
        
        if not restore:
            raise HTTPException(status_code=404, detail="Restore job not found")
            
        return restore
        
    except Exception as e:
        logger.error("Failed to get restore detail", error=str(e), restore_id=restore_id)
        raise HTTPException(status_code=500, detail="Failed to retrieve restore details")


@router.post("/schedule", response_model=BackupSchedule)
async def create_backup_schedule(
    schedule_data: BackupSchedule,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_BACKUP_SCHEDULE)),
    db=Depends(get_db)
):
    """Create automated backup schedule."""
    try:
        schedule = await backup_service.create_backup_schedule(
            db, schedule_data, current_admin["id"]
        )
        
        # Log schedule creation
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.BACKUP_SCHEDULED,
            resource_type="backup_schedule",
            resource_id=schedule.id,
            description=f"Created backup schedule: {schedule.name}",
            severity=AuditSeverity.MEDIUM
        )
        
        return schedule
        
    except Exception as e:
        logger.error("Failed to create backup schedule", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to create backup schedule")


@router.get("/schedule", response_model=List[BackupSchedule])
async def get_backup_schedules(
    active_only: bool = Query(default=True, description="Show only active schedules"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_BACKUP_SCHEDULE)),
    db=Depends(get_db)
):
    """Get backup schedules."""
    try:
        schedules = await backup_service.get_backup_schedules(db, active_only)
        return schedules
        
    except Exception as e:
        logger.error("Failed to get backup schedules", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve backup schedules")


@router.put("/schedule/{schedule_id}", response_model=BackupSchedule)
async def update_backup_schedule(
    schedule_id: str,
    schedule_data: BackupSchedule,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_BACKUP_SCHEDULE)),
    db=Depends(get_db)
):
    """Update backup schedule."""
    try:
        schedule = await backup_service.update_backup_schedule(
            db, schedule_id, schedule_data, current_admin["id"]
        )
        
        if not schedule:
            raise HTTPException(status_code=404, detail="Backup schedule not found")
        
        # Log schedule update
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.BACKUP_SCHEDULE_UPDATED,
            resource_type="backup_schedule",
            resource_id=schedule_id,
            description=f"Updated backup schedule: {schedule.name}",
            severity=AuditSeverity.MEDIUM
        )
        
        return schedule
        
    except Exception as e:
        logger.error("Failed to update backup schedule", error=str(e), schedule_id=schedule_id)
        raise HTTPException(status_code=500, detail="Failed to update backup schedule")


@router.delete("/schedule/{schedule_id}")
async def delete_backup_schedule(
    schedule_id: str,
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.MANAGE_BACKUP_SCHEDULE)),
    db=Depends(get_db)
):
    """Delete backup schedule."""
    try:
        result = await backup_service.delete_backup_schedule(db, schedule_id, current_admin["id"])
        
        if not result:
            raise HTTPException(status_code=404, detail="Backup schedule not found")
        
        # Log schedule deletion
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.BACKUP_SCHEDULE_DELETED,
            resource_type="backup_schedule",
            resource_id=schedule_id,
            description=f"Deleted backup schedule: {schedule_id}",
            severity=AuditSeverity.HIGH
        )
        
        return {"message": "Backup schedule deleted successfully"}
        
    except Exception as e:
        logger.error("Failed to delete backup schedule", error=str(e), schedule_id=schedule_id)
        raise HTTPException(status_code=500, detail="Failed to delete backup schedule")


@router.get("/storage/info", response_model=BackupStorageInfo)
async def get_storage_info(
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.VIEW_BACKUPS)),
    db=Depends(get_db)
):
    """Get backup storage information and usage statistics."""
    try:
        storage_info = await backup_service.get_storage_info(db)
        return storage_info
        
    except Exception as e:
        logger.error("Failed to get storage info", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve storage information")


@router.post("/configuration/export")
async def export_configuration(
    include_secrets: bool = Query(default=False, description="Include encrypted secrets"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.EXPORT_CONFIG)),
    db=Depends(get_db)
):
    """Export system configuration as downloadable file."""
    try:
        config_data = await backup_service.export_configuration(db, include_secrets)
        
        # Create zip file with configuration
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            zip_file.writestr("configuration.json", json.dumps(config_data, indent=2))
            if include_secrets:
                zip_file.writestr("secrets.json", json.dumps(config_data.get("secrets", {}), indent=2))
        
        zip_buffer.seek(0)
        
        # Log configuration export
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.CONFIG_EXPORTED,
            resource_type="configuration",
            description=f"Exported system configuration, Include secrets: {include_secrets}",
            severity=AuditSeverity.HIGH if include_secrets else AuditSeverity.MEDIUM
        )
        
        return StreamingResponse(
            io.BytesIO(zip_buffer.read()),
            media_type="application/zip",
            headers={"Content-Disposition": f"attachment; filename=touriquest_config_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"}
        )
        
    except Exception as e:
        logger.error("Failed to export configuration", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to export configuration")


@router.post("/configuration/import")
async def import_configuration(
    file: UploadFile = File(...),
    apply_immediately: bool = Query(default=False, description="Apply configuration immediately"),
    current_admin: Dict[str, Any] = Depends(require_permission(Permission.IMPORT_CONFIG)),
    db=Depends(get_db)
):
    """Import system configuration from file."""
    try:
        content = await file.read()
        
        # Validate and import configuration
        result = await backup_service.import_configuration(
            db, content, apply_immediately, current_admin["id"]
        )
        
        # Log configuration import
        await audit_service.log_action(
            db=db,
            admin_id=current_admin["id"],
            admin_email=current_admin["email"],
            admin_role=current_admin["role"].value,
            action=AuditAction.CONFIG_IMPORTED,
            resource_type="configuration",
            description=f"Imported system configuration, Apply immediately: {apply_immediately}",
            severity=AuditSeverity.CRITICAL if apply_immediately else AuditSeverity.HIGH
        )
        
        return result
        
    except Exception as e:
        logger.error("Failed to import configuration", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to import configuration")