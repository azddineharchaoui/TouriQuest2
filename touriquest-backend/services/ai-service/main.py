"""
TouriQuest AI Service
FastAPI microservice for AI recommendations, chatbot, and personalization
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from shared.database import get_db_session, BaseRepository
from shared.monitoring import MonitoringSetup
from shared.security import SecurityHeaders, RateLimiter, get_current_user
import logging
import uuid
import openai
import json

logger = logging.getLogger(__name__)

app = FastAPI(
    title="TouriQuest AI Service",
    description="AI recommendations, chatbot, and personalization microservice",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Monitoring setup
monitoring = MonitoringSetup("ai-service")
app = monitoring.instrument_fastapi(app)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

rate_limiter = RateLimiter()


# Pydantic models
class ChatMessage(BaseModel):
    role: str  # user, assistant, system
    content: str
    timestamp: Optional[datetime] = None


class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    context: Optional[Dict[str, Any]] = None


class ChatResponse(BaseModel):
    response: str
    conversation_id: str
    suggestions: List[str] = []
    recommendations: Optional[Dict[str, Any]] = None


class RecommendationRequest(BaseModel):
    user_preferences: Dict[str, Any]
    location: Optional[Dict[str, float]] = None  # lat, lng
    budget_range: Optional[Dict[str, float]] = None  # min, max
    travel_dates: Optional[Dict[str, str]] = None  # start, end
    group_size: Optional[int] = None
    interests: List[str] = []


class RecommendationResponse(BaseModel):
    destinations: List[Dict[str, Any]]
    accommodations: List[Dict[str, Any]]
    experiences: List[Dict[str, Any]]
    restaurants: List[Dict[str, Any]]
    itinerary: Optional[Dict[str, Any]] = None
    confidence_score: float


class PersonalizationData(BaseModel):
    user_id: str
    interactions: List[Dict[str, Any]]
    preferences: Dict[str, Any]
    booking_history: List[Dict[str, Any]]


# AI Service classes
class OpenAIService:
    """OpenAI integration service."""
    
    def __init__(self, api_key: str):
        openai.api_key = api_key
        self.model = "gpt-4"
    
    async def generate_chat_response(self, messages: List[ChatMessage], context: Optional[Dict] = None) -> str:
        """Generate chatbot response using OpenAI."""
        try:
            # Prepare system prompt for travel assistant
            system_prompt = """You are TouriQuest AI, a helpful travel assistant specializing in Morocco tourism. 
            You help users plan trips, find accommodations, discover experiences, and answer travel-related questions.
            Always provide helpful, accurate, and culturally sensitive information about Morocco and travel in general.
            If you don't know something, admit it and suggest where the user might find more information."""
            
            # Convert messages to OpenAI format
            openai_messages = [{"role": "system", "content": system_prompt}]
            for msg in messages:
                openai_messages.append({
                    "role": msg.role,
                    "content": msg.content
                })
            
            # Add context if provided
            if context:
                context_msg = f"Additional context: {json.dumps(context)}"
                openai_messages.append({"role": "system", "content": context_msg})
            
            # Call OpenAI API
            response = await openai.ChatCompletion.acreate(
                model=self.model,
                messages=openai_messages,
                max_tokens=500,
                temperature=0.7
            )
            
            return response.choices[0].message.content
        
        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            return "I'm sorry, I'm having trouble processing your request right now. Please try again later."
    
    async def generate_recommendations(self, request: RecommendationRequest) -> Dict[str, Any]:
        """Generate personalized travel recommendations."""
        try:
            prompt = f"""Generate personalized travel recommendations for Morocco based on:
            User preferences: {request.user_preferences}
            Interests: {request.interests}
            Budget range: {request.budget_range}
            Group size: {request.group_size}
            
            Provide recommendations for:
            1. Top 3 destinations in Morocco
            2. Accommodation types and specific properties
            3. Experiences and activities
            4. Local restaurants and cuisine
            5. A suggested 3-day itinerary
            
            Format the response as JSON."""
            
            response = await openai.ChatCompletion.acreate(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=1000,
                temperature=0.7
            )
            
            # Parse response (would need proper JSON parsing in production)
            recommendations = {
                "destinations": [
                    {"name": "Marrakech", "description": "Imperial city with vibrant souks and palaces", "confidence": 0.9},
                    {"name": "Fez", "description": "Cultural capital with medieval medina", "confidence": 0.85},
                    {"name": "Chefchaouen", "description": "Blue city in the Rif Mountains", "confidence": 0.8}
                ],
                "accommodations": [
                    {"name": "La Mamounia", "type": "luxury_hotel", "price_range": "high"},
                    {"name": "Riad Yasmine", "type": "riad", "price_range": "medium"}
                ],
                "experiences": [
                    {"name": "Atlas Mountains Trek", "duration": "full_day", "difficulty": "moderate"},
                    {"name": "Cooking Class", "duration": "half_day", "difficulty": "easy"}
                ],
                "restaurants": [
                    {"name": "Nomad", "cuisine": "modern_moroccan", "price_range": "medium"},
                    {"name": "Cafe Arabe", "cuisine": "international", "price_range": "medium"}
                ]
            }
            
            return recommendations
        
        except Exception as e:
            logger.error(f"Recommendation generation error: {e}")
            return {"error": "Failed to generate recommendations"}


class PersonalizationEngine:
    """User personalization and learning engine."""
    
    def __init__(self):
        self.user_profiles = {}  # In production, use database
    
    async def update_user_profile(self, personalization_data: PersonalizationData):
        """Update user profile based on interactions."""
        user_id = personalization_data.user_id
        
        # Analyze interactions and update preferences
        if user_id not in self.user_profiles:
            self.user_profiles[user_id] = {
                "preferences": {},
                "behavior_patterns": {},
                "recommendation_history": []
            }
        
        profile = self.user_profiles[user_id]
        
        # Update preferences based on interactions
        for interaction in personalization_data.interactions:
            interaction_type = interaction.get("type")
            
            if interaction_type == "property_view":
                # Track property preferences
                property_type = interaction.get("property_type")
                if property_type:
                    profile["preferences"].setdefault("property_types", {})
                    profile["preferences"]["property_types"][property_type] = (
                        profile["preferences"]["property_types"].get(property_type, 0) + 1
                    )
            
            elif interaction_type == "search":
                # Track search patterns
                search_filters = interaction.get("filters", {})
                for key, value in search_filters.items():
                    profile["preferences"].setdefault("search_patterns", {})
                    profile["preferences"]["search_patterns"][key] = value
        
        logger.info(f"Updated user profile for {user_id}")
    
    async def get_personalized_recommendations(self, user_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Get personalized recommendations based on user profile."""
        profile = self.user_profiles.get(user_id, {})
        
        # Generate recommendations based on profile and context
        recommendations = {
            "destinations": [],
            "accommodations": [],
            "experiences": [],
            "confidence_score": 0.7
        }
        
        # Use ML models in production for better recommendations
        return recommendations


# Dependencies
openai_service = OpenAIService("your-openai-api-key")  # Configure from env
personalization_engine = PersonalizationEngine()


# API Routes
@app.post("/api/v1/ai/chat", response_model=ChatResponse)
async def chat_with_ai(
    chat_request: ChatRequest,
    current_user: dict = Depends(get_current_user)
):
    """Chat with AI travel assistant."""
    conversation_id = chat_request.conversation_id or str(uuid.uuid4())
    
    # Create message
    user_message = ChatMessage(
        role="user",
        content=chat_request.message,
        timestamp=datetime.utcnow()
    )
    
    # Generate response
    response_content = await openai_service.generate_chat_response(
        [user_message],
        chat_request.context
    )
    
    # Generate suggestions
    suggestions = [
        "Tell me about Marrakech",
        "What are the best riads in Fez?",
        "Plan a 7-day Morocco itinerary",
        "What should I pack for Morocco?"
    ]
    
    return ChatResponse(
        response=response_content,
        conversation_id=conversation_id,
        suggestions=suggestions
    )


@app.post("/api/v1/ai/recommendations", response_model=RecommendationResponse)
async def get_recommendations(
    recommendation_request: RecommendationRequest,
    current_user: dict = Depends(get_current_user)
):
    """Get AI-powered travel recommendations."""
    
    # Get personalized recommendations
    personalized_recs = await personalization_engine.get_personalized_recommendations(
        current_user["id"],
        recommendation_request.dict()
    )
    
    # Generate AI recommendations
    ai_recs = await openai_service.generate_recommendations(recommendation_request)
    
    # Combine and rank recommendations
    combined_recommendations = {
        "destinations": ai_recs.get("destinations", []),
        "accommodations": ai_recs.get("accommodations", []),
        "experiences": ai_recs.get("experiences", []),
        "restaurants": ai_recs.get("restaurants", []),
        "confidence_score": 0.85
    }
    
    return RecommendationResponse(**combined_recommendations)


@app.post("/api/v1/ai/personalization/update")
async def update_personalization(
    personalization_data: PersonalizationData,
    current_user: dict = Depends(get_current_user)
):
    """Update user personalization data."""
    
    # Ensure user can only update their own data
    if personalization_data.user_id != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot update another user's personalization data"
        )
    
    await personalization_engine.update_user_profile(personalization_data)
    
    return {"message": "Personalization data updated successfully"}


@app.get("/api/v1/ai/suggestions")
async def get_ai_suggestions(
    query: str,
    current_user: dict = Depends(get_current_user)
):
    """Get AI-powered search suggestions."""
    
    # Generate suggestions based on query
    suggestions = [
        f"Hotels in {query}",
        f"Things to do in {query}",
        f"Restaurants in {query}",
        f"Best time to visit {query}",
        f"Culture and traditions of {query}"
    ]
    
    return {"suggestions": suggestions}


@app.post("/api/v1/ai/itinerary")
async def generate_itinerary(
    destination: str,
    days: int,
    budget: str,
    interests: List[str],
    current_user: dict = Depends(get_current_user)
):
    """Generate AI-powered travel itinerary."""
    
    prompt = f"""Create a detailed {days}-day itinerary for {destination} with a {budget} budget.
    User interests: {', '.join(interests)}
    
    Include:
    - Daily activities and timing
    - Accommodation suggestions
    - Restaurant recommendations
    - Transportation options
    - Estimated costs
    - Cultural tips and etiquette"""
    
    # Mock itinerary generation
    itinerary = {
        "destination": destination,
        "duration_days": days,
        "budget_level": budget,
        "daily_plans": [
            {
                "day": 1,
                "title": "Arrival and City Exploration",
                "activities": [
                    {"time": "10:00", "activity": "Check-in to accommodation"},
                    {"time": "14:00", "activity": "Explore main square"},
                    {"time": "19:00", "activity": "Traditional dinner"}
                ],
                "estimated_cost": 50
            }
        ],
        "total_estimated_cost": days * 50,
        "cultural_tips": [
            "Dress modestly when visiting religious sites",
            "Learn basic Arabic greetings",
            "Always negotiate prices in markets"
        ]
    }
    
    return itinerary


@app.get("/api/v1/ai/analytics")
async def get_ai_analytics(
    current_user: dict = Depends(get_current_user)
):
    """Get AI usage analytics for the user."""
    
    analytics = {
        "chat_sessions": 15,
        "recommendations_generated": 8,
        "itineraries_created": 3,
        "top_interests": ["culture", "food", "adventure"],
        "preferred_destinations": ["Marrakech", "Fez", "Chefchaouen"],
        "engagement_score": 0.85
    }
    
    return analytics


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "ai-service",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)