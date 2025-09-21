"""
Analytics processor for multimedia content.
Handles usage tracking, performance analytics, and engagement metrics.
"""

import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass

from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_

from app.core.config import get_settings
from app.core.database import get_db
from app.models import (
    AudioGuide, ARExperience, AudioPlaybackAnalytics, ARUsageAnalytics,
    AudioDownloadSession, ARCompatibilityReport, POI
)
from app.services.base import BaseService

logger = logging.getLogger(__name__)


@dataclass
class AnalyticsMetrics:
    """Analytics metrics for content."""
    total_users: int
    total_sessions: int
    total_downloads: int
    average_session_duration: float
    completion_rate: float
    user_retention_rate: float
    popular_times: List[Dict[str, Any]]
    geographic_distribution: Dict[str, int]


@dataclass
class PerformanceMetrics:
    """Performance metrics for content."""
    average_load_time: float
    success_rate: float
    error_rate: float
    bandwidth_usage: float
    device_compatibility_score: float
    user_satisfaction_score: float


class AnalyticsProcessor(BaseService):
    """Service for processing multimedia content analytics."""
    
    def __init__(self):
        super().__init__()
        self.settings = get_settings()
    
    async def track_audio_playback_event(
        self,
        audio_guide_id: str,
        user_id: Optional[str],
        session_id: str,
        event_type: str,
        event_data: Dict[str, Any],
        user_location: Optional[Tuple[float, float]] = None
    ) -> Dict[str, Any]:
        """
        Track audio playback event.
        
        Args:
            audio_guide_id: Audio guide identifier
            user_id: Optional user identifier
            session_id: Playback session identifier
            event_type: Type of event (start, pause, resume, complete, stop)
            event_data: Event-specific data
            user_location: Optional user location (lat, lon)
            
        Returns:
            Dict with tracking result
        """
        try:
            db = next(get_db())
            
            # Get or create analytics record
            analytics = db.query(AudioPlaybackAnalytics).filter(
                AudioPlaybackAnalytics.session_id == session_id
            ).first()
            
            if not analytics:
                audio_guide = db.query(AudioGuide).filter(
                    AudioGuide.id == audio_guide_id
                ).first()
                
                if not audio_guide:
                    return {"success": False, "error": "Audio guide not found"}
                
                analytics = AudioPlaybackAnalytics(
                    audio_guide_id=audio_guide_id,
                    user_id=user_id,
                    session_id=session_id,
                    device_type=event_data.get("device_type", "unknown"),
                    playback_quality=event_data.get("quality", "medium"),
                    total_duration_seconds=audio_guide.duration_seconds or 0,
                    started_at=datetime.utcnow()
                )
                
                if user_location:
                    from geoalchemy2 import Geography
                    analytics.playback_location = f"POINT({user_location[1]} {user_location[0]})"
                    
                    # Calculate distance from POI if location available
                    poi = db.query(POI).filter(POI.id == audio_guide.poi_id).first()
                    if poi and poi.location:
                        # Simplified distance calculation - would use PostGIS ST_Distance in production
                        analytics.distance_from_poi_meters = 0.0  # Placeholder
                
                db.add(analytics)
            
            # Update analytics based on event type
            await self._process_audio_event(analytics, event_type, event_data)
            
            # Update audio guide aggregated stats
            await self._update_audio_guide_stats(db, audio_guide_id, event_type)
            
            db.commit()
            
            return {
                "success": True,
                "analytics_id": str(analytics.id),
                "event_type": event_type,
                "session_id": session_id
            }
            
        except Exception as e:
            logger.error(f"Error tracking audio playback event: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def track_ar_usage_event(
        self,
        ar_experience_id: str,
        user_id: Optional[str],
        session_id: str,
        event_type: str,
        event_data: Dict[str, Any],
        user_location: Optional[Tuple[float, float]] = None
    ) -> Dict[str, Any]:
        """
        Track AR experience usage event.
        
        Args:
            ar_experience_id: AR experience identifier
            user_id: Optional user identifier
            session_id: AR session identifier
            event_type: Type of event (start, placement, interaction, complete, error)
            event_data: Event-specific data
            user_location: Optional user location (lat, lon)
            
        Returns:
            Dict with tracking result
        """
        try:
            db = next(get_db())
            
            # Get or create analytics record
            analytics = db.query(ARUsageAnalytics).filter(
                ARUsageAnalytics.session_id == session_id
            ).first()
            
            if not analytics:
                ar_experience = db.query(ARExperience).filter(
                    ARExperience.id == ar_experience_id
                ).first()
                
                if not ar_experience:
                    return {"success": False, "error": "AR experience not found"}
                
                analytics = ARUsageAnalytics(
                    ar_experience_id=ar_experience_id,
                    user_id=user_id,
                    session_id=session_id,
                    device_type=event_data.get("device_type", "unknown"),
                    lighting_conditions=event_data.get("lighting", "normal"),
                    surface_quality=event_data.get("surface_quality", "good"),
                    started_at=datetime.utcnow()
                )
                
                if user_location:
                    analytics.usage_location = f"POINT({user_location[1]} {user_location[0]})"
                    
                    # Calculate distance from trigger point
                    if ar_experience.trigger_location:
                        # Simplified distance calculation
                        analytics.distance_from_trigger_meters = 0.0  # Placeholder
                
                db.add(analytics)
            
            # Update analytics based on event type
            await self._process_ar_event(analytics, event_type, event_data)
            
            # Update AR experience aggregated stats
            await self._update_ar_experience_stats(db, ar_experience_id, event_type)
            
            db.commit()
            
            return {
                "success": True,
                "analytics_id": str(analytics.id),
                "event_type": event_type,
                "session_id": session_id
            }
            
        except Exception as e:
            logger.error(f"Error tracking AR usage event: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def _process_audio_event(
        self,
        analytics: AudioPlaybackAnalytics,
        event_type: str,
        event_data: Dict[str, Any]
    ) -> None:
        """Process audio playback event and update analytics."""
        
        current_time = datetime.utcnow()
        
        if event_type == "start":
            analytics.started_at = current_time
            
        elif event_type == "pause":
            analytics.pause_count = (analytics.pause_count or 0) + 1
            
        elif event_type == "skip":
            analytics.skip_count = (analytics.skip_count or 0) + 1
            
        elif event_type == "replay":
            analytics.replay_count = (analytics.replay_count or 0) + 1
            
        elif event_type == "speed_change":
            speed_changes = analytics.speed_changes or []
            speed_changes.append({
                "timestamp": current_time.isoformat(),
                "new_speed": event_data.get("speed", 1.0),
                "position_seconds": event_data.get("position", 0)
            })
            analytics.speed_changes = speed_changes
            
        elif event_type == "progress":
            position = event_data.get("position_seconds", 0)
            analytics.played_duration_seconds = max(
                analytics.played_duration_seconds or 0,
                position
            )
            
            if analytics.total_duration_seconds:
                analytics.completion_percentage = (
                    analytics.played_duration_seconds / analytics.total_duration_seconds
                ) * 100
            
        elif event_type == "complete":
            analytics.ended_at = current_time
            analytics.completion_percentage = 100.0
            
            if analytics.started_at:
                session_duration = (current_time - analytics.started_at).total_seconds()
                analytics.average_session_duration = int(session_duration)
        
        elif event_type == "drop_off":
            drop_off_points = analytics.drop_off_points or []
            drop_off_points.append({
                "timestamp": current_time.isoformat(),
                "position_seconds": event_data.get("position", 0),
                "reason": event_data.get("reason", "unknown")
            })
            analytics.drop_off_points = drop_off_points
    
    async def _process_ar_event(
        self,
        analytics: ARUsageAnalytics,
        event_type: str,
        event_data: Dict[str, Any]
    ) -> None:
        """Process AR usage event and update analytics."""
        
        current_time = datetime.utcnow()
        
        if event_type == "start":
            analytics.started_at = current_time
            analytics.loading_time_seconds = event_data.get("loading_time", 0.0)
            
        elif event_type == "placement_success":
            analytics.successful_placements = (analytics.successful_placements or 0) + 1
            
        elif event_type == "placement_failed":
            analytics.failed_placements = (analytics.failed_placements or 0) + 1
            
        elif event_type == "interaction":
            analytics.interactions_count = (analytics.interactions_count or 0) + 1
            
        elif event_type == "performance_update":
            analytics.average_fps = event_data.get("fps", 0.0)
            analytics.tracking_quality = event_data.get("tracking_quality", 0.0)
            
        elif event_type == "complete":
            analytics.ended_at = current_time
            analytics.completion_percentage = 100.0
            analytics.user_rating = event_data.get("rating", 0)
            analytics.shared_experience = event_data.get("shared", False)
            
            if analytics.started_at:
                session_duration = (current_time - analytics.started_at).total_seconds()
                analytics.session_duration_seconds = int(session_duration)
        
        elif event_type == "environmental_update":
            analytics.lighting_conditions = event_data.get("lighting", "normal")
            analytics.surface_quality = event_data.get("surface_quality", "good")
    
    async def _update_audio_guide_stats(
        self,
        db: Session,
        audio_guide_id: str,
        event_type: str
    ) -> None:
        """Update aggregated audio guide statistics."""
        
        audio_guide = db.query(AudioGuide).filter(
            AudioGuide.id == audio_guide_id
        ).first()
        
        if not audio_guide:
            return
        
        if event_type == "start":
            audio_guide.play_count = (audio_guide.play_count or 0) + 1
            
        elif event_type == "complete":
            # Update completion rate
            total_sessions = db.query(AudioPlaybackAnalytics).filter(
                AudioPlaybackAnalytics.audio_guide_id == audio_guide_id
            ).count()
            
            completed_sessions = db.query(AudioPlaybackAnalytics).filter(
                and_(
                    AudioPlaybackAnalytics.audio_guide_id == audio_guide_id,
                    AudioPlaybackAnalytics.completion_percentage >= 90
                )
            ).count()
            
            if total_sessions > 0:
                audio_guide.completion_rate = (completed_sessions / total_sessions) * 100
            
            # Update average listening duration
            avg_duration = db.query(
                func.avg(AudioPlaybackAnalytics.played_duration_seconds)
            ).filter(
                AudioPlaybackAnalytics.audio_guide_id == audio_guide_id
            ).scalar()
            
            if avg_duration:
                audio_guide.average_listening_duration = int(avg_duration)
    
    async def _update_ar_experience_stats(
        self,
        db: Session,
        ar_experience_id: str,
        event_type: str
    ) -> None:
        """Update aggregated AR experience statistics."""
        
        ar_experience = db.query(ARExperience).filter(
            ARExperience.id == ar_experience_id
        ).first()
        
        if not ar_experience:
            return
        
        if event_type == "start":
            ar_experience.usage_count = (ar_experience.usage_count or 0) + 1
            
        elif event_type == "complete":
            # Update completion rate
            total_sessions = db.query(ARUsageAnalytics).filter(
                ARUsageAnalytics.ar_experience_id == ar_experience_id
            ).count()
            
            completed_sessions = db.query(ARUsageAnalytics).filter(
                and_(
                    ARUsageAnalytics.ar_experience_id == ar_experience_id,
                    ARUsageAnalytics.completion_percentage >= 80
                )
            ).count()
            
            if total_sessions > 0:
                ar_experience.completion_rate = (completed_sessions / total_sessions) * 100
            
            # Update average session duration
            avg_duration = db.query(
                func.avg(ARUsageAnalytics.session_duration_seconds)
            ).filter(
                ARUsageAnalytics.ar_experience_id == ar_experience_id
            ).scalar()
            
            if avg_duration:
                ar_experience.average_session_duration = int(avg_duration)
            
            # Update performance rating
            avg_rating = db.query(
                func.avg(ARUsageAnalytics.user_rating)
            ).filter(
                and_(
                    ARUsageAnalytics.ar_experience_id == ar_experience_id,
                    ARUsageAnalytics.user_rating > 0
                )
            ).scalar()
            
            if avg_rating:
                ar_experience.performance_rating = float(avg_rating)
    
    async def get_content_analytics(
        self,
        content_type: str,
        content_id: str,
        time_range: str = "7d"
    ) -> Dict[str, Any]:
        """
        Get analytics for specific content.
        
        Args:
            content_type: Type of content (audio_guide, ar_experience)
            content_id: Content identifier
            time_range: Time range (1d, 7d, 30d, 90d)
            
        Returns:
            Dict with analytics data
        """
        try:
            db = next(get_db())
            
            # Calculate time range
            end_date = datetime.utcnow()
            if time_range == "1d":
                start_date = end_date - timedelta(days=1)
            elif time_range == "7d":
                start_date = end_date - timedelta(days=7)
            elif time_range == "30d":
                start_date = end_date - timedelta(days=30)
            elif time_range == "90d":
                start_date = end_date - timedelta(days=90)
            else:
                start_date = end_date - timedelta(days=7)
            
            if content_type == "audio_guide":
                return await self._get_audio_guide_analytics(
                    db, content_id, start_date, end_date
                )
            elif content_type == "ar_experience":
                return await self._get_ar_experience_analytics(
                    db, content_id, start_date, end_date
                )
            else:
                return {"success": False, "error": "Invalid content type"}
                
        except Exception as e:
            logger.error(f"Error getting content analytics: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def _get_audio_guide_analytics(
        self,
        db: Session,
        audio_guide_id: str,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Get analytics for audio guide."""
        
        # Base query
        base_query = db.query(AudioPlaybackAnalytics).filter(
            and_(
                AudioPlaybackAnalytics.audio_guide_id == audio_guide_id,
                AudioPlaybackAnalytics.started_at >= start_date,
                AudioPlaybackAnalytics.started_at <= end_date
            )
        )
        
        # Basic metrics
        total_sessions = base_query.count()
        total_users = base_query.filter(
            AudioPlaybackAnalytics.user_id.isnot(None)
        ).distinct(AudioPlaybackAnalytics.user_id).count()
        
        # Completion metrics
        completed_sessions = base_query.filter(
            AudioPlaybackAnalytics.completion_percentage >= 90
        ).count()
        completion_rate = (completed_sessions / total_sessions * 100) if total_sessions > 0 else 0
        
        # Duration metrics
        avg_duration = base_query.with_entities(
            func.avg(AudioPlaybackAnalytics.average_session_duration)
        ).scalar() or 0
        
        # Download metrics
        download_sessions = db.query(AudioDownloadSession).filter(
            and_(
                AudioDownloadSession.audio_guide_id == audio_guide_id,
                AudioDownloadSession.started_at >= start_date,
                AudioDownloadSession.started_at <= end_date
            )
        ).count()
        
        # Daily breakdown
        daily_stats = db.query(
            func.date(AudioPlaybackAnalytics.started_at).label('date'),
            func.count(AudioPlaybackAnalytics.id).label('sessions'),
            func.count(func.distinct(AudioPlaybackAnalytics.user_id)).label('unique_users')
        ).filter(
            and_(
                AudioPlaybackAnalytics.audio_guide_id == audio_guide_id,
                AudioPlaybackAnalytics.started_at >= start_date,
                AudioPlaybackAnalytics.started_at <= end_date
            )
        ).group_by(func.date(AudioPlaybackAnalytics.started_at)).all()
        
        return {
            "success": True,
            "content_type": "audio_guide",
            "content_id": audio_guide_id,
            "time_range": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            },
            "metrics": {
                "total_sessions": total_sessions,
                "total_users": total_users,
                "total_downloads": download_sessions,
                "completion_rate": round(completion_rate, 2),
                "average_session_duration": round(avg_duration, 2),
                "user_retention_rate": 0.0  # Would require more complex calculation
            },
            "daily_breakdown": [
                {
                    "date": stat.date.isoformat(),
                    "sessions": stat.sessions,
                    "unique_users": stat.unique_users
                }
                for stat in daily_stats
            ]
        }
    
    async def _get_ar_experience_analytics(
        self,
        db: Session,
        ar_experience_id: str,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Get analytics for AR experience."""
        
        # Base query
        base_query = db.query(ARUsageAnalytics).filter(
            and_(
                ARUsageAnalytics.ar_experience_id == ar_experience_id,
                ARUsageAnalytics.started_at >= start_date,
                ARUsageAnalytics.started_at <= end_date
            )
        )
        
        # Basic metrics
        total_sessions = base_query.count()
        total_users = base_query.filter(
            ARUsageAnalytics.user_id.isnot(None)
        ).distinct(ARUsageAnalytics.user_id).count()
        
        # Performance metrics
        avg_fps = base_query.with_entities(
            func.avg(ARUsageAnalytics.average_fps)
        ).scalar() or 0
        
        avg_load_time = base_query.with_entities(
            func.avg(ARUsageAnalytics.loading_time_seconds)
        ).scalar() or 0
        
        # Interaction metrics
        total_interactions = base_query.with_entities(
            func.sum(ARUsageAnalytics.interactions_count)
        ).scalar() or 0
        
        successful_placements = base_query.with_entities(
            func.sum(ARUsageAnalytics.successful_placements)
        ).scalar() or 0
        
        failed_placements = base_query.with_entities(
            func.sum(ARUsageAnalytics.failed_placements)
        ).scalar() or 0
        
        placement_success_rate = (
            successful_placements / (successful_placements + failed_placements) * 100
        ) if (successful_placements + failed_placements) > 0 else 0
        
        # User satisfaction
        avg_rating = base_query.filter(
            ARUsageAnalytics.user_rating > 0
        ).with_entities(
            func.avg(ARUsageAnalytics.user_rating)
        ).scalar() or 0
        
        return {
            "success": True,
            "content_type": "ar_experience",
            "content_id": ar_experience_id,
            "time_range": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            },
            "metrics": {
                "total_sessions": total_sessions,
                "total_users": total_users,
                "total_interactions": total_interactions,
                "placement_success_rate": round(placement_success_rate, 2),
                "average_fps": round(avg_fps, 2),
                "average_load_time": round(avg_load_time, 2),
                "user_satisfaction_score": round(avg_rating, 2)
            },
            "performance": {
                "successful_placements": successful_placements,
                "failed_placements": failed_placements,
                "average_fps": round(avg_fps, 2),
                "average_load_time_seconds": round(avg_load_time, 2)
            }
        }
    
    async def get_poi_analytics_summary(
        self,
        poi_id: str,
        time_range: str = "30d"
    ) -> Dict[str, Any]:
        """Get comprehensive analytics summary for a POI."""
        try:
            db = next(get_db())
            
            # Get all audio guides for POI
            audio_guides = db.query(AudioGuide).filter(
                and_(
                    AudioGuide.poi_id == poi_id,
                    AudioGuide.is_active == True
                )
            ).all()
            
            # Get all AR experiences for POI
            ar_experiences = db.query(ARExperience).filter(
                and_(
                    ARExperience.poi_id == poi_id,
                    ARExperience.is_active == True
                )
            ).all()
            
            # Aggregate analytics for all content
            total_audio_sessions = 0
            total_ar_sessions = 0
            total_users = set()
            
            for audio_guide in audio_guides:
                audio_analytics = await self.get_content_analytics(
                    "audio_guide", str(audio_guide.id), time_range
                )
                if audio_analytics["success"]:
                    total_audio_sessions += audio_analytics["metrics"]["total_sessions"]
                    # Would need to track user IDs to properly aggregate unique users
            
            for ar_experience in ar_experiences:
                ar_analytics = await self.get_content_analytics(
                    "ar_experience", str(ar_experience.id), time_range
                )
                if ar_analytics["success"]:
                    total_ar_sessions += ar_analytics["metrics"]["total_sessions"]
            
            return {
                "success": True,
                "poi_id": poi_id,
                "time_range": time_range,
                "summary": {
                    "total_audio_guides": len(audio_guides),
                    "total_ar_experiences": len(ar_experiences),
                    "total_audio_sessions": total_audio_sessions,
                    "total_ar_sessions": total_ar_sessions,
                    "total_sessions": total_audio_sessions + total_ar_sessions
                },
                "content_breakdown": {
                    "audio_guides": [
                        {
                            "id": str(ag.id),
                            "title": ag.title,
                            "language_code": ag.language_code,
                            "play_count": ag.play_count,
                            "completion_rate": ag.completion_rate
                        }
                        for ag in audio_guides
                    ],
                    "ar_experiences": [
                        {
                            "id": str(ar.id),
                            "name": ar.name,
                            "usage_count": ar.usage_count,
                            "completion_rate": ar.completion_rate,
                            "performance_rating": ar.performance_rating
                        }
                        for ar in ar_experiences
                    ]
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting POI analytics summary: {str(e)}")
            return {"success": False, "error": str(e)}