"""
Database configuration and setup for Analytics Service
"""

import asyncio
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
    AsyncEngine,
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.pool import NullPool
from sqlalchemy import event
from sqlalchemy.engine import Engine
import logging

from .config import settings

logger = logging.getLogger(__name__)

# Create declarative base
Base = declarative_base()

# Global engine instances
analytics_engine: AsyncEngine = None
warehouse_engine: AsyncEngine = None

# Session makers
AnalyticsSessionLocal: async_sessionmaker[AsyncSession] = None
WarehouseSessionLocal: async_sessionmaker[AsyncSession] = None


def create_engines():
    """Create database engines"""
    global analytics_engine, warehouse_engine, AnalyticsSessionLocal, WarehouseSessionLocal
    
    # Analytics database engine
    analytics_engine = create_async_engine(
        settings.database_url,
        echo=settings.debug,
        pool_size=settings.database_pool_size,
        max_overflow=settings.database_max_overflow,
        pool_pre_ping=True,
        pool_recycle=3600,  # 1 hour
    )
    
    # Data warehouse engine
    warehouse_engine = create_async_engine(
        settings.warehouse_url,
        echo=settings.debug,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,
        pool_recycle=3600,
    )
    
    # Create session makers
    AnalyticsSessionLocal = async_sessionmaker(
        bind=analytics_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )
    
    WarehouseSessionLocal = async_sessionmaker(
        bind=warehouse_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )


async def get_analytics_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency to get analytics database session"""
    async with AnalyticsSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def get_warehouse_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency to get warehouse database session"""
    async with WarehouseSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_analytics_db():
    """Initialize analytics database"""
    try:
        from app.models import analytics_models  # Import models to register them
        
        async with analytics_engine.begin() as conn:
            # Create all tables
            await conn.run_sync(Base.metadata.create_all)
            logger.info("Analytics database tables created successfully")
            
    except Exception as e:
        logger.error(f"Error creating analytics database tables: {e}")
        raise


async def init_warehouse_db():
    """Initialize warehouse database"""
    try:
        from app.models import warehouse_models  # Import warehouse models
        
        async with warehouse_engine.begin() as conn:
            # Create all warehouse tables
            await conn.run_sync(Base.metadata.create_all)
            logger.info("Warehouse database tables created successfully")
            
    except Exception as e:
        logger.error(f"Error creating warehouse database tables: {e}")
        raise


async def close_db_connections():
    """Close all database connections"""
    if analytics_engine:
        await analytics_engine.dispose()
        logger.info("Analytics database connections closed")
    
    if warehouse_engine:
        await warehouse_engine.dispose()
        logger.info("Warehouse database connections closed")


# Database health check
async def check_analytics_db_health() -> bool:
    """Check analytics database health"""
    try:
        async with AnalyticsSessionLocal() as session:
            result = await session.execute("SELECT 1")
            return result.scalar() == 1
    except Exception as e:
        logger.error(f"Analytics database health check failed: {e}")
        return False


async def check_warehouse_db_health() -> bool:
    """Check warehouse database health"""
    try:
        async with WarehouseSessionLocal() as session:
            result = await session.execute("SELECT 1")
            return result.scalar() == 1
    except Exception as e:
        logger.error(f"Warehouse database health check failed: {e}")
        return False


# Performance monitoring for database queries
@event.listens_for(Engine, "before_cursor_execute")
def receive_before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    """Log slow queries"""
    import time
    context._query_start_time = time.time()


@event.listens_for(Engine, "after_cursor_execute")
def receive_after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    """Log slow queries"""
    import time
    total = time.time() - context._query_start_time
    
    if total > settings.performance_threshold_ms / 1000:  # Convert to seconds
        logger.warning(
            f"Slow query detected: {total:.4f}s\n"
            f"Statement: {statement[:200]}..."
        )