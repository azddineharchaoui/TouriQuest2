import { ApiResponse, Media } from './common';

// Media Service Types
export interface MediaFile extends Media {
  tags: string[];
  album?: string;
  isPublic: boolean;
  uploadedBy: string;
  usage: Array<{
    type: 'property' | 'poi' | 'experience' | 'user_profile';
    itemId: string;
    context: string;
  }>;
}

export interface MediaUploadRequest {
  file: File;
  title?: string;
  description?: string;
  tags?: string[];
  album?: string;
  isPublic?: boolean;
}

export interface MediaProcessingOptions {
  resize?: {
    width: number;
    height: number;
    quality?: number;
  };
  compress?: {
    quality: number;
    format?: 'jpeg' | 'webp' | 'png';
  };
  watermark?: {
    text: string;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    opacity: number;
  };
}

export interface MediaGallery {
  id: string;
  name: string;
  description?: string;
  coverImage?: string;
  mediaFiles: MediaFile[];
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StorageUsage {
  totalUsed: number;
  totalLimit: number;
  breakdown: {
    images: number;
    videos: number;
    documents: number;
    other: number;
  };
  percentageUsed: number;
}

// API Response Types
export type MediaUploadResponse = ApiResponse<MediaFile>;
export type MediaGalleryResponse = ApiResponse<MediaGallery>;
export type StorageUsageResponse = ApiResponse<StorageUsage>;