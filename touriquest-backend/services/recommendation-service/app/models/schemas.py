"""
Recommendation service data models and schemas.
"""
from datetime import datetime, date
from typing import List, Optional, Dict, Any, Union
from uuid import UUID
from enum import Enum

from pydantic import BaseModel, Field, validator


class RecommendationType(str, Enum):
    """Types of recommendations."""
    PROPERTY = "property"
    POI = "poi"
    EXPERIENCE = "experience"
    ITINERARY = "itinerary"
    SOCIAL = "social"


class FeedbackType(str, Enum):
    """Types of user feedback."""
    LIKE = "like"
    DISLIKE = "dislike"
    CLICK = "click"
    BOOK = "book"
    SHARE = "share"
    SAVE = "save"
    IGNORE = "ignore"


class TravelStyle(str, Enum):
    """Travel style preferences."""
    ADVENTURE = "adventure"
    CULTURE = "culture"
    RELAXATION = "relaxation"
    BUSINESS = "business"
    FAMILY = "family"
    SOLO = "solo"
    LUXURY = "luxury"
    BUDGET = "budget"


class SeasonType(str, Enum):
    """Season types for recommendations."""
    SPRING = "spring"
    SUMMER = "summer"
    FALL = "fall"
    WINTER = "winter"


class BudgetRange(str, Enum):
    """Budget range categories."""
    BUDGET = "budget"
    MID_RANGE = "mid_range"
    LUXURY = "luxury"
    ULTRA_LUXURY = "ultra_luxury"


# User Profile and Preferences
class UserPreferences(BaseModel):
    """User travel preferences."""
    travel_styles: List[TravelStyle] = []
    budget_range: BudgetRange = BudgetRange.MID_RANGE
    preferred_amenities: List[str] = []
    interests: List[str] = []
    dietary_restrictions: List[str] = []
    accessibility_needs: List[str] = []
    language_preferences: List[str] = ["en"]
    max_travel_distance: Optional[int] = None  # in km
    preferred_seasons: List[SeasonType] = []


class TravelHistory(BaseModel):
    """User's travel history entry."""
    user_id: UUID
    destination: str
    country: str
    city: str
    coordinates: Optional[Dict[str, float]] = None
    visit_date: date
    duration_days: int
    travel_style: TravelStyle
    budget_spent: Optional[float] = None
    satisfaction_rating: Optional[int] = Field(None, ge=1, le=5)
    companions: Optional[int] = None


class SocialConnection(BaseModel):
    """Social connection between users."""
    follower_id: UUID
    following_id: UUID
    connection_strength: float = Field(0.5, ge=0.0, le=1.0)
    common_interests: List[str] = []
    interaction_count: int = 0
    created_at: datetime


# Recommendation Items
class BaseRecommendation(BaseModel):
    """Base recommendation model."""
    id: UUID
    user_id: UUID
    item_id: UUID
    item_type: RecommendationType
    score: float = Field(..., ge=0.0, le=1.0)
    confidence: float = Field(..., ge=0.0, le=1.0)
    explanation: str
    reasoning_factors: Dict[str, float] = {}
    metadata: Dict[str, Any] = {}
    created_at: datetime
    expires_at: Optional[datetime] = None


class PropertyRecommendation(BaseRecommendation):
    """Property recommendation with specific metadata."""
    item_type: RecommendationType = RecommendationType.PROPERTY
    property_type: str
    location: str
    price_per_night: float
    amenities: List[str] = []
    host_rating: Optional[float] = None
    distance_from_user: Optional[float] = None


class POIRecommendation(BaseRecommendation):
    """POI recommendation with specific metadata."""
    item_type: RecommendationType = RecommendationType.POI
    category: str
    location: str
    opening_hours: Optional[str] = None
    entry_fee: Optional[float] = None
    average_visit_duration: Optional[int] = None  # in minutes
    distance_from_user: Optional[float] = None


class ExperienceRecommendation(BaseRecommendation):
    """Experience recommendation with specific metadata."""
    item_type: RecommendationType = RecommendationType.EXPERIENCE
    category: str
    duration_hours: int
    price: float
    difficulty_level: Optional[str] = None
    group_size_min: int = 1
    group_size_max: int = 20
    location: str


class ItineraryRecommendation(BaseRecommendation):
    """Itinerary recommendation with multiple items."""
    item_type: RecommendationType = RecommendationType.ITINERARY
    duration_days: int
    total_estimated_cost: float
    items: List[Dict[str, Any]] = []  # Mix of properties, POIs, experiences
    travel_style: TravelStyle
    optimization_criteria: List[str] = []


# Recommendation Requests
class RecommendationRequest(BaseModel):
    """Base recommendation request."""
    user_id: UUID
    recommendation_type: RecommendationType
    limit: int = Field(10, ge=1, le=100)
    offset: int = Field(0, ge=0)
    filters: Dict[str, Any] = {}
    context: Dict[str, Any] = {}


class PropertyRecommendationRequest(RecommendationRequest):
    """Property recommendation request."""
    recommendation_type: RecommendationType = RecommendationType.PROPERTY
    location: Optional[str] = None
    check_in: Optional[date] = None
    check_out: Optional[date] = None
    guests: int = 1
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    property_types: List[str] = []
    required_amenities: List[str] = []


class POIRecommendationRequest(RecommendationRequest):
    """POI recommendation request."""
    recommendation_type: RecommendationType = RecommendationType.POI
    location: Optional[str] = None
    coordinates: Optional[Dict[str, float]] = None
    radius_km: int = Field(10, ge=1, le=100)
    categories: List[str] = []
    visit_date: Optional[date] = None
    duration_hours: Optional[int] = None


class ExperienceRecommendationRequest(RecommendationRequest):
    """Experience recommendation request."""
    recommendation_type: RecommendationType = RecommendationType.EXPERIENCE
    location: Optional[str] = None
    date: Optional[date] = None
    group_size: int = 1
    budget_max: Optional[float] = None
    categories: List[str] = []
    difficulty_levels: List[str] = []


class ItineraryRequest(RecommendationRequest):
    """Itinerary generation request."""
    recommendation_type: RecommendationType = RecommendationType.ITINERARY
    destination: str
    start_date: date
    end_date: date
    travelers: int = 1
    budget_total: Optional[float] = None
    travel_style: TravelStyle
    must_include: List[UUID] = []  # Must include these items
    optimization_goals: List[str] = ["cost", "time", "enjoyment"]


# Feedback and Analytics
class RecommendationFeedback(BaseModel):
    """User feedback on recommendations."""
    recommendation_id: UUID
    user_id: UUID
    feedback_type: FeedbackType
    implicit_feedback: bool = False  # True if inferred from behavior
    timestamp: datetime
    context: Dict[str, Any] = {}
    session_id: Optional[str] = None


class RecommendationClick(BaseModel):
    """Click tracking for recommendations."""
    recommendation_id: UUID
    user_id: UUID
    clicked_at: datetime
    click_position: int  # Position in the recommendation list
    session_id: Optional[str] = None
    device_info: Dict[str, Any] = {}


class RecommendationConversion(BaseModel):
    """Conversion tracking (booking, saving, etc.)."""
    recommendation_id: UUID
    user_id: UUID
    conversion_type: str  # "booking", "save", "share"
    conversion_value: Optional[float] = None
    converted_at: datetime
    metadata: Dict[str, Any] = {}


# A/B Testing
class ExperimentGroup(str, Enum):
    """A/B testing experiment groups."""
    CONTROL = "control"
    VARIANT_A = "variant_a"
    VARIANT_B = "variant_b"
    VARIANT_C = "variant_c"


class ABTestExperiment(BaseModel):
    """A/B testing experiment configuration."""
    experiment_id: str
    name: str
    description: str
    start_date: datetime
    end_date: Optional[datetime] = None
    is_active: bool = True
    traffic_allocation: Dict[ExperimentGroup, float] = {}
    success_metrics: List[str] = []
    metadata: Dict[str, Any] = {}


class UserExperimentAssignment(BaseModel):
    """User assignment to A/B test experiments."""
    user_id: UUID
    experiment_id: str
    group: ExperimentGroup
    assigned_at: datetime
    metadata: Dict[str, Any] = {}


# Model Training and Evaluation
class ModelPerformanceMetrics(BaseModel):
    """Model performance metrics."""
    model_id: str
    model_version: str
    evaluation_date: datetime
    precision_at_k: Dict[int, float] = {}  # k = 1, 5, 10, 20
    recall_at_k: Dict[int, float] = {}
    ndcg_at_k: Dict[int, float] = {}
    auc_roc: Optional[float] = None
    click_through_rate: Optional[float] = None
    conversion_rate: Optional[float] = None
    diversity_score: Optional[float] = None
    novelty_score: Optional[float] = None
    coverage_score: Optional[float] = None


class ModelTrainingJob(BaseModel):
    """Model training job configuration."""
    job_id: str
    model_type: str  # "collaborative_filtering", "content_based", "matrix_factorization"
    algorithm: str
    hyperparameters: Dict[str, Any] = {}
    training_data_period: Dict[str, datetime] = {}
    status: str = "pending"  # "pending", "running", "completed", "failed"
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    metrics: Optional[ModelPerformanceMetrics] = None
    error_message: Optional[str] = None


# Real-time Features
class UserContext(BaseModel):
    """Real-time user context for recommendations."""
    user_id: UUID
    current_location: Optional[Dict[str, float]] = None
    device_type: Optional[str] = None
    session_start: datetime
    page_views: List[Dict[str, Any]] = []
    search_queries: List[str] = []
    recent_interactions: List[Dict[str, Any]] = []
    weather_conditions: Optional[Dict[str, Any]] = None
    time_of_day: Optional[str] = None
    day_of_week: Optional[str] = None


class RecommendationResponse(BaseModel):
    """Response for recommendation requests."""
    recommendations: List[Union[
        PropertyRecommendation,
        POIRecommendation,
        ExperienceRecommendation,
        ItineraryRecommendation
    ]]
    total_count: int
    page: int
    per_page: int
    algorithm_used: str
    explanation: Optional[str] = None
    experiment_info: Optional[Dict[str, str]] = None
    cached: bool = False
    response_time_ms: int


class TrendingItem(BaseModel):
    """Trending item for recommendations."""
    item_id: UUID
    item_type: RecommendationType
    trend_score: float
    growth_rate: float
    popularity_score: float
    time_period: str  # "1h", "24h", "7d", "30d"
    metadata: Dict[str, Any] = {}


# Explanation and Confidence
class RecommendationExplanation(BaseModel):
    """Detailed explanation for a recommendation."""
    recommendation_id: UUID
    primary_reason: str
    detailed_factors: List[Dict[str, Any]] = []
    confidence_breakdown: Dict[str, float] = {}
    similar_users: Optional[List[Dict[str, Any]]] = None
    similar_items: Optional[List[Dict[str, Any]]] = None
    personalization_strength: float = Field(..., ge=0.0, le=1.0)


# Configuration and Settings
class RecommendationConfig(BaseModel):
    """Recommendation system configuration."""
    algorithm_weights: Dict[str, float] = {
        "collaborative_filtering": 0.4,
        "content_based": 0.3,
        "matrix_factorization": 0.2,
        "popularity": 0.1
    }
    min_confidence_threshold: float = 0.3
    max_recommendations_per_request: int = 100
    cache_ttl_seconds: int = 3600
    enable_cold_start_fallback: bool = True
    enable_diversity_boost: bool = True
    diversity_factor: float = 0.1
    novelty_factor: float = 0.05
    real_time_update_interval: int = 300  # seconds


# Error and Fallback
class RecommendationError(BaseModel):
    """Recommendation error information."""
    error_code: str
    error_message: str
    fallback_used: bool = False
    fallback_algorithm: Optional[str] = None
    occurred_at: datetime
    user_id: Optional[UUID] = None
    request_context: Dict[str, Any] = {}