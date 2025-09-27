import { createApi, fetchBaseQuery, BaseQueryFn } from '@reduxjs/toolkit/query/react';
import { RootState } from '../index';
import { logout, setTokens } from '../slices/authSlice';
import type { 
  ApiResponse, 
  User, 
  Property, 
  POI, 
  Experience, 
  Booking,
  AuthTokens,
  LoginRequest,
  RegisterRequest 
} from '../../types/api-types';

// Base query with auth handling
const baseQuery = fetchBaseQuery({
  baseUrl: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api/v1',
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.tokens?.accessToken;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    headers.set('content-type', 'application/json');
    return headers;
  },
});

// Base query with re-auth
const baseQueryWithReauth: BaseQueryFn = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    // Try to get a new token
    const refreshToken = (api.getState() as RootState).auth.tokens?.refreshToken;
    
    if (refreshToken) {
      const refreshResult = await baseQuery(
        {
          url: '/auth/refresh',
          method: 'POST',
          body: { refreshToken },
        },
        api,
        extraOptions
      );

      if (refreshResult.data) {
        // Store the new tokens
        api.dispatch(setTokens(refreshResult.data as AuthTokens));
        // Retry the original query
        result = await baseQuery(args, api, extraOptions);
      } else {
        // Refresh failed, logout user
        api.dispatch(logout());
      }
    } else {
      // No refresh token, logout user
      api.dispatch(logout());
    }
  }

  return result;
};

// Main API slice
export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'User',
    'Property', 
    'POI', 
    'Experience', 
    'Booking', 
    'Notification',
    'Review',
    'Analytics'
  ],
  endpoints: (builder) => ({
    // Auth endpoints
    login: builder.mutation<ApiResponse<User & AuthTokens>, LoginRequest>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['User'],
    }),

    register: builder.mutation<ApiResponse<User & AuthTokens>, RegisterRequest>({
      query: (userData) => ({
        url: '/auth/register',
        method: 'POST',
        body: userData,
      }),
      invalidatesTags: ['User'],
    }),

    getProfile: builder.query<ApiResponse<User>, void>({
      query: () => '/auth/profile',
      providesTags: ['User'],
    }),

    updateProfile: builder.mutation<ApiResponse<User>, Partial<User>>({
      query: (updates) => ({
        url: '/auth/profile',
        method: 'PUT',
        body: updates,
      }),
      invalidatesTags: ['User'],
    }),

    // Property endpoints
    searchProperties: builder.query<ApiResponse<Property[]>, any>({
      query: (filters) => ({
        url: '/properties/search',
        params: filters,
      }),
      providesTags: ['Property'],
    }),

    getProperty: builder.query<ApiResponse<Property>, string>({
      query: (id) => `/properties/${id}`,
      providesTags: (result, error, id) => [{ type: 'Property', id }],
    }),

    getPropertyAvailability: builder.query<ApiResponse<any>, { id: string; checkIn: string; checkOut: string }>({
      query: ({ id, checkIn, checkOut }) => ({
        url: `/properties/${id}/availability`,
        params: { checkIn, checkOut },
      }),
    }),

    togglePropertyFavorite: builder.mutation<ApiResponse<any>, { id: string; action: 'add' | 'remove' }>({
      query: ({ id, action }) => ({
        url: `/properties/${id}/favorite`,
        method: action === 'add' ? 'POST' : 'DELETE',
      }),
      invalidatesTags: ['Property'],
    }),

    // POI endpoints
    searchPOIs: builder.query<ApiResponse<POI[]>, any>({
      query: (filters) => ({
        url: '/pois/search',
        params: filters,
      }),
      providesTags: ['POI'],
    }),

    getPOI: builder.query<ApiResponse<POI>, string>({
      query: (id) => `/pois/${id}`,
      providesTags: (result, error, id) => [{ type: 'POI', id }],
    }),

    getPOICategories: builder.query<ApiResponse<any[]>, void>({
      query: () => '/pois/categories',
      providesTags: ['POI'],
    }),

    togglePOIFavorite: builder.mutation<ApiResponse<any>, { id: string; action: 'add' | 'remove' }>({
      query: ({ id, action }) => ({
        url: `/pois/${id}/favorite`,
        method: action === 'add' ? 'POST' : 'DELETE',
      }),
      invalidatesTags: ['POI'],
    }),

    markPOIVisited: builder.mutation<ApiResponse<any>, string>({
      query: (id) => ({
        url: `/pois/${id}/visit`,
        method: 'POST',
      }),
      invalidatesTags: ['POI'],
    }),

    // Experience endpoints
    searchExperiences: builder.query<ApiResponse<Experience[]>, any>({
      query: (filters) => ({
        url: '/experiences/search',
        params: filters,
      }),
      providesTags: ['Experience'],
    }),

    getExperience: builder.query<ApiResponse<Experience>, string>({
      query: (id) => `/experiences/${id}`,
      providesTags: (result, error, id) => [{ type: 'Experience', id }],
    }),

    getExperienceAvailability: builder.query<ApiResponse<any>, { id: string; date: string }>({
      query: ({ id, date }) => ({
        url: `/experiences/${id}/availability`,
        params: { date },
      }),
    }),

    // Booking endpoints
    getUserBookings: builder.query<ApiResponse<Booking[]>, void>({
      query: () => '/bookings/',
      providesTags: ['Booking'],
    }),

    getBooking: builder.query<ApiResponse<Booking>, string>({
      query: (id) => `/bookings/${id}`,
      providesTags: (result, error, id) => [{ type: 'Booking', id }],
    }),

    createBooking: builder.mutation<ApiResponse<Booking>, any>({
      query: (bookingData) => ({
        url: '/bookings/',
        method: 'POST',
        body: bookingData,
      }),
      invalidatesTags: ['Booking'],
    }),

    updateBooking: builder.mutation<ApiResponse<Booking>, { id: string; updates: any }>({
      query: ({ id, updates }) => ({
        url: `/bookings/${id}`,
        method: 'PUT',
        body: updates,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Booking', id }],
    }),

    cancelBooking: builder.mutation<ApiResponse<any>, { id: string; reason?: string }>({
      query: ({ id, reason }) => ({
        url: `/bookings/${id}`,
        method: 'DELETE',
        body: reason ? { reason } : undefined,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Booking', id }],
    }),

    // Notification endpoints
    getNotifications: builder.query<ApiResponse<any[]>, { unread?: boolean; limit?: number }>({
      query: (params) => ({
        url: '/notifications/',
        params,
      }),
      providesTags: ['Notification'],
    }),

    markNotificationRead: builder.mutation<ApiResponse<any>, string>({
      query: (id) => ({
        url: `/notifications/${id}/read`,
        method: 'PUT',
      }),
      invalidatesTags: ['Notification'],
    }),

    markAllNotificationsRead: builder.mutation<ApiResponse<any>, void>({
      query: () => ({
        url: '/notifications/read-all',
        method: 'PUT',
      }),
      invalidatesTags: ['Notification'],
    }),
  }),
});

// Export hooks for components to use
export const {
  // Auth
  useLoginMutation,
  useRegisterMutation,
  useGetProfileQuery,
  useUpdateProfileMutation,
  
  // Properties
  useSearchPropertiesQuery,
  useGetPropertyQuery,
  useGetPropertyAvailabilityQuery,
  useTogglePropertyFavoriteMutation,
  
  // POIs
  useSearchPOIsQuery,
  useGetPOIQuery,
  useGetPOICategoriesQuery,
  useTogglePOIFavoriteMutation,
  useMarkPOIVisitedMutation,
  
  // Experiences
  useSearchExperiencesQuery,
  useGetExperienceQuery,
  useGetExperienceAvailabilityQuery,
  
  // Bookings
  useGetUserBookingsQuery,
  useGetBookingQuery,
  useCreateBookingMutation,
  useUpdateBookingMutation,
  useCancelBookingMutation,
  
  // Notifications
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} = api;