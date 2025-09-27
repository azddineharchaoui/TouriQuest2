/**
 * PropertyDetails - Main property detail page component
 * Fetches and displays comprehensive property information
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Property } from '../types/api-types';
import { propertyService } from '../services/propertyService';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import {
  MapPin,
  Star,
  Heart,
  Share2,
  ArrowLeft,
  Users,
  Bed,
  Bath,
  Home,
  Calendar,
  DollarSign,
  Shield,
  CheckCircle,
  AlertCircle,
  Wifi,
  Car,
  Coffee,
  Tv,
  AirVent
} from 'lucide-react';

// Import child components
import PropertyPhotoGallery from './PropertyPhotoGallery';
import PropertyAmenities from './PropertyAmenities';
import NearbyProperties from './NearbyProperties';
import AvailabilityCalendar from './AvailabilityCalendar';
import BookingForm from './BookingForm';
import PricingCalculator from './PricingCalculator';
import PropertyReviews from './PropertyReviews';
import VirtualTour from './VirtualTour';

interface PropertyDetailsProps {
  className?: string;
}

export const PropertyDetails: React.FC<PropertyDetailsProps> = ({ className }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedDates, setSelectedDates] = useState<{
    checkIn: Date | null;
    checkOut: Date | null;
  }>({ checkIn: null, checkOut: null });
  const [guestCount, setGuestCount] = useState(1);

  useEffect(() => {
    if (id) {
      fetchPropertyDetails(id);
    }
  }, [id]);

  const fetchPropertyDetails = async (propertyId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch main property data
      const response = await propertyService.getPropertyById(propertyId);
      setProperty(response.data);
      
      // Check if property is favorited (if user is logged in)
      try {
        const favoritesResponse = await propertyService.getFavorites();
        const favoriteIds = favoritesResponse.data.map((fav: any) => fav.propertyId);
        setIsFavorited(favoriteIds.includes(propertyId));
      } catch (favError) {
        // User might not be logged in, ignore error
        console.log('Could not fetch favorites:', favError);
      }
      
    } catch (err: any) {
      setError(err.message || 'Failed to fetch property details');
    } finally {
      setLoading(false);
    }
  };

  const handleFavoriteToggle = async () => {
    if (!property) return;
    
    try {
      if (isFavorited) {
        await propertyService.removeFromFavorites(property.id);
        setIsFavorited(false);
      } else {
        await propertyService.addToFavorites(property.id);
        setIsFavorited(true);
      }
    } catch (err: any) {
      console.error('Failed to toggle favorite:', err);
      // TODO: Show toast notification
    }
  };

  const handleShare = async () => {
    if (!property) return;
    
    try {
      await navigator.share({
        title: property.title,
        text: property.description,
        url: window.location.href,
      });
    } catch (err) {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      // TODO: Show toast notification
    }
  };

  const handleBookNow = () => {
    setShowBookingForm(true);
  };

  const handleDateSelection = (checkIn: Date | null, checkOut: Date | null) => {
    setSelectedDates({ checkIn, checkOut });
  };

  if (loading) {
    return (
      <div className={`max-w-7xl mx-auto p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-96 bg-gray-200 rounded mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-40 bg-gray-200 rounded"></div>
              <div className="h-60 bg-gray-200 rounded"></div>
            </div>
            <div className="h-80 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`max-w-7xl mx-auto p-6 ${className}`}>
        <Card className="p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Error Loading Property</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </Card>
      </div>
    );
  }

  if (!property) {
    return (
      <div className={`max-w-7xl mx-auto p-6 ${className}`}>
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-2">Property Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The property you're looking for could not be found.
          </p>
          <Button onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className={`max-w-7xl mx-auto p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="flex items-center"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
          <Button
            variant={isFavorited ? "default" : "outline"}
            size="sm"
            onClick={handleFavoriteToggle}
          >
            <Heart className={`w-4 h-4 mr-2 ${isFavorited ? 'fill-current' : ''}`} />
            {isFavorited ? 'Saved' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Property Title and Basic Info */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{property.title}</h1>
        <div className="flex items-center space-x-4 text-muted-foreground">
          <div className="flex items-center">
            <Star className="w-4 h-4 text-yellow-400 fill-current mr-1" />
            <span className="font-medium">{property.rating.toFixed(1)}</span>
            <span className="ml-1">({property.reviewCount} reviews)</span>
          </div>
          <div className="flex items-center">
            <MapPin className="w-4 h-4 mr-1" />
            <span>{property.location.city}, {property.location.country}</span>
          </div>
        </div>
      </div>

      {/* Photo Gallery */}
      <PropertyPhotoGallery propertyId={property.id} className="mb-8" />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Property Details */}
        <div className="lg:col-span-2 space-y-8">
          {/* Property Overview */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold mb-2">
                  {property.type.name} hosted by {property.host.name}
                </h2>
                <div className="flex items-center space-x-4 text-muted-foreground">
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    <span>{property.rules.maxGuests} guests</span>
                  </div>
                  {property.type.category === 'apartment' || property.type.category === 'house' ? (
                    <>
                      <div className="flex items-center">
                        <Bed className="w-4 h-4 mr-1" />
                        <span>2 bedrooms</span>
                      </div>
                      <div className="flex items-center">
                        <Bath className="w-4 h-4 mr-1" />
                        <span>1 bathroom</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center">
                      <Home className="w-4 h-4 mr-1" />
                      <span>{property.type.category}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Host Avatar */}
              <div className="flex-shrink-0">
                {property.host.avatar ? (
                  <img
                    src={property.host.avatar}
                    alt={property.host.name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                    <Users className="w-8 h-8 text-gray-400" />
                  </div>
                )}
              </div>
            </div>
            
            <Separator className="my-4" />
            
            <div className="prose max-w-none">
              <p className="text-muted-foreground leading-relaxed">
                {property.description}
              </p>
            </div>
          </Card>

          {/* Key Features */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">What this place offers</h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Sample amenities - these would come from the amenities endpoint */}
              <div className="flex items-center space-x-3">
                <Wifi className="w-5 h-5 text-muted-foreground" />
                <span>Free WiFi</span>
              </div>
              <div className="flex items-center space-x-3">
                <Car className="w-5 h-5 text-muted-foreground" />
                <span>Free parking</span>
              </div>
              <div className="flex items-center space-x-3">
                <Coffee className="w-5 h-5 text-muted-foreground" />
                <span>Kitchen</span>
              </div>
              <div className="flex items-center space-x-3">
                <Tv className="w-5 h-5 text-muted-foreground" />
                <span>TV</span>
              </div>
              <div className="flex items-center space-x-3">
                <AirVent className="w-5 h-5 text-muted-foreground" />
                <span>Air conditioning</span>
              </div>
            </div>
            
            <Button variant="outline" className="mt-4 w-full">
              Show all amenities
            </Button>
          </Card>

          {/* Amenities Section */}
          <PropertyAmenities propertyId={property.id} />

          {/* Virtual Tour */}
          <VirtualTour propertyId={property.id} />

          {/* Reviews Section */}
          <PropertyReviews propertyId={property.id} />

          {/* Nearby Properties */}
          <NearbyProperties propertyId={property.id} />
        </div>

        {/* Right Column - Booking */}
        <div className="space-y-6">
          {/* Pricing Calculator */}
          <PricingCalculator
            propertyId={property.id}
            basePrice={property.pricing.basePrice}
            currency={property.pricing.currency}
            onDateSelection={handleDateSelection}
            onGuestCountChange={setGuestCount}
            onBookNow={handleBookNow}
          />

          {/* Availability Calendar */}
          <AvailabilityCalendar
            propertyId={property.id}
            onDateSelection={handleDateSelection}
            selectedDates={selectedDates}
          />

          {/* Host Information */}
          <Card className="p-6">
            <div className="flex items-center space-x-4 mb-4">
              {property.host.avatar ? (
                <img
                  src={property.host.avatar}
                  alt={property.host.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                  <Users className="w-6 h-6 text-gray-400" />
                </div>
              )}
              <div>
                <h3 className="font-semibold">Hosted by {property.host.name}</h3>
                <p className="text-sm text-muted-foreground">
                  Joined {new Date(property.host.joinedAt).getFullYear()}
                </p>
              </div>
            </div>
            
            <div className="space-y-2 text-sm">
              {property.host.responseRate && (
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>{property.host.responseRate}% response rate</span>
                </div>
              )}
              {property.host.responseTime && (
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Responds within {property.host.responseTime}</span>
                </div>
              )}
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-blue-500" />
                <span>Identity verified</span>
              </div>
            </div>
            
            <Button variant="outline" className="w-full mt-4">
              Contact Host
            </Button>
          </Card>

          {/* Property Rules */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">House Rules</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Check-in</span>
                <span>{property.rules.checkIn}</span>
              </div>
              <div className="flex justify-between">
                <span>Check-out</span>
                <span>{property.rules.checkOut}</span>
              </div>
              <div className="flex justify-between">
                <span>Maximum guests</span>
                <span>{property.rules.maxGuests}</span>
              </div>
              <Separator className="my-2" />
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span>Smoking</span>
                  <span className={property.rules.smoking ? 'text-green-600' : 'text-red-600'}>
                    {property.rules.smoking ? 'Allowed' : 'Not allowed'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Pets</span>
                  <span className={property.rules.pets ? 'text-green-600' : 'text-red-600'}>
                    {property.rules.pets ? 'Allowed' : 'Not allowed'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Parties</span>
                  <span className={property.rules.parties ? 'text-green-600' : 'text-red-600'}>
                    {property.rules.parties ? 'Allowed' : 'Not allowed'}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Booking Form Modal */}
      {showBookingForm && property && selectedDates.checkIn && selectedDates.checkOut && (
        <BookingForm
          property={property}
          checkIn={selectedDates.checkIn}
          checkOut={selectedDates.checkOut}
          guests={guestCount}
          onClose={() => setShowBookingForm(false)}
          onBookingComplete={(booking) => {
            setShowBookingForm(false);
            navigate(`/bookings/${booking.id}`);
          }}
        />
      )}
    </div>
  );
};

export default PropertyDetails;