/**
 * PropertyMapView Component
 * Interactive map displaying property locations with clustering and markers
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Property } from '../types/api-types';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { 
  MapPin, 
  Star, 
  Heart, 
  ZoomIn, 
  ZoomOut, 
  Layers,
  Navigation,
  Search,
  Loader2
} from 'lucide-react';

interface PropertyMapViewProps {
  properties: Property[];
  selectedProperty?: Property | null;
  onPropertySelect: (property: Property) => void;
  onFavoriteToggle: (propertyId: string) => void;
  favorites: string[];
  loading?: boolean;
  className?: string;
}

interface MapCluster {
  id: string;
  latitude: number;
  longitude: number;
  properties: Property[];
  count: number;
  avgPrice: number;
}

interface ViewBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export const PropertyMapView: React.FC<PropertyMapViewProps> = ({
  properties,
  selectedProperty,
  onPropertySelect,
  onFavoriteToggle,
  favorites,
  loading = false,
  className
}) => {
  const [mapCenter, setMapCenter] = useState({ lat: 40.7128, lng: -74.0060 }); // Default to NYC
  const [zoomLevel, setZoomLevel] = useState(12);
  const [viewBounds, setViewBounds] = useState<ViewBounds>({
    north: 40.8,
    south: 40.6,
    east: -73.9,
    west: -74.1
  });
  const [hoveredProperty, setHoveredProperty] = useState<Property | null>(null);
  const [showClusters, setShowClusters] = useState(true);

  // Calculate clusters based on zoom level and property density
  const clusters = useMemo(() => {
    if (!showClusters || zoomLevel > 14) return [];
    
    const clustered: MapCluster[] = [];
    const processed = new Set<string>();
    
    properties.forEach(property => {
      if (processed.has(property.id) || !property.location) return;
      
      const nearby = properties.filter(p => {
        if (processed.has(p.id) || !p.location) return false;
        
        const distance = Math.sqrt(
          Math.pow(p.location.latitude - property.location!.latitude, 2) +
          Math.pow(p.location.longitude - property.location!.longitude, 2)
        );
        
        return distance < 0.01; // Cluster radius
      });
      
      if (nearby.length > 1) {
        const avgLat = nearby.reduce((sum, p) => sum + p.location!.latitude, 0) / nearby.length;
        const avgLng = nearby.reduce((sum, p) => sum + p.location!.longitude, 0) / nearby.length;
        const avgPrice = nearby.reduce((sum, p) => sum + p.pricing.basePrice, 0) / nearby.length;
        
        clustered.push({
          id: `cluster-${property.id}`,
          latitude: avgLat,
          longitude: avgLng,
          properties: nearby,
          count: nearby.length,
          avgPrice
        });
        
        nearby.forEach(p => processed.add(p.id));
      }
    });
    
    return clustered;
  }, [properties, showClusters, zoomLevel]);

  // Get individual markers (non-clustered properties)
  const individualMarkers = useMemo(() => {
    if (!showClusters || zoomLevel <= 14) {
      const clusteredIds = new Set(clusters.flatMap(c => c.properties.map(p => p.id)));
      return properties.filter(p => !clusteredIds.has(p.id) && p.location);
    }
    return properties.filter(p => p.location);
  }, [properties, clusters, showClusters, zoomLevel]);

  // Update map center when properties change
  useEffect(() => {
    if (properties.length > 0) {
      const validProperties = properties.filter(p => p.location);
      if (validProperties.length > 0) {
        const avgLat = validProperties.reduce((sum, p) => sum + p.location!.latitude, 0) / validProperties.length;
        const avgLng = validProperties.reduce((sum, p) => sum + p.location!.longitude, 0) / validProperties.length;
        setMapCenter({ lat: avgLat, lng: avgLng });
      }
    }
  }, [properties]);

  // Handle map interactions
  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev + 1, 18));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(prev - 1, 8));
  }, []);

  const handleSearchThisArea = useCallback(() => {
    // This would trigger a new search based on current map bounds
    console.log('Search this area:', viewBounds);
  }, [viewBounds]);

  // Property marker component
  const PropertyMarker = ({ property }: { property: Property }) => {
    const isFavorite = favorites.includes(property.id);
    const isSelected = selectedProperty?.id === property.id;
    const isHovered = hoveredProperty?.id === property.id;
    
    return (
      <div
        className={`
          relative cursor-pointer transform transition-all duration-200
          ${isSelected ? 'scale-110 z-20' : isHovered ? 'scale-105 z-10' : 'z-0'}
        `}
        style={{
          position: 'absolute',
          left: `${((property.location!.longitude - viewBounds.west) / (viewBounds.east - viewBounds.west)) * 100}%`,
          top: `${((viewBounds.north - property.location!.latitude) / (viewBounds.north - viewBounds.south)) * 100}%`,
          transform: 'translate(-50%, -100%)'
        }}
        onMouseEnter={() => setHoveredProperty(property)}
        onMouseLeave={() => setHoveredProperty(null)}
        onClick={() => onPropertySelect(property)}
      >
        {/* Price label */}
        <div className={`
          bg-white border-2 rounded-lg px-2 py-1 shadow-lg font-semibold text-sm mb-1
          ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
        `}>
          ${property.pricing.basePrice}
        </div>
        
        {/* Marker pin */}
        <div className={`
          w-6 h-6 rounded-full border-2 bg-white shadow-lg flex items-center justify-center
          ${isSelected ? 'border-blue-500' : 'border-gray-400'}
        `}>
          <MapPin className={`w-4 h-4 ${isSelected ? 'text-blue-500' : 'text-gray-600'}`} />
        </div>
        
        {/* Property preview on hover */}
        {isHovered && (
          <Card className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 p-3 w-64 shadow-xl z-30">
            <div className="flex space-x-3">
              <img
                src={property.photos?.[0]?.url || '/placeholder-property.jpg'}
                alt={property.title}
                className="w-16 h-16 rounded object-cover"
              />
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm line-clamp-1">{property.title}</h4>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {property.location?.address}
                </p>
                <div className="flex items-center mt-1">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  <span className="text-xs ml-1">{property.rating}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    ${property.pricing.basePrice}/night
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <Button
                    size="sm"
                    className="text-xs h-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPropertySelect(property);
                    }}
                  >
                    View Details
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onFavoriteToggle(property.id);
                    }}
                  >
                    <Heart className={`w-3 h-3 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    );
  };

  // Cluster marker component
  const ClusterMarker = ({ cluster }: { cluster: MapCluster }) => {
    return (
      <div
        className="relative cursor-pointer transform transition-all duration-200 hover:scale-105"
        style={{
          position: 'absolute',
          left: `${((cluster.longitude - viewBounds.west) / (viewBounds.east - viewBounds.west)) * 100}%`,
          top: `${((viewBounds.north - cluster.latitude) / (viewBounds.north - viewBounds.south)) * 100}%`,
          transform: 'translate(-50%, -50%)'
        }}
        onClick={() => {
          // Zoom in to show individual properties
          setZoomLevel(prev => Math.min(prev + 2, 18));
          setMapCenter({ lat: cluster.latitude, lng: cluster.longitude });
        }}
      >
        <div className="bg-blue-500 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold shadow-lg border-2 border-white">
          {cluster.count}
        </div>
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 bg-white rounded px-2 py-1 text-xs font-semibold shadow-lg">
          ${Math.round(cluster.avgPrice)}
        </div>
      </div>
    );
  };

  return (
    <Card className={`relative overflow-hidden ${className}`}>
      {/* Map Container */}
      <div className="relative w-full h-full bg-gray-100">
        {loading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-50">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="ml-2">Loading map...</span>
          </div>
        )}
        
        {/* Map Background (placeholder) */}
        <div className="w-full h-full bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
          <div className="text-center">
            <MapPin className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Interactive Map</h3>
            <p className="text-muted-foreground max-w-md">
              This would integrate with Google Maps, Mapbox, or similar mapping service
              to display properties with real-time clustering and interaction.
            </p>
          </div>
        </div>
        
        {/* Property Markers */}
        {individualMarkers.map(property => (
          <PropertyMarker key={property.id} property={property} />
        ))}
        
        {/* Cluster Markers */}
        {clusters.map(cluster => (
          <ClusterMarker key={cluster.id} cluster={cluster} />
        ))}
        
        {/* Map Controls */}
        <div className="absolute top-4 right-4 flex flex-col space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="bg-white shadow-lg"
            onClick={handleZoomIn}
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-white shadow-lg"
            onClick={handleZoomOut}
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-white shadow-lg"
            onClick={() => setShowClusters(!showClusters)}
          >
            <Layers className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Search This Area Button */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
          <Button
            variant="outline"
            className="bg-white shadow-lg"
            onClick={handleSearchThisArea}
          >
            <Search className="w-4 h-4 mr-2" />
            Search this area
          </Button>
        </div>
        
        {/* Map Legend */}
        <div className="absolute bottom-4 left-4 bg-white rounded-lg p-3 shadow-lg">
          <h4 className="font-semibold text-sm mb-2">Legend</h4>
          <div className="space-y-1 text-xs">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-blue-500 rounded-full mr-2"></div>
              <span>Property cluster</span>
            </div>
            <div className="flex items-center">
              <MapPin className="w-4 h-4 text-gray-600 mr-2" />
              <span>Individual property</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 border-2 border-blue-500 rounded mr-2"></div>
              <span>Selected property</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default PropertyMapView;