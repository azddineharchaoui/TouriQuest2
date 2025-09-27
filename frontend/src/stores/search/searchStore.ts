/**
 * Advanced Property Search Store
 * Sophisticated state management for world-class property search
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type {
  PropertySearchFilters,
  PropertySearchResult,
  SmartSearchQuery,
  FilterSuggestion,
  SavedSearch,
  SearchAlert,
  UserSearchPreferences,
  PropertySearchResponse,
  AutocompleteResult,
  MapConfig,
  PropertyCluster,
  SearchAnalytics,
  ConversionFunnel
} from '../../types/property-search';

// ====================================
// SEARCH STATE INTERFACE
// ====================================

export interface SearchState {
  // Core Search State
  query: string;
  smartQuery: SmartSearchQuery | null;
  filters: PropertySearchFilters;
  results: PropertySearchResult[];
  totalResults: number;
  isLoading: boolean;
  isSearching: boolean;
  error: string | null;
  
  // Pagination & Performance
  currentPage: number;
  hasNextPage: boolean;
  isLoadingMore: boolean;
  searchId: string | null;
  cacheKey: string | null;
  
  // UI State
  viewType: 'grid' | 'list' | 'map' | 'calendar';
  showFilters: boolean;
  showMap: boolean;
  selectedPropertyId: string | null;
  
  // Advanced Features
  autocompleteResults: AutocompleteResult[];
  isAutocompleting: boolean;
  filterSuggestions: FilterSuggestion[];
  recentSearches: SmartSearchQuery[];
  savedSearches: SavedSearch[];
  searchAlerts: SearchAlert[];
  
  // Personalization
  userPreferences: UserSearchPreferences | null;
  recentlyViewed: PropertySearchResult[];
  favorites: string[];
  
  // Map State
  mapConfig: MapConfig;
  propertyClusters: PropertyCluster[];
  showClusters: boolean;
  showHeatmap: boolean;
  
  // Analytics
  searchAnalytics: SearchAnalytics | null;
  conversionFunnel: ConversionFunnel[];
  
  // Performance
  optimisticUpdates: Record<string, any>;
  backgroundSync: boolean;
  offlineQueue: any[];
}

// ====================================
// SEARCH ACTIONS INTERFACE
// ====================================

export interface SearchActions {
  // Core Search Actions
  setQuery: (query: string) => void;
  setSmartQuery: (smartQuery: SmartSearchQuery) => void;
  updateFilters: (filters: Partial<PropertySearchFilters>) => void;
  clearFilters: () => void;
  resetSearch: () => void;
  
  // Search Execution
  executeSearch: () => Promise<void>;
  loadMoreResults: () => Promise<void>;
  retrySearch: () => Promise<void>;
  
  // Autocomplete
  startAutocomplete: (input: string) => Promise<void>;
  clearAutocomplete: () => void;
  selectAutocompleteResult: (result: AutocompleteResult) => void;
  
  // UI State Management
  setViewType: (viewType: 'grid' | 'list' | 'map' | 'calendar') => void;
  toggleFilters: () => void;
  toggleMap: () => void;
  selectProperty: (propertyId: string | null) => void;
  
  // Results Management
  updateResults: (response: PropertySearchResponse) => void;
  appendResults: (results: PropertySearchResult[]) => void;
  updateProperty: (propertyId: string, updates: Partial<PropertySearchResult>) => void;
  removeProperty: (propertyId: string) => void;
  
  // Favorites & Personalization
  toggleFavorite: (propertyId: string) => void;
  addToRecentlyViewed: (property: PropertySearchResult) => void;
  updateUserPreferences: (preferences: Partial<UserSearchPreferences>) => void;
  
  // Saved Searches & Alerts
  saveSearch: (name: string, enableAlerts?: boolean) => void;
  deleteSavedSearch: (searchId: string) => void;
  loadSavedSearch: (searchId: string) => void;
  markAlertAsRead: (alertId: string) => void;
  
  // Filter Suggestions
  applyFilterSuggestion: (suggestion: FilterSuggestion) => void;
  dismissFilterSuggestion: (suggestionId: string) => void;
  
  // Map Actions
  updateMapConfig: (config: Partial<MapConfig>) => void;
  toggleClusters: () => void;
  toggleHeatmap: () => void;
  fitMapToBounds: () => void;
  
  // Performance & Optimization
  enableOptimisticUpdate: (key: string, value: any) => void;
  commitOptimisticUpdate: (key: string) => void;
  rollbackOptimisticUpdate: (key: string) => void;
  clearOptimisticUpdates: () => void;
  
  // Analytics
  trackSearchEvent: (event: Partial<SearchAnalytics>) => void;
  trackConversionEvent: (step: ConversionFunnel['step'], metadata?: Record<string, any>) => void;
  
  // Offline & Sync
  queueOfflineAction: (action: any) => void;
  syncOfflineActions: () => Promise<void>;
  
  // Advanced Features
  enableVoiceSearch: () => Promise<void>;
  processImageSearch: (image: File) => Promise<void>;
  enableLocationSearch: () => Promise<void>;
  
  // Cache Management
  invalidateCache: () => void;
  refreshData: () => Promise<void>;
}

// ====================================
// DEFAULT VALUES
// ====================================

const defaultFilters: PropertySearchFilters = {
  guests: 2,
  checkIn: new Date().toISOString().split('T')[0],
  checkOut: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  sortBy: 'relevance',
  sortOrder: 'desc',
  viewType: 'grid'
};

const defaultMapConfig: MapConfig = {
  center: { latitude: 40.7128, longitude: -74.0060 }, // NYC default
  zoom: 10,
  clustering: true,
  heatmap: false,
  streetView: true,
  drawingTools: false,
  layers: []
};

const defaultUserPreferences: UserSearchPreferences = {
  favoriteLocations: [],
  preferredPropertyTypes: [],
  budgetRange: { min: 50, max: 500, currency: 'USD' },
  essentialAmenities: [],
  blacklistAmenities: [],
  hostPreferences: {
    superhostOnly: false,
    responseTimeMax: 'within_day',
    languagePreferences: ['en']
  },
  travelPatterns: {
    purposeHistory: [],
    seasonalPreferences: [],
    groupSizeHistory: [],
    advanceBookingPattern: 'week_ahead'
  },
  accessibility: {
    requiresAccessibleProperty: false,
    specificNeeds: []
  },
  privacy: {
    saveSearchHistory: true,
    personalizedRecommendations: true,
    shareDataForImprovement: true
  }
};

// ====================================
// STORE IMPLEMENTATION
// ====================================

export const useSearchStore = create<SearchState & SearchActions>()(
  subscribeWithSelector(
    persist(
      immer((set, get) => ({
        // Initial State
        query: '',
        smartQuery: null,
        filters: defaultFilters,
        results: [],
        totalResults: 0,
        isLoading: false,
        isSearching: false,
        error: null,
        
        currentPage: 1,
        hasNextPage: false,
        isLoadingMore: false,
        searchId: null,
        cacheKey: null,
        
        viewType: 'grid',
        showFilters: false,
        showMap: false,
        selectedPropertyId: null,
        
        autocompleteResults: [],
        isAutocompleting: false,
        filterSuggestions: [],
        recentSearches: [],
        savedSearches: [],
        searchAlerts: [],
        
        userPreferences: defaultUserPreferences,
        recentlyViewed: [],
        favorites: [],
        
        mapConfig: defaultMapConfig,
        propertyClusters: [],
        showClusters: true,
        showHeatmap: false,
        
        searchAnalytics: null,
        conversionFunnel: [],
        
        optimisticUpdates: {},
        backgroundSync: true,
        offlineQueue: [],

        // Actions Implementation
        setQuery: (query) => set((state) => {
          state.query = query;
          // Clear previous results when query changes significantly
          if (query.length < 3) {
            state.results = [];
            state.totalResults = 0;
          }
        }),

        setSmartQuery: (smartQuery) => set((state) => {
          state.smartQuery = smartQuery;
          // Apply extracted filters from smart query
          if (smartQuery.suggestedFilters) {
            Object.assign(state.filters, smartQuery.suggestedFilters);
          }
        }),

        updateFilters: (newFilters) => set((state) => {
          Object.assign(state.filters, newFilters);
          // Reset pagination when filters change
          state.currentPage = 1;
          // Invalidate cache
          state.cacheKey = null;
        }),

        clearFilters: () => set((state) => {
          state.filters = { ...defaultFilters };
          state.currentPage = 1;
          state.cacheKey = null;
        }),

        resetSearch: () => set((state) => {
          state.query = '';
          state.smartQuery = null;
          state.filters = { ...defaultFilters };
          state.results = [];
          state.totalResults = 0;
          state.currentPage = 1;
          state.hasNextPage = false;
          state.error = null;
          state.searchId = null;
          state.cacheKey = null;
        }),

        executeSearch: async () => {
          set((state) => {
            state.isLoading = true;
            state.isSearching = true;
            state.error = null;
            state.currentPage = 1;
          });

          try {
            // This would call the property service
            // const response = await propertyService.searchProperties({
            //   ...get().filters,
            //   location: get().query || get().filters.location,
            //   page: 1
            // });
            
            // Mock response for now
            const mockResponse: PropertySearchResponse = {
              properties: [],
              meta: {
                total: 0,
                page: 1,
                limit: 20,
                hasNext: false,
                hasPrevious: false,
                totalPages: 1,
                searchId: 'mock-search-id',
                executionTime: 150,
                cached: false
              },
              filters: { active: get().filters, available: { propertyTypes: [], amenities: [], neighborhoods: [], priceRange: { min: 0, max: 1000, currency: 'USD' }, ratingRange: { min: 0, max: 5 }, hostTypes: [], experiences: [] }, count: 0, canClear: false },
              suggestions: [],
              recommendations: [],
              insights: { marketTrends: [], priceInsights: [], availabilityInsights: [], popularFeatures: [], bestTimeToBook: '', alternativeLocations: [] }
            };

            get().updateResults(mockResponse);
            
            // Track analytics
            get().trackSearchEvent({
              sessionId: 'session-' + Date.now(),
              searchQuery: get().query,
              filters: get().filters,
              results: {
                total: mockResponse.meta.total,
                viewed: 0,
                clicked: 0,
                favorited: 0,
                shared: 0,
                booked: 0
              },
              performance: {
                loadTime: 150,
                renderTime: 50,
                interactionTime: 0
              },
              userAgent: navigator.userAgent,
              timestamp: new Date().toISOString()
            });

          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Search failed';
            });
          } finally {
            set((state) => {
              state.isLoading = false;
              state.isSearching = false;
            });
          }
        },

        loadMoreResults: async () => {
          if (get().isLoadingMore || !get().hasNextPage) return;

          set((state) => {
            state.isLoadingMore = true;
          });

          try {
            // Load next page
            const nextPage = get().currentPage + 1;
            
            // Mock implementation
            setTimeout(() => {
              set((state) => {
                state.currentPage = nextPage;
                state.isLoadingMore = false;
                // In real implementation, append new results
              });
            }, 1000);

          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to load more results';
              state.isLoadingMore = false;
            });
          }
        },

        startAutocomplete: async (input) => {
          if (input.length < 2) {
            get().clearAutocomplete();
            return;
          }

          set((state) => {
            state.isAutocompleting = true;
          });

          try {
            // Mock autocomplete results
            const mockResults: AutocompleteResult[] = [
              {
                id: '1',
                text: `${input} Beach`,
                type: 'location',
                subtitle: 'Popular beach destination',
                relevanceScore: 0.9,
                icon: '🏖️'
              },
              {
                id: '2',
                text: `${input} City Center`,
                type: 'location',
                subtitle: 'Downtown area',
                relevanceScore: 0.8,
                icon: '🏙️'
              }
            ];

            set((state) => {
              state.autocompleteResults = mockResults;
              state.isAutocompleting = false;
            });

          } catch (error) {
            set((state) => {
              state.isAutocompleting = false;
              state.autocompleteResults = [];
            });
          }
        },

        clearAutocomplete: () => set((state) => {
          state.autocompleteResults = [];
          state.isAutocompleting = false;
        }),

        selectAutocompleteResult: (result) => set((state) => {
          state.query = result.text;
          if (result.coordinates) {
            state.filters.coordinates = result.coordinates;
          }
          state.autocompleteResults = [];
        }),

        setViewType: (viewType) => set((state) => {
          state.viewType = viewType;
        }),

        toggleFilters: () => set((state) => {
          state.showFilters = !state.showFilters;
        }),

        toggleMap: () => set((state) => {
          state.showMap = !state.showMap;
        }),

        selectProperty: (propertyId) => set((state) => {
          state.selectedPropertyId = propertyId;
        }),

        updateResults: (response) => set((state) => {
          state.results = response.properties;
          state.totalResults = response.meta.total;
          state.hasNextPage = response.meta.hasNext;
          state.searchId = response.meta.searchId;
          state.filterSuggestions = response.suggestions;
          state.error = null;
        }),

        appendResults: (newResults) => set((state) => {
          state.results.push(...newResults);
        }),

        updateProperty: (propertyId, updates) => set((state) => {
          const index = state.results.findIndex(p => p.id === propertyId);
          if (index !== -1) {
            Object.assign(state.results[index], updates);
          }
        }),

        removeProperty: (propertyId) => set((state) => {
          state.results = state.results.filter(p => p.id !== propertyId);
          state.totalResults = Math.max(0, state.totalResults - 1);
        }),

        toggleFavorite: (propertyId) => set((state) => {
          const index = state.favorites.indexOf(propertyId);
          if (index > -1) {
            state.favorites.splice(index, 1);
          } else {
            state.favorites.push(propertyId);
          }
          
          // Update property in results
          const property = state.results.find(p => p.id === propertyId);
          if (property) {
            property.isFavorite = !property.isFavorite;
          }
        }),

        addToRecentlyViewed: (property) => set((state) => {
          // Remove if already exists
          state.recentlyViewed = state.recentlyViewed.filter(p => p.id !== property.id);
          // Add to beginning
          state.recentlyViewed.unshift(property);
          // Keep only last 10
          if (state.recentlyViewed.length > 10) {
            state.recentlyViewed = state.recentlyViewed.slice(0, 10);
          }
        }),

        updateUserPreferences: (preferences) => set((state) => {
          if (state.userPreferences) {
            Object.assign(state.userPreferences, preferences);
          } else {
            state.userPreferences = { ...defaultUserPreferences, ...preferences };
          }
        }),

        saveSearch: (name, enableAlerts = false) => set((state) => {
          const savedSearch: SavedSearch = {
            id: 'search-' + Date.now(),
            name,
            filters: { ...state.filters },
            alertsEnabled: enableAlerts,
            frequency: 'daily',
            matchCount: state.totalResults,
            newMatchCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          state.savedSearches.push(savedSearch);
        }),

        deleteSavedSearch: (searchId) => set((state) => {
          state.savedSearches = state.savedSearches.filter(s => s.id !== searchId);
        }),

        loadSavedSearch: (searchId) => set((state) => {
          const savedSearch = state.savedSearches.find(s => s.id === searchId);
          if (savedSearch) {
            state.filters = { ...savedSearch.filters };
            state.currentPage = 1;
            state.cacheKey = null;
          }
        }),

        markAlertAsRead: (alertId) => set((state) => {
          const alert = state.searchAlerts.find(a => a.id === alertId);
          if (alert) {
            alert.isRead = true;
          }
        }),

        applyFilterSuggestion: (suggestion) => set((state) => {
          Object.assign(state.filters, suggestion.filters);
          // Remove applied suggestion
          state.filterSuggestions = state.filterSuggestions.filter(s => s.id !== suggestion.id);
        }),

        dismissFilterSuggestion: (suggestionId) => set((state) => {
          state.filterSuggestions = state.filterSuggestions.filter(s => s.id !== suggestionId);
        }),

        updateMapConfig: (config) => set((state) => {
          Object.assign(state.mapConfig, config);
        }),

        toggleClusters: () => set((state) => {
          state.showClusters = !state.showClusters;
        }),

        toggleHeatmap: () => set((state) => {
          state.showHeatmap = !state.showHeatmap;
        }),

        fitMapToBounds: () => {
          // Implementation would depend on map library
          console.log('Fitting map to bounds');
        },

        enableOptimisticUpdate: (key, value) => set((state) => {
          state.optimisticUpdates[key] = value;
        }),

        commitOptimisticUpdate: (key) => set((state) => {
          delete state.optimisticUpdates[key];
        }),

        rollbackOptimisticUpdate: (key) => set((state) => {
          delete state.optimisticUpdates[key];
          // Additional rollback logic would go here
        }),

        clearOptimisticUpdates: () => set((state) => {
          state.optimisticUpdates = {};
        }),

        trackSearchEvent: (event) => set((state) => {
          state.searchAnalytics = {
            sessionId: event.sessionId || 'session-' + Date.now(),
            searchQuery: event.searchQuery || state.query,
            filters: event.filters || state.filters,
            results: event.results || {
              total: 0,
              viewed: 0,
              clicked: 0,
              favorited: 0,
              shared: 0,
              booked: 0
            },
            performance: event.performance || {
              loadTime: 0,
              renderTime: 0,
              interactionTime: 0
            },
            userAgent: event.userAgent || navigator.userAgent,
            timestamp: event.timestamp || new Date().toISOString()
          };
        }),

        trackConversionEvent: (step, metadata = {}) => set((state) => {
          state.conversionFunnel.push({
            step,
            timestamp: new Date().toISOString(),
            propertyId: state.selectedPropertyId || undefined,
            metadata
          });
        }),

        queueOfflineAction: (action) => set((state) => {
          state.offlineQueue.push(action);
        }),

        syncOfflineActions: async () => {
          const actions = get().offlineQueue;
          if (actions.length === 0) return;

          try {
            // Process offline actions
            for (const action of actions) {
              // Implementation would depend on action type
              console.log('Processing offline action:', action);
            }
            
            set((state) => {
              state.offlineQueue = [];
            });
          } catch (error) {
            console.error('Failed to sync offline actions:', error);
          }
        },

        enableVoiceSearch: async () => {
          // Voice search implementation
          console.log('Voice search enabled');
        },

        processImageSearch: async (image) => {
          // Image search implementation
          console.log('Processing image search:', image.name);
        },

        enableLocationSearch: async () => {
          try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject);
            });
            
            set((state) => {
              state.filters.coordinates = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
              };
              state.mapConfig.center = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
              };
            });
          } catch (error) {
            console.error('Failed to get location:', error);
          }
        },

        invalidateCache: () => set((state) => {
          state.cacheKey = null;
        }),

        refreshData: async () => {
          get().invalidateCache();
          await get().executeSearch();
        },

        retrySearch: async () => {
          await get().executeSearch();
        }
      })),
      {
        name: 'touriquest-search-store',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          // Only persist certain parts of the state
          userPreferences: state.userPreferences,
          savedSearches: state.savedSearches,
          recentSearches: state.recentSearches,
          favorites: state.favorites,
          recentlyViewed: state.recentlyViewed,
          mapConfig: state.mapConfig
        })
      }
    )
  )
);

// ====================================
// STORE SELECTORS
// ====================================

export const useSearchQuery = () => useSearchStore((state) => state.query);
export const useSearchFilters = () => useSearchStore((state) => state.filters);
export const useSearchResults = () => useSearchStore((state) => state.results);
export const useSearchLoading = () => useSearchStore((state) => state.isLoading);
export const useSearchError = () => useSearchStore((state) => state.error);
export const useViewType = () => useSearchStore((state) => state.viewType);
export const useFilterSuggestions = () => useSearchStore((state) => state.filterSuggestions);
export const useFavorites = () => useSearchStore((state) => state.favorites);
export const useRecentlyViewed = () => useSearchStore((state) => state.recentlyViewed);
export const useSavedSearches = () => useSearchStore((state) => state.savedSearches);
export const useMapConfig = () => useSearchStore((state) => state.mapConfig);
export const useAutocomplete = () => useSearchStore((state) => ({
  results: state.autocompleteResults,
  isLoading: state.isAutocompleting
}));

// ====================================
// STORE HOOKS
// ====================================

export const useSearchActions = () => useSearchStore((state) => ({
  setQuery: state.setQuery,
  updateFilters: state.updateFilters,
  executeSearch: state.executeSearch,
  setViewType: state.setViewType,
  toggleFavorite: state.toggleFavorite,
  saveSearch: state.saveSearch,
  startAutocomplete: state.startAutocomplete,
  selectAutocompleteResult: state.selectAutocompleteResult
}));

export const useOptimisticFavorite = (propertyId: string) => {
  const { favorites, optimisticUpdates } = useSearchStore();
  const optimisticKey = `favorite-${propertyId}`;
  
  if (optimisticKey in optimisticUpdates) {
    return optimisticUpdates[optimisticKey];
  }
  
  return favorites.includes(propertyId);
};