/**
 * Service Factory for TouriQuest API
 * 
 * Central factory for creating and managing API service instances
 * with dependency injection and configuration management
 */

import { ApiClient, ApiClientConfig, createApiClient, defaultConfig } from '../core/ApiClient';
import { AuthService } from './services/auth';
import { PropertyService } from './services/property';
import { POIService } from './services/poi';
import { ExperienceService } from './services/experience';
import { AIService } from './services/ai';
import { BookingService } from './services/booking';
import { RecommendationService } from './services/recommendation';
import { AccessibilityService } from './services/accessibility';

export interface ServiceFactoryConfig extends Partial<ApiClientConfig> {
  enableAnalytics?: boolean;
  enableAdmin?: boolean;
  enableMedia?: boolean;
  enableNotifications?: boolean;
  enableRecommendations?: boolean;
  enableCommunication?: boolean;
  enableIntegrations?: boolean;
  enableMonitoring?: boolean;
}

export interface TouriQuestServices {
  auth: AuthService;
  property: PropertyService;
  poi: POIService;
  experience: ExperienceService;
  ai: AIService;
  booking: BookingService;
  recommendation: RecommendationService;
  accessibility: AccessibilityService;
  analytics?: AnalyticsService;
  admin?: AdminService;
  media?: MediaService;
  notification?: NotificationService;
  communication?: CommunicationService;
  integration?: IntegrationService;
  monitoring?: MonitoringService;
}

// Placeholder interfaces for future services
export interface AnalyticsService {
  getMetrics(): Promise<any>;
  trackEvent(event: string, data: any): Promise<void>;
}

export interface AdminService {
  getUsers(): Promise<any>;
  updateUserRole(userId: string, role: string): Promise<void>;
}

export interface MediaService {
  uploadFile(file: File): Promise<any>;
  getMedia(id: string): Promise<any>;
}

export interface NotificationService {
  sendNotification(notification: any): Promise<void>;
  getNotifications(): Promise<any>;
}



export interface CommunicationService {
  sendMessage(message: any): Promise<void>;
  getMessages(): Promise<any>;
}

export interface IntegrationService {
  connectService(service: string, config: any): Promise<void>;
  getIntegrations(): Promise<any>;
}

export interface MonitoringService {
  getSystemHealth(): Promise<any>;
  getMetrics(): Promise<any>;
}

export class ServiceFactory {
  private apiClient: ApiClient;
  private services: Partial<TouriQuestServices> = {};
  private config: ServiceFactoryConfig;

  constructor(config: ServiceFactoryConfig = {}) {
    this.config = { ...defaultConfig, ...config };
    this.apiClient = createApiClient(this.config as ApiClientConfig);
    this.initializeCoreServices();
  }

  private initializeCoreServices(): void {
    // Core services - always available
    this.services.auth = new AuthService(this.apiClient);
    this.services.property = new PropertyService(this.apiClient);
    this.services.poi = new POIService(this.apiClient);
    this.services.experience = new ExperienceService(this.apiClient);
    this.services.ai = new AIService(this.apiClient);
    this.services.booking = new BookingService(this.apiClient);
    this.services.recommendation = new RecommendationService(this.apiClient);
    this.services.accessibility = new AccessibilityService(this.apiClient);
  }

  private initializeOptionalServices(): void {
    // Optional services based on configuration
    if (this.config.enableAnalytics) {
      this.services.analytics = this.createAnalyticsService();
    }

    if (this.config.enableAdmin) {
      this.services.admin = this.createAdminService();
    }

    if (this.config.enableMedia) {
      this.services.media = this.createMediaService();
    }

    if (this.config.enableNotifications) {
      this.services.notification = this.createNotificationService();
    }

    // Recommendation service is now part of core services

    if (this.config.enableCommunication) {
      this.services.communication = this.createCommunicationService();
    }

    if (this.config.enableIntegrations) {
      this.services.integration = this.createIntegrationService();
    }

    if (this.config.enableMonitoring) {
      this.services.monitoring = this.createMonitoringService();
    }
  }

  // Core service getters
  get auth(): AuthService {
    return this.services.auth!;
  }

  get property(): PropertyService {
    return this.services.property!;
  }

  get poi(): POIService {
    return this.services.poi!;
  }

  get experience(): ExperienceService {
    return this.services.experience!;
  }

  get ai(): AIService {
    return this.services.ai!;
  }

  get booking(): BookingService {
    return this.services.booking!;
  }

  get recommendation(): RecommendationService {
    return this.services.recommendation!;
  }

  get accessibility(): AccessibilityService {
    return this.services.accessibility!;
  }

  // Optional service getters
  get analytics(): AnalyticsService | undefined {
    return this.services.analytics;
  }

  get admin(): AdminService | undefined {
    return this.services.admin;
  }

  get media(): MediaService | undefined {
    return this.services.media;
  }

  get notification(): NotificationService | undefined {
    return this.services.notification;
  }



  get communication(): CommunicationService | undefined {
    return this.services.communication;
  }

  get integration(): IntegrationService | undefined {
    return this.services.integration;
  }

  get monitoring(): MonitoringService | undefined {
    return this.services.monitoring;
  }

  // Factory methods for optional services
  private createAnalyticsService(): AnalyticsService {
    return {
      async getMetrics() {
        const response = await this.apiClient.get('/analytics/metrics');
        return response.data;
      },
      async trackEvent(event: string, data: any) {
        await this.apiClient.post('/analytics/events', { event, data });
      }
    };
  }

  private createAdminService(): AdminService {
    return {
      async getUsers() {
        const response = await this.apiClient.get('/admin/users');
        return response.data;
      },
      async updateUserRole(userId: string, role: string) {
        await this.apiClient.put(`/admin/users/${userId}/role`, { role });
      }
    };
  }

  private createMediaService(): MediaService {
    return {
      async uploadFile(file: File) {
        const formData = new FormData();
        formData.append('file', file);
        const response = await this.apiClient.post('/media/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
      },
      async getMedia(id: string) {
        const response = await this.apiClient.get(`/media/${id}`);
        return response.data;
      }
    };
  }

  private createNotificationService(): NotificationService {
    return {
      async sendNotification(notification: any) {
        await this.apiClient.post('/notifications/', notification);
      },
      async getNotifications() {
        const response = await this.apiClient.get('/notifications/');
        return response.data;
      }
    };
  }

  // Recommendation service is now part of core services

  private createCommunicationService(): CommunicationService {
    return {
      async sendMessage(message: any) {
        await this.apiClient.post('/communication/messages', message);
      },
      async getMessages() {
        const response = await this.apiClient.get('/communication/messages');
        return response.data;
      }
    };
  }

  private createIntegrationService(): IntegrationService {
    return {
      async connectService(service: string, config: any) {
        await this.apiClient.post('/integrations/connect', { service, config });
      },
      async getIntegrations() {
        const response = await this.apiClient.get('/integrations/');
        return response.data;
      }
    };
  }

  private createMonitoringService(): MonitoringService {
    return {
      async getSystemHealth() {
        const response = await this.apiClient.get('/monitoring/health');
        return response.data;
      },
      async getMetrics() {
        const response = await this.apiClient.get('/monitoring/metrics');
        return response.data;
      }
    };
  }

  // Service management methods
  getAllServices(): TouriQuestServices {
    this.initializeOptionalServices();
    return this.services as TouriQuestServices;
  }

  updateConfig(newConfig: Partial<ServiceFactoryConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.apiClient.updateConfig(newConfig as Partial<ApiClientConfig>);
    
    // Re-initialize optional services if config changed
    this.initializeOptionalServices();
  }

  async healthCheck(): Promise<{ status: string; services: Record<string, boolean> }> {
    return this.apiClient.healthCheck();
  }

  getMetrics(): any {
    return this.apiClient.getMetrics();
  }

  clearCache(): Promise<void> {
    return this.apiClient.clearCache();
  }

  destroy(): void {
    this.apiClient.destroy();
    this.services = {};
  }
}

// Singleton factory instance
let factoryInstance: ServiceFactory | null = null;

export const createServiceFactory = (config?: ServiceFactoryConfig): ServiceFactory => {
  if (!factoryInstance) {
    factoryInstance = new ServiceFactory(config);
  }
  return factoryInstance;
};

export const getServiceFactory = (): ServiceFactory => {
  if (!factoryInstance) {
    throw new Error('Service factory not initialized. Call createServiceFactory first.');
  }
  return factoryInstance;
};

export const destroyServiceFactory = (): void => {
  if (factoryInstance) {
    factoryInstance.destroy();
    factoryInstance = null;
  }
};

// Default factory configuration for different environments
export const developmentConfig: ServiceFactoryConfig = {
  ...defaultConfig,
  environment: 'development',
  enableLogging: true,
  enableMetrics: true,
  enableAnalytics: true,
  enableAdmin: true,
  enableMedia: true,
  enableNotifications: true,
  enableRecommendations: true,
  enableCommunication: true,
  enableIntegrations: true,
  enableMonitoring: true,
};

export const productionConfig: ServiceFactoryConfig = {
  ...defaultConfig,
  environment: 'production',
  enableLogging: false,
  enableMetrics: true,
  enableAnalytics: true,
  enableAdmin: false,
  enableMedia: true,
  enableNotifications: true,
  enableRecommendations: true,
  enableCommunication: true,
  enableIntegrations: true,
  enableMonitoring: true,
};

// Default export for convenience
export default ServiceFactory;