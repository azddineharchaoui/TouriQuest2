"""
Database Utilities

This module provides common database operations and utilities for the TouriQuest application.
"""

import logging
from typing import Optional, List, Dict, Any, Type, TypeVar, Generic
from datetime import datetime, timedelta
from sqlalchemy import text, inspect, and_, or_, func
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from .models.base import BaseModel

logger = logging.getLogger(__name__)

T = TypeVar('T', bound=BaseModel)


class DatabaseRepository(Generic[T]):
    """Generic repository class for database operations"""
    
    def __init__(self, model_class: Type[T], session: Session):
        self.model_class = model_class
        self.session = session
    
    def create(self, **kwargs) -> T:
        """Create a new record"""
        try:
            instance = self.model_class(**kwargs)
            self.session.add(instance)
            self.session.flush()  # Get the ID without committing
            return instance
        except SQLAlchemyError as e:
            logger.error(f"Error creating {self.model_class.__name__}: {e}")
            self.session.rollback()
            raise
    
    def get_by_id(self, id: Any) -> Optional[T]:
        """Get a record by ID"""
        try:
            return self.session.query(self.model_class).filter(
                self.model_class.id == id
            ).first()
        except SQLAlchemyError as e:
            logger.error(f"Error getting {self.model_class.__name__} by ID {id}: {e}")
            return None
    
    def get_by_field(self, field: str, value: Any) -> Optional[T]:
        """Get a record by a specific field"""
        try:
            return self.session.query(self.model_class).filter(
                getattr(self.model_class, field) == value
            ).first()
        except SQLAlchemyError as e:
            logger.error(f"Error getting {self.model_class.__name__} by {field}: {e}")
            return None
    
    def get_all(self, limit: Optional[int] = None, offset: int = 0) -> List[T]:
        """Get all records with pagination"""
        try:
            query = self.session.query(self.model_class)
            if hasattr(self.model_class, 'deleted_at'):
                query = query.filter(self.model_class.deleted_at.is_(None))
            
            query = query.offset(offset)
            if limit:
                query = query.limit(limit)
            
            return query.all()
        except SQLAlchemyError as e:
            logger.error(f"Error getting all {self.model_class.__name__}: {e}")
            return []
    
    def get_by_filters(self, filters: Dict[str, Any], 
                       limit: Optional[int] = None, 
                       offset: int = 0) -> List[T]:
        """Get records by multiple filters"""
        try:
            query = self.session.query(self.model_class)
            
            for field, value in filters.items():
                if hasattr(self.model_class, field):
                    if isinstance(value, list):
                        query = query.filter(getattr(self.model_class, field).in_(value))
                    else:
                        query = query.filter(getattr(self.model_class, field) == value)
            
            if hasattr(self.model_class, 'deleted_at'):
                query = query.filter(self.model_class.deleted_at.is_(None))
            
            query = query.offset(offset)
            if limit:
                query = query.limit(limit)
            
            return query.all()
        except SQLAlchemyError as e:
            logger.error(f"Error getting {self.model_class.__name__} by filters: {e}")
            return []
    
    def update(self, id: Any, **kwargs) -> Optional[T]:
        """Update a record by ID"""
        try:
            instance = self.get_by_id(id)
            if not instance:
                return None
            
            for field, value in kwargs.items():
                if hasattr(instance, field):
                    setattr(instance, field, value)
            
            if hasattr(instance, 'updated_at'):
                instance.updated_at = datetime.utcnow()
            
            self.session.flush()
            return instance
        except SQLAlchemyError as e:
            logger.error(f"Error updating {self.model_class.__name__} {id}: {e}")
            self.session.rollback()
            raise
    
    def delete(self, id: Any, soft_delete: bool = True) -> bool:
        """Delete a record (soft delete by default)"""
        try:
            instance = self.get_by_id(id)
            if not instance:
                return False
            
            if soft_delete and hasattr(instance, 'deleted_at'):
                instance.deleted_at = datetime.utcnow()
                self.session.flush()
            else:
                self.session.delete(instance)
                self.session.flush()
            
            return True
        except SQLAlchemyError as e:
            logger.error(f"Error deleting {self.model_class.__name__} {id}: {e}")
            self.session.rollback()
            raise
    
    def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """Count records with optional filters"""
        try:
            query = self.session.query(func.count(self.model_class.id))
            
            if filters:
                for field, value in filters.items():
                    if hasattr(self.model_class, field):
                        query = query.filter(getattr(self.model_class, field) == value)
            
            if hasattr(self.model_class, 'deleted_at'):
                query = query.filter(self.model_class.deleted_at.is_(None))
            
            return query.scalar()
        except SQLAlchemyError as e:
            logger.error(f"Error counting {self.model_class.__name__}: {e}")
            return 0
    
    def exists(self, **kwargs) -> bool:
        """Check if a record exists"""
        try:
            query = self.session.query(self.model_class.id)
            
            for field, value in kwargs.items():
                if hasattr(self.model_class, field):
                    query = query.filter(getattr(self.model_class, field) == value)
            
            if hasattr(self.model_class, 'deleted_at'):
                query = query.filter(self.model_class.deleted_at.is_(None))
            
            return query.first() is not None
        except SQLAlchemyError as e:
            logger.error(f"Error checking existence of {self.model_class.__name__}: {e}")
            return False


class DatabaseUtils:
    """Utility functions for database operations"""
    
    @staticmethod
    def execute_raw_sql(session: Session, sql: str, params: Optional[Dict] = None) -> Any:
        """Execute raw SQL query"""
        try:
            if params:
                result = session.execute(text(sql), params)
            else:
                result = session.execute(text(sql))
            return result
        except SQLAlchemyError as e:
            logger.error(f"Error executing raw SQL: {e}")
            session.rollback()
            raise
    
    @staticmethod
    def get_table_info(session: Session, table_name: str) -> Dict[str, Any]:
        """Get information about a table"""
        try:
            inspector = inspect(session.bind)
            columns = inspector.get_columns(table_name)
            indexes = inspector.get_indexes(table_name)
            foreign_keys = inspector.get_foreign_keys(table_name)
            
            return {
                'columns': columns,
                'indexes': indexes,
                'foreign_keys': foreign_keys,
            }
        except Exception as e:
            logger.error(f"Error getting table info for {table_name}: {e}")
            return {}
    
    @staticmethod
    def bulk_insert(session: Session, model_class: Type[BaseModel], 
                   data: List[Dict[str, Any]]) -> None:
        """Bulk insert records"""
        try:
            session.bulk_insert_mappings(model_class, data)
            session.flush()
        except SQLAlchemyError as e:
            logger.error(f"Error bulk inserting {model_class.__name__}: {e}")
            session.rollback()
            raise
    
    @staticmethod
    def bulk_update(session: Session, model_class: Type[BaseModel], 
                   data: List[Dict[str, Any]]) -> None:
        """Bulk update records"""
        try:
            session.bulk_update_mappings(model_class, data)
            session.flush()
        except SQLAlchemyError as e:
            logger.error(f"Error bulk updating {model_class.__name__}: {e}")
            session.rollback()
            raise
    
    @staticmethod
    def cleanup_soft_deleted(session: Session, model_class: Type[BaseModel], 
                           days_old: int = 30) -> int:
        """Permanently delete soft-deleted records older than specified days"""
        try:
            if not hasattr(model_class, 'deleted_at'):
                return 0
            
            cutoff_date = datetime.utcnow() - timedelta(days=days_old)
            deleted_count = session.query(model_class).filter(
                and_(
                    model_class.deleted_at.isnot(None),
                    model_class.deleted_at < cutoff_date
                )
            ).delete(synchronize_session=False)
            
            session.flush()
            return deleted_count
        except SQLAlchemyError as e:
            logger.error(f"Error cleaning up soft-deleted {model_class.__name__}: {e}")
            session.rollback()
            raise
    
    @staticmethod
    def get_database_stats(session: Session) -> Dict[str, Any]:
        """Get database statistics"""
        try:
            stats = {}
            
            # Get table sizes (PostgreSQL specific)
            if 'postgresql' in str(session.bind.url):
                result = session.execute(text("""
                    SELECT 
                        schemaname,
                        tablename,
                        attname,
                        n_distinct,
                        correlation
                    FROM pg_stats 
                    WHERE schemaname = 'public'
                """))
                stats['table_stats'] = [dict(row) for row in result]
                
                # Get database size
                result = session.execute(text("""
                    SELECT pg_size_pretty(pg_database_size(current_database())) as size
                """))
                stats['database_size'] = result.scalar()
            
            return stats
        except Exception as e:
            logger.error(f"Error getting database stats: {e}")
            return {}
    
    @staticmethod
    def vacuum_analyze(session: Session, table_name: Optional[str] = None) -> None:
        """Run VACUUM ANALYZE on table(s) - PostgreSQL specific"""
        try:
            if 'postgresql' in str(session.bind.url):
                if table_name:
                    session.execute(text(f"VACUUM ANALYZE {table_name}"))
                else:
                    session.execute(text("VACUUM ANALYZE"))
                session.commit()
        except Exception as e:
            logger.error(f"Error running VACUUM ANALYZE: {e}")
            session.rollback()


class HealthChecker:
    """Database health checking utilities"""
    
    @staticmethod
    def check_connection(session: Session) -> Dict[str, Any]:
        """Check database connection health"""
        try:
            start_time = datetime.utcnow()
            session.execute(text("SELECT 1"))
            end_time = datetime.utcnow()
            
            return {
                'status': 'healthy',
                'response_time_ms': (end_time - start_time).total_seconds() * 1000,
                'timestamp': start_time.isoformat()
            }
        except Exception as e:
            return {
                'status': 'unhealthy',
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }
    
    @staticmethod
    def check_tables(session: Session, required_tables: List[str]) -> Dict[str, Any]:
        """Check if required tables exist"""
        try:
            inspector = inspect(session.bind)
            existing_tables = inspector.get_table_names()
            
            missing_tables = [table for table in required_tables if table not in existing_tables]
            
            return {
                'status': 'healthy' if not missing_tables else 'unhealthy',
                'existing_tables': existing_tables,
                'missing_tables': missing_tables,
                'timestamp': datetime.utcnow().isoformat()
            }
        except Exception as e:
            return {
                'status': 'unhealthy',
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }
    
    @staticmethod
    def check_disk_space(session: Session) -> Dict[str, Any]:
        """Check database disk space - PostgreSQL specific"""
        try:
            if 'postgresql' in str(session.bind.url):
                result = session.execute(text("""
                    SELECT 
                        pg_size_pretty(pg_database_size(current_database())) as database_size,
                        pg_size_pretty(pg_tablespace_size('pg_default')) as tablespace_size
                """))
                row = result.first()
                
                return {
                    'status': 'healthy',
                    'database_size': row[0],
                    'tablespace_size': row[1],
                    'timestamp': datetime.utcnow().isoformat()
                }
            else:
                return {
                    'status': 'unknown',
                    'message': 'Disk space check not supported for this database',
                    'timestamp': datetime.utcnow().isoformat()
                }
        except Exception as e:
            return {
                'status': 'unhealthy',
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }