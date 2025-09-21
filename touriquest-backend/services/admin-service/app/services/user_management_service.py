"""User management service for admin operations on user accounts."""

from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.schemas.user_management import (
    UserSummary,
    UserDetail,
    UserSearchFilters,
    UserStatusUpdate,
    BulkUserAction,
    UserStats
)
from app.models import UserModeration, UserStatus, ViolationType, ModerationAction

logger = structlog.get_logger()


class UserManagementService:
    """Service for managing user accounts and moderation."""
    
    async def get_users(
        self,
        db: AsyncSession,
        page: int = 1,
        limit: int = 50,
        filters: Optional[UserSearchFilters] = None
    ) -> List[UserSummary]:
        """
        Get paginated list of users with optional filtering.
        
        Args:
            db: Database session
            page: Page number for pagination
            limit: Number of users per page
            filters: Search and filter criteria
            
        Returns:
            List of user summaries
        """
        try:
            # In a real implementation, this would query actual user tables
            # For now, returning placeholder data
            
            users = []
            for i in range(limit):
                user_id = f"user_{(page-1)*limit + i + 1}"
                users.append(UserSummary(
                    id=user_id,
                    email=f"user{i+1}@example.com",
                    first_name=f"User{i+1}",
                    last_name="Test",
                    status=UserStatus.ACTIVE,
                    is_verified=True if i % 3 == 0 else False,
                    is_host=True if i % 2 == 0 else False,
                    created_at=datetime.utcnow() - timedelta(days=i*10),
                    last_login=datetime.utcnow() - timedelta(hours=i),
                    total_bookings=i * 2,
                    total_listings=i if i % 2 == 0 else 0,
                    total_spent=float(i * 150.50),
                    total_earned=float(i * 75.25) if i % 2 == 0 else 0.0
                ))
            
            logger.info("Retrieved users", count=len(users), page=page, limit=limit)
            return users
            
        except Exception as e:
            logger.error("Failed to get users", error=str(e))
            raise
    
    async def get_user_detail(
        self,
        db: AsyncSession,
        user_id: str
    ) -> Optional[UserDetail]:
        """
        Get detailed information about a specific user.
        
        Args:
            db: Database session
            user_id: ID of user to retrieve
            
        Returns:
            Detailed user information or None if not found
        """
        try:
            # In a real implementation, this would query actual user data
            # For now, returning placeholder data
            
            if user_id.startswith("user_"):
                return UserDetail(
                    id=user_id,
                    email=f"user@example.com",
                    first_name="John",
                    last_name="Doe",
                    phone="+1234567890",
                    date_of_birth=datetime(1990, 1, 1),
                    avatar_url="https://example.com/avatar.jpg",
                    bio="Travel enthusiast and host",
                    status=UserStatus.ACTIVE,
                    is_verified=True,
                    is_host=True,
                    verification_level="full",
                    location="New York, USA",
                    preferred_language="en",
                    preferred_currency="USD",
                    travel_preferences={
                        "accommodation_type": ["apartment", "house"],
                        "travel_style": ["adventure", "culture"],
                        "budget_range": "mid-range"
                    },
                    created_at=datetime.utcnow() - timedelta(days=365),
                    updated_at=datetime.utcnow() - timedelta(days=30),
                    last_login=datetime.utcnow() - timedelta(hours=2),
                    login_count=245,
                    total_bookings=15,
                    total_listings=3,
                    total_reviews_written=12,
                    total_reviews_received=18,
                    average_rating_as_guest=4.8,
                    average_rating_as_host=4.9,
                    total_spent=3250.75,
                    total_earned=1875.50,
                    total_refunds=0.0,
                    failed_login_attempts=0,
                    is_locked=False,
                    locked_until=None,
                    warning_count=0,
                    suspension_count=0,
                    last_moderation_action=None,
                    follower_count=45,
                    following_count=32
                )
            
            return None
            
        except Exception as e:
            logger.error("Failed to get user detail", user_id=user_id, error=str(e))
            raise
    
    async def update_user_status(
        self,
        db: AsyncSession,
        user_id: str,
        status_update: UserStatusUpdate,
        admin_id: str
    ) -> Dict[str, Any]:
        """
        Update user account status.
        
        Args:
            db: Database session
            user_id: ID of user to update
            status_update: New status information
            admin_id: ID of admin making the change
            
        Returns:
            Result of status update
        """
        try:
            # Create moderation record
            moderation = UserModeration(
                user_id=user_id,
                user_email="user@example.com",  # Would be fetched from user
                status=status_update.new_status,
                action_taken=ModerationAction.ACCOUNT_SUSPENDED,  # Based on status
                reason=status_update.reason,
                description=status_update.notes,
                moderator_id=admin_id,
                moderator_email="admin@example.com",  # Would be fetched from admin
                effective_from=datetime.utcnow(),
                effective_until=datetime.utcnow() + timedelta(days=status_update.duration_days) if status_update.duration_days else None
            )
            
            db.add(moderation)
            await db.commit()
            
            logger.info(
                "User status updated",
                user_id=user_id,
                new_status=status_update.new_status,
                admin_id=admin_id
            )
            
            return {
                "message": f"User status updated to {status_update.new_status}",
                "user_id": user_id,
                "new_status": status_update.new_status,
                "effective_until": moderation.effective_until.isoformat() if moderation.effective_until else None
            }
            
        except Exception as e:
            logger.error("Failed to update user status", user_id=user_id, error=str(e))
            await db.rollback()
            raise
    
    async def ban_user(
        self,
        db: AsyncSession,
        user_id: str,
        reason: str,
        duration_days: Optional[int],
        admin_id: str
    ) -> Dict[str, Any]:
        """
        Ban a user account.
        
        Args:
            db: Database session
            user_id: ID of user to ban
            reason: Reason for ban
            duration_days: Duration of ban in days (None for permanent)
            admin_id: ID of admin performing ban
            
        Returns:
            Result of ban operation
        """
        try:
            ban_until = None
            if duration_days:
                ban_until = datetime.utcnow() + timedelta(days=duration_days)
            
            moderation = UserModeration(
                user_id=user_id,
                user_email="user@example.com",
                status=UserStatus.BANNED,
                action_taken=ModerationAction.ACCOUNT_BANNED,
                reason=reason,
                moderator_id=admin_id,
                moderator_email="admin@example.com",
                effective_from=datetime.utcnow(),
                effective_until=ban_until
            )
            
            db.add(moderation)
            await db.commit()
            
            result = {
                "message": "User banned successfully",
                "user_id": user_id,
                "banned_until": ban_until.isoformat() if ban_until else "permanent"
            }
            
            logger.warning("User banned", user_id=user_id, duration_days=duration_days, admin_id=admin_id)
            return result
            
        except Exception as e:
            logger.error("Failed to ban user", user_id=user_id, error=str(e))
            await db.rollback()
            raise
    
    async def unban_user(
        self,
        db: AsyncSession,
        user_id: str,
        reason: str,
        admin_id: str
    ) -> Dict[str, Any]:
        """
        Remove ban from user account.
        
        Args:
            db: Database session
            user_id: ID of user to unban
            reason: Reason for unbanning
            admin_id: ID of admin performing unban
            
        Returns:
            Result of unban operation
        """
        try:
            # In real implementation, would deactivate existing ban records
            # and create new moderation record for reinstatement
            
            moderation = UserModeration(
                user_id=user_id,
                user_email="user@example.com",
                status=UserStatus.ACTIVE,
                action_taken=ModerationAction.ACCOUNT_REINSTATED,
                reason=reason,
                moderator_id=admin_id,
                moderator_email="admin@example.com",
                effective_from=datetime.utcnow()
            )
            
            db.add(moderation)
            await db.commit()
            
            logger.info("User unbanned", user_id=user_id, admin_id=admin_id)
            return {"message": "User unbanned successfully", "user_id": user_id}
            
        except Exception as e:
            logger.error("Failed to unban user", user_id=user_id, error=str(e))
            await db.rollback()
            raise
    
    async def verify_user(
        self,
        db: AsyncSession,
        user_id: str,
        notes: Optional[str],
        admin_id: str
    ) -> Dict[str, Any]:
        """
        Manually verify a user account.
        
        Args:
            db: Database session
            user_id: ID of user to verify
            notes: Verification notes
            admin_id: ID of admin performing verification
            
        Returns:
            Result of verification
        """
        try:
            # In real implementation, would update user verification status
            logger.info("User verified", user_id=user_id, admin_id=admin_id)
            return {"message": "User verified successfully", "user_id": user_id}
            
        except Exception as e:
            logger.error("Failed to verify user", user_id=user_id, error=str(e))
            raise
    
    async def get_moderation_history(
        self,
        db: AsyncSession,
        user_id: str
    ) -> List[Dict[str, Any]]:
        """
        Get moderation history for a user.
        
        Args:
            db: Database session
            user_id: ID of user to get history for
            
        Returns:
            List of moderation actions
        """
        try:
            from sqlalchemy import select, desc
            
            query = select(UserModeration).where(
                UserModeration.user_id == user_id
            ).order_by(desc(UserModeration.created_at))
            
            result = await db.execute(query)
            moderations = result.scalars().all()
            
            return [
                {
                    "id": str(mod.id),
                    "action_taken": mod.action_taken.value,
                    "reason": mod.reason,
                    "severity_score": mod.severity_score,
                    "moderator_email": mod.moderator_email,
                    "created_at": mod.created_at,
                    "is_active": mod.is_active,
                    "has_been_appealed": mod.has_been_appealed
                }
                for mod in moderations
            ]
            
        except Exception as e:
            logger.error("Failed to get moderation history", user_id=user_id, error=str(e))
            raise
    
    async def get_user_activity(
        self,
        db: AsyncSession,
        user_id: str,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Get recent user activity.
        
        Args:
            db: Database session
            user_id: ID of user to get activity for
            limit: Maximum number of activities to return
            
        Returns:
            List of user activities
        """
        try:
            # Placeholder implementation - would query actual activity logs
            activities = [
                {
                    "id": f"activity_{i}",
                    "activity_type": "login",
                    "description": "User logged in",
                    "ip_address": "192.168.1.1",
                    "created_at": datetime.utcnow() - timedelta(hours=i),
                    "metadata": {"device": "desktop"}
                }
                for i in range(min(limit, 10))
            ]
            
            return activities
            
        except Exception as e:
            logger.error("Failed to get user activity", user_id=user_id, error=str(e))
            raise
    
    async def bulk_action(
        self,
        db: AsyncSession,
        user_ids: List[str],
        action: str,
        reason: str,
        admin_id: str
    ) -> Dict[str, Any]:
        """
        Perform bulk action on multiple users.
        
        Args:
            db: Database session
            user_ids: List of user IDs to act on
            action: Action to perform
            reason: Reason for bulk action
            admin_id: ID of admin performing action
            
        Returns:
            Result of bulk operation
        """
        try:
            success_count = 0
            failed_users = []
            
            for user_id in user_ids:
                try:
                    # Perform action based on type
                    if action == "suspend":
                        await self.update_user_status(
                            db, user_id, 
                            UserStatusUpdate(new_status=UserStatus.SUSPENDED, reason=reason),
                            admin_id
                        )
                    elif action == "verify":
                        await self.verify_user(db, user_id, reason, admin_id)
                    # Add more bulk actions as needed
                    
                    success_count += 1
                    
                except Exception as e:
                    logger.error("Failed bulk action for user", user_id=user_id, error=str(e))
                    failed_users.append(user_id)
            
            result = {
                "message": f"Bulk action '{action}' completed",
                "total_users": len(user_ids),
                "successful": success_count,
                "failed": len(failed_users),
                "failed_users": failed_users
            }
            
            logger.info("Bulk action completed", action=action, success_count=success_count, admin_id=admin_id)
            return result
            
        except Exception as e:
            logger.error("Failed to perform bulk action", error=str(e))
            await db.rollback()
            raise
    
    async def get_user_stats(self, db: AsyncSession) -> UserStats:
        """
        Get user statistics for dashboard.
        
        Args:
            db: Database session
            
        Returns:
            User statistics summary
        """
        try:
            # Placeholder implementation - would query actual user data
            return UserStats(
                total_users=15420,
                active_users=12890,
                verified_users=11250,
                banned_users=42,
                suspended_users=128,
                new_users_today=87,
                new_users_this_week=642,
                new_users_this_month=2156,
                host_users=3456,
                guest_only_users=11964,
                user_growth_rate=12.5,
                average_age=32.5,
                top_countries=[
                    {"country": "United States", "count": 4500},
                    {"country": "Canada", "count": 1200},
                    {"country": "United Kingdom", "count": 980},
                    {"country": "France", "count": 750},
                    {"country": "Germany", "count": 680}
                ],
                verification_rate=73.0
            )
            
        except Exception as e:
            logger.error("Failed to get user stats", error=str(e))
            raise