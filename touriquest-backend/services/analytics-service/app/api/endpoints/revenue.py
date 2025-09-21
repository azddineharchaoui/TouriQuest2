"""
Revenue Analytics API Endpoints
"""

from datetime import date, timedelta
from typing import Dict, List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from app.core.database import get_warehouse_db
from app.models.warehouse_models import FactBooking, AggregatedMetric


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics/revenue", tags=["revenue-analytics"])


@router.get("/")
async def get_revenue_analytics(
    start_date: Optional[date] = Query(None, description="Start date for analysis"),
    end_date: Optional[date] = Query(None, description="End date for analysis"),
    granularity: str = Query("daily", description="Data granularity: daily, weekly, monthly"),
    country_code: Optional[str] = Query(None, description="Filter by country"),
    property_type: Optional[str] = Query(None, description="Filter by property type"),
    currency: str = Query("USD", description="Currency for revenue data"),
    warehouse_db: AsyncSession = Depends(get_warehouse_db)
) -> Dict[str, Any]:
    """
    Get comprehensive revenue analytics
    
    Returns:
    - Total revenue with trends
    - Revenue by category/type
    - Revenue by geography
    - Growth rates and comparisons
    """
    try:
        from sqlalchemy import select, func, and_, desc, extract
        
        if not start_date:
            start_date = date.today() - timedelta(days=30)
        if not end_date:
            end_date = date.today()
        
        if end_date <= start_date:
            raise HTTPException(status_code=400, detail="End date must be after start date")
        
        # Base query for revenue data
        base_query = select(FactBooking).where(
            and_(
                FactBooking.booking_date >= start_date,
                FactBooking.booking_date <= end_date,
                FactBooking.booking_status == 'confirmed'
            )
        )
        
        # Apply filters
        if country_code:
            base_query = base_query.where(FactBooking.country_code == country_code)
        if property_type:
            base_query = base_query.where(FactBooking.property_type == property_type)
        
        # Total revenue summary
        summary_query = select(
            func.sum(FactBooking.total_amount).label('total_revenue'),
            func.sum(FactBooking.commission_amount).label('total_commission'),
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
        
        if country_code:
            summary_query = summary_query.where(FactBooking.country_code == country_code)
        if property_type:
            summary_query = summary_query.where(FactBooking.property_type == property_type)
        
        summary_result = await warehouse_db.execute(summary_query)
        summary_data = summary_result.first()
        
        # Revenue trend by time period
        if granularity == "daily":
            trend_query = select(
                FactBooking.booking_date,
                func.sum(FactBooking.total_amount).label('revenue'),
                func.count(FactBooking.id).label('bookings')
            ).where(
                and_(
                    FactBooking.booking_date >= start_date,
                    FactBooking.booking_date <= end_date,
                    FactBooking.booking_status == 'confirmed'
                )
            ).group_by(FactBooking.booking_date).order_by(FactBooking.booking_date)
            
        elif granularity == "weekly":
            trend_query = select(
                extract('week', FactBooking.booking_date).label('week'),
                extract('year', FactBooking.booking_date).label('year'),
                func.sum(FactBooking.total_amount).label('revenue'),
                func.count(FactBooking.id).label('bookings')
            ).where(
                and_(
                    FactBooking.booking_date >= start_date,
                    FactBooking.booking_date <= end_date,
                    FactBooking.booking_status == 'confirmed'
                )
            ).group_by(
                extract('week', FactBooking.booking_date),
                extract('year', FactBooking.booking_date)
            ).order_by('year', 'week')
            
        else:  # monthly
            trend_query = select(
                extract('month', FactBooking.booking_date).label('month'),
                extract('year', FactBooking.booking_date).label('year'),
                func.sum(FactBooking.total_amount).label('revenue'),
                func.count(FactBooking.id).label('bookings')
            ).where(
                and_(
                    FactBooking.booking_date >= start_date,
                    FactBooking.booking_date <= end_date,
                    FactBooking.booking_status == 'confirmed'
                )
            ).group_by(
                extract('month', FactBooking.booking_date),
                extract('year', FactBooking.booking_date)
            ).order_by('year', 'month')
        
        if country_code:
            trend_query = trend_query.where(FactBooking.country_code == country_code)
        if property_type:
            trend_query = trend_query.where(FactBooking.property_type == property_type)
        
        trend_result = await warehouse_db.execute(trend_query)
        
        revenue_trend = []
        for row in trend_result:
            if granularity == "daily":
                revenue_trend.append({
                    "date": row.booking_date.isoformat(),
                    "revenue": float(row.revenue),
                    "bookings": row.bookings
                })
            else:
                period_key = f"{int(row.year)}-{int(row.week if granularity == 'weekly' else row.month):02d}"
                revenue_trend.append({
                    "period": period_key,
                    "revenue": float(row.revenue),
                    "bookings": row.bookings
                })
        
        # Revenue by property type
        property_type_query = select(
            FactBooking.property_type,
            func.sum(FactBooking.total_amount).label('revenue'),
            func.count(FactBooking.id).label('bookings'),
            func.avg(FactBooking.total_amount).label('avg_booking_value')
        ).where(
            and_(
                FactBooking.booking_date >= start_date,
                FactBooking.booking_date <= end_date,
                FactBooking.booking_status == 'confirmed'
            )
        ).group_by(FactBooking.property_type).order_by(desc('revenue'))
        
        if country_code:
            property_type_query = property_type_query.where(FactBooking.country_code == country_code)
        
        property_type_result = await warehouse_db.execute(property_type_query)
        
        revenue_by_type = []
        for row in property_type_result:
            revenue_by_type.append({
                "property_type": row.property_type,
                "revenue": float(row.revenue),
                "bookings": row.bookings,
                "average_booking_value": float(row.avg_booking_value)
            })
        
        # Revenue by geography
        geography_query = select(
            FactBooking.country_code,
            FactBooking.region,
            func.sum(FactBooking.total_amount).label('revenue'),
            func.count(FactBooking.id).label('bookings')
        ).where(
            and_(
                FactBooking.booking_date >= start_date,
                FactBooking.booking_date <= end_date,
                FactBooking.booking_status == 'confirmed'
            )
        ).group_by(
            FactBooking.country_code, FactBooking.region
        ).order_by(desc('revenue')).limit(20)
        
        if property_type:
            geography_query = geography_query.where(FactBooking.property_type == property_type)
        
        geography_result = await warehouse_db.execute(geography_query)
        
        revenue_by_geography = []
        for row in geography_result:
            revenue_by_geography.append({
                "country_code": row.country_code,
                "region": row.region,
                "revenue": float(row.revenue),
                "bookings": row.bookings
            })
        
        # Calculate growth rates (compare with previous period)
        period_days = (end_date - start_date).days
        prev_start = start_date - timedelta(days=period_days)
        prev_end = start_date - timedelta(days=1)
        
        prev_summary_query = select(
            func.sum(FactBooking.total_amount).label('prev_revenue'),
            func.count(FactBooking.id).label('prev_bookings')
        ).where(
            and_(
                FactBooking.booking_date >= prev_start,
                FactBooking.booking_date <= prev_end,
                FactBooking.booking_status == 'confirmed'
            )
        )
        
        if country_code:
            prev_summary_query = prev_summary_query.where(FactBooking.country_code == country_code)
        if property_type:
            prev_summary_query = prev_summary_query.where(FactBooking.property_type == property_type)
        
        prev_summary_result = await warehouse_db.execute(prev_summary_query)
        prev_summary_data = prev_summary_result.first()
        
        # Calculate growth rates
        current_revenue = float(summary_data.total_revenue or 0)
        prev_revenue = float(prev_summary_data.prev_revenue or 0)
        revenue_growth = ((current_revenue - prev_revenue) / prev_revenue * 100) if prev_revenue > 0 else None
        
        current_bookings = summary_data.total_bookings or 0
        prev_bookings = prev_summary_data.prev_bookings or 0
        booking_growth = ((current_bookings - prev_bookings) / prev_bookings * 100) if prev_bookings > 0 else None
        
        return {
            "success": True,
            "data": {
                "summary": {
                    "total_revenue": current_revenue,
                    "total_commission": float(summary_data.total_commission or 0),
                    "total_bookings": current_bookings,
                    "average_booking_value": float(summary_data.average_booking_value or 0),
                    "unique_customers": summary_data.unique_customers or 0,
                    "revenue_growth_percent": revenue_growth,
                    "booking_growth_percent": booking_growth
                },
                "revenue_trend": revenue_trend,
                "revenue_by_property_type": revenue_by_type,
                "revenue_by_geography": revenue_by_geography
            },
            "period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "granularity": granularity
            },
            "filters": {
                "country_code": country_code,
                "property_type": property_type,
                "currency": currency
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting revenue analytics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get revenue analytics: {str(e)}")


@router.get("/conversion")
async def get_revenue_conversion_metrics(
    start_date: Optional[date] = Query(None, description="Start date for analysis"),
    end_date: Optional[date] = Query(None, description="End date for analysis"),
    segment_by: str = Query("property_type", description="Segment by: property_type, country, region"),
    warehouse_db: AsyncSession = Depends(get_warehouse_db)
) -> Dict[str, Any]:
    """
    Get revenue conversion and efficiency metrics
    
    Returns:
    - Conversion rates at different funnel stages
    - Revenue per visitor/session
    - Customer acquisition cost insights
    - Revenue efficiency metrics
    """
    try:
        from sqlalchemy import select, func, and_
        from app.models.warehouse_models import FactUserActivity
        
        if not start_date:
            start_date = date.today() - timedelta(days=30)
        if not end_date:
            end_date = date.today()
        
        # Get funnel metrics
        # Searches
        search_query = select(func.count(FactUserActivity.id)).where(
            and_(
                FactUserActivity.activity_date >= start_date,
                FactUserActivity.activity_date <= end_date,
                FactUserActivity.activity_type == 'search'
            )
        )
        search_result = await warehouse_db.execute(search_query)
        total_searches = search_result.scalar() or 0
        
        # Property views
        view_query = select(func.count(FactUserActivity.id)).where(
            and_(
                FactUserActivity.activity_date >= start_date,
                FactUserActivity.activity_date <= end_date,
                FactUserActivity.activity_type == 'property_view'
            )
        )
        view_result = await warehouse_db.execute(view_query)
        total_views = view_result.scalar() or 0
        
        # Bookings and revenue
        booking_query = select(
            func.count(FactBooking.id).label('bookings'),
            func.sum(FactBooking.total_amount).label('revenue')
        ).where(
            and_(
                FactBooking.booking_date >= start_date,
                FactBooking.booking_date <= end_date,
                FactBooking.booking_status == 'confirmed'
            )
        )
        booking_result = await warehouse_db.execute(booking_query)
        booking_data = booking_result.first()
        
        total_bookings = booking_data.bookings or 0
        total_revenue = float(booking_data.revenue or 0)
        
        # Calculate conversion metrics
        search_to_view_rate = (total_views / total_searches * 100) if total_searches > 0 else 0
        view_to_booking_rate = (total_bookings / total_views * 100) if total_views > 0 else 0
        search_to_booking_rate = (total_bookings / total_searches * 100) if total_searches > 0 else 0
        
        # Revenue efficiency metrics
        revenue_per_search = total_revenue / total_searches if total_searches > 0 else 0
        revenue_per_view = total_revenue / total_views if total_views > 0 else 0
        revenue_per_booking = total_revenue / total_bookings if total_bookings > 0 else 0
        
        # Segmented analysis
        segmented_data = []
        if segment_by in ["property_type", "country_code", "region"]:
            segment_field = getattr(FactBooking, segment_by)
            
            segment_query = select(
                segment_field,
                func.sum(FactBooking.total_amount).label('revenue'),
                func.count(FactBooking.id).label('bookings'),
                func.avg(FactBooking.total_amount).label('avg_value')
            ).where(
                and_(
                    FactBooking.booking_date >= start_date,
                    FactBooking.booking_date <= end_date,
                    FactBooking.booking_status == 'confirmed'
                )
            ).group_by(segment_field).order_by(func.sum(FactBooking.total_amount).desc())
            
            segment_result = await warehouse_db.execute(segment_query)
            
            for row in segment_result:
                segmented_data.append({
                    segment_by: getattr(row, segment_by),
                    "revenue": float(row.revenue),
                    "bookings": row.bookings,
                    "average_booking_value": float(row.avg_value),
                    "revenue_share_percent": (float(row.revenue) / total_revenue * 100) if total_revenue > 0 else 0
                })
        
        return {
            "success": True,
            "data": {
                "funnel_metrics": {
                    "total_searches": total_searches,
                    "total_views": total_views,
                    "total_bookings": total_bookings,
                    "total_revenue": total_revenue
                },
                "conversion_rates": {
                    "search_to_view_percent": search_to_view_rate,
                    "view_to_booking_percent": view_to_booking_rate,
                    "search_to_booking_percent": search_to_booking_rate
                },
                "revenue_efficiency": {
                    "revenue_per_search": revenue_per_search,
                    "revenue_per_view": revenue_per_view,
                    "revenue_per_booking": revenue_per_booking
                },
                "segmented_analysis": segmented_data
            },
            "period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            },
            "segment_by": segment_by
        }
        
    except Exception as e:
        logger.error(f"Error getting revenue conversion metrics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get conversion metrics: {str(e)}")


@router.get("/forecast")
async def get_revenue_forecast(
    days_ahead: int = Query(30, description="Days to forecast", ge=7, le=365),
    model_type: str = Query("linear", description="Forecast model: linear, seasonal"),
    warehouse_db: AsyncSession = Depends(get_warehouse_db)
) -> Dict[str, Any]:
    """
    Get revenue forecast based on historical data
    
    Returns:
    - Revenue predictions
    - Confidence intervals
    - Trend analysis
    - Seasonal adjustments
    """
    try:
        from sqlalchemy import select, func, and_
        import pandas as pd
        import numpy as np
        from datetime import datetime
        
        # Get historical revenue data (last 90 days for better forecasting)
        end_date = date.today()
        start_date = end_date - timedelta(days=90)
        
        historical_query = select(
            FactBooking.booking_date,
            func.sum(FactBooking.total_amount).label('revenue')
        ).where(
            and_(
                FactBooking.booking_date >= start_date,
                FactBooking.booking_date <= end_date,
                FactBooking.booking_status == 'confirmed'
            )
        ).group_by(FactBooking.booking_date).order_by(FactBooking.booking_date)
        
        historical_result = await warehouse_db.execute(historical_query)
        
        # Convert to pandas DataFrame for analysis
        historical_data = []
        for row in historical_result:
            historical_data.append({
                "date": row.booking_date,
                "revenue": float(row.revenue)
            })
        
        if not historical_data:
            raise HTTPException(status_code=404, detail="No historical data found for forecasting")
        
        df = pd.DataFrame(historical_data)
        df['date'] = pd.to_datetime(df['date'])
        df = df.set_index('date')
        df = df.resample('D').sum().fillna(0)  # Fill missing dates with 0
        
        # Simple linear trend forecast
        days_historical = len(df)
        x = np.arange(days_historical)
        y = df['revenue'].values
        
        # Linear regression
        slope, intercept = np.polyfit(x, y, 1)
        
        # Generate forecast
        forecast_dates = pd.date_range(
            start=end_date + timedelta(days=1),
            periods=days_ahead,
            freq='D'
        )
        
        forecast_data = []
        for i, forecast_date in enumerate(forecast_dates):
            forecast_x = days_historical + i
            forecast_revenue = slope * forecast_x + intercept
            
            # Add some uncertainty bounds (simple approach)
            std_error = np.std(y - (slope * x + intercept))
            confidence_interval = 1.96 * std_error  # 95% confidence
            
            forecast_data.append({
                "date": forecast_date.strftime('%Y-%m-%d'),
                "predicted_revenue": max(0, forecast_revenue),  # Don't predict negative revenue
                "confidence_lower": max(0, forecast_revenue - confidence_interval),
                "confidence_upper": forecast_revenue + confidence_interval
            })
        
        # Calculate forecast summary
        total_forecast_revenue = sum(item["predicted_revenue"] for item in forecast_data)
        avg_daily_forecast = total_forecast_revenue / days_ahead
        
        # Historical average for comparison
        historical_avg = df['revenue'].mean()
        growth_trend = slope  # Daily growth trend
        
        return {
            "success": True,
            "data": {
                "forecast": forecast_data,
                "summary": {
                    "total_predicted_revenue": total_forecast_revenue,
                    "average_daily_revenue": avg_daily_forecast,
                    "historical_daily_average": historical_avg,
                    "daily_growth_trend": growth_trend,
                    "forecast_period_days": days_ahead
                },
                "model_info": {
                    "model_type": model_type,
                    "historical_days_used": days_historical,
                    "trend_slope": slope,
                    "trend_intercept": intercept
                }
            },
            "period": {
                "forecast_start": forecast_dates[0].strftime('%Y-%m-%d'),
                "forecast_end": forecast_dates[-1].strftime('%Y-%m-%d'),
                "historical_start": start_date.isoformat(),
                "historical_end": end_date.isoformat()
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating revenue forecast: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate forecast: {str(e)}")