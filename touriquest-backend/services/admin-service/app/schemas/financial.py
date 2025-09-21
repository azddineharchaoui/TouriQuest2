"""Pydantic schemas for financial management endpoints."""

from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal
from enum import Enum


class TransactionTypeEnum(str, Enum):
    """Transaction type options."""
    BOOKING_PAYMENT = "booking_payment"
    REFUND = "refund"
    COMMISSION = "commission"
    PAYOUT = "payout"
    FEE = "fee"
    ADJUSTMENT = "adjustment"


class TransactionStatusEnum(str, Enum):
    """Transaction status options."""
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    PROCESSING = "processing"


class PaymentMethodEnum(str, Enum):
    """Payment method options."""
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    PAYPAL = "paypal"
    BANK_TRANSFER = "bank_transfer"
    DIGITAL_WALLET = "digital_wallet"
    CRYPTOCURRENCY = "cryptocurrency"


class PayoutStatusEnum(str, Enum):
    """Payout status options."""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class RefundStatusEnum(str, Enum):
    """Refund status options."""
    REQUESTED = "requested"
    APPROVED = "approved"
    REJECTED = "rejected"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


# Core Models
class FinancialSummary(BaseModel):
    """Financial summary for dashboard."""
    total_revenue: Decimal = Field(..., decimal_places=2)
    total_commission: Decimal = Field(..., decimal_places=2)
    total_refunds: Decimal = Field(..., decimal_places=2)
    pending_payouts: Decimal = Field(..., decimal_places=2)
    transaction_count: int
    revenue_growth: float = Field(..., description="Growth percentage")
    commission_rate: float = Field(..., description="Average commission rate")
    refund_rate: float = Field(..., description="Refund rate percentage")
    period_start: datetime
    period_end: datetime
    
    class Config:
        schema_extra = {
            "example": {
                "total_revenue": "145250.00",
                "total_commission": "21787.50",
                "total_refunds": "8950.00",
                "pending_payouts": "12500.00",
                "transaction_count": 1247,
                "revenue_growth": 15.5,
                "commission_rate": 15.0,
                "refund_rate": 6.2,
                "period_start": "2024-01-01T00:00:00Z",
                "period_end": "2024-01-31T23:59:59Z"
            }
        }


class FinancialTransaction(BaseModel):
    """Individual financial transaction."""
    id: str
    transaction_type: str
    status: str
    amount: Decimal = Field(..., decimal_places=2)
    currency: str = Field(default="USD")
    payment_method: Optional[str] = None
    booking_id: Optional[str] = None
    user_id: Optional[str] = None
    provider_id: Optional[str] = None
    description: str
    reference_id: Optional[str] = None
    fees: Decimal = Field(default=Decimal("0.00"), decimal_places=2)
    net_amount: Decimal = Field(..., decimal_places=2)
    created_at: datetime
    processed_at: Optional[datetime] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    class Config:
        from_attributes = True


class FinancialFilters(BaseModel):
    """Filters for financial queries."""
    transaction_type: Optional[str] = None
    status: Optional[str] = None
    payment_method: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    min_amount: Optional[Decimal] = None
    max_amount: Optional[Decimal] = None
    user_id: Optional[str] = None
    provider_id: Optional[str] = None
    
    class Config:
        from_attributes = True


class RevenueReport(BaseModel):
    """Revenue report with breakdown."""
    report_id: str
    period_start: datetime
    period_end: datetime
    total_revenue: Decimal = Field(..., decimal_places=2)
    total_bookings: int
    average_booking_value: Decimal = Field(..., decimal_places=2)
    revenue_by_period: List[Dict[str, Any]] = Field(default_factory=list)
    revenue_by_property_type: Dict[str, Decimal] = Field(default_factory=dict)
    revenue_by_location: Dict[str, Decimal] = Field(default_factory=dict)
    top_performing_properties: List[Dict[str, Any]] = Field(default_factory=list)
    payment_method_breakdown: Dict[str, Decimal] = Field(default_factory=dict)
    
    class Config:
        schema_extra = {
            "example": {
                "report_id": "rev-2024-01",
                "period_start": "2024-01-01T00:00:00Z",
                "period_end": "2024-01-31T23:59:59Z",
                "total_revenue": "145250.00",
                "total_bookings": 1247,
                "average_booking_value": "116.50",
                "revenue_by_period": [
                    {"date": "2024-01-01", "revenue": "4850.00"},
                    {"date": "2024-01-02", "revenue": "5120.00"}
                ],
                "revenue_by_property_type": {
                    "hotel": "85000.00",
                    "apartment": "45000.00",
                    "villa": "15250.00"
                }
            }
        }


class CommissionReport(BaseModel):
    """Commission report for providers."""
    report_id: str
    period_start: datetime
    period_end: datetime
    total_commission: Decimal = Field(..., decimal_places=2)
    provider_count: int
    average_commission_rate: float
    commission_by_provider: List[Dict[str, Any]] = Field(default_factory=list)
    commission_trends: List[Dict[str, Any]] = Field(default_factory=list)
    top_earning_providers: List[Dict[str, Any]] = Field(default_factory=list)
    
    class Config:
        schema_extra = {
            "example": {
                "report_id": "comm-2024-01",
                "period_start": "2024-01-01T00:00:00Z",
                "period_end": "2024-01-31T23:59:59Z",
                "total_commission": "21787.50",
                "provider_count": 156,
                "average_commission_rate": 15.0,
                "commission_by_provider": [
                    {"provider_id": "prov-123", "name": "Hotel Paradise", "commission": "2500.00"}
                ]
            }
        }


class PayoutRequest(BaseModel):
    """Payout request from provider."""
    provider_id: str
    amount: Decimal = Field(..., decimal_places=2, gt=0)
    payment_method: str
    account_details: Dict[str, Any] = Field(default_factory=dict)
    notes: Optional[str] = None
    
    class Config:
        schema_extra = {
            "example": {
                "provider_id": "prov-123",
                "amount": "1500.00",
                "payment_method": "bank_transfer",
                "account_details": {
                    "bank_name": "Example Bank",
                    "account_number": "****1234",
                    "routing_number": "123456789"
                },
                "notes": "Monthly payout request"
            }
        }


class PayoutSummary(BaseModel):
    """Payout summary for listing."""
    id: str
    provider_id: str
    provider_name: str
    amount: Decimal = Field(..., decimal_places=2)
    status: str
    payment_method: str
    requested_at: datetime
    approved_at: Optional[datetime] = None
    processed_at: Optional[datetime] = None
    notes: Optional[str] = None
    
    class Config:
        from_attributes = True


class RefundRequest(BaseModel):
    """Refund request."""
    booking_id: str
    amount: Optional[Decimal] = Field(None, decimal_places=2)
    reason: str = Field(..., min_length=10, max_length=500)
    refund_type: str = Field(default="full")  # full, partial
    
    class Config:
        schema_extra = {
            "example": {
                "booking_id": "book-123",
                "amount": "250.00",
                "reason": "Property was not as described",
                "refund_type": "partial"
            }
        }


class RefundSummary(BaseModel):
    """Refund summary for listing."""
    id: str
    booking_id: str
    user_id: str
    amount: Decimal = Field(..., decimal_places=2)
    original_amount: Decimal = Field(..., decimal_places=2)
    status: str
    reason: str
    refund_type: str
    requested_at: datetime
    processed_at: Optional[datetime] = None
    processed_by: Optional[str] = None
    
    class Config:
        from_attributes = True


class PaymentMethodStats(BaseModel):
    """Payment method usage statistics."""
    period_start: datetime
    period_end: datetime
    total_transactions: int
    total_amount: Decimal = Field(..., decimal_places=2)
    by_method: Dict[str, Dict[str, Any]] = Field(default_factory=dict)
    success_rates: Dict[str, float] = Field(default_factory=dict)
    average_amounts: Dict[str, Decimal] = Field(default_factory=dict)
    trends: List[Dict[str, Any]] = Field(default_factory=list)
    
    class Config:
        schema_extra = {
            "example": {
                "period_start": "2024-01-01T00:00:00Z",
                "period_end": "2024-01-31T23:59:59Z",
                "total_transactions": 1247,
                "total_amount": "145250.00",
                "by_method": {
                    "credit_card": {"count": 850, "amount": "98750.00"},
                    "paypal": {"count": 297, "amount": "35100.00"},
                    "bank_transfer": {"count": 100, "amount": "11400.00"}
                },
                "success_rates": {
                    "credit_card": 96.5,
                    "paypal": 98.2,
                    "bank_transfer": 99.1
                }
            }
        }


class FinancialAlert(BaseModel):
    """Financial alert or anomaly."""
    id: str
    alert_type: str
    severity: str
    title: str
    description: str
    amount_involved: Optional[Decimal] = Field(None, decimal_places=2)
    threshold_exceeded: Optional[float] = None
    related_transactions: List[str] = Field(default_factory=list)
    created_at: datetime
    acknowledged_at: Optional[datetime] = None
    acknowledged_by: Optional[str] = None
    resolved_at: Optional[datetime] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    class Config:
        from_attributes = True
        schema_extra = {
            "example": {
                "id": "alert-123",
                "alert_type": "unusual_activity",
                "severity": "high",
                "title": "Unusual refund pattern detected",
                "description": "High number of refunds from single property in last 24 hours",
                "amount_involved": "5000.00",
                "threshold_exceeded": 150.0,
                "created_at": "2024-01-15T10:30:00Z"
            }
        }


class FinancialMetrics(BaseModel):
    """Key financial metrics."""
    gross_revenue: Decimal = Field(..., decimal_places=2)
    net_revenue: Decimal = Field(..., decimal_places=2)
    total_fees: Decimal = Field(..., decimal_places=2)
    total_refunds: Decimal = Field(..., decimal_places=2)
    commission_paid: Decimal = Field(..., decimal_places=2)
    pending_settlements: Decimal = Field(..., decimal_places=2)
    dispute_amount: Decimal = Field(..., decimal_places=2)
    chargeback_amount: Decimal = Field(..., decimal_places=2)
    
    class Config:
        schema_extra = {
            "example": {
                "gross_revenue": "150000.00",
                "net_revenue": "142500.00",
                "total_fees": "7500.00",
                "total_refunds": "8000.00",
                "commission_paid": "22500.00",
                "pending_settlements": "5000.00",
                "dispute_amount": "1200.00",
                "chargeback_amount": "800.00"
            }
        }


class ExportRequest(BaseModel):
    """Data export request."""
    export_type: str = Field(..., description="Type of export: transactions, revenue, commissions")
    format: str = Field(default="csv", description="Export format: csv, xlsx, pdf")
    date_from: datetime
    date_to: datetime
    filters: Optional[Dict[str, Any]] = Field(default_factory=dict)
    
    @validator('date_to')
    def validate_date_range(cls, v, values):
        if 'date_from' in values and v <= values['date_from']:
            raise ValueError('date_to must be after date_from')
        return v
    
    class Config:
        schema_extra = {
            "example": {
                "export_type": "transactions",
                "format": "xlsx",
                "date_from": "2024-01-01T00:00:00Z",
                "date_to": "2024-01-31T23:59:59Z",
                "filters": {"status": "completed"}
            }
        }


class ExportStatus(BaseModel):
    """Export job status."""
    export_id: str
    status: str  # queued, processing, completed, failed
    progress: int = Field(ge=0, le=100)
    file_url: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True