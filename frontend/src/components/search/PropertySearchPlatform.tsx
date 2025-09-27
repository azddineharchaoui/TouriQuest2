/**
 * World-Class Property Search Platform
 * Comprehensive search experience rivaling Airbnb and Booking.com
 */

import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
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
  Map as MapIcon,
  SlidersHorizontal,
  ArrowUpDown,
  Eye,
  Share2,
  Bookmark,
  TrendingUp,
  Zap,
  Globe,
  Camera,
  Mic,
  Upload,
  X,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Sparkles,
  Navigation,
  Clock,
  Shield,
  Award,
  RefreshCw,
  AlertTriangle,
  Check,
  Plus,
  Minus,
  Settings,
  BarChart3,
  Activity,
  Target,
  Layers,
  Crosshair,
  MousePointer2,
  Focus,
  ZoomIn,
  ZoomOut,
  Maximize2,
  MinusCircle,
  PlusCircle
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Separator } from '../ui/separator';
import { Progress } from '../ui/progress';
import { ScrollArea } from '../ui/scroll-area';
import { Skeleton } from '../ui/skeleton';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet';
import { Alert, AlertDescription } from '../ui/alert';
import { toast } from '../../ui/use-toast';

// Import our existing components
import { IntelligentSearch } from './IntelligentSearch';
import { AdvancedFilters } from './AdvancedFilters';
import { useSearchStore } from '../../stores/search/searchStore';

import type {
  PropertySearchResult,
  PropertySearchFilters,
  ViewType,
  SortOption,
  PropertyCluster,
  MapConfig,
  SearchAnalytics
} from '../../types/property-search';

// ====================================
// COMPONENT INTERFACES
// ====================================

interface PropertySearchPlatformProps {
  className?: string;
  onPropertySelect?: (property: PropertySearchResult) => void;
  onMapInteraction?: (config: MapConfig) => void;
}

interface PropertyCardProps {
  property: PropertySearchResult;
  viewType: ViewType;
  onFavorite: (propertyId: string) => void;
  onShare: (property: PropertySearchResult) => void;
  onSelect: (property: PropertySearchResult) => void;
  isFavorited: boolean;
  priority?: 'high' | 'medium' | 'low';
}

interface MapViewProps {
  properties: PropertySearchResult[];
  clusters: PropertyCluster[];
  config: MapConfig;
  onConfigChange: (config: MapConfig) => void;
  onPropertyHover: (propertyId: string | null) => void;
  onPropertySelect: (property: PropertySearchResult) => void;
}

interface SearchResultsHeaderProps {
  totalResults: number;
  viewType: ViewType;
  onViewTypeChange: (viewType: ViewType) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  isLoading: boolean;
  searchAnalytics: SearchAnalytics | null;
}

// ====================================
// SEARCH RESULTS HEADER
// ====================================

const SearchResultsHeader: React.FC<SearchResultsHeaderProps> = ({
  totalResults,
  viewType,
  onViewTypeChange,
  sortBy,
  onSortChange,
  isLoading,
  searchAnalytics
}) => {
  const viewTypeOptions = [
    { value: 'grid' as ViewType, icon: Grid3X3, label: 'Grid' },
    { value: 'list' as ViewType, icon: List, label: 'List' },
    { value: 'map' as ViewType, icon: MapIcon, label: 'Map' },
    { value: 'calendar' as ViewType, icon: Calendar, label: 'Calendar' }
  ];

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'relevance', label: 'Best Match' },
    { value: 'price_low_to_high', label: 'Price: Low to High' },
    { value: 'price_high_to_low', label: 'Price: High to Low' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'newest', label: 'Newest First' },
    { value: 'distance', label: 'Distance' }
  ];

  return (
    <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          {isLoading ? (
            <Skeleton className="h-6 w-32" />
          ) : (
            <span className="text-lg font-semibold text-gray-900 dark:text-white">
              {totalResults.toLocaleString()} properties
            </span>
          )}
          {searchAnalytics && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="secondary" className="text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    {searchAnalytics.executionTime}ms
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Search completed in {searchAnalytics.executionTime}ms</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {/* Sort Options */}
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="w-48">
            <ArrowUpDown className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* View Type Toggles */}
        <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg p-1">
          {viewTypeOptions.map((option) => {
            const IconComponent = option.icon;
            return (
              <TooltipProvider key={option.value}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={viewType === option.value ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => onViewTypeChange(option.value)}
                      className="px-3"
                    >
                      <IconComponent className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{option.label} view</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ====================================
// PROPERTY CARD COMPONENT
// ====================================

const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  viewType,
  onFavorite,
  onShare,
  onSelect,
  isFavorited,
  priority = 'medium'
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleFavoriteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onFavorite(property.id);
  }, [property.id, onFavorite]);

  const handleShareClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onShare(property);
  }, [property, onShare]);

  const primaryImage = property.images.find(img => img.isPrimary) || property.images[0];
  
  // Grid view (default)
  if (viewType === 'grid') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -4 }}
        transition={{ duration: 0.2 }}
        className="group cursor-pointer"
        onClick={() => onSelect(property)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Card className="overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300">
          {/* Image Container */}
          <div className="relative aspect-[4/3] overflow-hidden">
            {!imageLoaded && (
              <Skeleton className="absolute inset-0 rounded-none" />
            )}
            <img
              src={primaryImage?.url || '/api/placeholder/400/300'}
              alt={primaryImage?.alt || property.title}
              className={`w-full h-full object-cover transition-all duration-500 ${
                imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
              } ${isHovered ? 'scale-110' : ''}`}
              onLoad={() => setImageLoaded(true)}
              loading={priority === 'high' ? 'eager' : 'lazy'}
            />
            
            {/* Overlay Actions */}
            <div className="absolute top-3 right-3 flex space-x-2">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleFavoriteClick}
                className="p-2 bg-white/90 hover:bg-white rounded-full shadow-md backdrop-blur-sm"
              >
                <Heart 
                  className={`w-4 h-4 transition-colors ${
                    isFavorited ? 'fill-red-500 text-red-500' : 'text-gray-700'
                  }`} 
                />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleShareClick}
                className="p-2 bg-white/90 hover:bg-white rounded-full shadow-md backdrop-blur-sm"
              >
                <Share2 className="w-4 h-4 text-gray-700" />
              </motion.button>
            </div>

            {/* Property badges */}
            <div className="absolute bottom-3 left-3 flex space-x-2">
              {property.host.isSuperhost && (
                <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                  <Award className="w-3 h-3 mr-1" />
                  Superhost
                </Badge>
              )}
              {property.availability.instantBook && (
                <Badge className="bg-green-600 text-white">
                  <Zap className="w-3 h-3 mr-1" />
                  Instant
                </Badge>
              )}
            </div>

            {/* Image count indicator */}
            {property.images.length > 1 && (
              <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/70 text-white text-xs rounded-full flex items-center space-x-1">
                <Camera className="w-3 h-3" />
                <span>{property.images.length}</span>
              </div>
            )}
          </div>

          {/* Content */}
          <CardContent className="p-4">
            <div className="space-y-2">
              {/* Location & Rating */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400">
                  <MapPin className="w-3 h-3" />
                  <span>{property.location.address.city}, {property.location.address.state}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium">{(property as any).displayRating}</span>
                  <span className="text-sm text-gray-500">({(property as any).reviewCount})</span>
                </div>
              </div>

              {/* Title */}
              <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2 group-hover:text-blue-600 transition-colors">
                {property.title}
              </h3>

              {/* Property details */}
              <div className="flex items-center space-x-3 text-sm text-gray-600 dark:text-gray-400">
                <span>4 guests</span>
                <span>•</span>
                <span>2 bedrooms</span>
                <span>•</span>
                <span>1 bathroom</span>
              </div>

              {/* Pricing */}
              <div className="flex items-center justify-between pt-2">
                <div>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    ${property.pricing.basePrice.amount}
                  </span>
                  <span className="text-sm text-gray-500 ml-1">/ night</span>
                </div>
                {property.distance && (
                  <div className="text-sm text-gray-500">
                    {property.distance.toFixed(1)} km away
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // List view
  if (viewType === 'list') {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="group cursor-pointer"
        onClick={() => onSelect(property)}
      >
        <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
          <CardContent className="p-0">
            <div className="flex">
              {/* Image */}
              <div className="relative w-64 h-48 flex-shrink-0">
                <img
                  src={primaryImage?.url || '/api/placeholder/400/300'}
                  alt={primaryImage?.alt || property.title}
                  className="w-full h-full object-cover"
                  loading={priority === 'high' ? 'eager' : 'lazy'}
                />
                <div className="absolute top-3 right-3 flex space-x-2">
                  <button
                    onClick={handleFavoriteClick}
                    className="p-2 bg-white/90 rounded-full shadow-md"
                  >
                    <Heart 
                      className={`w-4 h-4 ${
                        isFavorited ? 'fill-red-500 text-red-500' : 'text-gray-700'
                      }`} 
                    />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
                        {property.title}
                      </h3>
                      {property.host.isSuperhost && (
                        <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                          Superhost
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400 mb-2">
                      <MapPin className="w-3 h-3" />
                      <span>{property.location.address.city}, {property.location.address.state}</span>
                    </div>

                    <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                      <span>{property.capacity.maxGuests} guests</span>
                      <span>•</span>
                      <span>{property.capacity.bedrooms} bedrooms</span>
                      <span>•</span>
                      <span>{property.capacity.bathrooms} bathrooms</span>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                      {property.description}
                    </p>

                    {/* Amenities */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {property.amenities.slice(0, 4).map((amenity) => (
                        <Badge key={amenity.id} variant="secondary" className="text-xs">
                          {amenity.name}
                        </Badge>
                      ))}
                      {property.amenities.length > 4 && (
                        <Badge variant="outline" className="text-xs">
                          +{property.amenities.length - 4} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="text-right ml-6">
                    <div className="flex items-center space-x-1 mb-2">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{property.rating}</span>
                      <span className="text-sm text-gray-500">({property.reviewCount})</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-bold text-gray-900 dark:text-white">
                        ${property.pricing.basePrice.amount}
                      </span>
                      <span className="text-sm text-gray-500 block">/ night</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return null;
};

// ====================================
// MAP VIEW COMPONENT
// ====================================

const MapView: React.FC<MapViewProps> = ({
  properties,
  clusters,
  config,
  onConfigChange,
  onPropertyHover,
  onPropertySelect
}) => {
  return (
    <div className="relative h-[600px] bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
      {/* Map placeholder - would integrate with actual map library */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <MapIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Interactive Map Integration</p>
          <p className="text-gray-400 text-sm">Would show {properties.length} properties with clustering</p>
        </div>
      </div>

      {/* Map controls */}
      <div className="absolute top-4 right-4 flex flex-col space-y-2">
        <Button variant="secondary" size="sm">
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button variant="secondary" size="sm">
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button variant="secondary" size="sm">
          <Maximize2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Map legend */}
      <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg">
        <div className="space-y-2 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
            <span>Available Properties</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-600 rounded-full"></div>
            <span>Price Clusters</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-600 rounded-full"></div>
            <span>Instant Book</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ====================================
// MAIN COMPONENT
// ====================================

export const PropertySearchPlatform: React.FC<PropertySearchPlatformProps> = ({
  className = "",
  onPropertySelect,
  onMapInteraction
}) => {
  // Store state
  const {
    query,
    filters,
    results,
    totalResults,
    isLoading,
    isSearching,
    viewType,
    favorites,
    savedSearches,
    setQuery,
    updateFilters,
    setViewType,
    executeSearch,
    toggleFavorite,
    hasNextPage,
    isLoadingMore
  } = useSearchStore();

  // Get sortBy from filters or default
  const sortBy = filters.sortBy || 'relevance';
  // Mock searchAnalytics for now
  const searchAnalytics = null;

  // Add missing properties to results for display
  const enhancedResults = useMemo(() => 
    results.map(property => ({
      ...property,
      // Add mock properties if missing for display
      reviewCount: property.reviews?.total || 156,
      distance: Math.random() * 50, // Mock distance
      displayRating: typeof property.rating === 'object' ? property.rating.overall || 4.5 : property.rating || 4.5
    })),
    [results]
  );

  // Placeholder functions for missing store methods
  const clearResults = useCallback(() => {
    // Implementation would be added to store
    console.log('Clear results called');
  }, []);

  const loadMore = useCallback(() => {
    // Implementation would be added to store
    console.log('Load more called');
  }, []);

  // Local state
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<PropertySearchResult | null>(null);
  const [hoveredPropertyId, setHoveredPropertyId] = useState<string | null>(null);
  const [searchInitiated, setSearchInitiated] = useState(false);

  // Refs
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);

  // Scroll animations
  const { scrollY } = useScroll();
  const searchBarY = useTransform(scrollY, [0, 100], [0, -50]);

  // ====================================
  // HANDLERS
  // ====================================

  const handleSearch = useCallback(async (searchQuery?: string, searchFilters?: Partial<PropertySearchFilters>) => {
    setSearchInitiated(true);
    
    if (searchQuery !== undefined) {
      setQuery(searchQuery);
    }
    
    if (searchFilters) {
      updateFilters(searchFilters);
    }
    
    await executeSearch();
  }, [setQuery, updateFilters, executeSearch]);

  const handlePropertySelect = useCallback((property: PropertySearchResult) => {
    setSelectedProperty(property);
    onPropertySelect?.(property);
  }, [onPropertySelect]);

  const handlePropertyShare = useCallback((property: PropertySearchResult) => {
    navigator.share?.({
      title: property.title,
      text: property.description,
      url: `${window.location.origin}/properties/${property.id}`
    }).catch(() => {
      // Fallback to copying to clipboard
      navigator.clipboard.writeText(`${window.location.origin}/properties/${property.id}`);
      toast({
        title: "Link copied",
        description: "Property link copied to clipboard"
      });
    });
  }, []);

  const handleViewTypeChange = useCallback((newViewType: ViewType) => {
    setViewType(newViewType);
  }, [setViewType]);

  const handleSortChange = useCallback((newSort: SortOption) => {
    updateFilters({ sortBy: newSort });
    executeSearch();
  }, [updateFilters, executeSearch]);

  // ====================================
  // INFINITE SCROLL
  // ====================================

  useEffect(() => {
    if (!loadMoreTriggerRef.current || !hasNextPage || isLoadingMore) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isLoadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    observerRef.current.observe(loadMoreTriggerRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasNextPage, isLoadingMore, loadMore]);

  // ====================================
  // RENDER FUNCTIONS
  // ====================================

  const renderSearchResults = () => {
    if (!searchInitiated) {
      return (
        <div className="text-center py-16">
          <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">Start your search</h3>
          <p className="text-gray-500">Use the search bar above to find amazing properties</p>
        </div>
      );
    }

    if (isLoading && results.length === 0) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
          {Array.from({ length: 12 }).map((_, index) => (
            <Card key={index} className="overflow-hidden">
              <Skeleton className="aspect-[4/3] w-full" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-6 w-1/3" />
              </div>
            </Card>
          ))}
        </div>
      );
    }

    if (results.length === 0 && !isLoading) {
      return (
        <div className="text-center py-16">
          <AlertTriangle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No properties found</h3>
          <p className="text-gray-500 mb-4">Try adjusting your search criteria or filters</p>
          <Button onClick={() => clearResults()} variant="outline">
            Clear filters
          </Button>
        </div>
      );
    }

    // Map view
    if (viewType === 'map') {
      return (
        <div className="p-6">
          <MapView
            properties={results}
            clusters={[]}
            config={{
              center: { latitude: 0, longitude: 0 },
              zoom: 10,
              clustering: true,
              heatmap: false,
              streetView: true,
              drawingTools: false,
              layers: []
            }}
            onConfigChange={(config) => onMapInteraction?.(config)}
            onPropertyHover={setHoveredPropertyId}
            onPropertySelect={handlePropertySelect}
          />
        </div>
      );
    }

    // Grid/List view
    return (
      <div className="p-6">
        <div className={`
          grid gap-6
          ${viewType === 'grid' 
            ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
            : 'grid-cols-1'
          }
        `}>
          <AnimatePresence mode="wait">
            {results.map((property, index) => (
              <PropertyCard
                key={property.id}
                property={property}
                viewType={viewType}
                onFavorite={toggleFavorite}
                onShare={handlePropertyShare}
                onSelect={handlePropertySelect}
                isFavorited={favorites.includes(property.id)}
                priority={index < 4 ? 'high' : 'medium'}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Load more trigger */}
        {hasNextPage && (
          <div ref={loadMoreTriggerRef} className="flex justify-center py-8">
            {isLoadingMore ? (
              <div className="flex items-center space-x-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Loading more properties...</span>
              </div>
            ) : (
              <Button onClick={() => loadMore()} variant="outline">
                Load more properties
              </Button>
            )}
          </div>
        )}
      </div>
    );
  };

  // ====================================
  // MAIN RENDER
  // ====================================

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${className}`}>
      {/* Search Header */}
      <motion.div
        style={{ y: searchBarY }}
        className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm"
      >
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            {/* Intelligent Search */}
            <div className="flex-1">
              <IntelligentSearch
                onSearchSubmit={(query) => handleSearch(query)}
                placeholder="Where to? Try 'Beach villa with pool' or use voice search"
              />
            </div>

            {/* Filter Toggle */}
            <Button
              variant="outline"
              onClick={() => setShowFilters(true)}
              className="flex items-center space-x-2"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Filters</span>
              {Object.keys(filters).length > 0 && (
                <Badge variant="default" className="ml-2">
                  {Object.keys(filters).length}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Results Header */}
      {searchInitiated && (
        <SearchResultsHeader
          totalResults={totalResults}
          viewType={viewType}
          onViewTypeChange={handleViewTypeChange}
          sortBy={sortBy}
          onSortChange={handleSortChange}
          isLoading={isLoading}
          searchAnalytics={searchAnalytics}
        />
      )}

      {/* Search Results */}
      <div ref={resultsContainerRef}>
        {renderSearchResults()}
      </div>

      {/* Advanced Filters Panel */}
      <AdvancedFilters
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
      />

      {/* Loading Overlay */}
      {isSearching && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6">
            <div className="flex items-center space-x-3">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span className="text-lg">Searching properties...</span>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};