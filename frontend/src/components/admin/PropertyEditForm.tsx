/**
 * Property Edit Form  
 * Comprehensive form for editing existing properties
 */

import React, { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Save,
  X,
  Upload,
  Trash2,
  AlertCircle,
  CheckCircle,
  Camera,
  RotateCcw,
  DollarSign
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

// ====================================
// INTERFACES
// ====================================

interface PropertyData {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  location: {
    street?: string;
    city: string;
    state?: string;
    country: string;
    zipCode?: string;
    coordinates?: [number, number];
  };
  capacity: {
    maxGuests: number;
    bedrooms: number;
    bathrooms: number;
    beds?: number;
  };
  pricing: {
    basePrice: number;
    currency?: string;
    cleaningFee?: number;
    securityDeposit?: number;
  };
  amenities?: string[];
  featured?: boolean;
  instantBook?: boolean;
  verified?: boolean;
}

interface PropertyEditFormProps {
  property: PropertyData;
  onClose: () => void;
  onSuccess?: (property: PropertyData) => void;
}

interface PropertyImage {
  id: string;
  url: string;
  altText?: string;
  order: number;
  isMain: boolean;
}

interface FormErrors {
  [key: string]: string;
}

// ====================================
// MAIN COMPONENT
// ====================================

export const PropertyEditForm: React.FC<PropertyEditFormProps> = ({
  property,
  onClose,
  onSuccess
}) => {
  // Form state
  const [formData, setFormData] = useState<PropertyData>({
    ...property
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [activeTab, setActiveTab] = useState('basic');
  const [existingImages, setExistingImages] = useState<PropertyImage[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [deletedImageIds, setDeletedImageIds] = useState<string[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // ====================================
  // LOAD EXISTING IMAGES
  // ====================================

  useEffect(() => {
    const loadImages = async () => {
      try {
        setIsLoadingImages(true);
        // TODO: Implement GET /api/v1/properties/{id}/photos
        const response = await fetch(`/api/v1/properties/${property.id}/photos`);
        if (response.ok) {
          const images = await response.json();
          setExistingImages(images.map((img: any, index: number) => ({
            id: img.id,
            url: img.url,
            altText: img.altText,
            order: img.order || index,
            isMain: img.isMain || index === 0
          })));
        }
      } catch (error) {
        console.error('Failed to load images:', error);
      } finally {
        setIsLoadingImages(false);
      }
    };

    loadImages();
  }, [property.id]);

  // ====================================
  // FORM HANDLERS
  // ====================================

  const updateFormData = useCallback((path: string, value: any) => {
    setFormData(prev => {
      const newData = { ...prev };
      const keys = path.split('.');
      let current: any = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newData;
    });
    setIsDirty(true);
  }, []);

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.title || formData.title.length < 5) {
      newErrors.title = 'Title must be at least 5 characters';
    }

    if (!formData.description || formData.description.length < 50) {
      newErrors.description = 'Description must be at least 50 characters';
    }

    if (!formData.location.city) {
      newErrors['location.city'] = 'City is required';
    }

    if (!formData.location.country) {
      newErrors['location.country'] = 'Country is required';
    }

    if (formData.capacity.maxGuests < 1) {
      newErrors['capacity.maxGuests'] = 'Must accommodate at least 1 guest';
    }

    if (formData.pricing.basePrice < 1) {
      newErrors['pricing.basePrice'] = 'Base price must be at least $1';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // ====================================
  // IMAGE HANDLERS
  // ====================================

  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setNewImages(prev => [...prev, ...files]);
    setIsDirty(true);
  }, []);

  const handleRemoveNewImage = useCallback((index: number) => {
    setNewImages(prev => prev.filter((_, i) => i !== index));
    setIsDirty(true);
  }, []);

  const handleDeleteExistingImage = useCallback((imageId: string) => {
    setDeletedImageIds(prev => [...prev, imageId]);
    setExistingImages(prev => prev.filter(img => img.id !== imageId));
    setIsDirty(true);
  }, []);

  const handleSetMainImage = useCallback((imageId: string) => {
    setExistingImages(prev => prev.map(img => ({
      ...img,
      isMain: img.id === imageId
    })));
    setIsDirty(true);
  }, []);

  // ====================================
  // FORM SUBMISSION
  // ====================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      // TODO: Implement PUT /api/v1/properties/{id}
      const response = await fetch(`/api/v1/properties/${property.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to update property');
      }

      const updatedProperty = await response.json();

      // Handle image operations
      await handleImageOperations();

      onSuccess?.(updatedProperty);
      onClose();
    } catch (error) {
      console.error('Error updating property:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to update property');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageOperations = async () => {
    // Delete removed images
    for (const imageId of deletedImageIds) {
      try {
        await fetch(`/api/v1/properties/${property.id}/photos/${imageId}`, {
          method: 'DELETE',
        });
      } catch (error) {
        console.warn('Failed to delete image:', imageId, error);
      }
    }

    // Upload new images
    if (newImages.length > 0) {
      const formData = new FormData();
      newImages.forEach((file, index) => {
        formData.append(`images`, file);
        formData.append(`orders`, (existingImages.length + index).toString());
      });

      try {
        await fetch(`/api/v1/properties/${property.id}/photos`, {
          method: 'POST',
          body: formData,
        });
      } catch (error) {
        console.warn('Failed to upload images:', error);
      }
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
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => updateFormData('title', e.target.value)}
          placeholder="Enter a descriptive title for your property"
          className={errors.title ? 'border-red-500' : ''}
        />
        {errors.title && (
          <p className="text-sm text-red-500 mt-1">{errors.title}</p>
        )}
      </div>

      <div>
        <Label htmlFor="description" className="text-sm font-medium">
          Description *
        </Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => updateFormData('description', e.target.value)}
          placeholder="Describe your property, highlighting unique features and amenities"
          rows={4}
          className={errors.description ? 'border-red-500' : ''}
        />
        {errors.description && (
          <p className="text-sm text-red-500 mt-1">{errors.description}</p>
        )}
        <p className="text-sm text-gray-500 mt-1">
          {formData.description?.length || 0}/2000 characters
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="type" className="text-sm font-medium">
            Property Type *
          </Label>
          <Select 
            value={formData.type} 
            onValueChange={(value) => updateFormData('type', value)}
          >
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
        </div>

        <div>
          <Label htmlFor="status" className="text-sm font-medium">
            Status *
          </Label>
          <Select 
            value={formData.status} 
            onValueChange={(value) => updateFormData('status', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  const renderLocation = () => (
    <div className="space-y-6">
      <div>
        <Label htmlFor="street" className="text-sm font-medium">
          Street Address
        </Label>
        <Input
          id="street"
          value={formData.location.street || ''}
          onChange={(e) => updateFormData('location.street', e.target.value)}
          placeholder="123 Main Street"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="city" className="text-sm font-medium">
            City *
          </Label>
          <Input
            id="city"
            value={formData.location.city}
            onChange={(e) => updateFormData('location.city', e.target.value)}
            placeholder="City"
            className={errors['location.city'] ? 'border-red-500' : ''}
          />
          {errors['location.city'] && (
            <p className="text-sm text-red-500 mt-1">{errors['location.city']}</p>
          )}
        </div>

        <div>
          <Label htmlFor="state" className="text-sm font-medium">
            State/Province
          </Label>
          <Input
            id="state"
            value={formData.location.state || ''}
            onChange={(e) => updateFormData('location.state', e.target.value)}
            placeholder="State"
          />
        </div>

        <div>
          <Label htmlFor="zipCode" className="text-sm font-medium">
            ZIP/Postal Code
          </Label>
          <Input
            id="zipCode"
            value={formData.location.zipCode || ''}
            onChange={(e) => updateFormData('location.zipCode', e.target.value)}
            placeholder="12345"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="country" className="text-sm font-medium">
          Country *
        </Label>
        <Select 
          value={formData.location.country} 
          onValueChange={(value) => updateFormData('location.country', value)}
        >
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
          <Input
            id="maxGuests"
            type="number"
            min="1"
            max="50"
            value={formData.capacity.maxGuests}
            onChange={(e) => updateFormData('capacity.maxGuests', parseInt(e.target.value))}
            className={errors['capacity.maxGuests'] ? 'border-red-500' : ''}
          />
          {errors['capacity.maxGuests'] && (
            <p className="text-sm text-red-500 mt-1">{errors['capacity.maxGuests']}</p>
          )}
        </div>

        <div>
          <Label htmlFor="bedrooms" className="text-sm font-medium">
            Bedrooms
          </Label>
          <Input
            id="bedrooms"
            type="number"
            min="0"
            max="20"
            value={formData.capacity.bedrooms}
            onChange={(e) => updateFormData('capacity.bedrooms', parseInt(e.target.value))}
          />
        </div>

        <div>
          <Label htmlFor="bathrooms" className="text-sm font-medium">
            Bathrooms
          </Label>
          <Input
            id="bathrooms"
            type="number"
            min="0.5"
            max="20"
            step="0.5"
            value={formData.capacity.bathrooms}
            onChange={(e) => updateFormData('capacity.bathrooms', parseFloat(e.target.value))}
          />
        </div>

        <div>
          <Label htmlFor="beds" className="text-sm font-medium">
            Beds
          </Label>
          <Input
            id="beds"
            type="number"
            min="1"
            max="50"
            value={formData.capacity.beds || formData.capacity.bedrooms}
            onChange={(e) => updateFormData('capacity.beds', parseInt(e.target.value))}
          />
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
            <Input
              id="basePrice"
              type="number"
              min="1"
              max="10000"
              value={formData.pricing.basePrice}
              onChange={(e) => updateFormData('pricing.basePrice', parseInt(e.target.value))}
              className={`pl-10 ${errors['pricing.basePrice'] ? 'border-red-500' : ''}`}
            />
          </div>
          {errors['pricing.basePrice'] && (
            <p className="text-sm text-red-500 mt-1">{errors['pricing.basePrice']}</p>
          )}
        </div>

        <div>
          <Label htmlFor="currency" className="text-sm font-medium">
            Currency
          </Label>
          <Select 
            value={formData.pricing.currency || 'USD'} 
            onValueChange={(value) => updateFormData('pricing.currency', value)}
          >
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
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="cleaningFee" className="text-sm font-medium">
            Cleaning Fee
          </Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              id="cleaningFee"
              type="number"
              min="0"
              max="1000"
              value={formData.pricing.cleaningFee || 0}
              onChange={(e) => updateFormData('pricing.cleaningFee', parseInt(e.target.value))}
              className="pl-10"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="securityDeposit" className="text-sm font-medium">
            Security Deposit
          </Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              id="securityDeposit"
              type="number"
              min="0"
              max="5000"
              value={formData.pricing.securityDeposit || 0}
              onChange={(e) => updateFormData('pricing.securityDeposit', parseInt(e.target.value))}
              className="pl-10"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderPhotos = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Property Photos</Label>
        <div className="text-sm text-gray-500">
          {existingImages.length + newImages.length} photos total
        </div>
      </div>

      {/* Existing Images */}
      {existingImages.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-3">Current Photos</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {existingImages.map((image, index) => (
              <div key={image.id} className="relative group">
                <img
                  src={image.url}
                  alt={image.altText || `Property photo ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg"
                />
                
                {image.isMain && (
                  <Badge className="absolute top-2 left-2 bg-blue-600">
                    Main Photo
                  </Badge>
                )}

                <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center space-x-2">
                  {!image.isMain && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => handleSetMainImage(image.id)}
                    >
                      Set Main
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteExistingImage(image.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Images */}
      {newImages.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-3 text-green-600">
            New Photos ({newImages.length}) - Will be added on save
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {newImages.map((file, index) => (
              <div key={index} className="relative group">
                <img
                  src={URL.createObjectURL(file)}
                  alt={`New upload ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg"
                />
                <Badge className="absolute top-2 left-2 bg-green-600">
                  New
                </Badge>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleRemoveNewImage(index)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload new images */}
      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Add more photos to your property
        </p>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageUpload}
          className="hidden"
          id="photo-upload-edit"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => document.getElementById('photo-upload-edit')?.click()}
        >
          <Camera className="w-4 h-4 mr-2" />
          Choose Photos
        </Button>
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
            <Switch
              checked={formData.featured || false}
              onCheckedChange={(value) => updateFormData('featured', value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Instant Book</Label>
              <p className="text-sm text-gray-500">Allow guests to book immediately without approval</p>
            </div>
            <Switch
              checked={formData.instantBook || false}
              onCheckedChange={(value) => updateFormData('instantBook', value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Verified Property</Label>
              <p className="text-sm text-gray-500">Mark property as verified by admin</p>
            </div>
            <Switch
              checked={formData.verified || false}
              onCheckedChange={(value) => updateFormData('verified', value)}
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
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Edit Property</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Editing: {property.title}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={isDirty ? "secondary" : "outline"}>
            {isDirty ? "Modified" : "Saved"}
          </Badge>
          <Badge variant={property.status === 'active' ? "default" : "secondary"}>
            {property.status}
          </Badge>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="location">Location</TabsTrigger>
            <TabsTrigger value="capacity">Capacity</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="photos">Photos</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
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

            <TabsContent value="photos">
              <Card>
                <CardHeader>
                  <CardTitle>Photo Management</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingImages ? (
                    <div className="flex items-center justify-center h-32">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <CheckCircle className="w-6 h-6" />
                      </motion.div>
                    </div>
                  ) : (
                    renderPhotos()
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle>Property Settings</CardTitle>
                </CardHeader>
                <CardContent>{renderSettings()}</CardContent>
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
          <div className="flex items-center space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            
            {isDirty && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setFormData({ ...property });
                  setIsDirty(false);
                  setErrors({});
                }}
                disabled={isSubmitting}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset Changes
              </Button>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-sm text-gray-500">
              {Object.keys(errors).length > 0 && (
                <span className="text-red-500">
                  {Object.keys(errors).length} error(s) to fix
                </span>
              )}
              {isDirty && (
                <span className="text-blue-600 ml-2">
                  Unsaved changes
                </span>
              )}
            </div>
            
            <Button
              type="submit"
              disabled={isSubmitting || !isDirty || Object.keys(errors).length > 0}
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
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};