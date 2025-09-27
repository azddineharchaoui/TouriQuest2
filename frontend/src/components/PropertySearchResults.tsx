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
  const queryClient = useQueryClient();
  
  // State management for filters and UI
  const [filters, setFilters] = useState<ExtendedPropertySearchFilters>({
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
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>([]);

  // Infinite query for property search with pagination
  const {
    data: searchData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: searchLoading,
    isError: searchError,
    refetch: refetchSearch
  } = useInfiniteQuery({
    queryKey: ['properties', 'search', filters],
    queryFn: ({ pageParam = 1 }) => 
      propertyService.searchProperties({
        ...filters,
        page: pageParam,
        location: searchQuery || filters.location
      } as PropertySearchRequest),
    getNextPageParam: (lastPage) => 
      lastPage.meta.hasNext ? lastPage.meta.page + 1 : undefined,
    enabled: !!(filters.location || searchQuery),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Query for user's favorite properties
  const { data: favoritesData } = useQuery({
    queryKey: ['properties', 'favorites'],
    queryFn: () => propertyService.getFavorites(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Query for saved searches
  const { data: savedSearchesData } = useQuery({
    queryKey: ['properties', 'saved-searches'],
    queryFn: () => propertyService.getSavedSearches(),
    staleTime: 15 * 60 * 1000, // 15 minutes
  });

  // Query for price comparison
  const { data: priceComparisonData } = useQuery({
    queryKey: ['properties', 'price-comparison', filters.location, filters.checkIn, filters.checkOut],
    queryFn: () => propertyService.getPriceComparison({
      location: filters.location || searchQuery,
      checkIn: filters.checkIn || new Date().toISOString().split('T')[0],
      checkOut: filters.checkOut || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      guests: filters.guests || 2
    }),
    enabled: !!(filters.location || searchQuery) && showPriceComparison,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  // Mutations for user interactions
  const favoriteMutation = useMutation({
    mutationFn: ({ propertyId, action }: { propertyId: string; action: 'add' | 'remove' }) =>
      action === 'add' 
        ? propertyService.addToFavorites(propertyId)
        : propertyService.removeFromFavorites(propertyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties', 'favorites'] });
      queryClient.invalidateQueries({ queryKey: ['properties', 'search'] });
    },
    onError: (error) => {
      toast({
        title: 'Favorite Action Failed',
        description: error instanceof Error ? error.message : 'Unable to update favorites',
        variant: 'destructive'
      });
    }
  });

  const saveSearchMutation = useMutation({
    mutationFn: (search: Omit<SavedSearch, 'id' | 'createdAt' | 'matchCount'>) =>
      propertyService.saveSearch(search),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties', 'saved-searches'] });
      toast({
        title: 'Search Saved',
        description: 'You will be notified of new matching properties'
      });
    },
    onError: (error) => {
      toast({
        title: 'Save Failed',
        description: error instanceof Error ? error.message : 'Unable to save search',
        variant: 'destructive'
      });
    }
  });

  // Flatten all properties from infinite query pages
  const allProperties = useMemo(() => {
    return searchData?.pages?.flatMap(page => page.properties) || [];
  }, [searchData]);

  // Filter properties based on current criteria (client-side refinement)
  const filteredProperties = useMemo(() => {
    return allProperties.filter(property => {
      if (filters.rating && property.rating < filters.rating) return false;
      if (filters.instantBook && !property.instantBook) return false;
      if (filters.isEcoFriendly && !property.isActive) return false; // Using isActive as eco-friendly placeholder
      if (filters.accessibility && !property.rules?.pets) return false; // Using pets as accessibility placeholder
      if (filters.petFriendly !== undefined && property.rules?.pets !== filters.petFriendly) return false;
      
      return true;
    });
  }, [allProperties, filters]);

  // Sort properties
  const sortedProperties = useMemo(() => {
    const sorted = [...filteredProperties];
    
    switch (filters.sortBy) {
      case 'price':
        return sorted.sort((a, b) => 
          filters.sortOrder === 'asc' ? a.pricing.basePrice - b.pricing.basePrice : b.pricing.basePrice - a.pricing.basePrice
        );
      case 'rating':
        return sorted.sort((a, b) => 
          filters.sortOrder === 'asc' ? a.rating - b.rating : b.rating - a.rating
        );
      case 'distance':
        return sorted.sort((a, b) => {
          const aDistance = a.location?.latitude && a.location?.longitude ? 
            Math.sqrt(Math.pow(a.location.latitude, 2) + Math.pow(a.location.longitude, 2)) : 0;
          const bDistance = b.location?.latitude && b.location?.longitude ? 
            Math.sqrt(Math.pow(b.location.latitude, 2) + Math.pow(b.location.longitude, 2)) : 0;
          return filters.sortOrder === 'asc' ? aDistance - bDistance : bDistance - aDistance;
        });
      default:
        return sorted;
    }
  }, [filteredProperties, filters.sortBy, filters.sortOrder]);

  // Handle search form submission
  const handleSearch = useCallback(async () => {
    const searchFilters = {
      ...filters,
      location: searchQuery || filters.location,
      page: 1
    };
    
    setFilters(searchFilters);
    
    // Save search query for autocomplete
    if (searchQuery) {
      const recentSearches = JSON.parse(localStorage.getItem('recent_searches') || '[]');
      const updatedSearches = [searchQuery, ...recentSearches.filter((s: string) => s !== searchQuery)].slice(0, 5);
      localStorage.setItem('recent_searches', JSON.stringify(updatedSearches));
    }
  }, [filters, searchQuery]);

  // Handle favorite toggle
  const handleFavoriteToggle = useCallback(async (propertyId: string) => {
    const isFavorite = favoritesData?.properties?.some(fav => fav.id === propertyId);
    favoriteMutation.mutate({ 
      propertyId, 
      action: isFavorite ? 'remove' : 'add' 
    });
  }, [favoritesData, favoriteMutation]);

  // Handle property view tracking
  const handlePropertyView = useCallback((propertyId: string) => {
    setRecentlyViewed(prev => {
      const updated = [propertyId, ...prev.filter(id => id !== propertyId)].slice(0, 10);
      localStorage.setItem('recently_viewed_properties', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Save current search
  const handleSaveSearch = useCallback(async () => {
    const searchName = prompt('Enter a name for this search:');
    if (searchName) {
      saveSearchMutation.mutate({
        name: searchName,
        filters,
        alertsEnabled: true
      });
    }
  }, [filters, saveSearchMutation]);

  // Load more properties (infinite scroll)
  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Load recently viewed from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('recently_viewed_properties');
    if (stored) {
      setRecentlyViewed(JSON.parse(stored));
    }
  }, []);

  // Debounce search when filters change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (filters.location || searchQuery) {
        refetchSearch();
      }
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [filters, searchQuery, refetchSearch]);

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
    { value: 'popularity', label: 'Most Popular' },
    { value: 'price', label: 'Price: Low to High' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'distance', label: 'Distance' },
    { value: 'newest', label: 'Newest First' }
  ];

  const propertyTypes = ['Apartment', 'Villa', 'Hotel', 'House', 'Condo', 'Chalet', 'Loft', 'Treehouse'];
  const amenities = ['wifi', 'pool', 'parking', 'kitchen', 'gym', 'spa', 'restaurant', 'aircon'];

  // Property Card Component
  const PropertyCard = ({ property }: { property: Property }) => {
    const isFavorite = favoritesData?.properties?.some(fav => fav.id === property.id);
    
    return (
      <Card 
        className="group overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer"
        onClick={() => handlePropertyView(property.id)}
      >
        <div className="relative">
          <div className="aspect-video overflow-hidden">
            <img
              src={property.photos?.[0]?.url || '/placeholder-property.jpg'}
              alt={property.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
          
          {/* Overlay badges */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-2">
            {property.isFeatured && (
              <Badge className="bg-yellow-500 text-white">
                <Star className="w-3 h-3 mr-1" />
                Featured
              </Badge>
            )}
            {property.type?.name && (
              <Badge variant="secondary" className="bg-white/90 text-gray-800">
                {property.type.name}
              </Badge>
            )}
          </div>
          
          {/* Favorite button */}
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-3 right-3 bg-white/90 hover:bg-white"
            onClick={(e) => {
              e.stopPropagation();
              handleFavoriteToggle(property.id);
            }}
            disabled={favoriteMutation.isPending}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
          </Button>
          
          {/* Deal indicator */}
          {property.pricing?.discounts?.[0] && (
            <Badge className="absolute bottom-3 left-3 bg-green-500 text-white">
              <Percent className="w-3 h-3 mr-1" />
              {property.pricing.discounts[0].percentage}% Off
            </Badge>
          )}
        </div>
        
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h3 className="font-semibold text-lg line-clamp-1">{property.title}</h3>
              <p className="text-sm text-muted-foreground flex items-center">
                <MapPin className="w-3 h-3 mr-1" />
                {property.location?.address || 'Location not specified'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-medium ml-1">{property.rating}</span>
            </div>
            <span className="text-sm text-muted-foreground">
              ({property.reviewCount} reviews)
            </span>
            {property.host?.verifications?.includes('verified') && (
              <Badge variant="outline" className="text-xs">
                <Shield className="w-3 h-3 mr-1" />
                Verified
              </Badge>
            )}
          </div>
          
          {/* Amenities */}
          <div className="flex items-center gap-1 mb-3">
            {property.amenities?.slice(0, 4).map((amenity) => {
              const Icon = amenityIcons[amenity.name as keyof typeof amenityIcons];
              return Icon ? (
                <Icon key={amenity.id} className="w-4 h-4 text-muted-foreground" />
              ) : null;
            })}
            {property.amenities?.length > 4 && (
              <span className="text-xs text-muted-foreground">
                +{property.amenities.length - 4} more
              </span>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold">${property.pricing?.basePrice || 0}</span>
                <span className="text-sm text-muted-foreground">per night</span>
              </div>
              {property.pricing?.discounts?.[0] && (
                <div className="text-xs text-muted-foreground line-through">
                  ${Math.round(property.pricing.basePrice / (1 - property.pricing.discounts[0].percentage / 100))}
                </div>
              )}
            </div>
            
            {property.instantBook && (
              <Badge variant="outline" className="text-xs">
                <Zap className="w-3 h-3 mr-1" />
                Instant Book
              </Badge>
            )}
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Search Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            {/* Search Input */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search destinations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>
            </div>
            
            {/* Date Pickers */}
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={filters.checkIn}
                onChange={(e) => setFilters(prev => ({ ...prev, checkIn: e.target.value }))}
                className="w-40"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="date"
                value={filters.checkOut}
                onChange={(e) => setFilters(prev => ({ ...prev, checkOut: e.target.value }))}
                className="w-40"
              />
            </div>
            
            {/* Guests */}
            <Select 
              value={filters.guests?.toString()} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, guests: parseInt(value) }))}
            >
              <SelectTrigger className="w-32">
                <Users className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                  <SelectItem key={num} value={num.toString()}>
                    {num} {num === 1 ? 'Guest' : 'Guests'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button onClick={handleSearch} disabled={searchLoading}>
              {searchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Search
            </Button>
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">
              {searchData?.pages?.[0]?.meta?.total || 0} properties found
            </h1>
            {(filters.location || searchQuery) && (
              <p className="text-muted-foreground">
                in {filters.location || searchQuery}
                {filters.checkIn && filters.checkOut && (
                  <span> • {filters.checkIn} to {filters.checkOut}</span>
                )}
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center border rounded-lg p-1">
              <Button
                variant={viewMode.type === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode(prev => ({ ...prev, type: 'grid' }))}
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode.type === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode(prev => ({ ...prev, type: 'list' }))}
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode.type === 'map' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode(prev => ({ ...prev, type: 'map' }))}
              >
                <Map className="w-4 h-4" />
              </Button>
            </div>

            {/* Sort */}
            <Select 
              value={filters.sortBy} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, sortBy: value as any }))}
            >
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
            
            {/* Filters Toggle */}
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
            
            {/* Additional Actions */}
            <Button
              variant="outline"
              onClick={handleSaveSearch}
              disabled={saveSearchMutation.isPending}
            >
              <BookmarkPlus className="w-4 h-4 mr-2" />
              Save Search
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          {showFilters && (
            <div className="lg:col-span-1">
              <Card className="p-6 sticky top-24">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold">Filters</h3>
                  <Button variant="ghost" size="sm" onClick={() => setFilters({
                    ...filters,
                    propertyType: [],
                    amenities: [],
                    priceMin: 0,
                    priceMax: 1000,
                    rating: 0,
                    isEcoFriendly: false,
                    instantBook: false,
                    petFriendly: false
                  })}>
                    Clear all
                  </Button>
                </div>

                <div className="space-y-6">
                  {/* Price Range */}
                  <div>
                    <Label className="font-medium mb-3 block">Price Range</Label>
                    <Slider
                      value={[filters.priceMin || 0, filters.priceMax || 1000]}
                      onValueChange={([min, max]) => setFilters(prev => ({ 
                        ...prev, 
                        priceMin: min, 
                        priceMax: max 
                      }))}
                      max={1000}
                      step={10}
                      className="mb-2"
                    />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>${filters.priceMin || 0}</span>
                      <span>${filters.priceMax || 1000}+</span>
                    </div>
                  </div>

                  {/* Property Type */}
                  <div>
                    <Label className="font-medium mb-3 block">Property Type</Label>
                    <div className="space-y-2">
                      {propertyTypes.map((type) => (
                        <div key={type} className="flex items-center space-x-2">
                          <Checkbox
                            id={type}
                            checked={filters.propertyType?.includes(type) || false}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFilters(prev => ({
                                  ...prev,
                                  propertyType: [...(prev.propertyType || []), type]
                                }));
                              } else {
                                setFilters(prev => ({
                                  ...prev,
                                  propertyType: (prev.propertyType || []).filter(t => t !== type)
                                }));
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
                    <Label className="font-medium mb-3 block">Amenities</Label>
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
                                  setFilters(prev => ({
                                    ...prev,
                                    amenities: [...(prev.amenities || []), amenity]
                                  }));
                                } else {
                                  setFilters(prev => ({
                                    ...prev,
                                    amenities: (prev.amenities || []).filter(a => a !== amenity)
                                  }));
                                }
                              }}
                            />
                            <Label htmlFor={amenity} className="text-sm flex items-center space-x-1">
                              {Icon && <Icon className="w-4 h-4" />}
                              <span className="capitalize">{amenity}</span>
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Quick Filters */}
                  <div>
                    <Label className="font-medium mb-3 block">Quick Filters</Label>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="instant-book"
                          checked={filters.instantBook || false}
                          onCheckedChange={(checked) => setFilters(prev => ({ 
                            ...prev, 
                            instantBook: !!checked 
                          }))}
                        />
                        <Label htmlFor="instant-book" className="text-sm">Instant Book</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="eco-friendly"
                          checked={filters.isEcoFriendly || false}
                          onCheckedChange={(checked) => setFilters(prev => ({ 
                            ...prev, 
                            isEcoFriendly: !!checked 
                          }))}
                        />
                        <Label htmlFor="eco-friendly" className="text-sm">Eco-friendly</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="pet-friendly"
                          checked={filters.petFriendly || false}
                          onCheckedChange={(checked) => setFilters(prev => ({ 
                            ...prev, 
                            petFriendly: !!checked 
                          }))}
                        />
                        <Label htmlFor="pet-friendly" className="text-sm">Pet Friendly</Label>
                      </div>
                    </div>
                  </div>

                  {/* Rating Filter */}
                  <div>
                    <Label className="font-medium mb-3 block">Minimum Rating</Label>
                    <Select 
                      value={filters.rating?.toString() || '0'} 
                      onValueChange={(value) => setFilters(prev => ({ 
                        ...prev, 
                        rating: parseInt(value) 
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Any rating" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Any rating</SelectItem>
                        <SelectItem value="3">3+ stars</SelectItem>
                        <SelectItem value="4">4+ stars</SelectItem>
                        <SelectItem value="4.5">4.5+ stars</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Results */}
          <div className={showFilters ? 'lg:col-span-3' : 'lg:col-span-4'}>
            {/* Price Comparison Widget */}
            {showPriceComparison && priceComparisonData && (
              <Card className="p-4 mb-6">
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
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Average Price</p>
                    <p className="text-lg font-semibold">${priceComparisonData.averagePrice}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Price Range</p>
                    <p className="text-lg font-semibold">
                      ${priceComparisonData.priceRange[0]} - ${priceComparisonData.priceRange[1]}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Deals Available</p>
                    <p className="text-lg font-semibold text-green-600">{priceComparisonData.dealCount}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Price Change</p>
                    <p className={`text-lg font-semibold ${priceComparisonData.priceChangePercentage >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {priceComparisonData.priceChangePercentage >= 0 ? '+' : ''}{priceComparisonData.priceChangePercentage}%
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Loading State */}
            {searchLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="ml-2">Searching properties...</span>
              </div>
            )}

            {/* Error State */}
            {searchError && (
              <Alert className="mb-6">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                  Failed to load properties. Please try again.
                  <Button variant="link" onClick={() => refetchSearch()} className="ml-2">
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Grid View */}
            {viewMode.type === 'grid' && sortedProperties.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {sortedProperties.map((property) => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>
            )}

            {/* List View */}
            {viewMode.type === 'list' && sortedProperties.length > 0 && (
              <div className="space-y-4">
                {sortedProperties.map((property) => (
                  <Card key={property.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="flex">
                      <div className="w-80 h-48 relative">
                        <img
                          src={property.photos?.[0]?.url || '/placeholder-property.jpg'}
                          alt={property.title}
                          className="w-full h-full object-cover"
                        />
                        {property.type?.name && (
                          <Badge className="absolute top-3 left-3 bg-white/90 text-gray-800">
                            {property.type.name}
                          </Badge>
                        )}
                      </div>
                      <div className="flex-1 p-6">
                        <div className="flex justify-between items-start h-full">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="text-lg font-semibold">{property.title}</h3>
                                <p className="text-muted-foreground">{property.location?.address}</p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleFavoriteToggle(property.id);
                                }}
                              >
                                <Heart className={`w-4 h-4 ${
                                  favoritesData?.properties?.some(fav => fav.id === property.id) 
                                    ? 'fill-red-500 text-red-500' 
                                    : 'text-gray-600'
                                }`} />
                              </Button>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <Star className="w-4 h-4 fill-current text-yellow-400" />
                              <span className="text-sm">{property.rating} ({property.reviewCount} reviews)</span>
                              {property.host?.verifications?.includes('verified') && (
                                <Badge variant="outline" className="text-xs">Verified Host</Badge>
                              )}
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              {property.amenities?.slice(0, 6).map((amenity) => {
                                const Icon = amenityIcons[amenity.name as keyof typeof amenityIcons];
                                return Icon ? <Icon key={amenity.id} className="w-4 h-4 text-muted-foreground" /> : null;
                              })}
                            </div>
                          </div>
                          
                          <div className="text-right ml-6">
                            <div className="text-2xl font-semibold">${property.pricing?.basePrice || 0}</div>
                            <div className="text-sm text-muted-foreground">per night</div>
                            <Button 
                              className="mt-3" 
                              onClick={() => handlePropertyView(property.id)}
                            >
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

            {/* Map View */}
            {viewMode.type === 'map' && (
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

            {/* No Results */}
            {!searchLoading && sortedProperties.length === 0 && (filters.location || searchQuery) && (
              <Card className="p-12 text-center">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">No properties found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your filters or search criteria
                  </p>
                  <Button onClick={() => setFilters({
                    ...filters,
                    propertyType: [],
                    amenities: [],
                    priceMin: 0,
                    priceMax: 1000,
                    rating: 0,
                    isEcoFriendly: false,
                    instantBook: false,
                    petFriendly: false
                  })}>
                    Clear all filters
                  </Button>
                </div>
              </Card>
            )}

            {/* Load More Button */}
            {hasNextPage && (
              <div className="flex justify-center mt-8">
                <Button
                  onClick={handleLoadMore}
                  disabled={isFetchingNextPage}
                  variant="outline"
                  size="lg"
                >
                  {isFetchingNextPage ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Loading more...
                    </>
                  ) : (
                    'Load More Properties'
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertySearchResults;