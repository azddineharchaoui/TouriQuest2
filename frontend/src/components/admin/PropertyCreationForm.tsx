/**
 * PropertyCreationForm - Comprehensive form for creating new properties
 * Connected to POST /api/v1/properties/
 */

import React, { useState, useEffect } from 'react';
import { propertyService } from '../../services/propertyService';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import {
  Save,
  ArrowLeft,
  ArrowRight,
  Check,
  X,
  Upload,
  MapPin,
  Home,
  Bed,
  Bath,
  Users,
  DollarSign,
  Calendar,
  Wifi,
  Car,
  Coffee,
  Tv,
  AirVent,
  Utensils,
  Loader2,
  AlertCircle,
  CheckCircle,
  Plus,
  Trash2,
  Edit,
  Image as ImageIcon
} from 'lucide-react';

interface PropertyCreationFormProps {
  onSave: (property: any) => void;
  onCancel: () => void;
}

interface PropertyFormData {
  // Basic Information
  title: string;
  description: string;
  type: string;
  
  // Location
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  
  // Property Details
  details: {
    bedrooms: number;
    bathrooms: number;
    maxGuests: number;
    area: number;
    floors: number;
  };
  
  // Amenities
  amenities: {
    basic: string[];
    kitchen: string[];
    bathroom: string[];
    bedroom: string[];
    entertainment: string[];
    outdoor: string[];
    accessibility: string[];
  };
  
  // Pricing
  pricing: {
    basePrice: number;
    currency: string;
    cleaningFee: number;
    serviceFee: number;
    minimumStay: number;
    weeklyDiscount: number;
    monthlyDiscount: number;
  };
  
  // Availability
  availability: {
    checkInTime: string;
    checkOutTime: string;
    advanceBooking: number;
    instantBook: boolean;
    minimumStay: number;
    maximumStay: number;
  };
  
  // House Rules
  rules: {
    smokingAllowed: boolean;
    petsAllowed: boolean;
    partiesAllowed: boolean;
    childrenAllowed: boolean;
    quietHours: {
      start: string;
      end: string;
    };
    additionalRules: string[];
  };
  
  // Photos
  photos: {
    url: string;
    caption: string;
    isPrimary: boolean;
  }[];
  
  // Host Information
  host: {
    name: string;
    email: string;
    phone: string;
    bio: string;
    avatar?: string;
  };
}

const AMENITY_OPTIONS = {
  basic: ['WiFi', 'Air Conditioning', 'Heating', 'Hot Water', 'Smoke Detector', 'Carbon Monoxide Detector'],
  kitchen: ['Full Kitchen', 'Microwave', 'Refrigerator', 'Dishwasher', 'Coffee Maker', 'Cooking Basics'],
  bathroom: ['Hair Dryer', 'Shampoo', 'Hot Water', 'Towels', 'Toilet Paper', 'Soap'],
  bedroom: ['Bed Linens', 'Extra Pillows', 'Hangers', 'Iron', 'Laptop Workspace', 'Blackout Curtains'],
  entertainment: ['TV', 'Cable/Satellite', 'Netflix', 'Sound System', 'Books/Magazines', 'Board Games'],
  outdoor: ['Parking', 'Garden', 'Balcony', 'Patio', 'BBQ Grill', 'Outdoor Seating'],
  accessibility: ['Step-Free Access', 'Wide Doorways', 'Accessible Bathroom', 'Elevator', 'Ground Floor']
};

const PROPERTY_TYPES = [
  { value: 'apartment', label: 'Apartment' },
  { value: 'house', label: 'House' },
  { value: 'villa', label: 'Villa' },
  { value: 'cabin', label: 'Cabin' },
  { value: 'condo', label: 'Condo' },
  { value: 'studio', label: 'Studio' },
  { value: 'loft', label: 'Loft' },
  { value: 'townhouse', label: 'Townhouse' }
];

export const PropertyCreationForm: React.FC<PropertyCreationFormProps> = ({
  onSave,
  onCancel
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState<PropertyFormData>({
    title: '',
    description: '',
    type: '',
    address: {
      street: '',
      city: '',
      state: '',
      country: '',
      postalCode: ''
    },
    details: {
      bedrooms: 1,
      bathrooms: 1,
      maxGuests: 2,
      area: 0,
      floors: 1
    },
    amenities: {
      basic: [],
      kitchen: [],
      bathroom: [],
      bedroom: [],
      entertainment: [],
      outdoor: [],
      accessibility: []
    },
    pricing: {
      basePrice: 100,
      currency: 'USD',
      cleaningFee: 0,
      serviceFee: 0,
      minimumStay: 1,
      weeklyDiscount: 0,
      monthlyDiscount: 0
    },
    availability: {
      checkInTime: '15:00',
      checkOutTime: '11:00',
      advanceBooking: 365,
      instantBook: false,
      minimumStay: 1,
      maximumStay: 30
    },
    rules: {
      smokingAllowed: false,
      petsAllowed: false,
      partiesAllowed: false,
      childrenAllowed: true,
      quietHours: {
        start: '22:00',
        end: '08:00'
      },
      additionalRules: []
    },
    photos: [],
    host: {
      name: '',
      email: '',
      phone: '',
      bio: ''
    }
  });

  const steps = [
    { title: 'Basic Info', icon: Home },
    { title: 'Location', icon: MapPin },
    { title: 'Details', icon: Bed },
    { title: 'Amenities', icon: Wifi },
    { title: 'Pricing', icon: DollarSign },
    { title: 'Availability', icon: Calendar },
    { title: 'Photos', icon: ImageIcon },
    { title: 'Host Info', icon: Users },
    { title: 'Review', icon: Check }
  ];

  const updateFormData = (section: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof PropertyFormData],
        [field]: value
      }
    }));
  };

  const updateNestedFormData = (section: string, subsection: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof PropertyFormData],
        [subsection]: {
          ...(prev[section as keyof PropertyFormData] as any)[subsection],
          [field]: value
        }
      }
    }));
  };

  const toggleAmenity = (category: string, amenity: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: {
        ...prev.amenities,
        [category]: prev.amenities[category as keyof typeof prev.amenities].includes(amenity)
          ? prev.amenities[category as keyof typeof prev.amenities].filter(a => a !== amenity)
          : [...prev.amenities[category as keyof typeof prev.amenities], amenity]
      }
    }));
  };

  const addAdditionalRule = () => {
    setFormData(prev => ({
      ...prev,
      rules: {
        ...prev.rules,
        additionalRules: [...prev.rules.additionalRules, '']
      }
    }));
  };

  const updateAdditionalRule = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      rules: {
        ...prev.rules,
        additionalRules: prev.rules.additionalRules.map((rule, i) => i === index ? value : rule)
      }
    }));
  };

  const removeAdditionalRule = (index: number) => {
    setFormData(prev => ({
      ...prev,
      rules: {
        ...prev.rules,
        additionalRules: prev.rules.additionalRules.filter((_, i) => i !== index)
      }
    }));
  };

  const validateStep = (step: number) => {
    switch (step) {
      case 0: // Basic Info
        return formData.title && formData.description && formData.type;
      case 1: // Location
        return formData.address.street && formData.address.city && formData.address.country;
      case 2: // Details
        return formData.details.bedrooms > 0 && formData.details.bathrooms > 0 && formData.details.maxGuests > 0;
      case 3: // Amenities
        return true; // Optional
      case 4: // Pricing
        return formData.pricing.basePrice > 0;
      case 5: // Availability
        return formData.availability.checkInTime && formData.availability.checkOutTime;
      case 6: // Photos
        return formData.photos.length > 0;
      case 7: // Host Info
        return formData.host.name && formData.host.email;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(steps.length - 1, prev + 1));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const propertyData = {
        ...formData,
        status: 'pending'
      };
      
      const response = await propertyService.createProperty(propertyData);
      
      setSuccess(true);
      setTimeout(() => {
        onSave(response.data);
      }, 2000);
      
    } catch (err: any) {
      setError(err.message || 'Failed to create property');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Basic Info
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="title">Property Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter property title"
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your property..."
                rows={4}
              />
            </div>
            
            <div>
              <Label htmlFor="type">Property Type *</Label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">Select property type</option>
                {PROPERTY_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
          </div>
        );

      case 1: // Location
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="street">Street Address *</Label>
              <Input
                id="street"
                value={formData.address.street}
                onChange={(e) => updateNestedFormData('address', '', 'street', e.target.value)}
                placeholder="Enter street address"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={formData.address.city}
                  onChange={(e) => updateNestedFormData('address', '', 'city', e.target.value)}
                  placeholder="Enter city"
                />
              </div>
              <div>
                <Label htmlFor="state">State/Province</Label>
                <Input
                  id="state"
                  value={formData.address.state}
                  onChange={(e) => updateNestedFormData('address', '', 'state', e.target.value)}
                  placeholder="Enter state"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="country">Country *</Label>
                <Input
                  id="country"
                  value={formData.address.country}
                  onChange={(e) => updateNestedFormData('address', '', 'country', e.target.value)}
                  placeholder="Enter country"
                />
              </div>
              <div>
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input
                  id="postalCode"
                  value={formData.address.postalCode}
                  onChange={(e) => updateNestedFormData('address', '', 'postalCode', e.target.value)}
                  placeholder="Enter postal code"
                />
              </div>
            </div>
          </div>
        );

      case 2: // Details
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bedrooms">Bedrooms *</Label>
                <Input
                  id="bedrooms"
                  type="number"
                  min="0"
                  value={formData.details.bedrooms}
                  onChange={(e) => updateNestedFormData('details', '', 'bedrooms', parseInt(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="bathrooms">Bathrooms *</Label>
                <Input
                  id="bathrooms"
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.details.bathrooms}
                  onChange={(e) => updateNestedFormData('details', '', 'bathrooms', parseFloat(e.target.value))}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="maxGuests">Max Guests *</Label>
                <Input
                  id="maxGuests"
                  type="number"
                  min="1"
                  value={formData.details.maxGuests}
                  onChange={(e) => updateNestedFormData('details', '', 'maxGuests', parseInt(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="area">Area (sq ft)</Label>
                <Input
                  id="area"
                  type="number"
                  min="0"
                  value={formData.details.area}
                  onChange={(e) => updateNestedFormData('details', '', 'area', parseInt(e.target.value))}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="floors">Number of Floors</Label>
              <Input
                id="floors"
                type="number"
                min="1"
                value={formData.details.floors}
                onChange={(e) => updateNestedFormData('details', '', 'floors', parseInt(e.target.value))}
              />
            </div>
          </div>
        );

      case 3: // Amenities
        return (
          <div className="space-y-6">
            {Object.entries(AMENITY_OPTIONS).map(([category, amenities]) => (
              <div key={category}>
                <h4 className="font-medium mb-3 capitalize">{category.replace(/([A-Z])/g, ' $1')}</h4>
                <div className="grid grid-cols-2 gap-2">
                  {amenities.map(amenity => (
                    <label key={amenity} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.amenities[category as keyof typeof formData.amenities].includes(amenity)}
                        onChange={() => toggleAmenity(category, amenity)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{amenity}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );

      case 4: // Pricing
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="basePrice">Base Price per Night *</Label>
                <Input
                  id="basePrice"
                  type="number"
                  min="0"
                  value={formData.pricing.basePrice}
                  onChange={(e) => updateNestedFormData('pricing', '', 'basePrice', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="currency">Currency</Label>
                <select
                  id="currency"
                  value={formData.pricing.currency}
                  onChange={(e) => updateNestedFormData('pricing', '', 'currency', e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cleaningFee">Cleaning Fee</Label>
                <Input
                  id="cleaningFee"
                  type="number"
                  min="0"
                  value={formData.pricing.cleaningFee}
                  onChange={(e) => updateNestedFormData('pricing', '', 'cleaningFee', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="serviceFee">Service Fee</Label>
                <Input
                  id="serviceFee"
                  type="number"
                  min="0"
                  value={formData.pricing.serviceFee}
                  onChange={(e) => updateNestedFormData('pricing', '', 'serviceFee', parseFloat(e.target.value))}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="weeklyDiscount">Weekly Discount (%)</Label>
                <Input
                  id="weeklyDiscount"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.pricing.weeklyDiscount}
                  onChange={(e) => updateNestedFormData('pricing', '', 'weeklyDiscount', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="monthlyDiscount">Monthly Discount (%)</Label>
                <Input
                  id="monthlyDiscount"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.pricing.monthlyDiscount}
                  onChange={(e) => updateNestedFormData('pricing', '', 'monthlyDiscount', parseFloat(e.target.value))}
                />
              </div>
            </div>
          </div>
        );

      case 5: // Availability
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="checkInTime">Check-in Time</Label>
                <Input
                  id="checkInTime"
                  type="time"
                  value={formData.availability.checkInTime}
                  onChange={(e) => updateNestedFormData('availability', '', 'checkInTime', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="checkOutTime">Check-out Time</Label>
                <Input
                  id="checkOutTime"
                  type="time"
                  value={formData.availability.checkOutTime}
                  onChange={(e) => updateNestedFormData('availability', '', 'checkOutTime', e.target.value)}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="minimumStay">Minimum Stay (nights)</Label>
                <Input
                  id="minimumStay"
                  type="number"
                  min="1"
                  value={formData.availability.minimumStay}
                  onChange={(e) => updateNestedFormData('availability', '', 'minimumStay', parseInt(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="maximumStay">Maximum Stay (nights)</Label>
                <Input
                  id="maximumStay"
                  type="number"
                  min="1"
                  value={formData.availability.maximumStay}
                  onChange={(e) => updateNestedFormData('availability', '', 'maximumStay', parseInt(e.target.value))}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="advanceBooking">Advance Booking (days)</Label>
              <Input
                id="advanceBooking"
                type="number"
                min="0"
                value={formData.availability.advanceBooking}
                onChange={(e) => updateNestedFormData('availability', '', 'advanceBooking', parseInt(e.target.value))}
              />
            </div>
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.availability.instantBook}
                onChange={(e) => updateNestedFormData('availability', '', 'instantBook', e.target.checked)}
                className="w-4 h-4"
              />
              <span>Enable Instant Book</span>
            </label>
          </div>
        );

      case 6: // Photos
        return (
          <div className="space-y-6">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Upload Property Photos</h3>
              <p className="text-muted-foreground mb-4">
                Add high-quality photos of your property. The first photo will be the main image.
              </p>
              <Button>
                <Upload className="w-4 h-4 mr-2" />
                Choose Photos
              </Button>
            </div>
            
            {formData.photos.length > 0 && (
              <div className="grid grid-cols-3 gap-4">
                {formData.photos.map((photo, index) => (
                  <div key={index} className="relative">
                    <img
                      src={photo.url}
                      alt={photo.caption}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    {photo.isPrimary && (
                      <Badge className="absolute top-2 left-2">Primary</Badge>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          photos: prev.photos.filter((_, i) => i !== index)
                        }));
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 7: // Host Info
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="hostName">Host Name *</Label>
                <Input
                  id="hostName"
                  value={formData.host.name}
                  onChange={(e) => updateNestedFormData('host', '', 'name', e.target.value)}
                  placeholder="Enter host name"
                />
              </div>
              <div>
                <Label htmlFor="hostEmail">Host Email *</Label>
                <Input
                  id="hostEmail"
                  type="email"
                  value={formData.host.email}
                  onChange={(e) => updateNestedFormData('host', '', 'email', e.target.value)}
                  placeholder="Enter email address"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="hostPhone">Host Phone</Label>
              <Input
                id="hostPhone"
                value={formData.host.phone}
                onChange={(e) => updateNestedFormData('host', '', 'phone', e.target.value)}
                placeholder="Enter phone number"
              />
            </div>
            
            <div>
              <Label htmlFor="hostBio">Host Bio</Label>
              <Textarea
                id="hostBio"
                value={formData.host.bio}
                onChange={(e) => updateNestedFormData('host', '', 'bio', e.target.value)}
                placeholder="Tell guests about yourself..."
                rows={4}
              />
            </div>
          </div>
        );

      case 8: // Review
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Review Your Property</h3>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium">Basic Information</h4>
                <p className="text-sm text-muted-foreground">
                  {formData.title} - {formData.type}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formData.address.street}, {formData.address.city}
                </p>
              </div>
              
              <div>
                <h4 className="font-medium">Property Details</h4>
                <p className="text-sm text-muted-foreground">
                  {formData.details.bedrooms} bed, {formData.details.bathrooms} bath, 
                  up to {formData.details.maxGuests} guests
                </p>
              </div>
              
              <div>
                <h4 className="font-medium">Pricing</h4>
                <p className="text-sm text-muted-foreground">
                  {formData.pricing.basePrice} {formData.pricing.currency} per night
                </p>
              </div>
              
              <div>
                <h4 className="font-medium">Host</h4>
                <p className="text-sm text-muted-foreground">
                  {formData.host.name} ({formData.host.email})
                </p>
              </div>
            </div>
            
            {error && (
              <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                <span className="text-red-700">{error}</span>
              </div>
            )}
            
            {success && (
              <div className="flex items-center p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                <span className="text-green-700">Property created successfully!</span>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Add New Property</h1>
          <p className="text-muted-foreground">Create a new property listing</p>
        </div>
        <Button variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
      </div>

      {/* Progress Steps */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            const isAccessible = index <= currentStep || validateStep(index);

            return (
              <div key={index} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    isCompleted
                      ? 'bg-green-500 border-green-500 text-white'
                      : isActive
                      ? 'bg-blue-500 border-blue-500 text-white'
                      : isAccessible
                      ? 'border-gray-300 text-gray-500'
                      : 'border-gray-200 text-gray-300'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-12 h-0.5 mx-2 ${
                      isCompleted ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
        
        <div className="mt-4">
          <h3 className="font-semibold">{steps[currentStep].title}</h3>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>
      </Card>

      {/* Step Content */}
      <Card className="p-6">
        {renderStepContent()}
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 0}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        
        <div className="flex items-center space-x-2">
          {currentStep === steps.length - 1 ? (
            <Button
              onClick={handleSubmit}
              disabled={loading || !validateStep(currentStep)}
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Save className="w-4 h-4 mr-2" />
              Create Property
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!validateStep(currentStep)}
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PropertyCreationForm;