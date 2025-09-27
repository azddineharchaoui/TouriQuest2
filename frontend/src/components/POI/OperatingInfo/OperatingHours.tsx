import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  Calendar, 
  AlertCircle, 
  CheckCircle, 
  XCircle,
  Info,
  MapPin,
  Users,
  TrendingUp,
  CloudRain,
  Sun,
  Snowflake,
  Timer,
  Bell,
  Navigation,
  Car,
  Bus,
  Train,
  Accessibility,
  Headphones,
  Star,
  Award,
  Eye
} from 'lucide-react';

interface OperatingHours {
  [key: string]: {
    open: string;
    close: string;
    isOpen: boolean;
  };
}

interface WeatherData {
  current: {
    temperature: number;
    condition: string;
    icon: string;
  };
  forecast: Array<{
    date: string;
    high: number;
    low: number;
    condition: string;
    precipitation: number;
  }>;
}

interface OperatingHoursProps {
  poiId: string;
  operatingHours: OperatingHours;
  weatherData?: WeatherData;
}

interface VisitPrediction {
  time: string;
  crowdLevel: 'low' | 'medium' | 'high';
  waitTime: string;
  recommendation: string;
}

export const OperatingHours: React.FC<OperatingHoursProps> = ({ 
  poiId, 
  operatingHours, 
  weatherData 
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string>('today');
  const [visitPredictions, setVisitPredictions] = useState<VisitPrediction[]>([]);
  const [specialHours, setSpecialHours] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [accessibility, setAccessibility] = useState<any>(null);
  const [guidedTours, setGuidedTours] = useState<any[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    fetchAdditionalInfo();
    return () => clearInterval(timer);
  }, [poiId]);

  const fetchAdditionalInfo = async () => {
    try {
      // Fetch visit predictions and crowd data
      const [predictionsRes, specialHoursRes, alertsRes, accessibilityRes, toursRes] = await Promise.all([
        fetch(`/api/v1/pois/${poiId}/predictions`),
        fetch(`/api/v1/pois/${poiId}/special-hours`),
        fetch(`/api/v1/pois/${poiId}/alerts`),
        fetch(`/api/v1/pois/${poiId}/accessibility`),
        fetch(`/api/v1/pois/${poiId}/tours`)
      ]);

      if (predictionsRes.ok) {
        const predictions = await predictionsRes.json();
        setVisitPredictions(predictions);
      }

      if (specialHoursRes.ok) {
        const special = await specialHoursRes.json();
        setSpecialHours(special);
      }

      if (alertsRes.ok) {
        const alertsData = await alertsRes.json();
        setAlerts(alertsData);
      }

      if (accessibilityRes.ok) {
        const accessData = await accessibilityRes.json();
        setAccessibility(accessData);
      }

      if (toursRes.ok) {
        const toursData = await toursRes.json();
        setGuidedTours(toursData);
      }
    } catch (error) {
      console.error('Failed to fetch additional info:', error);
    }
  };

  const getDayName = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };

  const isCurrentlyOpen = () => {
    const today = getDayName(currentTime).toLowerCase();
    const todayHours = operatingHours[today];
    
    if (!todayHours) return false;
    
    const currentTimeStr = currentTime.toTimeString().slice(0, 5);
    return currentTimeStr >= todayHours.open && currentTimeStr <= todayHours.close;
  };

  const getNextOpenTime = () => {
    const today = getDayName(currentTime).toLowerCase();
    const todayHours = operatingHours[today];
    
    if (todayHours && currentTime.toTimeString().slice(0, 5) < todayHours.open) {
      return `Opens today at ${todayHours.open}`;
    }
    
    // Find next day that's open
    for (let i = 1; i <= 7; i++) {
      const nextDate = new Date(currentTime);
      nextDate.setDate(nextDate.getDate() + i);
      const dayName = getDayName(nextDate).toLowerCase();
      const dayHours = operatingHours[dayName];
      
      if (dayHours) {
        return `Opens ${getDayName(nextDate)} at ${dayHours.open}`;
      }
    }
    
    return 'Opening hours unavailable';
  };

  const getTimeUntilClose = () => {
    const today = getDayName(currentTime).toLowerCase();
    const todayHours = operatingHours[today];
    
    if (!todayHours || !isCurrentlyOpen()) return null;
    
    const [closeHour, closeMinute] = todayHours.close.split(':').map(Number);
    const closeTime = new Date(currentTime);
    closeTime.setHours(closeHour, closeMinute, 0, 0);
    
    const diffMs = closeTime.getTime() - currentTime.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) {
      return `Closes in ${diffHours}h ${diffMinutes}m`;
    } else {
      return `Closes in ${diffMinutes}m`;
    }
  };

  const getCrowdLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getWeatherIcon = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'sunny':
      case 'clear':
        return <Sun className="w-5 h-5 text-yellow-500" />;
      case 'rain':
      case 'rainy':
        return <CloudRain className="w-5 h-5 text-blue-500" />;
      case 'snow':
      case 'snowy':
        return <Snowflake className="w-5 h-5 text-blue-300" />;
      default:
        return <Sun className="w-5 h-5 text-gray-500" />;
    }
  };

  const currentlyOpen = isCurrentlyOpen();
  const timeUntilClose = getTimeUntilClose();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Status Banner */}
      <div className={`p-6 rounded-2xl ${
        currentlyOpen 
          ? 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200' 
          : 'bg-gradient-to-r from-red-50 to-pink-50 border border-red-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              currentlyOpen ? 'bg-green-500' : 'bg-red-500'
            }`}>
              {currentlyOpen ? (
                <CheckCircle className="w-6 h-6 text-white" />
              ) : (
                <XCircle className="w-6 h-6 text-white" />
              )}
            </div>
            
            <div>
              <h2 className={`text-2xl font-bold ${
                currentlyOpen ? 'text-green-800' : 'text-red-800'
              }`}>
                {currentlyOpen ? 'Open Now' : 'Closed'}
              </h2>
              <p className={`${
                currentlyOpen ? 'text-green-600' : 'text-red-600'
              }`}>
                {currentlyOpen && timeUntilClose ? timeUntilClose : getNextOpenTime()}
              </p>
            </div>
          </div>
          
          {weatherData && (
            <div className="text-right">
              <div className="flex items-center gap-2 mb-1">
                {getWeatherIcon(weatherData.current.condition)}
                <span className="font-semibold">{weatherData.current.temperature}°C</span>
              </div>
              <p className="text-sm text-gray-600 capitalize">
                {weatherData.current.condition}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Alerts */}
      <AnimatePresence>
        {alerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            {alerts.map((alert, index) => (
              <div
                key={index}
                className={`p-4 rounded-xl border-l-4 ${
                  alert.type === 'warning' 
                    ? 'bg-yellow-50 border-yellow-400' 
                    : alert.type === 'info'
                    ? 'bg-blue-50 border-blue-400'
                    : 'bg-red-50 border-red-400'
                }`}
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className={`w-5 h-5 mt-0.5 ${
                    alert.type === 'warning' ? 'text-yellow-600' :
                    alert.type === 'info' ? 'text-blue-600' : 'text-red-600'
                  }`} />
                  <div>
                    <h4 className="font-semibold mb-1">{alert.title}</h4>
                    <p className="text-sm text-gray-700">{alert.message}</p>
                    {alert.validUntil && (
                      <p className="text-xs text-gray-500 mt-1">
                        Valid until: {new Date(alert.validUntil).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Operating Hours Grid */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-6 h-6" />
            Operating Hours
          </h3>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(operatingHours).map(([day, hours]) => {
              const isToday = day === getDayName(currentTime).toLowerCase();
              
              return (
                <div
                  key={day}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    isToday 
                      ? 'border-blue-300 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-semibold capitalize ${
                      isToday ? 'text-blue-800' : 'text-gray-800'
                    }`}>
                      {day}
                      {isToday && (
                        <span className="ml-2 px-2 py-1 bg-blue-200 text-blue-800 text-xs rounded-full">
                          Today
                        </span>
                      )}
                    </span>
                    
                    <div className={`text-right ${
                      isToday ? 'text-blue-700' : 'text-gray-600'
                    }`}>
                      <div className="font-mono text-sm">
                        {hours.open} - {hours.close}
                      </div>
                      <div className={`text-xs flex items-center gap-1 justify-end mt-1 ${
                        hours.isOpen ? 'text-green-600' : 'text-red-600'
                      }`}>
                        <div className={`w-2 h-2 rounded-full ${
                          hours.isOpen ? 'bg-green-500' : 'bg-red-500'
                        }`} />
                        {hours.isOpen ? 'Open' : 'Closed'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Visit Planning Tools */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Best Time to Visit */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-blue-500" />
            Best Time to Visit
          </h3>
          
          <div className="space-y-4">
            {visitPredictions.map((prediction, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">{prediction.time}</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    getCrowdLevelColor(prediction.crowdLevel)
                  }`}>
                    {prediction.crowdLevel} crowd
                  </span>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Timer className="w-4 h-4" />
                    <span>Wait: {prediction.waitTime}</span>
                  </div>
                </div>
                
                <p className="text-sm text-gray-700 mt-2">{prediction.recommendation}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Accessibility Information */}
        {accessibility && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Accessibility className="w-6 h-6 text-purple-500" />
              Accessibility
            </h3>
            
            <div className="space-y-3">
              {accessibility.wheelchairAccessible && (
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-green-800">Wheelchair Accessible</span>
                </div>
              )}
              
              {accessibility.audioSupport && (
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <Headphones className="w-5 h-5 text-blue-600" />
                  <span className="text-blue-800">Audio Support Available</span>
                </div>
              )}
              
              {accessibility.visualSupport && (
                <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                  <Eye className="w-5 h-5 text-purple-600" />
                  <span className="text-purple-800">Visual Support Available</span>
                </div>
              )}
              
              {accessibility.specialServices?.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold mb-2">Special Services</h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    {accessibility.specialServices.map((service: string, index: number) => (
                      <li key={index} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                        {service}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Guided Tours */}
      {guidedTours.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Award className="w-6 h-6 text-amber-500" />
            Guided Tours Available
          </h3>
          
          <div className="grid md:grid-cols-2 gap-4">
            {guidedTours.map((tour, index) => (
              <div key={index} className="border rounded-lg p-4 hover:border-blue-300 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold">{tour.name}</h4>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded">
                    {tour.duration}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 mb-3">{tour.description}</p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>Max {tour.maxSize}</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span>{tour.rating}</span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-semibold text-blue-600">${tour.price}</div>
                    <div className="text-xs text-gray-500">per person</div>
                  </div>
                </div>
                
                <button className="w-full mt-3 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                  Book Tour
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transportation & Parking */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Navigation className="w-6 h-6 text-green-500" />
          Getting There
        </h3>
        
        <div className="grid md:grid-cols-3 gap-4">
          <div className="text-center p-4 border rounded-lg hover:border-blue-300 transition-colors">
            <Car className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <h4 className="font-semibold mb-1">By Car</h4>
            <p className="text-sm text-gray-600">Parking available</p>
            <p className="text-sm text-blue-600">$5/hour</p>
          </div>
          
          <div className="text-center p-4 border rounded-lg hover:border-blue-300 transition-colors">
            <Bus className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <h4 className="font-semibold mb-1">By Bus</h4>
            <p className="text-sm text-gray-600">Route 42, 67</p>
            <p className="text-sm text-green-600">5 min walk</p>
          </div>
          
          <div className="text-center p-4 border rounded-lg hover:border-blue-300 transition-colors">
            <Train className="w-8 h-8 text-purple-500 mx-auto mb-2" />
            <h4 className="font-semibold mb-1">By Train</h4>
            <p className="text-sm text-gray-600">Central Station</p>
            <p className="text-sm text-purple-600">10 min walk</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};