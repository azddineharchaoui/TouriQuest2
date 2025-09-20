"""Search-related models for property search system"""

from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, Numeric, 
    ForeignKey, Index, JSON, Enum as SQLEnum
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from geoalchemy2 import Geometry
from datetime import datetime
from enum import Enum
import uuid

from app.core.database import Base


class SearchSession(Base):
    """User search sessions for analytics"""
    __tablename__ = "search_sessions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), index=True)  # Nullable for anonymous users
    session_token = Column(String(64), index=True)  # For anonymous tracking
    
    # Search metadata
    started_at = Column(DateTime, default=datetime.utcnow, index=True)
    ended_at = Column(DateTime, index=True)
    total_queries = Column(Integer, default=0)
    
    # User context
    user_agent = Column(Text)
    ip_address = Column(String(45))  # IPv6 compatible
    country = Column(String(2))  # ISO country code
    
    # Search outcome
    resulted_in_booking = Column(Boolean, default=False)
    booking_id = Column(UUID(as_uuid=True))
    
    # Relationships
    queries = relationship("SearchQuery", back_populates="session", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('idx_search_session_user', 'user_id', 'started_at'),
        Index('idx_search_session_outcome', 'resulted_in_booking', 'started_at'),
    )


class SearchQuery(Base):
    """Individual search queries with parameters and results"""
    __tablename__ = "search_queries"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("search_sessions.id"), nullable=False)
    
    # Search parameters
    query_text = Column(String(500))  # Free text search
    location = Column(String(200))  # Search location
    search_coordinates = Column(Geometry('POINT', srid=4326))
    search_radius = Column(Numeric(8, 2))  # km
    
    # Date filters
    check_in_date = Column(DateTime)
    check_out_date = Column(DateTime)
    nights = Column(Integer)
    
    # Guest filters
    adults = Column(Integer, default=1)
    children = Column(Integer, default=0)
    infants = Column(Integer, default=0)
    pets = Column(Integer, default=0)
    
    # Price filters
    min_price = Column(Numeric(10, 2))
    max_price = Column(Numeric(10, 2))
    currency = Column(String(3), default="USD")
    
    # Property filters
    property_types = Column(JSON)  # List of property types
    amenity_ids = Column(JSON)  # List of required amenity IDs
    
    # Advanced filters
    instant_book_only = Column(Boolean, default=False)
    host_verified_only = Column(Boolean, default=False)
    eco_friendly_only = Column(Boolean, default=False)
    pets_allowed = Column(Boolean)
    smoking_allowed = Column(Boolean)
    accessible_only = Column(Boolean, default=False)
    
    # Rating filters
    min_rating = Column(Numeric(3, 2))
    min_reviews = Column(Integer)
    
    # Stay requirements
    min_stay = Column(Integer)
    max_stay = Column(Integer)
    
    # Search execution metadata
    executed_at = Column(DateTime, default=datetime.utcnow, index=True)
    execution_time_ms = Column(Integer)  # Query execution time
    results_count = Column(Integer, default=0)
    page_number = Column(Integer, default=1)
    page_size = Column(Integer, default=20)
    
    # Sort and ranking
    sort_by = Column(String(50))  # price_asc, price_desc, rating, distance, etc.
    ranking_algorithm = Column(String(50))  # Algorithm version used
    personalization_score = Column(Numeric(5, 4))  # 0-1 personalization strength
    
    # A/B testing
    experiment_variant = Column(String(50))
    
    # Relationships
    session = relationship("SearchSession", back_populates="queries")
    results = relationship("SearchResult", back_populates="query", cascade="all, delete-orphan")
    clicks = relationship("SearchClick", back_populates="query", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('idx_search_query_session', 'session_id', 'executed_at'),
        Index('idx_search_query_location', 'search_coordinates', postgresql_using='gist'),
        Index('idx_search_query_dates', 'check_in_date', 'check_out_date'),
        Index('idx_search_query_performance', 'execution_time_ms', 'results_count'),
    )


class SearchResult(Base):
    """Individual search results for analytics"""
    __tablename__ = "search_results"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    query_id = Column(UUID(as_uuid=True), ForeignKey("search_queries.id"), nullable=False)
    property_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    
    # Result positioning
    position = Column(Integer, nullable=False)  # 1-based position in results
    page = Column(Integer, default=1)
    
    # Scoring details
    relevance_score = Column(Numeric(10, 6))
    distance_km = Column(Numeric(8, 2))
    price_score = Column(Numeric(10, 6))
    rating_score = Column(Numeric(10, 6))
    popularity_score = Column(Numeric(10, 6))
    personalization_score = Column(Numeric(10, 6))
    final_score = Column(Numeric(10, 6))
    
    # Pricing at search time
    displayed_price = Column(Numeric(10, 2))
    total_price = Column(Numeric(10, 2))
    currency = Column(String(3))
    
    # Result interaction
    was_clicked = Column(Boolean, default=False)
    click_position = Column(Integer)  # Position when clicked
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    query = relationship("SearchQuery", back_populates="results")
    
    __table_args__ = (
        Index('idx_search_result_query', 'query_id', 'position'),
        Index('idx_search_result_property', 'property_id', 'created_at'),
        Index('idx_search_result_scores', 'final_score', 'relevance_score'),
    )


class SearchClick(Base):
    """Click tracking for search results"""
    __tablename__ = "search_clicks"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    query_id = Column(UUID(as_uuid=True), ForeignKey("search_queries.id"), nullable=False)
    property_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    
    # Click details
    clicked_at = Column(DateTime, default=datetime.utcnow, index=True)
    position = Column(Integer, nullable=False)  # Position in search results
    page = Column(Integer, default=1)
    
    # User behavior tracking
    time_on_page_seconds = Column(Integer)
    viewed_images = Column(Boolean, default=False)
    viewed_reviews = Column(Boolean, default=False)
    viewed_amenities = Column(Boolean, default=False)
    initiated_booking = Column(Boolean, default=False)
    completed_booking = Column(Boolean, default=False)
    
    # Referrer information
    referrer_url = Column(Text)
    
    # Relationships
    query = relationship("SearchQuery", back_populates="clicks")
    
    __table_args__ = (
        Index('idx_search_click_query', 'query_id', 'clicked_at'),
        Index('idx_search_click_property', 'property_id', 'clicked_at'),
        Index('idx_search_click_conversion', 'completed_booking', 'clicked_at'),
    )


class SavedSearch(Base):
    """User saved searches"""
    __tablename__ = "saved_searches"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    
    # Search parameters (similar to SearchQuery but permanent)
    name = Column(String(100), nullable=False)  # User-defined name
    query_text = Column(String(500))
    location = Column(String(200))
    search_coordinates = Column(Geometry('POINT', srid=4326))
    search_radius = Column(Numeric(8, 2))
    
    # Date preferences
    flexible_dates = Column(Boolean, default=False)
    preferred_check_in = Column(DateTime)
    preferred_check_out = Column(DateTime)
    date_range_flexibility = Column(Integer)  # Days of flexibility
    
    # Filters (stored as JSON for flexibility)
    search_filters = Column(JSON, nullable=False)
    
    # Notification settings
    email_alerts = Column(Boolean, default=True)
    push_alerts = Column(Boolean, default=True)
    price_drop_alerts = Column(Boolean, default=True)
    new_listings_alerts = Column(Boolean, default=True)
    
    # Alert thresholds
    max_price_alert = Column(Numeric(10, 2))
    min_rating_alert = Column(Numeric(3, 2))
    
    # Metadata
    is_active = Column(Boolean, default=True)
    last_checked = Column(DateTime)
    last_results_count = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    alerts = relationship("SavedSearchAlert", back_populates="saved_search", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('idx_saved_search_user', 'user_id', 'is_active'),
        Index('idx_saved_search_location', 'search_coordinates', postgresql_using='gist'),
        Index('idx_saved_search_alerts', 'is_active', 'last_checked'),
    )


class SavedSearchAlert(Base):
    """Alerts sent for saved searches"""
    __tablename__ = "saved_search_alerts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    saved_search_id = Column(UUID(as_uuid=True), ForeignKey("saved_searches.id"), nullable=False)
    
    # Alert details
    alert_type = Column(String(50), nullable=False)  # price_drop, new_listing, etc.
    property_id = Column(UUID(as_uuid=True), index=True)
    
    # Alert content
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    
    # Delivery information
    sent_at = Column(DateTime, default=datetime.utcnow, index=True)
    delivery_method = Column(String(20))  # email, push, sms
    delivered = Column(Boolean, default=False)
    opened = Column(Boolean, default=False)
    clicked = Column(Boolean, default=False)
    
    # Relationships
    saved_search = relationship("SavedSearch", back_populates="alerts")
    
    __table_args__ = (
        Index('idx_saved_search_alert_search', 'saved_search_id', 'sent_at'),
        Index('idx_saved_search_alert_delivery', 'delivery_method', 'delivered'),
    )


class TrendingLocation(Base):
    """Trending search locations"""
    __tablename__ = "trending_locations"
    
    id = Column(Integer, primary_key=True)
    
    # Location details
    location_name = Column(String(200), nullable=False, unique=True)
    country = Column(String(100), nullable=False)
    coordinates = Column(Geometry('POINT', srid=4326))
    
    # Trending metrics
    search_count_7d = Column(Integer, default=0)
    search_count_30d = Column(Integer, default=0)
    growth_rate = Column(Numeric(5, 2))  # Percentage growth
    trend_score = Column(Numeric(10, 6), default=0, index=True)
    
    # Rankings
    current_rank = Column(Integer, index=True)
    previous_rank = Column(Integer)
    rank_change = Column(Integer)  # Positive = moved up
    
    # Metadata
    first_trending_date = Column(DateTime)
    last_updated = Column(DateTime, default=datetime.utcnow, index=True)
    
    __table_args__ = (
        Index('idx_trending_location_rank', 'current_rank', 'trend_score'),
        Index('idx_trending_location_country', 'country', 'trend_score'),
    )


class SearchSuggestion(Base):
    """Auto-complete search suggestions"""
    __tablename__ = "search_suggestions"
    
    id = Column(Integer, primary_key=True)
    
    # Suggestion details
    suggestion_text = Column(String(200), nullable=False, unique=True)
    suggestion_type = Column(String(50), nullable=False)  # location, property_type, landmark
    
    # Suggestion metadata
    search_count = Column(Integer, default=0, index=True)
    success_rate = Column(Numeric(5, 2), default=0)  # Percentage of searches with results
    
    # Geographic association
    country = Column(String(100))
    region = Column(String(100))
    coordinates = Column(Geometry('POINT', srid=4326))
    
    # Display settings
    is_active = Column(Boolean, default=True, index=True)
    priority = Column(Integer, default=0)  # Higher = shown first
    
    created_at = Column(DateTime, default=datetime.utcnow)
    last_used = Column(DateTime, index=True)
    
    __table_args__ = (
        Index('idx_search_suggestion_text', 'suggestion_text'),
        Index('idx_search_suggestion_type', 'suggestion_type', 'is_active'),
        Index('idx_search_suggestion_popularity', 'search_count', 'success_rate'),
    )