"""
Database models for integration tracking and management
"""

import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from enum import Enum

from sqlalchemy import Column, String, DateTime, Boolean, Float, Integer, Text, JSON, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.core.database import Base


class IntegrationType(str, Enum):
    """Types of integrations"""
    PAYMENT = "payment"
    MAPPING = "mapping"
    COMMUNICATION = "communication"
    TRANSLATION = "translation"
    WEATHER = "weather"
    CURRENCY = "currency"
    SOCIAL = "social"
    CALENDAR = "calendar"
    TRANSPORTATION = "transportation"
    AI = "ai"


class IntegrationStatus(str, Enum):
    """Integration status"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"
    MAINTENANCE = "maintenance"
    DISABLED = "disabled"


class PaymentStatus(str, Enum):
    """Payment status"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class WebhookStatus(str, Enum):
    """Webhook processing status"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    RETRY = "retry"


class ApiRequestStatus(str, Enum):
    """API request status"""
    SUCCESS = "success"
    ERROR = "error"
    TIMEOUT = "timeout"
    RATE_LIMITED = "rate_limited"


class Integration(Base):
    """Integration configuration and status"""
    __tablename__ = "integrations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False, unique=True)
    type = Column(String(50), nullable=False)
    status = Column(String(20), nullable=False, default=IntegrationStatus.ACTIVE)
    
    # Configuration
    config = Column(JSON, nullable=True)
    api_endpoint = Column(String(500), nullable=True)
    api_version = Column(String(20), nullable=True)
    
    # Monitoring
    is_enabled = Column(Boolean, default=True)
    last_health_check = Column(DateTime(timezone=True), nullable=True)
    health_status = Column(String(20), default="unknown")
    error_count = Column(Integer, default=0)
    success_count = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Indexes
    __table_args__ = (
        Index("idx_integration_type_status", "type", "status"),
        Index("idx_integration_name", "name"),
    )


class PaymentTransaction(Base):
    """Payment transaction records"""
    __tablename__ = "payment_transactions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Transaction details
    external_id = Column(String(200), nullable=False)  # Stripe/PayPal transaction ID
    provider = Column(String(50), nullable=False)  # stripe, paypal, braintree
    payment_method = Column(String(50), nullable=False)  # card, paypal, apple_pay, etc.
    
    # Financial information
    amount = Column(Float, nullable=False)
    currency = Column(String(3), nullable=False)
    platform_fee = Column(Float, nullable=True)
    processing_fee = Column(Float, nullable=True)
    
    # Status and metadata
    status = Column(String(20), nullable=False, default=PaymentStatus.PENDING)
    metadata = Column(JSON, nullable=True)
    
    # Related entities
    user_id = Column(String(100), nullable=True)
    booking_id = Column(String(100), nullable=True)
    property_id = Column(String(100), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    processed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Indexes
    __table_args__ = (
        Index("idx_payment_external_id", "external_id"),
        Index("idx_payment_user_id", "user_id"),
        Index("idx_payment_status", "status"),
        Index("idx_payment_provider", "provider"),
    )


class WebhookEvent(Base):
    """Webhook event processing"""
    __tablename__ = "webhook_events"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Event details
    provider = Column(String(50), nullable=False)
    event_type = Column(String(100), nullable=False)
    event_id = Column(String(200), nullable=False)  # External event ID
    
    # Processing
    status = Column(String(20), nullable=False, default=WebhookStatus.PENDING)
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    
    # Data
    payload = Column(JSON, nullable=False)
    headers = Column(JSON, nullable=True)
    signature = Column(String(500), nullable=True)
    
    # Processing results
    response_data = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    processed_at = Column(DateTime(timezone=True), nullable=True)
    next_retry_at = Column(DateTime(timezone=True), nullable=True)
    
    # Indexes
    __table_args__ = (
        Index("idx_webhook_provider_type", "provider", "event_type"),
        Index("idx_webhook_event_id", "event_id"),
        Index("idx_webhook_status", "status"),
    )


class ApiRequest(Base):
    """API request tracking and analytics"""
    __tablename__ = "api_requests"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Request details
    service = Column(String(50), nullable=False)
    endpoint = Column(String(200), nullable=False)
    method = Column(String(10), nullable=False)
    
    # Request data
    request_data = Column(JSON, nullable=True)
    response_data = Column(JSON, nullable=True)
    
    # Performance
    response_time_ms = Column(Integer, nullable=True)
    status_code = Column(Integer, nullable=True)
    status = Column(String(20), nullable=False, default=ApiRequestStatus.SUCCESS)
    
    # Cost tracking
    cost_cents = Column(Integer, nullable=True)  # Cost in cents
    rate_limit_remaining = Column(Integer, nullable=True)
    
    # Error handling
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0)
    
    # User context
    user_id = Column(String(100), nullable=True)
    session_id = Column(String(100), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Indexes
    __table_args__ = (
        Index("idx_api_request_service", "service"),
        Index("idx_api_request_status", "status"),
        Index("idx_api_request_created_at", "created_at"),
        Index("idx_api_request_user_id", "user_id"),
    )


class GeocodeCache(Base):
    """Geocoding results cache"""
    __tablename__ = "geocode_cache"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Address information
    address = Column(String(500), nullable=False)
    address_hash = Column(String(64), nullable=False, unique=True)
    
    # Geocoding results
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    formatted_address = Column(String(500), nullable=True)
    place_id = Column(String(200), nullable=True)
    
    # Location components
    components = Column(JSON, nullable=True)
    
    # Provider information
    provider = Column(String(50), nullable=False)
    confidence = Column(Float, nullable=True)
    
    # Cache management
    hit_count = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)
    
    # Indexes
    __table_args__ = (
        Index("idx_geocode_hash", "address_hash"),
        Index("idx_geocode_expires", "expires_at"),
    )


class CurrencyRate(Base):
    """Currency exchange rates cache"""
    __tablename__ = "currency_rates"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Currency information
    base_currency = Column(String(3), nullable=False)
    target_currency = Column(String(3), nullable=False)
    rate = Column(Float, nullable=False)
    
    # Provider information
    provider = Column(String(50), nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    valid_until = Column(DateTime(timezone=True), nullable=False)
    
    # Indexes
    __table_args__ = (
        Index("idx_currency_pair", "base_currency", "target_currency"),
        Index("idx_currency_valid_until", "valid_until"),
    )


class WeatherCache(Base):
    """Weather data cache"""
    __tablename__ = "weather_cache"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Location
    location = Column(String(200), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    
    # Weather data
    weather_data = Column(JSON, nullable=False)
    provider = Column(String(50), nullable=False)
    
    # Cache management
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)
    
    # Indexes
    __table_args__ = (
        Index("idx_weather_location", "latitude", "longitude"),
        Index("idx_weather_expires", "expires_at"),
    )


class TranslationCache(Base):
    """Translation results cache"""
    __tablename__ = "translation_cache"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Translation details
    source_text = Column(Text, nullable=False)
    source_language = Column(String(10), nullable=False)
    target_language = Column(String(10), nullable=False)
    translated_text = Column(Text, nullable=False)
    
    # Hash for quick lookup
    text_hash = Column(String(64), nullable=False)
    
    # Provider information
    provider = Column(String(50), nullable=False)
    confidence = Column(Float, nullable=True)
    
    # Usage tracking
    hit_count = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_used = Column(DateTime(timezone=True), server_default=func.now())
    
    # Indexes
    __table_args__ = (
        Index("idx_translation_hash", "text_hash", "source_language", "target_language"),
        Index("idx_translation_languages", "source_language", "target_language"),
    )


class IntegrationMetrics(Base):
    """Integration performance metrics"""
    __tablename__ = "integration_metrics"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Metric details
    integration_name = Column(String(100), nullable=False)
    metric_name = Column(String(100), nullable=False)
    metric_value = Column(Float, nullable=False)
    metric_unit = Column(String(50), nullable=True)
    
    # Dimensions
    dimensions = Column(JSON, nullable=True)
    
    # Timestamps
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    
    # Indexes
    __table_args__ = (
        Index("idx_metrics_integration", "integration_name"),
        Index("idx_metrics_name", "metric_name"),
        Index("idx_metrics_timestamp", "timestamp"),
    )


class IntegrationAlert(Base):
    """Integration alerts and notifications"""
    __tablename__ = "integration_alerts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Alert details
    integration_name = Column(String(100), nullable=False)
    alert_type = Column(String(50), nullable=False)  # error, cost, rate_limit, etc.
    severity = Column(String(20), nullable=False)  # low, medium, high, critical
    
    # Alert content
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    
    # Alert data
    alert_data = Column(JSON, nullable=True)
    
    # Status
    is_resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolved_by = Column(String(100), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Indexes
    __table_args__ = (
        Index("idx_alert_integration", "integration_name"),
        Index("idx_alert_severity", "severity"),
        Index("idx_alert_resolved", "is_resolved"),
    )


class IntegrationCost(Base):
    """Integration cost tracking"""
    __tablename__ = "integration_costs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Cost details
    integration_name = Column(String(100), nullable=False)
    service_name = Column(String(100), nullable=False)
    cost_type = Column(String(50), nullable=False)  # api_call, transaction, storage, etc.
    
    # Financial information
    cost_amount = Column(Float, nullable=False)
    currency = Column(String(3), nullable=False, default="USD")
    
    # Usage details
    quantity = Column(Integer, nullable=True)
    unit_cost = Column(Float, nullable=True)
    
    # Billing period
    billing_period = Column(String(20), nullable=False)  # daily, monthly, yearly
    period_start = Column(DateTime(timezone=True), nullable=False)
    period_end = Column(DateTime(timezone=True), nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Indexes
    __table_args__ = (
        Index("idx_cost_integration", "integration_name"),
        Index("idx_cost_period", "period_start", "period_end"),
        Index("idx_cost_billing_period", "billing_period"),
    )