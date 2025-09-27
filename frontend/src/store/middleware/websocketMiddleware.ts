import { Middleware, PayloadAction } from '@reduxjs/toolkit';
import { 
  setConnectionStatus, 
  setConnectionError, 
  addNotification, 
  updateNotification,
  addToast 
} from '../slices/notificationSlice';
import { syncBookings, addPendingUpdate } from '../slices/bookingSlice';
import { invalidateCache as invalidatePropertyCache } from '../slices/propertySlice';
import { invalidateCache as invalidatePOICache } from '../slices/poiSlice';
import { invalidateCache as invalidateExperienceCache } from '../slices/experienceSlice';

// WebSocket message types
type WebSocketMessageType =
  | 'NOTIFICATION_NEW'
  | 'NOTIFICATION_UPDATE'
  | 'BOOKING_UPDATE'
  | 'BOOKING_STATUS_CHANGE'
  | 'PROPERTY_UPDATE'
  | 'POI_UPDATE'
  | 'EXPERIENCE_UPDATE'
  | 'USER_UPDATE'
  | 'SYSTEM_MESSAGE'
  | 'HEARTBEAT';

interface WebSocketMessage {
  type: WebSocketMessageType;
  payload: any;
  timestamp: string;
  userId?: string;
}

interface WebSocketState {
  socket: WebSocket | null;
  isConnected: boolean;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  reconnectInterval: number;
  heartbeatInterval: NodeJS.Timeout | null;
  reconnectTimeout: NodeJS.Timeout | null;
  subscribedChannels: Set<string>;
}

// WebSocket middleware
export const createWebSocketMiddleware = (): Middleware => {
  let wsState: WebSocketState = {
    socket: null,
    isConnected: false,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
    reconnectInterval: 5000,
    heartbeatInterval: null,
    reconnectTimeout: null,
    subscribedChannels: new Set(),
  };

  const connect = (store: any, token: string) => {
    try {
      const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:8080';
      
      // Close existing connection
      if (wsState.socket) {
        wsState.socket.close();
      }

      wsState.socket = new WebSocket(`${wsUrl}?token=${token}`);

      wsState.socket.onopen = (event) => {
        console.log('WebSocket connected');
        wsState.isConnected = true;
        wsState.reconnectAttempts = 0;
        
        store.dispatch(setConnectionStatus(true));
        
        // Start heartbeat
        startHeartbeat(store);
        
        // Subscribe to user channels
        subscribeToUserChannels(store);
        
        // Show connection success toast
        store.dispatch(addToast({
          message: 'Connected to real-time updates',
          type: 'success',
          duration: 3000,
        }));
      };

      wsState.socket.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleMessage(store, message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      wsState.socket.onclose = (event) => {
        console.log('WebSocket disconnected', event.code, event.reason);
        wsState.isConnected = false;
        
        store.dispatch(setConnectionStatus(false));
        
        // Clear heartbeat
        if (wsState.heartbeatInterval) {
          clearInterval(wsState.heartbeatInterval);
          wsState.heartbeatInterval = null;
        }
        
        // Attempt reconnection if not intentional close
        if (event.code !== 1000 && wsState.reconnectAttempts < wsState.maxReconnectAttempts) {
          scheduleReconnect(store, token);
        } else if (wsState.reconnectAttempts >= wsState.maxReconnectAttempts) {
          store.dispatch(setConnectionError('Max reconnection attempts reached'));
          store.dispatch(addToast({
            message: 'Lost connection to real-time updates',
            type: 'error',
            duration: 5000,
            action: {
              label: 'Retry',
              onClick: () => {
                wsState.reconnectAttempts = 0;
                connect(store, token);
              },
            },
          }));
        }
      };

      wsState.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        store.dispatch(setConnectionError('WebSocket connection error'));
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      store.dispatch(setConnectionError('Failed to establish connection'));
    }
  };

  const disconnect = () => {
    if (wsState.socket) {
      wsState.socket.close(1000, 'Intentional disconnect');
      wsState.socket = null;
    }
    
    if (wsState.heartbeatInterval) {
      clearInterval(wsState.heartbeatInterval);
      wsState.heartbeatInterval = null;
    }
    
    if (wsState.reconnectTimeout) {
      clearTimeout(wsState.reconnectTimeout);
      wsState.reconnectTimeout = null;
    }
    
    wsState.isConnected = false;
    wsState.reconnectAttempts = 0;
    wsState.subscribedChannels.clear();
  };

  const scheduleReconnect = (store: any, token: string) => {
    const delay = wsState.reconnectInterval * Math.pow(2, wsState.reconnectAttempts);
    
    wsState.reconnectTimeout = setTimeout(() => {
      wsState.reconnectAttempts++;
      console.log(`Attempting to reconnect (${wsState.reconnectAttempts}/${wsState.maxReconnectAttempts})`);
      
      store.dispatch(addToast({
        message: `Reconnecting... (${wsState.reconnectAttempts}/${wsState.maxReconnectAttempts})`,
        type: 'info',
        duration: 3000,
      }));
      
      connect(store, token);
    }, delay);
  };

  const startHeartbeat = (store: any) => {
    wsState.heartbeatInterval = setInterval(() => {
      if (wsState.socket && wsState.socket.readyState === WebSocket.OPEN) {
        sendMessage({
          type: 'HEARTBEAT',
          payload: {},
          timestamp: new Date().toISOString(),
        });
      }
    }, 30000); // Send heartbeat every 30 seconds
  };

  const sendMessage = (message: WebSocketMessage) => {
    if (wsState.socket && wsState.socket.readyState === WebSocket.OPEN) {
      wsState.socket.send(JSON.stringify(message));
    }
  };

  const subscribeToUserChannels = (store: any) => {
    const state = store.getState();
    const userId = state.auth.user?.id;
    
    if (userId) {
      const channels = [
        `user:${userId}:notifications`,
        `user:${userId}:bookings`,
        `user:${userId}:favorites`,
        'global:announcements',
      ];
      
      channels.forEach(channel => {
        if (!wsState.subscribedChannels.has(channel)) {
          sendMessage({
            type: 'SYSTEM_MESSAGE',
            payload: {
              action: 'subscribe',
              channel,
            },
            timestamp: new Date().toISOString(),
          });
          wsState.subscribedChannels.add(channel);
        }
      });
    }
  };

  const handleMessage = (store: any, message: WebSocketMessage) => {
    const { type, payload, timestamp } = message;

    switch (type) {
      case 'NOTIFICATION_NEW':
        store.dispatch(addNotification(payload.notification));
        
        // Show toast for important notifications
        if (payload.notification.priority === 'high') {
          store.dispatch(addToast({
            message: payload.notification.message,
            type: 'info',
            duration: 5000,
          }));
        }
        break;

      case 'NOTIFICATION_UPDATE':
        store.dispatch(updateNotification(payload.notification));
        break;

      case 'BOOKING_UPDATE':
        // Update booking state
        store.dispatch(addPendingUpdate({
          id: payload.booking.id,
          update: payload.booking,
        }));
        
        // Show toast for booking changes
        store.dispatch(addToast({
          message: `Booking ${payload.booking.id} has been updated`,
          type: 'info',
          duration: 4000,
        }));
        break;

      case 'BOOKING_STATUS_CHANGE':
        store.dispatch(addPendingUpdate({
          id: payload.bookingId,
          update: { status: payload.status },
        }));
        
        // Show status change notification
        const statusMessages: Record<string, string> = {
          confirmed: 'Your booking has been confirmed!',
          cancelled: 'Your booking has been cancelled',
          completed: 'Your booking has been completed',
          refunded: 'Your booking has been refunded',
        };
        
        const message = statusMessages[payload.status] || `Booking status changed to ${payload.status}`;
        const toastType = payload.status === 'confirmed' ? 'success' : 
                         payload.status === 'cancelled' ? 'warning' : 'info';
        
        store.dispatch(addToast({
          message,
          type: toastType,
          duration: 5000,
        }));
        break;

      case 'PROPERTY_UPDATE':
        // Invalidate property cache for updated property
        store.dispatch(invalidatePropertyCache(payload.propertyId));
        
        // If user has this property in favorites, show update
        const propertyState = store.getState().properties;
        if (propertyState.favorites.includes(payload.propertyId)) {
          store.dispatch(addToast({
            message: 'A property in your favorites has been updated',
            type: 'info',
            duration: 4000,
          }));
        }
        break;

      case 'POI_UPDATE':
        // Invalidate POI cache
        store.dispatch(invalidatePOICache(payload.poiId));
        
        // If user has this POI in favorites, show update
        const poiState = store.getState().pois;
        if (poiState.favorites.includes(payload.poiId)) {
          store.dispatch(addToast({
            message: 'A POI in your favorites has been updated',
            type: 'info',
            duration: 4000,
          }));
        }
        break;

      case 'EXPERIENCE_UPDATE':
        // Invalidate experience cache
        store.dispatch(invalidateExperienceCache(payload.experienceId));
        
        // If user has this experience in wishlist, show update
        const experienceState = store.getState().experiences;
        if (experienceState.wishlist.includes(payload.experienceId)) {
          store.dispatch(addToast({
            message: 'An experience in your wishlist has been updated',
            type: 'info',
            duration: 4000,
          }));
        }
        break;

      case 'USER_UPDATE':
        // Handle user profile updates, preference changes, etc.
        if (payload.type === 'profile_update') {
          store.dispatch(addToast({
            message: 'Your profile has been updated',
            type: 'success',
            duration: 3000,
          }));
        }
        break;

      case 'SYSTEM_MESSAGE':
        // Handle system-wide messages, maintenance notifications, etc.
        if (payload.type === 'maintenance') {
          store.dispatch(addToast({
            message: payload.message,
            type: 'warning',
            duration: 10000,
          }));
        } else if (payload.type === 'announcement') {
          store.dispatch(addToast({
            message: payload.message,
            type: 'info',
            duration: 8000,
          }));
        }
        break;

      case 'HEARTBEAT':
        // Handle heartbeat response - just log for debugging
        console.debug('WebSocket heartbeat received');
        break;

      default:
        console.warn('Unknown WebSocket message type:', type);
    }
  };

  // Return the middleware function
  return (store) => (next) => (action: PayloadAction<any>) => {
    const result = next(action);
    const state = store.getState();

    // Handle connection actions
    if (action.type === 'auth/loginUser/fulfilled' || action.type === 'auth/refreshToken/fulfilled') {
      const token = state.auth.tokens?.accessToken;
      if (token && !wsState.isConnected) {
        connect(store, token);
      }
    }

    if (action.type === 'auth/logout/fulfilled') {
      disconnect();
    }

    // Handle subscription updates
    if (action.type === 'auth/setUser') {
      if (wsState.isConnected) {
        subscribeToUserChannels(store);
      }
    }

    // Handle manual connection control
    if (action.type === 'websocket/connect') {
      const token = state.auth.tokens?.accessToken;
      if (token) {
        connect(store, token);
      }
    }

    if (action.type === 'websocket/disconnect') {
      disconnect();
    }

    // Handle sync requests
    if (action.type === 'websocket/requestSync') {
      if (wsState.socket && wsState.socket.readyState === WebSocket.OPEN) {
        sendMessage({
          type: 'SYSTEM_MESSAGE',
          payload: {
            action: 'sync_request',
            entity: action.payload.entity,
          },
          timestamp: new Date().toISOString(),
        });
      }
    }

    return result;
  };
};

// Action creators for WebSocket control
export const websocketActions = {
  connect: () => ({ type: 'websocket/connect' as const }),
  disconnect: () => ({ type: 'websocket/disconnect' as const }),
  requestSync: (entity: string) => ({ 
    type: 'websocket/requestSync' as const, 
    payload: { entity } 
  }),
};

// Selectors for WebSocket state (to be used in components)
export const selectWebSocketState = (state: any) => ({
  connected: state.notifications.connected,
  connectionError: state.notifications.connectionError,
  lastUpdate: state.notifications.lastUpdate,
});

export default createWebSocketMiddleware;