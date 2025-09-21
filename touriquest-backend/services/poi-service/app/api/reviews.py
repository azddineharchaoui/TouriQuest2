"""
Review API endpoints for POI ratings and feedback
"""

from typing import List, Optional
from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Query, Path, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.repositories.review_repository import ReviewRepository
from app.schemas import (
    Review, ReviewCreate, ReviewBase, SuccessResponse, ErrorResponse,
    POI, SortByEnum
)

router = APIRouter()


@router.post("/{poi_id}/review", response_model=Review)
async def create_poi_review(
    poi_id: UUID = Path(..., description="POI unique identifier"),
    review_data: ReviewCreate = ...,
    user_id: UUID = Query(..., description="User ID"),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new review for a POI
    """
    review_repo = ReviewRepository(db)
    
    # Check if user has already reviewed this POI
    existing_review = await review_repo.get_user_review_for_poi(user_id, poi_id)
    if existing_review:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User has already reviewed this POI"
        )
    
    # Create the review
    review = await review_repo.create_review(poi_id, user_id, review_data)
    if not review:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create review"
        )
    
    # Update POI rating in background
    background_tasks.add_task(review_repo.update_poi_rating, poi_id)
    
    return review


@router.get("/{poi_id}/reviews", response_model=List[Review])
async def get_poi_reviews(
    poi_id: UUID = Path(..., description="POI unique identifier"),
    sort_by: str = Query("newest", description="Sort order: newest, oldest, highest_rated, lowest_rated, most_helpful"),
    status_filter: str = Query("approved", description="Review status filter: all, approved, pending"),
    limit: int = Query(20, gt=0, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """
    Get reviews for a POI with filtering and sorting
    """
    review_repo = ReviewRepository(db)
    reviews = await review_repo.get_poi_reviews(
        poi_id, sort_by=sort_by, status_filter=status_filter, limit=limit, offset=offset
    )
    return reviews


@router.get("/{poi_id}/reviews/summary")
async def get_poi_review_summary(
    poi_id: UUID = Path(..., description="POI unique identifier"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get review summary statistics for a POI
    """
    review_repo = ReviewRepository(db)
    summary = await review_repo.get_review_summary(poi_id)
    return summary


@router.put("/reviews/{review_id}", response_model=Review)
async def update_review(
    review_id: UUID = Path(..., description="Review unique identifier"),
    user_id: UUID = Query(..., description="User ID"),
    review_update: ReviewBase = ...,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: AsyncSession = Depends(get_db)
):
    """
    Update a user's review
    """
    review_repo = ReviewRepository(db)
    
    # Get existing review and verify ownership
    existing_review = await review_repo.get_review_by_id(review_id)
    if not existing_review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )
    
    if existing_review.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Can only update your own reviews"
        )
    
    # Update the review
    updated_review = await review_repo.update_review(review_id, review_update)
    if not updated_review:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update review"
        )
    
    # Update POI rating in background
    background_tasks.add_task(review_repo.update_poi_rating, existing_review.poi_id)
    
    return updated_review


@router.delete("/reviews/{review_id}", response_model=SuccessResponse)
async def delete_review(
    review_id: UUID = Path(..., description="Review unique identifier"),
    user_id: UUID = Query(..., description="User ID"),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a user's review
    """
    review_repo = ReviewRepository(db)
    
    # Get existing review and verify ownership
    existing_review = await review_repo.get_review_by_id(review_id)
    if not existing_review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )
    
    if existing_review.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Can only delete your own reviews"
        )
    
    # Delete the review
    success = await review_repo.delete_review(review_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to delete review"
        )
    
    # Update POI rating in background
    background_tasks.add_task(review_repo.update_poi_rating, existing_review.poi_id)
    
    return SuccessResponse(message="Review deleted successfully")


@router.post("/reviews/{review_id}/helpful", response_model=SuccessResponse)
async def mark_review_helpful(
    review_id: UUID = Path(..., description="Review unique identifier"),
    user_id: UUID = Query(..., description="User ID"),
    db: AsyncSession = Depends(get_db)
):
    """
    Mark a review as helpful
    """
    review_repo = ReviewRepository(db)
    
    success = await review_repo.mark_review_helpful(review_id, user_id, is_helpful=True)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to mark review as helpful"
        )
    
    return SuccessResponse(message="Review marked as helpful")


@router.post("/reviews/{review_id}/not-helpful", response_model=SuccessResponse)
async def mark_review_not_helpful(
    review_id: UUID = Path(..., description="Review unique identifier"),
    user_id: UUID = Query(..., description="User ID"),
    db: AsyncSession = Depends(get_db)
):
    """
    Mark a review as not helpful
    """
    review_repo = ReviewRepository(db)
    
    success = await review_repo.mark_review_helpful(review_id, user_id, is_helpful=False)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to mark review as not helpful"
        )
    
    return SuccessResponse(message="Review marked as not helpful")


@router.post("/reviews/{review_id}/report", response_model=SuccessResponse)
async def report_review(
    review_id: UUID = Path(..., description="Review unique identifier"),
    user_id: UUID = Query(..., description="User ID"),
    reason: str = Query(..., description="Reason for reporting"),
    db: AsyncSession = Depends(get_db)
):
    """
    Report a review for moderation
    """
    review_repo = ReviewRepository(db)
    
    success = await review_repo.report_review(review_id, user_id, reason)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to report review"
        )
    
    return SuccessResponse(message="Review reported for moderation")


@router.get("/users/{user_id}/reviews", response_model=List[Review])
async def get_user_reviews(
    user_id: UUID = Path(..., description="User ID"),
    limit: int = Query(20, gt=0, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all reviews by a specific user
    """
    review_repo = ReviewRepository(db)
    reviews = await review_repo.get_user_reviews(user_id, limit=limit, offset=offset)
    return reviews