"""
Property Analytics API Endpoints
"""

from datetime import date, timedelta
from typing import Dict, List, Optional, Any, Union
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from app.core.database import get_warehouse_db
from app.services.analytics_service import AnalyticsService


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics/properties", tags=["property-analytics"])


@router.get("/")
async def get_property_analytics(
    start_date: Optional[date] = Query(None, description="Start date for analysis"),
    end_date: Optional[date] = Query(None, description="End date for analysis"),
    property_type: Optional[str] = Query(None, description="Filter by property type"),
    city: Optional[str] = Query(None, description="Filter by city"),
    country: Optional[str] = Query(None, description="Filter by country"),
    min_rating: Optional[float] = Query(None, description="Minimum rating filter", ge=0, le=5),
    warehouse_db: AsyncSession = Depends(get_warehouse_db)
) -> Dict[str, Any]:
    """
    Get comprehensive property analytics
    
    Returns:
    - Property performance metrics
    - Booking patterns
    - Revenue insights
    - Market analysis
    """
    try:
        from sqlalchemy import select, func, and_, or_, case
        from app.models.warehouse_models import FactProperty, FactBooking, DimProperty
        
        if not start_date:
            start_date = date.today() - timedelta(days=30)
        if not end_date:
            end_date = date.today()
        
        if end_date <= start_date:
            raise HTTPException(status_code=400, detail="End date must be after start date")
        
        # Build base query with filters
        base_filters = [
            FactBooking.booking_date >= start_date,
            FactBooking.booking_date <= end_date
        ]
        
        if property_type:
            base_filters.append(FactProperty.property_type == property_type)
        if city:
            base_filters.append(FactProperty.city == city)
        if country:
            base_filters.append(FactProperty.country == country)
        if min_rating:
            base_filters.append(FactProperty.average_rating >= min_rating)
        
        # Property performance overview
        performance_query = select(
            func.count(FactProperty.property_id.distinct()).label('total_properties'),
            func.count(FactBooking.id).label('total_bookings'),
            func.sum(FactBooking.total_amount).label('total_revenue'),
            func.avg(FactBooking.total_amount).label('avg_booking_value'),
            func.avg(FactProperty.average_rating).label('avg_property_rating'),
            func.avg(FactProperty.occupancy_rate).label('avg_occupancy_rate')
        ).select_from(
            FactProperty.__table__.join(
                FactBooking.__table__,
                FactProperty.property_id == FactBooking.property_id
            )
        ).where(and_(*base_filters))
        
        performance_result = await warehouse_db.execute(performance_query)
        performance_row = performance_result.first()
        
        performance_metrics = {
            "total_properties": performance_row.total_properties or 0,
            "total_bookings": performance_row.total_bookings or 0,
            "total_revenue": float(performance_row.total_revenue or 0),
            "average_booking_value": float(performance_row.avg_booking_value or 0),
            "average_property_rating": float(performance_row.avg_property_rating or 0),
            "average_occupancy_rate": float(performance_row.avg_occupancy_rate or 0)
        }
        
        # Top performing properties
        top_properties_query = select(
            FactProperty.property_id,
            FactProperty.property_name,
            FactProperty.property_type,
            FactProperty.city,
            FactProperty.country,
            func.count(FactBooking.id).label('booking_count'),
            func.sum(FactBooking.total_amount).label('total_revenue'),
            func.avg(FactBooking.total_amount).label('avg_booking_value'),
            FactProperty.average_rating,
            FactProperty.occupancy_rate
        ).select_from(
            FactProperty.__table__.join(
                FactBooking.__table__,
                FactProperty.property_id == FactBooking.property_id
            )
        ).where(
            and_(*base_filters)
        ).group_by(
            FactProperty.property_id,
            FactProperty.property_name,
            FactProperty.property_type,
            FactProperty.city,
            FactProperty.country,
            FactProperty.average_rating,
            FactProperty.occupancy_rate
        ).order_by(func.sum(FactBooking.total_amount).desc()).limit(20)
        
        top_properties_result = await warehouse_db.execute(top_properties_query)
        
        top_properties = []
        for row in top_properties_result:
            top_properties.append({
                "property_id": str(row.property_id),
                "property_name": row.property_name,
                "property_type": row.property_type,
                "location": f"{row.city}, {row.country}",
                "booking_count": row.booking_count,
                "total_revenue": float(row.total_revenue),
                "average_booking_value": float(row.avg_booking_value),
                "rating": float(row.average_rating or 0),
                "occupancy_rate": float(row.occupancy_rate or 0)
            })
        
        # Property type performance
        type_performance_query = select(
            FactProperty.property_type,
            func.count(FactProperty.property_id.distinct()).label('property_count'),
            func.count(FactBooking.id).label('booking_count'),
            func.sum(FactBooking.total_amount).label('total_revenue'),
            func.avg(FactBooking.total_amount).label('avg_booking_value'),
            func.avg(FactProperty.average_rating).label('avg_rating'),
            func.avg(FactProperty.occupancy_rate).label('avg_occupancy_rate')
        ).select_from(
            FactProperty.__table__.join(
                FactBooking.__table__,
                FactProperty.property_id == FactBooking.property_id
            )
        ).where(
            and_(*base_filters)
        ).group_by(FactProperty.property_type).order_by(func.sum(FactBooking.total_amount).desc())
        
        type_performance_result = await warehouse_db.execute(type_performance_query)
        
        type_performance = []
        for row in type_performance_result:
            type_performance.append({
                "property_type": row.property_type,
                "property_count": row.property_count,
                "booking_count": row.booking_count,
                "total_revenue": float(row.total_revenue),
                "average_booking_value": float(row.avg_booking_value),
                "average_rating": float(row.avg_rating or 0),
                "average_occupancy_rate": float(row.avg_occupancy_rate or 0)
            })
        
        # Geographic performance
        geographic_performance_query = select(
            FactProperty.country,
            FactProperty.city,
            func.count(FactProperty.property_id.distinct()).label('property_count'),
            func.count(FactBooking.id).label('booking_count'),
            func.sum(FactBooking.total_amount).label('total_revenue'),
            func.avg(FactProperty.average_rating).label('avg_rating')
        ).select_from(
            FactProperty.__table__.join(
                FactBooking.__table__,
                FactProperty.property_id == FactBooking.property_id
            )
        ).where(
            and_(*base_filters)
        ).group_by(FactProperty.country, FactProperty.city).order_by(func.sum(FactBooking.total_amount).desc()).limit(15)
        
        geographic_result = await warehouse_db.execute(geographic_performance_query)
        
        geographic_performance = []
        for row in geographic_result:
            geographic_performance.append({
                "location": f"{row.city}, {row.country}",
                "property_count": row.property_count,
                "booking_count": row.booking_count,
                "total_revenue": float(row.total_revenue),
                "average_rating": float(row.avg_rating or 0)
            })
        
        return {
            "success": True,
            "data": {
                "performance_metrics": performance_metrics,
                "top_properties": top_properties,
                "property_type_performance": type_performance,
                "geographic_performance": geographic_performance
            },
            "filters": {
                "property_type": property_type,
                "city": city,
                "country": country,
                "min_rating": min_rating
            },
            "period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting property analytics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get property analytics: {str(e)}")


@router.get("/occupancy")
async def get_occupancy_analytics(
    start_date: Optional[date] = Query(None, description="Start date for analysis"),
    end_date: Optional[date] = Query(None, description="End date for analysis"),
    property_type: Optional[str] = Query(None, description="Filter by property type"),
    granularity: str = Query("day", description="Time granularity: day, week, month"),
    warehouse_db: AsyncSession = Depends(get_warehouse_db)
) -> Dict[str, Any]:
    """
    Get property occupancy analytics
    
    Returns:
    - Occupancy trends over time
    - Peak and low seasons
    - Property type comparisons
    - Seasonal patterns
    """
    try:
        from sqlalchemy import select, func, and_, extract, case
        from app.models.warehouse_models import FactProperty, FactBooking
        
        if not start_date:
            start_date = date.today() - timedelta(days=90)
        if not end_date:
            end_date = date.today()
        
        # Base filters
        base_filters = [
            FactBooking.booking_date >= start_date,
            FactBooking.booking_date <= end_date,
            FactBooking.booking_status == 'confirmed'
        ]
        
        if property_type:
            base_filters.append(FactProperty.property_type == property_type)
        
        # Determine time grouping based on granularity
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
        
        # Occupancy trends over time
        occupancy_trends_query = select(
            time_label,
            func.count(FactBooking.id).label('total_bookings'),
            func.count(FactProperty.property_id.distinct()).label('properties_with_bookings'),
            func.avg(FactProperty.occupancy_rate).label('avg_occupancy_rate'),
            func.sum(FactBooking.total_amount).label('total_revenue')
        ).select_from(
            FactProperty.__table__.join(
                FactBooking.__table__,
                FactProperty.property_id == FactBooking.property_id
            )
        ).where(
            and_(*base_filters)
        ).group_by(*time_group).order_by(*time_group)
        
        trends_result = await warehouse_db.execute(occupancy_trends_query)
        
        occupancy_trends = []
        for row in trends_result:
            occupancy_trends.append({
                "time_period": str(row.time_period),
                "total_bookings": row.total_bookings,
                "properties_with_bookings": row.properties_with_bookings,
                "average_occupancy_rate": float(row.avg_occupancy_rate or 0),
                "total_revenue": float(row.total_revenue)
            })
        
        # Seasonal patterns (by month)
        seasonal_query = select(
            extract('month', FactBooking.booking_date).label('month'),
            func.count(FactBooking.id).label('booking_count'),
            func.avg(FactProperty.occupancy_rate).label('avg_occupancy_rate'),
            func.avg(FactBooking.total_amount).label('avg_booking_value')
        ).select_from(
            FactProperty.__table__.join(
                FactBooking.__table__,
                FactProperty.property_id == FactBooking.property_id
            )
        ).where(
            and_(*base_filters)
        ).group_by(extract('month', FactBooking.booking_date)).order_by(extract('month', FactBooking.booking_date))
        
        seasonal_result = await warehouse_db.execute(seasonal_query)
        
        month_names = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ]
        
        seasonal_patterns = []
        for row in seasonal_result:
            month_idx = int(row.month) - 1
            seasonal_patterns.append({
                "month": month_names[month_idx],
                "month_number": int(row.month),
                "booking_count": row.booking_count,
                "average_occupancy_rate": float(row.avg_occupancy_rate or 0),
                "average_booking_value": float(row.avg_booking_value or 0)
            })
        
        # Day of week patterns
        dow_query = select(
            extract('dow', FactBooking.booking_date).label('day_of_week'),
            func.count(FactBooking.id).label('booking_count'),
            func.avg(FactProperty.occupancy_rate).label('avg_occupancy_rate')
        ).select_from(
            FactProperty.__table__.join(
                FactBooking.__table__,
                FactProperty.property_id == FactBooking.property_id
            )
        ).where(
            and_(*base_filters)
        ).group_by(extract('dow', FactBooking.booking_date)).order_by(extract('dow', FactBooking.booking_date))
        
        dow_result = await warehouse_db.execute(dow_query)
        
        day_names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
        
        dow_patterns = []
        for row in dow_result:
            day_idx = int(row.day_of_week)
            dow_patterns.append({
                "day_of_week": day_names[day_idx],
                "booking_count": row.booking_count,
                "average_occupancy_rate": float(row.avg_occupancy_rate or 0)
            })
        
        # Property type occupancy comparison
        if not property_type:  # Only show comparison if not filtering by type
            type_occupancy_query = select(
                FactProperty.property_type,
                func.avg(FactProperty.occupancy_rate).label('avg_occupancy_rate'),
                func.count(FactBooking.id).label('booking_count'),
                func.count(FactProperty.property_id.distinct()).label('property_count')
            ).select_from(
                FactProperty.__table__.join(
                    FactBooking.__table__,
                    FactProperty.property_id == FactBooking.property_id
                )
            ).where(
                and_(*base_filters)
            ).group_by(FactProperty.property_type).order_by(func.avg(FactProperty.occupancy_rate).desc())
            
            type_occupancy_result = await warehouse_db.execute(type_occupancy_query)
            
            type_occupancy = []
            for row in type_occupancy_result:
                type_occupancy.append({
                    "property_type": row.property_type,
                    "average_occupancy_rate": float(row.avg_occupancy_rate or 0),
                    "booking_count": row.booking_count,
                    "property_count": row.property_count
                })
        else:
            type_occupancy = []
        
        return {
            "success": True,
            "data": {
                "occupancy_trends": occupancy_trends,
                "seasonal_patterns": seasonal_patterns,
                "day_of_week_patterns": dow_patterns,
                "property_type_occupancy": type_occupancy
            },
            "filters": {
                "property_type": property_type,
                "granularity": granularity
            },
            "period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting occupancy analytics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get occupancy analytics: {str(e)}")


@router.get("/market-analysis")
async def get_market_analysis(
    region: Optional[str] = Query(None, description="Geographic region filter"),
    property_type: Optional[str] = Query(None, description="Property type filter"),
    warehouse_db: AsyncSession = Depends(get_warehouse_db)
) -> Dict[str, Any]:
    """
    Get property market analysis
    
    Returns:
    - Market share analysis
    - Competitive positioning
    - Pricing insights
    - Growth opportunities
    """
    try:
        from sqlalchemy import select, func, and_, case
        from app.models.warehouse_models import FactProperty, FactBooking
        
        start_date = date.today() - timedelta(days=365)  # 1 year analysis
        end_date = date.today()
        
        # Base filters
        base_filters = [
            FactBooking.booking_date >= start_date,
            FactBooking.booking_date <= end_date,
            FactBooking.booking_status == 'confirmed'
        ]
        
        if region:
            base_filters.append(FactProperty.country == region)
        if property_type:
            base_filters.append(FactProperty.property_type == property_type)
        
        # Market concentration analysis
        market_share_query = select(
            FactProperty.property_id,
            FactProperty.property_name,
            func.sum(FactBooking.total_amount).label('total_revenue'),
            func.count(FactBooking.id).label('booking_count'),
            (func.sum(FactBooking.total_amount) * 100.0 / 
             select(func.sum(FactBooking.total_amount)).where(and_(*base_filters)).scalar_subquery()
            ).label('market_share_percent')
        ).select_from(
            FactProperty.__table__.join(
                FactBooking.__table__,
                FactProperty.property_id == FactBooking.property_id
            )
        ).where(
            and_(*base_filters)
        ).group_by(
            FactProperty.property_id,
            FactProperty.property_name
        ).order_by(func.sum(FactBooking.total_amount).desc()).limit(20)
        
        market_share_result = await warehouse_db.execute(market_share_query)
        
        market_leaders = []
        for row in market_share_result:
            market_leaders.append({
                "property_id": str(row.property_id),
                "property_name": row.property_name,
                "total_revenue": float(row.total_revenue),
                "booking_count": row.booking_count,
                "market_share_percent": float(row.market_share_percent or 0)
            })
        
        # Price segmentation analysis
        price_segments_query = select(
            case(
                (FactBooking.total_amount < 100, 'budget'),
                (FactBooking.total_amount < 300, 'mid_range'),
                (FactBooking.total_amount < 600, 'premium'),
                (FactBooking.total_amount >= 600, 'luxury')
            ).label('price_segment'),
            func.count(FactBooking.id).label('booking_count'),
            func.sum(FactBooking.total_amount).label('total_revenue'),
            func.avg(FactBooking.total_amount).label('avg_price'),
            func.count(FactProperty.property_id.distinct()).label('property_count')
        ).select_from(
            FactProperty.__table__.join(
                FactBooking.__table__,
                FactProperty.property_id == FactBooking.property_id
            )
        ).where(
            and_(*base_filters)
        ).group_by('price_segment')
        
        price_segments_result = await warehouse_db.execute(price_segments_query)
        
        price_segments = []
        for row in price_segments_result:
            price_segments.append({
                "price_segment": row.price_segment,
                "booking_count": row.booking_count,
                "total_revenue": float(row.total_revenue),
                "average_price": float(row.avg_price),
                "property_count": row.property_count
            })
        
        # Rating distribution analysis
        rating_distribution_query = select(
            case(
                (FactProperty.average_rating < 3.0, 'below_average'),
                (FactProperty.average_rating < 4.0, 'average'),
                (FactProperty.average_rating < 4.5, 'good'),
                (FactProperty.average_rating >= 4.5, 'excellent')
            ).label('rating_category'),
            func.count(FactProperty.property_id.distinct()).label('property_count'),
            func.count(FactBooking.id).label('booking_count'),
            func.sum(FactBooking.total_amount).label('total_revenue'),
            func.avg(FactProperty.average_rating).label('avg_rating')
        ).select_from(
            FactProperty.__table__.join(
                FactBooking.__table__,
                FactProperty.property_id == FactBooking.property_id
            )
        ).where(
            and_(*base_filters)
        ).group_by('rating_category')
        
        rating_distribution_result = await warehouse_db.execute(rating_distribution_query)
        
        rating_distribution = []
        for row in rating_distribution_result:
            rating_distribution.append({
                "rating_category": row.rating_category,
                "property_count": row.property_count,
                "booking_count": row.booking_count,
                "total_revenue": float(row.total_revenue),
                "average_rating": float(row.avg_rating or 0)
            })
        
        # Growth opportunities (underperforming properties)
        growth_opportunities_query = select(
            FactProperty.property_id,
            FactProperty.property_name,
            FactProperty.property_type,
            FactProperty.city,
            FactProperty.average_rating,
            FactProperty.occupancy_rate,
            func.count(FactBooking.id).label('booking_count'),
            func.sum(FactBooking.total_amount).label('total_revenue'),
            func.avg(FactBooking.total_amount).label('avg_booking_value')
        ).select_from(
            FactProperty.__table__.left_join(
                FactBooking.__table__,
                and_(
                    FactProperty.property_id == FactBooking.property_id,
                    FactBooking.booking_date >= start_date,
                    FactBooking.booking_date <= end_date,
                    FactBooking.booking_status == 'confirmed'
                )
            )
        ).where(
            and_(
                or_(
                    FactProperty.occupancy_rate < 50,
                    FactProperty.average_rating < 4.0,
                    func.count(FactBooking.id) < 10
                ),
                *([FactProperty.country == region] if region else []),
                *([FactProperty.property_type == property_type] if property_type else [])
            )
        ).group_by(
            FactProperty.property_id,
            FactProperty.property_name,
            FactProperty.property_type,
            FactProperty.city,
            FactProperty.average_rating,
            FactProperty.occupancy_rate
        ).order_by(FactProperty.occupancy_rate.asc()).limit(15)
        
        growth_opportunities_result = await warehouse_db.execute(growth_opportunities_query)
        
        growth_opportunities = []
        for row in growth_opportunities_result:
            growth_opportunities.append({
                "property_id": str(row.property_id),
                "property_name": row.property_name,
                "property_type": row.property_type,
                "city": row.city,
                "rating": float(row.average_rating or 0),
                "occupancy_rate": float(row.occupancy_rate or 0),
                "booking_count": row.booking_count or 0,
                "total_revenue": float(row.total_revenue or 0),
                "average_booking_value": float(row.avg_booking_value or 0)
            })
        
        return {
            "success": True,
            "data": {
                "market_leaders": market_leaders,
                "price_segments": price_segments,
                "rating_distribution": rating_distribution,
                "growth_opportunities": growth_opportunities
            },
            "filters": {
                "region": region,
                "property_type": property_type
            },
            "analysis_period": "Last 12 months"
        }
        
    except Exception as e:
        logger.error(f"Error getting market analysis: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get market analysis: {str(e)}")


@router.get("/{property_id}/details")
async def get_property_detailed_analytics(
    property_id: str,
    start_date: Optional[date] = Query(None, description="Start date for analysis"),
    end_date: Optional[date] = Query(None, description="End date for analysis"),
    warehouse_db: AsyncSession = Depends(get_warehouse_db)
) -> Dict[str, Any]:
    """
    Get detailed analytics for a specific property
    
    Returns:
    - Property performance over time
    - Booking patterns
    - Revenue trends
    - Guest demographics
    """
    try:
        from sqlalchemy import select, func, and_, extract
        from app.models.warehouse_models import FactProperty, FactBooking, FactUserActivity
        import uuid
        
        if not start_date:
            start_date = date.today() - timedelta(days=90)
        if not end_date:
            end_date = date.today()
        
        # Validate property_id format
        try:
            property_uuid = uuid.UUID(property_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid property ID format")
        
        # Property basic info
        property_info_query = select(
            FactProperty.property_id,
            FactProperty.property_name,
            FactProperty.property_type,
            FactProperty.city,
            FactProperty.country,
            FactProperty.average_rating,
            FactProperty.occupancy_rate
        ).where(FactProperty.property_id == property_uuid)
        
        property_info_result = await warehouse_db.execute(property_info_query)
        property_info = property_info_result.first()
        
        if not property_info:
            raise HTTPException(status_code=404, detail="Property not found")
        
        # Property performance metrics
        performance_query = select(
            func.count(FactBooking.id).label('total_bookings'),
            func.sum(FactBooking.total_amount).label('total_revenue'),
            func.avg(FactBooking.total_amount).label('avg_booking_value'),
            func.min(FactBooking.booking_date).label('first_booking'),
            func.max(FactBooking.booking_date).label('last_booking')
        ).where(
            and_(
                FactBooking.property_id == property_uuid,
                FactBooking.booking_date >= start_date,
                FactBooking.booking_date <= end_date,
                FactBooking.booking_status == 'confirmed'
            )
        )
        
        performance_result = await warehouse_db.execute(performance_query)
        performance_row = performance_result.first()
        
        # Revenue trends over time
        revenue_trends_query = select(
            func.date_trunc('week', FactBooking.booking_date).label('week'),
            func.count(FactBooking.id).label('booking_count'),
            func.sum(FactBooking.total_amount).label('weekly_revenue')
        ).where(
            and_(
                FactBooking.property_id == property_uuid,
                FactBooking.booking_date >= start_date,
                FactBooking.booking_date <= end_date,
                FactBooking.booking_status == 'confirmed'
            )
        ).group_by(func.date_trunc('week', FactBooking.booking_date)).order_by(func.date_trunc('week', FactBooking.booking_date))
        
        revenue_trends_result = await warehouse_db.execute(revenue_trends_query)
        
        revenue_trends = []
        for row in revenue_trends_result:
            revenue_trends.append({
                "week": row.week.isoformat() if row.week else None,
                "booking_count": row.booking_count,
                "weekly_revenue": float(row.weekly_revenue)
            })
        
        # Booking patterns by day of week
        booking_patterns_query = select(
            extract('dow', FactBooking.booking_date).label('day_of_week'),
            func.count(FactBooking.id).label('booking_count'),
            func.avg(FactBooking.total_amount).label('avg_booking_value')
        ).where(
            and_(
                FactBooking.property_id == property_uuid,
                FactBooking.booking_date >= start_date,
                FactBooking.booking_date <= end_date,
                FactBooking.booking_status == 'confirmed'
            )
        ).group_by(extract('dow', FactBooking.booking_date)).order_by(extract('dow', FactBooking.booking_date))
        
        booking_patterns_result = await warehouse_db.execute(booking_patterns_query)
        
        day_names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
        booking_patterns = []
        for row in booking_patterns_result:
            day_idx = int(row.day_of_week)
            booking_patterns.append({
                "day_of_week": day_names[day_idx],
                "booking_count": row.booking_count,
                "average_booking_value": float(row.avg_booking_value)
            })
        
        return {
            "success": True,
            "data": {
                "property_info": {
                    "property_id": str(property_info.property_id),
                    "property_name": property_info.property_name,
                    "property_type": property_info.property_type,
                    "location": f"{property_info.city}, {property_info.country}",
                    "rating": float(property_info.average_rating or 0),
                    "occupancy_rate": float(property_info.occupancy_rate or 0)
                },
                "performance_metrics": {
                    "total_bookings": performance_row.total_bookings or 0,
                    "total_revenue": float(performance_row.total_revenue or 0),
                    "average_booking_value": float(performance_row.avg_booking_value or 0),
                    "first_booking": performance_row.first_booking.isoformat() if performance_row.first_booking else None,
                    "last_booking": performance_row.last_booking.isoformat() if performance_row.last_booking else None
                },
                "revenue_trends": revenue_trends,
                "booking_patterns": booking_patterns
            },
            "period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting property detailed analytics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get property analytics: {str(e)}")