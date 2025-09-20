import React, { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  Globe, 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Star,
  MapPin,
  Smartphone,
  Monitor,
  Tablet,
  ArrowUp,
  ArrowDown,
  Filter,
  Download,
  RefreshCw,
  Eye,
  UserCheck,
  CreditCard,
  Home,
  Compass
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';

interface AdminDashboardProps {
  onClose?: () => void;
}

// Mock data for the dashboard
const kpiData = {
  totalUsers: { value: 152847, change: 12.5, trend: 'up' },
  conversionRate: { value: 3.42, change: -0.8, trend: 'down' },
  revenue: { value: 2847632, change: 18.3, trend: 'up' },
  newRegistrations: { value: 3247, change: 25.1, trend: 'up' },
  avgSessionDuration: { value: 8.4, change: 5.2, trend: 'up' },
  satisfactionScore: { value: 4.6, change: 0.3, trend: 'up' }
};

const revenueData = [
  { month: 'Jan', revenue: 2400000, bookings: 1200, users: 140000 },
  { month: 'Feb', revenue: 2200000, bookings: 1100, users: 142000 },
  { month: 'Mar', revenue: 2800000, bookings: 1400, users: 145000 },
  { month: 'Apr', revenue: 3200000, bookings: 1600, users: 148000 },
  { month: 'May', revenue: 2900000, bookings: 1450, users: 150000 },
  { month: 'Jun', revenue: 3400000, bookings: 1700, users: 152847 }
];

const userDemographics = [
  { name: '18-24', value: 25, color: '#00B4A6' },
  { name: '25-34', value: 35, color: '#FF7A59' },
  { name: '35-44', value: 20, color: '#1B365D' },
  { name: '45-54', value: 15, color: '#2D7D32' },
  { name: '55+', value: 5, color: '#FFA726' }
];

const deviceData = [
  { device: 'Mobile', users: 68, sessions: 245000 },
  { device: 'Desktop', users: 25, sessions: 91000 },
  { device: 'Tablet', users: 7, sessions: 25000 }
];

const geoData = [
  { country: 'United States', users: 45230, percentage: 29.6 },
  { country: 'United Kingdom', users: 32150, percentage: 21.0 },
  { country: 'Germany', users: 28940, percentage: 18.9 },
  { country: 'France', users: 22680, percentage: 14.8 },
  { country: 'Others', users: 23847, percentage: 15.7 }
];

const bookingCategories = [
  { category: 'Hotels', revenue: 1450000, bookings: 2340, growth: 15.2 },
  { category: 'Experiences', revenue: 680000, bookings: 1120, growth: 22.8 },
  { category: 'Restaurants', revenue: 420000, bookings: 1840, growth: 8.5 },
  { category: 'Transportation', revenue: 297632, bookings: 890, growth: -2.1 }
];

const systemMetrics = {
  uptime: 99.97,
  responseTime: 245,
  errorRate: 0.12,
  apiCalls: 2847000,
  activeConnections: 12847
};

export function AdminDashboard({ onClose }: AdminDashboardProps) {
  const [dateRange, setDateRange] = useState('30d');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  const KPICard = ({ title, value, change, trend, icon: Icon, format = 'number' }: any) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{title}</p>
              <p className="text-2xl font-medium">
                {format === 'currency' && formatCurrency(value)}
                {format === 'number' && formatNumber(value)}
                {format === 'percentage' && `${value}%`}
                {format === 'decimal' && `${value}min`}
                {format === 'rating' && `${value}/5`}
              </p>
            </div>
          </div>
          <div className={`flex items-center space-x-1 ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {trend === 'up' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
            <span className="text-sm font-medium">{Math.abs(change)}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-background border-b p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-medium">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">Comprehensive analytics and management</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <KPICard
                title="Total Active Users"
                value={kpiData.totalUsers.value}
                change={kpiData.totalUsers.change}
                trend={kpiData.totalUsers.trend}
                icon={Users}
                format="number"
              />
              <KPICard
                title="Booking Conversion"
                value={kpiData.conversionRate.value}
                change={kpiData.conversionRate.change}
                trend={kpiData.conversionRate.trend}
                icon={TrendingUp}
                format="percentage"
              />
              <KPICard
                title="Monthly Revenue"
                value={kpiData.revenue.value}
                change={kpiData.revenue.change}
                trend={kpiData.revenue.trend}
                icon={DollarSign}
                format="currency"
              />
              <KPICard
                title="New Registrations"
                value={kpiData.newRegistrations.value}
                change={kpiData.newRegistrations.change}
                trend={kpiData.newRegistrations.trend}
                icon={UserCheck}
                format="number"
              />
              <KPICard
                title="Avg Session Duration"
                value={kpiData.avgSessionDuration.value}
                change={kpiData.avgSessionDuration.change}
                trend={kpiData.avgSessionDuration.trend}
                icon={Clock}
                format="decimal"
              />
              <KPICard
                title="Customer Satisfaction"
                value={kpiData.satisfactionScore.value}
                change={kpiData.satisfactionScore.change}
                trend={kpiData.satisfactionScore.trend}
                icon={Star}
                format="rating"
              />
            </div>

            {/* Revenue and User Growth Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue & User Growth Trends</CardTitle>
                <CardDescription>Monthly performance over the last 6 months</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip formatter={(value, name) => {
                      if (name === 'revenue') return [formatCurrency(value as number), 'Revenue'];
                      if (name === 'users') return [formatNumber(value as number), 'Users'];
                      return [formatNumber(value as number), 'Bookings'];
                    }} />
                    <Legend />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="revenue"
                      stackId="1"
                      stroke="#00B4A6"
                      fill="#00B4A6"
                      fillOpacity={0.6}
                      name="Revenue"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="users"
                      stroke="#FF7A59"
                      strokeWidth={2}
                      name="Users"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">System Status</p>
                      <p className="font-medium text-green-600">All Systems Operational</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Activity className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">API Uptime</p>
                      <p className="font-medium">{systemMetrics.uptime}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Clock className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Response Time</p>
                      <p className="font-medium">{systemMetrics.responseTime}ms</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Error Rate</p>
                      <p className="font-medium">{systemMetrics.errorRate}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            {/* User Analytics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* User Demographics */}
              <Card>
                <CardHeader>
                  <CardTitle>User Demographics by Age</CardTitle>
                  <CardDescription>Age distribution of active users</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={userDemographics}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}%`}
                      >
                        {userDemographics.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Device Usage */}
              <Card>
                <CardHeader>
                  <CardTitle>Device Usage</CardTitle>
                  <CardDescription>Platform distribution</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {deviceData.map((device) => (
                    <div key={device.device} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {device.device === 'Mobile' && <Smartphone className="h-4 w-4" />}
                          {device.device === 'Desktop' && <Monitor className="h-4 w-4" />}
                          {device.device === 'Tablet' && <Tablet className="h-4 w-4" />}
                          <span className="font-medium">{device.device}</span>
                        </div>
                        <span className="font-medium">{device.users}%</span>
                      </div>
                      <Progress value={device.users} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        {formatNumber(device.sessions)} sessions
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Geographic Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Geographic Distribution</CardTitle>
                <CardDescription>User distribution by country</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {geoData.map((geo) => (
                    <div key={geo.country} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{geo.country}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-sm text-muted-foreground">
                          {formatNumber(geo.users)} users
                        </span>
                        <Badge variant="outline">{geo.percentage}%</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* User Acquisition Funnel */}
            <Card>
              <CardHeader>
                <CardTitle>User Acquisition Funnel</CardTitle>
                <CardDescription>Conversion stages in user journey</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Website Visitors</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={100} className="w-32 h-2" />
                      <span className="font-medium">875,000</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Account Created</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={25} className="w-32 h-2" />
                      <span className="font-medium">218,750</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Profile Completed</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={18} className="w-32 h-2" />
                      <span className="font-medium">157,500</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>First Booking</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={12} className="w-32 h-2" />
                      <span className="font-medium">105,000</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bookings" className="space-y-6">
            {/* Booking Categories */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Category</CardTitle>
                <CardDescription>Performance across different booking types</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {bookingCategories.map((category) => (
                    <div key={category.category} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {category.category === 'Hotels' && <Home className="h-4 w-4" />}
                          {category.category === 'Experiences' && <Compass className="h-4 w-4" />}
                          {category.category === 'Restaurants' && <Star className="h-4 w-4" />}
                          {category.category === 'Transportation' && <MapPin className="h-4 w-4" />}
                          <span className="font-medium">{category.category}</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="font-medium">{formatCurrency(category.revenue)}</span>
                          <Badge 
                            variant={category.growth > 0 ? "default" : "destructive"}
                          >
                            {category.growth > 0 ? '+' : ''}{category.growth}%
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{formatNumber(category.bookings)} bookings</span>
                        <span>vs last month</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Booking Volume Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Booking Volume Trends</CardTitle>
                <CardDescription>Daily booking patterns over the last month</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="bookings"
                      stroke="#00B4A6"
                      strokeWidth={2}
                      name="Bookings"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Conversion Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-2xl font-medium">3.42%</p>
                    <p className="text-sm text-muted-foreground">Overall Conversion</p>
                    <Badge variant="destructive" className="mt-2">-0.8%</Badge>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-2xl font-medium">€247</p>
                    <p className="text-sm text-muted-foreground">Average Order Value</p>
                    <Badge className="mt-2">+12.3%</Badge>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-2xl font-medium">5.8%</p>
                    <p className="text-sm text-muted-foreground">Cancellation Rate</p>
                    <Badge variant="secondary" className="mt-2">-1.2%</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            {/* System Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">API Uptime</p>
                      <p className="text-2xl font-medium">{systemMetrics.uptime}%</p>
                    </div>
                    <div className="p-2 bg-green-100 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Response Time</p>
                      <p className="text-2xl font-medium">{systemMetrics.responseTime}ms</p>
                    </div>
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Clock className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Error Rate</p>
                      <p className="text-2xl font-medium">{systemMetrics.errorRate}%</p>
                    </div>
                    <div className="p-2 bg-red-100 rounded-lg">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* API Usage Stats */}
            <Card>
              <CardHeader>
                <CardTitle>API Usage Statistics</CardTitle>
                <CardDescription>Real-time API performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Total API Calls Today</span>
                      <span className="font-medium">{formatNumber(systemMetrics.apiCalls)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Active Connections</span>
                      <span className="font-medium">{formatNumber(systemMetrics.activeConnections)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Peak Concurrent Users</span>
                      <span className="font-medium">45,230</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Database Performance</span>
                      <Badge className="bg-green-100 text-green-800">Excellent</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>CDN Performance</span>
                      <Badge className="bg-green-100 text-green-800">Optimal</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Third-party Services</span>
                      <Badge className="bg-yellow-100 text-yellow-800">1 Warning</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Error Tracking */}
            <Card>
              <CardHeader>
                <CardTitle>Error Tracking</CardTitle>
                <CardDescription>Recent errors and system issues</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <div>
                        <p className="font-medium">Payment Gateway Timeout</p>
                        <p className="text-sm text-muted-foreground">Stripe API response delay</p>
                      </div>
                    </div>
                    <Badge variant="destructive">High</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <div>
                        <p className="font-medium">Image Upload Slow</p>
                        <p className="text-sm text-muted-foreground">CDN performance degraded</p>
                      </div>
                    </div>
                    <Badge variant="secondary">Medium</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div>
                        <p className="font-medium">Search Index Update</p>
                        <p className="text-sm text-muted-foreground">Scheduled maintenance</p>
                      </div>
                    </div>
                    <Badge variant="outline">Info</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financial" className="space-y-6">
            {/* Revenue Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-2xl font-medium">{formatCurrency(2847632)}</p>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <Badge className="mt-2">+18.3%</Badge>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-2xl font-medium">{formatCurrency(284763)}</p>
                    <p className="text-sm text-muted-foreground">Commission Earned</p>
                    <Badge className="mt-2">+22.1%</Badge>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-2xl font-medium">{formatCurrency(42850)}</p>
                    <p className="text-sm text-muted-foreground">Processing Fees</p>
                    <Badge variant="secondary" className="mt-2">+15.8%</Badge>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-2xl font-medium">{formatCurrency(18420)}</p>
                    <p className="text-sm text-muted-foreground">Refunds Issued</p>
                    <Badge variant="destructive" className="mt-2">+8.2%</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Revenue Breakdown Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Breakdown</CardTitle>
                <CardDescription>Monthly revenue trends by category</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Legend />
                    <Bar dataKey="revenue" fill="#00B4A6" name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Financial Health Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Payout Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Pending Payouts</span>
                    <span className="font-medium">{formatCurrency(156000)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Processed Today</span>
                    <span className="font-medium">{formatCurrency(89000)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Failed Payments</span>
                    <span className="font-medium text-red-600">{formatCurrency(2400)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tax & Compliance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Tax Collected</span>
                    <span className="font-medium">{formatCurrency(125000)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Compliance Score</span>
                    <Badge className="bg-green-100 text-green-800">98.5%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Audit Status</span>
                    <Badge className="bg-green-100 text-green-800">Compliant</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}