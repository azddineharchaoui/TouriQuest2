"""
Experience Analytics API Endpoints

Provides metrics on experience adoption, satisfaction, and repeat booking rates.
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

router = APIRouter(prefix="/analytics", tags=["experience-analytics"])


@router.get("/experiences")
async def get_experience_analytics(
    days: int = Query(30, description="Number of days to analyze", ge=1, le=365),
    experience_id: Optional[str] = Query(None, description="Filter by specific experience ID"),
    category: Optional[str] = Query(None, description="Filter by experience category"),
    provider_id: Optional[str] = Query(None, description="Filter by experience provider"),
    min_rating: Optional[float] = Query(None, description="Minimum rating filter", ge=1.0, le=5.0),
    warehouse_db: AsyncSession = Depends(get_warehouse_db)
) -> Dict[str, Any]:
    """
    Get comprehensive experience analytics including adoption, satisfaction, and repeat booking metrics
    
    Returns JSON with:
    - experiences: Array of experience metrics
    - summary: Aggregated statistics
    - adoption_trends: Adoption over time
    - satisfaction_metrics: Customer satisfaction data
    """
    try:
        end_date = date.today()
        start_date = end_date - timedelta(days=days)
        
        # Parameters for queries
        params = {
            'start_date': start_date,
            'end_date': end_date,
            'recent_date': end_date - timedelta(days=7),
            'previous_period_start': start_date - timedelta(days=days),
            'previous_period_end': start_date - timedelta(days=1)
        }
        
        if experience_id:
            params['experience_id'] = experience_id
        if category:
            params['category'] = category
        if provider_id:
            params['provider_id'] = provider_id
        if min_rating:
            params['min_rating'] = min_rating
        
        # Main experience analytics query
        experience_query = text("""
            WITH experience_bookings AS (
                SELECT 
                    e.experience_id,
                    e.name,
                    e.category,
                    e.provider_id,
                    e.base_price,
                    e.duration_hours,
                    e.max_participants,
                    COUNT(DISTINCT b.booking_id) as total_bookings,
                    COUNT(DISTINCT b.user_id) as unique_customers,
                    COUNT(DISTINCT CASE WHEN b.booking_date >= :recent_date THEN b.booking_id END) as recent_bookings,
                    SUM(b.total_amount) as total_revenue,
                    AVG(b.total_amount) as avg_booking_value,
                    COUNT(DISTINCT CASE WHEN b.booking_status = 'confirmed' THEN b.booking_id END) as confirmed_bookings,
                    COUNT(DISTINCT CASE WHEN b.booking_status = 'cancelled' THEN b.booking_id END) as cancelled_bookings,
                    AVG(CASE WHEN b.booking_status = 'confirmed' THEN b.total_amount END) as avg_confirmed_value
                FROM experiences e
                LEFT JOIN experience_bookings b ON e.experience_id = b.experience_id 
                    AND DATE(b.booking_date) BETWEEN :start_date AND :end_date
                WHERE e.is_active = TRUE
                """ + (f" AND e.experience_id = :experience_id" if experience_id else "") + """
                """ + (f" AND e.category = :category" if category else "") + """
                """ + (f" AND e.provider_id = :provider_id" if provider_id else "") + """
                GROUP BY e.experience_id, e.name, e.category, e.provider_id, 
                         e.base_price, e.duration_hours, e.max_participants
            ),
            experience_ratings AS (
                SELECT 
                    r.experience_id,
                    AVG(r.rating) as average_rating,
                    COUNT(r.rating_id) as total_ratings,
                    COUNT(CASE WHEN r.rating >= 4 THEN 1 END) as positive_ratings,
                    AVG(r.service_rating) as avg_service_rating,
                    AVG(r.value_rating) as avg_value_rating,
                    COUNT(CASE WHEN r.review_text IS NOT NULL AND LENGTH(r.review_text) > 0 THEN 1 END) as reviews_count
                FROM experience_ratings r
                WHERE DATE(r.created_at) BETWEEN :start_date AND :end_date
                """ + (f" AND r.experience_id = :experience_id" if experience_id else "") + """
                GROUP BY r.experience_id
            ),
            repeat_customers AS (
                SELECT 
                    b1.experience_id,
                    COUNT(DISTINCT b2.user_id) as repeat_customers,
                    AVG(customer_bookings.booking_count) as avg_bookings_per_customer
                FROM experience_bookings b1
                JOIN (
                    SELECT user_id, experience_id, COUNT(*) as booking_count
                    FROM experience_bookings 
                    WHERE DATE(booking_date) BETWEEN :start_date AND :end_date
                        AND booking_status = 'confirmed'
                    GROUP BY user_id, experience_id
                    HAVING COUNT(*) > 1
                ) customer_bookings ON b1.experience_id = customer_bookings.experience_id
                LEFT JOIN experience_bookings b2 ON customer_bookings.user_id = b2.user_id 
                    AND customer_bookings.experience_id = b2.experience_id
                WHERE DATE(b1.booking_date) BETWEEN :start_date AND :end_date
                GROUP BY b1.experience_id
            )
            SELECT 
                eb.*,
                COALESCE(er.average_rating, 0) as average_rating,
                COALESCE(er.total_ratings, 0) as total_ratings,
                COALESCE(er.positive_ratings, 0) as positive_ratings,
                COALESCE(er.avg_service_rating, 0) as avg_service_rating,
                COALESCE(er.avg_value_rating, 0) as avg_value_rating,
                COALESCE(er.reviews_count, 0) as reviews_count,
                COALESCE(rc.repeat_customers, 0) as repeat_customers,
                COALESCE(rc.avg_bookings_per_customer, 0) as avg_bookings_per_customer,
                CASE 
                    WHEN eb.total_bookings > 0 
                    THEN (eb.confirmed_bookings::FLOAT / eb.total_bookings::FLOAT) * 100 
                    ELSE 0 
                END as confirmation_rate,
                CASE 
                    WHEN eb.unique_customers > 0 
                    THEN (rc.repeat_customers::FLOAT / eb.unique_customers::FLOAT) * 100 
                    ELSE 0 
                END as repeat_rate,
                CASE 
                    WHEN er.total_ratings > 0 
                    THEN (er.positive_ratings::FLOAT / er.total_ratings::FLOAT) * 100 
                    ELSE 0 
                END as satisfaction_rate
            FROM experience_bookings eb
            LEFT JOIN experience_ratings er ON eb.experience_id = er.experience_id
            LEFT JOIN repeat_customers rc ON eb.experience_id = rc.experience_id
            """ + (f" WHERE er.average_rating >= :min_rating" if min_rating else "") + """
            ORDER BY eb.total_bookings DESC
        """)
        
        # Execute experience analytics query
        experience_result = await warehouse_db.execute(experience_query, params)
        experience_data = experience_result.fetchall()
        
        # Format experience metrics
        experiences = []
        for row in experience_data:
            experience = {
                "experience_id": str(row.experience_id),
                "name": row.name,
                "category": row.category,
                "provider_id": str(row.provider_id),
                "pricing": {
                    "base_price": float(row.base_price or 0),
                    "avg_booking_value": float(row.avg_booking_value or 0),
                    "avg_confirmed_value": float(row.avg_confirmed_value or 0)
                },
                "details": {
                    "duration_hours": float(row.duration_hours or 0),
                    "max_participants": int(row.max_participants or 0)
                },
                "adoption": {
                    "total_bookings": int(row.total_bookings or 0),
                    "unique_customers": int(row.unique_customers or 0),
                    "recent_bookings": int(row.recent_bookings or 0),
                    "confirmed_bookings": int(row.confirmed_bookings or 0),
                    "cancelled_bookings": int(row.cancelled_bookings or 0),
                    "confirmation_rate": float(row.confirmation_rate or 0)
                },
                "satisfaction": {
                    "average_rating": float(row.average_rating or 0),
                    "total_ratings": int(row.total_ratings or 0),
                    "positive_ratings": int(row.positive_ratings or 0),
                    "satisfaction_rate": float(row.satisfaction_rate or 0),
                    "service_rating": float(row.avg_service_rating or 0),
                    "value_rating": float(row.avg_value_rating or 0),
                    "reviews_count": int(row.reviews_count or 0)
                },
                "repeat_booking": {
                    "repeat_customers": int(row.repeat_customers or 0),
                    "repeat_rate": float(row.repeat_rate or 0),
                    "avg_bookings_per_customer": float(row.avg_bookings_per_customer or 0)
                },
                "revenue": {
                    "total_revenue": float(row.total_revenue or 0)
                }
            }
            experiences.append(experience)
        
        # Calculate summary statistics
        total_experiences = len(experiences)
        total_bookings = sum(exp['adoption']['total_bookings'] for exp in experiences)
        total_customers = sum(exp['adoption']['unique_customers'] for exp in experiences)
        total_revenue = sum(exp['revenue']['total_revenue'] for exp in experiences)
        avg_rating_all = (
            sum(exp['satisfaction']['average_rating'] for exp in experiences if exp['satisfaction']['average_rating'] > 0) /
            len([exp for exp in experiences if exp['satisfaction']['average_rating'] > 0])
        ) if experiences else 0
        avg_repeat_rate = (
            sum(exp['repeat_booking']['repeat_rate'] for exp in experiences if exp['repeat_booking']['repeat_rate'] > 0) /
            len([exp for exp in experiences if exp['repeat_booking']['repeat_rate'] > 0])
        ) if experiences else 0
        
        summary = {
            "total_experiences": total_experiences,
            "total_bookings": total_bookings,
            "total_customers": total_customers,
            "total_revenue": float(total_revenue),
            "average_rating_overall": round(avg_rating_all, 2),
            "average_repeat_rate": round(avg_repeat_rate, 2)
        }
        
        # Adoption trends over time
        adoption_trends_query = text("""
            SELECT 
                DATE(b.booking_date) as booking_date,
                COUNT(DISTINCT b.booking_id) as daily_bookings,
                COUNT(DISTINCT b.experience_id) as experiences_booked,
                COUNT(DISTINCT b.user_id) as unique_customers,
                SUM(b.total_amount) as daily_revenue,
                AVG(b.total_amount) as avg_booking_value
            FROM experience_bookings b
            WHERE DATE(b.booking_date) BETWEEN :start_date AND :end_date
                AND b.booking_status = 'confirmed'
            """ + (f" AND b.experience_id = :experience_id" if experience_id else "") + """
            GROUP BY DATE(b.booking_date)
            ORDER BY booking_date ASC
        """)
        
        trends_result = await warehouse_db.execute(adoption_trends_query, params)
        trends_data = trends_result.fetchall()
        
        adoption_trends = []
        for row in trends_data:
            adoption_trends.append({
                "date": row.booking_date.isoformat(),
                "bookings": int(row.daily_bookings or 0),
                "experiences_booked": int(row.experiences_booked or 0),
                "unique_customers": int(row.unique_customers or 0),
                "revenue": float(row.daily_revenue or 0),
                "avg_booking_value": float(row.avg_booking_value or 0)
            })
        
        # Category performance
        category_performance_query = text("""
            SELECT 
                e.category,
                COUNT(DISTINCT e.experience_id) as experiences_count,
                COUNT(DISTINCT b.booking_id) as total_bookings,
                SUM(b.total_amount) as category_revenue,
                AVG(r.rating) as avg_category_rating
            FROM experiences e
            LEFT JOIN experience_bookings b ON e.experience_id = b.experience_id 
                AND DATE(b.booking_date) BETWEEN :start_date AND :end_date
                AND b.booking_status = 'confirmed'
            LEFT JOIN experience_ratings r ON e.experience_id = r.experience_id 
                AND DATE(r.created_at) BETWEEN :start_date AND :end_date
            WHERE e.is_active = TRUE
            GROUP BY e.category
            ORDER BY total_bookings DESC
        """)
        
        category_result = await warehouse_db.execute(category_performance_query, params)
        category_data = category_result.fetchall()
        
        category_performance = []
        for row in category_data:
            category_performance.append({
                "category": row.category,
                "experiences_count": int(row.experiences_count or 0),
                "total_bookings": int(row.total_bookings or 0),
                "revenue": float(row.category_revenue or 0),
                "avg_rating": float(row.avg_category_rating or 0)
            })
        
        return {
            "success": True,
            "data": {
                "experiences": experiences,
                "summary": summary,
                "adoption_trends": adoption_trends,
                "category_performance": category_performance
            },
            "filters_applied": {
                "days": days,
                "experience_id": experience_id,
                "category": category,
                "provider_id": provider_id,
                "min_rating": min_rating
            },
            "date_range": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            },
            "generated_at": datetime.utcnow().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Error in experience analytics endpoint: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve experience analytics: {str(e)}"
        )