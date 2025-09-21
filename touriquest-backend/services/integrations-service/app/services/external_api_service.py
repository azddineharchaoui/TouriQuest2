"""
External API service integrations (weather, currency, translation, AI, social media)
"""

import asyncio
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
import json

import aiohttp
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.integration_models import WeatherCache, CurrencyRate, TranslationCache
from app.services.base import BaseIntegrationService

logger = logging.getLogger(__name__)


class OpenWeatherService(BaseIntegrationService):
    """OpenWeatherMap API integration"""
    
    def __init__(self):
        super().__init__("openweather")
        self.api_key = settings.OPENWEATHER_API_KEY
        self.base_url = "https://api.openweathermap.org/data/2.5"
    
    async def _execute_request(
        self,
        endpoint: str,
        method: str,
        data: Optional[Dict[str, Any]],
        headers: Optional[Dict[str, str]],
        timeout: int
    ) -> Dict[str, Any]:
        """Execute OpenWeather API request"""
        url = f"{self.base_url}/{endpoint}"
        
        # Add API key to params
        params = data or {}
        params["appid"] = self.api_key
        
        async with aiohttp.ClientSession() as session:
            async with session.request(
                method,
                url,
                params=params,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=timeout)
            ) as response:
                response_data = await response.json()
                
                if response.status != 200:
                    raise Exception(f"API request failed: {response_data}")
                
                return response_data
    
    async def get_current_weather(
        self,
        city: Optional[str] = None,
        lat: Optional[float] = None,
        lon: Optional[float] = None,
        units: str = "metric"
    ) -> Dict[str, Any]:
        """Get current weather data"""
        try:
            # Check cache first
            cache_key = city or f"{lat},{lon}"
            cached_result = await self._get_cached_weather(cache_key)
            if cached_result:
                return cached_result
            
            params = {"units": units}
            
            if city:
                params["q"] = city
            elif lat is not None and lon is not None:
                params["lat"] = lat
                params["lon"] = lon
            else:
                raise ValueError("Either city or coordinates must be provided")
            
            response_data = await self.make_api_request(
                endpoint="weather",
                data=params
            )
            
            weather_data = {
                "location": response_data.get("name"),
                "country": response_data.get("sys", {}).get("country"),
                "temperature": response_data.get("main", {}).get("temp"),
                "feels_like": response_data.get("main", {}).get("feels_like"),
                "humidity": response_data.get("main", {}).get("humidity"),
                "pressure": response_data.get("main", {}).get("pressure"),
                "description": response_data.get("weather", [{}])[0].get("description"),
                "icon": response_data.get("weather", [{}])[0].get("icon"),
                "wind_speed": response_data.get("wind", {}).get("speed"),
                "wind_direction": response_data.get("wind", {}).get("deg"),
                "visibility": response_data.get("visibility"),
                "timestamp": datetime.utcnow().isoformat()
            }
            
            # Cache the result
            await self._cache_weather(cache_key, weather_data)
            
            # Record cost
            await self.record_cost(
                cost_type="current_weather",
                amount=0.0025,  # $0.0025 per request
                quantity=1
            )
            
            return weather_data
            
        except Exception as e:
            logger.error(f"OpenWeather current weather error: {e}")
            raise
    
    async def get_forecast(
        self,
        city: Optional[str] = None,
        lat: Optional[float] = None,
        lon: Optional[float] = None,
        units: str = "metric",
        days: int = 5
    ) -> Dict[str, Any]:
        """Get weather forecast"""
        try:
            params = {"units": units}
            
            if city:
                params["q"] = city
            elif lat is not None and lon is not None:
                params["lat"] = lat
                params["lon"] = lon
            else:
                raise ValueError("Either city or coordinates must be provided")
            
            response_data = await self.make_api_request(
                endpoint="forecast",
                data=params
            )
            
            # Process forecast data
            forecast_list = response_data.get("list", [])[:days * 8]  # 8 forecasts per day (3-hour intervals)
            
            forecast_data = {
                "location": response_data.get("city", {}).get("name"),
                "country": response_data.get("city", {}).get("country"),
                "forecasts": [
                    {
                        "datetime": forecast.get("dt_txt"),
                        "temperature": forecast.get("main", {}).get("temp"),
                        "feels_like": forecast.get("main", {}).get("feels_like"),
                        "humidity": forecast.get("main", {}).get("humidity"),
                        "description": forecast.get("weather", [{}])[0].get("description"),
                        "icon": forecast.get("weather", [{}])[0].get("icon"),
                        "wind_speed": forecast.get("wind", {}).get("speed"),
                        "precipitation": forecast.get("rain", {}).get("3h", 0) + forecast.get("snow", {}).get("3h", 0)
                    }
                    for forecast in forecast_list
                ]
            }
            
            # Record cost
            await self.record_cost(
                cost_type="weather_forecast",
                amount=0.0025,  # $0.0025 per request
                quantity=1
            )
            
            return forecast_data
            
        except Exception as e:
            logger.error(f"OpenWeather forecast error: {e}")
            raise
    
    async def _get_cached_weather(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """Get cached weather data"""
        try:
            async with AsyncSessionLocal() as session:
                stmt = select(WeatherCache).where(
                    WeatherCache.location == cache_key,
                    WeatherCache.provider == "openweather"
                )
                result = await session.execute(stmt)
                cache_entry = result.scalar_one_or_none()
                
                if cache_entry and cache_entry.expires_at > datetime.utcnow():
                    return cache_entry.weather_data
                
                return None
                
        except Exception as e:
            logger.error(f"Error getting cached weather: {e}")
            return None
    
    async def _cache_weather(self, cache_key: str, data: Dict[str, Any]):
        """Cache weather data"""
        try:
            async with AsyncSessionLocal() as session:
                # Weather data expires in 10 minutes
                expires_at = datetime.utcnow() + timedelta(minutes=10)
                
                cache_entry = WeatherCache(
                    location=cache_key,
                    weather_data=data,
                    provider="openweather",
                    expires_at=expires_at
                )
                
                session.add(cache_entry)
                await session.commit()
                
        except Exception as e:
            logger.error(f"Error caching weather: {e}")
    
    async def _perform_health_check(self) -> Dict[str, Any]:
        """Perform OpenWeather health check"""
        try:
            await self.get_current_weather(city="London")
            return {"api_key_valid": True, "service": "available"}
        except Exception as e:
            return {"api_key_valid": False, "service": "unavailable", "error": str(e)}


class ExchangeRateService(BaseIntegrationService):
    """Exchange rate API integration"""
    
    def __init__(self):
        super().__init__("exchangerate")
        self.api_key = settings.EXCHANGERATE_API_KEY
        self.base_url = "https://v6.exchangerate-api.com/v6"
    
    async def _execute_request(
        self,
        endpoint: str,
        method: str,
        data: Optional[Dict[str, Any]],
        headers: Optional[Dict[str, str]],
        timeout: int
    ) -> Dict[str, Any]:
        """Execute ExchangeRate API request"""
        url = f"{self.base_url}/{self.api_key}/{endpoint}"
        
        async with aiohttp.ClientSession() as session:
            async with session.request(
                method,
                url,
                params=data if method == "GET" else None,
                json=data if method == "POST" else None,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=timeout)
            ) as response:
                response_data = await response.json()
                
                if response.status != 200:
                    raise Exception(f"API request failed: {response_data}")
                
                if response_data.get("result") != "success":
                    raise Exception(f"Exchange rate API error: {response_data.get('error-type')}")
                
                return response_data
    
    async def get_exchange_rates(self, base_currency: str = "USD") -> Dict[str, Any]:
        """Get current exchange rates"""
        try:
            # Check cache first
            cached_rates = await self._get_cached_rates(base_currency)
            if cached_rates:
                return cached_rates
            
            response_data = await self.make_api_request(
                endpoint=f"latest/{base_currency}"
            )
            
            rates_data = {
                "base_currency": base_currency,
                "rates": response_data.get("conversion_rates", {}),
                "last_updated": response_data.get("time_last_update_utc"),
                "next_update": response_data.get("time_next_update_utc")
            }
            
            # Cache the result
            await self._cache_rates(base_currency, rates_data)
            
            # Record cost
            await self.record_cost(
                cost_type="exchange_rates",
                amount=0.01,  # $0.01 per request
                quantity=1
            )
            
            return rates_data
            
        except Exception as e:
            logger.error(f"Exchange rate error: {e}")
            raise
    
    async def convert_currency(
        self,
        amount: float,
        from_currency: str,
        to_currency: str
    ) -> Dict[str, Any]:
        """Convert currency amount"""
        try:
            response_data = await self.make_api_request(
                endpoint=f"pair/{from_currency}/{to_currency}/{amount}"
            )
            
            conversion_data = {
                "from_currency": from_currency,
                "to_currency": to_currency,
                "original_amount": amount,
                "converted_amount": response_data.get("conversion_result"),
                "exchange_rate": response_data.get("conversion_rate"),
                "timestamp": datetime.utcnow().isoformat()
            }
            
            # Record cost
            await self.record_cost(
                cost_type="currency_conversion",
                amount=0.01,  # $0.01 per request
                quantity=1
            )
            
            return conversion_data
            
        except Exception as e:
            logger.error(f"Currency conversion error: {e}")
            raise
    
    async def _get_cached_rates(self, base_currency: str) -> Optional[Dict[str, Any]]:
        """Get cached exchange rates"""
        try:
            async with AsyncSessionLocal() as session:
                stmt = select(CurrencyRate).where(
                    CurrencyRate.base_currency == base_currency,
                    CurrencyRate.provider == "exchangerate"
                )
                result = await session.execute(stmt)
                cache_entry = result.scalar_one_or_none()
                
                if cache_entry and cache_entry.expires_at > datetime.utcnow():
                    return {
                        "base_currency": base_currency,
                        "rates": cache_entry.rates,
                        "cached": True
                    }
                
                return None
                
        except Exception as e:
            logger.error(f"Error getting cached rates: {e}")
            return None
    
    async def _cache_rates(self, base_currency: str, data: Dict[str, Any]):
        """Cache exchange rates"""
        try:
            async with AsyncSessionLocal() as session:
                # Rates expire in 1 hour
                expires_at = datetime.utcnow() + timedelta(hours=1)
                
                cache_entry = CurrencyRate(
                    base_currency=base_currency,
                    target_currency="ALL",
                    rate=1.0,  # Base rate
                    rates=data.get("rates", {}),
                    provider="exchangerate",
                    expires_at=expires_at
                )
                
                session.add(cache_entry)
                await session.commit()
                
        except Exception as e:
            logger.error(f"Error caching rates: {e}")
    
    async def _perform_health_check(self) -> Dict[str, Any]:
        """Perform exchange rate health check"""
        try:
            await self.get_exchange_rates("USD")
            return {"api_key_valid": True, "service": "available"}
        except Exception as e:
            return {"api_key_valid": False, "service": "unavailable", "error": str(e)}


class GoogleTranslateService(BaseIntegrationService):
    """Google Translate API integration"""
    
    def __init__(self):
        super().__init__("google_translate")
        self.api_key = settings.GOOGLE_TRANSLATE_API_KEY
        self.base_url = "https://translation.googleapis.com/language/translate/v2"
    
    async def _execute_request(
        self,
        endpoint: str,
        method: str,
        data: Optional[Dict[str, Any]],
        headers: Optional[Dict[str, str]],
        timeout: int
    ) -> Dict[str, Any]:
        """Execute Google Translate API request"""
        url = f"{self.base_url}/{endpoint}" if endpoint else self.base_url
        
        # Add API key to params
        params = data or {}
        params["key"] = self.api_key
        
        async with aiohttp.ClientSession() as session:
            async with session.request(
                method,
                url,
                params=params if method == "GET" else None,
                data=params if method == "POST" else None,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=timeout)
            ) as response:
                response_data = await response.json()
                
                if response.status != 200:
                    raise Exception(f"API request failed: {response_data}")
                
                return response_data
    
    async def translate_text(
        self,
        text: str,
        target_language: str,
        source_language: Optional[str] = None
    ) -> Dict[str, Any]:
        """Translate text"""
        try:
            # Check cache first
            cache_key = f"{text}:{source_language or 'auto'}:{target_language}"
            cached_result = await self._get_cached_translation(cache_key)
            if cached_result:
                return cached_result
            
            params = {
                "q": text,
                "target": target_language
            }
            
            if source_language:
                params["source"] = source_language
            
            response_data = await self.make_api_request(
                endpoint="",
                method="POST",
                data=params
            )
            
            translation_data = response_data.get("data", {})
            translations = translation_data.get("translations", [])
            
            if not translations:
                raise Exception("No translation returned")
            
            translation = translations[0]
            
            result = {
                "original_text": text,
                "translated_text": translation.get("translatedText"),
                "source_language": translation.get("detectedSourceLanguage") or source_language,
                "target_language": target_language,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            # Cache the result
            await self._cache_translation(cache_key, result)
            
            # Record cost (approximate)
            char_count = len(text)
            await self.record_cost(
                cost_type="translation",
                amount=0.00002 * char_count,  # $20 per 1M characters
                quantity=char_count
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Google Translate error: {e}")
            raise
    
    async def detect_language(self, text: str) -> Dict[str, Any]:
        """Detect language of text"""
        try:
            response_data = await self.make_api_request(
                endpoint="detect",
                method="POST",
                data={"q": text}
            )
            
            detection_data = response_data.get("data", {})
            detections = detection_data.get("detections", [])
            
            if not detections or not detections[0]:
                raise Exception("No language detection returned")
            
            detection = detections[0][0]
            
            return {
                "text": text,
                "language": detection.get("language"),
                "confidence": detection.get("confidence"),
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Language detection error: {e}")
            raise
    
    async def get_supported_languages(self, target_language: str = "en") -> Dict[str, Any]:
        """Get supported languages"""
        try:
            response_data = await self.make_api_request(
                endpoint="languages",
                data={"target": target_language}
            )
            
            languages_data = response_data.get("data", {})
            languages = languages_data.get("languages", [])
            
            return {
                "supported_languages": languages,
                "count": len(languages),
                "target_language": target_language
            }
            
        except Exception as e:
            logger.error(f"Get supported languages error: {e}")
            raise
    
    async def _get_cached_translation(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """Get cached translation"""
        try:
            async with AsyncSessionLocal() as session:
                stmt = select(TranslationCache).where(
                    TranslationCache.cache_key == cache_key,
                    TranslationCache.provider == "google_translate"
                )
                result = await session.execute(stmt)
                cache_entry = result.scalar_one_or_none()
                
                if cache_entry and cache_entry.expires_at > datetime.utcnow():
                    return {
                        "original_text": cache_entry.original_text,
                        "translated_text": cache_entry.translated_text,
                        "source_language": cache_entry.source_language,
                        "target_language": cache_entry.target_language,
                        "cached": True
                    }
                
                return None
                
        except Exception as e:
            logger.error(f"Error getting cached translation: {e}")
            return None
    
    async def _cache_translation(self, cache_key: str, data: Dict[str, Any]):
        """Cache translation result"""
        try:
            async with AsyncSessionLocal() as session:
                # Translations expire in 24 hours
                expires_at = datetime.utcnow() + timedelta(hours=24)
                
                cache_entry = TranslationCache(
                    cache_key=cache_key,
                    original_text=data["original_text"],
                    translated_text=data["translated_text"],
                    source_language=data["source_language"],
                    target_language=data["target_language"],
                    provider="google_translate",
                    expires_at=expires_at
                )
                
                session.add(cache_entry)
                await session.commit()
                
        except Exception as e:
            logger.error(f"Error caching translation: {e}")
    
    async def _perform_health_check(self) -> Dict[str, Any]:
        """Perform Google Translate health check"""
        try:
            result = await self.translate_text("Hello", "es")
            return {
                "api_key_valid": True,
                "service": "available",
                "test_translation": result.get("translated_text")
            }
        except Exception as e:
            return {"api_key_valid": False, "service": "unavailable", "error": str(e)}


class OpenAIService(BaseIntegrationService):
    """OpenAI API integration"""
    
    def __init__(self):
        super().__init__("openai")
        self.api_key = settings.OPENAI_API_KEY
        self.base_url = "https://api.openai.com/v1"
    
    async def _execute_request(
        self,
        endpoint: str,
        method: str,
        data: Optional[Dict[str, Any]],
        headers: Optional[Dict[str, str]],
        timeout: int
    ) -> Dict[str, Any]:
        """Execute OpenAI API request"""
        url = f"{self.base_url}/{endpoint}"
        
        default_headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        if headers:
            default_headers.update(headers)
        
        async with aiohttp.ClientSession() as session:
            async with session.request(
                method,
                url,
                json=data if method in ["POST", "PUT", "PATCH"] else None,
                params=data if method == "GET" else None,
                headers=default_headers,
                timeout=aiohttp.ClientTimeout(total=timeout)
            ) as response:
                response_data = await response.json()
                
                if response.status not in [200, 201]:
                    raise Exception(f"API request failed: {response_data}")
                
                return response_data
    
    async def generate_completion(
        self,
        prompt: str,
        model: str = "gpt-3.5-turbo",
        max_tokens: int = 150,
        temperature: float = 0.7
    ) -> Dict[str, Any]:
        """Generate text completion"""
        try:
            completion_data = {
                "model": model,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": max_tokens,
                "temperature": temperature
            }
            
            response_data = await self.make_api_request(
                endpoint="chat/completions",
                method="POST",
                data=completion_data
            )
            
            choice = response_data.get("choices", [{}])[0]
            usage = response_data.get("usage", {})
            
            result = {
                "prompt": prompt,
                "completion": choice.get("message", {}).get("content"),
                "model": model,
                "tokens_used": usage.get("total_tokens"),
                "timestamp": datetime.utcnow().isoformat()
            }
            
            # Record cost based on tokens
            await self.record_cost(
                cost_type="text_generation",
                amount=0.002 * (usage.get("total_tokens", 0) / 1000),  # $0.002 per 1K tokens
                quantity=usage.get("total_tokens", 0)
            )
            
            return result
            
        except Exception as e:
            logger.error(f"OpenAI completion error: {e}")
            raise
    
    async def generate_embeddings(
        self,
        text: str,
        model: str = "text-embedding-ada-002"
    ) -> Dict[str, Any]:
        """Generate text embeddings"""
        try:
            embedding_data = {
                "model": model,
                "input": text
            }
            
            response_data = await self.make_api_request(
                endpoint="embeddings",
                method="POST",
                data=embedding_data
            )
            
            embedding = response_data.get("data", [{}])[0]
            usage = response_data.get("usage", {})
            
            result = {
                "text": text,
                "embedding": embedding.get("embedding"),
                "model": model,
                "tokens_used": usage.get("total_tokens"),
                "timestamp": datetime.utcnow().isoformat()
            }
            
            # Record cost
            await self.record_cost(
                cost_type="embeddings",
                amount=0.0001 * (usage.get("total_tokens", 0) / 1000),  # $0.0001 per 1K tokens
                quantity=usage.get("total_tokens", 0)
            )
            
            return result
            
        except Exception as e:
            logger.error(f"OpenAI embeddings error: {e}")
            raise
    
    async def _perform_health_check(self) -> Dict[str, Any]:
        """Perform OpenAI health check"""
        try:
            # Test with a simple completion
            result = await self.generate_completion("Hello", max_tokens=5)
            return {
                "api_key_valid": True,
                "service": "available",
                "test_response": result.get("completion")
            }
        except Exception as e:
            return {"api_key_valid": False, "service": "unavailable", "error": str(e)}


class ExternalAPIService:
    """Unified external API service"""
    
    def __init__(self):
        self.weather = OpenWeatherService()
        self.currency = ExchangeRateService()
        self.translate = GoogleTranslateService()
        self.ai = OpenAIService()
    
    async def initialize(self):
        """Initialize all external API services"""
        await self.weather.initialize()
        await self.currency.initialize()
        await self.translate.initialize()
        await self.ai.initialize()
    
    async def health_check(self) -> Dict[str, Any]:
        """Check health of all external API services"""
        weather_health = await self.weather.health_check()
        currency_health = await self.currency.health_check()
        translate_health = await self.translate.health_check()
        ai_health = await self.ai.health_check()
        
        return {
            "weather": weather_health,
            "currency": currency_health,
            "translation": translate_health,
            "ai": ai_health,
            "overall_status": "healthy" if any([
                weather_health.get("status") == "healthy",
                currency_health.get("status") == "healthy",
                translate_health.get("status") == "healthy",
                ai_health.get("status") == "healthy"
            ]) else "unhealthy"
        }