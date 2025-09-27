import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { 
  Booking, 
  BookingStatus,
  PaymentMethod,
  PaymentStatus,
  CancellationPolicy,
  Invoice,
  ApiResponse 
} from '../../types/api-types';

// Booking state interface
export interface BookingState {
  // User bookings
  bookings: Record<string, Booking>;
  bookingsList: string[];
  bookingsLoading: boolean;
  bookingsError: string | null;
  
  // Individual booking operations
  bookingLoading: Record<string, boolean>;
  bookingErrors: Record<string, string>;
  
  // Booking creation
  createBookingLoading: boolean;
  createBookingError: string | null;
  
  // Payment processing
  paymentLoading: Record<string, boolean>;
  paymentErrors: Record<string, string>;
  
  // Cancellation
  cancellationLoading: Record<string, boolean>;
  cancellationErrors: Record<string, string>;
  
  // Invoices
  invoices: Record<string, Invoice>;
  invoiceLoading: Record<string, boolean>;
  
  // Payment methods
  paymentMethods: PaymentMethod[];
  paymentMethodsLoading: boolean;
  
  // Filters and sorting
  statusFilter: BookingStatus | 'all';
  dateFilter: 'upcoming' | 'past' | 'all';
  sortBy: 'date' | 'price' | 'status';
  sortOrder: 'asc' | 'desc';
  
  // UI state
  selectedBooking: string | null;
  bookingModalOpen: boolean;
  paymentModalOpen: boolean;
  cancellationModalOpen: boolean;
  
  // Real-time updates
  pendingUpdates: Record<string, Partial<Booking>>;
  lastSync: string | null;
  syncError: string | null;
  
  // Cache metadata
  lastFetch: Record<string, string>;
  cacheExpiry: number;
}

// Initial state
const initialState: BookingState = {
  bookings: {},
  bookingsList: [],
  bookingsLoading: false,
  bookingsError: null,
  
  bookingLoading: {},
  bookingErrors: {},
  
  createBookingLoading: false,
  createBookingError: null,
  
  paymentLoading: {},
  paymentErrors: {},
  
  cancellationLoading: {},
  cancellationErrors: {},
  
  invoices: {},
  invoiceLoading: {},
  
  paymentMethods: [],
  paymentMethodsLoading: false,
  
  statusFilter: 'all',
  dateFilter: 'all',
  sortBy: 'date',
  sortOrder: 'desc',
  
  selectedBooking: null,
  bookingModalOpen: false,
  paymentModalOpen: false,
  cancellationModalOpen: false,
  
  pendingUpdates: {},
  lastSync: null,
  syncError: null,
  
  lastFetch: {},
  cacheExpiry: 10, // 10 minutes for booking data
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
export const fetchUserBookings = createAsyncThunk(
  'bookings/fetchUserBookings',
  async (
    { page = 1, limit = 20, status, dateRange }: { 
      page?: number; 
      limit?: number; 
      status?: BookingStatus; 
      dateRange?: string; 
    } = {},
    { getState, rejectWithValue }
  ) => {
    try {
      const state = getState() as { 
        auth: { tokens: { accessToken: string } | null };
        bookings: BookingState;
      };
      
      const token = state.auth.tokens?.accessToken;
      if (!token) {
        return rejectWithValue('Authentication required');
      }

      // Check cache for first page only
      const cacheKey = `bookings_${page}_${limit}_${status || 'all'}_${dateRange || 'all'}`;
      if (
        page === 1 && 
        isCacheValid(state.bookings.lastFetch[cacheKey], state.bookings.cacheExpiry)
      ) {
        return { fromCache: true };
      }

      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (status) queryParams.append('status', status);
      if (dateRange) queryParams.append('dateRange', dateRange);

      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/bookings?${queryParams}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch bookings');
      }

      const data: ApiResponse<{ bookings: Booking[]; total: number }> = await response.json();
      
      return {
        bookings: data.data.bookings,
        total: data.data.total,
        page,
        cacheKey,
      };
    } catch (error) {
      return rejectWithValue('Failed to fetch user bookings');
    }
  }
);

export const fetchBooking = createAsyncThunk(
  'bookings/fetchBooking',
  async (id: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { 
        auth: { tokens: { accessToken: string } | null };
        bookings: BookingState;
      };
      
      const token = state.auth.tokens?.accessToken;
      if (!token) {
        return rejectWithValue('Authentication required');
      }

      // Check cache
      const cacheKey = `booking_${id}`;
      if (
        state.bookings.bookings[id] && 
        isCacheValid(state.bookings.lastFetch[cacheKey], state.bookings.cacheExpiry)
      ) {
        return { fromCache: true, id };
      }

      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/bookings/${id}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch booking');
      }

      const data: ApiResponse<Booking> = await response.json();
      
      return {
        booking: data.data,
        id,
        cacheKey,
      };
    } catch (error) {
      return rejectWithValue('Failed to fetch booking details');
    }
  }
);

export const createBooking = createAsyncThunk(
  'bookings/create',
  async (bookingData: any, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { 
        auth: { tokens: { accessToken: string } | null } 
      };
      
      const token = state.auth.tokens?.accessToken;
      if (!token) {
        return rejectWithValue('Authentication required');
      }

      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/bookings`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(bookingData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create booking');
      }

      const data: ApiResponse<Booking> = await response.json();
      
      return {
        booking: data.data,
      };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create booking');
    }
  }
);

export const updateBookingStatus = createAsyncThunk(
  'bookings/updateStatus',
  async (
    { id, status, reason }: { id: string; status: BookingStatus; reason?: string },
    { getState, rejectWithValue }
  ) => {
    try {
      const state = getState() as { 
        auth: { tokens: { accessToken: string } | null } 
      };
      
      const token = state.auth.tokens?.accessToken;
      if (!token) {
        return rejectWithValue('Authentication required');
      }

      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/bookings/${id}/status`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status, reason }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update booking status');
      }

      const data: ApiResponse<Booking> = await response.json();
      
      return {
        booking: data.data,
        id,
      };
    } catch (error) {
      return rejectWithValue('Failed to update booking status');
    }
  }
);

export const cancelBooking = createAsyncThunk(
  'bookings/cancel',
  async (
    { id, reason }: { id: string; reason: string },
    { getState, rejectWithValue }
  ) => {
    try {
      const state = getState() as { 
        auth: { tokens: { accessToken: string } | null } 
      };
      
      const token = state.auth.tokens?.accessToken;
      if (!token) {
        return rejectWithValue('Authentication required');
      }

      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/bookings/${id}/cancel`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reason }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to cancel booking');
      }

      const data: ApiResponse<{ booking: Booking; refund?: any }> = await response.json();
      
      return {
        booking: data.data.booking,
        refund: data.data.refund,
        id,
      };
    } catch (error) {
      return rejectWithValue('Failed to cancel booking');
    }
  }
);

export const processPayment = createAsyncThunk(
  'bookings/processPayment',
  async (
    { id, paymentData }: { id: string; paymentData: any },
    { getState, rejectWithValue }
  ) => {
    try {
      const state = getState() as { 
        auth: { tokens: { accessToken: string } | null } 
      };
      
      const token = state.auth.tokens?.accessToken;
      if (!token) {
        return rejectWithValue('Authentication required');
      }

      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/bookings/${id}/payment`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(paymentData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Payment processing failed');
      }

      const data: ApiResponse<{ booking: Booking; paymentResult: any }> = await response.json();
      
      return {
        booking: data.data.booking,
        paymentResult: data.data.paymentResult,
        id,
      };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Payment processing failed');
    }
  }
);

export const fetchPaymentMethods = createAsyncThunk(
  'bookings/fetchPaymentMethods',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { 
        auth: { tokens: { accessToken: string } | null };
        bookings: BookingState;
      };
      
      const token = state.auth.tokens?.accessToken;
      if (!token) {
        return rejectWithValue('Authentication required');
      }

      // Check cache
      const cacheKey = 'paymentMethods';
      if (isCacheValid(state.bookings.lastFetch[cacheKey], 60)) { // 1 hour cache
        return { fromCache: true };
      }

      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/payments/methods`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch payment methods');
      }

      const data: ApiResponse<PaymentMethod[]> = await response.json();
      
      return {
        paymentMethods: data.data,
        cacheKey,
      };
    } catch (error) {
      return rejectWithValue('Failed to fetch payment methods');
    }
  }
);

export const fetchInvoice = createAsyncThunk(
  'bookings/fetchInvoice',
  async (bookingId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { 
        auth: { tokens: { accessToken: string } | null };
        bookings: BookingState;
      };
      
      const token = state.auth.tokens?.accessToken;
      if (!token) {
        return rejectWithValue('Authentication required');
      }

      // Check cache
      const cacheKey = `invoice_${bookingId}`;
      if (
        state.bookings.invoices[bookingId] && 
        isCacheValid(state.bookings.lastFetch[cacheKey], 60) // 1 hour cache for invoices
      ) {
        return { fromCache: true, bookingId };
      }

      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/bookings/${bookingId}/invoice`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch invoice');
      }

      const data: ApiResponse<Invoice> = await response.json();
      
      return {
        invoice: data.data,
        bookingId,
        cacheKey,
      };
    } catch (error) {
      return rejectWithValue('Failed to fetch invoice');
    }
  }
);

export const syncBookings = createAsyncThunk(
  'bookings/sync',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { 
        auth: { tokens: { accessToken: string } | null };
        bookings: BookingState;
      };
      
      const token = state.auth.tokens?.accessToken;
      if (!token) {
        return rejectWithValue('Authentication required');
      }

      const lastSync = state.bookings.lastSync;
      const queryParams = new URLSearchParams();
      if (lastSync) {
        queryParams.append('since', lastSync);
      }

      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/bookings/sync?${queryParams}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to sync bookings');
      }

      const data: ApiResponse<{ bookings: Booking[]; timestamp: string }> = await response.json();
      
      return {
        bookings: data.data.bookings,
        timestamp: data.data.timestamp,
      };
    } catch (error) {
      return rejectWithValue('Failed to sync bookings');
    }
  }
);

// Booking slice
const bookingSlice = createSlice({
  name: 'bookings',
  initialState,
  reducers: {
    // UI actions
    setSelectedBooking: (state, action: PayloadAction<string | null>) => {
      state.selectedBooking = action.payload;
    },

    toggleBookingModal: (state) => {
      state.bookingModalOpen = !state.bookingModalOpen;
    },

    togglePaymentModal: (state) => {
      state.paymentModalOpen = !state.paymentModalOpen;
    },

    toggleCancellationModal: (state) => {
      state.cancellationModalOpen = !state.cancellationModalOpen;
    },

    // Filters and sorting
    setStatusFilter: (state, action: PayloadAction<BookingStatus | 'all'>) => {
      state.statusFilter = action.payload;
    },

    setDateFilter: (state, action: PayloadAction<'upcoming' | 'past' | 'all'>) => {
      state.dateFilter = action.payload;
    },

    setSortBy: (state, action: PayloadAction<'date' | 'price' | 'status'>) => {
      state.sortBy = action.payload;
    },

    setSortOrder: (state, action: PayloadAction<'asc' | 'desc'>) => {
      state.sortOrder = action.payload;
    },

    // Real-time updates
    addPendingUpdate: (state, action: PayloadAction<{ id: string; update: Partial<Booking> }>) => {
      const { id, update } = action.payload;
      state.pendingUpdates[id] = { ...state.pendingUpdates[id], ...update };
    },

    removePendingUpdate: (state, action: PayloadAction<string>) => {
      delete state.pendingUpdates[action.payload];
    },

    // Optimistic updates
    optimisticUpdateBookingStatus: (state, action: PayloadAction<{ id: string; status: BookingStatus }>) => {
      const { id, status } = action.payload;
      if (state.bookings[id]) {
        state.bookings[id].status = status;
        state.bookings[id].updatedAt = new Date().toISOString();
      }
    },

    optimisticCancelBooking: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      if (state.bookings[id]) {
        state.bookings[id].status = 'cancelled';
        state.bookings[id].updatedAt = new Date().toISOString();
      }
    },

    // Clear errors
    clearBookingsError: (state) => {
      state.bookingsError = null;
    },

    clearBookingError: (state, action: PayloadAction<string>) => {
      delete state.bookingErrors[action.payload];
    },

    clearPaymentError: (state, action: PayloadAction<string>) => {
      delete state.paymentErrors[action.payload];
    },

    clearCancellationError: (state, action: PayloadAction<string>) => {
      delete state.cancellationErrors[action.payload];
    },

    clearCreateBookingError: (state) => {
      state.createBookingError = null;
    },

    clearSyncError: (state) => {
      state.syncError = null;
    },

    // Cache management
    invalidateCache: (state, action: PayloadAction<string>) => {
      const pattern = action.payload;
      Object.keys(state.lastFetch).forEach(key => {
        if (key.includes(pattern)) {
          delete state.lastFetch[key];
        }
      });
    },

    clearAllCache: (state) => {
      state.lastFetch = {};
      state.bookings = {};
      state.invoices = {};
    },

    // Reset filters
    resetFilters: (state) => {
      state.statusFilter = 'all';
      state.dateFilter = 'all';
      state.sortBy = 'date';
      state.sortOrder = 'desc';
    },
  },

  extraReducers: (builder) => {
    // Fetch user bookings
    builder
      .addCase(fetchUserBookings.pending, (state) => {
        state.bookingsLoading = true;
        state.bookingsError = null;
      })
      .addCase(fetchUserBookings.fulfilled, (state, action) => {
        state.bookingsLoading = false;
        
        if (action.payload.fromCache) {
          return;
        }

        const { bookings, total, page, cacheKey } = action.payload;
        
        if (page === 1) {
          state.bookingsList = bookings.map(b => b.id);
          state.bookings = {};
        }
        
        bookings.forEach(booking => {
          state.bookings[booking.id] = booking;
          if (page === 1) {
            state.lastFetch[`booking_${booking.id}`] = new Date().toISOString();
          }
        });
        
        state.lastFetch[cacheKey] = new Date().toISOString();
      })
      .addCase(fetchUserBookings.rejected, (state, action) => {
        state.bookingsLoading = false;
        state.bookingsError = action.payload as string;
      });

    // Fetch booking
    builder
      .addCase(fetchBooking.pending, (state, action) => {
        const id = action.meta.arg;
        state.bookingLoading[id] = true;
        delete state.bookingErrors[id];
      })
      .addCase(fetchBooking.fulfilled, (state, action) => {
        if (action.payload.fromCache) {
          const id = action.payload.id;
          state.bookingLoading[id] = false;
          return;
        }

        const { booking, id, cacheKey } = action.payload;
        state.bookingLoading[id] = false;
        state.bookings[id] = booking;
        state.lastFetch[cacheKey] = new Date().toISOString();
      })
      .addCase(fetchBooking.rejected, (state, action) => {
        const id = action.meta.arg;
        state.bookingLoading[id] = false;
        state.bookingErrors[id] = action.payload as string;
      });

    // Create booking
    builder
      .addCase(createBooking.pending, (state) => {
        state.createBookingLoading = true;
        state.createBookingError = null;
      })
      .addCase(createBooking.fulfilled, (state, action) => {
        state.createBookingLoading = false;
        const booking = action.payload.booking;
        state.bookings[booking.id] = booking;
        state.bookingsList.unshift(booking.id);
        state.lastFetch[`booking_${booking.id}`] = new Date().toISOString();
        
        // Clear bookings cache to force refresh
        state.invalidateCache('bookings_');
      })
      .addCase(createBooking.rejected, (state, action) => {
        state.createBookingLoading = false;
        state.createBookingError = action.payload as string;
      });

    // Update booking status
    builder
      .addCase(updateBookingStatus.fulfilled, (state, action) => {
        const { booking, id } = action.payload;
        state.bookings[id] = booking;
        state.lastFetch[`booking_${id}`] = new Date().toISOString();
        
        // Remove pending update
        delete state.pendingUpdates[id];
      });

    // Cancel booking
    builder
      .addCase(cancelBooking.pending, (state, action) => {
        const id = action.meta.arg.id;
        state.cancellationLoading[id] = true;
        delete state.cancellationErrors[id];
      })
      .addCase(cancelBooking.fulfilled, (state, action) => {
        const { booking, id } = action.payload;
        state.cancellationLoading[id] = false;
        state.bookings[id] = booking;
        state.lastFetch[`booking_${id}`] = new Date().toISOString();
        
        // Remove pending update
        delete state.pendingUpdates[id];
      })
      .addCase(cancelBooking.rejected, (state, action) => {
        const id = action.meta.arg.id;
        state.cancellationLoading[id] = false;
        state.cancellationErrors[id] = action.payload as string;
        
        // Revert optimistic update
        if (state.bookings[id]) {
          // You might want to refetch the booking here or revert to previous status
        }
      });

    // Process payment
    builder
      .addCase(processPayment.pending, (state, action) => {
        const id = action.meta.arg.id;
        state.paymentLoading[id] = true;
        delete state.paymentErrors[id];
      })
      .addCase(processPayment.fulfilled, (state, action) => {
        const { booking, id } = action.payload;
        state.paymentLoading[id] = false;
        state.bookings[id] = booking;
        state.lastFetch[`booking_${id}`] = new Date().toISOString();
        
        // Clear payment modal
        state.paymentModalOpen = false;
      })
      .addCase(processPayment.rejected, (state, action) => {
        const id = action.meta.arg.id;
        state.paymentLoading[id] = false;
        state.paymentErrors[id] = action.payload as string;
      });

    // Fetch payment methods
    builder
      .addCase(fetchPaymentMethods.pending, (state) => {
        state.paymentMethodsLoading = true;
      })
      .addCase(fetchPaymentMethods.fulfilled, (state, action) => {
        state.paymentMethodsLoading = false;
        
        if (action.payload.fromCache) {
          return;
        }

        const { paymentMethods, cacheKey } = action.payload;
        state.paymentMethods = paymentMethods;
        state.lastFetch[cacheKey] = new Date().toISOString();
      })
      .addCase(fetchPaymentMethods.rejected, (state) => {
        state.paymentMethodsLoading = false;
      });

    // Fetch invoice
    builder
      .addCase(fetchInvoice.pending, (state, action) => {
        const bookingId = action.meta.arg;
        state.invoiceLoading[bookingId] = true;
      })
      .addCase(fetchInvoice.fulfilled, (state, action) => {
        if (action.payload.fromCache) {
          const bookingId = action.payload.bookingId;
          state.invoiceLoading[bookingId] = false;
          return;
        }

        const { invoice, bookingId, cacheKey } = action.payload;
        state.invoiceLoading[bookingId] = false;
        state.invoices[bookingId] = invoice;
        state.lastFetch[cacheKey] = new Date().toISOString();
      })
      .addCase(fetchInvoice.rejected, (state, action) => {
        const bookingId = action.meta.arg;
        state.invoiceLoading[bookingId] = false;
      });

    // Sync bookings
    builder
      .addCase(syncBookings.fulfilled, (state, action) => {
        const { bookings, timestamp } = action.payload;
        
        bookings.forEach(booking => {
          state.bookings[booking.id] = booking;
          state.lastFetch[`booking_${booking.id}`] = new Date().toISOString();
          
          // Add to list if not already present
          if (!state.bookingsList.includes(booking.id)) {
            state.bookingsList.push(booking.id);
          }
          
          // Clear pending updates for synced bookings
          delete state.pendingUpdates[booking.id];
        });
        
        state.lastSync = timestamp;
        state.syncError = null;
      })
      .addCase(syncBookings.rejected, (state, action) => {
        state.syncError = action.payload as string;
      });
  },
});

// Actions
export const {
  setSelectedBooking,
  toggleBookingModal,
  togglePaymentModal,
  toggleCancellationModal,
  setStatusFilter,
  setDateFilter,
  setSortBy,
  setSortOrder,
  addPendingUpdate,
  removePendingUpdate,
  optimisticUpdateBookingStatus,
  optimisticCancelBooking,
  clearBookingsError,
  clearBookingError,
  clearPaymentError,
  clearCancellationError,
  clearCreateBookingError,
  clearSyncError,
  invalidateCache,
  clearAllCache,
  resetFilters,
} = bookingSlice.actions;

// Selectors
export const selectBookingState = (state: { bookings: BookingState }) => state.bookings;
export const selectAllBookings = (state: { bookings: BookingState }) => 
  state.bookings.bookingsList.map(id => state.bookings.bookings[id]).filter(Boolean);
export const selectBooking = (id: string) => (state: { bookings: BookingState }) => 
  state.bookings.bookings[id];
export const selectBookingLoading = (id: string) => (state: { bookings: BookingState }) => 
  state.bookings.bookingLoading[id] || false;
export const selectSelectedBooking = (state: { bookings: BookingState }) => 
  state.bookings.selectedBooking;
export const selectBookingFilters = (state: { bookings: BookingState }) => ({
  status: state.bookings.statusFilter,
  date: state.bookings.dateFilter,
  sortBy: state.bookings.sortBy,
  sortOrder: state.bookings.sortOrder,
});
export const selectPaymentMethods = (state: { bookings: BookingState }) => state.bookings.paymentMethods;
export const selectInvoice = (bookingId: string) => (state: { bookings: BookingState }) => 
  state.bookings.invoices[bookingId];
export const selectPendingUpdates = (state: { bookings: BookingState }) => state.bookings.pendingUpdates;

export default bookingSlice.reducer;