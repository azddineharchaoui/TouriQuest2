"""
ML-powered timing optimization and smart notification features.
"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from collections import defaultdict, deque
import json
import math
import random
from dataclasses import dataclass
from enum import Enum

from app.models.schemas import (
    NotificationType, DeliveryChannel, UserBehaviorData, TimingOptimizationModel,
    NotificationAnalytics, NotificationStatus
)

logger = logging.getLogger(__name__)


class MLFeature(Enum):
    """Machine learning features for optimization."""
    HOUR_OF_DAY = "hour_of_day"
    DAY_OF_WEEK = "day_of_week"
    CHANNEL_PREFERENCE = "channel_preference"
    NOTIFICATION_TYPE = "notification_type"
    RESPONSE_TIME_HISTORY = "response_time_history"
    ENGAGEMENT_RATE = "engagement_rate"
    SESSION_ACTIVITY = "session_activity"
    DEVICE_TYPE = "device_type"
    TIMEZONE = "timezone"
    SEASONAL_PATTERN = "seasonal_pattern"


@dataclass
class EngagementPrediction:
    """Engagement prediction result."""
    channel: DeliveryChannel
    probability: float
    confidence: float
    optimal_time: datetime
    factors: Dict[str, float]


@dataclass
class TimingRecommendation:
    """Timing recommendation for notification."""
    recommended_time: datetime
    confidence_score: float
    delay_minutes: int
    reasoning: str
    alternative_times: List[datetime]


class FeatureExtractor:
    """Extracts features for ML models."""
    
    def __init__(self):
        self.timezone_mappings = {
            "UTC": 0, "EST": -5, "PST": -8, "GMT": 0,
            "CET": 1, "JST": 9, "IST": 5.5
        }
    
    def extract_user_features(
        self,
        user_behavior: UserBehaviorData,
        current_time: datetime
    ) -> Dict[str, float]:
        """Extract user-specific features."""
        features = {}
        
        # Time-based features
        features[MLFeature.HOUR_OF_DAY.value] = current_time.hour / 23.0
        features[MLFeature.DAY_OF_WEEK.value] = current_time.weekday() / 6.0
        
        # Timezone feature
        tz_offset = self.timezone_mappings.get(user_behavior.timezone, 0)
        features[MLFeature.TIMEZONE.value] = (tz_offset + 12) / 24.0  # Normalize to 0-1
        
        # Activity pattern features
        if user_behavior.active_hours:
            current_hour = current_time.hour
            is_active_hour = 1.0 if current_hour in user_behavior.active_hours else 0.0
            features[MLFeature.SESSION_ACTIVITY.value] = is_active_hour
            
            # Average active hours
            avg_active_hour = sum(user_behavior.active_hours) / len(user_behavior.active_hours)
            features["avg_active_hour"] = avg_active_hour / 23.0
        else:
            features[MLFeature.SESSION_ACTIVITY.value] = 0.5  # Unknown
            features["avg_active_hour"] = 0.5
        
        # Channel preference features
        for channel in DeliveryChannel:
            pref_key = f"channel_pref_{channel.value}"
            if channel in user_behavior.preferred_channels:
                features[pref_key] = 1.0
            else:
                features[pref_key] = 0.0
        
        # Engagement rate features
        for channel, rate in user_behavior.engagement_rates.items():
            features[f"engagement_{channel}"] = rate
        
        # Response time features
        for channel, time in user_behavior.response_times.items():
            # Normalize response time (assuming max 24 hours)
            normalized_time = min(time / (24 * 60), 1.0)
            features[f"response_time_{channel}"] = normalized_time
        
        # Recency feature
        if user_behavior.last_active:
            hours_since_active = (current_time - user_behavior.last_active).total_seconds() / 3600
            features["hours_since_active"] = min(hours_since_active / 168, 1.0)  # Normalize to week
        else:
            features["hours_since_active"] = 1.0  # No recent activity
        
        # Seasonal features
        day_of_year = current_time.timetuple().tm_yday
        features[MLFeature.SEASONAL_PATTERN.value] = math.sin(2 * math.pi * day_of_year / 365)
        
        return features
    
    def extract_notification_features(
        self,
        notification_type: NotificationType,
        channel: DeliveryChannel,
        current_time: datetime
    ) -> Dict[str, float]:
        """Extract notification-specific features."""
        features = {}
        
        # Notification type features (one-hot encoding)
        for ntype in NotificationType:
            features[f"type_{ntype.value}"] = 1.0 if ntype == notification_type else 0.0
        
        # Channel features (one-hot encoding)
        for ch in DeliveryChannel:
            features[f"channel_{ch.value}"] = 1.0 if ch == channel else 0.0
        
        # Urgency mapping
        urgency_map = {
            NotificationType.BOOKING_CONFIRMATION: 0.9,
            NotificationType.SAFETY_ALERT: 1.0,
            NotificationType.WEATHER_ALERT: 0.8,
            NotificationType.TRAVEL_REMINDER: 0.7,
            NotificationType.PRICE_DROP_ALERT: 0.6,
            NotificationType.PERSONALIZED_RECOMMENDATION: 0.3,
            NotificationType.SOCIAL_ACTIVITY: 0.2,
            NotificationType.PROMOTIONAL: 0.1
        }
        features["urgency"] = urgency_map.get(notification_type, 0.5)
        
        return features


class EngagementPredictor:
    """Predicts user engagement with notifications."""
    
    def __init__(self):
        self.feature_extractor = FeatureExtractor()
        self.models = {}  # Channel -> model weights
        self.training_data = defaultdict(list)  # Channel -> training examples
        self._initialize_models()
    
    def _initialize_models(self):
        """Initialize simple linear models for each channel."""
        # Simple linear weights for demonstration
        # In production, use scikit-learn or similar
        self.models = {
            DeliveryChannel.EMAIL: {
                "hour_of_day": 0.3,
                "session_activity": 0.4,
                "engagement_email": 0.8,
                "urgency": 0.5,
                "bias": 0.1
            },
            DeliveryChannel.PUSH: {
                "hour_of_day": 0.2,
                "session_activity": 0.6,
                "engagement_push": 0.7,
                "urgency": 0.8,
                "bias": 0.2
            },
            DeliveryChannel.SMS: {
                "urgency": 0.9,
                "engagement_sms": 0.6,
                "hour_of_day": 0.1,
                "bias": 0.3
            },
            DeliveryChannel.IN_APP: {
                "session_activity": 0.9,
                "engagement_in_app": 0.8,
                "hour_of_day": 0.2,
                "bias": 0.4
            }
        }
    
    async def predict_engagement(
        self,
        user_behavior: UserBehaviorData,
        notification_type: NotificationType,
        channels: List[DeliveryChannel],
        target_time: datetime
    ) -> List[EngagementPrediction]:
        """Predict engagement for each channel."""
        predictions = []
        
        # Extract features
        user_features = self.feature_extractor.extract_user_features(user_behavior, target_time)
        
        for channel in channels:
            notif_features = self.feature_extractor.extract_notification_features(
                notification_type, channel, target_time
            )
            
            # Combine features
            all_features = {**user_features, **notif_features}
            
            # Get model for channel
            model_weights = self.models.get(channel, {})
            
            # Calculate prediction (simple linear model)
            prediction = model_weights.get("bias", 0.0)
            confidence_sum = 0.0
            
            for feature, value in all_features.items():
                weight = model_weights.get(feature, 0.0)
                prediction += weight * value
                confidence_sum += abs(weight)
            
            # Apply sigmoid to get probability
            probability = 1.0 / (1.0 + math.exp(-prediction))
            
            # Calculate confidence (normalized weight sum)
            confidence = min(confidence_sum / 5.0, 1.0)  # Normalize
            
            # Find optimal time for this channel
            optimal_time = await self._find_optimal_time(
                user_behavior, channel, target_time
            )
            
            # Calculate factor contributions
            factors = {}
            for feature, value in all_features.items():
                weight = model_weights.get(feature, 0.0)
                factors[feature] = weight * value
            
            predictions.append(EngagementPrediction(
                channel=channel,
                probability=probability,
                confidence=confidence,
                optimal_time=optimal_time,
                factors=factors
            ))
        
        return sorted(predictions, key=lambda p: p.probability, reverse=True)
    
    async def _find_optimal_time(
        self,
        user_behavior: UserBehaviorData,
        channel: DeliveryChannel,
        base_time: datetime
    ) -> datetime:
        """Find optimal time for channel based on user behavior."""
        
        # Use user's active hours if available
        if user_behavior.active_hours and channel in [DeliveryChannel.PUSH, DeliveryChannel.IN_APP]:
            current_hour = base_time.hour
            
            # Find next active hour
            future_active_hours = [h for h in user_behavior.active_hours if h > current_hour]
            
            if future_active_hours:
                optimal_hour = min(future_active_hours)
                return base_time.replace(hour=optimal_hour, minute=0, second=0, microsecond=0)
            elif user_behavior.active_hours:
                # Next day
                optimal_hour = min(user_behavior.active_hours)
                return (base_time + timedelta(days=1)).replace(
                    hour=optimal_hour, minute=0, second=0, microsecond=0
                )
        
        # Channel-specific optimal times
        optimal_hours = {
            DeliveryChannel.EMAIL: [9, 14, 18],  # Morning, afternoon, evening
            DeliveryChannel.PUSH: [10, 15, 20],  # Slightly later than email
            DeliveryChannel.SMS: [11, 16],       # Business hours only
            DeliveryChannel.IN_APP: list(range(9, 22)),  # Throughout day
            DeliveryChannel.BROWSER: [10, 14, 17]
        }
        
        channel_hours = optimal_hours.get(channel, [12])  # Default to noon
        current_hour = base_time.hour
        
        # Find next optimal hour
        future_hours = [h for h in channel_hours if h > current_hour]
        
        if future_hours:
            optimal_hour = min(future_hours)
            return base_time.replace(hour=optimal_hour, minute=0, second=0, microsecond=0)
        elif channel_hours:
            # Next day
            optimal_hour = min(channel_hours)
            return (base_time + timedelta(days=1)).replace(
                hour=optimal_hour, minute=0, second=0, microsecond=0
            )
        
        return base_time
    
    async def learn_from_feedback(
        self,
        user_behavior: UserBehaviorData,
        notification_type: NotificationType,
        channel: DeliveryChannel,
        sent_time: datetime,
        engaged: bool,
        response_time_minutes: Optional[float] = None
    ):
        """Learn from user feedback to improve predictions."""
        
        # Extract features for this interaction
        user_features = self.feature_extractor.extract_user_features(user_behavior, sent_time)
        notif_features = self.feature_extractor.extract_notification_features(
            notification_type, channel, sent_time
        )
        
        all_features = {**user_features, **notif_features}
        
        # Store training example
        training_example = {
            "features": all_features,
            "engaged": engaged,
            "response_time": response_time_minutes,
            "timestamp": sent_time
        }
        
        self.training_data[channel].append(training_example)
        
        # Simple online learning (update weights)
        if len(self.training_data[channel]) > 10:
            await self._update_model_weights(channel)
    
    async def _update_model_weights(self, channel: DeliveryChannel):
        """Update model weights based on recent training data."""
        
        training_examples = self.training_data[channel][-100:]  # Use last 100 examples
        
        if len(training_examples) < 10:
            return
        
        # Simple gradient descent update
        learning_rate = 0.01
        current_weights = self.models[channel]
        
        for example in training_examples[-10:]:  # Use last 10 for update
            features = example["features"]
            actual = 1.0 if example["engaged"] else 0.0
            
            # Calculate prediction
            prediction = current_weights.get("bias", 0.0)
            for feature, value in features.items():
                weight = current_weights.get(feature, 0.0)
                prediction += weight * value
            
            # Apply sigmoid
            prediction = 1.0 / (1.0 + math.exp(-prediction))
            
            # Calculate error
            error = actual - prediction
            
            # Update weights
            current_weights["bias"] = current_weights.get("bias", 0.0) + learning_rate * error
            
            for feature, value in features.items():
                if feature in current_weights:
                    current_weights[feature] += learning_rate * error * value
                else:
                    current_weights[feature] = learning_rate * error * value
        
        self.models[channel] = current_weights
        logger.info(f"Updated model weights for channel {channel}")


class SmartTimingOptimizer:
    """Advanced timing optimizer using ML predictions."""
    
    def __init__(self):
        self.engagement_predictor = EngagementPredictor()
        self.user_models = {}  # user_id -> TimingOptimizationModel
        self.global_patterns = defaultdict(list)  # Pattern storage
    
    async def get_optimal_timing(
        self,
        user_behavior: UserBehaviorData,
        notification_type: NotificationType,
        channels: List[DeliveryChannel],
        earliest_time: datetime = None,
        latest_time: datetime = None
    ) -> TimingRecommendation:
        """Get optimal timing recommendation."""
        
        if earliest_time is None:
            earliest_time = datetime.utcnow()
        
        if latest_time is None:
            latest_time = earliest_time + timedelta(hours=24)
        
        # Generate candidate times
        candidate_times = self._generate_candidate_times(earliest_time, latest_time)
        
        best_time = earliest_time
        best_score = 0.0
        alternative_times = []
        
        # Evaluate each candidate time
        for candidate_time in candidate_times:
            predictions = await self.engagement_predictor.predict_engagement(
                user_behavior, notification_type, channels, candidate_time
            )
            
            # Calculate composite score
            score = await self._calculate_composite_score(predictions, candidate_time, user_behavior)
            
            if score > best_score:
                if best_time != earliest_time:
                    alternative_times.append(best_time)
                best_time = candidate_time
                best_score = score
            elif score > best_score * 0.8:  # Good alternative
                alternative_times.append(candidate_time)
        
        # Calculate delay and confidence
        delay_minutes = int((best_time - earliest_time).total_seconds() / 60)
        confidence = min(best_score, 1.0)
        
        # Generate reasoning
        reasoning = await self._generate_reasoning(
            best_time, user_behavior, notification_type, channels
        )
        
        return TimingRecommendation(
            recommended_time=best_time,
            confidence_score=confidence,
            delay_minutes=delay_minutes,
            reasoning=reasoning,
            alternative_times=sorted(alternative_times)[:3]  # Top 3 alternatives
        )
    
    def _generate_candidate_times(
        self,
        start_time: datetime,
        end_time: datetime
    ) -> List[datetime]:
        """Generate candidate send times."""
        
        candidates = []
        current = start_time
        
        while current <= end_time:
            candidates.append(current)
            current += timedelta(hours=1)  # Hourly candidates
        
        # Add some specific optimal times
        for hour in [9, 12, 15, 18, 20]:  # Common optimal hours
            candidate = start_time.replace(hour=hour, minute=0, second=0, microsecond=0)
            if start_time <= candidate <= end_time:
                candidates.append(candidate)
        
        return sorted(list(set(candidates)))
    
    async def _calculate_composite_score(
        self,
        predictions: List[EngagementPrediction],
        time: datetime,
        user_behavior: UserBehaviorData
    ) -> float:
        """Calculate composite score for a timing option."""
        
        if not predictions:
            return 0.0
        
        # Base score from engagement predictions
        base_score = max(p.probability * p.confidence for p in predictions)
        
        # Time-based adjustments
        hour = time.hour
        
        # Prefer active hours
        if user_behavior.active_hours and hour in user_behavior.active_hours:
            base_score *= 1.2
        
        # Avoid very early/late hours
        if hour < 6 or hour > 22:
            base_score *= 0.5
        
        # Prefer business hours for certain types
        if 9 <= hour <= 17:
            base_score *= 1.1
        
        # Weekend adjustment
        if time.weekday() >= 5:  # Weekend
            base_score *= 0.9
        
        return min(base_score, 1.0)
    
    async def _generate_reasoning(
        self,
        recommended_time: datetime,
        user_behavior: UserBehaviorData,
        notification_type: NotificationType,
        channels: List[DeliveryChannel]
    ) -> str:
        """Generate human-readable reasoning for timing decision."""
        
        reasons = []
        
        hour = recommended_time.hour
        
        # Time-based reasoning
        if hour in user_behavior.active_hours:
            reasons.append(f"user is typically active at {hour}:00")
        
        if 9 <= hour <= 17:
            reasons.append("during business hours for better visibility")
        
        # Channel-based reasoning
        if DeliveryChannel.EMAIL in channels:
            if hour in [9, 14, 18]:
                reasons.append("optimal email engagement time")
        
        if DeliveryChannel.PUSH in channels:
            if hour in [10, 15, 20]:
                reasons.append("peak mobile engagement period")
        
        # Notification type reasoning
        urgency_map = {
            NotificationType.SAFETY_ALERT: "immediate delivery for safety",
            NotificationType.BOOKING_CONFIRMATION: "prompt confirmation needed",
            NotificationType.TRAVEL_REMINDER: "timely travel preparation",
            NotificationType.PERSONALIZED_RECOMMENDATION: "leisure browsing time"
        }
        
        if notification_type in urgency_map:
            reasons.append(urgency_map[notification_type])
        
        if not reasons:
            reasons.append("optimal engagement prediction")
        
        return f"Recommended because {', '.join(reasons)}"
    
    async def update_user_model(
        self,
        user_id: str,
        engagement_data: List[NotificationAnalytics]
    ):
        """Update user-specific timing model."""
        
        if not engagement_data:
            return
        
        # Analyze engagement patterns
        channel_patterns = defaultdict(list)
        hour_patterns = defaultdict(list)
        
        for analytics in engagement_data:
            if analytics.opened_at:
                hour = analytics.sent_at.hour if analytics.sent_at else 12
                engaged = analytics.opened_at is not None
                
                channel_patterns[analytics.channel].append({
                    "hour": hour,
                    "engaged": engaged,
                    "response_time": (analytics.opened_at - analytics.sent_at).total_seconds() / 60
                    if analytics.opened_at and analytics.sent_at else None
                })
                
                hour_patterns[hour].append(engaged)
        
        # Calculate optimal times for each channel
        optimal_times = {}
        engagement_rates = {}
        
        for channel, data in channel_patterns.items():
            if len(data) >= 5:  # Minimum data points
                engaged_hours = [d["hour"] for d in data if d["engaged"]]
                if engaged_hours:
                    optimal_times[channel.value] = engaged_hours
                
                total_engaged = sum(1 for d in data if d["engaged"])
                engagement_rates[channel.value] = total_engaged / len(data)
        
        # Update user model
        model = TimingOptimizationModel(
            user_id=user_id,
            optimal_send_times=optimal_times,
            engagement_predictions=engagement_rates,
            last_updated=datetime.utcnow()
        )
        
        self.user_models[user_id] = model
        logger.info(f"Updated timing model for user {user_id}")


class PersonalizationEngine:
    """Advanced personalization engine."""
    
    def __init__(self):
        self.user_profiles = {}
        self.content_templates = {}
        self.personalization_rules = {}
    
    async def personalize_notification(
        self,
        notification_content: Dict[str, Any],
        user_behavior: UserBehaviorData,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Personalize notification content."""
        
        personalized = notification_content.copy()
        
        # Personalize subject line
        personalized["subject"] = await self._personalize_subject(
            personalized["subject"], user_behavior, context
        )
        
        # Personalize body content
        personalized["body"] = await self._personalize_body(
            personalized["body"], user_behavior, context
        )
        
        # Add personalized call-to-action
        personalized["action_text"] = await self._personalize_action(
            personalized.get("action_text", "View Details"), user_behavior, context
        )
        
        return personalized
    
    async def _personalize_subject(
        self,
        subject: str,
        user_behavior: UserBehaviorData,
        context: Dict[str, Any]
    ) -> str:
        """Personalize subject line."""
        
        # Add urgency indicators for high-engagement users
        if user_behavior.engagement_rates.get(DeliveryChannel.EMAIL.value, 0) > 0.7:
            if "alert" in subject.lower() or "reminder" in subject.lower():
                subject = f"⚡ {subject}"
        
        # Add location context
        if context.get("location"):
            location = context["location"]
            if "recommendation" in subject.lower():
                subject = f"{subject} in {location}"
        
        # Add time-sensitive language
        current_hour = datetime.utcnow().hour
        if 18 <= current_hour <= 22:
            if "deal" in subject.lower() or "offer" in subject.lower():
                subject = f"Tonight Only: {subject}"
        
        return subject
    
    async def _personalize_body(
        self,
        body: str,
        user_behavior: UserBehaviorData,
        context: Dict[str, Any]
    ) -> str:
        """Personalize body content."""
        
        # Add greeting based on time
        current_hour = datetime.utcnow().hour
        if current_hour < 12:
            greeting = "Good morning"
        elif current_hour < 17:
            greeting = "Good afternoon"
        else:
            greeting = "Good evening"
        
        # Add personalized greeting if body doesn't have one
        if not any(g in body.lower() for g in ["hello", "hi", "good morning", "good afternoon", "good evening"]):
            body = f"{greeting}!\n\n{body}"
        
        # Add behavioral insights
        if user_behavior.preferred_channels:
            preferred = user_behavior.preferred_channels[0].value
            if "important" in body.lower():
                body += f"\n\nPS: We're sending this via your preferred {preferred} notifications."
        
        return body
    
    async def _personalize_action(
        self,
        action_text: str,
        user_behavior: UserBehaviorData,
        context: Dict[str, Any]
    ) -> str:
        """Personalize call-to-action."""
        
        # High-engagement users get more direct CTAs
        if user_behavior.engagement_rates.get(DeliveryChannel.EMAIL.value, 0) > 0.8:
            action_map = {
                "view details": "See Your Match",
                "learn more": "Get Started Now",
                "check it out": "Claim Your Spot"
            }
            return action_map.get(action_text.lower(), action_text)
        
        return action_text


# Global instances
smart_timing_optimizer = SmartTimingOptimizer()
personalization_engine = PersonalizationEngine()