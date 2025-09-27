/**
 * Payment Service for TouriQuest API
 * 
 * Features:
 * - Secure payment processing with Stripe and PayPal
 * - Payment method management
 * - Currency conversion and multi-currency support
 * - Payment history and transaction tracking
 * - Refund processing and management
 * - Subscription and recurring payment support
 * - Payment analytics and reporting
 */

import { ApiClient } from '../core/ApiClient';
import {
  PaymentMethod,
  PaymentRequest,
  PaymentTransaction,
  PaymentHistory,
  CurrencyRate,
  StripePaymentIntent,
  PayPalPayment,
  PaymentRefund,
  Subscription,
  SubscriptionPlan,
  PaymentReceipt
} from '../../types/payment-types';

export interface ProcessPaymentRequest {
  bookingId: string;
  paymentMethodId: string;
  amount: number;
  currency: string;
  savePaymentMethod?: boolean;
  billingAddress?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  metadata?: Record<string, any>;
}

export interface StripePaymentRequest {
  amount: number;
  currency: string;
  paymentMethodId?: string;
  confirmationMethod?: 'automatic' | 'manual';
  captureMethod?: 'automatic' | 'manual';
  setupFutureUsage?: 'on_session' | 'off_session';
  metadata?: Record<string, any>;
}

export interface PayPalPaymentRequest {
  amount: number;
  currency: string;
  description?: string;
  returnUrl: string;
  cancelUrl: string;
  metadata?: Record<string, any>;
}

export interface RefundRequest {
  transactionId: string;
  amount?: number;
  reason: string;
  refundMethod?: 'original' | 'credit';
  metadata?: Record<string, any>;
}

export interface CurrencyConversionRequest {
  from: string;
  to: string;
  amount: number;
}

export interface CurrencyConversionResponse {
  from: string;
  to: string;
  amount: number;
  convertedAmount: number;
  rate: number;
  timestamp: string;
}

export interface SubscriptionRequest {
  planId: string;
  paymentMethodId: string;
  trialDays?: number;
  couponCode?: string;
  metadata?: Record<string, any>;
}

export interface PaymentFilters {
  status?: string[];
  type?: string[];
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  currency?: string;
  paymentMethodId?: string;
  sort?: 'newest' | 'oldest' | 'amount_asc' | 'amount_desc';
  page?: number;
  limit?: number;
}

export class PaymentService {
  private client: ApiClient;

  constructor(client: ApiClient) {
    this.client = client;
  }

  // Payment Processing
  async processPayment(bookingId: string, request: ProcessPaymentRequest) {
    return this.client.post<PaymentTransaction>(`/bookings/${bookingId}/payment`, request);
  }

  async getPaymentStatus(bookingId: string, transactionId: string) {
    return this.client.get<PaymentTransaction>(`/bookings/${bookingId}/payment/${transactionId}`);
  }

  // Stripe Integration
  async createStripePaymentIntent(request: StripePaymentRequest) {
    return this.client.post<StripePaymentIntent>('/integrations/payment/stripe', request);
  }

  async confirmStripePayment(paymentIntentId: string, paymentMethodId?: string) {
    return this.client.post<StripePaymentIntent>(`/integrations/payment/stripe/${paymentIntentId}/confirm`, {
      paymentMethodId
    });
  }

  async retrieveStripePaymentIntent(paymentIntentId: string) {
    return this.client.get<StripePaymentIntent>(`/integrations/payment/stripe/${paymentIntentId}`);
  }

  // PayPal Integration
  async createPayPalPayment(request: PayPalPaymentRequest) {
    return this.client.post<PayPalPayment>('/integrations/payment/paypal', request);
  }

  async executePayPalPayment(paymentId: string, payerId: string) {
    return this.client.post<PaymentTransaction>(`/integrations/payment/paypal/${paymentId}/execute`, {
      payerId
    });
  }

  async getPayPalPaymentDetails(paymentId: string) {
    return this.client.get<PayPalPayment>(`/integrations/payment/paypal/${paymentId}`);
  }

  // Currency Conversion
  async getCurrencyRates(baseCurrency?: string) {
    const params = baseCurrency ? { base: baseCurrency } : undefined;
    return this.client.get<Record<string, CurrencyRate>>('/integrations/currency/rates', { params });
  }

  async convertCurrency(request: CurrencyConversionRequest) {
    return this.client.post<CurrencyConversionResponse>('/integrations/currency/convert', request);
  }

  async getSupportedCurrencies() {
    return this.client.get<string[]>('/integrations/currency/supported');
  }

  // Payment Method Management
  async getPaymentMethods() {
    return this.client.get<PaymentMethod[]>('/payment/methods');
  }

  async addPaymentMethod(paymentMethod: Omit<PaymentMethod, 'id' | 'createdAt'>) {
    return this.client.post<PaymentMethod>('/payment/methods', paymentMethod);
  }

  async updatePaymentMethod(id: string, updates: Partial<PaymentMethod>) {
    return this.client.put<PaymentMethod>(`/payment/methods/${id}`, updates);
  }

  async deletePaymentMethod(id: string) {
    return this.client.delete(`/payment/methods/${id}`);
  }

  async setDefaultPaymentMethod(id: string) {
    return this.client.post<PaymentMethod>(`/payment/methods/${id}/set-default`);
  }

  async verifyPaymentMethod(id: string, verificationData: any) {
    return this.client.post<PaymentMethod>(`/payment/methods/${id}/verify`, verificationData);
  }

  // Payment History and Transactions
  async getPaymentHistory(filters?: PaymentFilters) {
    return this.client.get<PaymentHistory>('/payment/history', { params: filters });
  }

  async getTransaction(transactionId: string) {
    return this.client.get<PaymentTransaction>(`/payment/transactions/${transactionId}`);
  }

  async getTransactions(filters?: PaymentFilters) {
    return this.client.get<PaymentTransaction[]>('/payment/transactions', { params: filters });
  }

  async downloadReceipt(transactionId: string) {
    return this.client.get<Blob>(`/payment/transactions/${transactionId}/receipt`, {
      responseType: 'blob'
    });
  }

  async getPaymentReceipt(transactionId: string) {
    return this.client.get<PaymentReceipt>(`/payment/transactions/${transactionId}/receipt-data`);
  }

  // Refund Processing
  async requestRefund(request: RefundRequest) {
    return this.client.post<PaymentRefund>('/payment/refunds', request);
  }

  async getRefund(refundId: string) {
    return this.client.get<PaymentRefund>(`/payment/refunds/${refundId}`);
  }

  async getRefunds(transactionId?: string) {
    const params = transactionId ? { transactionId } : undefined;
    return this.client.get<PaymentRefund[]>('/payment/refunds', { params });
  }

  // Subscription Management
  async getSubscriptionPlans() {
    return this.client.get<SubscriptionPlan[]>('/payment/subscriptions/plans');
  }

  async createSubscription(request: SubscriptionRequest) {
    return this.client.post<Subscription>('/payment/subscriptions', request);
  }

  async getSubscription(subscriptionId: string) {
    return this.client.get<Subscription>(`/payment/subscriptions/${subscriptionId}`);
  }

  async getUserSubscriptions() {
    return this.client.get<Subscription[]>('/payment/subscriptions');
  }

  async updateSubscription(subscriptionId: string, updates: Partial<Subscription>) {
    return this.client.put<Subscription>(`/payment/subscriptions/${subscriptionId}`, updates);
  }

  async cancelSubscription(subscriptionId: string, cancelAtPeriodEnd = true) {
    return this.client.post<Subscription>(`/payment/subscriptions/${subscriptionId}/cancel`, {
      cancelAtPeriodEnd
    });
  }

  async resumeSubscription(subscriptionId: string) {
    return this.client.post<Subscription>(`/payment/subscriptions/${subscriptionId}/resume`);
  }

  async changeSubscriptionPlan(subscriptionId: string, planId: string, prorationBehavior = 'create_prorations') {
    return this.client.post<Subscription>(`/payment/subscriptions/${subscriptionId}/change-plan`, {
      planId,
      prorationBehavior
    });
  }

  // Payment Analytics and Reporting
  async getPaymentAnalytics(startDate?: string, endDate?: string) {
    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    
    return this.client.get('/payment/analytics', { params });
  }

  async getPaymentMetrics() {
    return this.client.get('/payment/metrics');
  }

  // Payment Security and Fraud Prevention
  async validatePaymentSecurity(paymentData: any) {
    return this.client.post('/payment/security/validate', paymentData);
  }

  async reportSuspiciousActivity(transactionId: string, reason: string) {
    return this.client.post(`/payment/security/report/${transactionId}`, { reason });
  }

  // Webhooks and Notifications
  async getPaymentNotifications() {
    return this.client.get('/payment/notifications');
  }

  async markNotificationAsRead(notificationId: string) {
    return this.client.put(`/payment/notifications/${notificationId}/read`);
  }

  // Payment Configuration
  async getPaymentConfig() {
    return this.client.get('/payment/config');
  }

  async updatePaymentConfig(config: any) {
    return this.client.put('/payment/config', config);
  }

  // Utility Methods
  async validateCard(cardNumber: string) {
    return this.client.post('/payment/validate/card', { cardNumber });
  }

  async getBankInfo(routingNumber: string) {
    return this.client.get(`/payment/banks/${routingNumber}`);
  }

  async getPaymentFees(amount: number, currency: string, paymentMethod: string) {
    return this.client.get('/payment/fees', {
      params: { amount, currency, paymentMethod }
    });
  }

  // Test and Development
  async createTestTransaction(amount: number, currency = 'USD') {
    return this.client.post('/payment/test/transaction', { amount, currency });
  }

  async simulatePaymentFailure(reason: string) {
    return this.client.post('/payment/test/failure', { reason });
  }
}