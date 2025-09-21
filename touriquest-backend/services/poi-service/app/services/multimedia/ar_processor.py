"""
AR (Augmented Reality) content processing service.
Handles 3D model optimization, validation, and AR experience preparation.
"""

import os
import json
import uuid
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass

import trimesh
import open3d as o3d
import numpy as np
from PIL import Image, ImageFilter

from app.core.config import get_settings
from app.services.base import BaseService

logger = logging.getLogger(__name__)


@dataclass
class ARProcessingResult:
    """Result of AR content processing operation."""
    success: bool
    model_path: Optional[str] = None
    optimized_model_path: Optional[str] = None
    texture_paths: Optional[List[str]] = None
    metadata: Optional[Dict] = None
    compression_info: Optional[Dict] = None
    compatibility_info: Optional[Dict] = None
    error_message: Optional[str] = None


@dataclass
class ModelOptimization:
    """Configuration for 3D model optimization."""
    target_polygon_count: int
    texture_max_resolution: int
    compression_level: str  # "low", "medium", "high"
    optimize_for_mobile: bool
    reduce_materials: bool


class ARProcessor(BaseService):
    """Service for processing AR experience content."""
    
    def __init__(self):
        super().__init__()
        self.settings = get_settings()
        self.temp_dir = Path(self.settings.TEMP_DIRECTORY)
        self.temp_dir.mkdir(parents=True, exist_ok=True)
        
        # AR processing settings
        self.max_model_size_mb = self.settings.AR_MAX_MODEL_SIZE_MB
        self.max_texture_resolution = self.settings.AR_MAX_TEXTURE_RESOLUTION
        self.optimization_levels = {
            "low": ModelOptimization(
                target_polygon_count=1000,
                texture_max_resolution=512,
                compression_level="high",
                optimize_for_mobile=True,
                reduce_materials=True
            ),
            "medium": ModelOptimization(
                target_polygon_count=5000,
                texture_max_resolution=1024,
                compression_level="medium",
                optimize_for_mobile=True,
                reduce_materials=False
            ),
            "high": ModelOptimization(
                target_polygon_count=15000,
                texture_max_resolution=2048,
                compression_level="low",
                optimize_for_mobile=False,
                reduce_materials=False
            )
        }
    
    async def process_ar_model(
        self,
        model_path: str,
        texture_paths: List[str],
        optimization_level: str = "medium"
    ) -> ARProcessingResult:
        """
        Process a 3D model for AR experience.
        
        Args:
            model_path: Path to the 3D model file
            texture_paths: List of texture file paths
            optimization_level: Level of optimization (low, medium, high)
            
        Returns:
            ARProcessingResult with processing details
        """
        try:
            logger.info(f"Starting AR model processing for {model_path}")
            
            # Validate input files
            validation_result = await self._validate_ar_files(model_path, texture_paths)
            if not validation_result["valid"]:
                return ARProcessingResult(
                    success=False,
                    error_message=validation_result["error"]
                )
            
            # Generate processing ID
            process_id = str(uuid.uuid4())
            output_dir = self.temp_dir / f"ar_processing_{process_id}"
            output_dir.mkdir(parents=True, exist_ok=True)
            
            # Load and analyze model
            model_info = await self._load_and_analyze_model(model_path)
            if not model_info["success"]:
                return ARProcessingResult(
                    success=False,
                    error_message=model_info["error"]
                )
            
            # Get optimization config
            optimization = self.optimization_levels.get(
                optimization_level, 
                self.optimization_levels["medium"]
            )
            
            # Optimize 3D model
            optimized_model_path = await self._optimize_3d_model(
                model_path,
                output_dir,
                optimization,
                process_id
            )
            
            # Process textures
            processed_textures = await self._process_textures(
                texture_paths,
                output_dir,
                optimization,
                process_id
            )
            
            # Generate compatibility info
            compatibility_info = await self._generate_compatibility_info(
                optimized_model_path,
                processed_textures,
                optimization
            )
            
            # Calculate compression metrics
            compression_info = await self._calculate_compression_metrics(
                model_path,
                optimized_model_path,
                texture_paths,
                processed_textures
            )
            
            # Extract comprehensive metadata
            metadata = await self._extract_ar_metadata(
                optimized_model_path,
                processed_textures,
                model_info["metadata"],
                optimization
            )
            
            result = ARProcessingResult(
                success=True,
                model_path=model_path,
                optimized_model_path=optimized_model_path,
                texture_paths=processed_textures,
                metadata=metadata,
                compression_info=compression_info,
                compatibility_info=compatibility_info
            )
            
            logger.info(f"AR model processing completed successfully for {model_path}")
            return result
            
        except Exception as e:
            logger.error(f"Error processing AR model: {str(e)}")
            return ARProcessingResult(
                success=False,
                error_message=f"Processing failed: {str(e)}"
            )
    
    async def _validate_ar_files(
        self,
        model_path: str,
        texture_paths: List[str]
    ) -> Dict[str, Any]:
        """Validate AR model and texture files."""
        
        # Check model file
        if not os.path.exists(model_path):
            return {"valid": False, "error": f"Model file not found: {model_path}"}
        
        model_size_mb = os.path.getsize(model_path) / (1024 * 1024)
        if model_size_mb > self.max_model_size_mb:
            return {
                "valid": False,
                "error": f"Model size ({model_size_mb:.1f}MB) exceeds maximum ({self.max_model_size_mb}MB)"
            }
        
        # Check supported format
        model_ext = Path(model_path).suffix.lower()
        supported_formats = ['.glb', '.gltf', '.obj', '.fbx', '.dae']
        if model_ext not in supported_formats:
            return {
                "valid": False,
                "error": f"Unsupported model format: {model_ext}. Supported: {supported_formats}"
            }
        
        # Check texture files
        for texture_path in texture_paths:
            if not os.path.exists(texture_path):
                return {"valid": False, "error": f"Texture file not found: {texture_path}"}
            
            texture_ext = Path(texture_path).suffix.lower()
            if texture_ext not in ['.jpg', '.jpeg', '.png', '.tga', '.bmp']:
                return {
                    "valid": False,
                    "error": f"Unsupported texture format: {texture_ext}"
                }
        
        return {"valid": True}
    
    async def _load_and_analyze_model(self, model_path: str) -> Dict[str, Any]:
        """Load and analyze 3D model."""
        try:
            # Load model with trimesh
            mesh = trimesh.load(model_path)
            
            # Handle scene vs single mesh
            if isinstance(mesh, trimesh.Scene):
                # Get combined mesh from scene
                combined_mesh = mesh.dump(concatenate=True)
                if len(combined_mesh) > 0:
                    mesh = combined_mesh[0]
                else:
                    return {"success": False, "error": "Empty scene"}
            
            # Basic mesh analysis
            vertex_count = len(mesh.vertices)
            face_count = len(mesh.faces)
            bounding_box = mesh.bounds
            volume = mesh.volume if mesh.is_volume else 0
            surface_area = mesh.area
            
            # Check mesh validity
            is_watertight = mesh.is_watertight
            is_winding_consistent = mesh.is_winding_consistent
            
            metadata = {
                "vertex_count": vertex_count,
                "face_count": face_count,
                "polygon_count": face_count,  # Assuming triangular faces
                "bounding_box": {
                    "min": bounding_box[0].tolist(),
                    "max": bounding_box[1].tolist()
                },
                "dimensions": (bounding_box[1] - bounding_box[0]).tolist(),
                "volume": volume,
                "surface_area": surface_area,
                "is_watertight": is_watertight,
                "is_winding_consistent": is_winding_consistent,
                "has_vertex_normals": hasattr(mesh.visual, 'vertex_normals'),
                "has_face_normals": hasattr(mesh, 'face_normals'),
                "has_uv_coordinates": hasattr(mesh.visual, 'uv')
            }
            
            return {"success": True, "mesh": mesh, "metadata": metadata}
            
        except Exception as e:
            return {"success": False, "error": f"Failed to load model: {str(e)}"}
    
    async def _optimize_3d_model(
        self,
        model_path: str,
        output_dir: Path,
        optimization: ModelOptimization,
        process_id: str
    ) -> str:
        """Optimize 3D model for AR deployment."""
        
        # Load model
        mesh = trimesh.load(model_path)
        if isinstance(mesh, trimesh.Scene):
            mesh = mesh.dump(concatenate=True)[0]
        
        # Polygon reduction if needed
        if len(mesh.faces) > optimization.target_polygon_count:
            # Simple decimation - could be enhanced with more sophisticated algorithms
            target_ratio = optimization.target_polygon_count / len(mesh.faces)
            if target_ratio < 1.0:
                # Use Open3D for better mesh decimation
                o3d_mesh = o3d.geometry.TriangleMesh()
                o3d_mesh.vertices = o3d.utility.Vector3dVector(mesh.vertices)
                o3d_mesh.triangles = o3d.utility.Vector3iVector(mesh.faces)
                
                # Simplify mesh
                simplified_mesh = o3d_mesh.simplify_quadric_decimation(
                    target_number_of_triangles=optimization.target_polygon_count
                )
                
                # Convert back to trimesh
                vertices = np.asarray(simplified_mesh.vertices)
                faces = np.asarray(simplified_mesh.triangles)
                mesh = trimesh.Trimesh(vertices=vertices, faces=faces)
        
        # Optimize mesh structure
        mesh.remove_duplicate_faces()
        mesh.remove_degenerate_faces()
        mesh.remove_unreferenced_vertices()
        
        # Fix mesh if needed
        if not mesh.is_watertight and optimization.optimize_for_mobile:
            mesh.fill_holes()
        
        # Generate normals if missing
        if not hasattr(mesh, 'vertex_normals'):
            mesh.vertex_normals
        
        # Save optimized model
        output_path = output_dir / f"optimized_model_{process_id}.glb"
        mesh.export(str(output_path))
        
        return str(output_path)
    
    async def _process_textures(
        self,
        texture_paths: List[str],
        output_dir: Path,
        optimization: ModelOptimization,
        process_id: str
    ) -> List[str]:
        """Process and optimize texture files."""
        processed_textures = []
        
        for i, texture_path in enumerate(texture_paths):
            try:
                # Load image
                image = Image.open(texture_path)
                
                # Convert to RGB if needed
                if image.mode != 'RGB':
                    image = image.convert('RGB')
                
                # Resize if needed
                if max(image.size) > optimization.texture_max_resolution:
                    # Calculate new size maintaining aspect ratio
                    ratio = optimization.texture_max_resolution / max(image.size)
                    new_size = tuple(int(dim * ratio) for dim in image.size)
                    image = image.resize(new_size, Image.Resampling.LANCZOS)
                
                # Apply optimization based on level
                if optimization.compression_level == "high":
                    # Aggressive compression
                    quality = 75
                    image = image.filter(ImageFilter.SMOOTH_MORE)
                elif optimization.compression_level == "medium":
                    quality = 85
                elif optimization.compression_level == "low":
                    quality = 95
                else:
                    quality = 85
                
                # Save optimized texture
                output_path = output_dir / f"texture_{process_id}_{i:02d}.jpg"
                image.save(str(output_path), "JPEG", quality=quality, optimize=True)
                processed_textures.append(str(output_path))
                
            except Exception as e:
                logger.error(f"Error processing texture {texture_path}: {str(e)}")
                # Keep original if processing fails
                processed_textures.append(texture_path)
        
        return processed_textures
    
    async def _generate_compatibility_info(
        self,
        model_path: str,
        texture_paths: List[str],
        optimization: ModelOptimization
    ) -> Dict[str, Any]:
        """Generate device compatibility information."""
        
        # Calculate total file size
        total_size_mb = os.path.getsize(model_path) / (1024 * 1024)
        for texture_path in texture_paths:
            total_size_mb += os.path.getsize(texture_path) / (1024 * 1024)
        
        # Load model for analysis
        mesh = trimesh.load(model_path)
        if isinstance(mesh, trimesh.Scene):
            mesh = mesh.dump(concatenate=True)[0]
        
        polygon_count = len(mesh.faces)
        
        # Device compatibility scoring
        compatibility = {
            "ios": {
                "min_version": "12.0",
                "recommended_version": "14.0",
                "performance_score": self._calculate_ios_performance_score(
                    polygon_count, total_size_mb
                )
            },
            "android": {
                "min_version": "7.0",
                "recommended_version": "9.0",
                "min_api_level": 24,
                "performance_score": self._calculate_android_performance_score(
                    polygon_count, total_size_mb
                )
            },
            "hardware_requirements": {
                "min_ram_mb": self._estimate_ram_requirement(polygon_count, total_size_mb),
                "requires_lidar": polygon_count > 10000,
                "requires_depth_camera": total_size_mb > 20,
                "supports_occlusion": polygon_count < 5000 and total_size_mb < 10
            },
            "performance_metrics": {
                "polygon_count": polygon_count,
                "total_size_mb": round(total_size_mb, 2),
                "estimated_load_time_seconds": total_size_mb * 0.5,  # Rough estimate
                "memory_usage_mb": polygon_count * 0.001 + total_size_mb * 1.5
            }
        }
        
        return compatibility
    
    def _calculate_ios_performance_score(self, polygon_count: int, size_mb: float) -> float:
        """Calculate iOS performance score (0.0 to 1.0)."""
        # Simple scoring based on polygon count and file size
        polygon_score = max(0, 1 - (polygon_count - 1000) / 20000)
        size_score = max(0, 1 - (size_mb - 5) / 50)
        return (polygon_score + size_score) / 2
    
    def _calculate_android_performance_score(self, polygon_count: int, size_mb: float) -> float:
        """Calculate Android performance score (0.0 to 1.0)."""
        # Android typically has more variation in hardware
        polygon_score = max(0, 1 - (polygon_count - 500) / 15000)
        size_score = max(0, 1 - (size_mb - 3) / 40)
        return (polygon_score + size_score) / 2
    
    def _estimate_ram_requirement(self, polygon_count: int, size_mb: float) -> int:
        """Estimate RAM requirement in MB."""
        base_ram = 1024  # Base RAM requirement
        polygon_ram = polygon_count * 0.001  # ~1KB per polygon
        texture_ram = size_mb * 2  # Textures loaded into GPU memory
        return int(base_ram + polygon_ram + texture_ram)
    
    async def _calculate_compression_metrics(
        self,
        original_model_path: str,
        optimized_model_path: str,
        original_texture_paths: List[str],
        processed_texture_paths: List[str]
    ) -> Dict[str, Any]:
        """Calculate compression and optimization metrics."""
        
        # Model size comparison
        original_model_size = os.path.getsize(original_model_path)
        optimized_model_size = os.path.getsize(optimized_model_path)
        
        # Texture size comparison
        original_texture_size = sum(
            os.path.getsize(path) for path in original_texture_paths
        )
        processed_texture_size = sum(
            os.path.getsize(path) for path in processed_texture_paths
        )
        
        total_original_size = original_model_size + original_texture_size
        total_optimized_size = optimized_model_size + processed_texture_size
        
        compression_ratio = total_original_size / total_optimized_size if total_optimized_size > 0 else 1
        size_reduction_percent = ((total_original_size - total_optimized_size) / total_original_size) * 100
        
        return {
            "original_size_mb": round(total_original_size / (1024 * 1024), 2),
            "optimized_size_mb": round(total_optimized_size / (1024 * 1024), 2),
            "compression_ratio": round(compression_ratio, 2),
            "size_reduction_percent": round(size_reduction_percent, 1),
            "model_compression": {
                "original_mb": round(original_model_size / (1024 * 1024), 2),
                "optimized_mb": round(optimized_model_size / (1024 * 1024), 2),
                "reduction_percent": round(((original_model_size - optimized_model_size) / original_model_size) * 100, 1)
            },
            "texture_compression": {
                "original_mb": round(original_texture_size / (1024 * 1024), 2),
                "processed_mb": round(processed_texture_size / (1024 * 1024), 2),
                "reduction_percent": round(((original_texture_size - processed_texture_size) / original_texture_size) * 100, 1)
            }
        }
    
    async def _extract_ar_metadata(
        self,
        model_path: str,
        texture_paths: List[str],
        original_metadata: Dict,
        optimization: ModelOptimization
    ) -> Dict[str, Any]:
        """Extract comprehensive AR experience metadata."""
        
        # Load optimized model for final analysis
        mesh = trimesh.load(model_path)
        if isinstance(mesh, trimesh.Scene):
            mesh = mesh.dump(concatenate=True)[0]
        
        # Calculate file sizes
        model_size_mb = os.path.getsize(model_path) / (1024 * 1024)
        total_texture_size_mb = sum(
            os.path.getsize(path) / (1024 * 1024) for path in texture_paths
        )
        
        return {
            "model_info": {
                "format": "glb",
                "polygon_count": len(mesh.faces),
                "vertex_count": len(mesh.vertices),
                "bounding_box": {
                    "min": mesh.bounds[0].tolist(),
                    "max": mesh.bounds[1].tolist()
                },
                "dimensions": (mesh.bounds[1] - mesh.bounds[0]).tolist(),
                "is_optimized": True,
                "optimization_level": optimization.compression_level
            },
            "textures": {
                "count": len(texture_paths),
                "total_size_mb": round(total_texture_size_mb, 2),
                "max_resolution": optimization.texture_max_resolution,
                "formats": list(set(Path(p).suffix.lower() for p in texture_paths))
            },
            "performance": {
                "total_size_mb": round(model_size_mb + total_texture_size_mb, 2),
                "estimated_load_time_seconds": (model_size_mb + total_texture_size_mb) * 0.5,
                "memory_footprint_mb": len(mesh.faces) * 0.001 + total_texture_size_mb * 1.5,
                "complexity_score": min(1.0, len(mesh.faces) / 15000)  # 0-1 scale
            },
            "quality_metrics": {
                "mesh_quality": {
                    "is_watertight": mesh.is_watertight,
                    "is_winding_consistent": mesh.is_winding_consistent,
                    "has_vertex_normals": hasattr(mesh, 'vertex_normals'),
                    "geometric_complexity": len(mesh.faces) / max(1, len(mesh.vertices))
                },
                "optimization_applied": {
                    "polygon_reduction": original_metadata.get("polygon_count", 0) > len(mesh.faces),
                    "texture_compression": optimization.compression_level != "low",
                    "mobile_optimized": optimization.optimize_for_mobile
                }
            },
            "ar_features": {
                "supports_occlusion": len(mesh.faces) < 5000,
                "supports_physics": mesh.is_watertight,
                "supports_animation": False,  # Would need to check for armatures/bones
                "interaction_ready": True
            }
        }
    
    async def validate_ar_model(self, model_path: str) -> Dict[str, Any]:
        """Validate an AR model file."""
        try:
            validation_result = await self._validate_ar_files(model_path, [])
            if not validation_result["valid"]:
                return validation_result
            
            # Load and analyze model
            model_info = await self._load_and_analyze_model(model_path)
            if not model_info["success"]:
                return {"valid": False, "error": model_info["error"]}
            
            return {
                "valid": True,
                "metadata": model_info["metadata"]
            }
            
        except Exception as e:
            return {"valid": False, "error": f"Validation failed: {str(e)}"}
    
    async def cleanup_processing_files(self, process_id: str) -> None:
        """Clean up temporary processing files."""
        try:
            output_dir = self.temp_dir / f"ar_processing_{process_id}"
            if output_dir.exists():
                import shutil
                shutil.rmtree(output_dir)
                logger.info(f"Cleaned up AR processing files for {process_id}")
        except Exception as e:
            logger.error(f"Error cleaning up AR processing files: {str(e)}")