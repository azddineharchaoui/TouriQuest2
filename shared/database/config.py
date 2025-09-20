"""
Database Configuration and Session Management

This module handles database connection configuration, session management,
and provides utilities for database operations.
"""

import os
import logging
from typing import Optional, Generator
from contextlib import contextmanager
from sqlalchemy import create_engine, Engine, event
from sqlalchemy.orm import sessionmaker, Session, scoped_session
from sqlalchemy.pool import StaticPool, QueuePool
from sqlalchemy.engine import URL

from .models.base import BaseModel

logger = logging.getLogger(__name__)


class DatabaseConfig:
    """Database configuration management"""
    
    def __init__(self):
        self.database_url = self._get_database_url()
        self.echo = os.getenv("DB_ECHO", "false").lower() == "true"
        self.pool_size = int(os.getenv("DB_POOL_SIZE", "10"))
        self.max_overflow = int(os.getenv("DB_MAX_OVERFLOW", "20"))
        self.pool_timeout = int(os.getenv("DB_POOL_TIMEOUT", "30"))
        self.pool_recycle = int(os.getenv("DB_POOL_RECYCLE", "3600"))
        
    def _get_database_url(self) -> str:
        """Get database URL from environment variables"""
        # Try direct DATABASE_URL first
        database_url = os.getenv("DATABASE_URL")
        if database_url:
            return database_url
            
        # Build from components
        host = os.getenv("DB_HOST", "localhost")
        port = int(os.getenv("DB_PORT", "5432"))
        username = os.getenv("DB_USERNAME", "postgres")
        password = os.getenv("DB_PASSWORD", "")
        database = os.getenv("DB_NAME", "touriquest")
        
        return f"postgresql://{username}:{password}@{host}:{port}/{database}"
    
    def get_engine_kwargs(self) -> dict:
        """Get SQLAlchemy engine configuration"""
        return {
            "echo": self.echo,
            "pool_size": self.pool_size,
            "max_overflow": self.max_overflow,
            "pool_timeout": self.pool_timeout,
            "pool_recycle": self.pool_recycle,
            "poolclass": QueuePool,
        }


class DatabaseManager:
    """Database manager for handling connections and sessions"""
    
    def __init__(self, config: Optional[DatabaseConfig] = None):
        self.config = config or DatabaseConfig()
        self._engine: Optional[Engine] = None
        self._session_factory: Optional[sessionmaker] = None
        self._scoped_session: Optional[scoped_session] = None
        
    @property
    def engine(self) -> Engine:
        """Get or create database engine"""
        if self._engine is None:
            self._engine = create_engine(
                self.config.database_url,
                **self.config.get_engine_kwargs()
            )
            
            # Add engine event listeners
            self._setup_engine_events(self._engine)
            
        return self._engine
    
    @property
    def session_factory(self) -> sessionmaker:
        """Get or create session factory"""
        if self._session_factory is None:
            self._session_factory = sessionmaker(
                bind=self.engine,
                expire_on_commit=False,
                autoflush=True,
                autocommit=False
            )
        return self._session_factory
    
    @property
    def scoped_session_factory(self) -> scoped_session:
        """Get or create scoped session factory"""
        if self._scoped_session is None:
            self._scoped_session = scoped_session(self.session_factory)
        return self._scoped_session
    
    def _setup_engine_events(self, engine: Engine) -> None:
        """Setup engine event listeners"""
        
        @event.listens_for(engine, "connect")
        def set_sqlite_pragma(dbapi_connection, connection_record):
            """Set pragmas for SQLite connections"""
            if "sqlite" in str(engine.url):
                cursor = dbapi_connection.cursor()
                cursor.execute("PRAGMA foreign_keys=ON")
                cursor.close()
        
        @event.listens_for(engine, "before_cursor_execute")
        def log_sql(conn, cursor, statement, parameters, context, executemany):
            """Log SQL statements in debug mode"""
            if logger.isEnabledFor(logging.DEBUG):
                logger.debug(f"SQL: {statement}")
                if parameters:
                    logger.debug(f"Parameters: {parameters}")
    
    def create_all_tables(self) -> None:
        """Create all database tables"""
        try:
            BaseModel.metadata.create_all(bind=self.engine)
            logger.info("All database tables created successfully")
        except Exception as e:
            logger.error(f"Failed to create database tables: {e}")
            raise
    
    def drop_all_tables(self) -> None:
        """Drop all database tables (use with caution!)"""
        try:
            BaseModel.metadata.drop_all(bind=self.engine)
            logger.warning("All database tables dropped")
        except Exception as e:
            logger.error(f"Failed to drop database tables: {e}")
            raise
    
    def get_session(self) -> Session:
        """Get a new database session"""
        return self.session_factory()
    
    @contextmanager
    def session_scope(self) -> Generator[Session, None, None]:
        """Provide a transactional scope around a series of operations"""
        session = self.get_session()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()
    
    def test_connection(self) -> bool:
        """Test database connection"""
        try:
            with self.engine.connect() as connection:
                connection.execute("SELECT 1")
            logger.info("Database connection test successful")
            return True
        except Exception as e:
            logger.error(f"Database connection test failed: {e}")
            return False
    
    def close(self) -> None:
        """Close database connections"""
        if self._scoped_session:
            self._scoped_session.remove()
        if self._engine:
            self._engine.dispose()
        logger.info("Database connections closed")


# Global database manager instance
db_manager = DatabaseManager()

# Convenience functions
def get_engine() -> Engine:
    """Get the global database engine"""
    return db_manager.engine

def get_session() -> Session:
    """Get a new database session"""
    return db_manager.get_session()

def get_scoped_session() -> scoped_session:
    """Get the global scoped session"""
    return db_manager.scoped_session_factory

@contextmanager
def session_scope() -> Generator[Session, None, None]:
    """Convenience function for session scope"""
    with db_manager.session_scope() as session:
        yield session

def init_database() -> None:
    """Initialize the database"""
    db_manager.create_all_tables()

def test_database_connection() -> bool:
    """Test the database connection"""
    return db_manager.test_connection()

def close_database() -> None:
    """Close database connections"""
    db_manager.close()


# Database session dependency for FastAPI
def get_db_session() -> Generator[Session, None, None]:
    """Database session dependency for FastAPI dependency injection"""
    with session_scope() as session:
        yield session