"""
Analytics and monitoring API endpoints.
"""
from fastapi import APIRouter, HTTPException, Query, Path
from typing import List, Dict, Any, Optional
from uuid import UUID
import logging

from app.analytics.analytics import recommendation_analytics
from app.monitoring.monitoring import monitoring_system, AlertSeverity

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/analytics/overview")
async def get_analytics_overview():
    """Get overall analytics overview."""
    try:
        return recommendation_analytics.get_overall_metrics()
    except Exception as e:
        logger.error(f"Error getting analytics overview: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/analytics/user/{user_id}")
async def get_user_analytics(
    user_id: UUID = Path(..., description="User ID")
):
    """Get analytics for a specific user."""
    try:
        analytics = recommendation_analytics.get_user_analytics(str(user_id))
        if analytics is None:
            raise HTTPException(status_code=404, detail="User analytics not found")
        return analytics
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user analytics: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/analytics/algorithms")
async def get_algorithm_performance():
    """Get algorithm performance metrics."""
    try:
        return recommendation_analytics.get_algorithm_performance()
    except Exception as e:
        logger.error(f"Error getting algorithm performance: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/analytics/trending")
async def get_trending_analytics(
    hours: int = Query(24, ge=1, le=168, description="Time period in hours")
):
    """Get trending analytics."""
    try:
        return recommendation_analytics.get_trending_analytics(hours)
    except Exception as e:
        logger.error(f"Error getting trending analytics: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/analytics/dashboard")
async def get_analytics_dashboard():
    """Get comprehensive analytics dashboard."""
    try:
        return recommendation_analytics.get_performance_dashboard()
    except Exception as e:
        logger.error(f"Error getting analytics dashboard: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/monitoring/health")
async def get_system_health():
    """Get system health status."""
    try:
        return monitoring_system.get_system_health()
    except Exception as e:
        logger.error(f"Error getting system health: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/monitoring/alerts")
async def get_active_alerts():
    """Get all active alerts."""
    try:
        return {
            "active_alerts": monitoring_system.get_active_alerts(),
            "total_count": len(monitoring_system.get_active_alerts())
        }
    except Exception as e:
        logger.error(f"Error getting active alerts: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/monitoring/alerts/history")
async def get_alert_history(
    hours: int = Query(24, ge=1, le=168, description="Time period in hours")
):
    """Get alert history."""
    try:
        return {
            "alert_history": monitoring_system.get_alert_history(hours),
            "time_period_hours": hours
        }
    except Exception as e:
        logger.error(f"Error getting alert history: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/monitoring/metrics/{metric_name}")
async def get_metric_summary(
    metric_name: str = Path(..., description="Metric name"),
    duration_minutes: int = Query(60, ge=1, le=1440, description="Duration in minutes")
):
    """Get summary for a specific metric."""
    try:
        return monitoring_system.get_metric_summary(metric_name, duration_minutes)
    except Exception as e:
        logger.error(f"Error getting metric summary: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/monitoring/dashboard")
async def get_monitoring_dashboard():
    """Get comprehensive monitoring dashboard."""
    try:
        return monitoring_system.get_performance_dashboard()
    except Exception as e:
        logger.error(f"Error getting monitoring dashboard: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/monitoring/alerts")
async def create_custom_alert(alert_config: Dict[str, Any]):
    """Create a custom monitoring alert."""
    try:
        # Validate required fields
        required_fields = ['name', 'description', 'condition', 'threshold', 'severity']
        for field in required_fields:
            if field not in alert_config:
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
        
        # Parse severity
        try:
            severity = AlertSeverity(alert_config['severity'])
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid severity level")
        
        alert_id = await monitoring_system.create_custom_alert(
            name=alert_config['name'],
            description=alert_config['description'],
            condition=alert_config['condition'],
            threshold=float(alert_config['threshold']),
            severity=severity,
            duration=alert_config.get('duration', 300)
        )
        
        return {
            "alert_id": alert_id,
            "status": "created",
            "message": "Custom alert created successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating custom alert: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/monitoring/alerts/{alert_id}")
async def delete_alert(
    alert_id: str = Path(..., description="Alert ID to delete")
):
    """Delete a monitoring alert."""
    try:
        success = await monitoring_system.delete_alert(alert_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Alert not found")
        
        return {
            "alert_id": alert_id,
            "status": "deleted",
            "message": "Alert deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting alert: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/analytics/reports/user-engagement")
async def get_user_engagement_report(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    user_segment: Optional[str] = Query(None, description="User segment filter")
):
    """Get user engagement report."""
    try:
        # Mock user engagement report
        report = {
            "report_type": "user_engagement",
            "period": {
                "start_date": start_date or "2023-01-01",
                "end_date": end_date or "2023-12-31"
            },
            "summary": {
                "total_active_users": 15420,
                "avg_engagement_score": 67.8,
                "total_recommendations": 156789,
                "total_clicks": 23456,
                "total_bookings": 4567,
                "overall_ctr": 0.149,
                "overall_conversion_rate": 0.029
            },
            "segments": {
                "high_engagement": {
                    "user_count": 3456,
                    "avg_score": 85.2,
                    "ctr": 0.234,
                    "conversion_rate": 0.067
                },
                "medium_engagement": {
                    "user_count": 8765,
                    "avg_score": 52.4,
                    "ctr": 0.123,
                    "conversion_rate": 0.018
                },
                "low_engagement": {
                    "user_count": 3199,
                    "avg_score": 23.1,
                    "ctr": 0.045,
                    "conversion_rate": 0.003
                }
            },
            "trends": {
                "weekly_engagement": [
                    {"week": "2023-W01", "avg_score": 65.2},
                    {"week": "2023-W02", "avg_score": 67.8},
                    {"week": "2023-W03", "avg_score": 69.1},
                    {"week": "2023-W04", "avg_score": 71.4}
                ]
            }
        }
        
        return report
        
    except Exception as e:
        logger.error(f"Error generating user engagement report: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/analytics/reports/algorithm-performance")
async def get_algorithm_performance_report(
    algorithm: Optional[str] = Query(None, description="Specific algorithm filter"),
    metric: Optional[str] = Query(None, description="Specific metric filter")
):
    """Get algorithm performance report."""
    try:
        # Mock algorithm performance report
        report = {
            "report_type": "algorithm_performance",
            "algorithms": {
                "collaborative_filtering": {
                    "accuracy": 0.82,
                    "precision": 0.78,
                    "recall": 0.85,
                    "f1_score": 0.81,
                    "coverage": 0.78,
                    "diversity": 0.65,
                    "usage_percentage": 35.2,
                    "avg_response_time_ms": 145
                },
                "content_based": {
                    "accuracy": 0.75,
                    "precision": 0.72,
                    "recall": 0.79,
                    "f1_score": 0.75,
                    "coverage": 0.92,
                    "diversity": 0.58,
                    "usage_percentage": 28.7,
                    "avg_response_time_ms": 89
                },
                "matrix_factorization": {
                    "accuracy": 0.80,
                    "precision": 0.76,
                    "recall": 0.84,
                    "f1_score": 0.80,
                    "coverage": 0.85,
                    "diversity": 0.71,
                    "usage_percentage": 25.1,
                    "avg_response_time_ms": 234
                },
                "hybrid": {
                    "accuracy": 0.85,
                    "precision": 0.81,
                    "recall": 0.89,
                    "f1_score": 0.85,
                    "coverage": 0.88,
                    "diversity": 0.73,
                    "usage_percentage": 11.0,
                    "avg_response_time_ms": 298
                }
            },
            "comparison": {
                "best_accuracy": "hybrid",
                "best_coverage": "content_based",
                "best_diversity": "hybrid",
                "fastest": "content_based"
            },
            "recommendations": [
                "Increase hybrid algorithm usage for better accuracy",
                "Optimize matrix factorization response time",
                "Consider ensemble methods for improved diversity"
            ]
        }
        
        # Filter by algorithm if specified
        if algorithm and algorithm in report["algorithms"]:
            report["algorithms"] = {algorithm: report["algorithms"][algorithm]}
        
        return report
        
    except Exception as e:
        logger.error(f"Error generating algorithm performance report: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/analytics/exports/csv")
async def export_analytics_csv(
    report_type: str = Query(..., description="Type of report to export"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)")
):
    """Export analytics data as CSV."""
    try:
        # Mock CSV export
        csv_data = {
            "report_type": report_type,
            "export_url": f"/downloads/analytics_{report_type}_{start_date}_{end_date}.csv",
            "file_size_kb": 145.7,
            "generated_at": "2023-01-01T12:00:00Z",
            "expires_at": "2023-01-02T12:00:00Z"
        }
        
        return csv_data
        
    except Exception as e:
        logger.error(f"Error exporting analytics CSV: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")