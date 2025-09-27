import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { encryptTransform } from 'redux-persist-transform-encrypt';
import { api } from './api/apiSlice';
import { websocketMiddleware } from './middleware/websocketMiddleware';
import { cacheMiddleware } from './middleware/cacheMiddleware';
import authSlice from './slices/authSlice';
import propertySlice from './slices/propertySlice';
import poiSlice from './slices/poiSlice';
import experienceSlice from './slices/experienceSlice';
import bookingSlice from './slices/bookingSlice';
import notificationSlice from './slices/notificationSlice';
import uiSlice from './slices/uiSlice';

// Encryption transform for sensitive data
const encryptTransformConfig = encryptTransform({
  secretKey: process.env.REACT_APP_REDUX_SECRET_KEY || 'default-secret-key',
  onError: (error) => {
    console.error('Redux persist encryption error:', error);
  },
});

// Persist configuration
const persistConfig = {
  key: 'touriquest-root',
  version: 1,
  storage,
  transforms: [encryptTransformConfig],
  whitelist: ['auth', 'ui'], // Only persist auth and UI preferences
  blacklist: ['api'], // Don't persist RTK Query cache
};

// Auth slice specific persist config
const authPersistConfig = {
  key: 'auth',
  storage,
  transforms: [encryptTransformConfig],
  whitelist: ['user', 'tokens', 'isAuthenticated', 'preferences'],
};

// UI slice persist config for user preferences
const uiPersistConfig = {
  key: 'ui',
  storage,
  whitelist: ['theme', 'language', 'currency', 'notifications'],
};

// Root reducer
const rootReducer = combineReducers({
  api: api.reducer,
  auth: persistReducer(authPersistConfig, authSlice),
  properties: propertySlice,
  pois: poiSlice,
  experiences: experienceSlice,
  bookings: bookingSlice,
  notifications: notificationSlice,
  ui: persistReducer(uiPersistConfig, uiSlice),
});

// Persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        ignoredPaths: ['api.queries', 'api.mutations'],
      },
      immutableCheck: {
        ignoredPaths: ['api.queries', 'api.mutations'],
      },
    })
      .concat(api.middleware)
      .concat(websocketMiddleware)
      .concat(cacheMiddleware),
  devTools: process.env.NODE_ENV !== 'production',
});

// Setup RTK Query listeners
setupListeners(store.dispatch);

// Persistor
export const persistor = persistStore(store);

// Types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed hooks
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export default store;