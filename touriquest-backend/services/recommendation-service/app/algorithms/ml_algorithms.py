"""
Collaborative filtering algorithm for user-based recommendations.
"""
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional, Any
from abc import ABC, abstractmethod
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.decomposition import NMF, TruncatedSVD
from scipy.sparse import csr_matrix
import logging

logger = logging.getLogger(__name__)


class BaseRecommendationAlgorithm(ABC):
    """Base class for all recommendation algorithms."""
    
    def __init__(self, name: str):
        self.name = name
        self.is_trained = False
        self.model = None
        
    @abstractmethod
    def fit(self, interactions: pd.DataFrame, **kwargs) -> None:
        """Train the recommendation model."""
        pass
    
    @abstractmethod
    def predict(self, user_id: str, item_ids: List[str], **kwargs) -> Dict[str, float]:
        """Generate predictions for user-item pairs."""
        pass
    
    @abstractmethod
    def recommend(self, user_id: str, n_recommendations: int = 10, **kwargs) -> List[Tuple[str, float]]:
        """Generate top-N recommendations for a user."""
        pass


class CollaborativeFilteringAlgorithm(BaseRecommendationAlgorithm):
    """User-based collaborative filtering algorithm."""
    
    def __init__(self, n_neighbors: int = 50, min_interactions: int = 5):
        super().__init__("collaborative_filtering")
        self.n_neighbors = n_neighbors
        self.min_interactions = min_interactions
        self.user_similarity_matrix = None
        self.user_item_matrix = None
        self.user_means = None
        self.user_ids = None
        self.item_ids = None
        
    def fit(self, interactions: pd.DataFrame, **kwargs) -> None:
        """
        Train collaborative filtering model.
        
        Args:
            interactions: DataFrame with columns ['user_id', 'item_id', 'rating']
        """
        try:
            logger.info("Training collaborative filtering model...")
            
            # Filter users and items with minimum interactions
            user_counts = interactions['user_id'].value_counts()
            item_counts = interactions['item_id'].value_counts()
            
            valid_users = user_counts[user_counts >= self.min_interactions].index
            valid_items = item_counts[item_counts >= self.min_interactions].index
            
            filtered_interactions = interactions[
                (interactions['user_id'].isin(valid_users)) &
                (interactions['item_id'].isin(valid_items))
            ]
            
            logger.info(f"Filtered to {len(valid_users)} users and {len(valid_items)} items")
            
            # Create user-item matrix
            self.user_item_matrix = filtered_interactions.pivot_table(
                index='user_id',
                columns='item_id',
                values='rating',
                fill_value=0
            )
            
            self.user_ids = list(self.user_item_matrix.index)
            self.item_ids = list(self.user_item_matrix.columns)
            
            # Calculate user means for centering
            self.user_means = self.user_item_matrix.mean(axis=1)
            
            # Center the ratings
            centered_matrix = self.user_item_matrix.sub(self.user_means, axis=0)
            centered_matrix = centered_matrix.fillna(0)
            
            # Calculate user similarity matrix
            self.user_similarity_matrix = cosine_similarity(centered_matrix.values)
            
            self.is_trained = True
            logger.info("Collaborative filtering model trained successfully")
            
        except Exception as e:
            logger.error(f"Error training collaborative filtering model: {str(e)}")
            raise
    
    def predict(self, user_id: str, item_ids: List[str], **kwargs) -> Dict[str, float]:
        """Predict ratings for user-item pairs."""
        if not self.is_trained:
            raise ValueError("Model must be trained before prediction")
        
        predictions = {}
        
        if user_id not in self.user_ids:
            # Cold start - return average ratings for items
            for item_id in item_ids:
                if item_id in self.item_ids:
                    predictions[item_id] = self.user_item_matrix[item_id].mean()
                else:
                    predictions[item_id] = 0.0
            return predictions
        
        user_idx = self.user_ids.index(user_id)
        user_similarities = self.user_similarity_matrix[user_idx]
        
        # Find most similar users
        similar_users_idx = np.argsort(user_similarities)[::-1][1:self.n_neighbors + 1]
        
        for item_id in item_ids:
            if item_id not in self.item_ids:
                predictions[item_id] = 0.0
                continue
            
            # Get ratings from similar users for this item
            similar_ratings = []
            similarity_weights = []
            
            for similar_user_idx in similar_users_idx:
                similar_user_id = self.user_ids[similar_user_idx]
                rating = self.user_item_matrix.loc[similar_user_id, item_id]
                
                if rating > 0:  # User has rated this item
                    similar_ratings.append(rating)
                    similarity_weights.append(user_similarities[similar_user_idx])
            
            if similar_ratings:
                # Weighted average prediction
                numerator = sum(r * w for r, w in zip(similar_ratings, similarity_weights))
                denominator = sum(abs(w) for w in similarity_weights)
                
                if denominator > 0:
                    predicted_rating = self.user_means[user_id] + (numerator / denominator)
                    predictions[item_id] = max(0, min(5, predicted_rating))  # Clamp to [0, 5]
                else:
                    predictions[item_id] = self.user_means[user_id]
            else:
                predictions[item_id] = self.user_means[user_id]
        
        return predictions
    
    def recommend(self, user_id: str, n_recommendations: int = 10, **kwargs) -> List[Tuple[str, float]]:
        """Generate top-N recommendations for a user."""
        if not self.is_trained:
            raise ValueError("Model must be trained before recommendation")
        
        # Get items user hasn't interacted with
        if user_id in self.user_ids:
            user_ratings = self.user_item_matrix.loc[user_id]
            unrated_items = user_ratings[user_ratings == 0].index.tolist()
        else:
            unrated_items = self.item_ids
        
        # Predict ratings for unrated items
        predictions = self.predict(user_id, unrated_items)
        
        # Sort by predicted rating
        recommendations = sorted(predictions.items(), key=lambda x: x[1], reverse=True)
        
        return recommendations[:n_recommendations]


class ContentBasedAlgorithm(BaseRecommendationAlgorithm):
    """Content-based filtering algorithm."""
    
    def __init__(self, feature_weights: Optional[Dict[str, float]] = None):
        super().__init__("content_based")
        self.feature_weights = feature_weights or {}
        self.item_features = None
        self.user_profiles = None
        self.feature_names = None
        
    def fit(self, interactions: pd.DataFrame, item_features: pd.DataFrame, **kwargs) -> None:
        """
        Train content-based model.
        
        Args:
            interactions: DataFrame with columns ['user_id', 'item_id', 'rating']
            item_features: DataFrame with item features
        """
        try:
            logger.info("Training content-based model...")
            
            self.item_features = item_features.set_index('item_id')
            self.feature_names = [col for col in self.item_features.columns if col != 'item_id']
            
            # Build user profiles based on their interaction history
            self.user_profiles = {}
            
            for user_id in interactions['user_id'].unique():
                user_interactions = interactions[interactions['user_id'] == user_id]
                
                # Weight features by ratings
                user_profile = np.zeros(len(self.feature_names))
                total_weight = 0
                
                for _, interaction in user_interactions.iterrows():
                    item_id = interaction['item_id']
                    rating = interaction['rating']
                    
                    if item_id in self.item_features.index:
                        item_feature_vector = self.item_features.loc[item_id].values
                        user_profile += rating * item_feature_vector
                        total_weight += rating
                
                if total_weight > 0:
                    user_profile /= total_weight
                
                self.user_profiles[user_id] = user_profile
            
            self.is_trained = True
            logger.info("Content-based model trained successfully")
            
        except Exception as e:
            logger.error(f"Error training content-based model: {str(e)}")
            raise
    
    def predict(self, user_id: str, item_ids: List[str], **kwargs) -> Dict[str, float]:
        """Predict ratings for user-item pairs."""
        if not self.is_trained:
            raise ValueError("Model must be trained before prediction")
        
        predictions = {}
        
        if user_id not in self.user_profiles:
            # Cold start - return neutral predictions
            return {item_id: 2.5 for item_id in item_ids}
        
        user_profile = self.user_profiles[user_id]
        
        for item_id in item_ids:
            if item_id in self.item_features.index:
                item_features = self.item_features.loc[item_id].values
                
                # Calculate cosine similarity between user profile and item features
                similarity = cosine_similarity([user_profile], [item_features])[0][0]
                
                # Convert similarity to rating scale [1, 5]
                predicted_rating = 1 + 4 * max(0, similarity)
                predictions[item_id] = predicted_rating
            else:
                predictions[item_id] = 2.5  # Neutral rating for unknown items
        
        return predictions
    
    def recommend(self, user_id: str, n_recommendations: int = 10, **kwargs) -> List[Tuple[str, float]]:
        """Generate top-N recommendations for a user."""
        if not self.is_trained:
            raise ValueError("Model must be trained before recommendation")
        
        # Get all available items
        all_items = self.item_features.index.tolist()
        
        # Predict ratings for all items
        predictions = self.predict(user_id, all_items)
        
        # Sort by predicted rating
        recommendations = sorted(predictions.items(), key=lambda x: x[1], reverse=True)
        
        return recommendations[:n_recommendations]


class MatrixFactorizationAlgorithm(BaseRecommendationAlgorithm):
    """Matrix factorization algorithm using NMF or SVD."""
    
    def __init__(self, n_factors: int = 50, algorithm: str = "nmf", max_iter: int = 200):
        super().__init__("matrix_factorization")
        self.n_factors = n_factors
        self.algorithm = algorithm
        self.max_iter = max_iter
        self.user_factors = None
        self.item_factors = None
        self.user_ids = None
        self.item_ids = None
        self.global_mean = None
        
    def fit(self, interactions: pd.DataFrame, **kwargs) -> None:
        """
        Train matrix factorization model.
        
        Args:
            interactions: DataFrame with columns ['user_id', 'item_id', 'rating']
        """
        try:
            logger.info(f"Training matrix factorization model with {self.algorithm}...")
            
            # Create user-item matrix
            user_item_matrix = interactions.pivot_table(
                index='user_id',
                columns='item_id',
                values='rating',
                fill_value=0
            )
            
            self.user_ids = list(user_item_matrix.index)
            self.item_ids = list(user_item_matrix.columns)
            self.global_mean = interactions['rating'].mean()
            
            # Convert to sparse matrix for efficiency
            sparse_matrix = csr_matrix(user_item_matrix.values)
            
            if self.algorithm == "nmf":
                # Non-negative Matrix Factorization
                model = NMF(
                    n_components=self.n_factors,
                    max_iter=self.max_iter,
                    random_state=42
                )
                self.user_factors = model.fit_transform(sparse_matrix)
                self.item_factors = model.components_.T
                
            elif self.algorithm == "svd":
                # Singular Value Decomposition
                model = TruncatedSVD(
                    n_components=self.n_factors,
                    random_state=42
                )
                self.user_factors = model.fit_transform(sparse_matrix)
                self.item_factors = model.components_.T
                
            else:
                raise ValueError(f"Unknown algorithm: {self.algorithm}")
            
            self.model = model
            self.is_trained = True
            logger.info("Matrix factorization model trained successfully")
            
        except Exception as e:
            logger.error(f"Error training matrix factorization model: {str(e)}")
            raise
    
    def predict(self, user_id: str, item_ids: List[str], **kwargs) -> Dict[str, float]:
        """Predict ratings for user-item pairs."""
        if not self.is_trained:
            raise ValueError("Model must be trained before prediction")
        
        predictions = {}
        
        if user_id not in self.user_ids:
            # Cold start - return global mean
            return {item_id: self.global_mean for item_id in item_ids}
        
        user_idx = self.user_ids.index(user_id)
        user_vector = self.user_factors[user_idx]
        
        for item_id in item_ids:
            if item_id in self.item_ids:
                item_idx = self.item_ids.index(item_id)
                item_vector = self.item_factors[item_idx]
                
                # Predict rating as dot product of user and item factors
                predicted_rating = np.dot(user_vector, item_vector)
                
                # Ensure rating is in valid range
                predictions[item_id] = max(0, min(5, predicted_rating))
            else:
                predictions[item_id] = self.global_mean
        
        return predictions
    
    def recommend(self, user_id: str, n_recommendations: int = 10, **kwargs) -> List[Tuple[str, float]]:
        """Generate top-N recommendations for a user."""
        if not self.is_trained:
            raise ValueError("Model must be trained before recommendation")
        
        # Predict ratings for all items
        predictions = self.predict(user_id, self.item_ids)
        
        # Sort by predicted rating
        recommendations = sorted(predictions.items(), key=lambda x: x[1], reverse=True)
        
        return recommendations[:n_recommendations]


class HybridRecommendationAlgorithm(BaseRecommendationAlgorithm):
    """Hybrid algorithm combining multiple recommendation approaches."""
    
    def __init__(self, algorithms: List[BaseRecommendationAlgorithm], weights: List[float]):
        super().__init__("hybrid")
        
        if len(algorithms) != len(weights):
            raise ValueError("Number of algorithms must match number of weights")
        
        if abs(sum(weights) - 1.0) > 1e-6:
            raise ValueError("Weights must sum to 1.0")
        
        self.algorithms = algorithms
        self.weights = weights
        
    def fit(self, interactions: pd.DataFrame, **kwargs) -> None:
        """Train all component algorithms."""
        logger.info("Training hybrid recommendation model...")
        
        for algorithm in self.algorithms:
            try:
                algorithm.fit(interactions, **kwargs)
            except Exception as e:
                logger.warning(f"Failed to train {algorithm.name}: {str(e)}")
        
        self.is_trained = any(alg.is_trained for alg in self.algorithms)
        
        if self.is_trained:
            logger.info("Hybrid model trained successfully")
        else:
            logger.error("All component algorithms failed to train")
    
    def predict(self, user_id: str, item_ids: List[str], **kwargs) -> Dict[str, float]:
        """Combine predictions from all algorithms."""
        if not self.is_trained:
            raise ValueError("Model must be trained before prediction")
        
        combined_predictions = {}
        
        for item_id in item_ids:
            weighted_prediction = 0.0
            total_weight = 0.0
            
            for algorithm, weight in zip(self.algorithms, self.weights):
                if algorithm.is_trained:
                    try:
                        prediction = algorithm.predict(user_id, [item_id])
                        weighted_prediction += weight * prediction[item_id]
                        total_weight += weight
                    except Exception as e:
                        logger.warning(f"Prediction failed for {algorithm.name}: {str(e)}")
            
            if total_weight > 0:
                combined_predictions[item_id] = weighted_prediction / total_weight
            else:
                combined_predictions[item_id] = 2.5  # Neutral rating
        
        return combined_predictions
    
    def recommend(self, user_id: str, n_recommendations: int = 10, **kwargs) -> List[Tuple[str, float]]:
        """Generate hybrid recommendations."""
        if not self.is_trained:
            raise ValueError("Model must be trained before recommendation")
        
        # Collect recommendations from all algorithms
        all_recommendations = {}
        
        for algorithm, weight in zip(self.algorithms, self.weights):
            if algorithm.is_trained:
                try:
                    recommendations = algorithm.recommend(user_id, n_recommendations * 2, **kwargs)
                    
                    for item_id, score in recommendations:
                        if item_id not in all_recommendations:
                            all_recommendations[item_id] = 0.0
                        all_recommendations[item_id] += weight * score
                        
                except Exception as e:
                    logger.warning(f"Recommendation failed for {algorithm.name}: {str(e)}")
        
        # Sort by combined score
        final_recommendations = sorted(all_recommendations.items(), key=lambda x: x[1], reverse=True)
        
        return final_recommendations[:n_recommendations]


class PopularityBasedAlgorithm(BaseRecommendationAlgorithm):
    """Simple popularity-based recommendation algorithm."""
    
    def __init__(self, time_decay: float = 0.95):
        super().__init__("popularity_based")
        self.time_decay = time_decay
        self.item_popularity = None
        
    def fit(self, interactions: pd.DataFrame, **kwargs) -> None:
        """Calculate item popularity scores."""
        logger.info("Training popularity-based model...")
        
        # Calculate popularity with time decay if timestamp is available
        if 'timestamp' in interactions.columns:
            # More recent interactions get higher weight
            interactions['days_ago'] = (
                pd.Timestamp.now() - pd.to_datetime(interactions['timestamp'])
            ).dt.days
            
            interactions['weight'] = self.time_decay ** interactions['days_ago']
            
            popularity = interactions.groupby('item_id').agg({
                'rating': 'mean',
                'weight': 'sum'
            })
            
            # Combine rating and interaction frequency
            popularity['score'] = popularity['rating'] * np.log1p(popularity['weight'])
            
        else:
            # Simple popularity based on rating and count
            popularity = interactions.groupby('item_id').agg({
                'rating': ['mean', 'count']
            })
            
            popularity.columns = ['avg_rating', 'count']
            popularity['score'] = popularity['avg_rating'] * np.log1p(popularity['count'])
        
        self.item_popularity = popularity['score'].sort_values(ascending=False)
        self.is_trained = True
        logger.info("Popularity-based model trained successfully")
    
    def predict(self, user_id: str, item_ids: List[str], **kwargs) -> Dict[str, float]:
        """Return popularity scores as predictions."""
        if not self.is_trained:
            raise ValueError("Model must be trained before prediction")
        
        predictions = {}
        for item_id in item_ids:
            if item_id in self.item_popularity.index:
                predictions[item_id] = self.item_popularity[item_id]
            else:
                predictions[item_id] = 0.0
        
        return predictions
    
    def recommend(self, user_id: str, n_recommendations: int = 10, **kwargs) -> List[Tuple[str, float]]:
        """Return most popular items."""
        if not self.is_trained:
            raise ValueError("Model must be trained before recommendation")
        
        top_items = self.item_popularity.head(n_recommendations)
        return [(item_id, score) for item_id, score in top_items.items()]