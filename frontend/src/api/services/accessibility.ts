/**
 * Accessibility Service for TouriQuest API
 * 
 * Features:
 * - Voice command system and voice navigation
 * - Screen reader optimization and ARIA support
 * - Adaptive UI based on user accessibility needs
 * - Real-time accessibility compliance monitoring
 * - Assistive technology integration
 * - Multi-modal interaction support
 */

import { ApiClient } from '../core/ApiClient';

export interface AccessibilityProfile {
  userId: string;
  visualImpairments: VisualImpairment[];
  hearingImpairments: HearingImpairment[];
  motorImpairments: MotorImpairment[];
  cognitiveSupport: CognitiveSupport[];
  preferences: AccessibilityPreferences;
  assistiveTechnology: AssistiveTechnology[];
  customizations: UICustomizations;
  voiceSettings: VoiceSettings;
  lastUpdated: string;
}

export interface VisualImpairment {
  type: 'blind' | 'low_vision' | 'color_blind' | 'light_sensitive';
  severity: 'mild' | 'moderate' | 'severe' | 'complete';
  specificCondition?: string;
  assistiveDevices: string[];
  preferences: {
    screenReader: string;
    magnification: number;
    highContrast: boolean;
    fontSize: number;
    colorFilters: string[];
  };
}

export interface HearingImpairment {
  type: 'deaf' | 'hard_of_hearing' | 'auditory_processing';
  severity: 'mild' | 'moderate' | 'severe' | 'profound';
  hearingAids: boolean;
  cochlearImplant: boolean;
  signLanguage: string[];
  captionsRequired: boolean;
  visualAlerts: boolean;
}

export interface MotorImpairment {
  type: 'limited_mobility' | 'paralysis' | 'amputation' | 'fine_motor_control';
  affectedLimbs: string[];
  mobilityAids: string[];
  inputMethods: string[];
  preferences: {
    dwellTime: number;
    switchNavigation: boolean;
    voiceControl: boolean;
    eyeTracking: boolean;
    headTracking: boolean;
  };
}

export interface CognitiveSupport {
  type: 'memory' | 'attention' | 'processing_speed' | 'language' | 'executive_function';
  supportNeeds: string[];
  preferences: {
    simplifiedInterface: boolean;
    stepByStepGuidance: boolean;
    extraTime: boolean;
    reminderAlerts: boolean;
    clearInstructions: boolean;
  };
}

export interface AccessibilityPreferences {
  preferredLanguages: string[];
  communicationMethods: string[];
  navigationStyle: 'keyboard' | 'voice' | 'gesture' | 'switch' | 'eye_tracking';
  feedbackTypes: string[];
  alertPreferences: AlertPreferences;
  contentPreferences: ContentPreferences;
}

export interface AlertPreferences {
  visual: boolean;
  audio: boolean;
  haptic: boolean;
  duration: number;
  urgencyLevels: Record<string, boolean>;
}

export interface ContentPreferences {
  textAlternatives: boolean;
  audioDescriptions: boolean;
  signLanguageVideos: boolean;
  simplifiedLanguage: boolean;
  pictorialSupport: boolean;
}

export interface AssistiveTechnology {
  type: 'screen_reader' | 'voice_recognition' | 'eye_tracker' | 'switch_device' | 'magnifier';
  name: string;
  version?: string;
  capabilities: string[];
  configuration: Record<string, any>;
}

export interface UICustomizations {
  theme: 'light' | 'dark' | 'high_contrast' | 'custom';
  fontSize: number;
  fontFamily: string;
  colorScheme: ColorScheme;
  layout: LayoutCustomizations;
  animations: AnimationSettings;
  interactions: InteractionSettings;
}

export interface ColorScheme {
  primary: string;
  secondary: string;
  background: string;
  text: string;
  contrast: number;
  colorBlindnessFilter?: string;
}

export interface LayoutCustomizations {
  simplifiedLayout: boolean;
  largerClickTargets: boolean;
  reducedClutter: boolean;
  focusIndicators: boolean;
  skipLinks: boolean;
  breadcrumbs: boolean;
}

export interface AnimationSettings {
  enabled: boolean;
  reducedMotion: boolean;
  speed: number;
  respectSystemSettings: boolean;
}

export interface InteractionSettings {
  dwellTime: number;
  doubleClickTime: number;
  dragThreshold: number;
  keyboardOnly: boolean;
  mouseKeys: boolean;
  stickyKeys: boolean;
}

export interface VoiceSettings {
  enabled: boolean;
  language: string;
  voiceType: string;
  speed: number;
  pitch: number;
  volume: number;
  wakeWord: string;
  continuousListening: boolean;
  voiceCommands: VoiceCommand[];
}

export interface VoiceCommand {
  command: string;
  action: string;
  context?: string[];
  parameters?: Record<string, any>;
  confirmation: boolean;
}

export interface AccessibilityViolation {
  id: string;
  type: 'wcag_aa' | 'wcag_aaa' | 'section_508' | 'ada' | 'custom';
  severity: 'critical' | 'serious' | 'moderate' | 'minor';
  element: string;
  description: string;
  impact: string;
  helpUrl: string;
  solution: string;
  location: {
    page: string;
    selector: string;
    xpath: string;
  };
}

export interface AccessibilityAudit {
  timestamp: string;
  page: string;
  standard: string;
  score: number;
  violations: AccessibilityViolation[];
  passes: number;
  incomplete: number;
  summary: {
    critical: number;
    serious: number;
    moderate: number;
    minor: number;
  };
}

export interface VoiceInteractionRequest {
  command: string;
  context: VoiceContext;
  userId?: string;
  sessionId: string;
  timestamp: string;
}

export interface VoiceContext {
  currentPage: string;
  focusedElement?: string;
  userLocation?: [number, number];
  previousCommand?: string;
  conversationHistory: string[];
  ambientNoise?: number;
  confidence: number;
}

export interface VoiceResponse {
  text: string;
  audioUrl?: string;
  action?: VoiceAction;
  followUpQuestions?: string[];
  confidence: number;
  understood: boolean;
}

export interface VoiceAction {
  type: 'navigate' | 'click' | 'focus' | 'scroll' | 'fill_form' | 'read_content';
  target?: string;
  parameters?: Record<string, any>;
  confirmation?: string;
}

export interface ScreenReaderContent {
  pageTitle: string;
  headings: HeadingStructure[];
  landmarks: Landmark[];
  focusableElements: FocusableElement[];
  ariaLabels: AriaLabel[];
  alternativeText: AlternativeText[];
  liveRegions: LiveRegion[];
}

export interface HeadingStructure {
  level: number;
  text: string;
  id?: string;
  landmark?: string;
}

export interface Landmark {
  role: string;
  label?: string;
  description?: string;
  selector: string;
}

export interface FocusableElement {
  tagName: string;
  type?: string;
  label: string;
  description?: string;
  selector: string;
  tabIndex: number;
}

export interface AriaLabel {
  element: string;
  label: string;
  description?: string;
  role?: string;
}

export interface AlternativeText {
  imageUrl: string;
  altText: string;
  longDescription?: string;
  context: string;
}

export interface LiveRegion {
  selector: string;
  politeness: 'off' | 'polite' | 'assertive';
  atomic: boolean;
  relevant: string[];
}

export interface AdaptiveUIRequest {
  userId: string;
  currentContext: UIContext;
  accessibilityNeeds: string[];
  deviceCapabilities: DeviceCapabilities;
}

export interface UIContext {
  page: string;
  viewport: {
    width: number;
    height: number;
  };
  userAgent: string;
  inputMethods: string[];
  ambientLight?: number;
  motionReduced?: boolean;
}

export interface DeviceCapabilities {
  hasCamera: boolean;
  hasMicrophone: boolean;
  hasAccelerometer: boolean;
  hasGyroscope: boolean;
  hasHapticFeedback: boolean;
  hasVibration: boolean;
  hasScreenReader: boolean;
  hasVoiceControl: boolean;
}

export interface AdaptiveUIResponse {
  adaptations: UIAdaptation[];
  customCSS?: string;
  scriptAdjustments?: string[];
  layoutChanges: LayoutChange[];
  interactionModifications: InteractionModification[];
}

export interface UIAdaptation {
  type: 'layout' | 'color' | 'font' | 'interaction' | 'content' | 'navigation';
  description: string;
  cssRules?: string;
  jsCode?: string;
  priority: number;
}

export interface LayoutChange {
  selector: string;
  changes: Record<string, string>;
  reason: string;
}

export interface InteractionModification {
  element: string;
  modification: string;
  parameters: Record<string, any>;
}

export interface AccessibilityCompliance {
  standard: 'WCAG_2_1_AA' | 'WCAG_2_1_AAA' | 'Section_508' | 'ADA' | 'EN_301_549';
  level: 'A' | 'AA' | 'AAA';
  compliance: number;
  violations: AccessibilityViolation[];
  recommendations: string[];
  lastAudit: string;
}

export interface RealTimeAccessibilityFeedback {
  element: string;
  issues: AccessibilityIssue[];
  suggestions: AccessibilitySuggestion[];
  score: number;
}

export interface AccessibilityIssue {
  type: string;
  severity: string;
  description: string;
  impact: string;
  solution: string;
}

export interface AccessibilitySuggestion {
  type: 'improvement' | 'alternative' | 'enhancement';
  description: string;
  implementation: string;
  benefit: string;
}

export class AccessibilityService {
  constructor(private apiClient: ApiClient) {}

  /**
   * Get user accessibility profile
   */
  async getAccessibilityProfile(userId: string): Promise<AccessibilityProfile> {
    const response = await this.apiClient.get<AccessibilityProfile>(
      `/accessibility/profile/${userId}`
    );
    return response.data;
  }

  /**
   * Update accessibility profile
   */
  async updateAccessibilityProfile(
    userId: string,
    profile: Partial<AccessibilityProfile>
  ): Promise<AccessibilityProfile> {
    const response = await this.apiClient.put<AccessibilityProfile>(
      `/accessibility/profile/${userId}`,
      profile
    );
    return response.data;
  }

  /**
   * Process voice command
   */
  async processVoiceCommand(request: VoiceInteractionRequest): Promise<VoiceResponse> {
    const response = await this.apiClient.post<VoiceResponse>(
      '/accessibility/voice/command',
      request
    );
    return response.data;
  }

  /**
   * Get voice commands for current context
   */
  async getAvailableVoiceCommands(
    context: VoiceContext,
    userId?: string
  ): Promise<VoiceCommand[]> {
    const response = await this.apiClient.post<VoiceCommand[]>(
      '/accessibility/voice/commands',
      { context, userId }
    );
    return response.data;
  }

  /**
   * Get optimized screen reader content
   */
  async getScreenReaderContent(
    pageUrl: string,
    userId?: string
  ): Promise<ScreenReaderContent> {
    const response = await this.apiClient.get<ScreenReaderContent>(
      '/accessibility/screen-reader/content',
      {
        params: { pageUrl, userId }
      }
    );
    return response.data;
  }

  /**
   * Get adaptive UI configuration
   */
  async getAdaptiveUI(request: AdaptiveUIRequest): Promise<AdaptiveUIResponse> {
    const response = await this.apiClient.post<AdaptiveUIResponse>(
      '/accessibility/adaptive-ui',
      request
    );
    return response.data;
  }

  /**
   * Run accessibility audit
   */
  async runAccessibilityAudit(
    pageUrl: string,
    standard?: string
  ): Promise<AccessibilityAudit> {
    const response = await this.apiClient.post<AccessibilityAudit>(
      '/accessibility/audit',
      { pageUrl, standard }
    );
    return response.data;
  }

  /**
   * Get accessibility compliance status
   */
  async getComplianceStatus(
    pageUrl?: string,
    standard?: string
  ): Promise<AccessibilityCompliance> {
    const response = await this.apiClient.get<AccessibilityCompliance>(
      '/accessibility/compliance',
      {
        params: { pageUrl, standard }
      }
    );
    return response.data;
  }

  /**
   * Get real-time accessibility feedback
   */
  async getRealTimeAccessibilityFeedback(
    element: string,
    context?: string
  ): Promise<RealTimeAccessibilityFeedback> {
    const response = await this.apiClient.post<RealTimeAccessibilityFeedback>(
      '/accessibility/feedback/real-time',
      { element, context }
    );
    return response.data;
  }

  /**
   * Report accessibility issue
   */
  async reportAccessibilityIssue(
    issue: AccessibilityViolation,
    userId?: string
  ): Promise<{ issueId: string }> {
    const response = await this.apiClient.post<{ issueId: string }>(
      '/accessibility/issues/report',
      { issue, userId }
    );
    return response.data;
  }

  /**
   * Get accessibility recommendations
   */
  async getAccessibilityRecommendations(
    userId: string,
    context?: string
  ): Promise<AccessibilitySuggestion[]> {
    const response = await this.apiClient.get<AccessibilitySuggestion[]>(
      `/accessibility/recommendations/${userId}`,
      {
        params: { context }
      }
    );
    return response.data;
  }

  /**
   * Convert text to accessible format
   */
  async convertToAccessibleFormat(
    content: string,
    format: 'braille' | 'simple_language' | 'pictorial' | 'audio',
    userId?: string
  ): Promise<{ convertedContent: string; metadata: Record<string, any> }> {
    const response = await this.apiClient.post<{
      convertedContent: string;
      metadata: Record<string, any>;
    }>('/accessibility/convert', {
      content,
      format,
      userId
    });
    return response.data;
  }

  /**
   * Generate alternative text for images
   */
  async generateAltText(
    imageUrl: string,
    context?: string
  ): Promise<{ altText: string; confidence: number; longDescription?: string }> {
    const response = await this.apiClient.post<{
      altText: string;
      confidence: number;
      longDescription?: string;
    }>('/accessibility/alt-text/generate', {
      imageUrl,
      context
    });
    return response.data;
  }

  /**
   * Optimize content for cognitive accessibility
   */
  async optimizeForCognitive(
    content: string,
    optimizations: string[]
  ): Promise<{ optimizedContent: string; changes: string[] }> {
    const response = await this.apiClient.post<{
      optimizedContent: string;
      changes: string[];
    }>('/accessibility/cognitive/optimize', {
      content,
      optimizations
    });
    return response.data;
  }

  /**
   * Get keyboard navigation map
   */
  async getKeyboardNavigationMap(
    pageUrl: string
  ): Promise<{
    focusOrder: FocusableElement[];
    shortcuts: Record<string, string>;
    landmarks: Landmark[];
  }> {
    const response = await this.apiClient.get<{
      focusOrder: FocusableElement[];
      shortcuts: Record<string, string>;
      landmarks: Landmark[];
    }>('/accessibility/keyboard/navigation', {
      params: { pageUrl }
    });
    return response.data;
  }

  /**
   * Configure assistive technology integration
   */
  async configureAssistiveTechnology(
    userId: string,
    technology: AssistiveTechnology
  ): Promise<{ success: boolean; configuration: Record<string, any> }> {
    const response = await this.apiClient.post<{
      success: boolean;
      configuration: Record<string, any>;
    }>(`/accessibility/assistive-tech/${userId}`, technology);
    return response.data;
  }

  /**
   * Test accessibility with assistive technology
   */
  async testWithAssistiveTechnology(
    pageUrl: string,
    technology: string
  ): Promise<{
    results: AccessibilityAudit;
    compatibility: number;
    issues: AccessibilityIssue[];
  }> {
    const response = await this.apiClient.post<{
      results: AccessibilityAudit;
      compatibility: number;
      issues: AccessibilityIssue[];
    }>('/accessibility/test/assistive-tech', {
      pageUrl,
      technology
    });
    return response.data;
  }

  /**
   * Monitor accessibility in real-time
   */
  async startAccessibilityMonitoring(
    userId: string,
    pages: string[]
  ): Promise<{ monitoringId: string; status: string }> {
    const response = await this.apiClient.post<{
      monitoringId: string;
      status: string;
    }>('/accessibility/monitoring/start', {
      userId,
      pages
    });
    return response.data;
  }

  /**
   * Get accessibility monitoring results
   */
  async getMonitoringResults(
    monitoringId: string
  ): Promise<{
    results: AccessibilityAudit[];
    trends: Record<string, number>;
    alerts: AccessibilityIssue[];
  }> {
    const response = await this.apiClient.get<{
      results: AccessibilityAudit[];
      trends: Record<string, number>;
      alerts: AccessibilityIssue[];
    }>(`/accessibility/monitoring/${monitoringId}`);
    return response.data;
  }
}