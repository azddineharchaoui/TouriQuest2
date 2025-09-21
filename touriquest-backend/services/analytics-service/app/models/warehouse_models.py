"""
Warehouse Models - Data warehouse specific models for ETL and aggregated data
"""

import uuid
from datetime import datetime, date
from typing import Optional
from sqlalchemy import (
    Column, String, Integer, Float, DateTime, Date, Boolean,
    Text, JSON, BigInteger, DECIMAL, UUID, Index
)
from sqlalchemy.sql import func
import enum

from app.core.database import Base


class FactBooking(Base):
    """Fact table for booking analytics"""
    __tablename__ = "fact_bookings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    booking_id = Column(UUID(as_uuid=True), nullable=False, unique=True, index=True)
    
    # Dimensions (foreign keys to dimension tables)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    property_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    host_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    
    # Time dimensions
    booking_date = Column(Date, nullable=False, index=True)
    checkin_date = Column(Date, nullable=False, index=True)
    checkout_date = Column(Date, nullable=False, index=True)
    
    # Measures
    total_amount = Column(DECIMAL(12, 2), nullable=False)
    commission_amount = Column(DECIMAL(12, 2), nullable=False)
    tax_amount = Column(DECIMAL(12, 2), nullable=False)
    nights = Column(Integer, nullable=False)
    guests = Column(Integer, nullable=False)
    
    # Status and categorical data
    booking_status = Column(String(20), nullable=False, index=True)
    payment_status = Column(String(20), nullable=False, index=True)
    cancellation_reason = Column(String(100), nullable=True)
    
    # Geographic dimensions
    country_code = Column(String(3), nullable=False, index=True)
    region = Column(String(50), nullable=False, index=True)
    city = Column(String(100), nullable=False)
    
    # Property characteristics
    property_type = Column(String(50), nullable=False, index=True)
    property_capacity = Column(Integer, nullable=False)
    
    # User characteristics
    user_type = Column(String(20), nullable=False, index=True)  # new, returning
    user_segment = Column(String(30), nullable=True, index=True)
    
    # Derived metrics
    revenue_per_night = Column(DECIMAL(8, 2), nullable=True)
    lead_time_days = Column(Integer, nullable=True)
    length_of_stay = Column(Integer, nullable=True)
    
    # ETL metadata
    etl_batch_id = Column(String(50), nullable=True)
    source_updated_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    __table_args__ = (
        Index('idx_fact_bookings_date_status', 'booking_date', 'booking_status'),
        Index('idx_fact_bookings_property_date', 'property_id', 'booking_date'),
        Index('idx_fact_bookings_user_date', 'user_id', 'booking_date'),
    )


class FactUserActivity(Base):
    """Fact table for user activity analytics"""
    __tablename__ = "fact_user_activities"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Dimensions
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    session_id = Column(String(100), nullable=False, index=True)
    
    # Time dimensions
    activity_date = Column(Date, nullable=False, index=True)
    activity_timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    hour_of_day = Column(Integer, nullable=False)
    day_of_week = Column(Integer, nullable=False)
    
    # Activity details
    activity_type = Column(String(50), nullable=False, index=True)
    page_path = Column(String(500), nullable=True)
    referrer = Column(String(500), nullable=True)
    
    # Measures
    session_duration_minutes = Column(Float, nullable=True)
    page_views = Column(Integer, nullable=False, default=1)
    events_count = Column(Integer, nullable=False, default=0)
    
    # Device and location
    device_type = Column(String(20), nullable=False, index=True)
    platform = Column(String(20), nullable=False, index=True)
    country_code = Column(String(3), nullable=False, index=True)
    region = Column(String(50), nullable=True)
    
    # User characteristics
    user_type = Column(String(20), nullable=False, index=True)
    user_segment = Column(String(30), nullable=True)
    is_first_visit = Column(Boolean, nullable=False, default=False)
    
    # Conversion tracking
    conversion_event = Column(String(50), nullable=True, index=True)
    conversion_value = Column(DECIMAL(10, 2), nullable=True)
    
    # ETL metadata
    etl_batch_id = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (
        Index('idx_fact_activities_user_date', 'user_id', 'activity_date'),
        Index('idx_fact_activities_type_date', 'activity_type', 'activity_date'),
        Index('idx_fact_activities_conversion', 'conversion_event', 'activity_date'),
    )


class FactProperty(Base):
    """Fact table for property analytics"""
    __tablename__ = "fact_properties"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    
    # Time dimensions
    date = Column(Date, nullable=False, index=True)
    
    # Property dimensions
    host_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    property_type = Column(String(50), nullable=False, index=True)
    capacity = Column(Integer, nullable=False)
    
    # Geographic dimensions
    country_code = Column(String(3), nullable=False, index=True)
    region = Column(String(50), nullable=False, index=True)
    city = Column(String(100), nullable=False)
    
    # Daily measures
    views = Column(Integer, nullable=False, default=0)
    inquiries = Column(Integer, nullable=False, default=0)
    bookings = Column(Integer, nullable=False, default=0)
    revenue = Column(DECIMAL(10, 2), nullable=False, default=0)
    
    # Availability and occupancy
    available_nights = Column(Integer, nullable=False, default=0)
    booked_nights = Column(Integer, nullable=False, default=0)
    blocked_nights = Column(Integer, nullable=False, default=0)
    
    # Pricing
    base_price = Column(DECIMAL(8, 2), nullable=True)
    average_daily_rate = Column(DECIMAL(8, 2), nullable=True)
    
    # Performance metrics
    occupancy_rate = Column(Float, nullable=True)
    revenue_per_available_night = Column(DECIMAL(8, 2), nullable=True)
    conversion_rate = Column(Float, nullable=True)
    
    # Quality metrics
    rating = Column(Float, nullable=True)
    review_count = Column(Integer, nullable=False, default=0)
    response_rate = Column(Float, nullable=True)
    
    # Rankings and visibility
    search_ranking = Column(Float, nullable=True)
    listing_quality_score = Column(Float, nullable=True)
    
    # ETL metadata
    etl_batch_id = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    __table_args__ = (
        Index('idx_fact_properties_property_date', 'property_id', 'date'),
        Index('idx_fact_properties_location_date', 'country_code', 'region', 'date'),
        Index('idx_fact_properties_type_date', 'property_type', 'date'),
    )


class DimUser(Base):
    """User dimension table"""
    __tablename__ = "dim_users"
    
    user_id = Column(UUID(as_uuid=True), primary_key=True)
    
    # User attributes
    user_type = Column(String(20), nullable=False, index=True)  # guest, host, both
    user_segment = Column(String(30), nullable=True, index=True)
    registration_date = Column(Date, nullable=False, index=True)
    
    # Demographics (aggregated/anonymized)
    age_group = Column(String(20), nullable=True, index=True)
    country_code = Column(String(3), nullable=True, index=True)
    region = Column(String(50), nullable=True)
    preferred_language = Column(String(10), nullable=True)
    
    # Behavioral attributes
    booking_frequency = Column(String(20), nullable=True)  # low, medium, high
    average_booking_value = Column(DECIMAL(8, 2), nullable=True)
    preferred_property_type = Column(String(50), nullable=True)
    
    # Engagement metrics
    total_bookings = Column(Integer, nullable=False, default=0)
    total_reviews = Column(Integer, nullable=False, default=0)
    last_activity_date = Column(Date, nullable=True)
    
    # Status
    is_active = Column(Boolean, nullable=False, default=True)
    is_verified = Column(Boolean, nullable=False, default=False)
    
    # ETL metadata
    source_updated_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    __table_args__ = (
        Index('idx_dim_users_type_segment', 'user_type', 'user_segment'),
        Index('idx_dim_users_country_active', 'country_code', 'is_active'),
    )


class DimProperty(Base):
    """Property dimension table"""
    __tablename__ = "dim_properties"
    
    property_id = Column(UUID(as_uuid=True), primary_key=True)
    
    # Property attributes
    property_type = Column(String(50), nullable=False, index=True)
    capacity = Column(Integer, nullable=False)
    bedrooms = Column(Integer, nullable=True)
    bathrooms = Column(Integer, nullable=True)
    
    # Location
    country_code = Column(String(3), nullable=False, index=True)
    region = Column(String(50), nullable=False, index=True)
    city = Column(String(100), nullable=False)
    neighborhood = Column(String(100), nullable=True)
    
    # Host information
    host_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    host_type = Column(String(30), nullable=True)  # individual, business
    host_since_date = Column(Date, nullable=True)
    
    # Property characteristics
    listing_date = Column(Date, nullable=False, index=True)
    instant_book = Column(Boolean, nullable=False, default=False)
    minimum_nights = Column(Integer, nullable=True)
    maximum_nights = Column(Integer, nullable=True)
    
    # Amenities (aggregated)
    amenity_count = Column(Integer, nullable=False, default=0)
    has_wifi = Column(Boolean, nullable=False, default=False)
    has_parking = Column(Boolean, nullable=False, default=False)
    has_kitchen = Column(Boolean, nullable=False, default=False)
    
    # Status
    is_active = Column(Boolean, nullable=False, default=True)
    
    # ETL metadata
    source_updated_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    __table_args__ = (
        Index('idx_dim_properties_location', 'country_code', 'region', 'city'),
        Index('idx_dim_properties_type_active', 'property_type', 'is_active'),
    )


class AggregatedMetric(Base):
    """Pre-aggregated metrics for fast dashboard queries"""
    __tablename__ = "aggregated_metrics"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Metric identification
    metric_name = Column(String(100), nullable=False, index=True)
    aggregation_level = Column(String(20), nullable=False, index=True)  # daily, weekly, monthly
    
    # Time dimensions
    date = Column(Date, nullable=False, index=True)
    year = Column(Integer, nullable=False, index=True)
    month = Column(Integer, nullable=False, index=True)
    week = Column(Integer, nullable=True, index=True)
    
    # Dimensions for segmentation
    dimension_1 = Column(String(100), nullable=True, index=True)  # e.g., country_code
    dimension_2 = Column(String(100), nullable=True, index=True)  # e.g., property_type
    dimension_3 = Column(String(100), nullable=True, index=True)  # e.g., user_segment
    
    # Metric values
    value = Column(DECIMAL(15, 4), nullable=False)
    count = Column(BigInteger, nullable=True)
    sum = Column(DECIMAL(15, 4), nullable=True)
    average = Column(DECIMAL(10, 4), nullable=True)
    min_value = Column(DECIMAL(15, 4), nullable=True)
    max_value = Column(DECIMAL(15, 4), nullable=True)
    
    # Comparison metrics
    previous_period_value = Column(DECIMAL(15, 4), nullable=True)
    percentage_change = Column(Float, nullable=True)
    year_over_year_change = Column(Float, nullable=True)
    
    # Metadata
    calculation_metadata = Column(JSON, nullable=True)
    
    # ETL tracking
    etl_batch_id = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    __table_args__ = (
        Index('idx_aggregated_metrics_name_level_date', 'metric_name', 'aggregation_level', 'date'),
        Index('idx_aggregated_metrics_dimensions', 'dimension_1', 'dimension_2', 'dimension_3'),
    )