import axios, { 
  AxiosInstance, 
  AxiosRequestConfig, 
  AxiosResponse, 
  AxiosError,
  InternalAxiosRequestConfig 
} from 'axios';
import { ApiResponse, ApiError } from '../types/common';

// Environment configuration
export const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
  timeout: parseInt(import.meta.env.VITE_API_TIMEOUT) || 30000,
  retryAttempts: parseInt(import.meta.env.VITE_API_RETRY_ATTEMPTS) || 3,
  retryDelay: parseInt(import.meta.env.VITE_API_RETRY_DELAY) || 1000,
  enableLogging: import.meta.env.VITE_ENABLE_API_LOGGING === 'true',
  logLevel: import.meta.env.VITE_LOG_LEVEL || 'info',
};

// Token management
class TokenManager {
  private static instance: TokenManager;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private refreshPromise: Promise<string> | null = null;

  private constructor() {
    this.loadTokensFromStorage();
  }

  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  setTokens(accessToken: string, refreshToken: string): void {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.saveTokensToStorage();
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.clearTokensFromStorage();
    this.refreshPromise = null;
  }

  private loadTokensFromStorage(): void {
    try {
      this.accessToken = localStorage.getItem('accessToken');
      this.refreshToken = localStorage.getItem('refreshToken');
    } catch (error) {
      console.warn('Failed to load tokens from storage:', error);
    }
  }

  private saveTokensToStorage(): void {
    try {
      if (this.accessToken) {
        localStorage.setItem('accessToken', this.accessToken);
      }
      if (this.refreshToken) {
        localStorage.setItem('refreshToken', this.refreshToken);
      }
    } catch (error) {
      console.warn('Failed to save tokens to storage:', error);
    }
  }

  private clearTokensFromStorage(): void {
    try {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    } catch (error) {
      console.warn('Failed to clear tokens from storage:', error);
    }
  }

  async refreshAccessToken(): Promise<string> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    this.refreshPromise = this.performTokenRefresh();
    
    try {
      const newToken = await this.refreshPromise;
      return newToken;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async performTokenRefresh(): Promise<string> {
    try {
      const response = await axios.post(`${API_CONFIG.baseURL}/auth/refresh`, {
        refreshToken: this.refreshToken,
      });

      const { accessToken, refreshToken } = response.data.data;
      this.setTokens(accessToken, refreshToken || this.refreshToken);
      
      return accessToken;
    } catch (error) {
      this.clearTokens();
      throw new Error('Token refresh failed');
    }
  }
}

// Request/Response logger
class ApiLogger {
  private static shouldLog(): boolean {
    return API_CONFIG.enableLogging;
  }

  static logRequest(config: InternalAxiosRequestConfig): void {
    if (!this.shouldLog()) return;

    const { method, url, params, data } = config;
    console.group(`🚀 API Request: ${method?.toUpperCase()} ${url}`);
    console.log('📋 Config:', { method, url, params });
    if (data && method !== 'get') {
      console.log('📦 Data:', data);
    }
    console.log('🕐 Timestamp:', new Date().toISOString());
    console.groupEnd();
  }

  static logResponse(response: AxiosResponse): void {
    if (!this.shouldLog()) return;

    const { status, statusText, config, data } = response;
    const duration = Date.now() - (config as any).requestStartTime;
    
    console.group(`✅ API Response: ${config.method?.toUpperCase()} ${config.url}`);
    console.log('📊 Status:', { status, statusText });
    console.log('⏱️ Duration:', `${duration}ms`);
    console.log('📦 Data:', data);
    console.groupEnd();
  }

  static logError(error: AxiosError): void {
    if (!this.shouldLog()) return;

    const { config, response, message } = error;
    const duration = config ? Date.now() - (config as any).requestStartTime : 0;

    console.group(`❌ API Error: ${config?.method?.toUpperCase()} ${config?.url}`);
    console.log('📊 Status:', response?.status || 'Network Error');
    console.log('⏱️ Duration:', `${duration}ms`);
    console.log('📋 Message:', message);
    if (response?.data) {
      console.log('📦 Error Data:', response.data);
    }
    console.groupEnd();
  }
}

// Retry logic
class RetryHandler {
  static async executeWithRetry<T>(
    requestFn: () => Promise<T>,
    maxAttempts: number = API_CONFIG.retryAttempts,
    delay: number = API_CONFIG.retryDelay
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on certain error types
        if (this.shouldNotRetry(error as AxiosError)) {
          throw error;
        }

        if (attempt === maxAttempts) {
          throw lastError;
        }

        // Calculate exponential backoff delay
        const backoffDelay = delay * Math.pow(2, attempt - 1);
        await this.sleep(backoffDelay);
      }
    }

    throw lastError!;
  }

  private static shouldNotRetry(error: AxiosError): boolean {
    // Don't retry on authentication errors, client errors (4xx), etc.
    const status = error.response?.status;
    if (!status) return false;

    return status >= 400 && status < 500 && status !== 429; // Don't retry 4xx except rate limit
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Error handler
class ErrorHandler {
  static handleApiError(error: AxiosError): ApiError {
    const timestamp = new Date().toISOString();
    const path = error.config?.url || '';
    const method = error.config?.method?.toUpperCase() || '';

    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      return {
        code: `HTTP_${status}`,
        message: data?.message || error.message || `HTTP ${status} Error`,
        details: data?.details || data,
        timestamp,
        path,
        method,
      };
    } else if (error.request) {
      // Network error
      return {
        code: 'NETWORK_ERROR',
        message: 'Network error - please check your connection',
        details: { originalError: error.message },
        timestamp,
        path,
        method,
      };
    } else {
      // Request setup error
      return {
        code: 'REQUEST_ERROR',
        message: error.message || 'Request configuration error',
        details: { originalError: error.message },
        timestamp,
        path,
        method,
      };
    }
  }

  static createUserFriendlyMessage(error: ApiError): string {
    switch (error.code) {
      case 'HTTP_401':
        return 'Please log in to continue';
      case 'HTTP_403':
        return 'You do not have permission to perform this action';
      case 'HTTP_404':
        return 'The requested resource was not found';
      case 'HTTP_429':
        return 'Too many requests. Please try again later';
      case 'HTTP_500':
        return 'Server error. Please try again later';
      case 'NETWORK_ERROR':
        return 'Network error. Please check your internet connection';
      default:
        return error.message || 'An unexpected error occurred';
    }
  }
}

// Main API client class
export class ApiClient {
  private axiosInstance: AxiosInstance;
  private tokenManager: TokenManager;

  constructor(config: Partial<AxiosRequestConfig> = {}) {
    this.tokenManager = TokenManager.getInstance();
    
    this.axiosInstance = axios.create({
      baseURL: API_CONFIG.baseURL,
      timeout: API_CONFIG.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      ...config,
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        // Add timestamp for logging
        (config as any).requestStartTime = Date.now();
        
        // Add authentication token
        const token = this.tokenManager.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add request ID for tracking
        config.headers['X-Request-ID'] = this.generateRequestId();

        // Log request
        ApiLogger.logRequest(config);

        return config;
      },
      (error) => {
        ApiLogger.logError(error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => {
        ApiLogger.logResponse(response);
        return response;
      },
      async (error: AxiosError) => {
        ApiLogger.logError(error);

        // Handle token refresh
        if (error.response?.status === 401 && !error.config?.url?.includes('/auth/refresh')) {
          try {
            const newToken = await this.tokenManager.refreshAccessToken();
            
            // Retry original request with new token
            if (error.config) {
              error.config.headers.Authorization = `Bearer ${newToken}`;
              return this.axiosInstance.request(error.config);
            }
          } catch (refreshError) {
            // Refresh failed, redirect to login
            this.tokenManager.clearTokens();
            // Emit event for app to handle redirect
            window.dispatchEvent(new CustomEvent('auth:logout'));
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // HTTP methods with retry logic
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return RetryHandler.executeWithRetry(async () => {
      const response = await this.axiosInstance.get<ApiResponse<T>>(url, config);
      return response.data;
    });
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return RetryHandler.executeWithRetry(async () => {
      const response = await this.axiosInstance.post<ApiResponse<T>>(url, data, config);
      return response.data;
    });
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return RetryHandler.executeWithRetry(async () => {
      const response = await this.axiosInstance.put<ApiResponse<T>>(url, data, config);
      return response.data;
    });
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return RetryHandler.executeWithRetry(async () => {
      const response = await this.axiosInstance.patch<ApiResponse<T>>(url, data, config);
      return response.data;
    });
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return RetryHandler.executeWithRetry(async () => {
      const response = await this.axiosInstance.delete<ApiResponse<T>>(url, config);
      return response.data;
    });
  }

  // File upload method
  async upload<T = any>(url: string, file: File | FormData, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const formData = file instanceof FormData ? file : new FormData();
    if (file instanceof File) {
      formData.append('file', file);
    }

    return this.post<T>(url, formData, {
      ...config,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...config?.headers,
      },
    });
  }

  // Multiple file upload method
  async uploadMultiple<T = any>(url: string, files: File[], config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append(`files[${index}]`, file);
    });

    return this.post<T>(url, formData, {
      ...config,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...config?.headers,
      },
    });
  }

  // Download method
  async download(url: string, config?: AxiosRequestConfig): Promise<Blob> {
    const response = await this.axiosInstance.get(url, {
      ...config,
      responseType: 'blob',
    });
    return response.data;
  }

  // Set authentication tokens
  setAuthTokens(accessToken: string, refreshToken: string): void {
    this.tokenManager.setTokens(accessToken, refreshToken);
  }

  // Clear authentication tokens
  clearAuthTokens(): void {
    this.tokenManager.clearTokens();
  }

  // Get current access token
  getAccessToken(): string | null {
    return this.tokenManager.getAccessToken();
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.tokenManager.getAccessToken();
  }

  // Handle API errors
  handleError(error: any): ApiError {
    return ErrorHandler.handleApiError(error);
  }

  // Get user-friendly error message
  getErrorMessage(error: ApiError): string {
    return ErrorHandler.createUserFriendlyMessage(error);
  }
}

// Create and export default API client instance
export const apiClient = new ApiClient();

// Export utility functions
export { TokenManager, ApiLogger, RetryHandler, ErrorHandler };