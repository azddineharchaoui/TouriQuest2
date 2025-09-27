"""
POI Analytics API Endpoints

Provides performance metrics for Points of Interest including visits, ratings,
engagement over time, and geographic heatmap data.
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

router = APIRouter(prefix="/analytics", tags=["poi-analytics"])


@router.get("/pois")
async def get_poi_analytics(
    days: int = Query(30, description="Number of days to analyze", ge=1, le=365),
    poi_id: Optional[str] = Query(None, description="Filter by specific POI ID"),
    category: Optional[str] = Query(None, description="Filter by POI category"),
    country_code: Optional[str] = Query(None, description="Filter by country code"),
    min_rating: Optional[float] = Query(None, description="Minimum rating filter", ge=1.0, le=5.0),
    include_heatmap: bool = Query(True, description="Include geographic heatmap data"),
    warehouse_db: AsyncSession = Depends(get_warehouse_db)
) -> Dict[str, Any]:
    """
    Get comprehensive POI performance metrics
    
    Returns JSON with:
    - poi_metrics: Array of POI performance data
    - summary: Aggregated statistics
    - heatmap_data: Geographic distribution (if requested)
    - time_series: Engagement over time
    """
    try:
        end_date = date.today()
        start_date = end_date - timedelta(days=days)
        
        # Build base query for POI metrics
        base_filters = [
            func.date(text("created_at")) >= start_date,
            func.date(text("created_at")) <= end_date
        ]
        
        if poi_id:
            base_filters.append(text("poi_id = :poi_id"))
        if category:
            base_filters.append(text("category = :category"))
        if country_code:
            base_filters.append(text("country_code = :country_code"))
        if min_rating:
            base_filters.append(text("average_rating >= :min_rating"))
        
        # POI Performance Metrics Query
        poi_metrics_query = text("""
            SELECT 
                poi.poi_id,
                poi.name,
                poi.category,
                poi.latitude,
                poi.longitude,
                poi.country_code,
                poi.region,
                COUNT(DISTINCT v.visit_id) as total_visits,
                COUNT(DISTINCT v.user_id) as unique_visitors,
                AVG(r.rating) as average_rating,
                COUNT(r.rating_id) as total_ratings,
                AVG(v.duration_minutes) as avg_visit_duration,
                COUNT(DISTINCT CASE WHEN v.created_at >= :recent_date THEN v.visit_id END) as recent_visits,
                SUM(CASE WHEN i.interaction_type = 'save' THEN 1 ELSE 0 END) as saves_count,
                SUM(CASE WHEN i.interaction_type = 'share' THEN 1 ELSE 0 END) as shares_count,
                SUM(CASE WHEN i.interaction_type = 'photo_upload' THEN 1 ELSE 0 END) as photos_count,
                COUNT(DISTINCT b.booking_id) as bookings_generated,
                SUM(b.total_amount) as revenue_generated
            FROM poi_fact poi
            LEFT JOIN poi_visits v ON poi.poi_id = v.poi_id 
                AND DATE(v.created_at) BETWEEN :start_date AND :end_date
            LEFT JOIN poi_ratings r ON poi.poi_id = r.poi_id 
                AND DATE(r.created_at) BETWEEN :start_date AND :end_date
            LEFT JOIN poi_interactions i ON poi.poi_id = i.poi_id 
                AND DATE(i.created_at) BETWEEN :start_date AND :end_date
            LEFT JOIN bookings b ON poi.poi_id = b.poi_id 
                AND DATE(b.created_at) BETWEEN :start_date AND :end_date
                AND b.status = 'confirmed'
            WHERE poi.is_active = TRUE
            GROUP BY poi.poi_id, poi.name, poi.category, poi.latitude, poi.longitude, 
                     poi.country_code, poi.region
            ORDER BY total_visits DESC
        """)
        
        # Execute POI metrics query
        params = {
            'start_date': start_date,
            'end_date': end_date,
            'recent_date': end_date - timedelta(days=7),
        }
        
        if poi_id:
            params['poi_id'] = poi_id
        if category:
            params['category'] = category
        if country_code:
            params['country_code'] = country_code
        if min_rating:
            params['min_rating'] = min_rating
        
        poi_result = await warehouse_db.execute(poi_metrics_query, params)
        poi_data = poi_result.fetchall()
        
        # Format POI metrics
        poi_metrics = []
        for row in poi_data:
            poi_metric = {
                "poi_id": str(row.poi_id),
                "name": row.name,
                "category": row.category,
                "location": {
                    "latitude": float(row.latitude) if row.latitude else None,
                    "longitude": float(row.longitude) if row.longitude else None,
                    "country_code": row.country_code,
                    "region": row.region
                },
                "visits": {
                    "total_visits": int(row.total_visits or 0),
                    "unique_visitors": int(row.unique_visitors or 0),
                    "recent_visits": int(row.recent_visits or 0),
                    "avg_visit_duration_minutes": float(row.avg_visit_duration or 0)
                },
                "ratings": {
                    "average_rating": float(row.average_rating or 0),
                    "total_ratings": int(row.total_ratings or 0)
                },
                "engagement": {
                    "saves_count": int(row.saves_count or 0),
                    "shares_count": int(row.shares_count or 0),
                    "photos_count": int(row.photos_count or 0)
                },
                "conversion": {
                    "bookings_generated": int(row.bookings_generated or 0),
                    "revenue_generated": float(row.revenue_generated or 0)
                }
            }
            poi_metrics.append(poi_metric)
        
        # Calculate summary statistics
        total_pois = len(poi_metrics)
        total_visits = sum(poi['visits']['total_visits'] for poi in poi_metrics)
        total_unique_visitors = sum(poi['visits']['unique_visitors'] for poi in poi_metrics)
        avg_rating_all = (
            sum(poi['ratings']['average_rating'] for poi in poi_metrics if poi['ratings']['average_rating'] > 0) / 
            len([poi for poi in poi_metrics if poi['ratings']['average_rating'] > 0])
        ) if poi_metrics else 0
        total_revenue = sum(poi['conversion']['revenue_generated'] for poi in poi_metrics)
        
        summary = {
            "total_pois": total_pois,
            "total_visits": total_visits,
            "total_unique_visitors": total_unique_visitors,
            "average_rating_overall": round(avg_rating_all, 2),
            "total_revenue_generated": float(total_revenue)
        }
        
        # Time series data for engagement trends
        time_series_query = text("""
            SELECT 
                DATE(v.created_at) as visit_date,
                COUNT(DISTINCT v.visit_id) as daily_visits,
                COUNT(DISTINCT v.user_id) as daily_unique_visitors,
                AVG(v.duration_minutes) as avg_duration,
                COUNT(DISTINCT r.rating_id) as daily_ratings,
                AVG(r.rating) as daily_avg_rating
            FROM poi_visits v
            LEFT JOIN poi_ratings r ON DATE(v.created_at) = DATE(r.created_at)
            WHERE DATE(v.created_at) BETWEEN :start_date AND :end_date
            GROUP BY DATE(v.created_at)
            ORDER BY visit_date ASC
        """)
        
        time_series_result = await warehouse_db.execute(time_series_query, params)
        time_series_data = time_series_result.fetchall()
        
        time_series = []
        for row in time_series_data:
            time_series.append({
                "date": row.visit_date.isoformat(),
                "visits": int(row.daily_visits or 0),
                "unique_visitors": int(row.daily_unique_visitors or 0),
                "avg_duration_minutes": float(row.avg_duration or 0),
                "ratings_count": int(row.daily_ratings or 0),
                "avg_rating": float(row.daily_avg_rating or 0)
            })
        
        # Heatmap data (geographic distribution)
        heatmap_data = []
        if include_heatmap and poi_metrics:
            # Aggregate visits by geographic coordinates
            location_visits = {}
            for poi in poi_metrics:
                lat = poi['location']['latitude']
                lng = poi['location']['longitude']
                if lat and lng:
                    key = f"{lat:.4f},{lng:.4f}"
                    if key not in location_visits:
                        location_visits[key] = {
                            "latitude": lat,
                            "longitude": lng,
                            "visits": 0,
                            "pois_count": 0,
                            "avg_rating": 0
                        }
                    location_visits[key]["visits"] += poi['visits']['total_visits']
                    location_visits[key]["pois_count"] += 1
                    location_visits[key]["avg_rating"] += poi['ratings']['average_rating']
            
            # Format heatmap data
            for loc_data in location_visits.values():
                if loc_data["pois_count"] > 0:
                    loc_data["avg_rating"] = loc_data["avg_rating"] / loc_data["pois_count"]
                    loc_data["intensity"] = min(loc_data["visits"] / 100, 1.0)  # Normalize intensity
                    heatmap_data.append(loc_data)
        
        return {
            "success": True,
            "data": {
                "poi_metrics": poi_metrics,
                "summary": summary,
                "time_series": time_series,
                "heatmap_data": heatmap_data if include_heatmap else None
            },
            "filters_applied": {
                "days": days,
                "poi_id": poi_id,
                "category": category,
                "country_code": country_code,
                "min_rating": min_rating,
                "include_heatmap": include_heatmap
            },
            "date_range": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            },
            "generated_at": datetime.utcnow().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Error in POI analytics endpoint: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve POI analytics: {str(e)}"
        )