import React from 'react';
import { 
  Compass, 
  Mail, 
  Phone, 
  MapPin, 
  Facebook, 
  Twitter, 
  Instagram, 
  Linkedin,
  Youtube,
  Leaf,
  Shield,
  Heart,
  Globe
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Separator } from './ui/separator';

interface FooterProps {
  onNavigate?: (section: string) => void;
}

export function Footer({ onNavigate }: FooterProps) {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    explore: [
      { label: 'Riads & Hotels', action: () => onNavigate?.('dashboard') },
      { label: 'Desert Tours', action: () => onNavigate?.('experiences') },
      { label: 'Historical Sites', action: () => onNavigate?.('discover') },
      { label: 'Atlas Mountains', action: () => onNavigate?.('discover') }
    ],
    services: [
      { label: 'My Trips', action: () => onNavigate?.('itinerary') },
      { label: 'Profile', action: () => onNavigate?.('profile') },
      { label: 'AI Assistant', action: () => onNavigate?.('ai-assistant') }    ],
    company: [
      { label: 'About TouriQuest', action: () => onNavigate?.('about') },
      { label: 'Sustainability', action: () => onNavigate?.('sustainability') },
      { label: 'Contact Us', action: () => onNavigate?.('contact') },
      { label: 'Help Center', action: () => onNavigate?.('help') }
    ]
  };

  const socialLinks = [
    { icon: Facebook, label: 'Facebook', href: '#' },
    { icon: Twitter, label: 'Twitter', href: '#' },
    { icon: Instagram, label: 'Instagram', href: '#' },
    { icon: Linkedin, label: 'LinkedIn', href: '#' },
    { icon: Youtube, label: 'YouTube', href: '#' }
  ];

  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      {/* Newsletter Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
            <div>
              <h3 className="text-xl font-bold mb-2 text-black">Discover Morocco</h3>
              <p className="text-gray-700 text-sm leading-relaxed">
                Get exclusive offers on Moroccan tours, desert adventures, and cultural experiences.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input 
                placeholder="Enter your email address"
                className="flex-1 bg-gray-50 border-gray-300 text-gray-800 placeholder:text-gray-500"
              />
              <Button className="bg-orange-600 hover:bg-orange-700 text-black border-0 font-medium">
                Subscribe
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="md:col-span-1">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
                <Compass className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-800">TouriQuest</span>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed mb-6">
              Your gateway to authentic Moroccan experiences, from imperial cities to Sahara adventures.
            </p>
            
            {/* Contact Info */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-gray-600">
                <Mail className="h-4 w-4 text-orange-600" />
                <span className="text-sm">hello@moroccoquest.com</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-600">
                <Phone className="h-4 w-4 text-orange-600" />
                <span className="text-sm">+212 522 123 456</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-600">
                <MapPin className="h-4 w-4 text-orange-600" />
                <span className="text-sm">Marrakech, Morocco</span>
              </div>
            </div>
          </div>

          {/* Links Sections */}
          <div>
            <h4 className="font-semibold mb-4 text-gray-800">Explore Morocco</h4>
            <ul className="space-y-2">
              {footerLinks.explore.map((link, index) => (
                <li key={index}>
                  <button 
                    onClick={link.action}
                    className="text-gray-600 hover:text-orange-600 transition-colors text-sm"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-gray-800">Services</h4>
            <ul className="space-y-2">
              {footerLinks.services.map((link, index) => (
                <li key={index}>
                  <button 
                    onClick={link.action}
                    className="text-gray-600 hover:text-orange-600 transition-colors text-sm"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-gray-800">Company</h4>
            <ul className="space-y-2">
              {footerLinks.company.map((link, index) => (
                <li key={index}>
                  <button 
                    onClick={link.action}
                    className="text-gray-600 hover:text-orange-600 transition-colors text-sm"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Social Media & Bottom Section */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            {/* Social Media */}
            <div className="flex items-center space-x-4">
              <span className="text-gray-600 text-sm font-medium">Follow us:</span>
              <div className="flex space-x-3">
                {socialLinks.map((social, index) => {
                  const Icon = social.icon;
                  return (
                    <a
                      key={index}
                      href={social.href}
                      aria-label={social.label}
                      className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-orange-600 hover:text-white transition-all duration-200 text-gray-600"
                    >
                      <Icon className="h-4 w-4" />
                    </a>
                  );
                })}
              </div>
            </div>

            {/* Language & Stats */}
            <div className="flex items-center space-x-4 text-sm">
              <button className="flex items-center space-x-1 text-gray-600 hover:text-orange-600 transition-colors">
                <Globe className="h-4 w-4" />
                <span>العربية | English</span>
              </button>
              <span className="text-gray-400">|</span>
              <span className="text-gray-600">50+ Tours</span>
              <span className="text-gray-400">|</span>
              <span className="text-gray-600">5 Cities</span>
            </div>
          </div>

          {/* Copyright & Legal */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-3 md:space-y-0">
              <p className="text-gray-500 text-sm">
                © {currentYear} TouriQuest. All rights reserved.
              </p>
              <div className="flex flex-wrap items-center space-x-4">
                <button 
                  onClick={() => onNavigate?.('privacy')}
                  className="text-gray-500 hover:text-orange-600 transition-colors text-sm"
                >
                  Privacy Policy
                </button>
                <button 
                  onClick={() => onNavigate?.('terms')}
                  className="text-gray-500 hover:text-orange-600 transition-colors text-sm"
                >
                  Terms of Service
                </button>
                <button 
                  onClick={() => onNavigate?.('cookies')}
                  className="text-gray-500 hover:text-orange-600 transition-colors text-sm"
                >
                  Cookie Policy
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}