"""
Tests for Conversion Analytics API Endpoints
"""

import pytest
import json
from fastapi.testclient import TestClient
from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import patch, MagicMock

from main import app

client = TestClient(app)


class TestConversionAnalytics:
    """Test suite for conversion analytics endpoints"""

    @pytest.fixture
    def sample_funnel_data(self):
        """Sample conversion funnel data for testing"""
        return [
            {
                'channel': 'organic',
                'funnel_step': 'landing',
                'step_order': 1,
                'step_sessions': 1000,
                'step_users': 850,
                'step_conversions': 0,
                'step_revenue': 0.0,
                'channel_entry_sessions': 1000,
                'channel_conversions': 45,
                'conversion_rate_from_entry': 4.5,
                'step_conversion_rate': 0.0
            },
            {
                'channel': 'organic',
                'funnel_step': 'product_view',
                'step_order': 2,
                'step_sessions': 650,
                'step_users': 580,
                'step_conversions': 0,
                'step_revenue': 0.0,
                'channel_entry_sessions': 1000,
                'channel_conversions': 45,
                'conversion_rate_from_entry': 4.5,
                'step_conversion_rate': 0.0
            },
            {
                'channel': 'organic',
                'funnel_step': 'add_to_cart',
                'step_order': 3,
                'step_sessions': 180,
                'step_users': 165,
                'step_conversions': 0,
                'step_revenue': 0.0,
                'channel_entry_sessions': 1000,
                'channel_conversions': 45,
                'conversion_rate_from_entry': 4.5,
                'step_conversion_rate': 0.0
            },
            {
                'channel': 'organic',
                'funnel_step': 'purchase',
                'step_order': 4,
                'step_sessions': 45,
                'step_users': 45,
                'step_conversions': 45,
                'step_revenue': 2250.0,
                'channel_entry_sessions': 1000,
                'channel_conversions': 45,
                'conversion_rate_from_entry': 4.5,
                'step_conversion_rate': 100.0
            }
        ]

    @pytest.fixture
    def sample_dropoff_data(self):
        """Sample drop-off analysis data for testing"""
        return [
            {
                'channel': 'organic',
                'from_step': 'landing',
                'from_order': 1,
                'to_step': 'product_view',
                'to_order': 2,
                'users_at_from_step': 850,
                'users_continued_to_next': 580,
                'users_dropped_off': 270,
                'drop_off_rate': 31.76,
                'continuation_rate': 68.24
            },
            {
                'channel': 'organic',
                'from_step': 'product_view',
                'from_order': 2,
                'to_step': 'add_to_cart',
                'to_order': 3,
                'users_at_from_step': 580,
                'users_continued_to_next': 165,
                'users_dropped_off': 415,
                'drop_off_rate': 71.55,
                'continuation_rate': 28.45
            }
        ]

    @pytest.fixture
    def sample_assisted_conversions_data(self):
        """Sample assisted conversions data for testing"""
        return [
            {
                'converting_channel': 'organic',
                'total_conversions': 45,
                'assisted_conversions': 28,
                'direct_conversions': 17,
                'total_conversion_value': 2250.0,
                'assisted_conversion_value': 1400.0,
                'avg_touchpoints_per_conversion': 2.8
            },
            {
                'converting_channel': 'paid',
                'total_conversions': 25,
                'assisted_conversions': 20,
                'direct_conversions': 5,
                'total_conversion_value': 1500.0,
                'assisted_conversion_value': 1200.0,
                'avg_touchpoints_per_conversion': 3.2
            }
        ]

    @pytest.fixture
    def sample_device_conversion_data(self):
        """Sample device conversion data for testing"""
        return [
            {
                'device_type': 'desktop',
                'browser_name': 'Chrome',
                'operating_system': 'Windows',
                'total_sessions': 600,
                'unique_users': 480,
                'conversions': 35,
                'conversion_value': 1750.0,
                'avg_time_to_conversion': 25.5
            },
            {
                'device_type': 'mobile',
                'browser_name': 'Safari',
                'operating_system': 'iOS',
                'total_sessions': 400,
                'unique_users': 380,
                'conversions': 20,
                'conversion_value': 1000.0,
                'avg_time_to_conversion': 18.2
            }
        ]

    @pytest.fixture
    def sample_channel_summary_data(self):
        """Sample channel performance summary data for testing"""
        return [
            {
                'channel': 'organic',
                'channel_sessions': 1000,
                'channel_users': 850,
                'channel_conversions': 45,
                'channel_revenue': 2250.0,
                'avg_conversion_value': 50.0
            },
            {
                'channel': 'paid',
                'channel_sessions': 500,
                'channel_users': 450,
                'channel_conversions': 25,
                'channel_revenue': 1500.0,
                'avg_conversion_value': 60.0
            }
        ]

    @patch('app.core.database.get_warehouse_db')
    def test_get_conversion_analytics_success(self, mock_db, sample_funnel_data, sample_dropoff_data,
                                            sample_assisted_conversions_data, sample_device_conversion_data,
                                            sample_channel_summary_data):
        """Test successful conversion analytics retrieval"""
        # Mock database session
        mock_session = MagicMock()
        mock_db.return_value = mock_session
        
        # Mock query results in order
        mock_funnel_result = MagicMock()
        mock_funnel_result.fetchall.return_value = [MagicMock(**row) for row in sample_funnel_data]
        
        mock_dropoff_result = MagicMock()
        mock_dropoff_result.fetchall.return_value = [MagicMock(**row) for row in sample_dropoff_data]
        
        mock_assisted_result = MagicMock()
        mock_assisted_result.fetchall.return_value = [MagicMock(**row) for row in sample_assisted_conversions_data]
        
        mock_device_result = MagicMock()
        mock_device_result.fetchall.return_value = [MagicMock(**row) for row in sample_device_conversion_data]
        
        mock_channel_result = MagicMock()
        mock_channel_result.fetchall.return_value = [MagicMock(**row) for row in sample_channel_summary_data]
        
        # Configure session.execute to return appropriate results in order
        mock_session.execute.side_effect = [
            mock_funnel_result,
            mock_dropoff_result,
            mock_assisted_result,
            mock_device_result,
            mock_channel_result
        ]
        
        # Make request
        response = client.get("/analytics/conversion?days=30")
        
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
        
        # Check conversion analytics structure
        conversion_data = data["data"]
        assert "funnel_analysis" in conversion_data
        assert "drop_off_rates" in conversion_data
        assert "assisted_conversions" in conversion_data
        assert "device_conversion" in conversion_data
        assert "channel_performance" in conversion_data
        assert "summary" in conversion_data
        
        # Validate funnel analysis structure
        funnel_analysis = conversion_data["funnel_analysis"]
        assert len(funnel_analysis) == 1  # One channel (organic)
        
        organic_funnel = funnel_analysis[0]
        assert "channel" in organic_funnel
        assert "total_entry_sessions" in organic_funnel
        assert "total_conversions" in organic_funnel
        assert "overall_conversion_rate" in organic_funnel
        assert "steps" in organic_funnel
        
        # Validate funnel steps
        steps = organic_funnel["steps"]
        assert len(steps) == 4  # 4 funnel steps
        
        first_step = steps[0]
        assert "step_name" in first_step
        assert "step_order" in first_step
        assert "sessions" in first_step
        assert "users" in first_step
        assert "conversions" in first_step
        assert "revenue" in first_step
        assert "step_conversion_rate" in first_step
        assert "conversion_rate_from_entry" in first_step
        
        # Validate drop-off rates
        drop_off_rates = conversion_data["drop_off_rates"]
        assert len(drop_off_rates) == 2
        
        first_dropoff = drop_off_rates[0]
        assert "channel" in first_dropoff
        assert "from_step" in first_dropoff
        assert "to_step" in first_dropoff
        assert "users_at_step" in first_dropoff
        assert "users_continued" in first_dropoff
        assert "users_dropped" in first_dropoff
        assert "drop_off_rate" in first_dropoff
        assert "continuation_rate" in first_dropoff
        
        # Validate assisted conversions
        assisted_conversions = conversion_data["assisted_conversions"]
        assert len(assisted_conversions) == 2
        
        first_assisted = assisted_conversions[0]
        assert "channel" in first_assisted
        assert "total_conversions" in first_assisted
        assert "assisted_conversions" in first_assisted
        assert "direct_conversions" in first_assisted
        assert "assisted_rate" in first_assisted
        assert "total_value" in first_assisted
        assert "assisted_value" in first_assisted
        assert "avg_touchpoints" in first_assisted

    def test_get_conversion_analytics_with_filters(self):
        """Test conversion analytics with various filters"""
        with patch('app.core.database.get_warehouse_db') as mock_db:
            mock_session = MagicMock()
            mock_db.return_value = mock_session
            
            # Mock empty results for simplicity
            mock_result = MagicMock()
            mock_result.fetchall.return_value = []
            mock_session.execute.return_value = mock_result
            
            # Test with channel filter
            response = client.get("/analytics/conversion?channel=organic")
            assert response.status_code == 200
            
            # Test with device_type filter
            response = client.get("/analytics/conversion?device_type=mobile")
            assert response.status_code == 200
            
            # Test with funnel_step filter
            response = client.get("/analytics/conversion?funnel_step=add_to_cart")
            assert response.status_code == 200

    def test_get_conversion_analytics_invalid_params(self):
        """Test conversion analytics with invalid parameters"""
        # Test with invalid days (too low)
        response = client.get("/analytics/conversion?days=0")
        assert response.status_code == 422
        
        # Test with invalid days (too high)
        response = client.get("/analytics/conversion?days=400")
        assert response.status_code == 422

    @patch('app.core.database.get_warehouse_db')
    def test_funnel_analysis_organization(self, mock_db, sample_funnel_data):
        """Test that funnel data is correctly organized by channel"""
        mock_session = MagicMock()
        mock_db.return_value = mock_session
        
        # Mock funnel result
        mock_funnel_result = MagicMock()
        mock_funnel_result.fetchall.return_value = [MagicMock(**row) for row in sample_funnel_data]
        
        # Mock empty results for other queries
        mock_empty_result = MagicMock()
        mock_empty_result.fetchall.return_value = []
        
        mock_session.execute.side_effect = [
            mock_funnel_result,
            mock_empty_result,
            mock_empty_result,
            mock_empty_result,
            mock_empty_result
        ]
        
        response = client.get("/analytics/conversion")
        assert response.status_code == 200
        
        data = response.json()
        funnel_analysis = data["data"]["funnel_analysis"]
        
        # Should have one channel (organic)
        assert len(funnel_analysis) == 1
        
        organic_channel = funnel_analysis[0]
        assert organic_channel["channel"] == "organic"
        assert organic_channel["total_entry_sessions"] == 1000
        assert organic_channel["total_conversions"] == 45
        assert organic_channel["overall_conversion_rate"] == 4.5
        
        # Should have 4 steps in correct order
        steps = organic_channel["steps"]
        assert len(steps) == 4
        
        step_names = [step["step_name"] for step in steps]
        expected_steps = ["landing", "product_view", "add_to_cart", "purchase"]
        assert step_names == expected_steps
        
        # Verify step order
        for i, step in enumerate(steps):
            assert step["step_order"] == i + 1

    @patch('app.core.database.get_warehouse_db')
    def test_assisted_conversions_rate_calculation(self, mock_db, sample_assisted_conversions_data):
        """Test assisted conversion rate calculations"""
        mock_session = MagicMock()
        mock_db.return_value = mock_session
        
        # Mock empty results for most queries
        mock_empty_result = MagicMock()
        mock_empty_result.fetchall.return_value = []
        
        # Mock assisted conversions result
        mock_assisted_result = MagicMock()
        mock_assisted_result.fetchall.return_value = [MagicMock(**row) for row in sample_assisted_conversions_data]
        
        mock_session.execute.side_effect = [
            mock_empty_result,  # funnel
            mock_empty_result,  # dropoff
            mock_assisted_result,  # assisted conversions
            mock_empty_result,  # device
            mock_empty_result   # channel summary
        ]
        
        response = client.get("/analytics/conversion")
        assert response.status_code == 200
        
        data = response.json()
        assisted_conversions = data["data"]["assisted_conversions"]
        
        # Test organic channel calculations
        organic_assisted = assisted_conversions[0]
        assert organic_assisted["channel"] == "organic"
        assert organic_assisted["total_conversions"] == 45
        assert organic_assisted["assisted_conversions"] == 28
        assert organic_assisted["direct_conversions"] == 17
        
        # Verify assisted rate calculation: (28/45) * 100 = 62.22%
        expected_assisted_rate = (28 / 45) * 100
        assert abs(organic_assisted["assisted_rate"] - expected_assisted_rate) < 0.01
        
        # Test paid channel calculations
        paid_assisted = assisted_conversions[1]
        assert paid_assisted["channel"] == "paid"
        
        # Verify assisted rate calculation: (20/25) * 100 = 80%
        expected_paid_assisted_rate = (20 / 25) * 100
        assert abs(paid_assisted["assisted_rate"] - expected_paid_assisted_rate) < 0.01

    @patch('app.core.database.get_warehouse_db')
    def test_device_conversion_rate_calculation(self, mock_db, sample_device_conversion_data):
        """Test device conversion rate calculations"""
        mock_session = MagicMock()
        mock_db.return_value = mock_session
        
        # Mock empty results for most queries
        mock_empty_result = MagicMock()
        mock_empty_result.fetchall.return_value = []
        
        # Mock device conversion result
        mock_device_result = MagicMock()
        mock_device_result.fetchall.return_value = [MagicMock(**row) for row in sample_device_conversion_data]
        
        mock_session.execute.side_effect = [
            mock_empty_result,  # funnel
            mock_empty_result,  # dropoff
            mock_empty_result,  # assisted conversions
            mock_device_result,  # device conversion
            mock_empty_result   # channel summary
        ]
        
        response = client.get("/analytics/conversion")
        assert response.status_code == 200
        
        data = response.json()
        device_conversion = data["data"]["device_conversion"]
        
        # Test desktop conversion rate
        desktop_device = device_conversion[0]
        assert desktop_device["device_type"] == "desktop"
        assert desktop_device["sessions"] == 600
        assert desktop_device["conversions"] == 35
        
        # Verify conversion rate calculation: (35/600) * 100 = 5.83%
        expected_desktop_rate = (35 / 600) * 100
        assert abs(desktop_device["conversion_rate"] - expected_desktop_rate) < 0.01
        
        # Test mobile conversion rate
        mobile_device = device_conversion[1]
        assert mobile_device["device_type"] == "mobile"
        
        # Verify conversion rate calculation: (20/400) * 100 = 5%
        expected_mobile_rate = (20 / 400) * 100
        assert abs(mobile_device["conversion_rate"] - expected_mobile_rate) < 0.01

    @patch('app.core.database.get_warehouse_db')
    def test_conversion_summary_calculations(self, mock_db, sample_channel_summary_data):
        """Test conversion summary calculations"""
        mock_session = MagicMock()
        mock_db.return_value = mock_session
        
        # Mock empty results for most queries
        mock_empty_result = MagicMock()
        mock_empty_result.fetchall.return_value = []
        
        # Mock channel summary result
        mock_channel_result = MagicMock()
        mock_channel_result.fetchall.return_value = [MagicMock(**row) for row in sample_channel_summary_data]
        
        mock_session.execute.side_effect = [
            mock_empty_result,  # funnel
            mock_empty_result,  # dropoff
            mock_empty_result,  # assisted conversions
            mock_empty_result,  # device conversion
            mock_channel_result   # channel summary
        ]
        
        response = client.get("/analytics/conversion")
        assert response.status_code == 200
        
        data = response.json()
        summary = data["data"]["summary"]
        
        # Verify summary calculations
        expected_total_sessions = 1000 + 500  # organic + paid sessions
        expected_total_conversions = 45 + 25  # organic + paid conversions
        expected_total_revenue = 2250.0 + 1500.0  # organic + paid revenue
        expected_overall_conversion_rate = (70 / 1500) * 100  # total conversions / total sessions * 100
        expected_avg_conversion_value = 3750.0 / 70  # total revenue / total conversions
        
        assert summary["total_sessions"] == expected_total_sessions
        assert summary["total_conversions"] == expected_total_conversions
        assert abs(summary["total_revenue"] - expected_total_revenue) < 0.01
        assert abs(summary["overall_conversion_rate"] - expected_overall_conversion_rate) < 0.01
        assert abs(summary["avg_conversion_value"] - expected_avg_conversion_value) < 0.01

    @patch('app.core.database.get_warehouse_db')
    def test_conversion_analytics_database_error(self, mock_db):
        """Test conversion analytics with database error"""
        # Mock database session to raise an exception
        mock_session = MagicMock()
        mock_session.execute.side_effect = Exception("Database connection failed")
        mock_db.return_value = mock_session
        
        # Make request
        response = client.get("/analytics/conversion")
        
        # Should return 500 error
        assert response.status_code == 500
        data = response.json()
        assert "detail" in data
        assert "Failed to retrieve conversion analytics" in data["detail"]

    def test_conversion_analytics_response_structure_validation(self):
        """Test that the response structure is valid for frontend consumption"""
        with patch('app.core.database.get_warehouse_db') as mock_db:
            mock_session = MagicMock()
            mock_db.return_value = mock_session
            
            # Mock empty results
            mock_result = MagicMock()
            mock_result.fetchall.return_value = []
            mock_session.execute.return_value = mock_result
            
            response = client.get("/analytics/conversion")
            assert response.status_code == 200
            
            data = response.json()
            
            # Verify required top-level keys
            required_keys = ["success", "data", "filters_applied", "date_range", "generated_at"]
            for key in required_keys:
                assert key in data
            
            # Verify data structure
            conversion_data = data["data"]
            required_data_keys = [
                "funnel_analysis", "drop_off_rates", "assisted_conversions", 
                "device_conversion", "channel_performance", "summary"
            ]
            for key in required_data_keys:
                assert key in conversion_data
            
            # Verify filters structure
            filters = data["filters_applied"]
            expected_filter_keys = ["days", "channel", "device_type", "funnel_step"]
            for key in expected_filter_keys:
                assert key in filters