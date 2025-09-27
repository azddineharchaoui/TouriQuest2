/**
 * Property Creation Form
 * Comprehensive form for creating new properties with validation
 */

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Save,
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
  Waves,
  Mountain,
  TreePine,
  Building,
  Shield,
  Star,
  Camera,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Alert, AlertDescription } from '../ui/alert';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';

// ====================================
// VALIDATION SCHEMA
// ====================================

const propertySchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(100, 'Title must be less than 100 characters'),
  description: z.string().min(50, 'Description must be at least 50 characters').max(2000, 'Description must be less than 2000 characters'),
  type: z.enum(['villa', 'apartment', 'house', 'hotel', 'cabin', 'cottage']),
  status: z.enum(['active', 'inactive', 'draft']),
  
  // Location
  location: z.object({
    street: z.string().min(5, 'Street address is required'),
    city: z.string().min(2, 'City is required'),
    state: z.string().min(2, 'State is required'),
    country: z.string().min(2, 'Country is required'),
    zipCode: z.string().min(3, 'ZIP code is required'),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional()
  }),

  // Capacity
  capacity: z.object({
    maxGuests: z.number().min(1, 'Must accommodate at least 1 guest').max(50, 'Maximum 50 guests'),
    bedrooms: z.number().min(0, 'Bedrooms cannot be negative').max(20, 'Maximum 20 bedrooms'),
    bathrooms: z.number().min(0.5, 'Must have at least 0.5 bathrooms').max(20, 'Maximum 20 bathrooms'),
    beds: z.number().min(1, 'Must have at least 1 bed').max(50, 'Maximum 50 beds')
  }),

  // Pricing
  pricing: z.object({
    basePrice: z.number().min(1, 'Base price must be at least $1').max(10000, 'Maximum $10,000 per night'),
    currency: z.string().default('USD'),
    cleaningFee: z.number().min(0, 'Cleaning fee cannot be negative').max(1000, 'Maximum $1,000 cleaning fee').optional(),
    securityDeposit: z.number().min(0, 'Security deposit cannot be negative').max(5000, 'Maximum $5,000 security deposit').optional(),
    weeklyDiscount: z.number().min(0, 'Discount cannot be negative').max(50, 'Maximum 50% discount').optional(),
    monthlyDiscount: z.number().min(0, 'Discount cannot be negative').max(50, 'Maximum 50% discount').optional()
  }),

  // Amenities
  amenities: z.array(z.string()).min(1, 'Select at least one amenity'),

  // Rules and policies
  policies: z.object({
    checkInTime: z.string().min(1, 'Check-in time is required'),
    checkOutTime: z.string().min(1, 'Check-out time is required'),
    minStay: z.number().min(1, 'Minimum stay must be at least 1 night').max(365, 'Maximum 365 nights'),
    maxStay: z.number().min(1, 'Maximum stay must be at least 1 night').max(365, 'Maximum 365 nights'),
    cancellationPolicy: z.enum(['flexible', 'moderate', 'strict', 'super_strict']),
    smokingAllowed: z.boolean().default(false),
    petsAllowed: z.boolean().default(false),
    eventsAllowed: z.boolean().default(false),
    additionalRules: z.array(z.string()).optional()
  }),

  // Features
  featured: z.boolean().default(false),
  instantBook: z.boolean().default(false),
  verified: z.boolean().default(false)
});

type PropertyFormData = z.infer<typeof propertySchema>;

// ====================================
// AMENITY OPTIONS
// ====================================

const amenityOptions = [
  { id: 'wifi', name: 'WiFi', icon: Wifi, category: 'connectivity' },
  { id: 'parking', name: 'Free Parking', icon: Car, category: 'convenience' },
  { id: 'kitchen', name: 'Kitchen', icon: Coffee, category: 'convenience' },
  { id: 'pool', name: 'Swimming Pool', icon: Waves, category: 'recreation' },
  { id: 'air_conditioning', name: 'Air Conditioning', icon: Building, category: 'comfort' },
  { id: 'heating', name: 'Heating', icon: Home, category: 'comfort' },
  { id: 'tv', name: 'TV', icon: Building, category: 'entertainment' },
  { id: 'washer', name: 'Washer', icon: Building, category: 'convenience' },
  { id: 'dryer', name: 'Dryer', icon: Building, category: 'convenience' },
  { id: 'gym', name: 'Gym', icon: Building, category: 'recreation' },
  { id: 'hot_tub', name: 'Hot Tub', icon: Waves, category: 'recreation' },
  { id: 'balcony', name: 'Balcony', icon: Building, category: 'features' },
  { id: 'garden', name: 'Garden', icon: TreePine, category: 'features' },
  { id: 'mountain_view', name: 'Mountain View', icon: Mountain, category: 'views' },
  { id: 'ocean_view', name: 'Ocean View', icon: Waves, category: 'views' },
  { id: 'beach_access', name: 'Beach Access', icon: Waves, category: 'location' },
  { id: 'ski_access', name: 'Ski Access', icon: Mountain, category: 'location' },
  { id: 'pet_friendly', name: 'Pet Friendly', icon: Building, category: 'policies' },
  { id: 'family_friendly', name: 'Family Friendly', icon: Users, category: 'policies' },
  { id: 'business_ready', name: 'Business Ready', icon: Building, category: 'work' }
];

const amenityCategories = [
  { id: 'connectivity', name: 'Connectivity' },
  { id: 'convenience', name: 'Convenience' },
  { id: 'comfort', name: 'Comfort' },
  { id: 'recreation', name: 'Recreation' },
  { id: 'entertainment', name: 'Entertainment' },
  { id: 'features', name: 'Features' },
  { id: 'views', name: 'Views' },
  { id: 'location', name: 'Location' },
  { id: 'policies', name: 'Policies' },
  { id: 'work', name: 'Work' }
];

// ====================================
// COMPONENT INTERFACE
// ====================================

interface PropertyCreateFormProps {
  onClose: () => void;
  onSuccess?: (property: any) => void;
}

// ====================================
// MAIN COMPONENT
// ====================================

export const PropertyCreateForm: React.FC<PropertyCreateFormProps> = ({
  onClose,
  onSuccess
}) => {
  // Form state
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting, isValid }
  } = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      title: '',
      description: '',
      type: 'apartment',
      status: 'draft',
      location: {
        street: '',
        city: '',
        state: '',
        country: 'United States',
        zipCode: ''
      },
      capacity: {
        maxGuests: 2,
        bedrooms: 1,
        bathrooms: 1,
        beds: 1
      },
      pricing: {
        basePrice: 100,
        currency: 'USD',
        cleaningFee: 0,
        securityDeposit: 0,
        weeklyDiscount: 0,
        monthlyDiscount: 0
      },
      amenities: [],
      policies: {
        checkInTime: '15:00',
        checkOutTime: '11:00',
        minStay: 1,
        maxStay: 30,
        cancellationPolicy: 'flexible',
        smokingAllowed: false,
        petsAllowed: false,
        eventsAllowed: false,
        additionalRules: []
      },
      featured: false,
      instantBook: false,
      verified: false
    },
    mode: 'onChange'
  });

  // Local state
  const [activeTab, setActiveTab] = useState('basic');
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [completionProgress, setCompletionProgress] = useState(0);

  // Watch form values
  const watchedValues = watch();

  // ====================================
  // FORM COMPLETION CALCULATION
  // ====================================

  const calculateCompletion = useCallback(() => {
    let completed = 0;
    const total = 10;

    if (watchedValues.title) completed++;
    if (watchedValues.description) completed++;
    if (watchedValues.location?.street && watchedValues.location?.city) completed++;
    if (watchedValues.capacity?.maxGuests > 0) completed++;
    if (watchedValues.pricing?.basePrice > 0) completed++;
    if (watchedValues.amenities?.length > 0) completed++;
    if (watchedValues.policies?.checkInTime && watchedValues.policies?.checkOutTime) completed++;
    if (uploadedImages.length > 0) completed++;
    if (watchedValues.type) completed++;
    if (watchedValues.status) completed++;

    const progress = (completed / total) * 100;
    setCompletionProgress(progress);
  }, [watchedValues, uploadedImages]);

  React.useEffect(() => {
    calculateCompletion();
  }, [calculateCompletion]);

  // ====================================
  // EVENT HANDLERS
  // ====================================

  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setUploadedImages(prev => [...prev, ...files]);
  }, []);

  const handleRemoveImage = useCallback((index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleAmenityToggle = useCallback((amenityId: string) => {
    const currentAmenities = watchedValues.amenities || [];
    if (currentAmenities.includes(amenityId)) {
      setValue('amenities', currentAmenities.filter(id => id !== amenityId));
    } else {
      setValue('amenities', [...currentAmenities, amenityId]);
    }
  }, [watchedValues.amenities, setValue]);

  const handleAddRule = useCallback(() => {
    const currentRules = watchedValues.policies?.additionalRules || [];
    setValue('policies.additionalRules', [...currentRules, '']);
  }, [watchedValues.policies?.additionalRules, setValue]);

  const handleRemoveRule = useCallback((index: number) => {
    const currentRules = watchedValues.policies?.additionalRules || [];
    setValue('policies.additionalRules', currentRules.filter((_, i) => i !== index));
  }, [watchedValues.policies?.additionalRules, setValue]);

  const onSubmit = async (data: PropertyFormData) => {
    try {
      setSubmitError(null);
      setIsUploading(true);

      // TODO: Implement POST /api/v1/properties/
      // First create the property
      const propertyResponse = await fetch('/api/v1/properties/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!propertyResponse.ok) {
        throw new Error('Failed to create property');
      }

      const property = await propertyResponse.json();

      // Upload images if any
      if (uploadedImages.length > 0) {
        const formData = new FormData();
        uploadedImages.forEach((file, index) => {
          formData.append(`images`, file);
          formData.append(`orders`, index.toString());
        });

        // TODO: Implement POST /api/v1/properties/{id}/photos
        const uploadResponse = await fetch(`/api/v1/properties/${property.id}/photos`, {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          console.warn('Failed to upload some images');
        }
      }

      onSuccess?.(property);
      onClose();
    } catch (error) {
      console.error('Error creating property:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to create property');
    } finally {
      setIsUploading(false);
    }
  };

  // ====================================
  // RENDER FUNCTIONS
  // ====================================

  const renderBasicInfo = () => (
    <div className="space-y-6">
      <div>
        <Label htmlFor="title" className="text-sm font-medium">
          Property Title *
        </Label>
        <Controller
          name="title"
          control={control}
          render={({ field }) => (
            <Input
              id="title"
              {...field}
              placeholder="Enter a descriptive title for your property"
              className={errors.title ? 'border-red-500' : ''}
            />
          )}
        />
        {errors.title && (
          <p className="text-sm text-red-500 mt-1">{errors.title.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="description" className="text-sm font-medium">
          Description *
        </Label>
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <Textarea
              id="description"
              {...field}
              placeholder="Describe your property, highlighting unique features and amenities"
              rows={4}
              className={errors.description ? 'border-red-500' : ''}
            />
          )}
        />
        {errors.description && (
          <p className="text-sm text-red-500 mt-1">{errors.description.message}</p>
        )}
        <p className="text-sm text-gray-500 mt-1">
          {watchedValues.description?.length || 0}/2000 characters
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="type" className="text-sm font-medium">
            Property Type *
          </Label>
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select property type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="villa">Villa</SelectItem>
                  <SelectItem value="apartment">Apartment</SelectItem>
                  <SelectItem value="house">House</SelectItem>
                  <SelectItem value="hotel">Hotel</SelectItem>
                  <SelectItem value="cabin">Cabin</SelectItem>
                  <SelectItem value="cottage">Cottage</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div>
          <Label htmlFor="status" className="text-sm font-medium">
            Initial Status *
          </Label>
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>
    </div>
  );

  const renderLocation = () => (
    <div className="space-y-6">
      <div>
        <Label htmlFor="street" className="text-sm font-medium">
          Street Address *
        </Label>
        <Controller
          name="location.street"
          control={control}
          render={({ field }) => (
            <Input
              id="street"
              {...field}
              placeholder="123 Main Street"
              className={errors.location?.street ? 'border-red-500' : ''}
            />
          )}
        />
        {errors.location?.street && (
          <p className="text-sm text-red-500 mt-1">{errors.location.street.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="city" className="text-sm font-medium">
            City *
          </Label>
          <Controller
            name="location.city"
            control={control}
            render={({ field }) => (
              <Input
                id="city"
                {...field}
                placeholder="City"
                className={errors.location?.city ? 'border-red-500' : ''}
              />
            )}
          />
          {errors.location?.city && (
            <p className="text-sm text-red-500 mt-1">{errors.location.city.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="state" className="text-sm font-medium">
            State/Province *
          </Label>
          <Controller
            name="location.state"
            control={control}
            render={({ field }) => (
              <Input
                id="state"
                {...field}
                placeholder="State"
                className={errors.location?.state ? 'border-red-500' : ''}
              />
            )}
          />
          {errors.location?.state && (
            <p className="text-sm text-red-500 mt-1">{errors.location.state.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="zipCode" className="text-sm font-medium">
            ZIP/Postal Code *
          </Label>
          <Controller
            name="location.zipCode"
            control={control}
            render={({ field }) => (
              <Input
                id="zipCode"
                {...field}
                placeholder="12345"
                className={errors.location?.zipCode ? 'border-red-500' : ''}
              />
            )}
          />
          {errors.location?.zipCode && (
            <p className="text-sm text-red-500 mt-1">{errors.location.zipCode.message}</p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="country" className="text-sm font-medium">
          Country *
        </Label>
        <Controller
          name="location.country"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="United States">United States</SelectItem>
                <SelectItem value="Canada">Canada</SelectItem>
                <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                <SelectItem value="France">France</SelectItem>
                <SelectItem value="Germany">Germany</SelectItem>
                <SelectItem value="Italy">Italy</SelectItem>
                <SelectItem value="Spain">Spain</SelectItem>
                <SelectItem value="Australia">Australia</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>
    </div>
  );

  const renderCapacity = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <Label htmlFor="maxGuests" className="text-sm font-medium">
            Max Guests *
          </Label>
          <Controller
            name="capacity.maxGuests"
            control={control}
            render={({ field }) => (
              <Input
                id="maxGuests"
                type="number"
                min="1"
                max="50"
                {...field}
                onChange={(e) => field.onChange(parseInt(e.target.value))}
                className={errors.capacity?.maxGuests ? 'border-red-500' : ''}
              />
            )}
          />
          {errors.capacity?.maxGuests && (
            <p className="text-sm text-red-500 mt-1">{errors.capacity.maxGuests.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="bedrooms" className="text-sm font-medium">
            Bedrooms *
          </Label>
          <Controller
            name="capacity.bedrooms"
            control={control}
            render={({ field }) => (
              <Input
                id="bedrooms"
                type="number"
                min="0"
                max="20"
                {...field}
                onChange={(e) => field.onChange(parseInt(e.target.value))}
                className={errors.capacity?.bedrooms ? 'border-red-500' : ''}
              />
            )}
          />
          {errors.capacity?.bedrooms && (
            <p className="text-sm text-red-500 mt-1">{errors.capacity.bedrooms.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="bathrooms" className="text-sm font-medium">
            Bathrooms *
          </Label>
          <Controller
            name="capacity.bathrooms"
            control={control}
            render={({ field }) => (
              <Input
                id="bathrooms"
                type="number"
                min="0.5"
                max="20"
                step="0.5"
                {...field}
                onChange={(e) => field.onChange(parseFloat(e.target.value))}
                className={errors.capacity?.bathrooms ? 'border-red-500' : ''}
              />
            )}
          />
          {errors.capacity?.bathrooms && (
            <p className="text-sm text-red-500 mt-1">{errors.capacity.bathrooms.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="beds" className="text-sm font-medium">
            Beds *
          </Label>
          <Controller
            name="capacity.beds"
            control={control}
            render={({ field }) => (
              <Input
                id="beds"
                type="number"
                min="1"
                max="50"
                {...field}
                onChange={(e) => field.onChange(parseInt(e.target.value))}
                className={errors.capacity?.beds ? 'border-red-500' : ''}
              />
            )}
          />
          {errors.capacity?.beds && (
            <p className="text-sm text-red-500 mt-1">{errors.capacity.beds.message}</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderPricing = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="basePrice" className="text-sm font-medium">
            Base Price per Night *
          </Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Controller
              name="pricing.basePrice"
              control={control}
              render={({ field }) => (
                <Input
                  id="basePrice"
                  type="number"
                  min="1"
                  max="10000"
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                  className={`pl-10 ${errors.pricing?.basePrice ? 'border-red-500' : ''}`}
                />
              )}
            />
          </div>
          {errors.pricing?.basePrice && (
            <p className="text-sm text-red-500 mt-1">{errors.pricing.basePrice.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="currency" className="text-sm font-medium">
            Currency
          </Label>
          <Controller
            name="pricing.currency"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="CAD">CAD (C$)</SelectItem>
                  <SelectItem value="AUD">AUD (A$)</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="cleaningFee" className="text-sm font-medium">
            Cleaning Fee
          </Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Controller
              name="pricing.cleaningFee"
              control={control}
              render={({ field }) => (
                <Input
                  id="cleaningFee"
                  type="number"
                  min="0"
                  max="1000"
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                  className="pl-10"
                />
              )}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="securityDeposit" className="text-sm font-medium">
            Security Deposit
          </Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Controller
              name="pricing.securityDeposit"
              control={control}
              render={({ field }) => (
                <Input
                  id="securityDeposit"
                  type="number"
                  min="0"
                  max="5000"
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                  className="pl-10"
                />
              )}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="weeklyDiscount" className="text-sm font-medium">
            Weekly Discount (%)
          </Label>
          <Controller
            name="pricing.weeklyDiscount"
            control={control}
            render={({ field }) => (
              <Input
                id="weeklyDiscount"
                type="number"
                min="0"
                max="50"
                {...field}
                onChange={(e) => field.onChange(parseInt(e.target.value))}
              />
            )}
          />
        </div>

        <div>
          <Label htmlFor="monthlyDiscount" className="text-sm font-medium">
            Monthly Discount (%)
          </Label>
          <Controller
            name="pricing.monthlyDiscount"
            control={control}
            render={({ field }) => (
              <Input
                id="monthlyDiscount"
                type="number"
                min="0"
                max="50"
                {...field}
                onChange={(e) => field.onChange(parseInt(e.target.value))}
              />
            )}
          />
        </div>
      </div>
    </div>
  );

  const renderAmenities = () => (
    <div className="space-y-6">
      <div>
        <h4 className="font-medium mb-4">Select Available Amenities</h4>
        {amenityCategories.map((category) => {
          const categoryAmenities = amenityOptions.filter(a => a.category === category.id);
          if (categoryAmenities.length === 0) return null;

          return (
            <div key={category.id} className="mb-6">
              <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                {category.name}
              </h5>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {categoryAmenities.map((amenity) => {
                  const isSelected = watchedValues.amenities?.includes(amenity.id) || false;
                  return (
                    <div
                      key={amenity.id}
                      className={`
                        p-3 rounded-lg border-2 cursor-pointer transition-all
                        ${isSelected
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                        }
                      `}
                      onClick={() => handleAmenityToggle(amenity.id)}
                    >
                      <div className="flex items-center space-x-2">
                        <amenity.icon className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                        <span className={`text-sm font-medium ${isSelected ? 'text-blue-900 dark:text-blue-100' : 'text-gray-700 dark:text-gray-300'}`}>
                          {amenity.name}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {errors.amenities && (
          <p className="text-sm text-red-500 mt-1">{errors.amenities.message}</p>
        )}
      </div>
    </div>
  );

  const renderPhotos = () => (
    <div className="space-y-6">
      <div>
        <Label className="text-sm font-medium">Property Photos</Label>
        <p className="text-sm text-gray-500 mb-4">
          Upload high-quality photos to showcase your property. The first photo will be the main image.
        </p>

        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Drag and drop your photos here, or click to browse
          </p>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            className="hidden"
            id="photo-upload"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => document.getElementById('photo-upload')?.click()}
          >
            <Camera className="w-4 h-4 mr-2" />
            Choose Photos
          </Button>
        </div>

        {uploadedImages.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
            {uploadedImages.map((file, index) => (
              <div key={index} className="relative group">
                <img
                  src={URL.createObjectURL(file)}
                  alt={`Upload ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleRemoveImage(index)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                {index === 0 && (
                  <Badge className="absolute bottom-2 left-2">
                    Main Photo
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderPolicies = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="checkInTime" className="text-sm font-medium">
            Check-in Time *
          </Label>
          <Controller
            name="policies.checkInTime"
            control={control}
            render={({ field }) => (
              <Input
                id="checkInTime"
                type="time"
                {...field}
                className={errors.policies?.checkInTime ? 'border-red-500' : ''}
              />
            )}
          />
          {errors.policies?.checkInTime && (
            <p className="text-sm text-red-500 mt-1">{errors.policies.checkInTime.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="checkOutTime" className="text-sm font-medium">
            Check-out Time *
          </Label>
          <Controller
            name="policies.checkOutTime"
            control={control}
            render={({ field }) => (
              <Input
                id="checkOutTime"
                type="time"
                {...field}
                className={errors.policies?.checkOutTime ? 'border-red-500' : ''}
              />
            )}
          />
          {errors.policies?.checkOutTime && (
            <p className="text-sm text-red-500 mt-1">{errors.policies.checkOutTime.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="minStay" className="text-sm font-medium">
            Minimum Stay (nights) *
          </Label>
          <Controller
            name="policies.minStay"
            control={control}
            render={({ field }) => (
              <Input
                id="minStay"
                type="number"
                min="1"
                max="365"
                {...field}
                onChange={(e) => field.onChange(parseInt(e.target.value))}
                className={errors.policies?.minStay ? 'border-red-500' : ''}
              />
            )}
          />
          {errors.policies?.minStay && (
            <p className="text-sm text-red-500 mt-1">{errors.policies.minStay.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="maxStay" className="text-sm font-medium">
            Maximum Stay (nights) *
          </Label>
          <Controller
            name="policies.maxStay"
            control={control}
            render={({ field }) => (
              <Input
                id="maxStay"
                type="number"
                min="1"
                max="365"
                {...field}
                onChange={(e) => field.onChange(parseInt(e.target.value))}
                className={errors.policies?.maxStay ? 'border-red-500' : ''}
              />
            )}
          />
          {errors.policies?.maxStay && (
            <p className="text-sm text-red-500 mt-1">{errors.policies.maxStay.message}</p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="cancellationPolicy" className="text-sm font-medium">
          Cancellation Policy *
        </Label>
        <Controller
          name="policies.cancellationPolicy"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select cancellation policy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="flexible">Flexible</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="strict">Strict</SelectItem>
                <SelectItem value="super_strict">Super Strict</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="space-y-4">
        <h4 className="font-medium">Property Rules</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-2">
            <Controller
              name="policies.smokingAllowed"
              control={control}
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <Label className="text-sm">Smoking Allowed</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Controller
              name="policies.petsAllowed"
              control={control}
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <Label className="text-sm">Pets Allowed</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Controller
              name="policies.eventsAllowed"
              control={control}
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <Label className="text-sm">Events Allowed</Label>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-medium">Additional Rules</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddRule}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Rule
            </Button>
          </div>
          
          {watchedValues.policies?.additionalRules?.map((rule, index) => (
            <div key={index} className="flex items-center space-x-2 mb-2">
              <Input
                value={rule}
                onChange={(e) => {
                  const newRules = [...(watchedValues.policies?.additionalRules || [])];
                  newRules[index] = e.target.value;
                  setValue('policies.additionalRules', newRules);
                }}
                placeholder="Enter rule"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleRemoveRule(index)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <h4 className="font-medium">Property Features</h4>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Featured Property</Label>
              <p className="text-sm text-gray-500">Highlight this property in search results</p>
            </div>
            <Controller
              name="featured"
              control={control}
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Instant Book</Label>
              <p className="text-sm text-gray-500">Allow guests to book immediately without approval</p>
            </div>
            <Controller
              name="instantBook"
              control={control}
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Verified Property</Label>
              <p className="text-sm text-gray-500">Mark property as verified by admin</p>
            </div>
            <Controller
              name="verified"
              control={control}
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );

  // ====================================
  // MAIN RENDER
  // ====================================

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Form Completion</span>
          <span className="text-sm text-gray-500">{Math.round(completionProgress)}%</span>
        </div>
        <Progress value={completionProgress} className="h-2" />
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="location">Location</TabsTrigger>
            <TabsTrigger value="capacity">Capacity</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="amenities">Amenities</TabsTrigger>
            <TabsTrigger value="photos">Photos</TabsTrigger>
            <TabsTrigger value="policies">Policies</TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="basic">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent>{renderBasicInfo()}</CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="location">
              <Card>
                <CardHeader>
                  <CardTitle>Location Details</CardTitle>
                </CardHeader>
                <CardContent>{renderLocation()}</CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="capacity">
              <Card>
                <CardHeader>
                  <CardTitle>Capacity & Layout</CardTitle>
                </CardHeader>
                <CardContent>{renderCapacity()}</CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pricing">
              <Card>
                <CardHeader>
                  <CardTitle>Pricing & Fees</CardTitle>
                </CardHeader>
                <CardContent>{renderPricing()}</CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="amenities">
              <Card>
                <CardHeader>
                  <CardTitle>Amenities & Features</CardTitle>
                </CardHeader>
                <CardContent>{renderAmenities()}</CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="photos">
              <Card>
                <CardHeader>
                  <CardTitle>Property Photos</CardTitle>
                </CardHeader>
                <CardContent>{renderPhotos()}</CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="policies">
              <Card>
                <CardHeader>
                  <CardTitle>Policies & Rules</CardTitle>
                </CardHeader>
                <CardContent>
                  {renderPolicies()}
                  {renderSettings()}
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>

        {/* Error message */}
        {submitError && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>

          <div className="flex items-center space-x-3">
            <div className="text-sm text-gray-500">
              {Object.keys(errors).length > 0 && (
                <span className="text-red-500">
                  {Object.keys(errors).length} error(s) to fix
                </span>
              )}
            </div>
            
            <Button
              type="submit"
              disabled={isSubmitting || !isValid}
              className="min-w-32"
            >
              {isSubmitting ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 mr-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                  </motion.div>
                  Creating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Create Property
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};