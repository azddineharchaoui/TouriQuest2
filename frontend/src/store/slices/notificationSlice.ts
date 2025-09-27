import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { 
  Notification,
  NotificationType,
  NotificationSettings,
  PushSubscription as PushSubscriptionType,
  ApiResponse 
} from '../../types/api-types';

// Notification state interface
export interface NotificationState {
  // Notifications list
  notifications: Record<string, Notification>;
  notificationsList: string[];
  unreadCount: number;
  
  // Loading states
  notificationsLoading: boolean;
  markingAsRead: Record<string, boolean>;
  deletingNotification: Record<string, boolean>;
  
  // Settings
  settings: NotificationSettings | null;
  settingsLoading: boolean;
  settingsError: string | null;
  
  // Push notifications
  pushSubscription: PushSubscriptionType | null;
  pushSupported: boolean;
  pushPermission: NotificationPermission;
  subscriptionLoading: boolean;
  
  // Filters
  typeFilter: NotificationType | 'all';
  readFilter: 'all' | 'unread' | 'read';
  
  // UI state
  notificationPanelOpen: boolean;
  settingsModalOpen: boolean;
  selectedNotification: string | null;
  
  // Real-time updates
  connected: boolean;
  lastUpdate: string | null;
  connectionError: string | null;
  
  // Toast notifications (temporary UI notifications)
  toasts: Array<{
    id: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    duration?: number;
    action?: {
      label: string;
      onClick: () => void;
    };
  }>;
  
  // Cache metadata
  lastFetch: string | null;
  cacheExpiry: number;
}

// Initial state
const initialState: NotificationState = {
  notifications: {},
  notificationsList: [],
  unreadCount: 0,
  
  notificationsLoading: false,
  markingAsRead: {},
  deletingNotification: {},
  
  settings: null,
  settingsLoading: false,
  settingsError: null,
  
  pushSubscription: null,
  pushSupported: 'Notification' in window && 'serviceWorker' in navigator,
  pushPermission: 'Notification' in window ? Notification.permission : 'denied',
  subscriptionLoading: false,
  
  typeFilter: 'all',
  readFilter: 'all',
  
  notificationPanelOpen: false,
  settingsModalOpen: false,
  selectedNotification: null,
  
  connected: false,
  lastUpdate: null,
  connectionError: null,
  
  toasts: [],
  
  lastFetch: null,
  cacheExpiry: 5, // 5 minutes for notifications
};

// Helper function to check cache validity
const isCacheValid = (lastFetch: string, expiryMinutes: number): boolean => {
  if (!lastFetch) return false;
  const lastFetchTime = new Date(lastFetch);
  const now = new Date();
  const diffMinutes = (now.getTime() - lastFetchTime.getTime()) / (1000 * 60);
  return diffMinutes < expiryMinutes;
};

// Async thunks
export const fetchNotifications = createAsyncThunk(
  'notifications/fetch',
  async (
    { page = 1, limit = 50, type, unreadOnly }: { 
      page?: number; 
      limit?: number; 
      type?: NotificationType; 
      unreadOnly?: boolean; 
    } = {},
    { getState, rejectWithValue }
  ) => {
    try {
      const state = getState() as { 
        auth: { tokens: { accessToken: string } | null };
        notifications: NotificationState;
      };
      
      const token = state.auth.tokens?.accessToken;
      if (!token) {
        return rejectWithValue('Authentication required');
      }

      // Check cache for first page only
      if (
        page === 1 && 
        !type && 
        !unreadOnly && 
        isCacheValid(state.notifications.lastFetch!, state.notifications.cacheExpiry)
      ) {
        return { fromCache: true };
      }

      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (type) queryParams.append('type', type);
      if (unreadOnly) queryParams.append('unreadOnly', 'true');

      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/notifications?${queryParams}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const data: ApiResponse<{ notifications: Notification[]; unreadCount: number }> = await response.json();
      
      return {
        notifications: data.data.notifications,
        unreadCount: data.data.unreadCount,
        page,
      };
    } catch (error) {
      return rejectWithValue('Failed to fetch notifications');
    }
  }
);

export const markNotificationAsRead = createAsyncThunk(
  'notifications/markAsRead',
  async (id: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { 
        auth: { tokens: { accessToken: string } | null } 
      };
      
      const token = state.auth.tokens?.accessToken;
      if (!token) {
        return rejectWithValue('Authentication required');
      }

      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/notifications/${id}/read`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }

      return { id };
    } catch (error) {
      return rejectWithValue('Failed to mark notification as read');
    }
  }
);

export const markAllAsRead = createAsyncThunk(
  'notifications/markAllAsRead',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { 
        auth: { tokens: { accessToken: string } | null } 
      };
      
      const token = state.auth.tokens?.accessToken;
      if (!token) {
        return rejectWithValue('Authentication required');
      }

      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/notifications/read-all`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read');
      }

      return {};
    } catch (error) {
      return rejectWithValue('Failed to mark all notifications as read');
    }
  }
);

export const deleteNotification = createAsyncThunk(
  'notifications/delete',
  async (id: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { 
        auth: { tokens: { accessToken: string } | null } 
      };
      
      const token = state.auth.tokens?.accessToken;
      if (!token) {
        return rejectWithValue('Authentication required');
      }

      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/notifications/${id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete notification');
      }

      return { id };
    } catch (error) {
      return rejectWithValue('Failed to delete notification');
    }
  }
);

export const fetchNotificationSettings = createAsyncThunk(
  'notifications/fetchSettings',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { 
        auth: { tokens: { accessToken: string } | null } 
      };
      
      const token = state.auth.tokens?.accessToken;
      if (!token) {
        return rejectWithValue('Authentication required');
      }

      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/notifications/settings`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch notification settings');
      }

      const data: ApiResponse<NotificationSettings> = await response.json();
      
      return {
        settings: data.data,
      };
    } catch (error) {
      return rejectWithValue('Failed to fetch notification settings');
    }
  }
);

export const updateNotificationSettings = createAsyncThunk(
  'notifications/updateSettings',
  async (settings: Partial<NotificationSettings>, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { 
        auth: { tokens: { accessToken: string } | null } 
      };
      
      const token = state.auth.tokens?.accessToken;
      if (!token) {
        return rejectWithValue('Authentication required');
      }

      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/notifications/settings`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(settings),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update notification settings');
      }

      const data: ApiResponse<NotificationSettings> = await response.json();
      
      return {
        settings: data.data,
      };
    } catch (error) {
      return rejectWithValue('Failed to update notification settings');
    }
  }
);

export const requestPushPermission = createAsyncThunk(
  'notifications/requestPushPermission',
  async (_, { rejectWithValue }) => {
    try {
      if (!('Notification' in window)) {
        throw new Error('Push notifications not supported');
      }

      const permission = await Notification.requestPermission();
      
      return { permission };
    } catch (error) {
      return rejectWithValue('Failed to request push permission');
    }
  }
);

export const subscribeToPush = createAsyncThunk(
  'notifications/subscribeToPush',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { 
        auth: { tokens: { accessToken: string } | null } 
      };
      
      const token = state.auth.tokens?.accessToken;
      if (!token) {
        return rejectWithValue('Authentication required');
      }

      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        throw new Error('Push messaging not supported');
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.REACT_APP_VAPID_PUBLIC_KEY,
      });

      // Send subscription to server
      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/notifications/push/subscribe`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            subscription: subscription.toJSON(),
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to subscribe to push notifications');
      }

      return {
        subscription: subscription.toJSON(),
      };
    } catch (error) {
      return rejectWithValue('Failed to subscribe to push notifications');
    }
  }
);

export const unsubscribeFromPush = createAsyncThunk(
  'notifications/unsubscribeFromPush',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { 
        auth: { tokens: { accessToken: string } | null } 
      };
      
      const token = state.auth.tokens?.accessToken;
      if (!token) {
        return rejectWithValue('Authentication required');
      }

      // Unsubscribe from server
      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/notifications/push/unsubscribe`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to unsubscribe from push notifications');
      }

      // Unsubscribe locally
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
        }
      }

      return {};
    } catch (error) {
      return rejectWithValue('Failed to unsubscribe from push notifications');
    }
  }
);

// Notification slice
const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    // UI actions
    toggleNotificationPanel: (state) => {
      state.notificationPanelOpen = !state.notificationPanelOpen;
    },

    toggleSettingsModal: (state) => {
      state.settingsModalOpen = !state.settingsModalOpen;
    },

    setSelectedNotification: (state, action: PayloadAction<string | null>) => {
      state.selectedNotification = action.payload;
    },

    // Filters
    setTypeFilter: (state, action: PayloadAction<NotificationType | 'all'>) => {
      state.typeFilter = action.payload;
    },

    setReadFilter: (state, action: PayloadAction<'all' | 'unread' | 'read'>) => {
      state.readFilter = action.payload;
    },

    // Real-time updates
    addNotification: (state, action: PayloadAction<Notification>) => {
      const notification = action.payload;
      state.notifications[notification.id] = notification;
      state.notificationsList.unshift(notification.id);
      
      if (!notification.readAt) {
        state.unreadCount += 1;
      }
      
      state.lastUpdate = new Date().toISOString();
    },

    updateNotification: (state, action: PayloadAction<Notification>) => {
      const notification = action.payload;
      const existingNotification = state.notifications[notification.id];
      
      if (existingNotification) {
        // Update unread count if read status changed
        if (!existingNotification.readAt && notification.readAt) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        } else if (existingNotification.readAt && !notification.readAt) {
          state.unreadCount += 1;
        }
        
        state.notifications[notification.id] = notification;
        state.lastUpdate = new Date().toISOString();
      }
    },

    removeNotification: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      const notification = state.notifications[id];
      
      if (notification) {
        if (!notification.readAt) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
        
        delete state.notifications[id];
        state.notificationsList = state.notificationsList.filter(nId => nId !== id);
        state.lastUpdate = new Date().toISOString();
      }
    },

    // WebSocket connection
    setConnectionStatus: (state, action: PayloadAction<boolean>) => {
      state.connected = action.payload;
      if (action.payload) {
        state.connectionError = null;
      }
    },

    setConnectionError: (state, action: PayloadAction<string>) => {
      state.connectionError = action.payload;
      state.connected = false;
    },

    // Toast notifications
    addToast: (state, action: PayloadAction<{
      message: string;
      type: 'success' | 'error' | 'warning' | 'info';
      duration?: number;
      action?: {
        label: string;
        onClick: () => void;
      };
    }>) => {
      const toast = {
        id: Date.now().toString(),
        ...action.payload,
      };
      state.toasts.push(toast);
    },

    removeToast: (state, action: PayloadAction<string>) => {
      state.toasts = state.toasts.filter(toast => toast.id !== action.payload);
    },

    clearAllToasts: (state) => {
      state.toasts = [];
    },

    // Optimistic updates
    optimisticMarkAsRead: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      const notification = state.notifications[id];
      
      if (notification && !notification.readAt) {
        notification.readAt = new Date().toISOString();
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },

    optimisticMarkAllAsRead: (state) => {
      Object.values(state.notifications).forEach(notification => {
        if (!notification.readAt) {
          notification.readAt = new Date().toISOString();
        }
      });
      state.unreadCount = 0;
    },

    optimisticDeleteNotification: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      const notification = state.notifications[id];
      
      if (notification) {
        if (!notification.readAt) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
        
        delete state.notifications[id];
        state.notificationsList = state.notificationsList.filter(nId => nId !== id);
      }
    },

    // Clear errors
    clearSettingsError: (state) => {
      state.settingsError = null;
    },

    clearConnectionError: (state) => {
      state.connectionError = null;
    },

    // Cache management
    invalidateCache: (state) => {
      state.lastFetch = null;
    },

    // Update push permission
    updatePushPermission: (state, action: PayloadAction<NotificationPermission>) => {
      state.pushPermission = action.payload;
    },
  },

  extraReducers: (builder) => {
    // Fetch notifications
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.notificationsLoading = true;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.notificationsLoading = false;
        
        if (action.payload.fromCache) {
          return;
        }

        const { notifications, unreadCount, page } = action.payload;
        
        if (page === 1) {
          state.notifications = {};
          state.notificationsList = [];
        }
        
        notifications.forEach(notification => {
          state.notifications[notification.id] = notification;
        });
        
        state.notificationsList = [
          ...state.notificationsList,
          ...notifications.map(n => n.id).filter(id => !state.notificationsList.includes(id))
        ];
        
        state.unreadCount = unreadCount;
        state.lastFetch = new Date().toISOString();
      })
      .addCase(fetchNotifications.rejected, (state) => {
        state.notificationsLoading = false;
      });

    // Mark as read
    builder
      .addCase(markNotificationAsRead.pending, (state, action) => {
        const id = action.meta.arg;
        state.markingAsRead[id] = true;
      })
      .addCase(markNotificationAsRead.fulfilled, (state, action) => {
        const { id } = action.payload;
        state.markingAsRead[id] = false;
        
        const notification = state.notifications[id];
        if (notification && !notification.readAt) {
          notification.readAt = new Date().toISOString();
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })
      .addCase(markNotificationAsRead.rejected, (state, action) => {
        const id = action.meta.arg;
        state.markingAsRead[id] = false;
        
        // Revert optimistic update
        const notification = state.notifications[id];
        if (notification) {
          notification.readAt = null;
          state.unreadCount += 1;
        }
      });

    // Mark all as read
    builder
      .addCase(markAllAsRead.fulfilled, (state) => {
        Object.values(state.notifications).forEach(notification => {
          if (!notification.readAt) {
            notification.readAt = new Date().toISOString();
          }
        });
        state.unreadCount = 0;
      });

    // Delete notification
    builder
      .addCase(deleteNotification.pending, (state, action) => {
        const id = action.meta.arg;
        state.deletingNotification[id] = true;
      })
      .addCase(deleteNotification.fulfilled, (state, action) => {
        const { id } = action.payload;
        state.deletingNotification[id] = false;
        
        const notification = state.notifications[id];
        if (notification) {
          if (!notification.readAt) {
            state.unreadCount = Math.max(0, state.unreadCount - 1);
          }
          
          delete state.notifications[id];
          state.notificationsList = state.notificationsList.filter(nId => nId !== id);
        }
      })
      .addCase(deleteNotification.rejected, (state, action) => {
        const id = action.meta.arg;
        state.deletingNotification[id] = false;
      });

    // Fetch settings
    builder
      .addCase(fetchNotificationSettings.pending, (state) => {
        state.settingsLoading = true;
        state.settingsError = null;
      })
      .addCase(fetchNotificationSettings.fulfilled, (state, action) => {
        state.settingsLoading = false;
        state.settings = action.payload.settings;
      })
      .addCase(fetchNotificationSettings.rejected, (state, action) => {
        state.settingsLoading = false;
        state.settingsError = action.payload as string;
      });

    // Update settings
    builder
      .addCase(updateNotificationSettings.fulfilled, (state, action) => {
        state.settings = action.payload.settings;
        state.settingsError = null;
      })
      .addCase(updateNotificationSettings.rejected, (state, action) => {
        state.settingsError = action.payload as string;
      });

    // Request push permission
    builder
      .addCase(requestPushPermission.fulfilled, (state, action) => {
        state.pushPermission = action.payload.permission;
      });

    // Subscribe to push
    builder
      .addCase(subscribeToPush.pending, (state) => {
        state.subscriptionLoading = true;
      })
      .addCase(subscribeToPush.fulfilled, (state, action) => {
        state.subscriptionLoading = false;
        state.pushSubscription = action.payload.subscription;
      })
      .addCase(subscribeToPush.rejected, (state) => {
        state.subscriptionLoading = false;
      });

    // Unsubscribe from push
    builder
      .addCase(unsubscribeFromPush.fulfilled, (state) => {
        state.pushSubscription = null;
      });
  },
});

// Actions
export const {
  toggleNotificationPanel,
  toggleSettingsModal,
  setSelectedNotification,
  setTypeFilter,
  setReadFilter,
  addNotification,
  updateNotification,
  removeNotification,
  setConnectionStatus,
  setConnectionError,
  addToast,
  removeToast,
  clearAllToasts,
  optimisticMarkAsRead,
  optimisticMarkAllAsRead,
  optimisticDeleteNotification,
  clearSettingsError,
  clearConnectionError,
  invalidateCache,
  updatePushPermission,
} = notificationSlice.actions;

// Selectors
export const selectNotificationState = (state: { notifications: NotificationState }) => state.notifications;
export const selectAllNotifications = (state: { notifications: NotificationState }) => 
  state.notifications.notificationsList.map(id => state.notifications.notifications[id]).filter(Boolean);
export const selectUnreadNotifications = (state: { notifications: NotificationState }) =>
  state.notifications.notificationsList
    .map(id => state.notifications.notifications[id])
    .filter(notification => notification && !notification.readAt);
export const selectUnreadCount = (state: { notifications: NotificationState }) => state.notifications.unreadCount;
export const selectNotificationSettings = (state: { notifications: NotificationState }) => state.notifications.settings;
export const selectPushSubscription = (state: { notifications: NotificationState }) => state.notifications.pushSubscription;
export const selectConnectionStatus = (state: { notifications: NotificationState }) => state.notifications.connected;
export const selectToasts = (state: { notifications: NotificationState }) => state.notifications.toasts;
export const selectNotificationFilters = (state: { notifications: NotificationState }) => ({
  type: state.notifications.typeFilter,
  read: state.notifications.readFilter,
});

export default notificationSlice.reducer;