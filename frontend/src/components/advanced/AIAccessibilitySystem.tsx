import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, 
  MicOff, 
  Eye, 
  EyeOff, 
  Volume2, 
  VolumeX,
  Type,
  Contrast,
  MousePointer,
  Keyboard,
  Accessibility,
  Settings,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  ChevronUp,
  ChevronDown,
  Info,
  Check,
  X,
  Lightbulb,
  Zap,
  Brain,
  Users,
  Shield,
  Monitor,
  Headphones,
  Hand
} from 'lucide-react';
import { AccessibilityService, AccessibilityProfile, VoiceInteractionRequest, VoiceResponse, ScreenReaderContent, UICustomizations, AdaptiveUIRequest } from '../../api/services/accessibility';
import { getServiceFactory } from '../../api/ServiceFactory';

interface AIAccessibilitySystemProps {
  userId?: string;
  className?: string;
  onProfileUpdate?: (profile: AccessibilityProfile) => void;
  onVoiceCommand?: (command: string, response: VoiceResponse) => void;
}

interface VoiceState {
  isListening: boolean;
  isProcessing: boolean;
  lastCommand: string;
  confidence: number;
  wakeWordDetected: boolean;
}

interface AccessibilityState {
  profile: AccessibilityProfile | null;
  activeFeatures: Set<string>;
  voiceCommands: string[];
  currentAnnouncement: string;
  screenReaderActive: boolean;
  highContrastMode: boolean;
  largeTextMode: boolean;
  keyboardNavigationMode: boolean;
  voiceControlActive: boolean;
}

export const AIAccessibilitySystem: React.FC<AIAccessibilitySystemProps> = ({
  userId,
  className,
  onProfileUpdate,
  onVoiceCommand
}) => {
  const [accessibilityState, setAccessibilityState] = useState<AccessibilityState>({
    profile: null,
    activeFeatures: new Set(),
    voiceCommands: [],
    currentAnnouncement: '',
    screenReaderActive: false,
    highContrastMode: false,
    largeTextMode: false,
    keyboardNavigationMode: false,
    voiceControlActive: false
  });

  const [voiceState, setVoiceState] = useState<VoiceState>({
    isListening: false,
    isProcessing: false,
    lastCommand: '',
    confidence: 0,
    wakeWordDetected: false
  });

  const [isExpanded, setIsExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [announcements, setAnnouncements] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const voiceRecognitionRef = useRef<any>(null);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const focusMonitorRef = useRef<HTMLElement | null>(null);
  const keyboardListenerRef = useRef<((e: KeyboardEvent) => void) | null>(null);

  const accessibilityService = useMemo(() => {
    const factory = getServiceFactory();
    return factory.accessibility;
  }, []);

  // Initialize accessibility system
  useEffect(() => {
    initializeAccessibilitySystem();
    setupKeyboardListeners();
    setupFocusMonitoring();
    
    return () => {
      cleanup();
    };
  }, [userId]);

  // Setup voice recognition
  useEffect(() => {
    if (accessibilityState.voiceControlActive && 'webkitSpeechRecognition' in window) {
      setupVoiceRecognition();
    }
    
    return () => {
      if (voiceRecognitionRef.current) {
        voiceRecognitionRef.current.stop();
      }
    };
  }, [accessibilityState.voiceControlActive]);

  const initializeAccessibilitySystem = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Load user accessibility profile
      const profile = await accessibilityService.getAccessibilityProfile(userId);
      
      setAccessibilityState(prev => ({
        ...prev,
        profile,
        screenReaderActive: profile.assistiveTechnology.some(at => at.type === 'screen_reader'),
        highContrastMode: profile.customizations.theme === 'high_contrast',
        largeTextMode: profile.customizations.fontSize > 16,
        keyboardNavigationMode: profile.preferences.navigationStyle === 'keyboard',
        voiceControlActive: profile.voiceSettings.enabled
      }));

      // Apply saved customizations
      applyAccessibilityCustomizations(profile.customizations);

      // Get available voice commands
      if (profile.voiceSettings.enabled) {
        const commands = await accessibilityService.getAvailableVoiceCommands({
          currentPage: window.location.pathname,
          conversationHistory: [],
          confidence: 1.0
        }, userId);
        
        setAccessibilityState(prev => ({
          ...prev,
          voiceCommands: commands.map(cmd => cmd.command)
        }));
      }

      // Announce system ready
      announceToUser('Accessibility system initialized and ready');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize accessibility system');
      console.error('Accessibility system initialization error:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, accessibilityService]);

  const setupVoiceRecognition = useCallback(() => {
    if (!('webkitSpeechRecognition' in window)) {
      console.warn('Speech recognition not supported');
      return;
    }

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = accessibilityState.profile?.preferences.preferredLanguages[0] || 'en-US';

    recognition.onstart = () => {
      setVoiceState(prev => ({ ...prev, isListening: true }));
      announceToUser('Voice control activated');
    };

    recognition.onresult = async (event: any) => {
      const last = event.results.length - 1;
      const command = event.results[last][0].transcript.toLowerCase().trim();
      const confidence = event.results[last][0].confidence;

      setVoiceState(prev => ({ 
        ...prev, 
        lastCommand: command,
        confidence: confidence 
      }));

      if (event.results[last].isFinal && confidence > 0.7) {
        await processVoiceCommand(command, confidence);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setVoiceState(prev => ({ ...prev, isListening: false, isProcessing: false }));
      
      if (event.error === 'no-speech') {
        announceToUser('No speech detected. Try again.');
      } else {
        announceToUser('Voice recognition error. Please try again.');
      }
    };

    recognition.onend = () => {
      setVoiceState(prev => ({ ...prev, isListening: false }));
      
      // Restart if voice control is still active
      if (accessibilityState.voiceControlActive) {
        setTimeout(() => {
          recognition.start();
        }, 1000);
      }
    };

    voiceRecognitionRef.current = recognition;
    recognition.start();
  }, [accessibilityState.profile, accessibilityState.voiceControlActive]);

  const processVoiceCommand = useCallback(async (command: string, confidence: number) => {
    if (!userId) return;

    try {
      setVoiceState(prev => ({ ...prev, isProcessing: true }));

      const request: VoiceInteractionRequest = {
        command,
        context: {
          currentPage: window.location.pathname,
          focusedElement: document.activeElement?.tagName.toLowerCase(),
          conversationHistory: [accessibilityState.currentAnnouncement],
          confidence
        },
        userId,
        sessionId: `accessibility-${Date.now()}`,
        timestamp: new Date().toISOString()
      };

      const response = await accessibilityService.processVoiceCommand(request);

      if (response.understood) {
        // Execute the voice action
        if (response.action) {
          await executeVoiceAction(response.action);
        }

        // Announce the response
        announceToUser(response.text);

        if (onVoiceCommand) {
          onVoiceCommand(command, response);
        }
      } else {
        announceToUser("Sorry, I didn't understand that command. Try saying 'help' for available commands.");
      }

    } catch (err) {
      console.error('Voice command processing error:', err);
      announceToUser('Error processing voice command');
    } finally {
      setVoiceState(prev => ({ ...prev, isProcessing: false }));
    }
  }, [userId, accessibilityState.currentAnnouncement, accessibilityService, onVoiceCommand]);

  const executeVoiceAction = useCallback(async (action: any) => {
    switch (action.type) {
      case 'navigate':
        if (action.target) {
          window.location.href = action.target;
        }
        break;
        
      case 'click':
        const element = document.querySelector(action.target);
        if (element && element instanceof HTMLElement) {
          element.click();
          announceToUser(`Clicked ${element.getAttribute('aria-label') || element.textContent || 'element'}`);
        }
        break;
        
      case 'focus':
        const focusElement = document.querySelector(action.target);
        if (focusElement && focusElement instanceof HTMLElement) {
          focusElement.focus();
          announceToUser(`Focused on ${focusElement.getAttribute('aria-label') || focusElement.textContent || 'element'}`);
        }
        break;
        
      case 'scroll':
        const direction = action.parameters?.direction || 'down';
        const distance = action.parameters?.distance || 100;
        window.scrollBy(0, direction === 'up' ? -distance : distance);
        announceToUser(`Scrolled ${direction}`);
        break;
        
      case 'read_content':
        const content = action.target ? 
          document.querySelector(action.target)?.textContent : 
          document.body.textContent;
        if (content) {
          announceToUser(content.slice(0, 500) + (content.length > 500 ? '...' : ''));
        }
        break;
        
      default:
        console.warn('Unknown voice action:', action.type);
    }
  }, []);

  const setupKeyboardListeners = useCallback(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      // Global accessibility shortcuts
      if (e.altKey && e.shiftKey) {
        switch (e.key) {
          case 'A':
            e.preventDefault();
            setIsExpanded(prev => !prev);
            announceToUser(isExpanded ? 'Accessibility panel closed' : 'Accessibility panel opened');
            break;
            
          case 'V':
            e.preventDefault();
            toggleVoiceControl();
            break;
            
          case 'C':
            e.preventDefault();
            toggleHighContrast();
            break;
            
          case 'T':
            e.preventDefault();
            toggleLargeText();
            break;
            
          case 'R':
            e.preventDefault();
            readCurrentElement();
            break;
        }
      }

      // Skip links (Tab navigation enhancement)
      if (e.key === 'Tab' && !e.shiftKey) {
        const focusableElements = document.querySelectorAll(
          'a[href], button, input, select, textarea, [tabindex]:not([tabindex=\"-1\"])'
        );
        
        if (focusableElements.length > 0) {
          const currentIndex = Array.from(focusableElements).indexOf(document.activeElement as Element);
          const nextIndex = (currentIndex + 1) % focusableElements.length;
          
          if (accessibilityState.screenReaderActive) {
            const nextElement = focusableElements[nextIndex];
            const label = nextElement.getAttribute('aria-label') || 
                         nextElement.getAttribute('title') ||
                         (nextElement as HTMLElement).textContent?.trim();
            
            if (label) {
              announceToUser(`Next: ${label}`);
            }
          }
        }
      }
    };

    keyboardListenerRef.current = handleKeyboard;
    document.addEventListener('keydown', handleKeyboard);
  }, [isExpanded, accessibilityState.screenReaderActive]);

  const setupFocusMonitoring = useCallback(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      focusMonitorRef.current = target;

      if (accessibilityState.screenReaderActive && target) {
        const label = target.getAttribute('aria-label') || 
                     target.getAttribute('title') ||
                     target.textContent?.trim() ||
                     target.tagName.toLowerCase();
        
        if (label) {
          announceToUser(`Focused: ${label}`);
        }
      }
    };

    document.addEventListener('focusin', handleFocus);
    
    return () => {
      document.removeEventListener('focusin', handleFocus);
    };
  }, [accessibilityState.screenReaderActive]);

  const cleanup = useCallback(() => {
    if (voiceRecognitionRef.current) {
      voiceRecognitionRef.current.stop();
    }
    
    if (keyboardListenerRef.current) {
      document.removeEventListener('keydown', keyboardListenerRef.current);
    }

    if (speechSynthesisRef.current) {
      speechSynthesis.cancel();
    }
  }, []);

  const announceToUser = useCallback((message: string) => {
    setAccessibilityState(prev => ({ ...prev, currentAnnouncement: message }));
    setAnnouncements(prev => [...prev.slice(-4), message]);

    // Screen reader announcement
    if (accessibilityState.screenReaderActive && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = accessibilityState.profile?.voiceSettings.speed || 1;
      utterance.pitch = accessibilityState.profile?.voiceSettings.pitch || 1;
      utterance.volume = accessibilityState.profile?.voiceSettings.volume || 1;
      
      speechSynthesisRef.current = utterance;
      speechSynthesis.speak(utterance);
    }

    // Visual announcement for hearing impaired users
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }, [accessibilityState.screenReaderActive, accessibilityState.profile]);

  const applyAccessibilityCustomizations = useCallback(async (customizations: UICustomizations) => {
    if (!userId) return;

    try {
      const request: AdaptiveUIRequest = {
        userId,
        currentContext: {
          page: window.location.pathname,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight
          },
          userAgent: navigator.userAgent,
          inputMethods: ['keyboard', 'mouse']
        },
        accessibilityNeeds: accessibilityState.activeFeatures ? Array.from(accessibilityState.activeFeatures) : [],
        deviceCapabilities: {
          hasCamera: false,
          hasMicrophone: true,
          hasAccelerometer: false,
          hasGyroscope: false,
          hasHapticFeedback: false,
          hasVibration: 'vibrate' in navigator,
          hasScreenReader: accessibilityState.screenReaderActive,
          hasVoiceControl: accessibilityState.voiceControlActive
        }
      };

      const adaptiveUI = await accessibilityService.getAdaptiveUI(request);

      // Apply CSS customizations
      if (adaptiveUI.customCSS) {
        let styleElement = document.getElementById('accessibility-styles') as HTMLStyleElement;
        if (!styleElement) {
          styleElement = document.createElement('style');
          styleElement.id = 'accessibility-styles';
          document.head.appendChild(styleElement);
        }
        styleElement.textContent = adaptiveUI.customCSS;
      }

      // Apply layout changes
      adaptiveUI.layoutChanges.forEach(change => {
        const elements = document.querySelectorAll(change.selector);
        elements.forEach(element => {
          const htmlElement = element as HTMLElement;
          Object.entries(change.changes).forEach(([property, value]) => {
            (htmlElement.style as any)[property] = value;
          });
        });
      });

      announceToUser('Accessibility customizations applied');

    } catch (err) {
      console.error('Failed to apply accessibility customizations:', err);
      announceToUser('Error applying accessibility settings');
    }
  }, [userId, accessibilityState.activeFeatures, accessibilityState.screenReaderActive, accessibilityState.voiceControlActive, accessibilityService]);

  const toggleVoiceControl = useCallback(async () => {
    const newState = !accessibilityState.voiceControlActive;
    
    setAccessibilityState(prev => ({
      ...prev,
      voiceControlActive: newState
    }));

    if (newState) {
      setupVoiceRecognition();
      announceToUser('Voice control activated. Say \"help\" for available commands.');
    } else {
      if (voiceRecognitionRef.current) {
        voiceRecognitionRef.current.stop();
      }
      announceToUser('Voice control deactivated');
    }

    // Update user profile
    if (userId && accessibilityState.profile) {
      try {
        const updatedProfile = {
          ...accessibilityState.profile,
          voiceSettings: {
            ...accessibilityState.profile.voiceSettings,
            enabled: newState
          }
        };
        
        await accessibilityService.updateAccessibilityProfile(userId, updatedProfile);
        
        if (onProfileUpdate) {
          onProfileUpdate(updatedProfile);
        }
      } catch (err) {
        console.error('Failed to update voice control setting:', err);
      }
    }
  }, [accessibilityState.voiceControlActive, accessibilityState.profile, userId, setupVoiceRecognition, accessibilityService, onProfileUpdate]);

  const toggleHighContrast = useCallback(async () => {
    const newState = !accessibilityState.highContrastMode;
    
    setAccessibilityState(prev => ({
      ...prev,
      highContrastMode: newState
    }));

    document.body.classList.toggle('high-contrast', newState);
    announceToUser(newState ? 'High contrast mode enabled' : 'High contrast mode disabled');

    // Update user profile
    if (userId && accessibilityState.profile) {
      try {
        const updatedProfile = {
          ...accessibilityState.profile,
          customizations: {
            ...accessibilityState.profile.customizations,
            theme: newState ? 'high_contrast' as const : 'light' as const
          }
        };
        
        await accessibilityService.updateAccessibilityProfile(userId, updatedProfile);
        
        if (onProfileUpdate) {
          onProfileUpdate(updatedProfile);
        }
      } catch (err) {
        console.error('Failed to update high contrast setting:', err);
      }
    }
  }, [accessibilityState.highContrastMode, accessibilityState.profile, userId, accessibilityService, onProfileUpdate]);

  const toggleLargeText = useCallback(async () => {
    const newState = !accessibilityState.largeTextMode;
    
    setAccessibilityState(prev => ({
      ...prev,
      largeTextMode: newState
    }));

    document.body.style.fontSize = newState ? '18px' : '';
    announceToUser(newState ? 'Large text mode enabled' : 'Large text mode disabled');

    // Update user profile
    if (userId && accessibilityState.profile) {
      try {
        const updatedProfile = {
          ...accessibilityState.profile,
          customizations: {
            ...accessibilityState.profile.customizations,
            fontSize: newState ? 18 : 16
          }
        };
        
        await accessibilityService.updateAccessibilityProfile(userId, updatedProfile);
        
        if (onProfileUpdate) {
          onProfileUpdate(updatedProfile);
        }
      } catch (err) {
        console.error('Failed to update large text setting:', err);
      }
    }
  }, [accessibilityState.largeTextMode, accessibilityState.profile, userId, accessibilityService, onProfileUpdate]);

  const readCurrentElement = useCallback(() => {
    const element = document.activeElement || focusMonitorRef.current;
    if (element) {
      const text = element.getAttribute('aria-label') || 
                  element.getAttribute('title') ||
                  (element as HTMLElement).textContent?.trim() ||
                  'No readable content';
      
      announceToUser(text);
    } else {
      announceToUser('No element focused');
    }
  }, []);

  if (loading) {
    return (
      <div className={`${className} p-4`}>
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-sm">Loading accessibility system...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Accessibility Panel Toggle */}
      <motion.button
        className={`fixed bottom-4 left-4 z-50 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${className}`}
        onClick={() => setIsExpanded(!isExpanded)}
        aria-label={isExpanded ? 'Close accessibility panel' : 'Open accessibility panel'}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Accessibility className="w-5 h-5" />
      </motion.button>

      {/* Accessibility Panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, x: -300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -300 }}
            className="fixed bottom-20 left-4 z-50 bg-white rounded-xl shadow-2xl border border-gray-200 w-80 max-h-96 overflow-hidden"
          >
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-blue-600" />
                  AI Accessibility
                </h3>
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-1 hover:bg-gray-100 rounded"
                  aria-label="Accessibility settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-4 max-h-80 overflow-y-auto">
              {/* Quick Controls */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <button
                  onClick={toggleVoiceControl}
                  className={`flex items-center gap-2 p-3 rounded-lg transition-colors ${
                    accessibilityState.voiceControlActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  aria-label={accessibilityState.voiceControlActive ? 'Disable voice control' : 'Enable voice control'}
                >
                  {voiceState.isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                  <span className="text-sm font-medium">Voice</span>
                </button>

                <button
                  onClick={toggleHighContrast}
                  className={`flex items-center gap-2 p-3 rounded-lg transition-colors ${
                    accessibilityState.highContrastMode
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  aria-label={accessibilityState.highContrastMode ? 'Disable high contrast' : 'Enable high contrast'}
                >
                  <Contrast className="w-4 h-4" />
                  <span className="text-sm font-medium">Contrast</span>
                </button>

                <button
                  onClick={toggleLargeText}
                  className={`flex items-center gap-2 p-3 rounded-lg transition-colors ${
                    accessibilityState.largeTextMode
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  aria-label={accessibilityState.largeTextMode ? 'Disable large text' : 'Enable large text'}
                >
                  <Type className="w-4 h-4" />
                  <span className="text-sm font-medium">Large Text</span>
                </button>

                <button
                  onClick={readCurrentElement}
                  className="flex items-center gap-2 p-3 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                  aria-label="Read current element"
                >
                  <Volume2 className="w-4 h-4" />
                  <span className="text-sm font-medium">Read</span>
                </button>
              </div>

              {/* Voice Status */}
              {accessibilityState.voiceControlActive && (
                <div className="bg-blue-50 rounded-lg p-3 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-2 h-2 rounded-full ${voiceState.isListening ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                    <span className="text-sm font-medium text-blue-900">
                      {voiceState.isListening ? 'Listening...' : 'Voice Ready'}
                    </span>
                  </div>
                  
                  {voiceState.lastCommand && (
                    <div className="text-xs text-blue-700">
                      Last: &quot;{voiceState.lastCommand}&quot; ({Math.round(voiceState.confidence * 100)}%)
                    </div>
                  )}

                  {voiceState.isProcessing && (
                    <div className="flex items-center gap-2 text-xs text-blue-700 mt-1">
                      <div className="animate-spin w-3 h-3 border border-blue-600 border-t-transparent rounded-full" />
                      Processing...
                    </div>
                  )}
                </div>
              )}

              {/* Announcements */}
              {announcements.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-1">
                    <Volume2 className="w-3 h-3" />
                    Recent Announcements
                  </h4>
                  <div className="space-y-1">
                    {announcements.slice(-3).map((announcement, index) => (
                      <div key={index} className="text-xs text-gray-600 p-1 bg-white rounded">
                        {announcement}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Voice Commands Help */}
              {accessibilityState.voiceControlActive && accessibilityState.voiceCommands.length > 0 && (
                <div className="bg-yellow-50 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-yellow-900 mb-2 flex items-center gap-1">
                    <Lightbulb className="w-3 h-3" />
                    Voice Commands
                  </h4>
                  <div className="text-xs text-yellow-800 space-y-1">
                    {accessibilityState.voiceCommands.slice(0, 5).map((command, index) => (
                      <div key={index} className="font-mono">
                        &quot;{command}&quot;
                      </div>
                    ))}
                    {accessibilityState.voiceCommands.length > 5 && (
                      <div className="text-yellow-600">
                        +{accessibilityState.voiceCommands.length - 5} more commands
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Keyboard Shortcuts */}
              <div className="bg-gray-50 rounded-lg p-3 mt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-1">
                  <Keyboard className="w-3 h-3" />
                  Keyboard Shortcuts
                </h4>
                <div className="text-xs text-gray-600 space-y-1">
                  <div><kbd className="bg-white px-1 rounded">Alt+Shift+A</kbd> Toggle panel</div>
                  <div><kbd className="bg-white px-1 rounded">Alt+Shift+V</kbd> Toggle voice</div>
                  <div><kbd className="bg-white px-1 rounded">Alt+Shift+C</kbd> Toggle contrast</div>
                  <div><kbd className="bg-white px-1 rounded">Alt+Shift+R</kbd> Read element</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live Region for Screen Reader Announcements */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {accessibilityState.currentAnnouncement}
      </div>

      {/* Skip Links */}
      <div className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 z-50">
        <a
          href="#main-content"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Skip to main content
        </a>
      </div>

      {/* High Contrast Mode Styles */}
      {accessibilityState.highContrastMode && (
        <style>{`
          .high-contrast {
            filter: contrast(150%) brightness(120%);
          }
          .high-contrast * {
            border-color: #000 !important;
          }
          .high-contrast a {
            color: #0066cc !important;
            text-decoration: underline !important;
          }
          .high-contrast button {
            border: 2px solid #000 !important;
            background: #fff !important;
            color: #000 !important;
          }
        `}</style>
      )}
    </>
  );
};