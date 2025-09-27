import { ApiResponse, PaginatedResponse, SearchFilters, Address, Review, Media, Price } from './common';

// POI (Points of Interest) Types
export interface POI {
  id: string;
  name: string;
  description: string;
  category: POICategory;
  subcategory?: string;
  address: Address;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  rating: number;
  reviewCount: number;
  photos: Media[];
  operatingHours: OperatingHours;
  contact: {
    phone?: string;
    email?: string;
    website?: string;
    socialMedia?: {
      facebook?: string;
      instagram?: string;
      twitter?: string;
    };
  };
  pricing: POIPricing;
  features: string[];
  accessibility: string[];
  languages: string[];
  tags: string[];
  popularity: number;
  isActive: boolean;
  isFeatured: boolean;
  audioGuide?: AudioGuide;
  events: POIEvent[];
  nearbyPOIs?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface POICategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  subcategories: string[];
}

export interface OperatingHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
  holidays?: DayHours;
  specialDates?: Array<{
    date: string;
    hours: DayHours;
    note?: string;
  }>;
}

export interface DayHours {
  isOpen: boolean;
  openTime?: string;
  closeTime?: string;
  breaks?: Array<{
    start: string;
    end: string;
    reason?: string;
  }>;
  note?: string;
}

export interface POIPricing {
  type: 'free' | 'paid' | 'donation' | 'varies';
  currency?: string;
  adult?: number;
  child?: number;
  senior?: number;
  student?: number;
  family?: number;
  group?: number;
  note?: string;
  discounts?: Array<{
    type: string;
    description: string;
    amount: number | string;
  }>;
}

export interface AudioGuide {
  id: string;
  title: string;
  description: string;
  duration: number; // in minutes
  languages: string[];
  narrator: string;
  audioUrl: string;
  transcript?: string;
  waypoints?: Array<{
    id: string;
    title: string;
    description: string;
    coordinates: { latitude: number; longitude: number };
    audioUrl: string;
    duration: number;
  }>;
  price?: Price;
}

export interface POIEvent {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  isRecurring: boolean;
  recurrence?: {
    pattern: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    endDate?: string;
  };
  category: string;
  price?: Price;
  capacity?: number;
  registrationRequired: boolean;
  registrationUrl?: string;
  contact?: {
    name: string;
    email?: string;
    phone?: string;
  };
}

export interface POISearchFilters extends SearchFilters {
  categories?: string[];
  subcategories?: string[];
  features?: string[];
  priceRange?: 'free' | 'low' | 'medium' | 'high';
  isOpen?: boolean;
  hasAudioGuide?: boolean;
  hasEvents?: boolean;
  accessibility?: string[];
  languages?: string[];
}

export interface VisitRecord {
  id: string;
  poiId: string;
  userId: string;
  visitDate: string;
  duration?: number; // in minutes
  rating?: number;
  notes?: string;
  photos?: string[];
  checkedIn: boolean;
  checkedOut: boolean;
}

export interface NearbyPOI {
  poi: POI;
  distance: number;
  travelTime?: {
    walking: number;
    driving: number;
    transit: number;
  };
  relatedCategories?: string[];
}

// POI Management (Admin)
export interface CreatePOIRequest {
  name: string;
  description: string;
  category: string;
  subcategory?: string;
  address: Address;
  contact: POI['contact'];
  operatingHours: OperatingHours;
  pricing: POIPricing;
  features: string[];
  accessibility: string[];
  languages: string[];
  tags: string[];
  photos?: File[];
}

export interface UpdatePOIRequest extends Partial<CreatePOIRequest> {
  isActive?: boolean;
  isFeatured?: boolean;
}

export interface POIAnalytics {
  overview: {
    totalVisits: number;
    uniqueVisitors: number;
    averageRating: number;
    averageDuration: number;
  };
  trends: {
    visits: Array<{ date: string; count: number }>;
    ratings: Array<{ date: string; rating: number }>;
    duration: Array<{ date: string; duration: number }>;
  };
  demographics: {
    countries: Array<{ country: string; percentage: number }>;
    ageGroups: Array<{ group: string; percentage: number }>;
    interests: Array<{ interest: string; percentage: number }>;
  };
  seasonal: Array<{ month: string; visits: number; rating: number }>;
}

// Enhanced POI Experience Types
export interface EnhancedPhoto extends Media {
  category: 'exterior' | 'interior' | 'exhibits' | 'events' | 'seasonal' | 'aerial';
  photographer?: string;
  season?: 'spring' | 'summer' | 'autumn' | 'winter';
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  isUserGenerated: boolean;
  likes: number;
  isLiked: boolean;
  metadata?: {
    width: number;
    height: number;
    takenAt: string;
    cameraInfo?: string;
    location?: { lat: number; lng: number };
  };
}

export interface PhotoGalleryResponse {
  poiId: string;
  photos: EnhancedPhoto[];
  totalCount: number;
  categories: string[];
  features: {
    has360View: boolean;
    hasStreetView: boolean;
    hasDroneFootage: boolean;
    hasTimeLapse: boolean;
    supportsAROverlay: boolean;
    zoomLevels: number[];
  };
  seasonalAvailability: Record<string, number>;
}

export interface SmartHoursResponse {
  poiId: string;
  operatingHours: OperatingHours;
  isOpenNow: boolean;
  nextOpeningTime?: string;
  countdownToClose?: number;
  crowdPredictions: {
    current: {
      level: 'low' | 'medium' | 'high' | 'very-high';
      percentage: number;
      waitTime: number;
    };
    hourlyPredictions: Array<{
      hour: number;
      level: 'low' | 'medium' | 'high' | 'very-high';
      percentage: number;
      waitTime: number;
    }>;
  };
  bestVisitTimes: Array<{
    timeRange: string;
    reason: string;
  }>;
  specialHours: {
    holidaySchedule: boolean;
    weatherDependent: boolean;
    specialEvents: Array<{
      date: string;
      hours: string;
      note: string;
    }>;
  };
  accessibilityHours: {
    earlyAccess?: string;
    quietHours?: string;
  };
}

export interface EnhancedEvent extends POIEvent {
  category: string;
  availableSpots?: number;
  photos?: string[];
  videoPreview?: string;
  socialSharing?: {
    attendeesCount: number;
    friendsAttending: number;
  };
}

export interface EventsResponse {
  poiId: string;
  events: EnhancedEvent[];
  totalCount: number;
  recurringEvents: Array<{
    title: string;
    schedule: string;
    duration: string;
    languages: string[];
  }>;
  seasonalHighlights: Array<{
    season: string;
    events: string[];
  }>;
  personalizedRecommendations: Array<{
    eventId: string;
    reason: string;
    matchScore: number;
  }>;
}

export interface AudioGuideChapter {
  id: string;
  title: string;
  duration: number;
  audioUrl: string;
  gpsTriger?: {
    lat: number;
    lng: number;
    radius: number;
  };
  interactiveElements?: string[];
  visualCues?: string[];
  ambientSounds?: boolean;
  backgroundMusic?: string;
}

export interface EnhancedAudioGuide extends AudioGuide {
  narrator: string;
  quality: string;
  chapters: AudioGuideChapter[];
  interactiveFeatures: {
    gpsTriggered: boolean;
    chooseYourPath: boolean;
    quizElements: boolean;
    ambientSoundMixing: boolean;
    synchronizedVisuals: boolean;
  };
  accessibility: {
    audioDescriptions: boolean;
    transcriptAvailable: boolean;
    signLanguageVideo?: string;
    hapticFeedback: boolean;
  };
  offlineCapability: {
    downloadable: boolean;
    sizeMb: number;
    downloadUrl: string;
  };
}

export interface AudioGuideResponse {
  poiId: string;
  audioGuide: EnhancedAudioGuide;
  availableNarrators: Array<{
    name: string;
    previewUrl: string;
    premium: boolean;
  }>;
  availableLanguages: Array<{
    code: string;
    name: string;
    availability: 'full' | 'partial' | 'coming_soon';
  }>;
  premiumFeatures: {
    celebrityNarration: boolean;
    surroundSound: boolean;
    exclusiveContent: boolean;
    behindScenes: boolean;
    directorCommentary: boolean;
  };
}

export interface WeatherInfo {
  current: {
    temperature: number;
    condition: string;
    humidity: number;
    windSpeed: number;
    icon: string;
  };
  forecast: Array<{
    date: string;
    high: number;
    low: number;
    condition: string;
    icon: string;
    precipitation: number;
  }>;
  alerts?: Array<{
    type: string;
    message: string;
    severity: 'low' | 'medium' | 'high';
  }>;
}

export interface ARExperience {
  id: string;
  title: string;
  description: string;
  duration: number;
  features: string[];
  scenes: Array<{
    id: string;
    title: string;
    description: string;
    coordinates: { lat: number; lng: number };
    assets: string[];
  }>;
  compatibility: string[];
}

export interface VirtualTour {
  id: string;
  title: string;
  description: string;
  scenes: Array<{
    id: string;
    title: string;
    imageUrl: string;
    hotspots: Array<{
      x: number;
      y: number;
      type: 'info' | 'navigate' | 'media';
      content: string;
      targetScene?: string;
    }>;
  }>;
  audioNarration?: boolean;
}

export interface SocialActivity {
  id: string;
  user: {
    id: string;
    name: string;
    avatar: string;
    badges: string[];
    level: number;
  };
  type: 'check-in' | 'review' | 'photo' | 'achievement' | 'tip';
  content: string;
  media?: string[];
  timestamp: string;
  likes: number;
  comments: number;
  isLiked: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  progress: number;
  maxProgress: number;
  reward?: {
    type: 'badge' | 'discount' | 'points';
    value: string | number;
  };
}

export interface CulturalContext {
  localCustoms: string[];
  etiquette: string[];
  localLegends: string[];
  famousVisitors: string[];
  architecturalSignificance: string;
  historicalTimeline: Array<{
    year: number;
    event: string;
  }>;
}

export interface AccessibilityDetails {
  wheelchairAccess: {
    available: boolean;
    description: string;
    pathDescription: string;
    facilities: string[];
  };
  visualImpairment: {
    brailleAvailable: boolean;
    audioDescriptions: boolean;
    tactileExhibits: boolean;
    guideDogPolicy: string;
  };
  hearingImpairment: {
    signLanguageServices: boolean;
    inductionLoops: boolean;
    visualAlerts: boolean;
    captionedContent: boolean;
  };
  cognitiveAccess: {
    quietSpaces: boolean;
    sensoryFriendlyTimes: string[];
    simplifiedMaps: boolean;
    supportedLanguages: string[];
  };
}

export interface VisitPlanning {
  bestTimeToVisit: {
    seasons: Array<{
      season: string;
      pros: string[];
      cons: string[];
      crowdLevel: string;
    }>;
    timeOfDay: Array<{
      time: string;
      description: string;
      crowdLevel: string;
      lighting: string;
    }>;
  };
  estimatedDurations: {
    quick: number;
    standard: number;
    thorough: number;
    withGuide: number;
  };
  ticketingInfo: {
    advanceBooking: boolean;
    skipTheLine: boolean;
    groupDiscounts: boolean;
    seasonalPricing: boolean;
    cancelationPolicy: string;
  };
}

// Enhanced POI interface with all premium features
export interface EnhancedPOI extends POI {
  // Weather integration
  currentWeather?: WeatherInfo;
  
  // Enhanced experiences
  arExperience?: ARExperience;
  virtualTour?: VirtualTour;
  
  // Social features
  recentActivity?: SocialActivity[];
  achievements?: Achievement[];
  
  // Contextual information
  nearbyPOIsDetailed?: NearbyPOI[];
  culturalContext?: CulturalContext;
  
  // Enhanced accessibility
  accessibilityDetails?: AccessibilityDetails;
  
  // Visit planning
  visitPlanning?: VisitPlanning;
  
  // Enhanced media
  mediaGallery?: {
    photos: EnhancedPhoto[];
    videos: Array<{
      id: string;
      url: string;
      thumbnail: string;
      title: string;
      duration: number;
      category: 'tour' | 'timelapse' | 'event' | 'behind-scenes';
      quality: '720p' | '1080p' | '4K';
    }>;
    virtualTours: VirtualTour[];
  };
}

// API Response Types
export type POISearchResponse = ApiResponse<PaginatedResponse<POI>>;
export type POIDetailsResponse = ApiResponse<POI>;
export type POIReviewsResponse = ApiResponse<PaginatedResponse<Review>>;
export type POIPhotosResponse = ApiResponse<PhotoGalleryResponse>;
export type POIHoursResponse = ApiResponse<SmartHoursResponse>;
export type POIEventsResponse = ApiResponse<EventsResponse>;
export type POIAudioGuideResponse = ApiResponse<AudioGuideResponse>;
export type POICategoriesResponse = ApiResponse<POICategory[]>;
export type PopularPOIsResponse = ApiResponse<POI[]>;
export type RecommendedPOIsResponse = ApiResponse<POI[]>;
export type NearbyPOIsResponse = ApiResponse<NearbyPOI[]>;
export type VisitRecordResponse = ApiResponse<VisitRecord>;
export type CreatePOIResponse = ApiResponse<POI>;
export type UpdatePOIResponse = ApiResponse<POI>;
export type POIAnalyticsResponse = ApiResponse<POIAnalytics>;