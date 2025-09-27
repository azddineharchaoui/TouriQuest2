/**
 * PropertyManagementDashboard - Main admin interface for property management
 * Connected to GET /api/v1/properties/management
 */

import React, { useState, useEffect } from 'react';
import { propertyService } from '../../services/propertyService';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Separator } from '../ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  BarChart3,
  Home,
  DollarSign,
  Calendar,
  Users,
  Star,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Download,
  Upload,
  Settings,
  Grid3X3,
  List,
  SortAsc,
  SortDesc,
  Loader2,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

interface PropertyManagementProps {
  onCreateProperty: () => void;
  onEditProperty: (propertyId: string) => void;
}

interface ManagedProperty {
  id: string;
  title: string;
  type: string;
  address: string;
  photos: string[];
  status: 'active' | 'inactive' | 'maintenance' | 'pending';
  pricing: {
    basePrice: number;
    currency: string;
  };
  occupancy: {
    current: number;
    total: number;
    rate: number;
  };
  bookings: {
    upcoming: number;
    total: number;
  };
  rating: number;
  reviewCount: number;
  revenue: {
    monthly: number;
    total: number;
    growth: number;
  };
  availability: {
    available: number;
    booked: number;
    blocked: number;
  };
  createdAt: string;
  updatedAt: string;
  owner: {
    name: string;
    avatar?: string;
  };
}

interface DashboardStats {
  totalProperties: number;
  activeProperties: number;
  totalRevenue: number;
  averageOccupancy: number;
  totalBookings: number;
  averageRating: number;
  growth: {
    properties: number;
    revenue: number;
    bookings: number;
  };
}

export const PropertyManagementDashboard: React.FC<PropertyManagementProps> = ({
  onCreateProperty,
  onEditProperty
}) => {
  const [properties, setProperties] = useState<ManagedProperty[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter and search states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Selection and bulk operations
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const propertiesPerPage = 12;

  useEffect(() => {
    fetchProperties();
    fetchDashboardStats();
  }, [currentPage, statusFilter, typeFilter, sortBy, sortOrder, searchTerm]);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await propertyService.getManagementProperties({
        page: currentPage,
        limit: propertiesPerPage,
        search: searchTerm,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined,
        sortBy,
        sortOrder
      });
      
      setProperties(response.data.properties);
      setTotalPages(Math.ceil(response.data.total / propertiesPerPage));
      
    } catch (err: any) {
      setError('Failed to load properties');
      
      // Mock data fallback
      const mockProperties: ManagedProperty[] = [
        {
          id: '1',
          title: 'Luxury Downtown Apartment',
          type: 'apartment',
          address: '123 Main St, Downtown, NY',
          photos: ['/api/placeholder/300/200'],
          status: 'active',
          pricing: { basePrice: 250, currency: 'USD' },
          occupancy: { current: 28, total: 30, rate: 93.3 },
          bookings: { upcoming: 5, total: 45 },
          rating: 4.8,
          reviewCount: 127,
          revenue: { monthly: 15750, total: 189000, growth: 12.5 },
          availability: { available: 2, booked: 28, blocked: 0 },
          createdAt: '2024-01-15',
          updatedAt: '2024-03-10',
          owner: { name: 'John Doe', avatar: '/api/placeholder/40/40' }
        },
        {
          id: '2',
          title: 'Cozy Beach House',
          type: 'house',
          address: '456 Ocean Drive, Miami Beach, FL',
          photos: ['/api/placeholder/300/200'],
          status: 'active',
          pricing: { basePrice: 180, currency: 'USD' },
          occupancy: { current: 22, total: 30, rate: 73.3 },
          bookings: { upcoming: 3, total: 32 },
          rating: 4.6,
          reviewCount: 89,
          revenue: { monthly: 11880, total: 142560, growth: 8.2 },
          availability: { available: 8, booked: 22, blocked: 0 },
          createdAt: '2024-02-01',
          updatedAt: '2024-03-08',
          owner: { name: 'Jane Smith', avatar: '/api/placeholder/40/40' }
        },
        {
          id: '3',
          title: 'Mountain Cabin Retreat',
          type: 'cabin',
          address: '789 Pine Ridge, Aspen, CO',
          photos: ['/api/placeholder/300/200'],
          status: 'maintenance',
          pricing: { basePrice: 320, currency: 'USD' },
          occupancy: { current: 0, total: 30, rate: 0 },
          bookings: { upcoming: 0, total: 18 },
          rating: 4.9,
          reviewCount: 76,
          revenue: { monthly: 0, total: 86400, growth: -100 },
          availability: { available: 0, booked: 0, blocked: 30 },
          createdAt: '2024-01-20',
          updatedAt: '2024-03-05',
          owner: { name: 'Mike Johnson', avatar: '/api/placeholder/40/40' }
        }
      ];
      
      setProperties(mockProperties);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const response = await propertyService.getManagementStats();
      setStats(response.data);
    } catch (err) {
      // Mock stats fallback
      setStats({
        totalProperties: 157,
        activeProperties: 142,
        totalRevenue: 2456789,
        averageOccupancy: 78.5,
        totalBookings: 1234,
        averageRating: 4.7,
        growth: {
          properties: 12.3,
          revenue: 15.8,
          bookings: 8.9
        }
      });
    }
  };

  const handlePropertyAction = async (action: string, propertyId: string) => {
    try {
      switch (action) {
        case 'edit':
          onEditProperty(propertyId);
          break;
        case 'delete':
          if (window.confirm('Are you sure you want to delete this property?')) {
            await propertyService.deleteProperty(propertyId);
            fetchProperties();
          }
          break;
        case 'activate':
          await propertyService.updatePropertyStatus(propertyId, 'active');
          fetchProperties();
          break;
        case 'deactivate':
          await propertyService.updatePropertyStatus(propertyId, 'inactive');
          fetchProperties();
          break;
        case 'maintenance':
          await propertyService.updatePropertyStatus(propertyId, 'maintenance');
          fetchProperties();
          break;
      }
    } catch (err) {
      console.error('Failed to perform action:', err);
    }
  };

  const handleBulkAction = async (action: string) => {
    try {
      if (selectedProperties.length === 0) return;
      
      const promises = selectedProperties.map(id => {
        switch (action) {
          case 'activate':
            return propertyService.updatePropertyStatus(id, 'active');
          case 'deactivate':
            return propertyService.updatePropertyStatus(id, 'inactive');
          case 'delete':
            return propertyService.deleteProperty(id);
          default:
            return Promise.resolve();
        }
      });
      
      await Promise.all(promises);
      setSelectedProperties([]);
      fetchProperties();
    } catch (err) {
      console.error('Failed to perform bulk action:', err);
    }
  };

  const togglePropertySelection = (propertyId: string) => {
    setSelectedProperties(prev => 
      prev.includes(propertyId)
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      maintenance: 'bg-yellow-100 text-yellow-800',
      pending: 'bg-blue-100 text-blue-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      active: CheckCircle,
      inactive: XCircle,
      maintenance: AlertTriangle,
      pending: Clock
    };
    return icons[status as keyof typeof icons] || Clock;
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount);
  };

  const filteredProperties = properties.filter(property => {
    const matchesSearch = property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         property.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || property.status === statusFilter;
    const matchesType = typeFilter === 'all' || property.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Property Management</h1>
          <p className="text-muted-foreground">Manage and monitor all properties</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button onClick={onCreateProperty}>
            <Plus className="w-4 h-4 mr-2" />
            Add Property
          </Button>
        </div>
      </div>

      {/* Dashboard Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Properties</p>
                <p className="text-2xl font-bold">{stats.totalProperties}</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
                  <span className="text-xs text-green-600">+{stats.growth.properties}%</span>
                </div>
              </div>
              <Home className="w-8 h-8 text-blue-500" />
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
                  <span className="text-xs text-green-600">+{stats.growth.revenue}%</span>
                </div>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Occupancy</p>
                <p className="text-2xl font-bold">{stats.averageOccupancy}%</p>
                <div className="flex items-center mt-1">
                  <span className="text-xs text-muted-foreground">Last 30 days</span>
                </div>
              </div>
              <Calendar className="w-8 h-8 text-purple-500" />
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Bookings</p>
                <p className="text-2xl font-bold">{stats.totalBookings}</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
                  <span className="text-xs text-green-600">+{stats.growth.bookings}%</span>
                </div>
              </div>
              <Users className="w-8 h-8 text-orange-500" />
            </div>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <Card className="p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search properties..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="maintenance">Maintenance</option>
            <option value="pending">Pending</option>
          </select>
          
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="all">All Types</option>
            <option value="apartment">Apartment</option>
            <option value="house">House</option>
            <option value="cabin">Cabin</option>
            <option value="villa">Villa</option>
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="updatedAt">Last Updated</option>
            <option value="createdAt">Created Date</option>
            <option value="title">Name</option>
            <option value="revenue">Revenue</option>
            <option value="occupancy">Occupancy</option>
            <option value="rating">Rating</option>
          </select>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          >
            {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
          </Button>
          
          <div className="flex items-center space-x-2 ml-auto">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Bulk Actions */}
      {selectedProperties.length > 0 && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">
                {selectedProperties.length} properties selected
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('activate')}
              >
                Activate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('deactivate')}
              >
                Deactivate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('delete')}
              >
                Delete
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedProperties([])}
              >
                Clear
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Properties List/Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span>Loading properties...</span>
        </div>
      ) : error ? (
        <Card className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Error Loading Properties</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={fetchProperties}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        </Card>
      ) : filteredProperties.length === 0 ? (
        <Card className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Home className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Properties Found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                  ? 'No properties match your current filters.'
                  : 'Get started by adding your first property.'
                }
              </p>
              <Button onClick={onCreateProperty}>
                <Plus className="w-4 h-4 mr-2" />
                Add Property
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
            : 'space-y-4'
        }>
          {filteredProperties.map((property) => {
            const StatusIcon = getStatusIcon(property.status);
            
            return viewMode === 'grid' ? (
              <Card key={property.id} className="overflow-hidden">
                <div className="relative">
                  <img
                    src={property.photos[0] || '/api/placeholder/300/200'}
                    alt={property.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute top-2 left-2">
                    <Badge className={getStatusColor(property.status)}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {property.status.charAt(0).toUpperCase() + property.status.slice(1)}
                    </Badge>
                  </div>
                  <div className="absolute top-2 right-2">
                    <input
                      type="checkbox"
                      checked={selectedProperties.includes(property.id)}
                      onChange={() => togglePropertySelection(property.id)}
                      className="w-4 h-4"
                    />
                  </div>
                </div>
                
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg truncate">{property.title}</h3>
                      <p className="text-sm text-muted-foreground flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        {property.address}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                    <div>
                      <span className="text-muted-foreground">Price:</span>
                      <div className="font-semibold">
                        {formatCurrency(property.pricing.basePrice)}/night
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Occupancy:</span>
                      <div className="font-semibold">{property.occupancy.rate}%</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Revenue:</span>
                      <div className="font-semibold">
                        {formatCurrency(property.revenue.monthly)}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Rating:</span>
                      <div className="flex items-center">
                        <Star className="w-3 h-3 text-yellow-400 fill-current mr-1" />
                        <span className="font-semibold">{property.rating}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={property.owner.avatar} />
                        <AvatarFallback>{property.owner.name[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground">{property.owner.name}</span>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditProperty(property.id)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePropertyAction('delete', property.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ) : (
              <Card key={property.id} className="p-4">
                <div className="flex items-center space-x-4">
                  <input
                    type="checkbox"
                    checked={selectedProperties.includes(property.id)}
                    onChange={() => togglePropertySelection(property.id)}
                    className="w-4 h-4"
                  />
                  
                  <img
                    src={property.photos[0] || '/api/placeholder/80/60'}
                    alt={property.title}
                    className="w-20 h-15 object-cover rounded"
                  />
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{property.title}</h3>
                      <Badge className={getStatusColor(property.status)}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {property.status.charAt(0).toUpperCase() + property.status.slice(1)}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-2">{property.address}</p>
                    
                    <div className="grid grid-cols-5 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Price:</span>
                        <div className="font-semibold">{formatCurrency(property.pricing.basePrice)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Occupancy:</span>
                        <div className="font-semibold">{property.occupancy.rate}%</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Revenue:</span>
                        <div className="font-semibold">{formatCurrency(property.revenue.monthly)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Rating:</span>
                        <div className="flex items-center">
                          <Star className="w-3 h-3 text-yellow-400 fill-current mr-1" />
                          <span className="font-semibold">{property.rating}</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Bookings:</span>
                        <div className="font-semibold">{property.bookings.upcoming}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditProperty(property.id)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePropertyAction('delete', property.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          
          {[...Array(totalPages)].map((_, i) => (
            <Button
              key={i}
              variant={currentPage === i + 1 ? "default" : "outline"}
              size="sm"
              onClick={() => setCurrentPage(i + 1)}
            >
              {i + 1}
            </Button>
          ))}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

export default PropertyManagementDashboard;