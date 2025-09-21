"""Audit service for logging admin actions and maintaining audit trail."""

from typing import Dict, Any, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.models import AuditLog, AuditAction, AuditSeverity

logger = structlog.get_logger()


class AuditService:
    """Service for managing audit logs and admin action tracking."""
    
    async def log_action(
        self,
        db: AsyncSession,
        admin_id: str,
        admin_email: str,
        admin_role: str,
        action: AuditAction,
        resource_type: str,
        description: str,
        resource_id: Optional[str] = None,
        severity: AuditSeverity = AuditSeverity.LOW,
        old_data: Optional[Dict[str, Any]] = None,
        new_data: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        request_id: Optional[str] = None,
    ) -> AuditLog:
        """
        Log an admin action to the audit trail.
        
        Args:
            db: Database session
            admin_id: ID of admin performing action
            admin_email: Email of admin performing action
            admin_role: Role of admin performing action
            action: Type of action being performed
            resource_type: Type of resource being acted upon
            description: Human-readable description of action
            resource_id: ID of specific resource (optional)
            severity: Severity level of the action
            old_data: Previous state of data (for updates)
            new_data: New state of data (for updates)
            metadata: Additional context information
            ip_address: IP address of admin
            user_agent: User agent of admin's browser
            request_id: Unique request identifier
            
        Returns:
            Created audit log entry
        """
        try:
            audit_log = AuditLog.create_log(
                admin_id=admin_id,
                admin_email=admin_email,
                admin_role=admin_role,
                action=action,
                resource_type=resource_type,
                description=description,
                resource_id=resource_id,
                severity=severity,
                old_data=old_data,
                new_data=new_data,
                metadata=metadata,
                ip_address=ip_address,
                user_agent=user_agent,
                request_id=request_id,
            )
            
            db.add(audit_log)
            await db.commit()
            await db.refresh(audit_log)
            
            # Log to structured logger as well
            logger.info(
                "Admin action logged",
                audit_id=str(audit_log.id),
                admin_id=admin_id,
                admin_email=admin_email,
                action=action.value,
                resource_type=resource_type,
                resource_id=resource_id,
                severity=severity.value
            )
            
            return audit_log
            
        except Exception as e:
            logger.error("Failed to log admin action", error=str(e))
            await db.rollback()
            raise
    
    async def get_audit_logs(
        self,
        db: AsyncSession,
        page: int = 1,
        limit: int = 50,
        admin_id: Optional[str] = None,
        action: Optional[AuditAction] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        severity: Optional[AuditSeverity] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
    ) -> List[AuditLog]:
        """
        Retrieve audit logs with filtering options.
        
        Args:
            db: Database session
            page: Page number for pagination
            limit: Number of records per page
            admin_id: Filter by admin ID
            action: Filter by action type
            resource_type: Filter by resource type
            resource_id: Filter by specific resource ID
            severity: Filter by severity level
            date_from: Filter by date range start
            date_to: Filter by date range end
            
        Returns:
            List of audit log entries
        """
        try:
            from sqlalchemy import select, and_, desc
            
            # Build query with filters
            query = select(AuditLog)
            conditions = []
            
            if admin_id:
                conditions.append(AuditLog.admin_id == admin_id)
            if action:
                conditions.append(AuditLog.action == action)
            if resource_type:
                conditions.append(AuditLog.resource_type == resource_type)
            if resource_id:
                conditions.append(AuditLog.resource_id == resource_id)
            if severity:
                conditions.append(AuditLog.severity == severity)
            if date_from:
                conditions.append(AuditLog.created_at >= date_from)
            if date_to:
                conditions.append(AuditLog.created_at <= date_to)
            
            if conditions:
                query = query.where(and_(*conditions))
            
            # Add pagination and ordering
            query = query.order_by(desc(AuditLog.created_at))
            query = query.offset((page - 1) * limit).limit(limit)
            
            result = await db.execute(query)
            audit_logs = result.scalars().all()
            
            return list(audit_logs)
            
        except Exception as e:
            logger.error("Failed to retrieve audit logs", error=str(e))
            raise
    
    async def get_audit_stats(
        self,
        db: AsyncSession,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """
        Get audit statistics for dashboard reporting.
        
        Args:
            db: Database session
            date_from: Start date for statistics
            date_to: End date for statistics
            
        Returns:
            Dictionary containing audit statistics
        """
        try:
            from sqlalchemy import select, func, and_
            
            # Base conditions
            conditions = []
            if date_from:
                conditions.append(AuditLog.created_at >= date_from)
            if date_to:
                conditions.append(AuditLog.created_at <= date_to)
            
            base_query = select(AuditLog)
            if conditions:
                base_query = base_query.where(and_(*conditions))
            
            # Total actions
            total_query = select(func.count(AuditLog.id))
            if conditions:
                total_query = total_query.where(and_(*conditions))
            
            total_result = await db.execute(total_query)
            total_actions = total_result.scalar() or 0
            
            # Actions by severity
            severity_query = select(
                AuditLog.severity,
                func.count(AuditLog.id)
            ).group_by(AuditLog.severity)
            if conditions:
                severity_query = severity_query.where(and_(*conditions))
            
            severity_result = await db.execute(severity_query)
            actions_by_severity = {
                severity: count for severity, count in severity_result.fetchall()
            }
            
            # Actions by type
            action_query = select(
                AuditLog.action,
                func.count(AuditLog.id)
            ).group_by(AuditLog.action)
            if conditions:
                action_query = action_query.where(and_(*conditions))
            
            action_result = await db.execute(action_query)
            actions_by_type = {
                action.value: count for action, count in action_result.fetchall()
            }
            
            # Active admins
            admin_query = select(
                func.count(func.distinct(AuditLog.admin_id))
            )
            if conditions:
                admin_query = admin_query.where(and_(*conditions))
            
            admin_result = await db.execute(admin_query)
            active_admins = admin_result.scalar() or 0
            
            return {
                "total_actions": total_actions,
                "actions_by_severity": actions_by_severity,
                "actions_by_type": actions_by_type,
                "active_admins": active_admins,
                "date_from": date_from,
                "date_to": date_to,
            }
            
        except Exception as e:
            logger.error("Failed to get audit stats", error=str(e))
            raise
    
    async def get_admin_activity(
        self,
        db: AsyncSession,
        admin_id: str,
        days: int = 30,
    ) -> List[Dict[str, Any]]:
        """
        Get recent activity for a specific admin.
        
        Args:
            db: Database session
            admin_id: Admin ID to get activity for
            days: Number of days to look back
            
        Returns:
            List of recent admin activities
        """
        try:
            from sqlalchemy import select, desc, and_
            from datetime import timedelta
            
            date_from = datetime.utcnow() - timedelta(days=days)
            
            query = select(AuditLog).where(
                and_(
                    AuditLog.admin_id == admin_id,
                    AuditLog.created_at >= date_from
                )
            ).order_by(desc(AuditLog.created_at)).limit(100)
            
            result = await db.execute(query)
            activities = result.scalars().all()
            
            return [
                {
                    "id": str(activity.id),
                    "action": activity.action.value,
                    "resource_type": activity.resource_type,
                    "resource_id": activity.resource_id,
                    "description": activity.description,
                    "severity": activity.severity.value,
                    "created_at": activity.created_at,
                }
                for activity in activities
            ]
            
        except Exception as e:
            logger.error("Failed to get admin activity", admin_id=admin_id, error=str(e))
            raise