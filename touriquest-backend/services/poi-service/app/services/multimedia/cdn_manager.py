"""
CDN (Content Delivery Network) manager for multimedia content.
Handles content upload to CDN, URL generation, and delivery optimization.
"""

import os
import json
import logging
import hashlib
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from datetime import datetime, timedelta

import boto3
from botocore.exceptions import ClientError, NoCredentialsError

from app.core.config import get_settings
from app.services.base import BaseService

logger = logging.getLogger(__name__)


@dataclass
class CDNUploadResult:
    """Result of CDN upload operation."""
    success: bool
    cdn_url: Optional[str] = None
    s3_key: Optional[str] = None
    cloudfront_url: Optional[str] = None
    cache_control: Optional[str] = None
    file_size_bytes: Optional[int] = None
    error_message: Optional[str] = None


@dataclass
class CDNDeliveryInfo:
    """CDN delivery configuration and URLs."""
    primary_url: str
    backup_urls: List[str]
    cache_settings: Dict[str, Any]
    cdn_regions: List[str]
    estimated_download_time: float


class CDNManager(BaseService):
    """Service for managing content delivery via CDN."""
    
    def __init__(self):
        super().__init__()
        self.settings = get_settings()
        
        # Initialize AWS clients
        try:
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=self.settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=self.settings.AWS_SECRET_ACCESS_KEY,
                region_name=self.settings.AWS_REGION
            )
            
            self.cloudfront_client = boto3.client(
                'cloudfront',
                aws_access_key_id=self.settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=self.settings.AWS_SECRET_ACCESS_KEY,
                region_name=self.settings.AWS_REGION
            )
            
            self.aws_available = True
            
        except (NoCredentialsError, Exception) as e:
            logger.warning(f"AWS not configured or unavailable: {str(e)}")
            self.s3_client = None
            self.cloudfront_client = None
            self.aws_available = False
        
        # CDN configuration
        self.bucket_name = self.settings.AWS_S3_BUCKET_NAME
        self.cloudfront_domain = self.settings.AWS_CLOUDFRONT_DOMAIN
        
        # Content types and cache settings
        self.cache_settings = {
            "audio": {
                "max_age": 86400 * 30,  # 30 days
                "s3_storage_class": "STANDARD",
                "content_encoding": "gzip"
            },
            "model": {
                "max_age": 86400 * 7,   # 7 days
                "s3_storage_class": "STANDARD",
                "content_encoding": None
            },
            "texture": {
                "max_age": 86400 * 14,  # 14 days
                "s3_storage_class": "STANDARD",
                "content_encoding": None
            },
            "image": {
                "max_age": 86400 * 30,  # 30 days
                "s3_storage_class": "STANDARD",
                "content_encoding": None
            }
        }
    
    async def upload_to_cdn(
        self,
        file_path: str,
        content_type: str,
        media_type: str,
        poi_id: str,
        content_id: Optional[str] = None
    ) -> CDNUploadResult:
        """
        Upload a file to CDN (S3 + CloudFront).
        
        Args:
            file_path: Local path to the file
            content_type: MIME content type
            media_type: Type of media (audio, model, texture, image)
            poi_id: POI identifier
            content_id: Optional content identifier
            
        Returns:
            CDNUploadResult with upload details
        """
        try:
            if not self.aws_available:
                return CDNUploadResult(
                    success=False,
                    error_message="CDN not available - AWS not configured"
                )
            
            if not os.path.exists(file_path):
                return CDNUploadResult(
                    success=False,
                    error_message=f"File not found: {file_path}"
                )
            
            # Generate S3 key
            s3_key = await self._generate_s3_key(
                file_path, media_type, poi_id, content_id
            )
            
            # Get cache settings
            cache_config = self.cache_settings.get(media_type, self.cache_settings["image"])
            
            # Calculate file hash for integrity
            file_hash = await self._calculate_file_hash(file_path)
            file_size = os.path.getsize(file_path)
            
            # Upload to S3
            upload_result = await self._upload_to_s3(
                file_path,
                s3_key,
                content_type,
                cache_config,
                file_hash
            )
            
            if not upload_result["success"]:
                return CDNUploadResult(
                    success=False,
                    error_message=upload_result["error"]
                )
            
            # Generate CDN URLs
            s3_url = f"https://{self.bucket_name}.s3.{self.settings.AWS_REGION}.amazonaws.com/{s3_key}"
            cloudfront_url = f"https://{self.cloudfront_domain}/{s3_key}" if self.cloudfront_domain else s3_url
            
            # Generate cache control header
            cache_control = f"public, max-age={cache_config['max_age']}, s-maxage={cache_config['max_age']}"
            
            return CDNUploadResult(
                success=True,
                cdn_url=cloudfront_url,
                s3_key=s3_key,
                cloudfront_url=cloudfront_url,
                cache_control=cache_control,
                file_size_bytes=file_size
            )
            
        except Exception as e:
            logger.error(f"Error uploading to CDN: {str(e)}")
            return CDNUploadResult(
                success=False,
                error_message=f"CDN upload failed: {str(e)}"
            )
    
    async def _generate_s3_key(
        self,
        file_path: str,
        media_type: str,
        poi_id: str,
        content_id: Optional[str]
    ) -> str:
        """Generate S3 key for the file."""
        
        # Get file extension
        file_extension = Path(file_path).suffix.lower()
        
        # Create timestamp for organization
        timestamp = datetime.utcnow().strftime("%Y/%m/%d")
        
        # Generate unique identifier
        if content_id:
            unique_id = content_id
        else:
            file_hash = await self._calculate_file_hash(file_path)
            unique_id = file_hash[:12]  # First 12 characters of hash
        
        # Construct S3 key
        s3_key = f"multimedia/{media_type}/{timestamp}/{poi_id}/{unique_id}{file_extension}"
        
        return s3_key
    
    async def _calculate_file_hash(self, file_path: str) -> str:
        """Calculate SHA-256 hash of file."""
        hash_sha256 = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_sha256.update(chunk)
        return hash_sha256.hexdigest()
    
    async def _upload_to_s3(
        self,
        file_path: str,
        s3_key: str,
        content_type: str,
        cache_config: Dict,
        file_hash: str
    ) -> Dict[str, Any]:
        """Upload file to S3 with metadata."""
        try:
            extra_args = {
                'ContentType': content_type,
                'CacheControl': f"public, max-age={cache_config['max_age']}",
                'Metadata': {
                    'sha256': file_hash,
                    'uploaded_at': datetime.utcnow().isoformat(),
                    'service': 'touriquest-poi'
                }
            }
            
            # Add storage class if specified
            if cache_config.get('s3_storage_class'):
                extra_args['StorageClass'] = cache_config['s3_storage_class']
            
            # Add content encoding if specified
            if cache_config.get('content_encoding'):
                extra_args['ContentEncoding'] = cache_config['content_encoding']
            
            # Upload file
            self.s3_client.upload_file(
                file_path,
                self.bucket_name,
                s3_key,
                ExtraArgs=extra_args
            )
            
            return {"success": True}
            
        except ClientError as e:
            logger.error(f"S3 upload error: {str(e)}")
            return {"success": False, "error": f"S3 upload failed: {str(e)}"}
        except Exception as e:
            logger.error(f"Unexpected upload error: {str(e)}")
            return {"success": False, "error": f"Upload failed: {str(e)}"}
    
    async def generate_delivery_info(
        self,
        cdn_url: str,
        file_size_bytes: int,
        media_type: str,
        user_location: Optional[Dict[str, float]] = None
    ) -> CDNDeliveryInfo:
        """
        Generate comprehensive delivery information for content.
        
        Args:
            cdn_url: Primary CDN URL
            file_size_bytes: File size in bytes
            media_type: Type of media content
            user_location: Optional user location for optimization
            
        Returns:
            CDNDeliveryInfo with delivery details
        """
        
        # Generate backup URLs (different CDN regions)
        backup_urls = []
        if self.cloudfront_domain:
            # Add regional CloudFront edges
            backup_urls.extend([
                cdn_url.replace(self.cloudfront_domain, f"edge1.{self.cloudfront_domain}"),
                cdn_url.replace(self.cloudfront_domain, f"edge2.{self.cloudfront_domain}")
            ])
        
        # Add S3 direct URLs as fallback
        s3_direct_url = cdn_url.replace(self.cloudfront_domain, f"{self.bucket_name}.s3.{self.settings.AWS_REGION}.amazonaws.com")
        backup_urls.append(s3_direct_url)
        
        # Cache settings for client
        cache_config = self.cache_settings.get(media_type, self.cache_settings["image"])
        cache_settings = {
            "max_age_seconds": cache_config["max_age"],
            "cache_strategy": "aggressive" if media_type in ["image", "texture"] else "normal",
            "allow_offline": media_type == "audio",
            "prefetch_recommended": file_size_bytes < 5 * 1024 * 1024  # < 5MB
        }
        
        # Estimate download time based on file size and connection
        # Assuming average mobile connection of 10 Mbps
        average_bandwidth_bps = 10 * 1024 * 1024 / 8  # 10 Mbps in bytes per second
        estimated_download_time = file_size_bytes / average_bandwidth_bps
        
        # Determine optimal CDN regions
        cdn_regions = ["us-east-1", "eu-west-1", "ap-southeast-1"]
        if user_location:
            # Could implement geo-based CDN selection here
            pass
        
        return CDNDeliveryInfo(
            primary_url=cdn_url,
            backup_urls=backup_urls,
            cache_settings=cache_settings,
            cdn_regions=cdn_regions,
            estimated_download_time=estimated_download_time
        )
    
    async def generate_presigned_url(
        self,
        s3_key: str,
        expiration_seconds: int = 3600,
        download_filename: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate a presigned URL for secure content access.
        
        Args:
            s3_key: S3 object key
            expiration_seconds: URL expiration time
            download_filename: Optional filename for download
            
        Returns:
            Dict with presigned URL and metadata
        """
        try:
            if not self.aws_available:
                return {
                    "success": False,
                    "error": "CDN not available - AWS not configured"
                }
            
            params = {
                'Bucket': self.bucket_name,
                'Key': s3_key
            }
            
            # Add download filename if specified
            if download_filename:
                params['ResponseContentDisposition'] = f'attachment; filename="{download_filename}"'
            
            # Generate presigned URL
            presigned_url = self.s3_client.generate_presigned_url(
                'get_object',
                Params=params,
                ExpiresIn=expiration_seconds
            )
            
            return {
                "success": True,
                "presigned_url": presigned_url,
                "expires_at": (datetime.utcnow() + timedelta(seconds=expiration_seconds)).isoformat(),
                "expiration_seconds": expiration_seconds
            }
            
        except Exception as e:
            logger.error(f"Error generating presigned URL: {str(e)}")
            return {
                "success": False,
                "error": f"Failed to generate presigned URL: {str(e)}"
            }
    
    async def invalidate_cache(
        self,
        paths: List[str],
        distribution_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Invalidate CloudFront cache for specified paths.
        
        Args:
            paths: List of paths to invalidate
            distribution_id: Optional CloudFront distribution ID
            
        Returns:
            Dict with invalidation details
        """
        try:
            if not self.aws_available or not self.cloudfront_client:
                return {
                    "success": False,
                    "error": "CloudFront not available"
                }
            
            if not distribution_id:
                distribution_id = self.settings.AWS_CLOUDFRONT_DISTRIBUTION_ID
            
            if not distribution_id:
                return {
                    "success": False,
                    "error": "CloudFront distribution ID not configured"
                }
            
            # Create invalidation
            invalidation_batch = {
                'Paths': {
                    'Quantity': len(paths),
                    'Items': paths
                },
                'CallerReference': f"touriquest-{datetime.utcnow().timestamp()}"
            }
            
            response = self.cloudfront_client.create_invalidation(
                DistributionId=distribution_id,
                InvalidationBatch=invalidation_batch
            )
            
            return {
                "success": True,
                "invalidation_id": response['Invalidation']['Id'],
                "status": response['Invalidation']['Status'],
                "paths": paths
            }
            
        except Exception as e:
            logger.error(f"Error invalidating cache: {str(e)}")
            return {
                "success": False,
                "error": f"Cache invalidation failed: {str(e)}"
            }
    
    async def get_content_metrics(self, s3_key: str) -> Dict[str, Any]:
        """Get metrics for content stored in CDN."""
        try:
            if not self.aws_available:
                return {
                    "success": False,
                    "error": "CDN not available"
                }
            
            # Get object metadata
            response = self.s3_client.head_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            
            return {
                "success": True,
                "s3_key": s3_key,
                "content_length": response.get('ContentLength', 0),
                "content_type": response.get('ContentType', ''),
                "last_modified": response.get('LastModified', '').isoformat() if response.get('LastModified') else None,
                "etag": response.get('ETag', '').strip('"'),
                "cache_control": response.get('CacheControl', ''),
                "metadata": response.get('Metadata', {}),
                "storage_class": response.get('StorageClass', 'STANDARD')
            }
            
        except ClientError as e:
            if e.response['Error']['Code'] == 'NoSuchKey':
                return {
                    "success": False,
                    "error": "Content not found in CDN"
                }
            else:
                logger.error(f"Error getting content metrics: {str(e)}")
                return {
                    "success": False,
                    "error": f"Failed to get content metrics: {str(e)}"
                }
        except Exception as e:
            logger.error(f"Unexpected error getting content metrics: {str(e)}")
            return {
                "success": False,
                "error": f"Failed to get content metrics: {str(e)}"
            }
    
    async def delete_from_cdn(self, s3_key: str) -> Dict[str, Any]:
        """Delete content from CDN."""
        try:
            if not self.aws_available:
                return {
                    "success": False,
                    "error": "CDN not available"
                }
            
            # Delete from S3
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            
            # Optionally invalidate CloudFront cache
            if self.cloudfront_domain:
                await self.invalidate_cache([f"/{s3_key}"])
            
            return {
                "success": True,
                "s3_key": s3_key,
                "deleted_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error deleting from CDN: {str(e)}")
            return {
                "success": False,
                "error": f"Failed to delete from CDN: {str(e)}"
            }