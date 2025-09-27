"""
Traffic Analytics API Endpoints

Provides comprehensive website/app traffic metrics including daily visits,
session duration, bounce rate, traffic sources, and geographic distribution.
"""

from datetime import date, timedelta, datetime
from typing import Dict, List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc, case, extract, text
import logging
from decimal import Decimal

from app.core.database import get_analytics_db, get_warehouse_db
from app.services.analytics_service import AnalyticsService
from app.models.analytics_models import DataGranularity

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics", tags=["traffic-analytics"])


@router.get("/traffic")
async def get_traffic_analytics(
    days: int = Query(30, description="Number of days to analyze", ge=1, le=365),
    source: Optional[str] = Query(None, description="Filter by traffic source"),
    device_type: Optional[str] = Query(None, description="Filter by device type"),
    country_code: Optional[str] = Query(None, description="Filter by country code"),
    include_geo: bool = Query(True, description="Include geographic distribution"),
    warehouse_db: AsyncSession = Depends(get_warehouse_db)
) -> Dict[str, Any]:
    """
    Get comprehensive traffic analytics
    
    Returns JSON with:
    - daily_metrics: Daily traffic statistics
    - session_metrics: Session-based analytics
    - traffic_sources: Breakdown by source
    - device_analytics: Device type performance
    - geographic_distribution: Traffic by geography (if requested)
    """
    try:
        end_date = date.today()
        start_date = end_date - timedelta(days=days)
        
        # Parameters for queries
        params = {
            'start_date': start_date,
            'end_date': end_date,
            'recent_date': end_date - timedelta(days=7),
        }
        
        if source:
            params['source'] = source
        if device_type:
            params['device_type'] = device_type
        if country_code:
            params['country_code'] = country_code
        
        # Daily traffic metrics query
        daily_metrics_query = text("""
            SELECT 
                DATE(s.session_start) as traffic_date,
                COUNT(DISTINCT s.session_id) as daily_sessions,
                COUNT(DISTINCT s.user_id) as daily_unique_visitors,
                COUNT(DISTINCT s.visitor_id) as daily_total_visitors,
                AVG(s.session_duration_seconds) as avg_session_duration,
                AVG(s.pages_viewed) as avg_pages_per_session,
                SUM(CASE WHEN s.bounce = TRUE THEN 1 ELSE 0 END) as bounced_sessions,
                COUNT(DISTINCT CASE WHEN s.conversion = TRUE THEN s.session_id END) as converted_sessions,
                SUM(s.pages_viewed) as total_page_views,
                COUNT(DISTINCT s.landing_page) as unique_landing_pages
            FROM user_sessions s
            WHERE DATE(s.session_start) BETWEEN :start_date AND :end_date
            """ + (f" AND s.traffic_source = :source" if source else "") + """
            """ + (f" AND s.device_type = :device_type" if device_type else "") + """
            """ + (f" AND s.country_code = :country_code" if country_code else "") + """
            GROUP BY DATE(s.session_start)
            ORDER BY traffic_date ASC
        """)
        
        daily_result = await warehouse_db.execute(daily_metrics_query, params)
        daily_data = daily_result.fetchall()
        
        # Format daily metrics
        daily_metrics = []
        for row in daily_data:
            bounce_rate = (
                (row.bounced_sessions / row.daily_sessions * 100) 
                if row.daily_sessions > 0 else 0
            )
            conversion_rate = (
                (row.converted_sessions / row.daily_sessions * 100) 
                if row.daily_sessions > 0 else 0
            )
            
            daily_metrics.append({
                "date": row.traffic_date.isoformat(),
                "visits": {
                    "total_sessions": int(row.daily_sessions or 0),
                    "unique_visitors": int(row.daily_unique_visitors or 0),
                    "total_visitors": int(row.daily_total_visitors or 0)
                },
                "engagement": {
                    "avg_session_duration_seconds": float(row.avg_session_duration or 0),
                    "avg_pages_per_session": float(row.avg_pages_per_session or 0),
                    "total_page_views": int(row.total_page_views or 0),
                    "unique_landing_pages": int(row.unique_landing_pages or 0)
                },
                "conversion": {
                    "bounce_rate": round(bounce_rate, 2),
                    "conversion_rate": round(conversion_rate, 2),
                    "bounced_sessions": int(row.bounced_sessions or 0),
                    "converted_sessions": int(row.converted_sessions or 0)
                }
            })
        
        # Traffic sources breakdown
        sources_query = text("""
            SELECT 
                s.traffic_source,
                s.referrer_domain,
                COUNT(DISTINCT s.session_id) as sessions,
                COUNT(DISTINCT s.user_id) as unique_visitors,
                AVG(s.session_duration_seconds) as avg_duration,
                AVG(s.pages_viewed) as avg_pages,
                SUM(CASE WHEN s.bounce = TRUE THEN 1 ELSE 0 END) as bounces,
                COUNT(DISTINCT CASE WHEN s.conversion = TRUE THEN s.session_id END) as conversions,
                SUM(s.revenue_attributed) as attributed_revenue
            FROM user_sessions s
            WHERE DATE(s.session_start) BETWEEN :start_date AND :end_date
            """ + (f" AND s.device_type = :device_type" if device_type else "") + """
            """ + (f" AND s.country_code = :country_code" if country_code else "") + """
            GROUP BY s.traffic_source, s.referrer_domain
            ORDER BY sessions DESC
        """)
        
        sources_result = await warehouse_db.execute(sources_query, params)
        sources_data = sources_result.fetchall()
        
        traffic_sources = []
        for row in sources_data:
            bounce_rate = (row.bounces / row.sessions * 100) if row.sessions > 0 else 0
            conversion_rate = (row.conversions / row.sessions * 100) if row.sessions > 0 else 0
            
            traffic_sources.append({
                "source": row.traffic_source,
                "referrer_domain": row.referrer_domain,
                "metrics": {
                    "sessions": int(row.sessions or 0),
                    "unique_visitors": int(row.unique_visitors or 0),
                    "avg_session_duration": float(row.avg_duration or 0),
                    "avg_pages_per_session": float(row.avg_pages or 0),
                    "bounce_rate": round(bounce_rate, 2),
                    "conversion_rate": round(conversion_rate, 2),
                    "attributed_revenue": float(row.attributed_revenue or 0)
                }
            })
        
        # Device analytics
        device_query = text("""
            SELECT 
                s.device_type,
                s.browser_name,
                s.operating_system,
                COUNT(DISTINCT s.session_id) as sessions,
                COUNT(DISTINCT s.user_id) as unique_users,
                AVG(s.session_duration_seconds) as avg_duration,
                AVG(s.pages_viewed) as avg_pages,
                SUM(CASE WHEN s.bounce = TRUE THEN 1 ELSE 0 END) as bounces,
                COUNT(DISTINCT CASE WHEN s.conversion = TRUE THEN s.session_id END) as conversions
            FROM user_sessions s
            WHERE DATE(s.session_start) BETWEEN :start_date AND :end_date
            """ + (f" AND s.traffic_source = :source" if source else "") + """
            """ + (f" AND s.country_code = :country_code" if country_code else "") + """
            GROUP BY s.device_type, s.browser_name, s.operating_system
            ORDER BY sessions DESC
        """)
        
        device_result = await warehouse_db.execute(device_query, params)
        device_data = device_result.fetchall()
        
        device_analytics = []
        for row in device_data:
            bounce_rate = (row.bounces / row.sessions * 100) if row.sessions > 0 else 0
            conversion_rate = (row.conversions / row.sessions * 100) if row.sessions > 0 else 0
            
            device_analytics.append({
                "device_type": row.device_type,
                "browser": row.browser_name,
                "operating_system": row.operating_system,
                "metrics": {
                    "sessions": int(row.sessions or 0),
                    "unique_users": int(row.unique_users or 0),
                    "avg_session_duration": float(row.avg_duration or 0),
                    "avg_pages_per_session": float(row.avg_pages or 0),
                    "bounce_rate": round(bounce_rate, 2),
                    "conversion_rate": round(conversion_rate, 2)
                }
            })
        
        # Geographic distribution (if requested)
        geographic_distribution = []
        if include_geo:
            geo_query = text("""
                SELECT 
                    s.country_code,
                    s.country_name,
                    s.region,
                    s.city,
                    COUNT(DISTINCT s.session_id) as sessions,
                    COUNT(DISTINCT s.user_id) as unique_visitors,
                    AVG(s.session_duration_seconds) as avg_duration,
                    SUM(CASE WHEN s.bounce = TRUE THEN 1 ELSE 0 END) as bounces,
                    COUNT(DISTINCT CASE WHEN s.conversion = TRUE THEN s.session_id END) as conversions,
                    SUM(s.revenue_attributed) as revenue
                FROM user_sessions s
                WHERE DATE(s.session_start) BETWEEN :start_date AND :end_date
                """ + (f" AND s.traffic_source = :source" if source else "") + """
                """ + (f" AND s.device_type = :device_type" if device_type else "") + """
                GROUP BY s.country_code, s.country_name, s.region, s.city
                HAVING COUNT(DISTINCT s.session_id) > 5  -- Only include locations with significant traffic
                ORDER BY sessions DESC
                LIMIT 100
            """)
            
            geo_result = await warehouse_db.execute(geo_query, params)
            geo_data = geo_result.fetchall()
            
            for row in geo_data:
                bounce_rate = (row.bounces / row.sessions * 100) if row.sessions > 0 else 0
                conversion_rate = (row.conversions / row.sessions * 100) if row.sessions > 0 else 0
                
                geographic_distribution.append({
                    "location": {
                        "country_code": row.country_code,
                        "country_name": row.country_name,
                        "region": row.region,
                        "city": row.city
                    },
                    "metrics": {
                        "sessions": int(row.sessions or 0),
                        "unique_visitors": int(row.unique_visitors or 0),
                        "avg_session_duration": float(row.avg_duration or 0),
                        "bounce_rate": round(bounce_rate, 2),
                        "conversion_rate": round(conversion_rate, 2),
                        "revenue": float(row.revenue or 0)
                    }
                })
        
        # Calculate overall summary metrics
        total_sessions = sum(day['visits']['total_sessions'] for day in daily_metrics)
        total_unique_visitors = sum(day['visits']['unique_visitors'] for day in daily_metrics)
        total_page_views = sum(day['engagement']['total_page_views'] for day in daily_metrics)
        avg_session_duration = (
            sum(day['engagement']['avg_session_duration_seconds'] for day in daily_metrics) / len(daily_metrics)
        ) if daily_metrics else 0
        avg_bounce_rate = (
            sum(day['conversion']['bounce_rate'] for day in daily_metrics) / len(daily_metrics)
        ) if daily_metrics else 0
        
        summary = {
            "total_sessions": total_sessions,
            "total_unique_visitors": total_unique_visitors,
            "total_page_views": total_page_views,
            "avg_session_duration_seconds": round(avg_session_duration, 2),
            "avg_bounce_rate": round(avg_bounce_rate, 2),
            "date_range_days": days
        }
        
        return {
            "success": True,
            "data": {
                "daily_metrics": daily_metrics,
                "traffic_sources": traffic_sources,
                "device_analytics": device_analytics,
                "geographic_distribution": geographic_distribution if include_geo else None,
                "summary": summary
            },
            "filters_applied": {
                "days": days,
                "source": source,
                "device_type": device_type,
                "country_code": country_code,
                "include_geo": include_geo
            },
            "date_range": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            },
            "generated_at": datetime.utcnow().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Error in traffic analytics endpoint: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve traffic analytics: {str(e)}"
        )