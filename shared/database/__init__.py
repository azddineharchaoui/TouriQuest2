"""
Database Package

This package contains all database-related functionality for the TouriQuest application.
It includes models, configuration, utilities, and migration management.
"""

from .config import (
    DatabaseConfig,
    DatabaseManager,
    db_manager,
    get_engine,
    get_session,
    get_scoped_session,
    session_scope,
    init_database,
    test_database_connection,
    close_database,
    get_db_session
)

from .utils import (
    DatabaseRepository,
    DatabaseUtils,
    HealthChecker
)

# Import all models for easy access
from .models import *

__all__ = [
    # Configuration and management
    "DatabaseConfig",
    "DatabaseManager", 
    "db_manager",
    "get_engine",
    "get_session",
    "get_scoped_session",
    "session_scope",
    "init_database",
    "test_database_connection",
    "close_database",
    "get_db_session",
    
    # Utilities
    "DatabaseRepository",
    "DatabaseUtils",
    "HealthChecker",
    
    # All models are imported via models.__all__
]