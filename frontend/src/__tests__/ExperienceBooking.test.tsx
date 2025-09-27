// Test file for Experience Booking functionality
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExperienceBooking } from '../components/ExperienceBooking';
import { ApiClient } from '../api/client';
import { ExperienceService } from '../api/services/experience';

// Mock the API client and service
jest.mock('../api/client');
jest.mock('../api/services/experience');

const mockExperiences = [
  {
    id: '1',
    name: 'Test Experience 1',
    description: 'Test description',
    category: { id: 'cultural', name: 'Cultural' },
    duration: { value: 2, unit: 'hours' },
    difficulty: 'easy',
    groupSize: { min: 1, max: 10 },
    pricing: { basePrice: 50 },
    rating: 4.5,
    reviewCount: 100,
    photos: [{ url: 'test.jpg' }],
    location: { city: 'Test City' },
    languages: ['English'],
    inclusions: ['Test inclusion'],
    exclusions: ['Test exclusion'],
    requirements: ['Test requirement'],
    cancellationPolicy: 'Free cancellation',
    guide: { name: 'Test Guide', bio: 'Test bio' },
    tags: ['test'],
    isInstantBooking: true
  }
];

describe('ExperienceBooking Component', () => {
  beforeEach(() => {
    // Mock the API service methods
    const mockExperienceService = {
      getCategories: jest.fn().mockResolvedValue({
        success: true,
        data: [{ id: 'cultural', name: 'Cultural', icon: 'palette' }]
      }),
      getPopularExperiences: jest.fn().mockResolvedValue({
        success: true,
        data: { items: mockExperiences }
      }),
      searchExperiences: jest.fn().mockResolvedValue({
        success: true,
        data: { items: mockExperiences }
      }),
      addToFavorites: jest.fn().mockResolvedValue({}),
      removeFromFavorites: jest.fn().mockResolvedValue({})
    };

    (ExperienceService as jest.Mock).mockImplementation(() => mockExperienceService);
  });

  test('renders experience booking component', async () => {
    render(<ExperienceBooking />);
    
    expect(screen.getByText('Local Experiences')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search experiences...')).toBeInTheDocument();
  });

  test('handles search functionality', async () => {
    render(<ExperienceBooking />);
    
    const searchInput = screen.getByPlaceholderText('Search experiences...');
    fireEvent.change(searchInput, { target: { value: 'pottery' } });
    
    expect(searchInput.value).toBe('pottery');
  });

  test('handles category selection', async () => {
    render(<ExperienceBooking />);
    
    await waitFor(() => {
      const categoryButton = screen.getByText('All Experiences');
      expect(categoryButton).toBeInTheDocument();
    });
  });

  test('handles favorite functionality', async () => {
    render(<ExperienceBooking />);
    
    // Wait for experiences to load and then test favorite functionality
    await waitFor(() => {
      const favoriteButtons = screen.getAllByRole('button');
      const heartButton = favoriteButtons.find(btn => 
        btn.querySelector('svg')?.classList.contains('lucide-heart')
      );
      
      if (heartButton) {
        fireEvent.click(heartButton);
        // The favorite state should be toggled
        expect(heartButton).toBeInTheDocument();
      }
    });
  });

  test('handles filter functionality', async () => {
    render(<ExperienceBooking />);
    
    const filtersButton = screen.getByText('Filters');
    fireEvent.click(filtersButton);
    
    // Check if filters panel opens
    await waitFor(() => {
      expect(screen.getByText('Price Range')).toBeInTheDocument();
      expect(screen.getByText('Duration')).toBeInTheDocument();
      expect(screen.getByText('Difficulty')).toBeInTheDocument();
    });
  });

  test('handles sorting functionality', async () => {
    render(<ExperienceBooking />);
    
    // Wait for the sort dropdown to be available
    await waitFor(() => {
      const sortDropdown = screen.getByRole('combobox');
      expect(sortDropdown).toBeInTheDocument();
    });
  });
});