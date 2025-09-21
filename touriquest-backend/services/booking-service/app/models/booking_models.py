"""Comprehensive booking system database models"""

import uuid
from datetime import datetime, date, timedelta
from typing import Optional, Dict, List, Any
from decimal import Decimal
from enum import Enum
import sqlalchemy as sa
from sqlalchemy import Column, String, DateTime, Boolean, Integer, Text, JSON, Numeric, Date, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.ext.hybrid import hybrid_property

Base = declarative_base()


class BookingStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    COMPLETED = "completed"
    NO_SHOW = "no_show"
    REFUNDED = "refunded"


class BookingType(str, Enum):
    INSTANT = "instant"
    REQUEST = "request"


class PaymentStatus(str, Enum):
    PENDING = "pending"
    AUTHORIZED = "authorized"
    CAPTURED = "captured"
    FAILED = "failed"
    REFUNDED = "refunded"
    PARTIALLY_REFUNDED = "partially_refunded"


class CancellationPolicyType(str, Enum):
    FLEXIBLE = "flexible"
    MODERATE = "moderate"
    STRICT = "strict"
    SUPER_STRICT = "super_strict"
    NON_REFUNDABLE = "non_refundable"


class RefundType(str, Enum):
    FULL = "full"
    PARTIAL = "partial"
    NO_REFUND = "no_refund"


class ModificationType(str, Enum):
    DATE_CHANGE = "date_change"
    GUEST_COUNT_CHANGE = "guest_count_change"
    CANCELLATION = "cancellation"
    SPECIAL_REQUEST = "special_request"
    HOST_MODIFICATION = "host_modification"


class AvailabilityLockStatus(str, Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    RELEASED = "released"


class Booking(Base):
    """Core booking model with comprehensive booking information"""
    __tablename__ = "bookings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    booking_number = Column(String(20), unique=True, nullable=False, index=True)
    
    # References
    property_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    guest_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    host_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    
    # Booking details
    check_in_date = Column(Date, nullable=False, index=True)
    check_out_date = Column(Date, nullable=False, index=True)
    number_of_guests = Column(Integer, nullable=False)
    adults = Column(Integer, nullable=False)
    children = Column(Integer, default=0)
    infants = Column(Integer, default=0)
    pets = Column(Integer, default=0)
    
    # Booking configuration
    booking_type = Column(sa.Enum(BookingType), nullable=False, default=BookingType.REQUEST)
    status = Column(sa.Enum(BookingStatus), nullable=False, default=BookingStatus.PENDING, index=True)
    
    # Pricing breakdown
    base_price = Column(Numeric(10, 2), nullable=False)
    cleaning_fee = Column(Numeric(10, 2), default=0)
    service_fee = Column(Numeric(10, 2), default=0)
    tax_amount = Column(Numeric(10, 2), default=0)
    security_deposit = Column(Numeric(10, 2), default=0)
    total_amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), nullable=False, default="USD")
    
    # Guest information
    guest_email = Column(String(255), nullable=False)
    guest_phone = Column(String(20))
    guest_name = Column(String(255), nullable=False)
    
    # Special requests and notes
    special_requests = Column(Text)
    host_notes = Column(Text)
    internal_notes = Column(Text)
    
    # Cancellation policy
    cancellation_policy = Column(sa.Enum(CancellationPolicyType), nullable=False)
    cancellation_deadline = Column(DateTime)
    
    # Booking workflow
    request_message = Column(Text)
    host_response_deadline = Column(DateTime)
    auto_confirm = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    confirmed_at = Column(DateTime)
    cancelled_at = Column(DateTime)
    completed_at = Column(DateTime)
    
    # Additional metadata
    booking_source = Column(String(50), default="web")  # web, mobile, api
    user_agent = Column(String(500))
    ip_address = Column(String(45))
    timezone = Column(String(50))
    
    # Relationships
    payments = relationship("BookingPayment", back_populates="booking", cascade="all, delete-orphan")
    modifications = relationship("BookingModification", back_populates="booking", cascade="all, delete-orphan")
    availability_locks = relationship("AvailabilityLock", back_populates="booking")
    reviews = relationship("BookingReview", back_populates="booking")
    notifications = relationship("BookingNotification", back_populates="booking")

    # Indexes
    __table_args__ = (
        Index('idx_booking_dates', 'property_id', 'check_in_date', 'check_out_date'),
        Index('idx_booking_guest_status', 'guest_id', 'status'),
        Index('idx_booking_host_status', 'host_id', 'status'),
        Index('idx_booking_created', 'created_at'),
    )

    @hybrid_property
    def nights(self):
        """Calculate number of nights"""
        return (self.check_out_date - self.check_in_date).days

    @hybrid_property
    def is_active(self):
        """Check if booking is currently active"""
        return self.status in [BookingStatus.CONFIRMED] and \
               self.check_in_date <= date.today() <= self.check_out_date

    @hybrid_property
    def can_be_cancelled(self):
        """Check if booking can still be cancelled"""
        if self.status not in [BookingStatus.PENDING, BookingStatus.CONFIRMED]:
            return False
        if self.cancellation_deadline and datetime.utcnow() > self.cancellation_deadline:
            return False
        return True

    def __repr__(self):
        return f"<Booking {self.booking_number} - {self.status}>"


class BookingPayment(Base):
    """Payment processing and tracking for bookings"""
    __tablename__ = "booking_payments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    booking_id = Column(UUID(as_uuid=True), ForeignKey("bookings.id"), nullable=False, index=True)
    
    # Payment details
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), nullable=False)
    payment_type = Column(String(50), nullable=False)  # booking, security_deposit, additional_fee
    
    # Stripe integration
    stripe_payment_intent_id = Column(String(255), index=True)
    stripe_charge_id = Column(String(255), index=True)
    stripe_account_id = Column(String(255))  # Connected account for host
    
    # Payment status and flow
    status = Column(sa.Enum(PaymentStatus), nullable=False, default=PaymentStatus.PENDING, index=True)
    payment_method = Column(String(50))  # card, bank_transfer, paypal, etc.
    
    # Payment splitting
    platform_fee = Column(Numeric(10, 2), default=0)
    host_payout = Column(Numeric(10, 2), nullable=False)
    tax_amount = Column(Numeric(10, 2), default=0)
    
    # Processing details
    processor = Column(String(50), default="stripe")
    transaction_id = Column(String(255), index=True)
    authorization_code = Column(String(100))
    
    # Refund information
    refunded_amount = Column(Numeric(10, 2), default=0)
    refund_reason = Column(String(255))
    refund_processed_at = Column(DateTime)
    
    # Failure handling
    failure_reason = Column(String(500))
    retry_count = Column(Integer, default=0)
    last_retry_at = Column(DateTime)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    authorized_at = Column(DateTime)
    captured_at = Column(DateTime)
    
    # Relationships
    booking = relationship("Booking", back_populates="payments")
    refunds = relationship("PaymentRefund", back_populates="payment")

    # Indexes
    __table_args__ = (
        Index('idx_payment_booking_status', 'booking_id', 'status'),
        Index('idx_payment_stripe_intent', 'stripe_payment_intent_id'),
        Index('idx_payment_created', 'created_at'),
    )

    def __repr__(self):
        return f"<BookingPayment {self.id} - {self.status} - {self.amount} {self.currency}>"


class PaymentRefund(Base):
    """Refund processing and tracking"""
    __tablename__ = "payment_refunds"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    payment_id = Column(UUID(as_uuid=True), ForeignKey("booking_payments.id"), nullable=False)
    
    # Refund details
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), nullable=False)
    refund_type = Column(sa.Enum(RefundType), nullable=False)
    reason = Column(String(500), nullable=False)
    
    # Processing information
    stripe_refund_id = Column(String(255), index=True)
    status = Column(String(50), nullable=False, default="pending")
    processed_at = Column(DateTime)
    
    # Admin details
    processed_by = Column(UUID(as_uuid=True))  # Admin user ID
    admin_notes = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    payment = relationship("BookingPayment", back_populates="refunds")

    def __repr__(self):
        return f"<PaymentRefund {self.id} - {self.amount} {self.currency}>"


class AvailabilityLock(Base):
    """Real-time availability locking during booking process"""
    __tablename__ = "availability_locks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Lock details
    property_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    booking_id = Column(UUID(as_uuid=True), ForeignKey("bookings.id"), nullable=True)
    
    # Date range
    check_in_date = Column(Date, nullable=False)
    check_out_date = Column(Date, nullable=False)
    
    # Lock management
    status = Column(sa.Enum(AvailabilityLockStatus), nullable=False, default=AvailabilityLockStatus.ACTIVE)
    expires_at = Column(DateTime, nullable=False, index=True)
    session_id = Column(String(255), index=True)
    
    # Lock metadata
    lock_reason = Column(String(100), default="booking_in_progress")
    user_agent = Column(String(500))
    ip_address = Column(String(45))
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    released_at = Column(DateTime)
    
    # Relationships
    booking = relationship("Booking", back_populates="availability_locks")

    # Indexes
    __table_args__ = (
        Index('idx_availability_lock_property_dates', 'property_id', 'check_in_date', 'check_out_date'),
        Index('idx_availability_lock_expires', 'expires_at'),
        Index('idx_availability_lock_status', 'status'),
    )

    @hybrid_property
    def is_expired(self):
        """Check if lock has expired"""
        return datetime.utcnow() > self.expires_at

    def __repr__(self):
        return f"<AvailabilityLock {self.id} - {self.property_id} - {self.status}>"


class BookingModification(Base):
    """Track all booking modifications and changes"""
    __tablename__ = "booking_modifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    booking_id = Column(UUID(as_uuid=True), ForeignKey("bookings.id"), nullable=False, index=True)
    
    # Modification details
    modification_type = Column(sa.Enum(ModificationType), nullable=False)
    requested_by = Column(UUID(as_uuid=True), nullable=False)  # User ID who requested
    approved_by = Column(UUID(as_uuid=True))  # User ID who approved
    
    # Change data
    original_data = Column(JSON)  # Original booking data
    requested_data = Column(JSON)  # Requested changes
    approved_data = Column(JSON)  # Final approved changes
    
    # Status and workflow
    status = Column(String(50), nullable=False, default="pending")  # pending, approved, rejected, applied
    reason = Column(Text)
    rejection_reason = Column(Text)
    
    # Financial impact
    price_difference = Column(Numeric(10, 2), default=0)
    additional_fees = Column(Numeric(10, 2), default=0)
    refund_amount = Column(Numeric(10, 2), default=0)
    
    # Timing
    deadline = Column(DateTime)  # Deadline for approval
    applied_at = Column(DateTime)  # When modification was applied
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    booking = relationship("Booking", back_populates="modifications")

    # Indexes
    __table_args__ = (
        Index('idx_modification_booking_status', 'booking_id', 'status'),
        Index('idx_modification_type', 'modification_type'),
        Index('idx_modification_created', 'created_at'),
    )

    def __repr__(self):
        return f"<BookingModification {self.id} - {self.modification_type} - {self.status}>"


class CancellationPolicy(Base):
    """Detailed cancellation policies for properties"""
    __tablename__ = "cancellation_policies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    
    # Policy configuration
    policy_type = Column(sa.Enum(CancellationPolicyType), nullable=False)
    policy_name = Column(String(100), nullable=False)
    description = Column(Text)
    
    # Refund rules
    full_refund_days = Column(Integer, default=0)  # Days before check-in for full refund
    partial_refund_days = Column(Integer, default=0)  # Days before check-in for partial refund
    partial_refund_percentage = Column(Integer, default=50)  # Percentage for partial refund
    
    # Special conditions
    no_refund_period_days = Column(Integer, default=1)  # No refund within X days
    service_fee_refundable = Column(Boolean, default=False)
    cleaning_fee_refundable = Column(Boolean, default=True)
    
    # Exceptions and special rules
    extenuating_circumstances = Column(Boolean, default=True)
    covid_flexibility = Column(Boolean, default=False)
    weather_exceptions = Column(Boolean, default=False)
    
    # Policy metadata
    is_active = Column(Boolean, default=True)
    effective_from = Column(DateTime, default=datetime.utcnow)
    effective_until = Column(DateTime)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def calculate_refund(self, booking, cancellation_date: datetime) -> Dict[str, Any]:
        """Calculate refund amount based on policy and cancellation timing"""
        days_before_checkin = (booking.check_in_date - cancellation_date.date()).days
        
        refund_info = {
            "refund_type": RefundType.NO_REFUND,
            "refund_amount": Decimal('0.00'),
            "refund_percentage": 0,
            "service_fee_refund": Decimal('0.00'),
            "cleaning_fee_refund": Decimal('0.00'),
            "total_refund": Decimal('0.00')
        }
        
        # Calculate base refund
        if days_before_checkin >= self.full_refund_days:
            refund_info["refund_type"] = RefundType.FULL
            refund_info["refund_percentage"] = 100
            refund_info["refund_amount"] = booking.base_price
        elif days_before_checkin >= self.partial_refund_days:
            refund_info["refund_type"] = RefundType.PARTIAL
            refund_info["refund_percentage"] = self.partial_refund_percentage
            refund_info["refund_amount"] = booking.base_price * (self.partial_refund_percentage / 100)
        
        # Service fee refund
        if self.service_fee_refundable:
            refund_info["service_fee_refund"] = booking.service_fee
        
        # Cleaning fee refund
        if self.cleaning_fee_refundable:
            refund_info["cleaning_fee_refund"] = booking.cleaning_fee
        
        # Total refund calculation
        refund_info["total_refund"] = (
            refund_info["refund_amount"] + 
            refund_info["service_fee_refund"] + 
            refund_info["cleaning_fee_refund"]
        )
        
        return refund_info

    def __repr__(self):
        return f"<CancellationPolicy {self.policy_type} for {self.property_id}>"


class BookingReview(Base):
    """Reviews and ratings for completed bookings"""
    __tablename__ = "booking_reviews"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    booking_id = Column(UUID(as_uuid=True), ForeignKey("bookings.id"), nullable=False, unique=True)
    
    # Review details
    reviewer_id = Column(UUID(as_uuid=True), nullable=False)  # Guest or host
    reviewer_type = Column(String(10), nullable=False)  # guest, host
    
    # Ratings (1-5 scale)
    overall_rating = Column(Integer, nullable=False)
    cleanliness_rating = Column(Integer)
    communication_rating = Column(Integer)
    checkin_rating = Column(Integer)
    accuracy_rating = Column(Integer)
    location_rating = Column(Integer)
    value_rating = Column(Integer)
    
    # Review content
    review_text = Column(Text)
    private_feedback = Column(Text)  # Private feedback to host/guest
    
    # Review metadata
    is_public = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)
    helpful_votes = Column(Integer, default=0)
    
    # Moderation
    is_approved = Column(Boolean, default=True)
    moderation_notes = Column(Text)
    moderated_by = Column(UUID(as_uuid=True))
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    booking = relationship("Booking", back_populates="reviews")

    def __repr__(self):
        return f"<BookingReview {self.id} - {self.overall_rating} stars>"


class BookingNotification(Base):
    """Notifications related to booking events"""
    __tablename__ = "booking_notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    booking_id = Column(UUID(as_uuid=True), ForeignKey("bookings.id"), nullable=False, index=True)
    
    # Notification details
    recipient_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    notification_type = Column(String(50), nullable=False)  # booking_confirmed, payment_received, etc.
    
    # Message content
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    action_url = Column(String(500))
    
    # Delivery channels
    email_sent = Column(Boolean, default=False)
    push_sent = Column(Boolean, default=False)
    sms_sent = Column(Boolean, default=False)
    in_app_sent = Column(Boolean, default=False)
    
    # Status tracking
    is_read = Column(Boolean, default=False)
    read_at = Column(DateTime)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    booking = relationship("Booking", back_populates="notifications")

    def __repr__(self):
        return f"<BookingNotification {self.notification_type} for {self.recipient_id}>"


class GroupBooking(Base):
    """Group booking coordination and management"""
    __tablename__ = "group_bookings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Group details
    group_name = Column(String(255), nullable=False)
    group_leader_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    total_participants = Column(Integer, nullable=False)
    
    # Booking coordination
    property_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    check_in_date = Column(Date, nullable=False)
    check_out_date = Column(Date, nullable=False)
    
    # Group booking configuration
    min_participants = Column(Integer, default=1)
    max_participants = Column(Integer)
    booking_deadline = Column(DateTime)
    payment_deadline = Column(DateTime)
    
    # Pricing
    individual_price = Column(Numeric(10, 2), nullable=False)
    group_discount_percentage = Column(Numeric(5, 2), default=0)
    total_group_price = Column(Numeric(10, 2), nullable=False)
    
    # Status
    status = Column(String(50), nullable=False, default="collecting")  # collecting, confirmed, cancelled
    confirmed_participants = Column(Integer, default=0)
    
    # Requirements
    special_requirements = Column(Text)
    dietary_restrictions = Column(JSON)
    accessibility_needs = Column(JSON)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    confirmed_at = Column(DateTime)

    def __repr__(self):
        return f"<GroupBooking {self.group_name} - {self.status}>"


class BookingCalendarSync(Base):
    """Calendar synchronization tracking"""
    __tablename__ = "booking_calendar_sync"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    
    # External calendar details
    calendar_type = Column(String(50), nullable=False)  # airbnb, vrbo, ical, google
    calendar_url = Column(String(1000))
    calendar_id = Column(String(255))
    
    # Sync configuration
    is_two_way_sync = Column(Boolean, default=False)
    sync_frequency_hours = Column(Integer, default=24)
    auto_block_external = Column(Boolean, default=True)
    
    # Sync status
    last_sync_at = Column(DateTime)
    next_sync_at = Column(DateTime)
    sync_status = Column(String(50), default="active")  # active, paused, error
    sync_error_message = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<BookingCalendarSync {self.calendar_type} for {self.property_id}>"


# Create indexes for performance optimization
def create_booking_indexes():
    """Create additional indexes for better query performance"""
    
    # Compound indexes for common query patterns
    booking_search_idx = Index(
        'idx_booking_search',
        Booking.property_id,
        Booking.status,
        Booking.check_in_date,
        Booking.check_out_date
    )
    
    # Payment processing indexes
    payment_processing_idx = Index(
        'idx_payment_processing',
        BookingPayment.status,
        BookingPayment.created_at,
        BookingPayment.stripe_payment_intent_id
    )
    
    # Availability lock cleanup index
    lock_cleanup_idx = Index(
        'idx_lock_cleanup',
        AvailabilityLock.status,
        AvailabilityLock.expires_at
    )
    
    return [booking_search_idx, payment_processing_idx, lock_cleanup_idx]