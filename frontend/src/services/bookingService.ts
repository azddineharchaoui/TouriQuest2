/**
 * Booking Service - Comprehensive booking management API integration
 * Handles all booking operations including CRUD, payments, reviews, and notifications
 */

import { apiClient } from './api';
import { 
  Booking, 
  BookingRequest, 
  BookingModification, 
  BookingReview, 
  BookingInvoice,
  BookingStatus,
  BookingFilter,
  BookingAnalytics,
  NotificationPreferences
} from '../types/booking-types';
import { ApiResponse, PaginatedResponse } from '../types/api-types';

export class BookingService {
  private static instance: BookingService;
  private baseUrl = '/bookings';

  static getInstance(): BookingService {
    if (!BookingService.instance) {
      BookingService.instance = new BookingService();
    }
    return BookingService.instance;
  }

  // 1. Get all user bookings with filtering and pagination
  async getUserBookings(
    page: number = 1,
    limit: number = 10,
    filters?: BookingFilter
  ): Promise<ApiResponse<PaginatedResponse<Booking>>> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(filters && Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== undefined)
        ))
      });

      const response = await apiClient.get(`${this.baseUrl}?${params}`);
      return {
        success: true,
        data: response.data,
        message: 'Bookings retrieved successfully'
      };
    } catch (error) {
      console.error('Error fetching user bookings:', error);
      throw this.handleApiError(error, 'Failed to fetch bookings');
    }
  }

  // 2. Get upcoming bookings
  async getUpcomingBookings(
    page: number = 1,
    limit: number = 10
  ): Promise<ApiResponse<PaginatedResponse<Booking>>> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });

      const response = await apiClient.get(`${this.baseUrl}/upcoming?${params}`);
      return {
        success: true,
        data: response.data,
        message: 'Upcoming bookings retrieved successfully'
      };
    } catch (error) {
      console.error('Error fetching upcoming bookings:', error);
      throw this.handleApiError(error, 'Failed to fetch upcoming bookings');
    }
  }

  // 3. Get booking history (past bookings)
  async getBookingHistory(
    page: number = 1,
    limit: number = 10,
    filters?: Partial<BookingFilter>
  ): Promise<ApiResponse<PaginatedResponse<Booking>>> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(filters && Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== undefined)
        ))
      });

      const response = await apiClient.get(`${this.baseUrl}/past?${params}`);
      return {
        success: true,
        data: response.data,
        message: 'Booking history retrieved successfully'
      };
    } catch (error) {
      console.error('Error fetching booking history:', error);
      throw this.handleApiError(error, 'Failed to fetch booking history');
    }
  }

  // 4. Get specific booking details
  async getBookingDetails(bookingId: string): Promise<ApiResponse<Booking>> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/${bookingId}`);
      return {
        success: true,
        data: response.data,
        message: 'Booking details retrieved successfully'
      };
    } catch (error) {
      console.error('Error fetching booking details:', error);
      throw this.handleApiError(error, 'Failed to fetch booking details');
    }
  }

  // 5. Create new booking
  async createBooking(bookingRequest: BookingRequest): Promise<ApiResponse<Booking>> {
    try {
      const response = await apiClient.post(this.baseUrl, bookingRequest);
      return {
        success: true,
        data: response.data,
        message: 'Booking created successfully'
      };
    } catch (error) {
      console.error('Error creating booking:', error);
      throw this.handleApiError(error, 'Failed to create booking');
    }
  }

  // 6. Modify existing booking
  async modifyBooking(
    bookingId: string, 
    modifications: BookingModification
  ): Promise<ApiResponse<Booking>> {
    try {
      const response = await apiClient.put(`${this.baseUrl}/${bookingId}`, modifications);
      return {
        success: true,
        data: response.data,
        message: 'Booking modified successfully'
      };
    } catch (error) {
      console.error('Error modifying booking:', error);
      throw this.handleApiError(error, 'Failed to modify booking');
    }
  }

  // 7. Cancel booking
  async cancelBooking(
    bookingId: string, 
    reason?: string
  ): Promise<ApiResponse<{ refundAmount: number; cancellationFee: number }>> {
    try {
      const response = await apiClient.delete(`${this.baseUrl}/${bookingId}`, {
        data: { reason }
      });
      return {
        success: true,
        data: response.data,
        message: 'Booking cancelled successfully'
      };
    } catch (error) {
      console.error('Error cancelling booking:', error);
      throw this.handleApiError(error, 'Failed to cancel booking');
    }
  }

  // 8. Download booking invoice
  async downloadInvoice(bookingId: string): Promise<ApiResponse<BookingInvoice>> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/${bookingId}/invoice`, {
        responseType: 'blob'
      });
      
      // Create download link
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `invoice-${bookingId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      return {
        success: true,
        data: { url: downloadUrl, filename: `invoice-${bookingId}.pdf` },
        message: 'Invoice downloaded successfully'
      };
    } catch (error) {
      console.error('Error downloading invoice:', error);
      throw this.handleApiError(error, 'Failed to download invoice');
    }
  }

  // 9. Submit booking review
  async submitReview(
    bookingId: string, 
    review: BookingReview
  ): Promise<ApiResponse<BookingReview>> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/${bookingId}/review`, review);
      return {
        success: true,
        data: response.data,
        message: 'Review submitted successfully'
      };
    } catch (error) {
      console.error('Error submitting review:', error);
      throw this.handleApiError(error, 'Failed to submit review');
    }
  }

  // 10. Get booking status
  async getBookingStatus(bookingId: string): Promise<ApiResponse<BookingStatus>> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/${bookingId}/status`);
      return {
        success: true,
        data: response.data,
        message: 'Booking status retrieved successfully'
      };
    } catch (error) {
      console.error('Error fetching booking status:', error);
      throw this.handleApiError(error, 'Failed to fetch booking status');
    }
  }

  // 11. Share booking
  async shareBooking(
    bookingId: string, 
    shareData: { email?: string; phone?: string; platform?: string }
  ): Promise<ApiResponse<{ shareUrl: string }>> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/${bookingId}/share`, shareData);
      return {
        success: true,
        data: response.data,
        message: 'Booking shared successfully'
      };
    } catch (error) {
      console.error('Error sharing booking:', error);
      throw this.handleApiError(error, 'Failed to share booking');
    }
  }

  // 12. Set booking reminders
  async setBookingReminders(
    bookingId: string, 
    preferences: NotificationPreferences
  ): Promise<ApiResponse<NotificationPreferences>> {
    try {
      const response = await apiClient.put(`${this.baseUrl}/${bookingId}/reminders`, preferences);
      return {
        success: true,
        data: response.data,
        message: 'Booking reminders set successfully'
      };
    } catch (error) {
      console.error('Error setting booking reminders:', error);
      throw this.handleApiError(error, 'Failed to set booking reminders');
    }
  }

  // 13. Get booking analytics (for user insights)
  async getBookingAnalytics(): Promise<ApiResponse<BookingAnalytics>> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/analytics`);
      return {
        success: true,
        data: response.data,
        message: 'Booking analytics retrieved successfully'
      };
    } catch (error) {
      console.error('Error fetching booking analytics:', error);
      throw this.handleApiError(error, 'Failed to fetch booking analytics');
    }
  }

  // 14. Process payment for booking
  async processPayment(
    bookingId: string,
    paymentData: {
      paymentMethod: string;
      amount: number;
      currency: string;
      paymentToken?: string;
    }
  ): Promise<ApiResponse<{ transactionId: string; status: string }>> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/${bookingId}/payment`, paymentData);
      return {
        success: true,
        data: response.data,
        message: 'Payment processed successfully'
      };
    } catch (error) {
      console.error('Error processing payment:', error);
      throw this.handleApiError(error, 'Failed to process payment');
    }
  }

  // 15. Request booking refund
  async requestRefund(
    bookingId: string,
    refundData: {
      reason: string;
      amount?: number;
      bankAccount?: string;
    }
  ): Promise<ApiResponse<{ refundId: string; estimatedProcessingTime: string }>> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/${bookingId}/refund`, refundData);
      return {
        success: true,
        data: response.data,
        message: 'Refund request submitted successfully'
      };
    } catch (error) {
      console.error('Error requesting refund:', error);
      throw this.handleApiError(error, 'Failed to request refund');
    }
  }

  // Helper method for error handling
  private handleApiError(error: any, defaultMessage: string) {
    const apiError = error.response?.data?.message || error.message || defaultMessage;
    return new Error(apiError);
  }

  // Utility methods
  
  // Generate shareable booking URL
  generateShareableUrl(bookingId: string): string {
    return `${window.location.origin}/bookings/${bookingId}/share`;
  }

  // Calculate booking total with fees
  calculateBookingTotal(booking: Partial<Booking>): number {
    const baseAmount = booking.totalAmount || 0;
    const taxes = booking.taxes || 0;
    const fees = booking.serviceFee || 0;
    return baseAmount + taxes + fees;
  }

  // Format booking dates for display
  formatBookingDates(checkIn: string, checkOut: string): string {
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 3600 * 24));
    
    return `${checkInDate.toLocaleDateString()} - ${checkOutDate.toLocaleDateString()} (${nights} nights)`;
  }

  // Check if booking can be cancelled
  canCancelBooking(booking: Booking): boolean {
    const now = new Date();
    const checkIn = new Date(booking.checkInDate);
    const hoursUntilCheckIn = (checkIn.getTime() - now.getTime()) / (1000 * 3600);
    
    // Can cancel if more than 24 hours before check-in and status allows cancellation
    return hoursUntilCheckIn > 24 && ['confirmed', 'pending'].includes(booking.status.toLowerCase());
  }

  // Check if booking can be modified
  canModifyBooking(booking: Booking): boolean {
    const now = new Date();
    const checkIn = new Date(booking.checkInDate);
    const hoursUntilCheckIn = (checkIn.getTime() - now.getTime()) / (1000 * 3600);
    
    // Can modify if more than 48 hours before check-in and status allows modification
    return hoursUntilCheckIn > 48 && ['confirmed'].includes(booking.status.toLowerCase());
  }

  // Get booking status color for UI
  getStatusColor(status: string): string {
    const statusColors: Record<string, string> = {
      confirmed: '#10B981', // green
      pending: '#F59E0B',   // yellow
      cancelled: '#EF4444', // red
      completed: '#6366F1', // indigo
      'in-progress': '#3B82F6', // blue
      'no-show': '#9CA3AF'  // gray
    };
    
    return statusColors[status.toLowerCase()] || '#6B7280';
  }
}

// Export singleton instance
export const bookingService = BookingService.getInstance();
export default bookingService;
