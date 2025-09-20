"""
User Profile API Routes
RESTful endpoints for comprehensive user profile management
"""
from datetime import datetime
from typing import List, Optional, Dict, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..core.auth import get_current_user
from ..models import User, UserPrivacySettings
from ..schemas.user_profile_schemas import (
    UserProfileResponse, UserProfileCreate, UserProfileUpdate,
    TravelStatisticsResponse, TravelStatisticsUpdate,
    UserAchievementResponse, UserContentResponse, UserContentCreate, UserContentUpdate,
    TravelTimelineResponse, TravelTimelineCreate, TravelTimelineUpdate,
    UserPrivacySettingsResponse, UserPrivacySettingsUpdate,
    SocialConnectionResponse, FollowRequest, UserSearchRequest, UserSearchResponse,
    ActivityFeedResponse, TravelBuddyRequest, TravelBuddyResponse
)
from ..services.user_profile_service import UserProfileService

router = APIRouter(prefix="/profile", tags=["User Profile"])
security = HTTPBearer()


# Profile Management Endpoints
@router.get("/me", response_model=UserProfileResponse)
async def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's complete profile"""
    
    try:
        service = UserProfileService(db, current_user)
        user, profile_data = await service.get_user_profile(current_user.id, current_user.id)
        
        return UserProfileResponse(
            user=user,
            profile_data=profile_data,
            can_edit=True
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{user_id}", response_model=UserProfileResponse)
async def get_user_profile(
    user_id: UUID,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user profile by ID"""
    
    try:
        requesting_user_id = current_user.id if current_user else None
        service = UserProfileService(db, current_user)
        user, profile_data = await service.get_user_profile(user_id, requesting_user_id)
        
        return UserProfileResponse(
            user=user,
            profile_data=profile_data,
            can_edit=(current_user.id == user_id) if current_user else False
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/create", response_model=UserProfileResponse)
async def create_profile(
    profile_data: UserProfileCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create user profile"""
    
    try:
        service = UserProfileService(db, current_user)
        profile = await service.create_user_profile(current_user.id, profile_data)
        
        # Get complete profile data
        user, complete_profile_data = await service.get_user_profile(current_user.id, current_user.id)
        
        return UserProfileResponse(
            user=user,
            profile_data=complete_profile_data,
            can_edit=True
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/update", response_model=UserProfileResponse)
async def update_profile(
    profile_data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user profile"""
    
    try:
        service = UserProfileService(db, current_user)
        await service.update_user_profile(current_user.id, profile_data)
        
        # Get updated profile data
        user, updated_profile_data = await service.get_user_profile(current_user.id, current_user.id)
        
        return UserProfileResponse(
            user=user,
            profile_data=updated_profile_data,
            can_edit=True
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Travel Statistics Endpoints
@router.get("/statistics/me", response_model=TravelStatisticsResponse)
async def get_my_travel_statistics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's travel statistics"""
    
    try:
        service = UserProfileService(db, current_user)
        stats = await service.get_travel_statistics(current_user.id, current_user.id)
        
        return TravelStatisticsResponse(
            statistics=stats,
            achievement_progress=await service.calculate_achievement_progress(current_user.id)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/statistics/{user_id}", response_model=TravelStatisticsResponse)
async def get_user_travel_statistics(
    user_id: UUID,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's travel statistics"""
    
    try:
        requesting_user_id = current_user.id if current_user else None
        service = UserProfileService(db, current_user)
        stats = await service.get_travel_statistics(user_id, requesting_user_id)
        
        # Only show achievement progress to the user themselves
        achievement_progress = None
        if current_user and current_user.id == user_id:
            achievement_progress = await service.calculate_achievement_progress(user_id)
        
        return TravelStatisticsResponse(
            statistics=stats,
            achievement_progress=achievement_progress
        )
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/statistics/update", response_model=TravelStatisticsResponse)
async def update_travel_statistics(
    update_data: TravelStatisticsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update travel statistics"""
    
    try:
        service = UserProfileService(db, current_user)
        stats = await service.update_travel_statistics(current_user.id, update_data)
        
        return TravelStatisticsResponse(
            statistics=stats,
            achievement_progress=await service.calculate_achievement_progress(current_user.id)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Social Features Endpoints
@router.post("/follow/{user_id}", response_model=SocialConnectionResponse)
async def follow_user(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Follow a user"""
    
    try:
        service = UserProfileService(db, current_user)
        connection = await service.follow_user(current_user.id, user_id)
        
        return SocialConnectionResponse(
            connection=connection,
            message="Successfully followed user"
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/unfollow/{user_id}")
async def unfollow_user(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Unfollow a user"""
    
    try:
        service = UserProfileService(db, current_user)
        await service.unfollow_user(current_user.id, user_id)
        
        return {"message": "Successfully unfollowed user"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/followers/{user_id}")
async def get_user_followers(
    user_id: UUID,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's followers"""
    
    try:
        requesting_user_id = current_user.id if current_user else None
        service = UserProfileService(db, current_user)
        followers = await service.get_followers(user_id, requesting_user_id, limit, offset)
        
        return {
            "followers": followers,
            "count": len(followers),
            "has_more": len(followers) == limit
        }
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/following/{user_id}")
async def get_user_following(
    user_id: UUID,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get users that this user is following"""
    
    try:
        requesting_user_id = current_user.id if current_user else None
        service = UserProfileService(db, current_user)
        following = await service.get_following(user_id, requesting_user_id, limit, offset)
        
        return {
            "following": following,
            "count": len(following),
            "has_more": len(following) == limit
        }
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Achievement Endpoints
@router.get("/achievements/me")
async def get_my_achievements(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's achievements"""
    
    try:
        service = UserProfileService(db, current_user)
        achievements = await service.get_user_achievements(current_user.id, current_user.id)
        progress = await service.calculate_achievement_progress(current_user.id)
        
        return {
            "achievements": achievements,
            "progress": progress,
            "total_achievements": len(achievements)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/achievements/{user_id}")
async def get_user_achievements(
    user_id: UUID,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's achievements"""
    
    try:
        requesting_user_id = current_user.id if current_user else None
        service = UserProfileService(db, current_user)
        achievements = await service.get_user_achievements(user_id, requesting_user_id)
        
        return {
            "achievements": achievements,
            "total_achievements": len(achievements)
        }
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Content Management Endpoints
@router.post("/content", response_model=UserContentResponse)
async def create_content(
    content_data: UserContentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create user content"""
    
    try:
        service = UserProfileService(db, current_user)
        content = await service.create_user_content(current_user.id, content_data)
        
        return UserContentResponse(
            content=content,
            can_edit=True
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/content/{user_id}")
async def get_user_content(
    user_id: UUID,
    content_type: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's content (photos, reviews, etc.)"""
    
    try:
        # This would be implemented in the service
        # For now, returning placeholder structure
        return {
            "content": [],
            "count": 0,
            "has_more": False
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Timeline Endpoints
@router.post("/timeline", response_model=TravelTimelineResponse)
async def create_timeline_entry(
    timeline_data: TravelTimelineCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create travel timeline entry"""
    
    try:
        service = UserProfileService(db, current_user)
        timeline = await service.create_timeline_entry(current_user.id, timeline_data)
        
        return TravelTimelineResponse(
            timeline=timeline,
            can_edit=True
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/timeline/{user_id}")
async def get_user_timeline(
    user_id: UUID,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's travel timeline"""
    
    try:
        # This would be implemented in the service
        # For now, returning placeholder structure
        return {
            "timeline": [],
            "count": 0,
            "has_more": False
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Privacy Settings Endpoints
@router.get("/privacy/settings", response_model=UserPrivacySettingsResponse)
async def get_privacy_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's privacy settings"""
    
    try:
        settings = db.query(UserPrivacySettings).filter(
            UserPrivacySettings.user_id == current_user.id
        ).first()
        
        if not settings:
            # Create default settings
            service = UserProfileService(db, current_user)
            settings = await service.update_privacy_settings(
                current_user.id, 
                UserPrivacySettingsUpdate()
            )
        
        return UserPrivacySettingsResponse(settings=settings)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/privacy/settings", response_model=UserPrivacySettingsResponse)
async def update_privacy_settings(
    settings_data: UserPrivacySettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user's privacy settings"""
    
    try:
        service = UserProfileService(db, current_user)
        settings = await service.update_privacy_settings(current_user.id, settings_data)
        
        return UserPrivacySettingsResponse(settings=settings)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Search and Discovery Endpoints
@router.post("/search", response_model=UserSearchResponse)
async def search_users(
    search_request: UserSearchRequest,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Search users with filters"""
    
    try:
        requesting_user_id = current_user.id if current_user else None
        service = UserProfileService(db, current_user)
        users, total_count = await service.search_users(search_request, requesting_user_id)
        
        return UserSearchResponse(
            users=users,
            total_count=total_count,
            page_size=search_request.limit,
            has_more=(search_request.offset + len(users)) < total_count
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Activity Feed Endpoints
@router.get("/activity/feed")
async def get_activity_feed(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get personalized activity feed"""
    
    try:
        # This would get activities from followed users
        # For now, returning placeholder structure
        return {
            "activities": [],
            "count": 0,
            "has_more": False
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/activity/{user_id}")
async def get_user_activity(
    user_id: UUID,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's activity timeline"""
    
    try:
        # This would be implemented in the service with privacy filtering
        # For now, returning placeholder structure
        return {
            "activities": [],
            "count": 0,
            "has_more": False
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Travel Buddy Endpoints
@router.post("/travel-buddy/find", response_model=TravelBuddyResponse)
async def find_travel_buddies(
    request: TravelBuddyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Find potential travel buddies"""
    
    try:
        # This would implement travel buddy matching algorithm
        # For now, returning placeholder structure
        return TravelBuddyResponse(
            matches=[],
            total_matches=0,
            matching_criteria=request.dict()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Statistics and Analytics Endpoints
@router.get("/analytics/overview")
async def get_profile_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get profile analytics overview"""
    
    try:
        # This would provide analytics like profile views, engagement metrics, etc.
        return {
            "profile_views": 0,
            "content_views": 0,
            "follower_growth": [],
            "engagement_metrics": {},
            "popular_content": []
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Verification Endpoints
@router.post("/verification/request")
async def request_verification(
    verification_type: str = Query(..., regex="^(identity|phone|social)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Request profile verification"""
    
    try:
        # This would handle verification requests
        return {
            "message": f"Verification request submitted for {verification_type}",
            "status": "pending",
            "estimated_completion": "2-3 business days"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))