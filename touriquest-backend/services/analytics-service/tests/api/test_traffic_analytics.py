"""
Tests for Traffic Analytics API Endpoints
"""

import pytest
import json
from fastapi.testclient import TestClient
from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import patch, MagicMock

from main import app

client = TestClient(app)


class TestTrafficAnalytics:
    """Test suite for traffic analytics endpoints"""

    @pytest.fixture
    def sample_daily_metrics_data(self):
        """Sample daily traffic metrics data for testing"""
        return [
            {
                'traffic_date': date.today() - timedelta(days=1),
                'daily_sessions': 1250,
                'daily_unique_visitors': 980,
                'daily_total_visitors': 1100,
                'avg_session_duration': 285.5,
                'avg_pages_per_session': 4.2,
                'bounced_sessions': 425,
                'converted_sessions': 75,
                'total_page_views': 5250,
                'unique_landing_pages': 45
            },
            {
                'traffic_date': date.today() - timedelta(days=2),
                'daily_sessions': 1180,
                'daily_unique_visitors': 920,
                'daily_total_visitors': 1050,
                'avg_session_duration': 295.0,
                'avg_pages_per_session': 4.5,
                'bounced_sessions': 390,
                'converted_sessions': 82,
                'total_page_views': 5310,
                'unique_landing_pages': 48
            }
        ]

    @pytest.fixture
    def sample_traffic_sources_data(self):
        """Sample traffic sources data for testing"""
        return [
            {
                'traffic_source': 'organic',
                'referrer_domain': 'google.com',
                'sessions': 650,
                'unique_visitors': 520,
                'avg_duration': 320.0,
                'avg_pages': 4.8,
                'bounces': 180,
                'conversions': 45,
                'attributed_revenue': 2250.0
            },
            {
                'traffic_source': 'direct',
                'referrer_domain': None,
                'sessions': 400,
                'unique_visitors': 350,
                'avg_duration': 280.0,
                'avg_pages': 3.9,
                'bounces': 140,
                'conversions': 25,
                'attributed_revenue': 1500.0
            },
            {
                'traffic_source': 'paid',
                'referrer_domain': 'facebook.com',
                'sessions': 200,
                'unique_visitors': 185,
                'avg_duration': 250.0,
                'avg_pages': 3.2,
                'bounces': 85,
                'conversions': 15,
                'attributed_revenue': 900.0
            }
        ]

    @pytest.fixture
    def sample_device_data(self):
        """Sample device analytics data for testing"""
        return [
            {
                'device_type': 'desktop',
                'browser_name': 'Chrome',
                'operating_system': 'Windows',
                'sessions': 700,
                'unique_users': 550,
                'avg_duration': 350.0,
                'avg_pages': 5.1,
                'bounces': 200,
                'conversions': 50
            },
            {
                'device_type': 'mobile',
                'browser_name': 'Safari',
                'operating_system': 'iOS',
                'sessions': 450,
                'unique_users': 420,
                'avg_duration': 220.0,
                'avg_pages': 3.2,
                'bounces': 180,
                'conversions': 25
            },
            {
                'device_type': 'tablet',
                'browser_name': 'Chrome',
                'operating_system': 'Android',
                'sessions': 100,
                'unique_users': 90,
                'avg_duration': 280.0,
                'avg_pages': 4.0,
                'bounces': 35,
                'conversions': 10
            }
        ]

    @pytest.fixture
    def sample_geographic_data(self):
        """Sample geographic distribution data for testing"""
        return [
            {
                'country_code': 'US',
                'country_name': 'United States',
                'region': 'New York',
                'city': 'New York',
                'sessions': 500,
                'unique_visitors': 420,
                'avg_duration': 300.0,
                'bounces': 150,
                'conversions': 35,
                'revenue': 1750.0
            },
            {
                'country_code': 'CA',
                'country_name': 'Canada',
                'region': 'Ontario',
                'city': 'Toronto',
                'sessions': 200,
                'unique_visitors': 180,
                'avg_duration': 280.0,
                'bounces': 65,
                'conversions': 15,
                'revenue': 750.0
            }
        ]

    @patch('app.core.database.get_warehouse_db')
    def test_get_traffic_analytics_success(self, mock_db, sample_daily_metrics_data,
                                         sample_traffic_sources_data, sample_device_data,
                                         sample_geographic_data):
        """Test successful traffic analytics retrieval"""
        # Mock database session
        mock_session = MagicMock()
        mock_db.return_value = mock_session
        
        # Mock query results in order
        mock_daily_result = MagicMock()
        mock_daily_result.fetchall.return_value = [MagicMock(**row) for row in sample_daily_metrics_data]
        
        mock_sources_result = MagicMock()
        mock_sources_result.fetchall.return_value = [MagicMock(**row) for row in sample_traffic_sources_data]
        
        mock_device_result = MagicMock()
        mock_device_result.fetchall.return_value = [MagicMock(**row) for row in sample_device_data]
        
        mock_geo_result = MagicMock()
        mock_geo_result.fetchall.return_value = [MagicMock(**row) for row in sample_geographic_data]
        
        # Configure session.execute to return appropriate results in order
        mock_session.execute.side_effect = [
            mock_daily_result,
            mock_sources_result,
            mock_device_result,
            mock_geo_result
        ]
        
        # Make request
        response = client.get("/analytics/traffic?days=30")
        
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
        
        # Check traffic analytics structure
        traffic_data = data["data"]
        assert "daily_metrics" in traffic_data
        assert "traffic_sources" in traffic_data
        assert "device_analytics" in traffic_data
        assert "geographic_distribution" in traffic_data
        assert "summary" in traffic_data
        
        # Validate daily metrics structure
        daily_metrics = traffic_data["daily_metrics"]
        assert len(daily_metrics) == 2
        
        first_day = daily_metrics[0]
        assert "date" in first_day
        assert "visits" in first_day
        assert "engagement" in first_day
        assert "conversion" in first_day
        
        # Validate visits structure
        visits = first_day["visits"]
        assert "total_sessions" in visits
        assert "unique_visitors" in visits
        assert "total_visitors" in visits
        
        # Validate engagement structure
        engagement = first_day["engagement"]
        assert "avg_session_duration_seconds" in engagement
        assert "avg_pages_per_session" in engagement
        assert "total_page_views" in engagement
        
        # Validate conversion structure
        conversion = first_day["conversion"]
        assert "bounce_rate" in conversion
        assert "conversion_rate" in conversion
        assert "bounced_sessions" in conversion
        assert "converted_sessions" in conversion
        
        # Validate traffic sources
        traffic_sources = traffic_data["traffic_sources"]
        assert len(traffic_sources) == 3
        
        first_source = traffic_sources[0]
        assert "source" in first_source
        assert "referrer_domain" in first_source
        assert "metrics" in first_source
        
        source_metrics = first_source["metrics"]
        assert "sessions" in source_metrics
        assert "unique_visitors" in source_metrics
        assert "bounce_rate" in source_metrics
        assert "conversion_rate" in source_metrics
        assert "attributed_revenue" in source_metrics
        
        # Validate device analytics
        device_analytics = traffic_data["device_analytics"]
        assert len(device_analytics) == 3
        
        first_device = device_analytics[0]
        assert "device_type" in first_device
        assert "browser" in first_device
        assert "operating_system" in first_device
        assert "metrics" in first_device

    def test_get_traffic_analytics_with_filters(self):
        """Test traffic analytics with various filters"""
        with patch('app.core.database.get_warehouse_db') as mock_db:
            mock_session = MagicMock()
            mock_db.return_value = mock_session
            
            # Mock empty results for simplicity
            mock_result = MagicMock()
            mock_result.fetchall.return_value = []
            mock_session.execute.return_value = mock_result
            
            # Test with source filter
            response = client.get("/analytics/traffic?source=organic")
            assert response.status_code == 200
            
            # Test with device_type filter
            response = client.get("/analytics/traffic?device_type=mobile")
            assert response.status_code == 200
            
            # Test with country_code filter
            response = client.get("/analytics/traffic?country_code=US")
            assert response.status_code == 200
            
            # Test with geo disabled
            response = client.get("/analytics/traffic?include_geo=false")
            assert response.status_code == 200
            data = response.json()
            assert data["data"]["geographic_distribution"] is None

    def test_get_traffic_analytics_invalid_params(self):
        """Test traffic analytics with invalid parameters"""
        # Test with invalid days (too low)
        response = client.get("/analytics/traffic?days=0")
        assert response.status_code == 422
        
        # Test with invalid days (too high)
        response = client.get("/analytics/traffic?days=400")
        assert response.status_code == 422

    @patch('app.core.database.get_warehouse_db')
    def test_traffic_analytics_calculations(self, mock_db, sample_daily_metrics_data):
        """Test that traffic analytics calculations are accurate"""
        mock_session = MagicMock()
        mock_db.return_value = mock_session
        
        # Mock daily metrics with specific values for calculation testing
        mock_daily_result = MagicMock()
        mock_daily_result.fetchall.return_value = [MagicMock(**row) for row in sample_daily_metrics_data]
        
        # Mock empty results for other queries
        mock_empty_result = MagicMock()
        mock_empty_result.fetchall.return_value = []
        
        mock_session.execute.side_effect = [
            mock_daily_result,
            mock_empty_result,
            mock_empty_result,
            mock_empty_result
        ]
        
        response = client.get("/analytics/traffic")
        assert response.status_code == 200
        
        data = response.json()
        daily_metrics = data["data"]["daily_metrics"]
        
        # Verify bounce rate calculation for first day
        first_day = daily_metrics[0]
        expected_bounce_rate = (425 / 1250) * 100  # bounced_sessions / daily_sessions * 100
        assert abs(first_day["conversion"]["bounce_rate"] - expected_bounce_rate) < 0.01
        
        # Verify conversion rate calculation
        expected_conversion_rate = (75 / 1250) * 100  # converted_sessions / daily_sessions * 100
        assert abs(first_day["conversion"]["conversion_rate"] - expected_conversion_rate) < 0.01
        
        # Verify summary calculations
        summary = data["data"]["summary"]
        expected_total_sessions = sum(row['daily_sessions'] for row in sample_daily_metrics_data)
        assert summary["total_sessions"] == expected_total_sessions

    @patch('app.core.database.get_warehouse_db')
    def test_traffic_sources_metrics_calculation(self, mock_db, sample_traffic_sources_data):
        """Test traffic sources metrics calculations"""
        mock_session = MagicMock()
        mock_db.return_value = mock_session
        
        # Mock results
        mock_empty_result = MagicMock()
        mock_empty_result.fetchall.return_value = []
        
        mock_sources_result = MagicMock()
        mock_sources_result.fetchall.return_value = [MagicMock(**row) for row in sample_traffic_sources_data]
        
        mock_session.execute.side_effect = [
            mock_empty_result,
            mock_sources_result,
            mock_empty_result,
            mock_empty_result
        ]
        
        response = client.get("/analytics/traffic")
        assert response.status_code == 200
        
        data = response.json()
        traffic_sources = data["data"]["traffic_sources"]
        
        # Test calculations for first source (organic)
        organic_source = traffic_sources[0]
        organic_metrics = organic_source["metrics"]
        
        # Verify bounce rate: 180 bounces / 650 sessions * 100 = 27.69%
        expected_bounce_rate = (180 / 650) * 100
        assert abs(organic_metrics["bounce_rate"] - expected_bounce_rate) < 0.01
        
        # Verify conversion rate: 45 conversions / 650 sessions * 100 = 6.92%
        expected_conversion_rate = (45 / 650) * 100
        assert abs(organic_metrics["conversion_rate"] - expected_conversion_rate) < 0.01

    @patch('app.core.database.get_warehouse_db')
    def test_geographic_distribution_filtering(self, mock_db, sample_geographic_data):
        """Test that geographic distribution respects minimum traffic threshold"""
        mock_session = MagicMock()
        mock_db.return_value = mock_session
        
        # Mock results with one location having low traffic (should be filtered out)
        low_traffic_location = {
            'country_code': 'XX',
            'country_name': 'Low Traffic Country',
            'region': 'Region',
            'city': 'City',
            'sessions': 3,  # Below the 5 session threshold
            'unique_visitors': 3,
            'avg_duration': 100.0,
            'bounces': 1,
            'conversions': 0,
            'revenue': 0.0
        }
        
        geo_data_with_low_traffic = sample_geographic_data + [low_traffic_location]
        
        # Mock empty results for first three queries
        mock_empty_result = MagicMock()
        mock_empty_result.fetchall.return_value = []
        
        mock_geo_result = MagicMock()
        mock_geo_result.fetchall.return_value = [MagicMock(**row) for row in geo_data_with_low_traffic]
        
        mock_session.execute.side_effect = [
            mock_empty_result,
            mock_empty_result,
            mock_empty_result,
            mock_geo_result
        ]
        
        response = client.get("/analytics/traffic?include_geo=true")
        assert response.status_code == 200
        
        data = response.json()
        geographic_distribution = data["data"]["geographic_distribution"]
        
        # Should only include locations with >= 5 sessions
        assert len(geographic_distribution) == 2  # Excludes the low traffic location
        
        # Verify structure of geographic data
        first_location = geographic_distribution[0]
        assert "location" in first_location
        assert "metrics" in first_location
        
        location_info = first_location["location"]
        assert "country_code" in location_info
        assert "country_name" in location_info
        assert "region" in location_info
        assert "city" in location_info

    @patch('app.core.database.get_warehouse_db')
    def test_traffic_analytics_database_error(self, mock_db):
        """Test traffic analytics with database error"""
        # Mock database session to raise an exception
        mock_session = MagicMock()
        mock_session.execute.side_effect = Exception("Database connection failed")
        mock_db.return_value = mock_session
        
        # Make request
        response = client.get("/analytics/traffic")
        
        # Should return 500 error
        assert response.status_code == 500
        data = response.json()
        assert "detail" in data
        assert "Failed to retrieve traffic analytics" in data["detail"]

    def test_traffic_analytics_response_structure_validation(self):
        """Test that the response structure is valid for frontend consumption"""
        with patch('app.core.database.get_warehouse_db') as mock_db:
            mock_session = MagicMock()
            mock_db.return_value = mock_session
            
            # Mock empty results
            mock_result = MagicMock()
            mock_result.fetchall.return_value = []
            mock_session.execute.return_value = mock_result
            
            response = client.get("/analytics/traffic")
            assert response.status_code == 200
            
            data = response.json()
            
            # Verify required top-level keys
            required_keys = ["success", "data", "filters_applied", "date_range", "generated_at"]
            for key in required_keys:
                assert key in data
            
            # Verify data structure
            traffic_data = data["data"]
            required_data_keys = [
                "daily_metrics", "traffic_sources", "device_analytics", 
                "geographic_distribution", "summary"
            ]
            for key in required_data_keys:
                assert key in traffic_data
            
            # Verify filters structure
            filters = data["filters_applied"]
            expected_filter_keys = ["days", "source", "device_type", "country_code", "include_geo"]
            for key in expected_filter_keys:
                assert key in filters
            
            # Verify summary structure
            summary = traffic_data["summary"]
            summary_keys = [
                "total_sessions", "total_unique_visitors", "total_page_views",
                "avg_session_duration_seconds", "avg_bounce_rate", "date_range_days"
            ]
            for key in summary_keys:
                assert key in summary