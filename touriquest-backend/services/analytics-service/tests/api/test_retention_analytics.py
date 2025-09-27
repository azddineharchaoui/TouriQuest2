"""
Tests for Retention Analytics API Endpoints
"""

import pytest
import json
from fastapi.testclient import TestClient
from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import patch, MagicMock

from main import app

client = TestClient(app)


class TestRetentionAnalytics:
    """Test suite for retention analytics endpoints"""

    @pytest.fixture
    def sample_cohort_data(self):
        """Sample cohort analysis data for testing"""
        return [
            {
                'cohort_period': date.today() - timedelta(days=28),  # 4 weeks ago
                'user_segment': 'premium',
                'acquisition_channel': 'organic',
                'period_number': 0,
                'cohort_size': 100,
                'retained_users': 100,
                'retention_rate': 100.0
            },
            {
                'cohort_period': date.today() - timedelta(days=28),
                'user_segment': 'premium',
                'acquisition_channel': 'organic',
                'period_number': 1,
                'cohort_size': 100,
                'retained_users': 75,
                'retention_rate': 75.0
            },
            {
                'cohort_period': date.today() - timedelta(days=28),
                'user_segment': 'premium',
                'acquisition_channel': 'organic',
                'period_number': 2,
                'cohort_size': 100,
                'retained_users': 55,
                'retention_rate': 55.0
            },
            {
                'cohort_period': date.today() - timedelta(days=21),  # 3 weeks ago
                'user_segment': 'premium',
                'acquisition_channel': 'organic',
                'period_number': 0,
                'cohort_size': 80,
                'retained_users': 80,
                'retention_rate': 100.0
            },
            {
                'cohort_period': date.today() - timedelta(days=21),
                'user_segment': 'premium',
                'acquisition_channel': 'organic',
                'period_number': 1,
                'cohort_size': 80,
                'retained_users': 65,
                'retention_rate': 81.25
            }
        ]

    @pytest.fixture
    def sample_lifecycle_data(self):
        """Sample lifecycle metrics data for testing"""
        return [
            {
                'user_segment': 'premium',
                'acquisition_channel': 'organic',
                'lifecycle_stage': 'active',
                'users_count': 450,
                'avg_lifetime_sessions': 15.5,
                'avg_lifetime_active_days': 25,
                'avg_lifetime_bookings': 3.2,
                'avg_lifetime_value': 480.0
            },
            {
                'user_segment': 'premium',
                'acquisition_channel': 'organic',
                'lifecycle_stage': 'at_risk',
                'users_count': 120,
                'avg_lifetime_sessions': 12.0,
                'avg_lifetime_active_days': 18,
                'avg_lifetime_bookings': 2.5,
                'avg_lifetime_value': 350.0
            },
            {
                'user_segment': 'premium',
                'acquisition_channel': 'organic',
                'lifecycle_stage': 'dormant',
                'users_count': 80,
                'avg_lifetime_sessions': 8.0,
                'avg_lifetime_active_days': 12,
                'avg_lifetime_bookings': 1.8,
                'avg_lifetime_value': 220.0
            },
            {
                'user_segment': 'premium',
                'acquisition_channel': 'organic',
                'lifecycle_stage': 'churned',
                'users_count': 200,
                'avg_lifetime_sessions': 5.5,
                'avg_lifetime_active_days': 8,
                'avg_lifetime_bookings': 1.2,
                'avg_lifetime_value': 150.0
            }
        ]

    @patch('app.core.database.get_warehouse_db')
    def test_get_retention_analytics_success_weekly(self, mock_db, sample_cohort_data, sample_lifecycle_data):
        """Test successful weekly retention analytics retrieval"""
        # Mock database session
        mock_session = MagicMock()
        mock_db.return_value = mock_session
        
        # Mock query results
        mock_cohort_result = MagicMock()
        mock_cohort_result.fetchall.return_value = [MagicMock(**row) for row in sample_cohort_data]
        
        mock_lifecycle_result = MagicMock()
        mock_lifecycle_result.fetchall.return_value = [MagicMock(**row) for row in sample_lifecycle_data]
        
        # Configure session.execute to return appropriate results in order
        mock_session.execute.side_effect = [
            mock_cohort_result,
            mock_lifecycle_result
        ]
        
        # Make request
        response = client.get("/analytics/retention?cohort_period=weekly&lookback_periods=12")
        
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
        
        # Check retention analytics structure
        retention_data = data["data"]
        assert "cohort_analysis" in retention_data
        assert "retention_curves" in retention_data
        assert "lifecycle_metrics" in retention_data
        assert "summary" in retention_data
        
        # Validate cohort analysis structure
        cohort_analysis = retention_data["cohort_analysis"]
        assert len(cohort_analysis) >= 1
        
        first_cohort = cohort_analysis[0]
        assert "cohort_period" in first_cohort
        assert "cohort_size" in first_cohort
        assert "user_segment" in first_cohort
        assert "acquisition_channel" in first_cohort
        assert "retention_by_period" in first_cohort
        
        # Validate retention by period structure
        retention_by_period = first_cohort["retention_by_period"]
        assert "period_0" in retention_by_period
        
        period_data = retention_by_period["period_0"]
        assert "period_number" in period_data
        assert "retained_users" in period_data
        assert "retention_rate" in period_data
        
        # Validate retention curves
        retention_curves = retention_data["retention_curves"]
        assert len(retention_curves) >= 1
        
        first_curve = retention_curves[0]
        assert "segment" in first_curve
        assert "user_segment" in first_curve
        assert "acquisition_channel" in first_curve
        assert "periods" in first_curve
        
        # Validate lifecycle metrics
        lifecycle_metrics = retention_data["lifecycle_metrics"]
        assert len(lifecycle_metrics) == 4  # active, at_risk, dormant, churned
        
        first_lifecycle = lifecycle_metrics[0]
        assert "user_segment" in first_lifecycle
        assert "acquisition_channel" in first_lifecycle
        assert "lifecycle_stage" in first_lifecycle
        assert "users_count" in first_lifecycle
        assert "percentage_of_segment" in first_lifecycle
        assert "avg_lifetime_sessions" in first_lifecycle
        assert "avg_lifetime_active_days" in first_lifecycle
        assert "avg_lifetime_bookings" in first_lifecycle
        assert "avg_lifetime_value" in first_lifecycle

    def test_get_retention_analytics_different_periods(self):
        """Test retention analytics with different cohort periods"""
        with patch('app.core.database.get_warehouse_db') as mock_db:
            mock_session = MagicMock()
            mock_db.return_value = mock_session
            
            # Mock empty results for simplicity
            mock_result = MagicMock()
            mock_result.fetchall.return_value = []
            mock_session.execute.return_value = mock_result
            
            # Test weekly cohorts
            response = client.get("/analytics/retention?cohort_period=weekly")
            assert response.status_code == 200
            
            # Test monthly cohorts
            response = client.get("/analytics/retention?cohort_period=monthly")
            assert response.status_code == 200
            
            # Test quarterly cohorts
            response = client.get("/analytics/retention?cohort_period=quarterly")
            assert response.status_code == 200

    def test_get_retention_analytics_with_filters(self):
        """Test retention analytics with user segment and channel filters"""
        with patch('app.core.database.get_warehouse_db') as mock_db:
            mock_session = MagicMock()
            mock_db.return_value = mock_session
            
            # Mock empty results
            mock_result = MagicMock()
            mock_result.fetchall.return_value = []
            mock_session.execute.return_value = mock_result
            
            # Test with user segment filter
            response = client.get("/analytics/retention?user_segment=premium")
            assert response.status_code == 200
            
            # Test with acquisition channel filter
            response = client.get("/analytics/retention?acquisition_channel=organic")
            assert response.status_code == 200
            
            # Test with both filters
            response = client.get("/analytics/retention?user_segment=premium&acquisition_channel=paid")
            assert response.status_code == 200

    def test_get_retention_analytics_invalid_params(self):
        """Test retention analytics with invalid parameters"""
        # Test with invalid cohort period
        response = client.get("/analytics/retention?cohort_period=invalid")
        assert response.status_code == 400
        
        # Test with invalid lookback periods (too low)
        response = client.get("/analytics/retention?lookback_periods=2")
        assert response.status_code == 422
        
        # Test with invalid lookback periods (too high)
        response = client.get("/analytics/retention?lookback_periods=100")
        assert response.status_code == 422

    @patch('app.core.database.get_warehouse_db')
    def test_cohort_analysis_organization(self, mock_db, sample_cohort_data):
        """Test that cohort data is correctly organized by cohort period"""
        mock_session = MagicMock()
        mock_db.return_value = mock_session
        
        # Mock cohort result
        mock_cohort_result = MagicMock()
        mock_cohort_result.fetchall.return_value = [MagicMock(**row) for row in sample_cohort_data]
        
        # Mock empty lifecycle result
        mock_lifecycle_result = MagicMock()
        mock_lifecycle_result.fetchall.return_value = []
        
        mock_session.execute.side_effect = [
            mock_cohort_result,
            mock_lifecycle_result
        ]
        
        response = client.get("/analytics/retention?cohort_period=weekly")
        assert response.status_code == 200
        
        data = response.json()
        cohort_analysis = data["data"]["cohort_analysis"]
        
        # Should have cohorts organized by period
        assert len(cohort_analysis) == 2  # Two different cohort periods
        
        # Verify cohort data structure and retention by period
        for cohort in cohort_analysis:
            assert "retention_by_period" in cohort
            retention_periods = cohort["retention_by_period"]
            
            # Each retention period should have correct structure
            for period_key, period_data in retention_periods.items():
                assert period_key.startswith("period_")
                assert "period_number" in period_data
                assert "retained_users" in period_data
                assert "retention_rate" in period_data
                assert isinstance(period_data["retention_rate"], float)

    @patch('app.core.database.get_warehouse_db')
    def test_retention_curves_calculation(self, mock_db, sample_cohort_data):
        """Test retention curves calculation logic"""
        mock_session = MagicMock()
        mock_db.return_value = mock_session
        
        # Mock cohort result
        mock_cohort_result = MagicMock()
        mock_cohort_result.fetchall.return_value = [MagicMock(**row) for row in sample_cohort_data]
        
        # Mock empty lifecycle result
        mock_lifecycle_result = MagicMock()
        mock_lifecycle_result.fetchall.return_value = []
        
        mock_session.execute.side_effect = [
            mock_cohort_result,
            mock_lifecycle_result
        ]
        
        response = client.get("/analytics/retention?cohort_period=weekly")
        assert response.status_code == 200
        
        data = response.json()
        retention_curves = data["data"]["retention_curves"]
        
        # Should have retention curves for the segment/channel combination
        assert len(retention_curves) >= 1
        
        curve = retention_curves[0]
        assert "segment" in curve
        assert "periods" in curve
        
        # Periods should be sorted by period number
        periods = curve["periods"]
        for i in range(len(periods) - 1):
            assert periods[i]["period_number"] <= periods[i + 1]["period_number"]
        
        # Each period should have retention rate
        for period in periods:
            assert "period_number" in period
            assert "retention_rate" in period
            assert "cohorts_count" in period
            assert 0 <= period["retention_rate"] <= 100

    @patch('app.core.database.get_warehouse_db')
    def test_lifecycle_metrics_percentage_calculation(self, mock_db, sample_lifecycle_data):
        """Test lifecycle metrics percentage calculations"""
        mock_session = MagicMock()
        mock_db.return_value = mock_session
        
        # Mock empty cohort result
        mock_cohort_result = MagicMock()
        mock_cohort_result.fetchall.return_value = []
        
        # Mock lifecycle result
        mock_lifecycle_result = MagicMock()
        mock_lifecycle_result.fetchall.return_value = [MagicMock(**row) for row in sample_lifecycle_data]
        
        mock_session.execute.side_effect = [
            mock_cohort_result,
            mock_lifecycle_result
        ]
        
        response = client.get("/analytics/retention")
        assert response.status_code == 200
        
        data = response.json()
        lifecycle_metrics = data["data"]["lifecycle_metrics"]
        
        # Calculate expected total users for the segment
        total_users = sum(metric['users_count'] for metric in sample_lifecycle_data)
        expected_total = 450 + 120 + 80 + 200  # 850 total users
        
        # Verify percentage calculations
        for metric in lifecycle_metrics:
            expected_percentage = (metric["users_count"] / expected_total) * 100
            assert abs(metric["percentage_of_segment"] - expected_percentage) < 0.01
        
        # Verify all percentages sum to 100%
        total_percentage = sum(metric["percentage_of_segment"] for metric in lifecycle_metrics)
        assert abs(total_percentage - 100.0) < 0.01

    @patch('app.core.database.get_warehouse_db')
    def test_retention_summary_calculations(self, mock_db, sample_cohort_data, sample_lifecycle_data):
        """Test retention summary calculations"""
        mock_session = MagicMock()
        mock_db.return_value = mock_session
        
        # Mock results
        mock_cohort_result = MagicMock()
        mock_cohort_result.fetchall.return_value = [MagicMock(**row) for row in sample_cohort_data]
        
        mock_lifecycle_result = MagicMock()
        mock_lifecycle_result.fetchall.return_value = [MagicMock(**row) for row in sample_lifecycle_data]
        
        mock_session.execute.side_effect = [
            mock_cohort_result,
            mock_lifecycle_result
        ]
        
        response = client.get("/analytics/retention?cohort_period=weekly&lookback_periods=12")
        assert response.status_code == 200
        
        data = response.json()
        summary = data["data"]["summary"]
        
        # Verify summary structure and calculations
        assert "total_users_analyzed" in summary
        assert "cohort_period" in summary
        assert "lookback_periods" in summary
        assert "active_users" in summary
        assert "overall_retention_rate" in summary
        assert "average_retention_curve" in summary
        
        # Verify cohort period and lookback periods match request
        assert summary["cohort_period"] == "weekly"
        assert summary["lookback_periods"] == 12
        
        # Verify active users calculation
        expected_active_users = next(
            metric["users_count"] for metric in sample_lifecycle_data 
            if metric["lifecycle_stage"] == "active"
        )
        assert summary["active_users"] == expected_active_users
        
        # Verify overall retention rate calculation
        total_users = sum(metric["users_count"] for metric in sample_lifecycle_data)
        expected_retention_rate = (expected_active_users / total_users) * 100
        assert abs(summary["overall_retention_rate"] - expected_retention_rate) < 0.01
        
        # Verify average retention curve structure
        avg_retention_curve = summary["average_retention_curve"]
        assert isinstance(avg_retention_curve, list)
        
        for point in avg_retention_curve:
            assert "period_number" in point
            assert "average_retention_rate" in point
            assert "cohorts_included" in point

    @patch('app.core.database.get_warehouse_db')
    def test_retention_analytics_database_error(self, mock_db):
        """Test retention analytics with database error"""
        # Mock database session to raise an exception
        mock_session = MagicMock()
        mock_session.execute.side_effect = Exception("Database connection failed")
        mock_db.return_value = mock_session
        
        # Make request
        response = client.get("/analytics/retention")
        
        # Should return 500 error
        assert response.status_code == 500
        data = response.json()
        assert "detail" in data
        assert "Failed to retrieve retention analytics" in data["detail"]

    def test_retention_analytics_response_structure_validation(self):
        """Test that the response structure is valid for frontend consumption"""
        with patch('app.core.database.get_warehouse_db') as mock_db:
            mock_session = MagicMock()
            mock_db.return_value = mock_session
            
            # Mock empty results
            mock_result = MagicMock()
            mock_result.fetchall.return_value = []
            mock_session.execute.return_value = mock_result
            
            response = client.get("/analytics/retention")
            assert response.status_code == 200
            
            data = response.json()
            
            # Verify required top-level keys
            required_keys = ["success", "data", "filters_applied", "date_range", "generated_at"]
            for key in required_keys:
                assert key in data
            
            # Verify data structure
            retention_data = data["data"]
            required_data_keys = [
                "cohort_analysis", "retention_curves", "lifecycle_metrics", "summary"
            ]
            for key in required_data_keys:
                assert key in retention_data
            
            # Verify filters structure
            filters = data["filters_applied"]
            expected_filter_keys = [
                "cohort_period", "lookback_periods", "user_segment", "acquisition_channel"
            ]
            for key in expected_filter_keys:
                assert key in filters

    @patch('app.core.database.get_warehouse_db')
    def test_cohort_chart_format_compatibility(self, mock_db, sample_cohort_data):
        """Test that cohort data format is suitable for cohort chart visualization"""
        mock_session = MagicMock()
        mock_db.return_value = mock_session
        
        # Mock cohort result
        mock_cohort_result = MagicMock()
        mock_cohort_result.fetchall.return_value = [MagicMock(**row) for row in sample_cohort_data]
        
        # Mock empty lifecycle result
        mock_lifecycle_result = MagicMock()
        mock_lifecycle_result.fetchall.return_value = []
        
        mock_session.execute.side_effect = [
            mock_cohort_result,
            mock_lifecycle_result
        ]
        
        response = client.get("/analytics/retention")
        assert response.status_code == 200
        
        data = response.json()
        cohort_analysis = data["data"]["cohort_analysis"]
        
        # Verify cohort data can be used for cohort chart
        for cohort in cohort_analysis:
            # Each cohort should have a period identifier
            assert "cohort_period" in cohort
            assert "cohort_size" in cohort
            
            # Should have retention data organized by period
            retention_by_period = cohort["retention_by_period"]
            assert isinstance(retention_by_period, dict)
            
            # Period keys should be consistently formatted
            for period_key in retention_by_period.keys():
                assert period_key.startswith("period_")
                period_data = retention_by_period[period_key]
                
                # Essential data for cohort visualization
                assert "period_number" in period_data
                assert "retained_users" in period_data
                assert "retention_rate" in period_data
                
                # Retention rate should be a percentage (0-100)
                assert 0 <= period_data["retention_rate"] <= 100