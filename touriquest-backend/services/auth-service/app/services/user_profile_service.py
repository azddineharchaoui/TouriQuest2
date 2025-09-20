"""
User Profile Service
Business logic for user profiles, social features, travel statistics, and achievements
"""
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Tuple
from uuid import UUID
import math

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc, asc

from ..models import (
    User, UserProfile, TravelStatistics, UserAchievement, UserContent, 
    UserActivity, TravelTimeline, UserPrivacySettings, SocialConnection,
    AchievementType, PrivacyLevel, VerificationStatus, ContentType, ActivityType
)
from ..schemas.user_profile_schemas import (
    UserProfileCreate, UserProfileUpdate, TravelStatisticsUpdate,
    UserContentCreate, UserContentUpdate, TravelTimelineCreate, TravelTimelineUpdate,
    UserPrivacySettingsUpdate, FollowRequest, UserSearchRequest, TravelBuddyRequest
)


class UserProfileService:
    """User profile management service"""
    
    def __init__(self, db: Session, current_user: Optional[User] = None):
        self.db = db
        self.current_user = current_user
    
    # Profile Management
    async def get_user_profile(self, user_id: UUID, requesting_user_id: Optional[UUID] = None) -> Tuple[User, Dict[str, Any]]:
        """Get comprehensive user profile with privacy filtering"""
        
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found")
        
        # Get privacy settings
        privacy_settings = self.db.query(UserPrivacySettings).filter(
            UserPrivacySettings.user_id == user_id
        ).first()
        
        # Check if requesting user can view this profile
        can_view_profile = await self._can_view_profile(user_id, requesting_user_id, privacy_settings)
        if not can_view_profile:
            raise ValueError("Profile is private")
        
        # Build profile data based on privacy settings
        profile_data = await self._build_profile_data(user, requesting_user_id, privacy_settings)
        
        return user, profile_data
    
    async def create_user_profile(self, user_id: UUID, profile_data: UserProfileCreate) -> UserProfile:
        """Create user profile"""
        
        # Check if profile already exists
        existing_profile = self.db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
        if existing_profile:
            raise ValueError("User profile already exists")
        
        profile = UserProfile(
            user_id=user_id,
            **profile_data.dict(exclude_unset=True)
        )
        
        self.db.add(profile)
        self.db.commit()
        self.db.refresh(profile)
        
        # Create activity
        await self._create_activity(
            user_id, ActivityType.PROFILE_UPDATE, 
            "Updated profile information", 
            {"action": "profile_created"}
        )
        
        return profile
    
    async def update_user_profile(self, user_id: UUID, profile_data: UserProfileUpdate) -> UserProfile:
        """Update user profile"""
        
        profile = self.db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
        if not profile:
            # Create profile if it doesn't exist
            create_data = UserProfileCreate(**profile_data.dict(exclude_unset=True))
            return await self.create_user_profile(user_id, create_data)
        
        # Update profile
        for field, value in profile_data.dict(exclude_unset=True).items():
            setattr(profile, field, value)
        
        profile.updated_at = datetime.utcnow()
        self.db.commit()
        
        # Create activity
        await self._create_activity(
            user_id, ActivityType.PROFILE_UPDATE,
            "Updated profile information",
            {"updated_fields": list(profile_data.dict(exclude_unset=True).keys())}
        )
        
        return profile
    
    # Travel Statistics Management
    async def get_travel_statistics(self, user_id: UUID, requesting_user_id: Optional[UUID] = None) -> TravelStatistics:
        """Get user travel statistics with privacy filtering"""
        
        # Check privacy
        privacy_settings = self.db.query(UserPrivacySettings).filter(
            UserPrivacySettings.user_id == user_id
        ).first()
        
        if not await self._can_view_statistics(user_id, requesting_user_id, privacy_settings):
            raise ValueError("Travel statistics are private")
        
        stats = self.db.query(TravelStatistics).filter(TravelStatistics.user_id == user_id).first()
        if not stats:
            # Create default statistics
            stats = await self._create_default_statistics(user_id)
        
        return stats
    
    async def update_travel_statistics(self, user_id: UUID, update_data: TravelStatisticsUpdate) -> TravelStatistics:
        """Update travel statistics"""
        
        stats = self.db.query(TravelStatistics).filter(TravelStatistics.user_id == user_id).first()
        if not stats:
            stats = await self._create_default_statistics(user_id)
        
        # Process updates
        if update_data.miles_to_add:
            stats.total_miles_traveled += update_data.miles_to_add
            stats.total_kilometers_traveled = stats.total_miles_traveled * 1.60934
        
        if update_data.new_country:
            await self._add_country_visit(stats, update_data.new_country)
        
        if update_data.new_city:
            await self._add_city_visit(stats, update_data.new_city)
        
        if update_data.eco_points_to_add:
            stats.eco_score += update_data.eco_points_to_add
            stats.sustainable_choices += 1
        
        if update_data.carbon_footprint_to_add:
            stats.carbon_footprint += update_data.carbon_footprint_to_add
        
        stats.updated_at = datetime.utcnow()
        self.db.commit()
        
        # Check for new achievements
        await self._check_and_award_achievements(user_id, stats)
        
        return stats
    
    # Social Features
    async def follow_user(self, follower_id: UUID, following_id: UUID) -> SocialConnection:
        """Follow a user"""
        
        if follower_id == following_id:
            raise ValueError("Cannot follow yourself")
        
        # Check if already following
        existing = self.db.query(SocialConnection).filter(
            and_(
                SocialConnection.follower_id == follower_id,
                SocialConnection.following_id == following_id
            )
        ).first()
        
        if existing:
            raise ValueError("Already following this user")
        
        # Create connection
        connection = SocialConnection(
            follower_id=follower_id,
            following_id=following_id
        )
        
        self.db.add(connection)
        
        # Update statistics
        await self._update_social_statistics(follower_id, following_id)
        
        self.db.commit()
        
        # Create activities
        await self._create_activity(
            follower_id, ActivityType.FRIEND_ADDED,
            "Started following a new traveler",
            {"following_id": str(following_id)}
        )
        
        return connection
    
    async def unfollow_user(self, follower_id: UUID, following_id: UUID) -> bool:
        """Unfollow a user"""
        
        connection = self.db.query(SocialConnection).filter(
            and_(
                SocialConnection.follower_id == follower_id,
                SocialConnection.following_id == following_id
            )
        ).first()
        
        if not connection:
            raise ValueError("Not following this user")
        
        self.db.delete(connection)
        
        # Update statistics
        await self._update_social_statistics(follower_id, following_id, unfollow=True)
        
        self.db.commit()
        
        return True
    
    async def get_followers(self, user_id: UUID, requesting_user_id: Optional[UUID] = None, limit: int = 20, offset: int = 0) -> List[User]:
        """Get user followers with privacy filtering"""
        
        # Check privacy
        privacy_settings = self.db.query(UserPrivacySettings).filter(
            UserPrivacySettings.user_id == user_id
        ).first()
        
        if not await self._can_view_connections(user_id, requesting_user_id, privacy_settings):
            raise ValueError("Follower list is private")
        
        followers = self.db.query(User).join(
            SocialConnection, User.id == SocialConnection.follower_id
        ).filter(
            SocialConnection.following_id == user_id
        ).offset(offset).limit(limit).all()
        
        return followers
    
    async def get_following(self, user_id: UUID, requesting_user_id: Optional[UUID] = None, limit: int = 20, offset: int = 0) -> List[User]:
        """Get users that this user is following"""
        
        # Check privacy
        privacy_settings = self.db.query(UserPrivacySettings).filter(
            UserPrivacySettings.user_id == user_id
        ).first()
        
        if not await self._can_view_connections(user_id, requesting_user_id, privacy_settings):
            raise ValueError("Following list is private")
        
        following = self.db.query(User).join(
            SocialConnection, User.id == SocialConnection.following_id
        ).filter(
            SocialConnection.follower_id == user_id
        ).offset(offset).limit(limit).all()
        
        return following
    
    # Achievement System
    async def get_user_achievements(self, user_id: UUID, requesting_user_id: Optional[UUID] = None) -> List[UserAchievement]:
        """Get user achievements with privacy filtering"""
        
        # Check privacy
        privacy_settings = self.db.query(UserPrivacySettings).filter(
            UserPrivacySettings.user_id == user_id
        ).first()
        
        if not await self._can_view_achievements(user_id, requesting_user_id, privacy_settings):
            raise ValueError("Achievements are private")
        
        achievements = self.db.query(UserAchievement).filter(
            and_(
                UserAchievement.user_id == user_id,
                UserAchievement.is_visible == True
            )
        ).order_by(desc(UserAchievement.unlock_date)).all()
        
        return achievements
    
    async def calculate_achievement_progress(self, user_id: UUID) -> Dict[AchievementType, Dict[str, Any]]:
        """Calculate progress towards all achievements"""
        
        stats = await self.get_travel_statistics(user_id, user_id)  # Self can always view
        progress = {}
        
        # World Explorer (countries visited)
        progress[AchievementType.WORLD_EXPLORER] = await self._calculate_world_explorer_progress(stats)
        
        # Eco Warrior (sustainable travel)
        progress[AchievementType.ECO_WARRIOR] = await self._calculate_eco_warrior_progress(stats)
        
        # Culture Seeker (cultural activities)
        progress[AchievementType.CULTURE_SEEKER] = await self._calculate_culture_seeker_progress(user_id)
        
        # Adventure Master (adventure activities)
        progress[AchievementType.ADVENTURE_MASTER] = await self._calculate_adventure_master_progress(user_id)
        
        # Social Butterfly (social connections)
        progress[AchievementType.SOCIAL_BUTTERFLY] = await self._calculate_social_butterfly_progress(stats)
        
        return progress
    
    # Content Management
    async def create_user_content(self, user_id: UUID, content_data: UserContentCreate) -> UserContent:
        """Create user content"""
        
        content = UserContent(
            user_id=user_id,
            **content_data.dict()
        )
        
        self.db.add(content)
        self.db.commit()
        self.db.refresh(content)
        
        # Update statistics
        if content.content_type == ContentType.PHOTO:
            await self._increment_photo_count(user_id)
        elif content.content_type == ContentType.REVIEW:
            await self._increment_review_count(user_id)
        
        # Create activity
        await self._create_activity(
            user_id, ActivityType.PHOTO_UPLOAD if content.content_type == ContentType.PHOTO else ActivityType.REVIEW_POST,
            f"Shared a new {content.content_type.value}",
            {"content_id": str(content.id), "location": content.location_name}
        )
        
        return content
    
    # Travel Timeline
    async def create_timeline_entry(self, user_id: UUID, timeline_data: TravelTimelineCreate) -> TravelTimeline:
        """Create travel timeline entry"""
        
        # Calculate duration if end_date is provided
        duration_days = None
        if timeline_data.end_date:
            duration_days = (timeline_data.end_date - timeline_data.start_date).days
        
        timeline = TravelTimeline(
            user_id=user_id,
            duration_days=duration_days,
            **timeline_data.dict(exclude={'end_date'} if not timeline_data.end_date else {})
        )
        
        if timeline_data.end_date:
            timeline.end_date = timeline_data.end_date
        
        self.db.add(timeline)
        self.db.commit()
        self.db.refresh(timeline)
        
        # Update travel statistics
        await self._update_statistics_from_timeline(user_id, timeline)
        
        # Create activity
        await self._create_activity(
            user_id, ActivityType.TRIP_CHECKIN,
            f"Visited {timeline.destination}",
            {"timeline_id": str(timeline.id), "destination": timeline.destination}
        )
        
        return timeline
    
    # Privacy Settings
    async def update_privacy_settings(self, user_id: UUID, settings_data: UserPrivacySettingsUpdate) -> UserPrivacySettings:
        """Update user privacy settings"""
        
        settings = self.db.query(UserPrivacySettings).filter(
            UserPrivacySettings.user_id == user_id
        ).first()
        
        if not settings:
            # Create default settings
            settings = UserPrivacySettings(user_id=user_id)
            self.db.add(settings)
        
        # Update settings
        for field, value in settings_data.dict(exclude_unset=True).items():
            setattr(settings, field, value)
        
        settings.updated_at = datetime.utcnow()
        self.db.commit()
        
        return settings
    
    # Search and Discovery
    async def search_users(self, search_request: UserSearchRequest, requesting_user_id: Optional[UUID] = None) -> Tuple[List[User], int]:
        """Search users with filters"""
        
        query = self.db.query(User).filter(User.status == "active")
        
        # Text search
        if search_request.query:
            search_term = f"%{search_request.query}%"
            query = query.filter(
                or_(
                    User.first_name.ilike(search_term),
                    User.last_name.ilike(search_term),
                    User.email.ilike(search_term)
                )
            )
        
        # Location filter
        if search_request.location:
            location_term = f"%{search_request.location}%"
            query = query.filter(User.location.ilike(location_term))
        
        # Countries visited filter
        if search_request.min_countries or search_request.max_countries:
            query = query.join(TravelStatistics)
            if search_request.min_countries:
                query = query.filter(TravelStatistics.countries_visited >= search_request.min_countries)
            if search_request.max_countries:
                query = query.filter(TravelStatistics.countries_visited <= search_request.max_countries)
        
        # Verified users only
        if search_request.verified_only:
            query = query.filter(User.is_email_verified == True)
        
        # Apply privacy filters
        query = await self._apply_privacy_filters(query, requesting_user_id)
        
        # Get total count
        total_count = query.count()
        
        # Apply pagination
        users = query.offset(search_request.offset).limit(search_request.limit).all()
        
        return users, total_count
    
    # Private Helper Methods
    async def _can_view_profile(self, user_id: UUID, requesting_user_id: Optional[UUID], privacy_settings: Optional[UserPrivacySettings]) -> bool:
        """Check if user can view profile"""
        
        if user_id == requesting_user_id:
            return True  # Can always view own profile
        
        if not privacy_settings:
            return True  # Default to public if no settings
        
        privacy_level = privacy_settings.profile_visibility
        
        if privacy_level == PrivacyLevel.PUBLIC:
            return True
        elif privacy_level == PrivacyLevel.PRIVATE:
            return False
        elif privacy_level == PrivacyLevel.FOLLOWERS:
            return await self._is_following(requesting_user_id, user_id) if requesting_user_id else False
        
        return False
    
    async def _can_view_statistics(self, user_id: UUID, requesting_user_id: Optional[UUID], privacy_settings: Optional[UserPrivacySettings]) -> bool:
        """Check if user can view travel statistics"""
        
        if user_id == requesting_user_id:
            return True
        
        if not privacy_settings:
            return True
        
        privacy_level = privacy_settings.statistics_visibility
        return await self._check_privacy_level(privacy_level, user_id, requesting_user_id)
    
    async def _can_view_achievements(self, user_id: UUID, requesting_user_id: Optional[UUID], privacy_settings: Optional[UserPrivacySettings]) -> bool:
        """Check if user can view achievements"""
        
        if user_id == requesting_user_id:
            return True
        
        if not privacy_settings:
            return True
        
        privacy_level = privacy_settings.achievements_visibility
        return await self._check_privacy_level(privacy_level, user_id, requesting_user_id)
    
    async def _can_view_connections(self, user_id: UUID, requesting_user_id: Optional[UUID], privacy_settings: Optional[UserPrivacySettings]) -> bool:
        """Check if user can view social connections"""
        
        if user_id == requesting_user_id:
            return True
        
        if not privacy_settings:
            return True
        
        privacy_level = privacy_settings.connections_visibility
        return await self._check_privacy_level(privacy_level, user_id, requesting_user_id)
    
    async def _check_privacy_level(self, privacy_level: PrivacyLevel, user_id: UUID, requesting_user_id: Optional[UUID]) -> bool:
        """Generic privacy level checker"""
        
        if privacy_level == PrivacyLevel.PUBLIC:
            return True
        elif privacy_level == PrivacyLevel.PRIVATE:
            return False
        elif privacy_level == PrivacyLevel.FOLLOWERS:
            return await self._is_following(requesting_user_id, user_id) if requesting_user_id else False
        
        return False
    
    async def _is_following(self, follower_id: UUID, following_id: UUID) -> bool:
        """Check if one user is following another"""
        
        connection = self.db.query(SocialConnection).filter(
            and_(
                SocialConnection.follower_id == follower_id,
                SocialConnection.following_id == following_id
            )
        ).first()
        
        return connection is not None
    
    async def _create_default_statistics(self, user_id: UUID) -> TravelStatistics:
        """Create default travel statistics for user"""
        
        stats = TravelStatistics(user_id=user_id)
        self.db.add(stats)
        self.db.commit()
        self.db.refresh(stats)
        
        return stats
    
    async def _create_activity(self, user_id: UUID, activity_type: ActivityType, title: str, metadata: Dict[str, Any], privacy_level: PrivacyLevel = PrivacyLevel.FOLLOWERS):
        """Create user activity"""
        
        activity = UserActivity(
            user_id=user_id,
            activity_type=activity_type,
            title=title,
            metadata=metadata,
            privacy_level=privacy_level
        )
        
        self.db.add(activity)
        self.db.commit()
    
    async def _check_and_award_achievements(self, user_id: UUID, stats: TravelStatistics):
        """Check and award new achievements based on statistics"""
        
        # World Explorer achievements
        await self._check_world_explorer_achievement(user_id, stats.countries_visited)
        
        # Eco Warrior achievements
        await self._check_eco_warrior_achievement(user_id, stats.eco_score)
        
        # Social Butterfly achievements
        await self._check_social_butterfly_achievement(user_id, stats.followers_count)
    
    async def _check_world_explorer_achievement(self, user_id: UUID, countries_visited: int):
        """Check and award World Explorer achievement"""
        
        levels = {1: 5, 2: 15, 3: 30, 4: 50}  # Bronze, Silver, Gold, Platinum
        
        for level, required_countries in levels.items():
            if countries_visited >= required_countries:
                existing = self.db.query(UserAchievement).filter(
                    and_(
                        UserAchievement.user_id == user_id,
                        UserAchievement.achievement_type == AchievementType.WORLD_EXPLORER,
                        UserAchievement.level == level
                    )
                ).first()
                
                if not existing:
                    achievement = UserAchievement(
                        user_id=user_id,
                        achievement_type=AchievementType.WORLD_EXPLORER,
                        level=level,
                        title=f"World Explorer - {'Bronze' if level == 1 else 'Silver' if level == 2 else 'Gold' if level == 3 else 'Platinum'}",
                        description=f"Visited {required_countries} countries",
                        criteria_met={"countries_visited": countries_visited}
                    )
                    
                    self.db.add(achievement)
                    
                    # Create activity
                    await self._create_activity(
                        user_id, ActivityType.ACHIEVEMENT_EARNED,
                        f"Earned {achievement.title} achievement!",
                        {"achievement_id": str(achievement.id), "achievement_type": achievement.achievement_type.value}
                    )
    
    async def _calculate_world_explorer_progress(self, stats: TravelStatistics) -> Dict[str, Any]:
        """Calculate World Explorer achievement progress"""
        
        levels = {1: 5, 2: 15, 3: 30, 4: 50}
        current_countries = stats.countries_visited
        
        # Find current level
        current_level = 0
        for level, required in levels.items():
            if current_countries >= required:
                current_level = level
        
        # Find next level
        next_level = current_level + 1 if current_level < 4 else None
        next_target = levels.get(next_level, 0)
        
        progress = 0
        if next_level:
            prev_target = levels.get(current_level, 0)
            progress = ((current_countries - prev_target) / (next_target - prev_target)) * 100
        
        return {
            "current_level": current_level,
            "current_value": current_countries,
            "next_target": next_target,
            "progress_percentage": min(100, progress),
            "countries_to_next_level": max(0, next_target - current_countries) if next_target else 0
        }
    
    async def _increment_photo_count(self, user_id: UUID):
        """Increment photo count in statistics"""
        
        stats = self.db.query(TravelStatistics).filter(TravelStatistics.user_id == user_id).first()
        if stats:
            stats.photos_shared += 1
            self.db.commit()
    
    async def _increment_review_count(self, user_id: UUID):
        """Increment review count in statistics"""
        
        stats = self.db.query(TravelStatistics).filter(TravelStatistics.user_id == user_id).first()
        if stats:
            stats.reviews_written += 1
            self.db.commit()
    
    async def _update_social_statistics(self, follower_id: UUID, following_id: UUID, unfollow: bool = False):
        """Update social statistics for both users"""
        
        # Update follower's following count
        follower_stats = self.db.query(TravelStatistics).filter(TravelStatistics.user_id == follower_id).first()
        if follower_stats:
            if unfollow:
                follower_stats.following_count = max(0, follower_stats.following_count - 1)
            else:
                follower_stats.following_count += 1
        
        # Update following user's follower count
        following_stats = self.db.query(TravelStatistics).filter(TravelStatistics.user_id == following_id).first()
        if following_stats:
            if unfollow:
                following_stats.followers_count = max(0, following_stats.followers_count - 1)
            else:
                following_stats.followers_count += 1
        
        self.db.commit()
    
    async def _build_profile_data(self, user: User, requesting_user_id: Optional[UUID], privacy_settings: Optional[UserPrivacySettings]) -> Dict[str, Any]:
        """Build comprehensive profile data based on privacy settings"""
        
        profile_data = {
            "basic_info": {
                "id": user.id,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "avatar_url": user.avatar_url,
                "bio": getattr(user.profile, 'bio', None) if user.profile else None,
                "location": user.location,
                "created_at": user.created_at
            }
        }
        
        # Add extended profile if accessible
        if await self._can_view_profile(user.id, requesting_user_id, privacy_settings):
            if user.profile:
                profile_data["extended_profile"] = {
                    "cover_photo_url": user.profile.cover_photo_url,
                    "website_url": user.profile.website_url,
                    "social_media_links": user.profile.social_media_links,
                    "travel_motto": user.profile.travel_motto,
                    "favorite_destinations": user.profile.favorite_destinations,
                    "languages_spoken": user.profile.languages_spoken,
                    "verification_status": {
                        "identity_verified": user.profile.identity_verified,
                        "phone_verified": user.profile.phone_verified,
                        "email_verified": user.profile.email_verified
                    }
                }
        
        # Add travel statistics if accessible
        if await self._can_view_statistics(user.id, requesting_user_id, privacy_settings):
            if user.travel_stats:
                profile_data["travel_statistics"] = user.travel_stats
        
        # Add achievements if accessible
        if await self._can_view_achievements(user.id, requesting_user_id, privacy_settings):
            achievements = self.db.query(UserAchievement).filter(
                and_(
                    UserAchievement.user_id == user.id,
                    UserAchievement.is_visible == True
                )
            ).all()
            profile_data["achievements"] = achievements
        
        # Add social connections if accessible
        if await self._can_view_connections(user.id, requesting_user_id, privacy_settings):
            follower_count = self.db.query(SocialConnection).filter(
                SocialConnection.following_id == user.id
            ).count()
            following_count = self.db.query(SocialConnection).filter(
                SocialConnection.follower_id == user.id
            ).count()
            
            profile_data["social_stats"] = {
                "followers_count": follower_count,
                "following_count": following_count
            }
            
            # Check relationship with requesting user
            if requesting_user_id:
                is_following = await self._is_following(requesting_user_id, user.id)
                is_follower = await self._is_following(user.id, requesting_user_id)
                profile_data["relationship"] = {
                    "is_following": is_following,
                    "is_follower": is_follower
                }
        
        return profile_data
    
    async def _add_country_visit(self, stats: TravelStatistics, country: str):
        """Add a new country to visited list"""
        
        if not stats.countries_visited_list:
            stats.countries_visited_list = []
        
        if country not in stats.countries_visited_list:
            stats.countries_visited_list.append(country)
            stats.countries_visited = len(stats.countries_visited_list)
    
    async def _add_city_visit(self, stats: TravelStatistics, city: str):
        """Add a new city to visited list"""
        
        if not stats.cities_visited_list:
            stats.cities_visited_list = []
        
        if city not in stats.cities_visited_list:
            stats.cities_visited_list.append(city)
            stats.cities_visited = len(stats.cities_visited_list)
    
    async def _update_statistics_from_timeline(self, user_id: UUID, timeline: TravelTimeline):
        """Update statistics based on timeline entry"""
        
        stats = self.db.query(TravelStatistics).filter(TravelStatistics.user_id == user_id).first()
        if not stats:
            stats = await self._create_default_statistics(user_id)
        
        # Add destination to visited places
        if timeline.country:
            await self._add_country_visit(stats, timeline.country)
        
        if timeline.destination:
            await self._add_city_visit(stats, timeline.destination)
        
        # Update trips count
        stats.trips_taken += 1
        
        # Update total days traveled
        if timeline.duration_days:
            stats.total_days_traveled += timeline.duration_days
        
        self.db.commit()
    
    async def _calculate_eco_warrior_progress(self, stats: TravelStatistics) -> Dict[str, Any]:
        """Calculate Eco Warrior achievement progress"""
        
        levels = {1: 50, 2: 150, 3: 300, 4: 500}  # Bronze, Silver, Gold, Platinum
        current_score = stats.eco_score
        
        # Find current level
        current_level = 0
        for level, required in levels.items():
            if current_score >= required:
                current_level = level
        
        # Find next level
        next_level = current_level + 1 if current_level < 4 else None
        next_target = levels.get(next_level, 0)
        
        progress = 0
        if next_level:
            prev_target = levels.get(current_level, 0)
            progress = ((current_score - prev_target) / (next_target - prev_target)) * 100
        
        return {
            "current_level": current_level,
            "current_value": current_score,
            "next_target": next_target,
            "progress_percentage": min(100, progress),
            "points_to_next_level": max(0, next_target - current_score) if next_target else 0
        }
    
    async def _calculate_culture_seeker_progress(self, user_id: UUID) -> Dict[str, Any]:
        """Calculate Culture Seeker achievement progress"""
        
        # Count cultural activities from user content
        cultural_activities = self.db.query(UserContent).filter(
            and_(
                UserContent.user_id == user_id,
                UserContent.tags.contains(['cultural', 'museum', 'heritage', 'art', 'history'])
            )
        ).count()
        
        levels = {1: 5, 2: 15, 3: 30, 4: 50}
        current_level = 0
        for level, required in levels.items():
            if cultural_activities >= required:
                current_level = level
        
        next_level = current_level + 1 if current_level < 4 else None
        next_target = levels.get(next_level, 0)
        
        progress = 0
        if next_level:
            prev_target = levels.get(current_level, 0)
            progress = ((cultural_activities - prev_target) / (next_target - prev_target)) * 100
        
        return {
            "current_level": current_level,
            "current_value": cultural_activities,
            "next_target": next_target,
            "progress_percentage": min(100, progress),
            "activities_to_next_level": max(0, next_target - cultural_activities) if next_target else 0
        }
    
    async def _calculate_adventure_master_progress(self, user_id: UUID) -> Dict[str, Any]:
        """Calculate Adventure Master achievement progress"""
        
        # Count adventure activities from user content
        adventure_activities = self.db.query(UserContent).filter(
            and_(
                UserContent.user_id == user_id,
                UserContent.tags.contains(['adventure', 'hiking', 'climbing', 'extreme', 'outdoor'])
            )
        ).count()
        
        levels = {1: 3, 2: 10, 3: 20, 4: 35}
        current_level = 0
        for level, required in levels.items():
            if adventure_activities >= required:
                current_level = level
        
        next_level = current_level + 1 if current_level < 4 else None
        next_target = levels.get(next_level, 0)
        
        progress = 0
        if next_level:
            prev_target = levels.get(current_level, 0)
            progress = ((adventure_activities - prev_target) / (next_target - prev_target)) * 100
        
        return {
            "current_level": current_level,
            "current_value": adventure_activities,
            "next_target": next_target,
            "progress_percentage": min(100, progress),
            "activities_to_next_level": max(0, next_target - adventure_activities) if next_target else 0
        }
    
    async def _calculate_social_butterfly_progress(self, stats: TravelStatistics) -> Dict[str, Any]:
        """Calculate Social Butterfly achievement progress"""
        
        levels = {1: 10, 2: 50, 3: 100, 4: 250}  # Bronze, Silver, Gold, Platinum
        current_followers = stats.followers_count
        
        # Find current level
        current_level = 0
        for level, required in levels.items():
            if current_followers >= required:
                current_level = level
        
        # Find next level
        next_level = current_level + 1 if current_level < 4 else None
        next_target = levels.get(next_level, 0)
        
        progress = 0
        if next_level:
            prev_target = levels.get(current_level, 0)
            progress = ((current_followers - prev_target) / (next_target - prev_target)) * 100
        
        return {
            "current_level": current_level,
            "current_value": current_followers,
            "next_target": next_target,
            "progress_percentage": min(100, progress),
            "followers_to_next_level": max(0, next_target - current_followers) if next_target else 0
        }
    
    async def _check_eco_warrior_achievement(self, user_id: UUID, eco_score: int):
        """Check and award Eco Warrior achievement"""
        
        levels = {1: 50, 2: 150, 3: 300, 4: 500}
        
        for level, required_score in levels.items():
            if eco_score >= required_score:
                existing = self.db.query(UserAchievement).filter(
                    and_(
                        UserAchievement.user_id == user_id,
                        UserAchievement.achievement_type == AchievementType.ECO_WARRIOR,
                        UserAchievement.level == level
                    )
                ).first()
                
                if not existing:
                    achievement = UserAchievement(
                        user_id=user_id,
                        achievement_type=AchievementType.ECO_WARRIOR,
                        level=level,
                        title=f"Eco Warrior - {'Bronze' if level == 1 else 'Silver' if level == 2 else 'Gold' if level == 3 else 'Platinum'}",
                        description=f"Earned {required_score} eco-friendly travel points",
                        criteria_met={"eco_score": eco_score}
                    )
                    
                    self.db.add(achievement)
                    
                    # Create activity
                    await self._create_activity(
                        user_id, ActivityType.ACHIEVEMENT_EARNED,
                        f"Earned {achievement.title} achievement!",
                        {"achievement_id": str(achievement.id), "achievement_type": achievement.achievement_type.value}
                    )
    
    async def _check_social_butterfly_achievement(self, user_id: UUID, followers_count: int):
        """Check and award Social Butterfly achievement"""
        
        levels = {1: 10, 2: 50, 3: 100, 4: 250}
        
        for level, required_followers in levels.items():
            if followers_count >= required_followers:
                existing = self.db.query(UserAchievement).filter(
                    and_(
                        UserAchievement.user_id == user_id,
                        UserAchievement.achievement_type == AchievementType.SOCIAL_BUTTERFLY,
                        UserAchievement.level == level
                    )
                ).first()
                
                if not existing:
                    achievement = UserAchievement(
                        user_id=user_id,
                        achievement_type=AchievementType.SOCIAL_BUTTERFLY,
                        level=level,
                        title=f"Social Butterfly - {'Bronze' if level == 1 else 'Silver' if level == 2 else 'Gold' if level == 3 else 'Platinum'}",
                        description=f"Gained {required_followers} followers",
                        criteria_met={"followers_count": followers_count}
                    )
                    
                    self.db.add(achievement)
                    
                    # Create activity
                    await self._create_activity(
                        user_id, ActivityType.ACHIEVEMENT_EARNED,
                        f"Earned {achievement.title} achievement!",
                        {"achievement_id": str(achievement.id), "achievement_type": achievement.achievement_type.value}
                    )
    
    async def _apply_privacy_filters(self, query, requesting_user_id: Optional[UUID]):
        """Apply privacy filters to user queries"""
        
        # For now, just return users with public profiles
        # This would be enhanced to handle complex privacy filtering
        return query