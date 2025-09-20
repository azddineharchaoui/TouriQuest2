"""
Authentication Service Core Security
JWT token handling, password hashing, and security functions
"""
import secrets
import string
import hashlib
from datetime import datetime, timedelta
from typing import Any, Dict, Optional, Union

import jwt
from passlib.context import CryptContext

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT Settings (will be configured via environment)
SECRET_KEY = "your-secret-key-here"  # Should be loaded from environment
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 30
EMAIL_VERIFICATION_EXPIRE_HOURS = 24
PASSWORD_RESET_EXPIRE_HOURS = 2


def create_password_hash(password: str) -> str:
    """Create a password hash using bcrypt"""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)


def generate_random_string(length: int = 32) -> str:
    """Generate a cryptographically secure random string"""
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def generate_verification_token() -> str:
    """Generate a secure verification token"""
    return secrets.token_urlsafe(32)


def create_access_token(
    data: Dict[str, Any], 
    expires_delta: Optional[timedelta] = None
) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=ACCESS_TOKEN_EXPIRE_MINUTES
        )
    
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(
        to_encode, 
        SECRET_KEY, 
        algorithm=ALGORITHM
    )
    return encoded_jwt


def create_refresh_token(
    data: Dict[str, Any], 
    expires_delta: Optional[timedelta] = None
) -> str:
    """Create JWT refresh token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            days=REFRESH_TOKEN_EXPIRE_DAYS
        )
    
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(
        to_encode, 
        SECRET_KEY, 
        algorithm=ALGORITHM
    )
    return encoded_jwt


def verify_token(token: str, token_type: str = "access") -> Optional[Dict[str, Any]]:
    """Verify and decode JWT token"""
    try:
        payload = jwt.decode(
            token, 
            SECRET_KEY, 
            algorithms=[ALGORITHM]
        )
        
        # Verify token type
        if payload.get("type") != token_type:
            return None
            
        return payload
    except jwt.PyJWTError:
        return None


def create_email_verification_token(email: str) -> str:
    """Create email verification token"""
    data = {
        "email": email,
        "type": "email_verification",
        "exp": datetime.utcnow() + timedelta(
            hours=EMAIL_VERIFICATION_EXPIRE_HOURS
        )
    }
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)


def create_password_reset_token(email: str) -> str:
    """Create password reset token"""
    data = {
        "email": email,
        "type": "password_reset",
        "exp": datetime.utcnow() + timedelta(
            hours=PASSWORD_RESET_EXPIRE_HOURS
        )
    }
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)


def verify_email_token(token: str) -> Optional[str]:
    """Verify email token and return email"""
    try:
        payload = jwt.decode(
            token, 
            SECRET_KEY, 
            algorithms=[ALGORITHM]
        )
        
        if payload.get("type") not in ["email_verification", "password_reset"]:
            return None
            
        return payload.get("email")
    except jwt.PyJWTError:
        return None


def generate_session_id() -> str:
    """Generate unique session ID"""
    return secrets.token_urlsafe(48)


def create_device_fingerprint(device_info: Dict[str, Any]) -> str:
    """Create device fingerprint hash"""
    # Sort device info for consistent hashing
    sorted_info = sorted(device_info.items())
    info_string = str(sorted_info)
    return hashlib.sha256(info_string.encode()).hexdigest()


def is_strong_password(password: str) -> tuple[bool, list[str]]:
    """
    Check if password meets security requirements
    Returns (is_valid, list_of_errors)
    """
    errors = []
    
    if len(password) < 8:
        errors.append("Password must be at least 8 characters long")
    
    if not any(c.isupper() for c in password):
        errors.append("Password must contain at least one uppercase letter")
    
    if not any(c.islower() for c in password):
        errors.append("Password must contain at least one lowercase letter")
    
    if not any(c.isdigit() for c in password):
        errors.append("Password must contain at least one digit")
    
    if not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password):
        errors.append("Password must contain at least one special character")
    
    # Check for common patterns
    common_patterns = [
        "password", "123456", "qwerty", "abc123", "admin", "user",
        "login", "welcome", "guest", "test"
    ]
    
    if any(pattern in password.lower() for pattern in common_patterns):
        errors.append("Password contains common patterns and is not secure")
    
    return len(errors) == 0, errors


def calculate_risk_score(
    failed_attempts: int,
    account_age_days: int,
    ip_reputation: float = 1.0,
    device_trust_score: float = 1.0,
    time_anomaly: float = 0.0
) -> float:
    """
    Calculate risk score for suspicious activity detection
    Returns a score between 0.0 (safe) and 1.0 (high risk)
    """
    base_risk = 0.0
    
    # Failed login attempts factor
    if failed_attempts > 0:
        base_risk += min(failed_attempts * 0.1, 0.4)
    
    # Account age factor (new accounts are riskier)
    if account_age_days < 7:
        base_risk += 0.2
    elif account_age_days < 30:
        base_risk += 0.1
    
    # IP reputation factor
    if ip_reputation < 0.5:
        base_risk += 0.3
    elif ip_reputation < 0.8:
        base_risk += 0.1
    
    # Device trust factor
    if device_trust_score < 0.5:
        base_risk += 0.2
    
    # Time anomaly factor (unusual login times)
    base_risk += time_anomaly * 0.2
    
    return min(base_risk, 1.0)


def generate_mfa_code() -> str:
    """Generate 6-digit MFA code"""
    return ''.join([str(secrets.randbelow(10)) for _ in range(6)])


def hash_token(token: str) -> str:
    """Hash token for storage"""
    return hashlib.sha256(token.encode()).hexdigest()


class SecurityHeaders:
    """Security headers for responses"""
    
    @staticmethod
    def get_headers() -> Dict[str, str]:
        return {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Permissions-Policy": "geolocation=(), microphone=(), camera=()"
        }