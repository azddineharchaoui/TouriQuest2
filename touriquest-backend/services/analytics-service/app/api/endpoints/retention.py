"""
Retention Analytics API Endpoints

Provides cohort analysis, retention curves, and user lifecycle metrics
to understand customer retention patterns over time.
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

router = APIRouter(prefix="/analytics", tags=["retention-analytics"])


@router.get("/retention")
async def get_retention_analytics(
    cohort_period: str = Query("weekly", description="Cohort period: weekly, monthly, quarterly"),
    lookback_periods: int = Query(12, description="Number of periods to analyze", ge=4, le=52),
    user_segment: Optional[str] = Query(None, description="Filter by user segment"),
    acquisition_channel: Optional[str] = Query(None, description="Filter by acquisition channel"),
    warehouse_db: AsyncSession = Depends(get_warehouse_db)
) -> Dict[str, Any]:
    """
    Get comprehensive retention analytics with cohort analysis
    
    Returns JSON with:
    - cohort_analysis: Cohort retention matrix
    - retention_curves: Retention percentage over time
    - lifecycle_metrics: User lifecycle stage distribution
    - segment_analysis: Retention by user segments
    """
    try:
        # Calculate date ranges based on cohort period
        end_date = date.today()
        
        if cohort_period == "weekly":
            period_days = 7
            date_trunc = "week"
        elif cohort_period == "monthly":
            period_days = 30
            date_trunc = "month"  
        elif cohort_period == "quarterly":
            period_days = 90
            date_trunc = "quarter"
        else:
            raise HTTPException(status_code=400, detail="Invalid cohort_period. Use 'weekly', 'monthly', or 'quarterly'")
        
        start_date = end_date - timedelta(days=lookback_periods * period_days)
        
        # Parameters for queries
        params = {
            'start_date': start_date,
            'end_date': end_date,
            'lookback_periods': lookback_periods,
        }
        
        if user_segment:
            params['user_segment'] = user_segment
        if acquisition_channel:
            params['acquisition_channel'] = acquisition_channel
        
        # Cohort analysis query
        cohort_query = text(f"""
            WITH user_cohorts AS (
                SELECT 
                    u.user_id,
                    u.user_segment,
                    u.acquisition_channel,
                    DATE_TRUNC('{date_trunc}', u.created_at) as cohort_period,
                    u.created_at as first_activity
                FROM users u
                WHERE DATE_TRUNC('{date_trunc}', u.created_at) >= :start_date
                """ + (f" AND u.user_segment = :user_segment" if user_segment else "") + """
                """ + (f" AND u.acquisition_channel = :acquisition_channel" if acquisition_channel else "") + """
            ),
            user_activities AS (
                SELECT 
                    a.user_id,
                    DATE_TRUNC('{date_trunc}', a.activity_date) as activity_period,
                    COUNT(DISTINCT a.activity_date) as active_days,
                    SUM(a.session_duration_minutes) as total_engagement_minutes,
                    COUNT(DISTINCT a.session_id) as sessions,
                    MAX(a.activity_date) as last_activity_date
                FROM user_activity_summary a
                WHERE a.activity_date >= :start_date
                    AND a.activity_date <= :end_date
                GROUP BY a.user_id, DATE_TRUNC('{date_trunc}', a.activity_date)
            ),
            cohort_activities AS (
                SELECT 
                    uc.cohort_period,
                    uc.user_segment,
                    uc.acquisition_channel,
                    ua.activity_period,
                    COUNT(DISTINCT uc.user_id) as cohort_size,
                    COUNT(DISTINCT ua.user_id) as retained_users,
                    EXTRACT(EPOCH FROM (ua.activity_period - uc.cohort_period)) / (86400 * {period_days}) as period_number
                FROM user_cohorts uc
                LEFT JOIN user_activities ua ON uc.user_id = ua.user_id
                WHERE ua.activity_period >= uc.cohort_period
                GROUP BY uc.cohort_period, uc.user_segment, uc.acquisition_channel, 
                         ua.activity_period
            ),
            cohort_sizes AS (
                SELECT 
                    cohort_period,
                    user_segment,
                    acquisition_channel,
                    COUNT(DISTINCT user_id) as cohort_size
                FROM user_cohorts
                GROUP BY cohort_period, user_segment, acquisition_channel
            )
            SELECT 
                ca.cohort_period,
                ca.user_segment,
                ca.acquisition_channel,
                ca.period_number,
                cs.cohort_size,
                ca.retained_users,
                CASE 
                    WHEN cs.cohort_size > 0 
                    THEN (ca.retained_users::FLOAT / cs.cohort_size::FLOAT) * 100 
                    ELSE 0 
                END as retention_rate
            FROM cohort_activities ca
            JOIN cohort_sizes cs ON ca.cohort_period = cs.cohort_period
                AND COALESCE(ca.user_segment, '') = COALESCE(cs.user_segment, '')
                AND COALESCE(ca.acquisition_channel, '') = COALESCE(cs.acquisition_channel, '')
            WHERE ca.period_number IS NOT NULL 
                AND ca.period_number >= 0 
                AND ca.period_number <= :lookback_periods
            ORDER BY ca.cohort_period, ca.period_number
        """)
        
        cohort_result = await warehouse_db.execute(cohort_query, params)
        cohort_data = cohort_result.fetchall()
        
        # Organize cohort data
        cohort_analysis = {}
        retention_curves = {}
        
        for row in cohort_data:
            cohort_key = row.cohort_period.isoformat()
            segment_key = f"{row.user_segment or 'all'}_{row.acquisition_channel or 'all'}"
            
            # Cohort analysis matrix
            if cohort_key not in cohort_analysis:
                cohort_analysis[cohort_key] = {
                    "cohort_period": cohort_key,
                    "cohort_size": int(row.cohort_size or 0),
                    "user_segment": row.user_segment,
                    "acquisition_channel": row.acquisition_channel,
                    "retention_by_period": {}
                }
            
            period_num = int(row.period_number)
            cohort_analysis[cohort_key]["retention_by_period"][f"period_{period_num}"] = {
                "period_number": period_num,
                "retained_users": int(row.retained_users or 0),
                "retention_rate": round(float(row.retention_rate or 0), 2)
            }
            
            # Retention curves by segment
            if segment_key not in retention_curves:
                retention_curves[segment_key] = {
                    "segment": segment_key,
                    "user_segment": row.user_segment,
                    "acquisition_channel": row.acquisition_channel,
                    "periods": []
                }
            
            # Add to retention curves (average across cohorts for each period)
            existing_period = next((p for p in retention_curves[segment_key]["periods"] 
                                  if p["period_number"] == period_num), None)
            
            if existing_period:
                # Average with existing data
                existing_period["retention_rate"] = (
                    existing_period["retention_rate"] + float(row.retention_rate or 0)
                ) / 2
                existing_period["cohorts_count"] += 1
            else:
                retention_curves[segment_key]["periods"].append({
                    "period_number": period_num,
                    "retention_rate": round(float(row.retention_rate or 0), 2),
                    "cohorts_count": 1
                })
        
        # Convert to lists and sort
        cohort_analysis_list = sorted(cohort_analysis.values(), 
                                    key=lambda x: x["cohort_period"], reverse=True)
        
        for segment in retention_curves.values():
            segment["periods"] = sorted(segment["periods"], key=lambda x: x["period_number"])
        
        retention_curves_list = list(retention_curves.values())
        
        # User lifecycle metrics
        lifecycle_query = text("""
            WITH user_lifecycle AS (
                SELECT 
                    u.user_id,
                    u.user_segment,
                    u.acquisition_channel,
                    u.created_at,
                    COALESCE(last_activity.last_seen, u.created_at) as last_activity_date,
                    EXTRACT(DAY FROM (CURRENT_DATE - COALESCE(last_activity.last_seen, u.created_at))) as days_since_last_activity,
                    COALESCE(activity_stats.total_sessions, 0) as lifetime_sessions,
                    COALESCE(activity_stats.total_days_active, 0) as lifetime_active_days,
                    COALESCE(booking_stats.total_bookings, 0) as lifetime_bookings,
                    COALESCE(booking_stats.total_revenue, 0) as lifetime_value
                FROM users u
                LEFT JOIN (
                    SELECT 
                        user_id,
                        MAX(activity_date) as last_seen
                    FROM user_activity_summary
                    GROUP BY user_id
                ) last_activity ON u.user_id = last_activity.user_id
                LEFT JOIN (
                    SELECT 
                        user_id,
                        COUNT(DISTINCT session_id) as total_sessions,
                        COUNT(DISTINCT activity_date) as total_days_active
                    FROM user_activity_summary
                    GROUP BY user_id
                ) activity_stats ON u.user_id = activity_stats.user_id
                LEFT JOIN (
                    SELECT 
                        user_id,
                        COUNT(DISTINCT booking_id) as total_bookings,
                        SUM(total_amount) as total_revenue
                    FROM bookings
                    WHERE status = 'confirmed'
                    GROUP BY user_id
                ) booking_stats ON u.user_id = booking_stats.user_id
                WHERE u.created_at >= :start_date
                """ + (f" AND u.user_segment = :user_segment" if user_segment else "") + """
                """ + (f" AND u.acquisition_channel = :acquisition_channel" if acquisition_channel else "") + """
            )
            SELECT 
                user_segment,
                acquisition_channel,
                CASE 
                    WHEN days_since_last_activity <= 7 THEN 'active'
                    WHEN days_since_last_activity <= 30 THEN 'at_risk'
                    WHEN days_since_last_activity <= 90 THEN 'dormant'
                    ELSE 'churned'
                END as lifecycle_stage,
                COUNT(DISTINCT user_id) as users_count,
                AVG(lifetime_sessions) as avg_lifetime_sessions,
                AVG(lifetime_active_days) as avg_lifetime_active_days,
                AVG(lifetime_bookings) as avg_lifetime_bookings,
                AVG(lifetime_value) as avg_lifetime_value
            FROM user_lifecycle
            GROUP BY user_segment, acquisition_channel, 
                CASE 
                    WHEN days_since_last_activity <= 7 THEN 'active'
                    WHEN days_since_last_activity <= 30 THEN 'at_risk'
                    WHEN days_since_last_activity <= 90 THEN 'dormant'
                    ELSE 'churned'
                END
            ORDER BY user_segment, acquisition_channel, lifecycle_stage
        """)
        
        lifecycle_result = await warehouse_db.execute(lifecycle_query, params)
        lifecycle_data = lifecycle_result.fetchall()
        
        # Organize lifecycle metrics
        lifecycle_metrics = []
        segment_totals = {}
        
        for row in lifecycle_data:
            segment_key = f"{row.user_segment or 'all'}_{row.acquisition_channel or 'all'}"
            
            if segment_key not in segment_totals:
                segment_totals[segment_key] = 0
            segment_totals[segment_key] += int(row.users_count or 0)
            
            lifecycle_metrics.append({
                "user_segment": row.user_segment,
                "acquisition_channel": row.acquisition_channel,
                "lifecycle_stage": row.lifecycle_stage,
                "users_count": int(row.users_count or 0),
                "avg_lifetime_sessions": round(float(row.avg_lifetime_sessions or 0), 2),
                "avg_lifetime_active_days": round(float(row.avg_lifetime_active_days or 0), 2),
                "avg_lifetime_bookings": round(float(row.avg_lifetime_bookings or 0), 2),
                "avg_lifetime_value": round(float(row.avg_lifetime_value or 0), 2)
            })
        
        # Add percentages to lifecycle metrics
        for metric in lifecycle_metrics:
            segment_key = f"{metric['user_segment'] or 'all'}_{metric['acquisition_channel'] or 'all'}"
            total_users = segment_totals.get(segment_key, 0)
            metric["percentage_of_segment"] = (
                round((metric["users_count"] / total_users * 100), 2) 
                if total_users > 0 else 0
            )
        
        # Calculate summary metrics
        total_users_analyzed = sum(segment_totals.values())
        overall_active_users = sum(m["users_count"] for m in lifecycle_metrics 
                                 if m["lifecycle_stage"] == "active")
        overall_retention_rate = (
            (overall_active_users / total_users_analyzed * 100) 
            if total_users_analyzed > 0 else 0
        )
        
        # Calculate average retention by period across all cohorts
        all_period_data = {}
        for cohort in cohort_analysis_list:
            for period_key, period_data in cohort["retention_by_period"].items():
                period_num = period_data["period_number"]
                if period_num not in all_period_data:
                    all_period_data[period_num] = []
                all_period_data[period_num].append(period_data["retention_rate"])
        
        average_retention_curve = []
        for period_num in sorted(all_period_data.keys()):
            rates = all_period_data[period_num]
            avg_rate = sum(rates) / len(rates) if rates else 0
            average_retention_curve.append({
                "period_number": period_num,
                "average_retention_rate": round(avg_rate, 2),
                "cohorts_included": len(rates)
            })
        
        summary = {
            "total_users_analyzed": total_users_analyzed,
            "cohort_period": cohort_period,
            "lookback_periods": lookback_periods,
            "active_users": overall_active_users,
            "overall_retention_rate": round(overall_retention_rate, 2),
            "average_retention_curve": average_retention_curve
        }
        
        return {
            "success": True,
            "data": {
                "cohort_analysis": cohort_analysis_list,
                "retention_curves": retention_curves_list,
                "lifecycle_metrics": lifecycle_metrics,
                "summary": summary
            },
            "filters_applied": {
                "cohort_period": cohort_period,
                "lookback_periods": lookback_periods,
                "user_segment": user_segment,
                "acquisition_channel": acquisition_channel
            },
            "date_range": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            },
            "generated_at": datetime.utcnow().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Error in retention analytics endpoint: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve retention analytics: {str(e)}"
        )