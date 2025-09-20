# TouriQuest Frontend - Development Navigation Guide

## Overview
Your TouriQuest frontend uses a state-based navigation system instead of traditional routing. The app has 14 different "states" that represent different pages/views.

## Development Navigation Panel
I've added a **🔧 Dev Nav** button in the top-right corner that allows you to:
- Navigate to any page instantly without authentication
- See which page you're currently on
- Get descriptions of each page's purpose

To enable/disable this panel, change the `isDevelopmentMode` variable in `App.tsx` (line 80):
```tsx
const isDevelopmentMode = true; // Set to false for production
```

## All Available Pages

### 1. **Welcome Page** (`welcome`)
- **Purpose**: Landing page with app introduction
- **Features**: Hero section, get started CTA, sign in option
- **File**: `components/WelcomePage.tsx`

### 2. **Authentication** (`auth`)
- **Purpose**: Login/Signup forms
- **Features**: Toggle between login and signup, form validation
- **File**: `components/AuthFlow.tsx`
- **Note**: Currently blocks access without backend

### 3. **Dashboard** (`dashboard`)
- **Purpose**: Main search and booking interface
- **Features**: Property search, filters, AI assistant access
- **File**: `components/SearchAndBooking.tsx`
- **Navigation**: This is the default logged-in state

### 4. **Property Detail** (`property-detail`)
- **Purpose**: Detailed property view with booking options
- **Features**: Property images, amenities, booking interface
- **File**: `components/PropertyDetail.tsx`
- **Access**: Click on any property from dashboard

### 5. **POI Discovery** (`poi-discovery`)
- **Purpose**: Points of interest exploration
- **Features**: Browse attractions, activities, local spots
- **File**: `components/POIDiscovery.tsx`
- **Navigation**: "Discover" in main nav

### 6. **POI Detail** (`poi-detail`)
- **Purpose**: Detailed point of interest view
- **Features**: POI information, audio guide, AR experience options
- **File**: `components/POIDetail.tsx`
- **Access**: Click on any POI from discovery page

### 7. **Audio Guide** (`audio-guide`)
- **Purpose**: Audio tour experience for POIs
- **Features**: Audio playback, tour navigation
- **File**: `components/AudioGuide.tsx`
- **Access**: Start audio guide from POI detail page

### 8. **AR Experience** (`ar-experience`)
- **Purpose**: Augmented reality features for POIs
- **Features**: AR visualization, interactive elements
- **File**: `components/ARExperience.tsx`
- **Access**: Start AR from POI detail page

### 9. **User Profile** (`profile`)
- **Purpose**: User profile and settings management
- **Features**: Profile info, travel history, preferences
- **File**: `components/UserProfile.tsx`
- **Navigation**: "Profile" in main nav

### 10. **AI Assistant** (`ai-assistant`)
- **Purpose**: AI-powered travel assistant
- **Features**: Chat interface, travel recommendations
- **File**: `components/AIAssistant.tsx`
- **Navigation**: "AI Assistant" in main nav or floating button

### 11. **Admin Dashboard** (`admin`)
- **Purpose**: Admin panel and management tools
- **Features**: User management, content moderation, analytics
- **File**: `components/AdminDashboard.tsx`
- **Navigation**: Admin access (requires admin role)

### 12. **Experiences** (`experiences`)
- **Purpose**: Experience booking (coming soon)
- **Status**: Placeholder page with "coming soon" message
- **Features**: Will include activity booking, tours
- **Navigation**: "Experiences" in main nav

### 13. **Itinerary** (`itinerary`)
- **Purpose**: Trip planning and itinerary management (coming soon)
- **Status**: Placeholder page with "coming soon" message
- **Features**: Will include AI-optimized trip planning
- **Navigation**: "Itinerary" in main nav

### 14. **Project Status** (`status`)
- **Purpose**: Development status overview
- **Features**: Shows project progress, completed features
- **File**: `components/ProjectStatus.tsx`
- **Navigation**: Available through dev nav or direct navigation

## Navigation Methods

### 1. Development Navigation Panel (Recommended)
- Click the **🔧 Dev Nav** button in the top-right corner
- Select any page from the dropdown
- Bypasses all authentication requirements

### 2. Using Browser Console
```javascript
// You can manually change state using React DevTools or by modifying the component
// This requires React DevTools browser extension
```

### 3. URL-based Navigation
The app doesn't use URL routing, so you can't navigate via URLs. All navigation is state-based.

### 4. Natural Navigation Flow
- Start at Welcome → Auth → Dashboard
- From Dashboard: Navigate to other sections via header/footer
- Some pages have specific entry points (POI Detail requires selecting a POI)

## Components Structure

### Page Components (Full-screen views)
- `WelcomePage.tsx` - Landing page
- `AuthFlow.tsx` - Authentication
- `SearchAndBooking.tsx` - Main dashboard
- `PropertyDetail.tsx` - Property details
- `POIDiscovery.tsx` - POI exploration
- `POIDetail.tsx` - POI details
- `AudioGuide.tsx` - Audio tour
- `ARExperience.tsx` - AR features
- `UserProfile.tsx` - User profile
- `AIAssistant.tsx` - AI chat
- `AdminDashboard.tsx` - Admin panel
- `ProjectStatus.tsx` - Project status

### Layout Components
- `Layout.tsx` - Main layout wrapper
- `NavigationHeader.tsx` - Top navigation
- `Footer.tsx` - Bottom navigation

### Utility Components
- `LoadingSpinner.tsx` - Loading states
- `ErrorBoundary.tsx` - Error handling

## Tips for Development

1. **Start with Dashboard**: Most features are accessible from the dashboard state
2. **Use Dev Panel**: The development navigation panel is the fastest way to explore
3. **Check Console**: Many interactions log to console for debugging
4. **Mock Data**: Most components use mock data, perfect for UI development
5. **No Backend Required**: All pages work without authentication/backend

## Common Issues

1. **TypeScript Errors**: The project may have some TypeScript configuration issues, but the app should still run
2. **Mock Data**: Some features use placeholder data - this is expected without a backend
3. **Authentication**: The auth flow is designed for a backend, but dev navigation bypasses this

## Next Steps

1. Set up backend API endpoints
2. Implement proper routing with React Router
3. Add real authentication flow
4. Connect components to actual data sources
5. Add proper error handling and loading states

---

**Happy Development!** 🚀

Use the development navigation panel to explore all 14 pages of your TouriQuest frontend without needing authentication or a backend.