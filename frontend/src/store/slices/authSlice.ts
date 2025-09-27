import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { 
  User, 
  AuthTokens, 
  LoginRequest, 
  RegisterRequest, 
  UserPreferences,
  ApiResponse 
} from '../../types/api-types';

// Auth state interface
export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  preferences: UserPreferences | null;
  lastLoginTime: string | null;
  sessionExpiry: string | null;
  twoFactorRequired: boolean;
  onboardingCompleted: boolean;
  refreshTokenAttempts: number;
}

// Initial state
const initialState: AuthState = {
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  preferences: null,
  lastLoginTime: null,
  sessionExpiry: null,
  twoFactorRequired: false,
  onboardingCompleted: false,
  refreshTokenAttempts: 0,
};

// Async thunks
export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: LoginRequest, { rejectWithValue }) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Login failed');
      }

      const data: ApiResponse<User & AuthTokens> = await response.json();
      
      // Calculate session expiry
      const expiryTime = new Date(Date.now() + data.data.expiresIn * 1000).toISOString();
      
      return {
        ...data.data,
        sessionExpiry: expiryTime,
      };
    } catch (error) {
      return rejectWithValue('Network error occurred');
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData: RegisterRequest, { rejectWithValue }) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Registration failed');
      }

      const data: ApiResponse<User & AuthTokens> = await response.json();
      return data.data;
    } catch (error) {
      return rejectWithValue('Network error occurred');
    }
  }
);

export const refreshTokens = createAsyncThunk(
  'auth/refreshTokens',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: AuthState };
      const refreshToken = state.auth.tokens?.refreshToken;

      if (!refreshToken) {
        return rejectWithValue('No refresh token available');
      }

      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        return rejectWithValue('Token refresh failed');
      }

      const data: ApiResponse<AuthTokens> = await response.json();
      return data.data;
    } catch (error) {
      return rejectWithValue('Network error occurred');
    }
  }
);

export const updateUserProfile = createAsyncThunk(
  'auth/updateProfile',
  async (updates: Partial<User>, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: AuthState };
      const token = state.auth.tokens?.accessToken;

      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Profile update failed');
      }

      const data: ApiResponse<User> = await response.json();
      return data.data;
    } catch (error) {
      return rejectWithValue('Network error occurred');
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: AuthState };
      const token = state.auth.tokens?.accessToken;

      if (token) {
        await fetch(`${process.env.REACT_APP_API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }

      return true;
    } catch (error) {
      // Even if logout fails on server, clear local state
      return true;
    }
  }
);

export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async (email: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Password reset request failed');
      }

      return { success: true, message: 'Password reset email sent' };
    } catch (error) {
      return rejectWithValue('Network error occurred');
    }
  }
);

export const verifyEmail = createAsyncThunk(
  'auth/verifyEmail',
  async (token: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/auth/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Email verification failed');
      }

      return { success: true, message: 'Email verified successfully' };
    } catch (error) {
      return rejectWithValue('Network error occurred');
    }
  }
);

// Auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    
    setTokens: (state, action: PayloadAction<AuthTokens>) => {
      state.tokens = action.payload;
      const expiryTime = new Date(Date.now() + action.payload.expiresIn * 1000).toISOString();
      state.sessionExpiry = expiryTime;
    },

    updatePreferences: (state, action: PayloadAction<Partial<UserPreferences>>) => {
      if (state.preferences) {
        state.preferences = { ...state.preferences, ...action.payload };
      }
    },

    setOnboardingCompleted: (state, action: PayloadAction<boolean>) => {
      state.onboardingCompleted = action.payload;
      if (state.user) {
        state.user.onboardingCompleted = action.payload;
      }
    },

    incrementRefreshAttempts: (state) => {
      state.refreshTokenAttempts += 1;
    },

    resetRefreshAttempts: (state) => {
      state.refreshTokenAttempts = 0;
    },

    checkTokenExpiry: (state) => {
      if (state.sessionExpiry && new Date() > new Date(state.sessionExpiry)) {
        // Token has expired, mark as unauthenticated but keep tokens for refresh attempt
        state.isAuthenticated = false;
      }
    },

    logout: (state) => {
      return initialState;
    },
  },
  
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.tokens = {
          accessToken: action.payload.accessToken,
          refreshToken: action.payload.refreshToken,
          expiresIn: action.payload.expiresIn,
          tokenType: action.payload.tokenType,
        };
        state.isAuthenticated = true;
        state.lastLoginTime = new Date().toISOString();
        state.sessionExpiry = action.payload.sessionExpiry;
        state.preferences = action.payload.preferences;
        state.onboardingCompleted = action.payload.onboardingCompleted;
        state.twoFactorRequired = false;
        state.refreshTokenAttempts = 0;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
        
        // Check if 2FA is required
        if (action.payload === '2FA_REQUIRED') {
          state.twoFactorRequired = true;
        }
      });

    // Register
    builder
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.tokens = {
          accessToken: action.payload.accessToken,
          refreshToken: action.payload.refreshToken,
          expiresIn: action.payload.expiresIn,
          tokenType: action.payload.tokenType,
        };
        state.isAuthenticated = true;
        state.lastLoginTime = new Date().toISOString();
        state.preferences = action.payload.preferences;
        state.onboardingCompleted = action.payload.onboardingCompleted;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Refresh tokens
    builder
      .addCase(refreshTokens.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(refreshTokens.fulfilled, (state, action) => {
        state.isLoading = false;
        state.tokens = action.payload;
        state.isAuthenticated = true;
        const expiryTime = new Date(Date.now() + action.payload.expiresIn * 1000).toISOString();
        state.sessionExpiry = expiryTime;
        state.refreshTokenAttempts = 0;
      })
      .addCase(refreshTokens.rejected, (state) => {
        state.isLoading = false;
        state.refreshTokenAttempts += 1;
        
        // If too many refresh attempts, logout
        if (state.refreshTokenAttempts >= 3) {
          return initialState;
        }
      });

    // Update profile
    builder
      .addCase(updateUserProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.preferences = action.payload.preferences;
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Logout
    builder
      .addCase(logoutUser.fulfilled, () => {
        return initialState;
      });

    // Forgot password
    builder
      .addCase(forgotPassword.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(forgotPassword.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Verify email
    builder
      .addCase(verifyEmail.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(verifyEmail.fulfilled, (state) => {
        state.isLoading = false;
        if (state.user) {
          state.user.isVerified = true;
        }
      })
      .addCase(verifyEmail.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

// Actions
export const {
  clearError,
  setTokens,
  updatePreferences,
  setOnboardingCompleted,
  incrementRefreshAttempts,
  resetRefreshAttempts,
  checkTokenExpiry,
  logout,
} = authSlice.actions;

// Selectors
export const selectAuth = (state: { auth: AuthState }) => state.auth;
export const selectUser = (state: { auth: AuthState }) => state.auth.user;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectAuthLoading = (state: { auth: AuthState }) => state.auth.isLoading;
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error;
export const selectUserPreferences = (state: { auth: AuthState }) => state.auth.preferences;
export const selectTokens = (state: { auth: AuthState }) => state.auth.tokens;
export const selectIsTokenExpired = (state: { auth: AuthState }) => {
  if (!state.auth.sessionExpiry) return false;
  return new Date() > new Date(state.auth.sessionExpiry);
};

export default authSlice.reducer;