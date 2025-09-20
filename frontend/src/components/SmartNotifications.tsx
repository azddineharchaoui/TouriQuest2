import React, { useState } from 'react';
import { 
  X, 
  Bell, 
  CloudRain, 
  MapPin, 
  DollarSign, 
  Clock, 
  AlertTriangle, 
  Info, 
  CheckCircle, 
  Calendar, 
  Thermometer,
  Plane,
  Camera,
  Navigation,
  Shield,
  Zap,
  TrendingDown,
  Users,
  Star,
  Route
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';

interface SmartNotificationsProps {
  onClose: () => void;
}

const mockNotifications = {
  weather: [
    {
      id: '1',
      type: 'weather-suggestion',
      priority: 'high',
      title: 'Perfect Weather for Outdoor Activities!',
      message: 'Clear skies and 24°C today. Great time to visit Eiffel Tower or Seine river cruise.',
      action: 'View outdoor activities',
      timestamp: '2 minutes ago',
      icon: CloudRain,
      color: 'text-blue-500'
    }
  ],
  travel: [
    {
      id: '2',
      type: 'transportation',
      priority: 'urgent',
      title: 'Metro Line 1 Delayed',
      message: 'Your route to Louvre Museum affected. Alternative route available via Line 7.',
      action: 'Show alternative',
      timestamp: '5 minutes ago',
      icon: AlertTriangle,
      color: 'text-red-500'
    },
    {
      id: '3',
      type: 'checkin',
      priority: 'medium',
      title: 'Check-in Available',
      message: 'Hotel des Grands Boulevards check-in is now open. Skip the queue with mobile check-in.',
      action: 'Check in now',
      timestamp: '1 hour ago',
      icon: CheckCircle,
      color: 'text-green-500'
    }
  ],
  deals: [
    {
      id: '4',
      type: 'price-drop',
      priority: 'medium',
      title: '25% Price Drop Alert',
      message: 'Le Jules Verne restaurant now €180 (was €240). Limited availability for tonight.',
      action: 'Book now',
      timestamp: '30 minutes ago',
      icon: TrendingDown,
      color: 'text-green-600'
    }
  ],
  local: [
    {
      id: '5',
      type: 'event',
      priority: 'low',
      title: 'Jazz Festival Tonight',
      message: 'Free jazz concert at Place des Vosges, 8 PM. Perfect for your music interests!',
      action: 'Add to itinerary',
      timestamp: '2 hours ago',
      icon: Star,
      color: 'text-purple-500'
    }
  ],
  safety: [
    {
      id: '6',
      type: 'safety-update',
      priority: 'medium',
      title: 'Area Safety Update',
      message: 'Increased police presence in Montmartre due to large tourist groups. All safe to visit.',
      action: 'View details',
      timestamp: '4 hours ago',
      icon: Shield,
      color: 'text-orange-500'
    }
  ]
};

const notificationSettings = [
  { id: 'weather', label: 'Weather-based suggestions', enabled: true },
  { id: 'transport', label: 'Transportation alerts', enabled: true },
  { id: 'deals', label: 'Price drops & deals', enabled: true },
  { id: 'events', label: 'Local events', enabled: false },
  { id: 'safety', label: 'Safety updates', enabled: true },
  { id: 'checkin', label: 'Check-in reminders', enabled: true },
  { id: 'itinerary', label: 'Itinerary suggestions', enabled: false },
  { id: 'social', label: 'Friend activity', enabled: false }
];

export function SmartNotifications({ onClose }: SmartNotificationsProps) {
  const [activeTab, setActiveTab] = useState('all');
  const [settings, setSettings] = useState(
    notificationSettings.reduce((acc, setting) => ({
      ...acc,
      [setting.id]: setting.enabled
    }), {})
  );

  const handleSettingToggle = (settingId: string) => {
    setSettings(prev => ({
      ...prev,
      [settingId]: !prev[settingId]
    }));
  };

  const allNotifications = [
    ...mockNotifications.weather,
    ...mockNotifications.travel,
    ...mockNotifications.deals,
    ...mockNotifications.local,
    ...mockNotifications.safety
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'border-l-red-500 bg-red-50';
      case 'high': return 'border-l-orange-500 bg-orange-50';
      case 'medium': return 'border-l-blue-500 bg-blue-50';
      default: return 'border-l-gray-500 bg-gray-50';
    }
  };

  const NotificationCard = ({ notification }: { notification: any }) => {
    const Icon = notification.icon;
    return (
      <Card className={`border-l-4 ${getPriorityColor(notification.priority)} hover:shadow-md transition-shadow`}>
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div className={`p-2 rounded-full bg-white ${notification.color}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-sm">{notification.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                </div>
                <Badge 
                  variant={notification.priority === 'urgent' ? 'destructive' : 'secondary'}
                  className="text-xs"
                >
                  {notification.priority}
                </Badge>
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-muted-foreground">{notification.timestamp}</span>
                <Button size="sm" variant="outline">
                  {notification.action}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-medium">Smart Travel Updates</h2>
              <p className="text-sm text-muted-foreground">Contextual notifications for your trip</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex h-[calc(90vh-80px)]">
          {/* Sidebar - Settings */}
          <div className="w-80 border-r p-6 overflow-y-auto">
            <div className="space-y-6">
              {/* Quick Stats */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center space-x-2">
                    <Zap className="h-4 w-4 text-primary" />
                    <span>Today's Updates</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Active alerts</span>
                    <Badge variant="destructive">2</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">New suggestions</span>
                    <Badge>4</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Price drops</span>
                    <Badge variant="secondary">1</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Current Context */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Current Context</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center space-x-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>Le Marais, Paris</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <Thermometer className="h-4 w-4 text-muted-foreground" />
                    <span>24°C, Clear skies</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>Day 2 of 5-day trip</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <Route className="h-4 w-4 text-muted-foreground" />
                    <span>Next: Louvre Museum</span>
                  </div>
                </CardContent>
              </Card>

              {/* Notification Settings */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Notification Types</CardTitle>
                  <CardDescription>Customize what updates you receive</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {notificationSettings.map((setting) => (
                    <div key={setting.id} className="flex items-center justify-between">
                      <Label htmlFor={setting.id} className="text-sm cursor-pointer">
                        {setting.label}
                      </Label>
                      <Switch
                        id={setting.id}
                        checked={settings[setting.id]}
                        onCheckedChange={() => handleSettingToggle(setting.id)}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Emergency Access */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-red-600">Emergency</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button variant="destructive" size="sm" className="w-full">
                    <Shield className="h-4 w-4 mr-2" />
                    Emergency Assistance
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    24/7 support available
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            {/* Filter Tabs */}
            <div className="border-b p-4">
              <div className="flex space-x-1">
                {['all', 'urgent', 'weather', 'travel', 'deals', 'local'].map((tab) => (
                  <Button
                    key={tab}
                    size="sm"
                    variant={activeTab === tab ? 'default' : 'ghost'}
                    onClick={() => setActiveTab(tab)}
                    className="capitalize"
                  >
                    {tab}
                    {tab === 'urgent' && (
                      <Badge variant="destructive" className="ml-2 h-4 text-xs">
                        2
                      </Badge>
                    )}
                  </Button>
                ))}
              </div>
            </div>

            {/* Notifications List */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {activeTab === 'all' && allNotifications.map((notification) => (
                  <NotificationCard key={notification.id} notification={notification} />
                ))}
                
                {activeTab === 'urgent' && allNotifications
                  .filter(n => n.priority === 'urgent')
                  .map((notification) => (
                    <NotificationCard key={notification.id} notification={notification} />
                  ))}
                
                {activeTab === 'weather' && mockNotifications.weather.map((notification) => (
                  <NotificationCard key={notification.id} notification={notification} />
                ))}
                
                {activeTab === 'travel' && mockNotifications.travel.map((notification) => (
                  <NotificationCard key={notification.id} notification={notification} />
                ))}
                
                {activeTab === 'deals' && mockNotifications.deals.map((notification) => (
                  <NotificationCard key={notification.id} notification={notification} />
                ))}
                
                {activeTab === 'local' && mockNotifications.local.map((notification) => (
                  <NotificationCard key={notification.id} notification={notification} />
                ))}
              </div>

              {/* Smart Suggestions */}
              <Card className="mt-6 bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center space-x-2">
                    <Zap className="h-4 w-4 text-primary" />
                    <span>AI Suggestions</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 bg-white rounded-lg border">
                    <div className="flex items-center space-x-2 mb-2">
                      <Camera className="h-4 w-4 text-blue-500" />
                      <span className="font-medium text-sm">Perfect Photo Opportunity</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Golden hour lighting at Pont Alexandre III in 30 minutes. Great for Instagram!
                    </p>
                    <Button size="sm" variant="outline" className="mt-2">
                      Navigate there
                    </Button>
                  </div>
                  
                  <div className="p-3 bg-white rounded-lg border">
                    <div className="flex items-center space-x-2 mb-2">
                      <Users className="h-4 w-4 text-green-500" />
                      <span className="font-medium text-sm">Social Opportunity</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      3 TouriQuest users checked in at nearby café. Want to connect?
                    </p>
                    <Button size="sm" variant="outline" className="mt-2">
                      View profiles
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
}