"""
Repository for review management and rating calculations
"""

from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, text, desc, asc, update, delete
from sqlalchemy.orm import selectinload

from app.models import POI, POIReview, ReviewStatusEnum
from app.schemas import ReviewCreate, ReviewBase


class ReviewRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_review(self, poi_id: UUID, user_id: UUID, review_data: ReviewCreate) -> POIReview:
        """Create a new review for a POI"""
        review = POIReview(
            poi_id=poi_id,
            user_id=user_id,
            rating=review_data.rating,
            title=review_data.title,
            comment=review_data.comment,
            visit_date=review_data.visit_date,
            was_crowded=review_data.was_crowded,
            wait_time_minutes=review_data.wait_time_minutes,
            would_recommend=review_data.would_recommend,
            status=ReviewStatusEnum.PENDING.value
        )
        
        self.db.add(review)
        await self.db.flush()
        await self.db.refresh(review)
        return review

    async def get_review_by_id(self, review_id: UUID) -> Optional[POIReview]:
        """Get review by ID"""
        result = await self.db.execute(
            select(POIReview).where(POIReview.id == review_id)
        )
        return result.scalar_one_or_none()

    async def get_poi_reviews(
        self, 
        poi_id: UUID, 
        sort_by: str = "newest",
        status_filter: str = "approved",
        limit: int = 20,
        offset: int = 0
    ) -> List[POIReview]:
        """Get reviews for a POI with filtering and sorting"""
        query = select(POIReview).where(POIReview.poi_id == poi_id)
        
        # Apply status filter
        if status_filter != "all":
            query = query.where(POIReview.status == status_filter)
        
        # Apply sorting
        if sort_by == "newest":
            query = query.order_by(desc(POIReview.created_at))
        elif sort_by == "oldest":
            query = query.order_by(asc(POIReview.created_at))
        elif sort_by == "highest_rated":
            query = query.order_by(desc(POIReview.rating), desc(POIReview.created_at))
        elif sort_by == "lowest_rated":
            query = query.order_by(asc(POIReview.rating), desc(POIReview.created_at))
        elif sort_by == "most_helpful":
            query = query.order_by(desc(POIReview.helpful_count), desc(POIReview.created_at))
        else:
            query = query.order_by(desc(POIReview.created_at))
        
        query = query.offset(offset).limit(limit)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_user_review_for_poi(self, user_id: UUID, poi_id: UUID) -> Optional[POIReview]:
        """Check if user has already reviewed a POI"""
        result = await self.db.execute(
            select(POIReview).where(
                and_(
                    POIReview.user_id == user_id,
                    POIReview.poi_id == poi_id
                )
            )
        )
        return result.scalar_one_or_none()

    async def get_user_reviews(self, user_id: UUID, limit: int = 20, offset: int = 0) -> List[POIReview]:
        """Get all reviews by a user"""
        result = await self.db.execute(
            select(POIReview)
            .where(POIReview.user_id == user_id)
            .order_by(desc(POIReview.created_at))
            .offset(offset)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def update_review(self, review_id: UUID, review_update: ReviewBase) -> Optional[POIReview]:
        """Update an existing review"""
        update_data = review_update.dict(exclude_unset=True)
        update_data['updated_at'] = datetime.utcnow()
        
        result = await self.db.execute(
            update(POIReview)
            .where(POIReview.id == review_id)
            .values(**update_data)
            .returning(POIReview)
        )
        
        updated_review = result.scalar_one_or_none()
        if updated_review:
            await self.db.refresh(updated_review)
        
        return updated_review

    async def delete_review(self, review_id: UUID) -> bool:
        """Delete a review"""
        result = await self.db.execute(
            delete(POIReview).where(POIReview.id == review_id)
        )
        await self.db.flush()
        return result.rowcount > 0

    async def update_poi_rating(self, poi_id: UUID) -> None:
        """Recalculate and update POI average rating"""
        # Calculate new average rating from approved reviews
        rating_stats = await self.db.execute(
            select(
                func.avg(POIReview.rating).label('avg_rating'),
                func.count(POIReview.id).label('review_count')
            )
            .where(
                and_(
                    POIReview.poi_id == poi_id,
                    POIReview.status == ReviewStatusEnum.APPROVED.value
                )
            )
        )
        
        stats = rating_stats.first()
        avg_rating = float(stats.avg_rating) if stats.avg_rating else 0.0
        review_count = stats.review_count or 0
        
        # Update POI
        await self.db.execute(
            update(POI)
            .where(POI.id == poi_id)
            .values(
                average_rating=round(avg_rating, 2),
                review_count=review_count,
                last_updated=datetime.utcnow()
            )
        )
        
        await self.db.flush()

    async def get_review_summary(self, poi_id: UUID) -> Dict[str, Any]:
        """Get review summary statistics for a POI"""
        # Get rating distribution
        rating_distribution = await self.db.execute(
            select(
                POIReview.rating,
                func.count(POIReview.id).label('count')
            )
            .where(
                and_(
                    POIReview.poi_id == poi_id,
                    POIReview.status == ReviewStatusEnum.APPROVED.value
                )
            )
            .group_by(POIReview.rating)
            .order_by(desc(POIReview.rating))
        )
        
        distribution = {str(row.rating): row.count for row in rating_distribution}
        
        # Get overall statistics
        overall_stats = await self.db.execute(
            select(
                func.avg(POIReview.rating).label('avg_rating'),
                func.count(POIReview.id).label('total_reviews'),
                func.sum(POIReview.helpful_count).label('total_helpful'),
                func.avg(
                    func.cast(POIReview.would_recommend, 'INTEGER')
                ).label('recommend_percentage')
            )
            .where(
                and_(
                    POIReview.poi_id == poi_id,
                    POIReview.status == ReviewStatusEnum.APPROVED.value
                )
            )
        )
        
        stats = overall_stats.first()
        
        # Get recent reviews
        recent_reviews = await self.db.execute(
            select(POIReview)
            .where(
                and_(
                    POIReview.poi_id == poi_id,
                    POIReview.status == ReviewStatusEnum.APPROVED.value
                )
            )
            .order_by(desc(POIReview.created_at))
            .limit(3)
        )
        
        recent = list(recent_reviews.scalars().all())
        
        return {
            "average_rating": round(float(stats.avg_rating), 2) if stats.avg_rating else 0.0,
            "total_reviews": stats.total_reviews or 0,
            "rating_distribution": distribution,
            "total_helpful_votes": stats.total_helpful or 0,
            "recommend_percentage": round(float(stats.recommend_percentage * 100), 1) if stats.recommend_percentage else 0.0,
            "recent_reviews": recent
        }

    async def mark_review_helpful(self, review_id: UUID, user_id: UUID, is_helpful: bool) -> bool:
        """Mark a review as helpful or not helpful"""
        # First check if user has already voted on this review
        # (In production, you'd have a separate table for helpful votes)
        
        review = await self.get_review_by_id(review_id)
        if not review:
            return False
        
        # Update helpful count (simplified - in production, track individual votes)
        if is_helpful:
            await self.db.execute(
                update(POIReview)
                .where(POIReview.id == review_id)
                .values(helpful_count=POIReview.helpful_count + 1)
            )
        else:
            await self.db.execute(
                update(POIReview)
                .where(POIReview.id == review_id)
                .values(not_helpful_count=POIReview.not_helpful_count + 1)
            )
        
        await self.db.flush()
        return True

    async def report_review(self, review_id: UUID, reported_by: UUID, reason: str) -> bool:
        """Report a review for moderation"""
        # Flag the review for moderation
        await self.db.execute(
            update(POIReview)
            .where(POIReview.id == review_id)
            .values(
                status=ReviewStatusEnum.FLAGGED.value,
                moderation_notes=f"Reported by user {reported_by}: {reason}"
            )
        )
        
        await self.db.flush()
        return True

    async def approve_review(self, review_id: UUID, moderator_id: UUID) -> bool:
        """Approve a review (admin function)"""
        await self.db.execute(
            update(POIReview)
            .where(POIReview.id == review_id)
            .values(
                status=ReviewStatusEnum.APPROVED.value,
                moderated_by=moderator_id,
                updated_at=datetime.utcnow()
            )
        )
        
        # Get the review to update POI rating
        review = await self.get_review_by_id(review_id)
        if review:
            await self.update_poi_rating(review.poi_id)
        
        await self.db.flush()
        return True

    async def reject_review(self, review_id: UUID, moderator_id: UUID, reason: str) -> bool:
        """Reject a review (admin function)"""
        await self.db.execute(
            update(POIReview)
            .where(POIReview.id == review_id)
            .values(
                status=ReviewStatusEnum.REJECTED.value,
                moderated_by=moderator_id,
                moderation_notes=reason,
                updated_at=datetime.utcnow()
            )
        )
        
        await self.db.flush()
        return True

    async def get_reviews_for_moderation(self, status: str = "pending", limit: int = 50) -> List[POIReview]:
        """Get reviews that need moderation"""
        result = await self.db.execute(
            select(POIReview)
            .where(POIReview.status == status)
            .order_by(asc(POIReview.created_at))
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_review_analytics(self, poi_id: Optional[UUID] = None) -> Dict[str, Any]:
        """Get review analytics data"""
        base_query = select(POIReview)
        
        if poi_id:
            base_query = base_query.where(POIReview.poi_id == poi_id)
        
        # Total reviews by status
        status_counts = await self.db.execute(
            select(
                POIReview.status,
                func.count(POIReview.id).label('count')
            )
            .group_by(POIReview.status)
        )
        
        status_distribution = {row.status: row.count for row in status_counts}
        
        # Reviews over time (last 30 days)
        time_series = await self.db.execute(
            select(
                func.date(POIReview.created_at).label('date'),
                func.count(POIReview.id).label('count')
            )
            .where(
                POIReview.created_at >= datetime.utcnow() - timedelta(days=30)
            )
            .group_by(func.date(POIReview.created_at))
            .order_by(func.date(POIReview.created_at))
        )
        
        review_trends = [
            {"date": row.date.isoformat(), "count": row.count}
            for row in time_series
        ]
        
        return {
            "status_distribution": status_distribution,
            "review_trends": review_trends,
            "total_reviews": sum(status_distribution.values())
        }