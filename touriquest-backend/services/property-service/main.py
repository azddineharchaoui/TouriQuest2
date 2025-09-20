"""
TouriQuest Property Service
FastAPI microservice for accommodation listings, search, and property management
"""
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from fastapi import FastAPI, Depends, HTTPException, status, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, validator
from sqlalchemy.ext.asyncio import AsyncSession
from shared.database import get_db_session, BaseRepository
from shared.monitoring import MonitoringSetup
from shared.security import SecurityHeaders, RateLimiter, get_current_user
import logging
import uuid
from enum import Enum
from decimal import Decimal

logger = logging.getLogger(__name__)

app = FastAPI(
    title="TouriQuest Property Service",
    description="Accommodation listings, search, and property management microservice",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Monitoring setup
monitoring = MonitoringSetup("property-service")
app = monitoring.instrument_fastapi(app)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiter
rate_limiter = RateLimiter()


# Enums
class PropertyTypeEnum(str, Enum):
    HOTEL = "hotel"
    RIAD = "riad"
    VILLA = "villa"
    APARTMENT = "apartment"
    HOSTEL = "hostel"
    RESORT = "resort"
    GUESTHOUSE = "guesthouse"
    BOUTIQUE_HOTEL = "boutique_hotel"
    DESERT_CAMP = "desert_camp"
    KASBAH = "kasbah"


class PropertyStatusEnum(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"
    SUSPENDED = "suspended"


class AmenityEnum(str, Enum):
    WIFI = "wifi"
    POOL = "pool"
    SPA = "spa"
    GYM = "gym"
    RESTAURANT = "restaurant"
    BAR = "bar"
    PARKING = "parking"
    AIRPORT_SHUTTLE = "airport_shuttle"
    PET_FRIENDLY = "pet_friendly"
    AIR_CONDITIONING = "air_conditioning"
    HEATING = "heating"
    BREAKFAST = "breakfast"
    ROOM_SERVICE = "room_service"
    LAUNDRY = "laundry"
    CONCIERGE = "concierge"
    BUSINESS_CENTER = "business_center"


class RoomTypeEnum(str, Enum):
    SINGLE = "single"
    DOUBLE = "double"
    TWIN = "twin"
    TRIPLE = "triple"
    QUAD = "quad"
    FAMILY = "family"
    SUITE = "suite"
    DELUXE = "deluxe"
    PRESIDENTIAL = "presidential"


# Pydantic models
class LocationModel(BaseModel):
    address: str
    city: str
    region: str
    country: str
    postal_code: Optional[str] = None
    latitude: float
    longitude: float
    nearby_landmarks: List[str] = []


class RoomModel(BaseModel):
    id: Optional[str] = None
    type: RoomTypeEnum
    name: str
    description: str
    max_occupancy: int
    bed_configuration: str
    size_sqm: Optional[float] = None
    amenities: List[AmenityEnum] = []
    images: List[str] = []
    base_price: Decimal
    available_count: int = 1


class PropertyCreateModel(BaseModel):
    name: str
    description: str
    property_type: PropertyTypeEnum
    location: LocationModel
    amenities: List[AmenityEnum] = []
    images: List[str] = []
    rooms: List[RoomModel] = []
    check_in_time: str = "15:00"
    check_out_time: str = "11:00"
    cancellation_policy: str
    house_rules: List[str] = []
    contact_email: str
    contact_phone: str
    website: Optional[str] = None
    star_rating: Optional[int] = None
    
    @validator('star_rating')
    def validate_star_rating(cls, v):
        if v is not None and (v < 1 or v > 5):
            raise ValueError('Star rating must be between 1 and 5')
        return v


class PropertyUpdateModel(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    amenities: Optional[List[AmenityEnum]] = None
    images: Optional[List[str]] = None
    rooms: Optional[List[RoomModel]] = None
    check_in_time: Optional[str] = None
    check_out_time: Optional[str] = None
    cancellation_policy: Optional[str] = None
    house_rules: Optional[List[str]] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    website: Optional[str] = None
    star_rating: Optional[int] = None


class PropertyResponseModel(BaseModel):
    id: str
    name: str
    description: str
    property_type: PropertyTypeEnum
    location: LocationModel
    amenities: List[AmenityEnum]
    images: List[str]
    rooms: List[RoomModel]
    check_in_time: str
    check_out_time: str
    cancellation_policy: str
    house_rules: List[str]
    contact_email: str
    contact_phone: str
    website: Optional[str]
    star_rating: Optional[int]
    average_rating: Optional[float] = None
    review_count: int = 0
    status: PropertyStatusEnum
    owner_id: str
    created_at: datetime
    updated_at: datetime


class PropertySearchFilters(BaseModel):
    city: Optional[str] = None
    region: Optional[str] = None
    country: Optional[str] = None
    property_type: Optional[List[PropertyTypeEnum]] = None
    amenities: Optional[List[AmenityEnum]] = None
    min_price: Optional[Decimal] = None
    max_price: Optional[Decimal] = None
    max_occupancy: Optional[int] = None
    star_rating: Optional[int] = None
    check_in: Optional[date] = None
    check_out: Optional[date] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    radius_km: Optional[float] = None


class AvailabilityCheck(BaseModel):
    property_id: str
    room_type: RoomTypeEnum
    check_in: date
    check_out: date
    guests: int


class PriceQuote(BaseModel):
    property_id: str
    room_id: str
    check_in: date
    check_out: date
    guests: int
    nights: int
    base_price: Decimal
    taxes: Decimal
    fees: Decimal
    total_price: Decimal
    currency: str = "USD"


# Repository
class PropertyRepository(BaseRepository):
    """Property repository for database operations."""
    
    async def create_property(self, property_data: PropertyCreateModel, owner_id: str) -> Dict[str, Any]:
        """Create a new property."""
        property_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        # Add IDs to rooms
        rooms_with_ids = []
        for room in property_data.rooms:
            room_dict = room.dict()
            room_dict["id"] = str(uuid.uuid4())
            rooms_with_ids.append(room_dict)
        
        property_data_dict = property_data.dict()
        property_data_dict["rooms"] = rooms_with_ids
        
        property_obj = {
            "id": property_id,
            "owner_id": owner_id,
            "status": PropertyStatusEnum.PENDING,
            "average_rating": None,
            "review_count": 0,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
            **property_data_dict
        }
        
        logger.info(f"Created property {property_id} for owner {owner_id}")
        return property_obj
    
    async def get_property_by_id(self, property_id: str) -> Optional[Dict[str, Any]]:
        """Get property by ID."""
        # Mock implementation
        return None
    
    async def search_properties(
        self, 
        filters: PropertySearchFilters, 
        limit: int = 20, 
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Search properties with filters."""
        # Mock implementation - would use Elasticsearch in production
        mock_properties = []
        return mock_properties
    
    async def update_property(self, property_id: str, update_data: PropertyUpdateModel, owner_id: str) -> bool:
        """Update property."""
        logger.info(f"Updated property {property_id}")
        return True
    
    async def delete_property(self, property_id: str, owner_id: str) -> bool:
        """Delete property."""
        logger.info(f"Deleted property {property_id}")
        return True
    
    async def get_properties_by_owner(self, owner_id: str) -> List[Dict[str, Any]]:
        """Get all properties owned by a user."""
        # Mock implementation
        return []
    
    async def check_availability(self, availability_check: AvailabilityCheck) -> bool:
        """Check room availability for given dates."""
        # Mock implementation - would check booking service
        return True
    
    async def get_price_quote(self, availability_check: AvailabilityCheck) -> PriceQuote:
        """Get price quote for booking."""
        # Mock implementation
        nights = (availability_check.check_out - availability_check.check_in).days
        base_price = Decimal("100.00") * nights
        taxes = base_price * Decimal("0.15")
        fees = Decimal("20.00")
        total_price = base_price + taxes + fees
        
        return PriceQuote(
            property_id=availability_check.property_id,
            room_id="mock-room-id",
            check_in=availability_check.check_in,
            check_out=availability_check.check_out,
            guests=availability_check.guests,
            nights=nights,
            base_price=base_price,
            taxes=taxes,
            fees=fees,
            total_price=total_price
        )


# Dependency
def get_property_repository() -> PropertyRepository:
    """Get property repository dependency."""
    return PropertyRepository()


# API Routes
@app.post("/api/v1/properties", response_model=PropertyResponseModel)
async def create_property(
    property_data: PropertyCreateModel,
    request: Request,
    current_user: dict = Depends(get_current_user),
    property_repo: PropertyRepository = Depends(get_property_repository)
):
    """Create a new property listing."""
    # Rate limiting
    client_ip = request.client.host
    rate_limit_key = f"create_property_rate_limit:{client_ip}"
    
    if not await rate_limiter.is_allowed(rate_limit_key, 5, 3600):  # 5 per hour
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Property creation rate limit exceeded"
        )
    
    # Create property
    property_obj = await property_repo.create_property(property_data, current_user["id"])
    
    return PropertyResponseModel(**property_obj)


@app.get("/api/v1/properties/{property_id}", response_model=PropertyResponseModel)
async def get_property(
    property_id: str,
    property_repo: PropertyRepository = Depends(get_property_repository)
):
    """Get property by ID."""
    property_obj = await property_repo.get_property_by_id(property_id)
    if not property_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found"
        )
    
    return PropertyResponseModel(**property_obj)


@app.post("/api/v1/properties/search", response_model=List[PropertyResponseModel])
async def search_properties(
    filters: PropertySearchFilters,
    limit: int = Query(20, le=100),
    offset: int = Query(0, ge=0),
    property_repo: PropertyRepository = Depends(get_property_repository)
):
    """Search properties with filters."""
    properties = await property_repo.search_properties(filters, limit, offset)
    
    return [PropertyResponseModel(**prop) for prop in properties]


@app.put("/api/v1/properties/{property_id}", response_model=PropertyResponseModel)
async def update_property(
    property_id: str,
    update_data: PropertyUpdateModel,
    current_user: dict = Depends(get_current_user),
    property_repo: PropertyRepository = Depends(get_property_repository)
):
    """Update property listing."""
    # Check if property exists and user owns it
    property_obj = await property_repo.get_property_by_id(property_id)
    if not property_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found"
        )
    
    if property_obj["owner_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this property"
        )
    
    # Update property
    success = await property_repo.update_property(property_id, update_data, current_user["id"])
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update property"
        )
    
    # Get updated property
    updated_property = await property_repo.get_property_by_id(property_id)
    return PropertyResponseModel(**updated_property)


@app.delete("/api/v1/properties/{property_id}")
async def delete_property(
    property_id: str,
    current_user: dict = Depends(get_current_user),
    property_repo: PropertyRepository = Depends(get_property_repository)
):
    """Delete property listing."""
    # Check if property exists and user owns it
    property_obj = await property_repo.get_property_by_id(property_id)
    if not property_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found"
        )
    
    if property_obj["owner_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this property"
        )
    
    # Delete property
    success = await property_repo.delete_property(property_id, current_user["id"])
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete property"
        )
    
    return {"message": "Property deleted successfully"}


@app.get("/api/v1/properties/owner/me", response_model=List[PropertyResponseModel])
async def get_my_properties(
    current_user: dict = Depends(get_current_user),
    property_repo: PropertyRepository = Depends(get_property_repository)
):
    """Get all properties owned by current user."""
    properties = await property_repo.get_properties_by_owner(current_user["id"])
    
    return [PropertyResponseModel(**prop) for prop in properties]


@app.post("/api/v1/properties/availability/check")
async def check_availability(
    availability_check: AvailabilityCheck,
    property_repo: PropertyRepository = Depends(get_property_repository)
):
    """Check room availability for given dates."""
    available = await property_repo.check_availability(availability_check)
    
    return {
        "available": available,
        "property_id": availability_check.property_id,
        "room_type": availability_check.room_type,
        "check_in": availability_check.check_in,
        "check_out": availability_check.check_out,
        "guests": availability_check.guests
    }


@app.post("/api/v1/properties/quote", response_model=PriceQuote)
async def get_price_quote(
    availability_check: AvailabilityCheck,
    property_repo: PropertyRepository = Depends(get_property_repository)
):
    """Get price quote for booking."""
    # First check availability
    available = await property_repo.check_availability(availability_check)
    if not available:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Room not available for selected dates"
        )
    
    # Get price quote
    quote = await property_repo.get_price_quote(availability_check)
    
    return quote


@app.get("/api/v1/properties/featured", response_model=List[PropertyResponseModel])
async def get_featured_properties(
    limit: int = Query(10, le=50),
    property_repo: PropertyRepository = Depends(get_property_repository)
):
    """Get featured properties."""
    # Mock implementation - would use featured flags and ratings
    featured_filters = PropertySearchFilters()
    properties = await property_repo.search_properties(featured_filters, limit, 0)
    
    return [PropertyResponseModel(**prop) for prop in properties]


@app.get("/api/v1/properties/nearby")
async def get_nearby_properties(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    radius_km: float = Query(10, gt=0, le=100),
    limit: int = Query(20, le=100),
    property_repo: PropertyRepository = Depends(get_property_repository)
):
    """Get properties near a location."""
    filters = PropertySearchFilters(
        latitude=latitude,
        longitude=longitude,
        radius_km=radius_km
    )
    
    properties = await property_repo.search_properties(filters, limit, 0)
    
    return [PropertyResponseModel(**prop) for prop in properties]


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "property-service",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)