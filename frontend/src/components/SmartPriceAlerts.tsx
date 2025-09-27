import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  Bell,
  BellRing,
  Zap,
  Target,
  Calendar,
  MapPin,
  Plane,
  Hotel,
  Car,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  EyeOff,
  Settings,
  Filter,
  BarChart3,
  LineChart,
  PieChart,
  Download,
  Share2,
  Bookmark,
  Heart,
  Star,
  Users,
  Globe,
  Wifi,
  RefreshCw,
  Plus,
  Minus,
  X,
  Edit3,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  Sparkles,
  Brain,
  ChevronDown,
  ChevronUp,
  Info,
  ExternalLink,
  Percent,
  CreditCard,
  Banknote,
  Wallet
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Switch } from './ui/switch';
import { Slider } from './ui/slider';

interface SmartPriceAlertsProps {
  onClose: () => void;
  userProfile?: UserProfile;
  watchedItems?: WatchedItem[];
}

interface UserProfile {
  id: string;
  preferences: {
    budget: { min: number; max: number };
    destinations: string[];
    travelStyle: string;
    notifications: NotificationSettings;
  };
  savings: {
    total: number;
    thisMonth: number;
    alerts: number;
  };
}

interface WatchedItem {
  id: string;
  type: 'flight' | 'hotel' | 'rental' | 'experience' | 'package';
  name: string;
  description: string;
  url?: string;
  image?: string;
  currentPrice: number;
  targetPrice?: number;
  originalPrice: number;
  currency: string;
  location: string;
  dates: {
    start: Date;
    end: Date;
    flexible: boolean;
  };
  priceHistory: PricePoint[];
  predictions: PricePrediction;
  alerts: PriceAlert[];
  savings: number;
  isActive: boolean;
  createdAt: Date;
  lastChecked: Date;
}

interface PricePoint {
  date: Date;
  price: number;
  source: string;
  availability?: boolean;
}

interface PricePrediction {
  trend: 'rising' | 'falling' | 'stable';
  confidence: number;
  predictedPrice: number;
  timeframe: number; // days
  factors: PredictionFactor[];
  recommendation: 'buy_now' | 'wait' | 'monitor';
  optimalBookingWindow: {
    start: Date;
    end: Date;
    savings: number;
  };
}

interface PredictionFactor {
  type: 'seasonal' | 'demand' | 'supply' | 'event' | 'weather' | 'economic';
  name: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number;
  description: string;
}

interface PriceAlert {
  id: string;
  type: 'price_drop' | 'target_reached' | 'availability' | 'prediction' | 'deal_found';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  actionable: boolean;
  action?: {
    label: string;
    url: string;
    type: 'book' | 'view' | 'compare';
  };
  savings?: number;
  urgency: 'low' | 'medium' | 'high';
}

interface NotificationSettings {
  email: boolean;
  push: boolean;
  sms: boolean;
  priceDrops: boolean;
  targetReached: boolean;
  predictions: boolean;
  deals: boolean;
  frequency: 'immediate' | 'daily' | 'weekly';
}

interface MarketInsight {
  type: 'trend' | 'seasonal' | 'event' | 'comparison';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  timeframe: string;
  confidence: number;
  data?: any;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export function SmartPriceAlerts({ onClose, userProfile, watchedItems = [] }: SmartPriceAlertsProps) {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [items, setItems] = useState<WatchedItem[]>(watchedItems);
  const [selectedItem, setSelectedItem] = useState<WatchedItem | null>(null);
  const [marketInsights, setMarketInsights] = useState<MarketInsight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemForm, setNewItemForm] = useState({
    url: '',
    targetPrice: '',
    dates: {
      start: '',
      end: '',
      flexible: false
    },
    notifications: {
      priceDrops: true,
      targetReached: true,
      predictions: true
    }
  });

  // Load alerts and insights
  useEffect(() => {
    loadPriceAlerts();
    loadMarketInsights();
    
    const interval = setInterval(() => {
      refreshPriceData();
    }, 5 * 60 * 1000); // Refresh every 5 minutes

    return () => clearInterval(interval);
  }, []);

  const loadPriceAlerts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/ai/price-alerts`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAlerts(data.alerts || []);
        setItems(data.watchedItems || []);
      }
    } catch (error) {
      console.error('Failed to load price alerts:', error);
    }
  };

  const loadMarketInsights = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/ai/market-insights`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMarketInsights(data.insights || []);
      }
    } catch (error) {
      console.error('Failed to load market insights:', error);
    }
  };

  const refreshPriceData = async () => {
    if (items.length === 0) return;

    try {
      const response = await fetch(`${API_BASE_URL}/ai/price-alerts/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          itemIds: items.map(item => item.id)
        })
      });

      if (response.ok) {
        const data = await response.json();
        setItems(data.updatedItems || []);
        
        // Check for new alerts
        if (data.newAlerts && data.newAlerts.length > 0) {
          setAlerts(prev => [...data.newAlerts, ...prev]);
        }
      }
    } catch (error) {
      console.error('Failed to refresh price data:', error);
    }
  };

  const addWatchedItem = async (url: string) => {
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/ai/price-alerts/watch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          url: url,
          targetPrice: newItemForm.targetPrice ? parseFloat(newItemForm.targetPrice) : undefined,
          dates: {
            start: newItemForm.dates.start ? new Date(newItemForm.dates.start) : undefined,
            end: newItemForm.dates.end ? new Date(newItemForm.dates.end) : undefined,
            flexible: newItemForm.dates.flexible
          },
          notifications: newItemForm.notifications
        })
      });

      if (response.ok) {
        const newItem = await response.json();
        setItems(prev => [newItem, ...prev]);
        setShowAddItem(false);
        setNewItemForm({
          url: '',
          targetPrice: '',
          dates: { start: '', end: '', flexible: false },
          notifications: { priceDrops: true, targetReached: true, predictions: true }
        });
      }
    } catch (error) {
      console.error('Failed to add watched item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const removeWatchedItem = async (itemId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/ai/price-alerts/watch/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        setItems(prev => prev.filter(item => item.id !== itemId));
      }
    } catch (error) {
      console.error('Failed to remove watched item:', error);
    }
  };

  const markAlertAsRead = async (alertId: string) => {
    try {
      await fetch(`${API_BASE_URL}/ai/price-alerts/${alertId}/read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      setAlerts(prev => prev.map(alert => 
        alert.id === alertId ? { ...alert, isRead: true } : alert
      ));
    } catch (error) {
      console.error('Failed to mark alert as read:', error);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'flight': return <Plane className="h-4 w-4" />;
      case 'hotel': return <Hotel className="h-4 w-4" />;
      case 'rental': return <Car className="h-4 w-4" />;
      case 'experience': return <Activity className="h-4 w-4" />;
      default: return <DollarSign className="h-4 w-4" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'rising': return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'falling': return <TrendingDown className="h-4 w-4 text-green-500" />;
      default: return <ArrowRight className="h-4 w-4 text-gray-500" />;
    }
  };

  const getAlertUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'border-red-500 bg-red-50';
      case 'medium': return 'border-yellow-500 bg-yellow-50';
      default: return 'border-blue-500 bg-blue-50';
    }
  };

  const totalSavings = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.savings || 0), 0);
  }, [items]);

  const unreadAlerts = useMemo(() => {
    return alerts.filter(alert => !alert.isRead).length;
  }, [alerts]);

  // WatchedItem Card Component
  const WatchedItemCard = ({ item }: { item: WatchedItem }) => (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedItem(item)}>
      <CardContent className="p-4">
        <div className="flex items-start space-x-4">
          {item.image && (
            <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  {getTypeIcon(item.type)}
                  <h3 className="font-medium truncate">{item.name}</h3>
                  <Badge variant="outline" className="text-xs">
                    {item.type}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {item.description}
                </p>
                <div className="flex items-center space-x-1 text-sm text-muted-foreground mt-1">
                  <MapPin className="h-3 w-3" />
                  <span>{item.location}</span>
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  removeWatchedItem(item.id);
                }}
                className="h-6 w-6"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-bold">
                      {item.currency}{item.currentPrice.toLocaleString()}
                    </span>
                    {getTrendIcon(item.predictions.trend)}
                  </div>
                  {item.targetPrice && (
                    <div className="text-xs text-muted-foreground">
                      Target: {item.currency}{item.targetPrice.toLocaleString()}
                    </div>
                  )}
                </div>
                
                {item.savings > 0 && (
                  <div className="text-center">
                    <div className="text-sm font-medium text-green-600">
                      -{item.currency}{item.savings.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">saved</div>
                  </div>
                )}
              </div>
              
              <div className="text-right">
                <div className="flex items-center space-x-1 text-sm">
                  <Badge variant={item.predictions.recommendation === 'buy_now' ? 'default' : 'secondary'}>
                    {item.predictions.recommendation.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {Math.round(item.predictions.confidence * 100)}% confidence
                </div>
              </div>
            </div>
            
            {item.predictions.optimalBookingWindow && (
              <div className="mt-3 p-2 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-1 text-sm text-blue-700">
                  <Target className="h-3 w-3" />
                  <span>
                    Best booking window: {item.predictions.optimalBookingWindow.start.toLocaleDateString()} - {item.predictions.optimalBookingWindow.end.toLocaleDateString()}
                  </span>
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  Potential savings: {item.currency}{item.predictions.optimalBookingWindow.savings.toLocaleString()}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Price Alert Card Component
  const PriceAlertCard = ({ alert }: { alert: PriceAlert }) => (
    <Card className={`border-l-4 ${getAlertUrgencyColor(alert.urgency)} ${!alert.isRead ? 'bg-muted/30' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <BellRing className={`h-4 w-4 ${alert.urgency === 'high' ? 'text-red-500' : alert.urgency === 'medium' ? 'text-yellow-500' : 'text-blue-500'}`} />
              <h4 className="font-medium">{alert.title}</h4>
              {!alert.isRead && (
                <div className="w-2 h-2 bg-primary rounded-full"></div>
              )}
            </div>
            
            <p className="text-sm text-muted-foreground mb-3">
              {alert.message}
            </p>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                <span>{alert.timestamp.toLocaleDateString()}</span>
                {alert.savings && (
                  <div className="flex items-center space-x-1 text-green-600">
                    <TrendingDown className="h-3 w-3" />
                    <span>{alert.savings.toLocaleString()} saved</span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                {!alert.isRead && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markAlertAsRead(alert.id)}
                  >
                    Mark Read
                  </Button>
                )}
                {alert.actionable && alert.action && (
                  <Button size="sm" onClick={() => window.open(alert.action!.url, '_blank')}>
                    {alert.action.label}
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-7xl h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b p-4 bg-gradient-to-r from-background to-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                <AvatarFallback className="bg-primary text-black">
                  <Bell className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="font-medium">Smart Price Alerts</h2>
                <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                  <span>{items.length} items watched</span>
                  <Separator orientation="vertical" className="h-4" />
                  <span>{unreadAlerts} unread alerts</span>
                  <Separator orientation="vertical" className="h-4" />
                  <div className="flex items-center space-x-1 text-green-600">
                    <DollarSign className="h-3 w-3" />
                    <span>${totalSavings.toLocaleString()} saved</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowAddItem(true)}
                className="flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Watch Item</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={refreshPriceData}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="mx-4 mt-4 grid w-fit grid-cols-4">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="alerts">Alerts ({unreadAlerts})</TabsTrigger>
              <TabsTrigger value="watched">Watched Items</TabsTrigger>
              <TabsTrigger value="insights">Market Insights</TabsTrigger>
            </TabsList>
            
            <div className="flex-1 overflow-hidden">
              <TabsContent value="dashboard" className="h-full m-0">
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-6">
                    {/* Savings Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                              <Wallet className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                              <div className="text-2xl font-bold text-green-600">
                                ${totalSavings.toLocaleString()}
                              </div>
                              <div className="text-sm text-muted-foreground">Total Savings</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <Eye className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <div className="text-2xl font-bold text-blue-600">
                                {items.length}
                              </div>
                              <div className="text-sm text-muted-foreground">Items Watched</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-orange-100 rounded-lg">
                              <BellRing className="h-5 w-5 text-orange-600" />
                            </div>
                            <div>
                              <div className="text-2xl font-bold text-orange-600">
                                {alerts.length}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Alerts ({unreadAlerts} unread)
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Recent Alerts */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>Recent Alerts</span>
                          <Button variant="ghost" size="sm">
                            View All <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {alerts.slice(0, 3).map((alert) => (
                            <PriceAlertCard key={alert.id} alert={alert} />
                          ))}
                          {alerts.length === 0 && (
                            <div className="text-center py-6 text-muted-foreground">
                              No alerts yet. Add items to watch for price changes.
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Top Opportunities */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Top Savings Opportunities</CardTitle>
                        <CardDescription>
                          Items with the highest potential savings based on AI predictions
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {items
                            .filter(item => item.predictions.optimalBookingWindow)
                            .sort((a, b) => (b.predictions.optimalBookingWindow?.savings || 0) - (a.predictions.optimalBookingWindow?.savings || 0))
                            .slice(0, 3)
                            .map((item) => (
                              <WatchedItemCard key={item.id} item={item} />
                            ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="alerts" className="h-full m-0">
                <ScrollArea className="h-full">
                  <div className="p-4">
                    <div className="space-y-4">
                      {alerts.map((alert) => (
                        <PriceAlertCard key={alert.id} alert={alert} />
                      ))}
                      {alerts.length === 0 && (
                        <div className="text-center py-12">
                          <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                          <h3 className="font-medium mb-2">No Alerts</h3>
                          <p className="text-muted-foreground">
                            Start watching items to receive price alerts and savings notifications
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="watched" className="h-full m-0">
                <ScrollArea className="h-full">
                  <div className="p-4">
                    <div className="space-y-4">
                      {items.map((item) => (
                        <WatchedItemCard key={item.id} item={item} />
                      ))}
                      {items.length === 0 && (
                        <div className="text-center py-12">
                          <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                          <h3 className="font-medium mb-2">No Watched Items</h3>
                          <p className="text-muted-foreground mb-4">
                            Add flights, hotels, or experiences to track prices and get alerts
                          </p>
                          <Button onClick={() => setShowAddItem(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Watch Your First Item
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="insights" className="h-full m-0">
                <ScrollArea className="h-full">
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {marketInsights.map((insight, index) => (
                        <Card key={index}>
                          <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                              <Brain className="h-4 w-4" />
                              <span>{insight.title}</span>
                              <Badge variant={insight.impact === 'high' ? 'default' : 'secondary'}>
                                {insight.impact} impact
                              </Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground mb-3">
                              {insight.description}
                            </p>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">{insight.timeframe}</span>
                              <div className="flex items-center space-x-1">
                                <CheckCircle className="h-3 w-3 text-green-600" />
                                <span>{Math.round(insight.confidence * 100)}% confidence</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Add Item Modal */}
        {showAddItem && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md">
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Watch Item for Price Changes</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowAddItem(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="p-4 space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    URL or Item Link
                  </label>
                  <Input
                    value={newItemForm.url}
                    onChange={(e) => setNewItemForm(prev => ({ ...prev, url: e.target.value }))}
                    placeholder="Paste URL of flight, hotel, or experience..."
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Target Price (optional)
                  </label>
                  <Input
                    type="number"
                    value={newItemForm.targetPrice}
                    onChange={(e) => setNewItemForm(prev => ({ ...prev, targetPrice: e.target.value }))}
                    placeholder="Enter your ideal price..."
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Start Date</label>
                    <Input
                      type="date"
                      value={newItemForm.dates.start}
                      onChange={(e) => setNewItemForm(prev => ({
                        ...prev,
                        dates: { ...prev.dates, start: e.target.value }
                      }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">End Date</label>
                    <Input
                      type="date"
                      value={newItemForm.dates.end}
                      onChange={(e) => setNewItemForm(prev => ({
                        ...prev,
                        dates: { ...prev.dates, end: e.target.value }
                      }))}
                    />
                  </div>
                </div>
                
                <div className="space-y-3">
                  <label className="text-sm font-medium">Notification Settings</label>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Price drops</span>
                      <Switch
                        checked={newItemForm.notifications.priceDrops}
                        onCheckedChange={(checked) => setNewItemForm(prev => ({
                          ...prev,
                          notifications: { ...prev.notifications, priceDrops: checked }
                        }))}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Target price reached</span>
                      <Switch
                        checked={newItemForm.notifications.targetReached}
                        onCheckedChange={(checked) => setNewItemForm(prev => ({
                          ...prev,
                          notifications: { ...prev.notifications, targetReached: checked }
                        }))}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">AI predictions</span>
                      <Switch
                        checked={newItemForm.notifications.predictions}
                        onCheckedChange={(checked) => setNewItemForm(prev => ({
                          ...prev,
                          notifications: { ...prev.notifications, predictions: checked }
                        }))}
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-4 border-t flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowAddItem(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => addWatchedItem(newItemForm.url)}
                  disabled={!newItemForm.url || isLoading}
                >
                  {isLoading ? 'Adding...' : 'Start Watching'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}