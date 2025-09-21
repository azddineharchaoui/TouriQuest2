"""
Analytics Models - Core analytics and business metrics models
"""

import uuid
from datetime import datetime, date
from typing import Optional, Dict, Any
from sqlalchemy import (
    Column, String, Integer, Float, DateTime, Date, Boolean,
    Text, JSON, ForeignKey, Index, Enum as SQLEnum, BigInteger,
    DECIMAL, UUID
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.core.database import Base


class MetricType(enum.Enum):
    """Types of metrics"""
    REVENUE = "revenue"
    CONVERSION = "conversion"
    ENGAGEMENT = "engagement"
    PERFORMANCE = "performance"
    USER_BEHAVIOR = "user_behavior"
    BUSINESS = "business"


class ReportType(enum.Enum):
    """Types of reports"""
    DASHBOARD = "dashboard"
    REVENUE = "revenue"
    USER_ANALYTICS = "user_analytics"
    PROPERTY_ANALYTICS = "property_analytics"
    CUSTOM = "custom"
    SCHEDULED = "scheduled"


class DataGranularity(enum.Enum):
    """Data aggregation granularity"""
    HOURLY = "hourly"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"


class BusinessMetric(Base):
    """Business metrics tracking"""
    __tablename__ = "business_metrics"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    metric_name = Column(String(100), nullable=False, index=True)
    metric_type = Column(SQLEnum(MetricType), nullable=False, index=True)
    
    # Time dimensions
    date = Column(Date, nullable=False, index=True)
    hour = Column(Integer, nullable=True)  # For hourly granularity
    
    # Metric values
    value = Column(DECIMAL(15, 4), nullable=False)
    previous_value = Column(DECIMAL(15, 4), nullable=True)
    percentage_change = Column(Float, nullable=True)
    
    # Dimensions for segmentation
    category = Column(String(50), nullable=True, index=True)
    subcategory = Column(String(50), nullable=True)
    region = Column(String(50), nullable=True, index=True)
    
    # Additional metadata
    metadata = Column(JSON, nullable=True)
    
    # Tracking
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    __table_args__ = (
        Index('idx_business_metrics_date_type', 'date', 'metric_type'),
        Index('idx_business_metrics_name_date', 'metric_name', 'date'),
    )


class RevenueMetric(Base):
    """Detailed revenue tracking"""
    __tablename__ = "revenue_metrics"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Time dimensions
    date = Column(Date, nullable=False, index=True)
    granularity = Column(SQLEnum(DataGranularity), nullable=False, default=DataGranularity.DAILY)
    
    # Revenue breakdown
    total_revenue = Column(DECIMAL(15, 2), nullable=False, default=0)
    booking_revenue = Column(DECIMAL(15, 2), nullable=False, default=0)
    experience_revenue = Column(DECIMAL(15, 2), nullable=False, default=0)
    commission_revenue = Column(DECIMAL(15, 2), nullable=False, default=0)
    
    # Revenue by category
    accommodation_revenue = Column(DECIMAL(15, 2), nullable=False, default=0)
    activity_revenue = Column(DECIMAL(15, 2), nullable=False, default=0)
    service_revenue = Column(DECIMAL(15, 2), nullable=False, default=0)
    
    # Geography
    country_code = Column(String(3), nullable=True, index=True)
    region = Column(String(50), nullable=True, index=True)
    city = Column(String(100), nullable=True)
    
    # Currency
    currency = Column(String(3), nullable=False, default='USD')
    exchange_rate = Column(DECIMAL(10, 6), nullable=True)
    
    # Metrics
    transaction_count = Column(Integer, nullable=False, default=0)
    average_transaction_value = Column(DECIMAL(10, 2), nullable=True)
    
    # Growth metrics
    revenue_growth_rate = Column(Float, nullable=True)
    transaction_growth_rate = Column(Float, nullable=True)
    
    # Additional data
    metadata = Column(JSON, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    __table_args__ = (
        Index('idx_revenue_date_granularity', 'date', 'granularity'),
        Index('idx_revenue_country_date', 'country_code', 'date'),
    )


class UserAnalyticMetric(Base):
    """User analytics and behavior metrics"""
    __tablename__ = "user_analytic_metrics"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Time dimensions
    date = Column(Date, nullable=False, index=True)
    granularity = Column(SQLEnum(DataGranularity), nullable=False, default=DataGranularity.DAILY)
    
    # User acquisition
    new_users = Column(Integer, nullable=False, default=0)
    returning_users = Column(Integer, nullable=False, default=0)
    total_active_users = Column(Integer, nullable=False, default=0)
    
    # Engagement metrics
    total_sessions = Column(Integer, nullable=False, default=0)
    average_session_duration = Column(Float, nullable=True)  # in minutes
    pages_per_session = Column(Float, nullable=True)
    bounce_rate = Column(Float, nullable=True)
    
    # Feature usage
    search_queries = Column(Integer, nullable=False, default=0)
    property_views = Column(Integer, nullable=False, default=0)
    booking_attempts = Column(Integer, nullable=False, default=0)
    successful_bookings = Column(Integer, nullable=False, default=0)
    
    # Conversion metrics
    search_to_view_rate = Column(Float, nullable=True)
    view_to_booking_rate = Column(Float, nullable=True)
    overall_conversion_rate = Column(Float, nullable=True)
    
    # Retention metrics
    day_1_retention = Column(Float, nullable=True)
    day_7_retention = Column(Float, nullable=True)
    day_30_retention = Column(Float, nullable=True)
    
    # User segments
    segment = Column(String(50), nullable=True, index=True)
    user_type = Column(String(30), nullable=True, index=True)  # guest, host, both
    
    # Geography
    country_code = Column(String(3), nullable=True, index=True)
    region = Column(String(50), nullable=True)
    
    # Device/Platform
    platform = Column(String(20), nullable=True, index=True)  # web, mobile, tablet
    device_type = Column(String(20), nullable=True)
    
    # Additional metrics
    metadata = Column(JSON, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    __table_args__ = (
        Index('idx_user_analytics_date_segment', 'date', 'segment'),
        Index('idx_user_analytics_country_date', 'country_code', 'date'),
    )


class PropertyAnalyticMetric(Base):
    """Property performance and analytics"""
    __tablename__ = "property_analytic_metrics"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    
    # Time dimensions
    date = Column(Date, nullable=False, index=True)
    granularity = Column(SQLEnum(DataGranularity), nullable=False, default=DataGranularity.DAILY)
    
    # Performance metrics
    views = Column(Integer, nullable=False, default=0)
    inquiries = Column(Integer, nullable=False, default=0)
    bookings = Column(Integer, nullable=False, default=0)
    revenue = Column(DECIMAL(12, 2), nullable=False, default=0)
    
    # Conversion rates
    view_to_inquiry_rate = Column(Float, nullable=True)
    inquiry_to_booking_rate = Column(Float, nullable=True)
    view_to_booking_rate = Column(Float, nullable=True)
    
    # Occupancy metrics
    available_nights = Column(Integer, nullable=False, default=0)
    booked_nights = Column(Integer, nullable=False, default=0)
    occupancy_rate = Column(Float, nullable=True)
    
    # Pricing metrics
    average_daily_rate = Column(DECIMAL(8, 2), nullable=True)
    revenue_per_available_night = Column(DECIMAL(8, 2), nullable=True)
    
    # Quality metrics
    average_rating = Column(Float, nullable=True)
    review_count = Column(Integer, nullable=False, default=0)
    response_rate = Column(Float, nullable=True)
    response_time_hours = Column(Float, nullable=True)
    
    # Ranking metrics
    search_ranking_average = Column(Float, nullable=True)
    listing_quality_score = Column(Float, nullable=True)
    
    # Property characteristics
    property_type = Column(String(50), nullable=True, index=True)
    capacity = Column(Integer, nullable=True)
    country_code = Column(String(3), nullable=True, index=True)
    region = Column(String(50), nullable=True)
    city = Column(String(100), nullable=True)
    
    # Additional data
    metadata = Column(JSON, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    __table_args__ = (
        Index('idx_property_analytics_property_date', 'property_id', 'date'),
        Index('idx_property_analytics_type_date', 'property_type', 'date'),
    )


class PerformanceMetric(Base):
    """System and API performance metrics"""
    __tablename__ = "performance_metrics"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Time dimensions
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    hour = Column(Integer, nullable=False)
    
    # Service identification
    service_name = Column(String(50), nullable=False, index=True)
    endpoint = Column(String(200), nullable=True, index=True)
    method = Column(String(10), nullable=True)
    
    # Performance metrics
    response_time_ms = Column(Float, nullable=False)
    request_count = Column(Integer, nullable=False, default=1)
    error_count = Column(Integer, nullable=False, default=0)
    success_rate = Column(Float, nullable=True)
    
    # Resource usage
    cpu_usage_percent = Column(Float, nullable=True)
    memory_usage_mb = Column(Float, nullable=True)
    disk_io_mb = Column(Float, nullable=True)
    
    # Database metrics
    db_query_time_ms = Column(Float, nullable=True)
    db_connection_count = Column(Integer, nullable=True)
    cache_hit_rate = Column(Float, nullable=True)
    
    # Error tracking
    error_type = Column(String(100), nullable=True)
    error_message = Column(Text, nullable=True)
    
    # Additional metrics
    metadata = Column(JSON, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (
        Index('idx_performance_service_timestamp', 'service_name', 'timestamp'),
        Index('idx_performance_endpoint_date', 'endpoint', 'date'),
    )


class CustomReport(Base):
    """Custom analytics reports"""
    __tablename__ = "custom_reports"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    report_type = Column(SQLEnum(ReportType), nullable=False, default=ReportType.CUSTOM)
    
    # Report configuration
    query_config = Column(JSON, nullable=False)  # SQL query or aggregation config
    visualization_config = Column(JSON, nullable=True)  # Chart configuration
    filters = Column(JSON, nullable=True)  # Default filters
    
    # Scheduling
    is_scheduled = Column(Boolean, nullable=False, default=False)
    schedule_config = Column(JSON, nullable=True)  # Cron expression, frequency
    last_run_at = Column(DateTime(timezone=True), nullable=True)
    next_run_at = Column(DateTime(timezone=True), nullable=True)
    
    # Access control
    created_by = Column(UUID(as_uuid=True), nullable=False)
    is_public = Column(Boolean, nullable=False, default=False)
    allowed_users = Column(JSON, nullable=True)  # List of user IDs
    
    # Status
    is_active = Column(Boolean, nullable=False, default=True)
    execution_count = Column(Integer, nullable=False, default=0)
    
    # Performance
    average_execution_time_ms = Column(Float, nullable=True)
    last_execution_time_ms = Column(Float, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    __table_args__ = (
        Index('idx_custom_reports_type_active', 'report_type', 'is_active'),
        Index('idx_custom_reports_scheduled', 'is_scheduled', 'next_run_at'),
    )


class AnalyticsSession(Base):
    """Analytics computation sessions"""
    __tablename__ = "analytics_sessions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_type = Column(String(50), nullable=False, index=True)  # daily, hourly, custom
    
    # Time range
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    
    # Status
    status = Column(String(20), nullable=False, default='pending')  # pending, running, completed, failed
    progress_percent = Column(Float, nullable=False, default=0)
    
    # Metrics
    records_processed = Column(BigInteger, nullable=False, default=0)
    metrics_generated = Column(Integer, nullable=False, default=0)
    
    # Performance
    execution_time_seconds = Column(Float, nullable=True)
    memory_usage_mb = Column(Float, nullable=True)
    
    # Error handling
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, nullable=False, default=0)
    
    # Metadata
    config = Column(JSON, nullable=True)
    results_summary = Column(JSON, nullable=True)
    
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (
        Index('idx_analytics_sessions_type_status', 'session_type', 'status'),
        Index('idx_analytics_sessions_date_range', 'start_date', 'end_date'),
    )