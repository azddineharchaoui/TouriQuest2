"""
Core Dependencies
FastAPI dependencies for authentication, rate limiting, and other common needs
"""
from typing import Optional, Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, UserStatus
from ..core.security import verify_token, decode_access_token
from ..core.rate_limiting import RateLimiter


# Security scheme
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get current user from JWT token"""
    
    try:
        # Verify and decode token
        token_data = decode_access_token(credentials.credentials)
        user_id = token_data.get("sub")
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Get user from database
        user = db.query(User).filter(User.id == UUID(user_id)).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return user
        
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get current active user (must be active status)"""
    
    if current_user.status not in [UserStatus.ACTIVE, UserStatus.EMAIL_PENDING]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is not active"
        )
    
    return current_user


async def get_current_verified_user(
    current_user: User = Depends(get_current_active_user)
) -> User:
    """Get current user with verified email"""
    
    if not current_user.is_email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email verification required"
        )
    
    return current_user


async def get_admin_user(
    current_user: User = Depends(get_current_verified_user)
) -> User:
    """Get current user with admin privileges"""
    
    if current_user.role.value not in ["admin", "moderator"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    
    return current_user


async def get_optional_user(
    request: Request,
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Get user from token if provided, otherwise return None"""
    
    auth_header = request.headers.get("authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    
    try:
        token = auth_header.split(" ", 1)[1]
        token_data = decode_access_token(token)
        user_id = token_data.get("sub")
        
        if user_id:
            user = db.query(User).filter(User.id == UUID(user_id)).first()
            return user
    except:
        pass
    
    return None


def get_rate_limiter() -> RateLimiter:
    """Get rate limiter instance"""
    return RateLimiter()


def get_redis_client():
    """Get Redis client (placeholder for now)"""
    # TODO: Implement Redis connection
    return None


# Type aliases for common dependencies
CurrentUser = Annotated[User, Depends(get_current_user)]
CurrentActiveUser = Annotated[User, Depends(get_current_active_user)]
CurrentVerifiedUser = Annotated[User, Depends(get_current_verified_user)]
AdminUser = Annotated[User, Depends(get_admin_user)]
OptionalUser = Annotated[Optional[User], Depends(get_optional_user)]