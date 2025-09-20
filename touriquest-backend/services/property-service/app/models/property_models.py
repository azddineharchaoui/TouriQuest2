"""Property models for the TouriQuest property search system"""

from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, Numeric, 
    ForeignKey, Index, CheckConstraint, JSON, Enum as SQLEnum
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from geoalchemy2 import Geometry
from datetime import datetime
from enum import Enum
import uuid

from app.core.database import Base


class PropertyType(str, Enum):
    """Property type enumeration"""
    APARTMENT = "apartment"
    HOUSE = "house"
    VILLA = "villa"
    CONDO = "condo"
    TOWNHOUSE = "townhouse"
    STUDIO = "studio"
    LOFT = "loft"
    PENTHOUSE = "penthouse"
    CABIN = "cabin"
    COTTAGE = "cottage"
    CASTLE = "castle"
    BOAT = "boat"
    RV = "rv"
    TENT = "tent"
    TREEHOUSE = "treehouse"
    IGLOO = "igloo"
    OTHER = "other"


class PropertyStatus(str, Enum):
    """Property status enumeration"""
    DRAFT = "draft"
    PENDING_REVIEW = "pending_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    SUSPENDED = "suspended"
    INACTIVE = "inactive"


class BookingType(str, Enum):
    """Booking type enumeration"""
    INSTANT_BOOK = "instant_book"
    REQUEST_TO_BOOK = "request_to_book"


class CancellationPolicy(str, Enum):
    """Cancellation policy enumeration"""
    FLEXIBLE = "flexible"
    MODERATE = "moderate"
    STRICT = "strict"
    SUPER_STRICT_30 = "super_strict_30"
    SUPER_STRICT_60 = "super_strict_60"


class Property(Base):
    """Main property model"""
    __tablename__ = "properties"
    
    # Primary identification
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    host_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    
    # Basic information
    title = Column(String(200), nullable=False)
    description = Column(Text)
    property_type = Column(SQLEnum(PropertyType), nullable=False, index=True)
    status = Column(SQLEnum(PropertyStatus), default=PropertyStatus.DRAFT, index=True)
    
    # Location data with PostGIS support
    address = Column(Text, nullable=False)
    city = Column(String(100), nullable=False, index=True)
    state_province = Column(String(100), index=True)
    country = Column(String(100), nullable=False, index=True)
    postal_code = Column(String(20))
    location = Column(Geometry('POINT', srid=4326), nullable=False, index=True)
    
    # Capacity and specifications
    max_guests = Column(Integer, nullable=False, index=True)
    bedrooms = Column(Integer, default=0)
    bathrooms = Column(Numeric(3, 1), default=0)
    beds = Column(Integer, default=0)
    
    # Pricing
    base_price_per_night = Column(Numeric(10, 2), nullable=False, index=True)
    currency = Column(String(3), default="USD")
    cleaning_fee = Column(Numeric(10, 2), default=0)
    service_fee_percentage = Column(Numeric(5, 2), default=0)
    
    # Booking settings
    booking_type = Column(SQLEnum(BookingType), default=BookingType.REQUEST_TO_BOOK, index=True)
    cancellation_policy = Column(SQLEnum(CancellationPolicy), default=CancellationPolicy.MODERATE)
    minimum_stay = Column(Integer, default=1)
    maximum_stay = Column(Integer, default=30)
    
    # Advanced settings
    check_in_time = Column(String(10), default="15:00")
    check_out_time = Column(String(10), default="11:00")
    advance_booking_days = Column(Integer, default=365)
    
    # Host verification and quality
    host_verified = Column(Boolean, default=False, index=True)
    host_response_rate = Column(Numeric(5, 2), default=0)  # 0-100%
    host_response_time_hours = Column(Integer, default=24)
    
    # Property quality metrics
    overall_rating = Column(Numeric(3, 2), default=0, index=True)  # 0-5.00
    review_count = Column(Integer, default=0, index=True)
    cleanliness_rating = Column(Numeric(3, 2), default=0)
    communication_rating = Column(Numeric(3, 2), default=0)
    location_rating = Column(Numeric(3, 2), default=0)
    value_rating = Column(Numeric(3, 2), default=0)
    
    # Eco-friendly and accessibility
    eco_friendly = Column(Boolean, default=False, index=True)
    accessibility_features = Column(JSON)  # List of accessibility features
    
    # House rules and policies
    smoking_allowed = Column(Boolean, default=False, index=True)
    pets_allowed = Column(Boolean, default=False, index=True)
    events_allowed = Column(Boolean, default=False)
    children_welcome = Column(Boolean, default=True, index=True)
    
    # Multi-language support
    languages_spoken = Column(ARRAY(String), default=[])  # Host languages
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, index=True)
    last_booked_at = Column(DateTime, index=True)
    views_count = Column(Integer, default=0)
    
    # Performance optimization
    search_vector = Column(String)  # Full-text search vector
    popularity_score = Column(Numeric(10, 6), default=0, index=True)
    
    # Relationships
    amenities = relationship("PropertyAmenity", back_populates="property", cascade="all, delete-orphan")
    images = relationship("PropertyImage", back_populates="property", cascade="all, delete-orphan")
    availability = relationship("PropertyAvailability", back_populates="property", cascade="all, delete-orphan")
    pricing_rules = relationship("PropertyPricingRule", back_populates="property", cascade="all, delete-orphan")
    reviews = relationship("PropertyReview", back_populates="property", cascade="all, delete-orphan")
    
    # Table constraints
    __table_args__ = (
        CheckConstraint('max_guests > 0', name='check_max_guests_positive'),
        CheckConstraint('bedrooms >= 0', name='check_bedrooms_non_negative'),
        CheckConstraint('bathrooms >= 0', name='check_bathrooms_non_negative'),
        CheckConstraint('beds >= 0', name='check_beds_non_negative'),
        CheckConstraint('base_price_per_night > 0', name='check_base_price_positive'),
        CheckConstraint('minimum_stay > 0', name='check_minimum_stay_positive'),
        CheckConstraint('maximum_stay >= minimum_stay', name='check_maximum_stay_valid'),
        CheckConstraint('overall_rating >= 0 AND overall_rating <= 5', name='check_rating_range'),
        CheckConstraint('review_count >= 0', name='check_review_count_non_negative'),
        Index('idx_property_location_gin', location, postgresql_using='gist'),
        Index('idx_property_search', 'city', 'country', 'property_type', 'max_guests'),
        Index('idx_property_price_rating', 'base_price_per_night', 'overall_rating'),
        Index('idx_property_features', 'eco_friendly', 'pets_allowed', 'smoking_allowed'),
    )


class AmenityCategory(str, Enum):
    """Amenity category enumeration"""
    BASICS = "basics"
    INTERNET = "internet"
    KITCHEN = "kitchen"
    ENTERTAINMENT = "entertainment"
    HEATING_COOLING = "heating_cooling"
    BATHROOM = "bathroom"
    OUTDOOR = "outdoor"
    PARKING = "parking"
    SAFETY = "safety"
    ACCESSIBILITY = "accessibility"
    SERVICES = "services"
    FAMILY = "family"
    WORKSPACE = "workspace"


class Amenity(Base):
    """Master amenity list"""
    __tablename__ = "amenities"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False, unique=True)
    category = Column(SQLEnum(AmenityCategory), nullable=False, index=True)
    icon = Column(String(50))  # Icon identifier
    description = Column(Text)
    is_highlighted = Column(Boolean, default=False)  # Show in search filters
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    property_amenities = relationship("PropertyAmenity", back_populates="amenity")


class PropertyAmenity(Base):
    """Property-specific amenities"""
    __tablename__ = "property_amenities"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id"), nullable=False)
    amenity_id = Column(Integer, ForeignKey("amenities.id"), nullable=False)
    
    # Additional amenity-specific data
    notes = Column(Text)  # Additional details
    is_verified = Column(Boolean, default=False)  # Host verified this amenity
    
    # Relationships
    property = relationship("Property", back_populates="amenities")
    amenity = relationship("Amenity", back_populates="property_amenities")
    
    # Unique constraint
    __table_args__ = (
        Index('idx_property_amenity_unique', 'property_id', 'amenity_id', unique=True),
        Index('idx_property_amenity_search', 'property_id', 'amenity_id'),
    )


class PropertyImage(Base):
    """Property images"""
    __tablename__ = "property_images"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id"), nullable=False)
    
    # Image data
    url = Column(String(500), nullable=False)
    alt_text = Column(String(200))
    caption = Column(String(300))
    order_index = Column(Integer, default=0)
    is_primary = Column(Boolean, default=False)
    
    # Image metadata
    width = Column(Integer)
    height = Column(Integer)
    file_size = Column(Integer)  # in bytes
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    property = relationship("Property", back_populates="images")
    
    __table_args__ = (
        Index('idx_property_images_order', 'property_id', 'order_index'),
        Index('idx_property_images_primary', 'property_id', 'is_primary'),
    )


class PropertyAvailability(Base):
    """Property availability calendar"""
    __tablename__ = "property_availability"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id"), nullable=False)
    
    date = Column(DateTime, nullable=False)
    is_available = Column(Boolean, default=True, index=True)
    price_override = Column(Numeric(10, 2))  # Override base price for this date
    minimum_stay_override = Column(Integer)  # Override minimum stay
    
    # Booking reference (if booked)
    booking_id = Column(UUID(as_uuid=True))
    
    # Notes for unavailability
    notes = Column(String(200))
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    property = relationship("Property", back_populates="availability")
    
    __table_args__ = (
        Index('idx_property_availability_unique', 'property_id', 'date', unique=True),
        Index('idx_property_availability_search', 'property_id', 'date', 'is_available'),
        Index('idx_property_availability_date_range', 'date'),
    )


class PropertyPricingRule(Base):
    """Dynamic pricing rules"""
    __tablename__ = "property_pricing_rules"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id"), nullable=False)
    
    # Rule definition
    rule_name = Column(String(100), nullable=False)
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    
    # Pricing adjustments
    percentage_adjustment = Column(Numeric(5, 2))  # +/- percentage
    fixed_adjustment = Column(Numeric(10, 2))  # +/- fixed amount
    minimum_price = Column(Numeric(10, 2))
    maximum_price = Column(Numeric(10, 2))
    
    # Rule conditions
    minimum_stay_required = Column(Integer)
    advance_booking_days = Column(Integer)
    day_of_week = Column(ARRAY(Integer))  # 0=Monday, 6=Sunday
    
    # Rule metadata
    is_active = Column(Boolean, default=True)
    priority = Column(Integer, default=0)  # Higher priority rules apply first
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    property = relationship("Property", back_populates="pricing_rules")
    
    __table_args__ = (
        Index('idx_pricing_rules_property', 'property_id', 'is_active', 'priority'),
        Index('idx_pricing_rules_dates', 'start_date', 'end_date'),
    )


class PropertyReview(Base):
    """Property reviews and ratings"""
    __tablename__ = "property_reviews"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    booking_id = Column(UUID(as_uuid=True))  # Reference to booking
    
    # Ratings (1-5 scale)
    overall_rating = Column(Integer, nullable=False)
    cleanliness_rating = Column(Integer)
    communication_rating = Column(Integer)
    check_in_rating = Column(Integer)
    accuracy_rating = Column(Integer)
    location_rating = Column(Integer)
    value_rating = Column(Integer)
    
    # Review content
    title = Column(String(200))
    comment = Column(Text)
    
    # Review metadata
    is_verified = Column(Boolean, default=False)  # Verified stay
    language = Column(String(5), default="en")
    helpful_votes = Column(Integer, default=0)
    
    # Host response
    host_response = Column(Text)
    host_response_date = Column(DateTime)
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    property = relationship("Property", back_populates="reviews")
    
    __table_args__ = (
        CheckConstraint('overall_rating >= 1 AND overall_rating <= 5', name='check_overall_rating_range'),
        CheckConstraint('cleanliness_rating >= 1 AND cleanliness_rating <= 5', name='check_cleanliness_rating_range'),
        CheckConstraint('communication_rating >= 1 AND communication_rating <= 5', name='check_communication_rating_range'),
        CheckConstraint('location_rating >= 1 AND location_rating <= 5', name='check_location_rating_range'),
        CheckConstraint('value_rating >= 1 AND value_rating <= 5', name='check_value_rating_range'),
        Index('idx_property_reviews_property', 'property_id', 'created_at'),
        Index('idx_property_reviews_user', 'user_id', 'created_at'),
        Index('idx_property_reviews_rating', 'overall_rating', 'is_verified'),
    )