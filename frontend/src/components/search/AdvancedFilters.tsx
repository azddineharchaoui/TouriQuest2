/**
 * Advanced Property Filtering System
 * Dynamic filter categories with ML-powered suggestions and smart recommendations
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Star,
  MapPin,
  Home,
  Wifi,
  Car,
  Users,
  Calendar,
  DollarSign,
  Heart,
  Zap,
  Shield,
  Sparkles,
  TrendingUp,
  Clock,
  Coffee,
  Waves,
  Mountain,
  Building,
  TreePine,
  Palette,
  Award,
  Settings,
  RefreshCw,
  AlertTriangle,
  Check,
  Plus
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Slider } from '../ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import { ScrollArea } from '../ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { useSearchStore } from '../../stores/search/searchStore';
import type {
  PropertySearchFilters,
  FilterSuggestion,
  PropertyTypeFilter,
  TravelPurpose,
  ExperienceType,
  AtmosphereType,
  CancellationFlexibility,
  SortOption
} from '../../types/property-search';

// ====================================
// COMPONENT INTERFACES
// ====================================

interface AdvancedFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

interface FilterCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  isPopular?: boolean;
}

interface FilterGroup {
  id: string;
  name: string;
  icon: React.ReactNode;
  expanded: boolean;
  badgeCount?: number;
}

// ====================================
// FILTER CATEGORIES DATA
// ====================================

const propertyTypes: FilterCategory[] = [
  { id: 'entire_place', name: 'Entire place', icon: <Home className="w-4 h-4" />, description: 'Have the whole place to yourself', isPopular: true },
  { id: 'private_room', name: 'Private room', icon: <Building className="w-4 h-4" />, description: 'Your own room in a shared space' },
  { id: 'shared_room', name: 'Shared room', icon: <Users className="w-4 h-4" />, description: 'Sleep in a shared space' },
  { id: 'unique_stay', name: 'Unique stays', icon: <Sparkles className="w-4 h-4" />, description: 'Extraordinary accommodations', isPopular: true },
  { id: 'hotel', name: 'Hotels', icon: <Building className="w-4 h-4" />, description: 'Professional hospitality' },
  { id: 'apartment', name: 'Apartments', icon: <Building className="w-4 h-4" />, description: 'Urban living spaces' },
  { id: 'house', name: 'Houses', icon: <Home className="w-4 h-4" />, description: 'Standalone homes' },
  { id: 'villa', name: 'Villas', icon: <Home className="w-4 h-4" />, description: 'Luxury retreats' },
  { id: 'cabin', name: 'Cabins', icon: <TreePine className="w-4 h-4" />, description: 'Cozy woodland escapes' },
  { id: 'cottage', name: 'Cottages', icon: <Home className="w-4 h-4" />, description: 'Charming countryside' }
];

const amenities: FilterCategory[] = [
  { id: 'wifi', name: 'Wifi', icon: <Wifi className="w-4 h-4" />, description: 'High-speed internet', isPopular: true },
  { id: 'parking', name: 'Free parking', icon: <Car className="w-4 h-4" />, description: 'On-site parking available', isPopular: true },
  { id: 'pool', name: 'Swimming pool', icon: <Waves className="w-4 h-4" />, description: 'Pool access' },
  { id: 'kitchen', name: 'Kitchen', icon: <Coffee className="w-4 h-4" />, description: 'Full kitchen facilities' },
  { id: 'air_conditioning', name: 'Air conditioning', icon: <Settings className="w-4 h-4" />, description: 'Climate control' },
  { id: 'gym', name: 'Fitness center', icon: <Award className="w-4 h-4" />, description: 'Exercise facilities' },
  { id: 'spa', name: 'Spa', icon: <Sparkles className="w-4 h-4" />, description: 'Wellness and relaxation' },
  { id: 'beach_access', name: 'Beach access', icon: <Waves className="w-4 h-4" />, description: 'Direct beach access' },
  { id: 'mountain_view', name: 'Mountain view', icon: <Mountain className="w-4 h-4" />, description: 'Scenic mountain views' },
  { id: 'pet_friendly', name: 'Pet friendly', icon: <Heart className="w-4 h-4" />, description: 'Pets welcome' }
];

const travelPurposes: FilterCategory[] = [
  { id: 'leisure', name: 'Leisure', icon: <Heart className="w-4 h-4" />, description: 'Vacation and relaxation', isPopular: true },
  { id: 'business', name: 'Business', icon: <Building className="w-4 h-4" />, description: 'Work travel' },
  { id: 'romantic', name: 'Romantic', icon: <Heart className="w-4 h-4" />, description: 'Couples getaway' },
  { id: 'family', name: 'Family', icon: <Users className="w-4 h-4" />, description: 'Family vacation', isPopular: true },
  { id: 'adventure', name: 'Adventure', icon: <Mountain className="w-4 h-4" />, description: 'Outdoor activities' },
  { id: 'wellness', name: 'Wellness', icon: <Sparkles className="w-4 h-4" />, description: 'Health and wellness' },
  { id: 'cultural', name: 'Cultural', icon: <Palette className="w-4 h-4" />, description: 'Arts and culture' },
  { id: 'digital_nomad', name: 'Digital nomad', icon: <Wifi className="w-4 h-4" />, description: 'Remote work' }
];

const experienceTypes: FilterCategory[] = [
  { id: 'luxury', name: 'Luxury', icon: <Star className="w-4 h-4" />, description: 'Premium experiences' },
  { id: 'unique', name: 'Unique', icon: <Sparkles className="w-4 h-4" />, description: 'One-of-a-kind stays', isPopular: true },
  { id: 'eco_friendly', name: 'Eco-friendly', icon: <TreePine className="w-4 h-4" />, description: 'Sustainable options' },
  { id: 'historic', name: 'Historic', icon: <Clock className="w-4 h-4" />, description: 'Historical properties' },
  { id: 'modern', name: 'Modern', icon: <Building className="w-4 h-4" />, description: 'Contemporary design' },
  { id: 'beachfront', name: 'Beachfront', icon: <Waves className="w-4 h-4" />, description: 'Ocean views', isPopular: true },
  { id: 'mountain', name: 'Mountain', icon: <Mountain className="w-4 h-4" />, description: 'Mountain settings' },
  { id: 'urban', name: 'Urban', icon: <Building className="w-4 h-4" />, description: 'City center' },
  { id: 'rural', name: 'Rural', icon: <TreePine className="w-4 h-4" />, description: 'Countryside' }
];

// ====================================
// MAIN COMPONENT
// ====================================

export const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  isOpen,
  onClose,
  className = ""
}) => {
  // Store state
  const {
    filters,
    filterSuggestions,
    updateFilters,
    clearFilters,
    applyFilterSuggestion,
    dismissFilterSuggestion
  } = useSearchStore();

  // Local state
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    location: true,
    dates: true,
    property: true,
    price: false,
    amenities: false,
    experience: false,
    host: false,
    policies: false
  });

  const [activeTab, setActiveTab] = useState('basic');
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [priceRange, setPriceRange] = useState([filters.minPrice || 0, filters.maxPrice || 1000]);

  // ====================================
  // FILTER LOGIC
  // ====================================

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.propertyTypes?.length) count += filters.propertyTypes.length;
    if (filters.amenities?.length) count += filters.amenities.length;
    if (filters.minPrice || filters.maxPrice) count += 1;
    if (filters.minRating) count += 1;
    if (filters.instantBook) count += 1;
    if (filters.superhost) count += 1;
    if (filters.freeCancellation) count += 1;
    return count;
  }, [filters]);

  const handlePropertyTypeToggle = useCallback((typeId: PropertyTypeFilter) => {
    const current = filters.propertyTypes || [];
    const updated = current.includes(typeId)
      ? current.filter(t => t !== typeId)
      : [...current, typeId];
    updateFilters({ propertyTypes: updated });
  }, [filters.propertyTypes, updateFilters]);

  const handleAmenityToggle = useCallback((amenityId: string) => {
    const current = filters.amenities || [];
    const updated = current.includes(amenityId)
      ? current.filter(a => a !== amenityId)
      : [...current, amenityId];
    updateFilters({ amenities: updated });
  }, [filters.amenities, updateFilters]);

  const handlePriceRangeChange = useCallback((newRange: number[]) => {
    setPriceRange(newRange);
    updateFilters({
      minPrice: newRange[0],
      maxPrice: newRange[1]
    });
  }, [updateFilters]);

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  }, []);

  const handleClearFilters = useCallback(() => {
    clearFilters();
    setPriceRange([0, 1000]);
  }, [clearFilters]);

  // ====================================
  // RENDER HELPERS
  // ====================================

  const renderFilterGroup = (
    groupId: string,
    title: string,
    icon: React.ReactNode,
    children: React.ReactNode,
    badgeCount?: number
  ) => (
    <div key={groupId} className="border-b border-gray-100 dark:border-gray-800">
      <button
        onClick={() => toggleGroup(groupId)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <div className="text-gray-500">{icon}</div>
          <span className="font-medium text-gray-900 dark:text-white">{title}</span>
          {badgeCount && badgeCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {badgeCount}
            </Badge>
          )}
        </div>
        {expandedGroups[groupId] ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>
      <AnimatePresence>
        {expandedGroups[groupId] && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const renderCategoryGrid = (
    categories: FilterCategory[],
    selectedItems: string[] = [],
    onToggle: (id: string) => void,
    showAll: boolean = true
  ) => {
    const displayCategories = showAll ? categories : categories.slice(0, 6);
    
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {displayCategories.map((category) => {
            const isSelected = selectedItems.includes(category.id);
            return (
              <TooltipProvider key={category.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onToggle(category.id)}
                      className={`
                        p-3 rounded-lg border-2 text-left transition-all duration-200 group
                        ${isSelected
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className={`
                            ${isSelected ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}
                          `}>
                            {category.icon}
                          </div>
                          <span className={`
                            font-medium text-sm
                            ${isSelected ? 'text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-white'}
                          `}>
                            {category.name}
                          </span>
                        </div>
                        {category.isPopular && (
                          <Badge variant="secondary" className="text-xs">
                            Popular
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {category.description}
                      </p>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {category.description}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
        {!showAll && categories.length > 6 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAllAmenities(true)}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Show {categories.length - 6} more
          </Button>
        )}
      </div>
    );
  };

  // ====================================
  // RENDER
  // ====================================

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          {/* Filter panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={`
              fixed top-0 right-0 h-full w-full sm:w-96 bg-white dark:bg-gray-900 
              shadow-2xl z-50 flex flex-col ${className}
            `}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <Filter className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Filters
                </h2>
                {activeFiltersCount > 0 && (
                  <Badge variant="default" className="bg-blue-600">
                    {activeFiltersCount}
                  </Badge>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Filter suggestions */}
            {filterSuggestions.length > 0 && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-2 mb-3">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Smart suggestions
                  </span>
                </div>
                <div className="space-y-2">
                  {filterSuggestions.slice(0, 3).map((suggestion) => (
                    <div
                      key={suggestion.id}
                      className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {suggestion.title}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {suggestion.description}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => applyFilterSuggestion(suggestion)}
                          className="text-xs"
                        >
                          Apply
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => dismissFilterSuggestion(suggestion.id)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="px-4 pt-4">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">Basic</TabsTrigger>
                  <TabsTrigger value="advanced">Advanced</TabsTrigger>
                  <TabsTrigger value="experience">Experience</TabsTrigger>
                </TabsList>

                <ScrollArea className="flex-1 h-[calc(100vh-200px)]">
                  <TabsContent value="basic" className="space-y-0 mt-4">
                    {/* Property Types */}
                    {renderFilterGroup(
                      'property',
                      'Property type',
                      <Home className="w-4 h-4" />,
                      renderCategoryGrid(
                        propertyTypes.slice(0, 8),
                        filters.propertyTypes || [],
                        handlePropertyTypeToggle
                      ),
                      filters.propertyTypes?.length
                    )}

                    {/* Price Range */}
                    {renderFilterGroup(
                      'price',
                      'Price range',
                      <DollarSign className="w-4 h-4" />,
                      <div className="space-y-4">
                        <div className="px-3">
                          <Slider
                            value={priceRange}
                            onValueChange={handlePriceRangeChange}
                            max={1000}
                            min={0}
                            step={10}
                            className="w-full"
                          />
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">${priceRange[0]}</span>
                          <span className="text-gray-500">per night</span>
                          <span className="font-medium">${priceRange[1]}+</span>
                        </div>
                      </div>,
                      (filters.minPrice || filters.maxPrice) ? 1 : 0
                    )}

                    {/* Amenities */}
                    {renderFilterGroup(
                      'amenities',
                      'Amenities',
                      <Wifi className="w-4 h-4" />,
                      renderCategoryGrid(
                        amenities,
                        filters.amenities || [],
                        handleAmenityToggle,
                        showAllAmenities
                      ),
                      filters.amenities?.length
                    )}

                    {/* Quick Filters */}
                    {renderFilterGroup(
                      'quick',
                      'Quick filters',
                      <Zap className="w-4 h-4" />,
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="instant-book">Instant Book</Label>
                          <Switch
                            id="instant-book"
                            checked={filters.instantBook || false}
                            onCheckedChange={(checked) => updateFilters({ instantBook: checked })}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="superhost">Superhost</Label>
                          <Switch
                            id="superhost"
                            checked={filters.superhost || false}
                            onCheckedChange={(checked) => updateFilters({ superhost: checked })}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="free-cancellation">Free cancellation</Label>
                          <Switch
                            id="free-cancellation"
                            checked={filters.freeCancellation || false}
                            onCheckedChange={(checked) => updateFilters({ freeCancellation: checked })}
                          />
                        </div>
                      </div>,
                      [filters.instantBook, filters.superhost, filters.freeCancellation].filter(Boolean).length
                    )}
                  </TabsContent>

                  <TabsContent value="advanced" className="space-y-0 mt-4">
                    {/* Bedrooms & Bathrooms */}
                    {renderFilterGroup(
                      'rooms',
                      'Rooms & beds',
                      <Building className="w-4 h-4" />,
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium">Bedrooms</Label>
                          <div className="grid grid-cols-4 gap-2 mt-2">
                            {[0, 1, 2, 3, 4, 5, 6, 7].map((num) => (
                              <Button
                                key={num}
                                variant={filters.minBedrooms === num ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => updateFilters({ minBedrooms: num })}
                                className="text-xs"
                              >
                                {num === 0 ? 'Any' : num === 7 ? '7+' : num}
                              </Button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Bathrooms</Label>
                          <div className="grid grid-cols-4 gap-2 mt-2">
                            {[0, 1, 2, 3, 4].map((num) => (
                              <Button
                                key={num}
                                variant={filters.minBathrooms === num ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => updateFilters({ minBathrooms: num })}
                                className="text-xs"
                              >
                                {num === 0 ? 'Any' : num === 4 ? '4+' : num}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>,
                      [filters.minBedrooms, filters.minBathrooms].filter(x => x !== undefined && x > 0).length
                    )}

                    {/* Rating */}
                    {renderFilterGroup(
                      'rating',
                      'Guest rating',
                      <Star className="w-4 h-4" />,
                      <div className="space-y-3">
                        {[4.5, 4.0, 3.5, 3.0].map((rating) => (
                          <button
                            key={rating}
                            onClick={() => updateFilters({ minRating: rating })}
                            className={`
                              w-full flex items-center justify-between p-2 rounded-lg border transition-colors
                              ${filters.minRating === rating
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                              }
                            `}
                          >
                            <div className="flex items-center space-x-2">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span className="font-medium">{rating}+</span>
                            </div>
                            {filters.minRating === rating && (
                              <Check className="w-4 h-4 text-blue-600" />
                            )}
                          </button>
                        ))}
                      </div>,
                      filters.minRating ? 1 : 0
                    )}

                    {/* Host Preferences */}
                    {renderFilterGroup(
                      'host',
                      'Host preferences',
                      <Users className="w-4 h-4" />,
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm font-medium">Response time</Label>
                          <Select
                            value={filters.responseTime || ''}
                            onValueChange={(value) => updateFilters({ responseTime: value as any })}
                          >
                            <SelectTrigger className="mt-2">
                              <SelectValue placeholder="Any response time" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="within_hour">Within an hour</SelectItem>
                              <SelectItem value="within_day">Within a day</SelectItem>
                              <SelectItem value="few_days">Within a few days</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="verified-hosts">Verified hosts only</Label>
                          <Switch
                            id="verified-hosts"
                            checked={filters.verifiedHosts || false}
                            onCheckedChange={(checked) => updateFilters({ verifiedHosts: checked })}
                          />
                        </div>
                      </div>,
                      [filters.responseTime, filters.verifiedHosts].filter(Boolean).length
                    )}
                  </TabsContent>

                  <TabsContent value="experience" className="space-y-0 mt-4">
                    {/* Travel Purpose */}
                    {renderFilterGroup(
                      'purpose',
                      'Travel purpose',
                      <Heart className="w-4 h-4" />,
                      renderCategoryGrid(
                        travelPurposes,
                        filters.travelPurpose || [],
                        (id) => {
                          const current = filters.travelPurpose || [];
                          const updated = current.includes(id as TravelPurpose)
                            ? current.filter(t => t !== id)
                            : [...current, id as TravelPurpose];
                          updateFilters({ travelPurpose: updated });
                        }
                      ),
                      filters.travelPurpose?.length
                    )}

                    {/* Experience Type */}
                    {renderFilterGroup(
                      'experience',
                      'Experience type',
                      <Sparkles className="w-4 h-4" />,
                      renderCategoryGrid(
                        experienceTypes,
                        filters.experienceType || [],
                        (id) => {
                          const current = filters.experienceType || [];
                          const updated = current.includes(id as ExperienceType)
                            ? current.filter(t => t !== id)
                            : [...current, id as ExperienceType];
                          updateFilters({ experienceType: updated });
                        }
                      ),
                      filters.experienceType?.length
                    )}

                    {/* Special Requirements */}
                    {renderFilterGroup(
                      'special',
                      'Special requirements',
                      <Shield className="w-4 h-4" />,
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="pets-allowed">Pets allowed</Label>
                          <Switch
                            id="pets-allowed"
                            checked={filters.pets ? filters.pets > 0 : false}
                            onCheckedChange={(checked) => updateFilters({ pets: checked ? 1 : 0 })}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="smoking-allowed">Smoking allowed</Label>
                          <Switch
                            id="smoking-allowed"
                            checked={filters.smokingAllowed || false}
                            onCheckedChange={(checked) => updateFilters({ smokingAllowed: checked })}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="events-allowed">Events allowed</Label>
                          <Switch
                            id="events-allowed"
                            checked={filters.eventsAllowed || false}
                            onCheckedChange={(checked) => updateFilters({ eventsAllowed: checked })}
                          />
                        </div>
                      </div>,
                      [filters.pets, filters.smokingAllowed, filters.eventsAllowed].filter(Boolean).length
                    )}
                  </TabsContent>
                </ScrollArea>
              </Tabs>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <div className="flex items-center justify-between space-x-3">
                <Button
                  variant="outline"
                  onClick={handleClearFilters}
                  disabled={activeFiltersCount === 0}
                  className="flex-1"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Clear all
                </Button>
                <Button onClick={onClose} className="flex-1">
                  Show results
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};