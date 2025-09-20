"""Analytics service for search performance tracking and A/B testing"""

import asyncio
import uuid
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from enum import Enum
import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, and_, or_
from sqlalchemy.orm import joinedload

from app.core.database import get_session
from app.models.analytics_models import (
    SearchPerformanceMetric,
    ABTestExperiment,
    RankingFeature,
    PropertyPopularityScore,
    SearchFeedback,
    ConversionFunnel
)
from app.models.search_models import SearchSession, SearchQuery, SearchResult, SearchClick
from app.services.cache_service import CacheService

logger = structlog.get_logger()


class EventType(str, Enum):
    SEARCH = "search"
    CLICK = "click"
    BOOKING = "booking"
    VIEW = "view"
    SHARE = "share"
    SAVE = "save"
    CONTACT = "contact"


class AnalyticsService:
    """Comprehensive analytics service for search performance and optimization"""
    
    def __init__(self, cache_service: Optional[CacheService] = None):
        self.cache = cache_service
    
    # Search Performance Tracking
    async def track_search_performance(
        self,
        session: AsyncSession,
        search_session_id: str,
        query: str,
        results_count: int,
        response_time: float,
        filters_used: Dict[str, Any],
        user_id: Optional[str] = None
    ):
        """Track search performance metrics"""
        try:
            metric = SearchPerformanceMetric(
                id=str(uuid.uuid4()),
                search_session_id=search_session_id,
                query=query,
                results_count=results_count,
                response_time_ms=response_time * 1000,  # Convert to milliseconds
                filters_used=filters_used,
                user_id=user_id,
                timestamp=datetime.utcnow()
            )
            
            session.add(metric)
            await session.commit()
            
            logger.info(
                "Search performance tracked",
                session_id=search_session_id,
                response_time=response_time,
                results_count=results_count
            )
            
        except Exception as e:
            logger.error(f"Error tracking search performance: {str(e)}")
    
    async def get_search_performance_stats(
        self,
        session: AsyncSession,
        time_period: timedelta = timedelta(days=7)
    ) -> Dict[str, Any]:
        """Get search performance statistics"""
        try:
            start_time = datetime.utcnow() - time_period
            
            # Cache key for performance stats
            cache_key = f"performance_stats_{time_period.days}d"
            
            if self.cache:
                cached_stats = await self.cache.get_analytics_data(cache_key)
                if cached_stats:
                    return cached_stats
            
            # Query performance metrics
            query = select(
                func.count(SearchPerformanceMetric.id).label('total_searches'),
                func.avg(SearchPerformanceMetric.response_time_ms).label('avg_response_time'),
                func.percentile_cont(0.5).within_group(
                    SearchPerformanceMetric.response_time_ms
                ).label('median_response_time'),
                func.percentile_cont(0.95).within_group(
                    SearchPerformanceMetric.response_time_ms
                ).label('p95_response_time'),
                func.avg(SearchPerformanceMetric.results_count).label('avg_results_count')
            ).where(SearchPerformanceMetric.timestamp >= start_time)
            
            result = await session.execute(query)
            stats = result.first()
            
            # Get top queries
            top_queries_query = select(
                SearchPerformanceMetric.query,
                func.count().label('search_count')
            ).where(
                SearchPerformanceMetric.timestamp >= start_time
            ).group_by(
                SearchPerformanceMetric.query
            ).order_by(
                desc('search_count')
            ).limit(10)
            
            top_queries_result = await session.execute(top_queries_query)
            top_queries = [
                {"query": row.query, "count": row.search_count}
                for row in top_queries_result
            ]
            
            performance_stats = {
                "total_searches": stats.total_searches or 0,
                "avg_response_time_ms": float(stats.avg_response_time or 0),
                "median_response_time_ms": float(stats.median_response_time or 0),
                "p95_response_time_ms": float(stats.p95_response_time or 0),
                "avg_results_count": float(stats.avg_results_count or 0),
                "top_queries": top_queries,
                "period_start": start_time.isoformat(),
                "period_end": datetime.utcnow().isoformat()
            }
            
            # Cache the results
            if self.cache:
                await self.cache.set_analytics_data(
                    cache_key,
                    performance_stats,
                    ttl=1800  # 30 minutes
                )
            
            return performance_stats
            
        except Exception as e:
            logger.error(f"Error getting search performance stats: {str(e)}")
            return {}
    
    # A/B Testing Framework
    async def create_ab_test(
        self,
        session: AsyncSession,
        experiment_name: str,
        description: str,
        control_config: Dict[str, Any],
        treatment_config: Dict[str, Any],
        traffic_split: float = 0.5,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> str:
        """Create a new A/B test experiment"""
        try:
            experiment = ABTestExperiment(
                id=str(uuid.uuid4()),
                experiment_name=experiment_name,
                description=description,
                control_config=control_config,
                treatment_config=treatment_config,
                traffic_split=traffic_split,
                start_date=start_date or datetime.utcnow(),
                end_date=end_date,
                is_active=True,
                created_at=datetime.utcnow()
            )
            
            session.add(experiment)
            await session.commit()
            
            logger.info(f"A/B test experiment created: {experiment_name}")
            return experiment.id
            
        except Exception as e:
            logger.error(f"Error creating A/B test: {str(e)}")
            raise
    
    async def assign_user_to_experiment(
        self,
        session: AsyncSession,
        user_id: str,
        experiment_id: str
    ) -> str:
        """Assign user to experiment group (control or treatment)"""
        try:
            # Get experiment
            experiment = await session.get(ABTestExperiment, experiment_id)
            if not experiment or not experiment.is_active:
                return "control"  # Default to control if experiment not found
            
            # Check if experiment is within date range
            now = datetime.utcnow()
            if experiment.start_date > now or (experiment.end_date and experiment.end_date < now):
                return "control"
            
            # Deterministic assignment based on user_id hash
            user_hash = hash(f"{user_id}_{experiment_id}") % 100
            assignment = "treatment" if user_hash < (experiment.traffic_split * 100) else "control"
            
            # Track assignment
            await self.track_experiment_event(
                session,
                experiment_id,
                user_id,
                assignment,
                "assignment",
                {}
            )
            
            return assignment
            
        except Exception as e:
            logger.error(f"Error assigning user to experiment: {str(e)}")
            return "control"
    
    async def track_experiment_event(
        self,
        session: AsyncSession,
        experiment_id: str,
        user_id: str,
        group: str,
        event_type: str,
        event_data: Dict[str, Any]
    ):
        """Track experiment events for analysis"""
        try:
            # This would typically go to a separate events table
            # For now, we'll use the search feedback table as an example
            feedback = SearchFeedback(
                id=str(uuid.uuid4()),
                user_id=user_id,
                search_session_id=experiment_id,  # Reusing field for experiment tracking
                feedback_type=event_type,
                feedback_data={
                    "experiment_id": experiment_id,
                    "group": group,
                    "event_data": event_data
                },
                created_at=datetime.utcnow()
            )
            
            session.add(feedback)
            await session.commit()
            
        except Exception as e:
            logger.error(f"Error tracking experiment event: {str(e)}")
    
    async def get_experiment_results(
        self,
        session: AsyncSession,
        experiment_id: str
    ) -> Dict[str, Any]:
        """Get A/B test experiment results"""
        try:
            # Get experiment details
            experiment = await session.get(ABTestExperiment, experiment_id)
            if not experiment:
                return {"error": "Experiment not found"}
            
            # Get experiment events (using feedback table as proxy)
            events_query = select(SearchFeedback).where(
                SearchFeedback.search_session_id == experiment_id
            )
            
            events_result = await session.execute(events_query)
            events = events_result.scalars().all()
            
            # Process events by group
            control_events = []
            treatment_events = []
            
            for event in events:
                if event.feedback_data and "group" in event.feedback_data:
                    if event.feedback_data["group"] == "control":
                        control_events.append(event)
                    else:
                        treatment_events.append(event)
            
            results = {
                "experiment_id": experiment_id,
                "experiment_name": experiment.experiment_name,
                "description": experiment.description,
                "start_date": experiment.start_date.isoformat(),
                "end_date": experiment.end_date.isoformat() if experiment.end_date else None,
                "traffic_split": experiment.traffic_split,
                "control_group": {
                    "size": len(control_events),
                    "events": len([e for e in control_events if e.feedback_type != "assignment"])
                },
                "treatment_group": {
                    "size": len(treatment_events),
                    "events": len([e for e in treatment_events if e.feedback_type != "assignment"])
                }
            }
            
            return results
            
        except Exception as e:
            logger.error(f"Error getting experiment results: {str(e)}")
            return {"error": str(e)}
    
    # User Behavior Analytics
    async def track_user_event(
        self,
        session: AsyncSession,
        user_id: str,
        event_type: EventType,
        event_data: Dict[str, Any],
        session_id: Optional[str] = None
    ):
        """Track user behavior events"""
        try:
            # Create or update conversion funnel
            funnel = ConversionFunnel(
                id=str(uuid.uuid4()),
                user_id=user_id,
                session_id=session_id or str(uuid.uuid4()),
                event_type=event_type.value,
                event_data=event_data,
                timestamp=datetime.utcnow()
            )
            
            session.add(funnel)
            await session.commit()
            
            logger.debug(f"User event tracked: {event_type.value} for user {user_id}")
            
        except Exception as e:
            logger.error(f"Error tracking user event: {str(e)}")
    
    async def get_conversion_funnel(
        self,
        session: AsyncSession,
        time_period: timedelta = timedelta(days=30)
    ) -> Dict[str, Any]:
        """Get conversion funnel analysis"""
        try:
            start_time = datetime.utcnow() - time_period
            
            # Get event counts by type
            events_query = select(
                ConversionFunnel.event_type,
                func.count(func.distinct(ConversionFunnel.user_id)).label('unique_users'),
                func.count().label('total_events')
            ).where(
                ConversionFunnel.timestamp >= start_time
            ).group_by(
                ConversionFunnel.event_type
            )
            
            events_result = await session.execute(events_query)
            events = events_result.all()
            
            # Calculate conversion rates
            funnel_data = {}
            total_users = 0
            
            for event in events:
                funnel_data[event.event_type] = {
                    "unique_users": event.unique_users,
                    "total_events": event.total_events
                }
                if event.event_type == "search":
                    total_users = event.unique_users
            
            # Calculate conversion rates relative to search
            if total_users > 0:
                for event_type, data in funnel_data.items():
                    data["conversion_rate"] = (data["unique_users"] / total_users) * 100
            
            return {
                "period_start": start_time.isoformat(),
                "period_end": datetime.utcnow().isoformat(),
                "funnel": funnel_data,
                "total_users": total_users
            }
            
        except Exception as e:
            logger.error(f"Error getting conversion funnel: {str(e)}")
            return {}
    
    # Property Popularity Tracking
    async def update_property_popularity(
        self,
        session: AsyncSession,
        property_id: str,
        event_type: EventType,
        weight: float = 1.0
    ):
        """Update property popularity score"""
        try:
            # Get or create popularity score
            popularity_query = select(PropertyPopularityScore).where(
                PropertyPopularityScore.property_id == property_id
            )
            
            result = await session.execute(popularity_query)
            popularity = result.scalar_one_or_none()
            
            if not popularity:
                popularity = PropertyPopularityScore(
                    id=str(uuid.uuid4()),
                    property_id=property_id,
                    view_count=0,
                    click_count=0,
                    booking_count=0,
                    share_count=0,
                    save_count=0,
                    popularity_score=0.0,
                    last_updated=datetime.utcnow()
                )
                session.add(popularity)
            
            # Update counts based on event type
            if event_type == EventType.VIEW:
                popularity.view_count += 1
            elif event_type == EventType.CLICK:
                popularity.click_count += 1
            elif event_type == EventType.BOOKING:
                popularity.booking_count += 1
            elif event_type == EventType.SHARE:
                popularity.share_count += 1
            elif event_type == EventType.SAVE:
                popularity.save_count += 1
            
            # Calculate popularity score using weighted formula
            popularity.popularity_score = (
                popularity.view_count * 1.0 +
                popularity.click_count * 2.0 +
                popularity.booking_count * 10.0 +
                popularity.share_count * 3.0 +
                popularity.save_count * 5.0
            )
            
            popularity.last_updated = datetime.utcnow()
            
            await session.commit()
            
        except Exception as e:
            logger.error(f"Error updating property popularity: {str(e)}")
    
    async def get_trending_properties(
        self,
        session: AsyncSession,
        location: Optional[str] = None,
        time_period: timedelta = timedelta(days=7),
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Get trending properties based on recent activity"""
        try:
            cache_key = f"trending_{location or 'global'}_{time_period.days}d"
            
            if self.cache:
                cached_trending = await self.cache.get_trending_properties(location, f"{time_period.days}d")
                if cached_trending:
                    return cached_trending
            
            # Calculate trending score based on recent activity
            start_time = datetime.utcnow() - time_period
            
            # This is a simplified version - in practice, you'd join with property table
            # and consider location filters
            trending_query = select(
                PropertyPopularityScore.property_id,
                PropertyPopularityScore.popularity_score,
                PropertyPopularityScore.view_count,
                PropertyPopularityScore.click_count,
                PropertyPopularityScore.booking_count
            ).where(
                PropertyPopularityScore.last_updated >= start_time
            ).order_by(
                desc(PropertyPopularityScore.popularity_score)
            ).limit(limit)
            
            result = await session.execute(trending_query)
            trending_properties = [
                {
                    "property_id": row.property_id,
                    "popularity_score": row.popularity_score,
                    "view_count": row.view_count,
                    "click_count": row.click_count,
                    "booking_count": row.booking_count
                }
                for row in result
            ]
            
            # Cache the results
            if self.cache:
                await self.cache.set_trending_properties(
                    trending_properties,
                    location,
                    f"{time_period.days}d",
                    ttl=900  # 15 minutes
                )
            
            return trending_properties
            
        except Exception as e:
            logger.error(f"Error getting trending properties: {str(e)}")
            return []
    
    # Search Query Analytics
    async def analyze_search_patterns(
        self,
        session: AsyncSession,
        time_period: timedelta = timedelta(days=30)
    ) -> Dict[str, Any]:
        """Analyze search patterns and trends"""
        try:
            start_time = datetime.utcnow() - time_period
            
            # Most popular search terms
            popular_terms_query = select(
                SearchQuery.query,
                func.count().label('search_count')
            ).where(
                SearchQuery.created_at >= start_time
            ).group_by(
                SearchQuery.query
            ).order_by(
                desc('search_count')
            ).limit(20)
            
            popular_terms_result = await session.execute(popular_terms_query)
            popular_terms = [
                {"query": row.query, "count": row.search_count}
                for row in popular_terms_result
            ]
            
            # Search trends by day
            daily_trends_query = select(
                func.date(SearchQuery.created_at).label('date'),
                func.count().label('search_count')
            ).where(
                SearchQuery.created_at >= start_time
            ).group_by(
                func.date(SearchQuery.created_at)
            ).order_by(
                'date'
            )
            
            daily_trends_result = await session.execute(daily_trends_query)
            daily_trends = [
                {"date": row.date.isoformat(), "count": row.search_count}
                for row in daily_trends_result
            ]
            
            # Zero result queries
            zero_result_query = select(
                SearchQuery.query,
                func.count().label('occurrence_count')
            ).join(
                SearchResult, SearchQuery.id == SearchResult.search_query_id
            ).where(
                and_(
                    SearchQuery.created_at >= start_time,
                    SearchResult.total_results == 0
                )
            ).group_by(
                SearchQuery.query
            ).order_by(
                desc('occurrence_count')
            ).limit(10)
            
            zero_result_result = await session.execute(zero_result_query)
            zero_result_queries = [
                {"query": row.query, "count": row.occurrence_count}
                for row in zero_result_result
            ]
            
            return {
                "period_start": start_time.isoformat(),
                "period_end": datetime.utcnow().isoformat(),
                "popular_terms": popular_terms,
                "daily_trends": daily_trends,
                "zero_result_queries": zero_result_queries
            }
            
        except Exception as e:
            logger.error(f"Error analyzing search patterns: {str(e)}")
            return {}
    
    # Real-time Analytics
    async def get_realtime_metrics(self, session: AsyncSession) -> Dict[str, Any]:
        """Get real-time analytics metrics"""
        try:
            # Last hour metrics
            one_hour_ago = datetime.utcnow() - timedelta(hours=1)
            
            # Active searches in last hour
            active_searches_query = select(func.count(SearchSession.id)).where(
                SearchSession.created_at >= one_hour_ago
            )
            
            active_searches_result = await session.execute(active_searches_query)
            active_searches = active_searches_result.scalar() or 0
            
            # Average response time in last hour
            avg_response_query = select(
                func.avg(SearchPerformanceMetric.response_time_ms)
            ).where(
                SearchPerformanceMetric.timestamp >= one_hour_ago
            )
            
            avg_response_result = await session.execute(avg_response_query)
            avg_response_time = avg_response_result.scalar() or 0
            
            # Popular queries in last hour
            popular_queries_query = select(
                SearchQuery.query,
                func.count().label('count')
            ).where(
                SearchQuery.created_at >= one_hour_ago
            ).group_by(
                SearchQuery.query
            ).order_by(
                desc('count')
            ).limit(5)
            
            popular_queries_result = await session.execute(popular_queries_query)
            popular_queries = [
                {"query": row.query, "count": row.count}
                for row in popular_queries_result
            ]
            
            return {
                "timestamp": datetime.utcnow().isoformat(),
                "active_searches_last_hour": active_searches,
                "avg_response_time_ms": float(avg_response_time),
                "popular_queries_last_hour": popular_queries
            }
            
        except Exception as e:
            logger.error(f"Error getting realtime metrics: {str(e)}")
            return {}
    
    # Performance Optimization Insights
    async def get_optimization_insights(
        self,
        session: AsyncSession,
        time_period: timedelta = timedelta(days=7)
    ) -> Dict[str, Any]:
        """Get insights for search performance optimization"""
        try:
            start_time = datetime.utcnow() - time_period
            
            # Slow queries
            slow_queries_query = select(
                SearchPerformanceMetric.query,
                func.avg(SearchPerformanceMetric.response_time_ms).label('avg_time'),
                func.count().label('occurrence_count')
            ).where(
                and_(
                    SearchPerformanceMetric.timestamp >= start_time,
                    SearchPerformanceMetric.response_time_ms > 1000  # Slower than 1 second
                )
            ).group_by(
                SearchPerformanceMetric.query
            ).order_by(
                desc('avg_time')
            ).limit(10)
            
            slow_queries_result = await session.execute(slow_queries_query)
            slow_queries = [
                {
                    "query": row.query,
                    "avg_response_time_ms": float(row.avg_time),
                    "occurrence_count": row.occurrence_count
                }
                for row in slow_queries_result
            ]
            
            # Low result queries
            low_result_queries_query = select(
                SearchPerformanceMetric.query,
                func.avg(SearchPerformanceMetric.results_count).label('avg_results'),
                func.count().label('search_count')
            ).where(
                and_(
                    SearchPerformanceMetric.timestamp >= start_time,
                    SearchPerformanceMetric.results_count < 5  # Less than 5 results
                )
            ).group_by(
                SearchPerformanceMetric.query
            ).order_by(
                'avg_results'
            ).limit(10)
            
            low_result_queries_result = await session.execute(low_result_queries_query)
            low_result_queries = [
                {
                    "query": row.query,
                    "avg_results": float(row.avg_results),
                    "search_count": row.search_count
                }
                for row in low_result_queries_result
            ]
            
            return {
                "period_start": start_time.isoformat(),
                "period_end": datetime.utcnow().isoformat(),
                "slow_queries": slow_queries,
                "low_result_queries": low_result_queries,
                "recommendations": [
                    "Optimize Elasticsearch queries for slow search terms",
                    "Consider expanding content for low-result queries",
                    "Review indexing strategy for frequently searched terms",
                    "Implement query expansion for sparse results"
                ]
            }
            
        except Exception as e:
            logger.error(f"Error getting optimization insights: {str(e)}")
            return {}