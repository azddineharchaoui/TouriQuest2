"""
Content Management API endpoints for POI media and multi-language content
"""

from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Query, Path, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.repositories.content_repository import ContentRepository
from app.schemas import (
    POIImage, POIImageCreate, AudioGuide, AudioGuideCreate,
    ARExperience, ARExperienceCreate, SuccessResponse,
    POITranslation, LocationPoint
)
from app.services.media_service import MediaService

router = APIRouter()


# Image management endpoints
@router.post("/{poi_id}/images", response_model=POIImage)
async def upload_poi_image(
    poi_id: UUID = Path(..., description="POI unique identifier"),
    file: UploadFile = File(...),
    alt_text: Optional[str] = Form(None),
    caption: Optional[str] = Form(None),
    is_primary: bool = Form(False),
    user_id: UUID = Query(..., description="User ID"),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload an image for a POI
    """
    content_repo = ContentRepository(db)
    media_service = MediaService()
    
    # Validate file type
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image"
        )
    
    # Process and upload image in background
    background_tasks.add_task(
        media_service.process_and_upload_image,
        file, poi_id, alt_text, caption, is_primary, user_id
    )
    
    # Create image record
    image_data = POIImageCreate(
        url="processing",  # Will be updated when processing is complete
        alt_text=alt_text,
        caption=caption,
        is_primary=is_primary
    )
    
    image = await content_repo.create_poi_image(poi_id, image_data, user_id)
    return image


@router.get("/{poi_id}/images", response_model=List[POIImage])
async def get_poi_images(
    poi_id: UUID = Path(..., description="POI unique identifier"),
    limit: int = Query(50, gt=0, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all images for a POI
    """
    content_repo = ContentRepository(db)
    images = await content_repo.get_poi_images(poi_id, limit=limit, offset=offset)
    return images


@router.put("/images/{image_id}", response_model=POIImage)
async def update_poi_image(
    image_id: UUID = Path(..., description="Image unique identifier"),
    alt_text: Optional[str] = Form(None),
    caption: Optional[str] = Form(None),
    is_primary: Optional[bool] = Form(None),
    user_id: UUID = Query(..., description="User ID"),
    db: AsyncSession = Depends(get_db)
):
    """
    Update POI image metadata
    """
    content_repo = ContentRepository(db)
    
    update_data = {}
    if alt_text is not None:
        update_data['alt_text'] = alt_text
    if caption is not None:
        update_data['caption'] = caption
    if is_primary is not None:
        update_data['is_primary'] = is_primary
    
    image = await content_repo.update_poi_image(image_id, update_data)
    if not image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image not found"
        )
    
    return image


@router.delete("/images/{image_id}", response_model=SuccessResponse)
async def delete_poi_image(
    image_id: UUID = Path(..., description="Image unique identifier"),
    user_id: UUID = Query(..., description="User ID"),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a POI image
    """
    content_repo = ContentRepository(db)
    media_service = MediaService()
    
    # Get image details before deletion
    image = await content_repo.get_image_by_id(image_id)
    if not image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image not found"
        )
    
    # Delete from database
    success = await content_repo.delete_poi_image(image_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to delete image"
        )
    
    # Delete from storage in background
    background_tasks.add_task(media_service.delete_image_from_storage, image.url)
    
    return SuccessResponse(message="Image deleted successfully")


# Audio guide management endpoints
@router.post("/{poi_id}/audio-guides", response_model=AudioGuide)
async def create_audio_guide(
    poi_id: UUID = Path(..., description="POI unique identifier"),
    user_id: UUID = Query(..., description="User ID"),
    audio_guide_data: AudioGuideCreate = ...,
    db: AsyncSession = Depends(get_db)
):
    """
    Create an audio guide for a POI
    """
    content_repo = ContentRepository(db)
    
    audio_guide = await content_repo.create_audio_guide(poi_id, audio_guide_data, user_id)
    if not audio_guide:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create audio guide"
        )
    
    return audio_guide


@router.get("/{poi_id}/audio-guides", response_model=List[AudioGuide])
async def get_poi_audio_guides(
    poi_id: UUID = Path(..., description="POI unique identifier"),
    language_code: Optional[str] = Query(None, description="Filter by language code"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get audio guides for a POI
    """
    content_repo = ContentRepository(db)
    audio_guides = await content_repo.get_poi_audio_guides(poi_id, language_code)
    return audio_guides


@router.post("/audio-guides/{guide_id}/play", response_model=SuccessResponse)
async def record_audio_guide_play(
    guide_id: UUID = Path(..., description="Audio guide unique identifier"),
    user_id: Optional[UUID] = Query(None, description="User ID"),
    session_id: Optional[str] = Query(None, description="Session ID"),
    db: AsyncSession = Depends(get_db)
):
    """
    Record audio guide play event for analytics
    """
    content_repo = ContentRepository(db)
    success = await content_repo.record_audio_play(guide_id, user_id, session_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audio guide not found"
        )
    
    return SuccessResponse(message="Play event recorded")


# AR experience management endpoints
@router.post("/{poi_id}/ar-experiences", response_model=ARExperience)
async def create_ar_experience(
    poi_id: UUID = Path(..., description="POI unique identifier"),
    user_id: UUID = Query(..., description="User ID"),
    ar_data: ARExperienceCreate = ...,
    db: AsyncSession = Depends(get_db)
):
    """
    Create an AR experience for a POI
    """
    content_repo = ContentRepository(db)
    
    ar_experience = await content_repo.create_ar_experience(poi_id, ar_data, user_id)
    if not ar_experience:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create AR experience"
        )
    
    return ar_experience


@router.get("/{poi_id}/ar-experiences", response_model=List[ARExperience])
async def get_poi_ar_experiences(
    poi_id: UUID = Path(..., description="POI unique identifier"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get AR experiences for a POI
    """
    content_repo = ContentRepository(db)
    ar_experiences = await content_repo.get_poi_ar_experiences(poi_id)
    return ar_experiences


@router.post("/ar-experiences/{experience_id}/use", response_model=SuccessResponse)
async def record_ar_experience_use(
    experience_id: UUID = Path(..., description="AR experience unique identifier"),
    user_id: Optional[UUID] = Query(None, description="User ID"),
    session_id: Optional[str] = Query(None, description="Session ID"),
    duration_seconds: Optional[int] = Query(None, description="Experience duration"),
    db: AsyncSession = Depends(get_db)
):
    """
    Record AR experience usage for analytics
    """
    content_repo = ContentRepository(db)
    success = await content_repo.record_ar_usage(experience_id, user_id, session_id, duration_seconds)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="AR experience not found"
        )
    
    return SuccessResponse(message="Usage event recorded")


# Multi-language content endpoints
@router.post("/{poi_id}/translations", response_model=Dict[str, Any])
async def create_poi_translation(
    poi_id: UUID = Path(..., description="POI unique identifier"),
    language_code: str = Query(..., description="Language code (e.g., 'en', 'fr', 'es')"),
    name: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    short_description: Optional[str] = Form(None),
    visitor_tips: Optional[str] = Form(None),
    historical_info: Optional[str] = Form(None),
    user_id: UUID = Query(..., description="User ID"),
    db: AsyncSession = Depends(get_db)
):
    """
    Create or update translation for a POI
    """
    content_repo = ContentRepository(db)
    
    translation_data = {
        "language_code": language_code,
        "name": name,
        "description": description,
        "short_description": short_description,
        "visitor_tips": visitor_tips,
        "historical_info": historical_info
    }
    
    # Remove None values
    translation_data = {k: v for k, v in translation_data.items() if v is not None}
    
    translation = await content_repo.create_or_update_translation(poi_id, translation_data)
    if not translation:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create translation"
        )
    
    return {"message": "Translation created/updated successfully", "translation": translation}


@router.get("/{poi_id}/translations", response_model=List[Dict[str, Any]])
async def get_poi_translations(
    poi_id: UUID = Path(..., description="POI unique identifier"),
    language_code: Optional[str] = Query(None, description="Specific language code"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get translations for a POI
    """
    content_repo = ContentRepository(db)
    translations = await content_repo.get_poi_translations(poi_id, language_code)
    return translations


@router.get("/{poi_id}/content", response_model=Dict[str, Any])
async def get_poi_localized_content(
    poi_id: UUID = Path(..., description="POI unique identifier"),
    language_code: str = Query("en", description="Preferred language code"),
    fallback_language: str = Query("en", description="Fallback language if preferred not available"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get localized content for a POI with fallback support
    """
    content_repo = ContentRepository(db)
    content = await content_repo.get_localized_content(poi_id, language_code, fallback_language)
    
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="POI or content not found"
        )
    
    return content


# Content moderation endpoints
@router.post("/content/{content_type}/{content_id}/moderate", response_model=SuccessResponse)
async def moderate_content(
    content_type: str = Path(..., description="Type of content (image, audio, ar, translation)"),
    content_id: UUID = Path(..., description="Content unique identifier"),
    action: str = Query(..., description="Moderation action: approve, reject, flag"),
    moderator_id: UUID = Query(..., description="Moderator user ID"),
    notes: Optional[str] = Query(None, description="Moderation notes"),
    db: AsyncSession = Depends(get_db)
):
    """
    Moderate user-generated content
    """
    content_repo = ContentRepository(db)
    
    success = await content_repo.moderate_content(
        content_type, content_id, action, moderator_id, notes
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to moderate content"
        )
    
    return SuccessResponse(message=f"Content {action}ed successfully")


@router.get("/content/pending-moderation")
async def get_content_pending_moderation(
    content_type: Optional[str] = Query(None, description="Filter by content type"),
    limit: int = Query(50, gt=0, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """
    Get content pending moderation
    """
    content_repo = ContentRepository(db)
    pending_content = await content_repo.get_pending_moderation_content(
        content_type, limit=limit, offset=offset
    )
    return pending_content


# Content analytics endpoints
@router.get("/{poi_id}/content/analytics")
async def get_poi_content_analytics(
    poi_id: UUID = Path(..., description="POI unique identifier"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get analytics for POI content usage
    """
    content_repo = ContentRepository(db)
    analytics = await content_repo.get_content_analytics(poi_id)
    return analytics