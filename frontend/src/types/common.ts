// Common interfaces used across all services
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  timestamp: string;
  requestId: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
  path: string;
  method: string;
}

export interface SearchFilters {
  q?: string;
  location?: string;
  lat?: number;
  lng?: number;
  radius?: number;
  category?: string;
  priceMin?: number;
  priceMax?: number;
  rating?: number;
  sortBy?: 'relevance' | 'price' | 'rating' | 'distance' | 'popularity';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Address {
  street?: string;
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
  coordinates?: Coordinates;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  title?: string;
  comment: string;
  pros?: string[];
  cons?: string[];
  photos?: string[];
  verified: boolean;
  helpful: number;
  createdAt: string;
  updatedAt: string;
}

export interface Media {
  id: string;
  url: string;
  type: 'image' | 'video' | 'audio' | 'document';
  title?: string;
  description?: string;
  size: number;
  mimeType: string;
  thumbnail?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'booking' | 'system';
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  expiresAt?: string;
}

export interface WeatherInfo {
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  forecast: Array<{
    date: string;
    temperature: { min: number; max: number };
    condition: string;
    precipitation: number;
  }>;
}

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  rate: number;
}

export interface Price {
  amount: number;
  currency: string;
  formatted: string;
  originalAmount?: number;
  originalCurrency?: string;
}

export type LoadingState = 'idle' | 'loading' | 'succeeded' | 'failed';

export interface AsyncState<T> {
  data: T | null;
  loading: LoadingState;
  error: string | null;
  lastFetch?: string;
}