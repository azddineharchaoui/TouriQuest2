"""
Tests for POI Analytics API Endpoints
"""

import pytest
import json
from fastapi.testclient import TestClient
from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import patch, MagicMock

from main import app

client = TestClient(app)


class TestPOIAnalytics:
    """Test suite for POI analytics endpoints"""

    @pytest.fixture
    def sample_poi_data(self):
        """Sample POI data for testing"""
        return [
            {
                'poi_id': '550e8400-e29b-41d4-a716-446655440001',
                'name': 'Central Park',
                'category': 'park',
                'latitude': 40.7829,
                'longitude': -73.9654,
                'country_code': 'US',
                'region': 'New York',
                'total_visits': 150,
                'unique_visitors': 120,
                'recent_visits': 25,
                'avg_visit_duration': 45.5,
                'average_rating': 4.5,
                'total_ratings': 89,
                'saves_count': 45,
                'shares_count': 12,
                'photos_count': 67,
                'bookings_generated': 5,
                'revenue_generated': 250.0
            },
            {
                'poi_id': '550e8400-e29b-41d4-a716-446655440002',
                'name': 'Times Square',
                'category': 'landmark',
                'latitude': 40.7580,
                'longitude': -73.9855,
                'country_code': 'US',
                'region': 'New York',
                'total_visits': 300,
                'unique_visitors': 280,
                'recent_visits': 50,
                'avg_visit_duration': 30.0,
                'average_rating': 4.2,
                'total_ratings': 156,
                'saves_count': 78,
                'shares_count': 25,
                'photos_count': 145,
                'bookings_generated': 8,
                'revenue_generated': 420.0
            }
        ]

    @pytest.fixture
    def sample_time_series_data(self):
        """Sample time series data for testing"""
        return [
            {
                'visit_date': date.today() - timedelta(days=1),
                'daily_visits': 25,
                'daily_unique_visitors': 22,
                'avg_duration': 35.0,
                'daily_ratings': 3,
                'daily_avg_rating': 4.3
            },
            {
                'visit_date': date.today() - timedelta(days=2),
                'daily_visits': 30,
                'daily_unique_visitors': 27,
                'avg_duration': 40.0,
                'daily_ratings': 5,
                'daily_avg_rating': 4.4
            }
        ]

    @patch('app.core.database.get_warehouse_db')
    def test_get_poi_analytics_success(self, mock_db, sample_poi_data, sample_time_series_data):
        """Test successful POI analytics retrieval"""
        # Mock database session
        mock_session = MagicMock()
        mock_db.return_value = mock_session
        
        # Mock POI metrics query result
        mock_poi_result = MagicMock()
        mock_poi_result.fetchall.return_value = [MagicMock(**row) for row in sample_poi_data]
        
        # Mock time series query result
        mock_time_series_result = MagicMock()
        mock_time_series_result.fetchall.return_value = [MagicMock(**row) for row in sample_time_series_data]
        
        # Configure session.execute to return appropriate results
        mock_session.execute.side_effect = [mock_poi_result, mock_time_series_result]
        
        # Make request
        response = client.get("/analytics/pois?days=30")
        
        # Assertions
        assert response.status_code == 200
        data = response.json()
        
        # Check top-level structure
        assert "success" in data
        assert data["success"] is True
        assert "data" in data
        assert "filters_applied" in data
        assert "date_range" in data
        assert "generated_at" in data
        
        # Check POI metrics structure
        poi_data = data["data"]
        assert "poi_metrics" in poi_data
        assert "summary" in poi_data
        assert "time_series" in poi_data
        assert "heatmap_data" in poi_data
        
        # Validate POI metrics
        poi_metrics = poi_data["poi_metrics"]
        assert len(poi_metrics) == 2
        
        first_poi = poi_metrics[0]
        assert "poi_id" in first_poi
        assert "name" in first_poi
        assert "category" in first_poi
        assert "location" in first_poi
        assert "visits" in first_poi
        assert "ratings" in first_poi
        assert "engagement" in first_poi
        assert "conversion" in first_poi
        
        # Validate location structure
        location = first_poi["location"]
        assert "latitude" in location
        assert "longitude" in location
        assert "country_code" in location
        assert "region" in location
        
        # Validate visits structure
        visits = first_poi["visits"]
        assert "total_visits" in visits
        assert "unique_visitors" in visits
        assert "recent_visits" in visits
        assert "avg_visit_duration_minutes" in visits
        
        # Validate summary
        summary = poi_data["summary"]
        assert "total_pois" in summary
        assert "total_visits" in summary
        assert "total_unique_visitors" in summary
        assert "average_rating_overall" in summary
        assert "total_revenue_generated" in summary
        
        # Check that summary calculations are correct
        expected_total_visits = sum(poi['total_visits'] for poi in sample_poi_data)
        assert summary["total_visits"] == expected_total_visits
        
        # Validate time series
        time_series = poi_data["time_series"]
        assert len(time_series) == 2
        
        first_time_point = time_series[0]
        assert "date" in first_time_point
        assert "visits" in first_time_point
        assert "unique_visitors" in first_time_point
        assert "avg_duration_minutes" in first_time_point

    def test_get_poi_analytics_with_filters(self):
        """Test POI analytics with various filters"""
        with patch('app.core.database.get_warehouse_db') as mock_db:
            mock_session = MagicMock()
            mock_db.return_value = mock_session
            
            # Mock empty results for simplicity
            mock_result = MagicMock()
            mock_result.fetchall.return_value = []
            mock_session.execute.return_value = mock_result
            
            # Test with POI ID filter
            response = client.get("/analytics/pois?poi_id=550e8400-e29b-41d4-a716-446655440001")
            assert response.status_code == 200
            
            # Test with category filter
            response = client.get("/analytics/pois?category=park")
            assert response.status_code == 200
            
            # Test with country filter
            response = client.get("/analytics/pois?country_code=US")
            assert response.status_code == 200
            
            # Test with minimum rating filter
            response = client.get("/analytics/pois?min_rating=4.0")
            assert response.status_code == 200
            
            # Test with heatmap disabled
            response = client.get("/analytics/pois?include_heatmap=false")
            assert response.status_code == 200
            data = response.json()
            assert data["data"]["heatmap_data"] is None

    def test_get_poi_analytics_invalid_params(self):
        """Test POI analytics with invalid parameters"""
        # Test with invalid days (too low)
        response = client.get("/analytics/pois?days=0")
        assert response.status_code == 422
        
        # Test with invalid days (too high)
        response = client.get("/analytics/pois?days=400")
        assert response.status_code == 422
        
        # Test with invalid min_rating (too low)
        response = client.get("/analytics/pois?min_rating=0.5")
        assert response.status_code == 422
        
        # Test with invalid min_rating (too high)
        response = client.get("/analytics/pois?min_rating=6.0")
        assert response.status_code == 422

    @patch('app.core.database.get_warehouse_db')
    def test_get_poi_analytics_database_error(self, mock_db):
        """Test POI analytics with database error"""
        # Mock database session to raise an exception
        mock_session = MagicMock()
        mock_session.execute.side_effect = Exception("Database connection failed")
        mock_db.return_value = mock_session
        
        # Make request
        response = client.get("/analytics/pois")
        
        # Should return 500 error
        assert response.status_code == 500
        data = response.json()
        assert "detail" in data
        assert "Failed to retrieve POI analytics" in data["detail"]

    @patch('app.core.database.get_warehouse_db')
    def test_poi_heatmap_data_generation(self, mock_db, sample_poi_data):
        """Test heatmap data generation logic"""
        mock_session = MagicMock()
        mock_db.return_value = mock_session
        
        # Mock POI metrics with location data
        mock_poi_result = MagicMock()
        mock_poi_result.fetchall.return_value = [MagicMock(**row) for row in sample_poi_data]
        
        # Mock time series (empty for this test)
        mock_time_series_result = MagicMock()
        mock_time_series_result.fetchall.return_value = []
        
        mock_session.execute.side_effect = [mock_poi_result, mock_time_series_result]
        
        response = client.get("/analytics/pois?include_heatmap=true")
        assert response.status_code == 200
        
        data = response.json()
        heatmap_data = data["data"]["heatmap_data"]
        
        # Should have heatmap points
        assert isinstance(heatmap_data, list)
        assert len(heatmap_data) > 0
        
        # Each heatmap point should have required fields
        for point in heatmap_data:
            assert "latitude" in point
            assert "longitude" in point
            assert "visits" in point
            assert "pois_count" in point
            assert "avg_rating" in point
            assert "intensity" in point

    def test_poi_analytics_response_structure_validation(self):
        """Test that the response structure matches expected format for frontend consumption"""
        with patch('app.core.database.get_warehouse_db') as mock_db:
            mock_session = MagicMock()
            mock_db.return_value = mock_session
            
            # Mock minimal data
            sample_row = MagicMock(
                poi_id='test-poi-id',
                name='Test POI',
                category='test',
                latitude=40.0,
                longitude=-73.0,
                country_code='US',
                region='Test Region',
                total_visits=10,
                unique_visitors=8,
                recent_visits=2,
                avg_visit_duration=30.0,
                average_rating=4.0,
                total_ratings=5,
                saves_count=3,
                shares_count=1,
                photos_count=7,
                bookings_generated=1,
                revenue_generated=50.0
            )
            
            mock_result = MagicMock()
            mock_result.fetchall.side_effect = [[sample_row], []]  # POI data, then empty time series
            mock_session.execute.return_value = mock_result
            
            response = client.get("/analytics/pois")
            assert response.status_code == 200
            
            # Validate the exact structure expected by frontend
            data = response.json()
            
            # Must have these top-level keys
            required_keys = ["success", "data", "filters_applied", "date_range", "generated_at"]
            for key in required_keys:
                assert key in data, f"Missing required key: {key}"
            
            # Data section must have these keys
            data_section = data["data"]
            data_required_keys = ["poi_metrics", "summary", "time_series", "heatmap_data"]
            for key in data_required_keys:
                assert key in data_section, f"Missing required data key: {key}"
            
            # POI metrics should be properly formatted
            poi = data_section["poi_metrics"][0]
            poi_structure = {
                "poi_id": str,
                "name": str,
                "category": str,
                "location": dict,
                "visits": dict,
                "ratings": dict,
                "engagement": dict,
                "conversion": dict
            }
            
            for key, expected_type in poi_structure.items():
                assert key in poi, f"Missing POI key: {key}"
                assert isinstance(poi[key], expected_type), f"Wrong type for {key}, expected {expected_type}"