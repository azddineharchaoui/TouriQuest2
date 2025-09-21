"""
Content management service for multimedia POI content.
Orchestrates audio and AR processing, handles uploads, and manages content lifecycle.
"""

import os
import uuid
import json
import logging
from pathlib import Path
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy.orm import Session
from fastapi import UploadFile

from app.core.config import get_settings
from app.core.database import get_db
from app.models import (
    AudioGuide, ARExperience, MediaFile, ContentVersion,
    AudioDownloadSession, ARCompatibilityReport
)
from app.services.base import BaseService
from app.services.multimedia.audio_processor import AudioProcessor
from app.services.multimedia.ar_processor import ARProcessor

logger = logging.getLogger(__name__)


@dataclass
class ContentUploadResult:
    """Result of content upload operation."""
    success: bool
    media_file_id: Optional[str] = None
    file_path: Optional[str] = None
    content_type: Optional[str] = None
    file_size_bytes: Optional[int] = None
    processing_status: Optional[str] = None
    error_message: Optional[str] = None


@dataclass
class ContentProcessingResult:
    """Result of content processing operation."""
    success: bool
    content_id: Optional[str] = None
    content_type: Optional[str] = None
    processing_details: Optional[Dict] = None
    cdn_urls: Optional[List[str]] = None
    error_message: Optional[str] = None


class ContentManager(BaseService):
    """Service for managing multimedia POI content."""
    
    def __init__(self):
        super().__init__()
        self.settings = get_settings()
        self.upload_dir = Path(self.settings.UPLOAD_DIRECTORY)
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize processors
        self.audio_processor = AudioProcessor()
        self.ar_processor = ARProcessor()
        
        # Supported file types
        self.supported_audio_types = {
            "audio/mpeg": ".mp3",
            "audio/wav": ".wav",
            "audio/x-wav": ".wav",
            "audio/flac": ".flac",
            "audio/ogg": ".ogg",
            "audio/mp4": ".m4a"
        }
        
        self.supported_model_types = {
            "model/gltf-binary": ".glb",
            "model/gltf+json": ".gltf",
            "application/octet-stream": ".glb",  # Common for GLB files
            "model/obj": ".obj",
            "model/fbx": ".fbx"
        }
        
        self.supported_image_types = {
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/tga": ".tga",
            "image/bmp": ".bmp"
        }
    
    async def upload_audio_guide(
        self,
        file: UploadFile,
        poi_id: str,
        language_code: str,
        title: str,
        description: Optional[str] = None,
        narrator_name: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> ContentUploadResult:
        """
        Upload and process an audio guide file.
        
        Args:
            file: Uploaded audio file
            poi_id: POI identifier
            language_code: Language code for the audio guide
            title: Audio guide title
            description: Optional description
            narrator_name: Optional narrator name
            user_id: Optional user identifier
            
        Returns:
            ContentUploadResult with upload details
        """
        try:
            # Validate file type
            if file.content_type not in self.supported_audio_types:
                return ContentUploadResult(
                    success=False,
                    error_message=f"Unsupported audio format: {file.content_type}"
                )
            
            # Generate unique filename
            file_id = str(uuid.uuid4())
            file_extension = self.supported_audio_types[file.content_type]
            filename = f"audio_{file_id}{file_extension}"
            file_path = self.upload_dir / filename
            
            # Save uploaded file
            content = await file.read()
            with open(file_path, "wb") as f:
                f.write(content)
            
            # Create media file record
            db = next(get_db())
            media_file = MediaFile(
                original_filename=file.filename,
                stored_filename=filename,
                content_type=file.content_type,
                file_extension=file_extension,
                storage_path=str(file_path),
                file_size_bytes=len(content),
                media_type="audio",
                processing_status="pending",
                uploaded_by=user_id,
                upload_session_id=file_id
            )
            
            db.add(media_file)
            db.commit()
            db.refresh(media_file)
            
            # Start background processing
            await self._process_audio_guide_async(
                str(media_file.id),
                str(file_path),
                poi_id,
                language_code,
                title,
                description,
                narrator_name
            )
            
            return ContentUploadResult(
                success=True,
                media_file_id=str(media_file.id),
                file_path=str(file_path),
                content_type=file.content_type,
                file_size_bytes=len(content),
                processing_status="pending"
            )
            
        except Exception as e:
            logger.error(f"Error uploading audio guide: {str(e)}")
            return ContentUploadResult(
                success=False,
                error_message=f"Upload failed: {str(e)}"
            )
    
    async def upload_ar_experience(
        self,
        model_file: UploadFile,
        texture_files: List[UploadFile],
        poi_id: str,
        name: str,
        description: Optional[str] = None,
        instructions: Optional[str] = None,
        trigger_radius: float = 50.0,
        optimization_level: str = "medium",
        user_id: Optional[str] = None
    ) -> ContentUploadResult:
        """
        Upload and process AR experience files.
        
        Args:
            model_file: 3D model file
            texture_files: List of texture files
            poi_id: POI identifier
            name: AR experience name
            description: Optional description
            instructions: Optional user instructions
            trigger_radius: Trigger radius in meters
            optimization_level: Processing optimization level
            user_id: Optional user identifier
            
        Returns:
            ContentUploadResult with upload details
        """
        try:
            # Validate model file type
            if model_file.content_type not in self.supported_model_types:
                return ContentUploadResult(
                    success=False,
                    error_message=f"Unsupported model format: {model_file.content_type}"
                )
            
            # Validate texture files
            for texture_file in texture_files:
                if texture_file.content_type not in self.supported_image_types:
                    return ContentUploadResult(
                        success=False,
                        error_message=f"Unsupported texture format: {texture_file.content_type}"
                    )
            
            # Generate unique identifiers
            session_id = str(uuid.uuid4())
            
            # Save model file
            model_file_id = str(uuid.uuid4())
            model_extension = self.supported_model_types[model_file.content_type]
            model_filename = f"model_{model_file_id}{model_extension}"
            model_path = self.upload_dir / model_filename
            
            model_content = await model_file.read()
            with open(model_path, "wb") as f:
                f.write(model_content)
            
            # Save texture files
            texture_paths = []
            texture_file_ids = []
            
            for i, texture_file in enumerate(texture_files):
                texture_file_id = str(uuid.uuid4())
                texture_extension = self.supported_image_types[texture_file.content_type]
                texture_filename = f"texture_{texture_file_id}_{i:02d}{texture_extension}"
                texture_path = self.upload_dir / texture_filename
                
                texture_content = await texture_file.read()
                with open(texture_path, "wb") as f:
                    f.write(texture_content)
                
                texture_paths.append(str(texture_path))
                texture_file_ids.append(texture_file_id)
            
            # Create media file records
            db = next(get_db())
            
            # Model media file
            model_media_file = MediaFile(
                original_filename=model_file.filename,
                stored_filename=model_filename,
                content_type=model_file.content_type,
                file_extension=model_extension,
                storage_path=str(model_path),
                file_size_bytes=len(model_content),
                media_type="model",
                processing_status="pending",
                uploaded_by=user_id,
                upload_session_id=session_id
            )
            
            db.add(model_media_file)
            db.commit()
            db.refresh(model_media_file)
            
            # Texture media files
            texture_media_files = []
            for i, (texture_path, texture_file_id) in enumerate(zip(texture_paths, texture_file_ids)):
                texture_media_file = MediaFile(
                    original_filename=texture_files[i].filename,
                    stored_filename=Path(texture_path).name,
                    content_type=texture_files[i].content_type,
                    file_extension=self.supported_image_types[texture_files[i].content_type],
                    storage_path=texture_path,
                    file_size_bytes=len(await texture_files[i].read()),
                    media_type="texture",
                    processing_status="pending",
                    uploaded_by=user_id,
                    upload_session_id=session_id
                )
                
                db.add(texture_media_file)
                texture_media_files.append(texture_media_file)
            
            db.commit()
            
            # Start background processing
            await self._process_ar_experience_async(
                str(model_media_file.id),
                [str(tmf.id) for tmf in texture_media_files],
                str(model_path),
                texture_paths,
                poi_id,
                name,
                description,
                instructions,
                trigger_radius,
                optimization_level
            )
            
            return ContentUploadResult(
                success=True,
                media_file_id=str(model_media_file.id),
                file_path=str(model_path),
                content_type=model_file.content_type,
                file_size_bytes=len(model_content),
                processing_status="pending"
            )
            
        except Exception as e:
            logger.error(f"Error uploading AR experience: {str(e)}")
            return ContentUploadResult(
                success=False,
                error_message=f"Upload failed: {str(e)}"
            )
    
    async def _process_audio_guide_async(
        self,
        media_file_id: str,
        file_path: str,
        poi_id: str,
        language_code: str,
        title: str,
        description: Optional[str],
        narrator_name: Optional[str]
    ) -> None:
        """Process audio guide asynchronously."""
        try:
            db = next(get_db())
            
            # Update processing status
            media_file = db.query(MediaFile).filter(MediaFile.id == media_file_id).first()
            if media_file:
                media_file.processing_status = "processing"
                db.commit()
            
            # Process audio
            processing_result = await self.audio_processor.process_audio_guide(
                file_path,
                language_code,
                quality_level="medium"
            )
            
            if processing_result.success:
                # Create audio guide record
                audio_guide = AudioGuide(
                    poi_id=poi_id,
                    language_code=language_code,
                    title=title,
                    description=description,
                    original_audio_url=file_path,
                    processed_audio_url=processing_result.file_path,
                    transcript="",  # Would be generated separately
                    duration_seconds=int(processing_result.duration_seconds or 0),
                    file_size_bytes=processing_result.file_size_bytes,
                    narrator_name=narrator_name,
                    segments_metadata=processing_result.segments,
                    moderation_status="pending"
                )
                
                db.add(audio_guide)
                
                # Update media file
                if media_file:
                    media_file.processing_status = "completed"
                    media_file.processed_at = datetime.utcnow()
                    media_file.processed_variants = [processing_result.file_path]
                
                db.commit()
                logger.info(f"Audio guide processing completed for {media_file_id}")
                
            else:
                # Update media file with error
                if media_file:
                    media_file.processing_status = "failed"
                    media_file.processing_error = processing_result.error_message
                
                db.commit()
                logger.error(f"Audio guide processing failed for {media_file_id}: {processing_result.error_message}")
                
        except Exception as e:
            logger.error(f"Error in async audio processing: {str(e)}")
            
            # Update media file with error
            try:
                db = next(get_db())
                media_file = db.query(MediaFile).filter(MediaFile.id == media_file_id).first()
                if media_file:
                    media_file.processing_status = "failed"
                    media_file.processing_error = str(e)
                    db.commit()
            except Exception as db_error:
                logger.error(f"Error updating media file status: {str(db_error)}")
    
    async def _process_ar_experience_async(
        self,
        model_media_file_id: str,
        texture_media_file_ids: List[str],
        model_path: str,
        texture_paths: List[str],
        poi_id: str,
        name: str,
        description: Optional[str],
        instructions: Optional[str],
        trigger_radius: float,
        optimization_level: str
    ) -> None:
        """Process AR experience asynchronously."""
        try:
            db = next(get_db())
            
            # Update processing status
            media_file = db.query(MediaFile).filter(MediaFile.id == model_media_file_id).first()
            if media_file:
                media_file.processing_status = "processing"
                db.commit()
            
            # Process AR model
            processing_result = await self.ar_processor.process_ar_model(
                model_path,
                texture_paths,
                optimization_level
            )
            
            if processing_result.success:
                # Create AR experience record
                ar_experience = ARExperience(
                    poi_id=poi_id,
                    name=name,
                    description=description,
                    instructions=instructions,
                    model_url=processing_result.optimized_model_path,
                    texture_urls=processing_result.texture_paths,
                    model_format="glb",
                    polygon_count=processing_result.metadata.get("model_info", {}).get("polygon_count", 0),
                    total_file_size_mb=processing_result.metadata.get("performance", {}).get("total_size_mb", 0),
                    optimization_level=optimization_level,
                    trigger_radius_meters=trigger_radius,
                    min_ios_version=processing_result.compatibility_info.get("ios", {}).get("recommended_version", "12.0"),
                    min_android_version=processing_result.compatibility_info.get("android", {}).get("recommended_version", "7.0"),
                    min_ram_mb=processing_result.compatibility_info.get("hardware_requirements", {}).get("min_ram_mb", 2048),
                    moderation_status="pending"
                )
                
                db.add(ar_experience)
                
                # Update media file
                if media_file:
                    media_file.processing_status = "completed"
                    media_file.processed_at = datetime.utcnow()
                    media_file.processed_variants = [processing_result.optimized_model_path] + processing_result.texture_paths
                
                db.commit()
                logger.info(f"AR experience processing completed for {model_media_file_id}")
                
            else:
                # Update media file with error
                if media_file:
                    media_file.processing_status = "failed"
                    media_file.processing_error = processing_result.error_message
                
                db.commit()
                logger.error(f"AR experience processing failed for {model_media_file_id}: {processing_result.error_message}")
                
        except Exception as e:
            logger.error(f"Error in async AR processing: {str(e)}")
            
            # Update media file with error
            try:
                db = next(get_db())
                media_file = db.query(MediaFile).filter(MediaFile.id == model_media_file_id).first()
                if media_file:
                    media_file.processing_status = "failed"
                    media_file.processing_error = str(e)
                    db.commit()
            except Exception as db_error:
                logger.error(f"Error updating media file status: {str(db_error)}")
    
    async def get_content_processing_status(self, media_file_id: str) -> Dict[str, Any]:
        """Get the processing status of uploaded content."""
        try:
            db = next(get_db())
            media_file = db.query(MediaFile).filter(MediaFile.id == media_file_id).first()
            
            if not media_file:
                return {"success": False, "error": "Media file not found"}
            
            return {
                "success": True,
                "media_file_id": str(media_file.id),
                "original_filename": media_file.original_filename,
                "content_type": media_file.content_type,
                "media_type": media_file.media_type,
                "processing_status": media_file.processing_status,
                "file_size_bytes": media_file.file_size_bytes,
                "processed_variants": media_file.processed_variants or [],
                "processing_error": media_file.processing_error,
                "created_at": media_file.created_at.isoformat() if media_file.created_at else None,
                "processed_at": media_file.processed_at.isoformat() if media_file.processed_at else None
            }
            
        except Exception as e:
            logger.error(f"Error getting processing status: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def list_poi_multimedia_content(self, poi_id: str) -> Dict[str, Any]:
        """List all multimedia content for a POI."""
        try:
            db = next(get_db())
            
            # Get audio guides
            audio_guides = db.query(AudioGuide).filter(
                AudioGuide.poi_id == poi_id,
                AudioGuide.is_active == True
            ).all()
            
            # Get AR experiences
            ar_experiences = db.query(ARExperience).filter(
                ARExperience.poi_id == poi_id,
                ARExperience.is_active == True
            ).all()
            
            return {
                "success": True,
                "poi_id": poi_id,
                "audio_guides": [
                    {
                        "id": str(ag.id),
                        "language_code": ag.language_code,
                        "title": ag.title,
                        "description": ag.description,
                        "duration_seconds": ag.duration_seconds,
                        "narrator_name": ag.narrator_name,
                        "download_count": ag.download_count,
                        "play_count": ag.play_count,
                        "moderation_status": ag.moderation_status,
                        "created_at": ag.created_at.isoformat() if ag.created_at else None
                    }
                    for ag in audio_guides
                ],
                "ar_experiences": [
                    {
                        "id": str(ar.id),
                        "name": ar.name,
                        "description": ar.description,
                        "polygon_count": ar.polygon_count,
                        "total_file_size_mb": ar.total_file_size_mb,
                        "optimization_level": ar.optimization_level,
                        "usage_count": ar.usage_count,
                        "moderation_status": ar.moderation_status,
                        "created_at": ar.created_at.isoformat() if ar.created_at else None
                    }
                    for ar in ar_experiences
                ]
            }
            
        except Exception as e:
            logger.error(f"Error listing POI multimedia content: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def delete_multimedia_content(
        self,
        content_type: str,
        content_id: str,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Delete multimedia content."""
        try:
            db = next(get_db())
            
            if content_type == "audio_guide":
                content = db.query(AudioGuide).filter(AudioGuide.id == content_id).first()
            elif content_type == "ar_experience":
                content = db.query(ARExperience).filter(ARExperience.id == content_id).first()
            else:
                return {"success": False, "error": "Invalid content type"}
            
            if not content:
                return {"success": False, "error": "Content not found"}
            
            # Soft delete (mark as inactive)
            content.is_active = False
            content.updated_at = datetime.utcnow()
            
            db.commit()
            
            return {
                "success": True,
                "content_id": content_id,
                "content_type": content_type,
                "deleted_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error deleting multimedia content: {str(e)}")
            return {"success": False, "error": str(e)}