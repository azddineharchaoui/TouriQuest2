"""Comprehensive Pydantic schemas for booking system"""

from datetime import datetime, date, timedelta
from typing import Optional, List, Dict, Any, Union
from decimal import Decimal
from enum import Enum
import re
from pydantic import BaseModel, Field, validator, root_validator
from pydantic.types import UUID4, EmailStr, constr, conint, condecimal

from app.models.booking_models import (
    BookingStatus, BookingType, PaymentStatus, CancellationPolicyType,
    RefundType, ModificationType, AvailabilityLockStatus
)


# Base configuration for all schemas
class BookingBaseModel(BaseModel):
    class Config:
        orm_mode = True
        use_enum_values = True
        validate_assignment = True
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            date: lambda v: v.isoformat(),
            Decimal: lambda v: float(v)
        }


# Guest Information Schema
class GuestInfoRequest(BookingBaseModel):
    """Guest information for booking"""
    guest_name: constr(min_length=2, max_length=255) = Field(..., description="Full name of guest")
    guest_email: EmailStr = Field(..., description="Guest email address")
    guest_phone: Optional[constr(regex=r'^\+?1?\d{9,15}$')] = Field(None, description="Guest phone number")
    
    @validator('guest_name')
    def validate_guest_name(cls, v):
        if not re.match(r'^[a-zA-Z\s\-\'\.]+$', v):
            raise ValueError('Guest name must contain only letters, spaces, hyphens, apostrophes, and periods')
        return v.strip()


# Booking Creation Schema
class BookingCreateRequest(BookingBaseModel):
    """Request schema for creating a new booking"""
    
    # Property and dates
    property_id: UUID4 = Field(..., description="Property UUID")
    check_in_date: date = Field(..., description="Check-in date")
    check_out_date: date = Field(..., description="Check-out date")
    
    # Guest details
    number_of_guests: conint(ge=1, le=50) = Field(..., description="Total number of guests")
    adults: conint(ge=1, le=50) = Field(..., description="Number of adult guests")
    children: conint(ge=0, le=20) = Field(0, description="Number of children")
    infants: conint(ge=0, le=10) = Field(0, description="Number of infants")
    pets: conint(ge=0, le=10) = Field(0, description="Number of pets")
    
    # Guest information
    guest_info: GuestInfoRequest = Field(..., description="Guest contact information")
    
    # Booking preferences
    booking_type: BookingType = Field(BookingType.REQUEST, description="Instant book or request approval")
    special_requests: Optional[constr(max_length=2000)] = Field(None, description="Special requests from guest")
    
    # Payment preferences
    currency: constr(regex=r'^[A-Z]{3}$') = Field("USD", description="Currency code (ISO 4217)")
    
    # Metadata
    booking_source: Optional[str] = Field("web", description="Source of booking (web, mobile, api)")
    timezone: Optional[str] = Field(None, description="Guest timezone")
    
    @validator('check_out_date')
    def validate_checkout_after_checkin(cls, v, values):
        if 'check_in_date' in values and v <= values['check_in_date']:
            raise ValueError('Check-out date must be after check-in date')
        return v
    
    @validator('check_in_date')
    def validate_checkin_not_past(cls, v):
        if v < date.today():
            raise ValueError('Check-in date cannot be in the past')
        return v
    
    @root_validator
    def validate_guest_counts(cls, values):
        total_guests = values.get('number_of_guests', 0)
        adults = values.get('adults', 0)
        children = values.get('children', 0)
        infants = values.get('infants', 0)
        
        # Infants don't count toward guest limit typically
        counted_guests = adults + children
        if counted_guests != total_guests:
            raise ValueError('Number of guests must equal adults + children')
        
        if adults == 0:
            raise ValueError('At least one adult guest is required')
        
        return values


# Pricing Information Schema
class PricingBreakdown(BookingBaseModel):
    """Detailed pricing breakdown for a booking"""
    base_price: condecimal(ge=0, decimal_places=2) = Field(..., description="Base accommodation price")
    cleaning_fee: condecimal(ge=0, decimal_places=2) = Field(0, description="Cleaning fee")
    service_fee: condecimal(ge=0, decimal_places=2) = Field(0, description="Platform service fee")
    tax_amount: condecimal(ge=0, decimal_places=2) = Field(0, description="Tax amount")
    security_deposit: condecimal(ge=0, decimal_places=2) = Field(0, description="Security deposit")
    total_amount: condecimal(ge=0, decimal_places=2) = Field(..., description="Total booking amount")
    currency: constr(regex=r'^[A-Z]{3}$') = Field("USD", description="Currency code")
    
    # Additional fee breakdown
    extra_guest_fees: condecimal(ge=0, decimal_places=2) = Field(0, description="Extra guest fees")
    pet_fees: condecimal(ge=0, decimal_places=2) = Field(0, description="Pet fees")
    resort_fees: condecimal(ge=0, decimal_places=2) = Field(0, description="Resort or destination fees")
    
    @validator('total_amount')
    def validate_total_amount(cls, v, values):
        expected_total = (
            values.get('base_price', 0) +
            values.get('cleaning_fee', 0) +
            values.get('service_fee', 0) +
            values.get('tax_amount', 0) +
            values.get('extra_guest_fees', 0) +
            values.get('pet_fees', 0) +
            values.get('resort_fees', 0)
        )
        if abs(float(v) - float(expected_total)) > 0.01:
            raise ValueError('Total amount does not match sum of individual fees')
        return v


# Booking Response Schema
class BookingResponse(BookingBaseModel):
    """Complete booking information response"""
    
    # Basic booking info
    id: UUID4
    booking_number: str
    property_id: UUID4
    guest_id: UUID4
    host_id: UUID4
    
    # Dates and guests
    check_in_date: date
    check_out_date: date
    number_of_guests: int
    adults: int
    children: int
    infants: int
    pets: int
    nights: int
    
    # Booking details
    booking_type: BookingType
    status: BookingStatus
    
    # Guest information
    guest_name: str
    guest_email: str
    guest_phone: Optional[str]
    
    # Pricing
    pricing: PricingBreakdown
    
    # Cancellation policy
    cancellation_policy: CancellationPolicyType
    cancellation_deadline: Optional[datetime]
    can_be_cancelled: bool
    
    # Special requests and notes
    special_requests: Optional[str]
    host_notes: Optional[str]
    
    # Workflow information
    auto_confirm: bool
    host_response_deadline: Optional[datetime]
    
    # Timestamps
    created_at: datetime
    updated_at: datetime
    confirmed_at: Optional[datetime]
    cancelled_at: Optional[datetime]
    completed_at: Optional[datetime]
    
    # Status flags
    is_active: bool


# Booking List Response Schema
class BookingListItem(BookingBaseModel):
    """Simplified booking information for list views"""
    id: UUID4
    booking_number: str
    property_id: UUID4
    property_title: Optional[str]
    property_image_url: Optional[str]
    
    check_in_date: date
    check_out_date: date
    nights: int
    number_of_guests: int
    
    status: BookingStatus
    total_amount: Decimal
    currency: str
    
    guest_name: str
    created_at: datetime
    
    # Quick status indicators
    requires_action: bool = Field(False, description="Requires host/guest action")
    is_upcoming: bool = Field(False, description="Upcoming booking")


class BookingListResponse(BookingBaseModel):
    """Paginated list of bookings"""
    bookings: List[BookingListItem]
    total_count: int
    page: int
    per_page: int
    has_next: bool
    has_previous: bool


# Booking Status Update Schema
class BookingStatusUpdateRequest(BookingBaseModel):
    """Request to update booking status"""
    status: BookingStatus = Field(..., description="New booking status")
    notes: Optional[constr(max_length=1000)] = Field(None, description="Status change notes")
    notify_guest: bool = Field(True, description="Send notification to guest")
    notify_host: bool = Field(True, description="Send notification to host")


# Booking Modification Schemas
class BookingModificationRequest(BookingBaseModel):
    """Request for booking modification"""
    modification_type: ModificationType = Field(..., description="Type of modification")
    reason: constr(max_length=1000) = Field(..., description="Reason for modification")
    
    # Date changes
    new_check_in_date: Optional[date] = Field(None, description="New check-in date")
    new_check_out_date: Optional[date] = Field(None, description="New check-out date")
    
    # Guest count changes
    new_number_of_guests: Optional[conint(ge=1, le=50)] = Field(None, description="New guest count")
    new_adults: Optional[conint(ge=1, le=50)] = Field(None, description="New adult count")
    new_children: Optional[conint(ge=0, le=20)] = Field(None, description="New children count")
    new_infants: Optional[conint(ge=0, le=10)] = Field(None, description="New infant count")
    new_pets: Optional[conint(ge=0, le=10)] = Field(None, description="New pet count")
    
    # Special requests
    new_special_requests: Optional[constr(max_length=2000)] = Field(None, description="Updated special requests")
    
    @root_validator
    def validate_modification_data(cls, values):
        mod_type = values.get('modification_type')
        
        if mod_type == ModificationType.DATE_CHANGE:
            if not values.get('new_check_in_date') and not values.get('new_check_out_date'):
                raise ValueError('Date change requires new check-in or check-out date')
        
        elif mod_type == ModificationType.GUEST_COUNT_CHANGE:
            if not values.get('new_number_of_guests'):
                raise ValueError('Guest count change requires new guest count')
        
        return values


class BookingModificationResponse(BookingBaseModel):
    """Response for booking modification request"""
    id: UUID4
    booking_id: UUID4
    modification_type: ModificationType
    status: str
    reason: str
    
    original_data: Dict[str, Any]
    requested_data: Dict[str, Any]
    
    price_difference: Decimal
    additional_fees: Decimal
    refund_amount: Decimal
    
    deadline: Optional[datetime]
    created_at: datetime


# Cancellation Schemas
class BookingCancellationRequest(BookingBaseModel):
    """Request to cancel a booking"""
    reason: constr(max_length=1000) = Field(..., description="Reason for cancellation")
    is_extenuating_circumstances: bool = Field(False, description="Claim extenuating circumstances")
    supporting_documents: Optional[List[str]] = Field(None, description="Supporting document URLs")


class RefundCalculation(BookingBaseModel):
    """Refund calculation details"""
    refund_type: RefundType
    refund_amount: Decimal
    refund_percentage: int
    service_fee_refund: Decimal
    cleaning_fee_refund: Decimal
    total_refund: Decimal
    
    reason: str
    policy_details: str
    processing_time_days: int


class BookingCancellationResponse(BookingBaseModel):
    """Response for booking cancellation"""
    booking_id: UUID4
    cancellation_id: UUID4
    status: str
    refund_calculation: RefundCalculation
    estimated_refund_date: date
    cancellation_confirmed: bool


# Payment Schemas
class PaymentMethodRequest(BookingBaseModel):
    """Payment method information"""
    payment_method_type: str = Field(..., description="Type: card, bank_transfer, paypal")
    
    # Card information (for Stripe)
    stripe_payment_method_id: Optional[str] = Field(None, description="Stripe Payment Method ID")
    
    # Bank transfer information
    bank_account_info: Optional[Dict[str, Any]] = Field(None, description="Bank account details")
    
    # Additional payment data
    billing_address: Optional[Dict[str, str]] = Field(None, description="Billing address")
    save_payment_method: bool = Field(False, description="Save for future use")


class PaymentProcessRequest(BookingBaseModel):
    """Request to process payment for booking"""
    booking_id: UUID4 = Field(..., description="Booking to process payment for")
    payment_method: PaymentMethodRequest = Field(..., description="Payment method details")
    payment_type: str = Field("booking", description="Type: booking, security_deposit")
    
    # Payment confirmation
    confirm_payment: bool = Field(False, description="Immediately confirm payment")
    return_url: Optional[str] = Field(None, description="Return URL for 3D Secure")


class PaymentResponse(BookingBaseModel):
    """Payment processing response"""
    payment_id: UUID4
    booking_id: UUID4
    amount: Decimal
    currency: str
    status: PaymentStatus
    
    # Stripe integration
    stripe_payment_intent_id: Optional[str]
    client_secret: Optional[str]  # For frontend confirmation
    
    # Payment splitting
    host_payout: Decimal
    platform_fee: Decimal
    
    # Status information
    requires_action: bool = Field(False, description="Requires additional action (3D Secure)")
    next_action: Optional[Dict[str, Any]] = Field(None, description="Next action details")
    
    created_at: datetime


# Availability Lock Schemas
class AvailabilityLockRequest(BookingBaseModel):
    """Request to lock availability during booking process"""
    property_id: UUID4 = Field(..., description="Property to lock")
    check_in_date: date = Field(..., description="Check-in date")
    check_out_date: date = Field(..., description="Check-out date")
    session_id: Optional[str] = Field(None, description="User session identifier")
    lock_duration_minutes: int = Field(15, ge=5, le=60, description="Lock duration in minutes")


class AvailabilityLockResponse(BookingBaseModel):
    """Response for availability lock"""
    lock_id: UUID4
    property_id: UUID4
    check_in_date: date
    check_out_date: date
    expires_at: datetime
    status: AvailabilityLockStatus
    can_proceed: bool = Field(True, description="Can proceed with booking")


# Availability Check Schemas
class AvailabilityCheckRequest(BookingBaseModel):
    """Request to check property availability"""
    property_id: UUID4 = Field(..., description="Property to check")
    check_in_date: date = Field(..., description="Check-in date")
    check_out_date: date = Field(..., description="Check-out date")
    number_of_guests: conint(ge=1, le=50) = Field(..., description="Number of guests")
    
    @validator('check_out_date')
    def validate_checkout_after_checkin(cls, v, values):
        if 'check_in_date' in values and v <= values['check_in_date']:
            raise ValueError('Check-out date must be after check-in date')
        return v


class AvailabilityCheckResponse(BookingBaseModel):
    """Response for availability check"""
    property_id: UUID4
    check_in_date: date
    check_out_date: date
    is_available: bool
    
    # Pricing information
    base_price_per_night: Decimal
    total_base_price: Decimal
    estimated_total: Decimal
    currency: str
    
    # Availability details
    available_for_instant_book: bool
    requires_approval: bool
    minimum_stay_nights: int
    maximum_stay_nights: Optional[int]
    
    # Restrictions
    restrictions: List[str] = Field(default_factory=list, description="Booking restrictions")
    unavailable_dates: List[date] = Field(default_factory=list, description="Unavailable dates in range")
    
    # Policy information
    cancellation_policy: CancellationPolicyType
    house_rules: List[str] = Field(default_factory=list)


# Group Booking Schemas
class GroupBookingCreateRequest(BookingBaseModel):
    """Request to create a group booking"""
    group_name: constr(min_length=2, max_length=255) = Field(..., description="Group name")
    property_id: UUID4 = Field(..., description="Property for group booking")
    check_in_date: date = Field(..., description="Check-in date")
    check_out_date: date = Field(..., description="Check-out date")
    
    total_participants: conint(ge=2, le=100) = Field(..., description="Total expected participants")
    min_participants: conint(ge=1, le=50) = Field(..., description="Minimum participants to confirm")
    
    booking_deadline: datetime = Field(..., description="Deadline for individual bookings")
    payment_deadline: datetime = Field(..., description="Payment deadline")
    
    special_requirements: Optional[constr(max_length=2000)] = Field(None, description="Group requirements")
    group_discount_requested: bool = Field(False, description="Request group discount")


class GroupBookingParticipant(BookingBaseModel):
    """Group booking participant information"""
    user_id: UUID4
    participant_name: str
    participant_email: EmailStr
    booking_status: str  # registered, confirmed, paid, cancelled
    individual_booking_id: Optional[UUID4]
    joined_at: datetime


class GroupBookingResponse(BookingBaseModel):
    """Group booking information"""
    id: UUID4
    group_name: str
    group_leader_id: UUID4
    property_id: UUID4
    
    check_in_date: date
    check_out_date: date
    total_participants: int
    confirmed_participants: int
    min_participants: int
    
    status: str  # collecting, confirmed, cancelled
    booking_deadline: datetime
    payment_deadline: datetime
    
    individual_price: Decimal
    group_discount_percentage: Decimal
    total_group_price: Decimal
    currency: str
    
    participants: List[GroupBookingParticipant]
    created_at: datetime


# Search and Filter Schemas
class BookingSearchFilters(BookingBaseModel):
    """Filters for booking search"""
    status: Optional[List[BookingStatus]] = Field(None, description="Filter by status")
    property_id: Optional[UUID4] = Field(None, description="Filter by property")
    guest_id: Optional[UUID4] = Field(None, description="Filter by guest")
    host_id: Optional[UUID4] = Field(None, description="Filter by host")
    
    check_in_from: Optional[date] = Field(None, description="Check-in date from")
    check_in_to: Optional[date] = Field(None, description="Check-in date to")
    
    created_from: Optional[datetime] = Field(None, description="Created date from")
    created_to: Optional[datetime] = Field(None, description="Created date to")
    
    min_amount: Optional[Decimal] = Field(None, description="Minimum booking amount")
    max_amount: Optional[Decimal] = Field(None, description="Maximum booking amount")
    
    booking_type: Optional[BookingType] = Field(None, description="Filter by booking type")


class BookingSearchRequest(BookingBaseModel):
    """Request for booking search"""
    filters: Optional[BookingSearchFilters] = Field(None, description="Search filters")
    sort_by: str = Field("created_at", description="Sort field")
    sort_order: str = Field("desc", regex=r'^(asc|desc)$', description="Sort order")
    page: conint(ge=1) = Field(1, description="Page number")
    per_page: conint(ge=1, le=100) = Field(20, description="Items per page")


# Webhook Schemas
class WebhookEvent(BookingBaseModel):
    """Webhook event data"""
    event_type: str = Field(..., description="Type of webhook event")
    event_id: str = Field(..., description="Unique event identifier")
    created_at: datetime = Field(..., description="Event timestamp")
    data: Dict[str, Any] = Field(..., description="Event data")


class StripeWebhookEvent(BookingBaseModel):
    """Stripe webhook event data"""
    id: str
    object: str = "event"
    api_version: str
    created: int
    data: Dict[str, Any]
    livemode: bool
    pending_webhooks: int
    request: Optional[Dict[str, str]]
    type: str


# Calendar Sync Schemas
class CalendarSyncRequest(BookingBaseModel):
    """Request to sync external calendar"""
    property_id: UUID4 = Field(..., description="Property to sync")
    calendar_type: str = Field(..., description="Calendar type: airbnb, vrbo, ical")
    calendar_url: Optional[str] = Field(None, description="iCal URL for sync")
    is_two_way_sync: bool = Field(False, description="Enable two-way synchronization")
    auto_block_external: bool = Field(True, description="Auto-block external bookings")


class CalendarSyncResponse(BookingBaseModel):
    """Calendar sync configuration response"""
    id: UUID4
    property_id: UUID4
    calendar_type: str
    is_two_way_sync: bool
    sync_status: str
    last_sync_at: Optional[datetime]
    next_sync_at: Optional[datetime]
    created_at: datetime


# Error Schemas
class BookingError(BookingBaseModel):
    """Booking-specific error response"""
    error_code: str = Field(..., description="Error code")
    error_message: str = Field(..., description="Human-readable error message")
    error_details: Optional[Dict[str, Any]] = Field(None, description="Additional error details")
    booking_id: Optional[UUID4] = Field(None, description="Related booking ID")
    suggested_actions: List[str] = Field(default_factory=list, description="Suggested next steps")


# Validation Schemas
class BookingValidationResponse(BookingBaseModel):
    """Booking validation response"""
    is_valid: bool = Field(..., description="Whether booking is valid")
    validation_errors: List[str] = Field(default_factory=list, description="Validation error messages")
    warnings: List[str] = Field(default_factory=list, description="Validation warnings")
    estimated_total: Optional[Decimal] = Field(None, description="Estimated total if valid")


# Analytics Schemas
class BookingAnalytics(BookingBaseModel):
    """Booking analytics data"""
    total_bookings: int
    confirmed_bookings: int
    cancelled_bookings: int
    total_revenue: Decimal
    average_booking_value: Decimal
    occupancy_rate: float
    
    # Time-based metrics
    period_start: date
    period_end: date
    
    # Performance metrics
    confirmation_rate: float
    cancellation_rate: float
    average_lead_time_days: int