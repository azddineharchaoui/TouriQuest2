"""Property management API endpoints"""

from datetime import datetime, date, timedelta
from typing import Optional, List, Dict, Any
from decimal import Decimal
import structlog
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from fastapi.security import HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.security import get_current_user, require_permissions
from app.core.permissions import PropertyPermissions
from app.schemas.property_management_schemas import (
    PropertyCreateRequest, PropertyCreateResponse,
    PropertyUpdateRequest, PropertyUpdateResponse,
    PropertyResponse, PropertyListResponse,
    AvailabilityUpdateRequest, PricingUpdateRequest,
    VerificationDocumentRequest, VerificationStatusResponse,
    PropertyAnalyticsResponse, PropertyEarningsReport,
    PropertyOccupancyReport, PropertyPerformanceReport,
    PropertyCompetitiveAnalysis, PropertyInsightsResponse,
    PricingOptimizationRequest, PricingOptimizationResponse,
    PricingRuleRequest, PricingRuleResponse,
    PropertyImageUploadRequest, PropertyImageUploadResponse,
    ImageOptimizationRequest, ImageProcessingResponse,
    VirtualTourRequest, VirtualTourResponse,
    ImageQualityAnalysis
)
from app.services.property_management_service import PropertyManagementService
from app.services.property_verification_service import PropertyVerificationService
from app.services.dynamic_pricing_service import DynamicPricingService
from app.services.property_analytics_service import PropertyAnalyticsService, AnalyticsPeriod
from app.services.property_image_processing_service import PropertyImageProcessingService
from app.services.cache_service import CacheService

logger = structlog.get_logger()

# Initialize router
router = APIRouter(prefix="/api/v1/properties", tags=["Property Management"])
security = HTTPBearer()

# Service dependencies (would be injected via DI container in production)
def get_property_service() -> PropertyManagementService:
    return PropertyManagementService()

def get_verification_service() -> PropertyVerificationService:
    return PropertyVerificationService()

def get_pricing_service() -> DynamicPricingService:
    return DynamicPricingService()

def get_analytics_service() -> PropertyAnalyticsService:
    return PropertyAnalyticsService()

def get_image_service() -> PropertyImageProcessingService:
    # Would inject actual storage service
    from app.core.storage import StorageService
    return PropertyImageProcessingService(StorageService())


# Property CRUD Endpoints
@router.post("/", response_model=PropertyCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_property(
    property_data: PropertyCreateRequest,
    session: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_user),
    property_service: PropertyManagementService = Depends(get_property_service)
):
    """Create a new property listing"""
    try:
        logger.info(f"Creating property for host {current_user['user_id']}")
        
        # Check permissions
        await require_permissions(current_user, [PropertyPermissions.CREATE_PROPERTY])
        
        # Create property
        property_response = await property_service.create_property(
            session, property_data, current_user["user_id"]
        )
        
        logger.info(f"Property created successfully: {property_response.property_id}")
        return property_response
        
    except Exception as e:
        logger.error(f"Error creating property: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create property: {str(e)}"
        )


@router.get("/{property_id}", response_model=PropertyResponse)
async def get_property(
    property_id: str,
    session: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_user),
    property_service: PropertyManagementService = Depends(get_property_service)
):
    """Get property details"""
    try:
        property_response = await property_service.get_property_by_id(
            session, property_id, current_user["user_id"]
        )
        
        if not property_response:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Property not found"
            )
        
        return property_response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving property {property_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve property"
        )


@router.put("/{property_id}", response_model=PropertyUpdateResponse)
async def update_property(
    property_id: str,
    property_data: PropertyUpdateRequest,
    session: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_user),
    property_service: PropertyManagementService = Depends(get_property_service)
):
    """Update property details"""
    try:
        await require_permissions(current_user, [PropertyPermissions.UPDATE_PROPERTY])
        
        property_response = await property_service.update_property(
            session, property_id, property_data, current_user["user_id"]
        )
        
        logger.info(f"Property {property_id} updated successfully")
        return property_response
        
    except Exception as e:
        logger.error(f"Error updating property {property_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update property: {str(e)}"
        )


@router.delete("/{property_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_property(
    property_id: str,
    session: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_user),
    property_service: PropertyManagementService = Depends(get_property_service)
):
    """Delete property listing"""
    try:
        await require_permissions(current_user, [PropertyPermissions.DELETE_PROPERTY])
        
        await property_service.delete_property(
            session, property_id, current_user["user_id"]
        )
        
        logger.info(f"Property {property_id} deleted successfully")
        
    except Exception as e:
        logger.error(f"Error deleting property {property_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to delete property: {str(e)}"
        )


@router.get("/", response_model=PropertyListResponse)
async def list_host_properties(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = Query(None),
    session: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_user),
    property_service: PropertyManagementService = Depends(get_property_service)
):
    """List host's properties"""
    try:
        properties = await property_service.get_host_properties(
            session, current_user["user_id"], page, limit, status_filter
        )
        
        return properties
        
    except Exception as e:
        logger.error(f"Error listing properties for host {current_user['user_id']}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve properties"
        )


# Calendar Management Endpoints
@router.patch("/{property_id}/availability", status_code=status.HTTP_200_OK)
async def update_availability(
    property_id: str,
    availability_data: AvailabilityUpdateRequest,
    session: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_user),
    property_service: PropertyManagementService = Depends(get_property_service)
):
    """Update property availability"""
    try:
        await require_permissions(current_user, [PropertyPermissions.MANAGE_CALENDAR])
        
        await property_service.update_availability(
            session, property_id, availability_data, current_user["user_id"]
        )
        
        return {"message": "Availability updated successfully"}
        
    except Exception as e:
        logger.error(f"Error updating availability for property {property_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update availability: {str(e)}"
        )


@router.patch("/{property_id}/pricing", status_code=status.HTTP_200_OK)
async def update_pricing(
    property_id: str,
    pricing_data: PricingUpdateRequest,
    session: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_user),
    property_service: PropertyManagementService = Depends(get_property_service)
):
    """Update property pricing"""
    try:
        await require_permissions(current_user, [PropertyPermissions.MANAGE_PRICING])
        
        await property_service.update_pricing(
            session, property_id, pricing_data, current_user["user_id"]
        )
        
        return {"message": "Pricing updated successfully"}
        
    except Exception as e:
        logger.error(f"Error updating pricing for property {property_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update pricing: {str(e)}"
        )


@router.get("/{property_id}/calendar")
async def get_calendar_data(
    property_id: str,
    start_date: date = Query(...),
    end_date: date = Query(...),
    session: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_user),
    property_service: PropertyManagementService = Depends(get_property_service)
):
    """Get property calendar data"""
    try:
        calendar_data = await property_service.get_calendar_data(
            session, property_id, start_date, end_date, current_user["user_id"]
        )
        
        return calendar_data
        
    except Exception as e:
        logger.error(f"Error retrieving calendar for property {property_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve calendar data"
        )


# Verification Endpoints
@router.post("/{property_id}/verification/documents", response_model=VerificationStatusResponse)
async def submit_verification_document(
    property_id: str,
    document_data: VerificationDocumentRequest,
    session: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_user),
    verification_service: PropertyVerificationService = Depends(get_verification_service)
):
    """Submit property verification document"""
    try:
        await require_permissions(current_user, [PropertyPermissions.MANAGE_VERIFICATION])
        
        verification_response = await verification_service.submit_verification_document(
            session, property_id, document_data, current_user["user_id"]
        )
        
        return verification_response
        
    except Exception as e:
        logger.error(f"Error submitting verification document: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to submit verification document: {str(e)}"
        )


@router.get("/{property_id}/verification/status", response_model=VerificationStatusResponse)
async def get_verification_status(
    property_id: str,
    session: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_user),
    verification_service: PropertyVerificationService = Depends(get_verification_service)
):
    """Get property verification status"""
    try:
        verification_status = await verification_service.get_verification_status(
            session, property_id, current_user["user_id"]
        )
        
        return verification_status
        
    except Exception as e:
        logger.error(f"Error retrieving verification status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve verification status"
        )


@router.post("/{property_id}/verification/photos")
async def verify_property_photos(
    property_id: str,
    session: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_user),
    verification_service: PropertyVerificationService = Depends(get_verification_service)
):
    """Verify property photos"""
    try:
        verification_result = await verification_service.verify_property_photos(
            session, property_id, current_user["user_id"]
        )
        
        return verification_result
        
    except Exception as e:
        logger.error(f"Error verifying property photos: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to verify photos: {str(e)}"
        )


# Analytics Endpoints
@router.get("/{property_id}/analytics", response_model=PropertyAnalyticsResponse)
async def get_property_analytics(
    property_id: str,
    period: AnalyticsPeriod = Query(AnalyticsPeriod.MONTHLY),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    session: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_user),
    analytics_service: PropertyAnalyticsService = Depends(get_analytics_service)
):
    """Get property analytics"""
    try:
        analytics = await analytics_service.get_property_analytics(
            session, property_id, current_user["user_id"], period, start_date, end_date
        )
        
        return analytics
        
    except Exception as e:
        logger.error(f"Error retrieving analytics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve analytics"
        )


@router.get("/{property_id}/analytics/earnings", response_model=PropertyEarningsReport)
async def get_earnings_report(
    property_id: str,
    year: int = Query(...),
    month: Optional[int] = Query(None),
    session: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_user),
    analytics_service: PropertyAnalyticsService = Depends(get_analytics_service)
):
    """Get property earnings report"""
    try:
        earnings_report = await analytics_service.generate_earnings_report(
            session, property_id, current_user["user_id"], year, month
        )
        
        return earnings_report
        
    except Exception as e:
        logger.error(f"Error generating earnings report: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate earnings report"
        )


@router.get("/{property_id}/analytics/occupancy", response_model=PropertyOccupancyReport)
async def get_occupancy_analytics(
    property_id: str,
    period: AnalyticsPeriod = Query(AnalyticsPeriod.MONTHLY),
    session: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_user),
    analytics_service: PropertyAnalyticsService = Depends(get_analytics_service)
):
    """Get occupancy analytics"""
    try:
        occupancy_report = await analytics_service.get_occupancy_analytics(
            session, property_id, current_user["user_id"], period
        )
        
        return occupancy_report
        
    except Exception as e:
        logger.error(f"Error retrieving occupancy analytics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve occupancy analytics"
        )


@router.get("/{property_id}/analytics/performance", response_model=PropertyPerformanceReport)
async def get_performance_report(
    property_id: str,
    session: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_user),
    analytics_service: PropertyAnalyticsService = Depends(get_analytics_service)
):
    """Get performance report"""
    try:
        performance_report = await analytics_service.generate_performance_report(
            session, property_id, current_user["user_id"]
        )
        
        return performance_report
        
    except Exception as e:
        logger.error(f"Error generating performance report: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate performance report"
        )


@router.get("/{property_id}/analytics/competitive", response_model=PropertyCompetitiveAnalysis)
async def get_competitive_analysis(
    property_id: str,
    session: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_user),
    analytics_service: PropertyAnalyticsService = Depends(get_analytics_service)
):
    """Get competitive analysis"""
    try:
        competitive_analysis = await analytics_service.get_competitive_analysis(
            session, property_id, current_user["user_id"]
        )
        
        return competitive_analysis
        
    except Exception as e:
        logger.error(f"Error retrieving competitive analysis: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve competitive analysis"
        )


@router.get("/{property_id}/insights", response_model=PropertyInsightsResponse)
async def get_property_insights(
    property_id: str,
    session: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_user),
    analytics_service: PropertyAnalyticsService = Depends(get_analytics_service)
):
    """Get AI-powered property insights"""
    try:
        insights = await analytics_service.generate_insights_summary(
            session, property_id, current_user["user_id"]
        )
        
        return insights
        
    except Exception as e:
        logger.error(f"Error generating insights: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate insights"
        )


# Dynamic Pricing Endpoints
@router.post("/{property_id}/pricing/optimize", response_model=PricingOptimizationResponse)
async def optimize_pricing(
    property_id: str,
    optimization_request: PricingOptimizationRequest,
    session: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_user),
    pricing_service: DynamicPricingService = Depends(get_pricing_service)
):
    """Generate pricing optimization recommendations"""
    try:
        await require_permissions(current_user, [PropertyPermissions.MANAGE_PRICING])
        
        optimization_response = await pricing_service.generate_pricing_recommendations(
            session, optimization_request, current_user["user_id"]
        )
        
        return optimization_response
        
    except Exception as e:
        logger.error(f"Error generating pricing optimization: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to generate pricing optimization: {str(e)}"
        )


@router.post("/{property_id}/pricing/rules", response_model=PricingRuleResponse)
async def create_pricing_rule(
    property_id: str,
    rule_request: PricingRuleRequest,
    session: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_user),
    pricing_service: DynamicPricingService = Depends(get_pricing_service)
):
    """Create pricing rule"""
    try:
        await require_permissions(current_user, [PropertyPermissions.MANAGE_PRICING])
        
        pricing_rule = await pricing_service.create_pricing_rule(
            session, property_id, current_user["user_id"], rule_request
        )
        
        return pricing_rule
        
    except Exception as e:
        logger.error(f"Error creating pricing rule: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create pricing rule: {str(e)}"
        )


@router.get("/{property_id}/pricing/competitor-analysis")
async def get_competitor_pricing_analysis(
    property_id: str,
    session: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_user),
    pricing_service: DynamicPricingService = Depends(get_pricing_service)
):
    """Get competitor pricing analysis"""
    try:
        competitor_analysis = await pricing_service.analyze_competitor_pricing(
            session, property_id, current_user["user_id"]
        )
        
        return competitor_analysis
        
    except Exception as e:
        logger.error(f"Error retrieving competitor analysis: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve competitor analysis"
        )


@router.get("/{property_id}/pricing/seasonal-suggestions")
async def get_seasonal_pricing_suggestions(
    property_id: str,
    year: int = Query(...),
    session: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_user),
    pricing_service: DynamicPricingService = Depends(get_pricing_service)
):
    """Get seasonal pricing suggestions"""
    try:
        seasonal_suggestions = await pricing_service.get_seasonal_pricing_suggestions(
            session, property_id, current_user["user_id"], year
        )
        
        return seasonal_suggestions
        
    except Exception as e:
        logger.error(f"Error retrieving seasonal suggestions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve seasonal suggestions"
        )


# Image Management Endpoints
@router.post("/{property_id}/images", response_model=PropertyImageUploadResponse)
async def upload_property_images(
    property_id: str,
    files: List[UploadFile] = File(...),
    image_types: List[str] = Form(...),
    descriptions: List[str] = Form(None),
    session: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_user),
    image_service: PropertyImageProcessingService = Depends(get_image_service)
):
    """Upload property images"""
    try:
        await require_permissions(current_user, [PropertyPermissions.MANAGE_IMAGES])
        
        # Prepare upload request
        images_data = []
        for i, file in enumerate(files):
            file_data = await file.read()
            images_data.append({
                "file_data": file_data,
                "filename": file.filename,
                "mime_type": file.content_type,
                "image_type": image_types[i] if i < len(image_types) else "gallery",
                "description": descriptions[i] if descriptions and i < len(descriptions) else ""
            })
        
        upload_request = PropertyImageUploadRequest(images=images_data)
        
        upload_response = await image_service.upload_property_images(
            session, property_id, current_user["user_id"], upload_request
        )
        
        return upload_response
        
    except Exception as e:
        logger.error(f"Error uploading images: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to upload images: {str(e)}"
        )


@router.post("/{property_id}/images/{image_id}/optimize", response_model=ImageProcessingResponse)
async def optimize_image(
    property_id: str,
    image_id: str,
    optimization_request: ImageOptimizationRequest,
    session: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_user),
    image_service: PropertyImageProcessingService = Depends(get_image_service)
):
    """Optimize property image"""
    try:
        await require_permissions(current_user, [PropertyPermissions.MANAGE_IMAGES])
        
        optimization_response = await image_service.process_image_optimization(
            session, image_id, optimization_request
        )
        
        return optimization_response
        
    except Exception as e:
        logger.error(f"Error optimizing image: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to optimize image: {str(e)}"
        )


@router.get("/{property_id}/images/{image_id}/quality-analysis", response_model=ImageQualityAnalysis)
async def analyze_image_quality(
    property_id: str,
    image_id: str,
    session: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_user),
    image_service: PropertyImageProcessingService = Depends(get_image_service)
):
    """Analyze image quality"""
    try:
        quality_analysis = await image_service.analyze_image_quality(
            session, image_id, current_user["user_id"]
        )
        
        return quality_analysis
        
    except Exception as e:
        logger.error(f"Error analyzing image quality: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to analyze image quality"
        )


@router.post("/{property_id}/virtual-tour", response_model=VirtualTourResponse)
async def create_virtual_tour(
    property_id: str,
    tour_request: VirtualTourRequest,
    session: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_user),
    image_service: PropertyImageProcessingService = Depends(get_image_service)
):
    """Create virtual tour"""
    try:
        await require_permissions(current_user, [PropertyPermissions.MANAGE_IMAGES])
        
        virtual_tour = await image_service.create_virtual_tour(
            session, property_id, current_user["user_id"], tour_request
        )
        
        return virtual_tour
        
    except Exception as e:
        logger.error(f"Error creating virtual tour: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create virtual tour: {str(e)}"
        )


@router.post("/{property_id}/images/batch-process")
async def batch_process_images(
    property_id: str,
    processing_options: Dict[str, Any],
    session: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_user),
    image_service: PropertyImageProcessingService = Depends(get_image_service)
):
    """Batch process property images"""
    try:
        await require_permissions(current_user, [PropertyPermissions.MANAGE_IMAGES])
        
        batch_result = await image_service.batch_process_images(
            session, property_id, current_user["user_id"], processing_options
        )
        
        return batch_result
        
    except Exception as e:
        logger.error(f"Error in batch processing: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to batch process images: {str(e)}"
        )


@router.post("/{property_id}/slideshow")
async def generate_property_slideshow(
    property_id: str,
    slideshow_config: Dict[str, Any],
    session: AsyncSession = Depends(get_session),
    current_user = Depends(get_current_user),
    image_service: PropertyImageProcessingService = Depends(get_image_service)
):
    """Generate property slideshow"""
    try:
        await require_permissions(current_user, [PropertyPermissions.MANAGE_IMAGES])
        
        slideshow = await image_service.generate_property_slideshow(
            session, property_id, current_user["user_id"], slideshow_config
        )
        
        return slideshow
        
    except Exception as e:
        logger.error(f"Error generating slideshow: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to generate slideshow: {str(e)}"
        )


# Health Check Endpoint
@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "property-management",
        "version": "1.0.0",
        "timestamp": datetime.utcnow()
    }


# Error Handlers
@router.exception_handler(ValueError)
async def value_error_handler(request, exc):
    return HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=str(exc)
    )


@router.exception_handler(PermissionError)
async def permission_error_handler(request, exc):
    return HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Insufficient permissions"
    )