"""
Authentication utilities for the communication service
"""

import jwt
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import redis.asyncio as redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db

security = HTTPBearer()


class AuthService:
    """Authentication service"""
    
    def __init__(self):
        self.secret_key = settings.JWT_SECRET_KEY
        self.algorithm = settings.JWT_ALGORITHM
        self.access_token_expire = settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES
        self.redis_client: Optional[redis.Redis] = None
    
    async def initialize(self):
        """Initialize auth service"""
        self.redis_client = redis.from_url(settings.redis_url_complete)
    
    def create_access_token(self, data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
        """Create JWT access token"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=self.access_token_expire)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        return encoded_jwt
    
    def verify_token(self, token: str) -> Dict[str, Any]:
        """Verify JWT token"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired"
            )
        except jwt.JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
    
    async def get_user_from_cache(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user from Redis cache"""
        if not self.redis_client:
            await self.initialize()
        
        try:
            user_data = await self.redis_client.hgetall(f"user:{user_id}")
            if user_data:
                return {
                    "id": user_data.get("id"),
                    "username": user_data.get("username"),
                    "email": user_data.get("email"),
                    "display_name": user_data.get("display_name"),
                    "avatar_url": user_data.get("avatar_url"),
                    "status": user_data.get("status", "offline"),
                    "is_active": user_data.get("is_active", "true") == "true"
                }
        except Exception:
            pass
        
        return None
    
    async def cache_user(self, user: Dict[str, Any], expire_seconds: int = 3600):
        """Cache user in Redis"""
        if not self.redis_client:
            await self.initialize()
        
        try:
            await self.redis_client.hset(f"user:{user['id']}", mapping={
                "id": user["id"],
                "username": user.get("username", ""),
                "email": user.get("email", ""),
                "display_name": user.get("display_name", ""),
                "avatar_url": user.get("avatar_url", ""),
                "status": user.get("status", "offline"),
                "is_active": str(user.get("is_active", True)).lower()
            })
            await self.redis_client.expire(f"user:{user['id']}", expire_seconds)
        except Exception:
            pass


# Global auth service instance
auth_service = AuthService()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Get current user from JWT token"""
    try:
        # Verify token
        payload = auth_service.verify_token(credentials.credentials)
        user_id = payload.get("sub")
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload"
            )
        
        # Try to get user from cache first
        user = await auth_service.get_user_from_cache(user_id)
        
        if not user:
            # Get user from database (this would be implemented)
            # For now, return basic user info from token
            user = {
                "id": user_id,
                "username": payload.get("username", ""),
                "email": payload.get("email", ""),
                "display_name": payload.get("display_name", ""),
                "is_active": True
            }
            
            # Cache user
            await auth_service.cache_user(user)
        
        if not user["is_active"]:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account is disabled"
            )
        
        return user
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )


async def get_user_from_token(token: str) -> Optional[Dict[str, Any]]:
    """Get user from token (for WebSocket authentication)"""
    try:
        payload = auth_service.verify_token(token)
        user_id = payload.get("sub")
        
        if not user_id:
            return None
        
        # Try cache first
        user = await auth_service.get_user_from_cache(user_id)
        
        if not user:
            # Fallback to basic user info from token
            user = {
                "id": user_id,
                "username": payload.get("username", ""),
                "email": payload.get("email", ""),
                "display_name": payload.get("display_name", ""),
                "is_active": True
            }
        
        return user if user.get("is_active") else None
        
    except Exception:
        return None


async def verify_user_permissions(
    user_id: str,
    resource_id: str,
    permission: str,
    db: AsyncSession = Depends(get_db)
) -> bool:
    """Verify user has permission for a resource"""
    # This would implement proper permission checking
    # For now, return True for basic access
    return True


class OptionalAuth:
    """Optional authentication dependency"""
    
    def __init__(self):
        self.security = HTTPBearer(auto_error=False)
    
    async def __call__(
        self,
        credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
        db: AsyncSession = Depends(get_db)
    ) -> Optional[Dict[str, Any]]:
        if not credentials:
            return None
        
        try:
            return await get_current_user(credentials, db)
        except HTTPException:
            return None


# Create instance for optional auth
optional_auth = OptionalAuth()