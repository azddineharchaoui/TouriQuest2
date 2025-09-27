import { BaseService } from '../base';
import { ApiClient } from '../client';
import {
  User,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  RefreshTokenRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
  VerifyEmailRequest,
  ResendVerificationRequest,
  UpdateProfileRequest,
  OAuthRequest,
  TwoFactorSetupRequest,
  TwoFactorSetupResponse,
  TwoFactorVerifyRequest,
  TwoFactorDisableRequest,
  OnboardingStatus,
  OnboardingCompleteRequest,
  LoginResponse,
  RegisterResponse,
  RefreshResponse,
  ProfileResponse,
  UpdateProfileResponse,
  ForgotPasswordResponse,
  ResetPasswordResponse,
  VerifyEmailResponse,
  TwoFactorSetupResponseType,
  OnboardingStatusResponse,
} from '../../types/auth';

// Enhanced interfaces for comprehensive authentication
export interface MagicLinkRequest {
  email: string;
  redirectUrl?: string;
  expiresIn?: number;
}

export interface QRCodeLoginResponse {
  qrCode: string;
  sessionId: string;
  expiresAt: string;
}

export interface ProgressiveRegistrationData {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  dateOfBirth?: string;
  interests?: string[];
  marketingConsent?: boolean;
  termsAccepted: boolean;
  gdprConsent: boolean;
  referralCode?: string;
  step: number;
}

export interface IdentityVerificationRequest {
  documentType: 'passport' | 'driver_license' | 'national_id';
  documentNumber: string;
  expiryDate: string;
  issuingCountry: string;
  frontImage: File;
  backImage?: File;
  selfieImage: File;
}

export interface SecurityQuestion {
  id: string;
  question: string;
  category: string;
}

export interface SecurityAnswers {
  questionId: string;
  answer: string;
}

/**
 * Enhanced Authentication Service
 * Enterprise-grade authentication system with comprehensive features
 */
export class AuthService extends BaseService {
  constructor(client: ApiClient) {
    super(client, '/auth');
  }

  /**
   * User registration
   * POST /api/v1/auth/register
   */
  async register(data: RegisterRequest): Promise<RegisterResponse> {
    try {
      this.validateRequired(data, ['email', 'password', 'firstName', 'lastName', 'termsAccepted']);
      
      const response = await this.client.post<AuthResponse>(
        this.buildUrl('register'),
        this.transformRequest(data)
      );

      // Store tokens after successful registration
      if (response.success && response.data.tokens) {
        this.client.setAuthTokens(
          response.data.tokens.accessToken,
          response.data.tokens.refreshToken
        );
      }

      return response;
    } catch (error) {
      this.handleError(error, 'register');
    }
  }

  /**
   * User login
   * POST /api/v1/auth/login
   */
  async login(data: LoginRequest): Promise<LoginResponse> {
    try {
      this.validateRequired(data, ['email', 'password']);
      
      const response = await this.client.post<AuthResponse>(
        this.buildUrl('login'),
        this.transformRequest(data)
      );

      // Store tokens after successful login
      if (response.success && response.data.tokens) {
        this.client.setAuthTokens(
          response.data.tokens.accessToken,
          response.data.tokens.refreshToken
        );
      }

      return response;
    } catch (error) {
      this.handleError(error, 'login');
    }
  }

  /**
   * User logout
   * POST /api/v1/auth/logout
   */
  async logout(): Promise<void> {
    try {
      await this.client.post(this.buildUrl('logout'));
    } catch (error) {
      // Continue with logout even if API call fails
      console.warn('Logout API call failed:', error);
    } finally {
      // Always clear tokens on logout
      this.client.clearAuthTokens();
      this.clearCache();
    }
  }

  /**
   * Refresh access token
   * POST /api/v1/auth/refresh
   */
  async refreshToken(data: RefreshTokenRequest): Promise<RefreshResponse> {
    try {
      this.validateRequired(data, ['refreshToken']);
      
      const response = await this.client.post<{ accessToken: string; expiresIn: number }>(
        this.buildUrl('refresh'),
        data
      );

      return response;
    } catch (error) {
      // Clear tokens if refresh fails
      this.client.clearAuthTokens();
      this.handleError(error, 'refreshToken');
    }
  }

  /**
   * Forgot password
   * POST /api/v1/auth/forgot-password
   */
  async forgotPassword(data: ForgotPasswordRequest): Promise<ForgotPasswordResponse> {
    try {
      this.validateRequired(data, ['email']);
      
      return await this.client.post<{ message: string }>(
        this.buildUrl('forgot-password'),
        data
      );
    } catch (error) {
      this.handleError(error, 'forgotPassword');
    }
  }

  /**
   * Reset password
   * POST /api/v1/auth/reset-password
   */
  async resetPassword(data: ResetPasswordRequest): Promise<ResetPasswordResponse> {
    try {
      this.validateRequired(data, ['token', 'password', 'confirmPassword']);
      
      if (data.password !== data.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      return await this.client.post<{ message: string }>(
        this.buildUrl('reset-password'),
        data
      );
    } catch (error) {
      this.handleError(error, 'resetPassword');
    }
  }

  /**
   * Verify email
   * POST /api/v1/auth/verify-email
   */
  async verifyEmail(data: VerifyEmailRequest): Promise<VerifyEmailResponse> {
    try {
      this.validateRequired(data, ['token']);
      
      return await this.client.post<{ message: string }>(
        this.buildUrl('verify-email'),
        data
      );
    } catch (error) {
      this.handleError(error, 'verifyEmail');
    }
  }

  /**
   * Resend verification email
   * POST /api/v1/auth/resend-verification
   */
  async resendVerification(data: ResendVerificationRequest): Promise<VerifyEmailResponse> {
    try {
      this.validateRequired(data, ['email']);
      
      return await this.client.post<{ message: string }>(
        this.buildUrl('resend-verification'),
        data
      );
    } catch (error) {
      this.handleError(error, 'resendVerification');
    }
  }

  /**
   * Get user profile
   * GET /api/v1/auth/profile
   */
  async getProfile(): Promise<ProfileResponse> {
    try {
      const cacheKey = this.getCacheKey('GET', 'profile');
      const cached = await this.getFromCache<ProfileResponse>(cacheKey);
      
      if (cached) {
        return cached;
      }

      const response = await this.client.get<User>(this.buildUrl('profile'));
      
      // Cache profile for 5 minutes
      await this.setCache(cacheKey, response, 300000);
      
      return response;
    } catch (error) {
      this.handleError(error, 'getProfile');
    }
  }

  /**
   * Update user profile
   * PUT /api/v1/auth/profile
   */
  async updateProfile(data: UpdateProfileRequest): Promise<UpdateProfileResponse> {
    try {
      let requestData: any = { ...data };

      // Handle avatar upload separately if it's a File
      if (data.avatar instanceof File) {
        const avatarData = new FormData();
        avatarData.append('avatar', data.avatar);
        
        // Upload avatar first
        await this.client.upload(this.buildUrl('profile/avatar'), data.avatar);
        
        // Remove avatar from profile data
        delete requestData.avatar;
      }

      const response = await this.client.put<User>(
        this.buildUrl('profile'),
        this.transformRequest(requestData)
      );

      // Clear profile cache
      this.clearCache('profile');
      
      return response;
    } catch (error) {
      this.handleError(error, 'updateProfile');
    }
  }

  /**
   * Change password
   * POST /api/v1/auth/change-password
   */
  async changePassword(data: ChangePasswordRequest): Promise<VerifyEmailResponse> {
    try {
      this.validateRequired(data, ['currentPassword', 'newPassword', 'confirmPassword']);
      
      if (data.newPassword !== data.confirmPassword) {
        throw new Error('New passwords do not match');
      }

      return await this.client.post<{ message: string }>(
        this.buildUrl('change-password'),
        data
      );
    } catch (error) {
      this.handleError(error, 'changePassword');
    }
  }

  /**
   * OAuth authentication
   * POST /api/v1/auth/oauth/{provider}
   */
  async oauthLogin(provider: 'google' | 'facebook' | 'apple', data: OAuthRequest): Promise<LoginResponse> {
    try {
      this.validateRequired(data, ['accessToken']);
      
      const response = await this.client.post<AuthResponse>(
        this.buildUrl(`oauth/${provider}`),
        data
      );

      // Store tokens after successful OAuth login
      if (response.success && response.data.tokens) {
        this.client.setAuthTokens(
          response.data.tokens.accessToken,
          response.data.tokens.refreshToken
        );
      }

      return response;
    } catch (error) {
      this.handleError(error, `oauth${provider}`);
    }
  }

  /**
   * Setup 2FA
   * POST /api/v1/auth/2fa/setup
   */
  async setup2FA(data: TwoFactorSetupRequest): Promise<TwoFactorSetupResponseType> {
    try {
      this.validateRequired(data, ['password']);
      
      return await this.client.post<TwoFactorSetupResponse>(
        this.buildUrl('2fa/setup'),
        data
      );
    } catch (error) {
      this.handleError(error, 'setup2FA');
    }
  }

  /**
   * Verify 2FA
   * POST /api/v1/auth/2fa/verify
   */
  async verify2FA(data: TwoFactorVerifyRequest): Promise<VerifyEmailResponse> {
    try {
      this.validateRequired(data, ['code', 'password']);
      
      return await this.client.post<{ message: string }>(
        this.buildUrl('2fa/verify'),
        data
      );
    } catch (error) {
      this.handleError(error, 'verify2FA');
    }
  }

  /**
   * Disable 2FA
   * POST /api/v1/auth/2fa/disable
   */
  async disable2FA(data: TwoFactorDisableRequest): Promise<VerifyEmailResponse> {
    try {
      this.validateRequired(data, ['password', 'code']);
      
      return await this.client.post<{ message: string }>(
        this.buildUrl('2fa/disable'),
        data
      );
    } catch (error) {
      this.handleError(error, 'disable2FA');
    }
  }

  /**
   * Get onboarding status
   * GET /api/v1/auth/onboarding/status
   */
  async getOnboardingStatus(): Promise<OnboardingStatusResponse> {
    try {
      return await this.client.get<OnboardingStatus>(
        this.buildUrl('onboarding/status')
      );
    } catch (error) {
      this.handleError(error, 'getOnboardingStatus');
    }
  }

  /**
   * Complete onboarding step
   * POST /api/v1/auth/onboarding/complete
   */
  async completeOnboarding(data: OnboardingCompleteRequest): Promise<OnboardingStatusResponse> {
    try {
      this.validateRequired(data, ['step']);
      
      const response = await this.client.post<OnboardingStatus>(
        this.buildUrl('onboarding/complete'),
        data
      );

      // Clear onboarding cache
      this.clearCache('onboarding');
      
      return response;
    } catch (error) {
      this.handleError(error, 'completeOnboarding');
    }
  }

  /**
   * COMPREHENSIVE AUTHENTICATION METHODS - Enterprise-Grade Features
   */

  /**
   * 1. Magic Link Authentication (Passwordless)
   */
  async sendMagicLink(data: MagicLinkRequest): Promise<{ success: boolean; message: string }> {
    try {
      this.validateRequired(data, ['email']);
      
      const response = await this.client.post<{ success: boolean; message: string }>(
        this.buildUrl('magic-link/send'),
        this.transformRequest(data)
      );

      return response.data;
    } catch (error) {
      this.handleError(error, 'sendMagicLink');
    }
  }

  async verifyMagicLink(token: string): Promise<LoginResponse> {
    try {
      this.validateRequired({ token }, ['token']);
      
      const response = await this.client.post<AuthResponse>(
        this.buildUrl('magic-link/verify'),
        { token }
      );

      // Store tokens after successful magic link login
      if (response.success && response.data.tokens) {
        this.client.setAuthTokens(
          response.data.tokens.accessToken,
          response.data.tokens.refreshToken
        );
      }

      return response;
    } catch (error) {
      this.handleError(error, 'verifyMagicLink');
    }
  }

  /**
   * 2. QR Code Cross-Device Authentication
   */
  async generateQRCodeLogin(): Promise<QRCodeLoginResponse> {
    try {
      const response = await this.client.post<QRCodeLoginResponse>(
        this.buildUrl('qr-code/generate'),
        {
          deviceInfo: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
          }
        }
      );

      return response.data;
    } catch (error) {
      this.handleError(error, 'generateQRCodeLogin');
    }
  }

  async authorizeQRCodeLogin(sessionId: string): Promise<{ success: boolean }> {
    try {
      this.validateRequired({ sessionId }, ['sessionId']);
      
      const response = await this.client.post<{ success: boolean }>(
        this.buildUrl('qr-code/authorize'),
        { sessionId }
      );

      return response.data;
    } catch (error) {
      this.handleError(error, 'authorizeQRCodeLogin');
    }
  }

  async pollQRCodeStatus(sessionId: string): Promise<{
    status: 'pending' | 'authorized' | 'expired';
    user?: User;
    tokens?: { accessToken: string; refreshToken: string };
  }> {
    try {
      this.validateRequired({ sessionId }, ['sessionId']);
      
      const response = await this.client.get<{
        status: 'pending' | 'authorized' | 'expired';
        user?: User;
        tokens?: { accessToken: string; refreshToken: string };
      }>(
        this.buildUrl(`qr-code/status/${sessionId}`)
      );

      // Store tokens if QR code was authorized
      if (response.data.status === 'authorized' && response.data.tokens) {
        this.client.setAuthTokens(
          response.data.tokens.accessToken,
          response.data.tokens.refreshToken
        );
      }

      return response.data;
    } catch (error) {
      this.handleError(error, 'pollQRCodeStatus');
    }
  }

  /**
   * 3. Extended OAuth Providers (Microsoft, GitHub)
   */
  async oauthLoginExtended(provider: 'microsoft' | 'github', data?: OAuthRequest): Promise<LoginResponse> {
    try {
      const response = await this.client.post<AuthResponse>(
        this.buildUrl(`oauth/${provider}`),
        data || {}
      );

      // Store tokens after successful OAuth login
      if (response.success && response.data.tokens) {
        this.client.setAuthTokens(
          response.data.tokens.accessToken,
          response.data.tokens.refreshToken
        );
      }

      return response;
    } catch (error) {
      this.handleError(error, `oauth${provider}`);
    }
  }

  /**
   * 4. Enterprise SSO (SAML/OIDC)
   */
  async initiateSAMLLogin(domain: string): Promise<{ redirectUrl: string }> {
    try {
      this.validateRequired({ domain }, ['domain']);
      
      const response = await this.client.post<{ redirectUrl: string }>(
        this.buildUrl('saml/initiate'),
        { domain }
      );

      return response.data;
    } catch (error) {
      this.handleError(error, 'initiateSAMLLogin');
    }
  }

  async initiateOIDCLogin(domain: string): Promise<{ redirectUrl: string }> {
    try {
      this.validateRequired({ domain }, ['domain']);
      
      const response = await this.client.post<{ redirectUrl: string }>(
        this.buildUrl('oidc/initiate'),
        { domain }
      );

      return response.data;
    } catch (error) {
      this.handleError(error, 'initiateOIDCLogin');
    }
  }

  /**
   * 5. Progressive Registration System
   */
  async startProgressiveRegistration(data: ProgressiveRegistrationData): Promise<{
    success: boolean;
    userId: string;
    currentStep: number;
    nextStep: string;
    requiresVerification: boolean;
  }> {
    try {
      this.validateRequired(data, ['email', 'termsAccepted', 'gdprConsent']);
      
      const response = await this.client.post<{
        success: boolean;
        userId: string;
        currentStep: number;
        nextStep: string;
        requiresVerification: boolean;
      }>(
        this.buildUrl('registration/progressive/start'),
        this.transformRequest(data)
      );

      return response.data;
    } catch (error) {
      this.handleError(error, 'startProgressiveRegistration');
    }
  }

  async updateRegistrationStep(userId: string, step: number, data: any): Promise<{
    success: boolean;
    currentStep: number;
    nextStep?: string;
    completed: boolean;
    user?: User;
    tokens?: { accessToken: string; refreshToken: string };
  }> {
    try {
      this.validateRequired({ userId, step }, ['userId', 'step']);
      
      const response = await this.client.post<{
        success: boolean;
        currentStep: number;
        nextStep?: string;
        completed: boolean;
        user?: User;
        tokens?: { accessToken: string; refreshToken: string };
      }>(
        this.buildUrl('registration/progressive/update'),
        { userId, step, data: this.transformRequest(data) }
      );

      // Store tokens if registration is completed
      if (response.data.completed && response.data.tokens) {
        this.client.setAuthTokens(
          response.data.tokens.accessToken,
          response.data.tokens.refreshToken
        );
      }

      return response.data;
    } catch (error) {
      this.handleError(error, 'updateRegistrationStep');
    }
  }

  async getRegistrationProgress(userId: string): Promise<{
    currentStep: number;
    totalSteps: number;
    completedSteps: string[];
    nextStep: string;
    profileCompleteness: number;
  }> {
    try {
      this.validateRequired({ userId }, ['userId']);
      
      const response = await this.client.get<{
        currentStep: number;
        totalSteps: number;
        completedSteps: string[];
        nextStep: string;
        profileCompleteness: number;
      }>(
        this.buildUrl(`registration/progressive/progress/${userId}`)
      );

      return response.data;
    } catch (error) {
      this.handleError(error, 'getRegistrationProgress');
    }
  }

  /**
   * 6. Email/Phone Verification
   */
  async sendPhoneVerification(phoneNumber: string, method: 'sms' | 'whatsapp' = 'sms'): Promise<{
    success: boolean;
    verificationId: string;
    expiresIn: number;
  }> {
    try {
      this.validateRequired({ phoneNumber }, ['phoneNumber']);
      
      const response = await this.client.post<{
        success: boolean;
        verificationId: string;
        expiresIn: number;
      }>(
        this.buildUrl('verification/phone/send'),
        { phoneNumber: phoneNumber.replace(/\D/g, ''), method }
      );

      return response.data;
    } catch (error) {
      this.handleError(error, 'sendPhoneVerification');
    }
  }

  async verifyPhoneCode(verificationId: string, code: string): Promise<{
    success: boolean;
    verified: boolean;
  }> {
    try {
      this.validateRequired({ verificationId, code }, ['verificationId', 'code']);
      
      const response = await this.client.post<{
        success: boolean;
        verified: boolean;
      }>(
        this.buildUrl('verification/phone/verify'),
        { verificationId, code }
      );

      return response.data;
    } catch (error) {
      this.handleError(error, 'verifyPhoneCode');
    }
  }

  /**
   * 7. Identity Verification for Premium Features
   */
  async submitIdentityVerification(data: IdentityVerificationRequest): Promise<{
    success: boolean;
    verificationId: string;
    status: 'pending' | 'reviewing' | 'approved' | 'rejected';
    estimatedCompletionTime: string;
  }> {
    try {
      this.validateRequired(data, ['documentType', 'documentNumber', 'expiryDate', 'issuingCountry', 'frontImage', 'selfieImage']);
      
      const formData = new FormData();
      formData.append('documentType', data.documentType);
      formData.append('documentNumber', data.documentNumber);
      formData.append('expiryDate', data.expiryDate);
      formData.append('issuingCountry', data.issuingCountry);
      formData.append('frontImage', data.frontImage);
      if (data.backImage) {
        formData.append('backImage', data.backImage);
      }
      formData.append('selfieImage', data.selfieImage);

      const response = await this.client.post<{
        success: boolean;
        verificationId: string;
        status: 'pending' | 'reviewing' | 'approved' | 'rejected';
        estimatedCompletionTime: string;
      }>(
        this.buildUrl('verification/identity/submit'),
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      return response.data;
    } catch (error) {
      this.handleError(error, 'submitIdentityVerification');
    }
  }

  async getIdentityVerificationStatus(verificationId: string): Promise<{
    status: 'pending' | 'reviewing' | 'approved' | 'rejected';
    documents: any[];
    feedback?: string;
    updatedAt: string;
  }> {
    try {
      this.validateRequired({ verificationId }, ['verificationId']);
      
      const response = await this.client.get<{
        status: 'pending' | 'reviewing' | 'approved' | 'rejected';
        documents: any[];
        feedback?: string;
        updatedAt: string;
      }>(
        this.buildUrl(`verification/identity/status/${verificationId}`)
      );

      return response.data;
    } catch (error) {
      this.handleError(error, 'getIdentityVerificationStatus');
    }
  }

  /**
   * 8. Security Questions and Account Recovery
   */
  async getAvailableSecurityQuestions(): Promise<SecurityQuestion[]> {
    try {
      const response = await this.client.get<SecurityQuestion[]>(
        this.buildUrl('security-questions/available')
      );

      return response.data;
    } catch (error) {
      this.handleError(error, 'getAvailableSecurityQuestions');
    }
  }

  async setupSecurityQuestions(questions: SecurityAnswers[]): Promise<{ success: boolean }> {
    try {
      this.validateRequired({ questions }, ['questions']);
      
      const response = await this.client.post<{ success: boolean }>(
        this.buildUrl('security-questions/setup'),
        { questions }
      );

      return response.data;
    } catch (error) {
      this.handleError(error, 'setupSecurityQuestions');
    }
  }

  async recoverAccountWithSecurityQuestions(
    email: string,
    answers: SecurityAnswers[]
  ): Promise<{
    success: boolean;
    recoveryToken?: string;
    message: string;
  }> {
    try {
      this.validateRequired({ email, answers }, ['email', 'answers']);
      
      const response = await this.client.post<{
        success: boolean;
        recoveryToken?: string;
        message: string;
      }>(
        this.buildUrl('recovery/security-questions'),
        { email: email.toLowerCase().trim(), answers }
      );

      return response.data;
    } catch (error) {
      this.handleError(error, 'recoverAccountWithSecurityQuestions');
    }
  }

  /**
   * 9. Referral System Integration
   */
  async validateReferralCode(code: string): Promise<{
    valid: boolean;
    referrerName?: string;
    bonus?: {
      referrer: number;
      referee: number;
      currency: string;
    };
  }> {
    try {
      this.validateRequired({ code }, ['code']);
      
      const response = await this.client.get<{
        valid: boolean;
        referrerName?: string;
        bonus?: {
          referrer: number;
          referee: number;
          currency: string;
        };
      }>(
        this.buildUrl(`referral/validate/${code}`)
      );

      return response.data;
    } catch (error) {
      this.handleError(error, 'validateReferralCode');
    }
  }

  async getUserReferralInfo(): Promise<{
    referralCode: string;
    referralCount: number;
    totalEarnings: number;
    currency: string;
    referrals: Array<{
      name: string;
      joinedAt: string;
      status: 'pending' | 'completed';
      earnings: number;
    }>;
  }> {
    try {
      const response = await this.client.get<{
        referralCode: string;
        referralCount: number;
        totalEarnings: number;
        currency: string;
        referrals: Array<{
          name: string;
          joinedAt: string;
          status: 'pending' | 'completed';
          earnings: number;
        }>;
      }>(
        this.buildUrl('referral/info')
      );

      return response.data;
    } catch (error) {
      this.handleError(error, 'getUserReferralInfo');
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.client.isAuthenticated();
  }

  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    return this.client.getAccessToken();
  }

  /**
   * Transform registration data before sending
   */
  protected transformRequest<T>(data: T): T {
    if (typeof data === 'object' && data !== null) {
      const transformed = { ...data } as any;
      
      // Ensure email is lowercase
      if (transformed.email) {
        transformed.email = transformed.email.toLowerCase().trim();
      }
      
      // Format phone number if present
      if (transformed.phoneNumber) {
        transformed.phoneNumber = transformed.phoneNumber.replace(/\D/g, '');
      }
      
      return transformed;
    }
    
    return data;
  }
}