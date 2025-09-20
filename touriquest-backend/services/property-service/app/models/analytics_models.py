"""Analytics models for search optimization and performance tracking"""

from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, Numeric, 
    ForeignKey, Index, JSON
)
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid

from app.core.database import Base


class SearchPerformanceMetric(Base):
    """Search performance metrics for optimization"""
    __tablename__ = "search_performance_metrics"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Time bucket (for aggregated metrics)
    bucket_start = Column(DateTime, nullable=False, index=True)
    bucket_end = Column(DateTime, nullable=False)
    bucket_size = Column(String(20), nullable=False)  # hourly, daily, weekly
    
    # Query performance
    total_queries = Column(Integer, default=0)
    avg_execution_time_ms = Column(Numeric(10, 2))
    p95_execution_time_ms = Column(Numeric(10, 2))
    p99_execution_time_ms = Column(Numeric(10, 2))
    
    # Result quality
    avg_results_count = Column(Numeric(10, 2))
    zero_results_count = Column(Integer, default=0)
    zero_results_rate = Column(Numeric(5, 2))
    
    # User engagement
    click_through_rate = Column(Numeric(5, 2))  # Percentage
    avg_position_clicked = Column(Numeric(5, 2))
    bounce_rate = Column(Numeric(5, 2))  # Quick exits
    
    # Conversion metrics
    search_to_view_rate = Column(Numeric(5, 2))
    search_to_booking_rate = Column(Numeric(5, 2))
    avg_booking_value = Column(Numeric(10, 2))
    
    # Popular filters
    most_used_filters = Column(JSON)  # Top filters used
    most_searched_locations = Column(JSON)  # Top locations
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        Index('idx_search_performance_bucket', 'bucket_start', 'bucket_size'),
        Index('idx_search_performance_metrics', 'click_through_rate', 'search_to_booking_rate'),
    )


class ABTestExperiment(Base):
    """A/B testing experiments for search optimization"""
    __tablename__ = "ab_test_experiments"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Experiment details
    name = Column(String(200), nullable=False, unique=True)
    description = Column(Text)
    hypothesis = Column(Text)
    
    # Experiment configuration
    control_config = Column(JSON, nullable=False)  # Control variant configuration
    test_configs = Column(JSON, nullable=False)  # Test variant configurations
    
    # Traffic allocation
    traffic_allocation = Column(Numeric(5, 2), default=10)  # Percentage of traffic
    variants_split = Column(JSON, nullable=False)  # How to split traffic between variants
    
    # Experiment lifecycle
    status = Column(String(20), default="draft")  # draft, running, paused, completed
    started_at = Column(DateTime, index=True)
    ended_at = Column(DateTime, index=True)
    
    # Success metrics
    primary_metric = Column(String(50), nullable=False)  # CTR, conversion_rate, etc.
    secondary_metrics = Column(JSON)  # Additional metrics to track
    
    # Statistical configuration
    min_sample_size = Column(Integer, default=1000)
    confidence_level = Column(Numeric(5, 2), default=95)  # 95% confidence
    minimum_effect_size = Column(Numeric(10, 6), default=0.05)  # 5% minimum effect
    
    # Results
    is_significant = Column(Boolean)
    winning_variant = Column(String(50))
    effect_size = Column(Numeric(10, 6))
    p_value = Column(Numeric(10, 8))
    
    # Metadata
    created_by = Column(UUID(as_uuid=True), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    __table_args__ = (
        Index('idx_ab_test_status', 'status', 'started_at'),
        Index('idx_ab_test_results', 'is_significant', 'ended_at'),
    )


class ABTestResult(Base):
    """A/B test results for individual users"""
    __tablename__ = "ab_test_results"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    experiment_id = Column(UUID(as_uuid=True), ForeignKey("ab_test_experiments.id"), nullable=False)
    
    # User identification
    user_id = Column(UUID(as_uuid=True), index=True)  # Nullable for anonymous
    session_token = Column(String(64), index=True)  # For anonymous users
    
    # Assignment details
    variant = Column(String(50), nullable=False)
    assigned_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Exposure tracking
    first_exposure = Column(DateTime, index=True)
    total_exposures = Column(Integer, default=0)
    
    # Outcome tracking
    converted = Column(Boolean, default=False)
    conversion_date = Column(DateTime)
    primary_metric_value = Column(Numeric(15, 6))
    secondary_metrics = Column(JSON)  # Values for secondary metrics
    
    # User context
    user_agent = Column(Text)
    country = Column(String(2))
    
    __table_args__ = (
        Index('idx_ab_test_result_experiment', 'experiment_id', 'variant'),
        Index('idx_ab_test_result_user', 'user_id', 'assigned_at'),
        Index('idx_ab_test_result_conversion', 'converted', 'conversion_date'),
    )


class RankingFeature(Base):
    """Features used in search ranking algorithms"""
    __tablename__ = "ranking_features"
    
    id = Column(Integer, primary_key=True)
    
    # Feature definition
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text)
    feature_type = Column(String(50), nullable=False)  # property, location, user, query
    
    # Feature configuration
    is_active = Column(Boolean, default=True, index=True)
    weight = Column(Numeric(10, 6), default=1.0)
    normalization_method = Column(String(50))  # min_max, z_score, log, etc.
    
    # Performance tracking
    importance_score = Column(Numeric(10, 6))  # Feature importance from ML model
    correlation_with_ctr = Column(Numeric(5, 4))  # Correlation with click-through rate
    correlation_with_conversion = Column(Numeric(5, 4))  # Correlation with bookings
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    __table_args__ = (
        Index('idx_ranking_feature_active', 'is_active', 'weight'),
        Index('idx_ranking_feature_importance', 'importance_score', 'feature_type'),
    )


class PropertyPopularityScore(Base):
    """Daily popularity scores for properties"""
    __tablename__ = "property_popularity_scores"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    date = Column(DateTime, nullable=False, index=True)
    
    # Raw metrics
    views_count = Column(Integer, default=0)
    clicks_count = Column(Integer, default=0)
    bookings_count = Column(Integer, default=0)
    revenue = Column(Numeric(10, 2), default=0)
    
    # Engagement metrics
    avg_time_on_page = Column(Numeric(8, 2))  # seconds
    image_view_rate = Column(Numeric(5, 2))  # percentage
    review_read_rate = Column(Numeric(5, 2))  # percentage
    
    # Conversion metrics
    click_through_rate = Column(Numeric(5, 2))
    booking_conversion_rate = Column(Numeric(5, 2))
    
    # Calculated scores
    engagement_score = Column(Numeric(10, 6), default=0)
    conversion_score = Column(Numeric(10, 6), default=0)
    revenue_score = Column(Numeric(10, 6), default=0)
    popularity_score = Column(Numeric(10, 6), default=0, index=True)
    
    # Ranking position tracking
    avg_search_position = Column(Numeric(5, 2))
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        Index('idx_property_popularity_unique', 'property_id', 'date', unique=True),
        Index('idx_property_popularity_score', 'popularity_score', 'date'),
        Index('idx_property_popularity_metrics', 'clicks_count', 'bookings_count'),
    )


class SearchFeedback(Base):
    """User feedback on search results quality"""
    __tablename__ = "search_feedback"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    query_id = Column(UUID(as_uuid=True), ForeignKey("search_queries.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), index=True)
    
    # Feedback details
    feedback_type = Column(String(50), nullable=False)  # thumbs_up, thumbs_down, report
    rating = Column(Integer)  # 1-5 rating for results quality
    comment = Column(Text)
    
    # Specific issues
    irrelevant_results = Column(Boolean, default=False)
    incorrect_pricing = Column(Boolean, default=False)
    outdated_availability = Column(Boolean, default=False)
    poor_image_quality = Column(Boolean, default=False)
    misleading_description = Column(Boolean, default=False)
    
    # Suggested improvements
    suggestions = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    __table_args__ = (
        Index('idx_search_feedback_query', 'query_id', 'feedback_type'),
        Index('idx_search_feedback_user', 'user_id', 'created_at'),
        Index('idx_search_feedback_type', 'feedback_type', 'rating'),
    )


class ConversionFunnel(Base):
    """Conversion funnel tracking for search to booking"""
    __tablename__ = "conversion_funnel"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("search_sessions.id"), nullable=False)
    property_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    
    # Funnel stages (timestamps)
    search_timestamp = Column(DateTime, nullable=False, index=True)
    click_timestamp = Column(DateTime, index=True)
    view_details_timestamp = Column(DateTime, index=True)
    view_photos_timestamp = Column(DateTime, index=True)
    view_reviews_timestamp = Column(DateTime, index=True)
    view_amenities_timestamp = Column(DateTime, index=True)
    check_availability_timestamp = Column(DateTime, index=True)
    start_booking_timestamp = Column(DateTime, index=True)
    complete_booking_timestamp = Column(DateTime, index=True)
    
    # Drop-off analysis
    dropped_at_stage = Column(String(50))  # Last completed stage
    time_to_conversion = Column(Integer)  # seconds from search to booking
    
    # Context
    referrer = Column(String(200))
    device_type = Column(String(20))  # mobile, tablet, desktop
    user_type = Column(String(20))  # new, returning, power_user
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        Index('idx_conversion_funnel_session', 'session_id', 'search_timestamp'),
        Index('idx_conversion_funnel_property', 'property_id', 'search_timestamp'),
        Index('idx_conversion_funnel_completion', 'complete_booking_timestamp'),
        Index('idx_conversion_funnel_dropoff', 'dropped_at_stage', 'search_timestamp'),
    )