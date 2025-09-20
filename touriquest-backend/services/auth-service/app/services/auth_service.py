"""
Authentication Service
Core authentication business logic including JWT, sessions, and user management
"""
import hashlib
from datetime import datetime, timedelta
from typing import Optional, Tuple, Dict, Any, List
from uuid import UUID

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from ..core.security import (
    create_access_token, create_refresh_token, verify_token, 
    create_password_hash, verify_password, generate_session_id,
    create_email_verification_token, create_password_reset_token, 
    verify_email_token, calculate_risk_score
)
from ..models import (
    User, AuthToken, UserSession, BlacklistedToken, AuditLog, OAuthAccount,
    UserRole, UserStatus, TokenType, SessionStatus, DeviceFingerprint
)
from ..schemas import (
    UserRegistrationRequest, UserLoginRequest, OnboardingComplete,
    TokenResponse, UserResponse, AuthenticationResponse, UserSessionResponse,
    OAuthLoginRequest
)
from ..services.oauth_service import OAuthService


class AuthService:
    """Authentication service handling user auth operations"""
    
    def __init__(self, db: Session, redis_client=None, oauth_service: OAuthService = None):
        self.db = db
        self.redis = redis_client
        self.oauth_service = oauth_service
    
    async def register_user(
        self, 
        user_data: UserRegistrationRequest,
        ip_address: str,
        user_agent: str
    ) -> Tuple[User, str]:
        """Register a new user and return user + verification token"""
        
        # Check if user already exists
        existing_user = self.db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            await self._log_audit_event(
                None, "registration_attempt", ip_address, user_agent,
                {"email": user_data.email, "result": "email_exists"}, False
            )
            raise ValueError("User with this email already exists")
        
        # Create password hash
        password_hash = create_password_hash(user_data.password)
        
        # Create user
        user = User(
            email=user_data.email,
            password_hash=password_hash,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            location=user_data.location,
            travel_frequency=user_data.travel_frequency,
            data_processing_consent=user_data.data_processing_consent,
            marketing_consent=user_data.marketing_consent,
            status=UserStatus.PENDING_VERIFICATION
        )
        
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        
        # Create email verification token
        verification_token = create_email_verification_token(user.email)
        
        # Log successful registration
        await self._log_audit_event(
            user.id, "user_registered", ip_address, user_agent,
            {"email": user.email}, True
        )
        
        return user, verification_token
    
    async def login_user(
        self,
        login_data: UserLoginRequest,
        ip_address: str,
        user_agent: str,
        device_fingerprint: Optional[str] = None
    ) -> AuthenticationResponse:
        """Authenticate user and create session"""
        
        # Get user by email
        user = self.db.query(User).filter(User.email == login_data.email).first()
        if not user:
            await self._log_audit_event(
                None, "login_attempt", ip_address, user_agent,
                {"email": login_data.email, "result": "user_not_found"}, False
            )
            raise ValueError("Invalid email or password")
        
        # Check if account is locked
        if user.is_account_locked:
            await self._log_audit_event(
                user.id, "login_attempt", ip_address, user_agent,
                {"result": "account_locked"}, False
            )
            raise ValueError("Account is temporarily locked due to too many failed attempts")
        
        # Calculate risk score for suspicious activity detection
        account_age_days = (datetime.utcnow() - user.created_at).days
        device_trust_score = await self._get_device_trust_score(user.id, device_fingerprint)
        risk_score = calculate_risk_score(
            user.failed_login_attempts, 
            account_age_days,
            device_trust_score=device_trust_score
        )
        
        # Verify password
        if not user.password_hash or not verify_password(login_data.password, user.password_hash):
            # Increment failed attempts
            user.failed_login_attempts += 1
            
            # Lock account if too many failures
            if user.failed_login_attempts >= 5:  # ACCOUNT_LOCKOUT_ATTEMPTS
                user.account_locked_until = datetime.utcnow() + timedelta(minutes=30)
            
            self.db.commit()
            
            await self._log_audit_event(
                user.id, "login_attempt", ip_address, user_agent,
                {
                    "result": "invalid_password", 
                    "failed_attempts": user.failed_login_attempts,
                    "risk_score": risk_score
                }, False
            )
            raise ValueError("Invalid email or password")
        
        # Check if email is verified (for high-risk logins)
        if not user.is_email_verified and risk_score > 0.5:
            await self._log_audit_event(
                user.id, "login_attempt", ip_address, user_agent,
                {"result": "email_not_verified", "risk_score": risk_score}, False
            )
            raise ValueError("Please verify your email address before logging in")
        
        # Reset failed attempts on successful login
        user.failed_login_attempts = 0
        user.account_locked_until = None
        user.last_login_at = datetime.utcnow()
        user.last_login_ip = ip_address
        user.last_activity_at = datetime.utcnow()
        
        # Update status to active if pending
        if user.status == UserStatus.PENDING_VERIFICATION:
            user.status = UserStatus.ACTIVE
        
        self.db.commit()
        
        # Update device fingerprint
        if device_fingerprint:
            await self._update_device_fingerprint(user.id, device_fingerprint, ip_address)
        
        # Create session and tokens
        session = await self._create_user_session(user, ip_address, user_agent, login_data.device_name)
        tokens = await self._create_user_tokens(user, session)
        
        # Log successful login
        await self._log_audit_event(
            user.id, "user_login", ip_address, user_agent,
            {"session_id": str(session.id), "risk_score": risk_score}, True
        )
        
        # Prepare response
        user_response = UserResponse(
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
        
        session_response = UserSessionResponse(
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
            is_current=True
        )
        
        return AuthenticationResponse(
            user=user_response,
            tokens=tokens,
            session=session_response,
            requires_onboarding=not user.onboarding_completed,
            is_new_user=False
        )
    
    async def oauth_login(
        self,
        oauth_data: OAuthLoginRequest,
        ip_address: str,
        user_agent: str
    ) -> AuthenticationResponse:
        """Handle OAuth login/registration"""
        
        if not self.oauth_service:
            raise ValueError("OAuth service not configured")
        
        # Exchange code for token
        token_data = await self.oauth_service.exchange_code_for_token(
            oauth_data.provider, oauth_data.code, oauth_data.redirect_uri
        )
        
        # Get user info from provider
        user_info = await self.oauth_service.get_user_info(
            oauth_data.provider, token_data["access_token"]
        )
        
        # Check if OAuth account exists
        oauth_account = self.db.query(OAuthAccount).filter(
            and_(
                OAuthAccount.provider == oauth_data.provider,
                OAuthAccount.provider_user_id == user_info["provider_user_id"]
            )
        ).first()
        
        if oauth_account:
            # Existing OAuth account - login
            user = oauth_account.user
            is_new_user = False
            
            # Update OAuth account tokens
            oauth_account.access_token = token_data.get("access_token")
            oauth_account.refresh_token = token_data.get("refresh_token")
            oauth_account.profile_data = user_info["raw_data"]
            oauth_account.updated_at = datetime.utcnow()
        else:
            # Check if user exists with same email
            user = None
            if user_info.get("email"):
                user = self.db.query(User).filter(User.email == user_info["email"]).first()
            
            if user:
                # Link OAuth account to existing user
                is_new_user = False
            else:
                # Create new user
                user = User(
                    email=user_info.get("email"),
                    first_name=user_info.get("first_name"),
                    last_name=user_info.get("last_name"),
                    avatar_url=user_info.get("avatar_url"),
                    is_email_verified=True,  # Trust OAuth provider verification
                    status=UserStatus.ACTIVE,
                    data_processing_consent=True  # Implicit consent for OAuth
                )
                self.db.add(user)
                self.db.flush()  # Get user ID
                is_new_user = True
            
            # Create OAuth account link
            oauth_account = OAuthAccount(
                user_id=user.id,
                provider=oauth_data.provider,
                provider_user_id=user_info["provider_user_id"],
                provider_email=user_info.get("email"),
                provider_username=user_info.get("username"),
                access_token=token_data.get("access_token"),
                refresh_token=token_data.get("refresh_token"),
                profile_data=user_info["raw_data"]
            )
            self.db.add(oauth_account)
        
        # Update user activity
        user.last_login_at = datetime.utcnow()
        user.last_login_ip = ip_address
        user.last_activity_at = datetime.utcnow()
        
        self.db.commit()
        
        # Create session and tokens
        session = await self._create_user_session(user, ip_address, user_agent)
        tokens = await self._create_user_tokens(user, session)
        
        # Log OAuth login
        await self._log_audit_event(
            user.id, "oauth_login", ip_address, user_agent,
            {
                "provider": oauth_data.provider.value, 
                "is_new_user": is_new_user,
                "session_id": str(session.id)
            }, True
        )
        
        # Prepare response
        user_response = UserResponse(
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
        
        session_response = UserSessionResponse(
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
            is_current=True
        )
        
        return AuthenticationResponse(
            user=user_response,
            tokens=tokens,
            session=session_response,
            requires_onboarding=not user.onboarding_completed,
            is_new_user=is_new_user
        )
    
    async def _create_user_session(
        self,
        user: User,
        ip_address: str,
        user_agent: str,
        device_name: Optional[str] = None
    ) -> UserSession:
        """Create new user session"""
        
        # Parse user agent (simplified)
        device_type = "desktop"
        browser = "Unknown"
        os = "Unknown"
        
        if "mobile" in user_agent.lower():
            device_type = "mobile"
        elif "tablet" in user_agent.lower():
            device_type = "tablet"
        
        # Create session
        session = UserSession(
            user_id=user.id,
            session_token=generate_session_id(),
            device_name=device_name or f"{browser} on {os}",
            device_type=device_type,
            browser=browser,
            os=os,
            ip_address=ip_address,
            user_agent=user_agent,
            expires_at=datetime.utcnow() + timedelta(days=30)  # SESSION_EXPIRE_SECONDS
        )
        
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        
        # Store session in Redis for fast lookup
        if self.redis:
            await self.redis.setex(
                f"session:{session.session_token}",
                86400 * 30,  # 30 days
                str(session.id)
            )
        
        return session
    
    async def _create_user_tokens(self, user: User, session: UserSession) -> TokenResponse:
        """Create JWT tokens for user"""
        
        # Token payload
        token_data = {
            "sub": str(user.id),
            "email": user.email,
            "role": user.role.value,
            "session_id": str(session.id),
            "jti": generate_session_id()[:16]  # Shorter JTI for tokens
        }
        
        # Create tokens
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=30 * 60  # ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
    
    async def _get_device_trust_score(
        self, 
        user_id: UUID, 
        device_fingerprint: Optional[str]
    ) -> float:
        """Get device trust score"""
        if not device_fingerprint:
            return 0.5  # Neutral score for unknown devices
        
        device = self.db.query(DeviceFingerprint).filter(
            and_(
                DeviceFingerprint.user_id == user_id,
                DeviceFingerprint.fingerprint_hash == device_fingerprint
            )
        ).first()
        
        if not device:
            return 0.3  # Low trust for new devices
        
        return 1.0 if device.is_trusted else 0.7
    
    async def _update_device_fingerprint(
        self,
        user_id: UUID,
        device_fingerprint: str,
        ip_address: str
    ):
        """Update or create device fingerprint"""
        device = self.db.query(DeviceFingerprint).filter(
            and_(
                DeviceFingerprint.user_id == user_id,
                DeviceFingerprint.fingerprint_hash == device_fingerprint
            )
        ).first()
        
        if device:
            device.last_seen_at = datetime.utcnow()
        else:
            device = DeviceFingerprint(
                user_id=user_id,
                fingerprint_hash=device_fingerprint,
                device_info={"ip_address": ip_address}  # Would include more device info
            )
            self.db.add(device)
        
        self.db.commit()
    
    async def _log_audit_event(
        self,
        user_id: Optional[UUID],
        action: str,
        ip_address: str,
        user_agent: str,
        details: Dict[str, Any],
        success: bool,
        error_message: Optional[str] = None
    ):
        """Log audit event"""
        
        audit_log = AuditLog(
            user_id=user_id,
            action=action,
            ip_address=ip_address,
            user_agent=user_agent,
            details=details,
            success=success,
            error_message=error_message
        )
        
        self.db.add(audit_log)
        self.db.commit()