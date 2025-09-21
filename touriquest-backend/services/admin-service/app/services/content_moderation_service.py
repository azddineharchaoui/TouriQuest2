"""Content moderation service for managing and reviewing content."""

from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, timedelta
import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, update
from sqlalchemy.orm import selectinload

from app.models.content_moderation import ContentModeration, ModerationStatus, ContentType, ModerationPriority
from app.models.audit_log import AuditLog
from app.schemas.content_moderation import (
    ContentModerationSummary,
    ContentModerationDetail,
    ContentModerationFilters,
    ContentModerationStats
)
from app.core.security import AdminRole
from app.services.websocket_manager import websocket_manager

logger = structlog.get_logger()


class ContentModerationService:
    """Service for managing content moderation workflows."""
    
    async def get_moderations(
        self,
        db: AsyncSession,
        page: int = 1,
        limit: int = 50,
        filters: Optional[ContentModerationFilters] = None
    ) -> List[ContentModerationSummary]:
        """Get paginated list of content moderations with optional filtering."""
        try:
            offset = (page - 1) * limit
            
            query = select(ContentModeration)
            
            # Apply filters
            if filters:
                if filters.status:
                    query = query.where(ContentModeration.status == ModerationStatus(filters.status))
                if filters.content_type:
                    query = query.where(ContentModeration.content_type == ContentType(filters.content_type))
                if filters.priority:
                    query = query.where(ContentModeration.priority == ModerationPriority(filters.priority))
                if filters.date_from:
                    query = query.where(ContentModeration.created_at >= filters.date_from)
                if filters.date_to:
                    query = query.where(ContentModeration.created_at <= filters.date_to)
            
            # Apply ordering - prioritize by priority and creation date
            query = query.order_by(
                ContentModeration.priority.desc(),
                ContentModeration.created_at.desc()
            ).offset(offset).limit(limit)
            
            result = await db.execute(query)
            moderations = result.scalars().all()
            
            # Convert to response models
            moderation_summaries = []
            for moderation in moderations:
                summary = ContentModerationSummary(
                    id=str(moderation.id),
                    content_type=moderation.content_type.value,
                    content_id=str(moderation.content_id),
                    status=moderation.status.value,
                    priority=moderation.priority.value,
                    reported_by=moderation.reported_by,
                    auto_flagged=moderation.auto_flagged,
                    flag_reason=moderation.flag_reason,
                    created_at=moderation.created_at,
                    reviewed_at=moderation.reviewed_at,
                    reviewer_notes=moderation.reviewer_notes[:100] if moderation.reviewer_notes else None  # Truncate for summary
                )
                moderation_summaries.append(summary)
            
            logger.info(
                "Retrieved content moderations",
                count=len(moderation_summaries),
                page=page,
                filters=filters.dict() if filters else None
            )
            
            return moderation_summaries
            
        except Exception as e:
            logger.error("Failed to get content moderations", error=str(e))
            raise
    
    async def get_moderation_detail(
        self,
        db: AsyncSession,
        moderation_id: str
    ) -> Optional[ContentModerationDetail]:
        """Get detailed information about a specific content moderation."""
        try:
            query = select(ContentModeration).where(
                ContentModeration.id == moderation_id
            ).options(
                selectinload(ContentModeration.audit_logs)
            )
            
            result = await db.execute(query)
            moderation = result.scalar_one_or_none()
            
            if not moderation:
                return None
            
            # Get moderation history from audit logs
            history_query = select(AuditLog).where(
                and_(
                    AuditLog.resource_type == "content_moderation",
                    AuditLog.resource_id == moderation_id
                )
            ).order_by(AuditLog.timestamp.desc())
            
            history_result = await db.execute(history_query)
            history = history_result.scalars().all()
            
            # Build detailed response
            detail = ContentModerationDetail(
                id=str(moderation.id),
                content_type=moderation.content_type.value,
                content_id=str(moderation.content_id),
                content_title=moderation.content_title,
                content_excerpt=moderation.content_excerpt,
                content_metadata=moderation.content_metadata or {},
                status=moderation.status.value,
                priority=moderation.priority.value,
                reported_by=moderation.reported_by,
                auto_flagged=moderation.auto_flagged,
                flag_reason=moderation.flag_reason,
                flag_details=moderation.flag_details or {},
                reviewer_id=str(moderation.reviewer_id) if moderation.reviewer_id else None,
                reviewer_notes=moderation.reviewer_notes,
                resolution=moderation.resolution,
                appeal_status=moderation.appeal_status,
                appeal_text=moderation.appeal_text,
                appeal_response=moderation.appeal_response,
                created_at=moderation.created_at,
                reviewed_at=moderation.reviewed_at,
                resolved_at=moderation.resolved_at,
                history=[
                    {
                        "timestamp": log.timestamp,
                        "action": log.action.value,
                        "admin_email": log.admin_email,
                        "description": log.description
                    }
                    for log in history
                ]
            )
            
            return detail
            
        except Exception as e:
            logger.error("Failed to get moderation detail", moderation_id=moderation_id, error=str(e))
            raise
    
    async def approve_content(
        self,
        db: AsyncSession,
        moderation_id: str,
        moderator_id: str,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """Approve content after moderation review."""
        try:
            # Update moderation record
            query = update(ContentModeration).where(
                ContentModeration.id == moderation_id
            ).values(
                status=ModerationStatus.APPROVED,
                reviewer_id=moderator_id,
                reviewer_notes=notes,
                reviewed_at=datetime.utcnow(),
                resolved_at=datetime.utcnow(),
                resolution="approved"
            )
            
            await db.execute(query)
            await db.commit()
            
            # Send real-time update
            await websocket_manager.broadcast_to_admins({
                "type": "content_approved",
                "moderation_id": moderation_id,
                "moderator_id": moderator_id,
                "timestamp": datetime.utcnow().isoformat()
            })
            
            logger.info(
                "Content approved",
                moderation_id=moderation_id,
                moderator_id=moderator_id
            )
            
            return {
                "success": True,
                "message": "Content approved successfully",
                "moderation_id": moderation_id
            }
            
        except Exception as e:
            logger.error("Failed to approve content", moderation_id=moderation_id, error=str(e))
            await db.rollback()
            raise
    
    async def reject_content(
        self,
        db: AsyncSession,
        moderation_id: str,
        moderator_id: str,
        reason: str,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """Reject content after moderation review."""
        try:
            # Update moderation record
            query = update(ContentModeration).where(
                ContentModeration.id == moderation_id
            ).values(
                status=ModerationStatus.REJECTED,
                reviewer_id=moderator_id,
                reviewer_notes=notes,
                reviewed_at=datetime.utcnow(),
                resolved_at=datetime.utcnow(),
                resolution=f"rejected: {reason}"
            )
            
            await db.execute(query)
            await db.commit()
            
            # Send real-time update
            await websocket_manager.broadcast_to_admins({
                "type": "content_rejected",
                "moderation_id": moderation_id,
                "moderator_id": moderator_id,
                "reason": reason,
                "timestamp": datetime.utcnow().isoformat()
            })
            
            logger.info(
                "Content rejected",
                moderation_id=moderation_id,
                moderator_id=moderator_id,
                reason=reason
            )
            
            return {
                "success": True,
                "message": "Content rejected successfully",
                "moderation_id": moderation_id,
                "reason": reason
            }
            
        except Exception as e:
            logger.error("Failed to reject content", moderation_id=moderation_id, error=str(e))
            await db.rollback()
            raise
    
    async def delete_content(
        self,
        db: AsyncSession,
        moderation_id: str,
        moderator_id: str,
        reason: str
    ) -> Dict[str, Any]:
        """Delete content and mark as removed."""
        try:
            # Update moderation record
            query = update(ContentModeration).where(
                ContentModeration.id == moderation_id
            ).values(
                status=ModerationStatus.REMOVED,
                reviewer_id=moderator_id,
                reviewer_notes=f"Content deleted: {reason}",
                reviewed_at=datetime.utcnow(),
                resolved_at=datetime.utcnow(),
                resolution=f"deleted: {reason}"
            )
            
            await db.execute(query)
            await db.commit()
            
            # Send real-time update
            await websocket_manager.broadcast_to_admins({
                "type": "content_deleted",
                "moderation_id": moderation_id,
                "moderator_id": moderator_id,
                "reason": reason,
                "timestamp": datetime.utcnow().isoformat()
            })
            
            logger.warning(
                "Content deleted",
                moderation_id=moderation_id,
                moderator_id=moderator_id,
                reason=reason
            )
            
            return {
                "success": True,
                "message": "Content deleted successfully",
                "moderation_id": moderation_id,
                "reason": reason
            }
            
        except Exception as e:
            logger.error("Failed to delete content", moderation_id=moderation_id, error=str(e))
            await db.rollback()
            raise
    
    async def bulk_moderation_action(
        self,
        db: AsyncSession,
        moderation_ids: List[str],
        action: str,
        reason: str,
        moderator_id: str
    ) -> Dict[str, Any]:
        """Perform bulk moderation actions."""
        try:
            success_count = 0
            failed_count = 0
            
            for moderation_id in moderation_ids:
                try:
                    if action == "approve":
                        await self.approve_content(db, moderation_id, moderator_id, reason)
                    elif action == "reject":
                        await self.reject_content(db, moderation_id, moderator_id, reason)
                    elif action == "delete":
                        await self.delete_content(db, moderation_id, moderator_id, reason)
                    else:
                        raise ValueError(f"Invalid action: {action}")
                    
                    success_count += 1
                    
                except Exception as e:
                    logger.error(
                        "Failed bulk action for moderation",
                        moderation_id=moderation_id,
                        action=action,
                        error=str(e)
                    )
                    failed_count += 1
            
            # Send bulk update notification
            await websocket_manager.broadcast_to_admins({
                "type": "bulk_moderation_completed",
                "action": action,
                "success_count": success_count,
                "failed_count": failed_count,
                "moderator_id": moderator_id,
                "timestamp": datetime.utcnow().isoformat()
            })
            
            logger.info(
                "Bulk moderation action completed",
                action=action,
                success_count=success_count,
                failed_count=failed_count,
                moderator_id=moderator_id
            )
            
            return {
                "success": True,
                "message": f"Bulk {action} completed",
                "success_count": success_count,
                "failed_count": failed_count,
                "total_count": len(moderation_ids)
            }
            
        except Exception as e:
            logger.error("Failed to perform bulk moderation action", error=str(e))
            raise
    
    async def submit_appeal(
        self,
        db: AsyncSession,
        moderation_id: str,
        appeal_text: str,
        submitted_by_admin: bool = False,
        admin_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Submit an appeal for a moderation decision."""
        try:
            # Update moderation record with appeal
            query = update(ContentModeration).where(
                ContentModeration.id == moderation_id
            ).values(
                appeal_status="submitted",
                appeal_text=appeal_text,
                appeal_submitted_at=datetime.utcnow()
            )
            
            await db.execute(query)
            await db.commit()
            
            logger.info(
                "Appeal submitted",
                moderation_id=moderation_id,
                submitted_by_admin=submitted_by_admin,
                admin_id=admin_id
            )
            
            return {
                "success": True,
                "message": "Appeal submitted successfully",
                "moderation_id": moderation_id
            }
            
        except Exception as e:
            logger.error("Failed to submit appeal", moderation_id=moderation_id, error=str(e))
            await db.rollback()
            raise
    
    async def resolve_appeal(
        self,
        db: AsyncSession,
        moderation_id: str,
        resolution: str,
        response_text: str,
        admin_id: str
    ) -> Dict[str, Any]:
        """Resolve an appeal for a moderation decision."""
        try:
            # Update moderation record with appeal resolution
            query = update(ContentModeration).where(
                ContentModeration.id == moderation_id
            ).values(
                appeal_status=resolution,  # "upheld" or "overturned"
                appeal_response=response_text,
                appeal_resolved_at=datetime.utcnow(),
                appeal_resolver_id=admin_id
            )
            
            await db.execute(query)
            await db.commit()
            
            logger.info(
                "Appeal resolved",
                moderation_id=moderation_id,
                resolution=resolution,
                admin_id=admin_id
            )
            
            return {
                "success": True,
                "message": f"Appeal {resolution} successfully",
                "moderation_id": moderation_id,
                "resolution": resolution
            }
            
        except Exception as e:
            logger.error("Failed to resolve appeal", moderation_id=moderation_id, error=str(e))
            await db.rollback()
            raise
    
    async def get_moderation_stats(self, db: AsyncSession) -> ContentModerationStats:
        """Get moderation statistics for dashboard."""
        try:
            # Get counts by status
            status_query = select(
                ContentModeration.status,
                func.count(ContentModeration.id).label('count')
            ).group_by(ContentModeration.status)
            
            status_result = await db.execute(status_query)
            status_counts = {row.status.value: row.count for row in status_result}
            
            # Get counts by content type
            type_query = select(
                ContentModeration.content_type,
                func.count(ContentModeration.id).label('count')
            ).group_by(ContentModeration.content_type)
            
            type_result = await db.execute(type_query)
            type_counts = {row.content_type.value: row.count for row in type_result}
            
            # Get recent activity (last 7 days)
            recent_cutoff = datetime.utcnow() - timedelta(days=7)
            recent_query = select(func.count(ContentModeration.id)).where(
                ContentModeration.created_at >= recent_cutoff
            )
            recent_result = await db.execute(recent_query)
            recent_count = recent_result.scalar()
            
            # Get pending high priority count
            high_priority_query = select(func.count(ContentModeration.id)).where(
                and_(
                    ContentModeration.status == ModerationStatus.PENDING,
                    ContentModeration.priority == ModerationPriority.HIGH
                )
            )
            high_priority_result = await db.execute(high_priority_query)
            high_priority_count = high_priority_result.scalar()
            
            stats = ContentModerationStats(
                total_pending=status_counts.get("pending", 0),
                total_approved=status_counts.get("approved", 0),
                total_rejected=status_counts.get("rejected", 0),
                total_removed=status_counts.get("removed", 0),
                high_priority_pending=high_priority_count,
                recent_activity=recent_count,
                by_content_type=type_counts,
                by_status=status_counts
            )
            
            return stats
            
        except Exception as e:
            logger.error("Failed to get moderation stats", error=str(e))
            raise
    
    async def trigger_auto_scan(self, db: AsyncSession) -> Dict[str, Any]:
        """Trigger automated content scanning."""
        try:
            # In a real implementation, this would trigger ML models or external services
            # For now, we'll simulate by marking some content for review
            
            # This is a placeholder - in production you would:
            # 1. Query unscanned content
            # 2. Send to AI moderation service
            # 3. Update records based on results
            
            logger.info("Auto-scan triggered")
            
            return {
                "success": True,
                "message": "Automated content scanning initiated",
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error("Failed to trigger auto-scan", error=str(e))
            raise