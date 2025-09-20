import React, { useState } from 'react';
import { Layout } from './components/Layout';
import WelcomePage from './components/WelcomePage';
import { AuthFlow } from './components/AuthFlow';
import { SearchAndBooking } from './components/SearchAndBooking';
import { PropertyDetail } from './components/PropertyDetail';
import { POIDiscovery } from './components/POIDiscovery';
import { POIDetail } from './components/POIDetail';
import { AudioGuide } from './components/AudioGuide';
import { ARExperience } from './components/ARExperience';
import { UserProfile } from './components/UserProfile';
import { AIAssistant } from './components/AIAssistant';
import { AdminDashboard } from './components/AdminDashboard';
import { ProjectStatus } from './components/ProjectStatus';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PageLoader } from './components/LoadingSpinner';
import { AboutUs } from './components/AboutUs';
import { Sustainability } from './components/Sustainability';
import { ContactUs } from './components/ContactUs';
import { HelpCenter } from './components/HelpCenter';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { TermsOfService } from './components/TermsOfService';
import { CookiePolicy } from './components/CookiePolicy';

type AppState = 'welcome' | 'auth' | 'dashboard' | 'property-detail' | 'poi-discovery' | 'poi-detail' | 'audio-guide' | 'ar-experience' | 'profile' | 'ai-assistant' | 'admin' | 'experiences' | 'itinerary' | 'status' | 'about' | 'sustainability' | 'contact' | 'help' | 'privacy' | 'terms' | 'cookies';

function AppContent() {
  const [appState, setAppState] = useState<AppState>('welcome');
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup');
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [selectedPOI, setSelectedPOI] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Development mode - set to false for production
  const isDevelopmentMode = true;

  const handleGetStarted = () => {
    setAuthMode('signup');
    setAppState('auth');
  };

  const handleSignIn = () => {
    setAuthMode('login');
    setAppState('auth');
  };

  const handleAuthComplete = () => {
    setAppState('dashboard');
  };

  const handleBackToWelcome = () => {
    setAppState('welcome');
  };

  const handlePropertySelect = (property: any) => {
    setSelectedProperty(property);
    setAppState('property-detail');
  };

  const handlePOISelect = (poi: any) => {
    setSelectedPOI(poi);
    setAppState('poi-detail');
  };

  const handleBackToDashboard = () => {
    setAppState('dashboard');
  };

  const handleBackToPOIDiscovery = () => {
    setAppState('poi-discovery');
  };

  const handleStartAudioGuide = (poi: any) => {
    setSelectedPOI(poi);
    setAppState('audio-guide');
  };

  const handleStartARExperience = (poi: any) => {
    setSelectedPOI(poi);
    setAppState('ar-experience');
  };

  const handleNavigation = async (section: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Simulate loading for better UX
      await new Promise(resolve => setTimeout(resolve, 200));
      
      switch (section) {
        case 'accommodations':
        case 'dashboard':
          setAppState('dashboard');
          break;
        case 'discover':
          setAppState('poi-discovery');
          break;
        case 'experiences':
          setAppState('experiences');
          break;
        case 'itinerary':
          setAppState('itinerary');
          break;
        case 'profile':
          setAppState('profile');
          break;
        case 'ai-assistant':
          setAppState('ai-assistant');
          break;
        case 'admin':
          setAppState('admin');
          break;
        case 'status':
          setAppState('status');
          break;
        case 'about':
          setAppState('about');
          break;
        case 'sustainability':
          setAppState('sustainability');
          break;
        case 'contact':
          setAppState('contact');
          break;
        case 'help':
          setAppState('help');
          break;
        case 'privacy':
          setAppState('privacy');
          break;
        case 'terms':
          setAppState('terms');
          break;
        case 'cookies':
          setAppState('cookies');
          break;
        default:
          setAppState('dashboard');
      }
    } catch (err) {
      setError('Failed to navigate. Please try again.');
      console.error('Navigation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Add search functionality
  const handleSearch = async (query: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Simulate search
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // For now, navigate to search results on dashboard
      setAppState('dashboard');
      
      console.log('Search query:', query);
    } catch (err) {
      setError('Search failed. Please try again.');
      console.error('Search error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (appState === 'welcome') {
    return (
      <Layout 
        showNavigation={false} 
        showFooter={false}
        isDevelopmentMode={isDevelopmentMode}
        currentAppState={appState}
        onStateChange={setAppState}
      >
        <WelcomePage onGetStarted={handleGetStarted} />
      </Layout>
    );
  }

  if (appState === 'auth') {
    return (
      <Layout 
        showNavigation={false} 
        showFooter={false}
        isDevelopmentMode={isDevelopmentMode}
        currentAppState={appState}
        onStateChange={setAppState}
      >
        <AuthFlow 
          onComplete={handleAuthComplete} 
          onBack={handleBackToWelcome}
        />
      </Layout>
    );
  }

  if (appState === 'property-detail') {
    return (
      <Layout 
        currentPage={appState} 
        onNavigate={handleNavigation} 
        onSearch={handleSearch}
        isDevelopmentMode={isDevelopmentMode}
        currentAppState={appState}
        onStateChange={setAppState}
      >
        <PropertyDetail 
          onBack={handleBackToDashboard}
          onBook={() => console.log('Booking property:', selectedProperty)}
        />
      </Layout>
    );
  }

  if (appState === 'poi-discovery') {
    return (
      <Layout 
        currentPage={appState} 
        onNavigate={handleNavigation} 
        onSearch={handleSearch}
        isDevelopmentMode={isDevelopmentMode}
        currentAppState={appState}
        onStateChange={setAppState}
      >
        <POIDiscovery 
          onPOISelect={handlePOISelect}
          onExperienceSelect={(experience) => console.log('Experience selected:', experience)}
        />
      </Layout>
    );
  }

  if (appState === 'poi-detail') {
    return (
      <Layout 
        currentPage={appState} 
        onNavigate={handleNavigation} 
        onSearch={handleSearch}
        isDevelopmentMode={isDevelopmentMode}
        currentAppState={appState}
        onStateChange={setAppState}
      >
        <POIDetail 
          poi={selectedPOI}
          onBack={handleBackToPOIDiscovery}
          onAddToItinerary={(poi) => console.log('Added to itinerary:', poi)}
          onStartAudioGuide={handleStartAudioGuide}
          onStartARExperience={handleStartARExperience}
        />
      </Layout>
    );
  }

  if (appState === 'audio-guide') {
    return (
      <Layout 
        currentPage={appState} 
        onNavigate={handleNavigation} 
        onSearch={handleSearch} 
        showFooter={false}
        isDevelopmentMode={isDevelopmentMode}
        currentAppState={appState}
        onStateChange={setAppState}
      >
        <AudioGuide 
          onClose={() => setAppState('poi-detail')}
        />
      </Layout>
    );
  }

  if (appState === 'ar-experience') {
    return (
      <Layout 
        currentPage={appState} 
        onNavigate={handleNavigation} 
        onSearch={handleSearch} 
        showFooter={false}
        isDevelopmentMode={isDevelopmentMode}
        currentAppState={appState}
        onStateChange={setAppState}
      >
        <ARExperience 
          onClose={() => setAppState('poi-detail')}
        />
      </Layout>
    );
  }

  if (appState === 'profile') {
    return (
      <Layout 
        currentPage={appState} 
        onNavigate={handleNavigation} 
        onSearch={handleSearch}
        isDevelopmentMode={isDevelopmentMode}
        currentAppState={appState}
        onStateChange={setAppState}
      >
        <UserProfile onBack={handleBackToDashboard} isOwnProfile={true} />
      </Layout>
    );
  }

  if (appState === 'ai-assistant') {
    return (
      <Layout 
        currentPage={appState} 
        onNavigate={handleNavigation} 
        onSearch={handleSearch}
        isDevelopmentMode={isDevelopmentMode}
        currentAppState={appState}
        onStateChange={setAppState}
      >
        <AIAssistant onClose={handleBackToDashboard} />
      </Layout>
    );
  }

  if (appState === 'admin') {
    return (
      <Layout 
        currentPage={appState} 
        onNavigate={handleNavigation} 
        onSearch={handleSearch}
        isDevelopmentMode={isDevelopmentMode}
        currentAppState={appState}
        onStateChange={setAppState}
      >
        <AdminDashboard onClose={handleBackToDashboard} />
      </Layout>
    );
  }

  if (appState === 'experiences') {
    return (
      <Layout 
        currentPage={appState} 
        onNavigate={handleNavigation} 
        onSearch={handleSearch}
        isDevelopmentMode={isDevelopmentMode}
        currentAppState={appState}
        onStateChange={setAppState}
      >
        <div className="min-h-screen bg-off-white flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="w-16 h-16 bg-primary-tint rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-2xl">🎯</span>
            </div>
            <h2 className="text-2xl font-bold text-navy mb-4">Experiences Coming Soon</h2>
            <p className="text-medium-gray mb-6">
              We're working on amazing experience booking features. For now, explore our POI Discovery section for activities and attractions.
            </p>
            <button 
              onClick={() => handleNavigation('discover')}
              className="bg-primary-teal text-black px-6 py-3 rounded-base hover:bg-primary-dark transition-colors"
            >
              Explore POIs
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  if (appState === 'itinerary') {
    return (
      <Layout 
        currentPage={appState} 
        onNavigate={handleNavigation} 
        onSearch={handleSearch}
        isDevelopmentMode={isDevelopmentMode}
        currentAppState={appState}
        onStateChange={setAppState}
      >
        <div className="min-h-screen bg-off-white flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="w-16 h-16 bg-primary-tint rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-2xl">📅</span>
            </div>
            <h2 className="text-2xl font-bold text-navy mb-4">Itinerary Planner Coming Soon</h2>
            <p className="text-medium-gray mb-6">
              We're building an intelligent itinerary planner with AI optimization. For now, use our AI Assistant to help plan your trips.
            </p>
            <button 
              onClick={() => handleNavigation('ai-assistant')}
              className="bg-primary-teal text-black px-6 py-3 rounded-base hover:bg-primary-dark transition-colors"
            >
              Try AI Assistant
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  if (appState === 'status') {
    return (
      <Layout 
        currentPage={appState} 
        onNavigate={handleNavigation} 
        onSearch={handleSearch}
        isDevelopmentMode={isDevelopmentMode}
        currentAppState={appState}
        onStateChange={setAppState}
      >
        <ProjectStatus onNavigate={handleNavigation} />
      </Layout>
    );
  }

  if (appState === 'about') {
    return (
      <Layout 
        currentPage={appState} 
        onNavigate={handleNavigation} 
        onSearch={handleSearch}
        isDevelopmentMode={isDevelopmentMode}
        currentAppState={appState}
        onStateChange={setAppState}
      >
        <AboutUs onBack={() => setAppState('dashboard')} />
      </Layout>
    );
  }

  if (appState === 'sustainability') {
    return (
      <Layout 
        currentPage={appState} 
        onNavigate={handleNavigation} 
        onSearch={handleSearch}
        isDevelopmentMode={isDevelopmentMode}
        currentAppState={appState}
        onStateChange={setAppState}
      >
        <Sustainability onBack={() => setAppState('dashboard')} />
      </Layout>
    );
  }

  if (appState === 'contact') {
    return (
      <Layout 
        currentPage={appState} 
        onNavigate={handleNavigation} 
        onSearch={handleSearch}
        isDevelopmentMode={isDevelopmentMode}
        currentAppState={appState}
        onStateChange={setAppState}
      >
        <ContactUs onBack={() => setAppState('dashboard')} />
      </Layout>
    );
  }

  if (appState === 'help') {
    return (
      <Layout 
        currentPage={appState} 
        onNavigate={handleNavigation} 
        onSearch={handleSearch}
        isDevelopmentMode={isDevelopmentMode}
        currentAppState={appState}
        onStateChange={setAppState}
      >
        <HelpCenter onBack={() => setAppState('dashboard')} />
      </Layout>
    );
  }

  if (appState === 'privacy') {
    return (
      <Layout 
        currentPage={appState} 
        onNavigate={handleNavigation} 
        onSearch={handleSearch}
        isDevelopmentMode={isDevelopmentMode}
        currentAppState={appState}
        onStateChange={setAppState}
      >
        <PrivacyPolicy onBack={() => setAppState('dashboard')} />
      </Layout>
    );
  }

  if (appState === 'terms') {
    return (
      <Layout 
        currentPage={appState} 
        onNavigate={handleNavigation} 
        onSearch={handleSearch}
        isDevelopmentMode={isDevelopmentMode}
        currentAppState={appState}
        onStateChange={setAppState}
      >
        <TermsOfService onBack={() => setAppState('dashboard')} />
      </Layout>
    );
  }

  if (appState === 'cookies') {
    return (
      <Layout 
        currentPage={appState} 
        onNavigate={handleNavigation} 
        onSearch={handleSearch}
        isDevelopmentMode={isDevelopmentMode}
        currentAppState={appState}
        onStateChange={setAppState}
      >
        <CookiePolicy onBack={() => setAppState('dashboard')} />
      </Layout>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <div>
        <PageLoader text="Loading TouriQuest..." />
        {/* We include the dev nav even in loading state for development */}
        {isDevelopmentMode && (
          <div className="fixed top-4 right-4 z-[0]">
            <div className="bg-red-500 text-black px-4 py-2 rounded-lg shadow-lg opacity-50">
              🔧 Dev Nav (Loading...)
            </div>
          </div>
        )}
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <Layout 
        showNavigation={false} 
        showFooter={false}
        isDevelopmentMode={isDevelopmentMode}
        currentAppState={appState}
        onStateChange={setAppState}
      >
        <div className="min-h-screen bg-off-white flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="text-2xl font-bold text-navy mb-4">Something went wrong</h2>
            <p className="text-medium-gray mb-6">{error}</p>
            <button 
              onClick={() => {
                setError(null);
                setAppState('dashboard');
              }}
              className="bg-primary-teal text-black px-6 py-3 rounded-base hover:bg-primary-dark transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout 
      currentPage={appState} 
      onNavigate={handleNavigation} 
      onSearch={handleSearch}
      isDevelopmentMode={isDevelopmentMode}
      currentAppState={appState}
      onStateChange={setAppState}
    >
      <SearchAndBooking 
        onPropertySelect={handlePropertySelect} 
        onOpenAI={() => setAppState('ai-assistant')}
        onNavigate={handleNavigation}
      />
    </Layout>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}