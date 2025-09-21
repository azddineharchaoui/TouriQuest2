"""
Analytics Service - Core analytics calculations and data processing
"""

import asyncio
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Any, Tuple
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc, text
from sqlalchemy.orm import selectinload
import pandas as pd
import numpy as np
from dataclasses import dataclass

from app.models.analytics_models import (
    BusinessMetric, RevenueMetric, UserAnalyticMetric, 
    PropertyAnalyticMetric, PerformanceMetric, MetricType, DataGranularity
)
from app.models.warehouse_models import (
    FactBooking, FactUserActivity, FactProperty, AggregatedMetric
)


@dataclass
class MetricCalculationResult:
    """Result of metric calculation"""
    metric_name: str
    value: float
    previous_value: Optional[float] = None
    percentage_change: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None


class AnalyticsService:
    """Core analytics service for business intelligence"""
    
    def __init__(self):
        self.cache_ttl = 3600  # 1 hour default cache
    
    async def calculate_business_metrics(
        self,
        db: AsyncSession,
        start_date: date,
        end_date: date,
        granularity: DataGranularity = DataGranularity.DAILY,
        categories: Optional[List[str]] = None
    ) -> List[MetricCalculationResult]:
        """Calculate comprehensive business metrics"""
        
        results = []
        
        # Revenue metrics
        revenue_metrics = await self._calculate_revenue_metrics(
            db, start_date, end_date, granularity, categories
        )
        results.extend(revenue_metrics)
        
        # Conversion metrics
        conversion_metrics = await self._calculate_conversion_metrics(
            db, start_date, end_date, granularity
        )
        results.extend(conversion_metrics)
        
        # User acquisition metrics
        acquisition_metrics = await self._calculate_user_acquisition_metrics(
            db, start_date, end_date, granularity
        )
        results.extend(acquisition_metrics)
        
        # Market metrics
        market_metrics = await self._calculate_market_metrics(
            db, start_date, end_date, granularity
        )
        results.extend(market_metrics)
        
        return results
    
    async def _calculate_revenue_metrics(
        self,
        db: AsyncSession,
        start_date: date,
        end_date: date,
        granularity: DataGranularity,
        categories: Optional[List[str]] = None
    ) -> List[MetricCalculationResult]:
        """Calculate revenue-related metrics"""
        
        results = []
        
        # Total revenue
        query = select(func.sum(FactBooking.total_amount)).where(
            and_(
                FactBooking.booking_date >= start_date,
                FactBooking.booking_date <= end_date,
                FactBooking.booking_status == 'confirmed'
            )
        )
        
        if categories:
            query = query.where(FactBooking.property_type.in_(categories))
        
        result = await db.execute(query)
        total_revenue = result.scalar() or 0
        
        # Previous period for comparison
        period_days = (end_date - start_date).days
        previous_start = start_date - timedelta(days=period_days)
        previous_end = start_date - timedelta(days=1)
        
        prev_query = select(func.sum(FactBooking.total_amount)).where(
            and_(
                FactBooking.booking_date >= previous_start,
                FactBooking.booking_date <= previous_end,
                FactBooking.booking_status == 'confirmed'
            )
        )
        
        prev_result = await db.execute(prev_query)
        previous_revenue = prev_result.scalar() or 0
        
        percentage_change = None
        if previous_revenue > 0:
            percentage_change = ((total_revenue - previous_revenue) / previous_revenue) * 100
        
        results.append(MetricCalculationResult(
            metric_name="total_revenue",
            value=float(total_revenue),
            previous_value=float(previous_revenue),
            percentage_change=percentage_change,
            metadata={"period_days": period_days, "categories": categories}
        ))
        
        # Revenue by category
        if not categories:
            category_query = select(
                FactBooking.property_type,
                func.sum(FactBooking.total_amount).label('revenue')
            ).where(
                and_(
                    FactBooking.booking_date >= start_date,
                    FactBooking.booking_date <= end_date,
                    FactBooking.booking_status == 'confirmed'
                )
            ).group_by(FactBooking.property_type)
            
            category_result = await db.execute(category_query)
            for row in category_result:
                results.append(MetricCalculationResult(
                    metric_name=f"revenue_{row.property_type}",
                    value=float(row.revenue),
                    metadata={"category": row.property_type}
                ))
        
        # Average booking value
        avg_query = select(func.avg(FactBooking.total_amount)).where(
            and_(
                FactBooking.booking_date >= start_date,
                FactBooking.booking_date <= end_date,
                FactBooking.booking_status == 'confirmed'
            )
        )
        
        avg_result = await db.execute(avg_query)
        avg_booking_value = avg_result.scalar() or 0
        
        results.append(MetricCalculationResult(
            metric_name="average_booking_value",
            value=float(avg_booking_value),
            metadata={"period": f"{start_date} to {end_date}"}
        ))
        
        return results
    
    async def _calculate_conversion_metrics(
        self,
        db: AsyncSession,
        start_date: date,
        end_date: date,
        granularity: DataGranularity
    ) -> List[MetricCalculationResult]:
        """Calculate conversion rate metrics"""
        
        results = []
        
        # Search to booking conversion
        # Get total searches
        search_query = select(func.count(FactUserActivity.id)).where(
            and_(
                FactUserActivity.activity_date >= start_date,
                FactUserActivity.activity_date <= end_date,
                FactUserActivity.activity_type == 'search'
            )
        )
        
        search_result = await db.execute(search_query)
        total_searches = search_result.scalar() or 0
        
        # Get total bookings
        booking_query = select(func.count(FactBooking.id)).where(
            and_(
                FactBooking.booking_date >= start_date,
                FactBooking.booking_date <= end_date,
                FactBooking.booking_status == 'confirmed'
            )
        )
        
        booking_result = await db.execute(booking_query)
        total_bookings = booking_result.scalar() or 0
        
        # Calculate conversion rate
        search_to_booking_rate = 0
        if total_searches > 0:
            search_to_booking_rate = (total_bookings / total_searches) * 100
        
        results.append(MetricCalculationResult(
            metric_name="search_to_booking_conversion",
            value=search_to_booking_rate,
            metadata={
                "total_searches": total_searches,
                "total_bookings": total_bookings
            }
        ))
        
        # View to booking conversion
        view_query = select(func.count(FactUserActivity.id)).where(
            and_(
                FactUserActivity.activity_date >= start_date,
                FactUserActivity.activity_date <= end_date,
                FactUserActivity.activity_type == 'property_view'
            )
        )
        
        view_result = await db.execute(view_query)
        total_views = view_result.scalar() or 0
        
        view_to_booking_rate = 0
        if total_views > 0:
            view_to_booking_rate = (total_bookings / total_views) * 100
        
        results.append(MetricCalculationResult(
            metric_name="view_to_booking_conversion",
            value=view_to_booking_rate,
            metadata={
                "total_views": total_views,
                "total_bookings": total_bookings
            }
        ))
        
        return results
    
    async def _calculate_user_acquisition_metrics(
        self,
        db: AsyncSession,
        start_date: date,
        end_date: date,
        granularity: DataGranularity
    ) -> List[MetricCalculationResult]:
        """Calculate user acquisition and behavior metrics"""
        
        results = []
        
        # New user acquisition
        new_users_query = select(func.count(FactUserActivity.user_id.distinct())).where(
            and_(
                FactUserActivity.activity_date >= start_date,
                FactUserActivity.activity_date <= end_date,
                FactUserActivity.is_first_visit == True
            )
        )
        
        new_users_result = await db.execute(new_users_query)
        new_users = new_users_result.scalar() or 0
        
        results.append(MetricCalculationResult(
            metric_name="new_users",
            value=new_users,
            metadata={"period": f"{start_date} to {end_date}"}
        ))
        
        # Customer Lifetime Value (CLV)
        clv_query = select(
            func.avg(
                func.sum(FactBooking.total_amount)
            ).over(partition_by=FactBooking.user_id)
        ).where(
            and_(
                FactBooking.booking_date >= start_date,
                FactBooking.booking_date <= end_date,
                FactBooking.booking_status == 'confirmed'
            )
        )
        
        clv_result = await db.execute(clv_query)
        avg_clv = clv_result.scalar() or 0
        
        results.append(MetricCalculationResult(
            metric_name="customer_lifetime_value",
            value=float(avg_clv),
            metadata={"calculation_method": "average_total_spending"}
        ))
        
        # User retention rate (30-day)
        retention_start = end_date - timedelta(days=30)
        
        # Users who were active 30 days ago
        initial_users_query = select(func.count(FactUserActivity.user_id.distinct())).where(
            FactUserActivity.activity_date == retention_start
        )
        
        initial_users_result = await db.execute(initial_users_query)
        initial_users = initial_users_result.scalar() or 0
        
        # Users who were active both 30 days ago and recently
        retained_users_query = select(func.count(FactUserActivity.user_id.distinct())).where(
            and_(
                FactUserActivity.user_id.in_(
                    select(FactUserActivity.user_id.distinct()).where(
                        FactUserActivity.activity_date == retention_start
                    )
                ),
                FactUserActivity.activity_date >= end_date - timedelta(days=7),
                FactUserActivity.activity_date <= end_date
            )
        )
        
        retained_users_result = await db.execute(retained_users_query)
        retained_users = retained_users_result.scalar() or 0
        
        retention_rate = 0
        if initial_users > 0:
            retention_rate = (retained_users / initial_users) * 100
        
        results.append(MetricCalculationResult(
            metric_name="30_day_retention_rate",
            value=retention_rate,
            metadata={
                "initial_users": initial_users,
                "retained_users": retained_users
            }
        ))
        
        return results
    
    async def _calculate_market_metrics(
        self,
        db: AsyncSession,
        start_date: date,
        end_date: date,
        granularity: DataGranularity
    ) -> List[MetricCalculationResult]:
        """Calculate market penetration and competitive metrics"""
        
        results = []
        
        # Market penetration by region
        region_query = select(
            FactBooking.country_code,
            func.count(FactBooking.id).label('bookings'),
            func.sum(FactBooking.total_amount).label('revenue')
        ).where(
            and_(
                FactBooking.booking_date >= start_date,
                FactBooking.booking_date <= end_date,
                FactBooking.booking_status == 'confirmed'
            )
        ).group_by(FactBooking.country_code).order_by(desc('revenue'))
        
        region_result = await db.execute(region_query)
        total_revenue = 0
        market_data = []
        
        for row in region_result:
            market_data.append({
                "country": row.country_code,
                "bookings": row.bookings,
                "revenue": float(row.revenue)
            })
            total_revenue += row.revenue
        
        # Calculate market share percentages
        for data in market_data:
            data["market_share"] = (data["revenue"] / total_revenue * 100) if total_revenue > 0 else 0
        
        results.append(MetricCalculationResult(
            metric_name="market_penetration_by_region",
            value=len(market_data),  # Number of markets
            metadata={"market_breakdown": market_data}
        ))
        
        # Seasonal trends (month-over-month growth)
        if granularity in [DataGranularity.MONTHLY, DataGranularity.DAILY]:
            seasonal_query = select(
                func.extract('month', FactBooking.booking_date).label('month'),
                func.sum(FactBooking.total_amount).label('revenue')
            ).where(
                and_(
                    FactBooking.booking_date >= start_date,
                    FactBooking.booking_date <= end_date,
                    FactBooking.booking_status == 'confirmed'
                )
            ).group_by(func.extract('month', FactBooking.booking_date))
            
            seasonal_result = await db.execute(seasonal_query)
            seasonal_data = []
            
            for row in seasonal_result:
                seasonal_data.append({
                    "month": int(row.month),
                    "revenue": float(row.revenue)
                })
            
            results.append(MetricCalculationResult(
                metric_name="seasonal_revenue_trends",
                value=len(seasonal_data),
                metadata={"monthly_breakdown": seasonal_data}
            ))
        
        return results
    
    async def calculate_user_analytics(
        self,
        db: AsyncSession,
        start_date: date,
        end_date: date,
        segment: Optional[str] = None
    ) -> Dict[str, Any]:
        """Calculate comprehensive user analytics"""
        
        base_query = select(FactUserActivity).where(
            and_(
                FactUserActivity.activity_date >= start_date,
                FactUserActivity.activity_date <= end_date
            )
        )
        
        if segment:
            base_query = base_query.where(FactUserActivity.user_segment == segment)
        
        # Active users
        active_users_query = select(func.count(FactUserActivity.user_id.distinct())).where(
            and_(
                FactUserActivity.activity_date >= start_date,
                FactUserActivity.activity_date <= end_date
            )
        )
        
        if segment:
            active_users_query = active_users_query.where(FactUserActivity.user_segment == segment)
        
        active_users_result = await db.execute(active_users_query)
        total_active_users = active_users_result.scalar() or 0
        
        # Session metrics
        session_query = select(
            func.count(FactUserActivity.session_id.distinct()).label('total_sessions'),
            func.avg(FactUserActivity.session_duration_minutes).label('avg_session_duration'),
            func.avg(FactUserActivity.page_views).label('avg_page_views')
        ).where(
            and_(
                FactUserActivity.activity_date >= start_date,
                FactUserActivity.activity_date <= end_date
            )
        )
        
        if segment:
            session_query = session_query.where(FactUserActivity.user_segment == segment)
        
        session_result = await db.execute(session_query)
        session_data = session_result.first()
        
        # Feature usage
        feature_query = select(
            FactUserActivity.activity_type,
            func.count(FactUserActivity.id).label('usage_count')
        ).where(
            and_(
                FactUserActivity.activity_date >= start_date,
                FactUserActivity.activity_date <= end_date
            )
        ).group_by(FactUserActivity.activity_type)
        
        if segment:
            feature_query = feature_query.where(FactUserActivity.user_segment == segment)
        
        feature_result = await db.execute(feature_query)
        feature_usage = {}
        
        for row in feature_result:
            feature_usage[row.activity_type] = row.usage_count
        
        # Device breakdown
        device_query = select(
            FactUserActivity.device_type,
            func.count(FactUserActivity.user_id.distinct()).label('users')
        ).where(
            and_(
                FactUserActivity.activity_date >= start_date,
                FactUserActivity.activity_date <= end_date
            )
        ).group_by(FactUserActivity.device_type)
        
        if segment:
            device_query = device_query.where(FactUserActivity.user_segment == segment)
        
        device_result = await db.execute(device_query)
        device_breakdown = {}
        
        for row in device_result:
            device_breakdown[row.device_type] = row.users
        
        return {
            "total_active_users": total_active_users,
            "total_sessions": session_data.total_sessions if session_data else 0,
            "average_session_duration": float(session_data.avg_session_duration) if session_data and session_data.avg_session_duration else 0,
            "average_page_views": float(session_data.avg_page_views) if session_data and session_data.avg_page_views else 0,
            "feature_usage": feature_usage,
            "device_breakdown": device_breakdown,
            "period": f"{start_date} to {end_date}",
            "segment": segment
        }
    
    async def calculate_property_analytics(
        self,
        db: AsyncSession,
        property_id: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> Dict[str, Any]:
        """Calculate property performance analytics"""
        
        if not start_date:
            start_date = date.today() - timedelta(days=30)
        if not end_date:
            end_date = date.today()
        
        base_query = select(FactProperty).where(
            and_(
                FactProperty.date >= start_date,
                FactProperty.date <= end_date
            )
        )
        
        if property_id:
            base_query = base_query.where(FactProperty.property_id == property_id)
        
        # Aggregate metrics
        agg_query = select(
            func.sum(FactProperty.views).label('total_views'),
            func.sum(FactProperty.inquiries).label('total_inquiries'),
            func.sum(FactProperty.bookings).label('total_bookings'),
            func.sum(FactProperty.revenue).label('total_revenue'),
            func.avg(FactProperty.occupancy_rate).label('avg_occupancy'),
            func.avg(FactProperty.conversion_rate).label('avg_conversion'),
            func.avg(FactProperty.rating).label('avg_rating')
        ).where(
            and_(
                FactProperty.date >= start_date,
                FactProperty.date <= end_date
            )
        )
        
        if property_id:
            agg_query = agg_query.where(FactProperty.property_id == property_id)
        
        agg_result = await db.execute(agg_query)
        agg_data = agg_result.first()
        
        # Top performing properties (if not filtering by specific property)
        top_properties = []
        if not property_id:
            top_query = select(
                FactProperty.property_id,
                func.sum(FactProperty.revenue).label('total_revenue'),
                func.avg(FactProperty.occupancy_rate).label('avg_occupancy')
            ).where(
                and_(
                    FactProperty.date >= start_date,
                    FactProperty.date <= end_date
                )
            ).group_by(FactProperty.property_id).order_by(desc('total_revenue')).limit(10)
            
            top_result = await db.execute(top_query)
            for row in top_result:
                top_properties.append({
                    "property_id": str(row.property_id),
                    "revenue": float(row.total_revenue),
                    "occupancy_rate": float(row.avg_occupancy) if row.avg_occupancy else 0
                })
        
        return {
            "total_views": agg_data.total_views if agg_data else 0,
            "total_inquiries": agg_data.total_inquiries if agg_data else 0,
            "total_bookings": agg_data.total_bookings if agg_data else 0,
            "total_revenue": float(agg_data.total_revenue) if agg_data and agg_data.total_revenue else 0,
            "average_occupancy_rate": float(agg_data.avg_occupancy) if agg_data and agg_data.avg_occupancy else 0,
            "average_conversion_rate": float(agg_data.avg_conversion) if agg_data and agg_data.avg_conversion else 0,
            "average_rating": float(agg_data.avg_rating) if agg_data and agg_data.avg_rating else 0,
            "top_properties": top_properties,
            "period": f"{start_date} to {end_date}",
            "property_id": property_id
        }
    
    async def get_trending_metrics(
        self,
        db: AsyncSession,
        metric_types: List[str],
        days: int = 30
    ) -> Dict[str, List[Dict[str, Any]]]:
        """Get trending metrics over time"""
        
        end_date = date.today()
        start_date = end_date - timedelta(days=days)
        
        trends = {}
        
        for metric_type in metric_types:
            if metric_type == "revenue":
                trend_query = select(
                    FactBooking.booking_date,
                    func.sum(FactBooking.total_amount).label('value')
                ).where(
                    and_(
                        FactBooking.booking_date >= start_date,
                        FactBooking.booking_date <= end_date,
                        FactBooking.booking_status == 'confirmed'
                    )
                ).group_by(FactBooking.booking_date).order_by(FactBooking.booking_date)
                
            elif metric_type == "users":
                trend_query = select(
                    FactUserActivity.activity_date,
                    func.count(FactUserActivity.user_id.distinct()).label('value')
                ).where(
                    and_(
                        FactUserActivity.activity_date >= start_date,
                        FactUserActivity.activity_date <= end_date
                    )
                ).group_by(FactUserActivity.activity_date).order_by(FactUserActivity.activity_date)
                
            elif metric_type == "bookings":
                trend_query = select(
                    FactBooking.booking_date,
                    func.count(FactBooking.id).label('value')
                ).where(
                    and_(
                        FactBooking.booking_date >= start_date,
                        FactBooking.booking_date <= end_date,
                        FactBooking.booking_status == 'confirmed'
                    )
                ).group_by(FactBooking.booking_date).order_by(FactBooking.booking_date)
            
            else:
                continue
            
            trend_result = await db.execute(trend_query)
            trend_data = []
            
            for row in trend_result:
                trend_data.append({
                    "date": row[0].isoformat(),
                    "value": float(row.value) if row.value else 0
                })
            
            trends[metric_type] = trend_data
        
        return trends