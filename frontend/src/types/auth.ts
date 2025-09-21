import { ApiResponse } from './common';

// User and Authentication Types
export interface User {
  id: string;
  email: string;
  username?: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  nationality?: string;
  preferredLanguage: string;
  preferredCurrency: string;
  timezone: string;
  role: 'user' | 'admin' | 'moderator' | 'property_owner';
  isVerified: boolean;
  isActive: boolean;
  twoFactorEnabled: boolean;
  onboardingCompleted: boolean;
  preferences: UserPreferences;
  socialProviders: SocialProvider[];
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface UserPreferences {
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
    marketing: boolean;
    bookingUpdates: boolean;
    recommendations: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'friends' | 'private';
    showActivity: boolean;
    showReviews: boolean;
  };
  travel: {
    accommodationType: string[];
    budgetRange: { min: number; max: number };
    travelStyle: string[];
    interests: string[];
    accessibility: string[];
  };
}

export interface SocialProvider {
  provider: 'google' | 'facebook' | 'apple';
  providerId: string;
  connectedAt: string;
}

// Authentication Request/Response Types
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
  twoFactorCode?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  username?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  termsAccepted: boolean;
  marketingConsent?: boolean;
}

export interface AuthResponse {
  user: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: string;
  };
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface ResendVerificationRequest {
  email: string;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  username?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  nationality?: string;
  preferredLanguage?: string;
  preferredCurrency?: string;
  timezone?: string;
  avatar?: File;
  preferences?: Partial<UserPreferences>;
}

export interface OAuthRequest {
  provider: 'google' | 'facebook' | 'apple';
  accessToken: string;
  idToken?: string;
}

export interface TwoFactorSetupRequest {
  password: string;
}

export interface TwoFactorSetupResponse {
  qrCode: string;
  secret: string;
  backupCodes: string[];
}

export interface TwoFactorVerifyRequest {
  code: string;
  password: string;
}

export interface TwoFactorDisableRequest {
  password: string;
  code: string;
}

export interface OnboardingStatus {
  completed: boolean;
  steps: {
    profile: boolean;
    preferences: boolean;
    verification: boolean;
    tutorial: boolean;
  };
  currentStep: string;
  completionPercentage: number;
}

export interface OnboardingCompleteRequest {
  step: string;
  data?: Record<string, any>;
}

// API Response Types
export type LoginResponse = ApiResponse<AuthResponse>;
export type RegisterResponse = ApiResponse<AuthResponse>;
export type RefreshResponse = ApiResponse<{ accessToken: string; expiresIn: number }>;
export type ProfileResponse = ApiResponse<User>;
export type UpdateProfileResponse = ApiResponse<User>;
export type ForgotPasswordResponse = ApiResponse<{ message: string }>;
export type ResetPasswordResponse = ApiResponse<{ message: string }>;
export type VerifyEmailResponse = ApiResponse<{ message: string }>;
export type TwoFactorSetupResponseType = ApiResponse<TwoFactorSetupResponse>;
export type OnboardingStatusResponse = ApiResponse<OnboardingStatus>;