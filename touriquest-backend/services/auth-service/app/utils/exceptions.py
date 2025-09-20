"""
Custom Exceptions for Authentication Service
"""


class AuthServiceError(Exception):
    """Base exception for auth service"""
    def __init__(self, message: str, error_code: str = None):
        self.message = message
        self.error_code = error_code
        super().__init__(message)


class AuthenticationError(AuthServiceError):
    """Authentication failed"""
    pass


class UserNotFoundError(AuthServiceError):
    """User not found"""
    pass


class InvalidTokenError(AuthServiceError):
    """Invalid or expired token"""
    pass


class AccountLockedError(AuthServiceError):
    """Account is locked"""
    pass


class EmailNotVerifiedError(AuthServiceError):
    """Email not verified"""
    pass


class WeakPasswordError(AuthServiceError):
    """Password does not meet requirements"""
    pass


class RateLimitExceededError(AuthServiceError):
    """Rate limit exceeded"""
    pass


class OAuthError(AuthServiceError):
    """OAuth authentication error"""
    pass


class SessionExpiredError(AuthServiceError):
    """Session has expired"""
    pass


class PermissionDeniedError(AuthServiceError):
    """Insufficient permissions"""
    pass


class ValidationError(AuthServiceError):
    """Data validation error"""
    pass


class DuplicateResourceError(AuthServiceError):
    """Resource already exists"""
    pass