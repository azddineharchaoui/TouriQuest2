/**
 * AvailabilityCalendar - Interactive calendar for property availability
 * Fetches availability from GET /api/v1/properties/{id}/availability
 */

import React, { useState, useEffect } from 'react';
import { propertyService } from '../services/propertyService';
import { PropertyAvailability } from '../types/api-types';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  AlertCircle,
  Loader2,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';

interface AvailabilityCalendarProps {
  propertyId: string;
  onDateSelection: (checkIn: Date | null, checkOut: Date | null) => void;
  selectedDates: {
    checkIn: Date | null;
    checkOut: Date | null;
  };
  className?: string;
}

interface CalendarDay {
  date: Date;
  available: boolean;
  price: number;
  minimumStay?: number;
  isToday: boolean;
  isSelected: boolean;
  isInRange: boolean;
  isCheckIn: boolean;
  isCheckOut: boolean;
  isPast: boolean;
}

export const AvailabilityCalendar: React.FC<AvailabilityCalendarProps> = ({
  propertyId,
  onDateSelection,
  selectedDates,
  className
}) => {
  const [availability, setAvailability] = useState<PropertyAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isSelectingCheckOut, setIsSelectingCheckOut] = useState(false);

  useEffect(() => {
    fetchAvailability();
  }, [propertyId, currentMonth]);

  const fetchAvailability = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 2, 0); // Next 2 months
      
      const response = await propertyService.getPropertyAvailability(propertyId, {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      });
      
      setAvailability(response.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch availability');
      // Fallback to mock data for development
      generateMockAvailability();
    } finally {
      setLoading(false);
    }
  };

  const generateMockAvailability = () => {
    const mockData: PropertyAvailability[] = [];
    const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 2, 0);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      const randomAvailable = Math.random() > 0.3; // 70% availability
      const basePrice = 200;
      const weekendMultiplier = isWeekend ? 1.3 : 1;
      const randomMultiplier = 0.8 + Math.random() * 0.4; // ±20% price variation
      
      mockData.push({
        date: d.toISOString().split('T')[0],
        available: randomAvailable,
        price: Math.round(basePrice * weekendMultiplier * randomMultiplier),
        minimumStay: isWeekend ? 2 : 1
      });
    }
    
    setAvailability(mockData);
  };

  const generateCalendarDays = (month: Date): CalendarDay[] => {
    const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
    const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const startOfCalendar = new Date(startOfMonth);
    startOfCalendar.setDate(startOfCalendar.getDate() - startOfCalendar.getDay());
    
    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 42; i++) { // 6 weeks
      const date = new Date(startOfCalendar);
      date.setDate(startOfCalendar.getDate() + i);
      
      const availabilityData = availability.find(a => a.date === date.toISOString().split('T')[0]);
      const isToday = date.getTime() === today.getTime();
      const isPast = date < today;
      const isCheckIn = selectedDates.checkIn && date.getTime() === selectedDates.checkIn.getTime();
      const isCheckOut = selectedDates.checkOut && date.getTime() === selectedDates.checkOut.getTime();
      
      let isInRange = false;
      if (selectedDates.checkIn && selectedDates.checkOut) {
        isInRange = date > selectedDates.checkIn && date < selectedDates.checkOut;
      }
      
      days.push({
        date,
        available: availabilityData?.available ?? false,
        price: availabilityData?.price ?? 0,
        minimumStay: availabilityData?.minimumStay,
        isToday,
        isSelected: isCheckIn || isCheckOut,
        isInRange,
        isCheckIn: isCheckIn || false,
        isCheckOut: isCheckOut || false,
        isPast
      });
    }
    
    return days;
  };

  const handleDateClick = (day: CalendarDay) => {
    if (day.isPast || !day.available) return;
    
    if (!selectedDates.checkIn || (selectedDates.checkIn && selectedDates.checkOut)) {
      // Select check-in date
      onDateSelection(day.date, null);
      setIsSelectingCheckOut(true);
    } else if (selectedDates.checkIn && !selectedDates.checkOut) {
      // Select check-out date
      if (day.date <= selectedDates.checkIn) {
        // If selected date is before check-in, make it the new check-in
        onDateSelection(day.date, null);
      } else {
        // Valid check-out date
        onDateSelection(selectedDates.checkIn, day.date);
        setIsSelectingCheckOut(false);
      }
    }
  };

  const clearSelection = () => {
    onDateSelection(null, null);
    setIsSelectingCheckOut(false);
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(price);
  };

  const getDayClasses = (day: CalendarDay) => {
    const classes = ['calendar-day'];
    
    if (day.isPast) classes.push('past');
    if (!day.available) classes.push('unavailable');
    if (day.isToday) classes.push('today');
    if (day.isCheckIn) classes.push('check-in');
    if (day.isCheckOut) classes.push('check-out');
    if (day.isInRange) classes.push('in-range');
    if (day.available && !day.isPast) classes.push('available');
    
    return classes.join(' ');
  };

  const calendarDays = generateCalendarDays(currentMonth);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading availability...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <AlertCircle className="w-8 h-8 text-red-500 mr-2" />
          <span className="text-muted-foreground">Failed to load availability</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold flex items-center">
          <Calendar className="w-5 h-5 mr-2" />
          Select dates
        </h3>
        {(selectedDates.checkIn || selectedDates.checkOut) && (
          <Button variant="outline" size="sm" onClick={clearSelection}>
            Clear dates
          </Button>
        )}
      </div>

      {/* Selected Dates Display */}
      {(selectedDates.checkIn || selectedDates.checkOut) && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <div>
              <span className="font-medium">Check-in: </span>
              <span>
                {selectedDates.checkIn 
                  ? selectedDates.checkIn.toLocaleDateString() 
                  : 'Select date'
                }
              </span>
            </div>
            <div>
              <span className="font-medium">Check-out: </span>
              <span>
                {selectedDates.checkOut 
                  ? selectedDates.checkOut.toLocaleDateString() 
                  : 'Select date'
                }
              </span>
            </div>
          </div>
          {selectedDates.checkIn && selectedDates.checkOut && (
            <div className="mt-2 text-sm text-muted-foreground">
              {Math.ceil((selectedDates.checkOut.getTime() - selectedDates.checkIn.getTime()) / (1000 * 60 * 60 * 24))} nights
            </div>
          )}
        </div>
      )}

      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h4 className="font-semibold">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h4>
        <Button variant="outline" size="sm" onClick={goToNextMonth}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Day Names */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Days */}
      <div className="grid grid-cols-7 gap-1 mb-4">
        {calendarDays.map((day, index) => (
          <div
            key={index}
            className={`relative p-1 text-center cursor-pointer rounded-lg transition-colors ${
              day.isPast || !day.available
                ? 'cursor-not-allowed opacity-50'
                : 'hover:bg-gray-100'
            } ${
              day.isCheckIn || day.isCheckOut
                ? 'bg-blue-500 text-white'
                : day.isInRange
                ? 'bg-blue-100'
                : ''
            } ${
              day.isToday ? 'ring-2 ring-blue-300' : ''
            }`}
            onClick={() => handleDateClick(day)}
          >
            <div className="py-2">
              <div className="text-sm font-medium">{day.date.getDate()}</div>
              {day.available && !day.isPast && (
                <div className="text-xs text-muted-foreground">
                  {formatPrice(day.price)}
                </div>
              )}
            </div>
            
            {/* Status Indicators */}
            {day.available && !day.isPast && (
              <div className="absolute top-1 right-1">
                <CheckCircle className="w-3 h-3 text-green-500" />
              </div>
            )}
            {!day.available && !day.isPast && (
              <div className="absolute top-1 right-1">
                <XCircle className="w-3 h-3 text-red-500" />
              </div>
            )}
            {day.minimumStay && day.minimumStay > 1 && day.available && (
              <div className="absolute bottom-1 left-1">
                <Badge variant="secondary" className="text-xs">
                  {day.minimumStay}n
                </Badge>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
              <span>Available</span>
            </div>
            <div className="flex items-center">
              <XCircle className="w-4 h-4 text-red-500 mr-1" />
              <span>Unavailable</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-blue-500 rounded mr-1"></div>
              <span>Selected</span>
            </div>
          </div>
        </div>
        
        {isSelectingCheckOut && selectedDates.checkIn && (
          <div className="p-2 bg-yellow-50 rounded text-yellow-800 text-sm">
            <Clock className="w-4 h-4 inline mr-1" />
            Select your check-out date
          </div>
        )}
      </div>

      <style jsx>{`
        .calendar-day {
          min-height: 60px;
        }
        .calendar-day.past {
          opacity: 0.3;
        }
        .calendar-day.unavailable {
          background-color: #f3f4f6;
          color: #9ca3af;
        }
        .calendar-day.available:hover {
          background-color: #dbeafe;
        }
        .calendar-day.today {
          border: 2px solid #3b82f6;
        }
        .calendar-day.check-in,
        .calendar-day.check-out {
          background-color: #3b82f6;
          color: white;
        }
        .calendar-day.in-range {
          background-color: #dbeafe;
        }
      `}</style>
    </Card>
  );
};

export default AvailabilityCalendar;