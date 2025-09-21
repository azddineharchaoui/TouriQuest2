"""
Analytics Dashboard API Endpoints
"""

from datetime import date, timedelta
from typing import Dict, List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from app.core.database import get_analytics_db, get_warehouse_db
from app.services.analytics_service import AnalyticsService
from app.services.reporting_service import ReportingService
from app.models.analytics_models import DataGranularity


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics", tags=["analytics-dashboard"])


@router.get("/dashboard")
async def get_analytics_dashboard(
    days: int = Query(30, description="Number of days to analyze", ge=1, le=365),
    country_code: Optional[str] = Query(None, description="Filter by country code"),
    property_type: Optional[str] = Query(None, description="Filter by property type"),
    user_segment: Optional[str] = Query(None, description="Filter by user segment"),
    warehouse_db: AsyncSession = Depends(get_warehouse_db),
    reporting_service: ReportingService = Depends(lambda: ReportingService())
) -> Dict[str, Any]:
    """
    Get comprehensive analytics dashboard data
    
    Returns:
    - Summary metrics with trends
    - Revenue analytics
    - User behavior metrics
    - Property performance
    - Geographic distribution
    - Conversion funnel
    - Top performing properties
    - Recent activity
    - Performance alerts
    """
    try:
        filters = {}
        if country_code:
            filters["country_code"] = country_code
        if property_type:
            filters["property_type"] = property_type
        if user_segment:
            filters["user_segment"] = user_segment
        
        dashboard_data = await reporting_service.generate_dashboard_data(
            warehouse_db, 
            date_range=days,
            filters=filters if filters else None
        )
        
        return {
            "success": True,
            "data": dashboard_data,
            "filters_applied": filters,
            "generated_at": dashboard_data.get("date_range", {})
        }
        
    except Exception as e:
        logger.error(f"Error generating dashboard: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate dashboard: {str(e)}")


@router.get("/summary")
async def get_summary_metrics(
    start_date: Optional[date] = Query(None, description="Start date for analysis"),
    end_date: Optional[date] = Query(None, description="End date for analysis"),
    granularity: DataGranularity = Query(DataGranularity.DAILY, description="Data granularity"),
    categories: Optional[List[str]] = Query(None, description="Property categories to include"),
    analytics_db: AsyncSession = Depends(get_analytics_db),
    analytics_service: AnalyticsService = Depends(lambda: AnalyticsService())
) -> Dict[str, Any]:
    """
    Get key business metrics summary
    
    Returns:
    - Revenue metrics
    - Conversion rates  
    - User acquisition metrics
    - Market penetration data
    """
    try:
        if not start_date:
            start_date = date.today() - timedelta(days=30)
        if not end_date:
            end_date = date.today()
        
        if end_date <= start_date:
            raise HTTPException(status_code=400, detail="End date must be after start date")
        
        metrics = await analytics_service.calculate_business_metrics(
            analytics_db,
            start_date=start_date,
            end_date=end_date,
            granularity=granularity,
            categories=categories
        )
        
        # Organize metrics by type
        organized_metrics = {
            "revenue": [],
            "conversion": [],
            "user_acquisition": [],
            "market": []
        }
        
        for metric in metrics:
            if "revenue" in metric.metric_name:
                organized_metrics["revenue"].append({
                    "name": metric.metric_name,
                    "value": metric.value,
                    "previous_value": metric.previous_value,
                    "percentage_change": metric.percentage_change,
                    "metadata": metric.metadata
                })
            elif "conversion" in metric.metric_name:
                organized_metrics["conversion"].append({
                    "name": metric.metric_name,
                    "value": metric.value,
                    "metadata": metric.metadata
                })
            elif any(keyword in metric.metric_name for keyword in ["user", "retention", "acquisition"]):
                organized_metrics["user_acquisition"].append({
                    "name": metric.metric_name,
                    "value": metric.value,
                    "metadata": metric.metadata
                })
            else:
                organized_metrics["market"].append({
                    "name": metric.metric_name,
                    "value": metric.value,
                    "metadata": metric.metadata
                })
        
        return {
            "success": True,
            "data": organized_metrics,
            "period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "granularity": granularity.value
            },
            "total_metrics": len(metrics)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating summary metrics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to calculate metrics: {str(e)}")


@router.get("/performance")
async def get_performance_metrics(
    service_name: Optional[str] = Query(None, description="Filter by service name"),
    endpoint: Optional[str] = Query(None, description="Filter by endpoint"),
    hours: int = Query(24, description="Hours to analyze", ge=1, le=168),
    analytics_db: AsyncSession = Depends(get_analytics_db)
) -> Dict[str, Any]:
    """
    Get system performance metrics
    
    Returns:
    - API response times
    - Error rates
    - System resource usage
    - Database performance
    """
    try:
        from sqlalchemy import select, func, and_
        from app.models.analytics_models import PerformanceMetric
        
        end_time = date.today()
        start_time = end_time - timedelta(hours=hours)
        
        # Base query
        query = select(
            func.avg(PerformanceMetric.response_time_ms).label('avg_response_time'),
            func.max(PerformanceMetric.response_time_ms).label('max_response_time'),
            func.min(PerformanceMetric.response_time_ms).label('min_response_time'),
            func.sum(PerformanceMetric.request_count).label('total_requests'),
            func.sum(PerformanceMetric.error_count).label('total_errors'),
            func.avg(PerformanceMetric.success_rate).label('avg_success_rate'),
            func.avg(PerformanceMetric.cpu_usage_percent).label('avg_cpu_usage'),
            func.avg(PerformanceMetric.memory_usage_mb).label('avg_memory_usage')
        ).where(
            PerformanceMetric.date >= start_time
        )
        
        if service_name:
            query = query.where(PerformanceMetric.service_name == service_name)
        if endpoint:
            query = query.where(PerformanceMetric.endpoint == endpoint)
        
        result = await analytics_db.execute(query)
        perf_data = result.first()
        
        # Get detailed breakdown by service
        service_query = select(
            PerformanceMetric.service_name,
            func.avg(PerformanceMetric.response_time_ms).label('avg_response_time'),
            func.sum(PerformanceMetric.request_count).label('total_requests'),
            func.avg(PerformanceMetric.success_rate).label('success_rate')
        ).where(
            PerformanceMetric.date >= start_time
        ).group_by(PerformanceMetric.service_name)
        
        service_result = await analytics_db.execute(service_query)
        service_breakdown = []
        
        for row in service_result:
            service_breakdown.append({
                "service_name": row.service_name,
                "average_response_time": float(row.avg_response_time or 0),
                "total_requests": row.total_requests or 0,
                "success_rate": float(row.success_rate or 0)
            })
        
        # Calculate error rate
        total_requests = perf_data.total_requests or 0
        total_errors = perf_data.total_errors or 0
        error_rate = (total_errors / total_requests * 100) if total_requests > 0 else 0
        
        return {
            "success": True,
            "data": {
                "overall_metrics": {
                    "average_response_time_ms": float(perf_data.avg_response_time or 0),
                    "max_response_time_ms": float(perf_data.max_response_time or 0),
                    "min_response_time_ms": float(perf_data.min_response_time or 0),
                    "total_requests": total_requests,
                    "total_errors": total_errors,
                    "error_rate_percent": error_rate,
                    "average_success_rate": float(perf_data.avg_success_rate or 0),
                    "average_cpu_usage_percent": float(perf_data.avg_cpu_usage or 0),
                    "average_memory_usage_mb": float(perf_data.avg_memory_usage or 0)
                },
                "service_breakdown": service_breakdown
            },
            "period": {
                "start_time": start_time.isoformat(),
                "hours_analyzed": hours
            },
            "filters": {
                "service_name": service_name,
                "endpoint": endpoint
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting performance metrics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get performance metrics: {str(e)}")


@router.get("/health")
async def get_health_metrics(
    analytics_db: AsyncSession = Depends(get_analytics_db),
    warehouse_db: AsyncSession = Depends(get_warehouse_db)
) -> Dict[str, Any]:
    """
    Get analytics service health metrics
    
    Returns:
    - Database connectivity status
    - Last ETL run status
    - Data freshness indicators
    - System status
    """
    try:
        # Check database connectivity
        analytics_health = True
        warehouse_health = True
        
        try:
            await analytics_db.execute("SELECT 1")
        except Exception:
            analytics_health = False
        
        try:
            await warehouse_db.execute("SELECT 1")
        except Exception:
            warehouse_health = False
        
        # Check last ETL run
        from sqlalchemy import select, desc
        from app.models.analytics_models import AnalyticsSession
        
        last_etl_query = select(AnalyticsSession).where(
            AnalyticsSession.session_type == 'full_etl'
        ).order_by(desc(AnalyticsSession.created_at)).limit(1)
        
        etl_result = await analytics_db.execute(last_etl_query)
        last_etl = etl_result.scalar_one_or_none()
        
        etl_status = {
            "last_run": last_etl.created_at.isoformat() if last_etl else None,
            "status": last_etl.status if last_etl else "never_run",
            "records_processed": last_etl.records_processed if last_etl else 0
        }
        
        # Overall health
        overall_health = analytics_health and warehouse_health and (
            last_etl and last_etl.status == "completed"
        )
        
        return {
            "success": True,
            "data": {
                "overall_health": "healthy" if overall_health else "degraded",
                "analytics_db_health": "healthy" if analytics_health else "unhealthy",
                "warehouse_db_health": "healthy" if warehouse_health else "unhealthy",
                "last_etl_run": etl_status,
                "timestamp": date.today().isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"Error checking health metrics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to check health: {str(e)}")


@router.get("/kpis")
async def get_key_performance_indicators(
    period: str = Query("month", description="Period: week, month, quarter, year"),
    warehouse_db: AsyncSession = Depends(get_warehouse_db)
) -> Dict[str, Any]:
    """
    Get key performance indicators (KPIs)
    
    Returns:
    - Revenue KPIs
    - User engagement KPIs  
    - Property performance KPIs
    - Operational KPIs
    """
    try:
        from sqlalchemy import select, func, and_
        from app.models.warehouse_models import FactBooking, FactUserActivity, FactProperty
        
        # Calculate date range based on period
        end_date = date.today()
        if period == "week":
            start_date = end_date - timedelta(days=7)
        elif period == "month":
            start_date = end_date - timedelta(days=30)
        elif period == "quarter":
            start_date = end_date - timedelta(days=90)
        elif period == "year":
            start_date = end_date - timedelta(days=365)
        else:
            start_date = end_date - timedelta(days=30)
        
        # Revenue KPIs
        revenue_query = select(
            func.sum(FactBooking.total_amount).label('total_revenue'),
            func.count(FactBooking.id).label('total_bookings'),
            func.avg(FactBooking.total_amount).label('average_booking_value'),
            func.count(FactBooking.user_id.distinct()).label('unique_customers')
        ).where(
            and_(
                FactBooking.booking_date >= start_date,
                FactBooking.booking_date <= end_date,
                FactBooking.booking_status == 'confirmed'
            )
        )
        
        revenue_result = await warehouse_db.execute(revenue_query)
        revenue_data = revenue_result.first()
        
        # User engagement KPIs
        engagement_query = select(
            func.count(FactUserActivity.user_id.distinct()).label('active_users'),
            func.avg(FactUserActivity.session_duration_minutes).label('avg_session_duration'),
            func.sum(FactUserActivity.page_views).label('total_page_views')
        ).where(
            and_(
                FactUserActivity.activity_date >= start_date,
                FactUserActivity.activity_date <= end_date
            )
        )
        
        engagement_result = await warehouse_db.execute(engagement_query)
        engagement_data = engagement_result.first()
        
        # Property performance KPIs
        property_query = select(
            func.count(FactProperty.property_id.distinct()).label('active_properties'),
            func.avg(FactProperty.occupancy_rate).label('avg_occupancy_rate'),
            func.avg(FactProperty.rating).label('avg_property_rating'),
            func.avg(FactProperty.revenue_per_available_night).label('avg_revpar')
        ).where(
            and_(
                FactProperty.date >= start_date,
                FactProperty.date <= end_date
            )
        )
        
        property_result = await warehouse_db.execute(property_query)
        property_data = property_result.first()
        
        kpis = {
            "revenue_kpis": {
                "total_revenue": float(revenue_data.total_revenue or 0),
                "total_bookings": revenue_data.total_bookings or 0,
                "average_booking_value": float(revenue_data.average_booking_value or 0),
                "unique_customers": revenue_data.unique_customers or 0,
                "revenue_per_customer": float(revenue_data.total_revenue / revenue_data.unique_customers) if revenue_data.unique_customers else 0
            },
            "engagement_kpis": {
                "active_users": engagement_data.active_users or 0,
                "average_session_duration_minutes": float(engagement_data.avg_session_duration or 0),
                "total_page_views": engagement_data.total_page_views or 0,
                "pages_per_user": float(engagement_data.total_page_views / engagement_data.active_users) if engagement_data.active_users else 0
            },
            "property_kpis": {
                "active_properties": property_data.active_properties or 0,
                "average_occupancy_rate": float(property_data.avg_occupancy_rate or 0),
                "average_property_rating": float(property_data.avg_property_rating or 0),
                "average_revpar": float(property_data.avg_revpar or 0)
            }
        }
        
        return {
            "success": True,
            "data": kpis,
            "period": {
                "type": period,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting KPIs: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get KPIs: {str(e)}")