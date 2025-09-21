"""
Main API router for experience service
"""

from fastapi import APIRouter

from app.api import experiences, bookings, providers

# Create main API router
api_router = APIRouter()

# Include all route modules
api_router.include_router(
    experiences.router,
    prefix="/experiences",
    tags=["experiences"]
)

api_router.include_router(
    bookings.router,
    prefix="/bookings",
    tags=["bookings"]
)

api_router.include_router(
    providers.router,
    prefix="/providers",
    tags=["providers"]
)