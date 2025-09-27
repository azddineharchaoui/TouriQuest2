import { createSelector } from 'reselect';
import type { RootState } from '../index';
import type { 
  Property, 
  POI, 
  Experience, 
  Booking, 
  Notification 
} from '../../types/api-types';

// Base selectors for each slice
const selectAuthState = (state: RootState) => state.auth;
const selectPropertiesState = (state: RootState) => state.properties;
const selectPOIsState = (state: RootState) => state.pois;
const selectExperiencesState = (state: RootState) => state.experiences;
const selectBookingsState = (state: RootState) => state.bookings;
const selectNotificationsState = (state: RootState) => state.notifications;

// Auth selectors
export const selectCurrentUser = createSelector(
  [selectAuthState],
  (auth) => auth.user
);

export const selectIsAuthenticated = createSelector(
  [selectAuthState],
  (auth) => !!auth.tokens?.accessToken && !auth.tokenExpired
);

export const selectUserPreferences = createSelector(
  [selectAuthState],
  (auth) => auth.user?.preferences || {}
);

export const selectAuthLoading = createSelector(
  [selectAuthState],
  (auth) => auth.loginLoading || auth.registerLoading || auth.refreshLoading
);

// Property selectors
export const selectFilteredProperties = createSelector(
  [selectPropertiesState, (state: RootState, filters: any) => filters],
  (properties, filters) => {
    let filtered = properties.searchResults;

    if (filters.priceRange) {
      const [min, max] = filters.priceRange;
      filtered = filtered.filter(property => 
        property.price >= min && property.price <= max
      );
    }

    if (filters.propertyType) {
      filtered = filtered.filter(property => 
        property.type === filters.propertyType
      );
    }

    if (filters.amenities && filters.amenities.length > 0) {
      filtered = filtered.filter(property =>
        filters.amenities.every((amenity: string) => 
          property.amenities?.includes(amenity)
        )
      );
    }

    if (filters.rating) {
      filtered = filtered.filter(property => 
        property.rating >= filters.rating
      );
    }

    return filtered;
  }
);

export const selectSortedProperties = createSelector(
  [selectFilteredProperties, (state: RootState, sortBy: string) => sortBy],
  (properties, sortBy) => {
    const sorted = [...properties];

    switch (sortBy) {
      case 'price_asc':
        return sorted.sort((a, b) => a.price - b.price);
      case 'price_desc':
        return sorted.sort((a, b) => b.price - a.price);
      case 'rating':
        return sorted.sort((a, b) => b.rating - a.rating);
      case 'distance':
        return sorted.sort((a, b) => (a.distance || 0) - (b.distance || 0));
      default:
        return sorted;
    }
  }
);

export const selectFavoriteProperties = createSelector(
  [selectPropertiesState],
  (properties) => {
    return properties.favorites.map(id => properties.properties[id]).filter(Boolean);
  }
);

export const selectPropertyAvailabilityByDateRange = createSelector(
  [
    selectPropertiesState,
    (state: RootState, propertyId: string) => propertyId,
    (state: RootState, propertyId: string, startDate: string) => startDate,
    (state: RootState, propertyId: string, startDate: string, endDate: string) => endDate,
  ],
  (properties, propertyId, startDate, endDate) => {
    const availability = properties.availability[propertyId] || [];
    return availability.filter(slot => 
      slot.date >= startDate && slot.date <= endDate
    );
  }
);

// POI selectors
export const selectPOIsByCategory = createSelector(
  [selectPOIsState, (state: RootState, categoryId: string) => categoryId],
  (pois, categoryId) => {
    return pois.searchResults.filter(poi => poi.categoryId === categoryId);
  }
);

export const selectNearbyPOIs = createSelector(
  [
    selectPOIsState,
    (state: RootState, centerPOI: string) => centerPOI,
    (state: RootState, centerPOI: string, radius: number) => radius,
  ],
  (pois, centerPOI, radius) => {
    const nearbyPOIs = pois.nearbyPOIs[centerPOI] || [];
    return nearbyPOIs.filter(poi => (poi.distance || 0) <= radius);
  }
);

export const selectFavoritePOIs = createSelector(
  [selectPOIsState],
  (pois) => {
    return pois.favorites.map(id => pois.pois[id]).filter(Boolean);
  }
);

export const selectVisitedPOIs = createSelector(
  [selectPOIsState],
  (pois) => {
    return pois.visited.map(id => pois.pois[id]).filter(Boolean);
  }
);

export const selectPOIRecommendations = createSelector(
  [selectPOIsState, selectCurrentUser],
  (pois, user) => {
    // Basic recommendation logic based on user preferences and visited POIs
    const userInterests = user?.preferences?.interests || [];
    const visitedCategories = pois.visited
      .map(id => pois.pois[id]?.categoryId)
      .filter(Boolean);

    return pois.searchResults
      .filter(poi => 
        userInterests.includes(poi.categoryId) ||
        visitedCategories.includes(poi.categoryId)
      )
      .filter(poi => !pois.visited.includes(poi.id))
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 10);
  }
);

// Experience selectors
export const selectFilteredExperiences = createSelector(
  [selectExperiencesState, (state: RootState, filters: any) => filters],
  (experiences, filters) => {
    let filtered = experiences.searchResults;

    if (filters.category) {
      filtered = filtered.filter(exp => exp.categoryId === filters.category);
    }

    if (filters.priceRange) {
      const [min, max] = filters.priceRange;
      filtered = filtered.filter(exp => 
        exp.price >= min && exp.price <= max
      );
    }

    if (filters.duration) {
      filtered = filtered.filter(exp => exp.duration <= filters.duration);
    }

    if (filters.rating) {
      filtered = filtered.filter(exp => exp.rating >= filters.rating);
    }

    if (filters.date) {
      // Filter by availability on specific date
      filtered = filtered.filter(exp => {
        const availability = experiences.availability[exp.id] || [];
        return availability.some(slot => 
          slot.date === filters.date && slot.available
        );
      });
    }

    return filtered;
  }
);

export const selectSortedExperiences = createSelector(
  [selectFilteredExperiences, (state: RootState, sortBy: string) => sortBy],
  (experiences, sortBy) => {
    const sorted = [...experiences];

    switch (sortBy) {
      case 'price':
        return sorted.sort((a, b) => a.price - b.price);
      case 'rating':
        return sorted.sort((a, b) => b.rating - a.rating);
      case 'duration':
        return sorted.sort((a, b) => a.duration - b.duration);
      case 'popularity':
        return sorted.sort((a, b) => (b.bookingCount || 0) - (a.bookingCount || 0));
      default:
        return sorted;
    }
  }
);

export const selectWishlistExperiences = createSelector(
  [selectExperiencesState],
  (experiences) => {
    return experiences.wishlist
      .map(id => experiences.experiences[id])
      .filter(Boolean);
  }
);

export const selectRecentlyViewedExperiences = createSelector(
  [selectExperiencesState],
  (experiences) => {
    return experiences.recentlyViewed
      .map(id => experiences.experiences[id])
      .filter(Boolean)
      .slice(0, 5); // Last 5 viewed
  }
);

export const selectExperiencesByPriceRange = createSelector(
  [selectExperiencesState, (state: RootState, min: number, max: number) => ({ min, max })],
  (experiences, { min, max }) => {
    return experiences.searchResults.filter(exp => 
      exp.price >= min && exp.price <= max
    );
  }
);

// Booking selectors
export const selectFilteredBookings = createSelector(
  [selectBookingsState],
  (bookings) => {
    const { statusFilter, dateFilter } = bookings;
    let filtered = bookings.bookingsList.map(id => bookings.bookings[id]).filter(Boolean);

    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status === statusFilter);
    }

    if (dateFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(booking => {
        const bookingDate = new Date(booking.date);
        if (dateFilter === 'upcoming') {
          return bookingDate >= now;
        } else if (dateFilter === 'past') {
          return bookingDate < now;
        }
        return true;
      });
    }

    return filtered;
  }
);

export const selectSortedBookings = createSelector(
  [selectFilteredBookings, selectBookingsState],
  (bookings, bookingState) => {
    const { sortBy, sortOrder } = bookingState;
    const sorted = [...bookings];

    sorted.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'price':
          comparison = a.totalPrice - b.totalPrice;
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        default:
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return sorted;
  }
);

export const selectUpcomingBookings = createSelector(
  [selectBookingsState],
  (bookings) => {
    const now = new Date();
    return bookings.bookingsList
      .map(id => bookings.bookings[id])
      .filter(booking => 
        booking && 
        new Date(booking.date) >= now &&
        ['confirmed', 'pending'].includes(booking.status)
      )
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5); // Next 5 bookings
  }
);

export const selectBookingStats = createSelector(
  [selectBookingsState],
  (bookings) => {
    const allBookings = bookings.bookingsList.map(id => bookings.bookings[id]).filter(Boolean);
    
    return {
      total: allBookings.length,
      confirmed: allBookings.filter(b => b.status === 'confirmed').length,
      pending: allBookings.filter(b => b.status === 'pending').length,
      cancelled: allBookings.filter(b => b.status === 'cancelled').length,
      completed: allBookings.filter(b => b.status === 'completed').length,
      totalSpent: allBookings
        .filter(b => ['confirmed', 'completed'].includes(b.status))
        .reduce((sum, b) => sum + b.totalPrice, 0),
    };
  }
);

// Notification selectors
export const selectFilteredNotifications = createSelector(
  [selectNotificationsState],
  (notifications) => {
    const { typeFilter, readFilter } = notifications;
    let filtered = notifications.notificationsList
      .map(id => notifications.notifications[id])
      .filter(Boolean);

    if (typeFilter !== 'all') {
      filtered = filtered.filter(notif => notif.type === typeFilter);
    }

    if (readFilter !== 'all') {
      filtered = filtered.filter(notif => {
        const isRead = !!notif.readAt;
        return readFilter === 'read' ? isRead : !isRead;
      });
    }

    return filtered;
  }
);

export const selectRecentNotifications = createSelector(
  [selectNotificationsState],
  (notifications) => {
    return notifications.notificationsList
      .map(id => notifications.notifications[id])
      .filter(Boolean)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10); // Last 10 notifications
  }
);

export const selectHighPriorityNotifications = createSelector(
  [selectNotificationsState],
  (notifications) => {
    return notifications.notificationsList
      .map(id => notifications.notifications[id])
      .filter(notif => notif && notif.priority === 'high' && !notif.readAt);
  }
);

export const selectNotificationsByType = createSelector(
  [selectNotificationsState, (state: RootState, type: string) => type],
  (notifications, type) => {
    return notifications.notificationsList
      .map(id => notifications.notifications[id])
      .filter(notif => notif && notif.type === type);
  }
);

// Cross-slice selectors
export const selectUserActivitySummary = createSelector(
  [selectBookingsState, selectPropertiesState, selectPOIsState, selectExperiencesState],
  (bookings, properties, pois, experiences) => {
    return {
      totalBookings: bookings.bookingsList.length,
      favoriteProperties: properties.favorites.length,
      favoritePOIs: pois.favorites.length,
      visitedPOIs: pois.visited.length,
      wishlistExperiences: experiences.wishlist.length,
      recentlyViewed: experiences.recentlyViewed.length,
    };
  }
);

export const selectUserFavorites = createSelector(
  [selectPropertiesState, selectPOIsState, selectExperiencesState],
  (properties, pois, experiences) => {
    return {
      properties: properties.favorites.map(id => properties.properties[id]).filter(Boolean),
      pois: pois.favorites.map(id => pois.pois[id]).filter(Boolean),
      experiences: experiences.wishlist.map(id => experiences.experiences[id]).filter(Boolean),
    };
  }
);

export const selectSearchResults = createSelector(
  [selectPropertiesState, selectPOIsState, selectExperiencesState],
  (properties, pois, experiences) => {
    return {
      properties: properties.searchResults,
      pois: pois.searchResults,
      experiences: experiences.searchResults,
      loading: properties.searchLoading || pois.searchLoading || experiences.searchLoading,
    };
  }
);

export const selectLoadingStates = createSelector(
  [selectAuthState, selectPropertiesState, selectPOIsState, selectExperiencesState, selectBookingsState, selectNotificationsState],
  (auth, properties, pois, experiences, bookings, notifications) => {
    return {
      auth: auth.loginLoading || auth.registerLoading || auth.refreshLoading,
      properties: properties.searchLoading || properties.popularLoading,
      pois: pois.searchLoading || pois.popularLoading || pois.categoriesLoading,
      experiences: experiences.searchLoading || experiences.popularLoading || experiences.featuredLoading,
      bookings: bookings.bookingsLoading || bookings.createBookingLoading,
      notifications: notifications.notificationsLoading || notifications.settingsLoading,
    };
  }
);

// Performance memoized selectors for expensive computations
export const selectRecommendations = createSelector(
  [selectPropertiesState, selectPOIsState, selectExperiencesState, selectCurrentUser],
  (properties, pois, experiences, user) => {
    // Complex recommendation algorithm
    const userPreferences = user?.preferences || {};
    const visitedPOIs = pois.visited;
    const favoriteProperties = properties.favorites;
    const wishlistExperiences = experiences.wishlist;

    // This would typically involve ML algorithms, but simplified here
    return {
      properties: properties.recommended.slice(0, 5),
      pois: pois.recommended.slice(0, 5),
      experiences: experiences.featured.slice(0, 5),
    };
  }
);

export const selectDashboardData = createSelector(
  [
    selectUpcomingBookings,
    selectRecentNotifications,
    selectUserActivitySummary,
    selectUserFavorites,
    selectRecommendations,
  ],
  (upcomingBookings, recentNotifications, activitySummary, favorites, recommendations) => {
    return {
      upcomingBookings,
      recentNotifications: recentNotifications.slice(0, 5),
      activitySummary,
      favorites,
      recommendations,
    };
  }
);

export default {
  // Auth
  selectCurrentUser,
  selectIsAuthenticated,
  selectUserPreferences,
  selectAuthLoading,
  
  // Properties
  selectFilteredProperties,
  selectSortedProperties,
  selectFavoriteProperties,
  selectPropertyAvailabilityByDateRange,
  
  // POIs
  selectPOIsByCategory,
  selectNearbyPOIs,
  selectFavoritePOIs,
  selectVisitedPOIs,
  selectPOIRecommendations,
  
  // Experiences
  selectFilteredExperiences,
  selectSortedExperiences,
  selectWishlistExperiences,
  selectRecentlyViewedExperiences,
  selectExperiencesByPriceRange,
  
  // Bookings
  selectFilteredBookings,
  selectSortedBookings,
  selectUpcomingBookings,
  selectBookingStats,
  
  // Notifications
  selectFilteredNotifications,
  selectRecentNotifications,
  selectHighPriorityNotifications,
  selectNotificationsByType,
  
  // Cross-slice
  selectUserActivitySummary,
  selectUserFavorites,
  selectSearchResults,
  selectLoadingStates,
  selectRecommendations,
  selectDashboardData,
};