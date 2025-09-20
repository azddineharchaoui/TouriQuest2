"""
Base SQLAlchemy models with common functionality
"""
import uuid
from datetime import datetime
from typing import Any, Dict, Optional

from sqlalchemy import (
    Column, String, DateTime, Boolean, Text, Integer,
    func, event, Index
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.ext.declarative import declared_attr
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import DeclarativeBase, mapped_column


class BaseModel(DeclarativeBase):
    """Base model class with common functionality for all models."""
    
    # Common columns for all models
    id: uuid.UUID = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )
    
    @declared_attr
    def __tablename__(cls) -> str:
        """Generate table name from class name."""
        return cls.__name__.lower() + 's'
    
    def to_dict(self, exclude: Optional[list] = None) -> Dict[str, Any]:
        """Convert model instance to dictionary."""
        exclude = exclude or []
        result = {}
        
        for column in self.__table__.columns:
            if column.name not in exclude:
                value = getattr(self, column.name)
                if isinstance(value, datetime):
                    value = value.isoformat()
                elif isinstance(value, uuid.UUID):
                    value = str(value)
                result[column.name] = value
        
        return result
    
    def update_from_dict(self, data: Dict[str, Any]) -> None:
        """Update model instance from dictionary."""
        for key, value in data.items():
            if hasattr(self, key):
                setattr(self, key, value)
    
    def __repr__(self) -> str:
        """String representation of the model."""
        return f"<{self.__class__.__name__}(id={self.id})>"


class TimestampMixin:
    """Mixin for adding created_at and updated_at timestamps."""
    
    created_at: datetime = mapped_column(
        DateTime(timezone=True),
        default=func.now(),
        nullable=False,
        index=True
    )
    
    updated_at: datetime = mapped_column(
        DateTime(timezone=True),
        default=func.now(),
        onupdate=func.now(),
        nullable=False,
        index=True
    )


class SoftDeleteMixin:
    """Mixin for soft delete functionality."""
    
    deleted_at: Optional[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True
    )
    
    is_deleted: bool = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        index=True
    )
    
    @hybrid_property
    def is_active(self) -> bool:
        """Check if record is active (not soft deleted)."""
        return not self.is_deleted
    
    def soft_delete(self) -> None:
        """Soft delete the record."""
        self.is_deleted = True
        self.deleted_at = func.now()
    
    def restore(self) -> None:
        """Restore soft deleted record."""
        self.is_deleted = False
        self.deleted_at = None


class AuditMixin:
    """Mixin for audit trail functionality."""
    
    created_by: Optional[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
        index=True
    )
    
    updated_by: Optional[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
        index=True
    )
    
    version: int = mapped_column(
        Integer,
        default=1,
        nullable=False
    )


class MetadataMixin:
    """Mixin for storing flexible metadata as JSON."""
    
    metadata_: Optional[Dict[str, Any]] = mapped_column(
        'metadata',
        JSONB,
        nullable=True
    )
    
    tags: Optional[list] = mapped_column(
        JSONB,
        nullable=True
    )
    
    def add_metadata(self, key: str, value: Any) -> None:
        """Add metadata key-value pair."""
        if self.metadata_ is None:
            self.metadata_ = {}
        self.metadata_[key] = value
    
    def get_metadata(self, key: str, default: Any = None) -> Any:
        """Get metadata value by key."""
        if self.metadata_ is None:
            return default
        return self.metadata_.get(key, default)
    
    def add_tag(self, tag: str) -> None:
        """Add a tag to the tags list."""
        if self.tags is None:
            self.tags = []
        if tag not in self.tags:
            self.tags.append(tag)
    
    def remove_tag(self, tag: str) -> None:
        """Remove a tag from the tags list."""
        if self.tags and tag in self.tags:
            self.tags.remove(tag)


class GeolocationMixin:
    """Mixin for geolocation functionality."""
    
    latitude: Optional[float] = mapped_column(
        nullable=True,
        index=True
    )
    
    longitude: Optional[float] = mapped_column(
        nullable=True,
        index=True
    )
    
    address: Optional[str] = mapped_column(
        Text,
        nullable=True
    )
    
    city: Optional[str] = mapped_column(
        String(100),
        nullable=True,
        index=True
    )
    
    country: Optional[str] = mapped_column(
        String(100),
        nullable=True,
        index=True
    )
    
    country_code: Optional[str] = mapped_column(
        String(2),
        nullable=True,
        index=True
    )
    
    timezone: Optional[str] = mapped_column(
        String(50),
        nullable=True
    )
    
    @hybrid_property
    def coordinates(self) -> Optional[tuple]:
        """Get coordinates as tuple (latitude, longitude)."""
        if self.latitude is not None and self.longitude is not None:
            return (self.latitude, self.longitude)
        return None
    
    def set_coordinates(self, latitude: float, longitude: float) -> None:
        """Set coordinates from latitude and longitude."""
        self.latitude = latitude
        self.longitude = longitude


class RatingMixin:
    """Mixin for rating functionality."""
    
    average_rating: Optional[float] = mapped_column(
        nullable=True,
        index=True
    )
    
    total_ratings: int = mapped_column(
        Integer,
        default=0,
        nullable=False
    )
    
    rating_1_count: int = mapped_column(Integer, default=0)
    rating_2_count: int = mapped_column(Integer, default=0)
    rating_3_count: int = mapped_column(Integer, default=0)
    rating_4_count: int = mapped_column(Integer, default=0)
    rating_5_count: int = mapped_column(Integer, default=0)
    
    def update_rating(self, new_rating: int, old_rating: Optional[int] = None) -> None:
        """Update rating statistics."""
        # Remove old rating if exists
        if old_rating:
            setattr(self, f'rating_{old_rating}_count', 
                   getattr(self, f'rating_{old_rating}_count') - 1)
            self.total_ratings -= 1
        
        # Add new rating
        setattr(self, f'rating_{new_rating}_count', 
               getattr(self, f'rating_{new_rating}_count') + 1)
        self.total_ratings += 1
        
        # Recalculate average
        total_score = (
            self.rating_1_count * 1 +
            self.rating_2_count * 2 +
            self.rating_3_count * 3 +
            self.rating_4_count * 4 +
            self.rating_5_count * 5
        )
        
        if self.total_ratings > 0:
            self.average_rating = total_score / self.total_ratings
        else:
            self.average_rating = None


class SearchableMixin:
    """Mixin for full-text search functionality."""
    
    search_vector: Optional[str] = mapped_column(
        Text,
        nullable=True
    )
    
    def update_search_vector(self, *fields) -> None:
        """Update search vector from specified fields."""
        search_text = ' '.join(str(getattr(self, field, '')) for field in fields)
        self.search_vector = search_text.lower()


# Database event listeners for automatic functionality
@event.listens_for(AuditMixin, 'before_insert', propagate=True)
def receive_before_insert(mapper, connection, target):
    """Set version to 1 on insert."""
    target.version = 1


@event.listens_for(AuditMixin, 'before_update', propagate=True)  
def receive_before_update(mapper, connection, target):
    """Increment version on update."""
    target.version = (target.version or 0) + 1


# Composite indexes for common query patterns
class CommonIndexes:
    """Common database indexes for performance optimization."""
    
    @staticmethod
    def create_timestamp_indexes(model_class):
        """Create indexes for timestamp queries."""
        return [
            Index(f'ix_{model_class.__tablename__}_created_at_desc', 
                 model_class.created_at.desc()),
            Index(f'ix_{model_class.__tablename__}_updated_at_desc', 
                 model_class.updated_at.desc()),
        ]
    
    @staticmethod
    def create_soft_delete_indexes(model_class):
        """Create indexes for soft delete queries."""
        return [
            Index(f'ix_{model_class.__tablename__}_active', 
                 model_class.is_deleted, model_class.deleted_at),
        ]
    
    @staticmethod
    def create_geolocation_indexes(model_class):
        """Create indexes for geolocation queries."""
        return [
            Index(f'ix_{model_class.__tablename__}_coordinates', 
                 model_class.latitude, model_class.longitude),
            Index(f'ix_{model_class.__tablename__}_location', 
                 model_class.country_code, model_class.city),
        ]
    
    @staticmethod
    def create_rating_indexes(model_class):
        """Create indexes for rating queries."""
        return [
            Index(f'ix_{model_class.__tablename__}_rating', 
                 model_class.average_rating.desc(), model_class.total_ratings.desc()),
        ]