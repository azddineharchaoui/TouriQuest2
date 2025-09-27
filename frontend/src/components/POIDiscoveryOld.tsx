import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Slider } from './ui/slider';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { 
  Search, 
  MapPin, 
  Star,
  Clock,
  DollarSign,
  Navigation,
  Filter,
  Grid3X3,
  List,
  Map,
  TrendingUp,
  Camera,
  Eye,
  Headphones,
  Sparkles,
  Building2,
  Castle,
  Trees,
  Utensils,
  Star as StarIcon,
  ShoppingBag,
  Moon,
  ArrowUpDown,
  SlidersHorizontal,
  Heart,
  Share2,
  Play,
  Volume2,
  Smartphone,
  Users,
  Accessibility,
  Baby,
  CameraIcon,
  Info,
  ChevronRight,
  X,
  Zap,
  Loader2,
  AlertCircle,
  CheckCircle,
  Plus,
  Minus,
  RefreshCw,
  BookOpen,
  Languages,
  Route,
  Timer,
  ThumbsUp,
  MessageSquare,
  MoreVertical,
  Download,
  ExternalLink,
  Calendar,
  UserCheck
} from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { POIService } from '../api/services/poi';
import { ApiClient } from '../api/client';
import type { POI as POIType, POICategory, POISearchFilters, AudioGuide } from '../types/poi';

// Enhanced interfaces for local POI display
interface LocalPOI {
  id: string;
  name: string;
  category: POICategory;
  image: string;
  rating: number;
  reviews: number;
  distance: string;
  openingHours: string;
  isOpen: boolean;
  entryPrice: string;
  hasARExperience: boolean;
  hasAudioGuide: boolean;
  description: string;
  coordinates: { lat: number; lng: number };
  isAccessible: boolean;
  isFamilyFriendly: boolean;
  allowsPhotography: boolean;
  isTrending: boolean;
  tags: string[];
  estimatedVisitDuration: string;
  isFavorited?: boolean;
  hasVisited?: boolean;
  audioGuide?: AudioGuide;
}

interface ComparisonPOI extends LocalPOI {
  comparisonNotes?: string;
}

interface POIDiscoveryProps {
  onPOISelect: (poi: LocalPOI) => void;
  userLocation?: { lat: number; lng: number };
}

// Initialize API services
const apiClient = new ApiClient();
const poiService = new POIService(apiClient);

const categories = [
  { id: 'museums', name: 'Museums & Culture', icon: Building2, color: 'bg-purple-500' },
  { id: 'historical', name: 'Historical Sites', icon: Castle, color: 'bg-amber-600' },
  { id: 'nature', name: 'Nature & Parks', icon: Trees, color: 'bg-green-500' },
  { id: 'dining', name: 'Food & Dining', icon: Utensils, color: 'bg-orange-500' },
  { id: 'entertainment', name: 'Entertainment', icon: StarIcon, color: 'bg-pink-500' },
  { id: 'shopping', name: 'Shopping', icon: ShoppingBag, color: 'bg-blue-500' },
  { id: 'nightlife', name: 'Nightlife', icon: Moon, color: 'bg-indigo-600' }
];

const mockPOIs: POI[] = [
  {
    id: '1',
    name: 'National Art Museum',
    category: 'museums',
    image: 'https://images.unsplash.com/photo-1621760681857-215258afbbee?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtdXNldW0lMjBjdWx0dXJhbCUyMGhlcml0YWdlfGVufDF8fHx8MTc1ODIxNDU1M3ww&ixlib=rb-4.1.0&q=80&w=1080',
    rating: 4.7,
    reviews: 234,
    distance: '0.8 km',
    openingHours: '9:00 AM - 6:00 PM',
    isOpen: true,
    entryPrice: '$12',
    hasARExperience: true,
    hasAudioGuide: true,
    description: 'Discover world-class contemporary art collections spanning centuries of artistic excellence.',
    coordinates: { lat: 40.7128, lng: -74.0060 },
    isAccessible: true,
    isFamilyFriendly: true,
    allowsPhotography: false,
    isTrending: true,
    tags: ['art', 'culture', 'indoor'],
    estimatedVisitDuration: '2-3 hours'
  },
  {
    id: '2',
    name: 'Medieval Castle Fortress',
    category: 'historical',
    image: 'https://images.unsplash.com/photo-1633700774912-b26913ace672?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoaXN0b3JpY2FsJTIwY2FzdGxlJTIwYXJjaGl0ZWN0dXJlfGVufDF8fHx8MTc1ODMxMTU2NXww&ixlib=rb-4.1.0&q=80&w=1080',
    rating: 4.9,
    reviews: 512,
    distance: '2.1 km',
    openingHours: '10:00 AM - 5:00 PM',
    isOpen: true,
    entryPrice: '$18',
    hasARExperience: true,
    hasAudioGuide: true,
    description: 'Step back in time and explore this magnificently preserved medieval fortress.',
    coordinates: { lat: 40.7589, lng: -73.9851 },
    isAccessible: false,
    isFamilyFriendly: true,
    allowsPhotography: true,
    isTrending: true,
    tags: ['history', 'architecture', 'outdoor'],
    estimatedVisitDuration: '1.5-2 hours'
  },
  {
    id: '3',
    name: 'Central Botanical Gardens',
    category: 'nature',
    image: 'https://images.unsplash.com/photo-1680528221851-6689939132a2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxuYXR1cmUlMjBwYXJrJTIwZm9yZXN0fGVufDF8fHx8MTc1ODMxMTU3Mnww&ixlib=rb-4.1.0&q=80&w=1080',
    rating: 4.5,
    reviews: 128,
    distance: '1.3 km',
    openingHours: '6:00 AM - 8:00 PM',
    isOpen: true,
    entryPrice: 'Free',
    hasARExperience: false,
    hasAudioGuide: true,
    description: 'Peaceful oasis featuring rare plants and beautiful walking trails in the heart of the city.',
    coordinates: { lat: 40.7831, lng: -73.9712 },
    isAccessible: true,
    isFamilyFriendly: true,
    allowsPhotography: true,
    isTrending: false,
    tags: ['nature', 'outdoor', 'free'],
    estimatedVisitDuration: '1-2 hours'
  },
  {
    id: '4',
    name: 'Heritage Market Square',
    category: 'dining',
    image: 'https://images.unsplash.com/photo-1667388968964-4aa652df0a9b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmb29kJTIwZGluaW5nJTIwcmVzdGF1cmFudHxlbnwxfHx8fDE3NTgzMTE1NzV8MA&ixlib=rb-4.1.0&q=80&w=1080',
    rating: 4.6,
    reviews: 89,
    distance: '0.5 km',
    openingHours: '8:00 AM - 10:00 PM',
    isOpen: true,
    entryPrice: 'Free',
    hasARExperience: false,
    hasAudioGuide: false,
    description: 'Traditional food market offering local delicacies and artisanal crafts.',
    coordinates: { lat: 40.7505, lng: -73.9934 },
    isAccessible: true,
    isFamilyFriendly: true,
    allowsPhotography: true,
    isTrending: true,
    tags: ['food', 'shopping', 'local'],
    estimatedVisitDuration: '1-1.5 hours'
  },
  {
    id: '5',
    name: 'Grand Opera House',
    category: 'entertainment',
    image: 'https://images.unsplash.com/photo-1730320221074-b7199cbd25b7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlbnRlcnRhaW5tZW50JTIwdGhlYXRlciUyMHBlcmZvcm1hbmNlfGVufDF8fHx8MTc1ODMxMTU4Mnww&ixlib=rb-4.1.0&q=80&w=1080',
    rating: 4.8,
    reviews: 167,
    distance: '1.8 km',
    openingHours: 'Show times vary',
    isOpen: false,
    entryPrice: '$45-85',
    hasARExperience: false,
    hasAudioGuide: true,
    description: 'Historic opera house featuring world-class performances in stunning architecture.',
    coordinates: { lat: 40.7614, lng: -73.9776 },
    isAccessible: true,
    isFamilyFriendly: false,
    allowsPhotography: false,
    isTrending: false,
    tags: ['performance', 'culture', 'evening'],
    estimatedVisitDuration: '2.5-3 hours'
  },
  {
    id: '6',
    name: 'Artisan Quarter',
    category: 'shopping',
    image: 'https://images.unsplash.com/photo-1700857871010-351f697dd9f4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzaG9wcGluZyUyMG1hcmtldCUyMHN0cmVldHxlbnwxfHx8fDE3NTgzMTE1ODV8MA&ixlib=rb-4.1.0&q=80&w=1080',
    rating: 4.4,
    reviews: 93,
    distance: '0.9 km',
    openingHours: '10:00 AM - 7:00 PM',
    isOpen: true,
    entryPrice: 'Free',
    hasARExperience: false,
    hasAudioGuide: false,
    description: 'Charming cobblestone streets filled with unique boutiques and local craftspeople.',
    coordinates: { lat: 40.7282, lng: -74.0776 },
    isAccessible: false,
    isFamilyFriendly: true,
    allowsPhotography: true,
    isTrending: false,
    tags: ['shopping', 'crafts', 'outdoor'],
    estimatedVisitDuration: '1.5-2 hours'
  }
];

interface POIDiscoveryProps {
  onPOISelect: (poi: POI) => void;
  onExperienceSelect?: (experience: any) => void;
}

export function POIDiscovery({ onPOISelect, onExperienceSelect }: POIDiscoveryProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [distanceRange, setDistanceRange] = useState([5]);
  const [sortBy, setSortBy] = useState('distance');
  const [activeFilters, setActiveFilters] = useState({
    freeEntry: false,
    currentlyOpen: false,
    hasAudioGuide: false,
    hasARExperience: false,
    wheelchairAccessible: false,
    familyFriendly: false,
    allowsPhotography: false
  });

  const filteredPOIs = useMemo(() => {
    let filtered = mockPOIs;

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(poi => poi.category === selectedCategory);
    }

    // Search term filter
    if (searchTerm) {
      filtered = filtered.filter(poi => 
        poi.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        poi.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        poi.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply filters
    if (activeFilters.freeEntry) {
      filtered = filtered.filter(poi => poi.entryPrice === 'Free');
    }
    if (activeFilters.currentlyOpen) {
      filtered = filtered.filter(poi => poi.isOpen);
    }
    if (activeFilters.hasAudioGuide) {
      filtered = filtered.filter(poi => poi.hasAudioGuide);
    }
    if (activeFilters.hasARExperience) {
      filtered = filtered.filter(poi => poi.hasARExperience);
    }
    if (activeFilters.wheelchairAccessible) {
      filtered = filtered.filter(poi => poi.isAccessible);
    }
    if (activeFilters.familyFriendly) {
      filtered = filtered.filter(poi => poi.isFamilyFriendly);
    }
    if (activeFilters.allowsPhotography) {
      filtered = filtered.filter(poi => poi.allowsPhotography);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.rating - a.rating;
        case 'distance':
          return parseFloat(a.distance) - parseFloat(b.distance);
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return filtered;
  }, [selectedCategory, searchTerm, activeFilters, sortBy]);

  const trendingPOIs = mockPOIs.filter(poi => poi.isTrending);
  
  const getActiveFilterCount = () => {
    return Object.values(activeFilters).filter(Boolean).length + 
           (selectedCategory !== 'all' ? 1 : 0) +
           (searchTerm ? 1 : 0);
  };

  const clearAllFilters = () => {
    setSelectedCategory('all');
    setSearchTerm('');
    setActiveFilters({
      freeEntry: false,
      currentlyOpen: false,
      hasAudioGuide: false,
      hasARExperience: false,
      wheelchairAccessible: false,
      familyFriendly: false,
      allowsPhotography: false
    });
  };

  const renderCategoryFilters = () => (
    <div className="flex flex-wrap gap-3 mb-6">
      <button
        onClick={() => setSelectedCategory('all')}
        className={`flex items-center space-x-2 px-4 py-2 rounded-full border transition-colors ${
          selectedCategory === 'all' 
            ? 'bg-primary text-primary-foreground border-primary' 
            : 'bg-background hover:bg-muted border-border'
        }`}
      >
        <span>All Categories</span>
      </button>
      
      {categories.map((category) => {
        const Icon = category.icon;
        return (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-full border transition-colors ${
              selectedCategory === category.id 
                ? 'bg-primary text-primary-foreground border-primary' 
                : 'bg-background hover:bg-muted border-border'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{category.name}</span>
          </button>
        );
      })}
    </div>
  );

  const renderFilters = () => (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Filters</h3>
          {getActiveFilterCount() > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters}>
              Clear all ({getActiveFilterCount()})
            </Button>
          )}
        </div>

        <div>
          <h4 className="font-medium mb-3">Distance Range</h4>
          <Slider
            value={distanceRange}
            onValueChange={setDistanceRange}
            max={50}
            step={1}
            className="mb-2"
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>0 km</span>
            <span>{distanceRange[0]} km</span>
          </div>
        </div>

        <div>
          <h4 className="font-medium mb-3">Entry & Access</h4>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="freeEntry"
                checked={activeFilters.freeEntry}
                onCheckedChange={(checked) => 
                  setActiveFilters({ ...activeFilters, freeEntry: !!checked })
                }
              />
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <label htmlFor="freeEntry" className="text-sm">Free entry</label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="currentlyOpen"
                checked={activeFilters.currentlyOpen}
                onCheckedChange={(checked) => 
                  setActiveFilters({ ...activeFilters, currentlyOpen: !!checked })
                }
              />
              <Clock className="w-4 h-4 text-muted-foreground" />
              <label htmlFor="currentlyOpen" className="text-sm">Currently open</label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="wheelchairAccessible"
                checked={activeFilters.wheelchairAccessible}
                onCheckedChange={(checked) => 
                  setActiveFilters({ ...activeFilters, wheelchairAccessible: !!checked })
                }
              />
              <Accessibility className="w-4 h-4 text-muted-foreground" />
              <label htmlFor="wheelchairAccessible" className="text-sm">Wheelchair accessible</label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="familyFriendly"
                checked={activeFilters.familyFriendly}
                onCheckedChange={(checked) => 
                  setActiveFilters({ ...activeFilters, familyFriendly: !!checked })
                }
              />
              <Baby className="w-4 h-4 text-muted-foreground" />
              <label htmlFor="familyFriendly" className="text-sm">Family-friendly</label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="allowsPhotography"
                checked={activeFilters.allowsPhotography}
                onCheckedChange={(checked) => 
                  setActiveFilters({ ...activeFilters, allowsPhotography: !!checked })
                }
              />
              <CameraIcon className="w-4 h-4 text-muted-foreground" />
              <label htmlFor="allowsPhotography" className="text-sm">Photography allowed</label>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-medium mb-3">Experience Features</h4>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasAudioGuide"
                checked={activeFilters.hasAudioGuide}
                onCheckedChange={(checked) => 
                  setActiveFilters({ ...activeFilters, hasAudioGuide: !!checked })
                }
              />
              <Headphones className="w-4 h-4 text-muted-foreground" />
              <label htmlFor="hasAudioGuide" className="text-sm">Audio guide available</label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasARExperience"
                checked={activeFilters.hasARExperience}
                onCheckedChange={(checked) => 
                  setActiveFilters({ ...activeFilters, hasARExperience: !!checked })
                }
              />
              <Smartphone className="w-4 h-4 text-muted-foreground" />
              <label htmlFor="hasARExperience" className="text-sm">AR experience available</label>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );

  const renderPOICard = (poi: POI) => (
    <Card 
      key={poi.id} 
      className="overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 group"
      onClick={() => onPOISelect(poi)}
    >
      <div className="relative">
        <ImageWithFallback
          src={poi.image}
          alt={poi.name}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
        />
        
        {/* Status indicators */}
        <div className="absolute top-3 left-3 space-y-2">
          <Badge 
            className={`${poi.isOpen ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} border-0`}
          >
            <Clock className="w-3 h-3 mr-1" />
            {poi.isOpen ? 'Open' : 'Closed'}
          </Badge>
          
          {poi.isTrending && (
            <Badge className="bg-orange-100 text-orange-800 border-0">
              <TrendingUp className="w-3 h-3 mr-1" />
              Trending
            </Badge>
          )}
        </div>

        {/* Experience badges */}
        <div className="absolute top-3 right-3 space-y-2">
          {poi.hasARExperience && (
            <Badge className="bg-purple-100 text-purple-800 border-0">
              <Smartphone className="w-3 h-3 mr-1" />
              AR
            </Badge>
          )}
          {poi.hasAudioGuide && (
            <Badge className="bg-blue-100 text-blue-800 border-0">
              <Headphones className="w-3 h-3 mr-1" />
              Audio
            </Badge>
          )}
        </div>

        {/* Action buttons */}
        <div className="absolute bottom-3 right-3 flex space-x-2">
          <button 
            className="p-2 bg-white/90 hover:bg-white rounded-full transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              // Handle favorite
            }}
          >
            <Heart className="w-4 h-4" />
          </button>
          <button 
            className="p-2 bg-white/90 hover:bg-white rounded-full transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              // Handle share
            }}
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>

        {/* Category badge */}
        <div className="absolute bottom-3 left-3">
          {(() => {
            const category = categories.find(cat => cat.id === poi.category);
            if (!category) return null;
            const Icon = category.icon;
            return (
              <Badge className={`${category.color} text-black border-0`}>
                <Icon className="w-3 h-3 mr-1" />
                {category.name}
              </Badge>
            );
          })()}
        </div>
      </div>
      
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold line-clamp-1 mb-1">{poi.name}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2">{poi.description}</p>
          </div>
          <div className="flex items-center space-x-1 ml-2">
            <Star className="w-4 h-4 fill-current text-yellow-400" />
            <span className="text-sm font-medium">{poi.rating}</span>
            <span className="text-xs text-muted-foreground">({poi.reviews})</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center space-x-2">
            <MapPin className="w-3 h-3" />
            <span>{poi.distance}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="w-3 h-3" />
            <span>{poi.estimatedVisitDuration}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <span className={`font-medium ${poi.entryPrice === 'Free' ? 'text-green-600' : ''}`}>
              {poi.entryPrice}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            {poi.isAccessible && <Accessibility className="w-4 h-4 text-green-600" />}
            {poi.isFamilyFriendly && <Baby className="w-4 h-4 text-blue-600" />}
            {poi.allowsPhotography && <CameraIcon className="w-4 h-4 text-purple-600" />}
          </div>
        </div>

        <div className="pt-2">
          <p className="text-xs text-muted-foreground">{poi.openingHours}</p>
        </div>
      </div>
    </Card>
  );

  const renderTrendingSection = () => (
    <section className="space-y-6 mb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <TrendingUp className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold">Trending Now</h2>
        </div>
        <Button variant="outline" size="sm">
          View all trending
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {trendingPOIs.slice(0, 3).map(renderPOICard)}
      </div>
    </section>
  );

  return (
    <div className="container mx-auto px-4 py-6 space-y-8">
      {/* Hero Section */}
      <section className="text-center space-y-4 mb-8">
        <h1 className="text-4xl md:text-5xl font-bold">
          Discover Amazing Places
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Explore cultural sites, natural wonders, and hidden gems with immersive experiences
        </p>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search places, activities, or experiences..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-20 h-12"
            />
            <Button 
              size="sm" 
              className="absolute right-2 top-1/2 transform -translate-y-1/2"
              onClick={() => {/* Handle search */}}
            >
              <Navigation className="w-4 h-4 mr-2" />
              Near me
            </Button>
          </div>
        </div>
      </section>

      {/* Category Filters */}
      {renderCategoryFilters()}

      {/* Trending Section */}
      {renderTrendingSection()}

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold">
            {filteredPOIs.length} places found
          </h2>
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
            <SelectTrigger className="w-40">
              <ArrowUpDown className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="distance">Distance</SelectItem>
              <SelectItem value="rating">Rating</SelectItem>
              <SelectItem value="name">Name</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Active Filters */}
      {getActiveFilterCount() > 0 && (
        <div className="flex items-center space-x-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {selectedCategory !== 'all' && (
            <Badge variant="secondary" className="flex items-center space-x-1">
              <span>{categories.find(cat => cat.id === selectedCategory)?.name}</span>
              <button onClick={() => setSelectedCategory('all')}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {Object.entries(activeFilters).map(([key, value]) => value && (
            <Badge key={key} variant="secondary" className="flex items-center space-x-1">
              <span>{key.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
              <button onClick={() => setActiveFilters({ ...activeFilters, [key]: false })}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
          <Button variant="ghost" size="sm" onClick={clearAllFilters}>
            Clear all
          </Button>
        </div>
      )}

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
              {filteredPOIs.map(renderPOICard)}
            </div>
          )}

          {viewMode === 'list' && (
            <div className="space-y-4">
              {filteredPOIs.map((poi) => (
                <Card key={poi.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="flex">
                    <div className="w-64 h-40 relative">
                      <ImageWithFallback
                        src={poi.image}
                        alt={poi.name}
                        className="w-full h-full object-cover"
                      />
                      {poi.hasARExperience && (
                        <Badge className="absolute top-3 left-3 bg-purple-100 text-purple-800">
                          <Smartphone className="w-3 h-3 mr-1" />
                          AR Experience
                        </Badge>
                      )}
                    </div>
                    <div className="flex-1 p-6">
                      <div className="flex justify-between items-start h-full">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-lg font-semibold">{poi.name}</h3>
                              <p className="text-muted-foreground">{poi.description}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <Star className="w-4 h-4 fill-current text-yellow-400" />
                              <span>{poi.rating} ({poi.reviews} reviews)</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <MapPin className="w-4 h-4" />
                              <span>{poi.distance}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="w-4 h-4" />
                              <span>{poi.estimatedVisitDuration}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Badge className={`${poi.isOpen ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} border-0`}>
                              {poi.isOpen ? 'Open' : 'Closed'}
                            </Badge>
                            {poi.hasAudioGuide && (
                              <Badge className="bg-blue-100 text-blue-800 border-0">
                                <Headphones className="w-3 h-3 mr-1" />
                                Audio Guide
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-right ml-6">
                          <div className={`text-xl font-semibold ${poi.entryPrice === 'Free' ? 'text-green-600' : ''}`}>
                            {poi.entryPrice}
                          </div>
                          <div className="text-sm text-muted-foreground mb-3">{poi.openingHours}</div>
                          <Button onClick={() => onPOISelect(poi)}>
                            Explore
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
                  Interactive map would display POI markers with clustering, 
                  color-coding by category, and search-this-area functionality.
                </p>
                <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <p>• Color-coded markers by POI category</p>
                  <p>• Clustering for dense areas</p>
                  <p>• Distance-based filtering</p>
                  <p>• "Search this area" when map moves</p>
                </div>
              </div>
            </Card>
          )}

          {filteredPOIs.length === 0 && (
            <Card className="p-12 text-center">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">No places found</h3>
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