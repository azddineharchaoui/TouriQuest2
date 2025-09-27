import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Ticket, 
  Star,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  Play,
  Share2,
  Heart,
  Bell,
  ExternalLink,
  Music,
  Camera,
  Utensils,
  Palette,
  Trophy,
  Zap,
  Gift,
  PartyPopper
} from 'lucide-react';

interface Event {
  id: string;
  name: string;
  date: string;
  time: string;
  endTime?: string;
  description: string;
  ticketRequired: boolean;
  price?: number;
  currency?: string;
  category: string;
  location?: string;
  capacity?: number;
  spotsLeft?: number;
  organizer: string;
  image?: string;
  tags: string[];
  recurring: boolean;
  recurrenceType?: 'daily' | 'weekly' | 'monthly';
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    website?: string;
  };
  media?: {
    photos: string[];
    videos: string[];
  };
  reviews?: {
    rating: number;
    count: number;
  };
  accessibility: {
    wheelchairAccessible: boolean;
    signLanguage: boolean;
    audioDescription: boolean;
  };
  isUserInterested: boolean;
  attendeeCount: number;
  friendsAttending: string[];
}

interface EventCalendarProps {
  poiId: string;
  events: Event[];
}

export const EventCalendar: React.FC<EventCalendarProps> = ({ poiId, events: initialEvents }) => {
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'calendar' | 'list' | 'featured'>('calendar');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [onlyFreeEvents, setOnlyFreeEvents] = useState(false);
  const [userInterests, setUserInterests] = useState<string[]>([]);

  useEffect(() => {
    fetchEvents();
    fetchUserInterests();
  }, [poiId, selectedDate]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/pois/${poiId}/events?date=${selectedDate.toISOString()}`);
      if (response.ok) {
        const eventsData = await response.json();
        setEvents(eventsData);
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserInterests = async () => {
    try {
      const response = await fetch('/api/v1/recommendations/preferences');
      if (response.ok) {
        const preferences = await response.json();
        setUserInterests(preferences.eventCategories || []);
      }
    } catch (error) {
      console.error('Failed to fetch user interests:', error);
    }
  };

  const handleInterested = async (eventId: string) => {
    try {
      const response = await fetch(`/api/v1/events/${eventId}/interested`, {
        method: 'POST'
      });
      
      if (response.ok) {
        setEvents(events.map(event => 
          event.id === eventId 
            ? { ...event, isUserInterested: !event.isUserInterested }
            : event
        ));
      }
    } catch (error) {
      console.error('Failed to update interest:', error);
    }
  };

  const handleShare = async (event: Event) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: event.name,
          text: event.description,
          url: `${window.location.origin}/events/${event.id}`,
        });
      } else {
        await navigator.clipboard.writeText(`${window.location.origin}/events/${event.id}`);
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const filteredEvents = events.filter(event => {
    // Search filter
    if (searchQuery && !event.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !event.description.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Category filter
    if (selectedCategory !== 'all' && event.category !== selectedCategory) {
      return false;
    }

    // Price filter
    if (onlyFreeEvents && event.ticketRequired && event.price && event.price > 0) {
      return false;
    }

    if (event.price && (event.price < priceRange[0] || event.price > priceRange[1])) {
      return false;
    }

    return true;
  });

  const categories = [...new Set(events.map(event => event.category))];
  const upcomingEvents = filteredEvents
    .filter(event => new Date(event.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const featuredEvents = upcomingEvents
    .filter(event => userInterests.includes(event.category) || event.reviews?.rating && event.reviews.rating > 4.5)
    .slice(0, 6);

  const getEventIcon = (category: string) => {
    const iconMap: { [key: string]: React.ReactNode } = {
      'music': <Music className="w-5 h-5" />,
      'food': <Utensils className="w-5 h-5" />,
      'art': <Palette className="w-5 h-5" />,
      'sports': <Trophy className="w-5 h-5" />,
      'photography': <Camera className="w-5 h-5" />,
      'party': <PartyPopper className="w-5 h-5" />,
      'festival': <Gift className="w-5 h-5" />,
    };
    
    return iconMap[category.toLowerCase()] || <Calendar className="w-5 h-5" />;
  };

  const getCategoryColor = (category: string) => {
    const colorMap: { [key: string]: string } = {
      'music': 'bg-purple-100 text-purple-800 border-purple-200',
      'food': 'bg-orange-100 text-orange-800 border-orange-200',
      'art': 'bg-pink-100 text-pink-800 border-pink-200',
      'sports': 'bg-green-100 text-green-800 border-green-200',
      'photography': 'bg-blue-100 text-blue-800 border-blue-200',
      'party': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'festival': 'bg-red-100 text-red-800 border-red-200',
    };
    
    return colorMap[category.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`1970-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header with Search and Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-3 rounded-xl border-2 transition-colors flex items-center gap-2 ${
                showFilters 
                  ? 'border-blue-500 bg-blue-50 text-blue-700' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <Filter className="w-5 h-5" />
              Filters
            </button>
            
            {['calendar', 'list', 'featured'].map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode as any)}
                className={`px-4 py-3 rounded-xl border-2 transition-colors capitalize ${
                  viewMode === mode 
                    ? 'border-blue-500 bg-blue-50 text-blue-700' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t pt-4 space-y-4"
            >
              <div className="grid md:grid-cols-3 gap-4">
                {/* Category Filter */}
                <div>
                  <label className="block text-sm font-medium mb-2">Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Categories</option>
                    {categories.map((category) => (
                      <option key={category} value={category} className="capitalize">
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Price Filter */}
                <div>
                  <label className="block text-sm font-medium mb-2">Price Range</label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={onlyFreeEvents}
                        onChange={(e) => setOnlyFreeEvents(e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm">Free events only</span>
                    </div>
                    {!onlyFreeEvents && (
                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder="Min"
                          value={priceRange[0]}
                          onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                          className="flex-1 p-2 border border-gray-300 rounded text-sm"
                        />
                        <input
                          type="number"
                          placeholder="Max"
                          value={priceRange[1]}
                          onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                          className="flex-1 p-2 border border-gray-300 rounded text-sm"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Date Filter */}
                <div>
                  <label className="block text-sm font-medium mb-2">Date</label>
                  <input
                    type="date"
                    value={selectedDate.toISOString().split('T')[0]}
                    onChange={(e) => setSelectedDate(new Date(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-800">{upcomingEvents.length}</div>
          <div className="text-sm text-blue-600">Upcoming Events</div>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-800">
            {upcomingEvents.filter(e => !e.ticketRequired || (e.price && e.price === 0)).length}
          </div>
          <div className="text-sm text-green-600">Free Events</div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-purple-800">{featuredEvents.length}</div>
          <div className="text-sm text-purple-600">Recommended</div>
        </div>
        
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-orange-800">{categories.length}</div>
          <div className="text-sm text-orange-600">Categories</div>
        </div>
      </div>

      {/* Events Display */}
      {viewMode === 'featured' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-800">Recommended for You</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onInterested={handleInterested}
                onShare={handleShare}
                onSelect={setSelectedEvent}
                getEventIcon={getEventIcon}
                getCategoryColor={getCategoryColor}
                formatDate={formatDate}
                formatTime={formatTime}
              />
            ))}
          </div>
        </div>
      )}

      {viewMode === 'list' && (
        <div className="space-y-4">
          {filteredEvents.map((event) => (
            <EventListItem
              key={event.id}
              event={event}
              onInterested={handleInterested}
              onShare={handleShare}
              onSelect={setSelectedEvent}
              getEventIcon={getEventIcon}
              getCategoryColor={getCategoryColor}
              formatDate={formatDate}
              formatTime={formatTime}
            />
          ))}
        </div>
      )}

      {viewMode === 'calendar' && (
        <CalendarView
          events={filteredEvents}
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          onEventSelect={setSelectedEvent}
        />
      )}

      {/* Event Detail Modal */}
      <AnimatePresence>
        {selectedEvent && (
          <EventDetailModal
            event={selectedEvent}
            onClose={() => setSelectedEvent(null)}
            onInterested={handleInterested}
            onShare={handleShare}
            getEventIcon={getEventIcon}
            getCategoryColor={getCategoryColor}
            formatDate={formatDate}
            formatTime={formatTime}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Event Card Component
const EventCard: React.FC<{
  event: Event;
  onInterested: (id: string) => void;
  onShare: (event: Event) => void;
  onSelect: (event: Event) => void;
  getEventIcon: (category: string) => React.ReactNode;
  getCategoryColor: (category: string) => string;
  formatDate: (date: string) => string;
  formatTime: (time: string) => string;
}> = ({ event, onInterested, onShare, onSelect, getEventIcon, getCategoryColor, formatDate, formatTime }) => (
  <motion.div
    whileHover={{ y: -2 }}
    className="bg-white rounded-2xl shadow-lg overflow-hidden cursor-pointer"
    onClick={() => onSelect(event)}
  >
    {event.image && (
      <div className="relative h-48 overflow-hidden">
        <img
          src={event.image}
          alt={event.name}
          className="w-full h-full object-cover transition-transform hover:scale-105"
        />
        <div className="absolute top-4 left-4">
          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getCategoryColor(event.category)}`}>
            {event.category}
          </span>
        </div>
        <div className="absolute top-4 right-4 flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onInterested(event.id);
            }}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              event.isUserInterested
                ? 'bg-red-500 text-white'
                : 'bg-white/90 text-gray-600 hover:bg-red-500 hover:text-white'
            }`}
          >
            <Heart className={`w-4 h-4 ${event.isUserInterested ? 'fill-current' : ''}`} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShare(event);
            }}
            className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center text-gray-600 hover:bg-blue-500 hover:text-white transition-colors"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    )}
    
    <div className="p-6">
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-bold text-lg text-gray-800 line-clamp-2">{event.name}</h3>
        {event.reviews && (
          <div className="flex items-center gap-1 ml-2">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-medium">{event.reviews.rating}</span>
          </div>
        )}
      </div>
      
      <p className="text-gray-600 text-sm mb-4 line-clamp-2">{event.description}</p>
      
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="w-4 h-4" />
          <span>{formatDate(event.date)}</span>
          <Clock className="w-4 h-4 ml-2" />
          <span>{formatTime(event.time)}</span>
        </div>
        
        {event.location && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4" />
            <span>{event.location}</span>
          </div>
        )}
        
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Users className="w-4 h-4" />
          <span>{event.attendeeCount} attending</span>
          {event.friendsAttending.length > 0 && (
            <span className="text-blue-600">
              • {event.friendsAttending.length} friends going
            </span>
          )}
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div>
          {event.ticketRequired ? (
            <div className="flex items-center gap-1">
              <Ticket className="w-4 h-4 text-blue-500" />
              <span className="font-semibold text-blue-600">
                {event.price ? `$${event.price}` : 'Ticketed'}
              </span>
            </div>
          ) : (
            <span className="text-green-600 font-semibold">Free</span>
          )}
        </div>
        
        {event.spotsLeft && event.spotsLeft < 10 && (
          <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
            {event.spotsLeft} spots left
          </span>
        )}
      </div>
    </div>
  </motion.div>
);

// Event List Item Component
const EventListItem: React.FC<{
  event: Event;
  onInterested: (id: string) => void;
  onShare: (event: Event) => void;
  onSelect: (event: Event) => void;
  getEventIcon: (category: string) => React.ReactNode;
  getCategoryColor: (category: string) => string;
  formatDate: (date: string) => string;
  formatTime: (time: string) => string;
}> = ({ event, onInterested, onShare, onSelect, getEventIcon, getCategoryColor, formatDate, formatTime }) => (
  <motion.div
    whileHover={{ x: 4 }}
    className="bg-white rounded-xl shadow-md border border-gray-200 p-6 cursor-pointer"
    onClick={() => onSelect(event)}
  >
    <div className="flex gap-4">
      {event.image && (
        <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
          <img
            src={event.image}
            alt={event.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-bold text-lg text-gray-800 truncate">{event.name}</h3>
          <div className="flex items-center gap-2 ml-4">
            {event.reviews && (
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-medium">{event.reviews.rating}</span>
              </div>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onInterested(event.id);
              }}
              className={`p-1 rounded-full transition-colors ${
                event.isUserInterested
                  ? 'text-red-500'
                  : 'text-gray-400 hover:text-red-500'
              }`}
            >
              <Heart className={`w-5 h-5 ${event.isUserInterested ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getCategoryColor(event.category)}`}>
            {event.category}
          </span>
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(event.date)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{formatTime(event.time)}</span>
          </div>
        </div>
        
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{event.description}</p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{event.attendeeCount} attending</span>
            </div>
            
            {event.ticketRequired ? (
              <div className="flex items-center gap-1">
                <Ticket className="w-4 h-4 text-blue-500" />
                <span className="font-semibold text-blue-600">
                  {event.price ? `$${event.price}` : 'Ticketed'}
                </span>
              </div>
            ) : (
              <span className="text-green-600 font-semibold">Free</span>
            )}
          </div>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShare(event);
            }}
            className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  </motion.div>
);

// Calendar View Component (simplified)
const CalendarView: React.FC<{
  events: Event[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onEventSelect: (event: Event) => void;
}> = ({ events, selectedDate, onDateSelect, onEventSelect }) => (
  <div className="bg-white rounded-2xl shadow-lg p-6">
    <div className="text-center mb-6">
      <h3 className="text-xl font-bold">Calendar View</h3>
      <p className="text-gray-600">Click on a date to see events</p>
    </div>
    
    <div className="grid grid-cols-7 gap-2 mb-4">
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
        <div key={day} className="text-center font-medium text-gray-600 p-2">
          {day}
        </div>
      ))}
    </div>
    
    {/* Calendar grid would go here - simplified for this example */}
    <div className="text-center text-gray-500 py-8">
      <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
      <p>Calendar component would be implemented here</p>
      <p className="text-sm">Showing {events.length} events for selected period</p>
    </div>
  </div>
);

// Event Detail Modal Component
const EventDetailModal: React.FC<{
  event: Event;
  onClose: () => void;
  onInterested: (id: string) => void;
  onShare: (event: Event) => void;
  getEventIcon: (category: string) => React.ReactNode;
  getCategoryColor: (category: string) => string;
  formatDate: (date: string) => string;
  formatTime: (time: string) => string;
}> = ({ event, onClose, onInterested, onShare, getEventIcon, getCategoryColor, formatDate, formatTime }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    onClick={onClose}
  >
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      {event.image && (
        <div className="relative h-64 overflow-hidden rounded-t-2xl">
          <img
            src={event.image}
            alt={event.name}
            className="w-full h-full object-cover"
          />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
          >
            ×
          </button>
        </div>
      )}
      
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800">{event.name}</h2>
          {event.reviews && (
            <div className="flex items-center gap-1">
              <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              <span className="font-medium">{event.reviews.rating}</span>
              <span className="text-gray-600">({event.reviews.count})</span>
            </div>
          )}
        </div>
        
        <p className="text-gray-700 mb-6">{event.description}</p>
        
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-blue-500" />
              <span>{formatDate(event.date)}</span>
            </div>
            
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-blue-500" />
              <span>{formatTime(event.time)}</span>
              {event.endTime && <span>- {formatTime(event.endTime)}</span>}
            </div>
            
            {event.location && (
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-blue-500" />
                <span>{event.location}</span>
              </div>
            )}
            
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-blue-500" />
              <span>{event.attendeeCount} attending</span>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getCategoryColor(event.category)}`}>
                {event.category}
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <Ticket className="w-5 h-5 text-blue-500" />
              <span>
                {event.ticketRequired 
                  ? (event.price ? `$${event.price}` : 'Ticketed Event')
                  : 'Free Event'
                }
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">
                Organized by: {event.organizer}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={() => onInterested(event.id)}
            className={`flex-1 py-3 px-6 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${
              event.isUserInterested
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            <Heart className={`w-5 h-5 ${event.isUserInterested ? 'fill-current' : ''}`} />
            {event.isUserInterested ? 'Interested' : 'Mark Interested'}
          </button>
          
          <button
            onClick={() => onShare(event)}
            className="px-6 py-3 border-2 border-gray-300 rounded-xl hover:border-gray-400 transition-colors flex items-center gap-2"
          >
            <Share2 className="w-5 h-5" />
            Share
          </button>
          
          {event.ticketRequired && (
            <button className="px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors flex items-center gap-2">
              <ExternalLink className="w-5 h-5" />
              Book Tickets
            </button>
          )}
        </div>
      </div>
    </motion.div>
  </motion.div>
);