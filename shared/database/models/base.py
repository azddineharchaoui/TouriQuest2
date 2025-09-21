"""
Base Database Models and Mixins

This module contains the base model class and common mixins used throughout
the TouriQuest application.
"""

import uuid
from datetime import datetime
from typing import Optional, Any, Dict
from sqlalchemy import Column, String, DateTime, Boolean, Text, Integer, Float, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.declarative import declarative_base, declared_attr
from sqlalchemy.sql import func
from sqlalchemy.orm import validates


# Create the base class for all models
Base = declarative_base()


class BaseModel(Base):
    """Base model with common fields and functionality"""
    
    __abstract__ = True
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    @declared_attr
    def __tablename__(cls):
        """Generate table name from class name"""
        return cls.__name__.lower()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert model instance to dictionary"""
        return {
            column.name: getattr(self, column.name)
            for column in self.__table__.columns
        }
    
    def update(self, **kwargs) -> None:
        """Update model instance with provided data"""
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
    
    def __repr__(self) -> str:
        return f"<{self.__class__.__name__}(id={self.id})>"


class TimestampMixin:
    """Mixin for timestamp fields"""
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class SoftDeleteMixin:
    """Mixin for soft deletion"""
    
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    is_deleted = Column(Boolean, default=False, nullable=False)
    
    def soft_delete(self):
        """Mark record as deleted"""
        self.is_deleted = True
        self.deleted_at = datetime.utcnow()
    
    def restore(self):
        """Restore soft-deleted record"""
        self.is_deleted = False
        self.deleted_at = None


class AuditMixin:
    """Mixin for audit fields"""
    
    created_by = Column(UUID(as_uuid=True), nullable=True)
    updated_by = Column(UUID(as_uuid=True), nullable=True)
    version = Column(Integer, default=1, nullable=False)


class MetadataMixin:
    """Mixin for metadata fields"""
    
    metadata_json = Column(Text, nullable=True)
    tags = Column(Text, nullable=True)  # Comma-separated tags
    notes = Column(Text, nullable=True)


class GeolocationMixin:
    """Mixin for geolocation fields"""
    
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    address = Column(String(500), nullable=True)
    city = Column(String(100), nullable=True)
    country = Column(String(100), nullable=True)
    postal_code = Column(String(20), nullable=True)
    
    @validates('latitude')
    def validate_latitude(self, key, latitude):
        if latitude is not None and not (-90 <= latitude <= 90):
            raise ValueError("Latitude must be between -90 and 90")
        return latitude
    
    @validates('longitude')
    def validate_longitude(self, key, longitude):
        if longitude is not None and not (-180 <= longitude <= 180):
            raise ValueError("Longitude must be between -180 and 180")
        return longitude


class RatingMixin:
    """Mixin for rating fields"""
    
    rating = Column(Float, nullable=True)
    rating_count = Column(Integer, default=0, nullable=False)
    rating_sum = Column(Float, default=0.0, nullable=False)
    
    @validates('rating')
    def validate_rating(self, key, rating):
        if rating is not None and not (0 <= rating <= 5):
            raise ValueError("Rating must be between 0 and 5")
        return rating
    
    def update_rating(self, new_rating: float):
        """Update average rating with new rating"""
        if not (0 <= new_rating <= 5):
            raise ValueError("Rating must be between 0 and 5")
        
        self.rating_sum += new_rating
        self.rating_count += 1
        self.rating = self.rating_sum / self.rating_count


class SearchableMixin:
    """Mixin for search functionality"""
    
    search_vector = Column(Text, nullable=True)  # For full-text search
    search_tags = Column(Text, nullable=True)    # For tag-based search


class CommonIndexes:
    """Common database indexes"""
    
    @staticmethod
    def timestamp_indexes(table_name: str):
        """Create timestamp indexes"""
        return [
            Index(f"idx_{table_name}_created_at", "created_at"),
            Index(f"idx_{table_name}_updated_at", "updated_at"),
        ]
    
    @staticmethod
    def soft_delete_index(table_name: str):
        """Create soft delete index"""
        return Index(f"idx_{table_name}_is_deleted", "is_deleted")
    
    @staticmethod
    def geolocation_indexes(table_name: str):
        """Create geolocation indexes"""
        return [
            Index(f"idx_{table_name}_latitude", "latitude"),
            Index(f"idx_{table_name}_longitude", "longitude"),
            Index(f"idx_{table_name}_city", "city"),
            Index(f"idx_{table_name}_country", "country"),
        ]
    
    @staticmethod
    def rating_index(table_name: str):
        """Create rating index"""
        return Index(f"idx_{table_name}_rating", "rating")


# Export the base for other modules
__all__ = [
    'Base',
    'BaseModel',
    'TimestampMixin',
    'SoftDeleteMixin',
    'AuditMixin',
    'MetadataMixin',
    'GeolocationMixin',
    'RatingMixin',
    'SearchableMixin',
    'CommonIndexes'
]