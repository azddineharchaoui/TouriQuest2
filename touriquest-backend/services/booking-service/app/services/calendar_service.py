"""Calendar management service for external sync and scheduling"""

import asyncio
import logging
from datetime import datetime, date, timedelta
from typing import Optional, List, Dict, Any, Tuple
from decimal import Decimal
from uuid import UUID, uuid4
import re
from urllib.parse import urlparse
import aiohttp

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, delete
from sqlalchemy.orm import selectinload

from app.models.booking_models import (
    BookingCalendarSync, Booking, BookingStatus
)
from app.schemas.booking_schemas import (
    CalendarSyncRequest, CalendarSyncResponse
)

logger = logging.getLogger(__name__)


class CalendarSyncError(Exception):
    """Raised when calendar synchronization encounters an error"""
    def __init__(self, message: str, code: str = None, calendar_id: UUID = None):
        super().__init__(message)
        self.code = code
        self.calendar_id = calendar_id


class CalendarParsingError(CalendarSyncError):
    """Raised when external calendar format cannot be parsed"""
    pass


class CalendarManagementService:
    """Service for managing external calendar synchronization and scheduling"""
    
    def __init__(self, db_session: AsyncSession):
        self.db = db_session
        self._sync_intervals = {
            'airbnb': timedelta(hours=1),      # Frequent sync for Airbnb
            'vrbo': timedelta(hours=2),        # Less frequent for VRBO
            'booking_com': timedelta(hours=2), # Booking.com sync
            'ical': timedelta(hours=6),        # Generic iCal feeds
            'manual_block': None               # Manual blocks don't auto-sync
        }
    
    async def create_calendar_sync(
        self,
        request: CalendarSyncRequest,
        user_id: UUID
    ) -> CalendarSyncResponse:
        """
        Create new external calendar synchronization
        
        Supports:
        - Airbnb export calendars
        - VRBO/HomeAway calendars  
        - Booking.com calendars
        - Generic iCal feeds
        - Two-way synchronization
        """
        try:
            logger.info(f"Creating calendar sync for property {request.property_id}")
            
            # Validate calendar URL if provided
            if request.calendar_url:
                if not await self._validate_calendar_url(request.calendar_url):
                    raise CalendarSyncError(
                        "Invalid calendar URL format",
                        code="invalid_calendar_url"
                    )
            
            # Check for existing sync of same type
            existing_sync = await self._get_existing_sync(
                request.property_id, 
                request.calendar_type
            )
            
            if existing_sync and existing_sync.sync_status == 'active':
                raise CalendarSyncError(
                    f"Calendar sync of type {request.calendar_type} already exists for this property",
                    code="sync_already_exists"
                )
            
            # Create calendar sync record
            calendar_sync = BookingCalendarSync(
                id=uuid4(),
                property_id=request.property_id,
                calendar_type=request.calendar_type,
                calendar_url=request.calendar_url,
                is_two_way_sync=request.is_two_way_sync,
                auto_block_external=request.auto_block_external,
                sync_status='active',
                created_by=user_id,
                
                # Set next sync time
                next_sync_at=self._calculate_next_sync_time(request.calendar_type)
            )
            
            self.db.add(calendar_sync)
            await self.db.flush()
            
            # Perform initial sync
            if request.calendar_url:
                try:
                    sync_result = await self._perform_calendar_sync(calendar_sync)
                    calendar_sync.last_sync_at = datetime.utcnow()
                    calendar_sync.sync_status = 'active'
                    calendar_sync.last_sync_result = sync_result
                    
                except Exception as sync_error:
                    logger.error(f"Initial sync failed: {str(sync_error)}")
                    calendar_sync.sync_status = 'error'
                    calendar_sync.last_error = str(sync_error)
            
            await self.db.commit()
            
            logger.info(f"Created calendar sync {calendar_sync.id}")
            
            return CalendarSyncResponse(
                id=calendar_sync.id,
                property_id=calendar_sync.property_id,
                calendar_type=calendar_sync.calendar_type,
                is_two_way_sync=calendar_sync.is_two_way_sync,
                sync_status=calendar_sync.sync_status,
                last_sync_at=calendar_sync.last_sync_at,
                next_sync_at=calendar_sync.next_sync_at,
                created_at=calendar_sync.created_at
            )
            
        except Exception as e:
            logger.error(f"Error creating calendar sync: {str(e)}")
            await self.db.rollback()
            raise
    
    async def sync_calendar(self, calendar_id: UUID) -> Dict[str, Any]:
        """Manually trigger calendar synchronization"""
        try:
            # Get calendar sync configuration
            calendar_sync = await self._get_calendar_sync(calendar_id)
            if not calendar_sync:
                raise CalendarSyncError(
                    "Calendar sync not found",
                    code="sync_not_found",
                    calendar_id=calendar_id
                )
            
            if calendar_sync.sync_status != 'active':
                raise CalendarSyncError(
                    f"Cannot sync calendar with status {calendar_sync.sync_status}",
                    code="invalid_sync_status",
                    calendar_id=calendar_id
                )
            
            # Perform synchronization
            sync_result = await self._perform_calendar_sync(calendar_sync)
            
            # Update sync record
            calendar_sync.last_sync_at = datetime.utcnow()
            calendar_sync.next_sync_at = self._calculate_next_sync_time(
                calendar_sync.calendar_type
            )
            calendar_sync.last_sync_result = sync_result
            calendar_sync.consecutive_failures = 0
            
            await self.db.commit()
            
            logger.info(f"Successfully synced calendar {calendar_id}")
            
            return {
                'sync_id': calendar_id,
                'status': 'success',
                'synced_at': calendar_sync.last_sync_at,
                'next_sync_at': calendar_sync.next_sync_at,
                'result': sync_result
            }
            
        except Exception as e:
            logger.error(f"Error syncing calendar {calendar_id}: {str(e)}")
            
            # Update error status
            if 'calendar_sync' in locals():
                calendar_sync.last_error = str(e)
                calendar_sync.consecutive_failures = (calendar_sync.consecutive_failures or 0) + 1
                
                # Disable sync after too many failures
                if calendar_sync.consecutive_failures >= 5:
                    calendar_sync.sync_status = 'disabled'
                    logger.warning(f"Disabled calendar sync {calendar_id} after 5 consecutive failures")
                
                await self.db.commit()
            
            raise
    
    async def get_property_calendar_data(
        self,
        property_id: UUID,
        start_date: date,
        end_date: date,
        include_external: bool = True
    ) -> Dict[str, Any]:
        """
        Get comprehensive calendar data for property
        
        Includes:
        - Internal bookings
        - External calendar blocks
        - Manual blocks
        - Pricing information
        - Availability status
        """
        try:
            calendar_data = {}
            
            # Get internal bookings
            internal_bookings = await self._get_internal_bookings(
                property_id, start_date, end_date
            )
            
            # Get external calendar blocks
            external_blocks = []
            if include_external:
                external_blocks = await self._get_external_blocks(
                    property_id, start_date, end_date
                )
            
            # Get manual blocks
            manual_blocks = await self._get_manual_blocks(
                property_id, start_date, end_date
            )
            
            # Build calendar data day by day
            current_date = start_date
            while current_date <= end_date:
                date_str = current_date.strftime('%Y-%m-%d')
                
                # Check for internal booking
                internal_booking = None
                for booking in internal_bookings:
                    if booking.check_in_date <= current_date < booking.check_out_date:
                        internal_booking = booking
                        break
                
                # Check for external blocks
                external_block = None
                for block in external_blocks:
                    if block.external_check_in <= current_date < block.external_check_out:
                        external_block = block
                        break
                
                # Check for manual blocks
                manual_block = None
                for block in manual_blocks:
                    if block.external_check_in <= current_date < block.external_check_out:
                        manual_block = block
                        break
                
                # Determine availability status
                is_available = not (internal_booking or external_block or manual_block)
                
                # Build day data
                day_data = {
                    'date': current_date,
                    'is_available': is_available,
                    'availability_status': self._determine_availability_status(
                        internal_booking, external_block, manual_block
                    ),
                    'price': await self._get_date_pricing(property_id, current_date),
                    'minimum_stay': await self._get_minimum_stay(property_id, current_date),
                    'check_in_allowed': is_available,
                    'check_out_allowed': True,  # Generally always allowed
                }
                
                # Add booking information if occupied
                if internal_booking:
                    day_data['booking'] = {
                        'type': 'internal',
                        'booking_id': internal_booking.id,
                        'booking_number': internal_booking.booking_number,
                        'guest_name': internal_booking.guest_name,
                        'status': internal_booking.status,
                        'is_check_in': current_date == internal_booking.check_in_date,
                        'is_check_out': current_date == internal_booking.check_out_date - timedelta(days=1)
                    }
                
                elif external_block:
                    day_data['booking'] = {
                        'type': 'external',
                        'source': external_block.calendar_type,
                        'external_id': external_block.external_booking_id,
                        'guest_name': external_block.external_guest_name,
                        'is_check_in': current_date == external_block.external_check_in,
                        'is_check_out': current_date == external_block.external_check_out - timedelta(days=1)
                    }
                
                elif manual_block:
                    day_data['booking'] = {
                        'type': 'manual_block',
                        'reason': manual_block.external_guest_name,  # Contains block reason
                        'is_check_in': current_date == manual_block.external_check_in,
                        'is_check_out': current_date == manual_block.external_check_out - timedelta(days=1)
                    }
                
                calendar_data[date_str] = day_data
                current_date += timedelta(days=1)
            
            # Calculate summary statistics
            total_days = len(calendar_data)
            available_days = sum(1 for day in calendar_data.values() if day['is_available'])
            booked_days = total_days - available_days
            
            return {
                'property_id': property_id,
                'start_date': start_date,
                'end_date': end_date,
                'calendar': calendar_data,
                'summary': {
                    'total_days': total_days,
                    'available_days': available_days,
                    'booked_days': booked_days,
                    'occupancy_rate': (booked_days / total_days * 100) if total_days > 0 else 0,
                    'internal_bookings': len(internal_bookings),
                    'external_blocks': len(external_blocks),
                    'manual_blocks': len(manual_blocks)
                },
                'sync_status': await self._get_sync_status_summary(property_id)
            }
            
        except Exception as e:
            logger.error(f"Error getting property calendar data: {str(e)}")
            raise
    
    async def create_seasonal_pricing_rule(
        self,
        property_id: UUID,
        rule_name: str,
        start_date: date,
        end_date: date,
        price_adjustment: Decimal,
        adjustment_type: str,  # 'fixed' or 'percentage'
        minimum_stay: Optional[int] = None,
        user_id: UUID = None
    ) -> UUID:
        """Create seasonal pricing rule"""
        try:
            # Validate dates
            if end_date <= start_date:
                raise CalendarSyncError(
                    "End date must be after start date",
                    code="invalid_date_range"
                )
            
            # Validate adjustment type
            if adjustment_type not in ['fixed', 'percentage']:
                raise CalendarSyncError(
                    "Adjustment type must be 'fixed' or 'percentage'",
                    code="invalid_adjustment_type"
                )
            
            # Create pricing rule as calendar sync entry
            pricing_rule = BookingCalendarSync(
                id=uuid4(),
                property_id=property_id,
                calendar_type='pricing_rule',
                external_booking_id=f"pricing_{rule_name}",
                external_check_in=start_date,
                external_check_out=end_date,
                external_guest_name=rule_name,
                sync_status='active',
                is_blocking=False,
                
                # Store pricing data in notes
                notes={
                    'rule_type': 'seasonal_pricing',
                    'price_adjustment': float(price_adjustment),
                    'adjustment_type': adjustment_type,
                    'minimum_stay': minimum_stay
                },
                
                created_by=user_id
            )
            
            self.db.add(pricing_rule)
            await self.db.commit()
            
            logger.info(f"Created seasonal pricing rule {pricing_rule.id} for property {property_id}")
            
            return pricing_rule.id
            
        except Exception as e:
            logger.error(f"Error creating seasonal pricing rule: {str(e)}")
            await self.db.rollback()
            raise
    
    async def update_minimum_stay_requirements(
        self,
        property_id: UUID,
        date_ranges: List[Dict[str, Any]],
        user_id: UUID
    ) -> List[UUID]:
        """Update minimum stay requirements for specific date ranges"""
        try:
            created_rules = []
            
            # Delete existing minimum stay rules
            stmt = delete(BookingCalendarSync).where(
                and_(
                    BookingCalendarSync.property_id == property_id,
                    BookingCalendarSync.calendar_type == 'minimum_stay_rule'
                )
            )
            await self.db.execute(stmt)
            
            # Create new rules
            for date_range in date_ranges:
                start_date = date_range['start_date']
                end_date = date_range['end_date']
                minimum_stay = date_range['minimum_stay']
                
                rule = BookingCalendarSync(
                    id=uuid4(),
                    property_id=property_id,
                    calendar_type='minimum_stay_rule',
                    external_booking_id=f"min_stay_{minimum_stay}",
                    external_check_in=start_date,
                    external_check_out=end_date,
                    external_guest_name=f"Minimum {minimum_stay} nights",
                    sync_status='active',
                    is_blocking=False,
                    notes={'minimum_stay': minimum_stay},
                    created_by=user_id
                )
                
                self.db.add(rule)
                created_rules.append(rule.id)
            
            await self.db.commit()
            
            logger.info(f"Updated minimum stay requirements for property {property_id}")
            
            return created_rules
            
        except Exception as e:
            logger.error(f"Error updating minimum stay requirements: {str(e)}")
            await self.db.rollback()
            raise
    
    async def sync_all_active_calendars(self) -> Dict[str, Any]:
        """Sync all active external calendars"""
        try:
            # Get all active calendars due for sync
            stmt = select(BookingCalendarSync).where(
                and_(
                    BookingCalendarSync.sync_status == 'active',
                    BookingCalendarSync.calendar_url.isnot(None),
                    or_(
                        BookingCalendarSync.next_sync_at.is_(None),
                        BookingCalendarSync.next_sync_at <= datetime.utcnow()
                    )
                )
            )
            
            result = await self.db.execute(stmt)
            calendars_to_sync = result.scalars().all()
            
            sync_results = {
                'total_calendars': len(calendars_to_sync),
                'successful_syncs': 0,
                'failed_syncs': 0,
                'sync_details': []
            }
            
            # Process each calendar
            for calendar_sync in calendars_to_sync:
                try:
                    sync_result = await self._perform_calendar_sync(calendar_sync)
                    
                    # Update sync record
                    calendar_sync.last_sync_at = datetime.utcnow()
                    calendar_sync.next_sync_at = self._calculate_next_sync_time(
                        calendar_sync.calendar_type
                    )
                    calendar_sync.last_sync_result = sync_result
                    calendar_sync.consecutive_failures = 0
                    
                    sync_results['successful_syncs'] += 1
                    sync_results['sync_details'].append({
                        'calendar_id': calendar_sync.id,
                        'property_id': calendar_sync.property_id,
                        'calendar_type': calendar_sync.calendar_type,
                        'status': 'success',
                        'synced_events': sync_result.get('synced_events', 0)
                    })
                    
                except Exception as sync_error:
                    logger.error(f"Failed to sync calendar {calendar_sync.id}: {str(sync_error)}")
                    
                    calendar_sync.last_error = str(sync_error)
                    calendar_sync.consecutive_failures = (calendar_sync.consecutive_failures or 0) + 1
                    
                    # Disable after too many failures
                    if calendar_sync.consecutive_failures >= 5:
                        calendar_sync.sync_status = 'disabled'
                    
                    sync_results['failed_syncs'] += 1
                    sync_results['sync_details'].append({
                        'calendar_id': calendar_sync.id,
                        'property_id': calendar_sync.property_id,
                        'calendar_type': calendar_sync.calendar_type,
                        'status': 'failed',
                        'error': str(sync_error)
                    })
            
            await self.db.commit()
            
            logger.info(f"Bulk calendar sync completed: {sync_results['successful_syncs']} successful, {sync_results['failed_syncs']} failed")
            
            return sync_results
            
        except Exception as e:
            logger.error(f"Error in bulk calendar sync: {str(e)}")
            await self.db.rollback()
            raise
    
    # Private helper methods
    
    async def _validate_calendar_url(self, url: str) -> bool:
        """Validate calendar URL format and accessibility"""
        try:
            parsed_url = urlparse(url)
            
            # Check URL scheme
            if parsed_url.scheme not in ['http', 'https']:
                return False
            
            # Check if URL ends with .ics or has ical in path
            if not (url.endswith('.ics') or 'ical' in url.lower() or 'calendar' in url.lower()):
                return False
            
            # Test accessibility
            async with aiohttp.ClientSession() as session:
                async with session.head(url, timeout=10) as response:
                    return response.status == 200
                    
        except Exception as e:
            logger.warning(f"Calendar URL validation failed: {str(e)}")
            return False
    
    async def _get_existing_sync(
        self,
        property_id: UUID,
        calendar_type: str
    ) -> Optional[BookingCalendarSync]:
        """Get existing calendar sync for property and type"""
        stmt = select(BookingCalendarSync).where(
            and_(
                BookingCalendarSync.property_id == property_id,
                BookingCalendarSync.calendar_type == calendar_type,
                BookingCalendarSync.sync_status == 'active'
            )
        )
        
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
    
    async def _get_calendar_sync(self, calendar_id: UUID) -> Optional[BookingCalendarSync]:
        """Get calendar sync by ID"""
        stmt = select(BookingCalendarSync).where(BookingCalendarSync.id == calendar_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
    
    def _calculate_next_sync_time(self, calendar_type: str) -> datetime:
        """Calculate next sync time based on calendar type"""
        interval = self._sync_intervals.get(calendar_type, timedelta(hours=6))
        if interval is None:
            return datetime.utcnow() + timedelta(days=30)  # Manual blocks sync monthly
        
        return datetime.utcnow() + interval
    
    async def _perform_calendar_sync(self, calendar_sync: BookingCalendarSync) -> Dict[str, Any]:
        """Perform actual calendar synchronization"""
        try:
            if not calendar_sync.calendar_url:
                raise CalendarSyncError("No calendar URL configured")
            
            # Download calendar data
            calendar_data = await self._download_calendar_data(calendar_sync.calendar_url)
            
            # Parse calendar events
            events = await self._parse_ical_data(calendar_data)
            
            # Process events for this property
            sync_result = await self._process_calendar_events(
                calendar_sync, events
            )
            
            return {
                'synced_events': len(events),
                'added_blocks': sync_result['added'],
                'updated_blocks': sync_result['updated'],
                'removed_blocks': sync_result['removed'],
                'sync_time': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Calendar sync error: {str(e)}")
            raise CalendarSyncError(f"Sync failed: {str(e)}")
    
    async def _download_calendar_data(self, url: str) -> str:
        """Download calendar data from URL"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=30) as response:
                    if response.status != 200:
                        raise CalendarSyncError(f"Failed to download calendar: HTTP {response.status}")
                    
                    return await response.text()
                    
        except aiohttp.ClientError as e:
            raise CalendarSyncError(f"Network error downloading calendar: {str(e)}")
    
    async def _parse_ical_data(self, ical_data: str) -> List[Dict[str, Any]]:
        """Parse iCal data and extract events"""
        events = []
        
        try:
            # Simple iCal parser (in production, use proper library like icalendar)
            current_event = None
            
            for line in ical_data.split('\n'):
                line = line.strip()
                
                if line == 'BEGIN:VEVENT':
                    current_event = {}
                    
                elif line == 'END:VEVENT' and current_event:
                    # Validate and add event
                    if self._validate_calendar_event(current_event):
                        events.append(current_event)
                    current_event = None
                    
                elif current_event and ':' in line:
                    key, value = line.split(':', 1)
                    
                    # Parse important fields
                    if key == 'DTSTART':
                        current_event['start_date'] = self._parse_ical_date(value)
                    elif key == 'DTEND':
                        current_event['end_date'] = self._parse_ical_date(value)
                    elif key == 'SUMMARY':
                        current_event['summary'] = value
                    elif key == 'UID':
                        current_event['uid'] = value
                    elif key == 'DESCRIPTION':
                        current_event['description'] = value
            
            logger.info(f"Parsed {len(events)} events from iCal data")
            return events
            
        except Exception as e:
            raise CalendarParsingError(f"Failed to parse iCal data: {str(e)}")
    
    def _parse_ical_date(self, date_str: str) -> date:
        """Parse iCal date format"""
        try:
            # Handle different date formats
            if 'T' in date_str:
                # DateTime format: 20231225T120000Z
                date_part = date_str.split('T')[0]
            else:
                # Date format: 20231225
                date_part = date_str
            
            # Parse YYYYMMDD format
            if len(date_part) == 8:
                year = int(date_part[:4])
                month = int(date_part[4:6])
                day = int(date_part[6:8])
                return date(year, month, day)
            
            raise ValueError(f"Unrecognized date format: {date_str}")
            
        except Exception as e:
            logger.warning(f"Failed to parse date {date_str}: {str(e)}")
            return date.today()
    
    def _validate_calendar_event(self, event: Dict[str, Any]) -> bool:
        """Validate calendar event has required fields"""
        required_fields = ['start_date', 'end_date', 'uid']
        
        for field in required_fields:
            if field not in event:
                return False
        
        # Validate date order
        if event['end_date'] <= event['start_date']:
            return False
        
        return True
    
    async def _process_calendar_events(
        self,
        calendar_sync: BookingCalendarSync,
        events: List[Dict[str, Any]]
    ) -> Dict[str, int]:
        """Process calendar events and update blocking records"""
        added = updated = removed = 0
        
        try:
            # Get existing external blocks for this calendar
            existing_blocks = await self._get_existing_external_blocks(calendar_sync.id)
            existing_uids = {block.external_booking_id: block for block in existing_blocks}
            
            # Process new/updated events
            current_uids = set()
            
            for event in events:
                uid = event['uid']
                current_uids.add(uid)
                
                # Prepare block data
                block_data = {
                    'external_booking_id': uid,
                    'external_check_in': event['start_date'],
                    'external_check_out': event['end_date'],
                    'external_guest_name': event.get('summary', 'External Booking'),
                    'last_sync_at': datetime.utcnow()
                }
                
                if uid in existing_uids:
                    # Update existing block
                    existing_block = existing_uids[uid]
                    
                    # Check if update needed
                    if (existing_block.external_check_in != event['start_date'] or
                        existing_block.external_check_out != event['end_date']):
                        
                        existing_block.external_check_in = event['start_date']
                        existing_block.external_check_out = event['end_date']
                        existing_block.external_guest_name = event.get('summary', 'External Booking')
                        existing_block.last_sync_at = datetime.utcnow()
                        updated += 1
                else:
                    # Create new block
                    new_block = BookingCalendarSync(
                        id=uuid4(),
                        property_id=calendar_sync.property_id,
                        calendar_sync_id=calendar_sync.id,
                        calendar_type=calendar_sync.calendar_type,
                        calendar_url=calendar_sync.calendar_url,
                        sync_status='active',
                        is_blocking=calendar_sync.auto_block_external,
                        **block_data
                    )
                    
                    self.db.add(new_block)
                    added += 1
            
            # Remove blocks that no longer exist in external calendar
            for uid, block in existing_uids.items():
                if uid not in current_uids:
                    block.sync_status = 'cancelled'
                    removed += 1
            
            return {
                'added': added,
                'updated': updated,
                'removed': removed
            }
            
        except Exception as e:
            logger.error(f"Error processing calendar events: {str(e)}")
            raise
    
    async def _get_existing_external_blocks(
        self,
        calendar_sync_id: UUID
    ) -> List[BookingCalendarSync]:
        """Get existing external blocks for calendar sync"""
        stmt = select(BookingCalendarSync).where(
            and_(
                BookingCalendarSync.calendar_sync_id == calendar_sync_id,
                BookingCalendarSync.sync_status == 'active'
            )
        )
        
        result = await self.db.execute(stmt)
        return result.scalars().all()
    
    async def _get_internal_bookings(
        self,
        property_id: UUID,
        start_date: date,
        end_date: date
    ) -> List[Booking]:
        """Get internal bookings for date range"""
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
    
    async def _get_external_blocks(
        self,
        property_id: UUID,
        start_date: date,
        end_date: date
    ) -> List[BookingCalendarSync]:
        """Get external calendar blocks for date range"""
        stmt = select(BookingCalendarSync).where(
            and_(
                BookingCalendarSync.property_id == property_id,
                BookingCalendarSync.calendar_type.in_([
                    'airbnb', 'vrbo', 'booking_com', 'ical'
                ]),
                BookingCalendarSync.sync_status == 'active',
                BookingCalendarSync.is_blocking == True,
                BookingCalendarSync.external_check_in < end_date,
                BookingCalendarSync.external_check_out > start_date
            )
        )
        
        result = await self.db.execute(stmt)
        return result.scalars().all()
    
    async def _get_manual_blocks(
        self,
        property_id: UUID,
        start_date: date,
        end_date: date
    ) -> List[BookingCalendarSync]:
        """Get manual blocks for date range"""
        stmt = select(BookingCalendarSync).where(
            and_(
                BookingCalendarSync.property_id == property_id,
                BookingCalendarSync.calendar_type == 'manual_block',
                BookingCalendarSync.sync_status == 'active',
                BookingCalendarSync.is_blocking == True,
                BookingCalendarSync.external_check_in < end_date,
                BookingCalendarSync.external_check_out > start_date
            )
        )
        
        result = await self.db.execute(stmt)
        return result.scalars().all()
    
    def _determine_availability_status(
        self,
        internal_booking: Optional[Booking],
        external_block: Optional[BookingCalendarSync],
        manual_block: Optional[BookingCalendarSync]
    ) -> str:
        """Determine availability status for a date"""
        if internal_booking:
            if internal_booking.status == BookingStatus.CONFIRMED:
                return 'booked'
            elif internal_booking.status == BookingStatus.CHECKED_IN:
                return 'occupied'
            elif internal_booking.status == BookingStatus.CHECKED_OUT:
                return 'checkout'
        
        elif external_block:
            return f'external_{external_block.calendar_type}'
        
        elif manual_block:
            return 'manually_blocked'
        
        return 'available'
    
    async def _get_date_pricing(self, property_id: UUID, target_date: date) -> Decimal:
        """Get pricing for specific date including seasonal adjustments"""
        # Base price (would come from property service)
        base_price = Decimal('100.00')
        
        # Get seasonal pricing rules
        stmt = select(BookingCalendarSync).where(
            and_(
                BookingCalendarSync.property_id == property_id,
                BookingCalendarSync.calendar_type == 'pricing_rule',
                BookingCalendarSync.sync_status == 'active',
                BookingCalendarSync.external_check_in <= target_date,
                BookingCalendarSync.external_check_out > target_date
            )
        )
        
        result = await self.db.execute(stmt)
        pricing_rules = result.scalars().all()
        
        final_price = base_price
        
        for rule in pricing_rules:
            if rule.notes and 'price_adjustment' in rule.notes:
                adjustment = Decimal(str(rule.notes['price_adjustment']))
                adjustment_type = rule.notes.get('adjustment_type', 'fixed')
                
                if adjustment_type == 'percentage':
                    final_price = final_price * (Decimal('1') + adjustment / Decimal('100'))
                else:  # fixed
                    final_price = final_price + adjustment
        
        return max(final_price, Decimal('0.01'))  # Minimum price
    
    async def _get_minimum_stay(self, property_id: UUID, target_date: date) -> int:
        """Get minimum stay requirement for specific date"""
        # Default minimum stay
        default_min_stay = 1
        
        # Get minimum stay rules
        stmt = select(BookingCalendarSync).where(
            and_(
                BookingCalendarSync.property_id == property_id,
                BookingCalendarSync.calendar_type == 'minimum_stay_rule',
                BookingCalendarSync.sync_status == 'active',
                BookingCalendarSync.external_check_in <= target_date,
                BookingCalendarSync.external_check_out > target_date
            )
        )
        
        result = await self.db.execute(stmt)
        stay_rules = result.scalars().all()
        
        # Return the highest minimum stay requirement
        max_min_stay = default_min_stay
        
        for rule in stay_rules:
            if rule.notes and 'minimum_stay' in rule.notes:
                rule_min_stay = rule.notes['minimum_stay']
                max_min_stay = max(max_min_stay, rule_min_stay)
        
        return max_min_stay
    
    async def _get_sync_status_summary(self, property_id: UUID) -> Dict[str, Any]:
        """Get sync status summary for property"""
        stmt = select(BookingCalendarSync).where(
            and_(
                BookingCalendarSync.property_id == property_id,
                BookingCalendarSync.calendar_url.isnot(None)
            )
        )
        
        result = await self.db.execute(stmt)
        syncs = result.scalars().all()
        
        status_summary = {
            'total_syncs': len(syncs),
            'active_syncs': sum(1 for s in syncs if s.sync_status == 'active'),
            'error_syncs': sum(1 for s in syncs if s.sync_status == 'error'),
            'last_sync': None,
            'next_sync': None
        }
        
        if syncs:
            last_synced = max(
                (s for s in syncs if s.last_sync_at),
                key=lambda s: s.last_sync_at,
                default=None
            )
            
            if last_synced:
                status_summary['last_sync'] = last_synced.last_sync_at
            
            next_sync = min(
                (s for s in syncs if s.next_sync_at and s.sync_status == 'active'),
                key=lambda s: s.next_sync_at,
                default=None
            )
            
            if next_sync:
                status_summary['next_sync'] = next_sync.next_sync_at
        
        return status_summary


# Utility functions for calendar management

async def run_scheduled_calendar_sync(db_session: AsyncSession) -> Dict[str, Any]:
    """Run scheduled calendar synchronization (for cron jobs)"""
    calendar_service = CalendarManagementService(db_session)
    return await calendar_service.sync_all_active_calendars()


async def cleanup_old_calendar_data(
    db_session: AsyncSession,
    days_to_keep: int = 90
) -> int:
    """Clean up old calendar sync data"""
    try:
        cutoff_date = datetime.utcnow() - timedelta(days=days_to_keep)
        
        # Delete old external blocks
        stmt = delete(BookingCalendarSync).where(
            and_(
                BookingCalendarSync.calendar_type.in_([
                    'airbnb', 'vrbo', 'booking_com', 'ical'
                ]),
                BookingCalendarSync.external_check_out < cutoff_date.date(),
                BookingCalendarSync.sync_status == 'cancelled'
            )
        )
        
        result = await db_session.execute(stmt)
        deleted_count = result.rowcount
        
        await db_session.commit()
        
        logger.info(f"Cleaned up {deleted_count} old calendar sync records")
        return deleted_count
        
    except Exception as e:
        logger.error(f"Error cleaning up calendar data: {str(e)}")
        await db_session.rollback()
        return 0


async def validate_calendar_integrations(db_session: AsyncSession) -> Dict[str, Any]:
    """Validate all calendar integrations"""
    try:
        stmt = select(BookingCalendarSync).where(
            and_(
                BookingCalendarSync.sync_status == 'active',
                BookingCalendarSync.calendar_url.isnot(None)
            )
        )
        
        result = await db_session.execute(stmt)
        calendar_syncs = result.scalars().all()
        
        validation_results = {
            'total_calendars': len(calendar_syncs),
            'valid_calendars': 0,
            'invalid_calendars': 0,
            'details': []
        }
        
        calendar_service = CalendarManagementService(db_session)
        
        for sync in calendar_syncs:
            try:
                # Validate URL accessibility
                is_valid = await calendar_service._validate_calendar_url(sync.calendar_url)
                
                if is_valid:
                    validation_results['valid_calendars'] += 1
                    status = 'valid'
                else:
                    validation_results['invalid_calendars'] += 1
                    status = 'invalid'
                    sync.sync_status = 'error'
                    sync.last_error = 'Calendar URL is not accessible'
                
                validation_results['details'].append({
                    'calendar_id': sync.id,
                    'property_id': sync.property_id,
                    'calendar_type': sync.calendar_type,
                    'url': sync.calendar_url,
                    'status': status
                })
                
            except Exception as e:
                validation_results['invalid_calendars'] += 1
                sync.sync_status = 'error'
                sync.last_error = str(e)
                
                validation_results['details'].append({
                    'calendar_id': sync.id,
                    'property_id': sync.property_id,
                    'calendar_type': sync.calendar_type,
                    'url': sync.calendar_url,
                    'status': 'error',
                    'error': str(e)
                })
        
        await db_session.commit()
        
        logger.info(f"Calendar validation completed: {validation_results['valid_calendars']} valid, {validation_results['invalid_calendars']} invalid")
        
        return validation_results
        
    except Exception as e:
        logger.error(f"Error validating calendar integrations: {str(e)}")
        await db_session.rollback()
        raise