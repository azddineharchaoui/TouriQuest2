"""Core property management service with CRUD operations and business logic"""

import asyncio
import uuid
from datetime import datetime, date, timedelta
from typing import Optional, Dict, List, Any, Tuple
from decimal import Decimal
import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc, update, delete
from sqlalchemy.orm import joinedload, selectinload
from geoalchemy2.functions import ST_Distance, ST_Point

from app.core.database import get_session
from app.models.property_management_models import (
    PropertyListing, PropertyAmenityDetail, PropertyImageDetail,
    PricingCalendar, AvailabilityCalendar, PropertyHouseRule,
    PropertyVerification, PropertyAnalytics, PropertyQualityScore,
    PropertyRevenueReport, PricingRule, PropertyCompetitorAnalysis
)
from app.schemas.property_management_schemas import (
    PropertyCreateRequest, PropertyUpdateRequest, PropertyDetailResponse,
    AvailabilityUpdateRequest, PricingUpdateRequest, CalendarResponse,
    PropertyAnalyticsResponse, PropertyQualityScoreResponse,
    PropertyRevenueReportResponse, PricingOptimizationResponse,
    PricingRecommendation, PropertyStatus, VerificationStatus
)
from app.services.cache_service import CacheService

logger = structlog.get_logger()


class PropertyManagementService:
    """Comprehensive property management service"""
    
    def __init__(self, cache_service: Optional[CacheService] = None):
        self.cache = cache_service
    
    # Property CRUD Operations
    async def create_property(
        self,
        session: AsyncSession,
        host_id: str,
        property_data: PropertyCreateRequest
    ) -> PropertyDetailResponse:
        """Create a new property listing"""
        try:
            # Create main property listing
            property_listing = PropertyListing(
                id=str(uuid.uuid4()),
                host_id=host_id,
                title=property_data.basic_info.title,
                description=property_data.basic_info.description,
                summary=property_data.basic_info.summary,
                property_type=property_data.basic_info.property_type.value,
                room_type=property_data.basic_info.room_type.value,
                accommodates=property_data.basic_info.accommodates,
                bedrooms=property_data.basic_info.bedrooms,
                beds=property_data.basic_info.beds,
                bathrooms=property_data.basic_info.bathrooms,
                
                # Location
                address=property_data.location.address,
                city=property_data.location.city,
                state=property_data.location.state,
                country=property_data.location.country,
                postal_code=property_data.location.postal_code,
                
                # Pricing
                base_price=property_data.pricing.base_price,
                currency=property_data.pricing.currency,
                cleaning_fee=property_data.pricing.cleaning_fee or 0,
                service_fee=property_data.pricing.service_fee or 0,
                security_deposit=property_data.pricing.security_deposit or 0,
                pricing_strategy=property_data.pricing.pricing_strategy.value,
                
                # Booking settings
                instant_book=property_data.booking_settings.instant_book,
                minimum_stay=property_data.booking_settings.minimum_stay,
                maximum_stay=property_data.booking_settings.maximum_stay,
                advance_notice=property_data.booking_settings.advance_notice,
                preparation_time=property_data.booking_settings.preparation_time,
                check_in_time=property_data.booking_settings.check_in_time,
                check_out_time=property_data.booking_settings.check_out_time,
                smoking_allowed=property_data.booking_settings.smoking_allowed,
                pets_allowed=property_data.booking_settings.pets_allowed,
                parties_allowed=property_data.booking_settings.parties_allowed,
                children_allowed=property_data.booking_settings.children_allowed,
                additional_rules=property_data.booking_settings.additional_rules,
                
                # Features
                safety_features=property_data.safety_features.dict(),
                accessibility_features=property_data.accessibility_features.dict(),
                
                # Additional info
                space_description=property_data.space_description,
                guest_access=property_data.guest_access,
                interaction_with_guests=property_data.interaction_with_guests,
                neighborhood_overview=property_data.neighborhood_overview,
                transit_info=property_data.transit_info,
                
                status=PropertyStatus.DRAFT.value,
                verification_status=VerificationStatus.NOT_STARTED.value
            )
            
            # Add coordinates if provided
            if property_data.location.latitude and property_data.location.longitude:
                property_listing.coordinates = f"POINT({property_data.location.longitude} {property_data.location.latitude})"
            
            session.add(property_listing)
            await session.flush()  # Get the ID
            
            # Add amenities
            for amenity_data in property_data.amenities:
                amenity = PropertyAmenityDetail(
                    property_id=property_listing.id,
                    category=amenity_data.category,
                    amenity_type=amenity_data.amenity_type,
                    name=amenity_data.name,
                    description=amenity_data.description,
                    is_available=amenity_data.is_available,
                    additional_info=amenity_data.additional_info
                )
                session.add(amenity)
            
            # Add house rules
            for rule_data in property_data.house_rules:
                house_rule = PropertyHouseRule(
                    property_id=property_listing.id,
                    category=rule_data.category,
                    rule_type=rule_data.rule_type,
                    title=rule_data.title,
                    description=rule_data.description,
                    is_mandatory=rule_data.is_mandatory,
                    order_index=rule_data.order_index
                )
                session.add(house_rule)
            
            # Initialize pricing calendar for next 365 days
            await self._initialize_pricing_calendar(session, property_listing.id, property_listing.base_price)
            
            # Initialize availability calendar for next 365 days
            await self._initialize_availability_calendar(session, property_listing.id)
            
            # Initialize quality score
            await self._initialize_quality_score(session, property_listing.id)
            
            await session.commit()
            
            # Clear cache
            if self.cache:
                await self.cache.invalidate_pattern(f"property:{property_listing.id}:*")
            
            logger.info(f"Property created successfully: {property_listing.id}")
            
            # Return detailed response
            return await self.get_property_by_id(session, property_listing.id)
            
        except Exception as e:
            await session.rollback()
            logger.error(f"Error creating property: {str(e)}")
            raise
    
    async def update_property(
        self,
        session: AsyncSession,
        property_id: str,
        host_id: str,
        update_data: PropertyUpdateRequest
    ) -> PropertyDetailResponse:
        """Update an existing property listing"""
        try:
            # Get existing property
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
            
            # Update basic info
            if update_data.basic_info:
                property_listing.title = update_data.basic_info.title
                property_listing.description = update_data.basic_info.description
                property_listing.summary = update_data.basic_info.summary
                property_listing.property_type = update_data.basic_info.property_type.value
                property_listing.room_type = update_data.basic_info.room_type.value
                property_listing.accommodates = update_data.basic_info.accommodates
                property_listing.bedrooms = update_data.basic_info.bedrooms
                property_listing.beds = update_data.basic_info.beds
                property_listing.bathrooms = update_data.basic_info.bathrooms
            
            # Update location
            if update_data.location:
                property_listing.address = update_data.location.address
                property_listing.city = update_data.location.city
                property_listing.state = update_data.location.state
                property_listing.country = update_data.location.country
                property_listing.postal_code = update_data.location.postal_code
                
                if update_data.location.latitude and update_data.location.longitude:
                    property_listing.coordinates = f"POINT({update_data.location.longitude} {update_data.location.latitude})"
            
            # Update pricing
            if update_data.pricing:
                old_price = property_listing.base_price
                property_listing.base_price = update_data.pricing.base_price
                property_listing.currency = update_data.pricing.currency
                property_listing.cleaning_fee = update_data.pricing.cleaning_fee or 0
                property_listing.service_fee = update_data.pricing.service_fee or 0
                property_listing.security_deposit = update_data.pricing.security_deposit or 0
                property_listing.pricing_strategy = update_data.pricing.pricing_strategy.value
                
                # Update pricing calendar if base price changed
                if old_price != property_listing.base_price:
                    await self._update_pricing_calendar_base_price(
                        session, property_id, property_listing.base_price
                    )
            
            # Update booking settings
            if update_data.booking_settings:
                property_listing.instant_book = update_data.booking_settings.instant_book
                property_listing.minimum_stay = update_data.booking_settings.minimum_stay
                property_listing.maximum_stay = update_data.booking_settings.maximum_stay
                property_listing.advance_notice = update_data.booking_settings.advance_notice
                property_listing.preparation_time = update_data.booking_settings.preparation_time
                property_listing.check_in_time = update_data.booking_settings.check_in_time
                property_listing.check_out_time = update_data.booking_settings.check_out_time
                property_listing.smoking_allowed = update_data.booking_settings.smoking_allowed
                property_listing.pets_allowed = update_data.booking_settings.pets_allowed
                property_listing.parties_allowed = update_data.booking_settings.parties_allowed
                property_listing.children_allowed = update_data.booking_settings.children_allowed
                property_listing.additional_rules = update_data.booking_settings.additional_rules
            
            # Update safety and accessibility features
            if update_data.safety_features:
                property_listing.safety_features = update_data.safety_features.dict()
            
            if update_data.accessibility_features:
                property_listing.accessibility_features = update_data.accessibility_features.dict()
            
            # Update additional info
            if update_data.space_description is not None:
                property_listing.space_description = update_data.space_description
            if update_data.guest_access is not None:
                property_listing.guest_access = update_data.guest_access
            if update_data.interaction_with_guests is not None:
                property_listing.interaction_with_guests = update_data.interaction_with_guests
            if update_data.neighborhood_overview is not None:
                property_listing.neighborhood_overview = update_data.neighborhood_overview
            if update_data.transit_info is not None:
                property_listing.transit_info = update_data.transit_info
            
            # Update status if provided
            if update_data.status:
                property_listing.status = update_data.status.value
            
            # Update amenities if provided
            if update_data.amenities is not None:
                # Delete existing amenities
                await session.execute(
                    delete(PropertyAmenityDetail).where(
                        PropertyAmenityDetail.property_id == property_id
                    )
                )
                
                # Add new amenities
                for amenity_data in update_data.amenities:
                    amenity = PropertyAmenityDetail(
                        property_id=property_id,
                        category=amenity_data.category,
                        amenity_type=amenity_data.amenity_type,
                        name=amenity_data.name,
                        description=amenity_data.description,
                        is_available=amenity_data.is_available,
                        additional_info=amenity_data.additional_info
                    )
                    session.add(amenity)
            
            # Update house rules if provided
            if update_data.house_rules is not None:
                # Delete existing house rules
                await session.execute(
                    delete(PropertyHouseRule).where(
                        PropertyHouseRule.property_id == property_id
                    )
                )
                
                # Add new house rules
                for rule_data in update_data.house_rules:
                    house_rule = PropertyHouseRule(
                        property_id=property_id,
                        category=rule_data.category,
                        rule_type=rule_data.rule_type,
                        title=rule_data.title,
                        description=rule_data.description,
                        is_mandatory=rule_data.is_mandatory,
                        order_index=rule_data.order_index
                    )
                    session.add(house_rule)
            
            property_listing.updated_at = datetime.utcnow()
            await session.commit()
            
            # Recalculate quality score
            await self._calculate_quality_score(session, property_id)
            
            # Clear cache
            if self.cache:
                await self.cache.invalidate_pattern(f"property:{property_id}:*")
            
            logger.info(f"Property updated successfully: {property_id}")
            
            return await self.get_property_by_id(session, property_id)
            
        except Exception as e:
            await session.rollback()
            logger.error(f"Error updating property {property_id}: {str(e)}")
            raise
    
    async def get_property_by_id(
        self,
        session: AsyncSession,
        property_id: str,
        include_private_data: bool = False
    ) -> PropertyDetailResponse:
        """Get property details by ID"""
        try:
            # Check cache first
            cache_key = f"property:{property_id}:details"
            if self.cache and not include_private_data:
                cached_property = await self.cache.get_property_details(property_id)
                if cached_property:
                    return PropertyDetailResponse(**cached_property)
            
            # Query with all relationships
            query = select(PropertyListing).options(
                selectinload(PropertyListing.amenities),
                selectinload(PropertyListing.images),
                selectinload(PropertyListing.house_rules)
            ).where(PropertyListing.id == property_id)
            
            result = await session.execute(query)
            property_listing = result.scalar_one_or_none()
            
            if not property_listing:
                raise ValueError("Property not found")
            
            # Convert to response format
            response_data = await self._convert_to_detail_response(property_listing)
            
            # Cache the result
            if self.cache and not include_private_data:
                await self.cache.set_property_details(
                    property_id,
                    response_data.dict(),
                    ttl=3600  # 1 hour
                )
            
            return response_data
            
        except Exception as e:
            logger.error(f"Error getting property {property_id}: {str(e)}")
            raise
    
    async def get_host_properties(
        self,
        session: AsyncSession,
        host_id: str,
        page: int = 1,
        page_size: int = 20,
        status_filter: Optional[PropertyStatus] = None
    ) -> Tuple[List[PropertyDetailResponse], int]:
        """Get all properties for a host"""
        try:
            # Build query
            query = select(PropertyListing).where(PropertyListing.host_id == host_id)
            
            if status_filter:
                query = query.where(PropertyListing.status == status_filter.value)
            
            # Get total count
            count_query = select(func.count()).select_from(query.subquery())
            total_result = await session.execute(count_query)
            total = total_result.scalar()
            
            # Add pagination and ordering
            query = query.order_by(desc(PropertyListing.created_at))
            query = query.offset((page - 1) * page_size).limit(page_size)
            
            # Execute query with relationships
            query = query.options(
                selectinload(PropertyListing.amenities),
                selectinload(PropertyListing.images),
                selectinload(PropertyListing.house_rules)
            )
            
            result = await session.execute(query)
            properties = result.scalars().all()
            
            # Convert to response format
            property_responses = []
            for property_listing in properties:
                response_data = await self._convert_to_detail_response(property_listing)
                property_responses.append(response_data)
            
            return property_responses, total
            
        except Exception as e:
            logger.error(f"Error getting host properties for {host_id}: {str(e)}")
            raise
    
    async def delete_property(
        self,
        session: AsyncSession,
        property_id: str,
        host_id: str
    ):
        """Delete a property listing"""
        try:
            # Verify ownership
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
            
            # Check if property has active bookings
            # This would require checking the bookings table
            # For now, we'll just mark as archived instead of deleting
            property_listing.status = PropertyStatus.ARCHIVED.value
            property_listing.updated_at = datetime.utcnow()
            
            await session.commit()
            
            # Clear cache
            if self.cache:
                await self.cache.invalidate_pattern(f"property:{property_id}:*")
            
            logger.info(f"Property archived: {property_id}")
            
        except Exception as e:
            await session.rollback()
            logger.error(f"Error deleting property {property_id}: {str(e)}")
            raise
    
    # Calendar Management
    async def update_availability(
        self,
        session: AsyncSession,
        property_id: str,
        host_id: str,
        availability_data: AvailabilityUpdateRequest
    ):
        """Update property availability for date range"""
        try:
            # Verify ownership
            await self._verify_property_ownership(session, property_id, host_id)
            
            # Generate date range
            current_date = availability_data.start_date
            while current_date <= availability_data.end_date:
                # Check if availability record exists
                query = select(AvailabilityCalendar).where(
                    and_(
                        AvailabilityCalendar.property_id == property_id,
                        AvailabilityCalendar.date == current_date
                    )
                )
                result = await session.execute(query)
                availability = result.scalar_one_or_none()
                
                if availability:
                    # Update existing record
                    availability.is_available = availability_data.is_available
                    availability.availability_status = 'available' if availability_data.is_available else 'blocked'
                    availability.blocked_reason = availability_data.blocked_reason
                    availability.notes = availability_data.notes
                    availability.minimum_stay_override = availability_data.minimum_stay_override
                    availability.updated_at = datetime.utcnow()
                else:
                    # Create new record
                    availability = AvailabilityCalendar(
                        property_id=property_id,
                        date=current_date,
                        is_available=availability_data.is_available,
                        availability_status='available' if availability_data.is_available else 'blocked',
                        blocked_reason=availability_data.blocked_reason,
                        notes=availability_data.notes,
                        minimum_stay_override=availability_data.minimum_stay_override
                    )
                    session.add(availability)
                
                current_date += timedelta(days=1)
            
            await session.commit()
            
            # Clear cache
            if self.cache:
                await self.cache.invalidate_pattern(f"property:{property_id}:calendar:*")
            
            logger.info(f"Availability updated for property {property_id}")
            
        except Exception as e:
            await session.rollback()
            logger.error(f"Error updating availability for property {property_id}: {str(e)}")
            raise
    
    async def update_pricing(
        self,
        session: AsyncSession,
        property_id: str,
        host_id: str,
        pricing_data: PricingUpdateRequest
    ):
        """Update property pricing for date range"""
        try:
            # Verify ownership
            await self._verify_property_ownership(session, property_id, host_id)
            
            # Generate date range
            current_date = pricing_data.start_date
            while current_date <= pricing_data.end_date:
                # Check if pricing record exists
                query = select(PricingCalendar).where(
                    and_(
                        PricingCalendar.property_id == property_id,
                        PricingCalendar.date == current_date
                    )
                )
                result = await session.execute(query)
                pricing = result.scalar_one_or_none()
                
                if pricing:
                    # Update existing record
                    pricing.base_price = pricing_data.base_price
                    pricing.final_price = pricing_data.base_price  # Will be recalculated by pricing engine
                    pricing.is_special_rate = pricing_data.is_special_rate
                    pricing.special_rate_reason = pricing_data.special_rate_reason
                    pricing.minimum_stay_override = pricing_data.minimum_stay_override
                    pricing.updated_at = datetime.utcnow()
                else:
                    # Create new record
                    pricing = PricingCalendar(
                        property_id=property_id,
                        date=current_date,
                        base_price=pricing_data.base_price,
                        final_price=pricing_data.base_price,
                        is_special_rate=pricing_data.is_special_rate,
                        special_rate_reason=pricing_data.special_rate_reason,
                        minimum_stay_override=pricing_data.minimum_stay_override
                    )
                    session.add(pricing)
                
                current_date += timedelta(days=1)
            
            await session.commit()
            
            # Clear cache
            if self.cache:
                await self.cache.invalidate_pattern(f"property:{property_id}:pricing:*")
            
            logger.info(f"Pricing updated for property {property_id}")
            
        except Exception as e:
            await session.rollback()
            logger.error(f"Error updating pricing for property {property_id}: {str(e)}")
            raise
    
    async def get_calendar_data(
        self,
        session: AsyncSession,
        property_id: str,
        start_date: date,
        end_date: date,
        host_id: Optional[str] = None
    ) -> List[CalendarResponse]:
        """Get calendar data for property"""
        try:
            # Verify access if host_id provided
            if host_id:
                await self._verify_property_ownership(session, property_id, host_id)
            
            # Query calendar data
            query = select(
                AvailabilityCalendar,
                PricingCalendar
            ).select_from(
                AvailabilityCalendar
            ).outerjoin(
                PricingCalendar,
                and_(
                    AvailabilityCalendar.property_id == PricingCalendar.property_id,
                    AvailabilityCalendar.date == PricingCalendar.date
                )
            ).where(
                and_(
                    AvailabilityCalendar.property_id == property_id,
                    AvailabilityCalendar.date >= start_date,
                    AvailabilityCalendar.date <= end_date
                )
            ).order_by(AvailabilityCalendar.date)
            
            result = await session.execute(query)
            calendar_data = result.all()
            
            # Convert to response format
            calendar_responses = []
            for availability, pricing in calendar_data:
                calendar_response = CalendarResponse(
                    date=availability.date,
                    is_available=availability.is_available,
                    availability_status=availability.availability_status,
                    base_price=pricing.base_price if pricing else Decimal('0'),
                    final_price=pricing.final_price if pricing else Decimal('0'),
                    minimum_stay=availability.minimum_stay_override,
                    is_special_rate=pricing.is_special_rate if pricing else False,
                    booking_id=availability.booking_id
                )
                calendar_responses.append(calendar_response)
            
            return calendar_responses
            
        except Exception as e:
            logger.error(f"Error getting calendar data for property {property_id}: {str(e)}")
            raise
    
    # Helper Methods
    async def _verify_property_ownership(
        self,
        session: AsyncSession,
        property_id: str,
        host_id: str
    ):
        """Verify that the host owns the property"""
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
    
    async def _initialize_pricing_calendar(
        self,
        session: AsyncSession,
        property_id: str,
        base_price: Decimal
    ):
        """Initialize pricing calendar for new property"""
        start_date = date.today()
        end_date = start_date + timedelta(days=365)
        
        pricing_records = []
        current_date = start_date
        
        while current_date <= end_date:
            pricing = PricingCalendar(
                property_id=property_id,
                date=current_date,
                base_price=base_price,
                final_price=base_price
            )
            pricing_records.append(pricing)
            current_date += timedelta(days=1)
        
        session.add_all(pricing_records)
    
    async def _initialize_availability_calendar(
        self,
        session: AsyncSession,
        property_id: str
    ):
        """Initialize availability calendar for new property"""
        start_date = date.today()
        end_date = start_date + timedelta(days=365)
        
        availability_records = []
        current_date = start_date
        
        while current_date <= end_date:
            availability = AvailabilityCalendar(
                property_id=property_id,
                date=current_date,
                is_available=True,
                availability_status='available'
            )
            availability_records.append(availability)
            current_date += timedelta(days=1)
        
        session.add_all(availability_records)
    
    async def _initialize_quality_score(
        self,
        session: AsyncSession,
        property_id: str
    ):
        """Initialize quality score for new property"""
        quality_score = PropertyQualityScore(
            property_id=property_id,
            overall_score=0.0,
            listing_quality_score=0.0,
            photo_quality_score=0.0,
            amenity_score=0.0,
            location_score=0.0,
            pricing_competitiveness=0.0
        )
        session.add(quality_score)
    
    async def _update_pricing_calendar_base_price(
        self,
        session: AsyncSession,
        property_id: str,
        new_base_price: Decimal
    ):
        """Update base price in pricing calendar for future dates"""
        future_date = date.today()
        
        # Update future pricing records that aren't special rates
        update_query = update(PricingCalendar).where(
            and_(
                PricingCalendar.property_id == property_id,
                PricingCalendar.date >= future_date,
                PricingCalendar.is_special_rate == False
            )
        ).values(
            base_price=new_base_price,
            final_price=new_base_price,
            updated_at=datetime.utcnow()
        )
        
        await session.execute(update_query)
    
    async def _calculate_quality_score(
        self,
        session: AsyncSession,
        property_id: str
    ) -> float:
        """Calculate comprehensive quality score for property"""
        try:
            # Get property with related data
            query = select(PropertyListing).options(
                selectinload(PropertyListing.amenities),
                selectinload(PropertyListing.images),
                selectinload(PropertyListing.house_rules)
            ).where(PropertyListing.id == property_id)
            
            result = await session.execute(query)
            property_listing = result.scalar_one_or_none()
            
            if not property_listing:
                return 0.0
            
            # Calculate individual scores
            listing_score = self._calculate_listing_quality_score(property_listing)
            photo_score = self._calculate_photo_quality_score(property_listing)
            amenity_score = self._calculate_amenity_score(property_listing)
            location_score = self._calculate_location_score(property_listing)
            
            # Overall score (weighted average)
            overall_score = (
                listing_score * 0.3 +
                photo_score * 0.25 +
                amenity_score * 0.2 +
                location_score * 0.15 +
                property_listing.average_rating * 10 * 0.1  # Rating out of 5, convert to 50
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
                quality_score_record.description_completeness = self._calculate_description_completeness(property_listing)
                quality_score_record.photo_count = len(property_listing.images)
                quality_score_record.amenity_count = len(property_listing.amenities)
                quality_score_record.response_rate = property_listing.response_rate
                quality_score_record.guest_satisfaction = property_listing.average_rating
                quality_score_record.last_calculated = datetime.utcnow()
                quality_score_record.updated_at = datetime.utcnow()
            
            # Update property's quality score
            property_listing.quality_score = overall_score
            
            await session.commit()
            
            return overall_score
            
        except Exception as e:
            logger.error(f"Error calculating quality score for property {property_id}: {str(e)}")
            return 0.0
    
    def _calculate_listing_quality_score(self, property_listing: PropertyListing) -> float:
        """Calculate listing quality score based on completeness"""
        score = 0.0
        max_score = 100.0
        
        # Title quality (10 points)
        if property_listing.title and len(property_listing.title) >= 10:
            score += 10
        elif property_listing.title:
            score += 5
        
        # Description quality (20 points)
        if property_listing.description:
            desc_length = len(property_listing.description)
            if desc_length >= 500:
                score += 20
            elif desc_length >= 200:
                score += 15
            elif desc_length >= 50:
                score += 10
            else:
                score += 5
        
        # Summary (5 points)
        if property_listing.summary:
            score += 5
        
        # Space description (10 points)
        if property_listing.space_description:
            score += 10
        
        # Guest access (5 points)
        if property_listing.guest_access:
            score += 5
        
        # Neighborhood overview (10 points)
        if property_listing.neighborhood_overview:
            score += 10
        
        # Transit info (5 points)
        if property_listing.transit_info:
            score += 5
        
        # House rules (5 points)
        if len(property_listing.house_rules) > 0:
            score += 5
        
        # Check-in/out times (10 points)
        if property_listing.check_in_time and property_listing.check_out_time:
            score += 10
        
        # Safety features (10 points)
        safety_count = sum(1 for v in property_listing.safety_features.values() if v)
        score += min(safety_count * 2, 10)
        
        # Basic property details (10 points)
        if all([
            property_listing.accommodates,
            property_listing.bedrooms is not None,
            property_listing.bathrooms is not None
        ]):
            score += 10
        
        return score
    
    def _calculate_photo_quality_score(self, property_listing: PropertyListing) -> float:
        """Calculate photo quality score"""
        photo_count = len(property_listing.images)
        
        if photo_count == 0:
            return 0.0
        elif photo_count >= 10:
            return 100.0
        elif photo_count >= 5:
            return 80.0
        elif photo_count >= 3:
            return 60.0
        else:
            return photo_count * 20.0
    
    def _calculate_amenity_score(self, property_listing: PropertyListing) -> float:
        """Calculate amenity score"""
        amenity_count = len(property_listing.amenities)
        
        if amenity_count >= 20:
            return 100.0
        elif amenity_count >= 15:
            return 80.0
        elif amenity_count >= 10:
            return 60.0
        elif amenity_count >= 5:
            return 40.0
        else:
            return amenity_count * 8.0
    
    def _calculate_location_score(self, property_listing: PropertyListing) -> float:
        """Calculate location score"""
        score = 0.0
        
        # Complete address (50 points)
        if all([
            property_listing.address,
            property_listing.city,
            property_listing.country
        ]):
            score += 50
        
        # Coordinates (30 points)
        if property_listing.coordinates:
            score += 30
        
        # Postal code (10 points)
        if property_listing.postal_code:
            score += 10
        
        # State/region (10 points)
        if property_listing.state:
            score += 10
        
        return score
    
    def _calculate_description_completeness(self, property_listing: PropertyListing) -> float:
        """Calculate description completeness percentage"""
        fields_to_check = [
            property_listing.title,
            property_listing.description,
            property_listing.summary,
            property_listing.space_description,
            property_listing.guest_access,
            property_listing.neighborhood_overview,
            property_listing.transit_info
        ]
        
        completed_fields = sum(1 for field in fields_to_check if field and len(field.strip()) > 0)
        return (completed_fields / len(fields_to_check)) * 100
    
    async def _convert_to_detail_response(
        self,
        property_listing: PropertyListing
    ) -> PropertyDetailResponse:
        """Convert PropertyListing to PropertyDetailResponse"""
        return PropertyDetailResponse(
            id=property_listing.id,
            host_id=property_listing.host_id,
            title=property_listing.title,
            description=property_listing.description,
            summary=property_listing.summary,
            property_type=property_listing.property_type,
            room_type=property_listing.room_type,
            accommodates=property_listing.accommodates,
            bedrooms=property_listing.bedrooms,
            beds=property_listing.beds,
            bathrooms=property_listing.bathrooms,
            address=property_listing.address,
            city=property_listing.city,
            state=property_listing.state,
            country=property_listing.country,
            postal_code=property_listing.postal_code,
            coordinates=self._extract_coordinates(property_listing.coordinates) if property_listing.coordinates else None,
            status=property_listing.status,
            verification_status=property_listing.verification_status,
            quality_score=property_listing.quality_score,
            base_price=property_listing.base_price,
            currency=property_listing.currency,
            cleaning_fee=property_listing.cleaning_fee,
            service_fee=property_listing.service_fee,
            security_deposit=property_listing.security_deposit,
            pricing_strategy=property_listing.pricing_strategy,
            instant_book=property_listing.instant_book,
            minimum_stay=property_listing.minimum_stay,
            maximum_stay=property_listing.maximum_stay,
            check_in_time=property_listing.check_in_time,
            check_out_time=property_listing.check_out_time,
            safety_features=property_listing.safety_features or {},
            accessibility_features=property_listing.accessibility_features or {},
            amenities=[{
                "id": str(amenity.id),
                "category": amenity.category,
                "amenity_type": amenity.amenity_type,
                "name": amenity.name,
                "description": amenity.description,
                "is_available": amenity.is_available,
                "additional_info": amenity.additional_info
            } for amenity in property_listing.amenities],
            images=[{
                "id": str(image.id),
                "url": image.url,
                "thumbnail_url": image.thumbnail_url,
                "alt_text": image.alt_text,
                "caption": image.caption,
                "image_type": image.image_type,
                "room_type": image.room_type,
                "order_index": image.order_index,
                "is_primary": image.is_primary,
                "is_360_tour": image.is_360_tour,
                "file_size": image.file_size,
                "width": image.width,
                "height": image.height,
                "format": image.format,
                "is_verified": image.is_verified,
                "verification_status": image.verification_status,
                "created_at": image.created_at
            } for image in property_listing.images],
            house_rules=[{
                "id": str(rule.id),
                "category": rule.category,
                "rule_type": rule.rule_type,
                "title": rule.title,
                "description": rule.description,
                "is_mandatory": rule.is_mandatory,
                "order_index": rule.order_index
            } for rule in property_listing.house_rules],
            total_bookings=property_listing.total_bookings,
            total_revenue=property_listing.total_revenue,
            average_rating=property_listing.average_rating,
            response_rate=property_listing.response_rate,
            created_at=property_listing.created_at,
            updated_at=property_listing.updated_at,
            published_at=property_listing.published_at
        )
    
    def _extract_coordinates(self, geometry) -> Dict[str, float]:
        """Extract coordinates from PostGIS geometry"""
        if hasattr(geometry, 'x') and hasattr(geometry, 'y'):
            return {"longitude": geometry.x, "latitude": geometry.y}
        return None