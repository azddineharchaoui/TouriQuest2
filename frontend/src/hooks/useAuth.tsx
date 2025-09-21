import React, { createContext, useContext, useEffect, useState } from 'react';
import { tokenManager, UserProfile } from '../utils/tokenManager';

interface AuthContextType {
  isAuthenticated: boolean;
  user: UserProfile | null;
  login: (tokenData: any, userProfile?: UserProfile) => void;
  logout: () => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize auth state
    setIsAuthenticated(tokenManager.isAuthenticated());
    setUser(tokenManager.getUserProfile());
    setIsLoading(false);

    // Subscribe to auth state changes
    const unsubscribe = tokenManager.onAuthStateChange((authenticated) => {
      setIsAuthenticated(authenticated);
      setUser(authenticated ? tokenManager.getUserProfile() : null);
    });

    return unsubscribe;
  }, []);

  const login = (tokenData: any, userProfile?: UserProfile) => {
    tokenManager.setToken(tokenData, userProfile);
  };

  const logout = () => {
    tokenManager.clearToken();
  };

  const updateProfile = (updates: Partial<UserProfile>) => {
    tokenManager.updateUserProfile(updates);
    setUser(tokenManager.getUserProfile());
  };

  const value = {
    isAuthenticated,
    user,
    login,
    logout,
    updateProfile,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook for protecting routes
export function useRequireAuth() {
  const { isAuthenticated, isLoading } = useAuth();
  
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Redirect to auth page
      window.location.href = '/auth';
    }
  }, [isAuthenticated, isLoading]);
  
  return { isAuthenticated, isLoading };
}

// Hook for guest-only routes (redirect authenticated users)
export function useGuestOnly() {
  const { isAuthenticated, isLoading } = useAuth();
  
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      // Redirect to dashboard or home
      window.location.href = '/';
    }
  }, [isAuthenticated, isLoading]);
  
  return { isAuthenticated, isLoading };
}