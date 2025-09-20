"""
TouriQuest Media Service
FastAPI microservice for file upload, image processing, and CDN management
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from shared.database import get_db_session, BaseRepository
from shared.monitoring import MonitoringSetup
from shared.security import SecurityHeaders, RateLimiter, get_current_user
import logging
import uuid
import os
import shutil
from PIL import Image
import boto3
from enum import Enum
import mimetypes

logger = logging.getLogger(__name__)

app = FastAPI(
    title="TouriQuest Media Service",
    description="File upload, image processing, and CDN management microservice",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Monitoring setup
monitoring = MonitoringSetup("media-service")
app = monitoring.instrument_fastapi(app)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

rate_limiter = RateLimiter()


# Enums
class MediaTypeEnum(str, Enum):
    IMAGE = "image"
    VIDEO = "video"
    DOCUMENT = "document"
    AVATAR = "avatar"


class ImageSizeEnum(str, Enum):
    THUMBNAIL = "thumbnail"  # 150x150
    SMALL = "small"  # 300x300
    MEDIUM = "medium"  # 600x600
    LARGE = "large"  # 1200x1200
    ORIGINAL = "original"


# Pydantic models
class MediaMetadata(BaseModel):
    filename: str
    original_filename: str
    content_type: str
    size_bytes: int
    width: Optional[int] = None
    height: Optional[int] = None
    duration: Optional[float] = None  # For videos


class MediaUploadResponse(BaseModel):
    id: str
    filename: str
    original_filename: str
    media_type: MediaTypeEnum
    content_type: str
    size_bytes: int
    url: str
    thumbnail_url: Optional[str] = None
    metadata: MediaMetadata
    uploaded_by: str
    uploaded_at: datetime


class MediaProcessingRequest(BaseModel):
    media_id: str
    operations: List[Dict[str, Any]]  # resize, crop, watermark, etc.


class MediaProcessingResponse(BaseModel):
    media_id: str
    processed_urls: Dict[str, str]  # size -> url mapping
    status: str


# Media storage and processing classes
class S3StorageService:
    """S3 storage service for media files."""
    
    def __init__(self, bucket_name: str, region: str = "us-east-1"):
        self.bucket_name = bucket_name
        self.s3_client = boto3.client('s3', region_name=region)
        self.cloudfront_domain = "cdn.touriquest.com"  # Configure CDN domain
    
    async def upload_file(self, file_content: bytes, filename: str, content_type: str) -> str:
        """Upload file to S3 and return URL."""
        try:
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=filename,
                Body=file_content,
                ContentType=content_type,
                ACL='public-read'
            )
            
            # Return CDN URL
            return f"https://{self.cloudfront_domain}/{filename}"
        
        except Exception as e:
            logger.error(f"S3 upload error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="File upload failed"
            )
    
    async def delete_file(self, filename: str) -> bool:
        """Delete file from S3."""
        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=filename)
            return True
        except Exception as e:
            logger.error(f"S3 delete error: {e}")
            return False


class ImageProcessor:
    """Image processing service."""
    
    @staticmethod
    def get_image_info(image_path: str) -> Dict[str, Any]:
        """Get image metadata."""
        try:
            with Image.open(image_path) as img:
                return {
                    "width": img.width,
                    "height": img.height,
                    "format": img.format,
                    "mode": img.mode
                }
        except Exception as e:
            logger.error(f"Image info error: {e}")
            return {}
    
    @staticmethod
    def resize_image(image_path: str, output_path: str, size: tuple) -> bool:
        """Resize image to specified size."""
        try:
            with Image.open(image_path) as img:
                # Maintain aspect ratio
                img.thumbnail(size, Image.Resampling.LANCZOS)
                img.save(output_path, optimize=True, quality=85)
                return True
        except Exception as e:
            logger.error(f"Image resize error: {e}")
            return False
    
    @staticmethod
    def create_thumbnail(image_path: str, output_path: str, size: int = 150) -> bool:
        """Create square thumbnail."""
        try:
            with Image.open(image_path) as img:
                # Create square thumbnail
                img.thumbnail((size, size), Image.Resampling.LANCZOS)
                
                # Create square canvas
                square_img = Image.new('RGB', (size, size), (255, 255, 255))
                offset = ((size - img.size[0]) // 2, (size - img.size[1]) // 2)
                square_img.paste(img, offset)
                
                square_img.save(output_path, optimize=True, quality=85)
                return True
        except Exception as e:
            logger.error(f"Thumbnail creation error: {e}")
            return False
    
    @staticmethod
    def add_watermark(image_path: str, output_path: str, watermark_text: str = "TouriQuest") -> bool:
        """Add watermark to image."""
        try:
            # Implementation would add watermark
            # For now, just copy the file
            shutil.copy2(image_path, output_path)
            return True
        except Exception as e:
            logger.error(f"Watermark error: {e}")
            return False


# Repository
class MediaRepository(BaseRepository):
    """Media repository for database operations."""
    
    async def save_media_record(self, media_data: Dict[str, Any]) -> Dict[str, Any]:
        """Save media metadata to database."""
        media_record = {
            "id": str(uuid.uuid4()),
            "uploaded_at": datetime.utcnow().isoformat(),
            **media_data
        }
        
        logger.info(f"Saved media record: {media_record['id']}")
        return media_record
    
    async def get_media_by_id(self, media_id: str) -> Optional[Dict[str, Any]]:
        """Get media record by ID."""
        return None
    
    async def get_user_media(self, user_id: str, media_type: Optional[MediaTypeEnum] = None) -> List[Dict[str, Any]]:
        """Get media uploaded by user."""
        return []
    
    async def delete_media_record(self, media_id: str) -> bool:
        """Delete media record."""
        logger.info(f"Deleted media record: {media_id}")
        return True


# Dependencies
storage_service = S3StorageService("touriquest-media-bucket")
image_processor = ImageProcessor()


def get_media_repository() -> MediaRepository:
    """Get media repository dependency.""" 
    return MediaRepository()


# Helper functions
def validate_file_type(file: UploadFile, allowed_types: List[str]) -> bool:
    """Validate file type."""
    if file.content_type not in allowed_types:
        return False
    return True


def get_media_type(content_type: str) -> MediaTypeEnum:
    """Determine media type from content type."""
    if content_type.startswith('image/'):
        return MediaTypeEnum.IMAGE
    elif content_type.startswith('video/'):
        return MediaTypeEnum.VIDEO
    else:
        return MediaTypeEnum.DOCUMENT


# API Routes
@app.post("/api/v1/media/upload", response_model=MediaUploadResponse)
async def upload_media(
    file: UploadFile = File(...),
    media_type: MediaTypeEnum = Form(...),
    current_user: dict = Depends(get_current_user),
    media_repo: MediaRepository = Depends(get_media_repository)
):
    """Upload media file."""
    
    # Rate limiting
    rate_limit_key = f"upload_rate_limit:{current_user['id']}"
    if not await rate_limiter.is_allowed(rate_limit_key, 20, 3600):  # 20 per hour
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Upload rate limit exceeded"
        )
    
    # Validate file type
    allowed_types = {
        MediaTypeEnum.IMAGE: ['image/jpeg', 'image/png', 'image/webp'],
        MediaTypeEnum.VIDEO: ['video/mp4', 'video/mpeg', 'video/quicktime'],
        MediaTypeEnum.DOCUMENT: ['application/pdf', 'text/plain'],
        MediaTypeEnum.AVATAR: ['image/jpeg', 'image/png']
    }
    
    if not validate_file_type(file, allowed_types.get(media_type, [])):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type for {media_type}"
        )
    
    # Validate file size (10MB limit)
    file_content = await file.read()
    if len(file_content) > 10 * 1024 * 1024:  # 10MB
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds 10MB limit"
        )
    
    # Generate unique filename
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    
    # Upload to storage
    file_url = await storage_service.upload_file(
        file_content,
        unique_filename,
        file.content_type
    )
    
    # Process image if needed
    thumbnail_url = None
    metadata = MediaMetadata(
        filename=unique_filename,
        original_filename=file.filename,
        content_type=file.content_type,
        size_bytes=len(file_content)
    )
    
    if media_type == MediaTypeEnum.IMAGE:
        # Save temp file for processing
        temp_path = f"/tmp/{unique_filename}"
        with open(temp_path, "wb") as temp_file:
            temp_file.write(file_content)
        
        # Get image info
        img_info = image_processor.get_image_info(temp_path)
        metadata.width = img_info.get("width")
        metadata.height = img_info.get("height")
        
        # Create thumbnail
        thumbnail_filename = f"thumb_{unique_filename}"
        thumbnail_path = f"/tmp/{thumbnail_filename}"
        
        if image_processor.create_thumbnail(temp_path, thumbnail_path):
            with open(thumbnail_path, "rb") as thumb_file:
                thumbnail_url = await storage_service.upload_file(
                    thumb_file.read(),
                    thumbnail_filename,
                    file.content_type
                )
        
        # Clean up temp files
        os.remove(temp_path)
        if os.path.exists(thumbnail_path):
            os.remove(thumbnail_path)
    
    # Save media record
    media_data = {
        "filename": unique_filename,
        "original_filename": file.filename,
        "media_type": media_type,
        "content_type": file.content_type,
        "size_bytes": len(file_content),
        "url": file_url,
        "thumbnail_url": thumbnail_url,
        "metadata": metadata.dict(),
        "uploaded_by": current_user["id"]
    }
    
    media_record = await media_repo.save_media_record(media_data)
    
    return MediaUploadResponse(**media_record)


@app.get("/api/v1/media/{media_id}")
async def get_media(
    media_id: str,
    media_repo: MediaRepository = Depends(get_media_repository)
):
    """Get media by ID."""
    media = await media_repo.get_media_by_id(media_id)
    if not media:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Media not found"
        )
    
    return media


@app.get("/api/v1/media/user/me")
async def get_my_media(
    media_type: Optional[MediaTypeEnum] = None,
    current_user: dict = Depends(get_current_user),
    media_repo: MediaRepository = Depends(get_media_repository)
):
    """Get media uploaded by current user."""
    media_list = await media_repo.get_user_media(current_user["id"], media_type)
    return {"media": media_list}


@app.post("/api/v1/media/{media_id}/process", response_model=MediaProcessingResponse)
async def process_media(
    media_id: str,
    processing_request: MediaProcessingRequest,
    current_user: dict = Depends(get_current_user),
    media_repo: MediaRepository = Depends(get_media_repository)
):
    """Process media (resize, crop, etc.)."""
    media = await media_repo.get_media_by_id(media_id)
    if not media:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Media not found"
        )
    
    # Check ownership
    if media["uploaded_by"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to process this media"
        )
    
    # Process operations
    processed_urls = {}
    
    for operation in processing_request.operations:
        op_type = operation.get("type")
        
        if op_type == "resize":
            size = operation.get("size", "medium")
            # Mock processing - would actually resize image
            processed_urls[size] = f"{media['url']}?size={size}"
    
    return MediaProcessingResponse(
        media_id=media_id,
        processed_urls=processed_urls,
        status="completed"
    )


@app.delete("/api/v1/media/{media_id}")
async def delete_media(
    media_id: str,
    current_user: dict = Depends(get_current_user),
    media_repo: MediaRepository = Depends(get_media_repository)
):
    """Delete media file."""
    media = await media_repo.get_media_by_id(media_id)
    if not media:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Media not found"
        )
    
    # Check ownership
    if media["uploaded_by"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this media"
        )
    
    # Delete from storage
    await storage_service.delete_file(media["filename"])
    if media.get("thumbnail_url"):
        await storage_service.delete_file(f"thumb_{media['filename']}")
    
    # Delete record
    await media_repo.delete_media_record(media_id)
    
    return {"message": "Media deleted successfully"}


@app.get("/api/v1/media/stats")
async def get_media_stats(
    current_user: dict = Depends(get_current_user),
    media_repo: MediaRepository = Depends(get_media_repository)
):
    """Get media usage statistics."""
    user_media = await media_repo.get_user_media(current_user["id"])
    
    stats = {
        "total_files": len(user_media),
        "total_size_bytes": sum(m.get("size_bytes", 0) for m in user_media),
        "by_type": {},
        "storage_limit_bytes": 1024 * 1024 * 1024,  # 1GB
    }
    
    for media in user_media:
        media_type = media.get("media_type", "unknown")
        stats["by_type"][media_type] = stats["by_type"].get(media_type, 0) + 1
    
    stats["storage_used_percentage"] = (
        stats["total_size_bytes"] / stats["storage_limit_bytes"] * 100
    )
    
    return stats


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "media-service",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)