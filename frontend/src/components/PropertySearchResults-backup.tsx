import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { propertyService, PropertySearchRequest } from '../services/propertyService';
import { Property, PropertySearchFilters, SavedSearch } from '../types/api-types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Slider } from './ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Switch } from './ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { toast } from './ui/use-toast';
import { 
  Search, 
  MapPin, 
  Calendar, 
  Users, 
  Star,
  Heart,
  Filter,
  Grid3X3,
  List,
  Map,
  Wifi,
  Car,
  Coffee,
  Waves,
  Utensils,
  Dumbbell,
  ArrowUpDown,
  Eye,
  Share2,
  ChevronLeft,
  ChevronRight,
  Leaf,
  Shield,
  Clock,
  Navigation,
  X,
  SlidersHorizontal,
  Bath,
  Tv,
  Wind,
  Mountain,
  Accessibility,
  Dog,
  Cigarette,
  CigaretteOff,
  Volume2,
  VolumeX,
  Sparkles,
  BookmarkPlus,
  TrendingUp,
  TrendingDown,
  Percent,
  CalendarCheck,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Timer,
  DollarSign,
  Zap,
  Award,
  MapPinIcon,
  Navigation2
} from 'lucide-react';
import { 
  Search, 
  MapPin, 
  Calendar, 
  Users, 
  Star,
  Heart,
  Filter,
  Grid3X3,
  List,
  Map,
  Wifi,
  Car,
  Coffee,
  Waves,
  Utensils,
  Dumbbell,
  ArrowUpDown,
  Eye,
  Share2,
  ChevronLeft,
  ChevronRight,
  Leaf,
  Shield,
  Clock,
  Navigation,
  X,
  SlidersHorizontal,
  Bath,
  Tv,
  Wind,
  Mountain,
  Accessibility,
  Dog,
  Cigarette,
  CigaretteOff,
  Volume2,
  VolumeX,
  Sparkles,
  BookmarkPlus,
  TrendingUp,
  TrendingDown,
  Percent,
  CalendarCheck,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Timer,
  DollarSign,
  Zap,
  Award,
  MapPinIcon,
  Navigation2
} from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { PropertyMapView } from './PropertyMapView';
import { PropertyCard } from './PropertyCard';
import { SavedSearches } from './SavedSearches';
import { PriceComparisonWidget } from './PriceComparisonWidget';

// Enhanced interfaces for backend integration
interface ExtendedPropertySearchFilters extends PropertySearchFilters {
  priceMin?: number;
  priceMax?: number;
  propertyType?: string[];
  amenities?: string[];
  rating?: number;
  distance?: number;
  instantBook?: boolean;
  superhost?: boolean;
  isEcoFriendly?: boolean;
  accessibility?: boolean;
  petFriendly?: boolean;
  smoking?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'price' | 'rating' | 'distance' | 'popularity';
  sortOrder?: 'asc' | 'desc';
}

interface PriceComparison {
  averagePrice: number;
  priceRange: [number, number];
  dealCount: number;
  priceChangePercentage: number;
}

interface ViewMode {
  type: 'grid' | 'list' | 'map';
  density: 'compact' | 'normal' | 'spacious';
}

// Enhanced component with full backend integration
const PropertySearchResults: React.FC = () => {
  const dispatch = useAppDispatch();
  const { 
    searchResults, 
    searchLoading, 
    searchError, 
    favorites, 
    recentlyViewed,
    searchFilters 
  } = useAppSelector(selectPropertyState);

  // State management for UI
  const [filters, setFilters] = useState<PropertySearchFilters>({
    location: '',
    checkIn: '',
    checkOut: '',
    guests: 2,
    priceMin: 0,
    priceMax: 1000,
    propertyType: [],
    amenities: [],
    rating: 0,
    distance: 25,
    page: 1,
    limit: 20,
    sortBy: 'popularity',
    sortOrder: 'desc'
  });

  const [viewMode, setViewMode] = useState<ViewMode>({
    type: 'grid',
    density: 'normal'
  });

  const [showFilters, setShowFilters] = useState(false);
  const [showSavedSearches, setShowSavedSearches] = useState(false);
  const [showPriceComparison, setShowPriceComparison] = useState(false);
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Search function with debouncing
  const debouncedSearch = useCallback(
    debounce((searchFilters: PropertySearchFilters) => {
      dispatch(searchProperties(searchFilters));
    }, 500),
    [dispatch]
  );

  // Effect for auto-search when filters change
  useEffect(() => {
    if (filters.location || filters.checkIn || filters.checkOut) {
      debouncedSearch(filters);
    }
  }, [filters, debouncedSearch]);

  // Handle search form submission
  const handleSearch = useCallback(async () => {
    const searchFilters = {
      ...filters,
      location: searchQuery || filters.location,
      page: 1
    };
    
    try {
      await dispatch(searchProperties(searchFilters)).unwrap();
      
      // Save search query for autocomplete
      if (searchQuery) {
        localStorage.setItem(
          'recent_searches', 
          JSON.stringify([
            searchQuery,
            ...JSON.parse(localStorage.getItem('recent_searches') || '[]').slice(0, 4)
          ])
        );
      }
    } catch (error) {
      toast({
        title: 'Search Failed',
        description: 'Unable to search properties. Please try again.',
        variant: 'destructive'
      });
    }
  }, [dispatch, filters, searchQuery]);

  // Handle favorite toggle
  const handleFavoriteToggle = useCallback(async (propertyId: string, isFavorite: boolean) => {
    try {
      await dispatch(togglePropertyFavorite({ 
        id: propertyId, 
        action: isFavorite ? 'remove' : 'add' 
      })).unwrap();
      
      toast({
        title: isFavorite ? 'Removed from Favorites' : 'Added to Favorites',
        description: isFavorite ? 'Property removed from your favorites' : 'Property added to your favorites'
      });
    } catch (error) {
      toast({
        title: 'Action Failed',
        description: 'Unable to update favorites. Please try again.',
        variant: 'destructive'
      });
    }
  }, [dispatch]);

  // Handle property view tracking
  const handlePropertyView = useCallback(async (propertyId: string) => {
    dispatch(addToRecentlyViewed(propertyId));
  }, [dispatch]);

  // Save current search
  const handleSaveSearch = useCallback(async () => {
    const searchName = prompt('Enter a name for this search:');
    if (searchName) {
      try {
        await dispatch(saveSearch({
          name: searchName,
          filters,
          alertsEnabled: true
        })).unwrap();
        
        toast({
          title: 'Search Saved',
          description: 'You will be notified of new matching properties'
        });
      } catch (error) {
        toast({
          title: 'Save Failed',
          description: 'Unable to save search. Please try again.',
          variant: 'destructive'
        });
      }
    }
  }, [dispatch, filters]);

  // Load more properties (infinite scroll)
  const handleLoadMore = useCallback(() => {
    setFilters(prev => ({
      ...prev,
      page: (prev.page || 1) + 1
    }));
  }, []);

  // Filter properties based on current criteria
  const filteredProperties = useMemo(() => {
    return searchResults.filter(property => {
      // Apply client-side filters for instant feedback
      if (filters.rating && property.rating < filters.rating) return false;
      if (filters.instantBook && !property.instantBook) return false;
      if (filters.isEcoFriendly && !property.isEcoFriendly) return false;
      if (filters.accessibility && !property.accessibility) return false;
      if (filters.petFriendly !== undefined && property.petFriendly !== filters.petFriendly) return false;
      
      return true;
    });
  }, [searchResults, filters]);

  // Sort properties
  const sortedProperties = useMemo(() => {
    const sorted = [...filteredProperties];
    
    switch (filters.sortBy) {
      case 'price':
        return sorted.sort((a, b) => 
          filters.sortOrder === 'asc' ? a.price - b.price : b.price - a.price
        );
      case 'rating':
        return sorted.sort((a, b) => 
          filters.sortOrder === 'asc' ? a.rating - b.rating : b.rating - a.rating
        );
      case 'distance':
        return sorted.sort((a, b) => 
          filters.sortOrder === 'asc' 
            ? (a.distance || 0) - (b.distance || 0)
            : (b.distance || 0) - (a.distance || 0)
        );
      default:
        return sorted;
    }
  }, [filteredProperties, filters.sortBy, filters.sortOrder]);

  // Price comparison data
  const priceComparison = useMemo((): PriceComparison => {
    const prices = sortedProperties.map(p => p.price);
    const dealsCount = sortedProperties.filter(p => p.dealType).length;
    
    return {
      averagePrice: prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0,
      priceRange: [Math.min(...prices) || 0, Math.max(...prices) || 0],
      dealCount: dealsCount,
      priceChangePercentage: 0 // Would come from backend analytics
    };
  }, [sortedProperties]);

  // Debounce utility
  function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

const amenityIcons = {
  wifi: Wifi,
  pool: Waves,
  parking: Car,
  kitchen: Coffee,
  gym: Dumbbell,
  spa: Heart,
  restaurant: Utensils,
  tv: Tv,
  aircon: Wind,
  balcony: Mountain,
  bath: Bath,
  minibar: Coffee,
  'mountain-view': Mountain,
  fireplace: Sparkles
};

const sortOptions = [
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'distance', label: 'Distance from Center' },
  { value: 'eco-score', label: 'Eco-Friendliness' }
];

const currencies = ['USD', 'EUR', 'GBP', 'JPY'];

interface PropertySearchResultsProps {
  onPropertySelect: (property: Property) => void;
  onBackToSearch?: () => void;
}

export function PropertySearchResults({ onPropertySelect, onBackToSearch }: PropertySearchResultsProps) {
  // Redux state
  const dispatch = useDispatch();
  const { 
    searchResults, 
    loading, 
    error, 
    favorites, 
    recentlyViewed, 
    savedSearches,
    currentSearch 
  } = useSelector((state: RootState) => state.properties);

  // Local state
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showFilters, setShowFilters] = useState(true);
  const [sortBy, setSortBy] = useState('price-low');
  const [currency, setCurrency] = useState('USD');
  const [priceRange, setPriceRange] = useState([0, 1000]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showPriceComparison, setShowPriceComparison] = useState(false);
  
  const [filters, setFilters] = useState<PropertySearchFilters>({
    propertyTypes: [],
    amenities: [],
    priceRange: [0, 1000],
    minRating: 0,
    bedrooms: 0,
    bathrooms: 0,
    maxDistance: 50,
    isEcoFriendly: false,
    instantBook: false,
    petFriendly: false,
    accessibility: false,
    hostType: 'any'
  });

  // Search queries
  const searchPropertiesQuery = useQuery({
    queryKey: ['properties', currentSearch, filters, sortBy],
    queryFn: () => propertyService.searchProperties({
      ...currentSearch,
      ...filters,
      sortBy
    }),
    enabled: !!currentSearch,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const priceComparisonQuery = useQuery({
    queryKey: ['price-comparison', currentSearch?.destination],
    queryFn: () => propertyService.getPriceComparison({
      destination: currentSearch?.destination || '',
      checkIn: currentSearch?.checkIn || new Date(),
      checkOut: currentSearch?.checkOut || new Date(),
      guests: currentSearch?.guests || 1
    }),
    enabled: !!currentSearch?.destination && showPriceComparison,
  });

  // Memoized filtered and sorted results
  const filteredAndSortedProperties = useMemo(() => {
    if (!searchPropertiesQuery.data?.results) return [];
    
    let filtered = searchPropertiesQuery.data.results.filter(property => {
      // Price range filter
      if (property.price < priceRange[0] || property.price > priceRange[1]) {
        return false;
      }
      
      // Additional filters
      if (filters.isEcoFriendly && !property.isEcoFriendly) return false;
      if (filters.instantBook && !property.instantBook) return false;
      if (filters.petFriendly && !property.petFriendly) return false;
      if (filters.accessibility && !property.accessibility) return false;
      
      return true;
    });

    // Sort properties
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'rating':
          return b.rating - a.rating;
        case 'distance':
          return a.distance - b.distance;
        case 'eco-score':
          return (b.isEcoFriendly ? 1 : 0) - (a.isEcoFriendly ? 1 : 0);
        default:
          return 0;
      }
    });
  }, [searchPropertiesQuery.data?.results, priceRange, filters, sortBy]);

  // Debounced search handler
  const debouncedSearch = useMemo(
    () => debounce((searchFilters: PropertySearchFilters) => {
      if (currentSearch) {
        dispatch(searchProperties({ ...currentSearch, ...searchFilters }));
      }
    }, 500),
    [dispatch, currentSearch]
  );

  // Effect to trigger search when filters change
  useEffect(() => {
    debouncedSearch(filters);
  }, [filters, debouncedSearch]);

  // Handlers
  const handlePropertyClick = useCallback((property: Property) => {
    dispatch(addToRecentlyViewed(property));
    onPropertySelect(property);
  }, [dispatch, onPropertySelect]);

  const handleToggleFavorite = useCallback(async (property: Property) => {
    try {
      if (favorites.some(fav => fav.id === property.id)) {
        await propertyService.removeFromFavorites(property.id);
        dispatch(removeFromFavorites(property.id));
      } else {
        await propertyService.addToFavorites(property.id);
        dispatch(addToFavorites(property));
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  }, [dispatch, favorites]);

  const handleSaveSearch = useCallback(async () => {
    if (!currentSearch) return;
    
    try {
      const savedSearch: SavedSearch = {
        id: Date.now().toString(),
        name: `Search in ${currentSearch.destination}`,
        filters: { ...currentSearch, ...filters },
        createdAt: new Date(),
        alertsEnabled: false
      };
      
      await propertyService.saveSearch(savedSearch);
      dispatch(addSavedSearch(savedSearch));
    } catch (error) {
      console.error('Error saving search:', error);
    }
  }, [dispatch, currentSearch, filters]);

  const handleLoadMore = useCallback(() => {
    if (searchPropertiesQuery.data?.hasMore && !searchPropertiesQuery.isFetching) {
      // Implementation would depend on your pagination strategy
      // For example: dispatch(loadMoreProperties());
    }
  }, [searchPropertiesQuery.data?.hasMore, searchPropertiesQuery.isFetching]);

  // Check availability for properties
  const checkAvailability = useCallback(async (propertyId: string) => {
    if (!currentSearch) return;
    
    try {
      const availability = await propertyService.checkAvailability({
        propertyId,
        checkIn: currentSearch.checkIn,
        checkOut: currentSearch.checkOut,
        guests: currentSearch.guests
      });
      
      dispatch(updatePropertyAvailability({ propertyId, availability }));
    } catch (error) {
      console.error('Error checking availability:', error);
    }
  }, [dispatch, currentSearch]);

  const propertyTypes = ['Apartment', 'Villa', 'Hotel', 'House', 'Condo', 'Chalet', 'Loft', 'Treehouse'];
  const amenities = ['wifi', 'pool', 'parking', 'kitchen', 'gym', 'spa', 'restaurant', 'aircon'];
  const roomFeatures = ['balcony', 'mountain-view', 'bath', 'tv', 'minibar', 'fireplace'];

  const clearFilter = (filterType: keyof PropertySearchFilters, value?: string) => {
    if (value && Array.isArray(filters[filterType])) {
      setFilters({
        ...filters,
        [filterType]: (filters[filterType] as string[]).filter(v => v !== value)
      });
    } else {
      setFilters({
        ...filters,
        [filterType]: Array.isArray(filters[filterType]) ? [] : 
                      typeof filters[filterType] === 'boolean' ? false : 0
      });
    }
  };

  const clearAllFilters = () => {
    setFilters({
      propertyTypes: [],
      amenities: [],
      priceRange: [0, 1000],
      minRating: 0,
      bedrooms: 0,
      bathrooms: 0,
      maxDistance: 50,
      isEcoFriendly: false,
      instantBook: false,
      petFriendly: false,
      accessibility: false,
      hostType: 'any'
    });
    setPriceRange([0, 1000]);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.propertyTypes?.length > 0) count += filters.propertyTypes.length;
    if (filters.amenities?.length > 0) count += filters.amenities.length;
    if (filters.isEcoFriendly) count++;
    if (filters.instantBook) count++;
    if (filters.petFriendly) count++;
    if (filters.minRating > 0) count++;
    if (filters.bedrooms > 0) count++;
    if (filters.bathrooms > 0) count++;
    if (priceRange[0] > 0 || priceRange[1] < 1000) count++;
    return count;
  };

  const renderFilters = () => (
    <Card className="p-6 h-fit">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold">Filters</h3>
        {getActiveFilterCount() > 0 && (
          <Button variant="ghost" size="sm" onClick={clearAllFilters}>
            Clear all ({getActiveFilterCount()})
          </Button>
        )}
      </div>

      <div className="space-y-6">
        {/* Price Range */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium">Price Range</h4>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((curr) => (
                  <SelectItem key={curr} value={curr}>{curr}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Slider
            value={priceRange}
            onValueChange={setPriceRange}
            max={1000}
            step={10}
            className="mb-2"
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>${priceRange[0]}</span>
            <span>${priceRange[1]}+</span>
          </div>
        </div>

        {/* Property Type */}
        <div>
          <h4 className="font-medium mb-3">Property Type</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {propertyTypes.map((type) => (
              <div key={type} className="flex items-center space-x-2">
                <Checkbox
                  id={type}
                  checked={filters.propertyTypes?.includes(type) || false}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setFilters({
                        ...filters,
                        propertyTypes: [...(filters.propertyTypes || []), type]
                      });
                    } else {
                      setFilters({
                        ...filters,
                        propertyTypes: (filters.propertyTypes || []).filter(t => t !== type)
                      });
                    }
                  }}
                />
                <Label htmlFor={type} className="text-sm">{type}</Label>
              </div>
            ))}
          </div>
        </div>

        {/* Amenities */}
        <div>
          <h4 className="font-medium mb-3">Amenities</h4>
          <div className="grid grid-cols-2 gap-2">
            {amenities.map((amenity) => {
              const Icon = amenityIcons[amenity as keyof typeof amenityIcons];
              return (
                <div key={amenity} className="flex items-center space-x-2">
                  <Checkbox
                    id={amenity}
                    checked={filters.amenities?.includes(amenity) || false}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setFilters({
                          ...filters,
                          amenities: [...(filters.amenities || []), amenity]
                        });
                      } else {
                        setFilters({
                          ...filters,
                          amenities: (filters.amenities || []).filter(a => a !== amenity)
                        });
                      }
                    }}
                  />
                  <Label htmlFor={amenity} className="text-sm flex items-center space-x-1">
                    {Icon && <Icon className="w-4 h-4" />}
                    <span>{amenity}</span>
                  </Label>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Filters */}
        <div>
          <h4 className="font-medium mb-3">Quick Filters</h4>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="eco-friendly"
                checked={filters.isEcoFriendly}
                onCheckedChange={(checked) => setFilters({ ...filters, isEcoFriendly: !!checked })}
              />
              <Label htmlFor="eco-friendly" className="text-sm">Eco-friendly</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="instant-book"
                checked={filters.instantBook}
                onCheckedChange={(checked) => setFilters({ ...filters, instantBook: !!checked })}
              />
              <Label htmlFor="instant-book" className="text-sm">Instant book</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="pet-friendly"
                checked={filters.petFriendly}
                onCheckedChange={(checked) => setFilters({ ...filters, petFriendly: !!checked })}
              />
              <Label htmlFor="pet-friendly" className="text-sm">Pet friendly</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="accessibility"
                checked={filters.accessibility}
                onCheckedChange={(checked) => setFilters({ ...filters, accessibility: !!checked })}
              />
              <Label htmlFor="accessibility" className="text-sm">Accessible</Label>
            </div>
          </div>
        </div>

        {/* Rating Filter */}
        <div>
          <h4 className="font-medium mb-3">Minimum Rating</h4>
          <div className="space-y-2">
            {[4.5, 4.0, 3.5, 3.0].map((rating) => (
              <div key={rating} className="flex items-center space-x-2">
                <Checkbox
                  id={`rating-${rating}`}
                  checked={filters.minRating === rating}
                  onCheckedChange={(checked) => 
                    setFilters({ ...filters, minRating: checked ? rating : 0 })
                  }
                />
                <Label htmlFor={`rating-${rating}`} className="text-sm flex items-center space-x-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span>{rating}+</span>
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Rooms */}
        <div>
          <h4 className="font-medium mb-3">Rooms</h4>
          <div className="space-y-3">
            <div>
              <Label className="text-sm">Bedrooms</Label>
              <Select 
                value={filters.bedrooms.toString()} 
                onValueChange={(value) => setFilters({ ...filters, bedrooms: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[0, 1, 2, 3, 4, 5].map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num === 0 ? 'Any' : `${num}+`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Bathrooms</Label>
              <Select 
                value={filters.bathrooms.toString()} 
                onValueChange={(value) => setFilters({ ...filters, bathrooms: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[0, 1, 2, 3, 4].map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num === 0 ? 'Any' : `${num}+`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Searching properties...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="p-12 text-center">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Search Error</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          {onBackToSearch && (
            <Button variant="ghost" size="sm" onClick={onBackToSearch}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Search
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold">
              {currentSearch?.destination || 'Search Results'}
            </h1>
            <p className="text-muted-foreground">
              {filteredAndSortedProperties.length} properties found
              {currentSearch?.checkIn && currentSearch?.checkOut && (
                <span>
                  {' '}• {new Date(currentSearch.checkIn).toLocaleDateString()} - {new Date(currentSearch.checkOut).toLocaleDateString()}
                </span>
              )}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={handleSaveSearch}>
            <Bookmark className="w-4 h-4 mr-2" />
            Save Search
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => setShowPriceComparison(!showPriceComparison)}
          >
            <DollarSign className="w-4 h-4 mr-2" />
            Price Insights
          </Button>
        </div>
      </div>

      {/* Price Comparison Widget */}
      {showPriceComparison && priceComparisonQuery.data && (
        <Card className="mb-6 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Price Insights</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowPriceComparison(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                ${priceComparisonQuery.data.averagePrice}
              </div>
              <div className="text-sm text-muted-foreground">Average Price</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                ${priceComparisonQuery.data.lowestPrice}
              </div>
              <div className="text-sm text-muted-foreground">Best Deal</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {priceComparisonQuery.data.priceChange > 0 ? '+' : ''}
                {priceComparisonQuery.data.priceChange}%
              </div>
              <div className="text-sm text-muted-foreground">vs Last Week</div>
            </div>
          </div>
        </Card>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="lg:hidden"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters {getActiveFilterCount() > 0 && `(${getActiveFilterCount()})`}
          </Button>
          
          <div className="flex items-center space-x-2">
            <Label className="text-sm">Sort by:</Label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'map' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('map')}
          >
            <Map className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Active Filters */}
      {getActiveFilterCount() > 0 && (
        <div className="flex items-center space-x-2 mb-6 flex-wrap">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {filters.propertyTypes?.map((type) => (
            <Badge key={type} variant="secondary" className="flex items-center space-x-1">
              <span>{type}</span>
              <X 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => clearFilter('propertyTypes', type)}
              />
            </Badge>
          ))}
          {filters.amenities?.map((amenity) => (
            <Badge key={amenity} variant="secondary" className="flex items-center space-x-1">
              <span>{amenity}</span>
              <X 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => clearFilter('amenities', amenity)}
              />
            </Badge>
          ))}
          {filters.isEcoFriendly && (
            <Badge variant="secondary" className="flex items-center space-x-1">
              <span>Eco-friendly</span>
              <X 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => clearFilter('isEcoFriendly')}
              />
            </Badge>
          )}
          {filters.instantBook && (
            <Badge variant="secondary" className="flex items-center space-x-1">
              <span>Instant book</span>
              <X 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => clearFilter('instantBook')}
              />
            </Badge>
          )}
          {filters.petFriendly && (
            <Badge variant="secondary" className="flex items-center space-x-1">
              <span>Pet friendly</span>
              <X 
                className="w-3 h-3 cursor-pointer" 
                onClick={() => clearFilter('petFriendly')}
              />
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={clearAllFilters}>
            Clear all
          </Button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex gap-6">
        {/* Filters Sidebar */}
        {showFilters && (
          <div className="w-80 flex-shrink-0 hidden lg:block">
            {renderFilters()}
          </div>
        )}

        {/* Results */}
        <div className="flex-1">
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredAndSortedProperties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  onSelect={() => handlePropertyClick(property)}
                  onToggleFavorite={() => handleToggleFavorite(property)}
                  isFavorited={favorites.some(fav => fav.id === property.id)}
                  onCheckAvailability={() => checkAvailability(property.id)}
                />
              ))}
            </div>
          )}

          {viewMode === 'list' && (
            <div className="space-y-6">
              {filteredAndSortedProperties.map((property) => (
                <PropertyListItem
                  key={property.id}
                  property={property}
                  onSelect={() => handlePropertyClick(property)}
                  onToggleFavorite={() => handleToggleFavorite(property)}
                  isFavorited={favorites.some(fav => fav.id === property.id)}
                  onCheckAvailability={() => checkAvailability(property.id)}
                />
              ))}
            </div>
          )}

          {viewMode === 'map' && (
            <PropertyMapView
              properties={filteredAndSortedProperties}
              onPropertySelect={handlePropertyClick}
              onToggleFavorite={handleToggleFavorite}
              favorites={favorites}
              center={currentSearch?.destination ? { 
                lat: 40.7128, 
                lng: -74.0060 
              } : undefined}
            />
          )}

          {/* Load More Button */}
          {searchPropertiesQuery.data?.hasMore && (
            <div className="text-center mt-8">
              <Button 
                onClick={handleLoadMore} 
                disabled={searchPropertiesQuery.isFetching}
                variant="outline"
              >
                {searchPropertiesQuery.isFetching ? 'Loading...' : 'Load More'}
              </Button>
            </div>
          )}

          {filteredAndSortedProperties.length === 0 && !loading && (
            <Card className="p-12 text-center">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">No properties found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your filters or search criteria
                </p>
                <Button onClick={clearAllFilters}>Clear all filters</Button>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Recently Viewed */}
      {recentlyViewed.length > 0 && (
        <div className="mt-12">
          <h3 className="text-lg font-semibold mb-4">Recently Viewed</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {recentlyViewed.slice(0, 4).map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                onSelect={() => handlePropertyClick(property)}
                onToggleFavorite={() => handleToggleFavorite(property)}
                isFavorited={favorites.some(fav => fav.id === property.id)}
                compact
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
                    id={`amenity-${amenity}`}
                    checked={filters.amenities.includes(amenity)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setFilters({
                          ...filters,
                          amenities: [...filters.amenities, amenity]
                        });
                      } else {
                        setFilters({
                          ...filters,
                          amenities: filters.amenities.filter(a => a !== amenity)
                        });
                      }
                    }}
                  />
                  <Icon className="w-3 h-3" />
                  <Label htmlFor={`amenity-${amenity}`} className="text-sm capitalize">{amenity}</Label>
                </div>
              );
            })}
          </div>
        </div>

        {/* Room Features */}
        <div>
          <h4 className="font-medium mb-3">Room Features</h4>
          <div className="space-y-2">
            {roomFeatures.map((feature) => {
              const Icon = amenityIcons[feature as keyof typeof amenityIcons];
              return (
                <div key={feature} className="flex items-center space-x-2">
                  <Checkbox
                    id={`feature-${feature}`}
                    checked={filters.roomFeatures.includes(feature)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setFilters({
                          ...filters,
                          roomFeatures: [...filters.roomFeatures, feature]
                        });
                      } else {
                        setFilters({
                          ...filters,
                          roomFeatures: filters.roomFeatures.filter(f => f !== feature)
                        });
                      }
                    }}
                  />
                  {Icon && <Icon className="w-3 h-3" />}
                  <Label htmlFor={`feature-${feature}`} className="text-sm capitalize">{feature.replace('-', ' ')}</Label>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rooms & Guests */}
        <div>
          <h4 className="font-medium mb-3">Rooms & Guests</h4>
          <div className="space-y-3">
            <div>
              <Label className="text-sm">Bedrooms</Label>
              <div className="flex items-center space-x-2 mt-1">
                {[0, 1, 2, 3, 4].map((num) => (
                  <Button
                    key={num}
                    variant={filters.bedrooms === num ? 'default' : 'outline'}
                    size="sm"
                    className="w-10 h-8"
                    onClick={() => setFilters({ ...filters, bedrooms: num })}
                  >
                    {num === 0 ? 'Any' : num}
                  </Button>
                ))}
              </div>
            </div>
            
            <div>
              <Label className="text-sm">Bathrooms</Label>
              <div className="flex items-center space-x-2 mt-1">
                {[0, 1, 2, 3].map((num) => (
                  <Button
                    key={num}
                    variant={filters.bathrooms === num ? 'default' : 'outline'}
                    size="sm"
                    className="w-10 h-8"
                    onClick={() => setFilters({ ...filters, bathrooms: num })}
                  >
                    {num === 0 ? 'Any' : num}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Host Preferences */}
        <div>
          <h4 className="font-medium mb-3">Host Preferences</h4>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="superhost"
                checked={filters.hostPreferences.includes('superhost')}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setFilters({
                      ...filters,
                      hostPreferences: [...filters.hostPreferences, 'superhost']
                    });
                  } else {
                    setFilters({
                      ...filters,
                      hostPreferences: filters.hostPreferences.filter(p => p !== 'superhost')
                    });
                  }
                }}
              />
              <Star className="w-3 h-3 text-yellow-400" />
              <Label htmlFor="superhost" className="text-sm">Superhost</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="instantBookFilter"
                checked={filters.instantBook}
                onCheckedChange={(checked) => 
                  setFilters({ ...filters, instantBook: !!checked })
                }
              />
              <Clock className="w-3 h-3 text-primary" />
              <Label htmlFor="instantBookFilter" className="text-sm">Instant book</Label>
            </div>
          </div>
        </div>

        {/* Accessibility */}
        <div>
          <h4 className="font-medium mb-3">Accessibility</h4>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="accessible"
                checked={filters.accessibility.includes('wheelchair-accessible')}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setFilters({
                      ...filters,
                      accessibility: [...filters.accessibility, 'wheelchair-accessible']
                    });
                  } else {
                    setFilters({
                      ...filters,
                      accessibility: filters.accessibility.filter(a => a !== 'wheelchair-accessible')
                    });
                  }
                }}
              />
              <Accessibility className="w-3 h-3" />
              <Label htmlFor="accessible" className="text-sm">Wheelchair accessible</Label>
            </div>
          </div>
        </div>

        {/* Special Features */}
        <div>
          <h4 className="font-medium mb-3">Special Features</h4>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="ecoFriendlyFilter"
                checked={filters.ecoFriendly}
                onCheckedChange={(checked) => 
                  setFilters({ ...filters, ecoFriendly: !!checked })
                }
              />
              <Leaf className="w-3 h-3 text-success" />
              <Label htmlFor="ecoFriendlyFilter" className="text-sm">Eco-friendly</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="petFriendlyFilter"
                checked={filters.petFriendly}
                onCheckedChange={(checked) => 
                  setFilters({ ...filters, petFriendly: !!checked })
                }
              />
              <Heart className="w-3 h-3 text-secondary" />
              <Label htmlFor="petFriendlyFilter" className="text-sm">Pet-friendly</Label>
            </div>
          </div>
        </div>

        {/* Rating */}
        <div>
          <h4 className="font-medium mb-3">Minimum Rating</h4>
          <div className="flex items-center space-x-2">
            {[0, 3, 4, 4.5].map((rating) => (
              <Button
                key={rating}
                variant={filters.minRating === rating ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilters({ ...filters, minRating: rating })}
              >
                {rating === 0 ? 'Any' : `${rating}+`}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );

  const renderPropertyCard = (property: Property) => (
    <Card 
      key={property.id} 
      className="overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 group"
      onClick={() => setSelectedProperty(property)}
    >
      <div className="relative">
        <ImageWithFallback
          src={property.images[0]}
          alt={property.title}
          className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
        />
        
        {/* Heart button */}
        <button 
          className="absolute top-3 right-3 p-2 bg-white/80 hover:bg-white rounded-full transition-colors z-10"
          onClick={(e) => {
            e.stopPropagation();
            // Handle favorite toggle
          }}
        >
          <Heart className="w-4 h-4" />
        </button>
        
        {/* Image counter */}
        <div className="absolute bottom-3 right-3 bg-black/50 text-black px-2 py-1 rounded text-xs">
          1 / {property.images.length}
        </div>
        
        {/* Badges */}
        <div className="absolute top-3 left-3 space-y-2">
          {property.isEcoFriendly && (
            <Badge className="bg-success text-success-foreground">
              <Leaf className="w-3 h-3 mr-1" />
              Eco-friendly
            </Badge>
          )}
          {property.instantBook && (
            <Badge className="bg-primary text-primary-foreground">
              <Clock className="w-3 h-3 mr-1" />
              Instant Book
            </Badge>
          )}
          {property.host.isSuperhost && (
            <Badge className="bg-yellow-500 text-black">
              <Star className="w-3 h-3 mr-1" />
              Superhost
            </Badge>
          )}
        </div>
      </div>
      
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold line-clamp-1 mb-1">{property.title}</h3>
            <p className="text-sm text-muted-foreground">{property.location}</p>
            <p className="text-xs text-muted-foreground">{property.distance}</p>
          </div>
          <div className="flex items-center space-x-1 ml-2">
            <Star className="w-4 h-4 fill-current text-yellow-400" />
            <span className="text-sm font-medium">{property.rating}</span>
            <span className="text-xs text-muted-foreground">({property.reviews})</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center space-x-3">
            {property.bedrooms && (
              <span>{property.bedrooms} bed{property.bedrooms > 1 ? 's' : ''}</span>
            )}
            {property.bathrooms && (
              <span>{property.bathrooms} bath{property.bathrooms > 1 ? 's' : ''}</span>
            )}
            {property.maxGuests && (
              <span>{property.maxGuests} guests</span>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {property.amenities.slice(0, 4).map((amenity) => {
            const Icon = amenityIcons[amenity as keyof typeof amenityIcons];
            return Icon ? <Icon key={amenity} className="w-4 h-4 text-muted-foreground" /> : null;
          })}
          {property.amenities.length > 4 && (
            <span className="text-sm text-muted-foreground">+{property.amenities.length - 4}</span>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xl font-semibold">${property.price}</span>
            <span className="text-sm text-muted-foreground"> /night</span>
          </div>
          <Button 
            size="sm" 
            onClick={(e) => {
              e.stopPropagation();
              onPropertySelect(property);
            }}
          >
            View Details
          </Button>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header with search modification */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {onBackToSearch && (
            <Button variant="outline" size="icon" onClick={onBackToSearch}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold">
              {sortedProperties.length} stays found
            </h1>
            <p className="text-muted-foreground">
              Bali • Mar 15-20 • 2 guests
            </p>
          </div>
        </div>
        
        <Button variant="outline">
          <SlidersHorizontal className="w-4 h-4 mr-2" />
          Modify search
        </Button>
      </div>

      {/* Active filters */}
      {getActiveFilterCount() > 0 && (
        <div className="flex items-center space-x-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Filters:</span>
          {filters.propertyTypes.map((type) => (
            <Badge key={type} variant="secondary" className="flex items-center space-x-1">
              <span>{type}</span>
              <button onClick={() => clearFilter('propertyTypes', type)}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
          {filters.amenities.map((amenity) => (
            <Badge key={amenity} variant="secondary" className="flex items-center space-x-1">
              <span className="capitalize">{amenity}</span>
              <button onClick={() => clearFilter('amenities', amenity)}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
          {filters.ecoFriendly && (
            <Badge variant="secondary" className="flex items-center space-x-1">
              <Leaf className="w-3 h-3" />
              <span>Eco-friendly</span>
              <button onClick={() => clearFilter('ecoFriendly')}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={clearAllFilters}>
            Clear all
          </Button>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters {getActiveFilterCount() > 0 && `(${getActiveFilterCount()})`}
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          {/* View Mode Toggle */}
          <div className="flex items-center space-x-1 border rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'map' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('map')}
            >
              <Map className="w-4 h-4" />
            </Button>
          </div>

          {/* Sort */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-48">
              <ArrowUpDown className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        {showFilters && (
          <div className="lg:col-span-1">
            {renderFilters()}
          </div>
        )}

        {/* Results */}
        <div className={showFilters ? 'lg:col-span-3' : 'lg:col-span-4'}>
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {sortedProperties.map(renderPropertyCard)}
            </div>
          )}

          {viewMode === 'list' && (
            <div className="space-y-4">
              {sortedProperties.map((property) => (
                <Card key={property.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="flex">
                    <div className="w-80 h-48 relative">
                      <ImageWithFallback
                        src={property.images[0]}
                        alt={property.title}
                        className="w-full h-full object-cover"
                      />
                      {property.isEcoFriendly && (
                        <Badge className="absolute top-3 left-3 bg-success text-success-foreground">
                          <Leaf className="w-3 h-3 mr-1" />
                          Eco-friendly
                        </Badge>
                      )}
                    </div>
                    <div className="flex-1 p-6">
                      <div className="flex justify-between items-start h-full">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-lg font-semibold">{property.title}</h3>
                              <p className="text-muted-foreground">{property.location}</p>
                              <p className="text-sm text-muted-foreground">{property.distance}</p>
                            </div>
                            <button className="p-2 hover:bg-muted rounded-full">
                              <Heart className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Star className="w-4 h-4 fill-current text-yellow-400" />
                            <span className="text-sm">{property.rating} ({property.reviews} reviews)</span>
                            {property.host.isSuperhost && (
                              <Badge variant="outline" className="text-xs">Superhost</Badge>
                            )}
                          </div>
                          
                          <div className="text-sm text-muted-foreground">
                            {property.bedrooms} bed • {property.bathrooms} bath • {property.maxGuests} guests
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {property.amenities.slice(0, 6).map((amenity) => {
                              const Icon = amenityIcons[amenity as keyof typeof amenityIcons];
                              return Icon ? <Icon key={amenity} className="w-4 h-4 text-muted-foreground" /> : null;
                            })}
                          </div>
                        </div>
                        
                        <div className="text-right ml-6">
                          <div className="text-2xl font-semibold">${property.price}</div>
                          <div className="text-sm text-muted-foreground">per night</div>
                          <Button className="mt-3" onClick={() => onPropertySelect(property)}>
                            View Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {viewMode === 'map' && (
            <Card className="h-[600px] flex items-center justify-center">
              <div className="text-center">
                <Map className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Interactive Map View</h3>
                <p className="text-muted-foreground max-w-md">
                  Map integration would display properties with clustered markers, 
                  price labels, and interactive property previews on hover.
                </p>
                <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <p>• Property markers with price display</p>
                  <p>• Cluster markers for high-density areas</p>
                  <p>• Mini property cards on hover</p>
                  <p>• "Search this area" when map moves</p>
                </div>
              </div>
            </Card>
          )}

          {sortedProperties.length === 0 && (
            <Card className="p-12 text-center">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">No properties found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your filters or search criteria
                </p>
                <Button onClick={clearAllFilters}>Clear all filters</Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}