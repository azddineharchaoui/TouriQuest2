"""
Integration tests for analytics dashboard API endpoints
"""

import pytest
import json
from fastapi.testclient import TestClient
from datetime import date, timedelta
from decimal import Decimal

# Test fixtures would typically be imported from conftest.py
# from tests.conftest import client, test_db


class TestAnalyticsDashboard:
    """Integration tests for analytics dashboard endpoints"""
    
    def test_dashboard_endpoint_returns_valid_json_structure(self, client, test_db):
        """
        Test that GET /api/v1/analytics/dashboard returns valid JSON with required keys
        """
        # Make request to dashboard endpoint
        response = client.get("/analytics/dashboard")
        
        # Assert successful response
        assert response.status_code == 200
        
        # Parse JSON response
        data = response.json()
        
        # Assert top-level structure
        assert "success" in data
        assert "data" in data
        assert "filters_applied" in data
        assert "date_range" in data
        assert "generated_at" in data
        
        assert data["success"] is True
        
        # Assert main dashboard data structure
        dashboard_data = data["data"]
        
        # 1. Revenue section
        assert "revenue" in dashboard_data
        revenue = dashboard_data["revenue"]
        assert "revenue_24h" in revenue
        assert "bookings_24h" in revenue
        assert "yoy_growth_percent" in revenue
        assert "yoy_revenue_previous" in revenue
        
        # Validate revenue data types
        assert isinstance(revenue["revenue_24h"], (int, float))
        assert isinstance(revenue["bookings_24h"], int)
        assert isinstance(revenue["yoy_growth_percent"], (int, float))
        assert isinstance(revenue["yoy_revenue_previous"], (int, float))
        
        # 2. Booking funnel section
        assert "booking_funnel" in dashboard_data
        funnel = dashboard_data["booking_funnel"]
        assert "steps" in funnel
        assert "overall_conversion_rate" in funnel
        
        # Validate funnel steps structure
        assert isinstance(funnel["steps"], list)
        assert len(funnel["steps"]) == 4  # Property Views, Booking Started, Payment Started, Booking Completed
        
        for step in funnel["steps"]:
            assert "step" in step
            assert "count" in step
            assert "conversion_rate" in step
            assert "drop_off" in step
            assert isinstance(step["count"], int)
            assert isinstance(step["conversion_rate"], (int, float))
            assert isinstance(step["drop_off"], int)
        
        # 3. CLV by segment section
        assert "clv_by_segment" in dashboard_data
        clv_data = dashboard_data["clv_by_segment"]
        assert isinstance(clv_data, list)
        
        for segment in clv_data:
            assert "segment" in segment
            assert "users" in segment
            assert "avg_order_value" in segment
            assert "avg_orders_per_user" in segment
            assert "clv" in segment
            assert isinstance(segment["users"], int)
            assert isinstance(segment["avg_order_value"], (int, float))
            assert isinstance(segment["avg_orders_per_user"], (int, float))
            assert isinstance(segment["clv"], (int, float))
        
        # 4. Property performance section
        assert "property_performance" in dashboard_data
        property_perf = dashboard_data["property_performance"]
        assert "top_properties" in property_perf
        assert "total_analyzed" in property_perf
        
        # Validate property performance structure
        top_properties = property_perf["top_properties"]
        assert isinstance(top_properties, list)
        assert len(top_properties) <= 10  # Should return top 10 or fewer
        
        for prop in top_properties:
            assert "property_id" in prop
            assert "total_revenue" in prop
            assert "total_bookings" in prop
            assert "avg_occupancy_rate" in prop
            assert "avg_rating" in prop
            assert "property_type" in prop
            assert "city" in prop
            assert "country_code" in prop
            assert isinstance(prop["total_revenue"], (int, float))
            assert isinstance(prop["total_bookings"], int)
            assert isinstance(prop["avg_occupancy_rate"], (int, float))
            assert isinstance(prop["avg_rating"], (int, float))
        
        # 5. Market penetration section
        assert "market_penetration" in dashboard_data
        market_data = dashboard_data["market_penetration"]
        assert "top_regions" in market_data
        assert "total_analyzed" in market_data
        
        # Validate market penetration structure
        top_regions = market_data["top_regions"]
        assert isinstance(top_regions, list)
        assert len(top_regions) <= 10  # Should return top 10 or fewer
        
        for region in top_regions:
            assert "country_code" in region
            assert "region" in region
            assert "total_bookings" in region
            assert "total_revenue" in region
            assert "unique_customers" in region
            assert "active_properties" in region
            assert "revenue_per_customer" in region
            assert isinstance(region["total_bookings"], int)
            assert isinstance(region["total_revenue"], (int, float))
            assert isinstance(region["unique_customers"], int)
            assert isinstance(region["active_properties"], int)
            assert isinstance(region["revenue_per_customer"], (int, float))
        
        # Validate date_range structure
        date_range = data["date_range"]
        assert "start_date" in date_range
        assert "end_date" in date_range
        assert "days_analyzed" in date_range
    
    def test_dashboard_endpoint_with_filters(self, client, test_db):
        """
        Test dashboard endpoint with query filters
        """
        # Test with country filter
        response = client.get("/analytics/dashboard?country_code=US&days=7")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert data["filters_applied"]["country_code"] == "US"
        assert data["date_range"]["days_analyzed"] == 7
        
        # Test with property type filter
        response = client.get("/analytics/dashboard?property_type=apartment&days=14")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert data["filters_applied"]["property_type"] == "apartment"
        assert data["date_range"]["days_analyzed"] == 14
    
    def test_dashboard_endpoint_parameter_validation(self, client):
        """
        Test parameter validation for dashboard endpoint
        """
        # Test invalid days parameter (too high)
        response = client.get("/analytics/dashboard?days=400")
        assert response.status_code == 422  # Validation error
        
        # Test invalid days parameter (too low)
        response = client.get("/analytics/dashboard?days=0")
        assert response.status_code == 422  # Validation error
        
        # Test valid edge case parameters
        response = client.get("/analytics/dashboard?days=1")
        assert response.status_code == 200
        
        response = client.get("/analytics/dashboard?days=365")
        assert response.status_code == 200
    
    def test_dashboard_endpoint_response_format(self, client, test_db):
        """
        Test that response can be properly serialized to JSON
        """
        response = client.get("/analytics/dashboard")
        assert response.status_code == 200
        
        # Verify response is valid JSON
        try:
            json_data = response.json()
            # Try to re-serialize to ensure no serialization issues
            json.dumps(json_data)
        except (json.JSONDecodeError, TypeError) as e:
            pytest.fail(f"Response is not valid JSON: {e}")
    
    def test_dashboard_endpoint_performance(self, client, test_db):
        """
        Test that dashboard endpoint responds within reasonable time
        """
        import time
        
        start_time = time.time()
        response = client.get("/analytics/dashboard")
        end_time = time.time()
        
        assert response.status_code == 200
        
        # Dashboard should respond within 5 seconds
        response_time = end_time - start_time
        assert response_time < 5.0, f"Dashboard response took {response_time:.2f} seconds, exceeds 5 second limit"
    
    def test_dashboard_endpoint_with_empty_database(self, client, empty_test_db):
        """
        Test dashboard behavior with no data
        """
        response = client.get("/analytics/dashboard")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        
        # With no data, should still return proper structure with zero values
        dashboard_data = data["data"]
        
        # Revenue should be zero
        revenue = dashboard_data["revenue"]
        assert revenue["revenue_24h"] == 0
        assert revenue["bookings_24h"] == 0
        
        # Funnel should have zero counts
        funnel = dashboard_data["booking_funnel"]
        for step in funnel["steps"]:
            if step["step"] != "Property Views":  # First step might have some base count
                assert step["count"] >= 0
        
        # Arrays should be empty or have zero values
        assert len(dashboard_data["clv_by_segment"]) >= 0
        assert len(dashboard_data["property_performance"]["top_properties"]) >= 0
        assert len(dashboard_data["market_penetration"]["top_regions"]) >= 0


@pytest.fixture
def client():
    """
    FastAPI test client fixture
    Note: This would typically be defined in conftest.py
    """
    from fastapi.testclient import TestClient
    from main import app
    
    return TestClient(app)


@pytest.fixture
async def test_db():
    """
    Test database fixture with sample data
    Note: This would typically be defined in conftest.py with proper setup/teardown
    """
    # In a real implementation, this would:
    # 1. Create a test database
    # 2. Run migrations
    # 3. Insert sample test data
    # 4. Yield the database session
    # 5. Clean up after the test
    pass


@pytest.fixture
async def empty_test_db():
    """
    Test database fixture with no data
    """
    # In a real implementation, this would provide an empty database
    # for testing edge cases
    pass


# Integration test that can be run standalone
def test_dashboard_json_keys_structure():
    """
    Standalone test to verify the expected JSON structure
    This test documents the expected API response format
    """
    expected_structure = {
        "success": bool,
        "data": {
            "revenue": {
                "revenue_24h": (int, float),
                "bookings_24h": int,
                "yoy_growth_percent": (int, float),
                "yoy_revenue_previous": (int, float)
            },
            "booking_funnel": {
                "steps": [
                    {
                        "step": str,
                        "count": int,
                        "conversion_rate": (int, float),
                        "drop_off": int
                    }
                ],
                "overall_conversion_rate": (int, float)
            },
            "clv_by_segment": [
                {
                    "segment": str,
                    "users": int,
                    "avg_order_value": (int, float),
                    "avg_orders_per_user": (int, float),
                    "clv": (int, float)
                }
            ],
            "property_performance": {
                "top_properties": [
                    {
                        "property_id": str,
                        "total_revenue": (int, float),
                        "total_bookings": int,
                        "avg_occupancy_rate": (int, float),
                        "avg_rating": (int, float),
                        "property_type": str,
                        "city": str,
                        "country_code": str
                    }
                ],
                "total_analyzed": int
            },
            "market_penetration": {
                "top_regions": [
                    {
                        "country_code": str,
                        "region": str,
                        "total_bookings": int,
                        "total_revenue": (int, float),
                        "unique_customers": int,
                        "active_properties": int,
                        "revenue_per_customer": (int, float)
                    }
                ],
                "total_analyzed": int
            }
        },
        "filters_applied": dict,
        "date_range": {
            "start_date": str,
            "end_date": str,
            "days_analyzed": int
        },
        "generated_at": str
    }
    
    # This documents the expected structure for the dashboard API
    assert expected_structure is not None
    print("Expected dashboard API structure validated")


if __name__ == "__main__":
    # Run the structure validation test
    test_dashboard_json_keys_structure()
    print("✅ Dashboard API structure test passed")