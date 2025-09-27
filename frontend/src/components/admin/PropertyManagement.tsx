/**
 * Comprehensive Property Management Dashboard
 * Admin interface for managing properties, analytics, and operations
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Edit,
  Trash2,
  Eye,
  BarChart3,
  Calendar,
  Settings,
  MapPin,
  Star,
  DollarSign,
  Users,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Home,
  Building,
  Bed,
  Bath,
  Wifi,
  Car,
  Camera,
  Globe,
  Shield,
  Zap,
  Heart,
  MessageSquare,
  Phone,
  Mail,
  MoreHorizontal,
  ArrowUpDown,
  RefreshCw,
  FileText,
  PieChart,
  LineChart,
  Calendar as CalendarIcon,
  Bookmark,
  Target,
  Percent,
  CreditCard,
  Clock4,
  MapIcon,
  Navigation,
  Layers,
  Grid,
  List,
  SlidersHorizontal
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Checkbox } from '../ui/checkbox';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Separator } from '../ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Progress } from '../ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { ScrollArea } from '../ui/scroll-area';
import { Calendar as CalendarComponent } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Slider } from '../ui/slider';
import { PropertyCreateForm } from './PropertyCreateForm';
import { PropertyEditForm } from './PropertyEditForm';
import { PropertyAnalytics } from './PropertyAnalytics';
import { BulkOperations } from './BulkOperations';
import { PricingManagement } from './PricingManagement';
import { AvailabilityCalendar } from './AvailabilityCalendar';
import { PhotoUpload } from './PhotoUpload';

// ====================================
// TYPES & INTERFACES
// ====================================

interface PropertyManagementData {
  id: string;
  title: string;
  type: 'villa' | 'apartment' | 'house' | 'hotel' | 'cabin' | 'cottage';
  status: 'active' | 'inactive' | 'maintenance' | 'draft';
  location: {
    city: string;
    state: string;
    country: string;
    address: string;
  };
  pricing: {
    basePrice: number;
    currency: string;
    occupancyRate: number;
    revenue: number;
    averageNightlyRate: number;
  };
  performance: {
    rating: number;
    reviewCount: number;
    bookings: number;
    views: number;
    conversionRate: number;
    responseTime: number;
  };
  capacity: {
    maxGuests: number;
    bedrooms: number;
    bathrooms: number;
  };
  amenities: string[];
  images: {
    count: number;
    featured: string;
  };
  host: {
    id: string;
    name: string;
    avatar: string;
    isSuperhost: boolean;
  };
  lastUpdated: Date;
  createdAt: Date;
  featured: boolean;
  verified: boolean;
}

interface PropertyFilters {
  status: string[];
  type: string[];
  location: string;
  priceRange: [number, number];
  rating: number;
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  host: string;
  featured: boolean | null;
  verified: boolean | null;
}

interface PropertyStats {
  total: number;
  active: number;
  inactive: number;
  maintenance: number;
  draft: number;
  totalRevenue: number;
  averageOccupancy: number;
  averageRating: number;
  totalBookings: number;
}

// ====================================
// MOCK DATA
// ====================================

const mockProperties: PropertyManagementData[] = [
  {
    id: '1',
    title: 'Luxury Beachfront Villa',
    type: 'villa',
    status: 'active',
    location: {
      city: 'Malibu',
      state: 'California',
      country: 'United States',
      address: '123 Ocean Drive, Malibu, CA 90265'
    },
    pricing: {
      basePrice: 850,
      currency: 'USD',
      occupancyRate: 85,
      revenue: 45680,
      averageNightlyRate: 920
    },
    performance: {
      rating: 4.8,
      reviewCount: 156,
      bookings: 87,
      views: 2340,
      conversionRate: 3.7,
      responseTime: 2
    },
    capacity: {
      maxGuests: 8,
      bedrooms: 4,
      bathrooms: 3
    },
    amenities: ['wifi', 'pool', 'beach_access', 'parking', 'kitchen'],
    images: {
      count: 24,
      featured: '/api/placeholder/300/200'
    },
    host: {
      id: 'host1',
      name: 'Sarah Johnson',
      avatar: '/api/placeholder/40/40',
      isSuperhost: true
    },
    lastUpdated: new Date('2024-01-15'),
    createdAt: new Date('2023-06-10'),
    featured: true,
    verified: true
  },
  {
    id: '2',
    title: 'Modern Downtown Apartment',
    type: 'apartment',
    status: 'active',
    location: {
      city: 'New York',
      state: 'New York',
      country: 'United States',
      address: '456 Broadway, New York, NY 10013'
    },
    pricing: {
      basePrice: 320,
      currency: 'USD',
      occupancyRate: 92,
      revenue: 28450,
      averageNightlyRate: 340
    },
    performance: {
      rating: 4.6,
      reviewCount: 89,
      bookings: 124,
      views: 1890,
      conversionRate: 6.6,
      responseTime: 1
    },
    capacity: {
      maxGuests: 4,
      bedrooms: 2,
      bathrooms: 2
    },
    amenities: ['wifi', 'kitchen', 'air_conditioning', 'elevator'],
    images: {
      count: 18,
      featured: '/api/placeholder/300/200'
    },
    host: {
      id: 'host2',
      name: 'Michael Chen',
      avatar: '/api/placeholder/40/40',
      isSuperhost: false
    },
    lastUpdated: new Date('2024-01-12'),
    createdAt: new Date('2023-08-22'),
    featured: false,
    verified: true
  },
  {
    id: '3',
    title: 'Cozy Mountain Cabin',
    type: 'cabin',
    status: 'maintenance',
    location: {
      city: 'Aspen',
      state: 'Colorado',
      country: 'United States',
      address: '789 Mountain View Rd, Aspen, CO 81611'
    },
    pricing: {
      basePrice: 450,
      currency: 'USD',
      occupancyRate: 0,
      revenue: 12300,
      averageNightlyRate: 480
    },
    performance: {
      rating: 4.9,
      reviewCount: 43,
      bookings: 0,
      views: 567,
      conversionRate: 0,
      responseTime: 4
    },
    capacity: {
      maxGuests: 6,
      bedrooms: 3,
      bathrooms: 2
    },
    amenities: ['wifi', 'fireplace', 'mountain_view', 'parking'],
    images: {
      count: 15,
      featured: '/api/placeholder/300/200'
    },
    host: {
      id: 'host3',
      name: 'Emma Wilson',
      avatar: '/api/placeholder/40/40',
      isSuperhost: true
    },
    lastUpdated: new Date('2024-01-08'),
    createdAt: new Date('2023-04-15'),
    featured: false,
    verified: true
  }
];

const mockStats: PropertyStats = {
  total: 156,
  active: 142,
  inactive: 8,
  maintenance: 4,
  draft: 2,
  totalRevenue: 2450000,
  averageOccupancy: 78,
  averageRating: 4.6,
  totalBookings: 3420
};

// ====================================
// MAIN COMPONENT
// ====================================

export const PropertyManagement: React.FC = () => {
  // State
  const [properties, setProperties] = useState<PropertyManagementData[]>(mockProperties);
  const [stats, setStats] = useState<PropertyStats>(mockStats);
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [sortBy, setSortBy] = useState<string>('lastUpdated');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingProperty, setEditingProperty] = useState<PropertyManagementData | null>(null);
  const [showBulkOperations, setShowBulkOperations] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [filters, setFilters] = useState<PropertyFilters>({
    status: [],
    type: [],
    location: '',
    priceRange: [0, 2000],
    rating: 0,
    dateRange: { start: null, end: null },
    host: '',
    featured: null,
    verified: null
  });

  // ====================================
  // COMPUTED VALUES
  // ====================================

  const filteredProperties = useMemo(() => {
    return properties.filter(property => {
      // Search query
      if (searchQuery && !property.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !property.location.city.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !property.host.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Status filter
      if (filters.status.length > 0 && !filters.status.includes(property.status)) {
        return false;
      }

      // Type filter
      if (filters.type.length > 0 && !filters.type.includes(property.type)) {
        return false;
      }

      // Location filter
      if (filters.location && !property.location.city.toLowerCase().includes(filters.location.toLowerCase())) {
        return false;
      }

      // Price range filter
      if (property.pricing.basePrice < filters.priceRange[0] || property.pricing.basePrice > filters.priceRange[1]) {
        return false;
      }

      // Rating filter
      if (filters.rating > 0 && property.performance.rating < filters.rating) {
        return false;
      }

      // Featured filter
      if (filters.featured !== null && property.featured !== filters.featured) {
        return false;
      }

      // Verified filter
      if (filters.verified !== null && property.verified !== filters.verified) {
        return false;
      }

      return true;
    });
  }, [properties, searchQuery, filters]);

  const sortedProperties = useMemo(() => {
    return [...filteredProperties].sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'title':
          aValue = a.title;
          bValue = b.title;
          break;
        case 'rating':
          aValue = a.performance.rating;
          bValue = b.performance.rating;
          break;
        case 'revenue':
          aValue = a.pricing.revenue;
          bValue = b.pricing.revenue;
          break;
        case 'occupancy':
          aValue = a.pricing.occupancyRate;
          bValue = b.pricing.occupancyRate;
          break;
        case 'bookings':
          aValue = a.performance.bookings;
          bValue = b.performance.bookings;
          break;
        case 'lastUpdated':
        default:
          aValue = a.lastUpdated.getTime();
          bValue = b.lastUpdated.getTime();
          break;
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  }, [filteredProperties, sortBy, sortOrder]);

  // ====================================
  // EVENT HANDLERS
  // ====================================

  const handleSelectProperty = useCallback((propertyId: string) => {
    setSelectedProperties(prev =>
      prev.includes(propertyId)
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedProperties.length === sortedProperties.length) {
      setSelectedProperties([]);
    } else {
      setSelectedProperties(sortedProperties.map(p => p.id));
    }
  }, [selectedProperties, sortedProperties]);

  const handleEditProperty = useCallback((property: PropertyManagementData) => {
    setEditingProperty(property);
    setShowEditDialog(true);
  }, []);

  const handleDeleteProperty = useCallback(async (propertyId: string) => {
    if (window.confirm('Are you sure you want to delete this property?')) {
      setIsLoading(true);
      try {
        // TODO: Implement DELETE /api/v1/properties/{id}
        setProperties(prev => prev.filter(p => p.id !== propertyId));
      } catch (error) {
        console.error('Error deleting property:', error);
      } finally {
        setIsLoading(false);
      }
    }
  }, []);

  const handleStatusChange = useCallback(async (propertyId: string, newStatus: string) => {
    setIsLoading(true);
    try {
      // TODO: Implement PUT /api/v1/properties/{id}
      setProperties(prev =>
        prev.map(p =>
          p.id === propertyId
            ? { ...p, status: newStatus as any, lastUpdated: new Date() }
            : p
        )
      );
    } catch (error) {
      console.error('Error updating property status:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    try {
      // TODO: Implement GET /api/v1/properties/management
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
    } catch (error) {
      console.error('Error refreshing properties:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ====================================
  // RENDER FUNCTIONS
  // ====================================

  const renderStatsCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Properties
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats.total}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
              <Home className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
            <span className="text-green-600 dark:text-green-400">+8.2%</span>
            <span className="text-gray-500 ml-1">from last month</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Revenue
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                ${(stats.totalRevenue / 1000000).toFixed(1)}M
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
              <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
            <span className="text-green-600 dark:text-green-400">+12.5%</span>
            <span className="text-gray-500 ml-1">from last month</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Avg. Occupancy
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats.averageOccupancy}%
              </p>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-full">
              <BarChart3 className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
            <span className="text-red-600 dark:text-red-400">-2.1%</span>
            <span className="text-gray-500 ml-1">from last month</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Avg. Rating
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats.averageRating}
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
              <Star className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
            <span className="text-green-600 dark:text-green-400">+0.3</span>
            <span className="text-gray-500 ml-1">from last month</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderToolbar = () => (
    <Card className="mb-6">
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          {/* Search and filters */}
          <div className="flex flex-1 items-center space-x-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search properties, hosts, or locations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lastUpdated">Last Updated</SelectItem>
                <SelectItem value="title">Title</SelectItem>
                <SelectItem value="rating">Rating</SelectItem>
                <SelectItem value="revenue">Revenue</SelectItem>
                <SelectItem value="occupancy">Occupancy</SelectItem>
                <SelectItem value="bookings">Bookings</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              <ArrowUpDown className="w-4 h-4" />
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                  {(filters.status.length + filters.type.length) > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {filters.status.length + filters.type.length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {['active', 'inactive', 'maintenance', 'draft'].map((status) => (
                        <div key={status} className="flex items-center space-x-2">
                          <Checkbox
                            id={status}
                            checked={filters.status.includes(status)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFilters(prev => ({
                                  ...prev,
                                  status: [...prev.status, status]
                                }));
                              } else {
                                setFilters(prev => ({
                                  ...prev,
                                  status: prev.status.filter(s => s !== status)
                                }));
                              }
                            }}
                          />
                          <Label htmlFor={status} className="text-sm capitalize">
                            {status}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Property Type</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {['villa', 'apartment', 'house', 'hotel', 'cabin', 'cottage'].map((type) => (
                        <div key={type} className="flex items-center space-x-2">
                          <Checkbox
                            id={type}
                            checked={filters.type.includes(type)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFilters(prev => ({
                                  ...prev,
                                  type: [...prev.type, type]
                                }));
                              } else {
                                setFilters(prev => ({
                                  ...prev,
                                  type: prev.type.filter(t => t !== type)
                                }));
                              }
                            }}
                          />
                          <Label htmlFor={type} className="text-sm capitalize">
                            {type}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Price Range ($)</Label>
                    <div className="mt-2 px-3">
                      <Slider
                        value={filters.priceRange}
                        onValueChange={(value) => setFilters(prev => ({ ...prev, priceRange: value as [number, number] }))}
                        max={2000}
                        min={0}
                        step={50}
                        className="w-full"
                      />
                      <div className="flex justify-between text-sm text-gray-500 mt-1">
                        <span>${filters.priceRange[0]}</span>
                        <span>${filters.priceRange[1]}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFilters({
                        status: [],
                        type: [],
                        location: '',
                        priceRange: [0, 2000],
                        rating: 0,
                        dateRange: { start: null, end: null },
                        host: '',
                        featured: null,
                        verified: null
                      })}
                    >
                      Clear
                    </Button>
                    <Button size="sm">Apply</Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="w-4 h-4" />
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>

            {selectedProperties.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkOperations(true)}
              >
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                Bulk Actions ({selectedProperties.length})
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>

            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Property
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { variant: 'default' as const, color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
      inactive: { variant: 'secondary' as const, color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' },
      maintenance: { variant: 'destructive' as const, color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
      draft: { variant: 'outline' as const, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    
    return (
      <Badge variant={config.variant} className={config.color}>
        {status === 'active' && <CheckCircle className="w-3 h-3 mr-1" />}
        {status === 'inactive' && <XCircle className="w-3 h-3 mr-1" />}
        {status === 'maintenance' && <AlertTriangle className="w-3 h-3 mr-1" />}
        {status === 'draft' && <Clock className="w-3 h-3 mr-1" />}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const renderPropertyList = () => (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedProperties.length === sortedProperties.length && sortedProperties.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Property</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Performance</TableHead>
              <TableHead>Revenue</TableHead>
              <TableHead>Host</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="w-32">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedProperties.map((property) => (
              <TableRow key={property.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedProperties.includes(property.id)}
                    onCheckedChange={() => handleSelectProperty(property.id)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <img
                      src={property.images.featured}
                      alt={property.title}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {property.title}
                      </div>
                      <div className="text-sm text-gray-500 capitalize">
                        {property.type} • {property.capacity.bedrooms} bed • {property.capacity.bathrooms} bath
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        {property.featured && (
                          <Badge variant="secondary" className="text-xs">
                            <Star className="w-3 h-3 mr-1" />
                            Featured
                          </Badge>
                        )}
                        {property.verified && (
                          <Badge variant="secondary" className="text-xs">
                            <Shield className="w-3 h-3 mr-1" />
                            Verified
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {getStatusBadge(property.status)}
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div className="font-medium">{property.location.city}</div>
                    <div className="text-gray-500">{property.location.state}, {property.location.country}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{property.performance.rating}</span>
                      <span className="text-gray-500 text-sm">({property.performance.reviewCount})</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {property.pricing.occupancyRate}% occupied • {property.performance.bookings} bookings
                    </div>
                    <div className="text-sm text-gray-500">
                      {property.performance.conversionRate}% conversion
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-medium">
                      ${property.pricing.revenue.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500">
                      ${property.pricing.basePrice}/night avg
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={property.host.avatar} />
                      <AvatarFallback>{property.host.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium">{property.host.name}</div>
                      {property.host.isSuperhost && (
                        <Badge variant="secondary" className="text-xs">
                          Superhost
                        </Badge>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-gray-500">
                    {property.lastUpdated.toLocaleDateString()}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditProperty(property)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit Property</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-48">
                        <div className="space-y-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start"
                          >
                            <BarChart3 className="w-4 h-4 mr-2" />
                            Analytics
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start"
                          >
                            <Camera className="w-4 h-4 mr-2" />
                            Manage Photos
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start"
                          >
                            <DollarSign className="w-4 h-4 mr-2" />
                            Pricing
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start"
                          >
                            <Calendar className="w-4 h-4 mr-2" />
                            Availability
                          </Button>
                          
                          <Separator />
                          
                          <Select
                            value={property.status}
                            onValueChange={(value) => handleStatusChange(property.id, value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Change Status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                              <SelectItem value="maintenance">Maintenance</SelectItem>
                              <SelectItem value="draft">Draft</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          <Separator />
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteProperty(property.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  // ====================================
  // MAIN RENDER
  // ====================================

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Property Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage your properties, track performance, and optimize revenue
          </p>
        </div>

        {/* Stats */}
        {renderStatsCards()}

        {/* Main content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="photos">Photos</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            {renderToolbar()}
            {renderPropertyList()}
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <PropertyAnalytics properties={properties} />
          </TabsContent>

          <TabsContent value="pricing" className="mt-6">
            <PricingManagement properties={properties} />
          </TabsContent>

          <TabsContent value="calendar" className="mt-6">
            <AvailabilityCalendar properties={properties} />
          </TabsContent>

          <TabsContent value="photos" className="mt-6">
            <PhotoUpload properties={properties} />
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Property Management Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Settings content goes here...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Property</DialogTitle>
            </DialogHeader>
            <PropertyCreateForm onClose={() => setShowCreateDialog(false)} />
          </DialogContent>
        </Dialog>

        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Property</DialogTitle>
            </DialogHeader>
            {editingProperty && (
              <PropertyEditForm
                property={editingProperty}
                onClose={() => setShowEditDialog(false)}
              />
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={showBulkOperations} onOpenChange={setShowBulkOperations}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Bulk Operations</DialogTitle>
            </DialogHeader>
            <BulkOperations
              selectedProperties={selectedProperties}
              onClose={() => setShowBulkOperations(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};