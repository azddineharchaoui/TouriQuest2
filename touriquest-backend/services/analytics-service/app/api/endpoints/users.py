"""
User Analytics API Endpoints
"""

from datetime import date, timedelta
from typing import Dict, List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from app.core.database import get_warehouse_db
from app.services.analytics_service import AnalyticsService


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics/users", tags=["user-analytics"])


@router.get("/")
async def get_user_analytics(
    start_date: Optional[date] = Query(None, description="Start date for analysis"),
    end_date: Optional[date] = Query(None, description="End date for analysis"),
    segment: Optional[str] = Query(None, description="User segment filter"),
    country_code: Optional[str] = Query(None, description="Filter by country"),
    device_type: Optional[str] = Query(None, description="Filter by device type"),
    warehouse_db: AsyncSession = Depends(get_warehouse_db),
    analytics_service: AnalyticsService = Depends(lambda: AnalyticsService())
) -> Dict[str, Any]:
    """
    Get comprehensive user analytics
    
    Returns:
    - User engagement metrics
    - Behavioral patterns
    - Segmentation analysis
    - Device and platform insights
    """
    try:
        if not start_date:
            start_date = date.today() - timedelta(days=30)
        if not end_date:
            end_date = date.today()
        
        if end_date <= start_date:
            raise HTTPException(status_code=400, detail="End date must be after start date")
        
        # Get comprehensive user analytics
        user_analytics = await analytics_service.calculate_user_analytics(
            warehouse_db,
            start_date=start_date,
            end_date=end_date,
            segment=segment
        )
        
        return {
            "success": True,
            "data": user_analytics,
            "filters": {
                "segment": segment,
                "country_code": country_code,
                "device_type": device_type
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user analytics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get user analytics: {str(e)}")


@router.get("/cohorts")
async def get_user_cohort_analysis(
    cohort_period: str = Query("month", description="Cohort period: week, month"),
    periods_back: int = Query(12, description="Number of periods to analyze", ge=3, le=24),
    warehouse_db: AsyncSession = Depends(get_warehouse_db)
) -> Dict[str, Any]:
    """
    Get user cohort retention analysis
    
    Returns:
    - Cohort retention rates
    - User lifecycle insights
    - Churn analysis
    """
    try:
        from sqlalchemy import select, func, and_, extract
        from app.models.warehouse_models import FactUserActivity, FactBooking
        
        # Calculate cohort analysis based on user first activity
        cohorts = []
        
        # This is a simplified cohort analysis
        # In production, you'd want more sophisticated cohort tracking
        
        end_date = date.today()
        if cohort_period == "week":
            period_delta = timedelta(weeks=1)
        else:  # month
            period_delta = timedelta(days=30)
        
        for i in range(periods_back):
            cohort_start = end_date - (period_delta * (i + 1))
            cohort_end = end_date - (period_delta * i)
            
            # Users who first appeared in this cohort
            first_activity_query = select(
                func.count(FactUserActivity.user_id.distinct()).label('cohort_size')
            ).where(
                and_(
                    FactUserActivity.activity_date >= cohort_start,
                    FactUserActivity.activity_date < cohort_end,
                    FactUserActivity.is_first_visit == True
                )
            )
            
            cohort_result = await warehouse_db.execute(first_activity_query)
            cohort_size = cohort_result.scalar() or 0
            
            if cohort_size > 0:
                # Calculate retention for subsequent periods
                retention_data = []
                for j in range(min(6, i + 1)):  # Track up to 6 periods ahead
                    retention_start = cohort_end + (period_delta * j)
                    retention_end = cohort_end + (period_delta * (j + 1))
                    
                    # Users from this cohort who were active in the retention period
                    retention_query = select(
                        func.count(FactUserActivity.user_id.distinct()).label('retained_users')
                    ).where(
                        and_(
                            FactUserActivity.user_id.in_(
                                select(FactUserActivity.user_id.distinct()).where(
                                    and_(
                                        FactUserActivity.activity_date >= cohort_start,
                                        FactUserActivity.activity_date < cohort_end,
                                        FactUserActivity.is_first_visit == True
                                    )
                                )
                            ),
                            FactUserActivity.activity_date >= retention_start,
                            FactUserActivity.activity_date < retention_end
                        )
                    )
                    
                    retention_result = await warehouse_db.execute(retention_query)
                    retained_users = retention_result.scalar() or 0
                    retention_rate = (retained_users / cohort_size * 100) if cohort_size > 0 else 0
                    
                    retention_data.append({
                        "period": j + 1,
                        "retained_users": retained_users,
                        "retention_rate": retention_rate
                    })
                
                cohorts.append({
                    "cohort_period": f"{cohort_start.isoformat()} to {cohort_end.isoformat()}",
                    "cohort_size": cohort_size,
                    "retention_data": retention_data
                })
        
        return {
            "success": True,
            "data": {
                "cohorts": cohorts,
                "analysis_period": cohort_period,
                "periods_analyzed": periods_back
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting cohort analysis: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get cohort analysis: {str(e)}")


@router.get("/segments")
async def get_user_segmentation(
    start_date: Optional[date] = Query(None, description="Start date for analysis"),
    end_date: Optional[date] = Query(None, description="End date for analysis"),
    warehouse_db: AsyncSession = Depends(get_warehouse_db)
) -> Dict[str, Any]:
    """
    Get user segmentation analysis
    
    Returns:
    - User segments by behavior
    - Value-based segmentation
    - Geographic segments
    - Engagement levels
    """
    try:
        from sqlalchemy import select, func, and_, case
        from app.models.warehouse_models import FactUserActivity, FactBooking
        
        if not start_date:
            start_date = date.today() - timedelta(days=90)
        if not end_date:
            end_date = date.today()
        
        # Segment users by booking behavior
        booking_segments_query = select(
            case(
                (func.count(FactBooking.id) == 0, 'browsers'),
                (func.count(FactBooking.id) == 1, 'one_time_bookers'),
                (func.count(FactBooking.id).between(2, 5), 'repeat_bookers'),
                (func.count(FactBooking.id) > 5, 'frequent_bookers')
            ).label('segment'),
            func.count(FactBooking.user_id.distinct()).label('user_count'),
            func.avg(FactBooking.total_amount).label('avg_booking_value'),
            func.sum(FactBooking.total_amount).label('total_revenue')
        ).select_from(
            FactUserActivity.__table__.outerjoin(
                FactBooking.__table__,
                and_(
                    FactUserActivity.user_id == FactBooking.user_id,
                    FactBooking.booking_date >= start_date,
                    FactBooking.booking_date <= end_date,
                    FactBooking.booking_status == 'confirmed'
                )
            )
        ).where(
            and_(
                FactUserActivity.activity_date >= start_date,
                FactUserActivity.activity_date <= end_date
            )
        ).group_by('segment')
        
        booking_segments_result = await warehouse_db.execute(booking_segments_query)
        
        booking_segments = []
        for row in booking_segments_result:
            booking_segments.append({
                "segment": row.segment,
                "user_count": row.user_count,
                "average_booking_value": float(row.avg_booking_value or 0),
                "total_revenue": float(row.total_revenue or 0)
            })
        
        # Segment by engagement level
        engagement_query = select(
            FactUserActivity.user_id,
            func.count(FactUserActivity.id).label('total_activities'),
            func.sum(FactUserActivity.session_duration_minutes).label('total_time'),
            func.count(FactUserActivity.session_id.distinct()).label('total_sessions')
        ).where(
            and_(
                FactUserActivity.activity_date >= start_date,
                FactUserActivity.activity_date <= end_date
            )
        ).group_by(FactUserActivity.user_id)
        
        engagement_result = await warehouse_db.execute(engagement_query)
        
        # Categorize users by engagement
        high_engagement = 0
        medium_engagement = 0
        low_engagement = 0
        
        for row in engagement_result:
            total_activities = row.total_activities
            total_sessions = row.total_sessions
            
            if total_activities >= 20 and total_sessions >= 5:
                high_engagement += 1
            elif total_activities >= 5 and total_sessions >= 2:
                medium_engagement += 1
            else:
                low_engagement += 1
        
        engagement_segments = [
            {"segment": "high_engagement", "user_count": high_engagement},
            {"segment": "medium_engagement", "user_count": medium_engagement},
            {"segment": "low_engagement", "user_count": low_engagement}
        ]
        
        # Geographic segments
        geographic_query = select(
            FactUserActivity.country_code,
            func.count(FactUserActivity.user_id.distinct()).label('user_count'),
            func.avg(FactUserActivity.session_duration_minutes).label('avg_session_duration')
        ).where(
            and_(
                FactUserActivity.activity_date >= start_date,
                FactUserActivity.activity_date <= end_date,
                FactUserActivity.country_code.isnot(None)
            )
        ).group_by(FactUserActivity.country_code).order_by(func.count(FactUserActivity.user_id.distinct()).desc()).limit(10)
        
        geographic_result = await warehouse_db.execute(geographic_query)
        
        geographic_segments = []
        for row in geographic_result:
            geographic_segments.append({
                "country_code": row.country_code,
                "user_count": row.user_count,
                "average_session_duration": float(row.avg_session_duration or 0)
            })
        
        # Device/Platform segments
        device_query = select(
            FactUserActivity.device_type,
            FactUserActivity.platform,
            func.count(FactUserActivity.user_id.distinct()).label('user_count'),
            func.avg(FactUserActivity.session_duration_minutes).label('avg_session_duration')
        ).where(
            and_(
                FactUserActivity.activity_date >= start_date,
                FactUserActivity.activity_date <= end_date
            )
        ).group_by(FactUserActivity.device_type, FactUserActivity.platform)
        
        device_result = await warehouse_db.execute(device_query)
        
        device_segments = []
        for row in device_result:
            device_segments.append({
                "device_type": row.device_type,
                "platform": row.platform,
                "user_count": row.user_count,
                "average_session_duration": float(row.avg_session_duration or 0)
            })
        
        return {
            "success": True,
            "data": {
                "booking_behavior_segments": booking_segments,
                "engagement_segments": engagement_segments,
                "geographic_segments": geographic_segments,
                "device_platform_segments": device_segments
            },
            "period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting user segmentation: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get user segmentation: {str(e)}")


@router.get("/behavior")
async def get_user_behavior_patterns(
    start_date: Optional[date] = Query(None, description="Start date for analysis"),
    end_date: Optional[date] = Query(None, description="End date for analysis"),
    warehouse_db: AsyncSession = Depends(get_warehouse_db)
) -> Dict[str, Any]:
    """
    Get user behavior pattern analysis
    
    Returns:
    - Activity patterns by time
    - Feature usage patterns
    - User journey analysis
    - Behavioral insights
    """
    try:
        from sqlalchemy import select, func, and_, extract
        from app.models.warehouse_models import FactUserActivity
        
        if not start_date:
            start_date = date.today() - timedelta(days=30)
        if not end_date:
            end_date = date.today()
        
        # Activity patterns by hour of day
        hourly_activity_query = select(
            FactUserActivity.hour_of_day,
            func.count(FactUserActivity.id).label('activity_count'),
            func.count(FactUserActivity.user_id.distinct()).label('unique_users')
        ).where(
            and_(
                FactUserActivity.activity_date >= start_date,
                FactUserActivity.activity_date <= end_date
            )
        ).group_by(FactUserActivity.hour_of_day).order_by(FactUserActivity.hour_of_day)
        
        hourly_result = await warehouse_db.execute(hourly_activity_query)
        
        hourly_patterns = []
        for row in hourly_result:
            hourly_patterns.append({
                "hour": row.hour_of_day,
                "activity_count": row.activity_count,
                "unique_users": row.unique_users
            })
        
        # Activity patterns by day of week
        daily_activity_query = select(
            FactUserActivity.day_of_week,
            func.count(FactUserActivity.id).label('activity_count'),
            func.count(FactUserActivity.user_id.distinct()).label('unique_users'),
            func.avg(FactUserActivity.session_duration_minutes).label('avg_session_duration')
        ).where(
            and_(
                FactUserActivity.activity_date >= start_date,
                FactUserActivity.activity_date <= end_date
            )
        ).group_by(FactUserActivity.day_of_week).order_by(FactUserActivity.day_of_week)
        
        daily_result = await warehouse_db.execute(daily_activity_query)
        
        daily_patterns = []
        days_of_week = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        for row in daily_result:
            daily_patterns.append({
                "day_of_week": days_of_week[row.day_of_week],
                "activity_count": row.activity_count,
                "unique_users": row.unique_users,
                "average_session_duration": float(row.avg_session_duration or 0)
            })
        
        # Feature usage patterns
        feature_usage_query = select(
            FactUserActivity.activity_type,
            func.count(FactUserActivity.id).label('usage_count'),
            func.count(FactUserActivity.user_id.distinct()).label('unique_users')
        ).where(
            and_(
                FactUserActivity.activity_date >= start_date,
                FactUserActivity.activity_date <= end_date
            )
        ).group_by(FactUserActivity.activity_type).order_by(func.count(FactUserActivity.id).desc())
        
        feature_result = await warehouse_db.execute(feature_usage_query)
        
        feature_usage = []
        for row in feature_result:
            feature_usage.append({
                "feature": row.activity_type,
                "usage_count": row.usage_count,
                "unique_users": row.unique_users
            })
        
        # Session duration distribution
        session_duration_query = select(
            case(
                (FactUserActivity.session_duration_minutes < 1, 'under_1_min'),
                (FactUserActivity.session_duration_minutes < 5, '1_5_min'),
                (FactUserActivity.session_duration_minutes < 15, '5_15_min'),
                (FactUserActivity.session_duration_minutes < 30, '15_30_min'),
                (FactUserActivity.session_duration_minutes >= 30, 'over_30_min')
            ).label('duration_bucket'),
            func.count(FactUserActivity.session_id.distinct()).label('session_count')
        ).where(
            and_(
                FactUserActivity.activity_date >= start_date,
                FactUserActivity.activity_date <= end_date,
                FactUserActivity.session_duration_minutes.isnot(None)
            )
        ).group_by('duration_bucket')
        
        duration_result = await warehouse_db.execute(session_duration_query)
        
        session_duration_dist = []
        for row in duration_result:
            session_duration_dist.append({
                "duration_bucket": row.duration_bucket,
                "session_count": row.session_count
            })
        
        return {
            "success": True,
            "data": {
                "hourly_activity_patterns": hourly_patterns,
                "daily_activity_patterns": daily_patterns,
                "feature_usage_patterns": feature_usage,
                "session_duration_distribution": session_duration_dist
            },
            "period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting user behavior patterns: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get behavior patterns: {str(e)}")


# Import necessary modules at the top
from sqlalchemy import case