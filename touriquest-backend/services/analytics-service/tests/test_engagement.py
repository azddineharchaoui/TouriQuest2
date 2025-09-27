"""
Test Suite for Engagement Analytics Endpoints

Tests all engagement analytics functionality including feature adoption,
time metrics, viral metrics, device comparison, and voice assistant analytics.
"""

import pytest
import json
from datetime import date, timedelta
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from app.main import app
from app.api.endpoints.engagement import router

client = TestClient(app)


class TestEngagementAnalytics:
    """Test cases for engagement analytics endpoints"""
    
    @pytest.fixture
    def mock_warehouse_db(self):
        """Mock warehouse database session"""
        db_mock = AsyncMock()
        
        # Mock feature adoption data
        feature_result = AsyncMock()
        feature_result.fetchall.return_value = [
            type('Row', (), {
                'feature_name': 'search_filters',
                'feature_category': 'search',
                'users_adopted': 1250,
                'adoption_rate': 85.5,
                'recent_adopters': 150,
                'total_interactions': 5500,
                'sessions_used': 2100,
                'avg_interaction_duration': 45.2,
                'first_adoption_date': date(2024, 1, 1),
                'latest_usage_date': date(2024, 1, 30)
            })(),
            type('Row', (), {
                'feature_name': 'voice_search',
                'feature_category': 'search',
                'users_adopted': 850,
                'adoption_rate': 58.2,
                'recent_adopters': 95,
                'total_interactions': 2800,
                'sessions_used': 1200,
                'avg_interaction_duration': 32.1,
                'first_adoption_date': date(2024, 1, 10),
                'latest_usage_date': date(2024, 1, 29)
            })()
        ]
        
        # Mock time metrics data
        time_result = AsyncMock()
        time_result.fetchall.return_value = [
            type('Row', (), {
                'page_path': '/experiences/detail',
                'page_category': 'experience',
                'page_sessions': 5500,
                'unique_visitors': 4200,
                'avg_time_on_page': 185.4,
                'median_time_on_page': 145.2,
                'avg_scroll_depth': 78.5,
                'engaged_sessions': 4100,
                'avg_interactions_per_session': 3.2
            })(),
            type('Row', (), {
                'page_path': '/search/results',
                'page_category': 'search',
                'page_sessions': 8200,
                'unique_visitors': 6800,
                'avg_time_on_page': 95.8,
                'median_time_on_page': 78.5,
                'avg_scroll_depth': 65.2,
                'engaged_sessions': 6500,
                'avg_interactions_per_session': 4.1
            })()
        ]
        
        # Mock viral metrics data
        viral_result = AsyncMock()
        viral_result.fetchall.return_value = [
            type('Row', (), {
                'share_type': 'social_media',
                'content_type': 'experience',
                'sharing_users': 450,
                'total_shares': 1250,
                'total_referrals': 380,
                'total_conversions': 85,
                'total_referral_revenue': 12500.0,
                'viral_coefficient': 0.85
            })(),
            type('Row', (), {
                'share_type': 'direct_link',
                'content_type': 'property',
                'sharing_users': 280,
                'total_shares': 650,
                'total_referrals': 195,
                'total_conversions': 42,
                'total_referral_revenue': 8200.0,
                'viral_coefficient': 0.68
            })()
        ]
        
        # Mock device comparison data
        device_result = AsyncMock()
        device_result.fetchall.return_value = [
            type('Row', (), {
                'device_type': 'mobile',
                'browser_name': 'Chrome',
                'operating_system': 'Android',
                'sessions': 12500,
                'unique_users': 9800,
                'avg_session_duration': 240.5,
                'avg_pages_per_session': 3.8,
                'conversions': 850,
                'avg_engagement_score': 8.2,
                'feature_interactions': 25000,
                'avg_time_to_first_interaction': 15.2
            })(),
            type('Row', (), {
                'device_type': 'desktop',
                'browser_name': 'Chrome',
                'operating_system': 'Windows',
                'sessions': 8200,
                'unique_users': 7100,
                'avg_session_duration': 320.8,
                'avg_pages_per_session': 4.5,
                'conversions': 720,
                'avg_engagement_score': 8.9,
                'feature_interactions': 18500,
                'avg_time_to_first_interaction': 12.8
            })()
        ]
        
        # Mock voice assistant data
        voice_result = AsyncMock()
        voice_result.fetchall.return_value = [
            type('Row', (), {
                'interface_type': 'voice',
                'assistant_type': 'google_assistant',
                'command_category': 'search',
                'total_interactions': 2500,
                'unique_users': 850,
                'sessions_with_voice': 1200,
                'avg_response_time_ms': 850.5,
                'successful_interactions': 2200,
                'failed_interactions': 300,
                'avg_satisfaction_score': 4.2
            })(),
            type('Row', (), {
                'interface_type': 'voice',
                'assistant_type': 'alexa',
                'command_category': 'booking',
                'total_interactions': 1200,
                'unique_users': 450,
                'sessions_with_voice': 650,
                'avg_response_time_ms': 920.2,
                'successful_interactions': 980,
                'failed_interactions': 220,
                'avg_satisfaction_score': 3.8
            })()
        ]
        
        # Mock heatmap data
        heatmap_result = AsyncMock()
        heatmap_result.fetchall.return_value = [
            type('Row', (), {
                'page_path': '/experiences/detail',
                'element_selector': '.booking-button',
                'x_coordinate': 350,
                'y_coordinate': 520,
                'click_count': 1250,
                'avg_viewport_width': 1920,
                'avg_viewport_height': 1080,
                'device_type': 'desktop'
            })(),
            type('Row', (), {
                'page_path': '/search/results',
                'element_selector': '.filter-dropdown',
                'x_coordinate': 180,
                'y_coordinate': 120,
                'click_count': 950,
                'avg_viewport_width': 375,
                'avg_viewport_height': 667,
                'device_type': 'mobile'
            })()
        ]
        
        # Configure database execute method to return appropriate results
        def mock_execute(query, params=None):
            query_str = str(query)
            if 'feature_interactions' in query_str:
                return feature_result
            elif 'page_analytics' in query_str:
                return time_result
            elif 'social_shares' in query_str:
                return viral_result
            elif 'device_engagement' in query_str:
                return device_result
            elif 'voice_assistant_interactions' in query_str:
                return voice_result
            elif 'page_heatmap_data' in query_str:
                return heatmap_result
            else:
                mock_result = AsyncMock()
                mock_result.fetchall.return_value = []
                return mock_result
        
        db_mock.execute = AsyncMock(side_effect=mock_execute)
        return db_mock
    
    def test_get_engagement_analytics_success(self, mock_warehouse_db):
        """Test successful engagement analytics retrieval"""
        with patch('app.core.database.get_warehouse_db', return_value=mock_warehouse_db):
            response = client.get("/analytics/engagement?days=30")
            
            assert response.status_code == 200
            data = response.json()
            
            assert data["success"] is True
            assert "data" in data
            assert "feature_adoption" in data["data"]
            assert "time_metrics" in data["data"]
            assert "viral_metrics" in data["data"]
            assert "device_comparison" in data["data"]
            assert "voice_assistant" in data["data"]
            assert "summary" in data["data"]
            
            # Validate feature adoption data
            feature_adoption = data["data"]["feature_adoption"]
            assert len(feature_adoption) > 0
            assert feature_adoption[0]["feature_name"] == "search_filters"
            assert feature_adoption[0]["adoption_metrics"]["adoption_rate"] == 85.5
            
            # Validate summary metrics
            summary = data["data"]["summary"]
            assert "total_features_analyzed" in summary
            assert "avg_feature_adoption_rate" in summary
            assert "device_split" in summary
    
    def test_get_engagement_analytics_with_filters(self, mock_warehouse_db):
        """Test engagement analytics with various filters"""
        with patch('app.core.database.get_warehouse_db', return_value=mock_warehouse_db):
            response = client.get(
                "/analytics/engagement?days=7&feature=search_filters&device_type=mobile&user_segment=premium"
            )
            
            assert response.status_code == 200
            data = response.json()
            
            # Check that filters are applied
            filters_applied = data["filters_applied"]
            assert filters_applied["days"] == 7
            assert filters_applied["feature"] == "search_filters"
            assert filters_applied["device_type"] == "mobile"
            assert filters_applied["user_segment"] == "premium"
    
    def test_get_engagement_analytics_with_heatmaps(self, mock_warehouse_db):
        """Test engagement analytics with heatmaps included"""
        with patch('app.core.database.get_warehouse_db', return_value=mock_warehouse_db):
            response = client.get("/analytics/engagement?include_heatmaps=true")
            
            assert response.status_code == 200
            data = response.json()
            
            assert "heatmaps" in data["data"]
            assert data["data"]["heatmaps"] is not None
            assert len(data["data"]["heatmaps"]) > 0
            
            # Validate heatmap structure
            heatmap = data["data"]["heatmaps"][0]
            assert "page_path" in heatmap
            assert "device_type" in heatmap
            assert "interaction_points" in heatmap
            assert "viewport_dimensions" in heatmap
    
    def test_get_engagement_analytics_without_heatmaps(self, mock_warehouse_db):
        """Test engagement analytics without heatmaps"""
        with patch('app.core.database.get_warehouse_db', return_value=mock_warehouse_db):
            response = client.get("/analytics/engagement?include_heatmaps=false")
            
            assert response.status_code == 200
            data = response.json()
            
            assert data["data"]["heatmaps"] is None
    
    def test_get_engagement_analytics_time_metrics(self, mock_warehouse_db):
        """Test time engagement metrics in detail"""
        with patch('app.core.database.get_warehouse_db', return_value=mock_warehouse_db):
            response = client.get("/analytics/engagement")
            
            assert response.status_code == 200
            data = response.json()
            
            time_metrics = data["data"]["time_metrics"]
            assert len(time_metrics) > 0
            
            metric = time_metrics[0]
            assert "page_path" in metric
            assert "traffic_metrics" in metric
            assert "time_metrics" in metric
            assert "engagement_metrics" in metric
            
            # Check specific metrics
            assert metric["time_metrics"]["avg_time_on_page"] > 0
            assert metric["engagement_metrics"]["engagement_rate"] >= 0
    
    def test_get_engagement_analytics_viral_metrics(self, mock_warehouse_db):
        """Test viral coefficient and sharing metrics"""
        with patch('app.core.database.get_warehouse_db', return_value=mock_warehouse_db):
            response = client.get("/analytics/engagement")
            
            assert response.status_code == 200
            data = response.json()
            
            viral_metrics = data["data"]["viral_metrics"]
            assert len(viral_metrics) > 0
            
            metric = viral_metrics[0]
            assert "share_type" in metric
            assert "sharing_metrics" in metric
            assert "referral_metrics" in metric
            
            # Check viral coefficient
            assert metric["sharing_metrics"]["viral_coefficient"] >= 0
            assert metric["referral_metrics"]["conversion_rate"] >= 0
    
    def test_get_engagement_analytics_device_comparison(self, mock_warehouse_db):
        """Test device comparison metrics"""
        with patch('app.core.database.get_warehouse_db', return_value=mock_warehouse_db):
            response = client.get("/analytics/engagement")
            
            assert response.status_code == 200
            data = response.json()
            
            device_comparison = data["data"]["device_comparison"]
            assert len(device_comparison) > 0
            
            device = device_comparison[0]
            assert "device_info" in device
            assert "usage_metrics" in device
            assert "engagement_metrics" in device
            assert "conversion_metrics" in device
            
            # Validate device information
            assert device["device_info"]["device_type"] in ["mobile", "desktop", "tablet"]
    
    def test_get_engagement_analytics_voice_assistant(self, mock_warehouse_db):
        """Test voice assistant analytics"""
        with patch('app.core.database.get_warehouse_db', return_value=mock_warehouse_db):
            response = client.get("/analytics/engagement")
            
            assert response.status_code == 200
            data = response.json()
            
            voice_assistant = data["data"]["voice_assistant"]
            assert len(voice_assistant) > 0
            
            voice = voice_assistant[0]
            assert "interface_info" in voice
            assert "usage_metrics" in voice
            assert "performance_metrics" in voice
            
            # Check success rate calculation
            assert 0 <= voice["performance_metrics"]["success_rate"] <= 100
    
    def test_get_engagement_analytics_error_handling(self):
        """Test error handling for database failures"""
        with patch('app.core.database.get_warehouse_db', side_effect=Exception("Database error")):
            response = client.get("/analytics/engagement")
            
            assert response.status_code == 500
            data = response.json()
            assert "Failed to retrieve engagement analytics" in data["detail"]
    
    def test_get_engagement_analytics_invalid_parameters(self):
        """Test handling of invalid parameters"""
        response = client.get("/analytics/engagement?days=0")
        assert response.status_code == 422  # Validation error
        
        response = client.get("/analytics/engagement?days=500")  
        assert response.status_code == 422  # Validation error
    
    def test_get_engagement_analytics_empty_data(self):
        """Test handling when no data is available"""
        mock_db = AsyncMock()
        mock_result = AsyncMock()
        mock_result.fetchall.return_value = []
        mock_db.execute.return_value = mock_result
        
        with patch('app.core.database.get_warehouse_db', return_value=mock_db):
            response = client.get("/analytics/engagement")
            
            assert response.status_code == 200
            data = response.json()
            
            assert data["success"] is True
            assert len(data["data"]["feature_adoption"]) == 0
            assert len(data["data"]["time_metrics"]) == 0
            assert data["data"]["summary"]["total_features_analyzed"] == 0


# Test data generators for mock scenarios
class EngagementTestDataGenerator:
    """Generate test data for engagement analytics tests"""
    
    @staticmethod
    def generate_feature_adoption_data():
        """Generate mock feature adoption data"""
        return [
            {
                'feature_name': 'advanced_search',
                'feature_category': 'search',
                'users_adopted': 2500,
                'adoption_rate': 92.3,
                'recent_adopters': 180,
                'total_interactions': 12000,
                'sessions_used': 4500,
                'avg_interaction_duration': 52.8
            },
            {
                'feature_name': 'ar_preview',
                'feature_category': 'visualization',
                'users_adopted': 850,
                'adoption_rate': 31.2,
                'recent_adopters': 95,
                'total_interactions': 2800,
                'sessions_used': 1200,
                'avg_interaction_duration': 125.4
            }
        ]
    
    @staticmethod
    def generate_heatmap_data():
        """Generate mock heatmap interaction data"""
        return [
            {
                'page_path': '/experiences/adventure',
                'device_type': 'desktop',
                'interaction_points': [
                    {'x': 350, 'y': 450, 'intensity': 1250, 'element_selector': '.book-now'},
                    {'x': 180, 'y': 120, 'intensity': 850, 'element_selector': '.filter-toggle'}
                ]
            },
            {
                'page_path': '/search',
                'device_type': 'mobile', 
                'interaction_points': [
                    {'x': 160, 'y': 280, 'intensity': 2100, 'element_selector': '.search-input'},
                    {'x': 320, 'y': 540, 'intensity': 950, 'element_selector': '.results-item'}
                ]
            }
        ]


if __name__ == "__main__":
    pytest.main([__file__])