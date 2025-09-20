"""
Booking-related SQLAlchemy models
"""
from datetime import datetime, date
from typing import Optional, List
from enum import Enum as PyEnum
from decimal import Decimal

from sqlalchemy import (
    Column, String, DateTime, Boolean, Text, Integer, Float, Date,
    ForeignKey, Enum, Numeric, UniqueConstraint, CheckConstraint, Index
)
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import relationship, mapped_column, Mapped
from sqlalchemy.ext.hybrid import hybrid_property

from .base import (
    BaseModel, TimestampMixin, SoftDeleteMixin, AuditMixin,
    MetadataMixin
)


class BookingStatusEnum(PyEnum):
    """Booking status enumeration."""
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CHECKED_IN = "checked_in"
    CHECKED_OUT = "checked_out"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"
    REFUNDED = "refunded"


class PaymentStatusEnum(PyEnum):
    """Payment status enumeration."""
    PENDING = "pending"
    AUTHORIZED = "authorized"
    CAPTURED = "captured"
    FAILED = "failed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"
    PARTIALLY_REFUNDED = "partially_refunded"


class PaymentMethodEnum(PyEnum):
    """Payment method enumeration."""
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    PAYPAL = "paypal"
    APPLE_PAY = "apple_pay"
    GOOGLE_PAY = "google_pay"
    BANK_TRANSFER = "bank_transfer"
    CRYPTOCURRENCY = "cryptocurrency"
    CASH = "cash"
    OTHER = "other"


class Booking(BaseModel, TimestampMixin, SoftDeleteMixin, AuditMixin, MetadataMixin):
    """Property booking model."""
    
    __tablename__ = 'bookings'
    
    # Booking parties
    guest_id: UUID = mapped_column(
        UUID(as_uuid=True),
        ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    
    property_id: UUID = mapped_column(
        UUID(as_uuid=True),
        ForeignKey('properties.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    
    host_id: UUID = mapped_column(
        UUID(as_uuid=True),
        ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    
    # Booking details
    booking_reference: str = mapped_column(
        String(20),
        nullable=False,
        unique=True,
        index=True
    )
    
    check_in_date: date = mapped_column(
        Date,
        nullable=False,
        index=True
    )
    
    check_out_date: date = mapped_column(
        Date,
        nullable=False,
        index=True
    )
    
    number_of_guests: int = mapped_column(
        Integer,
        nullable=False
    )
    
    number_of_nights: int = mapped_column(
        Integer,
        nullable=False
    )
    
    # Status
    status: BookingStatusEnum = mapped_column(
        Enum(BookingStatusEnum),
        default=BookingStatusEnum.PENDING,
        nullable=False,
        index=True
    )
    
    # Pricing breakdown
    base_amount: Decimal = mapped_column(
        Numeric(12, 2),
        nullable=False
    )
    
    cleaning_fee: Decimal = mapped_column(
        Numeric(10, 2),
        default=0,
        nullable=False
    )
    
    service_fee: Decimal = mapped_column(
        Numeric(10, 2),
        default=0,
        nullable=False
    )
    
    taxes: Decimal = mapped_column(
        Numeric(10, 2),
        default=0,
        nullable=False
    )
    
    total_amount: Decimal = mapped_column(
        Numeric(12, 2),
        nullable=False,
        index=True
    )
    
    currency: str = mapped_column(
        String(3),
        default='USD',
        nullable=False
    )
    
    # Security deposit
    security_deposit: Optional[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=True
    )
    
    security_deposit_status: Optional[str] = mapped_column(
        String(20),
        nullable=True
    )  # held, released, claimed
    
    # Guest information
    guest_details: dict = mapped_column(
        JSONB,
        nullable=False
    )  # Names, contact info for all guests
    
    special_requests: Optional[str] = mapped_column(
        Text,
        nullable=True
    )
    
    # Check-in/out information
    check_in_instructions: Optional[str] = mapped_column(
        Text,
        nullable=True
    )
    
    actual_check_in_time: Optional[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    
    actual_check_out_time: Optional[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    
    # Communication
    last_message_at: Optional[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    
    # Cancellation
    cancelled_at: Optional[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    
    cancelled_by: Optional[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey('users.id'),
        nullable=True
    )
    
    cancellation_reason: Optional[str] = mapped_column(
        Text,
        nullable=True
    )
    
    # External references
    stripe_payment_intent_id: Optional[str] = mapped_column(
        String(255),
        nullable=True,
        index=True
    )
    
    # Relationships
    guest: Mapped["User"] = relationship(
        "User",
        foreign_keys=[guest_id]
    )
    
    property: Mapped["Property"] = relationship(
        "Property",
        foreign_keys=[property_id]
    )
    
    host: Mapped["User"] = relationship(
        "User",
        foreign_keys=[host_id]
    )
    
    payments: Mapped[List["BookingPayment"]] = relationship(
        "BookingPayment",
        back_populates="booking",
        cascade="all, delete-orphan"
    )
    
    modifications: Mapped[List["BookingModification"]] = relationship(
        "BookingModification",
        back_populates="booking",
        cascade="all, delete-orphan"
    )
    
    cancellation: Mapped[Optional["BookingCancellation"]] = relationship(
        "BookingCancellation",
        back_populates="booking",
        uselist=False,
        cascade="all, delete-orphan"
    )
    
    @hybrid_property
    def is_active(self) -> bool:
        """Check if booking is active."""
        return self.status in [BookingStatusEnum.CONFIRMED, BookingStatusEnum.CHECKED_IN]
    
    @hybrid_property
    def can_be_cancelled(self) -> bool:
        """Check if booking can be cancelled."""
        return self.status in [BookingStatusEnum.PENDING, BookingStatusEnum.CONFIRMED]
    
    __table_args__ = (
        CheckConstraint('check_out_date > check_in_date', name='check_valid_dates'),
        CheckConstraint('number_of_guests > 0', name='check_positive_guests'),
        CheckConstraint('total_amount >= 0', name='check_non_negative_amount'),
    )


class BookingPayment(BaseModel, TimestampMixin, MetadataMixin):
    """Booking payment transactions."""
    
    __tablename__ = 'booking_payments'
    
    booking_id: UUID = mapped_column(
        UUID(as_uuid=True),
        ForeignKey('bookings.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    
    # Payment details
    payment_reference: str = mapped_column(
        String(255),
        nullable=False,
        unique=True,
        index=True
    )
    
    amount: Decimal = mapped_column(
        Numeric(12, 2),
        nullable=False
    )
    
    currency: str = mapped_column(
        String(3),
        nullable=False
    )
    
    payment_method: PaymentMethodEnum = mapped_column(
        Enum(PaymentMethodEnum),
        nullable=False
    )
    
    status: PaymentStatusEnum = mapped_column(
        Enum(PaymentStatusEnum),
        default=PaymentStatusEnum.PENDING,
        nullable=False,
        index=True
    )
    
    # Transaction details
    transaction_id: Optional[str] = mapped_column(
        String(255),
        nullable=True,
        index=True
    )
    
    external_payment_id: Optional[str] = mapped_column(
        String(255),
        nullable=True,
        index=True
    )
    
    payment_gateway: Optional[str] = mapped_column(
        String(50),
        nullable=True
    )
    
    # Payment timing
    authorized_at: Optional[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    
    captured_at: Optional[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    
    failed_at: Optional[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    
    # Failure details
    failure_reason: Optional[str] = mapped_column(
        Text,
        nullable=True
    )
    
    failure_code: Optional[str] = mapped_column(
        String(50),
        nullable=True
    )
    
    # Refund information
    refunded_amount: Decimal = mapped_column(
        Numeric(12, 2),
        default=0,
        nullable=False
    )
    
    refunded_at: Optional[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    
    refund_reason: Optional[str] = mapped_column(
        Text,
        nullable=True
    )
    
    # Payment breakdown
    payment_breakdown: Optional[dict] = mapped_column(
        JSONB,
        nullable=True
    )
    
    # Relationships
    booking: Mapped["Booking"] = relationship(
        "Booking",
        back_populates="payments"
    )


class BookingModification(BaseModel, TimestampMixin, AuditMixin):
    """Booking modification history."""
    
    __tablename__ = 'booking_modifications'
    
    booking_id: UUID = mapped_column(
        UUID(as_uuid=True),
        ForeignKey('bookings.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    
    # Modification details
    modification_type: str = mapped_column(
        String(50),
        nullable=False,
        index=True
    )  # dates, guests, special_requests, cancellation
    
    old_data: dict = mapped_column(
        JSONB,
        nullable=False
    )
    
    new_data: dict = mapped_column(
        JSONB,
        nullable=False
    )
    
    # Request information
    requested_by: UUID = mapped_column(
        UUID(as_uuid=True),
        ForeignKey('users.id'),
        nullable=False,
        index=True
    )
    
    reason: Optional[str] = mapped_column(
        Text,
        nullable=True
    )
    
    # Processing status
    status: str = mapped_column(
        String(20),
        default='pending',
        nullable=False
    )  # pending, approved, rejected, processed
    
    processed_by: Optional[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey('users.id'),
        nullable=True
    )
    
    processed_at: Optional[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    
    processing_notes: Optional[str] = mapped_column(
        Text,
        nullable=True
    )
    
    # Financial impact
    price_difference: Optional[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=True
    )
    
    additional_charges: Optional[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=True
    )
    
    # Relationships
    booking: Mapped["Booking"] = relationship(
        "Booking",
        back_populates="modifications"
    )
    
    requester: Mapped["User"] = relationship(
        "User",
        foreign_keys=[requested_by]
    )
    
    processor: Mapped[Optional["User"]] = relationship(
        "User",
        foreign_keys=[processed_by]
    )


class BookingCancellation(BaseModel, TimestampMixin):
    """Booking cancellation details."""
    
    __tablename__ = 'booking_cancellations'
    
    booking_id: UUID = mapped_column(
        UUID(as_uuid=True),
        ForeignKey('bookings.id', ondelete='CASCADE'),
        nullable=False,
        unique=True,
        index=True
    )
    
    # Cancellation details
    cancelled_by: UUID = mapped_column(
        UUID(as_uuid=True),
        ForeignKey('users.id'),
        nullable=False,
        index=True
    )
    
    cancellation_reason: str = mapped_column(
        Text,
        nullable=False
    )
    
    cancellation_policy_applied: str = mapped_column(
        String(50),
        nullable=False
    )
    
    # Financial details
    refund_amount: Decimal = mapped_column(
        Numeric(12, 2),
        default=0,
        nullable=False
    )
    
    penalty_amount: Decimal = mapped_column(
        Numeric(10, 2),
        default=0,
        nullable=False
    )
    
    processing_fee: Decimal = mapped_column(
        Numeric(10, 2),
        default=0,
        nullable=False
    )
    
    # Refund status
    refund_status: str = mapped_column(
        String(20),
        default='pending',
        nullable=False
    )  # pending, processed, failed
    
    refund_processed_at: Optional[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    
    refund_reference: Optional[str] = mapped_column(
        String(255),
        nullable=True
    )
    
    # Additional information
    is_emergency_cancellation: bool = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )
    
    admin_notes: Optional[str] = mapped_column(
        Text,
        nullable=True
    )
    
    # Relationships
    booking: Mapped["Booking"] = relationship(
        "Booking",
        back_populates="cancellation"
    )
    
    cancelled_by_user: Mapped["User"] = relationship(
        "User",
        foreign_keys=[cancelled_by]
    )


class ExperienceBooking(BaseModel, TimestampMixin, SoftDeleteMixin, AuditMixin, MetadataMixin):
    """Experience booking model."""
    
    __tablename__ = 'experience_bookings'
    
    # Booking parties
    guest_id: UUID = mapped_column(
        UUID(as_uuid=True),
        ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    
    experience_id: UUID = mapped_column(
        UUID(as_uuid=True),
        ForeignKey('experiences.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    
    schedule_id: UUID = mapped_column(
        UUID(as_uuid=True),
        ForeignKey('experience_schedules.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    
    provider_id: UUID = mapped_column(
        UUID(as_uuid=True),
        ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    
    # Booking details
    booking_reference: str = mapped_column(
        String(20),
        nullable=False,
        unique=True,
        index=True
    )
    
    number_of_participants: int = mapped_column(
        Integer,
        nullable=False
    )
    
    # Status
    status: BookingStatusEnum = mapped_column(
        Enum(BookingStatusEnum),
        default=BookingStatusEnum.PENDING,
        nullable=False,
        index=True
    )
    
    # Pricing
    unit_price: Decimal = mapped_column(
        Numeric(10, 2),
        nullable=False
    )
    
    total_amount: Decimal = mapped_column(
        Numeric(12, 2),
        nullable=False
    )
    
    currency: str = mapped_column(
        String(3),
        default='USD',
        nullable=False
    )
    
    # Participant details
    participant_details: List[dict] = mapped_column(
        JSONB,
        nullable=False
    )
    
    special_requirements: Optional[str] = mapped_column(
        Text,
        nullable=True
    )
    
    # Language preference
    preferred_language: Optional[str] = mapped_column(
        String(10),
        nullable=True
    )
    
    # Completion details
    started_at: Optional[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    
    completed_at: Optional[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    
    # Cancellation
    cancelled_at: Optional[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    
    cancellation_reason: Optional[str] = mapped_column(
        Text,
        nullable=True
    )
    
    # External references
    payment_reference: Optional[str] = mapped_column(
        String(255),
        nullable=True,
        index=True
    )
    
    # Relationships
    guest: Mapped["User"] = relationship(
        "User",
        foreign_keys=[guest_id]
    )
    
    experience: Mapped["Experience"] = relationship(
        "Experience",
        foreign_keys=[experience_id]
    )
    
    schedule: Mapped["ExperienceSchedule"] = relationship(
        "ExperienceSchedule",
        foreign_keys=[schedule_id]
    )
    
    provider: Mapped["User"] = relationship(
        "User",
        foreign_keys=[provider_id]
    )


class PaymentTransaction(BaseModel, TimestampMixin, MetadataMixin):
    """General payment transaction model."""
    
    __tablename__ = 'payment_transactions'
    
    # Transaction details
    transaction_reference: str = mapped_column(
        String(255),
        nullable=False,
        unique=True,
        index=True
    )
    
    transaction_type: str = mapped_column(
        String(50),
        nullable=False,
        index=True
    )  # booking_payment, experience_payment, refund, payout
    
    # Related entities
    booking_id: Optional[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey('bookings.id'),
        nullable=True,
        index=True
    )
    
    experience_booking_id: Optional[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey('experience_bookings.id'),
        nullable=True,
        index=True
    )
    
    # Parties involved
    payer_id: UUID = mapped_column(
        UUID(as_uuid=True),
        ForeignKey('users.id'),
        nullable=False,
        index=True
    )
    
    payee_id: Optional[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey('users.id'),
        nullable=True,
        index=True
    )
    
    # Financial details
    amount: Decimal = mapped_column(
        Numeric(12, 2),
        nullable=False
    )
    
    currency: str = mapped_column(
        String(3),
        nullable=False
    )
    
    payment_method: PaymentMethodEnum = mapped_column(
        Enum(PaymentMethodEnum),
        nullable=False
    )
    
    status: PaymentStatusEnum = mapped_column(
        Enum(PaymentStatusEnum),
        default=PaymentStatusEnum.PENDING,
        nullable=False,
        index=True
    )
    
    # External transaction data
    external_transaction_id: Optional[str] = mapped_column(
        String(255),
        nullable=True,
        index=True
    )
    
    payment_gateway: str = mapped_column(
        String(50),
        nullable=False
    )
    
    gateway_response: Optional[dict] = mapped_column(
        JSONB,
        nullable=True
    )
    
    # Processing timestamps
    processed_at: Optional[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    
    failed_at: Optional[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    
    # Failure information
    failure_reason: Optional[str] = mapped_column(
        Text,
        nullable=True
    )
    
    retry_count: int = mapped_column(
        Integer,
        default=0,
        nullable=False
    )
    
    # Platform fees
    platform_fee: Decimal = mapped_column(
        Numeric(10, 2),
        default=0,
        nullable=False
    )
    
    processing_fee: Decimal = mapped_column(
        Numeric(10, 2),
        default=0,
        nullable=False
    )
    
    # Relationships
    payer: Mapped["User"] = relationship(
        "User",
        foreign_keys=[payer_id]
    )
    
    payee: Mapped[Optional["User"]] = relationship(
        "User",
        foreign_keys=[payee_id]
    )


# Database indexes for performance
booking_indexes = [
    Index('ix_bookings_guest_status', Booking.guest_id, Booking.status),
    Index('ix_bookings_property_dates', Booking.property_id, 
          Booking.check_in_date, Booking.check_out_date),
    Index('ix_bookings_host_status', Booking.host_id, Booking.status),
    Index('ix_bookings_dates_range', Booking.check_in_date, Booking.check_out_date),
    Index('ix_booking_payments_status', BookingPayment.booking_id, BookingPayment.status),
    Index('ix_experience_bookings_guest', ExperienceBooking.guest_id, 
          ExperienceBooking.status),
    Index('ix_experience_bookings_provider', ExperienceBooking.provider_id, 
          ExperienceBooking.status),
    Index('ix_payment_transactions_payer', PaymentTransaction.payer_id, 
          PaymentTransaction.status),
]