"""Core booking management service with workflow orchestration"""

import asyncio
import logging
from datetime import datetime, date, timedelta
from typing import Optional, List, Dict, Any, Tuple
from decimal import Decimal
from uuid import UUID, uuid4
from enum import Enum

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, update
from sqlalchemy.orm import selectinload

from app.models.booking_models import (
    Booking, BookingModification, BookingNotification, BookingStatus, 
    BookingType, ModificationType, CancellationPolicy, CancellationPolicyType,
    BookingPayment, PaymentStatus
)
from app.schemas.booking_schemas import (
    BookingCreateRequest, BookingResponse, BookingStatusUpdateRequest,
    BookingModificationRequest, BookingModificationResponse,
    BookingCancellationRequest, BookingCancellationResponse,
    BookingListResponse, BookingListItem, BookingSearchRequest
)
from app.services.availability_service import AvailabilityService
from app.services.payment_service import PaymentProcessingService

logger = logging.getLogger(__name__)


class BookingWorkflowError(Exception):
    """Raised when booking workflow encounters an error"""
    def __init__(self, message: str, code: str = None, booking_id: UUID = None):
        super().__init__(message)
        self.code = code
        self.booking_id = booking_id


class BookingNotFoundError(BookingWorkflowError):
    """Raised when booking is not found"""
    pass


class InvalidBookingStatusError(BookingWorkflowError):
    """Raised when booking status transition is invalid"""
    pass


class BookingManagementService:
    """Core service for managing booking lifecycle and workflows"""
    
    def __init__(
        self,
        db_session: AsyncSession,
        availability_service: AvailabilityService,
        payment_service: PaymentProcessingService
    ):
        self.db = db_session
        self.availability_service = availability_service
        self.payment_service = payment_service
    
    async def create_booking(
        self,
        request: BookingCreateRequest,
        guest_id: UUID
    ) -> BookingResponse:
        """
        Create a new booking with complete workflow
        
        This is the main booking creation method that handles:
        - Availability validation
        - Pricing calculation
        - Booking record creation
        - Approval workflow initiation
        - Notification scheduling
        """
        try:
            logger.info(f"Creating booking for guest {guest_id} at property {request.property_id}")
            
            # Step 1: Validate availability
            availability_check = await self.availability_service.check_availability(
                request
            )
            
            if not availability_check.is_available:
                raise BookingWorkflowError(
                    "Property is not available for selected dates",
                    code="dates_unavailable"
                )
            
            # Step 2: Validate guest capacity and requirements
            validation_result = await self.availability_service.validate_booking_dates(
                request.property_id,
                request.check_in_date,
                request.check_out_date,
                request.number_of_guests
            )
            
            if not validation_result[0]:
                raise BookingWorkflowError(
                    f"Booking validation failed: {'; '.join(validation_result[1])}",
                    code="validation_failed"
                )
            
            # Step 3: Create availability lock
            lock_request = {
                'property_id': request.property_id,
                'check_in_date': request.check_in_date,
                'check_out_date': request.check_out_date,
                'lock_duration_minutes': 30  # Hold availability for 30 minutes
            }
            
            availability_lock = await self.availability_service.create_availability_lock(
                lock_request, guest_id
            )
            
            if not availability_lock.can_proceed:
                raise BookingWorkflowError(
                    "Unable to secure availability for booking",
                    code="availability_lock_failed"
                )
            
            # Step 4: Get property and host details
            property_details = await self._get_property_details(request.property_id)
            host_id = property_details['host_id']
            
            # Step 5: Calculate pricing
            pricing = await self._calculate_detailed_pricing(
                request, availability_check, property_details
            )
            
            # Step 6: Create booking record
            booking = await self._create_booking_record(
                request, guest_id, host_id, pricing, availability_check
            )
            
            # Step 7: Set up approval workflow
            await self._setup_booking_workflow(booking, property_details)
            
            # Step 8: Create initial notification
            await self._create_booking_notification(
                booking, "booking_created", 
                f"New booking request {booking.booking_number}"
            )
            
            # Step 9: Schedule workflow actions
            await self._schedule_workflow_actions(booking)
            
            await self.db.commit()
            
            # Step 10: Release availability lock (booking created successfully)
            await self.availability_service.release_availability_lock(
                availability_lock.lock_id, guest_id
            )
            
            logger.info(f"Successfully created booking {booking.booking_number}")
            
            return await self._build_booking_response(booking)
            
        except Exception as e:
            logger.error(f"Error creating booking: {str(e)}")
            await self.db.rollback()
            
            # Release lock on error
            if 'availability_lock' in locals():
                await self.availability_service.release_availability_lock(
                    availability_lock.lock_id, guest_id
                )
            
            raise
    
    async def get_booking(self, booking_id: UUID, user_id: UUID) -> BookingResponse:
        """Get booking details with access control"""
        try:
            booking = await self._get_booking_with_details(booking_id)
            
            if not booking:
                raise BookingNotFoundError(
                    "Booking not found",
                    code="booking_not_found",
                    booking_id=booking_id
                )
            
            # Check access permissions
            if booking.guest_id != user_id and booking.host_id != user_id:
                raise BookingWorkflowError(
                    "Unauthorized access to booking",
                    code="unauthorized",
                    booking_id=booking_id
                )
            
            return await self._build_booking_response(booking)
            
        except Exception as e:
            logger.error(f"Error getting booking {booking_id}: {str(e)}")
            raise
    
    async def update_booking_status(
        self,
        booking_id: UUID,
        request: BookingStatusUpdateRequest,
        user_id: UUID
    ) -> BookingResponse:
        """Update booking status with workflow validation"""
        try:
            booking = await self._get_booking_with_details(booking_id)
            
            if not booking:
                raise BookingNotFoundError(
                    "Booking not found",
                    code="booking_not_found",
                    booking_id=booking_id
                )
            
            # Validate status transition
            if not await self._validate_status_transition(
                booking, request.status, user_id
            ):
                raise InvalidBookingStatusError(
                    f"Invalid status transition from {booking.status} to {request.status}",
                    code="invalid_status_transition",
                    booking_id=booking_id
                )
            
            # Perform status-specific actions
            await self._execute_status_transition(booking, request, user_id)
            
            # Update booking
            old_status = booking.status
            booking.status = request.status
            booking.updated_at = datetime.utcnow()
            
            # Set status-specific timestamps
            if request.status == BookingStatus.CONFIRMED:
                booking.confirmed_at = datetime.utcnow()
            elif request.status == BookingStatus.CANCELLED:
                booking.cancelled_at = datetime.utcnow()
            elif request.status == BookingStatus.COMPLETED:
                booking.completed_at = datetime.utcnow()
            
            # Create status change notification
            await self._create_booking_notification(
                booking, "status_changed",
                f"Booking status changed from {old_status} to {request.status}",
                request.notes
            )
            
            # Send notifications
            if request.notify_guest or request.notify_host:
                await self._send_status_change_notifications(
                    booking, old_status, request
                )
            
            await self.db.commit()
            
            logger.info(f"Updated booking {booking.booking_number} status to {request.status}")
            
            return await self._build_booking_response(booking)
            
        except Exception as e:
            logger.error(f"Error updating booking status: {str(e)}")
            await self.db.rollback()
            raise
    
    async def request_booking_modification(
        self,
        booking_id: UUID,
        request: BookingModificationRequest,
        user_id: UUID
    ) -> BookingModificationResponse:
        """Request modification to existing booking"""
        try:
            booking = await self._get_booking_with_details(booking_id)
            
            if not booking:
                raise BookingNotFoundError(
                    "Booking not found",
                    code="booking_not_found",
                    booking_id=booking_id
                )
            
            # Validate modification eligibility
            if not await self._can_modify_booking(booking, user_id):
                raise BookingWorkflowError(
                    "Booking cannot be modified",
                    code="modification_not_allowed",
                    booking_id=booking_id
                )
            
            # Validate modification request
            validation_errors = await self._validate_modification_request(
                booking, request
            )
            
            if validation_errors:
                raise BookingWorkflowError(
                    f"Modification validation failed: {'; '.join(validation_errors)}",
                    code="modification_validation_failed",
                    booking_id=booking_id
                )
            
            # Calculate pricing impact
            pricing_impact = await self._calculate_modification_pricing(
                booking, request
            )
            
            # Create modification record
            modification = BookingModification(
                id=uuid4(),
                booking_id=booking_id,
                modification_type=request.modification_type,
                reason=request.reason,
                requested_by=user_id,
                status='pending',
                
                # Store original data
                original_data=await self._serialize_booking_data(booking),
                
                # Store requested changes
                requested_data=await self._serialize_modification_request(request),
                
                # Pricing impact
                price_difference=pricing_impact['price_difference'],
                additional_fees=pricing_impact['additional_fees'],
                refund_amount=pricing_impact['refund_amount'],
                
                # Set deadline for approval
                deadline=datetime.utcnow() + timedelta(hours=24),
            )
            
            self.db.add(modification)
            
            # Create notification
            await self._create_booking_notification(
                booking, "modification_requested",
                f"Modification requested: {request.modification_type}",
                request.reason
            )
            
            await self.db.commit()
            
            logger.info(f"Created modification request {modification.id} for booking {booking.booking_number}")
            
            return BookingModificationResponse(
                id=modification.id,
                booking_id=booking_id,
                modification_type=request.modification_type,
                status=modification.status,
                reason=request.reason,
                original_data=modification.original_data,
                requested_data=modification.requested_data,
                price_difference=modification.price_difference,
                additional_fees=modification.additional_fees,
                refund_amount=modification.refund_amount,
                deadline=modification.deadline,
                created_at=modification.created_at
            )
            
        except Exception as e:
            logger.error(f"Error requesting booking modification: {str(e)}")
            await self.db.rollback()
            raise
    
    async def cancel_booking(
        self,
        booking_id: UUID,
        request: BookingCancellationRequest,
        user_id: UUID
    ) -> BookingCancellationResponse:
        """Cancel a booking with refund calculation"""
        try:
            booking = await self._get_booking_with_details(booking_id)
            
            if not booking:
                raise BookingNotFoundError(
                    "Booking not found",
                    code="booking_not_found",
                    booking_id=booking_id
                )
            
            # Validate cancellation eligibility
            if not await self._can_cancel_booking(booking, user_id):
                raise BookingWorkflowError(
                    "Booking cannot be cancelled",
                    code="cancellation_not_allowed",
                    booking_id=booking_id
                )
            
            # Calculate refund
            refund_calculation = await self.payment_service.calculate_cancellation_refund(
                booking_id
            )
            
            # Update booking status
            booking.status = BookingStatus.CANCELLED
            booking.cancelled_at = datetime.utcnow()
            booking.cancellation_reason = request.reason
            
            # Process refund if applicable
            refund_id = None
            if refund_calculation.total_refund > 0:
                refund = await self.payment_service.process_refund(
                    booking_id,
                    refund_calculation.total_refund,
                    refund_calculation.refund_type,
                    request.reason,
                    user_id
                )
                refund_id = refund.id
            
            # Release security deposit if held
            await self.payment_service.release_security_deposit(booking_id)
            
            # Create cancellation notification
            await self._create_booking_notification(
                booking, "booking_cancelled",
                f"Booking cancelled: {request.reason}"
            )
            
            await self.db.commit()
            
            logger.info(f"Cancelled booking {booking.booking_number} with refund ${refund_calculation.total_refund}")
            
            return BookingCancellationResponse(
                booking_id=booking_id,
                cancellation_id=refund_id or uuid4(),
                status='confirmed',
                refund_calculation=refund_calculation,
                estimated_refund_date=date.today() + timedelta(days=refund_calculation.processing_time_days),
                cancellation_confirmed=True
            )
            
        except Exception as e:
            logger.error(f"Error cancelling booking: {str(e)}")
            await self.db.rollback()
            raise
    
    async def search_bookings(
        self,
        request: BookingSearchRequest,
        user_id: UUID,
        user_role: str
    ) -> BookingListResponse:
        """Search bookings with filters and pagination"""
        try:
            # Build base query
            stmt = select(Booking)
            
            # Apply role-based filters
            if user_role == 'guest':
                stmt = stmt.where(Booking.guest_id == user_id)
            elif user_role == 'host':
                stmt = stmt.where(Booking.host_id == user_id)
            # Admin can see all bookings
            
            # Apply search filters
            if request.filters:
                filters = request.filters
                
                if filters.status:
                    stmt = stmt.where(Booking.status.in_(filters.status))
                
                if filters.property_id:
                    stmt = stmt.where(Booking.property_id == filters.property_id)
                
                if filters.check_in_from:
                    stmt = stmt.where(Booking.check_in_date >= filters.check_in_from)
                
                if filters.check_in_to:
                    stmt = stmt.where(Booking.check_in_date <= filters.check_in_to)
                
                if filters.created_from:
                    stmt = stmt.where(Booking.created_at >= filters.created_from)
                
                if filters.created_to:
                    stmt = stmt.where(Booking.created_at <= filters.created_to)
                
                if filters.min_amount:
                    stmt = stmt.where(Booking.total_amount >= filters.min_amount)
                
                if filters.max_amount:
                    stmt = stmt.where(Booking.total_amount <= filters.max_amount)
                
                if filters.booking_type:
                    stmt = stmt.where(Booking.booking_type == filters.booking_type)
            
            # Count total results
            count_stmt = select(func.count()).select_from(stmt.subquery())
            count_result = await self.db.execute(count_stmt)
            total_count = count_result.scalar()
            
            # Apply sorting
            if request.sort_by == 'created_at':
                sort_column = Booking.created_at
            elif request.sort_by == 'check_in_date':
                sort_column = Booking.check_in_date
            elif request.sort_by == 'total_amount':
                sort_column = Booking.total_amount
            else:
                sort_column = Booking.created_at
            
            if request.sort_order == 'desc':
                stmt = stmt.order_by(sort_column.desc())
            else:
                stmt = stmt.order_by(sort_column.asc())
            
            # Apply pagination
            offset = (request.page - 1) * request.per_page
            stmt = stmt.offset(offset).limit(request.per_page)
            
            # Execute query
            result = await self.db.execute(stmt)
            bookings = result.scalars().all()
            
            # Build response items
            booking_items = []
            for booking in bookings:
                # Get property details for display
                property_details = await self._get_property_details(booking.property_id)
                
                # Check if requires action
                requires_action = await self._booking_requires_action(booking, user_id, user_role)
                
                item = BookingListItem(
                    id=booking.id,
                    booking_number=booking.booking_number,
                    property_id=booking.property_id,
                    property_title=property_details.get('title'),
                    property_image_url=property_details.get('main_image_url'),
                    check_in_date=booking.check_in_date,
                    check_out_date=booking.check_out_date,
                    nights=booking.nights,
                    number_of_guests=booking.number_of_guests,
                    status=booking.status,
                    total_amount=booking.total_amount,
                    currency=booking.currency,
                    guest_name=booking.guest_name,
                    created_at=booking.created_at,
                    requires_action=requires_action,
                    is_upcoming=booking.check_in_date > date.today()
                )
                booking_items.append(item)
            
            return BookingListResponse(
                bookings=booking_items,
                total_count=total_count,
                page=request.page,
                per_page=request.per_page,
                has_next=offset + request.per_page < total_count,
                has_previous=request.page > 1
            )
            
        except Exception as e:
            logger.error(f"Error searching bookings: {str(e)}")
            raise
    
    async def get_booking_analytics(
        self,
        user_id: UUID,
        user_role: str,
        start_date: date,
        end_date: date
    ) -> Dict[str, Any]:
        """Get booking analytics for date range"""
        try:
            # Build base query
            stmt = select(Booking).where(
                and_(
                    Booking.created_at >= datetime.combine(start_date, datetime.min.time()),
                    Booking.created_at <= datetime.combine(end_date, datetime.max.time())
                )
            )
            
            # Apply role-based filters
            if user_role == 'host':
                stmt = stmt.where(Booking.host_id == user_id)
            elif user_role == 'guest':
                stmt = stmt.where(Booking.guest_id == user_id)
            
            result = await self.db.execute(stmt)
            bookings = result.scalars().all()
            
            # Calculate metrics
            total_bookings = len(bookings)
            confirmed_bookings = sum(1 for b in bookings if b.status == BookingStatus.CONFIRMED)
            cancelled_bookings = sum(1 for b in bookings if b.status == BookingStatus.CANCELLED)
            
            total_revenue = sum(b.total_amount for b in bookings if b.status in [
                BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN, 
                BookingStatus.CHECKED_OUT, BookingStatus.COMPLETED
            ])
            
            average_booking_value = total_revenue / total_bookings if total_bookings > 0 else Decimal('0')
            
            confirmation_rate = (confirmed_bookings / total_bookings * 100) if total_bookings > 0 else 0
            cancellation_rate = (cancelled_bookings / total_bookings * 100) if total_bookings > 0 else 0
            
            # Calculate average lead time
            lead_times = []
            for booking in bookings:
                if booking.status == BookingStatus.CONFIRMED and booking.confirmed_at:
                    lead_time = (booking.check_in_date - booking.confirmed_at.date()).days
                    lead_times.append(lead_time)
            
            avg_lead_time = sum(lead_times) / len(lead_times) if lead_times else 0
            
            return {
                'total_bookings': total_bookings,
                'confirmed_bookings': confirmed_bookings,
                'cancelled_bookings': cancelled_bookings,
                'total_revenue': float(total_revenue),
                'average_booking_value': float(average_booking_value),
                'confirmation_rate': round(confirmation_rate, 1),
                'cancellation_rate': round(cancellation_rate, 1),
                'average_lead_time_days': round(avg_lead_time, 1),
                'period_start': start_date,
                'period_end': end_date
            }
            
        except Exception as e:
            logger.error(f"Error getting booking analytics: {str(e)}")
            raise
    
    # Private helper methods
    
    async def _get_booking_with_details(self, booking_id: UUID) -> Optional[Booking]:
        """Get booking with related data"""
        stmt = select(Booking).options(
            selectinload(Booking.payments),
            selectinload(Booking.modifications),
            selectinload(Booking.notifications)
        ).where(Booking.id == booking_id)
        
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
    
    async def _get_property_details(self, property_id: UUID) -> Dict[str, Any]:
        """Get property details (mock implementation)"""
        # In real implementation, this would call the property service
        return {
            'host_id': uuid4(),
            'title': 'Beautiful Property',
            'main_image_url': 'https://example.com/image.jpg',
            'instant_book': True,
            'requires_approval': False,
            'cancellation_policy': CancellationPolicyType.MODERATE,
            'house_rules': ['No smoking', 'No pets'],
            'check_in_instructions': 'Use the lockbox code',
            'wifi_password': 'guest123'
        }
    
    async def _calculate_detailed_pricing(
        self,
        request: BookingCreateRequest,
        availability_check,
        property_details: Dict[str, Any]
    ) -> Dict[str, Decimal]:
        """Calculate detailed pricing breakdown"""
        nights = (request.check_out_date - request.check_in_date).days
        base_price_per_night = availability_check.base_price_per_night
        base_price = base_price_per_night * nights
        
        # Calculate fees
        cleaning_fee = Decimal('50.00')  # Could be property-specific
        
        # Extra guest fees
        extra_guests = max(0, request.number_of_guests - 2)  # First 2 guests included
        extra_guest_fee = extra_guests * Decimal('25.00') * nights
        
        # Pet fees
        pet_fee = request.pets * Decimal('30.00') * nights
        
        # Service fee (platform fee)
        subtotal = base_price + cleaning_fee + extra_guest_fee + pet_fee
        service_fee = subtotal * Decimal('0.12')  # 12% service fee
        
        # Taxes
        tax_rate = Decimal('0.10')  # 10% tax
        tax_amount = subtotal * tax_rate
        
        # Security deposit
        security_deposit = Decimal('200.00')  # Could be property-specific
        
        # Total amount (excluding security deposit)
        total_amount = subtotal + service_fee + tax_amount
        
        return {
            'base_price': base_price,
            'cleaning_fee': cleaning_fee,
            'extra_guest_fee': extra_guest_fee,
            'pet_fee': pet_fee,
            'service_fee': service_fee,
            'tax_amount': tax_amount,
            'security_deposit': security_deposit,
            'total_amount': total_amount,
            'currency': request.currency
        }
    
    async def _create_booking_record(
        self,
        request: BookingCreateRequest,
        guest_id: UUID,
        host_id: UUID,
        pricing: Dict[str, Decimal],
        availability_check
    ) -> Booking:
        """Create the booking database record"""
        # Generate unique booking number
        booking_number = await self._generate_booking_number()
        
        # Calculate nights
        nights = (request.check_out_date - request.check_in_date).days
        
        # Determine initial status
        if request.booking_type == BookingType.INSTANT_BOOK and availability_check.available_for_instant_book:
            initial_status = BookingStatus.CONFIRMED
            auto_confirm = True
        else:
            initial_status = BookingStatus.PENDING
            auto_confirm = False
        
        booking = Booking(
            id=uuid4(),
            booking_number=booking_number,
            property_id=request.property_id,
            guest_id=guest_id,
            host_id=host_id,
            
            # Dates and guests
            check_in_date=request.check_in_date,
            check_out_date=request.check_out_date,
            number_of_guests=request.number_of_guests,
            adults=request.adults,
            children=request.children,
            infants=request.infants,
            pets=request.pets,
            nights=nights,
            
            # Booking details
            booking_type=request.booking_type,
            status=initial_status,
            
            # Guest information
            guest_name=request.guest_info.guest_name,
            guest_email=request.guest_info.guest_email,
            guest_phone=request.guest_info.guest_phone,
            
            # Pricing
            base_price=pricing['base_price'],
            cleaning_fee=pricing['cleaning_fee'],
            service_fee=pricing['service_fee'],
            tax_amount=pricing['tax_amount'],
            security_deposit=pricing['security_deposit'],
            total_amount=pricing['total_amount'],
            currency=pricing['currency'],
            
            # Additional fees
            extra_guest_fee=pricing.get('extra_guest_fee', Decimal('0')),
            pet_fee=pricing.get('pet_fee', Decimal('0')),
            
            # Cancellation policy
            cancellation_policy=availability_check.cancellation_policy,
            
            # Special requests
            special_requests=request.special_requests,
            
            # Workflow settings
            auto_confirm=auto_confirm,
            
            # Metadata
            booking_source=request.booking_source,
            guest_timezone=request.timezone,
            
            # Set confirmed time for instant bookings
            confirmed_at=datetime.utcnow() if auto_confirm else None
        )
        
        self.db.add(booking)
        await self.db.flush()  # Get the ID
        
        return booking
    
    async def _setup_booking_workflow(
        self,
        booking: Booking,
        property_details: Dict[str, Any]
    ):
        """Set up booking approval workflow"""
        if not booking.auto_confirm:
            # Set host response deadline (24 hours for approval requests)
            booking.host_response_deadline = datetime.utcnow() + timedelta(hours=24)
        
        # Set cancellation deadline based on policy
        if booking.cancellation_policy == CancellationPolicyType.FLEXIBLE:
            booking.cancellation_deadline = datetime.combine(
                booking.check_in_date, datetime.min.time()
            ) - timedelta(days=1)
        elif booking.cancellation_policy == CancellationPolicyType.MODERATE:
            booking.cancellation_deadline = datetime.combine(
                booking.check_in_date, datetime.min.time()
            ) - timedelta(days=5)
        elif booking.cancellation_policy == CancellationPolicyType.STRICT:
            booking.cancellation_deadline = datetime.combine(
                booking.check_in_date, datetime.min.time()
            ) - timedelta(days=14)
    
    async def _create_booking_notification(
        self,
        booking: Booking,
        notification_type: str,
        message: str,
        details: Optional[str] = None
    ):
        """Create booking notification record"""
        notification = BookingNotification(
            id=uuid4(),
            booking_id=booking.id,
            notification_type=notification_type,
            recipient_type='both',  # Send to both guest and host
            message=message,
            details=details,
            is_sent=False,
            scheduled_at=datetime.utcnow()
        )
        
        self.db.add(notification)
    
    async def _schedule_workflow_actions(self, booking: Booking):
        """Schedule automated workflow actions"""
        # In production, this would integrate with a task queue
        # For now, we'll just log the scheduled actions
        
        if booking.host_response_deadline:
            logger.info(f"Scheduled auto-decline for booking {booking.booking_number} at {booking.host_response_deadline}")
        
        if booking.cancellation_deadline:
            logger.info(f"Set cancellation deadline for booking {booking.booking_number} at {booking.cancellation_deadline}")
        
        # Schedule check-in reminder
        checkin_reminder_time = datetime.combine(booking.check_in_date, datetime.min.time()) - timedelta(days=1)
        logger.info(f"Scheduled check-in reminder for booking {booking.booking_number} at {checkin_reminder_time}")
    
    async def _build_booking_response(self, booking: Booking) -> BookingResponse:
        """Build comprehensive booking response"""
        # Calculate if booking can be cancelled
        can_be_cancelled = await self._can_cancel_booking(booking, booking.guest_id)
        
        return BookingResponse(
            id=booking.id,
            booking_number=booking.booking_number,
            property_id=booking.property_id,
            guest_id=booking.guest_id,
            host_id=booking.host_id,
            check_in_date=booking.check_in_date,
            check_out_date=booking.check_out_date,
            number_of_guests=booking.number_of_guests,
            adults=booking.adults,
            children=booking.children,
            infants=booking.infants,
            pets=booking.pets,
            nights=booking.nights,
            booking_type=booking.booking_type,
            status=booking.status,
            guest_name=booking.guest_name,
            guest_email=booking.guest_email,
            guest_phone=booking.guest_phone,
            pricing={
                'base_price': booking.base_price,
                'cleaning_fee': booking.cleaning_fee,
                'service_fee': booking.service_fee,
                'tax_amount': booking.tax_amount,
                'security_deposit': booking.security_deposit,
                'total_amount': booking.total_amount,
                'currency': booking.currency,
                'extra_guest_fees': booking.extra_guest_fee or Decimal('0'),
                'pet_fees': booking.pet_fee or Decimal('0'),
                'resort_fees': Decimal('0')  # Not implemented yet
            },
            cancellation_policy=booking.cancellation_policy,
            cancellation_deadline=booking.cancellation_deadline,
            can_be_cancelled=can_be_cancelled,
            special_requests=booking.special_requests,
            host_notes=booking.host_notes,
            auto_confirm=booking.auto_confirm,
            host_response_deadline=booking.host_response_deadline,
            created_at=booking.created_at,
            updated_at=booking.updated_at,
            confirmed_at=booking.confirmed_at,
            cancelled_at=booking.cancelled_at,
            completed_at=booking.completed_at,
            is_active=booking.status in [
                BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN
            ]
        )
    
    async def _generate_booking_number(self) -> str:
        """Generate unique booking number"""
        # Simple implementation - in production, use a more sophisticated system
        import random
        import string
        
        prefix = "TQ"
        suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        return f"{prefix}{suffix}"
    
    async def _validate_status_transition(
        self,
        booking: Booking,
        new_status: BookingStatus,
        user_id: UUID
    ) -> bool:
        """Validate if status transition is allowed"""
        current_status = booking.status
        
        # Define allowed transitions
        allowed_transitions = {
            BookingStatus.PENDING: [BookingStatus.CONFIRMED, BookingStatus.DECLINED, BookingStatus.CANCELLED],
            BookingStatus.CONFIRMED: [BookingStatus.CHECKED_IN, BookingStatus.CANCELLED],
            BookingStatus.CHECKED_IN: [BookingStatus.CHECKED_OUT, BookingStatus.CANCELLED],
            BookingStatus.CHECKED_OUT: [BookingStatus.COMPLETED],
            # Terminal states cannot transition
            BookingStatus.DECLINED: [],
            BookingStatus.CANCELLED: [],
            BookingStatus.COMPLETED: []
        }
        
        if new_status not in allowed_transitions.get(current_status, []):
            return False
        
        # Check user permissions for specific transitions
        if new_status == BookingStatus.CONFIRMED and booking.host_id != user_id:
            return False  # Only host can confirm
        
        if new_status == BookingStatus.DECLINED and booking.host_id != user_id:
            return False  # Only host can decline
        
        return True
    
    async def _execute_status_transition(
        self,
        booking: Booking,
        request: BookingStatusUpdateRequest,
        user_id: UUID
    ):
        """Execute status-specific transition logic"""
        if request.status == BookingStatus.CONFIRMED:
            # Auto-process payment if instant book
            if booking.auto_confirm:
                # Payment would be processed here
                pass
        
        elif request.status == BookingStatus.CHECKED_IN:
            # Update check-in time
            booking.checked_in_at = datetime.utcnow()
        
        elif request.status == BookingStatus.CHECKED_OUT:
            # Update check-out time
            booking.checked_out_at = datetime.utcnow()
            
            # Release security deposit if no issues
            await self.payment_service.release_security_deposit(booking.id)
    
    async def _send_status_change_notifications(
        self,
        booking: Booking,
        old_status: BookingStatus,
        request: BookingStatusUpdateRequest
    ):
        """Send notifications for status changes"""
        # In production, this would integrate with notification service
        logger.info(f"Sending status change notifications for booking {booking.booking_number}")
        logger.info(f"Status changed from {old_status} to {request.status}")
        
        if request.notify_guest:
            logger.info(f"Notifying guest {booking.guest_email}")
        
        if request.notify_host:
            logger.info(f"Notifying host for property {booking.property_id}")
    
    async def _can_modify_booking(self, booking: Booking, user_id: UUID) -> bool:
        """Check if booking can be modified"""
        # Cannot modify cancelled, declined, or completed bookings
        if booking.status in [
            BookingStatus.CANCELLED, BookingStatus.DECLINED, BookingStatus.COMPLETED
        ]:
            return False
        
        # Cannot modify after check-in
        if booking.status in [BookingStatus.CHECKED_IN, BookingStatus.CHECKED_OUT]:
            return False
        
        # Check modification deadline (e.g., 48 hours before check-in)
        modification_deadline = datetime.combine(
            booking.check_in_date, datetime.min.time()
        ) - timedelta(hours=48)
        
        if datetime.utcnow() > modification_deadline:
            return False
        
        # Only guest or host can modify
        if user_id not in [booking.guest_id, booking.host_id]:
            return False
        
        return True
    
    async def _can_cancel_booking(self, booking: Booking, user_id: UUID) -> bool:
        """Check if booking can be cancelled"""
        # Cannot cancel already cancelled or completed bookings
        if booking.status in [
            BookingStatus.CANCELLED, BookingStatus.DECLINED, BookingStatus.COMPLETED
        ]:
            return False
        
        # Check cancellation deadline
        if booking.cancellation_deadline and datetime.utcnow() > booking.cancellation_deadline:
            return False
        
        # Only guest or host can cancel
        if user_id not in [booking.guest_id, booking.host_id]:
            return False
        
        return True
    
    async def _validate_modification_request(
        self,
        booking: Booking,
        request: BookingModificationRequest
    ) -> List[str]:
        """Validate modification request"""
        errors = []
        
        if request.modification_type == ModificationType.DATE_CHANGE:
            new_checkin = request.new_check_in_date or booking.check_in_date
            new_checkout = request.new_check_out_date or booking.check_out_date
            
            if new_checkout <= new_checkin:
                errors.append("Check-out date must be after check-in date")
            
            if new_checkin < date.today():
                errors.append("Check-in date cannot be in the past")
            
            # Check availability for new dates
            if new_checkin != booking.check_in_date or new_checkout != booking.check_out_date:
                is_valid, validation_errors = await self.availability_service.validate_booking_dates(
                    booking.property_id,
                    new_checkin,
                    new_checkout,
                    booking.number_of_guests,
                    exclude_booking_id=booking.id
                )
                
                if not is_valid:
                    errors.extend(validation_errors)
        
        elif request.modification_type == ModificationType.GUEST_COUNT_CHANGE:
            new_guest_count = request.new_number_of_guests or booking.number_of_guests
            
            # Check capacity
            if not await self.availability_service._check_guest_capacity(
                booking.property_id, new_guest_count
            ):
                errors.append("New guest count exceeds property capacity")
        
        return errors
    
    async def _calculate_modification_pricing(
        self,
        booking: Booking,
        request: BookingModificationRequest
    ) -> Dict[str, Decimal]:
        """Calculate pricing impact of modification"""
        # Simplified calculation - in production, would be more complex
        price_difference = Decimal('0.00')
        additional_fees = Decimal('0.00')
        refund_amount = Decimal('0.00')
        
        if request.modification_type == ModificationType.DATE_CHANGE:
            # Calculate new pricing for new dates
            # This is a simplified version
            new_nights = 0
            if request.new_check_in_date and request.new_check_out_date:
                new_nights = (request.new_check_out_date - request.new_check_in_date).days
                new_base_price = Decimal('100.00') * new_nights  # Mock pricing
                price_difference = new_base_price - booking.base_price
        
        elif request.modification_type == ModificationType.GUEST_COUNT_CHANGE:
            if request.new_number_of_guests:
                current_extra_guests = max(0, booking.number_of_guests - 2)
                new_extra_guests = max(0, request.new_number_of_guests - 2)
                guest_fee_diff = (new_extra_guests - current_extra_guests) * Decimal('25.00') * booking.nights
                price_difference = guest_fee_diff
        
        # Modification fee
        additional_fees = Decimal('25.00')  # Standard modification fee
        
        # Calculate refund if price decreases
        if price_difference < 0:
            refund_amount = abs(price_difference)
            price_difference = Decimal('0.00')
        
        return {
            'price_difference': price_difference,
            'additional_fees': additional_fees,
            'refund_amount': refund_amount
        }
    
    async def _serialize_booking_data(self, booking: Booking) -> Dict[str, Any]:
        """Serialize booking data for modification tracking"""
        return {
            'check_in_date': booking.check_in_date.isoformat(),
            'check_out_date': booking.check_out_date.isoformat(),
            'number_of_guests': booking.number_of_guests,
            'adults': booking.adults,
            'children': booking.children,
            'infants': booking.infants,
            'pets': booking.pets,
            'special_requests': booking.special_requests
        }
    
    async def _serialize_modification_request(
        self,
        request: BookingModificationRequest
    ) -> Dict[str, Any]:
        """Serialize modification request data"""
        data = {'modification_type': request.modification_type.value}
        
        if request.new_check_in_date:
            data['new_check_in_date'] = request.new_check_in_date.isoformat()
        
        if request.new_check_out_date:
            data['new_check_out_date'] = request.new_check_out_date.isoformat()
        
        if request.new_number_of_guests:
            data['new_number_of_guests'] = request.new_number_of_guests
        
        if request.new_adults:
            data['new_adults'] = request.new_adults
        
        if request.new_children:
            data['new_children'] = request.new_children
        
        if request.new_infants:
            data['new_infants'] = request.new_infants
        
        if request.new_pets:
            data['new_pets'] = request.new_pets
        
        if request.new_special_requests:
            data['new_special_requests'] = request.new_special_requests
        
        return data
    
    async def _booking_requires_action(
        self,
        booking: Booking,
        user_id: UUID,
        user_role: str
    ) -> bool:
        """Check if booking requires user action"""
        if user_role == 'host':
            # Host needs to approve pending bookings
            return (
                booking.status == BookingStatus.PENDING and
                booking.host_id == user_id and
                booking.host_response_deadline and
                booking.host_response_deadline > datetime.utcnow()
            )
        
        elif user_role == 'guest':
            # Guest might need to complete payment
            return (
                booking.status == BookingStatus.CONFIRMED and
                booking.guest_id == user_id and
                not any(p.status == PaymentStatus.SUCCEEDED for p in booking.payments)
            )
        
        return False


# Utility functions for booking management

async def auto_decline_expired_bookings(db_session: AsyncSession) -> int:
    """Auto-decline bookings that have expired host response deadlines"""
    try:
        stmt = select(Booking).where(
            and_(
                Booking.status == BookingStatus.PENDING,
                Booking.host_response_deadline <= datetime.utcnow()
            )
        )
        
        result = await db_session.execute(stmt)
        expired_bookings = result.scalars().all()
        
        for booking in expired_bookings:
            booking.status = BookingStatus.DECLINED
            booking.declined_at = datetime.utcnow()
            booking.decline_reason = "Host response deadline expired"
        
        await db_session.commit()
        
        logger.info(f"Auto-declined {len(expired_bookings)} expired bookings")
        return len(expired_bookings)
        
    except Exception as e:
        logger.error(f"Error auto-declining expired bookings: {str(e)}")
        await db_session.rollback()
        return 0


async def send_checkin_reminders(db_session: AsyncSession) -> int:
    """Send check-in reminders for upcoming bookings"""
    try:
        tomorrow = date.today() + timedelta(days=1)
        
        stmt = select(Booking).where(
            and_(
                Booking.status == BookingStatus.CONFIRMED,
                Booking.check_in_date == tomorrow
            )
        )
        
        result = await db_session.execute(stmt)
        upcoming_bookings = result.scalars().all()
        
        reminder_count = 0
        for booking in upcoming_bookings:
            # In production, would send actual email/SMS
            logger.info(f"Check-in reminder for booking {booking.booking_number}")
            reminder_count += 1
        
        return reminder_count
        
    except Exception as e:
        logger.error(f"Error sending check-in reminders: {str(e)}")
        return 0


async def auto_complete_bookings(db_session: AsyncSession) -> int:
    """Auto-complete bookings after checkout date"""
    try:
        yesterday = date.today() - timedelta(days=1)
        
        stmt = select(Booking).where(
            and_(
                Booking.status == BookingStatus.CHECKED_OUT,
                Booking.check_out_date <= yesterday
            )
        )
        
        result = await db_session.execute(stmt)
        completed_bookings = result.scalars().all()
        
        for booking in completed_bookings:
            booking.status = BookingStatus.COMPLETED
            booking.completed_at = datetime.utcnow()
        
        await db_session.commit()
        
        logger.info(f"Auto-completed {len(completed_bookings)} bookings")
        return len(completed_bookings)
        
    except Exception as e:
        logger.error(f"Error auto-completing bookings: {str(e)}")
        await db_session.rollback()
        return 0