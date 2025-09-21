"""
Google Gemini AI integration service.
"""
import json
import logging
from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID

import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold

from app.core.config import settings
from app.models.schemas import (
    ChatMessage, IntentType, Language, ChatMessageResponse,
    UserContext, FunctionCall
)

logger = logging.getLogger(__name__)


class GeminiAIService:
    """Google Gemini AI service for conversation and function calling."""
    
    def __init__(self):
        """Initialize Gemini AI service."""
        self.api_key = settings.google_gemini_api_key
        self.model_name = settings.gemini_model
        
        # Configure Gemini API
        genai.configure(api_key=self.api_key)
        
        # Initialize model
        self.model = genai.GenerativeModel(
            model_name=self.model_name,
            generation_config=genai.GenerationConfig(
                temperature=0.7,
                top_p=0.9,
                top_k=40,
                max_output_tokens=2048,
            ),
            safety_settings={
                HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            }
        )
        
        # Function definitions for travel assistance
        self.available_functions = {
            "search_properties": {
                "description": "Search for accommodations and properties",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "location": {"type": "string", "description": "Location to search in"},
                        "check_in": {"type": "string", "description": "Check-in date (YYYY-MM-DD)"},
                        "check_out": {"type": "string", "description": "Check-out date (YYYY-MM-DD)"},
                        "guests": {"type": "integer", "description": "Number of guests"},
                        "price_range": {"type": "object", "properties": {"min": {"type": "number"}, "max": {"type": "number"}}},
                        "property_type": {"type": "string", "enum": ["hotel", "apartment", "house", "resort", "hostel"]},
                        "amenities": {"type": "array", "items": {"type": "string"}}
                    },
                    "required": ["location"]
                }
            },
            "get_weather": {
                "description": "Get weather information for a location",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "location": {"type": "string", "description": "Location to get weather for"},
                        "date": {"type": "string", "description": "Date for weather forecast (YYYY-MM-DD)"}
                    },
                    "required": ["location"]
                }
            },
            "search_pois": {
                "description": "Search for points of interest and attractions",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "location": {"type": "string", "description": "Location to search in"},
                        "category": {"type": "string", "enum": ["museums", "restaurants", "attractions", "nature", "shopping", "nightlife"]},
                        "radius": {"type": "number", "description": "Search radius in kilometers"},
                        "rating_min": {"type": "number", "description": "Minimum rating filter"}
                    },
                    "required": ["location"]
                }
            },
            "plan_itinerary": {
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
            },
            "compare_prices": {
                "description": "Compare prices for accommodations or experiences",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "item_type": {"type": "string", "enum": ["property", "experience", "flight"]},
                        "location": {"type": "string", "description": "Location for comparison"},
                        "dates": {"type": "object", "properties": {"start": {"type": "string"}, "end": {"type": "string"}}},
                        "criteria": {"type": "object", "description": "Additional search criteria"}
                    },
                    "required": ["item_type", "location"]
                }
            },
            "get_travel_advice": {
                "description": "Get travel advice and tips",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "destination": {"type": "string", "description": "Travel destination"},
                        "advice_type": {"type": "string", "enum": ["safety", "culture", "transportation", "food", "general"]},
                        "travel_date": {"type": "string", "description": "Travel date (YYYY-MM-DD)"}
                    },
                    "required": ["destination"]
                }
            }
        }
        
    def _build_system_prompt(self, user_context: Optional[UserContext] = None, language: Language = Language.ENGLISH) -> str:
        """Build system prompt with context."""
        base_prompt = """You are TouriQuest AI, an intelligent travel assistant specialized in helping users plan and book their perfect trips. 

Your capabilities include:
- Searching for accommodations and properties
- Finding points of interest and attractions
- Planning detailed itineraries
- Providing weather information
- Comparing prices and options
- Offering travel advice and tips
- Booking assistance and recommendations

You have access to real-time data and can execute functions to help users with their travel needs.

Personality: Friendly, knowledgeable, and helpful. Provide personalized recommendations based on user preferences.

Language: Respond in {language} unless specifically asked to use another language.

Guidelines:
1. Always prioritize user safety and provide accurate information
2. Suggest eco-friendly and sustainable travel options when possible
3. Consider budget constraints and preferences
4. Provide multiple options with explanations
5. Ask clarifying questions when needed
6. Use function calls to get real-time information
7. Be conversational and engaging
8. Include practical tips and local insights"""

        if user_context:
            context_info = f"""

User Context:
- Current Location: {user_context.current_location or 'Not specified'}
- Travel Interests: {', '.join(user_context.interests or [])}
- Budget Range: {user_context.budget_range or 'Not specified'}
- Travel Companions: {user_context.travel_companions or 'Not specified'}
- Recent Searches: {user_context.recent_searches[-3:] if user_context.recent_searches else 'None'}
"""
            base_prompt += context_info
            
        return base_prompt.format(language=language.value)
    
    def _classify_intent(self, message: str) -> Tuple[Optional[IntentType], float]:
        """Classify message intent using keyword matching and context."""
        message_lower = message.lower()
        
        # Intent classification rules
        intent_keywords = {
            IntentType.PROPERTY_SEARCH: [
                'hotel', 'accommodation', 'place to stay', 'book', 'room', 'apartment',
                'resort', 'hostel', 'lodge', 'villa', 'property', 'check in', 'check out'
            ],
            IntentType.POI_DISCOVERY: [
                'attraction', 'museum', 'restaurant', 'things to do', 'visit', 'see',
                'sightseeing', 'tour', 'activity', 'landmark', 'poi', 'points of interest'
            ],
            IntentType.WEATHER_INQUIRY: [
                'weather', 'temperature', 'rain', 'sunny', 'climate', 'forecast',
                'hot', 'cold', 'umbrella', 'jacket'
            ],
            IntentType.ITINERARY_PLANNING: [
                'itinerary', 'plan', 'schedule', 'trip', 'journey', 'route',
                'day by day', 'agenda', 'timeline'
            ],
            IntentType.PRICE_COMPARISON: [
                'price', 'cost', 'cheap', 'expensive', 'budget', 'compare',
                'affordable', 'discount', 'deal', 'save money'
            ],
            IntentType.TRAVEL_ADVICE: [
                'advice', 'tip', 'recommend', 'suggest', 'help', 'guide',
                'safety', 'culture', 'local', 'custom', 'etiquette'
            ],
            IntentType.BOOKING_INQUIRY: [
                'book', 'reserve', 'availability', 'cancel', 'modify',
                'confirmation', 'payment', 'refund'
            ],
            IntentType.EXPERIENCE_BOOKING: [
                'experience', 'activity', 'tour', 'excursion', 'adventure',
                'workshop', 'class', 'guide'
            ],
        }
        
        # Score each intent
        intent_scores = {}
        for intent, keywords in intent_keywords.items():
            score = sum(1 for keyword in keywords if keyword in message_lower)
            if score > 0:
                intent_scores[intent] = score / len(keywords)
        
        if not intent_scores:
            return IntentType.GENERAL_CHAT, 0.5
            
        # Return intent with highest score
        best_intent = max(intent_scores.items(), key=lambda x: x[1])
        return best_intent[0], min(best_intent[1] * 2, 1.0)  # Normalize confidence
    
    async def generate_response(
        self,
        message: str,
        conversation_history: List[Dict[str, Any]],
        user_context: Optional[UserContext] = None,
        language: Language = Language.ENGLISH
    ) -> Tuple[str, Optional[IntentType], float, List[str], List[Dict[str, Any]]]:
        """Generate AI response with intent classification and suggestions."""
        try:
            # Classify intent
            intent, confidence = self._classify_intent(message)
            
            # Build conversation history for Gemini
            chat_history = []
            system_prompt = self._build_system_prompt(user_context, language)
            
            # Add system message
            chat_history.append({"role": "user", "parts": [system_prompt]})
            chat_history.append({"role": "model", "parts": ["I understand. I'm ready to assist you with your travel needs!"]})
            
            # Add conversation history
            for msg in conversation_history[-10:]:  # Last 10 messages for context
                role = "model" if msg.get("is_from_ai") else "user"
                chat_history.append({
                    "role": role,
                    "parts": [msg["content"]]
                })
            
            # Create chat session
            chat = self.model.start_chat(history=chat_history[:-1] if chat_history else [])
            
            # Generate response
            response = await chat.send_message_async(message)
            
            # Extract response text
            response_text = response.text
            
            # Generate suggestions based on intent
            suggestions = self._generate_suggestions(intent, message, user_context)
            
            # Extract function calls if any (simplified - would need more sophisticated parsing)
            function_calls = self._extract_function_calls(response_text)
            
            return response_text, intent, confidence, suggestions, function_calls
            
        except Exception as e:
            logger.error(f"Error generating response: {str(e)}")
            # Fallback response
            fallback_response = self._get_fallback_response(language)
            return fallback_response, IntentType.GENERAL_CHAT, 0.1, [], []
    
    def _generate_suggestions(
        self,
        intent: Optional[IntentType],
        message: str,
        user_context: Optional[UserContext] = None
    ) -> List[str]:
        """Generate quick action suggestions based on intent."""
        suggestions = []
        
        if intent == IntentType.PROPERTY_SEARCH:
            suggestions = [
                "Show me budget-friendly options",
                "Filter by amenities",
                "Check availability for different dates",
                "Compare prices"
            ]
        elif intent == IntentType.POI_DISCOVERY:
            suggestions = [
                "Find nearby restaurants",
                "Show cultural attractions",
                "Get directions",
                "Check opening hours"
            ]
        elif intent == IntentType.WEATHER_INQUIRY:
            suggestions = [
                "Get 7-day forecast",
                "Check best time to visit",
                "Packing recommendations",
                "Weather for activities"
            ]
        elif intent == IntentType.ITINERARY_PLANNING:
            suggestions = [
                "Optimize my schedule",
                "Add more activities",
                "Check transportation",
                "Export itinerary"
            ]
        elif intent == IntentType.TRAVEL_ADVICE:
            suggestions = [
                "Safety tips",
                "Local customs",
                "Transportation guide",
                "Food recommendations"
            ]
        else:
            # Generic suggestions
            suggestions = [
                "Search for accommodations",
                "Find attractions",
                "Plan an itinerary",
                "Get travel advice"
            ]
        
        return suggestions[:4]  # Limit to 4 suggestions
    
    def _extract_function_calls(self, response_text: str) -> List[Dict[str, Any]]:
        """Extract function calls from response (simplified implementation)."""
        # This is a simplified implementation
        # In a real scenario, you'd use Gemini's function calling capabilities
        function_calls = []
        
        # Look for function call patterns in the response
        # This would be replaced with proper Gemini function calling
        if "search_properties" in response_text.lower():
            function_calls.append({
                "function": "search_properties",
                "parameters": {}  # Would extract from context
            })
        
        return function_calls
    
    def _get_fallback_response(self, language: Language) -> str:
        """Get fallback response for errors."""
        fallback_responses = {
            Language.ENGLISH: "I apologize, but I'm having trouble processing your request right now. Could you please try rephrasing your question?",
            Language.SPANISH: "Disculpa, tengo problemas para procesar tu solicitud en este momento. ¿Podrías reformular tu pregunta?",
            Language.FRENCH: "Je m'excuse, j'ai des difficultés à traiter votre demande en ce moment. Pourriez-vous reformuler votre question?",
            Language.GERMAN: "Entschuldigung, ich habe Probleme bei der Bearbeitung Ihrer Anfrage. Könnten Sie Ihre Frage umformulieren?",
            Language.ITALIAN: "Mi scuso, sto avendo difficoltà a elaborare la tua richiesta. Potresti riformulare la tua domanda?",
            Language.PORTUGUESE: "Peço desculpas, estou tendo dificuldades para processar sua solicitação. Você poderia reformular sua pergunta?",
            Language.ARABIC: "أعتذر، أواجه صعوبة في معالجة طلبك الآن. هل يمكنك إعادة صياغة سؤالك؟",
            Language.CHINESE: "抱歉，我现在处理您的请求时遇到了困难。您能重新表述一下您的问题吗？",
            Language.JAPANESE: "申し訳ございませんが、現在リクエストの処理に問題があります。質問を言い換えていただけますか？",
            Language.KOREAN: "죄송합니다. 지금 요청을 처리하는 데 문제가 있습니다. 질문을 다시 표현해 주실 수 있나요?",
        }
        
        return fallback_responses.get(language, fallback_responses[Language.ENGLISH])
    
    async def execute_function(
        self,
        function_name: str,
        parameters: Dict[str, Any],
        user_context: Optional[UserContext] = None
    ) -> Dict[str, Any]:
        """Execute a function call."""
        try:
            if function_name not in self.available_functions:
                return {
                    "success": False,
                    "error": f"Unknown function: {function_name}",
                    "result": None
                }
            
            # This would call actual service functions
            # For now, return mock data
            mock_results = {
                "search_properties": {
                    "success": True,
                    "result": {
                        "properties": [
                            {
                                "id": "prop_123",
                                "name": "Luxury Beach Resort",
                                "location": parameters.get("location", "Unknown"),
                                "price": 200,
                                "rating": 4.5,
                                "amenities": ["pool", "wifi", "spa"]
                            }
                        ],
                        "total": 15
                    }
                },
                "get_weather": {
                    "success": True,
                    "result": {
                        "location": parameters.get("location", "Unknown"),
                        "temperature": 25,
                        "condition": "Sunny",
                        "humidity": 60,
                        "forecast": "Clear skies expected"
                    }
                },
                "search_pois": {
                    "success": True,
                    "result": {
                        "pois": [
                            {
                                "id": "poi_456",
                                "name": "Historic Museum",
                                "category": "museum",
                                "rating": 4.2,
                                "distance": 0.5
                            }
                        ],
                        "total": 8
                    }
                }
            }
            
            return mock_results.get(function_name, {
                "success": True,
                "result": {"message": f"Function {function_name} executed successfully"}
            })
            
        except Exception as e:
            logger.error(f"Error executing function {function_name}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "result": None
            }


# Global service instance
gemini_service = GeminiAIService()