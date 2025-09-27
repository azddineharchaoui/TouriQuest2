/**
 * Authentication Store with Zustand
 * Enterprise-grade authentication state management
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';
import { logger, persist, devtools, performance } from '../middleware';
import { BaseStore, PersistConfig, PerformanceConfig } from '../types';

// Authentication state types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'user' | 'admin' | 'moderator';
  verified: boolean;
  preferences: UserPreferences;
  security: SecuritySettings;
  profile: UserProfile;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  currency: string;
  timezone: string;
  notifications: NotificationSettings;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  sms: boolean;
  marketing: boolean;
  bookingUpdates: boolean;
  priceAlerts: boolean;
}

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  biometricEnabled: boolean;
  trustedDevices: TrustedDevice[];
  loginHistory: LoginHistoryEntry[];
  activeSessions: ActiveSession[];
}

export interface TrustedDevice {
  id: string;
  name: string;
  type: 'mobile' | 'desktop' | 'tablet';
  fingerprint: string;
  addedAt: Date;
  lastUsed: Date;
}

export interface LoginHistoryEntry {
  id: string;
  timestamp: Date;
  ip: string;
  location: string;
  device: string;
  success: boolean;
  riskScore: number;
}

export interface ActiveSession {
  id: string;
  deviceInfo: string;
  location: string;
  ip: string;
  createdAt: Date;
  lastActivity: Date;
  current: boolean;
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: Date;
  address?: Address;
  emergencyContact?: EmergencyContact;
  travelPreferences: TravelPreferences;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export interface TravelPreferences {
  accommodationType: string[];
  budgetRange: { min: number; max: number };
  interests: string[];
  accessibility: string[];
  travelStyle: 'luxury' | 'budget' | 'mid-range' | 'adventure';
}

// Authentication state interface
export interface AuthState extends BaseStore {
  // User data
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Authentication flow
  loginMethod: 'email' | 'oauth' | 'biometric' | 'magic-link' | null;
  isFirstLogin: boolean;
  needsOnboarding: boolean;
  needsVerification: boolean;
  
  // Security
  securityRisk: 'low' | 'medium' | 'high';
  requiresTwoFactor: boolean;
  sessionExpiry: Date | null;
  
  // Token management
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiry: Date | null;
  
  // Multi-device sync
  lastSyncTimestamp: Date | null;
  pendingSync: boolean;
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: (deviceId?: string) => Promise<void>;
  refreshTokens: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  updatePreferences: (preferences: Partial<UserPreferences>) => Promise<void>;
  updateSecuritySettings: (settings: Partial<SecuritySettings>) => Promise<void>;
  
  // Security actions
  enableTwoFactor: () => Promise<void>;
  disableTwoFactor: () => Promise<void>;
  addTrustedDevice: (device: Omit<TrustedDevice, 'id' | 'addedAt'>) => Promise<void>;
  removeTrustedDevice: (deviceId: string) => Promise<void>;
  terminateSession: (sessionId: string) => Promise<void>;
  terminateAllSessions: () => Promise<void>;
  
  // Verification actions
  verifyEmail: (token: string) => Promise<void>;
  verifyPhone: (code: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  
  // Onboarding actions
  completeOnboarding: () => Promise<void>;
  skipOnboarding: () => Promise<void>;
  updateOnboardingStep: (step: number) => void;
  
  // Utility actions
  clearError: () => void;
  syncUserData: () => Promise<void>;
  calculateSecurityScore: () => number;
}

export interface LoginCredentials {
  email?: string;
  password?: string;
  oauthProvider?: 'google' | 'facebook' | 'apple' | 'microsoft' | 'github';
  oauthToken?: string;
  biometricData?: any;
  magicLinkToken?: string;
  twoFactorCode?: string;
  deviceFingerprint?: string;
}

// Create auth store with middleware
const authConfig: PersistConfig = {
  name: 'touriquest-auth',
  enabled: true,
  version: 1,
  encrypted: true,
  storage: 'localStorage',
  whitelist: ['user', 'isAuthenticated', 'accessToken', 'refreshToken', 'tokenExpiry'],
  transform: {
    in: (state: any) => ({
      ...state,
      tokenExpiry: state.tokenExpiry ? new Date(state.tokenExpiry) : null,
      sessionExpiry: state.sessionExpiry ? new Date(state.sessionExpiry) : null,
      lastSyncTimestamp: state.lastSyncTimestamp ? new Date(state.lastSyncTimestamp) : null
    }),
    out: (state: any) => ({
      ...state,
      tokenExpiry: state.tokenExpiry?.toISOString(),
      sessionExpiry: state.sessionExpiry?.toISOString(),
      lastSyncTimestamp: state.lastSyncTimestamp?.toISOString()
    })
  }
};

const performanceConfig: PerformanceConfig = {
  enabled: true,
  threshold: 50,
  sampleRate: 1,
  trackMemory: true,
  trackUpdates: true
};

export const useAuthStore = create<AuthState>()(
  subscribeWithSelector(
    logger({ enabled: process.env.NODE_ENV === 'development', collapsed: true })(
      devtools(
        persist(
          performance(performanceConfig)(
            immer((set, get) => ({
              // Initial state
              _meta: {
                id: 'auth',
                version: 1,
                createdAt: new Date(),
                updatedAt: new Date(),
                persistEnabled: true,
                debugEnabled: process.env.NODE_ENV === 'development'
              },
              
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: null,
              
              loginMethod: null,
              isFirstLogin: false,
              needsOnboarding: false,
              needsVerification: false,
              
              securityRisk: 'low',
              requiresTwoFactor: false,
              sessionExpiry: null,
              
              accessToken: null,
              refreshToken: null,
              tokenExpiry: null,
              
              lastSyncTimestamp: null,
              pendingSync: false,
              
              // Actions
              login: async (credentials: LoginCredentials) => {
                set(draft => {
                  draft.isLoading = true;
                  draft.error = null;
                  draft._meta.updatedAt = new Date();
                });
                
                try {
                  // Simulate API call
                  const response = await authApi.login(credentials);
                  
                  set(draft => {
                    draft.user = response.user;
                    draft.isAuthenticated = true;
                    draft.accessToken = response.accessToken;
                    draft.refreshToken = response.refreshToken;
                    draft.tokenExpiry = new Date(response.tokenExpiry);
                    draft.sessionExpiry = new Date(response.sessionExpiry);
                    draft.loginMethod = credentials.oauthProvider ? 'oauth' : 
                                       credentials.biometricData ? 'biometric' : 
                                       credentials.magicLinkToken ? 'magic-link' : 'email';
                    draft.isFirstLogin = response.isFirstLogin;
                    draft.needsOnboarding = response.needsOnboarding;
                    draft.securityRisk = response.securityRisk;
                    draft.requiresTwoFactor = response.requiresTwoFactor;
                    draft.isLoading = false;
                    draft.lastSyncTimestamp = new Date();
                  });
                } catch (error) {
                  set(draft => {
                    draft.error = error instanceof Error ? error.message : 'Login failed';
                    draft.isLoading = false;
                  });
                }
              },
              
              logout: async (deviceId?: string) => {
                set(draft => {
                  draft.isLoading = true;
                });
                
                try {
                  await authApi.logout(deviceId);
                  
                  set(draft => {
                    draft.user = null;
                    draft.isAuthenticated = false;
                    draft.accessToken = null;
                    draft.refreshToken = null;
                    draft.tokenExpiry = null;
                    draft.sessionExpiry = null;
                    draft.loginMethod = null;
                    draft.isFirstLogin = false;
                    draft.needsOnboarding = false;
                    draft.needsVerification = false;
                    draft.securityRisk = 'low';
                    draft.requiresTwoFactor = false;
                    draft.error = null;
                    draft.isLoading = false;
                  });
                } catch (error) {
                  set(draft => {
                    draft.error = error instanceof Error ? error.message : 'Logout failed';
                    draft.isLoading = false;
                  });
                }
              },
              
              refreshTokens: async () => {
                const { refreshToken } = get();
                if (!refreshToken) return;
                
                try {
                  const response = await authApi.refreshTokens(refreshToken);
                  
                  set(draft => {
                    draft.accessToken = response.accessToken;
                    draft.refreshToken = response.refreshToken;
                    draft.tokenExpiry = new Date(response.tokenExpiry);
                    draft.sessionExpiry = new Date(response.sessionExpiry);
                    draft.lastSyncTimestamp = new Date();
                  });
                } catch (error) {
                  // Force logout on refresh failure
                  get().logout();
                }
              },
              
              updateUser: async (updates: Partial<User>) => {
                const { user } = get();
                if (!user) return;
                
                try {
                  const updatedUser = await authApi.updateUser(user.id, updates);
                  
                  set(draft => {
                    draft.user = updatedUser;
                    draft.lastSyncTimestamp = new Date();
                    draft._meta.updatedAt = new Date();
                  });
                } catch (error) {
                  set(draft => {
                    draft.error = error instanceof Error ? error.message : 'Failed to update user';
                  });
                }
              },
              
              updatePreferences: async (preferences: Partial<UserPreferences>) => {
                const { user } = get();
                if (!user) return;
                
                try {
                  await authApi.updatePreferences(user.id, preferences);
                  
                  set(draft => {
                    if (draft.user) {
                      draft.user.preferences = { ...draft.user.preferences, ...preferences };
                      draft.lastSyncTimestamp = new Date();
                    }
                  });
                } catch (error) {
                  set(draft => {
                    draft.error = error instanceof Error ? error.message : 'Failed to update preferences';
                  });
                }
              },
              
              updateSecuritySettings: async (settings: Partial<SecuritySettings>) => {
                const { user } = get();
                if (!user) return;
                
                try {
                  await authApi.updateSecuritySettings(user.id, settings);
                  
                  set(draft => {
                    if (draft.user) {
                      draft.user.security = { ...draft.user.security, ...settings };
                      draft.lastSyncTimestamp = new Date();
                    }
                  });
                } catch (error) {
                  set(draft => {
                    draft.error = error instanceof Error ? error.message : 'Failed to update security settings';
                  });
                }
              },
              
              enableTwoFactor: async () => {
                await get().updateSecuritySettings({ twoFactorEnabled: true });
              },
              
              disableTwoFactor: async () => {
                await get().updateSecuritySettings({ twoFactorEnabled: false });
              },
              
              addTrustedDevice: async (device: Omit<TrustedDevice, 'id' | 'addedAt'>) => {
                const { user } = get();
                if (!user) return;
                
                const newDevice: TrustedDevice = {
                  ...device,
                  id: crypto.randomUUID(),
                  addedAt: new Date()
                };
                
                const updatedDevices = [...user.security.trustedDevices, newDevice];
                await get().updateSecuritySettings({ trustedDevices: updatedDevices });
              },
              
              removeTrustedDevice: async (deviceId: string) => {
                const { user } = get();
                if (!user) return;
                
                const updatedDevices = user.security.trustedDevices.filter(d => d.id !== deviceId);
                await get().updateSecuritySettings({ trustedDevices: updatedDevices });
              },
              
              terminateSession: async (sessionId: string) => {
                const { user } = get();
                if (!user) return;
                
                try {
                  await authApi.terminateSession(sessionId);
                  
                  const updatedSessions = user.security.activeSessions.filter(s => s.id !== sessionId);
                  await get().updateSecuritySettings({ activeSessions: updatedSessions });
                } catch (error) {
                  set(draft => {
                    draft.error = error instanceof Error ? error.message : 'Failed to terminate session';
                  });
                }
              },
              
              terminateAllSessions: async () => {
                try {
                  await authApi.terminateAllSessions();
                  await get().logout();
                } catch (error) {
                  set(draft => {
                    draft.error = error instanceof Error ? error.message : 'Failed to terminate sessions';
                  });
                }
              },
              
              verifyEmail: async (token: string) => {
                try {
                  await authApi.verifyEmail(token);
                  
                  set(draft => {
                    if (draft.user) {
                      draft.user.verified = true;
                      draft.needsVerification = false;
                    }
                  });
                } catch (error) {
                  set(draft => {
                    draft.error = error instanceof Error ? error.message : 'Email verification failed';
                  });
                }
              },
              
              verifyPhone: async (code: string) => {
                try {
                  await authApi.verifyPhone(code);
                  
                  set(draft => {
                    if (draft.user) {
                      draft.needsVerification = false;
                    }
                  });
                } catch (error) {
                  set(draft => {
                    draft.error = error instanceof Error ? error.message : 'Phone verification failed';
                  });
                }
              },
              
              requestPasswordReset: async (email: string) => {
                try {
                  await authApi.requestPasswordReset(email);
                } catch (error) {
                  set(draft => {
                    draft.error = error instanceof Error ? error.message : 'Password reset request failed';
                  });
                }
              },
              
              resetPassword: async (token: string, newPassword: string) => {
                try {
                  await authApi.resetPassword(token, newPassword);
                } catch (error) {
                  set(draft => {
                    draft.error = error instanceof Error ? error.message : 'Password reset failed';
                  });
                }
              },
              
              completeOnboarding: async () => {
                try {
                  await authApi.completeOnboarding();
                  
                  set(draft => {
                    draft.needsOnboarding = false;
                  });
                } catch (error) {
                  set(draft => {
                    draft.error = error instanceof Error ? error.message : 'Failed to complete onboarding';
                  });
                }
              },
              
              skipOnboarding: async () => {
                set(draft => {
                  draft.needsOnboarding = false;
                });
              },
              
              updateOnboardingStep: (step: number) => {
                set(draft => {
                  if (draft.user?.profile) {
                    (draft.user.profile as any).onboardingStep = step;
                  }
                });
              },
              
              clearError: () => {
                set(draft => {
                  draft.error = null;
                });
              },
              
              syncUserData: async () => {
                const { user } = get();
                if (!user) return;
                
                set(draft => {
                  draft.pendingSync = true;
                });
                
                try {
                  const updatedUser = await authApi.getUserData(user.id);
                  
                  set(draft => {
                    draft.user = updatedUser;
                    draft.lastSyncTimestamp = new Date();
                    draft.pendingSync = false;
                  });
                } catch (error) {
                  set(draft => {
                    draft.pendingSync = false;
                    draft.error = error instanceof Error ? error.message : 'Failed to sync user data';
                  });
                }
              },
              
              calculateSecurityScore: () => {
                const { user } = get();
                if (!user) return 0;
                
                let score = 0;
                
                // Base score for verified email
                if (user.verified) score += 20;
                
                // Two-factor authentication
                if (user.security.twoFactorEnabled) score += 30;
                
                // Biometric authentication
                if (user.security.biometricEnabled) score += 20;
                
                // Trusted devices
                if (user.security.trustedDevices.length > 0) score += 15;
                
                // Recent login activity
                const recentLogins = user.security.loginHistory.filter(
                  entry => Date.now() - entry.timestamp.getTime() < 7 * 24 * 60 * 60 * 1000
                );
                if (recentLogins.every(entry => entry.success && entry.riskScore < 50)) {
                  score += 15;
                }
                
                return Math.min(score, 100);
              }
            }))
          ),
          authConfig
        ),
        { name: 'auth-store' }
      )
    )
  )
);

// Auth API mock (replace with actual API calls)
const authApi = {
  login: async (credentials: LoginCredentials) => {
    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      user: {
        id: '1',
        email: credentials.email || 'user@example.com',
        name: 'John Doe',
        role: 'user' as const,
        verified: true,
        preferences: {
          theme: 'system' as const,
          language: 'en',
          currency: 'USD',
          timezone: 'America/New_York',
          notifications: {
            email: true,
            push: true,
            sms: false,
            marketing: false,
            bookingUpdates: true,
            priceAlerts: true
          }
        },
        security: {
          twoFactorEnabled: false,
          biometricEnabled: false,
          trustedDevices: [],
          loginHistory: [],
          activeSessions: []
        },
        profile: {
          firstName: 'John',
          lastName: 'Doe',
          travelPreferences: {
            accommodationType: ['hotel'],
            budgetRange: { min: 100, max: 500 },
            interests: ['culture'],
            accessibility: [],
            travelStyle: 'mid-range' as const
          }
        }
      },
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      tokenExpiry: Date.now() + 3600000,
      sessionExpiry: Date.now() + 86400000,
      isFirstLogin: false,
      needsOnboarding: false,
      securityRisk: 'low' as const,
      requiresTwoFactor: false
    };
  },
  
  logout: async (deviceId?: string) => {
    await new Promise(resolve => setTimeout(resolve, 500));
  },
  
  refreshTokens: async (refreshToken: string) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      accessToken: 'new-mock-access-token',
      refreshToken: 'new-mock-refresh-token',
      tokenExpiry: Date.now() + 3600000,
      sessionExpiry: Date.now() + 86400000
    };
  },
  
  updateUser: async (userId: string, updates: Partial<User>) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return updates as User;
  },
  
  updatePreferences: async (userId: string, preferences: Partial<UserPreferences>) => {
    await new Promise(resolve => setTimeout(resolve, 500));
  },
  
  updateSecuritySettings: async (userId: string, settings: Partial<SecuritySettings>) => {
    await new Promise(resolve => setTimeout(resolve, 500));
  },
  
  terminateSession: async (sessionId: string) => {
    await new Promise(resolve => setTimeout(resolve, 500));
  },
  
  terminateAllSessions: async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
  },
  
  verifyEmail: async (token: string) => {
    await new Promise(resolve => setTimeout(resolve, 500));
  },
  
  verifyPhone: async (code: string) => {
    await new Promise(resolve => setTimeout(resolve, 500));
  },
  
  requestPasswordReset: async (email: string) => {
    await new Promise(resolve => setTimeout(resolve, 500));
  },
  
  resetPassword: async (token: string, newPassword: string) => {
    await new Promise(resolve => setTimeout(resolve, 500));
  },
  
  completeOnboarding: async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
  },
  
  getUserData: async (userId: string) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return {} as User;
  }
};

// Auth store selectors
export const authSelectors = {
  user: (state: AuthState) => state.user,
  isAuthenticated: (state: AuthState) => state.isAuthenticated,
  isLoading: (state: AuthState) => state.isLoading,
  error: (state: AuthState) => state.error,
  securityScore: (state: AuthState) => state.calculateSecurityScore(),
  needsAction: (state: AuthState) => state.needsOnboarding || state.needsVerification || state.requiresTwoFactor,
  sessionTimeLeft: (state: AuthState) => {
    if (!state.sessionExpiry) return null;
    return Math.max(0, state.sessionExpiry.getTime() - Date.now());
  }
};