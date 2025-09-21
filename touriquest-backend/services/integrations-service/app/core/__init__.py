"""
Core package for integrations service

Contains configuration, database setup, and shared utilities.
"""

from .config import settings
from .database import AsyncSessionLocal, init_db

__all__ = [
    "settings",
    "AsyncSessionLocal", 
    "init_db"
]