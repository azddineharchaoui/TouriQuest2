"""
Reporting Service - Custom reports, data export, and visualization
"""

import asyncio
import io
import json
import logging
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Any, Union
from decimal import Decimal
import pandas as pd
import numpy as np
import plotly.graph_objects as go
import plotly.express as px
from plotly.utils import PlotlyJSONEncoder
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, text, desc
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.chart import LineChart, BarChart, Reference

from app.core.config import settings
from app.models.analytics_models import CustomReport, ReportType
from app.models.warehouse_models import (
    FactBooking, FactUserActivity, FactProperty, AggregatedMetric
)


logger = logging.getLogger(__name__)


class ReportingService:
    """Service for generating reports and data visualizations"""
    
    def __init__(self):
        self.export_formats = ["json", "csv", "excel", "pdf"]
        self.chart_types = ["line", "bar", "pie", "area", "scatter", "heatmap"]
    
    async def generate_dashboard_data(
        self,
        db: AsyncSession,
        date_range: int = 30,
        filters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Generate comprehensive dashboard data"""
        
        end_date = date.today()
        start_date = end_date - timedelta(days=date_range)
        
        dashboard_data = {
            "summary_metrics": await self._get_summary_metrics(db, start_date, end_date, filters),
            "revenue_trend": await self._get_revenue_trend(db, start_date, end_date, filters),
            "user_metrics": await self._get_user_metrics(db, start_date, end_date, filters),
            "property_performance": await self._get_property_performance(db, start_date, end_date, filters),
            "geographic_distribution": await self._get_geographic_distribution(db, start_date, end_date, filters),
            "conversion_funnel": await self._get_conversion_funnel(db, start_date, end_date, filters),
            "top_properties": await self._get_top_properties(db, start_date, end_date, filters),
            "recent_bookings": await self._get_recent_bookings(db, filters),
            "performance_alerts": await self._get_performance_alerts(db, start_date, end_date),
            "date_range": {"start": start_date.isoformat(), "end": end_date.isoformat()}
        }
        
        return dashboard_data
    
    async def _get_summary_metrics(
        self,
        db: AsyncSession,
        start_date: date,
        end_date: date,
        filters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Get key summary metrics"""
        
        # Base queries with filters
        booking_query = select(
            func.count(FactBooking.id).label('total_bookings'),
            func.sum(FactBooking.total_amount).label('total_revenue'),
            func.avg(FactBooking.total_amount).label('avg_booking_value'),
            func.count(FactBooking.user_id.distinct()).label('unique_customers')
        ).where(
            and_(
                FactBooking.booking_date >= start_date,
                FactBooking.booking_date <= end_date,
                FactBooking.booking_status == 'confirmed'
            )
        )
        
        # Apply filters
        if filters:
            if filters.get("country_code"):
                booking_query = booking_query.where(FactBooking.country_code == filters["country_code"])
            if filters.get("property_type"):
                booking_query = booking_query.where(FactBooking.property_type == filters["property_type"])
        
        booking_result = await db.execute(booking_query)
        booking_data = booking_result.first()
        
        # User activity metrics
        activity_query = select(
            func.count(FactUserActivity.user_id.distinct()).label('active_users'),
            func.count(FactUserActivity.id).label('total_sessions'),
            func.avg(FactUserActivity.session_duration_minutes).label('avg_session_duration')
        ).where(
            and_(
                FactUserActivity.activity_date >= start_date,
                FactUserActivity.activity_date <= end_date
            )
        )
        
        activity_result = await db.execute(activity_query)
        activity_data = activity_result.first()
        
        # Property metrics
        property_query = select(
            func.count(FactProperty.property_id.distinct()).label('active_properties'),
            func.avg(FactProperty.occupancy_rate).label('avg_occupancy_rate'),
            func.avg(FactProperty.rating).label('avg_rating')
        ).where(
            and_(
                FactProperty.date >= start_date,
                FactProperty.date <= end_date
            )
        )
        
        property_result = await db.execute(property_query)
        property_data = property_result.first()
        
        # Calculate previous period for comparison
        period_days = (end_date - start_date).days
        prev_start = start_date - timedelta(days=period_days)
        prev_end = start_date - timedelta(days=1)
        
        prev_booking_query = select(
            func.count(FactBooking.id).label('total_bookings'),
            func.sum(FactBooking.total_amount).label('total_revenue')
        ).where(
            and_(
                FactBooking.booking_date >= prev_start,
                FactBooking.booking_date <= prev_end,
                FactBooking.booking_status == 'confirmed'
            )
        )
        
        prev_booking_result = await db.execute(prev_booking_query)
        prev_booking_data = prev_booking_result.first()
        
        # Calculate percentage changes
        def calculate_change(current: float, previous: float) -> Optional[float]:
            if previous and previous > 0:
                return ((current - previous) / previous) * 100
            return None
        
        return {
            "total_revenue": {
                "value": float(booking_data.total_revenue or 0),
                "change": calculate_change(
                    float(booking_data.total_revenue or 0),
                    float(prev_booking_data.total_revenue or 0)
                )
            },
            "total_bookings": {
                "value": booking_data.total_bookings or 0,
                "change": calculate_change(
                    booking_data.total_bookings or 0,
                    prev_booking_data.total_bookings or 0
                )
            },
            "average_booking_value": {
                "value": float(booking_data.avg_booking_value or 0),
                "change": None  # Would need more complex calculation
            },
            "unique_customers": {
                "value": booking_data.unique_customers or 0,
                "change": None
            },
            "active_users": {
                "value": activity_data.active_users or 0,
                "change": None
            },
            "average_session_duration": {
                "value": float(activity_data.avg_session_duration or 0),
                "change": None
            },
            "active_properties": {
                "value": property_data.active_properties or 0,
                "change": None
            },
            "average_occupancy_rate": {
                "value": float(property_data.avg_occupancy_rate or 0),
                "change": None
            },
            "average_rating": {
                "value": float(property_data.avg_rating or 0),
                "change": None
            }
        }
    
    async def _get_revenue_trend(
        self,
        db: AsyncSession,
        start_date: date,
        end_date: date,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Get revenue trend data"""
        
        query = select(
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
        
        if filters:
            if filters.get("country_code"):
                query = query.where(FactBooking.country_code == filters["country_code"])
            if filters.get("property_type"):
                query = query.where(FactBooking.property_type == filters["property_type"])
        
        result = await db.execute(query)
        
        trend_data = []
        for row in result:
            trend_data.append({
                "date": row.booking_date.isoformat(),
                "revenue": float(row.revenue),
                "bookings": row.bookings
            })
        
        return trend_data
    
    async def _get_user_metrics(
        self,
        db: AsyncSession,
        start_date: date,
        end_date: date,
        filters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Get user behavior and engagement metrics"""
        
        # Daily active users
        dau_query = select(
            FactUserActivity.activity_date,
            func.count(FactUserActivity.user_id.distinct()).label('active_users')
        ).where(
            and_(
                FactUserActivity.activity_date >= start_date,
                FactUserActivity.activity_date <= end_date
            )
        ).group_by(FactUserActivity.activity_date).order_by(FactUserActivity.activity_date)
        
        dau_result = await db.execute(dau_query)
        dau_data = [
            {"date": row.activity_date.isoformat(), "active_users": row.active_users}
            for row in dau_result
        ]
        
        # User segments
        segment_query = select(
            FactUserActivity.user_segment,
            func.count(FactUserActivity.user_id.distinct()).label('users')
        ).where(
            and_(
                FactUserActivity.activity_date >= start_date,
                FactUserActivity.activity_date <= end_date,
                FactUserActivity.user_segment.isnot(None)
            )
        ).group_by(FactUserActivity.user_segment)
        
        segment_result = await db.execute(segment_query)
        segment_data = [
            {"segment": row.user_segment, "users": row.users}
            for row in segment_result
        ]
        
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
        
        device_result = await db.execute(device_query)
        device_data = [
            {"device_type": row.device_type, "users": row.users}
            for row in device_result
        ]
        
        return {
            "daily_active_users": dau_data,
            "user_segments": segment_data,
            "device_breakdown": device_data
        }
    
    async def _get_property_performance(
        self,
        db: AsyncSession,
        start_date: date,
        end_date: date,
        filters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Get property performance metrics"""
        
        # Property type performance
        type_query = select(
            FactProperty.property_type,
            func.avg(FactProperty.occupancy_rate).label('avg_occupancy'),
            func.avg(FactProperty.revenue_per_available_night).label('avg_revpar'),
            func.avg(FactProperty.rating).label('avg_rating'),
            func.count(FactProperty.property_id.distinct()).label('property_count')
        ).where(
            and_(
                FactProperty.date >= start_date,
                FactProperty.date <= end_date
            )
        ).group_by(FactProperty.property_type)
        
        type_result = await db.execute(type_query)
        type_data = []
        
        for row in type_result:
            type_data.append({
                "property_type": row.property_type,
                "average_occupancy": float(row.avg_occupancy or 0),
                "average_revpar": float(row.avg_revpar or 0),
                "average_rating": float(row.avg_rating or 0),
                "property_count": row.property_count
            })
        
        # Regional performance
        region_query = select(
            FactProperty.country_code,
            FactProperty.region,
            func.avg(FactProperty.occupancy_rate).label('avg_occupancy'),
            func.sum(FactProperty.revenue).label('total_revenue'),
            func.count(FactProperty.property_id.distinct()).label('property_count')
        ).where(
            and_(
                FactProperty.date >= start_date,
                FactProperty.date <= end_date
            )
        ).group_by(
            FactProperty.country_code, FactProperty.region
        ).order_by(desc('total_revenue')).limit(10)
        
        region_result = await db.execute(region_query)
        region_data = []
        
        for row in region_result:
            region_data.append({
                "country_code": row.country_code,
                "region": row.region,
                "average_occupancy": float(row.avg_occupancy or 0),
                "total_revenue": float(row.total_revenue or 0),
                "property_count": row.property_count
            })
        
        return {
            "by_property_type": type_data,
            "by_region": region_data
        }
    
    async def _get_geographic_distribution(
        self,
        db: AsyncSession,
        start_date: date,
        end_date: date,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Get geographic distribution of bookings"""
        
        query = select(
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
        
        result = await db.execute(query)
        
        geo_data = []
        for row in result:
            geo_data.append({
                "country_code": row.country_code,
                "bookings": row.bookings,
                "revenue": float(row.revenue)
            })
        
        return geo_data
    
    async def _get_conversion_funnel(
        self,
        db: AsyncSession,
        start_date: date,
        end_date: date,
        filters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, int]:
        """Get conversion funnel metrics"""
        
        # Searches
        search_query = select(func.count(FactUserActivity.id)).where(
            and_(
                FactUserActivity.activity_date >= start_date,
                FactUserActivity.activity_date <= end_date,
                FactUserActivity.activity_type == 'search'
            )
        )
        
        search_result = await db.execute(search_query)
        searches = search_result.scalar() or 0
        
        # Property views
        view_query = select(func.count(FactUserActivity.id)).where(
            and_(
                FactUserActivity.activity_date >= start_date,
                FactUserActivity.activity_date <= end_date,
                FactUserActivity.activity_type == 'property_view'
            )
        )
        
        view_result = await db.execute(view_query)
        views = view_result.scalar() or 0
        
        # Inquiries (could be contact form submissions)
        inquiry_query = select(func.count(FactUserActivity.id)).where(
            and_(
                FactUserActivity.activity_date >= start_date,
                FactUserActivity.activity_date <= end_date,
                FactUserActivity.activity_type == 'inquiry'
            )
        )
        
        inquiry_result = await db.execute(inquiry_query)
        inquiries = inquiry_result.scalar() or 0
        
        # Bookings
        booking_query = select(func.count(FactBooking.id)).where(
            and_(
                FactBooking.booking_date >= start_date,
                FactBooking.booking_date <= end_date,
                FactBooking.booking_status == 'confirmed'
            )
        )
        
        booking_result = await db.execute(booking_query)
        bookings = booking_result.scalar() or 0
        
        return {
            "searches": searches,
            "property_views": views,
            "inquiries": inquiries,
            "bookings": bookings,
            "search_to_view_rate": (views / searches * 100) if searches > 0 else 0,
            "view_to_inquiry_rate": (inquiries / views * 100) if views > 0 else 0,
            "inquiry_to_booking_rate": (bookings / inquiries * 100) if inquiries > 0 else 0,
            "overall_conversion_rate": (bookings / searches * 100) if searches > 0 else 0
        }
    
    async def _get_top_properties(
        self,
        db: AsyncSession,
        start_date: date,
        end_date: date,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Get top performing properties"""
        
        query = select(
            FactProperty.property_id,
            func.sum(FactProperty.revenue).label('total_revenue'),
            func.avg(FactProperty.occupancy_rate).label('avg_occupancy'),
            func.avg(FactProperty.rating).label('avg_rating'),
            func.sum(FactProperty.bookings).label('total_bookings')
        ).where(
            and_(
                FactProperty.date >= start_date,
                FactProperty.date <= end_date
            )
        ).group_by(FactProperty.property_id).order_by(desc('total_revenue')).limit(limit)
        
        result = await db.execute(query)
        
        top_properties = []
        for row in result:
            top_properties.append({
                "property_id": str(row.property_id),
                "total_revenue": float(row.total_revenue or 0),
                "average_occupancy": float(row.avg_occupancy or 0),
                "average_rating": float(row.avg_rating or 0),
                "total_bookings": row.total_bookings or 0
            })
        
        return top_properties
    
    async def _get_recent_bookings(
        self,
        db: AsyncSession,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """Get recent bookings"""
        
        query = select(
            FactBooking.booking_id,
            FactBooking.property_id,
            FactBooking.user_id,
            FactBooking.booking_date,
            FactBooking.total_amount,
            FactBooking.booking_status,
            FactBooking.country_code,
            FactBooking.property_type
        ).order_by(desc(FactBooking.booking_date)).limit(limit)
        
        result = await db.execute(query)
        
        recent_bookings = []
        for row in result:
            recent_bookings.append({
                "booking_id": str(row.booking_id),
                "property_id": str(row.property_id),
                "user_id": str(row.user_id),
                "booking_date": row.booking_date.isoformat(),
                "total_amount": float(row.total_amount),
                "status": row.booking_status,
                "country_code": row.country_code,
                "property_type": row.property_type
            })
        
        return recent_bookings
    
    async def _get_performance_alerts(
        self,
        db: AsyncSession,
        start_date: date,
        end_date: date
    ) -> List[Dict[str, Any]]:
        """Generate performance alerts"""
        
        alerts = []
        
        # Low occupancy alert
        low_occupancy_query = select(
            FactProperty.property_id,
            func.avg(FactProperty.occupancy_rate).label('avg_occupancy')
        ).where(
            and_(
                FactProperty.date >= start_date,
                FactProperty.date <= end_date
            )
        ).group_by(FactProperty.property_id).having(
            func.avg(FactProperty.occupancy_rate) < 30
        )
        
        low_occupancy_result = await db.execute(low_occupancy_query)
        for row in low_occupancy_result:
            alerts.append({
                "type": "low_occupancy",
                "severity": "warning",
                "message": f"Property {row.property_id} has low occupancy rate: {row.avg_occupancy:.1f}%",
                "property_id": str(row.property_id),
                "value": float(row.avg_occupancy)
            })
        
        # Revenue drop alert (compare with previous period)
        period_days = (end_date - start_date).days
        prev_start = start_date - timedelta(days=period_days)
        prev_end = start_date - timedelta(days=1)
        
        current_revenue_query = select(func.sum(FactBooking.total_amount)).where(
            and_(
                FactBooking.booking_date >= start_date,
                FactBooking.booking_date <= end_date,
                FactBooking.booking_status == 'confirmed'
            )
        )
        
        prev_revenue_query = select(func.sum(FactBooking.total_amount)).where(
            and_(
                FactBooking.booking_date >= prev_start,
                FactBooking.booking_date <= prev_end,
                FactBooking.booking_status == 'confirmed'
            )
        )
        
        current_revenue_result = await db.execute(current_revenue_query)
        prev_revenue_result = await db.execute(prev_revenue_query)
        
        current_revenue = current_revenue_result.scalar() or 0
        prev_revenue = prev_revenue_result.scalar() or 0
        
        if prev_revenue > 0:
            revenue_change = ((current_revenue - prev_revenue) / prev_revenue) * 100
            if revenue_change < -20:
                alerts.append({
                    "type": "revenue_drop",
                    "severity": "critical",
                    "message": f"Revenue dropped by {abs(revenue_change):.1f}% compared to previous period",
                    "value": revenue_change
                })
        
        return alerts
    
    async def generate_custom_report(
        self,
        db: AsyncSession,
        report_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate custom report based on configuration"""
        
        metrics = report_config.get("metrics", [])
        filters = report_config.get("filters", {})
        date_range = report_config.get("date_range", {})
        groupby = report_config.get("groupby", [])
        
        start_date = datetime.fromisoformat(date_range["start"]).date()
        end_date = datetime.fromisoformat(date_range["end"]).date()
        
        # Build dynamic query based on configuration
        # This is a simplified version - a full implementation would be more complex
        if "revenue" in metrics:
            query = select(
                func.sum(FactBooking.total_amount).label('revenue'),
                func.count(FactBooking.id).label('bookings')
            ).where(
                and_(
                    FactBooking.booking_date >= start_date,
                    FactBooking.booking_date <= end_date,
                    FactBooking.booking_status == 'confirmed'
                )
            )
            
            # Apply filters
            if filters.get("country_code"):
                query = query.where(FactBooking.country_code == filters["country_code"])
            
            # Apply grouping
            if "country_code" in groupby:
                query = query.add_columns(FactBooking.country_code)
                query = query.group_by(FactBooking.country_code)
            
            result = await db.execute(query)
            
            data = []
            for row in result:
                row_data = {
                    "revenue": float(row.revenue or 0),
                    "bookings": row.bookings or 0
                }
                if "country_code" in groupby:
                    row_data["country_code"] = row.country_code
                data.append(row_data)
            
            return {
                "data": data,
                "total_records": len(data),
                "generated_at": datetime.utcnow().isoformat()
            }
        
        return {"data": [], "total_records": 0}
    
    async def export_data(
        self,
        data: List[Dict[str, Any]],
        format: str,
        filename: Optional[str] = None
    ) -> bytes:
        """Export data in specified format"""
        
        if format not in self.export_formats:
            raise ValueError(f"Unsupported export format: {format}")
        
        if format == "json":
            return json.dumps(data, cls=PlotlyJSONEncoder, indent=2).encode('utf-8')
        
        elif format == "csv":
            df = pd.DataFrame(data)
            return df.to_csv(index=False).encode('utf-8')
        
        elif format == "excel":
            df = pd.DataFrame(data)
            output = io.BytesIO()
            
            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                df.to_excel(writer, sheet_name='Data', index=False)
                
                # Add formatting
                workbook = writer.book
                worksheet = writer.sheets['Data']
                
                # Header formatting
                header_font = Font(bold=True, color="FFFFFF")
                header_fill = PatternFill(start_color="366092", end_color="366092", fill_type="solid")
                
                for cell in worksheet[1]:
                    cell.font = header_font
                    cell.fill = header_fill
                    cell.alignment = Alignment(horizontal="center")
                
                # Auto-adjust column widths
                for column in worksheet.columns:
                    max_length = 0
                    column_letter = column[0].column_letter
                    for cell in column:
                        try:
                            if len(str(cell.value)) > max_length:
                                max_length = len(str(cell.value))
                        except:
                            pass
                    adjusted_width = min(max_length + 2, 50)
                    worksheet.column_dimensions[column_letter].width = adjusted_width
            
            output.seek(0)
            return output.read()
        
        else:
            raise ValueError(f"Export format {format} not implemented yet")
    
    def create_chart(
        self,
        data: List[Dict[str, Any]],
        chart_type: str,
        x_field: str,
        y_field: str,
        title: str = "",
        **kwargs
    ) -> str:
        """Create chart visualization"""
        
        if chart_type not in self.chart_types:
            raise ValueError(f"Unsupported chart type: {chart_type}")
        
        df = pd.DataFrame(data)
        
        if chart_type == "line":
            fig = px.line(df, x=x_field, y=y_field, title=title, **kwargs)
        elif chart_type == "bar":
            fig = px.bar(df, x=x_field, y=y_field, title=title, **kwargs)
        elif chart_type == "pie":
            fig = px.pie(df, names=x_field, values=y_field, title=title, **kwargs)
        elif chart_type == "area":
            fig = px.area(df, x=x_field, y=y_field, title=title, **kwargs)
        elif chart_type == "scatter":
            fig = px.scatter(df, x=x_field, y=y_field, title=title, **kwargs)
        else:
            # Default to bar chart
            fig = px.bar(df, x=x_field, y=y_field, title=title, **kwargs)
        
        # Update layout for better appearance
        fig.update_layout(
            template="plotly_white",
            font=dict(family="Arial, sans-serif", size=12),
            title_font_size=16,
            showlegend=True if chart_type == "pie" else False
        )
        
        return json.dumps(fig, cls=PlotlyJSONEncoder)