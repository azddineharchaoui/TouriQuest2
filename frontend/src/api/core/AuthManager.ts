/**
 * Advanced Authentication Manager for TouriQuest
 * Enterprise-grade authentication system that rivals industry leaders
 * 
 * Features:
 * - Multi-modal authentication (email/password, magic link, biometric, OAuth, SSO, QR code)
 * - Advanced security (2FA/MFA, session management, suspicious activity detection)
 * - Smart password management with breach detection
 * - Progressive registration with GDPR compliance
 * - Adaptive authentication based on risk assessment
 * - Device management and session control
 * - JWT token management with automatic refresh
 * - Role-based access control (RBAC)
 */

import { AuthConfig } from './ApiClient';

export interface User {
  id: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  roles: string[];
  permissions: string[];
  tenantId?: string;
  lastLoginAt: string;
  sessionId: string;
  preferences: UserPreferences;
  profile: UserProfile;
  securitySettings: SecuritySettings;
  verificationStatus: VerificationStatus;
}

export interface UserPreferences {
  language: string;
  timezone: string;
  currency: string;
  theme: 'light' | 'dark' | 'auto';
  notifications: NotificationPreferences;
  privacy: PrivacySettings;
}

export interface UserProfile {
  dateOfBirth?: string;
  phone?: string;
  address?: Address;
  emergencyContact?: EmergencyContact;
  identityVerification?: IdentityVerification;
  profileCompleteness: number;
}

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  biometricEnabled: boolean;
  trustedDevices: TrustedDevice[];
  loginAlerts: boolean;
  sessionTimeout: number;
  passwordLastChanged: string;
  securityQuestions?: SecurityQuestion[];
}

export interface VerificationStatus {
  email: boolean;
  phone: boolean;
  identity: boolean;
  address: boolean;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  marketing: boolean;
  security: boolean;
  booking: boolean;
}

export interface PrivacySettings {
  profileVisibility: 'public' | 'friends' | 'private';
  dataSharing: boolean;
  analyticsOptOut: boolean;
  cookieConsent: boolean;
  gdprConsent: boolean;
  consentDate?: string;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
}

export interface IdentityVerification {
  status: 'pending' | 'verified' | 'rejected';
  documents: VerificationDocument[];
  verifiedAt?: string;
}

export interface VerificationDocument {
  type: 'passport' | 'driver_license' | 'national_id';
  number: string;
  expiryDate: string;
  issuingCountry: string;
  verified: boolean;
}

export interface TrustedDevice {
  id: string;
  name: string;
  type: 'mobile' | 'desktop' | 'tablet';
  userAgent: string;
  lastUsed: string;
  location?: string;
  trusted: boolean;
}

export interface SecurityQuestion {
  id: string;
  question: string;
  answerHash: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  tokenType: 'Bearer';
}

export interface BiometricCredential {
  id: string;
  publicKey: string;
  counter: number;
  createdAt: string;
}

export interface SessionInfo {
  id: string;
  userId: string;
  deviceId: string;
  userAgent: string;
  ipAddress: string;
  location?: GeoLocation;
  createdAt: string;
  lastActivityAt: string;
  isActive: boolean;
  isCurrent: boolean;
  riskScore: number;
  loginMethod: LoginMethod;
}

export interface GeoLocation {
  country: string;
  region: string;
  city: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export type LoginMethod = 
  | 'password' 
  | 'magic_link' 
  | 'biometric' 
  | 'oauth_google' 
  | 'oauth_facebook' 
  | 'oauth_apple' 
  | 'oauth_microsoft' 
  | 'oauth_github'
  | 'saml_sso' 
  | 'oidc_sso' 
  | 'qr_code';

export interface MagicLinkRequest {
  email: string;
  redirectUrl?: string;
  expiresIn?: number;
}

export interface QRCodeLoginRequest {
  sessionId: string;
  deviceInfo: DeviceInfo;
}

export interface DeviceInfo {
  userAgent: string;
  platform: string;
  browser: string;
  screenResolution: string;
  timezone: string;
  language: string;
}

export interface SSOProvider {
  id: string;
  name: string;
  type: 'saml' | 'oidc';
  domain: string;
  metadata?: string;
  enabled: boolean;
}

export interface RiskAssessment {
  score: number;
  factors: RiskFactor[];
  recommendation: 'allow' | 'challenge' | 'block';
  requires2FA: boolean;
}

export interface RiskFactor {
  type: 'location' | 'device' | 'time' | 'behavior' | 'velocity';
  score: number;
  description: string;
}

export interface AuthenticationChallenge {
  type: '2fa_totp' | '2fa_sms' | 'biometric' | 'security_questions';
  challengeId: string;
  data: any;
  expiresAt: string;
}

export class AuthManager {
  private config: AuthConfig;
  private currentUser: User | null = null;
  private tokens: TokenPair | null = null;
  private refreshPromise: Promise<TokenPair> | null = null;
  private sessionWarningTimer: NodeJS.Timeout | null = null;
  private biometricSupported: boolean = false;

  constructor(config: AuthConfig) {
    this.config = config;
    this.initializeBiometricSupport();
    this.loadStoredSession();
    this.setupSessionWarning();
  }

  private async initializeBiometricSupport(): Promise<void> {
    if (this.config.enableBiometric && 'credentials' in navigator) {
      try {
        this.biometricSupported = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      } catch (error) {
        console.warn('Biometric authentication not available:', error);
        this.biometricSupported = false;
      }
    }
  }

  private loadStoredSession(): void {
    try {
      const storedTokens = localStorage.getItem('auth_tokens');
      const storedUser = localStorage.getItem('auth_user');

      if (storedTokens && storedUser) {
        this.tokens = JSON.parse(storedTokens);
        this.currentUser = JSON.parse(storedUser);

        // Check if tokens are still valid
        if (this.tokens && Date.now() >= this.tokens.expiresAt) {
          this.clearSession();
        }
      }
    } catch (error) {
      console.error('Failed to load stored session:', error);
      this.clearSession();
    }
  }

  private setupSessionWarning(): void {
    if (this.tokens && this.config.sessionTimeoutWarning > 0) {
      const warningTime = this.tokens.expiresAt - (this.config.sessionTimeoutWarning * 1000);
      const timeUntilWarning = warningTime - Date.now();

      if (timeUntilWarning > 0) {
        this.sessionWarningTimer = setTimeout(() => {
          this.onSessionWarning();
        }, timeUntilWarning);
      }
    }
  }

  private onSessionWarning(): void {
    // Emit session warning event
    window.dispatchEvent(new CustomEvent('auth:sessionWarning', {
      detail: { expiresAt: this.tokens?.expiresAt }
    }));
  }

  /**
   * Authentication Methods
   */

  async login(credentials: {
    email: string;
    password: string;
    rememberMe?: boolean;
    deviceId?: string;
  }): Promise<{ user: User; tokens: TokenPair }> {
    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...credentials,
          deviceId: credentials.deviceId || this.generateDeviceId(),
        }),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      
      this.setSession(data.user, data.tokens);
      
      return { user: data.user, tokens: data.tokens };
    } catch (error) {
      throw new Error(`Authentication failed: ${error}`);
    }
  }

  async loginWithBiometric(): Promise<{ user: User; tokens: TokenPair }> {
    if (!this.biometricSupported) {
      throw new Error('Biometric authentication not supported');
    }

    try {
      // Get challenge from server
      const challengeResponse = await fetch('/api/v1/auth/biometric/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const { challenge, allowCredentials } = await challengeResponse.json();

      // Create assertion
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: new Uint8Array(challenge),
          allowCredentials: allowCredentials.map((cred: any) => ({
            id: new Uint8Array(cred.id),
            type: 'public-key',
          })),
          userVerification: 'required',
        },
      }) as PublicKeyCredential;

      if (!assertion) {
        throw new Error('Biometric authentication failed');
      }

      // Verify assertion with server
      const response = await fetch('/api/v1/auth/biometric/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: assertion.id,
          rawId: Array.from(new Uint8Array(assertion.rawId)),
          response: {
            authenticatorData: Array.from(new Uint8Array((assertion.response as any).authenticatorData)),
            clientDataJSON: Array.from(new Uint8Array(assertion.response.clientDataJSON)),
            signature: Array.from(new Uint8Array((assertion.response as any).signature)),
            userHandle: (assertion.response as any).userHandle ? 
              Array.from(new Uint8Array((assertion.response as any).userHandle)) : null,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Biometric verification failed');
      }

      const data = await response.json();
      this.setSession(data.user, data.tokens);

      return { user: data.user, tokens: data.tokens };
    } catch (error) {
      throw new Error(`Biometric authentication failed: ${error}`);
    }
  }

  async loginWithOAuth(provider: 'google' | 'facebook' | 'apple'): Promise<{ user: User; tokens: TokenPair }> {
    return new Promise((resolve, reject) => {
      const popup = window.open(
        `/api/v1/auth/oauth/${provider}`,
        'oauth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          reject(new Error('OAuth cancelled'));
        }
      }, 1000);

      // Listen for OAuth completion
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === 'OAUTH_SUCCESS') {
          clearInterval(checkClosed);
          popup?.close();
          window.removeEventListener('message', handleMessage);
          
          this.setSession(event.data.user, event.data.tokens);
          resolve({ user: event.data.user, tokens: event.data.tokens });
        } else if (event.data.type === 'OAUTH_ERROR') {
          clearInterval(checkClosed);
          popup?.close();
          window.removeEventListener('message', handleMessage);
          reject(new Error(event.data.error));
        }
      };

      window.addEventListener('message', handleMessage);
    });
  }

  /**
   * COMPREHENSIVE AUTHENTICATION METHODS - Enterprise-Grade Implementation
   */

  /**
   * 1. Magic Link Authentication (Passwordless)
   */
  async sendMagicLink(request: MagicLinkRequest): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch('/api/v1/auth/magic-link/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error('Failed to send magic link');
      }

      const data = await response.json();
      return { success: true, message: 'Magic link sent to your email' };
    } catch (error) {
      throw new Error(`Magic link failed: ${error}`);
    }
  }

  async loginWithMagicLink(token: string): Promise<{ user: User; tokens: TokenPair }> {
    try {
      const response = await fetch('/api/v1/auth/magic-link/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        throw new Error('Invalid or expired magic link');
      }

      const data = await response.json();
      this.setSession(data.user, data.tokens);

      return { user: data.user, tokens: data.tokens };
    } catch (error) {
      throw new Error(`Magic link verification failed: ${error}`);
    }
  }

  /**
   * 2. QR Code Cross-Device Authentication
   */
  async generateQRCodeLogin(): Promise<{ qrCode: string; sessionId: string }> {
    try {
      const response = await fetch('/api/v1/auth/qr-code/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceInfo: this.getDeviceInfo(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate QR code');
      }

      const data = await response.json();
      return { qrCode: data.qrCode, sessionId: data.sessionId };
    } catch (error) {
      throw new Error(`QR code generation failed: ${error}`);
    }
  }

  async authorizeQRCodeLogin(sessionId: string): Promise<{ success: boolean }> {
    if (!this.currentUser || !this.tokens) {
      throw new Error('Must be logged in to authorize QR code');
    }

    try {
      const response = await fetch('/api/v1/auth/qr-code/authorize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.tokens.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        throw new Error('Failed to authorize QR code login');
      }

      return { success: true };
    } catch (error) {
      throw new Error(`QR code authorization failed: ${error}`);
    }
  }

  async pollQRCodeStatus(sessionId: string): Promise<{ status: 'pending' | 'authorized' | 'expired'; user?: User; tokens?: TokenPair }> {
    try {
      const response = await fetch(`/api/v1/auth/qr-code/status/${sessionId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to check QR code status');
      }

      const data = await response.json();
      
      if (data.status === 'authorized' && data.user && data.tokens) {
        this.setSession(data.user, data.tokens);
      }

      return data;
    } catch (error) {
      throw new Error(`QR code status check failed: ${error}`);
    }
  }

  /**
   * 3. Enterprise SSO Authentication
   */
  async loginWithSAML(domain: string): Promise<{ redirectUrl: string }> {
    try {
      const response = await fetch('/api/v1/auth/saml/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      });

      if (!response.ok) {
        throw new Error('SAML SSO not available for this domain');
      }

      const data = await response.json();
      return { redirectUrl: data.redirectUrl };
    } catch (error) {
      throw new Error(`SAML SSO failed: ${error}`);
    }
  }

  async loginWithOIDC(domain: string): Promise<{ redirectUrl: string }> {
    try {
      const response = await fetch('/api/v1/auth/oidc/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      });

      if (!response.ok) {
        throw new Error('OIDC SSO not available for this domain');
      }

      const data = await response.json();
      return { redirectUrl: data.redirectUrl };
    } catch (error) {
      throw new Error(`OIDC SSO failed: ${error}`);
    }
  }

  /**
   * 4. Extended OAuth Providers
   */
  async loginWithOAuthExtended(provider: 'microsoft' | 'github'): Promise<{ user: User; tokens: TokenPair }> {
    return new Promise((resolve, reject) => {
      const popup = window.open(
        `/api/v1/auth/oauth/${provider}`,
        'oauth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          reject(new Error('OAuth cancelled'));
        }
      }, 1000);

      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === 'OAUTH_SUCCESS') {
          clearInterval(checkClosed);
          popup?.close();
          window.removeEventListener('message', handleMessage);
          
          this.setSession(event.data.user, event.data.tokens);
          resolve({ user: event.data.user, tokens: event.data.tokens });
        } else if (event.data.type === 'OAUTH_ERROR') {
          clearInterval(checkClosed);
          popup?.close();
          window.removeEventListener('message', handleMessage);
          reject(new Error(event.data.error));
        }
      };

      window.addEventListener('message', handleMessage);
    });
  }

  /**
   * 5. Advanced Security Features
   */

  // 2FA/MFA Setup and Management
  async setup2FA(method: 'totp' | 'sms'): Promise<{ secret?: string; qrCode?: string; backupCodes: string[] }> {
    if (!this.currentUser || !this.tokens) {
      throw new Error('Must be logged in to setup 2FA');
    }

    try {
      const response = await fetch('/api/v1/auth/2fa/setup', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.tokens.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ method }),
      });

      if (!response.ok) {
        throw new Error('Failed to setup 2FA');
      }

      return await response.json();
    } catch (error) {
      throw new Error(`2FA setup failed: ${error}`);
    }
  }

  async verify2FA(code: string, method: 'totp' | 'sms' | 'backup'): Promise<{ success: boolean }> {
    try {
      const response = await fetch('/api/v1/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, method }),
      });

      if (!response.ok) {
        throw new Error('Invalid 2FA code');
      }

      return { success: true };
    } catch (error) {
      throw new Error(`2FA verification failed: ${error}`);
    }
  }

  async disable2FA(password: string): Promise<{ success: boolean }> {
    if (!this.currentUser || !this.tokens) {
      throw new Error('Must be logged in to disable 2FA');
    }

    try {
      const response = await fetch('/api/v1/auth/2fa/disable', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.tokens.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        throw new Error('Failed to disable 2FA');
      }

      return { success: true };
    } catch (error) {
      throw new Error(`2FA disable failed: ${error}`);
    }
  }

  // Hardware Security Keys (FIDO2/WebAuthn)
  async registerSecurityKey(name: string): Promise<{ success: boolean }> {
    if (!this.currentUser || !this.tokens) {
      throw new Error('Must be logged in to register security key');
    }

    try {
      // Get registration challenge
      const challengeResponse = await fetch('/api/v1/auth/webauthn/register/begin', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.tokens.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });

      const { challengeData } = await challengeResponse.json();

      // Create credential
      const credential = await navigator.credentials.create({
        publicKey: {
          ...challengeData,
          challenge: new Uint8Array(challengeData.challenge),
          user: {
            ...challengeData.user,
            id: new Uint8Array(challengeData.user.id),
          },
        },
      }) as PublicKeyCredential;

      if (!credential) {
        throw new Error('Security key registration failed');
      }

      // Complete registration
      const response = await fetch('/api/v1/auth/webauthn/register/complete', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.tokens.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: credential.id,
          rawId: Array.from(new Uint8Array(credential.rawId)),
          response: {
            attestationObject: Array.from(new Uint8Array((credential.response as any).attestationObject)),
            clientDataJSON: Array.from(new Uint8Array(credential.response.clientDataJSON)),
          },
          type: credential.type,
        }),
      });

      if (!response.ok) {
        throw new Error('Security key registration failed');
      }

      return { success: true };
    } catch (error) {
      throw new Error(`Security key registration failed: ${error}`);
    }
  }

  // Risk Assessment and Adaptive Authentication
  async assessLoginRisk(credentials: { email: string }): Promise<RiskAssessment> {
    try {
      const response = await fetch('/api/v1/auth/risk/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...credentials,
          deviceInfo: this.getDeviceInfo(),
          location: await this.getCurrentLocation(),
        }),
      });

      if (!response.ok) {
        throw new Error('Risk assessment failed');
      }

      return await response.json();
    } catch (error) {
      console.warn('Risk assessment failed:', error);
      return {
        score: 50,
        factors: [],
        recommendation: 'allow',
        requires2FA: false,
      };
    }
  }

  // Session Management
  async getSessions(): Promise<SessionInfo[]> {
    if (!this.currentUser || !this.tokens) {
      throw new Error('Must be logged in to get sessions');
    }

    try {
      const response = await fetch('/api/v1/auth/sessions', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.tokens.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch sessions');
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Session fetch failed: ${error}`);
    }
  }

  async revokeSession(sessionId: string): Promise<{ success: boolean }> {
    if (!this.currentUser || !this.tokens) {
      throw new Error('Must be logged in to revoke session');
    }

    try {
      const response = await fetch(`/api/v1/auth/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.tokens.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to revoke session');
      }

      return { success: true };
    } catch (error) {
      throw new Error(`Session revocation failed: ${error}`);
    }
  }

  async revokeAllOtherSessions(): Promise<{ success: boolean; revokedCount: number }> {
    if (!this.currentUser || !this.tokens) {
      throw new Error('Must be logged in to revoke sessions');
    }

    try {
      const response = await fetch('/api/v1/auth/sessions/revoke-others', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.tokens.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to revoke sessions');
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Session revocation failed: ${error}`);
    }
  }

  // Device Management
  async trustDevice(deviceId?: string): Promise<{ success: boolean }> {
    if (!this.currentUser || !this.tokens) {
      throw new Error('Must be logged in to trust device');
    }

    try {
      const response = await fetch('/api/v1/auth/devices/trust', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.tokens.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceId: deviceId || this.generateDeviceId(),
          deviceInfo: this.getDeviceInfo(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to trust device');
      }

      return { success: true };
    } catch (error) {
      throw new Error(`Device trust failed: ${error}`);
    }
  }

  async getTrustedDevices(): Promise<TrustedDevice[]> {
    if (!this.currentUser || !this.tokens) {
      throw new Error('Must be logged in to get trusted devices');
    }

    try {
      const response = await fetch('/api/v1/auth/devices', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.tokens.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch trusted devices');
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Trusted devices fetch failed: ${error}`);
    }
  }

  async revokeTrustedDevice(deviceId: string): Promise<{ success: boolean }> {
    if (!this.currentUser || !this.tokens) {
      throw new Error('Must be logged in to revoke device');
    }

    try {
      const response = await fetch(`/api/v1/auth/devices/${deviceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.tokens.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to revoke trusted device');
      }

      return { success: true };
    } catch (error) {
      throw new Error(`Device revocation failed: ${error}`);
    }
  }

  /**
   * Token Management
   */

  async getValidToken(): Promise<string | null> {
    if (!this.tokens) {
      return null;
    }

    // Check if token needs refresh
    const timeUntilExpiry = this.tokens.expiresAt - Date.now();
    if (timeUntilExpiry <= this.config.tokenRefreshThreshold * 1000) {
      await this.refreshTokens();
    }

    return this.tokens?.accessToken || null;
  }

  private async refreshTokens(): Promise<TokenPair> {
    // Prevent concurrent refresh requests
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    if (!this.tokens?.refreshToken) {
      throw new Error('No refresh token available');
    }

    this.refreshPromise = this.performTokenRefresh();

    try {
      const newTokens = await this.refreshPromise;
      this.tokens = newTokens;
      this.saveTokens(newTokens);
      this.setupSessionWarning();
      return newTokens;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async performTokenRefresh(): Promise<TokenPair> {
    const response = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.tokens!.refreshToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      this.clearSession();
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    return data.tokens;
  }

  /**
   * Session Management
   */

  private setSession(user: User, tokens: TokenPair): void {
    this.currentUser = user;
    this.tokens = tokens;
    
    this.saveUser(user);
    this.saveTokens(tokens);
    this.setupSessionWarning();

    // Emit login event
    window.dispatchEvent(new CustomEvent('auth:login', {
      detail: { user, tokens }
    }));
  }

  private clearSession(): void {
    this.currentUser = null;
    this.tokens = null;

    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_tokens');

    if (this.sessionWarningTimer) {
      clearTimeout(this.sessionWarningTimer);
      this.sessionWarningTimer = null;
    }

    // Emit logout event
    window.dispatchEvent(new CustomEvent('auth:logout'));
  }

  private saveUser(user: User): void {
    localStorage.setItem('auth_user', JSON.stringify(user));
  }

  private saveTokens(tokens: TokenPair): void {
    localStorage.setItem('auth_tokens', JSON.stringify(tokens));
  }

  /**
   * User Information
   */

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  async getCurrentUserId(): Promise<string | undefined> {
    return this.currentUser?.id;
  }

  async getSessionId(): Promise<string | undefined> {
    return this.currentUser?.sessionId;
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null && this.tokens !== null;
  }

  hasRole(role: string): boolean {
    return this.currentUser?.roles.includes(role) || false;
  }

  hasPermission(permission: string): boolean {
    return this.currentUser?.permissions.includes(permission) || false;
  }

  /**
   * Device and Security
   */

  private generateDeviceId(): string {
    const stored = localStorage.getItem('device_id');
    if (stored) return stored;

    const deviceId = 'device_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    localStorage.setItem('device_id', deviceId);
    return deviceId;
  }

  async setupBiometricAuth(): Promise<BiometricCredential> {
    if (!this.biometricSupported) {
      throw new Error('Biometric authentication not supported');
    }

    if (!this.isAuthenticated()) {
      throw new Error('User must be authenticated to setup biometric auth');
    }

    try {
      // Get registration challenge from server
      const challengeResponse = await fetch('/api/v1/auth/biometric/register/challenge', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.tokens!.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      const { challenge, user } = await challengeResponse.json();

      // Create credential
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: new Uint8Array(challenge),
          rp: {
            name: 'TouriQuest',
            id: window.location.hostname,
          },
          user: {
            id: new Uint8Array(user.id),
            name: user.email,
            displayName: user.name,
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' }, // ES256
            { alg: -257, type: 'public-key' }, // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
          },
          timeout: 60000,
        },
      }) as PublicKeyCredential;

      if (!credential) {
        throw new Error('Failed to create biometric credential');
      }

      // Register credential with server
      const response = await fetch('/api/v1/auth/biometric/register', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.tokens!.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: credential.id,
          rawId: Array.from(new Uint8Array(credential.rawId)),
          response: {
            attestationObject: Array.from(new Uint8Array((credential.response as any).attestationObject)),
            clientDataJSON: Array.from(new Uint8Array(credential.response.clientDataJSON)),
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to register biometric credential');
      }

      const data = await response.json();
      return data.credential;
    } catch (error) {
      throw new Error(`Biometric setup failed: ${error}`);
    }
  }

  async getActiveSessions(): Promise<SessionInfo[]> {
    if (!this.isAuthenticated()) {
      throw new Error('User must be authenticated');
    }

    const response = await fetch('/api/v1/auth/sessions', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.tokens!.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch sessions');
    }

    const data = await response.json();
    return data.sessions;
  }

  async terminateSession(sessionId: string): Promise<void> {
    if (!this.isAuthenticated()) {
      throw new Error('User must be authenticated');
    }

    const response = await fetch(`/api/v1/auth/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.tokens!.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to terminate session');
    }
  }

  /**
   * Password Management and Account Recovery
   */

  async initiatePasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch('/api/v1/auth/password/reset-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error('Password reset request failed');
      }

      return {
        success: true,
        message: 'Password reset instructions sent to your email',
      };
    } catch (error) {
      throw new Error(`Password reset failed: ${error}`);
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean }> {
    try {
      const response = await fetch('/api/v1/auth/password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: newPassword }),
      });

      if (!response.ok) {
        throw new Error('Password reset failed');
      }

      return { success: true };
    } catch (error) {
      throw new Error(`Password reset failed: ${error}`);
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean }> {
    if (!this.currentUser || !this.tokens) {
      throw new Error('Must be logged in to change password');
    }

    try {
      const response = await fetch('/api/v1/auth/password/change', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.tokens.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      if (!response.ok) {
        throw new Error('Password change failed');
      }

      return { success: true };
    } catch (error) {
      throw new Error(`Password change failed: ${error}`);
    }
  }

  async checkPasswordStrength(password: string): Promise<{
    score: number;
    feedback: string[];
    isSecure: boolean;
  }> {
    try {
      const response = await fetch('/api/v1/auth/password/strength', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        throw new Error('Password strength check failed');
      }

      return await response.json();
    } catch (error) {
      // Fallback to client-side basic check
      return this.basicPasswordStrengthCheck(password);
    }
  }

  private basicPasswordStrengthCheck(password: string): {
    score: number;
    feedback: string[];
    isSecure: boolean;
  } {
    const feedback: string[] = [];
    let score = 0;

    if (password.length >= 8) score += 20;
    else feedback.push('Password should be at least 8 characters long');

    if (/[a-z]/.test(password)) score += 10;
    else feedback.push('Add lowercase letters');

    if (/[A-Z]/.test(password)) score += 10;
    else feedback.push('Add uppercase letters');

    if (/[0-9]/.test(password)) score += 10;
    else feedback.push('Add numbers');

    if (/[^a-zA-Z0-9]/.test(password)) score += 20;
    else feedback.push('Add special characters');

    if (password.length >= 12) score += 15;
    if (password.length >= 16) score += 15;

    return {
      score,
      feedback,
      isSecure: score >= 70,
    };
  }

  /**
   * Account Recovery with Security Questions
   */
  async setupSecurityQuestions(questions: Array<{ questionId: string; answer: string }>): Promise<{ success: boolean }> {
    if (!this.currentUser || !this.tokens) {
      throw new Error('Must be logged in to setup security questions');
    }

    try {
      const response = await fetch('/api/v1/auth/security-questions/setup', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.tokens.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ questions }),
      });

      if (!response.ok) {
        throw new Error('Failed to setup security questions');
      }

      return { success: true };
    } catch (error) {
      throw new Error(`Security questions setup failed: ${error}`);
    }
  }

  async recoverAccountWithSecurityQuestions(
    email: string,
    answers: Array<{ questionId: string; answer: string }>
  ): Promise<{ success: boolean; recoveryToken?: string }> {
    try {
      const response = await fetch('/api/v1/auth/account-recovery/security-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, answers }),
      });

      if (!response.ok) {
        throw new Error('Account recovery failed');
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Account recovery failed: ${error}`);
    }
  }

  /**
   * Breach Detection and Security Monitoring
   */
  async checkPasswordBreach(password: string): Promise<{ isBreached: boolean; breachCount?: number }> {
    try {
      // Use Have I Been Pwned API (via our backend to protect privacy)
      const response = await fetch('/api/v1/auth/password/breach-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        throw new Error('Breach check failed');
      }

      return await response.json();
    } catch (error) {
      console.warn('Password breach check failed:', error);
      return { isBreached: false };
    }
  }

  async getSecurityAlerts(): Promise<Array<{
    id: string;
    type: string;
    message: string;
    timestamp: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    read: boolean;
  }>> {
    if (!this.currentUser || !this.tokens) {
      throw new Error('Must be logged in to get security alerts');
    }

    try {
      const response = await fetch('/api/v1/auth/security/alerts', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.tokens.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch security alerts');
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Security alerts fetch failed: ${error}`);
    }
  }

  /**
   * Progressive Registration Support
   */
  async getRegistrationProgress(): Promise<{
    currentStep: number;
    totalSteps: number;
    completedSteps: string[];
    nextStep: string;
  }> {
    if (!this.currentUser || !this.tokens) {
      throw new Error('Must be logged in to get registration progress');
    }

    try {
      const response = await fetch('/api/v1/auth/registration/progress', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.tokens.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch registration progress');
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Registration progress fetch failed: ${error}`);
    }
  }

  async updateRegistrationStep(step: string, data: any): Promise<{ success: boolean; nextStep?: string }> {
    if (!this.currentUser || !this.tokens) {
      throw new Error('Must be logged in to update registration');
    }

    try {
      const response = await fetch('/api/v1/auth/registration/update', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.tokens.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ step, data }),
      });

      if (!response.ok) {
        throw new Error('Failed to update registration step');
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Registration update failed: ${error}`);
    }
  }

  /**
   * Utility Methods
   */

  private getDeviceInfo(): DeviceInfo {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      browser: this.getBrowserInfo(),
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
    };
  }

  private getBrowserInfo(): string {
    const userAgent = navigator.userAgent;
    
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    if (userAgent.includes('Opera')) return 'Opera';
    
    return 'Unknown';
  }

  private async getCurrentLocation(): Promise<GeoLocation | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            // Reverse geocoding to get location details
            const response = await fetch(
              `/api/v1/auth/geocode?lat=${position.coords.latitude}&lng=${position.coords.longitude}`
            );
            
            if (response.ok) {
              const locationData = await response.json();
              resolve({
                ...locationData,
                coordinates: {
                  lat: position.coords.latitude,
                  lng: position.coords.longitude,
                },
              });
            } else {
              resolve(null);
            }
          } catch (error) {
            console.warn('Geocoding failed:', error);
            resolve(null);
          }
        },
        () => resolve(null),
        { timeout: 10000, enableHighAccuracy: false }
      );
    });
  }

  /**
   * Cleanup
   */

  destroy(): void {
    if (this.sessionWarningTimer) {
      clearTimeout(this.sessionWarningTimer);
    }
    this.clearSession();
  }
}