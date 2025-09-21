"""
Function calling framework for AI assistant actions.
"""
import asyncio
import json
import logging
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any, Dict, List, Optional, Type
from uuid import UUID

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.schemas import ActionExecution, ActionResult, UserContext

logger = logging.getLogger(__name__)


class BaseFunction(ABC):
    """Base class for AI function calls."""
    
    def __init__(self, name: str, description: str):
        """Initialize function."""
        self.name = name
        self.description = description
        self.execution_time = 0.0
    
    @abstractmethod
    async def execute(
        self,
        parameters: Dict[str, Any],
        user_context: Optional[UserContext] = None,
        db: Optional[AsyncSession] = None
    ) -> ActionResult:
        """Execute the function."""
        pass
    
    @abstractmethod
    def get_schema(self) -> Dict[str, Any]:
        """Get function schema for AI model."""
        pass
    
    def validate_parameters(self, parameters: Dict[str, Any]) -> bool:
        """Validate function parameters."""
        schema = self.get_schema()
        required = schema.get("parameters", {}).get("required", [])
        
        for param in required:
            if param not in parameters:
                return False
        
        return True


class PropertySearchFunction(BaseFunction):
    """Function to search for properties and accommodations."""
    
    def __init__(self):
        super().__init__(
            "search_properties",
            "Search for accommodations and properties based on location, dates, and preferences"
        )
    
    async def execute(
        self,
        parameters: Dict[str, Any],
        user_context: Optional[UserContext] = None,
        db: Optional[AsyncSession] = None
    ) -> ActionResult:
        """Execute property search."""
        start_time = datetime.utcnow()
        
        try:
            # Extract parameters
            location = parameters.get("location")
            check_in = parameters.get("check_in")
            check_out = parameters.get("check_out")
            guests = parameters.get("guests", 1)
            price_range = parameters.get("price_range", {})
            property_type = parameters.get("property_type")
            amenities = parameters.get("amenities", [])
            
            # Build search query
            search_params = {
                "location": location,
                "check_in": check_in,
                "check_out": check_out,
                "guests": guests,
                "sort": "relevance"
            }
            
            if price_range:
                search_params.update(price_range)
            
            if property_type:
                search_params["property_type"] = property_type
            
            if amenities:
                search_params["amenities"] = amenities
            
            # Apply user preferences if available
            if user_context and user_context.preferences:
                budget = user_context.budget_range
                if budget:
                    search_params.setdefault("min_price", budget.get("min"))
                    search_params.setdefault("max_price", budget.get("max"))
            
            # Call property service (mock implementation)
            properties = await self._search_properties_api(search_params)
            
            # Format results
            result_data = {
                "properties": properties,
                "search_params": search_params,
                "total_found": len(properties),
                "filters_applied": {
                    "location": location,
                    "dates": f"{check_in} to {check_out}" if check_in and check_out else None,
                    "guests": guests,
                    "price_range": price_range if price_range else None,
                    "property_type": property_type,
                    "amenities": amenities
                }
            }
            
            # Generate suggestions
            suggestions = [
                "Refine search with more filters",
                "Compare selected properties",
                "Check availability for different dates",
                "Save favorite properties"
            ]
            
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            
            return ActionResult(
                action_type="search_properties",
                success=True,
                result=result_data,
                suggestions=suggestions,
                execution_time=execution_time
            )
            
        except Exception as e:
            logger.error(f"Error in property search: {str(e)}")
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            
            return ActionResult(
                action_type="search_properties",
                success=False,
                error_message=str(e),
                execution_time=execution_time
            )
    
    async def _search_properties_api(self, search_params: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Call property service API (mock implementation)."""
        # Mock property data
        properties = [
            {
                "id": "prop_001",
                "name": "Luxury Beach Resort",
                "location": search_params.get("location", "Unknown Location"),
                "type": "hotel",
                "price_per_night": 250,
                "rating": 4.5,
                "review_count": 324,
                "amenities": ["pool", "spa", "wifi", "parking", "restaurant"],
                "images": ["image1.jpg", "image2.jpg"],
                "availability": True,
                "instant_book": True,
                "description": "Beautiful beachfront resort with stunning ocean views"
            },
            {
                "id": "prop_002", 
                "name": "Cozy City Apartment",
                "location": search_params.get("location", "Unknown Location"),
                "type": "apartment",
                "price_per_night": 85,
                "rating": 4.2,
                "review_count": 156,
                "amenities": ["wifi", "kitchen", "washing_machine"],
                "images": ["apt1.jpg", "apt2.jpg"],
                "availability": True,
                "instant_book": False,
                "description": "Modern apartment in the heart of the city"
            },
            {
                "id": "prop_003",
                "name": "Mountain Lodge Retreat",
                "location": search_params.get("location", "Unknown Location"),
                "type": "lodge",
                "price_per_night": 180,
                "rating": 4.7,
                "review_count": 89,
                "amenities": ["fireplace", "hiking_trails", "wifi", "parking"],
                "images": ["lodge1.jpg", "lodge2.jpg"],
                "availability": True,
                "instant_book": True,
                "description": "Peaceful mountain retreat with breathtaking views"
            }
        ]
        
        # Filter by property type if specified
        property_type = search_params.get("property_type")
        if property_type:
            properties = [p for p in properties if p["type"] == property_type]
        
        # Filter by price range if specified
        min_price = search_params.get("min_price")
        max_price = search_params.get("max_price")
        if min_price:
            properties = [p for p in properties if p["price_per_night"] >= min_price]
        if max_price:
            properties = [p for p in properties if p["price_per_night"] <= max_price]
        
        return properties
    
    def get_schema(self) -> Dict[str, Any]:
        """Get function schema."""
        return {
            "name": "search_properties",
            "description": "Search for accommodations and properties",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {"type": "string", "description": "Location to search in"},
                    "check_in": {"type": "string", "description": "Check-in date (YYYY-MM-DD)"},
                    "check_out": {"type": "string", "description": "Check-out date (YYYY-MM-DD)"},
                    "guests": {"type": "integer", "description": "Number of guests"},
                    "price_range": {
                        "type": "object",
                        "properties": {
                            "min": {"type": "number"},
                            "max": {"type": "number"}
                        }
                    },
                    "property_type": {"type": "string", "enum": ["hotel", "apartment", "house", "resort", "hostel", "lodge"]},
                    "amenities": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["location"]
            }
        }


class WeatherFunction(BaseFunction):
    """Function to get weather information."""
    
    def __init__(self):
        super().__init__(
            "get_weather",
            "Get current weather and forecast for a location"
        )
    
    async def execute(
        self,
        parameters: Dict[str, Any],
        user_context: Optional[UserContext] = None,
        db: Optional[AsyncSession] = None
    ) -> ActionResult:
        """Execute weather lookup."""
        start_time = datetime.utcnow()
        
        try:
            location = parameters.get("location")
            date = parameters.get("date")
            
            # Get weather data (mock implementation)
            weather_data = await self._get_weather_data(location, date)
            
            # Generate travel advice based on weather
            advice = self._generate_weather_advice(weather_data)
            
            result_data = {
                "location": location,
                "current_weather": weather_data,
                "travel_advice": advice,
                "last_updated": datetime.utcnow().isoformat()
            }
            
            suggestions = [
                "Get 7-day forecast",
                "Check weather for activities",
                "Get packing recommendations",
                "Find indoor alternatives"
            ]
            
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            
            return ActionResult(
                action_type="get_weather",
                success=True,
                result=result_data,
                suggestions=suggestions,
                execution_time=execution_time
            )
            
        except Exception as e:
            logger.error(f"Error getting weather: {str(e)}")
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            
            return ActionResult(
                action_type="get_weather",
                success=False,
                error_message=str(e),
                execution_time=execution_time
            )
    
    async def _get_weather_data(self, location: str, date: Optional[str] = None) -> Dict[str, Any]:
        """Get weather data from API (mock implementation)."""
        # Mock weather data
        return {
            "temperature": 24,
            "condition": "Partly Cloudy",
            "humidity": 65,
            "wind_speed": 12,
            "precipitation": 10,
            "uv_index": 6,
            "visibility": 10,
            "forecast": [
                {"day": "Today", "high": 26, "low": 18, "condition": "Partly Cloudy"},
                {"day": "Tomorrow", "high": 28, "low": 20, "condition": "Sunny"},
                {"day": "Day 3", "high": 25, "low": 17, "condition": "Light Rain"}
            ]
        }
    
    def _generate_weather_advice(self, weather_data: Dict[str, Any]) -> List[str]:
        """Generate weather-based travel advice."""
        advice = []
        temp = weather_data.get("temperature", 0)
        condition = weather_data.get("condition", "").lower()
        
        if temp > 30:
            advice.append("Hot weather - stay hydrated and wear light clothing")
        elif temp < 10:
            advice.append("Cold weather - dress warmly and layer clothing")
        
        if "rain" in condition:
            advice.append("Rainy conditions - bring an umbrella and waterproof gear")
        elif "sunny" in condition:
            advice.append("Sunny weather - perfect for outdoor activities")
        
        uv_index = weather_data.get("uv_index", 0)
        if uv_index > 7:
            advice.append("High UV - use sunscreen and seek shade during midday")
        
        return advice
    
    def get_schema(self) -> Dict[str, Any]:
        """Get function schema."""
        return {
            "name": "get_weather",
            "description": "Get weather information for a location",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {"type": "string", "description": "Location to get weather for"},
                    "date": {"type": "string", "description": "Date for weather forecast (YYYY-MM-DD)"}
                },
                "required": ["location"]
            }
        }


class POISearchFunction(BaseFunction):
    """Function to search for points of interest."""
    
    def __init__(self):
        super().__init__(
            "search_pois",
            "Search for points of interest and attractions"
        )
    
    async def execute(
        self,
        parameters: Dict[str, Any],
        user_context: Optional[UserContext] = None,
        db: Optional[AsyncSession] = None
    ) -> ActionResult:
        """Execute POI search."""
        start_time = datetime.utcnow()
        
        try:
            location = parameters.get("location")
            category = parameters.get("category")
            radius = parameters.get("radius", 10)  # km
            rating_min = parameters.get("rating_min", 0)
            
            # Search POIs (mock implementation)
            pois = await self._search_pois_api({
                "location": location,
                "category": category,
                "radius": radius,
                "rating_min": rating_min
            })
            
            # Apply user interest filtering
            if user_context and user_context.interests:
                pois = self._filter_by_interests(pois, user_context.interests)
            
            result_data = {
                "pois": pois,
                "search_location": location,
                "category": category,
                "total_found": len(pois),
                "radius_km": radius
            }
            
            suggestions = [
                "Get directions to POI",
                "Check opening hours",
                "Read reviews",
                "Find nearby restaurants"
            ]
            
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            
            return ActionResult(
                action_type="search_pois",
                success=True,
                result=result_data,
                suggestions=suggestions,
                execution_time=execution_time
            )
            
        except Exception as e:
            logger.error(f"Error searching POIs: {str(e)}")
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            
            return ActionResult(
                action_type="search_pois",
                success=False,
                error_message=str(e),
                execution_time=execution_time
            )
    
    async def _search_pois_api(self, search_params: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Search POIs via API (mock implementation)."""
        # Mock POI data
        all_pois = [
            {
                "id": "poi_001",
                "name": "Historic Art Museum",
                "category": "museums",
                "rating": 4.6,
                "review_count": 423,
                "distance": 0.8,
                "opening_hours": "9:00 AM - 6:00 PM",
                "entry_fee": "$15",
                "description": "World-class art collection spanning centuries",
                "tags": ["art", "history", "culture"]
            },
            {
                "id": "poi_002",
                "name": "Gourmet Bistro",
                "category": "restaurants",
                "rating": 4.3,
                "review_count": 267,
                "distance": 0.3,
                "opening_hours": "11:00 AM - 11:00 PM",
                "price_range": "$$$",
                "description": "Fine dining with local cuisine specialties",
                "tags": ["fine_dining", "local_cuisine", "romantic"]
            },
            {
                "id": "poi_003",
                "name": "Central Park",
                "category": "nature",
                "rating": 4.5,
                "review_count": 1205,
                "distance": 1.2,
                "opening_hours": "24 hours",
                "entry_fee": "Free",
                "description": "Beautiful urban park perfect for relaxation",
                "tags": ["nature", "walking", "family_friendly"]
            }
        ]
        
        # Filter by category
        category = search_params.get("category")
        if category:
            all_pois = [poi for poi in all_pois if poi["category"] == category]
        
        # Filter by rating
        rating_min = search_params.get("rating_min", 0)
        all_pois = [poi for poi in all_pois if poi["rating"] >= rating_min]
        
        # Filter by radius
        radius = search_params.get("radius", 10)
        all_pois = [poi for poi in all_pois if poi["distance"] <= radius]
        
        return all_pois
    
    def _filter_by_interests(self, pois: List[Dict[str, Any]], interests: List[str]) -> List[Dict[str, Any]]:
        """Filter POIs by user interests."""
        if not interests:
            return pois
        
        filtered_pois = []
        for poi in pois:
            poi_tags = poi.get("tags", [])
            if any(interest.lower() in [tag.lower() for tag in poi_tags] for interest in interests):
                filtered_pois.append(poi)
        
        return filtered_pois or pois  # Return all if no matches
    
    def get_schema(self) -> Dict[str, Any]:
        """Get function schema."""
        return {
            "name": "search_pois",
            "description": "Search for points of interest and attractions",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {"type": "string", "description": "Location to search in"},
                    "category": {
                        "type": "string", 
                        "enum": ["museums", "restaurants", "attractions", "nature", "shopping", "nightlife"],
                        "description": "Category of POI to search for"
                    },
                    "radius": {"type": "number", "description": "Search radius in kilometers"},
                    "rating_min": {"type": "number", "description": "Minimum rating filter"}
                },
                "required": ["location"]
            }
        }


class ItineraryPlanningFunction(BaseFunction):
    """Function to plan travel itineraries."""
    
    def __init__(self):
        super().__init__(
            "plan_itinerary",
            "Plan detailed travel itineraries based on preferences and duration"
        )
    
    async def execute(
        self,
        parameters: Dict[str, Any],
        user_context: Optional[UserContext] = None,
        db: Optional[AsyncSession] = None
    ) -> ActionResult:
        """Execute itinerary planning."""
        start_time = datetime.utcnow()
        
        try:
            destination = parameters.get("destination")
            duration = parameters.get("duration", 3)
            interests = parameters.get("interests", [])
            budget = parameters.get("budget", "mid-range")
            travel_style = parameters.get("travel_style", "balanced")
            
            # Apply user context
            if user_context:
                if user_context.interests:
                    interests.extend(user_context.interests)
                if user_context.budget_range:
                    budget_map = {
                        (0, 100): "budget",
                        (100, 300): "mid-range", 
                        (300, float('inf')): "luxury"
                    }
                    user_budget = user_context.budget_range.get("max", 200)
                    for (min_b, max_b), budget_type in budget_map.items():
                        if min_b <= user_budget < max_b:
                            budget = budget_type
                            break
            
            # Generate itinerary
            itinerary = await self._generate_itinerary(
                destination, duration, interests, budget, travel_style
            )
            
            result_data = {
                "destination": destination,
                "duration_days": duration,
                "budget_category": budget,
                "travel_style": travel_style,
                "interests": list(set(interests)),  # Remove duplicates
                "itinerary": itinerary,
                "total_estimated_cost": sum(day.get("estimated_cost", 0) for day in itinerary),
                "generated_at": datetime.utcnow().isoformat()
            }
            
            suggestions = [
                "Modify itinerary",
                "Add more activities",
                "Check transportation options",
                "Book accommodations"
            ]
            
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            
            return ActionResult(
                action_type="plan_itinerary",
                success=True,
                result=result_data,
                suggestions=suggestions,
                execution_time=execution_time
            )
            
        except Exception as e:
            logger.error(f"Error planning itinerary: {str(e)}")
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            
            return ActionResult(
                action_type="plan_itinerary",
                success=False,
                error_message=str(e),
                execution_time=execution_time
            )
    
    async def _generate_itinerary(
        self, 
        destination: str, 
        duration: int, 
        interests: List[str], 
        budget: str, 
        travel_style: str
    ) -> List[Dict[str, Any]]:
        """Generate itinerary based on parameters."""
        # Mock itinerary generation
        activities_by_interest = {
            "culture": ["Visit museums", "Explore historic sites", "Attend local performances"],
            "nature": ["Hiking trails", "National parks", "Scenic viewpoints"],
            "food": ["Food tours", "Cooking classes", "Local markets"],
            "adventure": ["Rock climbing", "Water sports", "Zip lining"],
            "relaxation": ["Spa treatments", "Beach time", "Wellness retreats"]
        }
        
        budget_multipliers = {
            "budget": 0.7,
            "mid-range": 1.0,
            "luxury": 1.5
        }
        
        base_cost = 100  # Base daily cost
        daily_cost = base_cost * budget_multipliers.get(budget, 1.0)
        
        itinerary = []
        for day in range(1, duration + 1):
            day_activities = []
            
            # Select activities based on interests
            selected_interests = interests[:2] if interests else ["culture", "food"]
            for interest in selected_interests:
                if interest in activities_by_interest:
                    activity_options = activities_by_interest[interest]
                    if activity_options:
                        day_activities.append(activity_options[day % len(activity_options)])
            
            # Add meals
            meals = ["Breakfast at local café", "Lunch at recommended restaurant", "Dinner at popular venue"]
            day_activities.extend(meals)
            
            day_plan = {
                "day": day,
                "title": f"Day {day} in {destination}",
                "activities": day_activities,
                "estimated_cost": daily_cost,
                "travel_style_notes": self._get_style_notes(travel_style),
                "tips": [
                    "Book activities in advance",
                    "Check opening hours",
                    "Bring comfortable shoes"
                ]
            }
            
            itinerary.append(day_plan)
        
        return itinerary
    
    def _get_style_notes(self, travel_style: str) -> List[str]:
        """Get travel style specific notes."""
        style_notes = {
            "relaxed": ["Take your time", "Build in rest periods", "Flexible scheduling"],
            "active": ["Early starts", "Pack light", "High energy activities"],
            "cultural": ["Local experiences", "Museums priority", "Historical sites"],
            "adventure": ["Outdoor gear", "Physical activities", "Nature focus"]
        }
        
        return style_notes.get(travel_style, ["Balanced approach", "Mix of activities"])
    
    def get_schema(self) -> Dict[str, Any]:
        """Get function schema."""
        return {
            "name": "plan_itinerary",
            "description": "Plan a travel itinerary",
            "parameters": {
                "type": "object",
                "properties": {
                    "destination": {"type": "string", "description": "Travel destination"},
                    "duration": {"type": "integer", "description": "Trip duration in days"},
                    "interests": {"type": "array", "items": {"type": "string"}},
                    "budget": {"type": "string", "enum": ["budget", "mid-range", "luxury"]},
                    "travel_style": {"type": "string", "enum": ["relaxed", "active", "cultural", "adventure"]}
                },
                "required": ["destination", "duration"]
            }
        }


class FunctionRegistry:
    """Registry for managing AI functions."""
    
    def __init__(self):
        """Initialize function registry."""
        self.functions: Dict[str, BaseFunction] = {}
        self._register_default_functions()
    
    def _register_default_functions(self):
        """Register default functions."""
        self.register_function(PropertySearchFunction())
        self.register_function(WeatherFunction())
        self.register_function(POISearchFunction())
        self.register_function(ItineraryPlanningFunction())
    
    def register_function(self, function: BaseFunction):
        """Register a new function."""
        self.functions[function.name] = function
        logger.info(f"Registered function: {function.name}")
    
    def get_function(self, name: str) -> Optional[BaseFunction]:
        """Get function by name."""
        return self.functions.get(name)
    
    def get_all_functions(self) -> Dict[str, BaseFunction]:
        """Get all registered functions."""
        return self.functions.copy()
    
    def get_function_schemas(self) -> List[Dict[str, Any]]:
        """Get schemas for all functions."""
        return [func.get_schema() for func in self.functions.values()]
    
    async def execute_function(
        self,
        name: str,
        parameters: Dict[str, Any],
        user_context: Optional[UserContext] = None,
        db: Optional[AsyncSession] = None
    ) -> ActionResult:
        """Execute a function by name."""
        function = self.get_function(name)
        if not function:
            return ActionResult(
                action_type=name,
                success=False,
                error_message=f"Function '{name}' not found",
                execution_time=0.0
            )
        
        if not function.validate_parameters(parameters):
            return ActionResult(
                action_type=name,
                success=False,
                error_message="Invalid parameters for function",
                execution_time=0.0
            )
        
        try:
            result = await function.execute(parameters, user_context, db)
            logger.info(f"Function '{name}' executed successfully in {result.execution_time:.2f}s")
            return result
        except Exception as e:
            logger.error(f"Error executing function '{name}': {str(e)}")
            return ActionResult(
                action_type=name,
                success=False,
                error_message=str(e),
                execution_time=0.0
            )


# Global function registry
function_registry = FunctionRegistry()