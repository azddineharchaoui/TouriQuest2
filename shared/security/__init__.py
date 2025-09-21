"""
Security utilities for TouriQuest microservices

This module provides security middleware, rate limiting, and authentication utilities.
"""

import time
import hashlib
from typing import Dict, Optional, Set
from collections import defaultdict
from datetime import datetime, timedelta


class SecurityHeaders:
    """Security headers middleware for FastAPI applications"""
    
    @staticmethod
    def get_default_headers() -> Dict[str, str]:
        """Get default security headers"""
        return {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
            "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
        }
    
    @staticmethod
    def apply_headers(response, headers: Optional[Dict[str, str]] = None):
        """Apply security headers to response"""
        security_headers = SecurityHeaders.get_default_headers()
        if headers:
            security_headers.update(headers)
        
        for header, value in security_headers.items():
            response.headers[header] = value
        
        return response
    
    @staticmethod
    def add_security_headers(response, headers: Optional[Dict[str, str]] = None):
        """Add security headers to response - alias for apply_headers"""
        return SecurityHeaders.apply_headers(response, headers)


class RateLimiter:
    """Rate limiting implementation using sliding window"""
    
    def __init__(self, max_requests: int = 100, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: Dict[str, list] = defaultdict(list)
        self.blocked_ips: Set[str] = set()
        self.block_duration = 300  # 5 minutes
        self.blocked_until: Dict[str, datetime] = {}
    
    def _get_client_key(self, client_ip: str, endpoint: str = "") -> str:
        """Generate client key for rate limiting"""
        return hashlib.md5(f"{client_ip}:{endpoint}".encode()).hexdigest()
    
    def _cleanup_old_requests(self, key: str):
        """Remove old requests outside the window"""
        current_time = time.time()
        cutoff_time = current_time - self.window_seconds
        self.requests[key] = [req_time for req_time in self.requests[key] if req_time > cutoff_time]
    
    def is_allowed_sync(self, client_ip: str, max_requests: Optional[int] = None, window_seconds: Optional[int] = None) -> bool:
        """Check if request is allowed based on rate limits"""
        # Use provided limits or defaults
        if max_requests is not None:
            self.max_requests = max_requests
        if window_seconds is not None:
            self.window_seconds = window_seconds
            
        # Check if IP is temporarily blocked
        if client_ip in self.blocked_until:
            if datetime.now() < self.blocked_until[client_ip]:
                return False
            else:
                # Unblock expired blocks
                del self.blocked_until[client_ip]
                self.blocked_ips.discard(client_ip)
        
        key = self._get_client_key(client_ip, "")
        current_time = time.time()
        
        # Clean up old requests
        self._cleanup_old_requests(key)
        
        # Check rate limit
        if len(self.requests[key]) >= self.max_requests:
            # Block IP temporarily
            self.blocked_ips.add(client_ip)
            self.blocked_until[client_ip] = datetime.now() + timedelta(seconds=self.block_duration)
            return False
        
        # Record this request
        self.requests[key].append(current_time)
        return True
    
    async def is_allowed(self, client_ip: str, max_requests: Optional[int] = None, window_seconds: Optional[int] = None) -> bool:
        """Async version - Check if request is allowed based on rate limits"""
        return self.is_allowed_sync(client_ip, max_requests, window_seconds)
    
    def get_remaining_requests(self, client_ip: str, endpoint: str = "") -> int:
        """Get remaining requests for client"""
        key = self._get_client_key(client_ip, endpoint)
        self._cleanup_old_requests(key)
        return max(0, self.max_requests - len(self.requests[key]))
    
    def reset_client(self, client_ip: str):
        """Reset rate limit for a specific client"""
        # Remove from all tracking
        keys_to_remove = [key for key in self.requests.keys() if key.startswith(hashlib.md5(client_ip.encode()).hexdigest()[:8])]
        for key in keys_to_remove:
            del self.requests[key]
        
        self.blocked_ips.discard(client_ip)
        if client_ip in self.blocked_until:
            del self.blocked_until[client_ip]


class TokenValidator:
    """JWT token validation utilities"""
    
    def __init__(self, secret_key: str, algorithm: str = "HS256"):
        self.secret_key = secret_key
        self.algorithm = algorithm
    
    def validate_token(self, token: str) -> Optional[Dict]:
        """Validate JWT token"""
        try:
            # Import jwt here to avoid dependency issues
            import jwt
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload
        except Exception:
            return None
    
    def extract_user_id(self, token: str) -> Optional[str]:
        """Extract user ID from token"""
        payload = self.validate_token(token)
        if payload:
            return payload.get("user_id")
        return None


class CORSConfig:
    """CORS configuration for microservices"""
    
    @staticmethod
    def get_default_config() -> Dict:
        """Get default CORS configuration"""
        return {
            "allow_origins": ["http://localhost:3000", "http://localhost:8000"],
            "allow_credentials": True,
            "allow_methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
            "allow_headers": [
                "Authorization",
                "Content-Type",
                "X-Requested-With",
                "X-API-Key",
                "X-Request-ID"
            ]
        }


class APIKeyValidator:
    """API Key validation for service-to-service communication"""
    
    def __init__(self, valid_keys: Set[str]):
        self.valid_keys = valid_keys
    
    def validate_api_key(self, api_key: str) -> bool:
        """Validate API key"""
        return api_key in self.valid_keys
    
    def extract_service_name(self, api_key: str) -> Optional[str]:
        """Extract service name from API key (if encoded)"""
        # Implementation depends on API key format
        # For now, return None as placeholder
        return None


# Export classes
__all__ = [
    'SecurityHeaders',
    'RateLimiter', 
    'TokenValidator',
    'CORSConfig',
    'APIKeyValidator'
]