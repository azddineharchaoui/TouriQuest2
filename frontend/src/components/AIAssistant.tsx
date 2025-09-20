import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Mic, 
  Paperclip, 
  Camera, 
  MapPin, 
  Calendar, 
  Star, 
  Heart, 
  Bookmark, 
  Share2, 
  Bot, 
  User, 
  Clock, 
  Search, 
  Filter, 
  MoreHorizontal,
  Sparkles,
  Compass,
  Phone,
  Info,
  ChevronDown,
  Volume2,
  VolumeX,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { VoiceAssistant } from './VoiceAssistant';
import { AIRecommendations } from './AIRecommendations';
import { SmartNotifications } from './SmartNotifications';

interface Message {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
  richContent?: {
    type: 'property' | 'poi' | 'itinerary' | 'map' | 'price-comparison';
    data: any;
  };
  isLoading?: boolean;
}

interface AIAssistantProps {
  onClose?: () => void;
}

const mockMessages: Message[] = [
  {
    id: '1',
    type: 'system',
    content: 'Welcome to TouriQuest! I\'m your AI travel assistant. How can I help you plan your next adventure?',
    timestamp: new Date(Date.now() - 3600000)
  },
  {
    id: '2',
    type: 'user',
    content: 'I\'m planning a trip to Paris for next month. Can you suggest some good hotels?',
    timestamp: new Date(Date.now() - 3500000)
  },
  {
    id: '3',
    type: 'ai',
    content: 'I\'d be happy to help you find hotels in Paris! Based on your travel history and preferences, I\'ve found some excellent options that match your style. Here are my top recommendations:',
    timestamp: new Date(Date.now() - 3400000),
    richContent: {
      type: 'property',
      data: {
        recommendations: [
          {
            id: '1',
            name: 'Hotel des Grands Boulevards',
            location: 'Montmartre, Paris',
            rating: 4.8,
            price: 189,
            image: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=300&h=200&fit=crop',
            features: ['Free WiFi', 'Breakfast included', 'Eco-friendly']
          },
          {
            id: '2',
            name: 'Le Marais Boutique Hotel',
            location: 'Le Marais, Paris',
            rating: 4.6,
            price: 156,
            image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=300&h=200&fit=crop',
            features: ['Historic building', 'Central location', 'Pet-friendly']
          }
        ]
      }
    }
  }
];

const quickSuggestions = [
  'Find hotels in Paris',
  'What to do today?',
  'Show my bookings',
  'Plan my day',
  'Weather forecast',
  'Nearby restaurants'
];

export function AIAssistant({ onClose }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [contextInfo, setContextInfo] = useState({
    location: 'Paris, France',
    weather: '22°C Sunny',
    nextTrip: 'Tokyo - 5 days'
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: generateAIResponse(content),
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const generateAIResponse = (userInput: string): string => {
    const lowercaseInput = userInput.toLowerCase();
    
    if (lowercaseInput.includes('hotel') || lowercaseInput.includes('accommodation')) {
      return "I've found some great accommodation options for you! Let me show you hotels that match your preferences and budget.";
    } else if (lowercaseInput.includes('restaurant') || lowercaseInput.includes('food')) {
      return "Perfect! I know some amazing local restaurants. Based on your dietary preferences and location, here are my top picks.";
    } else if (lowercaseInput.includes('weather')) {
      return "The weather looks great! Currently 22°C and sunny in Paris. Perfect for outdoor sightseeing. Should I suggest some outdoor activities?";
    } else if (lowercaseInput.includes('itinerary') || lowercaseInput.includes('plan')) {
      return "I'd love to help you plan your perfect day! Let me create a personalized itinerary based on your interests and available time.";
    } else {
      return "That's a great question! Let me help you with that. I can provide personalized recommendations based on your travel preferences.";
    }
  };

  const handleQuickSuggestion = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  const PropertyCard = ({ property }: { property: any }) => (
    <Card className="w-80 flex-shrink-0">
      <CardContent className="p-0">
        <ImageWithFallback
          src={property.image}
          alt={property.name}
          className="w-full h-32 object-cover rounded-t-lg"
        />
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h4 className="font-medium">{property.name}</h4>
            <div className="flex items-center space-x-1">
              <Star className="h-4 w-4 text-yellow-400 fill-current" />
              <span className="text-sm">{property.rating}</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-2">{property.location}</p>
          <div className="flex flex-wrap gap-1 mb-3">
            {property.features.map((feature: string) => (
              <Badge key={feature} variant="outline" className="text-xs">
                {feature}
              </Badge>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <div className="text-lg font-medium text-primary">
              €{property.price}/night
            </div>
            <div className="flex space-x-2">
              <Button size="sm" variant="outline">
                <Heart className="h-3 w-3" />
              </Button>
              <Button size="sm">Book Now</Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const MessageBubble = ({ message }: { message: Message }) => (
    <div className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
      {message.type === 'ai' && (
        <Avatar className="h-8 w-8 mr-3 mt-1">
          <AvatarFallback className="bg-primary text-black">
            <Bot className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className={`max-w-[70%] ${message.type === 'system' ? 'mx-auto' : ''}`}>
        <div
          className={`p-3 rounded-lg ${
            message.type === 'user'
              ? 'bg-primary text-black'
              : message.type === 'ai'
              ? 'bg-muted'
              : 'bg-muted/50 text-center text-sm'
          }`}
        >
          {message.content}
        </div>
        
        {message.richContent && message.richContent.type === 'property' && (
          <div className="mt-3">
            <ScrollArea className="w-full">
              <div className="flex space-x-3 pb-2">
                {message.richContent.data.recommendations.map((property: any) => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
        
        <div className="text-xs text-muted-foreground mt-1 flex items-center space-x-2">
          <span>{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          {message.type === 'ai' && (
            <Button variant="ghost" size="sm" className="h-auto p-0 text-xs">
              <Volume2 className="h-3 w-3 mr-1" />
              Play
            </Button>
          )}
        </div>
      </div>
      
      {message.type === 'user' && (
        <Avatar className="h-8 w-8 ml-3 mt-1">
          <AvatarFallback>
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar - Context & Features */}
      <div className="w-80 border-r bg-muted/30 p-4 hidden lg:block">
        <div className="space-y-6">
          {/* Context Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>Travel Context</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{contextInfo.location}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <Compass className="h-4 w-4 text-muted-foreground" />
                <span>{contextInfo.weather}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{contextInfo.nextTrip}</span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                onClick={() => setShowRecommendations(!showRecommendations)}
              >
                <Star className="h-4 w-4 mr-2" />
                View Recommendations
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                onClick={() => setShowVoice(!showVoice)}
              >
                <Mic className="h-4 w-4 mr-2" />
                Voice Assistant
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Info className="h-4 w-4 mr-2" />
                Smart Updates
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Phone className="h-4 w-4 mr-2" />
                Emergency Help
              </Button>
            </CardContent>
          </Card>

          {/* Conversation History */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recent Conversations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm p-2 hover:bg-muted rounded cursor-pointer">
                Paris Trip Planning
              </div>
              <div className="text-sm p-2 hover:bg-muted rounded cursor-pointer">
                Tokyo Restaurant Recommendations
              </div>
              <div className="text-sm p-2 hover:bg-muted rounded cursor-pointer">
                Flight Booking Help
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary text-black">
                  <Bot className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="font-medium">TouriQuest AI Assistant</h2>
                <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Online • Ready to help</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="icon">
                <Search className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            
            {isTyping && (
              <div className="flex justify-start mb-4">
                <Avatar className="h-8 w-8 mr-3 mt-1">
                  <AvatarFallback className="bg-primary text-black">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-muted p-3 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">AI is typing...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Quick Suggestions */}
        <div className="p-4 border-t border-b">
          <ScrollArea className="w-full">
            <div className="flex space-x-2 pb-2">
              {quickSuggestions.map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickSuggestion(suggestion)}
                  className="whitespace-nowrap"
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Input Area */}
        <div className="p-4 bg-muted/30">
          <div className="flex items-end space-x-2">
            <div className="flex-1 bg-background border rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask me anything about your trip..."
                  className="flex-1 border-none p-0 focus:ring-0"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(inputValue);
                    }
                  }}
                />
                <div className="flex items-center space-x-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Camera className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => setShowVoice(true)}
                  >
                    <Mic className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <Button 
              onClick={() => handleSendMessage(inputValue)}
              disabled={!inputValue.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-xs text-muted-foreground mt-2 text-center">
            AI responses are generated and may not be accurate. Always verify important information.
          </div>
        </div>
      </div>

      {/* Side Panels */}
      {showVoice && (
        <VoiceAssistant onClose={() => setShowVoice(false)} />
      )}
      
      {showRecommendations && (
        <AIRecommendations onClose={() => setShowRecommendations(false)} />
      )}
      
      {showNotifications && (
        <SmartNotifications onClose={() => setShowNotifications(false)} />
      )}
    </div>
  );
}