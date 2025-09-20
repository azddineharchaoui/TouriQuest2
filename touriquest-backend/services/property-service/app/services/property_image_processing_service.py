"""Image processing service for property photos and media management"""

import asyncio
import uuid
import os
import mimetypes
from datetime import datetime
from typing import Optional, Dict, List, Any, Tuple
from decimal import Decimal
from enum import Enum
import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc, update
from sqlalchemy.orm import joinedload, selectinload

# Image processing libraries (would be installed in production)
# from PIL import Image, ImageOps, ImageEnhance, ExifTags
# from PIL.ExifTags import TAGS
# import cv2
# import numpy as np

from app.core.database import get_session
from app.models.property_management_models import (
    PropertyListing, PropertyImageDetail, PropertyMediaCollection,
    VirtualTourAsset, ImageProcessingJob
)
from app.schemas.property_management_schemas import (
    PropertyImageUploadRequest, PropertyImageUploadResponse,
    ImageProcessingResponse, VirtualTourRequest, VirtualTourResponse,
    ImageOptimizationRequest, ImageQualityAnalysis
)
from app.services.cache_service import CacheService
from app.core.storage import StorageService  # Assumed cloud storage service

logger = structlog.get_logger()


class ImageType(str, Enum):
    MAIN = "main"
    GALLERY = "gallery"
    ROOM = "room"
    AMENITY = "amenity"
    EXTERIOR = "exterior"
    VIEW = "view"
    VIRTUAL_TOUR = "virtual_tour"


class ImageProcessingStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ImageQuality(str, Enum):
    EXCELLENT = "excellent"
    GOOD = "good"
    AVERAGE = "average"
    POOR = "poor"


class PropertyImageProcessingService:
    """Comprehensive image processing service for property media"""
    
    def __init__(self, storage_service: StorageService, cache_service: Optional[CacheService] = None):
        self.storage = storage_service
        self.cache = cache_service
        
        # Image processing configuration
        self.config = {
            "supported_formats": ["JPEG", "JPG", "PNG", "WEBP"],
            "max_file_size_mb": 50,
            "thumbnail_sizes": {
                "small": (300, 200),
                "medium": (600, 400),
                "large": (1200, 800)
            },
            "optimization_settings": {
                "quality": 85,
                "progressive": True,
                "optimize": True
            },
            "watermark_settings": {
                "opacity": 0.3,
                "position": "bottom_right",
                "margin": 20
            },
            "ai_analysis": {
                "min_resolution": (800, 600),
                "quality_threshold": 0.7,
                "object_detection_enabled": True
            }
        }
    
    async def upload_property_images(
        self,
        session: AsyncSession,
        property_id: str,
        host_id: str,
        upload_request: PropertyImageUploadRequest
    ) -> PropertyImageUploadResponse:
        """Upload and process property images"""
        try:
            # Verify property ownership
            property_listing = await self._verify_property_ownership(session, property_id, host_id)
            
            uploaded_images = []
            processing_jobs = []
            
            for image_data in upload_request.images:
                # Validate image
                validation_result = await self._validate_image(image_data)
                if not validation_result["valid"]:
                    continue
                
                # Generate unique image ID
                image_id = str(uuid.uuid4())
                
                # Upload original image to storage
                original_url = await self._upload_to_storage(
                    image_data["file_data"], 
                    f"properties/{property_id}/images/{image_id}/original.jpg"
                )
                
                # Create image record
                image_detail = PropertyImageDetail(
                    id=image_id,
                    property_id=property_id,
                    image_type=image_data.get("image_type", ImageType.GALLERY),
                    original_url=original_url,
                    filename=image_data.get("filename", f"image_{image_id}.jpg"),
                    file_size=len(image_data["file_data"]),
                    mime_type=image_data.get("mime_type", "image/jpeg"),
                    alt_text=image_data.get("alt_text", ""),
                    description=image_data.get("description", ""),
                    sort_order=image_data.get("sort_order", 0),
                    is_main_image=image_data.get("is_main", False),
                    upload_date=datetime.utcnow()
                )
                
                session.add(image_detail)
                uploaded_images.append(image_detail)
                
                # Create processing job
                processing_job = await self._create_processing_job(
                    session, image_id, property_id, image_data
                )
                processing_jobs.append(processing_job)
            
            await session.commit()
            
            # Start background processing
            for job in processing_jobs:
                await self._start_background_processing(job.id)
            
            # Prepare response
            image_responses = []
            for image in uploaded_images:
                image_responses.append({
                    "image_id": image.id,
                    "original_url": image.original_url,
                    "image_type": image.image_type,
                    "processing_status": ImageProcessingStatus.PENDING,
                    "upload_timestamp": image.upload_date
                })
            
            return PropertyImageUploadResponse(
                property_id=property_id,
                upload_session_id=str(uuid.uuid4()),
                uploaded_images=image_responses,
                total_uploaded=len(image_responses),
                processing_started=True,
                estimated_completion_time=datetime.utcnow().replace(microsecond=0)
            )
            
        except Exception as e:
            await session.rollback()
            logger.error(f"Error uploading property images: {str(e)}")
            raise
    
    async def process_image_optimization(
        self,
        session: AsyncSession,
        image_id: str,
        optimization_request: ImageOptimizationRequest
    ) -> ImageProcessingResponse:
        """Process image optimization"""
        try:
            # Get image record
            query = select(PropertyImageDetail).where(PropertyImageDetail.id == image_id)
            result = await session.execute(query)
            image_detail = result.scalar_one_or_none()
            
            if not image_detail:
                raise ValueError("Image not found")
            
            # Download original image
            original_image_data = await self._download_from_storage(image_detail.original_url)
            
            # Process image optimization
            optimization_results = await self._optimize_image(
                original_image_data, optimization_request
            )
            
            # Upload optimized versions
            optimized_urls = {}
            for size_name, optimized_data in optimization_results.items():
                url = await self._upload_to_storage(
                    optimized_data,
                    f"properties/{image_detail.property_id}/images/{image_id}/{size_name}.jpg"
                )
                optimized_urls[size_name] = url
            
            # Update image record
            image_detail.thumbnail_small_url = optimized_urls.get("thumbnail_small")
            image_detail.thumbnail_medium_url = optimized_urls.get("thumbnail_medium")
            image_detail.thumbnail_large_url = optimized_urls.get("thumbnail_large")
            image_detail.optimized_url = optimized_urls.get("optimized")
            image_detail.webp_url = optimized_urls.get("webp")
            image_detail.processing_status = ImageProcessingStatus.COMPLETED
            image_detail.processing_completed_at = datetime.utcnow()
            
            await session.commit()
            
            return ImageProcessingResponse(
                image_id=image_id,
                processing_status=ImageProcessingStatus.COMPLETED,
                optimized_urls=optimized_urls,
                processing_time=datetime.utcnow() - image_detail.upload_date,
                file_size_reduction=self._calculate_size_reduction(original_image_data, optimization_results),
                quality_score=optimization_results.get("quality_score", 0.8)
            )
            
        except Exception as e:
            logger.error(f"Error processing image optimization: {str(e)}")
            raise
    
    async def analyze_image_quality(
        self,
        session: AsyncSession,
        image_id: str,
        host_id: str
    ) -> ImageQualityAnalysis:
        """Analyze image quality using AI"""
        try:
            # Get image record and verify ownership
            image_detail = await self._get_image_with_ownership_check(session, image_id, host_id)
            
            # Download image for analysis
            image_data = await self._download_from_storage(image_detail.original_url)
            
            # Perform AI quality analysis
            quality_analysis = await self._analyze_image_quality_ai(image_data)
            
            # Analyze technical quality
            technical_analysis = await self._analyze_technical_quality(image_data)
            
            # Analyze composition
            composition_analysis = await self._analyze_composition(image_data)
            
            # Generate overall quality score
            overall_score = self._calculate_overall_quality_score(
                quality_analysis, technical_analysis, composition_analysis
            )
            
            # Generate recommendations
            recommendations = self._generate_quality_recommendations(
                quality_analysis, technical_analysis, composition_analysis
            )
            
            # Update image record with analysis
            image_detail.ai_quality_score = overall_score
            image_detail.quality_analysis_data = {
                "technical": technical_analysis,
                "composition": composition_analysis,
                "ai_analysis": quality_analysis
            }
            image_detail.last_analyzed_at = datetime.utcnow()
            
            await session.commit()
            
            return ImageQualityAnalysis(
                image_id=image_id,
                overall_quality_score=overall_score,
                quality_category=self._get_quality_category(overall_score),
                technical_quality=technical_analysis,
                composition_quality=composition_analysis,
                ai_analysis=quality_analysis,
                recommendations=recommendations,
                analyzed_at=datetime.utcnow()
            )
            
        except Exception as e:
            logger.error(f"Error analyzing image quality: {str(e)}")
            raise
    
    async def create_virtual_tour(
        self,
        session: AsyncSession,
        property_id: str,
        host_id: str,
        tour_request: VirtualTourRequest
    ) -> VirtualTourResponse:
        """Create virtual tour from property images"""
        try:
            # Verify property ownership
            property_listing = await self._verify_property_ownership(session, property_id, host_id)
            
            # Get property images suitable for virtual tour
            suitable_images = await self._get_virtual_tour_images(session, property_id)
            
            if len(suitable_images) < 3:
                raise ValueError("At least 3 high-quality images required for virtual tour")
            
            # Create virtual tour record
            tour_id = str(uuid.uuid4())
            virtual_tour = VirtualTourAsset(
                id=tour_id,
                property_id=property_id,
                tour_name=tour_request.tour_name,
                tour_type=tour_request.tour_type,
                total_scenes=len(suitable_images),
                tour_data={"scenes": []},
                creation_status="processing"
            )
            
            session.add(virtual_tour)
            
            # Process images for virtual tour
            tour_scenes = []
            for i, image in enumerate(suitable_images):
                scene_data = await self._create_virtual_tour_scene(
                    image, i, tour_request
                )
                tour_scenes.append(scene_data)
            
            # Generate tour navigation data
            navigation_data = self._generate_tour_navigation(tour_scenes, tour_request)
            
            # Create tour manifest
            tour_manifest = await self._create_tour_manifest(
                tour_id, tour_scenes, navigation_data
            )
            
            # Upload tour assets
            tour_url = await self._upload_tour_assets(tour_id, tour_manifest, tour_scenes)
            
            # Update virtual tour record
            virtual_tour.tour_url = tour_url
            virtual_tour.tour_data = tour_manifest
            virtual_tour.creation_status = "completed"
            virtual_tour.created_at = datetime.utcnow()
            
            await session.commit()
            
            return VirtualTourResponse(
                tour_id=tour_id,
                property_id=property_id,
                tour_url=tour_url,
                tour_type=tour_request.tour_type,
                total_scenes=len(tour_scenes),
                estimated_duration=len(tour_scenes) * 30,  # 30 seconds per scene
                creation_status="completed",
                created_at=datetime.utcnow()
            )
            
        except Exception as e:
            await session.rollback()
            logger.error(f"Error creating virtual tour: {str(e)}")
            raise
    
    async def enhance_image_metadata(
        self,
        session: AsyncSession,
        image_id: str,
        host_id: str
    ) -> Dict[str, Any]:
        """Extract and enhance image metadata"""
        try:
            # Get image with ownership check
            image_detail = await self._get_image_with_ownership_check(session, image_id, host_id)
            
            # Download image
            image_data = await self._download_from_storage(image_detail.original_url)
            
            # Extract EXIF data
            exif_data = await self._extract_exif_data(image_data)
            
            # Extract technical metadata
            technical_metadata = await self._extract_technical_metadata(image_data)
            
            # Analyze image content using AI
            content_analysis = await self._analyze_image_content(image_data)
            
            # Generate SEO-friendly metadata
            seo_metadata = await self._generate_seo_metadata(
                image_detail, content_analysis, exif_data
            )
            
            # Update image record
            enhanced_metadata = {
                "exif": exif_data,
                "technical": technical_metadata,
                "content": content_analysis,
                "seo": seo_metadata
            }
            
            image_detail.metadata = enhanced_metadata
            image_detail.alt_text = seo_metadata.get("alt_text", image_detail.alt_text)
            image_detail.description = seo_metadata.get("description", image_detail.description)
            image_detail.keywords = seo_metadata.get("keywords", [])
            image_detail.dominant_colors = content_analysis.get("dominant_colors", [])
            image_detail.detected_objects = content_analysis.get("objects", [])
            
            await session.commit()
            
            return enhanced_metadata
            
        except Exception as e:
            logger.error(f"Error enhancing image metadata: {str(e)}")
            raise
    
    async def batch_process_images(
        self,
        session: AsyncSession,
        property_id: str,
        host_id: str,
        processing_options: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Batch process all property images"""
        try:
            # Verify ownership
            await self._verify_property_ownership(session, property_id, host_id)
            
            # Get all property images
            query = select(PropertyImageDetail).where(
                PropertyImageDetail.property_id == property_id
            )
            result = await session.execute(query)
            images = result.scalars().all()
            
            if not images:
                return {"message": "No images found for processing"}
            
            # Create batch processing job
            batch_job_id = str(uuid.uuid4())
            
            processing_results = {
                "batch_job_id": batch_job_id,
                "total_images": len(images),
                "processed_images": 0,
                "failed_images": 0,
                "processing_details": []
            }
            
            # Process each image
            for image in images:
                try:
                    # Create optimization request
                    optimization_request = ImageOptimizationRequest(
                        **processing_options.get("optimization", {})
                    )
                    
                    # Process image
                    result = await self.process_image_optimization(
                        session, image.id, optimization_request
                    )
                    
                    processing_results["processed_images"] += 1
                    processing_results["processing_details"].append({
                        "image_id": image.id,
                        "status": "success",
                        "processing_time": result.processing_time,
                        "size_reduction": result.file_size_reduction
                    })
                    
                except Exception as e:
                    processing_results["failed_images"] += 1
                    processing_results["processing_details"].append({
                        "image_id": image.id,
                        "status": "failed",
                        "error": str(e)
                    })
                    logger.error(f"Failed to process image {image.id}: {str(e)}")
            
            return processing_results
            
        except Exception as e:
            logger.error(f"Error in batch processing: {str(e)}")
            raise
    
    async def generate_property_slideshow(
        self,
        session: AsyncSession,
        property_id: str,
        host_id: str,
        slideshow_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate property slideshow video"""
        try:
            # Verify ownership
            await self._verify_property_ownership(session, property_id, host_id)
            
            # Get best property images
            best_images = await self._select_best_images_for_slideshow(session, property_id)
            
            if len(best_images) < 5:
                raise ValueError("At least 5 images required for slideshow")
            
            # Create slideshow
            slideshow_id = str(uuid.uuid4())
            slideshow_data = await self._create_slideshow_video(
                best_images, slideshow_config, slideshow_id
            )
            
            # Upload slideshow
            slideshow_url = await self._upload_to_storage(
                slideshow_data["video_data"],
                f"properties/{property_id}/media/slideshow_{slideshow_id}.mp4"
            )
            
            # Create media collection record
            media_collection = PropertyMediaCollection(
                id=slideshow_id,
                property_id=property_id,
                collection_type="slideshow",
                collection_name=f"Property Slideshow - {slideshow_id[:8]}",
                media_urls=[slideshow_url],
                metadata=slideshow_data["metadata"]
            )
            
            session.add(media_collection)
            await session.commit()
            
            return {
                "slideshow_id": slideshow_id,
                "slideshow_url": slideshow_url,
                "duration": slideshow_data["duration"],
                "image_count": len(best_images),
                "created_at": datetime.utcnow()
            }
            
        except Exception as e:
            logger.error(f"Error generating slideshow: {str(e)}")
            raise
    
    # Helper Methods
    async def _verify_property_ownership(
        self,
        session: AsyncSession,
        property_id: str,
        host_id: str
    ) -> PropertyListing:
        """Verify property ownership"""
        query = select(PropertyListing).where(
            and_(
                PropertyListing.id == property_id,
                PropertyListing.host_id == host_id
            )
        )
        result = await session.execute(query)
        property_listing = result.scalar_one_or_none()
        
        if not property_listing:
            raise ValueError("Property not found or access denied")
        
        return property_listing
    
    async def _get_image_with_ownership_check(
        self,
        session: AsyncSession,
        image_id: str,
        host_id: str
    ) -> PropertyImageDetail:
        """Get image with ownership verification"""
        query = select(PropertyImageDetail).join(PropertyListing).where(
            and_(
                PropertyImageDetail.id == image_id,
                PropertyListing.host_id == host_id
            )
        )
        result = await session.execute(query)
        image_detail = result.scalar_one_or_none()
        
        if not image_detail:
            raise ValueError("Image not found or access denied")
        
        return image_detail
    
    async def _validate_image(self, image_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate uploaded image"""
        try:
            file_data = image_data["file_data"]
            file_size_mb = len(file_data) / (1024 * 1024)
            
            # Check file size
            if file_size_mb > self.config["max_file_size_mb"]:
                return {
                    "valid": False,
                    "error": f"File size exceeds {self.config['max_file_size_mb']}MB limit"
                }
            
            # Check format (simplified - would use actual image library)
            mime_type = image_data.get("mime_type", "")
            if not any(fmt.lower() in mime_type.lower() for fmt in self.config["supported_formats"]):
                return {
                    "valid": False,
                    "error": f"Unsupported format. Supported: {', '.join(self.config['supported_formats'])}"
                }
            
            return {"valid": True}
            
        except Exception as e:
            return {"valid": False, "error": str(e)}
    
    async def _upload_to_storage(self, file_data: bytes, file_path: str) -> str:
        """Upload file to storage service"""
        # Simulate storage upload
        return f"https://storage.touriquest.com/{file_path}"
    
    async def _download_from_storage(self, url: str) -> bytes:
        """Download file from storage service"""
        # Simulate storage download
        return b"simulated_image_data"
    
    async def _create_processing_job(
        self,
        session: AsyncSession,
        image_id: str,
        property_id: str,
        image_data: Dict[str, Any]
    ) -> ImageProcessingJob:
        """Create image processing job"""
        job = ImageProcessingJob(
            id=str(uuid.uuid4()),
            image_id=image_id,
            property_id=property_id,
            job_type="optimization",
            status=ImageProcessingStatus.PENDING,
            processing_options={
                "generate_thumbnails": True,
                "optimize_quality": True,
                "extract_metadata": True,
                "analyze_quality": True
            }
        )
        
        session.add(job)
        return job
    
    async def _start_background_processing(self, job_id: str):
        """Start background image processing"""
        # This would trigger background processing
        logger.info(f"Started background processing for job {job_id}")
    
    async def _optimize_image(
        self,
        image_data: bytes,
        optimization_request: ImageOptimizationRequest
    ) -> Dict[str, bytes]:
        """Optimize image and generate variants"""
        # Simulated image optimization
        # In production, would use PIL, opencv, or similar
        
        optimized_results = {
            "thumbnail_small": image_data[:1000],  # Simulated smaller data
            "thumbnail_medium": image_data[:2000],
            "thumbnail_large": image_data[:4000],
            "optimized": image_data[:8000],
            "webp": image_data[:6000],
            "quality_score": 0.85
        }
        
        return optimized_results
    
    def _calculate_size_reduction(
        self,
        original_data: bytes,
        optimized_results: Dict[str, bytes]
    ) -> float:
        """Calculate file size reduction percentage"""
        original_size = len(original_data)
        optimized_size = len(optimized_results.get("optimized", original_data))
        
        if original_size > 0:
            return ((original_size - optimized_size) / original_size) * 100
        
        return 0.0
    
    async def _analyze_image_quality_ai(self, image_data: bytes) -> Dict[str, Any]:
        """Analyze image quality using AI"""
        # Simulated AI analysis
        return {
            "sharpness_score": 0.85,
            "brightness_score": 0.78,
            "contrast_score": 0.82,
            "color_accuracy": 0.88,
            "noise_level": 0.15,
            "overall_technical_score": 0.83
        }
    
    async def _analyze_technical_quality(self, image_data: bytes) -> Dict[str, Any]:
        """Analyze technical image quality"""
        # Simulated technical analysis
        return {
            "resolution": {"width": 1920, "height": 1080},
            "aspect_ratio": 1.78,
            "file_format": "JPEG",
            "color_space": "RGB",
            "bit_depth": 8,
            "compression_quality": 85,
            "has_artifacts": False,
            "is_progressive": True
        }
    
    async def _analyze_composition(self, image_data: bytes) -> Dict[str, Any]:
        """Analyze image composition"""
        # Simulated composition analysis
        return {
            "rule_of_thirds_score": 0.75,
            "symmetry_score": 0.68,
            "balance_score": 0.82,
            "leading_lines": True,
            "focal_point_clarity": 0.87,
            "background_clutter": 0.25,
            "lighting_quality": 0.79
        }
    
    def _calculate_overall_quality_score(
        self,
        quality_analysis: Dict[str, Any],
        technical_analysis: Dict[str, Any],
        composition_analysis: Dict[str, Any]
    ) -> float:
        """Calculate overall quality score"""
        technical_score = quality_analysis.get("overall_technical_score", 0.5)
        composition_score = (
            composition_analysis.get("rule_of_thirds_score", 0.5) +
            composition_analysis.get("balance_score", 0.5) +
            composition_analysis.get("focal_point_clarity", 0.5)
        ) / 3
        
        # Weighted average
        overall_score = (technical_score * 0.6) + (composition_score * 0.4)
        return round(overall_score, 2)
    
    def _get_quality_category(self, score: float) -> ImageQuality:
        """Get quality category from score"""
        if score >= 0.85:
            return ImageQuality.EXCELLENT
        elif score >= 0.7:
            return ImageQuality.GOOD
        elif score >= 0.55:
            return ImageQuality.AVERAGE
        else:
            return ImageQuality.POOR
    
    def _generate_quality_recommendations(
        self,
        quality_analysis: Dict[str, Any],
        technical_analysis: Dict[str, Any],
        composition_analysis: Dict[str, Any]
    ) -> List[str]:
        """Generate quality improvement recommendations"""
        recommendations = []
        
        # Technical recommendations
        if quality_analysis.get("sharpness_score", 1.0) < 0.7:
            recommendations.append("Image appears blurry - use a tripod and proper focus")
        
        if quality_analysis.get("brightness_score", 1.0) < 0.6:
            recommendations.append("Image is too dark - improve lighting or adjust exposure")
        
        if quality_analysis.get("brightness_score", 0.0) > 0.9:
            recommendations.append("Image is overexposed - reduce exposure or use diffused lighting")
        
        # Composition recommendations
        if composition_analysis.get("rule_of_thirds_score", 1.0) < 0.6:
            recommendations.append("Consider using rule of thirds for better composition")
        
        if composition_analysis.get("background_clutter", 0.0) > 0.6:
            recommendations.append("Reduce background clutter for cleaner composition")
        
        if composition_analysis.get("lighting_quality", 1.0) < 0.6:
            recommendations.append("Improve lighting conditions - use natural light when possible")
        
        return recommendations
    
    async def _get_virtual_tour_images(
        self,
        session: AsyncSession,
        property_id: str
    ) -> List[PropertyImageDetail]:
        """Get images suitable for virtual tour"""
        query = select(PropertyImageDetail).where(
            and_(
                PropertyImageDetail.property_id == property_id,
                PropertyImageDetail.ai_quality_score >= 0.7,  # High quality only
                PropertyImageDetail.image_type.in_([ImageType.ROOM, ImageType.MAIN, ImageType.GALLERY])
            )
        ).order_by(PropertyImageDetail.ai_quality_score.desc())
        
        result = await session.execute(query)
        return result.scalars().all()
    
    async def _create_virtual_tour_scene(
        self,
        image: PropertyImageDetail,
        scene_index: int,
        tour_request: VirtualTourRequest
    ) -> Dict[str, Any]:
        """Create virtual tour scene from image"""
        return {
            "scene_id": f"scene_{scene_index}",
            "image_id": image.id,
            "image_url": image.optimized_url or image.original_url,
            "title": image.description or f"Scene {scene_index + 1}",
            "description": image.alt_text or "",
            "hotspots": [],  # Would be generated based on image content
            "initial_view": {"pitch": 0, "yaw": 0, "fov": 75},
            "scene_type": image.image_type
        }
    
    def _generate_tour_navigation(
        self,
        tour_scenes: List[Dict[str, Any]],
        tour_request: VirtualTourRequest
    ) -> Dict[str, Any]:
        """Generate tour navigation structure"""
        return {
            "start_scene": tour_scenes[0]["scene_id"] if tour_scenes else None,
            "scene_order": [scene["scene_id"] for scene in tour_scenes],
            "navigation_type": tour_request.navigation_type,
            "auto_rotate": tour_request.auto_rotate,
            "show_navigation_bar": True,
            "show_scene_list": True
        }
    
    async def _create_tour_manifest(
        self,
        tour_id: str,
        tour_scenes: List[Dict[str, Any]],
        navigation_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create virtual tour manifest"""
        return {
            "tour_id": tour_id,
            "version": "1.0",
            "title": f"Virtual Tour {tour_id[:8]}",
            "scenes": tour_scenes,
            "navigation": navigation_data,
            "settings": {
                "auto_load": True,
                "preview_enabled": True,
                "fullscreen_enabled": True,
                "mobile_optimized": True
            },
            "created_at": datetime.utcnow().isoformat()
        }
    
    async def _upload_tour_assets(
        self,
        tour_id: str,
        tour_manifest: Dict[str, Any],
        tour_scenes: List[Dict[str, Any]]
    ) -> str:
        """Upload virtual tour assets and return tour URL"""
        # Upload manifest
        manifest_url = await self._upload_to_storage(
            str(tour_manifest).encode(),
            f"virtual-tours/{tour_id}/manifest.json"
        )
        
        # Return tour viewer URL
        return f"https://tours.touriquest.com/view/{tour_id}"
    
    async def _extract_exif_data(self, image_data: bytes) -> Dict[str, Any]:
        """Extract EXIF data from image"""
        # Simulated EXIF extraction
        return {
            "camera_make": "Canon",
            "camera_model": "EOS R5",
            "lens": "RF 24-70mm F2.8 L IS USM",
            "focal_length": "35mm",
            "aperture": "f/8.0",
            "shutter_speed": "1/125",
            "iso": 400,
            "datetime_taken": "2024-01-15 14:30:22",
            "gps_location": None,
            "flash_used": False
        }
    
    async def _extract_technical_metadata(self, image_data: bytes) -> Dict[str, Any]:
        """Extract technical metadata"""
        return {
            "file_size_bytes": len(image_data),
            "dimensions": {"width": 1920, "height": 1080},
            "color_profile": "sRGB",
            "has_transparency": False,
            "compression_ratio": 0.85,
            "estimated_print_size": "16x9 inches at 120 DPI"
        }
    
    async def _analyze_image_content(self, image_data: bytes) -> Dict[str, Any]:
        """Analyze image content using AI"""
        # Simulated content analysis
        return {
            "objects": ["bed", "window", "lamp", "artwork"],
            "room_type": "bedroom",
            "dominant_colors": ["#F5F5DC", "#8B4513", "#FFFFFF"],
            "lighting_type": "natural",
            "style_category": "modern",
            "cleanliness_score": 0.92,
            "staging_quality": 0.88
        }
    
    async def _generate_seo_metadata(
        self,
        image_detail: PropertyImageDetail,
        content_analysis: Dict[str, Any],
        exif_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate SEO-friendly metadata"""
        room_type = content_analysis.get("room_type", "room")
        objects = content_analysis.get("objects", [])
        
        return {
            "alt_text": f"Beautiful {room_type} with {', '.join(objects[:3])}",
            "description": f"Well-appointed {room_type} featuring {', '.join(objects)} in modern style",
            "keywords": [room_type, "rental property", "accommodation"] + objects,
            "title": f"Property {room_type.title()} - High Quality Interior"
        }
    
    async def _select_best_images_for_slideshow(
        self,
        session: AsyncSession,
        property_id: str
    ) -> List[PropertyImageDetail]:
        """Select best images for slideshow"""
        query = select(PropertyImageDetail).where(
            and_(
                PropertyImageDetail.property_id == property_id,
                PropertyImageDetail.ai_quality_score >= 0.6
            )
        ).order_by(PropertyImageDetail.ai_quality_score.desc()).limit(10)
        
        result = await session.execute(query)
        return result.scalars().all()
    
    async def _create_slideshow_video(
        self,
        images: List[PropertyImageDetail],
        config: Dict[str, Any],
        slideshow_id: str
    ) -> Dict[str, Any]:
        """Create slideshow video from images"""
        # Simulated slideshow creation
        return {
            "video_data": b"simulated_video_data",
            "duration": len(images) * config.get("slide_duration", 3),
            "metadata": {
                "resolution": "1920x1080",
                "fps": 30,
                "format": "mp4",
                "slide_count": len(images),
                "transition_type": config.get("transition", "fade")
            }
        }