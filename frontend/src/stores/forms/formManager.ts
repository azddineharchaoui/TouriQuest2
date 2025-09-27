/**
 * Advanced Form State Management with React Hook Form and Zod
 * Enterprise-grade form handling with validation, persistence, and error management
 */

import { useForm, UseFormProps, UseFormReturn, FieldValues, FieldPath, FieldError } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useCallback, useMemo } from 'react';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist } from '../middleware';
import { FormState, PersistConfig } from '../types';

// Base form schemas
export const baseSchemas = {
  email: z.string().email('Please enter a valid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
      'Password must contain uppercase, lowercase, number and special character'),
  phone: z.string()
    .regex(/^\+?[\d\s-()]+$/, 'Please enter a valid phone number')
    .min(10, 'Phone number must be at least 10 digits'),
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must not exceed 50 characters'),
  url: z.string().url('Please enter a valid URL'),
  date: z.date(),
  dateString: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Please enter a valid date (YYYY-MM-DD)'),
  number: z.number(),
  positiveNumber: z.number().positive('Must be a positive number'),
  currency: z.number().multipleOf(0.01, 'Invalid currency amount'),
  percentage: z.number().min(0, 'Percentage cannot be negative').max(100, 'Percentage cannot exceed 100'),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Please enter a valid ZIP code'),
  creditCard: z.string().regex(/^\d{4}\s?\d{4}\s?\d{4}\s?\d{4}$/, 'Please enter a valid credit card number'),
  expiryDate: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, 'Please enter expiry date in MM/YY format'),
  cvv: z.string().regex(/^\d{3,4}$/, 'Please enter a valid CVV')
};

// Form validation schemas
export const formSchemas = {
  login: z.object({
    email: baseSchemas.email,
    password: z.string().min(1, 'Password is required'),
    rememberMe: z.boolean().optional()
  }),
  
  register: z.object({
    firstName: baseSchemas.name,
    lastName: baseSchemas.name,
    email: baseSchemas.email,
    password: baseSchemas.password,
    confirmPassword: z.string(),
    phone: baseSchemas.phone.optional(),
    agreeToTerms: z.boolean().refine(val => val === true, 'You must agree to the terms and conditions'),
    marketingOptIn: z.boolean().optional()
  }).refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  }),
  
  profile: z.object({
    firstName: baseSchemas.name,
    lastName: baseSchemas.name,
    email: baseSchemas.email,
    phone: baseSchemas.phone.optional(),
    dateOfBirth: baseSchemas.dateString.optional(),
    bio: z.string().max(500, 'Bio must not exceed 500 characters').optional(),
    website: baseSchemas.url.optional(),
    address: z.object({
      street: z.string().min(1, 'Street address is required'),
      city: z.string().min(1, 'City is required'),
      state: z.string().min(1, 'State is required'),
      country: z.string().min(1, 'Country is required'),
      zipCode: baseSchemas.zipCode
    }).optional()
  }),
  
  booking: z.object({
    propertyId: z.string().min(1, 'Property ID is required'),
    checkIn: baseSchemas.dateString,
    checkOut: baseSchemas.dateString,
    guests: baseSchemas.positiveNumber.int().max(20, 'Maximum 20 guests allowed'),
    rooms: baseSchemas.positiveNumber.int().max(10, 'Maximum 10 rooms allowed'),
    specialRequests: z.string().max(1000, 'Special requests must not exceed 1000 characters').optional(),
    guestInfo: z.array(z.object({
      firstName: baseSchemas.name,
      lastName: baseSchemas.name,
      age: z.number().int().min(0).max(120)
    })).min(1, 'At least one guest is required'),
    contactInfo: z.object({
      email: baseSchemas.email,
      phone: baseSchemas.phone
    })
  }).refine(data => new Date(data.checkOut) > new Date(data.checkIn), {
    message: 'Check-out date must be after check-in date',
    path: ['checkOut']
  }),
  
  payment: z.object({
    cardNumber: baseSchemas.creditCard,
    expiryDate: baseSchemas.expiryDate,
    cvv: baseSchemas.cvv,
    cardholderName: baseSchemas.name,
    billingAddress: z.object({
      street: z.string().min(1, 'Street address is required'),
      city: z.string().min(1, 'City is required'),
      state: z.string().min(1, 'State is required'),
      country: z.string().min(1, 'Country is required'),
      zipCode: baseSchemas.zipCode
    }),
    saveCard: z.boolean().optional()
  }),
  
  review: z.object({
    rating: z.number().int().min(1, 'Rating is required').max(5, 'Maximum rating is 5'),
    title: z.string().min(5, 'Title must be at least 5 characters').max(100, 'Title must not exceed 100 characters'),
    content: z.string().min(20, 'Review must be at least 20 characters').max(2000, 'Review must not exceed 2000 characters'),
    photos: z.array(z.string()).max(10, 'Maximum 10 photos allowed').optional(),
    categories: z.object({
      cleanliness: z.number().int().min(1).max(5),
      communication: z.number().int().min(1).max(5),
      checkIn: z.number().int().min(1).max(5),
      accuracy: z.number().int().min(1).max(5),
      location: z.number().int().min(1).max(5),
      value: z.number().int().min(1).max(5)
    }).optional(),
    wouldRecommend: z.boolean()
  }),
  
  contactUs: z.object({
    name: baseSchemas.name,
    email: baseSchemas.email,
    subject: z.string().min(5, 'Subject must be at least 5 characters').max(100, 'Subject must not exceed 100 characters'),
    message: z.string().min(20, 'Message must be at least 20 characters').max(2000, 'Message must not exceed 2000 characters'),
    category: z.enum(['general', 'booking', 'payment', 'technical', 'feedback']),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    attachments: z.array(z.string()).max(5, 'Maximum 5 attachments allowed').optional()
  }),
  
  propertySearch: z.object({
    destination: z.string().min(1, 'Destination is required'),
    checkIn: baseSchemas.dateString,
    checkOut: baseSchemas.dateString,
    guests: baseSchemas.positiveNumber.int().max(20, 'Maximum 20 guests allowed'),
    rooms: baseSchemas.positiveNumber.int().max(10, 'Maximum 10 rooms allowed').optional(),
    minPrice: baseSchemas.currency.optional(),
    maxPrice: baseSchemas.currency.optional(),
    propertyType: z.array(z.string()).optional(),
    amenities: z.array(z.string()).optional(),
    accessibility: z.array(z.string()).optional()
  }).refine(data => new Date(data.checkOut) > new Date(data.checkIn), {
    message: 'Check-out date must be after check-in date',
    path: ['checkOut']
  }).refine(data => !data.minPrice || !data.maxPrice || data.maxPrice >= data.minPrice, {
    message: 'Maximum price must be greater than minimum price',
    path: ['maxPrice']
  })
};

// Form persistence store
interface FormPersistenceState {
  savedForms: Record<string, {
    data: any;
    timestamp: Date;
    expiresAt: Date;
  }>;
  autoSaveEnabled: boolean;
  autoSaveInterval: number;
  
  saveForm: (formId: string, data: any, ttl?: number) => void;
  loadForm: (formId: string) => any | null;
  removeForm: (formId: string) => void;
  clearExpiredForms: () => void;
  setAutoSave: (enabled: boolean) => void;
}

const persistConfig: PersistConfig = {
  name: 'touriquest-forms',
  enabled: true,
  version: 1,
  encrypted: true,
  storage: 'localStorage'
};

const useFormPersistenceStore = create<FormPersistenceState>()(
  persist(
    immer((set, get) => ({
      savedForms: {},
      autoSaveEnabled: true,
      autoSaveInterval: 30000, // 30 seconds
      
      saveForm: (formId: string, data: any, ttl = 24 * 60 * 60 * 1000) => {
        set(draft => {
          draft.savedForms[formId] = {
            data,
            timestamp: new Date(),
            expiresAt: new Date(Date.now() + ttl)
          };
        });
      },
      
      loadForm: (formId: string) => {
        const { savedForms } = get();
        const saved = savedForms[formId];
        
        if (!saved) return null;
        
        // Check if expired
        if (new Date() > saved.expiresAt) {
          get().removeForm(formId);
          return null;
        }
        
        return saved.data;
      },
      
      removeForm: (formId: string) => {
        set(draft => {
          delete draft.savedForms[formId];
        });
      },
      
      clearExpiredForms: () => {
        const now = new Date();
        set(draft => {
          Object.keys(draft.savedForms).forEach(formId => {
            if (now > draft.savedForms[formId].expiresAt) {
              delete draft.savedForms[formId];
            }
          });
        });
      },
      
      setAutoSave: (enabled: boolean) => {
        set(draft => {
          draft.autoSaveEnabled = enabled;
        });
      }
    })),
    persistConfig
  )
);

// Enhanced form hook with persistence and advanced features
export interface UseAdvancedFormOptions<T extends FieldValues> extends UseFormProps<T> {
  schema?: z.ZodSchema<T>;
  formId?: string;
  autosave?: boolean;
  autosaveInterval?: number;
  onSubmitSuccess?: (data: T) => void;
  onSubmitError?: (error: Error) => void;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  persistValues?: boolean;
  resetOnSubmitSuccess?: boolean;
  transformSubmitData?: (data: T) => any;
}

export function useAdvancedForm<T extends FieldValues>(
  options: UseAdvancedFormOptions<T> = {}
): UseFormReturn<T> & {
  isDirty: boolean;
  isSubmitting: boolean;
  submitCount: number;
  errors: Record<keyof T, FieldError>;
  touchedFields: Record<keyof T, boolean>;
  dirtyFields: Record<keyof T, boolean>;
  submitForm: (data: T) => Promise<void>;
  resetForm: () => void;
  saveFormData: () => void;
  loadFormData: () => void;
  clearFormData: () => void;
  getFieldError: (field: FieldPath<T>) => string | undefined;
  isFieldTouched: (field: FieldPath<T>) => boolean;
  isFieldDirty: (field: FieldPath<T>) => boolean;
} {
  const {
    schema,
    formId,
    autosave = false,
    autosaveInterval = 30000,
    onSubmitSuccess,
    onSubmitError,
    validateOnChange = false,
    validateOnBlur = true,
    persistValues = false,
    resetOnSubmitSuccess = false,
    transformSubmitData,
    ...formOptions
  } = options;
  
  const { saveForm, loadForm, removeForm, autoSaveEnabled } = useFormPersistenceStore();
  
  // Setup form with resolver
  const form = useForm<T>({
    ...formOptions,
    resolver: schema ? zodResolver(schema) : undefined,
    mode: validateOnChange ? 'onChange' : validateOnBlur ? 'onBlur' : 'onSubmit'
  });
  
  const {
    handleSubmit,
    watch,
    reset,
    formState: { 
      isDirty, 
      isSubmitting, 
      submitCount, 
      errors, 
      touchedFields, 
      dirtyFields 
    }
  } = form;
  
  // Load persisted data on mount
  useEffect(() => {
    if (formId && persistValues) {
      const savedData = loadForm(formId);
      if (savedData) {
        reset(savedData);
      }
    }
  }, [formId, persistValues, loadForm, reset]);
  
  // Auto-save functionality
  const watchedValues = watch();
  
  useEffect(() => {
    if (!autosave || !formId || !autoSaveEnabled) return;
    
    const timer = setTimeout(() => {
      if (isDirty) {
        saveForm(formId, watchedValues);
      }
    }, autosaveInterval);
    
    return () => clearTimeout(timer);
  }, [watchedValues, autosave, formId, autoSaveEnabled, isDirty, autosaveInterval, saveForm]);
  
  // Submit handler with enhanced error handling
  const submitForm = useCallback(async (data: T) => {
    try {
      const submissionData = transformSubmitData ? transformSubmitData(data) : data;
      
      // Validate with schema if provided
      if (schema) {
        schema.parse(data);
      }
      
      await onSubmitSuccess?.(submissionData);
      
      if (resetOnSubmitSuccess) {
        reset();
      }
      
      // Clear saved data on successful submit
      if (formId && persistValues) {
        removeForm(formId);
      }
    } catch (error) {
      onSubmitError?.(error instanceof Error ? error : new Error('Form submission failed'));
      throw error;
    }
  }, [schema, onSubmitSuccess, onSubmitError, resetOnSubmitSuccess, reset, formId, persistValues, removeForm, transformSubmitData]);
  
  // Form data management
  const saveFormData = useCallback(() => {
    if (formId) {
      saveForm(formId, watchedValues);
    }
  }, [formId, saveForm, watchedValues]);
  
  const loadFormData = useCallback(() => {
    if (formId) {
      const savedData = loadForm(formId);
      if (savedData) {
        reset(savedData);
      }
    }
  }, [formId, loadForm, reset]);
  
  const clearFormData = useCallback(() => {
    if (formId) {
      removeForm(formId);
    }
  }, [formId, removeForm]);
  
  const resetForm = useCallback(() => {
    reset();
    if (formId && persistValues) {
      removeForm(formId);
    }
  }, [reset, formId, persistValues, removeForm]);
  
  // Utility functions
  const getFieldError = useCallback((field: FieldPath<T>) => {
    return errors[field]?.message;
  }, [errors]);
  
  const isFieldTouched = useCallback((field: FieldPath<T>) => {
    return !!touchedFields[field];
  }, [touchedFields]);
  
  const isFieldDirty = useCallback((field: FieldPath<T>) => {
    return !!dirtyFields[field];
  }, [dirtyFields]);
  
  return {
    ...form,
    isDirty,
    isSubmitting,
    submitCount,
    errors: errors as Record<keyof T, FieldError>,
    touchedFields: touchedFields as Record<keyof T, boolean>,
    dirtyFields: dirtyFields as Record<keyof T, boolean>,
    submitForm: handleSubmit(submitForm),
    resetForm,
    saveFormData,
    loadFormData,
    clearFormData,
    getFieldError,
    isFieldTouched,
    isFieldDirty
  };
}

// Form validation helpers
export const formValidators = {
  // Custom validators
  strongPassword: (password: string) => {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[@$!%*?&]/.test(password)
    };
    
    const score = Object.values(checks).filter(Boolean).length;
    return {
      isValid: score >= 4,
      score,
      checks,
      strength: score <= 2 ? 'weak' : score <= 3 ? 'medium' : score <= 4 ? 'strong' : 'very-strong'
    };
  },
  
  // Credit card validation
  validateCreditCard: (cardNumber: string) => {
    // Luhn algorithm
    const cleaned = cardNumber.replace(/\s/g, '');
    let sum = 0;
    let alternate = false;
    
    for (let i = cleaned.length - 1; i >= 0; i--) {
      let n = parseInt(cleaned.charAt(i), 10);
      
      if (alternate) {
        n *= 2;
        if (n > 9) {
          n = (n % 10) + 1;
        }
      }
      
      sum += n;
      alternate = !alternate;
    }
    
    return sum % 10 === 0;
  },
  
  // Date validation
  isValidDate: (dateString: string) => {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  },
  
  // Age validation
  calculateAge: (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  },
  
  // Phone number formatting
  formatPhoneNumber: (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    
    if (match) {
      return `(${match[1]}) ${match[2]}-${match[3]}`;
    }
    
    return phone;
  },
  
  // Credit card formatting
  formatCreditCard: (cardNumber: string) => {
    const cleaned = cardNumber.replace(/\s/g, '');
    return cleaned.replace(/(.{4})/g, '$1 ').trim();
  }
};

// Export form schemas and types
export type LoginFormData = z.infer<typeof formSchemas.login>;
export type RegisterFormData = z.infer<typeof formSchemas.register>;
export type ProfileFormData = z.infer<typeof formSchemas.profile>;
export type BookingFormData = z.infer<typeof formSchemas.booking>;
export type PaymentFormData = z.infer<typeof formSchemas.payment>;
export type ReviewFormData = z.infer<typeof formSchemas.review>;
export type ContactFormData = z.infer<typeof formSchemas.contactUs>;
export type PropertySearchFormData = z.infer<typeof formSchemas.propertySearch>;

// Cleanup expired forms on app start
if (typeof window !== 'undefined') {
  useFormPersistenceStore.getState().clearExpiredForms();
}