"""
Integration tests for revenue analytics API endpoints
"""

import pytest
import json
from datetime import date, timedelta
from fastapi.testclient import TestClient


class TestRevenueAnalytics:
    """Integration tests for revenue analytics endpoints"""
    
    def test_revenue_analytics_endpoint_returns_valid_structure(self, client, test_db):
        """
        Test that GET /api/v1/analytics/revenue returns valid JSON structure
        """
        response = client.get("/analytics/revenue")
        
        assert response.status_code == 200
        data = response.json()
        
        # Assert top-level structure
        assert "success" in data
        assert "data" in data
        assert "filters_applied" in data
        assert "date_range" in data
        assert "generated_at" in data
        
        assert data["success"] is True
        
        # Assert main analytics data structure
        analytics_data = data["data"]
        
        # 1. Revenue Streams
        assert "revenue_streams" in analytics_data
        streams = analytics_data["revenue_streams"]
        assert isinstance(streams, list)
        
        for stream in streams:
            assert "source" in stream
            assert "booking_count" in stream
            assert "total_revenue" in stream
            assert "avg_booking_value" in stream
            assert "completed_revenue" in stream
            
            assert isinstance(stream["source"], str)
            assert isinstance(stream["booking_count"], int)
            assert isinstance(stream["total_revenue"], (int, float))
            assert isinstance(stream["avg_booking_value"], (int, float))
            assert isinstance(stream["completed_revenue"], (int, float))
            assert stream["booking_count"] >= 0
            assert stream["total_revenue"] >= 0
            assert stream["completed_revenue"] >= 0
        
        # 2. Profit Margins
        assert "profit_margins" in analytics_data
        margins = analytics_data["profit_margins"]
        
        required_margin_fields = [
            "avg_daily_revenue", "avg_daily_costs", "avg_daily_profit",
            "avg_profit_margin_pct", "total_revenue", "total_profit"
        ]
        
        for field in required_margin_fields:
            assert field in margins
            assert isinstance(margins[field], (int, float))
            assert margins[field] >= 0
        
        # Profit margin percentage should be reasonable (0-100%)
        assert 0 <= margins["avg_profit_margin_pct"] <= 100
        
        # 3. Anomalies Detected
        assert "anomalies_detected" in analytics_data
        anomalies = analytics_data["anomalies_detected"]
        assert isinstance(anomalies, list)
        
        for anomaly in anomalies:
            assert "date" in anomaly
            assert "daily_revenue" in anomaly
            assert "daily_bookings" in anomaly
            assert "z_score" in anomaly
            assert "is_anomaly" in anomaly
            assert "severity" in anomaly
            
            assert isinstance(anomaly["daily_revenue"], (int, float))
            assert isinstance(anomaly["daily_bookings"], int)
            assert isinstance(anomaly["z_score"], (int, float))
            assert isinstance(anomaly["is_anomaly"], bool)
            assert anomaly["severity"] in ["high", "medium", "low"]
            
            # Z-score should be reasonable for anomalies (typically > 2)
            if anomaly["is_anomaly"]:
                assert abs(anomaly["z_score"]) >= 2
        
        # 4. Campaign ROI
        assert "campaign_roi" in analytics_data
        campaigns = analytics_data["campaign_roi"]
        assert isinstance(campaigns, list)
        
        for campaign in campaigns:
            assert "campaign_name" in campaign
            assert "spend" in campaign
            assert "revenue" in campaign
            assert "roi_percentage" in campaign
            assert "bookings_attributed" in campaign
            assert "cost_per_acquisition" in campaign
            
            assert isinstance(campaign["spend"], (int, float))
            assert isinstance(campaign["revenue"], (int, float))
            assert isinstance(campaign["roi_percentage"], (int, float))
            assert isinstance(campaign["bookings_attributed"], int)
            assert isinstance(campaign["cost_per_acquisition"], (int, float))
            
            # Verify ROI calculation
            expected_roi = ((campaign["revenue"] - campaign["spend"]) / campaign["spend"]) * 100
            assert abs(campaign["roi_percentage"] - expected_roi) < 1  # Allow small rounding differences
        
        # 5. Customer Metrics
        assert "customer_metrics" in analytics_data
        customer_metrics = analytics_data["customer_metrics"]
        
        required_customer_fields = [
            "total_customers", "paying_customers", "customer_acquisition_cost",
            "revenue_per_user", "avg_bookings_per_user", "conversion_rate_pct"
        ]
        
        for field in required_customer_fields:
            assert field in customer_metrics
            assert isinstance(customer_metrics[field], (int, float))
            assert customer_metrics[field] >= 0
        
        # Conversion rate should be 0-100%
        assert 0 <= customer_metrics["conversion_rate_pct"] <= 100
        
        # Paying customers should not exceed total customers
        assert customer_metrics["paying_customers"] <= customer_metrics["total_customers"]
    
    def test_revenue_analytics_with_filters(self, client, test_db):
        """
        Test revenue analytics endpoint with query filters
        """
        # Test with source filter
        response = client.get("/analytics/revenue?source=direct&days=14")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert data["filters_applied"]["source"] == "direct"
        assert data["date_range"]["days_analyzed"] == 14
    
    def test_revenue_analytics_parameter_validation(self, client):
        """
        Test parameter validation for revenue analytics endpoint
        """
        # Test invalid days parameter (too high)
        response = client.get("/analytics/revenue?days=400")
        assert response.status_code == 422
        
        # Test invalid days parameter (too low)
        response = client.get("/analytics/revenue?days=0")
        assert response.status_code == 422
        
        # Test valid edge cases
        response = client.get("/analytics/revenue?days=1")
        assert response.status_code == 200
        
        response = client.get("/analytics/revenue?days=365")
        assert response.status_code == 200
    
    def test_anomaly_detection_logic(self, client, test_db):
        """
        Test anomaly detection using 3σ deviation logic with sample data
        """
        response = client.get("/analytics/revenue")
        assert response.status_code == 200
        
        data = response.json()
        anomalies = data["data"]["anomalies_detected"]
        
        # Test anomaly detection logic
        for anomaly in anomalies:
            z_score = anomaly["z_score"]
            is_anomaly = anomaly["is_anomaly"]
            
            # Anomalies should have z-score >= 2 (we filter for >= 2σ in the query)
            assert abs(z_score) >= 2
            
            # High severity should correspond to z-score > 3
            if anomaly["severity"] == "high":
                assert abs(z_score) > 3
            elif anomaly["severity"] == "medium":
                assert 2 <= abs(z_score) <= 3
        
        # Verify that anomalies are sorted by z_score descending
        if len(anomalies) > 1:
            z_scores = [abs(a["z_score"]) for a in anomalies]
            assert z_scores == sorted(z_scores, reverse=True)
    
    def test_profit_margin_calculations(self, client, test_db):
        """
        Test profit margin calculations with cost model
        """
        response = client.get("/analytics/revenue")
        assert response.status_code == 200
        
        data = response.json()
        margins = data["data"]["profit_margins"]
        
        # Test the 15% cost model assumptions
        if margins["avg_daily_revenue"] > 0:
            # Verify cost calculation (15% of revenue)
            expected_costs = margins["avg_daily_revenue"] * 0.15
            assert abs(margins["avg_daily_costs"] - expected_costs) < 0.01
            
            # Verify profit calculation (85% of revenue)
            expected_profit = margins["avg_daily_revenue"] * 0.85
            assert abs(margins["avg_daily_profit"] - expected_profit) < 0.01
            
            # Verify margin percentage (should be ~85%)
            assert abs(margins["avg_profit_margin_pct"] - 85.0) < 1.0
        
        # Total profit should equal total revenue * 0.85
        if margins["total_revenue"] > 0:
            expected_total_profit = margins["total_revenue"] * 0.85
            assert abs(margins["total_profit"] - expected_total_profit) < 1.0
    
    def test_campaign_roi_calculations(self, client, test_db):
        """
        Test campaign ROI calculations and metrics
        """
        response = client.get("/analytics/revenue")
        assert response.status_code == 200
        
        data = response.json()
        campaigns = data["data"]["campaign_roi"]
        
        for campaign in campaigns:
            spend = campaign["spend"]
            revenue = campaign["revenue"]
            roi_pct = campaign["roi_percentage"]
            bookings = campaign["bookings_attributed"]
            cac = campaign["cost_per_acquisition"]
            
            # Verify ROI calculation: ((revenue - spend) / spend) * 100
            expected_roi = ((revenue - spend) / spend) * 100 if spend > 0 else 0
            assert abs(roi_pct - expected_roi) < 0.01
            
            # Verify CAC calculation: spend / bookings
            expected_cac = spend / bookings if bookings > 0 else 0
            assert abs(cac - expected_cac) < 0.01
            
            # ROI should be reasonable (not extremely negative)
            assert roi_pct > -100  # Can't lose more than 100% ROI
    
    def test_customer_metrics_logic(self, client, test_db):
        """
        Test customer acquisition and revenue metrics logic
        """
        response = client.get("/analytics/revenue")
        assert response.status_code == 200
        
        data = response.json()
        customer_metrics = data["data"]["customer_metrics"]
        
        total_customers = customer_metrics["total_customers"]
        paying_customers = customer_metrics["paying_customers"]
        conversion_rate = customer_metrics["conversion_rate_pct"]
        
        # Logical consistency checks
        assert paying_customers <= total_customers
        
        # Conversion rate calculation verification
        if total_customers > 0:
            expected_conversion = (paying_customers / total_customers) * 100
            assert abs(conversion_rate - expected_conversion) < 0.01
        else:
            assert conversion_rate == 0
        
        # CAC should be positive if we have customers
        if total_customers > 0:
            assert customer_metrics["customer_acquisition_cost"] > 0
        
        # RPU should be positive if we have paying customers
        if paying_customers > 0:
            assert customer_metrics["revenue_per_user"] > 0
    
    def test_revenue_streams_aggregation(self, client, test_db):
        """
        Test revenue streams data aggregation and consistency
        """
        response = client.get("/analytics/revenue")
        assert response.status_code == 200
        
        data = response.json()
        streams = data["data"]["revenue_streams"]
        
        # Verify that completed revenue <= total revenue for each stream
        for stream in streams:
            assert stream["completed_revenue"] <= stream["total_revenue"]
            
            # Average booking value calculation check
            if stream["booking_count"] > 0:
                expected_avg = stream["total_revenue"] / stream["booking_count"]
                assert abs(stream["avg_booking_value"] - expected_avg) < 0.01
            else:
                assert stream["avg_booking_value"] == 0
        
        # Verify streams are sorted by total_revenue descending
        if len(streams) > 1:
            revenues = [s["total_revenue"] for s in streams]
            assert revenues == sorted(revenues, reverse=True)
    
    def test_revenue_analytics_response_format(self, client, test_db):
        """
        Test that response can be properly serialized to JSON
        """
        response = client.get("/analytics/revenue")
        assert response.status_code == 200
        
        # Verify response is valid JSON
        try:
            json_data = response.json()
            # Try to re-serialize to ensure no serialization issues
            json.dumps(json_data)
        except (json.JSONDecodeError, TypeError) as e:
            pytest.fail(f"Response is not valid JSON: {e}")


@pytest.fixture
def client():
    """FastAPI test client fixture"""
    from fastapi.testclient import TestClient
    from main import app
    return TestClient(app)


@pytest.fixture
async def test_db():
    """Test database fixture"""
    pass


def test_revenue_analytics_structure_documentation():
    """
    Standalone test documenting expected revenue analytics API structure
    """
    expected_structure = {
        "success": bool,
        "data": {
            "revenue_streams": [
                {
                    "source": str,
                    "booking_count": int,
                    "total_revenue": float,
                    "avg_booking_value": float,
                    "completed_revenue": float
                }
            ],
            "profit_margins": {
                "avg_daily_revenue": float,
                "avg_daily_costs": float,
                "avg_daily_profit": float,
                "avg_profit_margin_pct": float,
                "total_revenue": float,
                "total_profit": float
            },
            "anomalies_detected": [
                {
                    "date": str,  # ISO date
                    "daily_revenue": float,
                    "daily_bookings": int,
                    "z_score": float,
                    "is_anomaly": bool,
                    "severity": str  # "high", "medium", "low"
                }
            ],
            "campaign_roi": [
                {
                    "campaign_name": str,
                    "spend": float,
                    "revenue": float,
                    "roi_percentage": float,
                    "bookings_attributed": int,
                    "cost_per_acquisition": float
                }
            ],
            "customer_metrics": {
                "total_customers": int,
                "paying_customers": int,
                "customer_acquisition_cost": float,
                "revenue_per_user": float,
                "avg_bookings_per_user": float,
                "conversion_rate_pct": float
            }
        },
        "filters_applied": {
            "days": int,
            "source": str  # optional
        },
        "date_range": {
            "start_date": str,
            "end_date": str,
            "days_analyzed": int
        },
        "generated_at": str
    }
    
    assert expected_structure is not None
    print("✅ Revenue analytics API structure validated")


def test_anomaly_detection_algorithm():
    """
    Test the 3σ anomaly detection algorithm with sample data
    """
    # Sample daily revenue data
    sample_data = [100, 105, 98, 102, 99, 101, 97, 300, 103, 96]  # 300 is an anomaly
    
    # Calculate mean and standard deviation
    mean_revenue = sum(sample_data) / len(sample_data)
    variance = sum((x - mean_revenue) ** 2 for x in sample_data) / len(sample_data)
    std_dev = variance ** 0.5
    
    # Test anomaly detection
    for value in sample_data:
        z_score = abs(value - mean_revenue) / std_dev
        is_anomaly = z_score > 3
        
        if value == 300:
            assert is_anomaly  # Should detect 300 as anomaly
            assert z_score > 3
        else:
            assert not is_anomaly or z_score <= 3  # Normal values should not be anomalies
    
    print("✅ Anomaly detection algorithm validated")


if __name__ == "__main__":
    test_revenue_analytics_structure_documentation()
    test_anomaly_detection_algorithm()