"""
Media service for file upload processing, image optimization, and storage management
"""

import os
import uuid
import aiofiles
import aiofiles.os
from typing import Optional, Dict, Any, List, Tuple
from pathlib import Path
from datetime import datetime
import hashlib
import mimetypes
from PIL import Image, ImageOps
import io
import asyncio
from contextlib import asynccontextmanager

from app.core.config import settings
from app.schemas import POIImageCreate


class MediaService:
    """Service for handling media uploads and processing"""
    
    ALLOWED_IMAGE_TYPES = {
        'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'
    }
    
    ALLOWED_AUDIO_TYPES = {
        'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a'
    }
    
    ALLOWED_VIDEO_TYPES = {
        'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'
    }
    
    ALLOWED_MODEL_TYPES = {
        'model/gltf+json', 'model/gltf-binary', 'application/octet-stream'
    }
    
    # Image size configurations
    IMAGE_SIZES = {
        'thumbnail': (300, 200),
        'medium': (800, 600),
        'large': (1200, 900),
        'hero': (1920, 1080)
    }
    
    def __init__(self):
        self.base_upload_path = Path(settings.media_upload_path)
        self.base_url = settings.media_base_url
        self.max_file_size = settings.max_upload_size_mb * 1024 * 1024  # Convert to bytes
        
        # Ensure upload directories exist
        asyncio.create_task(self._ensure_directories())
    
    async def _ensure_directories(self):
        """Ensure all necessary upload directories exist"""
        directories = [
            self.base_upload_path / 'images' / 'originals',
            self.base_upload_path / 'images' / 'thumbnails',
            self.base_upload_path / 'images' / 'processed',
            self.base_upload_path / 'audio',
            self.base_upload_path / 'video',
            self.base_upload_path / 'models',
            self.base_upload_path / 'temp'
        ]
        
        for directory in directories:
            await aiofiles.os.makedirs(directory, exist_ok=True)
    
    def _generate_filename(self, original_filename: str, content_type: str) -> str:
        """Generate a unique filename"""
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        unique_id = str(uuid.uuid4())[:8]
        
        # Get file extension from content type or original filename
        extension = mimetypes.guess_extension(content_type)
        if not extension:
            extension = Path(original_filename).suffix
        
        return f"{timestamp}_{unique_id}{extension}"
    
    def _get_file_hash(self, content: bytes) -> str:
        """Generate hash for file content"""
        return hashlib.sha256(content).hexdigest()
    
    async def _validate_file(self, content: bytes, content_type: str, max_size: Optional[int] = None) -> Dict[str, Any]:
        """Validate uploaded file"""
        validation = {
            'valid': True,
            'errors': [],
            'file_size': len(content),
            'content_type': content_type
        }
        
        # Check file size
        max_allowed = max_size or self.max_file_size
        if len(content) > max_allowed:
            validation['valid'] = False
            validation['errors'].append(f"File size {len(content)} exceeds maximum {max_allowed} bytes")
        
        # Check content type
        allowed_types = (
            self.ALLOWED_IMAGE_TYPES | 
            self.ALLOWED_AUDIO_TYPES | 
            self.ALLOWED_VIDEO_TYPES | 
            self.ALLOWED_MODEL_TYPES
        )
        
        if content_type not in allowed_types:
            validation['valid'] = False
            validation['errors'].append(f"Content type {content_type} not allowed")
        
        # Basic file content validation
        if content_type.startswith('image/'):
            try:
                Image.open(io.BytesIO(content))
            except Exception as e:
                validation['valid'] = False
                validation['errors'].append(f"Invalid image file: {str(e)}")
        
        return validation
    
    async def upload_image(self, 
                          file_content: bytes, 
                          filename: str, 
                          content_type: str,
                          poi_id: str,
                          alt_text: Optional[str] = None,
                          caption: Optional[str] = None,
                          generate_sizes: bool = True) -> Dict[str, Any]:
        """Upload and process image"""
        
        # Validate file
        validation = await self._validate_file(file_content, content_type)
        if not validation['valid']:
            return {
                'success': False,
                'errors': validation['errors']
            }
        
        try:
            # Generate unique filename
            new_filename = self._generate_filename(filename, content_type)
            file_hash = self._get_file_hash(file_content)
            
            # Save original image
            original_path = self.base_upload_path / 'images' / 'originals' / new_filename
            async with aiofiles.open(original_path, 'wb') as f:
                await f.write(file_content)
            
            # Process image and generate different sizes
            image_urls = await self._process_image(file_content, new_filename, generate_sizes)
            
            # Create image metadata
            image_metadata = {
                'original_filename': filename,
                'stored_filename': new_filename,
                'file_hash': file_hash,
                'file_size': len(file_content),
                'content_type': content_type,
                'urls': image_urls,
                'poi_id': poi_id,
                'alt_text': alt_text,
                'caption': caption
            }
            
            return {
                'success': True,
                'data': image_metadata
            }
            
        except Exception as e:
            return {
                'success': False,
                'errors': [f"Upload failed: {str(e)}"]
            }
    
    async def _process_image(self, image_content: bytes, filename: str, generate_sizes: bool = True) -> Dict[str, str]:
        """Process image and generate different sizes"""
        urls = {}
        
        try:
            # Load image
            image = Image.open(io.BytesIO(image_content))
            
            # Convert to RGB if necessary (for PNG with transparency)
            if image.mode in ('RGBA', 'LA', 'P'):
                # Create white background
                background = Image.new('RGB', image.size, (255, 255, 255))
                if image.mode == 'P':
                    image = image.convert('RGBA')
                background.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
                image = background
            
            # Generate different sizes
            if generate_sizes:
                for size_name, (width, height) in self.IMAGE_SIZES.items():
                    processed_image = ImageOps.fit(image, (width, height), Image.Resampling.LANCZOS)
                    
                    # Save processed image
                    size_filename = f"{size_name}_{filename}"
                    processed_path = self.base_upload_path / 'images' / 'processed' / size_filename
                    
                    # Save as JPEG for consistency and size optimization
                    processed_image.save(processed_path, 'JPEG', quality=85, optimize=True)
                    
                    # Generate URL
                    urls[size_name] = f"{self.base_url}/images/processed/{size_filename}"
            
            # Original URL
            urls['original'] = f"{self.base_url}/images/originals/{filename}"
            
        except Exception as e:
            # If processing fails, at least provide original URL
            urls['original'] = f"{self.base_url}/images/originals/{filename}"
            print(f"Image processing error: {e}")
        
        return urls
    
    async def upload_audio(self, 
                          file_content: bytes, 
                          filename: str, 
                          content_type: str,
                          poi_id: str,
                          metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Upload audio file"""
        
        # Validate file
        validation = await self._validate_file(file_content, content_type)
        if not validation['valid']:
            return {
                'success': False,
                'errors': validation['errors']
            }
        
        try:
            # Generate unique filename
            new_filename = self._generate_filename(filename, content_type)
            file_hash = self._get_file_hash(file_content)
            
            # Save audio file
            audio_path = self.base_upload_path / 'audio' / new_filename
            async with aiofiles.open(audio_path, 'wb') as f:
                await f.write(file_content)
            
            # Create audio metadata
            audio_metadata = {
                'original_filename': filename,
                'stored_filename': new_filename,
                'file_hash': file_hash,
                'file_size': len(file_content),
                'content_type': content_type,
                'url': f"{self.base_url}/audio/{new_filename}",
                'poi_id': poi_id,
                **(metadata or {})
            }
            
            return {
                'success': True,
                'data': audio_metadata
            }
            
        except Exception as e:
            return {
                'success': False,
                'errors': [f"Audio upload failed: {str(e)}"]
            }
    
    async def upload_video(self, 
                          file_content: bytes, 
                          filename: str, 
                          content_type: str,
                          poi_id: str,
                          metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Upload video file"""
        
        # Validate file
        validation = await self._validate_file(file_content, content_type)
        if not validation['valid']:
            return {
                'success': False,
                'errors': validation['errors']
            }
        
        try:
            # Generate unique filename
            new_filename = self._generate_filename(filename, content_type)
            file_hash = self._get_file_hash(file_content)
            
            # Save video file
            video_path = self.base_upload_path / 'video' / new_filename
            async with aiofiles.open(video_path, 'wb') as f:
                await f.write(file_content)
            
            # Create video metadata
            video_metadata = {
                'original_filename': filename,
                'stored_filename': new_filename,
                'file_hash': file_hash,
                'file_size': len(file_content),
                'content_type': content_type,
                'url': f"{self.base_url}/video/{new_filename}",
                'poi_id': poi_id,
                **(metadata or {})
            }
            
            return {
                'success': True,
                'data': video_metadata
            }
            
        except Exception as e:
            return {
                'success': False,
                'errors': [f"Video upload failed: {str(e)}"]
            }
    
    async def upload_3d_model(self, 
                             file_content: bytes, 
                             filename: str, 
                             content_type: str,
                             poi_id: str,
                             metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Upload 3D model file"""
        
        # Validate file
        validation = await self._validate_file(file_content, content_type)
        if not validation['valid']:
            return {
                'success': False,
                'errors': validation['errors']
            }
        
        try:
            # Generate unique filename
            new_filename = self._generate_filename(filename, content_type)
            file_hash = self._get_file_hash(file_content)
            
            # Save model file
            model_path = self.base_upload_path / 'models' / new_filename
            async with aiofiles.open(model_path, 'wb') as f:
                await f.write(file_content)
            
            # Create model metadata
            model_metadata = {
                'original_filename': filename,
                'stored_filename': new_filename,
                'file_hash': file_hash,
                'file_size': len(file_content),
                'content_type': content_type,
                'url': f"{self.base_url}/models/{new_filename}",
                'poi_id': poi_id,
                **(metadata or {})
            }
            
            return {
                'success': True,
                'data': model_metadata
            }
            
        except Exception as e:
            return {
                'success': False,
                'errors': [f"Model upload failed: {str(e)}"]
            }
    
    async def delete_file(self, file_path: str) -> bool:
        """Delete a file from storage"""
        try:
            # Extract relative path from URL
            if file_path.startswith(self.base_url):
                relative_path = file_path.replace(self.base_url, '').lstrip('/')
            else:
                relative_path = file_path
            
            full_path = self.base_upload_path / relative_path
            
            if await aiofiles.os.path.exists(full_path):
                await aiofiles.os.remove(full_path)
                return True
            
            return False
            
        except Exception as e:
            print(f"File deletion error: {e}")
            return False
    
    async def get_file_info(self, file_path: str) -> Optional[Dict[str, Any]]:
        """Get information about a file"""
        try:
            # Extract relative path from URL
            if file_path.startswith(self.base_url):
                relative_path = file_path.replace(self.base_url, '').lstrip('/')
            else:
                relative_path = file_path
            
            full_path = self.base_upload_path / relative_path
            
            if await aiofiles.os.path.exists(full_path):
                stat = await aiofiles.os.stat(full_path)
                
                return {
                    'exists': True,
                    'size': stat.st_size,
                    'created_at': datetime.fromtimestamp(stat.st_ctime),
                    'modified_at': datetime.fromtimestamp(stat.st_mtime),
                    'content_type': mimetypes.guess_type(str(full_path))[0]
                }
            
            return {'exists': False}
            
        except Exception as e:
            print(f"File info error: {e}")
            return None
    
    async def cleanup_temp_files(self, older_than_hours: int = 24) -> int:
        """Clean up temporary files older than specified hours"""
        try:
            temp_dir = self.base_upload_path / 'temp'
            if not await aiofiles.os.path.exists(temp_dir):
                return 0
            
            cutoff_time = datetime.utcnow().timestamp() - (older_than_hours * 3600)
            cleaned_count = 0
            
            for item in temp_dir.iterdir():
                if item.is_file():
                    stat = await aiofiles.os.stat(item)
                    if stat.st_mtime < cutoff_time:
                        await aiofiles.os.remove(item)
                        cleaned_count += 1
            
            return cleaned_count
            
        except Exception as e:
            print(f"Cleanup error: {e}")
            return 0
    
    async def get_storage_stats(self) -> Dict[str, Any]:
        """Get storage statistics"""
        try:
            stats = {
                'images': {'count': 0, 'total_size': 0},
                'audio': {'count': 0, 'total_size': 0},
                'video': {'count': 0, 'total_size': 0},
                'models': {'count': 0, 'total_size': 0}
            }
            
            for media_type in ['images', 'audio', 'video', 'models']:
                media_dir = self.base_upload_path / media_type
                if await aiofiles.os.path.exists(media_dir):
                    for item in media_dir.rglob('*'):
                        if item.is_file():
                            stat = await aiofiles.os.stat(item)
                            stats[media_type]['count'] += 1
                            stats[media_type]['total_size'] += stat.st_size
            
            return stats
            
        except Exception as e:
            print(f"Storage stats error: {e}")
            return {}
    
    def get_image_url(self, filename: str, size: str = 'medium') -> str:
        """Get URL for an image of specific size"""
        if size in self.IMAGE_SIZES:
            return f"{self.base_url}/images/processed/{size}_{filename}"
        else:
            return f"{self.base_url}/images/originals/{filename}"
    
    def get_audio_url(self, filename: str) -> str:
        """Get URL for an audio file"""
        return f"{self.base_url}/audio/{filename}"
    
    def get_video_url(self, filename: str) -> str:
        """Get URL for a video file"""
        return f"{self.base_url}/video/{filename}"
    
    def get_model_url(self, filename: str) -> str:
        """Get URL for a 3D model file"""
        return f"{self.base_url}/models/{filename}"


# Global media service instance
media_service = MediaService()