/**
 * Booking Service for TouriQuest API
 * 
 * Features:
 * - Complete booking lifecycle management
 * - Payment processing integration
 * - Booking modifications and cancellations
 * - Review and rating system
 * - Booking analytics and reporting
 */

import { ApiClient } from '../core/ApiClient';

export interface Booking {
  id: string;
  userId: string;
  propertyId?: string;
  experienceId?: string;
  type: 'property' | 'experience';
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'refunded';
  checkIn: string;
  checkOut: string;
  guests: number;
  totalAmount: number;
  currency: string;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  cancellationPolicy: string;
  specialRequests?: string;
  createdAt: string;
  updatedAt: string;
  host?: {
    id: string;
    name: string;
    avatar: string;
    responseRate: number;
    responseTime: string;
  };
  property?: {
    id: string;
    title: string;
    images: string[];
    address: string;
  };
  experience?: {
    id: string;
    title: string;
    images: string[];
    duration: number;
  };
}

export interface BookingRequest {
  propertyId?: string;
  experienceId?: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  specialRequests?: string;
  guestInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  paymentMethodId: string;
}

export interface BookingModification {
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  specialRequests?: string;
}

export interface BookingFilters {
  status?: string[];
  type?: 'property' | 'experience';
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  sort?: 'newest' | 'oldest' | 'amount_asc' | 'amount_desc';
  page?: number;
  limit?: number;
}

export interface BookingInvoice {
  id: string;
  bookingId: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  taxes: number;
  total: number;
  currency: string;
  paymentMethod: string;
  paymentDate?: string;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface BookingReview {
  id: string;
  bookingId: string;
  rating: number;
  comment: string;
  photos?: string[];
  categories: {
    cleanliness: number;
    accuracy: number;
    communication: number;
    location: number;
    checkIn: number;
    value: number;
  };
  wouldRecommend: boolean;
  createdAt: string;
}

export interface PaymentRequest {
  bookingId: string;
  paymentMethodId: string;
  amount?: number;
  currency?: string;
}

export interface PaymentResponse {
  success: boolean;
  transactionId: string;
  amount: number;
  currency: string;
  status: string;
  receipt?: string;
}

export interface RefundRequest {
  bookingId: string;
  reason: string;
  amount?: number;
  refundPolicy: 'full' | 'partial' | 'none';
}

export interface BookingAnalytics {
  totalBookings: number;
  totalRevenue: number;
  averageBookingValue: number;
  cancellationRate: number;
  conversionRate: number;
  popularDestinations: Array<{
    location: string;
    bookings: number;
    revenue: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    bookings: number;
    revenue: number;
  }>;
}

export class BookingService {
  constructor(private apiClient: ApiClient) {}

  /**
   * Get user bookings
   */
  async getUserBookings(filters?: BookingFilters): Promise<{
    bookings: Booking[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const response = await this.apiClient.get<{
      bookings: Booking[];
      total: number;
      page: number;
      totalPages: number;
    }>('/bookings/', {
      params: filters,
    });
    return response.data;
  }

  /**
   * Create new booking
   */
  async createBooking(request: BookingRequest): Promise<Booking> {
    const response = await this.apiClient.post<Booking>('/bookings/', request);
    return response.data;
  }

  /**
   * Get booking details
   */
  async getBookingById(bookingId: string): Promise<Booking> {
    const response = await this.apiClient.get<Booking>(`/bookings/${bookingId}`);
    return response.data;
  }

  /**
   * Update booking
   */
  async updateBooking(
    bookingId: string,
    modifications: BookingModification
  ): Promise<Booking> {
    const response = await this.apiClient.put<Booking>(`/bookings/${bookingId}`, modifications);
    return response.data;
  }

  /**
   * Cancel booking
   */
  async cancelBooking(bookingId: string, reason?: string): Promise<void> {
    await this.apiClient.delete(`/bookings/${bookingId}`, {
      data: { reason },
    });
  }

  /**
   * Get upcoming bookings
   */
  async getUpcomingBookings(): Promise<Booking[]> {
    const response = await this.apiClient.get<Booking[]>('/bookings/upcoming');
    return response.data;
  }

  /**
   * Get past bookings
   */
  async getPastBookings(page?: number, limit?: number): Promise<{
    bookings: Booking[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const response = await this.apiClient.get<{
      bookings: Booking[];
      total: number;
      page: number;
      totalPages: number;
    }>('/bookings/past', {
      params: { page, limit },
    });
    return response.data;
  }

  /**
   * Payment processing
   */
  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    const response = await this.apiClient.post<PaymentResponse>(`/bookings/${request.bookingId}/payment`, request);
    return response.data;
  }

  /**
   * Get booking invoice
   */
  async getBookingInvoice(bookingId: string): Promise<BookingInvoice> {
    const response = await this.apiClient.get<BookingInvoice>(`/bookings/${bookingId}/invoice`);
    return response.data;
  }

  /**
   * Download invoice as PDF
   */
  async downloadInvoice(bookingId: string): Promise<Blob> {
    const response = await this.apiClient.get<Blob>(`/bookings/${bookingId}/invoice`, {
      responseType: 'blob',
      headers: {
        'Accept': 'application/pdf',
      },
    });
    return response.data;
  }

  /**
   * Submit booking review
   */
  async submitReview(
    bookingId: string,
    review: Omit<BookingReview, 'id' | 'bookingId' | 'createdAt'>
  ): Promise<BookingReview> {
    const response = await this.apiClient.post<BookingReview>(`/bookings/${bookingId}/review`, review);
    return response.data;
  }

  /**
   * Get booking status
   */
  async getBookingStatus(bookingId: string): Promise<{
    status: string;
    statusHistory: Array<{
      status: string;
      timestamp: string;
      note?: string;
    }>;
  }> {
    const response = await this.apiClient.get<{
      status: string;
      statusHistory: Array<{
        status: string;
        timestamp: string;
        note?: string;
      }>;
    }>(`/bookings/${bookingId}/status`);
    return response.data;
  }

  /**
   * Update booking status (admin)
   */
  async updateBookingStatus(
    bookingId: string,
    status: string,
    note?: string
  ): Promise<void> {
    await this.apiClient.put(`/bookings/${bookingId}/status`, {
      status,
      note,
    });
  }

  /**
   * Get booking history
   */
  async getBookingHistory(
    filters?: {
      userId?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{
    bookings: Booking[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const response = await this.apiClient.get<{
      bookings: Booking[];
      total: number;
      page: number;
      totalPages: number;
    }>('/bookings/history', {
      params: filters,
    });
    return response.data;
  }

  /**
   * Process refund (admin)
   */
  async processRefund(request: RefundRequest): Promise<{
    success: boolean;
    refundId: string;
    amount: number;
    status: string;
  }> {
    const response = await this.apiClient.post<{
      success: boolean;
      refundId: string;
      amount: number;
      status: string;
    }>(`/bookings/${request.bookingId}/refund`, request);
    return response.data;
  }

  /**
   * Modify booking
   */
  async modifyBooking(
    bookingId: string,
    modifications: BookingModification
  ): Promise<{
    booking: Booking;
    additionalCost: number;
    refundAmount: number;
  }> {
    const response = await this.apiClient.post<{
      booking: Booking;
      additionalCost: number;
      refundAmount: number;
    }>(`/bookings/${bookingId}/modify`, modifications);
    return response.data;
  }

  /**
   * Get booking analytics (admin)
   */
  async getBookingAnalytics(
    filters?: {
      startDate?: string;
      endDate?: string;
      propertyId?: string;
      experienceId?: string;
    }
  ): Promise<BookingAnalytics> {
    const response = await this.apiClient.get<BookingAnalytics>('/bookings/analytics', {
      params: filters,
    });
    return response.data;
  }

  /**
   * Get cancellation policies
   */
  async getCancellationPolicies(): Promise<Array<{
    id: string;
    name: string;
    description: string;
    terms: string[];
  }>> {
    const response = await this.apiClient.get<Array<{
      id: string;
      name: string;
      description: string;
      terms: string[];
    }>>('/bookings/cancellation-policies');
    return response.data;
  }

  /**
   * Calculate cancellation fee
   */
  async calculateCancellationFee(
    bookingId: string,
    cancellationDate?: string
  ): Promise<{
    refundAmount: number;
    cancellationFee: number;
    policy: string;
    deadlines: Array<{
      date: string;
      refundPercentage: number;
    }>;
  }> {
    const response = await this.apiClient.get<{
      refundAmount: number;
      cancellationFee: number;
      policy: string;
      deadlines: Array<{
        date: string;
        refundPercentage: number;
      }>;
    }>(`/bookings/${bookingId}/cancellation-fee`, {
      params: { cancellationDate },
    });
    return response.data;
  }
}