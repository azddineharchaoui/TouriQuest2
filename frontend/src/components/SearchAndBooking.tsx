import React, { useState } from 'react';
import { PropertySearchLanding } from './PropertySearchLanding';
import { PropertySearchResults } from './PropertySearchResults';
import { Button } from './ui/button';
import { MessageCircle } from 'lucide-react';

type SearchView = 'landing' | 'results';

interface SearchAndBookingProps {
  onPropertySelect: (property: any) => void;
  onOpenAI?: () => void;
  onNavigate?: (section: string) => void;
}

export function SearchAndBooking({ onPropertySelect, onOpenAI, onNavigate }: SearchAndBookingProps) {
  const [currentView, setCurrentView] = useState<SearchView>('landing');

  const handleSearch = () => {
    setCurrentView('results');
  };

  const handleBackToSearch = () => {
    setCurrentView('landing');
  };

  return (
    <div className="relative">
      {currentView === 'landing' && <PropertySearchLanding onSearch={handleSearch} />}
      {currentView === 'results' && (
        <PropertySearchResults 
          onPropertySelect={onPropertySelect}
          onBackToSearch={handleBackToSearch}
        />
      )}
      
      {/* Floating AI Assistant Button */}
      <Button
        size="lg"
        className="fixed bottom-24 md:bottom-6 right-6 z-40 rounded-full shadow-lg w-14 h-14 p-0"
        onClick={onOpenAI}
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    </div>
  );
}