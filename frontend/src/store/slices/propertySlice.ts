import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { 
  Property, 
  PropertySearchFilters, 
  PropertyAvailability,
  Review,
  ApiResponse 
} from '../../types/api-types';

// Property state interface
export interface PropertyState {
  // Search results
  searchResults: Property[];
  searchFilters: PropertySearchFilters;
  searchLoading: boolean;
  searchError: string | null;
  hasMoreResults: boolean;
  totalResults: number;
  currentPage: number;
  
  // Individual properties cache
  properties: Record<string, Property>;
  propertyLoading: Record<string, boolean>;
  propertyErrors: Record<string, string>;
  
  // Availability cache
  availability: Record<string, PropertyAvailability[]>;
  availabilityLoading: Record<string, boolean>;
  
  // User favorites
  favorites: string[];
  favoritesLoading: boolean;
  
  // Recently viewed
  recentlyViewed: string[];
  
  // Pricing cache
  pricing: Record<string, any>;
  pricingLoading: Record<string, boolean>;
  
  // Reviews cache
  reviews: Record<string, Review[]>;
  reviewsLoading: Record<string, boolean>;
  
  // UI state
  selectedProperty: string | null;
  filterModalOpen: boolean;
  mapViewActive: boolean;
  
  // Cache metadata
  lastFetch: Record<string, string>;
  cacheExpiry: number; // in minutes
}

// Initial state
const initialState: PropertyState = {
  searchResults: [],
  searchFilters: {},
  searchLoading: false,
  searchError: null,
  hasMoreResults: true,
  totalResults: 0,
  currentPage: 1,
  
  properties: {},
  propertyLoading: {},
  propertyErrors: {},
  
  availability: {},
  availabilityLoading: {},
  
  favorites: [],
  favoritesLoading: false,
  
  recentlyViewed: [],
  
  pricing: {},
  pricingLoading: {},
  
  reviews: {},
  reviewsLoading: {},
  
  selectedProperty: null,
  filterModalOpen: false,
  mapViewActive: false,
  
  lastFetch: {},
  cacheExpiry: 30, // 30 minutes
};

// Helper function to check if cache is valid
const isCacheValid = (lastFetch: string, expiryMinutes: number): boolean => {
  if (!lastFetch) return false;
  const lastFetchTime = new Date(lastFetch);
  const now = new Date();
  const diffMinutes = (now.getTime() - lastFetchTime.getTime()) / (1000 * 60);
  return diffMinutes < expiryMinutes;
};

// Async thunks
export const searchProperties = createAsyncThunk(
  'properties/search',
  async (
    { filters, page = 1, resetResults = false }: 
    { filters: PropertySearchFilters; page?: number; resetResults?: boolean },
    { getState, rejectWithValue }
  ) => {
    try {
      const state = getState() as { properties: PropertyState };
      
      // Check cache for the same search
      const cacheKey = `search_${JSON.stringify(filters)}_${page}`;
      if (!resetResults && isCacheValid(state.properties.lastFetch[cacheKey], state.properties.cacheExpiry)) {
        return { fromCache: true };
      }

      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
      queryParams.append('page', String(page));
      queryParams.append('limit', '20');

      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/properties/search?${queryParams}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data: ApiResponse<Property[]> = await response.json();
      
      return {
        properties: data.data,
        pagination: data.meta?.pagination,
        filters,
        page,
        resetResults,
        cacheKey,
      };
    } catch (error) {
      return rejectWithValue('Failed to search properties');
    }
  }
);

export const fetchProperty = createAsyncThunk(
  'properties/fetchProperty',
  async (id: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { properties: PropertyState };
      
      // Check cache
      const cacheKey = `property_${id}`;
      if (
        state.properties.properties[id] && 
        isCacheValid(state.properties.lastFetch[cacheKey], state.properties.cacheExpiry)
      ) {
        return { fromCache: true, id };
      }

      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/properties/${id}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch property');
      }

      const data: ApiResponse<Property> = await response.json();
      
      return {
        property: data.data,
        id,
        cacheKey,
      };
    } catch (error) {
      return rejectWithValue('Failed to fetch property details');
    }
  }
);

export const fetchPropertyAvailability = createAsyncThunk(
  'properties/fetchAvailability',
  async (
    { id, checkIn, checkOut }: { id: string; checkIn: string; checkOut: string },
    { getState, rejectWithValue }
  ) => {
    try {
      const state = getState() as { properties: PropertyState };
      
      // Check cache
      const cacheKey = `availability_${id}_${checkIn}_${checkOut}`;
      if (isCacheValid(state.properties.lastFetch[cacheKey], 60)) { // 60 min cache for availability
        return { fromCache: true, id };
      }

      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/properties/${id}/availability?checkIn=${checkIn}&checkOut=${checkOut}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch availability');
      }

      const data: ApiResponse<PropertyAvailability[]> = await response.json();
      
      return {
        availability: data.data,
        id,
        checkIn,
        checkOut,
        cacheKey,
      };
    } catch (error) {
      return rejectWithValue('Failed to fetch property availability');
    }
  }
);

export const togglePropertyFavorite = createAsyncThunk(
  'properties/toggleFavorite',
  async (
    { id, action }: { id: string; action: 'add' | 'remove' },
    { getState, rejectWithValue }
  ) => {
    try {
      const state = getState() as { 
        properties: PropertyState; 
        auth: { tokens: { accessToken: string } | null } 
      };
      
      const token = state.auth.tokens?.accessToken;
      if (!token) {
        return rejectWithValue('Authentication required');
      }

      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/properties/${id}/favorite`,
        {
          method: action === 'add' ? 'POST' : 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update favorite');
      }

      return { id, action };
    } catch (error) {
      return rejectWithValue('Failed to update favorite status');
    }
  }
);

export const fetchUserFavorites = createAsyncThunk(
  'properties/fetchFavorites',
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
        `${process.env.REACT_APP_API_BASE_URL}/properties/favorites`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch favorites');
      }

      const data: ApiResponse<Property[]> = await response.json();
      return data.data;
    } catch (error) {
      return rejectWithValue('Failed to fetch user favorites');
    }
  }
);

export const fetchPropertyReviews = createAsyncThunk(
  'properties/fetchReviews',
  async (id: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { properties: PropertyState };
      
      // Check cache
      const cacheKey = `reviews_${id}`;
      if (isCacheValid(state.properties.lastFetch[cacheKey], state.properties.cacheExpiry)) {
        return { fromCache: true, id };
      }

      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/properties/${id}/reviews`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch reviews');
      }

      const data: ApiResponse<Review[]> = await response.json();
      
      return {
        reviews: data.data,
        id,
        cacheKey,
      };
    } catch (error) {
      return rejectWithValue('Failed to fetch property reviews');
    }
  }
);

// Property slice
const propertySlice = createSlice({
  name: 'properties',
  initialState,
  reducers: {
    // UI actions
    setSelectedProperty: (state, action: PayloadAction<string | null>) => {
      state.selectedProperty = action.payload;
    },

    toggleFilterModal: (state) => {
      state.filterModalOpen = !state.filterModalOpen;
    },

    toggleMapView: (state) => {
      state.mapViewActive = !state.mapViewActive;
    },

    // Recently viewed
    addToRecentlyViewed: (state, action: PayloadAction<string>) => {
      const propertyId = action.payload;
      const index = state.recentlyViewed.indexOf(propertyId);
      
      if (index > -1) {
        // Move to front if already exists
        state.recentlyViewed.splice(index, 1);
      }
      
      state.recentlyViewed.unshift(propertyId);
      
      // Keep only last 10 items
      if (state.recentlyViewed.length > 10) {
        state.recentlyViewed = state.recentlyViewed.slice(0, 10);
      }
    },

    // Clear errors
    clearSearchError: (state) => {
      state.searchError = null;
    },

    clearPropertyError: (state, action: PayloadAction<string>) => {
      delete state.propertyErrors[action.payload];
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
      state.properties = {};
      state.availability = {};
      state.pricing = {};
      state.reviews = {};
    },

    // Optimistic updates for favorites
    optimisticToggleFavorite: (state, action: PayloadAction<{ id: string; action: 'add' | 'remove' }>) => {
      const { id, action: favoriteAction } = action.payload;
      
      if (favoriteAction === 'add') {
        if (!state.favorites.includes(id)) {
          state.favorites.push(id);
        }
      } else {
        state.favorites = state.favorites.filter(fid => fid !== id);
      }
    },
  },

  extraReducers: (builder) => {
    // Search properties
    builder
      .addCase(searchProperties.pending, (state, action) => {
        state.searchLoading = true;
        state.searchError = null;
        if (action.meta.arg.resetResults) {
          state.searchResults = [];
          state.currentPage = 1;
        }
      })
      .addCase(searchProperties.fulfilled, (state, action) => {
        state.searchLoading = false;
        
        if (action.payload.fromCache) {
          return;
        }

        const { properties, pagination, filters, page, resetResults, cacheKey } = action.payload;
        
        if (resetResults || page === 1) {
          state.searchResults = properties;
        } else {
          // Append for pagination
          state.searchResults = [...state.searchResults, ...properties];
        }
        
        state.searchFilters = filters;
        state.currentPage = page;
        
        if (pagination) {
          state.totalResults = pagination.total;
          state.hasMoreResults = pagination.hasNext;
        }

        // Cache the search results
        state.lastFetch[cacheKey] = new Date().toISOString();

        // Update individual property cache
        properties.forEach(property => {
          state.properties[property.id] = property;
          state.lastFetch[`property_${property.id}`] = new Date().toISOString();
        });
      })
      .addCase(searchProperties.rejected, (state, action) => {
        state.searchLoading = false;
        state.searchError = action.payload as string;
      });

    // Fetch property
    builder
      .addCase(fetchProperty.pending, (state, action) => {
        const id = action.meta.arg;
        state.propertyLoading[id] = true;
        delete state.propertyErrors[id];
      })
      .addCase(fetchProperty.fulfilled, (state, action) => {
        if (action.payload.fromCache) {
          const id = action.payload.id;
          state.propertyLoading[id] = false;
          return;
        }

        const { property, id, cacheKey } = action.payload;
        state.propertyLoading[id] = false;
        state.properties[id] = property;
        state.lastFetch[cacheKey] = new Date().toISOString();
      })
      .addCase(fetchProperty.rejected, (state, action) => {
        const id = action.meta.arg;
        state.propertyLoading[id] = false;
        state.propertyErrors[id] = action.payload as string;
      });

    // Fetch availability
    builder
      .addCase(fetchPropertyAvailability.pending, (state, action) => {
        const id = action.meta.arg.id;
        state.availabilityLoading[id] = true;
      })
      .addCase(fetchPropertyAvailability.fulfilled, (state, action) => {
        if (action.payload.fromCache) {
          const id = action.payload.id;
          state.availabilityLoading[id] = false;
          return;
        }

        const { availability, id, cacheKey } = action.payload;
        state.availabilityLoading[id] = false;
        state.availability[id] = availability;
        state.lastFetch[cacheKey] = new Date().toISOString();
      })
      .addCase(fetchPropertyAvailability.rejected, (state, action) => {
        const id = action.meta.arg.id;
        state.availabilityLoading[id] = false;
      });

    // Toggle favorite
    builder
      .addCase(togglePropertyFavorite.fulfilled, (state, action) => {
        const { id, action: favoriteAction } = action.payload;
        
        if (favoriteAction === 'add') {
          if (!state.favorites.includes(id)) {
            state.favorites.push(id);
          }
        } else {
          state.favorites = state.favorites.filter(fid => fid !== id);
        }
      })
      .addCase(togglePropertyFavorite.rejected, (state, action) => {
        // Revert optimistic update on failure
        // The optimistic update will be handled by the component
      });

    // Fetch favorites
    builder
      .addCase(fetchUserFavorites.pending, (state) => {
        state.favoritesLoading = true;
      })
      .addCase(fetchUserFavorites.fulfilled, (state, action) => {
        state.favoritesLoading = false;
        state.favorites = action.payload.map(property => property.id);
        
        // Update property cache with favorite properties
        action.payload.forEach(property => {
          state.properties[property.id] = property;
          state.lastFetch[`property_${property.id}`] = new Date().toISOString();
        });
      })
      .addCase(fetchUserFavorites.rejected, (state) => {
        state.favoritesLoading = false;
      });

    // Fetch reviews
    builder
      .addCase(fetchPropertyReviews.pending, (state, action) => {
        const id = action.meta.arg;
        state.reviewsLoading[id] = true;
      })
      .addCase(fetchPropertyReviews.fulfilled, (state, action) => {
        if (action.payload.fromCache) {
          const id = action.payload.id;
          state.reviewsLoading[id] = false;
          return;
        }

        const { reviews, id, cacheKey } = action.payload;
        state.reviewsLoading[id] = false;
        state.reviews[id] = reviews;
        state.lastFetch[cacheKey] = new Date().toISOString();
      })
      .addCase(fetchPropertyReviews.rejected, (state, action) => {
        const id = action.meta.arg;
        state.reviewsLoading[id] = false;
      });
  },
});

// Actions
export const {
  setSelectedProperty,
  toggleFilterModal,
  toggleMapView,
  addToRecentlyViewed,
  clearSearchError,
  clearPropertyError,
  invalidateCache,
  clearAllCache,
  optimisticToggleFavorite,
} = propertySlice.actions;

// Selectors
export const selectPropertyState = (state: { properties: PropertyState }) => state.properties;
export const selectSearchResults = (state: { properties: PropertyState }) => state.properties.searchResults;
export const selectSearchLoading = (state: { properties: PropertyState }) => state.properties.searchLoading;
export const selectSearchFilters = (state: { properties: PropertyState }) => state.properties.searchFilters;
export const selectProperty = (id: string) => (state: { properties: PropertyState }) => 
  state.properties.properties[id];
export const selectPropertyLoading = (id: string) => (state: { properties: PropertyState }) => 
  state.properties.propertyLoading[id] || false;
export const selectFavorites = (state: { properties: PropertyState }) => state.properties.favorites;
export const selectRecentlyViewed = (state: { properties: PropertyState }) => state.properties.recentlyViewed;
export const selectSelectedProperty = (state: { properties: PropertyState }) => state.properties.selectedProperty;
export const selectMapViewActive = (state: { properties: PropertyState }) => state.properties.mapViewActive;

export default propertySlice.reducer;