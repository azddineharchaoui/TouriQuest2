/**
 * PriceComparisonWidget Component (Simplified)
 * Displays price analytics and deal highlighting
 */

import React, { useMemo } from 'react';
import { Property } from '../types/api-types';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  Target,
  AlertCircle,
  CheckCircle2,
  Info,
  X
} from 'lucide-react';

interface PriceComparisonWidgetProps {
  properties: Property[];
  location: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  onClose?: () => void;
  className?: string;
}

interface PriceInsight {
  type: 'deal' | 'average' | 'expensive';
  message: string;
  percentage: number;
  color: string;
}

export const PriceComparisonWidget: React.FC<PriceComparisonWidgetProps> = ({
  properties,
  location,
  checkIn,
  checkOut,
  guests,
  onClose,
  className
}) => {
  // Mock price comparison data
  const priceData = {
    averagePrice: 250,
    priceChangePercentage: -5.2,
    historicalData: []
  };

  // Calculate local price statistics
  const localStats = useMemo(() => {
    if (!properties.length) return null;
    
    const prices = properties.map(p => p.pricing.basePrice);
    const sortedPrices = [...prices].sort((a, b) => a - b);
    
    const min = sortedPrices[0];
    const max = sortedPrices[sortedPrices.length - 1];
    const median = sortedPrices[Math.floor(sortedPrices.length / 2)];
    const average = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    
    // Count deals (properties with discounts)
    const dealsCount = properties.filter(p => p.pricing.discounts && p.pricing.discounts.length > 0).length;
    
    // Price distribution
    const lowPrice = sortedPrices[Math.floor(sortedPrices.length * 0.25)];
    const highPrice = sortedPrices[Math.floor(sortedPrices.length * 0.75)];
    
    return {
      min,
      max,
      median,
      average,
      dealsCount,
      total: properties.length,
      lowPrice,
      highPrice,
      priceDistribution: {
        budget: prices.filter(p => p <= lowPrice).length,
        mid: prices.filter(p => p > lowPrice && p <= highPrice).length,
        luxury: prices.filter(p => p > highPrice).length
      }
    };
  }, [properties]);

  // Generate price insights
  const insights = useMemo((): PriceInsight[] => {
    if (!localStats || !priceData) return [];
    
    const insights: PriceInsight[] = [];
    
    // Compare with market average
    const marketDifference = ((localStats.average - priceData.averagePrice) / priceData.averagePrice) * 100;
    
    if (Math.abs(marketDifference) > 5) {
      insights.push({
        type: marketDifference < 0 ? 'deal' : 'expensive',
        message: marketDifference < 0 
          ? `Properties here are ${Math.abs(marketDifference).toFixed(1)}% below market average`
          : `Properties here are ${marketDifference.toFixed(1)}% above market average`,
        percentage: Math.abs(marketDifference),
        color: marketDifference < 0 ? 'text-green-600' : 'text-red-600'
      });
    }
    
    // Deal availability
    if (localStats.dealsCount > 0) {
      const dealPercentage = (localStats.dealsCount / localStats.total) * 100;
      insights.push({
        type: 'deal',
        message: `${localStats.dealsCount} properties have special offers (${dealPercentage.toFixed(0)}%)`,
        percentage: dealPercentage,
        color: 'text-green-600'
      });
    }
    
    // Price trend insight
    if (priceData.priceChangePercentage !== 0) {
      insights.push({
        type: priceData.priceChangePercentage < 0 ? 'deal' : 'expensive',
        message: `Prices have ${priceData.priceChangePercentage < 0 ? 'decreased' : 'increased'} by ${Math.abs(priceData.priceChangePercentage).toFixed(1)}% recently`,
        percentage: Math.abs(priceData.priceChangePercentage),
        color: priceData.priceChangePercentage < 0 ? 'text-green-600' : 'text-orange-600'
      });
    }
    
    return insights;
  }, [localStats, priceData]);

  if (!localStats || !priceData) {
    return (
      <Card className={`p-6 text-center ${className}`}>
        <div className="flex items-center justify-center">
          <Info className="w-8 h-8 text-muted-foreground mr-2" />
          <p className="text-muted-foreground">No properties available for price comparison</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold flex items-center">
          <Target className="w-5 h-5 mr-2" />
          Price Insights
        </h3>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">${Math.round(localStats.average)}</div>
          <div className="text-xs text-muted-foreground">Average Price</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">${localStats.min}</div>
          <div className="text-xs text-muted-foreground">Lowest Price</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">${localStats.max}</div>
          <div className="text-xs text-muted-foreground">Highest Price</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{localStats.dealsCount}</div>
          <div className="text-xs text-muted-foreground">Special Offers</div>
        </div>
      </div>

      {/* Price Distribution */}
      <div className="mb-6">
        <h4 className="font-medium mb-3">Price Distribution</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">Budget (${localStats.min} - ${localStats.lowPrice})</span>
            <Badge variant="outline">{localStats.priceDistribution.budget} properties</Badge>
          </div>
          <Progress value={(localStats.priceDistribution.budget / localStats.total) * 100} className="h-2" />
          
          <div className="flex items-center justify-between">
            <span className="text-sm">Mid-range (${localStats.lowPrice} - ${localStats.highPrice})</span>
            <Badge variant="outline">{localStats.priceDistribution.mid} properties</Badge>
          </div>
          <Progress value={(localStats.priceDistribution.mid / localStats.total) * 100} className="h-2" />
          
          <div className="flex items-center justify-between">
            <span className="text-sm">Luxury (${localStats.highPrice}+)</span>
            <Badge variant="outline">{localStats.priceDistribution.luxury} properties</Badge>
          </div>
          <Progress value={(localStats.priceDistribution.luxury / localStats.total) * 100} className="h-2" />
        </div>
      </div>

      {/* Market Comparison */}
      <div className="mb-6">
        <h4 className="font-medium mb-3">Market Comparison</h4>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm">Market Average</span>
            <span className="font-semibold">${Math.round(priceData.averagePrice)}</span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm">Local Average</span>
            <span className="font-semibold">${Math.round(localStats.average)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Difference</span>
            <span className={`font-semibold ${
              localStats.average < priceData.averagePrice ? 'text-green-600' : 'text-red-600'
            }`}>
              {localStats.average < priceData.averagePrice ? '-' : '+'}
              ${Math.abs(Math.round(localStats.average - priceData.averagePrice))}
            </span>
          </div>
        </div>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div>
          <h4 className="font-medium mb-3">Key Insights</h4>
          <div className="space-y-3">
            {insights.map((insight, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                {insight.type === 'deal' ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                ) : insight.type === 'expensive' ? (
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                ) : (
                  <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={`text-sm font-medium ${insight.color}`}>
                    {insight.message}
                  </p>
                  {insight.type === 'deal' && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Great time to book!
                    </p>
                  )}
                </div>
                <Badge variant="outline" className="ml-auto">
                  {insight.percentage.toFixed(1)}%
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historical Trend */}
      <div className="mt-6">
        <h4 className="font-medium mb-3">Price Trend (Last 30 Days)</h4>
        <div className="h-24 bg-gray-50 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <TrendingUp className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">
              Chart showing price trends over time
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default PriceComparisonWidget;