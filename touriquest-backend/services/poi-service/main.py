"""
TouriQuest POI Service
FastAPI microservice for points of interest discovery and geolocation
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, validator
from shared.database import get_db_session, BaseRepository
from shared.monitoring import MonitoringSetup
from shared.security import SecurityHeaders, RateLimiter, get_current_user
import logging
import uuid
from enum import Enum

logger = logging.getLogger(__name__)

app = FastAPI(
    title="TouriQuest POI Service",
    description="Points of interest discovery and geolocation microservice",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Monitoring setup
monitoring = MonitoringSetup("poi-service")
app = monitoring.instrument_fastapi(app)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

rate_limiter = RateLimiter()


# Enums
class POICategoryEnum(str, Enum):
    HISTORICAL = "historical"
    MUSEUM = "museum"
    RESTAURANT = "restaurant"
    CAFE = "cafe"
    SHOPPING = "shopping"
    ENTERTAINMENT = "entertainment"
    RELIGIOUS = "religious"
    NATURAL = "natural"
    BEACH = "beach"
    PARK = "park"
    MONUMENT = "monument"
    MARKET = "market"
    VIEWPOINT = "viewpoint"
    CULTURAL = "cultural"


class POIStatusEnum(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"


# Pydantic models
class LocationModel(BaseModel):
    latitude: float
    longitude: float
    address: str
    city: str
    region: str
    country: str
    postal_code: Optional[str] = None


class OpeningHoursModel(BaseModel):
    monday: Optional[str] = None
    tuesday: Optional[str] = None
    wednesday: Optional[str] = None
    thursday: Optional[str] = None
    friday: Optional[str] = None
    saturday: Optional[str] = None
    sunday: Optional[str] = None
    notes: Optional[str] = None


class POICreateModel(BaseModel):
    name: str
    description: str
    category: POICategoryEnum
    location: LocationModel
    opening_hours: Optional[OpeningHoursModel] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    website: Optional[str] = None
    images: List[str] = []
    tags: List[str] = []
    entrance_fee: Optional[float] = None
    currency: str = "USD"


class POIUpdateModel(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[POICategoryEnum] = None
    opening_hours: Optional[OpeningHoursModel] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    website: Optional[str] = None
    images: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    entrance_fee: Optional[float] = None


class POIResponseModel(BaseModel):
    id: str
    name: str
    description: str
    category: POICategoryEnum
    location: LocationModel
    opening_hours: Optional[OpeningHoursModel]
    contact_phone: Optional[str]
    contact_email: Optional[str]
    website: Optional[str]
    images: List[str]
    tags: List[str]
    entrance_fee: Optional[float]
    currency: str
    average_rating: Optional[float] = None
    review_count: int = 0
    status: POIStatusEnum
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    distance_km: Optional[float] = None  # Added when searching by location


class POISearchFilters(BaseModel):
    category: Optional[List[POICategoryEnum]] = None
    city: Optional[str] = None
    region: Optional[str] = None
    country: Optional[str] = None
    tags: Optional[List[str]] = None
    min_rating: Optional[float] = None
    has_entrance_fee: Optional[bool] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    radius_km: Optional[float] = None


# Repository
class POIRepository(BaseRepository):
    """POI repository for database operations."""
    
    async def create_poi(self, poi_data: POICreateModel, created_by: Optional[str] = None) -> Dict[str, Any]:
        """Create a new POI."""
        poi_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        poi = {
            "id": poi_id,
            "average_rating": None,
            "review_count": 0,
            "status": POIStatusEnum.PENDING,
            "created_by": created_by,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
            **poi_data.dict()
        }
        
        logger.info(f"Created POI {poi_id}: {poi_data.name}")
        return poi
    
    async def get_poi_by_id(self, poi_id: str) -> Optional[Dict[str, Any]]:
        """Get POI by ID."""
        return None
    
    async def search_pois(
        self, 
        filters: POISearchFilters, 
        limit: int = 20, 
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Search POIs with filters."""
        # Mock implementation - would use Elasticsearch with geospatial queries
        return []
    
    async def update_poi(self, poi_id: str, update_data: POIUpdateModel) -> bool:
        """Update POI."""
        logger.info(f"Updated POI {poi_id}")
        return True
    
    async def delete_poi(self, poi_id: str) -> bool:
        """Delete POI."""
        logger.info(f"Deleted POI {poi_id}")
        return True
    
    async def get_nearby_pois(
        self, 
        latitude: float, 
        longitude: float, 
        radius_km: float,
        category: Optional[POICategoryEnum] = None,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """Get POIs near a location."""
        # Mock implementation with distance calculation
        return []


# Dependencies
def get_poi_repository() -> POIRepository:
    """Get POI repository dependency."""
    return POIRepository()


# API Routes
@app.post("/api/v1/pois", response_model=POIResponseModel)
async def create_poi(
    poi_data: POICreateModel,
    current_user: dict = Depends(get_current_user),
    poi_repo: POIRepository = Depends(get_poi_repository)
):
    """Create a new POI."""
    poi = await poi_repo.create_poi(poi_data, current_user["id"])
    return POIResponseModel(**poi)


@app.get("/api/v1/pois/{poi_id}", response_model=POIResponseModel)
async def get_poi(
    poi_id: str,
    poi_repo: POIRepository = Depends(get_poi_repository)
):
    """Get POI by ID."""
    poi = await poi_repo.get_poi_by_id(poi_id)
    if not poi:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="POI not found"
        )
    
    return POIResponseModel(**poi)


@app.post("/api/v1/pois/search", response_model=List[POIResponseModel])
async def search_pois(
    filters: POISearchFilters,
    limit: int = Query(20, le=100),
    offset: int = Query(0, ge=0),
    poi_repo: POIRepository = Depends(get_poi_repository)
):
    """Search POIs with filters."""
    pois = await poi_repo.search_pois(filters, limit, offset)
    return [POIResponseModel(**poi) for poi in pois]


@app.get("/api/v1/pois/nearby", response_model=List[POIResponseModel])
async def get_nearby_pois(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    radius_km: float = Query(5, gt=0, le=50),
    category: Optional[POICategoryEnum] = None,
    limit: int = Query(20, le=100),
    poi_repo: POIRepository = Depends(get_poi_repository)
):
    """Get POIs near a location."""
    pois = await poi_repo.get_nearby_pois(latitude, longitude, radius_km, category, limit)
    return [POIResponseModel(**poi) for poi in pois]


@app.put("/api/v1/pois/{poi_id}", response_model=POIResponseModel)
async def update_poi(
    poi_id: str,
    update_data: POIUpdateModel,
    current_user: dict = Depends(get_current_user),
    poi_repo: POIRepository = Depends(get_poi_repository)
):
    """Update POI."""
    # Check if POI exists
    poi = await poi_repo.get_poi_by_id(poi_id)
    if not poi:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="POI not found"
        )
    
    # Check permissions (owner or admin)
    if poi.get("created_by") != current_user["id"]:
        # In production, check if user has admin role
        pass
    
    success = await poi_repo.update_poi(poi_id, update_data)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update POI"
        )
    
    updated_poi = await poi_repo.get_poi_by_id(poi_id)
    return POIResponseModel(**updated_poi)


@app.delete("/api/v1/pois/{poi_id}")
async def delete_poi(
    poi_id: str,
    current_user: dict = Depends(get_current_user),
    poi_repo: POIRepository = Depends(get_poi_repository)
):
    """Delete POI."""
    poi = await poi_repo.get_poi_by_id(poi_id)
    if not poi:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="POI not found"
        )
    
    # Check permissions
    if poi.get("created_by") != current_user["id"]:
        # Check admin role in production
        pass
    
    success = await poi_repo.delete_poi(poi_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete POI"
        )
    
    return {"message": "POI deleted successfully"}


@app.get("/api/v1/pois/categories")
async def get_poi_categories():
    """Get all available POI categories."""
    return [{"value": cat.value, "label": cat.value.title()} for cat in POICategoryEnum]


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "poi-service",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)