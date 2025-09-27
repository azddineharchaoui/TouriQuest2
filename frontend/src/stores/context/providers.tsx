/**
 * Global State Context Providers
 * Context API for theme and user session management with proper composition
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuthStore, authSelectors } from '../auth/authStore';
import { useUIStore, uiSelectors } from '../ui/uiStore';

// Theme Context
export interface ThemeContextValue {
  theme: string;
  effectiveTheme: 'light' | 'dark';
  isDarkMode: boolean;
  toggleTheme: () => void;
  setTheme: (theme: string) => void;
  colors: Record<string, string>;
  typography: Record<string, string>;
  spacing: Record<string, string>;
  shadows: Record<string, string>;
  animations: Record<string, string>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Theme Provider Component
interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const theme = useUIStore(uiSelectors.theme);
  const effectiveTheme = useUIStore(uiSelectors.effectiveTheme);
  const isDarkMode = useUIStore(uiSelectors.isDarkMode);
  const { setTheme: setUITheme, toggleTheme: toggleUITheme } = useUIStore();
  
  // Theme tokens
  const colors = {
    // Light mode colors
    light: {
      primary: theme.primaryColor,
      accent: theme.accentColor,
      background: '#ffffff',
      surface: '#f8fafc',
      card: '#ffffff',
      text: '#1e293b',
      textSecondary: '#64748b',
      border: '#e2e8f0',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6'
    },
    // Dark mode colors
    dark: {
      primary: theme.primaryColor,
      accent: theme.accentColor,
      background: '#0f172a',
      surface: '#1e293b',
      card: '#334155',
      text: '#f1f5f9',
      textSecondary: '#94a3b8',
      border: '#475569',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6'
    }
  };
  
  const typography = {
    fontFamily: theme.fontFamily === 'inter' ? 'Inter, sans-serif' : 
                 theme.fontFamily === 'roboto' ? 'Roboto, sans-serif' : 
                 'system-ui, sans-serif',
    fontSize: {
      small: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem'
      },
      medium: {
        xs: '0.875rem',
        sm: '1rem',
        base: '1.125rem',
        lg: '1.25rem',
        xl: '1.5rem',
        '2xl': '1.75rem',
        '3xl': '2.25rem'
      },
      large: {
        xs: '1rem',
        sm: '1.125rem',
        base: '1.25rem',
        lg: '1.5rem',
        xl: '1.75rem',
        '2xl': '2rem',
        '3xl': '2.5rem'
      }
    }[theme.fontSize],
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75'
    },
    fontWeight: {
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700'
    }
  };
  
  const spacing = {
    none: {
      xs: '0.25rem',
      sm: '0.5rem',
      base: '0.75rem',
      lg: '1rem',
      xl: '1.5rem',
      '2xl': '2rem'
    },
    small: {
      xs: '0.5rem',
      sm: '0.75rem',
      base: '1rem',
      lg: '1.5rem',
      xl: '2rem',
      '2xl': '2.5rem'
    },
    medium: {
      xs: '0.75rem',
      sm: '1rem',
      base: '1.5rem',
      lg: '2rem',
      xl: '2.5rem',
      '2xl': '3rem'
    },
    large: {
      xs: '1rem',
      sm: '1.5rem',
      base: '2rem',
      lg: '2.5rem',
      xl: '3rem',
      '2xl': '4rem'
    }
  }[theme.borderRadius || 'medium'];
  
  const borderRadius = {
    none: '0',
    small: '0.25rem',
    medium: '0.5rem',
    large: '0.75rem',
    full: '9999px'
  };
  
  const shadows = {
    light: {
      sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
      md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
    },
    dark: {
      sm: '0 1px 2px 0 rgb(0 0 0 / 0.2)',
      base: '0 1px 3px 0 rgb(0 0 0 / 0.3), 0 1px 2px -1px rgb(0 0 0 / 0.3)',
      md: '0 4px 6px -1px rgb(0 0 0 / 0.3), 0 2px 4px -2px rgb(0 0 0 / 0.3)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.3), 0 4px 6px -4px rgb(0 0 0 / 0.3)',
      xl: '0 20px 25px -5px rgb(0 0 0 / 0.3), 0 8px 10px -6px rgb(0 0 0 / 0.3)'
    }
  };
  
  const animations = {
    transition: theme.animations ? 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
    duration: {
      fast: '150ms',
      normal: '200ms',
      slow: '300ms'
    },
    easing: {
      linear: 'linear',
      ease: 'ease',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)'
    }
  };
  
  // Apply CSS custom properties
  useEffect(() => {
    const root = document.documentElement;
    const currentColors = colors[effectiveTheme];
    const currentShadows = shadows[effectiveTheme];
    
    // Set color variables
    Object.entries(currentColors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });
    
    // Set shadow variables
    Object.entries(currentShadows).forEach(([key, value]) => {
      root.style.setProperty(`--shadow-${key}`, value);
    });
    
    // Set typography variables
    root.style.setProperty('--font-family', typography.fontFamily);
    Object.entries(typography.fontSize).forEach(([key, value]) => {
      root.style.setProperty(`--text-${key}`, value);
    });
    
    // Set spacing variables
    Object.entries(spacing).forEach(([key, value]) => {
      root.style.setProperty(`--spacing-${key}`, value);
    });
    
    // Set border radius variables
    Object.entries(borderRadius).forEach(([key, value]) => {
      root.style.setProperty(`--radius-${key}`, value);
    });
    
    // Set animation variables
    root.style.setProperty('--transition', animations.transition);
    Object.entries(animations.duration).forEach(([key, value]) => {
      root.style.setProperty(`--duration-${key}`, value);
    });
    
    // Set data attribute for theme
    root.setAttribute('data-theme', effectiveTheme);
  }, [effectiveTheme, theme, colors, shadows, typography, spacing, animations]);
  
  const value: ThemeContextValue = {
    theme: theme.mode,
    effectiveTheme,
    isDarkMode,
    toggleTheme: toggleUITheme,
    setTheme: (newTheme: string) => setUITheme({ mode: newTheme as any }),
    colors: colors[effectiveTheme],
    typography,
    spacing,
    shadows: shadows[effectiveTheme],
    animations
  };
  
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// User Session Context
export interface UserSessionContextValue {
  user: any;
  isAuthenticated: boolean;
  isLoading: boolean;
  permissions: string[];
  preferences: any;
  sessionInfo: {
    startTime: Date;
    lastActivity: Date;
    timeRemaining: number | null;
  };
  login: (credentials: any) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: any) => Promise<void>;
  hasPermission: (permission: string) => boolean;
  extendSession: () => Promise<void>;
}

const UserSessionContext = createContext<UserSessionContextValue | null>(null);

export const useUserSession = () => {
  const context = useContext(UserSessionContext);
  if (!context) {
    throw new Error('useUserSession must be used within a UserSessionProvider');
  }
  return context;
};

// User Session Provider Component
interface UserSessionProviderProps {
  children: ReactNode;
}

export const UserSessionProvider: React.FC<UserSessionProviderProps> = ({ children }) => {
  const user = useAuthStore(authSelectors.user);
  const isAuthenticated = useAuthStore(authSelectors.isAuthenticated);
  const isLoading = useAuthStore(authSelectors.isLoading);
  const sessionTimeLeft = useAuthStore(authSelectors.sessionTimeLeft);
  const { login, logout, updateUser, refreshTokens } = useAuthStore();
  
  const [sessionInfo, setSessionInfo] = useState({
    startTime: new Date(),
    lastActivity: new Date(),
    timeRemaining: sessionTimeLeft
  });
  
  // Update session info
  useEffect(() => {
    if (isAuthenticated) {
      setSessionInfo(prev => ({
        ...prev,
        timeRemaining: sessionTimeLeft
      }));
    }
  }, [sessionTimeLeft, isAuthenticated]);
  
  // Track user activity
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const updateActivity = () => {
      setSessionInfo(prev => ({
        ...prev,
        lastActivity: new Date()
      }));
    };
    
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });
    
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity);
      });
    };
  }, [isAuthenticated]);
  
  // Auto-refresh tokens
  useEffect(() => {
    if (!isAuthenticated || !sessionTimeLeft) return;
    
    // Refresh token when 5 minutes remaining
    const refreshTime = sessionTimeLeft - (5 * 60 * 1000);
    
    if (refreshTime > 0) {
      const timer = setTimeout(() => {
        refreshTokens();
      }, refreshTime);
      
      return () => clearTimeout(timer);
    }
  }, [sessionTimeLeft, isAuthenticated, refreshTokens]);
  
  // Get user permissions
  const permissions = user?.role === 'admin' ? ['*'] : 
                    user?.role === 'moderator' ? ['moderate', 'view'] : 
                    user ? ['view'] : [];
  
  const hasPermission = (permission: string): boolean => {
    if (permissions.includes('*')) return true;
    return permissions.includes(permission);
  };
  
  const extendSession = async (): Promise<void> => {
    await refreshTokens();
    setSessionInfo(prev => ({
      ...prev,
      lastActivity: new Date()
    }));
  };
  
  const value: UserSessionContextValue = {
    user,
    isAuthenticated,
    isLoading,
    permissions,
    preferences: user?.preferences,
    sessionInfo,
    login,
    logout,
    updateProfile: updateUser,
    hasPermission,
    extendSession
  };
  
  return (
    <UserSessionContext.Provider value={value}>
      {children}
    </UserSessionContext.Provider>
  );
};

// App State Context (combines other contexts)
export interface AppStateContextValue {
  isOnline: boolean;
  deviceInfo: {
    isMobile: boolean;
    isTablet: boolean;
    screenSize: string;
    userAgent: string;
  };
  features: {
    notifications: boolean;
    offline: boolean;
    biometric: boolean;
    geolocation: boolean;
  };
  version: string;
  buildInfo: {
    timestamp: string;
    commit: string;
    environment: string;
  };
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
};

// App State Provider Component
interface AppStateProviderProps {
  children: ReactNode;
}

export const AppStateProvider: React.FC<AppStateProviderProps> = ({ children }) => {
  const isOffline = useUIStore(uiSelectors.isOffline);
  const isMobile = useUIStore(uiSelectors.isMobile);
  const isTablet = useUIStore(uiSelectors.isTablet);
  const screenSize = useUIStore(uiSelectors.screenSize);
  
  const [features] = useState({
    notifications: 'Notification' in window,
    offline: 'serviceWorker' in navigator,
    biometric: 'PublicKeyCredential' in window,
    geolocation: 'geolocation' in navigator
  });
  
  const value: AppStateContextValue = {
    isOnline: !isOffline,
    deviceInfo: {
      isMobile,
      isTablet,
      screenSize,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : ''
    },
    features,
    version: process.env.REACT_APP_VERSION || '1.0.0',
    buildInfo: {
      timestamp: process.env.REACT_APP_BUILD_TIME || new Date().toISOString(),
      commit: process.env.REACT_APP_GIT_COMMIT || 'unknown',
      environment: process.env.NODE_ENV
    }
  };
  
  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
};

// Root Provider Component (combines all providers)
interface StateProvidersProps {
  children: ReactNode;
}

export const StateProviders: React.FC<StateProvidersProps> = ({ children }) => {
  return (
    <AppStateProvider>
      <UserSessionProvider>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </UserSessionProvider>
    </AppStateProvider>
  );
};

// Hooks for easy access to combined state
export const useGlobalState = () => {
  const theme = useTheme();
  const userSession = useUserSession();
  const appState = useAppState();
  
  return {
    theme,
    userSession,
    appState
  };
};

// Higher-order component for state injection
export function withGlobalState<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  const WrappedComponent = (props: P) => {
    const globalState = useGlobalState();
    
    return <Component {...props} globalState={globalState} />;
  };
  
  WrappedComponent.displayName = `withGlobalState(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// Context debugging helper (development only)
if (process.env.NODE_ENV === 'development') {
  (window as any).__TOURIQUEST_CONTEXTS__ = {
    ThemeContext,
    UserSessionContext,
    AppStateContext
  };
}