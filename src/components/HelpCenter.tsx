import React, { useState } from 'react';
import { 
  HelpCircle, 
  Search, 
  BookOpen, 
  CreditCard,
  MapPin,
  Calendar,
  Phone,
  Mail,
  ChevronDown,
  ChevronRight,
  MessageCircle,
  Shield,
  Clock,
  Users,
  Plane,
  Camera
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';

interface HelpCenterProps {
  onBack?: () => void;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export function HelpCenter({ onBack }: HelpCenterProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  const categories = [
    { id: 'all', name: 'All Topics', icon: BookOpen },
    { id: 'booking', name: 'Booking & Payment', icon: CreditCard },
    { id: 'tours', name: 'Tour Information', icon: MapPin },
    { id: 'travel', name: 'Travel Preparation', icon: Plane },
    { id: 'support', name: 'Customer Support', icon: MessageCircle }
  ];

  const faqs: FAQ[] = [
    {
      id: '1',
      question: 'How do I book a tour with TouriQuest?',
      answer: 'Booking is simple! Browse our tours, select your preferred dates, and complete the booking form. You can pay online or contact us for assistance. We\'ll send you a confirmation email with all details.',
      category: 'booking'
    },
    {
      id: '2',
      question: 'What payment methods do you accept?',
      answer: 'We accept major credit cards (Visa, MasterCard, American Express), PayPal, and bank transfers. For local bookings in Morocco, we also accept cash payments at our office.',
      category: 'booking'
    },
    {
      id: '3',
      question: 'What\'s included in the tour price?',
      answer: 'Our tours typically include accommodation, meals as specified, professional guide, transportation, and entrance fees. Specific inclusions vary by tour - check the detailed itinerary for each tour.',
      category: 'tours'
    },
    {
      id: '4',
      question: 'Can I customize my tour itinerary?',
      answer: 'Absolutely! We specialize in custom tours. Contact us with your preferences, budget, and timeline, and we\'ll create a personalized itinerary just for you.',
      category: 'tours'
    },
    {
      id: '5',
      question: 'What should I pack for a Morocco trip?',
      answer: 'Pack comfortable walking shoes, light layers for day/night temperature changes, sun protection, and modest clothing for cultural sites. We\'ll send a detailed packing list after booking.',
      category: 'travel'
    },
    {
      id: '6',
      question: 'Do I need a visa to visit Morocco?',
      answer: 'Many nationalities can enter Morocco visa-free for up to 90 days. Check with the Moroccan embassy in your country for specific requirements based on your nationality.',
      category: 'travel'
    },
    {
      id: '7',
      question: 'What\'s your cancellation policy?',
      answer: 'Free cancellation up to 48 hours before the tour. For cancellations within 48 hours, a 50% fee applies. No refund for no-shows. We recommend travel insurance for unexpected changes.',
      category: 'booking'
    },
    {
      id: '8',
      question: 'Are your tours suitable for families with children?',
      answer: 'Yes! We offer family-friendly tours and can adapt activities for different age groups. Child discounts available. Let us know the ages of your children when booking.',
      category: 'tours'
    },
    {
      id: '9',
      question: 'How do I contact you during my trip?',
      answer: 'You\'ll receive emergency contact numbers and your guide\'s WhatsApp. Our 24/7 support line is always available for urgent assistance during your trip.',
      category: 'support'
    },
    {
      id: '10',
      question: 'What languages do your guides speak?',
      answer: 'Our guides speak English, French, Arabic, and Berber. Some also speak Spanish, German, and Italian. We can arrange guides for other languages with advance notice.',
      category: 'tours'
    }
  ];

  const quickHelp = [
    {
      icon: Phone,
      title: 'Call Us',
      description: 'Speak directly with our team',
      action: 'tel:+212522123456',
      label: '+212 522 123 456'
    },
    {
      icon: MessageCircle,
      title: 'WhatsApp',
      description: 'Quick chat support',
      action: 'https://wa.me/212666789123',
      label: 'Chat Now'
    },
    {
      icon: Mail,
      title: 'Email Support',
      description: 'Detailed inquiries',
      action: 'mailto:help@touriquest.com',
      label: 'help@touriquest.com'
    }
  ];

  const filteredFAQs = faqs.filter(faq => {
    const matchesCategory = activeCategory === 'all' || faq.category === activeCategory;
    const matchesSearch = searchQuery === '' || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleFAQ = (id: string) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-black">
        <div className="container mx-auto px-6 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
                <HelpCircle className="h-8 w-8 text-black" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Help Center</h1>
            <p className="text-xl text-black/90 leading-relaxed max-w-3xl mx-auto">
              Find answers to common questions, get travel tips, and learn everything 
              you need to know about your Morocco adventure.
            </p>
            {onBack && (
              <Button 
                onClick={onBack}
                variant="outline" 
                className="mt-8 bg-white/10 border-white/30 text-black hover:bg-white/20"
              >
                ← Back to Home
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-16">
        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              placeholder="Search for answers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 py-4 text-lg"
            />
          </div>
        </div>

        {/* Quick Help */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-gray-800 text-center mb-8">Need Immediate Help?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {quickHelp.map((help, index) => {
              const Icon = help.icon;
              return (
                <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <Icon className="h-6 w-6 text-purple-600" />
                    </div>
                    <h3 className="font-semibold text-gray-800 mb-2">{help.title}</h3>
                    <p className="text-gray-600 text-sm mb-4">{help.description}</p>
                    <a 
                      href={help.action}
                      className="text-purple-600 hover:text-purple-700 font-medium"
                    >
                      {help.label}
                    </a>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Category Sidebar */}
          <div className="lg:col-span-1">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Categories</h3>
            <div className="space-y-2">
              {categories.map((category) => {
                const Icon = category.icon;
                return (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      activeCategory === category.id
                        ? 'bg-purple-100 text-purple-700 border border-purple-200'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{category.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* FAQ Content */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-800">
                Frequently Asked Questions
              </h3>
              <Badge variant="outline">
                {filteredFAQs.length} {filteredFAQs.length === 1 ? 'result' : 'results'}
              </Badge>
            </div>

            {filteredFAQs.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">No results found</h3>
                  <p className="text-gray-500">
                    Try searching with different keywords or browse all categories.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredFAQs.map((faq) => (
                  <Card key={faq.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-0">
                      <button
                        onClick={() => toggleFAQ(faq.id)}
                        className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors"
                      >
                        <span className="font-medium text-gray-800 pr-4">{faq.question}</span>
                        {expandedFAQ === faq.id ? (
                          <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                        )}
                      </button>
                      {expandedFAQ === faq.id && (
                        <div className="px-6 pb-6">
                          <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Contact Support */}
        <div className="mt-16">
          <Card className="bg-gradient-to-r from-purple-600 to-indigo-600 text-black">
            <CardContent className="p-8 text-center">
              <h3 className="text-2xl font-bold mb-4">Still Need Help?</h3>
              <p className="text-black/90 mb-6 max-w-2xl mx-auto">
                Can't find what you're looking for? Our friendly support team is here to help 
                with any questions about your Morocco travel plans.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg" 
                  className="bg-white text-purple-600 hover:bg-gray-100 font-semibold"
                >
                  Contact Support
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-white text-black hover:bg-white/10"
                >
                  Browse Tours
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Popular Articles */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-gray-800 text-center mb-8">Popular Help Articles</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Camera,
                title: 'Photography Tips for Morocco',
                description: 'Best spots and techniques for capturing Morocco\'s beauty'
              },
              {
                icon: Clock,
                title: 'Best Time to Visit Morocco',
                description: 'Seasonal guide and weather information'
              },
              {
                icon: Shield,
                title: 'Travel Safety in Morocco',
                description: 'Essential safety tips and precautions'
              },
              {
                icon: Users,
                title: 'Cultural Etiquette Guide',
                description: 'Respectful travel and local customs'
              },
              {
                icon: MapPin,
                title: 'Must-Visit Destinations',
                description: 'Top attractions and hidden gems'
              },
              {
                icon: Plane,
                title: 'Travel Insurance Guide',
                description: 'Protecting your Morocco adventure'
              }
            ].map((article, index) => {
              const Icon = article.icon;
              return (
                <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                      <Icon className="h-5 w-5 text-purple-600" />
                    </div>
                    <h3 className="font-semibold text-gray-800 mb-2">{article.title}</h3>
                    <p className="text-gray-600 text-sm">{article.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}