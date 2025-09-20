"""API router configuration"""

from fastapi import APIRouter
from app.api.v1 import search

api_router = APIRouter()

# Include all endpoint modules
api_router.include_router(
    search.router,
    prefix="/properties",
    tags=["Property Search"]
)

# Additional routers would be included here
# api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
# api_router.include_router(admin.router, prefix="/admin", tags=["Admin"])