"""Financial record model for tracking revenue, commissions, and payouts."""

from sqlalchemy import Column, String, DateTime, Text, Numeric, Boolean, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, JSON
from sqlalchemy.sql import func
import uuid
from enum import Enum
from decimal import Decimal

from app.core.database import Base


class TransactionType(str, Enum):
    """Type of financial transaction."""
    BOOKING_PAYMENT = "booking_payment"
    EXPERIENCE_PAYMENT = "experience_payment"
    COMMISSION = "commission"
    HOST_PAYOUT = "host_payout"
    REFUND = "refund"
    CHARGEBACK = "chargeback"
    FEE = "fee"
    TAX = "tax"
    ADJUSTMENT = "adjustment"
    PENALTY = "penalty"


class PaymentStatus(str, Enum):
    """Payment processing status."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"
    DISPUTED = "disputed"


class PaymentMethod(str, Enum):
    """Payment method types."""
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    BANK_TRANSFER = "bank_transfer"
    PAYPAL = "paypal"
    APPLE_PAY = "apple_pay"
    GOOGLE_PAY = "google_pay"
    CRYPTOCURRENCY = "cryptocurrency"


class FinancialRecord(Base):
    """Financial record model for tracking all monetary transactions."""
    
    __tablename__ = "financial_records"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Transaction identification
    transaction_type = Column(SQLEnum(TransactionType), nullable=False, index=True)
    reference_id = Column(String(255), nullable=False, index=True)  # booking_id, etc.
    external_transaction_id = Column(String(255), nullable=True)  # Stripe, PayPal ID
    
    # Financial details
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), nullable=False, default="USD")
    commission_amount = Column(Numeric(10, 2), nullable=True)
    commission_rate = Column(Numeric(5, 4), nullable=True)  # e.g., 0.15 for 15%
    tax_amount = Column(Numeric(10, 2), nullable=True)
    fee_amount = Column(Numeric(10, 2), nullable=True)
    net_amount = Column(Numeric(10, 2), nullable=False)
    
    # Parties involved
    payer_id = Column(UUID(as_uuid=True), nullable=True)
    payer_email = Column(String(255), nullable=True)
    payee_id = Column(UUID(as_uuid=True), nullable=True)
    payee_email = Column(String(255), nullable=True)
    
    # Payment details
    payment_method = Column(SQLEnum(PaymentMethod), nullable=True)
    payment_status = Column(SQLEnum(PaymentStatus), nullable=False, default=PaymentStatus.PENDING)
    payment_gateway = Column(String(50), nullable=True)  # stripe, paypal, etc.
    
    # Processing information
    processed_at = Column(DateTime(timezone=True), nullable=True)
    settlement_date = Column(DateTime(timezone=True), nullable=True)
    failure_reason = Column(Text, nullable=True)
    
    # Dispute and refund information
    is_disputed = Column(Boolean, default=False, nullable=False)
    dispute_reason = Column(Text, nullable=True)
    dispute_date = Column(DateTime(timezone=True), nullable=True)
    refund_amount = Column(Numeric(10, 2), nullable=True)
    refund_date = Column(DateTime(timezone=True), nullable=True)
    refund_reason = Column(Text, nullable=True)
    
    # Tax information
    tax_jurisdiction = Column(String(100), nullable=True)
    tax_rate = Column(Numeric(5, 4), nullable=True)
    tax_id = Column(String(100), nullable=True)
    
    # Metadata
    metadata = Column(JSON, nullable=True)
    notes = Column(Text, nullable=True)
    
    # Audit trail
    created_by = Column(UUID(as_uuid=True), nullable=True)
    updated_by = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    def __repr__(self):
        return f"<FinancialRecord(id={self.id}, type={self.transaction_type}, amount={self.amount})>"
    
    @property
    def amount_decimal(self) -> Decimal:
        """Get amount as Decimal for precise calculations."""
        return Decimal(str(self.amount))
    
    @property
    def commission_decimal(self) -> Decimal:
        """Get commission as Decimal for precise calculations."""
        if self.commission_amount is None:
            return Decimal('0')
        return Decimal(str(self.commission_amount))
    
    @property
    def net_decimal(self) -> Decimal:
        """Get net amount as Decimal for precise calculations."""
        return Decimal(str(self.net_amount))
    
    def is_completed(self) -> bool:
        """Check if transaction is completed."""
        return self.payment_status == PaymentStatus.COMPLETED
    
    def is_refundable(self) -> bool:
        """Check if transaction can be refunded."""
        return (
            self.is_completed() and
            not self.is_disputed and
            self.refund_amount is None
        )
    
    def calculate_net_amount(self) -> Decimal:
        """Calculate net amount after fees and taxes."""
        amount = self.amount_decimal
        
        # Subtract commission
        if self.commission_amount:
            amount -= self.commission_decimal
            
        # Subtract fees
        if self.fee_amount:
            amount -= Decimal(str(self.fee_amount))
            
        # Subtract taxes
        if self.tax_amount:
            amount -= Decimal(str(self.tax_amount))
            
        return amount