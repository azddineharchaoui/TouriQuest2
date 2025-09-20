import React, { useState } from 'react';
import { 
  Search, 
  Bell, 
  User, 
  Menu, 
  X, 
  Home, 
  MapPin, 
  Compass, 
  Calendar, 
  MessageCircle,
  Settings,
  LogOut,
  Shield
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from './ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';

interface NavigationHeaderProps {
  currentPage?: string;
  onNavigate?: (section: string) => void;
  onSearch?: (query: string) => void;
}

export function NavigationHeader({ currentPage = 'dashboard', onNavigate, onSearch }: NavigationHeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigationItems = [
    {
      id: 'dashboard',
      label: 'Accommodations',
      icon: Home,
      path: 'dashboard',
      description: 'Find and book places to stay'
    },
    {
      id: 'discover',
      label: 'Discover',
      icon: MapPin,
      path: 'discover',
      description: 'Explore points of interest'
    },
    {
      id: 'experiences',
      label: 'Experiences',
      icon: Compass,
      path: 'experiences',
      description: 'Book unique activities'
    },
    {
      id: 'itinerary',
      label: 'My Trips',
      icon: Calendar,
      path: 'itinerary',
      description: 'Manage your travel plans'
    }
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  const handleNavigation = (path: string) => {
    onNavigate?.(path);
    setIsMobileMenuOpen(false);
  };

  const isActive = (path: string) => {
    return currentPage === path || 
           (path === 'dashboard' && currentPage === 'property-detail') ||
           (path === 'discover' && (currentPage === 'poi-discovery' || currentPage === 'poi-detail'));
  };

  const MobileMenu = () => (
    <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="lg:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 bg-off-white">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center space-x-2 mb-8">
            <div className="w-8 h-8 bg-primary-teal rounded-lg flex items-center justify-center">
              <Compass className="h-5 w-5 text-black" />
            </div>
            <span className="font-bold text-xl text-navy">TouriQuest</span>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.path)}
                  className={`
                    w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-200
                    ${active 
                      ? 'bg-primary-teal text-black shadow-md' 
                      : 'text-dark-gray hover:bg-primary-tint hover:text-primary-teal'
                    }
                  `}
                >
                  <Icon className="h-5 w-5" />
                  <div>
                    <p className="font-medium">{item.label}</p>
                    <p className={`text-xs ${active ? 'text-black/70' : 'text-medium-gray'}`}>
                      {item.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </nav>

          {/* User Section */}
          <div className="border-t border-pale-gray pt-4">
            <button
              onClick={() => handleNavigation('profile')}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left hover:bg-primary-tint transition-colors"
            >
              <Avatar className="w-8 h-8">
                <AvatarImage src="https://images.unsplash.com/photo-1494790108755-2616b612b1c?w=100&h=100&fit=crop" />
                <AvatarFallback>SC</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-navy">Sarah Chen</p>
                <p className="text-xs text-medium-gray">View Profile</p>
              </div>
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );

  const UserMenu = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarImage src="https://images.unsplash.com/photo-1494790108755-2616b612b1c?w=100&h=100&fit=crop" alt="Sarah Chen" />
            <AvatarFallback>SC</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 bg-white border-pale-gray shadow-lg" align="end" forceMount>
        <div className="flex items-center justify-start gap-2 p-2">
          <div className="flex flex-col space-y-1 leading-none">
            <p className="font-medium text-navy">Sarah Chen</p>
            <p className="w-[200px] truncate text-sm text-medium-gray">
              sarah.chen@email.com
            </p>
          </div>
        </div>
        <DropdownMenuSeparator className="bg-pale-gray" />
        <DropdownMenuItem 
          className="cursor-pointer hover:bg-primary-tint text-dark-gray"
          onClick={() => handleNavigation('profile')}
        >
          <User className="mr-2 h-4 w-4" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem 
          className="cursor-pointer hover:bg-primary-tint text-dark-gray"
          onClick={() => handleNavigation('ai-assistant')}
        >
          <MessageCircle className="mr-2 h-4 w-4" />
          AI Assistant
        </DropdownMenuItem>
        <DropdownMenuItem 
          className="cursor-pointer hover:bg-primary-tint text-dark-gray"
          onClick={() => handleNavigation('settings')}
        >
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>
        {/* Admin access - in real app would be role-based */}
        <DropdownMenuItem 
          className="cursor-pointer hover:bg-primary-tint text-dark-gray"
          onClick={() => handleNavigation('admin')}
        >
          <Shield className="mr-2 h-4 w-4" />
          Admin Dashboard
        </DropdownMenuItem>
        <DropdownMenuItem 
          className="cursor-pointer hover:bg-primary-tint text-dark-gray"
          onClick={() => handleNavigation('status')}
        >
          <MessageCircle className="mr-2 h-4 w-4" />
          Project Status
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-pale-gray" />
        <DropdownMenuItem className="cursor-pointer hover:bg-red-50 text-red-600">
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-pale-gray shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Mobile Menu */}
          <div className="flex items-center space-x-4">
            <MobileMenu />
            
            {/* Logo */}
            <div className="flex items-center space-x-2 cursor-pointer" onClick={() => handleNavigation('dashboard')}>
              <div className="w-8 h-8 bg-primary-teal rounded-lg flex items-center justify-center">
                <Compass className="h-5 w-5 text-black" />
              </div>
              <span className="hidden sm:block font-bold text-xl text-navy">TouriQuest</span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.path)}
                  className={`
                    flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                    ${active 
                      ? 'bg-primary-teal text-black shadow-sm' 
                      : 'text-dark-gray hover:text-primary-teal hover:bg-primary-tint'
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Search Bar */}
          <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
            <form onSubmit={handleSearch} className="w-full">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-medium-gray" />
                <Input
                  type="search"
                  placeholder="Search destinations, experiences..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-off-white border-light-gray rounded-lg focus:ring-2 focus:ring-primary-teal focus:border-transparent"
                />
              </div>
            </form>
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-3">
            {/* Mobile Search */}
            <Button variant="ghost" size="sm" className="md:hidden">
              <Search className="h-5 w-5 text-dark-gray" />
            </Button>

            {/* Notifications */}
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="h-5 w-5 text-dark-gray" />
              <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-secondary-orange text-black text-xs">
                3
              </Badge>
            </Button>

            {/* AI Assistant */}
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => handleNavigation('ai-assistant')}
              className="hidden sm:flex"
            >
              <MessageCircle className="h-5 w-5 text-dark-gray" />
            </Button>

            {/* User Menu */}
            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  );
}