/**
 * PaymentTypes - TypeScript interfaces for payment system
 */

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
  status: 'active' | 'inactive' | 'canceled' | 'past_due' | 'trialing' | 'unpaid';
  planId: string;
  planName: string;
  amount: number;
  currency: string;
  interval: 'monthly' | 'yearly' | 'weekly' | 'quarterly';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  paymentMethodId: string;
  nextPaymentDate?: string;
  trialEnd?: string;
  createdAt: string;
  updatedAt: string;
  canceledAt?: string;
  endedAt?: string;
  discount?: {
    id: string;
    couponId: string;
    percentOff?: number;
    amountOff?: number;
    start: string;
    end?: string;
  };
  metadata?: Record<string, any>;
}

export interface PaymentHistory {
  transactions: PaymentTransaction[];
  subscriptions: Subscription[];
  totalSpent: number;
  totalRefunded: number;
  averageTransactionAmount: number;
  paymentMethodsUsed: number;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  amount: number;
  currency: string;
  interval: 'monthly' | 'yearly' | 'weekly' | 'quarterly';
  features: string[];
  popular?: boolean;
  trialDays?: number;
  setupFee?: number;
  maxUsers?: number;
  active: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentAnalytics {
  totalRevenue: number;
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  refundedAmount: number;
  averageTransactionAmount: number;
  conversionRate: number;
  paymentMethodDistribution: Record<string, number>;
  currencyDistribution: Record<string, number>;
  monthlyTrends: {
    month: string;
    revenue: number;
    transactions: number;
    successRate: number;
  }[];
  topCountries: {
    country: string;
    revenue: number;
    transactions: number;
  }[];
}

export interface PaymentSecurity {
  riskLevel: 'low' | 'medium' | 'high';
  riskFactors: string[];
  fraudScore: number;
  recommendations: string[];
  blockedReasons?: string[];
  securityChecks: {
    cvvCheck: 'pass' | 'fail' | 'unavailable';
    addressCheck: 'pass' | 'fail' | 'partial' | 'unavailable';
    postalCodeCheck: 'pass' | 'fail' | 'unavailable';
    threeDSecure: 'authenticated' | 'failed' | 'unavailable';
  };
}

export interface RefundRequest {
  transactionId: string;
  amount: number;
  reason: string;
  refundMethod: 'original' | 'credit';
}

export interface PaymentConfig {
  stripePublishableKey: string;
  paypalClientId: string;
  supportedCurrencies: string[];
  defaultCurrency: string;
  minimumAmount: Record<string, number>;
  maximumAmount: Record<string, number>;
  processingFees: Record<string, number>;
  refundPolicy: {
    fullRefundDays: number;
    partialRefundDays: number;
    processingFee: number;
  };
  subscriptionConfig: {
    trialPeriodDays: number;
    gracePeriodDays: number;
    dunningPeriodDays: number;
  };
}

export interface PaymentNotification {
  id: string;
  type: 'payment_success' | 'payment_failed' | 'refund_processed' | 'subscription_created' | 'subscription_canceled' | 'invoice_due';
  title: string;
  message: string;
  data: Record<string, any>;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
  actionText?: string;
}

export interface SavedPaymentMethod extends PaymentMethod {
  billingAddress?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  fingerprint?: string;
  lastUsed?: string;
  usageCount: number;
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'succeeded' | 'canceled';
  clientSecret: string;
  paymentMethodId?: string;
  description?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringPayment {
  id: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed';
  attemptCount: number;
  nextAttemptDate?: string;
  failureReason?: string;
  createdAt: string;
  processedAt?: string;
}

export interface PaymentWebhook {
  id: string;
  type: string;
  data: Record<string, any>;
  processed: boolean;
  processedAt?: string;
  createdAt: string;
  retryCount: number;
  lastError?: string;
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

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}