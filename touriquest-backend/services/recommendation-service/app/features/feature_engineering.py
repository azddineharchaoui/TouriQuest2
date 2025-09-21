"""
Feature engineering pipeline for recommendation system.
"""
import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from sklearn.preprocessing import StandardScaler, LabelEncoder, MinMaxScaler
from sklearn.feature_extraction.text import TfidfVectorizer
import logging

logger = logging.getLogger(__name__)


class FeatureEngineer:
    """Feature engineering for recommendation system."""
    
    def __init__(self):
        self.user_features = None
        self.item_features = None
        self.context_features = None
        self.scalers = {}
        self.encoders = {}
        self.vectorizers = {}
        
    def extract_user_features(self, user_data: pd.DataFrame, 
                            travel_history: pd.DataFrame,
                            social_connections: pd.DataFrame,
                            preferences: pd.DataFrame) -> pd.DataFrame:
        """Extract comprehensive user features."""
        logger.info("Extracting user features...")
        
        features = []
        
        for user_id in user_data['user_id'].unique():
            user_info = user_data[user_data['user_id'] == user_id].iloc[0]
            user_history = travel_history[travel_history['user_id'] == user_id]
            user_connections = social_connections[
                (social_connections['follower_id'] == user_id) |
                (social_connections['following_id'] == user_id)
            ]
            user_prefs = preferences[preferences['user_id'] == user_id]
            
            # Basic demographic features
            feature_dict = {
                'user_id': user_id,
                'account_age_days': (datetime.now() - user_info['created_at']).days,
                'is_verified': int(user_info.get('is_verified', False)),
                'profile_completeness': self._calculate_profile_completeness(user_info),
            }
            
            # Travel experience features
            if not user_history.empty:
                feature_dict.update({
                    'total_trips': len(user_history),
                    'countries_visited': user_history['country'].nunique(),
                    'cities_visited': user_history['city'].nunique(),
                    'avg_trip_duration': user_history['duration_days'].mean(),
                    'total_travel_days': user_history['duration_days'].sum(),
                    'avg_satisfaction': user_history['satisfaction_rating'].mean(),
                    'last_trip_days_ago': (datetime.now().date() - user_history['visit_date'].max()).days,
                    'travel_frequency': len(user_history) / max(1, (datetime.now().date() - user_history['visit_date'].min()).days / 365),
                })
                
                # Travel style preferences
                style_counts = user_history['travel_style'].value_counts()
                for style in ['adventure', 'culture', 'relaxation', 'business', 'family', 'solo', 'luxury', 'budget']:
                    feature_dict[f'prefers_{style}'] = style_counts.get(style, 0) / len(user_history)
                
                # Seasonal preferences
                user_history['month'] = pd.to_datetime(user_history['visit_date']).dt.month
                seasonal_prefs = self._calculate_seasonal_preferences(user_history['month'])
                feature_dict.update(seasonal_prefs)
                
                # Budget analysis
                if 'budget_spent' in user_history.columns:
                    budget_data = user_history.dropna(subset=['budget_spent'])
                    if not budget_data.empty:
                        feature_dict.update({
                            'avg_budget_per_trip': budget_data['budget_spent'].mean(),
                            'budget_variance': budget_data['budget_spent'].var(),
                            'max_budget_spent': budget_data['budget_spent'].max(),
                        })
            else:
                # Cold start features
                feature_dict.update({
                    'total_trips': 0,
                    'countries_visited': 0,
                    'cities_visited': 0,
                    'avg_trip_duration': 0,
                    'is_new_user': 1,
                })
            
            # Social features
            feature_dict.update({
                'follower_count': len(user_connections[user_connections['following_id'] == user_id]),
                'following_count': len(user_connections[user_connections['follower_id'] == user_id]),
                'social_influence_score': self._calculate_social_influence(user_connections, user_id),
            })
            
            # Preference features
            if not user_prefs.empty:
                prefs_dict = dict(zip(user_prefs['preference_type'], user_prefs['value']))
                feature_dict.update({
                    'budget_preference': self._encode_budget_preference(prefs_dict.get('budget_range', 'mid_range')),
                    'group_travel_preference': float(prefs_dict.get('group_travel', 0.5)),
                    'adventure_level': float(prefs_dict.get('adventure_level', 0.5)),
                    'cultural_interest': float(prefs_dict.get('cultural_interest', 0.5)),
                })
            
            features.append(feature_dict)
        
        user_features_df = pd.DataFrame(features)
        
        # Normalize numerical features
        numerical_columns = user_features_df.select_dtypes(include=[np.number]).columns
        numerical_columns = [col for col in numerical_columns if col != 'user_id']
        
        if len(numerical_columns) > 0:
            scaler = StandardScaler()
            user_features_df[numerical_columns] = scaler.fit_transform(user_features_df[numerical_columns])
            self.scalers['user_features'] = scaler
        
        self.user_features = user_features_df
        logger.info(f"Extracted {len(user_features_df.columns)-1} user features for {len(user_features_df)} users")
        
        return user_features_df
    
    def extract_item_features(self, properties: pd.DataFrame,
                            pois: pd.DataFrame,
                            experiences: pd.DataFrame,
                            reviews: pd.DataFrame) -> Dict[str, pd.DataFrame]:
        """Extract features for different item types."""
        logger.info("Extracting item features...")
        
        item_features = {}
        
        # Property features
        if not properties.empty:
            prop_features = self._extract_property_features(properties, reviews)
            item_features['properties'] = prop_features
        
        # POI features
        if not pois.empty:
            poi_features = self._extract_poi_features(pois, reviews)
            item_features['pois'] = poi_features
        
        # Experience features
        if not experiences.empty:
            exp_features = self._extract_experience_features(experiences, reviews)
            item_features['experiences'] = exp_features
        
        self.item_features = item_features
        return item_features
    
    def _extract_property_features(self, properties: pd.DataFrame, reviews: pd.DataFrame) -> pd.DataFrame:
        """Extract property-specific features."""
        features = []
        
        for _, prop in properties.iterrows():
            prop_id = prop['id']
            prop_reviews = reviews[reviews['item_id'] == prop_id]
            
            feature_dict = {
                'item_id': prop_id,
                'property_type_encoded': self._encode_categorical(prop['property_type'], 'property_type'),
                'base_price_log': np.log1p(prop.get('base_price', 0)),
                'has_cleaning_fee': int(prop.get('cleaning_fee', 0) > 0),
                'service_fee_ratio': prop.get('service_fee', 0) / max(1, prop.get('base_price', 1)),
            }
            
            # Location features
            if 'coordinates' in prop and prop['coordinates']:
                coords = prop['coordinates']
                feature_dict.update({
                    'latitude': coords.get('lat', 0),
                    'longitude': coords.get('lng', 0),
                })
            
            # Amenity features
            if 'amenities' in prop and prop['amenities']:
                amenities = prop['amenities'] if isinstance(prop['amenities'], list) else []
                feature_dict.update({
                    'amenity_count': len(amenities),
                    'has_wifi': int('wifi' in amenities),
                    'has_kitchen': int('kitchen' in amenities),
                    'has_parking': int('parking' in amenities),
                    'has_pool': int('pool' in amenities),
                    'has_ac': int('air_conditioning' in amenities),
                })
            
            # Review-based features
            if not prop_reviews.empty:
                feature_dict.update({
                    'avg_rating': prop_reviews['rating'].mean(),
                    'review_count': len(prop_reviews),
                    'rating_variance': prop_reviews['rating'].var(),
                    'recent_rating': prop_reviews.nlargest(10, 'created_at')['rating'].mean() if len(prop_reviews) >= 10 else prop_reviews['rating'].mean(),
                })
            else:
                feature_dict.update({
                    'avg_rating': 0,
                    'review_count': 0,
                    'rating_variance': 0,
                    'recent_rating': 0,
                })
            
            # Host features
            if 'host_id' in prop:
                host_properties = properties[properties['host_id'] == prop['host_id']]
                feature_dict.update({
                    'host_property_count': len(host_properties),
                    'is_superhost': int(prop.get('is_superhost', False)),
                    'host_response_rate': prop.get('host_response_rate', 0.5),
                })
            
            features.append(feature_dict)
        
        prop_features_df = pd.DataFrame(features)
        
        # Normalize numerical features
        numerical_columns = prop_features_df.select_dtypes(include=[np.number]).columns
        numerical_columns = [col for col in numerical_columns if col != 'item_id']
        
        if len(numerical_columns) > 0:
            scaler = StandardScaler()
            prop_features_df[numerical_columns] = scaler.fit_transform(prop_features_df[numerical_columns])
            self.scalers['property_features'] = scaler
        
        return prop_features_df
    
    def _extract_poi_features(self, pois: pd.DataFrame, reviews: pd.DataFrame) -> pd.DataFrame:
        """Extract POI-specific features."""
        features = []
        
        for _, poi in pois.iterrows():
            poi_id = poi['id']
            poi_reviews = reviews[reviews['item_id'] == poi_id]
            
            feature_dict = {
                'item_id': poi_id,
                'category_encoded': self._encode_categorical(poi['category'], 'poi_category'),
                'has_entry_fee': int(poi.get('entry_fee', 0) > 0),
                'entry_fee_log': np.log1p(poi.get('entry_fee', 0)),
            }
            
            # Location features
            if 'coordinates' in poi and poi['coordinates']:
                coords = poi['coordinates']
                feature_dict.update({
                    'latitude': coords.get('lat', 0),
                    'longitude': coords.get('lng', 0),
                })
            
            # Time-based features
            if 'opening_hours' in poi and poi['opening_hours']:
                opening_hours = poi['opening_hours']
                feature_dict.update({
                    'always_open': int('24/7' in str(opening_hours)),
                    'weekend_hours': int('weekend' in str(opening_hours).lower()),
                })
            
            # Content features
            if 'description' in poi and poi['description']:
                description_features = self._extract_text_features(poi['description'], 'poi_description')
                feature_dict.update(description_features)
            
            # Review-based features
            if not poi_reviews.empty:
                feature_dict.update({
                    'avg_rating': poi_reviews['rating'].mean(),
                    'review_count': len(poi_reviews),
                    'rating_variance': poi_reviews['rating'].var(),
                })
            else:
                feature_dict.update({
                    'avg_rating': 0,
                    'review_count': 0,
                    'rating_variance': 0,
                })
            
            features.append(feature_dict)
        
        poi_features_df = pd.DataFrame(features)
        
        # Normalize numerical features
        numerical_columns = poi_features_df.select_dtypes(include=[np.number]).columns
        numerical_columns = [col for col in numerical_columns if col != 'item_id']
        
        if len(numerical_columns) > 0:
            scaler = StandardScaler()
            poi_features_df[numerical_columns] = scaler.fit_transform(poi_features_df[numerical_columns])
            self.scalers['poi_features'] = scaler
        
        return poi_features_df
    
    def _extract_experience_features(self, experiences: pd.DataFrame, reviews: pd.DataFrame) -> pd.DataFrame:
        """Extract experience-specific features."""
        features = []
        
        for _, exp in experiences.iterrows():
            exp_id = exp['id']
            exp_reviews = reviews[reviews['item_id'] == exp_id]
            
            feature_dict = {
                'item_id': exp_id,
                'category_encoded': self._encode_categorical(exp['category'], 'experience_category'),
                'duration_hours': exp.get('duration_hours', 0),
                'price_log': np.log1p(exp.get('price', 0)),
                'max_participants': exp.get('max_participants', 0),
                'group_size_flexibility': exp.get('max_participants', 0) - exp.get('min_participants', 1),
            }
            
            # Difficulty and requirements
            if 'difficulty_level' in exp:
                feature_dict['difficulty_encoded'] = self._encode_categorical(exp['difficulty_level'], 'difficulty')
            
            if 'requirements' in exp and exp['requirements']:
                requirements = exp['requirements'] if isinstance(exp['requirements'], list) else []
                feature_dict.update({
                    'has_age_restriction': int(any('age' in req.lower() for req in requirements)),
                    'requires_equipment': int(any('equipment' in req.lower() for req in requirements)),
                    'fitness_required': int(any('fitness' in req.lower() for req in requirements)),
                })
            
            # Review-based features
            if not exp_reviews.empty:
                feature_dict.update({
                    'avg_rating': exp_reviews['rating'].mean(),
                    'review_count': len(exp_reviews),
                    'rating_variance': exp_reviews['rating'].var(),
                })
            else:
                feature_dict.update({
                    'avg_rating': 0,
                    'review_count': 0,
                    'rating_variance': 0,
                })
            
            features.append(feature_dict)
        
        exp_features_df = pd.DataFrame(features)
        
        # Normalize numerical features
        numerical_columns = exp_features_df.select_dtypes(include=[np.number]).columns
        numerical_columns = [col for col in numerical_columns if col != 'item_id']
        
        if len(numerical_columns) > 0:
            scaler = StandardScaler()
            exp_features_df[numerical_columns] = scaler.fit_transform(exp_features_df[numerical_columns])
            self.scalers['experience_features'] = scaler
        
        return exp_features_df
    
    def extract_context_features(self, user_id: str, context: Dict[str, Any]) -> Dict[str, float]:
        """Extract contextual features for real-time recommendations."""
        features = {}
        
        # Time-based features
        now = datetime.now()
        features.update({
            'hour_of_day': now.hour / 24.0,
            'day_of_week': now.weekday() / 6.0,
            'is_weekend': int(now.weekday() >= 5),
            'month_of_year': now.month / 12.0,
        })
        
        # Season feature
        season = self._get_season(now.month)
        features[f'is_{season}'] = 1.0
        
        # Location-based features
        if 'current_location' in context:
            location = context['current_location']
            features.update({
                'current_latitude': location.get('lat', 0),
                'current_longitude': location.get('lng', 0),
            })
        
        # Device and session features
        if 'device_type' in context:
            device_type = context['device_type']
            features[f'device_{device_type}'] = 1.0
        
        if 'session_duration' in context:
            features['session_duration_normalized'] = min(1.0, context['session_duration'] / 3600)  # Normalize by 1 hour
        
        # Weather features
        if 'weather' in context:
            weather = context['weather']
            features.update({
                'temperature_normalized': (weather.get('temperature', 20) + 10) / 50.0,  # Normalize -10 to 40°C
                'is_rainy': int(weather.get('condition') == 'rain'),
                'is_sunny': int(weather.get('condition') == 'sunny'),
            })
        
        # Travel context
        if 'travel_dates' in context:
            travel_dates = context['travel_dates']
            if 'start_date' in travel_dates:
                start_date = pd.to_datetime(travel_dates['start_date']).date()
                days_until_travel = (start_date - now.date()).days
                features['days_until_travel'] = max(0, min(1.0, days_until_travel / 365))
        
        if 'group_size' in context:
            features['group_size_normalized'] = min(1.0, context['group_size'] / 10)
        
        if 'budget_range' in context:
            budget_mapping = {'budget': 0.25, 'mid_range': 0.5, 'luxury': 0.75, 'ultra_luxury': 1.0}
            features['budget_preference'] = budget_mapping.get(context['budget_range'], 0.5)
        
        return features
    
    def _calculate_profile_completeness(self, user_info: pd.Series) -> float:
        """Calculate user profile completeness score."""
        required_fields = ['first_name', 'last_name', 'bio', 'location', 'avatar_url']
        completed_fields = sum(1 for field in required_fields if user_info.get(field) not in [None, '', np.nan])
        return completed_fields / len(required_fields)
    
    def _calculate_seasonal_preferences(self, months: pd.Series) -> Dict[str, float]:
        """Calculate seasonal travel preferences."""
        season_mapping = {
            12: 'winter', 1: 'winter', 2: 'winter',
            3: 'spring', 4: 'spring', 5: 'spring',
            6: 'summer', 7: 'summer', 8: 'summer',
            9: 'fall', 10: 'fall', 11: 'fall'
        }
        
        seasons = months.map(season_mapping)
        season_counts = seasons.value_counts()
        total_trips = len(seasons)
        
        preferences = {}
        for season in ['spring', 'summer', 'fall', 'winter']:
            preferences[f'prefers_{season}'] = season_counts.get(season, 0) / total_trips
        
        return preferences
    
    def _calculate_social_influence(self, connections: pd.DataFrame, user_id: str) -> float:
        """Calculate social influence score."""
        if connections.empty:
            return 0.0
        
        # Simple influence calculation based on followers and interactions
        followers = len(connections[connections['following_id'] == user_id])
        following = len(connections[connections['follower_id'] == user_id])
        
        if followers + following == 0:
            return 0.0
        
        # Influence score based on follower ratio and interaction count
        follower_ratio = followers / max(1, followers + following)
        avg_interaction_count = connections['interaction_count'].mean() if 'interaction_count' in connections.columns else 0
        
        influence_score = (follower_ratio * 0.7) + (min(1.0, avg_interaction_count / 100) * 0.3)
        return influence_score
    
    def _encode_budget_preference(self, budget_range: str) -> float:
        """Encode budget preference as numerical value."""
        mapping = {
            'budget': 0.25,
            'mid_range': 0.5,
            'luxury': 0.75,
            'ultra_luxury': 1.0
        }
        return mapping.get(budget_range, 0.5)
    
    def _encode_categorical(self, value: str, category_type: str) -> int:
        """Encode categorical values."""
        if category_type not in self.encoders:
            self.encoders[category_type] = LabelEncoder()
        
        try:
            # Fit the encoder if not already fitted
            if not hasattr(self.encoders[category_type], 'classes_'):
                self.encoders[category_type].fit([value])
                return 0
            else:
                return self.encoders[category_type].transform([value])[0]
        except ValueError:
            # Handle unseen categories
            return len(self.encoders[category_type].classes_)
    
    def _extract_text_features(self, text: str, feature_prefix: str) -> Dict[str, float]:
        """Extract features from text content."""
        if not text:
            return {f'{feature_prefix}_length': 0, f'{feature_prefix}_word_count': 0}
        
        features = {
            f'{feature_prefix}_length': len(text),
            f'{feature_prefix}_word_count': len(text.split()),
        }
        
        # Add TF-IDF features for important keywords
        if feature_prefix not in self.vectorizers:
            self.vectorizers[feature_prefix] = TfidfVectorizer(
                max_features=10,
                stop_words='english',
                ngram_range=(1, 2)
            )
            
            try:
                tfidf_matrix = self.vectorizers[feature_prefix].fit_transform([text])
                feature_names = self.vectorizers[feature_prefix].get_feature_names_out()
                
                for i, feature_name in enumerate(feature_names):
                    features[f'{feature_prefix}_tfidf_{feature_name}'] = tfidf_matrix[0, i]
            except:
                # Handle case where vectorizer fails
                pass
        
        return features
    
    def _get_season(self, month: int) -> str:
        """Get season from month."""
        if month in [12, 1, 2]:
            return 'winter'
        elif month in [3, 4, 5]:
            return 'spring'
        elif month in [6, 7, 8]:
            return 'summer'
        else:
            return 'fall'
    
    def get_user_item_interaction_matrix(self, interactions: pd.DataFrame) -> pd.DataFrame:
        """Create user-item interaction matrix with enhanced features."""
        # Create basic interaction matrix
        interaction_matrix = interactions.pivot_table(
            index='user_id',
            columns='item_id',
            values='rating',
            fill_value=0
        )
        
        # Add implicit feedback features
        if 'timestamp' in interactions.columns:
            # Recency weighting
            interactions['days_ago'] = (pd.Timestamp.now() - pd.to_datetime(interactions['timestamp'])).dt.days
            interactions['recency_weight'] = np.exp(-interactions['days_ago'] / 30)  # 30-day decay
            
            # Weighted interaction matrix
            weighted_matrix = interactions.pivot_table(
                index='user_id',
                columns='item_id',
                values='recency_weight',
                aggfunc='sum',
                fill_value=0
            )
            
            # Combine explicit and implicit feedback
            final_matrix = interaction_matrix + 0.3 * weighted_matrix
        else:
            final_matrix = interaction_matrix
        
        return final_matrix