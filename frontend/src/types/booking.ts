import { ApiResponse, PaginatedResponse, Price } from './common';

// Booking Types
export interface Booking {
  id: string;
  userId: string;
  type: 'property' | 'experience';
  itemId: string;
  itemName: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'refunded';
  confirmationCode: string;
  bookingDate: string;
  startDate: string;
  endDate: string;
  guests: {
    adults: number;
    children: number;
    infants?: number;
  };
  totalPrice: Price;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentMethod: string;
  guestInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  specialRequests?: string;
  cancellationPolicy: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookingRequest {
  type: 'property' | 'experience';
  itemId: string;
  startDate: string;
  endDate: string;
  guests: Booking['guests'];
  guestInfo: Booking['guestInfo'];
  specialRequests?: string;
  paymentMethodId: string;
  promoCode?: string;
}

export interface PaymentRequest {
  bookingId: string;
  paymentMethodId: string;
  amount: number;
  currency: string;
  savePaymentMethod?: boolean;
}

export interface RefundRequest {
  bookingId: string;
  amount?: number;
  reason: string;
  refundMethod?: 'original' | 'credit';
}

export interface BookingModification {
  bookingId: string;
  newStartDate?: string;
  newEndDate?: string;
  newGuests?: Booking['guests'];
  newSpecialRequests?: string;
}

export interface BookingAnalytics {
  totalBookings: number;
  totalRevenue: Price;
  conversionRate: number;
  averageBookingValue: Price;
  cancellationRate: number;
  trends: {
    bookings: Array<{ date: string; count: number; revenue: number }>;
    cancellations: Array<{ date: string; count: number; reason: string }>;
  };
}

// API Response Types
export type BookingsResponse = ApiResponse<PaginatedResponse<Booking>>;
export type BookingDetailsResponse = ApiResponse<Booking>;
export type CreateBookingResponse = ApiResponse<{ booking: Booking; paymentRequired: boolean }>;
export type BookingPaymentResponse = ApiResponse<{ paymentIntent: string; clientSecret: string }>;
export type BookingInvoiceResponse = ApiResponse<{ invoiceUrl: string; invoiceData: any }>;
export type BookingAnalyticsResponse = ApiResponse<BookingAnalytics>;