"""
TouriQuest Authentication Service
FastAPI microservice for user authentication and authorization
"""
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from jose import JWTError, jwt
import redis.asyncio as redis
from sqlalchemy.ext.asyncio import AsyncSession
from shared.database import get_db_session, BaseRepository
from shared.monitoring import MonitoringSetup
from shared.security import SecurityHeaders, RateLimiter
import logging
import asyncio
import uuid

logger = logging.getLogger(__name__)

app = FastAPI(
    title="TouriQuest Auth Service",
    description="Authentication and authorization microservice",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Monitoring setup
monitoring = MonitoringSetup("auth-service")
app = monitoring.instrument_fastapi(app)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure based on environment
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security and authentication
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = "your-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

# Redis connection
redis_client: Optional[redis.Redis] = None

# Rate limiter
rate_limiter = RateLimiter()


# Pydantic models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    phone: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class UserResponse(BaseModel):
    id: str
    email: str
    first_name: str
    last_name: str
    phone: Optional[str]
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: datetime


class PasswordReset(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str


class ChangePassword(BaseModel):
    current_password: str
    new_password: str


# Database models would go here (SQLAlchemy models)
# For now, using simple in-memory storage for demonstration

# User repository
class UserRepository(BaseRepository):
    """User repository for database operations."""
    
    async def create_user(self, user_data: UserCreate) -> Dict[str, Any]:
        """Create a new user."""
        # Hash password
        hashed_password = pwd_context.hash(user_data.password)
        
        # Create user data
        user = {
            "id": str(uuid.uuid4()),
            "email": user_data.email,
            "password_hash": hashed_password,
            "first_name": user_data.first_name,
            "last_name": user_data.last_name,
            "phone": user_data.phone,
            "is_active": True,
            "is_verified": False,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        
        # In a real implementation, this would insert into database
        # For now, store in Redis as demo
        if redis_client:
            await redis_client.hset(
                f"user:{user['id']}", 
                mapping=user
            )
            await redis_client.set(
                f"user_email:{user['email']}", 
                user['id']
            )
        
        return user
    
    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email."""
        if not redis_client:
            return None
        
        user_id = await redis_client.get(f"user_email:{email}")
        if not user_id:
            return None
        
        user_data = await redis_client.hgetall(f"user:{user_id.decode()}")
        if not user_data:
            return None
        
        # Convert bytes to strings
        return {k.decode(): v.decode() for k, v in user_data.items()}
    
    async def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID."""
        if not redis_client:
            return None
        
        user_data = await redis_client.hgetall(f"user:{user_id}")
        if not user_data:
            return None
        
        # Convert bytes to strings
        return {k.decode(): v.decode() for k, v in user_data.items()}
    
    async def update_user_password(self, user_id: str, new_password: str) -> bool:
        """Update user password."""
        if not redis_client:
            return False
        
        hashed_password = pwd_context.hash(new_password)
        await redis_client.hset(
            f"user:{user_id}",
            "password_hash",
            hashed_password
        )
        await redis_client.hset(
            f"user:{user_id}",
            "updated_at",
            datetime.utcnow().isoformat()
        )
        
        return True


# Authentication utilities
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash."""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: dict):
    """Create JWT refresh token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    user_repo: UserRepository = Depends()
):
    """Get current authenticated user."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type")
        
        if user_id is None or token_type != "access":
            raise credentials_exception
    
    except JWTError:
        raise credentials_exception
    
    user = await user_repo.get_user_by_id(user_id)
    if user is None:
        raise credentials_exception
    
    return user


# Startup and shutdown events
@app.on_event("startup")
async def startup_event():
    """Initialize services on startup."""
    global redis_client
    
    try:
        # Initialize Redis connection
        redis_client = redis.Redis(
            host="localhost",  # Configure from environment
            port=6379,
            decode_responses=False
        )
        
        # Test Redis connection
        await redis_client.ping()
        logger.info("Redis connection established")
        
    except Exception as e:
        logger.error(f"Failed to initialize services: {e}")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    global redis_client
    
    if redis_client:
        await redis_client.close()
        logger.info("Redis connection closed")


# API Routes
@app.post("/api/v1/auth/register", response_model=UserResponse)
async def register(
    user_data: UserCreate,
    request: Request,
    user_repo: UserRepository = Depends()
):
    """Register a new user."""
    # Rate limiting
    client_ip = request.client.host
    rate_limit_key = f"register_rate_limit:{client_ip}"
    
    if not await rate_limiter.is_allowed(rate_limit_key, 5, 300):  # 5 per 5 minutes
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Registration rate limit exceeded"
        )
    
    # Check if user already exists
    existing_user = await user_repo.get_user_by_email(user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user
    user = await user_repo.create_user(user_data)
    
    # Convert to response model
    return UserResponse(
        id=user["id"],
        email=user["email"],
        first_name=user["first_name"],
        last_name=user["last_name"],
        phone=user.get("phone"),
        is_active=bool(user["is_active"]),
        is_verified=bool(user["is_verified"]),
        created_at=datetime.fromisoformat(user["created_at"]),
        updated_at=datetime.fromisoformat(user["updated_at"])
    )


@app.post("/api/v1/auth/login", response_model=TokenResponse)
async def login(
    login_data: UserLogin,
    request: Request,
    user_repo: UserRepository = Depends()
):
    """Authenticate user and return tokens."""
    # Rate limiting
    client_ip = request.client.host
    rate_limit_key = f"login_rate_limit:{client_ip}"
    
    if not await rate_limiter.is_allowed(rate_limit_key, 10, 300):  # 10 per 5 minutes
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Login rate limit exceeded"
        )
    
    # Get user
    user = await user_repo.get_user_by_email(login_data.email)
    if not user or not verify_password(login_data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Check if user is active
    if not bool(user["is_active"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is deactivated"
        )
    
    # Create tokens
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["id"]}, 
        expires_delta=access_token_expires
    )
    refresh_token = create_refresh_token(data={"sub": user["id"]})
    
    # Store refresh token in Redis
    if redis_client:
        await redis_client.setex(
            f"refresh_token:{user['id']}",
            timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
            refresh_token
        )
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


@app.post("/api/v1/auth/refresh", response_model=TokenResponse)
async def refresh_token(
    refresh_token: str,
    user_repo: UserRepository = Depends()
):
    """Refresh access token using refresh token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate refresh token"
    )
    
    try:
        payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type")
        
        if user_id is None or token_type != "refresh":
            raise credentials_exception
    
    except JWTError:
        raise credentials_exception
    
    # Check if refresh token exists in Redis
    if redis_client:
        stored_token = await redis_client.get(f"refresh_token:{user_id}")
        if not stored_token or stored_token.decode() != refresh_token:
            raise credentials_exception
    
    # Verify user exists
    user = await user_repo.get_user_by_id(user_id)
    if not user:
        raise credentials_exception
    
    # Create new tokens
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    new_access_token = create_access_token(
        data={"sub": user_id}, 
        expires_delta=access_token_expires
    )
    new_refresh_token = create_refresh_token(data={"sub": user_id})
    
    # Update refresh token in Redis
    if redis_client:
        await redis_client.setex(
            f"refresh_token:{user_id}",
            timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
            new_refresh_token
        )
    
    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


@app.get("/api/v1/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current user information."""
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        first_name=current_user["first_name"],
        last_name=current_user["last_name"],
        phone=current_user.get("phone"),
        is_active=bool(current_user["is_active"]),
        is_verified=bool(current_user["is_verified"]),
        created_at=datetime.fromisoformat(current_user["created_at"]),
        updated_at=datetime.fromisoformat(current_user["updated_at"])
    )


@app.post("/api/v1/auth/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """Logout user by invalidating refresh token."""
    if redis_client:
        await redis_client.delete(f"refresh_token:{current_user['id']}")
    
    return {"message": "Successfully logged out"}


@app.post("/api/v1/auth/change-password")
async def change_password(
    password_data: ChangePassword,
    current_user: dict = Depends(get_current_user),
    user_repo: UserRepository = Depends()
):
    """Change user password."""
    # Verify current password
    if not verify_password(password_data.current_password, current_user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password"
        )
    
    # Update password
    success = await user_repo.update_user_password(
        current_user["id"], 
        password_data.new_password
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update password"
        )
    
    # Invalidate all refresh tokens
    if redis_client:
        await redis_client.delete(f"refresh_token:{current_user['id']}")
    
    return {"message": "Password changed successfully"}


@app.post("/api/v1/auth/verify-token")
async def verify_token(current_user: dict = Depends(get_current_user)):
    """Verify if token is valid."""
    return {
        "valid": True,
        "user_id": current_user["id"],
        "email": current_user["email"]
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    # Check Redis connection
    redis_status = "healthy"
    if redis_client:
        try:
            await redis_client.ping()
        except Exception:
            redis_status = "unhealthy"
    else:
        redis_status = "not_connected"
    
    return {
        "status": "healthy",
        "service": "auth-service",
        "version": "1.0.0",
        "redis": redis_status,
        "timestamp": datetime.utcnow().isoformat()
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)