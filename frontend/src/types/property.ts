/**
 * Property Search Platform Types
 * World-class TypeScript definitions for property search rivaling Airbnb and Booking.com
 */

// Core Geographic Types
export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
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
}

// Advanced Price Types
export interface Price {
  amount: number;
  currency: string;
  formatted: string;
  originalCurrency?: string;
  originalAmount?: number;
  exchangeRate?: number;
}// Core property types



export interface PropertyLocation {export interface Price {export interface Property {

  address: string;

  city: string;  amount: number;  id: string;

  state: string;

  country: string;  currency: string;  title: string;

  zipCode: string;

  coordinates: Coordinates;  formatted: string;  description: string;

  timezone: string;

  neighborhood?: string;}  type: PropertyType;

  landmarks?: Landmark[];

  transportAccess?: TransportAccess[];  status: PropertyStatus;

  walkingDistance?: WalkingDistance[];

}export interface PropertyLocation {  location: PropertyLocation;



export interface Landmark {  address: string;  pricing: PropertyPricing;

  name: string;

  type: 'attraction' | 'restaurant' | 'shopping' | 'transport' | 'healthcare' | 'education';  city: string;  amenities: Amenity[];

  distance: number;

  walkingTime: number;  state: string;  images: PropertyImage[];

  rating?: number;

}  country: string;  host: Host;



export interface TransportAccess {  zipCode: string;  reviews: PropertyReview[];

  type: 'metro' | 'bus' | 'train' | 'airport' | 'ferry';

  name: string;  coordinates: Coordinates;  availability: AvailabilityCalendar;

  distance: number;

  walkingTime: number;  timezone: string;  specifications: PropertySpecifications;

  lines?: string[];

}  neighborhood?: string;  policies: PropertyPolicies;



export interface WalkingDistance {  landmarks?: Landmark[];  verification: PropertyVerification;

  to: string;

  distance: number;  transportAccess?: TransportAccess[];  analytics: PropertyAnalytics;

  time: number;

  walkScore?: number;  walkingDistance?: WalkingDistance[];  createdAt: string;

}

}  updatedAt: string;

export interface PropertyType {

  id: string;}

  name: string;

  category: 'apartment' | 'house' | 'villa' | 'hotel' | 'resort' | 'boutique' | 'hostel' | 'guesthouse' | 'cabin' | 'cottage' | 'loft' | 'studio' | 'penthouse' | 'mansion' | 'castle' | 'treehouse' | 'boat' | 'rv' | 'tent' | 'unique';export interface Landmark {

  description: string;

  features: string[];  name: string;export interface PropertyType {

  maxGuests: number;

  bedrooms: number;  type: 'attraction' | 'restaurant' | 'shopping' | 'transport' | 'healthcare' | 'education';  category: 'entire_place' | 'private_room' | 'shared_room' | 'unique_stay';

  bathrooms: number;

  beds: number;  distance: number;  subcategory: string;

}

  walkingTime: number;  bedrooms: number;

export interface Amenity {

  id: string;  rating?: number;  bathrooms: number;

  name: string;

  category: 'essential' | 'features' | 'location' | 'safety' | 'accessibility';}  beds: number;

  icon: string;

  description?: string;  maxGuests: number;

  isHighlight?: boolean;

  isUnique?: boolean;export interface TransportAccess {  propertySize?: number;

  isPremium?: boolean;

}  type: 'metro' | 'bus' | 'train' | 'airport' | 'ferry';  propertyUnit?: 'sqft' | 'sqm';



export interface Host {  name: string;}

  id: string;

  name: string;  distance: number;

  avatar: string;

  joinedDate: string;  walkingTime: number;export interface PropertyStatus {

  responseRate: number;

  responseTime: string;  lines?: string[];  isActive: boolean;

  isVerified: boolean;

  isSuperhost: boolean;}  isVerified: boolean;

  languages: string[];

  about?: string;  isInstantBook: boolean;

  location?: string;

  verificationMethod?: string[];export interface WalkingDistance {  isSuperhost: boolean;

  hostingSince?: string;

  totalProperties?: number;  to: string;  lastUpdated: string;

  totalReviews?: number;

  averageRating?: number;  distance: number;  verificationLevel: 'basic' | 'enhanced' | 'premium';

}

  time: number;}

export interface PropertyImage {

  id: string;  walkScore?: number;

  url: string;

  alt: string;}export interface PropertyLocation {

  caption?: string;

  isPrimary: boolean;  address: Address;

  order: number;

  tags?: string[];export interface PropertyType {  coordinates: Coordinates;

  room?: string;

  type: 'exterior' | 'interior' | 'bedroom' | 'bathroom' | 'kitchen' | 'living' | 'dining' | 'amenity' | 'view' | 'neighborhood';  id: string;  neighborhood: Neighborhood;

}

  name: string;  transportation: Transportation;

export interface PropertyReview {

  id: string;  category: 'apartment' | 'house' | 'villa' | 'hotel' | 'resort' | 'boutique' | 'hostel' | 'guesthouse' | 'cabin' | 'cottage' | 'loft' | 'studio' | 'penthouse' | 'mansion' | 'castle' | 'treehouse' | 'boat' | 'rv' | 'tent' | 'unique';  accessibility: AccessibilityInfo;

  guestId: string;

  guestName: string;  description: string;  safety: SafetyInfo;

  guestAvatar?: string;

  rating: number;  features: string[];  localInsights: LocalInsights;

  comment: string;

  date: string;  maxGuests: number;}

  isVerified: boolean;

  helpfulCount: number;  bedrooms: number;

  categories: {

    cleanliness: number;  bathrooms: number;export interface Address {

    accuracy: number;

    communication: number;  beds: number;  street: string;

    location: number;

    checkin: number;}  city: string;

    value: number;

  };  state: string;

  sentiment?: 'positive' | 'neutral' | 'negative';

  highlights?: string[];export interface Amenity {  country: string;

  language?: string;

  stayType?: 'business' | 'leisure' | 'family' | 'couple' | 'solo' | 'group';  id: string;  zipCode: string;

  hostResponse?: {

    comment: string;  name: string;  formattedAddress: string;

    date: string;

  };  category: 'essential' | 'features' | 'location' | 'safety' | 'accessibility';  isExactLocation: boolean;

}

  icon: string;}

export interface CancellationPolicy {

  type: 'flexible' | 'moderate' | 'strict' | 'super_strict_30' | 'super_strict_60' | 'long_term' | 'non_refundable';  description?: string;

  description: string;

  deadlines: {  isHighlight?: boolean;export interface Coordinates {

    fullRefund?: number;

    partialRefund?: number;  isUnique?: boolean;  latitude: number;

    noRefund: number;

  };  isPremium?: boolean;  longitude: number;

  fees?: {

    cancellationFee?: number;}  accuracy: number;

    serviceFee?: number;

  };  timezone: string;

}

export interface Host {}

export interface Fee {

  type: 'cleaning' | 'service' | 'pet' | 'security_deposit' | 'resort' | 'parking';  id: string;

  amount: number;

  isPercentage: boolean;  name: string;export interface Neighborhood {

  isRefundable: boolean;

  description: string;  avatar: string;  name: string;

}

  joinedDate: string;  description: string;

export interface AvailabilitySlot {

  date: string;  responseRate: number;  walkScore: number;

  available: boolean;

  price?: Price;  responseTime: string;  transitScore: number;

  minimumStay?: number;

  reason?: string;  isVerified: boolean;  bikeScore: number;

  blockedBy?: 'host' | 'guest' | 'maintenance' | 'system';

}  isSuperhost: boolean;  highlights: string[];



export interface Property {  languages: string[];  nearbyLandmarks: Landmark[];

  id: string;

  title: string;  about?: string;  demographics: NeighborhoodDemographics;

  description: string;

  shortDescription?: string;  location?: string;}

  type: PropertyType;

  location: PropertyLocation;  verificationMethod?: string[];

  host: Host;

  pricing: {  hostingSince?: string;export interface Landmark {

    basePrice: Price;

    weeklyDiscount?: number;  totalProperties?: number;  name: string;

    monthlyDiscount?: number;

    taxes: Price;  totalReviews?: number;  type: 'restaurant' | 'attraction' | 'shopping' | 'transport' | 'hospital' | 'school';

    fees: Fee[];

    totalPrice: Price;  averageRating?: number;  distance: number;

    pricePerNight: Price;

    minimumStay: number;}  walkingTime: number;

    maximumStay?: number;

  };  drivingTime: number;

  availability: {

    calendar: AvailabilitySlot[];export interface PropertyImage {  rating: number;

    instantBook: boolean;

    advanceNotice: number;  id: string;}

    preparationTime: number;

    minimumStay: number;  url: string;

    maximumStay?: number;

    checkInTime: string;  alt: string;export interface Transportation {

    checkOutTime: string;

    customRules?: string[];  caption?: string;  nearbyTransport: TransportOption[];

  };

  images: PropertyImage[];  isPrimary: boolean;  parkingInfo: ParkingInfo;

  amenities: Amenity[];

  rules: {  order: number;  airportDistance: AirportInfo[];

    checkIn: string;

    checkOut: string;  tags?: string[];}

    minimumAge?: number;

    smoking: boolean;  room?: string;

    pets: boolean;

    parties: boolean;  type: 'exterior' | 'interior' | 'bedroom' | 'bathroom' | 'kitchen' | 'living' | 'dining' | 'amenity' | 'view' | 'neighborhood';export interface TransportOption {

    additionalRules?: string[];

  };}  type: 'subway' | 'bus' | 'train' | 'taxi' | 'bike_share';

  safetyFeatures: {

    smokeDetector: boolean;  name: string;

    carbonMonoxideDetector: boolean;

    firstAidKit: boolean;export interface PropertyReview {  distance: number;

    fireExtinguisher: boolean;

    emergencyExit: boolean;  id: string;  walkingTime: number;

    securityCameras?: boolean;

    exteriorLighting?: boolean;  guestId: string;  lines?: string[];

    safetyCard?: boolean;

  };  guestName: string;}

  accessibility: {

    wheelchairAccessible: boolean;  guestAvatar?: string;

    stepFreeAccess: boolean;

    accessibleParking: boolean;  rating: number;export interface PropertyPricing {

    accessibleBathroom: boolean;

    widerDoorways: boolean;  comment: string;  basePrice: number;

    lowerCounters: boolean;

    grabBars: boolean;  date: string;  currency: string;

    rollInShower: boolean;

    hearingAccessible: boolean;  isVerified: boolean;  priceBreakdown: PriceBreakdown;

    visualAids: boolean;

  };  helpfulCount: number;  discounts: Discount[];

  reviews: {

    count: number;  categories: {  seasonalPricing: SeasonalPricing[];

    averageRating: number;

    categoryRatings: {    cleanliness: number;  dynamicPricing: DynamicPricing;

      cleanliness: number;

      accuracy: number;    accuracy: number;  fees: Fee[];

      communication: number;

      location: number;    communication: number;  cancellationPolicy: CancellationPolicy;

      checkin: number;

      value: number;    location: number;}

    };

    recent: PropertyReview[];    checkin: number;

    sentiment: {

      positive: number;    value: number;export interface PriceBreakdown {

      neutral: number;

      negative: number;  };  baseRate: number;

    };

  };  sentiment?: 'positive' | 'neutral' | 'negative';  cleaningFee: number;

  cancellationPolicy: CancellationPolicy;

  status: 'active' | 'inactive' | 'pending' | 'suspended' | 'archived';  highlights?: string[];  serviceFee: number;

  featured: boolean;

  verified: boolean;  language?: string;  taxes: Tax[];

  instantBook: boolean;

  superhost: boolean;  stayType?: 'business' | 'leisure' | 'family' | 'couple' | 'solo' | 'group';  totalBeforeTaxes: number;

  createdAt: string;

  updatedAt: string;  hostResponse?: {  totalAfterTaxes: number;

  lastBookedAt?: string;

  viewCount: number;    comment: string;}

  favoriteCount: number;

  inquiryCount: number;    date: string;

  bookingCount: number;

  metadata?: {  };export interface Amenity {

    source?: string;

    importId?: string;}  id: string;

    lastSync?: string;

    externalId?: string;  name: string;

  };

}export interface CancellationPolicy {  category: AmenityCategory;



// Search and Filter Types  type: 'flexible' | 'moderate' | 'strict' | 'super_strict_30' | 'super_strict_60' | 'long_term' | 'non_refundable';  icon: string;

export interface PropertySearchParams {

  destination?: string;  description: string;  description?: string;

  checkIn?: string;

  checkOut?: string;  deadlines: {  isHighlight: boolean;

  guests: {

    adults: number;    fullRefund?: number;  isAccessibility: boolean;

    children: number;

    infants: number;    partialRefund?: number;  isPetFriendly: boolean;

    pets: number;

  };    noRefund: number;  isBusinessTravel: boolean;

  coordinates?: Coordinates;

  radius?: number;  };  isFamilyFriendly: boolean;

  page?: number;

  limit?: number;  fees?: {}

  sortBy?: SortOption;

  filters?: PropertyFilters;    cancellationFee?: number;

  searchMode?: 'text' | 'voice' | 'image' | 'map' | 'ai';

  naturalLanguageQuery?: string;    serviceFee?: number;export type AmenityCategory = 

  imageSearch?: {

    imageUrl: string;  };  | 'essential' 

    features: string[];

  };}  | 'features' 

  voiceSearch?: {

    audioUrl: string;  | 'location' 

    transcript: string;

    intent: string;export interface Fee {  | 'safety' 

  };

  preferences?: UserPreferences;  type: 'cleaning' | 'service' | 'pet' | 'security_deposit' | 'resort' | 'parking';  | 'accessibility'

}

  amount: number;  | 'pet_friendly'

export interface PropertyFilters {

  priceRange?: {  isPercentage: boolean;  | 'business_travel'

    min: number;

    max: number;  isRefundable: boolean;  | 'family_friendly';

    currency: string;

  };  description: string;

  propertyTypes?: string[];

  amenities?: string[];}export interface PropertyImage {

  bedroomCount?: number[];

  bathroomCount?: number[];  id: string;

  bedCount?: number[];

  guestCount?: {export interface AvailabilitySlot {  url: string;

    min: number;

    max: number;  date: string;  thumbnail: string;

  };

  instantBook?: boolean;  available: boolean;  caption: string;

  superhost?: boolean;

  rating?: {  price?: Price;  room: string;

    minimum: number;

  };  minimumStay?: number;  isMain: boolean;

  languages?: string[];

  accessibility?: {  reason?: string;  order: number;

    wheelchairAccessible?: boolean;

    stepFreeAccess?: boolean;  blockedBy?: 'host' | 'guest' | 'maintenance' | 'system';  metadata: ImageMetadata;

    hearingAccessible?: boolean;

    visualAids?: boolean;}  alt: string;

  };

  policies?: {}

    pets?: boolean;

    smoking?: boolean;export interface Property {

    parties?: boolean;

    children?: boolean;  id: string;export interface ImageMetadata {

  };

  safety?: {  title: string;  width: number;

    smokeDetector?: boolean;

    carbonMonoxideDetector?: boolean;  description: string;  height: number;

    firstAidKit?: boolean;

    securityCameras?: boolean;  shortDescription?: string;  format: string;

  };

  location?: {  type: PropertyType;  size: number;

    neighborhoods?: string[];

    landmarks?: string[];  location: PropertyLocation;  uploadedAt: string;

    transportAccess?: string[];

    walkingDistance?: {  host: Host;  photographer?: string;

      to: string;

      maxDistance: number;  pricing: {}

    }[];

  };    basePrice: Price;

  availability?: {

    minimumStay?: number;    weeklyDiscount?: number;export interface Host {

    maximumStay?: number;

    advanceBooking?: number;    monthlyDiscount?: number;  id: string;

    flexibleDates?: boolean;

  };    taxes: Price;  name: string;

  experience?: {

    workFriendly?: boolean;    fees: Fee[];  avatar: string;

    familyFriendly?: boolean;

    romantic?: boolean;    totalPrice: Price;  joinedDate: string;

    adventure?: boolean;

    relaxation?: boolean;    pricePerNight: Price;  isVerified: boolean;

    business?: boolean;

    events?: boolean;    minimumStay: number;  isSuperhost: boolean;

  };

  sustainability?: {    maximumStay?: number;  responseRate: number;

    ecoFriendly?: boolean;

    solarPower?: boolean;  };  responseTime: string;

    recycling?: boolean;

    localSourcing?: boolean;  availability: {  languages: string[];

    carbonNeutral?: boolean;

  };    calendar: AvailabilitySlot[];  about: string;

  verification?: {

    identityVerified?: boolean;    instantBook: boolean;  verifications: HostVerification[];

    phoneVerified?: boolean;

    emailVerified?: boolean;    advanceNotice: number;  reviews: HostReview[];

    governmentIdVerified?: boolean;

  };    preparationTime: number;  properties: string[];

}

    minimumStay: number;}

export interface SortOption {

  field: 'price' | 'rating' | 'distance' | 'popularity' | 'newest' | 'reviews' | 'relevance' | 'discount';    maximumStay?: number;

  direction: 'asc' | 'desc';

  label: string;    checkInTime: string;export interface HostVerification {

}

    checkOutTime: string;  type: 'email' | 'phone' | 'identity' | 'work' | 'facebook' | 'google';

export interface UserPreferences {

  pricePreference?: 'budget' | 'mid-range' | 'luxury';    customRules?: string[];  verified: boolean;

  travelStyle?: 'business' | 'leisure' | 'adventure' | 'romantic' | 'family' | 'solo' | 'group';

  previousBookings?: string[];  };  verifiedAt?: string;

  savedSearches?: string[];

  favoriteAmenities?: string[];  images: PropertyImage[];}

  blacklistedAmenities?: string[];

  languagePreference?: string;  amenities: Amenity[];

  currencyPreference?: string;

  accessibilityNeeds?: string[];  rules: {export interface HostReview {

  dietaryRestrictions?: string[];

  workRemotely?: boolean;    checkIn: string;  id: string;

  travelWithPets?: boolean;

  frequentDestinations?: string[];    checkOut: string;  rating: number;

  personalizedRecommendations?: boolean;

  marketingPreferences?: {    minimumAge?: number;  comment: string;

    email?: boolean;

    push?: boolean;    smoking: boolean;  guestName: string;

    sms?: boolean;

  };    pets: boolean;  date: string;

}

    parties: boolean;  propertyId: string;

// Map Integration Types

export interface MapProperty {    additionalRules?: string[];}

  id: string;

  title: string;  };

  coordinates: Coordinates;

  price: Price;  safetyFeatures: {export interface PropertyReview {

  rating: number;

  reviewCount: number;    smokeDetector: boolean;  id: string;

  type: string;

  images: string[];    carbonMonoxideDetector: boolean;  guestId: string;

  isInstantBook: boolean;

  isSuperhost: boolean;    firstAidKit: boolean;  guestName: string;

  clusterId?: string;

}    fireExtinguisher: boolean;  guestAvatar: string;



export interface PropertyCluster {    emergencyExit: boolean;  rating: number;

  id: string;

  coordinates: Coordinates;    securityCameras?: boolean;  comment: string;

  propertyCount: number;

  averagePrice: Price;    exteriorLighting?: boolean;  date: string;

  priceRange: {

    min: Price;    safetyCard?: boolean;  stayDuration: number;

    max: Price;

  };  };  tripType: TripType;

  averageRating: number;

  zoom: number;  accessibility: {  isVerified: boolean;

  properties: MapProperty[];

}    wheelchairAccessible: boolean;  images?: string[];



export interface MapBounds {    stepFreeAccess: boolean;  helpfulVotes: number;

  north: number;

  south: number;    accessibleParking: boolean;  hostResponse?: HostResponse;

  east: number;

  west: number;    accessibleBathroom: boolean;  sentiment: ReviewSentiment;

}

    widerDoorways: boolean;  categories: ReviewCategories;

export interface MapViewport {

  bounds: MapBounds;    lowerCounters: boolean;}

  center: Coordinates;

  zoom: number;    grabBars: boolean;

}

    rollInShower: boolean;export type TripType = 'business' | 'leisure' | 'family' | 'romantic' | 'solo' | 'group';

export interface PriceHeatmapData {

  coordinates: Coordinates;    hearingAccessible: boolean;

  price: number;

  intensity: number;    visualAids: boolean;export interface HostResponse {

  neighborhood?: string;

}  };  comment: string;



export interface NeighborhoodInsight {  reviews: {  date: string;

  id: string;

  name: string;    count: number;  isHelpful: boolean;

  coordinates: Coordinates;

  averagePrice: Price;    averageRating: number;}

  priceChange: number;

  popularityScore: number;    categoryRatings: {

  walkScore: number;

  transitScore: number;      cleanliness: number;export interface ReviewSentiment {

  bikeScore: number;

  demographics: {      accuracy: number;  score: number; // -1 to 1

    averageAge: number;

    familyFriendly: boolean;      communication: number;  confidence: number;

    nightlife: boolean;

    shopping: boolean;      location: number;  keywords: string[];

    dining: boolean;

    culture: boolean;      checkin: number;  emotions: string[];

  };

  amenities: {      value: number;}

    restaurants: number;

    cafes: number;    };

    shops: number;

    parks: number;    recent: PropertyReview[];export interface ReviewCategories {

    gyms: number;

    schools: number;    sentiment: {  cleanliness: number;

    hospitals: number;

  };      positive: number;  accuracy: number;

  trends: {

    bookingGrowth: number;      neutral: number;  checkIn: number;

    priceGrowth: number;

    supplyGrowth: number;      negative: number;  communication: number;

    seasonality: string;

  };    };  location: number;

}

  };  value: number;

// API Response Types

export interface ApiResponse<T> {  cancellationPolicy: CancellationPolicy;}

  success: boolean;

  data: T;  status: 'active' | 'inactive' | 'pending' | 'suspended' | 'archived';

  message?: string;

  errors?: string[];  featured: boolean;// Search and filtering types

  meta?: {

    timestamp: string;  verified: boolean;export interface PropertySearchParams {

    requestId: string;

    version: string;  instantBook: boolean;  query?: string;

  };

}  superhost: boolean;  location?: LocationSearch;



export interface PaginatedResponse<T> {  createdAt: string;  dates?: DateRange;

  items: T[];

  pagination: {  updatedAt: string;  guests?: GuestConfiguration;

    page: number;

    limit: number;  lastBookedAt?: string;  filters?: PropertyFilters;

    total: number;

    totalPages: number;  viewCount: number;  sort?: SortOption;

    hasNext: boolean;

    hasPrevious: boolean;  favoriteCount: number;  pagination?: PaginationParams;

  };

}  inquiryCount: number;  mapBounds?: MapBounds;



export interface SearchMetadata {  bookingCount: number;  preferences?: UserPreferences;

  searchId: string;

  timestamp: string;  metadata?: {}

  location?: Coordinates;

  filters: PropertyFilters;    source?: string;

  resultCount: number;

  searchTime: number;    importId?: string;export interface LocationSearch {

  suggestions: number;

  personalized: boolean;    lastSync?: string;  query: string;

}

    externalId?: string;  coordinates?: Coordinates;

// Export utility types

export type PropertyFilterKey = keyof PropertyFilters;  };  radius?: number;

export type SortField = SortOption['field'];

export type ViewModeType = 'grid' | 'list' | 'map' | 'cards';}  type: 'city' | 'neighborhood' | 'landmark' | 'coordinates' | 'custom_area';

export type PropertyCategory = PropertyType['category'];

  polygon?: Coordinates[]; // For custom search areas

// API Response Types

export type PropertySearchResponse = ApiResponse<PaginatedResponse<Property> & { metadata: SearchMetadata }>;// Search and Filter Types}

export type PropertyDetailsResponse = ApiResponse<Property>;

export type PropertyAvailabilityResponse = ApiResponse<AvailabilitySlot[]>;export interface PropertySearchParams {

export type PropertyPricingResponse = ApiResponse<Property['pricing']>;

export type PropertyReviewsResponse = ApiResponse<PaginatedResponse<PropertyReview>>;  destination?: string;export interface DateRange {

export type PropertyAmenitiesResponse = ApiResponse<Amenity[]>;

export type PropertyPhotosResponse = ApiResponse<PropertyImage[]>;  checkIn?: string;  checkIn: string;

export type NearbyPropertiesResponse = ApiResponse<MapProperty[]>;

export type PropertyFavoritesResponse = ApiResponse<Property[]>;  checkOut?: string;  checkOut: string;

export type CreatePropertyResponse = ApiResponse<Property>;

export type UpdatePropertyResponse = ApiResponse<Property>;  guests: {  flexibility?: number; // days

    adults: number;}

    children: number;

    infants: number;export interface GuestConfiguration {

    pets: number;  adults: number;

  };  children: number;

  coordinates?: Coordinates;  infants: number;

  radius?: number;  pets: number;

  page?: number;}

  limit?: number;

  sortBy?: SortOption;export interface PropertyFilters {

  filters?: PropertyFilters;  priceRange?: PriceRange;

  searchMode?: 'text' | 'voice' | 'image' | 'map' | 'ai';  propertyTypes?: PropertyType['category'][];

  naturalLanguageQuery?: string;  amenities?: string[];

  imageSearch?: {  hostPreferences?: HostPreferences;

    imageUrl: string;  experienceTypes?: ExperienceType[];

    features: string[];  accessibility?: AccessibilityFilters;

  };  policies?: PolicyFilters;

  voiceSearch?: {  verification?: VerificationFilters;

    audioUrl: string;  ratings?: RatingFilters;

    transcript: string;  availability?: AvailabilityFilters;

    intent: string;}

  };

  preferences?: UserPreferences;export interface PriceRange {

}  min: number;

  max: number;

export interface PropertyFilters {  currency: string;

  priceRange?: {}

    min: number;

    max: number;export interface HostPreferences {

    currency: string;  superhostOnly?: boolean;

  };  instantBookOnly?: boolean;

  propertyTypes?: string[];  newListings?: boolean;

  amenities?: string[];  experiencedHosts?: boolean;

  bedroomCount?: number[];}

  bathroomCount?: number[];

  bedCount?: number[];export interface ExperienceType {

  guestCount?: {  id: string;

    min: number;  name: string;

    max: number;  description: string;

  };  tags: string[];

  instantBook?: boolean;}

  superhost?: boolean;

  rating?: {export interface AccessibilityFilters {

    minimum: number;  wheelchairAccessible?: boolean;

  };  stepFreeAccess?: boolean;

  languages?: string[];  accessibleParking?: boolean;

  accessibility?: {  accessibleBathroom?: boolean;

    wheelchairAccessible?: boolean;  audioVisualAids?: boolean;

    stepFreeAccess?: boolean;  serviceAnimalFriendly?: boolean;

    hearingAccessible?: boolean;}

    visualAids?: boolean;

  };export interface PolicyFilters {

  policies?: {  petFriendly?: boolean;

    pets?: boolean;  smokingAllowed?: boolean;

    smoking?: boolean;  partiesAllowed?: boolean;

    parties?: boolean;  childFriendly?: boolean;

    children?: boolean;  flexibleCancellation?: boolean;

  };}

  safety?: {

    smokeDetector?: boolean;export interface VerificationFilters {

    carbonMonoxideDetector?: boolean;  verifiedHosts?: boolean;

    firstAidKit?: boolean;  verifiedProperties?: boolean;

    securityCameras?: boolean;  backgroundChecked?: boolean;

  };  identityVerified?: boolean;

  location?: {}

    neighborhoods?: string[];

    landmarks?: string[];export interface RatingFilters {

    transportAccess?: string[];  minRating?: number;

    walkingDistance?: {  minReviews?: number;

      to: string;  recentReviewsOnly?: boolean;

      maxDistance: number;  superHostsOnly?: boolean;

    }[];}

  };

  availability?: {export interface AvailabilityFilters {

    minimumStay?: number;  instantBook?: boolean;

    maximumStay?: number;  minStay?: number;

    advanceBooking?: number;  maxStay?: number;

    flexibleDates?: boolean;  checkInDay?: string[];

  };  checkOutDay?: string[];

  experience?: {}

    workFriendly?: boolean;

    familyFriendly?: boolean;export interface SortOption {

    romantic?: boolean;  field: 'relevance' | 'price' | 'rating' | 'distance' | 'newest' | 'popular';

    adventure?: boolean;  order: 'asc' | 'desc';

    relaxation?: boolean;}

    business?: boolean;

    events?: boolean;export interface PaginationParams {

  };  page: number;

  sustainability?: {  limit: number;

    ecoFriendly?: boolean;  offset?: number;

    solarPower?: boolean;}

    recycling?: boolean;

    localSourcing?: boolean;export interface MapBounds {

    carbonNeutral?: boolean;  northeast: Coordinates;

  };  southwest: Coordinates;

  verification?: {  zoom: number;

    identityVerified?: boolean;}

    phoneVerified?: boolean;

    emailVerified?: boolean;// Search results and UI types

    governmentIdVerified?: boolean;export interface SearchResults {

  };  properties: Property[];

}  total: number;

  pagination: PaginationInfo;

export interface SortOption {  filters: AppliedFilters;

  field: 'price' | 'rating' | 'distance' | 'popularity' | 'newest' | 'reviews' | 'relevance' | 'discount';  suggestions: SearchSuggestions;

  direction: 'asc' | 'desc';  metadata: SearchMetadata;

  label: string;}

}

export interface PaginationInfo {

export interface UserPreferences {  currentPage: number;

  pricePreference?: 'budget' | 'mid-range' | 'luxury';  totalPages: number;

  travelStyle?: 'business' | 'leisure' | 'adventure' | 'romantic' | 'family' | 'solo' | 'group';  totalItems: number;

  previousBookings?: string[];  hasNextPage: boolean;

  savedSearches?: string[];  hasPrevPage: boolean;

  favoriteAmenities?: string[];}

  blacklistedAmenities?: string[];

  languagePreference?: string;export interface AppliedFilters {

  currencyPreference?: string;  active: PropertyFilters;

  accessibilityNeeds?: string[];  suggestions: FilterSuggestion[];

  dietaryRestrictions?: string[];  alternatives: AlternativeFilter[];

  workRemotely?: boolean;}

  travelWithPets?: boolean;

  frequentDestinations?: string[];export interface FilterSuggestion {

  personalizedRecommendations?: boolean;  type: 'seasonal' | 'budget' | 'dates' | 'amenity' | 'location';

  marketingPreferences?: {  title: string;

    email?: boolean;  description: string;

    push?: boolean;  filter: Partial<PropertyFilters>;

    sms?: boolean;  impact: {

  };    priceChange?: number;

}    resultCountChange?: number;

    popularityScore?: number;

// Map Integration Types  };

export interface MapProperty {}

  id: string;

  title: string;export interface AlternativeFilter {

  coordinates: Coordinates;  title: string;

  price: Price;  description: string;

  rating: number;  filters: PropertyFilters;

  reviewCount: number;  resultCount: number;

  type: string;  savings?: number;

  images: string[];}

  isInstantBook: boolean;

  isSuperhost: boolean;export interface SearchSuggestions {

  clusterId?: string;  locations: LocationSuggestion[];

}  dates: DateSuggestion[];

  filters: FilterSuggestion[];

export interface PropertyCluster {  similar: SimilarSearch[];

  id: string;}

  coordinates: Coordinates;

  propertyCount: number;export interface LocationSuggestion {

  averagePrice: Price;  name: string;

  priceRange: {  type: 'city' | 'neighborhood' | 'landmark';

    min: Price;  coordinates: Coordinates;

    max: Price;  propertyCount: number;

  };  averagePrice: number;

  averageRating: number;  image?: string;

  zoom: number;}

  properties: MapProperty[];

}export interface DateSuggestion {

  checkIn: string;

export interface MapBounds {  checkOut: string;

  north: number;  reason: string;

  south: number;  savings?: number;

  east: number;  description: string;

  west: number;}

}

export interface SimilarSearch {

export interface MapViewport {  query: string;

  bounds: MapBounds;  description: string;

  center: Coordinates;  params: PropertySearchParams;

  zoom: number;  resultCount: number;

}  popularity: number;

}

export interface PriceHeatmapData {

  coordinates: Coordinates;// Map and visualization types

  price: number;export interface PropertyCluster {

  intensity: number;  coordinates: Coordinates;

  neighborhood?: string;  count: number;

}  averagePrice: number;

  priceRange: PriceRange;

export interface NeighborhoodInsight {  zoom: number;

  id: string;  properties?: Property[];

  name: string;}

  coordinates: Coordinates;

  averagePrice: Price;export interface PriceHeatmap {

  priceChange: number;  bounds: MapBounds;

  popularityScore: number;  cells: HeatmapCell[];

  walkScore: number;  priceRanges: PriceRange[];

  transitScore: number;  colors: string[];

  bikeScore: number;}

  demographics: {

    averageAge: number;export interface HeatmapCell {

    familyFriendly: boolean;  coordinates: Coordinates;

    nightlife: boolean;  price: number;

    shopping: boolean;  density: number;

    dining: boolean;  color: string;

    culture: boolean;}

  };

  amenities: {export interface MapMarker {

    restaurants: number;  id: string;

    cafes: number;  coordinates: Coordinates;

    shops: number;  type: 'property' | 'cluster' | 'landmark' | 'transport';

    parks: number;  data: any;

    gyms: number;  isSelected: boolean;

    schools: number;  isHovered: boolean;

    hospitals: number;}

  };

  trends: {// Advanced search features

    bookingGrowth: number;export interface VoiceSearchParams {

    priceGrowth: number;  transcript: string;

    supplyGrowth: number;  confidence: number;

    seasonality: string;  language: string;

  };  intent: SearchIntent;

}  entities: ExtractedEntity[];

}

// Performance and Analytics Types

export interface SearchPerformance {export interface SearchIntent {

  searchTime: number;  type: 'search' | 'filter' | 'navigate' | 'book' | 'compare';

  resultCount: number;  confidence: number;

  cached: boolean;  parameters: Record<string, any>;

  suggestions: number;}

  filters: number;

  location: Coordinates;export interface ExtractedEntity {

  timestamp: string;  type: 'location' | 'date' | 'price' | 'amenity' | 'guest_count';

}  value: string;

  confidence: number;

export interface UserAnalytics {  normalized: any;

  sessionId: string;}

  userId?: string;

  searchHistory: SearchAnalytics[];export interface ImageSearchParams {

  viewHistory: ViewAnalytics[];  imageUrl: string;

  bookingHistory: BookingAnalytics[];  features: ImageFeature[];

  preferences: UserPreferences;  style: string[];

  behavior: {  mood: string[];

    averageSessionTime: number;  colors: string[];

    searchesToBookingRatio: number;}

    favoritePropertyTypes: string[];

    priceRange: {export interface ImageFeature {

      min: number;  type: 'architecture' | 'interior' | 'landscape' | 'amenity';

      max: number;  confidence: number;

    };  description: string;

    popularDestinations: string[];}

    seasonalPatterns: string[];

  };export interface NaturalLanguageSearch {

}  query: string;

  parsed: ParsedQuery;

export interface SearchAnalytics {  suggestions: string[];

  searchId: string;  confidence: number;

  query: string;}

  filters: PropertyFilters;

  resultCount: number;export interface ParsedQuery {

  clickThroughRate: number;  location?: string;

  conversionRate: number;  dates?: DateRange;

  timestamp: string;  guests?: GuestConfiguration;

  location?: Coordinates;  amenities?: string[];

  device: string;  priceRange?: PriceRange;

  source: string;  propertyType?: string;

}  mood?: string[];

  intent: string;

export interface ViewAnalytics {}

  propertyId: string;

  viewTime: number;// Personalization and recommendations

  scrollDepth: number;export interface UserPreferences {

  imagesViewed: number;  priceRange: PriceRange;

  amenitiesViewed: boolean;  preferredAmenities: string[];

  reviewsViewed: boolean;  avoidedAmenities: string[];

  mapViewed: boolean;  propertyTypes: PropertyType['category'][];

  priceChecked: boolean;  locationPreferences: LocationPreference[];

  availabilityChecked: boolean;  experienceTypes: string[];

  timestamp: string;  travelStyle: TravelStyle;

  source: string;  accessibility: AccessibilityNeeds;

  device: string;  languages: string[];

}}



export interface BookingAnalytics {export interface LocationPreference {

  bookingId: string;  type: 'city_center' | 'quiet_area' | 'near_transit' | 'near_beach' | 'mountain' | 'countryside';

  propertyId: string;  weight: number;

  searchToBookingTime: number;}

  viewToBookingTime: number;

  priceAtBooking: Price;export interface TravelStyle {

  discountsApplied: string[];  budget: 'luxury' | 'mid_range' | 'budget';

  timestamp: string;  pace: 'relaxed' | 'moderate' | 'active';

  source: string;  socializing: 'private' | 'social' | 'community';

  device: string;  planning: 'structured' | 'flexible' | 'spontaneous';

}}



// UI/UX Component Typesexport interface AccessibilityNeeds {

export interface ViewMode {  mobility: boolean;

  type: 'grid' | 'list' | 'map' | 'cards';  vision: boolean;

  columns?: number;  hearing: boolean;

  density?: 'compact' | 'comfortable' | 'spacious';  cognitive: boolean;

}  other: string[];

}

export interface PropertyCard {

  id: string;export interface RecentlyViewed {

  layout: 'standard' | 'compact' | 'featured' | 'minimal';  property: Property;

  showImages: boolean;  viewedAt: string;

  showPrice: boolean;  duration: number;

  showRating: boolean;  actions: ViewAction[];

  showAmenities: boolean;}

  showHost: boolean;

  showLocation: boolean;export interface ViewAction {

  interactive: boolean;  type: 'scroll' | 'image_view' | 'map_view' | 'favorite' | 'share' | 'calculate_price';

  animations: boolean;  timestamp: string;

  skeleton?: boolean;  data?: any;

}}



export interface SearchInterface {export interface SavedSearch {

  autocomplete: {  id: string;

    enabled: boolean;  name: string;

    suggestions: SearchSuggestion[];  params: PropertySearchParams;

    recentSearches: string[];  alerts: SearchAlert[];

    popularDestinations: string[];  lastRun: string;

    aiSuggestions: boolean;  resultCount: number;

  };  createdAt: string;

  filters: {}

    visible: boolean;

    collapsed: boolean;export interface SearchAlert {

    smartSuggestions: boolean;  type: 'new_properties' | 'price_drop' | 'availability';

    quickFilters: string[];  frequency: 'immediate' | 'daily' | 'weekly';

    customFilters: PropertyFilters;  threshold?: number;

  };  isActive: boolean;

  sorting: {}

    options: SortOption[];

    default: SortOption;export interface PropertyRecommendation {

    customizable: boolean;  property: Property;

  };  score: number;

  results: {  reasons: RecommendationReason[];

    pagination: PaginationConfig;  type: 'collaborative' | 'content_based' | 'hybrid';

    infiniteScroll: boolean;  confidence: number;

    loadingState: LoadingState;}

    emptyState: EmptyState;

  };export interface RecommendationReason {

}  type: 'similar_users' | 'previous_stays' | 'preferences' | 'location' | 'price' | 'amenities';

  description: string;

export interface SearchSuggestion {  weight: number;

  id: string;}

  text: string;

  type: 'destination' | 'property' | 'neighborhood' | 'landmark' | 'address';// Performance and UX types

  coordinates?: Coordinates;export interface LoadingState {

  image?: string;  isLoading: boolean;

  subtitle?: string;  type: 'initial' | 'pagination' | 'filter' | 'sort';

  popularity?: number;  progress?: number;

  aiGenerated?: boolean;  message?: string;

}}



export interface PaginationConfig {export interface ErrorState {

  enabled: boolean;  hasError: boolean;

  pageSize: number;  type: 'network' | 'validation' | 'server' | 'permission';

  showPageNumbers: boolean;  message: string;

  showTotal: boolean;  code?: string;

  infiniteScroll: boolean;  recovery?: ErrorRecovery;

  preloadNext: boolean;}

}

export interface ErrorRecovery {

export interface LoadingState {  actions: RecoveryAction[];

  type: 'skeleton' | 'spinner' | 'progressive' | 'shimmer';  autoRetry?: boolean;

  count?: number;  retryDelay?: number;

  animated: boolean;}

  duration: number;

}export interface RecoveryAction {

  type: 'retry' | 'refresh' | 'clear_filters' | 'contact_support';

export interface EmptyState {  label: string;

  title: string;  action: () => void;

  description: string;}

  image?: string;

  suggestions: string[];export interface PerformanceMetrics {

  actions: {  searchTime: number;

    text: string;  renderTime: number;

    action: string;  imageLoadTime: number;

  }[];  interactionDelay: number;

}  memoryUsage: number;

}

// API Response Types

export interface ApiResponse<T> {// API response types

  success: boolean;export interface PropertySearchResponse {

  data: T;  success: boolean;

  message?: string;  data: SearchResults;

  errors?: string[];  metadata: ResponseMetadata;

  meta?: {  performance: PerformanceMetrics;

    timestamp: string;}

    requestId: string;

    version: string;export interface ResponseMetadata {

  };  requestId: string;

}  timestamp: string;

  version: string;

export interface PaginatedResponse<T> {  cache: CacheInfo;

  items: T[];}

  pagination: {

    page: number;export interface CacheInfo {

    limit: number;  hit: boolean;

    total: number;  ttl: number;

    totalPages: number;  source: 'memory' | 'redis' | 'database';

    hasNext: boolean;}

    hasPrevious: boolean;

  };// Autocomplete and suggestions

}export interface AutocompleteResult {

  id: string;

export interface SearchMetadata {  text: string;

  searchId: string;  type: 'location' | 'property' | 'amenity' | 'experience';

  timestamp: string;  highlight: string;

  location?: Coordinates;  metadata: AutocompleteMetadata;

  filters: PropertyFilters;  score: number;

  resultCount: number;}

  searchTime: number;

  suggestions: number;export interface AutocompleteMetadata {

  personalized: boolean;  propertyCount?: number;

}  averagePrice?: number;

  coordinates?: Coordinates;

// Export utility types  category?: string;

export type PropertyFilterKey = keyof PropertyFilters;  popularity?: number;

export type SortField = SortOption['field'];}

export type ViewModeType = ViewMode['type'];

export type PropertyCategory = PropertyType['category'];// Layout and view types

export type ViewMode = 'grid' | 'list' | 'map' | 'calendar';

// API Response Types

export type PropertySearchResponse = ApiResponse<PaginatedResponse<Property> & { metadata: SearchMetadata }>;export interface ViewConfiguration {

export type PropertyDetailsResponse = ApiResponse<Property>;  mode: ViewMode;

export type PropertyAvailabilityResponse = ApiResponse<AvailabilitySlot[]>;  gridColumns: number;

export type PropertyPricingResponse = ApiResponse<Property['pricing']>;  showMap: boolean;

export type PropertyReviewsResponse = ApiResponse<PaginatedResponse<PropertyReview>>;  mapPosition: 'left' | 'right' | 'bottom';

export type PropertyAmenitiesResponse = ApiResponse<Amenity[]>;  filters: {

export type PropertyPhotosResponse = ApiResponse<PropertyImage[]>;    isExpanded: boolean;

export type NearbyPropertiesResponse = ApiResponse<MapProperty[]>;    position: 'sidebar' | 'top' | 'modal';

export type PropertyFavoritesResponse = ApiResponse<Property[]>;  };

export type CreatePropertyResponse = ApiResponse<Property>;}

export type UpdatePropertyResponse = ApiResponse<Property>;
export interface LayoutBreakpoint {
  mobile: boolean;
  tablet: boolean;
  desktop: boolean;
  largeDesktop: boolean;
}

// Supporting types for comprehensive property data
export interface NeighborhoodDemographics {
  population: number;
  medianAge: number;
  medianIncome: number;
  walkability: number;
  crimeRate: number;
}

export interface ParkingInfo {
  available: boolean;
  type: 'free' | 'paid' | 'street' | 'garage';
  spaces: number;
  price?: number;
  restrictions?: string[];
}

export interface AirportInfo {
  code: string;
  name: string;
  distance: number;
  drivingTime: number;
  transportOptions: TransportOption[];
}

export interface AccessibilityInfo {
  wheelchairAccessible: boolean;
  stepFreeAccess: boolean;
  accessibleParking: boolean;
  accessibleBathroom: boolean;
  audioVisualAids: boolean;
  serviceAnimalFriendly: boolean;
  details: string[];
}

export interface SafetyInfo {
  crimeRate: number;
  lightingQuality: number;
  emergencyServices: EmergencyService[];
  safetyTips: string[];
}

export interface EmergencyService {
  type: 'police' | 'fire' | 'hospital' | 'pharmacy';
  distance: number;
  responseTime: number;
}

export interface LocalInsights {
  bestTimeToVisit: string[];
  localEvents: LocalEvent[];
  weather: WeatherInfo;
  costOfLiving: CostOfLiving;
  culture: CultureInfo;
}

export interface LocalEvent {
  name: string;
  date: string;
  type: 'festival' | 'market' | 'concert' | 'sports' | 'cultural';
  impact: 'low' | 'medium' | 'high';
}

export interface WeatherInfo {
  season: string;
  averageTemp: number;
  rainfall: number;
  humidity: number;
  uvIndex: number;
}

export interface CostOfLiving {
  restaurant: number;
  grocery: number;
  transport: number;
  entertainment: number;
  comparison: string;
}

export interface CultureInfo {
  languages: string[];
  currency: string;
  tipping: string;
  businessHours: string;
  etiquette: string[];
}

export interface PropertySpecifications {
  buildingType: string;
  yearBuilt: number;
  floors: number;
  rooms: RoomDetails[];
  features: PropertyFeature[];
  utilities: Utility[];
}

export interface RoomDetails {
  type: 'bedroom' | 'bathroom' | 'kitchen' | 'living_room' | 'dining_room' | 'office' | 'other';
  size: number;
  features: string[];
  images: string[];
}

export interface PropertyFeature {
  name: string;
  category: string;
  description: string;
  isHighlight: boolean;
}

export interface Utility {
  type: 'electricity' | 'water' | 'gas' | 'internet' | 'cable' | 'heating' | 'cooling';
  included: boolean;
  cost?: number;
  details?: string;
}

export interface PropertyPolicies {
  checkIn: CheckInPolicy;
  checkOut: CheckOutPolicy;
  cancellation: CancellationPolicy;
  pets: PetPolicy;
  smoking: SmokingPolicy;
  parties: PartyPolicy;
  children: ChildPolicy;
  additional: PolicyRule[];
}

export interface CheckInPolicy {
  timeRange: TimeRange;
  method: 'self' | 'host' | 'keybox' | 'doorman';
  instructions: string;
  lateCheckIn: LatePolicy;
}

export interface TimeRange {
  start: string;
  end: string;
  timezone: string;
}

export interface LatePolicy {
  allowed: boolean;
  fee?: number;
  cutoffTime?: string;
}

export interface CheckOutPolicy {
  time: string;
  instructions: string;
  lateCheckOut: LatePolicy;
}

export interface CancellationPolicy {
  type: 'flexible' | 'moderate' | 'strict' | 'super_strict';
  description: string;
  refundSchedule: RefundSchedule[];
  exceptions: string[];
}

export interface RefundSchedule {
  daysBeforeCheckIn: number;
  refundPercentage: number;
  description: string;
}

export interface PetPolicy {
  allowed: boolean;
  fee?: number;
  restrictions: string[];
  size?: 'small' | 'medium' | 'large' | 'any';
  types?: string[];
}

export interface SmokingPolicy {
  allowed: boolean;
  areas?: string[];
  fee?: number;
}

export interface PartyPolicy {
  allowed: boolean;
  maxGuests?: number;
  fee?: number;
  restrictions: string[];
}

export interface ChildPolicy {
  welcome: boolean;
  ageRestrictions?: string;
  amenities: string[];
  safety: string[];
}

export interface PolicyRule {
  title: string;
  description: string;
  isRequired: boolean;
  fee?: number;
}

export interface PropertyVerification {
  status: 'pending' | 'verified' | 'rejected';
  verifiedAt?: string;
  verifiedBy?: string;
  documents: VerificationDocument[];
  checks: VerificationCheck[];
}

export interface VerificationDocument {
  type: 'ownership' | 'identity' | 'insurance' | 'license';
  status: 'pending' | 'approved' | 'rejected';
  uploadedAt: string;
  expiresAt?: string;
}

export interface VerificationCheck {
  type: 'photo' | 'address' | 'phone' | 'email' | 'identity' | 'background';
  status: 'pending' | 'passed' | 'failed';
  completedAt?: string;
  details?: string;
}

export interface PropertyAnalytics {
  views: number;
  favorites: number;
  bookings: number;
  revenue: number;
  occupancyRate: number;
  averageRating: number;
  responseRate: number;
  conversionRate: number;
  trends: AnalyticsTrend[];
}

export interface AnalyticsTrend {
  metric: string;
  period: string;
  value: number;
  change: number;
  changeDirection: 'up' | 'down' | 'stable';
}

export interface AvailabilityCalendar {
  dates: AvailabilityDate[];
  blockedDates: string[];
  minStay: number;
  maxStay: number;
  turnoverDays: number;
}

export interface AvailabilityDate {
  date: string;
  available: boolean;
  price: number;
  minStay: number;
  checkInAllowed: boolean;
  checkOutAllowed: boolean;
  reason?: string;
}

export interface SeasonalPricing {
  season: 'spring' | 'summer' | 'fall' | 'winter' | 'holiday' | 'peak' | 'off_peak';
  startDate: string;
  endDate: string;
  multiplier: number;
  minStay?: number;
}

export interface DynamicPricing {
  enabled: boolean;
  algorithm: 'demand_based' | 'competition_based' | 'ml_optimized';
  factors: PricingFactor[];
  currentMultiplier: number;
  nextUpdate: string;
}

export interface PricingFactor {
  type: 'demand' | 'competition' | 'events' | 'weather' | 'seasonality';
  weight: number;
  value: number;
  impact: number;
}

export interface Discount {
  type: 'early_bird' | 'last_minute' | 'weekly' | 'monthly' | 'first_time' | 'returning';
  percentage: number;
  minStay?: number;
  validFrom: string;
  validTo: string;
  description: string;
}

export interface Fee {
  type: 'cleaning' | 'service' | 'pet' | 'security_deposit' | 'resort' | 'parking';
  amount: number;
  isPercentage: boolean;
  isRefundable: boolean;
  description: string;
}

export interface Tax {
  type: 'vat' | 'city_tax' | 'tourist_tax' | 'occupancy_tax';
  rate: number;
  isPercentage: boolean;
  description: string;
}

export interface SearchMetadata {
  searchId: string;
  timestamp: string;
  location: Coordinates;
  filters: PropertyFilters;
  resultCount: number;
  searchTime: number;
  suggestions: number;
  personalized: boolean;
}

// Export utility types
export type PropertyFilterKey = keyof PropertyFilters;
export type SortField = SortOption['field'];
export type ViewModeType = ViewMode;
export type PropertyCategory = PropertyType['category'];
  isIncluded: boolean;
  additionalCost?: Price;
}

export interface PropertyAvailability {
  date: string;
  available: boolean;
  price: Price;
  minimumStay: number;
  restrictions?: string[];
}

export interface PropertySearchFilters extends SearchFilters {
  type?: string[];
  amenities?: string[];
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  rooms?: number;
  priceType?: 'per_night' | 'per_person' | 'total';
}

export interface PropertyBookingRequest {
  propertyId: string;
  checkIn: string;
  checkOut: string;
  guests: {
    adults: number;
    children: number;
    infants: number;
  };
  rooms: number;
  specialRequests?: string;
  guestInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  paymentMethod: string;
}

export interface PropertyPricing {
  basePrice: Price;
  taxes: Price;
  fees: Price;
  total: Price;
  breakdown: Array<{
    name: string;
    amount: Price;
    type: 'base' | 'tax' | 'fee' | 'discount';
  }>;
  cancellationPolicy: string;
}

export interface NearbyProperty {
  property: Property;
  distance: number;
  travelTime?: {
    walking: number;
    driving: number;
    transit: number;
  };
}

// Property Management (Admin)
export interface CreatePropertyRequest {
  name: string;
  description: string;
  type: string;
  category: string;
  address: Address;
  amenities: string[];
  policies: Property['policies'];
  contact: Property['contact'];
  features: string[];
  photos?: File[];
}

export interface UpdatePropertyRequest extends Partial<CreatePropertyRequest> {
  isActive?: boolean;
  isFeatured?: boolean;
}

export interface PropertyManagement {
  properties: Property[];
  totalRevenue: Price;
  occupancyRate: number;
  averageRating: number;
  pendingBookings: number;
  recentActivity: PropertyActivity[];
}

export interface PropertyActivity {
  id: string;
  type: 'booking' | 'review' | 'inquiry' | 'update';
  title: string;
  description: string;
  propertyId: string;
  propertyName: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface PropertyAnalytics {
  overview: {
    totalBookings: number;
    totalRevenue: Price;
    averageRating: number;
    occupancyRate: number;
  };
  trends: {
    bookings: Array<{ date: string; count: number; revenue: number }>;
    ratings: Array<{ date: string; rating: number }>;
    occupancy: Array<{ date: string; rate: number }>;
  };
  demographics: {
    countries: Array<{ country: string; percentage: number }>;
    ageGroups: Array<{ group: string; percentage: number }>;
    bookingChannels: Array<{ channel: string; percentage: number }>;
  };
  performance: {
    topPerforming: Property[];
    lowPerforming: Property[];
    seasonal: Array<{ month: string; performance: number }>;
  };
}

// API Response Types
export type PropertySearchResponse = ApiResponse<PaginatedResponse<Property>>;
export type PropertyDetailsResponse = ApiResponse<Property>;
export type PropertyAvailabilityResponse = ApiResponse<PropertyAvailability[]>;
export type PropertyPricingResponse = ApiResponse<PropertyPricing>;
export type PropertyReviewsResponse = ApiResponse<PaginatedResponse<Review>>;
export type PropertyAmenitiesResponse = ApiResponse<Amenity[]>;
export type PropertyPhotosResponse = ApiResponse<Media[]>;
export type NearbyPropertiesResponse = ApiResponse<NearbyProperty[]>;
export type PropertyBookingResponse = ApiResponse<{ bookingId: string; confirmationCode: string }>;
export type PropertyFavoritesResponse = ApiResponse<Property[]>;
export type PropertyManagementResponse = ApiResponse<PropertyManagement>;
export type PropertyAnalyticsResponse = ApiResponse<PropertyAnalytics>;
export type CreatePropertyResponse = ApiResponse<Property>;
export type UpdatePropertyResponse = ApiResponse<Property>;