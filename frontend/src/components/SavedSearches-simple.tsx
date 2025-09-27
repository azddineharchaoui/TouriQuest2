/**
 * SavedSearches Component (Simplified)
 * Manages user's saved property searches with notifications
 */

import React, { useState } from 'react';
import { SavedSearch } from '../types/api-types';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';
import {
  BookmarkPlus,
  Search,
  Bell,
  BellOff,
  Edit,
  Trash2,
  MapPin,
  Calendar,
  Users,
  DollarSign,
  Star,
  Filter,
  X
} from 'lucide-react';

interface SavedSearchesProps {
  onSearchSelect?: (search: SavedSearch) => void;
  onCreateSearch?: () => void;
  className?: string;
}

export const SavedSearches: React.FC<SavedSearchesProps> = ({
  onSearchSelect,
  onCreateSearch,
  className
}) => {
  const [editingSearch, setEditingSearch] = useState<SavedSearch | null>(null);
  const [newSearchName, setNewSearchName] = useState('');
  
  // Mock data for demonstration
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([
    {
      id: '1',
      name: 'Paris Vacation',
      filters: {
        location: 'Paris, France',
        checkIn: '2024-06-01',
        checkOut: '2024-06-07',
        guests: 2,
        minPrice: 100,
        maxPrice: 300
      },
      alertsEnabled: true,
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
      userId: 'user1'
    },
    {
      id: '2',
      name: 'Beach House Weekend',
      filters: {
        location: 'Malibu, CA',
        guests: 4,
        propertyTypes: ['house'],
        amenities: ['pool', 'beach_access']
      },
      alertsEnabled: false,
      createdAt: '2024-01-10T15:30:00Z',
      updatedAt: '2024-01-10T15:30:00Z',
      userId: 'user1'
    },
    {
      id: '3',
      name: 'Business Trip NYC',
      filters: {
        location: 'New York, NY',
        checkIn: '2024-03-15',
        checkOut: '2024-03-18',
        guests: 1,
        amenities: ['wifi', 'business_center']
      },
      alertsEnabled: true,
      createdAt: '2024-01-05T09:15:00Z',
      updatedAt: '2024-01-05T09:15:00Z',
      userId: 'user1'
    }
  ]);

  const handleDeleteSearch = (searchId: string) => {
    setSavedSearches(prev => prev.filter(search => search.id !== searchId));
  };

  const handleToggleAlerts = (searchId: string, enabled: boolean) => {
    setSavedSearches(prev => 
      prev.map(search => 
        search.id === searchId 
          ? { ...search, alertsEnabled: enabled }
          : search
      )
    );
  };

  const handleUpdateSearch = (updates: Partial<SavedSearch>) => {
    if (!editingSearch) return;
    
    setSavedSearches(prev => 
      prev.map(search => 
        search.id === editingSearch.id 
          ? { ...search, ...updates, updatedAt: new Date().toISOString() }
          : search
      )
    );
    setEditingSearch(null);
  };

  const formatFilters = (search: SavedSearch) => {
    const filters = search.filters;
    const parts: string[] = [];
    
    if (filters.location) parts.push(filters.location);
    if (filters.checkIn && filters.checkOut) {
      parts.push(`${new Date(filters.checkIn).toLocaleDateString()} - ${new Date(filters.checkOut).toLocaleDateString()}`);
    }
    if (filters.guests) parts.push(`${filters.guests} guests`);
    if (filters.minPrice || filters.maxPrice) {
      const priceRange = `$${filters.minPrice || 0} - $${filters.maxPrice || '∞'}`;
      parts.push(priceRange);
    }
    
    return parts;
  };

  const getActiveFiltersCount = (search: SavedSearch) => {
    const filters = search.filters;
    let count = 0;
    
    if (filters.location) count++;
    if (filters.checkIn) count++;
    if (filters.checkOut) count++;
    if (filters.guests) count++;
    if (filters.minPrice) count++;
    if (filters.maxPrice) count++;
    if (filters.propertyTypes?.length) count++;
    if (filters.amenities?.length) count++;
    if (filters.rating) count++;
    
    return count;
  };

  if (savedSearches.length === 0) {
    return (
      <Card className={`p-8 text-center ${className}`}>
        <BookmarkPlus className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">No Saved Searches</h3>
        <p className="text-muted-foreground mb-6">
          Save your property searches to get notified when new properties match your criteria.
        </p>
        <Button onClick={onCreateSearch} className="gap-2">
          <BookmarkPlus className="w-4 h-4" />
          Create Your First Search
        </Button>
      </Card>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Saved Searches</h2>
        <Button onClick={onCreateSearch} className="gap-2">
          <BookmarkPlus className="w-4 h-4" />
          New Search
        </Button>
      </div>

      <div className="grid gap-4">
        {savedSearches.map((search) => (
          <Card key={search.id} className="p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold">{search.name}</h3>
                  <Badge variant="outline" className="gap-1">
                    <Filter className="w-3 h-3" />
                    {getActiveFiltersCount(search)} filters
                  </Badge>
                  {search.alertsEnabled && (
                    <Badge variant="default" className="gap-1 bg-green-100 text-green-800">
                      <Bell className="w-3 h-3" />
                      Alerts On
                    </Badge>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-2 mb-3">
                  {formatFilters(search).map((filter, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {filter}
                    </Badge>
                  ))}
                </div>

                {search.filters.amenities && search.filters.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    <span className="text-xs text-muted-foreground mr-2">Amenities:</span>
                    {search.filters.amenities.slice(0, 3).map((amenity, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {amenity.replace('_', ' ')}
                      </Badge>
                    ))}
                    {search.filters.amenities.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{search.filters.amenities.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Created {new Date(search.createdAt).toLocaleDateString()}
                  {search.updatedAt !== search.createdAt && (
                    <> • Updated {new Date(search.updatedAt).toLocaleDateString()}</>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor={`alerts-${search.id}`} className="text-xs">
                    {search.alertsEnabled ? 'Alerts On' : 'Alerts Off'}
                  </Label>
                  <Switch
                    id={`alerts-${search.id}`}
                    checked={search.alertsEnabled}
                    onCheckedChange={(checked) => handleToggleAlerts(search.id, checked)}
                  />
                </div>
                
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => setEditingSearch(search)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Search: {search.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="search-name">Search Name</Label>
                        <Input
                          id="search-name"
                          value={newSearchName || search.name}
                          onChange={(e) => setNewSearchName(e.target.value)}
                          placeholder="Enter search name"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => handleUpdateSearch({ name: newSearchName || search.name })}
                          className="flex-1"
                        >
                          Save Changes
                        </Button>
                        <Button variant="outline" onClick={() => setEditingSearch(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteSearch(search.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Button
                variant="default"
                size="sm"
                onClick={() => onSearchSelect?.(search)}
                className="gap-2"
              >
                <Search className="w-4 h-4" />
                Run Search
              </Button>

              {search.lastAlertSent && (
                <p className="text-xs text-muted-foreground">
                  Last alert: {new Date(search.lastAlertSent).toLocaleDateString()}
                </p>
              )}
            </div>
          </Card>
        ))}
      </div>

      {savedSearches.length > 0 && (
        <Alert className="mt-6">
          <Bell className="w-4 h-4" />
          <AlertDescription>
            You have {savedSearches.filter(s => s.alertsEnabled).length} searches with alerts enabled. 
            You'll be notified when new properties match your criteria.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default SavedSearches;