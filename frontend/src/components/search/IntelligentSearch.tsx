/**
 * Intelligent Search Interface
 * World-class search component with smart autocomplete, voice search, and advanced features
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Mic, 
  MicOff, 
  Camera, 
  MapPin, 
  Clock,
  TrendingUp,
  Sparkles,
  Globe,
  Users,
  Calendar,
  Filter,
  X,
  ArrowRight,
  Zap,
  Star,
  Navigation
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { useSearchStore } from '../../stores/search/searchStore';
import type { AutocompleteResult, SmartSearchQuery } from '../../types/property-search';

// ====================================
// SPEECH RECOGNITION TYPES
// ====================================

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

// ====================================
// COMPONENT INTERFACES
// ====================================

interface IntelligentSearchProps {
  placeholder?: string;
  autoFocus?: boolean;
  showVoiceSearch?: boolean;
  showImageSearch?: boolean;
  showLocationSearch?: boolean;
  showAdvancedOptions?: boolean;
  onSearchSubmit?: (query: string) => void;
  className?: string;
}

interface SearchSuggestion {
  id: string;
  type: 'recent' | 'trending' | 'popular' | 'smart';
  text: string;
  icon: React.ReactNode;
  description?: string;
  confidence?: number;
}

interface VoiceSearchState {
  isListening: boolean;
  isProcessing: boolean;
  transcript: string;
  confidence: number;
  error: string | null;
}

// ====================================
// MAIN COMPONENT
// ====================================

export const IntelligentSearch: React.FC<IntelligentSearchProps> = ({
  placeholder = "Where would you like to stay?",
  autoFocus = false,
  showVoiceSearch = true,
  showImageSearch = true,
  showLocationSearch = true,
  showAdvancedOptions = true,
  onSearchSubmit,
  className = ""
}) => {
  // Store state
  const {
    query,
    autocompleteResults,
    isAutocompleting,
    recentSearches,
    setQuery,
    startAutocomplete,
    clearAutocomplete,
    selectAutocompleteResult,
    executeSearch,
    enableLocationSearch,
    enableVoiceSearch,
    processImageSearch
  } = useSearchStore();

  // Local state
  const [isFocused, setIsFocused] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceSearchState>({
    isListening: false,
    isProcessing: false,
    transcript: '',
    confidence: 0,
    error: null
  });

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // ====================================
  // VOICE SEARCH FUNCTIONALITY
  // ====================================

  const initializeVoiceSearch = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Speech recognition not supported');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      setVoiceState(prev => ({
        ...prev,
        isListening: true,
        error: null
      }));
    };

    recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1];
      const transcript = result[0].transcript;
      const confidence = result[0].confidence;

      setVoiceState(prev => ({
        ...prev,
        transcript,
        confidence,
        isProcessing: !result.isFinal
      }));

      if (result.isFinal) {
        setQuery(transcript);
        startAutocomplete(transcript);
        setShowDropdown(true);
      }
    };

    recognition.onerror = (event) => {
      setVoiceState(prev => ({
        ...prev,
        isListening: false,
        isProcessing: false,
        error: event.error
      }));
    };

    recognition.onend = () => {
      setVoiceState(prev => ({
        ...prev,
        isListening: false,
        isProcessing: false
      }));
    };

    recognitionRef.current = recognition;
  }, [setQuery, startAutocomplete]);

  const toggleVoiceSearch = useCallback(() => {
    if (!recognitionRef.current) {
      initializeVoiceSearch();
      return;
    }

    if (voiceState.isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  }, [voiceState.isListening, initializeVoiceSearch]);

  // ====================================
  // IMAGE SEARCH FUNCTIONALITY
  // ====================================

  const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await processImageSearch(file);
      setShowDropdown(true);
    } catch (error) {
      console.error('Image search failed:', error);
    }
  }, [processImageSearch]);

  // ====================================
  // LOCATION SEARCH FUNCTIONALITY
  // ====================================

  const handleLocationSearch = useCallback(async () => {
    try {
      await enableLocationSearch();
      setQuery("Near me");
      setShowDropdown(true);
    } catch (error) {
      console.error('Location search failed:', error);
    }
  }, [enableLocationSearch, setQuery]);

  // ====================================
  // INPUT HANDLING
  // ====================================

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    
    if (value.length >= 2) {
      startAutocomplete(value);
      setShowDropdown(true);
    } else {
      clearAutocomplete();
      setShowDropdown(false);
    }
  }, [setQuery, startAutocomplete, clearAutocomplete]);

  const handleInputFocus = useCallback(() => {
    setIsFocused(true);
    if (query.length >= 2 || recentSearches.length > 0) {
      setShowDropdown(true);
    }
  }, [query.length, recentSearches.length]);

  const handleInputBlur = useCallback(() => {
    setIsFocused(false);
    // Delay hiding dropdown to allow for click events
    setTimeout(() => setShowDropdown(false), 200);
  }, []);

  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      executeSearch();
      setShowDropdown(false);
      onSearchSubmit?.(query);
    }
  }, [query, executeSearch, onSearchSubmit]);

  const handleResultSelect = useCallback((result: AutocompleteResult) => {
    selectAutocompleteResult(result);
    setShowDropdown(false);
    inputRef.current?.blur();
  }, [selectAutocompleteResult]);

  // ====================================
  // SEARCH SUGGESTIONS
  // ====================================

  const getSearchSuggestions = useCallback((): SearchSuggestion[] => {
    const suggestions: SearchSuggestion[] = [];

    // Recent searches
    recentSearches.slice(0, 3).forEach((search, index) => {
      suggestions.push({
        id: `recent-${index}`,
        type: 'recent',
        text: search.query,
        icon: <Clock className="w-4 h-4" />,
        description: 'Recent search'
      });
    });

    // Trending searches
    const trendingSearches = [
      "Beach villa in Bali",
      "Downtown apartment NYC",
      "Mountain cabin Colorado",
      "Luxury resort Maldives"
    ];

    trendingSearches.slice(0, 2).forEach((search, index) => {
      suggestions.push({
        id: `trending-${index}`,
        type: 'trending',
        text: search,
        icon: <TrendingUp className="w-4 h-4" />,
        description: 'Trending now'
      });
    });

    // Smart suggestions based on context
    if (query.length > 0) {
      suggestions.push({
        id: 'smart-location',
        type: 'smart',
        text: `${query} with ocean view`,
        icon: <Sparkles className="w-4 h-4" />,
        description: 'Popular with ocean view',
        confidence: 0.8
      });
    }

    return suggestions;
  }, [recentSearches, query]);

  // ====================================
  // EFFECTS
  // ====================================

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initialize voice search on mount
  useEffect(() => {
    if (showVoiceSearch) {
      initializeVoiceSearch();
    }
  }, [showVoiceSearch, initializeVoiceSearch]);

  // ====================================
  // RENDER
  // ====================================

  const suggestions = getSearchSuggestions();

  return (
    <TooltipProvider>
      <div className={`relative w-full max-w-4xl mx-auto ${className}`}>
        {/* Main search form */}
        <form onSubmit={handleSearchSubmit} className="relative">
          <div className={`
            relative flex items-center bg-white dark:bg-gray-900 
            border-2 rounded-2xl shadow-lg transition-all duration-300
            ${isFocused 
              ? 'border-blue-500 shadow-xl scale-[1.02]' 
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
            }
          `}>
            {/* Search icon */}
            <div className="flex items-center justify-center w-12 h-12 text-gray-400">
              <Search className="w-5 h-5" />
            </div>

            {/* Input field */}
            <Input
              ref={inputRef}
              type="text"
              value={voiceState.isListening ? voiceState.transcript : query}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              placeholder={voiceState.isListening ? "Listening..." : placeholder}
              className="flex-1 px-0 py-6 text-lg border-0 bg-transparent focus:ring-0 focus:outline-none"
              disabled={voiceState.isListening}
            />

            {/* Voice search indicator */}
            <AnimatePresence>
              {voiceState.isListening && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center space-x-2 px-3"
                >
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                    className="w-2 h-2 bg-red-500 rounded-full"
                  />
                  <span className="text-sm text-red-500 font-medium">
                    {voiceState.confidence > 0 && `${Math.round(voiceState.confidence * 100)}%`}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action buttons */}
            <div className="flex items-center space-x-1 px-3">
              {/* Voice search */}
              {showVoiceSearch && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={toggleVoiceSearch}
                      className={`p-2 rounded-lg transition-colors ${
                        voiceState.isListening
                          ? 'bg-red-100 text-red-600 hover:bg-red-200'
                          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {voiceState.isListening ? (
                        <MicOff className="w-4 h-4" />
                      ) : (
                        <Mic className="w-4 h-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {voiceState.isListening ? 'Stop voice search' : 'Voice search'}
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Image search */}
              {showImageSearch && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
                        asChild
                      >
                        <div>
                          <Camera className="w-4 h-4" />
                        </div>
                      </Button>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  </TooltipTrigger>
                  <TooltipContent>Search by image</TooltipContent>
                </Tooltip>
              )}

              {/* Location search */}
              {showLocationSearch && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleLocationSearch}
                      className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                    >
                      <Navigation className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Use current location</TooltipContent>
                </Tooltip>
              )}

              {/* Search button */}
              <Button
                type="submit"
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                disabled={!query.trim() || voiceState.isListening}
              >
                Search
              </Button>
            </div>
          </div>
        </form>

        {/* Dropdown with autocomplete and suggestions */}
        <AnimatePresence>
          {showDropdown && (
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full left-0 right-0 mt-2 z-50"
            >
              <Card className="p-4 bg-white dark:bg-gray-900 border shadow-xl">
                {/* Autocomplete results */}
                {autocompleteResults.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                      Suggestions
                    </h3>
                    <div className="space-y-1">
                      {autocompleteResults.map((result) => (
                        <button
                          key={result.id}
                          onClick={() => handleResultSelect(result)}
                          className="w-full flex items-center space-x-3 p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        >
                          <div className="flex-shrink-0">
                            {result.type === 'location' && <MapPin className="w-4 h-4 text-gray-400" />}
                            {result.type === 'property' && <Star className="w-4 h-4 text-yellow-500" />}
                            {result.type === 'landmark' && <Globe className="w-4 h-4 text-blue-500" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {result.text}
                            </div>
                            {result.subtitle && (
                              <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                {result.subtitle}
                              </div>
                            )}
                          </div>
                          <ArrowRight className="w-4 h-4 text-gray-300" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Search suggestions */}
                {suggestions.length > 0 && autocompleteResults.length === 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                      Popular searches
                    </h3>
                    <div className="space-y-1">
                      {suggestions.map((suggestion) => (
                        <button
                          key={suggestion.id}
                          onClick={() => {
                            setQuery(suggestion.text);
                            setShowDropdown(false);
                          }}
                          className="w-full flex items-center space-x-3 p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        >
                          <div className="flex-shrink-0 text-gray-400">
                            {suggestion.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {suggestion.text}
                            </div>
                            {suggestion.description && (
                              <div className="flex items-center space-x-2">
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                  {suggestion.description}
                                </span>
                                {suggestion.confidence && (
                                  <Badge variant="secondary" className="text-xs">
                                    {Math.round(suggestion.confidence * 100)}%
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                          <ArrowRight className="w-4 h-4 text-gray-300" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* No results */}
                {autocompleteResults.length === 0 && suggestions.length === 0 && !isAutocompleting && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Globe className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Start typing to search for destinations</p>
                  </div>
                )}

                {/* Loading state */}
                {isAutocompleting && (
                  <div className="text-center py-8">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"
                    />
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Searching...</p>
                  </div>
                )}
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Voice search error */}
        <AnimatePresence>
          {voiceState.error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm"
            >
              Voice search error: {voiceState.error}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setVoiceState(prev => ({ ...prev, error: null }))}
                className="ml-2 p-1 h-auto"
              >
                <X className="w-3 h-3" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </TooltipProvider>
  );
};