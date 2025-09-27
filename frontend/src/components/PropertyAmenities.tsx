/**
 * PropertyAmenities - Display property amenities with categories and icons
 * Fetches amenities from GET /api/v1/properties/{id}/amenities
 */

import React, { useState, useEffect } from 'react';
import { propertyService } from '../services/propertyService';
import { Amenity } from '../types/api-types';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import {
  Wifi,
  Car,
  Coffee,
  Tv,
  AirVent,
  Utensils,
  Bath,
  Dumbbell,
  Waves,
  TreePine,
  Shield,
  Baby,
  Users,
  Home,
  Zap,
  Wind,
  Thermometer,
  WashingMachine,
  Refrigerator,
  ChefHat,
  Sofa,
  Bed,
  Volume2,
  Camera,
  Lock,
  Accessibility,
  Dog,
  Smoke,
  Calendar,
  ChevronRight,
  Grid3x3
} from 'lucide-react';

interface PropertyAmenitiesProps {
  propertyId: string;
  className?: string;
}

interface AmenityCategory {
  name: string;
  amenities: Amenity[];
  icon: React.ReactNode;
}

export const PropertyAmenities: React.FC<PropertyAmenitiesProps> = ({
  propertyId,
  className
}) => {
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllAmenities, setShowAllAmenities] = useState(false);

  useEffect(() => {
    fetchAmenities();
  }, [propertyId]);

  const fetchAmenities = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await propertyService.getPropertyAmenities(propertyId);
      setAmenities(response.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch amenities');
      // Fallback to mock data for development
      setAmenities([
        {
          id: '1',
          name: 'Free WiFi',
          category: 'internet',
          icon: 'wifi',
          description: 'High-speed wireless internet access throughout the property'
        },
        {
          id: '2',
          name: 'Free parking',
          category: 'parking',
          icon: 'car',
          description: 'Complimentary on-site parking space available'
        },
        {
          id: '3',
          name: 'Kitchen',
          category: 'kitchen',
          icon: 'kitchen',
          description: 'Fully equipped kitchen with cooking facilities'
        },
        {
          id: '4',
          name: 'Air conditioning',
          category: 'climate',
          icon: 'ac',
          description: 'Climate-controlled environment for optimal comfort'
        },
        {
          id: '5',
          name: 'TV',
          category: 'entertainment',
          icon: 'tv',
          description: 'Flat-screen television with cable/satellite channels'
        },
        {
          id: '6',
          name: 'Pool',
          category: 'outdoor',
          icon: 'pool',
          description: 'Swimming pool available for guest use'
        },
        {
          id: '7',
          name: 'Gym',
          category: 'fitness',
          icon: 'gym',
          description: 'Fitness center with exercise equipment'
        },
        {
          id: '8',
          name: 'Washing machine',
          category: 'laundry',
          icon: 'washing',
          description: 'In-unit laundry facilities available'
        },
        {
          id: '9',
          name: 'Private bathroom',
          category: 'bathroom',
          icon: 'bathroom',
          description: 'Dedicated bathroom with shower and toiletries'
        },
        {
          id: '10',
          name: 'Security system',
          category: 'safety',
          icon: 'security',
          description: '24/7 security monitoring and access control'
        },
        {
          id: '11',
          name: 'Pet friendly',
          category: 'policies',
          icon: 'pet',
          description: 'Pets are welcome with prior arrangement'
        },
        {
          id: '12',
          name: 'Wheelchair accessible',
          category: 'accessibility',
          icon: 'accessible',
          description: 'Property is accessible for wheelchair users'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getAmenityIcon = (iconName: string, category: string) => {
    const iconProps = { className: "w-5 h-5 text-muted-foreground" };
    
    switch (iconName) {
      case 'wifi': return <Wifi {...iconProps} />;
      case 'car': return <Car {...iconProps} />;
      case 'kitchen': return <ChefHat {...iconProps} />;
      case 'ac': return <AirVent {...iconProps} />;
      case 'tv': return <Tv {...iconProps} />;
      case 'pool': return <Waves {...iconProps} />;
      case 'gym': return <Dumbbell {...iconProps} />;
      case 'washing': return <WashingMachine {...iconProps} />;
      case 'bathroom': return <Bath {...iconProps} />;
      case 'security': return <Shield {...iconProps} />;
      case 'pet': return <Dog {...iconProps} />;
      case 'accessible': return <Accessibility {...iconProps} />;
      default: {
        // Fallback based on category
        switch (category) {
          case 'internet': return <Wifi {...iconProps} />;
          case 'parking': return <Car {...iconProps} />;
          case 'kitchen': return <Utensils {...iconProps} />;
          case 'climate': return <AirVent {...iconProps} />;
          case 'entertainment': return <Tv {...iconProps} />;
          case 'outdoor': return <TreePine {...iconProps} />;
          case 'fitness': return <Dumbbell {...iconProps} />;
          case 'laundry': return <WashingMachine {...iconProps} />;
          case 'bathroom': return <Bath {...iconProps} />;
          case 'safety': return <Shield {...iconProps} />;
          case 'policies': return <Home {...iconProps} />;
          case 'accessibility': return <Accessibility {...iconProps} />;
          default: return <Home {...iconProps} />;
        }
      }
    }
  };

  const getCategoryIcon = (category: string) => {
    const iconProps = { className: "w-5 h-5" };
    
    switch (category) {
      case 'internet': return <Wifi {...iconProps} />;
      case 'parking': return <Car {...iconProps} />;
      case 'kitchen': return <ChefHat {...iconProps} />;
      case 'climate': return <AirVent {...iconProps} />;
      case 'entertainment': return <Tv {...iconProps} />;
      case 'outdoor': return <TreePine {...iconProps} />;
      case 'fitness': return <Dumbbell {...iconProps} />;
      case 'laundry': return <WashingMachine {...iconProps} />;
      case 'bathroom': return <Bath {...iconProps} />;
      case 'safety': return <Shield {...iconProps} />;
      case 'policies': return <Home {...iconProps} />;
      case 'accessibility': return <Accessibility {...iconProps} />;
      default: return <Home {...iconProps} />;
    }
  };

  const getCategoryDisplayName = (category: string) => {
    const categoryNames: Record<string, string> = {
      'internet': 'Internet & Technology',
      'parking': 'Parking & Transportation',
      'kitchen': 'Kitchen & Dining',
      'climate': 'Climate Control',
      'entertainment': 'Entertainment',
      'outdoor': 'Outdoor Features',
      'fitness': 'Health & Fitness',
      'laundry': 'Laundry & Cleaning',
      'bathroom': 'Bathroom',
      'safety': 'Safety & Security',
      'policies': 'Property Policies',
      'accessibility': 'Accessibility'
    };
    
    return categoryNames[category] || category.charAt(0).toUpperCase() + category.slice(1);
  };

  const categorizedAmenities = amenities.reduce<AmenityCategory[]>((acc, amenity) => {
    const existingCategory = acc.find(cat => cat.name === amenity.category);
    
    if (existingCategory) {
      existingCategory.amenities.push(amenity);
    } else {
      acc.push({
        name: amenity.category,
        amenities: [amenity],
        icon: getCategoryIcon(amenity.category)
      });
    }
    
    return acc;
  }, []);

  const popularAmenities = amenities.slice(0, 8); // Show first 8 amenities as popular

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`p-6 ${className}`}>
        <h3 className="text-lg font-semibold mb-4">Amenities</h3>
        <p className="text-muted-foreground">Failed to load amenities information.</p>
      </Card>
    );
  }

  if (amenities.length === 0) {
    return (
      <Card className={`p-6 ${className}`}>
        <h3 className="text-lg font-semibold mb-4">Amenities</h3>
        <p className="text-muted-foreground">No amenities information available.</p>
      </Card>
    );
  }

  return (
    <Card className={`p-6 ${className}`}>
      <h3 className="text-lg font-semibold mb-6">What this place offers</h3>
      
      {/* Popular Amenities Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {popularAmenities.map((amenity) => (
          <div key={amenity.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
            {getAmenityIcon(amenity.icon || '', amenity.category)}
            <span className="font-medium">{amenity.name}</span>
          </div>
        ))}
      </div>

      {/* Show All Amenities Button */}
      {amenities.length > 8 && (
        <Dialog open={showAllAmenities} onOpenChange={setShowAllAmenities}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full">
              <Grid3x3 className="w-4 h-4 mr-2" />
              Show all {amenities.length} amenities
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>All Amenities</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {categorizedAmenities.map((category, categoryIndex) => (
                <div key={category.name}>
                  <div className="flex items-center space-x-2 mb-4">
                    {category.icon}
                    <h4 className="font-semibold text-lg">
                      {getCategoryDisplayName(category.name)}
                    </h4>
                    <Badge variant="secondary">
                      {category.amenities.length}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {category.amenities.map((amenity) => (
                      <div
                        key={amenity.id}
                        className="flex items-start space-x-3 p-4 border rounded-lg hover:shadow-sm transition-shadow"
                      >
                        {getAmenityIcon(amenity.icon || '', amenity.category)}
                        <div className="flex-1">
                          <h5 className="font-medium mb-1">{amenity.name}</h5>
                          {amenity.description && (
                            <p className="text-sm text-muted-foreground">
                              {amenity.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {categoryIndex < categorizedAmenities.length - 1 && (
                    <Separator className="mt-6" />
                  )}
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Amenities Summary */}
      {categorizedAmenities.length > 0 && (
        <div className="mt-6 pt-6 border-t">
          <h4 className="font-medium mb-3">Amenities by Category</h4>
          <div className="flex flex-wrap gap-2">
            {categorizedAmenities.map((category) => (
              <Badge key={category.name} variant="outline" className="flex items-center space-x-1">
                {category.icon}
                <span>{getCategoryDisplayName(category.name)}</span>
                <span className="ml-1 text-xs">({category.amenities.length})</span>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

export default PropertyAmenities;