"""
Media Management API Routes
Upload, processing, moderation, and search endpoints
"""
import os
import mimetypes
from typing import List, Optional, Dict, Any
from datetime import datetime
from uuid import UUID

from fastapi import (
    APIRouter, 
    Depends, 
    HTTPException, 
    UploadFile, 
    File, 
    Query,
    status,
    BackgroundTasks
)
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from ..core.database import get_db
from ..core.auth import get_current_user
from ..core.config import settings
from ..schemas.media_schemas import (
    MediaUploadRequest, MediaUploadResponse,
    MediaSearchRequest, MediaSearchResponse,
    MediaFileResponse, MediaVariantResponse,
    ModerationRequest, ModerationResponse,
    ProcessingJobRequest, ProcessingJobResponse,
    MediaAnalyticsResponse, ContentTagResponse
)
from ..models import (
    MediaFile, MediaProcessedVariant, ContentModerationRecord,
    ContentTag, MediaTagAssociation, MediaUsageTracking,
    MediaType, ProcessingStatus, ModerationStatus, PrivacyLevel
)
from ..services.media_service import MediaService
from ..tasks.media_processing import process_media_file, generate_variants


router = APIRouter(prefix="/media", tags=["media"])


@router.post("/upload", response_model=MediaUploadResponse)
async def upload_media(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: Optional[str] = None,
    description: Optional[str] = None,
    tags: Optional[str] = None,
    privacy_level: PrivacyLevel = PrivacyLevel.PUBLIC,
    content_language: str = "en",
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Upload and process media file"""
    
    try:
        media_service = MediaService(db)
        
        # Parse tags
        tag_list = []
        if tags:
            tag_list = [tag.strip() for tag in tags.split(",") if tag.strip()]
        
        # Create upload request
        upload_request = MediaUploadRequest(
            title=title or file.filename,
            description=description,
            tags=tag_list,
            privacy_level=privacy_level,
            content_language=content_language
        )
        
        # Upload file
        media_file = await media_service.upload_media(
            file=file,
            upload_request=upload_request,
            user_id=current_user.id
        )
        
        # Start background processing
        background_tasks.add_task(
            process_media_file.delay,
            str(media_file.id)
        )
        
        return MediaUploadResponse(
            id=media_file.id,
            filename=media_file.filename,
            title=media_file.title,
            media_type=media_file.media_type,
            file_size=media_file.file_size,
            mime_type=media_file.mime_type,
            processing_status=media_file.processing_status,
            cdn_url=media_file.cdn_url,
            upload_completed_at=media_file.uploaded_at
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Upload failed")


@router.get("/search", response_model=MediaSearchResponse)
async def search_media(
    query: Optional[str] = Query(None, description="Search query"),
    media_type: Optional[MediaType] = Query(None, description="Filter by media type"),
    tags: Optional[str] = Query(None, description="Comma-separated tags"),
    privacy_level: Optional[PrivacyLevel] = Query(None, description="Privacy level filter"),
    uploaded_after: Optional[datetime] = Query(None, description="Filter by upload date"),
    uploaded_before: Optional[datetime] = Query(None, description="Filter by upload date"),
    min_file_size: Optional[int] = Query(None, description="Minimum file size in bytes"),
    max_file_size: Optional[int] = Query(None, description="Maximum file size in bytes"),
    content_language: Optional[str] = Query(None, description="Content language"),
    moderation_status: Optional[ModerationStatus] = Query(None, description="Moderation status"),
    processing_status: Optional[ProcessingStatus] = Query(None, description="Processing status"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    sort_by: str = Query("uploaded_at", description="Sort field"),
    sort_order: str = Query("desc", description="Sort order (asc/desc)"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Search and filter media files"""
    
    try:
        media_service = MediaService(db)
        
        # Parse tags
        tag_list = []
        if tags:
            tag_list = [tag.strip() for tag in tags.split(",") if tag.strip()]
        
        # Create search request
        search_request = MediaSearchRequest(
            query=query,
            media_type=media_type,
            tags=tag_list,
            privacy_level=privacy_level,
            uploaded_after=uploaded_after,
            uploaded_before=uploaded_before,
            min_file_size=min_file_size,
            max_file_size=max_file_size,
            content_language=content_language,
            moderation_status=moderation_status,
            processing_status=processing_status,
            page=page,
            limit=limit,
            sort_by=sort_by,
            sort_order=sort_order
        )
        
        # Search media
        results = await media_service.search_media(
            search_request=search_request,
            user_id=current_user.id
        )
        
        return results
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="Search failed")


@router.get("/{media_id}", response_model=MediaFileResponse)
async def get_media_file(
    media_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get media file details"""
    
    try:
        media_service = MediaService(db)
        media_file = await media_service.get_media_file(
            media_id=media_id,
            user_id=current_user.id
        )
        
        if not media_file:
            raise HTTPException(status_code=404, detail="Media file not found")
        
        # Get variants
        variants = db.query(MediaProcessedVariant).filter(
            MediaProcessedVariant.source_file_id == media_id
        ).all()
        
        # Get tags
        tags = db.query(ContentTag).join(
            MediaTagAssociation,
            ContentTag.id == MediaTagAssociation.tag_id
        ).filter(
            MediaTagAssociation.media_file_id == media_id
        ).all()
        
        return MediaFileResponse(
            id=media_file.id,
            filename=media_file.filename,
            title=media_file.title,
            description=media_file.description,
            media_type=media_file.media_type,
            file_size=media_file.file_size,
            mime_type=media_file.mime_type,
            storage_path=media_file.storage_path,
            cdn_url=media_file.cdn_url,
            metadata=media_file.metadata,
            privacy_level=media_file.privacy_level,
            content_language=media_file.content_language,
            processing_status=media_file.processing_status,
            moderation_status=media_file.moderation_status,
            uploaded_at=media_file.uploaded_at,
            processed_at=media_file.processed_at,
            variants=[
                MediaVariantResponse(
                    id=variant.id,
                    variant_type=variant.variant_type,
                    filename=variant.filename,
                    file_size=variant.file_size,
                    mime_type=variant.mime_type,
                    cdn_url=variant.cdn_url,
                    dimensions=variant.dimensions,
                    quality_settings=variant.quality_settings,
                    processing_status=variant.processing_status
                ) for variant in variants
            ],
            tags=[
                ContentTagResponse(
                    id=tag.id,
                    name=tag.name,
                    category=tag.category,
                    confidence_score=tag.confidence_score
                ) for tag in tags
            ]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to retrieve media file")


@router.delete("/{media_id}")
async def delete_media_file(
    media_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Delete media file and all variants"""
    
    try:
        media_service = MediaService(db)
        success = await media_service.delete_media_file(
            media_id=media_id,
            user_id=current_user.id
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="Media file not found")
        
        return {"message": "Media file deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to delete media file")


@router.post("/{media_id}/variants", response_model=ProcessingJobResponse)
async def generate_media_variants(
    media_id: UUID,
    request: ProcessingJobRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Generate specific variants for a media file"""
    
    try:
        # Verify media file exists and user has access
        media_file = db.query(MediaFile).filter(
            and_(
                MediaFile.id == media_id,
                MediaFile.uploaded_by_user_id == current_user.id
            )
        ).first()
        
        if not media_file:
            raise HTTPException(status_code=404, detail="Media file not found")
        
        # Start variant generation
        task = generate_variants.delay(str(media_id), request.variant_types)
        
        return ProcessingJobResponse(
            job_id=task.id,
            media_file_id=media_id,
            variant_types=request.variant_types,
            status="queued",
            created_at=datetime.utcnow()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to start variant generation")


@router.get("/{media_id}/variants")
async def get_media_variants(
    media_id: UUID,
    variant_type: Optional[str] = Query(None, description="Filter by variant type"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get all variants for a media file"""
    
    try:
        # Verify access to media file
        media_file = db.query(MediaFile).filter(
            MediaFile.id == media_id
        ).first()
        
        if not media_file:
            raise HTTPException(status_code=404, detail="Media file not found")
        
        # Check privacy permissions
        if (media_file.privacy_level == PrivacyLevel.PRIVATE and 
            media_file.uploaded_by_user_id != current_user.id):
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get variants
        query = db.query(MediaProcessedVariant).filter(
            MediaProcessedVariant.source_file_id == media_id
        )
        
        if variant_type:
            query = query.filter(MediaProcessedVariant.variant_type == variant_type)
        
        variants = query.all()
        
        return [
            MediaVariantResponse(
                id=variant.id,
                variant_type=variant.variant_type,
                filename=variant.filename,
                file_size=variant.file_size,
                mime_type=variant.mime_type,
                cdn_url=variant.cdn_url,
                dimensions=variant.dimensions,
                quality_settings=variant.quality_settings,
                processing_status=variant.processing_status
            ) for variant in variants
        ]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to retrieve variants")


@router.post("/{media_id}/moderate", response_model=ModerationResponse)
async def moderate_content(
    media_id: UUID,
    request: ModerationRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Submit media for content moderation"""
    
    try:
        media_service = MediaService(db)
        moderation_result = await media_service.moderate_content(
            media_id=media_id,
            user_id=current_user.id,
            moderation_request=request
        )
        
        return moderation_result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Moderation request failed")


@router.get("/{media_id}/analytics", response_model=MediaAnalyticsResponse)
async def get_media_analytics(
    media_id: UUID,
    start_date: Optional[datetime] = Query(None, description="Start date for analytics"),
    end_date: Optional[datetime] = Query(None, description="End date for analytics"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get analytics for a media file"""
    
    try:
        # Verify media file exists and user has access
        media_file = db.query(MediaFile).filter(
            and_(
                MediaFile.id == media_id,
                MediaFile.uploaded_by_user_id == current_user.id
            )
        ).first()
        
        if not media_file:
            raise HTTPException(status_code=404, detail="Media file not found")
        
        # Get usage tracking data
        query = db.query(MediaUsageTracking).filter(
            MediaUsageTracking.media_file_id == media_id
        )
        
        if start_date:
            query = query.filter(MediaUsageTracking.access_timestamp >= start_date)
        if end_date:
            query = query.filter(MediaUsageTracking.access_timestamp <= end_date)
        
        usage_records = query.all()
        
        # Calculate analytics
        total_views = len(usage_records)
        unique_users = len(set(record.user_id for record in usage_records if record.user_id))
        
        # Views by day
        views_by_day = {}
        for record in usage_records:
            day = record.access_timestamp.date().isoformat()
            views_by_day[day] = views_by_day.get(day, 0) + 1
        
        # Top referrers
        referrer_counts = {}
        for record in usage_records:
            if record.referrer:
                referrer_counts[record.referrer] = referrer_counts.get(record.referrer, 0) + 1
        
        top_referrers = sorted(referrer_counts.items(), key=lambda x: x[1], reverse=True)[:10]
        
        return MediaAnalyticsResponse(
            media_file_id=media_id,
            total_views=total_views,
            unique_users=unique_users,
            views_by_day=views_by_day,
            top_referrers=dict(top_referrers),
            average_view_duration=sum(
                record.duration_seconds or 0 for record in usage_records
            ) / max(total_views, 1),
            download_count=sum(
                1 for record in usage_records if record.action_type == "download"
            ),
            share_count=sum(
                1 for record in usage_records if record.action_type == "share"
            )
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to retrieve analytics")


@router.get("/{media_id}/download")
async def download_media(
    media_id: UUID,
    variant_type: Optional[str] = Query(None, description="Variant to download"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Download media file or variant"""
    
    try:
        # Get media file
        media_file = db.query(MediaFile).filter(
            MediaFile.id == media_id
        ).first()
        
        if not media_file:
            raise HTTPException(status_code=404, detail="Media file not found")
        
        # Check privacy permissions
        if (media_file.privacy_level == PrivacyLevel.PRIVATE and 
            media_file.uploaded_by_user_id != current_user.id):
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Determine file to download
        if variant_type:
            variant = db.query(MediaProcessedVariant).filter(
                and_(
                    MediaProcessedVariant.source_file_id == media_id,
                    MediaProcessedVariant.variant_type == variant_type
                )
            ).first()
            
            if not variant:
                raise HTTPException(status_code=404, detail="Variant not found")
            
            download_url = variant.cdn_url
            filename = variant.filename
            mime_type = variant.mime_type
        else:
            download_url = media_file.cdn_url
            filename = media_file.filename
            mime_type = media_file.mime_type
        
        # Log download activity
        usage_record = MediaUsageTracking(
            media_file_id=media_id,
            user_id=current_user.id,
            action_type="download",
            access_timestamp=datetime.utcnow(),
            user_agent=None,  # Could be extracted from request headers
            ip_address=None,  # Could be extracted from request
            referrer=None
        )
        db.add(usage_record)
        db.commit()
        
        # Return redirect to CDN URL
        from fastapi.responses import RedirectResponse
        return RedirectResponse(url=download_url, status_code=302)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Download failed")


@router.get("/tags", response_model=List[ContentTagResponse])
async def get_content_tags(
    category: Optional[str] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Search tag names"),
    limit: int = Query(50, ge=1, le=200, description="Maximum number of tags"),
    db: Session = Depends(get_db)
):
    """Get available content tags"""
    
    try:
        query = db.query(ContentTag)
        
        if category:
            query = query.filter(ContentTag.category == category)
        
        if search:
            query = query.filter(ContentTag.name.ilike(f"%{search}%"))
        
        tags = query.limit(limit).all()
        
        return [
            ContentTagResponse(
                id=tag.id,
                name=tag.name,
                category=tag.category,
                confidence_score=tag.confidence_score
            ) for tag in tags
        ]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to retrieve tags")


@router.get("/stats/overview")
async def get_media_stats(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get media statistics overview for current user"""
    
    try:
        # Get user's media files
        user_media = db.query(MediaFile).filter(
            MediaFile.uploaded_by_user_id == current_user.id
        )
        
        total_files = user_media.count()
        total_size = sum(file.file_size for file in user_media.all())
        
        # Count by media type
        type_counts = {}
        for media_type in MediaType:
            count = user_media.filter(MediaFile.media_type == media_type).count()
            if count > 0:
                type_counts[media_type.value] = count
        
        # Count by processing status
        status_counts = {}
        for status in ProcessingStatus:
            count = user_media.filter(MediaFile.processing_status == status).count()
            if count > 0:
                status_counts[status.value] = count
        
        return {
            "total_files": total_files,
            "total_size_bytes": total_size,
            "total_size_mb": round(total_size / (1024 * 1024), 2),
            "files_by_type": type_counts,
            "files_by_status": status_counts,
            "storage_limit_mb": settings.MAX_STORAGE_PER_USER_MB,
            "storage_used_percent": round((total_size / (1024 * 1024)) / settings.MAX_STORAGE_PER_USER_MB * 100, 2)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to retrieve statistics")


@router.post("/{media_id}/tags")
async def add_media_tags(
    media_id: UUID,
    tag_names: List[str],
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Add tags to a media file"""
    
    try:
        # Verify media file exists and user has access
        media_file = db.query(MediaFile).filter(
            and_(
                MediaFile.id == media_id,
                MediaFile.uploaded_by_user_id == current_user.id
            )
        ).first()
        
        if not media_file:
            raise HTTPException(status_code=404, detail="Media file not found")
        
        added_tags = []
        
        for tag_name in tag_names:
            # Get or create tag
            tag = db.query(ContentTag).filter(ContentTag.name == tag_name).first()
            if not tag:
                tag = ContentTag(
                    name=tag_name,
                    category="user",
                    confidence_score=1.0
                )
                db.add(tag)
                db.flush()
            
            # Check if association already exists
            existing_association = db.query(MediaTagAssociation).filter(
                and_(
                    MediaTagAssociation.media_file_id == media_id,
                    MediaTagAssociation.tag_id == tag.id
                )
            ).first()
            
            if not existing_association:
                association = MediaTagAssociation(
                    media_file_id=media_id,
                    tag_id=tag.id
                )
                db.add(association)
                added_tags.append(tag_name)
        
        db.commit()
        
        return {
            "message": f"Added {len(added_tags)} tags to media file",
            "added_tags": added_tags
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to add tags")


@router.delete("/{media_id}/tags/{tag_id}")
async def remove_media_tag(
    media_id: UUID,
    tag_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Remove a tag from a media file"""
    
    try:
        # Verify media file exists and user has access
        media_file = db.query(MediaFile).filter(
            and_(
                MediaFile.id == media_id,
                MediaFile.uploaded_by_user_id == current_user.id
            )
        ).first()
        
        if not media_file:
            raise HTTPException(status_code=404, detail="Media file not found")
        
        # Remove tag association
        association = db.query(MediaTagAssociation).filter(
            and_(
                MediaTagAssociation.media_file_id == media_id,
                MediaTagAssociation.tag_id == tag_id
            )
        ).first()
        
        if not association:
            raise HTTPException(status_code=404, detail="Tag association not found")
        
        db.delete(association)
        db.commit()
        
        return {"message": "Tag removed from media file"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to remove tag")