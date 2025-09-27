/**
 * RecentlyViewedProperties Component
 * Displays and manages recently viewed properties
 */

import React, { useState, useEffect } from 'react';
import { Property } from '../types/api-types';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Clock,
  Eye,
  X,
  ExternalLink,
  MapPin,
  Star,
  Heart,
  Trash2
} from 'lucide-react';

interface RecentlyViewedProperty {
  property: Property;
  viewedAt: Date;
  viewCount: number;
}

interface RecentlyViewedPropertiesProps {
  currentPropertyId?: string;
  onPropertyClick?: (property: Property) => void;
  onRemoveProperty?: (propertyId: string) => void;
  onClearAll?: () => void;
  className?: string;
  maxItems?: number;
  showViewCount?: boolean;
  compact?: boolean;
}

export const RecentlyViewedProperties: React.FC<RecentlyViewedPropertiesProps> = ({
  currentPropertyId,
  onPropertyClick,
  onRemoveProperty,
  onClearAll,
  className,
  maxItems = 10,
  showViewCount = true,
  compact = false
}) => {
  const [recentProperties, setRecentProperties] = useState<RecentlyViewedProperty[]>([]);

  // Load recently viewed properties from localStorage
  useEffect(() => {
    const loadRecentProperties = () => {
      try {
        const stored = localStorage.getItem('touriquest_recently_viewed');
        if (stored) {
          const parsed = JSON.parse(stored);
          const properties = parsed.map((item: any) => ({
            ...item,
            viewedAt: new Date(item.viewedAt)
          }));
          setRecentProperties(properties.slice(0, maxItems));
        }
      } catch (error) {
        console.error('Error loading recently viewed properties:', error);
        localStorage.removeItem('touriquest_recently_viewed');
      }
    };

    loadRecentProperties();
  }, [maxItems]);

  // Add current property to recently viewed
  useEffect(() => {
    if (currentPropertyId) {
      addToRecentlyViewed(currentPropertyId);
    }
  }, [currentPropertyId]);

  const addToRecentlyViewed = (propertyId: string) => {
    // In a real app, this would fetch the property data from the API
    // For now, we'll simulate adding a property
    const mockProperty: Property = {
      id: propertyId,
      title: `Property ${propertyId}`,
      description: 'Recently viewed property',
      type: {
        id: 'apartment',
        name: 'Apartment',
        category: 'apartment'
      },
      location: {
        latitude: 0,
        longitude: 0,
        address: 'Location not available',
        city: 'Unknown City',
        country: 'Unknown Country'
      },
      address: 'Location not available',
      coordinates: {
        latitude: 0,
        longitude: 0
      },
      pricing: {
        basePrice: 0,
        currency: 'USD',
        cleaningFee: 0,
        serviceFee: 0,
        taxes: 0,
        discounts: []
      },
      amenities: [],
      photos: [],
      host: {
        id: 'unknown',
        name: 'Unknown Host',
        avatar: '',
        joinedAt: new Date().toISOString(),
        languages: [],
        verifications: []
      },
      availability: [],
      rating: 0,
      reviewCount: 0,
      reviews: [],
      rules: {
        checkIn: '15:00',
        checkOut: '11:00',
        maxGuests: 2,
        smoking: false,
        pets: false,
        parties: false
      },
      policies: {
        cancellation: {
          type: 'flexible',
          description: 'Flexible cancellation',
          refundPercentages: [
            { daysBeforeCheckIn: 1, refundPercentage: 100 },
            { daysBeforeCheckIn: 0, refundPercentage: 0 }
          ]
        },
        payment: {
          upfrontPayment: 100,
          remainingPayment: 0,
          paymentMethods: ['credit_card']
        },
        houseRules: []
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
      isFeatured: false
    };

    setRecentProperties(prev => {
      const existingIndex = prev.findIndex(item => item.property.id === propertyId);
      const now = new Date();
      
      let updated: RecentlyViewedProperty[];
      
      if (existingIndex >= 0) {
        // Update existing property
        updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          viewedAt: now,
          viewCount: updated[existingIndex].viewCount + 1
        };
        
        // Move to front
        const [updated_item] = updated.splice(existingIndex, 1);
        updated.unshift(updated_item);
      } else {
        // Add new property
        const newItem: RecentlyViewedProperty = {
          property: mockProperty,
          viewedAt: now,
          viewCount: 1
        };
        updated = [newItem, ...prev].slice(0, maxItems);
      }

      // Save to localStorage
      try {
        localStorage.setItem('touriquest_recently_viewed', JSON.stringify(updated));
      } catch (error) {
        console.error('Error saving recently viewed properties:', error);
      }

      return updated;
    });
  };

  const removeProperty = (propertyId: string) => {
    setRecentProperties(prev => {
      const updated = prev.filter(item => item.property.id !== propertyId);
      
      try {
        localStorage.setItem('touriquest_recently_viewed', JSON.stringify(updated));
      } catch (error) {
        console.error('Error updating recently viewed properties:', error);
      }

      return updated;
    });

    onRemoveProperty?.(propertyId);
  };

  const clearAll = () => {
    setRecentProperties([]);
    localStorage.removeItem('touriquest_recently_viewed');
    onClearAll?.();
  };

  const handlePropertyClick = (property: Property) => {
    onPropertyClick?.(property);
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  if (recentProperties.length === 0) {
    return (
      <Card className={`p-6 text-center ${className}`}>
        <Eye className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Recently Viewed Properties</h3>
        <p className="text-muted-foreground">
          Properties you view will appear here for easy access.
        </p>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center">
            <Clock className="w-4 h-4 mr-2" />
            Recently Viewed ({recentProperties.length})
          </h3>
          {recentProperties.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAll}>
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
        
        <div className="space-y-2">
          {recentProperties.slice(0, 5).map((item) => (
            <div
              key={item.property.id}
              className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer group"
              onClick={() => handlePropertyClick(item.property)}
            >
              <div className="w-12 h-12 bg-gray-200 rounded-lg flex-shrink-0">
                {item.property.photos.length > 0 ? (
                  <img
                    src={item.property.photos[0].url}
                    alt={item.property.title}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.property.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                                  <span className="text-xs text-muted-foreground truncate">
                  {item.property.location.city || 'Unknown City'}, {item.property.location.country || 'Unknown Country'}
                </span>
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="text-xs text-muted-foreground">
                  {formatTimeAgo(item.viewedAt)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeProperty(item.property.id);
                  }}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold flex items-center">
          <Clock className="w-5 h-5 mr-2" />
          Recently Viewed Properties ({recentProperties.length})
        </h3>
        {recentProperties.length > 0 && (
          <Button variant="outline" size="sm" onClick={clearAll}>
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All
          </Button>
        )}
      </div>

      <div className="grid gap-4">
        {recentProperties.map((item) => (
          <div
            key={item.property.id}
            className="flex space-x-4 p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer group"
            onClick={() => handlePropertyClick(item.property)}
          >
            <div className="w-24 h-24 bg-gray-200 rounded-lg flex-shrink-0">
              {item.property.photos.length > 0 ? (
                <img
                  src={item.property.photos[0].url}
                  alt={item.property.title}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold truncate pr-2">{item.property.title}</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeProperty(item.property.id);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex items-center space-x-2 mb-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {item.property.location.city || 'Unknown City'}, {item.property.location.country || 'Unknown Country'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {item.property.rating > 0 && (
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="text-sm font-medium">{item.property.rating}</span>
                      <span className="text-sm text-muted-foreground">
                        ({item.property.reviewCount})
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Eye className="w-4 h-4" />
                    <span>Viewed {formatTimeAgo(item.viewedAt)}</span>
                    {showViewCount && item.viewCount > 1 && (
                      <Badge variant="secondary" className="text-xs">
                        {item.viewCount} views
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  {item.property.pricing.basePrice > 0 && (
                    <div className="font-semibold">
                      ${item.property.pricing.basePrice}/night
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {recentProperties.length >= maxItems && (
        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">
            Showing {maxItems} most recent properties
          </p>
        </div>
      )}
    </Card>
  );
};

export default RecentlyViewedProperties;