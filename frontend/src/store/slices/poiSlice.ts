import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { 
  POI, 
  POICategory,
  OperatingHours,
  POIEvent,
  AudioGuide,
  Review,
  ApiResponse 
} from '../../types/api-types';

// POI state interface
export interface POIState {
  // Search and discovery
  searchResults: POI[];
  searchLoading: boolean;
  searchError: string | null;
  searchFilters: Record<string, any>;
  
  // Categories
  categories: POICategory[];
  categoriesLoading: boolean;
  
  // Individual POIs cache
  pois: Record<string, POI>;
  poiLoading: Record<string, boolean>;
  poiErrors: Record<string, string>;
  
  // Popular and recommended
  popular: POI[];
  popularLoading: boolean;
  recommended: POI[];
  recommendedLoading: boolean;
  
  // User interactions
  favorites: string[];
  visited: string[];
  favoritesLoading: boolean;
  
  // Operating hours cache
  operatingHours: Record<string, OperatingHours[]>;
  hoursLoading: Record<string, boolean>;
  
  // Events cache
  events: Record<string, POIEvent[]>;
  eventsLoading: Record<string, boolean>;
  
  // Audio guides cache
  audioGuides: Record<string, AudioGuide>;
  audioLoading: Record<string, boolean>;
  
  // Reviews cache
  reviews: Record<string, Review[]>;
  reviewsLoading: Record<string, boolean>;
  
  // Nearby POIs
  nearbyPOIs: Record<string, POI[]>;
  nearbyLoading: Record<string, boolean>;
  
  // UI state
  selectedPOI: string | null;
  filterModalOpen: boolean;
  categoryFilter: string | null;
  mapViewActive: boolean;
  
  // Cache metadata
  lastFetch: Record<string, string>;
  cacheExpiry: number;
}

// Initial state
const initialState: POIState = {
  searchResults: [],
  searchLoading: false,
  searchError: null,
  searchFilters: {},
  
  categories: [],
  categoriesLoading: false,
  
  pois: {},
  poiLoading: {},
  poiErrors: {},
  
  popular: [],
  popularLoading: false,
  recommended: [],
  recommendedLoading: false,
  
  favorites: [],
  visited: [],
  favoritesLoading: false,
  
  operatingHours: {},
  hoursLoading: {},
  
  events: {},
  eventsLoading: {},
  
  audioGuides: {},
  audioLoading: {},
  
  reviews: {},
  reviewsLoading: {},
  
  nearbyPOIs: {},
  nearbyLoading: {},
  
  selectedPOI: null,
  filterModalOpen: false,
  categoryFilter: null,
  mapViewActive: false,
  
  lastFetch: {},
  cacheExpiry: 30,
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
export const searchPOIs = createAsyncThunk(
  'pois/search',
  async (filters: Record<string, any>, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { pois: POIState };
      
      // Check cache
      const cacheKey = `search_${JSON.stringify(filters)}`;
      if (isCacheValid(state.pois.lastFetch[cacheKey], state.pois.cacheExpiry)) {
        return { fromCache: true };
      }

      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });

      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/pois/search?${queryParams}`
      );

      if (!response.ok) {
        throw new Error('POI search failed');
      }

      const data: ApiResponse<POI[]> = await response.json();
      
      return {
        pois: data.data,
        filters,
        cacheKey,
      };
    } catch (error) {
      return rejectWithValue('Failed to search POIs');
    }
  }
);

export const fetchPOICategories = createAsyncThunk(
  'pois/fetchCategories',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { pois: POIState };
      
      // Check cache
      const cacheKey = 'categories';
      if (isCacheValid(state.pois.lastFetch[cacheKey], 60)) { // 60 min cache for categories
        return { fromCache: true };
      }

      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/pois/categories`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }

      const data: ApiResponse<POICategory[]> = await response.json();
      
      return {
        categories: data.data,
        cacheKey,
      };
    } catch (error) {
      return rejectWithValue('Failed to fetch POI categories');
    }
  }
);

export const fetchPOI = createAsyncThunk(
  'pois/fetchPOI',
  async (id: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { pois: POIState };
      
      // Check cache
      const cacheKey = `poi_${id}`;
      if (
        state.pois.pois[id] && 
        isCacheValid(state.pois.lastFetch[cacheKey], state.pois.cacheExpiry)
      ) {
        return { fromCache: true, id };
      }

      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/pois/${id}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch POI');
      }

      const data: ApiResponse<POI> = await response.json();
      
      return {
        poi: data.data,
        id,
        cacheKey,
      };
    } catch (error) {
      return rejectWithValue('Failed to fetch POI details');
    }
  }
);

export const fetchPopularPOIs = createAsyncThunk(
  'pois/fetchPopular',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { pois: POIState };
      
      // Check cache
      const cacheKey = 'popular';
      if (isCacheValid(state.pois.lastFetch[cacheKey], state.pois.cacheExpiry)) {
        return { fromCache: true };
      }

      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/pois/popular`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch popular POIs');
      }

      const data: ApiResponse<POI[]> = await response.json();
      
      return {
        pois: data.data,
        cacheKey,
      };
    } catch (error) {
      return rejectWithValue('Failed to fetch popular POIs');
    }
  }
);

export const fetchRecommendedPOIs = createAsyncThunk(
  'pois/fetchRecommended',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { 
        pois: POIState;
        auth: { tokens: { accessToken: string } | null }
      };
      
      const token = state.auth.tokens?.accessToken;
      if (!token) {
        return rejectWithValue('Authentication required');
      }

      // Check cache
      const cacheKey = 'recommended';
      if (isCacheValid(state.pois.lastFetch[cacheKey], state.pois.cacheExpiry)) {
        return { fromCache: true };
      }

      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/pois/recommended`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch recommended POIs');
      }

      const data: ApiResponse<POI[]> = await response.json();
      
      return {
        pois: data.data,
        cacheKey,
      };
    } catch (error) {
      return rejectWithValue('Failed to fetch recommended POIs');
    }
  }
);

export const togglePOIFavorite = createAsyncThunk(
  'pois/toggleFavorite',
  async (
    { id, action }: { id: string; action: 'add' | 'remove' },
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
        `${process.env.REACT_APP_API_BASE_URL}/pois/${id}/favorite`,
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

export const markPOIVisited = createAsyncThunk(
  'pois/markVisited',
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
        `${process.env.REACT_APP_API_BASE_URL}/pois/${id}/visit`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to mark as visited');
      }

      return { id };
    } catch (error) {
      return rejectWithValue('Failed to mark POI as visited');
    }
  }
);

export const fetchPOIHours = createAsyncThunk(
  'pois/fetchHours',
  async (id: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { pois: POIState };
      
      // Check cache
      const cacheKey = `hours_${id}`;
      if (isCacheValid(state.pois.lastFetch[cacheKey], 120)) { // 2 hour cache for hours
        return { fromCache: true, id };
      }

      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/pois/${id}/hours`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch operating hours');
      }

      const data: ApiResponse<OperatingHours[]> = await response.json();
      
      return {
        hours: data.data,
        id,
        cacheKey,
      };
    } catch (error) {
      return rejectWithValue('Failed to fetch operating hours');
    }
  }
);

export const fetchPOIEvents = createAsyncThunk(
  'pois/fetchEvents',
  async (id: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { pois: POIState };
      
      // Check cache
      const cacheKey = `events_${id}`;
      if (isCacheValid(state.pois.lastFetch[cacheKey], 60)) { // 1 hour cache for events
        return { fromCache: true, id };
      }

      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/pois/${id}/events`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }

      const data: ApiResponse<POIEvent[]> = await response.json();
      
      return {
        events: data.data,
        id,
        cacheKey,
      };
    } catch (error) {
      return rejectWithValue('Failed to fetch POI events');
    }
  }
);

export const fetchAudioGuide = createAsyncThunk(
  'pois/fetchAudioGuide',
  async (id: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { pois: POIState };
      
      // Check cache
      const cacheKey = `audio_${id}`;
      if (isCacheValid(state.pois.lastFetch[cacheKey], 240)) { // 4 hour cache for audio guides
        return { fromCache: true, id };
      }

      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/pois/${id}/audio-guide`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch audio guide');
      }

      const data: ApiResponse<AudioGuide> = await response.json();
      
      return {
        audioGuide: data.data,
        id,
        cacheKey,
      };
    } catch (error) {
      return rejectWithValue('Failed to fetch audio guide');
    }
  }
);

export const fetchNearbyPOIs = createAsyncThunk(
  'pois/fetchNearby',
  async (
    { id, radius = 5000 }: { id: string; radius?: number },
    { getState, rejectWithValue }
  ) => {
    try {
      const state = getState() as { pois: POIState };
      
      // Check cache
      const cacheKey = `nearby_${id}_${radius}`;
      if (isCacheValid(state.pois.lastFetch[cacheKey], state.pois.cacheExpiry)) {
        return { fromCache: true, id };
      }

      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/pois/${id}/nearby?radius=${radius}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch nearby POIs');
      }

      const data: ApiResponse<POI[]> = await response.json();
      
      return {
        nearbyPOIs: data.data,
        id,
        cacheKey,
      };
    } catch (error) {
      return rejectWithValue('Failed to fetch nearby POIs');
    }
  }
);

// POI slice
const poiSlice = createSlice({
  name: 'pois',
  initialState,
  reducers: {
    // UI actions
    setSelectedPOI: (state, action: PayloadAction<string | null>) => {
      state.selectedPOI = action.payload;
    },

    toggleFilterModal: (state) => {
      state.filterModalOpen = !state.filterModalOpen;
    },

    setCategoryFilter: (state, action: PayloadAction<string | null>) => {
      state.categoryFilter = action.payload;
    },

    toggleMapView: (state) => {
      state.mapViewActive = !state.mapViewActive;
    },

    // Clear errors
    clearSearchError: (state) => {
      state.searchError = null;
    },

    clearPOIError: (state, action: PayloadAction<string>) => {
      delete state.poiErrors[action.payload];
    },

    // Optimistic updates
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

    optimisticMarkVisited: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      if (!state.visited.includes(id)) {
        state.visited.push(id);
      }
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
      state.pois = {};
      state.operatingHours = {};
      state.events = {};
      state.audioGuides = {};
      state.reviews = {};
      state.nearbyPOIs = {};
    },

    // Update search filters
    updateSearchFilters: (state, action: PayloadAction<Record<string, any>>) => {
      state.searchFilters = { ...state.searchFilters, ...action.payload };
    },
  },

  extraReducers: (builder) => {
    // Search POIs
    builder
      .addCase(searchPOIs.pending, (state) => {
        state.searchLoading = true;
        state.searchError = null;
      })
      .addCase(searchPOIs.fulfilled, (state, action) => {
        state.searchLoading = false;
        
        if (action.payload.fromCache) {
          return;
        }

        const { pois, filters, cacheKey } = action.payload;
        state.searchResults = pois;
        state.searchFilters = filters;
        state.lastFetch[cacheKey] = new Date().toISOString();

        // Update individual POI cache
        pois.forEach(poi => {
          state.pois[poi.id] = poi;
          state.lastFetch[`poi_${poi.id}`] = new Date().toISOString();
        });
      })
      .addCase(searchPOIs.rejected, (state, action) => {
        state.searchLoading = false;
        state.searchError = action.payload as string;
      });

    // Fetch categories
    builder
      .addCase(fetchPOICategories.pending, (state) => {
        state.categoriesLoading = true;
      })
      .addCase(fetchPOICategories.fulfilled, (state, action) => {
        state.categoriesLoading = false;
        
        if (action.payload.fromCache) {
          return;
        }

        const { categories, cacheKey } = action.payload;
        state.categories = categories;
        state.lastFetch[cacheKey] = new Date().toISOString();
      })
      .addCase(fetchPOICategories.rejected, (state) => {
        state.categoriesLoading = false;
      });

    // Fetch POI
    builder
      .addCase(fetchPOI.pending, (state, action) => {
        const id = action.meta.arg;
        state.poiLoading[id] = true;
        delete state.poiErrors[id];
      })
      .addCase(fetchPOI.fulfilled, (state, action) => {
        if (action.payload.fromCache) {
          const id = action.payload.id;
          state.poiLoading[id] = false;
          return;
        }

        const { poi, id, cacheKey } = action.payload;
        state.poiLoading[id] = false;
        state.pois[id] = poi;
        state.lastFetch[cacheKey] = new Date().toISOString();
      })
      .addCase(fetchPOI.rejected, (state, action) => {
        const id = action.meta.arg;
        state.poiLoading[id] = false;
        state.poiErrors[id] = action.payload as string;
      });

    // Fetch popular POIs
    builder
      .addCase(fetchPopularPOIs.pending, (state) => {
        state.popularLoading = true;
      })
      .addCase(fetchPopularPOIs.fulfilled, (state, action) => {
        state.popularLoading = false;
        
        if (action.payload.fromCache) {
          return;
        }

        const { pois, cacheKey } = action.payload;
        state.popular = pois;
        state.lastFetch[cacheKey] = new Date().toISOString();

        // Update individual POI cache
        pois.forEach(poi => {
          state.pois[poi.id] = poi;
          state.lastFetch[`poi_${poi.id}`] = new Date().toISOString();
        });
      })
      .addCase(fetchPopularPOIs.rejected, (state) => {
        state.popularLoading = false;
      });

    // Fetch recommended POIs
    builder
      .addCase(fetchRecommendedPOIs.pending, (state) => {
        state.recommendedLoading = true;
      })
      .addCase(fetchRecommendedPOIs.fulfilled, (state, action) => {
        state.recommendedLoading = false;
        
        if (action.payload.fromCache) {
          return;
        }

        const { pois, cacheKey } = action.payload;
        state.recommended = pois;
        state.lastFetch[cacheKey] = new Date().toISOString();

        // Update individual POI cache
        pois.forEach(poi => {
          state.pois[poi.id] = poi;
          state.lastFetch[`poi_${poi.id}`] = new Date().toISOString();
        });
      })
      .addCase(fetchRecommendedPOIs.rejected, (state) => {
        state.recommendedLoading = false;
      });

    // Toggle favorite
    builder
      .addCase(togglePOIFavorite.fulfilled, (state, action) => {
        const { id, action: favoriteAction } = action.payload;
        
        if (favoriteAction === 'add') {
          if (!state.favorites.includes(id)) {
            state.favorites.push(id);
          }
        } else {
          state.favorites = state.favorites.filter(fid => fid !== id);
        }
      });

    // Mark visited
    builder
      .addCase(markPOIVisited.fulfilled, (state, action) => {
        const { id } = action.payload;
        if (!state.visited.includes(id)) {
          state.visited.push(id);
        }
      });

    // Fetch hours
    builder
      .addCase(fetchPOIHours.pending, (state, action) => {
        const id = action.meta.arg;
        state.hoursLoading[id] = true;
      })
      .addCase(fetchPOIHours.fulfilled, (state, action) => {
        if (action.payload.fromCache) {
          const id = action.payload.id;
          state.hoursLoading[id] = false;
          return;
        }

        const { hours, id, cacheKey } = action.payload;
        state.hoursLoading[id] = false;
        state.operatingHours[id] = hours;
        state.lastFetch[cacheKey] = new Date().toISOString();
      })
      .addCase(fetchPOIHours.rejected, (state, action) => {
        const id = action.meta.arg;
        state.hoursLoading[id] = false;
      });

    // Fetch events
    builder
      .addCase(fetchPOIEvents.pending, (state, action) => {
        const id = action.meta.arg;
        state.eventsLoading[id] = true;
      })
      .addCase(fetchPOIEvents.fulfilled, (state, action) => {
        if (action.payload.fromCache) {
          const id = action.payload.id;
          state.eventsLoading[id] = false;
          return;
        }

        const { events, id, cacheKey } = action.payload;
        state.eventsLoading[id] = false;
        state.events[id] = events;
        state.lastFetch[cacheKey] = new Date().toISOString();
      })
      .addCase(fetchPOIEvents.rejected, (state, action) => {
        const id = action.meta.arg;
        state.eventsLoading[id] = false;
      });

    // Fetch audio guide
    builder
      .addCase(fetchAudioGuide.pending, (state, action) => {
        const id = action.meta.arg;
        state.audioLoading[id] = true;
      })
      .addCase(fetchAudioGuide.fulfilled, (state, action) => {
        if (action.payload.fromCache) {
          const id = action.payload.id;
          state.audioLoading[id] = false;
          return;
        }

        const { audioGuide, id, cacheKey } = action.payload;
        state.audioLoading[id] = false;
        state.audioGuides[id] = audioGuide;
        state.lastFetch[cacheKey] = new Date().toISOString();
      })
      .addCase(fetchAudioGuide.rejected, (state, action) => {
        const id = action.meta.arg;
        state.audioLoading[id] = false;
      });

    // Fetch nearby POIs
    builder
      .addCase(fetchNearbyPOIs.pending, (state, action) => {
        const id = action.meta.arg.id;
        state.nearbyLoading[id] = true;
      })
      .addCase(fetchNearbyPOIs.fulfilled, (state, action) => {
        if (action.payload.fromCache) {
          const id = action.payload.id;
          state.nearbyLoading[id] = false;
          return;
        }

        const { nearbyPOIs, id, cacheKey } = action.payload;
        state.nearbyLoading[id] = false;
        state.nearbyPOIs[id] = nearbyPOIs;
        state.lastFetch[cacheKey] = new Date().toISOString();

        // Update individual POI cache
        nearbyPOIs.forEach(poi => {
          state.pois[poi.id] = poi;
          state.lastFetch[`poi_${poi.id}`] = new Date().toISOString();
        });
      })
      .addCase(fetchNearbyPOIs.rejected, (state, action) => {
        const id = action.meta.arg.id;
        state.nearbyLoading[id] = false;
      });
  },
});

// Actions
export const {
  setSelectedPOI,
  toggleFilterModal,
  setCategoryFilter,
  toggleMapView,
  clearSearchError,
  clearPOIError,
  optimisticToggleFavorite,
  optimisticMarkVisited,
  invalidateCache,
  clearAllCache,
  updateSearchFilters,
} = poiSlice.actions;

// Selectors
export const selectPOIState = (state: { pois: POIState }) => state.pois;
export const selectPOISearchResults = (state: { pois: POIState }) => state.pois.searchResults;
export const selectPOICategories = (state: { pois: POIState }) => state.pois.categories;
export const selectPOI = (id: string) => (state: { pois: POIState }) => state.pois.pois[id];
export const selectPOILoading = (id: string) => (state: { pois: POIState }) => 
  state.pois.poiLoading[id] || false;
export const selectPopularPOIs = (state: { pois: POIState }) => state.pois.popular;
export const selectRecommendedPOIs = (state: { pois: POIState }) => state.pois.recommended;
export const selectPOIFavorites = (state: { pois: POIState }) => state.pois.favorites;
export const selectPOIVisited = (state: { pois: POIState }) => state.pois.visited;
export const selectSelectedPOI = (state: { pois: POIState }) => state.pois.selectedPOI;
export const selectPOIMapView = (state: { pois: POIState }) => state.pois.mapViewActive;
export const selectPOICategoryFilter = (state: { pois: POIState }) => state.pois.categoryFilter;

export default poiSlice.reducer;