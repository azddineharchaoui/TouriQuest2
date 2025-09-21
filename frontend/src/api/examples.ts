/**
 * TouriQuest API Client Usage Examples
 * 
 * This file demonstrates how to use the comprehensive API client
 * with all services and features.
 */

import api, { TouriQuestAPI } from './index';

// ============================================================================
// BASIC USAGE - Using the default instance
// ============================================================================

/**
 * Authentication Examples
 */
export const authenticationExamples = {
  // Login with email and password
  async login() {
    try {
      const response = await api.auth.login({
        email: 'user@example.com',
        password: 'securePassword123',
        rememberMe: true
      });
      
      if (response.success) {
        console.log('User logged in:', response.data.user);
        console.log('Access token:', response.data.tokens.accessToken);
        
        // Tokens are automatically stored and used for subsequent requests
      }
    } catch (error) {
      console.error('Login failed:', error);
    }
  },

  // Register new user
  async register() {
    try {
      const response = await api.auth.register({
        email: 'newuser@example.com',
        password: 'securePassword123',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        termsAccepted: true
      });
      
      if (response.success) {
        console.log('User registered:', response.data);
      }
    } catch (error) {
      console.error('Registration failed:', error);
    }
  },

  // OAuth login
  async googleLogin() {
    try {
      const response = await api.auth.oauthLogin('google', {
        provider: 'google',
        accessToken: 'google_access_token',
        idToken: 'google_id_token'
      });
      
      if (response.success) {
        console.log('Google login successful:', response.data);
      }
    } catch (error) {
      console.error('Google login failed:', error);
    }
  },

  // Logout
  async logout() {
    try {
      await api.auth.logout();
      console.log('User logged out successfully');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }
};

/**
 * Property Search and Booking Examples
 */
export const propertyExamples = {
  // Search properties
  async searchProperties() {
    try {
      const response = await api.properties.searchProperties({
        location: 'Marrakech, Morocco',
        checkIn: '2024-06-01',
        checkOut: '2024-06-07',
        guests: 2,
        priceMin: 50,
        priceMax: 200,
        rating: 4,
        sortBy: 'price',
        sortOrder: 'asc'
      });
      
      if (response.success) {
        console.log('Found properties:', response.data.items);
        console.log('Total results:', response.data.total);
      }
    } catch (error) {
      console.error('Property search failed:', error);
    }
  },

  // Get property details
  async getPropertyDetails() {
    try {
      const response = await api.properties.getProperty('property_id_123');
      
      if (response.success) {
        console.log('Property details:', response.data);
      }
    } catch (error) {
      console.error('Failed to get property details:', error);
    }
  },

  // Book property
  async bookProperty() {
    try {
      const response = await api.properties.bookProperty('property_id_123', {
        propertyId: 'property_id_123',
        checkIn: '2024-06-01',
        checkOut: '2024-06-07',
        guests: {
          adults: 2,
          children: 0,
          infants: 0
        },
        rooms: 1,
        guestInfo: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '+1234567890'
        },
        paymentMethod: 'card',
        specialRequests: 'Late check-in please'
      });
      
      if (response.success) {
        console.log('Booking confirmed:', response.data);
      }
    } catch (error) {
      console.error('Booking failed:', error);
    }
  },

  // Add property review
  async addReview() {
    try {
      const response = await api.properties.addReview('property_id_123', {
        rating: 5,
        title: 'Amazing stay!',
        comment: 'The property was exactly as described. Great location and amenities.',
        pros: ['Great location', 'Clean rooms', 'Friendly staff'],
        cons: ['WiFi could be faster']
      });
      
      if (response.success) {
        console.log('Review added successfully:', response.data);
      }
    } catch (error) {
      console.error('Failed to add review:', error);
    }
  },

  // Add to favorites
  async addToFavorites() {
    try {
      await api.properties.addToFavorites('property_id_123');
      console.log('Property added to favorites');
    } catch (error) {
      console.error('Failed to add to favorites:', error);
    }
  }
};

/**
 * POI (Points of Interest) Examples
 */
export const poiExamples = {
  // Search POIs
  async searchPOIs() {
    try {
      const response = await api.pois.searchPOIs({
        location: 'Marrakech',
        categories: ['historical', 'cultural'],
        rating: 4,
        hasAudioGuide: true,
        isOpen: true
      });
      
      if (response.success) {
        console.log('Found POIs:', response.data.items);
      }
    } catch (error) {
      console.error('POI search failed:', error);
    }
  },

  // Get POI details with audio guide
  async getPOIWithAudio() {
    try {
      const [details, audioGuide] = await Promise.all([
        api.pois.getPOI('poi_id_123'),
        api.pois.getAudioGuide('poi_id_123', 'en')
      ]);
      
      if (details.success && audioGuide.success) {
        console.log('POI details:', details.data);
        console.log('Audio guide:', audioGuide.data);
      }
    } catch (error) {
      console.error('Failed to get POI data:', error);
    }
  },

  // Track POI visit
  async trackVisit() {
    try {
      const response = await api.pois.trackVisit('poi_id_123', {
        visitDate: new Date().toISOString().split('T')[0],
        duration: 60, // minutes
        checkedIn: true
      });
      
      if (response.success) {
        console.log('Visit tracked:', response.data);
      }
    } catch (error) {
      console.error('Failed to track visit:', error);
    }
  },

  // Get nearby POIs
  async getNearbyPOIs() {
    try {
      const response = await api.pois.getNearbyPOIs(
        31.6295, // latitude
        -7.9811, // longitude (Marrakech coordinates)
        10, // radius in km
        20, // limit
        'historical' // category filter
      );
      
      if (response.success) {
        console.log('Nearby POIs:', response.data.items);
      }
    } catch (error) {
      console.error('Failed to get nearby POIs:', error);
    }
  }
};

/**
 * Experience Booking Examples
 */
export const experienceExamples = {
  // Search experiences
  async searchExperiences() {
    try {
      const response = await api.experiences.searchExperiences({
        location: 'Marrakech',
        categories: ['cultural', 'adventure'],
        date: '2024-06-15',
        duration: { min: 2, max: 8, unit: 'hours' },
        difficulty: ['easy', 'moderate'],
        groupSize: 4
      });
      
      if (response.success) {
        console.log('Found experiences:', response.data.items);
      }
    } catch (error) {
      console.error('Experience search failed:', error);
    }
  },

  // Book experience
  async bookExperience() {
    try {
      const response = await api.experiences.bookExperience('experience_id_123', {
        experienceId: 'experience_id_123',
        date: '2024-06-15',
        timeSlot: '09:00',
        participants: {
          adults: 2,
          children: 0,
          seniors: 0
        },
        participantDetails: [
          {
            name: 'John Doe',
            age: 30,
            email: 'john@example.com'
          },
          {
            name: 'Jane Doe',
            age: 28,
            email: 'jane@example.com'
          }
        ],
        emergencyContact: {
          name: 'Emergency Contact',
          phone: '+1234567890',
          relationship: 'Friend'
        },
        paymentMethod: 'card',
        specialRequests: 'Vegetarian meals please'
      });
      
      if (response.success) {
        console.log('Experience booked:', response.data);
      }
    } catch (error) {
      console.error('Experience booking failed:', error);
    }
  },

  // Get experience weather
  async getExperienceWeather() {
    try {
      const response = await api.experiences.getWeather('experience_id_123', '2024-06-15');
      
      if (response.success) {
        console.log('Weather forecast:', response.data);
      }
    } catch (error) {
      console.error('Failed to get weather:', error);
    }
  }
};

// ============================================================================
// ADVANCED USAGE - Custom API instance
// ============================================================================

/**
 * Create custom API instance with different configuration
 */
export const createCustomAPIInstance = () => {
  const customAPI = new TouriQuestAPI({
    baseURL: 'https://api.touriquest.com/v2', // Different API version
    timeout: 60000, // 60 seconds timeout
    enableLogging: true // Enable request/response logging
  });

  return customAPI;
};

/**
 * Error handling patterns
 */
export const errorHandlingExamples = {
  // Handle specific API errors
  async handleAPIErrors() {
    try {
      const response = await api.auth.login({
        email: 'invalid@example.com',
        password: 'wrongpassword'
      });
    } catch (error: any) {
      if (error.name === 'ValidationError') {
        console.error('Validation failed:', error.details);
      } else if (error.name === 'AuthenticationError') {
        console.error('Authentication failed:', error.message);
      } else if (error.name === 'NetworkError') {
        console.error('Network issue:', error.message);
      } else {
        console.error('Unexpected error:', error);
      }
    }
  },

  // Handle rate limiting
  async handleRateLimit() {
    try {
      // This might fail due to rate limiting
      const response = await api.properties.searchProperties({});
    } catch (error: any) {
      if (error.name === 'RateLimitError') {
        console.log(`Rate limited. Retry after: ${error.retryAfter} seconds`);
        
        // Wait and retry
        setTimeout(async () => {
          const retryResponse = await api.properties.searchProperties({});
          console.log('Retry successful:', retryResponse);
        }, error.retryAfter * 1000);
      }
    }
  }
};

/**
 * Batch operations and optimization
 */
export const optimizationExamples = {
  // Batch multiple requests
  async batchRequests() {
    try {
      const [properties, pois, experiences] = await Promise.all([
        api.properties.searchProperties({ location: 'Marrakech' }),
        api.pois.searchPOIs({ location: 'Marrakech' }),
        api.experiences.searchExperiences({ location: 'Marrakech' })
      ]);

      console.log('Batch results:', {
        properties: properties.data,
        pois: pois.data,
        experiences: experiences.data
      });
    } catch (error) {
      console.error('Batch request failed:', error);
    }
  },

  // Cache management
  async cacheManagement() {
    // Make a request (will be cached)
    const response1 = await api.properties.getProperty('property_id_123');
    
    // Same request (will return cached result)
    const response2 = await api.properties.getProperty('property_id_123');
    
    console.log('First request:', response1);
    console.log('Cached request:', response2);
    
    // Clear all cache
    api.clearAllCache();
    
    // This will make a fresh request
    const response3 = await api.properties.getProperty('property_id_123');
    console.log('Fresh request after cache clear:', response3);
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check authentication status
 */
export const checkAuthStatus = () => {
  const isAuthenticated = api.isAuthenticated();
  const currentUser = api.getCurrentUser();
  
  console.log('Authentication status:', {
    isAuthenticated,
    currentUser
  });
  
  return { isAuthenticated, currentUser };
};

/**
 * Initialize app with authentication check
 */
export const initializeApp = async () => {
  const { isAuthenticated, currentUser } = checkAuthStatus();
  
  if (isAuthenticated && currentUser) {
    console.log('User is already logged in:', currentUser);
    
    // Load user-specific data
    try {
      const [favorites, profile] = await Promise.all([
        api.properties.getFavorites(),
        api.auth.getProfile()
      ]);
      
      console.log('User data loaded:', {
        favorites: favorites.data,
        profile: profile.data
      });
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  } else {
    console.log('User not authenticated, showing login flow');
  }
};

/**
 * Cleanup on app unmount
 */
export const cleanup = () => {
  // Clear any sensitive data
  api.clearAuthTokens();
  
  // Clear cache if needed
  // api.clearAllCache();
  
  console.log('App cleanup completed');
};

// Export everything for easy importing
export default {
  authenticationExamples,
  propertyExamples,
  poiExamples,
  experienceExamples,
  errorHandlingExamples,
  optimizationExamples,
  checkAuthStatus,
  initializeApp,
  cleanup,
  createCustomAPIInstance
};