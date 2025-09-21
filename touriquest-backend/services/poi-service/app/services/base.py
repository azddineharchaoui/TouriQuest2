"""
Base service class for all POI multimedia services.
"""

import logging
from abc import ABC, abstractmethod
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)


class BaseService(ABC):
    """Base class for all POI services."""
    
    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)
        
    async def handle_error(self, error: Exception, context: str) -> Dict[str, Any]:
        """Handle service errors consistently."""
        self.logger.error(f"Error in {context}: {str(error)}")
        return {
            "success": False,
            "error": str(error),
            "context": context
        }
    
    async def log_operation(self, operation: str, details: Optional[Dict] = None) -> None:
        """Log service operations."""
        if details:
            self.logger.info(f"{operation}: {details}")
        else:
            self.logger.info(operation)