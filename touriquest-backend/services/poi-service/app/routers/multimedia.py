"""
API router for multimedia content endpoints.
Handles audio guides, AR experiences, content delivery, and analytics.
"""

import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import get_settings
from app.services.multimedia import (
    ContentManager, CDNManager, AnalyticsProcessor
)
from app.models import AudioGuide, ARExperience, POI

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/multimedia", tags=["multimedia"])

# Initialize services
content_manager = ContentManager()
cdn_manager = CDNManager()
analytics_processor = AnalyticsProcessor()


@router.post("/audio-guides/upload")
async def upload_audio_guide(
    poi_id: str = Form(...),
    language_code: str = Form(...),
    title: str = Form(...),
    description: Optional[str] = Form(None),
    narrator_name: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload and process an audio guide file.
    
    Args:
        poi_id: POI identifier
        language_code: Language code (e.g., 'en', 'fr', 'es')
        title: Audio guide title
        description: Optional description
        narrator_name: Optional narrator name
        file: Audio file to upload
        
    Returns:
        Upload result with processing status
    """
    try:
        # Verify POI exists
        poi = db.query(POI).filter(POI.id == poi_id).first()
        if not poi:
            raise HTTPException(status_code=404, detail="POI not found")
        
        # Check for existing audio guide in same language
        existing_guide = db.query(AudioGuide).filter(
            AudioGuide.poi_id == poi_id,
            AudioGuide.language_code == language_code,
            AudioGuide.is_active == True
        ).first()
        
        if existing_guide:
            raise HTTPException(
                status_code=409,
                detail=f"Audio guide already exists for language {language_code}"
            )
        
        # Upload and process
        result = await content_manager.upload_audio_guide(
            file=file,
            poi_id=poi_id,
            language_code=language_code,
            title=title,
            description=description,
            narrator_name=narrator_name
        )
        
        if result.success:
            return {
                "success": True,
                "message": "Audio guide uploaded successfully",
                "media_file_id": result.media_file_id,
                "processing_status": result.processing_status,
                "file_size_bytes": result.file_size_bytes
            }
        else:
            raise HTTPException(status_code=400, detail=result.error_message)
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading audio guide: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/ar-experiences/upload")
async def upload_ar_experience(
    poi_id: str = Form(...),
    name: str = Form(...),
    description: Optional[str] = Form(None),
    instructions: Optional[str] = Form(None),
    trigger_radius: float = Form(50.0),
    optimization_level: str = Form("medium"),
    model_file: UploadFile = File(...),
    texture_files: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload and process AR experience files.
    
    Args:
        poi_id: POI identifier
        name: AR experience name
        description: Optional description
        instructions: Optional user instructions
        trigger_radius: Trigger radius in meters
        optimization_level: Processing optimization (low, medium, high)
        model_file: 3D model file
        texture_files: List of texture files
        
    Returns:
        Upload result with processing status
    """
    try:
        # Verify POI exists
        poi = db.query(POI).filter(POI.id == poi_id).first()
        if not poi:
            raise HTTPException(status_code=404, detail="POI not found")
        
        # Validate optimization level
        if optimization_level not in ["low", "medium", "high"]:
            raise HTTPException(
                status_code=400,
                detail="Optimization level must be 'low', 'medium', or 'high'"
            )
        
        # Upload and process
        result = await content_manager.upload_ar_experience(
            model_file=model_file,
            texture_files=texture_files,
            poi_id=poi_id,
            name=name,
            description=description,
            instructions=instructions,
            trigger_radius=trigger_radius,
            optimization_level=optimization_level
        )
        
        if result.success:
            return {
                "success": True,
                "message": "AR experience uploaded successfully",
                "media_file_id": result.media_file_id,
                "processing_status": result.processing_status,
                "file_size_bytes": result.file_size_bytes
            }
        else:
            raise HTTPException(status_code=400, detail=result.error_message)
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading AR experience: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/processing-status/{media_file_id}")
async def get_processing_status(media_file_id: str):
    """
    Get the processing status of uploaded content.
    
    Args:
        media_file_id: Media file identifier
        
    Returns:
        Processing status and details
    """
    try:
        result = await content_manager.get_content_processing_status(media_file_id)
        
        if result["success"]:
            return result
        else:
            raise HTTPException(status_code=404, detail=result["error"])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting processing status: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/pois/{poi_id}/content")
async def list_poi_multimedia_content(
    poi_id: str,
    db: Session = Depends(get_db)
):
    """
    List all multimedia content for a POI.
    
    Args:
        poi_id: POI identifier
        
    Returns:
        List of audio guides and AR experiences
    """
    try:
        # Verify POI exists
        poi = db.query(POI).filter(POI.id == poi_id).first()
        if not poi:
            raise HTTPException(status_code=404, detail="POI not found")
        
        result = await content_manager.list_poi_multimedia_content(poi_id)
        
        if result["success"]:
            return result
        else:
            raise HTTPException(status_code=500, detail=result["error"])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing POI multimedia content: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/audio-guides/{audio_guide_id}")
async def get_audio_guide(
    audio_guide_id: str,
    include_cdn_info: bool = Query(False),
    user_location_lat: Optional[float] = Query(None),
    user_location_lon: Optional[float] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Get audio guide details with optional CDN delivery information.
    
    Args:
        audio_guide_id: Audio guide identifier
        include_cdn_info: Include CDN delivery optimization info
        user_location_lat: Optional user latitude for optimization
        user_location_lon: Optional user longitude for optimization
        
    Returns:
        Audio guide details and delivery information
    """
    try:
        audio_guide = db.query(AudioGuide).filter(
            AudioGuide.id == audio_guide_id,
            AudioGuide.is_active == True
        ).first()
        
        if not audio_guide:
            raise HTTPException(status_code=404, detail="Audio guide not found")
        
        response_data = {
            "id": str(audio_guide.id),
            "poi_id": str(audio_guide.poi_id),
            "language_code": audio_guide.language_code,
            "title": audio_guide.title,
            "description": audio_guide.description,
            "duration_seconds": audio_guide.duration_seconds,
            "file_size_bytes": audio_guide.file_size_bytes,
            "narrator_name": audio_guide.narrator_name,
            "narrator_bio": audio_guide.narrator_bio,
            "transcript": audio_guide.transcript,
            "segments_metadata": audio_guide.segments_metadata,
            "download_count": audio_guide.download_count,
            "play_count": audio_guide.play_count,
            "completion_rate": audio_guide.completion_rate,
            "version": audio_guide.version,
            "has_audio_description": audio_guide.has_audio_description,
            "has_sign_language": audio_guide.has_sign_language,
            "created_at": audio_guide.created_at.isoformat() if audio_guide.created_at else None
        }
        
        # Add CDN delivery information if requested
        if include_cdn_info and audio_guide.processed_audio_url:
            user_location = None
            if user_location_lat is not None and user_location_lon is not None:
                user_location = {"lat": user_location_lat, "lon": user_location_lon}
            
            delivery_info = await cdn_manager.generate_delivery_info(
                cdn_url=audio_guide.processed_audio_url,
                file_size_bytes=audio_guide.file_size_bytes or 0,
                media_type="audio",
                user_location=user_location
            )
            
            response_data["delivery_info"] = {
                "primary_url": delivery_info.primary_url,
                "backup_urls": delivery_info.backup_urls,
                "cache_settings": delivery_info.cache_settings,
                "estimated_download_time_seconds": delivery_info.estimated_download_time
            }
        
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting audio guide: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/ar-experiences/{ar_experience_id}")
async def get_ar_experience(
    ar_experience_id: str,
    include_compatibility: bool = Query(False),
    device_type: Optional[str] = Query(None),
    os_version: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Get AR experience details with optional compatibility information.
    
    Args:
        ar_experience_id: AR experience identifier
        include_compatibility: Include device compatibility info
        device_type: Optional device type for compatibility check
        os_version: Optional OS version for compatibility check
        
    Returns:
        AR experience details and compatibility information
    """
    try:
        ar_experience = db.query(ARExperience).filter(
            ARExperience.id == ar_experience_id,
            ARExperience.is_active == True
        ).first()
        
        if not ar_experience:
            raise HTTPException(status_code=404, detail="AR experience not found")
        
        response_data = {
            "id": str(ar_experience.id),
            "poi_id": str(ar_experience.poi_id),
            "name": ar_experience.name,
            "description": ar_experience.description,
            "instructions": ar_experience.instructions,
            "model_url": ar_experience.model_url,
            "texture_urls": ar_experience.texture_urls,
            "model_format": ar_experience.model_format,
            "polygon_count": ar_experience.polygon_count,
            "total_file_size_mb": ar_experience.total_file_size_mb,
            "optimization_level": ar_experience.optimization_level,
            "trigger_radius_meters": ar_experience.trigger_radius_meters,
            "estimated_duration_seconds": ar_experience.estimated_duration_seconds,
            "interaction_types": ar_experience.interaction_types,
            "usage_count": ar_experience.usage_count,
            "completion_rate": ar_experience.completion_rate,
            "performance_rating": ar_experience.performance_rating,
            "version": ar_experience.version,
            "created_at": ar_experience.created_at.isoformat() if ar_experience.created_at else None
        }
        
        # Add compatibility information if requested
        if include_compatibility:
            compatibility_info = {
                "min_ios_version": ar_experience.min_ios_version,
                "min_android_version": ar_experience.min_android_version,
                "requires_lidar": ar_experience.requires_lidar,
                "requires_depth_camera": ar_experience.requires_depth_camera,
                "min_ram_mb": ar_experience.min_ram_mb,
                "supports_occlusion": ar_experience.supports_occlusion
            }
            
            # Check specific device compatibility if provided
            if device_type and os_version:
                compatibility_info["device_compatible"] = await _check_device_compatibility(
                    ar_experience, device_type, os_version
                )
            
            response_data["compatibility"] = compatibility_info
        
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting AR experience: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/analytics/audio/{audio_guide_id}/track")
async def track_audio_playback(
    audio_guide_id: str,
    session_id: str = Form(...),
    event_type: str = Form(...),
    event_data: Dict[str, Any] = Form(...),
    user_id: Optional[str] = Form(None),
    user_lat: Optional[float] = Form(None),
    user_lon: Optional[float] = Form(None)
):
    """
    Track audio playback event for analytics.
    
    Args:
        audio_guide_id: Audio guide identifier
        session_id: Playback session identifier
        event_type: Event type (start, pause, resume, complete, stop)
        event_data: Event-specific data
        user_id: Optional user identifier
        user_lat: Optional user latitude
        user_lon: Optional user longitude
        
    Returns:
        Tracking result
    """
    try:
        user_location = None
        if user_lat is not None and user_lon is not None:
            user_location = (user_lat, user_lon)
        
        result = await analytics_processor.track_audio_playback_event(
            audio_guide_id=audio_guide_id,
            user_id=user_id,
            session_id=session_id,
            event_type=event_type,
            event_data=event_data,
            user_location=user_location
        )
        
        if result["success"]:
            return result
        else:
            raise HTTPException(status_code=400, detail=result["error"])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error tracking audio playback: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/analytics/ar/{ar_experience_id}/track")
async def track_ar_usage(
    ar_experience_id: str,
    session_id: str = Form(...),
    event_type: str = Form(...),
    event_data: Dict[str, Any] = Form(...),
    user_id: Optional[str] = Form(None),
    user_lat: Optional[float] = Form(None),
    user_lon: Optional[float] = Form(None)
):
    """
    Track AR usage event for analytics.
    
    Args:
        ar_experience_id: AR experience identifier
        session_id: AR session identifier
        event_type: Event type (start, placement, interaction, complete, error)
        event_data: Event-specific data
        user_id: Optional user identifier
        user_lat: Optional user latitude
        user_lon: Optional user longitude
        
    Returns:
        Tracking result
    """
    try:
        user_location = None
        if user_lat is not None and user_lon is not None:
            user_location = (user_lat, user_lon)
        
        result = await analytics_processor.track_ar_usage_event(
            ar_experience_id=ar_experience_id,
            user_id=user_id,
            session_id=session_id,
            event_type=event_type,
            event_data=event_data,
            user_location=user_location
        )
        
        if result["success"]:
            return result
        else:
            raise HTTPException(status_code=400, detail=result["error"])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error tracking AR usage: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/analytics/{content_type}/{content_id}")
async def get_content_analytics(
    content_type: str,
    content_id: str,
    time_range: str = Query("7d", regex="^(1d|7d|30d|90d)$")
):
    """
    Get analytics for specific content.
    
    Args:
        content_type: Content type (audio_guide, ar_experience)
        content_id: Content identifier
        time_range: Time range (1d, 7d, 30d, 90d)
        
    Returns:
        Analytics data
    """
    try:
        if content_type not in ["audio_guide", "ar_experience"]:
            raise HTTPException(
                status_code=400,
                detail="Content type must be 'audio_guide' or 'ar_experience'"
            )
        
        result = await analytics_processor.get_content_analytics(
            content_type=content_type,
            content_id=content_id,
            time_range=time_range
        )
        
        if result["success"]:
            return result
        else:
            raise HTTPException(status_code=404, detail=result["error"])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting content analytics: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/analytics/pois/{poi_id}/summary")
async def get_poi_analytics_summary(
    poi_id: str,
    time_range: str = Query("30d", regex="^(1d|7d|30d|90d)$"),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive analytics summary for a POI.
    
    Args:
        poi_id: POI identifier
        time_range: Time range (1d, 7d, 30d, 90d)
        
    Returns:
        POI analytics summary
    """
    try:
        # Verify POI exists
        poi = db.query(POI).filter(POI.id == poi_id).first()
        if not poi:
            raise HTTPException(status_code=404, detail="POI not found")
        
        result = await analytics_processor.get_poi_analytics_summary(
            poi_id=poi_id,
            time_range=time_range
        )
        
        if result["success"]:
            return result
        else:
            raise HTTPException(status_code=500, detail=result["error"])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting POI analytics summary: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/{content_type}/{content_id}")
async def delete_multimedia_content(
    content_type: str,
    content_id: str,
    user_id: Optional[str] = Query(None)
):
    """
    Delete multimedia content.
    
    Args:
        content_type: Content type (audio_guide, ar_experience)
        content_id: Content identifier
        user_id: Optional user identifier
        
    Returns:
        Deletion result
    """
    try:
        if content_type not in ["audio_guide", "ar_experience"]:
            raise HTTPException(
                status_code=400,
                detail="Content type must be 'audio_guide' or 'ar_experience'"
            )
        
        result = await content_manager.delete_multimedia_content(
            content_type=content_type,
            content_id=content_id,
            user_id=user_id
        )
        
        if result["success"]:
            return result
        else:
            raise HTTPException(status_code=404, detail=result["error"])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting multimedia content: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


async def _check_device_compatibility(
    ar_experience: ARExperience,
    device_type: str,
    os_version: str
) -> bool:
    """Check if device is compatible with AR experience."""
    try:
        # Simple version comparison - would be more sophisticated in production
        if device_type.lower() == "ios":
            min_version = ar_experience.min_ios_version
            return os_version >= min_version if min_version else True
        elif device_type.lower() == "android":
            min_version = ar_experience.min_android_version
            return os_version >= min_version if min_version else True
        else:
            return False
    except Exception:
        return False