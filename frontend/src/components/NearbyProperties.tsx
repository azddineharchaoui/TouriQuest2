/**
 * NearbyProperties - Display nearby properties with distance and comparison
 * Fetches data from GET /api/v1/properties/{id}/nearby
 */

import React, { useState, useEffect } from 'react';
import { propertyService } from '../services/propertyService';
import { Property } from '../types/api-types';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  MapPin,
  Star,
  Heart,
  Users,
  Navigation,
  Compare,
  ExternalLink,
  Loader2,
  AlertCircle,
  Filter
} from 'lucide-react';

interface NearbyProperty extends Property {
  distance: number; // Distance in kilometers
  walkingTime?: number; // Walking time in minutes
  drivingTime?: number; // Driving time in minutes
}

interface NearbyPropertiesProps {
  propertyId: string;
  className?: string;
}

export const NearbyProperties: React.FC<NearbyPropertiesProps> = ({
  propertyId,
  className
}) => {
  const [nearbyProperties, setNearbyProperties] = useState<NearbyProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'distance' | 'price' | 'rating'>('distance');
  const [maxDistance, setMaxDistance] = useState(5); // kilometers

  useEffect(() => {
    fetchNearbyProperties();
  }, [propertyId, maxDistance]);

  const fetchNearbyProperties = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await propertyService.getNearbyProperties(propertyId, {
        radius: maxDistance,
        limit: 12
      });
      setNearbyProperties(response.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch nearby properties');
      // Fallback to mock data for development
      setNearbyProperties([
        {
          id: 'nearby-1',
          title: 'Cozy Downtown Apartment',
          description: 'Modern apartment in the heart of the city',
          type: {
            id: 'apartment',
            name: 'Apartment',
            category: 'apartment'
          },
          location: {
            latitude: 40.7580,
            longitude: -73.9855,
            address: '123 Park Avenue',
            city: 'New York',
            country: 'United States'
          },
          address: '123 Park Avenue',
          coordinates: {
            latitude: 40.7580,
            longitude: -73.9855
          },
          pricing: {
            basePrice: 250,
            currency: 'USD',
            cleaningFee: 50,
            serviceFee: 30,
            taxes: 25
          },
          amenities: [],
          photos: [{
            id: 'photo-1',
            url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400',
            filename: 'apartment.jpg',
            mimeType: 'image/jpeg',
            size: 500000,
            uploadedAt: new Date().toISOString()
          }],
          host: {
            id: 'host-1',
            name: 'Sarah Johnson',
            joinedAt: '2020-01-15T00:00:00Z',
            languages: ['English'],
            verifications: ['email', 'phone']
          },
          availability: [],
          rating: 4.8,
          reviewCount: 127,
          reviews: [],
          rules: {
            checkIn: '15:00',
            checkOut: '11:00',
            maxGuests: 4,
            smoking: false,
            pets: false,
            parties: false
          },
          policies: {
            cancellation: {
              type: 'flexible',
              description: 'Flexible cancellation',
              refundPercentages: []
            },
            payment: {
              upfrontPayment: 50,
              remainingPayment: 50,
              paymentMethods: ['credit_card']
            },
            houseRules: []
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isActive: true,
          isFeatured: false,
          distance: 0.8,
          walkingTime: 10,
          drivingTime: 3
        },
        {
          id: 'nearby-2',
          title: 'Luxury Hotel Suite',
          description: 'Premium hotel suite with city views',
          type: {
            id: 'hotel',
            name: 'Hotel',
            category: 'hotel'
          },
          location: {
            latitude: 40.7614,
            longitude: -73.9776,
            address: '456 Broadway',
            city: 'New York',
            country: 'United States'
          },
          address: '456 Broadway',
          coordinates: {
            latitude: 40.7614,
            longitude: -73.9776
          },
          pricing: {
            basePrice: 450,
            currency: 'USD',
            cleaningFee: 0,
            serviceFee: 50,
            taxes: 45
          },
          amenities: [],
          photos: [{
            id: 'photo-2',
            url: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400',
            filename: 'hotel.jpg',
            mimeType: 'image/jpeg',
            size: 600000,
            uploadedAt: new Date().toISOString()
          }],
          host: {
            id: 'host-2',
            name: 'Premium Hotels',
            joinedAt: '2018-06-01T00:00:00Z',
            languages: ['English', 'Spanish'],
            verifications: ['business', 'email', 'phone']
          },
          availability: [],
          rating: 4.9,
          reviewCount: 89,
          reviews: [],
          rules: {
            checkIn: '16:00',
            checkOut: '12:00',
            maxGuests: 2,
            smoking: false,
            pets: true,
            parties: false
          },
          policies: {
            cancellation: {
              type: 'moderate',
              description: 'Moderate cancellation',
              refundPercentages: []
            },
            payment: {
              upfrontPayment: 100,
              remainingPayment: 0,
              paymentMethods: ['credit_card', 'paypal']
            },
            houseRules: []
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isActive: true,
          isFeatured: true,
          distance: 1.2,
          walkingTime: 15,
          drivingTime: 5
        },
        {
          id: 'nearby-3',
          title: 'Charming Studio',
          description: 'Quaint studio perfect for solo travelers',
          type: {
            id: 'studio',
            name: 'Studio',
            category: 'apartment'
          },
          location: {
            latitude: 40.7505,
            longitude: -73.9934,
            address: '789 5th Street',
            city: 'New York',
            country: 'United States'
          },
          address: '789 5th Street',
          coordinates: {
            latitude: 40.7505,
            longitude: -73.9934
          },
          pricing: {
            basePrice: 180,
            currency: 'USD',
            cleaningFee: 30,
            serviceFee: 20,
            taxes: 18
          },
          amenities: [],
          photos: [{
            id: 'photo-3',
            url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400',
            filename: 'studio.jpg',
            mimeType: 'image/jpeg',
            size: 450000,
            uploadedAt: new Date().toISOString()
          }],
          host: {
            id: 'host-3',
            name: 'Michael Chen',
            joinedAt: '2021-03-10T00:00:00Z',
            languages: ['English', 'Mandarin'],
            verifications: ['email', 'phone', 'identity']
          },
          availability: [],
          rating: 4.6,
          reviewCount: 45,
          reviews: [],
          rules: {
            checkIn: '14:00',
            checkOut: '11:00',
            maxGuests: 2,
            smoking: false,
            pets: false,
            parties: false
          },
          policies: {
            cancellation: {
              type: 'strict',
              description: 'Strict cancellation',
              refundPercentages: []
            },
            payment: {
              upfrontPayment: 50,
              remainingPayment: 50,
              paymentMethods: ['credit_card']
            },
            houseRules: []
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isActive: true,
          isFeatured: false,
          distance: 1.8,
          walkingTime: 22,
          drivingTime: 7
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const sortedProperties = [...nearbyProperties].sort((a, b) => {
    switch (sortBy) {
      case 'distance':
        return a.distance - b.distance;
      case 'price':
        return a.pricing.basePrice - b.pricing.basePrice;
      case 'rating':
        return b.rating - a.rating;
      default:
        return 0;
    }
  });

  const togglePropertySelection = (propertyId: string) => {
    setSelectedProperties(prev => 
      prev.includes(propertyId)
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  const formatDistance = (distance: number) => {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${distance.toFixed(1)}km`;
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}min`;
  };

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading nearby properties...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <AlertCircle className="w-8 h-8 text-red-500 mr-2" />
          <span className="text-muted-foreground">Failed to load nearby properties</span>
        </div>
      </Card>
    );
  }

  if (nearbyProperties.length === 0) {
    return (
      <Card className={`p-6 ${className}`}>
        <h3 className="text-lg font-semibold mb-4">Nearby Properties</h3>
        <div className="text-center py-8">
          <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">No nearby properties found</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">
          Nearby Properties ({nearbyProperties.length})
        </h3>
        
        <div className="flex items-center space-x-2">
          {/* Distance Filter */}
          <select
            value={maxDistance}
            onChange={(e) => setMaxDistance(Number(e.target.value))}
            className="text-sm border rounded px-2 py-1"
          >
            <option value={1}>Within 1km</option>
            <option value={2}>Within 2km</option>
            <option value={5}>Within 5km</option>
            <option value={10}>Within 10km</option>
          </select>
          
          {/* Sort Options */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'distance' | 'price' | 'rating')}
            className="text-sm border rounded px-2 py-1"
          >
            <option value="distance">Sort by Distance</option>
            <option value="price">Sort by Price</option>
            <option value="rating">Sort by Rating</option>
          </select>
        </div>
      </div>

      {/* Comparison Tools */}
      {selectedProperties.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-700">
              {selectedProperties.length} properties selected for comparison
            </span>
            <div className="flex space-x-2">
              <Button size="sm" variant="outline">
                <Compare className="w-4 h-4 mr-1" />
                Compare
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedProperties([])}
              >
                Clear
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Properties Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedProperties.map((property) => (
          <div
            key={property.id}
            className={`border rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer ${
              selectedProperties.includes(property.id) ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => togglePropertySelection(property.id)}
          >
            {/* Property Image */}
            <div className="relative h-40">
              {property.photos && property.photos.length > 0 ? (
                <img
                  src={property.photos[0].url}
                  alt={property.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <MapPin className="w-8 h-8 text-gray-400" />
                </div>
              )}
              
              {/* Distance Badge */}
              <Badge className="absolute top-2 left-2 bg-white text-black">
                {formatDistance(property.distance)}
              </Badge>
              
              {/* Favorite Button */}
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2 h-8 w-8 p-0 bg-white hover:bg-gray-100"
                onClick={(e) => {
                  e.stopPropagation();
                  // Handle favorite toggle
                }}
              >
                <Heart className="w-4 h-4" />
              </Button>
            </div>

            {/* Property Info */}
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold text-sm line-clamp-2">{property.title}</h4>
                <div className="flex items-center ml-2">
                  <Star className="w-3 h-3 text-yellow-400 fill-current" />
                  <span className="text-xs ml-1">{property.rating.toFixed(1)}</span>
                </div>
              </div>
              
              <div className="flex items-center text-xs text-muted-foreground mb-2">
                <MapPin className="w-3 h-3 mr-1" />
                <span className="truncate">{property.location.address}</span>
              </div>
              
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                <div className="flex items-center">
                  <Users className="w-3 h-3 mr-1" />
                  <span>{property.rules.maxGuests} guests</span>
                </div>
                <div className="flex items-center space-x-2">
                  {property.walkingTime && (
                    <span>🚶 {formatTime(property.walkingTime)}</span>
                  )}
                  {property.drivingTime && (
                    <span>🚗 {formatTime(property.drivingTime)}</span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold">${property.pricing.basePrice}</span>
                  <span className="text-xs text-muted-foreground">/night</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(`/properties/${property.id}`, '_blank');
                  }}
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  View
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Show More Button */}
      {nearbyProperties.length > 6 && (
        <div className="text-center mt-6">
          <Button variant="outline">
            <Navigation className="w-4 h-4 mr-2" />
            Show more nearby properties
          </Button>
        </div>
      )}
    </Card>
  );
};

export default NearbyProperties;