// Token management utilities for JWT authentication
export interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  tokenType: string;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  avatar?: string;
  isEmailVerified: boolean;
  isTwoFactorEnabled: boolean;
  role: string;
  preferences: {
    language: string;
    currency: string;
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
  };
}

class TokenManager {
  private tokenData: TokenData | null = null;
  private userProfile: UserProfile | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;
  private listeners: ((isAuthenticated: boolean) => void)[] = [];

  constructor() {
    this.loadTokenFromStorage();
    this.setupAxiosInterceptors();
  }

  // Load token from localStorage on initialization
  private loadTokenFromStorage(): void {
    try {
      const storedToken = localStorage.getItem('auth_token');
      const storedUser = localStorage.getItem('user_profile');
      
      if (storedToken) {
        const tokenData = JSON.parse(storedToken) as TokenData;
        
        // Check if token is still valid
        if (tokenData.expiresAt > Date.now()) {
          this.tokenData = tokenData;
          this.scheduleTokenRefresh();
        } else {
          // Token expired, try to refresh
          this.refreshToken();
        }
      }

      if (storedUser) {
        this.userProfile = JSON.parse(storedUser) as UserProfile;
      }
    } catch (error) {
      console.error('Error loading token from storage:', error);
      this.clearToken();
    }
  }

  // Set up authentication token handling
  private setupAxiosInterceptors(): void {
    // This will be handled directly through the API client's setAuthTokens method
    // The API client will automatically include auth headers when tokens are set
    this.updateAPIClientTokens();
  }

  // Update API client with current tokens
  private updateAPIClientTokens(): void {
    if (this.tokenData?.accessToken) {
      import('../api').then(({ default: api }) => {
        api.setAuthTokens(this.tokenData!.accessToken, this.tokenData!.refreshToken);
      });
    }
  }

  // Store token and user data
  setToken(tokenData: TokenData, userProfile?: UserProfile): void {
    this.tokenData = tokenData;
    
    if (userProfile) {
      this.userProfile = userProfile;
      localStorage.setItem('user_profile', JSON.stringify(userProfile));
    }

    localStorage.setItem('auth_token', JSON.stringify(tokenData));
    this.updateAPIClientTokens();
    this.scheduleTokenRefresh();
    this.notifyListeners(true);
  }

  // Get current access token
  getAccessToken(): string | null {
    return this.tokenData?.accessToken || null;
  }

  // Get current user profile
  getUserProfile(): UserProfile | null {
    return this.userProfile;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.tokenData !== null && this.tokenData.expiresAt > Date.now();
  }

  // Clear token and user data (logout)
  clearToken(): void {
    this.tokenData = null;
    this.userProfile = null;
    
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_profile');
    
    // Clear API client tokens
    import('../api').then(({ default: api }) => {
      api.clearAuthTokens();
    });
    
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    
    this.notifyListeners(false);
  }

  // Refresh the access token
  async refreshToken(): Promise<boolean> {
    if (!this.tokenData?.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const api = await import('../api');
      const response = await api.default.auth.refreshToken({ 
        refreshToken: this.tokenData.refreshToken 
      });
      
      const newTokenData: TokenData = {
        accessToken: response.data.accessToken,
        refreshToken: this.tokenData.refreshToken, // Keep existing refresh token
        expiresAt: Date.now() + (response.data.expiresIn * 1000),
        tokenType: 'Bearer'
      };

      this.setToken(newTokenData);
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.clearToken();
      return false;
    }
  }

  // Schedule automatic token refresh
  private scheduleTokenRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    if (!this.tokenData) return;

    // Refresh token 5 minutes before expiry
    const refreshTime = this.tokenData.expiresAt - Date.now() - (5 * 60 * 1000);
    
    if (refreshTime > 0) {
      this.refreshTimer = setTimeout(() => {
        this.refreshToken().catch((error) => {
          console.error('Automatic token refresh failed:', error);
        });
      }, refreshTime);
    }
  }

  // Subscribe to authentication state changes
  onAuthStateChange(listener: (isAuthenticated: boolean) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Notify all listeners of auth state change
  private notifyListeners(isAuthenticated: boolean): void {
    this.listeners.forEach(listener => {
      try {
        listener(isAuthenticated);
      } catch (error) {
        console.error('Error in auth state listener:', error);
      }
    });
  }

  // Update user profile
  updateUserProfile(updates: Partial<UserProfile>): void {
    if (this.userProfile) {
      this.userProfile = { ...this.userProfile, ...updates };
      localStorage.setItem('user_profile', JSON.stringify(this.userProfile));
    }
  }

  // Get token expiry time
  getTokenExpiry(): Date | null {
    return this.tokenData ? new Date(this.tokenData.expiresAt) : null;
  }

  // Check if token will expire soon (within next 10 minutes)
  willExpireSoon(): boolean {
    if (!this.tokenData) return false;
    const tenMinutesFromNow = Date.now() + (10 * 60 * 1000);
    return this.tokenData.expiresAt <= tenMinutesFromNow;
  }

  // Force token refresh
  async forceRefresh(): Promise<boolean> {
    return this.refreshToken();
  }
}

// Export singleton instance
export const tokenManager = new TokenManager();

// Utility functions for easy access
export const getAccessToken = () => tokenManager.getAccessToken();
export const getUserProfile = () => tokenManager.getUserProfile();
export const isAuthenticated = () => tokenManager.isAuthenticated();
export const logout = () => tokenManager.clearToken();
export const updateProfile = (updates: Partial<UserProfile>) => tokenManager.updateUserProfile(updates);