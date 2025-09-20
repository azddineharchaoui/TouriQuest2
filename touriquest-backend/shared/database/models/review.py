"""
Review-related SQLAlchemy models
"""
from datetime import datetime
from typing import Optional, List
from enum import Enum as PyEnum

from sqlalchemy import (
    Column, String, DateTime, Boolean, Text, Integer, Float,
    ForeignKey, Enum, UniqueConstraint, CheckConstraint, Index
)
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import relationship, mapped_column, Mapped
from sqlalchemy.ext.hybrid import hybrid_property

from .base import (
    BaseModel, TimestampMixin, SoftDeleteMixin, AuditMixin,
    MetadataMixin, SearchableMixin
)


class ReviewTypeEnum(PyEnum):
    """Review type enumeration."""
    PROPERTY = "property"
    EXPERIENCE = "experience"
    POI = "poi"
    USER = "user"  # Host/guide reviews


class ReviewStatusEnum(PyEnum):
    """Review status enumeration."""
    PENDING = "pending"
    PUBLISHED = "published"
    HIDDEN = "hidden"
    FLAGGED = "flagged"
    REMOVED = "removed"


class Review(BaseModel, TimestampMixin, SoftDeleteMixin, AuditMixin,
             SearchableMixin, MetadataMixin):
    """Review model for properties, experiences, POIs, and users."""
    
    __tablename__ = 'reviews'
    
    # Reviewer
    reviewer_id: UUID = mapped_column(
        UUID(as_uuid=True),
        ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    
    # Review target (polymorphic relationship)
    review_type: ReviewTypeEnum = mapped_column(
        Enum(ReviewTypeEnum),
        nullable=False,
        index=True
    )
    
    # Target IDs (only one should be set based on review_type)
    property_id: Optional[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey('properties.id', ondelete='CASCADE'),
        nullable=True,
        index=True
    )
    
    experience_id: Optional[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey('experiences.id', ondelete='CASCADE'),
        nullable=True,
        index=True
    )
    
    poi_id: Optional[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey('pois.id', ondelete='CASCADE'),
        nullable=True,
        index=True
    )
    
    reviewed_user_id: Optional[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey('users.id', ondelete='CASCADE'),
        nullable=True,
        index=True
    )
    
    # Related booking (if applicable)
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
    
    # Review content
    title: Optional[str] = mapped_column(
        String(255),
        nullable=True
    )
    
    comment: str = mapped_column(
        Text,
        nullable=False
    )
    
    # Overall rating (1-5 stars)
    overall_rating: int = mapped_column(
        Integer,
        nullable=False,
        index=True
    )
    
    # Detailed ratings (property-specific)
    cleanliness_rating: Optional[int] = mapped_column(
        Integer,
        nullable=True
    )
    
    accuracy_rating: Optional[int] = mapped_column(
        Integer,
        nullable=True
    )
    
    communication_rating: Optional[int] = mapped_column(
        Integer,
        nullable=True
    )
    
    location_rating: Optional[int] = mapped_column(
        Integer,
        nullable=True
    )
    
    value_rating: Optional[int] = mapped_column(
        Integer,
        nullable=True
    )
    
    checkin_rating: Optional[int] = mapped_column(
        Integer,
        nullable=True
    )
    
    # Experience-specific ratings
    guide_rating: Optional[int] = mapped_column(
        Integer,
        nullable=True
    )
    
    organization_rating: Optional[int] = mapped_column(
        Integer,
        nullable=True
    )
    
    entertainment_rating: Optional[int] = mapped_column(
        Integer,
        nullable=True
    )
    
    safety_rating: Optional[int] = mapped_column(
        Integer,
        nullable=True
    )
    
    # Review status
    status: ReviewStatusEnum = mapped_column(
        Enum(ReviewStatusEnum),
        default=ReviewStatusEnum.PENDING,
        nullable=False,
        index=True
    )
    
    # Moderation
    is_verified_stay: bool = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )
    
    is_featured: bool = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        index=True
    )
    
    moderated_by: Optional[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey('users.id'),
        nullable=True
    )
    
    moderated_at: Optional[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    
    moderation_notes: Optional[str] = mapped_column(
        Text,
        nullable=True
    )
    
    # Language and localization
    language_code: str = mapped_column(
        String(10),
        default='en',
        nullable=False,
        index=True
    )
    
    # Interaction metrics
    helpful_count: int = mapped_column(
        Integer,
        default=0,
        nullable=False
    )
    
    not_helpful_count: int = mapped_column(
        Integer,
        default=0,
        nullable=False
    )
    
    report_count: int = mapped_column(
        Integer,
        default=0,
        nullable=False
    )
    
    # Response from host/provider
    has_response: bool = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )
    
    response_text: Optional[str] = mapped_column(
        Text,
        nullable=True
    )
    
    response_date: Optional[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    
    # Visit details
    visit_date: Optional[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    
    visit_type: Optional[str] = mapped_column(
        String(50),
        nullable=True
    )  # solo, couple, family, friends, business
    
    # Review authenticity
    authenticity_score: Optional[float] = mapped_column(
        Float,
        nullable=True
    )
    
    is_suspected_fake: bool = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )
    
    # Relationships
    reviewer: Mapped["User"] = relationship(
        "User",
        foreign_keys=[reviewer_id]
    )
    
    property: Mapped[Optional["Property"]] = relationship(
        "Property",
        foreign_keys=[property_id]
    )
    
    experience: Mapped[Optional["Experience"]] = relationship(
        "Experience",
        foreign_keys=[experience_id]
    )
    
    poi: Mapped[Optional["POI"]] = relationship(
        "POI",
        foreign_keys=[poi_id]
    )
    
    reviewed_user: Mapped[Optional["User"]] = relationship(
        "User",
        foreign_keys=[reviewed_user_id]
    )
    
    booking: Mapped[Optional["Booking"]] = relationship(
        "Booking",
        foreign_keys=[booking_id]
    )
    
    experience_booking: Mapped[Optional["ExperienceBooking"]] = relationship(
        "ExperienceBooking",
        foreign_keys=[experience_booking_id]
    )
    
    moderator: Mapped[Optional["User"]] = relationship(
        "User",
        foreign_keys=[moderated_by]
    )
    
    images: Mapped[List["ReviewImage"]] = relationship(
        "ReviewImage",
        back_populates="review",
        cascade="all, delete-orphan"
    )
    
    helpful_votes: Mapped[List["ReviewHelpful"]] = relationship(
        "ReviewHelpful",
        back_populates="review",
        cascade="all, delete-orphan"
    )
    
    translations: Mapped[List["ReviewTranslation"]] = relationship(
        "ReviewTranslation",
        back_populates="review",
        cascade="all, delete-orphan"
    )
    
    @hybrid_property
    def helpfulness_ratio(self) -> float:
        """Calculate helpfulness ratio."""
        total_votes = self.helpful_count + self.not_helpful_count
        if total_votes == 0:
            return 0.0
        return self.helpful_count / total_votes
    
    @hybrid_property
    def detailed_ratings_average(self) -> Optional[float]:
        """Calculate average of detailed ratings."""
        ratings = [
            r for r in [
                self.cleanliness_rating,
                self.accuracy_rating,
                self.communication_rating,
                self.location_rating,
                self.value_rating,
                self.checkin_rating
            ] if r is not None
        ]
        
        if not ratings:
            return None
        
        return sum(ratings) / len(ratings)
    
    __table_args__ = (
        CheckConstraint('overall_rating >= 1 AND overall_rating <= 5', 
                       name='check_valid_overall_rating'),
        CheckConstraint(
            '(review_type = \'property\' AND property_id IS NOT NULL) OR '
            '(review_type = \'experience\' AND experience_id IS NOT NULL) OR '
            '(review_type = \'poi\' AND poi_id IS NOT NULL) OR '
            '(review_type = \'user\' AND reviewed_user_id IS NOT NULL)',
            name='check_review_target_consistency'
        ),
        # Ensure only one target is set
        CheckConstraint(
            '(property_id IS NOT NULL)::int + '
            '(experience_id IS NOT NULL)::int + '
            '(poi_id IS NOT NULL)::int + '
            '(reviewed_user_id IS NOT NULL)::int = 1',
            name='check_single_review_target'
        ),
    )


class ReviewImage(BaseModel, TimestampMixin):
    """Review images uploaded by reviewers."""
    
    __tablename__ = 'review_images'
    
    review_id: UUID = mapped_column(
        UUID(as_uuid=True),
        ForeignKey('reviews.id', ondelete='CASCADE'),
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
    
    # Content verification
    is_approved: bool = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )
    
    is_featured: bool = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )
    
    # Content moderation
    content_warning: Optional[str] = mapped_column(
        String(100),
        nullable=True
    )
    
    # Relationships
    review: Mapped["Review"] = relationship(
        "Review",
        back_populates="images"
    )


class ReviewHelpful(BaseModel, TimestampMixin):
    """Review helpfulness votes."""
    
    __tablename__ = 'review_helpful'
    
    review_id: UUID = mapped_column(
        UUID(as_uuid=True),
        ForeignKey('reviews.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    
    user_id: UUID = mapped_column(
        UUID(as_uuid=True),
        ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    
    # Vote value
    is_helpful: bool = mapped_column(
        Boolean,
        nullable=False
    )  # True for helpful, False for not helpful
    
    # Additional feedback
    feedback_reason: Optional[str] = mapped_column(
        String(100),
        nullable=True
    )
    
    # Relationships
    review: Mapped["Review"] = relationship(
        "Review",
        back_populates="helpful_votes"
    )
    
    user: Mapped["User"] = relationship(
        "User",
        foreign_keys=[user_id]
    )
    
    __table_args__ = (
        UniqueConstraint('review_id', 'user_id', name='unique_review_vote'),
    )


class ReviewTranslation(BaseModel, TimestampMixin):
    """Review content translations."""
    
    __tablename__ = 'review_translations'
    
    review_id: UUID = mapped_column(
        UUID(as_uuid=True),
        ForeignKey('reviews.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    
    language_code: str = mapped_column(
        String(10),
        nullable=False,
        index=True
    )
    
    language_name: str = mapped_column(
        String(50),
        nullable=False
    )
    
    # Translated content
    title: Optional[str] = mapped_column(
        String(255),
        nullable=True
    )
    
    comment: str = mapped_column(
        Text,
        nullable=False
    )
    
    response_text: Optional[str] = mapped_column(
        Text,
        nullable=True
    )
    
    # Translation metadata
    translator_name: Optional[str] = mapped_column(
        String(255),
        nullable=True
    )
    
    translation_quality: Optional[float] = mapped_column(
        Float,
        nullable=True
    )
    
    is_machine_translated: bool = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )
    
    is_reviewed: bool = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )
    
    reviewed_by: Optional[UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=True
    )
    
    # Relationships
    review: Mapped["Review"] = relationship(
        "Review",
        back_populates="translations"
    )
    
    __table_args__ = (
        UniqueConstraint('review_id', 'language_code', 
                        name='unique_review_translation'),
    )


# Database indexes for performance
review_indexes = [
    Index('ix_reviews_target_rating', Review.review_type, Review.overall_rating.desc()),
    Index('ix_reviews_property_rating', Review.property_id, Review.overall_rating.desc(),
          Review.status),
    Index('ix_reviews_experience_rating', Review.experience_id, Review.overall_rating.desc(),
          Review.status),
    Index('ix_reviews_poi_rating', Review.poi_id, Review.overall_rating.desc(),
          Review.status),
    Index('ix_reviews_user_rating', Review.reviewed_user_id, Review.overall_rating.desc(),
          Review.status),
    Index('ix_reviews_status_featured', Review.status, Review.is_featured),
    Index('ix_reviews_language_status', Review.language_code, Review.status),
    Index('ix_reviews_helpful_count', Review.helpful_count.desc()),
    Index('ix_review_helpful_user', ReviewHelpful.user_id, ReviewHelpful.review_id),
]