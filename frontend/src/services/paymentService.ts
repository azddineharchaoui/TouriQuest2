/**
 * PaymentService - Comprehensive payment processing service
 * Handles Stripe, PayPal, currency conversion, and payment management
 */

import api from './api';

export interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal' | 'bank_transfer' | 'apple_pay' | 'google_pay';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  holderName?: string;
  isDefault: boolean;
  createdAt: string;
  paypalEmail?: string;
  bankName?: string;
  accountNumber?: string;
}

export interface PaymentRequest {
  bookingId: string;
  amount: number;
  currency: string;
  paymentMethodId: string;
  savePaymentMethod?: boolean;
  description?: string;
  metadata?: Record<string, any>;
}

export interface StripePaymentIntent {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
  status: 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'succeeded' | 'canceled';
}

export interface PayPalPayment {
  orderId: string;
  approvalUrl: string;
  amount: number;
  currency: string;
}

export interface CurrencyRate {
  from: string;
  to: string;
  rate: number;
  lastUpdated: string;
}

export interface PaymentTransaction {
  id: string;
  bookingId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'partially_refunded';
  paymentMethod: PaymentMethod;
  createdAt: string;
  completedAt?: string;
  failureReason?: string;
  refunds: PaymentRefund[];
  fees: PaymentFee[];
  receipt?: PaymentReceipt;
}

export interface PaymentRefund {
  id: string;
  amount: number;
  currency: string;
  reason: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
}

export interface PaymentFee {
  type: 'processing' | 'platform' | 'tax';
  amount: number;
  currency: string;
  description: string;
}

export interface PaymentReceipt {
  id: string;
  transactionId: string;
  receiptUrl: string;
  receiptNumber: string;
  issuedAt: string;
  items: PaymentReceiptItem[];
}

export interface PaymentReceiptItem {
  description: string;
  amount: number;
  currency: string;
  quantity: number;
}

export interface Subscription {
  id: string;
  status: 'active' | 'inactive' | 'canceled' | 'past_due';
  planId: string;
  planName: string;
  amount: number;
  currency: string;
  interval: 'monthly' | 'yearly';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  paymentMethodId: string;
  nextPaymentDate?: string;
  trialEnd?: string;
}

export interface PaymentHistory {
  transactions: PaymentTransaction[];
  subscriptions: Subscription[];
  totalSpent: number;
  totalRefunded: number;
  averageTransactionAmount: number;
  paymentMethodsUsed: number;
}

class PaymentService {
  private api = api;

  constructor() {
    // API client is already initialized
  }

  // Payment Processing
  async processPayment(bookingId: string, paymentData: PaymentRequest): Promise<{ success: boolean; transaction?: PaymentTransaction; error?: string }> {
    try {
      const response = await this.api.post(`/bookings/${bookingId}/payment`, paymentData);
      return {
        success: response.success,
        transaction: response.data,
        error: response.message
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Payment processing failed'
      };
    }
  }

  // Stripe Integration
  async createStripePaymentIntent(bookingId: string, amount: number, currency: string): Promise<{ success: boolean; paymentIntent?: StripePaymentIntent; error?: string }> {
    try {
      const response = await this.api.post('/integrations/payment/stripe', {
        bookingId,
        amount,
        currency,
        paymentMethodTypes: ['card', 'apple_pay', 'google_pay'],
        automaticPaymentMethods: { enabled: true }
      });

      return {
        success: response.success,
        paymentIntent: response.data,
        error: response.message
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Stripe payment intent creation failed'
      };
    }
  }

  async confirmStripePayment(paymentIntentId: string, paymentMethodId: string): Promise<{ success: boolean; transaction?: PaymentTransaction; error?: string }> {
    try {
      const response = await this.api.post('/integrations/payment/stripe/confirm', {
        paymentIntentId,
        paymentMethodId
      });

      return {
        success: response.success,
        transaction: response.data,
        error: response.message
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Stripe payment confirmation failed'
      };
    }
  }

  // PayPal Integration
  async createPayPalPayment(bookingId: string, amount: number, currency: string): Promise<{ success: boolean; payment?: PayPalPayment; error?: string }> {
    try {
      const response = await this.api.post('/integrations/payment/paypal', {
        bookingId,
        amount,
        currency,
        intent: 'CAPTURE',
        returnUrl: `${window.location.origin}/payment/paypal/success`,
        cancelUrl: `${window.location.origin}/payment/paypal/cancel`
      });

      return {
        success: response.success,
        payment: response.data,
        error: response.message
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'PayPal payment creation failed'
      };
    }
  }

  async capturePayPalPayment(orderId: string): Promise<{ success: boolean; transaction?: PaymentTransaction; error?: string }> {
    try {
      const response = await this.api.post('/integrations/payment/paypal/capture', { orderId });

      return {
        success: response.success,
        transaction: response.data,
        error: response.message
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'PayPal payment capture failed'
      };
    }
  }

  // Currency Conversion
  async getCurrencyRates(baseCurrency: string = 'USD'): Promise<{ success: boolean; rates?: Record<string, CurrencyRate>; error?: string }> {
    try {
      const response = await this.api.get(`/integrations/currency/rates?base=${baseCurrency}`);
      
      return {
        success: response.success,
        rates: response.data,
        error: response.message
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Currency rates fetch failed'
      };
    }
  }

  async convertCurrency(amount: number, from: string, to: string): Promise<{ success: boolean; convertedAmount?: number; rate?: number; error?: string }> {
    try {
      const response = await this.api.post('/integrations/currency/convert', {
        amount,
        from,
        to
      });

      return {
        success: response.success,
        convertedAmount: response.data.convertedAmount,
        rate: response.data.rate,
        error: response.message
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Currency conversion failed'
      };
    }
  }

  // Payment Methods Management
  async getPaymentMethods(): Promise<{ success: boolean; paymentMethods?: PaymentMethod[]; error?: string }> {
    try {
      const response = await this.api.get('/payment/methods');
      
      return {
        success: response.success,
        paymentMethods: response.data,
        error: response.message
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Payment methods fetch failed'
      };
    }
  }

  async addPaymentMethod(paymentMethod: Partial<PaymentMethod>): Promise<{ success: boolean; paymentMethod?: PaymentMethod; error?: string }> {
    try {
      const response = await this.api.post('/payment/methods', paymentMethod);
      
      return {
        success: response.success,
        paymentMethod: response.data,
        error: response.message
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Payment method addition failed'
      };
    }
  }

  async updatePaymentMethod(paymentMethodId: string, updates: Partial<PaymentMethod>): Promise<{ success: boolean; paymentMethod?: PaymentMethod; error?: string }> {
    try {
      const response = await this.api.put(`/payment/methods/${paymentMethodId}`, updates);
      
      return {
        success: response.success,
        paymentMethod: response.data,
        error: response.message
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Payment method update failed'
      };
    }
  }

  async deletePaymentMethod(paymentMethodId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await this.api.delete(`/payment/methods/${paymentMethodId}`);
      
      return {
        success: response.success,
        error: response.message
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Payment method deletion failed'
      };
    }
  }

  async setDefaultPaymentMethod(paymentMethodId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await this.api.post(`/payment/methods/${paymentMethodId}/set-default`);
      
      return {
        success: response.success,
        error: response.message
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Setting default payment method failed'
      };
    }
  }

  // Payment History
  async getPaymentHistory(limit?: number, offset?: number): Promise<{ success: boolean; history?: PaymentHistory; error?: string }> {
    try {
      const params = new URLSearchParams();
      if (limit) params.append('limit', limit.toString());
      if (offset) params.append('offset', offset.toString());

      const response = await this.api.get(`/payment/history?${params.toString()}`);
      
      return {
        success: response.success,
        history: response.data,
        error: response.message
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Payment history fetch failed'
      };
    }
  }

  async getTransaction(transactionId: string): Promise<{ success: boolean; transaction?: PaymentTransaction; error?: string }> {
    try {
      const response = await this.api.get(`/payment/transactions/${transactionId}`);
      
      return {
        success: response.success,
        transaction: response.data,
        error: response.message
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Transaction fetch failed'
      };
    }
  }

  // Refunds
  async processRefund(transactionId: string, amount?: number, reason?: string): Promise<{ success: boolean; refund?: PaymentRefund; error?: string }> {
    try {
      const response = await this.api.post(`/payment/transactions/${transactionId}/refund`, {
        amount,
        reason
      });
      
      return {
        success: response.success,
        refund: response.data,
        error: response.message
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Refund processing failed'
      };
    }
  }

  // Receipts
  async getReceipt(transactionId: string): Promise<{ success: boolean; receipt?: PaymentReceipt; error?: string }> {
    try {
      const response = await this.api.get(`/payment/transactions/${transactionId}/receipt`);
      
      return {
        success: response.success,
        receipt: response.data,
        error: response.message
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Receipt fetch failed'
      };
    }
  }

  async downloadReceipt(transactionId: string): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      const response = await this.api.get(`/payment/transactions/${transactionId}/receipt/download`);
      
      return {
        success: response.success,
        url: response.data.downloadUrl,
        error: response.message
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Receipt download failed'
      };
    }
  }

  // Subscriptions
  async getSubscriptions(): Promise<{ success: boolean; subscriptions?: Subscription[]; error?: string }> {
    try {
      const response = await this.api.get('/payment/subscriptions');
      
      return {
        success: response.success,
        subscriptions: response.data,
        error: response.message
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Subscriptions fetch failed'
      };
    }
  }

  async createSubscription(planId: string, paymentMethodId: string): Promise<{ success: boolean; subscription?: Subscription; error?: string }> {
    try {
      const response = await this.api.post('/payment/subscriptions', {
        planId,
        paymentMethodId
      });
      
      return {
        success: response.success,
        subscription: response.data,
        error: response.message
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Subscription creation failed'
      };
    }
  }

  async cancelSubscription(subscriptionId: string, cancelAtPeriodEnd: boolean = true): Promise<{ success: boolean; subscription?: Subscription; error?: string }> {
    try {
      const response = await this.api.post(`/payment/subscriptions/${subscriptionId}/cancel`, {
        cancelAtPeriodEnd
      });
      
      return {
        success: response.success,
        subscription: response.data,
        error: response.message
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Subscription cancellation failed'
      };
    }
  }

  // Utility Methods
  formatAmount(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount);
  }

  formatPaymentMethod(paymentMethod: PaymentMethod): string {
    switch (paymentMethod.type) {
      case 'card':
        return `${paymentMethod.brand?.toUpperCase()} ****${paymentMethod.last4}`;
      case 'paypal':
        return `PayPal (${paymentMethod.paypalEmail})`;
      case 'bank_transfer':
        return `Bank Transfer (${paymentMethod.bankName})`;
      case 'apple_pay':
        return 'Apple Pay';
      case 'google_pay':
        return 'Google Pay';
      default:
        return 'Unknown Payment Method';
    }
  }

  getPaymentMethodIcon(type: string): string {
    const icons: Record<string, string> = {
      card: '💳',
      paypal: '🅿️',
      bank_transfer: '🏦',
      apple_pay: '🍎',
      google_pay: '🅖'
    };
    return icons[type] || '💰';
  }

  isPaymentMethodExpired(paymentMethod: PaymentMethod): boolean {
    if (paymentMethod.type !== 'card' || !paymentMethod.expiryMonth || !paymentMethod.expiryYear) {
      return false;
    }

    const now = new Date();
    const expiry = new Date(paymentMethod.expiryYear, paymentMethod.expiryMonth - 1);
    return expiry < now;
  }
}

export const paymentService = new PaymentService();
export default paymentService;