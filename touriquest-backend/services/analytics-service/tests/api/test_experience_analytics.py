"""
Tests for Experience Analytics API Endpoints
"""

import pytest
import json
from fastapi.testclient import TestClient
from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import patch, MagicMock

from main import app

client = TestClient(app)


class TestExperienceAnalytics:
    """Test suite for experience analytics endpoints"""

    @pytest.fixture
    def sample_experience_data(self):
        """Sample experience data for testing"""
        return [
            {
                'experience_id': '550e8400-e29b-41d4-a716-446655440001',
                'name': 'NYC Food Tour',
                'category': 'food_tour',
                'provider_id': '550e8400-e29b-41d4-a716-446655440101',
                'base_price': 89.99,
                'duration_hours': 3.0,
                'max_participants': 12,
                'total_bookings': 45,
                'unique_customers': 40,
                'recent_bookings': 8,
                'confirmed_bookings': 42,
                'cancelled_bookings': 3,
                'total_revenue': 3779.58,
                'avg_booking_value': 84.0,
                'avg_confirmed_value': 89.99,
                'average_rating': 4.6,
                'total_ratings': 38,
                'positive_ratings': 35,
                'avg_service_rating': 4.5,
                'avg_value_rating': 4.3,
                'reviews_count': 32,
                'repeat_customers': 5,
                'avg_bookings_per_customer': 1.125,
                'confirmation_rate': 93.33,
                'repeat_rate': 12.5,
                'satisfaction_rate': 92.11
            },
            {
                'experience_id': '550e8400-e29b-41d4-a716-446655440002',
                'name': 'Central Park Photography Workshop',
                'category': 'workshop',
                'provider_id': '550e8400-e29b-41d4-a716-446655440102',
                'base_price': 125.00,
                'duration_hours': 2.5,
                'max_participants': 8,
                'total_bookings': 28,
                'unique_customers': 26,
                'recent_bookings': 4,
                'confirmed_bookings': 25,
                'cancelled_bookings': 3,
                'total_revenue': 3125.00,
                'avg_booking_value': 111.61,
                'avg_confirmed_value': 125.00,
                'average_rating': 4.8,
                'total_ratings': 22,
                'positive_ratings': 21,
                'avg_service_rating': 4.7,
                'avg_value_rating': 4.6,
                'reviews_count': 19,
                'repeat_customers': 2,
                'avg_bookings_per_customer': 1.077,
                'confirmation_rate': 89.29,
                'repeat_rate': 7.69,
                'satisfaction_rate': 95.45
            }
        ]

    @pytest.fixture
    def sample_adoption_trends_data(self):
        """Sample adoption trends data for testing"""
        return [
            {
                'booking_date': date.today() - timedelta(days=1),
                'daily_bookings': 5,
                'experiences_booked': 3,
                'unique_customers': 5,
                'daily_revenue': 450.0,
                'avg_booking_value': 90.0
            },
            {
                'booking_date': date.today() - timedelta(days=2),
                'daily_bookings': 7,
                'experiences_booked': 4,
                'unique_customers': 6,
                'daily_revenue': 630.0,
                'avg_booking_value': 90.0
            }
        ]

    @pytest.fixture
    def sample_category_data(self):
        """Sample category performance data for testing"""
        return [
            {
                'category': 'food_tour',
                'experiences_count': 5,
                'total_bookings': 45,
                'category_revenue': 3779.58,
                'avg_category_rating': 4.6
            },
            {
                'category': 'workshop',
                'experiences_count': 3,
                'total_bookings': 28,
                'category_revenue': 3125.00,
                'avg_category_rating': 4.8
            }
        ]

    @patch('app.core.database.get_warehouse_db')
    def test_get_experience_analytics_success(self, mock_db, sample_experience_data, 
                                            sample_adoption_trends_data, sample_category_data):
        """Test successful experience analytics retrieval"""
        # Mock database session
        mock_session = MagicMock()
        mock_db.return_value = mock_session
        
        # Mock query results
        mock_experience_result = MagicMock()
        mock_experience_result.fetchall.return_value = [MagicMock(**row) for row in sample_experience_data]
        
        mock_trends_result = MagicMock()
        mock_trends_result.fetchall.return_value = [MagicMock(**row) for row in sample_adoption_trends_data]
        
        mock_category_result = MagicMock()
        mock_category_result.fetchall.return_value = [MagicMock(**row) for row in sample_category_data]
        
        # Configure session.execute to return appropriate results in order
        mock_session.execute.side_effect = [
            mock_experience_result, 
            mock_trends_result, 
            mock_category_result
        ]
        
        # Make request
        response = client.get("/analytics/experiences?days=30")
        
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
        
        # Check experience analytics structure
        experience_data = data["data"]
        assert "experiences" in experience_data
        assert "summary" in experience_data
        assert "adoption_trends" in experience_data
        assert "category_performance" in experience_data
        
        # Validate experiences structure
        experiences = experience_data["experiences"]
        assert len(experiences) == 2
        
        first_experience = experiences[0]
        expected_keys = [
            "experience_id", "name", "category", "provider_id", "pricing", 
            "details", "adoption", "satisfaction", "repeat_booking", "revenue"
        ]
        for key in expected_keys:
            assert key in first_experience, f"Missing key: {key}"
        
        # Validate pricing structure
        pricing = first_experience["pricing"]
        assert "base_price" in pricing
        assert "avg_booking_value" in pricing
        assert "avg_confirmed_value" in pricing
        
        # Validate adoption metrics
        adoption = first_experience["adoption"]
        assert "total_bookings" in adoption
        assert "unique_customers" in adoption
        assert "confirmation_rate" in adoption
        
        # Validate satisfaction metrics
        satisfaction = first_experience["satisfaction"]
        assert "average_rating" in satisfaction
        assert "satisfaction_rate" in satisfaction
        assert "service_rating" in satisfaction
        assert "value_rating" in satisfaction
        
        # Validate repeat booking metrics
        repeat_booking = first_experience["repeat_booking"]
        assert "repeat_customers" in repeat_booking
        assert "repeat_rate" in repeat_booking
        assert "avg_bookings_per_customer" in repeat_booking
        
        # Validate summary calculations
        summary = experience_data["summary"]
        expected_total_bookings = sum(exp['total_bookings'] for exp in sample_experience_data)
        assert summary["total_bookings"] == expected_total_bookings
        
        expected_total_revenue = sum(exp['total_revenue'] for exp in sample_experience_data)
        assert summary["total_revenue"] == expected_total_revenue

    def test_get_experience_analytics_with_filters(self):
        """Test experience analytics with various filters"""
        with patch('app.core.database.get_warehouse_db') as mock_db:
            mock_session = MagicMock()
            mock_db.return_value = mock_session
            
            # Mock empty results for simplicity
            mock_result = MagicMock()
            mock_result.fetchall.return_value = []
            mock_session.execute.return_value = mock_result
            
            # Test with experience ID filter
            response = client.get("/analytics/experiences?experience_id=550e8400-e29b-41d4-a716-446655440001")
            assert response.status_code == 200
            
            # Test with category filter
            response = client.get("/analytics/experiences?category=food_tour")
            assert response.status_code == 200
            
            # Test with provider filter
            response = client.get("/analytics/experiences?provider_id=550e8400-e29b-41d4-a716-446655440101")
            assert response.status_code == 200
            
            # Test with minimum rating filter
            response = client.get("/analytics/experiences?min_rating=4.5")
            assert response.status_code == 200

    def test_get_experience_analytics_invalid_params(self):
        """Test experience analytics with invalid parameters"""
        # Test with invalid days
        response = client.get("/analytics/experiences?days=0")
        assert response.status_code == 422
        
        # Test with invalid min_rating
        response = client.get("/analytics/experiences?min_rating=6.0")
        assert response.status_code == 422

    @patch('app.core.database.get_warehouse_db')
    def test_experience_analytics_aggregation_accuracy(self, mock_db, sample_experience_data):
        """Test that aggregation calculations are accurate"""
        mock_session = MagicMock()
        mock_db.return_value = mock_session
        
        # Mock results
        mock_experience_result = MagicMock()
        mock_experience_result.fetchall.return_value = [MagicMock(**row) for row in sample_experience_data]
        
        # Mock empty results for other queries
        mock_empty_result = MagicMock()
        mock_empty_result.fetchall.return_value = []
        
        mock_session.execute.side_effect = [
            mock_experience_result,
            mock_empty_result,
            mock_empty_result
        ]
        
        response = client.get("/analytics/experiences")
        assert response.status_code == 200
        
        data = response.json()
        summary = data["data"]["summary"]
        
        # Verify aggregation calculations
        expected_total_experiences = len(sample_experience_data)
        expected_total_bookings = sum(exp['total_bookings'] for exp in sample_experience_data)
        expected_total_customers = sum(exp['unique_customers'] for exp in sample_experience_data)
        expected_total_revenue = sum(exp['total_revenue'] for exp in sample_experience_data)
        
        assert summary["total_experiences"] == expected_total_experiences
        assert summary["total_bookings"] == expected_total_bookings
        assert summary["total_customers"] == expected_total_customers
        assert abs(summary["total_revenue"] - expected_total_revenue) < 0.01

    @patch('app.core.database.get_warehouse_db')
    def test_experience_metrics_calculation_logic(self, mock_db):
        """Test the business logic for calculating experience metrics"""
        mock_session = MagicMock()
        mock_db.return_value = mock_session
        
        # Create specific test data to verify calculations
        test_experience = {
            'experience_id': 'test-id',
            'name': 'Test Experience',
            'category': 'test',
            'provider_id': 'test-provider',
            'base_price': 100.0,
            'duration_hours': 2.0,
            'max_participants': 10,
            'total_bookings': 50,
            'unique_customers': 45,
            'recent_bookings': 10,
            'confirmed_bookings': 48,
            'cancelled_bookings': 2,
            'total_revenue': 4800.0,
            'avg_booking_value': 96.0,
            'avg_confirmed_value': 100.0,
            'average_rating': 4.5,
            'total_ratings': 40,
            'positive_ratings': 36,
            'avg_service_rating': 4.4,
            'avg_value_rating': 4.3,
            'reviews_count': 35,
            'repeat_customers': 8,
            'avg_bookings_per_customer': 1.11,
            'confirmation_rate': 96.0,  # 48/50 * 100
            'repeat_rate': 17.78,       # 8/45 * 100  
            'satisfaction_rate': 90.0   # 36/40 * 100
        }
        
        mock_result = MagicMock()
        mock_result.fetchall.return_value = [MagicMock(**test_experience)]
        
        # Mock empty results for other queries
        mock_empty_result = MagicMock()
        mock_empty_result.fetchall.return_value = []
        
        mock_session.execute.side_effect = [
            mock_result,
            mock_empty_result,
            mock_empty_result
        ]
        
        response = client.get("/analytics/experiences")
        assert response.status_code == 200
        
        data = response.json()
        experience = data["data"]["experiences"][0]
        
        # Verify calculated metrics are correctly included
        assert experience["adoption"]["confirmation_rate"] == 96.0
        assert experience["repeat_booking"]["repeat_rate"] == 17.78
        assert experience["satisfaction"]["satisfaction_rate"] == 90.0
        
        # Verify revenue calculations
        assert experience["revenue"]["total_revenue"] == 4800.0
        assert experience["pricing"]["avg_booking_value"] == 96.0

    @patch('app.core.database.get_warehouse_db')
    def test_experience_analytics_database_error(self, mock_db):
        """Test experience analytics with database error"""
        # Mock database session to raise an exception
        mock_session = MagicMock()
        mock_session.execute.side_effect = Exception("Database connection failed")
        mock_db.return_value = mock_session
        
        # Make request
        response = client.get("/analytics/experiences")
        
        # Should return 500 error
        assert response.status_code == 500
        data = response.json()
        assert "detail" in data
        assert "Failed to retrieve experience analytics" in data["detail"]

    def test_experience_analytics_response_format_for_frontend(self):
        """Test that the response format matches frontend expectations"""
        with patch('app.core.database.get_warehouse_db') as mock_db:
            mock_session = MagicMock()
            mock_db.return_value = mock_session
            
            # Mock minimal valid data
            mock_result = MagicMock()
            mock_result.fetchall.return_value = []
            mock_session.execute.return_value = mock_result
            
            response = client.get("/analytics/experiences")
            assert response.status_code == 200
            
            data = response.json()
            
            # Verify required top-level keys
            required_keys = ["success", "data", "filters_applied", "date_range", "generated_at"]
            for key in required_keys:
                assert key in data
            
            # Verify data structure
            experience_data = data["data"]
            required_data_keys = ["experiences", "summary", "adoption_trends", "category_performance"]
            for key in required_data_keys:
                assert key in experience_data
            
            # Verify filters structure
            filters = data["filters_applied"]
            expected_filter_keys = ["days", "experience_id", "category", "provider_id", "min_rating"]
            for key in expected_filter_keys:
                assert key in filters