"""
FastAPI endpoints for recommendation service.
"""
from fastapi import APIRouter, HTTPException, Depends, Query, Path
from fastapi.security import HTTPBearer
from typing import List, Optional, Dict, Any
from uuid import UUID
import logging

from app.models.schemas import (
    RecommendationRequest,
    PropertyRecommendationRequest,
    POIRecommendationRequest,
    ExperienceRecommendationRequest,
    ItineraryRequest,
    RecommendationResponse,
    RecommendationFeedback,
    FeedbackType,
    RecommendationType,
    UserContext,
    TrendingItem,
    RecommendationExplanation
)
from app.core.recommendation_engine import recommendation_engine
from app.utils.ab_testing import experiment_manager

logger = logging.getLogger(__name__)
router = APIRouter()
security = HTTPBearer()


@router.get("/recommendations/properties", response_model=RecommendationResponse)
async def get_property_recommendations(
    user_id: UUID,
    location: Optional[str] = Query(None, description="Destination location"),
    check_in: Optional[str] = Query(None, description="Check-in date (YYYY-MM-DD)"),
    check_out: Optional[str] = Query(None, description="Check-out date (YYYY-MM-DD)"),
    guests: int = Query(1, ge=1, le=20, description="Number of guests"),
    budget_min: Optional[float] = Query(None, ge=0, description="Minimum budget per night"),
    budget_max: Optional[float] = Query(None, ge=0, description="Maximum budget per night"),
    property_types: Optional[List[str]] = Query(None, description="Property types filter"),
    amenities: Optional[List[str]] = Query(None, description="Required amenities"),
    limit: int = Query(10, ge=1, le=100, description="Number of recommendations"),
    offset: int = Query(0, ge=0, description="Pagination offset")
):
    """Get personalized property recommendations."""
    try:
        # Build request
        filters = {}
        if location:
            filters['location'] = location
        if budget_min:
            filters['budget_min'] = budget_min
        if budget_max:
            filters['budget_max'] = budget_max
        if property_types:
            filters['property_types'] = property_types
        if amenities:
            filters['required_amenities'] = amenities
        
        context = {}
        if check_in and check_out:
            context['travel_dates'] = {'start_date': check_in, 'end_date': check_out}
        context['group_size'] = guests
        
        request = PropertyRecommendationRequest(
            user_id=user_id,
            location=location,
            check_in=check_in,
            check_out=check_out,
            guests=guests,
            budget_min=budget_min,
            budget_max=budget_max,
            property_types=property_types or [],
            required_amenities=amenities or [],
            limit=limit,
            offset=offset,
            filters=filters,
            context=context
        )
        
        # Get user context for personalization
        user_context = UserContext(
            user_id=user_id,
            current_location=None,  # Would be provided by frontend
            session_start=None,
            travel_dates=context.get('travel_dates'),
            group_size=guests
        )
        
        # Get recommendations
        response = await recommendation_engine.get_recommendations(request, user_context)
        
        # Apply A/B testing modifications if there are active experiments
        if response.recommendations:
            # Check for active experiments
            user_experiments = await experiment_manager.ab_framework.get_user_experiments(str(user_id))
            
            for experiment in user_experiments:
                if 'property' in experiment['experiment_name'].lower():
                    response.recommendations = await experiment_manager.modify_recommendations_for_experiment(
                        str(user_id),
                        response.recommendations,
                        experiment['experiment_id']
                    )
        
        return response
        
    except Exception as e:
        logger.error(f"Error getting property recommendations: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/recommendations/pois", response_model=RecommendationResponse)
async def get_poi_recommendations(
    user_id: UUID,
    location: Optional[str] = Query(None, description="Current location"),
    latitude: Optional[float] = Query(None, ge=-90, le=90, description="Current latitude"),
    longitude: Optional[float] = Query(None, ge=-180, le=180, description="Current longitude"),
    radius_km: int = Query(10, ge=1, le=100, description="Search radius in kilometers"),
    categories: Optional[List[str]] = Query(None, description="POI categories filter"),
    visit_date: Optional[str] = Query(None, description="Planned visit date (YYYY-MM-DD)"),
    duration_hours: Optional[int] = Query(None, ge=1, le=24, description="Available time in hours"),
    limit: int = Query(10, ge=1, le=100, description="Number of recommendations"),
    offset: int = Query(0, ge=0, description="Pagination offset")
):
    """Get personalized POI recommendations."""
    try:
        # Build coordinates if provided
        coordinates = None
        if latitude is not None and longitude is not None:
            coordinates = {'lat': latitude, 'lng': longitude}
        
        # Build filters
        filters = {}
        if categories:
            filters['categories'] = categories
        if duration_hours:
            filters['duration_hours'] = duration_hours
        
        context = {}
        if coordinates:
            context['current_location'] = coordinates
        if visit_date:
            context['visit_date'] = visit_date
        
        request = POIRecommendationRequest(
            user_id=user_id,
            location=location,
            coordinates=coordinates,
            radius_km=radius_km,
            categories=categories or [],
            visit_date=visit_date,
            duration_hours=duration_hours,
            limit=limit,
            offset=offset,
            filters=filters,
            context=context
        )
        
        # Get user context
        user_context = UserContext(
            user_id=user_id,
            current_location=coordinates,
            session_start=None
        )
        
        # Get recommendations
        response = await recommendation_engine.get_recommendations(request, user_context)
        
        return response
        
    except Exception as e:
        logger.error(f"Error getting POI recommendations: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/recommendations/experiences", response_model=RecommendationResponse)
async def get_experience_recommendations(
    user_id: UUID,
    location: Optional[str] = Query(None, description="Destination location"),
    date: Optional[str] = Query(None, description="Experience date (YYYY-MM-DD)"),
    group_size: int = Query(1, ge=1, le=50, description="Group size"),
    budget_max: Optional[float] = Query(None, ge=0, description="Maximum budget per person"),
    categories: Optional[List[str]] = Query(None, description="Experience categories"),
    difficulty_levels: Optional[List[str]] = Query(None, description="Difficulty levels"),
    limit: int = Query(10, ge=1, le=100, description="Number of recommendations"),
    offset: int = Query(0, ge=0, description="Pagination offset")
):
    """Get personalized experience recommendations."""
    try:
        # Build filters
        filters = {}
        if budget_max:
            filters['budget_max'] = budget_max
        if categories:
            filters['categories'] = categories
        if difficulty_levels:
            filters['difficulty_levels'] = difficulty_levels
        
        context = {'group_size': group_size}
        if date:
            context['experience_date'] = date
        
        request = ExperienceRecommendationRequest(
            user_id=user_id,
            location=location,
            date=date,
            group_size=group_size,
            budget_max=budget_max,
            categories=categories or [],
            difficulty_levels=difficulty_levels or [],
            limit=limit,
            offset=offset,
            filters=filters,
            context=context
        )
        
        # Get user context
        user_context = UserContext(
            user_id=user_id,
            current_location=None,
            session_start=None,
            group_size=group_size
        )
        
        # Get recommendations
        response = await recommendation_engine.get_recommendations(request, user_context)
        
        return response
        
    except Exception as e:
        logger.error(f"Error getting experience recommendations: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/recommendations/feedback")
async def submit_recommendation_feedback(
    feedback: RecommendationFeedback
):
    """Submit feedback for a recommendation."""
    try:
        # Track feedback for model improvement
        await recommendation_engine.update_user_feedback(
            str(feedback.user_id),
            str(feedback.recommendation_id),
            feedback.feedback_type,
            {'timestamp': feedback.timestamp, 'implicit': feedback.implicit_feedback}
        )
        
        # Track A/B testing metrics
        if feedback.feedback_type in [FeedbackType.CLICK, FeedbackType.BOOK]:
            # Track click-through or conversion for experiments
            user_experiments = await experiment_manager.ab_framework.get_user_experiments(str(feedback.user_id))
            
            for experiment in user_experiments:
                metric_type = "click_through_rate" if feedback.feedback_type == FeedbackType.CLICK else "conversion_rate"
                await experiment_manager.ab_framework.track_metric(
                    str(feedback.user_id),
                    experiment['experiment_id'],
                    metric_type,
                    1.0  # Binary success metric
                )
        
        return {"status": "success", "message": "Feedback recorded"}
        
    except Exception as e:
        logger.error(f"Error submitting feedback: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/recommendations/trending", response_model=List[TrendingItem])
async def get_trending_recommendations(
    recommendation_type: RecommendationType = Query(..., description="Type of trending items"),
    time_period: str = Query("24h", description="Time period (1h, 24h, 7d, 30d)"),
    location: Optional[str] = Query(None, description="Location filter"),
    limit: int = Query(20, ge=1, le=100, description="Number of trending items")
):
    """Get trending items for recommendations."""
    try:
        # Get trending items from fallback engine
        trending_items = await recommendation_engine.fallback_engine.get_popular_items(
            recommendation_type,
            limit
        )
        
        # Format as trending items
        trending_response = []
        for i, (item_id, score) in enumerate(trending_items):
            trending_item = TrendingItem(
                item_id=item_id,
                item_type=recommendation_type,
                trend_score=score,
                growth_rate=0.1 + (i * 0.02),  # Mock growth rates
                popularity_score=score,
                time_period=time_period,
                metadata={'rank': i + 1}
            )
            trending_response.append(trending_item)
        
        return trending_response
        
    except Exception as e:
        logger.error(f"Error getting trending recommendations: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/recommendations/similar")
async def find_similar_items(
    item_id: UUID,
    item_type: RecommendationType,
    user_id: Optional[UUID] = None,
    limit: int = Query(10, ge=1, le=50, description="Number of similar items")
):
    """Find items similar to a given item."""
    try:
        # Use content-based similarity (mock implementation)
        similar_items = []
        
        for i in range(limit):
            similar_item_id = f"{item_type}_similar_{i+1}"
            similarity_score = 0.9 - (i * 0.05)
            
            similar_items.append({
                'item_id': similar_item_id,
                'item_type': item_type,
                'similarity_score': similarity_score,
                'explanation': f"Similar to {item_id} based on content features"
            })
        
        return {
            'original_item_id': str(item_id),
            'similar_items': similar_items,
            'algorithm_used': 'content_based_similarity'
        }
        
    except Exception as e:
        logger.error(f"Error finding similar items: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/recommendations/explain/{recommendation_id}", response_model=RecommendationExplanation)
async def explain_recommendation(
    recommendation_id: UUID = Path(..., description="Recommendation ID to explain"),
    user_id: UUID = Query(..., description="User ID for context")
):
    """Get detailed explanation for a recommendation."""
    try:
        # Mock explanation generation
        explanation = RecommendationExplanation(
            recommendation_id=recommendation_id,
            primary_reason="Based on your travel preferences and similar users' choices",
            detailed_factors=[
                {
                    'factor': 'User Preferences',
                    'contribution': 0.4,
                    'description': 'Matches your preferred travel style and amenities'
                },
                {
                    'factor': 'Similar Users',
                    'contribution': 0.3,
                    'description': 'Users with similar travel history also liked this'
                },
                {
                    'factor': 'Item Popularity',
                    'contribution': 0.2,
                    'description': 'High ratings and positive reviews'
                },
                {
                    'factor': 'Location Relevance',
                    'contribution': 0.1,
                    'description': 'Close to your specified location'
                }
            ],
            confidence_breakdown={
                'collaborative_filtering': 0.35,
                'content_based': 0.30,
                'matrix_factorization': 0.25,
                'popularity': 0.10
            },
            similar_users=[
                {'user_id': 'user_123', 'similarity': 0.85},
                {'user_id': 'user_456', 'similarity': 0.78}
            ],
            similar_items=[
                {'item_id': 'item_789', 'similarity': 0.92},
                {'item_id': 'item_012', 'similarity': 0.87}
            ],
            personalization_strength=0.75
        )
        
        return explanation
        
    except Exception as e:
        logger.error(f"Error explaining recommendation: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/recommendations/itinerary")
async def create_itinerary_recommendation(
    request: ItineraryRequest
):
    """Create a personalized travel itinerary."""
    try:
        # Get itinerary recommendation
        response = await recommendation_engine.get_recommendations(request, None)
        
        # Format itinerary response
        if response.recommendations:
            itinerary = response.recommendations[0]  # Assuming single itinerary response
            
            return {
                'itinerary_id': itinerary['item_id'],
                'destination': request.destination,
                'duration_days': (request.end_date - request.start_date).days,
                'total_estimated_cost': itinerary.get('total_estimated_cost', 0),
                'travel_style': request.travel_style,
                'daily_plans': itinerary.get('items', []),
                'optimization_criteria': request.optimization_goals,
                'confidence_score': itinerary['confidence']
            }
        else:
            raise HTTPException(status_code=404, detail="Could not generate itinerary")
        
    except Exception as e:
        logger.error(f"Error creating itinerary: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/recommendations/user/{user_id}/history")
async def get_user_recommendation_history(
    user_id: UUID = Path(..., description="User ID"),
    recommendation_type: Optional[RecommendationType] = Query(None, description="Filter by type"),
    limit: int = Query(50, ge=1, le=200, description="Number of recommendations"),
    offset: int = Query(0, ge=0, description="Pagination offset")
):
    """Get user's recommendation history."""
    try:
        # Mock recommendation history
        history = []
        
        for i in range(limit):
            rec_type = recommendation_type or RecommendationType.PROPERTY
            history_item = {
                'recommendation_id': f"rec_{i+1}",
                'item_id': f"{rec_type}_item_{i+1}",
                'item_type': rec_type,
                'score': 0.9 - (i * 0.01),
                'timestamp': '2023-01-01T10:00:00Z',
                'feedback_given': i % 3 == 0,
                'was_clicked': i % 4 == 0,
                'was_booked': i % 10 == 0
            }
            history.append(history_item)
        
        return {
            'user_id': str(user_id),
            'total_recommendations': len(history),
            'history': history,
            'pagination': {
                'limit': limit,
                'offset': offset,
                'has_more': limit == len(history)
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting recommendation history: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/recommendations/stats")
async def get_recommendation_stats():
    """Get recommendation system statistics."""
    try:
        # Get model information
        model_info = recommendation_engine.model_manager.get_model_info()
        
        stats = {
            'models_loaded': len(model_info),
            'model_status': model_info,
            'cache_stats': {
                'hit_rate': 0.85,  # Mock cache statistics
                'total_requests': 10000,
                'cache_hits': 8500
            },
            'recommendation_stats': {
                'total_recommendations_served': 50000,
                'avg_response_time_ms': 120,
                'fallback_rate': 0.05
            },
            'algorithm_performance': {
                'collaborative_filtering': {'accuracy': 0.82, 'coverage': 0.78},
                'content_based': {'accuracy': 0.75, 'coverage': 0.92},
                'matrix_factorization': {'accuracy': 0.80, 'coverage': 0.85},
                'hybrid': {'accuracy': 0.85, 'coverage': 0.88}
            }
        }
        
        return stats
        
    except Exception as e:
        logger.error(f"Error getting recommendation stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")