import React from 'react';
import { NavigationHeader } from './NavigationHeader';
import { Footer } from './Footer';
import { 
  Home,
  Map,
  Sparkles,
  Route,
  User
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  showNavigation?: boolean;
  showFooter?: boolean;
  currentPage?: string;
  onNavigate?: (section: string) => void;
  onSearch?: (query: string) => void;
}

export function Layout({ 
  children, 
  showNavigation = true,
  showFooter = true,
  currentPage = 'dashboard',
  onNavigate,
  onSearch 
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
    </div>
  );
}