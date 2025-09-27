"""
Conversion Analytics API Endpoints

Provides comprehensive conversion funnel analysis including channel-specific metrics,
drop-off rates, assisted conversions, and device-specific conversion data.
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

router = APIRouter(prefix="/analytics", tags=["conversion-analytics"])


@router.get("/conversion")
async def get_conversion_analytics(
    days: int = Query(30, description="Number of days to analyze", ge=1, le=365),
    channel: Optional[str] = Query(None, description="Filter by specific channel (organic, paid, referral, etc.)"),
    device_type: Optional[str] = Query(None, description="Filter by device type"),
    funnel_step: Optional[str] = Query(None, description="Filter by funnel step"),
    warehouse_db: AsyncSession = Depends(get_warehouse_db)
) -> Dict[str, Any]:
    """
    Get comprehensive conversion analytics
    
    Returns JSON with:
    - funnel_analysis: Conversion funnel by channel
    - drop_off_rates: Step-by-step drop-off analysis
    - assisted_conversions: Multi-touch attribution
    - device_conversion: Conversion rates by device type
    - channel_performance: Channel-specific metrics
    """
    try:
        end_date = date.today()
        start_date = end_date - timedelta(days=days)
        
        # Parameters for queries
        params = {
            'start_date': start_date,
            'end_date': end_date,
        }
        
        if channel:
            params['channel'] = channel
        if device_type:
            params['device_type'] = device_type
        if funnel_step:
            params['funnel_step'] = funnel_step
        
        # Conversion funnel analysis by channel
        funnel_query = text("""
            WITH funnel_steps AS (
                SELECT DISTINCT
                    f.channel,
                    f.funnel_step,
                    f.step_order,
                    COUNT(DISTINCT f.session_id) as step_sessions,
                    COUNT(DISTINCT f.user_id) as step_users,
                    COUNT(DISTINCT CASE WHEN f.converted = TRUE THEN f.session_id END) as step_conversions,
                    SUM(f.revenue_attributed) as step_revenue
                FROM conversion_funnel f
                WHERE DATE(f.event_timestamp) BETWEEN :start_date AND :end_date
                """ + (f" AND f.channel = :channel" if channel else "") + """
                """ + (f" AND f.device_type = :device_type" if device_type else "") + """
                """ + (f" AND f.funnel_step = :funnel_step" if funnel_step else "") + """
                GROUP BY f.channel, f.funnel_step, f.step_order
            ),
            channel_totals AS (
                SELECT 
                    channel,
                    MIN(CASE WHEN step_order = 1 THEN step_sessions END) as channel_entry_sessions,
                    MAX(CASE WHEN converted = TRUE THEN step_sessions END) as channel_conversions
                FROM funnel_steps
                GROUP BY channel
            )
            SELECT 
                fs.*,
                ct.channel_entry_sessions,
                ct.channel_conversions,
                CASE 
                    WHEN ct.channel_entry_sessions > 0 
                    THEN (fs.step_conversions::FLOAT / ct.channel_entry_sessions::FLOAT) * 100 
                    ELSE 0 
                END as conversion_rate_from_entry,
                CASE 
                    WHEN fs.step_sessions > 0 
                    THEN (fs.step_conversions::FLOAT / fs.step_sessions::FLOAT) * 100 
                    ELSE 0 
                END as step_conversion_rate
            FROM funnel_steps fs
            JOIN channel_totals ct ON fs.channel = ct.channel
            ORDER BY fs.channel, fs.step_order
        """)
        
        funnel_result = await warehouse_db.execute(funnel_query, params)
        funnel_data = funnel_result.fetchall()
        
        # Organize funnel data by channel
        funnel_analysis = {}
        for row in funnel_data:
            channel_name = row.channel
            if channel_name not in funnel_analysis:
                funnel_analysis[channel_name] = {
                    "channel": channel_name,
                    "total_entry_sessions": int(row.channel_entry_sessions or 0),
                    "total_conversions": int(row.channel_conversions or 0),
                    "overall_conversion_rate": 0,
                    "steps": []
                }
            
            # Calculate overall conversion rate
            if row.channel_entry_sessions and row.channel_entry_sessions > 0:
                funnel_analysis[channel_name]["overall_conversion_rate"] = round(
                    (row.channel_conversions / row.channel_entry_sessions) * 100, 2
                )
            
            # Add step data
            step_data = {
                "step_name": row.funnel_step,
                "step_order": int(row.step_order),
                "sessions": int(row.step_sessions or 0),
                "users": int(row.step_users or 0),
                "conversions": int(row.step_conversions or 0),
                "revenue": float(row.step_revenue or 0),
                "step_conversion_rate": round(float(row.step_conversion_rate or 0), 2),
                "conversion_rate_from_entry": round(float(row.conversion_rate_from_entry or 0), 2)
            }
            funnel_analysis[channel_name]["steps"].append(step_data)
        
        # Convert to list format
        funnel_analysis_list = list(funnel_analysis.values())
        
        # Drop-off analysis
        dropoff_query = text("""
            WITH step_transitions AS (
                SELECT 
                    f1.channel,
                    f1.funnel_step as from_step,
                    f1.step_order as from_order,
                    f2.funnel_step as to_step,
                    f2.step_order as to_order,
                    COUNT(DISTINCT f1.user_id) as users_at_from_step,
                    COUNT(DISTINCT CASE WHEN f2.user_id IS NOT NULL THEN f1.user_id END) as users_continued_to_next,
                    COUNT(DISTINCT CASE WHEN f2.user_id IS NULL THEN f1.user_id END) as users_dropped_off
                FROM conversion_funnel f1
                LEFT JOIN conversion_funnel f2 ON f1.user_id = f2.user_id 
                    AND f1.session_id = f2.session_id
                    AND f2.step_order = f1.step_order + 1
                    AND f2.event_timestamp > f1.event_timestamp
                WHERE DATE(f1.event_timestamp) BETWEEN :start_date AND :end_date
                """ + (f" AND f1.channel = :channel" if channel else "") + """
                """ + (f" AND f1.device_type = :device_type" if device_type else "") + """
                GROUP BY f1.channel, f1.funnel_step, f1.step_order, f2.funnel_step, f2.step_order
                HAVING COUNT(DISTINCT f1.user_id) > 0
            )
            SELECT 
                *,
                CASE 
                    WHEN users_at_from_step > 0 
                    THEN (users_dropped_off::FLOAT / users_at_from_step::FLOAT) * 100 
                    ELSE 0 
                END as drop_off_rate,
                CASE 
                    WHEN users_at_from_step > 0 
                    THEN (users_continued_to_next::FLOAT / users_at_from_step::FLOAT) * 100 
                    ELSE 0 
                END as continuation_rate
            FROM step_transitions
            ORDER BY channel, from_order
        """)
        
        dropoff_result = await warehouse_db.execute(dropoff_query, params)
        dropoff_data = dropoff_result.fetchall()
        
        drop_off_rates = []
        for row in dropoff_data:
            drop_off_rates.append({
                "channel": row.channel,
                "from_step": row.from_step,
                "to_step": row.to_step,
                "users_at_step": int(row.users_at_from_step or 0),
                "users_continued": int(row.users_continued_to_next or 0),
                "users_dropped": int(row.users_dropped_off or 0),
                "drop_off_rate": round(float(row.drop_off_rate or 0), 2),
                "continuation_rate": round(float(row.continuation_rate or 0), 2)
            })
        
        # Assisted conversions (multi-touch attribution)
        assisted_query = text("""
            WITH user_touchpoints AS (
                SELECT 
                    ac.user_id,
                    ac.conversion_id,
                    ac.conversion_value,
                    STRING_AGG(DISTINCT ac.channel, ' -> ' ORDER BY ac.touchpoint_timestamp) as customer_journey,
                    COUNT(DISTINCT ac.channel) as channels_involved,
                    MIN(ac.touchpoint_timestamp) as first_touch,
                    MAX(ac.touchpoint_timestamp) as last_touch,
                    ac.converting_channel,
                    CASE 
                        WHEN COUNT(DISTINCT ac.channel) > 1 THEN TRUE 
                        ELSE FALSE 
                    END as is_assisted_conversion
                FROM attribution_conversions ac
                WHERE DATE(ac.conversion_timestamp) BETWEEN :start_date AND :end_date
                """ + (f" AND ac.converting_channel = :channel" if channel else "") + """
                """ + (f" AND ac.device_type = :device_type" if device_type else "") + """
                GROUP BY ac.user_id, ac.conversion_id, ac.conversion_value, ac.converting_channel
            )
            SELECT 
                converting_channel,
                COUNT(DISTINCT conversion_id) as total_conversions,
                COUNT(DISTINCT CASE WHEN is_assisted_conversion = TRUE THEN conversion_id END) as assisted_conversions,
                COUNT(DISTINCT CASE WHEN is_assisted_conversion = FALSE THEN conversion_id END) as direct_conversions,
                SUM(conversion_value) as total_conversion_value,
                SUM(CASE WHEN is_assisted_conversion = TRUE THEN conversion_value ELSE 0 END) as assisted_conversion_value,
                AVG(channels_involved) as avg_touchpoints_per_conversion
            FROM user_touchpoints
            GROUP BY converting_channel
            ORDER BY total_conversions DESC
        """)
        
        assisted_result = await warehouse_db.execute(assisted_query, params)
        assisted_data = assisted_result.fetchall()
        
        assisted_conversions = []
        for row in assisted_data:
            assisted_rate = (
                (row.assisted_conversions / row.total_conversions * 100) 
                if row.total_conversions > 0 else 0
            )
            
            assisted_conversions.append({
                "channel": row.converting_channel,
                "total_conversions": int(row.total_conversions or 0),
                "assisted_conversions": int(row.assisted_conversions or 0),
                "direct_conversions": int(row.direct_conversions or 0),
                "assisted_rate": round(assisted_rate, 2),
                "total_value": float(row.total_conversion_value or 0),
                "assisted_value": float(row.assisted_conversion_value or 0),
                "avg_touchpoints": round(float(row.avg_touchpoints_per_conversion or 0), 2)
            })
        
        # Device-specific conversion analysis
        device_query = text("""
            SELECT 
                c.device_type,
                c.browser_name,
                c.operating_system,
                COUNT(DISTINCT c.session_id) as total_sessions,
                COUNT(DISTINCT c.user_id) as unique_users,
                COUNT(DISTINCT CASE WHEN c.converted = TRUE THEN c.session_id END) as conversions,
                SUM(CASE WHEN c.converted = TRUE THEN c.conversion_value ELSE 0 END) as conversion_value,
                AVG(c.time_to_conversion_minutes) as avg_time_to_conversion
            FROM conversion_events c
            WHERE DATE(c.event_timestamp) BETWEEN :start_date AND :end_date
            """ + (f" AND c.channel = :channel" if channel else "") + """
            GROUP BY c.device_type, c.browser_name, c.operating_system
            ORDER BY conversions DESC
        """)
        
        device_result = await warehouse_db.execute(device_query, params)
        device_data = device_result.fetchall()
        
        device_conversion = []
        for row in device_data:
            conversion_rate = (
                (row.conversions / row.total_sessions * 100) 
                if row.total_sessions > 0 else 0
            )
            
            device_conversion.append({
                "device_type": row.device_type,
                "browser": row.browser_name,
                "operating_system": row.operating_system,
                "sessions": int(row.total_sessions or 0),
                "unique_users": int(row.unique_users or 0),
                "conversions": int(row.conversions or 0),
                "conversion_rate": round(conversion_rate, 2),
                "conversion_value": float(row.conversion_value or 0),
                "avg_time_to_conversion_minutes": float(row.avg_time_to_conversion or 0)
            })
        
        # Overall channel performance summary
        channel_summary_query = text("""
            SELECT 
                c.channel,
                COUNT(DISTINCT c.session_id) as channel_sessions,
                COUNT(DISTINCT c.user_id) as channel_users,
                COUNT(DISTINCT CASE WHEN c.converted = TRUE THEN c.session_id END) as channel_conversions,
                SUM(CASE WHEN c.converted = TRUE THEN c.conversion_value ELSE 0 END) as channel_revenue,
                AVG(CASE WHEN c.converted = TRUE THEN c.conversion_value END) as avg_conversion_value
            FROM conversion_events c
            WHERE DATE(c.event_timestamp) BETWEEN :start_date AND :end_date
            """ + (f" AND c.device_type = :device_type" if device_type else "") + """
            GROUP BY c.channel
            ORDER BY channel_conversions DESC
        """)
        
        channel_summary_result = await warehouse_db.execute(channel_summary_query, params)
        channel_summary_data = channel_summary_result.fetchall()
        
        channel_performance = []
        for row in channel_summary_data:
            conversion_rate = (
                (row.channel_conversions / row.channel_sessions * 100) 
                if row.channel_sessions > 0 else 0
            )
            
            channel_performance.append({
                "channel": row.channel,
                "sessions": int(row.channel_sessions or 0),
                "users": int(row.channel_users or 0),
                "conversions": int(row.channel_conversions or 0),
                "conversion_rate": round(conversion_rate, 2),
                "revenue": float(row.channel_revenue or 0),
                "avg_conversion_value": float(row.avg_conversion_value or 0)
            })
        
        # Calculate overall summary
        total_sessions = sum(ch['sessions'] for ch in channel_performance)
        total_conversions = sum(ch['conversions'] for ch in channel_performance)
        total_revenue = sum(ch['revenue'] for ch in channel_performance)
        overall_conversion_rate = (
            (total_conversions / total_sessions * 100) if total_sessions > 0 else 0
        )
        
        summary = {
            "total_sessions": total_sessions,
            "total_conversions": total_conversions,
            "overall_conversion_rate": round(overall_conversion_rate, 2),
            "total_revenue": float(total_revenue),
            "avg_conversion_value": (
                float(total_revenue / total_conversions) if total_conversions > 0 else 0
            )
        }
        
        return {
            "success": True,
            "data": {
                "funnel_analysis": funnel_analysis_list,
                "drop_off_rates": drop_off_rates,
                "assisted_conversions": assisted_conversions,
                "device_conversion": device_conversion,
                "channel_performance": channel_performance,
                "summary": summary
            },
            "filters_applied": {
                "days": days,
                "channel": channel,
                "device_type": device_type,
                "funnel_step": funnel_step
            },
            "date_range": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            },
            "generated_at": datetime.utcnow().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Error in conversion analytics endpoint: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve conversion analytics: {str(e)}"
        )