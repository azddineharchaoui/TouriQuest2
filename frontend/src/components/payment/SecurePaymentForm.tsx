/**
 * SecurePaymentForm - Comprehensive payment form with Stripe and PayPal integration
 * Features multi-step payment flow, security validation, and error handling
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  Lock,
  Shield,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Loader,
  Eye,
  EyeOff,
  Globe,
  User
} from 'lucide-react';
import { paymentService } from '../../services/paymentService';
import { PaymentMethod, PaymentRequest, CurrencyRate } from '../../types/payment-types';

interface SecurePaymentFormProps {
  bookingId: string;
  amount: number;
  currency: string;
  onSuccess: (transactionId: string) => void;
  onError: (error: string) => void;
  onCancel: () => void;
  className?: string;
}

export const SecurePaymentForm: React.FC<SecurePaymentFormProps> = ({
  bookingId,
  amount,
  currency,
  onSuccess,
  onError,
  onCancel,
  className = ''
}) => {
  const [step, setStep] = useState<'method' | 'details' | 'confirmation' | 'processing'>('method');
  const [selectedPaymentType, setSelectedPaymentType] = useState<'card' | 'paypal' | 'saved'>('card');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCardDetails, setShowCardDetails] = useState(false);
  const [currencyRates, setCurrencyRates] = useState<Record<string, CurrencyRate>>({});
  const [selectedCurrency, setSelectedCurrency] = useState(currency);
  const [convertedAmount, setConvertedAmount] = useState(amount);

  // Card form state
  const [cardData, setCardData] = useState({
    number: '',
    expiryMonth: '',
    expiryYear: '',
    cvc: '',
    holderName: '',
    saveCard: false
  });

  // Billing address state
  const [billingAddress, setBillingAddress] = useState({
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US'
  });

  useEffect(() => {
    loadPaymentMethods();
    loadCurrencyRates();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      const response = await paymentService.getPaymentMethods();
      if (response.success && response.paymentMethods) {
        setPaymentMethods(response.paymentMethods);
      }
    } catch (error) {
      console.error('Failed to load payment methods:', error);
    }
  };

  const loadCurrencyRates = async () => {
    try {
      const response = await paymentService.getCurrencyRates(currency);
      if (response.success && response.rates) {
        setCurrencyRates(response.rates);
      }
    } catch (error) {
      console.error('Failed to load currency rates:', error);
    }
  };

  const handleCurrencyChange = async (newCurrency: string) => {
    if (newCurrency === currency) {
      setSelectedCurrency(currency);
      setConvertedAmount(amount);
      return;
    }

    try {
      const response = await paymentService.convertCurrency(amount, currency, newCurrency);
      if (response.success && response.convertedAmount) {
        setSelectedCurrency(newCurrency);
        setConvertedAmount(response.convertedAmount);
      }
    } catch (error) {
      console.error('Currency conversion failed:', error);
    }
  };

  const validateCardNumber = (number: string): boolean => {
    const cleanNumber = number.replace(/\s+/g, '');
    const cardNumberRegex = /^[0-9]{13,19}$/;
    
    if (!cardNumberRegex.test(cleanNumber)) return false;
    
    // Luhn algorithm
    let sum = 0;
    let isEven = false;
    for (let i = cleanNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cleanNumber.charAt(i), 10);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  };

  const getCardBrand = (number: string): string => {
    const cleanNumber = number.replace(/\s+/g, '');
    
    if (/^4/.test(cleanNumber)) return 'visa';
    if (/^5[1-5]/.test(cleanNumber)) return 'mastercard';
    if (/^3[47]/.test(cleanNumber)) return 'amex';
    if (/^6/.test(cleanNumber)) return 'discover';
    
    return 'unknown';
  };

  const formatCardNumber = (value: string): string => {
    const cleanValue = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = cleanValue.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    
    if (parts.length) {
      return parts.join(' ');
    } else {
      return cleanValue;
    }
  };

  const handleCardInputChange = (field: string, value: string) => {
    let formattedValue = value;
    
    if (field === 'number') {
      formattedValue = formatCardNumber(value);
    } else if (field === 'expiryMonth' || field === 'expiryYear') {
      formattedValue = value.replace(/[^0-9]/g, '');
      if (field === 'expiryMonth' && formattedValue.length > 2) {
        formattedValue = formattedValue.substring(0, 2);
      }
      if (field === 'expiryYear' && formattedValue.length > 4) {
        formattedValue = formattedValue.substring(0, 4);
      }
    } else if (field === 'cvc') {
      formattedValue = value.replace(/[^0-9]/g, '').substring(0, 4);
    }
    
    setCardData(prev => ({
      ...prev,
      [field]: formattedValue
    }));
  };

  const validateForm = (): boolean => {
    setError(null);
    
    if (selectedPaymentType === 'card') {
      if (!cardData.number || !validateCardNumber(cardData.number)) {
        setError('Please enter a valid card number');
        return false;
      }
      
      if (!cardData.holderName.trim()) {
        setError('Please enter the cardholder name');
        return false;
      }
      
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      const expiryMonth = parseInt(cardData.expiryMonth);
      const expiryYear = parseInt(cardData.expiryYear);
      
      if (!expiryMonth || expiryMonth < 1 || expiryMonth > 12) {
        setError('Please enter a valid expiry month');
        return false;
      }
      
      if (!expiryYear || expiryYear < currentYear || 
          (expiryYear === currentYear && expiryMonth < currentMonth)) {
        setError('Please enter a valid expiry year');
        return false;
      }
      
      if (!cardData.cvc || cardData.cvc.length < 3) {
        setError('Please enter a valid CVC');
        return false;
      }
      
      if (!billingAddress.line1.trim() || !billingAddress.city.trim() || 
          !billingAddress.postalCode.trim()) {
        setError('Please complete the billing address');
        return false;
      }
    } else if (selectedPaymentType === 'saved') {
      if (!selectedPaymentMethod) {
        setError('Please select a payment method');
        return false;
      }
    }
    
    return true;
  };

  const processPayment = async () => {
    if (!validateForm()) return;
    
    setStep('processing');
    setLoading(true);
    setError(null);
    
    try {
      if (selectedPaymentType === 'card') {
        // Create Stripe payment intent
        const intentResponse = await paymentService.createStripePaymentIntent(
          bookingId,
          convertedAmount,
          selectedCurrency
        );
        
        if (!intentResponse.success || !intentResponse.paymentIntent) {
          throw new Error(intentResponse.error || 'Failed to create payment intent');
        }
        
        // Process Stripe payment (in real implementation, this would use Stripe.js)
        const paymentResponse = await paymentService.confirmStripePayment(
          intentResponse.paymentIntent.paymentIntentId,
          'card_payment_method' // This would be the actual Stripe payment method ID
        );
        
        if (paymentResponse.success && paymentResponse.transaction) {
          onSuccess(paymentResponse.transaction.id);
        } else {
          throw new Error(paymentResponse.error || 'Payment failed');
        }
      } else if (selectedPaymentType === 'paypal') {
        // Create PayPal payment
        const paypalResponse = await paymentService.createPayPalPayment(
          bookingId,
          convertedAmount,
          selectedCurrency
        );
        
        if (paypalResponse.success && paypalResponse.payment) {
          // Redirect to PayPal approval URL
          window.location.href = paypalResponse.payment.approvalUrl;
        } else {
          throw new Error(paypalResponse.error || 'PayPal payment creation failed');
        }
      } else if (selectedPaymentType === 'saved') {
        // Process with saved payment method
        const paymentRequest: PaymentRequest = {
          bookingId,
          amount: convertedAmount,
          currency: selectedCurrency,
          paymentMethodId: selectedPaymentMethod
        };
        
        const response = await paymentService.processPayment(bookingId, paymentRequest);
        
        if (response.success && response.transaction) {
          onSuccess(response.transaction.id);
        } else {
          throw new Error(response.error || 'Payment failed');
        }
      }
    } catch (error: any) {
      setError(error.message || 'Payment processing failed');
      setStep('confirmation');
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number, currency: string): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount);
  };

  return (\n    <motion.div\n      initial={{ opacity: 0, y: 20 }}\n      animate={{ opacity: 1, y: 0 }}\n      className={`bg-white rounded-xl shadow-2xl max-w-2xl mx-auto overflow-hidden ${className}`}\n    >\n      {/* Header */}\n      <div className=\"bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6\">\n        <div className=\"flex items-center justify-between\">\n          <div>\n            <h2 className=\"text-2xl font-bold flex items-center gap-2\">\n              <Shield size={24} />\n              Secure Payment\n            </h2>\n            <p className=\"text-blue-100 mt-1\">\n              Your payment information is encrypted and secure\n            </p>\n          </div>\n          <div className=\"text-right\">\n            <p className=\"text-xl font-bold\">{formatAmount(convertedAmount, selectedCurrency)}</p>\n            <p className=\"text-blue-100 text-sm\">Total Amount</p>\n          </div>\n        </div>\n      </div>\n\n      <div className=\"p-6\">\n        {/* Step Indicator */}\n        <div className=\"flex items-center justify-center mb-8\">\n          <div className=\"flex items-center space-x-4\">\n            {['method', 'details', 'confirmation'].map((stepName, index) => {\n              const isActive = step === stepName;\n              const isCompleted = ['method', 'details', 'confirmation'].indexOf(step) > index;\n              \n              return (\n                <React.Fragment key={stepName}>\n                  <div className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold ${\n                    isActive ? 'bg-blue-600 text-white' :\n                    isCompleted ? 'bg-green-500 text-white' :\n                    'bg-gray-200 text-gray-600'\n                  }`}>\n                    {isCompleted ? <CheckCircle size={20} /> : index + 1}\n                  </div>\n                  {index < 2 && (\n                    <div className={`w-12 h-1 ${\n                      isCompleted ? 'bg-green-500' : 'bg-gray-200'\n                    }`} />\n                  )}\n                </React.Fragment>\n              );\n            })}\n          </div>\n        </div>\n\n        <AnimatePresence mode=\"wait\">\n          {step === 'method' && (\n            <motion.div\n              key=\"method\"\n              initial={{ opacity: 0, x: 20 }}\n              animate={{ opacity: 1, x: 0 }}\n              exit={{ opacity: 0, x: -20 }}\n              className=\"space-y-6\"\n            >\n              <div>\n                <h3 className=\"text-lg font-semibold text-gray-900 mb-4\">\n                  Choose Payment Method\n                </h3>\n\n                {/* Currency Selection */}\n                <div className=\"mb-6\">\n                  <label className=\"block text-sm font-medium text-gray-700 mb-2\">\n                    <Globe className=\"inline mr-2\" size={16} />\n                    Currency\n                  </label>\n                  <select\n                    value={selectedCurrency}\n                    onChange={(e) => handleCurrencyChange(e.target.value)}\n                    className=\"w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent\"\n                  >\n                    <option value={currency}>{currency.toUpperCase()} (Original)</option>\n                    {Object.entries(currencyRates).map(([code, rate]) => (\n                      <option key={code} value={code}>\n                        {code.toUpperCase()} - {formatAmount(amount * rate.rate, code)}\n                      </option>\n                    ))}\n                  </select>\n                </div>\n\n                {/* Payment Method Selection */}\n                <div className=\"space-y-4\">\n                  {/* New Card */}\n                  <label className=\"flex items-start gap-4 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 transition-colors\">\n                    <input\n                      type=\"radio\"\n                      name=\"paymentType\"\n                      value=\"card\"\n                      checked={selectedPaymentType === 'card'}\n                      onChange={(e) => setSelectedPaymentType(e.target.value as any)}\n                      className=\"mt-1 text-blue-600 focus:ring-blue-500\"\n                    />\n                    <div className=\"flex-1\">\n                      <div className=\"flex items-center gap-2 mb-1\">\n                        <CreditCard className=\"text-blue-600\" size={20} />\n                        <span className=\"font-semibold text-gray-900\">Credit or Debit Card</span>\n                      </div>\n                      <p className=\"text-sm text-gray-600\">\n                        Pay securely with your card. We accept Visa, Mastercard, American Express\n                      </p>\n                    </div>\n                  </label>\n\n                  {/* PayPal */}\n                  <label className=\"flex items-start gap-4 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 transition-colors\">\n                    <input\n                      type=\"radio\"\n                      name=\"paymentType\"\n                      value=\"paypal\"\n                      checked={selectedPaymentType === 'paypal'}\n                      onChange={(e) => setSelectedPaymentType(e.target.value as any)}\n                      className=\"mt-1 text-blue-600 focus:ring-blue-500\"\n                    />\n                    <div className=\"flex-1\">\n                      <div className=\"flex items-center gap-2 mb-1\">\n                        <div className=\"w-5 h-5 bg-blue-600 text-white rounded flex items-center justify-center text-xs font-bold\">\n                          P\n                        </div>\n                        <span className=\"font-semibold text-gray-900\">PayPal</span>\n                      </div>\n                      <p className=\"text-sm text-gray-600\">\n                        Pay with your PayPal account for added security\n                      </p>\n                    </div>\n                  </label>\n\n                  {/* Saved Payment Methods */}\n                  {paymentMethods.length > 0 && (\n                    <div>\n                      <h4 className=\"font-medium text-gray-900 mb-3\">Saved Payment Methods</h4>\n                      {paymentMethods.map((method) => (\n                        <label\n                          key={method.id}\n                          className=\"flex items-start gap-4 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 transition-colors mb-2\"\n                        >\n                          <input\n                            type=\"radio\"\n                            name=\"paymentType\"\n                            value=\"saved\"\n                            checked={selectedPaymentType === 'saved' && selectedPaymentMethod === method.id}\n                            onChange={() => {\n                              setSelectedPaymentType('saved');\n                              setSelectedPaymentMethod(method.id);\n                            }}\n                            className=\"mt-1 text-blue-600 focus:ring-blue-500\"\n                          />\n                          <div className=\"flex-1\">\n                            <div className=\"flex items-center gap-2 mb-1\">\n                              <CreditCard className=\"text-gray-600\" size={16} />\n                              <span className=\"font-medium text-gray-900\">\n                                {paymentService.formatPaymentMethod(method)}\n                              </span>\n                              {method.isDefault && (\n                                <span className=\"text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded\">\n                                  Default\n                                </span>\n                              )}\n                            </div>\n                            {method.type === 'card' && method.expiryMonth && method.expiryYear && (\n                              <p className=\"text-sm text-gray-600\">\n                                Expires {String(method.expiryMonth).padStart(2, '0')}/{method.expiryYear}\n                              </p>\n                            )}\n                          </div>\n                        </label>\n                      ))}\n                    </div>\n                  )}\n                </div>\n              </div>\n            </motion.div>\n          )}\n\n          {step === 'details' && selectedPaymentType === 'card' && (\n            <motion.div\n              key=\"details\"\n              initial={{ opacity: 0, x: 20 }}\n              animate={{ opacity: 1, x: 0 }}\n              exit={{ opacity: 0, x: -20 }}\n              className=\"space-y-6\"\n            >\n              <h3 className=\"text-lg font-semibold text-gray-900 mb-4\">\n                Card Details\n              </h3>\n\n              {/* Card Number */}\n              <div>\n                <label className=\"block text-sm font-medium text-gray-700 mb-2\">\n                  Card Number *\n                </label>\n                <div className=\"relative\">\n                  <input\n                    type=\"text\"\n                    value={cardData.number}\n                    onChange={(e) => handleCardInputChange('number', e.target.value)}\n                    placeholder=\"1234 5678 9012 3456\"\n                    className=\"w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent\"\n                    maxLength={19}\n                  />\n                  <CreditCard className=\"absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400\" size={20} />\n                  {cardData.number && (\n                    <div className=\"absolute right-3 top-1/2 transform -translate-y-1/2\">\n                      <span className=\"text-xs font-semibold text-gray-600 uppercase\">\n                        {getCardBrand(cardData.number)}\n                      </span>\n                    </div>\n                  )}\n                </div>\n              </div>\n\n              {/* Cardholder Name */}\n              <div>\n                <label className=\"block text-sm font-medium text-gray-700 mb-2\">\n                  Cardholder Name *\n                </label>\n                <div className=\"relative\">\n                  <input\n                    type=\"text\"\n                    value={cardData.holderName}\n                    onChange={(e) => handleCardInputChange('holderName', e.target.value)}\n                    placeholder=\"John Doe\"\n                    className=\"w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent\"\n                  />\n                  <User className=\"absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400\" size={20} />\n                </div>\n              </div>\n\n              {/* Expiry and CVC */}\n              <div className=\"grid grid-cols-3 gap-4\">\n                <div>\n                  <label className=\"block text-sm font-medium text-gray-700 mb-2\">\n                    Expiry Month *\n                  </label>\n                  <input\n                    type=\"text\"\n                    value={cardData.expiryMonth}\n                    onChange={(e) => handleCardInputChange('expiryMonth', e.target.value)}\n                    placeholder=\"MM\"\n                    className=\"w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center\"\n                    maxLength={2}\n                  />\n                </div>\n                <div>\n                  <label className=\"block text-sm font-medium text-gray-700 mb-2\">\n                    Expiry Year *\n                  </label>\n                  <input\n                    type=\"text\"\n                    value={cardData.expiryYear}\n                    onChange={(e) => handleCardInputChange('expiryYear', e.target.value)}\n                    placeholder=\"YYYY\"\n                    className=\"w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center\"\n                    maxLength={4}\n                  />\n                </div>\n                <div>\n                  <label className=\"block text-sm font-medium text-gray-700 mb-2\">\n                    CVC *\n                  </label>\n                  <div className=\"relative\">\n                    <input\n                      type={showCardDetails ? 'text' : 'password'}\n                      value={cardData.cvc}\n                      onChange={(e) => handleCardInputChange('cvc', e.target.value)}\n                      placeholder=\"123\"\n                      className=\"w-full p-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center\"\n                      maxLength={4}\n                    />\n                    <button\n                      type=\"button\"\n                      onClick={() => setShowCardDetails(!showCardDetails)}\n                      className=\"absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600\"\n                    >\n                      {showCardDetails ? <EyeOff size={16} /> : <Eye size={16} />}\n                    </button>\n                  </div>\n                </div>\n              </div>\n\n              {/* Billing Address */}\n              <div>\n                <h4 className=\"font-medium text-gray-900 mb-3\">Billing Address</h4>\n                <div className=\"space-y-4\">\n                  <div>\n                    <label className=\"block text-sm font-medium text-gray-700 mb-2\">\n                      Address Line 1 *\n                    </label>\n                    <input\n                      type=\"text\"\n                      value={billingAddress.line1}\n                      onChange={(e) => setBillingAddress(prev => ({ ...prev, line1: e.target.value }))}\n                      placeholder=\"123 Main Street\"\n                      className=\"w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent\"\n                    />\n                  </div>\n                  \n                  <div>\n                    <label className=\"block text-sm font-medium text-gray-700 mb-2\">\n                      Address Line 2\n                    </label>\n                    <input\n                      type=\"text\"\n                      value={billingAddress.line2}\n                      onChange={(e) => setBillingAddress(prev => ({ ...prev, line2: e.target.value }))}\n                      placeholder=\"Apartment, suite, etc.\"\n                      className=\"w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent\"\n                    />\n                  </div>\n                  \n                  <div className=\"grid grid-cols-2 gap-4\">\n                    <div>\n                      <label className=\"block text-sm font-medium text-gray-700 mb-2\">\n                        City *\n                      </label>\n                      <input\n                        type=\"text\"\n                        value={billingAddress.city}\n                        onChange={(e) => setBillingAddress(prev => ({ ...prev, city: e.target.value }))}\n                        placeholder=\"New York\"\n                        className=\"w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent\"\n                      />\n                    </div>\n                    \n                    <div>\n                      <label className=\"block text-sm font-medium text-gray-700 mb-2\">\n                        State *\n                      </label>\n                      <input\n                        type=\"text\"\n                        value={billingAddress.state}\n                        onChange={(e) => setBillingAddress(prev => ({ ...prev, state: e.target.value }))}\n                        placeholder=\"NY\"\n                        className=\"w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent\"\n                      />\n                    </div>\n                  </div>\n                  \n                  <div className=\"grid grid-cols-2 gap-4\">\n                    <div>\n                      <label className=\"block text-sm font-medium text-gray-700 mb-2\">\n                        Postal Code *\n                      </label>\n                      <input\n                        type=\"text\"\n                        value={billingAddress.postalCode}\n                        onChange={(e) => setBillingAddress(prev => ({ ...prev, postalCode: e.target.value }))}\n                        placeholder=\"10001\"\n                        className=\"w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent\"\n                      />\n                    </div>\n                    \n                    <div>\n                      <label className=\"block text-sm font-medium text-gray-700 mb-2\">\n                        Country *\n                      </label>\n                      <select\n                        value={billingAddress.country}\n                        onChange={(e) => setBillingAddress(prev => ({ ...prev, country: e.target.value }))}\n                        className=\"w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent\"\n                      >\n                        <option value=\"US\">United States</option>\n                        <option value=\"CA\">Canada</option>\n                        <option value=\"GB\">United Kingdom</option>\n                        <option value=\"AU\">Australia</option>\n                        <option value=\"DE\">Germany</option>\n                        <option value=\"FR\">France</option>\n                        <option value=\"IT\">Italy</option>\n                        <option value=\"ES\">Spain</option>\n                        <option value=\"JP\">Japan</option>\n                      </select>\n                    </div>\n                  </div>\n                </div>\n              </div>\n\n              {/* Save Card Option */}\n              <div className=\"flex items-center gap-2\">\n                <input\n                  type=\"checkbox\"\n                  id=\"saveCard\"\n                  checked={cardData.saveCard}\n                  onChange={(e) => setCardData(prev => ({ ...prev, saveCard: e.target.checked }))}\n                  className=\"text-blue-600 focus:ring-blue-500 rounded\"\n                />\n                <label htmlFor=\"saveCard\" className=\"text-sm text-gray-700\">\n                  Save this card for future purchases\n                </label>\n              </div>\n            </motion.div>\n          )}\n\n          {step === 'confirmation' && (\n            <motion.div\n              key=\"confirmation\"\n              initial={{ opacity: 0, x: 20 }}\n              animate={{ opacity: 1, x: 0 }}\n              exit={{ opacity: 0, x: -20 }}\n              className=\"space-y-6\"\n            >\n              <h3 className=\"text-lg font-semibold text-gray-900 mb-4\">\n                Confirm Payment\n              </h3>\n\n              {/* Payment Summary */}\n              <div className=\"bg-gray-50 rounded-lg p-4\">\n                <div className=\"flex items-center justify-between mb-2\">\n                  <span className=\"text-gray-600\">Amount:</span>\n                  <span className=\"font-semibold\">{formatAmount(convertedAmount, selectedCurrency)}</span>\n                </div>\n                {selectedCurrency !== currency && (\n                  <div className=\"flex items-center justify-between mb-2 text-sm\">\n                    <span className=\"text-gray-500\">Original Amount:</span>\n                    <span className=\"text-gray-500\">{formatAmount(amount, currency)}</span>\n                  </div>\n                )}\n                <div className=\"flex items-center justify-between\">\n                  <span className=\"text-gray-600\">Payment Method:</span>\n                  <span className=\"font-medium\">\n                    {selectedPaymentType === 'card' ? `Card ending in ${cardData.number.slice(-4)}` :\n                     selectedPaymentType === 'paypal' ? 'PayPal' :\n                     paymentMethods.find(m => m.id === selectedPaymentMethod)?.last4 ? \n                       `Card ending in ${paymentMethods.find(m => m.id === selectedPaymentMethod)?.last4}` : 'Saved Payment Method'}\n                  </span>\n                </div>\n              </div>\n\n              {/* Security Notice */}\n              <div className=\"bg-green-50 border border-green-200 rounded-lg p-4\">\n                <div className=\"flex items-center gap-2 text-green-800 mb-2\">\n                  <Lock size={16} />\n                  <span className=\"font-medium\">Your payment is secure</span>\n                </div>\n                <p className=\"text-green-700 text-sm\">\n                  Your payment information is encrypted using industry-standard SSL technology. \n                  We never store your complete card details on our servers.\n                </p>\n              </div>\n            </motion.div>\n          )}\n\n          {step === 'processing' && (\n            <motion.div\n              key=\"processing\"\n              initial={{ opacity: 0, scale: 0.9 }}\n              animate={{ opacity: 1, scale: 1 }}\n              className=\"text-center py-8\"\n            >\n              <Loader className=\"animate-spin text-blue-600 mx-auto mb-4\" size={48} />\n              <h3 className=\"text-xl font-semibold text-gray-900 mb-2\">Processing Payment</h3>\n              <p className=\"text-gray-600\">\n                Please wait while we securely process your payment. Do not refresh or close this page.\n              </p>\n            </motion.div>\n          )}\n        </AnimatePresence>\n\n        {/* Error Message */}\n        {error && (\n          <div className=\"mt-6 bg-red-50 border border-red-200 rounded-lg p-4\">\n            <div className=\"flex items-center gap-2 text-red-800\">\n              <AlertTriangle size={16} />\n              <span className=\"font-medium\">{error}</span>\n            </div>\n          </div>\n        )}\n\n        {/* Action Buttons */}\n        {step !== 'processing' && (\n          <div className=\"mt-8 flex justify-between\">\n            <button\n              onClick={() => {\n                if (step === 'method') {\n                  onCancel();\n                } else if (step === 'details') {\n                  setStep('method');\n                } else if (step === 'confirmation') {\n                  setStep(selectedPaymentType === 'card' ? 'details' : 'method');\n                }\n              }}\n              className=\"flex items-center gap-2 px-6 py-3 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium\"\n            >\n              <ArrowLeft size={16} />\n              {step === 'method' ? 'Cancel' : 'Back'}\n            </button>\n            \n            <button\n              onClick={() => {\n                if (step === 'method') {\n                  if (selectedPaymentType === 'card') {\n                    setStep('details');\n                  } else {\n                    setStep('confirmation');\n                  }\n                } else if (step === 'details') {\n                  if (validateForm()) {\n                    setStep('confirmation');\n                  }\n                } else if (step === 'confirmation') {\n                  processPayment();\n                }\n              }}\n              disabled={loading || (\n                selectedPaymentType === 'saved' && !selectedPaymentMethod\n              )}\n              className=\"flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium\"\n            >\n              {step === 'confirmation' ? (\n                <>\n                  <Lock size={16} />\n                  Pay {formatAmount(convertedAmount, selectedCurrency)}\n                </>\n              ) : (\n                <>\n                  Continue\n                  <ArrowRight size={16} />\n                </>\n              )}\n            </button>\n          </div>\n        )}\n      </div>\n    </motion.div>\n  );\n};\n\nexport default SecurePaymentForm;