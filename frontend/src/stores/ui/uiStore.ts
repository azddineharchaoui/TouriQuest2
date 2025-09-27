/**
 * UI Store with Zustand
 * Advanced UI state management with theme, modals, notifications, and layouts
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';
import { logger, persist, devtools } from '../middleware';
import { BaseStore, PersistConfig } from '../types';

// UI state types
export interface Theme {
  mode: 'light' | 'dark' | 'system';
  primaryColor: string;
  accentColor: string;
  borderRadius: 'none' | 'small' | 'medium' | 'large';
  fontFamily: 'system' | 'inter' | 'roboto';
  fontSize: 'small' | 'medium' | 'large';
  animations: boolean;
  reducedMotion: boolean;
}

export interface Modal {
  id: string;
  component: string;
  props?: Record<string, any>;
  size?: 'small' | 'medium' | 'large' | 'fullscreen';
  overlay?: boolean;
  persistent?: boolean;
  zIndex?: number;
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  timestamp: Date;
  actions?: NotificationAction[];
  persistent?: boolean;
  seen?: boolean;
}

export interface NotificationAction {
  label: string;
  action: () => void;
  style?: 'primary' | 'secondary' | 'danger';
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'loading';
  message: string;
  duration?: number;
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  action?: {
    label: string;
    callback: () => void;
  };
}

export interface Sidebar {
  isOpen: boolean;
  isCollapsed: boolean;
  width: number;
  variant: 'default' | 'floating' | 'overlay';
  position: 'left' | 'right';
}

export interface Layout {
  variant: 'default' | 'compact' | 'comfortable';
  headerHeight: number;
  footerHeight: number;
  contentMaxWidth: number;
  spacing: 'tight' | 'normal' | 'relaxed';
}

export interface Breadcrumb {
  label: string;
  href: string;
  icon?: string;
}

export interface LoadingState {
  isLoading: boolean;
  message?: string;
  progress?: number;
  type: 'spinner' | 'progress' | 'skeleton';
}

// UI state interface
export interface UIState extends BaseStore {
  // Theme
  theme: Theme;
  systemPreference: 'light' | 'dark';
  effectiveTheme: 'light' | 'dark';
  
  // Modals
  modals: Modal[];
  modalStack: string[];
  
  // Notifications
  notifications: Notification[];
  unreadNotifications: number;
  notificationSettings: {
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    maxVisible: number;
    duration: number;
    groupSimilar: boolean;
  };
  
  // Toasts
  toasts: Toast[];
  
  // Layout
  sidebar: Sidebar;
  layout: Layout;
  breadcrumbs: Breadcrumb[];
  
  // Loading states
  globalLoading: LoadingState;
  componentLoading: Record<string, LoadingState>;
  
  // User interactions
  isOffline: boolean;
  isMobile: boolean;
  isTablet: boolean;
  screenSize: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  
  // Accessibility
  highContrast: boolean;
  screenReader: boolean;
  keyboardNavigation: boolean;
  
  // Developer tools
  showDebugInfo: boolean;
  performanceMode: boolean;
  
  // Actions
  // Theme actions
  setTheme: (theme: Partial<Theme>) => void;
  toggleTheme: () => void;
  resetTheme: () => void;
  
  // Modal actions
  openModal: (modal: Omit<Modal, 'id'>) => string;
  closeModal: (id: string) => void;
  closeAllModals: () => void;
  updateModalProps: (id: string, props: Record<string, any>) => void;
  
  // Notification actions
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => string;
  removeNotification: (id: string) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  clearNotifications: () => void;
  
  // Toast actions
  showToast: (toast: Omit<Toast, 'id'>) => string;
  hideToast: (id: string) => void;
  hideAllToasts: () => void;
  
  // Layout actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  updateLayout: (layout: Partial<Layout>) => void;
  setBreadcrumbs: (breadcrumbs: Breadcrumb[]) => void;
  addBreadcrumb: (breadcrumb: Breadcrumb) => void;
  
  // Loading actions
  setGlobalLoading: (loading: Partial<LoadingState> | boolean) => void;
  setComponentLoading: (component: string, loading: Partial<LoadingState> | boolean) => void;
  clearComponentLoading: (component: string) => void;
  clearAllLoading: () => void;
  
  // Utility actions
  updateScreenSize: () => void;
  setOfflineStatus: (offline: boolean) => void;
  toggleDebugInfo: () => void;
  togglePerformanceMode: () => void;
}

// Create UI store with middleware
const uiConfig: PersistConfig = {
  name: 'touriquest-ui',
  enabled: true,
  version: 1,
  encrypted: false,
  storage: 'localStorage',
  whitelist: ['theme', 'sidebar', 'layout', 'notificationSettings', 'highContrast', 'performanceMode'],
  transform: {
    in: (state: any) => ({
      ...state,
      modals: [],
      notifications: [],
      toasts: [],
      globalLoading: { isLoading: false, type: 'spinner' },
      componentLoading: {}
    })
  }
};

export const useUIStore = create<UIState>()(
  subscribeWithSelector(
    logger({ enabled: process.env.NODE_ENV === 'development', collapsed: true })(
      devtools(
        persist(
          immer((set, get) => ({
            // Initial state
            _meta: {
              id: 'ui',
              version: 1,
              createdAt: new Date(),
              updatedAt: new Date(),
              persistEnabled: true,
              debugEnabled: process.env.NODE_ENV === 'development'
            },
            
            theme: {
              mode: 'system',
              primaryColor: '#2563eb',
              accentColor: '#dc2626',
              borderRadius: 'medium',
              fontFamily: 'inter',
              fontSize: 'medium',
              animations: true,
              reducedMotion: false
            },
            systemPreference: 'light',
            effectiveTheme: 'light',
            
            modals: [],
            modalStack: [],
            
            notifications: [],
            unreadNotifications: 0,
            notificationSettings: {
              position: 'top-right',
              maxVisible: 5,
              duration: 5000,
              groupSimilar: true
            },
            
            toasts: [],
            
            sidebar: {
              isOpen: true,
              isCollapsed: false,
              width: 280,
              variant: 'default',
              position: 'left'
            },
            
            layout: {
              variant: 'default',
              headerHeight: 64,
              footerHeight: 80,
              contentMaxWidth: 1200,
              spacing: 'normal'
            },
            
            breadcrumbs: [],
            
            globalLoading: {
              isLoading: false,
              type: 'spinner'
            },
            componentLoading: {},
            
            isOffline: false,
            isMobile: false,
            isTablet: false,
            screenSize: 'lg',
            
            highContrast: false,
            screenReader: false,
            keyboardNavigation: false,
            
            showDebugInfo: false,
            performanceMode: false,
            
            // Theme actions
            setTheme: (theme: Partial<Theme>) => {
              set(draft => {
                draft.theme = { ...draft.theme, ...theme };
                draft._meta.updatedAt = new Date();
                
                // Update effective theme
                if (theme.mode) {
                  if (theme.mode === 'system') {
                    draft.effectiveTheme = draft.systemPreference;
                  } else {
                    draft.effectiveTheme = theme.mode;
                  }
                }
              });
            },
            
            toggleTheme: () => {
              const { theme } = get();
              const newMode = theme.mode === 'light' ? 'dark' : 'light';
              get().setTheme({ mode: newMode });
            },
            
            resetTheme: () => {
              set(draft => {
                draft.theme = {
                  mode: 'system',
                  primaryColor: '#2563eb',
                  accentColor: '#dc2626',
                  borderRadius: 'medium',
                  fontFamily: 'inter',
                  fontSize: 'medium',
                  animations: true,
                  reducedMotion: false
                };
              });
            },
            
            // Modal actions
            openModal: (modal: Omit<Modal, 'id'>) => {
              const id = crypto.randomUUID();
              
              set(draft => {
                draft.modals.push({
                  ...modal,
                  id,
                  size: modal.size || 'medium',
                  overlay: modal.overlay !== false,
                  persistent: modal.persistent || false,
                  zIndex: 1000 + draft.modals.length
                });
                draft.modalStack.push(id);
              });
              
              return id;
            },
            
            closeModal: (id: string) => {
              set(draft => {
                draft.modals = draft.modals.filter(modal => modal.id !== id);
                draft.modalStack = draft.modalStack.filter(modalId => modalId !== id);
              });
            },
            
            closeAllModals: () => {
              set(draft => {
                draft.modals = [];
                draft.modalStack = [];
              });
            },
            
            updateModalProps: (id: string, props: Record<string, any>) => {
              set(draft => {
                const modal = draft.modals.find(m => m.id === id);
                if (modal) {
                  modal.props = { ...modal.props, ...props };
                }
              });
            },
            
            // Notification actions
            addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => {
              const id = crypto.randomUUID();
              
              set(draft => {
                const newNotification: Notification = {
                  ...notification,
                  id,
                  timestamp: new Date(),
                  seen: false
                };
                
                // Check for similar notifications if grouping is enabled
                if (draft.notificationSettings.groupSimilar) {
                  const similar = draft.notifications.find(n => 
                    n.type === notification.type && 
                    n.title === notification.title &&
                    !n.seen
                  );
                  
                  if (similar) {
                    similar.message = notification.message;
                    similar.timestamp = new Date();
                    return similar.id;
                  }
                }
                
                draft.notifications.unshift(newNotification);
                draft.unreadNotifications++;
                
                // Auto-remove after duration
                if (notification.duration !== 0 && !notification.persistent) {
                  setTimeout(() => {
                    get().removeNotification(id);
                  }, notification.duration || 5000);
                }
              });
              
              return id;
            },
            
            removeNotification: (id: string) => {
              set(draft => {
                const notification = draft.notifications.find(n => n.id === id);
                if (notification && !notification.seen) {
                  draft.unreadNotifications = Math.max(0, draft.unreadNotifications - 1);
                }
                draft.notifications = draft.notifications.filter(n => n.id !== id);
              });
            },
            
            markNotificationAsRead: (id: string) => {
              set(draft => {
                const notification = draft.notifications.find(n => n.id === id);
                if (notification && !notification.seen) {
                  notification.seen = true;
                  draft.unreadNotifications = Math.max(0, draft.unreadNotifications - 1);
                }
              });
            },
            
            markAllNotificationsAsRead: () => {
              set(draft => {
                draft.notifications.forEach(n => n.seen = true);
                draft.unreadNotifications = 0;
              });
            },
            
            clearNotifications: () => {
              set(draft => {
                draft.notifications = [];
                draft.unreadNotifications = 0;
              });
            },
            
            // Toast actions
            showToast: (toast: Omit<Toast, 'id'>) => {
              const id = crypto.randomUUID();
              
              set(draft => {
                draft.toasts.push({
                  ...toast,
                  id,
                  position: toast.position || 'bottom-right',
                  duration: toast.duration || 3000
                });
              });
              
              // Auto-hide toast
              if (toast.type !== 'loading' && toast.duration !== 0) {
                setTimeout(() => {
                  get().hideToast(id);
                }, toast.duration || 3000);
              }
              
              return id;
            },
            
            hideToast: (id: string) => {
              set(draft => {
                draft.toasts = draft.toasts.filter(t => t.id !== id);
              });
            },
            
            hideAllToasts: () => {
              set(draft => {
                draft.toasts = [];
              });
            },
            
            // Layout actions
            toggleSidebar: () => {
              set(draft => {
                draft.sidebar.isOpen = !draft.sidebar.isOpen;
              });
            },
            
            setSidebarOpen: (open: boolean) => {
              set(draft => {
                draft.sidebar.isOpen = open;
              });
            },
            
            setSidebarCollapsed: (collapsed: boolean) => {
              set(draft => {
                draft.sidebar.isCollapsed = collapsed;
              });
            },
            
            updateLayout: (layout: Partial<Layout>) => {
              set(draft => {
                draft.layout = { ...draft.layout, ...layout };
              });
            },
            
            setBreadcrumbs: (breadcrumbs: Breadcrumb[]) => {
              set(draft => {
                draft.breadcrumbs = breadcrumbs;
              });
            },
            
            addBreadcrumb: (breadcrumb: Breadcrumb) => {
              set(draft => {
                draft.breadcrumbs.push(breadcrumb);
              });
            },
            
            // Loading actions
            setGlobalLoading: (loading: Partial<LoadingState> | boolean) => {
              set(draft => {
                if (typeof loading === 'boolean') {
                  draft.globalLoading.isLoading = loading;
                } else {
                  draft.globalLoading = { ...draft.globalLoading, ...loading };
                }
              });
            },
            
            setComponentLoading: (component: string, loading: Partial<LoadingState> | boolean) => {
              set(draft => {
                if (typeof loading === 'boolean') {
                  if (loading) {
                    draft.componentLoading[component] = { isLoading: true, type: 'spinner' };
                  } else {
                    delete draft.componentLoading[component];
                  }
                } else {
                  draft.componentLoading[component] = {
                    isLoading: true,
                    type: 'spinner',
                    ...draft.componentLoading[component],
                    ...loading
                  };
                }
              });
            },
            
            clearComponentLoading: (component: string) => {
              set(draft => {
                delete draft.componentLoading[component];
              });
            },
            
            clearAllLoading: () => {
              set(draft => {
                draft.globalLoading = { isLoading: false, type: 'spinner' };
                draft.componentLoading = {};
              });
            },
            
            // Utility actions
            updateScreenSize: () => {
              const width = window.innerWidth;
              let screenSize: UIState['screenSize'] = 'lg';
              let isMobile = false;
              let isTablet = false;
              
              if (width < 640) {
                screenSize = 'xs';
                isMobile = true;
              } else if (width < 768) {
                screenSize = 'sm';
                isMobile = true;
              } else if (width < 1024) {
                screenSize = 'md';
                isTablet = true;
              } else if (width < 1280) {
                screenSize = 'lg';
              } else if (width < 1536) {
                screenSize = 'xl';
              } else {
                screenSize = '2xl';
              }
              
              set(draft => {
                draft.screenSize = screenSize;
                draft.isMobile = isMobile;
                draft.isTablet = isTablet;
                
                // Auto-collapse sidebar on mobile
                if (isMobile && draft.sidebar.isOpen) {
                  draft.sidebar.isOpen = false;
                }
              });
            },
            
            setOfflineStatus: (offline: boolean) => {
              set(draft => {
                draft.isOffline = offline;
              });
              
              // Show notification when going offline/online
              if (offline) {
                get().addNotification({
                  type: 'warning',
                  title: 'Connection Lost',
                  message: 'You are now offline. Some features may be limited.',
                  persistent: true
                });
              } else {
                get().addNotification({
                  type: 'success',
                  title: 'Connection Restored',
                  message: 'You are back online.',
                  duration: 3000
                });
              }
            },
            
            toggleDebugInfo: () => {
              set(draft => {
                draft.showDebugInfo = !draft.showDebugInfo;
              });
            },
            
            togglePerformanceMode: () => {
              set(draft => {
                draft.performanceMode = !draft.performanceMode;
                
                // Disable animations in performance mode
                if (draft.performanceMode) {
                  draft.theme.animations = false;
                } else {
                  draft.theme.animations = true;
                }
              });
            }
          })),
          uiConfig
        ),
        { name: 'ui-store' }
      )
    )
  )
);

// UI store selectors
export const uiSelectors = {
  theme: (state: UIState) => state.theme,
  effectiveTheme: (state: UIState) => state.effectiveTheme,
  isDarkMode: (state: UIState) => state.effectiveTheme === 'dark',
  modals: (state: UIState) => state.modals,
  activeModal: (state: UIState) => state.modals[state.modals.length - 1],
  notifications: (state: UIState) => state.notifications,
  unreadNotifications: (state: UIState) => state.unreadNotifications,
  toasts: (state: UIState) => state.toasts,
  sidebar: (state: UIState) => state.sidebar,
  layout: (state: UIState) => state.layout,
  breadcrumbs: (state: UIState) => state.breadcrumbs,
  isLoading: (state: UIState) => state.globalLoading.isLoading,
  componentLoading: (component: string) => (state: UIState) => state.componentLoading[component],
  isOffline: (state: UIState) => state.isOffline,
  isMobile: (state: UIState) => state.isMobile,
  isTablet: (state: UIState) => state.isTablet,
  screenSize: (state: UIState) => state.screenSize
};

// Initialize screen size detection
if (typeof window !== 'undefined') {
  // Initial screen size
  useUIStore.getState().updateScreenSize();
  
  // Listen for resize events
  window.addEventListener('resize', () => {
    useUIStore.getState().updateScreenSize();
  });
  
  // Listen for online/offline events
  window.addEventListener('online', () => {
    useUIStore.getState().setOfflineStatus(false);
  });
  
  window.addEventListener('offline', () => {
    useUIStore.getState().setOfflineStatus(true);
  });
  
  // Detect system theme preference
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  useUIStore.setState(state => ({
    ...state,
    systemPreference: mediaQuery.matches ? 'dark' : 'light',
    effectiveTheme: state.theme.mode === 'system' 
      ? (mediaQuery.matches ? 'dark' : 'light')
      : state.theme.mode
  }));
  
  mediaQuery.addEventListener('change', (e) => {
    useUIStore.setState(state => ({
      ...state,
      systemPreference: e.matches ? 'dark' : 'light',
      effectiveTheme: state.theme.mode === 'system' 
        ? (e.matches ? 'dark' : 'light')
        : state.theme.mode
    }));
  });
}