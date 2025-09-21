"""
Trends Analytics API Endpoints
"""

from datetime import date, datetime, timedelta
from typing import Dict, List, Optional, Any, Union
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from app.core.database import get_warehouse_db
from app.services.analytics_service import AnalyticsService


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics/trends", tags=["trends-analytics"])


@router.get("/")
async def get_trend_analysis(
    metric: str = Query(..., description="Metric to analyze: revenue, bookings, users, properties"),
    start_date: Optional[date] = Query(None, description="Start date for analysis"),
    end_date: Optional[date] = Query(None, description="End date for analysis"),
    granularity: str = Query("day", description="Time granularity: day, week, month"),
    forecast_days: int = Query(30, description="Number of days to forecast", ge=1, le=365),
    warehouse_db: AsyncSession = Depends(get_warehouse_db),
    analytics_service: AnalyticsService = Depends(lambda: AnalyticsService())
) -> Dict[str, Any]:
    """
    Get comprehensive trend analysis with forecasting
    
    Returns:
    - Historical trends
    - Seasonal patterns
    - Growth rates
    - Forecasting
    """
    try:
        from sqlalchemy import select, func, and_, extract, case
        from app.models.warehouse_models import FactBooking, FactUserActivity, FactProperty
        import numpy as np
        
        if not start_date:
            start_date = date.today() - timedelta(days=90)
        if not end_date:
            end_date = date.today()
        
        if end_date <= start_date:
            raise HTTPException(status_code=400, detail="End date must be after start date")
        
        # Validate metric
        valid_metrics = ["revenue", "bookings", "users", "properties"]
        if metric not in valid_metrics:
            raise HTTPException(status_code=400, detail=f"Invalid metric. Must be one of: {valid_metrics}")
        
        # Determine time grouping
        if granularity == "week":
            time_group = [extract('year', FactBooking.booking_date), extract('week', FactBooking.booking_date)]
            time_label = func.concat(
                extract('year', FactBooking.booking_date),
                '-W',
                extract('week', FactBooking.booking_date)
            ).label('time_period')
        elif granularity == "month":
            time_group = [extract('year', FactBooking.booking_date), extract('month', FactBooking.booking_date)]
            time_label = func.concat(
                extract('year', FactBooking.booking_date),
                '-',
                func.lpad(extract('month', FactBooking.booking_date).cast(str), 2, '0')
            ).label('time_period')
        else:  # day
            time_group = [FactBooking.booking_date]
            time_label = FactBooking.booking_date.label('time_period')
        
        # Get historical data based on metric
        historical_data = []
        
        if metric == "revenue":
            historical_query = select(
                time_label,
                func.sum(FactBooking.total_amount).label('value')
            ).where(
                and_(
                    FactBooking.booking_date >= start_date,
                    FactBooking.booking_date <= end_date,
                    FactBooking.booking_status == 'confirmed'
                )
            ).group_by(*time_group).order_by(*time_group)
            
        elif metric == "bookings":
            historical_query = select(
                time_label,
                func.count(FactBooking.id).label('value')
            ).where(
                and_(
                    FactBooking.booking_date >= start_date,
                    FactBooking.booking_date <= end_date,
                    FactBooking.booking_status == 'confirmed'
                )
            ).group_by(*time_group).order_by(*time_group)
            
        elif metric == "users":
            # For users, we need to adjust the query to use user activity data
            if granularity == "week":
                time_group_users = [extract('year', FactUserActivity.activity_date), extract('week', FactUserActivity.activity_date)]
                time_label_users = func.concat(
                    extract('year', FactUserActivity.activity_date),
                    '-W',
                    extract('week', FactUserActivity.activity_date)
                ).label('time_period')
            elif granularity == "month":
                time_group_users = [extract('year', FactUserActivity.activity_date), extract('month', FactUserActivity.activity_date)]
                time_label_users = func.concat(
                    extract('year', FactUserActivity.activity_date),
                    '-',
                    func.lpad(extract('month', FactUserActivity.activity_date).cast(str), 2, '0')
                ).label('time_period')
            else:  # day
                time_group_users = [FactUserActivity.activity_date]
                time_label_users = FactUserActivity.activity_date.label('time_period')
            
            historical_query = select(
                time_label_users,
                func.count(FactUserActivity.user_id.distinct()).label('value')
            ).where(
                and_(
                    FactUserActivity.activity_date >= start_date,
                    FactUserActivity.activity_date <= end_date
                )
            ).group_by(*time_group_users).order_by(*time_group_users)
            
        else:  # properties
            historical_query = select(
                time_label,
                func.count(FactBooking.property_id.distinct()).label('value')
            ).where(
                and_(
                    FactBooking.booking_date >= start_date,
                    FactBooking.booking_date <= end_date,
                    FactBooking.booking_status == 'confirmed'
                )
            ).group_by(*time_group).order_by(*time_group)
        
        historical_result = await warehouse_db.execute(historical_query)
        
        for row in historical_result:
            historical_data.append({
                "time_period": str(row.time_period),
                "value": float(row.value or 0)
            })
        
        # Calculate growth rates
        growth_rates = []
        for i in range(1, len(historical_data)):
            current_value = historical_data[i]["value"]
            previous_value = historical_data[i-1]["value"]
            
            if previous_value > 0:
                growth_rate = ((current_value - previous_value) / previous_value) * 100
            else:
                growth_rate = 0
            
            growth_rates.append({
                "time_period": historical_data[i]["time_period"],
                "growth_rate": round(growth_rate, 2)
            })
        
        # Calculate moving averages
        window_size = min(7, len(historical_data))  # 7-period moving average
        moving_averages = []
        
        if len(historical_data) >= window_size:
            for i in range(window_size - 1, len(historical_data)):
                window_values = [historical_data[j]["value"] for j in range(i - window_size + 1, i + 1)]
                moving_avg = sum(window_values) / len(window_values)
                moving_averages.append({
                    "time_period": historical_data[i]["time_period"],
                    "moving_average": round(moving_avg, 2)
                })
        
        # Simple linear forecasting
        forecast_data = []
        if len(historical_data) >= 2:
            # Get the last few data points for trend calculation
            recent_data = historical_data[-min(30, len(historical_data)):]
            values = [point["value"] for point in recent_data]
            
            # Calculate linear trend
            x = np.arange(len(values))
            if len(values) > 1:
                slope, intercept = np.polyfit(x, values, 1)
                
                # Generate forecast
                last_date = datetime.strptime(str(historical_data[-1]["time_period"]), "%Y-%m-%d").date()
                
                for i in range(1, forecast_days + 1):
                    if granularity == "day":
                        forecast_date = last_date + timedelta(days=i)
                    elif granularity == "week":
                        forecast_date = last_date + timedelta(weeks=i)
                    else:  # month
                        forecast_date = last_date + timedelta(days=i*30)  # Approximate
                    
                    forecasted_value = slope * (len(values) + i - 1) + intercept
                    forecasted_value = max(0, forecasted_value)  # Ensure non-negative
                    
                    forecast_data.append({
                        "time_period": forecast_date.isoformat(),
                        "forecasted_value": round(forecasted_value, 2)
                    })
        
        # Seasonal analysis (monthly patterns)
        seasonal_patterns = []
        if len(historical_data) > 0:
            monthly_data = {}
            
            for point in historical_data:
                try:
                    point_date = datetime.strptime(str(point["time_period"]), "%Y-%m-%d").date()
                    month = point_date.month
                    
                    if month not in monthly_data:
                        monthly_data[month] = []
                    monthly_data[month].append(point["value"])
                except ValueError:
                    continue
            
            month_names = [
                "January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"
            ]
            
            for month in range(1, 13):
                if month in monthly_data:
                    values = monthly_data[month]
                    seasonal_patterns.append({
                        "month": month_names[month - 1],
                        "month_number": month,
                        "average_value": round(sum(values) / len(values), 2),
                        "data_points": len(values)
                    })
        
        # Calculate key statistics
        values = [point["value"] for point in historical_data]
        statistics = {}
        
        if values:
            statistics = {
                "total": sum(values),
                "average": round(sum(values) / len(values), 2),
                "minimum": min(values),
                "maximum": max(values),
                "median": round(sorted(values)[len(values) // 2], 2) if values else 0,
                "standard_deviation": round(np.std(values), 2) if len(values) > 1 else 0
            }
        
        # Overall trend direction
        trend_direction = "stable"
        if len(growth_rates) > 0:
            avg_growth = sum(rate["growth_rate"] for rate in growth_rates) / len(growth_rates)
            if avg_growth > 5:
                trend_direction = "increasing"
            elif avg_growth < -5:
                trend_direction = "decreasing"
        
        return {
            "success": True,
            "data": {
                "historical_data": historical_data,
                "growth_rates": growth_rates,
                "moving_averages": moving_averages,
                "forecast": forecast_data,
                "seasonal_patterns": seasonal_patterns,
                "statistics": statistics,
                "trend_direction": trend_direction
            },
            "parameters": {
                "metric": metric,
                "granularity": granularity,
                "forecast_days": forecast_days
            },
            "period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting trend analysis: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get trend analysis: {str(e)}")


@router.get("/correlation")
async def get_correlation_analysis(
    metrics: List[str] = Query(..., description="Metrics to correlate: revenue, bookings, users, rating"),
    start_date: Optional[date] = Query(None, description="Start date for analysis"),
    end_date: Optional[date] = Query(None, description="End date for analysis"),
    warehouse_db: AsyncSession = Depends(get_warehouse_db)
) -> Dict[str, Any]:
    """
    Get correlation analysis between different metrics
    
    Returns:
    - Correlation coefficients
    - Scatter plot data
    - Relationship insights
    """
    try:
        from sqlalchemy import select, func, and_
        from app.models.warehouse_models import FactBooking, FactUserActivity, FactProperty
        import numpy as np
        from itertools import combinations
        
        if not start_date:
            start_date = date.today() - timedelta(days=90)
        if not end_date:
            end_date = date.today()
        
        valid_metrics = ["revenue", "bookings", "users", "rating"]
        for metric in metrics:
            if metric not in valid_metrics:
                raise HTTPException(status_code=400, detail=f"Invalid metric '{metric}'. Must be one of: {valid_metrics}")
        
        if len(metrics) < 2:
            raise HTTPException(status_code=400, detail="At least 2 metrics required for correlation analysis")
        
        # Get daily data for all metrics
        daily_data = {}
        
        # Initialize all dates in range
        current_date = start_date
        while current_date <= end_date:
            daily_data[current_date.isoformat()] = {}
            current_date += timedelta(days=1)
        
        # Get revenue data
        if "revenue" in metrics:
            revenue_query = select(
                FactBooking.booking_date,
                func.sum(FactBooking.total_amount).label('daily_revenue')
            ).where(
                and_(
                    FactBooking.booking_date >= start_date,
                    FactBooking.booking_date <= end_date,
                    FactBooking.booking_status == 'confirmed'
                )
            ).group_by(FactBooking.booking_date).order_by(FactBooking.booking_date)
            
            revenue_result = await warehouse_db.execute(revenue_query)
            for row in revenue_result:
                date_str = row.booking_date.isoformat()
                if date_str in daily_data:
                    daily_data[date_str]["revenue"] = float(row.daily_revenue or 0)
        
        # Get bookings data
        if "bookings" in metrics:
            bookings_query = select(
                FactBooking.booking_date,
                func.count(FactBooking.id).label('daily_bookings')
            ).where(
                and_(
                    FactBooking.booking_date >= start_date,
                    FactBooking.booking_date <= end_date,
                    FactBooking.booking_status == 'confirmed'
                )
            ).group_by(FactBooking.booking_date).order_by(FactBooking.booking_date)
            
            bookings_result = await warehouse_db.execute(bookings_query)
            for row in bookings_result:
                date_str = row.booking_date.isoformat()
                if date_str in daily_data:
                    daily_data[date_str]["bookings"] = row.daily_bookings or 0
        
        # Get users data
        if "users" in metrics:
            users_query = select(
                FactUserActivity.activity_date,
                func.count(FactUserActivity.user_id.distinct()).label('daily_users')
            ).where(
                and_(
                    FactUserActivity.activity_date >= start_date,
                    FactUserActivity.activity_date <= end_date
                )
            ).group_by(FactUserActivity.activity_date).order_by(FactUserActivity.activity_date)
            
            users_result = await warehouse_db.execute(users_query)
            for row in users_result:
                date_str = row.activity_date.isoformat()
                if date_str in daily_data:
                    daily_data[date_str]["users"] = row.daily_users or 0
        
        # Get rating data (average daily rating of bookings)
        if "rating" in metrics:
            rating_query = select(
                FactBooking.booking_date,
                func.avg(FactProperty.average_rating).label('daily_avg_rating')
            ).select_from(
                FactBooking.__table__.join(
                    FactProperty.__table__,
                    FactBooking.property_id == FactProperty.property_id
                )
            ).where(
                and_(
                    FactBooking.booking_date >= start_date,
                    FactBooking.booking_date <= end_date,
                    FactBooking.booking_status == 'confirmed'
                )
            ).group_by(FactBooking.booking_date).order_by(FactBooking.booking_date)
            
            rating_result = await warehouse_db.execute(rating_query)
            for row in rating_result:
                date_str = row.booking_date.isoformat()
                if date_str in daily_data:
                    daily_data[date_str]["rating"] = float(row.daily_avg_rating or 0)
        
        # Fill missing values with 0
        for date_str in daily_data:
            for metric in metrics:
                if metric not in daily_data[date_str]:
                    daily_data[date_str][metric] = 0
        
        # Calculate correlations
        correlations = []
        scatter_data = []
        
        for metric1, metric2 in combinations(metrics, 2):
            values1 = [daily_data[date_str][metric1] for date_str in sorted(daily_data.keys())]
            values2 = [daily_data[date_str][metric2] for date_str in sorted(daily_data.keys())]
            
            # Calculate Pearson correlation coefficient
            if len(values1) > 1 and np.std(values1) > 0 and np.std(values2) > 0:
                correlation_coeff = np.corrcoef(values1, values2)[0, 1]
            else:
                correlation_coeff = 0
            
            # Interpret correlation strength
            abs_corr = abs(correlation_coeff)
            if abs_corr >= 0.8:
                strength = "very strong"
            elif abs_corr >= 0.6:
                strength = "strong"
            elif abs_corr >= 0.4:
                strength = "moderate"
            elif abs_corr >= 0.2:
                strength = "weak"
            else:
                strength = "very weak"
            
            direction = "positive" if correlation_coeff > 0 else "negative"
            
            correlations.append({
                "metric1": metric1,
                "metric2": metric2,
                "correlation_coefficient": round(correlation_coeff, 4),
                "strength": strength,
                "direction": direction
            })
            
            # Prepare scatter plot data
            scatter_points = []
            for i, date_str in enumerate(sorted(daily_data.keys())):
                scatter_points.append({
                    "date": date_str,
                    f"{metric1}_value": values1[i],
                    f"{metric2}_value": values2[i]
                })
            
            scatter_data.append({
                "metric1": metric1,
                "metric2": metric2,
                "data_points": scatter_points[:50]  # Limit to 50 points for visualization
            })
        
        # Summary statistics for each metric
        metric_summaries = {}
        for metric in metrics:
            values = [daily_data[date_str][metric] for date_str in daily_data]
            
            if values:
                metric_summaries[metric] = {
                    "total": sum(values),
                    "average": round(sum(values) / len(values), 2),
                    "minimum": min(values),
                    "maximum": max(values),
                    "standard_deviation": round(np.std(values), 2) if len(values) > 1 else 0
                }
        
        return {
            "success": True,
            "data": {
                "correlations": correlations,
                "scatter_data": scatter_data,
                "metric_summaries": metric_summaries,
                "data_points": len(daily_data)
            },
            "parameters": {
                "metrics": metrics
            },
            "period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting correlation analysis: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get correlation analysis: {str(e)}")


@router.get("/anomalies")
async def get_anomaly_detection(
    metric: str = Query(..., description="Metric to analyze: revenue, bookings, users"),
    start_date: Optional[date] = Query(None, description="Start date for analysis"),
    end_date: Optional[date] = Query(None, description="End date for analysis"),
    sensitivity: float = Query(2.0, description="Anomaly detection sensitivity (standard deviations)", ge=1.0, le=4.0),
    warehouse_db: AsyncSession = Depends(get_warehouse_db)
) -> Dict[str, Any]:
    """
    Detect anomalies in time series data
    
    Returns:
    - Anomaly detection results
    - Statistical thresholds
    - Anomalous data points
    """
    try:
        from sqlalchemy import select, func, and_
        from app.models.warehouse_models import FactBooking, FactUserActivity
        import numpy as np
        from datetime import datetime
        
        if not start_date:
            start_date = date.today() - timedelta(days=90)
        if not end_date:
            end_date = date.today()
        
        valid_metrics = ["revenue", "bookings", "users"]
        if metric not in valid_metrics:
            raise HTTPException(status_code=400, detail=f"Invalid metric. Must be one of: {valid_metrics}")
        
        # Get daily data
        daily_values = []
        
        if metric == "revenue":
            query = select(
                FactBooking.booking_date,
                func.sum(FactBooking.total_amount).label('daily_value')
            ).where(
                and_(
                    FactBooking.booking_date >= start_date,
                    FactBooking.booking_date <= end_date,
                    FactBooking.booking_status == 'confirmed'
                )
            ).group_by(FactBooking.booking_date).order_by(FactBooking.booking_date)
            
        elif metric == "bookings":
            query = select(
                FactBooking.booking_date,
                func.count(FactBooking.id).label('daily_value')
            ).where(
                and_(
                    FactBooking.booking_date >= start_date,
                    FactBooking.booking_date <= end_date,
                    FactBooking.booking_status == 'confirmed'
                )
            ).group_by(FactBooking.booking_date).order_by(FactBooking.booking_date)
            
        else:  # users
            query = select(
                FactUserActivity.activity_date,
                func.count(FactUserActivity.user_id.distinct()).label('daily_value')
            ).where(
                and_(
                    FactUserActivity.activity_date >= start_date,
                    FactUserActivity.activity_date <= end_date
                )
            ).group_by(FactUserActivity.activity_date).order_by(FactUserActivity.activity_date)
        
        result = await warehouse_db.execute(query)
        
        for row in result:
            date_col = row.booking_date if metric in ["revenue", "bookings"] else row.activity_date
            daily_values.append({
                "date": date_col,
                "value": float(row.daily_value or 0)
            })
        
        if len(daily_values) < 7:  # Need minimum data for anomaly detection
            raise HTTPException(status_code=400, detail="Insufficient data for anomaly detection (minimum 7 days required)")
        
        # Calculate statistical parameters
        values = [point["value"] for point in daily_values]
        mean_value = np.mean(values)
        std_dev = np.std(values)
        
        # Calculate thresholds
        upper_threshold = mean_value + (sensitivity * std_dev)
        lower_threshold = max(0, mean_value - (sensitivity * std_dev))  # Ensure non-negative
        
        # Detect anomalies
        anomalies = []
        normal_points = []
        
        for point in daily_values:
            is_anomaly = point["value"] > upper_threshold or point["value"] < lower_threshold
            
            if is_anomaly:
                anomaly_type = "high" if point["value"] > upper_threshold else "low"
                deviation = abs(point["value"] - mean_value) / std_dev if std_dev > 0 else 0
                
                anomalies.append({
                    "date": point["date"].isoformat(),
                    "value": point["value"],
                    "type": anomaly_type,
                    "deviation_score": round(deviation, 2),
                    "severity": "high" if deviation > 3 else "medium" if deviation > 2.5 else "low"
                })
            else:
                normal_points.append({
                    "date": point["date"].isoformat(),
                    "value": point["value"]
                })
        
        # Calculate moving averages for context
        window_size = min(7, len(daily_values))
        moving_averages = []
        
        for i in range(window_size - 1, len(daily_values)):
            window_values = [daily_values[j]["value"] for j in range(i - window_size + 1, i + 1)]
            moving_avg = sum(window_values) / len(window_values)
            moving_averages.append({
                "date": daily_values[i]["date"].isoformat(),
                "moving_average": round(moving_avg, 2)
            })
        
        # Anomaly summary
        anomaly_summary = {
            "total_anomalies": len(anomalies),
            "high_anomalies": len([a for a in anomalies if a["type"] == "high"]),
            "low_anomalies": len([a for a in anomalies if a["type"] == "low"]),
            "anomaly_rate": round((len(anomalies) / len(daily_values)) * 100, 2) if daily_values else 0,
            "severity_breakdown": {
                "high": len([a for a in anomalies if a["severity"] == "high"]),
                "medium": len([a for a in anomalies if a["severity"] == "medium"]),
                "low": len([a for a in anomalies if a["severity"] == "low"])
            }
        }
        
        return {
            "success": True,
            "data": {
                "anomalies": sorted(anomalies, key=lambda x: x["deviation_score"], reverse=True),
                "normal_points": normal_points,
                "moving_averages": moving_averages,
                "anomaly_summary": anomaly_summary,
                "statistical_parameters": {
                    "mean": round(mean_value, 2),
                    "standard_deviation": round(std_dev, 2),
                    "upper_threshold": round(upper_threshold, 2),
                    "lower_threshold": round(lower_threshold, 2),
                    "sensitivity": sensitivity
                }
            },
            "parameters": {
                "metric": metric,
                "sensitivity": sensitivity
            },
            "period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error detecting anomalies: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to detect anomalies: {str(e)}")


@router.get("/seasonality")
async def get_seasonality_analysis(
    metric: str = Query(..., description="Metric to analyze: revenue, bookings, users"),
    start_date: Optional[date] = Query(None, description="Start date for analysis"),
    end_date: Optional[date] = Query(None, description="End date for analysis"),
    warehouse_db: AsyncSession = Depends(get_warehouse_db)
) -> Dict[str, Any]:
    """
    Analyze seasonal patterns in data
    
    Returns:
    - Monthly seasonal patterns
    - Day-of-week patterns
    - Seasonal indices
    - Peak and trough periods
    """
    try:
        from sqlalchemy import select, func, and_, extract
        from app.models.warehouse_models import FactBooking, FactUserActivity
        import numpy as np
        
        if not start_date:
            start_date = date.today() - timedelta(days=365)  # Need at least a year for seasonality
        if not end_date:
            end_date = date.today()
        
        valid_metrics = ["revenue", "bookings", "users"]
        if metric not in valid_metrics:
            raise HTTPException(status_code=400, detail=f"Invalid metric. Must be one of: {valid_metrics}")
        
        # Monthly seasonality
        if metric == "revenue":
            monthly_query = select(
                extract('month', FactBooking.booking_date).label('month'),
                func.avg(func.sum(FactBooking.total_amount)).label('avg_monthly_value'),
                func.sum(FactBooking.total_amount).label('total_value'),
                func.count(FactBooking.booking_date.distinct()).label('days_count')
            ).where(
                and_(
                    FactBooking.booking_date >= start_date,
                    FactBooking.booking_date <= end_date,
                    FactBooking.booking_status == 'confirmed'
                )
            ).group_by(extract('month', FactBooking.booking_date)).order_by(extract('month', FactBooking.booking_date))
            
        elif metric == "bookings":
            monthly_query = select(
                extract('month', FactBooking.booking_date).label('month'),
                func.avg(func.count(FactBooking.id)).label('avg_monthly_value'),
                func.count(FactBooking.id).label('total_value'),
                func.count(FactBooking.booking_date.distinct()).label('days_count')
            ).where(
                and_(
                    FactBooking.booking_date >= start_date,
                    FactBooking.booking_date <= end_date,
                    FactBooking.booking_status == 'confirmed'
                )
            ).group_by(extract('month', FactBooking.booking_date)).order_by(extract('month', FactBooking.booking_date))
            
        else:  # users
            monthly_query = select(
                extract('month', FactUserActivity.activity_date).label('month'),
                func.avg(func.count(FactUserActivity.user_id.distinct())).label('avg_monthly_value'),
                func.count(FactUserActivity.user_id.distinct()).label('total_value'),
                func.count(FactUserActivity.activity_date.distinct()).label('days_count')
            ).where(
                and_(
                    FactUserActivity.activity_date >= start_date,
                    FactUserActivity.activity_date <= end_date
                )
            ).group_by(extract('month', FactUserActivity.activity_date)).order_by(extract('month', FactUserActivity.activity_date))
        
        monthly_result = await warehouse_db.execute(monthly_query)
        
        month_names = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ]
        
        monthly_patterns = []
        monthly_values = []
        
        for row in monthly_result:
            month_idx = int(row.month) - 1
            avg_daily_value = float(row.total_value) / max(1, row.days_count)
            
            monthly_patterns.append({
                "month": month_names[month_idx],
                "month_number": int(row.month),
                "average_daily_value": round(avg_daily_value, 2),
                "total_value": float(row.total_value),
                "days_with_data": row.days_count
            })
            monthly_values.append(avg_daily_value)
        
        # Calculate seasonal indices (relative to average)
        if monthly_values:
            overall_average = sum(monthly_values) / len(monthly_values)
            for pattern in monthly_patterns:
                seasonal_index = (pattern["average_daily_value"] / overall_average) * 100 if overall_average > 0 else 100
                pattern["seasonal_index"] = round(seasonal_index, 2)
        
        # Day of week patterns
        if metric == "revenue":
            dow_query = select(
                extract('dow', FactBooking.booking_date).label('day_of_week'),
                func.avg(func.sum(FactBooking.total_amount)).label('avg_daily_value')
            ).where(
                and_(
                    FactBooking.booking_date >= start_date,
                    FactBooking.booking_date <= end_date,
                    FactBooking.booking_status == 'confirmed'
                )
            ).group_by(extract('dow', FactBooking.booking_date)).order_by(extract('dow', FactBooking.booking_date))
            
        elif metric == "bookings":
            dow_query = select(
                extract('dow', FactBooking.booking_date).label('day_of_week'),
                func.avg(func.count(FactBooking.id)).label('avg_daily_value')
            ).where(
                and_(
                    FactBooking.booking_date >= start_date,
                    FactBooking.booking_date <= end_date,
                    FactBooking.booking_status == 'confirmed'
                )
            ).group_by(extract('dow', FactBooking.booking_date)).order_by(extract('dow', FactBooking.booking_date))
            
        else:  # users
            dow_query = select(
                extract('dow', FactUserActivity.activity_date).label('day_of_week'),
                func.avg(func.count(FactUserActivity.user_id.distinct())).label('avg_daily_value')
            ).where(
                and_(
                    FactUserActivity.activity_date >= start_date,
                    FactUserActivity.activity_date <= end_date
                )
            ).group_by(extract('dow', FactUserActivity.activity_date)).order_by(extract('dow', FactUserActivity.activity_date))
        
        dow_result = await warehouse_db.execute(dow_query)
        
        day_names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
        dow_patterns = []
        
        for row in dow_result:
            day_idx = int(row.day_of_week)
            dow_patterns.append({
                "day_of_week": day_names[day_idx],
                "day_number": day_idx,
                "average_value": round(float(row.avg_daily_value or 0), 2)
            })
        
        # Identify peaks and troughs
        peak_month = max(monthly_patterns, key=lambda x: x["seasonal_index"]) if monthly_patterns else None
        trough_month = min(monthly_patterns, key=lambda x: x["seasonal_index"]) if monthly_patterns else None
        
        peak_dow = max(dow_patterns, key=lambda x: x["average_value"]) if dow_patterns else None
        trough_dow = min(dow_patterns, key=lambda x: x["average_value"]) if dow_patterns else None
        
        # Seasonality strength calculation
        if monthly_values and len(monthly_values) > 1:
            coefficient_of_variation = (np.std(monthly_values) / np.mean(monthly_values)) * 100
            if coefficient_of_variation > 30:
                seasonality_strength = "high"
            elif coefficient_of_variation > 15:
                seasonality_strength = "moderate"
            else:
                seasonality_strength = "low"
        else:
            seasonality_strength = "unknown"
            coefficient_of_variation = 0
        
        return {
            "success": True,
            "data": {
                "monthly_patterns": monthly_patterns,
                "day_of_week_patterns": dow_patterns,
                "peak_periods": {
                    "peak_month": peak_month,
                    "trough_month": trough_month,
                    "peak_day_of_week": peak_dow,
                    "trough_day_of_week": trough_dow
                },
                "seasonality_analysis": {
                    "strength": seasonality_strength,
                    "coefficient_of_variation": round(coefficient_of_variation, 2),
                    "overall_average": round(sum(monthly_values) / len(monthly_values), 2) if monthly_values else 0
                }
            },
            "parameters": {
                "metric": metric
            },
            "period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing seasonality: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to analyze seasonality: {str(e)}")