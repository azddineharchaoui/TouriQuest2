/**
 * Comprehensive Property Detail Experience
 * Converts browsers to bookers with immersive media, dynamic pricing, and social proof
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Heart,
  Share2,
  Star,
  MapPin,
  Calendar,
  Users,
  Wifi,
  Car,
  Coffee,
  Waves,
  Shield,
  Award,
  Clock,
  MessageCircle,
  Camera,
  Play,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  Phone,
  Mail,
  Globe,
  Check,
  X,
  AlertTriangle,
  Info,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Flag,
  MoreHorizontal,
  Navigation,
  Calculator,
  CreditCard,
  Lock,
  Zap,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  Bookmark,
  BookmarkCheck,
  Upload,
  Filter,
  Search,
  MapIcon,
  Building,
  TreePine,
  Mountain,
  Home,
  Utensils,
  ShoppingBag,
  Bus,
  Train,
  Plane,
  GraduationCap,
  Hospital,
  Landmark
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Separator } from '../ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Progress } from '../ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { ScrollArea } from '../ui/scroll-area';
import { Slider } from '../ui/slider';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Calendar as CalendarComponent } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { useSearchStore } from '../../stores/search/searchStore';
import type { 
  PropertySearchResult, 
  PropertyPricing, 
  PropertyReview, 
  PropertyAmenity,
  NearbyPOI,
  Price,
  Address,
  Coordinates,
  Neighborhood
} from '../../types/property-search';

// ====================================
// COMPONENT INTERFACES
// ====================================

interface PropertyDetailProps {
  propertyId?: string;
  className?: string;
}

interface MediaItem {
  id: string;
  type: 'photo' | 'video' | '360' | 'floorplan';
  url: string;
  thumbnail?: string;
  title?: string;
  description?: string;
  room?: string;
  order: number;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    hotspots?: Array<{
      x: number;
      y: number;
      title: string;
      description: string;
    }>;
  };
}

interface BookingState {
  checkIn: Date | null;
  checkOut: Date | null;
  guests: {
    adults: number;
    children: number;
    infants: number;
  };
  step: 'dates' | 'guests' | 'payment' | 'confirmation';
  pricing: PropertyPricing | null;
  loading: boolean;
  errors: Record<string, string>;
}

interface ReviewFilters {
  rating: number | null;
  guestType: string | null;
  stayDuration: string | null;
  purpose: string | null;
  language: string | null;
  sortBy: 'newest' | 'oldest' | 'highest_rating' | 'lowest_rating' | 'most_helpful';
}

// ====================================
// MOCK DATA (Replace with real API calls)
// ====================================

const mockProperty: PropertySearchResult = {
  id: '1',
  title: 'Luxury Beachfront Villa with Private Pool',
  description: 'Experience ultimate luxury in this stunning beachfront villa featuring panoramic ocean views, private infinity pool, and direct beach access. Perfect for couples and families seeking an unforgettable tropical getaway.',
  type: 'villa' as const,
  location: {
    address: {
      street: '123 Ocean Drive',
      city: 'Malibu',
      state: 'California',
      country: 'United States',
      zipCode: '90265',
      formattedAddress: '123 Ocean Drive, Malibu, CA 90265, USA',
      countryCode: 'US',
      stateCode: 'CA',
      displayName: 'Malibu, California'
    } as Address,
    coordinates: { latitude: 34.0259, longitude: -118.7798 } as Coordinates,
    neighborhood: {
      id: 'point-dume',
      name: 'Point Dume',
      description: 'Upscale coastal neighborhood',
      coordinates: { latitude: 34.0259, longitude: -118.7798 },
      walkScore: 75,
      demographics: {
        averageAge: 45,
        medianIncome: 150000,
        population: 5000,
        educationLevel: 'high',
        familyFriendly: true
      }
    } as Neighborhood
  },
  pricing: {
    basePrice: { amount: 850, currency: 'USD', formatted: '$850' } as Price,
    cleaningFee: 150,
    serviceFee: 120,
    taxRate: 0.14,
    currency: 'USD',
    discounts: [
      { type: 'weekly', amount: 0.15, description: '15% off weekly stays' },
      { type: 'monthly', amount: 0.25, description: '25% off monthly stays' }
    ]
  },
  capacity: {
    maxGuests: 8,
    bedrooms: 4,
    bathrooms: 3,
    beds: 5
  },
  amenities: [
    { id: 'wifi', name: 'Wifi', category: 'connectivity', available: true, description: 'High-speed internet' },
    { id: 'pool', name: 'Pool', category: 'recreation', available: true, description: 'Private infinity pool' },
    { id: 'beach_access', name: 'Beach Access', category: 'location', available: true, description: 'Direct beach access' },
    { id: 'parking', name: 'Parking', category: 'convenience', available: true, description: 'Free parking' },
    { id: 'kitchen', name: 'Kitchen', category: 'convenience', available: true, description: 'Full kitchen' },
    { id: 'air_conditioning', name: 'Air Conditioning', category: 'comfort', available: true, description: 'Climate control' }
  ] as PropertyAmenity[],
  images: [
    {
      id: '1',
      url: '/api/placeholder/800/600',
      thumbnailUrl: '/api/placeholder/300/200',
      alt: 'Villa exterior',
      isPrimary: true,
      order: 1,
      type: 'exterior',
      caption: 'Stunning villa exterior'
    },
    {
      id: '2',
      url: '/api/placeholder/800/600',
      thumbnailUrl: '/api/placeholder/300/200',
      alt: 'Living room',
      isPrimary: false,
      order: 2,
      type: 'interior',
      caption: 'Spacious living room'
    },
    {
      id: '3',
      url: '/api/placeholder/800/600',
      thumbnailUrl: '/api/placeholder/300/200',
      alt: 'Master bedroom',
      isPrimary: false,
      order: 3,
      type: 'bedroom',
      caption: 'Master bedroom with ocean view'
    },
    {
      id: '4',
      url: '/api/placeholder/800/600',
      thumbnailUrl: '/api/placeholder/300/200',
      alt: 'Kitchen',
      isPrimary: false,
      order: 4,
      type: 'kitchen',
      caption: 'Modern kitchen'
    },
    {
      id: '5',
      url: '/api/placeholder/800/600',
      thumbnailUrl: '/api/placeholder/300/200',
      alt: 'Pool area',
      isPrimary: false,
      order: 5,
      type: 'amenity',
      caption: 'Infinity pool area'
    }
  ],
  host: {
    id: 'host1',
    name: 'Sarah Johnson',
    avatar: '/api/placeholder/150/150',
    isSuperhost: true,
    responseRate: 98,
    responseTime: 'within_hour',
    joinDate: new Date('2019-03-15'),
    reviewCount: 247,
    rating: 4.9
  },
  rating: 4.8,
  reviewCount: 156,
  availability: {
    calendar: 'available',
    instantBook: true,
    minStay: 3,
    maxStay: 30,
    checkInTime: '15:00',
    checkOutTime: '11:00'
  },
  verified: true,
  tags: ['beachfront', 'luxury', 'family_friendly', 'pet_friendly'],
  lastUpdated: new Date(),
  features: ['ocean_view', 'private_pool', 'direct_beach_access'],
  policies: {
    cancellation: 'flexible',
    houseRules: ['No smoking', 'No parties', 'Check-in after 3pm'],
    additionalInfo: 'Perfect for families and couples'
  },
  reviews: {
    overall: 4.8,
    breakdown: {
      cleanliness: 4.9,
      accuracy: 4.8,
      checkin: 4.7,
      communication: 4.9,
      location: 4.8,
      value: 4.6
    },
    count: 156,
    recent: []
  },
  distance: 0,
  searchScore: 0.95,
  isSponsored: false
};

const mockMediaItems: MediaItem[] = [
  {
    id: '1',
    type: 'photo',
    url: '/api/placeholder/1200/800',
    thumbnail: '/api/placeholder/300/200',
    title: 'Villa Exterior',
    description: 'Stunning oceanfront villa with modern architecture',
    order: 1
  },
  {
    id: '2',
    type: 'video',
    url: '/api/placeholder/1200/800',
    thumbnail: '/api/placeholder/300/200',
    title: 'Villa Tour',
    description: 'Complete walkthrough of the property',
    order: 2,
    metadata: { duration: 180 }
  },
  {
    id: '3',
    type: '360',
    url: '/api/placeholder/1200/800',
    thumbnail: '/api/placeholder/300/200',
    title: 'Living Room 360°',
    description: 'Immersive 360° view of the main living area',
    order: 3,
    metadata: {
      hotspots: [
        { x: 30, y: 60, title: 'Ocean View', description: 'Panoramic ocean views' },
        { x: 70, y: 40, title: 'Fireplace', description: 'Cozy stone fireplace' }
      ]
    }
  }
];

const mockReviews: PropertyReview[] = [
  {
    id: '1',
    guestId: 'guest1',
    guestName: 'Emily Chen',
    guestAvatar: '/api/placeholder/100/100',
    rating: 5,
    title: 'Absolutely Perfect!',
    content: 'This villa exceeded all expectations. The ocean views are breathtaking, and the private pool was perfect for our family. Sarah was an incredible host - responsive and helpful throughout our stay.',
    date: new Date('2024-02-15'),
    stayDuration: 7,
    guestType: 'family',
    purpose: 'leisure',
    helpful: 23,
    photos: ['/api/placeholder/200/150', '/api/placeholder/200/150'],
    verified: true,
    hostResponse: {
      content: 'Thank you so much, Emily! It was a pleasure hosting your family.',
      date: new Date('2024-02-16')
    }
  }
];

// ====================================
// MAIN COMPONENT
// ====================================

export const PropertyDetail: React.FC<PropertyDetailProps> = ({
  propertyId,
  className = ""
}) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentPropertyId = propertyId || id;

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const bookingWidgetRef = useRef<HTMLDivElement>(null);

  // Store
  const { addToFavorites, removeFromFavorites, favorites } = useSearchStore();

  // State
  const [property, setProperty] = useState<PropertySearchResult>(mockProperty);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(mockMediaItems);
  const [reviews, setReviews] = useState<PropertyReview[]>(mockReviews);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [reviewFilters, setReviewFilters] = useState<ReviewFilters>({
    rating: null,
    guestType: null,
    stayDuration: null,
    purpose: null,
    language: null,
    sortBy: 'newest'
  });

  const [bookingState, setBookingState] = useState<BookingState>({
    checkIn: null,
    checkOut: null,
    guests: { adults: 2, children: 0, infants: 0 },
    step: 'dates',
    pricing: null,
    loading: false,
    errors: {}
  });

  // Scroll animations
  const { scrollY } = useScroll();
  const bookingWidgetY = useTransform(scrollY, [300, 400], [0, -100]);

  // Computed values
  const isFavorited = useMemo(() => 
    favorites.some(fav => fav.id === currentPropertyId), 
    [favorites, currentPropertyId]
  );

  const totalGuests = useMemo(() => 
    bookingState.guests.adults + bookingState.guests.children,
    [bookingState.guests]
  );

  const nightsCount = useMemo(() => {
    if (!bookingState.checkIn || !bookingState.checkOut) return 0;
    const diffTime = Math.abs(bookingState.checkOut.getTime() - bookingState.checkIn.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, [bookingState.checkIn, bookingState.checkOut]);

  // ====================================
  // EVENT HANDLERS
  // ====================================

  const handleFavoriteToggle = useCallback(() => {
    if (isFavorited) {
      removeFromFavorites(currentPropertyId!);
    } else {
      addToFavorites(property);
    }
  }, [isFavorited, currentPropertyId, property, addToFavorites, removeFromFavorites]);

  const handleMediaSelect = useCallback((index: number) => {
    setSelectedMediaIndex(index);
  }, []);

  const handleGalleryOpen = useCallback((index: number = 0) => {
    setSelectedMediaIndex(index);
    setIsGalleryModalOpen(true);
  }, []);

  const handleBookingStep = useCallback((step: BookingState['step']) => {
    setBookingState(prev => ({ ...prev, step }));
  }, []);

  const handleDateSelect = useCallback((date: Date, type: 'checkIn' | 'checkOut') => {
    setBookingState(prev => ({
      ...prev,
      [type]: date,
      errors: { ...prev.errors, [type]: '' }
    }));
  }, []);

  const handleGuestCountChange = useCallback((type: keyof BookingState['guests'], value: number) => {
    setBookingState(prev => ({
      ...prev,
      guests: { ...prev.guests, [type]: Math.max(0, value) }
    }));
  }, []);

  // ====================================
  // RENDER FUNCTIONS
  // ====================================

  const renderMediaGallery = () => (
    <div className="relative">
      {/* Main image */}
      <div className="relative h-96 lg:h-[500px] rounded-2xl overflow-hidden group cursor-pointer">
        <motion.img
          src={mediaItems[selectedMediaIndex]?.url || property.images[0]?.url}
          alt={mediaItems[selectedMediaIndex]?.title || property.title}
          className="w-full h-full object-cover"
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.3 }}
          onClick={() => handleGalleryOpen(selectedMediaIndex)}
        />
        
        {/* Overlay controls */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300">
          <div className="absolute top-4 right-4 flex space-x-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleFavoriteToggle}
              className="bg-white/90 hover:bg-white"
            >
              <Heart className={`w-4 h-4 ${isFavorited ? 'fill-red-500 text-red-500' : ''}`} />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="bg-white/90 hover:bg-white"
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </div>

          <div className="absolute bottom-4 right-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleGalleryOpen()}
              className="bg-white/90 hover:bg-white"
            >
              <Camera className="w-4 h-4 mr-2" />
              View all {mediaItems.length} photos
            </Button>
          </div>
        </div>

        {/* Media type indicator */}
        {mediaItems[selectedMediaIndex]?.type !== 'photo' && (
          <div className="absolute top-4 left-4">
            <Badge variant="secondary" className="bg-white/90">
              {mediaItems[selectedMediaIndex]?.type === 'video' && <Play className="w-3 h-3 mr-1" />}
              {mediaItems[selectedMediaIndex]?.type === '360' && <Eye className="w-3 h-3 mr-1" />}
              {mediaItems[selectedMediaIndex]?.type === 'floorplan' && <Building className="w-3 h-3 mr-1" />}
              {mediaItems[selectedMediaIndex]?.type === 'video' && 'Video Tour'}
              {mediaItems[selectedMediaIndex]?.type === '360' && '360° View'}
              {mediaItems[selectedMediaIndex]?.type === 'floorplan' && 'Floor Plan'}
            </Badge>
          </div>
        )}
      </div>

      {/* Thumbnail navigation */}
      <div className="mt-4 flex space-x-2 overflow-x-auto pb-2">
        {mediaItems.slice(0, 6).map((item, index) => (
          <button
            key={item.id}
            onClick={() => handleMediaSelect(index)}
            className={`
              relative flex-shrink-0 w-20 h-16 rounded-lg overflow-hidden border-2 transition-all
              ${selectedMediaIndex === index 
                ? 'border-blue-500 ring-2 ring-blue-200' 
                : 'border-gray-200 hover:border-gray-300'
              }
            `}
          >
            <img
              src={item.thumbnail || item.url}
              alt={item.title}
              className="w-full h-full object-cover"
            />
            {item.type !== 'photo' && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                {item.type === 'video' && <Play className="w-4 h-4 text-white" />}
                {item.type === '360' && <Eye className="w-4 h-4 text-white" />}
                {item.type === 'floorplan' && <Building className="w-4 h-4 text-white" />}
              </div>
            )}
          </button>
        ))}
        {mediaItems.length > 6 && (
          <button
            onClick={() => handleGalleryOpen()}
            className="flex-shrink-0 w-20 h-16 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 flex items-center justify-center text-gray-500 hover:text-gray-700"
          >
            <span className="text-xs font-medium">+{mediaItems.length - 6}</span>
          </button>
        )}
      </div>
    </div>
  );

  const renderPropertyHeader = () => (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {property.title}
          </h1>
          <div className="flex items-center space-x-4 mt-2 text-gray-600 dark:text-gray-300">
            <div className="flex items-center space-x-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="font-medium">{property.rating}</span>
              <span>({property.reviewCount} reviews)</span>
            </div>
            <div className="flex items-center space-x-1">
              <MapPin className="w-4 h-4" />
              <span>{property.location.city}, {property.location.state}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {property.host.isSuperhost && (
            <Badge variant="default" className="bg-gradient-to-r from-purple-600 to-pink-600">
              <Award className="w-3 h-3 mr-1" />
              Superhost
            </Badge>
          )}
          {property.verified && (
            <Badge variant="secondary">
              <Shield className="w-3 h-3 mr-1" />
              Verified
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-6 text-sm text-gray-600 dark:text-gray-300">
        <div className="flex items-center space-x-1">
          <Users className="w-4 h-4" />
          <span>{property.capacity.maxGuests} guests</span>
        </div>
        <div className="flex items-center space-x-1">
          <Home className="w-4 h-4" />
          <span>{property.capacity.bedrooms} bedrooms</span>
        </div>
        <div className="flex items-center space-x-1">
          <Building className="w-4 h-4" />
          <span>{property.capacity.bathrooms} bathrooms</span>
        </div>
        {property.availability.instantBook && (
          <div className="flex items-center space-x-1">
            <Zap className="w-4 h-4 text-green-600" />
            <span className="text-green-600 font-medium">Instant Book</span>
          </div>
        )}
      </div>
    </div>
  );

  const renderStickyBookingWidget = () => (
    <motion.div
      ref={bookingWidgetRef}
      style={{ y: bookingWidgetY }}
      className="fixed bottom-6 right-6 z-50 lg:hidden"
    >
      <Card className="w-80 shadow-2xl">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-2xl font-bold">${property.pricing.basePrice}</span>
              <span className="text-gray-500 ml-1">/ night</span>
            </div>
            <div className="flex items-center space-x-1 text-sm">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span>{property.rating}</span>
            </div>
          </div>
          
          <Button 
            onClick={() => setIsBookingModalOpen(true)}
            className="w-full"
            size="lg"
          >
            Reserve
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );

  const renderBookingWidget = () => (
    <Card className="sticky top-6">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <span className="text-3xl font-bold">${property.pricing.basePrice}</span>
            <span className="text-gray-500 ml-1">/ night</span>
          </div>
          <div className="flex items-center space-x-1 text-sm">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="font-medium">{property.rating}</span>
            <span className="text-gray-500">({property.reviewCount})</span>
          </div>
        </div>

        <div className="space-y-4">
          {/* Date selection */}
          <div className="grid grid-cols-2 gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left">
                  <Calendar className="w-4 h-4 mr-2" />
                  {bookingState.checkIn ? bookingState.checkIn.toLocaleDateString() : 'Check-in'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent
                  mode="single"
                  selected={bookingState.checkIn || undefined}
                  onSelect={(date) => date && handleDateSelect(date, 'checkIn')}
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left">
                  <Calendar className="w-4 h-4 mr-2" />
                  {bookingState.checkOut ? bookingState.checkOut.toLocaleDateString() : 'Check-out'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent
                  mode="single"
                  selected={bookingState.checkOut || undefined}
                  onSelect={(date) => date && handleDateSelect(date, 'checkOut')}
                  disabled={(date) => date < new Date() || (bookingState.checkIn && date <= bookingState.checkIn)}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Guest selection */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                <Users className="w-4 h-4 mr-2" />
                {totalGuests} guest{totalGuests !== 1 ? 's' : ''}
                {bookingState.guests.infants > 0 && `, ${bookingState.guests.infants} infant${bookingState.guests.infants !== 1 ? 's' : ''}`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Adults</div>
                    <div className="text-sm text-gray-500">Ages 13 or above</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleGuestCountChange('adults', bookingState.guests.adults - 1)}
                      disabled={bookingState.guests.adults <= 1}
                    >
                      -
                    </Button>
                    <span className="w-8 text-center">{bookingState.guests.adults}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleGuestCountChange('adults', bookingState.guests.adults + 1)}
                      disabled={totalGuests >= property.capacity.maxGuests}
                    >
                      +
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Children</div>
                    <div className="text-sm text-gray-500">Ages 2-12</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleGuestCountChange('children', bookingState.guests.children - 1)}
                      disabled={bookingState.guests.children <= 0}
                    >
                      -
                    </Button>
                    <span className="w-8 text-center">{bookingState.guests.children}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleGuestCountChange('children', bookingState.guests.children + 1)}
                      disabled={totalGuests >= property.capacity.maxGuests}
                    >
                      +
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Infants</div>
                    <div className="text-sm text-gray-500">Under 2</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleGuestCountChange('infants', bookingState.guests.infants - 1)}
                      disabled={bookingState.guests.infants <= 0}
                    >
                      -
                    </Button>
                    <span className="w-8 text-center">{bookingState.guests.infants}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleGuestCountChange('infants', bookingState.guests.infants + 1)}
                      disabled={bookingState.guests.infants >= 5}
                    >
                      +
                    </Button>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Reserve button */}
          <Button 
            className="w-full"
            size="lg"
            onClick={() => setIsBookingModalOpen(true)}
            disabled={!bookingState.checkIn || !bookingState.checkOut}
          >
            Reserve
          </Button>

          {/* Pricing breakdown */}
          {nightsCount > 0 && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>${property.pricing.basePrice} × {nightsCount} nights</span>
                <span>${property.pricing.basePrice * nightsCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Cleaning fee</span>
                <span>${property.pricing.cleaningFee}</span>
              </div>
              <div className="flex justify-between">
                <span>Service fee</span>
                <span>${property.pricing.serviceFee}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>${(property.pricing.basePrice * nightsCount) + property.pricing.cleaningFee + property.pricing.serviceFee}</span>
              </div>
            </div>
          )}

          <div className="text-center text-sm text-gray-500">
            You won't be charged yet
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // ====================================
  // MAIN RENDER
  // ====================================

  return (
    <div ref={containerRef} className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Media gallery */}
            {renderMediaGallery()}

            {/* Property header */}
            {renderPropertyHeader()}

            {/* Property tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="amenities">Amenities</TabsTrigger>
                <TabsTrigger value="location">Location</TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
                <TabsTrigger value="host">Host</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold mb-4">About this place</h3>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                      {property.description}
                    </p>
                    
                    <div className="mt-6 grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h4 className="font-medium">Property type</h4>
                        <p className="text-gray-600 dark:text-gray-300 capitalize">{property.type}</p>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-medium">Check-in</h4>
                        <p className="text-gray-600 dark:text-gray-300">{property.availability.checkInTime}</p>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-medium">Check-out</h4>
                        <p className="text-gray-600 dark:text-gray-300">{property.availability.checkOutTime}</p>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-medium">Minimum stay</h4>
                        <p className="text-gray-600 dark:text-gray-300">{property.availability.minStay} nights</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="amenities" className="mt-6">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold mb-4">What this place offers</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {property.amenities.map((amenity) => (
                        <div key={amenity} className="flex items-center space-x-3">
                          <Wifi className="w-5 h-5 text-gray-400" />
                          <span className="capitalize">{amenity.replace('_', ' ')}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="location" className="mt-6">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold mb-4">Where you'll be</h3>
                    <div className="aspect-video bg-gray-200 dark:bg-gray-700 rounded-lg mb-4 flex items-center justify-center">
                      <MapIcon className="w-12 h-12 text-gray-400" />
                      <span className="ml-2 text-gray-500">Interactive map would be here</span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300">
                      {property.location.address}
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="reviews" className="mt-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-semibold">
                        <Star className="w-5 h-5 inline mr-2 fill-yellow-400 text-yellow-400" />
                        {property.rating} · {property.reviewCount} reviews
                      </h3>
                      <Button variant="outline" size="sm">
                        <Filter className="w-4 h-4 mr-2" />
                        Filter
                      </Button>
                    </div>

                    <div className="space-y-6">
                      {reviews.map((review) => (
                        <div key={review.id} className="border-b border-gray-200 dark:border-gray-700 pb-6 last:border-0">
                          <div className="flex items-start space-x-3">
                            <Avatar>
                              <AvatarImage src={review.guestAvatar} />
                              <AvatarFallback>{review.guestName[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <span className="font-medium">{review.guestName}</span>
                                <div className="flex items-center space-x-1">
                                  {[...Array(5)].map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`w-4 h-4 ${
                                        i < review.rating 
                                          ? 'fill-yellow-400 text-yellow-400' 
                                          : 'text-gray-300'
                                      }`}
                                    />
                                  ))}
                                </div>
                                <span className="text-sm text-gray-500">
                                  {review.date.toLocaleDateString()}
                                </span>
                              </div>
                              
                              <h4 className="font-medium mb-2">{review.title}</h4>
                              <p className="text-gray-600 dark:text-gray-300 mb-3">
                                {review.content}
                              </p>

                              {review.photos && review.photos.length > 0 && (
                                <div className="flex space-x-2 mb-3">
                                  {review.photos.map((photo, index) => (
                                    <img
                                      key={index}
                                      src={photo}
                                      alt={`Review photo ${index + 1}`}
                                      className="w-16 h-16 rounded-lg object-cover"
                                    />
                                  ))}
                                </div>
                              )}

                              <div className="flex items-center space-x-4 text-sm text-gray-500">
                                <button className="flex items-center space-x-1 hover:text-gray-700">
                                  <ThumbsUp className="w-4 h-4" />
                                  <span>Helpful ({review.helpful})</span>
                                </button>
                                <button className="hover:text-gray-700">Report</button>
                              </div>

                              {review.hostResponse && (
                                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <Avatar className="w-6 h-6">
                                      <AvatarImage src={property.host.avatar} />
                                      <AvatarFallback>{property.host.name[0]}</AvatarFallback>
                                    </Avatar>
                                    <span className="font-medium text-sm">{property.host.name}</span>
                                    <span className="text-xs text-gray-500">
                                      {review.hostResponse.date.toLocaleDateString()}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-600 dark:text-gray-300">
                                    {review.hostResponse.content}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="host" className="mt-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <Avatar className="w-16 h-16">
                        <AvatarImage src={property.host.avatar} />
                        <AvatarFallback>{property.host.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-xl font-semibold">{property.host.name}</h3>
                          {property.host.isSuperhost && (
                            <Badge variant="default" className="bg-gradient-to-r from-purple-600 to-pink-600">
                              <Award className="w-3 h-3 mr-1" />
                              Superhost
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-300">
                          <div>
                            <div className="font-medium">Response rate</div>
                            <div>{property.host.responseRate}%</div>
                          </div>
                          <div>
                            <div className="font-medium">Response time</div>
                            <div className="capitalize">{property.host.responseTime.replace('_', ' ')}</div>
                          </div>
                          <div>
                            <div className="font-medium">Reviews</div>
                            <div>{property.host.reviewCount}</div>
                          </div>
                          <div>
                            <div className="font-medium">Hosting since</div>
                            <div>{property.host.joinDate.getFullYear()}</div>
                          </div>
                        </div>

                        <div className="mt-4 space-x-2">
                          <Button variant="outline" size="sm">
                            <MessageCircle className="w-4 h-4 mr-2" />
                            Contact host
                          </Button>
                          <Button variant="outline" size="sm">
                            <Shield className="w-4 h-4 mr-2" />
                            View profile
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Booking sidebar */}
          <div className="hidden lg:block">
            {renderBookingWidget()}
          </div>
        </div>
      </div>

      {/* Mobile sticky booking widget */}
      {renderStickyBookingWidget()}

      {/* Gallery modal */}
      <Dialog open={isGalleryModalOpen} onOpenChange={setIsGalleryModalOpen}>
        <DialogContent className="max-w-6xl h-[90vh]">
          <DialogHeader>
            <DialogTitle>Property Gallery</DialogTitle>
          </DialogHeader>
          <div className="flex-1 flex items-center justify-center bg-black rounded-lg overflow-hidden">
            <img
              src={mediaItems[selectedMediaIndex]?.url}
              alt={mediaItems[selectedMediaIndex]?.title}
              className="max-w-full max-h-full object-contain"
            />
          </div>
          <div className="flex space-x-2 overflow-x-auto">
            {mediaItems.map((item, index) => (
              <button
                key={item.id}
                onClick={() => setSelectedMediaIndex(index)}
                className={`
                  flex-shrink-0 w-16 h-12 rounded overflow-hidden border-2
                  ${selectedMediaIndex === index ? 'border-blue-500' : 'border-gray-300'}
                `}
              >
                <img
                  src={item.thumbnail || item.url}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Booking modal */}
      <Dialog open={isBookingModalOpen} onOpenChange={setIsBookingModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reserve {property.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="text-center">
              <span className="text-3xl font-bold">${property.pricing.basePrice}</span>
              <span className="text-gray-500 ml-1">/ night</span>
            </div>
            
            {/* Booking flow would go here */}
            <div className="text-center py-8 text-gray-500">
              Booking flow implementation would go here
            </div>
            
            <Button className="w-full" size="lg">
              Confirm and pay
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};