/**
 * SavedSearches Component
 * Manages user's saved search queries with alerts and notifications
 */

import React, { useState, useCallback } from 'react';
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import { propertyService } from '../services/propertyService';
import { SavedSearch } from '../types/api-types';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';
// import { toast } from './ui/sonner';
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
  Loader2,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

interface SavedSearchesProps {
  onSearchSelect: (search: SavedSearch) => void;
  className?: string;
}

export const SavedSearches: React.FC<SavedSearchesProps> = ({
  onSearchSelect,
  className
}) => {
  const queryClient = useQueryClient();
  const [editingSearch, setEditingSearch] = useState<SavedSearch | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Query for saved searches
  const { 
    data: savedSearches = [], 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['properties', 'saved-searches'],
    queryFn: () => propertyService.getSavedSearches(),
    staleTime: 15 * 60 * 1000, // 15 minutes
  });

  // Mutation to delete saved search
  const deleteMutation = useMutation({
    mutationFn: (searchId: string) => propertyService.deleteSavedSearch(searchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties', 'saved-searches'] });
      toast({
        title: 'Search Deleted',
        description: 'Saved search has been removed'
      });
    },
    onError: (error) => {
      toast({
        title: 'Delete Failed',
        description: error instanceof Error ? error.message : 'Unable to delete search',
        variant: 'destructive'
      });
    }
  });

  // Mutation to update saved search
  const updateMutation = useMutation({
    mutationFn: ({ searchId, updates }: { searchId: string; updates: Partial<SavedSearch> }) =>
      propertyService.updateSavedSearch(searchId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties', 'saved-searches'] });
      setEditingSearch(null);
      toast({
        title: 'Search Updated',
        description: 'Your saved search has been updated'
      });
    },
    onError: (error) => {
      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Unable to update search',
        variant: 'destructive'
      });
    }
  });

  // Handle toggle alerts
  const handleToggleAlerts = useCallback(async (search: SavedSearch) => {
    updateMutation.mutate({
      searchId: search.id,
      updates: { alertsEnabled: !search.alertsEnabled }
    });
  }, [updateMutation]);

  // Handle delete search
  const handleDeleteSearch = useCallback(async (searchId: string) => {
    if (confirm('Are you sure you want to delete this saved search?')) {
      deleteMutation.mutate(searchId);
    }
  }, [deleteMutation]);

  // Handle edit search
  const handleEditSearch = useCallback((search: SavedSearch) => {
    setEditingSearch(search);
  }, []);

  // Handle save edited search
  const handleSaveEdit = useCallback(async () => {
    if (!editingSearch) return;
    
    updateMutation.mutate({
      searchId: editingSearch.id,
      updates: editingSearch
    });
  }, [editingSearch, updateMutation]);

  // Format search criteria for display
  const formatSearchCriteria = useCallback((search: SavedSearch) => {
    const criteria = [];
    
    if (search.filters.location) {
      criteria.push(search.filters.location);
    }
    
    if (search.filters.checkIn && search.filters.checkOut) {
      criteria.push(`${search.filters.checkIn} to ${search.filters.checkOut}`);
    }
    
    if (search.filters.guests) {
      criteria.push(`${search.filters.guests} guests`);
    }
    
    if (search.filters.priceMin || search.filters.priceMax) {
      const min = search.filters.priceMin || 0;
      const max = search.filters.priceMax || '∞';
      criteria.push(`$${min} - $${max}`);
    }
    
    return criteria.join(' • ');
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span>Loading saved searches...</span>
        </div>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={`p-6 ${className}`}>
        <Alert>
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            Failed to load saved searches. Please try again.
          </AlertDescription>
        </Alert>
      </Card>
    );
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Saved Searches</h3>
        <Button
          size="sm"
          onClick={() => setIsCreateDialogOpen(true)}
        >
          <BookmarkPlus className="w-4 h-4 mr-2" />
          Create Alert
        </Button>
      </div>

      {savedSearches.length === 0 ? (
        <div className="text-center py-8">
          <BookmarkPlus className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h4 className="font-medium mb-2">No saved searches yet</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Save your favorite searches to get notified of new properties
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            Create your first search
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {savedSearches.map((search) => (
            <Card key={search.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium">{search.name}</h4>
                    {search.alertsEnabled ? (
                      <Badge variant="default" className="text-xs">
                        <Bell className="w-3 h-3 mr-1" />
                        Alerts On
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        <BellOff className="w-3 h-3 mr-1" />
                        Alerts Off
                      </Badge>
                    )}
                    {search.matchCount > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {search.matchCount} matches
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-3">
                    {formatSearchCriteria(search)}
                  </p>
                  
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Created {new Date(search.createdAt).toLocaleDateString()}</span>
                    {search.lastNotified && (
                      <span>• Last alert {new Date(search.lastNotified).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSearchSelect(search)}
                  >
                    <Search className="w-4 h-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleAlerts(search)}
                    disabled={updateMutation.isPending}
                  >
                    {search.alertsEnabled ? (
                      <BellOff className="w-4 h-4" />
                    ) : (
                      <Bell className="w-4 h-4" />
                    )}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditSearch(search)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteSearch(search.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Search Dialog */}
      {editingSearch && (
        <Dialog open={!!editingSearch} onOpenChange={() => setEditingSearch(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Saved Search</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="search-name">Search Name</Label>
                <Input
                  id="search-name"
                  value={editingSearch.name}
                  onChange={(e) => setEditingSearch({
                    ...editingSearch,
                    name: e.target.value
                  })}
                  placeholder="Enter search name"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="alerts-enabled"
                  checked={editingSearch.alertsEnabled}
                  onCheckedChange={(checked) => setEditingSearch({
                    ...editingSearch,
                    alertsEnabled: checked
                  })}
                />
                <Label htmlFor="alerts-enabled">Enable email alerts</Label>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setEditingSearch(null)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
};

export default SavedSearches;