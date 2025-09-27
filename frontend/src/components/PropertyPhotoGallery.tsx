/**
 * PropertyPhotoGallery - Interactive photo gallery for property images
 * Fetches photos from GET /api/v1/properties/{id}/photos
 */

import React, { useState, useEffect } from 'react';
import { propertyService } from '../services/propertyService';
import { MediaFile } from '../types/api-types';
import { Button } from './ui/button';
import { Dialog, DialogContent } from './ui/dialog';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Maximize2,
  Grid3x3,
  Play,
  Pause,
  Image as ImageIcon
} from 'lucide-react';

interface PropertyPhotoGalleryProps {
  propertyId: string;
  className?: string;
}

export const PropertyPhotoGallery: React.FC<PropertyPhotoGalleryProps> = ({
  propertyId,
  className
}) => {
  const [photos, setPhotos] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isSlideshow, setIsSlideshow] = useState(false);
  const [slideshowInterval, setSlideshowInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchPhotos();
  }, [propertyId]);

  useEffect(() => {
    if (isSlideshow && lightboxOpen) {
      const interval = setInterval(() => {
        setCurrentPhotoIndex(prev => 
          prev === photos.length - 1 ? 0 : prev + 1
        );
      }, 3000);
      setSlideshowInterval(interval);
      
      return () => clearInterval(interval);
    } else if (slideshowInterval) {
      clearInterval(slideshowInterval);
      setSlideshowInterval(null);
    }
  }, [isSlideshow, lightboxOpen, photos.length]);

  const fetchPhotos = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await propertyService.getPropertyPhotos(propertyId);
      setPhotos(response.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch photos');
      // Fallback to mock data for development
      setPhotos([
        {
          id: '1',
          url: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800',
          filename: 'main-view.jpg',
          mimeType: 'image/jpeg',
          size: 1024000,
          uploadedAt: new Date().toISOString(),
          metadata: { alt: 'Main property view' }
        },
        {
          id: '2',
          url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800',
          filename: 'living-room.jpg',
          mimeType: 'image/jpeg',
          size: 896000,
          uploadedAt: new Date().toISOString(),
          metadata: { alt: 'Living room' }
        },
        {
          id: '3',
          url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
          filename: 'bedroom.jpg',
          mimeType: 'image/jpeg',
          size: 1156000,
          uploadedAt: new Date().toISOString(),
          metadata: { alt: 'Bedroom' }
        },
        {
          id: '4',
          url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800',
          filename: 'kitchen.jpg',
          mimeType: 'image/jpeg',
          size: 987000,
          uploadedAt: new Date().toISOString(),
          metadata: { alt: 'Kitchen' }
        },
        {
          id: '5',
          url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800',
          filename: 'bathroom.jpg',
          mimeType: 'image/jpeg',
          size: 756000,
          uploadedAt: new Date().toISOString(),
          metadata: { alt: 'Bathroom' }
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const openLightbox = (index: number) => {
    setCurrentPhotoIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    setIsSlideshow(false);
  };

  const nextPhoto = () => {
    setCurrentPhotoIndex(prev => 
      prev === photos.length - 1 ? 0 : prev + 1
    );
  };

  const prevPhoto = () => {
    setCurrentPhotoIndex(prev => 
      prev === 0 ? photos.length - 1 : prev - 1
    );
  };

  const toggleSlideshow = () => {
    setIsSlideshow(prev => !prev);
  };

  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="grid grid-cols-4 gap-2 h-96">
          <div className="col-span-2 row-span-2 bg-gray-200 rounded-lg animate-pulse"></div>
          <div className="bg-gray-200 rounded-lg animate-pulse"></div>
          <div className="bg-gray-200 rounded-lg animate-pulse"></div>
          <div className="bg-gray-200 rounded-lg animate-pulse"></div>
          <div className="bg-gray-200 rounded-lg animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className}`}>
        <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-muted-foreground">Failed to load photos</p>
          </div>
        </div>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className={`${className}`}>
        <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-muted-foreground">No photos available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* Main Gallery Grid */}
      <div className="grid grid-cols-4 gap-2 h-96 rounded-lg overflow-hidden">
        {/* Main Photo */}
        <div
          className="col-span-2 row-span-2 relative cursor-pointer group"
          onClick={() => openLightbox(0)}
        >
          <img
            src={photos[0]?.url}
            alt={photos[0]?.metadata?.alt || 'Property photo'}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity" />
          <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button size="sm" variant="secondary">
              <Maximize2 className="w-4 h-4 mr-1" />
              View
            </Button>
          </div>
        </div>

        {/* Secondary Photos */}
        {photos.slice(1, 5).map((photo, index) => (
          <div
            key={photo.id}
            className="relative cursor-pointer group"
            onClick={() => openLightbox(index + 1)}
          >
            <img
              src={photo.url}
              alt={photo.metadata?.alt || `Property photo ${index + 2}`}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity" />
            
            {/* Show "All Photos" on last visible photo if there are more */}
            {index === 3 && photos.length > 5 && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <Button variant="secondary" size="sm">
                  <Grid3x3 className="w-4 h-4 mr-2" />
                  +{photos.length - 5} photos
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Show All Photos Button */}
      {photos.length > 5 && (
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => openLightbox(0)}
        >
          <Grid3x3 className="w-4 h-4 mr-2" />
          Show all {photos.length} photos
        </Button>
      )}

      {/* Lightbox Modal */}
      <Dialog open={lightboxOpen} onOpenChange={closeLightbox}>
        <DialogContent className="max-w-6xl w-full h-[90vh] p-0">
          <div className="relative w-full h-full bg-black">
            {/* Close Button */}
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-4 right-4 z-10 text-white hover:bg-white hover:bg-opacity-20"
              onClick={closeLightbox}
            >
              <X className="w-6 h-6" />
            </Button>

            {/* Slideshow Controls */}
            <div className="absolute top-4 left-4 z-10 flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white hover:bg-opacity-20"
                onClick={toggleSlideshow}
              >
                {isSlideshow ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </Button>
              <span className="text-white text-sm">
                {currentPhotoIndex + 1} / {photos.length}
              </span>
            </div>

            {/* Main Image */}
            <div className="w-full h-full flex items-center justify-center p-8">
              <img
                src={photos[currentPhotoIndex]?.url}
                alt={photos[currentPhotoIndex]?.metadata?.alt || 'Property photo'}
                className="max-w-full max-h-full object-contain"
              />
            </div>

            {/* Navigation Buttons */}
            {photos.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:bg-white hover:bg-opacity-20"
                  onClick={prevPhoto}
                >
                  <ChevronLeft className="w-8 h-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:bg-white hover:bg-opacity-20"
                  onClick={nextPhoto}
                >
                  <ChevronRight className="w-8 h-8" />
                </Button>
              </>
            )}

            {/* Thumbnail Strip */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 max-w-4xl overflow-x-auto">
              {photos.map((photo, index) => (
                <div
                  key={photo.id}
                  className={`flex-shrink-0 w-16 h-12 cursor-pointer border-2 rounded ${
                    index === currentPhotoIndex ? 'border-white' : 'border-transparent'
                  }`}
                  onClick={() => setCurrentPhotoIndex(index)}
                >
                  <img
                    src={photo.url}
                    alt={photo.metadata?.alt || `Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover rounded"
                  />
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PropertyPhotoGallery;