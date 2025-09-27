"""
Engagement Analytics API Endpoints

Provides comprehensive engagement metrics including feature adoption,
time-on-page, viral coefficient, device usage, and voice/assistant analytics.
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

router = APIRouter(prefix="/analytics", tags=["engagement-analytics"])


@router.get("/engagement")
async def get_engagement_analytics(
    days: int = Query(30, description="Number of days to analyze", ge=1, le=365),
    feature: Optional[str] = Query(None, description="Filter by specific feature"),
    device_type: Optional[str] = Query(None, description="Filter by device type (mobile/desktop)"),
    user_segment: Optional[str] = Query(None, description="Filter by user segment"),
    include_heatmaps: bool = Query(True, description="Include heatmap arrays for frontend"),
    warehouse_db: AsyncSession = Depends(get_warehouse_db)
) -> Dict[str, Any]:
    """
    Get comprehensive engagement analytics
    
    Returns JSON with:
    - feature_adoption: Feature usage and adoption rates
    - time_metrics: Time-on-page and session engagement
    - viral_metrics: Viral coefficient and sharing analytics
    - device_comparison: Mobile vs desktop engagement
    - voice_assistant: Voice/assistant usage metrics
    - heatmaps: Page interaction heatmap data (if requested)
    """
    try:
        end_date = date.today()
        start_date = end_date - timedelta(days=days)
        
        # Parameters for queries
        params = {
            'start_date': start_date,
            'end_date': end_date,
        }
        
        if feature:
            params['feature'] = feature
        if device_type:
            params['device_type'] = device_type
        if user_segment:
            params['user_segment'] = user_segment
        
        # Feature adoption analysis
        feature_adoption_query = text("""
            WITH feature_usage AS (
                SELECT 
                    f.feature_name,
                    f.feature_category,
                    COUNT(DISTINCT f.user_id) as users_adopted,
                    COUNT(DISTINCT f.session_id) as sessions_used,
                    COUNT(f.event_id) as total_interactions,
                    AVG(f.interaction_duration_seconds) as avg_interaction_duration,
                    COUNT(DISTINCT CASE WHEN f.event_date >= :start_date THEN f.user_id END) as recent_adopters,
                    MIN(f.event_date) as first_adoption_date,
                    MAX(f.event_date) as latest_usage_date
                FROM feature_interactions f
                WHERE f.event_date BETWEEN :start_date AND :end_date
                """ + (f" AND f.feature_name = :feature" if feature else "") + """
                """ + (f" AND f.device_type = :device_type" if device_type else "") + """
                """ + (f" AND f.user_segment = :user_segment" if user_segment else "") + """
                GROUP BY f.feature_name, f.feature_category
            ),
            total_users AS (
                SELECT COUNT(DISTINCT user_id) as total_user_count
                FROM user_sessions
                WHERE session_start::date BETWEEN :start_date AND :end_date
                """ + (f" AND device_type = :device_type" if device_type else "") + """
                """ + (f" AND user_segment = :user_segment" if user_segment else "") + """
            )
            SELECT 
                fu.*,
                tu.total_user_count,
                CASE 
                    WHEN tu.total_user_count > 0 
                    THEN (fu.users_adopted::FLOAT / tu.total_user_count::FLOAT) * 100 
                    ELSE 0 
                END as adoption_rate
            FROM feature_usage fu
            CROSS JOIN total_users tu
            ORDER BY fu.users_adopted DESC
        """)
        
        feature_result = await warehouse_db.execute(feature_adoption_query, params)
        feature_data = feature_result.fetchall()
        
        # Time engagement metrics
        time_metrics_query = text("""
            SELECT 
                p.page_path,
                p.page_category,
                COUNT(DISTINCT p.session_id) as page_sessions,
                COUNT(DISTINCT p.user_id) as unique_visitors,
                AVG(p.time_on_page_seconds) as avg_time_on_page,
                PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY p.time_on_page_seconds) as median_time_on_page,
                AVG(p.scroll_depth_percentage) as avg_scroll_depth,
                COUNT(CASE WHEN p.bounced = FALSE THEN 1 END) as engaged_sessions,
                AVG(p.interactions_count) as avg_interactions_per_session
            FROM page_analytics p
            WHERE p.visit_date BETWEEN :start_date AND :end_date
            """ + (f" AND p.device_type = :device_type" if device_type else "") + """
            """ + (f" AND p.user_segment = :user_segment" if user_segment else "") + """
            GROUP BY p.page_path, p.page_category
            HAVING COUNT(DISTINCT p.session_id) > 10
            ORDER BY avg_time_on_page DESC
        """)
        
        time_result = await warehouse_db.execute(time_metrics_query, params)
        time_data = time_result.fetchall()
        
        # Viral coefficient metrics
        viral_metrics_query = text("""
            WITH sharing_data AS (
                SELECT 
                    s.share_type,
                    s.content_type,
                    s.sharing_user_id,
                    COUNT(DISTINCT s.share_id) as shares_made,
                    COUNT(DISTINCT r.referral_id) as successful_referrals,
                    COUNT(DISTINCT r.converted_user_id) as converted_referrals,
                    SUM(r.revenue_attributed) as referral_revenue
                FROM social_shares s
                LEFT JOIN referral_conversions r ON s.share_id = r.source_share_id
                WHERE s.share_date BETWEEN :start_date AND :end_date
                """ + (f" AND s.device_type = :device_type" if device_type else "") + """
                GROUP BY s.share_type, s.content_type, s.sharing_user_id
            ),
            viral_summary AS (
                SELECT 
                    share_type,
                    content_type,
                    COUNT(DISTINCT sharing_user_id) as sharing_users,
                    SUM(shares_made) as total_shares,
                    SUM(successful_referrals) as total_referrals,
                    SUM(converted_referrals) as total_conversions,
                    SUM(referral_revenue) as total_referral_revenue,
                    CASE 
                        WHEN COUNT(DISTINCT sharing_user_id) > 0 
                        THEN SUM(successful_referrals)::FLOAT / COUNT(DISTINCT sharing_user_id)::FLOAT 
                        ELSE 0 
                    END as viral_coefficient
                FROM sharing_data
                GROUP BY share_type, content_type
            )
            SELECT * FROM viral_summary
            ORDER BY viral_coefficient DESC
        """)
        
        viral_result = await warehouse_db.execute(viral_metrics_query, params)
        viral_data = viral_result.fetchall()
        
        # Device comparison metrics
        device_comparison_query = text("""
            SELECT 
                d.device_type,
                d.browser_name,
                d.operating_system,
                COUNT(DISTINCT d.session_id) as sessions,
                COUNT(DISTINCT d.user_id) as unique_users,
                AVG(d.session_duration_seconds) as avg_session_duration,
                AVG(d.pages_per_session) as avg_pages_per_session,
                SUM(CASE WHEN d.converted = TRUE THEN 1 ELSE 0 END) as conversions,
                AVG(d.engagement_score) as avg_engagement_score,
                COUNT(DISTINCT d.feature_interactions) as feature_interactions,
                AVG(d.time_to_first_interaction) as avg_time_to_first_interaction
            FROM device_engagement d
            WHERE d.session_date BETWEEN :start_date AND :end_date
            """ + (f" AND d.user_segment = :user_segment" if user_segment else "") + """
            GROUP BY d.device_type, d.browser_name, d.operating_system
            ORDER BY sessions DESC
        """)
        
        device_result = await warehouse_db.execute(device_comparison_query, params)
        device_data = device_result.fetchall()
        
        # Voice/Assistant usage metrics
        voice_assistant_query = text("""
            SELECT 
                v.interface_type,
                v.assistant_type,
                v.command_category,
                COUNT(DISTINCT v.interaction_id) as total_interactions,
                COUNT(DISTINCT v.user_id) as unique_users,
                COUNT(DISTINCT v.session_id) as sessions_with_voice,
                AVG(v.response_time_ms) as avg_response_time,
                COUNT(CASE WHEN v.success = TRUE THEN 1 END) as successful_interactions,
                COUNT(CASE WHEN v.success = FALSE THEN 1 END) as failed_interactions,
                AVG(v.user_satisfaction_score) as avg_satisfaction_score
            FROM voice_assistant_interactions v
            WHERE v.interaction_date BETWEEN :start_date AND :end_date
            """ + (f" AND v.device_type = :device_type" if device_type else "") + """
            """ + (f" AND v.user_segment = :user_segment" if user_segment else "") + """
            GROUP BY v.interface_type, v.assistant_type, v.command_category
            ORDER BY total_interactions DESC
        """)
        
        voice_result = await warehouse_db.execute(voice_assistant_query, params)
        voice_data = voice_result.fetchall()
        
        # Format feature adoption data
        feature_adoption = []
        for row in feature_data:
            feature_adoption.append({
                "feature_name": row.feature_name,
                "feature_category": row.feature_category,
                "adoption_metrics": {
                    "users_adopted": int(row.users_adopted or 0),
                    "adoption_rate": round(float(row.adoption_rate or 0), 2),
                    "recent_adopters": int(row.recent_adopters or 0),
                    "total_interactions": int(row.total_interactions or 0)
                },
                "engagement_metrics": {
                    "sessions_used": int(row.sessions_used or 0),
                    "avg_interaction_duration": float(row.avg_interaction_duration or 0)
                },
                "timeline": {
                    "first_adoption_date": row.first_adoption_date.isoformat() if row.first_adoption_date else None,
                    "latest_usage_date": row.latest_usage_date.isoformat() if row.latest_usage_date else None
                }
            })
        
        # Format time metrics data
        time_metrics = []
        for row in time_data:
            engagement_rate = (
                (row.engaged_sessions / row.page_sessions * 100) 
                if row.page_sessions > 0 else 0
            )
            
            time_metrics.append({
                "page_path": row.page_path,
                "page_category": row.page_category,
                "traffic_metrics": {
                    "page_sessions": int(row.page_sessions or 0),
                    "unique_visitors": int(row.unique_visitors or 0)
                },
                "time_metrics": {
                    "avg_time_on_page": float(row.avg_time_on_page or 0),
                    "median_time_on_page": float(row.median_time_on_page or 0),
                    "avg_scroll_depth": round(float(row.avg_scroll_depth or 0), 2)
                },
                "engagement_metrics": {
                    "engagement_rate": round(engagement_rate, 2),
                    "avg_interactions_per_session": float(row.avg_interactions_per_session or 0),
                    "engaged_sessions": int(row.engaged_sessions or 0)
                }
            })
        
        # Format viral metrics data
        viral_metrics = []
        for row in viral_data:
            conversion_rate = (
                (row.total_conversions / row.total_referrals * 100) 
                if row.total_referrals > 0 else 0
            )
            
            viral_metrics.append({
                "share_type": row.share_type,
                "content_type": row.content_type,
                "sharing_metrics": {
                    "sharing_users": int(row.sharing_users or 0),
                    "total_shares": int(row.total_shares or 0),
                    "viral_coefficient": round(float(row.viral_coefficient or 0), 3)
                },
                "referral_metrics": {
                    "total_referrals": int(row.total_referrals or 0),
                    "total_conversions": int(row.total_conversions or 0),
                    "conversion_rate": round(conversion_rate, 2),
                    "referral_revenue": float(row.total_referral_revenue or 0)
                }
            })
        
        # Format device comparison data
        device_comparison = []
        for row in device_data:
            conversion_rate = (
                (row.conversions / row.sessions * 100) 
                if row.sessions > 0 else 0
            )
            
            device_comparison.append({
                "device_info": {
                    "device_type": row.device_type,
                    "browser_name": row.browser_name,
                    "operating_system": row.operating_system
                },
                "usage_metrics": {
                    "sessions": int(row.sessions or 0),
                    "unique_users": int(row.unique_users or 0),
                    "avg_session_duration": float(row.avg_session_duration or 0),
                    "avg_pages_per_session": float(row.avg_pages_per_session or 0)
                },
                "engagement_metrics": {
                    "avg_engagement_score": float(row.avg_engagement_score or 0),
                    "feature_interactions": int(row.feature_interactions or 0),
                    "avg_time_to_first_interaction": float(row.avg_time_to_first_interaction or 0)
                },
                "conversion_metrics": {
                    "conversions": int(row.conversions or 0),
                    "conversion_rate": round(conversion_rate, 2)
                }
            })
        
        # Format voice/assistant data
        voice_assistant = []
        for row in voice_data:
            success_rate = (
                (row.successful_interactions / row.total_interactions * 100) 
                if row.total_interactions > 0 else 0
            )
            
            voice_assistant.append({
                "interface_info": {
                    "interface_type": row.interface_type,
                    "assistant_type": row.assistant_type,
                    "command_category": row.command_category
                },
                "usage_metrics": {
                    "total_interactions": int(row.total_interactions or 0),
                    "unique_users": int(row.unique_users or 0),
                    "sessions_with_voice": int(row.sessions_with_voice or 0)
                },
                "performance_metrics": {
                    "success_rate": round(success_rate, 2),
                    "avg_response_time_ms": float(row.avg_response_time_ms or 0),
                    "avg_satisfaction_score": float(row.avg_satisfaction_score or 0)
                }
            })
        
        # Heatmap data for frontend (if requested)
        heatmaps = []
        if include_heatmaps:
            heatmap_query = text("""
                SELECT 
                    h.page_path,
                    h.element_selector,
                    h.x_coordinate,
                    h.y_coordinate,
                    COUNT(*) as click_count,
                    AVG(h.viewport_width) as avg_viewport_width,
                    AVG(h.viewport_height) as avg_viewport_height,
                    h.device_type
                FROM page_heatmap_data h
                WHERE h.event_date BETWEEN :start_date AND :end_date
                """ + (f" AND h.device_type = :device_type" if device_type else "") + """
                GROUP BY h.page_path, h.element_selector, h.x_coordinate, h.y_coordinate, h.device_type
                HAVING COUNT(*) >= 5
                ORDER BY h.page_path, click_count DESC
            """)
            
            heatmap_result = await warehouse_db.execute(heatmap_query, params)
            heatmap_data = heatmap_result.fetchall()
            
            # Organize heatmap data by page
            heatmap_pages = {}
            for row in heatmap_data:
                page_key = f"{row.page_path}_{row.device_type}"
                if page_key not in heatmap_pages:
                    heatmap_pages[page_key] = {
                        "page_path": row.page_path,
                        "device_type": row.device_type,
                        "viewport_dimensions": {
                            "avg_width": int(row.avg_viewport_width or 1920),
                            "avg_height": int(row.avg_viewport_height or 1080)
                        },
                        "interaction_points": []
                    }
                
                heatmap_pages[page_key]["interaction_points"].append({
                    "x": int(row.x_coordinate),
                    "y": int(row.y_coordinate),
                    "intensity": int(row.click_count),
                    "element_selector": row.element_selector
                })
            
            heatmaps = list(heatmap_pages.values())
        
        # Calculate summary metrics
        total_features = len(feature_adoption)
        avg_adoption_rate = (
            sum(f['adoption_metrics']['adoption_rate'] for f in feature_adoption) / total_features
        ) if total_features > 0 else 0
        
        total_viral_coefficient = sum(v['sharing_metrics']['viral_coefficient'] for v in viral_metrics)
        mobile_sessions = sum(d['usage_metrics']['sessions'] for d in device_comparison if d['device_info']['device_type'] == 'mobile')
        desktop_sessions = sum(d['usage_metrics']['sessions'] for d in device_comparison if d['device_info']['device_type'] == 'desktop')
        total_sessions = mobile_sessions + desktop_sessions
        mobile_percentage = (mobile_sessions / total_sessions * 100) if total_sessions > 0 else 0
        
        summary = {
            "total_features_analyzed": total_features,
            "avg_feature_adoption_rate": round(avg_adoption_rate, 2),
            "total_viral_coefficient": round(total_viral_coefficient, 3),
            "device_split": {
                "mobile_percentage": round(mobile_percentage, 2),
                "desktop_percentage": round(100 - mobile_percentage, 2),
                "total_sessions": total_sessions
            },
            "voice_assistant_usage": len(voice_assistant) > 0
        }
        
        return {
            "success": True,
            "data": {
                "feature_adoption": feature_adoption,
                "time_metrics": time_metrics,
                "viral_metrics": viral_metrics,
                "device_comparison": device_comparison,
                "voice_assistant": voice_assistant,
                "heatmaps": heatmaps if include_heatmaps else None,
                "summary": summary
            },
            "filters_applied": {
                "days": days,
                "feature": feature,
                "device_type": device_type,
                "user_segment": user_segment,
                "include_heatmaps": include_heatmaps
            },
            "date_range": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            },
            "generated_at": datetime.utcnow().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Error in engagement analytics endpoint: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve engagement analytics: {str(e)}"
        )