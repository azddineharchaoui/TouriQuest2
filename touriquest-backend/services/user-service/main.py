"""
TouriQuest User Service
FastAPI microservice for user profile management and preferences
"""
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from fastapi import FastAPI, Depends, HTTPException, status, Request, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, validator
from sqlalchemy.ext.asyncio import AsyncSession
from shared.database import get_db_session, BaseRepository
from shared.monitoring import MonitoringSetup
from shared.security import SecurityHeaders, RateLimiter, get_current_user
import logging
import uuid
from enum import Enum

logger = logging.getLogger(__name__)

app = FastAPI(
    title="TouriQuest User Service",
    description="User profile management and preferences microservice",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Monitoring setup
monitoring = MonitoringSetup("user-service")
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
class GenderEnum(str, Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"
    PREFER_NOT_TO_SAY = "prefer_not_to_say"


class LanguageEnum(str, Enum):
    EN = "en"
    FR = "fr"
    ES = "es"
    AR = "ar"
    DE = "de"


class CurrencyEnum(str, Enum):
    USD = "USD"
    EUR = "EUR"
    GBP = "GBP"
    MAD = "MAD"


class TravelStyleEnum(str, Enum):
    BUDGET = "budget"
    MID_RANGE = "mid_range"
    LUXURY = "luxury"
    BACKPACKER = "backpacker"
    BUSINESS = "business"
    FAMILY = "family"
    SOLO = "solo"
    ADVENTURE = "adventure"


# Pydantic models
class AddressModel(BaseModel):
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class TravelPreferencesModel(BaseModel):
    preferred_language: LanguageEnum = LanguageEnum.EN
    preferred_currency: CurrencyEnum = CurrencyEnum.USD
    travel_style: List[TravelStyleEnum] = []
    budget_range_min: Optional[float] = None
    budget_range_max: Optional[float] = None
    preferred_accommodation_types: List[str] = []
    dietary_restrictions: List[str] = []
    accessibility_requirements: List[str] = []
    interests: List[str] = []
    favorite_destinations: List[str] = []


class EmergencyContactModel(BaseModel):
    name: str
    relationship: str
    phone: str
    email: Optional[EmailStr] = None


class UserProfileModel(BaseModel):
    first_name: str
    last_name: str
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[GenderEnum] = None
    nationality: Optional[str] = None
    passport_number: Optional[str] = None
    passport_expiry: Optional[date] = None
    address: Optional[AddressModel] = None
    emergency_contact: Optional[EmergencyContactModel] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None


class UserPreferencesModel(BaseModel):
    travel_preferences: TravelPreferencesModel
    notification_preferences: Dict[str, bool] = {
        "email_marketing": True,
        "email_bookings": True,
        "email_recommendations": True,
        "sms_bookings": False,
        "push_notifications": True,
    }
    privacy_settings: Dict[str, bool] = {
        "profile_public": False,
        "show_travel_history": False,
        "allow_friend_requests": True,
        "show_online_status": True,
    }


class UserCreateModel(BaseModel):
    email: EmailStr
    profile: UserProfileModel
    preferences: Optional[UserPreferencesModel] = None


class UserUpdateModel(BaseModel):
    profile: Optional[UserProfileModel] = None
    preferences: Optional[UserPreferencesModel] = None


class UserResponseModel(BaseModel):
    id: str
    email: str
    profile: UserProfileModel
    preferences: UserPreferencesModel
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime] = None


class UserSearchFilters(BaseModel):
    country: Optional[str] = None
    city: Optional[str] = None
    travel_style: Optional[List[TravelStyleEnum]] = None
    interests: Optional[List[str]] = None
    age_min: Optional[int] = None
    age_max: Optional[int] = None


# Repository
class UserRepository(BaseRepository):
    """User repository for database operations."""
    
    async def create_user(self, user_data: UserCreateModel) -> Dict[str, Any]:
        """Create a new user profile."""
        user_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        # Default preferences if not provided
        default_preferences = UserPreferencesModel(
            travel_preferences=TravelPreferencesModel()
        )
        
        user = {
            "id": user_id,
            "email": user_data.email,
            "profile": user_data.profile.dict(),
            "preferences": (user_data.preferences or default_preferences).dict(),
            "is_active": True,
            "is_verified": False,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
            "last_login": None,
        }
        
        # In a real implementation, this would use SQLAlchemy
        logger.info(f"Created user profile for {user_data.email}")
        return user
    
    async def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID."""
        # Mock implementation
        return None
    
    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email."""
        # Mock implementation
        return None
    
    async def update_user(self, user_id: str, update_data: UserUpdateModel) -> bool:
        """Update user profile and preferences."""
        # Mock implementation
        logger.info(f"Updated user {user_id}")
        return True
    
    async def search_users(self, filters: UserSearchFilters, limit: int = 20, offset: int = 0) -> List[Dict[str, Any]]:
        """Search users with filters."""
        # Mock implementation
        return []
    
    async def delete_user(self, user_id: str) -> bool:
        """Soft delete user account."""
        # Mock implementation
        logger.info(f"Deleted user {user_id}")
        return True


# Dependency
def get_user_repository() -> UserRepository:
    """Get user repository dependency."""
    return UserRepository()


# API Routes
@app.post("/api/v1/users", response_model=UserResponseModel)
async def create_user_profile(
    user_data: UserCreateModel,
    request: Request,
    user_repo: UserRepository = Depends(get_user_repository)
):
    """Create a new user profile."""
    # Rate limiting
    client_ip = request.client.host
    rate_limit_key = f"create_user_rate_limit:{client_ip}"
    
    if not await rate_limiter.is_allowed(rate_limit_key, 10, 300):  # 10 per 5 minutes
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Profile creation rate limit exceeded"
        )
    
    # Check if user already exists
    existing_user = await user_repo.get_user_by_email(user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User profile already exists"
        )
    
    # Create user profile
    user = await user_repo.create_user(user_data)
    
    return UserResponseModel(**user)


@app.get("/api/v1/users/me", response_model=UserResponseModel)
async def get_my_profile(
    current_user: dict = Depends(get_current_user),
    user_repo: UserRepository = Depends(get_user_repository)
):
    """Get current user's profile."""
    user = await user_repo.get_user_by_id(current_user["id"])
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found"
        )
    
    return UserResponseModel(**user)


@app.put("/api/v1/users/me", response_model=UserResponseModel)
async def update_my_profile(
    update_data: UserUpdateModel,
    current_user: dict = Depends(get_current_user),
    user_repo: UserRepository = Depends(get_user_repository)
):
    """Update current user's profile."""
    success = await user_repo.update_user(current_user["id"], update_data)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update profile"
        )
    
    # Get updated user
    user = await user_repo.get_user_by_id(current_user["id"])
    return UserResponseModel(**user)


@app.get("/api/v1/users/{user_id}", response_model=UserResponseModel)
async def get_user_profile(
    user_id: str,
    current_user: dict = Depends(get_current_user),
    user_repo: UserRepository = Depends(get_user_repository)
):
    """Get user profile by ID (public profiles only)."""
    user = await user_repo.get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check privacy settings
    privacy_settings = user.get("preferences", {}).get("privacy_settings", {})
    if not privacy_settings.get("profile_public", False) and user["id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Profile is private"
        )
    
    return UserResponseModel(**user)


@app.post("/api/v1/users/search", response_model=List[UserResponseModel])
async def search_users(
    filters: UserSearchFilters,
    limit: int = 20,
    offset: int = 0,
    current_user: dict = Depends(get_current_user),
    user_repo: UserRepository = Depends(get_user_repository)
):
    """Search users with filters."""
    if limit > 100:
        limit = 100
    
    users = await user_repo.search_users(filters, limit, offset)
    
    # Filter out private profiles
    public_users = []
    for user in users:
        privacy_settings = user.get("preferences", {}).get("privacy_settings", {})
        if privacy_settings.get("profile_public", False) or user["id"] == current_user["id"]:
            public_users.append(UserResponseModel(**user))
    
    return public_users


@app.post("/api/v1/users/me/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload user avatar image."""
    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image"
        )
    
    # Validate file size (5MB max)
    file_size = len(await file.read())
    await file.seek(0)  # Reset file pointer
    
    if file_size > 5 * 1024 * 1024:  # 5MB
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds 5MB limit"
        )
    
    # In a real implementation, upload to cloud storage (S3, CloudFlare, etc.)
    avatar_url = f"https://cdn.touriquest.com/avatars/{current_user['id']}/{file.filename}"
    
    logger.info(f"Avatar uploaded for user {current_user['id']}: {avatar_url}")
    
    return {
        "avatar_url": avatar_url,
        "message": "Avatar uploaded successfully"
    }


@app.delete("/api/v1/users/me")
async def delete_my_account(
    current_user: dict = Depends(get_current_user),
    user_repo: UserRepository = Depends(get_user_repository)
):
    """Delete current user's account (soft delete)."""
    success = await user_repo.delete_user(current_user["id"])
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete account"
        )
    
    return {"message": "Account deleted successfully"}


@app.get("/api/v1/users/me/travel-history")
async def get_travel_history(
    current_user: dict = Depends(get_current_user)
):
    """Get user's travel history."""
    # This would integrate with booking service to get travel history
    travel_history = [
        {
            "destination": "Marrakech, Morocco",
            "dates": "2024-01-15 to 2024-01-22",
            "type": "vacation",
            "rating": 5
        },
        {
            "destination": "Casablanca, Morocco", 
            "dates": "2024-03-10 to 2024-03-15",
            "type": "business",
            "rating": 4
        }
    ]
    
    return {"travel_history": travel_history}


@app.get("/api/v1/users/me/recommendations")
async def get_user_recommendations(
    current_user: dict = Depends(get_current_user)
):
    """Get personalized recommendations for user."""
    # This would integrate with AI service for personalized recommendations
    recommendations = {
        "destinations": ["Fez, Morocco", "Chefchaouen, Morocco", "Essaouira, Morocco"],
        "experiences": ["Atlas Mountains Trekking", "Sahara Desert Tour", "Cooking Class"],
        "accommodations": ["Riad La Maison Bleue", "Hotel La Mamounia", "Kasbah Tamadot"]
    }
    
    return recommendations


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "user-service",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)