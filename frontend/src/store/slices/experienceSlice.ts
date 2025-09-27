import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { 
  Experience, 
  ExperienceCategory,
  ExperienceAvailability,
  ExperienceBooking,
  Review,
  ApiResponse 
} from '../../types/api-types';

// Experience state interface
export interface ExperienceState {
  // Search and discovery
  searchResults: Experience[];
  searchLoading: boolean;
  searchError: string | null;
  searchFilters: Record<string, any>;
  
  // Categories
  categories: ExperienceCategory[];
  categoriesLoading: boolean;
  
  // Individual experiences cache
  experiences: Record<string, Experience>;
  experienceLoading: Record<string, boolean>;
  experienceErrors: Record<string, string>;
  
  // Popular and featured
  popular: Experience[];
  popularLoading: boolean;
  featured: Experience[];
  featuredLoading: boolean;
  
  // User interactions
  wishlist: string[];
  wishlistLoading: boolean;
  recentlyViewed: string[];
  
  // Availability cache
  availability: Record<string, ExperienceAvailability[]>;
  availabilityLoading: Record<string, boolean>;
  
  // Booking cache
  bookings: Record<string, ExperienceBooking>;
  bookingLoading: Record<string, boolean>;
  
  // Reviews cache
  reviews: Record<string, Review[]>;
  reviewsLoading: Record<string, boolean>;
  
  // Similar experiences
  similarExperiences: Record<string, Experience[]>;
  similarLoading: Record<string, boolean>;
  
  // UI state
  selectedExperience: string | null;
  filterModalOpen: boolean;
  categoryFilter: string | null;
  priceRange: [number, number];
  dateFilter: string | null;
  sortBy: 'price' | 'rating' | 'duration' | 'popularity';
  
  // Cache metadata
  lastFetch: Record<string, string>;
  cacheExpiry: number;
}

// Initial state
const initialState: ExperienceState = {
  searchResults: [],
  searchLoading: false,
  searchError: null,
  searchFilters: {},
  
  categories: [],
  categoriesLoading: false,
  
  experiences: {},
  experienceLoading: {},
  experienceErrors: {},
  
  popular: [],
  popularLoading: false,
  featured: [],
  featuredLoading: false,
  
  wishlist: [],
  wishlistLoading: false,
  recentlyViewed: [],
  
  availability: {},
  availabilityLoading: {},
  
  bookings: {},
  bookingLoading: {},
  
  reviews: {},
  reviewsLoading: {},
  
  similarExperiences: {},
  similarLoading: {},
  
  selectedExperience: null,
  filterModalOpen: false,
  categoryFilter: null,
  priceRange: [0, 1000],
  dateFilter: null,
  sortBy: 'popularity',
  
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
export const searchExperiences = createAsyncThunk(
  'experiences/search',
  async (filters: Record<string, any>, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { experiences: ExperienceState };
      
      // Check cache
      const cacheKey = `search_${JSON.stringify(filters)}`;
      if (isCacheValid(state.experiences.lastFetch[cacheKey], state.experiences.cacheExpiry)) {
        return { fromCache: true };
      }

      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            value.forEach(v => queryParams.append(key, String(v)));
          } else {
            queryParams.append(key, String(value));
          }
        }
      });

      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/experiences/search?${queryParams}`
      );

      if (!response.ok) {
        throw new Error('Experience search failed');
      }

      const data: ApiResponse<Experience[]> = await response.json();
      
      return {
        experiences: data.data,
        filters,
        cacheKey,
      };
    } catch (error) {
      return rejectWithValue('Failed to search experiences');
    }
  }
);

export const fetchExperienceCategories = createAsyncThunk(
  'experiences/fetchCategories',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { experiences: ExperienceState };
      
      // Check cache
      const cacheKey = 'categories';
      if (isCacheValid(state.experiences.lastFetch[cacheKey], 60)) { // 60 min cache for categories
        return { fromCache: true };
      }

      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/experiences/categories`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }

      const data: ApiResponse<ExperienceCategory[]> = await response.json();
      
      return {
        categories: data.data,
        cacheKey,
      };
    } catch (error) {
      return rejectWithValue('Failed to fetch experience categories');
    }
  }
);

export const fetchExperience = createAsyncThunk(
  'experiences/fetchExperience',
  async (id: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { experiences: ExperienceState };
      
      // Check cache
      const cacheKey = `experience_${id}`;
      if (
        state.experiences.experiences[id] && 
        isCacheValid(state.experiences.lastFetch[cacheKey], state.experiences.cacheExpiry)
      ) {
        return { fromCache: true, id };
      }

      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/experiences/${id}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch experience');
      }

      const data: ApiResponse<Experience> = await response.json();
      
      return {
        experience: data.data,
        id,
        cacheKey,
      };
    } catch (error) {
      return rejectWithValue('Failed to fetch experience details');
    }
  }
);

export const fetchPopularExperiences = createAsyncThunk(
  'experiences/fetchPopular',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { experiences: ExperienceState };
      
      // Check cache
      const cacheKey = 'popular';
      if (isCacheValid(state.experiences.lastFetch[cacheKey], state.experiences.cacheExpiry)) {
        return { fromCache: true };
      }

      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/experiences/popular`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch popular experiences');
      }

      const data: ApiResponse<Experience[]> = await response.json();
      
      return {
        experiences: data.data,
        cacheKey,
      };
    } catch (error) {
      return rejectWithValue('Failed to fetch popular experiences');
    }
  }
);

export const fetchFeaturedExperiences = createAsyncThunk(
  'experiences/fetchFeatured',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { experiences: ExperienceState };
      
      // Check cache
      const cacheKey = 'featured';
      if (isCacheValid(state.experiences.lastFetch[cacheKey], state.experiences.cacheExpiry)) {
        return { fromCache: true };
      }

      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/experiences/featured`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch featured experiences');
      }

      const data: ApiResponse<Experience[]> = await response.json();
      
      return {
        experiences: data.data,
        cacheKey,
      };
    } catch (error) {
      return rejectWithValue('Failed to fetch featured experiences');
    }
  }
);

export const toggleExperienceWishlist = createAsyncThunk(
  'experiences/toggleWishlist',
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
        `${process.env.REACT_APP_API_BASE_URL}/experiences/${id}/wishlist`,
        {
          method: action === 'add' ? 'POST' : 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update wishlist');
      }

      return { id, action };
    } catch (error) {
      return rejectWithValue('Failed to update wishlist status');
    }
  }
);

export const fetchExperienceAvailability = createAsyncThunk(
  'experiences/fetchAvailability',
  async (
    { id, startDate, endDate }: { id: string; startDate: string; endDate: string },
    { getState, rejectWithValue }
  ) => {
    try {
      const state = getState() as { experiences: ExperienceState };
      
      // Check cache
      const cacheKey = `availability_${id}_${startDate}_${endDate}`;
      if (isCacheValid(state.experiences.lastFetch[cacheKey], 15)) { // 15 min cache for availability
        return { fromCache: true, id };
      }

      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/experiences/${id}/availability?startDate=${startDate}&endDate=${endDate}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch availability');
      }

      const data: ApiResponse<ExperienceAvailability[]> = await response.json();
      
      return {
        availability: data.data,
        id,
        cacheKey,
      };
    } catch (error) {
      return rejectWithValue('Failed to fetch experience availability');
    }
  }
);

export const bookExperience = createAsyncThunk(
  'experiences/book',
  async (
    { id, bookingData }: { id: string; bookingData: any },
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
        `${process.env.REACT_APP_API_BASE_URL}/experiences/${id}/book`,
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
        throw new Error('Failed to book experience');
      }

      const data: ApiResponse<ExperienceBooking> = await response.json();
      
      return {
        booking: data.data,
        experienceId: id,
      };
    } catch (error) {
      return rejectWithValue('Failed to book experience');
    }
  }
);

export const fetchExperienceReviews = createAsyncThunk(
  'experiences/fetchReviews',
  async (
    { id, page = 1, limit = 10 }: { id: string; page?: number; limit?: number },
    { getState, rejectWithValue }
  ) => {
    try {
      const state = getState() as { experiences: ExperienceState };
      
      // Check cache for first page only
      const cacheKey = `reviews_${id}_${page}_${limit}`;
      if (
        page === 1 && 
        isCacheValid(state.experiences.lastFetch[cacheKey], state.experiences.cacheExpiry)
      ) {
        return { fromCache: true, id };
      }

      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/experiences/${id}/reviews?page=${page}&limit=${limit}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch reviews');
      }

      const data: ApiResponse<Review[]> = await response.json();
      
      return {
        reviews: data.data,
        id,
        page,
        cacheKey,
      };
    } catch (error) {
      return rejectWithValue('Failed to fetch experience reviews');
    }
  }
);

export const submitExperienceReview = createAsyncThunk(
  'experiences/submitReview',
  async (
    { id, reviewData }: { id: string; reviewData: any },
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
        `${process.env.REACT_APP_API_BASE_URL}/experiences/${id}/reviews`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(reviewData),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to submit review');
      }

      const data: ApiResponse<Review> = await response.json();
      
      return {
        review: data.data,
        experienceId: id,
      };
    } catch (error) {
      return rejectWithValue('Failed to submit review');
    }
  }
);

export const fetchSimilarExperiences = createAsyncThunk(
  'experiences/fetchSimilar',
  async (id: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { experiences: ExperienceState };
      
      // Check cache
      const cacheKey = `similar_${id}`;
      if (isCacheValid(state.experiences.lastFetch[cacheKey], 60)) { // 1 hour cache for similar
        return { fromCache: true, id };
      }

      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/experiences/${id}/similar`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch similar experiences');
      }

      const data: ApiResponse<Experience[]> = await response.json();
      
      return {
        similarExperiences: data.data,
        id,
        cacheKey,
      };
    } catch (error) {
      return rejectWithValue('Failed to fetch similar experiences');
    }
  }
);

// Experience slice
const experienceSlice = createSlice({
  name: 'experiences',
  initialState,
  reducers: {
    // UI actions
    setSelectedExperience: (state, action: PayloadAction<string | null>) => {
      state.selectedExperience = action.payload;
    },

    toggleFilterModal: (state) => {
      state.filterModalOpen = !state.filterModalOpen;
    },

    setCategoryFilter: (state, action: PayloadAction<string | null>) => {
      state.categoryFilter = action.payload;
    },

    setPriceRange: (state, action: PayloadAction<[number, number]>) => {
      state.priceRange = action.payload;
    },

    setDateFilter: (state, action: PayloadAction<string | null>) => {
      state.dateFilter = action.payload;
    },

    setSortBy: (state, action: PayloadAction<'price' | 'rating' | 'duration' | 'popularity'>) => {
      state.sortBy = action.payload;
    },

    // Recently viewed
    addToRecentlyViewed: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      state.recentlyViewed = [
        id,
        ...state.recentlyViewed.filter(viewedId => viewedId !== id)
      ].slice(0, 10); // Keep only last 10
    },

    // Clear errors
    clearSearchError: (state) => {
      state.searchError = null;
    },

    clearExperienceError: (state, action: PayloadAction<string>) => {
      delete state.experienceErrors[action.payload];
    },

    // Optimistic updates
    optimisticToggleWishlist: (state, action: PayloadAction<{ id: string; action: 'add' | 'remove' }>) => {
      const { id, action: wishlistAction } = action.payload;
      
      if (wishlistAction === 'add') {
        if (!state.wishlist.includes(id)) {
          state.wishlist.push(id);
        }
      } else {
        state.wishlist = state.wishlist.filter(wid => wid !== id);
      }
    },

    optimisticAddReview: (state, action: PayloadAction<{ experienceId: string; review: Review }>) => {
      const { experienceId, review } = action.payload;
      
      if (!state.reviews[experienceId]) {
        state.reviews[experienceId] = [];
      }
      
      state.reviews[experienceId].unshift(review);
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
      state.experiences = {};
      state.availability = {};
      state.bookings = {};
      state.reviews = {};
      state.similarExperiences = {};
    },

    // Update search filters
    updateSearchFilters: (state, action: PayloadAction<Record<string, any>>) => {
      state.searchFilters = { ...state.searchFilters, ...action.payload };
    },

    // Reset search
    resetSearch: (state) => {
      state.searchResults = [];
      state.searchFilters = {};
      state.searchError = null;
      state.categoryFilter = null;
      state.priceRange = [0, 1000];
      state.dateFilter = null;
      state.sortBy = 'popularity';
    },
  },

  extraReducers: (builder) => {
    // Search experiences
    builder
      .addCase(searchExperiences.pending, (state) => {
        state.searchLoading = true;
        state.searchError = null;
      })
      .addCase(searchExperiences.fulfilled, (state, action) => {
        state.searchLoading = false;
        
        if (action.payload.fromCache) {
          return;
        }

        const { experiences, filters, cacheKey } = action.payload;
        state.searchResults = experiences;
        state.searchFilters = filters;
        state.lastFetch[cacheKey] = new Date().toISOString();

        // Update individual experience cache
        experiences.forEach(experience => {
          state.experiences[experience.id] = experience;
          state.lastFetch[`experience_${experience.id}`] = new Date().toISOString();
        });
      })
      .addCase(searchExperiences.rejected, (state, action) => {
        state.searchLoading = false;
        state.searchError = action.payload as string;
      });

    // Fetch categories
    builder
      .addCase(fetchExperienceCategories.pending, (state) => {
        state.categoriesLoading = true;
      })
      .addCase(fetchExperienceCategories.fulfilled, (state, action) => {
        state.categoriesLoading = false;
        
        if (action.payload.fromCache) {
          return;
        }

        const { categories, cacheKey } = action.payload;
        state.categories = categories;
        state.lastFetch[cacheKey] = new Date().toISOString();
      })
      .addCase(fetchExperienceCategories.rejected, (state) => {
        state.categoriesLoading = false;
      });

    // Fetch experience
    builder
      .addCase(fetchExperience.pending, (state, action) => {
        const id = action.meta.arg;
        state.experienceLoading[id] = true;
        delete state.experienceErrors[id];
      })
      .addCase(fetchExperience.fulfilled, (state, action) => {
        if (action.payload.fromCache) {
          const id = action.payload.id;
          state.experienceLoading[id] = false;
          return;
        }

        const { experience, id, cacheKey } = action.payload;
        state.experienceLoading[id] = false;
        state.experiences[id] = experience;
        state.lastFetch[cacheKey] = new Date().toISOString();
      })
      .addCase(fetchExperience.rejected, (state, action) => {
        const id = action.meta.arg;
        state.experienceLoading[id] = false;
        state.experienceErrors[id] = action.payload as string;
      });

    // Fetch popular experiences
    builder
      .addCase(fetchPopularExperiences.pending, (state) => {
        state.popularLoading = true;
      })
      .addCase(fetchPopularExperiences.fulfilled, (state, action) => {
        state.popularLoading = false;
        
        if (action.payload.fromCache) {
          return;
        }

        const { experiences, cacheKey } = action.payload;
        state.popular = experiences;
        state.lastFetch[cacheKey] = new Date().toISOString();

        // Update individual experience cache
        experiences.forEach(experience => {
          state.experiences[experience.id] = experience;
          state.lastFetch[`experience_${experience.id}`] = new Date().toISOString();
        });
      })
      .addCase(fetchPopularExperiences.rejected, (state) => {
        state.popularLoading = false;
      });

    // Fetch featured experiences
    builder
      .addCase(fetchFeaturedExperiences.pending, (state) => {
        state.featuredLoading = true;
      })
      .addCase(fetchFeaturedExperiences.fulfilled, (state, action) => {
        state.featuredLoading = false;
        
        if (action.payload.fromCache) {
          return;
        }

        const { experiences, cacheKey } = action.payload;
        state.featured = experiences;
        state.lastFetch[cacheKey] = new Date().toISOString();

        // Update individual experience cache
        experiences.forEach(experience => {
          state.experiences[experience.id] = experience;
          state.lastFetch[`experience_${experience.id}`] = new Date().toISOString();
        });
      })
      .addCase(fetchFeaturedExperiences.rejected, (state) => {
        state.featuredLoading = false;
      });

    // Toggle wishlist
    builder
      .addCase(toggleExperienceWishlist.fulfilled, (state, action) => {
        const { id, action: wishlistAction } = action.payload;
        
        if (wishlistAction === 'add') {
          if (!state.wishlist.includes(id)) {
            state.wishlist.push(id);
          }
        } else {
          state.wishlist = state.wishlist.filter(wid => wid !== id);
        }
      });

    // Fetch availability
    builder
      .addCase(fetchExperienceAvailability.pending, (state, action) => {
        const id = action.meta.arg.id;
        state.availabilityLoading[id] = true;
      })
      .addCase(fetchExperienceAvailability.fulfilled, (state, action) => {
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
      .addCase(fetchExperienceAvailability.rejected, (state, action) => {
        const id = action.meta.arg.id;
        state.availabilityLoading[id] = false;
      });

    // Book experience
    builder
      .addCase(bookExperience.pending, (state, action) => {
        const id = action.meta.arg.id;
        state.bookingLoading[id] = true;
      })
      .addCase(bookExperience.fulfilled, (state, action) => {
        const { booking, experienceId } = action.payload;
        state.bookingLoading[experienceId] = false;
        state.bookings[booking.id] = booking;
        
        // Invalidate availability cache
        state.invalidateCache(`availability_${experienceId}`);
      })
      .addCase(bookExperience.rejected, (state, action) => {
        const id = action.meta.arg.id;
        state.bookingLoading[id] = false;
      });

    // Fetch reviews
    builder
      .addCase(fetchExperienceReviews.pending, (state, action) => {
        const id = action.meta.arg.id;
        state.reviewsLoading[id] = true;
      })
      .addCase(fetchExperienceReviews.fulfilled, (state, action) => {
        if (action.payload.fromCache) {
          const id = action.payload.id;
          state.reviewsLoading[id] = false;
          return;
        }

        const { reviews, id, page, cacheKey } = action.payload;
        state.reviewsLoading[id] = false;
        
        if (page === 1) {
          state.reviews[id] = reviews;
        } else {
          state.reviews[id] = [...(state.reviews[id] || []), ...reviews];
        }
        
        state.lastFetch[cacheKey] = new Date().toISOString();
      })
      .addCase(fetchExperienceReviews.rejected, (state, action) => {
        const id = action.meta.arg.id;
        state.reviewsLoading[id] = false;
      });

    // Submit review
    builder
      .addCase(submitExperienceReview.fulfilled, (state, action) => {
        const { review, experienceId } = action.payload;
        
        if (!state.reviews[experienceId]) {
          state.reviews[experienceId] = [];
        }
        
        state.reviews[experienceId].unshift(review);
        
        // Invalidate reviews cache
        state.invalidateCache(`reviews_${experienceId}`);
      });

    // Fetch similar experiences
    builder
      .addCase(fetchSimilarExperiences.pending, (state, action) => {
        const id = action.meta.arg;
        state.similarLoading[id] = true;
      })
      .addCase(fetchSimilarExperiences.fulfilled, (state, action) => {
        if (action.payload.fromCache) {
          const id = action.payload.id;
          state.similarLoading[id] = false;
          return;
        }

        const { similarExperiences, id, cacheKey } = action.payload;
        state.similarLoading[id] = false;
        state.similarExperiences[id] = similarExperiences;
        state.lastFetch[cacheKey] = new Date().toISOString();

        // Update individual experience cache
        similarExperiences.forEach(experience => {
          state.experiences[experience.id] = experience;
          state.lastFetch[`experience_${experience.id}`] = new Date().toISOString();
        });
      })
      .addCase(fetchSimilarExperiences.rejected, (state, action) => {
        const id = action.meta.arg;
        state.similarLoading[id] = false;
      });
  },
});

// Actions
export const {
  setSelectedExperience,
  toggleFilterModal,
  setCategoryFilter,
  setPriceRange,
  setDateFilter,
  setSortBy,
  addToRecentlyViewed,
  clearSearchError,
  clearExperienceError,
  optimisticToggleWishlist,
  optimisticAddReview,
  invalidateCache,
  clearAllCache,
  updateSearchFilters,
  resetSearch,
} = experienceSlice.actions;

// Selectors
export const selectExperienceState = (state: { experiences: ExperienceState }) => state.experiences;
export const selectExperienceSearchResults = (state: { experiences: ExperienceState }) => state.experiences.searchResults;
export const selectExperienceCategories = (state: { experiences: ExperienceState }) => state.experiences.categories;
export const selectExperience = (id: string) => (state: { experiences: ExperienceState }) => state.experiences.experiences[id];
export const selectExperienceLoading = (id: string) => (state: { experiences: ExperienceState }) => 
  state.experiences.experienceLoading[id] || false;
export const selectPopularExperiences = (state: { experiences: ExperienceState }) => state.experiences.popular;
export const selectFeaturedExperiences = (state: { experiences: ExperienceState }) => state.experiences.featured;
export const selectExperienceWishlist = (state: { experiences: ExperienceState }) => state.experiences.wishlist;
export const selectRecentlyViewedExperiences = (state: { experiences: ExperienceState }) => state.experiences.recentlyViewed;
export const selectSelectedExperience = (state: { experiences: ExperienceState }) => state.experiences.selectedExperience;
export const selectExperienceFilters = (state: { experiences: ExperienceState }) => ({
  category: state.experiences.categoryFilter,
  priceRange: state.experiences.priceRange,
  date: state.experiences.dateFilter,
  sortBy: state.experiences.sortBy,
});

export default experienceSlice.reducer;