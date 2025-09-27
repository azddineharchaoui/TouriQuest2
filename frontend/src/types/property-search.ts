/**
 * Advanced Property Search Platform Types
 * World-class TypeScript definitions for property search rivaling Airbnb and Booking.com
 */

// ====================================
// CORE GEOGRAPHIC & LOCATION TYPES
// ====================================

export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  formattedAddress: string;
  countryCode: string;
  stateCode: string;
  displayName?: string;
  placeId?: string;
}

export interface BoundingBox {
  northEast: Coordinates;
  southWest: Coordinates;
}

// ====================================
// ADVANCED PRICE & CURRENCY TYPES
// ====================================

export interface Price {
  amount: number;
  currency: string;
  formatted: string;
  originalCurrency?: string;
  originalAmount?: number;
  exchangeRate?: number;
  lastUpdated?: string;
}

export interface PriceBreakdown {
  basePrice: number;
  cleaningFee: number;
  serviceFee: number;
  taxes: number;
  totalFees: number;
  discounts: number;
  totalPrice: number;
  currency: string;
  pricePerNight?: number;
  weeklyDiscount?: number;
  monthlyDiscount?: number;
}

export interface DynamicPricing {
  date: string;
  basePrice: number;
  finalPrice: number;
  demandMultiplier: number;
  seasonalAdjustment: number;
  eventPremium?: number;
  isWeekend: boolean;
  isHoliday: boolean;
  availability: 'available' | 'booked' | 'blocked';
}

// ====================================
// INTELLIGENT SEARCH INTERFACES
// ====================================

export interface SmartSearchQuery {
  query: string;
  type: 'text' | 'voice' | 'natural_language' | 'image';
  confidence?: number;
  extractedEntities?: SearchEntity[];
  suggestedFilters?: Partial<PropertySearchFilters>;
  intent?: SearchIntent;
}

export interface SearchEntity {
  type: 'location' | 'date' | 'guests' | 'amenity' | 'property_type' | 'price_range' | 'experience';
  value: string;
  confidence: number;
  startPosition: number;
  endPosition: number;
  normalized?: string;
}

export interface SearchIntent {
  primary: 'find_property' | 'compare_prices' | 'check_availability' | 'get_recommendations';
  secondary?: string[];
  travelPurpose?: 'business' | 'leisure' | 'family' | 'romantic' | 'group' | 'solo' | 'adventure';
  urgency?: 'low' | 'medium' | 'high';
}

export interface VoiceSearchResult {
  transcript: string;
  confidence: number;
  alternatives?: Array<{
    transcript: string;
    confidence: number;
  }>;
  language: string;
  processingTime: number;
}

export interface ImageSearchParams {
  imageUrl?: string;
  imageFile?: File;
  features: Array<'property_type' | 'style' | 'amenities' | 'location_type' | 'ambiance'>;
  similarityThreshold?: number;
}

export interface AutocompleteResult {
  id: string;
  text: string;
  type: 'location' | 'property' | 'landmark' | 'neighborhood';
  subtitle?: string;
  coordinates?: Coordinates;
  placeId?: string;
  relevanceScore: number;
  icon?: string;
  category?: string;
}

// ====================================
// ADVANCED FILTERING SYSTEM
// ====================================

export interface PropertySearchFilters {
  // Location & Geography
  location?: string;
  coordinates?: Coordinates;
  radius?: number;
  neighborhoods?: string[];
  landmarks?: string[];
  boundingBox?: BoundingBox;
  
  // Dates & Occupancy
  checkIn?: string;
  checkOut?: string;
  guests: number;
  adults?: number;
  children?: number;
  infants?: number;
  pets?: number;
  
  // Property Characteristics
  propertyTypes?: PropertyTypeFilter[];
  minBedrooms?: number;
  maxBedrooms?: number;
  minBathrooms?: number;
  maxBathrooms?: number;
  minBeds?: number;
  maxBeds?: number;
  
  // Pricing
  minPrice?: number;
  maxPrice?: number;
  currency?: string;
  priceType?: 'per_night' | 'total_stay';
  includesFees?: boolean;
  
  // Amenities & Features
  amenities?: string[];
  essentialAmenities?: string[];
  luxuryAmenities?: string[];
  accessibilityFeatures?: string[];
  workspaceFeatures?: string[];
  familyFeatures?: string[];
  petFeatures?: string[];
  
  // Host Preferences
  instantBook?: boolean;
  superhost?: boolean;
  responseRate?: number;
  responseTime?: 'within_hour' | 'within_day' | 'few_days';
  hostLanguages?: string[];
  verifiedHosts?: boolean;
  
  // Experience & Purpose
  travelPurpose?: TravelPurpose[];
  experienceType?: ExperienceType[];
  atmosphereType?: AtmosphereType[];
  
  // Quality & Rating
  minRating?: number;
  minReviews?: number;
  recentlyReviewed?: boolean;
  topRated?: boolean;
  
  // Booking & Policies
  freeCancellation?: boolean;
  cancellationFlexibility?: CancellationFlexibility[];
  bookingAdvance?: 'same_day' | 'next_day' | 'week_ahead' | 'month_ahead';
  
  // Special Requirements
  smokingAllowed?: boolean;
  eventsAllowed?: boolean;
  longTermStay?: boolean;
  minStayNights?: number;
  maxStayNights?: number;
  
  // Sorting & Display
  sortBy?: SortOption;
  sortOrder?: 'asc' | 'desc';
  viewType?: 'grid' | 'list' | 'map' | 'calendar';
  
  // Advanced Options
  excludeProperties?: string[];
  favoriteOnly?: boolean;
  newListings?: boolean;
  promotedListings?: boolean;
  verifiedPhotos?: boolean;
  virtualTourAvailable?: boolean;
}

export type PropertyTypeFilter = 
  | 'entire_place' 
  | 'private_room' 
  | 'shared_room' 
  | 'unique_stay'
  | 'hotel'
  | 'apartment'
  | 'house'
  | 'villa'
  | 'cabin'
  | 'cottage'
  | 'loft'
  | 'studio'
  | 'penthouse'
  | 'resort'
  | 'boutique'
  | 'hostel'
  | 'guesthouse'
  | 'mansion'
  | 'castle'
  | 'treehouse'
  | 'boat'
  | 'rv'
  | 'tent'
  | 'dome'
  | 'cave'
  | 'lighthouse'
  | 'windmill'
  | 'train'
  | 'plane';

export type TravelPurpose = 
  | 'business'
  | 'leisure'
  | 'romantic'
  | 'family'
  | 'group'
  | 'solo'
  | 'adventure'
  | 'relaxation'
  | 'cultural'
  | 'food_wine'
  | 'wellness'
  | 'sports'
  | 'education'
  | 'events'
  | 'digital_nomad';

export type ExperienceType = 
  | 'luxury'
  | 'budget'
  | 'authentic'
  | 'unique'
  | 'eco_friendly'
  | 'modern'
  | 'historic'
  | 'artistic'
  | 'minimalist'
  | 'cozy'
  | 'spacious'
  | 'secluded'
  | 'central'
  | 'beachfront'
  | 'mountain'
  | 'urban'
  | 'rural';

export type AtmosphereType = 
  | 'lively'
  | 'peaceful'
  | 'romantic'
  | 'family_friendly'
  | 'party_friendly'
  | 'quiet'
  | 'vibrant'
  | 'serene'
  | 'energetic'
  | 'intimate'
  | 'social'
  | 'private';

export type CancellationFlexibility = 
  | 'flexible'
  | 'moderate'
  | 'strict'
  | 'super_strict_30'
  | 'super_strict_60'
  | 'long_term'
  | 'non_refundable';

export type SortOption = 
  | 'relevance'
  | 'price_low_to_high'
  | 'price_high_to_low'
  | 'rating'
  | 'reviews'
  | 'distance'
  | 'newest'
  | 'popularity'
  | 'recommended'
  | 'availability'
  | 'instant_book'
  | 'host_rating'
  | 'unique_properties';

export type ViewType = 
  | 'grid' 
  | 'list' 
  | 'map' 
  | 'calendar';

// ====================================
// SMART FILTER SUGGESTIONS
// ====================================

export interface FilterSuggestion {
  id: string;
  type: 'ml_recommendation' | 'seasonal' | 'budget_optimization' | 'alternative_dates' | 'trending';
  title: string;
  description: string;
  filters: Partial<PropertySearchFilters>;
  confidence: number;
  potentialSavings?: number;
  additionalProperties?: number;
  icon?: string;
  badge?: string;
  isPremium?: boolean;
  validUntil?: string;
}

export interface SeasonalSuggestion extends FilterSuggestion {
  season: 'spring' | 'summer' | 'fall' | 'winter';
  seasonalTrend: 'increasing' | 'peak' | 'decreasing';
  historicalData?: Array<{
    month: string;
    averagePrice: number;
    occupancyRate: number;
  }>;
}

export interface BudgetOptimization extends FilterSuggestion {
  originalBudget: number;
  optimizedBudget: number;
  savingsPercentage: number;
  tradeOffs: Array<{
    feature: string;
    impact: 'low' | 'medium' | 'high';
    description: string;
  }>;
}

export interface AlternativeDates extends FilterSuggestion {
  originalDates: {
    checkIn: string;
    checkOut: string;
  };
  suggestedDates: Array<{
    checkIn: string;
    checkOut: string;
    savings: number;
    savingsPercentage: number;
    reason: string;
  }>;
}

// ====================================
// PROPERTY CARDS & RESULTS
// ====================================

export interface PropertySearchResult {
  id: string;
  title: string;
  description: string;
  type: PropertyTypeFilter;
  status: PropertyStatus;
  
  // Location
  location: PropertyLocation;
  
  // Pricing
  pricing: PropertyPricing;
  
  // Media
  images: PropertyImage[];
  virtualTour?: VirtualTour;
  
  // Host Information
  host: PropertyHost;
  
  // Reviews & Ratings
  rating: PropertyRating;
  reviews: PropertyReviewSummary;
  
  // Amenities & Features
  amenities: PropertyAmenity[];
  highlights: string[];
  
  // Availability
  availability: PropertyAvailability;
  
  // Interactive Features
  isFavorite: boolean;
  isRecentlyViewed: boolean;
  socialProof: SocialProofIndicators;
  
  // Metadata
  verification: PropertyVerification;
  policies: PropertyPolicies;
  analytics: PropertyAnalytics;
  
  // Performance
  loadPriority: 'high' | 'medium' | 'low';
  imageOptimization: ImageOptimization;
  
  createdAt: string;
  updatedAt: string;
}

export interface PropertyLocation {
  address: Address;
  coordinates: Coordinates;
  neighborhood: Neighborhood;
  transportation: Transportation;
  walkability: WalkabilityInfo;
  nearby: NearbyPlaces;
  safety: SafetyInfo;
  localInsights: LocalInsights;
}

export interface WalkabilityInfo {
  walkScore: number;
  transitScore: number;
  bikeScore: number;
  description: string;
  walkableAmenities: string[];
  walkingTimes: Array<{
    destination: string;
    time: number;
    difficulty: 'easy' | 'moderate' | 'difficult';
  }>;
}

export interface NearbyPlaces {
  restaurants: NearbyPlace[];
  shopping: NearbyPlace[];
  entertainment: NearbyPlace[];
  healthcare: NearbyPlace[];
  education: NearbyPlace[];
  transport: NearbyPlace[];
  recreation: NearbyPlace[];
}

export interface NearbyPlace {
  id: string;
  name: string;
  type: string;
  category: string;
  distance: number;
  walkingTime: number;
  rating: number;
  priceLevel?: number;
  isPopular: boolean;
  coordinates: Coordinates;
}

export interface SafetyInfo {
  crimeRate: 'very_low' | 'low' | 'moderate' | 'high' | 'very_high';
  crimeIndex: number;
  safetyScore: number;
  lighting: 'excellent' | 'good' | 'fair' | 'poor';
  policePresence: boolean;
  emergencyServices: {
    hospital: number; // distance in km
    police: number;
    fire: number;
  };
  safetyFeatures: string[];
  recommendations: string[];
}

export interface LocalInsights {
  bestTimeToVisit: string[];
  localTips: string[];
  culturalNotes: string[];
  language: {
    primary: string;
    others: string[];
    englishProficiency: 'high' | 'medium' | 'low';
  };
  currency: {
    code: string;
    symbol: string;
    exchangeRate: number;
  };
  weather: {
    seasonal: Record<string, string>;
    averageTemp: Record<string, number>;
    rainySeasons: string[];
  };
  events: LocalEvent[];
}

export interface LocalEvent {
  id: string;
  name: string;
  type: 'festival' | 'concert' | 'market' | 'exhibition' | 'sports' | 'cultural';
  date: string;
  endDate?: string;
  description: string;
  venue: string;
  distance: number;
  isRecurring: boolean;
  popularity: number;
}

export interface Transportation {
  publicTransport: PublicTransportAccess[];
  airports: AirportAccess[];
  walkingAccess: WalkingAccess[];
  drivingAccess: DrivingAccess;
  bikeAccess: BikeAccess;
}

export interface WalkingAccess {
  mainAreas: Array<{
    destination: string;
    time: number;
    difficulty: 'easy' | 'moderate' | 'difficult';
    safetyRating: number;
  }>;
  walkScore: number;
  pedestrianFriendly: boolean;
  sidewalkQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface DrivingAccess {
  parkingAvailable: boolean;
  parkingType: 'free' | 'paid' | 'valet' | 'street';
  parkingCost?: number;
  trafficLevel: 'low' | 'moderate' | 'heavy';
  majorRoads: string[];
  drivingScore: number;
}

export interface BikeAccess {
  bikeScore: number;
  bikeLanes: boolean;
  bikeParking: boolean;
  bikeRental: boolean;
  difficulty: 'easy' | 'moderate' | 'difficult';
  popularRoutes: string[];
}

export interface Neighborhood {
  id: string;
  name: string;
  description: string;
  type: 'residential' | 'commercial' | 'historic' | 'trendy' | 'quiet' | 'vibrant';
  walkScore: number;
  transitScore: number;
  bikeScore: number;
  demographics: NeighborhoodDemographics;
  amenities: string[];
  priceRange: {
    min: number;
    max: number;
    average: number;
  };
  popularWith: string[];
  bestTimeToVisit?: string[];
}

export interface Transportation {
  publicTransport: PublicTransportAccess[];
  airports: AirportAccess[];
  walkingAccess: WalkingAccess[];
  drivingAccess: DrivingAccess;
  bikeAccess: BikeAccess;
}

export interface PublicTransportAccess {
  type: 'metro' | 'bus' | 'train' | 'tram' | 'ferry';
  name: string;
  lines: string[];
  distance: number;
  walkingTime: number;
  frequency: string;
  operatingHours: string;
  accessibility: boolean;
}

export interface AirportAccess {
  code: string;
  name: string;
  distance: number;
  drivingTime: number;
  transitTime?: number;
  transitCost?: number;
  transitOptions: string[];
}

export interface PropertyPricing {
  basePrice: Price;
  totalPrice: Price;
  breakdown: PriceBreakdown;
  calendar: DynamicPricing[];
  promotions: PricePromotion[];
  comparison: PriceComparison;
  history: PriceHistory[];
}

export interface PriceHistory {
  date: string;
  price: number;
  currency: string;
  type: 'actual' | 'average' | 'predicted';
  factors?: string[];
}

export interface PricePromotion {
  type: 'early_bird' | 'last_minute' | 'weekly' | 'monthly' | 'first_booking' | 'loyalty';
  title: string;
  description: string;
  discount: number;
  discountType: 'percentage' | 'fixed';
  validFrom: string;
  validTo: string;
  conditions?: string[];
  isAutomaticallyApplied: boolean;
}

export interface PriceComparison {
  percentileRanking: number; // 0-100, where 0 is cheapest, 100 is most expensive
  competitorPrices?: Array<{
    platform: string;
    price: number;
    currency: string;
    lastUpdated: string;
  }>;
  marketAverage: number;
  isPriceDrop: boolean;
  priceChangePercentage?: number;
  bestValueScore: number; // 0-100 considering price vs amenities/rating
}

export interface PropertyImage {
  id: string;
  url: string;
  thumbnailUrl: string;
  alt: string;
  caption?: string;
  isPrimary: boolean;
  order: number;
  room?: string;
  type: 'exterior' | 'interior' | 'bedroom' | 'bathroom' | 'kitchen' | 'living' | 'dining' | 'amenity' | 'view' | 'neighborhood';
  tags: string[];
  dimensions?: {
    width: number;
    height: number;
  };
  optimization: ImageOptimization;
  uploadedAt: string;
}

export interface ImageOptimization {
  webpUrl?: string;
  avifUrl?: string;
  placeholder: string; // base64 encoded placeholder
  blurHash?: string;
  dominantColor: string;
  isOptimized: boolean;
  sizes: Array<{
    width: number;
    height: number;
    url: string;
  }>;
}

export interface VirtualTour {
  id: string;
  type: '360_photos' | '3d_walkthrough' | 'video_tour' | 'ar_experience';
  url: string;
  thumbnailUrl: string;
  duration?: number;
  roomCount: number;
  isInteractive: boolean;
  features: string[];
  quality: 'hd' | '4k' | '8k';
  createdAt: string;
}

export interface PropertyHost {
  id: string;
  name: string;
  avatar: string;
  joinedDate: string;
  responseRate: number;
  responseTime: string;
  isVerified: boolean;
  isSuperhost: boolean;
  languages: string[];
  about?: string;
  location?: string;
  verificationMethods: string[];
  hostingSince: string;
  totalProperties: number;
  totalReviews: number;
  averageRating: number;
  badges: HostBadge[];
  certifications: HostCertification[];
}

export interface HostBadge {
  type: 'superhost' | 'experienced' | 'responsive' | 'great_location' | 'sparkling_clean' | 'great_value';
  earnedDate: string;
  description: string;
  icon: string;
}

export interface HostCertification {
  type: 'identity_verified' | 'enhanced_clean' | 'business_travel_ready' | 'accessibility_certified';
  issuedBy: string;
  issuedDate: string;
  expiresDate?: string;
  certificateUrl?: string;
}

export interface PropertyRating {
  overall: number;
  breakdown: {
    cleanliness: number;
    accuracy: number;
    communication: number;
    location: number;
    checkin: number;
    value: number;
  };
  count: number;
  distribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  trend: 'improving' | 'stable' | 'declining';
}

export interface PropertyReviewSummary {
  total: number;
  recent: number; // reviews in last 6 months
  languages: string[];
  guestTypes: {
    solo: number;
    couple: number;
    family: number;
    group: number;
    business: number;
  };
  highlights: string[];
  concerns?: string[];
  sentiment: {
    positive: number;
    neutral: number;
    negative: number;
  };
  topMentions: Array<{
    keyword: string;
    count: number;
    sentiment: 'positive' | 'neutral' | 'negative';
  }>;
}

export interface PropertyAmenity {
  id: string;
  name: string;
  category: 'essential' | 'features' | 'location' | 'safety' | 'accessibility';
  icon: string;
  description?: string;
  isHighlight: boolean;
  isUnique: boolean;
  isPremium: boolean;
  availability?: 'always' | 'seasonal' | 'on_request';
  additionalCost?: number;
}

export interface SocialProofIndicators {
  recentBookings: Array<{
    timeAgo: string;
    guestLocation: string;
    stayDuration: number;
  }>;
  currentViews: number;
  viewsToday: number;
  lastBooked: string;
  popularWith: string[];
  featuredIn?: string[];
  awards?: Array<{
    title: string;
    year: number;
    organization: string;
  }>;
}

export interface PropertyAvailability {
  isAvailable: boolean;
  minStay: number;
  maxStay?: number;
  availableDates: string[];
  blockedDates: string[];
  instantBook: boolean;
  advanceNotice: number; // hours
  preparationTime: number; // hours between bookings
  checkInTime: string;
  checkOutTime: string;
  flexibleDates: boolean;
}

export interface PropertyStatus {
  isActive: boolean;
  isVerified: boolean;
  isInstantBook: boolean;
  isSuperhost: boolean;
  lastUpdated: string;
  verificationLevel: 'basic' | 'enhanced' | 'premium';
  listingQuality: 'excellent' | 'good' | 'fair' | 'needs_improvement';
  completionScore: number; // 0-100
}

export interface PropertyVerification {
  photos: boolean;
  identity: boolean;
  address: boolean;
  phone: boolean;
  email: boolean;
  businessLicense?: boolean;
  insuranceCoverage?: boolean;
  safetyCompliance?: boolean;
  cleaningProtocol?: boolean;
  lastVerified: string;
}

export interface PropertyPolicies {
  cancellation: CancellationPolicy;
  houseRules: HouseRule[];
  additionalFees: AdditionalFee[];
  checkInOut: CheckInOutPolicy;
  payment: PaymentPolicy;
  damage: DamagePolicy;
}

export interface CheckInOutPolicy {
  checkInTime: string;
  checkOutTime: string;
  lateCheckInFee?: number;
  earlyCheckOutAllowed: boolean;
  flexibleTimes: boolean;
  selfCheckIn: boolean;
  keypadCode?: boolean;
  keyBox?: boolean;
  concierge?: boolean;
}

export interface PaymentPolicy {
  acceptedMethods: string[];
  currency: string;
  paymentSchedule: Array<{
    amount: number;
    dueDate: string;
    description: string;
  }>;
  securityDeposit?: number;
  securityDepositRefundable: boolean;
  taxesIncluded: boolean;
}

export interface DamagePolicy {
  securityDeposit: number;
  damageAssessment: 'manual' | 'automated' | 'hybrid';
  reportingDeadline: number; // hours
  disputeProcess: string;
  exampleDamages: Array<{
    type: string;
    cost: number;
    description: string;
  }>;
}

export interface CancellationPolicy {
  type: CancellationFlexibility;
  description: string;
  deadlines: {
    fullRefund?: number; // days before check-in
    partialRefund?: number; // days before check-in
    noRefund: number; // days before check-in
  };
  fees: {
    cancellationFee?: number;
    serviceFee?: number;
  };
  exceptions?: string[];
}

export interface HouseRule {
  type: 'smoking' | 'pets' | 'parties' | 'quiet_hours' | 'additional_guests' | 'check_in' | 'check_out' | 'other';
  description: string;
  isEnforced: boolean;
  violationPenalty?: number;
}

export interface AdditionalFee {
  type: 'cleaning' | 'pet' | 'extra_guest' | 'late_checkout' | 'early_checkin' | 'parking' | 'resort' | 'city_tax';
  amount: number;
  currency: string;
  isOptional: boolean;
  description: string;
  applicableConditions?: string[];
}

export interface PropertyAnalytics {
  views: number;
  favorites: number;
  bookings: number;
  conversionRate: number;
  averageStayLength: number;
  repeatGuests: number;
  cancellationRate: number;
  responseTime: number;
  popularMonths: string[];
  revenueScore: number;
  competitivenessScore: number;
  lastUpdated: string;
}

// ====================================
// SEARCH RESULTS & PAGINATION
// ====================================

export interface PropertySearchResponse {
  properties: PropertySearchResult[];
  meta: SearchResultsMeta;
  filters: AppliedFilters;
  suggestions: FilterSuggestion[];
  recommendations: PropertyRecommendation[];
  insights: SearchInsights;
}

export interface SearchResultsMeta {
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrevious: boolean;
  totalPages: number;
  searchId: string;
  executionTime: number;
  cached: boolean;
  cacheExpiry?: string;
}

export interface AppliedFilters {
  active: Partial<PropertySearchFilters>;
  available: AvailableFilters;
  count: number;
  canClear: boolean;
}

export interface AvailableFilters {
  propertyTypes: FilterOption[];
  amenities: FilterOption[];
  neighborhoods: FilterOption[];
  priceRange: {
    min: number;
    max: number;
    currency: string;
  };
  ratingRange: {
    min: number;
    max: number;
  };
  hostTypes: FilterOption[];
  experiences: FilterOption[];
}

export interface FilterOption {
  id: string;
  name: string;
  count: number;
  icon?: string;
  description?: string;
  isPopular?: boolean;
  isPremium?: boolean;
}

export interface PropertyRecommendation {
  property: PropertySearchResult;
  reason: string;
  confidence: number;
  type: 'personalized' | 'collaborative' | 'content_based' | 'trending' | 'similar';
  source?: string;
}

export interface SearchInsights {
  marketTrends: MarketTrend[];
  priceInsights: PriceInsight[];
  availabilityInsights: AvailabilityInsight[];
  popularFeatures: string[];
  bestTimeToBook: string;
  alternativeLocations?: AlternativeLocation[];
}

export interface MarketTrend {
  metric: 'price' | 'availability' | 'demand' | 'new_listings';
  trend: 'increasing' | 'decreasing' | 'stable';
  change: number;
  timeframe: string;
  description: string;
}

export interface PriceInsight {
  type: 'deal' | 'fair_price' | 'high_demand' | 'price_drop' | 'seasonal_low' | 'seasonal_high';
  title: string;
  description: string;
  impact: 'positive' | 'neutral' | 'negative';
  actionable?: string;
}

export interface AvailabilityInsight {
  message: string;
  urgency: 'low' | 'medium' | 'high';
  availableProperties: number;
  bookingRecommendation?: string;
}

export interface AlternativeLocation {
  name: string;
  distance: number;
  savings: number;
  savingsPercentage: number;
  coordinates: Coordinates;
  highlights: string[];
}

// ====================================
// MAP INTEGRATION TYPES
// ====================================

export interface MapConfig {
  center: Coordinates;
  zoom: number;
  bounds?: BoundingBox;
  clustering: boolean;
  heatmap: boolean;
  streetView: boolean;
  drawingTools: boolean;
  layers: MapLayer[];
}

export interface MapLayer {
  id: string;
  name: string;
  type: 'properties' | 'neighborhoods' | 'transport' | 'amenities' | 'heatmap' | 'clusters';
  visible: boolean;
  data: any[];
  style: MapLayerStyle;
}

export interface MapLayerStyle {
  color: string;
  opacity: number;
  weight?: number;
  fillColor?: string;
  fillOpacity?: number;
  icon?: string;
  size?: number;
}

export interface PropertyCluster {
  id: string;
  coordinates: Coordinates;
  count: number;
  bounds: BoundingBox;
  priceRange: {
    min: number;
    max: number;
    average: number;
  };
  properties: string[]; // property IDs
  level: number; // zoom level where cluster appears
}

export interface PriceHeatmap {
  coordinates: Coordinates;
  price: number;
  intensity: number; // 0-1
  radius: number;
  color: string;
}

export interface NeighborhoodInsight {
  id: string;
  name: string;
  boundaries: Coordinates[];
  center: Coordinates;
  insights: {
    walkScore: number;
    transitScore: number;
    crimeRate: string;
    averageCommute: number;
    popularAmenities: string[];
    demographics: NeighborhoodDemographics;
    priceLevel: 'budget' | 'moderate' | 'expensive' | 'luxury';
  };
}

export interface NeighborhoodDemographics {
  averageAge: number;
  familyFriendly: boolean;
  nightlife: 'quiet' | 'moderate' | 'vibrant';
  touristDensity: 'low' | 'medium' | 'high';
  localVsTourist: number; // percentage of locals vs tourists
}

export interface StreetViewInfo {
  coordinates: Coordinates;
  heading: number;
  pitch: number;
  zoom: number;
  isAvailable: boolean;
  imageUrl?: string;
  panoramaId?: string;
}

// ====================================
// PERFORMANCE & OPTIMIZATION TYPES
// ====================================

export interface InfiniteScrollConfig {
  pageSize: number;
  threshold: number; // pixels from bottom to trigger load
  prefetchPages: number;
  virtualization: boolean;
  caching: boolean;
}

export interface SkeletonLoadingConfig {
  count: number;
  layout: 'grid' | 'list';
  shimmer: boolean;
  customTemplate?: string;
}

export interface LazyLoadingConfig {
  rootMargin: string;
  threshold: number;
  fallbackDelay: number;
  progressive: boolean;
}

export interface CacheStrategy {
  type: 'memory' | 'session' | 'local' | 'indexdb';
  ttl: number; // time to live in seconds
  maxSize: number;
  compression: boolean;
  encryption: boolean;
}

// ====================================
// USER PREFERENCES & PERSONALIZATION
// ====================================

export interface UserSearchPreferences {
  favoriteLocations: string[];
  preferredPropertyTypes: PropertyTypeFilter[];
  budgetRange: {
    min: number;
    max: number;
    currency: string;
  };
  essentialAmenities: string[];
  blacklistAmenities: string[];
  hostPreferences: {
    superhostOnly: boolean;
    responseTimeMax: string;
    languagePreferences: string[];
  };
  travelPatterns: {
    purposeHistory: TravelPurpose[];
    seasonalPreferences: string[];
    groupSizeHistory: number[];
    advanceBookingPattern: string;
  };
  accessibility: {
    requiresAccessibleProperty: boolean;
    specificNeeds: string[];
  };
  privacy: {
    saveSearchHistory: boolean;
    personalizedRecommendations: boolean;
    shareDataForImprovement: boolean;
  };
}

export interface SavedSearch {
  id: string;
  name: string;
  filters: PropertySearchFilters;
  alertsEnabled: boolean;
  frequency: 'immediate' | 'daily' | 'weekly' | 'monthly';
  lastExecuted?: string;
  lastNotified?: string;
  matchCount: number;
  newMatchCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SearchAlert {
  id: string;
  savedSearchId: string;
  triggeredAt: string;
  newProperties: PropertySearchResult[];
  priceDrops: Array<{
    propertyId: string;
    oldPrice: number;
    newPrice: number;
    savingsAmount: number;
    savingsPercentage: number;
  }>;
  availability: Array<{
    propertyId: string;
    newlyAvailable: boolean;
    dates: string[];
  }>;
  isRead: boolean;
  emailSent: boolean;
  pushSent: boolean;
}

// ====================================
// ACCESSIBILITY & MOBILE TYPES
// ====================================

export interface AccessibilityInfo {
  wheelchairAccessible: boolean;
  visuallyImpairedSupport: boolean;
  hearingImpairedSupport: boolean;
  mobilityAid: boolean;
  features: AccessibilityFeature[];
  compliance: {
    ada: boolean;
    wcag: string; // version
    otherStandards: string[];
  };
}

export interface AccessibilityFeature {
  type: 'ramp' | 'elevator' | 'wide_doorways' | 'grab_bars' | 'low_counters' | 'accessible_bathroom' | 'braille' | 'audio_assistance';
  description: string;
  location?: string;
  verified: boolean;
}

export interface TouchGesture {
  type: 'tap' | 'double_tap' | 'long_press' | 'swipe' | 'pinch' | 'rotate';
  action: string;
  enabled: boolean;
  sensitivity?: number;
}

export interface MobileOptimization {
  touchTargetSize: number; // minimum size in pixels
  gestureSupport: TouchGesture[];
  orientationSupport: 'portrait' | 'landscape' | 'both';
  offlineCapabilities: string[];
  performanceTargets: {
    loadTime: number;
    interactionDelay: number;
    frameRate: number;
  };
}

// ====================================
// ANALYTICS & TRACKING TYPES
// ====================================

export interface SearchAnalytics {
  sessionId: string;
  userId?: string;
  searchQuery: string;
  filters: PropertySearchFilters;
  results: {
    total: number;
    viewed: number;
    clicked: number;
    favorited: number;
    shared: number;
    booked: number;
  };
  performance: {
    loadTime: number;
    renderTime: number;
    interactionTime: number;
  };
  userAgent: string;
  location?: Coordinates;
  timestamp: string;
}

export interface ConversionFunnel {
  step: 'search' | 'view_results' | 'view_property' | 'check_availability' | 'start_booking' | 'complete_booking';
  timestamp: string;
  propertyId?: string;
  metadata?: Record<string, any>;
}

// ====================================
// ERROR HANDLING & VALIDATION
// ====================================

export interface SearchError {
  code: string;
  message: string;
  type: 'validation' | 'network' | 'server' | 'rate_limit' | 'authentication';
  field?: string;
  suggestions?: string[];
  retryable: boolean;
  timestamp: string;
}

export interface ValidationRule {
  field: string;
  rule: 'required' | 'min' | 'max' | 'pattern' | 'custom';
  value?: any;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

// ====================================
// THEME & DESIGN SYSTEM
// ====================================

export interface DesignTokens {
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
  };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    neutral: string;
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  typography: {
    fontFamily: string;
    fontSize: Record<string, string>;
    fontWeight: Record<string, string>;
    lineHeight: Record<string, string>;
  };
  shadows: Record<string, string>;
  radius: Record<string, string>;
  animations: {
    duration: Record<string, string>;
    easing: Record<string, string>;
  };
}

export interface ThemeConfig {
  mode: 'light' | 'dark' | 'auto';
  colorScheme: 'default' | 'accessible' | 'colorblind_friendly';
  animations: 'full' | 'reduced' | 'none';
  density: 'compact' | 'normal' | 'comfortable';
  fontSize: 'small' | 'normal' | 'large';
}

// ====================================
// DETAILED REVIEW SYSTEM
// ====================================

export interface PropertyReview {
  id: string;
  guestId: string;
  guestName: string;
  guestAvatar?: string;
  rating: number;
  title: string;
  content: string;
  date: Date;
  stayDuration: number; // nights
  guestType: 'solo' | 'couple' | 'family' | 'business' | 'group';
  purpose: 'leisure' | 'business' | 'romantic' | 'family' | 'adventure';
  helpful: number;
  photos?: string[];
  verified: boolean;
  language?: string;
  hostResponse?: {
    content: string;
    date: Date;
  };
  sentiment?: {
    score: number; // -1 to 1
    emotions: string[];
  };
}

// ====================================
// NEARBY POINTS OF INTEREST
// ====================================

export interface NearbyPOI {
  id: string;
  name: string;
  type: 'restaurant' | 'shopping' | 'attraction' | 'transport' | 'hospital' | 'school';
  category: string;
  distance: number; // in meters
  walkTime: number; // in minutes
  rating?: number;
  reviewCount?: number;
  priceLevel?: 1 | 2 | 3 | 4 | 5;
  coordinates: Coordinates;
  address: string;
  website?: string;
  phone?: string;
  hours?: {
    [day: string]: {
      open: string;
      close: string;
      closed?: boolean;
    };
  };
  amenities?: string[];
  photos?: string[];
}

// ====================================
// EXPORT ALL TYPES
// ====================================

export type * from './property-search';