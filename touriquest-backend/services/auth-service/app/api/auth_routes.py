"""
Authentication API Routes
FastAPI routes for authentication endpoints including registration, login, OAuth, etc.
"""
from datetime import datetime, timedelta
from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from ..database import get_db
from ..services.auth_service import AuthService
from ..services.oauth_service import OAuthService
from ..core.security import verify_token, get_current_user
from ..models import User, UserSession, OAuthProvider
from ..schemas import (
    UserRegistrationRequest, UserLoginRequest, UserResponse, TokenResponse,
    AuthenticationResponse, OAuthLoginRequest, OAuthLinkRequest,
    EmailVerificationRequest, PasswordResetRequest, PasswordResetConfirmRequest,
    OnboardingStep1, OnboardingStep2, OnboardingStep3, OnboardingStep4,
    OnboardingComplete, ProfileUpdateRequest, PasswordChangeRequest,
    UserSessionResponse, OAuthProviderResponse, DeviceResponse
)
from ..core.rate_limiting import RateLimiter
from ..core.dependencies import get_rate_limiter, get_redis_client, get_current_active_user
from ..utils.email import send_verification_email, send_password_reset_email


router = APIRouter(prefix="/auth", tags=["authentication"])
security = HTTPBearer()


# Rate limiting configurations
login_limiter = RateLimiter(max_requests=5, window_seconds=300)  # 5 attempts per 5 minutes
register_limiter = RateLimiter(max_requests=3, window_seconds=300)  # 3 registrations per 5 minutes
password_reset_limiter = RateLimiter(max_requests=3, window_seconds=3600)  # 3 resets per hour


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    request: Request,
    user_data: UserRegistrationRequest,
    db: Session = Depends(get_db),
    rate_limiter: RateLimiter = Depends(get_rate_limiter)
):
    """Register a new user account"""
    
    # Apply rate limiting
    await register_limiter.check_rate_limit(
        key=f"register:{request.client.host}",
        identifier=request.client.host
    )
    
    # Get client info
    ip_address = request.client.host
    user_agent = request.headers.get("user-agent", "")
    
    # Create auth service
    oauth_service = OAuthService()
    auth_service = AuthService(db, oauth_service=oauth_service)
    
    try:
        # Register user
        user, verification_token = await auth_service.register_user(
            user_data, ip_address, user_agent
        )
        
        # Send verification email
        await send_verification_email(user.email, verification_token)
        
        # Return user data
        return UserResponse(
            id=user.id,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            full_name=user.full_name,
            avatar_url=user.avatar_url,
            role=user.role,
            status=user.status,
            is_email_verified=user.is_email_verified,
            onboarding_completed=user.onboarding_completed,
            created_at=user.created_at,
            last_login_at=user.last_login_at
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )


@router.post("/login", response_model=AuthenticationResponse)
async def login(
    request: Request,
    response: Response,
    login_data: UserLoginRequest,
    db: Session = Depends(get_db),
    rate_limiter: RateLimiter = Depends(get_rate_limiter)
):
    """Authenticate user and create session"""
    
    # Apply rate limiting
    await login_limiter.check_rate_limit(
        key=f"login:{request.client.host}:{login_data.email}",
        identifier=f"{request.client.host}_{login_data.email}"
    )
    
    # Get client info
    ip_address = request.client.host
    user_agent = request.headers.get("user-agent", "")
    device_fingerprint = request.headers.get("x-device-fingerprint")
    
    # Create auth service
    oauth_service = OAuthService()
    auth_service = AuthService(db, oauth_service=oauth_service)
    
    try:
        # Authenticate user
        auth_response = await auth_service.login_user(
            login_data, ip_address, user_agent, device_fingerprint
        )
        
        # Set secure HTTP-only cookie for refresh token
        response.set_cookie(
            key="refresh_token",
            value=auth_response.tokens.refresh_token,
            max_age=86400 * 30,  # 30 days
            httponly=True,
            secure=True,
            samesite="strict"
        )
        
        return auth_response
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )


@router.post("/oauth/{provider}/login", response_model=AuthenticationResponse)
async def oauth_login(
    provider: str,
    request: Request,
    response: Response,
    oauth_data: OAuthLoginRequest,
    db: Session = Depends(get_db)
):
    """Handle OAuth login/registration"""
    
    # Validate provider
    try:
        oauth_provider = OAuthProvider(provider.upper())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported OAuth provider: {provider}"
        )
    
    # Update OAuth data with provider
    oauth_data.provider = oauth_provider
    
    # Get client info
    ip_address = request.client.host
    user_agent = request.headers.get("user-agent", "")
    
    # Create auth service
    oauth_service = OAuthService()
    auth_service = AuthService(db, oauth_service=oauth_service)
    
    try:
        # Handle OAuth login
        auth_response = await auth_service.oauth_login(
            oauth_data, ip_address, user_agent
        )
        
        # Set secure HTTP-only cookie for refresh token
        response.set_cookie(
            key="refresh_token",
            value=auth_response.tokens.refresh_token,
            max_age=86400 * 30,  # 30 days
            httponly=True,
            secure=True,
            samesite="strict"
        )
        
        return auth_response
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OAuth login failed"
        )


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Logout user and invalidate session"""
    
    # Get session token from headers or cookies
    session_token = None
    auth_header = request.headers.get("authorization")
    if auth_header and auth_header.startswith("Bearer "):
        # Extract session from token (would need to decode JWT)
        pass
    
    # Clear refresh token cookie
    response.delete_cookie(key="refresh_token")
    
    # TODO: Invalidate session and add token to blacklist
    
    return {"message": "Logged out successfully"}


@router.post("/verify-email")
async def verify_email(
    verification_data: EmailVerificationRequest,
    db: Session = Depends(get_db)
):
    """Verify user email address"""
    
    try:
        # Verify token and get email
        token_data = verify_token(verification_data.token, token_type="email_verification")
        email = token_data.get("email")
        
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid verification token"
            )
        
        # Find and update user
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        if user.is_email_verified:
            return {"message": "Email already verified"}
        
        # Update verification status
        user.is_email_verified = True
        user.email_verified_at = datetime.utcnow()
        
        # Activate account if pending
        if user.status.value == "pending_verification":
            user.status = "active"
        
        db.commit()
        
        return {"message": "Email verified successfully"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification token"
        )


@router.post("/password-reset/request")
async def request_password_reset(
    request: Request,
    reset_request: PasswordResetRequest,
    db: Session = Depends(get_db),
    rate_limiter: RateLimiter = Depends(get_rate_limiter)
):
    """Request password reset token"""
    
    # Apply rate limiting
    await password_reset_limiter.check_rate_limit(
        key=f"password_reset:{request.client.host}:{reset_request.email}",
        identifier=f"{request.client.host}_{reset_request.email}"
    )
    
    # Find user
    user = db.query(User).filter(User.email == reset_request.email).first()
    if not user:
        # Return success even if user doesn't exist (security)
        return {"message": "If the email exists, a reset link has been sent"}
    
    # Create reset token
    reset_token = create_password_reset_token(user.email)
    
    # Send reset email
    await send_password_reset_email(user.email, reset_token)
    
    return {"message": "If the email exists, a reset link has been sent"}


@router.post("/password-reset/confirm")
async def confirm_password_reset(
    reset_data: PasswordResetConfirmRequest,
    db: Session = Depends(get_db)
):
    """Reset user password with token"""
    
    try:
        # Verify token
        token_data = verify_token(reset_data.token, token_type="password_reset")
        email = token_data.get("email")
        
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid reset token"
            )
        
        # Find user
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Update password
        user.password_hash = create_password_hash(reset_data.new_password)
        user.failed_login_attempts = 0
        user.account_locked_until = None
        
        db.commit()
        
        # TODO: Invalidate all user sessions
        
        return {"message": "Password reset successfully"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reset token"
        )


@router.post("/onboarding/step1")
async def complete_onboarding_step1(
    step1_data: OnboardingStep1,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Complete onboarding step 1: Travel preferences"""
    
    # Update user data
    current_user.travel_frequency = step1_data.travel_frequency
    current_user.budget_preference = step1_data.budget_preference
    current_user.travel_style = step1_data.travel_style
    current_user.onboarding_step = 1
    
    db.commit()
    
    return {"message": "Step 1 completed", "next_step": 2}


@router.post("/onboarding/step2")
async def complete_onboarding_step2(
    step2_data: OnboardingStep2,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Complete onboarding step 2: Travel interests"""
    
    # Update user data
    current_user.travel_interests = step2_data.travel_interests
    current_user.accessibility_needs = step2_data.accessibility_needs
    current_user.onboarding_step = 2
    
    db.commit()
    
    return {"message": "Step 2 completed", "next_step": 3}


@router.post("/onboarding/step3")
async def complete_onboarding_step3(
    step3_data: OnboardingStep3,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Complete onboarding step 3: Communication preferences"""
    
    # Update user data
    current_user.communication_preferences = step3_data.communication_preferences
    current_user.language_preference = step3_data.language_preference
    current_user.timezone = step3_data.timezone
    current_user.onboarding_step = 3
    
    db.commit()
    
    return {"message": "Step 3 completed", "next_step": 4}


@router.post("/onboarding/step4")
async def complete_onboarding_step4(
    step4_data: OnboardingStep4,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Complete onboarding step 4: Privacy and marketing"""
    
    # Update user data
    current_user.marketing_consent = step4_data.marketing_consent
    current_user.data_sharing_consent = step4_data.data_sharing_consent
    current_user.onboarding_step = 4
    current_user.onboarding_completed = True
    current_user.onboarding_completed_at = datetime.utcnow()
    
    db.commit()
    
    return {"message": "Onboarding completed successfully"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_active_user)
):
    """Get current user profile"""
    
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        full_name=current_user.full_name,
        avatar_url=current_user.avatar_url,
        role=current_user.role,
        status=current_user.status,
        is_email_verified=current_user.is_email_verified,
        onboarding_completed=current_user.onboarding_completed,
        created_at=current_user.created_at,
        last_login_at=current_user.last_login_at
    )


@router.put("/me", response_model=UserResponse)
async def update_profile(
    profile_data: ProfileUpdateRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update user profile"""
    
    # Update fields if provided
    if profile_data.first_name is not None:
        current_user.first_name = profile_data.first_name
    if profile_data.last_name is not None:
        current_user.last_name = profile_data.last_name
    if profile_data.location is not None:
        current_user.location = profile_data.location
    if profile_data.avatar_url is not None:
        current_user.avatar_url = profile_data.avatar_url
    if profile_data.timezone is not None:
        current_user.timezone = profile_data.timezone
    if profile_data.language_preference is not None:
        current_user.language_preference = profile_data.language_preference
    
    db.commit()
    
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        full_name=current_user.full_name,
        avatar_url=current_user.avatar_url,
        role=current_user.role,
        status=current_user.status,
        is_email_verified=current_user.is_email_verified,
        onboarding_completed=current_user.onboarding_completed,
        created_at=current_user.created_at,
        last_login_at=current_user.last_login_at
    )


@router.post("/change-password")
async def change_password(
    password_data: PasswordChangeRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Change user password"""
    
    # Verify current password
    if not current_user.password_hash or not verify_password(
        password_data.current_password, current_user.password_hash
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Update password
    current_user.password_hash = create_password_hash(password_data.new_password)
    
    db.commit()
    
    # TODO: Invalidate all other sessions
    
    return {"message": "Password changed successfully"}


@router.get("/sessions", response_model=List[UserSessionResponse])
async def get_user_sessions(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all active user sessions"""
    
    sessions = db.query(UserSession).filter(
        UserSession.user_id == current_user.id,
        UserSession.status == "active",
        UserSession.expires_at > datetime.utcnow()
    ).order_by(UserSession.last_activity_at.desc()).all()
    
    return [
        UserSessionResponse(
            id=session.id,
            device_name=session.device_name,
            device_type=session.device_type,
            browser=session.browser,
            os=session.os,
            ip_address=session.ip_address,
            location=session.location,
            status=session.status,
            created_at=session.created_at,
            last_activity_at=session.last_activity_at,
            is_current=False  # Would need to determine current session
        )
        for session in sessions
    ]


@router.delete("/sessions/{session_id}")
async def revoke_session(
    session_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Revoke a specific user session"""
    
    session = db.query(UserSession).filter(
        UserSession.id == session_id,
        UserSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Revoke session
    session.status = "revoked"
    session.revoked_at = datetime.utcnow()
    
    db.commit()
    
    # TODO: Add session token to blacklist
    
    return {"message": "Session revoked successfully"}


@router.delete("/sessions")
async def revoke_all_sessions(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Revoke all user sessions except current"""
    
    # Revoke all other sessions
    db.query(UserSession).filter(
        UserSession.user_id == current_user.id,
        UserSession.status == "active"
        # TODO: Exclude current session
    ).update({
        "status": "revoked",
        "revoked_at": datetime.utcnow()
    })
    
    db.commit()
    
    # TODO: Add all session tokens to blacklist
    
    return {"message": "All other sessions revoked successfully"}