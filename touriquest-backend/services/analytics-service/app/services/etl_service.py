"""
ETL Service - Extract, Transform, Load operations for analytics data warehouse
"""

import asyncio
import logging
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Any, Tuple
from decimal import Decimal
import pandas as pd
import numpy as np
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, text, insert, update, delete
from sqlalchemy.dialects.postgresql import insert as pg_insert
import httpx

from app.core.config import settings
from app.models.analytics_models import AnalyticsSession
from app.models.warehouse_models import (
    FactBooking, FactUserActivity, FactProperty, 
    DimUser, DimProperty, AggregatedMetric
)


logger = logging.getLogger(__name__)


class ETLService:
    """ETL service for data warehouse operations"""
    
    def __init__(self):
        self.batch_size = settings.batch_size
        self.source_services = {
            "user_service": settings.user_service_url,
            "property_service": settings.property_service_url,
            "booking_service": settings.booking_service_url,
        }
    
    async def run_full_etl(
        self,
        db_analytics: AsyncSession,
        db_warehouse: AsyncSession,
        start_date: date,
        end_date: date
    ) -> Dict[str, Any]:
        """Run complete ETL process"""
        
        session_id = await self._create_etl_session(
            db_analytics, "full_etl", start_date, end_date
        )
        
        try:
            await self._update_session_status(db_analytics, session_id, "running")
            
            results = {}
            
            # Extract and load dimension tables
            results["dim_users"] = await self._etl_dim_users(db_warehouse)
            results["dim_properties"] = await self._etl_dim_properties(db_warehouse)
            
            # Extract and load fact tables
            results["fact_bookings"] = await self._etl_fact_bookings(
                db_warehouse, start_date, end_date
            )
            results["fact_user_activities"] = await self._etl_fact_user_activities(
                db_warehouse, start_date, end_date
            )
            results["fact_properties"] = await self._etl_fact_properties(
                db_warehouse, start_date, end_date
            )
            
            # Generate aggregated metrics
            results["aggregated_metrics"] = await self._generate_aggregated_metrics(
                db_warehouse, start_date, end_date
            )
            
            await self._update_session_status(
                db_analytics, session_id, "completed", results
            )
            
            logger.info(f"ETL completed successfully for {start_date} to {end_date}")
            return results
            
        except Exception as e:
            await self._update_session_status(
                db_analytics, session_id, "failed", error_message=str(e)
            )
            logger.error(f"ETL failed: {e}")
            raise
    
    async def _create_etl_session(
        self,
        db: AsyncSession,
        session_type: str,
        start_date: date,
        end_date: date
    ) -> str:
        """Create ETL session record"""
        
        session = AnalyticsSession(
            session_type=session_type,
            start_date=start_date,
            end_date=end_date,
            status="pending"
        )
        
        db.add(session)
        await db.commit()
        await db.refresh(session)
        
        return str(session.id)
    
    async def _update_session_status(
        self,
        db: AsyncSession,
        session_id: str,
        status: str,
        results: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None
    ):
        """Update ETL session status"""
        
        update_data = {
            "status": status,
            "updated_at": datetime.utcnow()
        }
        
        if status == "running":
            update_data["started_at"] = datetime.utcnow()
        elif status in ["completed", "failed"]:
            update_data["completed_at"] = datetime.utcnow()
            
        if results:
            update_data["results_summary"] = results
            
        if error_message:
            update_data["error_message"] = error_message
        
        query = update(AnalyticsSession).where(
            AnalyticsSession.id == session_id
        ).values(**update_data)
        
        await db.execute(query)
        await db.commit()
    
    async def _fetch_from_service(
        self,
        service_name: str,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Fetch data from external service"""
        
        if service_name not in self.source_services:
            raise ValueError(f"Unknown service: {service_name}")
        
        base_url = self.source_services[service_name]
        url = f"{base_url}{endpoint}"
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url, params=params or {})
            response.raise_for_status()
            return response.json()
    
    async def _etl_dim_users(self, db: AsyncSession) -> Dict[str, int]:
        """ETL for user dimension table"""
        
        logger.info("Starting DimUser ETL")
        
        # Fetch users from user service
        users_data = await self._fetch_from_service(
            "user_service", "/users/analytics"
        )
        
        processed_count = 0
        
        for batch_start in range(0, len(users_data), self.batch_size):
            batch = users_data[batch_start:batch_start + self.batch_size]
            
            # Prepare batch insert data
            dim_users_data = []
            for user in batch:
                dim_user = {
                    "user_id": user["id"],
                    "user_type": user.get("user_type", "guest"),
                    "user_segment": self._determine_user_segment(user),
                    "registration_date": datetime.fromisoformat(
                        user["created_at"].replace("Z", "+00:00")
                    ).date(),
                    "age_group": self._categorize_age(user.get("age")),
                    "country_code": user.get("country_code"),
                    "region": user.get("region"),
                    "preferred_language": user.get("preferred_language", "en"),
                    "booking_frequency": self._calculate_booking_frequency(user),
                    "average_booking_value": user.get("average_booking_value"),
                    "preferred_property_type": user.get("preferred_property_type"),
                    "total_bookings": user.get("total_bookings", 0),
                    "total_reviews": user.get("total_reviews", 0),
                    "last_activity_date": self._parse_date(user.get("last_activity_date")),
                    "is_active": user.get("is_active", True),
                    "is_verified": user.get("is_verified", False),
                    "source_updated_at": datetime.fromisoformat(
                        user["updated_at"].replace("Z", "+00:00")
                    )
                }
                dim_users_data.append(dim_user)
            
            # Upsert batch
            stmt = pg_insert(DimUser).values(dim_users_data)
            stmt = stmt.on_conflict_do_update(
                index_elements=[DimUser.user_id],
                set_={
                    "user_type": stmt.excluded.user_type,
                    "user_segment": stmt.excluded.user_segment,
                    "age_group": stmt.excluded.age_group,
                    "country_code": stmt.excluded.country_code,
                    "region": stmt.excluded.region,
                    "preferred_language": stmt.excluded.preferred_language,
                    "booking_frequency": stmt.excluded.booking_frequency,
                    "average_booking_value": stmt.excluded.average_booking_value,
                    "preferred_property_type": stmt.excluded.preferred_property_type,
                    "total_bookings": stmt.excluded.total_bookings,
                    "total_reviews": stmt.excluded.total_reviews,
                    "last_activity_date": stmt.excluded.last_activity_date,
                    "is_active": stmt.excluded.is_active,
                    "is_verified": stmt.excluded.is_verified,
                    "source_updated_at": stmt.excluded.source_updated_at,
                    "updated_at": func.now()
                }
            )
            
            await db.execute(stmt)
            processed_count += len(batch)
        
        await db.commit()
        logger.info(f"DimUser ETL completed: {processed_count} users processed")
        
        return {"processed": processed_count, "total": len(users_data)}
    
    async def _etl_dim_properties(self, db: AsyncSession) -> Dict[str, int]:
        """ETL for property dimension table"""
        
        logger.info("Starting DimProperty ETL")
        
        # Fetch properties from property service
        properties_data = await self._fetch_from_service(
            "property_service", "/properties/analytics"
        )
        
        processed_count = 0
        
        for batch_start in range(0, len(properties_data), self.batch_size):
            batch = properties_data[batch_start:batch_start + self.batch_size]
            
            # Prepare batch insert data
            dim_properties_data = []
            for prop in batch:
                dim_property = {
                    "property_id": prop["id"],
                    "property_type": prop.get("property_type", "apartment"),
                    "capacity": prop.get("capacity", 1),
                    "bedrooms": prop.get("bedrooms"),
                    "bathrooms": prop.get("bathrooms"),
                    "country_code": prop.get("country_code"),
                    "region": prop.get("region"),
                    "city": prop.get("city"),
                    "neighborhood": prop.get("neighborhood"),
                    "host_id": prop.get("host_id"),
                    "host_type": prop.get("host_type"),
                    "host_since_date": self._parse_date(prop.get("host_since_date")),
                    "listing_date": datetime.fromisoformat(
                        prop["created_at"].replace("Z", "+00:00")
                    ).date(),
                    "instant_book": prop.get("instant_book", False),
                    "minimum_nights": prop.get("minimum_nights"),
                    "maximum_nights": prop.get("maximum_nights"),
                    "amenity_count": len(prop.get("amenities", [])),
                    "has_wifi": "wifi" in (prop.get("amenities", [])),
                    "has_parking": "parking" in (prop.get("amenities", [])),
                    "has_kitchen": "kitchen" in (prop.get("amenities", [])),
                    "is_active": prop.get("is_active", True),
                    "source_updated_at": datetime.fromisoformat(
                        prop["updated_at"].replace("Z", "+00:00")
                    )
                }
                dim_properties_data.append(dim_property)
            
            # Upsert batch
            stmt = pg_insert(DimProperty).values(dim_properties_data)
            stmt = stmt.on_conflict_do_update(
                index_elements=[DimProperty.property_id],
                set_={
                    "property_type": stmt.excluded.property_type,
                    "capacity": stmt.excluded.capacity,
                    "bedrooms": stmt.excluded.bedrooms,
                    "bathrooms": stmt.excluded.bathrooms,
                    "country_code": stmt.excluded.country_code,
                    "region": stmt.excluded.region,
                    "city": stmt.excluded.city,
                    "neighborhood": stmt.excluded.neighborhood,
                    "host_type": stmt.excluded.host_type,
                    "instant_book": stmt.excluded.instant_book,
                    "minimum_nights": stmt.excluded.minimum_nights,
                    "maximum_nights": stmt.excluded.maximum_nights,
                    "amenity_count": stmt.excluded.amenity_count,
                    "has_wifi": stmt.excluded.has_wifi,
                    "has_parking": stmt.excluded.has_parking,
                    "has_kitchen": stmt.excluded.has_kitchen,
                    "is_active": stmt.excluded.is_active,
                    "source_updated_at": stmt.excluded.source_updated_at,
                    "updated_at": func.now()
                }
            )
            
            await db.execute(stmt)
            processed_count += len(batch)
        
        await db.commit()
        logger.info(f"DimProperty ETL completed: {processed_count} properties processed")
        
        return {"processed": processed_count, "total": len(properties_data)}
    
    async def _etl_fact_bookings(
        self, 
        db: AsyncSession, 
        start_date: date, 
        end_date: date
    ) -> Dict[str, int]:
        """ETL for booking fact table"""
        
        logger.info(f"Starting FactBooking ETL for {start_date} to {end_date}")
        
        # Fetch bookings from booking service
        bookings_data = await self._fetch_from_service(
            "booking_service", 
            "/bookings/analytics",
            {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            }
        )
        
        processed_count = 0
        
        for batch_start in range(0, len(bookings_data), self.batch_size):
            batch = bookings_data[batch_start:batch_start + self.batch_size]
            
            # Prepare batch insert data
            fact_bookings_data = []
            for booking in batch:
                checkin_date = datetime.fromisoformat(
                    booking["checkin_date"].replace("Z", "+00:00")
                ).date()
                checkout_date = datetime.fromisoformat(
                    booking["checkout_date"].replace("Z", "+00:00")
                ).date()
                booking_date = datetime.fromisoformat(
                    booking["created_at"].replace("Z", "+00:00")
                ).date()
                
                nights = (checkout_date - checkin_date).days
                lead_time = (checkin_date - booking_date).days
                
                fact_booking = {
                    "booking_id": booking["id"],
                    "user_id": booking["user_id"],
                    "property_id": booking["property_id"],
                    "host_id": booking["host_id"],
                    "booking_date": booking_date,
                    "checkin_date": checkin_date,
                    "checkout_date": checkout_date,
                    "total_amount": Decimal(str(booking["total_amount"])),
                    "commission_amount": Decimal(str(booking.get("commission_amount", 0))),
                    "tax_amount": Decimal(str(booking.get("tax_amount", 0))),
                    "nights": nights,
                    "guests": booking.get("guests", 1),
                    "booking_status": booking.get("status", "pending"),
                    "payment_status": booking.get("payment_status", "pending"),
                    "cancellation_reason": booking.get("cancellation_reason"),
                    "country_code": booking.get("country_code"),
                    "region": booking.get("region"),
                    "city": booking.get("city"),
                    "property_type": booking.get("property_type"),
                    "property_capacity": booking.get("property_capacity", 1),
                    "user_type": booking.get("user_type", "guest"),
                    "user_segment": booking.get("user_segment"),
                    "revenue_per_night": Decimal(str(booking["total_amount"])) / nights if nights > 0 else 0,
                    "lead_time_days": lead_time,
                    "length_of_stay": nights,
                    "source_updated_at": datetime.fromisoformat(
                        booking["updated_at"].replace("Z", "+00:00")
                    )
                }
                fact_bookings_data.append(fact_booking)
            
            # Upsert batch
            stmt = pg_insert(FactBooking).values(fact_bookings_data)
            stmt = stmt.on_conflict_do_update(
                index_elements=[FactBooking.booking_id],
                set_={
                    "booking_status": stmt.excluded.booking_status,
                    "payment_status": stmt.excluded.payment_status,
                    "cancellation_reason": stmt.excluded.cancellation_reason,
                    "source_updated_at": stmt.excluded.source_updated_at,
                    "updated_at": func.now()
                }
            )
            
            await db.execute(stmt)
            processed_count += len(batch)
        
        await db.commit()
        logger.info(f"FactBooking ETL completed: {processed_count} bookings processed")
        
        return {"processed": processed_count, "total": len(bookings_data)}
    
    async def _etl_fact_user_activities(
        self, 
        db: AsyncSession, 
        start_date: date, 
        end_date: date
    ) -> Dict[str, int]:
        """ETL for user activity fact table"""
        
        logger.info(f"Starting FactUserActivity ETL for {start_date} to {end_date}")
        
        # Fetch user activities from user service
        activities_data = await self._fetch_from_service(
            "user_service", 
            "/analytics/activities",
            {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            }
        )
        
        processed_count = 0
        
        for batch_start in range(0, len(activities_data), self.batch_size):
            batch = activities_data[batch_start:batch_start + self.batch_size]
            
            # Prepare batch insert data
            fact_activities_data = []
            for activity in batch:
                activity_timestamp = datetime.fromisoformat(
                    activity["timestamp"].replace("Z", "+00:00")
                )
                
                fact_activity = {
                    "user_id": activity["user_id"],
                    "session_id": activity["session_id"],
                    "activity_date": activity_timestamp.date(),
                    "activity_timestamp": activity_timestamp,
                    "hour_of_day": activity_timestamp.hour,
                    "day_of_week": activity_timestamp.weekday(),
                    "activity_type": activity["activity_type"],
                    "page_path": activity.get("page_path"),
                    "referrer": activity.get("referrer"),
                    "session_duration_minutes": activity.get("session_duration_minutes"),
                    "page_views": activity.get("page_views", 1),
                    "events_count": activity.get("events_count", 0),
                    "device_type": activity.get("device_type", "unknown"),
                    "platform": activity.get("platform", "web"),
                    "country_code": activity.get("country_code"),
                    "region": activity.get("region"),
                    "user_type": activity.get("user_type", "guest"),
                    "user_segment": activity.get("user_segment"),
                    "is_first_visit": activity.get("is_first_visit", False),
                    "conversion_event": activity.get("conversion_event"),
                    "conversion_value": Decimal(str(activity["conversion_value"])) if activity.get("conversion_value") else None
                }
                fact_activities_data.append(fact_activity)
            
            # Insert batch (activities are typically append-only)
            stmt = insert(FactUserActivity).values(fact_activities_data)
            await db.execute(stmt)
            processed_count += len(batch)
        
        await db.commit()
        logger.info(f"FactUserActivity ETL completed: {processed_count} activities processed")
        
        return {"processed": processed_count, "total": len(activities_data)}
    
    async def _etl_fact_properties(
        self, 
        db: AsyncSession, 
        start_date: date, 
        end_date: date
    ) -> Dict[str, int]:
        """ETL for property performance fact table"""
        
        logger.info(f"Starting FactProperty ETL for {start_date} to {end_date}")
        
        # Fetch property performance data
        properties_data = await self._fetch_from_service(
            "property_service", 
            "/analytics/performance",
            {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            }
        )
        
        processed_count = 0
        
        for batch_start in range(0, len(properties_data), self.batch_size):
            batch = properties_data[batch_start:batch_start + self.batch_size]
            
            # Prepare batch insert data
            fact_properties_data = []
            for prop_data in batch:
                fact_property = {
                    "property_id": prop_data["property_id"],
                    "date": datetime.fromisoformat(prop_data["date"]).date(),
                    "host_id": prop_data["host_id"],
                    "property_type": prop_data["property_type"],
                    "capacity": prop_data["capacity"],
                    "country_code": prop_data["country_code"],
                    "region": prop_data["region"],
                    "city": prop_data["city"],
                    "views": prop_data.get("views", 0),
                    "inquiries": prop_data.get("inquiries", 0),
                    "bookings": prop_data.get("bookings", 0),
                    "revenue": Decimal(str(prop_data.get("revenue", 0))),
                    "available_nights": prop_data.get("available_nights", 0),
                    "booked_nights": prop_data.get("booked_nights", 0),
                    "blocked_nights": prop_data.get("blocked_nights", 0),
                    "base_price": Decimal(str(prop_data["base_price"])) if prop_data.get("base_price") else None,
                    "average_daily_rate": Decimal(str(prop_data["average_daily_rate"])) if prop_data.get("average_daily_rate") else None,
                    "occupancy_rate": prop_data.get("occupancy_rate"),
                    "revenue_per_available_night": Decimal(str(prop_data["revenue_per_available_night"])) if prop_data.get("revenue_per_available_night") else None,
                    "conversion_rate": prop_data.get("conversion_rate"),
                    "rating": prop_data.get("rating"),
                    "review_count": prop_data.get("review_count", 0),
                    "response_rate": prop_data.get("response_rate"),
                    "search_ranking": prop_data.get("search_ranking"),
                    "listing_quality_score": prop_data.get("listing_quality_score")
                }
                fact_properties_data.append(fact_property)
            
            # Upsert batch
            stmt = pg_insert(FactProperty).values(fact_properties_data)
            stmt = stmt.on_conflict_do_update(
                index_elements=[FactProperty.property_id, FactProperty.date],
                set_={col.name: getattr(stmt.excluded, col.name) 
                      for col in FactProperty.__table__.columns 
                      if col.name not in ["id", "property_id", "date", "created_at"]}
            )
            
            await db.execute(stmt)
            processed_count += len(batch)
        
        await db.commit()
        logger.info(f"FactProperty ETL completed: {processed_count} property records processed")
        
        return {"processed": processed_count, "total": len(properties_data)}
    
    async def _generate_aggregated_metrics(
        self, 
        db: AsyncSession, 
        start_date: date, 
        end_date: date
    ) -> Dict[str, int]:
        """Generate pre-aggregated metrics for fast dashboard queries"""
        
        logger.info(f"Generating aggregated metrics for {start_date} to {end_date}")
        
        metrics_generated = 0
        
        # Daily revenue metrics
        daily_revenue_query = select(
            FactBooking.booking_date,
            FactBooking.country_code,
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
        ).group_by(
            FactBooking.booking_date,
            FactBooking.country_code,
            FactBooking.property_type
        )
        
        revenue_results = await db.execute(daily_revenue_query)
        
        aggregated_data = []
        for row in revenue_results:
            # Revenue metric
            aggregated_data.append({
                "metric_name": "daily_revenue",
                "aggregation_level": "daily",
                "date": row.booking_date,
                "year": row.booking_date.year,
                "month": row.booking_date.month,
                "dimension_1": row.country_code,
                "dimension_2": row.property_type,
                "value": row.revenue,
                "count": row.bookings,
                "sum": row.revenue,
                "average": row.avg_booking_value
            })
            
            # Booking count metric
            aggregated_data.append({
                "metric_name": "daily_bookings",
                "aggregation_level": "daily",
                "date": row.booking_date,
                "year": row.booking_date.year,
                "month": row.booking_date.month,
                "dimension_1": row.country_code,
                "dimension_2": row.property_type,
                "value": row.bookings,
                "count": row.bookings,
                "sum": row.bookings,
                "average": row.avg_booking_value
            })
        
        # Insert aggregated metrics
        if aggregated_data:
            # Clear existing metrics for the date range
            delete_query = delete(AggregatedMetric).where(
                and_(
                    AggregatedMetric.date >= start_date,
                    AggregatedMetric.date <= end_date,
                    AggregatedMetric.metric_name.in_(["daily_revenue", "daily_bookings"])
                )
            )
            await db.execute(delete_query)
            
            # Insert new metrics
            stmt = insert(AggregatedMetric).values(aggregated_data)
            await db.execute(stmt)
            metrics_generated = len(aggregated_data)
        
        await db.commit()
        logger.info(f"Generated {metrics_generated} aggregated metrics")
        
        return {"generated": metrics_generated}
    
    # Helper methods
    def _determine_user_segment(self, user: Dict[str, Any]) -> str:
        """Determine user segment based on behavior"""
        total_bookings = user.get("total_bookings", 0)
        avg_value = user.get("average_booking_value", 0)
        
        if total_bookings >= 10 and avg_value >= 500:
            return "high_value"
        elif total_bookings >= 5:
            return "frequent"
        elif avg_value >= 300:
            return "premium"
        elif total_bookings >= 1:
            return "active"
        else:
            return "new"
    
    def _categorize_age(self, age: Optional[int]) -> Optional[str]:
        """Categorize age into groups"""
        if not age:
            return None
        
        if age < 25:
            return "18-24"
        elif age < 35:
            return "25-34"
        elif age < 45:
            return "35-44"
        elif age < 55:
            return "45-54"
        elif age < 65:
            return "55-64"
        else:
            return "65+"
    
    def _calculate_booking_frequency(self, user: Dict[str, Any]) -> str:
        """Calculate booking frequency category"""
        total_bookings = user.get("total_bookings", 0)
        
        # This would typically be based on bookings per time period
        if total_bookings >= 12:  # More than 1 per month
            return "high"
        elif total_bookings >= 4:  # More than 1 per quarter
            return "medium"
        elif total_bookings >= 1:
            return "low"
        else:
            return "none"
    
    def _parse_date(self, date_str: Optional[str]) -> Optional[date]:
        """Parse date string to date object"""
        if not date_str:
            return None
        
        try:
            return datetime.fromisoformat(date_str.replace("Z", "+00:00")).date()
        except (ValueError, AttributeError):
            return None