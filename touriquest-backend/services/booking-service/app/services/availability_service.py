"""Real-time availability service for booking conflict prevention"""

import asyncio
from datetime import datetime, date, timedelta
from typing import List, Optional, Dict, Any, Tuple
from decimal import Decimal
from uuid import UUID, uuid4
import logging

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, text
from sqlalchemy.orm import selectinload

from app.models.booking_models import (
    Booking, AvailabilityLock, BookingCalendarSync, BookingStatus,
    AvailabilityLockStatus
)
from app.schemas.booking_schemas import (
    AvailabilityCheckRequest, AvailabilityCheckResponse,
    AvailabilityLockRequest, AvailabilityLockResponse
)

logger = logging.getLogger(__name__)


class AvailabilityConflictError(Exception):
    """Raised when booking dates conflict with existing reservations"""
    def __init__(self, message: str, conflicting_bookings: List[str] = None):
        super().__init__(message)
        self.conflicting_bookings = conflicting_bookings or []


class AvailabilityService:
    """Service for managing property availability and booking conflicts"""
    
    def __init__(self, db_session: AsyncSession):
        self.db = db_session
        self._redis_client = None  # Will be injected for production
        
    async def check_availability(
        self,
        request: AvailabilityCheckRequest
    ) -> AvailabilityCheckResponse:
        """
        Check property availability for given dates and guest count
        
        This is the main availability checking method that considers:
        - Existing confirmed bookings
        - Blocked dates
        - Property capacity
        - Minimum/maximum stay requirements
        - Seasonal restrictions
        """
        try:
            logger.info(f"Checking availability for property {request.property_id} "
                       f"from {request.check_in_date} to {request.check_out_date}")
            
            # Get property details (would come from property service in real implementation)
            property_details = await self._get_property_details(request.property_id)
            
            # Check basic availability
            is_available = await self._check_date_availability(
                request.property_id,
                request.check_in_date,
                request.check_out_date
            )
            
            # Check guest capacity
            guest_capacity_ok = await self._check_guest_capacity(
                request.property_id,
                request.number_of_guests
            )
            
            # Check stay length requirements
            stay_requirements_met = await self._check_stay_requirements(
                request.property_id,
                request.check_in_date,
                request.check_out_date
            )
            
            # Get pricing information
            pricing_info = await self._calculate_pricing(
                request.property_id,
                request.check_in_date,
                request.check_out_date,
                request.number_of_guests
            )
            
            # Get restrictions and policies
            restrictions = await self._get_booking_restrictions(
                request.property_id,
                request.check_in_date,
                request.check_out_date
            )
            
            # Get unavailable dates in range
            unavailable_dates = await self._get_unavailable_dates(
                request.property_id,
                request.check_in_date,
                request.check_out_date
            )
            
            # Determine booking type availability
            instant_book_available = (
                is_available and 
                guest_capacity_ok and 
                stay_requirements_met and
                property_details.get('instant_book_enabled', False)
            )
            
            # Overall availability
            overall_available = (
                is_available and 
                guest_capacity_ok and 
                stay_requirements_met and
                len(unavailable_dates) == 0
            )
            
            return AvailabilityCheckResponse(
                property_id=request.property_id,
                check_in_date=request.check_in_date,
                check_out_date=request.check_out_date,
                is_available=overall_available,
                base_price_per_night=pricing_info['base_price_per_night'],
                total_base_price=pricing_info['total_base_price'],
                estimated_total=pricing_info['estimated_total'],
                currency=pricing_info['currency'],
                available_for_instant_book=instant_book_available,
                requires_approval=not instant_book_available and overall_available,
                minimum_stay_nights=property_details.get('minimum_stay_nights', 1),
                maximum_stay_nights=property_details.get('maximum_stay_nights'),
                restrictions=restrictions,
                unavailable_dates=unavailable_dates,
                cancellation_policy=property_details.get('cancellation_policy', 'moderate'),
                house_rules=property_details.get('house_rules', [])
            )
            
        except Exception as e:
            logger.error(f"Error checking availability: {str(e)}")
            raise
    
    async def create_availability_lock(
        self,
        request: AvailabilityLockRequest,
        user_id: UUID
    ) -> AvailabilityLockResponse:
        """
        Create a temporary availability lock during booking process
        
        Prevents double-booking while guest completes their reservation
        """
        try:
            # Check if dates are still available
            availability_check = AvailabilityCheckRequest(
                property_id=request.property_id,
                check_in_date=request.check_in_date,
                check_out_date=request.check_out_date,
                number_of_guests=1  # Minimal check for lock
            )
            
            availability = await self.check_availability(availability_check)
            
            if not availability.is_available:
                return AvailabilityLockResponse(
                    lock_id=uuid4(),
                    property_id=request.property_id,
                    check_in_date=request.check_in_date,
                    check_out_date=request.check_out_date,
                    expires_at=datetime.utcnow(),
                    status=AvailabilityLockStatus.FAILED,
                    can_proceed=False
                )
            
            # Check for existing locks that might conflict
            existing_lock = await self._get_conflicting_lock(
                request.property_id,
                request.check_in_date,
                request.check_out_date
            )
            
            if existing_lock and existing_lock.user_id != user_id:
                return AvailabilityLockResponse(
                    lock_id=existing_lock.id,
                    property_id=request.property_id,
                    check_in_date=request.check_in_date,
                    check_out_date=request.check_out_date,
                    expires_at=existing_lock.expires_at,
                    status=AvailabilityLockStatus.CONFLICT,
                    can_proceed=False
                )
            
            # Create new lock or extend existing one
            if existing_lock and existing_lock.user_id == user_id:
                # Extend existing lock
                existing_lock.expires_at = datetime.utcnow() + timedelta(
                    minutes=request.lock_duration_minutes
                )
                existing_lock.status = AvailabilityLockStatus.ACTIVE
                lock = existing_lock
            else:
                # Create new lock
                lock = AvailabilityLock(
                    id=uuid4(),
                    property_id=request.property_id,
                    user_id=user_id,
                    check_in_date=request.check_in_date,
                    check_out_date=request.check_out_date,
                    session_id=request.session_id,
                    status=AvailabilityLockStatus.ACTIVE,
                    expires_at=datetime.utcnow() + timedelta(
                        minutes=request.lock_duration_minutes
                    )
                )
                self.db.add(lock)
            
            await self.db.commit()
            
            # Schedule lock cleanup
            asyncio.create_task(self._schedule_lock_cleanup(lock.id))
            
            return AvailabilityLockResponse(
                lock_id=lock.id,
                property_id=lock.property_id,
                check_in_date=lock.check_in_date,
                check_out_date=lock.check_out_date,
                expires_at=lock.expires_at,
                status=lock.status,
                can_proceed=True
            )
            
        except Exception as e:
            logger.error(f"Error creating availability lock: {str(e)}")
            await self.db.rollback()
            raise
    
    async def release_availability_lock(self, lock_id: UUID, user_id: UUID) -> bool:
        """Release an availability lock"""
        try:
            stmt = select(AvailabilityLock).where(
                and_(
                    AvailabilityLock.id == lock_id,
                    AvailabilityLock.user_id == user_id,
                    AvailabilityLock.status == AvailabilityLockStatus.ACTIVE
                )
            )
            result = await self.db.execute(stmt)
            lock = result.scalar_one_or_none()
            
            if not lock:
                return False
            
            lock.status = AvailabilityLockStatus.RELEASED
            lock.released_at = datetime.utcnow()
            await self.db.commit()
            
            logger.info(f"Released availability lock {lock_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error releasing availability lock: {str(e)}")
            await self.db.rollback()
            return False
    
    async def validate_booking_dates(
        self,
        property_id: UUID,
        check_in_date: date,
        check_out_date: date,
        number_of_guests: int,
        exclude_booking_id: Optional[UUID] = None
    ) -> Tuple[bool, List[str]]:
        """
        Validate booking dates for conflicts and restrictions
        
        Returns (is_valid, list_of_errors)
        """
        errors = []
        
        try:
            # Check basic date logic
            if check_out_date <= check_in_date:
                errors.append("Check-out date must be after check-in date")
            
            if check_in_date < date.today():
                errors.append("Check-in date cannot be in the past")
            
            # Check for booking conflicts
            conflicts = await self._get_booking_conflicts(
                property_id,
                check_in_date,
                check_out_date,
                exclude_booking_id
            )
            
            if conflicts:
                booking_numbers = [b.booking_number for b in conflicts]
                errors.append(f"Dates conflict with existing bookings: {', '.join(booking_numbers)}")
            
            # Check blocked dates
            blocked_dates = await self._get_blocked_dates(
                property_id,
                check_in_date,
                check_out_date
            )
            
            if blocked_dates:
                blocked_str = ', '.join([d.strftime('%Y-%m-%d') for d in blocked_dates])
                errors.append(f"Property is blocked on: {blocked_str}")
            
            # Check stay length requirements
            property_details = await self._get_property_details(property_id)
            nights = (check_out_date - check_in_date).days
            
            min_nights = property_details.get('minimum_stay_nights', 1)
            max_nights = property_details.get('maximum_stay_nights')
            
            if nights < min_nights:
                errors.append(f"Minimum stay is {min_nights} nights")
            
            if max_nights and nights > max_nights:
                errors.append(f"Maximum stay is {max_nights} nights")
            
            # Check guest capacity
            max_guests = property_details.get('max_guests', 1)
            if number_of_guests > max_guests:
                errors.append(f"Property accommodates maximum {max_guests} guests")
            
            # Check advance booking requirements
            advance_days = property_details.get('advance_booking_days', 0)
            if (check_in_date - date.today()).days < advance_days:
                errors.append(f"Property requires {advance_days} days advance booking")
            
            # Check cutoff time for same-day bookings
            if check_in_date == date.today():
                cutoff_hour = property_details.get('same_day_cutoff_hour', 15)
                if datetime.now().hour >= cutoff_hour:
                    errors.append(f"Same-day bookings must be made before {cutoff_hour}:00")
            
            return len(errors) == 0, errors
            
        except Exception as e:
            logger.error(f"Error validating booking dates: {str(e)}")
            errors.append("Unable to validate booking dates")
            return False, errors
    
    async def get_property_calendar(
        self,
        property_id: UUID,
        start_date: date,
        end_date: date
    ) -> Dict[str, Any]:
        """Get property calendar with availability and pricing"""
        try:
            calendar_data = {}
            current_date = start_date
            
            # Get all bookings in date range
            bookings = await self._get_bookings_in_range(
                property_id, start_date, end_date
            )
            
            # Get blocked dates
            blocked_dates = await self._get_blocked_dates(
                property_id, start_date, end_date
            )
            
            # Get pricing for date range
            pricing_data = await self._get_pricing_calendar(
                property_id, start_date, end_date
            )
            
            while current_date <= end_date:
                date_str = current_date.strftime('%Y-%m-%d')
                
                # Check if date is booked
                is_booked = any(
                    booking.check_in_date <= current_date < booking.check_out_date
                    for booking in bookings
                )
                
                # Check if date is blocked
                is_blocked = current_date in blocked_dates
                
                # Get pricing for date
                base_price = pricing_data.get(date_str, Decimal('0.00'))
                
                calendar_data[date_str] = {
                    'date': current_date,
                    'is_available': not (is_booked or is_blocked),
                    'is_booked': is_booked,
                    'is_blocked': is_blocked,
                    'base_price': base_price,
                    'minimum_stay': 1,  # Could be dynamic based on season
                    'checkout_allowed': not is_booked  # Can checkout on this date
                }
                
                # Add booking information if booked
                if is_booked:
                    booking = next(
                        b for b in bookings
                        if b.check_in_date <= current_date < b.check_out_date
                    )
                    calendar_data[date_str]['booking'] = {
                        'booking_id': booking.id,
                        'booking_number': booking.booking_number,
                        'guest_name': booking.guest_name,
                        'is_checkin': current_date == booking.check_in_date,
                        'is_checkout': current_date == booking.check_out_date - timedelta(days=1)
                    }
                
                current_date += timedelta(days=1)
            
            return {
                'property_id': property_id,
                'start_date': start_date,
                'end_date': end_date,
                'calendar': calendar_data,
                'summary': {
                    'total_days': len(calendar_data),
                    'available_days': sum(1 for d in calendar_data.values() if d['is_available']),
                    'booked_days': sum(1 for d in calendar_data.values() if d['is_booked']),
                    'blocked_days': sum(1 for d in calendar_data.values() if d['is_blocked'])
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting property calendar: {str(e)}")
            raise
    
    async def block_dates(
        self,
        property_id: UUID,
        start_date: date,
        end_date: date,
        reason: str,
        user_id: UUID
    ) -> bool:
        """Block dates on property calendar"""
        try:
            # Validate dates aren't already booked
            conflicts = await self._get_booking_conflicts(
                property_id, start_date, end_date
            )
            
            if conflicts:
                raise AvailabilityConflictError(
                    "Cannot block dates that have existing bookings",
                    [b.booking_number for b in conflicts]
                )
            
            # Create calendar sync entry for blocked dates
            block_sync = BookingCalendarSync(
                id=uuid4(),
                property_id=property_id,
                calendar_type='manual_block',
                external_booking_id=f"block_{uuid4()}",
                external_check_in=start_date,
                external_check_out=end_date,
                external_guest_name=f"BLOCKED: {reason}",
                sync_status='active',
                last_sync_at=datetime.utcnow(),
                is_blocking=True,
                created_by=user_id
            )
            
            self.db.add(block_sync)
            await self.db.commit()
            
            logger.info(f"Blocked dates {start_date} to {end_date} for property {property_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error blocking dates: {str(e)}")
            await self.db.rollback()
            raise
    
    async def unblock_dates(
        self,
        property_id: UUID,
        start_date: date,
        end_date: date,
        user_id: UUID
    ) -> bool:
        """Unblock dates on property calendar"""
        try:
            # Find matching block entries
            stmt = select(BookingCalendarSync).where(
                and_(
                    BookingCalendarSync.property_id == property_id,
                    BookingCalendarSync.calendar_type == 'manual_block',
                    BookingCalendarSync.external_check_in == start_date,
                    BookingCalendarSync.external_check_out == end_date,
                    BookingCalendarSync.is_blocking == True,
                    BookingCalendarSync.sync_status == 'active'
                )
            )
            result = await self.db.execute(stmt)
            blocks = result.scalars().all()
            
            for block in blocks:
                block.sync_status = 'cancelled'
                block.updated_at = datetime.utcnow()
            
            await self.db.commit()
            
            logger.info(f"Unblocked dates {start_date} to {end_date} for property {property_id}")
            return len(blocks) > 0
            
        except Exception as e:
            logger.error(f"Error unblocking dates: {str(e)}")
            await self.db.rollback()
            raise
    
    # Private helper methods
    
    async def _check_date_availability(
        self,
        property_id: UUID,
        check_in_date: date,
        check_out_date: date
    ) -> bool:
        """Check if dates are available (no bookings or blocks)"""
        # Check for booking conflicts
        conflicts = await self._get_booking_conflicts(
            property_id, check_in_date, check_out_date
        )
        
        # Check for blocked dates
        blocked_dates = await self._get_blocked_dates(
            property_id, check_in_date, check_out_date
        )
        
        return len(conflicts) == 0 and len(blocked_dates) == 0
    
    async def _check_guest_capacity(
        self,
        property_id: UUID,
        number_of_guests: int
    ) -> bool:
        """Check if property can accommodate guest count"""
        property_details = await self._get_property_details(property_id)
        max_guests = property_details.get('max_guests', 1)
        return number_of_guests <= max_guests
    
    async def _check_stay_requirements(
        self,
        property_id: UUID,
        check_in_date: date,
        check_out_date: date
    ) -> bool:
        """Check minimum/maximum stay requirements"""
        property_details = await self._get_property_details(property_id)
        nights = (check_out_date - check_in_date).days
        
        min_nights = property_details.get('minimum_stay_nights', 1)
        max_nights = property_details.get('maximum_stay_nights')
        
        if nights < min_nights:
            return False
        
        if max_nights and nights > max_nights:
            return False
        
        return True
    
    async def _calculate_pricing(
        self,
        property_id: UUID,
        check_in_date: date,
        check_out_date: date,
        number_of_guests: int
    ) -> Dict[str, Decimal]:
        """Calculate pricing for date range"""
        # This would integrate with pricing service in real implementation
        # For now, return mock pricing
        nights = (check_out_date - check_in_date).days
        base_price_per_night = Decimal('100.00')  # Mock base price
        
        # Calculate dynamic pricing based on demand, season, etc.
        total_base_price = base_price_per_night * nights
        
        # Add fees
        cleaning_fee = Decimal('50.00')
        service_fee = total_base_price * Decimal('0.03')  # 3% service fee
        taxes = total_base_price * Decimal('0.10')  # 10% taxes
        
        estimated_total = total_base_price + cleaning_fee + service_fee + taxes
        
        return {
            'base_price_per_night': base_price_per_night,
            'total_base_price': total_base_price,
            'estimated_total': estimated_total,
            'currency': 'USD'
        }
    
    async def _get_booking_restrictions(
        self,
        property_id: UUID,
        check_in_date: date,
        check_out_date: date
    ) -> List[str]:
        """Get applicable booking restrictions"""
        restrictions = []
        
        property_details = await self._get_property_details(property_id)
        
        # Check advance booking requirements
        advance_days = property_details.get('advance_booking_days', 0)
        if (check_in_date - date.today()).days < advance_days:
            restrictions.append(f"Requires {advance_days} days advance booking")
        
        # Check same-day booking cutoff
        if check_in_date == date.today():
            cutoff_hour = property_details.get('same_day_cutoff_hour', 15)
            if datetime.now().hour >= cutoff_hour:
                restrictions.append(f"Same-day bookings close at {cutoff_hour}:00")
        
        # Check seasonal restrictions
        if property_details.get('seasonal_restrictions'):
            # Add seasonal restriction logic here
            pass
        
        return restrictions
    
    async def _get_unavailable_dates(
        self,
        property_id: UUID,
        check_in_date: date,
        check_out_date: date
    ) -> List[date]:
        """Get list of unavailable dates in range"""
        unavailable = []
        
        # Get booked dates
        bookings = await self._get_bookings_in_range(
            property_id, check_in_date, check_out_date
        )
        
        for booking in bookings:
            current_date = booking.check_in_date
            while current_date < booking.check_out_date:
                if check_in_date <= current_date < check_out_date:
                    unavailable.append(current_date)
                current_date += timedelta(days=1)
        
        # Get blocked dates
        blocked_dates = await self._get_blocked_dates(
            property_id, check_in_date, check_out_date
        )
        unavailable.extend(blocked_dates)
        
        return sorted(list(set(unavailable)))
    
    async def _get_property_details(self, property_id: UUID) -> Dict[str, Any]:
        """Get property details (mock implementation)"""
        # In real implementation, this would call the property service
        return {
            'max_guests': 4,
            'minimum_stay_nights': 2,
            'maximum_stay_nights': 30,
            'instant_book_enabled': True,
            'advance_booking_days': 0,
            'same_day_cutoff_hour': 15,
            'cancellation_policy': 'moderate',
            'house_rules': [
                'No smoking',
                'No pets',
                'Check-in after 3 PM',
                'Check-out before 11 AM'
            ]
        }
    
    async def _get_booking_conflicts(
        self,
        property_id: UUID,
        check_in_date: date,
        check_out_date: date,
        exclude_booking_id: Optional[UUID] = None
    ) -> List[Booking]:
        """Get bookings that conflict with date range"""
        stmt = select(Booking).where(
            and_(
                Booking.property_id == property_id,
                Booking.status.in_([
                    BookingStatus.CONFIRMED,
                    BookingStatus.CHECKED_IN,
                    BookingStatus.CHECKED_OUT
                ]),
                or_(
                    # Booking starts during our range
                    and_(
                        Booking.check_in_date >= check_in_date,
                        Booking.check_in_date < check_out_date
                    ),
                    # Booking ends during our range
                    and_(
                        Booking.check_out_date > check_in_date,
                        Booking.check_out_date <= check_out_date
                    ),
                    # Booking encompasses our entire range
                    and_(
                        Booking.check_in_date <= check_in_date,
                        Booking.check_out_date >= check_out_date
                    )
                )
            )
        )
        
        if exclude_booking_id:
            stmt = stmt.where(Booking.id != exclude_booking_id)
        
        result = await self.db.execute(stmt)
        return result.scalars().all()
    
    async def _get_blocked_dates(
        self,
        property_id: UUID,
        start_date: date,
        end_date: date
    ) -> List[date]:
        """Get manually blocked dates"""
        stmt = select(BookingCalendarSync).where(
            and_(
                BookingCalendarSync.property_id == property_id,
                BookingCalendarSync.is_blocking == True,
                BookingCalendarSync.sync_status == 'active',
                or_(
                    and_(
                        BookingCalendarSync.external_check_in >= start_date,
                        BookingCalendarSync.external_check_in < end_date
                    ),
                    and_(
                        BookingCalendarSync.external_check_out > start_date,
                        BookingCalendarSync.external_check_out <= end_date
                    ),
                    and_(
                        BookingCalendarSync.external_check_in <= start_date,
                        BookingCalendarSync.external_check_out >= end_date
                    )
                )
            )
        )
        
        result = await self.db.execute(stmt)
        blocks = result.scalars().all()
        
        blocked_dates = []
        for block in blocks:
            current_date = block.external_check_in
            while current_date < block.external_check_out:
                if start_date <= current_date < end_date:
                    blocked_dates.append(current_date)
                current_date += timedelta(days=1)
        
        return blocked_dates
    
    async def _get_bookings_in_range(
        self,
        property_id: UUID,
        start_date: date,
        end_date: date
    ) -> List[Booking]:
        """Get all bookings in date range"""
        stmt = select(Booking).where(
            and_(
                Booking.property_id == property_id,
                Booking.status.in_([
                    BookingStatus.CONFIRMED,
                    BookingStatus.CHECKED_IN,
                    BookingStatus.CHECKED_OUT
                ]),
                Booking.check_in_date < end_date,
                Booking.check_out_date > start_date
            )
        )
        
        result = await self.db.execute(stmt)
        return result.scalars().all()
    
    async def _get_pricing_calendar(
        self,
        property_id: UUID,
        start_date: date,
        end_date: date
    ) -> Dict[str, Decimal]:
        """Get pricing for date range"""
        # Mock implementation - would integrate with pricing service
        pricing = {}
        current_date = start_date
        base_price = Decimal('100.00')
        
        while current_date <= end_date:
            # Add seasonal pricing logic here
            date_str = current_date.strftime('%Y-%m-%d')
            pricing[date_str] = base_price
            current_date += timedelta(days=1)
        
        return pricing
    
    async def _get_conflicting_lock(
        self,
        property_id: UUID,
        check_in_date: date,
        check_out_date: date
    ) -> Optional[AvailabilityLock]:
        """Get conflicting availability lock"""
        stmt = select(AvailabilityLock).where(
            and_(
                AvailabilityLock.property_id == property_id,
                AvailabilityLock.status == AvailabilityLockStatus.ACTIVE,
                AvailabilityLock.expires_at > datetime.utcnow(),
                or_(
                    and_(
                        AvailabilityLock.check_in_date >= check_in_date,
                        AvailabilityLock.check_in_date < check_out_date
                    ),
                    and_(
                        AvailabilityLock.check_out_date > check_in_date,
                        AvailabilityLock.check_out_date <= check_out_date
                    ),
                    and_(
                        AvailabilityLock.check_in_date <= check_in_date,
                        AvailabilityLock.check_out_date >= check_out_date
                    )
                )
            )
        )
        
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
    
    async def _schedule_lock_cleanup(self, lock_id: UUID):
        """Schedule cleanup of expired lock"""
        try:
            # In production, this would be handled by a background task queue
            # For now, we'll just mark it for cleanup
            await asyncio.sleep(1)  # Minimal delay
            
            stmt = select(AvailabilityLock).where(
                and_(
                    AvailabilityLock.id == lock_id,
                    AvailabilityLock.expires_at <= datetime.utcnow(),
                    AvailabilityLock.status == AvailabilityLockStatus.ACTIVE
                )
            )
            result = await self.db.execute(stmt)
            lock = result.scalar_one_or_none()
            
            if lock:
                lock.status = AvailabilityLockStatus.EXPIRED
                await self.db.commit()
                logger.info(f"Cleaned up expired lock {lock_id}")
        
        except Exception as e:
            logger.error(f"Error cleaning up lock {lock_id}: {str(e)}")


# Utility functions for availability management

async def cleanup_expired_locks(db_session: AsyncSession) -> int:
    """Cleanup expired availability locks"""
    try:
        stmt = select(AvailabilityLock).where(
            and_(
                AvailabilityLock.status == AvailabilityLockStatus.ACTIVE,
                AvailabilityLock.expires_at <= datetime.utcnow()
            )
        )
        result = await db_session.execute(stmt)
        expired_locks = result.scalars().all()
        
        for lock in expired_locks:
            lock.status = AvailabilityLockStatus.EXPIRED
        
        await db_session.commit()
        
        logger.info(f"Cleaned up {len(expired_locks)} expired availability locks")
        return len(expired_locks)
        
    except Exception as e:
        logger.error(f"Error cleaning up expired locks: {str(e)}")
        await db_session.rollback()
        return 0


async def get_property_occupancy_rate(
    db_session: AsyncSession,
    property_id: UUID,
    start_date: date,
    end_date: date
) -> float:
    """Calculate property occupancy rate for date range"""
    try:
        total_days = (end_date - start_date).days
        
        # Get booked days
        stmt = select(func.sum(
            func.extract('day', Booking.check_out_date - Booking.check_in_date)
        )).where(
            and_(
                Booking.property_id == property_id,
                Booking.status.in_([
                    BookingStatus.CONFIRMED,
                    BookingStatus.CHECKED_IN,
                    BookingStatus.CHECKED_OUT
                ]),
                Booking.check_in_date < end_date,
                Booking.check_out_date > start_date
            )
        )
        
        result = await db_session.execute(stmt)
        booked_days = result.scalar() or 0
        
        if total_days == 0:
            return 0.0
        
        return min(float(booked_days) / float(total_days), 1.0)
        
    except Exception as e:
        logger.error(f"Error calculating occupancy rate: {str(e)}")
        return 0.0