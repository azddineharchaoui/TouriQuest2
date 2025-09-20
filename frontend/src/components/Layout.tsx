import React, { useState, useEffect } from 'react';
import { NavigationHeader } from './NavigationHeader';
import { Footer } from './Footer';
import { 
  Home,
  Map,
  Sparkles,
  Route,
  User
} from 'lucide-react';

type AppState = 'welcome' | 'auth' | 'dashboard' | 'property-detail' | 'poi-discovery' | 'poi-detail' | 'audio-guide' | 'ar-experience' | 'profile' | 'ai-assistant' | 'admin' | 'experiences' | 'itinerary' | 'status' | 'about' | 'sustainability' | 'contact' | 'help' | 'privacy' | 'terms' | 'cookies';

// Development navigation panel component
function DevNavigationPanel({ currentState, onStateChange }: { currentState: AppState, onStateChange: (state: AppState) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  
  const pages = [
    { state: 'welcome', label: 'Welcome Page', description: 'Landing page with app introduction' },
    { state: 'auth', label: 'Authentication', description: 'Login/Signup forms' },
    { state: 'dashboard', label: 'Dashboard', description: 'Main search and booking interface' },
    { state: 'property-detail', label: 'Property Detail', description: 'Detailed property view' },
    { state: 'poi-discovery', label: 'POI Discovery', description: 'Points of interest exploration' },
    { state: 'poi-detail', label: 'POI Detail', description: 'Detailed POI view' },
    { state: 'audio-guide', label: 'Audio Guide', description: 'Audio tour experience' },
    { state: 'ar-experience', label: 'AR Experience', description: 'Augmented reality features' },
    { state: 'profile', label: 'User Profile', description: 'User profile and settings' },
    { state: 'ai-assistant', label: 'AI Assistant', description: 'AI-powered travel assistant' },
    { state: 'admin', label: 'Admin Dashboard', description: 'Admin panel and management' },
    { state: 'experiences', label: 'Experiences', description: 'Experience booking (coming soon)' },
    { state: 'itinerary', label: 'Itinerary', description: 'Trip planning (coming soon)' },
    { state: 'status', label: 'Project Status', description: 'Development status overview' },
    { state: 'about', label: 'About Us', description: 'Company information and mission' },
    { state: 'sustainability', label: 'Sustainability', description: 'Eco-tourism practices' },
    { state: 'contact', label: 'Contact Us', description: 'Contact form and company details' },
    { state: 'help', label: 'Help Center', description: 'FAQs and support information' },
    { state: 'privacy', label: 'Privacy Policy', description: 'Privacy terms and data handling' },
    { state: 'terms', label: 'Terms of Service', description: 'Legal terms and conditions' },
    { state: 'cookies', label: 'Cookie Policy', description: 'Cookie usage and preferences' },
  ] as const;

  // Close menu when pressing Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when menu is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <div className="fixed top-4 right-4 z-[0]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-red-500 text-black px-4 py-2 rounded-lg shadow-lg hover:bg-red-600 transition-all duration-200 font-medium border-2 border-red-600 hover:border-red-700 active:scale-95 z-[9999]"
        title="Development Navigation - Press ESC to close"
      >
        🔧 Dev Nav
      </button>
      
      {isOpen && (
        <>
          {/* Backdrop to close menu when clicking outside */}
          <div 
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[0]" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu Panel - Fixed positioning for better control */}
          <div className="fixed top-4 right-4 bg-white border border-gray-300 rounded-lg shadow-2xl w-[50vw] min-w-[600px] max-w-[800px] h-[calc(100vh-2rem)] z-[0] flex flex-col animate-in slide-in-from-top-2 duration-200 overflow-hidden">
            {/* Header - Fixed */}
            <div className="p-4 border-b bg-gradient-to-r from-gray-50 to-gray-100 rounded-t-lg flex-shrink-0">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    🔧 Development Navigation
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Current: <span className="font-medium text-blue-600">{pages.find(p => p.state === currentState)?.label}</span>
                  </p>
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl leading-none hover:bg-gray-200 rounded-full w-8 h-8 flex items-center justify-center transition-colors"
                  title="Close (ESC)"
                >
                  ×
                </button>
              </div>
            </div>
            
            {/* Scrollable Content - Properly contained */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-3 gap-2">
                {pages.map((page) => (
                  <button
                    key={page.state}
                    onClick={() => {
                      onStateChange(page.state as AppState);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left p-3 rounded-lg transition-all duration-150 group ${
                      currentState === page.state
                        ? 'bg-blue-100 border-l-4 border-blue-500 shadow-sm'
                        : 'hover:bg-gray-100 hover:shadow-sm hover:scale-[1.02]'
                    }`}
                  >
                    <div className={`font-medium text-sm ${currentState === page.state ? 'text-blue-800' : 'text-gray-800 group-hover:text-gray-900'}`}>
                      {page.label}
                    </div>
                    <div className={`text-xs mt-1 ${currentState === page.state ? 'text-blue-600' : 'text-gray-600'}`}>
                      {page.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Footer - Fixed */}
            <div className="p-4 border-t bg-gradient-to-r from-gray-50 to-gray-100 text-sm text-gray-600 rounded-b-lg flex-shrink-0">
              <div className="flex items-center gap-2">
                💡 <span>Development mode - Easy navigation without auth!</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Press ESC or click outside to close
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface LayoutProps {
  children: React.ReactNode;
  showNavigation?: boolean;
  showFooter?: boolean;
  currentPage?: string;
  onNavigate?: (section: string) => void;
  onSearch?: (query: string) => void;
  // Add dev nav props
  isDevelopmentMode?: boolean;
  currentAppState?: AppState;
  onStateChange?: (state: AppState) => void;
}

export function Layout({ 
  children, 
  showNavigation = true,
  showFooter = true,
  currentPage = 'dashboard',
  onNavigate,
  onSearch,
  isDevelopmentMode = false,
  currentAppState,
  onStateChange
}: LayoutProps) {
  
  const handleMobileNavigation = (section: string) => {
    // Map mobile navigation to correct sections
    const sectionMap: { [key: string]: string } = {
      'accommodations': 'dashboard',
      'discover': 'discover',
      'experiences': 'experiences',
      'itinerary': 'itinerary',
      'profile': 'profile'
    };
    
    onNavigate?.(sectionMap[section] || section);
  };

  const isActiveMobileTab = (section: string) => {
    const activeMap: { [key: string]: string[] } = {
      'accommodations': ['dashboard', 'property-detail'],
      'discover': ['discover', 'poi-discovery', 'poi-detail'],
      'experiences': ['experiences'],
      'itinerary': ['itinerary'],
      'profile': ['profile']
    };
    
    return activeMap[section]?.includes(currentPage) || false;
  };

  return (
    <div className="min-h-screen bg-off-white flex flex-col">
      {/* Development Navigation - Always on top */}
      {isDevelopmentMode && currentAppState && onStateChange && (
        <DevNavigationPanel 
          currentState={currentAppState} 
          onStateChange={onStateChange} 
        />
      )}

      {showNavigation && (
        <NavigationHeader 
          currentPage={currentPage}
          onNavigate={onNavigate}
          onSearch={onSearch}
        />
      )}

      <main className="flex-1 pb-20 md:pb-0">
        {children}
      </main>

      {showFooter && (
        <Footer onNavigate={onNavigate} />
      )}

      {/* Mobile Bottom Navigation */}
      {showNavigation && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-pale-gray shadow-lg z-40">
          <div className="flex items-center justify-around py-2">
            <button 
              onClick={() => handleMobileNavigation('accommodations')}
              className={`
                flex flex-col items-center py-3 px-4 transition-all duration-200
                ${isActiveMobileTab('accommodations') 
                  ? 'text-primary-teal' 
                  : 'text-medium-gray hover:text-primary-teal'
                }
              `}
            >
              <Home className="w-5 h-5" />
              <span className="text-xs mt-1 font-medium">Stays</span>
            </button>
            
            <button 
              onClick={() => handleMobileNavigation('discover')}
              className={`
                flex flex-col items-center py-3 px-4 transition-all duration-200
                ${isActiveMobileTab('discover') 
                  ? 'text-primary-teal' 
                  : 'text-medium-gray hover:text-primary-teal'
                }
              `}
            >
              <Map className="w-5 h-5" />
              <span className="text-xs mt-1 font-medium">Discover</span>
            </button>
            
            <button 
              onClick={() => handleMobileNavigation('experiences')}
              className={`
                flex flex-col items-center py-3 px-4 transition-all duration-200
                ${isActiveMobileTab('experiences') 
                  ? 'text-primary-teal' 
                  : 'text-medium-gray hover:text-primary-teal'
                }
              `}
            >
              <Sparkles className="w-5 h-5" />
              <span className="text-xs mt-1 font-medium">Experiences</span>
            </button>
            
            <button 
              onClick={() => handleMobileNavigation('itinerary')}
              className={`
                flex flex-col items-center py-3 px-4 transition-all duration-200
                ${isActiveMobileTab('itinerary') 
                  ? 'text-primary-teal' 
                  : 'text-medium-gray hover:text-primary-teal'
                }
              `}
            >
              <Route className="w-5 h-5" />
              <span className="text-xs mt-1 font-medium">Trips</span>
            </button>
            
            <button 
              onClick={() => handleMobileNavigation('profile')}
              className={`
                flex flex-col items-center py-3 px-4 transition-all duration-200
                ${isActiveMobileTab('profile') 
                  ? 'text-primary-teal' 
                  : 'text-medium-gray hover:text-primary-teal'
                }
              `}
            >
              <User className="w-5 h-5" />
              <span className="text-xs mt-1 font-medium">Profile</span>
            </button>
          </div>
        </div>
      )}

      {/* Development Navigation - Fixed at bottom of header */}
      {isDevelopmentMode && currentAppState && onStateChange && (
        <div className="dev-nav" style={{ position: 'fixed', bottom: 0, left: 0, width: '100%', zIndex: 9999 }}>
          <DevNavigationPanel 
            currentState={currentAppState} 
            onStateChange={onStateChange} 
          />
        </div>
      )}
    </div>
  );
}