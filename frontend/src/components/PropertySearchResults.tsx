import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Slider } from './ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
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
  PetIcon,
  Cigarette,
  CigaretteOff,
  Volume2,
  VolumeX,
  Sparkles
} from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface Property {
  id: string;
  title: string;
  type: string;
  location: string;
  distance: string;
  price: number;
  rating: number;
  reviews: number;
  images: string[];
  amenities: string[];
  isEcoFriendly: boolean;
  instantBook: boolean;
  host: {
    name: string;
    verified: boolean;
    avatar: string;
    isSuperhost?: boolean;
  };
  description: string;
  bedrooms?: number;
  bathrooms?: number;
  maxGuests?: number;
  accessibility?: boolean;
  smoking?: boolean;
  petFriendly?: boolean;
}

const mockProperties: Property[] = [
  {
    id: '1',
    title: 'Luxury Oceanview Villa with Private Pool',
    type: 'Villa',
    location: 'Seminyak, Bali',
    distance: '2.1 km from center',
    price: 450,
    rating: 4.9,
    reviews: 127,
    bedrooms: 4,
    bathrooms: 3,
    maxGuests: 8,
    images: [
      'https://images.unsplash.com/photo-1640608788324-33d0b6496b4f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHhiZWFjaGZyb250JTIwdmlsbGElMjBvY2VhbiUyMHZpZXd8ZW58MXx8fHwxNzU4MzEwODg0fDA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1632598024410-3d8f24daab57?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBob3RlbCUyMHJvb20lMjBpbnRlcmlvcnxlbnwxfHx8fDE3NTgyNTUyODZ8MA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1662454419622-a41092ecd245?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBhcGFydG1lbnQlMjBsaXZpbmclMjByb29tfGVufDF8fHx8MTc1ODI3NzA4N3ww&ixlib=rb-4.1.0&q=80&w=1080'
    ],
    amenities: ['wifi', 'pool', 'parking', 'kitchen', 'gym', 'spa', 'balcony', 'aircon'],
    isEcoFriendly: true,
    instantBook: true,
    accessibility: false,
    smoking: false,
    petFriendly: true,
    host: {
      name: 'Maria Santos',
      verified: true,
      isSuperhost: true,
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face'
    },
    description: 'Stunning oceanview villa with private pool and direct beach access. Perfect for romantic getaways or family vacations.'
  },
  {
    id: '2',
    title: 'Modern Downtown Apartment',
    type: 'Apartment',
    location: 'Shibuya, Tokyo',
    distance: '0.8 km from center',
    price: 180,
    rating: 4.7,
    reviews: 89,
    bedrooms: 2,
    bathrooms: 1,
    maxGuests: 4,
    images: [
      'https://images.unsplash.com/photo-1662454419622-a41092ecd245?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBhcGFydG1lbnQlMjBsaXZpbmclMjByb29tfGVufDF8fHx8MTc1ODI3NzA4N3ww&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1698910746353-65dadc2c2dcd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cmF2ZWwlMjBkZXN0aW5hdGlvbiUyMGNpdHlzY2FwZXxlbnwxfHx8fDE3NTgzMTA4ODl8MA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1682221568203-16f33b35e57d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHhib3V0aXF1ZSUyMGhvdGVsJTIwbG9iYnl8ZW58MXx8fHwxNzU4Mjc3NTM5fDA&ixlib=rb-4.1.0&q=80&w=1080'
    ],
    amenities: ['wifi', 'kitchen', 'gym', 'tv', 'aircon'],
    isEcoFriendly: false,
    instantBook: false,
    accessibility: true,
    smoking: false,
    petFriendly: false,
    host: {
      name: 'Takeshi Yamamoto',
      verified: true,
      isSuperhost: false,
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face'
    },
    description: 'Sleek modern apartment in the heart of Tokyo. Walking distance to subway stations and major attractions.'
  },
  {
    id: '3',
    title: 'Boutique Hotel Suite with Caldera View',
    type: 'Hotel',
    location: 'Oia, Santorini',
    distance: '1.5 km from center',
    price: 320,
    rating: 4.8,
    reviews: 156,
    bedrooms: 1,
    bathrooms: 1,
    maxGuests: 2,
    images: [
      'https://images.unsplash.com/photo-1632598024410-3d8f24daab57?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBob3RlbCUyMHJvb20lMjBpbnRlcmlvcnxlbnwxfHx8fDE3NTgyNTUyODZ8MA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1682221568203-16f33b35e57d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHhib3V0aXF1ZSUyMGhvdGVsJTIwbG9iYnl8ZW58MXx8fHwxNzU4Mjc3NTM5fDA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1640608788324-33d0b6496b4f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHhiZWFjaGZyb250JTIwdmlsbGElMjBvY2VhbiUyMHZpZXd8ZW58MXx8fHwxNzU4MzEwODg0fDA&ixlib=rb-4.1.0&q=80&w=1080'
    ],
    amenities: ['wifi', 'pool', 'spa', 'restaurant', 'balcony', 'tv', 'minibar'],
    isEcoFriendly: true,
    instantBook: true,
    accessibility: false,
    smoking: false,
    petFriendly: false,
    host: {
      name: 'Elena Papadopoulos',
      verified: true,
      isSuperhost: true,
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face'
    },
    description: 'Elegant boutique hotel suite with caldera views. Experience authentic Greek hospitality in luxury.'
  },
  {
    id: '4',
    title: 'Mountain Resort Chalet',
    type: 'Chalet',
    location: 'Zermatt, Swiss Alps',
    distance: '3.2 km from center',
    price: 275,
    rating: 4.9,
    reviews: 203,
    bedrooms: 3,
    bathrooms: 2,
    maxGuests: 6,
    images: [
      'https://images.unsplash.com/photo-1667293272142-21d22f60acf5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb3VudGFpbiUyMHJlc29ydCUyMGFjY29tbW9kYXRpb258ZW58MXx8fHwxNzU4MzEwODkzfDA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1632598024410-3d8f24daab57?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBob3RlbCUyMHJvb20lMjBpbnRlcmlvcnxlbnwxfHx8fDE3NTgyNTUyODZ8MA&ixlib=rb-4.1.0&q=80&w=1080'
    ],
    amenities: ['wifi', 'parking', 'kitchen', 'spa', 'mountain-view', 'fireplace'],
    isEcoFriendly: true,
    instantBook: false,
    accessibility: true,
    smoking: false,
    petFriendly: true,
    host: {
      name: 'Hans Mueller',
      verified: true,
      isSuperhost: true,
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face'
    },
    description: 'Cozy mountain chalet with breathtaking alpine views. Perfect for skiing and hiking adventures.'
  }
];

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
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid');
  const [showFilters, setShowFilters] = useState(true);
  const [sortBy, setSortBy] = useState('price-low');
  const [currency, setCurrency] = useState('USD');
  const [priceRange, setPriceRange] = useState([0, 1000]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  
  const [filters, setFilters] = useState({
    propertyTypes: [] as string[],
    amenities: [] as string[],
    roomFeatures: [] as string[],
    hostPreferences: [] as string[],
    accessibility: [] as string[],
    ecoFriendly: false,
    instantBook: false,
    petFriendly: false,
    smokingAllowed: false,
    minRating: 0,
    bedrooms: 0,
    bathrooms: 0
  });

  const propertyTypes = ['Apartment', 'Villa', 'Hotel', 'House', 'Condo', 'Chalet', 'Loft', 'Treehouse'];
  const amenities = ['wifi', 'pool', 'parking', 'kitchen', 'gym', 'spa', 'restaurant', 'aircon'];
  const roomFeatures = ['balcony', 'mountain-view', 'bath', 'tv', 'minibar', 'fireplace'];
  const hostPreferences = ['superhost', 'instant-book', 'verified'];
  const accessibilityFeatures = ['wheelchair-accessible', 'visual-aids', 'hearing-aids'];

  // Filter properties based on current filters
  const filteredProperties = mockProperties.filter(property => {
    // Property type filter
    if (filters.propertyTypes.length > 0 && !filters.propertyTypes.includes(property.type)) {
      return false;
    }
    
    // Price range filter
    if (property.price < priceRange[0] || property.price > priceRange[1]) {
      return false;
    }
    
    // Quick filters
    if (filters.ecoFriendly && !property.isEcoFriendly) return false;
    if (filters.instantBook && !property.instantBook) return false;
    if (filters.petFriendly && !property.petFriendly) return false;
    if (filters.smokingAllowed && !property.smoking) return false;
    
    // Amenities filter
    if (filters.amenities.length > 0) {
      const hasAllAmenities = filters.amenities.every(amenity => 
        property.amenities.includes(amenity)
      );
      if (!hasAllAmenities) return false;
    }
    
    // Room features filter
    if (filters.roomFeatures.length > 0) {
      const hasAllFeatures = filters.roomFeatures.every(feature => 
        property.amenities.includes(feature)
      );
      if (!hasAllFeatures) return false;
    }
    
    // Rating filter
    if (property.rating < filters.minRating) return false;
    
    // Bedrooms filter
    if (filters.bedrooms > 0 && (property.bedrooms || 0) < filters.bedrooms) return false;
    
    // Bathrooms filter
    if (filters.bathrooms > 0 && (property.bathrooms || 0) < filters.bathrooms) return false;
    
    return true;
  });

  // Sort properties
  const sortedProperties = [...filteredProperties].sort((a, b) => {
    switch (sortBy) {
      case 'price-low':
        return a.price - b.price;
      case 'price-high':
        return b.price - a.price;
      case 'rating':
        return b.rating - a.rating;
      case 'distance':
        return parseFloat(a.distance) - parseFloat(b.distance);
      case 'eco-score':
        return (b.isEcoFriendly ? 1 : 0) - (a.isEcoFriendly ? 1 : 0);
      default:
        return 0;
    }
  });

  const clearFilter = (filterType: string, value?: string) => {
    if (value) {
      setFilters({
        ...filters,
        [filterType]: (filters[filterType as keyof typeof filters] as string[]).filter(v => v !== value)
      });
    } else {
      setFilters({
        ...filters,
        [filterType]: filterType === 'propertyTypes' || filterType === 'amenities' || filterType === 'roomFeatures' || filterType === 'hostPreferences' || filterType === 'accessibility' ? [] : false
      });
    }
  };

  const clearAllFilters = () => {
    setFilters({
      propertyTypes: [],
      amenities: [],
      roomFeatures: [],
      hostPreferences: [],
      accessibility: [],
      ecoFriendly: false,
      instantBook: false,
      petFriendly: false,
      smokingAllowed: false,
      minRating: 0,
      bedrooms: 0,
      bathrooms: 0
    });
    setPriceRange([0, 1000]);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.propertyTypes.length > 0) count += filters.propertyTypes.length;
    if (filters.amenities.length > 0) count += filters.amenities.length;
    if (filters.roomFeatures.length > 0) count += filters.roomFeatures.length;
    if (filters.ecoFriendly) count++;
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
                  checked={filters.propertyTypes.includes(type)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setFilters({
                        ...filters,
                        propertyTypes: [...filters.propertyTypes, type]
                      });
                    } else {
                      setFilters({
                        ...filters,
                        propertyTypes: filters.propertyTypes.filter(t => t !== type)
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