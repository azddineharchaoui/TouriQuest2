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

/**
 * Authentication Service
 * Handles all authentication-related API calls
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