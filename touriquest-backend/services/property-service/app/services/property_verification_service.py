"""Property verification service with comprehensive verification processes"""

import asyncio
import uuid
import hashlib
import re
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any, Tuple
from decimal import Decimal
import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc, update
from sqlalchemy.orm import joinedload, selectinload

from app.core.database import get_session
from app.models.property_management_models import (
    PropertyListing, PropertyVerification, PropertyImageDetail,
    PropertyQualityScore, VerificationStatus, PropertyStatus
)
from app.schemas.property_management_schemas import (
    VerificationDocumentRequest, VerificationResponse,
    PropertyQualityScoreResponse
)
from app.services.cache_service import CacheService

logger = structlog.get_logger()


class PropertyVerificationService:
    """Comprehensive property verification service"""
    
    def __init__(self, cache_service: Optional[CacheService] = None):
        self.cache = cache_service
        
        # Verification thresholds and rules
        self.verification_rules = {
            "photo_requirements": {
                "minimum_photos": 5,
                "required_rooms": ["living_room", "bedroom", "bathroom", "kitchen"],
                "minimum_resolution": {"width": 800, "height": 600}
            },
            "document_requirements": {
                "required_documents": ["identity", "property_ownership", "insurance"],
                "document_expiry_days": 365
            },
            "safety_requirements": {
                "required_features": ["smoke_detector", "fire_extinguisher"],
                "recommended_features": ["carbon_monoxide_detector", "first_aid_kit"]
            },
            "quality_thresholds": {
                "minimum_overall_score": 60.0,
                "minimum_listing_score": 50.0,
                "minimum_photo_score": 40.0
            }
        }
    
    async def submit_verification_document(
        self,
        session: AsyncSession,
        property_id: str,
        host_id: str,
        document_request: VerificationDocumentRequest
    ) -> VerificationResponse:
        """Submit a verification document"""
        try:
            # Verify property ownership
            await self._verify_property_ownership(session, property_id, host_id)
            
            # Create verification record
            verification = PropertyVerification(
                id=str(uuid.uuid4()),
                property_id=property_id,
                verification_type=document_request.verification_type,
                document_type=document_request.document_type,
                document_url=document_request.document_url,
                document_metadata=document_request.document_metadata,
                notes=document_request.notes,
                status='submitted',
                submitted_at=datetime.utcnow()
            )
            
            session.add(verification)
            await session.flush()
            
            # Perform automatic verification if possible
            await self._perform_automatic_verification(session, verification)
            
            # Update property verification status
            await self._update_property_verification_status(session, property_id)
            
            await session.commit()
            
            # Clear cache
            if self.cache:
                await self.cache.invalidate_pattern(f"property:{property_id}:verification:*")
            
            logger.info(f"Verification document submitted: {verification.id}")
            
            return VerificationResponse(
                id=verification.id,
                verification_type=verification.verification_type,
                document_type=verification.document_type,
                status=verification.status,
                is_approved=verification.is_approved,
                rejection_reason=verification.rejection_reason,
                notes=verification.notes,
                confidence_score=verification.confidence_score,
                submitted_at=verification.submitted_at,
                reviewed_at=verification.reviewed_at
            )
            
        except Exception as e:
            await session.rollback()
            logger.error(f"Error submitting verification document: {str(e)}")
            raise
    
    async def get_verification_status(
        self,
        session: AsyncSession,
        property_id: str,
        host_id: str
    ) -> Dict[str, Any]:
        """Get comprehensive verification status for property"""
        try:
            # Verify ownership
            await self._verify_property_ownership(session, property_id, host_id)
            
            # Get all verification records
            query = select(PropertyVerification).where(
                PropertyVerification.property_id == property_id
            ).order_by(desc(PropertyVerification.created_at))
            
            result = await session.execute(query)
            verifications = result.scalars().all()
            
            # Group by verification type
            verification_status = {
                "documents": {"status": "not_started", "items": []},
                "photos": {"status": "not_started", "items": []},
                "address": {"status": "not_started", "items": []},
                "safety": {"status": "not_started", "items": []}
            }
            
            for verification in verifications:
                if verification.verification_type in verification_status:
                    verification_status[verification.verification_type]["items"].append({
                        "id": str(verification.id),
                        "document_type": verification.document_type,
                        "status": verification.status,
                        "is_approved": verification.is_approved,
                        "rejection_reason": verification.rejection_reason,
                        "confidence_score": verification.confidence_score,
                        "submitted_at": verification.submitted_at,
                        "reviewed_at": verification.reviewed_at
                    })
            
            # Determine overall status for each type
            for verification_type in verification_status:
                items = verification_status[verification_type]["items"]
                if not items:
                    verification_status[verification_type]["status"] = "not_started"
                elif all(item["is_approved"] for item in items if item["is_approved"] is not None):
                    verification_status[verification_type]["status"] = "completed"
                elif any(item["is_approved"] is False for item in items):
                    verification_status[verification_type]["status"] = "rejected"
                else:
                    verification_status[verification_type]["status"] = "in_progress"
            
            # Check photo verification
            photo_verification = await self._check_photo_verification(session, property_id)
            verification_status["photos"].update(photo_verification)
            
            # Check address verification
            address_verification = await self._check_address_verification(session, property_id)
            verification_status["address"].update(address_verification)
            
            # Check safety verification
            safety_verification = await self._check_safety_verification(session, property_id)
            verification_status["safety"].update(safety_verification)
            
            # Calculate overall verification progress
            completed_types = sum(1 for v in verification_status.values() if v["status"] == "completed")
            total_types = len(verification_status)
            overall_progress = (completed_types / total_types) * 100
            
            # Get quality score
            quality_score = await self._get_quality_score(session, property_id)
            
            return {
                "property_id": property_id,
                "overall_progress": overall_progress,
                "verification_status": verification_status,
                "quality_score": quality_score,
                "recommendations": await self._get_verification_recommendations(
                    session, property_id, verification_status, quality_score
                ),
                "next_steps": await self._get_next_verification_steps(verification_status)
            }
            
        except Exception as e:
            logger.error(f"Error getting verification status for property {property_id}: {str(e)}")
            raise
    
    async def verify_property_photos(
        self,
        session: AsyncSession,
        property_id: str,
        host_id: str
    ) -> Dict[str, Any]:
        """Verify property photos meet requirements"""
        try:
            # Verify ownership
            await self._verify_property_ownership(session, property_id, host_id)
            
            # Get property images
            query = select(PropertyImageDetail).where(
                PropertyImageDetail.property_id == property_id
            ).order_by(PropertyImageDetail.order_index)
            
            result = await session.execute(query)
            images = result.scalars().all()
            
            verification_results = {
                "total_photos": len(images),
                "verified_photos": 0,
                "issues": [],
                "recommendations": [],
                "meets_requirements": False,
                "photo_details": []
            }
            
            # Check minimum photo requirement
            min_photos = self.verification_rules["photo_requirements"]["minimum_photos"]
            if len(images) < min_photos:
                verification_results["issues"].append(
                    f"Need at least {min_photos} photos (currently {len(images)})"
                )
                verification_results["recommendations"].append(
                    f"Add {min_photos - len(images)} more high-quality photos"
                )
            
            # Check required room coverage
            required_rooms = self.verification_rules["photo_requirements"]["required_rooms"]
            covered_rooms = set()
            
            for image in images:
                # Verify individual photo
                photo_verification = await self._verify_individual_photo(image)
                verification_results["photo_details"].append(photo_verification)
                
                if photo_verification["is_verified"]:
                    verification_results["verified_photos"] += 1
                    if image.room_type:
                        covered_rooms.add(image.room_type)
                else:
                    verification_results["issues"].extend(photo_verification["issues"])
            
            # Check room coverage
            missing_rooms = set(required_rooms) - covered_rooms
            if missing_rooms:
                verification_results["issues"].append(
                    f"Missing photos for: {', '.join(missing_rooms)}"
                )
                verification_results["recommendations"].append(
                    f"Add photos for these areas: {', '.join(missing_rooms)}"
                )
            
            # Check for primary photo
            has_primary = any(image.is_primary for image in images)
            if not has_primary and images:
                verification_results["issues"].append("No primary photo selected")
                verification_results["recommendations"].append("Select your best photo as the primary image")
            
            # Determine if requirements are met
            verification_results["meets_requirements"] = (
                len(images) >= min_photos and
                len(missing_rooms) == 0 and
                verification_results["verified_photos"] >= min_photos * 0.8  # 80% of photos verified
            )
            
            # Update verification record
            await self._update_photo_verification_record(
                session, property_id, verification_results
            )
            
            return verification_results
            
        except Exception as e:
            logger.error(f"Error verifying photos for property {property_id}: {str(e)}")
            raise
    
    async def verify_property_address(
        self,
        session: AsyncSession,
        property_id: str,
        host_id: str
    ) -> Dict[str, Any]:
        """Verify property address and location"""
        try:
            # Verify ownership
            property_listing = await self._verify_property_ownership(session, property_id, host_id)
            
            verification_results = {
                "address_complete": False,
                "coordinates_valid": False,
                "geocoding_match": False,
                "issues": [],
                "recommendations": [],
                "confidence_score": 0.0
            }
            
            # Check address completeness
            required_fields = ['address', 'city', 'country']
            missing_fields = []
            
            for field in required_fields:
                if not getattr(property_listing, field):
                    missing_fields.append(field)
            
            if missing_fields:
                verification_results["issues"].append(
                    f"Missing address fields: {', '.join(missing_fields)}"
                )
                verification_results["recommendations"].append(
                    "Complete all required address fields"
                )
            else:
                verification_results["address_complete"] = True
                verification_results["confidence_score"] += 30
            
            # Check coordinates
            if property_listing.coordinates:
                verification_results["coordinates_valid"] = True
                verification_results["confidence_score"] += 25
                
                # Simulate geocoding verification (would use actual geocoding service)
                geocoding_confidence = await self._simulate_geocoding_verification(property_listing)
                verification_results["geocoding_match"] = geocoding_confidence > 0.8
                verification_results["confidence_score"] += geocoding_confidence * 45
            else:
                verification_results["issues"].append("No coordinates provided")
                verification_results["recommendations"].append(
                    "Add precise coordinates for better location accuracy"
                )
            
            # Additional validation checks
            if property_listing.postal_code:
                verification_results["confidence_score"] += 10
            
            # Create verification record
            verification = PropertyVerification(
                id=str(uuid.uuid4()),
                property_id=property_id,
                verification_type="address",
                status="completed" if verification_results["confidence_score"] > 70 else "needs_review",
                confidence_score=verification_results["confidence_score"],
                is_approved=verification_results["confidence_score"] > 70,
                notes=f"Address verification completed with {verification_results['confidence_score']:.1f}% confidence"
            )
            
            session.add(verification)
            await session.commit()
            
            return verification_results
            
        except Exception as e:
            logger.error(f"Error verifying address for property {property_id}: {str(e)}")
            raise
    
    async def verify_safety_compliance(
        self,
        session: AsyncSession,
        property_id: str,
        host_id: str
    ) -> Dict[str, Any]:
        """Verify property safety compliance"""
        try:
            # Verify ownership
            property_listing = await self._verify_property_ownership(session, property_id, host_id)
            
            verification_results = {
                "required_features_met": False,
                "safety_score": 0.0,
                "missing_features": [],
                "recommended_features": [],
                "issues": [],
                "recommendations": []
            }
            
            safety_features = property_listing.safety_features or {}
            
            # Check required safety features
            required_features = self.verification_rules["safety_requirements"]["required_features"]
            missing_required = []
            
            for feature in required_features:
                if not safety_features.get(feature, False):
                    missing_required.append(feature)
            
            if missing_required:
                verification_results["missing_features"] = missing_required
                verification_results["issues"].append(
                    f"Missing required safety features: {', '.join(missing_required)}"
                )
                verification_results["recommendations"].append(
                    "Install and mark all required safety features"
                )
            else:
                verification_results["required_features_met"] = True
                verification_results["safety_score"] += 60
            
            # Check recommended safety features
            recommended_features = self.verification_rules["safety_requirements"]["recommended_features"]
            missing_recommended = []
            
            for feature in recommended_features:
                if not safety_features.get(feature, False):
                    missing_recommended.append(feature)
                else:
                    verification_results["safety_score"] += 10
            
            if missing_recommended:
                verification_results["recommended_features"] = missing_recommended
                verification_results["recommendations"].append(
                    f"Consider adding these safety features: {', '.join(missing_recommended)}"
                )
            
            # Additional safety checks
            if safety_features.get("security_cameras", False):
                verification_results["safety_score"] += 10
            
            if safety_features.get("weapon_nearby", False) or safety_features.get("dangerous_animal", False):
                verification_results["issues"].append("Property has potential safety hazards")
                verification_results["safety_score"] -= 20
            
            # Cap the score at 100
            verification_results["safety_score"] = min(verification_results["safety_score"], 100)
            
            # Create verification record
            verification = PropertyVerification(
                id=str(uuid.uuid4()),
                property_id=property_id,
                verification_type="safety",
                status="completed" if verification_results["safety_score"] >= 60 else "needs_review",
                confidence_score=verification_results["safety_score"],
                is_approved=verification_results["required_features_met"],
                notes=f"Safety verification completed with score: {verification_results['safety_score']:.1f}"
            )
            
            session.add(verification)
            await session.commit()
            
            return verification_results
            
        except Exception as e:
            logger.error(f"Error verifying safety compliance for property {property_id}: {str(e)}")
            raise
    
    async def calculate_comprehensive_quality_score(
        self,
        session: AsyncSession,
        property_id: str
    ) -> PropertyQualityScoreResponse:
        """Calculate comprehensive quality score with detailed breakdown"""
        try:
            # Get property with all related data
            query = select(PropertyListing).options(
                selectinload(PropertyListing.amenities),
                selectinload(PropertyListing.images),
                selectinload(PropertyListing.house_rules)
            ).where(PropertyListing.id == property_id)
            
            result = await session.execute(query)
            property_listing = result.scalar_one_or_none()
            
            if not property_listing:
                raise ValueError("Property not found")
            
            # Calculate individual scores
            listing_score = await self._calculate_listing_quality_score(property_listing)
            photo_score = await self._calculate_photo_quality_score(property_listing)
            amenity_score = await self._calculate_amenity_score(property_listing)
            location_score = await self._calculate_location_score(property_listing)
            pricing_score = await self._calculate_pricing_competitiveness(session, property_listing)
            
            # Calculate overall score with weights
            weights = {
                "listing": 0.25,
                "photos": 0.20,
                "amenities": 0.15,
                "location": 0.15,
                "pricing": 0.15,
                "guest_satisfaction": 0.10
            }
            
            overall_score = (
                listing_score * weights["listing"] +
                photo_score * weights["photos"] +
                amenity_score * weights["amenities"] +
                location_score * weights["location"] +
                pricing_score * weights["pricing"] +
                (property_listing.average_rating * 20) * weights["guest_satisfaction"]  # Convert 5-star to 100-point scale
            )
            
            # Calculate detailed metrics
            description_completeness = self._calculate_description_completeness(property_listing)
            photo_count = len(property_listing.images)
            amenity_count = len(property_listing.amenities)
            
            # Generate recommendations
            recommendations = await self._generate_quality_recommendations(
                listing_score, photo_score, amenity_score, location_score,
                pricing_score, property_listing
            )
            
            # Update quality score record
            query = select(PropertyQualityScore).where(
                PropertyQualityScore.property_id == property_id
            )
            result = await session.execute(query)
            quality_score_record = result.scalar_one_or_none()
            
            if quality_score_record:
                quality_score_record.overall_score = overall_score
                quality_score_record.listing_quality_score = listing_score
                quality_score_record.photo_quality_score = photo_score
                quality_score_record.amenity_score = amenity_score
                quality_score_record.location_score = location_score
                quality_score_record.pricing_competitiveness = pricing_score
                quality_score_record.description_completeness = description_completeness
                quality_score_record.photo_count = photo_count
                quality_score_record.amenity_count = amenity_count
                quality_score_record.response_rate = property_listing.response_rate
                quality_score_record.guest_satisfaction = property_listing.average_rating
                quality_score_record.last_calculated = datetime.utcnow()
                quality_score_record.updated_at = datetime.utcnow()
            else:
                quality_score_record = PropertyQualityScore(
                    property_id=property_id,
                    overall_score=overall_score,
                    listing_quality_score=listing_score,
                    photo_quality_score=photo_score,
                    amenity_score=amenity_score,
                    location_score=location_score,
                    pricing_competitiveness=pricing_score,
                    description_completeness=description_completeness,
                    photo_count=photo_count,
                    amenity_count=amenity_count,
                    response_rate=property_listing.response_rate,
                    guest_satisfaction=property_listing.average_rating
                )
                session.add(quality_score_record)
            
            # Update property's quality score
            property_listing.quality_score = overall_score
            
            await session.commit()
            
            return PropertyQualityScoreResponse(
                overall_score=overall_score,
                listing_quality_score=listing_score,
                photo_quality_score=photo_score,
                amenity_score=amenity_score,
                location_score=location_score,
                pricing_competitiveness=pricing_score,
                description_completeness=description_completeness,
                photo_count=photo_count,
                amenity_count=amenity_count,
                response_rate=property_listing.response_rate,
                guest_satisfaction=property_listing.average_rating,
                last_calculated=quality_score_record.last_calculated,
                recommendations=recommendations
            )
            
        except Exception as e:
            logger.error(f"Error calculating quality score for property {property_id}: {str(e)}")
            raise
    
    # Helper Methods
    async def _verify_property_ownership(
        self,
        session: AsyncSession,
        property_id: str,
        host_id: str
    ) -> PropertyListing:
        """Verify property ownership and return property"""
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
    
    async def _perform_automatic_verification(
        self,
        session: AsyncSession,
        verification: PropertyVerification
    ):
        """Perform automatic verification checks"""
        try:
            if verification.verification_type == "documents":
                # Simulate document verification
                confidence = await self._simulate_document_verification(verification)
                verification.confidence_score = confidence
                verification.is_approved = confidence > 0.8
                verification.status = "approved" if verification.is_approved else "needs_review"
                
            elif verification.verification_type == "photos":
                # Photo verification is handled separately
                verification.status = "pending_review"
                
            elif verification.verification_type == "address":
                # Address verification handled separately
                verification.status = "pending_review"
                
            elif verification.verification_type == "safety":
                # Safety verification handled separately
                verification.status = "pending_review"
            
            verification.reviewed_at = datetime.utcnow()
            
        except Exception as e:
            logger.error(f"Error in automatic verification: {str(e)}")
            verification.status = "failed"
            verification.rejection_reason = f"Automatic verification failed: {str(e)}"
    
    async def _simulate_document_verification(
        self,
        verification: PropertyVerification
    ) -> float:
        """Simulate document verification (would use real verification service)"""
        # Simulate verification confidence based on document type
        confidence_scores = {
            "identity": 0.85,
            "property_ownership": 0.90,
            "insurance": 0.75,
            "license": 0.80
        }
        
        base_confidence = confidence_scores.get(verification.document_type, 0.5)
        
        # Add some randomness to simulate real verification
        import random
        variation = random.uniform(-0.1, 0.1)
        
        return max(0.0, min(1.0, base_confidence + variation))
    
    async def _simulate_geocoding_verification(
        self,
        property_listing: PropertyListing
    ) -> float:
        """Simulate geocoding verification (would use real geocoding service)"""
        # Check if coordinates make sense for the location
        if not property_listing.coordinates:
            return 0.0
        
        # Extract coordinates
        coords = self._extract_coordinates(property_listing.coordinates)
        if not coords:
            return 0.0
        
        # Simple checks for coordinate validity
        lat, lng = coords["latitude"], coords["longitude"]
        
        # Check if coordinates are within valid ranges
        if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
            return 0.0
        
        # Simulate country-specific validation
        # This would use actual geocoding services in production
        return 0.85  # Simulated high confidence
    
    async def _check_photo_verification(
        self,
        session: AsyncSession,
        property_id: str
    ) -> Dict[str, Any]:
        """Check photo verification status"""
        query = select(PropertyImageDetail).where(
            PropertyImageDetail.property_id == property_id
        )
        result = await session.execute(query)
        images = result.scalars().all()
        
        min_photos = self.verification_rules["photo_requirements"]["minimum_photos"]
        verified_photos = sum(1 for img in images if img.is_verified)
        
        if len(images) < min_photos:
            status = "insufficient"
            message = f"Need {min_photos - len(images)} more photos"
        elif verified_photos < min_photos * 0.8:
            status = "needs_review"
            message = "Some photos need verification"
        else:
            status = "completed"
            message = "Photo requirements met"
        
        return {
            "status": status,
            "message": message,
            "total_photos": len(images),
            "verified_photos": verified_photos,
            "required_photos": min_photos
        }
    
    async def _check_address_verification(
        self,
        session: AsyncSession,
        property_id: str
    ) -> Dict[str, Any]:
        """Check address verification status"""
        query = select(PropertyVerification).where(
            and_(
                PropertyVerification.property_id == property_id,
                PropertyVerification.verification_type == "address"
            )
        ).order_by(desc(PropertyVerification.created_at))
        
        result = await session.execute(query)
        latest_verification = result.scalar_one_or_none()
        
        if not latest_verification:
            return {"status": "not_started", "message": "Address verification not started"}
        
        if latest_verification.is_approved:
            return {"status": "completed", "message": "Address verified"}
        elif latest_verification.status == "rejected":
            return {"status": "rejected", "message": latest_verification.rejection_reason}
        else:
            return {"status": "in_progress", "message": "Address verification in progress"}
    
    async def _check_safety_verification(
        self,
        session: AsyncSession,
        property_id: str
    ) -> Dict[str, Any]:
        """Check safety verification status"""
        query = select(PropertyVerification).where(
            and_(
                PropertyVerification.property_id == property_id,
                PropertyVerification.verification_type == "safety"
            )
        ).order_by(desc(PropertyVerification.created_at))
        
        result = await session.execute(query)
        latest_verification = result.scalar_one_or_none()
        
        if not latest_verification:
            return {"status": "not_started", "message": "Safety verification not started"}
        
        if latest_verification.is_approved:
            return {"status": "completed", "message": "Safety requirements met"}
        elif latest_verification.status == "rejected":
            return {"status": "rejected", "message": latest_verification.rejection_reason}
        else:
            return {"status": "in_progress", "message": "Safety verification in progress"}
    
    async def _verify_individual_photo(
        self,
        image: PropertyImageDetail
    ) -> Dict[str, Any]:
        """Verify individual photo quality and requirements"""
        issues = []
        is_verified = True
        
        # Check resolution
        min_resolution = self.verification_rules["photo_requirements"]["minimum_resolution"]
        if image.width and image.height:
            if image.width < min_resolution["width"] or image.height < min_resolution["height"]:
                issues.append("Resolution too low")
                is_verified = False
        
        # Check file size (not too small, not too large)
        if image.file_size:
            if image.file_size < 100000:  # 100KB
                issues.append("File size too small")
                is_verified = False
            elif image.file_size > 10000000:  # 10MB
                issues.append("File size too large")
        
        # Check if alt text is provided
        if not image.alt_text:
            issues.append("Missing alt text")
        
        return {
            "image_id": str(image.id),
            "is_verified": is_verified,
            "issues": issues,
            "room_type": image.room_type,
            "is_primary": image.is_primary
        }
    
    async def _get_quality_score(
        self,
        session: AsyncSession,
        property_id: str
    ) -> Optional[Dict[str, float]]:
        """Get current quality score"""
        query = select(PropertyQualityScore).where(
            PropertyQualityScore.property_id == property_id
        )
        result = await session.execute(query)
        quality_score = result.scalar_one_or_none()
        
        if quality_score:
            return {
                "overall_score": quality_score.overall_score,
                "listing_quality_score": quality_score.listing_quality_score,
                "photo_quality_score": quality_score.photo_quality_score,
                "amenity_score": quality_score.amenity_score,
                "location_score": quality_score.location_score
            }
        
        return None
    
    async def _get_verification_recommendations(
        self,
        session: AsyncSession,
        property_id: str,
        verification_status: Dict[str, Any],
        quality_score: Optional[Dict[str, float]]
    ) -> List[str]:
        """Generate verification recommendations"""
        recommendations = []
        
        # Document recommendations
        if verification_status["documents"]["status"] != "completed":
            recommendations.append("Upload required identity and property ownership documents")
        
        # Photo recommendations
        if verification_status["photos"]["status"] != "completed":
            recommendations.append("Add high-quality photos of all rooms")
            recommendations.append("Ensure good lighting and clear views in photos")
        
        # Address recommendations
        if verification_status["address"]["status"] != "completed":
            recommendations.append("Complete address information and verify location coordinates")
        
        # Safety recommendations
        if verification_status["safety"]["status"] != "completed":
            recommendations.append("Install required safety equipment (smoke detector, fire extinguisher)")
        
        # Quality score recommendations
        if quality_score:
            if quality_score["overall_score"] < 70:
                recommendations.append("Improve listing quality to increase visibility")
            if quality_score["photo_quality_score"] < 60:
                recommendations.append("Add more professional photos")
            if quality_score["amenity_score"] < 50:
                recommendations.append("List more amenities and features")
        
        return recommendations
    
    async def _get_next_verification_steps(
        self,
        verification_status: Dict[str, Any]
    ) -> List[str]:
        """Get next steps for verification"""
        next_steps = []
        
        for verification_type, status_info in verification_status.items():
            if status_info["status"] == "not_started":
                if verification_type == "documents":
                    next_steps.append("Upload identity and property ownership documents")
                elif verification_type == "photos":
                    next_steps.append("Add at least 5 high-quality photos")
                elif verification_type == "address":
                    next_steps.append("Complete address details and add coordinates")
                elif verification_type == "safety":
                    next_steps.append("Install safety equipment and update safety features")
            elif status_info["status"] == "rejected":
                next_steps.append(f"Fix issues with {verification_type} verification")
        
        if not next_steps:
            next_steps.append("All verification requirements completed!")
        
        return next_steps
    
    def _extract_coordinates(self, geometry) -> Optional[Dict[str, float]]:
        """Extract coordinates from PostGIS geometry"""
        if hasattr(geometry, 'x') and hasattr(geometry, 'y'):
            return {"longitude": geometry.x, "latitude": geometry.y}
        return None
    
    # Quality calculation methods (simplified versions)
    async def _calculate_listing_quality_score(self, property_listing: PropertyListing) -> float:
        """Calculate listing quality score"""
        # Implementation from property_management_service.py
        return 75.0  # Placeholder
    
    async def _calculate_photo_quality_score(self, property_listing: PropertyListing) -> float:
        """Calculate photo quality score"""
        photo_count = len(property_listing.images)
        if photo_count >= 10:
            return 100.0
        elif photo_count >= 5:
            return 80.0
        elif photo_count >= 3:
            return 60.0
        else:
            return photo_count * 20.0
    
    async def _calculate_amenity_score(self, property_listing: PropertyListing) -> float:
        """Calculate amenity score"""
        amenity_count = len(property_listing.amenities)
        return min(amenity_count * 5, 100.0)
    
    async def _calculate_location_score(self, property_listing: PropertyListing) -> float:
        """Calculate location score"""
        score = 0.0
        if property_listing.address and property_listing.city and property_listing.country:
            score += 50
        if property_listing.coordinates:
            score += 30
        if property_listing.postal_code:
            score += 10
        if property_listing.state:
            score += 10
        return score
    
    async def _calculate_pricing_competitiveness(
        self,
        session: AsyncSession,
        property_listing: PropertyListing
    ) -> float:
        """Calculate pricing competitiveness score"""
        # Simplified implementation - would compare with similar properties
        return 80.0  # Placeholder
    
    def _calculate_description_completeness(self, property_listing: PropertyListing) -> float:
        """Calculate description completeness percentage"""
        fields = [
            property_listing.title,
            property_listing.description,
            property_listing.summary,
            property_listing.space_description,
            property_listing.guest_access,
            property_listing.neighborhood_overview,
            property_listing.transit_info
        ]
        completed = sum(1 for field in fields if field and len(field.strip()) > 0)
        return (completed / len(fields)) * 100
    
    async def _generate_quality_recommendations(
        self,
        listing_score: float,
        photo_score: float,
        amenity_score: float,
        location_score: float,
        pricing_score: float,
        property_listing: PropertyListing
    ) -> List[str]:
        """Generate quality improvement recommendations"""
        recommendations = []
        
        if listing_score < 70:
            recommendations.append("Improve listing description and add more details")
        if photo_score < 60:
            recommendations.append("Add more high-quality photos of your property")
        if amenity_score < 50:
            recommendations.append("List more amenities and features")
        if location_score < 80:
            recommendations.append("Complete address information and add coordinates")
        if pricing_score < 60:
            recommendations.append("Review pricing strategy for competitiveness")
        
        return recommendations
    
    async def _update_photo_verification_record(
        self,
        session: AsyncSession,
        property_id: str,
        verification_results: Dict[str, Any]
    ):
        """Update photo verification record"""
        verification = PropertyVerification(
            id=str(uuid.uuid4()),
            property_id=property_id,
            verification_type="photos",
            status="completed" if verification_results["meets_requirements"] else "needs_review",
            confidence_score=verification_results["verified_photos"] / max(verification_results["total_photos"], 1) * 100,
            is_approved=verification_results["meets_requirements"],
            notes=f"Photo verification: {verification_results['verified_photos']}/{verification_results['total_photos']} photos verified"
        )
        session.add(verification)
    
    async def _update_property_verification_status(
        self,
        session: AsyncSession,
        property_id: str
    ):
        """Update overall property verification status"""
        # Get all verification records
        query = select(PropertyVerification).where(
            PropertyVerification.property_id == property_id
        )
        result = await session.execute(query)
        verifications = result.scalars().all()
        
        # Check completion status
        verification_types = {"documents", "photos", "address", "safety"}
        completed_types = set()
        
        for verification in verifications:
            if verification.is_approved:
                completed_types.add(verification.verification_type)
        
        # Update property verification status
        query = select(PropertyListing).where(PropertyListing.id == property_id)
        result = await session.execute(query)
        property_listing = result.scalar_one_or_none()
        
        if property_listing:
            if len(completed_types) == len(verification_types):
                property_listing.verification_status = VerificationStatus.COMPLETED.value
                if property_listing.status == PropertyStatus.DRAFT.value:
                    property_listing.status = PropertyStatus.PENDING_REVIEW.value
            elif len(completed_types) > 0:
                property_listing.verification_status = VerificationStatus.IN_PROGRESS.value
            else:
                property_listing.verification_status = VerificationStatus.NOT_STARTED.value