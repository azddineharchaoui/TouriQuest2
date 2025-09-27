/**
 * SubscriptionManager - Comprehensive subscription and recurring payment management
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  CreditCard,
  DollarSign,
  Settings,
  Pause,
  Play,
  StopCircle,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Crown,
  Star,
  Zap,
  Shield,
  Users,
  Infinity,
  ArrowUpRight,
  X,
  Edit3
} from 'lucide-react';
import { PaymentService } from '../../api/services/payment';
import { ApiClient } from '../../api/core/ApiClient';
import { 
  Subscription,
  SubscriptionPlan,
  PaymentMethod,
  ApiResponse
} from '../../types/payment-types';

interface SubscriptionManagerProps {
  className?: string;
}

export const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({ className = '' }) => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [showPlanSelector, setShowPlanSelector] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  const paymentService = new PaymentService(new ApiClient());

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const loadSubscriptionData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [subscriptionsResponse, plansResponse, methodsResponse] = await Promise.all([
        paymentService.getUserSubscriptions(),
        paymentService.getSubscriptionPlans(),
        paymentService.getPaymentMethods()
      ]);

      if (subscriptionsResponse.success) {
        setSubscriptions(subscriptionsResponse.data);
      }

      if (plansResponse.success) {
        setPlans(plansResponse.data);
      }

      if (methodsResponse.success) {
        setPaymentMethods(methodsResponse.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubscription = async (planId: string, paymentMethodId: string) => {
    try {
      setProcessingAction('create');
      const response = await paymentService.createSubscription({
        planId,
        paymentMethodId
      });

      if (response.success) {
        await loadSubscriptionData();
        setShowPlanSelector(false);
        setSelectedPlan(null);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create subscription');
    } finally {
      setProcessingAction(null);
    }
  };

  const handleCancelSubscription = async (subscriptionId: string) => {
    try {
      setProcessingAction('cancel');
      const response = await paymentService.cancelSubscription(subscriptionId);
      
      if (response.success) {
        await loadSubscriptionData();
        setSelectedSubscription(null);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to cancel subscription');
    } finally {
      setProcessingAction(null);
    }
  };

  const handleResumeSubscription = async (subscriptionId: string) => {
    try {
      setProcessingAction('resume');
      const response = await paymentService.resumeSubscription(subscriptionId);
      
      if (response.success) {
        await loadSubscriptionData();
        setSelectedSubscription(null);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to resume subscription');
    } finally {
      setProcessingAction(null);
    }
  };

  const handleChangePlan = async (subscriptionId: string, newPlanId: string) => {
    try {
      setProcessingAction('change');
      const response = await paymentService.changeSubscriptionPlan(subscriptionId, newPlanId);
      
      if (response.success) {
        await loadSubscriptionData();
        setSelectedSubscription(null);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to change plan');
    } finally {
      setProcessingAction(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'canceled':
        return <StopCircle className="h-5 w-5 text-red-500" />;
      case 'past_due':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'trialing':
        return <Clock className="h-5 w-5 text-blue-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'canceled':
        return 'bg-red-100 text-red-800';
      case 'past_due':
        return 'bg-yellow-100 text-yellow-800';
      case 'trialing':
        return 'bg-blue-100 text-blue-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPlanIcon = (planName: string) => {
    const name = planName.toLowerCase();
    if (name.includes('premium') || name.includes('pro')) {
      return <Crown className="h-6 w-6 text-yellow-500" />;
    } else if (name.includes('enterprise')) {
      return <Shield className="h-6 w-6 text-purple-500" />;
    } else if (name.includes('team')) {
      return <Users className="h-6 w-6 text-blue-500" />;
    } else {
      return <Star className="h-6 w-6 text-gray-500" />;
    }
  };

  const formatInterval = (interval: string) => {
    switch (interval) {
      case 'monthly':
        return 'month';
      case 'yearly':
        return 'year';
      case 'weekly':
        return 'week';
      case 'quarterly':
        return 'quarter';
      default:
        return interval;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    return amount.toLocaleString('en-US', {
      style: 'currency',
      currency
    });
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-100 ${className}`}>
        <div className="flex items-center justify-center p-12">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600">Loading subscriptions...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-100 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Subscription Management</h3>
            <p className="text-gray-600 text-sm mt-1">
              Manage your subscriptions and recurring payments
            </p>
          </div>
          <button
            onClick={() => setShowPlanSelector(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Zap className="h-4 w-4 mr-2" />
            Subscribe to Plan
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-6 border-b border-gray-100">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-red-500 mr-3 mt-0.5" />
              <div>
                <p className="text-red-800 font-medium">Error</p>
                <p className="text-red-600 text-sm mt-1">{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Subscriptions */}
      <div className="p-6">
        {subscriptions.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No active subscriptions</p>
            <p className="text-gray-400 text-sm mt-1">
              Subscribe to a plan to unlock premium features
            </p>
            <button
              onClick={() => setShowPlanSelector(true)}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Browse Plans
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Active Subscriptions</h4>
            {subscriptions.map((subscription) => (
              <motion.div
                key={subscription.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    {getPlanIcon(subscription.planName)}
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h5 className="font-semibold text-gray-900">{subscription.planName}</h5>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(subscription.status)}`}>
                          {subscription.status}
                        </span>
                      </div>
                      <div className="mt-2 space-y-1">
                        <p className="text-sm text-gray-600">
                          {formatCurrency(subscription.amount, subscription.currency)} per {formatInterval(subscription.interval)}
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>Started: {formatDate(subscription.currentPeriodStart)}</span>
                          <span>•</span>
                          <span>Renews: {formatDate(subscription.currentPeriodEnd)}</span>
                        </div>
                        {subscription.trialEnd && new Date(subscription.trialEnd) > new Date() && (
                          <p className="text-sm text-blue-600">
                            Trial ends: {formatDate(subscription.trialEnd)}
                          </p>
                        )}
                        {subscription.cancelAtPeriodEnd && (
                          <p className="text-sm text-red-600">
                            Will cancel on {formatDate(subscription.currentPeriodEnd)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSelectedSubscription(subscription)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                      title="Manage Subscription"
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Subscription Features */}
                {subscription.discount && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center">
                      <Star className="h-4 w-4 text-green-600 mr-2" />
                      <span className="text-sm font-medium text-green-800">
                        {subscription.discount.percentOff
                          ? `${subscription.discount.percentOff}% off`
                          : `${formatCurrency(subscription.discount.amountOff || 0, subscription.currency)} off`
                        }
                      </span>
                      {subscription.discount.end && (
                        <span className="text-sm text-green-600 ml-2">
                          (until {formatDate(subscription.discount.end)})
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Plan Selector Modal */}
      <AnimatePresence>
        {showPlanSelector && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowPlanSelector(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Choose Your Plan</h3>
                  <button
                    onClick={() => setShowPlanSelector(false)}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {plans.map((plan) => (
                    <div
                      key={plan.id}
                      className={`border-2 rounded-xl p-6 transition-colors ${
                        plan.popular
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {plan.popular && (
                        <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium mb-4 inline-block">
                          Most Popular
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-3 mb-4">
                        {getPlanIcon(plan.name)}
                        <h4 className="font-bold text-gray-900">{plan.name}</h4>
                      </div>

                      <div className="mb-4">
                        <div className="flex items-baseline">
                          <span className="text-3xl font-bold text-gray-900">
                            {formatCurrency(plan.amount, plan.currency)}
                          </span>
                          <span className="text-gray-600 ml-1">
                            /{formatInterval(plan.interval)}
                          </span>
                        </div>
                        {plan.trialDays && (
                          <p className="text-sm text-green-600 mt-1">
                            {plan.trialDays} days free trial
                          </p>
                        )}
                      </div>

                      <p className="text-gray-600 text-sm mb-6">{plan.description}</p>

                      <ul className="space-y-3 mb-6">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-start">
                            <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-gray-700">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <button
                        onClick={() => setSelectedPlan(plan)}
                        className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                          plan.popular
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                        }`}
                      >
                        Select Plan
                      </button>
                    </div>
                  ))}
                </div>

                {/* Payment Method Selection */}
                {selectedPlan && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-8 p-6 bg-gray-50 rounded-xl"
                  >
                    <h4 className="font-medium text-gray-900 mb-4">
                      Select Payment Method for {selectedPlan.name}
                    </h4>
                    
                    <div className="space-y-3">
                      {paymentMethods.map((method) => (
                        <button
                          key={method.id}
                          onClick={() => handleCreateSubscription(selectedPlan.id, method.id)}
                          disabled={processingAction === 'create'}
                          className="w-full p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors text-left disabled:opacity-50"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <CreditCard className="h-5 w-5 text-gray-600" />
                              <div>
                                <p className="font-medium text-gray-900">
                                  •••• •••• •••• {method.last4}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {method.brand} • Expires {method.expiryMonth}/{method.expiryYear}
                                </p>
                              </div>
                            </div>
                            {processingAction === 'create' && (
                              <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                            )}
                          </div>
                        </button>
                      ))}
                      
                      {paymentMethods.length === 0 && (
                        <p className="text-gray-500 text-center py-4">
                          No payment methods found. Please add a payment method first.
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subscription Management Modal */}
      <AnimatePresence>
        {selectedSubscription && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedSubscription(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl max-w-lg w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-gray-900">Manage Subscription</h3>
                  <button
                    onClick={() => setSelectedSubscription(null)}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center space-x-3 mb-2">
                      {getPlanIcon(selectedSubscription.planName)}
                      <h4 className="font-semibold text-gray-900">{selectedSubscription.planName}</h4>
                    </div>
                    <p className="text-sm text-gray-600">
                      {formatCurrency(selectedSubscription.amount, selectedSubscription.currency)} per {formatInterval(selectedSubscription.interval)}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Next billing: {formatDate(selectedSubscription.currentPeriodEnd)}
                    </p>
                  </div>

                  <div className="space-y-3">
                    {selectedSubscription.status === 'active' && !selectedSubscription.cancelAtPeriodEnd && (
                      <button
                        onClick={() => handleCancelSubscription(selectedSubscription.id)}
                        disabled={processingAction === 'cancel'}
                        className="w-full flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        {processingAction === 'cancel' ? (
                          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <StopCircle className="h-4 w-4 mr-2" />
                        )}
                        Cancel Subscription
                      </button>
                    )}

                    {selectedSubscription.status === 'canceled' && (
                      <button
                        onClick={() => handleResumeSubscription(selectedSubscription.id)}
                        disabled={processingAction === 'resume'}
                        className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {processingAction === 'resume' ? (
                          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Play className="h-4 w-4 mr-2" />
                        )}
                        Resume Subscription
                      </button>
                    )}

                    <button
                      className="w-full flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      Change Plan
                    </button>

                    <button
                      className="w-full flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Update Payment Method
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};