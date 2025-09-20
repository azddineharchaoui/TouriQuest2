"""
Shared database utilities and models for TouriQuest microservices.
"""
from typing import AsyncGenerator, Optional
from functools import lru_cache
import asyncpg
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import String, DateTime, Boolean, Integer
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class Base(DeclarativeBase):
    """Base class for all database models."""
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, 
        default=datetime.utcnow, 
        onupdate=datetime.utcnow
    )
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)


class DatabaseManager:
    """Database connection and session management."""
    
    def __init__(self, database_url: str, echo: bool = False):
        self.database_url = database_url
        self.engine = create_async_engine(
            database_url,
            echo=echo,
            pool_size=20,
            max_overflow=0,
            pool_pre_ping=True,
            pool_recycle=300,
        )
        self.async_session = async_sessionmaker(
            bind=self.engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autocommit=False,
            autoflush=False,
        )
    
    async def get_session(self) -> AsyncGenerator[AsyncSession, None]:
        """Get database session."""
        async with self.async_session() as session:
            try:
                yield session
                await session.commit()
            except Exception as e:
                await session.rollback()
                logger.error(f"Database session error: {e}")
                raise
            finally:
                await session.close()
    
    async def health_check(self) -> bool:
        """Check database health."""
        try:
            async with self.engine.begin() as conn:
                await conn.execute("SELECT 1")
            return True
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return False
    
    async def close(self):
        """Close database connections."""
        await self.engine.dispose()


@lru_cache()
def get_database_manager(database_url: str) -> DatabaseManager:
    """Get cached database manager instance."""
    return DatabaseManager(database_url)


# Repository base class
class BaseRepository:
    """Base repository with common CRUD operations."""
    
    def __init__(self, session: AsyncSession, model_class):
        self.session = session
        self.model_class = model_class
    
    async def create(self, **kwargs):
        """Create new record."""
        obj = self.model_class(**kwargs)
        self.session.add(obj)
        await self.session.flush()
        await self.session.refresh(obj)
        return obj
    
    async def get_by_id(self, id: int):
        """Get record by ID."""
        return await self.session.get(self.model_class, id)
    
    async def update(self, id: int, **kwargs):
        """Update record."""
        obj = await self.get_by_id(id)
        if obj:
            for key, value in kwargs.items():
                setattr(obj, key, value)
            obj.updated_at = datetime.utcnow()
            await self.session.flush()
            await self.session.refresh(obj)
        return obj
    
    async def soft_delete(self, id: int):
        """Soft delete record."""
        obj = await self.get_by_id(id)
        if obj:
            obj.is_deleted = True
            obj.updated_at = datetime.utcnow()
            await self.session.flush()
        return obj
    
    async def hard_delete(self, id: int):
        """Hard delete record."""
        obj = await self.get_by_id(id)
        if obj:
            await self.session.delete(obj)
            await self.session.flush()
        return obj