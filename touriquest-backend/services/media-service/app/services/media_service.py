"""
Media Service Implementation
Comprehensive media management with processing, moderation, and optimization
"""
import os
import uuid
import hashlib
import mimetypes
import asyncio
import aiofiles
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Tuple, BinaryIO
from pathlib import Path
import logging

import magic
from PIL import Image, ImageOps
import ffmpeg
import librosa
import numpy as np
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc, asc
import boto3
from botocore.exceptions import ClientError
import redis

from ..models import (
    MediaFile, MediaProcessedVariant, ContentModerationRecord, ContentTag,
    MediaTagAssociation, ContentLanguage, MediaUsageTracking, DMCACompliance,
    MediaType, ProcessingStatus, ModerationStatus, ContentCategory, PrivacyLevel
)
from ..schemas.media_schemas import (
    MediaUploadRequest, MediaUploadResponse, MediaFileResponse,
    MediaSearchRequest, MediaSearchResponse, ModerationRequest, ModerationResponse,
    ProcessingJobRequest, ProcessingJobResponse, ContentCreateRequest, ContentResponse
)
from ..core.config import settings
from ..core.security import get_current_user
from ..tasks.media_processing import process_media_file, generate_variants


logger = logging.getLogger(__name__)


class MediaService:
    """Comprehensive media management service"""
    
    def __init__(self, db: Session, redis_client: redis.Redis):
        self.db = db
        self.redis = redis_client
        
        # AWS S3 client for storage
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION
        )
        
        # CloudFront for CDN
        self.cloudfront_client = boto3.client(
            'cloudfront',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION
        )
        
        # Supported file types and sizes
        self.max_file_sizes = {
            MediaType.IMAGE: 50 * 1024 * 1024,  # 50MB
            MediaType.VIDEO: 500 * 1024 * 1024,  # 500MB
            MediaType.AUDIO: 100 * 1024 * 1024,  # 100MB
            MediaType.DOCUMENT: 25 * 1024 * 1024,  # 25MB
            MediaType.AR_MODEL: 100 * 1024 * 1024,  # 100MB
        }
        
        self.allowed_mime_types = {
            MediaType.IMAGE: [
                'image/jpeg', 'image/png', 'image/webp', 'image/gif',
                'image/bmp', 'image/tiff', 'image/svg+xml'
            ],
            MediaType.VIDEO: [
                'video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo',
                'video/webm', 'video/x-flv', 'video/3gpp'
            ],
            MediaType.AUDIO: [
                'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/aac',
                'audio/ogg', 'audio/webm', 'audio/flac', 'audio/x-m4a'
            ],
            MediaType.DOCUMENT: [
                'application/pdf', 'text/plain', 'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/json', 'text/markdown'
            ],
            MediaType.AR_MODEL: [
                'model/gltf+json', 'model/gltf-binary', 'application/octet-stream'
            ]
        }
    
    # File Upload and Management
    async def upload_media(self, file_data: BinaryIO, filename: str, upload_request: MediaUploadRequest, user_id: uuid.UUID) -> MediaUploadResponse:
        """Upload and process media file"""
        
        try:
            # Validate file
            await self._validate_file(file_data, filename, upload_request.category)
            
            # Calculate file hash for duplicate detection
            file_data.seek(0)
            content_hash = hashlib.sha256(file_data.read()).hexdigest()
            file_data.seek(0)
            
            # Check for duplicates
            existing_file = await self._check_duplicate_file(content_hash, user_id)
            if existing_file and not settings.ALLOW_DUPLICATE_UPLOADS:
                return MediaUploadResponse(
                    id=existing_file.id,
                    filename=existing_file.filename,
                    file_size=existing_file.file_size,
                    mime_type=existing_file.mime_type,
                    media_type=existing_file.media_type,
                    category=existing_file.category,
                    processing_status=existing_file.processing_status,
                    cdn_url=existing_file.cdn_url,
                    created_at=existing_file.created_at
                )
            
            # Determine media type and MIME type
            mime_type = magic.from_buffer(file_data.read(2048), mime=True)
            file_data.seek(0)
            media_type = self._determine_media_type(mime_type)
            
            # Generate unique filename and storage path
            file_id = uuid.uuid4()
            file_extension = Path(filename).suffix
            unique_filename = f"{file_id}{file_extension}"
            storage_path = self._generate_storage_path(media_type, upload_request.category, unique_filename)
            
            # Upload to S3
            s3_key = f"{settings.S3_MEDIA_PREFIX}/{storage_path}"
            cdn_url = await self._upload_to_s3(file_data, s3_key, mime_type)
            
            # Extract metadata
            file_data.seek(0)
            metadata = await self._extract_metadata(file_data, media_type, mime_type)
            
            # Create database record
            media_file = MediaFile(
                id=file_id,
                filename=unique_filename,
                original_filename=filename,
                file_size=len(file_data.read()),
                mime_type=mime_type,
                media_type=media_type,
                storage_path=storage_path,
                cdn_url=cdn_url,
                bucket_name=settings.S3_BUCKET_NAME,
                storage_region=settings.AWS_REGION,
                category=upload_request.category,
                tags=upload_request.tags,
                content_hash=content_hash,
                privacy_level=upload_request.privacy_level,
                uploaded_by=user_id,
                related_entity_type=upload_request.related_entity_type,
                related_entity_id=upload_request.related_entity_id,
                metadata=metadata
            )
            
            self.db.add(media_file)
            self.db.commit()
            self.db.refresh(media_file)
            
            # Queue virus scanning
            await self._queue_virus_scan(media_file.id)
            
            # Queue processing job
            await self._queue_processing_job(media_file.id, media_type)
            
            # Add tags
            if upload_request.tags:
                await self._add_tags_to_media(media_file.id, upload_request.tags, user_id)
            
            # Create activity tracking
            await self._track_media_activity(
                media_file.id, user_id, "upload", 
                {"original_filename": filename, "file_size": media_file.file_size}
            )
            
            return MediaUploadResponse(
                id=media_file.id,
                filename=media_file.filename,
                file_size=media_file.file_size,
                mime_type=media_file.mime_type,
                media_type=media_file.media_type,
                category=media_file.category,
                processing_status=media_file.processing_status,
                cdn_url=media_file.cdn_url,
                created_at=media_file.created_at
            )
            
        except Exception as e:
            logger.error(f"Media upload failed: {str(e)}")
            raise ValueError(f"Upload failed: {str(e)}")
    
    async def get_media_file(self, file_id: uuid.UUID, user_id: Optional[uuid.UUID] = None) -> MediaFileResponse:
        """Get media file with privacy filtering"""
        
        media_file = self.db.query(MediaFile).filter(MediaFile.id == file_id).first()
        if not media_file:
            raise ValueError("Media file not found")
        
        # Check privacy permissions
        if not await self._can_access_media(media_file, user_id):
            raise ValueError("Access denied")
        
        # Load processed variants
        variants = self.db.query(MediaProcessedVariant).filter(
            MediaProcessedVariant.source_file_id == file_id
        ).all()
        
        # Track access
        if user_id:
            await self._track_media_activity(file_id, user_id, "view")
        
        # Update view count
        media_file.view_count += 1
        media_file.last_accessed = datetime.utcnow()
        self.db.commit()
        
        return MediaFileResponse(
            id=media_file.id,
            filename=media_file.filename,
            original_filename=media_file.original_filename,
            file_size=media_file.file_size,
            mime_type=media_file.mime_type,
            media_type=media_file.media_type,
            category=media_file.category,
            tags=media_file.tags,
            content_hash=media_file.content_hash,
            processing_status=media_file.processing_status,
            moderation_status=media_file.moderation_status,
            privacy_level=media_file.privacy_level,
            cdn_url=media_file.cdn_url,
            storage_region=media_file.storage_region,
            metadata=media_file.metadata,
            dimensions=media_file.dimensions,
            duration=media_file.duration,
            virus_scan_status=media_file.virus_scan_status,
            copyright_scan_status=media_file.copyright_scan_status,
            download_count=media_file.download_count,
            view_count=media_file.view_count,
            last_accessed=media_file.last_accessed,
            version=media_file.version,
            parent_file_id=media_file.parent_file_id,
            variants=[self._convert_variant_to_response(v) for v in variants],
            created_at=media_file.created_at,
            updated_at=media_file.updated_at,
            expires_at=media_file.expires_at
        )
    
    async def delete_media_file(self, file_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        """Delete media file and all variants"""
        
        media_file = self.db.query(MediaFile).filter(MediaFile.id == file_id).first()
        if not media_file:
            raise ValueError("Media file not found")
        
        # Check permissions
        if media_file.uploaded_by != user_id and not await self._is_admin(user_id):
            raise ValueError("Permission denied")
        
        try:
            # Delete from S3
            s3_key = f"{settings.S3_MEDIA_PREFIX}/{media_file.storage_path}"
            await self._delete_from_s3(s3_key)
            
            # Delete variants from S3
            variants = self.db.query(MediaProcessedVariant).filter(
                MediaProcessedVariant.source_file_id == file_id
            ).all()
            
            for variant in variants:
                variant_key = f"{settings.S3_MEDIA_PREFIX}/{variant.storage_path}"
                await self._delete_from_s3(variant_key)
            
            # Purge from CDN cache
            await self._purge_cdn_cache([media_file.cdn_url])
            
            # Soft delete in database (for audit trail)
            media_file.is_archived = True
            media_file.archive_date = datetime.utcnow()
            self.db.commit()
            
            # Track deletion
            await self._track_media_activity(file_id, user_id, "delete")
            
            return True
            
        except Exception as e:
            logger.error(f"Media deletion failed: {str(e)}")
            raise ValueError(f"Deletion failed: {str(e)}")
    
    # Search and Discovery
    async def search_media(self, search_request: MediaSearchRequest, user_id: Optional[uuid.UUID] = None) -> MediaSearchResponse:
        """Search media files with filters and pagination"""
        
        start_time = datetime.utcnow()
        
        # Build base query
        query = self.db.query(MediaFile).filter(MediaFile.is_archived == False)
        
        # Apply privacy filters
        if user_id:
            query = query.filter(
                or_(
                    MediaFile.privacy_level == PrivacyLevel.PUBLIC,
                    and_(
                        MediaFile.privacy_level == PrivacyLevel.FOLLOWERS,
                        MediaFile.uploaded_by == user_id  # Add follower logic here
                    ),
                    MediaFile.uploaded_by == user_id
                )
            )
        else:
            query = query.filter(MediaFile.privacy_level == PrivacyLevel.PUBLIC)
        
        # Text search
        if search_request.query:
            search_term = f"%{search_request.query}%"
            query = query.filter(
                or_(
                    MediaFile.original_filename.ilike(search_term),
                    MediaFile.tags.op('&&')(search_request.query.split())
                )
            )
        
        # Filter by media types
        if search_request.media_types:
            query = query.filter(MediaFile.media_type.in_(search_request.media_types))
        
        # Filter by categories
        if search_request.categories:
            query = query.filter(MediaFile.category.in_(search_request.categories))
        
        # Filter by tags
        if search_request.tags:
            query = query.filter(MediaFile.tags.op('&&')(search_request.tags))
        
        # Filter by uploader
        if search_request.uploaded_by:
            query = query.filter(MediaFile.uploaded_by == search_request.uploaded_by)
        
        # Date range filter
        if search_request.date_from:
            query = query.filter(MediaFile.created_at >= search_request.date_from)
        if search_request.date_to:
            query = query.filter(MediaFile.created_at <= search_request.date_to)
        
        # File size filter
        if search_request.file_size_min:
            query = query.filter(MediaFile.file_size >= search_request.file_size_min)
        if search_request.file_size_max:
            query = query.filter(MediaFile.file_size <= search_request.file_size_max)
        
        # Status filters
        if search_request.moderation_status:
            query = query.filter(MediaFile.moderation_status.in_(search_request.moderation_status))
        if search_request.processing_status:
            query = query.filter(MediaFile.processing_status.in_(search_request.processing_status))
        
        # Variants filter
        if search_request.has_variants is not None:
            if search_request.has_variants:
                query = query.filter(MediaFile.processed_variants.any())
            else:
                query = query.filter(~MediaFile.processed_variants.any())
        
        # Get total count
        total_count = query.count()
        
        # Apply sorting
        if search_request.sort_by == "created_at":
            order_col = MediaFile.created_at
        elif search_request.sort_by == "updated_at":
            order_col = MediaFile.updated_at
        elif search_request.sort_by == "file_size":
            order_col = MediaFile.file_size
        elif search_request.sort_by == "view_count":
            order_col = MediaFile.view_count
        elif search_request.sort_by == "download_count":
            order_col = MediaFile.download_count
        else:
            order_col = MediaFile.created_at
        
        if search_request.sort_order == "asc":
            query = query.order_by(asc(order_col))
        else:
            query = query.order_by(desc(order_col))
        
        # Apply pagination
        results = query.offset(search_request.offset).limit(search_request.limit).all()
        
        # Convert to response format
        media_responses = []
        for media_file in results:
            try:
                response = await self.get_media_file(media_file.id, user_id)
                media_responses.append(response)
            except ValueError:
                continue  # Skip files user can't access
        
        # Calculate search time
        search_time = (datetime.utcnow() - start_time).total_seconds() * 1000
        
        # Generate suggestions
        suggested_tags = await self._get_suggested_tags(search_request.query)
        related_searches = await self._get_related_searches(search_request.query)
        
        return MediaSearchResponse(
            results=media_responses,
            total_count=total_count,
            page_size=search_request.limit,
            offset=search_request.offset,
            has_more=(search_request.offset + len(media_responses)) < total_count,
            search_time_ms=int(search_time),
            suggested_tags=suggested_tags,
            related_searches=related_searches
        )
    
    # Content Moderation
    async def moderate_content(self, file_id: uuid.UUID, moderation_request: ModerationRequest, moderator_id: uuid.UUID) -> ModerationResponse:
        """Moderate media content"""
        
        media_file = self.db.query(MediaFile).filter(MediaFile.id == file_id).first()
        if not media_file:
            raise ValueError("Media file not found")
        
        # Create moderation record
        moderation_record = ContentModerationRecord(
            media_file_id=file_id,
            moderation_type="manual",
            moderator_id=moderator_id,
            moderation_status=ModerationStatus(moderation_request.action.upper()),
            decision_reason=moderation_request.reason,
            policy_violations=moderation_request.policy_violations,
            action_taken=moderation_request.action,
            decision_at=datetime.utcnow()
        )
        
        self.db.add(moderation_record)
        
        # Update media file status
        if moderation_request.action == "approve":
            media_file.moderation_status = ModerationStatus.APPROVED
        elif moderation_request.action == "reject":
            media_file.moderation_status = ModerationStatus.REJECTED
        elif moderation_request.action == "flag":
            media_file.moderation_status = ModerationStatus.FLAGGED
        elif moderation_request.action == "review":
            media_file.moderation_status = ModerationStatus.UNDER_REVIEW
        
        self.db.commit()
        self.db.refresh(moderation_record)
        
        # Track moderation activity
        await self._track_media_activity(
            file_id, moderator_id, "moderate",
            {"action": moderation_request.action, "reason": moderation_request.reason}
        )
        
        return ModerationResponse(
            id=moderation_record.id,
            media_file_id=file_id,
            moderation_status=moderation_record.moderation_status,
            action_taken=moderation_record.action_taken,
            reason=moderation_record.decision_reason,
            moderator_id=moderator_id,
            decision_at=moderation_record.decision_at
        )
    
    # Processing and Variants
    async def generate_processed_variants(self, file_id: uuid.UUID, variant_types: List[str], force_regenerate: bool = False) -> List[ProcessingJobResponse]:
        """Generate processed variants for media file"""
        
        media_file = self.db.query(MediaFile).filter(MediaFile.id == file_id).first()
        if not media_file:
            raise ValueError("Media file not found")
        
        jobs = []
        for variant_type in variant_types:
            # Check if variant already exists
            if not force_regenerate:
                existing_variant = self.db.query(MediaProcessedVariant).filter(
                    and_(
                        MediaProcessedVariant.source_file_id == file_id,
                        MediaProcessedVariant.variant_type == variant_type
                    )
                ).first()
                
                if existing_variant:
                    continue
            
            # Queue processing job
            job_id = uuid.uuid4()
            job = ProcessingJobResponse(
                job_id=job_id,
                media_file_id=file_id,
                processing_type=f"variant_{variant_type}",
                status=ProcessingStatus.PENDING,
                created_at=datetime.utcnow()
            )
            
            # Queue with Celery
            await self._queue_variant_generation(file_id, variant_type, job_id)
            
            jobs.append(job)
        
        return jobs
    
    # Private Helper Methods
    async def _validate_file(self, file_data: BinaryIO, filename: str, category: ContentCategory):
        """Validate uploaded file"""
        
        # Check file size
        file_data.seek(0, 2)  # Seek to end
        file_size = file_data.tell()
        file_data.seek(0)  # Reset to beginning
        
        # Determine media type from content
        mime_type = magic.from_buffer(file_data.read(2048), mime=True)
        file_data.seek(0)
        media_type = self._determine_media_type(mime_type)
        
        # Check size limits
        max_size = self.max_file_sizes.get(media_type, 10 * 1024 * 1024)
        if file_size > max_size:
            raise ValueError(f"File too large. Maximum size: {max_size / (1024*1024):.1f}MB")
        
        # Check MIME type
        allowed_types = self.allowed_mime_types.get(media_type, [])
        if mime_type not in allowed_types:
            raise ValueError(f"Unsupported file type: {mime_type}")
        
        # Additional validation by type
        if media_type == MediaType.IMAGE:
            await self._validate_image(file_data)
        elif media_type == MediaType.VIDEO:
            await self._validate_video(file_data)
        elif media_type == MediaType.AUDIO:
            await self._validate_audio(file_data)
    
    def _determine_media_type(self, mime_type: str) -> MediaType:
        """Determine media type from MIME type"""
        
        if mime_type.startswith('image/'):
            return MediaType.IMAGE
        elif mime_type.startswith('video/'):
            return MediaType.VIDEO
        elif mime_type.startswith('audio/'):
            return MediaType.AUDIO
        elif mime_type.startswith('model/') or 'gltf' in mime_type:
            return MediaType.AR_MODEL
        elif mime_type in ['application/pdf', 'text/plain', 'application/msword']:
            return MediaType.DOCUMENT
        else:
            return MediaType.DOCUMENT  # Default fallback
    
    async def _validate_image(self, file_data: BinaryIO):
        """Validate image file"""
        try:
            with Image.open(file_data) as img:
                # Check dimensions
                if img.width > 8000 or img.height > 8000:
                    raise ValueError("Image dimensions too large (max 8000x8000)")
                
                # Verify it's a valid image
                img.verify()
            
            file_data.seek(0)
        except Exception as e:
            raise ValueError(f"Invalid image file: {str(e)}")
    
    async def _validate_video(self, file_data: BinaryIO):
        """Validate video file"""
        try:
            # Save temporary file for ffmpeg analysis
            temp_path = f"/tmp/{uuid.uuid4()}.tmp"
            with open(temp_path, 'wb') as temp_file:
                file_data.seek(0)
                temp_file.write(file_data.read())
            
            # Probe video file
            probe = ffmpeg.probe(temp_path)
            video_info = next(s for s in probe['streams'] if s['codec_type'] == 'video')
            
            # Check duration (max 2 hours)
            duration = float(probe['format']['duration'])
            if duration > 7200:  # 2 hours
                raise ValueError("Video too long (max 2 hours)")
            
            # Clean up
            os.unlink(temp_path)
            file_data.seek(0)
            
        except Exception as e:
            raise ValueError(f"Invalid video file: {str(e)}")
    
    async def _validate_audio(self, file_data: BinaryIO):
        """Validate audio file"""
        try:
            # Save temporary file for librosa analysis
            temp_path = f"/tmp/{uuid.uuid4()}.tmp"
            with open(temp_path, 'wb') as temp_file:
                file_data.seek(0)
                temp_file.write(file_data.read())
            
            # Load and validate audio
            y, sr = librosa.load(temp_path, duration=1)  # Load first second
            
            # Check if valid audio data
            if len(y) == 0:
                raise ValueError("No audio data found")
            
            # Clean up
            os.unlink(temp_path)
            file_data.seek(0)
            
        except Exception as e:
            raise ValueError(f"Invalid audio file: {str(e)}")
    
    async def _extract_metadata(self, file_data: BinaryIO, media_type: MediaType, mime_type: str) -> Dict[str, Any]:
        """Extract metadata from media file"""
        
        metadata = {
            "extracted_at": datetime.utcnow().isoformat(),
            "mime_type": mime_type
        }
        
        try:
            if media_type == MediaType.IMAGE:
                metadata.update(await self._extract_image_metadata(file_data))
            elif media_type == MediaType.VIDEO:
                metadata.update(await self._extract_video_metadata(file_data))
            elif media_type == MediaType.AUDIO:
                metadata.update(await self._extract_audio_metadata(file_data))
        except Exception as e:
            logger.warning(f"Metadata extraction failed: {str(e)}")
            metadata["extraction_error"] = str(e)
        
        return metadata
    
    async def _extract_image_metadata(self, file_data: BinaryIO) -> Dict[str, Any]:
        """Extract image metadata using PIL"""
        
        metadata = {}
        
        with Image.open(file_data) as img:
            metadata.update({
                "width": img.width,
                "height": img.height,
                "format": img.format,
                "mode": img.mode
            })
            
            # Extract EXIF data
            if hasattr(img, '_getexif') and img._getexif():
                exif_data = img._getexif()
                if exif_data:
                    metadata["exif"] = {k: str(v) for k, v in exif_data.items() if isinstance(v, (str, int, float))}
        
        file_data.seek(0)
        return metadata
    
    async def _extract_video_metadata(self, file_data: BinaryIO) -> Dict[str, Any]:
        """Extract video metadata using ffmpeg"""
        
        # Save temporary file for ffmpeg
        temp_path = f"/tmp/{uuid.uuid4()}.tmp"
        with open(temp_path, 'wb') as temp_file:
            file_data.seek(0)
            temp_file.write(file_data.read())
        
        try:
            probe = ffmpeg.probe(temp_path)
            
            video_stream = next((s for s in probe['streams'] if s['codec_type'] == 'video'), None)
            audio_stream = next((s for s in probe['streams'] if s['codec_type'] == 'audio'), None)
            
            metadata = {
                "duration": float(probe['format']['duration']),
                "format_name": probe['format']['format_name'],
                "bit_rate": int(probe['format'].get('bit_rate', 0))
            }
            
            if video_stream:
                metadata.update({
                    "width": video_stream.get('width'),
                    "height": video_stream.get('height'),
                    "codec": video_stream.get('codec_name'),
                    "frame_rate": video_stream.get('r_frame_rate')
                })
            
            if audio_stream:
                metadata.update({
                    "audio_codec": audio_stream.get('codec_name'),
                    "audio_channels": audio_stream.get('channels'),
                    "sample_rate": audio_stream.get('sample_rate')
                })
            
            return metadata
            
        finally:
            os.unlink(temp_path)
            file_data.seek(0)
    
    async def _extract_audio_metadata(self, file_data: BinaryIO) -> Dict[str, Any]:
        """Extract audio metadata using librosa"""
        
        # Save temporary file for librosa
        temp_path = f"/tmp/{uuid.uuid4()}.tmp"
        with open(temp_path, 'wb') as temp_file:
            file_data.seek(0)
            temp_file.write(file_data.read())
        
        try:
            y, sr = librosa.load(temp_path)
            duration = librosa.get_duration(y=y, sr=sr)
            
            metadata = {
                "duration": duration,
                "sample_rate": sr,
                "channels": 1 if y.ndim == 1 else y.shape[0],
                "length_samples": len(y)
            }
            
            # Extract additional audio features
            tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
            metadata["estimated_tempo"] = float(tempo)
            
            return metadata
            
        finally:
            os.unlink(temp_path)
            file_data.seek(0)
    
    def _generate_storage_path(self, media_type: MediaType, category: ContentCategory, filename: str) -> str:
        """Generate organized storage path"""
        
        date_path = datetime.utcnow().strftime("%Y/%m/%d")
        type_path = media_type.value
        category_path = category.value
        
        return f"{type_path}/{category_path}/{date_path}/{filename}"
    
    async def _upload_to_s3(self, file_data: BinaryIO, s3_key: str, mime_type: str) -> str:
        """Upload file to S3 and return CDN URL"""
        
        try:
            # Upload to S3
            file_data.seek(0)
            self.s3_client.upload_fileobj(
                file_data, 
                settings.S3_BUCKET_NAME, 
                s3_key,
                ExtraArgs={
                    'ContentType': mime_type,
                    'CacheControl': 'max-age=31536000',  # 1 year
                    'ServerSideEncryption': 'AES256'
                }
            )
            
            # Generate CDN URL
            if settings.CLOUDFRONT_DOMAIN:
                cdn_url = f"https://{settings.CLOUDFRONT_DOMAIN}/{s3_key}"
            else:
                cdn_url = f"https://{settings.S3_BUCKET_NAME}.s3.{settings.AWS_REGION}.amazonaws.com/{s3_key}"
            
            return cdn_url
            
        except ClientError as e:
            logger.error(f"S3 upload failed: {str(e)}")
            raise ValueError(f"Storage upload failed: {str(e)}")
    
    async def _delete_from_s3(self, s3_key: str):
        """Delete file from S3"""
        
        try:
            self.s3_client.delete_object(
                Bucket=settings.S3_BUCKET_NAME,
                Key=s3_key
            )
        except ClientError as e:
            logger.error(f"S3 deletion failed: {str(e)}")
            raise ValueError(f"Storage deletion failed: {str(e)}")
    
    async def _purge_cdn_cache(self, urls: List[str]):
        """Purge files from CDN cache"""
        
        if not settings.CLOUDFRONT_DISTRIBUTION_ID or not urls:
            return
        
        try:
            # Create CloudFront invalidation
            paths = []
            for url in urls:
                if settings.CLOUDFRONT_DOMAIN in url:
                    path = url.replace(f"https://{settings.CLOUDFRONT_DOMAIN}", "")
                    paths.append(path)
            
            if paths:
                self.cloudfront_client.create_invalidation(
                    DistributionId=settings.CLOUDFRONT_DISTRIBUTION_ID,
                    InvalidationBatch={
                        'Paths': {
                            'Quantity': len(paths),
                            'Items': paths
                        },
                        'CallerReference': str(uuid.uuid4())
                    }
                )
                
        except ClientError as e:
            logger.error(f"CDN purge failed: {str(e)}")
    
    async def _check_duplicate_file(self, content_hash: str, user_id: uuid.UUID) -> Optional[MediaFile]:
        """Check for duplicate files by hash"""
        
        return self.db.query(MediaFile).filter(
            and_(
                MediaFile.content_hash == content_hash,
                MediaFile.uploaded_by == user_id,
                MediaFile.is_archived == False
            )
        ).first()
    
    async def _can_access_media(self, media_file: MediaFile, user_id: Optional[uuid.UUID]) -> bool:
        """Check if user can access media file based on privacy settings"""
        
        # Public files are accessible to everyone
        if media_file.privacy_level == PrivacyLevel.PUBLIC:
            return True
        
        # Private files only accessible to owner
        if media_file.privacy_level == PrivacyLevel.PRIVATE:
            return user_id == media_file.uploaded_by
        
        # Followers level - check if user follows the uploader
        if media_file.privacy_level == PrivacyLevel.FOLLOWERS:
            if user_id == media_file.uploaded_by:
                return True
            # TODO: Implement follower relationship check
            return False
        
        return False
    
    async def _queue_virus_scan(self, file_id: uuid.UUID):
        """Queue virus scanning job"""
        # TODO: Implement virus scanning with ClamAV or similar
        pass
    
    async def _queue_processing_job(self, file_id: uuid.UUID, media_type: MediaType):
        """Queue background processing job"""
        # TODO: Implement Celery task queuing
        pass
    
    async def _queue_variant_generation(self, file_id: uuid.UUID, variant_type: str, job_id: uuid.UUID):
        """Queue variant generation job"""
        # TODO: Implement Celery task for variant generation
        pass
    
    async def _add_tags_to_media(self, file_id: uuid.UUID, tags: List[str], user_id: uuid.UUID):
        """Add tags to media file"""
        
        for tag_name in tags:
            # Get or create tag
            tag = self.db.query(ContentTag).filter(ContentTag.tag_name == tag_name).first()
            if not tag:
                tag = ContentTag(
                    tag_name=tag_name,
                    created_by=user_id,
                    usage_count=1
                )
                self.db.add(tag)
            else:
                tag.usage_count += 1
            
            # Create association
            association = MediaTagAssociation(
                media_file_id=file_id,
                tag_id=tag.id,
                tagged_by=user_id,
                is_ai_generated=False
            )
            self.db.add(association)
        
        self.db.commit()
    
    async def _track_media_activity(self, file_id: uuid.UUID, user_id: uuid.UUID, access_type: str, metadata: Optional[Dict[str, Any]] = None):
        """Track media usage for analytics"""
        
        tracking = MediaUsageTracking(
            media_file_id=file_id,
            user_id=user_id,
            access_type=access_type,
            accessed_at=datetime.utcnow()
        )
        
        if metadata:
            tracking.user_agent = metadata.get('user_agent')
            tracking.ip_address = metadata.get('ip_address')
            tracking.referer = metadata.get('referer')
        
        self.db.add(tracking)
        self.db.commit()
    
    async def _get_suggested_tags(self, query: Optional[str]) -> List[str]:
        """Get suggested tags based on search query"""
        
        if not query:
            # Return popular tags
            tags = self.db.query(ContentTag).order_by(desc(ContentTag.usage_count)).limit(10).all()
            return [tag.tag_name for tag in tags]
        
        # Return tags that match query
        search_term = f"%{query}%"
        tags = self.db.query(ContentTag).filter(
            ContentTag.tag_name.ilike(search_term)
        ).order_by(desc(ContentTag.usage_count)).limit(5).all()
        
        return [tag.tag_name for tag in tags]
    
    async def _get_related_searches(self, query: Optional[str]) -> List[str]:
        """Get related search suggestions"""
        
        # TODO: Implement ML-based related search suggestions
        return []
    
    async def _is_admin(self, user_id: uuid.UUID) -> bool:
        """Check if user has admin privileges"""
        
        # TODO: Implement admin role checking
        return False
    
    def _convert_variant_to_response(self, variant: MediaProcessedVariant) -> Dict[str, Any]:
        """Convert variant to response format"""
        
        return {
            "variant_type": variant.variant_type,
            "filename": variant.filename,
            "file_size": variant.file_size,
            "mime_type": variant.mime_type,
            "cdn_url": variant.cdn_url,
            "dimensions": variant.dimensions,
            "quality_settings": variant.quality_settings,
            "processing_status": variant.processing_status,
            "created_at": variant.created_at
        }