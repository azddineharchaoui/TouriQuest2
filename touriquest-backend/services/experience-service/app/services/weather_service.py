"""
Weather service for outdoor experience planning
"""

from typing import Optional, Dict, Any, List
from datetime import date, datetime, timedelta
import asyncio
import aiohttp
import json
from dataclasses import dataclass

from app.core.config import settings


@dataclass
class WeatherForecast:
    """Weather forecast data structure"""
    date: date
    temperature_min: float
    temperature_max: float
    temperature_avg: float
    humidity: float
    precipitation_chance: float
    precipitation_amount: float
    wind_speed: float
    wind_direction: str
    weather_condition: str
    weather_description: str
    visibility: float
    uv_index: float
    air_quality_index: Optional[int] = None
    sunrise: Optional[datetime] = None
    sunset: Optional[datetime] = None


@dataclass
class WeatherAlert:
    """Weather alert data structure"""
    alert_type: str
    severity: str
    title: str
    description: str
    start_time: datetime
    end_time: datetime
    areas: List[str]


class WeatherService:
    """Service for weather data and outdoor activity planning"""
    
    def __init__(self):
        self.api_key = settings.WEATHER_API_KEY
        self.base_url = "https://api.openweathermap.org/data/2.5"
        self.session = None
    
    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create aiohttp session"""
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession()
        return self.session
    
    async def close(self):
        """Close aiohttp session"""
        if self.session and not self.session.closed:
            await self.session.close()
    
    async def get_current_weather(
        self,
        latitude: float,
        longitude: float
    ) -> Optional[Dict[str, Any]]:
        """Get current weather conditions"""
        try:
            session = await self._get_session()
            url = f"{self.base_url}/weather"
            params = {
                "lat": latitude,
                "lon": longitude,
                "appid": self.api_key,
                "units": "metric"
            }
            
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    return self._parse_current_weather(data)
                
        except Exception as e:
            print(f"Error fetching current weather: {e}")
        
        return None
    
    async def get_weather_forecast(
        self,
        latitude: float,
        longitude: float,
        date: date,
        days: int = 1
    ) -> Optional[WeatherForecast]:
        """Get weather forecast for specific date"""
        try:
            session = await self._get_session()
            url = f"{self.base_url}/forecast"
            params = {
                "lat": latitude,
                "lon": longitude,
                "appid": self.api_key,
                "units": "metric",
                "cnt": 40  # 5-day forecast with 3-hour intervals
            }
            
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    return self._parse_forecast_for_date(data, date)
                
        except Exception as e:
            print(f"Error fetching weather forecast: {e}")
        
        return None
    
    async def get_extended_forecast(
        self,
        latitude: float,
        longitude: float,
        days: int = 7
    ) -> List[WeatherForecast]:
        """Get extended weather forecast"""
        try:
            # Use One Call API for better extended forecast
            session = await self._get_session()
            url = "https://api.openweathermap.org/data/3.0/onecall"
            params = {
                "lat": latitude,
                "lon": longitude,
                "appid": self.api_key,
                "units": "metric",
                "exclude": "minutely,alerts"
            }
            
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    return self._parse_extended_forecast(data, days)
                
        except Exception as e:
            print(f"Error fetching extended forecast: {e}")
        
        return []
    
    async def get_weather_alerts(
        self,
        latitude: float,
        longitude: float
    ) -> List[WeatherAlert]:
        """Get weather alerts for location"""
        try:
            session = await self._get_session()
            url = "https://api.openweathermap.org/data/3.0/onecall"
            params = {
                "lat": latitude,
                "lon": longitude,
                "appid": self.api_key,
                "exclude": "current,minutely,hourly,daily"
            }
            
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    return self._parse_weather_alerts(data)
                
        except Exception as e:
            print(f"Error fetching weather alerts: {e}")
        
        return []
    
    def assess_outdoor_activity_suitability(
        self,
        weather: WeatherForecast,
        activity_type: str
    ) -> Dict[str, Any]:
        """
        Assess weather suitability for outdoor activities
        
        Args:
            weather: Weather forecast data
            activity_type: Type of outdoor activity
            
        Returns:
            Dictionary with suitability assessment
        """
        assessment = {
            "suitable": False,
            "score": 0.0,
            "warnings": [],
            "recommendations": [],
            "risk_level": "low"
        }
        
        # Activity-specific assessment
        if activity_type.lower() in ["hiking", "trekking", "walking"]:
            assessment = self._assess_hiking_conditions(weather)
        elif activity_type.lower() in ["photography", "sightseeing"]:
            assessment = self._assess_photography_conditions(weather)
        elif activity_type.lower() in ["water_sports", "swimming", "boating"]:
            assessment = self._assess_water_activity_conditions(weather)
        elif activity_type.lower() in ["cycling", "biking"]:
            assessment = self._assess_cycling_conditions(weather)
        elif activity_type.lower() in ["outdoor_dining", "picnic"]:
            assessment = self._assess_outdoor_dining_conditions(weather)
        else:
            assessment = self._assess_general_outdoor_conditions(weather)
        
        return assessment
    
    def _parse_current_weather(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Parse current weather response"""
        weather = data.get("weather", [{}])[0]
        main = data.get("main", {})
        wind = data.get("wind", {})
        
        return {
            "temperature": main.get("temp"),
            "feels_like": main.get("feels_like"),
            "humidity": main.get("humidity"),
            "pressure": main.get("pressure"),
            "visibility": data.get("visibility", 0) / 1000,  # Convert to km
            "wind_speed": wind.get("speed"),
            "wind_direction": self._wind_direction_from_degrees(wind.get("deg", 0)),
            "weather_condition": weather.get("main"),
            "weather_description": weather.get("description"),
            "timestamp": datetime.utcnow()
        }
    
    def _parse_forecast_for_date(
        self,
        data: Dict[str, Any],
        target_date: date
    ) -> Optional[WeatherForecast]:
        """Parse forecast data for specific date"""
        forecasts = data.get("list", [])
        
        # Find forecasts for the target date
        target_forecasts = []
        for forecast in forecasts:
            forecast_date = datetime.fromtimestamp(forecast["dt"]).date()
            if forecast_date == target_date:
                target_forecasts.append(forecast)
        
        if not target_forecasts:
            return None
        
        # Aggregate data for the day
        temps = [f["main"]["temp"] for f in target_forecasts]
        humidity_values = [f["main"]["humidity"] for f in target_forecasts]
        wind_speeds = [f["wind"]["speed"] for f in target_forecasts]
        
        # Get precipitation data
        precipitation = 0.0
        precipitation_chance = 0.0
        for f in target_forecasts:
            if "rain" in f:
                precipitation += f["rain"].get("3h", 0)
            if "snow" in f:
                precipitation += f["snow"].get("3h", 0)
            # Estimate precipitation chance from weather conditions
            weather_main = f["weather"][0]["main"].lower()
            if weather_main in ["rain", "drizzle", "thunderstorm"]:
                precipitation_chance = max(precipitation_chance, 0.8)
            elif weather_main in ["clouds"]:
                precipitation_chance = max(precipitation_chance, 0.3)
        
        # Use midday forecast for general conditions
        midday_forecast = target_forecasts[len(target_forecasts) // 2]
        weather = midday_forecast["weather"][0]
        
        return WeatherForecast(
            date=target_date,
            temperature_min=min(temps),
            temperature_max=max(temps),
            temperature_avg=sum(temps) / len(temps),
            humidity=sum(humidity_values) / len(humidity_values),
            precipitation_chance=precipitation_chance,
            precipitation_amount=precipitation,
            wind_speed=sum(wind_speeds) / len(wind_speeds),
            wind_direction=self._wind_direction_from_degrees(
                midday_forecast["wind"].get("deg", 0)
            ),
            weather_condition=weather["main"],
            weather_description=weather["description"],
            visibility=10.0,  # Default visibility
            uv_index=0.0  # Not available in 5-day forecast
        )
    
    def _parse_extended_forecast(
        self,
        data: Dict[str, Any],
        days: int
    ) -> List[WeatherForecast]:
        """Parse extended forecast data"""
        daily_forecasts = data.get("daily", [])[:days]
        forecasts = []
        
        for day_data in daily_forecasts:
            forecast_date = datetime.fromtimestamp(day_data["dt"]).date()
            temp = day_data["temp"]
            weather = day_data["weather"][0]
            
            forecast = WeatherForecast(
                date=forecast_date,
                temperature_min=temp["min"],
                temperature_max=temp["max"],
                temperature_avg=(temp["min"] + temp["max"]) / 2,
                humidity=day_data["humidity"],
                precipitation_chance=day_data.get("pop", 0.0),
                precipitation_amount=day_data.get("rain", {}).get("1h", 0) + 
                                  day_data.get("snow", {}).get("1h", 0),
                wind_speed=day_data["wind_speed"],
                wind_direction=self._wind_direction_from_degrees(day_data["wind_deg"]),
                weather_condition=weather["main"],
                weather_description=weather["description"],
                visibility=10.0,  # Default
                uv_index=day_data.get("uvi", 0.0),
                sunrise=datetime.fromtimestamp(day_data["sunrise"]),
                sunset=datetime.fromtimestamp(day_data["sunset"])
            )
            forecasts.append(forecast)
        
        return forecasts
    
    def _parse_weather_alerts(self, data: Dict[str, Any]) -> List[WeatherAlert]:
        """Parse weather alerts"""
        alerts_data = data.get("alerts", [])
        alerts = []
        
        for alert_data in alerts_data:
            alert = WeatherAlert(
                alert_type=alert_data.get("event", ""),
                severity=alert_data.get("severity", "minor"),
                title=alert_data.get("event", "Weather Alert"),
                description=alert_data.get("description", ""),
                start_time=datetime.fromtimestamp(alert_data["start"]),
                end_time=datetime.fromtimestamp(alert_data["end"]),
                areas=alert_data.get("areas", [])
            )
            alerts.append(alert)
        
        return alerts
    
    def _wind_direction_from_degrees(self, degrees: float) -> str:
        """Convert wind degrees to direction"""
        directions = [
            "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
            "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"
        ]
        index = int((degrees + 11.25) / 22.5) % 16
        return directions[index]
    
    def _assess_hiking_conditions(self, weather: WeatherForecast) -> Dict[str, Any]:
        """Assess weather conditions for hiking"""
        assessment = {
            "suitable": True,
            "score": 1.0,
            "warnings": [],
            "recommendations": [],
            "risk_level": "low"
        }
        
        # Temperature assessment
        if weather.temperature_max > 35:
            assessment["warnings"].append("Very hot conditions - heat exhaustion risk")
            assessment["score"] -= 0.3
            assessment["risk_level"] = "high"
        elif weather.temperature_max > 30:
            assessment["warnings"].append("Hot conditions - stay hydrated")
            assessment["score"] -= 0.1
            assessment["risk_level"] = "medium"
        elif weather.temperature_min < 0:
            assessment["warnings"].append("Freezing conditions - hypothermia risk")
            assessment["score"] -= 0.2
            assessment["risk_level"] = "high"
        elif weather.temperature_min < 5:
            assessment["warnings"].append("Cold conditions - dress warmly")
            assessment["score"] -= 0.1
        
        # Precipitation assessment
        if weather.precipitation_chance > 0.7:
            assessment["warnings"].append("High chance of rain - trails may be slippery")
            assessment["score"] -= 0.3
            if assessment["risk_level"] == "low":
                assessment["risk_level"] = "medium"
        elif weather.precipitation_chance > 0.4:
            assessment["warnings"].append("Possible rain - bring rain gear")
            assessment["score"] -= 0.1
        
        # Wind assessment
        if weather.wind_speed > 15:
            assessment["warnings"].append("Strong winds - exposed areas may be dangerous")
            assessment["score"] -= 0.2
            assessment["risk_level"] = "high"
        elif weather.wind_speed > 10:
            assessment["warnings"].append("Moderate winds - be cautious on ridges")
            assessment["score"] -= 0.1
        
        # Visibility assessment
        if weather.visibility < 1:
            assessment["warnings"].append("Poor visibility - navigation may be difficult")
            assessment["score"] -= 0.4
            assessment["risk_level"] = "high"
        elif weather.visibility < 3:
            assessment["warnings"].append("Reduced visibility - stay on marked trails")
            assessment["score"] -= 0.2
        
        # Weather condition specific
        if weather.weather_condition.lower() in ["thunderstorm"]:
            assessment["warnings"].append("Thunderstorm risk - avoid exposed areas")
            assessment["score"] -= 0.5
            assessment["risk_level"] = "high"
        
        # Recommendations
        if weather.temperature_max > 25:
            assessment["recommendations"].append("Start early to avoid midday heat")
            assessment["recommendations"].append("Bring extra water")
        
        if weather.precipitation_chance > 0.3:
            assessment["recommendations"].append("Bring waterproof gear")
        
        if weather.wind_speed > 8:
            assessment["recommendations"].append("Bring windproof layer")
        
        # Final suitability
        assessment["suitable"] = assessment["score"] > 0.3
        assessment["score"] = max(0.0, min(1.0, assessment["score"]))
        
        return assessment
    
    def _assess_photography_conditions(self, weather: WeatherForecast) -> Dict[str, Any]:
        """Assess weather conditions for photography"""
        assessment = {
            "suitable": True,
            "score": 1.0,
            "warnings": [],
            "recommendations": [],
            "risk_level": "low"
        }
        
        # Light conditions assessment
        if weather.weather_condition.lower() in ["clear", "few clouds"]:
            assessment["recommendations"].append("Great light for landscape photography")
        elif weather.weather_condition.lower() in ["scattered clouds", "broken clouds"]:
            assessment["recommendations"].append("Excellent for dramatic sky shots")
            assessment["score"] += 0.1  # Clouds can improve photos
        elif weather.weather_condition.lower() in ["overcast"]:
            assessment["recommendations"].append("Good for portraits and soft lighting")
        elif weather.weather_condition.lower() in ["fog", "mist"]:
            assessment["recommendations"].append("Perfect for moody atmospheric shots")
            assessment["score"] += 0.1
        
        # Precipitation assessment
        if weather.precipitation_chance > 0.7:
            assessment["warnings"].append("High chance of rain - protect equipment")
            assessment["score"] -= 0.2
        elif weather.precipitation_chance > 0.4:
            assessment["warnings"].append("Possible rain - bring weather protection")
        
        # Wind assessment (camera stability)
        if weather.wind_speed > 12:
            assessment["warnings"].append("Strong winds - tripod stability issues")
            assessment["score"] -= 0.2
        elif weather.wind_speed > 8:
            assessment["recommendations"].append("Bring heavy tripod for stability")
        
        # Temperature effects on equipment
        if weather.temperature_min < 0:
            assessment["warnings"].append("Freezing - battery life reduced")
            assessment["recommendations"].append("Keep spare batteries warm")
        elif weather.temperature_max > 35:
            assessment["warnings"].append("Very hot - equipment overheating risk")
            assessment["recommendations"].append("Keep equipment in shade when possible")
        
        # Visibility
        if weather.visibility < 5:
            assessment["warnings"].append("Poor visibility limits landscape shots")
            assessment["score"] -= 0.3
        
        assessment["suitable"] = assessment["score"] > 0.2
        assessment["score"] = max(0.0, min(1.0, assessment["score"]))
        
        return assessment
    
    def _assess_water_activity_conditions(self, weather: WeatherForecast) -> Dict[str, Any]:
        """Assess weather conditions for water activities"""
        assessment = {
            "suitable": True,
            "score": 1.0,
            "warnings": [],
            "recommendations": [],
            "risk_level": "low"
        }
        
        # Temperature assessment
        if weather.temperature_max < 15:
            assessment["warnings"].append("Cold conditions - hypothermia risk in water")
            assessment["score"] -= 0.4
            assessment["risk_level"] = "high"
        elif weather.temperature_max < 20:
            assessment["warnings"].append("Cool conditions - consider wetsuit")
            assessment["score"] -= 0.2
            assessment["risk_level"] = "medium"
        
        # Wind and wave conditions
        if weather.wind_speed > 20:
            assessment["warnings"].append("Very strong winds - dangerous conditions")
            assessment["score"] -= 0.6
            assessment["risk_level"] = "high"
            assessment["suitable"] = False
        elif weather.wind_speed > 12:
            assessment["warnings"].append("Strong winds - rough water conditions")
            assessment["score"] -= 0.3
            assessment["risk_level"] = "medium"
        elif weather.wind_speed > 8:
            assessment["warnings"].append("Moderate winds - choppy conditions")
            assessment["score"] -= 0.1
        
        # Storm conditions
        if weather.weather_condition.lower() in ["thunderstorm"]:
            assessment["warnings"].append("Thunderstorm - extremely dangerous on water")
            assessment["score"] = 0.0
            assessment["suitable"] = False
            assessment["risk_level"] = "high"
        
        # Precipitation
        if weather.precipitation_chance > 0.7:
            assessment["warnings"].append("Heavy rain expected - poor visibility")
            assessment["score"] -= 0.2
        
        # Visibility
        if weather.visibility < 2:
            assessment["warnings"].append("Very poor visibility - navigation hazardous")
            assessment["score"] -= 0.4
            assessment["risk_level"] = "high"
        
        assessment["suitable"] = assessment["score"] > 0.3
        assessment["score"] = max(0.0, min(1.0, assessment["score"]))
        
        return assessment
    
    def _assess_cycling_conditions(self, weather: WeatherForecast) -> Dict[str, Any]:
        """Assess weather conditions for cycling"""
        assessment = {
            "suitable": True,
            "score": 1.0,
            "warnings": [],
            "recommendations": [],
            "risk_level": "low"
        }
        
        # Temperature assessment
        if weather.temperature_max > 35:
            assessment["warnings"].append("Very hot - heat exhaustion risk")
            assessment["score"] -= 0.3
            assessment["risk_level"] = "medium"
        elif weather.temperature_min < 0:
            assessment["warnings"].append("Freezing conditions - icy roads risk")
            assessment["score"] -= 0.3
            assessment["risk_level"] = "high"
        
        # Precipitation assessment
        if weather.precipitation_chance > 0.7:
            assessment["warnings"].append("High chance of rain - slippery roads")
            assessment["score"] -= 0.4
            assessment["risk_level"] = "medium"
        elif weather.precipitation_chance > 0.4:
            assessment["warnings"].append("Possible rain - reduced traction")
            assessment["score"] -= 0.2
        
        # Wind assessment (especially headwinds)
        if weather.wind_speed > 15:
            assessment["warnings"].append("Strong winds - difficult cycling conditions")
            assessment["score"] -= 0.3
        elif weather.wind_speed > 10:
            assessment["warnings"].append("Moderate winds - increased effort required")
            assessment["score"] -= 0.1
        
        # Visibility
        if weather.visibility < 3:
            assessment["warnings"].append("Poor visibility - traffic safety risk")
            assessment["score"] -= 0.3
            assessment["risk_level"] = "medium"
        
        assessment["suitable"] = assessment["score"] > 0.3
        assessment["score"] = max(0.0, min(1.0, assessment["score"]))
        
        return assessment
    
    def _assess_outdoor_dining_conditions(self, weather: WeatherForecast) -> Dict[str, Any]:
        """Assess weather conditions for outdoor dining"""
        assessment = {
            "suitable": True,
            "score": 1.0,
            "warnings": [],
            "recommendations": [],
            "risk_level": "low"
        }
        
        # Temperature comfort
        if 18 <= weather.temperature_avg <= 28:
            assessment["score"] += 0.1  # Ideal temperature
        elif weather.temperature_max > 35:
            assessment["warnings"].append("Very hot - seek shade")
            assessment["score"] -= 0.3
        elif weather.temperature_min < 10:
            assessment["warnings"].append("Cold - heating recommended")
            assessment["score"] -= 0.2
        
        # Precipitation
        if weather.precipitation_chance > 0.6:
            assessment["warnings"].append("Rain likely - covered seating needed")
            assessment["score"] -= 0.4
        elif weather.precipitation_chance > 0.3:
            assessment["warnings"].append("Possible rain - have backup plan")
            assessment["score"] -= 0.1
        
        # Wind (affects comfort and food service)
        if weather.wind_speed > 12:
            assessment["warnings"].append("Strong winds - items may blow away")
            assessment["score"] -= 0.2
        elif weather.wind_speed > 8:
            assessment["warnings"].append("Moderate winds - secure loose items")
            assessment["score"] -= 0.1
        
        assessment["suitable"] = assessment["score"] > 0.4
        assessment["score"] = max(0.0, min(1.0, assessment["score"]))
        
        return assessment
    
    def _assess_general_outdoor_conditions(self, weather: WeatherForecast) -> Dict[str, Any]:
        """General outdoor activity assessment"""
        assessment = {
            "suitable": True,
            "score": 1.0,
            "warnings": [],
            "recommendations": [],
            "risk_level": "low"
        }
        
        # Extreme temperature
        if weather.temperature_max > 40 or weather.temperature_min < -10:
            assessment["suitable"] = False
            assessment["score"] = 0.0
            assessment["risk_level"] = "high"
            assessment["warnings"].append("Extreme temperatures - not safe for outdoor activities")
        
        # Severe weather
        if weather.weather_condition.lower() in ["thunderstorm", "tornado", "hurricane"]:
            assessment["suitable"] = False
            assessment["score"] = 0.0
            assessment["risk_level"] = "high"
            assessment["warnings"].append("Severe weather conditions")
        
        # Heavy precipitation
        if weather.precipitation_chance > 0.8 and weather.precipitation_amount > 10:
            assessment["score"] -= 0.5
            assessment["warnings"].append("Heavy precipitation expected")
        
        # Strong winds
        if weather.wind_speed > 20:
            assessment["score"] -= 0.4
            assessment["warnings"].append("Very strong winds")
            assessment["risk_level"] = "medium"
        
        assessment["suitable"] = assessment["score"] > 0.3
        assessment["score"] = max(0.0, min(1.0, assessment["score"]))
        
        return assessment