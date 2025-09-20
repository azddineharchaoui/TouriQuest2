"""
Property-related SQLAlchemy models
"""
from datetime import datetime, date, time
from typing import Optional, List
from enum import Enum as PyEnum
from decimal import Decimal

from sqlalchemy import (
    Column, String, DateTime, Boolean, Text, Integer, Float, Date, Time,
    ForeignKey, Enum, Numeric, UniqueConstraint, CheckConstraint, Index
)
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import relationship, mapped_column, Mapped
from sqlalchemy.ext.hybrid import hybrid_property

from .base import (
    BaseModel, TimestampMixin, SoftDeleteMixin, AuditMixin,
    MetadataMixin, GeolocationMixin, RatingMixin, SearchableMixin
)


class PropertyTypeEnum(PyEnum):
    """Property type enumeration."""
    HOTEL = "hotel"
    APARTMENT = "apartment"
    HOUSE = "house"
    VILLA = "villa"
    RIAD = "riad"
    HOSTEL = "hostel"
    GUESTHOUSE = "guesthouse"
    BOUTIQUE_HOTEL = "boutique_hotel"
    RESORT = "resort"
    CAMPING = "camping"
    OTHER = "other"


class PropertyStatusEnum(PyEnum):
    """Property status enumeration."""
    DRAFT = "draft"
    PENDING_REVIEW = "pending_review"
    ACTIVE = "active"
    PAUSED = "paused"
    SUSPENDED = "suspended"
    REJECTED = "rejected"


class AmenityTypeEnum(PyEnum):
    """Amenity type enumeration."""
    BASIC = "basic"
    KITCHEN = "kitchen"
    BATHROOM = "bathroom"
    BEDROOM = "bedroom"
    ENTERTAINMENT = "entertainment"
    INTERNET = "internet"
    PARKING = "parking"
    SERVICES = "services"
    SAFETY = "safety"
    ACCESSIBILITY = "accessibility"


class CancellationPolicyEnum(PyEnum):
    """Cancellation policy enumeration."""
    FLEXIBLE = "flexible"
    MODERATE = "moderate"
    STRICT = "strict"
    SUPER_STRICT = "super_strict"
    NON_REFUNDABLE = "non_refundable"


class Property(BaseModel, TimestampMixin, SoftDeleteMixin, AuditMixin, 
               GeolocationMixin, RatingMixin, SearchableMixin, MetadataMixin):
    """Property model for accommodations."""
    
    __tablename__ = 'properties'
    
    # Owner information
    host_id: UUID = mapped_column(
        UUID(as_uuid=True),
        ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    
    # Basic information
    title: str = mapped_column(
        String(255),
        nullable=False,
        index=True
    )
    
    description: str = mapped_column(
        Text,
        nullable=False
    )
    
    property_type: PropertyTypeEnum = mapped_column(
        Enum(PropertyTypeEnum),
        nullable=False,
        index=True
    )
    
    # Capacity and rooms
    max_guests: int = mapped_column(
        Integer,
        nullable=False,
        index=True
    )
    
    bedrooms: int = mapped_column(
        Integer,
        nullable=False
    )
    
    bathrooms: float = mapped_column(
        Float,
        nullable=False
    )
    
    beds: int = mapped_column(
        Integer,
        nullable=False
    )
    
    # Property details
    floor_area_sqm: Optional[float] = mapped_column(
        Float,
        nullable=True
    )
    
    year_built: Optional[int] = mapped_column(
        Integer,
        nullable=True
    )
    
    # Status and availability
    status: PropertyStatusEnum = mapped_column(
        Enum(PropertyStatusEnum),
        default=PropertyStatusEnum.DRAFT,
        nullable=False,
        index=True
    )
    
    is_instant_book: bool = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        index=True
    )
    
    minimum_stay_nights: int = mapped_column(
        Integer,
        default=1,
        nullable=False
    )
    
    maximum_stay_nights: Optional[int] = mapped_column(
        Integer,
        nullable=True
    )
    
    # Check-in/out times
    check_in_time: time = mapped_column(
        Time,
        nullable=False
    )
    
    check_out_time: time = mapped_column(
        Time,
        nullable=False
    )
    
    # Cancellation policy
    cancellation_policy: CancellationPolicyEnum = mapped_column(
        Enum(CancellationPolicyEnum),
        default=CancellationPolicyEnum.MODERATE,
        nullable=False
    )
    
    # Verification status
    is_verified: bool = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        index=True
    )
    
    verified_at: Optional[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    
    verified_by: Optional[UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=True
    )
    
    # Performance metrics
    view_count: int = mapped_column(
        Integer,
        default=0,
        nullable=False
    )
    
    booking_count: int = mapped_column(
        Integer,
        default=0,
        nullable=False
    )
    
    # Special features
    is_eco_friendly: bool = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        index=True
    )
    
    is_pet_friendly: bool = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        index=True
    )
    
    is_family_friendly: bool = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        index=True
    )
    
    allows_smoking: bool = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )
    
    # Additional information
    house_rules: Optional[str] = mapped_column(
        Text,
        nullable=True
    )
    
    local_area_info: Optional[str] = mapped_column(
        Text,
        nullable=True
    )
    
    transportation_info: Optional[str] = mapped_column(
        Text,
        nullable=True
    )
    
    # Multi-language support
    languages_spoken: Optional[List[str]] = mapped_column(
        ARRAY(String),
        nullable=True
    )
    
    # Relationships
    host: Mapped["User"] = relationship(
        "User",
        foreign_keys=[host_id]
    )
    
    amenities: Mapped[List["PropertyAmenity"]] = relationship(
        "PropertyAmenity",
        back_populates="property",
        cascade="all, delete-orphan"
    )
    
    images: Mapped[List["PropertyImage"]] = relationship(
        "PropertyImage",
        back_populates="property",
        cascade="all, delete-orphan",
        order_by="PropertyImage.order_index"
    )
    
    pricing: Mapped["PropertyPricing"] = relationship(
        "PropertyPricing",
        back_populates="property",
        uselist=False,
        cascade="all, delete-orphan"
    )
    
    availability: Mapped[List["PropertyAvailability"]] = relationship(
        "PropertyAvailability",
        back_populates="property",
        cascade="all, delete-orphan"
    )
    
    calendar_entries: Mapped[List["PropertyCalendar"]] = relationship(
        "PropertyCalendar",
        back_populates="property",
        cascade="all, delete-orphan"
    )
    
    rules: Mapped[List["PropertyRule"]] = relationship(
        "PropertyRule",
        back_populates="property",
        cascade="all, delete-orphan"
    )
    
    @hybrid_property
    def is_available_for_booking(self) -> bool:
        """Check if property is available for booking."""
        return (
            self.status == PropertyStatusEnum.ACTIVE and 
            self.is_verified and 
            not self.is_deleted
        )
    
    @hybrid_property
    def main_image_url(self) -> Optional[str]:
        """Get the main property image URL."""
        if self.images:
            main_image = next((img for img in self.images if img.is_main), None)
            return main_image.image_url if main_image else self.images[0].image_url
        return None


class PropertyAmenity(BaseModel, TimestampMixin):
    """Property amenities."""
    
    __tablename__ = 'property_amenities'
    
    property_id: UUID = mapped_column(
        UUID(as_uuid=True),
        ForeignKey('properties.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    
    amenity_type: AmenityTypeEnum = mapped_column(
        Enum(AmenityTypeEnum),
        nullable=False,
        index=True
    )
    
    amenity_name: str = mapped_column(
        String(100),
        nullable=False
    )
    
    amenity_code: str = mapped_column(
        String(50),
        nullable=False,
        index=True
    )
    
    description: Optional[str] = mapped_column(
        Text,
        nullable=True
    )
    
    # Amenity details
    is_highlighted: bool = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )
    
    icon_name: Optional[str] = mapped_column(
        String(50),
        nullable=True
    )
    
    # Additional info as JSON
    amenity_details: Optional[dict] = mapped_column(
        JSONB,
        nullable=True
    )
    
    # Relationships
    property: Mapped["Property"] = relationship(
        "Property",
        back_populates="amenities"
    )
    
    __table_args__ = (
        UniqueConstraint('property_id', 'amenity_code', 
                        name='unique_property_amenity'),
    )


class PropertyImage(BaseModel, TimestampMixin):
    """Property images and media."""
    
    __tablename__ = 'property_images'
    
    property_id: UUID = mapped_column(
        UUID(as_uuid=True),
        ForeignKey('properties.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    
    # Image information
    image_url: str = mapped_column(
        String(500),
        nullable=False
    )
    
    thumbnail_url: Optional[str] = mapped_column(
        String(500),
        nullable=True
    )
    
    alt_text: Optional[str] = mapped_column(
        String(255),
        nullable=True
    )
    
    caption: Optional[str] = mapped_column(
        Text,
        nullable=True
    )
    
    # Image properties
    order_index: int = mapped_column(
        Integer,
        default=0,
        nullable=False
    )
    
    is_main: bool = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        index=True
    )
    
    room_type: Optional[str] = mapped_column(
        String(50),
        nullable=True
    )  # bedroom, bathroom, kitchen, living_room, exterior, etc.
    
    # Image metadata
    width: Optional[int] = mapped_column(
        Integer,
        nullable=True
    )
    
    height: Optional[int] = mapped_column(
        Integer,
        nullable=True
    )
    
    file_size: Optional[int] = mapped_column(
        Integer,
        nullable=True
    )
    
    mime_type: Optional[str] = mapped_column(
        String(50),
        nullable=True
    )
    
    # Moderation
    is_approved: bool = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )
    
    # Relationships
    property: Mapped["Property"] = relationship(
        "Property",
        back_populates="images"
    )


class PropertyPricing(BaseModel, TimestampMixin, AuditMixin):
    """Property pricing information."""
    
    __tablename__ = 'property_pricing'
    
    property_id: UUID = mapped_column(
        UUID(as_uuid=True),
        ForeignKey('properties.id', ondelete='CASCADE'),
        nullable=False,
        unique=True,
        index=True
    )
    
    # Base pricing
    base_price: Decimal = mapped_column(
        Numeric(10, 2),
        nullable=False,
        index=True
    )
    
    currency: str = mapped_column(
        String(3),
        default='USD',
        nullable=False
    )
    
    # Additional fees
    cleaning_fee: Optional[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=True
    )
    
    service_fee: Optional[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=True
    )
    
    security_deposit: Optional[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=True
    )
    
    # Discounts
    weekly_discount_percent: Optional[float] = mapped_column(
        Float,
        nullable=True
    )
    
    monthly_discount_percent: Optional[float] = mapped_column(
        Float,
        nullable=True
    )
    
    early_bird_discount_percent: Optional[float] = mapped_column(
        Float,
        nullable=True
    )
    
    # Extra charges
    extra_guest_fee: Optional[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=True
    )
    
    extra_guest_threshold: Optional[int] = mapped_column(
        Integer,
        nullable=True
    )
    
    # Dynamic pricing
    use_dynamic_pricing: bool = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )
    
    minimum_price: Optional[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=True
    )
    
    maximum_price: Optional[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=True
    )
    
    # Pricing rules (JSON)
    pricing_rules: Optional[dict] = mapped_column(
        JSONB,
        nullable=True
    )
    
    # Relationships
    property: Mapped["Property"] = relationship(
        "Property",
        back_populates="pricing"
    )


class PropertyAvailability(BaseModel, TimestampMixin):
    """Property availability calendar."""
    
    __tablename__ = 'property_availability'
    
    property_id: UUID = mapped_column(
        UUID(as_uuid=True),
        ForeignKey('properties.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    
    # Date information
    date: date = mapped_column(
        Date,
        nullable=False,
        index=True
    )
    
    # Availability status
    is_available: bool = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        index=True
    )
    
    # Pricing for this date
    price_override: Optional[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=True
    )
    
    # Availability restrictions
    minimum_stay_override: Optional[int] = mapped_column(
        Integer,
        nullable=True
    )
    
    # Booking status
    is_blocked: bool = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )
    
    block_reason: Optional[str] = mapped_column(
        String(255),
        nullable=True
    )
    
    # Related booking
    booking_id: Optional[UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
        index=True
    )
    
    # Notes
    notes: Optional[str] = mapped_column(
        Text,
        nullable=True
    )
    
    # Relationships
    property: Mapped["Property"] = relationship(
        "Property",
        back_populates="availability"
    )
    
    __table_args__ = (
        UniqueConstraint('property_id', 'date', name='unique_property_date'),
    )


class PropertyCalendar(BaseModel, TimestampMixin):
    """Property calendar events and blocked dates."""
    
    __tablename__ = 'property_calendar'
    
    property_id: UUID = mapped_column(
        UUID(as_uuid=True),
        ForeignKey('properties.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    
    # Event information
    title: str = mapped_column(
        String(255),
        nullable=False
    )
    
    description: Optional[str] = mapped_column(
        Text,
        nullable=True
    )
    
    # Date range
    start_date: date = mapped_column(
        Date,
        nullable=False,
        index=True
    )
    
    end_date: date = mapped_column(
        Date,
        nullable=False,
        index=True
    )
    
    # Event type
    event_type: str = mapped_column(
        String(50),
        nullable=False,
        index=True
    )  # booking, maintenance, personal_use, seasonal_closure
    
    # Availability impact
    blocks_availability: bool = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )
    
    # Recurring events
    is_recurring: bool = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )
    
    recurrence_pattern: Optional[dict] = mapped_column(
        JSONB,
        nullable=True
    )
    
    # Relationships
    property: Mapped["Property"] = relationship(
        "Property",
        back_populates="calendar_entries"
    )


class PropertyRule(BaseModel, TimestampMixin):
    """Property house rules and policies."""
    
    __tablename__ = 'property_rules'
    
    property_id: UUID = mapped_column(
        UUID(as_uuid=True),
        ForeignKey('properties.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    
    # Rule information
    rule_type: str = mapped_column(
        String(50),
        nullable=False,
        index=True
    )  # house_rule, safety_feature, accessibility, policy
    
    rule_category: str = mapped_column(
        String(50),
        nullable=False
    )
    
    title: str = mapped_column(
        String(255),
        nullable=False
    )
    
    description: str = mapped_column(
        Text,
        nullable=False
    )
    
    # Rule importance
    is_mandatory: bool = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )
    
    severity_level: str = mapped_column(
        String(20),
        default='medium',
        nullable=False
    )  # low, medium, high, critical
    
    # Display order
    display_order: int = mapped_column(
        Integer,
        default=0,
        nullable=False
    )
    
    # Icon for display
    icon_name: Optional[str] = mapped_column(
        String(50),
        nullable=True
    )
    
    # Relationships
    property: Mapped["Property"] = relationship(
        "Property",
        back_populates="rules"
    )


# Database indexes for performance
property_indexes = [
    Index('ix_properties_search', Property.status, Property.is_verified, 
          Property.property_type, Property.max_guests),
    Index('ix_properties_location_type', Property.country_code, Property.city, 
          Property.property_type),
    Index('ix_properties_rating', Property.average_rating.desc(), 
          Property.total_ratings.desc()),
    Index('ix_properties_host_status', Property.host_id, Property.status),
    Index('ix_property_availability_date', PropertyAvailability.property_id, 
          PropertyAvailability.date, PropertyAvailability.is_available),
    Index('ix_property_calendar_dates', PropertyCalendar.property_id,
          PropertyCalendar.start_date, PropertyCalendar.end_date),
    Index('ix_property_images_main', PropertyImage.property_id, 
          PropertyImage.is_main, PropertyImage.order_index),
]