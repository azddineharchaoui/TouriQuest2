"""
File service for handling message attachments and media uploads
"""

import os
import uuid
import hashlib
import mimetypes
from datetime import datetime
from typing import Optional, Dict, Any, List
from pathlib import Path
import aiofiles
import aiofiles.os
from PIL import Image
import ffmpeg
import logging

from fastapi import UploadFile, HTTPException
from app.core.config import settings

logger = logging.getLogger(__name__)


class FileService:
    """Service for handling file uploads and management"""
    
    def __init__(self):
        self.upload_dir = Path(settings.CHAT_FILE_UPLOAD_PATH)
        self.max_file_size = settings.CHAT_MAX_FILE_SIZE
        self.allowed_types = settings.CHAT_ALLOWED_FILE_TYPES
        self.image_thumbnails = settings.CHAT_GENERATE_THUMBNAILS
    
    async def initialize(self):
        """Initialize file service"""
        # Create upload directory if it doesn't exist
        await aiofiles.os.makedirs(self.upload_dir, exist_ok=True)
        
        # Create subdirectories
        for subdir in ["messages", "thumbnails", "temp"]:
            await aiofiles.os.makedirs(self.upload_dir / subdir, exist_ok=True)
    
    async def upload_file(
        self,
        file: UploadFile,
        folder: str,
        allowed_types: Optional[List[str]] = None,
        generate_thumbnail: bool = True
    ) -> Dict[str, Any]:
        """Upload a file and return file information"""
        try:
            # Validate file
            await self._validate_file(file, allowed_types)
            
            # Generate unique filename
            file_id = str(uuid.uuid4())
            file_extension = Path(file.filename).suffix.lower()
            filename = f"{file_id}{file_extension}"
            
            # Create folder path
            folder_path = self.upload_dir / folder
            await aiofiles.os.makedirs(folder_path, exist_ok=True)
            
            # Save file
            file_path = folder_path / filename
            
            async with aiofiles.open(file_path, 'wb') as f:
                content = await file.read()
                await f.write(content)
            
            # Get file info
            file_size = len(content)
            file_type = file.content_type or mimetypes.guess_type(filename)[0] or "application/octet-stream"
            file_hash = hashlib.sha256(content).hexdigest()
            
            # Generate thumbnail for images
            thumbnail_url = None
            if generate_thumbnail and self._is_image(file_type):
                thumbnail_url = await self._generate_thumbnail(file_path, file_id)
            
            # Get file URL
            file_url = f"{settings.BASE_URL}/api/files/{folder}/{filename}"
            
            file_info = {
                "id": file_id,
                "filename": file.filename,
                "stored_filename": filename,
                "size": file_size,
                "type": file_type,
                "url": file_url,
                "thumbnail_url": thumbnail_url,
                "hash": file_hash,
                "upload_date": datetime.utcnow().isoformat(),
                "folder": folder
            }
            
            # Process media files
            if self._is_video(file_type):
                media_info = await self._get_video_info(file_path)
                file_info.update(media_info)
            elif self._is_image(file_type):
                image_info = await self._get_image_info(file_path)
                file_info.update(image_info)
            
            return file_info
            
        except Exception as e:
            logger.error(f"Error uploading file: {e}")
            raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")
    
    async def delete_file(self, folder: str, filename: str) -> bool:
        """Delete a file"""
        try:
            file_path = self.upload_dir / folder / filename
            
            if await aiofiles.os.path.exists(file_path):
                await aiofiles.os.remove(file_path)
                
                # Delete thumbnail if exists
                file_id = Path(filename).stem
                thumbnail_path = self.upload_dir / "thumbnails" / f"{file_id}_thumb.jpg"
                if await aiofiles.os.path.exists(thumbnail_path):
                    await aiofiles.os.remove(thumbnail_path)
                
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error deleting file: {e}")
            return False
    
    async def get_file_info(self, folder: str, filename: str) -> Optional[Dict[str, Any]]:
        """Get file information"""
        try:
            file_path = self.upload_dir / folder / filename
            
            if not await aiofiles.os.path.exists(file_path):
                return None
            
            stat = await aiofiles.os.stat(file_path)
            file_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"
            
            return {
                "filename": filename,
                "size": stat.st_size,
                "type": file_type,
                "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "url": f"{settings.BASE_URL}/api/files/{folder}/{filename}"
            }
            
        except Exception as e:
            logger.error(f"Error getting file info: {e}")
            return None
    
    async def scan_virus(self, file_path: Path) -> bool:
        """Scan file for viruses (placeholder for actual antivirus integration)"""
        # In a real implementation, this would integrate with antivirus software
        # For now, just check file size and basic validation
        try:
            stat = await aiofiles.os.stat(file_path)
            
            # Basic checks
            if stat.st_size > self.max_file_size:
                return False
            
            # Check for suspicious patterns in filename
            suspicious_extensions = ['.exe', '.scr', '.bat', '.cmd', '.com', '.pif']
            if any(str(file_path).lower().endswith(ext) for ext in suspicious_extensions):
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Error scanning file: {e}")
            return False
    
    # Private methods
    
    async def _validate_file(self, file: UploadFile, allowed_types: Optional[List[str]] = None):
        """Validate file before upload"""
        # Check file size
        if hasattr(file, 'size') and file.size > self.max_file_size:
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Maximum size: {self.max_file_size} bytes"
            )
        
        # Check file type
        file_type = file.content_type or mimetypes.guess_type(file.filename)[0]
        check_types = allowed_types or self.allowed_types
        
        if check_types and file_type not in check_types:
            raise HTTPException(
                status_code=400,
                detail=f"File type not allowed. Allowed types: {check_types}"
            )
        
        # Check filename
        if not file.filename or len(file.filename) > 255:
            raise HTTPException(
                status_code=400,
                detail="Invalid filename"
            )
    
    def _is_image(self, file_type: str) -> bool:
        """Check if file is an image"""
        return file_type.startswith('image/')
    
    def _is_video(self, file_type: str) -> bool:
        """Check if file is a video"""
        return file_type.startswith('video/')
    
    def _is_audio(self, file_type: str) -> bool:
        """Check if file is audio"""
        return file_type.startswith('audio/')
    
    async def _generate_thumbnail(self, file_path: Path, file_id: str) -> Optional[str]:
        """Generate thumbnail for image"""
        try:
            thumbnail_filename = f"{file_id}_thumb.jpg"
            thumbnail_path = self.upload_dir / "thumbnails" / thumbnail_filename
            
            # Use PIL to create thumbnail
            with Image.open(file_path) as img:
                # Convert to RGB if necessary
                if img.mode in ('RGBA', 'LA', 'P'):
                    img = img.convert('RGB')
                
                # Create thumbnail
                img.thumbnail((200, 200), Image.Resampling.LANCZOS)
                img.save(thumbnail_path, 'JPEG', quality=85)
            
            return f"{settings.BASE_URL}/api/files/thumbnails/{thumbnail_filename}"
            
        except Exception as e:
            logger.error(f"Error generating thumbnail: {e}")
            return None
    
    async def _get_image_info(self, file_path: Path) -> Dict[str, Any]:
        """Get image metadata"""
        try:
            with Image.open(file_path) as img:
                return {
                    "width": img.width,
                    "height": img.height,
                    "format": img.format,
                    "mode": img.mode
                }
        except Exception as e:
            logger.error(f"Error getting image info: {e}")
            return {}
    
    async def _get_video_info(self, file_path: Path) -> Dict[str, Any]:
        """Get video metadata"""
        try:
            probe = ffmpeg.probe(str(file_path))
            video_stream = next((stream for stream in probe['streams'] if stream['codec_type'] == 'video'), None)
            
            if video_stream:
                return {
                    "width": int(video_stream.get('width', 0)),
                    "height": int(video_stream.get('height', 0)),
                    "duration": float(video_stream.get('duration', 0)),
                    "codec": video_stream.get('codec_name'),
                    "bitrate": int(video_stream.get('bit_rate', 0))
                }
        except Exception as e:
            logger.error(f"Error getting video info: {e}")
        
        return {}


# Translation service
class TranslationService:
    """Service for message translation"""
    
    def __init__(self):
        self.enabled = settings.CHAT_TRANSLATION_ENABLED
        self.api_key = settings.GOOGLE_TRANSLATE_API_KEY
        self.supported_languages = [
            'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh',
            'ar', 'hi', 'tr', 'pl', 'nl', 'sv', 'da', 'no', 'fi'
        ]
    
    async def initialize(self):
        """Initialize translation service"""
        if self.enabled and not self.api_key:
            logger.warning("Translation enabled but no API key provided")
            self.enabled = False
    
    async def translate_text(self, text: str, target_language: str) -> str:
        """Translate text to target language"""
        if not self.enabled:
            raise HTTPException(status_code=503, detail="Translation service not available")
        
        if target_language not in self.supported_languages:
            raise HTTPException(status_code=400, detail="Unsupported target language")
        
        try:
            # In a real implementation, this would call Google Translate API
            # For now, return a placeholder
            return f"[Translated to {target_language}] {text}"
            
        except Exception as e:
            logger.error(f"Error translating text: {e}")
            raise HTTPException(status_code=500, detail="Translation failed")
    
    async def detect_language(self, text: str) -> str:
        """Detect language of text"""
        if not self.enabled:
            return "unknown"
        
        try:
            # Placeholder implementation
            return "en"
        except Exception as e:
            logger.error(f"Error detecting language: {e}")
            return "unknown"


# Notification service placeholder
class NotificationService:
    """Service for sending notifications"""
    
    def __init__(self):
        self.push_enabled = settings.PUSH_NOTIFICATIONS_ENABLED
        self.email_enabled = settings.EMAIL_NOTIFICATIONS_ENABLED
        self.sms_enabled = settings.SMS_NOTIFICATIONS_ENABLED
    
    async def initialize(self):
        """Initialize notification service"""
        pass
    
    async def send_message_notification(
        self,
        user_id: str,
        sender_id: str,
        message_content: str,
        conversation_id: str
    ):
        """Send notification for new message"""
        try:
            # This would integrate with push notification services
            logger.info(f"Sending message notification to {user_id} from {sender_id}")
            
        except Exception as e:
            logger.error(f"Error sending message notification: {e}")
    
    async def send_conversation_notification(
        self,
        user_id: str,
        actor_id: str,
        conversation_id: str,
        action: str
    ):
        """Send notification for conversation events"""
        try:
            logger.info(f"Sending conversation notification to {user_id}: {action}")
            
        except Exception as e:
            logger.error(f"Error sending conversation notification: {e}")